'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {registerJustification}=require('../src/justification');
function request(){return {id:'11111111-1111-4111-8111-111111111111',goal:['atom',{id:'E'}],claims:[{id:'E',display_name:'Euclid lemma'}],sources:[],context:{id:'original',admissions:['a','bridge']},admissions:[{id:'a',scope:'This claim',rationale:'Chosen source'},{id:'bridge',scope:'This implication',rationale:'Chosen argument'}],withdrawal:null};}
function result(q,revision='a'.repeat(64)){return {revision,effective:structuredClone(q),record:{request:structuredClone(q),response:{routes:[{admission_ids:['a','bridge']}],statistics:{limits_hit:[]}},verification:{checked_at:'2026-11-15T12:00:00Z'}}};}
function harness(store={intents:new Map(),results:new Map()}){
 const commands=new Map(),requests=[],panels=[],errors=[],clients=[],picks=[],warnings=[],origins=[],context={extensionPath:path.resolve(__dirname,'..'),storageUri:{fsPath:'/tmp/mrw-unit-private'},globalStorageUri:{scheme:'file',fsPath:'/tmp/mrw-unit-global'},subscriptions:[]};
 const q=request();let location={uri:'file:///tmp/source.md',revision:'a'.repeat(64),start:0,end:0};
 const defaultService=async p=>{
  if(p.method==='route_list')return {records:[...store.results.values()].map(r=>({goal:'Euclid lemma',revision:r.revision,routes:1,checked:'now'}))};
  if(p.method==='route_pending')return {pending:[...store.intents.entries()].filter(([id])=>!store.results.has(id)).map(([id,v])=>({goal:'Euclid lemma',intent:v.intent,request_id:id}))};
  if(p.method==='route_example')return {request:structuredClone(q)};
  if(p.method==='route_stage'){
   let value=store.intents.get(p.request.id);
   if(!value){value={intent:'c'.repeat(64),request:structuredClone(p.request),origin:structuredClone(p.origin)};store.intents.set(p.request.id,value);}
   return {intent:value.intent,origin:value.origin};
  }
  if(p.method==='route_resume'){
   const entry=[...store.intents.entries()].find(([,v])=>v.intent===p.intent),saved=entry[1];
   return store.results.has(entry[0])?{result:store.results.get(entry[0]),origin:saved.origin}:structuredClone(saved);
  }
  if(p.method==='route_run'){const r=result(p.request);store.results.set(p.request.id,r);return r;}
  if(p.method==='route_read')return result(q,p.revision);
  if(p.method==='route_successor')return {request:{...structuredClone(q),id:p.request_id,withdrawal:{predecessor:p.revision}}};
  return {};
 };let service=defaultService;
 const vscode={ViewColumn:{Active:1,One:1},ProgressLocation:{Notification:1},workspace:{textDocuments:[]},window:{
  async showQuickPick(items){return picks.length?picks.shift()(items):items.find(x=>x.kind==='example');},async showWarningMessage(){return warnings.shift();},async showErrorMessage(e){errors.push(e);},
  async withProgress(_options,fn){return fn({}, {onCancellationRequested(){return {dispose(){}};}});},
  createWebviewPanel(){const messages=[];let listener,disposed;const panel={messages,webview:{html:'',onDidReceiveMessage(fn){listener=fn;return{dispose(){}};},async postMessage(v){messages.push(v);}},onDidDispose(fn){disposed=fn;return{dispose(){}};},onDidChangeViewState(){return{dispose(){}};},dispose(){disposed?.();},receive(v){return listener(v);}};panels.push(panel);return panel;}
 }};
 const raw=async p=>{requests.push(p);return service(p);};
 const controller=registerJustification({vscode,context,register:(id,fn)=>commands.set(id,fn),bridge:raw,rawBridge:raw,projectRoot:async()=>'/tmp/mrw-unit-project',reading:{currentLocation:()=>structuredClone(location),returnToStudy:async loc=>origins.push(loc)},show:async()=>{},artifactClients:clients});
 const open=async()=>{await commands.get('mrw.openJustification')();return panels.at(-1);};
 const send=async(type,panel=panels.at(-1))=>{await panel.receive({type,generation:panel.messages.at(-1).generation});await new Promise(r=>setTimeout(r,15));};
 return {store,defaultService,setLocation(v){location=v;},commands,requests,panels,errors,clients,picks,warnings,origins,controller,vscode,open,send,setService(fn){service=fn;}};
}
test('opening an example performs no build, search, admission or persistence',async()=>{
 const h=harness(),p=await h.open();assert.deepEqual(h.requests.map(r=>r.method),['route_list','route_pending','route_example']);
 assert.ok(p.webview.html.includes('Opening justification'));assert.ok(p.messages.at(-1).pending);assert.equal(p.messages.at(-1).result,null);
});
test('failed search preserves exact pending request and reenables controls for explicit retry',async()=>{
 const h=harness();await h.open();const id=h.controller.current.request.id;
 h.setService(async p=>{if(p.method==='route_run')throw Error('interrupted');return h.defaultService(p);});await h.send('search');
 assert.equal(h.controller.current.request.id,id);assert.equal(h.controller.current.busy,false);assert.match(h.errors[0],/interrupted/);
 h.setService(h.defaultService);await h.send('search');assert.equal(h.controller.current.value.revision,'a'.repeat(64));assert.equal(h.controller.current.request,null);
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
test('closed reader keeps its move guard until the in-flight action settles',async()=>{
 const h=harness();await h.open();let finish;h.setService(p=>p.method==='route_run'?new Promise(resolve=>finish=resolve):h.defaultService(p));
 const work=h.send('search');await new Promise(r=>setTimeout(r,5));await assert.rejects(h.clients[0].freeze(),/Finish or cancel/);
 const q=h.controller.current.request;h.panels.at(-1).dispose();await assert.rejects(h.clients[0].freeze(),/Finish or cancel/);finish(result(q));await work;
 assert.equal(h.controller.current,undefined);
});
test('reopening a retained result uses no live checker',async()=>{
 const h=harness(),rev='b'.repeat(64);h.setService(async p=>p.method==='route_list'?{records:[{goal:'Euclid lemma',revision:rev,routes:1,checked:'now'}]}:p.method==='route_pending'?{pending:[]}:result(request(),rev));
 h.picks.push(items=>items.find(i=>i.revision===rev));await h.open();assert.deepEqual(h.requests.map(r=>r.method),['route_list','route_pending','route_read']);
 assert.equal(h.controller.current.value.revision,rev);await h.send('return');assert.equal(h.origins.length,1);
});

test('fresh activation reopens the exact failed context without checking or changing its origin',async()=>{
 const h=harness();await h.open();const q=structuredClone(h.controller.current.request),origin=structuredClone(h.controller.current.origin);
 h.setService(p=>p.method==='route_run'?Promise.reject(Error('interrupted')):h.defaultService(p));await h.send('search');
 assert.ok(h.panels[0].messages.at(-1).pendingSaved);h.panels[0].dispose();assert.equal(h.controller.current,undefined);
 const next=harness(h.store);next.setLocation({uri:'file:///tmp/different.md',revision:'b'.repeat(64),start:3,end:3});
 next.picks.push(items=>items.find(i=>i.intent));await next.open();
 assert.deepEqual(next.controller.current.request,q);assert.deepEqual(next.controller.current.origin,origin);
 assert.deepEqual(next.requests.map(p=>p.method),['route_list','route_pending','route_resume']);
 await next.send('search');assert.equal(next.controller.current.value.revision,'a'.repeat(64));
 next.panels[0].dispose();next.picks.push(items=>{assert.ok(!items.some(i=>i.intent));return undefined;});await next.commands.get('mrw.openJustification')();
});
test('failed durable staging never starts Lean and preserves the in-memory request',async()=>{
 const h=harness();await h.open();const q=h.controller.current.request;
 h.setService(p=>p.method==='route_stage'?Promise.reject(Error('save failed')):h.defaultService(p));await h.send('search');
 assert.equal(h.controller.current.request,q);assert.equal(h.requests.some(p=>p.method==='route_run'),false);
 assert.equal(h.panels[0].messages.at(-1).pendingSaved,false);
});
