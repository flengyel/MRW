'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {resolve,packet}=require('../src/citationZotero');
const response=(request,items={},errors={})=>({status:200,body:JSON.stringify({jsonrpc:'2.0',id:request.id,result:{items,errors}})});
test('exact-key lookup delegates only the supported read API in the selected libraries',async()=>{
 let seen;const result=await resolve(['a','b'],{libraries:[1,4],request:async p=>{seen=p;return response(p,{a:{id:'a',type:'book',title:'Retained identity'}},{b:0});}});
 assert.equal(seen.method,'item.pandoc_filter');assert.deepEqual(seen.params,[['a','b'],true,['1','4']]);assert.equal(result.references[0].id,'a');assert.equal(result.errors.b,0);
});
test('missing and ambiguous keys remain distinct and do not acquire substitute entries',async()=>{
 const r=await resolve(['missing','ambiguous'],{request:async p=>response(p,{}, {missing:0,ambiguous:2})});assert.deepEqual(r.references,[]);assert.deepEqual(r.errors,{missing:0,ambiguous:2});
});
test('unexpected keys, mismatched IDs, malformed counts and mismatched replies are rejected',async()=>{
 for(const build of [p=>response(p,{other:{id:'other'}}),p=>response(p,{a:{id:'replacement'}}),p=>response(p,{}, {a:-1}),p=>({status:200,body:JSON.stringify({jsonrpc:'2.0',id:'other',result:{items:{},errors:{}}})})])await assert.rejects(resolve(['a'],{request:async p=>build(p)}));
});
test('key/library budgets and wildcard scope are rejected before making a request',async()=>{
 for(const args of [[[],[]],[['a'],['*']],[['a'],[1,1]],[['a'],[0]],[['a'],[2147483648]],[['a\u0000'],[]],[Array.from({length:129},(_,i)=>String(i)),[]]])assert.throws(()=>packet(...args));
 await assert.rejects(resolve(['a'],{transport:'remote',request:async()=>{throw Error('Must not call');}}),/Unsupported/);
});
test('redirects, oversized responses and RPC errors remain failures without another destination',async()=>{
 for(const request of [async()=>({status:302,body:''}),async()=>({status:200,body:'x'.repeat(4*1024*1024+1)}),async p=>({status:200,body:JSON.stringify({jsonrpc:'2.0',id:p.id,error:{code:-32601}})})])await assert.rejects(resolve(['a'],{request}));
});
