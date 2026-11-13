'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {registerActiveStudy}=require('../src/activeStudy'),{StudyHistory,hash}=require('../src/studyHistory');
const {message}=require('./study-message-fixture');
const passage={reference:'mrw-outline:v2/fixture/exact',source_revision:'a'.repeat(64),label:'Retained fixture',text:'Exact selected source.'};
const question={activity:'definition',prompt:'Fixture question',answer:{text:'Attributed answer.',author:'Reader',origin:'human'},hints:[],references:[passage.reference],author:'Reader',origin:'human'};
async function fixture(t){
 let home=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-lifecycle-'));t.after(()=>fs.rm(home,{recursive:true,force:true}));
 const state=new Map(),commands=new Map(),panels=[],information=[],confirmations=[];let current,recorder;
 const h={home,root:'/project',state,commands,panels,information,confirmations,pick:[],confirm:[],info:[],io:fs,checkpoint:null};
 const api={ViewColumn:{Active:1},TreeItem:class{constructor(label){this.label=label;}},TreeItemCollapsibleState:{Collapsed:1,None:0},
  workspace:{getConfiguration:()=>({get:(k,f)=>f})},env:{clipboard:{readText:async()=>'',writeText:async()=>{}}},window:{
   registerTreeDataProvider(){return{dispose(){}};},
   showQuickPick:async choices=>{const selected=h.pick.shift();return typeof selected==='string'?choices.find(c=>c.label===selected):selected;},
   showWarningMessage:async(text,options,...buttons)=>{confirmations.push({text,options,buttons});return h.confirm.shift();},
   showInformationMessage:async(text,...buttons)=>{information.push({text,buttons});return h.info.shift();},
   createWebviewPanel(){const p={messages:[],webview:{html:'',onDidReceiveMessage(fn){p.receive=fn;},async postMessage(m){
     p.messages.push(m);if(m.type==='checkpoint_study'){
       const s=m.study===current.active?.id?current.active:await h.saved({id:m.study});await current.receive({...message(s,{type:'lifecycle_checkpoint',token:m.token,form:s.formDraft||null,unresolvedDraft:s.unresolved,...h.checkpoint}),lifecycleEpoch:h.epoch(s)});
     }return true;
    }},onDidDispose(fn){p.closed=fn;},onDidChangeViewState(){},reveal(){},dispose(){p.disposed=true;p.closed?.();}};panels.push(p);return p;}
  }};
 const context={storageUri:{fsPath:home},extensionPath:path.resolve(__dirname,'..'),subscriptions:[],workspaceState:{get:k=>state.get(k),update:async(k,v)=>{if(h.failIndex)throw Error('index failure');state.set(k,v);}}};
 h.epoch=s=>panels.flatMap(p=>p.messages).filter(m=>m.type==='active_study'&&m.study.id===s.id).at(-1)?.study.lifecycle?.epoch;
 h.restart=async()=>{
   if(recorder)await recorder.close();
   recorder=new StudyHistory(path.join(home,'study-history-v1'),{version:'fixture',commit:'fixture'},{origin:'automated_test',io:h.io});t.after(()=>recorder.close());
   current=registerActiveStudy({vscode:api,context,register:(n,f)=>commands.set(n,f),recorder,projectRoot:async()=>h.root,show:async()=>{},bridge:async()=>{},changed:{fire(){}},getCurrent:async()=>passage,readPassage:async()=>passage,followPassage:async()=>{},io:h.io});
   h.c=current;h.history=recorder;return current;
 };
 h.start=async(extra=[])=>current.start([passage,...extra],h.root);
 h.run=(name,s)=>commands.get('mrw.'+name)(s?{study:s.id}:undefined);
 h.recent=async()=>{await h.run('inspectStudyHistory');return h.state.get('mrw.lightStudy.recent.v1')||[];};
 h.send=m=>current.receive({...message(current.active,m),lifecycleEpoch:h.epoch(current.active)});
 h.saved=s=>fs.readFile(path.join(home,'active-studies-v1',s.id+'.json'),'utf8').then(JSON.parse).then(s=>context.mrwRebase?context.mrwRebase(s):s);
 h.marker=s=>fs.readFile(path.join(home,'active-studies-v1',s.id+'.lifecycle.json'),'utf8').then(JSON.parse);
 h.trash=async s=>{h.confirm.push('Move to Trash');await h.run('deleteStudy',s);};
 h.delete=async s=>{h.confirm.push('Permanently Delete');await h.run('permanentlyDeleteStudy',s);};
 h.relocate=async r=>{home=r.newHome;h.home=home;h.root=r.destination;context.storageUri.fsPath=home;const {rebase}=require('../src/workspaceMove');context.mrwRebase=v=>rebase(require('../src/workspacePaths').decode(v,r.destination),r.mappings);context.mrwStore=v=>require('../src/workspacePaths').encode(v,r.destination,'/external/notes');context.mrwIdentityRoot=v=>rebase(v,r.mappings.toReversed().map(([a,b])=>[b,a]));await h.restart();};
 await h.restart();return h;
}
const extra=n=>({...passage,reference:'extra-'+n,text:'Separate passage '+n});
const exists=file=>fs.stat(file).then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;});

