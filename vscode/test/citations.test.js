'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {candidates,prepare,registerCitations}=require('../src/citations');
test('candidate discovery leaves escaped citations and code examples alone',()=>{
 assert.deepEqual(candidates('Text [@a, p. 4; @b]. `[@code]` \\[@escaped]\n```md\n[@fenced]\n```\n'),['[@a, p. 4; @b]']);
 assert.deepEqual(candidates('---\ntitle: "Title [@hidden]"\n---\n[email@host](https://example.test) [@a](https://example.test)'),[]);
});
test('real local citeproc handles clusters, missing/duplicate keys, changes, offline and inline metadata',{skip:!process.env.MRW_TEST_PANDOC},async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-cite-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));const file=path.join(root,'note.md'),bib=path.join(root,'refs.json');
 const refs=[{id:'a',type:'book',title:'First Book',author:[{family:'Author',given:'Alice'}],issued:{'date-parts':[[2020]]}},{id:'b',type:'book',title:'Second Book',author:[{family:'Reader',given:'Bob'}],issued:{'date-parts':[[2021]]}}];await fs.writeFile(bib,JSON.stringify(refs));
 const text='---\nbibliography: refs.json\n---\n\n[@a] and [@a, p. 4; @b]. [@missing]\n';await fs.writeFile(file,text);const configuration={executable:process.env.MRW_TEST_PANDOC};
 const result=await prepare({text,file,root,configuration});assert.match(result.citations['[@a]'].text,/Author 2020/);assert.match(result.citations['[@a, p. 4; @b]'].text,/2020, 4.*2021/);assert.match(result.citations['[@missing]'].problem,/Unresolved/);assert.match(result.bibliography,/First Book/);assert.match(result.status,/snapshot: "refs.json"/);assert.equal(await fs.readFile(file,'utf8'),text);
 await fs.writeFile(bib,JSON.stringify([...refs,refs[0]]));const duplicate=await prepare({text,file,root,configuration});assert.match(duplicate.citations['[@a]'].problem,/Ambiguous/);
 await fs.writeFile(bib,JSON.stringify([{...refs[0],title:'Changed Book'},refs[1]]));const changed=await prepare({text,file,root,configuration});assert.match(changed.bibliography,/Changed Book/);
 const inline=await prepare({text:'---\nreferences:\n- id: a\n  type: book\n  title: Inline Book\n---\n\n[@a]\n',file,root,configuration});assert.match(inline.bibliography,/Inline Book/);assert.match(inline.status,/Inline references in "note.md"/);
 await assert.rejects(prepare({text:'---\nbibliography: https://invalid.example/refs.json\n---\n\n[@a]',file,root,configuration}),/Only local/);
});
test('preview preserves dirty source and renders only a matching document version',async()=>{
 const text='Unsaved [@a].';const doc={uri:{scheme:'file',fsPath:'/fixture/a.md',toString:()=> 'file:///fixture/a.md'},version:2,isDirty:true,getText:()=>text};
 const controller=registerCitations({vscode:{workspace:{textDocuments:[doc],isTrusted:false},commands:{executeCommand:async()=>{}}},context:{subscriptions:[]},documents:{}});
 controller.cache.set(doc.uri.toString(),{text,citations:{'[@a]':{text:'(Author 2020)'}},bibliography:'Author. Book.',status:'Local snapshot'});
 const md=controller.extendMarkdownIt(new(require('../media/markdown-it/markdown-it'))());const html=md.render(text,{currentDocument:doc.uri});assert.match(html,/Author 2020/);assert.equal(doc.getText(),text);assert.equal(doc.isDirty,true);
});

test('many citation tokens coalesce a missing preview into one processor job',async()=>{let calls=0,release;const deferred=new Promise(r=>release=r),text='[@a] [@b] [@c]',doc={uri:{scheme:'file',fsPath:'/fixture/n.md',toString:()=> 'file:///fixture/n.md'},version:1,getText:()=>text};const controller=registerCitations({vscode:{workspace:{isTrusted:true,textDocuments:[doc],workspaceFolders:[{uri:{fsPath:'/fixture'}}],getConfiguration:()=>({get:(_,d)=>d})},commands:{executeCommand:async()=>{}}},context:{subscriptions:[]},documents:{check:async()=>{}},prepareNote:async()=>{calls++;await deferred;return {citations:{'[@a]':{text:'A'},'[@b]':{text:'B'},'[@c]':{text:'C'}},bibliography:'',status:'Fixture'};}});const md=controller.extendMarkdownIt(new(require('../media/markdown-it/markdown-it'))());for(let i=0;i<5;i++)md.render(text,{currentDocument:doc.uri});await new Promise(r=>setImmediate(r));assert.equal(calls,1);release();await controller.update(doc);assert.equal(calls,1);});

