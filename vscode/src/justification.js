'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {digest}=require('./navigation'),{outlineHtml}=require('./outlines');
const locations=require('./workspacePaths');
const materialTools=require('./groundsMaterial');
const {hostStoragePath}=require('./hostStorage');
const HEX=/^[a-f0-9]{64}$/;
function goalLabel(request){const goal=request.goal;return goal?.[0]==='atom'?request.claims.find(c=>c.id===goal[1].id)?.display_name||'Selected claim':'Selected claim';}
function registerJustification({vscode,context,register,bridge,rawBridge,projectRoot,reading,show,artifactClients,recorder,selectPassages}){
 let current,opening=0,frozen=false;const views=new Set();
 const cache=()=>{
  const home=hostStoragePath(vscode,context.globalStorageUri);
  if(!home)throw Error('Use a host-local MRW extension installation.');
  return path.join(home,'justification-checkers');
 };
 const project=async()=>{
  const home=hostStoragePath(vscode,context.storageUri);
  if(!home)throw Error('Open a saved workspace to retain justification results.');
  const root=await projectRoot();return {root,store:path.join(home,'justification-'+digest(root))};
 };
 const call=(c,method,fields={},options)=>bridge({method:'route_'+method,store:c.store,project_root:c.root,...fields},options);
 const reportError=e=>void vscode.window.showErrorMessage('MRW: '+e.message);
 const requestOf=c=>c.value?.effective||c.request;
 function send(c){if(c.disposed)return;void c.panel.webview.postMessage({type:'grounds',generation:++c.generation,
  material:c.material||null,materialRevision:c.materialRevision||null,request:requestOf(c),result:c.value?.record.response||null,revision:c.value?.revision||null,
  verification:c.value?.record.verification||null,origin:!!c.origin,busy:c.busy,error:c.error||'',
  proposalRevision:c.proposalRevision||c.value?.material||null,pending:!!c.request,pendingSaved:!!c.intent,title:c.material?(c.material.review?.claims.find(v=>v.id===c.material.review.goal)?.title||c.material.sources[0].title):goalLabel(requestOf(c))});}
 async function progress(title,action){
  const controller=new AbortController();
  return vscode.window.withProgress({location:vscode.ProgressLocation.Notification,title,cancellable:true},async(_p,token)=>{
   const subscription=token.onCancellationRequested(()=>controller.abort());
   try{return await action({signal:controller.signal,timeout:240000});}finally{subscription.dispose();}
  });
 }
 async function setup(){return progress('MRW: building the local justification checker (no downloads)',options=>
  rawBridge({method:'route_setup',assets:path.join(context.extensionPath,'media/route-engine'),cache:cache()},options));}
 async function run(c){
  if(!c.request)throw Error('Choose an explicit context before searching.');
  const request=c.request;
  const checkerCache=cache();
  const notes=vscode.workspace.getConfiguration?.('mrw').get('notesFolder','')||'';
  const staged=await call(c,'stage',{request,origin:locations.encode(c.origin||null,c.root,notes)});
  c.intent=staged.intent;c.origin=locations.decode(staged.origin,c.root);send(c);
  const result=await progress('MRW: checking routes under the displayed admissions',options=>call(c,'run',{request,cache:checkerCache},options));
  if(!c.disposed){c.value=result;c.request=null;c.error='';c.panel.title='Grounds: '+goalLabel(result.effective);}
 }
 async function message(c,value){
  if(value?.type==='ready'){send(c);return;}
  if(c.disposed||value?.generation!==c.generation)return;
  if(c.busy||frozen)return;
  c.busy=true;c.error='';send(c);
  try{
   if(c.material){
    const revision=c.materialRevision;
    if(value.type==='return'){
     if(!c.origin)throw Error('This view has no originating document.');
     await reading.returnToStudy(c.origin);return;
    }
    if(value.type==='copy_material'){
     const schema=JSON.parse(await fs.readFile(path.join(context.extensionPath,'media/grounds-proposal.schema.json'),'utf8'));
     await vscode.env.clipboard.writeText(materialTools.handoff(c.material,schema));
     void vscode.window.setStatusBarMessage?.('MRW: exact selected passages and proposal schema copied for Codex.',5000);return;
    }
    let saved;
    if(value.type==='import_material'){
     const proposal=materialTools.parseClipboard(await vscode.env.clipboard.readText());
     saved=await call(c,'material_import',{revision,proposal});
    }else if(value.type==='edit_material'){
     const claim=c.material.review?.claims.find(v=>v.id===value.claim);
     if(!claim||!['title','text'].includes(value.field))throw Error('Choose a proposed claim summary.');
     const text=await vscode.window.showInputBox({title:value.field==='title'?'Edit claim title':'Edit claim summary',value:claim[value.field],ignoreFocusOut:true});
     if(text===undefined)return;
     saved=await call(c,'material_edit',{revision,claim:claim.id,field:value.field,value:text});
    }else if(value.type==='accept_material'){
     const accepted=await call(c,'material_accept',{revision,selected:value.selected});
     c.proposalRevision=accepted.material;c.material=null;c.materialRevision=null;c.request=accepted.request;c.intent=accepted.intent;
     c.origin=locations.decode(accepted.origin,c.root);c.panel.title='Grounds: '+goalLabel(c.request);return;
    }else return;
    if(saved){c.material=saved.material;c.materialRevision=saved.material_revision;}return;
   }
   if(value.type==='search')await run(c);
   else if(value.type==='proposal_record'){
    const revision=c.proposalRevision||c.value?.material;if(!revision)throw Error('No supplied proposal is attached.');
    const saved=await call(c,'material_read',{revision});await show(JSON.stringify(saved.material,null,2)+'\n','Supplied-and-reviewed-proposal');
   }else if(value.type==='build')await setup();
   else if(value.type==='return'){
    if(!c.origin)throw Error('This view has no originating document.');
    await reading.returnToStudy(c.origin);
   }else if(value.type==='record'){
    if(!c.value)throw Error('Search has not produced a retained result.');
    await show(JSON.stringify(c.value.record,null,2)+'\n','Retained-justification');
   }else if(value.type==='predecessor'){
    const ref=c.value?.record.request.withdrawal?.predecessor;
    if(!ref||!HEX.test(ref))throw Error('This is the initial context.');
    c.value=await call(c,'read',{revision:ref});c.request=null;
   }else if(value.type==='withdraw'){
    if(!c.value||c.request)throw Error('Finish or cancel the pending successor first.');
    const observed=c.value,request=observed.effective,active=new Set(request.context.admissions);
    const choice=await vscode.window.showQuickPick(request.admissions.filter(a=>active.has(a.id)).map(a=>({
      label:a.id.replaceAll('-',' '),description:a.scope,detail:a.rationale,admission:a.id})),
      {title:'Withdraw one ground from this context',placeHolder:'Earlier contexts and source notes will be preserved',matchOnDescription:true});
    if(!choice)return;
    const confirm=await vscode.window.showWarningMessage('Withdraw “'+choice.label+'” and search a successor context? Earlier routes and all source text remain saved.',{modal:true},'Search successor');
    if(confirm!=='Search successor'||c.value!==observed||c.disposed)return;
    const prepared=await call(c,'successor',{revision:observed.revision,removed:[choice.admission],request_id:crypto.randomUUID()});
    c.request=prepared.request;c.value=null;c.intent=null;send(c);await run(c);
   }else if(value.type==='cancel_successor'){
    const ref=c.request?.withdrawal?.predecessor;
    if(!ref)throw Error('No successor is pending.');
    c.value=await call(c,'read',{revision:ref});c.request=null;
   }
  }catch(e){c.error=e.message;reportError(e);}
  finally{c.busy=false;if(c.disposed)views.delete(c);send(c);}
 }
 async function display(scope,request,result,origin,intent=null,prepared=null,proposalRevision=null){
  const panel=vscode.window.createWebviewPanel('mrw.justification','Grounds: '+(prepared?prepared.material.sources[0].title:goalLabel(result?.effective||request)),vscode.ViewColumn.Active||vscode.ViewColumn.One,{enableScripts:true,retainContextWhenHidden:true,localResourceRoots:[]});
  const c={...scope,panel,request,value:result,origin,intent,busy:false,generation:0,disposed:false,material:prepared?.material,materialRevision:prepared?.material_revision,proposalRevision};current=c;views.add(c);
  context.subscriptions.push(panel,panel.onDidDispose(()=>{c.disposed=true;if(!c.busy)views.delete(c);if(current===c)current=undefined;}),
   panel.webview.onDidReceiveMessage(value=>{const action=()=>message(c,value);const known=['search','build','return','record','predecessor','withdraw','cancel_successor','copy_material','import_material','edit_material','accept_material','proposal_record'];void (recorder?.operations&&known.includes(value?.type)?recorder.operations.run('justification.'+value.type,action):action());}),panel.onDidChangeViewState(event=>{if(event.webviewPanel.visible)send(c);}));
  try{
   const support=[];
   for(const name of ['media/markdown-it/markdown-it.js','media/katex/katex.min.js','media/katex/auto-render.min.js','src/mathNegation.js','src/annotationView.js'])support.push(await fs.readFile(path.join(context.extensionPath,name),'utf8'));
   if(c.disposed)return;
   panel.webview.html=outlineHtml(await fs.readFile(path.join(context.extensionPath,'src/justificationView.js'),'utf8'),support,'',{kind:'justification'});
  }catch(error){panel.dispose();throw error;}
  send(c);return c;
 }
 register('mrw.openJustification',async()=>{
  if([...views].some(c=>c.busy)||frozen)throw Error('Wait for the current justification action to finish.');
  const generation=++opening,editor=vscode.window.activeTextEditor,selected=materialTools.capture(editor);
  const origin=editor?.document.uri.scheme==='file'&&editor.document.languageId==='markdown'?{uri:editor.document.uri.toString(),revision:digest(editor.document.getText()),start:editor.document.offsetAt(editor.selection.start),end:editor.document.offsetAt(editor.selection.end)}:reading.currentLocation();
  const scope=await project();
  // These calls share the artifact coordinator's nonblocking process lock.
  const listed=await call(scope,'list'),unfinished=await call(scope,'pending'),materials=await call(scope,'material_list');
  const choice=await vscode.window.showQuickPick([
    ...(selected?[{label:'Use selected Markdown text',kind:'selection',description:'Retain this exact buffer selection; no file save or model call'}]:[]),
    ...(selectPassages?[{label:'Choose saved passages…',kind:'passages',description:'Use explicitly selected retained passages'}]:[]),
    ...materials.materials.map(r=>({label:(r.proposed?'Review proposal: ':'Selected sources: ')+r.title,materialRevision:r.material_revision,description:'Saved source captures · no admission or check'})),
    ...unfinished.pending.map(r=>({label:'Unfinished: '+r.goal,description:'Saved context · search requires an explicit action',intent:r.intent,requestId:r.request_id})),
    ...listed.records.slice().reverse().map(r=>({label:r.goal,description:r.checked+' · '+r.routes+' route(s)',detail:r.predecessor?'Successor context':'Initial context',revision:r.revision})),
    {label:'Explore Euclid’s lemma',kind:'example',description:'Two supplied arguments; arithmetic checking remains separate'},
    {label:'Open an explicit context file…',kind:'file',description:'Reviewed source snapshots and scoped admissions; no registration form'}],
    {title:'Justification',placeHolder:'Open saved grounds or inspect the Euclid example',matchOnDescription:true});
  if(!choice||generation!==opening)return;
  if(choice.materialRevision){
   const saved=await call(scope,'material_read',{revision:choice.materialRevision});
   if(generation===opening)return display(scope,null,null,locations.decode(saved.material.origin,scope.root),null,saved);return;
  }
  if(choice.kind==='selection'||choice.kind==='passages'){
   const sources=choice.kind==='selection'?[selected.source]:materialTools.passages(await selectPassages(scope.root)||[]);
   if(!sources.length||generation!==opening)return;
   const notes=vscode.workspace.getConfiguration?.('mrw').get('notesFolder','')||'';
   const saved=await call(scope,'material_create',{sources,origin:locations.encode(choice.kind==='selection'?selected.origin:origin,scope.root,notes)});
   if(generation===opening)return display(scope,null,null,locations.decode(saved.material.origin,scope.root),null,saved);return;
  }
  if(choice.intent){
   const saved=await call(scope,'resume',{intent:choice.intent});if(generation!==opening)return;
   const destination=locations.decode(saved.origin,scope.root);
   return display(scope,saved.request||null,saved.result||null,destination,saved.intent||null,null,saved.material||null);
  }
  if(choice.revision){const result=await call(scope,'read',{revision:choice.revision});if(generation===opening)return display(scope,null,result,Object.hasOwn(result,'origin')?locations.decode(result.origin,scope.root):origin);return;}
  let prepared;
  if(choice.kind==='example')prepared=await bridge({method:'route_example',path:path.join(context.extensionPath,'media/euclid-grounds.md')});
  else{
    const picked=await vscode.window.showOpenDialog({title:'Open an explicit justification context',canSelectMany:false,filters:{'MRW route context':['json']}});
    if(!picked?.length||generation!==opening)return;
    if(picked[0].scheme!=='file')throw Error('Choose a local context file.');
    const open=vscode.workspace.textDocuments?.find(d=>d.uri.toString()===picked[0].toString());
    if(open?.isDirty)throw Error('Save the context file before using it; its unsaved text has been left intact.');
    const stat=await fs.stat(picked[0].fsPath);if(stat.size>1024*1024)throw Error('The context exceeds 1 MiB.');
    const revision=digest(await fs.readFile(picked[0].fsPath));
    prepared=await bridge({method:'route_prepare',path:picked[0].fsPath,revision});
  }
  if(generation===opening)return display(scope,prepared.request,null,origin);
 });
 register('mrw.setupJustificationChecker',setup);
 artifactClients.push({async freeze(){if([...views].some(c=>c.busy))throw Error('Finish or cancel the justification action before moving saved work.');frozen=true;},async cancelFreeze(){frozen=false;},async release(){frozen=false;}});
 return {get current(){return current;},message};
}
module.exports={registerJustification,goalLabel};
