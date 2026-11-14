'use strict';
// Read the explicitly selected existing note; write only disposable fixture files.
const vscode=require('vscode'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const pause=ms=>new Promise(r=>setTimeout(r,ms)),hash=raw=>crypto.createHash('sha256').update(raw).digest('hex');
async function run(context,api){
 const cfg=JSON.parse(await fs.readFile(path.join(context.extensionPath,'host-test.json'),'utf8'));assert.equal(path.basename(cfg.project),'mrw-citation-fixture');assert.equal(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,cfg.project);
 const report={checks:[],complete:false,host:vscode.version,remote:vscode.env.remoteName};let dirty;
 try{
  const before=await fs.readFile(cfg.note),doc=await vscode.workspace.openTextDocument(vscode.Uri.file(cfg.note));report.sourceBefore=hash(before);assert.equal(doc.isDirty,false);
  await vscode.window.showTextDocument(doc,{preview:false});await vscode.commands.executeCommand('markdown.showPreview',doc.uri);await vscode.commands.executeCommand('workbench.action.closeSidebar');await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
  const md=api.extendMarkdownIt(new(require(context.extensionPath+'/media/markdown-it/markdown-it'))());let html='';const start=Date.now();
  for(let i=0;i<120;i++){html=md.render(doc.getText(),{currentDocument:doc.uri});if(html.includes('(Marcus 2018)')&&html.includes('Marcus, Daniel A.'))break;await pause(250);}
  assert.ok(html.includes('(Marcus 2018)'),html.slice(-1200));assert.ok(!html.includes('[@marcusNumberFields2018]'));assert.ok(html.includes('Marcus, Daniel A.'));assert.ok(html.includes('Better BibTeX snapshot'));
  report.elapsedMs=Date.now()-start;report.citation='(Marcus 2018)';report.checks.push('Actual Number Fields key resolves through live Windows Zotero / Better BibTeX with host-PATH Pandoc');
  await vscode.commands.executeCommand('markdown.preview.refresh');await pause(500);await fs.writeFile(path.join(cfg.artifacts,'preview-ready.json'),JSON.stringify({ready:true}));
  // Leave the live native preview visible while the isolated screenshot is taken.
  for(let i=0;i<100;i++){try{await fs.access(path.join(cfg.artifacts,'captured.json'));break;}catch{await pause(100);}}
  const saved='# Disposable dirty citation\n\n---\n';const f=path.join(cfg.project,'dirty.md');await fs.writeFile(f,saved);dirty=await vscode.workspace.openTextDocument(f);let editor=await vscode.window.showTextDocument(dirty,{preview:false});
  const edit=new vscode.WorkspaceEdit();edit.insert(dirty.uri,new vscode.Position(0,0),'Unsaved [@marcusNumberFields2018]\n');assert.ok(await vscode.workspace.applyEdit(edit));assert.ok(dirty.isDirty);const originalDirty=dirty.getText();
  // This file belongs to the fixture rather than the vault. Invoke only the hook;
  // its preservation check must not save, replace or discard an ordinary buffer.
  md.render(originalDirty,{currentDocument:dirty.uri});await pause(400);assert.equal(dirty.getText(),originalDirty);assert.ok(dirty.isDirty);assert.equal(await fs.readFile(f,'utf8'),saved);
  report.checks.push('Native dirty buffer remains unsaved and unchanged during citation processing');
  const restore=new vscode.WorkspaceEdit();restore.replace(dirty.uri,new vscode.Range(dirty.positionAt(0),dirty.positionAt(dirty.getText().length)),saved);assert.ok(await vscode.workspace.applyEdit(restore));assert.ok(await dirty.save());assert.equal(dirty.getText(),saved);
  const after=await fs.readFile(cfg.note);assert.equal(hash(after),report.sourceBefore);assert.equal(doc.getText(),before.toString('utf8'));assert.equal(doc.isDirty,false);report.sourceAfter=hash(after);report.checks.push('Existing Number Fields note bytes and clean buffer preserved');report.complete=true;
 }catch(e){report.failure=e.stack;}
 finally{await fs.writeFile(path.join(cfg.artifacts,'native-result.json'),JSON.stringify(report,null,2));if(!dirty?.isDirty)await vscode.commands.executeCommand('workbench.action.closeWindow');}
}
module.exports={activate:context=>{const api=require('../../src/extension').activate(context);void run(context,api).catch(console.error);return api;}};
