'use strict';
const crypto = require('node:crypto');
const { hash } = require('./studyHistory'), scheduler = require('./studyScheduler');
const { projectAttempts, readerRecall, unaidedRecall } = require('./studyEvidence');
const ACTIVITIES = ['definition','hypotheses','missing_step','argument','application'];
const signature = passages => passages.map(p => ({ reference:p.reference, source_revision:p.source_revision, sha256:hash(p.text) }));
const identity = s => ({ study:s.id, practice:!!s.practice, sources:signature(s.passages), question:s.current?{id:s.current.question.id,revision:s.current.question.revision,activity:s.current.question.activity}:null, attempt:s.current?.id });
function createStudy(passages, root, title) {
  if (!passages?.length || passages.length>16 || passages.some(p=>!p.text?.trim() || Buffer.byteLength(p.text)>128*1024 || !p.reference || !p.source_revision)) throw new Error('Select a supported exact passage or ordinary text selection.');
  const id=hash(JSON.stringify({root,sources:signature(passages)}));
  return { version:2,id,root,title:title||passages[0].label,passages,questions:[],current:null,block:null,unresolved:'',updated:new Date().toISOString() };
}
function question(value, passages, previous) {
  if (!ACTIVITIES.includes(value.activity) || typeof value.prompt!=='string' || !value.prompt.trim() || value.prompt.length>8192 ||
    typeof value.author!=='string'||!value.author.trim()||value.author.length>160||!['human','ai_proposal'].includes(value.origin)||
    !Array.isArray(value.hints)||value.hints.length>4||value.hints.some(h=>typeof h!=='string'||h.length>4096)||
    !Array.isArray(value.references)||!value.references.length||value.references.length>16||value.references.some(r=>!passages.some(p=>p.reference===r))) throw new Error('Complete the question, author and exact source references.');
  if(value.answer!==null && (!value.answer||typeof value.answer.text!=='string'||!value.answer.text.trim()||value.answer.text.length>8192||typeof value.answer.author!=='string'||!value.answer.author.trim()||!['human','ai_proposal'].includes(value.answer.origin))) throw new Error('Attribute the reference answer or leave it unavailable.');
  const content={activity:value.activity,prompt:value.prompt,answer:value.answer,hints:value.hints,references:value.references,author:value.author,origin:value.origin};
  return {...content,id:previous?.id||crypto.randomUUID(),revision:hash(JSON.stringify(content)),kept:false,retired:false,card:null,reviews:[]};
}
function block(options={}, now=Date.now()) {
  return {id:crypto.randomUUID(),started:now,completed:0,newCount:0,seen:[],limit:Math.min(10,Math.max(1,Number(options.questions)||3)),minutes:Math.min(30,Math.max(1,Number(options.minutes)||5)),newLimit:Math.min(3,Math.max(0,Number.isFinite(options.newQuestions)?options.newQuestions:1))};
}
function begin(s, q, reason, recorder, when=new Date()) {
  if(s.current && !s.current.finished) throw new Error('Record an outcome or skip the current attempt before changing questions. Submit and Pause preserve unfinished work.');
  if(s.current?.effortOffer?.disposition==='no_response')recorder.record('effort.response',{attempt:s.current.id,offer:s.current.effortOffer.id,disposition:'no_response',rating:null,reason:'Moved to another attempt.'},'observed_action');
  const now=new Date(when).toISOString(),previous=q.reviews?.at(-1);
  const preceding=previous?.submission_at?{attempt:previous.attempt,at:previous.submission_at}:null;
  s.current={id:crypto.randomUUID(),question:structuredClone(q),begun:now,draft:'',paper:false,hints:[],answerVisible:false,answerExposed:false,sourceVisible:false,sourceExposed:false,helpExposures:[],assistedContinuation:false,submissions:[],outcome:null,finished:false,effortOffer:null,
    timing:{begun:now,preceding_review:preceding,baseline_known:!previous||!!preceding}};
  s.block.seen.push(q.revision); if(!q.reviews?.length)s.block.newCount++;
  recorder.setContext(identity(s)); recorder.record('question.offered',{reason,block:s.block.id}); recorder.record('attempt.begin',{attempt:s.current.id,begun:now,source_visible:false,answer_visible:false,preceding_review:preceding,timing_known:s.current.timing.baseline_known,concealment:'Source and reference answer concealed in this study for the new attempt; prior exposure is retained separately.'});
}
function submit(s, text, paper, recorder, when=new Date()) {
  const a=s.current;if(!a||a.finished)throw new Error('Begin an unfinished question first.');
  if(typeof text!=='string'||Buffer.byteLength(text)>64*1024||(!paper&&!text.trim()))throw new Error('Enter an answer or choose paper work.');
  const submitted_at=new Date(when).toISOString(),preceding_review=a.timing?.preceding_review||null;
  const previousTime=preceding_review?+new Date(preceding_review.at):null,submittedTime=+new Date(submitted_at);
  const timing_known=a.timing?.baseline_known===true&&(!preceding_review||(Number.isFinite(previousTime)&&submittedTime>=previousTime));
  const delayed_days=timing_known&&preceding_review?(submittedTime-previousTime)/86400000:null;
  const exposure={hints:a.hints.length,answer_visible:a.answerVisible,answer_exposed:!!a.answerExposed||a.answerVisible,source_visible:a.sourceVisible,source_exposed:!!a.sourceExposed||a.sourceVisible,
    help_visible:!!a.helpExposures?.length||!!a.assistedContinuation,help_responses:[...(a.helpExposures||[])],assisted_continuation:!!a.assistedContinuation};
  const timing={submitted_at,preceding_review,timing_known,delayed_days};
  const snapshot=recorder.snapshot({attempt:a.id,question:a.question,answer:text,paper:!!paper,
    ...exposure,hints:[...a.hints],...timing,sequence:a.submissions.length+1});
  const event=recorder.record('attempt.submit',{attempt:a.id,snapshot,submission:a.submissions.length+1,paper:!!paper,
    ...exposure,...timing,previous:a.submissions.at(-1)?.event||null});
  a.draft=text;a.paper=!!paper;a.submissions.push({snapshot,event:event.id,...exposure,...timing,at:event.at});
  return event;
}
function outcome(s, report, recorder, bank=s.questions) {
  const a=s.current, submission=a?.submissions.at(-1);
  if(!a||!submission)throw new Error('Submit the typed or paper attempt first.');
  if(!['unaided_success','help_dependent','unresolved','unassessed'].includes(report.outcome)||!['reader','ai','external'].includes(report.assessor)||![true,false,null].includes(report.consulted))throw new Error('Choose an outcome and its assessor.');
  if(report.assessor!=='reader'&&(typeof report.author!=='string'||!report.author.trim()))throw new Error('Identify the assessment author.');
  if(report.assessor==='external')throw new Error('External checking must be recorded through the existing checked-record workflow.');
  if(a.finished&&!report.correction)throw new Error('This attempt already has an outcome. Use Correct outcome.');
  if(report.outcome==='unaided_success'&&(submission.hints||submission.answer_visible||submission.answer_exposed||submission.source_visible||submission.source_exposed||submission.help_visible||report.consulted===true))throw new Error('This submission used help. Choose help-dependent completion or unresolved.');
  const q=bank.find(q=>q.id===a.question.id&&q.revision===a.question.revision);
  const observation={attempt:a.id,activity:a.question.activity,...report,hints:submission.hints,
    answer_visible:submission.answer_visible,answer_exposed:submission.answer_exposed,source_visible:submission.source_visible,source_exposed:submission.source_exposed,help_visible:!!submission.help_visible,help_responses:submission.help_responses||[],submission:submission.event,
    submission_at:submission.submitted_at||null,preceding_review:submission.preceding_review||null,timing_known:submission.timing_known===true,
    delayed_days:submission.timing_known===true&&Number.isFinite(submission.delayed_days)?submission.delayed_days:null};
  const e=recorder.record(report.correction?'attempt.correction':'attempt.outcome',{...observation,corrects:report.correction?a.outcome?.event:null},report.assessor==='reader'?'reader_report':report.assessor==='ai'?'ai_assessment':'external_check');
  a.outcome={...observation,event:e.id};
  if(!a.finished)s.block.completed++; a.finished=true;
  // Replay only this unchanged question's retained observations, in experienced
  // order. A delayed assessment can arrive after another study reviewed it.
  const replay=reviews=>{
    q.card=null;q.reviews=[];let mapped;
    for(const r of reviews.sort((x,y)=>+new Date(x.at)-+new Date(y.at))){const result=scheduler.observe(q,r,new Date(r.at));if(r.attempt===a.id)mapped=result;}
    return mapped;
  };
  if(q && report.correction && q.reviews.some(r=>r.attempt===a.id)) {
    replay(q.reviews.map(r=>r.attempt===a.id?{...r,...observation}:r));
    recorder.record('review.correction',{attempt:a.id,corrects:e.data.corrects,after:q.card,evidence:e.id,chronological_replay:true});
  } else if(q) {
    const when=new Date(submission.submitted_at||submission.at);
    const later=q.reviews?.some(r=>+new Date(r.at)>+when);
    let mapped;
    if(later&&q.kept&&!q.retired&&readerRecall(observation)){
      mapped=replay([...q.reviews,{...observation,at:when.toISOString()}]);
      recorder.record('review.mapping',{attempt:a.id,...mapped,after:q.card,evidence:e.id,chronological_replay:true,reason:'Original submission predates a retained review; subsequent scheduler observations replayed.'},'derived_estimate');
    }else{mapped=scheduler.observe(q,observation,when);recorder.record('review.mapping',{attempt:a.id,...mapped,evidence:e.id},'derived_estimate');}
  }
  return e;
}
function adaptation(s, rating, events, attempt=s.current?.id) {
  if(!attempt||!Number.isInteger(rating)||rating<1||rating>9)return null;
  const effort=events.filter(e=>e.action==='effort.response'&&e.identity?.study===s.id&&e.data.attempt===attempt&&e.data.rating===rating&&e.evidence==='reader_report').at(-1);
  if(!effort)return null;
  const projected=projectAttempts(events).attempts.filter(a=>a.study===s.id&&a.origin===effort.origin&&a.anchor&&a.observation&&readerRecall(a.observation));
  const current=projected.find(a=>a.id===attempt);if(!current)return null;
  // The rating concerns this attempt. Never combine it with a later/different task.
  const rows=projected.filter(a=>(a.anchor.at||'')<=(current.anchor.at||'')).slice(-3),last=current.observation;
  const evidence=[...rows.map(a=>a.assessment.id),effort.id];
  if(rating>=7&&unaidedRecall(last))return {reason:'High reader-reported effort with reader-confirmed recall success: preserve the challenge.',choices:['continue','pause'],evidence,attempt};
  if(rating>=7&&rows.filter(a=>['help_dependent','unresolved'].includes(a.observation.outcome)).length>=2)return {reason:'High reader-reported effort and repeated reader-reported difficulty on this material.',choices:['smaller_step','prerequisite','worked_example','pause','continue'],evidence,attempt};
  if(rating<=3&&last.outcome==='unresolved')return {reason:'Low reader-reported effort with unresolved recall; offer clarification without inferring fatigue.',choices:['clarification','prerequisite','continue'],evidence,attempt};
  if(rows.length>=2&&rows.slice(-2).every(a=>unaidedRecall(a.observation)))return {reason:'Repeated reader-confirmed unaided recall success.',choices:['less_guidance','changed_example','continue'],evidence,attempt};
  return null;
}
function questionHandoff(s, purpose='questions', submitted=null) {
  const sources=signature(s.passages);
  const example={version:1,sources,questions:[{activity:'missing_step',prompt:'A specific question about the selected passage',answer:{text:'A proposed answer grounded in the passage',author:'Codex companion',origin:'ai_proposal'},hints:[],references:[sources[0].reference],author:'Codex companion',origin:'ai_proposal'}]};
  const parts=['# '+s.title,'Purpose: '+purpose,'Unresolved question: '+(s.unresolved||'Study the selected material.')];
  if(purpose==='questions')parts.push('Propose up to ten pertinent questions. Return only the bounded JSON object below, with these exact sources and references. Allowed activities: '+ACTIVITIES.join(', ')+'.',
    'Do not claim mathematical checking. A reference answer may be null. Hints: at most four strings. Keep attribution. Questions are not admitted to review automatically.',JSON.stringify(example,null,2));
  else parts.push('Give an attributed explanation or hint about the selected task in ordinary prose. Identify any unsupported step. This is a proposal, not mathematical checking. No graph or question JSON is needed.');
  for(const p of s.passages){const fence=String.fromCharCode(96).repeat(Math.max(4,...(p.text.match(/\x60+/g)||[]).map(s=>s.length+1)));parts.push(p.label,p.reference,'Source revision: '+p.source_revision,'Authors: '+(p.authors||'unrecorded'),fence,p.text,fence);}
  if(s.current){parts.push('Current question: '+s.current.question.prompt,'Attempt: '+s.current.id);if(purpose!=='questions'){
    const latest=s.current.submissions?.at(-1);
    parts.push('Current unsent draft (may differ from submitted work):',s.current.draft||'(empty)');
    if(latest){parts.push('Latest immutable submission: '+latest.event+'; snapshot: '+latest.snapshot);parts.push(submitted&&typeof submitted.answer==='string'?'Exact submitted work:\n'+submitted.answer:'Exact submitted text was not available to this handoff; the current draft is not a substitute.');}
    else parts.push('No immutable submission has been made. This request includes the current unsent draft only.');
    parts.push('Requested help is an attributed proposal, not an assessment of unaided recall.');
  }}

  return parts.join('\n\n');
}
module.exports={createStudy,question,signature,identity,block,begin,submit,outcome,adaptation,questionHandoff,ACTIVITIES};
