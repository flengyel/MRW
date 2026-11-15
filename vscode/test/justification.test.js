'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {registerJustification}=require('../src/justification');
function request(){return {id:'11111111-1111-4111-8111-111111111111',goal:['atom',{id:'E'}],claims:[{id:'E',display_name:'Euclid lemma'}],sources:[],context:{id:'original',admissions:['a','bridge']},admissions:[{id:'a',scope:'This claim',rationale:'Chosen source'},{id:'bridge',scope:'This implication',rationale:'Chosen argument'}],withdrawal:null};}
function result(q,revision='a'.repeat(64)){return {revision,effective:structuredClone(q),record:{request:structuredClone(q),response:{routes:[{admission_ids:['a','bridge']}],statistics:{limits_hit:[]}},verification:{checked_at:'2026-11-15T12:00:00Z'}}};}
function harness(){
 const commands=new Map(),requests=[],panels=[],errors=[],clients=[],picks=[],warnings=[],origins=[],context={extensionPath:path.resolve(__dirname,'..'),storageUri:{fsPath:'/tmp/mrw-unit-private'},globalStorageUri:{scheme:'file',fsPath:'/tmp/mrw-unit-global'},subscriptions:[]};
 const q=request();let service=async p=>p.method==='route_list'?{records:[]}:p.method==='route_example'?{request:structuredClone(q)}:p.method==='route_run'?result(p.request):p.method==='route_read'?result(q,p.revision):p.method==='route_successor'?{request:{...structuredClone(q),id:p.request_id,withdrawal:{predecessor:p.revision}}}:{};
 const vscode={ViewColumn:{Active:1,One:1},ProgressLocation:{Notification:1},workspace:{textDocuments:[]},window:{
  async showQuickPick(items){return picks.length?picks.shift()(items):items.find(x=>x.kind==='example');},async showWarningMessage(){return warnings.shift();},async showErrorMessage(e){errors.push(e);},
  async withProgress(_options,fn){return fn({}, {onCancellationRequested(){return {dispose(){}};}});},
  createWebviewPanel(){const messages=[];let listener,disposed;const panel={messages,webview:{html:'',onDidReceiveMessage(fn){listener=fn;return{dispose(){}};},async postMessage(v){messages.push(v);}},onDidDispose(fn){disposed=fn;return{dispose(){}};},onDidChangeViewState(){return{dispose(){}};},dispose(){disposed?.();},receive(v){return listener(v);}};panels.push(panel);return panel;}
 }};
 const raw=async p=>{requests.push(p);return service(p);};
 const controller=registerJustification({vscode,context,register:(id,fn)=>commands.set(id,fn),bridge:raw,rawBridge:raw,projectRoot:async()=>'/tmp/mrw-unit-project',reading:{currentLocation:()=>({uri:'file:///tmp/source.md',revision:'x',start:0,end:0}),returnToStudy:async loc=>origins.push(loc)},show:async()=>{},artifactClients:clients});
 const open=async()=>{await commands.get('mrw.openJustification')();return panels.at(-1);};
 const send=async(type,panel=panels.at(-1))=>{await panel.receive({type,generation:panel.messages.at(-1).generation});await new Promise(r=>setTimeout(r,15));};
 return {commands,requests,panels,errors,clients,picks,warnings,origins,controller,vscode,open,send,setService(fn){service=fn;}};
}
test('opening an example performs no build, search, admission or persistence',async()=>{
 const h=harness(),p=await h.open();assert.deepEqual(h.requests.map(r=>r.method),['route_list','route_example']);
 assert.ok(p.webview.html.includes('Opening justification'));assert.ok(p.messages.at(-1).pending);assert.equal(p.messages.at(-1).result,null);
});
test('failed search preserves exact pending request and reenables controls for explicit retry',async()=>{
 const h=harness();await h.open();const id=h.controller.current.request.id;
 h.setService(async p=>{if(p.method==='route_run')throw Error('interrupted');return{};});await h.send('search');
 assert.equal(h.controller.current.request.id,id);assert.equal(h.controller.current.busy,false);assert.match(h.errors[0],/interrupted/);
 h.setService(async p=>result(p.request));await h.send('search');assert.equal(h.controller.current.value.revision,'a'.repeat(64));assert.equal(h.controller.current.request,null);
 assert.deepEqual(h.requests.filter(p=>p.method==='route_run').map(p=>p.request.id),[id,id]);
});
test('stale reader messages cannot run a new operation',async()=>{
 const h=harness(),p=await h.open();await p.receive({type:'search',generation:0});assert.equal(h.requests.some(r=>r.method==='route_run'),false);
});
test('cancelled withdrawal leaves the existing result and never searches',async()=>{
 const h=harness();await h.open();await h.send('search');const before=h.controller.current.value;
 h.picks.push(()=>undefined);await h.send('withdraw');assert.equal(h.controller.current.value,before);
 assert.equal(h.requests.filter(r=>r.method==='route_run').length,1);assert.equal(h.requests.some(r=>r.method==='route_successor'),false);
});
test('busy reader blocks workspace move and pending work survives closure',async()=>{
 const h=harness();await h.open();let finish;h.setService(()=>new Promise(resolve=>finish=resolve));
 const work=h.send('search');await new Promise(r=>setTimeout(r,5));await assert.rejects(h.clients[0].freeze(),/Finish or cancel/);
 const q=h.controller.current.request;h.panels.at(-1).dispose();finish(result(q));await work;
 assert.equal(h.controller.current,undefined);
});
test('reopening a retained result uses no live checker',async()=>{
 const h=harness(),rev='b'.repeat(64);h.setService(async p=>p.method==='route_list'?{records:[{goal:'Euclid lemma',revision:rev,routes:1,checked:'now'}]}:result(request(),rev));
 h.picks.push(items=>items.find(i=>i.revision===rev));await h.open();assert.deepEqual(h.requests.map(r=>r.method),['route_list','route_read']);
 assert.equal(h.controller.current.value.revision,rev);await h.send('return');assert.equal(h.origins.length,1);
});
