'use strict';
// Versioned, bounded read-only observation of the existing local history.
// Never calls events()/syncShared(): those paths can publish or delete files.
const fs=require('node:fs/promises'),path=require('node:path');
const {validateEvent,canonical}=require('./historyRecords');
const category=id=>/notebook/.test(id)?'calculation':/lean|proof|graph/.test(id)?'proofs':/zotero|import|source|Outline/.test(id)?'sources':/history|Study|study/.test(id)?'saved-work':/setup|Workspace|config|Plugin/.test(id)?'tools':'reading';
function featureID(operation){if(typeof operation!=='string')return null;return operation.startsWith('bridge.')?null:operation;}
async function featureUse(recorder,{from,to,signal,limits={}}={}){
 const start=from||new Date(Date.now()-7*86400000).toISOString(),end=to||new Date().toISOString();
 if(!Number.isFinite(Date.parse(start))||!Number.isFinite(Date.parse(end))||start>end)throw Error('Choose an ordered ISO observation period');
 const budget={files:Math.min(limits.files||2000,5000),bytes:Math.min(limits.bytes||32*1024*1024,64*1024*1024),events:Math.min(limits.events||50000,100000),milliseconds:Math.min(limits.milliseconds||10000,30000)};
 const began=Date.now(),seen=new Map(),conflicts=new Set(),features=new Map(),gaps=[],versions=new Set(),writers=new Set();let files=0,bytes=0,events=0,complete=true;
 const group=id=>{if(!features.has(id))features.set(id,{id,category:category(id),invocations:0,days:new Set(),last:null,outcomes:{},durationSamples:0,durationTotal:0,coverage:new Set(),prerequisites:'unchecked'});return features.get(id);};
 function accept(e){try{validateEvent(e);}catch{gaps.push('Invalid history event');complete=false;return;}
  const key=canonical(e);if(seen.has(e.id)){if(seen.get(e.id).key!==key)conflicts.add(e.id);return;}seen.set(e.id,{key,event:e});
 }
 let dir;
 try{dir=await fs.opendir(recorder.directory);for await(const entry of dir){
  if(signal?.aborted||Date.now()-began>budget.milliseconds||files>=budget.files||events>=budget.events){complete=false;gaps.push(signal?.aborted?'Cancelled':'Observation budget exhausted');break;}
  if(!/^[a-f0-9-]+-\d+-\d+\.json$/.test(entry.name))continue;
  const file=path.join(recorder.directory,entry.name);files++;let h;
  try{h=await fs.open(file,require('node:fs').constants.O_RDONLY|require('node:fs').constants.O_NOFOLLOW);const before=await h.stat();if(!before.isFile()||before.size>2*1024*1024||bytes+before.size>budget.bytes){complete=false;gaps.push('History batch outside byte budget');continue;}bytes+=before.size;let total=0,chunks=[];while(true){const buffer=Buffer.alloc(Math.min(65536,2*1024*1024+1-total));const part=await h.read(buffer,0,buffer.length,null);if(!part.bytesRead)break;total+=part.bytesRead;if(total>2*1024*1024)throw Error('History batch grew beyond read budget');chunks.push(buffer.subarray(0,part.bytesRead));}const rows=JSON.parse(Buffer.concat(chunks).toString('utf8'));const after=await h.stat();if(before.size!==after.size||before.mtimeMs!==after.mtimeMs){complete=false;gaps.push('History changed during inspection');continue;}if(!Array.isArray(rows))throw Error('Invalid batch');for(const e of rows){if(++events>budget.events){complete=false;break;}accept(e);}}
  catch{complete=false;gaps.push('Unavailable or invalid local history batch');}finally{await h?.close();}
 }}catch(e){complete=false;gaps.push(e.code==='ENOENT'?'No recorded local history':'Local history unavailable');}
 for(const e of recorder.pending||[]){if(events++>=budget.events){complete=false;break;}accept(e);}
 const starts=new Map(),ends=new Map(),byVersion=new Map();
 for(const [id,{event:e}]of seen){if(conflicts.has(id)){complete=false;continue;}if(e.at<start||e.at>end)continue;
  versions.add(e.software?.version||'unknown');writers.add(e.writer||e.session);
  if(e.action==='usage.coverage'&&(!Array.isArray(e.data.features)||e.data.features.length>1000)){complete=false;gaps.push('Invalid coverage inventory');continue;}
  if(e.action==='usage.coverage')for(const f of e.data.features||[]){if(typeof f?.id!=='string'||!['available','unavailable','uninstrumented'].includes(f.status)){complete=false;gaps.push('Invalid feature coverage');continue;}const g=group(f.id);g.coverage.add(f.status);g.prerequisites=f.prerequisites||'unchecked';}
  if(e.action==='usage.recording'&&e.data.enabled===false){complete=false;gaps.push('Recording disabled within selected period');}
  if(e.action==='session.unclean'||e.action==='recorder.gap'){complete=false;gaps.push('Interrupted session or recorded persistence gap');}
  if(e.action.startsWith('operation.')&&(typeof e.data.operation!=='string'||e.data.feature!=null&&typeof e.data.feature!=='string')){complete=false;gaps.push('Invalid operation identity');continue;}
  if(e.origin!=='production')continue;
  if(e.action==='operation.start'&&!e.data.parent&&e.data.actor!=='scheduled'&&featureID(e.data.operation)){const g=group(e.data.feature||featureID(e.data.operation));g.invocations++;const version=e.software?.version||'unknown';const v=byVersion.get(version)||{version,invocations:0,days:new Set(),last:null};v.invocations++;v.days.add(e.at.slice(0,10));v.last=!v.last||e.at>v.last?e.at:v.last;byVersion.set(version,v);g.days.add(e.at.slice(0,10));g.last=!g.last||e.at>g.last?e.at:g.last;starts.set(e.id,{group:g,event:e});}
  if(e.data.invocation&&/^operation\.(complete|cancel|error)$/.test(e.action)){const rows=ends.get(e.data.invocation)||[];rows.push(e);ends.set(e.data.invocation,rows);}
 }
 for(const[id,{group:g,event}]of starts){const endings=ends.get(id)||[];const rows=endings.filter(e=>e.session===event.session&&e.data.operation===event.data.operation&&Number.isFinite(e.data.duration_ms)&&e.data.duration_ms>=0);if(rows.length!==endings.length){complete=false;gaps.push('Mismatched or invalid invocation outcome');}const outcome=rows.length===1?rows[0].action.slice(10):rows.length?'ambiguous':'pending-or-unobserved';g.outcomes[outcome]=(g.outcomes[outcome]||0)+1;if(rows.length===1&&Number.isFinite(rows[0].data.duration_ms)){g.durationSamples++;g.durationTotal+=rows[0].data.duration_ms;}}
 if(recorder.gap){complete=false;gaps.push('Recorder reports a persistence gap');}
 // A local bounded report cannot certify an unobserved restart, closed-window
 // interval or remote replica. Never turn a coverage snapshot into zero use.
 const summary=[...features.values()].map(g=>({...g,days:g.days.size,coverage:[...g.coverage],status:g.invocations?'used':g.coverage.has('uninstrumented')?'uninstrumented':g.coverage.size&&[...g.coverage].every(x=>x==='unavailable')?'unavailable':'unknown-or-partial'}));
 const markdown=['Period: '+start+' to '+end,'Scope: local workspace history; optional shared replicas and closed-window periods are unobserved.','Coverage: '+(complete?'bounded local batches read':'partial')+'. '+[...new Set(gaps)].join('; '),'','| Feature | State | User invocations | Recorded days used | Last use | Outcomes | Duration samples |','| --- | --- | ---: | ---: | --- | --- | ---: |',...summary.map(g=>'| '+[g.id,g.status,g.invocations,g.days,g.last||'none',JSON.stringify(g.outcomes),g.durationSamples].map(v=>String(v).replace(/[|\r\n]/g,' ')).join(' | ')+' |')].join('\n');
 return {markdown,version:1,period:{from:start,to:end},scope:'local workspace history only',coverage:'Recorded observations; closed-window periods and optional shared replicas are unobserved.',complete,limits:budget,observed:{files,bytes,events},writers:[...writers],byVersion:[...byVersion.values()].map(v=>({...v,days:v.days.size})),versions:[...versions],conflicts:[...conflicts],gaps:[...new Set(gaps)],features:summary};
}
module.exports={featureUse,featureID,category};
