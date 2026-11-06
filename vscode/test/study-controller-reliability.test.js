'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {StudyHistory,summarize}=require('../src/studyHistory'),model=require('../src/studyModel'),scheduler=require('../src/studyScheduler');
const {registerActiveStudy}=require('../src/activeStudy'),{runBridge}=require('../src/bridge');
const passage={reference:'mrw-outline:v1/exact-selected-reference',label:'Selected proof passage',text:'For every x, f(x) = x.',source_revision:'a'.repeat(64),authors:'Source author'};
const value={activity:'missing_step',prompt:'Explain the missing step.',answer:{text:'Apply the hypothesis.',author:'Codex companion',origin:'ai_proposal'},hints:['Check the hypothesis.'],references:[passage.reference],author:'Codex companion',origin:'ai_proposal'};
async function host(t){
 const home=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-active-'));t.after(()=>fs.rm(home,{recursive:true,force:true}));const state=new Map(),commands=new Map(),panels=[],shown=[];
 const recorder=new StudyHistory(path.join(home,'history'),{version:'0.18.0',commit:'test'},{origin:'test'});t.after(()=>recorder.close());
 const api={ViewColumn:{Active:1},TreeItem:class{constructor(label){this.label=label;}},TreeItemCollapsibleState:{Collapsed:1,None:0},
  env:{clipboard:{value:'',async readText(){return this.value;},async writeText(t){this.value=t;}}},
  workspace:{getConfiguration:()=>({get:(k,f)=>f})},commands:{executeCommand:async()=>{}},window:{registerTreeDataProvider(){return{dispose(){}};},
   createWebviewPanel(){const p={title:'',webview:{onDidReceiveMessage(f){p.receive=f;},async postMessage(m){p.messages.push(m);}},messages:[],onDidDispose(f){p.close=f;},onDidChangeViewState(){},reveal(){}};panels.push(p);return p;},showQuickPick:async a=>a[0]}};
 const context={storageUri:{fsPath:home},extensionPath:path.resolve(__dirname,'..'),subscriptions:[],workspaceState:{get:k=>state.get(k),update:async(k,v)=>state.set(k,v)}};
 const options={vscode:api,context,register:(n,f)=>commands.set(n,f),recorder,projectRoot:async()=>'/project',show:async text=>shown.push(text),bridge:r=>runBridge(context.extensionPath,'python3',r),changed:{fire(){}},getCurrent:async()=>passage,readPassage:async()=>passage,followPassage:async()=>{}};
 const c=registerActiveStudy(options);return{home,c,commands,panels,recorder,api,state,shown,options};
}
function scoped(c,message){const s=c.active;if(message.type==='effort_response'&&!Object.hasOwn(message,'offer'))message={offer:s.current?.effortOffer?.id,...message};return {study:s.id,attempt:s.current?.id||null,formEpoch:s.formEpoch,
 formDraftId:s.formDraft?.draftId||null,helpDraftId:s.helpDraft?.id||null,...message};}
