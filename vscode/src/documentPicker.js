'use strict';
const path=require('node:path');
const {chooserFiles,LIMITS}=require('./chooserFiles');
const {noteIdentity}=require('./noteIdentity');
const plain=value=>value.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,512);
function documentItem(root,file,text=''){
 const identity=noteIdentity({uri:{fsPath:file},getText:()=>text.slice(0,LIMITS.headerBytes)},{headingFallback:true});
 return {file,label:plain(identity.label),description:path.dirname(path.relative(root,file))==='.'?'':plain(path.dirname(path.relative(root,file))),detail:plain(path.relative(root,file))};
}
function createDocumentPicker(vscode,{initialFolder,dirtyText=()=>undefined,list=chooserFiles,listSaved,remoteName,onTiming=()=>{}}={}){
 const picker=vscode.window.createQuickPick(),subscriptions=[],started=performance.now();let finished=false,epoch=0,source,folder,canonicalFolder,rows=[],saved=[],status='Choose an original file or a saved copy.',savedStatus='Loading saved copies…';
 let savedSource,savedEpoch=0,savedDone=false;
 let resolveChoice;const result=new Promise(resolve=>{resolveChoice=resolve;});
 const browse={key:'browse',action:'browse',label:'Browse for another document…',description:'Original file',detail:'Open current contents in place, including PDFs. No import.',alwaysShow:true};
 const savedAction={key:'saved',action:'saved',label:'Saved copy…',description:'Retained revision and MRW annotations',alwaysShow:true};
 const sep=label=>({label,kind:vscode.QuickPickItemKind?.Separator??-1});
 function publish(){
  if(finished)return;const active=picker.activeItems?.map(i=>i.key)||[],selected=picker.selectedItems?.map(i=>i.key)||[];
  picker.title='Open Document'+(folder?' — '+folder:'');picker.placeholder=status;
  const controls=[browse,savedAction];
  if(folder){if(path.dirname(folder)!==folder)controls.push({key:'parent',action:'folder',file:path.dirname(folder),label:'$(arrow-up) Parent folder',alwaysShow:true});controls.push({key:'search',action:'search',label:'Search subfolders…',description:folder,detail:'Explicit recursive filename search in this folder.',alwaysShow:true});}
  picker.items=[...controls,sep('Original files'+(folder?' · '+folder:'')),...rows,sep(savedStatus),...saved];
  picker.activeItems=picker.items.filter(i=>active.includes(i.key));picker.selectedItems=picker.items.filter(i=>selected.includes(i.key));
 }
 function finish(value){if(finished)return;finished=true;savedSource?.cancel();savedSource?.dispose();source?.cancel();source?.dispose();for(const s of subscriptions)s.dispose();picker.hide();picker.dispose();resolveChoice(value);}
 async function navigate(target,recursive=false){
  if(folder&&!savedDone&&listSaved)loadSaved();
  const own=++epoch;source?.cancel();source?.dispose();source=new vscode.CancellationTokenSource();const token=source.token;
  folder=target;rows=[];status=(recursive?'Searching subfolders of ':'Listing current folder: ')+target;picker.busy=true;publish();
  try{
   const listing=await list(target,{recursive,token,remoteName});if(finished||own!==epoch||token.isCancellationRequested)return;
   canonicalFolder=listing.root;folder=listing.root;
   rows=listing.entries.sort((a,b)=>(a.type===b.type?0:a.type==='folder'?-1:1)||a.file.localeCompare(b.file)).map(e=>({...documentItem(folder,e.file),key:'file:'+e.file,action:e.type==='folder'?'folder':'file',label:e.type==='folder'?'$(folder) '+path.basename(e.file):path.basename(e.file),folder:canonicalFolder}));
   status=(recursive?'Search subfolders: ':'Current folder only: ')+folder+(listing.complete?'':' · Incomplete listing; Browse remains available.');publish();
   onTiming({phase:'filenames',elapsed_ms:performance.now()-started,folder,recursive,count:rows.length,complete:listing.complete});
   const files=rows.filter(i=>i.action==='file'&&/\.(md|markdown)$/i.test(i.file)).map(i=>i.file);picker.busy=false;
   if(!files.length)return;picker.busy=true;
   let firstTitles=true;const titled=new Set();
   const onHeaders=headers=>{
    if(finished||own!==epoch||token.isCancellationRequested)return;
    for(const item of rows)if(headers.has(item.file)){item.label=documentItem(folder,item.file,dirtyText(item.file)??headers.get(item.file)).label;titled.add(item.file);}
    publish();if(firstTitles){firstTitles=false;onTiming({phase:'first-titles',elapsed_ms:performance.now()-started,folder,count:headers.size});}
   };
   const titles=await list(folder,{files,token,remoteName,onHeaders});if(finished||own!==epoch||token.isCancellationRequested)return;
   for(const item of rows)if(item.action==='file'&&!titled.has(item.file)){
    const text=dirtyText(item.file)??titles.headers?.get(item.file);if(text!==undefined)item.label=documentItem(folder,item.file,text).label;
   }
   if(!titles.complete)status+=' · Some titles unavailable or bounded.';publish();
   onTiming({phase:'titles',elapsed_ms:performance.now()-started,folder,count:titles.headers?.size||0,complete:titles.complete});
  }catch(error){if(!finished&&own===epoch){status=(rows.length?'Filenames remain available; titles unavailable: ':'Listing unavailable: ')+error.message;publish();}}
  finally{if(!finished&&own===epoch)picker.busy=false;}
 }
 picker.matchOnDescription=true;picker.matchOnDetail=true;picker.keepScrollPosition=true;
 subscriptions.push(picker.onDidHide(()=>finish()),picker.onDidAccept(()=>{
  const item=picker.selectedItems[0]||picker.activeItems[0];if(!item||item.kind!==undefined)return;
  if(item.action==='folder'){picker.value='';void navigate(item.file);}
  else if(item.action==='search'){picker.value='';void navigate(folder,true);}
  else finish({...item,currentFolder:folder});
 }));
 if(vscode.workspace.onDidChangeTextDocument)subscriptions.push(vscode.workspace.onDidChangeTextDocument(e=>{
  const item=rows.find(i=>i.file===e.document.uri.fsPath);if(item&&e.document.isDirty){item.label=documentItem(folder,item.file,e.document.getText()).label;publish();}
 }));
 publish();picker.show();onTiming({phase:'browse',elapsed_ms:performance.now()-started});
 // Both startup tasks run after usable controls have been shown. Neither owns
 // the other task or can replace its rows, query, selection or cancellation.
 void Promise.resolve().then(initialFolder).then(value=>{if(value&&!finished&&!folder)void navigate(value);},error=>{if(!finished){status=error.message;publish();}});
 function loadSaved(){
  const own=++savedEpoch;savedSource?.cancel();savedSource?.dispose();savedSource=new vscode.CancellationTokenSource();const token=savedSource.token;
  void Promise.resolve().then(()=>listSaved(token)).then(items=>{
   if(finished||own!==savedEpoch||token.isCancellationRequested)return;savedDone=true;
   saved=items.map(i=>({...i,key:'saved:'+i.id,action:'saved-file'}));savedStatus=items.length?'Saved copies':'No saved copies in this project';publish();
  },error=>{if(!finished&&own===savedEpoch&&!token.isCancellationRequested){savedStatus='Saved copies unavailable: '+error.message;publish();}});
 }
 if(listSaved)loadSaved();
 else{savedStatus='Saved copies — use Saved copy… to choose';publish();}
 return {result,cancel:()=>finish(),picker};
}
module.exports={createDocumentPicker,documentItem};