test('Archive checkpoints live prose, suspends selection and preserves scheduling through restart/Restore',async t=>{
 const h=await fixture(t),s=await h.start();await h.send({type:'question_save',question});await h.send({type:'admit',revision:s.questions[0].revision});
 await h.send({type:'next'});await h.send({type:'submit',text:'Exact answer',paper:false});await h.send({type:'outcome',report:{outcome:'unaided_success',assessor:'reader',consulted:false}});
 const q=structuredClone(s.questions[0]);h.checkpoint={unresolvedDraft:'Latest unsent question'};
 const stale={...message(s,{type:'pause'}),lifecycleEpoch:h.epoch(s)};
 await h.run('archiveStudy',s);assert.equal((await h.saved(s)).unresolved,'Latest unsent question');assert.deepEqual(s.questions[0],q);
 assert.deepEqual(await h.recent(),[]);assert.equal((await h.marker(s)).state,'archived');
 await assert.rejects(h.c.receive(stale),/stale|changed/);
 await h.restart();assert.deepEqual(await h.recent(),[]);await assert.rejects(h.run('resumeStudy',s),/archived/);
 await h.run('restoreStudy',s);await h.run('resumeStudy',s);assert.equal(h.c.active.id,s.id);assert.equal(JSON.stringify(h.c.active.questions[0]),JSON.stringify(q));
 assert.equal(h.c.active.unresolved,'Latest unsent question');assert.equal((await h.recent()).length,1);
 const events=await h.history.events();assert.equal(events.filter(e=>e.action==='review.mapping').length,1,'restoration does not reschedule');
});

test('Trash cancellation, Undo, restart and Restore keep the prior active or archived state',async t=>{
 const h=await fixture(t),s=await h.start();h.checkpoint={unresolvedDraft:'Keep this'};
 await h.run('deleteStudy',s);assert.equal((await h.saved(s)).unresolved,'Keep this');assert.equal((await h.recent()).length,1);
 h.info.push('Undo');await h.trash(s);await h.c.flush();assert.equal((await h.marker(s)).state,'active');
 await h.run('archiveStudy',s);await h.trash(s);assert.equal((await h.marker(s)).previous,'archived');
 await h.restart();assert.deepEqual(await h.recent(),[]);await h.run('restoreStudy',s);assert.equal((await h.marker(s)).state,'archived');
 await h.run('restoreStudy',s);assert.equal((await h.marker(s)).state,'active');
});

test('failed draft/owner publication prevents lifecycle transitions without discarding the pending prose',async t=>{
 const h=await fixture(t);let fail=false;h.io={...fs,writeFile:async(f,...args)=>{if(fail&&String(f).includes('active-studies-v1'))throw Error('disk full');return fs.writeFile(f,...args);}};await h.restart();
 const s=await h.start();h.checkpoint={unresolvedDraft:'Unsent draft survives'};fail=true;
 await assert.rejects(h.run('archiveStudy',s),/disk full/);assert.equal(s.unresolved,'Unsent draft survives');assert.equal((await h.recent()).length,1);
 assert.equal(await exists(path.join(h.home,'active-studies-v1',s.id+'.lifecycle.json')),false);
 fail=false;await h.run('archiveStudy',s);assert.equal((await h.saved(s)).unresolved,'Unsent draft survives');
});

