'use strict';
// Chooser enumeration is separate from full note-ID/backlink indexing.
const fs=require('node:fs/promises'),path=require('node:path'),{execFile}=require('node:child_process');
const LIMITS=Object.freeze({maxEntries:40000,maxItems:20000,maxDepth:32,headerBytes:16384,maxTitleBytes:16*1024*1024});
const excluded=new Set(['.obsidian','.trash','.git','.lake','node_modules','.venv','__pycache__']);
const cancelled=token=>token?.isCancellationRequested;
function execute(executable,args,input,token,onProgress,deadlines={}){return new Promise((resolve,reject)=>{
 const idleMs=deadlines.idleMs??12000,maximumMs=deadlines.maximumMs??30000;let idle;
 const child=execFile(executable,args,{timeout:onProgress?maximumMs:idleMs,maxBuffer:48*1024*1024,encoding:'utf8',windowsHide:true},(error,stdout)=>{
  clearTimeout(idle);subscription?.dispose();
  if(error){const failure=Error((onProgress?'Title loading':'Document listing')+(error.killed?' timed out; partial results and Browse remain available.':' failed; Browse remains available.'));failure.code=error.code;reject(failure);}else resolve(stdout);
 });
 const touch=()=>{clearTimeout(idle);idle=setTimeout(()=>child.kill(),idleMs);};if(onProgress)touch();
 let partial='';
 if(onProgress)child.stdout.on('data',chunk=>{partial+=chunk;let end;while((end=partial.indexOf('\n'))>=0){const line=partial.slice(0,end).replace(/^\uFEFF/,'');partial=partial.slice(end+1);try{const value=JSON.parse(line);if(value.progress){touch();onProgress(value);}}catch{/* Final protocol validation still rejects malformed output. */}}});
 const subscription=token?.onCancellationRequested?.(()=>child.kill());child.stdin.on('error',()=>{});child.stdin.end(input);
});}
async function chooserFiles(folder,{recursive=false,files,token,remoteName,io=fs,run=execute,onHeaders}={}){
 const root=await io.realpath(folder);if(cancelled(token))return {root,entries:[],complete:false,cancelled:true};
 const mounted=/^\/mnt\/([a-z])\/(.*)$/i.exec(root);
 if(remoteName==='wsl'&&mounted){
  const script=await io.readFile(path.join(__dirname,'../media/document-chooser.ps1'),'utf8');
  const request={root:`${mounted[1].toUpperCase()}:\\${mounted[2].replaceAll('/','\\')}`,mode:files?'titles':recursive?'search':'list',...LIMITS,
    stream:!!onHeaders,files:files?.map(file=>path.relative(root,file).split(path.sep).join('/'))};
  if(request.files?.some(relative=>path.posix.isAbsolute(relative)||relative.split('/').some(p=>!p||p==='.'||p==='..'||excluded.has(p))))throw Error('Title path leaves the browsing folder.');
  const headers=new Map();let total=0;
  const safe=relative=>typeof relative==='string'&&relative.length>0&&relative.length<=8192&&!/[\\:\u0000-\u001f]/.test(relative)&&!path.posix.isAbsolute(relative)&&relative.split('/').every(p=>p&&p!=='.'&&p!=='..'&&!excluded.has(p));
  const accept=values=>{
   const added=new Map();
   for(const [relative,encoded] of Object.entries(values||{})){
    if(!safe(relative)||!files?.includes(path.join(root,relative))||typeof encoded!=='string')throw Error('Invalid document chooser title path.');
    const bytes=Buffer.from(encoded,'base64');if(bytes.toString('base64')!==encoded||bytes.length>LIMITS.headerBytes||(total+=bytes.length)>LIMITS.maxTitleBytes)throw Error('Invalid document chooser title bounds.');
    try{const file=path.join(root,relative),text=new TextDecoder('utf-8',{fatal:true}).decode(bytes,{stream:true});headers.set(file,text);added.set(file,text);}catch{/* Keep its filename. */}
   }
   if(added.size&&!cancelled(token))onHeaders?.(added);
  };
  let progressError;
  const raw=await run('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],JSON.stringify(request),token,onHeaders?value=>{try{if(!cancelled(token))accept(value.headers);}catch(error){progressError=error;}}:undefined);
  if(cancelled(token))return {root,entries:[],complete:false,cancelled:true};
  if(progressError)throw progressError;
  const lines=raw.replace(/^\uFEFF/,'').trim().split(/\r?\n/),value=JSON.parse(lines.at(-1));
  if(!Array.isArray(value.entries)||value.entries.length>LIMITS.maxItems||typeof value.complete!=='boolean'||!Array.isArray(value.errors)||value.errors.some(e=>typeof e!=='string'))throw Error('Invalid document chooser listing.');
  const entries=value.entries.map(e=>{if(!safe(e.path)||!['file','folder'].includes(e.type)||!recursive&&e.path.includes('/'))throw Error('Invalid document chooser path.');return {file:path.join(root,e.path),type:e.type};});
  accept(value.headers);
  return {root,entries,headers,complete:value.complete,errors:value.errors};
 }
 const entries=[],headers=new Map(),errors=[];let count=0,total=0,complete=true;const pending=[{dir:root,depth:0}],batch=new Map();
 if(files){
  for(const file of files){
   if(cancelled(token))break;if(!/\.(md|markdown)$/i.test(file))continue;
   if(total>=LIMITS.maxTitleBytes){complete=false;break;}
   let handle;try{
    const actual=await io.realpath(file),relative=path.relative(root,actual);
    if(relative==='..'||relative.startsWith('../')||path.isAbsolute(relative))throw Error('Title moved outside this folder.');
    handle=await io.open(actual,'r');const buffer=Buffer.alloc(Math.min(LIMITS.headerBytes,LIMITS.maxTitleBytes-total));const {bytesRead}=await handle.read(buffer,0,buffer.length,0);total+=bytesRead;
    const text=new TextDecoder('utf-8',{fatal:true}).decode(buffer.subarray(0,bytesRead),{stream:true});headers.set(file,text);
    batch.set(file,text);if(batch.size>=32&&!cancelled(token)){onHeaders?.(new Map(batch));batch.clear();}
   }catch{complete=false;}finally{await handle?.close();}
  }
 }else while(pending.length&&!cancelled(token)){
  const {dir,depth}=pending.pop();let children;
  try{if(await io.realpath(dir)!==dir)throw Error('Browsing directory changed.');children=await io.readdir(dir,{withFileTypes:true});}catch(error){errors.push(error.message);complete=false;continue;}
  for(const child of children){
   if(cancelled(token))break;if(excluded.has(child.name)||child.isSymbolicLink())continue;
   if(++count>LIMITS.maxEntries||entries.length>=LIMITS.maxItems){complete=false;pending.length=0;break;}
   const file=path.join(dir,child.name);
   if(child.isDirectory()){
    if(!recursive)entries.push({file,type:'folder'});
    else if(depth<LIMITS.maxDepth)pending.push({dir:file,depth:depth+1});else complete=false;
   }else if(child.isFile())entries.push({file,type:'file'});
  }
 }
 if(batch.size&&!cancelled(token))onHeaders?.(batch);
 return {root,entries,headers,complete:complete&&!cancelled(token),cancelled:!!cancelled(token),errors};
}
module.exports={chooserFiles,LIMITS,execute};
