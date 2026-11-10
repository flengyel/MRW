'use strict';
// Declarative content for the installed Lean integration. No hooks or discovery.
const fs=require('node:fs/promises'),path=require('node:path');
const {digest}=require('./navigation');
const MAX=1024*1024;
function relative(value,extension){
 if(typeof value!=='string'||value.length>200||!value||value.includes('\\')||value.split('/').some(s=>!s||s==='.'||s==='..')||path.posix.isAbsolute(value)||!extension.test(value))throw Error('Lesson files must be bounded pack-relative paths with the expected file type.');
 return value;
}
function text(v,max=200){if(typeof v!=='string'||!v.trim()||v.length>max||/[\x00-\x1f]/.test(v))throw Error('Invalid lesson-pack text.');return v;}
function keys(value,required){if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join('|')!==[...required].sort().join('|'))throw Error('Unsupported lesson-pack fields; API 1 accepts data only.');}
function validate(value){
 keys(value,['apiVersion','packId','contentVersion','title','testedToolchain','projectFiles','notesTemplate','lessons']);
 if(value.apiVersion!==1||!/^[a-z][a-z0-9.-]{0,79}$/.test(value.packId))throw Error('Unsupported lesson-pack API or pack ID.');
 text(value.title);text(value.contentVersion,80);
 if(!/^leanprover\/lean4:v\d+\.\d+\.\d+(?:-rc\d+)?$/.test(value.testedToolchain))throw Error('Pin a release Lean toolchain in the lesson pack.');
 if(!Array.isArray(value.projectFiles)||!value.projectFiles.length||value.projectFiles.length>32)throw Error('Invalid lesson project files.');
 for(const file of value.projectFiles)relative(file,/(?:\.lean|^lean-toolchain$|^lakefile\.toml$)$/);
 if(!value.projectFiles.includes('lean-toolchain')||!value.projectFiles.includes('lakefile.toml'))throw Error('A lesson pack needs its own lean-toolchain and lakefile.toml.');
 relative(value.notesTemplate,/\.md$/i);
 if(!Array.isArray(value.lessons)||!value.lessons.length||value.lessons.length>32)throw Error('A lesson pack must contain 1–32 completed units.');
 const ids=new Set(),orders=new Set();
 for(const lesson of value.lessons){
  keys(lesson,['id','title','order','explanation','examples','exercises','solutions','mistakes','bookSections']);
  if(!/^[a-z][a-z0-9-]{0,79}$/.test(lesson.id)||ids.has(lesson.id)||!Number.isSafeInteger(lesson.order)||lesson.order<1||orders.has(lesson.order))throw Error('Lesson IDs and positive orders must be unique.');
  ids.add(lesson.id);orders.add(lesson.order);text(lesson.title);relative(lesson.explanation,/\.md$/i);relative(lesson.examples,/\.lean$/);
  for(const kind of ['exercises','solutions','mistakes']){
   if(!Array.isArray(lesson[kind])||lesson[kind].length>16)throw Error('Invalid lesson '+kind);
   for(const item of lesson[kind]){keys(item,['title','file']);text(item.title);relative(item.file,/\.lean$/);}
  }
  if(!Array.isArray(lesson.bookSections)||!lesson.bookSections.length||lesson.bookSections.length>16)throw Error('Supply the referenced book sections.');
  for(const section of lesson.bookSections){keys(section,['title','url']);text(section.title);const u=new URL(section.url);if(u.protocol!=='https:'||u.username||u.password||u.href.length>2000)throw Error('Book sections require HTTPS links without credentials.');}
 }
 return structuredClone(value);
}
function files(manifest){return [...new Set([...manifest.projectFiles,manifest.notesTemplate,...manifest.lessons.flatMap(l=>[l.explanation,l.examples,...['exercises','solutions','mistakes'].flatMap(k=>l[k].map(x=>x.file))])])];}
async function read(root,file,max=MAX){
 const target=path.resolve(root,relative(file,/.+/));
 if(!target.startsWith(root+path.sep))throw Error('Lesson file escapes its pack.');
 const stat=await fs.lstat(target);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>max||await fs.realpath(target)!==target)throw Error('Lesson file must be a regular bounded file without path redirection: '+file);
 const raw=await fs.readFile(target);if(raw.length>max)throw Error('Lesson file exceeds its bound.');new TextDecoder('utf8',{fatal:true}).decode(raw);return raw;
}
async function loadPack(root){
 root=await fs.realpath(root);const raw=await read(root,'pack.json',64*1024);let parsed;
 try{parsed=JSON.parse(raw);}catch{throw Error('The lesson pack manifest is not valid JSON.');}
 const manifest=validate(parsed);let total=raw.length;
 for(const file of files(manifest)){total+=(await read(root,file)).length;if(total>4*MAX)throw Error('Lesson pack exceeds its 4 MiB content bound.');}
 if((await read(root,'lean-toolchain')).toString().trim()!==manifest.testedToolchain)throw Error('Lesson toolchain file differs from testedToolchain.');
 return {root,manifest};
}
async function workingCopy(pack,parent){
 parent=await fs.realpath(parent);const folder=path.join(parent,'Lean Study');await fs.mkdir(folder,{recursive:true});
 if(await fs.realpath(folder)!==folder)throw Error('Study directory is redirected; choose another destination.');
 const root=path.join(folder,pack.manifest.packId);
 try{if((await fs.lstat(root)).isSymbolicLink())throw Error('Study working-copy path is redirected.');const old=await loadPack(root);if(old.manifest.packId!==pack.manifest.packId)throw Error('The study destination belongs to another pack.');
  const meta=JSON.parse(await read(root,'.study-copy.json',64*1024));if(meta.apiVersion!==1||meta.packId!==pack.manifest.packId)throw Error('The occupied folder is not an MRW-created working copy.');return {root,manifest:old.manifest,reused:true};
 }catch(error){if(error.code!=='ENOENT')throw error;}
 // Publish a complete fresh directory once. Never merge into an occupied folder.
 const stage=await fs.mkdtemp(path.join(folder,'.creating-'));let published=false;
 try{
  const originals={};
  for(const file of files(pack.manifest)){
   const raw=await read(pack.root,file),target=path.join(stage,file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,raw,{flag:'wx'});
   if(file.endsWith('.lean')){const original=path.join(stage,'.originals',file+'.txt');await fs.mkdir(path.dirname(original),{recursive:true});await fs.writeFile(original,raw,{flag:'wx'});originals[file]=digest(raw);}
  }
  await fs.writeFile(path.join(stage,'pack.json'),JSON.stringify(pack.manifest,null,2)+'\n',{flag:'wx'});
  await fs.writeFile(path.join(stage,'.study-copy.json'),JSON.stringify({apiVersion:1,packId:pack.manifest.packId,contentVersion:pack.manifest.contentVersion,originals},null,2)+'\n',{flag:'wx'});
  // mkdir reservation prevents replacing a concurrently created destination.
  await fs.mkdir(root);try{await fs.rename(stage,root);}catch(e){await fs.rmdir(root).catch(()=>{});throw e;}published=true;
  return {root,manifest:pack.manifest,reused:false};
 }finally{if(!published)await fs.rm(stage,{recursive:true,force:true});}
}
module.exports={validate,loadPack,workingCopy,read,files,relative};
