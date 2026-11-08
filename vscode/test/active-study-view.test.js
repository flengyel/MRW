'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');

function view(stored={studies:{}}){
  let receive,nextTimer=1;const messages=[],timers=new Map();
  class Node{
    constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.textContent='';this.disabled=false;}
    append(n){this.children.push(n);n.parent=this;}replaceChildren(){this.children=[];}
    setAttribute(k,v){this[k]=v;}all(){return this.children.flatMap(n=>[n,...n.all()]);}
    querySelectorAll(tags){return this.all().filter(n=>tags.split(',').includes(n.tag));}
    text(){return this.textContent+' '+this.children.map(n=>n.text()).join(' ');}
    focus(){document.activeElement=this;}setSelectionRange(a,b){this.selectionStart=a;this.selectionEnd=b;}
  }
  const root=new Node('main'),document={getElementById:()=>root,createElement:t=>new Node(t)};
  const globals={document,structuredClone,crypto:require('node:crypto'),setTimeout:fn=>{const id=nextTimer++;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),
    acquireVsCodeApi:()=>({getState:()=>stored,setState:s=>{stored=structuredClone(s);},postMessage:m=>messages.push(structuredClone(m))}),
    addEventListener:(_,fn)=>receive=fn,MRWAnnotations:{render:(p,t)=>{const n=new Node('div');n.textContent=t;p.append(n);}}};
  globals.window=globals;globals.origin='vscode-webview://fixture';
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/activeStudyView.js'),'utf8'),globals);
  return{root,messages,send:(study,notice='',gap='')=>receive({origin:globals.origin,data:{type:'active_study',study:structuredClone(study),notice,gap}}),
    error:message=>receive({origin:globals.origin,data:{type:'study_error',message}}),idle:()=>receive({origin:globals.origin,data:{type:'study_idle'}}),
    button:action=>root.all().find(n=>n.dataset.action===action),field:text=>root.all().find(n=>n['aria-label']===text),
    flush:()=>{const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());},stored:()=>stored};
}
function study(){return{id:'study-fixture',formEpoch:'form-epoch-1',title:'Fixture passage',passages:[{reference:'mrw:fixture',source_revision:'revision',label:'Exact fixture source',text:'Original mathematical source.'}],questions:[],current:null,unresolved:'',help:[],helpVisible:[]};}
function question(){return{id:'question',revision:'q1',activity:'argument',prompt:'Explain the fixture.',author:'Fixture writer',origin:'human',answer:{text:'Exact reference answer.',author:'Fixture writer',origin:'human'},hints:[],references:['mrw:fixture'],kept:false};}
function attempt(){return{id:'attempt-1',question:question(),draft:'My original work',paper:false,sourceVisible:false,answerVisible:false,hints:[],submissions:[],outcome:null,finished:false};}
function change(field,value){field.value=value;field.onchange();}

test('empty study orients from selected source and offers direct question choices without empty block action',()=>{
  const h=view(),s=study();h.send(s);
  assert.match(h.root.text(),/Original mathematical source/);assert.equal(h.button('next'),undefined);
  assert.equal(h.button('enter_question').textContent,'Enter a question');assert.equal(h.button('handoff').textContent,'Request questions from Codex');
  const bank=h.root.all().find(n=>n.tag==='details'&&n.children[0]?.textContent==='Questions (0)');assert.equal(bank.open,false);
  h.button('enter_question').onclick();assert.ok(h.field('Question'));assert.equal(h.messages.some(m=>m.type==='next'),false);
});

test('recall starts concealed and unfinished work cannot switch questions after idle',()=>{
  const h=view(),s=study();s.questions=[question()];s.current=attempt();h.send(s);
  assert.doesNotMatch(h.root.text(),/Original mathematical source|Exact reference answer/);assert.match(h.root.text(),/Attempt in progress/);
  assert.equal(h.button('choose_question').disabled,true);assert.equal(h.button('question_edit').disabled,true);h.idle();assert.equal(h.button('choose_question').disabled,true);
  h.button('answer').onclick();assert.equal(h.messages.at(-1).type,'answer');s.current.answerVisible=true;h.send(s);
  assert.match(h.root.text(),/Exact reference answer/);assert.doesNotMatch(h.root.text(),/Original mathematical source/);
});

