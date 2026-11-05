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
  return [...byID.values()].sort((a,b)=>(a.at||'').localeCompare(b.at||'')||(a.session||'').localeCompare(b.session||'')||(a.sequence||0)-(b.sequence||0)||a.id.localeCompare(b.id));
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
function selectHistoryContext(events, selectedSessions) {
  const rows=uniqueEvents(events),sessions=new Set(selectedSessions), selected=rows.filter(e=>sessions.has(e.session));
  const keys=new Set(selected.map(attemptKey).filter(Boolean)), wanted=new Set(selected.map(e=>e.id));
  // Include only linked attempt evidence, never whole supporting sessions/studies.
  const actions=new Set(['attempt.begin','attempt.submit','attempt.outcome','attempt.correction','attempt.skip','attempt.continuation','effort.offer','effort.response','adaptation.offer','adaptation.choice','help.request','help.preview','help.retained','help.display']);
  for(const e of rows)if(keys.has(attemptKey(e))&&actions.has(e.action))wanted.add(e.id);
  const byID=new Map(rows.map(e=>[e.id,e])),missing=[];
  const sameStudy=(a,b)=>a.origin===b.origin&&a.identity?.study===b.identity?.study;
  for(const id of wanted) {
    const e=byID.get(id),refs=['attempt.outcome','attempt.correction'].includes(e?.action)?[e.data.corrects,e.data.submission]:[];
    if(e?.action==='effort.response')refs.push(e.data.offer);
    for(const ref of refs)if(ref) {
      const linked=byID.get(ref);if(linked&&sameStudy(linked,e))wanted.add(ref);else missing.push({event:id,reference:ref,reason:'Linked event unavailable.'});
    }
    const responseIDs=[...(e?.data?.help_responses||[]),e?.data?.response].filter(Boolean);
    for(const response of responseIDs) {
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
  const projection=projectAttempts(result);return {events:result,missing:[...missing,...projection.missing],selected_sessions:[...sessions]};
}
module.exports={readerRecall,unaidedRecall,attemptID,attemptKey,uniqueEvents,projectAttempts,selectHistoryContext};
