'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto');
const files=require('./studyFiles');
const ID=/^[a-f0-9]{64}$/;
const stateOf=record=>record?.state||'active';
function digests(value,result=new Set()){
  if(typeof value==='string'&&ID.test(value))result.add(value);
  else if(Array.isArray(value))for(const v of value)digests(v,result);
  else if(value&&typeof value==='object')for(const v of Object.values(value))digests(v,result);
  return result;
}
// Lifecycle markers are in the existing study directory. A deleting marker is
// a durable recovery intent, containing opaque identities only. No study text
// is copied into it; a completed deletion retains only a tombstone.
class StudyLifecycle{
  constructor(home,history,io=fs){this.home=home;this.history=history;this.io=io;this.records=new Map();}
  file(id){if(!ID.test(id))throw Error('Study identity is invalid.');return path.join(this.home,id+'.lifecycle.json');}
  get(id){return this.records.get(id);}
  state(id){return stateOf(this.get(id));}
  async read(id){try{
    const r=await files.json(this.io,this.file(id));
    if(r.version!==1||r.id!==id||!ID.test(r.sourceKey)||typeof r.epoch!=='string'||!['active','archived','trashed','deleting','deleted'].includes(r.state))throw Error('Study lifecycle record is invalid.');
    return r;
  }catch(e){if(e.code!=='ENOENT')throw e;}}
  async load(){
    await this.io.mkdir(this.home,{recursive:true,mode:0o700});
    for(const name of await this.io.readdir(this.home))if(/^[a-f0-9]{64}\.lifecycle\.json$/.test(name)){
      const id=name.slice(0,64);this.records.set(id,await this.read(id));
    }
    this.history.excludeStudies([...this.records.values()].filter(r=>['deleting','deleted'].includes(r.state)).map(r=>r.id));
  }
  async assertCurrent(id){
    const now=await this.read(id),known=this.get(id);
    if(JSON.stringify(now)!==JSON.stringify(known))throw Error('Study state changed in another session. Reopen it before saving.');
    if(['deleting','deleted'].includes(stateOf(now)))throw Error('This study was deleted. Its old reference cannot be reused.');
  }
  async publish(r){
    try{await files.write(this.io,this.file(r.id),JSON.stringify(r)+'\n');}
    catch(e){
      // A rename may have succeeded before directory sync failed. Treat the
      // published state as authoritative, but still report the failed operation.
      const disk=await this.read(r.id);if(disk)this.records.set(r.id,disk);throw e;
    }
    this.records.set(r.id,r);
  }
  async change(id,state,sourceKey){
    await this.assertCurrent(id);const old=this.get(id);
    const r={version:1,id,sourceKey,epoch:randomUUID(),state};
    if(state==='trashed')r.previous=stateOf(old);
    await this.publish(r);return r;
  }
  async beginDelete(id,sourceKey,candidates){
    await this.assertCurrent(id);if(this.state(id)!=='trashed')throw Error('Move this study to Trash before permanent deletion.');
    await this.publish({version:1,id,sourceKey,state:'deleting',epoch:randomUUID(),snapshots:[...candidates]});
    this.history.excludeStudies([id]);
  }
  async recover(studies){
    for(const r of this.records.values())if(r.state==='deleting')await this.finishDelete(r.id,studies);
  }
  async finishDelete(id,studies){
    const r=this.get(id);if(r?.state!=='deleting')return;
    const retained=[...studies.values()].filter(s=>s.id!==id&&!['deleting','deleted'].includes(this.state(s.id)));
    // The recorder serializes removal with its own flush queue. Mixed sessions
    // retain other events; a referenced snapshot survives even if first created
    // in this study. Failed cleanup leaves the intent for the next explicit load.
    await this.history.eraseStudy(id,new Set(r.snapshots),digests(retained));
    await files.remove(this.io,path.join(this.home,id+'.json.pending'));
    await files.remove(this.io,path.join(this.home,id+'.json'));
    await this.publish({version:1,id,sourceKey:r.sourceKey,state:'deleted',epoch:r.epoch});
    studies.delete(id);
  }
}
module.exports={StudyLifecycle,stateOf,digests};