test('outcome and consultation remain pending across reveal, pause, checkpoint and renderer restart',()=>{
  const h=view(),s=study();s.questions=[question()];s.current=attempt();s.current.submissions=[{hints:0,answer_visible:false}];h.send(s);
  change(h.field('Your outcome'),'unresolved');change(h.field('Did you consult the source or other help before that submission?'),'yes');h.flush();
  h.button('answer').onclick();const sent=h.messages.at(-1);assert.equal(sent.reportDraft.outcome,'unresolved');assert.equal(sent.reportDraft.consulted,true);
  s.current.answerVisible=true;h.send(s);assert.equal(h.field('Your outcome').value,'unresolved');
  h.button('pause').onclick();assert.equal(h.messages.at(-1).reportDraft.consulted,true);
  h.send(s);h.flush();assert.equal(h.messages.some(m=>m.type==='outcome'),false,'changing a selection or pausing never records an assessment');
  const checkpoint=h.messages.filter(m=>m.type==='report_draft').at(-1);assert.equal(checkpoint.attempt,s.current.id);assert.equal(checkpoint.report.outcome,'unresolved');
  s.current.reportDraft=checkpoint.report;const reopened=view();reopened.send(s);assert.equal(reopened.field('Your outcome').value,'unresolved');
  assert.equal(reopened.field('Did you consult the source or other help before that submission?').value,'yes');
  const next=structuredClone(s);next.current.id='attempt-2';next.current.reportDraft=null;h.send(next);assert.equal(h.field('Your outcome').value,'unassessed','draft choices belong to their attempt');
});

test('help review retains mathematical prose and attribution drafts after failure, without overwriting previous replies',()=>{
  const h=view(),s=study();s.current=attempt();h.send(s);h.button('help_paste').onclick();assert.equal(h.messages.at(-1).type,'help_paste');
  s.helpDraft={id:'response-draft-1',text:'Original \\(x^2\\).',author:'Codex companion',origin:'ai_proposal',request:'request-1',attempt:'attempt-1',original:{text:'Original \\(x^2\\).',author:'Codex companion',origin:'ai_proposal'}};h.send(s,'Review response.');
  h.field('Response').value='Edited \\(x^2\\).';h.field('Response').oninput();h.button('help_save').onclick();
  assert.equal(h.messages.at(-1).response.text,'Edited \\(x^2\\).');assert.equal(h.messages.at(-1).response.author,'Reader');assert.equal(h.messages.at(-1).response.origin,'human');assert.equal(h.messages.at(-1).helpDraft.original.text,'Original \\(x^2\\).');
  h.error('Save failed.');assert.equal(h.field('Response').value,'Edited \\(x^2\\).');assert.match(h.root.text(),/Save failed/);
  s.help=[{id:'reply-1',text:'Edited \\(x^2\\).',author:'Codex companion',origin:'ai_proposal',attempt:'attempt-1',request:'request-1',original:s.helpDraft.original},
    {id:'reply-2',text:'Another reply.',author:'Second author',origin:'human',attempt:'attempt-1',request:'request-2',original:{text:'Another reply.',author:'Second author',origin:'human'}}];
  s.helpVisible=['reply-1','reply-2'];s.helpDraft=null;h.send(s,'Help retained.');assert.equal(h.field('Response'),undefined);
  assert.match(h.root.text(),/Edited.*x\^2/);assert.match(h.root.text(),/Another reply/);assert.equal(h.root.all().filter(n=>n.dataset.response).length,2);
  s.current.finished=true;h.send(s);h.button('continue_attempt').onclick();assert.equal(h.messages.at(-1).type,'continue_attempt');
  const resumed=view();resumed.send(s);assert.match(resumed.root.text(),/Another reply/);
});

test('concealed retained help has an explicit reveal opportunity and study gaps remain visible',()=>{
  const h=view(),s=study();s.current=attempt();s.help=[{id:'reply',text:'Hidden explanation.',author:'Codex',origin:'ai_proposal'}];h.send(s,'','Recorder unavailable');
  assert.doesNotMatch(h.root.text(),/Hidden explanation/);assert.match(h.root.text(),/Recorder unavailable/);
  h.button('help_show').onclick();assert.equal(h.messages.at(-1).response,'reply');assert.equal(h.messages.at(-1).visible,true);
  s.helpVisible=['reply'];h.send(s);assert.match(h.root.text(),/Hidden explanation/);
});

