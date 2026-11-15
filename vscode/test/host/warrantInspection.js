 'use strict';
// Inspect a prebuilt, Lean-generated fixture package through real native UI.
// Scripted picker choices; no authoring companion, new admission or check.
const vscode=require('vscode'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const guard=require('./fixtureGuard');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function inventory(root){
 const result={};async function walk(dir){for(const name of await fs.readdir(dir)){const file=path.join(dir,name),st=await fs.lstat(file);if(st.isDirectory())await walk(file);else{assert.ok(st.isFile()&&!st.isSymbolicLink());result[path.relative(root,file)]=createHash('sha256').update(await fs.readFile(file)).digest('hex');}}}await walk(root);return result;
}
async function wait(check,label,ms=20000){const end=Date.now()+ms;while(!check()){if(Date.now()>end)throw Error('Timed out: '+label);await pause(50);}}
async function run(context){
 const {marker,config}=await guard.assertFixture(vscode,context,context.extensionPath);
 const packagePath=path.join(config.project,'documentary-package'),report={host:vscode.version,remote:vscode.env.remoteName,profile:marker.profile,checks:[],requests:[],complete:false};
 const save=()=>fs.writeFile(path.join(marker.root,'native-result.json'),JSON.stringify(report,null,2)+'\n');
 const original={pick:vscode.window.showQuickPick,dialog:vscode.window.showOpenDialog,error:vscode.window.showErrorMessage};let module,raw,doc,baseline;
 report.errors=[];
 try{
  report.stage='await-native-window-focus';await save();await wait(()=>vscode.window.state.focused,'fixture focus',60000);
  const before=await inventory(packagePath);
  module=require('../../src/bridge');raw=module.runBridge;module.runBridge=(...args)=>{report.requests.push(args[2].method);return raw(...args);};
  vscode.window.showQuickPick=async items=>(await items).find(item=>item.format==='documentary_package');
  vscode.window.showOpenDialog=async()=>[vscode.Uri.file(packagePath)];
  vscode.window.showErrorMessage=async message=>{report.errors.push(message);await save();};
  require('../../src/extension').activate(context);
  doc=await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(config.project,'reading.md')));baseline=doc.getText();
  const editor=await vscode.window.showTextDocument(doc,{viewColumn:1,preview:false});await wait(()=>vscode.window.activeTextEditor?.document===doc,'native editor');
  assert.ok(await editor.edit(edit=>edit.insert(new vscode.Position(0,0),'Unsent inspection fixture\n')));assert.ok(doc.isDirty);
  const priorViews=new Set(vscode.workspace.textDocuments.map(item=>item.uri.toString()));
  await vscode.commands.executeCommand('mrw.inspect');
  const views=()=>vscode.workspace.textDocuments.filter(item=>item.uri.scheme==='mrw-record'&&item.uri.path.endsWith('/Retained-record.txt')&&!priorViews.has(item.uri.toString()));
  await wait(()=>views().length===1,'retained record view');const text=views()[0].getText();
  assert.match(text,/AI-response documentary warrant/);assert.match(text,/Documentary premise: m:D/);assert.match(text,/Context: ai-documentary-mechanical-context-v1/);
  assert.match(text,/Check: .*verified/);assert.match(text,/No substantive claim F or bridge D → F is present or admitted/);assert.match(text,/Retained bundle SHA-256: [a-f0-9]{64}/);
  assert.ok(doc.isDirty);assert.equal(doc.getText(),'Unsent inspection fixture\n'+baseline);assert.equal(await fs.readFile(doc.uri.fsPath,'utf8'),baseline);
  report.checks.push('native inspector displays the Lean-generated documentary warrant, exact span/context/checker identity and documentary-only boundary while preserving an unrelated unsent draft');await save();
  await vscode.commands.executeCommand('mrw.inspect');await wait(()=>views().length===2,'reopened retained record');assert.ok(views().every(view=>view.getText()===text));
  assert.deepEqual(report.requests.filter(method=>method!=='artifact_status'),['inspect','inspect']);assert.deepEqual(await inventory(packagePath),before);assert.deepEqual(report.errors,[]);
  report.checks.push('reinspection uses only read-only artifact status/inspect requests, preserves every package byte and creates no new admission, provider request or Lean run');
  // Restore only this known fixture edit; Save never touches a real note/vault.
  const own=await vscode.window.showTextDocument(doc,{viewColumn:1,preview:false});assert.equal(doc.getText(),'Unsent inspection fixture\n'+baseline);
  assert.ok(await own.edit(edit=>edit.delete(new vscode.Range(new vscode.Position(0,0),new vscode.Position(1,0)))));assert.equal(doc.getText(),baseline);if(doc.isDirty)assert.ok(await doc.save());
  await guard.clearOwnedState(context);report.packageFiles=Object.keys(before).length;report.complete=true;
 }catch(error){report.failure=error.stack;}
 finally{
  if(module&&raw)module.runBridge=raw;vscode.window.showQuickPick=original.pick;vscode.window.showOpenDialog=original.dialog;vscode.window.showErrorMessage=original.error;
  await save();if(!vscode.workspace.textDocuments.some(d=>d.isDirty))await vscode.commands.executeCommand('workbench.action.closeWindow');
 }
}
module.exports={activate:context=>{void run(context).catch(console.error);}};
module.exports=require('./fixtureGuard').protect(module.exports,{vscode,filename:__filename});
