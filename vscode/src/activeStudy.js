'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const model=require('./studyModel'),scheduler=require('./studyScheduler'),help=require('./studyHelp');
const {outlineHtml}=require('./outlines');
const {hash,summarize,selectHistoryContext}=require('./studyHistory');
function registerActiveStudy({vscode,context,register,recorder,projectRoot,show,bridge,changed,getCurrent,readPassage,followPassage,selectPrerequisites,loadExample,io=fs}){
  let active,panel,loaded=false,queue=Promise.resolve(),saveTail=Promise.resolve(),draftTimer;
  const studies=new Map(),recentKey='mrw.lightStudy.recent.v1';
  const home=context.storageUri&&path.join(context.storageUri.fsPath,'active-studies-v1');
  const recent=()=>context.workspaceState.get(recentKey)||[];
  async function load(){if(loaded)return;if(!home)throw new Error('Open a folder to save study continuity.');await recorder.init();
    await io.mkdir(home,{recursive:true,mode:0o700});
    for(const item of recent())try{const s=JSON.parse(await io.readFile(path.join(home,item.id+'.json'),'utf8'));if(s.version===2&&s.id===item.id)studies.set(s.id,s);}catch(e){recorder.record('operation.error',{operation:'study.restore',message:e.message,study:item.id});}
    loaded=true;
  }
  function persist(s,patch={}){
    s.updated=new Date().toISOString();const snapshot=JSON.stringify({...s,...patch},null,2)+'\n';
    const job=saveTail.then(async()=>{try{
      const dest=path.join(home,s.id+'.json'),temp=dest+'.pending';await io.writeFile(temp,snapshot,{mode:0o600});await io.rename(temp,dest);
      const r=[{id:s.id,title:s.title,sources:s.passages.length,unfinished:!!s.current&&!s.current.finished},...recent().filter(x=>x.id!==s.id)].slice(0,30);await context.workspaceState.update(recentKey,r);changed.fire();
    }catch(e){recorder.failure(e);await send('Study save failed; keep this view open or copy your draft. '+e.message);throw e;}});saveTail=job.catch(()=>{});return job;
  }
  function syncContext(){if(active)recorder.setContext(model.identity(active));}
  function eligible(s){
    const pins=new Set(model.signature(s.passages).map(p=>JSON.stringify(p))),bank=[];
    for(const owner of studies.values())for(const q of owner.questions){
      if(q.references.every(ref=>{const p=owner.passages.find(p=>p.reference===ref);return p&&pins.has(JSON.stringify(model.signature([p])[0]));}))bank.push(q);
    }return bank;
  }
  async function persistOwners(s){const bank=new Set(eligible(s));await persist(s);for(const owner of studies.values())if(owner!==s&&owner.questions.some(q=>bank.has(q)))await persist(owner);}
  async function send(notice=''){
    if(!panel||!active)return;syncContext();
    await panel.webview.postMessage({type:'active_study',study:{...active,questions:eligible(active)},gap:recorder.gap,notice,scheduler:scheduler.IDENTITY});
  }
  async function open(s,reason){
    if(active&&active.id!==s.id){await persist(active);recorder.record('source.change',{from:active.id,to:s.id,unfinished:!!active.current&&!active.current.finished});}
    active=s;syncContext();recorder.record(reason==='resume'?'study.resume':'study.open',{restored_attempt:s.current?.id,has_draft:!!s.current?.draft});
    if(!panel){panel=vscode.window.createWebviewPanel('mrw.proofStudy','Study: '+s.title,vscode.ViewColumn.Active||1,{enableScripts:true,retainContextWhenHidden:true,localResourceRoots:[]});
      panel.onDidDispose(()=>{clearTimeout(draftTimer);if(active){recorder.record('session.pause',{reason:'study-view-closed'});void persist(active).catch(()=>{});}panel=undefined;});
      panel.onDidChangeViewState?.(e=>{if(!active)return;recorder.record(e.webviewPanel.active?'navigation.study_return':'navigation.study_away',{exposure_opportunity:!!e.webviewPanel.active});});
      panel.webview.onDidReceiveMessage(m=>{queue=queue.then(()=>receive(m)).catch(async e=>{recorder.record('operation.error',{operation:m?.type,message:e.message});await panel?.webview.postMessage({type:'study_error',message:e.message});}).finally(()=>{if(!['draft','form_draft','report_draft','help_draft'].includes(m?.type))return panel?.webview.postMessage({type:'study_idle'});});return queue;});
      const support=await Promise.all(['media/katex/katex.min.js','media/katex/auto-render.min.js','src/annotationView.js'].map(f=>fs.readFile(path.join(context.extensionPath,f),'utf8')));
      panel.webview.html=outlineHtml(await io.readFile(path.join(context.extensionPath,'src/activeStudyView.js'),'utf8'),support);
      context.subscriptions.push(panel);
    }else panel.reveal();
    panel.title='Study: '+s.title;await send();
  }
  async function start(passages,root,title){await load();const created=model.createStudy(passages,root,title);let s=studies.get(created.id);
    if(!s){try{s=JSON.parse(await io.readFile(path.join(home,created.id+'.json'),'utf8'));
      if(s.version!==2||s.id!==created.id||s.root!==root||!Array.isArray(s.questions)||JSON.stringify(model.signature(s.passages))!==JSON.stringify(model.signature(passages)))throw new Error('Saved study identity differs.');
    }catch(e){if(e.code!=='ENOENT')throw new Error('Saved study kept without replacement: '+e.message);s=created;}}
    studies.set(s.id,s);await persist(s);await open(s,'open');return s;
  }
  async function offerNext(){
    const s=active;if(s.current&&!s.current.finished)throw new Error('Finish or skip this attempt first; Pause preserves it.');
    if(!s.block)s.block=model.block(settings());
    const decision=scheduler.select(eligible(s),s.block);
    if(decision.question){beginAttempt(s,decision.question,decision.reason);await persist(s);}
    else{
      for(const q of eligible(s).filter(q=>!q.retired))recorder.record('review.defer',{question:q.id,revision:q.revision,reason:decision.reason});
      recorder.record('block.stop',{reason:decision.reason,completed:s.block.completed,block:s.block.id});offerEffort('block-boundary');
    }
    await send(decision.question?'':decision.reason==='none-due'?'No question is due here. Add one, return to the source, or start another block.':'Block complete. Continue when you choose.');
  }
  function beginAttempt(s,q,reason){
    if(s.current&&!s.current.finished)throw new Error('Record an outcome or skip before changing questions; Pause preserves unfinished work.');
    if(s.helpDraft)throw new Error('Retain or discard the help response draft before starting another question.');
    help.archive(s);s.helpVisible=[];model.begin(s,q,reason,recorder);
  }
  const settings=()=>{const c=vscode.workspace.getConfiguration('mrw');return{questions:c.get('studyQuestions',3),minutes:c.get('studyMinutes',5),newQuestions:c.get('studyNewQuestions',1)};};
  function offerEffort(point){const a=active.current;if(!a||!a.finished||a.effortOffer)return;
    const e=recorder.record('effort.offer',{attempt:a.id,wording:'How much mental effort did that last attempt require?',wording_version:1,scale:[1,9],point});a.effortOffer={id:e.id,disposition:'no_response'};
  }
  async function copyHelp(purpose,adaptation=null){
    const s=active,a=s.current,latest=a?.submissions.at(-1);let submitted=null;
    if(latest)try{await recorder.flush();submitted=JSON.parse(await io.readFile(path.join(recorder.directory,'snapshots',latest.snapshot+'.json'),'utf8'));}catch{ /* Missing snapshot stays explicit in the handoff. */ }
    let text=model.questionHandoff(s,purpose,submitted);
    if(purpose!=='questions'){
      const requestId=require('node:crypto').randomUUID();
      text+='\n\nRequest association: '+requestId+'\nAttempt: '+(a?.id||'none')+'\nLatest submission: '+(latest?.event||'none')+'\nReturn ordinary prose for explicit review and retention in MRW.';
      await vscode.env.clipboard.writeText(text);
      const r=help.request(s,purpose,text,recorder,adaptation,requestId);
      await persist(s);
    }else {await vscode.env.clipboard.writeText(text);recorder.record('handoff.copy',{purpose,snapshot:recorder.snapshot({text})});}
    await send('Handoff copied. Paste into Codex; then use Paste companion response here.');
  }
  function keepControls(s,m){
    if(m.reportDraft&&s.current&&(!m.attempt||m.attempt===s.current.id))s.current.reportDraft=reportDraft(m.reportDraft);
    if(m.helpDraft&&s.helpDraft&&Buffer.byteLength(JSON.stringify(m.helpDraft))<=96*1024){
      for(const key of ['text','author','origin'])if(typeof m.helpDraft[key]==='string')s.helpDraft[key]=m.helpDraft[key];
    }
  }
  function reportDraft(r){
    return {outcome:['unaided_success','help_dependent','unresolved','unassessed'].includes(r.outcome)?r.outcome:'unassessed',
      assessor:'reader',consulted:[true,false,null].includes(r.consulted)?r.consulted:null,correction:!!r.correction};
  }
  async function receive(m){
    if(!active||!m||typeof m!=='object')return;
    if(['form_draft','draft','report_draft','help_draft'].includes(m.type)){
      const target=studies.get(m.study)||active;
      if(m.type==='form_draft'&&Buffer.byteLength(JSON.stringify(m.form))<=64*1024)target.formDraft=m.form;
      if(m.type==='draft'&&target.current?.id===m.attempt&&!target.current.finished&&typeof m.text==='string'&&Buffer.byteLength(m.text)<=64*1024){target.current.draft=m.text;target.current.paper=!!m.paper;}
      if(m.type==='report_draft'&&target.current?.id===m.attempt)target.current.reportDraft=reportDraft(m.report||{});
      if(m.type==='help_draft')keepControls(target,{helpDraft:m.response});
      clearTimeout(draftTimer);draftTimer=setTimeout(()=>void persist(target).catch(()=>{}),600);draftTimer.unref?.();return;
    }
    const s=active;if(m.study&&m.study!==s.id)throw new Error('This study changed. Your earlier draft remains with its source.');
    syncContext();keepControls(s,m);
    if(m.type==='ready'){await send();return;}
    if(m.attempt&&m.attempt!==s.current?.id)throw new Error('Attempt changed; the original remains saved.');
    if(m.form!==undefined&&Buffer.byteLength(JSON.stringify(m.form))<=64*1024)s.formDraft=m.form;
    if(typeof m.draft==='string'&&s.current&&!s.current.finished&&Buffer.byteLength(m.draft)<=64*1024)s.current.draft=m.draft;
    const started=Date.now();recorder.record('operation.start',{operation:m.type});
    if(m.type==='form_cancel'){s.formDraft=null;recorder.record('operation.cancel',{operation:'question.edit'});await persist(s);await send();}
    else if(m.type==='question_save'){
      if(s.current&&!s.current.finished)throw new Error('Finish or skip the attempt before revising a question.');
      const previous=m.previous?eligible(s).find(q=>q.revision===m.previous):null;
      const q=model.question(m.question,s.passages,previous);if(previous&&previous.revision===q.revision){s.formDraft=null;await persistOwners(s);await send('Question unchanged.');return;}
      if(s.questions.some(old=>!old.retired&&old.revision===q.revision)){s.formDraft=null;await persistOwners(s);await send('Question saved.');return;}
      if(s.questions.length>=200)throw new Error('This study holds at most 200 question revisions. Retain a separate study for further questions.');
      if(previous)previous.retired=true;
      s.formDraft=null;s.questions.push(q);recorder.record(previous?'question.revise':'question.save',{id:q.id,revision:q.revision,previous:previous?.revision||null,snapshot:recorder.snapshot(q)});await persistOwners(s);await send('Question saved. Keep for review is a separate choice.');
    }else if(m.type==='import_questions'){
      let text=(await vscode.env.clipboard.readText()).trim();if(text.startsWith(String.fromCharCode(96).repeat(3))){const found=/^\x60{3}(?:json)?\s*\n([\s\S]*?)\n\x60{3}\s*$/i.exec(text);if(!found)throw new Error('Copy the complete question JSON object or code block.');text=found[1];}
      const value=await bridge({method:'study_questions_parse',text,sources:model.signature(s.passages)});
      const added=value.questions.map(q=>model.question(q,s.passages));if(s.questions.length+added.length>200)throw new Error('This study holds at most 200 question revisions.');
      s.questions.push(...added);recorder.record('question.import',{count:added.length,snapshot:recorder.snapshot(added)});await persist(s);await send('Questions imported. Choose one to begin; review admission stays optional.');
    }else if(m.type==='prerequisites'){
      const selected=await selectPrerequisites(s.root,s.passages);
      if(selected?.length){await start([...s.passages,...selected],s.root,s.title);await send('Prerequisites added. Earlier unfinished work remains in the previous study.');}else recorder.record('operation.cancel',{operation:'study.prerequisites'});
    }else if(m.type==='handoff')await copyHelp(m.purpose||'questions');
    else if(m.type==='help_paste'){
      if(s.helpDraft?.text?.trim())throw new Error('Retain or discard the response draft before pasting another.');
      s.helpDraft=help.paste(s,await vscode.env.clipboard.readText());
      if(s.current&&!s.current.finished){s.current.helpExposures||=[];s.current.helpExposures.push(s.helpDraft.id);}
      recorder.record('help.preview',{response:s.helpDraft.id,request:s.helpDraft.request,attempt:s.current?.id||null,after_submission:!!s.current?.submissions.length,meaning:'Pasted response displayed for review; consultation and benefit unobserved.'});await persist(s);await send('Review the pasted response and its attribution, then retain it.');
    }else if(m.type==='help_edit'){help.reveal(s,m.response,recorder);s.helpDraft=help.edit(s,m.response);await persist(s);await send();}
    else if(m.type==='help_cancel'){await persist(s,{helpDraft:null});s.helpDraft=null;await send('Help draft discarded.');}
    else if(m.type==='help_save'){
      const response=help.retain(s,m.response,recorder);
      // Retention and display share one checkpoint. A failed save keeps the live draft.
      help.reveal(s,response.id,recorder);await persist(s,{helpDraft:null});s.helpDraft=null;
      if(!response.event)response.event=recorder.record('help.retained',{response:response.id,attempt:response.attempt,request:response.request,
        adaptation:response.adaptation,snapshot:response.snapshot,original_snapshot:response.original.snapshot,previous:response.previous,
        author:response.author,origin:response.origin,meaning:'Manually associated reply; origin and mathematics are not authenticated.'},'observed_action').id;
      await send('Help retained.');
    }else if(m.type==='help_show'){
      if(m.visible===false)s.helpVisible=(s.helpVisible||[]).filter(id=>id!==m.response);else help.reveal(s,m.response,recorder);
      await persist(s);await send();
    }else if(m.type==='continue_attempt'){
      const previous=s.current;if(!previous?.finished)throw new Error('Record an outcome or skip before starting a linked continuation. The current draft stays saved.');
      help.archive(s);const shown=(s.helpVisible||[]).filter(id=>s.help?.some(h=>h.id===id));
      const currentQuestion=eligible(s).find(q=>q.id===previous.question.id&&q.revision===previous.question.revision)||previous.question;
      model.begin(s,currentQuestion,'reader-requested continuation after feedback',recorder);
      s.current.continues=previous.id;s.current.assistedContinuation=true;
      s.current.draft=previous.draft;s.current.paper=previous.paper;
      s.current.helpExposures=[...shown];
      const response=m.response||shown.at(-1)||null,entry=s.help?.find(h=>h.id===response);
      s.current.response=response;s.current.adaptationChoice=entry?.adaptation||null;
      recorder.record('attempt.continuation',{attempt:s.current.id,continues:previous.id,response,adaptation:entry?.adaptation||null,assisted_revision:true});
      await persist(s);await send('Linked continuation started. Earlier work and outcome remain saved.');
    }
    else if(m.type==='next')await offerNext();
    else if(m.type==='continue_block'){s.block=model.block(settings());recorder.record('block.start',{...s.block,reason:'reader-continued'});await offerNext();}
    else if(m.type==='choose_question'){
      const q=eligible(s).find(q=>q.revision===m.revision);if(!q||q.retired)throw new Error('Choose a current question revision.');
      if(!s.block)s.block=model.block(settings());beginAttempt(s,q,'reader-selected; budget override');await persist(s);await send();
    }else if(m.type==='submit'){model.submit(s,m.text,!!m.paper,recorder);await persist(s);await send('Submission saved. Compare with the source or report its outcome.');}
    else if(m.type==='outcome'){
      model.outcome(s,m.report,recorder,eligible(s));if(s.block.completed>=s.block.limit||Date.now()-s.block.started>=s.block.minutes*60000)offerEffort('block-boundary');
      const pending=s.current.reportDraft;s.current.reportDraft=null;try{await persistOwners(s);}catch(e){s.current.reportDraft=pending;throw e;}await send('Outcome recorded.');
    }else if(m.type==='skip'){
      if(s.current&&!s.current.finished){recorder.record('attempt.skip',{attempt:s.current.id});s.current.finished=true;s.block.completed++;await persist(s);}await send('Skipped; recall schedule unchanged.');
    }else if(['hint','answer','source_visibility'].includes(m.type)){
      const a=s.current;if(!a)throw new Error('Begin a question first.');
      if(m.type==='hint'){if(!Number.isSafeInteger(m.index)||!a.question.hints[m.index])throw new Error('No such hint.');if(!a.hints.includes(m.index))a.hints.push(m.index);recorder.record('attempt.hint',{attempt:a.id,index:m.index,after_submission:!!a.submissions.length});}
      if(m.type==='answer'){a.answerVisible=true;recorder.record('attempt.answer',{attempt:a.id,after_submission:!!a.submissions.length});}
      if(m.type==='source_visibility'){a.sourceVisible=!!m.visible;if(m.visible)a.sourceExposed=true;recorder.record('source.visibility',{attempt:a.id,visible:!!m.visible,meaning:'exposure opportunity, not evidence of reading'});}
      await persist(s);await send();
    }else if(m.type==='effort_offer'){offerEffort('reader-request');await persist(s);await send();}
    else if(m.type==='effort_response'){
      const a=s.current;if(!a?.effortOffer||a.effortOffer.disposition!=='no_response')throw new Error('No unanswered effort offer.');
      if(m.rating!==null&&(!Number.isInteger(m.rating)||m.rating<1||m.rating>9))throw new Error('Choose 1–9 or decline.');
      a.effortOffer.disposition=m.rating===null?'declined':'answered';a.effortOffer.rating=m.rating;
      const e=recorder.record('effort.response',{attempt:a.id,offer:a.effortOffer.id,disposition:a.effortOffer.disposition,rating:m.rating},'reader_report');
      a.adaptation=model.adaptation(s,m.rating,await recorder.events(),a.id);if(a.adaptation){a.adaptation.event=recorder.record('adaptation.offer',a.adaptation,'derived_estimate').id;}
      await persist(s);await send();
    }else if(m.type==='adaptation'){
      const a=s.current;if(!a?.adaptation?.choices.includes(m.choice))throw new Error('Choose an offered adaptation.');
      const choice=recorder.record('adaptation.choice',{attempt:a.id,offer:a.adaptation.event,choice:m.choice,evidence:a.adaptation.evidence},'reader_report');
      if(m.choice==='pause')recorder.record('session.pause',{reason:'reader-adaptation-choice'});
      else if(m.choice!=='continue')await copyHelp(m.choice,choice.id);
      a.adaptation=null;await persist(s);await send(m.choice==='pause'?'Paused. The original task is saved.':'Choice recorded.');
    }else if(m.type==='admit'||m.type==='retire'){
      const q=eligible(s).find(q=>q.revision===m.revision);if(!q)throw new Error('Question revision not found.');
      q.kept=m.type==='admit';q.retired=m.type==='retire';recorder.record(m.type==='admit'?'review.admit':'review.retire',{question:q.id,revision:q.revision});await persistOwners(s);await send();
    }else if(m.type==='unresolved'){
      if(typeof m.text!=='string'||m.text.length>8192)throw new Error('Keep the question within 8192 characters.');s.unresolved=m.text;recorder.record('study.save',{snapshot:recorder.snapshot({unresolved:s.unresolved})});await persist(s);await send('Question saved for resumption.');
    }else if(m.type==='pause'){recorder.record('session.pause',{attempt:s.current?.id});await persist(s);await recorder.flush();await send('Paused. Resume returns to this question and draft.');}
    else if(m.type==='source'){const p=s.passages.find(p=>p.reference===m.reference);if(!p)throw new Error('Choose a source in this study.');recorder.record('navigation.source',{reference:p.reference});await followPassage(p.reference,s.root);}
    else if(m.type==='history')await inspect();
    else if(m.type==='export')await exportHistory();
    recorder.record('operation.complete',{operation:m.type,duration_ms:Date.now()-started});
  }
  async function inspect(){await load();const events=(await recorder.events()).filter(e=>!active||e.identity.study===active.id);
    const latest=events.slice(-100);await show(summarize(events)+'\n\n## Event history (latest 100)\n\n'+latest.map(e=>`${e.at} #${e.sequence} ${e.action} [${e.evidence}]\n${JSON.stringify(e.data)}`).join('\n\n'),'Study-history');}
  async function exportHistory(){await load();const all=await recorder.events(),sessions=[...new Set(all.map(e=>e.session))];
    const picked=await vscode.window.showQuickPick(sessions.map(id=>({label:all.find(e=>e.session===id).at+' · '+id.slice(0,8),description:all.find(e=>e.session===id).software.version,id,picked:id===recorder.session})),{canPickMany:true,placeHolder:'Export selected local sessions'});
    if(!picked?.length){recorder.record('operation.cancel',{operation:'history.export'});return;}
    const selection=selectHistoryContext(all,picked.map(p=>p.id)),selected=selection.events;
    const kind=await vscode.window.showQuickPick([{label:'Readable comparison',kind:'md'},{label:'Events and submitted snapshots',kind:'json'}],{placeHolder:'Export format'});if(!kind)return;
    const uri=await vscode.window.showSaveDialog({title:'Export selected study history',filters:{'Study history':[kind.kind]}});if(!uri)return;
    let text=summarize(selected);if(selection.missing.length)text+='\n\nMissing linked context (unsupported derived values excluded):\n'+selection.missing.map(x=>JSON.stringify(x)).join('\n');
    if(kind.kind==='json'){
      const ids=new Set(selected.flatMap(e=>[e.data.snapshot,e.data.original_snapshot]).filter(Boolean)),snapshots={};
      for(const id of ids)try{snapshots[id]=JSON.parse(await io.readFile(path.join(recorder.directory,'snapshots',id+'.json'),'utf8'));}catch{snapshots[id]={unavailable:true};}
      text=JSON.stringify({schema:1,warning:'Descriptive, not causal. No pre-instrumentation baseline.',selected_sessions:selection.selected_sessions,missing_context:selection.missing,events:selected,snapshots},null,2);
    }
    // Host-owned ordinary export: native creation/save, refusing overwrite.
    try{await io.lstat(uri.fsPath);throw new Error('Choose a new export filename.');}catch(e){if(e.code!=='ENOENT')throw e;}
    const edit=new vscode.WorkspaceEdit();edit.createFile(uri,{overwrite:false,ignoreIfExists:false});edit.insert(uri,new vscode.Position(0,0),text+'\n');
    if(!await vscode.workspace.applyEdit(edit))throw new Error('The editor declined export.');const doc=await vscode.workspace.openTextDocument(uri);await vscode.window.showTextDocument(doc,{preview:false});if(!await doc.save())throw new Error('Export remains unsaved in its ordinary document.');
    recorder.record('history.export',{sessions:picked.map(p=>p.id),format:kind.kind});
  }
  register('mrw.studyCurrent',async supplied=>{const root=await projectRoot(vscode.window.activeTextEditor);
    const selected=supplied?.reference?await readPassage(supplied.reference,root):await getCurrent(root);
    if(!selected)throw new Error('Select a passage in the source reader, a cited graph claim, or ordinary saved text.');
    return start([selected],root,selected.label);
  });
  register('mrw.openStudyExample',async()=>{
    if(!loadExample)throw new Error('The offline example is unavailable in this host.');
    const {root,passage}=await loadExample();await load();
    const created=model.createStudy([passage],root,'Example: sums of odd integers');let s=studies.get(created.id);
    if(!s){try{s=JSON.parse(await io.readFile(path.join(home,created.id+'.json'),'utf8'));if(s.id!==created.id||s.version!==2||!s.practice)throw new Error('Saved example identity differs.');}
      catch(e){if(e.code!=='ENOENT')throw e;s=created;s.practice=true;s.questions=require('./studyExample').questions(passage.reference).map(q=>model.question(q,[passage]));}}
    studies.set(s.id,s);s.practice=true;await open(s,'open');recorder.record('example.open',{attribution:'Codex companion (OpenAI)',license:'CC0-1.0'});await persist(s);
  });
  register('mrw.resumeStudy',async item=>{await load();let id=item?.study;
    if(!id&&active)id=active.id;if(!id&&recent().length===1)id=recent()[0].id;
    if(!id){const picked=await vscode.window.showQuickPick(recent().map(x=>({label:x.title,id:x.id})),{placeHolder:'Resume a saved study'});id=picked?.id;}
    const s=studies.get(id);if(s)await open(s,'resume');else if(id)throw new Error('This study is unavailable; its history is preserved.');
  });
  register('mrw.inspectStudyHistory',inspect);register('mrw.exportStudyHistory',exportHistory);
  register('mrw.openStudyItem',async item=>{await load();const s=studies.get(item.study);if(!s)return;await open(s,'resume');if(item.reference)await followPassage(item.reference,s.root);if(item.revision){const q=eligible(s).find(q=>q.revision===item.revision);if(q){if(!s.block)s.block=model.block(settings());beginAttempt(s,q,'reader-selected question row');await persist(s);await send();}}});
  const tree={onDidChangeTreeData:changed.event,getChildren:async item=>{
    if(!item)return recent().sort((a,b)=>Number(b.id===active?.id)-Number(a.id===active?.id)).map(r=>({...r,study:r.id,kind:'study'}));await load();const s=studies.get(item.study);
    if(item.kind==='study')return [...(s?.passages||[]).map(p=>({label:p.label,reference:p.reference,study:item.study,kind:'source'})),...(s?eligible(s):[]).filter(q=>!q.retired).slice(-10).map(q=>({label:q.prompt,study:item.study,revision:q.revision,kind:'question',description:q.kept?'kept for review':'available'}))];return[];
  },getTreeItem:item=>{const row=new vscode.TreeItem(item.title||item.label,item.kind==='study'?vscode.TreeItemCollapsibleState.Collapsed:vscode.TreeItemCollapsibleState.None);
    row.id=item.kind+':'+item.study+':'+(item.reference||item.revision||'');row.contextValue='mrw.'+item.kind;row.description=item.kind==='study'?[active?.id===item.study?'Current':null,item.sources?item.sources+' passages':null,item.unfinished?'unfinished':null].filter(Boolean).join(' · '):item.description;
    row.tooltip=item.reference||item.label||item.title;row.command={command:'mrw.openStudyItem',title:'Open '+item.kind,arguments:[item]};return row;}};
  context.subscriptions.push(vscode.window.registerTreeDataProvider('mrw.research',tree));
  return {start,tree,flush:async()=>{clearTimeout(draftTimer);if(active)await persist(active);await saveTail;},receive,get active(){return active;},hasRecent:()=>recent().length>0};
}
module.exports={registerActiveStudy};
