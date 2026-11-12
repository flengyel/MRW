'use strict';
const path = require('node:path');
const {workspaceRoute,validateWorkspaceRoute} = require('./companionLinks');
const validId = value => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(value);
function parseLink(value,scheme='vscode') {
  if(typeof value!=='string'||value.length>16384)throw Error('Invalid retained notebook link.');
  const u=new URL(value),pairs=[...u.searchParams],target=u.searchParams.get('target');
  if(u.protocol!==`${scheme}:`||u.host!=='flengyel.mrw'||u.pathname!=='/notebook-result'||u.hash||u.username||u.password||u.port||
     pairs.length!==2||new Set(pairs.map(p=>p[0])).size!==2||u.searchParams.get('v')!=='1'||!target||!/^[\w-]+$/u.test(target))
    throw Error('Invalid retained notebook link.');
  const raw=Buffer.from(target,'base64url');
  if(raw.toString('base64url')!==target)throw Error('Invalid retained notebook encoding.');
  const parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));
  if(!parsed||Object.keys(parsed).sort().join(',')!=='id,workspace'||!validId(parsed.id))throw Error('Invalid retained notebook target.');
  return {workspace:validateWorkspaceRoute(parsed.workspace),id:parsed.id};
}
function registerNotebookResults({vscode,context,register,bridge,show,recorder}) {
  const version=context.extension?.packageJSON?.version||require('../package.json').version;
  const software={version,commit:recorder?.software?.version===version&&!recorder.software.localChanges?recorder.software.commit||'unknown':'unknown'};
  const call=(method,fields={})=>{
    if(!context.storageUri?.fsPath)throw Error('Open a saved workspace before retaining notebook results.');
    return bridge({method:`notebook_${method}`,store:path.join(context.storageUri.fsPath,'calculations-v1'),...fields});
  };
  const root=()=>vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const route=()=>{if(!root())throw Error('Open the result’s workspace first.');return workspaceRoute(vscode,root());};
  const event=(action,ids)=>recorder?.record(`notebook_${action}`,{ids},'observed_action',{});
  function dirty(paths) {
    const docs=[...(vscode.workspace.notebookDocuments||[]),...(vscode.workspace.textDocuments||[])];
    if(docs.some(d=>d.isDirty&&paths.includes(d.uri.fsPath)))throw Error('Save the selected notebook and companion files before retaining their saved bytes.');
  }
  async function select(many=false,exclude) {
    const {results}=await call('list');
    const choices=results.filter(r=>r.id!==exclude).map(r=>({label:r.title,description:r.evidence,detail:`${r.captured} · ${r.id}`,result:r}));
    if(!choices.length)throw Error('No retained notebook results are available. Use Retain Notebook Result on a saved notebook.');
    const selected=await vscode.window.showQuickPick(choices,{title:many?'Export notebook provenance':'Open retained notebook result',canPickMany:many,matchOnDescription:true,matchOnDetail:true});
    return many?selected?.map(x=>x.result):selected?.result;
  }
  async function open(id,presentation) {
    const result=await call('read',{id});
    const uri=await show(result.body,'Notebook-result',undefined,presentation);
    event('open',[id]);return {result,uri};
  }
  async function exportSelected(ids) {
    const dest=await vscode.window.showSaveDialog({title:'Export exact notebooks, companions and provenance (includes saved metadata)',filters:{'Provenance archive':['zip']},saveLabel:'Export'});
    if(!dest)return;
    if(dest.scheme!=='file')throw Error('Choose a local ZIP path on this extension host.');
    const result=await call('export',{ids,destination:dest.fsPath});event('export',ids);
    await vscode.window.showInformationMessage(`Exported ${result.bundles} provenance accounts. SHA-256: ${result.sha256}`);
    return result;
  }
  async function actions(id) {
    const {result}=await open(id);
    const options=[{label:'Compare with another retained result',action:'compare'},
      {label:'Read a retained companion file',action:'companion'},
      {label:'Copy link to this result',action:'link'},
      {label:'Export provenance and exact files…',action:'export'},
      {label:'Delete this retained result…',action:'delete'}];
    const choice=await vscode.window.showQuickPick(options.filter(x=>x.action!=='companion'||result.artifacts.length>1),{title:result.title,placeHolder:'The result is open. Escape leaves it open.'});
    if(!choice)return;
    if(choice.action==='compare') {
      const other=await select(false,id);if(!other)return;
      const left=await open(id,{show:false}),right=await open(other.id,{show:false});
      await vscode.commands.executeCommand('vscode.diff',left.uri,right.uri,`${result.title} ↔ ${other.title}`,{preview:false});
      event('compare',[id,other.id]);
    } else if(choice.action==='companion') {
      const item=await vscode.window.showQuickPick(result.artifacts.slice(1).map((a,i)=>({label:a.name,description:a.sha256,index:i+1})),{title:'Retained companion files'});
      if(item){const saved=await call('companion',{id,index:item.index});await show(saved.body,saved.title);}
    } else if(choice.action==='link') {
      const params=new URLSearchParams({v:'1',target:Buffer.from(JSON.stringify({workspace:route(),id}),'utf8').toString('base64url')});
      await vscode.env.clipboard.writeText(`${vscode.env.uriScheme||'vscode'}://flengyel.mrw/notebook-result?${params}`);
    } else if(choice.action==='export')return exportSelected([id]);
    else if(choice.action==='delete') {
      const names=result.artifacts.map(a=>a.name).join('\n');
      const yes=await vscode.window.showWarningMessage(`Delete the retained copy “${result.title}”?`,{modal:true,detail:`Removes this snapshot and its retained copies:\n${names}\n\nOriginal files, other results and exported copies remain. Open views may still display the copy until closed.`},'Delete retained copy');
      if(yes==='Delete retained copy'){await call('delete',{id});event('delete',[id]);await vscode.window.showInformationMessage('Retained copy deleted.');}
    }
  }
  register('mrw.retainNotebookResult',async resource=>{
    let uri=resource?.scheme==='file'?resource:vscode.window.activeNotebookEditor?.notebook.uri;
    if(!uri||!uri.fsPath.toLowerCase().endsWith('.ipynb'))uri=(await vscode.window.showOpenDialog({title:'Retain saved notebook result',canSelectMany:false,filters:{Notebook:['ipynb']}}))?.[0];
    if(!uri)return;
    if(uri.scheme!=='file')throw Error('Select a saved notebook on this extension host.');
    const paths=[uri.fsPath];dirty(paths);
    const choice=await vscode.window.showQuickPick([{label:'Retain notebook',action:'retain'},{label:'Include companion files…',action:'companions'}],{title:'Retain exact saved bytes',placeHolder:'Include a working note, input data or method file when useful. No code will run.'});
    if(!choice)return;
    if(choice.action==='companions') {
      const files=await vscode.window.showOpenDialog({title:'Select companion notes, inputs or method files',canSelectMany:true,canSelectFiles:true,canSelectFolders:false});
      if(!files?.length)return;
      for(const file of files){if(file.scheme!=='file')throw Error('Select local companion files.');if(!paths.includes(file.fsPath))paths.push(file.fsPath);}
    }
    dirty(paths);const result=await call('retain',{paths,software});event('retain',[result.id]);
    await actions(result.id);
  });
  register('mrw.openNotebookResult',async()=>{const selected=await select();if(selected)await actions(selected.id);});
  register('mrw.exportNotebookProvenance',async()=>{const selected=await select(true);if(selected?.length)return exportSelected(selected.map(x=>x.id));});
  async function handleUri(uri) {
    if(uri.path!=='/notebook-result')return false;
    let target=parseLink(uri.toString(true),vscode.env.uriScheme||'vscode');
    if(context.mrwRoute)target=await context.mrwRoute(target);
    if(target.workspace!==route())throw Error('Open this result’s workspace, then use Open Link from Clipboard.');
    await actions(target.id);return true;
  }
  return {handleUri};
}
module.exports={registerNotebookResults,parseLink};
