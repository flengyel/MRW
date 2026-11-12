'use strict';
const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs/promises'), path=require('node:path'), os=require('node:os');
const {pathToFileURL}=require('node:url');
const {ZoteroApi,apiPath,attachmentPath}=require('../src/zoteroApi');
const {ZoteroRecords,validateItem,makeLink,parseLink,citation,digest}=require('../src/zoteroRecords');
const {registerZotero}=require('../src/zotero');
const library={type:'user',id:0};
const apiInfo={apiVersion:3,transport:'local',serverId:'fixture-instance',schemaVersion:'44',versionDomain:'local'};
const item=(key='ABCDEFGH',version=3)=>({key,version,library:{type:'user',id:123},data:{key,version,itemType:'book',title:'A mathematical book',creators:[{lastName:'Author'}],date:'2020'},citation:'<span>(Author 2020)</span>',bib:'Author. <i>A mathematical book.</i> 2020.'});
const attachment=()=>{const a=item('IJKLMNOP',4);a.data={...a.data,itemType:'attachment',parentItem:'ABCDEFGH',title:'PDF',contentType:'application/pdf',filename:'paper.pdf'};return a;};
const record=()=>({schema:'mrw.zotero-reference.v1',api:apiInfo,library,item:item(),acquiredAt:'2026-11-12T00:00:00Z',origin:null});
async function temp(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-zotero-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}
const response=(body,status=200,server='fixture-instance')=>({status,headers:{'Zotero-API-Version':'3','Zotero-Server-ID':server},body:typeof body==='string'?body:JSON.stringify(body)});
test('API uses bounded search and pins local instance across requests',async()=>{
 const calls=[],api=new ZoteroApi('local',{get:async(p,server)=>{calls.push({p,server});return response(p==='/'?'Local API':[]);}});
 await api.probe();await api.search(library,'A & B');await api.children(library,'ABCDEFGH');
 assert.equal(calls[1].server,'fixture-instance');assert.match(calls[1].p,/limit=50/);assert.match(calls[1].p,/q=A\+%26\+B/);assert.equal(api.capabilities.versionDomain,'local');
});
test('disabled API, missing file, redirect and changed instance fail explicitly',async()=>{
 for(const [status,pattern] of [[403,/Enable Zotero/],[404,/unavailable/],[302,/No redirect/],[412,/instance changed/]]){
  const api=new ZoteroApi('local',{get:async()=>response('',status)});await assert.rejects(api.probe(),pattern);
 }
 const api=new ZoteroApi('local',{serverId:'original',get:async()=>response('',200,'replacement')});await assert.rejects(api.probe(),/instance changed/);
});
test('unsupported API, malformed JSON and oversized responses are rejected',async()=>{
 const a=new ZoteroApi('local',{get:async()=>({status:200,headers:{'zotero-api-version':'2'},body:'{}'})});await assert.rejects(a.probe(),/API version 3/);
 const b=new ZoteroApi('local',{get:async()=>response('not json')});await assert.rejects(b.groups(),/invalid JSON/);
 const c=new ZoteroApi('local',{get:async()=>response('x'.repeat(4*1024*1024+1))});await assert.rejects(c.probe(),/oversized/);
});
test('old local API records unavailable instance identity rather than inventing a version domain',async()=>{
 const api=new ZoteroApi('local',{get:async()=>response('',200,null)});await api.probe();assert.equal(api.capabilities.serverId,null);assert.equal(api.capabilities.versionDomain,'local');
});
test('transport admits only read API paths and maps explicit Windows file URIs',()=>{
 for(const value of ['http://evil/','//evil/','/local/authorize','/users/0/items/../../x','/users/0/items/ABCDEFGH/file'])assert.throws(()=>apiPath(value));
 assert.equal(attachmentPath('file:///C:/Users/Reader/A%20B.pdf','windows'),'/mnt/c/Users/Reader/A B.pdf');
 for(const value of ['https://example.org/paper.pdf','file://server/share/a.pdf','file:///C:/a.pdf?x=1'])assert.throws(()=>attachmentPath(value,'windows'));
 assert.throws(()=>validateItem(item(),{type:'group',id:123}),/different library/);
});
test('metadata revisions are immutable, content addressed and independently reopened',async t=>{
 const store=new ZoteroRecords(await temp(t)),old=record(),id=await store.save(old),next={...old,item:item('ABCDEFGH',5)};
 const second=await store.save(next);assert.notEqual(id,second);assert.equal(await store.save(old),id);
 assert.equal((await new ZoteroRecords(store.root).load(id)).item.version,3);assert.equal((await store.load(second)).item.version,5);
 const file=path.join(store.root,'references',id+'.json');await fs.chmod(file,0o600);await fs.writeFile(file,'{}');await assert.rejects(store.load(id),/changed/);await assert.rejects(store.save(old),/differs/);
});
test('attachment revisions retain exact bytes; changing original never retargets prior citation',async t=>{
 const root=await temp(t),store=new ZoteroRecords(path.join(root,'storage')),source=path.join(root,'paper.pdf');
 await fs.writeFile(source,'%PDF-1.4\nfirst');const first=await store.retainAttachment(source);const firstRecord={...record(),attachment:{...first,item:attachment()}};const id=await store.save(firstRecord);
 await fs.writeFile(source,'%PDF-1.4\nsecond');const second=await store.retainAttachment(source);
 assert.notEqual(first.sha256,second.sha256);assert.equal(await fs.readFile(await store.verifiedFile((await store.load(id)).attachment),'utf8'),'%PDF-1.4\nfirst');
 assert.equal(await fs.readFile(source,'utf8'),'%PDF-1.4\nsecond');
});
test('cancelled attachment retention removes partial staging and leaves source intact',async t=>{
 const root=await temp(t),store=new ZoteroRecords(path.join(root,'storage')),file=path.join(root,'paper.pdf');await fs.writeFile(file,'%PDF-fixture');
 await assert.rejects(store.retainAttachment(file,{isCancellationRequested:true}),/cancelled/);
 assert.deepEqual(await fs.readdir(path.join(store.root,'attachments')),[]);assert.equal(await fs.readFile(file,'utf8'),'%PDF-fixture');
});
test('missing, oversized and unsupported attachments never substitute another file',async t=>{
 const root=await temp(t),store=new ZoteroRecords(path.join(root,'storage'));
 await assert.rejects(store.retainAttachment(path.join(root,'missing.pdf')),e=>e.code==='ENOENT');
 const file=path.join(root,'large.pdf');const h=await fs.open(file,'w');await h.truncate(128*1024*1024+1);await h.close();
 await assert.rejects(store.retainAttachment(file),/128 MiB/);await assert.rejects(store.retainAttachment(path.join(root,'app.exe')),/not supported/);
});
test('record and attachment path injection, redirected storage and tampering are rejected',async t=>{
 const root=await temp(t),outside=path.join(root,'outside');await fs.mkdir(outside);await fs.symlink(outside,path.join(root,'redirect'));
 await assert.rejects(new ZoteroRecords(path.join(root,'redirect')).save(record()),/redirected/);
 const store=new ZoteroRecords(path.join(root,'store'));await assert.rejects(store.load('../data'),/Invalid/);
 await assert.rejects(store.save({...record(),attachment:{item:attachment(),sha256:'../bad',extension:'.pdf',size:1}}),/Invalid/);
});
test('citation links preserve revision and workspace scope, with inert citation text',()=>{
 const id='a'.repeat(64),workspace='vscode-remote://wsl+Debian/home/reader/study',link=makeLink(workspace,id);
 assert.deepEqual(parseLink(link),{workspace,id});assert.match(citation(record(),link),/Author 2020/);assert.match(citation(record(),link),/zotero:\/\/select\/library\/items\/ABCDEFGH/);
 const r=record();r.item.citation='<img src=x onerror=bad>[click](command:bad)';assert.ok(!citation(r,link).includes('<img'));assert.match(citation(r,link),/\\\[click/);
 assert.throws(()=>parseLink(link+'&extra=1'));assert.throws(()=>parseLink(link.replace('flengyel.mrw','evil')));
});
async function harness(t,{state=new Map(),failState=false}={}){
 const root=await temp(t),store=new ZoteroRecords(path.join(root,'storage')),commands=new Map(),picks=[],inputs=[],calls=[],opens=[],messages=[],edits=[];
 const file=path.join(root,'note.md');await fs.writeFile(file,'# Note\n');
 const doc={uri:{scheme:'file',fsPath:file,toString:()=>pathToFileURL(file).href},languageId:'markdown',version:1,isClosed:false,isDirty:true,text:'# Note\nunsaved',getText(){return this.text;},offsetAt:p=>p};
 const selection={start:0,end:0,active:0,isEqual:o=>o===selection};
 const editor={document:doc,selection,async edit(action,options){action({insert:(_p,text)=>{doc.text+=text;doc.version++;edits.push({text,options});}});return true;}};
 let currentItem=item(),currentAttachment=attachment();const source=path.join(root,'paper.pdf');await fs.writeFile(source,'%PDF-fixture');
 const api={transport:'local',capabilities:apiInfo,async probe(){calls.push('probe');return apiInfo;},async groups(){return [];},async search(){calls.push('search');return [currentItem];},async item(_l,key){calls.push('item');return key==='ABCDEFGH'?currentItem:currentAttachment;},async children(){return [currentAttachment];},async file(){return pathToFileURL(source).href;}};
 const vscode={env:{remoteName:undefined,uriScheme:'vscode',clipboard:{async writeText(text){calls.push({clipboard:text});}},async openExternal(uri){calls.push({external:uri.toString()});return true;}},Uri:{file:p=>({scheme:'file',fsPath:p}),parse:s=>({path:new URL(s).pathname,toString:()=>s})},ProgressLocation:{Notification:1},workspace:{workspaceFolders:[{uri:{fsPath:root}}],getConfiguration:()=>({get:(_k,f)=>f})},window:{activeTextEditor:editor,
  async showQuickPick(choices){const selection=picks.shift();if(selection===null)return;return typeof selection==='function'?selection(choices):choices.find(x=>x.action===selection||x.transport===selection)||choices[0];},async showInputBox(){return inputs.shift();},async showInformationMessage(text){messages.push(text);},async withProgress(_o,action){return action({}, {isCancellationRequested:false});}}};
 const context={storageUri:{fsPath:store.root},workspaceState:{get:(k,f)=>state.get(k)||f,async update(k,v){if(failState)throw Error('state write failed');state.set(k,structuredClone(v));}}};
 const reading={currentLocation:()=>undefined,async checkFile(){},async openLinkedDocument(uri,from){opens.push({uri,from});return true;},async returnToStudy(from){calls.push({return:from});}};
 const controller=registerZotero({vscode,context,register:(id,f)=>commands.set(id,f),reading,records:store,apiFactory:()=>api,show:async(...args)=>calls.push({show:args})});
 state.set('mrw.zotero.v1',{connection:{transport:'local',library,serverId:'fixture-instance'}});
 return {root,store,state,commands,picks,inputs,calls,opens,doc,editor,edits,reading,controller,source,messages,api,setItem:v=>currentItem=v,setAttachment:v=>currentAttachment=v};
}
test('selection and citation insertion preserve dirty text and use one undoable edit without save',async t=>{
 const h=await harness(t);h.inputs.push('book');h.picks.push(undefined,'insert');await h.commands.get('mrw.findZoteroReference')();
 assert.ok(h.doc.text.startsWith('# Note\nunsaved'));assert.equal(h.edits.length,1);assert.equal(h.edits[0].options.undoStopBefore,true);assert.equal(await fs.readFile(path.join(h.root,'note.md'),'utf8'),'# Note\n');
 const saved=h.state.get('mrw.zotero.v1');assert.equal((await h.store.load(saved.last)).item.key,'ABCDEFGH');
});
test('cancelling reference selection does not create a record or edit a note',async t=>{
 const h=await harness(t);h.inputs.push('book');h.picks.push(null);await h.commands.get('mrw.findZoteroReference')();
 assert.equal(h.edits.length,0);await assert.rejects(fs.access(path.join(h.store.root,'references')),e=>e.code==='ENOENT');
});
test('citation insertion rejects note changes during asynchronous scope checking',async t=>{
 const h=await harness(t),id=await h.store.save(record());h.state.get('mrw.zotero.v1').last=id;h.reading.checkFile=async()=>{h.doc.version++;h.doc.text+=' changed';};h.picks.push(undefined,'insert');
 await assert.rejects(h.commands.get('mrw.resumeZoteroReference')(),/note or selection changed/);assert.equal(h.edits.length,0);assert.match(h.doc.text,/changed$/);
});
test('retained attachment reopens after restart without an API request',async t=>{
 const h=await harness(t),bytes=await h.store.retainAttachment(h.source),id=await h.store.save({...record(),attachment:{...bytes,item:attachment()}});
 h.state.get('mrw.zotero.v1').last=id;h.picks.push(undefined,'attachment');await h.commands.get('mrw.resumeZoteroReference')();
 assert.equal(h.opens.length,1);assert.equal(h.calls.length,0);assert.equal(digest(await fs.readFile(h.opens[0].uri.fsPath)),bytes.sha256);
});
test('attachment selection retains exact bytes and delegates opening to existing reader',async t=>{
 const h=await harness(t),id=await h.store.save(record());h.state.get('mrw.zotero.v1').last=id;h.picks.push(undefined,'attachment',undefined);
 await h.commands.get('mrw.resumeZoteroReference')();const current=await h.store.load(h.state.get('mrw.zotero.v1').last);
 assert.equal(current.derivedFrom,id);assert.equal(current.attachment.item.key,'IJKLMNOP');assert.equal(h.opens.length,1);assert.equal(h.opens[0].from.revision,digest(h.doc.text));assert.equal(await fs.readFile(h.source,'utf8'),'%PDF-fixture');
});
test('changed item metadata refuses attachment substitution and preserves old reference',async t=>{
 const h=await harness(t),id=await h.store.save(record());h.state.get('mrw.zotero.v1').last=id;h.setItem(item('ABCDEFGH',6));h.picks.push(undefined,'attachment');
 await assert.rejects(h.commands.get('mrw.resumeZoteroReference')(),/metadata changed/);assert.equal(h.opens.length,0);assert.equal((await h.store.load(id)).item.version,3);
});
test('missing selected attachment fails without choosing another or mutating library',async t=>{
 const h=await harness(t),id=await h.store.save(record());await fs.unlink(h.source);h.picks.push(undefined,'attachment',undefined);
 await assert.rejects(h.commands.get('mrw.resumeZoteroReference')(),/file is unavailable/);assert.equal(h.opens.length,0);assert.equal((await h.store.load(id)).attachment,undefined);
});
test('a failed last-selection update leaves immutable metadata discoverable',async t=>{
 const h=await harness(t,{failState:true});h.inputs.push('book');h.picks.push(undefined);
 await assert.rejects(h.commands.get('mrw.findZoteroReference')(),/state write failed/);
 const entries=await fs.readdir(path.join(h.store.root,'references'));assert.equal(entries.length,1);assert.equal((await h.store.load(entries[0].slice(0,-5))).item.key,'ABCDEFGH');
});
test('opening a citation enforces its workspace and reads the retained target offline',async t=>{
 const h=await harness(t),id=await h.store.save(record());const link=makeLink(pathToFileURL(h.root).href,id);
 h.picks.push('inspect');assert.equal(await h.controller.handleUri({path:'/zotero',toString:()=>link}),true);assert.equal(h.calls.filter(c=>c==='probe').length,0);
 const displayed=h.calls.find(c=>c.show).show;assert.equal(JSON.parse(displayed[0]).id,id);assert.equal(displayed[1],'Retained-Zotero-reference');
 await assert.rejects(h.controller.handleUri({path:'/zotero',toString:()=>makeLink('file:///different',id)}),/different workspace/);
});
test('connecting is explicit and retains chosen scope only after the API and picker succeed',async t=>{
 const h=await harness(t);h.state.clear();h.picks.push('local',null);await h.commands.get('mrw.connectZotero')();assert.equal(h.state.size,0);
 h.picks.push('local',undefined);await h.commands.get('mrw.connectZotero')();assert.deepEqual(h.state.get('mrw.zotero.v1').connection,{transport:'local',library,serverId:'fixture-instance'});
});
test('activation only registers commands; no API, file or subprocess work',()=>{
 const commands=[];const context={storageUri:{fsPath:'/not-used'},workspaceState:{get:()=>({})}};
 registerZotero({vscode:{},context,register:id=>commands.push(id),reading:{},show(){},apiFactory:()=>{throw Error('must not activate');}});
 assert.deepEqual(commands,['mrw.connectZotero','mrw.findZoteroReference','mrw.resumeZoteroReference']);
});

test('restart ignores interrupted reference and attachment staging without hiding completed records',async t=>{
 const h=await harness(t),id=await h.store.save(record());
 await fs.writeFile(path.join(h.store.root,'references','interrupted.pending'),'{partial');
 await fs.mkdir(path.join(h.store.root,'attachments'));await fs.writeFile(path.join(h.store.root,'attachments','interrupted.pending'),'partial file');
 h.picks.push(undefined,'inspect');await h.commands.get('mrw.resumeZoteroReference')();
 assert.equal(JSON.parse(h.calls.find(c=>c.show).show[0]).id,id);assert.equal(h.calls.includes('probe'),false);
});

test('changed attachment metadata during copy rejects publication of a misleading reference',async t=>{
 const h=await harness(t),id=await h.store.save(record());h.picks.push(undefined,'attachment',undefined);
 const retain=h.store.retainAttachment.bind(h.store);
 h.store.retainAttachment=async(...args)=>{const bytes=await retain(...args);const changed=attachment();changed.version++;changed.data.version++;h.setAttachment(changed);return bytes;};
 await assert.rejects(h.commands.get('mrw.resumeZoteroReference')(),/Attachment metadata changed/);
 assert.equal(h.opens.length,0);assert.equal((await h.store.load(id)).attachment,undefined);assert.equal((await fs.readdir(path.join(h.store.root,'references'))).length,1);
});

test('Study archive and permanent deletion preserve Zotero records, retained bytes and originals',async t=>{
 const h=await harness(t),bytes=await h.store.retainAttachment(h.source),id=await h.store.save({...record(),attachment:{...bytes,item:attachment()}});
 const {StudyLifecycle}=require('../src/studyLifecycle'),home=path.join(h.root,'active-studies-v1');
 const lifecycle=new StudyLifecycle(home,{excludeStudies(){},async eraseStudy(){}});await lifecycle.load();
 const study='b'.repeat(64),source='c'.repeat(64);await fs.writeFile(path.join(home,study+'.json'),'{}');
 await lifecycle.change(study,'archived',source);await lifecycle.change(study,'trashed',source);await lifecycle.beginDelete(study,source,new Set());await lifecycle.finishDelete(study,new Map());
 assert.equal(lifecycle.state(study),'deleted');assert.equal((await h.store.load(id)).item.key,'ABCDEFGH');
 assert.equal(digest(await fs.readFile(await h.store.verifiedFile(bytes))),bytes.sha256);assert.equal(await fs.readFile(h.source,'utf8'),'%PDF-fixture');
});
