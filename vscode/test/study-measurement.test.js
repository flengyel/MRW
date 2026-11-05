'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const model=require('../src/studyModel'),{StudyHistory,summarize,selectHistoryContext}=require('../src/studyHistory');
const {projectAttempts,readerRecall,unaidedRecall}=require('../src/studyEvidence'),scheduler=require('../src/studyScheduler');
const passage={reference:'selected-ref',source_revision:'a'.repeat(64),text:'Let n be an integer. Then n + 0 = n.',label:'Integer identity'};
const value={activity:'definition',prompt:'State the identity.',answer:null,hints:[],references:[passage.reference],author:'Reader',origin:'human'};
function fixture(){
 const s=model.createStudy([passage],'/fixture'),q=model.question(value,s.passages);q.kept=true;s.questions.push(q);s.block=model.block({newQuestions:3});
 const h={events:[],context:{},software:{version:'0.18.0',commit:'old'},session:'old-session',at:'2026-11-01T12:00:00Z',setContext(c){this.context=structuredClone(c);},snapshot(v){return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');},record(action,data={},evidence='observed_action'){const e={id:crypto.randomUUID(),at:this.at,sequence:this.events.length+1,session:this.session,origin:'fixture',software:structuredClone(this.software),identity:structuredClone(this.context),action,data:structuredClone(data),evidence};this.events.push(e);return e;}};
 return {s,q,h};
}
function start(f,at){f.h.at=at;model.begin(f.s,f.q,'fixture',f.h,new Date(at));}
function submit(f,at,text='n + 0 = n'){f.h.at=at;return model.submit(f.s,text,false,f.h,new Date(at));}
const report=(outcome='unaided_success',extra={})=>({outcome,assessor:'reader',consulted:false,...extra});
function effort(f,rating,attempt=f.s.current.id){return f.h.record('effort.response',{attempt,rating,offer:'offer'},'reader_report');}
test('linked corrections resolve before release grouping; submissions, assessments and IDs have distinct denominators',()=>{
 const f=fixture();start(f,'2026-11-01T12:00:00Z');submit(f,'2026-11-01T12:01:00Z');model.outcome(f.s,report(),f.h);
 f.h.software={version:'0.19.0',commit:'new'};f.h.session='new-session';f.h.at='2026-11-05T12:00:00Z';model.outcome(f.s,report('unresolved',{correction:true}),f.h);
 const rows=[...f.h.events,f.h.events.find(e=>e.action==='attempt.submit')],p=projectAttempts(rows);assert.equal(p.attempts.length,1);assert.equal(p.attempts[0].submissions.length,1);assert.equal(p.attempts[0].assessments.length,2);assert.equal(p.attempts[0].observation.outcome,'unresolved');
 const summary=summarize(rows),old=summary.split('## fixture · 0.18.0 · old')[1].split('## fixture · 0.19.0 · new')[0],next=summary.split('## fixture · 0.19.0 · new')[1];
 assert.match(old,/Attempts: 1; Submissions: 1/);assert.match(old,/unresolved: 1\/1/);assert.match(old,/2026-11-05T12:00:00Z; 0.19.0 \/ new; linked correction/);assert.match(next,/Attempts: 0; Submissions: 0/);assert.match(next,/corrections: 1/);assert.doesNotMatch(summary,/Adaptation accepted/);
});
test('selected history adds only explicitly linked attempt context and identifies missing correction context',()=>{
 const f=fixture();start(f,'2026-11-01T12:00:00Z');submit(f,'2026-11-01T12:01:00Z');model.outcome(f.s,report(),f.h);
 const unrelated={...f.h.events[0],id:'unrelated',identity:{study:'another-study',attempt:'another-attempt'}};
 f.h.software={version:'0.19.0',commit:'new'};f.h.session='new-session';f.h.at='2026-11-05T12:00:00Z';model.outcome(f.s,report('unresolved',{correction:true}),f.h);
 const selected=selectHistoryContext([...f.h.events,unrelated],['new-session']);assert.equal(selected.missing.length,0);assert.equal(selected.events.some(e=>e.id==='unrelated'),false);assert.equal(selected.events.filter(e=>e.export_context.role==='supporting').length,3);assert.equal(projectAttempts(selected.events).attempts[0].observation.outcome,'unresolved');
 const reverse=selectHistoryContext(f.h.events,['old-session']);assert.equal(reverse.events.filter(e=>e.export_context.role==='supporting').length,1);
 const partial=selectHistoryContext(f.h.events.filter(e=>!['attempt.begin','attempt.submit','attempt.outcome'].includes(e.action)),['new-session']);assert.ok(partial.missing.length);assert.equal(projectAttempts(partial.events).attempts[0].observation,undefined);assert.match(summarize(partial.events),/Missing linked context/);
});
test('experienced recall delay is fixed to each immutable submission, not delayed assessment, correction or restart clocks',()=>{
 const f=fixture();start(f,'2026-11-01T12:00:00Z');submit(f,'2026-11-01T12:01:00Z');f.h.at='2026-11-02T12:01:00Z';model.outcome(f.s,report(),f.h);assert.equal(f.q.reviews[0].at,'2026-11-01T12:01:00.000Z');
 start(f,'2026-11-03T12:00:00Z');submit(f,'2026-11-03T12:01:00Z','first revision');submit(f,'2026-11-03T13:01:00Z','second revision');
 f.h.at='2026-11-04T12:00:00Z';model.outcome(f.s,report(),f.h);const days=2+1/24;assert.equal(f.s.current.outcome.delayed_days,days);assert.equal(f.q.reviews[1].submission_at,'2026-11-03T13:01:00.000Z');
 f.s=JSON.parse(JSON.stringify(f.s));f.q=f.s.questions[0];f.h.at='2026-12-01T12:00:00Z';model.outcome(f.s,report('unresolved',{correction:true}),f.h);assert.equal(f.s.current.outcome.delayed_days,days);assert.equal(f.q.reviews.length,2);assert.equal(f.q.reviews[1].at,'2026-11-03T13:01:00.000Z');assert.equal(f.q.reviews[1].delayed_days,days);
 const projected=projectAttempts(f.h.events).attempts.at(-1);assert.equal(projected.observation.delayed_days,days);assert.equal(projected.submissions.length,2);
});
test('legacy assessment timestamps do not fabricate experienced delay',()=>{
 const f=fixture();f.q.reviews=[{attempt:'legacy',at:'2026-10-01T12:00:00Z'}];start(f,'2026-11-01T12:00:00Z');submit(f,'2026-11-01T12:01:00Z');model.outcome(f.s,report(),f.h);assert.equal(f.s.current.outcome.delayed_days,null);assert.equal(f.s.current.outcome.timing_known,false);
 const old=f.h.events.map(e=>e.action==='attempt.submit'?{...e,data:{...e.data,timing_known:undefined,delayed_days:100}}:e);assert.equal(projectAttempts(old).attempts[0].observation.delayed_days,null);
});
test('adaptation excludes AI, unknown consultation, application and effort belonging to a different attempt',()=>{
 const f=fixture();for(let i=0;i<2;i++){start(f,`2026-11-0${i+1}T12:00:00Z`);submit(f,`2026-11-0${i+1}T12:01:00Z`);model.outcome(f.s,report('unaided_success',{assessor:'ai',author:'Companion',consulted:null}),f.h);effort(f,4);}assert.equal(model.adaptation(f.s,4,f.h.events),null);
 const r=fixture();for(let i=0;i<2;i++){start(r,`2026-11-0${i+1}T12:00:00Z`);submit(r,`2026-11-0${i+1}T12:01:00Z`);model.outcome(r.s,report(),r.h);}effort(r,4,'different-task');assert.equal(model.adaptation(r.s,4,r.h.events),null);effort(r,4);assert.ok(model.adaptation(r.s,4,r.h.events).choices.includes('less_guidance'));
 assert.equal(readerRecall({...r.s.current.outcome,consulted:null}),false);assert.equal(readerRecall({...r.s.current.outcome,activity:'application'}),false);assert.equal(unaidedRecall({...r.s.current.outcome,help_visible:true}),false);
});
test('source/help opportunity is frozen per submission and a later independent attempt clears it',()=>{
 const f=fixture();start(f,'2026-11-01T12:00:00Z');submit(f,'2026-11-01T12:01:00Z');f.s.current.helpExposures.push('retained-response');model.outcome(f.s,report(),f.h);assert.equal(f.s.current.outcome.help_visible,false);
 start(f,'2026-11-02T12:00:00Z');assert.deepEqual(f.s.current.helpExposures,[]);f.s.current.helpExposures.push('retained-response');submit(f,'2026-11-02T12:01:00Z');assert.throws(()=>model.outcome(f.s,report(),f.h),/used help/);model.outcome(f.s,report('help_dependent'),f.h);assert.equal(f.s.current.outcome.help_visible,true);
 start(f,'2026-11-03T12:00:00Z');submit(f,'2026-11-03T12:01:00Z');model.outcome(f.s,report(),f.h);assert.equal(f.s.current.outcome.help_visible,false);
});
test('handoff labels current draft separately from exact immutable submitted work',()=>{
 const f=fixture();start(f,'2026-11-01T12:00:00Z');submit(f,'2026-11-01T12:01:00Z','Original immutable work');f.s.current.draft='Unsent revision';
 const text=model.questionHandoff(f.s,'hint',{answer:'Original immutable work'});assert.match(text,/Current unsent draft/);assert.match(text,/Unsent revision/);assert.match(text,/Latest immutable submission/);assert.match(text,/Exact submitted work:\nOriginal immutable work/);assert.doesNotMatch(text,/Submitted work: Unsent revision/);
 assert.match(model.questionHandoff(f.s,'hint'),/Exact submitted text was not available/);
});

test('linked corrections survive wall-clock reversal and missing parents exclude unsupported outcomes',()=>{
 const f=fixture();start(f,'2026-11-01T12:00:00Z');submit(f,'2026-11-01T12:01:00Z');model.outcome(f.s,report(),f.h);
 f.h.at='2026-10-31T12:00:00Z';model.outcome(f.s,report('unresolved',{correction:true}),f.h);assert.equal(projectAttempts(f.h.events).attempts[0].observation.outcome,'unresolved');
 const broken=f.h.events.map(e=>e.action==='attempt.correction'?{...e,data:{...e.data,corrects:'missing-parent'}}:e);const a=projectAttempts(broken).attempts[0];assert.equal(a.observation,undefined);assert.ok(a.missing.length);assert.match(summarize(broken),/assessed attempts: 0/);
});
test('same-attempt source concealment after exposure cannot become unaided recall',()=>{
 const f=fixture();start(f,'2026-11-01T12:00:00Z');f.s.current.sourceVisible=false;f.s.current.sourceExposed=true;submit(f,'2026-11-01T12:01:00Z');assert.throws(()=>model.outcome(f.s,report(),f.h),/used help/);assert.equal(f.s.current.submissions[0].source_visible,false);assert.equal(f.s.current.submissions[0].source_exposed,true);
});
test('practice identity stays separate from production evidence',()=>{
 const f=fixture();f.s.practice=true;const identity=model.identity(f.s);assert.equal(identity.practice,true);
 const h=new StudyHistory('/unused-practice-test',{version:'test',commit:'test'});h.setContext(identity);assert.equal(h.record('attempt.begin').origin,'practice_demo');clearTimeout(h.timer);
 const automated=new StudyHistory('/unused-practice-test',{version:'test',commit:'test'},{origin:'automated_test'});automated.setContext(identity);assert.equal(automated.record('attempt.begin').origin,'automated_test');clearTimeout(automated.timer);
});

test('a reversed or invalid clock does not fabricate a zero-day experienced interval',()=>{
 const f=fixture();f.q.reviews=[{attempt:'earlier-review',submission_at:'2026-11-02T12:00:00Z',at:'2026-11-02T12:00:00Z'}];start(f,'2026-11-01T12:00:00Z');submit(f,'2026-11-01T12:01:00Z');assert.equal(f.s.current.submissions[0].delayed_days,null);assert.equal(f.s.current.submissions[0].timing_known,false);
});

test('late assessment of an earlier submission replays a subsequent shared-question review in experienced order',()=>{
 const f=fixture();start(f,'2026-11-01T12:00:00Z');submit(f,'2026-11-01T12:01:00Z');model.outcome(f.s,report(),f.h);
 start(f,'2026-11-02T12:00:00Z');submit(f,'2026-11-02T12:01:00Z');const earlier=f.s.current.id;
 const later={attempt:'another-study-review',activity:'definition',outcome:'unaided_success',assessor:'reader',consulted:false,hints:0,answer_visible:false,source_visible:false,submission_at:'2026-11-03T12:01:00Z'};
 scheduler.observe(f.q,later,new Date(later.submission_at));f.h.at='2026-11-05T12:00:00Z';model.outcome(f.s,report(),f.h);
 assert.equal(f.s.current.outcome.delayed_days,1);assert.deepEqual(f.q.reviews.map(r=>r.attempt),[f.q.reviews[0].attempt,earlier,'another-study-review']);assert.equal(f.q.card.last_review.toISOString(),'2026-11-03T12:01:00.000Z');
 f.h.at='2026-11-06T12:00:00Z';model.outcome(f.s,report('unresolved',{correction:true}),f.h);assert.equal(f.q.reviews.length,3);assert.equal(f.q.reviews[1].rating,1);assert.equal(f.q.reviews[1].delayed_days,1);assert.equal(f.q.card.last_review.toISOString(),'2026-11-03T12:01:00.000Z');
});
