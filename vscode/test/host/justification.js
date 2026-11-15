'use strict';
const vscode=require('vscode'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const guard=require('./fixtureGuard');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function wait(fn,label,ms=30000){const end=Date.now()+ms;while(!fn()){if(Date.now()>end)throw Error('Timed out: '+label);await pause(50);}}
async function run(context){
 const {marker,config}=await guard.assertFixture(vscode,context,context.extensionPath),root=marker.root;
 const reportPath=path.join(root,'native-result.json'),cfgPath=path.join(context.extensionPath,'host-test.json');
 const report=config.phase==='restart'?JSON.parse(await fs.readFile(reportPath,'utf8')):{host:vscode.version,remote:vscode.env.remoteName,checks:[],requests:[],errors:[]};
 let realBridge,bridgeModule,last,panel,observed='',note,baseline,reloading=false;
 const original={pick:vscode.window.showQuickPick,warn:vscode.window.showWarningMessage,create:vscode.window.createWebviewPanel,error:vscode.window.showErrorMessage};
 const save=async()=>{const sync=require('node:fs'),temp=reportPath+'.next';sync.writeFileSync(temp,JSON.stringify(report,null,2));sync.renameSync(temp,reportPath);};
 try{
  bridgeModule=require('../../src/bridge');realBridge=bridgeModule.runBridge;bridgeModule.runBridge=async(...args)=>{report.requests.push(args[2].method);return realBridge(...args);};
  vscode.window.showErrorMessage=async message=>{report.errors.push(message);await save();};
  vscode.window.showWarningMessage=async(_message,_options,...choices)=>choices.includes('Search successor')?'Search successor':undefined;
  vscode.window.showQuickPick=async items=>{
   if(items.some(i=>i.kind==='example'))return config.phase==='restart'?items.find(i=>i.revision===config.successor):items.find(i=>i.kind==='example');
   if(items.some(i=>i.admission))return items.find(i=>i.admission==='bezout-proof-bridge');
   throw Error('Unexpected native picker');
  };
  vscode.window.createWebviewPanel=(...args)=>{
   const native=original.create.apply(vscode.window,args);
   if(args[0]!=='mrw.justification')return native;
   const webview=new Proxy(native.webview,{get(target,key){
    if(key==='postMessage')return async value=>{if(value.type==='grounds')last=value;return target.postMessage(value);};
    if(key==='onDidReceiveMessage')return (listener,...rest)=>target.onDidReceiveMessage(value=>{
     if(value.type==='fixture_dom'){observed=value.text;report.domMath=value.math;return;}return listener(value);
    },...rest);
    const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
   },set(target,key,value){
    if(key==='html'){
     value=value.replace('const api=acquireVsCodeApi(),root=', 'const api=acquireVsCodeApi();window.__fixture_api=api;const root=');
     const nonce=/script nonce="([^"]+)"/.exec(value)?.[1];assert.ok(nonce);
     const fixture=`window.addEventListener('message',e=>{if(e.data.type==='fixture_click'){const b=[...document.querySelectorAll('button')].find(b=>b.textContent===e.data.label);if(b)b.click();}if(e.data.type==='grounds'||e.data.type==='fixture_click')setTimeout(()=>window.__fixture_api.postMessage({type:'fixture_dom',text:document.getElementById('reader').innerText,math:document.querySelectorAll('math').length}),0);});`;
     value=value.replace('</body>',`<script nonce="${nonce}">${fixture}</script></body>`);
    }Reflect.set(target,key,value,target);return true;
   }});
   panel=new Proxy(native,{get(target,key){if(key==='webview')return webview;const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;},set(target,key,value){Reflect.set(target,key,value,target);return true;}});
   return panel;
  };
  require('../../src/extension').activate(context);
  note=await vscode.workspace.openTextDocument(vscode.Uri.file(path.join(config.project,'reading.md')));baseline=await fs.readFile(note.uri.fsPath,'utf8');
  const editor=await vscode.window.showTextDocument(note,{viewColumn:1,preview:false});
  await wait(()=>vscode.window.activeTextEditor?.document===note,'native originating document');
  if(config.phase!=='restart'){
   assert.ok(await editor.edit(edit=>edit.insert(new vscode.Position(0,0),'Unsent grounds fixture\n')));assert.ok(note.isDirty);
  }
  await vscode.commands.executeCommand('mrw.openJustification');
  await wait(()=>last&&observed.includes('Euclid lemma'),'native reader and renderer');
  const click=async label=>{observed='';await panel.webview.postMessage({type:'fixture_click',label});};
  if(config.phase!=='restart'){
   assert.ok(last.pending);await click('Search under these admissions');
   await wait(()=>last?.revision&&!last.busy,'first retained search');const first=last.revision;assert.equal(last.result.routes.length,2);await save();
   assert.ok(note.isDirty);assert.equal(note.getText(),'Unsent grounds fixture\n'+baseline);assert.equal(await fs.readFile(note.uri.fsPath,'utf8'),baseline);
   report.checks.push('real native reader obtains two Lean-checked routes and retains an unrelated unsent document without saving it');
   await click('Withdraw a ground…');await wait(()=>last?.revision&&last.revision!==first&&!last.busy,'successor search');
   assert.equal(last.result.routes.length,1);assert.deepEqual(last.result.routes[0].admission_ids,['factorization-proof-bridge','factorization-theorem']);
   config.successor=last.revision;config.first=first;report.checks.push('native withdrawal preserves the factorization route in a successor context');
   await click('Unique factorization argument');await wait(()=>observed.includes('prime factorizations concatenate'),'exact retained source');assert.ok(report.domMath>0);
   await click('← Back to routes');await wait(()=>observed.includes('Checked routes'),'source Return');
   await click('Open earlier context');await wait(()=>last.revision===first&&!last.busy,'earlier context');assert.equal(last.result.routes.length,2);
   report.checks.push('same reader shows exact retained mathematical source, rendered mathematics, Back to routes, and the preserved earlier context');
   await click('← Return to document');await wait(()=>vscode.window.tabGroups.activeTabGroup.activeTab?.input?.uri?.toString()===note.uri.toString(),'origin Return to rendered document');await pause(150);
   assert.ok(note.isDirty);assert.equal(note.getText(),'Unsent grounds fixture\n'+baseline);
   // Restore only the verified synthetic edit before a real host reload.
   const own=await vscode.window.showTextDocument(note,{viewColumn:1,preview:false});assert.ok(await own.edit(edit=>edit.delete(new vscode.Range(0,0,1,0))));
   assert.equal(note.getText(),baseline);if(note.isDirty)assert.ok(await note.save());
   config.phase='restart';await fs.writeFile(cfgPath,JSON.stringify(config,null,2));await save();
   reloading=true;void vscode.commands.executeCommand('workbench.action.reloadWindow');return;
  }
  assert.equal(last.revision,config.successor);assert.equal(last.result.routes.length,1);
  assert.ok(!report.requests.slice(-3).some(m=>['route_run','route_setup'].includes(m)));
  report.checks.push('after a real extension-host/window reload, the saved successor reopens without another Lean build or search');
  assert.equal(report.errors.length,0);report.complete=true;await save();await fs.writeFile(path.join(root,'ready'),'complete');
  // Keep the isolated reader visible briefly for a scoped screenshot.
  for(let i=0;i<160&&!await fs.stat(path.join(root,'finish')).catch(()=>null);i++)await pause(250);
  await guard.clearOwnedState(context);
 }catch(error){if(!reloading){report.failure=error.stack;await save();}}
 finally{
  if(bridgeModule&&realBridge)bridgeModule.runBridge=realBridge;
  vscode.window.showQuickPick=original.pick;vscode.window.showWarningMessage=original.warn;vscode.window.createWebviewPanel=original.create;vscode.window.showErrorMessage=original.error;
  if(!reloading)await save();if(report.complete&&!vscode.workspace.textDocuments.some(d=>d.isDirty))await vscode.commands.executeCommand('workbench.action.closeWindow');
 }
}
module.exports={activate:context=>{void run(context).catch(console.error);}};
module.exports=require('./fixtureGuard').protect(module.exports,{vscode,filename:__filename});
