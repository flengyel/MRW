'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const {loadPack,workingCopy,read}=require('./lessonPacks');
const {digest}=require('./navigation');
const {showMarkdownPreview}=require('./documentPresentation');
const PACKS='mrw.leanLessonPacks.v1',STATE='mrw.leanStudy.v1';
const SETUP='https://lean-lang.org/install/';
function registerLeanStudy({vscode,context,register,trackLocation,returnToDocument,readingLocation}){
 let state=context.workspaceState.get(STATE),queue=Promise.resolve(),busy=false;
 let registrations=context.globalState.get(PACKS,[]);if(!Array.isArray(registrations))registrations=[];
 const builtin=path.join(context.extensionPath,'media/lean-study');
 const persist=()=>{const copy=structuredClone(state);queue=queue.catch(()=>{}).then(()=>context.workspaceState.update(STATE,copy));return queue;};
 const saveRegistry=()=>context.globalState.update(PACKS,registrations);
 async function locked(fn){if(busy)throw Error('A Lean lesson is opening. Wait for that action to finish.');busy=true;try{return await fn();}finally{busy=false;}}
 const installHelp=()=>{void vscode.window.showInformationMessage('Lean editing and live goals are supplied by the optional official Lean 4 extension. Lesson files remain readable.','Official Lean setup').then(x=>x==='Official Lean setup'&&vscode.env.openExternal(vscode.Uri.parse(SETUP)));};
 async function catalogue(){
  const packs=[],errors=[];
  for(const entry of [{root:builtin,enabled:true},...registrations])if(entry.enabled){try{const pack=await loadPack(entry.root);if(entry.packId&&entry.packId!==pack.manifest.packId)throw Error('Registered pack changed its identity.');if(packs.some(p=>p.manifest.packId===pack.manifest.packId))throw Error('Duplicate pack ID.');packs.push(pack);}catch(e){errors.push(e.message);}}
  if(errors.length)void vscode.window.showWarningMessage('Some lesson packs are unavailable: '+errors.join('; '));return packs;
 }
 function owned(doc){return state?.root&&doc?.uri.scheme==='file'&&doc.uri.fsPath.startsWith(state.root+path.sep);}
 function captureOrigin(){
  const editor=vscode.window.activeTextEditor,doc=editor?.document;
  const tabUri=vscode.window.tabGroups?.activeTabGroup?.activeTab?.input?.uri?.toString();
  if((!tabUri||tabUri===doc?.uri.toString())&&doc&&['file','untitled'].includes(doc.uri.scheme)&&doc.languageId==='markdown'&&!owned(doc)){
   const revision=digest(doc.getText()),start=doc.offsetAt(editor.selection.start),end=doc.offsetAt(editor.selection.end);
   return {uri:doc.uri.toString(),revision,start,end,initial:{revision,start,end}};
  }
  return state?.origin||readingLocation?.();
 }
 function column(file){const uri=vscode.Uri.file(file).toString();return vscode.window.visibleTextEditors?.find(e=>e.document.uri.toString()===uri)?.viewColumn||vscode.window.tabGroups?.all?.find(g=>g.tabs.some(t=>t.input?.uri?.toString()===uri))?.viewColumn;}
 async function current(){
  if(!state?.root)throw Error('Choose Study Lean 4… to open a lesson first.');
  const pack=await loadPack(state.root);if(pack.manifest.packId!==state.packId)throw Error('The study folder belongs to another pack.');
  const lesson=pack.manifest.lessons.find(l=>l.id===state.lessonId);if(!lesson)throw Error('The saved lesson is unavailable; no working file was replaced.');return {pack,lesson};
 }
 async function openFile(file,{preview=false,beside=false,selection}={}){
  await read(state.root,file);const uri=vscode.Uri.file(path.join(state.root,file));
  const doc=await vscode.workspace.openTextDocument(uri);const ed=await vscode.window.showTextDocument(doc,{preview:false,viewColumn:column(uri.fsPath)||(beside?vscode.ViewColumn.Beside:undefined)});
  if(selection&&selection.revision===digest(doc.getText())){const r=new vscode.Range(doc.positionAt(selection.start),doc.positionAt(selection.end));ed.selection=new vscode.Selection(r.start,r.end);ed.revealRange(r,vscode.TextEditorRevealType.InCenterIfOutsideViewport);}
  if(preview)await showMarkdownPreview(vscode,doc,ed.viewColumn);return ed;
 }
 async function info(){
  const {lesson}=await current();let ed=vscode.window.activeTextEditor;
  if(!owned(ed?.document)||!ed.document.uri.fsPath.endsWith('.lean'))ed=await openFile(lesson.examples);
  const extension=vscode.extensions?.getExtension('leanprover.lean4');if(!extension){installHelp();return false;}
  try{await extension.activate();await vscode.commands.executeCommand('lean4.displayGoal');return true;}
  catch(e){void vscode.window.showInformationMessage('Lean could not open its InfoView: '+e.message+'. Use Lean 4: InfoView: Display Goal after its setup finishes.','Official Lean setup').then(x=>x==='Official Lean setup'&&vscode.env.openExternal(vscode.Uri.parse(SETUP)));return false;}
 }
 async function openLesson(){
  const {lesson}=await current();await openFile(lesson.explanation,{preview:true});
  const file=state.code?.file||lesson.examples;await openFile(file,{selection:state.code});await info();return {root:state.root,packId:state.packId,lessonId:state.lessonId};
 }
 register('mrw.studyLean4',()=>locked(async()=>{
  const origin=captureOrigin(),packs=await catalogue();const items=packs.flatMap(pack=>[...pack.manifest.lessons].sort((a,b)=>a.order-b.order).map(lesson=>({label:lesson.title,description:pack.manifest.title+' · '+pack.manifest.contentVersion,pack,lesson})));
  if(!items.length)throw Error('No valid enabled Lean lesson pack is available.');
  const picked=await vscode.window.showQuickPick(items,{placeHolder:'Study Lean 4: choose a completed lesson'});if(!picked)return;
  if(state?.packId===picked.pack.manifest.packId){const retained=await loadPack(state.root);if(!retained.manifest.lessons.some(l=>l.id===picked.lesson.id))throw Error('That lesson is not in the retained working copy. Resume the existing lesson; its files and notes are unchanged.');state={...state,code:state.lessonId===picked.lesson.id?state.code:undefined,lessonId:picked.lesson.id,origin:origin||state.origin};await persist();return openLesson();}
  let parent=vscode.workspace.getConfiguration('mrw').get('notesFolder','')||state?.parent||'';
  if(!parent){const chosen=await vscode.window.showOpenDialog({title:'Choose a parent folder for your editable Lean study project',canSelectFiles:false,canSelectFolders:true,canSelectMany:false});if(!chosen?.length)return;if(chosen[0].scheme!=='file')throw Error('Choose a local folder on the workspace host.');parent=chosen[0].fsPath;}
  const copy=await workingCopy(picked.pack,parent);
  if(!copy.manifest.lessons.some(l=>l.id===picked.lesson.id))throw Error('That lesson is not in this earlier working copy. Its files and notes were preserved.');
  state={apiVersion:1,parent,root:copy.root,packId:copy.manifest.packId,contentVersion:copy.manifest.contentVersion,lessonId:picked.lesson.id,origin,code:undefined};await persist();return openLesson();
 }));
 register('mrw.resumeLeanStudy',()=>locked(openLesson));
 register('mrw.leanStudyInfo',info);
 register('mrw.returnFromLeanStudy',async()=>{if(!state?.origin)throw Error('No prior MRW document location was captured. Your lesson remains open.');await returnToDocument(state.origin);});
 register('mrw.leanStudyActions',async()=>{
  const {pack,lesson}=await current();const actions=[{label:'Read lesson',kind:'lesson'},{label:'Open working examples',kind:'examples'},{label:'Show native Lean InfoView',kind:'info'},{label:'Open associated note',kind:'notes'},{label:'Return to prior MRW document',kind:'return'},...lesson.bookSections.map(section=>({label:'Book: '+section.title,kind:'book',section})),...['exercises','solutions','mistakes'].flatMap(kind=>lesson[kind].map(item=>({label:(kind==='exercises'?'Try: ':kind==='solutions'?'Solution: ':'Deliberate error: ')+item.title,kind:'file',file:item.file}))),{label:'Reset working examples in editor…',kind:'reset'}];
  const action=await vscode.window.showQuickPick(actions,{placeHolder:lesson.title+' — lesson actions'});if(!action)return;
  if(action.kind==='lesson')return openFile(lesson.explanation,{preview:true});
  if(action.kind==='examples')return openFile(lesson.examples);
  if(action.kind==='info')return info();
  if(action.kind==='notes')return openFile(pack.manifest.notesTemplate);
  if(action.kind==='return')return vscode.commands.executeCommand('mrw.returnFromLeanStudy');
  if(action.kind==='book')return vscode.env.openExternal(vscode.Uri.parse(action.section.url));
  if(action.kind==='file')return openFile(action.file);
  if(action.kind==='reset'){
   const meta=JSON.parse(await read(state.root,'.study-copy.json',64*1024));const raw=await read(state.root,'.originals/'+lesson.examples+'.txt');
   if(digest(raw)!==meta.originals?.[lesson.examples])throw Error('The original example bytes changed; nothing was reset.');
   const ed=await openFile(lesson.examples),doc=ed.document,version=doc.version;
   const answer=await vscode.window.showWarningMessage('Replace this editor’s examples with the original '+meta.contentVersion+' text? Undo remains available; the file is not saved automatically.',{modal:true},'Replace in editor');if(answer!=='Replace in editor')return;
   if(doc.isClosed||doc.version!==version)throw Error('The working example changed during confirmation; reset was cancelled.');
   if(!await ed.edit(edit=>edit.replace(new vscode.Range(doc.positionAt(0),doc.positionAt(doc.getText().length)),raw.toString('utf8')),{undoStopBefore:true,undoStopAfter:true}))throw Error('The editor declined the reset.');
  }
 });
 register('mrw.addLeanLessonPack',async()=>{
  const chosen=await vscode.window.showOpenDialog({title:'Register a local Lean lesson pack (data only)',canSelectFiles:false,canSelectFolders:true,canSelectMany:false});if(!chosen?.length)return;
  if(chosen[0].scheme!=='file')throw Error('Choose a local lesson-pack folder.');const pack=await loadPack(chosen[0].fsPath);
  if(pack.manifest.packId===(await loadPack(builtin)).manifest.packId||registrations.some(e=>e.packId===pack.manifest.packId&&e.root!==pack.root))throw Error('A different lesson pack already owns that pack ID.');
  registrations=[...registrations.filter(e=>e.packId!==pack.manifest.packId),{packId:pack.manifest.packId,root:pack.root,enabled:true}];await saveRegistry();void vscode.window.showInformationMessage('Lesson pack registered. Use Study Lean 4…; no rebuild or reload is needed.');
 });
 register('mrw.manageLeanLessonPacks',async()=>{
  const chosen=await vscode.window.showQuickPick(registrations.map(e=>({label:e.packId,description:e.enabled?'Enabled':'Disabled',...e})),{placeHolder:'Registered local lesson packs; working copies stay usable'});if(!chosen)return;
  const action=await vscode.window.showQuickPick([{label:chosen.enabled?'Disable':'Enable',enable:!chosen.enabled},{label:'Remove registration',remove:true}],{placeHolder:chosen.packId});if(!action)return;
  registrations=action.remove?registrations.filter(e=>e.packId!==chosen.packId):registrations.map(e=>e.packId===chosen.packId?{...e,enabled:action.enable}:e);await saveRegistry();
 });
 context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection?.(event=>{
  if(!owned(event.textEditor.document)||!event.textEditor.document.uri.fsPath.endsWith('.lean'))return;
  const ed=event.textEditor,doc=ed.document;state.code={file:path.relative(state.root,doc.uri.fsPath).split(path.sep).join('/'),revision:digest(doc.getText()),start:doc.offsetAt(ed.selection.start),end:doc.offsetAt(ed.selection.end)};void persist().catch(()=>{});
 })||{dispose(){}});
 context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event=>{
  if(!state)return;const doc=event.document;let touched=false;
  if(state.origin?.uri===doc.uri.toString()){state.origin=trackLocation(state.origin,event.contentChanges,digest(doc.getText()));touched=true;}
  if(owned(doc)&&state.code?.file===path.relative(state.root,doc.uri.fsPath).split(path.sep).join('/')){state.code=trackLocation(state.code,event.contentChanges,digest(doc.getText()));touched=true;}
  if(touched)void persist().catch(()=>{});
 }));
 return {current,openLesson};
}
module.exports={registerLeanStudy};
