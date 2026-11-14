'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {registerCompanionTools,companionStatus,GROUPS}=require('../src/companionTools');
function harness(){const handlers=new Map(),picks=[],calls=[];const vscode={workspace:{getConfiguration:()=>({get:(_k,d)=>d})},extensions:{getExtension:()=>undefined},Uri:{parse:x=>x},window:{showQuickPick:async rows=>{const pick=picks.shift();return pick?.(rows);},showOpenDialog:async()=>undefined},commands:{getCommands:async()=>Object.values(GROUPS).flatMap(rows=>rows.filter(r=>r[1]).map(r=>'mrw.'+r[1])),executeCommand:async(...args)=>calls.push(args)},env:{openExternal:async uri=>calls.push(['external',uri])}};registerCompanionTools({vscode,register:(id,fn)=>handlers.set(id,fn)});return {handlers,picks,calls,vscode};}
test('purpose menus expose retained calculations and setup without a command wall or ordinary study prompts',()=>{
 const manifest=require('../package.json'),welcome=manifest.contributes.viewsWelcome.find(v=>v.view==='mrw.commands').contents;
 for(const id of Object.keys(GROUPS))assert.ok(welcome.includes('command:mrw.'+id));
 assert.ok(!welcome.includes('command:mrw.moveWorkspace'));
 for(const menu of ['editor/context','editor/title'])assert.ok(!manifest.contributes.menus[menu].some(x=>x.command==='mrw.studyCurrent'));
 assert.ok(GROUPS.calculationTools.some(x=>x[1]==='openNotebookResult'));assert.ok(GROUPS.companionTools.some(x=>x[1]==='connectZotero'));
});
test('setup shows installed/configured versus unchecked states without probes and cancellation is inert',async()=>{
 const h=harness();assert.equal(h.calls.length,0);await h.handlers.get('mrw.calculationTools')();assert.equal(h.calls.length,0);
 h.picks.push(rows=>rows[0],rows=>{assert.ok(rows.find(x=>x.label==='Lean 4').description.includes('not installed'));assert.ok(rows.find(x=>x.label==='Obsidian').description.includes('not configured'));return rows.find(x=>x.label==='Jupyter / SagePod');});
 await h.handlers.get('mrw.companionTools')();assert.deepEqual(h.calls,[['external','https://github.com/flengyel/MRW/blob/main/docs/GETTING_STARTED_WSL_SAGEPOD.md']]);
 h.vscode.extensions.getExtension=()=>({});assert.ok(companionStatus(h.vscode).find(x=>x.label==='Lean 4').description.includes('extension installed; connection not checked; toolchain not checked'));
});
test('group selection delegates one existing action and native notebook opening submits no kernel work',async()=>{
 const h=harness();h.picks.push(rows=>rows.find(x=>x.command==='mrw.openNotebookResult'));await h.handlers.get('mrw.calculationTools')();assert.deepEqual(h.calls,[['mrw.openNotebookResult']]);
 h.vscode.window.showOpenDialog=async()=>[{scheme:'file',fsPath:'/isolated/example.ipynb'}];await h.handlers.get('mrw.openNotebook')();assert.equal(h.calls[1][0],'vscode.openWith');assert.equal(h.calls[1][2],'jupyter-notebook');assert.ok(h.calls.every(x=>!/kernel|executeCell|runAll/i.test(x[0])));
});


test('optional diagnostics status and supported actions are discoverable without a plugin registry',async()=>{
 const h=harness();assert.ok(companionStatus(h.vscode).find(x=>x.label==='MRW Diagnostics').description.includes('not installed'));
 h.picks.push(rows=>{assert.ok(!rows.some(x=>x.command==='mrwDiagnostics.featureUse'));return undefined;});await h.handlers.get('mrw.companionTools')();
 h.vscode.extensions.getExtension=id=>id==='flengyel.mrw-diagnostics'?{}:undefined;
 h.vscode.commands.getCommands=async()=>['mrwDiagnostics.featureUse','mrwDiagnostics.integrity','mrwDiagnostics.maintenance'];
 h.picks.push(rows=>rows.find(x=>x.command==='mrwDiagnostics.featureUse'));await h.handlers.get('mrw.companionTools')();
 assert.deepEqual(h.calls,[['mrwDiagnostics.featureUse']]);
});
