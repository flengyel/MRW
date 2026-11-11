'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {StudyHistory,summarize}=require('../src/studyHistory'),model=require('../src/studyModel'),scheduler=require('../src/studyScheduler');
const {registerActiveStudy:registerStudy}=require('../src/activeStudy'),{runBridge}=require('../src/bridge');
const {scopedController}=require('./study-message-fixture');
const registerActiveStudy=options=>scopedController(registerStudy(options));
const passage={reference:'mrw-outline:v1/exact-selected-reference',label:'Selected proof passage',text:'For every x, f(x) = x.',source_revision:'a'.repeat(64),authors:'Source author'};
const value={activity:'missing_step',prompt:'Explain the missing step.',answer:{text:'Apply the hypothesis.',author:'Codex companion',origin:'ai_proposal'},hints:['Check the hypothesis.'],references:[passage.reference],author:'Codex companion',origin:'ai_proposal'};
async function history(t,io){const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-events-'));t.after(()=>fs.rm(directory,{recursive:true,force:true}));const h=new StudyHistory(directory,{version:'0.18.0',commit:'test'},{origin:'test',io});await h.init();t.after(()=>h.close());return h;}
function study(){return model.createStudy([passage],'/project');}
function begin(s,h,q=model.question(value,[passage])){s.questions.push(q);s.block=model.block();model.begin(s,q,'test',h);return q;}
test('submission snapshots and exposure ordering remain exact after later reveals and corrections',async t=>{
 const h=await history(t),s=study(),q=begin(s,h);q.kept=true;
 model.submit(s,'Exact first answer λ',false,h);s.current.answerVisible=true;s.current.hints.push(0);
 model.outcome(s,{outcome:'unaided_success',assessor:'reader',consulted:false},h);
 assert.equal(q.reviews.length,1);assert.equal(q.reviews[0].rating,3);
 const rows=await h.events(),submission=rows.find(e=>e.action==='attempt.submit');
 const snap=JSON.parse(await fs.readFile(path.join(h.directory,'snapshots',submission.data.snapshot+'.json'),'utf8'));
 assert.equal(snap.answer,'Exact first answer λ');assert.equal(snap.answer_visible,false);assert.deepEqual(snap.hints,[]);
 model.outcome(s,{outcome:'unresolved',assessor:'reader',consulted:false,correction:true},h);assert.equal(q.reviews.length,1);assert.equal(q.reviews[0].rating,1);
 const corrected=(await h.events()).find(e=>e.action==='attempt.correction');assert.ok(corrected.data.corrects);
 for(const e of rows){assert.equal(e.schema,1);assert.equal(e.origin,'test');assert.ok(e.software.commit);assert.ok(e.policy);assert.equal(e.scheduler,scheduler.IDENTITY);}
});
test('revision isolation retains original source/question history and clears review on revision',async t=>{
 const h=await history(t),s=study(),q=begin(s,h);q.kept=true;model.submit(s,'answer',false,h);model.outcome(s,{outcome:'unaided_success',assessor:'reader',consulted:false},h);
 const revised=model.question({...value,prompt:'A different step.'},[passage],q);assert.equal(revised.id,q.id);assert.notEqual(revised.revision,q.revision);assert.equal(revised.card,null);assert.equal(revised.kept,false);
 const other=model.createStudy([{...passage,text:'Changed source.'}],'/project');assert.notEqual(other.id,s.id);assert.equal(other.questions.length,0);
});
test('FSRS mapping excludes skips, missing assessment/consultation, AI assessment and application; repeated observations are idempotent',()=>{
 const item={kept:true,retired:false,reviews:[]},now=new Date('2026-11-05T12:00:00Z'),o={attempt:'a',activity:'definition',outcome:'unaided_success',assessor:'reader',consulted:false,hints:0,answer_visible:false};
 for(const change of [{outcome:'skipped'},{outcome:'unassessed'},{assessor:'ai'},{activity:'application'},{consulted:null}])assert.equal(scheduler.observe(item,{...o,...change},now).changed,false);
 assert.equal(scheduler.observe(item,o,now).rating,'Good');assert.equal(scheduler.observe(item,o,now).changed,false);
 const assisted=scheduler.observe(item,{...o,attempt:'b',hints:1},new Date(+now+86400000));assert.equal(assisted.rating,'Again');assert.equal(item.reviews.length,2);
});
test('due ordering, limited new admission and block time/question budgets',()=>{
 const q=[{id:'a',revision:'a',kept:false},{id:'b',revision:'b',kept:true,card:{due:'1970-01-01'},reviews:[{}]},{id:'c',revision:'c',kept:false}],b=model.block({},1000);
 assert.equal(scheduler.select(q,b,1100).question.id,'b');b.seen.push('b');assert.equal(scheduler.select(q,b,1100).question.id,'a');b.newCount=1;assert.equal(scheduler.select(q,b,1100).question,null);
 b.completed=3;assert.equal(scheduler.select(q,b,1100).reason,'budget');b.completed=0;assert.equal(scheduler.select(q,b,301001).reason,'budget');
});
test('effort missingness and conservative adaptation preserve high-effort success',async t=>{
 const h=await history(t),s=study();begin(s,h);model.submit(s,'answer',false,h);model.outcome(s,{outcome:'unaided_success',assessor:'reader',consulted:false},h);
 assert.equal(model.adaptation(s,null,await h.events()),null);h.record('effort.response',{attempt:s.current.id,rating:9},'reader_report');const a=model.adaptation(s,9,await h.events());assert.deepEqual(a.choices,['continue','pause']);
 h.record('effort.offer',{attempt:s.current.id});const text=summarize(await h.events());assert.match(text,/no response: 1/);assert.match(text,/mean unavailable/);assert.match(text,/Descriptive only/);
});
test('recorder failure preserves event order and snapshots, exposes a gap and recovers without blocking',async t=>{
 let fail=true;const h=await history(t,{...fs,writeFile:async(...a)=>{if(fail)throw new Error('test disk failure');return fs.writeFile(...a);}});
 const first=h.record('attempt.begin'),id=h.snapshot({answer:'retained'});h.record('attempt.submit',{snapshot:id});await h.flush();assert.match(h.gap,/History gap/);assert.ok(h.pending.length);
 fail=false;await h.flush();assert.equal(h.gap,'');const rows=await h.events();assert.ok(rows.find(e=>e.id===first.id));assert.equal(rows.filter(e=>e.id===first.id).length,1);assert.equal(JSON.parse(await fs.readFile(path.join(h.directory,'snapshots',id+'.json'),'utf8')).answer,'retained');
});
async function host(t){
 const home=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-active-'));t.after(()=>fs.rm(home,{recursive:true,force:true}));const state=new Map(),commands=new Map(),panels=[],shown=[];
 const recorder=new StudyHistory(path.join(home,'history'),{version:'0.18.0',commit:'test'},{origin:'test'});t.after(()=>recorder.close());
 const api={Uri:{file:fsPath=>({fsPath,scheme:'file'})},ViewColumn:{Active:1},TreeItem:class{constructor(label){this.label=label;}},TreeItemCollapsibleState:{Collapsed:1,None:0},
  env:{clipboard:{value:'',async readText(){return this.value;},async writeText(t){this.value=t;}}},
  workspace:{getConfiguration:()=>({get:(k,f)=>f})},commands:{executeCommand:async()=>{}},window:{registerTreeDataProvider(){return{dispose(){}};},
   createWebviewPanel(){const p={title:'',webview:{onDidReceiveMessage(f){p.receive=f;},async postMessage(m){p.messages.push(m);}},messages:[],onDidDispose(f){p.close=f;},onDidChangeViewState(){},reveal(){}};panels.push(p);return p;},showQuickPick:async a=>a[0]}};
 const context={storageUri:{fsPath:home},extensionPath:path.resolve(__dirname,'..'),subscriptions:[],workspaceState:{get:k=>state.get(k),update:async(k,v)=>state.set(k,v)}};
 const options={vscode:api,context,register:(n,f)=>commands.set(n,f),recorder,projectRoot:async()=>'/project',show:async text=>shown.push(text),bridge:r=>runBridge(context.extensionPath,'python3',r),changed:{fire(){}},getCurrent:async()=>passage,readPassage:async()=>passage,followPassage:async()=>{}};
 const c=registerActiveStudy(options);return{home,c,commands,panels,recorder,api,state,shown,options};
}
test('current-material interaction preserves draft on source switch, resumes offline and exposes content rows',async t=>{
 const h=await host(t);await h.commands.get('mrw.studyCurrent')();const first=h.c.active;
 await h.c.receive({type:'question_save',question:value});await h.c.receive({type:'next'});const attempt=first.current.id;
 await h.c.receive({type:'draft',attempt,text:'unfinished λ',paper:false});
 await h.c.start([{...passage,text:'Second source.',reference:'second'}],'/project');assert.equal(first.current.draft,'unfinished λ');
 await h.commands.get('mrw.resumeStudy')({study:first.id});assert.equal(h.c.active.current.id,attempt);assert.equal(h.c.active.current.draft,'unfinished λ');
 const next=registerActiveStudy({...h.options});await h.commands.get('mrw.resumeStudy')({study:first.id});assert.equal(next.active.current.draft,'unfinished λ');
 const rows=await next.tree.getChildren({study:first.id,kind:'study'});assert.equal(rows[0].kind,'source');assert.equal(rows[1].kind,'question');
 await next.receive({type:'submit',text:'Exact submitted work',paper:false});await next.receive({type:'outcome',report:{outcome:'unresolved',assessor:'reader',consulted:false}});
 await next.receive({type:'effort_offer'});await next.receive({type:'effort_response',rating:null});assert.equal(next.active.current.effortOffer.disposition,'declined');
 await next.receive({type:'history'});assert.match(h.shown.at(-1),/attempt.submit/);
});
test('strict bounded clipboard imports reject duplicate keys, unknown fields and changed source pins',async t=>{
 const h=await host(t);await h.commands.get('mrw.studyCurrent')();const object={version:1,sources:model.signature([passage]),questions:[value]};
 h.api.env.clipboard.value=JSON.stringify(object);await h.c.receive({type:'import_questions'});assert.equal(h.c.active.questions.length,1);assert.equal(h.c.active.questions[0].kept,false);
 for(const raw of ['{"version":1,"version":1}',JSON.stringify({...object,extra:true}),JSON.stringify({...object,sources:[]}),JSON.stringify({...object,questions:Array(11).fill(value)})]){
 h.api.env.clipboard.value=raw;await assert.rejects(h.c.receive({type:'import_questions'}));assert.equal(h.c.active.questions.length,1);}
});
test('only explicitly selected prerequisite pins share review eligibility across studies',async t=>{
 const h=await host(t),owner=await h.c.start([passage],'/project');await h.c.receive({type:'question_save',question:value});const q=owner.questions[0];
 const different={...passage,reference:'other',text:'A different proof.'};await h.c.start([different],'/project');assert.equal(h.panels[0].messages.at(-1).study.questions.length,0);
 await h.c.start([different,passage],'/project');assert.equal(h.panels[0].messages.at(-1).study.questions.length,1);
 await h.c.receive({type:'admit',revision:q.revision});await h.c.receive({type:'next'});await h.c.receive({type:'submit',text:'answer',paper:false});await h.c.receive({type:'outcome',report:{outcome:'unaided_success',assessor:'reader',consulted:false}});assert.equal(q.reviews.length,1);
 await h.c.start([{...passage,text:'Changed retained quotation.'}],'/project');assert.equal(h.panels[0].messages.at(-1).study.questions.length,0);
});
test('a newly kept question still consumes the new-question budget',()=>{
 const q={id:'new-kept',revision:'n',kept:true,reviews:[]},b=model.block({},1000);b.newCount=1;assert.equal(scheduler.select([q],b,1100).question,null);
});
test('effort offers record nonresponse on the next task; repeated difficulty offers support without changing outcomes',async t=>{
 const h=await history(t),s=study();begin(s,h);model.submit(s,'first',false,h);model.outcome(s,{outcome:'unresolved',assessor:'reader',consulted:false},h);
 const offer=h.record('effort.offer',{attempt:s.current.id});s.current.effortOffer={id:offer.id,disposition:'no_response'};
 const q=model.question({...value,prompt:'Another missing step'},[passage]);s.questions.push(q);model.begin(s,q,'reader override',h);model.submit(s,'second',false,h);model.outcome(s,{outcome:'help_dependent',assessor:'reader',consulted:true},h);
 const events=await h.events();assert.ok(events.some(e=>e.action==='effort.response'&&e.data.disposition==='no_response'));assert.match(summarize(events),/no response: 1/);
 h.record('effort.response',{attempt:s.current.id,rating:8},'reader_report');const a=model.adaptation(s,8,await h.events());assert.ok(a.choices.includes('smaller_step'));assert.equal(s.current.outcome.outcome,'help_dependent');
});
test('serialized FSRS state resumes and a changed source never inherits it',()=>{
 let q={kept:true,reviews:[]};const o={attempt:'first',activity:'definition',outcome:'unaided_success',assessor:'reader',consulted:false,hints:0,answer_visible:false};
 scheduler.observe(q,o,new Date('2026-11-01'));q=JSON.parse(JSON.stringify(q));assert.equal(scheduler.observe(q,{...o,attempt:'second'},new Date('2026-11-05')).rating,'Good');assert.equal(q.reviews.length,2);
});
test('explicit comparison export uses ordinary save, includes selected versions and refuses overwrite',async t=>{
 const h=await host(t);await h.commands.get('mrw.studyCurrent')();await h.c.receive({type:'question_save',question:value});await h.c.receive({type:'next'});await h.c.receive({type:'submit',text:'Exported immutable answer',paper:false});
 const destination=path.join(h.home,'comparison.md'),documents=new Map();
 h.api.Position=class{constructor(line,character){Object.assign(this,{line,character});}};
 h.api.WorkspaceEdit=class{constructor(){this.ops=[];}createFile(uri){this.ops.push({kind:'create',uri});}insert(uri,p,text){this.ops.push({kind:'insert',uri,text});}};
 h.api.window.showQuickPick=async(a,options)=>options?.canPickMany?a:a[0];h.api.window.showSaveDialog=async()=>({scheme:'file',fsPath:destination});h.api.window.showTextDocument=async()=>{};
 h.api.workspace.openTextDocument=async uri=>{if(!documents.has(uri.fsPath))documents.set(uri.fsPath,{text:await fs.readFile(uri.fsPath,'utf8'),async save(){await fs.writeFile(uri.fsPath,this.text);return true;}});return documents.get(uri.fsPath);};
 h.api.workspace.applyEdit=async edit=>{for(const op of edit.ops)if(op.kind==='create')await fs.writeFile(op.uri.fsPath,'',{flag:'wx'});else{const doc=await h.api.workspace.openTextDocument(op.uri);doc.text+=op.text;}return true;};
 await h.commands.get('mrw.exportStudyHistory')();const text=await fs.readFile(destination,'utf8');assert.match(text,/Descriptive only/);assert.match(text,/0.18.0/);assert.match(text,/Submissions: 1/);assert.match(text,/without an outcome: 1/);
 await assert.rejects(h.commands.get('mrw.exportStudyHistory')(),/new export filename/);assert.equal(await fs.readFile(destination,'utf8'),text);
});
test('help handoff asks for ordinary prose while question generation keeps its strict object',()=>{
 const s=study();s.unresolved='Explain this step.';const help=model.questionHandoff(s,'hint');assert.match(help,/ordinary prose/);assert.doesNotMatch(help,/"questions"\s*:/);assert.ok(help.includes(passage.text));
 assert.match(model.questionHandoff(s),/"questions"\s*:/);
});
test('failed study checkpoint never announces save success; retry preserves one live question',async t=>{
 const h=await host(t);let fail=false;
 const c=registerActiveStudy({...h.options,io:{...fs,writeFile:async(file,...args)=>{if(fail&&file.includes('active-studies-v1'))throw new Error('checkpoint unavailable');return fs.writeFile(file,...args);}}});
 await h.commands.get('mrw.studyCurrent')();const file=path.join(h.home,'active-studies-v1',c.active.id+'.json');
 const before=h.panels.at(-1).messages.length;fail=true;
 await assert.rejects(c.receive({type:'question_save',question:value,form:value}),/checkpoint unavailable/);
 assert.equal(c.active.questions.length,1);assert.equal(JSON.parse(await fs.readFile(file,'utf8')).questions.length,0);
 assert.equal(h.panels.at(-1).messages.slice(before).some(m=>m.notice?.startsWith('Question saved.')),false);
 fail=false;await c.receive({type:'question_save',question:value,form:value});assert.equal(c.active.questions.length,1);assert.equal(JSON.parse(await fs.readFile(file,'utf8')).questions.length,1);
});
test('a missing recent-study locator never replaces a saved study or unfinished attempt',async t=>{
 const h=await host(t);await h.commands.get('mrw.studyCurrent')();await h.c.receive({type:'question_save',question:value});await h.c.receive({type:'next'});await h.c.receive({type:'draft',attempt:h.c.active.current.id,text:'Preserve older unfinished work',paper:false});await h.c.flush();
 h.state.delete('mrw.lightStudy.recent.v1');const restored=registerActiveStudy({...h.options});await h.commands.get('mrw.studyCurrent')();assert.equal(restored.active.questions.length,1);assert.equal(restored.active.current.draft,'Preserve older unfinished work');
});


test('Studies recovers saved work without opening it or creating a study from a stale cache entry',async t=>{
 const h=await host(t),tree=h.c.tree,s=study(),home=path.join(h.home,'active-studies-v1');
 await fs.mkdir(home,{recursive:true});const text=JSON.stringify(s);await fs.writeFile(path.join(home,s.id+'.json'),text);
 h.state.set('mrw.lightStudy.recent.v1',[{id:'a'.repeat(64),title:'Stale cache entry',sources:1}]);
 const populated=await tree.getChildren();assert.equal(populated.length,1);
 const saved=populated[0];assert.equal(saved.kind,'study');
 assert.equal(tree.getTreeItem(saved).command.command,'mrw.openStudyItem');
 assert.equal(tree.getTreeItem(saved).command.arguments[0].study,s.id);
 assert.equal(h.c.active,undefined);assert.equal(h.panels.length,0);
 assert.deepEqual(await fs.readdir(home),[s.id+'.json']);assert.equal(await fs.readFile(path.join(home,s.id+'.json'),'utf8'),text);
});
