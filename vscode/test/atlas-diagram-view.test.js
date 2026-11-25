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
  assert.match(detail,/data-relation="proof"/);assert.match(detail,/data-kind="proof"/);assert.match(detail,/Exact proof passage/);assert.match(detail,/Use Lemma\s*<span class="atlas-inline-reference">\[lem:base\]<\/span>/);
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
  const node={id:'self',x:72,y:72};
  assert.equal(edgePath(node,node), 'M 260 105 C 322 105 322 25 166 72');
  assert.equal(diagramPositionStyles({nodes:[{x:'bad',y:Infinity}],width:NaN,height:NaN}).includes('NaN'),false);
});


function cameraHarness({diagram, view='map', width=400, height=464, state={}, focus, deferredFrames=false}={}) {
  const handlers={}, controls={}, layer={style:{}}, meter={}, messages=[], frames=[];
  const key='source:'+view+':0:new-layout';
  let currentState=state, focused, resized;
  const nodes=diagram.nodes.map(node=>({
    dataset:{x:String(node.x),y:String(node.y)},
    id:'diagram-node-'+node.id,
    classList:{contains:className=>className==='diagram-node'},
    focus(){focused=this; document.activeElement=this; handlers.focusin?.({target:this});},
    closest(selector){return selector==='.diagram-node'||selector==='button'?this:null;},
  }));
  const viewport={
    clientWidth:width,
    clientHeight:height,
    addEventListener:(name,handler)=>{handlers[name]=handler;},
    querySelectorAll:()=>nodes,
    getBoundingClientRect:()=>({left:0,top:0}),
    setPointerCapture(){},
  };
  const root={
    dataset:{view,page:'0',layout:'new-layout',width:String(diagram.width),height:String(diagram.height)},
    querySelector:selector=>selector==='[data-diagram-viewport]'?viewport:selector==='[data-diagram-layer]'?layer:meter,
    querySelectorAll:()=>['in','out','fit'].map(action=>({
      dataset:{diagramAction:action},
      addEventListener:(_,handler)=>{controls[action]=handler;},
    })),
  };
  const document={
    body:{dataset:{capture:'source',focus:focus?'diagram-node-'+focus:''}},
    activeElement:{id:'atlas-heading'},
    querySelector:()=>root,
    getElementById:id=>nodes.find(node=>node.id===id),
  };
  const api={
    getState:()=>currentState,
    setState:value=>{currentState=value;},
    postMessage:message=>{messages.push(JSON.parse(JSON.stringify(message)));},
  };
  class ResizeObserver {
    constructor(callback){resized=callback;}
    observe(target){assert.equal(target,viewport);}
  }
  const animation=deferredFrames?{requestAnimationFrame:callback=>{frames.push(callback);}}:{};
  vm.runInNewContext(diagramScript,{document,api,stored:currentState,ResizeObserver,...animation});
  return {
    handlers,controls,nodes,layer,meter,key,
    camera:()=>currentState.viewports?.[key],
    state:()=>currentState,
    focused:()=>focused,
    messages:()=>messages,
    flushFrames(){for (const callback of frames.splice(0)) callback();},
    resize(nextWidth,nextHeight){viewport.clientWidth=nextWidth; viewport.clientHeight=nextHeight; resized();},
    assertFits(){
      const {scale,x,y}=currentState.viewports[key], tolerance=1e-8;
      assert.ok(x>=20-tolerance,'left edge is visible');
      assert.ok(y>=20-tolerance,'top edge is visible');
      assert.ok(x+diagram.width*scale<=viewport.clientWidth-20+tolerance,'right edge is visible');
      assert.ok(y+diagram.height*scale<=viewport.clientHeight-20+tolerance,'bottom edge is visible');
    },
  };
}

test('Proof map and Blueprint initially fit every node in a narrow pane, including when focus targets the right node',()=>{
  const record=atlas(source);
  for (const view of ['map','blueprint']) {
    const diagram=atlasDiagram(record,view);
    const rightmost=diagram.nodes.reduce((right,node)=>node.x>right.x?node:right);
    for (const [width,height] of [[400,464],[320,400]]) {
      const camera=cameraHarness({diagram,view,width,height,focus:rightmost.id});
      assert.ok(camera.camera().scale<.8,'reproduces the former automatic 80% crop');
      assert.equal(camera.camera().mode,'fit');
      camera.assertFits();
    }
  }
});

