'use strict';
(() => {
  const api=acquireVsCodeApi(),root=document.getElementById('reader');
  let question,preview,status,openButton,dirty=false,busy=false;
  function el(tag,text,parent=root){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;parent.append(n);return n;}
  function controls(){for(const b of root.querySelectorAll('button'))b.disabled=busy;if(question)question.disabled=busy;}
  function action(text,type){const b=el('button',text);b.type='button';b.dataset.action=type;b.addEventListener('click',()=>{
    if(busy)return;
    if(dirty&&type!=='save_question'){status.textContent='Save the question before continuing.';return;}
    busy=true;controls();api.postMessage({type,question:question.value});
  });return b;}
  window.addEventListener('message',e=>{
    if(e.origin!==window.origin)return;
    const m=e.data;if(!m||typeof m!=='object')return;
    if(m.type==='study'){
      if(!question){
        root.replaceChildren();el('h1',m.title);el('p',m.file);
        el('label','Unresolved question');question=el('textarea');question.setAttribute('aria-label','Unresolved question');
        question.addEventListener('input',()=>{dirty=true;status.textContent='Question not saved.';});
        action('Questions and attempts','active_study');action('Save question','save_question');action('Copy handoff for Codex','copy');action('Import outline from clipboard','import');openButton=action('Open outline','outline');
        status=el('p');status.setAttribute('role','status');const d=el('details');el('summary','Exact handoff',d);preview=el('pre',undefined,d);
      }
      if(!dirty||m.notice==='Question saved.'){question.value=m.question;dirty=false;}
      preview.textContent=m.handoff;status.textContent=m.notice;openButton.hidden=!m.outline;
    }else if(m.type==='error')status?status.textContent=m.message:el('p',m.message);
    else if(m.type==='idle'){busy=false;controls();}
  });
  api.postMessage({type:'ready'});
})();
