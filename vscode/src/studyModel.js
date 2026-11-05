'use strict';
const crypto = require('node:crypto');
const { hash } = require('./studyHistory'), scheduler = require('./studyScheduler');
const ACTIVITIES = ['definition','hypotheses','missing_step','argument','application'];
const signature = passages => passages.map(p => ({ reference:p.reference, source_revision:p.source_revision, sha256:hash(p.text) }));
const identity = s => ({ study:s.id, sources:signature(s.passages), question:s.current?{id:s.current.question.id,revision:s.current.question.revision,activity:s.current.question.activity}:null, attempt:s.current?.id });
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
function begin(s, q, reason, recorder) {
  if(s.current && !s.current.finished) throw new Error('Submit, skip or pause the current attempt before changing questions.');
  if(s.current?.effortOffer?.disposition==='no_response')recorder.record('effort.response',{attempt:s.current.id,offer:s.current.effortOffer.id,disposition:'no_response',rating:null,reason:'Moved to another attempt.'},'observed_action');
  const now=new Date().toISOString();
  s.current={id:crypto.randomUUID(),question:structuredClone(q),begun:now,draft:'',paper:false,hints:[],answerVisible:false,sourceVisible:false,submissions:[],outcome:null,finished:false,effortOffer:null};
  s.block.seen.push(q.revision); if(!q.reviews?.length)s.block.newCount++;
  recorder.setContext(identity(s)); recorder.record('question.offered',{reason,block:s.block.id}); recorder.record('attempt.begin');
}
function submit(s, text, paper, recorder) {
  const a=s.current;if(!a||a.finished)throw new Error('Begin an unfinished question first.');
  if(typeof text!=='string'||Buffer.byteLength(text)>64*1024||(!paper&&!text.trim()))throw new Error('Enter an answer or choose paper work.');
  const snapshot=recorder.snapshot({attempt:a.id,question:a.question,answer:text,paper:!!paper,
    hints:[...a.hints],answer_visible:a.answerVisible,source_visible:a.sourceVisible,sequence:a.submissions.length+1});
  const event=recorder.record('attempt.submit',{attempt:a.id,snapshot,submission:a.submissions.length+1,paper:!!paper,
    hints:a.hints.length,answer_visible:a.answerVisible,source_visible:a.sourceVisible,previous:a.submissions.at(-1)?.event||null});
  a.draft=text;a.paper=!!paper;a.submissions.push({snapshot,event:event.id,hints:a.hints.length,answer_visible:a.answerVisible,source_visible:a.sourceVisible,at:event.at});
  return event;
}
function outcome(s, report, recorder, bank=s.questions) {
  const a=s.current, submission=a?.submissions.at(-1);
  if(!a||!submission)throw new Error('Submit the typed or paper attempt first.');
  if(!['unaided_success','help_dependent','unresolved','unassessed'].includes(report.outcome)||!['reader','ai','external'].includes(report.assessor)||![true,false,null].includes(report.consulted))throw new Error('Choose an outcome and its assessor.');
  if(report.assessor!=='reader'&&(typeof report.author!=='string'||!report.author.trim()))throw new Error('Identify the assessment author.');
  if(report.assessor==='external')throw new Error('External checking must be recorded through the existing checked-record workflow.');
  if(a.finished&&!report.correction)throw new Error('This attempt already has an outcome. Use Correct outcome.');
  if(report.outcome==='unaided_success'&&(submission.hints||submission.answer_visible||report.consulted===true))throw new Error('This submission used help. Choose help-dependent completion or unresolved.');
  const q=bank.find(q=>q.id===a.question.id&&q.revision===a.question.revision);
  const previous=q?.reviews?.at(-1), observation={attempt:a.id,activity:a.question.activity,...report,hints:submission.hints,
    answer_visible:submission.answer_visible,source_visible:submission.source_visible,submission:submission.event,
    delayed_days:previous?Math.max(0,(Date.now()-+new Date(previous.at))/86400000):null};
  const e=recorder.record(report.correction?'attempt.correction':'attempt.outcome',{...observation,corrects:report.correction?a.outcome?.event:null},report.assessor==='reader'?'reader_report':report.assessor==='ai'?'ai_assessment':'external_check');
  a.outcome={...observation,event:e.id};
  if(!a.finished)s.block.completed++; a.finished=true;
  // A correction invalidates the earlier mapped scheduler observation and replays
  // the unchanged question's original observations; it never appends a second review.
  if(q && report.correction && q.reviews.some(r=>r.attempt===a.id)) {
    const reviews=q.reviews.map(r=>r.attempt===a.id?{...r,...observation}:r);q.card=null;q.reviews=[];
    for(const r of reviews)scheduler.observe(q,r,new Date(r.at));
    recorder.record('review.correction',{attempt:a.id,corrects:e.data.corrects,after:q.card,evidence:e.id});
  } else if(q) { const mapped=scheduler.observe(q,observation); recorder.record('review.mapping',{attempt:a.id,...mapped,evidence:e.id},'derived_estimate'); }
  return e;
}
function adaptation(s, rating, events) {
  const same=events.filter(e=>e.identity.study===s.id&&['attempt.outcome','attempt.correction'].includes(e.action));
  const latest=new Map();for(const e of same)latest.set(e.data.attempt,e);
  const rows=[...latest.values()].slice(-3), evidence=rows.map(e=>e.id), last=rows.at(-1)?.data;
  if(!last||!Number.isInteger(rating))return null;
  if(rating>=7&&last.outcome==='unaided_success')return {reason:'High reported effort with success: preserve the challenge.',choices:['continue','pause'],evidence};
  if(rating>=7&&rows.filter(e=>['help_dependent','unresolved'].includes(e.data.outcome)).length>=2)return {reason:'High reported effort and repeated difficulty on this material.',choices:['smaller_step','prerequisite','worked_example','pause','continue'],evidence};
  if(rating<=3&&last.outcome==='unresolved')return {reason:'Low reported effort with unresolved work; offer clarification without inferring fatigue.',choices:['clarification','prerequisite','continue'],evidence};
  if(rows.length>=2&&rows.slice(-2).every(e=>e.data.outcome==='unaided_success'))return {reason:'Repeated reported unaided success.',choices:['less_guidance','changed_example','continue'],evidence};
  return null;
}
function questionHandoff(s, purpose='questions') {
  const sources=signature(s.passages);
  const example={version:1,sources,questions:[{activity:'missing_step',prompt:'A specific question about the selected passage',answer:{text:'A proposed answer grounded in the passage',author:'Codex companion',origin:'ai_proposal'},hints:[],references:[sources[0].reference],author:'Codex companion',origin:'ai_proposal'}]};
  const parts=['# '+s.title,'Purpose: '+purpose,'Unresolved question: '+(s.unresolved||'Study the selected material.')];
  if(purpose==='questions')parts.push('Propose up to ten pertinent questions. Return only the bounded JSON object below, with these exact sources and references. Allowed activities: '+ACTIVITIES.join(', ')+'.',
    'Do not claim mathematical checking. A reference answer may be null. Hints: at most four strings. Keep attribution. Questions are not admitted to review automatically.',JSON.stringify(example,null,2));
  else parts.push('Give an attributed explanation or hint about the selected task in ordinary prose. Identify any unsupported step. This is a proposal, not mathematical checking. No graph or question JSON is needed.');
  for(const p of s.passages){const fence=String.fromCharCode(96).repeat(Math.max(4,...(p.text.match(/\x60+/g)||[]).map(s=>s.length+1)));parts.push(p.label,p.reference,'Source revision: '+p.source_revision,'Authors: '+(p.authors||'unrecorded'),fence,p.text,fence);}
  if(s.current){parts.push('Current question: '+s.current.question.prompt);if(purpose!=='questions')parts.push('Submitted work: '+s.current.draft,'Requested help is an attributed proposal, not an assessment of unaided recall.');}

  return parts.join('\n\n');
}
module.exports={createStudy,question,signature,identity,block,begin,submit,outcome,adaptation,questionHandoff,ACTIVITIES};