test('fitted cameras adapt to pane resize and delayed layout without restoring an older clipped camera',()=>{
  const diagram=atlasDiagram(atlas(source),'map');
  const state={
    drafts:{retained:{question:'Unsent writing'}},
    viewports:{'source:map:0:new-layout':{scale:.8,x:-125,y:35}},
  };
  const camera=cameraHarness({diagram,state});
  assert.ok(camera.camera().scale<.8);
  camera.assertFits();
  camera.resize(240,300);
  camera.assertFits();
  const fittedState=structuredClone(camera.state());
  const reopened=cameraHarness({diagram,width:600,height:500,state:fittedState});
  assert.notEqual(reopened.camera().scale,camera.camera().scale,'fitted state is recalculated for a new pane');
  reopened.assertFits();
  assert.equal(reopened.state().drafts.retained.question,'Unsent writing');

  const hidden=cameraHarness({diagram,width:0,height:0});
  assert.equal(hidden.camera(),undefined,'do not persist a camera before layout exists');
  hidden.resize(400,464);
  hidden.assertFits();
});

test('deliberate pan and zoom survive resize and reopening; Fit opts back into automatic framing',()=>{
  const diagram=atlasDiagram(atlas(source),'map');
  const camera=cameraHarness({diagram,state:{drafts:{retained:{question:'Unsent writing'}}}});
  camera.handlers.pointerdown({button:0,target:{closest:()=>null},clientX:100,clientY:100,pointerId:1});
  camera.handlers.pointermove({clientX:140,clientY:120});
  camera.handlers.pointerup();
  assert.equal(camera.camera().mode,'manual');
  const panned={...camera.camera()};
  camera.resize(320,400);
  assert.deepEqual({...camera.camera()},panned,'resize preserves deliberate pan');
  const reopened=cameraHarness({diagram,width:320,height:400,state:structuredClone(camera.state())});
  assert.deepEqual({...reopened.camera()},panned,'reopening preserves a tagged manual camera');
  reopened.controls.in();
  assert.ok(reopened.camera().scale>panned.scale);
  const zoomed={...reopened.camera()};
  reopened.resize(500,500);
  assert.deepEqual({...reopened.camera()},zoomed,'resize preserves deliberate zoom');
  reopened.controls.fit();
  assert.equal(reopened.camera().mode,'fit');
  reopened.assertFits();
  reopened.resize(240,300);
  reopened.assertFits();
  assert.equal(reopened.state().drafts.retained.question,'Unsent writing');
});

test('atlas diagrams leave wheel scrolling alone and zoom around the pointer with Ctrl or Meta', () => {
  for (const view of ['map', 'blueprint']) {
    const diagram = atlasDiagram(atlas(source), view);
    const camera = cameraHarness({ diagram, view });
    const saved = { ...camera.camera() };
    let prevented = 0;
    const pointer = { deltaY: -100, clientX: 170, clientY: 115, preventDefault() { prevented++; } };
    camera.handlers.wheel(pointer);
    assert.equal(prevented, 0);
    assert.deepEqual({ ...camera.camera() }, saved);
    for (const modifier of ['ctrlKey', 'metaKey']) {
      const before = { ...camera.camera() };
      camera.handlers.wheel({ ...pointer, [modifier]: true });
      const after = camera.camera();
      assert.ok(after.scale > before.scale);
      for (const [axis, position] of [['x', pointer.clientX], ['y', pointer.clientY]]) {
        assert.ok(Math.abs((position - before[axis]) / before.scale - (position - after[axis]) / after.scale) < 1e-8);
      }
    }
    assert.equal(prevented, 2);
  }
});

