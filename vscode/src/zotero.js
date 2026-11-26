'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { ZoteroApi, attachmentPath, cancelled } = require('./zoteroApi');
const { ZoteroRecords, validateItem, plain, markdown, zoteroLink, makeLink, parseLink, citation, digest } = require('./zoteroRecords');
const { workspaceRoute } = require('./companionLinks');
const STATE = 'mrw.zotero.v1';
function registerZotero({ vscode, context, register, reading, show, onCancel=()=>{}, apiFactory = transport => new ZoteroApi(transport), records }) {
  records ||= new ZoteroRecords(path.join(context.storageUri?.fsPath || context.globalStorageUri.fsPath, 'zotero-v1'));
  let busy = false;
  const saved = () => context.workspaceState.get(STATE, {});
  async function persist(value) { await context.workspaceState.update(STATE, {...saved(), ...value}); }
  const progress = action => vscode.window.withProgress({location:vscode.ProgressLocation.Notification, title:'Zotero', cancellable:true}, async (_p,token)=>{
    if(token.isCancellationRequested)throw cancelled();
    const result=await action(token);if(token.isCancellationRequested)throw cancelled();return result;
  });
  async function locked(action) {
    if (busy) throw Error('A Zotero action is in progress. Finish or cancel it first.');
    busy=true;
    try { return await action(); }
    catch(error){if(error.code==='MRW_ZOTERO_CANCELLED'){onCancel();return;}throw error;}
    finally { busy=false; }
  }
  function route() {
    const root = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!root) throw Error('Open a workspace before retaining Zotero references.');
    return workspaceRoute(vscode,root);
  }
  function origin() {
    const editor=vscode.window.activeTextEditor, doc=editor?.document;
    if (doc?.uri.scheme==='file' && /\.(md|markdown)$/i.test(doc.uri.fsPath)) return {uri:doc.uri.toString(),revision:digest(doc.getText()),start:doc.offsetAt(editor.selection.start),end:doc.offsetAt(editor.selection.end)};
    return reading.currentLocation();
  }
  async function connect(token) {
    const choices=[{label:'Zotero on this Linux host',transport:'local',description:'Read-only loopback API'}];
    if(vscode.env.remoteName==='wsl') choices.unshift({label:'Windows Zotero from WSL',transport:'windows',description:'Windows loopback; no port forwarding'});
    const choice=await vscode.window.showQuickPick(choices,{title:'Connect Zotero'}); if(!choice)return;
    const api=apiFactory(choice.transport); const capabilities=await api.probe(token);
    const groups=await api.groups(token);
    if(!Array.isArray(groups)||groups.length>100)throw Error('Invalid Zotero group list.');
    const libraries=[{label:'My Library',library:{type:'user',id:0}}];
    for(const g of groups)if(Number.isSafeInteger(g.id)&&g.id>0)libraries.push({label:plain(g.data?.name||g.name||`Group ${g.id}`),library:{type:'group',id:g.id}});
    const selected=await vscode.window.showQuickPick(libraries,{title:'Choose Zotero library',placeHolder:groups.length===100?'First 100 groups shown':'References remain managed by Zotero'}); if(!selected)return;
    if(token?.isCancellationRequested)return;
    await persist({connection:{transport:choice.transport,library:selected.library,serverId:capabilities.serverId}});
    return {api,library:selected.library};
  }
  async function connection(token, record) {
    const binding=saved().connection;
    if(!binding) { if(record)throw Error('Connect the original Zotero library before reading current data. The saved reference remains available offline.'); return connect(token); }
    if(record&&(record.api.transport!==binding.transport||record.library.type!==binding.library.type||String(record.library.id)!==String(binding.library.id)||record.api.serverId!==binding.serverId))throw Error('This reference belongs to a different Zotero connection. Connect its original library; do not redirect the retained citation.');
    const api=apiFactory(binding.transport); api.serverId=binding.serverId||undefined;
    await api.probe(token); return {api,library:binding.library};
  }
  async function retain(api,library,key,from,token) {
    const item=validateItem(await api.item(library,key,token),library,key);
    if(['attachment','note'].includes(item.data.itemType))throw Error('Select a bibliographic item.');
    const record={schema:'mrw.zotero-reference.v1',api:{...api.capabilities},library,item,acquiredAt:new Date().toISOString(),origin:from||null};
    const id=await records.save(record); await persist({last:id}); return {id,record};
  }
  async function find() {
    const from=origin(); route();
    const connected=await progress(token=>connection(token)); if(!connected)return;
    const query=await vscode.window.showInputBox({title:'Find Zotero reference',prompt:'Title, author or phrase',validateInput:value=>!value.trim()?'Enter a search phrase.':value.length>256?'Use at most 256 characters.':undefined});
    if(!query?.trim())return;
    let start=0;
    for(;;){
      const items=await progress(token=>connected.api.search(connected.library,query,start,token));
      if(!Array.isArray(items)||items.length>50)throw Error('Invalid Zotero search results.');
      const choices=items.filter(i=>!['note','attachment'].includes(i.data?.itemType)).map(item=>{
        validateItem(item,connected.library); return {label:plain(item.data.title)||item.key,description:plain((item.data.creators||[]).map(c=>c.name||[c.firstName,c.lastName].filter(Boolean).join(' ')).join('; ')),detail:`${plain(item.data.date)} · ${item.key}`,key:item.key};
      });
      if(items.length===50)choices.push({label:'Next 50 references…',more:true});
      if(!choices.length){await vscode.window.showInformationMessage('No matching Zotero references.');return;}
      const picked=await vscode.window.showQuickPick(choices,{title:'Zotero references',matchOnDescription:true}); if(!picked)return;
      if(picked.more){start+=50;continue;}
      const selected=await progress(token=>retain(connected.api,connected.library,picked.key,from,token));
      return actions(selected.id,selected.record);
    }
  }
  async function openAttachment(id, record) {
    const from=origin();
    if(!record.attachment){
      const selection=await progress(async token=>{
        const {api,library}=await connection(token,record);
        const current=validateItem(await api.item(library,record.item.key,token),library,record.item.key);
        if(JSON.stringify(current.data)!==JSON.stringify(record.item.data)||current.version!==record.item.version)throw Error('Zotero metadata changed. Choose Read current metadata to retain a new reference; the earlier citation stays unchanged.');
        const choices=[];let start=0;
        for(;;){
          const children=await api.children(library,record.item.key,start,token);
          if(!Array.isArray(children)||children.length>50)throw Error('Invalid Zotero attachment list.');
          for(const child of children)if(child.data?.itemType==='attachment'){
            validateItem(child,library); if(child.data.parentItem!==record.item.key)throw Error('Zotero attachment has a different parent.');
            choices.push({label:plain(child.data.title)||plain(child.data.filename)||child.key,description:plain(child.data.contentType),detail:child.key,item:child});
          }
          if(children.length<50)break;
          start+=50;if(start>=500)throw Error('This item has over 500 children. Open the attachment in Zotero.');
        }
        if(!choices.length){await vscode.window.showInformationMessage('No attachments are listed for this reference.');return;}
        const picked=await vscode.window.showQuickPick(choices,{title:'Open Zotero attachment',placeHolder:'Retain this file’s exact bytes for offline reopening (up to 128 MiB)'}); if(!picked||token.isCancellationRequested)return;
        const url=await api.file(library,picked.item.key,token);
        let retained;
        try { retained=await records.retainAttachment(attachmentPath(url,api.transport),token); }
        catch(error){if(['ENOENT','EACCES'].includes(error.code))throw Error('The selected Zotero attachment file is unavailable on this host. No other attachment was substituted.');throw error;}
        const after=validateItem(await api.item(library,picked.item.key,token),library,picked.item.key);
        if(JSON.stringify(after.data)!==JSON.stringify(picked.item.data)||after.version!==picked.item.version)throw Error('Attachment metadata changed while retaining the file. Select it again.');
        const next={...record,attachment:{...retained,item:after},derivedFrom:id,acquiredAt:new Date().toISOString()};
        const nextId=await records.save(next); await persist({last:nextId});return {id:nextId,record:next};
      });
      if(!selection)return; id=selection.id;record=selection.record;
    }
    const file=await records.verifiedFile(record.attachment);
    const opened=await reading.openLinkedDocument(vscode.Uri.file(file),from);
    if(opened)await persist({last:id});
    return opened;
  }
  async function insert(record,id) {
    const editor=vscode.window.activeTextEditor,doc=editor?.document;
    if(!doc||!['file','untitled'].includes(doc.uri.scheme)||doc.languageId!=='markdown')throw Error('Focus a Markdown note, then run Resume Zotero Reference to insert the citation.');
    const version=doc.version,selection=editor.selection;
    if(doc.uri.scheme==='file')await reading.checkFile(doc.uri);
    const text=citation(record,makeLink(route(),id,vscode.env.uriScheme||'vscode'));
    if(doc.isClosed||doc.version!==version||vscode.window.activeTextEditor!==editor||!editor.selection.isEqual(selection))throw Error('The note or selection changed. Insert again at the intended location.');
    if(!await editor.edit(edit=>edit.insert(selection.active,text),{undoStopBefore:true,undoStopAfter:true}))throw Error('The editor declined the citation. The draft was not saved.');
  }
  async function actions(id,record) {
    const choice=await vscode.window.showQuickPick([
      {label:record.attachment?'Open retained attachment':'Open attachment…',action:'attachment'},
      {label:'Insert citation in note',action:'insert'},
      {label:'Copy citation',action:'copy'},
      {label:'Copy reference link',action:'link'},
      {label:'Open in Zotero',action:'zotero',description:'Current library item; may differ from the retained metadata'},
      {label:'Inspect retained reference',action:'inspect'},
      ...(record.origin?[{label:'Return to originating note',action:'return',description:'Restore its saved location when the text still matches'}]:[]),
      {label:'Read current metadata',action:'refresh',description:'Retain a new reference; keep earlier citations'},
    ],{title:plain(record.item.data.title)||record.item.key,placeHolder:`${record.library.type} ${record.library.id} · ${record.item.key} · local version ${record.item.version}`});
    if(!choice)return;
    if(choice.action==='attachment')return openAttachment(id,record);
    if(choice.action==='insert')return insert(record,id);
    if(choice.action==='copy')return vscode.env.clipboard.writeText(citation(record,makeLink(route(),id,vscode.env.uriScheme||'vscode')));
    if(choice.action==='link')return vscode.env.clipboard.writeText(`[${markdown(record.item.data.title)}](${makeLink(route(),id,vscode.env.uriScheme||'vscode')})`);
    if(choice.action==='zotero'){
      if(!await vscode.env.openExternal(vscode.Uri.parse(zoteroLink(record.library,record.item.key))))throw Error('Zotero could not open this reference.');return;
    }
    if(choice.action==='inspect')return show(JSON.stringify({id,...record},null,2),'Retained-Zotero-reference');
    if(choice.action==='return')return reading.returnToStudy(record.origin);
    if(choice.action==='refresh'){
      const next=await progress(async token=>{const {api,library}=await connection(token,record);return retain(api,library,record.item.key,origin()||record.origin,token);});
      return actions(next.id,next.record);
    }
  }
  async function resume(id) {
    if(!id){
      // Discover immutable records too: a failed last-selection write must not hide them.
      const directory=path.join(records.root,'references');
      const entries=await fs.readdir(directory).catch(e=>{if(e.code==='ENOENT')return [];throw e;});
      const ids=entries.filter(n=>/^[a-f0-9]{64}\.json$/.test(n)).map(n=>n.slice(0,-5));
      if(!ids.length)throw Error('Find a Zotero reference first.');
      const last=saved().last;if(ids.includes(last))ids.splice(ids.indexOf(last),1),ids.unshift(last);
      const choices=[];
      for(const key of ids.slice(0,500)){const record=await records.load(key);choices.push({label:plain(record.item.data.title)||record.item.key,description:`${record.item.key} · version ${record.item.version}${record.attachment?' · attachment retained':''}`,detail:record.acquiredAt,id:key,record});}
      const chosen=await vscode.window.showQuickPick(choices,{title:'Resume Zotero reference',placeHolder:ids.length>500?'First 500 retained references; exact citation links remain available':'Saved metadata and retained attachments reopen offline'});if(!chosen)return;
      id=chosen.id;
    }
    const record=await records.load(id);await persist({last:id});return actions(id,record);
  }
  register('mrw.connectZotero',()=>locked(()=>progress(connect)));
  register('mrw.findZoteroReference',()=>locked(find));
  register('mrw.resumeZoteroReference',()=>locked(()=>resume()));
  async function handleUri(uri) {
    if(uri.path!=='/zotero')return false;
    let target=parseLink(uri.toString(),vscode.env.uriScheme||'vscode');
    if(context.mrwRoute)target=await context.mrwRoute(target);
    if(target.workspace!==route())throw Error('This retained Zotero link belongs to a different workspace. Open that workspace and use Open Link from Clipboard.');
    await locked(()=>resume(target.id));return true;
  }
  return {handleUri};
}
module.exports={registerZotero};
