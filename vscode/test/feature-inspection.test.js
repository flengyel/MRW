'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),crypto=require('node:crypto');
const {featureUse}=require('../src/featureInspection');const {UsageOperations}=require('../src/historyUsage');
async function fixture(t){const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-feature-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));return {directory,pending:[],software:{version:'fixture'},context:{},record(action,data,evidence,identity){const e={schema:1,id:crypto.randomUUID(),session:'11111111-1111-1111-1111-111111111111',sequence:this.pending.length+1,at:new Date().toISOString(),origin:'production',software:this.software,identity:identity||{},action,data};this.pending.push(e);return e;}};}
test('one user invocation correlates nested calls; tests and scheduled operations are excluded',async t=>{
 const f=await fixture(t),ops=new UsageOperations(f);await ops.run('mrw.openOutline',()=>ops.run('bridge.outline_load',async()=>42));
 f.record('usage.coverage',{features:[{id:'unused',status:'available'},{id:'missing',status:'unavailable'},{id:'typing',status:'uninstrumented'}]});
 f.record('operation.start',{operation:'scheduled',actor:'scheduled'});const synthetic=f.record('operation.start',{operation:'test'});synthetic.origin='automated_test';
 const r=await featureUse(f);assert.equal(r.features.find(x=>x.id==='mrw.openOutline').invocations,1);assert.equal(r.byVersion[0].invocations,1);assert.equal(r.features.find(x=>x.id==='mrw.openOutline').outcomes.complete,1);assert.equal(r.features.some(x=>x.id==='bridge.outline_load'||x.id==='test'||x.id==='scheduled'),false);
 assert.equal(r.features.find(x=>x.id==='unused').status,'unknown-or-partial');assert.equal(r.features.find(x=>x.id==='missing').status,'unavailable');assert.equal(r.features.find(x=>x.id==='typing').status,'uninstrumented');
});
test('bounded local inspection never calls synchronization and reports interruption, conflicts and limits',async t=>{
 const f=await fixture(t);f.syncShared=()=>{throw Error('Must not synchronize');};f.events=()=>{throw Error('Must not load all history');};
 const one=f.record('operation.start',{operation:'mrw.moveWorkspace'});await fs.writeFile(path.join(f.directory,'11111111-1-2.json'),JSON.stringify([one,{...one,data:{operation:'other'}}]));f.pending=[];
 let r=await featureUse(f);assert.equal(r.conflicts.length,1);assert.equal(r.complete,false);assert.equal(r.features.length,0);
 const controller=new AbortController();controller.abort();r=await featureUse(f,{signal:controller.signal});assert.equal(r.complete,false);assert.ok(r.gaps.includes('Cancelled'));
});
test('large bounded history reports byte budget and leaves payload files unchanged',async t=>{
 const f=await fixture(t);for(let i=0;i<4000;i++)f.record('operation.start',{operation:'mrw.openOutline'});const file=path.join(f.directory,'11111111-1-4000.json'),raw=JSON.stringify(f.pending);await fs.writeFile(file,raw);f.pending=[];
 const r=await featureUse(f,{limits:{bytes:4096}});assert.equal(r.complete,false);assert.equal(r.observed.events,0);assert.equal(await fs.readFile(file,'utf8'),raw);
});

test('invalid coverage and mismatched outcomes cannot imply successful use',async t=>{const f=await fixture(t);const e=f.record('operation.start',{operation:'mrw.openDocument'});f.record('operation.complete',{operation:'mrw.deleteStudy',invocation:e.id,duration_ms:-100});f.record('usage.coverage',{features:{id:'bad'}});const r=await featureUse(f);assert.equal(r.complete,false);const g=r.features.find(x=>x.id==='mrw.openDocument');assert.equal(g.outcomes['pending-or-unobserved'],1);assert.equal(g.durationSamples,0);assert.ok(r.gaps.includes('Invalid coverage inventory'));});
