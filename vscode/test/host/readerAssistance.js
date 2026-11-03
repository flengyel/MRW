'use strict';
// Disposable Windows/WSL host workflow. Prompts and transport are deterministic;
// editor, reader DOM, source capture, preview and retained response are real.
const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const bridge = require('../../src/bridge');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

function probe() {
  const api = acquireVsCodeApi(); window.acquireVsCodeApi = () => api;
  addEventListener('message', e => {
    const v = e.data; if (v.type !== 'reader-ai-test') return;
    try {
      if (v.action === 'draft') {
        const field = document.querySelector('form[data-draft^="note:"] textarea');
        if (!field) throw Error('Annotation form is missing');
        field.value = 'Synthetic unsaved reader draft α';
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (v.action === 'ask') {
        const button = document.querySelector('[data-action="ask-ai-passage"]');
        if (!button || button.disabled) throw Error('Reader AI control is unavailable');
        button.click();
      }
      api.postMessage({type:'reader-ai-reply',token:v.token,result:{
        drafts:[...document.querySelectorAll('textarea')].map(n=>n.value),
        asks:document.querySelectorAll('[data-action="ask-ai-passage"]').length,
      }});
    } catch (error) { api.postMessage({type:'reader-ai-reply',token:v.token,error:error.message}); }
  });
}

async function run(context) {
  const cfg=JSON.parse(await fs.readFile(path.join(context.extensionPath,'host-test.json'),'utf8'));
  const report={vscode:vscode.version,remote:vscode.env.remoteName,checks:[],requests:[],errors:[]};
  const save=()=>fs.writeFile(path.join(cfg.artifacts,'host-reader-ai.json'),JSON.stringify(report,null,2));
  const original={panel:vscode.window.createWebviewPanel,input:vscode.window.showInputBox,
    pick:vscode.window.showQuickPick,error:vscode.window.showErrorMessage,bridge:bridge.runBridge};
  const inputs=['Explain this exact retained passage.','host-test-model'];
  let controller,serial=0;
  vscode.window.showInputBox=async()=>{assert.ok(inputs.length,'Unexpected input dialog');return inputs.shift();};
  vscode.window.showQuickPick=async rows=>rows[0];
  vscode.window.showErrorMessage=async text=>{report.errors.push(text);await save();};
  bridge.runBridge=(extension,executable,request,options={})=>{
    report.requests.push(request.method);
    return original.bridge(extension,executable,request,{...options,
      spawn:(exe,args,settings)=>spawn(exe,['-I',path.join(extension,'test/host/deterministic_bridge.py'),cfg.artifacts,'completed'],settings)});
  };
  vscode.window.createWebviewPanel=(...args)=>{
    const panel=original.panel(...args),w=panel.webview,c={panel,pending:new Map(),idle:0};controller=c;
    const post=w.postMessage.bind(w),receive=w.onDidReceiveMessage.bind(w);
    w.postMessage=value=>{if(value.type==='outline')c.model=value.model;if(value.type==='idle')c.idle++;return post(value);};
    w.onDidReceiveMessage=(listener,self,ds)=>receive(value=>{
      if(value.type==='reader-ai-reply'){
        const pending=c.pending.get(value.token);if(pending){c.pending.delete(value.token);value.error?pending.reject(Error(value.error)):pending.resolve(value.result);}
      }else return listener.call(self,value);
    },undefined,ds);
    Object.defineProperty(w,'html',{set:value=>{
      const nonce=/script nonce="([^"]+)"/.exec(value)[1];
      const html=value.replace('<script nonce=',`<script nonce="${nonce}">(${probe.toString()})()</script><script nonce=`);
      let proto=Object.getPrototypeOf(w),descriptor;while(proto&&!(descriptor=Object.getOwnPropertyDescriptor(proto,'html')))proto=Object.getPrototypeOf(proto);
      descriptor.set.call(w,html);
    },configurable:true});
    c.rpc=action=>new Promise((resolve,reject)=>{
      const token=++serial,timer=setTimeout(()=>{c.pending.delete(token);reject(Error('Reader DOM probe timed out'));},12000);
      c.pending.set(token,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});
      post({type:'reader-ai-test',token,action});
    });
    return panel;
  };
  const check=async(name,action)=>{await action();report.checks.push(name);await save();};
  try {
    assert.equal(vscode.env.remoteName,'wsl');
    assert.equal(vscode.workspace.workspaceFolders[0].uri.fsPath,cfg.project);
    require('../../src/extension').activate(context);
    const file=path.join(cfg.project,'reader-fixture.md');
    const text='α😀 → β\r\nClaim.\r\nPRIVATE UNSELECTED';
    await fs.writeFile(file,text,{flag:'wx'});
    const doc=await vscode.workspace.openTextDocument(file);
    const editor=await vscode.window.showTextDocument(doc,{preview:false,viewColumn:vscode.ViewColumn.One});
    editor.selection=new vscode.Selection(0,1,1,5);
    const created=await vscode.commands.executeCommand('mrw.createOutline');
    for(let i=0;i<60&&!controller?.model;i++)await pause(100);
    assert.ok(controller?.model);await pause(500);
    const revision=created.revision;
    await check('reader exposes a passage AI control and keeps an unsaved annotation',async()=>{
      const state=await controller.rpc('draft');assert.equal(state.asks,1);
      assert.ok(state.drafts.includes('Synthetic unsaved reader draft α'));
    });
    await fs.unlink(file); // Disposable original only; retained material must work.
    await check('real reader click prepares exact retained Unicode after original removal',async()=>{
      const idle=controller.idle;await controller.rpc('ask');
      for(let i=0;i<100&&controller.idle===idle;i++)await pause(100);
      assert.ok(controller.idle>idle);assert.deepEqual(report.errors,[]);
      const preview=vscode.window.activeTextEditor.document.getText();
      assert.ok(preview.includes('mrw-outline:v1/'));assert.ok(preview.includes('😀 → β'));
      assert.ok(preview.includes('Claim'));assert.ok(!preview.includes('PRIVATE UNSELECTED'));
      assert.ok(!preview.includes('Synthetic unsaved reader draft α'));
      assert.ok(!report.requests.includes('send_assistance'));
      const state=await controller.rpc('inspect');assert.ok(state.drafts.includes('Synthetic unsaved reader draft α'));
    });
    await check('separate Send retains a deterministic attributed response with exact source identity',async()=>{
      await vscode.commands.executeCommand('mrw.sendRequest');assert.deepEqual(report.errors,[]);
      assert.equal(report.requests.filter(m=>m==='send_assistance').length,1);
      assert.ok(report.requests.includes('review'));
      const transport=(await fs.readFile(path.join(cfg.artifacts,'transport.jsonl'),'utf8')).trim().split('\n');
      assert.equal(transport.length,1);
      const body=JSON.parse(JSON.parse(transport[0]).body);
      assert.ok(JSON.stringify(body).includes('😀 → β'));assert.ok(!JSON.stringify(body).includes('PRIVATE UNSELECTED'));
    });
    await check('return to reader preserves unsaved annotation and source-record revision',async()=>{
      controller.panel.reveal(vscode.ViewColumn.One,false);await pause(300);
      const state=await controller.rpc('inspect');assert.ok(state.drafts.includes('Synthetic unsaved reader draft α'));
      assert.equal(controller.model.revision,revision);
      assert.ok(controller.panel.active);
    });
    report.complete=true;await save();
  } catch(error) {report.failure=error.stack;await save();}
  finally {
    vscode.window.createWebviewPanel=original.panel;vscode.window.showInputBox=original.input;
    vscode.window.showQuickPick=original.pick;vscode.window.showErrorMessage=original.error;
    bridge.runBridge=original.bridge;
  }
}
module.exports={activate:context=>{void run(context).catch(console.error);}};