test('citation watchers include external selected roots and refresh after folder configuration changes',()=>{const patterns=[];let changed,root='/external/notes';const watchers=[];registerCitations({vscode:{RelativePattern:class{constructor(base,pattern){this.base=base;this.pattern=pattern;}},workspace:{textDocuments:[],getConfiguration:()=>({get:()=>root}),onDidChangeConfiguration:fn=>{changed=fn;return {dispose(){}};},createFileSystemWatcher:p=>{patterns.push(p);const w={dispose(){this.disposed=true;}};watchers.push(w);return w;}},commands:{executeCommand:async()=>{}}},context:{subscriptions:[]},documents:{}});assert.equal(patterns[0].base,'/external/notes');root='/other/notes';changed();assert.equal(watchers[0].disposed,true);assert.equal(patterns.at(-1).base,'/other/notes');});

test('bibliography list and aggregate processor input have explicit limits',async t=>{const root=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-cite-budget-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));await assert.rejects(prepare({text:'[@a]',file:path.join(root,'n.md'),root,execute:async()=>JSON.stringify({'pandoc-api-version':[1,23,1],meta:{bibliography:{t:'MetaList',c:Array.from({length:5},(_,i)=>({t:'MetaString',c:'ref'+i+'.json'}))}},blocks:[]})}),/At most four/);await assert.rejects(require('../src/citations').run('never-started',[], 'x'.repeat(4*1024*1024+1)),/input exceeds/);});

async function citationFixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-cite-live-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return {root,file:path.join(root,'n.md'),configuration:{executable:process.env.MRW_TEST_PANDOC}};}
const ref={id:'a',type:'book',title:'Owner-supplied Book',author:[{family:'Author'}],issued:{'date-parts':[[2020]]}};
test('live owner lookup renders known keys while leaving missing and ambiguous groups explicit',{skip:!process.env.MRW_TEST_PANDOC},async t=>{
 const f=await citationFixture(t);let keys,options;
 const r=await prepare({...f,text:'[@a] [@missing] [@ambiguous] [see @a, p. 4]',configuration:{...f.configuration,source:'zotero',zoteroLibraries:[4]},resolveZotero:async(k,o)=>{keys=k;options=o;return {references:[ref],errors:{missing:0,ambiguous:2},status:'Live fixture'};}});
 assert.deepEqual(keys,['a','missing','ambiguous']);assert.deepEqual(options.libraries,[4]);assert.match(r.citations['[@a]'].text,/Author 2020/);assert.match(r.citations['[@missing]'].problem,/Unresolved/);assert.match(r.citations['[@ambiguous]'].problem,/Ambiguous/);assert.match(r.citations['[see @a, p. 4]'].text,/4/);
});
test('companion live source is respected and an explicit note bibliography keeps precedence',{skip:!process.env.MRW_TEST_PANDOC},async t=>{
 const f=await citationFixture(t),folder=path.join(f.root,'.obsidian/plugins/obsidian-pandoc-reference-list');await fs.mkdir(folder,{recursive:true});await fs.writeFile(path.join(folder,'data.json'),JSON.stringify({pullFromZotero:true,zoteroGroups:[{id:1}],pathToBibliography:'old.json',pathToPandoc:'/untrusted/ignored'}));await fs.writeFile(path.join(f.root,'old.json'),'[]');let calls=0;
 const options={...f,resolveZotero:async()=>{calls++;return {references:[ref],errors:{},status:'Live fixture'};}};
 const live=await prepare({...options,text:'[@a]'});assert.match(live.citations['[@a]'].text,/Author 2020/);assert.equal(calls,1);
 await fs.writeFile(path.join(f.root,'local.json'),JSON.stringify([{...ref,title:'Explicit local book'}]));const local=await prepare({...options,text:'---\nbibliography: local.json\n---\n[@a]',configuration:{...f.configuration,source:'zotero'}});assert.match(local.bibliography,/Explicit local book/i);assert.match(local.status,/snapshot: "local.json"/);assert.doesNotMatch(local.status,/old.json/);assert.equal(calls,1);
});
test('offline auto mode uses a labeled local snapshot; a live missing key is never revived from it',{skip:!process.env.MRW_TEST_PANDOC},async t=>{
 const f=await citationFixture(t),folder=path.join(f.root,'.obsidian/plugins/obsidian-pandoc-reference-list');await fs.mkdir(folder,{recursive:true});await fs.writeFile(path.join(folder,'data.json'),JSON.stringify({pullFromZotero:true,zoteroGroups:[{id:1}],pathToBibliography:'refs.json'}));await fs.writeFile(path.join(f.root,'refs.json'),JSON.stringify([ref]));
 const offline=await prepare({...f,text:'[@a]',resolveZotero:async()=>{throw Error('Offline');}});assert.match(offline.citations['[@a]'].text,/Author 2020/);assert.match(offline.status,/unavailable.*local bibliography snapshot: "refs.json"/);
 const missing=await prepare({...f,text:'[@a]',resolveZotero:async()=>({references:[],errors:{a:0},status:'Live missing'})});assert.equal(missing.citations['[@a]'].text,'[@a]');assert.match(missing.citations['[@a]'].problem,/Unresolved/);
});
test('WSL finds pandoc.exe only after a missing host command, never from companion configuration',{skip:!process.env.MRW_TEST_PANDOC},async t=>{
 const f=await citationFixture(t),calls=[];const r=await prepare({...f,text:'---\nreferences:\n- id: a\n  type: book\n  title: Inline book\n---\n[@a]',configuration:{host:'wsl'},execute:async(executable,args,input)=>{calls.push(executable);if(executable==='pandoc')throw Object.assign(Error('Missing'),{code:'ENOENT'});return require('../src/citations').run(process.env.MRW_TEST_PANDOC,args,input);}});assert.equal(calls[0],'pandoc');assert.ok(calls.slice(1).every(x=>x==='pandoc.exe'));assert.match(r.bibliography,/Inline book/i);
});
test('returning to the MRW window refreshes citations without changing the open text',async()=>{
 let focus,calls=0;const text='[see @a]',doc={uri:{scheme:'file',fsPath:'/fixture/n.md',toString:()=> 'file:///fixture/n.md'},version:1,isDirty:true,getText:()=>text},context={subscriptions:[]};
 const c=registerCitations({vscode:{env:{remoteName:'wsl'},window:{onDidChangeWindowState:fn=>{focus=fn;return {dispose(){}};}},workspace:{isTrusted:true,textDocuments:[doc],workspaceFolders:[{uri:{fsPath:'/fixture'}}],getConfiguration:()=>({get:(_,d)=>d})},commands:{executeCommand:async()=>{}}},context,documents:{check:async()=>{}},prepareNote:async()=>{calls++;return {citations:{'[see @a]':{text:'Author'}},bibliography:'',status:'Fixture'};}});
 focus({focused:false});assert.equal(calls,0);focus({focused:true});await new Promise(r=>setTimeout(r,380));await c.update(doc);assert.ok(calls>=1);assert.equal(c.cache.get(doc.uri.toString()).citations['[see @a]'].text,'Author');assert.equal(doc.getText(),text);assert.equal(doc.isDirty,true);for(const sub of context.subscriptions)sub.dispose();
});

