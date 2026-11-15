'use strict';
// Read-only exact-key CSL lookup and library names. Zotero owns both.
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),{execFile}=require('node:child_process'),{randomUUID}=require('node:crypto');
const LIMIT=4*1024*1024;
function packet(keys,libraries=[]){
 if(!Array.isArray(keys)||!keys.length||keys.length>128||keys.some(k=>typeof k!=='string'||!k||Buffer.byteLength(k)>512||/[\x00-\x1f\x7f]/.test(k))||new Set(keys).size!==keys.length)throw Error('Use at most 128 distinct citation keys of at most 512 bytes.');
 if(!Array.isArray(libraries)||libraries.length>8||libraries.some(v=>!Number.isSafeInteger(v)||v<1||v>2147483647)||new Set(libraries).size!==libraries.length)throw Error('Choose at most eight distinct Better BibTeX library IDs.');
 const params=[keys,true];if(libraries.length)params.push(libraries.length===1?libraries[0]:libraries.map(String));
 return {jsonrpc:'2.0',id:randomUUID(),method:'item.pandoc_filter',params};
}
function localRequest(value,signal){return new Promise((resolve,reject)=>{
 const raw=JSON.stringify(value);let size=0;const chunks=[];
 const request=http.request({hostname:'127.0.0.1',port:23119,path:'/better-bibtex/json-rpc',method:'POST',agent:false,headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(raw)},signal},response=>{
  response.on('data',chunk=>{size+=chunk.length;if(size>LIMIT)request.destroy(Error('Zotero citation response exceeds 4 MiB.'));else chunks.push(chunk);});response.on('error',reject);response.on('end',()=>resolve({status:response.statusCode,body:Buffer.concat(chunks).toString('utf8')}));
 });request.setTimeout(value.method==='user.groups'?1500:8000,()=>request.destroy(Error('Zotero citation lookup timed out.')));request.on('error',reject);request.end(raw);
});}
async function windowsRequest(value,signal){
 const script=await fs.readFile(path.join(__dirname,'../media/zotero-citations.ps1'),'utf8');
 return new Promise((resolve,reject)=>{
  const child=execFile('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{windowsHide:true,timeout:value.method==='user.groups'?5000:12000,maxBuffer:12*1024*1024,encoding:'utf8',signal},(error,stdout)=>{
   if(error)return reject(Error(signal?.aborted?'Zotero citation lookup cancelled.':'Windows Zotero citation lookup failed. Check Zotero and Better BibTeX.'));
   try{resolve(JSON.parse(stdout.replace(/^\uFEFF/,'')));}catch{reject(Error('Invalid Windows Zotero citation response.'));}
  });child.stdin.on('error',()=>{});child.stdin.end(JSON.stringify(value));
 });
}
function replyResult(response,value){
 if(response?.status!==200||typeof response.body!=='string'||Buffer.byteLength(response.body)>LIMIT)throw Error('Zotero citation lookup unavailable. Open Zotero with Better BibTeX enabled.');
 let reply;try{reply=JSON.parse(response.body);}catch{throw Error('Invalid Better BibTeX JSON response.');}
 if(reply?.jsonrpc!=='2.0'||reply.id!==value.id)throw Error('Better BibTeX reply identity differs.');
 if(reply.error)throw Error('Better BibTeX could not resolve the requested citation keys.');
 return reply.result;
}
async function libraryNames(libraries,send,signal){
 const names=new Map();if(!libraries.length)return names;
 signal?.throwIfAborted();
 try{
  const value={jsonrpc:'2.0',id:randomUUID(),method:'user.groups',params:[false]};
  const groups=replyResult(await send(value,signal),value);
  if(!Array.isArray(groups)||groups.length>1000)throw Error('Invalid library names.');
  const selected=new Set(libraries),seen=new Set();
  for(const group of groups){
   if(!selected.has(group?.id))continue;
   if(seen.has(group.id)){names.delete(group.id);continue;}seen.add(group.id);
   if(typeof group.name==='string'&&group.name.trim()&&Buffer.byteLength(group.name)<=512&&!/[\x00-\x1f\x7f]/.test(group.name))names.set(group.id,group.name);
  }
 }catch{signal?.throwIfAborted();} // Optional names cannot invalidate resolved citations.
 signal?.throwIfAborted();return names;
}
async function resolve(keys,{libraries=[],transport='local',request,signal}={}){
 if(!['local','windows'].includes(transport))throw Error('Unsupported Zotero citation transport.');
 const value=packet(keys,libraries),send=request||(transport==='windows'?windowsRequest:localRequest);
 const result=replyResult(await send(value,signal),value);
 if(!result||!result.items||Array.isArray(result.items)||typeof result.items!=='object'||!result.errors||Array.isArray(result.errors)||typeof result.errors!=='object')throw Error('Invalid Better BibTeX citation result.');
 const selected=new Set(keys),errors=new Map(),references=[];
 for(const [key,item] of Object.entries(result.items)){
  if(!selected.has(key)||!item||typeof item!=='object'||Array.isArray(item)||item.id!==key||Object.hasOwn(result.errors,key))throw Error('Better BibTeX returned an unexpected or mismatched citation.');
  references.push(item);
 }
 for(const [key,count] of Object.entries(result.errors)){
  if(!selected.has(key)||!Number.isSafeInteger(count)||count<0)throw Error('Invalid Better BibTeX citation ambiguity.');errors.set(key,count);
 }
 for(const key of keys)if(!Object.hasOwn(result.items,key)&&!errors.has(key))errors.set(key,0);
 const readAt=new Date().toISOString(),names=await libraryNames(libraries,send,signal);
 const scope=libraries.length?libraries.map(id=>(names.has(id)?JSON.stringify(names.get(id))+' (BBT library '+id+')':'BBT library '+id)).join(', '):'My Library (default)';
 return {references,errors:Object.fromEntries(errors),status:'Zotero / Better BibTeX snapshot read '+readAt+'; '+scope+'; '+(transport==='windows'?'Windows Zotero':'local Zotero')+'.'};
}
module.exports={resolve,packet,localRequest,windowsRequest};
