'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {resolve,packet}=require('../src/citationZotero');
const response=(request,items={},errors={})=>({status:200,body:JSON.stringify({jsonrpc:'2.0',id:request.id,result:{items,errors}})});
test('exact-key lookup delegates only the supported read API in the selected libraries',async()=>{
 const seen=[];const result=await resolve(['a','b'],{libraries:[1,4],request:async p=>{seen.push(p);return response(p,{a:{id:'a',type:'book',title:'Retained identity'}},{b:0});}});
 assert.equal(seen[0].method,'item.pandoc_filter');assert.deepEqual(seen[0].params,[['a','b'],true,['1','4']]);assert.equal(result.references[0].id,'a');assert.equal(result.errors.b,0);
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

test('snapshot identifies only selected owner libraries and its transport',async()=>{
 const seen=[];const r=await resolve(['a'],{libraries:[4,1],transport:'windows',request:async p=>{
  seen.push(p);return p.method==='user.groups'?{status:200,body:JSON.stringify({jsonrpc:'2.0',id:p.id,result:[{id:1,name:'My Library'},{id:4,name:'Algebra & geometry'},{id:6,name:'Unselected private group'}]})}:response(p,{a:{id:'a'}});
 }});
 assert.deepEqual(seen.map(p=>[p.method,p.params]),[['item.pandoc_filter',[['a'],true,['4','1']]],['user.groups',[false]]]);
 assert.match(r.readAt,/^\d{4}-\d{2}-\d{2}T/);
 assert.match(r.status,/snapshot · "Algebra & geometry" \(BBT library 4\), "My Library" \(BBT library 1\) · Windows Zotero/);
 assert.doesNotMatch(r.status,/Unselected/);assert.deepEqual(r.references,[{id:'a'}]);
});
test('unavailable or invalid optional names preserve the exact-key result and library IDs',async()=>{
 const groups=values=>({status:200,body:JSON.stringify({jsonrpc:'2.0',id:'different',result:values})});
 for(const metadata of [()=>{throw Error('Offline');},p=>({status:302,body:''}),p=>groups([{id:4,name:'Spoof'}]),p=>({status:200,body:JSON.stringify({jsonrpc:'2.0',id:p.id,result:[{id:4,name:'First'},{id:4,name:'Duplicate'}]})}),p=>({status:200,body:JSON.stringify({jsonrpc:'2.0',id:p.id,result:[{id:4,name:'x'.repeat(513)}]})}),p=>({status:200,body:JSON.stringify({jsonrpc:'2.0',id:p.id,result:[{id:4,name:'Bad\nname'}]})}),p=>({status:200,body:JSON.stringify({jsonrpc:'2.0',id:p.id,result:Array(1001).fill({id:4,name:'Too many'})})})]){
  const r=await resolve(['a'],{libraries:[4],request:async p=>p.method==='user.groups'?metadata(p):response(p,{a:{id:'a'}})});
  assert.deepEqual(r.references,[{id:'a'}]);assert.match(r.status,/· BBT library 4 · local Zotero/);assert.doesNotMatch(r.status,/Spoof|Duplicate|First|Too many/);
 }
});
test('default library needs no name request and cancellation remains cancellation',async()=>{
 let calls=0;const r=await resolve(['a'],{request:async p=>{calls++;return response(p,{a:{id:'a'}});}});assert.equal(calls,1);assert.match(r.status,/My Library \(default\)/);
 const aborter=new AbortController();await assert.rejects(resolve(['a'],{libraries:[1],signal:aborter.signal,request:async p=>{if(p.method==='user.groups'){aborter.abort();throw aborter.signal.reason;}return response(p,{a:{id:'a'}});}}),{name:'AbortError'});
});
test('owner names and bibliography status are escaped by the preview renderer',async()=>{
 const {registerCitations}=require('../src/citations');const MarkdownIt=require('../media/markdown-it/markdown-it');
 const doc={uri:{scheme:'file',fsPath:'/fixture/a.md',toString:()=> 'file:///fixture/a.md'},getText:()=> '[@a]'};
 const result=await resolve(['a'],{libraries:[1],request:async p=>p.method==='user.groups'?{status:200,body:JSON.stringify({jsonrpc:'2.0',id:p.id,result:[{id:1,name:'<img src=x onerror=alert(1)>'}]})}:response(p,{a:{id:'a'}})});
 const c=registerCitations({vscode:{workspace:{isTrusted:false},commands:{executeCommand:async()=>{}}},context:{subscriptions:[]},documents:{}});
 c.cache.set(doc.uri.toString(),{text:'[@a]',citations:{'[@a]':{text:'(Author 2020)'}},bibliography:'',status:result.status});
 const html=c.extendMarkdownIt(new MarkdownIt()).render('[@a]',{currentDocument:doc.uri});assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);
});