test('inventory recovery ignores a lost/old recent index, including more than 30 saved studies',async t=>{
 const h=await fixture(t),first=await h.start();await h.run('archiveStudy',first);
 // Records beyond the UI recent limit remain discoverable without reopening sources.
 for(let n=0;n<32;n++){const s=require('../src/studyModel').createStudy([extra(n)],'/project');await fs.writeFile(path.join(h.home,'active-studies-v1',s.id+'.json'),JSON.stringify(s));}
 h.state.clear();await h.restart();assert.equal((await h.recent()).length,30);
 await h.run('restoreStudy',first);await h.run('resumeStudy',first);assert.equal(h.c.active.id,first.id);
});

test('permanent deletion removes only selected history/payloads and preserves shared questions, sources and files',async t=>{
 const h=await fixture(t),a=await h.start();await h.send({type:'question_save',question});await h.send({type:'admit',revision:a.questions[0].revision});
 const q=structuredClone(a.questions[0]);h.history.setContext({study:a.id});const own=h.history.snapshot({text:'PRIVATE A PAYLOAD'}),shared=h.history.snapshot({text:'SHARED PAYLOAD'});
 h.history.record('fixture.a',{snapshot:own,original_snapshot:shared});await h.history.flush();
 const b=await h.start([extra(1)]);h.history.setContext({study:b.id});h.history.record('fixture.b',{snapshot:shared});await h.history.flush();
 const untouched=path.join(h.home,'ordinary.lean'),source=path.join(h.home,'saved-source.json');await fs.writeFile(untouched,'ordinary notes');await fs.writeFile(source,'separate annotation');
 await h.trash(a);await h.run('permanentlyDeleteStudy',a);assert.equal((await h.marker(a)).state,'trashed','cancel changes nothing');
 await h.delete(a);assert.equal((await h.marker(a)).state,'deleted');assert.equal(await exists(path.join(h.home,'active-studies-v1',a.id+'.json')),false);
 const snapshot=id=>path.join(h.history.directory,'snapshots',id+'.json');assert.equal(await exists(snapshot(own)),false);assert.equal(await exists(snapshot(shared)),true);
 assert.deepEqual((await h.saved(b)).questions[0],q);assert.equal(await fs.readFile(untouched,'utf8'),'ordinary notes');assert.equal(await fs.readFile(source,'utf8'),'separate annotation');
 const events=await h.history.events();assert.ok(events.some(e=>e.action==='fixture.b'));assert.ok(!events.some(e=>e.identity.study===a.id));
 const bytes=(await Promise.all((await fs.readdir(h.history.directory)).filter(n=>n.endsWith('.json')).map(n=>fs.readFile(path.join(h.history.directory,n),'utf8')))).join('');assert.ok(!bytes.includes('fixture.a'));
 assert.deepEqual(Object.keys(await h.marker(a)).sort(),['epoch','id','sourceKey','state','version']);
 assert.match(h.confirmations.at(-1).options.detail,/2 unshared snapshots/);assert.match(h.confirmations.at(-1).options.detail,/Exports, backups/);
});

test('revisiting retained/deleted material is explicit; fresh work gets a distinct stable identity',async t=>{
 const h=await fixture(t),a=await h.start();await h.run('archiveStudy',a);
 assert.equal(await h.start(),undefined);assert.equal((await h.marker(a)).state,'archived');
 h.pick.push('Restore saved study');assert.equal((await h.start()).id,a.id);
 await h.trash(a);await h.delete(a);
 assert.equal(await h.start(),undefined,'no implicit replacement after deletion');
 h.pick.push('Start new study');const b=await h.start();assert.notEqual(b.id,a.id);assert.equal(b.sourceKey,a.id);
 assert.equal((await h.start()).id,b.id);await h.restart();assert.equal((await h.start()).id,b.id);
 await assert.rejects(h.run('resumeStudy',a),/unavailable|deleted/);
});

