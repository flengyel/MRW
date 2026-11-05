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
  const globals={document,structuredClone,setTimeout:fn=>{const id=nextTimer++;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),
    acquireVsCodeApi:()=>({getState:()=>stored,setState:s=>{stored=structuredClone(s);},postMessage:m=>messages.push(structuredClone(m))}),
    addEventListener:(_,fn)=>receive=fn,MRWAnnotations:{render:(p,t)=>{const n=new Node('div');n.textContent=t;p.append(n);}}};
  globals.window=globals;globals.origin='vscode-webview://fixture';
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/activeStudyView.js'),'utf8'),globals);
  return{root,messages,send:(study,notice='',gap='')=>receive({origin:globals.origin,data:{type:'active_study',study:structuredClone(study),notice,gap}}),
    error:message=>receive({origin:globals.origin,data:{type:'study_error',message}}),idle:()=>receive({origin:globals.origin,data:{type:'study_idle'}}),
    button:action=>root.all().find(n=>n.dataset.action===action),field:text=>root.all().find(n=>n['aria-label']===text),
    flush:()=>{const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());},stored:()=>stored};
}
function study(){return{id:'study-fixture',title:'Fixture passage',passages:[{reference:'mrw:fixture',source_revision:'revision',label:'Exact fixture source',text:'Original mathematical source.'}],questions:[],current:null,unresolved:'',help:[],helpVisible:[]};}
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
  s.helpDraft={text:'Original \\(x^2\\).',author:'Codex companion',origin:'ai_proposal',request:'request-1',attempt:'attempt-1',original:{text:'Original \\(x^2\\).',author:'Codex companion',origin:'ai_proposal'}};h.send(s,'Review response.');
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
