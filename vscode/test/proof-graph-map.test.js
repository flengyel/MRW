'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {layout}=require('../src/proofGraphMap');

test('rank layout preserves dependency direction, separates claims and bounds all positions',()=>{
  const edges=[{from:'a',to:'c'},{from:'b',to:'c'},{from:'c',to:'d'}];
  const p=layout(['a','b','c','d'],edges);
  for(const e of edges)assert.ok(p.positions[e.from].x<p.positions[e.to].x);
  assert.notEqual(p.positions.a.y,p.positions.b.y);
  for(const v of Object.values(p.positions)){assert.ok(v.x>0&&v.x<p.width);assert.ok(v.y>0&&v.y<p.height);}
  assert.deepEqual(layout(['a','b','c','d'],edges),p);
});
