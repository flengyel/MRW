'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {documentItem,createDocumentPicker}=require('../src/documentPicker');const {chooserFiles}=require('../src/chooserFiles');
const {CancellationTokenSource,quickPicker}=require('./support/quickPicker');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const wait=async check=>{for(let n=0;n<100&&!check();n++)await new Promise(r=>setImmediate(r));assert.ok(check(),'picker state reached');};
function host(options){const p=quickPicker();const api={CancellationTokenSource,QuickPickItemKind:{Separator:-1},window:{createQuickPick:()=>p},workspace:{}};return {...createDocumentPicker(api,{initialFolder:async()=>'/notes',...options}),p};}
test('chooser labels prefer bounded metadata and retain the immutable filename',()=>{
 assert.equal(documentItem('/notes','/notes/ID.md','---\ntitle: ID YAML title\n---\n# Other\n').label,'YAML title · ID.md');
 assert.equal(documentItem('/notes','/notes/ID.md',' '.repeat(16384)+'\n# Beyond metadata bounds').label,'ID.md');
 assert.equal(documentItem('/notes','/notes/ID.md','```markdown\n# Example\n```\n# Actual\n').label,'Actual · ID.md');
});
test('Browse is actionable before a delayed filename worker or saved-copy listing completes; late results are discarded',async()=>{
 const names=deferred(),retained=deferred(),calls=[];const h=host({list:(folder,o)=>{calls.push(o);return names.promise;},listSaved:()=>retained.promise});
 assert.equal(h.p.items[0].label,'Browse for another document…');await wait(()=>calls.length===1);h.p.accept(h.p.items[0]);
 assert.equal((await h.result).action,'browse');assert.equal(calls[0].token.isCancellationRequested,true);
 names.resolve({root:'/notes',entries:[{file:'/notes/Late.md',type:'file'}],complete:true});retained.resolve([{id:'late',label:'Late saved copy'}]);await new Promise(r=>setImmediate(r));assert.equal(h.p.items.some(i=>i.file==='/notes/Late.md'),false);
});
test('a failing worker leaves Browse available and never starts recursive content indexing',async()=>{
 const calls=[];const h=host({list:async(_root,o)=>{calls.push(o);throw Error('Worker timed out');}});await wait(()=>h.p.placeholder.includes('timed out'));
 assert.equal(calls.length,1);assert.equal(calls[0].recursive,false);assert.ok(h.p.items.find(i=>i.action==='browse'));h.cancel();await h.result;
});
test('current-folder listing reads no descendant directory; recursive search is an explicit separate operation',async t=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-chooser-shallow-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));await fs.mkdir(path.join(root,'child'));await fs.mkdir(path.join(root,'child','deep'));
 await fs.writeFile(path.join(root,'A.md'),'# A\n');await fs.writeFile(path.join(root,'child','B.md'),'# B\n');await fs.writeFile(path.join(root,'child','deep','C.md'),'# C\n');
 const reads=[],io={...fs,readdir:async(...args)=>{reads.push(args[0]);return fs.readdir(...args);}};
 const shallow=await chooserFiles(root,{io});assert.deepEqual(reads,[root]);assert.equal(shallow.entries.some(e=>e.file.endsWith('B.md')),false);assert.ok(shallow.entries.some(e=>e.type==='folder'));
 const recursive=await chooserFiles(root,{recursive:true});assert.ok(recursive.entries.some(e=>e.file.endsWith('C.md')));assert.equal(recursive.complete,true);
});
test('asynchronous titles retain query, active item and selection; dirty text wins over disk titles',async()=>{
 const titles=deferred();const h=host({dirtyText:file=>file.endsWith('A.md')?'# Unsaved A\n':undefined,list:async(_root,o)=>o.files?titles.promise:{root:'/notes',entries:[{file:'/notes/A.md',type:'file'},{file:'/notes/B.md',type:'file'}],complete:true}});
 await wait(()=>h.p.items.some(i=>i.file==='/notes/B.md'));const b=h.p.items.find(i=>i.file==='/notes/B.md');h.p.value='B';h.p.activeItems=[b];h.p.selectedItems=[b];assert.equal(b.label,'B.md');
 titles.resolve({headers:new Map([['/notes/A.md','# Saved A\n'],['/notes/B.md','# Saved B\n']]),complete:true});await wait(()=>!h.p.busy);
 assert.equal(h.p.value,'B');assert.equal(h.p.activeItems[0],b);assert.equal(h.p.selectedItems[0],b);assert.equal(b.label,'Saved B · B.md');assert.equal(h.p.items.find(i=>i.file==='/notes/A.md').label,'Unsaved A · A.md');h.cancel();
});
test('folder navigation cancels old titles, supports parent navigation and ignores stale results',async()=>{
 const titles=deferred(),calls=[];const h=host({list:async(root,o)=>{calls.push({root,...o});if(o.files)return titles.promise;return {root,entries:root==='/notes'?[{file:'/notes/child',type:'folder'},{file:'/notes/A.md',type:'file'}]:[],complete:true};}});
 await wait(()=>calls.some(c=>c.files));const old=calls.find(c=>c.files);h.p.accept(h.p.items.find(i=>i.file==='/notes/child'));
 await wait(()=>h.p.title.endsWith('/notes/child')&&!h.p.busy);assert.equal(old.token.isCancellationRequested,true);assert.equal(h.p.items.find(i=>i.key==='parent').file,'/notes');
 titles.resolve({headers:new Map([['/notes/A.md','# Late title']]),complete:true});await new Promise(r=>setImmediate(r));assert.equal(h.p.items.some(i=>i.file==='/notes/A.md'),false);h.cancel();
});
test('recursive search is explicit, scoped and reports incomplete results without disabling reading',async()=>{
 const calls=[];const h=host({list:async(root,o)=>{calls.push(o);return {root,entries:[],complete:!o.recursive};}});await wait(()=>!h.p.busy&&calls.length===1);h.p.accept(h.p.items.find(i=>i.action==='search'));
 await wait(()=>calls.length===2&&!h.p.busy);assert.equal(calls[1].recursive,true);assert.match(h.p.placeholder,/Incomplete listing/);assert.match(h.p.title,/\/notes/);h.cancel();
});
test('saved-copy discovery is independent of file rows and shows title, source and retained revision',async()=>{
 const saved=deferred();const h=host({list:async root=>({root,entries:[],complete:true}),listSaved:()=>saved.promise});await wait(()=>!h.p.busy);assert.ok(h.p.items.find(i=>i.action==='browse'));
 saved.resolve([{id:'retained',label:'A retained title',description:'stacks-project:08ZH',detail:'Saved copy · revision abc'}]);await wait(()=>h.p.items.some(i=>i.id==='retained'));h.p.accept(h.p.items.find(i=>i.id==='retained'));assert.equal((await h.result).action,'saved-file');
});
test('closing the picker cancels the current worker and rejects late folder publication',async()=>{
 const pending=deferred();let token;const h=host({list:(_r,o)=>{token=o.token;return pending.promise;}});await wait(()=>!!token);h.p.hide();assert.equal(await h.result,undefined);assert.equal(token.isCancellationRequested,true);pending.resolve({root:'/notes',entries:[],complete:true});
});


