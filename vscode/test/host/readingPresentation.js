'use strict';
// Read-only actual-host check of the presentation defect observed in installed use.
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const bridge = require('../../src/bridge');
const { digest } = require('../../src/navigation');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function probe() {
  const api = acquireVsCodeApi(); window.acquireVsCodeApi = () => api;
  window.addEventListener('message', e => {
    if(e.data.type !== 'presentation-probe') return;
    const root=document.getElementById('reader'), selected=root.querySelector('section.selected');
    const rect=n=>{const r=n.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
    api.postMessage({type:'presentation-reply', value:{innerWidth,innerHeight,
      selected:selected?.dataset.region,selectedBox:selected?rect(selected):null,
      selectedMath:selected?[...selected.querySelectorAll('math')].map(rect):[],
      allMath:root.querySelectorAll('math').length,
      toolsClosed:!root.querySelector('.reader-tools').open,
      visibleButtons:[...root.querySelectorAll('button')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0}).map(n=>n.textContent),
      visibleEditingButtons:[...root.querySelectorAll('button')].filter(n=>{const r=n.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0&&!['reading-return','stacks-reference','stacks-citation'].includes(n.dataset.action)}).map(n=>n.textContent),
      body:root.textContent.slice(0,300)}});
  });
}
async function run(context) {
 const cfg=JSON.parse(await fs.readFile(path.join(context.extensionPath,'host-test.json'),'utf8'));
 const report={version:'0.9.1',vscode:vscode.version,remote:vscode.env.remoteName,checks:[],requests:[],errors:[]};
 const output=path.join(cfg.artifacts,'host-presentation.json'), save=()=>fs.writeFile(output,JSON.stringify(report,null,2));
 const native={tree:vscode.window.createTreeView,panel:vscode.window.createWebviewPanel,error:vscode.window.showErrorMessage,bridge:bridge.runBridge};
 let tree,provider,controller;
 vscode.window.createTreeView=(id,options)=>{const value=native.tree(id,options);if(id==='mrw.readingOutline'){tree=value;provider=options.treeDataProvider}return value};
 vscode.window.showErrorMessage=async text=>{report.errors.push(text);await save()};
 bridge.runBridge=(...args)=>{assert.ok(['artifact_status','outline_follow_reference','outline_notes'].includes(args[2].method));report.requests.push(args[2].method);return native.bridge(...args)};
 vscode.window.createWebviewPanel=(...args)=>{
  const panel=native.panel(...args),webview=panel.webview;
  const post=webview.postMessage.bind(webview),receive=webview.onDidReceiveMessage.bind(webview);
  controller={panel,ready:false};
  webview.onDidReceiveMessage=(fn,self,ds)=>receive(value=>{
   if(value.type==='presentation-reply'){controller.reply?.(value.value);return}
   if(value.type==='ready')controller.ready=true;
   fn.call(self,value);
  },undefined,ds);
  Object.defineProperty(webview,'html',{set:value=>{
   const nonce=/script nonce="([^"]+)"/.exec(value)[1];
   const patched=value.replace('<script nonce=',`<script nonce="${nonce}">(${probe.toString()})()</script><script nonce=`);
   let proto=Object.getPrototypeOf(webview),d;while(proto&&!(d=Object.getOwnPropertyDescriptor(proto,'html')))proto=Object.getPrototypeOf(proto);d.set.call(webview,patched);
  },configurable:true});
  controller.inspect=()=>new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Presentation probe timed out')),10000);
   controller.reply=v=>{clearTimeout(timer);resolve(v)};post({type:'presentation-probe'});
  });return panel;
 };
 async function check(name,fn){await fn();report.checks.push(name);await save()}
 async function command(name,...args){const value=await vscode.commands.executeCommand('mrw.'+name,...args);assert.deepEqual(report.errors,[]);return value}
 try {
  assert.equal(vscode.env.remoteName,'wsl');
  assert.ok(vscode.workspace.workspaceFolders?.some(f=>f.uri.fsPath===cfg.project),'Launch the Development Host with the retained validation workspace; no replacement workspace is created.');
  require('../../src/extension').activate(context);
  const old=JSON.parse(await fs.readFile(path.join(cfg.artifacts,'host-seed.json'),'utf8'));
  const note=path.join(cfg.project,'reading-navigation-validation.md'),before=digest(await fs.readFile(note));
  async function inventory(){const out={};async function walk(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())await walk(f);else if(e.isFile())out[f]=digest(await fs.readFile(f))}}await walk(old.store);return out}
  const storeBefore=await inventory();
  const doc=await vscode.workspace.openTextDocument(vscode.Uri.file(note));await vscode.window.showTextDocument(doc,{preview:false,viewColumn:vscode.ViewColumn.One});
  for(let i=0;i<80&&vscode.window.activeTextEditor?.document!==doc;i++)await pause(100);
  report.workspaceFolders=vscode.workspace.workspaceFolders.map(f=>f.uri.toString());report.overview=doc.uri.toString();report.activeDocument=vscode.window.activeTextEditor?.document.uri.toString();await save();
  assert.equal(vscode.window.activeTextEditor?.document,doc,'Overview editor becomes active before navigation');
  const model=await command('openReadingOutline');const passage=model.all.find(n=>n.reference===old.seed.passage.reference);
  await check('concise source labels retain original citation tooltips',async()=>{const item=provider.getTreeItem(passage);assert.equal(item.label,'Hausdorff spaces');assert.ok(item.tooltip.includes('The Stacks Project Authors'))});
  await check('exact published passage opens rendered mathematics in a full editor group',async()=>{
   await command('selectReadingOutlineItem',passage);
   for(let i=0;i<80&&!controller?.ready;i++)await pause(100);
   assert.ok(controller.ready);await pause(700);
   const view=await controller.inspect();report.passage=view;
   assert.ok(view.innerWidth>=900,JSON.stringify(view));assert.ok(view.toolsClosed);
   assert.ok(view.selectedMath.length);assert.ok(view.selectedBox.top>=0&&view.selectedBox.top<180);
   assert.ok(view.selectedBox.width>=700);assert.equal(view.visibleEditingButtons.length,0);
   assert.ok(controller.panel.active);assert.ok(!vscode.window.visibleTextEditors.some(e=>e.document.uri.scheme==='mrw-record'));
  });
  await check('Return restores the originating Markdown occurrence and navigation',async()=>{
   await command('returnToReadingOutline');assert.equal(vscode.window.activeTextEditor.document,doc);
   assert.equal(doc.offsetAt(vscode.window.activeTextEditor.selection.start),passage.start);assert.ok(tree.visible);
  });
  await check('whole-source reading starts at source content with tools collapsed',async()=>{
   const whole=model.all.find(n=>n.reference===old.seed.whole.reference);await command('selectReadingOutlineItem',whole);await pause(600);
   const view=await controller.inspect();report.whole=view;assert.ok(view.toolsClosed);assert.ok(view.innerWidth>=900);assert.ok(view.allMath>40);
   await command('returnToReadingOutline');assert.equal(doc.offsetAt(vscode.window.activeTextEditor.selection.start),whole.start);
  });
  await check('note and all retained record bytes remain unchanged',async()=>{assert.equal(digest(await fs.readFile(note)),before);assert.deepEqual(await inventory(),storeBefore);assert.ok(!doc.isDirty)});
  // Leave the mathematical destination visible for a passive window capture.
  await command('selectReadingOutlineItem',passage);await pause(400);
  report.complete=true;report.productionExtension=context.extensionPath;await save();
 }catch(error){report.failure=error.stack;await save()}
 finally{vscode.window.createTreeView=native.tree;vscode.window.createWebviewPanel=native.panel;vscode.window.showErrorMessage=native.error;bridge.runBridge=native.bridge}
}
module.exports={activate:context=>{void run(context).catch(console.error)}};
