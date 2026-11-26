'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {runBridge}=require('../src/bridge'),{digest}=require('../src/navigation');
const {registerProofStudy}=require('../src/proofStudy');
const {proposal}=require('./proof-study-cases');
const extension=path.resolve(__dirname,'..'),bridge=req=>runBridge(extension,'python3',req);
async function retained(t,tag){
  const baseDir=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-study-'));t.after(()=>fs.rm(baseDir,{recursive:true,force:true}));
  const root=path.join(baseDir,'project');await fs.mkdir(root);
  const text=await fs.readFile(path.join(extension,'../tests/fixtures/stacks/topology.tex'),'utf8'),source=path.join(root,'topology.tex');
  await fs.writeFile(source,text);
  const store=path.join(baseDir,'private'),base={store,project_root:root};
  let result=await bridge({method:'outline_create',...base,path:source,source_revision:digest(text)});
  function span(label,proof){
    const start=text.indexOf('\\begin{lemma}\n\\label{'+label+'}');assert.ok(start>=0);
    const a=proof?text.indexOf('\\begin{proof}',start):start;
    const end=proof?'\\end{proof}':'\\end{lemma}',b=text.indexOf(end,a)+end.length;
    const point=n=>{const lines=text.slice(0,n).split('\n');return[lines.length-1,lines.at(-1).length];};
    return{start:point(a),end:point(b)};
  }
  const label=tag==='08ZG'?'lemma-section-closed':'lemma-fibre-product-closed';
  for(const [key,proof] of [[label,true],[label,false],['lemma-Hausdorff',false]])
    result=await bridge({method:'outline_mutate',...base,id:result.outline.id,revision:result.revision,change:{kind:'add_region',...span(key,proof)}});
  const selected=[];
  for(const [i,r] of result.outline.regions.entries()){
    const {reference}=await bridge({method:'outline_reference',...base,id:result.outline.id,revision:result.revision,region:r.id});
    const {context}=await bridge({method:'outline_assistance_context',...base,reference});
    selected.push({reference,text:context.text,label:i===0?tag+' proof':i===1?tag+' statement':'08ZE statement',
      source_revision:context.source_revision,url:'https://github.com/stacks/stacks-project/blob/a04446e57ec1fbc252a871afcec7752fb2807b14/topology.tex',review:'published',authors:'The Stacks Project Authors',license:'GNU Free Documentation License'});
  }
  return{root,source,text,selected,base,result};
}
async function host(data,state=new Map()){
  const commands=new Map(),panels=[],docs=new Map(),saves=[],edits=[],calls=[],destinations=[];
  let eol='\n',selected=data.selected,answer='Which hypotheses make the section image closed?',clipboard='';
  const uri=file=>({scheme:'file',fsPath:file,toString:()=>file});
  class Position{constructor(line,character){Object.assign(this,{line,character});}}
  class Range{constructor(start,end){Object.assign(this,{start,end});}}
  class WorkspaceEdit{constructor(){this.operations=[];}createFile(uri,options){this.operations.push({type:'create',uri,options});}insert(uri,p,text){this.operations.push({type:'insert',uri,text});}replace(uri,r,text){this.operations.push({type:'replace',uri,text});}}
  const vscode={Uri:{file:uri},Position,Range,WorkspaceEdit,ViewColumn:{Active:1},
    env:{clipboard:{readText:async()=>clipboard,writeText:async value=>{clipboard=value;}}},
    workspace:{async openTextDocument(u){if(docs.has(u.fsPath))return docs.get(u.fsPath);
      const doc={uri:u,text:await fs.readFile(u.fsPath,'utf8'),version:1,getText(){return this.text;},positionAt:n=>new Position(0,n),async save(){saves.push(u.fsPath);await fs.writeFile(u.fsPath,this.text);return true;}};
      docs.set(u.fsPath,doc);return doc;},
      async applyEdit(edit){edits.push(edit);for(const op of edit.operations){if(op.type==='create')await fs.writeFile(op.uri.fsPath,'',{flag:'wx'});
        else{const d=await this.openTextDocument(op.uri);d.text=(op.type==='replace'?op.text:d.text+op.text).replace(/\r\n|\r|\n/g,eol);d.version++;}}return true;}},
    window:{activeTextEditor:undefined,showInputBox:async()=>answer,showSaveDialog:async()=>destinations.shift(),
      createWebviewPanel(type,title){const p={type,title,messages:[],reveal(){},onDidDispose(fn){p.dispose=fn;},webview:{onDidReceiveMessage(fn){p.receive=fn;},postMessage:async m=>p.messages.push(m)}};panels.push(p);return p;}},
    commands:{executeCommand:async(...args)=>calls.push(args)}};
  const context={extensionPath:extension,subscriptions:[],workspaceState:{get:k=>state.get(k),update:async(k,v)=>state.set(k,v)}};
  registerProofStudy({vscode,context,register:(n,f)=>commands.set(n,f),bridge:async r=>{calls.push(r);return bridge(r);},
    projectRoot:async()=>data.root,choosePath:async()=>undefined,selectPassages:async()=>selected,
    readPassage:async reference=>{const {context:c}=await bridge({method:'outline_assistance_context',...data.base,reference});return{text:c.text,source_revision:c.source_revision};}});
  return{commands,panels,docs,saves,edits,calls,destinations,state,vscode,
    setEol:v=>{eol=v;},setClipboard:v=>{clipboard=v;},clipboard:()=>clipboard,setSelection:v=>{selected=v;},setAnswer:v=>{answer=v;},
    uri,async prepare(){destinations.push(uri(path.join(data.root,'study.mrw-study.json')));await commands.get('mrw.prepareProofStudy')();const p=panels.at(-1);await p.receive({type:'ready'});return p;}};
}
for(const tag of ['08ZH','08ZG'])test(tag+' retained proof → handoff → attributed import → saved question → restart',async t=>{
  const data=await retained(t,tag),h=await host(data),p=await h.prepare(),file=path.join(data.root,'study.mrw-study.json');
  const study=JSON.parse(await fs.readFile(file,'utf8'));
  await p.receive({type:'copy'});const transfer=h.clipboard();
  for(const selected of data.selected){assert.ok(transfer.includes(selected.text));assert.ok(transfer.includes(selected.reference));}
  assert.match(transfer,/Outline schema/);assert.ok(!transfer.includes('\\label{lemma-graph-closed}'));
  const graph=proposal(study,tag);await bridge({method:'proof_graph',graph,hidden:graph.suggested_hidden});
  h.setClipboard(JSON.stringify(graph));const output=path.join(data.root,'outline.mrw-proof.json');h.destinations.push(h.uri(output));
  await p.receive({type:'import'});assert.equal(p.messages.some(m=>m.type==='error'),false,JSON.stringify(p.messages.filter(m=>m.type==='error')));
  assert.deepEqual(JSON.parse(await fs.readFile(output,'utf8')),graph);
  assert.equal(h.calls.at(-1)[0],'mrw.openProofOutline');assert.equal(h.calls.at(-1)[1].fsPath,output);
  for(const passage of study.passages)assert.equal(await fs.readFile(path.join(data.root,'study-sources',passage.sha256+'.txt'),'utf8'),passage.text);
  await p.receive({type:'save_question',question:'Can the Hausdorff hypothesis be weakened?'});
  const resumed=await host(data,h.state);await resumed.commands.get('mrw.resumeProofStudy')();await resumed.panels[0].receive({type:'ready'});
  const restored=resumed.panels[0].messages.find(m=>m.type==='study');
  assert.equal(restored.question,'Can the Hausdorff hypothesis be weakened?');assert.equal(restored.outline,'outline.mrw-proof.json');
  assert.equal(await fs.readFile(data.source,'utf8'),data.text);
  assert.equal(h.calls.some(r=>r.method==='send_assistance'),false);
});
test('import rejects changed source pins, wrong MRW references, duplicate JSON keys and overwrites; cancellation writes nothing',async t=>{
  const data=await retained(t,'08ZG'),h=await host(data);h.setSelection(undefined);
  await h.commands.get('mrw.prepareProofStudy')();assert.equal(h.edits.length,0);
  h.setSelection(data.selected);const p=await h.prepare(),study=JSON.parse(await fs.readFile(path.join(data.root,'study.mrw-study.json'),'utf8'));
  const graph=proposal(study,'08ZG');graph.sources[0].sha256='0'.repeat(64);h.setClipboard(JSON.stringify(graph));
  await p.receive({type:'import'});assert.match(p.messages.at(-2).message,/sources differ/);
  const clean=proposal(study,'08ZG');clean.nodes[0].citations[0].reference=data.selected[0].reference;h.setClipboard(JSON.stringify(clean));
  await p.receive({type:'import'});assert.match(p.messages.at(-2).message,/MRW reference/);
  h.setClipboard('{"version":1,"version":1}');await p.receive({type:'import'});assert.equal(p.messages.at(-2).type,'error');
  const target=path.join(data.root,'occupied.mrw-proof.json');await fs.writeFile(target,'preserve');
  h.setClipboard(JSON.stringify(proposal(study,'08ZG')));h.destinations.push(h.uri(target));await p.receive({type:'import'});
  assert.equal(await fs.readFile(target,'utf8'),'preserve');
});
module.exports={retained,proposal,host};