test('a tall page fits below 15%; keyboard navigation still reveals focused nodes after zoom',()=>{
  const diagram={
    width:1000,height:7000,
    nodes:[{id:'first',x:72,y:72},{id:'last',x:372,y:6800}],
  };
  const camera=cameraHarness({diagram,width:600,height:400,focus:'first'});
  assert.ok(camera.camera().scale<.15);
  camera.assertFits();
  for (let count=0;count<8;count++) camera.controls.in();
  camera.handlers.keydown({key:'End',target:camera.nodes[0],preventDefault(){}});
  assert.equal(camera.focused(),camera.nodes[1]);
  const {x,y,scale}=camera.camera(), node=diagram.nodes[1];
  assert.ok(x+node.x*scale>=5 && x+(node.x+188)*scale<=595);
  assert.ok(y+node.y*scale>=5 && y+(node.y+66)*scale<=395);
  camera.handlers.keydown({key:'0',target:camera.nodes[1],preventDefault(){}});
  camera.assertFits();
});

test('fitted layout reports measured dimensions and focus once per size; manual resize waits for Fit',()=>{
  const diagram=atlasDiagram(atlas(source),'blueprint');
  const camera=cameraHarness({diagram,view:'blueprint',deferredFrames:true});
  assert.equal(camera.messages().length,0,'wait for the animation frame after layout and focus');
  camera.nodes[0].focus();
  camera.resize(420,480);
  camera.resize(440,500);
  camera.flushFrames();
  assert.deepEqual(camera.messages(),[{
    type:'fitDiagramLayout',view:'blueprint',width:440,height:500,focus:camera.nodes[0].id,
  }]);
  camera.resize(440,500);
  camera.controls.fit();
  camera.flushFrames();
  assert.equal(camera.messages().length,1,'do not repeat an unchanged fitted size');

  camera.controls.in();
  camera.resize(320,400);
  camera.flushFrames();
  assert.equal(camera.messages().length,1,'manual camera resize does not request rewrapping');
  camera.controls.fit();
  camera.flushFrames();
  assert.deepEqual(camera.messages()[1],{
    type:'fitDiagramLayout',view:'blueprint',width:320,height:400,focus:camera.nodes[0].id,
  });
  camera.assertFits();
});

test('layout signal works without animation APIs and never publishes hidden dimensions or a restored manual camera',()=>{
  const diagram=atlasDiagram(atlas(source),'map');
  const hidden=cameraHarness({diagram,width:0,height:0});
  assert.equal(hidden.messages().length,0);
  hidden.resize(400,464);
  assert.equal(hidden.messages().length,1);
  assert.equal(hidden.messages()[0].view,'map');
  const state={viewports:{'source:map:0:new-layout':{scale:.7,x:10,y:20,mode:'manual'}}};
  const manual=cameraHarness({diagram,state});
  assert.equal(manual.messages().length,0);
  manual.resize(320,400);
  assert.equal(manual.messages().length,0);
  manual.controls.fit();
  assert.equal(manual.messages().length,1);

  const interrupted=cameraHarness({diagram,deferredFrames:true});
  interrupted.controls.in();
  interrupted.flushFrames();
  assert.equal(interrupted.messages().length,0,'a queued fit does not override a subsequent manual camera');
});


test('coincident citation arrows combine labels while keeping every exact occurrence',()=>{
 const record=atlas(source),diagram=atlasDiagram(record,'map'),edge=diagram.edges.find(edge=>edge.kind==='citation');
 diagram.edges.push({...edge,label:'another-label',referenceId:'another-reference',references:['another-reference','third-reference']});diagram.selected=edge.from;
 const html=atlasHtml(null,record,{view:'map',diagram});
 assert.equal([...html.matchAll(/data-relation="citation"/g)].length,1);
 const edges = html.match(/<svg class="diagram-edges"[\s\S]+?<\/svg>/)[0];
 assert.match(edges, /<title>[^<]+lem:base · another-label<\/title>/);
 assert.doesNotMatch(edges, /<text[\s>]/);
 assert.match(html, /class="muted">[^<]*another-label<\/p>/);
 assert.match(html, /data-reference="another-reference"/);
 assert.match(html, /data-reference="third-reference"/);
});
