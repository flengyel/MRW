'use strict';
// One disposable normal Windows/WSL host workflow; no live provider or imports.
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const bridge = require('../../src/bridge');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function probe() {
  const api = acquireVsCodeApi(); window.acquireVsCodeApi = () => api;
  const failures = [];
  addEventListener('securitypolicyviolation', e => failures.push(e.violatedDirective));
  addEventListener('message', async e => {
    const v = e.data; if (v.type !== 'diagram-test') return;
    try {
      const target = v.selector && document.querySelector(v.selector);
      if (v.op === 'click') { if (!target) throw Error('Missing control ' + v.selector); target.click(); }
      if (v.op === 'form') {
        if (!target) throw Error('Missing form');
        for (const [key, value] of Object.entries(v.values)) {
          const field = target.querySelector(`[name="${key}"]`); field.value = value;
          field.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
      if (v.op === 'image') {
        document.querySelector('.reader-notes').open = true;
        const image = document.querySelector('.reader-diagram img');
        if (!image) throw Error('Retained diagram image is absent');
        await image.decode(); image.scrollIntoView({block:'center'});
      }
      const image = document.querySelector('.reader-diagram img');
      api.postMessage({type:'diagram-test-reply',token:v.token,result:{failures,
        image:image && {width:image.naturalWidth,height:image.naturalHeight,source:image.src},
        texts:[...document.querySelectorAll('textarea')].map(n=>n.value)}});
    } catch (error) { api.postMessage({type:'diagram-test-reply',token:v.token,error:error.message}); }
  });
}
async function run(context) {
  const cfg=JSON.parse(await fs.readFile(path.join(context.extensionPath,'host-test.json'),'utf8'));
  const report={phase:cfg.phase,vscode:vscode.version,remote:vscode.env.remoteName,checks:[],requests:[],errors:[]};
  const output=path.join(cfg.artifacts,'host-'+cfg.phase+'.json');
  const save=()=>fs.writeFile(output,JSON.stringify(report,null,2));
  const original={panel:vscode.window.createWebviewPanel,error:vscode.window.showErrorMessage,pick:vscode.window.showQuickPick,bridge:bridge.runBridge};
  const controllers=[];let token=0;
  vscode.window.showErrorMessage=async message=>{report.errors.push(message);await save();};
  vscode.window.showQuickPick=async rows=>rows[0];
  bridge.runBridge=async(...args)=>{report.requests.push(args[2].method);return original.bridge(...args);};
  vscode.window.createWebviewPanel=(...args)=>{
    const panel=original.panel(...args),w=panel.webview,c={panel,pending:new Map(),idle:0};controllers.push(c);
    const post=w.postMessage.bind(w),receive=w.onDidReceiveMessage.bind(w);
    w.postMessage=value=>{if(value.type==='outline')c.model=value.model;if(value.type==='idle')c.idle++;return post(value);};
    w.onDidReceiveMessage=(listener,self,disposables)=>receive(value=>{
      if(value.type==='diagram-test-reply'){
        const promise=c.pending.get(value.token);if(promise){c.pending.delete(value.token);value.error?promise.reject(Error(value.error)):promise.resolve(value.result);}
      }else listener.call(self,value);
    },undefined,disposables);
    Object.defineProperty(w,'html',{set:value=>{
      const nonce=/script nonce="([^"]+)"/.exec(value)[1];
      const html=value.replace('<script nonce=',`<script nonce="${nonce}">(${probe.toString()})()</script><script nonce=`);
      let proto=Object.getPrototypeOf(w),descriptor;while(proto&&!(descriptor=Object.getOwnPropertyDescriptor(proto,'html')))proto=Object.getPrototypeOf(proto);
      descriptor.set.call(w,html);
    },configurable:true});
    c.rpc=(op,selector,values)=>new Promise((resolve,reject)=>{
      const id=++token,timer=setTimeout(()=>{c.pending.delete(id);reject(Error('DOM diagram probe timed out'));},15000);
      c.pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});
      post({type:'diagram-test',token:id,op,selector,values});
    });
    c.wait=async before=>{for(let i=0;i<250&&c.idle===before;i++)await pause(100);assert.ok(c.idle>before);assert.deepEqual(report.errors,[]);};
    return panel;
  };
  try {
    for(let i=0;i<100&&!vscode.workspace.workspaceFolders?.length;i++)await pause(100);
    assert.equal(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,cfg.project,'Disposable workspace must be open; no fallback to real work');
    assert.equal(vscode.env.remoteName,'wsl');assert.equal(vscode.workspace.isTrusted,true);
    require('../../src/extension').activate(context);
    const source=path.join(cfg.project,'diagram-note.md'),before=await fs.readFile(source,'utf8');
    if(cfg.phase==='seed'){
      const document=await vscode.workspace.openTextDocument(vscode.Uri.file(source));
      await vscode.window.showTextDocument(document,{preview:false});
      await vscode.commands.executeCommand('mrw.createOutline');
    }else await vscode.commands.executeCommand('mrw.openOutline');
    for(let i=0;i<100&&!controllers.at(-1)?.model;i++)await pause(100);
    const c=controllers.at(-1);assert.ok(c?.model);await pause(500);
    if(cfg.phase==='seed'){
      const selector='form[data-draft="note:overview:new"]';let idle=c.idle;
      await c.rpc('form',selector,{purpose:'explanation',origin:'unknown',author:'Automated TikZ fixture',text:cfg.annotation});
      await c.rpc('click',selector+' [data-action="save-note"]');await c.wait(idle);
      assert.equal(report.requests.includes('outline_render_diagram'),false);report.checks.push('Save did not compile');
      idle=c.idle;await c.rpc('click','.reader-diagram [data-action="render-diagram"]');
      await c.rpc('form',selector,{text:'Synthetic newer unsaved draft preserved during render.'});
      await c.wait(idle);
      const dom=await c.rpc('image');assert.ok(dom.texts.includes('Synthetic newer unsaved draft preserved during render.'));
      report.checks.push('Explicit native render preserved concurrent unsaved form text');
    }
    const dom=await c.rpc('image');assert.ok(dom.image.width>0&&dom.image.height>0);assert.deepEqual(dom.failures,[]);
    report.image={width:dom.image.width,height:dom.image.height};
    assert.equal(c.model.outline.annotations[0].text,cfg.annotation);
    assert.equal(await fs.readFile(source,'utf8'),before);
    if(cfg.phase==='reopen')assert.equal(report.requests.includes('outline_render_diagram'),false);
    report.checks.push('Native webview decoded retained SVG with no CSP violation; exact note/source preserved');
    report.outline=c.model.outline.id;report.complete=true;
  }catch(error){report.failure=error.stack;}
  finally{
    vscode.window.createWebviewPanel=original.panel;vscode.window.showErrorMessage=original.error;vscode.window.showQuickPick=original.pick;bridge.runBridge=original.bridge;
    await save();
  }
}
module.exports={activate:context=>{void run(context).catch(console.error);}};