const send=(c,m)=>c.receive(scoped(c,m));
const saved=(h,s)=>fs.readFile(path.join(h.home,'active-studies-v1',s.id+'.json'),'utf8').then(JSON.parse);
test('R1 editing retained A cannot replace pending corrected B, including an empty draft',async t=>{
 const h=await host(t);await h.commands.get('mrw.studyCurrent')();const s=h.c.active;
 h.api.env.clipboard.value='A';await send(h.c,{type:'help_paste'});await send(h.c,{type:'help_save',response:{text:'A',author:'Companion',origin:'ai_proposal'}});
 h.api.env.clipboard.value='B';await send(h.c,{type:'help_paste'});const id=s.helpDraft.id;
 await send(h.c,{type:'help_draft',response:{...s.helpDraft,text:'Unsaved correction B'}});
 await assert.rejects(send(h.c,{type:'help_edit',response:s.help[0].id}),/retain|discard/i);await h.c.flush();
 assert.equal((await saved(h,s)).helpDraft.text,'Unsaved correction B');assert.equal(s.helpDraft.id,id);
 await send(h.c,{type:'help_draft',response:{...s.helpDraft,text:''}});
 await assert.rejects(send(h.c,{type:'help_edit',response:s.help[0].id}),/retain|discard/i);assert.equal(s.helpDraft.id,id);
});
test('R2 delayed A and B drafts both flush; unknown and stale identities do not mutate live work',async t=>{
 const h=await host(t);await h.commands.get('mrw.studyCurrent')();const a=h.c.active;
 const formA={draftId:'form-A',prompt:'Original A'};await send(h.c,{type:'form_draft',form:formA,formDraftId:formA.draftId});await h.c.flush();
 await assert.rejects(h.c.receive({...scoped(h.c,{type:'form_cancel',form:null}),formDraftId:null}),/identity changed/);assert.equal(a.formDraft.prompt,'Original A');
 const aMessage=scoped(h.c,{type:'form_draft',form:{...formA,prompt:'Delayed A'},formDraftId:formA.draftId});
 const b=await h.c.start([{...passage,reference:'B',text:'Second exact passage'}],'/project');
 await h.c.receive(aMessage);const formB={draftId:'form-B',prompt:'New B'};await send(h.c,{type:'form_draft',form:formB,formDraftId:formB.draftId});await h.c.flush();
 assert.equal((await saved(h,a)).formDraft.prompt,'Delayed A');assert.equal((await saved(h,b)).formDraft.prompt,'New B');
 await assert.rejects(h.c.receive({...scoped(h.c,{type:'form_draft',form:formB}),study:'unavailable'}),/study|unavailable/i);
 await assert.rejects(h.c.receive({...scoped(h.c,{type:'form_draft',form:{...formB,prompt:'Stale'}}),formEpoch:'stale'}),/stale|changed|draft/i);
 assert.equal(b.formDraft.prompt,'New B');
});
test('R2 stale reply/attempt messages reject before controls mutate, and failed question saves retain their draft',async t=>{
 const h=await host(t);let fail=false;
 const c=registerActiveStudy({...h.options,io:{...fs,writeFile:async(file,...args)=>{if(fail&&String(file).includes('active-studies-v1'))throw new Error('checkpoint failed');return fs.writeFile(file,...args);}}});
 await h.commands.get('mrw.studyCurrent')();const s=c.active,form={...value,draftId:'question-draft'};
 await send(c,{type:'form_draft',form,formDraftId:form.draftId});const epoch=s.formEpoch;fail=true;
 await assert.rejects(send(c,{type:'question_save',question:value,form,formDraftId:form.draftId}),/checkpoint failed/);
 assert.equal(s.formDraft.prompt,value.prompt);assert.equal(s.formDraft.draftId,form.draftId);assert.equal(s.formEpoch,epoch);
 fail=false;await send(c,{type:'question_save',question:value,form,formDraftId:form.draftId});assert.equal(s.formDraft,null);
 await send(c,{type:'next'});const attempt=s.current.id;
 h.api.env.clipboard.value='Pending reply';await send(c,{type:'help_paste'});const draft={...s.helpDraft};
 await assert.rejects(c.receive({...scoped(c,{type:'help_draft',response:{...draft,text:'stale overwrite'}}),helpDraftId:'stale'}),/draft.*changed|stale/i);
 assert.equal(s.helpDraft.text,'Pending reply');
 await assert.rejects(c.receive({...scoped(c,{type:'pause',helpDraft:{...draft,text:'Wrong attempt overwrite'}}),attempt:'stale'}),/attempt/i);
 assert.equal(s.helpDraft.text,'Pending reply');assert.equal(s.current.id,attempt);
 await send(c,{type:'skip'});await assert.rejects(send(c,{type:'continue_attempt'}),/draft/i);assert.equal(s.helpDraft.text,'Pending reply');
});
test('R5 owner checkpoint failure is retried on shutdown and reconciled exactly once after restart',async t=>{
 const h=await host(t);let failOwner=null;
 const c=registerActiveStudy({...h.options,io:{...fs,writeFile:async(file,...args)=>{if(failOwner&&String(file).includes(failOwner))throw new Error('owner checkpoint failed');return fs.writeFile(file,...args);}}});
 await h.commands.get('mrw.studyCurrent')();const owner=c.active;await send(c,{type:'question_save',question:value});const q=owner.questions[0];await send(c,{type:'admit',revision:q.revision});
 const active=await c.start([{...passage,reference:'other',text:'Other source'},passage],'/project');await send(c,{type:'choose_question',revision:q.revision});await send(c,{type:'submit',text:'Exact attempt',paper:false});
 failOwner=owner.id;await assert.rejects(send(c,{type:'outcome',report:{outcome:'unaided_success',assessor:'reader',consulted:false}}),/owner checkpoint failed/);
 assert.equal((await saved(h,owner)).questions[0].reviews.length,0);assert.ok((await saved(h,active)).current.finished);
 // A fresh controller sees the retained authoritative outcome/recovery intent.
 const recovered=registerActiveStudy(h.options);await h.commands.get('mrw.resumeStudy')({study:owner.id});
 assert.equal(recovered.active.questions[0].reviews.length,1);assert.ok(recovered.active.questions[0].card);
 await recovered.flush();const again=registerActiveStudy(h.options);await h.commands.get('mrw.resumeStudy')({study:owner.id});assert.equal(again.active.questions[0].reviews.length,1);
 // The superseded pre-restart controller cannot overwrite a newer checkpoint.
 failOwner=null;await assert.rejects(c.flush(),/owner changed/);assert.equal((await saved(h,owner)).questions[0].reviews.length,1);
});
test('R7 correction withdraws a now unsupported offer and rejects a stale choice before copying help',async t=>{
 const h=await host(t);await h.commands.get('mrw.studyCurrent')();const s=h.c.active;
 await send(h.c,{type:'question_save',question:value});const q=s.questions[0];
 for(let i=0;i<2;i++){await send(h.c,{type:'choose_question',revision:q.revision});await send(h.c,{type:'submit',text:'Work '+i,paper:false});await send(h.c,{type:'outcome',report:{outcome:'unaided_success',assessor:'reader',consulted:false}});}
 await send(h.c,{type:'effort_offer'});await send(h.c,{type:'effort_response',rating:4});const offer=s.current.adaptation;assert.ok(offer.choices.includes('less_guidance'));
 await send(h.c,{type:'outcome',report:{outcome:'unresolved',assessor:'reader',consulted:false,correction:true}});assert.equal(s.current.adaptation,null);
 const before=h.api.env.clipboard.value;await assert.rejects(send(h.c,{type:'adaptation',choice:'less_guidance',offer:offer.event}),/offer|obsolete|changed/i);assert.equal(h.api.env.clipboard.value,before);
 assert.ok((await h.recorder.events()).some(e=>e.action==='adaptation.withdrawal'&&e.data.offer===offer.event));
});
test('R5 retry flushes dirty owners before another outcome and preserves mismatched recovery targets',async t=>{
 const h=await host(t);let failOwner=null;
 const c=registerActiveStudy({...h.options,io:{...fs,writeFile:async(file,...args)=>{if(failOwner&&String(file).includes(failOwner))throw new Error('owner unavailable');return fs.writeFile(file,...args);}}});
 await h.commands.get('mrw.studyCurrent')();const owner=c.active;await send(c,{type:'question_save',question:value});const q=owner.questions[0];await send(c,{type:'admit',revision:q.revision});
 const study=await c.start([passage,{...passage,reference:'B',text:'B'}],'/project');await send(c,{type:'choose_question',revision:q.revision});await send(c,{type:'submit',text:'Work',paper:false});
 failOwner=owner.id;await assert.rejects(send(c,{type:'outcome',report:{outcome:'unresolved',assessor:'reader',consulted:false}}),/owner unavailable/);
 failOwner=null;await c.flush();assert.equal((await saved(h,owner)).questions[0].reviews.length,1);assert.deepEqual((await saved(h,study)).pendingOwners,[]);
 failOwner=owner.id;await assert.rejects(send(c,{type:'outcome',report:{outcome:'unaided_success',assessor:'reader',consulted:false,correction:true}}),/owner unavailable/);
 const file=path.join(h.home,'active-studies-v1',owner.id+'.json'),newer=await saved(h,owner);newer.questions[0].prompt='Independent changed content';await fs.writeFile(file,JSON.stringify(newer));const bytes=await fs.readFile(file,'utf8');
 failOwner=null;await assert.rejects(c.flush(),/owner changed/);assert.equal(await fs.readFile(file,'utf8'),bytes);
});
test('R9 reversed replies and an unrelated explanation retain selected associations through reopen and export evidence',async t=>{
 const h=await host(t);await h.commands.get('mrw.studyCurrent')();const s=h.c.active;await send(h.c,{type:'question_save',question:value});await send(h.c,{type:'next'});
 await send(h.c,{type:'handoff',purpose:'First request'});const r1=s.helpRequests.at(-1);
 s.current.adaptation={event:'fixture-offer',choices:['clarification'],evidence:[]};await send(h.c,{type:'adaptation',choice:'clarification',offer:'fixture-offer'});const r2=s.helpRequests.at(-1);assert.ok(r2.adaptation);
 for(const [text,request]of [['Reply to first',r1.id],['Reply to second',r2.id],['Unrelated explanation',null]]){
  h.api.env.clipboard.value=text;await send(h.c,{type:'help_paste'});assert.equal(s.helpDraft.request,null);
  await send(h.c,{type:'help_save',response:{text,author:'Companion',origin:'ai_proposal',request}});
 }
 assert.equal(s.help[0].request,r1.id);assert.equal(s.help[0].adaptation,null);assert.equal(s.help[1].request,r2.id);assert.equal(s.help[1].adaptation,r2.adaptation);assert.equal(s.help[2].request,null);
 await send(h.c,{type:'pause'});const resumed=registerActiveStudy(h.options);await h.commands.get('mrw.resumeStudy')({study:s.id});assert.deepEqual(resumed.active.help.map(h=>h.request),[r1.id,r2.id,null]);
 const all=await h.recorder.events(),selected=require('../src/studyHistory').selectHistoryContext(all,[h.recorder.session]).events;
 const events=selected.filter(e=>e.action==='help.retained');assert.deepEqual(events.map(e=>e.data.request),[r1.id,r2.id,null]);
 const snapshot=JSON.parse(await fs.readFile(path.join(h.recorder.directory,'snapshots',events[0].data.snapshot+'.json'),'utf8'));assert.equal(snapshot.request,r1.id);assert.equal(snapshot.original.text,'Reply to first');
});
