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
 const home=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-document-learning-'));
 const state=new Map(),commands=new Map(),panels=[],returns=[];let fail=false;
 const recorder=new StudyHistory(path.join(home,'history'),{version:'0.23.0',commit:'test'},{origin:'automated_test'});t.after(async()=>{await recorder.close();await fs.rm(home,{recursive:true,force:true});});
 const vscode={Uri:{parse:value=>({scheme:'file',path:value.slice(7),toString:()=>value})},ViewColumn:{Active:1},TreeItem:class{constructor(label){this.label=label;}},TreeItemCollapsibleState:{Collapsed:1,None:0},
   env:{clipboard:{text:'',async readText(){return this.text;},async writeText(text){this.text=text;}}},workspace:{getConfiguration:()=>({get:(key,fallback)=>fallback})},window:{registerTreeDataProvider:()=>({dispose(){}}),showQuickPick:async choices=>choices[0],
    createWebviewPanel(){const p={messages:[],webview:{onDidReceiveMessage(){},async postMessage(m){p.messages.push(m);}},onDidDispose(){},onDidChangeViewState(){},reveal(){}};panels.push(p);return p;}}};
 const options={vscode,context:{storageUri:{fsPath:home},extensionPath:path.resolve(__dirname,'..'),subscriptions:[],workspaceState:{get:k=>state.get(k),update:async(k,v)=>state.set(k,v)}},register:(name,f)=>commands.set(name,f),recorder,
  projectRoot:async()=>'/project',show:async()=>{},bridge:async()=>{throw Error('No backend needed for document problems');},changed:{fire(){}},getCurrent:async()=>{throw Error('Must not substitute retained material');},
  returnToDocument:async(origin,fileOnly)=>{returns.push({origin,fileOnly});if(origin.invalid)throw Error('Exact occurrence changed');},
  io:{...fs,writeFile:async(...args)=>{if(fail&&String(args[0]).includes('active-studies'))throw Error('injected failed study write');return fs.writeFile(...args);}}};
 const h={home,state,commands,panels,returns,recorder,vscode,options,fail:value=>fail=value};h.c=registerActiveStudy(options);
 h.seed=async s=>{await fs.mkdir(path.join(home,'active-studies-v1'),{recursive:true});await fs.writeFile(path.join(home,'active-studies-v1',s.id+'.json'),JSON.stringify(s,null,2)+'\n');state.set('mrw.lightStudy.recent.v1',[...(state.get('mrw.lightStudy.recent.v1')||[]),{id:s.id,title:s.title,document:s.document?.uri,sources:s.passages.length}]);};
 h.reopen=async id=>{h.c=registerActiveStudy(options);await commands.get('mrw.resumeStudy')({study:id});return h.c.active;};
 return h;
}
// Seed the previous on-disk schema directly. Production no longer creates it.
function legacy(){
 const context=captured(markdown),s={...model.createStudy([context.passage],'/project',context.label),id:docStudy.studyID('/project',uri),document:{uri,label:context.label},documentContext:context,formEpoch:'legacy-epoch'};
 const q=model.question(content(s),s.passages);s.questions=[q];s.problemRevision=q.revision;
 s.unresolved='Why does adding 2n+1 complete the square?';
 s.formDraft={kind:'solution',draftId:'pending-solution',revision:q.revision,answerDraft:{text:'Unfinished correction λ',author:'Reader',origin:'human'}};
 s.helpDraft={id:'pending-help',attempt:null,text:'Edited companion draft.',author:'Reader',origin:'human',original:{text:'Original companion text.',author:'Codex',origin:'ai_proposal'}};
 return s;
}
test('document Problems commands and menu routes are removed rather than hidden or forwarded',async t=>{
 const h=await host(t),manifest=JSON.parse(await fs.readFile(path.join(__dirname,'../package.json'),'utf8'));
 for(const id of ['mrw.documentProblems','mrw.sectionProblems']){
  assert.equal(h.commands.has(id),false);assert.doesNotMatch(JSON.stringify(manifest.contributes),new RegExp(id.replaceAll('.','\\.')));
 }
});
test('legacy document work reopens without rewriting records, creating an attempt, or changing recall state',async t=>{
 const h=await host(t),saved=legacy();await h.seed(saved);
 const file=path.join(h.home,'active-studies-v1',saved.id+'.json'),bytes=await fs.readFile(file,'utf8');
 const s=await h.reopen(saved.id);assert.equal(h.panels[0].title,'Saved work: '+s.title);
 assert.equal(s.current,null);assert.deepEqual(s.formDraft,saved.formDraft);assert.deepEqual(s.helpDraft,saved.helpDraft);assert.deepEqual(s.questions,saved.questions);assert.equal(s.unresolved,saved.unresolved);
 assert.equal(await fs.readFile(file,'utf8'),bytes,'opening is not a data migration');
 const events=await h.recorder.events();assert.equal(events.some(e=>/^(question\.|attempt\.|review\.admit|document.problems)/.test(e.action)),false);
});
test('stale document forms cannot create, revise, associate, grade or schedule work',async t=>{
 const h=await host(t),saved=legacy();await h.seed(saved);const s=await h.reopen(saved.id),before=structuredClone(s);
 for(const type of ['question_save','solution_save','import_questions','associate_problem','choose_question','next','continue_block','submit','outcome','solution_review','admit','problem_later','due_show','due_dismiss','handoff','form_cancel','help_cancel']){
  await assert.rejects(send(h,{type,question:content(s),revision:s.questions[0].revision}),/forms have been removed/);
 }
 assert.deepEqual(s,before);await h.c.flush();
});
test('late drafts are preserved after failed writes, retry and restart without reviving creation controls',async t=>{
 const h=await host(t),saved=legacy();saved.block=model.block({});model.begin(saved,saved.questions[0],'synthetic old attempt',h.recorder);await h.seed(saved);let s=await h.reopen(saved.id);
 const draft={...s.formDraft,answerDraft:{...s.formDraft.answerDraft,text:'Newer in-flight correction.'}};
 await send(h,{type:'form_draft',form:draft});await send(h,{type:'draft',text:'Newer unfinished calculation λ',paper:false});
 const response={...s.helpDraft,text:'Newer companion draft.'};await send(h,{type:'help_draft',attempt:null,response});
 await send(h,{type:'report_draft',report:{outcome:'unresolved',consulted:true}});
 h.fail(true);await assert.rejects(h.c.flush(),/failed study write/);
 assert.equal(s.formDraft.answerDraft.text,draft.answerDraft.text);assert.equal(s.current.draft,'Newer unfinished calculation λ');assert.equal(s.helpDraft.text,response.text);
 h.fail(false);await h.c.flush();s=await h.reopen(s.id);
 assert.equal(s.formDraft.answerDraft.text,draft.answerDraft.text);assert.equal(s.current.draft,'Newer unfinished calculation λ');assert.equal(s.helpDraft.text,response.text);assert.equal(s.current.reportDraft.consulted,true);
 assert.equal(s.current.submissions.length,0);assert.equal(s.questions.length,1);assert.equal(s.questions[0].card,null);
});
test('saved document Return tracks edits, reports overlap and missing origins, and preserves pending text',async t=>{
 const h=await host(t),saved=legacy();await h.seed(saved);const s=await h.reopen(saved.id),before=s.documentContext.origin.start;
 h.c.documentChanged({document:doc('Added\n'+markdown),contentChanges:[{rangeOffset:0,rangeLength:0,text:'Added\n'}]});
 await send(h,{type:'document_return'});assert.equal(h.returns[0].origin.start,before+6);
 h.c.documentChanged({document:doc('Changed heading\n'),contentChanges:[{rangeOffset:before+6,rangeLength:11,text:'Changed'}]});
 await send(h,{type:'document_return'});assert.match(s.returnError,/changed or missing/);
 assert.doesNotMatch(h.panels[0].messages.at(-1).notice,/choose Problems/i);
 await send(h,{type:'document_open'});assert.equal(h.returns.at(-1).fileOnly,true);assert.equal(s.formDraft.answerDraft.text,saved.formDraft.answerDraft.text);
 await h.c.flush();
});
test('saved explicit associations expose only the chosen revision without changing its owner',async t=>{
 const h=await host(t),p={reference:'mrw-outline:v2/stacks-project:0001/exact',source_revision:'a'.repeat(64),text:'Exact text',label:'Source'},owner=model.createStudy([p],'/project','Source');
 owner.questions=[model.question(content(owner),owner.passages),model.question(content(owner,{prompt:'Unrelated question.'}),owner.passages)];
 const saved=legacy(),chosen=owner.questions[0];saved.questions=[];saved.passages.push(p);saved.problemLinks=[{owner:owner.id,question:chosen.id,revision:chosen.revision,origin:saved.documentContext.origin}];
 await h.seed(owner);await h.seed(saved);const s=await h.reopen(saved.id),file=path.join(h.home,'active-studies-v1',owner.id+'.json'),bytes=await fs.readFile(file,'utf8');
 const view=h.panels[0].messages.at(-1).study;assert.equal(view.questions.length,1);assert.equal(view.questions[0].revision,chosen.revision);
 await h.commands.get('mrw.resumeStudy')({study:s.id});assert.equal(s.current,null);assert.equal(await fs.readFile(file,'utf8'),bytes);
 await send(h,{type:'source',reference:s.passages[0].reference});assert.equal(h.returns.at(-1).origin.section,'Odd sums');
 await h.c.flush();
});

test('obsolete Save checkpoints its bundled latest prose even when no debounce checkpoint arrived',async t=>{
 const h=await host(t),saved=legacy();await h.seed(saved);let s=await h.reopen(saved.id);const original=structuredClone(s.questions);
 const form={...s.formDraft,answerDraft:{...s.formDraft.answerDraft,text:'Latest text bundled with obsolete Save λ'}};
 const helpDraft={...s.helpDraft,text:'Latest bundled companion prose.'};
 h.fail(true);await assert.rejects(send(h,{type:'solution_save',form,helpDraft,unresolvedDraft:'Latest unresolved step.'}),/failed study write/);
 assert.equal(s.formDraft.answerDraft.text,form.answerDraft.text);assert.deepEqual(s.questions,original);
 h.fail(false);await assert.rejects(send(h,{type:'solution_save',form,helpDraft,unresolvedDraft:'Latest unresolved step.'}),/forms have been removed/);
 s=await h.reopen(s.id);assert.equal(s.formDraft.answerDraft.text,form.answerDraft.text);assert.equal(s.helpDraft.text,helpDraft.text);assert.equal(s.unresolved,'Latest unresolved step.');assert.deepEqual(s.questions,original);assert.equal(s.current,null);
});
