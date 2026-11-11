'use strict';
const {AsyncLocalStorage}=require('node:async_hooks');
const {performance}=require('node:perf_hooks');
// No arguments, returned text, dialog labels, prompts or error prose are counted.
class UsageOperations{
  constructor(recorder){this.recorder=recorder;this.context=new AsyncLocalStorage();}
  cancel(){const current=this.context.getStore();if(current)current.cancelled=true;}
  async run(operation,action,identity){
    const recorder=this.recorder,parent=this.context.getStore(),start=performance.now();
    const event=recorder.record('operation.start',{operation,parent:parent?.event.id},'observed_action',identity);
    identity=event.identity;
    const current={event,cancelled:false};
    return this.context.run(current,async()=>{
      try{const result=await action();recorder.record(current.cancelled?'operation.cancel':'operation.complete',{operation,invocation:event.id,duration_ms:performance.now()-start},'observed_action',identity);return result;}
      catch(error){recorder.record('operation.error',{operation,invocation:event.id,duration_ms:performance.now()-start},'observed_action',identity);throw error;}
    });
  }
}
const safe=value=>String(value??'unknown').replace(/[|\r\n]/g,' ');
function usageReport(events,status={}){
  const groups=new Map(),starts=new Map(events.filter(e=>e.action==='operation.start').map(e=>[e.id,e])),outcomes=new Map();
  for(const e of events)if(e.data?.invocation&&['operation.complete','operation.cancel','operation.error'].includes(e.action)){
    const list=outcomes.get(e.data.invocation)||[];list.push(e);outcomes.set(e.data.invocation,list);
  }
  const key=e=>[e.origin,e.writer||e.history_context?.writers?.join(', ')||'unknown',e.software?.version||'unknown',e.software?.commit||'unknown',(e.at||'unknown').slice(0,10)];
  const group=(e,feature)=>{const dims=key(e),id=JSON.stringify([...dims,feature]);if(!groups.has(id))groups.set(id,{dims,feature,start:0,complete:0,cancel:0,error:0,unlinked:0,durations:[],last:'',coverage:new Set()});return groups.get(id);};
  const missing=[];
  for(const e of events){
    if(e.export_context?.role==='supporting')continue;
    if(e.action==='usage.coverage')for(const feature of e.data.features||[]){const g=group(e,feature.id);g.coverage.add(feature.status);}
    if(!e.action?.startsWith('operation.')||typeof e.data?.operation!=='string')continue;
    const g=group(e,e.data.operation);g.last=g.last>e.at?g.last:e.at;
    if(e.action==='operation.start'){g.start++;continue;}
    const start=starts.get(e.data.invocation);
    if(!start||start.session!==e.session||start.data.operation!==e.data.operation){g.unlinked++;missing.push(e.id);continue;}
    const endings=outcomes.get(start.id)||[];
    if(endings.length!==1){g.unlinked++;missing.push(e.id);continue;}
    if(e.action==='operation.complete')g.complete++;if(e.action==='operation.cancel')g.cancel++;if(e.action==='operation.error')g.error++;
    if(Number.isFinite(e.data.duration_ms)&&e.data.duration_ms>=0)g.durations.push(e.data.duration_ms);
  }
  const lines=['# Usage and interaction history','','Only available batches are represented; MRW cannot know whether every device has synchronized. Dates below are writer-reported UTC calendar periods, not a cross-device ordering. Last use is the greatest reported timestamp, not a synchronized-clock assertion.',
    'Counts describe invocations and observed software outcomes, not usefulness, reading, comprehension or mathematical correctness. Old unlinked outcomes are shown separately; they are not silently matched by timestamp.','',
    `Shared history: ${status.enabled?'enabled':'not enabled'}. Available publishing writers: ${(status.writers||[]).join(', ')||'none observed'}.`,
    ...events.filter(e=>e.action==='usage.recording').map(e=>`Usage recording ${e.data.enabled?'enabled':'disabled'}: ${safe(e.writer||'unknown writer')}, ${safe(e.at)}. Study evidence remains separate.`),
    ...(status.gaps||[]).map(g=>'Gap: '+g),
    ...(status.conflicts||[]).map(id=>'Conflicting event excluded: '+id),
    ...(status.snapshotConflicts||[]).map(id=>'Conflicting snapshot excluded: '+id),
    ...(status.missing||[]).map(id=>'Missing snapshot: '+id),'',
    '| Origin | Writer | Version / commit | UTC date | Feature | Coverage | Invoked | Complete | Cancelled | Failed | Unlinked outcomes | Mean ms | Last reported use |',
    '| --- | --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |'];
  for(const g of [...groups.values()].sort((a,b)=>JSON.stringify([...a.dims,a.feature]).localeCompare(JSON.stringify([...b.dims,b.feature])))){
    const [origin,writer,version,commit,period]=g.dims;
    const coverage=g.coverage.size?[...g.coverage].sort().join(', ')+(g.coverage.has('available')&&!g.start?' (unused in represented period)':''):g.start?'observed; availability not inventoried':'uninstrumented invocation';
    lines.push('| '+[origin,writer,version+' / '+commit,period,g.feature,coverage,g.start,g.complete,g.cancel,g.error,g.unlinked,g.durations.length?(g.durations.reduce((a,b)=>a+b,0)/g.durations.length).toFixed(1):'unavailable',g.last||'none'].map(safe).join(' | ')+' |');
  }
  if(!groups.size)lines.push('No instrumented feature observations in this selection. This does not establish zero use.');
  if(missing.length)lines.push('',`Missing or ambiguous invocation links: ${[...new Set(missing)].join(', ')}.`);
  return lines.join('\n');
}
module.exports={UsageOperations,usageReport};