test('Windows chooser worker failure is surfaced without a filesystem-index fallback', async()=>{
 let reads=0;const io={...fs,realpath:async()=>'/mnt/c/Notes',readdir:async()=>{reads++;throw Error('must not fall back');}};
 await assert.rejects(chooserFiles('/mnt/c/Notes',{remoteName:'wsl',io,run:async()=>{throw Error('worker timeout');}}),/worker timeout/);assert.equal(reads,0);
});


test('changing folders cancels pending saved discovery and ignores its late reply',async()=>{
 const requests=[];const h=host({list:async root=>({root,entries:[{file:root+'/child',type:'folder'}],complete:true}),listSaved:token=>{const d=deferred();requests.push({token,...d});return d.promise;}});
 await wait(()=>requests.length===1&&h.p.items.some(i=>i.action==='folder'&&i.key!=='parent'));
 h.p.accept(h.p.items.find(i=>i.action==='folder'&&i.key!=='parent'));await wait(()=>requests.length===2);
 assert.equal(requests[0].token.isCancellationRequested,true);requests[0].resolve([{id:'stale',label:'Stale'}]);
 requests[1].resolve([{id:'current',label:'Current'}]);await wait(()=>h.p.items.some(i=>i.id==='current'));
 assert.equal(h.p.items.some(i=>i.id==='stale'),false);h.cancel();
});

test('titles arrive progressively without clearing the query, selection or a dirty title', async()=>{
 const done=deferred();let headers;const file='/notes/ID.md';
 const h=host({dirtyText:p=>p===file?'# Unsaved title\n':undefined,list:async(root,o)=>{
  if(o.files){headers=o.onHeaders;return done.promise;}
  return {root,entries:[{file,type:'file'}],complete:true};
 }});
 await wait(()=>!!headers);h.p.value='ID';h.p.activeItems=[h.p.items.find(i=>i.file===file)];
 headers(new Map([[file,'# Disk title\n']]));assert.match(h.p.items.find(i=>i.file===file).label,/Unsaved title/);
 assert.equal(h.p.value,'ID');assert.equal(h.p.activeItems[0].file,file);h.cancel();
 headers(new Map([[file,'# Late title\n']]));done.resolve({headers:new Map(),complete:true});await h.result;
});
