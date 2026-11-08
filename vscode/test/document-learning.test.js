'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {registerActiveStudy}=require('../src/activeStudy'),{StudyHistory}=require('../src/studyHistory');
const docStudy=require('../src/studyDocument'),model=require('../src/studyModel');
const uri='file:///project/learning.md';
const markdown='# Learning example\n\n## Odd sums\nProblem: sum the first n positive odd integers.\n\n## Other section\nOther text.\n';
const doc=text=>({uri:{scheme:'file',path:'/project/learning.md',toString:()=>uri},languageId:'markdown',getText:()=>text});
const captured=text=>docStudy.capture(doc(text),text.indexOf('## Odd sums'));
const content=(s,extra={})=>({activity:'argument',prompt:'Why is the sum of the first n odd integers n²?',answer:{text:'For n=1 it is 1. Adding 2n+1 to n² gives (n+1)².',author:'Example author',origin:'human'},hints:[],references:[s.passages[0].reference],author:'Example author',origin:'human',...extra});
function envelope(c,m){const s=c.active;return {study:s.id,attempt:s.current?.id||null,formEpoch:s.formEpoch,formDraftId:s.formDraft?.draftId||null,helpDraftId:s.helpDraft?.id||null,...m};}
const send=(h,m)=>h.c.receive(envelope(h.c,m));
async function host(t){
 const home=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-document-learning-'));t.after(()=>fs.rm(home,{recursive:true,force:true}));
 const state=new Map(),commands=new Map(),panels=[],returns=[];let capture=captured(markdown),fail=false;
 const recorder=new StudyHistory(path.join(home,'history'),{version:'0.23.0',commit:'test'},{origin:'automated_test'});t.after(()=>recorder.close());
 const vscode={Uri:{parse:value=>({scheme:'file',path:value.slice(7),toString:()=>value})},ViewColumn:{Active:1},TreeItem:class{constructor(label){this.label=label;}},TreeItemCollapsibleState:{Collapsed:1,None:0},
   env:{clipboard:{text:'',async readText(){return this.text;},async writeText(text){this.text=text;}}},workspace:{getConfiguration:()=>({get:(key,fallback)=>fallback})},window:{registerTreeDataProvider:()=>({dispose(){}}),showQuickPick:async choices=>choices[0],
    createWebviewPanel(){const p={messages:[],webview:{onDidReceiveMessage(){},async postMessage(m){p.messages.push(m);}},onDidDispose(){},onDidChangeViewState(){},reveal(){}};panels.push(p);return p;}}};
 const options={vscode,context:{storageUri:{fsPath:home},extensionPath:path.resolve(__dirname,'..'),subscriptions:[],workspaceState:{get:k=>state.get(k),update:async(k,v)=>state.set(k,v)}},register:(name,f)=>commands.set(name,f),recorder,
  projectRoot:async()=>'/project',show:async()=>{},bridge:async()=>{throw Error('No backend needed for document problems');},changed:{fire(){}},getCurrent:async()=>{throw Error('Must not substitute retained material');},
  documentContext:async()=>structuredClone(capture),returnToDocument:async(origin,fileOnly)=>{returns.push({origin,fileOnly});if(origin.invalid)throw Error('Exact occurrence changed');},
  io:{...fs,writeFile:async(...args)=>{if(fail&&String(args[0]).includes('active-studies'))throw Error('injected failed study write');return fs.writeFile(...args);}}};
 const h={home,state,commands,panels,returns,recorder,vscode,options,setCapture:value=>capture=value,fail:value=>fail=value};h.c=registerActiveStudy(options);return h;
}
test('document problems use ordinary context snapshots and survive incidental revisions without changing associations or retained text',async t=>{
 const h=await host(t);await h.commands.get('mrw.documentProblems')();const s=h.c.active,id=s.id;
 assert.equal(s.document.uri,uri);assert.equal(s.passages[0].kind,'document_context');assert.doesNotMatch(s.passages[0].reference,/mrw-outline:/);
 await send(h,{type:'question_save',question:content(s)});const q=s.questions[0],original=structuredClone(s.passages[0]);
 h.setCapture(captured('Preface\n'+markdown));await h.commands.get('mrw.sectionProblems')();
 assert.equal(h.c.active.id,id);assert.equal(s.questions[0],q);assert.deepEqual(s.passages[0],original);assert.equal(s.questions.length,1);
 assert.equal(s.documentContext.origin.section,'Odd sums');
});
test('direct solution review creates no attempt, outcome or FSRS change and resumes its problem and return target',async t=>{
 const h=await host(t);await h.commands.get('mrw.documentProblems')();let s=h.c.active;
 await send(h,{type:'question_save',question:content(s)});const q=s.questions[0];await send(h,{type:'admit',revision:q.revision});const card=structuredClone(q.card);
 await send(h,{type:'solution_review',revision:q.revision});await send(h,{type:'unresolved',text:'Why does adding 2n+1 complete the square?'});await send(h,{type:'pause'});
 assert.equal(s.current,null);assert.deepEqual(q.card,card);assert.deepEqual(q.reviews,[]);
 const events=await h.recorder.events();assert.ok(events.some(e=>e.action==='solution.review'));assert.ok(!events.some(e=>/^attempt\.(begin|submit|outcome)$/.test(e.action)));
 const id=s.id;h.c=registerActiveStudy(h.options);await h.commands.get('mrw.resumeStudy')({study:id});s=h.c.active;
 assert.equal(s.solutionReview.open,true);assert.equal(s.problemRevision,q.revision);assert.match(s.unresolved,/complete the square/);
 await send(h,{type:'document_return'});assert.equal(h.returns[0].origin.section,'Odd sums');
 await send(h,{type:'handoff',purpose:'Explain the unresolved step'});assert.match(h.vscode.env.clipboard.text,/Problem under review/);assert.match(h.vscode.env.clipboard.text,/Example author/);assert.match(h.vscode.env.clipboard.text,/Attempt: none/);
});
test('consulting a solution preserves the active draft and prevents later assisted submissions from being graded unaided',async t=>{
 const h=await host(t);await h.commands.get('mrw.documentProblems')();const s=h.c.active;
 await send(h,{type:'question_save',question:content(s)});const q=s.questions[0];await send(h,{type:'admit',revision:q.revision});
 await send(h,{type:'choose_question',revision:q.revision});const id=s.current.id;await send(h,{type:'draft',text:'My incomplete calculation λ',paper:false});
 await send(h,{type:'solution_review',revision:q.revision});assert.equal(s.current.id,id);assert.equal(s.current.draft,'My incomplete calculation λ');assert.equal(s.current.answerExposed,true);
 await send(h,{type:'submit',text:s.current.draft,paper:false});await assert.rejects(send(h,{type:'outcome',report:{outcome:'unaided_success',assessor:'reader',consulted:false}}),/used help/);
 await send(h,{type:'outcome',report:{outcome:'help_dependent',assessor:'reader',consulted:true}});assert.equal(q.reviews.length,1);
 await send(h,{type:'choose_question',revision:q.revision});assert.equal(s.current.answerExposed,false);assert.equal(s.solutionReview,null);
 await send(h,{type:'submit',text:'Independent later calculation',paper:false});await send(h,{type:'outcome',report:{outcome:'unaided_success',assessor:'reader',consulted:false}});
 assert.equal(q.reviews.length,2);assert.equal(q.reviews[1].rating,3);
});
test('missing solutions can be attached and corrected with attribution while preserving their original revision and an unfinished attempt',async t=>{
 const h=await host(t);await h.commands.get('mrw.documentProblems')();const s=h.c.active;
 await send(h,{type:'question_save',question:content(s,{answer:null})});let q=s.questions[0];await send(h,{type:'solution_review',revision:q.revision});assert.equal(s.current,null);
 const first={text:'First attributed solution.',author:'Source author',origin:'human'};await send(h,{type:'solution_save',previous:q.revision,answer:first});q=s.questions.at(-1);assert.deepEqual(q.answer,first);
 await send(h,{type:'choose_question',revision:q.revision});await send(h,{type:'draft',text:'Keep my work',paper:false});
 await send(h,{type:'solution_save',previous:q.revision,answer:{...first,text:'Correction by reader.',author:'Reader'}});
 assert.deepEqual(s.questions.at(-1).originalAnswer,first);assert.equal(s.current.draft,'Keep my work');assert.equal(q.retired,true);assert.deepEqual(q.answer,first);assert.equal(s.current.helpExposures.length,1);
});
test('later problem work, solution review and dismissal never fabricate FSRS state or admit unrelated questions',async t=>{
 const h=await host(t);await h.commands.get('mrw.documentProblems')();const s=h.c.active;
 await send(h,{type:'question_save',question:content(s,{activity:'application'})});const q=s.questions[0];
 await send(h,{type:'problem_later',revision:q.revision,date:'2026-12-01'});assert.equal(q.problemLater.date,'2026-12-01');assert.equal(q.kept,false);assert.equal(q.card,null);
 await assert.rejects(send(h,{type:'admit',revision:q.revision}),/Application problems/);await assert.rejects(send(h,{type:'problem_later',revision:q.revision,date:'2026-02-30'}),/valid date/);
 await send(h,{type:'solution_review',revision:q.revision});assert.equal(q.card,null);await send(h,{type:'pause'});
 const view=h.panels[0].messages.findLast(m=>m.type==='active_study').study;assert.deepEqual(view.due,[]);assert.equal(s.current,null);
});
test('explicit association exposes only the chosen owner question, and due offers can be dismissed without a review',async t=>{
 const h=await host(t),source={reference:'mrw-outline:v2/stacks-project:0001/exact',source_revision:'a'.repeat(64),text:'Exact retained text',label:'Retained source'};
 const owner=await h.c.start([source],'/project');await send(h,{type:'question_save',question:content(owner)});await send(h,{type:'question_save',question:content(owner,{prompt:'An unrelated question sharing the same source.'})});
 const [chosen,unrelated]=owner.questions;await send(h,{type:'admit',revision:chosen.revision});await send(h,{type:'admit',revision:unrelated.revision});
 await h.commands.get('mrw.documentProblems')();const s=h.c.active;await send(h,{type:'associate_problem'});
 const view=h.panels[0].messages.findLast(m=>m.type==='active_study').study;assert.equal(view.questions.length,1);assert.equal(view.questions[0].revision,chosen.revision);assert.equal(chosen.references[0],source.reference);
 assert.deepEqual(view.due,[chosen.revision]);await send(h,{type:'due_dismiss',key:view.dueKey});assert.deepEqual(h.panels[0].messages.findLast(m=>m.type==='active_study').study.due,[]);
 assert.equal(s.current,null);assert.equal(chosen.card,null);assert.equal(unrelated.card,null);
});
test('live outside edits track return, overlaps stay visibly blocked, and failed writes retain solution text for retry',async t=>{
 const h=await host(t);await h.commands.get('mrw.documentProblems')();const s=h.c.active;await send(h,{type:'question_save',question:content(s)});const q=s.questions[0];
 const before=s.documentContext.origin.start;h.c.documentChanged({document:doc('Added\n'+markdown),contentChanges:[{rangeOffset:0,rangeLength:0,text:'Added\n'}]});assert.equal(s.documentContext.origin.start,before+6);
 h.c.documentChanged({document:doc('Changed heading\n'),contentChanges:[{rangeOffset:before+6,rangeLength:11,text:'Changed'}]});await send(h,{type:'document_return'});assert.match(s.returnError,/changed or missing/);assert.equal(s.questions.length,1);
 const draft={kind:'solution',draftId:'pending-solution',revision:q.revision,answerDraft:{text:'Keep this correction after failure',author:'Reader',origin:'human'}};
 await send(h,{type:'form_draft',form:draft,formDraftId:draft.draftId});h.fail(true);await assert.rejects(send(h,{type:'solution_save',previous:q.revision,answer:draft.answerDraft}),/failed study write/);
 assert.equal(s.formDraft.answerDraft.text,draft.answerDraft.text);h.fail(false);await send(h,{type:'solution_save',previous:q.revision,answer:draft.answerDraft});assert.equal(s.formDraft,null);assert.equal(s.questions.filter(q=>q.answer?.text===draft.answerDraft.text).length,1);
});

