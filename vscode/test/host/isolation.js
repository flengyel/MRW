 'use strict';
const vscode=require('vscode'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
async function run(context){
 const {assertFixture}=require('./fixtureGuard'),scope=await assertFixture(vscode,context,context.extensionPath);
 const report={host:vscode.version,remote:vscode.env.remoteName,profile:scope.marker.profile,checks:[],complete:false};
 const save=()=>fs.writeFile(path.join(scope.marker.root,'native-result.json'),JSON.stringify(report,null,2));
 try{
  report.checks.push('native Development context, owned stores and namespaced native Mementos verified before production activation');
  const api=require('../../src/extension').activate(context);assert.equal(api.mrwInspection.version,1);
  const commands=new Set(await vscode.commands.getCommands(true));assert.ok(commands.has('mrw.openOutline'));assert.ok(commands.has('mrw.restoreSavedSource'));
  report.checks.push('unchanged production core activates after successful isolation preflight');
  const {runBridge}=require('../../src/bridge'),{createArtifactStorage}=require('../../src/artifactStorage'),{digest}=require('../../src/navigation');
  const {bridge}=createArtifactStorage({vscode,context,rawBridge:req=>runBridge(context.extensionPath,'python3',req)});
  const file=path.join(scope.config.project,'owned.md'),text='# Disposable mathematical passage\n';
  try{assert.equal(await fs.readFile(file,'utf8'),text,'fixture changed; no replacement');}catch(e){if(e.code!=='ENOENT')throw e;await fs.writeFile(file,text,{flag:'wx'});}
  const req={store:path.join(context.storageUri.fsPath,'outlines-'+digest(scope.config.project)),project_root:scope.config.project};
  let source=await bridge({method:'outline_import_note',...req,path:file,source_revision:digest(text)});
  const status=await bridge({method:'outline_trash',...req,id:source.outline.id,revision:source.revision,status_revision:source.lifecycle.revision});
  assert.equal((await bridge({method:'outline_list',...req})).outlines.length,0);
  await bridge({method:'outline_restore',...req,id:source.outline.id,revision:source.revision,status_revision:status.lifecycle.revision});
  assert.equal((await bridge({method:'outline_load',...req,id:source.outline.id})).lifecycle.state,'active');
  assert.equal(await fs.readFile(file,'utf8'),text);report.checks.push('capture, Trash and Restore use only the private native workspace store');
  const info=require('./fixtureGuard').scopeInfo(context);
  assert.ok(info.writes.every(key=>key.startsWith(info.prefix)));
  report.checks.push('every observed Memento update uses only this fixture UUID namespace');
  const raw={extensionPath:context.extensionPath,extensionMode:context.extensionMode,globalStorageUri:context.globalStorageUri};
  await assert.rejects(assertFixture(vscode,raw,context.extensionPath),/unisolated native context/);
  report.checks.push('an unisolated context is rejected before production test work');
  await require('./fixtureGuard').clearOwnedState(context);
  assert.deepEqual(context.globalState.keys(),[]);assert.deepEqual(context.workspaceState.keys(),[]);
  report.checks.push('completed fixture removes only its own native Memento namespace');report.complete=true;
 }catch(e){report.failure=e.stack;}
 finally{await save();if(!vscode.workspace.textDocuments.some(d=>d.isDirty))await vscode.commands.executeCommand('workbench.action.closeWindow');}
}
module.exports={activate:context=>{void run(context).catch(console.error);}};
module.exports=require('./fixtureGuard').protect(module.exports,{vscode,filename:__filename});