test('pending help visibly locks paste and edit while preserve controls carry the exact draft identity',()=>{
  const h=view(),s=study();s.current=attempt();
  s.help=[{id:'retained-A',text:'Response A.',author:'Codex',origin:'ai_proposal'}];s.helpVisible=['retained-A'];
  s.helpDraft={id:'pending-B',attempt:s.current.id,text:'Reader correction B.',author:'Reader',origin:'human',request:null,original:{text:'Pasted B.',author:'Codex',origin:'ai_proposal'}};
  h.send(s);assert.equal(h.button('help_paste').disabled,true);assert.equal(h.button('help_edit').disabled,true);
  assert.match(h.root.text(),/Retain or discard the response draft/);
  const before=h.messages.length;h.button('help_edit').onclick();assert.equal(h.messages.length,before);
  h.button('pause').onclick();const sent=h.messages.at(-1);
  assert.equal(sent.study,s.id);assert.equal(sent.attempt,s.current.id);assert.equal(sent.helpDraftId,'pending-B');assert.equal(sent.helpDraft.text,'Reader correction B.');
});

test('question drafts keep stable identities and per-study timers retain both pending studies',()=>{
  const h=view(),a=study();h.send(a);h.button('enter_question').onclick();
  h.field('Question').value='Pending question A.';h.field('Question').oninput();const aId=h.stored().studies[a.id].form.draftId;
  const b=study();b.id='study-B';b.formEpoch='epoch-B';h.send(b);h.button('enter_question').onclick();
  h.field('Question').value='Pending question B.';h.field('Question').oninput();h.flush();
  const forms=h.messages.filter(m=>m.type==='form_draft'&&m.form);
  assert.equal(forms.find(m=>m.study===a.id).form.prompt,'Pending question A.');
  assert.equal(forms.find(m=>m.study===a.id).formDraftId,aId);assert.equal(forms.find(m=>m.study===a.id).formEpoch,a.formEpoch);
  assert.equal(forms.find(m=>m.study===b.id).form.prompt,'Pending question B.');
  assert.notEqual(forms.find(m=>m.study===b.id).formDraftId,aId);
  h.send(a);assert.equal(h.field('Question').value,'Pending question A.');
  h.button('form_cancel').onclick();assert.equal(h.messages.at(-1).formDraftId,aId);
});

test('ambiguous manual reply shows request purposes, preserves the chosen association and exposes exact adaptation offer IDs',()=>{
  const h=view(),s=study();s.current=attempt();
  s.helpRequests=[{id:'request-1',attempt:s.current.id,purpose:'Explain the equality',adaptation:'choice-1'},
    {id:'request-2',attempt:s.current.id,purpose:'Give another example',adaptation:'choice-2'}];
  s.helpDraft={id:'reply-B',attempt:s.current.id,text:'Reply to the first request.',author:'Codex',origin:'ai_proposal',request:null,original:{text:'Reply to the first request.',author:'Codex',origin:'ai_proposal'}};
  s.current.adaptation={event:'offer-exact',reason:'Fixture offer.',choices:['continue']};h.send(s);
  assert.match(h.root.text(),/Select the request this reply answers/);change(h.field('Reply to request'),'request-1');
  assert.match(h.root.text(),/Reply to: Explain the equality/);h.button('help_save').onclick();
  assert.equal(h.messages.at(-1).response.request,'request-1');assert.equal(h.messages.at(-1).helpDraft.adaptation,'choice-1');
  h.idle();h.button('adaptation').onclick();assert.equal(h.messages.at(-1).offer,'offer-exact');
});


test('legacy local question drafts adopt the restored host identity without replacing newer text',()=>{
  const s=study(),legacy={activity:'missing_step',prompt:'Newer local unsaved argument.',answer:null,hints:[],references:['mrw:fixture'],author:'Reader',origin:'human'};
  s.formDraft={...legacy,prompt:'Earlier checkpoint.',draftId:'host-restored-draft'};
  const h=view({studies:{[s.id]:{study:s.id,form:legacy}}});h.send(s);assert.equal(h.field('Question').value,'Newer local unsaved argument.');
  h.field('Question').oninput();h.flush();const m=h.messages.findLast(m=>m.type==='form_draft');assert.equal(m.form.draftId,'host-restored-draft');assert.equal(m.formDraftId,'host-restored-draft');assert.equal(m.formEpoch,s.formEpoch);
  const reopened=view(h.stored());reopened.send(s);reopened.flush();assert.equal(reopened.messages.findLast(m=>m.type==='form_draft')?.formDraftId,undefined,'restoration alone does not checkpoint or replace text');
  reopened.field('Question').oninput();reopened.flush();assert.equal(reopened.messages.findLast(m=>m.type==='form_draft').formDraftId,'host-restored-draft');
});

