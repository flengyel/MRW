'use strict';
// Native repair acceptance only in the dedicated disposable workspace.
const vscode=require('vscode'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const hash=t=>crypto.createHash('sha256').update(t).digest('hex'),pause=ms=>new Promise(r=>setTimeout(r,ms));
async function run(context,onActivated){
 const cfg=JSON.parse(await fs.readFile(path.join(context.extensionPath,'host-test.json'),'utf8'));
 assert.equal(path.basename(cfg.project),'mrw-reopen-fixture');assert.equal(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,cfg.project);
 const report={complete:false,host:vscode.version,remote:vscode.env.remoteName,checks:[]};let dirty;
 try{
  const a=vscode.Uri.file(path.join(cfg.project,'a.md')),b=vscode.Uri.file(path.join(cfg.project,'b.md'));
  const source='# Source\n\n[Target](b.md)\n',old='# Old target\nOriginal proof.\n',current='# Revised target\nCurrent proof and reader comment.\n';
  await fs.writeFile(a.fsPath,source);await fs.writeFile(b.fsPath,current);
  const point=(uri,text,start,end)=>({uri:uri.toString(),revision:hash(text),start,end,initial:{revision:hash(text),start,end}});
  const origin=point(a,source,source.indexOf('[Target]'),source.indexOf('[Target]')+'[Target](b.md)'.length);
  const workspace=hash(JSON.stringify({host:os.hostname(),remote:vscode.env.remoteName||'',workspace:vscode.workspace.workspaceFile?.toString(),folders:vscode.workspace.workspaceFolders.map(f=>f.uri.toString())}));
  await context.workspaceState.update('mrw.documents.v1',{workspace,grants:[],last:b.toString(),location:point(b,old,0,'# Old target'.length),origin});
  await context.workspaceState.update('mrw.readingOutline.v1',{route:'ordinary',uri:a.toString()});
  const api=require(path.join(context.extensionPath,'src/extension')).activate(context);onActivated(api);
  const saved=()=>require(path.join(context.extensionPath,'src/workspacePaths')).decode(context.workspaceState.get('mrw.documents.v1'),cfg.project);
  await vscode.commands.executeCommand('mrw.reopenDocument');await pause(250);
  const currentTab=()=>vscode.window.tabGroups.activeTabGroup.activeTab?.input;
  assert.equal(currentTab()?.uri?.toString(),b.toString());assert.equal(currentTab()?.viewType,'vscode.markdown.preview.editor');
  let doc=await vscode.workspace.openTextDocument(b);assert.equal(doc.getText(),current);assert.equal(doc.isDirty,false);
  assert.equal(saved().location.revision,hash(current));
  assert.deepEqual(saved().origin,origin);
  report.checks.push('Production Reopen Document opens revised text in native Markdown preview and replaces stale cursor metadata');
  // A native dirty buffer is authoritative; reopening must not save or replace it.
  dirty=doc;await vscode.window.showTextDocument(doc,{preview:false});
  const edit=new vscode.WorkspaceEdit();edit.replace(b,new vscode.Range(doc.positionAt(2),doc.positionAt(8)),'Unsaved');assert.ok(await vscode.workspace.applyEdit(edit));
  await pause(120);const draft=doc.getText(),version=doc.version;assert.ok(doc.isDirty);
  await vscode.commands.executeCommand('mrw.reopenDocument');await pause(150);
  assert.equal(currentTab()?.viewType,'vscode.markdown.preview.editor');assert.equal(currentTab()?.uri?.toString(),b.toString());
  assert.equal(doc.getText(),draft);assert.equal(doc.version,version);assert.ok(doc.isDirty);assert.equal(await fs.readFile(b.fsPath,'utf8'),current);
  report.checks.push('Production Reopen preserves native dirty text, its version and unchanged disk bytes');
  await vscode.commands.executeCommand('mrw.returnToReadingOutline');await pause(150);
  assert.equal(currentTab()?.uri?.toString(),a.toString());assert.equal(currentTab()?.viewType,'vscode.markdown.preview.editor');
  assert.deepEqual(saved().origin,origin);
  report.checks.push('Original exact document Return remains available after reopening');
  // Restore only our disposable draft so closing this fixture cannot prompt the user.
  const restore=new vscode.WorkspaceEdit();restore.replace(b,new vscode.Range(doc.positionAt(0),doc.positionAt(doc.getText().length)),current);assert.ok(await vscode.workspace.applyEdit(restore));assert.ok(await doc.save());
  assert.equal(await fs.readFile(a.fsPath,'utf8'),source);assert.equal(await fs.readFile(b.fsPath,'utf8'),current);
  report.complete=true;report.productionActivated=!!api;report.fixtureOnly=true;
 }catch(e){report.failure=e.stack;}
 finally{await fs.writeFile(path.join(cfg.artifacts,'native-result.json'),JSON.stringify(report,null,2)+'\n');if(!dirty?.isDirty)await vscode.commands.executeCommand('workbench.action.closeWindow');}
}
module.exports={activate:context=>{let active;void run(context,api=>{active=api;}).catch(console.error);return {extendMarkdownIt:md=>active?.extendMarkdownIt(md)||md};}};
