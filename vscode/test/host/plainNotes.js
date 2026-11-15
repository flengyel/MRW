'use strict';
// Native test entry point: refuse every workspace outside the disposable fixture.
const vscode=require('vscode'),fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const bridge=require('../../src/bridge'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function probe(){
 const api=acquireVsCodeApi();window.acquireVsCodeApi=()=>api;
 addEventListener('message',async e=>{const v=e.data;if(v.type!=='plain-note-test')return;try{
  const target=v.selector&&document.querySelector(v.selector);
  if(v.op==='click'){if(!target)throw Error('Missing control '+v.selector);target.click();}
  if(v.op==='text'){target.value=v.value;target.dispatchEvent(new Event('input',{bubbles:true}));}
  if(v.op==='key')target.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true,bubbles:true}));
  if(v.op==='notes')for(const d of document.querySelectorAll('.reader-notes'))d.open=true;
  await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
  const chosen=document.querySelector(v.selector?.startsWith('form')?v.selector:'form[data-draft$=":new"]');
  const editor=chosen?.closest('form');
  const image=document.querySelector('.reader-diagram img');if(image)await image.decode();
  api.postMessage({type:'plain-note-test-reply',token:v.token,result:{focus:document.activeElement?.name,
   fields:editor&&[...editor.querySelectorAll('input,textarea,select')].map(n=>n.name),
   value:editor?.querySelector('textarea')?.value,first:editor?.firstElementChild?.tagName,
   details:editor&&[...editor.querySelectorAll('details')].map(n=>({label:n.querySelector('summary').textContent,open:n.open})),
   buttons:editor&&[...editor.querySelectorAll('button')].map(n=>n.textContent),width:innerWidth,
   overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
   visible:editor&&['textarea','[data-action="save-note"]','[data-action="cancel-note"]'].every(s=>{const r=editor.querySelector(s).getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight;}),
   math:document.querySelectorAll('.reader-note-text math').length,image:image&&{width:image.naturalWidth,height:image.naturalHeight,source:image.src}}});
 }catch(err){api.postMessage({type:'plain-note-test-reply',token:v.token,error:err.message});}});
}
async function capture(directory,name,width,beforeCapture){
 const target=path.join(directory,name+'.png').replaceAll('/','\\');
 const ps=`Add-Type -AssemblyName System.Windows.Forms; Add-Type -AssemblyName System.Drawing; Add-Type @'\nusing System;using System.Runtime.InteropServices;public class MRWFixtureWindow{[DllImport("user32.dll")]public static extern IntPtr SetThreadDpiAwarenessContext(IntPtr c);[DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h,int c);[DllImport("user32.dll")]public static extern bool SetForegroundWindow(IntPtr h);[DllImport("user32.dll")]public static extern bool PrintWindow(IntPtr h,IntPtr dc,uint flags);[DllImport("user32.dll")]public static extern bool MoveWindow(IntPtr h,int x,int y,int w,int z,bool r);[DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out Rect r);public struct Rect{public int Left,Top,Right,Bottom;}}\n'@; [MRWFixtureWindow]::SetThreadDpiAwarenessContext([IntPtr](-4))|Out-Null; $w=@(Get-Process Code | Where-Object {$_.MainWindowTitle -like '*MRW note writing fixture*'}); if($w.Count -ne 1){throw 'Unique fixture window unavailable'}; [MRWFixtureWindow]::MoveWindow($w[0].MainWindowHandle,40,40,${width},900,$true)|Out-Null; [MRWFixtureWindow]::ShowWindow($w[0].MainWindowHandle,9)|Out-Null;[MRWFixtureWindow]::SetForegroundWindow($w[0].MainWindowHandle)|Out-Null;Start-Sleep -Milliseconds 900; $r=New-Object MRWFixtureWindow+Rect; [MRWFixtureWindow]::GetWindowRect($w[0].MainWindowHandle,[ref]$r)|Out-Null; $b=New-Object System.Drawing.Bitmap(($r.Right-$r.Left),($r.Bottom-$r.Top)); $g=[System.Drawing.Graphics]::FromImage($b); $dc=$g.GetHdc();$ok=[MRWFixtureWindow]::PrintWindow($w[0].MainWindowHandle,$dc,2);$g.ReleaseHdc($dc);if(-not $ok){throw 'Fixture capture failed'}; $b.Save('\\\\wsl.localhost\\Debian${target}');$g.Dispose();$b.Dispose();`;
 const prefix=ps.slice(0,ps.indexOf(' $r=New-Object'));
 await promisify(execFile)('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(prefix,'utf16le').toString('base64')]);
 await beforeCapture();
 await promisify(execFile)('/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(ps,'utf16le').toString('base64')]);
}
async function run(context){
 const cfg=JSON.parse(await fs.readFile(path.join(context.extensionPath,'host-test.json'),'utf8'));
 assert.equal(path.basename(cfg.project),'mrw-plain-note-fixture');assert.equal(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,cfg.project);
 const report={checks:[],errors:[],requests:[],complete:false};const original={panel:vscode.window.createWebviewPanel,error:vscode.window.showErrorMessage,warning:vscode.window.showWarningMessage,bridge:bridge.runBridge};let controller,token=0,failRender=false,discard=false;
 bridge.runBridge=async(...args)=>{const method=args[2].method;report.requests.push(method);if(failRender&&method==='outline_render_diagram'){const e=Error('Injected rerender rejection');e.code='ACTION_REJECTED';throw e;}return original.bridge(...args);};
 vscode.window.showErrorMessage=async message=>{report.errors.push(message);};
 vscode.window.showWarningMessage=async()=>discard?'Discard':undefined;
 vscode.window.createWebviewPanel=(...args)=>{const panel=original.panel(...args),w=panel.webview,c={panel,pending:new Map(),idle:0},post=w.postMessage.bind(w),receive=w.onDidReceiveMessage.bind(w);controller=c;
  w.postMessage=value=>{if(value.type==='outline')c.model=value.model;if(value.type==='idle')c.idle++;return post(value);};
  w.onDidReceiveMessage=(listener,self,subscriptions)=>receive(value=>{if(value.type==='plain-note-test-reply'){const p=c.pending.get(value.token);if(p){c.pending.delete(value.token);clearTimeout(p.timer);value.error?p.reject(Error(value.error)):p.resolve(value.result);}}else listener.call(self,value);},undefined,subscriptions);
  Object.defineProperty(w,'html',{set:value=>{const nonce=/script nonce="([^"]+)"/.exec(value)[1];const html=value.replace('<script nonce=',`<script nonce="${nonce}">(${probe.toString()})()</script><script nonce=`);let proto=Object.getPrototypeOf(w),d;while(proto&&!(d=Object.getOwnPropertyDescriptor(proto,'html')))proto=Object.getPrototypeOf(proto);d.set.call(w,html);},configurable:true});
  c.rpc=(op,selector,value)=>new Promise((resolve,reject)=>{const id=++token,timer=setTimeout(()=>{c.pending.delete(id);reject(Error('Native note probe timed out'));},15000);c.pending.set(id,{resolve,reject,timer});post({type:'plain-note-test',token:id,op,selector,value});});
  c.wait=async before=>{for(let i=0;i<160&&c.idle===before;i++)await pause(100);assert.ok(c.idle>before,'Reader action did not finish');};return panel;
 };
 try{
  require('../../src/extension').activate(context);const file=path.join(cfg.project,'source.txt'),source=await fs.readFile(file,'utf8'),doc=await vscode.workspace.openTextDocument(file),editor=await vscode.window.showTextDocument(doc,{preview:false});editor.selection=new vscode.Selection(doc.positionAt(0),doc.positionAt(source.length));
  for(let i=0;i<40&&vscode.window.activeTextEditor?.document!==doc;i++){await pause(100);await vscode.window.showTextDocument(doc,{preview:false});}
  assert.equal(vscode.window.activeTextEditor?.document,doc,'Native fixture source must have focus');
  assert.ok(await vscode.commands.executeCommand('mrw.createOutline'),'Native source capture failed');await vscode.commands.executeCommand('workbench.action.closeSidebar');await vscode.commands.executeCommand('workbench.action.joinAllGroups');
  const c=controller;for(let i=0;i<100&&!c.model;i++)await pause(100);await pause(300);
  const region=c.model.outline.regions[0].id,selector=`form[data-draft="note:${region}:new"]`;
  await c.rpc('click','[data-action="add-reader-note"]');let state=await c.rpc('inspect',selector);assert.equal(state.focus,'text');assert.equal(state.first,'TEXTAREA');assert.ok(!state.fields.includes('purpose'));assert.ok(state.details.every(d=>!d.open));assert.deepEqual(state.buttons,['Save','Cancel']);
  await capture(cfg.artifacts,'normal',1300,()=>c.rpc('click','[data-action="add-reader-note"]'));await pause(300);report.normal=await c.rpc('inspect',selector);assert.equal(report.normal.overflow,false);assert.equal(report.normal.visible,true);
  await capture(cfg.artifacts,'narrow',680,()=>c.rpc('click','[data-action="add-reader-note"]'));await pause(300);report.narrow=await c.rpc('inspect',selector);assert.equal(report.narrow.overflow,false);assert.equal(report.narrow.visible,true);assert.ok(report.narrow.width<report.normal.width);report.checks.push('Actual native text focus, text-first entry, Save/Cancel and collapsed details at normal and narrow widths');
  await c.rpc('text',selector+' textarea',cfg.annotation);let idle=c.idle;await c.rpc('key',selector+' textarea');await c.wait(idle);
  const note=c.model.outline.regions[0].annotations[0];assert.equal(note.kind,'note');assert.equal(note.provenance.origin,'unknown');assert.equal(note.provenance.author,null);assert.equal(note.text,cfg.annotation);assert.ok(!report.requests.includes('outline_render_diagram'));
  await c.rpc('notes');state=await c.rpc('inspect',selector);assert.ok(state.math>=2);report.checks.push('Keyboard Save persists plain note with unknown attribution and renders inline/display LaTeX without compiling');
  await c.rpc('click','[data-action="add-reader-note"]');await c.rpc('text',selector+' textarea','Unsaved source-note draft');await vscode.commands.executeCommand('mrw.refreshSourceOutline');state=await c.rpc('inspect',selector);assert.equal(state.value,'Unsaved source-note draft');assert.equal(state.focus,'text');
  idle=c.idle;await c.rpc('click',selector+' [data-action="cancel-note"]');await c.wait(idle);assert.equal((await c.rpc('inspect',selector)).value,'Unsaved source-note draft');discard=true;idle=c.idle;await c.rpc('click',selector+' [data-action="cancel-note"]');await c.wait(idle);assert.equal((await c.rpc('inspect',selector)).value,'');report.checks.push('Refresh preserves native draft/caret; cancelled discard preserves it and accepted discard removes only the draft');
  idle=c.idle;await c.rpc('click','.reader-diagram [data-action="render-diagram"]');await c.wait(idle);await c.rpc('notes');state=await c.rpc('inspect',selector);assert.ok(state.image.width>0);const valid=state.image.source;report.checks.push('Explicit native TikZ compilation produces a decoded retained SVG');
  failRender=true;idle=c.idle;await c.rpc('click','.reader-diagram [data-action="render-diagram"]');await c.wait(idle);state=await c.rpc('inspect',selector);assert.equal(state.image.source,valid);assert.ok(report.errors.pop().includes('Injected rerender rejection'));failRender=false;assert.equal(c.model.outline.regions[0].annotations[0].text,cfg.annotation);assert.equal(await fs.readFile(file,'utf8'),source);assert.deepEqual(report.errors,[]);report.checks.push('Injected rerender rejection preserves original LaTeX/TikZ and earlier valid SVG; ordinary source is unchanged');report.complete=true;
 }catch(e){report.failure=e.stack;}
 finally{vscode.window.createWebviewPanel=original.panel;vscode.window.showErrorMessage=original.error;vscode.window.showWarningMessage=original.warning;bridge.runBridge=original.bridge;await fs.writeFile(path.join(cfg.artifacts,'native-result.json'),JSON.stringify(report,null,2));await vscode.commands.executeCommand('workbench.action.closeWindow');}
}
module.exports={activate:context=>{void run(context).catch(console.error);}};

// Refuse before any test activation, settings change, write or UI patch.
module.exports=require('./fixtureGuard').protect(module.exports,{vscode,filename:__filename});