test('interrupted deletion resumes idempotently after restart and cannot be resurrected by stale saves or messages',async t=>{
 const h=await fixture(t);let fail=false;h.io={...fs,unlink:async(file)=>{if(fail&&String(file).includes('/snapshots/'))throw Error('interrupted unlink');return fs.unlink(file);}};await h.restart();
 const a=await h.start();h.history.setContext({study:a.id});const blob=h.history.snapshot({text:'private'});h.history.record('attempt.submit',{snapshot:blob});await h.history.flush();
 const stale=h.c,oldHistory=h.history;await h.trash(a);fail=true;await assert.rejects(h.delete(a),/incomplete/);assert.equal((await h.marker(a)).state,'deleting');
 assert.ok(!h.information.some(x=>x.text==='Study permanently deleted.'));assert.deepEqual(await h.recent(),[]);
 fail=false;await h.restart();assert.deepEqual(await h.recent(),[]);assert.equal((await h.marker(a)).state,'deleted');
 await assert.rejects(stale.receive({...message(a,{type:'draft',text:'stale'}),lifecycleEpoch:'old'}),/deleted|unavailable/);
 oldHistory.setContext({study:a.id});oldHistory.snapshot({text:'private'});oldHistory.record('late',{snapshot:blob});await oldHistory.flush();
 assert.equal(await exists(path.join(oldHistory.directory,'snapshots',blob+'.json')),false);
 await h.restart();assert.deepEqual(await h.recent(),[]);assert.ok(!(await h.history.events()).some(e=>e.identity.study===a.id));
});

test('failure after lifecycle rename keeps the published state authoritative and reports failure',async t=>{
 const h=await fixture(t);let fail=false;
 h.io={...fs,open:async(file,...args)=>{const handle=await fs.open(file,...args);if(fail&&String(file).endsWith('active-studies-v1'))return new Proxy(handle,{get(obj,key){if(key==='sync')return async()=>{throw Error('directory sync interrupted');};const v=obj[key];return typeof v==='function'?v.bind(obj):v;}});return handle;}};
 await h.restart();const a=await h.start(); // No pending draft save: fail specifically after the lifecycle rename.
 h.io.rename=async(from,to)=>{await fs.rename(from,to);if(String(to).endsWith('.lifecycle.json'))fail=true;};
 await assert.rejects(h.run('archiveStudy',a),/sync interrupted/);assert.equal((await h.marker(a)).state,'archived');
 fail=false;h.io.rename=fs.rename;await h.restart();assert.deepEqual(await h.recent(),[]);await h.run('restoreStudy',a);assert.equal((await h.marker(a)).state,'active');
});

test('archiving a shared question owner suspends its reviews in other studies without changing its card',async t=>{
 const h=await fixture(t),a=await h.start();await h.send({type:'question_save',question});await h.send({type:'admit',revision:a.questions[0].revision});
 const b=await h.start([extra(2)]),q=structuredClone(a.questions[0]);await h.run('archiveStudy',a);
 await h.send({type:'next'});assert.equal(b.current,null);assert.deepEqual(a.questions[0],q);
 await h.run('restoreStudy',a);await h.send({type:'next'});assert.equal(b.current.question.id,q.id);
});

test('preserved document-linked owners survive deletion; their Return pin and unrelated records are unchanged',async t=>{
 const h=await fixture(t),a=await h.start();await h.send({type:'question_save',question});
 const b=await h.start([extra(3)]);b.document={uri:'file:///notes/ordinary.md'};b.documentContext={origin:{uri:b.document.uri,revision:'exact',start:12,end:30},passage};
 b.problemLinks=[{owner:a.id,question:a.questions[0].id,revision:a.questions[0].revision}];b.unresolved='Independent work';await h.c.flush();
 const before=await h.saved(b);await h.trash(a);await h.delete(a);const after=await h.saved(b);
 assert.deepEqual(after.documentContext,before.documentContext);assert.equal(after.unresolved,before.unresolved);assert.deepEqual(after.questions,a.questions);assert.deepEqual(after.problemLinks,[]);
 await h.restart();await h.run('resumeStudy',b);assert.equal(h.c.active.missingProblems.length,0);
});

