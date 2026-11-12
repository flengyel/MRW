'use strict';
const fs=require('node:fs'),fsp=require('node:fs/promises'),path=require('node:path');
const {randomUUID}=require('node:crypto');
const {WorkspaceMove,lookup,records,rebase,write,hash,MARKER,DATA,lockRegistry,verifyCandidate}=require('./workspaceMove');
const locations=require('./workspacePaths');
function session(vscode,nativeContext){
  const workspace=nativeContext.storageUri&&vscode.workspace.workspaceFile?.fsPath;
  const registry=nativeContext.globalStorageUri?.fsPath&&path.join(nativeContext.globalStorageUri.fsPath,'workspace-moves-v1');
  const root=workspace&&path.dirname(workspace);
  const notesFolder=()=>vscode.workspace.getConfiguration?.('mrw').get('notesFolder','');
  const decode=value=>locations.decode(value,root),encode=value=>locations.encode(value,root,notesFolder());
  let record=workspace&&registry?lookup(registry,workspace):undefined;
  let frozen=false,inflight=0;const panels=new Set();let mementoTail=Promise.resolve(),values,lease;
  const relocated=record?.phase==='committed'&&record.destinationWorkspace===workspace;
  let blocked=record&&(record.phase==='preparing'||record.phase==='aborted'||record.sourceWorkspace===workspace&&record.phase==='committed');
  const bindingHome=relocated?record.newHome:nativeContext.storageUri?.fsPath;
  const bindingFile=bindingHome&&path.join(bindingHome,'artifact-runtime/active-store.json');
  if(!record&&registry&&bindingFile&&fs.existsSync(bindingFile)){const binding=JSON.parse(fs.readFileSync(bindingFile,'utf8'));const moved=records(registry).find(r=>r.phase==='committed'&&require('./workspaceMove').inside(r.source,binding.location));if(moved){record=moved;blocked=true;}}
  if(workspace&&fs.existsSync(path.join(path.dirname(workspace),MARKER))&&!record)throw Error('This workspace snapshot has no committed move authority on this host. Open the original workspace or recover the move.');
  if(relocated){
    const marker=JSON.parse(fs.readFileSync(path.join(path.dirname(workspace),MARKER),'utf8'));
    if(marker.id!==record.id||marker.registry!==registry)throw Error('Workspace move marker differs from its authority.');
    values=decode(JSON.parse(fs.readFileSync(path.join(record.destination,DATA,'workspace-state.json'),'utf8')));
  }
  function assertWritable(){
    if(frozen)throw Error('Workspace move in progress. Open the committed destination or recover the move before continuing.');
    const current=workspace&&registry?lookup(registry,workspace):undefined;
    if(bindingFile&&registry&&fs.existsSync(bindingFile)){const b=JSON.parse(fs.readFileSync(bindingFile,'utf8'));if(records(registry).some(r=>r.phase==='committed'&&require('./workspaceMove').inside(r.source,b.location)))throw Error('This saved store moved with another workspace. Run MRW: Recover Workspace Move.');}
    if(current&&(current.phase==='preparing'||current.phase==='aborted'||current.phase==='committed'&&current.sourceWorkspace===workspace))throw Error('This workspace is moving or has moved. Run MRW: Recover Workspace Move.');
  }
  const state={keys:()=>values?Object.keys(values):nativeContext.workspaceState.keys(),get:(key,fallback)=>values?(values[key]??fallback):decode(nativeContext.workspaceState.get(key,fallback)),update:(key,value)=>{
    try{assertWritable();}catch(e){return Promise.reject(e);}
    const captured=value===undefined?undefined:structuredClone(value);
    if(!values){const job=mementoTail.then(async()=>{await ready;assertWritable();return nativeContext.workspaceState.update(key,encode(captured));});mementoTail=job.catch(()=>{});return job;}
    const job=mementoTail.then(async()=>{await ready;assertWritable();const next={...values};if(captured===undefined)delete next[key];else next[key]=captured;await write(path.join(record.destination,DATA,'workspace-state.json'),encode(next));values=next;});mementoTail=job.catch(()=>{});return job;
  }};
  const route=async target=>{const result={...target};const all=records(registry||'').filter(r=>r.phase==='committed');
    for(let step=0;step<32;step++){
      const source=typeof result.workspace==='string'?decodeURIComponent(new URL(result.workspace).pathname):undefined;
      const r=all.find(r=>r.sourceWorkspace===source);if(!r)return result;
      const u=new URL(result.workspace);u.pathname=r.destinationWorkspace;result.workspace=u.href;
      if(result.project)result.project=rebase(result.project,r.mappings);
      if(result.notes)result.notes=rebase(result.notes,[[r.source,r.destination]]);
    }throw Error('Workspace routing cycle.');
  };
  const context=new Proxy(nativeContext,{get:(target,key)=>key==='workspaceState'?state:key==='storageUri'&&relocated?vscode.Uri.file(record.newHome):key==='mrwRoute'?route:key==='mrwStore'?encode:key==='mrwIdentityRoot'?value=>rebase(value,(record?.mappings||[]).toReversed().map(([a,b])=>[b,a])):key==='mrwRebase'?value=>rebase(decode(value),record?.mappings||[]):Reflect.get(target,key,target)});
  let ready=Promise.resolve();
  if(workspace&&registry&&!blocked&&vscode.workspace.isTrusted!==false){
    ready=(async()=>{
      const unlock=await lockRegistry(registry,{wait:true});try{assertWritable();
      if(relocated&&!record.opened){
        await verifyCandidate(record);
        record={...record,opened:true};await write(path.join(registry,record.id+'.json'),record);
      }
      const directory=path.join(registry,'sessions');await fsp.mkdir(directory,{recursive:true,mode:0o700});
      lease=path.join(directory,randomUUID()+'.json');await write(lease,{pid:process.pid,workspace,privateHome:context.storageUri.fsPath});
      }finally{await unlock();}
    })();
    nativeContext.subscriptions.push({dispose(){if(lease)void fsp.unlink(lease).catch(()=>{});}});
  }
  ready.catch(e=>vscode.window?.showErrorMessage?.('MRW: '+e.message));
  async function others(){
    await ready;if(!registry)return;
    const dir=path.join(registry,'sessions');
    for(const name of await fsp.readdir(dir)){
      const file=path.join(dir,name);if(file===lease)continue;
      let other;try{other=JSON.parse(await fsp.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')continue;throw e;}if(other.workspace!==workspace){const f=other.privateHome&&path.join(other.privateHome,'artifact-runtime/active-store.json');if(!f||!fs.existsSync(f)||!require('./workspaceMove').inside(path.dirname(workspace),JSON.parse(fs.readFileSync(f,'utf8')).location))continue;}
      try{process.kill(other.pid,0);}catch(e){if(e.code==='ESRCH')continue;throw e;}
      throw Error('Another MRW window is using this workspace. Close that window before moving it.');
    }
  }
  const api={workspace,registry,context,get blocked(){return blocked;},get frozen(){return frozen;},get record(){return record;},ready,
    async run(action){await ready;assertWritable();inflight++;try{return await action();}finally{inflight--; }},
    async freeze(){await ready;assertWritable();if(inflight)throw Error('Wait for current MRW actions to finish before moving.');await others();frozen=true;for(const p of panels)await p.webview.postMessage({type:'workspace_freeze',frozen:true});},
    unfreeze(){frozen=false;for(const p of panels)void p.webview.postMessage({type:'workspace_freeze',frozen:false});},async flushState(){await mementoTail;},
    snapshot:()=>Object.fromEntries(state.keys().map(key=>[key,state.get(key)])),
    async recover(){const r=lookup(registry,workspace)||record||(bindingFile&&fs.existsSync(bindingFile)&&records(registry).find(r=>r.phase==='committed'&&require('./workspaceMove').inside(r.source,JSON.parse(fs.readFileSync(bindingFile,'utf8')).location)));if(!r)throw Error('No workspace move needs recovery.');return new WorkspaceMove(registry).recover(r.id);},
    rebaseRoute:route,
    defaultWorkspace(original){let next=original;for(let i=0;i<32;i++){const r=lookup(registry||'',next);if(!r||r.phase!=='committed'||r.destinationWorkspace===next)return next===original?undefined:{directory:path.dirname(next),workspace:next,created:false};next=r.destinationWorkspace;}throw Error('Workspace routing cycle.');},
    panels,checkOtherWindows:others,
    assertWritable,guardEvent:fn=>(...args)=>{try{assertWritable();}catch{return;}return fn(...args);},
    async restoreTabs(){
      await ready;if(!relocated||state.get('mrw.move.tabsRestored')===record.id)return;
      const tabs=decode(JSON.parse(await fsp.readFile(path.join(record.destination,DATA,'tabs.json'),'utf8')));
      for(const t of tabs){const uri=vscode.Uri.parse(t.uri);if(uri.scheme!=='file')continue;
        if(t.viewType)await vscode.commands.executeCommand('vscode.openWith',uri,t.viewType,{preview:false,viewColumn:t.column,preserveFocus:!t.active});
        else {const doc=await vscode.workspace.openTextDocument(uri),ed=await vscode.window.showTextDocument(doc,{preview:false,viewColumn:t.column,preserveFocus:!t.active});
          if(t.selection&&(!t.revision||hash(doc.getText())===t.revision)){const a=t.selection.start,b=t.selection.end;ed.selection=new vscode.Selection(a.line,a.character,b.line,b.character);ed.revealRange(ed.selection);}}
      }await state.update('mrw.move.tabsRestored',record.id);
    }
  };
  return api;
}
function guardWindow(window,owner){return new Proxy(window,{get(target,key){
  if(key==='registerTreeDataProvider')return(id,provider)=>target.registerTreeDataProvider(id,id==='mrw.research'?new Proxy(provider,{get(p,k){if(k==='getChildren')return(...args)=>owner.run(()=>p.getChildren(...args)).catch(()=>[]);const v=p[k];return typeof v==='function'?v.bind(p):v;}}):provider);
  if(key==='registerUriHandler')return handler=>target.registerUriHandler({handleUri:uri=>owner.run(()=>handler.handleUri(uri)).catch(e=>target.showErrorMessage('MRW: '+e.message))});
  if(key==='createWebviewPanel')return (...args)=>{
    const panel=target.createWebviewPanel(...args);owner.panels.add(panel);panel.onDidDispose(()=>owner.panels.delete(panel));
    const webview=new Proxy(panel.webview,{get(w,k){if(k==='onDidReceiveMessage')return(fn,...rest)=>w.onDidReceiveMessage(m=>{
      if(['storageStatus','lifecycle_checkpoint'].includes(m?.type))return fn(m);
      if(owner.frozen)return;
      return owner.run(()=>fn(m)).catch(e=>w.postMessage({type:'error',message:e.message,writesBlocked:true}));
    },...rest);const v=w[k];return typeof v==='function'?v.bind(w):v;},set(w,k,value){
      if(k==='html'&&typeof value==='string'){const nonce=/<script nonce="([^"]+)"/.exec(value)?.[1];if(nonce)value=value.replace('</body>',`<script nonce="${nonce}">window.addEventListener('message',e=>{if(e.data?.type==='workspace_freeze')document.body.inert=!!e.data.frozen;});</script></body>`);}
      w[k]=value;return true;
    }});
    return new Proxy(panel,{get(p,k){if(k==='webview')return webview;if(typeof p[k]==='function'&&String(k).startsWith('onDid'))return(fn,...args)=>p[k](owner.guardEvent(fn),...args);const v=p[k];return typeof v==='function'?v.bind(p):v;}});
  };
  const v=target[key];if(typeof v==='function'&&String(key).startsWith('onDid'))return(fn,...args)=>v.call(target,owner.guardEvent(fn),...args);
  return typeof v==='function'?v.bind(target):v;
}});}
function hasDirty(vscode){return (vscode.workspace.textDocuments||[]).some(d=>d.isDirty)||(vscode.workspace.notebookDocuments||[]).some(d=>d.isDirty)||(vscode.window.tabGroups?.all||[]).some(g=>g.tabs.some(t=>t.isDirty));}
function registerWorkspaceMove({vscode,context,register,session:owner,clients,study,recorder,bridge}){
  if(owner.blocked&&vscode.window.registerUriHandler)context.subscriptions.push(vscode.window.registerUriHandler({handleUri:async uri=>{try{
    const r=await owner.recover();if(r.phase!=='committed')throw Error('The move did not commit. Run Recover Workspace Move before following this link.');
    const choice=await vscode.window.showWarningMessage('This workspace moved. Open its destination, then run MRW: Open Link from Clipboard to follow this link.','Copy link and open moved workspace');
    if(choice==='Copy link and open moved workspace'){await vscode.env.clipboard.writeText(uri.toString(true));await hostOpen(r);}
  }catch(e){void vscode.window.showErrorMessage('MRW: '+e.message);}}}));
  const hostOpen=r=>{if(hasDirty(vscode))throw Error('Save or copy unsaved changes before opening the moved workspace. Edits made after the move remain at their original location.');return vscode.commands.executeCommand('vscode.openFolder',vscode.Uri.file(r.destinationWorkspace),{forceReuseWindow:true});};
  async function offer(r){
    const choice=await vscode.window.showInformationMessage(`MRW workspace moved to ${r.destination}. The original is retained.`, 'Open moved workspace');
    if(choice==='Open moved workspace')return hostOpen(r);
  }
  register('mrw.recoverWorkspaceMove',async()=>{
    const r=await owner.recover();
    if(r.phase==='aborted'){
      if(owner.blocked){const choice=await vscode.window.showInformationMessage('The original workspace remains authoritative. The incomplete destination was preserved.','Open original workspace');if(choice==='Open original workspace'){if(owner.workspace===r.sourceWorkspace)return vscode.commands.executeCommand('workbench.action.reloadWindow');return vscode.commands.executeCommand('vscode.openFolder',vscode.Uri.file(r.sourceWorkspace),{forceReuseWindow:true});}return;}
      owner.unfreeze();recorder?.resumeAfterMove?.();for(const client of clients||[])await client.release();
      void vscode.window.showInformationMessage('The move did not commit. The original workspace remains authoritative; the incomplete destination was preserved.');
    }else return offer(r);
  });
  register('mrw.moveWorkspace',async()=>{
    if(owner.blocked)throw Error('Recover the earlier workspace move before starting another.');
    if(!owner.workspace||!owner.registry)throw Error('Save this Linux session as a .code-workspace file before moving it.');
    const destination=await vscode.window.showInputBox({title:'Move MRW Workspace',prompt:'New absolute Linux directory. It must not already exist. External notes folders stay in place.',ignoreFocusOut:true});
    if(destination===undefined)return;
    if(process.platform!=='linux'||!path.isAbsolute(destination))throw Error('Choose an absolute Linux directory.');
    const type=Number((await fsp.statfs(path.dirname(destination))).type)>>>0;
    if([0x9fa0,0x5346544e,0xff534d42,0x517b,0x6969,0x01021994,0x858458f6].includes(type))throw Error('Choose a persistent Linux filesystem; Windows, network and temporary mounts are not supported for workspace moves.');
    const dirty=()=>hasDirty(vscode);
    if(dirty())throw Error('Save or close your unsaved documents before moving. Your drafts were left open.');
    const answer=await vscode.window.showWarningMessage(`Move the workspace folder, MRW studies, drafts, history and document locations to ${destination}? External notes folders and shared stores stay in place. The original is retained until you verify the destination. Close other MRW windows using this workspace first.`,{modal:true},'Move workspace');
    if(answer!=='Move workspace')return;
    const frozen=[];let committed=false;
    try{
      // Finish the webview checkpoints before closing the input gate. Refuse
      // unsent Ask/reader drafts; saved study drafts are explicitly checkpointed.
      for(const client of clients){try{await client.freeze(false);frozen.push(client);}catch(e){await client.cancelFreeze?.();throw e;}}
      await study.prepareMove();await owner.flushState();await owner.freeze();
      await recorder.pauseForMove();
      if(dirty())throw Error('A document acquired unsaved changes; no workspace was moved.');
      const tabs=(vscode.window.tabGroups?.all||[]).flatMap(group=>group.tabs.filter(t=>t.input?.uri?.scheme==='file').map(t=>{
        const editor=vscode.window.visibleTextEditors?.find(e=>e.document.uri.toString()===t.input.uri.toString());
        const point=p=>({line:p.line,character:p.character});
        return {uri:t.input.uri.toString(),viewType:t.input.viewType||t.input.notebookType,active:t.isActive,column:group.viewColumn,
          selection:editor?{start:point(editor.selection.start),end:point(editor.selection.end)}:undefined,
          revision:editor?hash(editor.document.getText()):undefined};
      }));
      const configuration=vscode.workspace.getConfiguration('mrw'),settings={};
      for(const key of ['notesFolder','leanStudyParent','navigationWorkspaceUri']){const value=configuration.get(key,'');if(typeof value==='string'&&rebase(value,[[path.dirname(owner.workspace),destination]])!==value)settings['mrw.'+key]=value;}
      const result=await new WorkspaceMove(owner.registry,{checkpoint:async phase=>{if(phase==='intent')await owner.checkOtherWindows();if(['verified','committed'].includes(phase)&&dirty())throw Error('A document changed during the move; recover before continuing.');}}).move({workspace:owner.workspace,destination,privateHome:context.storageUri.fsPath,state:owner.snapshot(),tabs,bridge,historySession:recorder.session,settings,notesFolder:vscode.workspace.getConfiguration('mrw').get('notesFolder','')});
      committed=true;return await offer(result);
    }finally{
      const record=lookup(owner.registry,owner.workspace);
      if(!committed&&record?.phase!=='committed'&&record?.phase!=='preparing'){
        owner.unfreeze();recorder.resumeAfterMove();for(const client of frozen)await client.release();
      }
    }
  });
}
module.exports={session,registerWorkspaceMove,guardWindow,hasDirty};
