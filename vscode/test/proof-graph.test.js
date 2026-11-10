'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { runBridge } = require('../src/bridge');
const { digest } = require('../src/navigation');
const { registerProofGraph, readSources, tagPassage } = require('../src/proofGraph');
const { outlineHtml } = require('../src/outlines');
const extension = path.resolve(__dirname, '..');
const fixture = path.join(extension, '../tests/fixtures/proof_graph_08zh.json');
const bridge = req => runBridge(extension, 'python3', req);

class Position { constructor(line, character) { Object.assign(this, { line, character }); } }
class Selection { constructor(start, end) { Object.assign(this, { start, end, active: end }); } }

async function host(t, state = new Map()) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mrw-proof-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, 'test.mrw-proof.json'), raw = await fs.readFile(fixture, 'utf8');
  await fs.writeFile(file, raw);
  const commands = new Map(), panels = [], requests = [], shown = [], asks = [], follows = [], urls = [], errors = [];
  let failUpdates = false, service = bridge, reader;
  const doc = { uri: { scheme:'file', fsPath:file, path:file, toString:()=>file },
    getText: () => doc.text, text:raw, version:1, async save(){await fs.writeFile(file,doc.text);return true;}, positionAt: n => { const s=doc.text.slice(0,n).split('\n');return new Position(s.length-1,s.at(-1).length); } };
  class WorkspaceEdit { constructor(){this.operations=[];} replace(uri,range,text){this.operations.push({uri,range,text});} }
  const vscode = { WorkspaceEdit, Uri:{file:p=>({scheme:'file',fsPath:p}),parse:u=>u}, ViewColumn:{Active:1}, Position, Selection,
    Range:class { constructor(a,b){this.start=a;this.end=b;} }, TextEditorRevealType:{InCenterIfOutsideViewport:1},
    env:{openExternal:async u=>urls.push(u)},
    workspace:{openTextDocument:async()=>doc,applyEdit:async edit=>{for(const op of edit.operations){doc.text=op.text;doc.version++;}return true;}},
    window:{showErrorMessage:e=>errors.push(e),showTextDocument:async()=>({revealRange(){}}),
      createWebviewPanel(type,title,column,options){
        const p={type,title,options,reveal(){},onDidDispose(fn){p.dispose=fn;},webview:{
          onDidReceiveMessage(fn){p.receive=fn;},postMessage:async m=>p.messages.push(m)},messages:[]};
        panels.push(p);return p;
      }} };
  const context={extensionPath:extension,subscriptions:[],workspaceState:{get:(k,d)=>state.get(k)??d,update:async(k,v)=>{if(failUpdates)throw new Error('State unavailable');state.set(k,v);}}};
  registerProofGraph({vscode,context,register:(n,fn)=>commands.set(n,fn),bridge:async req=>{requests.push(req);return service(req);},
    projectRoot:async()=>root,choosePath:async()=>file,show:async(...args)=>shown.push(args),
    askProof:async(...args)=>asks.push(args),followPinned:async(...args)=>follows.push(args),readPinned:(...args)=>reader(...args)});
  return {root,file,doc,state,commands,panels,requests,shown,asks,follows,urls,errors,
    setService(fn){service=fn;},failUpdates(value){failUpdates=value;},
    setReader(fn){reader=fn;},
    async open(){await commands.get('mrw.openProofOutline')();const p=panels.at(-1);await p.receive({type:'ready'});return p;},
    async action(p,type,extra={}){await p.receive({type,revision:digest(doc.text),...extra});},
    model:p=>p.messages.filter(m=>m.type==='graph').at(-1)};
}

