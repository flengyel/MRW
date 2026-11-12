'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {loadPack,validate,workingCopy}=require('../src/lessonPacks'),{registerLeanStudy}=require('../src/leanStudy'),{trackLocation}=require('../src/readingOutline');
const builtin=path.resolve(__dirname,'../media/lean-study');
async function temporary(t){const root=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-lean-unit-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));return root;}
function harness(root,{state=new Map(),global=new Map(),lean=true,extensionPath=path.resolve(__dirname,'..'),notesFolder=''}={}){
 const commands=new Map(),calls=[],messages=[],picks=[],folders=[],answers=[],docs=new Map();let selectionChanged,changed,returned,activation=0;
 const uri=file=>({scheme:'file',fsPath:file,path:file,toString:()=>'file:'+file});
 class Position{constructor(line,character){this.line=line;this.character=character;}}
 class Range{constructor(start,end){this.start=start;this.end=end;}}
 class Selection extends Range{}
 const offsets=(text,pos)=>text.split('\n').slice(0,pos.line).reduce((n,s)=>n+s.length+1,0)+pos.character;
 const api={Position,Range,Selection,Uri:{file:uri,parse:url=>({scheme:new URL(url).protocol.slice(0,-1),toString:()=>url})},ViewColumn:{One:1,Two:2,Beside:-2},TextEditorRevealType:{InCenterIfOutsideViewport:2},
  extensions:{getExtension:id=>id==='leanprover.lean4'&&lean?{async activate(){activation++;}}:undefined},
  env:{async openExternal(u){calls.push({name:'external',url:u.toString()});}},
  commands:{async getCommands(){return ['markdown.reopenAsPreview','lean4.displayGoal'];},async executeCommand(name,...args){calls.push({name,args});return commands.get(name)?.(...args);}},
  workspace:{getConfiguration:()=>({get:(k,f)=>k==='notesFolder'?notesFolder:f}),onDidChangeTextDocument:f=>{changed=f;return {dispose(){}};},async openTextDocument(u){
   if(!docs.has(u.fsPath)){const doc={uri:u,version:1,isDirty:false,languageId:u.fsPath.endsWith('.md')?'markdown':'lean4',text:await fs.readFile(u.fsPath,'utf8'),getText(){return this.text;},offsetAt(pos){return offsets(this.text,pos);},positionAt(at){const xs=this.text.slice(0,at).split('\n');return new Position(xs.length-1,xs.at(-1).length);}};docs.set(u.fsPath,doc);}return docs.get(u.fsPath);
  }},window:{visibleTextEditors:[],onDidChangeTextEditorSelection:f=>{selectionChanged=f;return {dispose(){}};},async showQuickPick(items){return picks.length?picks.shift()(items):items[0];},async showOpenDialog(){return folders.shift()?.map(uri);},async showInformationMessage(message){messages.push(message);return answers.shift();},async showWarningMessage(message){messages.push(message);return answers.shift();},async showTextDocument(doc,options={}){
   let ed=api.window.visibleTextEditors.find(e=>e.document===doc);
   if(!ed){ed={document:doc,selection:new Selection(new Position(0,0),new Position(0,0)),viewColumn:options.viewColumn===-2?2:options.viewColumn||1,revealRange(){},undos:[],async edit(cb){cb({replace(_range,text){ed.undos.push(doc.text);doc.text=text;doc.version++;doc.isDirty=true;}});return true;}};api.window.visibleTextEditors.push(ed);}api.window.activeTextEditor=ed;return ed;
  }}};
 const memento=map=>({get:(k,f)=>map.get(k)??f,async update(k,v){map.set(k,structuredClone(v));}});
 const context={extensionPath,workspaceState:memento(state),globalState:memento(global),subscriptions:[]};
 const register=(name,fn)=>commands.set(name,fn);
 registerLeanStudy({vscode:api,context,register,trackLocation,returnToDocument:async pin=>{returned=pin;},readingLocation:()=>undefined});
 return {api,commands,calls,messages,picks,folders,answers,state,global,docs,activation:()=>activation,returned:()=>returned,
  async select(ed,start,end=start){ed.selection=new Selection(ed.document.positionAt(start),ed.document.positionAt(end));selectionChanged({textEditor:ed});await new Promise(r=>setImmediate(r));},
  async change(doc,text){const old=doc.text;doc.text=text;doc.version++;doc.isDirty=true;changed({document:doc,contentChanges:[{rangeOffset:old.length,rangeLength:0,text:text.slice(old.length)}]});await new Promise(r=>setImmediate(r));}};
}
test('native Study button preserves source entries and ordinary activation neither reads packs nor starts Lean',()=>{
 const m=require('../package.json'),w=m.contributes.viewsWelcome.find(v=>v.view==='mrw.commands');
 for(const id of ['mrw.studyLean4','mrw.importStacksSection','mrw.importKerodonSection'])assert.ok(w.contents.includes('command:'+id));assert.equal(w.when,undefined);assert.ok(!m.extensionDependencies?.includes('leanprover.lean4'));
 const h=harness('/nonexistent',{extensionPath:'/missing'});assert.equal(h.calls.length,0);assert.equal(h.activation(),0);
});
test('first lesson creates a dedicated copy, opens prose/code and supported InfoView, then resumes edited code and notes',async t=>{
 const root=await temporary(t),h=harness(root),prior=path.join(root,'prior.md');await fs.writeFile(prior,'# Prior\nAn unfinished argument.\n');const doc=await h.api.workspace.openTextDocument(h.api.Uri.file(prior));const ed=await h.api.window.showTextDocument(doc);ed.selection=new h.api.Selection(doc.positionAt(8),doc.positionAt(15));h.folders.push([root]);
 const opened=await h.commands.get('mrw.studyLean4')();assert.equal(opened.packId,'lean-foundations');assert.ok(h.calls.some(c=>c.name==='lean4.displayGoal'));assert.equal(h.activation(),1);
 const code=await h.api.workspace.openTextDocument(h.api.Uri.file(path.join(opened.root,'Study/Examples.lean')));await h.change(code,code.text+'\n-- My retained experiment\n');await fs.writeFile(code.uri.fsPath,code.text);const codeEd=await h.api.window.showTextDocument(code);await h.select(codeEd,code.text.indexOf('have hQ'));
 await fs.writeFile(path.join(opened.root,'Notes.md'),'# My note\nKeep this observation.\n');await h.commands.get('mrw.returnFromLeanStudy')();assert.equal(h.returned().uri,'file:'+prior);assert.equal(h.returned().start,8);
 const next=harness(root,{state:h.state,global:h.global,extensionPath:'/disabled-or-removed-pack'});const resumed=await next.commands.get('mrw.resumeLeanStudy')();assert.equal(resumed.root,opened.root);assert.ok(next.api.window.activeTextEditor.document.text.includes('My retained experiment'));assert.equal(next.api.window.activeTextEditor.document.offsetAt(next.api.window.activeTextEditor.selection.start),code.text.indexOf('have hQ'));assert.match(await fs.readFile(path.join(opened.root,'Notes.md'),'utf8'),/Keep this/);
 assert.equal((await fs.readFile(path.join(builtin,'Study/Examples.lean'),'utf8')).includes('My retained experiment'),false);
});
test('reset uses explicit confirmation and native undo without saving; concurrent edits cancel replacement',async t=>{
 const root=await temporary(t),h=harness(root,{notesFolder:root});const opened=await h.commands.get('mrw.studyLean4')();const ed=h.api.window.activeTextEditor;await h.change(ed.document,ed.document.text+'\n-- Unsaved edit\n');const onDisk=await fs.readFile(ed.document.uri.fsPath,'utf8');
 h.picks.push(items=>items.find(x=>x.kind==='reset'));await h.commands.get('mrw.leanStudyActions')();assert.match(ed.document.text,/Unsaved edit/);
 h.picks.push(items=>items.find(x=>x.kind==='reset'));h.answers.push('Replace in editor');await h.commands.get('mrw.leanStudyActions')();assert.ok(ed.undos.at(-1).includes('Unsaved edit'));assert.equal(ed.document.text.includes('Unsaved edit'),false);assert.equal(await fs.readFile(ed.document.uri.fsPath,'utf8'),onDisk);assert.equal(opened.root,path.join(root,'Lean Study','lean-foundations'));
 h.picks.push(items=>items.find(x=>x.kind==='reset'));h.api.window.showWarningMessage=async()=>{ed.document.text+='\n-- Concurrent change';ed.document.version++;return 'Replace in editor';};await assert.rejects(h.commands.get('mrw.leanStudyActions')(),/changed during confirmation/);assert.match(ed.document.text,/Concurrent change/);
});
test('external declarative pack registers, loads and survives removal without a rebuild',async t=>{
 const root=await temporary(t),h=harness(root,{notesFolder:root}),external=path.resolve(__dirname,'../../examples/lean-lesson-pack');h.folders.push([external]);await h.commands.get('mrw.addLeanLessonPack')();h.picks.push(items=>items.find(x=>x.pack.manifest.packId==='external.identity-proof'));const opened=await h.commands.get('mrw.studyLean4')();assert.equal(opened.packId,'external.identity-proof');assert.match(h.api.window.activeTextEditor.document.text,/identity_proof/);
 h.picks.push(items=>items[0],items=>items.find(x=>x.remove));await h.commands.get('mrw.manageLeanLessonPacks')();assert.deepEqual(h.global.get('mrw.leanLessonPacks.v1'),[]);await h.commands.get('mrw.resumeLeanStudy')();assert.equal(h.api.window.activeTextEditor.document.uri.fsPath,path.join(opened.root,'Example.lean'));
});
test('missing Lean leaves files readable with setup feedback; cancel/bad pack cannot overwrite work',async t=>{
 const root=await temporary(t),h=harness(root,{lean:false,notesFolder:root});const opened=await h.commands.get('mrw.studyLean4')();assert.match(h.messages[0],/optional official Lean/);assert.ok(opened.root);assert.equal(h.activation(),0);assert.ok(!h.calls.some(c=>c.name==='lean4.displayGoal'));
 const cancelled=harness(root);cancelled.picks.push(()=>undefined);await cancelled.commands.get('mrw.studyLean4')();assert.equal(cancelled.state.size,0);
 const bad=path.join(root,'bad');await fs.mkdir(bad);await fs.writeFile(path.join(bad,'pack.json'),'{}');h.folders.push([bad]);await assert.rejects(h.commands.get('mrw.addLeanLessonPack')(),/fields/);assert.ok(await fs.stat(path.join(opened.root,'Study/Examples.lean')));
});
test('manifest rejects hooks, traversal, wrong API, missing files and symlink redirects; occupied folders stay untouched',async t=>{
 const root=await temporary(t),pack=await loadPack(builtin);
 for(const bad of [{...pack.manifest,apiVersion:2},{...pack.manifest,hooks:['evil']},{...pack.manifest,notesTemplate:'../note.md'},{...pack.manifest,lessons:[pack.manifest.lessons[0],pack.manifest.lessons[0]]}])assert.throws(()=>validate(bad));
 const dir=path.join(root,'bad-pack');await fs.cp(builtin,dir,{recursive:true});await fs.unlink(path.join(dir,'Notes.md'));await fs.symlink(path.join(builtin,'Notes.md'),path.join(dir,'Notes.md'));await assert.rejects(loadPack(dir),/redirection/);
 const occupied=path.join(root,'Lean Study',pack.manifest.packId);await fs.mkdir(occupied,{recursive:true});await fs.writeFile(path.join(occupied,'personal.md'),'Preserve');await assert.rejects(workingCopy(pack,root));assert.equal(await fs.readFile(path.join(occupied,'personal.md'),'utf8'),'Preserve');
});

