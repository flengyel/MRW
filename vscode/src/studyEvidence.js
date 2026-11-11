'use strict';
// Small shared interpretation of immutable study evidence. This does not assess mathematics.
const RECALL = new Set(['definition','hypotheses','missing_step','argument']);
const OUTCOMES = new Set(['unaided_success','help_dependent','unresolved']);
const readerRecall = o => !!o && o.assessor==='reader' && typeof o.consulted==='boolean' && RECALL.has(o.activity) && OUTCOMES.has(o.outcome);
const unaidedRecall = o => readerRecall(o) && o.outcome==='unaided_success' && o.consulted===false && !o.hints && !o.answer_visible && !o.answer_exposed && !o.source_visible && !o.source_exposed && !o.help_visible;
const attemptID = e => e.data?.attempt || e.identity?.attempt;
const attemptKey = e => attemptID(e) ? JSON.stringify([e.origin,e.identity?.study||'',attemptID(e)]) : null;
function uniqueEvents(events) {
  const byID=new Map();for(const e of events||[])if(e?.id&&!byID.has(e.id))byID.set(e.id,e);
  return [...byID.values()].sort((a,b)=>(a.session||'').localeCompare(b.session||'')||(a.sequence||0)-(b.sequence||0)||a.id.localeCompare(b.id));
}
function projectAttempts(events) {
  const rows=uniqueEvents(events), byID=new Map(rows.map(e=>[e.id,e])), attempts=new Map(), missing=[];
  for(const e of rows) {
    if(!['attempt.begin','attempt.submit','attempt.outcome','attempt.correction','attempt.skip'].includes(e.action))continue;
    const key=attemptKey(e);if(!key){missing.push({event:e.id,reason:'Attempt identity unavailable.'});continue;}
    if(!attempts.has(key))attempts.set(key,{key,id:attemptID(e),origin:e.origin,study:e.identity?.study,events:[],submissions:[],assessments:[],missing:[]});
    const a=attempts.get(key);a.events.push(e);
    if(e.action==='attempt.begin'&&!a.begin)a.begin=e;
    if(e.action==='attempt.submit')a.submissions.push(e);
    if(e.action==='attempt.skip')a.skip=e;
  }
  for(const a of attempts.values()) {
    a.anchor=a.begin||a.submissions[0]||null;
    if(!a.anchor)a.missing.push('Original attempt/submission context unavailable.');
    const assessments=a.events.filter(e=>['attempt.outcome','attempt.correction'].includes(e.action));
    const valid=e=>{const sub=byID.get(e.data.submission);return sub?.action==='attempt.submit'&&attemptKey(sub)===a.key;};
    for(const e of assessments)if(!valid(e))a.missing.push('Submission for assessment '+e.id+' unavailable.');
    const roots=assessments.filter(e=>e.action==='attempt.outcome'&&valid(e));
    if(roots.length){a.assessment=roots[0];a.assessments.push(roots[0]);}
    for(const e of roots.slice(1))a.missing.push('Additional unlinked assessment '+e.id+' excluded.');
    // Follow correction links, rather than trusting cross-session wall-clock order.
    while(a.assessment) {
      const next=assessments.filter(e=>e.action==='attempt.correction'&&valid(e)&&e.data.corrects===a.assessment.id&&!a.assessments.some(p=>p.id===e.id));
      if(!next.length)break;
      const e=next.at(-1);for(const fork of next.slice(0,-1))a.missing.push('Conflicting correction branch '+fork.id+' excluded.');
      a.assessments.push(e);a.assessment=e;
    }
    for(const e of assessments.filter(e=>e.action==='attempt.correction'&&valid(e)&&!a.assessments.some(p=>p.id===e.id)))a.missing.push('Linked assessment for correction '+e.id+' unavailable or not on the current chain.');
    if(a.assessment)a.submission=byID.get(a.assessment.data.submission);
    a.supported=!!a.anchor&&!a.missing.length;
    if(a.assessment&&a.supported) {
      const d=a.assessment.data, sub=a.submission.data;
      a.observation={...d,hints:sub.hints,answer_visible:sub.answer_visible,answer_exposed:sub.answer_exposed,source_visible:sub.source_visible,source_exposed:sub.source_exposed,help_visible:sub.help_visible,
        help_responses:sub.help_responses||[],submission:a.submission.id,
        delayed_days:sub.timing_known===true&&Number.isFinite(sub.delayed_days)?sub.delayed_days:null,
        timing_known:sub.timing_known===true,submission_at:sub.submitted_at||null};
    }
    for(const reason of a.missing)missing.push({attempt:a.id,study:a.study,reason});
  }
  return {events:rows,attempts:[...attempts.values()],missing};
}
function projectEffort(events) {
  const rows=uniqueEvents(events),offers=[],byOffer=new Map(),anchors=new Map(),missing=[];
  const selected=e=>e?.export_context?.role!=='supporting';
  const problem=(e,reason)=>missing.push({event:e.id,attempt:attemptID(e),study:e.identity?.study,reason});
  for(const e of rows)if(['attempt.begin','attempt.submit'].includes(e.action)) {
    const key=attemptKey(e),current=anchors.get(key);
    if(key&&(!current||(e.action==='attempt.begin'&&current.action!=='attempt.begin')))anchors.set(key,e);
  }
  for(const offer of rows.filter(e=>e.action==='effort.offer')) {
    const key=attemptKey(offer),anchor=anchors.get(key),record={offer,response:null,responses:[],anchor:anchor||null,key,attempt:attemptID(offer),study:offer.identity?.study,origin:offer.origin,
      disposition:'no_response',rating:null,supported:!!anchor,missing:[],selected:selected(offer)};
    if(!key||!anchor){const reason='Effort task context for offer '+offer.id+' unavailable.';record.missing.push(reason);problem(offer,reason);}
    offers.push(record);byOffer.set(offer.id,record);
  }
  for(const response of rows.filter(e=>e.action==='effort.response')) {
    const record=byOffer.get(response.data?.offer);
    if(!record){problem(response,'Effort offer '+(response.data?.offer||'(unrecorded)')+' unavailable.');continue;}
    if(!record.key||attemptKey(response)!==record.key||response.data?.attempt!==record.attempt||
      (response.identity?.attempt&&response.identity.attempt!==record.attempt)) {
      problem(response,'Effort response does not match its offer/task identity.');continue;
    }
    const numeric=response.evidence==='reader_report'&&Number.isInteger(response.data.rating)&&response.data.rating>=1&&response.data.rating<=9&&
      ['answered',undefined].includes(response.data.disposition);
    const declined=response.evidence==='reader_report'&&response.data.disposition==='declined'&&response.data.rating===null;
    const absent=response.evidence==='observed_action'&&response.data.disposition==='no_response'&&response.data.rating===null;
    if(!numeric&&!declined&&!absent){problem(response,'Effort disposition or reader-report evidence unavailable.');continue;}
    record.responses.push(response);record.selected ||= selected(response);
    // An explicit answer/decline resolves an earlier recorded nonresponse. Its
    // own date and release remain on the response, not the task's attribution.
    if(!record.response||response.evidence==='reader_report'||record.response.evidence!=='reader_report') {
      record.response=response;record.disposition=numeric?'answered':declined?'declined':'no_response';record.rating=numeric?response.data.rating:null;
    }
  }
  for(const record of offers){
    const reports=new Set(record.responses.filter(e=>e.evidence==='reader_report').map(e=>JSON.stringify([e.data.rating,e.data.disposition||'answered'])));
    if(reports.size>1){const reason='Conflicting reader effort responses have no explicit correction link.';record.supported=false;record.missing.push(reason);problem(record.offer,reason);}
  }
  return {events:rows,offers,missing};
}
function selectHistoryContext(events, selectedSessions) {
  const rows=uniqueEvents(events),sessions=new Set(selectedSessions), selected=rows.filter(e=>sessions.has(e.session));
  const keys=new Set(selected.map(attemptKey).filter(Boolean)), wanted=new Set(selected.map(e=>e.id));
  // Include only linked attempt evidence, never whole supporting sessions/studies.
  const actions=new Set(['attempt.begin','attempt.submit','attempt.outcome','attempt.correction','attempt.skip','attempt.continuation','effort.offer','effort.response','adaptation.offer','adaptation.withdrawal','adaptation.choice','help.request','help.preview','help.retained','help.display','solution.review']);
  for(const e of rows)if(keys.has(attemptKey(e))&&actions.has(e.action))wanted.add(e.id);
  const byID=new Map(rows.map(e=>[e.id,e])),missing=[];
  const sameStudy=(a,b)=>a.origin===b.origin&&a.identity?.study===b.identity?.study;
  for(const id of wanted) {
    const e=byID.get(id),refs=['attempt.outcome','attempt.correction'].includes(e?.action)?[e.data.corrects,e.data.submission]:[];
    if(e?.action==='effort.response')refs.push(e.data.offer);
    if(e?.action?.startsWith('adaptation.'))refs.push(e.data.offer,e.data.supersedes,e.data.effort_response,...(e.data.evidence||[]),...(e.data.replacement_evidence||[]));
    for(const ref of refs)if(ref) {
      const linked=byID.get(ref);if(linked&&sameStudy(linked,e))wanted.add(ref);else missing.push({event:id,reference:ref,reason:'Linked event unavailable.'});
    }
    const responseIDs=[...(e?.data?.help_responses||[]),e?.data?.response].filter(Boolean);
    for(const response of responseIDs) {
      if(response.startsWith('solution-review:')||response.startsWith('solution:')) {
        const exact=response.startsWith('solution-review:'),id=response.slice(exact?'solution-review:'.length:'solution:'.length);
        const matches=rows.filter(p=>sameStudy(p,e)&&p.action==='solution.review'&&p.data.available===true&&typeof p.data.snapshot==='string'&&
          attemptKey(p)===attemptKey(e)&&(exact?p.id===id:p.data.revision===id));
        if(matches.length)for(const linked of matches)wanted.add(linked.id);
        else missing.push({event:e.id,reference:response,reason:'Linked solution review unavailable.'});
        continue;
      }
      const linked=rows.find(p=>sameStudy(p,e)&&p.action==='help.retained'&&p.data.response===response);
      if(linked)wanted.add(linked.id);
      // A preview can expose a draft before it is retained. That is valid exposure evidence.
      else if(!rows.some(p=>sameStudy(p,e)&&p.action==='help.preview'&&p.data.response===response))missing.push({event:id,reference:response,reason:'Linked help response unavailable.'});
    }
    if(e?.data?.request) {
      const linked=rows.find(p=>sameStudy(p,e)&&p.action==='help.request'&&p.data.id===e.data.request);
      if(linked)wanted.add(linked.id);else missing.push({event:id,reference:e.data.request,reason:'Linked help request unavailable.'});
    }
    if(e?.data?.previous&&['help.retained','attempt.submit'].includes(e.action)) {
      const linked=e.action==='help.retained'?rows.find(p=>sameStudy(p,e)&&p.action==='help.retained'&&p.data.response===e.data.previous):byID.get(e.data.previous);
      if(linked&&sameStudy(linked,e))wanted.add(linked.id);else missing.push({event:id,reference:e.data.previous,reason:'Linked previous revision unavailable.'});
    }
  }
  const result=rows.filter(e=>wanted.has(e.id)).map(e=>({...e,export_context:{role:sessions.has(e.session)?'selected':'supporting',reason:sessions.has(e.session)?'Selected session.':'Linked attempt context outside selected sessions.'}}));
  const projection=projectAttempts(result),effort=projectEffort(result);return {events:result,missing:[...missing,...projection.missing,...effort.missing],selected_sessions:[...sessions]};
}
module.exports={readerRecall,unaidedRecall,attemptID,attemptKey,uniqueEvents,projectAttempts,projectEffort,selectHistoryContext};
