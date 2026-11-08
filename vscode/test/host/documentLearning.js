'use strict';
// One native workflow over disposable Markdown, real views and the production controller.
const vscode=require('vscode'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
function probe(){
  const api=acquireVsCodeApi();window.acquireVsCodeApi=()=>api;
  window.addEventListener('message',event=>{
    if(event.data?.type!=='document_learning_probe')return;
    const m=event.data,root=document.getElementById('reader');let failure,focusState;
    try{
      const action=()=>[...root.querySelectorAll('[data-action]')].filter(n=>n.dataset.action===m.action)[m.index||0];
      if(m.kind==='click'){const n=action();if(!n||n.disabled)throw Error('Missing or disabled control '+m.action);for(let p=n.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;n.focus();n.click();}
      if(m.kind==='fields')for(const [label,value]of Object.entries(m.fields)){
        const n=[...root.querySelectorAll('input,textarea,select')].find(n=>n.getAttribute('aria-label')===label);
        if(!n)throw Error('Missing field '+label);for(let p=n.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;
        n.focus();n.value=value;n.dispatchEvent(new Event(n.tagName==='SELECT'?'change':'input',{bubbles:true}));
      }
      if(m.kind==='focus'){const n=action();if(!n)throw Error('Missing focus control '+m.action);n.focus();focusState={frameFocused:document.hasFocus(),disabled:n.disabled,active:document.activeElement===n};}
    }catch(e){failure=e.message;}
    api.postMessage({type:'document_learning_reply',request:m.request,failure,
      focusState,text:root.innerText,help:root.querySelector('.control-help')?.textContent,
      helpVisible:root.querySelector('.control-help')?.hidden===false,
      focused:document.activeElement?.dataset.action,
      fields:[...root.querySelectorAll('textarea,input,select')].map(n=>({label:n.getAttribute('aria-label'),value:n.value,disabled:n.disabled}))});
  });
}
async function run(context){
 const config=JSON.parse(await fs.readFile(path.join(context.extensionPath,'host-test.json'),'utf8'));
 if(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath!==config.project)throw Error('Wrong native fixture workspace');
 const report={version:vscode.version,remote:vscode.env.remoteName,checks:[],errors:[],complete:false,
   scope:'Real VS Code views and production JS; injected file-dialog answers, DOM input/click probes and offline Stacks acquisition. Working window not used.'};
 const save=()=>fs.writeFile(path.join(config.artifacts,'native-result.json'),JSON.stringify(report,null,2));
 const native={tree:vscode.window.createTreeView,panel:vscode.window.createWebviewPanel,open:vscode.window.showOpenDialog,input:vscode.window.showInputBox,warning:vscode.window.showWarningMessage,error:vscode.window.showErrorMessage,execute:vscode.commands.executeCommand};
 const panels={},waiters=new Map();let controller,tree,provider,pick,selection;const layoutCalls=[];
 async function wait(check,label,ms=10000){const until=Date.now()+ms;while(!check()){if(Date.now()>until)throw Error('Timed out: '+label);await new Promise(r=>setTimeout(r,80));}}
 async function check(label,fn){await fn();report.checks.push(label);await save();}
 async function dom(kind,extra={},which='study'){
   if(kind==='fields'){const until=Date.now()+10000;for(;;){const ready=await dom('inspect',{},which);if(Object.keys(extra.fields).every(label=>ready.fields.some(n=>n.label===label&&!n.disabled)))break;if(Date.now()>until)throw Error('Rendered fields unavailable: '+Object.keys(extra.fields).join(', '));await new Promise(r=>setTimeout(r,80));}}
   const panel=panels[which];if(!panel)throw Error('Missing '+which+' view');await wait(()=>panel.nativeReady,'webview ready');const request=require('node:crypto').randomUUID();
   const result=new Promise((resolve,reject)=>{const timer=setTimeout(()=>{waiters.delete(request);reject(Error('Native webview probe timed out'));},8000);waiters.set(request,value=>{clearTimeout(timer);resolve(value);});});
   await panel.webview.postMessage({type:'document_learning_probe',request,kind,...extra});const value=await result;if(value.failure)throw Error(value.failure);return value;
 }
 async function click(action){const until=Date.now()+10000;for(;;)try{return await dom('click',{action});}catch(e){if(!/Missing or disabled control/.test(e.message)||Date.now()>until)throw e;await new Promise(r=>setTimeout(r,80));}}
 async function rendered(pattern,which='study'){let value;const until=Date.now()+10000;for(;;){value=await dom('inspect',{},which);if(pattern.test(value.text))return value;if(Date.now()>until)throw Error('Rendered content missing: '+pattern);await new Promise(r=>setTimeout(r,80));}}
 async function stage(name){report.stage=name;await save();await wait(()=>require('node:fs').existsSync(path.join(config.artifacts,'continue-'+name)),'window observation '+name,120000);}
 const command=async(name,...args)=>{const value=await vscode.commands.executeCommand('mrw.'+name,...args);assert.deepEqual(report.errors,[]);return value;};
 const owned=[];
 try{
  vscode.window.showErrorMessage=async message=>{report.errors.push(message);await save();};vscode.window.showOpenDialog=async()=>pick;
  vscode.window.showInputBox=async()=> '08ZD';vscode.window.showWarningMessage=async()=> 'Import section';
  const bridge=require('../../src/bridge'),originalBridge=bridge.runBridge;
  bridge.runBridge=(extension,executable,request,options)=>originalBridge(extension,executable,request,{...options,spawn:(command,args,settings)=>spawn(command,[args[0],path.join(extension,'test/stacks_bridge.py')],settings)});
  const study=require('../../src/activeStudy'),registerStudy=study.registerActiveStudy;study.registerActiveStudy=options=>controller=registerStudy(options);
  vscode.window.createTreeView=(id,options)=>{const value=native.tree(id,options);if(id==='mrw.readingOutline'){tree=value;provider=options.treeDataProvider;}return value;};
  vscode.window.createWebviewPanel=(...args)=>{
    const panel=native.panel(...args),kind=args[0]==='mrw.proofStudy'?'study':args[0]==='mrw.sourceOutline'?'source':null;if(!kind)return panel;panels[kind]=panel;
    const receive=panel.webview.onDidReceiveMessage.bind(panel.webview);
    panel.webview.onDidReceiveMessage=(callback,receiver,disposables)=>receive(value=>{if(value.type==='ready')panel.nativeReady=true;if(value.type==='document_learning_reply'){waiters.get(value.request)?.(value);waiters.delete(value.request);return;}return callback.call(receiver,value);},undefined,disposables);
    let prototype=Object.getPrototypeOf(panel.webview),descriptor;while(prototype&&!(descriptor=Object.getOwnPropertyDescriptor(prototype,'html')))prototype=Object.getPrototypeOf(prototype);
    Object.defineProperty(panel.webview,'html',{configurable:true,set(value){const nonce=/script nonce="([^"]+)"/.exec(value)[1];descriptor.set.call(panel.webview,value.replace('<script nonce=',`<script nonce="${nonce}">(${probe.toString()})()</script><script nonce=`));}});return panel;
  };
  vscode.commands.executeCommand=async(name,...args)=>{
    if(/maximize|minimize|Sidebar|sideBar/.test(name))layoutCalls.push(name);
    if(name==='vscode.openWith'&&args[1]==='vscode.markdown.preview.editor'){
      const editor=vscode.window.activeTextEditor;if(editor)selection={uri:editor.document.uri.toString(),text:editor.document.getText(editor.selection),start:editor.document.offsetAt(editor.selection.start)};
    }
    return native.execute(name,...args);
  };
  require('../../src/extension').activate(context);
  if(config.resumeOnly){
    const earlier=JSON.parse(await fs.readFile(path.join(config.artifacts,'native-first-phase.json'),'utf8'));report.checks=earlier.checks;report.phase='cold reopen';
    assert.ok(vscode.workspace.textDocuments.every(d=>!d.isDirty),'disposable cold setup has no dirty buffers');
    await native.execute('workbench.action.closeAllEditors');
    await native.execute('vscode.setEditorLayout',{orientation:0,groups:[{size:0.5},{size:0.5}]});
    const unrelated=await vscode.workspace.openTextDocument(path.join(config.project,'unrelated.txt'));owned.push(unrelated);
    const otherEditor=await vscode.window.showTextDocument(unrelated,{viewColumn:1,preview:false});
    await otherEditor.edit(e=>e.insert(new vscode.Position(0,0),'Cold unsaved '));
    const doc=await vscode.workspace.openTextDocument(path.join(config.project,'learning.md'));owned.push(doc);
    await vscode.window.showTextDocument(doc,{viewColumn:2,preview:false});
    await wait(()=>vscode.window.visibleTextEditors.some(e=>e.document===unrelated&&e.viewColumn===1)&&vscode.window.visibleTextEditors.some(e=>e.document===doc&&e.viewColumn===2),'two native editor groups');
    await new Promise(r=>setTimeout(r,500));
    const coldLayout=await native.execute('vscode.getEditorLayout');report.coldLayout=coldLayout;report.coldPid=process.pid;report.coldEditorGroupCount=vscode.window.tabGroups.all.length;await save();assert.ok(report.coldEditorGroupCount>=2,'multiple native editor groups before product actions');
    await command('resumeStudy',{study:config.studyId});await rendered(/Consecutive integers have opposite parity/);const s=controller.active;
    assert.equal(s.document.uri,doc.uri.toString());
    assert.equal(s.current.draft,'My saved parity work λ');assert.equal(s.solutionReview.open,true);assert.match(s.unresolved,/consecutive/);
    assert.equal(s.questions[1].card,null);assert.deepEqual(s.questions[1].reviews,[]);
    selection=null;await click('document_return');await wait(()=>selection?.text==='## Parity changed','cold-reopen exact Return');
    assert.deepEqual(await native.execute('vscode.getEditorLayout'),coldLayout);assert.ok(unrelated.isDirty);assert.ok(vscode.window.visibleTextEditors.some(e=>e.document===unrelated&&e.viewColumn===1));
    report.checks.push('fresh native extension host reopens saved work, solution review and exact document Return while preserving multiple editor groups and an unrelated dirty pane');
    await stage('cold');report.complete=true;await save();return;
  }
  const imported=await command('importStacksSection');
  const reference=await originalBridge(context.extensionPath,'python3',{method:'outline_reference',store:path.join(context.storageUri.fsPath,'outlines-'+require('../../src/navigation').digest(config.project)),project_root:config.project,id:imported.outline.id,revision:imported.revision,region:null});
  const source=await fs.readFile(path.join(context.extensionPath,'media/document-learning-example.md'),'utf8');
  const file=path.join(config.project,'learning.md'),text=source+'\n## First retained citation\n\n'+reference.markdown+'\n\n## Same retained citation\n\n'+reference.markdown+'\n\n[[OTHER]]\n';
  await fs.writeFile(file,text);await fs.writeFile(path.join(config.project,'OTHER.md'),'# Related fixture note\nOrdinary note link.\n');
  const doc=await vscode.workspace.openTextDocument(file);owned.push(doc);
  await native.execute('vscode.setEditorLayout',{orientation:0,groups:[{size:0.5},{size:0.5}]});
  await vscode.window.showTextDocument(doc,{viewColumn:2,preview:false});
  const otherFile=path.join(config.project,'unrelated.txt');await fs.writeFile(otherFile,'Unrelated editor');const other=await vscode.workspace.openTextDocument(otherFile);owned.push(other);
  const editor=await vscode.window.showTextDocument(other,{viewColumn:1,preview:false});await editor.edit(e=>e.insert(new vscode.Position(0,0),'Unsaved '));
  await wait(()=>vscode.window.activeTextEditor?.document===other,'initial unrelated editor acknowledgement');
  const layout=await native.execute('vscode.getEditorLayout');await native.execute('workbench.view.extension.mrw');
  pick=[doc.uri];const initial=await command('chooseReadingOverview');
  await check('choosing Markdown reveals its native preview and matching Contents while preserving an unrelated dirty pane',async()=>{
    await wait(()=>vscode.window.tabGroups.all.some(g=>g.tabs.some(t=>t.input?.uri?.toString()===doc.uri.toString()&&t.input?.viewType==='vscode.markdown.preview.editor')),'Markdown preview tab');
    assert.match(tree.description,/learning.md/);assert.match(tree.message,/learning.md/);assert.ok(other.isDirty);assert.deepEqual(await native.execute('vscode.getEditorLayout'),layout);
  });
  pick=undefined;const beforeTabs=vscode.window.tabGroups.all.flatMap(g=>g.tabs.map(t=>t.label));await command('chooseReadingOverview');assert.deepEqual(vscode.window.tabGroups.all.flatMap(g=>g.tabs.map(t=>t.label)),beforeTabs);report.checks.push('cancelled document choice preserves native tabs');
  const section=initial.all.find(n=>n.label==='Parity');await command('selectReadingOutlineItem',section);
  await wait(()=>!vscode.window.activeTextEditor,'preview without active text editor');
  const s=await command('sectionProblems',section);assert.equal(s.document.uri,doc.uri.toString());assert.match(s.passages[0].text,/consecutive integers/);assert.doesNotMatch(s.passages[0].text,/Hausdorff/);
  await wait(()=>panels.study?.visible,'problem view');await dom('inspect');report.checks.push('section problems launch from preview without substituting the unrelated retained source');
  await click('enter_problem');await dom('fields',{fields:{Question:'For a nonnegative integer n, show n(n+1) is even.',Activity:'application','Reference answer (optional)':'One of two consecutive integers is even.','Question author':'Codex companion (OpenAI)','Answer author':'Codex companion (OpenAI)'}});await click('question_save');
  await wait(()=>controller.active.questions.length===1&&!controller.active.formDraft,'saved problem');const q=controller.active.questions[0];
  await click('solution_review');await wait(()=>controller.active.solutionReview?.open,'direct review');let view=await rendered(/consecutive integers/);assert.match(view.text,/consecutive integers/);assert.equal(s.current,null);assert.equal(q.card,null);assert.deepEqual(q.reviews,[]);
  await stage('focus');const focus=await dom('focus',{action:'solution_review'});report.focusDiagnostic={...focus.focusState,helpVisible:focus.helpVisible,help:focus.help};await save();assert.ok(focus.helpVisible);assert.match(focus.help,/without creating an attempt or recall grade/);report.checks.push('direct attributed solution review creates no attempt or FSRS grade and supplies keyboard-focus help');
  await dom('fields',{fields:{'Save for later':'Why is one of two consecutive integers even?'}});await click('unresolved');await click('pause');await controller.flush();
  panels.study.dispose();await command('resumeStudy',{study:s.id});await rendered(/Solution/);assert.equal(controller.active.solutionReview.open,true);assert.match(controller.active.unresolved,/consecutive/);report.checks.push('native close/reopen restores problem, direct-review context and unresolved question');
  selection=null;await click('document_return');await wait(()=>selection?.text==='## Parity','Return occurrence');assert.equal(selection.uri,doc.uri.toString());assert.equal(selection.start,section.start);assert.deepEqual(await native.execute('vscode.getEditorLayout'),layout);
  await command('sectionProblems',section);await dom('inspect');await click('choose_question');await wait(()=>controller.active.current&&!controller.active.current.finished,'attempt');
  await dom('fields',{fields:{'Your attempt':'My saved parity work λ'}});await click('solution_review');await wait(()=>controller.active.current.answerExposed,'consultation');assert.equal(controller.active.current.draft,'My saved parity work λ');
  await click('submit');await wait(()=>controller.active.current.submissions.length===1,'submission');await rendered(/Your outcome/);await dom('fields',{fields:{'Your outcome':'help_dependent','Did you consult the source or other help before that submission?':'yes'}});await click('outcome');await wait(()=>controller.active.current.finished,'outcome');assert.equal(q.card,null);report.checks.push('consulted attempt preserves draft and submission exposure without grading an application as recall');
  await click('problem_later');await wait(()=>q.problemLater?.kept,'later problem');assert.equal(q.kept,false);
  await click('enter_problem');await dom('fields',{fields:{Question:'Why is one of two consecutive integers even?',Activity:'missing_step','Reference answer (optional)':'Consecutive integers have opposite parity.'}});await click('question_save');await wait(()=>controller.active.questions.length===2&&!controller.active.formDraft,'recall question');await click('admit');
  await wait(()=>controller.active.questions[1].kept,'admission');view=await rendered(/Due here \(1\)/);assert.match(view.text,/Due here \(1\)/);await click('due_dismiss');await wait(()=>!!controller.active.dueDismissed,'dismiss due offer');assert.equal(controller.active.questions[1].card,null);report.checks.push('whole-problem later work and dismissible admitted recall remain separate');
  const edit=new vscode.WorkspaceEdit();edit.insert(doc.uri,new vscode.Position(0,0),'Unsaved preface\n');await vscode.workspace.applyEdit(edit);
  selection=null;await click('document_return');await wait(()=>selection?.start===section.start+16,'tracked return');assert.equal(selection.text,'## Parity');assert.ok(doc.isDirty);assert.equal(await fs.readFile(file,'utf8'),text);
  assert.equal(other.getText(),'Unsaved Unrelated editor');assert.ok(other.isDirty);assert.deepEqual(await native.execute('vscode.getEditorLayout'),layout);report.checks.push('exact Return tracks outside edits and preserves dirty Markdown, unrelated work and groups');
  await command('openReadingOutline');const refreshed=await command('refreshReadingOutline');const citation=refreshed.all.filter(n=>n.kind==='reference').at(-1);await command('selectReadingOutlineItem',citation);await dom('inspect',{},'source');
  const sourceHelp=await dom('focus',{action:'ask-ai'},'source');assert.ok(sourceHelp.helpVisible);assert.match(sourceHelp.help,/Send is a separate action/);selection=null;await command('returnToReadingOutline');await wait(()=>selection?.start===citation.start,'retained citation Return');assert.equal(selection.text,reference.markdown);report.checks.push('retained reader focus help and exact repeated-citation Return remain operational');
  const nav=await command('refreshReadingOutline'),link=nav.all.find(n=>n.kind==='document_link'&&n.target==='OTHER');await command('selectReadingOutlineItem',link);selection=null;await command('returnToReadingOutline');await wait(()=>selection?.text==='[[OTHER]]','ordinary note-link Return');report.checks.push('ordinary note links and their exact Return remain operational');
  const parity=(await command('refreshReadingOutline')).all.find(n=>n.label==='Parity');await command('sectionProblems',parity);await dom('inspect');
  const current=controller.active;const overlap=new vscode.WorkspaceEdit();overlap.replace(doc.uri,new vscode.Range(doc.positionAt(current.documentContext.origin.start),doc.positionAt(current.documentContext.origin.end)),'## Parity changed');await vscode.workspace.applyEdit(overlap);
  selection=null;await click('document_return');await wait(()=>!!current.returnError,'changed location message');assert.match(current.returnError,/changed or missing/);
  const newNode=(await command('refreshReadingOutline')).all.find(n=>n.label==='Parity changed');await command('sectionProblems',newNode);await dom('inspect');await click('document_return');await wait(()=>selection?.text==='## Parity changed','explicit return relocation');
  await command('sectionProblems',(await command('refreshReadingOutline')).all.find(n=>n.label==='Parity changed'));await dom('inspect');await fs.rename(file,file+'.missing');await click('document_return');await wait(()=>!!current.returnError,'missing origin message');await fs.rename(file+'.missing',file);assert.equal(current.questions.length,2);assert.equal(current.current.draft,'My saved parity work λ');report.checks.push('changed/missing origins are visible, explicit relocation works, and problem work remains saved');
  await click('solution_review');await wait(()=>current.solutionReview?.open,'saved final review');await click('pause');await controller.flush();report.studyId=current.id;
  report.layoutCalls=layoutCalls;assert.deepEqual(layoutCalls,[]);await stage('workflow');
  report.complete=true;await save();
 }catch(error){report.failure=error.stack;await save();}
 finally{
  vscode.window.createTreeView=native.tree;vscode.window.createWebviewPanel=native.panel;vscode.window.showOpenDialog=native.open;vscode.window.showInputBox=native.input;vscode.window.showWarningMessage=native.warning;vscode.window.showErrorMessage=native.error;vscode.commands.executeCommand=native.execute;
  for(const doc of owned)if(doc.isDirty)await doc.save(); // Known disposable files only.
  await controller?.flush().catch(()=>{});await save();
  if(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath===config.project)await native.execute('workbench.action.closeWindow');
 }
}
module.exports={activate:context=>{void run(context).catch(console.error);}};
