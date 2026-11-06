'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const model=require('../src/studyModel'),scheduler=require('../src/studyScheduler');
const {projectEffort,selectHistoryContext}=require('../src/studyEvidence');
const passage={reference:'fixture-source',source_revision:'a'.repeat(64),text:'For every natural number n, n + 0 = n.',label:'Identity'};
function fixture(){
 const s=model.createStudy([passage],'/fixture'),q=model.question({activity:'definition',prompt:'State the identity.',answer:null,hints:[],references:[passage.reference],author:'Reader',origin:'human'},s.passages);q.kept=true;s.questions.push(q);s.block=model.block({newQuestions:3});
 const h={events:[],context:{},at:'2026-11-01T12:00:00Z',setContext(c){this.context=structuredClone(c);},snapshot(v){return crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');},record(action,data={},evidence='observed_action'){const e={id:crypto.randomUUID(),at:this.at,session:'fixture-session',sequence:this.events.length+1,origin:'developer_fixture',software:{version:'fixture',commit:'fixture'},identity:structuredClone(this.context),action,data:structuredClone(data),evidence};this.events.push(e);return e;}};
 return {s,q,h};
}
function review(f,day,outcome='unaided_success'){
 f.h.at=`2026-11-${String(day).padStart(2,'0')}T12:00:00Z`;model.begin(f.s,f.q,'fixture',f.h,new Date(f.h.at));
 f.h.at=`2026-11-${String(day).padStart(2,'0')}T12:01:00Z`;model.submit(f.s,'n + 0 = n',false,f.h,new Date(f.h.at));model.outcome(f.s,{outcome,assessor:'reader',consulted:false},f.h);
}
test('retirement suspends selection while historical correction survives reload and re-enrollment',()=>{
 const f=fixture();review(f,1);review(f,2);const ids=f.q.reviews.map(r=>r.attempt);f.q.retired=true;f.q.kept=false;
 f.h.at='2026-11-05T12:00:00Z';model.outcome(f.s,{outcome:'unresolved',assessor:'reader',consulted:false,correction:true},f.h);
 assert.deepEqual(f.q.reviews.map(r=>r.attempt),ids);assert.deepEqual(f.q.reviews.map(r=>r.rating),[3,1]);assert.ok(f.q.card);assert.equal(f.q.retired,true);assert.equal(f.q.kept,false);
 const restored=JSON.parse(JSON.stringify(f.s)),q=restored.questions[0],when=+new Date('2027-11-01T00:00:00Z');
 assert.equal(scheduler.select([q],model.block({newQuestions:3},when),when).question,null);
 assert.equal(scheduler.observe(q,{...q.reviews[0],attempt:'new-while-retired'},new Date(when)).changed,false);
 q.retired=false;q.kept=true;assert.equal(scheduler.select([q],model.block({newQuestions:3},when),when).question,q);
 model.outcome(restored,{outcome:'unresolved',assessor:'reader',consulted:false,correction:true},f.h);
 assert.deepEqual(q.reviews.map(r=>r.attempt),ids);assert.equal(q.reviews.length,2);assert.equal(q.card.last_review.toISOString(),'2026-11-02T12:01:00.000Z');
});
test('a correction excluded from recall can later be corrected back without losing its original admitted observation',()=>{
 const f=fixture();review(f,1);review(f,2);const original=f.q.reviews[1];f.q.retired=true;f.q.kept=false;
 model.outcome(f.s,{outcome:'unassessed',assessor:'reader',consulted:null,correction:true},f.h);
 assert.equal(f.q.reviews.length,1);assert.equal(f.q.reviewObservations.length,2);
 const restored=JSON.parse(JSON.stringify(f.s));f.s=restored;f.q=restored.questions[0];
 model.outcome(f.s,{outcome:'unresolved',assessor:'reader',consulted:false,correction:true},f.h);
 assert.equal(f.q.reviews.length,2);assert.equal(f.q.reviews[1].attempt,original.attempt);assert.equal(f.q.reviews[1].at,original.at);assert.equal(f.q.reviews[1].rating,1);assert.equal(f.q.retired,true);
});
test('correcting an assessment withdraws an obsolete offer using its exact effort response',()=>{
 const f=fixture();review(f,1);review(f,2);
 const effort=f.h.record('effort.response',{attempt:f.s.current.id,offer:'effort-item',rating:4,disposition:'answered'},'reader_report');
 const proposed=model.adaptation(f.s,4,f.h.events);assert.ok(proposed.choices.includes('less_guidance'));
 const original=f.h.record('adaptation.offer',proposed,'derived_estimate');f.s.current.adaptation={...proposed,event:original.id};
 // Another report cannot replace the effort observation that supported this offer.
 f.h.record('effort.response',{attempt:f.s.current.id,offer:'different-item',rating:9,disposition:'answered'},'reader_report');
 model.outcome(f.s,{outcome:'unresolved',assessor:'reader',consulted:false,correction:true},f.h);
 const result=model.refreshAdaptation(f.s,f.h.events,f.h);
 assert.equal(result.changed,true);assert.equal(f.s.current.adaptation,null);
 const withdrawal=f.h.events.find(e=>e.action==='adaptation.withdrawal');assert.equal(withdrawal.data.offer,original.id);assert.equal(withdrawal.data.effort_response,effort.id);
 assert.ok(f.h.events.some(e=>e.id===original.id));assert.equal(f.h.events.filter(e=>e.action==='adaptation.offer').length,1);
 assert.equal(model.refreshAdaptation(f.s,f.h.events,f.h).changed,false);
});
test('corrected evidence supersedes an actionable offer without consuming a new effort rating',()=>{
 const f=fixture();review(f,1,'unresolved');review(f,2,'unresolved');
 const effort=f.h.record('effort.response',{attempt:f.s.current.id,offer:'effort-item',rating:9,disposition:'answered'},'reader_report');
 const proposed=model.adaptation(f.s,9,f.h.events),original=f.h.record('adaptation.offer',proposed,'derived_estimate');f.s.current.adaptation={...proposed,event:original.id};
 model.outcome(f.s,{outcome:'unaided_success',assessor:'reader',consulted:false,correction:true},f.h);
 const result=model.refreshAdaptation(f.s,f.h.events,f.h);assert.equal(result.changed,true);assert.deepEqual(result.adaptation.choices,['continue','pause']);
 assert.equal(result.adaptation.supersedes,original.id);assert.notEqual(result.adaptation.event,original.id);
 assert.equal(f.h.events.filter(e=>e.action==='effort.response').length,1);assert.equal(f.h.events.at(-1).data.effort_response,effort.id);
 assert.equal(model.refreshAdaptation(f.s,f.h.events,f.h).changed,false);
});
test('an effort answer resolves the task offer across release/session boundaries',()=>{
 const f=fixture();review(f,1);const offer=f.h.record('effort.offer',{attempt:f.s.current.id});
 f.h.record('effort.response',{attempt:f.s.current.id,offer:offer.id,disposition:'no_response',rating:null},'observed_action');
 const response=f.h.record('effort.response',{attempt:f.s.current.id,offer:offer.id,disposition:'answered',rating:7},'reader_report');response.session='resumed';response.software={version:'new',commit:'new'};response.at='2026-11-05T12:00:00Z';
 const all=projectEffort(f.h.events);assert.equal(all.missing.length,0);assert.equal(all.offers.length,1);assert.equal(all.offers[0].rating,7);assert.equal(all.offers[0].disposition,'answered');assert.equal(all.offers[0].anchor.software.version,'fixture');assert.equal(all.offers[0].response.software.version,'new');
 const exported=selectHistoryContext(f.h.events,['resumed']),record=projectEffort(exported.events).offers[0];assert.equal(exported.missing.length,0);assert.equal(record.supported,true);assert.equal(record.selected,true);assert.equal(record.offer.export_context.role,'supporting');assert.equal(record.response.export_context.role,'selected');assert.equal(record.rating,7);
});
test('supporting-only effort records do not become selected observations',()=>{
 const f=fixture();review(f,1);const offer=f.h.record('effort.offer',{attempt:f.s.current.id});
 const response=f.h.record('effort.response',{attempt:f.s.current.id,offer:offer.id,disposition:'declined',rating:null},'reader_report');offer.session='later';response.session='later';
 const exported=selectHistoryContext(f.h.events,['fixture-session']),record=projectEffort(exported.events).offers[0];assert.equal(record.supported,true);assert.equal(record.disposition,'declined');assert.equal(record.selected,false);
});
test('missing or cross-task effort links stay explicit instead of becoming numeric samples',()=>{
 const f=fixture();review(f,1);const offer=f.h.record('effort.offer',{attempt:f.s.current.id});
 f.h.record('effort.response',{attempt:'unrelated-attempt',offer:offer.id,disposition:'answered',rating:8},'reader_report');
 f.h.record('effort.response',{attempt:f.s.current.id,offer:'unknown-offer',disposition:'answered',rating:7},'reader_report');
 const p=projectEffort(f.h.events);assert.equal(p.offers[0].rating,null);assert.equal(p.offers[0].disposition,'no_response');assert.equal(p.missing.length,2);
 const noAnchor=projectEffort(f.h.events.filter(e=>!['attempt.begin','attempt.submit'].includes(e.action)));assert.equal(noAnchor.offers[0].supported,false);assert.ok(noAnchor.missing.some(m=>m.reason.includes('task context')));
});
test('history context follows explicit adaptation evidence without selecting another task',()=>{
 const f=fixture();review(f,1);const previous=f.s.current.outcome.event;review(f,2);const offer=f.h.record('effort.offer',{attempt:f.s.current.id});
 const response=f.h.record('effort.response',{attempt:f.s.current.id,offer:offer.id,disposition:'answered',rating:4},'reader_report');
 const adaptation=f.h.record('adaptation.offer',{attempt:f.s.current.id,evidence:[previous,f.s.current.outcome.event,response.id]},'derived_estimate');adaptation.session='only-adaptation';
 const selected=selectHistoryContext(f.h.events,['only-adaptation']);assert.equal(selected.events.find(e=>e.id===previous).export_context.role,'supporting');assert.equal(selected.events.filter(e=>e.export_context.role==='selected').length,1);
 assert.equal(selected.missing.length,0);
});
