'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {layout}=require('../src/proofGraphMap');
const fs = require('node:fs');
const vm = require('node:vm');

test('rank layout preserves dependency direction, separates claims and bounds all positions',()=>{
  const edges=[{from:'a',to:'c'},{from:'b',to:'c'},{from:'c',to:'d'}];
  const p=layout(['a','b','c','d'],edges);
  for(const e of edges)assert.ok(p.positions[e.from].x<p.positions[e.to].x);
  assert.notEqual(p.positions.a.y,p.positions.b.y);
  for(const v of Object.values(p.positions)){assert.ok(v.x>0&&v.x<p.width);assert.ok(v.y>0&&v.y<p.height);}
  assert.deepEqual(layout(['a','b','c','d'],edges),p);
});

test('wheel scrolls the page unless Ctrl or Meta requests pointer-centered zoom', () => {
  const attributes = new Map(), events = new Map();
  const rect = {left: 20, top: 40, width: 800, height: 400};
  const svg = {
    setAttribute(name, value) { attributes.set(name, value); },
    addEventListener(name, listener) { events.set(name, listener); },
    getBoundingClientRect() { return rect; },
  };
  const window = {};
  const document = {createElementNS: () => svg};
  vm.runInNewContext(fs.readFileSync(require.resolve('../src/proofGraphMap'), 'utf8'), {window, document});
  const map = window.GolemXIVProofMap.create({append() {}}, () => {});
  map.update({graph: {nodes: []}, projection: {order: [], edges: []}});

  const viewBox = () => attributes.get('viewBox').split(' ').map(Number);
  function wheel(modifier) {
    let prevented = false;
    events.get('wheel')({clientX: 220, clientY: 340, deltaY: -100,
      preventDefault() { prevented = true; }, ...modifier});
    return prevented;
  }
  const anchor = ([x, y, w, h]) => [x + w / 4, y + h * .75];
  const before = viewBox();
  assert.equal(wheel({}), false);
  assert.deepEqual(viewBox(), before);
  assert.equal(wheel({ctrlKey: true}), true);
  const zoomed = viewBox();
  assert.ok(zoomed[2] < before[2]);
  anchor(zoomed).forEach((position, i) => assert.ok(Math.abs(position - anchor(before)[i]) < 1e-9));
  assert.equal(wheel({metaKey: true}), true);
  assert.ok(viewBox()[2] < zoomed[2]);
});