test('pending owner writes are settled before Archive; a rejected owner save leaves both studies available',async t=>{
 const h=await fixture(t);let failID;
 h.io={...fs,writeFile:async(f,...args)=>{if(failID&&String(f).endsWith(failID+'.json.pending'))throw Error('owner save rejected');return fs.writeFile(f,...args);}};await h.restart();
 const owner=await h.start();await h.send({type:'question_save',question});await h.send({type:'admit',revision:owner.questions[0].revision});
 const b=await h.start([extra(4)]);await h.send({type:'next'});await h.send({type:'submit',text:'Attempt',paper:false});failID=owner.id;
 await assert.rejects(h.send({type:'outcome',report:{outcome:'unaided_success',assessor:'reader',consulted:false}}),/owner save/);
 await assert.rejects(h.run('archiveStudy',b),/owner save/);assert.equal((await h.recent()).length,2);assert.ok(b.pendingOwners.length);
 failID=null;await h.run('archiveStudy',b);assert.deepEqual(b.pendingOwners,[]);assert.equal((await h.saved(owner)).questions[0].reviews.length,1);
});

test('a shared snapshot reachable through another payload survives while deleted event batches and pending files are cleaned',async t=>{
 const h=await fixture(t),a=await h.start();h.history.setContext({study:a.id});const child=h.history.snapshot({text:'shared via parent'}),own=h.history.snapshot({text:'remove only this'});
 h.history.record('a',{snapshot:child,original_snapshot:own});await h.history.flush();
 const batch=(await fs.readdir(h.history.directory)).filter(n=>/^[a-f0-9-]+-\d+-\d+\.json$/.test(n)).at(-1);
 await fs.copyFile(path.join(h.history.directory,batch),path.join(h.history.directory,batch+'.pending'));
 const b=await h.start([extra(5)]);h.history.setContext({study:b.id});const parent=h.history.snapshot({earlier:child});h.history.record('b',{snapshot:parent});await h.history.flush();
 await h.trash(a);await h.delete(a);assert.equal(await exists(path.join(h.history.directory,'snapshots',child+'.json')),true);
 assert.equal(await exists(path.join(h.history.directory,'snapshots',own+'.json')),false);
 for(const n of (await fs.readdir(h.history.directory)).filter(n=>n.endsWith('.pending')||/^[a-f0-9-]+-\d+-\d+\.json$/.test(n))){const rows=JSON.parse(await fs.readFile(path.join(h.history.directory,n),'utf8'));assert.ok(!rows.some(e=>e.identity.study===a.id));}
});

test('interrupted final study removal is retried without recreating the already removed history',async t=>{
 const h=await fixture(t);let failID;h.io={...fs,unlink:async f=>{if(failID&&String(f).endsWith('/'+failID+'.json'))throw Error('study removal interrupted');return fs.unlink(f);}};await h.restart();
 const a=await h.start();await h.trash(a);failID=a.id;await assert.rejects(h.delete(a),/incomplete/);assert.equal((await h.marker(a)).state,'deleting');
 failID=null;await h.run('showDeletedStudies');assert.equal((await h.marker(a)).state,'deleted');
 assert.equal(await exists(path.join(h.home,'active-studies-v1',a.id+'.json')),false);assert.ok(!(await h.history.events()).some(e=>e.identity.study===a.id));
});


test('history can start before any study directory exists without reporting a save failure',async t=>{
 const h=await fixture(t);assert.equal(await exists(path.join(h.home,'active-studies-v1')),false);
 await h.history.init();await h.history.flush();assert.equal(h.history.gap,'');
 assert.ok((await h.history.events()).some(e=>e.action==='session.start'));
 const s=await h.start();await h.trash(s);await h.delete(s);
 assert.equal((await h.marker(s)).state,'deleted');assert.equal(h.history.gap,'');
});


