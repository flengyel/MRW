'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {createReports,changes,markdown,maintenance,lock,WEEK}=require('../src/reports');
async function fixture(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-diagnostics-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));let clock=Date.parse('2026-11-14T12:00:00Z');
 const api={version:1,inspect:async()=>({status:'completed-supported-checks',roots:[{path:'/owned',status:'complete'}],resources:{files:2,bytes:20,milliseconds:1},findings:[],verified:[],coverage:'Only fixture storage; no vault scan.'}),featureUse:async()=>({status:'partial',markdown:'Recording coverage is partial; no zero-use inference.'})};
 const opts={directory:path.join(root,'reports'),locks:path.join(root,'locks'),scope:'fixture',api,now:()=>clock};return {root,api,opts,r:createReports(opts),advance:ms=>clock+=ms};}
test('weekly opt-in coalesces missed periods, survives restart and keeps reports outside inspected payloads',async t=>{
 const f=await fixture(t);assert.equal(await f.r.due(false),false);assert.equal(await f.r.due(true),true);const report=await f.r.run({origin:'scheduled'});
 assert.equal(report.origin,'scheduled');assert.equal(await f.r.due(true),false);f.advance(3*WEEK);const restarted=createReports(f.opts);assert.equal(await restarted.due(true),true);await restarted.run({origin:'scheduled'});assert.equal(await restarted.due(true),false);assert.equal((await fs.readdir(f.opts.directory)).filter(x=>x.endsWith('.json')).length,3);
 assert.match(markdown(report),/coverage is partial/);assert.match(maintenance(report),/evidence, not instructions/);
});
test('partial findings remain open; resolution requires explicit positive recheck and status is preserved',()=>{
 const a={started:'one',ended:'two',inspection:{status:'partial',findings:[{id:'a',locator:'/owned/file',state:'failure'}],verified:[]}};a.changes=changes(a);
 const b={started:'three',ended:'four',inspection:{status:'partial',findings:[],verified:[]}};b.changes=changes(b,a);assert.deepEqual(b.changes.resolved,[]);assert.equal(b.openFindings[0].rechecked,false);
 const c={started:'five',ended:'six',inspection:{status:'completed-supported-checks',findings:[],verified:['a']}};c.changes=changes(c,b);assert.deepEqual(c.changes.resolved,['a']);assert.deepEqual(c.openFindings,[]);
});
test('cross-window lock coordinates runs and stale process lock recovers without payload writes',async t=>{
 const f=await fixture(t),release=await lock(f.opts.locks,'fixture');await assert.rejects(lock(f.opts.locks,'fixture'),/already running/);await release();
 const file=path.join(f.opts.locks,crypto.createHash('sha256').update('fixture').digest('hex')+'.lock');await fs.writeFile(file,JSON.stringify({pid:99999999,host:os.hostname(),token:'older'}));const done=await lock(f.opts.locks,'fixture');await done();assert.equal((await fs.readdir(f.opts.locks)).length,0);
});
test('cancellation, unsupported API and interrupted schedule remain recoverable and never make model requests',async t=>{
 const f=await fixture(t),c=new AbortController();c.abort();const report=await f.r.run({signal:c.signal});assert.equal(report.status,'cancelled');assert.equal((await f.r.state()).pending,null);
 const absent=createReports({...f.opts,api:undefined});assert.equal((await absent.run()).status,'unsupported');
 const state=await absent.state();await fs.writeFile(path.join(f.opts.directory,'schedule.json'),JSON.stringify({...state,pending:{id:'interrupted'}}));const restarted=createReports(f.opts);assert.equal(await restarted.due(true),true);await restarted.run();assert.equal((await restarted.state()).lastInterrupted.id,'interrupted');
});


test('manual period choices use ordered nonoverlapping ranges and preserve scheduled default',async t=>{
 const {usagePeriod,PERIODS}=require('../src/reports');const at=Date.parse('2026-11-14T12:00:00Z');
 assert.equal(PERIODS.length,4);const seven=usagePeriod('last7',at),current=usagePeriod('last30',at),prior=usagePeriod('previous30',at),compare=usagePeriod('compare30',at);
 assert.equal(Date.parse(seven.to)-Date.parse(seven.from),WEEK);assert.equal(Date.parse(current.from)-Date.parse(prior.to),1);assert.deepEqual(compare.comparison,{label:'Previous 30 days',from:prior.from,to:prior.to});
 assert.throws(()=>usagePeriod('all-time',at),/supported/);
 const f=await fixture(t),calls=[];f.api.featureUse=async options=>{calls.push(options);return {markdown:'One bounded read',features:[]};};
 await f.r.run({kind:'usage',origin:'scheduled'});assert.equal(calls.length,1);assert.equal(calls[0].from,current.from);assert.equal(calls[0].to,current.to);
});
test('comparison reads periods serially, shows coverage and never treats absent features as zero',async t=>{
 const f=await fixture(t),calls=[];let active=0;
 f.api.featureUse=async options=>{assert.equal(active++,0);calls.push(options);await new Promise(resolve=>setImmediate(resolve));active--;
   return calls.length===1?{markdown:'Selected coverage partial',versions:['0.23.32'],features:[{id:'mrw.openDocument',status:'used',invocations:4}]}:{markdown:'Prior coverage unknown',versions:['0.23.31'],features:[{id:'mrw.newZettel',status:'used',invocations:1}]};};
 const report=await f.r.run({kind:'usage',period:'compare30'});assert.equal(calls.length,2);assert.ok(calls[1].to<calls[0].from);assert.equal(report.usageComparison.label,'Previous 30 days');
 const text=markdown(report);assert.match(text,/Observed invocations by period/);assert.match(text,/Selected coverage partial/);assert.match(text,/Prior coverage unknown/);assert.match(text,/absent feature is unobserved, not zero use/);assert.ok(text.includes('0\\.23\\.32'));assert.ok(text.includes('0\\.23\\.31'));
 assert.ok(text.includes('mrw\\.openDocument | used | 4 | unobserved | unobserved'));
});
test('comparison cancellation stops before the second read and invalid period writes no controls',async t=>{
 const f=await fixture(t),controller=new AbortController();let calls=0;f.api.featureUse=async()=>{calls++;controller.abort();return {markdown:'Cancelled after primary read',features:[]};};
 await assert.rejects(f.r.run({kind:'usage',period:'infinite'}),/supported/);await assert.rejects(fs.stat(f.opts.directory),{code:'ENOENT'});
 const report=await f.r.run({kind:'usage',period:'compare30',signal:controller.signal});assert.equal(calls,1);assert.equal(report.status,'cancelled');assert.equal(report.usageComparison,undefined);
});