test('open, delete, restore and reopen keep original bytes and persist only a revision-bound selection', async t => {
  const h=await host(t), p=await h.open(), original=await fs.readFile(h.file,'utf8');
  assert.equal(h.model(p).projection.order.length,15);
  await h.action(p,'proposal');assert.equal(h.model(p).projection.hidden.length,5);
  assert.equal(h.model(p).projection.derivations['closed-fiber'].length,2);
  p.dispose();const reopened=await h.open();assert.equal(h.model(reopened).projection.hidden.length,5);
  await h.action(reopened,'restore',{node:'inverse-image'});assert.equal(h.model(reopened).projection.hidden.length,4);
  await h.action(reopened,'delete',{node:'hausdorff'});assert.match(h.errors.at(-1),/Cannot delete/);
  assert.equal(h.model(reopened).projection.hidden.length,4);
  await h.action(reopened,'restore_all');assert.equal(h.model(reopened).projection.hidden.length,0);
  assert.equal(await fs.readFile(h.file,'utf8'),original);
  assert.equal(h.requests.some(r=>/send|assistance|artifact/.test(r.method)),false);
  assert.deepEqual(h.urls,[]);
});

test('pending projection excludes a concurrent reopen and state failure preserves the live selection', async t => {
  const h=await host(t),p=await h.open();await h.action(p,'proposal');
  h.failUpdates(true);await h.action(p,'restore_all');assert.match(h.errors.at(-1),/State unavailable/);
  assert.equal(h.model(p).projection.hidden.length,5);h.failUpdates(false);
  let release, entered;
  const started=new Promise(r=>{entered=r;});
  h.setService(async req=>{if(req.method==='proof_graph'){entered();await new Promise(r=>{release=r;});}return bridge(req);});
  const action=h.action(p,'restore_all');await started;
  await assert.rejects(h.commands.get('mrw.openProofOutline')(),/Wait for/);
  release();await action;assert.equal(h.model(p).projection.hidden.length,0);
});

test('edited outlines reset selection without redirecting the old revision, and stale actions fail', async t => {
  const h=await host(t),p=await h.open();await h.action(p,'proposal');
  const old=digest(h.doc.text);h.doc.text=h.doc.text.replace('08ZH: closed fiber products','Revised outline');
  await p.receive({type:'refresh'});
  assert.equal(h.model(p).projection.hidden.length,0);assert.match(h.model(p).notice,/earlier revision/);
  await p.receive({type:'proposal',revision:old});assert.match(h.errors.at(-1),/changed/);
  h.doc.text=await fs.readFile(h.file,'utf8');await p.receive({type:'refresh'});
  assert.equal(h.model(p).projection.hidden.length,5);
});

test('source snapshots reject changed bytes and path escapes; current-session pinned text stays available', async t => {
  const h=await host(t),graph=JSON.parse(h.doc.text),source=graph.sources[0];
  source.file='sources/local.txt';source.sha256=digest('retained α\n');
  for(const n of graph.nodes)n.citations=n.citations.filter(c=>c.source!=='stacks');
  graph.nodes[0].citations=[{source:'stacks',start_line:1,end_line:1}];
  await fs.mkdir(path.join(h.root,'sources'));const sourcePath=path.join(h.root,source.file);await fs.writeFile(sourcePath,'retained α\n');
  h.doc.text=JSON.stringify(graph);await fs.writeFile(h.file,h.doc.text);
  const p=await h.open();assert.equal(h.model(p).sourceStatus.stacks,'pinned snapshot');
  await fs.writeFile(sourcePath,'changed');
  await h.action(p,'source',{node:'hausdorff',citation:0});assert.match(h.shown.at(-1)[0],/retained α/);assert.match(h.shown.at(-1)[0],/changed/);
  const status=await readSources(h.file,graph);assert.equal(status.stacks.text,undefined);
  await fs.unlink(sourcePath);await fs.symlink(path.join(h.root,'../outside.txt'),sourcePath);
  const escaped=await readSources(h.file,graph);assert.equal(escaped.stacks.text,undefined);
  assert.deepEqual(h.urls,[]);
});

