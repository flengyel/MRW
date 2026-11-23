'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const {digest} = require('../src/navigation');
const {createAtlas} = require('../src/atlasModel');
const {extractAtlasText} = require('../src/atlasText');
const {atlasDiagram} = require('../src/atlasDiagram');
const {atlasHtml} = require('../src/atlasView');
const {edgePath,diagramPositionStyles,diagramScript} = require('../src/atlasDiagramView');
function atlas(text, language='latex') {
  return createAtlas({source:{title:'Captured <source>',uri:'file:///fixture/source.tex',text,language,revision:digest(text)},extraction:extractAtlasText(text,language)});
}
const source = String.raw`\begin{lemma}\label{lem:base}
A source result.
\end{lemma}
\begin{theorem}\label{thm:use}
A conclusion.
\end{theorem}
\begin{proof}
Use Lemma~\ref{lem:base}.
\end{proof}`;

test('map and blueprint render visible edges, readable native node buttons, exact inspector evidence and view routes',()=>{
  const record=atlas(source),diagram=atlasDiagram(record,'map');
  const html=atlasHtml(null,record,{view:'map',diagram,focus:'diagram-node-'+diagram.nodes[0].id});
  assert.match(html, /data-type="selectView" data-view="blueprint"/);
  assert.match(html, /id="atlas-view-list"/);assert.match(html, /Reading list/);
  assert.match(html, /data-relation="citation"/);assert.match(html, /<path d="M [^"]+ C /);
  assert.match(html, /class="diagram-node diagram-position-0/);assert.match(html, /data-type="selectNode" data-node="component:/);
  assert.match(html, /id="atlas-diagram" tabindex="-1"/);assert.match(html, /\.diagram-position-0 \{ left: \d+px; top: \d+px;/);
  assert.doesNotMatch(html, /\sstyle="/);assert.match(html, /<style nonce="[^"]+">/);
  assert.match(html, /Selected diagram node/);assert.match(html, /A source result\./);assert.match(html, /Open reference occurrence/);
  assert.match(html, /data-component="/);assert.match(html, /data-part="statement"/);assert.match(html, /Captured &lt;source&gt;/);
  const proof=record.extraction.entries.find(entry=>entry.proof),blueprint=atlasDiagram(record,'blueprint',{selected:'entry:'+proof.id+':proof'});
  const detail=atlasHtml(null,record,{view:'blueprint',diagram:blueprint});
  assert.match(detail,/data-relation="proof"/);assert.match(detail,/data-kind="proof"/);assert.match(detail,/Exact proof passage/);assert.match(detail,/Use Lemma~\\ref\{lem:base\}/);
  assert.match(detail,/data-part="proof"/);assert.match(detail,/Lean dependencies not available/);assert.match(detail,/stroke-dasharray: 6 4/);
  assert.match(detail,/Proof passage → statement/);
  // The generated controller contains no source interpolation and stays valid JS.
  for(const match of html.matchAll(/<script nonce="[^"]+">([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
});

test('reading list and component detail keep existing evidence and escaped source text',()=>{
  const record=atlas(source),component=record.components[0];
  const list=atlasHtml(null,record,{view:'list'});assert.match(list,/class="components"/);assert.doesNotMatch(list,/data-diagram data-view=/);
  const legacy=atlasHtml(null,record);assert.match(legacy,/class="components"/);
  const componentHtml=atlasHtml(null,record,{component:component.id,view:'map'});assert.match(componentHtml,/Edit description/);assert.match(componentHtml,/Open exact source/);assert.doesNotMatch(componentHtml,/data-diagram data-view=/);
  const danger={...atlasDiagram(record,'map')};danger.nodes=danger.nodes.map((node,index)=>({...node,title:index?'Other':'<img src=x onerror=alert(1)>',x:index?300:20,y:20}));danger.selected=danger.nodes[0].id;
  const inert=atlasHtml(null,record,{view:'map',diagram:danger});assert.match(inert,/&lt;img src=x onerror=alert\(1\)&gt;/);assert.doesNotMatch(inert,/<img src=x/);
  assert.match(inert,/api\.setState\(\{\.\.\.api\.getState\(\),drafts\}\)/);assert.match(inert,/api\.setState\(\{\.\.\.api\.getState\(\), viewports\}\)/);
});

test('bounded diagram pages expose off-page evidence and paging instead of losing connections',()=>{
  const text=Array.from({length:40},(_,i)=>`## Lemma ${i} {#r${i}}\n\nStatement ${i}. ${i?'See [previous](#r'+(i-1)+').':''}\n`).join('\n');
  const record=atlas(text,'markdown'),diagram=atlasDiagram(record,'map',{page:0});
  const connected=diagram.boundaryEdges[0];assert.ok(connected);
  const selected=diagram.nodes.find(node=>node.id===connected.from||node.id===connected.to);diagram.selected=selected.id;
  const html=atlasHtml(null,record,{view:'map',diagram});assert.match(html,/Page 1 of 2/);assert.match(html,/Connections on other pages/);assert.match(html,/data-type="showDiagramPage" data-page="1"/);assert.match(html,/Open reference occurrence/);
});

test('self-reference arcs stay outside node text and geometry accepts only numeric positions',()=>{
  const node={id:'self',x:72,y:72};const arc=edgePath(node,node);assert.match(arc.path,/^M /);assert.ok(arc.x>node.x+188);assert.ok(Number.isFinite(arc.y));
  assert.equal(diagramPositionStyles({nodes:[{x:'bad',y:Infinity}],width:NaN,height:NaN}).includes('NaN'),false);
});


test('diagram camera starts readable, explicit Fit includes the full page, keyboard focuses nodes and drafts survive',()=>{
  const handlers={},controls={},layer={style:{}},meter={};let state={drafts:{retained:{question:'Unsent writing'}}},focused;
  const nodes=[{dataset:{x:'72',y:'72'},focus(){focused=this;},classList:{contains:()=>true}},{dataset:{x:'372',y:'72'},focus(){focused=this;},classList:{contains:()=>true}}];
  for(const node of nodes)node.closest=selector=>selector==='.diagram-node'||selector==='button'?node:null;
  const viewport={clientWidth:600,clientHeight:400,addEventListener:(name,fn)=>handlers[name]=fn,querySelector:()=>nodes[0],querySelectorAll:()=>nodes,getBoundingClientRect:()=>({left:0,top:0}),setPointerCapture(){}};
  const root={dataset:{view:'map',page:'0',layout:'new-layout',width:'1000',height:'7000'},querySelector:selector=>selector==='[data-diagram-viewport]'?viewport:selector==='[data-diagram-layer]'?layer:meter,
    querySelectorAll:()=>['in','out','fit'].map(action=>({dataset:{diagramAction:action},addEventListener:(_,fn)=>controls[action]=fn}))};
  const document={body:{dataset:{capture:'source',focus:'diagram-node-first'}},querySelector:()=>root,getElementById:()=>nodes[0]};
  const api={getState:()=>state,setState:value=>state=value};
  vm.runInNewContext(diagramScript,{document,api,stored:state});
  assert.equal(meter.textContent,'80%');assert.match(layer.style.transform,/scale\(0\.8\)/);assert.equal(state.drafts.retained.question,'Unsent writing');
  controls.fit();assert.ok(parseInt(meter.textContent)<15,'explicit fit can show the whole tall page');
  handlers.keydown({key:'ArrowRight',target:nodes[0],preventDefault(){}});assert.equal(focused,nodes[1]);
  controls.in();assert.equal(state.drafts.retained.question,'Unsent writing');assert.ok(Object.keys(state.viewports)[0].endsWith(':new-layout'));
});


test('coincident citation arrows combine labels while keeping every exact occurrence',()=>{
 const record=atlas(source),diagram=atlasDiagram(record,'map'),edge=diagram.edges.find(edge=>edge.kind==='citation');
 diagram.edges.push({...edge,label:'another-label',referenceId:'another-reference',references:['another-reference','third-reference']});diagram.selected=edge.from;
 const html=atlasHtml(null,record,{view:'map',diagram});
 assert.equal([...html.matchAll(/data-relation="citation"/g)].length,1);
 assert.match(html,/lem:base · another-label/);assert.match(html,/data-reference="another-reference"/);assert.match(html,/data-reference="third-reference"/);
});
