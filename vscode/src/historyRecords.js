'use strict';
// Portable history representations. Original private records are never rewritten.
const {createHash}=require('node:crypto');
const hash=text=>createHash('sha256').update(text).digest('hex');
const ID=/^[a-f0-9]{64}$/, UUID=/^[a-f0-9]{8}-[a-f0-9-]{27}$/;
function canonical(value){
  if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
  if(value&&typeof value==='object')return '{'+Object.keys(value).sort().filter(k=>value[k]!==undefined).map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
  return JSON.stringify(value);
}
function snapshotIDs(value,out=new Set()){
  if(Array.isArray(value))for(const v of value)snapshotIDs(v,out);
  else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value)){
    if(/(?:^|_)snapshot$/.test(k)&&typeof v==='string'&&ID.test(v))out.add(v);
    else snapshotIDs(v,out);
  }
  return out;
}
function scope(event){
  const a=event.identity?.study,b=event.data?.study;
  if(a&&b&&a!==b)throw Error('History event has conflicting study identities.');
  const id=a||b||null;if(id&&!ID.test(id))throw Error('History study identity is not opaque.');return id;
}
// Local locators become opaque references, not openable paths on another host.
// IDs, revision hashes and event links are retained. Snapshots explicitly carry
// both their original identity and the digest of this portable representation.
function portable(value,key=''){
  if(typeof value==='string'){
    const ref=text=>'mrw-location:'+hash(text);
    // Restrict bare path handling to locator fields. In particular f:\to X in
    // mathematical prose is not a Windows drive path, and /x is not a filename.
    if(/(?:^|_)(?:root|uri|path|file|directory|reference|references)$/.test(key)&&/^(?:\/[^\s]|[A-Za-z]:[\\/]|\\\\)/.test(value))return ref(value);
    return value.replace(/(?:file:\/\/[^\s<>"')\]]+|vscode-remote:\/\/[^\s<>"')\]]+|(?:\/(?:home|mnt|Users|tmp|var|private)\/|[A-Za-z]:[\\/](?:Users|Windows)[\\/])[^\s<>"')\]]+)/g,ref);
  }
  if(Array.isArray(value))return value.map(v=>portable(v,key));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,portable(v,k)]));
  return value;
}
function eventPayload(event){const {history_context,export_context,...payload}=event;return payload;}
function mergeEvents(rows,deleted=new Set()){
  const variants=new Map();
  for(const event of rows){
    if(deleted.has(event.identity?.study)||deleted.has(event.data?.study))continue;
    const payload=eventPayload(event),key=canonical(payload);
    let group=variants.get(event.id);if(!group){group=new Map();variants.set(event.id,group);}
    if(!group.has(key))group.set(key,{...payload,history_context:{writers:[],workspaces:[]}});
    const context=group.get(key).history_context;
    for(const writer of event.history_context?.writers||[event.writer||'unknown'])if(!context.writers.includes(writer))context.writers.push(writer);
    for(const workspace of event.history_context?.workspaces||[event.workspace||'unknown'])if(!context.workspaces.includes(workspace))context.workspaces.push(workspace);
  }
  const events=[],conflicts=[];
  for(const [id,group] of variants)if(group.size!==1)conflicts.push(id);else events.push([...group.values()][0]);
  // Sequence gives order within a session, even if its wall clock moved back.
  // Sessions from different writers have no asserted temporal order.
  events.sort((a,b)=>a.session.localeCompare(b.session)||a.sequence-b.sequence||a.id.localeCompare(b.id));
  return {events,conflicts:conflicts.sort()};
}
function validateEvent(e){
  if(e?.schema!==1||!UUID.test(e.id)||!UUID.test(e.session)||!Number.isSafeInteger(e.sequence)||e.sequence<1||
    typeof e.at!=='string'||typeof e.action!=='string'||!e.identity||!e.data||!e.software||typeof e.origin!=='string')throw Error('Invalid history event.');
  scope(e);
}
module.exports={hash,ID,UUID,canonical,snapshotIDs,scope,portable,eventPayload,mergeEvents,validateEvent};
