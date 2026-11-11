'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const {StudyHistory,hash}=require('../src/studyHistory');
const {SharedHistory}=require('../src/sharedHistory');
const {canonical,portable}=require('../src/historyRecords');
const {usageReport}=require('../src/historyUsage');
const STUDY='a'.repeat(64),OTHER='b'.repeat(64),software={version:'fixture',commit:'fixture',localChanges:true};
async function fixture(t,options={}){
  const home=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-shared-')),recorders=[];
  t.after(async()=>{for(const h of recorders)await h.close();await fs.rm(home,{recursive:true,force:true});});
  const recorder=async(name,opts={})=>{const h=new StudyHistory(path.join(home,name,'private'),software,{origin:'automated_test',sharing:{installation:path.join(home,name,'installation'),...options,...opts}});recorders.push(h);await h.init();return h;};
  const data=path.join(home,'data');await fs.mkdir(data);
  return {home,data,recorder};
}
async function publish(h,data,study=STUDY,text='A retained answer.'){
  h.setContext({study});const snapshot=h.snapshot({answer:text});const event=h.record('attempt.submit',{snapshot,attempt:randomUUID()});
  await h.importHistory(data);return {snapshot,event};
}
async function sharedFiles(data){
  const rows=[];for(const w of await fs.readdir(path.join(data,'History','Writers')))for(const n of await fs.readdir(path.join(data,'History','Writers',w)))if(n.endsWith('.json'))rows.push(path.join(data,'History','Writers',w,n));return rows;
}
async function syncCopies(from,to){
  for(const dir of ['Writers','Deleted'])await fs.cp(path.join(from,'History',dir),path.join(to,'History',dir),{recursive:true});
}
test('two offline writers synchronize immutable batches, preserve attribution and discover late arrivals without restart',async t=>{
  const f=await fixture(t),a=await f.recorder('a'),b=await f.recorder('b');
  const first=await publish(a,f.data),secondDirectory=path.join(f.home,'other-data');await fs.cp(f.data,secondDirectory,{recursive:true});
  const second=await publish(b,secondDirectory,OTHER,'Second writer answer.');assert.notEqual(a.shared.writer,b.shared.writer);
  assert.equal((await a.events()).some(e=>e.id===second.event.id),false);
  await syncCopies(secondDirectory,f.data);await syncCopies(f.data,secondDirectory);
  for(const h of [a,b]){const events=await h.events();assert.equal(events.filter(e=>e.id===first.event.id).length,1);assert.equal(events.filter(e=>e.id===second.event.id).length,1);assert.equal(h.historyStatus.writers.length,2);}
  a.record('navigation.source',{reference:'stacks:0CY1'});await a.flush();await a.syncShared();await syncCopies(f.data,secondDirectory);
  assert.ok((await b.events()).some(e=>e.action==='navigation.source'));
  const copies=await b.exportSnapshots(await b.events());assert.equal(copies[first.snapshot].value.answer,'A retained answer.');
});
test('repeated import preserves IDs, versions, exact private snapshots, fixture origin and portable reference links',async t=>{
  const f=await fixture(t),h=await f.recorder('a');h.setContext({study:STUDY,sources:[{reference:'file:///mnt/c/Users/test/notes/a.md#p',source_revision:'exact'}]});
  const original={answer:'Mathematical prose remains.',references:['file:///mnt/c/Users/test/notes/a.md#p']},snapshot=h.snapshot(original);
  const event=h.record('attempt.submit',{snapshot});await h.importHistory(f.data);const files=await sharedFiles(f.data),before=(await h.events()).length;
  await h.importHistory(f.data);assert.equal((await h.events()).length,before);assert.deepEqual(await sharedFiles(f.data),files);
  const row=(await h.events()).find(e=>e.id===event.id);assert.equal(row.origin,'automated_test');assert.deepEqual(row.software,software);assert.equal(row.data.snapshot,snapshot);
  assert.equal(row.identity.sources[0].reference,portable(original.references[0]));
  assert.equal(await h.snapshotText(snapshot),JSON.stringify(original));
  const exported=await h.exportSnapshots([row]);assert.equal(exported[snapshot].representation,'portable-v1');assert.equal(exported[snapshot].value.answer,original.answer);
  for(const file of files)assert.doesNotMatch(await fs.readFile(file,'utf8'),/\/mnt\/|Users\/test/);
});
test('conflicting event copies are excluded independent of file name, arrival order or clocks',async t=>{
  const f=await fixture(t),h=await f.recorder('a'),{event}=await publish(h,f.data);
  const original=(await sharedFiles(f.data)).find(async()=>true);let target,batch;
  for(const file of await sharedFiles(f.data)){const b=JSON.parse(await fs.readFile(file));if(b.events.some(e=>e.id===event.id)){target=file;batch=b;}}
  await fs.copyFile(target,path.join(path.dirname(target),'synchronized-duplicate.json'));
  assert.equal((await h.events()).filter(e=>e.id===event.id).length,1);
  batch.events.find(e=>e.id===event.id).data.attempt='different';await fs.writeFile(path.join(path.dirname(target),'syncthing-conflict.json'),JSON.stringify(batch));
  assert.equal((await h.events()).some(e=>e.id===event.id),false);assert.ok(h.historyStatus.conflicts.includes(event.id));assert.match(h.report(await h.events()),/Conflicting event excluded/);
  assert.ok(original);
});
test('within-session sequence and explicit invocation links survive reversed timestamps and out-of-order batches',async t=>{
  const f=await fixture(t),h=await f.recorder('a');
  const start=h.record('operation.start',{operation:'mrw.fixture'});start.at='2030-01-01T00:00:00Z';
  const end=h.record('operation.complete',{operation:'mrw.fixture',invocation:start.id,duration_ms:12});end.at='2020-01-01T00:00:00Z';
  await h.importHistory(f.data);const rows=await h.events();assert.ok(rows.findIndex(e=>e.id===start.id)<rows.findIndex(e=>e.id===end.id));
  const report=usageReport(rows,h.historyStatus);assert.doesNotMatch(report,/Missing or ambiguous invocation links/);assert.match(report,/12.0/);
});
test('missing snapshots and event links remain explicit; a failed import never activates the binding',async t=>{
  const f=await fixture(t),h=await f.recorder('a');h.setContext({study:STUDY});h.record('attempt.submit',{snapshot:'f'.repeat(64)});
  await assert.rejects(h.importHistory(f.data),/snapshots are missing/);assert.equal(h.shared.binding,undefined);
  const local=await h.readEvents();assert.ok(local.some(e=>e.data.snapshot));
  // A foreign complete batch may arrive before its referenced snapshot.
  const remote=new SharedHistory(path.join(f.home,'reader'),path.join(f.home,'installation'));await remote.init();
  const header=JSON.parse(await fs.readFile(path.join(f.data,'History','format.json')));remote.binding={schema:1,directory:f.data,collection:header.collection};
  const writer=path.join(f.data,'History','Writers',h.shared.writer);await fs.mkdir(writer);
  const b=(await h.shared.batches(local,id=>h.snapshotText(id)))[1];assert.ok(b.missing.length);
  await fs.writeFile(path.join(writer,'arrived.json'),JSON.stringify(b));const result=await remote.sync();assert.ok(result.missing.includes('f'.repeat(64)));
});
test('unavailable directory retains a bounded durable queue and restart retry publishes each event once',async t=>{
  const f=await fixture(t,{maxPending:2}),h=await f.recorder('a');await h.importHistory(f.data);
  const offline=f.data+'-offline';await fs.rename(f.data,offline);h.setContext({study:STUDY});const event=h.record('navigation.source',{reference:'stacks:0CY1'});await h.flush();
  assert.equal((await h.syncShared()).unavailable,true);assert.equal(h.gap,'');assert.ok((await h.shared.pending()).length);
  // Simulate process restart from the durable private/outbox files without a sync service.
  const recovered=new SharedHistory(h.shared.local,h.shared.installation,{maxPending:2});await recovered.init();assert.equal(recovered.writer,h.shared.writer);
  await fs.rename(offline,f.data);const result=await recovered.sync();assert.equal(result.events.filter(e=>e.id===event.id).length,1);assert.equal((await recovered.pending()).length,0);
  assert.equal((await recovered.sync()).events.filter(e=>e.id===event.id).length,1);
});
test('queue overflow records a durable gap, retains originals and explicit reimport repairs it',async t=>{
  const f=await fixture(t,{maxPending:1}),h=await f.recorder('a');await h.importHistory(f.data);await fs.rename(f.data,f.data+'-offline');
  h.setContext({study:STUDY});h.record('one');await h.flush();const second=h.record('two');await h.flush();
  assert.equal((await h.shared.pending()).length,1);assert.match(await fs.readFile(path.join(h.shared.local,'gap.json'),'utf8'),/queue limit/);
  await fs.rename(f.data+'-offline',f.data);await h.syncShared();assert.ok(h.shared.status.gaps.length);assert.ok((await h.readEvents()).some(e=>e.id===second.id));
  await h.importHistory(f.data);assert.deepEqual(h.shared.status.gaps,[]);assert.ok((await h.events()).some(e=>e.id===second.id));
});
test('interrupted immutable publication exposes no partial batch and retries after restart',async t=>{
  let fail=false;const io={...fs,link:async(from,to)=>{if(fail&&String(to).includes('/Writers/'))throw Object.assign(Error('injected interruption'),{code:'EIO'});return fs.link(from,to);}};
  const f=await fixture(t,{io}),h=await f.recorder('a');await h.importHistory(f.data);fail=true;h.setContext({study:STUDY});const event=h.record('late');await h.flush();
  assert.equal((await h.syncShared()).unavailable,true);assert.ok((await h.shared.pending()).length);
  for(const file of await sharedFiles(f.data))assert.ok(!JSON.parse(await fs.readFile(file)).events.some(e=>e.id===event.id));
  fail=false;const result=await h.syncShared();assert.equal(result.events.filter(e=>e.id===event.id).length,1);
});
test('deletion survives restart and rejects an offline writer’s late batches while preserving other studies and shared snapshots',async t=>{
  const f=await fixture(t),a=await f.recorder('a'),b=await f.recorder('b'),saved=await publish(a,f.data);
  a.setContext({study:OTHER});a.record('other',{snapshot:saved.snapshot});await a.flush();await a.syncShared();
  const offline=path.join(f.home,'offline');await fs.cp(f.data,offline,{recursive:true});await b.importHistory(offline);
  b.setContext({study:STUDY});const secret=b.snapshot({answer:'Late deleted content'});const late=b.record('late',{snapshot:secret});await b.flush();await b.syncShared();
  await a.eraseStudy(STUDY,new Set([saved.snapshot]),new Set([saved.snapshot]));
  await syncCopies(offline,f.data);const events=await a.events();assert.ok(!events.some(e=>e.identity.study===STUDY));
  for(const file of await sharedFiles(f.data))assert.doesNotMatch(await fs.readFile(file,'utf8'),/Late deleted content/);
  assert.equal((await a.exportSnapshots(events))[saved.snapshot].value.answer,'A retained answer.');
  const recovered=new SharedHistory(a.shared.local,a.shared.installation);await recovered.init();assert.ok(recovered.deleted.has(STUDY));
  await syncCopies(f.data,offline);assert.ok(!(await b.events()).some(e=>e.id===late.id));
  assert.ok((await a.events()).some(e=>e.action==='other'));
});
test('failed shared deletion publication keeps durable intent; retry purges accessible late content',async t=>{
  const f=await fixture(t),h=await f.recorder('a');await publish(h,f.data);await fs.rename(f.data,f.data+'-offline');
  await h.eraseStudy(STUDY,new Set(),new Set());assert.ok(h.shared.deleted.has(STUDY));assert.equal((await h.events()).some(e=>e.identity.study===STUDY),false);
  await fs.rename(f.data+'-offline',f.data);await h.syncShared();assert.equal((await h.events()).some(e=>e.identity.study===STUDY),false);
  assert.ok((await fs.readdir(path.join(f.data,'History','Deleted'))).includes(STUDY+'.json'));
});
for(const relationship of ['separate','vault-subdirectory','vault-root'])test('directory ownership: '+relationship,async t=>{
  const f=await fixture(t),h=await f.recorder('a'),vault=path.join(f.home,'vault');await fs.mkdir(vault);await fs.writeFile(path.join(vault,'ordinary.md'),'Unrelated note.');
  const data=relationship==='separate'?f.data:relationship==='vault-root'?vault:path.join(vault,'MRW');if(relationship==='vault-subdirectory')await fs.mkdir(data);
  await publish(h,data);await h.eraseStudy(STUDY,new Set(),new Set());assert.equal(await fs.readFile(path.join(vault,'ordinary.md'),'utf8'),'Unrelated note.');
  const names=await fs.readdir(data);assert.deepEqual(names.sort(),(relationship==='vault-root'?['History','ordinary.md']:['History']).sort());
});
test('occupied History directories and symlink escape are rejected without changing unrelated files',async t=>{
  const f=await fixture(t),h=await f.recorder('a');await fs.mkdir(path.join(f.data,'History'));await fs.writeFile(path.join(f.data,'History','note.md'),'Not owned by MRW.');
  await assert.rejects(h.importHistory(f.data),/occupied/);assert.equal(await fs.readFile(path.join(f.data,'History','note.md'),'utf8'),'Not owned by MRW.');
  const dir=path.join(f.home,'different');await fs.mkdir(dir);await fs.symlink(path.join(f.data,'History'),path.join(dir,'History'));
  await assert.rejects(h.importHistory(dir),/ordinary directory/);assert.equal(h.shared.binding,undefined);
});
test('usage operations link outcomes, keep prompt text out of counts and distinguish unused/unavailable/uninstrumented',async t=>{
  const f=await fixture(t),h=await f.recorder('a');
  h.record('usage.coverage',{features:[{id:'available',status:'available'},{id:'missing-tool',status:'unavailable'},{id:'typing',status:'uninstrumented'}]});
  await h.operations.run('complete',async()=> 'Private returned prose');
  await h.operations.run('cancel',async()=>{h.operations.cancel();});
  await assert.rejects(h.operations.run('fail',async()=>{throw Error('Private error contains /home/user/note');}));
  const rows=await h.events(),report=h.report(rows);assert.match(report,/unused in represented period/);assert.match(report,/unavailable/);assert.match(report,/uninstrumented/);
  const ops=rows.filter(e=>e.action.startsWith('operation.'));assert.equal(ops.length,6);assert.ok(ops.every(e=>!JSON.stringify(e).includes('Private')));
  assert.ok(ops.filter(e=>e.action!=='operation.start').every(e=>ops.some(s=>s.id===e.data.invocation)));
  h.usageRecording=false;await h.operations.run('disabled',async()=>{});assert.ok(!(await h.events()).some(e=>e.data.operation==='disabled'));
});
test('portable references preserve mathematical text and transitive snapshot links',async t=>{
  const f=await fixture(t),h=await f.recorder('a');h.setContext({study:STUDY});
  const text=String.raw`The map $f:\to X$ and the expression /x remain verbatim.`;
  const child=h.snapshot({text}),parent=h.snapshot({text:'Commentary',original:{snapshot:child}});h.record('help.retained',{snapshot:parent});
  await h.importHistory(f.data);const exported=await h.exportSnapshots(await h.events());assert.equal(exported[child].value.text,text);
  assert.equal(exported[parent].value.original.snapshot,child);
});
test('a crash after private commit but before staging is recovered before a later sequence can hide it',async t=>{
  const f=await fixture(t),h=await f.recorder('a');await h.importHistory(f.data);h.setContext({study:STUDY});
  const stage=h.shared.stage.bind(h.shared);let fail=true;h.shared.stage=async(...args)=>{if(fail)throw Error('outbox interruption');return stage(...args);};
  const earlier=h.record('earlier');await h.flush();assert.ok((await h.readEvents()).some(e=>e.id===earlier.id));
  fail=false;const later=h.record('later');await h.flush();const shared=await h.syncShared();
  assert.ok(shared.events.some(e=>e.id===earlier.id));assert.ok(shared.events.some(e=>e.id===later.id));
});
test('changing or disconnecting a binding cannot abandon an undelivered deletion',async t=>{
  const f=await fixture(t),h=await f.recorder('a');await publish(h,f.data);await fs.rename(f.data,f.data+'-offline');
  await h.eraseStudy(STUDY,new Set(),new Set());const alternative=path.join(f.home,'alternative');await fs.mkdir(alternative);
  await assert.rejects(h.shared.disconnect());await assert.rejects(h.importHistory(alternative));assert.equal(h.shared.binding.directory,f.data);
  await fs.rename(f.data+'-offline',f.data);await h.syncShared();await h.shared.disconnect();assert.equal(h.shared.binding,undefined);
});
test('an unavailable batch with a different payload cannot replace a verified binding during import',async t=>{
  const f=await fixture(t),h=await f.recorder('a');const {event}=await publish(h,f.data);
  const other=path.join(f.home,'other');await fs.cp(f.data,other,{recursive:true});
  for(const file of await sharedFiles(other)){
    const b=JSON.parse(await fs.readFile(file));if(!b.events.some(e=>e.id===event.id))continue;
    b.events.find(e=>e.id===event.id).data.attempt='conflict';await fs.writeFile(path.join(path.dirname(file),'conflicting-copy.json'),JSON.stringify(b));
  }
  await assert.rejects(h.importHistory(other),/conflicting events/);assert.equal(h.shared.binding.directory,f.data);
});
test('history configuration cancellation writes no binding; explicit import preserves unrelated notes',async t=>{
  const f=await fixture(t),h=await f.recorder('a'),commands=new Map(),updates=[];let confirm=false;
  await fs.writeFile(path.join(f.data,'note.md'),'Untouched');
  const vscode={ConfigurationTarget:{Global:1},Uri:{file:fsPath=>({fsPath,scheme:'file'})},workspace:{getConfiguration:()=>({get:(_key,fallback)=>fallback,update:async(...args)=>updates.push(args)})},window:{
    showQuickPick:async rows=>rows[0],showOpenDialog:async()=>[{fsPath:f.data,scheme:'file'}],showWarningMessage:async()=>confirm?'Import and Connect':undefined,showInformationMessage:async()=>{},
  }};
  require('../src/historyCommands').registerHistory({vscode,context:{subscriptions:[]},register:(name,fn)=>commands.set(name,fn),recorder:h});
  await commands.get('mrw.configureHistory')();assert.equal(h.shared.binding,undefined);assert.equal(updates.length,0);
  confirm=true;await commands.get('mrw.configureHistory')();assert.equal(h.shared.binding.directory,f.data);assert.equal(updates[0][0],'dataDirectory');
  assert.equal(await fs.readFile(path.join(f.data,'note.md'),'utf8'),'Untouched');
});
test('conflicting reader effort responses are not resolved by unsynchronized clocks',async t=>{
  const f=await fixture(t),h=await f.recorder('a');h.setContext({study:STUDY,attempt:'one'});
  h.record('attempt.begin',{attempt:'one'});const offer=h.record('effort.offer',{attempt:'one'});
  const a=h.record('effort.response',{attempt:'one',offer:offer.id,rating:2,disposition:'answered'},'reader_report');
  const b=h.record('effort.response',{attempt:'one',offer:offer.id,rating:8,disposition:'answered'},'reader_report');a.at='2040-01-01T00:00:00Z';b.at='2020-01-01T00:00:00Z';
  const projection=require('../src/studyEvidence').projectEffort(await h.events());assert.equal(projection.offers[0].supported,false);assert.match(projection.missing[0].reason,/Conflicting/);
});
test('several ordinary submitted snapshots split into complete bounded batches instead of blocking import',async t=>{
  const f=await fixture(t),h=await f.recorder('a');h.setContext({study:STUDY});
  for(let i=0;i<40;i++)h.record('attempt.submit',{snapshot:h.snapshot({answer:String(i)+'x'.repeat(60*1024)})});
  await h.importHistory(f.data);const events=await h.events();assert.equal(events.filter(e=>e.action==='attempt.submit').length,40);
  for(const file of await sharedFiles(f.data))assert.ok((await fs.stat(file)).size<=2*1024*1024);
});
test('coverage belongs to the workspace even if the first action selects a study before initialization finishes',async t=>{
  const f=await fixture(t),h=new StudyHistory(path.join(f.home,'late'),software);t.after(()=>h.close());
  h.setContext({study:STUDY});h.coverage=[{id:'mrw.fixture',status:'available'}];await h.init();await h.flush();
  await h.eraseStudy(STUDY,new Set(),new Set());assert.ok((await h.events()).some(e=>e.action==='usage.coverage'));
});
test('deletion removes interrupted staging, including late copies, and preserves unrelated staging and notes',async t=>{
  const f=await fixture(t),h=await f.recorder('a');await publish(h,f.data);
  const writer=path.join(f.data,'History','Writers',h.shared.writer),pending=path.join(h.shared.local,'pending');
  const name='.mrw-'+STUDY+'-'+randomUUID()+'.pending',other='.mrw-'+OTHER+'-'+randomUUID()+'.pending';
  for(const dir of [writer,pending]){await fs.writeFile(path.join(dir,name),'{"format":"mrw-history-batch","partial":');await fs.writeFile(path.join(dir,other),'Other study staging');await fs.writeFile(path.join(dir,'unrecognized.pending'),'Preserve');}
  await h.eraseStudy(STUDY,new Set(),new Set());
  for(const dir of [writer,pending]){await assert.rejects(fs.stat(path.join(dir,name)),{code:'ENOENT'});assert.equal(await fs.readFile(path.join(dir,other),'utf8'),'Other study staging');assert.equal(await fs.readFile(path.join(dir,'unrecognized.pending'),'utf8'),'Preserve');}
  await fs.writeFile(path.join(writer,name),'{"format":"mrw-history-batch","partial":');await h.events();await assert.rejects(fs.stat(path.join(writer,name)),{code:'ENOENT'});
});