test('legacy local draft without a host checkpoint receives one stable identity and failed cancel restores the form',()=>{
  const s=study(),legacy={activity:'missing_step',prompt:'Unsaved local question.',answer:null,hints:[],references:['mrw:fixture'],author:'Reader',origin:'human'};
  const h=view({studies:{[s.id]:{study:s.id,form:legacy}}});h.send(s);const id=h.stored().studies[s.id].form.draftId;assert.equal(typeof id,'string');
  h.button('form_cancel').onclick();assert.equal(h.field('Question').value,'Unsaved local question.','the current DOM remains until the controller replies');
  s.formDraft={...legacy,draftId:id};h.send(s,'Question draft kept after the failed save. ENOSPC');h.error('ENOSPC');
  assert.equal(h.field('Question').value,'Unsaved local question.');assert.equal(h.stored().studies[s.id].form.draftId,id);
  h.button('question_save').onclick();assert.equal(h.messages.at(-1).formDraftId,id);assert.equal(h.messages.at(-1).question.prompt,'Unsaved local question.');
});

test('document problem exposes Attempt and direct Review together without creating a local attempt, with keyboard help',()=>{
 const h=view(),s=study(),q=question();s.questions=[q];s.document={uri:'file:///project/note.md',label:'Note · note.md'};
 s.documentContext={uri:s.document.uri,origin:{filename:'note.md',section:'Chosen section'}};s.problemRevision=q.revision;s.due=[];
 h.send(s);assert.match(h.root.text(),/Return to note.md › Chosen section/);assert.ok(h.button('choose_question'));assert.ok(h.button('solution_review'));
 assert.doesNotMatch(h.root.text(),/Exact reference answer/);assert.equal(h.button('next'),undefined);
 h.button('solution_review').onfocus();h.button('solution_review').onmouseenter();h.button('solution_review').onmouseleave();assert.match(h.root.text(),/without creating an attempt or recall grade/);
 h.button('solution_review').onclick();assert.equal(h.messages.at(-1).type,'solution_review');assert.equal(h.messages.at(-1).attempt,null);
 s.solutionReview={revision:q.revision,open:true};h.send(s);assert.match(h.root.text(),/Exact reference answer/);assert.match(h.root.text(),/Reviewing creates no attempt/);assert.equal(h.field('Your attempt'),undefined);
 h.button('handoff').onclick();assert.equal(h.messages.at(-1).purpose,'explain this step or give a hint');
});

test('missing-solution form is distinct from an attempt and preserves attribution and text across a failed save',()=>{
 const h=view(),s=study(),q=question();q.answer=null;s.questions=[q];s.problemRevision=q.revision;s.solutionReview={revision:q.revision,open:true};h.send(s);
 assert.match(h.root.text(),/No solution is attached/);h.button('solution_edit').onclick();h.field('Solution').value='Exact pasted solution λ';h.field('Solution').oninput();
 h.field('Solution author').value='Named source author';h.field('Solution author').oninput();h.button('solution_save').onclick();
 const sent=h.messages.at(-1);assert.equal(sent.answer.text,'Exact pasted solution λ');assert.equal(sent.answer.author,'Named source author');assert.equal(sent.attempt,null);
 h.error('Save rejected');assert.equal(h.field('Solution').value,'Exact pasted solution λ');assert.equal(h.field('Your attempt'),undefined);
});

test('document due offer is dismissible and general problems have separate later-work controls',()=>{
 const h=view(),s=study(),q=question();q.activity='application';s.questions=[q];s.document={uri:'file:///project/note.md',label:'Note'};s.documentContext={origin:{filename:'note.md',section:'Section'}};s.due=[q.revision];s.dueKey='offer-key';h.send(s);
 h.button('due_dismiss').onclick();assert.equal(h.messages.at(-1).key,'offer-key');h.idle();
 assert.equal(h.button('admit'),undefined);assert.equal(h.button('problem_later').textContent,'Keep problem for later');assert.ok(h.button('document_return'));
});
