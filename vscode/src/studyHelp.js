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
  const a=s.current,latest=a?.submissions.at(-1);
  const r={id,purpose,attempt:a?.id||null,question:a?{id:a.question.id,revision:a.question.revision}:null,
    sources:model.signature(s.passages),submission:latest?.event||null,adaptation,
    snapshot:recorder.snapshot({text}),at:new Date().toISOString()};
  (s.helpRequests||=[]).push(r);
  r.event=recorder.record('help.request',{...r,meaning:'Request copied; response, consultation and benefit are unobserved.'}).id;
  return r;
}
function paste(s,text){
  const original=content({text,author:'Codex companion',origin:'ai_proposal'});
  const req=[...(s.helpRequests||[])].reverse().find(r=>r.attempt===(s.current?.id||null));
  return {id:crypto.randomUUID(),...original,original,request:req?.id||null,attempt:s.current?.id||null,adaptation:req?.adaptation||null};
}
function edit(s,id){
  const old=s.help?.find(h=>h.id===id);if(!old)throw new Error('Retained help was not found.');
  return {...old,id:crypto.randomUUID(),previous:old.id,original:old.original};
}
function retain(s,value,recorder){
  const draft=s.helpDraft;if(!draft)throw new Error('Paste a response or edit retained help first.');
  const data=content(value),original=content(draft.original||draft);
  if((s.help||[]).length>=64&&!s.help.some(h=>h.id===draft.id))throw new Error('This study holds at most 64 help responses and revisions.');
  // Retry after an unconfirmed checkpoint keeps the same response identity.
  let response=s.help?.find(h=>h.id===draft.id);
  if(response){
    if(JSON.stringify(content(response))===JSON.stringify(data))return response;
    if(response.event)throw new Error('Edit retained help as a separately attributed revision.');
    // Only this draft's unconfirmed entry can change after a failed checkpoint.
    s.help=s.help.filter(h=>h!==response);
  }
  response={id:draft.id,attempt:draft.attempt,request:draft.request||null,adaptation:draft.adaptation||null,
    sources:model.signature(s.passages),original:{...original,snapshot:recorder.snapshot(original)},...data,
    previous:draft.previous||null,at:new Date().toISOString()};
  response.snapshot=recorder.snapshot({...data,original:response.original,previous:response.previous});
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
module.exports={content,request,paste,edit,retain,reveal,archive,LIMIT};