test('failed question save keeps the ordinary draft and reports no success; stale study copying is rejected',async t=>{
  const data=await retained(t,'08ZG'),h=await host(data),p=await h.prepare(),file=path.join(data.root,'study.mrw-study.json');
  const original=await fs.readFile(file,'utf8'),doc=h.docs.get(file),save=doc.save;
  doc.save=async()=>false;await p.receive({type:'save_question',question:'Unsaved question to preserve'});
  assert.equal(p.messages.at(-2).type,'error');assert.match(p.messages.at(-2).message,/unsaved/);
  assert.equal(await fs.readFile(file,'utf8'),original);assert.match(doc.text,/Unsaved question to preserve/);
  doc.save=save;await p.receive({type:'save_question',question:'Unsaved question to preserve'});
  assert.equal(p.messages.at(-2).notice,'Question saved.');
  doc.text+=' ';h.setClipboard('Keep clipboard');await p.receive({type:'copy'});
  assert.equal(h.clipboard(),'Keep clipboard');assert.match(p.messages.at(-2).message,/Study changed/);
});


test('question saving reopens a closed ordinary backing document without losing the saved study',async t=>{
  const data=await retained(t,'08ZG'),h=await host(data),p=await h.prepare(),file=path.join(data.root,'study.mrw-study.json');
  h.docs.get(file).isClosed=true;h.docs.delete(file);
  await p.receive({type:'save_question',question:'Continue after closing the ordinary tab'});
  assert.equal(p.messages.at(-2).notice,'Question saved.');
  assert.equal(JSON.parse(await fs.readFile(file,'utf8')).question,'Continue after closing the ordinary tab');
});


