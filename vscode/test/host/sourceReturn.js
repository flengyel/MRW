 'use strict';
// Scripted native commands/messages, real editors, preview, Mementos and bridge.
// All writes and the one reload belong to the guarded disposable fixture.
const vscode=require('vscode'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {digest}=require('../../src/navigation');
const {assertFixture,clearOwnedState}=require('./fixtureGuard');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function run(context){
 const scope=await assertFixture(vscode,context,context.extensionPath),root=scope.marker.root;
 if(scope.config.continuity)return continuityTrial(context);
 if(scope.config.investigation)return investigationTrial(context);
 const stateFile=path.join(root,'return-state.json'),reportFile=path.join(root,'native-result.json');
 let state;try{state=JSON.parse(await fs.readFile(stateFile,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const report={host:vscode.version,remote:vscode.env.remoteName,profile:scope.marker.profile,phase:state?'resume':'prepare',checks:state?.checks||[],errors:[],complete:false};
 const save=()=>{report.windowFocused=vscode.window.state.focused;const e=vscode.window.activeTextEditor;report.active={file:e?.document.uri.fsPath,column:e?.viewColumn,selection:e?.document.getText(e.selection),tabs:vscode.window.tabGroups.all.map(g=>({column:g.viewColumn,active:g.activeTab?.input?.viewType,uri:g.activeTab?.input?.uri?.fsPath}))};return fs.writeFile(reportFile,JSON.stringify(report,null,2)+'\n');};
 const original={panel:vscode.window.createWebviewPanel,pick:vscode.window.showQuickPick,dialog:vscode.window.showOpenDialog,error:vscode.window.showErrorMessage,execute:vscode.commands.executeCommand};
 const records=[];let previews=[],reloading=false;
 const notes=path.join(root,'external-notes'),note=path.join(notes,'reading.md'),other=path.join(notes,'other.md'),source=path.join(scope.config.project,'source.md');
 const command=(name,...args)=>original.execute('mrw.'+name,...args);
 async function wait(check,label,ms=20000){const end=Date.now()+ms;while(!check()){if(Date.now()>end)throw Error('Timed out: '+label);await pause(50);}}
 async function focus(doc,column=2){const ed=await vscode.window.showTextDocument(doc,{preview:false,viewColumn:column});await wait(()=>vscode.window.activeTextEditor?.document===doc&&vscode.window.tabGroups.activeTabGroup?.activeTab?.input?.uri?.toString()===doc.uri.toString()&&!vscode.window.tabGroups.activeTabGroup?.activeTab?.input?.viewType,'editor focus');await pause(200);return ed;}
 async function edit(doc,start,length,text){const edit=new vscode.WorkspaceEdit();edit.replace(doc.uri,new vscode.Range(doc.positionAt(start),doc.positionAt(start+length)),text);assert.ok(await vscode.workspace.applyEdit(edit));await pause(200);}
 async function ready(doc){await wait(()=>{const input=vscode.window.tabGroups.activeTabGroup?.activeTab?.input;return input?.uri?.toString()===doc.uri.toString()&&input?.viewType==='vscode.markdown.preview.editor';},'native Markdown preview');await pause(200);}
 async function returning(record,doc,link){record.panel.reveal(record.panel.viewColumn);await wait(()=>record.panel.active,'reader control focus');await pause(200);const before=previews.length;await record.receive({type:'reading_return'});await save();await wait(()=>previews.length>before,'rendered Return');const seen=previews.at(-1);assert.equal(seen.uri,doc.uri.toString());assert.equal(seen.text,link);assert.equal(record.messages.at(-1).type,'idle');await ready(doc);}
 async function model(doc){await focus(doc);const value=await command('openReadingOutline');await ready(doc);return value;}
 async function follow(doc,reference){const current=await model(doc),node=current.all.find(n=>n.reference===reference);assert.ok(node);await command('selectReadingOutlineItem',node);await wait(()=>records.some(p=>p.value?.reference?.uri===reference),'retained reader');return records.find(p=>p.value?.reference?.uri===reference);}
 try{
  report.events=[];context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(e=>{report.events.push({kind:'active',file:e?.document.uri.fsPath,column:e?.viewColumn});report.events=report.events.slice(-30);}));
  vscode.window.createWebviewPanel=(...args)=>{const panel=original.panel(...args),record={panel,messages:[]};records.push(record);
   const post=panel.webview.postMessage.bind(panel.webview),listen=panel.webview.onDidReceiveMessage.bind(panel.webview);
   panel.webview.postMessage=value=>{record.messages.push(value);if(value.type==='outline')record.value=value;return post(value);};
   panel.webview.onDidReceiveMessage=(fn,...rest)=>{record.receive=fn;return listen(fn,...rest);};return panel;};
  vscode.window.showQuickPick=async(choices,options)=>{choices=await choices;if(options?.title==='Choose Notes Folder')return choices.find(c=>c.action==='browse');return choices.find(c=>c.id===state?.id)||choices.find(c=>c.id)||choices[0];};
  vscode.window.showOpenDialog=async()=>[vscode.Uri.file(notes)];
  vscode.window.showErrorMessage=async message=>{report.errors.push(message);await save();};
  vscode.commands.executeCommand=async(name,...args)=>{
   if(name==='vscode.openWith'&&args[1]==='vscode.markdown.preview.editor'){
    const editor=vscode.window.activeTextEditor;previews.push({uri:args[0].toString(),text:editor?.document.uri.toString()===args[0].toString()?editor.document.getText(editor.selection):undefined});
   }return original.execute(name,...args);
  };
  report.stage='await-native-window-focus';await save();await wait(()=>vscode.window.state.focused,'native fixture window focus',60000);
  require('../../src/extension').activate(context);
  const {runBridge}=require('../../src/bridge'),{createArtifactStorage}=require('../../src/artifactStorage');
  const {bridge}=createArtifactStorage({vscode,context,rawBridge:request=>runBridge(context.extensionPath,'python3',request)});
  const base={store:path.join(context.storageUri.fsPath,'outlines-'+digest(scope.config.project)),project_root:scope.config.project};
  if(!state){
   await fs.mkdir(notes);const text=await fs.readFile(path.join(context.extensionPath,'media/study-example.md'),'utf8');await fs.writeFile(source,text,{flag:'wx'});
   const saved=await bridge({method:'outline_import_note',...base,path:source,source_revision:digest(text)}),region=saved.outline.regions[0].id;
   const reference=(await bridge({method:'outline_reference',...base,id:saved.outline.id,revision:saved.revision,region})).reference;
   const link='[Retained proof]('+reference+')',body='# Working document\n\n'+link+'\n\n[Related note](other.md#detail)\n';
   await fs.writeFile(note,body,{flag:'wx'});await fs.writeFile(other,'# Related note\n\n## Detail\n\nExisting commentary.\n',{flag:'wx'});
   report.stage='choose-notes-folder';await save();await command('chooseNotesFolder');report.stage='follow-retained-proof';await save();
   const doc=await vscode.workspace.openTextDocument(vscode.Uri.file(note));
   const unrelated=await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(scope.config.project,'reading.md'))),originalText=unrelated.getText();
   const unrelatedEditor=await focus(unrelated,1);assert.ok(await unrelatedEditor.edit(e=>e.insert(new vscode.Position(0,0),'Unsent fixture draft\n')));assert.ok(unrelated.isDirty);
   const record=await follow(doc,reference);assert.equal(record.value.returnDestination.kind,'citation');
   assert.equal(record.value.model.outline.regions.find(r=>r.id===region).argument_text,saved.outline.regions[0].argument_text);
   const annotation='Reader commentary retained through Return and restart.';
   await record.receive({type:'edit',draft:'note:'+region+':new',change:{kind:'annotation',region,id:null,purpose:'note',text:annotation,origin:'human_work',author:''}});
   await returning(record,doc,link);assert.ok(unrelated.isDirty);assert.equal(await fs.readFile(note,'utf8'),body);
   report.checks.push('selected external Markdown note follows its exact retained proof; reader note saves before Return; unrelated native draft survives');await save();
   await focus(doc);await edit(doc,0,0,'Unsent preface α😀\n');await returning(record,doc,link);
   assert.ok(doc.isDirty);assert.equal(await fs.readFile(note,'utf8'),body);assert.ok(unrelated.isDirty);
   report.checks.push('reader Return tracks an outside unsaved edit and reopens the actual Markdown preview without saving either draft');
   await focus(doc);await edit(doc,0,'Unsent preface α😀\n'.length,'');assert.equal(doc.getText(),body);
   const ordinary=(await model(doc)).all.find(n=>n.kind==='document_link');await command('selectReadingOutlineItem',ordinary);await command('returnToReadingOutline');
   assert.equal(previews.at(-1).text,'[Related note](other.md#detail)');await returning(record,doc,link);
   assert.equal(context.workspaceState.get('mrw.lightStudy.recent.v1'),undefined);assert.ok(unrelated.isDirty);
   report.checks.push('ordinary note Return and retained-source Return keep their separate exact occurrences; no study is created');
   // Remove only the known fixture edit before reloading: the guard rejects
   // dirty initial buffers, and never adopts a working draft as fixture data.
   await focus(unrelated,1);assert.equal(unrelated.getText(),'Unsent fixture draft\n'+originalText);await edit(unrelated,0,'Unsent fixture draft\n'.length,'');assert.equal(unrelated.getText(),originalText);
   if(unrelated.isDirty)assert.ok(await unrelated.save());if(doc.isDirty)assert.ok(await doc.save());
   assert.equal(await fs.readFile(note,'utf8'),body);assert.ok(!vscode.workspace.textDocuments.some(d=>d.isDirty));
   await follow(doc,reference);
   state={id:saved.outline.id,region,reference,link,body,sourceText:text,annotation,checks:report.checks};await fs.writeFile(stateFile,JSON.stringify(state,null,2)+'\n',{flag:'wx'});
   report.reloading=true;await save();reloading=true;await original.execute('workbench.action.reloadWindow');return;
  }
  assert.ok(context.workspaceState.get('mrw.readingOutline.v1').origin,'native Memento restored after real test-window reload');
  await command('openOutline');await wait(()=>records.some(p=>p.value?.model?.outline.id===state.id),'reopened source');
  const independent=records.find(p=>p.value?.model?.outline.id===state.id);
  assert.equal(independent.value.returnDestination.kind,'selected','an independently reopened source must not invent a fresh citation follow');
  const doc=await vscode.workspace.openTextDocument(vscode.Uri.file(note));await returning(independent,doc,state.link);
  report.checks.push('real native reload restores selected notes scope, retained reader note and remembered document location; independent source opening is labelled accurately');
  const record=await follow(doc,state.reference);assert.equal(record.value.returnDestination.kind,'citation');await returning(record,doc,state.link);
  const loaded=await bridge({method:'outline_load',...base,id:state.id});
  assert.equal(loaded.outline.regions.find(r=>r.id===state.region).annotations[0].text,state.annotation);
  assert.equal(await fs.readFile(note,'utf8'),state.body);assert.equal(await fs.readFile(source,'utf8'),state.sourceText);
  assert.equal(context.workspaceState.get('mrw.lightStudy.recent.v1'),undefined);assert.deepEqual(report.errors,[]);
  report.checks.push('after restart, Contents follows the same exact retained reference and Return; source bytes, ordinary notes and reader annotation stay intact');
  await clearOwnedState(context);report.complete=true;
 }catch(error){if(!reloading)report.failure=error.stack;}
 finally{
  vscode.window.createWebviewPanel=original.panel;vscode.window.showQuickPick=original.pick;vscode.window.showOpenDialog=original.dialog;vscode.window.showErrorMessage=original.error;vscode.commands.executeCommand=original.execute;
  await save();if(!reloading&&!vscode.workspace.textDocuments.some(d=>d.isDirty))await original.execute('workbench.action.closeWindow');
 }
}
async function continuityTrial(context){
 const guard=require("./fixtureGuard"),{createDocuments}=require("../../src/documents"),{trackLocation}=require("../../src/readingOutline"),{parseReadingMarkdown}=require("../../src/readingMarkdown");
 async function wait(fn,label){const end=Date.now()+20000;while(!fn()){if(Date.now()>end)throw Error("Timed out: "+label);await pause(30);}}
 const {marker,config}=await guard.assertFixture(vscode,context,context.extensionPath),root=marker.root,project=config.project;
 const statePath=path.join(root,'continuity-state.json'),reportPath=path.join(root,'continuity-result.json');
 const state=await fs.readFile(statePath,'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 const report=state?.report||{host:vscode.version,remote:vscode.env.remoteName,previews:[],errors:[],checks:[]};
 const original={execute:vscode.commands.executeCommand,pick:vscode.window.showQuickPick,error:vscode.window.showErrorMessage};let reloading=false;
 async function save(){const temp=reportPath+'.next';await fs.writeFile(temp,JSON.stringify(report,null,2));await fs.rename(temp,reportPath);}
 const commands=new Map(),controller=createDocuments({vscode,context,trackLocation,register:(name,fn)=>{commands.set(name,fn);context.subscriptions.push(vscode.commands.registerCommand(name,fn));}});
 const note=vscode.Uri.file(path.join(project,'trace.md')),related=vscode.Uri.file(path.join(project,'matrix.md')),needle='The [multiplication-matrix proof](matrix.md#the-repeated-blocks) explains';
 try{
  vscode.window.showErrorMessage=async message=>{report.errors.push(message);await save();};
  vscode.window.showQuickPick=async items=>(await items).find(i=>i.entry?.uri===note.toString());
  vscode.commands.executeCommand=async(name,...args)=>{
   if(name==='vscode.openWith'&&args[1]==='vscode.markdown.preview.editor'){
    const editor=vscode.window.visibleTextEditors.find(e=>e.document.uri.toString()===args[0].toString());
    report.previews.push({uri:args[0].toString(),selection:editor?.document.getText(editor.selection),start:editor&&editor.document.offsetAt(editor.selection.start)});
   }return original.execute(name,...args);
  };
  if(!state){
   const body=await fs.readFile(note.fsPath,'utf8'),matrixBody=await fs.readFile(related.fsPath,'utf8');
   report.originalHashes={note:digest(body),matrix:digest(matrixBody)};
   await controller.openLinkedDocument(note);
   const doc=await vscode.workspace.openTextDocument(note),editor=await vscode.window.showTextDocument(doc,{preview:false});
   const link=parseReadingMarkdown(body).all.find(n=>n.kind==='document_link'&&n.target==='matrix.md#the-repeated-blocks');
   assert.ok(link);await controller.follow(doc,link);await controller.returnToDocument();
   assert.equal(report.previews.at(-1).selection,body.slice(link.start,link.end));
   report.checks.push('Actual relative-heading follow and Return preserve the original link occurrence');
   const at=doc.getText().indexOf(needle);const focused=await vscode.window.showTextDocument(doc,{preview:false});focused.selection=new vscode.Selection(doc.positionAt(at),doc.positionAt(at+needle.length));
   await wait(()=>context.workspaceState.get('mrw.documents.v1')?.location?.start===at,'saved first-document location');
   await controller.openLinkedDocument(related);
   assert.ok(!vscode.workspace.textDocuments.some(d=>d.isDirty));
   const tabs=vscode.window.tabGroups.all.flatMap(g=>g.tabs).filter(t=>t.input?.uri?.fsPath?.startsWith(project+path.sep));
   await vscode.window.tabGroups.close(tabs,true);
   report.checks.push('Two linked mathematical documents opened; first location selected and both clean tabs closed');
   await fs.writeFile(statePath,JSON.stringify({at,needle,report}));await save();
   reloading=true;void original.execute('workbench.action.reloadWindow');return;
  }
  await commands.get('mrw.recentNotes')();
  const seen=report.previews.filter(p=>p.uri===note.toString()).at(-1);
  assert.ok(seen,'native preview opened');
  report.expectedSelection=state.needle;report.observedSelection=seen.selection;report.expectedStart=state.at;report.observedStart=seen.start;
  report.positionRecovered=seen.selection===state.needle;
  report.notesUnchanged=digest(await fs.readFile(note.fsPath))===report.originalHashes.note&&digest(await fs.readFile(related.fsPath))===report.originalHashes.matrix;
  assert.ok(report.positionRecovered);assert.ok(report.notesUnchanged);assert.deepEqual(report.errors,[]);
  report.complete=true;await save();await guard.clearOwnedState(context);
 }catch(error){report.failure=error.stack;await save();}
 finally{vscode.commands.executeCommand=original.execute;vscode.window.showQuickPick=original.pick;vscode.window.showErrorMessage=original.error;if(!reloading){await save();if(!vscode.workspace.textDocuments.some(d=>d.isDirty))void original.execute('workbench.action.closeWindow');}}
}

// Longer ordinary-note workflow. Dialog choices are scripted; editors, saved
// notebooks, bridge retention/diff/export and the host restart are native.
async function investigationTrial(context){
 const guard=require('./fixtureGuard'),{parseReadingMarkdown}=require('../../src/readingMarkdown'),{parseLink}=require('../../src/notebookResults');
 const {marker,config}=await guard.assertFixture(vscode,context,context.extensionPath),root=marker.root,project=config.project;
 const statePath=path.join(root,'investigation-state.json'),reportPath=path.join(root,'investigation-result.json');
 const state=await fs.readFile(statePath,'utf8').then(JSON.parse).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
 const report=state?.report||{host:vscode.version,remote:vscode.env.remoteName,checks:[],errors:[],requests:[],previews:[],complete:false};
 const original={execute:vscode.commands.executeCommand,pick:vscode.window.showQuickPick,open:vscode.window.showOpenDialog,save:vscode.window.showSaveDialog,error:vscode.window.showErrorMessage,info:vscode.window.showInformationMessage};
 let reloading=false,action='link',chooseId,comparisonId,rawBridge,bridgeModule,api;
 const note=vscode.Uri.file(path.join(project,'README.md')),proof=vscode.Uri.file(path.join(project,'integral-basis.md'));
 const remaining='Remaining step: prove which integer lattice gives the field discriminant.';
 const save=async()=>{const tmp=reportPath+'.next';await fs.writeFile(tmp,JSON.stringify(report,null,2));await fs.rename(tmp,reportPath);};
 const call=(name,...args)=>original.execute('mrw.'+name,...args);
 async function wait(fn,label,ms=20000){const end=Date.now()+ms;while(!fn()){if(Date.now()>end)throw Error('Timed out: '+label);await pause(50);}}
 async function focus(doc){
  await wait(()=>vscode.window.state.focused,'owned fixture focus',60000);
  await vscode.window.showTextDocument(doc,{preview:false});
  await wait(()=>vscode.window.activeTextEditor?.document===doc&&vscode.window.tabGroups.activeTabGroup?.activeTab?.input?.uri?.toString()===doc.uri.toString()&&!vscode.window.tabGroups.activeTabGroup?.activeTab?.input?.viewType,'native source editor acknowledgement');
  await pause(200);
 }
 async function follow(doc,target,occurrence=0){
  await focus(doc);const model=await call('openReadingOutline');
  assert.ok(model,'Contents must acknowledge its selected document');
  const nodes=model.all.filter(n=>n.kind==='document_link'&&n.target===target);assert.ok(nodes[occurrence],target);
  await call('selectReadingOutlineItem',nodes[occurrence]);return nodes[occurrence];
 }
 async function returning(doc,node){
  const count=report.previews.length;await call('returnToReadingOutline');
  await wait(()=>report.previews.length>count,'Return preview');
  const seen=report.previews.at(-1);assert.equal(seen.uri,doc.uri.toString());assert.equal(seen.start,node.start);assert.equal(seen.end,node.end);
 }
 async function append(doc,text){
  const change=new vscode.WorkspaceEdit();change.insert(doc.uri,doc.positionAt(doc.getText().length),text);
  assert.ok(await vscode.workspace.applyEdit(change));assert.ok(await doc.save());
 }
 try{
  bridgeModule=require('../../src/bridge');rawBridge=bridgeModule.runBridge;
  bridgeModule.runBridge=(...args)=>{report.requests.push({method:args[2].method,id:args[2].id});return rawBridge(...args);};
  vscode.window.showQuickPick=async(items,options)=>{
   items=await items;
   if(options?.canPickMany)return items.filter(i=>i.result);
   if(options?.title==='Retain exact saved bytes')return items.find(i=>i.action==='companions');
   if(items.some(i=>i.result))return items.find(i=>i.result.id===(comparisonId||chooseId))||items.find(i=>i.result);
   if(items.some(i=>i.entry))return items.find(i=>i.entry?.uri===note.toString());
   if(items.some(i=>i.action===action))return items.find(i=>i.action===action);
   return items[0];
  };
  vscode.window.showOpenDialog=async()=>[note,proof];
  vscode.window.showSaveDialog=async()=>vscode.Uri.file(path.join(root,'investigation-provenance.zip'));
  vscode.window.showErrorMessage=async message=>{report.errors.push(message);await save();};
  vscode.window.showInformationMessage=async message=>{report.notice=message;};
  vscode.commands.executeCommand=async(name,...args)=>{
   if(name==='vscode.openWith'&&args[1]==='vscode.markdown.preview.editor'){
    const ed=vscode.window.visibleTextEditors.find(e=>e.document.uri.toString()===args[0].toString());
    report.previews.push({uri:args[0].toString(),start:ed&&ed.document.offsetAt(ed.selection.start),end:ed&&ed.document.offsetAt(ed.selection.end)});
   }
   if(/executeNotebook|notebook\.execute|runAll|selectKernel/i.test(name))throw Error('Unexpected computation command: '+name);
   return original.execute(name,...args);
  };
  api=require('../../src/extension').activate(context);
  report.stage=state?'resume':'prepare';await save();
  const doc=await vscode.workspace.openTextDocument(note);
  if(!state){
   report.links={};report.inputHashes={};
   for(const name of ['trace-final','resultant-run','failed-final']){
    const uri=vscode.Uri.file(path.join(project,name+'.ipynb'));report.inputHashes[name]=digest(await fs.readFile(uri.fsPath));
    const before=await vscode.env.clipboard.readText();
    try{
     await call('retainNotebookResult',uri);
     const link=await vscode.env.clipboard.readText();const parsed=parseLink(link,vscode.env.uriScheme||'vscode');
     report.links[name]={uri:link,id:parsed.id};
    }finally{await vscode.env.clipboard.writeText(before);}
   }
   const trace=report.links['trace-final'],failed=report.links['failed-final'];
   await append(doc,'\n## Saved calculations\n\n[Trace result]('+trace.uri+')\n\n[Failed construction]('+failed.uri+')\n\nCompare again: [Trace result]('+trace.uri+')\n\n'+remaining+'\n');
   let selected=await follow(doc,trace.uri,1);await returning(doc,selected);
   selected=await follow(doc,failed.uri);await returning(doc,selected);
   const store=path.join(context.storageUri.fsPath,'calculations-v1');
   const loaded=await rawBridge(context.extensionPath,'python3',{method:'notebook_read',store,id:failed.id});
   assert.match(loaded.body,/irreducible/);assert.match(loaded.body,/producer-reported failed/i);
   report.checks.push('ordinary note follows repeated saved-result links and actual failed Sage output; Return selects each exact occurrence');
   chooseId=trace.id;comparisonId=report.links['resultant-run'].id;action='compare';await call('openNotebookResult');comparisonId=undefined;
   await call('exportNotebookProvenance');
   assert.ok((await fs.stat(path.join(root,'investigation-provenance.zip'))).size>0);
   report.checks.push('two real calculation snapshots compare through the native diff and three accounts export without execution');
   await focus(doc);
   const at=doc.getText().indexOf(remaining),editor=vscode.window.activeTextEditor;
   editor.selection=new vscode.Selection(doc.positionAt(at),doc.positionAt(at+remaining.length));
   await wait(()=>context.workspaceState.get('mrw.documents.v1')?.location?.start===at,'continuation checkpoint');
   report.expectedStart=at;report.expectedEnd=at+remaining.length;
   assert.ok(!vscode.workspace.textDocuments.some(d=>d.isDirty));
   await original.execute('workbench.action.closeAllEditors');
   await fs.writeFile(statePath,JSON.stringify({report}));await save();reloading=true;
   await original.execute('workbench.action.reloadWindow');return;
  }
  const before=report.requests.length;await call('reopenDocument');
  const seen=report.previews.at(-1);assert.equal(seen.uri,note.toString());assert.equal(seen.start,report.expectedStart);assert.equal(seen.end,report.expectedEnd);
  assert.equal(doc.getText().slice(seen.start,seen.end),remaining);
  report.checks.push('after closing the work and reloading, Reopen Document recovers the exact unfinished argument without a new form');
  const node=await follow(doc,'integral-basis.md#the-ring-of-integers');await returning(doc,node);
  await append(doc,'\nThe integral-basis argument proves that the ring of integers has basis (1, beta); its field discriminant is 5. The determinant 20 belongs to the index-2 sublattice.\n');
  const again=await follow(doc,report.links['failed-final'].uri);await returning(doc,again);
  assert.ok(!report.requests.slice(before).some(r=>r.method==='notebook_retain'));
  for(const [name,hash]of Object.entries(report.inputHashes))assert.equal(digest(await fs.readFile(path.join(project,name+'.ipynb'))),hash);
  assert.deepEqual(report.errors,[]);assert.ok(!vscode.workspace.textDocuments.some(d=>d.isDirty));
  report.checks.push('the resumed note follows the supporting proof and retained failure; source notebooks remain exact, with no rerun or new capture');
  await guard.clearOwnedState(context);report.complete=true;await save();
 }catch(error){report.failure=error.stack;await save();}
 finally{
  if(bridgeModule&&rawBridge)bridgeModule.runBridge=rawBridge;
  vscode.commands.executeCommand=original.execute;vscode.window.showQuickPick=original.pick;vscode.window.showOpenDialog=original.open;vscode.window.showSaveDialog=original.save;vscode.window.showErrorMessage=original.error;vscode.window.showInformationMessage=original.info;
  if(!reloading){await save();if(!vscode.workspace.textDocuments.some(d=>d.isDirty))await original.execute('workbench.action.closeWindow');}
 }
}

module.exports={activate:context=>{void run(context).catch(console.error);}};
module.exports=require('./fixtureGuard').protect(module.exports,{vscode,filename:__filename});
