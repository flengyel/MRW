'use strict';
(()=>{
  const api=acquireVsCodeApi(),root=document.getElementById('reader');let state,busy=false,form=null;
  let saved=api.getState?.()||{studies:{}},local={},notice='',formTimer;
  saved.studies ||= {};
  const el=(tag,text,parent=root)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;parent.append(n);return n;};
  const labels={definition:'Definition',hypotheses:'Hypotheses',missing_step:'Missing step',argument:'Argument reconstruction',application:'Application',unaided_success:'Unaided success',help_dependent:'Completed with help',unresolved:'Unresolved',unassessed:'Not assessed',human:'Reader',ai_proposal:'AI proposal'};
  const label=value=>labels[value]||value;
  const math=(p,t)=>window.MRWAnnotations.render(p,t,{exact:false});
  function saveLocal(){if(local.study)saved.studies[local.study]=local;api.setState?.(saved);
    if(state){clearTimeout(formTimer);const study=state.id,copy=local.form?structuredClone(local.form):null;formTimer=setTimeout(()=>api.postMessage({type:'form_draft',study,form:copy}),450);}}

  function post(type,extra={}){if(busy)return;clearTimeout(formTimer);busy=true;for(const n of root.querySelectorAll('button,input,textarea,select'))n.disabled=true;
    api.postMessage({type,study:state.id,attempt:state.current?.id,form:local.form||null,draft:local.answer,...extra});}
  function button(p,text,type,extra={}){const b=el('button',text,p);b.type='button';b.dataset.action=type;b.onclick=()=>post(type,typeof extra==='function'?extra():extra);return b;}
  function localButton(p,text,fn){const b=el('button',text,p);b.type='button';b.onclick=fn;return b;}
  function field(p,label,value,key,obj,tag='textarea'){
    const l=el('label',label,p),n=el(tag,undefined,l);n.setAttribute('aria-label',label);n.value=value||'';n.oninput=()=>{obj[key]=n.value;saveLocal();};return n;
  }
  function select(p,label,values,value,fn){const l=el('label',label,p),n=el('select',undefined,l);n.setAttribute('aria-label',label);for(const [v,t]of values){const o=el('option',t,n);o.value=v;}n.value=value;n.onchange=()=>{fn(n.value);saveLocal();};return n;}
  function edit(q){form=q?{...structuredClone(q),author:'Reader',origin:'human'}:{activity:'missing_step',prompt:'',answer:null,hints:[],references:[state.passages[0].reference],author:'Reader',origin:'human'};local.form=form;saveLocal();render();}
  function renderForm(){
    if(!form)return;const box=el('section');el('h2',form.revision?'Revise question':'Add a question',box);
    select(box,'Activity',[['definition','Definition'],['hypotheses','Hypotheses'],['missing_step','Missing step'],['argument','Argument reconstruction'],['application','Application / new example']],form.activity,v=>form.activity=v);
    field(box,'Question',form.prompt,'prompt',form);const meta=el('details',undefined,box);el('summary','Attribution, hints and sources',meta);field(meta,'Question author',form.author,'author',form,'input');
    select(meta,'Question origin',[['human','Reader'],['ai_proposal','AI proposal']],form.origin,v=>form.origin=v);
    const answer=form.answerDraft||{text:form.answer?.text||'',author:form.answer?.author||form.author,origin:form.answer?.origin||form.origin};form.answerDraft=answer;
    const answerField=field(box,'Reference answer (optional)',answer.text,'text',answer),answerAuthor=field(meta,'Answer author',answer.author,'author',answer,'input');
    const answerOrigin=select(meta,'Answer origin',[['human','Reader'],['ai_proposal','AI proposal']],answer.origin,v=>answer.origin=v);
    const answerInput=answerField.oninput;answerField.oninput=()=>{answerInput();if(form.revision){answer.author='Reader';answer.origin='human';answerAuthor.value='Reader';answerOrigin.value='human';saveLocal();}};
    const hints=form.hintsDraft||{text:form.hints.join('\n\n')};form.hintsDraft=hints;field(meta,'Hints (separate with a blank line; at most four)',hints.text,'text',hints);
    el('p','Sources',meta);const refs=[];for(const p of state.passages){const l=el('label',p.label,meta),c=el('input',undefined,l);c.type='checkbox';c.checked=form.references.includes(p.reference);c.onchange=()=>{form.references=refs.filter(([c])=>c.checked).map(([,r])=>r);saveLocal();};refs.push([c,p.reference]);}
    localButton(box,'Save question',()=>{form.answer=answer.text.trim()?answer:null;form.hints=hints.text.trim()?hints.text.split(/\n\s*\n/):[];form.references=refs.filter(([c])=>c.checked).map(([,r])=>r);
      local.form=form;saveLocal();post('question_save',{question:form,previous:form.revision});});
    localButton(box,'Cancel',()=>{form=null;local.form=null;saveLocal();api.postMessage({type:'form_cancel',study:state.id});render();});
  }
  function render(){
    root.replaceChildren();el('h1',state.title);
    const status=el('p',notice);status.setAttribute('role','status');if(state.gap){const gap=el('p',state.gap);gap.className='warning';}
    const bar=el('div');bar.className='toolbar';button(bar,'Pause / save','pause');button(bar,'Add prerequisites…','prerequisites');button(bar,'Inspect history','history');button(bar,'Export history…','export');
    const a=state.current;
    const source=el('details');el('summary','Selected source context ('+state.passages.length+')',source);source.open=!!a?.sourceVisible;
    source.ontoggle=()=>{if(a&&source.open!==!!a.sourceVisible)post('source_visibility',{visible:source.open});};
    for(const p of state.passages){el('h2',p.label,source);el('p',p.reference,source);el('pre',p.text,source);button(source,'Open retained passage','source',{reference:p.reference});}
    if(a){
      el('h2','Current question');math(root,a.question.prompt);el('p',label(a.question.activity)+' · '+label(a.question.origin)+' · '+a.question.author);
      if(local.attempt!==a.id){local.attempt=a.id;local.answer=a.draft;local.paper=a.paper;saveLocal();}
      if(!a.finished){
        const input=field(root,'Your attempt',local.answer,'answer',local);input.dataset.draft='answer';
        input.oninput=()=>{local.answer=input.value;saveLocal();api.postMessage({type:'draft',study:state.id,attempt:a.id,text:local.answer,paper:local.paper});};
        const l=el('label','Worked on paper'),c=el('input',undefined,l);c.type='checkbox';c.checked=!!local.paper;c.onchange=()=>{local.paper=c.checked;saveLocal();api.postMessage({type:'draft',study:state.id,attempt:a.id,text:local.answer,paper:local.paper});};
        button(root,a.submissions.length?'Submit another snapshot':'Submit answer','submit',()=>({text:local.answer,paper:local.paper}));button(root,'Skip','skip');
      }else {el('p','Outcome: '+label(a.outcome?.outcome||'Skipped')+' · draft saved');const work=el('details');el('summary','Saved work',work);el('pre',a.draft||'(paper work; no typed answer)',work);}
      const help=el('div');help.className='toolbar';
      a.question.hints.forEach((hint,index)=>{if(a.hints.includes(index))math(root,'Hint '+(index+1)+': '+hint);else button(help,'Hint '+(index+1),'hint',{index});});
      if(a.question.answer){if(a.answerVisible){el('h3','Reference answer');el('p',label(a.question.answer.origin)+' · '+a.question.answer.author);math(root,a.question.answer.text);}else button(help,'Reveal reference answer','answer');}
      else el('p','Reference answer unavailable.');
      button(help,'Ask Codex for help','handoff',{purpose:'explain this step or give a hint'});
      if(a.submissions.length){
        const previous=a.submissions.at(-1);el('p','Submission '+a.submissions.length+' · '+previous.hints+' hints · reference answer '+(previous.answer_visible?'visible':'concealed')+' at submission.');
        const report={outcome:a.outcome?.outcome||'unassessed',assessor:'reader',consulted:a.outcome?.consulted??null,correction:!!a.finished};
        select(root,'Your outcome',[['unassessed','Not assessed'],['unaided_success','Unaided success'],['help_dependent','Completed with help'],['unresolved','Unresolved']],report.outcome,v=>report.outcome=v);
        select(root,'Did you consult the source before that submission?',[['unknown','Not reported'],['no','No'],['yes','Yes']],report.consulted===null?'unknown':report.consulted?'yes':'no',v=>report.consulted=v==='unknown'?null:v==='yes');
        button(root,a.finished?'Correct outcome':'Record outcome','outcome',()=>({report}));
      }
      if(a.finished){button(root,'Next question','next');button(root,'Start another block','continue_block');button(root,'Report effort','effort_offer');}
      if(a.effortOffer?.disposition==='no_response'){
        el('h3','How much mental effort did that last attempt require?');el('p','Attempt '+a.id.slice(0,8)+' · 1 very low, 9 very high');
        for(let rating=1;rating<=9;rating++)button(root,String(rating),'effort_response',{rating});button(root,'Decline','effort_response',{rating:null});
      }else if(a.effortOffer)el('p',a.effortOffer.rating?'Reported effort: '+a.effortOffer.rating+'/9':'Effort rating declined.');
      if(a.adaptation){el('p',a.adaptation.reason);for(const choice of a.adaptation.choices)button(root,choice.replaceAll('_',' '),'adaptation',{choice});}
    }else{el('p','Add a source-linked question or ask Codex to propose a few.');button(root,'Begin short block','next');}
    const qbox=el('details');el('summary','Questions ('+state.questions.filter(q=>!q.retired).length+')',qbox);qbox.open=!a;
    const tools=el('div',undefined,qbox);localButton(tools,'Add question',()=>edit());button(tools,'Copy question handoff for Codex','handoff',{purpose:'questions'});button(tools,'Import questions from clipboard','import_questions');
    for(const q of state.questions.filter(q=>!q.retired)){
      const row=el('section',undefined,qbox);math(row,q.prompt);el('p',label(q.activity)+' · '+(q.kept?'Kept for review':'Available; outside continuing review')+(q.card?' · due '+new Date(q.card.due).toLocaleString():''),row);
      button(row,'Attempt','choose_question',{revision:q.revision});localButton(row,'Edit',()=>edit(q));button(row,q.kept?'Retire':'Keep for review',q.kept?'retire':'admit',{revision:q.revision});
    }
    renderForm();
    const unresolved=el('details');el('summary','Unresolved question',unresolved);const value={text:local.unresolved??state.unresolved};const input=field(unresolved,'Save for later',value.text,'text',value);
    input.oninput=()=>{value.text=input.value;local.unresolved=value.text;saveLocal();};button(unresolved,'Save question','unresolved',()=>({text:value.text}));
  }
  window.addEventListener('message',event=>{
    if(event.origin!==window.origin)return;const m=event.data;
    if(m?.type==='active_study'){
      if(state?.id!==m.study.id){local=saved.studies[m.study.id]||{study:m.study.id};form=local.form||m.study.formDraft||null;if(form)local.form=form;}
      state=m.study;notice=m.notice||'';busy=false;
      if(notice.startsWith('Question saved.')||notice.startsWith('Questions imported.')||notice==='Question unchanged.'){form=null;local.form=null;saved.studies[state.id]=local;api.setState?.(saved);}
      render();
    }else if(m?.type==='study_idle'){busy=false;for(const n of root.querySelectorAll('button,input,textarea,select'))n.disabled=false;}else if(m?.type==='study_error'){busy=false;notice=m.message;if(state)render();else root.textContent=m.message;}
  });
  api.postMessage({type:'ready'});
})();