test('pack updates keep the original working content and cannot break its resume identity',async t=>{
 const root=await temporary(t),source=path.join(root,'external');await fs.cp(path.resolve(__dirname,'../../examples/lean-lesson-pack'),source,{recursive:true});const h=harness(root,{notesFolder:root});h.folders.push([source]);await h.commands.get('mrw.addLeanLessonPack')();h.picks.push(xs=>xs.find(x=>x.pack.manifest.packId==='external.identity-proof'));const first=await h.commands.get('mrw.studyLean4')();const original=await fs.readFile(path.join(first.root,'Example.lean'),'utf8');
 const manifest=JSON.parse(await fs.readFile(path.join(source,'pack.json'),'utf8'));manifest.contentVersion='2.0.0';await fs.writeFile(path.join(source,'Example.lean'),original+'\n-- New pack content\n');await fs.writeFile(path.join(source,'pack.json'),JSON.stringify(manifest));h.picks.push(xs=>xs.find(x=>x.pack.manifest.packId==='external.identity-proof'));await h.commands.get('mrw.studyLean4')();assert.equal(await fs.readFile(path.join(first.root,'Example.lean'),'utf8'),original);assert.equal(h.state.get('mrw.leanStudy.v1').contentVersion,'1.0.0');
 manifest.lessons[0].id='new-unit';await fs.writeFile(path.join(source,'pack.json'),JSON.stringify(manifest));h.picks.push(xs=>xs.find(x=>x.pack.manifest.packId==='external.identity-proof'));await assert.rejects(h.commands.get('mrw.studyLean4')(),/not in the retained working copy/);assert.equal(h.state.get('mrw.leanStudy.v1').lessonId,'identity-proof');await h.commands.get('mrw.resumeLeanStudy')();
});


