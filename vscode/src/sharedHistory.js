'use strict';
// File transport for StudyHistory, not a second recorder or a synchronization service.
const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
const {constants}=require('node:fs');
const files=require('./studyFiles');
const {hash,ID,UUID,canonical,snapshotIDs,scope,portable,mergeEvents,validateEvent}=require('./historyRecords');
const FORMAT='mrw-history', MAX_BATCH=2*1024*1024, MAX_QUEUE=16*1024*1024, MAX_PENDING=128;
async function directory(io,dir,create=false){
  if(create)try{await io.mkdir(dir,{mode:0o700});}catch(e){if(e.code!=='EEXIST')throw e;}
  const s=await io.lstat(dir);if(!s.isDirectory()||s.isSymbolicLink())throw Error('History directory is not an ordinary directory.');
}
async function read(io,file,limit=MAX_BATCH){
  const s=await files.regular(io,file);if(s.size>limit)throw Error('History file exceeds the size limit.');
  const h=await io.open(file,constants.O_RDONLY|constants.O_NOFOLLOW);
  try{const st=await h.stat();if(st.ino!==s.ino||st.dev!==s.dev)throw Error('History file changed while opening.');
    const text=await h.readFile('utf8');if(Buffer.byteLength(text)>limit)throw Error('History file exceeds the size limit.');return JSON.parse(text);
  }finally{await h.close();}
}
async function immutable(io,file,value){
  const text=canonical(value)+'\n';if(Buffer.byteLength(text)>MAX_BATCH)throw Error('History batch exceeds 2 MiB; originals remain private.');
  const same=async()=>{if(canonical(await read(io,file))!==canonical(value))throw Error('Immutable history file differs.');};
  try{await same();await files.syncDirectory(io,path.dirname(file));return;}catch(e){if(e.code!=='ENOENT')throw e;}
  const temporary=path.join(path.dirname(file),'.mrw-'+(ID.test(value.study)?value.study:'workspace')+'-'+randomUUID()+'.pending');let h,own;
  try{
    h=await io.open(temporary,'wx',0o600);own=await h.stat();await h.writeFile(text);await h.sync();
    const now=await io.lstat(temporary);if(now.ino!==own.ino||now.dev!==own.dev)throw Error('History staging file changed.');
    if(canonical(await read(io,temporary))!==canonical(value))throw Error('History staging bytes differ.');
    try{await io.link(temporary,file);}catch(e){if(e.code!=='EEXIST')throw e;}
    await same();await files.syncDirectory(io,path.dirname(file));
  }finally{
    await h?.close();
    if(own){const now=await io.lstat(temporary).catch(e=>{if(e.code!=='ENOENT')throw e;});
      if(now?.isFile()&&now.ino===own.ino&&now.dev===own.dev)await io.unlink(temporary);}
  }
}
function validateBatch(b){
  if(b?.format!==FORMAT+'-batch'||b.schema!==1||!UUID.test(b.writer)||!UUID.test(b.workspace)||
    (b.study!==null&&!ID.test(b.study))||!Array.isArray(b.events)||!b.events.length||!b.snapshots||!Array.isArray(b.missing))throw Error('Invalid shared history batch.');
  for(const e of b.events){validateEvent(e);if(scope(e)!==b.study)throw Error('History batch mixes studies.');}
  for(const [id,s] of Object.entries(b.snapshots)){
    if(!ID.test(id)||s.id!==id||s.representation!=='portable-v1'||s.sha256!==hash(s.text))throw Error('Shared snapshot digest differs.');
    JSON.parse(s.text);
  }
  if(canonical(portable(b))!==canonical(b))throw Error('Shared batch contains a host location.');
  return b;
}
class SharedHistory{
  constructor(local,installation,{io=fs,onStatus=()=>{},maxQueue=MAX_QUEUE,maxPending=MAX_PENDING}={}){
    this.local=local;this.installation=installation;this.io=io;this.onStatus=onStatus;this.maxQueue=maxQueue;this.maxPending=maxPending;
    this.deleted=new Set();this.tail=Promise.resolve();this.status={enabled:false,gaps:[],conflicts:[],missing:[],writers:[]};this.snapshots=new Map();
  }
  serial(action){const job=this.tail.then(action);this.tail=job.catch(()=>{});return job;}
  async init(){
    if(this.ready)return this.ready;
    this.ready=(async()=>{
      await this.io.mkdir(this.local,{recursive:true,mode:0o700});await this.io.mkdir(this.installation,{recursive:true,mode:0o700});
      for(const name of ['pending','deleted'])await directory(this.io,path.join(this.local,name),true);
      const identity=async(file)=>{let r;try{r=await read(this.io,file);}catch(e){if(e.code!=='ENOENT')throw e;try{await immutable(this.io,file,{schema:1,id:randomUUID()});}catch(error){
        // Two windows on this installation may initialize at once. Accept the
        // other window's complete identity, never overwrite it.
        try{r=await read(this.io,file);}catch{throw error;}
      }r??=await read(this.io,file);}
        if(r.schema!==1||!UUID.test(r.id))throw Error('Host-local history identity is invalid.');return r.id;};
      this.writer=await identity(path.join(this.installation,'writer.json'));
      this.workspace=await identity(path.join(this.local,'workspace.json'));
      try{this.binding=await read(this.io,path.join(this.local,'binding.json'));if(this.binding.schema!==1||!path.isAbsolute(this.binding.directory)||!UUID.test(this.binding.collection))throw Error('History binding is invalid.');}catch(e){if(e.code!=='ENOENT')throw e;}
      for(const n of await this.io.readdir(path.join(this.local,'deleted')))if(n.endsWith('.json')){const r=await read(this.io,path.join(this.local,'deleted',n));this.checkDeletion(r);this.deleted.add(r.study);}
      this.status.enabled=!!this.binding;return this;
    })().catch(error=>{this.ready=undefined;throw error;});return this.ready;
  }
  checkDeletion(r){if(r?.format!==FORMAT+'-delete'||r.schema!==1||!ID.test(r.study)||Object.keys(r).length!==3)throw Error('Invalid shared deletion marker.');}
  deletion(id){if(!ID.test(id))throw Error('Invalid study deletion identity.');return {format:FORMAT+'-delete',schema:1,study:id};}
  async root(binding,create=false){
    // Never recreate a missing selected root (which might be an offline mount).
    await directory(this.io,binding.directory);const root=path.join(binding.directory,'History');
    await directory(this.io,root,create);
    const marker=path.join(root,'format.json');let format;
    try{format=await read(this.io,marker);}catch(e){
      if(e.code!=='ENOENT'||!create)throw e;
      if((await this.io.readdir(root)).length)throw Error('History is occupied but has no MRW format marker; choose another directory.');
      await immutable(this.io,marker,{format:FORMAT,schema:1,collection:randomUUID()});format=await read(this.io,marker);
    }
    if(format.format!==FORMAT||format.schema!==1||!UUID.test(format.collection)||binding.collection&&format.collection!==binding.collection)throw Error('History collection differs from the verified binding.');
    for(const name of ['Writers','Deleted'])await directory(this.io,path.join(root,name),create);
    return {root,collection:format.collection};
  }
  async gap(reason){
    // Bounded metadata, never the rejected content. Originals remain private for reimport.
    const file=path.join(this.local,'gap.json');let old={count:0};try{old=await read(this.io,file);}catch(e){if(e.code!=='ENOENT')throw e;}
    await files.write(this.io,file,JSON.stringify({schema:1,count:old.count+1,reason,at:new Date().toISOString()})+'\n');
    this.status.gaps=[reason];this.onStatus('Shared history: '+reason);
  }
  async pending(){
    const dir=path.join(this.local,'pending'),rows=[];
    for(const n of await this.io.readdir(dir))if(/^[a-f0-9]{64}\.json$/.test(n)){const file=path.join(dir,n),batch=validateBatch(await read(this.io,file));
      if(hash(canonical(batch))!==n.slice(0,64))throw Error('Pending history digest differs.');rows.push({file,batch,bytes:Buffer.byteLength(canonical(batch))});}
    return rows;
  }
  async batches(events,loadSnapshot){
    const groups=new Map();for(const e of events){validateEvent(e);const id=scope(e);if(this.deleted.has(id))continue;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(e);}
    const result=[];
    const build=async(study,selected)=>{
      const snapshots={},missing=[];
      const ids=snapshotIDs(selected);
      for(const id of ids){
        let text;try{text=await loadSnapshot(id);}catch(e){if(e.code!=='ENOENT')throw e;missing.push(id);continue;}
        if(hash(text)!==id)throw Error('Private snapshot digest differs; import stopped.');
        const original=JSON.parse(text);snapshotIDs(original,ids);
        const projected=JSON.stringify(portable(original));snapshots[id]={id,representation:'portable-v1',sha256:hash(projected),text:projected};
      }
      const batch={format:FORMAT+'-batch',schema:1,writer:this.writer,workspace:this.workspace,study,events:portable(selected),snapshots,missing:missing.sort()};
      validateBatch(batch);
      if(Buffer.byteLength(canonical(batch))+1>MAX_BATCH&&selected.length>1){const middle=Math.ceil(selected.length/2);await build(study,selected.slice(0,middle));await build(study,selected.slice(middle));}
      else result.push(batch);
    };
    for(const [study,rows] of groups)for(let i=0;i<rows.length;i+=64)await build(study,rows.slice(i,i+64));
    return result;
  }
  async stage(events,loadSnapshot){
    await this.init();if(!this.binding||!events.length)return;
    return this.serial(async()=>{
      let staged={};try{staged=await read(this.io,path.join(this.local,'staged.json'));}catch(e){if(e.code!=='ENOENT')throw e;}
      events=events.filter(e=>e.sequence>(staged[e.session]||0));
      const pending=await this.pending();let size=pending.reduce((n,r)=>n+r.bytes,0),count=pending.length;
      for(const batch of await this.batches(events,loadSnapshot)){
        const bytes=Buffer.byteLength(canonical(batch)),id=hash(canonical(batch));if(pending.some(r=>r.file===path.join(this.local,'pending',id+'.json')))continue;
        if(bytes>MAX_BATCH||size+bytes>this.maxQueue||count>=this.maxPending){await this.gap('Pending queue limit reached; some private events need explicit reimport.');continue;}
        await immutable(this.io,path.join(this.local,'pending',id+'.json'),batch);size+=bytes;count++;
      }
      for(const e of events)staged[e.session]=Math.max(staged[e.session]||0,e.sequence);
      await files.write(this.io,path.join(this.local,'staged.json'),JSON.stringify(staged)+'\n');
    });
  }
  async cursors(){await this.init();try{return await read(this.io,path.join(this.local,'staged.json'));}catch(e){if(e.code==='ENOENT')return {};throw e;}}
  async publish(root,batch){
    if(this.deleted.has(batch.study))return;
    const writer=path.join(root,'Writers',batch.writer);await directory(this.io,writer,true);
    await immutable(this.io,path.join(writer,hash(canonical(batch))+'.json'),batch);
  }
  async tombstones(root){
    for(const n of await this.io.readdir(path.join(root,'Deleted')))if(n.endsWith('.json')){
      const r=await read(this.io,path.join(root,'Deleted',n));this.checkDeletion(r);
      await immutable(this.io,path.join(this.local,'deleted',r.study+'.json'),r);this.deleted.add(r.study);
    }
    for(const study of this.deleted)await immutable(this.io,path.join(root,'Deleted',study+'.json'),this.deletion(study));
  }
  async purgeStaging(dir){
    // Publication staging is MRW-owned and names its opaque study before any
    // payload is written. A crash can leave incomplete JSON; the reserved name
    // lets deletion remove those bytes without guessing from note contents.
    for(const name of await this.io.readdir(dir)){
      const m=/^\.mrw-([a-f0-9]{64})-[a-f0-9]{8}-[a-f0-9-]{27}\.pending$/.exec(name);
      if(!m||!this.deleted.has(m[1]))continue;
      const file=path.join(dir,name);await files.regular(this.io,file);
      try{const b=validateBatch(await read(this.io,file));if(b.study!==m[1])throw Error('Staging scope differs; cleanup stopped.');}
      catch(e){if(!(e instanceof SyntaxError))throw e;}
      await files.remove(this.io,file);
    }
  }
  async scan(root){
    await this.tombstones(root);const events=[],snapshots=new Map(),snapshotConflicts=new Set(),missing=new Set(),writers=new Set();
    for(const w of await this.io.readdir(path.join(root,'Writers'))){
      if(!UUID.test(w))continue;const dir=path.join(root,'Writers',w);await directory(this.io,dir);
      await this.purgeStaging(dir);
      // Accept synchronizer conflict-copy names; content, not filename, identifies records.
      for(const n of await this.io.readdir(dir))if(n.endsWith('.json')){
        const file=path.join(dir,n),b=validateBatch(await read(this.io,file));if(b.writer!==w)throw Error('History writer directory differs.');
        if(this.deleted.has(b.study)){await files.remove(this.io,file);continue;}
        writers.add(w);for(const e of b.events)events.push({...e,history_context:{writers:[e.writer||'imported:'+b.workspace],workspaces:[e.workspace||b.workspace]}});
        for(const id of b.missing)missing.add(id);
        for(const [id,s] of Object.entries(b.snapshots)){
          if(snapshots.has(id)&&canonical(snapshots.get(id))!==canonical(s))snapshotConflicts.add(id);else snapshots.set(id,s);
        }
      }
    }
    for(const id of snapshotConflicts)snapshots.delete(id);
    for(const id of snapshotIDs(events))if(!snapshots.has(id))missing.add(id);for(const id of snapshots.keys())missing.delete(id);
    const merged=mergeEvents(events,this.deleted);this.snapshots=snapshots;
    return {...merged,snapshotConflicts:[...snapshotConflicts].sort(),missing:[...missing].sort(),writers:[...writers].sort()};
  }
  async sync(){
    if(this.syncing)return this.syncing;
    this.syncing=this.syncOnce();try{return await this.syncing;}finally{this.syncing=undefined;}
  }
  async syncOnce(){
    await this.init();if(!this.binding)return {events:[],conflicts:[]};
    return this.serial(async()=>{
      try{
        const {root}=await this.root(this.binding);await this.tombstones(root);
        for(const {file,batch} of await this.pending()){
          if(!this.deleted.has(batch.study))await this.publish(root,batch);
          await files.remove(this.io,file);
        }
        const found=await this.scan(root);let gap;
        try{gap=await read(this.io,path.join(this.local,'gap.json'));}catch(e){if(e.code!=='ENOENT')throw e;}
        this.status={enabled:true,...found,events:undefined,gaps:gap?[gap.reason]:[],pending:0,observed:new Date().toISOString()};
        this.onStatus(gap?'Shared history: '+gap.reason:'');return found;
      }catch(e){
        // No host paths or filesystem error text enters synchronized records.
        this.status={...this.status,enabled:true,gaps:[...new Set([...this.status.gaps,'Shared directory unavailable or invalid; private history is still available.'])],pending:(await this.pending().catch(()=>[])).length};
        this.onStatus('Shared history unavailable; private history and pending batches remain.');return {events:[],conflicts:[],unavailable:true};
      }
    });
  }
  async importFrom(dataDirectory,events,loadSnapshot,deleted=[]){
    await this.init();return this.serial(async()=>{
      // The active binding changes only after a complete read-back verification.
      const binding={schema:1,directory:path.resolve(dataDirectory)};
      if(this.binding&&this.binding.directory!==binding.directory)await this.canDisconnect();
      const {root,collection}=await this.root(binding,true);binding.collection=collection;
      for(const id of deleted){await immutable(this.io,path.join(this.local,'deleted',id+'.json'),this.deletion(id));this.deleted.add(id);}
      await this.tombstones(root);
      const batches=await this.batches(events,loadSnapshot);
      if(batches.some(b=>b.missing.length))throw Error('Import stopped: required private snapshots are missing. Originals and the previous binding remain.');
      for(const b of batches)await this.publish(root,b);
      const found=await this.scan(root),byID=new Map(found.events.map(e=>[e.id,e]));
      for(const b of batches)for(const e of b.events)if(!this.deleted.has(b.study)){
        const actual=byID.get(e.id);if(!actual||canonical(require('./historyRecords').eventPayload(actual))!==canonical(e))throw Error('Import verification found missing or conflicting events; binding unchanged.');
      }
      for(const b of batches)for(const [id,s] of Object.entries(b.snapshots))if(!this.deleted.has(b.study)&&canonical(this.snapshots.get(id))!==canonical(s))throw Error('Import snapshot verification failed; binding unchanged.');
      await files.write(this.io,path.join(this.local,'binding.json'),JSON.stringify(binding)+'\n');this.binding=binding;
      const staged={};for(const e of events)staged[e.session]=Math.max(staged[e.session]||0,e.sequence);
      await files.write(this.io,path.join(this.local,'staged.json'),JSON.stringify(staged)+'\n');
      await files.remove(this.io,path.join(this.local,'gap.json'));
      // Old queued batches are already represented by verified private history.
      for(const {file} of await this.pending())await files.remove(this.io,file);
      this.status={enabled:true,...found,events:undefined,gaps:[],pending:0,observed:new Date().toISOString()};return this.status;
    });
  }
  async deleteStudy(id){
    await this.init();return this.serial(async()=>{
      // This host-local marker is durable even while the selected folder is offline.
      await immutable(this.io,path.join(this.local,'deleted',id+'.json'),this.deletion(id));this.deleted.add(id);this.snapshots.clear();
      for(const {file,batch} of await this.pending())if(batch.study===id)await files.remove(this.io,file);
      await this.purgeStaging(path.join(this.local,'pending'));
    });
  }
  async disconnect(){await this.init();return this.serial(async()=>{
    await this.canDisconnect();
    await files.remove(this.io,path.join(this.local,'binding.json'));this.binding=undefined;this.status={enabled:false,gaps:[],conflicts:[],missing:[],writers:[]};this.snapshots.clear();
  });}
  async canDisconnect(){
    if((await this.pending()).length)throw Error('Shared history has pending batches; retry or reimport before disconnecting.');
    if(this.binding&&this.deleted.size){
      const {root}=await this.root(this.binding);
      for(const id of this.deleted)try{const r=await read(this.io,path.join(root,'Deleted',id+'.json'));this.checkDeletion(r);if(r.study!==id)throw Error('Wrong deletion identity.');}
      catch{throw Error('Shared deletion markers have not been verified; retry before changing or disconnecting the directory.');}
    }
  }
}
module.exports={SharedHistory,immutable,validateBatch,read,MAX_BATCH,MAX_QUEUE};
