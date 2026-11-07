'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {createNoteRefresh}=require('../src/noteRefresh');
async function fixture(t){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-note-refresh-')),file=path.join(directory,'note.md');await fs.writeFile(file,'Saved external text.\n');t.after(()=>fs.rm(directory,{recursive:true,force:true}));
 const uri={scheme:'file',fsPath:file,path:file,toString:()=>`file:${file}`};
 const doc={uri,version:1,isDirty:false,isClosed:false,text:'Previous text.\n',getText(){return this.text}};
 const calls=[],context={subscriptions:[]},input={uri,viewType:'vscode.markdown.preview.editor'};
 let onOpen=async()=>{doc.text=await fs.readFile(file,'utf8');doc.version++},scope=async()=>{};
 const vscode={workspace:{isTrusted:true,textDocuments:[doc]},window:{state:{focused:true},tabGroups:{activeTabGroup:{viewColumn:2,activeTab:{input}}}},extensions:{getExtension:()=>({packageJSON:{contributes:{customEditors:[{viewType:'vscode.markdown.preview.editor'}]}}})},commands:{async executeCommand(name,...args){calls.push({name,args});if(name==='_workbench.openWith'){vscode.window.tabGroups.activeTabGroup.activeTab.input={uri,viewType:'default'};await onOpen()}}}};
 const refresh=createNoteRefresh({vscode,context,check:(...args)=>scope(...args),isNote:value=>value===uri});t.after(()=>context.subscriptions.forEach(s=>s.dispose()));
 return {file,doc,uri,input,calls,vscode,refresh,setOpen:fn=>{onOpen=fn},setScope:fn=>{scope=fn}};
}
test('a displayed clean note re-resolves its explicit file and restores the same preview group without writing it',async t=>{
 const h=await fixture(t),before=await fs.readFile(h.file);
 assert.equal(await h.refresh.refresh(),true);assert.equal(h.doc.getText(),'Saved external text.\n');assert.equal(h.doc.isDirty,false);
 assert.deepEqual(h.calls.map(c=>c.name),['_workbench.openWith','vscode.openWith']);
 assert.equal(h.calls[0].args[0],h.uri);assert.deepEqual(h.calls[0].args[2],[1,{forceReload:true,preserveFocus:true,pinned:true}]);
 assert.equal(h.calls[1].args[2].viewColumn,2);assert.deepEqual(await fs.readFile(h.file),before);
});
test('dirty text and an unfocused VS Code window cause no editor operations',async t=>{
 const h=await fixture(t);h.doc.isDirty=true;h.doc.text='Unsent work.\n';assert.equal(await h.refresh.refresh(),false);assert.equal(h.calls.length,0);assert.equal(h.doc.getText(),'Unsent work.\n');
 h.doc.isDirty=false;h.vscode.window.state.focused=false;assert.equal(await h.refresh.refresh(),false);assert.equal(h.calls.length,0);
});
test('changing notes while the disk check is pending never changes the new view',async t=>{
 const h=await fixture(t);let release;h.setScope(()=>new Promise(resolve=>{release=resolve}));const pending=h.refresh.refresh();
 h.vscode.window.tabGroups.activeTabGroup.activeTab.input={uri:{scheme:'file',fsPath:'/different.md',toString:()=>'/different.md'},viewType:'default'};release();assert.equal(await pending,false);assert.equal(h.calls.length,0);
});
test('typing after refresh is requested retains the native dirty buffer and supplies no replacement content',async t=>{
 const h=await fixture(t);h.setOpen(async()=>{h.doc.isDirty=true;h.doc.text='Typed during file resolution.\n';h.doc.version++});
 assert.equal(await h.refresh.refresh(),false);assert.equal(h.doc.getText(),'Typed during file resolution.\n');assert.equal(h.doc.isDirty,true);
 assert.equal(h.calls.some(c=>/save|revert/i.test(c.name)),false);assert.equal(h.calls[0].args[2][1].contents,undefined);assert.equal(await fs.readFile(h.file,'utf8'),'Saved external text.\n');
});
