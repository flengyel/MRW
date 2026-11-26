'use strict';
// Presentation of StudyHistory.events() output: already deduplicated, with
// conflicts in status. No second payload merge, file reads or journal changes.
const {validateEvent}=require('./historyRecords');
const titles=new Map(require('../package.json').contributes.commands.map(c=>[c.command,c.title]));
const LIMIT=100;
const clean=(value,size=160)=>String(value??'unknown').replace(/[\x00-\x1f\x7f]/g,' ').slice(0,size);
const routine=new Set(['session.start','session.end','usage.coverage','usage.recording']);
const ownHistory=new Set(['mrw.inspectStudyHistory','mrw.exportStudyHistory']);
const studyLabels=new Map([
 ['attempt.begin','Attempt begun'],['attempt.submit','Attempt submitted'],['attempt.outcome','Assessment recorded'],['attempt.correction','Assessment corrected'],
 ['attempt.skip','Attempt skipped'],['study.save','Unresolved-question save recorded'],['solution.save','Solution save recorded'],['solution.review','Solution opened'],
 ['help.request','Companion request prepared'],['help.retained','Companion response retained'],['review.admit','Review admission recorded'],['review.retire','Review retirement recorded'],
 ['history.export','History exported'],['navigation.source_open','Saved source opened'],['navigation.reader_select','Passage selected'],['navigation.graph_select','Proof-graph claim selected'],['navigation.source','Study source followed'],['navigation.problem_return','Returned to document'],['source.change','Study source changed']
]);
function shownOperation(e){const op=e.data?.operation;return typeof op==='string'&&!op.startsWith('bridge.')&&!ownHistory.has(op)&&!e.data.parent&&e.data.actor!=='scheduled';}
function activityReport(events,status={}){
 const valid=[],selected=new Set();let invalid=0;
 for(const e of events){try{validateEvent(e);valid.push(e);if(e.export_context?.role!=='supporting')selected.add(e.id);}catch{invalid++;}}
 const rows=valid,chosen=rows.filter(e=>selected.has(e.id));
 const starts=new Map(rows.filter(e=>e.action==='operation.start').map(e=>[e.id,e])),endings=new Map();
 for(const e of rows)if(['operation.complete','operation.cancel','operation.error'].includes(e.action)&&e.data.invocation){const list=endings.get(e.data.invocation)||[];list.push(e);endings.set(e.data.invocation,list);}
 const entries=[];
 for(const e of chosen){
  if(e.origin!=='production')continue;
  let label;
  if(e.action==='operation.start'&&shownOperation(e)){
   const linked=endings.get(e.id)||[],matching=linked.filter(end=>end.session===e.session&&end.data.operation===e.data.operation);
   const outcome=linked.length!==matching.length||linked.length>1?'outcome ambiguous':!linked.length?'completion not recorded':{'operation.complete':'handler completed','operation.cancel':'cancelled','operation.error':'failed'}[matching[0].action];
   label=(titles.get(e.data.operation)||clean(e.data.operation))+' — '+outcome;
  }else if(['operation.complete','operation.cancel','operation.error'].includes(e.action)&&shownOperation(e)){
   const start=starts.get(e.data.invocation);
   if(!start||start.session!==e.session||start.data.operation!==e.data.operation)label=(titles.get(e.data.operation)||clean(e.data.operation))+' — '+({'operation.complete':'completion','operation.cancel':'cancellation','operation.error':'failure'}[e.action])+' recorded; invocation link unavailable';
  }else if(studyLabels.has(e.action))label=studyLabels.get(e.action)+' ['+e.action+']';
  if(label)entries.push({event:e,label});
 }
 const sessions=new Map();
 for(const entry of entries){const e=entry.event;let group=sessions.get(e.session);if(!group){group={id:e.session,at:'',time:-Infinity,entries:[]};sessions.set(e.session,group);}const time=Date.parse(e.at);if(Number.isFinite(time)&&time>group.time){group.at=e.at;group.time=time;}group.entries.push(entry);}
 const ordered=[...sessions.values()].sort((a,b)=>b.time-a.time||a.id.localeCompare(b.id));
 const lines=['# Recorded MRW activity','',
  'Available production records only; unrecorded work and offline replicas are not represented.',
  'Sessions follow reported timestamps, which may differ between writers; entries within each session follow sequence order, newest first. Handler completion describes the MRW action, not an external result.',''];
 if(typeof status.recording==='boolean')lines.push('Usage recording now: '+(status.recording?'enabled':'disabled')+'.');
 lines.push('Shared history: '+(status.enabled?'connected; available records included':'not connected')+'.');
 const notices=[];
 if(status.localGap)notices.push(clean(status.localGap,400));
 for(const gap of status.gaps||[])notices.push('Gap: '+clean(gap,400));
 const conflicts=new Set(status.conflicts||[]);if(conflicts.size)notices.push(conflicts.size+' conflicting event(s) excluded.');
 if(status.snapshotConflicts?.length)notices.push(status.snapshotConflicts.length+' conflicting snapshot(s).');
 if(status.missing?.length)notices.push(status.missing.length+' missing snapshot(s).');
 if(invalid)notices.push(invalid+' invalid event(s) omitted.');
 const interruptions=chosen.filter(e=>e.origin==='production'&&e.action==='session.unclean').length;
 if(interruptions)notices.push(interruptions+' session ending(s) were unclean or unobserved; this does not establish lost work.');
 const disabled=chosen.filter(e=>e.origin==='production'&&e.action==='usage.recording'&&e.data.enabled===false).length;
 if(disabled)notices.push('Recording was disabled in '+disabled+' recorded observation(s); activity coverage is partial.');
 const recoveries=chosen.filter(e=>e.origin==='production'&&e.action==='recorder.recovered').length;
 if(recoveries)notices.push(recoveries+' persistence recovery record(s); earlier gaps remain qualifications.');
 if(notices.length)lines.push('','## History notices',...notices.slice(0,8).map(n=>'- '+n),...(notices.length>8?['- Additional notices are available in the detailed export.']:[]));
 lines.push('','## Activity');
 if(!entries.length)lines.push('No recorded command or study activity to show in the available records.');
 let shown=0;
 for(const group of ordered){
  if(shown>=LIMIT)break;
  group.entries.sort((a,b)=>b.event.sequence-a.event.sequence||a.event.id.localeCompare(b.event.id));
  const sample=group.entries[0].event;
  lines.push('','### Session '+clean(group.id,8)+' · '+(group.at?clean(group.at,64):'time unavailable')+' · '+clean(sample.writer||'writer unrecorded',24));
  for(const {event:e,label} of group.entries){
   if(shown>=LIMIT)break;shown++;
   const scope=e.identity?.study?' · study '+clean(e.identity.study,12):e.data?.outline?' · source '+clean(e.data.outline,12):'';
   lines.push('- '+clean(e.at,64)+' #'+e.sequence+' · '+clean(label,320)+' · '+clean(e.software.version,40)+' / '+clean(e.software.commit,12)+scope);
  }
 }
 lines.push('',shown+' of '+entries.length+' activity entries shown'+(entries.length>shown?' (display limit '+LIMIT+')':'')+'.');
 const collapsed=chosen.filter(e=>e.origin==='production'&&routine.has(e.action)).length;
 if(collapsed)lines.push(collapsed+' startup/availability observation(s) collapsed in this view.');
 const nonProduction=chosen.filter(e=>e.origin!=='production').length;if(nonProduction)lines.push(nonProduction+' test, development, demo or other non-production record(s) omitted.');
 lines.push('','Full coverage, study measurements and event data remain available through MRW: Export Study History… (Detailed comparison or Events and submitted snapshots). No journal records are removed by this view.');
 return lines.join('\n');
}
module.exports={activityReport,LIMIT};
