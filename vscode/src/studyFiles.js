'use strict';
// The study store uses the same private JSON files and atomic replacement as
// before. Sync both the completed file and parent before acknowledging a save.
const path=require('node:path'),{constants}=require('node:fs');
async function syncDirectory(io,directory){const h=await io.open(directory,'r');try{await h.sync();}finally{await h.close();}}
async function regular(io,file){const s=await io.lstat(file);if(!s.isFile()||s.isSymbolicLink())throw Error('Study storage requires a regular file.');return s;}
async function write(io,file,text){
  const temp=file+'.pending';let h;
  try{
    try{await regular(io,temp);}catch(e){if(e.code!=='ENOENT')throw e;}
    await io.writeFile(temp,text,{mode:0o600,flag:constants.O_WRONLY|constants.O_CREAT|constants.O_TRUNC|constants.O_NOFOLLOW});
    h=await io.open(temp,constants.O_RDONLY|constants.O_NOFOLLOW);await h.sync();await h.close();h=undefined;
    await io.rename(temp,file);await syncDirectory(io,path.dirname(file));
  }finally{await h?.close();}
}
async function remove(io,file){try{await regular(io,file);await io.unlink(file);}catch(e){if(e.code!=='ENOENT')throw e;}await syncDirectory(io,path.dirname(file));}
async function json(io,file){await regular(io,file);return JSON.parse(await io.readFile(file,'utf8'));}
module.exports={write,remove,json,regular,syncDirectory};