test('AI preparation captures only the exact graph and requires an explicit action', async t => {
  const h=await host(t),p=await h.open();assert.equal(h.asks.length,0);
  await h.action(p,'ask');assert.equal(h.asks.length,1);
  assert.equal(h.asks[0][0].text,h.doc.text);assert.equal(h.asks[0][0].source_revision,digest(h.doc.text));
  assert.equal(h.asks[0][0].source_path,h.file);
  assert.equal(h.requests.some(r=>r.method==='send_assistance'),false);
  h.doc.text+=' ';await h.action(p,'ask');assert.equal(h.asks.length,1);assert.match(h.errors.at(-1),/changed/);
});

async function renderer({ initial = true } = {}) {
  class Node {
    constructor(tag){this.tag=tag;this.style={};this.children=[];this.listeners={};this.dataset={};this.textContent='';this.classList={add(){}};}
    append(n){n.parent=this;this.children.push(n);}insertBefore(n,b){this.children=this.children.filter(x=>x!==n);const i=this.children.indexOf(b);this.children.splice(i<0?this.children.length:i,0,n);n.parent=this;}replaceChildren(){this.children=[];}
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
    getBoundingClientRect(){return{left:0,top:0,width:900,height:600};}
    setAttribute(n,v){this[n]=v;}addEventListener(n,f){this.listeners[n]=f;}
    all(){return this.children.flatMap(n=>[n,...n.all()]);}
    querySelectorAll(tag){return this.all().filter(n=>n.tag===tag);}
    text(){return this.textContent+this.children.map(n=>n.text()).join(' ');}
  }
  const root=new Node('main'),messages=[],timers=new Map(),wrapper={};let receive;
  const origin='vscode-webview://proof-test';
  const global={document:{body:new Node('body'),getElementById:id=>id==='reader'?root:root.all().find(n=>n.id===id),createElement:t=>new Node(t),createElementNS:(_,t)=>new Node(t)},
    acquireVsCodeApi:()=>({postMessage:m=>messages.push(m)}),addEventListener:(_,f)=>{receive=f;}};
  global.URL=URL;global.window=global;global.parent=global;global.origin=origin;
  global.setTimeout=f=>{timers.set(1,f);return 1;};global.clearTimeout=id=>timers.delete(id);
  global.MRWAnnotations={render:(p,s)=>{const n=new Node('p');n.textContent=s;p.append(n);}};
  global.MRWStacks={part:(p,part)=>{const n=new Node('p');n.textContent=part.exact_text;p.append(n);}};
  vm.runInNewContext(await fs.readFile(path.join(extension,'src/proofGraphMap.js'),'utf8'),global);
  vm.runInNewContext(await fs.readFile(path.join(extension,'src/sourceReader.js'),'utf8'),global);
  vm.runInNewContext(await fs.readFile(path.join(extension,'src/proofGraphView.js'),'utf8'),global);
  const graph=JSON.parse(await fs.readFile(fixture,'utf8'));
  graph.nodes[0].explanation.text='<img src=x onerror=alert(1)>';
  const model=await bridge({method:'proof_graph',graph,hidden:graph.suggested_hidden});
  const deliver=event=>receive({origin,source:wrapper,...event});
  if(initial){deliver({data:{type:'graph',...model,sourceStatus:{},documentRevision:'pin'}});deliver({data:{type:'idle'}});}
  return{root,messages,receive:deliver,model,timers};
}

test('renderer exposes joint premises, alternative routes, complete witnesses and inert source prose', async () => {
  const{root,messages}=await renderer();
  assert.match(root.text(),/jointly/);assert.match(root.text(),/Alternative 1/);assert.match(root.text(),/Alternative 2/);
  assert.match(root.text(),/Expand original steps/);assert.match(root.text(),/AI proposal/);
  assert.match(root.text(),/Awaiting human review/);assert.match(root.text(),/<img src=x/);
  assert.equal(root.all().some(n=>n.tag==='img'),false);
  root.all().find(n=>n.dataset.action==='delete').listeners.click();
  assert.equal(messages.at(-1).type,'delete');assert.equal(messages.at(-1).revision,'pin');
  assert.ok(root.all().filter(n=>n.tag==='button'&&n.dataset.local!=='true').every(n=>n.disabled));
  assert.ok(root.all().filter(n=>n.tag==='button'&&n.dataset.local==='true').every(n=>!n.disabled));
});

