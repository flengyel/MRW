'use strict';
// Entry point only in a private extension-development copy with disposable storage.
const vscode=require('vscode'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
async function run(context){
 const config=JSON.parse(await fs.readFile(path.join(context.extensionPath,'host-test.json'),'utf8'));
 const fixture=await fs.realpath(config.project);
 assert.equal(path.basename(fixture),'mrw-source-trash-fixture');
 assert.equal(vscode.workspace.workspaceFolders?.length,1);
 assert.equal(vscode.workspace.workspaceFolders[0].uri.fsPath,fixture);
 assert.ok(fixture.startsWith('/home/flengyel/.cache/mrw-source-trash-20261115/native/'));
 assert.equal(await fs.realpath(config.artifacts),path.dirname(fixture));
 const report={vscode:vscode.version,remote:vscode.env.remoteName,checks:[],errors:[],complete:false};
 const save=()=>fs.writeFile(path.join(config.artifacts,'native-result.json'),JSON.stringify(report,null,2));
 const originalPick=vscode.window.showQuickPick,originalError=vscode.window.showErrorMessage;
 let picker,timer,cancel=false,restoreOnly=true;
 try{
  await require('../../src/extension').activate(context);
  vscode.window.showErrorMessage=async m=>{report.errors.push(m);await save();};
  const registered=new Set(await vscode.commands.getCommands(true));
  for(const id of ['mrw.deleteSavedSource','mrw.restoreSavedSource','mrw.openOutline'])assert.ok(registered.has(id));
  report.checks.push('production source lifecycle commands register in native WSL host');await save();
  const {runBridge}=require('../../src/bridge'),{createArtifactStorage}=require('../../src/artifactStorage'),{digest}=require('../../src/navigation');
  const {bridge}=createArtifactStorage({vscode,context,rawBridge:req=>runBridge(context.extensionPath,'python3',req)});
  const req={store:path.join(context.storageUri.fsPath,'outlines-'+digest(fixture)),project_root:fixture};
  const file=path.join(fixture,'source.txt'),text='Exact disposable source.\n';await fs.writeFile(file,text);
  const revision=require('node:crypto').createHash('sha256').update(text).digest('hex');
  let saved=await bridge({method:'outline_import_note',...req,path:file,source_revision:revision});
  const id=saved.outline.id;
  saved=await bridge({method:'outline_mutate',...req,id,revision:saved.revision,change:{kind:'annotation',region:null,id:null,purpose:'note',text:'Disposable mathematical reader note.',origin:'human_work',author:'Host fixture'}});
  let status=await bridge({method:'outline_trash',...req,id,revision:saved.revision,status_revision:null});
  assert.equal((await bridge({method:'outline_list',...req})).outlines.length,0);
  vscode.window.showQuickPick=async(items,options)=>{
   picker=vscode.window.createQuickPick();Object.assign(picker,options);picker.items=await items;
   const result=new Promise(resolve=>{picker.onDidAccept(()=>{resolve(picker.selectedItems[0]);picker.hide();});picker.onDidHide(()=>resolve(undefined));});
   picker.show();picker.value=options.title?.startsWith('Saved sources')?(restoreOnly?'Restore':'source'):'source';
   timer=setTimeout(()=>{void vscode.commands.executeCommand(cancel?'workbench.action.closeQuickOpen':'workbench.action.acceptSelectedQuickOpenItem');},1000);
   try{return await result;}finally{clearTimeout(timer);picker.dispose();picker=undefined;}
  };
  await vscode.commands.executeCommand('mrw.openOutline');
  let loaded=await bridge({method:'outline_load',...req,id});
  assert.equal(loaded.lifecycle.state,'active');assert.deepEqual(loaded.outline.annotations,saved.outline.annotations);
  report.checks.push('native Open Saved Source exposes Restore with no active copies; native Restore picker restores exact note');await save();
  restoreOnly=false;
  const opened=await vscode.commands.executeCommand('mrw.openOutline');assert.equal(opened.outline.id,id);
  report.checks.push('restored source opens in production reader with its annotation');await save();
  cancel=true;await vscode.commands.executeCommand('mrw.deleteSavedSource');
  loaded=await bridge({method:'outline_load',...req,id});assert.equal(loaded.lifecycle.state,'active');
  assert.equal(await fs.readFile(file,'utf8'),text);
  report.checks.push('cancelling native Delete picker preserves source and original file');
  report.complete=report.errors.length===0;
 }catch(e){report.failure=e.stack;}
 finally{clearTimeout(timer);picker?.dispose();vscode.window.showQuickPick=originalPick;vscode.window.showErrorMessage=originalError;await save();
  if(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath===fixture&&!vscode.workspace.textDocuments.some(d=>d.isDirty))await vscode.commands.executeCommand('workbench.action.closeWindow');}
}
module.exports={activate:context=>{void run(context).catch(console.error);}};
