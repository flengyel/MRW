'use strict';
const vscode=require('vscode'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const pause=ms=>new Promise(r=>setTimeout(r,ms)),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
async function run(context,activated){
 const cfg=JSON.parse(await fs.readFile(path.join(context.extensionPath,'host-test.json'),'utf8'));assert.equal(path.basename(cfg.project),'mrw-recent-fixture');assert.equal(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,cfg.project);
 const report={complete:false,host:vscode.version,remote:vscode.env.remoteName,checks:[]};let dirty;
 try{
  const note=vscode.Uri.file(path.join(cfg.project,'note.md')),first=vscode.Uri.file(path.join(cfg.project,'first.pdf')),second=vscode.Uri.file(path.join(cfg.project,'second.pdf')),original='# Native note\n\nA calculation.\n';
  await fs.writeFile(note.fsPath,original);
  const workspace=hash(JSON.stringify({host:os.hostname(),remote:vscode.env.remoteName||'',workspace:vscode.workspace.workspaceFile?.toString(),folders:vscode.workspace.workspaceFolders.map(f=>f.uri.toString())}));
  await context.workspaceState.update('mrw.documents.v1',{workspace,grants:[],last:note.toString()});
  const api=require('../../src/extension').activate(context);activated(api);
  const saved=()=>require('../../src/workspacePaths').decode(context.workspaceState.get('mrw.recentNotes.v1',[]),cfg.project);
  await vscode.commands.executeCommand('mrw.reopenDocument');
  dirty=await vscode.workspace.openTextDocument(note);await vscode.window.showTextDocument(dirty,{preview:false});
  const edit=new vscode.WorkspaceEdit();edit.insert(note,dirty.positionAt(dirty.getText().length),'Unsaved question.\n');assert.ok(await vscode.workspace.applyEdit(edit));const draft=dirty.getText();assert.ok(dirty.isDirty);
  const reader=vscode.extensions.getExtension('James-Yu.latex-workshop')||vscode.extensions.getExtension('james-yu.latex-workshop');
  const view=reader?.packageJSON?.contributes?.customEditors?.find(e=>e.selector?.some(s=>s.filenamePattern?.endsWith('.pdf')))?.viewType;
  assert.ok(view,'LaTeX Workshop PDF reader unavailable in fixture host');report.pdfReader=view;
  await vscode.commands.executeCommand('vscode.openWith',first,view,{preview:false});await pause(200);
  await vscode.commands.executeCommand('vscode.openWith',second,view,{preview:false});
  for(let i=0;i<80;i++){const rows=saved();if(rows.some(e=>e.uri===first.toString())&&rows.some(e=>e.uri===second.toString()))break;await pause(100);}
  assert.ok(saved().some(e=>e.uri===first.toString()));assert.ok(saved().some(e=>e.uri===second.toString()));assert.ok(saved().some(e=>e.uri===note.toString()));
  report.checks.push('Native PDF tab events record both PDFs alongside a titled Markdown note');
  const commands=await vscode.commands.getCommands(true);assert.ok(commands.includes('workbench.action.quickOpen'));assert.ok(commands.includes('workbench.action.quickOpenSelectNext'));assert.ok(commands.includes('workbench.action.acceptSelectedQuickOpenItem'));
  await pause(2000);const choosing=vscode.commands.executeCommand('mrw.recentNotes');await pause(450);await fs.writeFile(path.join(cfg.artifacts,'picker-ready.json'),JSON.stringify({ready:true}));
  for(let i=0;i<200;i++){try{await fs.access(path.join(cfg.artifacts,'captured.json'));break;}catch{await pause(150);}}
  const selection=JSON.parse(await fs.readFile(path.join(cfg.artifacts,'captured.json'),'utf8'));assert.ok(selection.selected,'Native fixture did not select its target');await pause(150);await vscode.commands.executeCommand('workbench.action.acceptSelectedQuickOpenItem');await choosing;await pause(250);
  const tab=()=>vscode.window.tabGroups.activeTabGroup.activeTab?.input;
  assert.equal(tab()?.uri?.toString(),first.toString());assert.equal(tab()?.viewType,view);
  report.checks.push('Recent Documents native picker reopens the earlier PDF through its installed reader');
  await vscode.commands.executeCommand('mrw.returnToReadingOutline');await pause(150);assert.equal(tab()?.uri?.toString(),second.toString());
  assert.equal(dirty.getText(),draft);assert.ok(dirty.isDirty);assert.equal(await fs.readFile(note.fsPath,'utf8'),original);
  report.checks.push('Return reopens the originating PDF and preserves the unsaved Markdown draft');
  const restore=new vscode.WorkspaceEdit();restore.replace(note,new vscode.Range(dirty.positionAt(0),dirty.positionAt(dirty.getText().length)),original);assert.ok(await vscode.workspace.applyEdit(restore));assert.ok(await dirty.save());
  report.rows=saved().map(e=>({label:e.label,file:path.basename(e.canonical)}));report.complete=true;
 }catch(e){report.failure=e.stack;}
 finally{
  if(dirty?.isDirty&&dirty.uri.fsPath===path.join(cfg.project,'note.md'))try{const text=await fs.readFile(dirty.uri.fsPath,'utf8');const reset=new vscode.WorkspaceEdit();reset.replace(dirty.uri,new vscode.Range(dirty.positionAt(0),dirty.positionAt(dirty.getText().length)),text);assert.ok(await vscode.workspace.applyEdit(reset));assert.ok(await dirty.save());}catch(e){report.cleanupFailure=e.message;}
  await fs.writeFile(path.join(cfg.artifacts,'native-result.json'),JSON.stringify(report,null,2));if(!dirty?.isDirty)await vscode.commands.executeCommand('workbench.action.closeWindow');
 }
}
module.exports={activate:context=>{let active;void run(context,api=>{active=api;}).catch(console.error);return {extendMarkdownIt:md=>active?.extendMarkdownIt(md)||md};}};