function published(tag='08ZH') {
  const span=n=>({source_revision:'a'.repeat(64),start_line:n,start_col:0,end_line:n+1,end_col:0});
  const statement={region:'s',role:'statement',tag,span:span(1),tokens:[{kind:'text',text:'Published statement'}],exact_text:'Exact statement'};
  const proof={region:'p',role:'proof',tag,span:span(2),tokens:[{kind:'reference',tag:'08ZE'}],exact_text:'Exact proof'};
  return{reference:{status:'unchanged',region:'p'},document:{text:'pinned proof\n',start:[0,0],end:[0,12]},
    outline:{regions:[{id:'s',span:span(1)},{id:'p',span:span(2)}],published:{parts:{s:statement,p:proof},commit:'commit',authors:'Stacks Project Authors',source_revision:'a'.repeat(64)}}};
}

async function linkNodes(h) {
  const g=JSON.parse(h.doc.text);
  const reference='mrw-outline:v1/'+'1'.repeat(64)+'/22222222-2222-2222-2222-222222222222/'+'a'.repeat(64)+'/33333333-3333-3333-3333-333333333333/1.0-2.0';
  for(const id of ['closed-diagonal','closed-fiber'])g.nodes.find(n=>n.id===id).citations[0].reference=reference;
  h.doc.text=JSON.stringify(g);await fs.writeFile(h.file,h.doc.text);
}

test('tag passage uses exact published parts and never guesses a tag after an association changes',()=>{
  const r=published();assert.equal(tagPassage(r).tag,'08ZH');assert.deepEqual(tagPassage(r).parts.map(p=>p.role),['statement','proof']);
  r.reference.status='changed or removed';r.reference.region=null;
  const earlier=tagPassage(r);assert.equal(earlier.tag,null);assert.equal(earlier.exact_text,'pinned proof');
  const mismatch=published();mismatch.outline.regions[1].span.end_line=9;assert.equal(tagPassage(mismatch).tag,null);
});

test('vertex inspection resolves the workspace pin and only explicit tag navigation opens the browser',async t=>{
  const h=await host(t);await linkNodes(h);const calls=[];h.setReader(async(...args)=>{calls.push(args);return published();});
  const p=await h.open();assert.equal(calls.length,0);
  await h.action(p,'inspect',{node:'closed-fiber',request:1});
  const response=p.messages.find(m=>m.type==='passage');assert.equal(response.passage.tag,'08ZH');assert.equal(calls[0][1],h.root);
  assert.deepEqual(h.urls,[]);assert.equal(h.shown.length,0);assert.equal(h.follows.length,0);
  await h.action(p,'stacks_page',{node:'closed-fiber'});assert.deepEqual(h.urls,['https://stacks.math.columbia.edu/tag/08ZH']);
  await h.action(p,'stacks_citation',{node:'closed-fiber',tag:'08ZE'});assert.equal(h.urls.at(-1),'https://stacks.math.columbia.edu/tag/08ZE');
  await h.action(p,'stacks_citation',{node:'closed-fiber',tag:'EVIL'});assert.equal(h.urls.length,2);assert.match(h.errors.at(-1),/explicit citation/);
});

