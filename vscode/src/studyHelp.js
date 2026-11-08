'use strict';
const crypto=require('node:crypto');
const model=require('./studyModel');
const LIMIT=64*1024;
function content(value){
  if(!value||typeof value.text!=='string'||!value.text.trim()||Buffer.byteLength(value.text)>LIMIT||
    typeof value.author!=='string'||!value.author.trim()||value.author.length>160||!['human','ai_proposal'].includes(value.origin))
    throw new Error('Enter help text (up to 64 KiB), its author and attribution.');
  return {text:value.text,author:value.author,origin:value.origin};
}
function request(s,purpose,text,recorder,adaptation=null,id=crypto.randomUUID()){
  if((s.helpRequests||[]).length>=200)throw new Error('This study holds at most 200 help requests.');
  const a=s.current,latest=a?.submissions.at(-1),q=s.reviewedProblem||a?.question;
  const r={id,purpose,attempt:a?.id||null,question:q?{id:q.id,revision:q.revision}:null,
    sources:model.signature(s.passages),submission:latest?.event||null,adaptation,
    snapshot:recorder.snapshot({text}),at:new Date().toISOString()};
  (s.helpRequests||=[]).push(r);
  r.event=recorder.record('help.request',{...r,meaning:'Request copied; response, consultation and benefit are unobserved.'}).id;
  return r;
}
function assertReplaceable(s){
  if(s.helpDraft)throw new Error('Retain or discard the response draft before opening another response.');
}
function requests(s,attempt){
  const sources=JSON.stringify(model.signature(s.passages));
  const available=model.signature(s.passages);
  return (s.helpRequests||[]).filter(r=>r.attempt===attempt&&(s.document?
    r.sources.every(pin=>available.some(p=>JSON.stringify(p)===JSON.stringify(pin)))&&(!r.question||r.question.revision===s.problemRevision):JSON.stringify(r.sources)===sources));
}
function associate(s,draft,requestId,method='manual'){
  const selected=requestId===null?null:requests(s,draft.attempt).find(r=>r.id===requestId);
  if(requestId!==null&&!selected)throw new Error('Choose a help request for this response’s attempt and sources, or leave it unassociated.');
  draft.request=selected?.id||null;
  draft.adaptation=selected?.adaptation||null;
  draft.association={method:selected?method:'unassociated',author:'Reader',origin:'human'};
  return draft;
}
function paste(s,text){
  assertReplaceable(s);
  const original=content({text,author:'Codex companion',origin:'ai_proposal'});
  const draft={id:crypto.randomUUID(),...original,original,attempt:s.current?.id||null};
  const available=requests(s,draft.attempt);
  return associate(s,draft,available.length===1?available[0].id:null,'single_request');
}
function edit(s,id){
  assertReplaceable(s);
  const old=s.help?.find(h=>h.id===id);if(!old)throw new Error('Retained help was not found.');
  return {...old,id:crypto.randomUUID(),previous:old.id,original:old.original};
}
function retain(s,value,recorder){
  const draft=s.helpDraft;if(!draft)throw new Error('Paste a response or edit retained help first.');
  const data=content(value),original=content(draft.original||draft);
  if(Object.hasOwn(value,'request'))associate(s,draft,value.request,
    value.request===draft.request?(draft.association?.method||'manual'):'manual');
  // A legacy association is retained unless the reader explicitly changes it.
  const association=draft.association?structuredClone(draft.association):{method:'legacy_manual',author:'Reader',origin:'human'};
  if((s.help||[]).length>=64&&!s.help.some(h=>h.id===draft.id))throw new Error('This study holds at most 64 help responses and revisions.');
  // Retry after an unconfirmed checkpoint keeps the same response identity.
  let response=s.help?.find(h=>h.id===draft.id);
  if(response){
    if(JSON.stringify(content(response))===JSON.stringify(data)&&response.request===(draft.request||null)&&response.adaptation===(draft.adaptation||null))return response;
    if(response.event)throw new Error('Edit retained help as a separately attributed revision.');
    // Only this draft's unconfirmed entry can change after a failed checkpoint.
    s.help=s.help.filter(h=>h!==response);
  }
  response={id:draft.id,attempt:draft.attempt,request:draft.request||null,adaptation:draft.adaptation||null,association,
    sources:model.signature(s.passages),original:{...original,snapshot:recorder.snapshot(original)},...data,
    previous:draft.previous||null,at:new Date().toISOString()};
  response.snapshot=recorder.snapshot({...data,original:response.original,previous:response.previous,request:response.request,
    attempt:response.attempt,adaptation:response.adaptation,association});
  (s.help||=[]).push(response);
  return response;
}
function reveal(s,id,recorder){
  const h=s.help?.find(h=>h.id===id);if(!h)throw new Error('Retained help was not found.');
  s.helpVisible||=[];if(s.helpVisible.includes(id))return;
  s.helpVisible.push(id);
  const a=s.current;
  if(a&&!a.finished){a.helpExposures||=[];if(!a.helpExposures.includes(id))a.helpExposures.push(id);}
  recorder.record('help.display',{response:id,request:h.request,attempt:a?.id||null,response_attempt:h.attempt,
    after_submission:!!a?.submissions.length,completed_attempt:!!a?.finished,meaning:'Display opportunity; reading and benefit are unobserved.'});
}
function archive(s){
  if(s.current){s.attempts||=[];if(!s.attempts.some(a=>a.id===s.current.id))s.attempts.push(structuredClone(s.current));}
}
module.exports={content,request,requests,associate,assertReplaceable,paste,edit,retain,reveal,archive,LIMIT};