test('three introductory lessons reopen their own prose and actions while preserving shared code and notes',async t=>{
 const root=await temporary(t),h=harness(root,{notesFolder:root});
 const expected=[['functions-and-proofs','01-functions-and-proofs.md','Functions.lean','FunctionMistake.lean'],['implication','02-implication.md','Implication.lean','ImplicationMistake.lean'],['dependent-application','03-dependent-application.md','Specialization.lean','SpecializationMistake.lean']];
 const pack=await loadPack(builtin);assert.deepEqual(pack.manifest.lessons.map(l=>l.id),expected.map(r=>r[0]));
 let opened;
 for(const [id,prose,exercise,mistake] of expected){
  h.picks.push(items=>items.find(i=>i.lesson?.id===id));opened=await h.commands.get('mrw.studyLean4')();
  assert.equal(opened.lessonId,id);assert.ok(h.docs.has(path.join(opened.root,'lessons',prose)));
  h.picks.push(items=>{assert.equal(items.filter(i=>i.label.startsWith('Try: ')).length,1);assert.equal(items.find(i=>i.label.startsWith('Try: ')).file,'Practice/'+exercise);assert.equal(items.find(i=>i.label.startsWith('Deliberate error: ')).file,'Practice/'+mistake);return undefined;});
  await h.commands.get('mrw.leanStudyActions')();
  if(id==='functions-and-proofs'){
   const doc=h.api.window.activeTextEditor.document;await h.change(doc,doc.text+'\n-- My ongoing Lean work\n');await fs.writeFile(doc.uri.fsPath,doc.text);
   await fs.writeFile(path.join(opened.root,'Notes.md'),'# My observation\nKeep this note.\n');
  }
  assert.match(h.api.window.activeTextEditor.document.text,/My ongoing Lean work/);
 }
 const next=harness(root,{state:h.state,extensionPath:'/removed-pack'});const resumed=await next.commands.get('mrw.resumeLeanStudy')();
 assert.equal(resumed.lessonId,'dependent-application');assert.ok(next.docs.has(path.join(opened.root,'lessons','03-dependent-application.md')));
 assert.match(next.api.window.activeTextEditor.document.text,/My ongoing Lean work/);assert.match(await fs.readFile(path.join(opened.root,'Notes.md'),'utf8'),/Keep this note/);
});
