'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {StudyHistory,summarize}=require('../src/studyHistory'),model=require('../src/studyModel'),scheduler=require('../src/studyScheduler');
const {registerActiveStudy:registerStudy}=require('../src/activeStudy'),{runBridge}=require('../src/bridge');
const {scopedController}=require('./study-message-fixture');
const registerActiveStudy=options=>scopedController(registerStudy(options));
const passage={reference:'mrw-outline:v1/exact-selected-reference',label:'Selected proof passage',text:'For every x, f(x) = x.',source_revision:'a'.repeat(64),authors:'Source author'};
const value={activity:'missing_step',prompt:'Explain the missing step.',answer:{text:'Apply the hypothesis.',author:'Codex companion',origin:'ai_proposal'},hints:['Check the hypothesis.'],references:[passage.reference],author:'Codex companion',origin:'ai_proposal'};
async function host(t){
 const home=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-active-'));const state=new Map(),commands=new Map(),panels=[],shown=[];
 const recorder=new StudyHistory(path.join(home,'history'),{version:'0.18.0',commit:'test'},{origin:'test'});t.after(async()=>{await recorder.close();await fs.rm(home,{recursive:true,force:true});});
 const api={ViewColumn:{Active:1},TreeItem:class{constructor(label){this.label=label;}},TreeItemCollapsibleState:{Collapsed:1,None:0},
  env:{clipboard:{value:'',async readText(){return this.value;},async writeText(t){this.value=t;}}},
  workspace:{getConfiguration:()=>({get:(k,f)=>f})},commands:{executeCommand:async()=>{}},window:{registerTreeDataProvider(){return{dispose(){}};},
   createWebviewPanel(){const p={title:'',webview:{onDidReceiveMessage(f){p.receive=f;},async postMessage(m){p.messages.push(m);}},messages:[],onDidDispose(f){p.close=f;},onDidChangeViewState(){},reveal(){}};panels.push(p);return p;},showQuickPick:async a=>a[0]}};
 const context={storageUri:{fsPath:home},extensionPath:path.resolve(__dirname,'..'),subscriptions:[],workspaceState:{get:k=>state.get(k),update:async(k,v)=>state.set(k,v)}};
 const options={vscode:api,context,register:(n,f)=>commands.set(n,f),recorder,projectRoot:async()=>'/project',show:async text=>shown.push(text),bridge:r=>runBridge(context.extensionPath,'python3',r),changed:{fire(){}},getCurrent:async()=>passage,readPassage:async()=>passage,followPassage:async()=>{}};
 const c=registerActiveStudy(options);return{home,c,commands,panels,recorder,api,state,shown,options};
}
test('retained prose, linked requests, immutable submissions and assisted continuation resume together',async t=>{
 const h=await host(t);await h.commands.get('mrw.studyCurrent')();const s=h.c.active;
 await h.c.receive({type:'question_save',question:value});await h.c.receive({type:'admit',revision:s.questions[0].revision});await h.c.receive({type:'next'});
 const first=s.current.id;await h.c.receive({type:'submit',text:'First submitted λ',paper:false});
 await h.c.receive({type:'draft',attempt:first,text:'Unsent different work',paper:false});await h.c.receive({type:'handoff',purpose:'clarification'});
 assert.match(h.api.env.clipboard.value,/First submitted λ/);assert.match(h.api.env.clipboard.value,/Unsent different work/);
 assert.doesNotMatch(h.api.env.clipboard.value,/Submitted work: Unsent/);const request=s.helpRequests[0];assert.equal(request.attempt,first);
 await h.recorder.flush();const outgoing=JSON.parse(await fs.readFile(path.join(h.recorder.directory,'snapshots',request.snapshot+'.json'),'utf8')).text;assert.equal(outgoing,h.api.env.clipboard.value);
 h.api.env.clipboard.value='Use $f(x)=x$.\n\nAn explanation with λ and equations.';await h.c.receive({type:'help_paste'});
 const pasted=s.helpDraft.text;await h.c.receive({type:'help_save',response:{text:pasted+' Reader correction.',author:'Reader',origin:'human'}});
 assert.equal(s.help[0].original.text,pasted);assert.equal(s.help[0].author,'Reader');assert.equal(s.help[0].request,request.id);
 // The first immutable submission predates help and can still be reported unaided.
 await h.c.receive({type:'outcome',report:{outcome:'unaided_success',assessor:'reader',consulted:false}});
 const old=s.current;await h.c.receive({type:'continue_attempt',response:s.help[0].id});
 assert.notEqual(s.current.id,first);assert.equal(s.current.continues,first);assert.equal(s.attempts[0].outcome.event,old.outcome.event);
 await h.c.receive({type:'submit',text:'Revised after retained help',paper:false});
 await assert.rejects(h.c.receive({type:'outcome',report:{outcome:'unaided_success',assessor:'reader',consulted:false}}),/help|expos/i);
 await h.c.receive({type:'outcome',report:{outcome:'help_dependent',assessor:'reader',consulted:false}});
 await h.c.receive({type:'pause'});const id=s.id;
 const next=registerActiveStudy(h.options);await h.commands.get('mrw.resumeStudy')({study:id});assert.equal(next.active.help[0].original.text,pasted);assert.equal(next.active.current.continues,first);
 const rows=await h.recorder.events();assert.ok(rows.some(e=>e.action==='help.request'));assert.ok(rows.some(e=>e.action==='help.retained'));assert.ok(rows.some(e=>e.action==='help.display'));
 const submissions=rows.filter(e=>e.action==='attempt.submit');assert.equal(submissions[0].data.help_visible,false);assert.equal(submissions[1].data.help_visible,true);
 await next.receive({type:'history'});assert.match(h.shown.at(-1),/companion requests copied/);assert.match(h.shown.at(-1),/help.retained/);
 // A deliberately fresh attempt conceals prior help; it does not inherit lifetime assistance.
 await next.receive({type:'choose_question',revision:next.active.questions[0].revision});assert.deepEqual(next.active.helpVisible,[]);assert.deepEqual(next.active.current.helpExposures,[]);
 await next.receive({type:'submit',text:'Independent later recall',paper:false});await next.receive({type:'outcome',report:{outcome:'unaided_success',assessor:'reader',consulted:false}});
});
test('copying help proves no consultation; preview before submission is exposure even if not retained',async t=>{
 const h=await host(t);await h.commands.get('mrw.studyCurrent')();await h.c.receive({type:'question_save',question:value});await h.c.receive({type:'next'});
 await h.c.receive({type:'handoff',purpose:'hint'});await h.c.receive({type:'submit',text:'Still my own work',paper:false});
 assert.equal(h.c.active.current.submissions.at(-1).help_visible,false);
 h.api.env.clipboard.value='Pasted hint';await h.c.receive({type:'help_paste'});await h.c.receive({type:'help_cancel'});
 await h.c.receive({type:'submit',text:'After viewing hint',paper:false});assert.equal(h.c.active.current.submissions.at(-1).help_visible,true);
 await assert.rejects(h.c.receive({type:'outcome',report:{outcome:'unaided_success',assessor:'reader',consulted:false}}),/help|expos/i);
});
test('failed help checkpoint preserves draft and retry retains one identifiable response; edits retain originals',async t=>{
 const h=await host(t);let fail=false;
 const c=registerActiveStudy({...h.options,io:{...fs,writeFile:async(file,...args)=>{if(fail&&file.includes('active-studies-v1'))throw new Error('checkpoint unavailable');return fs.writeFile(file,...args);}}});
 await h.commands.get('mrw.studyCurrent')();h.api.env.clipboard.value='Original mathematical prose';await c.receive({type:'help_paste'});
 const response={text:'A separately edited explanation',author:'Reader',origin:'human'};fail=true;
 await assert.rejects(c.receive({type:'help_save',response,helpDraft:response}),/checkpoint unavailable/);assert.ok(c.active.helpDraft);assert.equal(c.active.help.length,1);
 fail=false;response.text+=' after a further draft edit';await c.receive({type:'help_save',response});assert.equal(c.active.helpDraft,null);assert.equal(c.active.help.length,1);
 const original=c.active.help[0];await c.receive({type:'help_edit',response:original.id});await c.receive({type:'help_save',response:{...response,text:'Another separately attributed correction'}});
 assert.equal(c.active.help.length,2);assert.equal(c.active.help[1].previous,original.id);assert.equal(c.active.help[1].original.text,'Original mathematical prose');assert.equal(original.text,response.text);
 const rows=await h.recorder.events();assert.equal(rows.filter(e=>e.action==='help.retained').length,2);
});
test('adaptation requests and returned help link into a separate continuation without replacing an offer',async t=>{
 const h=await host(t);await h.commands.get('mrw.studyCurrent')();await h.c.receive({type:'question_save',question:value});await h.c.receive({type:'next'});
 await h.c.receive({type:'submit',text:'Unresolved',paper:false});await h.c.receive({type:'outcome',report:{outcome:'unresolved',assessor:'reader',consulted:false}});
 const a=h.c.active.current;a.adaptation={event:'offer-id',choices:['clarification'],evidence:[a.outcome.event]};
 await h.c.receive({type:'adaptation',choice:'clarification'});const request=h.c.active.helpRequests[0];assert.ok(request.adaptation);
 h.api.env.clipboard.value='Try substituting the hypothesis.';await h.c.receive({type:'help_paste'});await h.c.receive({type:'help_save',response:{text:h.api.env.clipboard.value,author:'Codex companion',origin:'ai_proposal'}});
 assert.equal(h.c.active.help[0].adaptation,request.adaptation);await h.c.receive({type:'continue_attempt',response:h.c.active.help[0].id});
 assert.equal(!!h.c.active.current.adaptation,false);assert.equal(h.c.active.current.adaptationChoice,request.adaptation);
});
test('pending outcome and consultation are checkpointed per attempt through updates and reopen',async t=>{
 const h=await host(t);await h.commands.get('mrw.studyCurrent')();await h.c.receive({type:'question_save',question:value});await h.c.receive({type:'next'});await h.c.receive({type:'submit',text:'Work',paper:false});
 const s=h.c.active,report={outcome:'unresolved',assessor:'reader',consulted:true};await h.c.receive({type:'report_draft',attempt:s.current.id,report});
 await h.c.receive({type:'answer',reportDraft:report});await h.c.receive({type:'pause',reportDraft:report});
 const next=registerActiveStudy(h.options);await h.commands.get('mrw.resumeStudy')({study:s.id});assert.equal(next.active.current.reportDraft.consulted,true);assert.equal(next.active.current.reportDraft.outcome,'unresolved');
 assert.equal(next.active.current.finished,false);assert.equal((await h.recorder.events()).filter(e=>e.action==='attempt.outcome').length,0);
});
test('explicit offline example preserves research work and marks practice separately',async t=>{
 const h=await host(t);const c=registerActiveStudy({...h.options,loadExample:async()=>({root:'/project',passage:{...passage,reference:'retained-example',text:'1+3=4',label:'Example'}})});
 await h.commands.get('mrw.studyCurrent')();await c.receive({type:'question_save',question:value});await c.receive({type:'next'});const real=c.active;
 await c.receive({type:'draft',attempt:real.current.id,text:'Preserve research draft',paper:false});
 await h.commands.get('mrw.openStudyExample')();assert.equal(c.active.practice,true);assert.equal(c.active.questions.length,2);assert.equal(real.current.draft,'Preserve research draft');
 const demo=c.active.id;await c.receive({type:'next'});await c.receive({type:'submit',text:'Demo answer',paper:false});
 // Production recorder separates the demo without changing recorder origin globally.
 h.recorder.origin='production';await c.receive({type:'pause'});assert.ok((await h.recorder.events()).some(e=>e.action==='session.pause'&&e.origin==='practice_demo'&&e.identity.study===demo));
 await h.commands.get('mrw.resumeStudy')({study:real.id});assert.equal(c.active.current.draft,'Preserve research draft');
});
