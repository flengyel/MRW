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
 const result=await prepare({text,file,root,configuration});assert.match(result.citations['[@a]'].text,/Author 2020/);assert.match(result.citations['[@a, p. 4; @b]'].text,/2020, 4.*2021/);assert.match(result.citations['[@missing]'].problem,/Unresolved/);assert.match(result.bibliography,/First Book/);assert.equal(await fs.readFile(file,'utf8'),text);
 await fs.writeFile(bib,JSON.stringify([...refs,refs[0]]));const duplicate=await prepare({text,file,root,configuration});assert.match(duplicate.citations['[@a]'].problem,/Ambiguous/);
 await fs.writeFile(bib,JSON.stringify([{...refs[0],title:'Changed Book'},refs[1]]));const changed=await prepare({text,file,root,configuration});assert.match(changed.bibliography,/Changed Book/);
 const inline=await prepare({text:'---\nreferences:\n- id: a\n  type: book\n  title: Inline Book\n---\n\n[@a]\n',file,root,configuration});assert.match(inline.bibliography,/Inline Book/);
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
