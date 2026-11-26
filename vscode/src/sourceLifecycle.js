'use strict';

// Called under the existing reader action lock. No ordinary files are removed.
function sourceLifecycle({vscode, bridge, panels, writable, refresh, freeze, storage, register, locked, choice, block}) {
  const request = (location, method, row) => ({method, store:location.store, project_root:location.root,
    id:row.id, revision:row.outline_revision, status_revision:row.lifecycle.revision});
  async function publish(location,method,row) {
    try {
      const result=await bridge(request(location,method,row));
      if(result.blocked){block(location);throw new Error('Saved source publication failed: '+result.write_error+'. Keep drafts and reload before further private writes.');}
      return result;
    } catch(error){if(error.code!=='ACTION_REJECTED')block(location);throw error;}
  }
  function controller(location,row) {
    const c=panels.get(row.id);
    if(c && (c.store!==location.store || c.root!==location.root))throw new Error('This saved source is open in another storage scope. Close that reader first.');
    return c;
  }
  async function restore(location, row) {
    writable(location);
    const c=controller(location,row);
    const result=await publish(location,'outline_restore',row);
    if(c) await refresh(c);
    vscode.window.setStatusBarMessage('GOLEM XIV: Saved source restored.',6000);
    return result;
  }
  async function trash(location, row) {
    writable(location);
    const c=controller(location,row);
    try {
      if(c && await freeze(c)) throw new Error('Save or cancel the unsaved reader changes before deleting this saved source. Your draft is kept.');
      const answer=await vscode.window.showWarningMessage('Move this saved source to Trash?',{modal:true,
        detail:(row.title || row.path)+'\nOnly this GOLEM XIV saved copy is removed from active lists. Its passages, reader notes, diagrams and links are kept for Restore. Original files, vault notes, other sources and studies are unchanged.'},'Move to Trash');
      if(answer!=='Move to Trash')return;
      const result=await publish(location,'outline_trash',row);
      if(c)await refresh(c);
      // A notification may stay open indefinitely. Release the reader/action lock
      // before Undo; its captured revision still prevents stale restoration.
      void vscode.window.showInformationMessage('Saved source moved to Trash. Retained links still open it read-only.','Undo')
        .then(undo=>undo==='Undo'?locked(()=>restore(location,{...row,lifecycle:result.lifecycle})):undefined)
        .catch(error=>vscode.window.showErrorMessage('GOLEM XIV: '+error.message));
      return result;
    } finally {if(c)await c.panel.webview.postMessage({type:'storageRelease'});}
  }
  async function pickRestore(location) {
    location ||= await storage(vscode.window.activeTextEditor);
    const result=await bridge({method:'outline_trash_list',store:location.store,project_root:location.root});
    if(!result.outlines.length){await vscode.window.showInformationMessage('Saved Source Trash is empty for this project.');return;}
    const picked=await vscode.window.showQuickPick(result.outlines.map(row=>({...choice(row),row})),{
      title:'Restore saved source — '+require('node:path').basename(location.root),matchOnDescription:true,matchOnDetail:true,
      placeHolder:'Restore a saved copy with all of its reader notes and links'});
    if(picked)return restore(location,picked.row);
  }
  register('mrw.deleteSavedSource',()=>locked(async()=>{
    const location=await storage(vscode.window.activeTextEditor);
    const result=await bridge({method:'outline_list',store:location.store,project_root:location.root});
    if(!result.outlines.length){await vscode.window.showInformationMessage('No active saved sources for this project. Use Restore Saved Source to inspect Trash.');return;}
    const picked=await vscode.window.showQuickPick(result.outlines.map(row=>({...choice(row),row})),{
      title:'Delete saved source',placeHolder:'Choose the GOLEM XIV saved copy to move to Trash',matchOnDescription:true,matchOnDetail:true});
    if(picked)return trash(location,picked.row);
  }));
  register('mrw.restoreSavedSource',()=>locked(()=>pickRestore()));
  const row=c=>({id:c.result.outline.id,title:c.result.outline.source.bibliography.title,path:c.result.outline.source.path,
    outline_revision:c.result.revision,lifecycle:c.result.lifecycle});
  return {pickRestore,trash:c=>trash(c,row(c)),restore:c=>restore(c,row(c))};
}
module.exports={sourceLifecycle};
