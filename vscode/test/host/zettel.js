'use strict';
const vscode = require('vscode'), fs = require('node:fs/promises'), path = require('node:path');
const assert = require('node:assert/strict');
async function check(root, extension) {
  assert.equal(path.basename(root), 'mrw-activation-fixture');
  const {createZettelNotes} = require(path.join(extension.extensionPath,'src/zettelNotes'));
  const state = new Map(), subscriptions = [];
  const title = 'Native Zettel save check';
  // Supply a deterministic answer only for the title prompt. Native Uri,
  // document editing, save and file-change events remain the real VS Code API.
  const {hostFacade} = require(path.join(extension.extensionPath,'src/workspaceMoveHost'));
  const window = hostFacade(vscode.window, {get(target,key){
    if(key==='showInputBox') return async()=>title;
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }});
  const api = {...vscode, window};
  const notes = createZettelNotes({vscode:api,context:{subscriptions,workspaceState:{get:(k,d)=>state.get(k)??d,async update(k,v){state.set(k,v);}}},folderRoot:async()=>root});
  try {
    const source = vscode.Uri.file(path.join(root,'reading.md'));
    const original = await fs.readFile(source.fsPath);
    const doc = await notes.newDraft({source:{uri:source,label:'Fixture reading'}});
    assert.equal(doc.uri.scheme,'untitled');assert.equal(doc.isDirty,true);
    const file = doc.uri.fsPath;
    assert.equal(path.dirname(file),root);
    await assert.rejects(fs.stat(file),/ENOENT/);
    assert.equal(await doc.save(),true);
    const text = await fs.readFile(file,'utf8');assert.ok(text.includes('# '+title));assert.ok(text.includes('(<reading.md>)'));
    await notes.remember(vscode.Uri.file(file));assert.equal(state.get('mrw.recentNotes.v1')[0].uri,vscode.Uri.file(file).toString());
    assert.deepEqual(await fs.readFile(source.fsPath),original);
    return {name:'native assigned-path Zettel editing and Save; deterministic title only',passed:true,filename:path.basename(file)};
  } finally { for(const disposable of subscriptions) disposable.dispose(); }
}
module.exports = {check};
