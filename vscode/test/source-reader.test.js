'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){
 class N{constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.events={};this.style={};if(tag==='iframe')this.contentWindow={};}append(n){this.children.push(n);n.parent=this;}before(n){const a=this.parent.children;a.splice(a.indexOf(this),0,n);n.parent=this.parent;}remove(){this.parent.children=this.parent.children.filter(n=>n!==this);}setAttribute(k,v){this[k]=v;}addEventListener(k,f){this.events[k]=f;}}
 const globals={URL,document:{createElement:t=>new N(t)},window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../src/sourceReader'),'utf8'),globals);
 const outer=new N('main'),root=new N('article');outer.append(root);const draft=new N('textarea');draft.value='Unsent annotation λ';root.append(draft);
 let browser,returns=0;const reader=globals.window.MRWSourceReader.create({root,onBrowser:u=>browser=u,onReturn:()=>returns++});
 const all=n=>n.children.flatMap(x=>[x,...all(x)]),click=a=>all(outer).find(n=>n.dataset.action===a).events.click();
 return{outer,root,draft,reader,all,click,browser:()=>browser,returns:()=>returns,validate:globals.window.MRWSourceReader.validated};
}
for(const [id,name,base,tag] of [['stacks-project','Stacks Project','https://stacks.math.columbia.edu','08ZD'],['kerodon','Kerodon','https://kerodon.net','0004']])test(name+' original/saved switching is explicit and keeps its frame, draft and Return',()=>{
 const h=fixture(),config={sourceId:id,name,url:base+'/tag/'+tag,origins:[base],supported:true,revision:'retained-hash'};
 h.reader.update(config);assert.equal(h.reader.frame(),undefined);assert.equal(h.root.hidden,false);
 h.click('source-live');const frame=h.reader.frame();assert.equal(frame.src,config.url);assert.equal(frame.sandbox,'allow-scripts allow-same-origin allow-forms allow-popups');
 h.reader.update({...config,revision:'retained-hash'});assert.equal(h.reader.frame(),frame);assert.equal(h.draft.value,'Unsent annotation λ');
 assert.equal(h.reader.fromFrame({source:frame.contentWindow}),true);assert.equal(h.reader.fromFrame({source:{}}),false);
 h.click('source-saved');assert.equal(h.reader.frame(),frame);assert.equal(h.root.hidden,false);h.click('source-live');assert.equal(h.reader.frame(),frame);
 h.click('source-browser');assert.equal(h.browser(),config.url);h.click('source-return');assert.equal(h.returns(),1);
});
test('blocked sources show a capability limit and malformed origins cannot become frames',()=>{
 const h=fixture();h.reader.update({sourceId:'wiki',name:'Wiki',url:'https://wiki.example/page',origins:['https://wiki.example'],supported:false,reason:'Embedding is disabled by this source.'});h.click('source-live');assert.equal(h.reader.frame(),undefined);assert.equal(h.root.hidden,false);
 for(const url of ['javascript:alert(1)','https://evil.example/page','https://user:secret@wiki.example/page'])assert.equal(h.validate({name:'Wiki',url,origins:['https://wiki.example'],supported:true}),undefined);
 assert.equal(h.validate({name:'Wiki',url:'https://wiki.example/page',origins:['https://wiki.example; frame-src *'],supported:true}),undefined);
});
test('direct import command buttons remain native welcome content with an empty Commands provider',()=>{
 const m=require('../package.json'),welcome=m.contributes.viewsWelcome.find(v=>v.view==='mrw.commands').contents;
 for(const command of ['mrw.importStacksSection','mrw.importKerodonSection'])assert.match(welcome,new RegExp('command:'+command.replaceAll('.','\\.')));
 assert.equal(m.contributes.viewsWelcome.find(v=>v.view==='mrw.commands').when,undefined);
 for(const id of ['mrw.importStacksSection','mrw.importKerodonSection'])assert.ok(m.contributes.commands.some(c=>c.command===id));
});
