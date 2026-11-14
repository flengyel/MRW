'use strict';
// Versioned, bounded, read-only core inspection. No sync/recovery operation is called.
const fs=require('node:fs/promises'),{constants}=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const DEFAULTS=Object.freeze({files:2000,bytes:64*1024*1024,milliseconds:10000,findings:500,jsonBytes:2*1024*1024});
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const same=(a,b)=>['dev','ino','size','mtimeMs','ctimeMs'].every(k=>a[k]===b[k]);
const safeRelative=name=>typeof name==='string'&&name.length<4096&&!name.includes('\\')&&!name.includes(':')&&!path.isAbsolute(name)&&name.split('/').every(p=>p&&p!=='.'&&p!=='..');
function createInspection({storageRoots=[],usage,version='unknown',scope='workspace',io=fs}={}){
  return Object.freeze({version:1,scope,
    async featureUse(options={}){if(!usage)return {status:'unsupported',coverage:'Feature-use inspection is unavailable'};return usage(options);},
    async inspect({signal,limits={}}={}){
      const budget=Object.fromEntries(Object.entries(DEFAULTS).map(([k,v])=>[k,Number.isFinite(limits[k])&&limits[k]>0?Math.min(v,Math.floor(limits[k])):v]));
      const started=Date.now(),findings=[],verified=[],roots=[],classes={},digests=new Map();let files=0,bytes=0,stop,omitted=0;
      const check=()=>{if(signal?.aborted){stop='cancelled';throw Error('Inspection cancelled');}if(Date.now()-started>budget.milliseconds||files>=budget.files||bytes>=budget.bytes){stop='resource-limit';throw Error('Inspection resource limit reached');}};
      function finding(kind,state,locator,detail){if(findings.length>=budget.findings){omitted++;return;}findings.push({id:hash(kind+'\0'+locator).slice(0,24),kind,state,locator:String(locator).slice(0,2048),detail:String(detail).slice(0,1024)});}
      async function read(file,metadata=false){
        check();if(await io.realpath(file)!==file)throw Error('Redirected file is outside inspection scope');const before=await io.lstat(file);if(!before.isFile()||before.isSymbolicLink())throw Error('Unsupported redirected or nonregular file');
        if(metadata&&before.size>budget.jsonBytes){finding('metadata','unsupported',file,'Metadata exceeds the bounded parser limit');return;}
        if(before.size>budget.bytes-bytes){stop='resource-limit';throw Error('Inspection byte limit reached');}
        const handle=await io.open(file,constants.O_RDONLY|constants.O_NOFOLLOW),chunks=[],digest=crypto.createHash('sha256');let total=0;
        try{if(!same(before,await handle.stat()))throw Error('changed-during-inspection');const buffer=Buffer.alloc(65536);
          for(;;){check();const r=await handle.read(buffer,0,buffer.length,null);if(!r.bytesRead)break;total+=r.bytesRead;bytes+=r.bytesRead;if(bytes>budget.bytes){stop='resource-limit';throw Error('Inspection byte limit reached');}const piece=buffer.subarray(0,r.bytesRead);digest.update(piece);if(metadata){if(total>budget.jsonBytes)throw Error('Metadata grew beyond parser limit');chunks.push(Buffer.from(piece));}}
          if(!same(before,await handle.stat())||!same(before,await io.lstat(file)))throw Error('changed-during-inspection');
          return {sha256:digest.digest('hex'),size:total,raw:metadata?Buffer.concat(chunks):undefined};
        }finally{await handle.close();}
      }
      async function inspectRoot(spec){
        const root=typeof spec==='string'?spec:spec.path,label=typeof spec==='string'?'MRW storage':spec.label||'MRW storage';
        const row={label,path:root,status:'complete',files:0,bytes:0,checks:['streamed byte hashes','content-addressed object digests','bounded metadata','active generation manifests'],unchecked:['external note/proof targets','remote replicas','semantic correctness','full schema/dependency validation']};roots.push(row);
        const authorityPins=[];
        try{check();if(typeof root!=='string'||!path.isAbsolute(root)||await io.realpath(root)!==root)throw Error('Unsupported storage root');
          const beforeBytes=bytes;
          async function walk(dir){check();if(await io.realpath(dir)!==dir)throw Error('Directory changed during inspection');const folder=await io.opendir(dir);try{for await(const entry of folder){check();const file=path.join(dir,entry.name);
            if(entry.isSymbolicLink()){finding('path','unsupported',file,'Symlinks are not followed');row.status='partial';continue;}
            if(entry.isDirectory()){await walk(file);continue;}if(!entry.isFile()){finding('path','unsupported',file,'Nonregular storage entry is not inspected');row.status='partial';continue;}
            let captured;try{captured=await read(file,entry.name.endsWith('.json'));}catch(e){if(stop)throw e;finding('file',e.message==='changed-during-inspection'?'changed-during-inspection':e.code==='ENOENT'?'unavailable':'unchecked',file,e.message);row.status='partial';continue;}
            files++;row.files++;if(!captured){row.status='partial';continue;}row.bytes+=captured.size;
            const category=/history/.test(file)?'history':/notebook/.test(file)?'notebook':/source-|artifact-/.test(entry.name)?'retained bytes':/pending|staging|\.tmp/.test(entry.name)?'staging':'metadata and other owned files';classes[category]=(classes[category]||0)+captured.size;
            const expected=/(?:source-|artifact-)([a-f0-9]{64})\.bin$/.exec(entry.name)?.[1] || (/[/\\]snapshots[/\\]/.test(file)?/^([a-f0-9]{64})\.json$/.exec(entry.name)?.[1]:null);
            if(expected){if(expected!==captured.sha256)finding('digest','failure',file,'Retained bytes differ from their content-addressed name');else verified.push(hash('digest'+'\0'+file).slice(0,24));}
            const prior=digests.get(captured.sha256);if(prior&&prior!==file)finding('equal-content','review',file,'Equal bytes also occur at '+prior+'. Distinct identity/provenance is retained; no cleanup is authorized.');else if(digests.size<budget.files)digests.set(captured.sha256,file);
            if(/pending|staging|\.tmp/.test(entry.name))finding('interrupted-operation','review',file,'Possible pending operation; owner recovery must establish its state. Age does not establish safe removal.');
            if(!captured.raw)continue;
            let data;try{data=JSON.parse(captured.raw.toString('utf8'));verified.push(hash('json'+'\0'+file).slice(0,24));}catch(_){finding('json','failure',file,'Stored JSON cannot be parsed');continue;}
            if(data?.schema==='mrw.source-outline'&&/^[a-f0-9]{64}$/.test(data.source?.revision||'')){
              const retained=path.join(dir,'source-'+data.source.revision+'.bin');
              try{const actual=await read(retained);if(actual.sha256!==data.source.revision)finding('source-reference','failure',retained,'Retained source differs from the outline revision');else verified.push(hash('source-reference'+'\0'+retained).slice(0,24));}
              catch(e){if(stop)throw e;finding('source-reference',e.message==='changed-during-inspection'?'changed-during-inspection':e.code==='ENOENT'?'failure':'unchecked',retained,e.message);}
            }
            if(Array.isArray(data?.continuations))for(const record of data.continuations.slice(0,256)){if(record.phase==='pending')finding('pending-association','review',file+'#'+record.association,'An external note association is pending; inspection does not retry it.');else verified.push(hash('pending-association'+'\0'+file+'#'+record.association).slice(0,24));}
            if(['deleting','deleted'].includes(data?.state)||/\.deleted\.json$/.test(entry.name))finding('deletion-marker','observed',file,'Deletion marker retained; inspection does not apply or remove it.');
            if(entry.name==='HEAD.json'&&data?.version===1&&typeof data.generation==='string'&&data.files&&typeof data.files==='object'){
              authorityPins.push({file,digest:captured.sha256});
              if(!/^[a-f0-9-]{36}$/.test(data.generation)){finding('manifest','failure',file,'Invalid generation locator');continue;}
              let n=0;for(const [name,item] of Object.entries(data.files)){check();if(++n>budget.files){stop='resource-limit';throw Error('Manifest entry limit reached');}
                if(!safeRelative(name)||!item||!/^([a-f0-9]{64})$/.test(item.sha256)||!Number.isSafeInteger(item.size)||item.size<0){finding('manifest','failure',file,'Invalid bounded manifest entry');continue;}
                const target=path.join(dir,'versions',data.generation,'payload',name);
                try{if(await io.realpath(target)!==target)throw Error('Redirected manifest target');const actual=await read(target);if(actual.sha256!==item.sha256||actual.size!==item.size)finding('manifest-digest','failure',target,'Target differs from active generation manifest');else {verified.push(hash('manifest-digest'+'\0'+target).slice(0,24));verified.push(hash('manifest-target'+'\0'+target).slice(0,24));}}
                catch(e){if(stop)throw e;finding('manifest-target',e.code==='ENOENT'?'failure':e.message==='changed-during-inspection'?'changed-during-inspection':'unchecked',target,e.message);row.status='partial';}
              }
            }
          }}finally{await folder.close().catch(()=>{});}}
          await walk(root);
          for(const pin of authorityPins){const end=await read(pin.file,true);if(!end||end.sha256!==pin.digest){row.status='changed-during-inspection';verified.length=0;for(const f of findings)if(f.locator.startsWith(root)&&f.state==='failure')f.state='changed-during-inspection';finding('generation','changed-during-inspection',path.dirname(pin.file),'Authority changed during inspection; observed mismatches are inconclusive.');}}

          row.ioBytes=bytes-beforeBytes;
        }catch(e){row.status=stop|| (e.message==='changed-during-inspection'?'changed-during-inspection':e.code==='ENOENT'?'unavailable':'partial');if(row.status==='changed-during-inspection'){verified.length=0;for(const f of findings)if(f.locator.startsWith(root)&&f.state==='failure')f.state='changed-during-inspection';}finding('coverage',row.status,root||label,e.message);}
      }
      const candidates=typeof storageRoots==='function'?await storageRoots():storageRoots;const selected=[...new Map(candidates.map(r=>[typeof r==='string'?r:r.path,r])).values()];
      for(const root of selected.slice(0,8)){if(stop)break;await inspectRoot(root);}
      if(selected.length>8)finding('coverage','unchecked',scope,'More than eight roots supplied; extra roots were not inspected');
      const status=stop||(!roots.length||roots.some(r=>r.status!=='complete')||omitted?'partial':findings.some(f=>f.state==='failure')?'failures':'completed-supported-checks');
      return {schema:'mrw.inspection',version:1,run:crypto.randomUUID(),scope,coreVersion:version,started:new Date(started).toISOString(),ended:new Date().toISOString(),status,limits:budget,resources:{files,bytes,milliseconds:Date.now()-started,omittedFindings:omitted},roots,classes,findings,verified:stop?[]:verified,coverage:'Only explicitly supplied core-owned storage roots. Completed supported checks do not establish complete store health; external/remote targets and full schema checks remain unchecked.'};
    }
  });
}
module.exports={createInspection,DEFAULTS,same,safeRelative};
