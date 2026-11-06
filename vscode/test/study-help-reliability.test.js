'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const help=require('../src/studyHelp'),model=require('../src/studyModel');
const {hash}=require('../src/studyHistory');
function fixture(){
  const s={passages:[{reference:'exact:source',source_revision:'revision-1',text:'Retained mathematical passage.'}],current:{id:'attempt-1',question:{id:'question-1',revision:'question-revision'},submissions:[]},help:[]};
  let next=0;const snapshots=new Map(),events=[];
  const recorder={snapshot:value=>{const id=hash(JSON.stringify(value));snapshots.set(id,structuredClone(value));return id;},
    record:(action,data)=>{const event={id:'event-'+(++next),action,data:structuredClone(data)};events.push(event);return event;}};
  return{s,recorder,events,snapshots};
}
function retain(s,recorder,text){s.helpDraft=help.paste(s,text);const result=help.retain(s,{...s.helpDraft},recorder);s.helpDraft=null;return result;}

test('all help replacement routes preserve a pending pasted or edited response until retained or discarded',()=>{
  const {s,recorder}=fixture(),a=retain(s,recorder,'Original response A.');
  s.helpDraft=help.paste(s,'Original response B.');s.helpDraft.text='Reader correction to response B.';s.helpDraft.author='Reader';s.helpDraft.origin='human';
  const pending=structuredClone(s.helpDraft);
  assert.throws(()=>help.edit(s,a.id),/Retain or discard/);assert.deepEqual(s.helpDraft,pending);
  assert.throws(()=>help.paste(s,'Replacement C.'),/Retain or discard/);assert.deepEqual(s.helpDraft,pending);
  const b=help.retain(s,s.helpDraft,recorder);assert.equal(b.original.text,'Original response B.');assert.equal(b.text,'Reader correction to response B.');
  s.helpDraft=null;s.helpDraft=help.edit(s,a.id);assert.equal(s.helpDraft.previous,a.id);assert.equal(s.helpDraft.original.text,'Original response A.');
  s.helpDraft.text='';assert.throws(()=>help.edit(s,b.id),/Retain or discard/,'an empty text field remains an owned draft');
});

test('multiple help requests require an explicit association and preserve reverse replies, unrelated help and restart',()=>{
  const {s,recorder,snapshots}=fixture();
  const r1=help.request(s,'explain the first equality','Exact request one.',recorder,'adaptation-choice-1','request-1');
  const r2=help.request(s,'give a new example','Exact request two.',recorder,'adaptation-choice-2','request-2');
  s.helpDraft=help.paste(s,'Reply to the second request.');assert.equal(s.helpDraft.request,null);assert.equal(s.helpDraft.adaptation,null);
  help.associate(s,s.helpDraft,r2.id);const second=help.retain(s,s.helpDraft,recorder);s.helpDraft=null;
  s.helpDraft=help.paste(s,'Reply to the first request.');help.associate(s,s.helpDraft,r1.id);const first=help.retain(s,s.helpDraft,recorder);s.helpDraft=null;
  const unrelated=retain(s,recorder,'An unrelated explanation.');
  assert.deepEqual([second.request,second.adaptation],['request-2','adaptation-choice-2']);
  assert.deepEqual([first.request,first.adaptation],['request-1','adaptation-choice-1']);
  assert.equal(unrelated.request,null);assert.equal(unrelated.adaptation,null);
  const reopened=JSON.parse(JSON.stringify(s));assert.deepEqual(reopened.help.map(r=>r.request),['request-2','request-1',null]);
  assert.equal(snapshots.get(first.snapshot).request,'request-1');assert.equal(snapshots.get(first.snapshot).adaptation,'adaptation-choice-1');
});

test('single request is associated automatically; explicit removal and attributed reassociation retain original bytes',()=>{
  const {s,recorder,snapshots}=fixture();help.request(s,'explain the step','Exact request.',recorder,'adaptation-1','request-1');
  const original=retain(s,recorder,'Exact original companion text.');assert.equal(original.request,'request-1');assert.equal(original.association.method,'single_request');
  s.helpDraft=help.edit(s,original.id);help.associate(s,s.helpDraft,null);const revised=help.retain(s,s.helpDraft,recorder);
  assert.equal(revised.previous,original.id);assert.equal(revised.request,null);assert.equal(revised.adaptation,null);
  assert.deepEqual(revised.association,{method:'unassociated',author:'Reader',origin:'human'});
  assert.equal(original.request,'request-1');assert.equal(revised.original.text,'Exact original companion text.');
  assert.equal(snapshots.get(revised.original.snapshot).text,'Exact original companion text.');
});

test('request associations reject another attempt or source instead of borrowing its adaptation',()=>{
  const {s,recorder}=fixture();help.request(s,'first attempt','Request.',recorder,'adaptation-1','request-1');
  s.current.id='attempt-2';s.helpDraft=help.paste(s,'Reply.');assert.equal(s.helpDraft.request,null);
  assert.throws(()=>help.associate(s,s.helpDraft,'request-1'),/attempt and sources/);
  const wrong={id:'request-wrong-source',attempt:'attempt-2',purpose:'Other source',sources:model.signature([{reference:'different:source',source_revision:'r2',text:'Other.'}]),adaptation:'wrong'};
  s.helpRequests.push(wrong);assert.throws(()=>help.associate(s,s.helpDraft,wrong.id),/attempt and sources/);
  assert.throws(()=>help.associate(s,s.helpDraft,'missing'),/attempt and sources/);
  assert.equal(s.helpDraft.request,null);assert.equal(s.helpDraft.adaptation,null);
});
