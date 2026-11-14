'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),{createRequire}=require('node:module');
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-diagnostics-menu-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const commands=new Map(),choices=[],calls=[],docs=[],subscriptions=[];
 const api={version:1,scope:'isolated-menu-fixture',featureUse:async options=>{calls.push(options);return {markdown:'Recorded observations only',features:[],versions:['test']};}};
 const vscode={extensions:{getExtension:()=>({activate:async()=>({mrwInspection:api})})},workspace:{getConfiguration:()=>({get:(_key,fallback)=>fallback}),onDidChangeConfiguration:()=>({dispose(){}}),openTextDocument:async data=>{docs.push(data);return data;}},
 window:{state:{focused:false},showQuickPick:async rows=>{const choose=choices.shift();return choose?.(rows);},withProgress:async(_,fn)=>fn(undefined,{onCancellationRequested:()=>({dispose(){}})}),showTextDocument:async()=>{},showErrorMessage:message=>assert.fail(message),onDidChangeWindowState:()=>({dispose(){}})},commands:{registerCommand:(id,fn)=>{commands.set(id,fn);return {dispose(){}};}},ProgressLocation:{Notification:1}};
 const filename=path.resolve(__dirname,'../src/extension.js'),source=await fs.readFile(filename,'utf8'),loaded={exports:{}},nativeRequire=createRequire(filename);
 vm.runInNewContext(source,{module:loaded,exports:loaded.exports,require:id=>id==='vscode'?vscode:nativeRequire(id),setInterval,clearInterval,AbortController},{filename});
 loaded.exports.activate({globalStorageUri:{fsPath:root},subscriptions});t.after(()=>subscriptions.forEach(s=>s.dispose?.()));
 return {root,commands,choices,calls,docs};
}
test('manual Feature Use cancellation asks only for a period and creates no report',async t=>{
 const f=await fixture(t);f.choices.push(rows=>{assert.deepEqual(Array.from(rows,row=>row.period),['last7','last30','previous30','compare30']);return undefined;});
 await f.commands.get('mrwDiagnostics.featureUse')();assert.equal(f.calls.length,0);assert.equal(f.docs.length,0);assert.deepEqual(await fs.readdir(f.root),[]);
});
test('manual Feature Use forwards the chosen period and comparison renders both reads',async t=>{
 const f=await fixture(t);f.choices.push(rows=>rows.find(row=>row.period==='last7'));await f.commands.get('mrwDiagnostics.featureUse')();
 assert.equal(f.calls.length,1);assert.equal(Date.parse(f.calls[0].to)-Date.parse(f.calls[0].from),7*86400000);assert.match(f.docs[0].content,/Last 7 days/);
 f.choices.push(rows=>rows.find(row=>row.period==='compare30'));await f.commands.get('mrwDiagnostics.featureUse')();assert.equal(f.calls.length,3);assert.ok(f.calls[2].to<f.calls[1].from);assert.match(f.docs[1].content,/Comparison period/);
});
