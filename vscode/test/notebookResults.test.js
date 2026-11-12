'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {registerNotebookResults,parseLink}=require('../src/notebookResults');
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
function harness(){
 const commands=new Map(),calls=[],picks=[],files=[],warnings=[],views=[],events=[];
 const result=id=>({id,title:id===a?'Trace':'Resultant',captured:'2026-11-12',evidence:'saved outputs',artifacts:[{name:'run.ipynb'},{name:'why.md',sha256:'abc'}],body:id});
 const notebook={uri:{scheme:'file',fsPath:'/notes/run.ipynb'},isDirty:false};
 const vscode={workspace:{workspaceFolders:[{uri:{fsPath:'/work'}}],notebookDocuments:[notebook],textDocuments:[],getConfiguration:()=>({get:(_k,f)=>f})},env:{uriScheme:'vscode',clipboard:{writeText:async x=>calls.push(['clipboard',x])}},
  window:{activeNotebookEditor:{notebook},showQuickPick:async items=>{const p=picks.shift();return typeof p==='function'?p(items):items.find(x=>x.action===p);},showOpenDialog:async()=>files.shift(),showSaveDialog:async()=>files.shift(),showWarningMessage:async(...x)=>{calls.push(['warning',...x]);return warnings.shift();},showInformationMessage:async x=>calls.push(['info',x])},commands:{executeCommand:async(...x)=>calls.push(x)}};
 const api=registerNotebookResults({vscode,context:{storageUri:{fsPath:'/private'}},register:(id,f)=>commands.set(id,f),bridge:async r=>{calls.push(r);if(r.method==='notebook_list')return {results:[result(a),result(b)]};if(r.method==='notebook_export')return {bundles:2,sha256:'abc'};return result(r.id||a);},show:async(body,title,_record,presentation)=>{views.push({body,title,presentation});return body;},recorder:{record:(...args)=>events.push(args)}});
 return {commands,calls,picks,files,warnings,views,events,notebook,vscode,api};
}
test('retention refuses dirty notebooks; cancellation creates nothing',async()=>{
 const h=harness();h.notebook.isDirty=true;await assert.rejects(h.commands.get('mrw.retainNotebookResult')(),/Save/);assert.equal(h.calls.length,0);
 h.notebook.isDirty=false;await h.commands.get('mrw.retainNotebookResult')();assert.equal(h.calls.length,0);
 h.picks.push('companions');h.files.push(undefined);await h.commands.get('mrw.retainNotebookResult')();assert.equal(h.calls.length,0);
});
test('companion edits during selection block retention',async()=>{
 const h=harness();h.picks.push('companions');h.files.push([{scheme:'file',fsPath:'/notes/why.md'}]);h.vscode.workspace.textDocuments.push({uri:{fsPath:'/notes/why.md'},isDirty:true});
 await assert.rejects(h.commands.get('mrw.retainNotebookResult')(),/Save/);assert.equal(h.calls.length,0);
});
test('retention and reopen use private storage, ordinary files are only read, no kernel command',async()=>{
 const h=harness();h.picks.push('retain');await h.commands.get('mrw.retainNotebookResult')();
 assert.equal(h.calls[0].store,'/private/calculations-v1');assert.deepEqual(h.calls[0].paths,['/notes/run.ipynb']);assert.equal(h.views[0].body,a);
 assert.deepEqual(h.events[0],['notebook_retain',{ids:[a]},'observed_action',{}]);
});
test('compare opens two immutable snapshots in native diff without accumulating visible views',async()=>{
 const h=harness();h.picks.push(items=>items[0],'compare',items=>items[0]);await h.commands.get('mrw.openNotebookResult')();
 const diff=h.calls.find(x=>Array.isArray(x)&&x[0]==='vscode.diff');assert.deepEqual(diff.slice(1,3),[a,b]);
 assert.equal(h.views.filter(x=>x.presentation?.show===false).length,2);
});
test('delete has exact scope and cancellation preserves snapshot',async()=>{
 const h=harness();h.picks.push(items=>items[0],'delete');await h.commands.get('mrw.openNotebookResult')();assert.ok(!h.calls.some(x=>x.method==='notebook_delete'));
 h.picks.push(items=>items[0],'delete');h.warnings.push('Delete retained copy');await h.commands.get('mrw.openNotebookResult')();
 assert.equal(h.calls.find(x=>x.method==='notebook_delete').id,a);assert.match(h.calls.find(x=>x[0]==='warning')[2].detail,/why.md/);
});
test('export multiple accounts and scoped links survive controller recreation',async()=>{
 const h=harness();h.picks.push(items=>items);h.files.push({scheme:'file',fsPath:'/export/results.zip'});await h.commands.get('mrw.exportNotebookProvenance')();
 assert.deepEqual(h.calls.find(x=>x.method==='notebook_export').ids,[a,b]);
 h.picks.push(items=>items[0],'link');await h.commands.get('mrw.openNotebookResult')();const link=h.calls.find(x=>x[0]==='clipboard')[1];
 assert.deepEqual(parseLink(link),{workspace:'file:///work',id:a});const next=harness();await next.api.handleUri({path:'/notebook-result',toString:()=>link});assert.equal(next.views[0].body,a);
 await assert.rejects(next.api.handleUri({path:'/notebook-result',toString:()=>link.replace(new URL(link).searchParams.get('target'),Buffer.from(JSON.stringify({workspace:'file:///other',id:a})).toString('base64url'))}),/workspace/);
 for(const bad of [link+'&id='+a,link.replace('flengyel.mrw','other'),link+'&extra=1'])assert.throws(()=>parseLink(bad));
});
test('registration in an empty window is harmless; retention requires workspace storage',async()=>{
 const commands=new Map();registerNotebookResults({vscode:{workspace:{},window:{}},context:{},register:(id,f)=>commands.set(id,f),bridge:()=>assert.fail('no bridge without workspace'),show:()=>{}});
 await assert.rejects(commands.get('mrw.openNotebookResult')(),/workspace/);
});
