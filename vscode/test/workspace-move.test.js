'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {WorkspaceMove,scan,lookup,rebase,jsonc,DATA,hash}=require('../src/workspaceMove');
async function fixture(t){const temp=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-move-'));t.after(()=>fs.rm(temp,{recursive:true,force:true}));const source=path.join(temp,'source'),privateHome=path.join(temp,'private');await fs.mkdir(source);await fs.mkdir(privateHome);const workspace=path.join(source,'MRW.code-workspace');await fs.writeFile(workspace,JSON.stringify({folders:[{path:'.',name:'MRW'},{path:'../external',name:'notes'}],settings:{'mrw.notesFolder':'/outside/notes','mrw.leanStudyParent':source}}));await fs.writeFile(path.join(source,'proof.md'),'# Proof\nExact mathematical text.\n');await fs.mkdir(path.join(privateHome,'active-studies-v1'));await fs.writeFile(path.join(privateHome,'active-studies-v1','deleted.json'),'tombstone\n');await fs.mkdir(path.join(privateHome,'study-history-v1'));await fs.writeFile(path.join(privateHome,'study-history-v1','batch.json'),'immutable history\n');const registry=path.join(temp,'registry'),destination=path.join(temp,'destination');return {source,privateHome,workspace,destination,registry,state:{lean:{root:source,question:'Do not edit /source in prose'},recent:['file://'+source+'/proof.md']},tabs:[{uri:'file://'+source+'/proof.md'}],bridge:async()=>{throw Error('Unexpected source store call');}};}
test('complete move preserves documents, study deletion markers, history and external notes; restart selects destination',async t=>{const f=await fixture(t),before=await scan(f.source),privateBefore=await scan(f.privateHome);const r=await new WorkspaceMove(f.registry).move(f);assert.equal(r.phase,'committed');assert.deepEqual(await scan(f.source),before);assert.deepEqual(await scan(r.newHome),privateBefore);assert.equal(lookup(f.registry,f.workspace).destinationWorkspace,r.destinationWorkspace);assert.equal(lookup(f.registry,r.destinationWorkspace).phase,'committed');const encoded=JSON.parse(await fs.readFile(path.join(f.destination,DATA,'workspace-state.json')));assert.equal(encoded.lean.root.$mrwPath,'workspace');const s=require('../src/workspacePaths').decode(encoded,f.destination);assert.equal(s.lean.root,f.destination);assert.equal(s.recent[0],'file://'+f.destination+'/proof.md');const w=JSON.parse(await fs.readFile(r.destinationWorkspace));assert.equal(w.settings['mrw.notesFolder'],'/outside/notes');assert.equal(w.folders[1].path,path.join(path.dirname(f.source),'external'));assert.equal((await new WorkspaceMove(f.registry).recover(r.id)).phase,'committed');});
for(const checkpoint of ['intent','copied','verified','committed'])test('interruption at '+checkpoint+' has one recoverable authority',async t=>{const f=await fixture(t),before=await scan(f.source),prior=await scan(f.privateHome);await assert.rejects(new WorkspaceMove(f.registry,{checkpoint:async p=>{if(p===checkpoint)throw Error('interrupted');}}).move(f),/interrupted/);const r=lookup(f.registry,f.workspace),out=await new WorkspaceMove(f.registry).recover(r.id);assert.equal(out.phase,checkpoint==='committed'?'committed':'aborted');assert.deepEqual(await scan(f.source),before);assert.deepEqual(await scan(f.privateHome),prior);assert.equal((await new WorkspaceMove(f.registry).recover(r.id)).phase,out.phase);});
test('changed source aborts before commit and never overwrites source',async t=>{const f=await fixture(t);await assert.rejects(new WorkspaceMove(f.registry,{checkpoint:async p=>{if(p==='copied')await fs.writeFile(path.join(f.source,'proof.md'),'new work');}}).move(f),/Source changed/);assert.equal(lookup(f.registry,f.workspace).phase,'preparing');assert.equal(await fs.readFile(path.join(f.source,'proof.md'),'utf8'),'new work');});
test('occupied destination is preserved',async t=>{const f=await fixture(t);await fs.mkdir(f.destination);await fs.writeFile(path.join(f.destination,'keep'),'mine');await assert.rejects(new WorkspaceMove(f.registry).move(f),/already exists/);assert.equal(await fs.readFile(path.join(f.destination,'keep'),'utf8'),'mine');});
test('committed destination corruption fails recovery without resurrecting original',async t=>{const f=await fixture(t),r=await new WorkspaceMove(f.registry).move(f);await fs.writeFile(path.join(r.newHome,'active-studies-v1','deleted.json'),'corrupt');await assert.rejects(new WorkspaceMove(f.registry).recover(r.id),/differs/);assert.equal(lookup(f.registry,f.workspace).phase,'committed');});
test('relative symlinks remain links; external symlinks are not traversed',async t=>{const f=await fixture(t);await fs.symlink('proof.md',path.join(f.source,'linked.md'));await fs.symlink('/outside/unavailable',path.join(f.source,'external'));await new WorkspaceMove(f.registry).move(f);assert.equal(await fs.readlink(path.join(f.destination,'linked.md')),'proof.md');assert.equal(await fs.readlink(path.join(f.destination,'external')),'/outside/unavailable');});
test('paths rebase while mathematical prose and retained citations stay exact',()=>{assert.deepEqual(rebase({root:'/a',text:'/a/proof',reference:'mrw-outline:v2/pin',file:'/ab/file',uri:'file:///a/note.md'},[['/a','/b']]),{root:'/b',text:'/a/proof',reference:'mrw-outline:v2/pin',file:'/ab/file',uri:'file:///b/note.md'});assert.equal(jsonc('{"folders": [ {"path":"."}, ], // comment\n"settings": {}}').folders[0].path,'.');});
test('second relocation keeps private study data and sources already under the workspace',async t=>{
 const f=await fixture(t),first=await new WorkspaceMove(f.registry).move(f);
 await fs.mkdir(path.join(f.destination,DATA,'sources'));await fs.writeFile(path.join(f.destination,DATA,'sources','retained'),'exact source');
 const second=await new WorkspaceMove(f.registry).move({...f,workspace:first.destinationWorkspace,privateHome:first.newHome,destination:f.destination+'-again'});
 assert.equal(await fs.readFile(path.join(second.destination,DATA,'sources','retained'),'utf8'),'exact source');
 assert.equal(await fs.readFile(path.join(second.newHome,'active-studies-v1/deleted.json'),'utf8'),'tombstone\n');
 assert.equal(rebase(f.source,second.mappings),second.destination);
});
test('a pending source transaction refuses migration',async t=>{const f=await fixture(t);await fs.mkdir(path.join(f.privateHome,'artifact-runtime'));await fs.writeFile(path.join(f.privateHome,'artifact-runtime/transaction.json'),'{}');await assert.rejects(new WorkspaceMove(f.registry).move(f),/pending saved-source/);});
const {session}=require('../src/workspaceMoveHost');
function host(f,workspace=f.workspace){return {api:{workspace:{workspaceFile:{fsPath:workspace},isTrusted:true},Uri:{file:fsPath=>({scheme:'file',fsPath})}},context:{storageUri:{fsPath:f.privateHome},globalStorageUri:{fsPath:path.dirname(f.registry)},workspaceState:{keys:()=>[],get:()=>undefined,update:async()=>{}},subscriptions:[]}};}
test('source window is blocked after commit; destination restores private state without native database writes',async t=>{const f=await fixture(t);f.registry=path.join(path.dirname(f.registry),'workspace-moves-v1');const r=await new WorkspaceMove(f.registry).move(f);let h=host(f),old=session(h.api,h.context);assert.ok(old.blocked);await assert.rejects(old.run(async()=>{}),/moved/);h=host(f,r.destinationWorkspace);const current=session(h.api,h.context);await current.ready;assert.equal(current.context.storageUri.fsPath,r.newHome);assert.equal(current.context.workspaceState.get('lean').root,f.destination);await Promise.all([current.context.workspaceState.update('a',1),current.context.workspaceState.update('b',2)]);assert.equal(current.context.workspaceState.get('a'),1);assert.equal(current.context.workspaceState.get('b'),2);for(const d of h.context.subscriptions)d.dispose();});
test('another live window blocks relocation before copying',async t=>{const f=await fixture(t);f.registry=path.join(path.dirname(f.registry),'workspace-moves-v1');const h1=host(f),h2=host(f),a=session(h1.api,h1.context);await a.ready;const b=session(h2.api,h2.context);await b.ready;await assert.rejects(a.freeze(),/Another MRW window/);for(const h of [h1,h2])for(const d of h.context.subscriptions)d.dispose();});
test('an aborted destination cannot be activated as a second writable workspace',async t=>{const f=await fixture(t);f.registry=path.join(path.dirname(f.registry),'workspace-moves-v1');await assert.rejects(new WorkspaceMove(f.registry,{checkpoint:async p=>{if(p==='intent')throw Error('stop');}}).move(f));const r=lookup(f.registry,f.workspace);await new WorkspaceMove(f.registry).recover(r.id);const h=host(f,r.destinationWorkspace);assert.ok(session(h.api,h.context).blocked);});
test('current-window setup does not require another window and guards drafts first',async()=>{const {registerWorkspaceSetup}=require('../src/workspaceSetup'),commands=new Map(),calls=[];let blocked=true;const vscode={workspace:{getConfiguration:()=>({get:(_k,f)=>f})},window:{showInformationMessage:async()=> 'Open in this window'},Uri:{file:fsPath=>({fsPath})},commands:{executeCommand:async(...args)=>calls.push(args)}};registerWorkspaceSetup({vscode,register:(id,fn)=>commands.set(id,fn),prepare:async()=>({workspace:'/home/user/mrw-work/MRW.code-workspace'}),checkPython:async()=>({text:'Python'}),beforeSwitch:async()=>{if(blocked)throw Error('reader draft');}});await assert.rejects(commands.get('mrw.setupWorkspace')(),/draft/);assert.equal(calls.length,0);blocked=false;await commands.get('mrw.setupWorkspace')();assert.equal(calls[0][2].forceReuseWindow,true);});
test('real bridge reopens original retained citations and reader notes after legacy-store relocation',async t=>{
 const {runBridge}=require('../src/bridge');const f=await fixture(t);const ext=path.resolve(__dirname,'..');f.bridge=req=>runBridge(ext,'python3',req);
 const file=path.join(f.source,'proof.md'),text=await fs.readFile(file),store=path.join(f.privateHome,'outlines-'+hash(f.source));
 const base={store,project_root:f.source,artifact_home:f.privateHome,artifact_epoch:'legacy'};
 let saved=await f.bridge({method:'outline_create',...base,path:file,source_revision:hash(text)});
 saved=await f.bridge({method:'outline_mutate',...base,id:saved.outline.id,revision:saved.revision,change:{kind:'annotation',region:null,id:null,purpose:'explanation',text:'Reader note with \\(X\\times_Y X\\).',origin:'human_work',author:'Reader'}});
 const reference=await f.bridge({method:'outline_reference',...base,id:saved.outline.id,revision:saved.revision,region:null});
 const moved=await new WorkspaceMove(f.registry).move(f);
 const opened=await f.bridge({method:'outline_follow_reference',artifact_home:moved.newHome,store:path.join(moved.newHome,'outlines-'+hash(f.destination)),project_root:f.destination,reference:reference.reference});
 assert.equal(opened.outline.annotations[0].text,saved.outline.annotations[0].text);
 assert.equal(opened.outline.source.revision,hash(text));
 assert.equal((await fs.readFile(file)).toString(),text.toString());
});


test('recovery cannot run concurrently with a live move',async t=>{
 const f=await fixture(t);let entered,release;const waiting=new Promise(r=>entered=r),hold=new Promise(r=>release=r);
 const moving=new WorkspaceMove(f.registry,{checkpoint:async phase=>{if(phase==='intent'){entered();await hold;}}}).move(f);
 await waiting;const r=lookup(f.registry,f.workspace);
 await assert.rejects(new WorkspaceMove(f.registry).recover(r.id),/running/);release();await moving;
 assert.equal((await new WorkspaceMove(f.registry).recover(r.id)).phase,'committed');
});
test('remote URI authority and JSONC comments survive path rebasing',()=>{
 assert.equal(rebase('vscode-remote://ssh-remote+machine/a/note%20one.md#section',[['/a','/b']]),'vscode-remote://ssh-remote+machine/b/note%20one.md#section');
 assert.deepEqual(jsonc('{"folders":[{"path":"."}, /* trailing */],}'),{folders:[{path:'.'}]});
});


test('workspace and notes locations are relative; changing the chosen notes folder cannot redirect a saved reference',()=>{
 const {encode,decode}=require('../src/workspacePaths');const value={root:'/work',file:'file:///work/proof.md',note:'file:///vault/note%20one.md#result',text:'/work/this is mathematical prose',reference:'mrw-outline:v2/exact'};
 const saved=encode(value,'/work','/vault');assert.deepEqual(saved.root,{$mrwPath:'workspace',relative:''});assert.equal(saved.note.relative,'note one.md');assert.equal(saved.note.root,'/vault');
 const opened=decode(saved,'/moved');assert.equal(opened.file,'file:///moved/proof.md');assert.equal(opened.note,value.note);assert.equal(opened.text,value.text);assert.equal(opened.reference,value.reference);
 assert.throws(()=>decode({$mrwPath:'workspace',relative:'../escape'},'/work'),/leaves/);
});

for(const published of [false,true])test('failed authority write '+(published?'after':'before')+' publication recovers from disk authority',async t=>{
 const {write}=require('../src/workspaceMove'),f=await fixture(t);
 await assert.rejects(new WorkspaceMove(f.registry,{publish:async(file,r)=>{
   if(r.phase==='committed'){if(published)await write(file,r);throw Error('injected authority write failure');}await write(file,r);
 }}).move(f),/injected/);
 const r=lookup(f.registry,f.workspace);assert.equal((await new WorkspaceMove(f.registry).recover(r.id)).phase,published?'committed':'aborted');
});
test('cross-filesystem copy uses the same authority commit and preserves exact source bytes',async t=>{
 const f=await fixture(t);let other;try{other=await fs.mkdtemp('/dev/shm/mrw-cross-move-');}catch{return t.skip('No disposable second filesystem');}
 t.after(()=>fs.rm(other,{recursive:true,force:true}));
 if((await fs.stat(other)).dev===(await fs.stat(path.dirname(f.destination))).dev)return t.skip('No distinct filesystem');
 const source=path.join(other,'source');await fs.cp(f.source,source,{recursive:true});const before=await scan(source);
 const r=await new WorkspaceMove(f.registry).move({...f,workspace:path.join(source,'MRW.code-workspace')});
 assert.equal(r.phase,'committed');assert.deepEqual(await scan(source),before);assert.equal(await fs.readFile(path.join(r.destination,'proof.md'),'utf8'),'# Proof\nExact mathematical text.\n');
});
async function moveCommand(t){
 const f=await fixture(t);f.registry=path.join(path.dirname(f.registry),'workspace-moves-v1');
 const h=host(f),commands=new Map(),calls=[];
 h.api.workspace.textDocuments=[];h.api.workspace.getConfiguration=()=>({get:(_k,f)=>f});
 h.api.window={showInputBox:async()=>f.destination,showWarningMessage:async()=> 'Move workspace',showInformationMessage:async()=>undefined};
 const owner=session(h.api,h.context);await owner.ready;t.after(()=>{for(const d of h.context.subscriptions)d.dispose();});
 const options={vscode:h.api,context:owner.context,register:(id,fn)=>commands.set(id,fn),session:owner,
 clients:[{freeze:async()=>calls.push('freeze'),release:async()=>calls.push('release')}],study:{prepareMove:async()=>calls.push('study')},recorder:{pauseForMove:async()=>calls.push('pause'),resumeAfterMove:()=>calls.push('resume')},bridge:f.bridge};
 require('../src/workspaceMoveHost').registerWorkspaceMove(options);return {f,h,owner,commands,calls,options};
}
test('cancel and unsaved text/notebook tabs leave the source and all MRW state untouched',async t=>{
 const h=await moveCommand(t),before=await scan(h.f.source);
 h.h.api.window.showInputBox=async()=>undefined;await h.commands.get('mrw.moveWorkspace')();assert.deepEqual(h.calls,[]);
 h.h.api.window.showInputBox=async()=>h.f.destination;
 for(const dirty of ['text','notebook','tab']){
  h.h.api.workspace.textDocuments=dirty==='text'?[{isDirty:true}]:[];
  h.h.api.workspace.notebookDocuments=dirty==='notebook'?[{isDirty:true}]:[];
  h.h.api.window.tabGroups={all:[{tabs:dirty==='tab'?[{isDirty:true}]:[]}]};
  await assert.rejects(h.commands.get('mrw.moveWorkspace')(),/unsaved/);
 }
 assert.deepEqual(await scan(h.f.source),before);assert.equal(lookup(h.f.registry,h.f.workspace),undefined);assert.deepEqual(h.calls,[]);
});
test('unsent reader/Ask drafts and failed study checkpoints prevent a move and release earlier freezes',async t=>{
 const h=await moveCommand(t);h.options.clients.push({freeze:async()=>{throw Error('unsent reader or Ask draft');},cancelFreeze:async()=>h.calls.push('cancel')});
 await assert.rejects(h.commands.get('mrw.moveWorkspace')(),/unsent/);assert.ok(h.calls.includes('release'));assert.equal(lookup(h.f.registry,h.f.workspace),undefined);
 h.options.clients.pop();h.options.study.prepareMove=async()=>{throw Error('study checkpoint write failed');};
 await assert.rejects(h.commands.get('mrw.moveWorkspace')(),/checkpoint/);assert.equal(h.owner.frozen,false);assert.equal(lookup(h.f.registry,h.f.workspace),undefined);
});
test('command freezes the old session after committing and requires an explicit destination-open action',async t=>{
 const h=await moveCommand(t);await h.commands.get('mrw.moveWorkspace')();assert.ok(h.owner.frozen);assert.equal(lookup(h.f.registry,h.f.workspace).phase,'committed');
 await assert.rejects(h.owner.run(()=>{}),/move in progress/);assert.deepEqual(h.calls,['freeze','study','pause']);
});

for(const phase of ['verified','committed'])test('kernel releases the lock after SIGKILL '+phase+'; restart recovers the recorded authority',async t=>{
 const f=await fixture(t),{spawn}=require('node:child_process');
 const source=`const {WorkspaceMove}=require(${JSON.stringify(path.resolve(__dirname,'../src/workspaceMove'))});const options=JSON.parse(process.argv[1]);new WorkspaceMove(options.registry,{checkpoint:async phase=>{if(phase===${JSON.stringify(phase)}){process.stdout.write('ready\\n');await new Promise(()=>setInterval(()=>{},1000));}}}).move(options).catch(e=>{process.stderr.write(e.stack);process.exit(1);});`;
 const child=spawn(process.execPath,['-e',source,JSON.stringify({...f,bridge:undefined})],{stdio:['ignore','pipe','pipe']});
 t.after(()=>{if(child.exitCode===null)child.kill('SIGKILL');});
 await new Promise((resolve,reject)=>{let output='';child.stdout.on('data',b=>{output+=b;if(output.includes('ready'))resolve();});child.once('error',reject);child.once('exit',code=>reject(Error('Child exited '+code)));});
 child.kill('SIGKILL');await new Promise(r=>child.once('exit',r));
 const record=lookup(f.registry,f.workspace);let result;
 for(let retry=0;retry<20;retry++){try{result=await new WorkspaceMove(f.registry).recover(record.id);break;}catch(e){if(!/running/.test(e.message))throw e;await new Promise(r=>setTimeout(r,25));}}
 assert.equal(result?.phase,phase==='committed'?'committed':'aborted');assert.equal(await fs.readFile(path.join(f.source,'proof.md'),'utf8'),'# Proof\nExact mathematical text.\n');
});
