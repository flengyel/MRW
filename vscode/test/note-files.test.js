'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {windowsNoteFiles}=require('../src/noteFiles');
const {DEFAULT_LIMITS}=require('../src/documentLinks');
const {noteIdentity}=require('../src/noteIdentity');

test('Windows filename enumeration passes only a selected root and fixed bounds to a shell-free process',async()=>{
  let invocation;
  const run=async(...args)=>{invocation=args;return JSON.stringify({paths:['ID.md','nested/ID.md'],complete:true,errors:[],entries:3,skipped:2})};
  const value=await windowsNoteFiles('/mnt/d/Research & notes',{remoteName:'wsl',limits:DEFAULT_LIMITS,run});
  assert.equal(value.complete,true);assert.deepEqual(value.paths,['/mnt/d/Research & notes/ID.md','/mnt/d/Research & notes/nested/ID.md']);
  assert.deepEqual(JSON.parse(invocation[2]),{root:'D:\\Research & notes',maxDepth:32,maxEntries:20000});
  assert.equal(invocation[1].includes('-EncodedCommand'),true);assert.equal(invocation[1].some(a=>a.includes('Research & notes')),false);
});
test('malformed and escaping catalogue paths fall back instead of authorizing a guessed note',async()=>{
  for(const relative of ['../secret.md','/outside.md','C:\\secret.md','safe/../../x.md','.obsidian/private.md','a//b.md','a.md\u0000']){
    const run=async()=>JSON.stringify({paths:[relative],complete:true,errors:[]});
    assert.equal(await windowsNoteFiles('/mnt/c/Notes',{remoteName:'wsl',limits:DEFAULT_LIMITS,run}),undefined,relative);
  }
  assert.equal(await windowsNoteFiles('/mnt/c/Notes',{remoteName:'wsl',limits:DEFAULT_LIMITS,run:async()=>{throw Error('unavailable')}}),undefined);
});
test('cancellation and incomplete catalogues remain distinct from completed empty results',async()=>{
  const options={remoteName:'wsl',limits:DEFAULT_LIMITS};
  const stopped=await windowsNoteFiles('/mnt/c/Notes',{...options,token:{isCancellationRequested:true},run:()=>assert.fail('cancelled process must not start')});
  assert.equal(stopped.complete,false);assert.equal(stopped.cancelled,true);
  const partial=await windowsNoteFiles('/mnt/c/Notes',{...options,run:async()=>JSON.stringify({paths:['one.md'],complete:false,errors:['entry limit']})});
  assert.equal(partial.complete,false);assert.equal(partial.paths.length,1);
  const empty=await windowsNoteFiles('/mnt/c/Notes',{...options,run:async()=>JSON.stringify({paths:[],complete:true,errors:[]})});
  assert.equal(empty.complete,true);assert.equal(empty.paths.length,0);
  assert.equal(await windowsNoteFiles('/home/user/notes',{...options,run:()=>assert.fail('native Windows worker is WSL mount specific')}),undefined);
});
test('YAML title presentation preserves filename identity and retains the full property',()=>{
  const doc={uri:{fsPath:'/notes/ID.md'},getText:()=> '---\nid: different-metadata\ntitle: ID Useful title\n---\n# Text\n'};
  assert.deepEqual(noteIdentity(doc),{filename:'ID.md',id:'ID',rawTitle:'ID Useful title',title:'Useful title',label:'Useful title · ID.md'});
  assert.equal(noteIdentity({...doc,getText:()=> '# No metadata\n'}).label,'ID.md');
});
