'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {createInspection}=require('../src/inspection');
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
async function fixture(t){const home=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-inspection-'));t.after(()=>fs.rm(home,{recursive:true,force:true}));const root=path.join(home,'owned');await fs.mkdir(root);return {home,root,api:createInspection({storageRoots:[root],version:'fixture',scope:'isolated'})};}
async function tree(dir){const found={};for await(const item of await fs.opendir(dir)){const p=path.join(dir,item.name);if(item.isDirectory())Object.assign(found,await tree(p));else if(item.isFile())found[p]=digest(await fs.readFile(p));}return found;}
test('inspector streams owned bytes, identifies corrupt addressed objects and leaves every payload unchanged',async t=>{
 const f=await fixture(t),bytes='retained α',key=digest(bytes);await fs.writeFile(path.join(f.root,'source-'+key+'.bin'),bytes);
 await fs.writeFile(path.join(f.root,'artifact-'+('a'.repeat(64))+'.bin'),'corrupt');await fs.writeFile(path.join(f.root,'save.pending'),'incomplete');
 await fs.writeFile(path.join(f.root,'obsidian-links.json'),JSON.stringify({continuations:[{association:'id',phase:'pending'}]}));const before=await tree(f.root);
 const r=await f.api.inspect();assert.equal(r.status,'failures');assert.ok(r.findings.some(x=>x.kind==='digest'&&x.state==='failure'));assert.ok(r.findings.some(x=>x.kind==='pending-association'));assert.ok(r.findings.some(x=>x.kind==='interrupted-operation'));assert.deepEqual(await tree(f.root),before);assert.match(r.coverage,/unchecked/);
});
test('active manifest missing/different objects are reported separately from unavailable roots',async t=>{
 const f=await fixture(t),generation='11111111-1111-1111-1111-111111111111',base=path.join(f.root,'versions',generation,'payload');await fs.mkdir(base,{recursive:true});
 await fs.writeFile(path.join(base,'one.bin'),'different');await fs.writeFile(path.join(f.root,'HEAD.json'),JSON.stringify({version:1,generation,files:{'one.bin':{sha256:digest('expected'),size:8},'missing.bin':{sha256:digest('missing'),size:7}}}));
 const r=await f.api.inspect();assert.ok(r.findings.some(f=>f.kind==='manifest-digest'&&f.state==='failure'));assert.ok(r.findings.some(f=>f.kind==='manifest-target'&&f.state==='failure'));
 const missing=createInspection({storageRoots:[path.join(f.home,'offline')]});assert.equal((await missing.inspect()).roots[0].status,'unavailable');
});
test('redirects, invalid metadata, metadata limits, cancellation and byte budgets remain explicit',async t=>{
 const f=await fixture(t),external=path.join(f.home,'external');await fs.writeFile(external,'secret');await fs.symlink(external,path.join(f.root,'redirect.json'));
 await fs.writeFile(path.join(f.root,'bad.json'),'{');await fs.writeFile(path.join(f.root,'large.json'),' '.repeat(2048));
 const r=await f.api.inspect({limits:{jsonBytes:1024}});assert.equal(r.status,'partial');assert.ok(r.findings.some(x=>x.state==='unsupported'));assert.ok(r.findings.some(x=>x.kind==='json'&&x.state==='failure'));
 const c=new AbortController();c.abort();assert.equal((await f.api.inspect({signal:c.signal})).status,'cancelled');
 assert.equal((await f.api.inspect({limits:{bytes:10}})).status,'resource-limit');assert.equal(await fs.readFile(external,'utf8'),'secret');
});
test('positive rechecks report stable finding identities and usage is a separate supplied interface',async t=>{
 const f=await fixture(t),target=path.join(f.root,'source-'+digest('valid')+'.bin');await fs.writeFile(target,'wrong');const first=await f.api.inspect();const id=first.findings.find(x=>x.kind==='digest').id;
 await fs.writeFile(target,'valid');const second=await f.api.inspect();assert.ok(second.verified.includes(id));
 const api=createInspection({usage:async opts=>({status:'partial',from:opts.from,coverage:'history only'})});assert.equal((await api.featureUse({from:'x'})).from,'x');assert.equal((await f.api.featureUse()).status,'unsupported');
});
test('generation changes are inconclusive and cannot resolve earlier findings',async t=>{
 const f=await fixture(t),file=path.join(f.root,'HEAD.json'),head={version:1,generation:'11111111-1111-1111-1111-111111111111',files:{}};await fs.writeFile(file,JSON.stringify(head));let opens=0;
 const io={...fs,open:async(p,...args)=>{if(p===file&&++opens===2)await fs.writeFile(file,JSON.stringify({...head,generation:'22222222-2222-2222-2222-222222222222'}));return fs.open(p,...args);}};
 const r=await createInspection({storageRoots:[f.root],io}).inspect();assert.equal(r.status,'partial');assert.equal(r.roots[0].status,'changed-during-inspection');assert.deepEqual(r.verified,[]);
});
test('large owned files stay under an explicit streaming I/O budget',async t=>{
 const f=await fixture(t),chunk=Buffer.alloc(512*1024,65);for(let i=0;i<12;i++)await fs.writeFile(path.join(f.root,String(i)+'.bin'),chunk);
 const before=process.memoryUsage().heapUsed,r=await f.api.inspect({limits:{bytes:1024*1024}});assert.equal(r.status,'resource-limit');assert.ok(r.resources.bytes<=1024*1024);assert.ok(process.memoryUsage().heapUsed-before<32*1024*1024);
});
test('retained source references are checked without opening external originals',async t=>{
 const f=await fixture(t),key=digest('source'),file=path.join(f.root,'outline.json');await fs.writeFile(file,JSON.stringify({schema:'mrw.source-outline',source:{revision:key,path:'/outside/original.md'}}));const r=await f.api.inspect();assert.ok(r.findings.some(x=>x.kind==='source-reference'&&x.state==='failure'));
 await fs.writeFile(path.join(f.root,'source-'+key+'.bin'),'source');const next=await f.api.inspect();assert.equal(next.findings.filter(x=>x.kind==='source-reference').length,0);assert.ok(next.verified.includes(r.findings.find(x=>x.kind==='source-reference').id));
});

test('nested managed manifests resolve against their own store and duplicate roots do not duplicate counts',async t=>{
 const f=await fixture(t),store=path.join(f.root,'managed'),generation='11111111-1111-1111-1111-111111111111',payload=path.join(store,'versions',generation,'payload');await fs.mkdir(payload,{recursive:true});await fs.writeFile(path.join(payload,'one.bin'),'payload');await fs.writeFile(path.join(store,'HEAD.json'),JSON.stringify({version:1,generation,files:{'one.bin':{sha256:digest('payload'),size:7}}}));
 const api=createInspection({storageRoots:[f.root,f.root]}),r=await api.inspect();assert.equal(r.roots.length,1);assert.equal(r.status,'completed-supported-checks');assert.equal(r.findings.length,0);
});

test('core-owned binding inspection verifies external saved-work identity without calling a mutating bridge',async t=>{const f=await fixture(t),bound=path.join(f.home,'bound');await fs.mkdir(bound);await fs.mkdir(path.join(f.root,'artifact-runtime'));const identity=JSON.stringify({id:'11111111-1111-1111-1111-111111111111'});await fs.writeFile(path.join(bound,'store.json'),identity);const digest=require('node:crypto').createHash('sha256').update(identity).digest('hex');await fs.writeFile(path.join(f.root,'artifact-runtime','active-store.json'),JSON.stringify({version:1,location:bound,store_id:'11111111-1111-1111-1111-111111111111',identity_hash:digest}));const controller=require('../src/artifactStorage').createArtifactStorage({vscode:{},context:{storageUri:{scheme:'file',fsPath:f.root}},rawBridge:()=>{throw Error('Inspection must not call control/sync');}});assert.equal((await controller.inspectionRoots()).length,2);await fs.writeFile(path.join(bound,'store.json'),'{}');await assert.rejects(controller.inspectionRoots(),/identity differs/);});