test('Studies navigation opens a document problem without creating an attempt and routes context snapshots to document Return',async t=>{
 const h=await host(t);await h.commands.get('mrw.documentProblems')();const s=h.c.active;await send(h,{type:'question_save',question:content(s)});const q=s.questions[0];
 await h.commands.get('mrw.openStudyItem')({study:s.id,revision:q.revision});assert.equal(s.current,null);assert.equal(s.problemRevision,q.revision);
 await h.commands.get('mrw.openStudyItem')({study:s.id,reference:s.passages[0].reference});assert.equal(h.returns[0].origin.section,'Odd sums');
 await assert.rejects(send(h,{type:'due_dismiss',key:'stale'}),/due questions changed/);
});
test('correcting an explicitly linked problem creates a local revision without retiring its source owner',async t=>{
 const h=await host(t),p={reference:'mrw-outline:v2/stacks-project:0001/exact',source_revision:'a'.repeat(64),text:'Exact text',label:'Original'};
 const owner=await h.c.start([p],'/project');await send(h,{type:'question_save',question:content(owner)});const original=owner.questions[0],text=structuredClone(original.answer);
 await h.commands.get('mrw.documentProblems')();await send(h,{type:'associate_problem'});await send(h,{type:'solution_save',previous:original.revision,answer:{text:'Reader correction',author:'Reader',origin:'human'}});
 assert.equal(original.retired,false);assert.deepEqual(original.answer,text);assert.deepEqual(h.c.active.questions[0].originalAnswer,text);
});
