'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {activityReport,LIMIT}=require('../src/historyActivity');
const {StudyHistory}=require('../src/studyHistory');
const {mergeEvents}=require('../src/historyRecords');
const session=randomUUID();let sequence=0;
function event(action,data={},extra={}){return {schema:1,id:randomUUID(),session,sequence:++sequence,at:'2026-11-15T12:00:00Z',origin:'production',software:{version:'0.23.38',commit:'fixture'},identity:{},action,data,...extra};}
function operation(name,extra={}){const begin=event('operation.start',{operation:name,...extra}),end=event('operation.complete',{operation:name,invocation:begin.id,duration_ms:10});return [begin,end];}
test('startup-only sessions stay compact while detailed coverage remains available',()=>{
 const rows=Array.from({length:150},()=>event('usage.coverage',{features:[{id:'fixture-available',status:'available'}]}));rows.push(event('session.start'),event('usage.recording',{enabled:true}));
 const before=structuredClone(rows),text=activityReport(rows);assert.ok(text.length<1800);assert.match(text,/No recorded command or study activity/);assert.doesNotMatch(text,/fixture-available|Local study comparison|Effort:|Attempts:/);assert.deepEqual(rows,before);
 const owner=new StudyHistory('/not-read',{version:'fixture'});assert.match(owner.report(rows),/fixture-available/);assert.match(owner.report(rows),/Local study comparison/);assert.match(owner.activity(rows),/152 startup\/availability/);
});
test('commands show linked outcomes without nested bridge calls or raw prompt data',()=>{
 const root=operation('mrw.openDocument'),child=operation('bridge.outline_load',{parent:root[0].id}),rows=[...root,...child,event('usage.coverage',{features:[]})];
 root[0].data.prompt='PRIVATE PROMPT';const text=activityReport(rows);assert.match(text,/Open Document.*handler completed/);assert.doesNotMatch(text,/bridge.outline_load|PRIVATE PROMPT|duration_ms/);assert.match(text,/1 of 1 activity entries/);
});
test('missing, inconsistent and duplicated endings never become a successful completion',()=>{
 const start=event('operation.start',{operation:'mrw.openDocument'});assert.match(activityReport([start]),/completion not recorded/);
 const end=event('operation.complete',{operation:'mrw.openDocument',invocation:start.id},{session:randomUUID()});const mixed=activityReport([start,end]);assert.match(mixed,/outcome ambiguous/);assert.match(mixed,/invocation link unavailable/);assert.doesNotMatch(mixed,/handler completed/);
 const pair=operation('mrw.openDocument');assert.match(activityReport([...pair,event('operation.error',{operation:'mrw.openDocument',invocation:pair[0].id})]),/outcome ambiguous/);
 const legacy=event('operation.error',{operation:'mrw.openDocument'});assert.match(activityReport([legacy]),/failure recorded; invocation link unavailable/);
});
test('duplicate observations count once and conflicts remain explicit',()=>{
 const pair=operation('mrw.openDocument');assert.match(activityReport(mergeEvents([...pair,...structuredClone(pair)]).events),/1 of 1 activity entries/);
 const conflict={...pair[0],data:{operation:'mrw.openDocument',different:true}};const merged=mergeEvents([pair[0],conflict]);const text=activityReport(merged.events,{conflicts:merged.conflicts});assert.match(text,/1 conflicting event/);assert.doesNotMatch(text,/handler completed/);
});
test('non-production, scheduled and report-opening records do not masquerade as reading activity',()=>{
 const rows=[...operation('mrw.openDocument').map(e=>({...e,origin:'automated_test'})),...operation('mrw.openDocument',{actor:'scheduled'}),...operation('mrw.inspectStudyHistory'),...operation('mrw.exportStudyHistory')];
 const text=activityReport(rows);assert.match(text,/non-production record/);assert.match(text,/0 of 0 activity entries/);assert.doesNotMatch(text,/Open Document/);
 const supporting=operation('mrw.openDocument').map(e=>({...e,export_context:{role:'supporting'}}));assert.doesNotMatch(activityReport(supporting),/Open Document/);
});
test('selected study activity is shown without reading submitted snapshots',()=>{
 const row=event('attempt.submit',{snapshot:'a'.repeat(64),answer:'PRIVATE ANSWER'},{identity:{study:'b'.repeat(64)}}),text=activityReport([row]);assert.match(text,/Attempt submitted \[attempt.submit\]/);assert.match(text,/study bbbbbbbbbbbb/);assert.doesNotMatch(text,/PRIVATE ANSWER|aaaaaaaa/);
});
test('the bounded display keeps sequence order under clock rollback and reports omitted entries',()=>{
 const rows=Array.from({length:LIMIT+40},(_,i)=>event('attempt.submit',{},{at:i<70?'2026-11-15T13:00:00Z':'2026-11-15T11:00:00Z'}));const text=activityReport(rows);
 assert.match(text,/100 of 140 activity entries shown \(display limit 100\)/);assert.equal((text.match(/\[attempt.submit\]/g)||[]).length,100);assert.ok(text.indexOf('#'+rows.at(-1).sequence+' ·')<text.indexOf('#'+rows.at(-2).sequence+' ·'));
});
test('session presentation compares reported instants while retaining original timestamps',()=>{
 const first=event('attempt.submit',{},{session:randomUUID(),at:'2026-11-15T10:00:00-05:00'}),second=event('attempt.skip',{},{session:randomUUID(),at:'2026-11-15T14:00:00Z'});
 const text=activityReport([second,first]);assert.ok(text.indexOf('Session '+first.session.slice(0,8))<text.indexOf('Session '+second.session.slice(0,8)));
});
test('recording gaps and source conflicts stay visible without expanding every inventory',()=>{
 const text=activityReport([event('usage.recording',{enabled:false}),event('session.unclean'),event('recorder.recovered')],{recording:false,gaps:['Offline writer'],conflicts:['a'],snapshotConflicts:['b'],missing:['c'],localGap:'Interrupted write'});
 for(const expected of [/recording now: disabled/,/Offline writer/,/Interrupted write/,/conflicting event/,/conflicting snapshot/,/missing snapshot/,/unclean or unobserved/,/persistence recovery/,/coverage is partial/])assert.match(text,expected);
});

test('earlier source navigation remains readable without an instrumented command',()=>{const row=event('navigation.source_open',{outline:'12345678-1234-4567-89ab-123456789abc'});assert.match(activityReport([row]),/Saved source opened.*source 12345678-123/);});
