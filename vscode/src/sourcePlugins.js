'use strict';
const {setSources}=require('./sourceIdentifiers');
function registerSourcePlugins({vscode,register,rawBridge}) {
 async function load(){const state=await rawBridge({method:'source_plugins_list'});setSources(state.sources);return state;}
 register('mrw.addSourcePlugin',async()=>{
  const kind=await vscode.window.showQuickPick([{label:'Data-only source profile',kind:'profile',description:'Local JSON selecting an installed parser; no executable code'},{label:'Installed Python adapter',kind:'adapter',description:'Trusted code installed in the configured Python environment'}],{placeHolder:'Add a source plugin'});if(!kind)return;
  if(kind.kind==='profile'){
   const paths=await vscode.window.showOpenDialog({title:'Choose a source profile (JSON data)',canSelectFiles:true,canSelectFolders:false,canSelectMany:false,filters:{'Source profile':['json']}});if(!paths?.length)return;
   if(paths[0].scheme!=='file')throw new Error('Choose a local source profile on the workspace host.');
   await rawBridge({method:'source_plugins_add_profile',path:paths[0].fsPath});
  }else{
   const available=await rawBridge({method:'source_plugins_installed'});
   if(!available.adapters.length)throw new Error('No mrw.sources entry points are installed. Install an adapter package in the configured Python environment first; see the source-plugin authoring guide.');
   const picked=await vscode.window.showQuickPick(available.adapters.map(a=>({label:a.entryPoint,description:a.distribution+' '+a.version,...a})),{placeHolder:'Choose trusted installed source code'});if(!picked)return;
   const allow=await vscode.window.showWarningMessage('Enable '+picked.distribution+' / '+picked.entryPoint+'? This executes trusted installed Python code with your account’s permissions. A subprocess is not a security sandbox.',{modal:true},'Enable adapter');if(allow!=='Enable adapter')return;
   await rawBridge({method:'source_plugins_add_adapter',entry_point:picked.entryPoint,distribution:picked.distribution});
  }
  await load();void vscode.window.showInformationMessage('Source plugin registered. Use MRW: Import Source…; no VSIX rebuild or window reload is needed.');
 });
 register('mrw.manageSourcePlugins',async()=>{
  const state=await load();
  if(state.diagnostics.length)void vscode.window.showWarningMessage('Source registration diagnostics: '+state.diagnostics.join('; '));
  const source=await vscode.window.showQuickPick(state.sources.map(s=>({label:s.name,description:s.sourceId+' · '+s.pluginId+' '+s.pluginVersion+' · '+(s.enabled?'enabled':s.removed?'removed':'disabled'),...s})),{placeHolder:'Manage source plugins; retained snapshots remain readable'});if(!source)return;
  const choice=await vscode.window.showQuickPick([{label:source.enabled?'Disable':'Enable',enabled:!source.enabled},{label:'Remove registration',enabled:false,remove:true}],{placeHolder:source.name});if(!choice)return;
  await rawBridge({method:'source_plugins_change',source_id:source.sourceId,enabled:choice.enabled,remove:!!choice.remove});await load();
 });
 return {load};
}
module.exports={registerSourcePlugins};