test('quotation exports retain their exact bytes with a CRLF ordinary-editor default',async t=>{
  const data=await retained(t,'08ZG'),h=await host(data);h.setEol('\r\n');
  const p=await h.prepare(),study=JSON.parse(await fs.readFile(path.join(data.root,'study.mrw-study.json'),'utf8'));
  h.setClipboard(JSON.stringify(proposal(study,'08ZG')));h.destinations.push(h.uri(path.join(data.root,'crlf.mrw-proof.json')));
  await p.receive({type:'import'});assert.equal(p.messages.some(m=>m.type==='error'),false);
  for(const passage of study.passages)assert.deepEqual(await fs.readFile(path.join(data.root,'study-sources',passage.sha256+'.txt')),Buffer.from(passage.text));
});


test('the study title action opens its explicit file instead of the remembered study',async t=>{
  const data=await retained(t,'08ZG'),h=await host(data);await h.prepare();
  const first=path.join(data.root,'study.mrw-study.json'),other=path.join(data.root,'other.mrw-study.json');
  const study=JSON.parse(await fs.readFile(first,'utf8'));study.title='Another study';await fs.writeFile(other,JSON.stringify(study));
  await h.commands.get('mrw.resumeProofStudy')(h.uri(other));
  const panel=h.panels.at(-1);await panel.receive({type:'ready'});
  assert.equal(panel.messages.find(m=>m.type==='study').title,'Another study');
});
