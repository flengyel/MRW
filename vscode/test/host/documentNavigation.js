'use strict';
// Disposable native check. Inputs and opening delays are injected; files, edits,
// scope checks, document views and Return use the production implementation.
const vscode=require('vscode'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {parseReadingMarkdown}=require('../../src/readingMarkdown');
async function run(context){
 const config=JSON.parse(await fs.readFile(path.join(context.extensionPath,'host-test.json'),'utf8'));
 if(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath!==config.project)throw Error('Wrong navigation fixture workspace');
 const report={version:vscode.version,remote:vscode.env.remoteName,checks:[],errors:[],complete:false,trace:[],layoutCalls:[],
  scope:'Native production document workflow; injected picker choices and deterministic opening delays; disposable files only.'};
 const save=()=>fs.writeFile(path.join(config.artifacts,'native-result.json'),JSON.stringify(report,null,2));
 const native={show:vscode.window.showTextDocument,open:vscode.window.showOpenDialog,pick:vscode.window.showQuickPick,error:vscode.window.showErrorMessage,execute:vscode.commands.executeCommand,read:vscode.workspace.openTextDocument};
 const handlers=new Map(),shown=new Map();let documents,hook,pickHook,pickFile,selection,redirected,deniedReads=0;const owned=[];
 const notes=path.join(config.project,'notes'),file=name=>path.join(notes,name),aUri=vscode.Uri.file(file('A.md'));
 async function wait(check,label,ms=12000){const until=Date.now()+ms;while(!check()){if(Date.now()>until)throw Error('Timed out: '+label);await new Promise(r=>setTimeout(r,50));}}
 async function check(label,fn){await fn();report.trace.push({after:label,layout:await native.execute('vscode.getEditorLayout'),visible:vscode.window.visibleTextEditors.map(e=>({file:path.basename(e.document.uri.fsPath),column:e.viewColumn,dirty:e.document.isDirty}))});report.checks.push(label);await save();}
 async function edit(doc,at,length,text){const value=new vscode.WorkspaceEdit();value.replace(doc.uri,new vscode.Range(doc.positionAt(at),doc.positionAt(at+length)),text);assert.ok(await vscode.workspace.applyEdit(value));await wait(()=>doc.getText().slice(at,at+text.length)===text,'native edit acknowledgement');}
 const node=(doc,target)=>parseReadingMarkdown(doc.getText()).all.find(n=>n.kind==='document_link'&&n.target===target);
 async function follow(doc,target){const n=node(doc,target);assert.ok(n);return documents.follow(doc,n);}
 async function exactReturn(doc,text){selection=null;await documents.returnToDocument();await wait(()=>selection?.uri===doc.uri.toString()&&selection.text===text,'exact native Return');}
 async function open(name){pickFile=file(name);await handlers.get('mrw.openDocument')();const doc=await native.read(vscode.Uri.file(pickFile));if(!owned.includes(doc))owned.push(doc);return doc;}
 try{
  await save();
  const module=require('../../src/documents'),create=module.createDocuments;
  module.createDocuments=options=>documents=create({...options,register:(name,fn)=>{handlers.set(name,fn);options.register(name,fn);}});
  vscode.window.showErrorMessage=async message=>{report.errors.push(message);await save();};
  vscode.window.showOpenDialog=async()=>[vscode.Uri.file(notes)];
  vscode.window.showQuickPick=async choices=>{choices=await choices;return pickHook?pickHook(choices):choices.find(c=>c.file===pickFile)||choices[0];};
  vscode.window.showTextDocument=async(doc,...args)=>{if(hook)await hook(doc);const editor=await native.show(doc,...args);shown.set(doc.uri.toString(),editor);return editor;};
  vscode.workspace.openTextDocument=async(uri,...args)=>{if(redirected&&uri?.fsPath===file('S.md'))deniedReads++;return native.read(uri,...args);};
  vscode.commands.executeCommand=async(name,...args)=>{
   if(/maximize|minimize|Sidebar|sideBar|setEditorLayout|editorLayout/.test(name))report.layoutCalls.push(name);
   if(name==='vscode.openWith'&&args[1]==='vscode.markdown.preview.editor'){
    const e=shown.get(args[0].toString());if(e)selection={uri:e.document.uri.toString(),text:e.document.getText(e.selection)};
   }
   return native.execute(name,...args);
  };
  require('../../src/extension').activate(context);
  await handlers.get('mrw.chooseNotesFolder')();
  await native.execute('vscode.setEditorLayout',{orientation:0,groups:[{size:0.5},{size:0.5}]});
  const other=await native.read(vscode.Uri.file(path.join(config.project,'unrelated.txt')));owned.push(other);
  const otherEditor=await vscode.window.showTextDocument(other,{viewColumn:1,preview:false});await otherEditor.edit(e=>e.insert(new vscode.Position(0,0),'Unsaved '));
  const a=await native.read(aUri);owned.push(a);await vscode.window.showTextDocument(a,{viewColumn:2,preview:false});
  await wait(()=>vscode.window.visibleTextEditors.some(e=>e.document===other&&e.viewColumn===1)&&vscode.window.visibleTextEditors.some(e=>e.document===a&&e.viewColumn===2),'visible native editors');
  const layout=await native.execute('vscode.getEditorLayout');assert.ok(vscode.window.tabGroups.all.length>=2);report.layout=layout;
  await native.execute('workbench.view.extension.mrw');await open('A.md');const savedA=await fs.readFile(file('A.md'),'utf8');
  await check('ordinary note follow and exact Return preserve a visible unrelated dirty editor',async()=>{await follow(a,'B.md#target');await exactReturn(a,'[Saved](B.md#target)');assert.ok(other.isDirty);assert.ok(vscode.window.visibleTextEditors.some(e=>e.document===other&&e.viewColumn===1));});
  await follow(a,'B.md#target');
  await check('a link changed during native editor opening cannot replace the previous usable Return',async()=>{
   hook=async doc=>{if(doc.uri.fsPath===file('C.md')){const at=a.getText().indexOf('C.md');await edit(a,at,4,'D.md');}};
   await assert.rejects(follow(a,'C.md'),/originating.*changed/i);hook=undefined;await exactReturn(a,'[Saved](B.md#target)');
  });
  await check('outside source edits during native opening still lead back to the exact current link',async()=>{
   hook=async doc=>{if(doc.uri.fsPath===file('D.md'))await edit(a,0,0,'Unsaved preface α😀\n');};
   await follow(a,'D.md');hook=undefined;await exactReturn(a,'[Change](D.md)');assert.ok(a.isDirty);assert.equal(await fs.readFile(file('A.md'),'utf8'),savedA);
  });
  await follow(a,'B.md#target');const b=await native.read(vscode.Uri.file(file('B.md')));owned.push(b);const savedB=await fs.readFile(file('B.md'),'utf8');
  const bEditor=await vscode.window.showTextDocument(b,{viewColumn:2,preview:false}),bAt=b.getText().indexOf('# Target');
  bEditor.selection=new vscode.Selection(b.positionAt(bAt),b.positionAt(bAt+8));
  await wait(()=>vscode.window.activeTextEditor?.document===b&&b.getText(vscode.window.activeTextEditor.selection)==='# Target','backlink invocation selection');
  await check('a backlink whose return selection changes during native opening preserves the previous Return',async()=>{
   hook=async doc=>{if(doc===a)await edit(b,b.getText().indexOf('# Target'),8,'# Changed');};
   await assert.rejects(handlers.get('mrw.showBacklinks')(),/originating.*changed/i);hook=undefined;await exactReturn(a,'[Saved](B.md#target)');
   assert.ok(b.isDirty);assert.equal(await fs.readFile(file('B.md'),'utf8'),savedB);
  });
  const s=await open('S.md');await follow(s,'T.md');
  await check('a backlink redirected outside the selected scope is rejected before any host load request',async()=>{
   pickHook=async choices=>{await fs.rename(file('S.md'),file('S.md.held'));await fs.symlink(config.outside,file('S.md'));redirected=true;return choices[0];};
   await assert.rejects(handlers.get('mrw.showBacklinks')(),/different file|outside.*scope|selected scope/i);pickHook=undefined;assert.equal(deniedReads,0);
   await fs.unlink(file('S.md'));await fs.rename(file('S.md.held'),file('S.md'));redirected=false;await exactReturn(s,'[Back](T.md)');
  });
  await check('dirty note bytes, pane layout and unrelated visible work survive all repaired paths',async()=>{
   assert.deepEqual(await native.execute('vscode.getEditorLayout'),layout);assert.ok(other.isDirty);assert.ok(a.isDirty);assert.ok(b.isDirty);
   assert.ok(vscode.window.visibleTextEditors.some(e=>e.document===other&&e.viewColumn===1));assert.equal(await fs.readFile(file('A.md'),'utf8'),savedA);assert.equal(await fs.readFile(file('B.md'),'utf8'),savedB);assert.deepEqual(report.errors,[]);assert.deepEqual(report.layoutCalls,[]);
  });
  report.stage='observation';await save();await wait(()=>require('node:fs').existsSync(path.join(config.artifacts,'continue')),'window observation',120000);
  report.complete=true;await save();
 }catch(error){report.failure=error.stack;await save();}
 finally{
  vscode.window.showTextDocument=native.show;vscode.window.showOpenDialog=native.open;vscode.window.showQuickPick=native.pick;vscode.window.showErrorMessage=native.error;vscode.commands.executeCommand=native.execute;vscode.workspace.openTextDocument=native.read;
  if(redirected){await fs.unlink(file('S.md')).catch(()=>{});await fs.rename(file('S.md.held'),file('S.md'));}
  for(const doc of owned)if(doc.isDirty)await doc.save(); // Known disposable files only.
  await save();if(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath===config.project)await native.execute('workbench.action.closeWindow');
 }
}
module.exports={activate:context=>{void run(context).catch(console.error);}};
