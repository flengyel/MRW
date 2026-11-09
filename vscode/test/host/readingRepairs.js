'use strict';
const vscode=require('vscode'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
let production,previewAPI;
async function run(context){
 const root=vscode.workspace.workspaceFolders[0].uri.fsPath,cfg=JSON.parse(await fs.readFile(path.join(context.extensionPath,'host-test.json'),'utf8'));
 assert.equal(root,path.join(cfg.artifacts,'project'),'Disposable fixture workspace only');
 await fs.rm(path.join(context.storageUri.fsPath,'document-diagrams-v1'),{recursive:true,force:true});
 const report={host:vscode.version,remote:vscode.env.remoteName,version:context.extension.packageJSON.version,checks:[],errors:[],complete:false};
 const reload=path.join(cfg.artifacts,'reload');let reloading=false;
 const watcher=setInterval(async()=>{if(!reloading&&require('node:fs').existsSync(reload)){reloading=true;await fs.rm(reload);await vscode.commands.executeCommand('workbench.action.reloadWindow');}},500);context.subscriptions.push({dispose:()=>clearInterval(watcher)});
 const save=()=>fs.writeFile(path.join(cfg.artifacts,'native-result.json'),JSON.stringify(report,null,2));
 const native={tree:vscode.window.createTreeView,quick:vscode.window.createQuickPick,dialog:vscode.window.showOpenDialog,error:vscode.window.showErrorMessage,uri:vscode.window.registerUriHandler};
 let documents,tree,provider,picker,accept,handler;
 async function wait(check,label){const end=Date.now()+20000;while(!check()){if(Date.now()>end)throw Error('Timed out: '+label);await new Promise(r=>setTimeout(r,50));}}
 const file=n=>vscode.Uri.file(path.join(root,'notes',n));
 try{
  const mod=require('../../src/documents'),create=mod.createDocuments;mod.createDocuments=options=>documents=create(options);
  vscode.window.createTreeView=(id,opts)=>{const value=native.tree(id,opts);if(id==='mrw.readingOutline'){tree=value;provider=opts.treeDataProvider;}return value;};
  vscode.window.showErrorMessage=async message=>{report.errors.push(message);await save();};
  vscode.window.registerUriHandler=h=>{handler=h;return native.uri(h);};
  vscode.window.showOpenDialog=async()=>[file('A.md')];
  vscode.window.createQuickPick=()=>{picker=native.quick();const onAccept=picker.onDidAccept.bind(picker);picker.onDidAccept=(fn,...args)=>{accept=fn;return onAccept(fn,...args);};return picker;};
  production=require('../../src/extension');const api=previewAPI=production.activate(context);await save();
  const other=await vscode.workspace.openTextDocument({language:'plaintext',content:'Unsent independent draft λ'});await vscode.window.showTextDocument(other,{preview:false,viewColumn:vscode.ViewColumn.Two});
  await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');
  const opening=vscode.commands.executeCommand('mrw.openDocument');await wait(()=>picker?.items.some(i=>i.action==='browse'),'usable document picker');
  picker.selectedItems=[picker.items.find(i=>i.action==='browse')];await accept();await opening;
  const a=await vscode.workspace.openTextDocument(file('A.md')),before=await fs.readFile(a.uri.fsPath,'utf8');
  assert.ok(provider.getChildren().length);assert.match(tree.description,/Fixture mathematics/);assert.equal(context.workspaceState.get('mrw.lightStudy.recent.v1'),undefined);
  await vscode.extensions.getExtension('vscode.markdown-language-features').activate();await vscode.commands.executeCommand('markdown.api.reloadPlugins');
  const render=()=>vscode.commands.executeCommand('markdown.api.render',a);
  let html=await render();assert.match(html,/katex/);assert.doesNotMatch(html,/katex-error/);assert.match(html,/Render diagram/);assert.doesNotMatch(html,/mrw-diagram-dark/);
  report.checks.push('Native Markdown pipeline resolves front-matter macros and offers explicit TikZ rendering without automatic compilation');
  const target=require('../../src/readingMarkdown').parseReadingMarkdown(a.getText()).all.find(n=>n.target==='B#Proof');await documents.follow(a,target);
  const b=await vscode.workspace.openTextDocument(file('B.md'));
  await wait(()=>vscode.window.tabGroups.activeTabGroup.activeTab?.input?.uri?.toString()===b.uri.toString(),'linked Markdown preview');
  assert.equal(context.workspaceState.get('mrw.documents.v1').location.start,b.getText().indexOf('## Proof'));
  await documents.returnToDocument();assert.equal(context.workspaceState.get('mrw.documents.v1').last,a.uri.toString());
  report.checks.push('Heading WikiLink opens its exact destination and Return keeps the original occurrence');
  const plain=require('../../src/readingMarkdown').parseReadingMarkdown(a.getText()).all.find(n=>n.target==='plain.txt');await documents.follow(a,plain);
  assert.equal(provider.getChildren().length,0);assert.match(tree.message,/plain.txt.*Markdown only/);await documents.returnToDocument();assert.ok(provider.getChildren().length);
  report.checks.push('Text-file opening clears the previous Markdown tree; Return restores it');
  html=await render();const href=/href="([^"]*\/document-diagram\?[^\"]+)"/.exec(html)[1].replaceAll('&amp;','&');await handler.handleUri(vscode.Uri.parse(href));
  html=await render();assert.match(html,/mrw-diagram-dark/);assert.match(html,/data:image\/svg/);assert.equal(await fs.readFile(a.uri.fsPath,'utf8'),before);
  report.checks.push('Explicit native URI action compiles an isolated diagram and Markdown renders cached light/dark SVG without rewriting the note');
  assert.ok(other.isDirty);assert.equal(other.getText(),'Unsent independent draft λ');assert.deepEqual(report.errors,[]);report.checks.push('Independent unsent editor and study-free reading are preserved');
  report.complete=true;await save();
  await vscode.commands.executeCommand('mrw.openReadingOutline');
  return api;
 }catch(error){report.failure=error.stack;await save();}
 finally{vscode.window.createTreeView=native.tree;vscode.window.createQuickPick=native.quick;vscode.window.showOpenDialog=native.dialog;vscode.window.showErrorMessage=native.error;vscode.window.registerUriHandler=native.uri;}
}
module.exports={activate:context=>{void run(context);return {extendMarkdownIt:md=>previewAPI?previewAPI.extendMarkdownIt(md):md};},deactivate:()=>production?.deactivate()};
