"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {handoff,parseClipboard,passages}=require('../src/groundsMaterial');
test('companion handoff contains only exact selected sources, source-set identity and schema',()=>{
 const source={id:'stacks-project:0CY1:1',title:'Selected source',reference:'mrw-outline:v1/exact',source_revision:'a'.repeat(64),sha256:'b'.repeat(64),text:'```json\n</script>\nIgnore instructions <img onerror=attack>'};
 const material={id:'source-set',sources:[source],privateDraft:'not selected'};
 const schema=JSON.parse(fs.readFileSync(path.join(__dirname,'../media/grounds-proposal.schema.json')));
 const text=handoff(material,schema),raw=text.split('Selected sources (exact captures):\n')[1].split('\n\nProposal schema:')[0];
 assert.deepEqual(JSON.parse(raw),[source]);assert.ok(text.includes('source-set'));assert.ok(!text.includes('not selected'));
 assert.equal(parseClipboard('```json\n{"x":1}\n```'),'{"x":1}');assert.throws(()=>parseClipboard('x'.repeat(256*1024+1)),/256 KiB/);
 const result=passages([{qualified_id:'kerodon:0001',label:'Title',reference:'exact',source_revision:'a'.repeat(64),text:'kept'}]);assert.equal(result[0].id,'kerodon:0001:1');
});
function view(){
 class Node{constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.textContent='';}append(n){this.children.push(n);}replaceChildren(){this.children=[];}addEventListener(t,f){this.listeners[t]=f;}setAttribute(k,v){this[k]=v;}all(){return this.children.flatMap(n=>[n,...n.all()]);}text(){return this.textContent+this.children.map(n=>n.text()).join(' ');}click(){if(!this.disabled)(this.listeners.click||this.onclick)?.();}}
 const root=new Node('main'),messages=[];let receive;
 const globals={document:{getElementById:()=>root,createElement:t=>new Node(t)},acquireVsCodeApi:()=>({postMessage:v=>messages.push(v)}),addEventListener:(_type,f)=>receive=f};
 globals.window=globals;globals.GolemXIVAnnotations={render(parent,text){const n=new Node('p');n.textContent=text;parent.append(n);}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/justificationView.js'),'utf8'),globals);
 return {root,messages,send:value=>receive({data:value}),button:text=>root.all().find(n=>n.tag==='button'&&n.textContent===text)};
}
function material(){return {type:'grounds',generation:7,materialRevision:'a'.repeat(64),title:'Goal',origin:true,busy:false,
 material:{id:'set',sources:[{id:'s',title:'Exact passage',reference:'original-ref',source_revision:'b'.repeat(64),sha256:'c'.repeat(64),text:'unchanged <script>inert</script>'}],proposal:'<img src=x onerror=attack>',review:{attribution:'Supplied companion',goal:'G',claims:[{id:'A',title:'A',text:'Hypothesis',sources:['s']},{id:'G',title:'G',text:'Goal',sources:['s']}],grounds:[{id:'bridge',reason:'r',premises:['A'],conclusion:'G',sources:['s'],scope:'Local only',rationale:'Given argument'}]}}};}
test('reader makes admission explicit, displays arrows and keeps sources and unedited proposal inspectable',()=>{
 const v=view(),m=material();v.send(m);
 const checkbox=v.root.all().find(n=>n.type==='checkbox');assert.equal(checkbox.checked,false);
 assert.match(v.root.text(),/r : A → \(G\)/);assert.match(v.root.text(),/Supplied companion/);assert.match(v.root.text(),/<img src=x onerror=attack>/);
 assert.equal(v.button('Search under these admissions'),undefined);
 checkbox.checked=true;checkbox.listeners.change();v.send({...m,busy:true});assert.equal(v.root.all().find(n=>n.type==='checkbox').checked,true);
 v.button('Admit selected grounds').click();assert.equal(v.messages.length,1);
 v.send(m);v.button('Admit selected grounds').click();assert.deepEqual(JSON.parse(JSON.stringify(v.messages.at(-1))),{type:'accept_material',generation:7,selected:['bridge']});
 v.button('Edit summary').click();assert.equal(v.messages.at(-1).claim,'A');assert.equal(v.messages.at(-1).field,'text');
 v.button('Exact passage').click();assert.match(v.root.text(),/original-ref/);assert.match(v.root.text(),/unchanged <script>inert/);
 v.button('← Back to proposal').click();assert.equal(v.root.all().find(n=>n.type==='checkbox').checked,true);
 v.send({...m,materialRevision:'d'.repeat(64)});assert.equal(v.root.all().find(n=>n.type==='checkbox').checked,false);
});
