'use strict';
// One host-local authority record commits a verified workspace snapshot. The
// source is retained; only the committed destination may resume MRW writes.
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {randomUUID, createHash} = require('node:crypto');
const hash = b => createHash('sha256').update(b).digest('hex');
const inside = (root, file) => file === root || file.startsWith(root + path.sep);
const MARKER = '.mrw-workspace-move.json';
const DATA = '.mrw-workspace-data';
const locations=require('./workspacePaths');
async function sync(dir) {const h=await fsp.open(dir,'r');try{await h.sync();}finally{await h.close();}}
async function write(file, value) {
  const tmp=file+'.'+randomUUID()+'.tmp';let h;
  try {h=await fsp.open(tmp,'wx',0o600);await h.writeFile(JSON.stringify(value,null,2)+'\n');await h.sync();await h.close();h=undefined;await fsp.rename(tmp,file);await sync(path.dirname(file));}
  finally{await h?.close();await fsp.unlink(tmp).catch(e=>{if(e.code!=='ENOENT')throw e;});}
}
// Linux advisory locking also covers recovery. The kernel releases the lock
// when the owner dies; there is no stale PID file to guess at or race to remove.
async function lockRegistry(registry,{wait=false}={}) {
  await fsp.mkdir(registry,{recursive:true,mode:0o700});
  const name=path.join(registry,'writer.lock');
  const handle=await fsp.open(name,'a',0o600);await handle.close();
  return new Promise((resolve,reject)=>{
    const child=spawn('flock',[...(wait?['--wait','10']:['--nonblock']),'--conflict-exit-code','73',name,process.execPath,'-e',
      "process.stdout.write('locked\\n');process.stdin.resume();process.stdin.on('end',()=>process.exit(0));"],{stdio:['pipe','pipe','pipe']});
    let accepted=false,output='';
    const done=new Promise(r=>child.once('close',r));
    child.stdin.on('error',()=>{});
    child.once('error',()=>reject(Error('Workspace moves require the Linux flock utility (util-linux).')));
    child.stderr.resume();
    child.stdout.on('data',chunk=>{output+=chunk;if(!accepted&&output.includes('locked\n')){
      accepted=true;resolve(async()=>{child.stdin.end();await done;});
    }});
    child.once('close',code=>{if(!accepted)reject(Error(code===73?'Another workspace move or recovery is running.':'Could not acquire the workspace move lock.'));});
  });
}
async function scan(root, {exclude=[],limit=8*1024*1024*1024}={}) {
  const rows={};let size=0,count=0;
  async function visit(dir){for(const name of (await fsp.readdir(dir)).sort()){
    const file=path.join(dir,name),rel=path.relative(root,file);if(exclude.includes(rel))continue;
    const st=await fsp.lstat(file);
    if(st.isDirectory()){rows[rel]={kind:'directory',mode:st.mode&0o777};await visit(file);}
    else if(st.isSymbolicLink())rows[rel]={kind:'symlink',target:await fsp.readlink(file)};
    else if(st.isFile()){
      size+=st.size;if(size>limit)throw Error('Workspace exceeds the 8 GiB move limit. Move build caches out of the workspace first.');
      const digest=createHash('sha256');let bytes=0;for await(const chunk of fs.createReadStream(file)){bytes+=chunk.length;digest.update(chunk);if(bytes>limit)throw Error('Workspace file exceeds the move limit.');}
      if(bytes!==st.size)throw Error('Source file changed while taking its snapshot: '+file);
      rows[rel]={kind:'file',mode:st.mode&0o777,size:st.size,sha256:digest.digest('hex')};
    }else throw Error('Cannot snapshot a special file: '+file);
    if(++count>100000)throw Error('Workspace exceeds the 100,000-entry move limit.');
  }}
  await visit(root);return rows;
}
async function copy(source,dest,rows) {
  for(const [rel,row] of Object.entries(rows)){
    const from=path.join(source,rel),to=path.join(dest,rel);
    if(row.kind==='directory')await fsp.mkdir(to,{mode:row.mode});
    else if(row.kind==='symlink')await fsp.symlink(row.target,to);
    else {await fsp.copyFile(from,to,fs.constants.COPYFILE_EXCL);await fsp.chmod(to,row.mode);const h=await fsp.open(to,'r');try{await h.sync();}finally{await h.close();}}
  }
  for(const rel of Object.keys(rows).reverse())if(rows[rel].kind==='directory')await sync(path.join(dest,rel));
  await sync(dest);
}
function equal(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function rebase(value, mappings) {
  if(typeof value==='string'){
    for(const [from,to] of mappings){if(inside(from,value))return to+value.slice(from.length);
      if(/^(file|vscode-remote):\/\//.test(value)){
        const uri=new URL(value),decoded=decodeURIComponent(uri.pathname);
        if(inside(from,decoded)){uri.pathname=to+decoded.slice(from.length);return uri.href;}
      }
    }return value;
  }
  if(Array.isArray(value))return value.map(v=>rebase(v,mappings));
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,
    locations.payload.test(k)?v:rebase(v,mappings)]));
  return value;
}
function jsonc(text) {
  let out='',quoted=false,escape=false;
  for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];
    if(quoted){out+=c;if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;continue;}
    if(c==='"'){quoted=true;out+=c;continue;}
    if(c==='/'&&n==='/'){while(i<text.length&&text[i]!=='\n')i++;out+='\n';continue;}
    if(c==='/'&&n==='*'){i+=2;while(i<text.length&&!(text[i]==='*'&&text[i+1]==='/'))i++;i++;out+=' ';continue;}
    out+=c;
  }
  let cleaned='';quoted=false;escape=false;
  for(let i=0;i<out.length;i++){const c=out[i];
    if(quoted){cleaned+=c;if(escape)escape=false;else if(c==='\\')escape=true;else if(c==='"')quoted=false;continue;}
    if(c==='"')quoted=true;
    if(c===','){let j=i+1;while(/\s/.test(out[j]||'x'))j++;if(out[j]===']'||out[j]==='}')continue;}
    cleaned+=c;
  }
  return JSON.parse(cleaned);
}
async function verifyCandidate(record){
  const bytes=await fsp.readFile(record.manifest);if(hash(bytes)!==record.manifestHash)throw Error('Workspace move manifest failed verification.');
  const manifest=JSON.parse(bytes);
  if(!equal(manifest.files,await scan(record.destination)))throw Error('Committed destination differs from the verified snapshot. Preserved both locations; no rollback was guessed.');
}
function records(registry) {
  if(!fs.existsSync(registry))return [];
  return fs.readdirSync(registry).filter(n=>n.endsWith('.json')).map(n=>{
    const r=JSON.parse(fs.readFileSync(path.join(registry,n),'utf8'));
    if(r.version!==1||!['preparing','committed','aborted'].includes(r.phase)||r.id+'.json'!==n||!path.isAbsolute(r.source)||!path.isAbsolute(r.destination))throw Error('Workspace move authority is invalid; no session was opened.');
    if(r.manifest&&r.manifest!==path.join(registry,'manifests',r.id+'.json'))throw Error('Workspace move manifest location is invalid.');return r;
  });
}
function lookup(registry,workspace) {
  const matches=records(registry).filter(r=>(r.phase!=='aborted'&&r.sourceWorkspace===workspace||r.destinationWorkspace===workspace));
  // A destination can subsequently move again; its later source record wins.
  return matches.findLast(r=>r.sourceWorkspace===workspace)||matches.at(-1);
}
async function canonical(p) {if(!path.isAbsolute(p)||await fsp.realpath(p)!==p)throw Error('Choose a canonical Linux path without symlink components.');}
class WorkspaceMove {
  constructor(registry,{checkpoint=async()=>{},publish=write}={}){this.registry=registry;this.checkpoint=checkpoint;this.publish=publish;}
  async move({workspace,destination,privateHome,state,tabs,bridge,settings={},notesFolder,historySession}) {
    await canonical(workspace);const source=path.dirname(workspace);await canonical(source);await canonical(path.dirname(destination));
    if(inside(source,this.registry))throw Error('Workspace cannot contain the host relocation registry.');
    if(inside(source,destination)||inside(destination,source))throw Error('Source and destination must be separate directories.');
    if(fs.existsSync(destination))throw Error('Destination already exists; no files were replaced.');
    if(lookup(this.registry,workspace)?.phase==='preparing')throw Error('Recover the earlier workspace move first.');
    if(fs.existsSync(privateHome))await canonical(privateHome);
    if(inside(privateHome,destination))throw Error('Destination cannot be inside MRW private storage.');
    const unlock=await lockRegistry(this.registry);
    try{
    const id=randomUUID(),file=path.join(this.registry,id+'.json');
    const destinationWorkspace=path.join(destination,path.basename(workspace));
    const data=path.join(destination,DATA),newHome=path.join(data,'state');
    const previous=lookup(this.registry,workspace);
    const mappings=[[source,destination],[privateHome,newHome],...(previous?.mappings||[]).map(([a,b])=>[a,rebase(b,[[source,destination],[privateHome,newHome]])])];
    const excludes=[MARKER,DATA+'/workspace-state.json',DATA+'/tabs.json'];
    if(inside(source,privateHome))excludes.push(path.relative(source,privateHome));
    let r={version:1,id,phase:'preparing',pid:process.pid,source,destination,sourceWorkspace:workspace,destinationWorkspace,privateHome,newHome,mappings,opened:false};
      if(lookup(this.registry,workspace)?.phase==='preparing'||lookup(this.registry,workspace)?.sourceWorkspace===workspace)throw Error('Recover the earlier workspace move first.');
      if(!previous&&(fs.existsSync(path.join(source,MARKER))||fs.existsSync(path.join(source,DATA))))throw Error('The source contains reserved workspace move files without an authority record.');
      await this.publish(file,r);await this.checkpoint('intent');
      if(fs.existsSync(path.join(privateHome,'artifact-runtime/transaction.json')))throw Error('Recover the pending saved-source transaction before moving the workspace.');
      const sharedBinding=path.join(privateHome,'study-history-v1/sharing-v1/binding.json');
      if(fs.existsSync(sharedBinding)&&inside(source,JSON.parse(await fsp.readFile(sharedBinding,'utf8')).directory))throw Error('The shared history directory is inside this workspace. Choose a shared directory outside it before moving.');
      const original=await scan(source,{exclude:excludes});
      const privateRows=fs.existsSync(privateHome)?await scan(privateHome):{};
      if(Object.values(privateRows).some(row=>row.kind==='symlink'))throw Error('MRW private storage contains a symlink; its external target cannot be included in this transaction.');
      const workspaceData=jsonc(await fsp.readFile(workspace,'utf8'));
      if(!workspaceData.folders?.some(f=>path.resolve(source,f.path)===source))throw Error('Workspace file must be in its owned root folder. External folders stay in place.');
      if(!Array.isArray(workspaceData.folders))throw Error('Save this session as a .code-workspace file before moving it.');
      workspaceData.folders=workspaceData.folders.map(f=>{
        const absolute=path.resolve(source,f.path);return {...f,path:inside(source,absolute)?path.relative(source,absolute)||'.':absolute};
      });
      workspaceData.settings=rebase({...workspaceData.settings,...settings},mappings);
      await fsp.mkdir(destination,{mode:0o700});await sync(path.dirname(destination));
      await copy(source,destination,original);
      if(!equal(original,await scan(destination)))throw Error('Document copy failed verification.');
      await fsp.mkdir(data,{recursive:true,mode:0o700});await fsp.mkdir(newHome,{mode:0o700});
      await copy(privateHome,newHome,privateRows);
      if(!equal(privateRows,await scan(newHome)))throw Error('Private workspace copy failed verification.');
      if(historySession&&/^[a-f0-9-]{36}$/.test(historySession)){
        const live=path.join(newHome,'study-history-v1','live-'+historySession+'.json');
        if(fs.existsSync(live)){const value=JSON.parse(await fsp.readFile(live,'utf8'));await write(live,{...value,workspaceMove:id});}
      }
      const relocatedState=Object.fromEntries(Object.entries(rebase(state,mappings)).map(([key,value])=>[mappings.reduce((k,[a,b])=>k.replace(hash(a),hash(b)),key),value]));
      await write(path.join(data,'workspace-state.json'),locations.encode(relocatedState,destination,notesFolder));
      await write(path.join(data,'tabs.json'),locations.encode(rebase(tabs,mappings),destination,notesFolder));
      await write(destinationWorkspace,workspaceData);
      for(const folder of workspaceData.folders){
        const root=path.resolve(destination,folder.path),settingsFile=path.join(root,'.vscode/settings.json');
        if(inside(destination,root)&&fs.existsSync(settingsFile)){
          const before=jsonc(await fsp.readFile(settingsFile,'utf8')),after=rebase(before,mappings);
          if(!equal(before,after))await write(settingsFile,after);
        }
      }
      for(const [rel,row] of Object.entries(original))if(row.kind==='symlink'){
        const oldTarget=path.resolve(source,path.dirname(rel),row.target);
        const target=inside(source,oldTarget)?path.relative(path.dirname(path.join(destination,rel)),rebase(oldTarget,mappings)):oldTarget;
        if(target!==row.target){await fsp.unlink(path.join(destination,rel));await fsp.symlink(target,path.join(destination,rel));await sync(path.dirname(path.join(destination,rel)));}
      }
      // Only the candidate's binding changes. Exact retained payloads, study
      // records, tombstones and immutable history batches are never rewritten.
      const bindingFile=path.join(newHome,'artifact-runtime/active-store.json');
      let binding;
      if(fs.existsSync(bindingFile))binding=JSON.parse(await fsp.readFile(bindingFile,'utf8'));
      else if(Object.keys(privateRows).some(k=>/^(outlines|investigation)-[a-f0-9]{64}\//.test(k))){
        const roots=workspaceData.folders.map(f=>path.resolve(source,f.path));
        const saved=path.join(data,'sources');
        const plan=await bridge({method:'artifact_plan',artifact_home:newHome,destination:saved,roots});
        const moved=await bridge({method:'artifact_move',artifact_home:newHome,destination:saved,roots,manifest:plan.source_manifest});
        if(!moved.committed||moved.cleanup_pending||moved.recovery_required)throw Error('Candidate source store needs recovery; original is still authoritative.');
        binding=JSON.parse(await fsp.readFile(bindingFile,'utf8'));
        const identityFile=path.join(saved,'store.json'),identity=JSON.parse(await fsp.readFile(identityFile,'utf8'));
        identity.original_home=privateHome;
        for(const project of identity.projects){const scope=hash(project.root+'\0'+path.join(privateHome,'outlines-'+hash(project.root)));if(!project.reference_scopes.includes(scope))project.reference_scopes.push(scope);}
        await write(identityFile,identity);binding.identity_hash=hash(await fsp.readFile(identityFile));
      }
      if(binding){
        binding.location=rebase(binding.location,[[source,destination]]);
        binding.projects=Object.fromEntries(Object.entries(binding.projects).map(([local,original])=>[rebase(local,[[source,destination]]),original]));
        binding.epoch=randomUUID();await write(bindingFile,binding);
        await bridge({method:'artifact_inspect',artifact_home:newHome,destination:binding.location});
      }
      await write(path.join(destination,MARKER),{version:1,id,registry:this.registry});
      await this.checkpoint('copied');
      if(!equal(original,await scan(source,{exclude:excludes}))||!equal(privateRows,fs.existsSync(privateHome)?await scan(privateHome):{}))throw Error('Source changed during preparation; no authority switch was made.');
      const manifests=path.join(this.registry,'manifests');await fsp.mkdir(manifests,{recursive:true,mode:0o700});
      const manifest=path.join(manifests,id+'.json');await write(manifest,{files:await scan(destination),original,privateRows});
      r={...r,manifest,manifestHash:hash(await fsp.readFile(manifest))};await this.publish(file,r);
      await this.checkpoint('verified');
      if(!equal(original,await scan(source,{exclude:excludes}))||!equal(privateRows,fs.existsSync(privateHome)?await scan(privateHome):{}))throw Error('Source changed before the authority switch.');
      r={...r,phase:'committed'};await this.publish(file,r);await this.checkpoint('committed');
      return r;
    }finally{await unlock();}
  }
  async recover(id) {
    const unlock=await lockRegistry(this.registry);
    try{
      const r=records(this.registry).find(r=>r.id===id);if(!r)throw Error('Workspace move record not found.');
      if(r.phase==='preparing'){
        const aborted={...r,phase:'aborted'};await write(path.join(this.registry,r.id+'.json'),aborted);return aborted;
      }
      if(r.phase==='committed'&&!r.opened)await verifyCandidate(r);
      return r;
    }finally{await unlock();}
  }
}
module.exports={WorkspaceMove,scan,write,copy,lookup,records,rebase,jsonc,hash,inside,MARKER,DATA,lockRegistry,verifyCandidate};