test('partial mixed-session replacement recovers from its complete batch after restart',async t=>{
 const h=await fixture(t);let fail=false;
 h.io={...fs,writeFile:async(file,text,...args)=>{
  if(fail&&String(file).includes('/study-history-v1/')&&String(file).endsWith('.json.pending')&&String(text).includes('mixed-b')){
   await fs.writeFile(file,String(text).slice(0,11),...args);throw Error('partial history replacement');
  }return fs.writeFile(file,text,...args);
 }};await h.restart();
 const a=await h.start(),b=await h.start([extra(6)]);
 h.history.record('mixed-a',{text:'Selected work'},'observed_action',{study:a.id});
 h.history.record('mixed-b',{text:'Preserve exact other work'},'observed_action',{study:b.id});await h.history.flush();
 await h.trash(a);fail=true;await assert.rejects(h.delete(a),/partial history replacement/);
 assert.equal((await h.marker(a)).state,'deleting');
 assert.ok((await fs.readdir(h.history.directory)).some(n=>n.endsWith('.pending')));
 fail=false;await h.restart();await h.recent();assert.equal((await h.marker(a)).state,'deleted');
 const events=await h.history.events();assert.ok(!events.some(e=>e.action==='mixed-a'));
 assert.equal(events.find(e=>e.action==='mixed-b').data.text,'Preserve exact other work');
 assert.ok(!(await fs.readdir(h.history.directory)).some(n=>n.endsWith('.pending')));
});


test('workspace relocation preserves unfinished drafts, archived schedules, Trash and deleted-study identities through restart',async t=>{
 const {WorkspaceMove,scan}=require('../src/workspaceMove');const h=await fixture(t);
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-study-move-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const source=path.join(root,'workspace');await fs.mkdir(source);h.root=source;
 const workspace=path.join(source,'MRW.code-workspace');await fs.writeFile(workspace,JSON.stringify({folders:[{path:'.'}]}));
 const archived=await h.start([extra('archived')]);await h.send({type:'question_save',question});await h.send({type:'admit',revision:archived.questions[0].revision});
 const schedule=structuredClone(archived.questions[0]);await h.run('archiveStudy',archived);
 const trashed=await h.start([extra('trashed')]);await h.trash(trashed);
 const deleted=await h.start([extra('deleted')]);await h.trash(deleted);await h.delete(deleted);
 const active=await h.start();h.checkpoint={unresolvedDraft:'Unfinished mathematical question: α → β'};
 await h.c.prepareMove();await h.history.pauseForMove();
 const oldPrivate=await scan(h.home);
 const moved=await new WorkspaceMove(path.join(root,'registry')).move({workspace,destination:path.join(root,'moved'),privateHome:h.home,historySession:h.history.session,state:Object.fromEntries(h.state),tabs:[],bridge:async()=>{throw Error('unexpected bridge');}});
 const candidate=await scan(moved.newHome),live='study-history-v1/live-'+h.history.session+'.json';delete candidate[live];delete oldPrivate[live];assert.deepEqual(candidate,oldPrivate,'study, lifecycle and immutable history bytes copied exactly');
 await h.relocate(moved);await h.run('resumeStudy',active);
 assert.equal(h.c.active.id,active.id);assert.equal(h.c.active.root,moved.destination);assert.ok((await h.history.events()).some(e=>e.action==='session.relocated'));assert.ok(!(await h.history.events()).some(e=>e.action==='session.unclean'));
 assert.equal(h.c.active.unresolved,'Unfinished mathematical question: α → β');await h.c.flush();assert.equal(JSON.parse(await fs.readFile(path.join(h.home,'active-studies-v1',active.id+'.json'))).root.$mrwPath,'workspace');
 assert.deepEqual((await h.recent()).map(x=>x.id),[active.id]);
 assert.equal(await h.start([extra('deleted')]),undefined,'deleted source stays suppressed after root changes');
 assert.equal((await h.marker(deleted)).state,'deleted');
 await h.run('restoreStudy',archived);await h.run('resumeStudy',archived);assert.deepEqual(h.c.active.questions[0],schedule);
 assert.equal((await h.marker(trashed)).state,'trashed');
 await h.restart();await assert.rejects(h.run('resumeStudy',deleted),/unavailable|deleted/);
});
