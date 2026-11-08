'use strict';
// Chooser enumeration is separate from full note-ID/backlink indexing.
const fs=require('node:fs/promises'),path=require('node:path'),{execFile}=require('node:child_process');
const LIMITS=Object.freeze({maxEntries:40000,maxItems:20000,maxDepth:32,headerBytes:16384,maxTitleBytes:16*1024*1024});
const excluded=new Set(['.obsidian','.trash','.git','.lake','node_modules','.venv','__pycache__']);
const cancelled=token=>token?.isCancellationRequested;
function execute(executable,args,input,token){return new Promise((resolve,reject)=>{
 const child=execFile(executable,args,{timeout:12000,maxBuffer:48*1024*1024,encoding:'utf8',windowsHide:true},(error,stdout)=>{subscription?.dispose();error?reject(error):resolve(stdout);});
 const subscription=token?.onCancellationRequested?.(()=>child.kill());child.stdin.on('error',()=>{});child.stdin.end(input);
});}
async function chooserFiles(folder,{recursive=false,files,token,remoteName,io=fs,run=execute}={}){
 const root=await io.realpath(folder);if(cancelled(token))return {root,entries:[],complete:false,cancelled:true};
 const mounted=/^\/mnt\/([a-z])\/(.*)$/i.exec(root);
 if(remoteName==='wsl'&&mounted){
  const script=await io.readFile(path.join(__dirname,'../media/document-chooser.ps1'),'utf8');
  const request={root:`${mounted[1].toUpperCase()}:\\${mounted[2].replaceAll('/','\\')}`,mode:files?'titles':recursive?'search':'list',...LIMITS,
    files:files?.map(file=>path.relative(root,file).split(path.sep).join('/'))};
  if(request.files?.some(relative=>path.posix.isAbsolute(relative)||relative.split('/').some(p=>!p||p==='.'||p==='..'||excluded.has(p))))throw Error('Title path leaves the browsing folder.');
  const raw=await run('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],JSON.stringify(request),token);
  if(cancelled(token))return {root,entries:[],complete:false,cancelled:true};
  const value=JSON.parse(raw.replace(/^\uFEFF/,''));
  if(!Array.isArray(value.entries)||value.entries.length>LIMITS.maxItems||typeof value.complete!=='boolean'||!Array.isArray(value.errors)||value.errors.some(e=>typeof e!=='string'))throw Error('Invalid document chooser listing.');
  const safe=relative=>typeof relative==='string'&&relative.length>0&&relative.length<=8192&&!/[\\:\u0000-\u001f]/.test(relative)&&!path.posix.isAbsolute(relative)&&relative.split('/').every(p=>p&&p!=='.'&&p!=='..'&&!excluded.has(p));
  const entries=value.entries.map(e=>{if(!safe(e.path)||!['file','folder'].includes(e.type)||!recursive&&e.path.includes('/'))throw Error('Invalid document chooser path.');return {file:path.join(root,e.path),type:e.type};});
  const headers=new Map();let total=0;
  for(const [relative,encoded] of Object.entries(value.headers||{})){
   if(!safe(relative)||!files?.includes(path.join(root,relative))||typeof encoded!=='string')throw Error('Invalid document chooser title path.');
   const bytes=Buffer.from(encoded,'base64');if(bytes.toString('base64')!==encoded||bytes.length>LIMITS.headerBytes||(total+=bytes.length)>LIMITS.maxTitleBytes)throw Error('Invalid document chooser title bounds.');
   try{headers.set(path.join(root,relative),new TextDecoder('utf-8',{fatal:true}).decode(bytes,{stream:true}));}catch{/* Keep its filename. */}
  }
  return {root,entries,headers,complete:value.complete,errors:value.errors};
 }
 const entries=[],headers=new Map(),errors=[];let count=0,total=0,complete=true;const pending=[{dir:root,depth:0}];
 if(files){
  for(const file of files){
   if(cancelled(token))break;if(!/\.(md|markdown)$/i.test(file))continue;
   if(total>=LIMITS.maxTitleBytes){complete=false;break;}
   let handle;try{
    const actual=await io.realpath(file),relative=path.relative(root,actual);
    if(relative==='..'||relative.startsWith('../')||path.isAbsolute(relative))throw Error('Title moved outside this folder.');
    handle=await io.open(actual,'r');const buffer=Buffer.alloc(Math.min(LIMITS.headerBytes,LIMITS.maxTitleBytes-total));const {bytesRead}=await handle.read(buffer,0,buffer.length,0);total+=bytesRead;
    headers.set(file,new TextDecoder('utf-8',{fatal:true}).decode(buffer.subarray(0,bytesRead),{stream:true}));
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
 return {root,entries,headers,complete:complete&&!cancelled(token),cancelled:!!cancelled(token),errors};
}
module.exports={chooserFiles,LIMITS};
