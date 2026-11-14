'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {snapshot,conflicts,dependencies,validateZettel,availability,createContinuation}=require('../src/annotationContinuation');
const {digest}=require('../src/navigation');
const {parseExternal}=require('../src/companionLinks');
async function fixture(t){
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-continuation-')); t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const file='Note α 😀.md', target=path.join(root,file);await fs.writeFile(target,'Earlier prose.\n');
  const destination={root,file,url:null,label:file};
  const values={notesFolder:root}, picks=[], clipboard=[], messages=[], actions=[], opened=[];
  const vscode={workspace:{isTrusted:true,textDocuments:[],getConfiguration:()=>({get:(k,d)=>values[k]??d}),openTextDocument:async u=>u},
    env:{uriScheme:'vscode',openExternal:async u=>{opened.push(u);return true;},clipboard:{writeText:async text=>clipboard.push(text)}},
    Uri:{file:p=>({scheme:'file',fsPath:p}),from:o=>o},
    window:{showQuickPick:async()=>picks.shift(),showOpenDialog:async()=>[{fsPath:target}],showWarningMessage:async()=>true,showInformationMessage:async text=>{messages.push(text);return true;},setStatusBarMessage:text=>messages.push(text),showTextDocument:async d=>opened.push(d)}};
  return {root,file,target,destination,vscode,values,picks,clipboard,messages,actions,opened};
}
test('saved snapshots preserve Unicode bytes, reject dirty buffers, traversal and symlink redirects',async t=>{
  const f=await fixture(t); const content='α😀\r\n$$ x \\times_Y X $$\r\n```tikz\n\\draw (0,0)--(1,1);\n```';await fs.writeFile(f.target,content);
  const read=await snapshot(f.vscode,f.destination);assert.equal(read.text,content);assert.equal(read.revision,digest(Buffer.from(content)));
  f.vscode.workspace.textDocuments=[{uri:{scheme:'file',fsPath:f.target},isDirty:true}];
  await assert.rejects(snapshot(f.vscode,f.destination),/unsaved/); f.vscode.workspace.textDocuments=[];
  await assert.rejects(snapshot(f.vscode,{...f.destination,file:'../Elsewhere.md'}),/target|ENOENT/);
  const other=path.join(f.root,'Other.md');await fs.writeFile(other,'separate');await fs.unlink(f.target);await fs.symlink(other,f.target);
  await assert.rejects(snapshot(f.vscode,f.destination),/redirected/);
});
test('heading conflicts ignore fences and identify Setext H1 and reserved sections; dependencies stay explicit',()=>{
  assert.equal(conflicts('```tikz\n# inside code\n```\n\n# Annotation\n\n## SEE ALSO').length,2);
  assert.equal(conflicts('Heading\n=======\n').length,1);
  assert.equal(conflicts('## An ordinary subheading\n').length,0);
  assert.ok(dependencies('[x](../source.md) $\\hom(X,Y)$\n```tikz\n\\draw;\n```').includes('../source.md'));
});
test('format validation invokes only the selected existing tool on one note; failure remains explicit',async t=>{
  const f=await fixture(t);const tool=path.join(f.root,'chosen_validator.py');await fs.writeFile(tool,'# fixture');f.values.zettelValidator=tool;
  const selected=await snapshot(f.vscode,f.destination);let calls=0;
  const receipt=await validateZettel(f.vscode,selected,async(executable,args)=>{calls++;assert.equal(executable,'python3');assert.deepEqual(args.slice(1),[tool,f.target]);assert.ok(args[0].endsWith('zettel-validation.py'));return {stdout:JSON.stringify({valid:true,section:'Research'})};});
  assert.equal(calls,1);assert.equal(receipt.revision,digest('# fixture'));
  await assert.rejects(validateZettel(f.vscode,selected,async()=>{throw Object.assign(Error('exit 1'),{stdout:'missing_index_link'});}),/missing_index_link/);
  f.vscode.workspace.isTrusted=false;await assert.rejects(validateZettel(f.vscode,selected),/Trust/);
});
test('prepare uses explicit file selection and exact return reference; no file write or inferred name',async t=>{
  const f=await fixture(t);const before=await fs.readFile(f.target);const annotation={id:'note',text:'$x=x$',kind:'explanation',provenance:{}};
  const c={root:f.root,store:'private',result:{revision:'source-state',outline:{id:'outline',annotations:[],regions:[{id:'passage',annotations:[annotation]}]}},notes:{revision:null,links:[]}};
  f.picks.push('Choose an existing note…',{value:'markdown'},undefined);
  const reference='mrw-outline:v1/'+'1'.repeat(64)+'/outline/'+'2'.repeat(64)+'/passage/1.0-1.3';
  const controller=createContinuation({vscode:f.vscode,bridge:async req=>{assert.equal(req.method,'outline_reference');assert.equal(req.region,'passage');return {reference};},publish:async(_,change)=>{
    f.actions.push(change);c.notes.continuations=[{annotation:'note',phase:'pending',destination:change.data.destination,policy:'markdown'}];
  }});
  await controller.manage(c,{annotation:'note'});
  assert.equal(f.actions.length,1);assert.equal(f.actions[0].operation,'prepare');assert.equal(f.actions[0].data.destination_revision,digest(before));
  assert.equal(parseExternal(f.actions[0].data.return_link).reference,reference);
  assert.deepEqual(await fs.readFile(f.target),before);assert.deepEqual(await fs.readdir(f.root),[f.file]);
});
test('pending resumes without creating another note; saved chunks cannot be copied twice; verification rechecks revision',async t=>{
  const f=await fixture(t);let creations=0;
  const record={annotation:'note',phase:'pending',destination:f.destination,policy:'markdown',body:'\n\nExact text\n\n',research:'\n\nAttribution and return\n\n'};
  const c={root:f.root,result:{revision:'old',outline:{id:'outline',annotations:[{id:'note',text:'Exact text'}],regions:[]}},notes:{continuations:[record]}};
  const controller=createContinuation({vscode:f.vscode,createNote:async()=>creations++,publish:async(_,change)=>f.actions.push(change)});
  f.picks.push({action:'body'});await controller.manage(c,{annotation:'note'});assert.equal(f.clipboard[0],record.body);assert.equal(creations,0);
  await fs.appendFile(f.target,record.body+record.research);
  f.picks.push({action:'body'});await assert.rejects(controller.manage(c,{annotation:'note'}),/already saved/);assert.equal(f.clipboard.length,1);
  f.picks.push({action:'verify'});await controller.manage(c,{annotation:'note'});assert.equal(f.actions[0].operation,'complete');assert.equal(f.actions[0].data.validation,null);
  await assert.rejects(controller.manage(c,{annotation:'note',unsaved:true}),/unsaved/);
});
test('missing/unlinked destinations are visible and never guessed or opened; unlink preserves the file',async t=>{
  const f=await fixture(t);const record={annotation:'note',phase:'complete',destination:f.destination};
  await fs.rename(f.target,path.join(f.root,'Renamed.md'));
  assert.match((await availability(f.vscode,[record])).note,/missing or renamed/);
  const c={root:f.root,result:{outline:{annotations:[{id:'note',text:'Original'}],regions:[]}},notes:{continuations:[record]}};
  const controller=createContinuation({vscode:f.vscode,publish:async(_,change)=>f.actions.push(change)});
  await assert.rejects(controller.manage(c,{annotation:'note',action:'open'}),/ENOENT/);assert.equal(f.opened.length,0);
  record.phase='unlinked';assert.match((await availability(f.vscode,[record])).note,/Link removed/);
  f.picks.push({action:'unlink'});await controller.manage(c,{annotation:'note'});
  assert.equal(f.actions[0].operation,'unlink');assert.equal(await fs.readFile(path.join(f.root,'Renamed.md'),'utf8'),'Earlier prose.\n');
});
