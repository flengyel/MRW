'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {pathToFileURL,fileURLToPath}=require('node:url');
const {createRecentNotes}=require('../src/recentNotes');
const KEY='mrw.recentNotes.v1';
const fileUri=file=>({scheme:'file',fsPath:file,toString:()=>pathToFileURL(file).href});
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-recent-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}
function host(root,state=new Map()){
 const docs=[],events={},picks=[],errors=[],opened=[];
 const h={root,state,docs,events,picks,errors,opened};
 const vscode={Uri:{parse:value=>fileUri(fileURLToPath(value))},
  workspace:{textDocuments:docs,onDidSaveTextDocument(fn){events.save=fn;return {dispose(){}};}},
  window:{async showQuickPick(items,options){picks.push({items,options});return h.pickHook?h.pickHook(items):items[0];},
   async showInformationMessage(message){h.info=message;},async showErrorMessage(message){errors.push(message);}}};
 const context={subscriptions:[],workspaceState:{get:(key,otherwise)=>state.get(key)??otherwise,async update(key,value){if(h.failSave)throw Error('disk unavailable');state.set(key,structuredClone(value));}}};
 h.notes=createRecentNotes({vscode,context,folderRoot:async()=>h.root,open:async uri=>opened.push(uri)});
 return h;
}
test('recent notes survive restart, show current titles and honor unsaved text without changing files',async t=>{
  const root=await fixture(t),state=new Map(),h=host(root,state),file=path.join(root,'ID1.md');
  await fs.writeFile(file,'---\nid: ID1\ntitle: ID1 Earlier title\n---\n# Heading\n');
  await h.notes.remember(fileUri(file));const restarted=host(root,state);
  restarted.docs.push({uri:fileUri(file),getText:()=> '# Unsaved title\n',isDirty:true});
  await restarted.notes.recent();assert.match(restarted.picks[0].items[0].label,/Unsaved title.*ID1.md/);
  assert.equal(restarted.opened[0].fsPath,file);assert.match(await fs.readFile(file,'utf8'),/Earlier title/);
});
test('failed recent publication is visible and retry preserves the list across restart',async t=>{
  const root=await fixture(t),h=host(root),file=path.join(root,'A.md');await fs.writeFile(file,'# A');
  h.failSave=true;await assert.rejects(h.notes.remember(fileUri(file)),/could not be saved/);assert.equal(h.state.has(KEY),false);
  h.failSave=false;await h.notes.remember(fileUri(file));await host(root,h.state).notes.recent();assert.equal(h.state.get(KEY).length,1);
});
test('recent notes cannot redirect after folder changes, symlink replacement or deletion',async t=>{
  const root=await fixture(t),h=host(root),file=path.join(root,'A.md'),other=path.join(root,'B.md');
  await fs.writeFile(file,'# A');await fs.writeFile(other,'# B');await h.notes.remember(fileUri(file));
  h.pickHook=items=>{h.root=root+'/changed';return items[0];};await assert.rejects(h.notes.recent(),/folder changed/);
  h.root=root;h.pickHook=undefined;await fs.unlink(file);await fs.symlink(other,file);
  await assert.rejects(h.notes.recent(),/points elsewhere/);assert.equal(h.opened.length,0);
  await fs.unlink(file);await assert.rejects(h.notes.recent(),/ENOENT/);assert.equal(h.opened.length,0);
});
test('recent list stays bounded and excludes files outside the selected folder',async t=>{
  const root=await fixture(t),h=host(root),outside=await fixture(t),external=path.join(outside,'other.md');
  await fs.writeFile(external,'# Outside');await h.notes.remember(fileUri(external));assert.equal(h.state.has(KEY),false);
  for(let n=0;n<35;n++){const file=path.join(root,n+'.md');await fs.writeFile(file,'# '+n);await h.notes.remember(fileUri(file));}
  assert.equal(h.state.get(KEY).length,30);assert.match(h.state.get(KEY)[0].uri,/34.md$/);
  h.pickHook=()=>undefined;await h.notes.recent();assert.equal(h.opened.length,0);
});


