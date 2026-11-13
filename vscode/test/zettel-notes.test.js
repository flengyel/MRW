'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const {pathToFileURL, fileURLToPath} = require('node:url');
const {createZettelNotes, zettelText} = require('../src/zettelNotes');
const KEY = 'mrw.recentNotes.v1';
const fileUri = file => ({scheme:'file', fsPath:file, toString:()=>pathToFileURL(file).href});
class Position { constructor(line, character) { Object.assign(this,{line,character}); } }
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'mrw-zettel-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  return root;
}
function host(root, state = new Map()) {
  const docs=[], events={}, picks=[], shown=[], errors=[], opened=[];
  const h={root, title:'A calculation', prefix:'Num', state, docs, events, picks, shown, errors, opened};
  const vscode={Position, Selection:class {constructor(start,end){Object.assign(this,{start,end});}}, ViewColumn:{Beside:-2},
    Uri:{file:fileUri, parse:value=>fileUri(fileURLToPath(value)), from:({scheme,path:p})=>({scheme,path:p,fsPath:p,toString:()=>scheme+':'+p})},
    workspace:{textDocuments:docs,getConfiguration:()=>({get:(key,fallback)=>key==='zettelPrefix'?h.prefix:key==='zettelTemplate'?(h.template??fallback):fallback}),
      onDidSaveTextDocument(fn){events.save=fn;return {dispose(){}};},
      async openTextDocument(uri){
        const prior=docs.find(d=>d.uri.toString()===uri.toString()); if(prior)return prior;
        const doc={uri,text:'',getText(){return this.text;},positionAt(at){const lines=this.text.slice(0,at).split('\n');return new Position(lines.length-1,lines.at(-1).length);}};
        docs.push(doc);return doc;
      }},
    window:{async showInputBox(options){h.input=options;return h.inputHook?h.inputHook():h.title;},
      async showTextDocument(doc,options){shown.push({doc,options});await h.showHook?.(doc);return {document:doc,async edit(action){if(h.rejectEdit)return false;action({insert:(_pos,text)=>{doc.text=text;doc.isDirty=true;}});return true;}};},
      async showQuickPick(items,options){picks.push({items,options});return h.pickHook?h.pickHook(items):items[0];},
      async showInformationMessage(message){h.info=message;},async showErrorMessage(message){errors.push(message);}}
  };
  const context={subscriptions:[],workspaceState:{get:(key,otherwise)=>state.get(key)??otherwise,async update(key,value){if(h.failSave)throw Error('disk unavailable');state.set(key,structuredClone(value));}}};
  h.notes=createZettelNotes({vscode,context,folderRoot:async()=>h.root,open:async uri=>opened.push(uri),now:()=>new Date(2026,10,13,9,7)});
  h.vscode=vscode;
  return h;
}
test('Zettel is an ordinary unsaved draft in the selected folder with an encoded source link',async t=>{
  const root=await fixture(t),h=host(root),source=path.join(root,'papers','a #1.pdf');
  const doc=await h.notes.newDraft({source:{uri:fileUri(source),label:'Paper [1]'}});
  assert.equal(doc.uri.scheme,'untitled');assert.equal(path.basename(doc.uri.fsPath),'Num202611130907.md');
  assert.match(doc.text,/^# A calculation\n/);assert.doesNotMatch(doc.text,/^---|id:|title:|Research|SEE ALSO|References/m);
  assert.match(doc.text,/\[Paper \\\[1\\\]\]\(<papers\/a%20%231.pdf>\)/);
  assert.equal(h.shown[0].options.viewColumn,-2);assert.equal(doc.isDirty,true);
  assert.deepEqual(await fs.readdir(root),[]);assert.equal(h.state.has(KEY),false);
});
test('cancelled title, changed folder and stale origin create no files or buffers',async t=>{
  const root=await fixture(t),h=host(root);h.title=undefined;assert.equal(await h.notes.newDraft(),undefined);
  h.title='Title';h.inputHook=()=>{h.root=root+'/elsewhere';return h.title;};await assert.rejects(h.notes.newDraft(),/folder changed/);
  h.root=root;h.inputHook=undefined;await assert.rejects(h.notes.newDraft({validate:()=>{throw Error('stale source');}}),/stale source/);
  assert.equal(h.docs.length,0);assert.deepEqual(await fs.readdir(root),[]);
});
test('existing files, symlinks, open drafts and simultaneous requests cannot overwrite a note',async t=>{
  const root=await fixture(t),h=host(root),base='Num202611130907';
  await fs.writeFile(path.join(root,base+'.md'),'original');await fs.symlink(path.join(root,'missing'),path.join(root,base+'-2.md'));
  const docs=await Promise.all([h.notes.newDraft(),h.notes.newDraft()]);
  assert.equal(new Set(docs.map(d=>d.uri.fsPath)).size,2);
  assert.deepEqual(docs.map(d=>path.basename(d.uri.fsPath)).sort(),[base+'-3.md',base+'-4.md']);
  assert.equal(path.basename((await h.notes.newDraft()).uri.fsPath),base+'-5.md');
  assert.equal(await fs.readFile(path.join(root,base+'.md'),'utf8'),'original');
});
test('text entered while the draft opens is preserved and declined edits are reported',async t=>{
  const root=await fixture(t),h=host(root);h.showHook=doc=>{doc.text='user draft';};
  await assert.rejects(h.notes.newDraft(),/contents were preserved/);assert.equal(h.docs[0].text,'user draft');
  h.showHook=undefined;h.rejectEdit=true;await assert.rejects(h.notes.newDraft(),/declined/);
  assert.deepEqual(await fs.readdir(root),[]);
});
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


test('custom templates are optional literal text, with YAML quoting and no recursive execution',()=>{
  const title = 'A "title" {{source}}';
  const template = '---\nname: {{titleYaml}}\nkey: {{id}}\n---\n# {{title}}\n{{cursor}}<% executable? %>\n{{unknown}}';
  const result = zettelText('id-1',title,undefined,'/tmp',template);
  assert.ok(result.text.includes('name: '+JSON.stringify(title)));
  assert.ok(result.text.includes('key: id-1'));assert.ok(result.text.includes('# '+title));
  assert.equal(result.text.slice(result.cursor),'<% executable? %>\n{{unknown}}');
});
test('invalid templates fail before opening a draft or prompting for a title',async t=>{
  const root=await fixture(t),h=host(root);h.template='';
  await assert.rejects(h.notes.newDraft(),/Zettel Template/);assert.equal(h.input,undefined);assert.equal(h.docs.length,0);
});