test('rapid vertex selection discards late replies and a changed document invalidates pending inspection',async t=>{
  const h=await host(t);await linkNodes(h);const p=await h.open();let resolveFirst;
  h.setReader(()=>new Promise(r=>{resolveFirst=r;}));
  const first=h.action(p,'inspect',{node:'closed-diagonal',request:1});
  h.setReader(async()=>published());await h.action(p,'inspect',{node:'closed-fiber',request:2});resolveFirst(published('08ZE'));await first;
  assert.deepEqual(p.messages.filter(m=>m.type==='passage').map(m=>m.node),['closed-fiber']);
  h.setReader(()=>new Promise(r=>{resolveFirst=r;}));const pending=h.action(p,'inspect',{node:'closed-diagonal',request:3});
  h.doc.text+=' ';await p.receive({type:'refresh'});resolveFirst(published('08ZE'));await pending;
  assert.equal(p.messages.filter(m=>m.type==='passage').length,1);
});

test('selected vertex opens its exact tag beside the graph; deletion keeps the page and saved mode works offline',async()=>{
  const h=await renderer(),node=h.root.all().find(n=>n.tag==='g'&&n['data-node']==='closed-fiber');
  assert.equal(h.root.all().filter(n=>n.tag==='iframe').length,0);
  node.listeners.click();const selection=h.messages.at(-1);assert.equal(selection.type,'inspect');assert.equal(selection.node,'closed-fiber');
  h.receive({data:{type:'passage',revision:'pin',request:selection.request,node:'closed-fiber',passage:tagPassage(published())}});
  const frame=h.root.all().find(n=>n.tag==='iframe');assert.equal(frame.src,'https://stacks.math.columbia.edu/tag/08ZH');assert.equal(frame.referrerpolicy,'no-referrer');
  const projected=await bridge({method:'proof_graph',graph:h.model.graph,hidden:[...h.model.projection.hidden,'closed-diagonal']});
  h.receive({data:{type:'graph',...projected,sourceStatus:{},documentRevision:'pin'}});
  assert.equal(h.root.all().find(n=>n.tag==='iframe'),frame);assert.equal(h.messages.filter(m=>m.type==='inspect').length,1);
  h.root.all().find(n=>n.dataset.action==='source-saved').listeners.click();assert.equal(h.root.all().find(n=>n.tag==='iframe'),frame);
  assert.match(h.root.text(),/Exact statement/);assert.match(h.root.text(),/Exact proof/);
  h.receive({origin:'https://stacks.math.columbia.edu',source:{},data:{type:'graph',documentRevision:'forged'}});assert.match(h.root.text(),/08ZH/);
});

test('iframe permission is scoped to the proof view and the JSON editor offers a graph action',async()=>{
  assert.doesNotMatch(outlineHtml(''),/frame-src https/);
  assert.match(outlineHtml('',[],'',{stacksFrame:true}),/frame-src https:\/\/stacks.math.columbia.edu;/);
  assert.doesNotMatch(outlineHtml('',[],'',{stacksFrame:true}),/frame-src \*/);
  const manifest=JSON.parse(await fs.readFile(path.join(extension,'package.json'),'utf8'));
  assert.ok(manifest.contributes.menus['editor/title'].some(m=>m.command==='mrw.openProofOutline'&&m.when.includes('mrw-proof')));
});


test('VS Code wrapper messages render despite its masked parent; foreign frames cannot supply host data',async()=>{
  const h=await renderer();
  assert.match(h.root.text(),/08ZH: closed fiber products/);
  const before=h.root.text();
  for(const type of ['graph','error','idle','passage']){
    h.receive({origin:'https://stacks.math.columbia.edu',source:{},data:{type,message:'forged',documentRevision:'forged'}});
    assert.equal(h.root.text(),before);
  }
  h.receive({origin:'null',data:{type:'error',message:'forged opaque origin'}});
  assert.equal(h.root.text(),before);
  h.receive({data:{type:'error',message:'Host error reaches the reader'}});
  assert.match(h.root.text(),/Host error reaches the reader/);
});

