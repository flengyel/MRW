'use strict';
const vscode=require('vscode'),path=require('node:path'),crypto=require('node:crypto');
const {createReports,markdown,maintenance,PERIODS}=require('./reports');
async function chooseFeaturePeriod(host=vscode){return (await host.window.showQuickPick(PERIODS,{title:'Feature use: observation period',matchOnDescription:true,placeHolder:'Recorded observations only; missing coverage is not zero use.'}))?.period;}
function activate(context){
  const extension=vscode.extensions.getExtension('flengyel.mrw');let reporter,timer,active;
  async function reports(){
    if(reporter)return reporter;const core=await extension?.activate(),api=core?.mrwInspection;
    const scope=api?.scope||vscode.workspace.workspaceFile?.toString()||vscode.workspace.workspaceFolders?.map(f=>f.uri.toString()).join('|')||'no-workspace';
    reporter=createReports({directory:path.join(context.globalStorageUri.fsPath,'reports',crypto.createHash('sha256').update(scope).digest('hex')),locks:path.join(context.globalStorageUri.fsPath,'locks'),scope,api,historyLimit:vscode.workspace.getConfiguration('mrwDiagnostics').get('historyLimit',10)});return reporter;
  }
  async function run(kind='all',origin='human',display=true,period='last30'){
    if(active)throw Error('A diagnostics report is already running.');const r=await reports();const controller=new AbortController();active=controller;
    try{return await vscode.window.withProgress({location:vscode.ProgressLocation.Notification,title:'MRW Diagnostics: read-only report',cancellable:true},async(_,token)=>{
      const d=token.onCancellationRequested(()=>controller.abort());try{const report=await r.run({kind,origin,signal:controller.signal,period});if(display){const doc=await vscode.workspace.openTextDocument({language:'markdown',content:markdown(report)});await vscode.window.showTextDocument(doc,{preview:false});}return report;}finally{d.dispose();}
    });}finally{active=undefined;}
  }
  const register=(id,fn)=>context.subscriptions.push(vscode.commands.registerCommand(id,async()=>{try{return await fn();}catch(e){void vscode.window.showErrorMessage('MRW Diagnostics: '+e.message);}}));
  register('mrwDiagnostics.featureUse',async()=>{const period=await chooseFeaturePeriod();if(period)return run('usage','human',true,period);});
  register('mrwDiagnostics.integrity',()=>run());
  register('mrwDiagnostics.export',async()=>{const report=await(await reports()).latest();if(!report)throw Error('No completed report is available. Run a report first.');const format=await vscode.window.showQuickPick(['Markdown','JSON'],{title:'Export diagnostic report'});if(!format)return;const doc=await vscode.workspace.openTextDocument({language:format==='JSON'?'json':'markdown',content:format==='JSON'?JSON.stringify(report,null,2):markdown(report)});await vscode.window.showTextDocument(doc,{preview:false});void vscode.window.showInformationMessage('Use Save As to export this report. It contains local paths; redact them before sharing.');});
  register('mrwDiagnostics.maintenance',async()=>{const report=await(await reports()).latest();if(!report)throw Error('Run a report first.');await vscode.env.clipboard.writeText(maintenance(report));void vscode.window.showInformationMessage('Copied report evidence and the Codex maintenance procedure. Review it before handing it to Codex; no model call or repair was made.');});
  async function tick(){if(!vscode.window.state.focused||active)return;const enabled=vscode.workspace.getConfiguration('mrwDiagnostics').get('weeklyEnabled',false);if(!enabled)return;try{const r=await reports();if(await r.due(enabled))await run('all','scheduled',false);}catch(e){void vscode.window.setStatusBarMessage('MRW Diagnostics: '+e.message,8000);}}
  timer=setInterval(()=>void tick(),60000);timer.unref?.();context.subscriptions.push({dispose(){clearInterval(timer);active?.abort();}},vscode.window.onDidChangeWindowState(()=>void tick()),vscode.workspace.onDidChangeConfiguration(e=>{if(e.affectsConfiguration('mrwDiagnostics'))void tick();}));void tick();
  return {version:1};
}
module.exports={activate,chooseFeaturePeriod};
