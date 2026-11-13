'use strict';
const vscode=require('vscode'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
async function check(root,extension){
 assert.equal(path.basename(root),'mrw-activation-fixture');
 const {createDocuments}=require(path.join(extension.extensionPath,'src/documents'));
 const {trackLocation}=require(path.join(extension.extensionPath,'src/readingOutline'));
 const {createRecentNotes}=require(path.join(extension.extensionPath,'src/recentNotes'));
 const state=new Map(),subscriptions=[],commands=new Map();
 const context={subscriptions,workspaceState:{get:(k,d)=>state.get(k)??d,async update(k,v){state.set(k,v);}}};
 const source=vscode.Uri.file(path.join(root,'reading.md')),original=await fs.readFile(source.fsPath),files=await fs.readdir(root);
 const controller=createDocuments({vscode,context,register:(id,fn)=>commands.set(id,fn),trackLocation});
 try{
  const doc=await commands.get('mrw.newZettel')(source);
  assert.equal(doc.uri.scheme,'untitled');assert.equal(doc.languageId,'markdown');assert.equal(doc.getText(),'');
  assert.equal(vscode.window.activeTextEditor.document,doc);
  const tabs=vscode.window.tabGroups.all.flatMap(g=>g.tabs.map(t=>t.input?.uri?.toString()));assert.ok(tabs.includes(source.toString()));
  assert.deepEqual(await fs.readdir(root),files);assert.deepEqual(await fs.readFile(source.fsPath),original);
  const recent=createRecentNotes({vscode,context,folderRoot:async()=>root});await recent.remember(source);
  assert.equal(state.get('mrw.recentNotes.v1')[0].uri,source.toString());
  assert.equal(await controller.returnToDocument(),true);
  return {name:'native blank Markdown, unchanged source/file inventory, Recent Notes and Return',passed:true};
 }finally{for(const d of subscriptions)d.dispose();}
}
module.exports={check};