test('startup timeout offers an explicit retry and a host reply replaces the loading failure',async()=>{
  const h=await renderer({initial:false});
  h.timers.get(1)();
  assert.match(h.root.text(),/proof outline did not open/);
  h.root.all().find(n=>n.tag==='button'&&n.textContent==='Retry').listeners.click();
  assert.equal(h.messages.at(-1).type,'ready');
  h.receive({data:{type:'graph',...h.model,sourceStatus:{},documentRevision:'pin'}});
  assert.match(h.root.text(),/08ZH: closed fiber products/);
  assert.doesNotMatch(h.root.text(),/did not open/);
  assert.equal(h.timers.size,0);
});


test('summary corrections use the ordinary document, keep dependencies and deletion selection, and reject stale edits',async t=>{
  const h=await host(t),p=await h.open();await h.action(p,'proposal');
  const original=JSON.parse(h.doc.text),hidden=h.model(p).projection.hidden;
  await h.action(p,'update_summary',{node:'closed-fiber',claim:'Corrected claim',explanation:'Corrected explanation',author:'Reader α'});
  const changed=JSON.parse(await fs.readFile(h.file,'utf8'));
  assert.equal(changed.nodes.find(n=>n.id==='closed-fiber').claim,'Corrected claim');
  assert.deepEqual(changed.nodes.find(n=>n.id==='closed-fiber').explanation,{text:'Corrected explanation',author:'Reader α',origin:'human'});
  assert.deepEqual(changed.inferences,original.inferences);assert.deepEqual(changed.sources,original.sources);
  assert.deepEqual(h.model(p).projection.hidden,hidden);assert.ok(p.messages.some(m=>m.type==='summary_saved'));
  await h.action(p,'update_summary',{node:'closed-fiber',claim:'AI clarification',explanation:'AI explanation',author:'Codex companion',origin:'ai_proposal'});
  assert.equal(JSON.parse(h.doc.text).nodes.find(n=>n.id==='closed-fiber').explanation.origin,'ai_proposal');
  const saved=h.doc.text;h.doc.text+=' ';
  await p.receive({type:'update_summary',revision:digest(saved),node:'closed-fiber',claim:'Must not save',explanation:'Later edit',author:'Reader'});
  assert.match(h.errors.at(-1),/changed/);assert.equal(await fs.readFile(h.file,'utf8'),saved);
});

test('summary form preserves typed corrections across local navigation and failed replies',async()=>{
  const h=await renderer();h.root.all().find(n=>n.tag==='g'&&n['data-node']==='closed-fiber').listeners.click();
  h.root.all().find(n=>n.tag==='button'&&n.textContent==='Edit summary').listeners.click();
  const claim=h.root.all().find(n=>n['aria-label']==='Claim');claim.value='Typed correction';
  h.root.all().find(n=>n.tag==='g'&&n['data-node']==='closed-diagonal').listeners.click();
  assert.equal(h.root.all().find(n=>n['aria-label']==='Claim'),claim);
  h.root.all().find(n=>n.tag==='button'&&n.textContent==='Save summary').listeners.click();
  assert.equal(h.messages.at(-1).type,'update_summary');assert.equal(h.messages.at(-1).claim,'Typed correction');assert.equal(claim.disabled,true);
  h.receive({data:{type:'error',message:'Rejected write'}});h.receive({data:{type:'idle'}});
  assert.equal(h.root.all().find(n=>n['aria-label']==='Claim').value,'Typed correction');assert.equal(claim.disabled,false);
  h.receive({data:{type:'summary_saved',node:'closed-fiber'}});
  const graph=JSON.parse(JSON.stringify(h.model));graph.graph.nodes.find(n=>n.id==='closed-fiber').claim='Typed correction';
  h.receive({data:{type:'graph',...graph,sourceStatus:{},documentRevision:'new-pin'}});
  assert.equal(h.root.all().some(n=>n['aria-label']==='Claim'),false);assert.match(h.root.text(),/Typed correction/);
});