test('ordinary email and citation code examples cause neither lookup nor an empty citation footer',async()=>{
 const text='Contact name@example.org. `[@example]`',doc={uri:{scheme:'file',fsPath:'/fixture/n.md',toString:()=> 'file:///fixture/n.md'},version:1,getText:()=>text};let calls=0;
 const c=registerCitations({vscode:{workspace:{isTrusted:true,textDocuments:[doc]},commands:{executeCommand:async()=>{}}},context:{subscriptions:[]},documents:{},prepareNote:async()=>{calls++;throw Error('Unexpected lookup');}});await c.update(doc);assert.equal(calls,0);assert.equal(c.cache.size,0);
});

test('late citation responses cannot restore closed-document or disposed caches',async()=>{
 for(const close of [true,false]){
  let finish,onClose,started,signal;const waiting=new Promise(r=>started=r),deferred=new Promise(r=>finish=r),context={subscriptions:[]},doc={uri:{scheme:'file',fsPath:'/fixture/n.md',toString:()=> 'file:///fixture/n.md'},version:1,getText:()=> '[@a]'};
  const c=registerCitations({vscode:{workspace:{isTrusted:true,workspaceFolders:[{uri:{fsPath:'/fixture'}}],getConfiguration:()=>({get:(_,d)=>d}),onDidCloseTextDocument:fn=>{onClose=fn;return {dispose(){}};}},commands:{executeCommand:async()=>{}}},context,documents:{check:async()=>{}},prepareNote:async o=>{signal=o.signal;started();await deferred;return {citations:{'[@a]':{text:'Author'}},bibliography:'',status:'Fixture'};}});
  const job=c.update(doc);await waiting;if(close){doc.isClosed=true;onClose(doc);}else {for(const sub of context.subscriptions)sub.dispose();assert.equal(signal.aborted,true);}
  finish();await job;assert.equal(c.cache.size,0);
 }
});

test('bibliography notice lists every file actually read by its scoped relative name',{skip:!process.env.MRW_TEST_PANDOC},async t=>{
 const f=await citationFixture(t);await fs.mkdir(path.join(f.root,'media'));await fs.writeFile(path.join(f.root,'media/first.json'),JSON.stringify([ref]));await fs.writeFile(path.join(f.root,'second.json'),JSON.stringify([{...ref,id:'b'}]));
 const r=await prepare({...f,text:'---\nbibliography: [media/first.json, second.json]\n---\n[@a] [@b]'});
 assert.match(r.status,/"media[/\\]first.json", "second.json"/);assert.match(r.status,/freshness relative to Zotero is unknown/);assert.doesNotMatch(r.status,new RegExp(f.root));
});
