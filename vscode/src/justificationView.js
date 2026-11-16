'use strict';
(() => {
 const api=acquireVsCodeApi(),root=document.getElementById('reader');let current,source,selectionKey;const selected=new Set();
 function el(tag,label,parent=root){const n=document.createElement(tag);if(label!==undefined)n.textContent=label;parent.append(n);return n;}
 function button(label,type,parent=root,fields={}){const n=el('button',label,parent);n.disabled=current.busy;n.addEventListener('click',()=>api.postMessage({type,generation:current.generation,...fields}));return n;}
 function render(){
  if(!current)return;root.replaceChildren();
  el('h1',current.title);
  const nav=el('nav',undefined);nav.className='toolbar';
  if(current.origin)button('← Return to document','return',nav);
  if(source){
   const back=el('button',current.material?(current.material.review?'← Back to proposal':'← Back to selected passages'):'← Back to routes',nav);back.onclick=()=>{source=null;render();};
   const s=(current.material?.sources||current.request.sources).find(s=>s.id===source);
   if(s){el('h2',s.title);window.MRWAnnotations.render(root,s.text,{inlineDollars:true,exact:false});
    const details=el('details');el('summary','Exact source and reference',details);el('p',s.reference,details);
    el('p','Reported source revision: '+s.source_revision,details);el('p','Retained passage SHA-256: '+s.sha256,details);el('pre',s.text,details);}
   return;
  }
  if(current.material){
   const m=current.material,review=m.review;
   el('p',review?'Review the proposed claims and arrows against the selected passages.':'Selected passages are saved. Copy them with the schema to Codex, then import its response here.');
   button('Copy passages for Codex','copy_material',nav);
   button('Import proposal from clipboard','import_material',nav);
   if(review){
    el('p','Supplied attribution: '+review.attribution+'. Producer identity has not been authenticated.').className='muted';
    el('h2','Claims');
    const names=Object.fromEntries(review.claims.map(c=>[c.id,c.title]));
    review.claims.forEach(c=>{
     const row=el('section');row.className='region';el('h3',(c.id===review.goal?'Goal: ':'')+c.title,row);
     window.MRWAnnotations.render(row,c.text,{inlineDollars:true,exact:false});
     button('Edit summary','edit_material',row,{claim:c.id,field:'text'});
     button('Edit title','edit_material',row,{claim:c.id,field:'title'});
     c.sources.forEach(id=>{const source=m.sources.find(s=>s.id===id);if(source){const n=el('button',source.title,row);n.onclick=()=>{sourceId(id);};}});
    });
    el('h2','Proposed grounds');
    el('p','Select grounds to admit in this context. Admission and Lean search are separate actions.');
    review.grounds.forEach(g=>{
     const row=el('section');row.className='region';
     const label=el('label',undefined,row),box=el('input',undefined,label);box.type='checkbox';box.checked=selected.has(g.id);box.disabled=current.busy;
     box.addEventListener('change',()=>{if(box.checked)selected.add(g.id);else selected.delete(g.id);});
     el('span',g.reason+' : '+g.premises.reduceRight((tail,id)=>names[id]+' → ('+tail+')',names[g.conclusion]),label);
     el('p',g.rationale,row);el('p','Scope: '+g.scope,row);
     g.sources.forEach(id=>{const src=m.sources.find(s=>s.id===id);if(src){const n=el('button',src.title,row);n.onclick=()=>sourceId(id);}});
    });
    const accept=el('button','Admit selected grounds');accept.disabled=current.busy;
    accept.addEventListener('click',()=>api.postMessage({type:'accept_material',generation:current.generation,selected:[...selected]}));
    const original=el('details');el('summary','Supplied proposal before corrections',original);el('pre',m.proposal,original);
   }
   const captures=el('details');el('summary','Selected passages',captures);captures.open=!review;
   m.sources.forEach(s=>{const n=el('button',s.title,captures);n.onclick=()=>sourceId(s.id);});
   if(current.busy)el('p','Saving…').setAttribute('role','status');
   if(current.error)el('p',current.error).className='warning';
   return;
  }
  el('p',current.revision?'Retained Lean run: checked relative to these admissions. Reopened views perform no new check.':'Review the supplied context before searching. Opening it admits nothing.');
  const goal=current.request.goal,claim=goal[0]==='atom'?current.request.claims.find(c=>c.id===goal[1].id):null;
  if(claim)window.MRWAnnotations.render(root,claim.assertion,{inlineDollars:true,exact:false});
  el('p','This engine checks the stated composition of grounds; it does not check the arithmetic proofs or a paper–Lean correspondence.').className='muted';
  if(current.proposalRevision)button('Inspect supplied and reviewed proposal','proposal_record');
  if(current.pending){
   el('p',current.pendingSaved?'Unfinished context saved. Reopen it through Justification; search runs only when requested.':current.error?'Saving has not been confirmed. Keep this view open and retry.':'Search saves this context before starting Lean.').className='muted';
   button(current.request.withdrawal?'Search / retry successor':'Search under these admissions','search');
   if(current.request.withdrawal)button('Keep earlier context','cancel_successor');}
  else{
   if(current.request.context.admissions.length)button('Withdraw a ground…','withdraw');
   if(current.request.context.predecessor)button('Open earlier context','predecessor');
   button('Inspect retained JSON','record');
  }
  const sources=Object.fromEntries(current.request.sources.map(s=>[s.id,s]));
  function showSource(id,parent){const s=sources[id];if(!s)return;const n=el('button',s.title,parent);n.onclick=()=>{source=id;render();};}
  if(current.result){
   el('h2','Checked routes');
   if(!current.result.routes.length)el('p','No route found within this search. This is not a disproof or a completeness result.');
   const admissions=Object.fromEntries(current.request.admissions.map(a=>[a.id,a]));
   current.result.routes.forEach((route,index)=>{
    const card=el('section');card.className='region';el('h3','Route '+(index+1),card);
    route.admission_ids.forEach(id=>{const a=admissions[id];el('p',id.replaceAll('-',' '),card);
     a.basis_refs.forEach(ref=>showSource(ref.id,card));});
    const detail=el('details',undefined,card);el('summary','Term and admission IDs',detail);el('pre',JSON.stringify({term:route.term,admission_ids:route.admission_ids},null,2),detail);
   });
   const stats=current.result.statistics;
   if(stats.limits_hit.length)el('p','Search limits reached: '+stats.limits_hit.join(', ')+'. Other routes may exist.').className='warning';
  }
  const assumptions=el('details');el('summary','Admissions and their scope',assumptions);
  const active=new Set(current.request.context.admissions);
  current.request.admissions.filter(a=>active.has(a.id)).forEach(a=>{const row=el('section',undefined,assumptions);row.className='region';
   el('h3',a.id.replaceAll('-',' '),row);el('p',a.rationale,row);el('p','Scope: '+a.scope,row);el('p','Supplied by '+a.admitted_by.id+' · '+a.at,row);a.basis_refs.forEach(ref=>showSource(ref.id,row));});
  if(current.pending)assumptions.open=true;
  const setup=el('details');el('summary','Local checker setup',setup);el('p','Build MRW’s checker using an already installed Lean 4.32.2 toolchain on Linux/WSL. No download or build occurs when opening this view.',setup);button('Build local checker','build',setup);
  if(current.busy)el('p',current.pendingSaved?'Working… The exact unfinished context is saved.':'Saving the exact context before checking… Keep this view open until confirmed.').setAttribute('role','status');
  if(current.error)el('p',current.error).className='warning';
 }
 function sourceId(id){source=id;render();}
 window.addEventListener('message',event=>{if(event.data?.type!=='grounds')return;
  const key=event.data.materialRevision||event.data.revision||event.data.request.id;if(selectionKey!==key){source=null;selected.clear();selectionKey=key;}
  current=event.data;render();});
 api.postMessage({type:'ready'});
})();
