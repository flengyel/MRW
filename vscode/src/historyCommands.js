'use strict';
const path=require('node:path');
function registerHistory({vscode,context,register,recorder}){
  const configuration=()=>vscode.workspace.getConfiguration('mrw');
  const recording=()=>{recorder.usageRecording=configuration().get('usageRecording',true);};recording();
  if(vscode.workspace.onDidChangeConfiguration)context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e=>{if(e.affectsConfiguration('mrw.usageRecording')){recording();recorder.record('usage.recording',{enabled:recorder.usageRecording},'observed_action',{});}}));
  register('mrw.configureHistory',async()=>{
    await recorder.init();const choice=await vscode.window.showQuickPick([
      {label:'Choose shared history directory…',action:'choose',description:'Verify and import private history before connecting'},
      {label:'Reimport private history',action:'import',description:'Recover gaps; repeated import does not duplicate events'},
      {label:'Retry shared history',action:'retry',description:'Publish pending batches and discover arriving sessions'},
      {label:recorder.usageRecording?'Turn off usage recording':'Turn on usage recording',action:'record'},
      {label:'Disconnect shared history',action:'disconnect',description:'Keep the shared files and private originals'},
    ],{placeHolder:'History settings — notes, active studies and scheduling stay in place'});if(!choice)return;
    if(choice.action==='record')return configuration().update('usageRecording',!recorder.usageRecording,vscode.ConfigurationTarget.Global);
    if(choice.action==='disconnect'){await recorder.flush();await recorder.shared.disconnect();await vscode.window.showInformationMessage('Shared history disconnected. Private and shared files remain.');return;}
    if(choice.action==='retry'){
      await recorder.flush();const result=await recorder.syncShared();
      await vscode.window.showInformationMessage(result.unavailable?'Shared history remains unavailable. Pending batches are retained.':'Available shared history refreshed. Inspect History shows gaps and conflicts.');return;
    }
    let directory=recorder.shared?.binding?.directory;
    if(choice.action==='choose'){
      const suggested=configuration().get('dataDirectory','')||configuration().get('notesFolder','');
      const picked=await vscode.window.showOpenDialog({title:'Choose MRW data directory',canSelectFiles:false,canSelectFolders:true,canSelectMany:false,
        defaultUri:suggested&&path.isAbsolute(suggested)?vscode.Uri.file(suggested):undefined,openLabel:'Use History subfolder'});
      if(!picked?.length)return;if(picked[0].scheme!=='file')throw Error('Choose a directory on this extension host.');directory=picked[0].fsPath;
    }
    if(!directory)throw Error('Choose a shared history directory first.');
    const accepted=await vscode.window.showWarningMessage('Import recorded history into '+path.join(directory,'History')+'?',{modal:true,
      detail:'Shares recorded interactions and their submitted snapshots with anyone who can read this folder. It does not copy active drafts, study checkpoints, scheduling or the source store. Host file locations become opaque references. Original private files remain. The connection changes only after verification. A vault/MRW folder is recommended; a separate folder or vault root also works.'},'Import and Connect');
    if(accepted!=='Import and Connect')return;
    const status=await recorder.importHistory(directory);
    await configuration().update('dataDirectory',directory,vscode.ConfigurationTarget.Global);
    await vscode.window.showInformationMessage(`History imported and verified. ${status.writers.length} publishing writer(s) available. Inspect History shows recorded sessions and missing context.`);
  });
}
module.exports={registerHistory};
