'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {sourceLifecycle}=require('../src/sourceLifecycle');
function harness(){
 const calls=[],messages=[],commands=new Map(),state={dirty:false,confirmation:'Move to Trash',undo:undefined,blocked:false};
 const row={id:'saved',title:'Exact source',outline_revision:'outline-revision',lifecycle:{state:'active',revision:null}};
 const c={store:'/private',root:'/workspace',result:{revision:row.outline_revision,lifecycle:row.lifecycle,outline:{id:row.id,source:{bibliography:{title:row.title}}}},panel:{webview:{postMessage:async m=>messages.push(m)}}};
 const vscode={window:{showQuickPick:async rows=>{state.rows=rows;return state.pick?.(rows);},showWarningMessage:async(_text,options)=>{state.scope=options.detail;return state.confirmation;},showInformationMessage:async(_text,...options)=>options.includes('Undo')?state.undo:undefined,setStatusBarMessage:()=>{},showErrorMessage:m=>messages.push({error:m})}};
 const api=sourceLifecycle({vscode,panels:new Map([['saved',c]]),
  bridge:async req=>{calls.push(req);if(state.error)throw state.error;if(state.failed)return {blocked:true,write_error:'disk full'};if(req.method==='outline_trash_list'||req.method==='outline_list')return {outlines:[row]};return {id:'saved',lifecycle:{state:req.method==='outline_trash'?'trash':'active',revision:'new-status'}};},
  writable:()=>{if(state.blocked)throw Error('writes blocked');},block:()=>{state.blocked=true;},refresh:async()=>{state.refreshed=(state.refreshed||0)+1;},freeze:async()=>state.dirty,storage:async()=>({store:c.store,root:c.root}),register:(id,f)=>commands.set(id,f),locked:async f=>{state.locks=(state.locks||0)+1;return f();},choice:r=>({id:r.id,label:r.title})});
 return {api,c,calls,messages,state,commands};
}
test('Delete confirms MRW-only scope and preserves the open reader',async()=>{
 const h=harness();await h.api.trash(h.c);assert.equal(h.calls.length,1);assert.equal(h.calls[0].method,'outline_trash');assert.equal(h.calls[0].status_revision,null);
 assert.match(h.state.scope,/reader notes, diagrams and links are kept/);assert.match(h.state.scope,/Original files, vault notes, other sources and studies are unchanged/);
 assert.equal(h.state.refreshed,1);assert.deepEqual(h.messages,[{type:'storageRelease'}]);
});
test('dirty drafts and cancellation never publish or close a reader',async()=>{
 const h=harness();h.state.dirty=true;await assert.rejects(h.api.trash(h.c),/draft is kept/);assert.equal(h.calls.length,0);
 h.state.dirty=false;h.state.confirmation=undefined;await h.api.trash(h.c);assert.equal(h.calls.length,0);assert.equal(h.messages.length,2);
});
test('failed and uncertain writes block further edits and retain the reader',async()=>{
 for(const failure of ['blocked','uncertain']){const h=harness();if(failure==='blocked')h.state.failed=true;else h.state.error=Error('transport lost');
  await assert.rejects(h.api.trash(h.c));assert.equal(h.state.blocked,true);assert.equal(h.state.refreshed,undefined);assert.equal(h.messages[0].type,'storageRelease');}
});
test('a known stale rejection leaves the existing reader and drafts available',async()=>{
 const h=harness();h.state.error=Object.assign(Error('status changed'),{code:'ACTION_REJECTED'});await assert.rejects(h.api.trash(h.c),/status changed/);
 assert.equal(h.state.blocked,false);assert.equal(h.messages[0].type,'storageRelease');
});
test('Undo uses the committed transition token and a new action lock',async()=>{
 const h=harness();h.state.undo='Undo';await h.api.trash(h.c);await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(h.calls.map(x=>x.method),['outline_trash','outline_restore']);assert.equal(h.calls[1].status_revision,'new-status');assert.equal(h.state.locks,1);
});
test('Restore selects only Trash and preserves scope and revision',async()=>{
 const h=harness();h.state.pick=rows=>rows[0];await h.commands.get('mrw.restoreSavedSource')();
 assert.deepEqual(h.calls.map(x=>x.method),['outline_trash_list','outline_restore']);assert.equal(h.calls[1].revision,'outline-revision');assert.equal(h.calls[1].project_root,'/workspace');
});
test('dismissed Undo notification never holds the reader frozen',async()=>{
 const h=harness();let notificationResolve;h.state.undo=new Promise(r=>{notificationResolve=r;});await h.api.trash(h.c);
 assert.deepEqual(h.messages,[{type:'storageRelease'}]);assert.equal(h.calls.length,1);notificationResolve(undefined);
});
test('Sources opens and restores saved sources, with deletion searchable in the Palette',()=>{
 const {GROUPS}=require('../src/companionTools'),manifest=require('../package.json');
 assert.ok(GROUPS.sourceTools.some(row=>row[1]==='openOutline'));
 assert.ok(GROUPS.sourceTools.some(row=>row[1]==='restoreSavedSource'));
 assert.equal(GROUPS.sourceTools.some(row=>row[1]==='deleteSavedSource'),false);
 for(const id of ['deleteSavedSource','restoreSavedSource']) {
  assert.ok(manifest.contributes.commands.some(command=>command.command==='mrw.'+id));
 }
});

test('a same-ID reader in another scope is never updated or trashed',async()=>{
 const h=harness();h.c.root='/other-workspace';
 await assert.rejects(h.commands.get('mrw.restoreSavedSource')().then(()=>h.api.trash({...h.c,root:'/workspace'})),/scope/);
 assert.equal(h.calls.filter(c=>c.method==='outline_trash'||c.method==='outline_restore').length,0);
});
