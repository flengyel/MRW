'use strict';
(()=>{
  const api=acquireVsCodeApi(),root=document.getElementById('reader');
  let state,busy=false,form=null,local={},notice='';
  const formTimers=new Map();
  const saved=api.getState?.()||{studies:{}};saved.studies ||= {};
  const el=(tag,text,parent=root)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;parent.append(n);return n;};
  const labels={definition:'Definition',hypotheses:'Hypotheses',missing_step:'Missing step',argument:'Argument reconstruction',application:'Application',unaided_success:'Unaided success',help_dependent:'Completed with help',unresolved:'Unresolved',unassessed:'Not assessed',human:'Reader',ai_proposal:'AI proposal'};
  const label=value=>labels[value]||value;
  const math=(p,t)=>window.MRWAnnotations.render(p,t,{exact:false,inlineDollars:true});
  const copy=value=>value===undefined?undefined:structuredClone(value);
  function reportDraft(){return state?.current?local.reports?.[state.current.id]||state.current.reportDraft||null:null;}
  function identities(){
    return {study:state.id,attempt:state.current?.id||null,formEpoch:state.formEpoch,
      formDraftId:local.form?.draftId||null,helpDraftId:local.helpDraft?.id||null};
  }
  function saveLocal(){
    if(local.study)saved.studies[local.study]=local;api.setState?.(saved);
    if(!state)return;
    const scope=identities(),questionForm=copy(local.form||null),report=copy(reportDraft()),response=copy(local.helpDraft||null);
    clearTimeout(formTimers.get(scope.study));
    formTimers.set(scope.study,setTimeout(()=>{
      formTimers.delete(scope.study);
      api.postMessage({type:'form_draft',...scope,form:questionForm});
      if(scope.attempt&&report)api.postMessage({type:'report_draft',...scope,report});
      if(response)api.postMessage({type:'help_draft',...scope,attempt:response.attempt??null,response});
    },450));
  }
  function disableBusy(){for(const n of root.querySelectorAll('button,input,textarea,select'))n.disabled=busy||n.dataset.locked==='true';}
  function post(type,extra={}){
    if(busy)return;clearTimeout(formTimers.get(state.id));formTimers.delete(state.id);busy=true;disableBusy();
    api.postMessage({type,...identities(),form:local.form||null,draft:local.answer,
      reportDraft:reportDraft(),helpDraft:local.helpDraft||null,unresolvedDraft:local.unresolved??state.unresolved,...extra});
  }
  const controlHelp={
    document_return:'Save work and return to the exact originating Markdown occurrence. Changed or missing locations are reported.',
    document_open:'Open the associated Markdown file without claiming that the old occurrence still exists.',
    solution_review:'Display the attributed solution without creating an attempt or recall grade. Consultation during an attempt is retained.',
    choose_question:'Begin work on this problem. Prior solution viewing remains in history; this attempt starts with its solution concealed.',
    admit:'Explicitly keep an eligible recall question for spaced review. Merely reading or saving a problem does not admit it.',
  };
  let focusedControl,hoveredControl;
  function showControlHelp(){const text=(focusedControl||hoveredControl)?.title||'';const help=Array.from(root.querySelectorAll('p')).find(n=>n.dataset.help==='control');if(help){help.textContent=text;help.hidden=!text;}}
  function button(p,text,type,extra={},locked=false){
    const b=el('button',text,p);b.type='button';b.dataset.action=type;b.dataset.locked=String(locked);b.disabled=busy||locked;
    b.title=controlHelp[type]||text; b.setAttribute('aria-description',b.title); b.onfocus=()=>{focusedControl=b;showControlHelp();};b.onblur=()=>{if(focusedControl===b)focusedControl=null;showControlHelp();};b.onmouseenter=()=>{hoveredControl=b;showControlHelp();};b.onmouseleave=()=>{if(hoveredControl===b)hoveredControl=null;showControlHelp();}; b.onclick=()=>{if(!locked)post(type,typeof extra==='function'?extra():extra);};return b;
  }
  function localButton(p,text,fn,key,locked=false){
    const b=el('button',text,p);b.type='button';if(key)b.dataset.action=key;b.dataset.locked=String(locked);b.disabled=busy||locked;b.onclick=()=>{if(!busy&&!locked)fn();};return b;
  }
  function field(p,text,value,key,obj,tag='textarea',scope=''){
    const l=el('label',text,p),n=el(tag,undefined,l);n.setAttribute('aria-label',text);n.dataset.field=scope+text;n.value=value||'';
    n.oninput=()=>{obj[key]=n.value;saveLocal();};return n;
  }
  function select(p,text,values,value,fn,scope=''){
    const l=el('label',text,p),n=el('select',undefined,l);n.setAttribute('aria-label',text);n.dataset.field=scope+text;
    for(const [v,t]of values){const o=el('option',t,n);o.value=v;}n.value=value;n.onchange=()=>{fn(n.value);saveLocal();};return n;
  }
  function details(parent,text,key,open=false){
    const d=el('details',undefined,parent);el('summary',text,d);d.open=local.disclosures?.[key]??open;
    d.ontoggle=()=>{local.disclosures ||= {};local.disclosures[key]=d.open;saveLocal();};return d;
  }
  function edit(q){
    if(local.form){notice='Save or cancel the question draft before editing another question.';render();return;}
    form=q?{...copy(q),author:'Reader',origin:'human'}:{activity:'missing_step',prompt:'',answer:null,hints:[],references:[state.passages[0].reference],author:'Reader',origin:'human'};
    form.draftId=crypto.randomUUID();local.form=form;saveLocal();render();
    Array.from(root.querySelectorAll('textarea')).find(n=>n.dataset.field==='Question')?.focus?.();
  }
  function editSolution(q){
    if(local.form){notice='Save or cancel the pending form first.';render();return;}
    form={kind:'solution',draftId:crypto.randomUUID(),revision:q.revision,
      answerDraft:{text:q.answer?.text||'',author:q.answer?'Reader':'',origin:'human'}};
    local.form=form;saveLocal();render();
    Array.from(root.querySelectorAll('textarea')).find(n=>n.dataset.field==='Solution')?.focus?.();
  }
  function renderForm(){
    if(form?.kind==='solution'){
      const box=el('section');box.className='region';el('h2','Attach or correct solution',box);
      const answer=form.answerDraft;
      field(box,'Solution',answer.text,'text',answer);
      field(box,'Solution author',answer.author,'author',answer,'input');
      select(box,'Solution origin',[['human','Reader / cited author'],['ai_proposal','AI proposal']],answer.origin,v=>answer.origin=v);
      el('p','Earlier statement and solution revisions remain saved. Attribution does not establish correctness.',box);
      button(box,'Save solution','solution_save',()=>({previous:form.revision,answer}));
      localButton(box,'Cancel solution edit',()=>{const formDraftId=form.draftId;form=null;local.form=null;saveLocal();post('form_cancel',{formDraftId});},'form_cancel');return;
    }
    if(!form||(state.current&&!state.current.finished))return;
    const box=el('section');box.className='region';el('h2',form.revision?'Revise question':'Enter a question',box);
    select(box,'Activity',[['definition','Definition'],['hypotheses','Hypotheses'],['missing_step','Missing step'],['argument','Argument reconstruction'],['application','Application / new example']],form.activity,v=>form.activity=v);
    field(box,'Question',form.prompt,'prompt',form);
    const meta=details(box,'Attribution, hints and sources','question-metadata');field(meta,'Question author',form.author,'author',form,'input');
    select(meta,'Question origin',[['human','Reader'],['ai_proposal','AI proposal']],form.origin,v=>form.origin=v);
    const answer=form.answerDraft||{text:form.answer?.text||'',author:form.answer?.author||form.author,origin:form.answer?.origin||form.origin};form.answerDraft=answer;
    const answerField=field(box,'Reference answer (optional)',answer.text,'text',answer),answerAuthor=field(meta,'Answer author',answer.author,'author',answer,'input');
    const answerOrigin=select(meta,'Answer origin',[['human','Reader'],['ai_proposal','AI proposal']],answer.origin,v=>answer.origin=v);
    const answerInput=answerField.oninput;answerField.oninput=()=>{answerInput();if(form.revision){answer.author='Reader';answer.origin='human';answerAuthor.value='Reader';answerOrigin.value='human';saveLocal();}};
    const hints=form.hintsDraft||{text:(form.hints||[]).join('\n\n')};form.hintsDraft=hints;field(meta,'Hints (separate with a blank line; at most four)',hints.text,'text',hints);
    el('p','Sources',meta);const refs=[];
    for(const p of state.passages){const l=el('label',p.label,meta),c=el('input',undefined,l);c.type='checkbox';c.setAttribute('aria-label',p.label);c.checked=form.references.includes(p.reference);
      c.onchange=()=>{form.references=refs.filter(([c])=>c.checked).map(([,r])=>r);saveLocal();};refs.push([c,p.reference]);}
    localButton(box,'Save question',()=>{
      form.answer=answer.text.trim()?answer:null;form.hints=hints.text.trim()?hints.text.split(/\n\s*\n/):[];form.references=refs.filter(([c])=>c.checked).map(([,r])=>r);
      local.form=form;saveLocal();post('question_save',{question:form,previous:form.revision});
    },'question_save');
    localButton(box,'Cancel',()=>{const formDraftId=form.draftId;form=null;local.form=null;saveLocal();post('form_cancel',{formDraftId});},'form_cancel');
  }
  function renderSource(a){
    const source=el('details');source.dataset.source='context';el('summary',(a&&!a.sourceVisible?'Reveal source context':'Selected source context')+' ('+state.passages.length+')',source);
    source.open=a?!!a.sourceVisible:state.document?!!state.contextVisible:true;
    source.ontoggle=()=>{if(a&&source.open!==!!a.sourceVisible)post('source_visibility',{visible:source.open});else if(!a&&state.document&&source.open!==!!state.contextVisible)post('context_visibility',{visible:source.open});};
    // Concealed source text is not inserted until an explicit reveal succeeds.
    if(!source.open)return;
    for(const p of state.passages){
      el('h2',p.label,source);math(source,p.text);button(source,p.kind==='document_context'?'Return to document location':'Open retained passage','source',{reference:p.reference});
      const meta=details(source,'Source reference','source:'+p.reference);el('pre',p.reference,meta);el('p','Revision: '+p.source_revision,meta);
      if(p.authors)el('p','Author: '+p.authors,meta);
    }
  }
  function renderReport(a){
    if(!a.submissions.length)return;
    const previous=a.submissions.at(-1);
    el('p','Submission '+a.submissions.length+' · '+previous.hints+' hints · reference answer '+(previous.answer_visible?'visible':'concealed')+' at submission.');
    local.reports ||= {};local.reportVersions ||= {};
    const revision=JSON.stringify(a.outcome||null);
    if(!local.reports[a.id]||local.reportVersions[a.id]!==revision){
      local.reports[a.id]=copy(a.reportDraft)||{outcome:a.outcome?.outcome||'unassessed',assessor:'reader',consulted:a.outcome?.consulted??null,correction:!!a.finished};
      local.reportVersions[a.id]=revision;
    }
    const report=local.reports[a.id],box=el('section');box.dataset.reportFor=a.id;
    select(box,'Your outcome',[['unassessed','Not assessed'],['unaided_success','Unaided success'],['help_dependent','Completed with help'],['unresolved','Unresolved']],report.outcome,v=>report.outcome=v,a.id+':');
    select(box,'Did you consult the source or other help before that submission?',[['unknown','Not reported'],['no','No'],['yes','Yes']],report.consulted===null?'unknown':report.consulted?'yes':'no',v=>report.consulted=v==='unknown'?null:v==='yes',a.id+':');
    button(box,a.finished?'Correct outcome':'Record outcome','outcome',()=>({report:{...report,correction:!!a.finished}}));
  }
  function renderHelpAssociation(parent,draft){
    const available=(state.helpRequests||[]).filter(r=>r.attempt===(draft.attempt??null));
    const selected=available.find(r=>r.id===draft.request);
    const display=r=>r.purpose+' · '+r.id.slice(0,8);
    const current=el('p',selected?'Reply to: '+display(selected):draft.request?'Associated request unavailable: '+draft.request:'No associated request',parent);
    if(!available.length&&!draft.request)return;
    // Keep the one-request path compact; ambiguous replies require an explicit choice.
    const container=available.length>1?parent:details(parent,'Change request association','help-request-association');
    const values=[['','No associated request'],...available.map(r=>[r.id,display(r)])];
    if(draft.request&&!selected)values.push([draft.request,'Unavailable request · '+draft.request]);
    select(container,available.length>1?'Reply to request':'Request association',values,draft.request||'',value=>{
      const request=available.find(r=>r.id===value);
      draft.request=request?.id||null;draft.adaptation=request?.adaptation||null;
      draft.association={method:request?'manual':'unassociated',author:'Reader',origin:'human'};
      current.textContent=request?'Reply to: '+display(request):'No associated request';
    },'help:');
    if(available.length>1&&!selected)el('p','Select the request this reply answers, or retain it without an association.',parent);
  }
  function renderHelp(a){
    const box=el('section');box.className='region';box.dataset.help='companion';el('h2','Help',box);
    const controls=el('div',undefined,box);controls.className='toolbar';
    if(a||state.problemRevision)button(controls,'Copy help request for Codex','handoff',{purpose:'explain this step or give a hint'});
    const pending=!!local.helpDraft;
    button(controls,'Paste companion response…','help_paste',{},pending);
    if(pending)el('p','Retain or discard the response draft before opening another response.',box);
    const responses=state.help||[],visible=new Set(state.helpVisible||[]);
    for(const [index,response]of responses.entries()){
      const row=el('section',undefined,box);row.dataset.response=response.id;
      el('h3','Response '+(index+1)+(response.previous?' · revised':'')+(response.at?' · '+new Date(response.at).toLocaleString():''),row);
      if(visible.has(response.id)){
        el('p',label(response.origin)+' · '+response.author,row);math(row,response.text);
        button(row,'Hide response','help_show',{response:response.id,visible:false});
        button(row,'Edit response','help_edit',{response:response.id},pending);
        if(a?.finished)button(row,'Continue with revised work','continue_attempt',{response:response.id});
        const meta=details(row,'Original response and attribution','help:'+response.id);
        el('p','Manually pasted; origin and mathematical correctness are not authenticated.',meta);
        if(response.original){el('p','Pasted original · '+label(response.original.origin)+' · '+response.original.author,meta);el('pre',response.original.text,meta);}
        if(response.attempt)el('p','Attempt: '+response.attempt,meta);
        const request=(state.helpRequests||[]).find(r=>r.id===response.request);
        el('p',request?'Request: '+request.purpose+' · '+request.id:response.request?'Request: '+response.request:'No associated request',meta);
        if(response.association)el('p','Association: '+label(response.association.origin)+' · '+response.association.author,meta);
        if(response.previous)el('p','Revises response: '+response.previous,meta);
      }else button(row,'Reveal response '+(index+1),'help_show',{response:response.id,visible:true});
    }
    const draft=local.helpDraft;
    if(draft){
      const formBox=el('section',undefined,box);formBox.className='note';el('h3',draft.previous?'Revise retained response':'Review pasted response',formBox);
      renderHelpAssociation(formBox,draft);
      const responseField=field(formBox,'Response',draft.text,'text',draft,'textarea','help:');
      const provenance=el('p',label(draft.origin)+' · '+draft.author,formBox);
      const meta=details(formBox,'Response attribution','help-draft-attribution');
      const author=field(meta,'Response author',draft.author,'author',draft,'input');
      const origin=select(meta,'Response origin',[['ai_proposal','AI proposal'],['human','Reader']],draft.origin,v=>{draft.origin=v;provenance.textContent=label(draft.origin)+' · '+draft.author;});
      const authorInput=author.oninput;author.oninput=()=>{authorInput();provenance.textContent=label(draft.origin)+' · '+draft.author;};
      responseField.oninput=()=>{draft.text=responseField.value;draft.author='Reader';draft.origin='human';author.value='Reader';origin.value='human';provenance.textContent='Reader · Reader';saveLocal();};
      const preview=details(formBox,'Preview response','help-draft-preview');math(preview,draft.text);
      button(formBox,'Retain response','help_save',()=>({response:{text:draft.text,author:draft.author,origin:draft.origin,request:draft.request??null},previous:draft.previous}));
      button(formBox,'Discard response draft','help_cancel');
    }
  }
  function renderSavedDocument(){
    if(state.current&&local.attempt!==state.current.id){local.attempt=state.current.id;local.answer=state.current.draft;local.paper=state.current.paper;}
    el('p','Document problem forms have been removed. Earlier saved work remains available here.');
    const bar=el('div');bar.className='toolbar';
    const origin=state.returnOrigin||state.documentContext?.origin;
    if(origin){button(bar,'← Return to '+origin.filename+' › '+origin.section,'document_return');button(bar,'Open document without exact location','document_open');}
    button(bar,'Save pending work','pause');button(bar,'Inspect history','history');button(bar,'Export history…','export');
    if(origin?.invalid||state.returnError)el('p',state.returnError||'The original location changed. Open the document to navigate manually.');
    if(state.missingProblems?.length)el('p','An associated saved record is unavailable. Its reference is preserved.');
    const prose=(parent,title,value)=>{if(value?.text){el('h3',title,parent);el('p',value.author+' · '+label(value.origin),parent);math(parent,value.text);}};
    const refs=(parent,values)=>{for(const ref of values||[])el('pre',ref,parent);};
    const bank=details(root,'Saved statements and solutions ('+state.questions.length+')','saved-questions',true);
    for(const q of state.questions){
      const row=el('section',undefined,bank);math(row,q.prompt);el('p',q.author+' · '+label(q.origin)+(q.retired?' · Earlier revision':''),row);
      prose(row,'Solution',q.answer);prose(row,'Original solution',q.originalAnswer);refs(row,q.references);
    }
    const attempts=[...(state.attempts||[])];
    if(state.current&&!attempts.some(a=>a.id===state.current.id))attempts.push(state.current);
    for(const a of attempts){
      const box=details(root,'Saved work · '+a.question.prompt,'saved-attempt:'+a.id,true);
      const draft=local.attempt===a.id?local.answer??a.draft:a.draft;el('pre',draft||'(No typed work)',box);
      if(a.paper)el('p','Work on paper was recorded.',box);
      if(a.outcome)el('p','Recorded outcome: '+label(a.outcome.outcome),box);
      const report=local.reports?.[a.id]||a.reportDraft;
      if(report)el('p','Pending report: '+label(report.outcome)+' · consultation: '+String(report.consulted),box);
      for(const submitted of a.submissions||[])el('p','Submitted snapshot: '+submitted.snapshot+' · '+submitted.at,box);
    }
    const draft=local.form||state.formDraft;
    if(draft){
      const box=details(root,'Pending draft','saved-form',true);
      if(draft.prompt)el('pre',draft.prompt,box);
      if(draft.author)el('p',draft.author+' · '+label(draft.origin),box);
      prose(box,'Solution draft',draft.answerDraft||draft.answer);
      if(draft.hintsDraft?.text)el('pre',draft.hintsDraft.text,box);
      else for(const hint of draft.hints||[])el('pre',hint,box);
      refs(box,draft.references);
    }
    const responses=[...(state.help||[])];
    for(const draft of [state.helpDraft,local.helpDraft])if(draft&&!responses.some(r=>r.id===draft.id&&r.text===draft.text))responses.push(draft);
    for(const response of responses){
      const box=details(root,[state.helpDraft?.id,local.helpDraft?.id].includes(response.id)?'Pending companion response':'Saved companion response','saved-help:'+response.id,true);
      prose(box,'Response',response);prose(box,'Original response',response.original);
    }
    const unresolved=local.unresolved??state.unresolved;
    if(unresolved){const box=details(root,'Unresolved question','saved-unresolved',true);el('pre',unresolved,box);}
    const sources=details(root,'Saved document context','saved-context');
    for(const p of state.passages){el('h3',p.label,sources);el('pre',p.text,sources);refs(sources,[p.reference]);}
    disableBusy();
  }
  function renderSolution(questions,a){
    const q=questions.find(q=>q.revision===state.problemRevision)||(!a&&questions.length===1?questions[0]:null);
    if(!q)return;
    const box=el('section');box.className='region';box.dataset.problem=q.revision;
    if(!a||a.question.revision!==q.revision){el('h2','Problem',box);math(box,q.prompt);}
    el('p','Statement: '+q.author+' · '+label(q.origin),box);
    const actions=el('div',undefined,box);actions.className='toolbar';
    button(actions,'Attempt','choose_question',{revision:q.revision},!!a&&!a.finished);
    button(actions,'Review solution','solution_review',{revision:q.revision});
    if(state.solutionReview?.open&&state.solutionReview.revision===q.revision){
      el('h2','Solution',box);
      if(q.answer){
        el('p',q.answer.author+' · '+label(q.answer.origin)+' · Correctness not established',box);math(box,q.answer.text);
        localButton(box,'Correct solution',()=>editSolution(q),'solution_edit',!!local.form);
        if(q.originalAnswer){const original=details(box,'Original solution and attribution','solution-original:'+q.revision);el('p',q.originalAnswer.author+' · '+label(q.originalAnswer.origin),original);math(original,q.originalAnswer.text);}
      }else{el('p','No solution is attached.',box);localButton(box,'Attach solution',()=>editSolution(q),'solution_edit',!!local.form);}
      button(box,'Close solution review','solution_hide');
      if(a&&!a.finished)el('p','Solution consultation is recorded separately. Subsequent submissions retain this exposure; earlier submitted snapshots stay unchanged.',box);
      else el('p','Reviewing creates no attempt, outcome or recall grade.',box);
      renderHelp(null);
    }
  }
  function render(){
    const focus=document.activeElement,focusKey=focus?.dataset?.field,selection=focusKey?[focus.selectionStart,focus.selectionEnd]:null;
    focusedControl=null;hoveredControl=null;root.replaceChildren();el('h1',state.title);
    const status=el('p',notice);status.setAttribute('role','status');if(state.gap){const gap=el('p',state.gap);gap.className='warning';}
    if(state.document){renderSavedDocument();return;}
    const bar=el('div');bar.className='toolbar';button(bar,'Pause / save','pause');
    const options=details(bar,'Study actions','study-actions');button(options,'Add prerequisites…','prerequisites');button(options,'Inspect history','history');button(options,'Export history…','export');
    const a=state.current,questions=state.questions.filter(q=>!q.retired);
    renderSolution(questions,a);
    if(a){
      el('h2',a.finished?'Completed question':'Current question');math(root,a.question.prompt);el('p',label(a.question.activity));
      const attribution=details(root,'Question attribution','current-question-attribution');el('p',label(a.question.origin)+' · '+a.question.author,attribution);
      if(local.attempt!==a.id){local.attempt=a.id;local.answer=a.draft;local.paper=a.paper;saveLocal();}
      if(!a.finished){
        el('p','Attempt in progress. Source and reference answer stay concealed until you reveal them.');
        const input=field(root,'Your attempt',local.answer,'answer',local);input.dataset.draft='answer';
        input.oninput=()=>{local.answer=input.value;saveLocal();api.postMessage({type:'draft',...identities(),text:local.answer,paper:local.paper});};
        const l=el('label','Worked on paper'),c=el('input',undefined,l);c.type='checkbox';c.setAttribute('aria-label','Worked on paper');c.checked=!!local.paper;
        c.onchange=()=>{local.paper=c.checked;saveLocal();api.postMessage({type:'draft',...identities(),text:local.answer,paper:local.paper});};
        const actions=el('div');actions.className='toolbar';button(actions,a.submissions.length?'Submit revised work':'Submit answer','submit',()=>({text:local.answer,paper:local.paper}));button(actions,'Skip question','skip');
      }else{
        el('p','Outcome: '+label(a.outcome?.outcome||'Skipped')+' · work saved');
        const work=details(root,'Saved work','work:'+a.id);el('pre',a.draft||'(paper work; no typed answer)',work);
        button(root,'Continue with revised work','continue_attempt');
      }
      renderReport(a);
      const help=el('div');help.className='toolbar';
      a.question.hints.forEach((hint,index)=>{if(a.hints.includes(index))math(root,'Hint '+(index+1)+': '+hint);else button(help,'Hint '+(index+1),'hint',{index});});
      if(a.question.answer&&(!state.document||a.answerVisible)){if(a.answerVisible){el('h3','Reference answer');el('p',label(a.question.answer.origin)+' · '+a.question.answer.author);math(root,a.question.answer.text);}else button(help,'Reveal reference answer','answer');}
      renderSource(a);renderHelp(a);
      if(a.finished){
        const actions=el('div');actions.className='toolbar';button(actions,'Next question','next');button(actions,'Start another block','continue_block');button(actions,'Report effort','effort_offer');
      }
      if(a.effortOffer?.disposition==='no_response'){
        el('h3','How much mental effort did that last attempt require?');el('p','Attempt '+a.id.slice(0,8)+' · 1 very low, 9 very high');
        for(let rating=1;rating<=9;rating++)button(root,String(rating),'effort_response',{rating,offer:a.effortOffer.id});button(root,'Decline','effort_response',{rating:null,offer:a.effortOffer.id});
      }else if(a.effortOffer)el('p',a.effortOffer.rating?'Reported effort: '+a.effortOffer.rating+'/9':'Effort rating declined.');
      if(a.adaptation){el('p',a.adaptation.reason);for(const choice of a.adaptation.choices)button(root,choice.replaceAll('_',' '),'adaptation',{choice,offer:a.adaptation.event});}
    }else{
      renderSource(null);
      if(questions.length&&!state.document)button(root,'Begin short block','next');
      else if(!state.document){
        el('h2','Study this passage');const actions=el('div');actions.className='toolbar';
        localButton(actions,'Enter a question',()=>edit(),'enter_question',!!local.form);button(actions,'Request questions from Codex','handoff',{purpose:'questions'});
        button(actions,'Import questions from clipboard','import_questions');
      }
      if(local.helpDraft||(state.help||[]).length)renderHelp(null);
    }
    renderForm();
    const qbox=details(root,('Questions')+' ('+questions.length+')','question-bank',!!state.document);
    const tools=el('div',undefined,qbox);tools.className='toolbar';localButton(tools,'Enter a question',()=>edit(),'enter_question',!!local.form||!!a&&!a.finished);
    button(tools,'Request questions from Codex','handoff',{purpose:'questions'});button(tools,'Import questions from clipboard','import_questions');
    for(const q of questions){
      const row=el('section',undefined,qbox);math(row,q.prompt);el('p',label(q.activity)+' · '+(q.kept?'Kept for review':'Available; outside continuing review')+(q.card?' · due '+new Date(q.card.due).toLocaleString():''),row);
      button(row,'Attempt','choose_question',{revision:q.revision},!!a&&!a.finished);button(row,'Review solution','solution_review',{revision:q.revision});localButton(row,'Edit',()=>edit(q),'question_edit',!!local.form||!!a&&!a.finished);
      if(q.activity!=='application'||q.kept)button(row,q.kept?'Retire':'Keep for spaced review',q.kept?'retire':'admit',{revision:q.revision});
    }
    const unresolved=details(root,'Unresolved question','unresolved',!!state.document);
    if(state.unresolvedProblem)el('p','Saved question relates to: '+(state.questions.find(q=>q.revision===state.unresolvedProblem)?.prompt||state.unresolvedProblem),unresolved);const value={text:local.unresolved??state.unresolved};
    const input=field(unresolved,'Save for later',value.text,'text',value);input.oninput=()=>{value.text=input.value;local.unresolved=value.text;saveLocal();};
    button(unresolved,'Save question','unresolved',()=>({text:value.text}));
    const helpText=el('p','');helpText.dataset.help='control';helpText.className='control-help';helpText.hidden=true;helpText.setAttribute('role','status');
    disableBusy();
    if(focusKey){const target=Array.from(root.querySelectorAll('input,textarea,select')).find(n=>n.dataset.field===focusKey);target?.focus?.();if(selection?.every(Number.isInteger))target?.setSelectionRange?.(...selection);}
  }
  function restoreForm(study,changed){
    if(changed)local=saved.studies[study.id]||{study:study.id};
    // Preserve newer local text while adopting the host's identity for a legacy draft.
    form=local.form||copy(study.formDraft)||null;
    if(form&&!form.draftId)form.draftId=study.formDraft?.draftId||crypto.randomUUID();
    local.form=form;local.formEpoch=study.formEpoch;
  }
  window.addEventListener('message',event=>{
    if(event.origin!==window.origin)return;const m=event.data;
    if(m?.type==='active_study'){
      const changed=state?.id!==m.study.id;
      restoreForm(m.study,changed);
      if(m.study.document){if(!local.helpDraft)local.helpDraft=copy(m.study.helpDraft||null);}
      else if(changed){if(m.study.helpDraft||!local.helpDraft)local.helpDraft=copy(m.study.helpDraft||null);}
      else if(JSON.stringify(state?.helpDraft||null)!==JSON.stringify(m.study.helpDraft||null))local.helpDraft=copy(m.study.helpDraft||null);
      state={...m.study,gap:m.gap};notice=m.notice||'';busy=false;
      if(notice.startsWith('Question saved.')||notice.startsWith('Questions imported.')||notice==='Question unchanged.'||notice.startsWith('Solution saved.')){form=null;local.form=null;}
      if(notice==='Help retained.'||notice==='Help draft discarded.')local.helpDraft=null;
      if(notice==='Outcome recorded.'&&state.current){delete local.reports?.[state.current.id];delete local.reportVersions?.[state.current.id];}
      saved.studies[state.id]=local;api.setState?.(saved);render();
    }else if(m?.type==='study_idle'){busy=false;disableBusy();}
    else if(m?.type==='study_error'){busy=false;notice=m.message;if(state)render();else root.textContent=m.message;}
  });
  api.postMessage({type:'ready'});
})();
