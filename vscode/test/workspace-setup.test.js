'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {prepareWorkspace,pythonStatus,registerWorkspaceSetup}=require('../src/workspaceSetup');
async function fixture(t){const home=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-setup-test-'));t.after(()=>fs.rm(home,{recursive:true,force:true}));return home;}
function fakeIO(overrides={}){return {...fs,...overrides};}
test('repeat setup preserves settings, README, notes and unrelated files byte-for-byte',async t=>{
 const home=await fixture(t),notesFolder=path.join(home,'vault');await fs.mkdir(notesFolder);await fs.writeFile(path.join(notesFolder,'note.md'),'# My work\n');
 const first=await prepareWorkspace({home,notesFolder});assert.equal(first.created,true);const config=JSON.parse(await fs.readFile(first.workspace,'utf8'));
 assert.deepEqual(config.folders,[{name:'MRW',path:'.'}]);assert.equal(config.settings['mrw.notesFolder'],notesFolder);assert.equal(config.settings['mrw.leanStudyParent'],first.directory);
 const customized='// Keep my comments and settings\n'+JSON.stringify({...config,settings:{'editor.fontSize':19}});
 await fs.writeFile(first.workspace,customized);const readme=path.join(first.directory,'README.md');await fs.writeFile(readme,'My workspace instructions');
 const second=await prepareWorkspace({home,notesFolder:'/a/different/vault'});assert.equal(second.created,false);assert.equal(second.workspace,first.workspace);
 assert.equal(await fs.readFile(first.workspace,'utf8'),customized);assert.equal(await fs.readFile(readme,'utf8'),'My workspace instructions');assert.equal(await fs.readFile(path.join(notesFolder,'note.md'),'utf8'),'# My work\n');
 assert.deepEqual((await fs.readdir(first.directory)).sort(),['MRW.code-workspace','README.md']);
});
test('simultaneous setup publishes one complete workspace without replacing the winner',async t=>{
 const home=await fixture(t);const both=await Promise.all([prepareWorkspace({home,notesFolder:'/vault/a'}),prepareWorkspace({home,notesFolder:'/vault/b'})]);
 assert.equal(both.filter(x=>x.created).length,1);const winner=both.find(x=>x.created);assert.equal(JSON.parse(await fs.readFile(winner.workspace,'utf8')).settings['mrw.notesFolder'],winner.notesFolder);
 assert.equal((await fs.stat(winner.workspace)).mode&0o777,0o600);assert.equal((await fs.readdir(winner.directory)).length,2);
});
test('failure before publication leaves no partial workspace; retry completes',async t=>{
 const home=await fixture(t);await assert.rejects(prepareWorkspace({home,io:fakeIO({link:async()=>{throw Error('injected write failure');}})}),/injected/);
 assert.deepEqual(await fs.readdir(path.join(home,'mrw-work')),[]);assert.equal((await prepareWorkspace({home})).created,true);
});
test('interruption after workspace publication preserves it and retry finishes README',async t=>{
 const home=await fixture(t);let links=0;
 await assert.rejects(prepareWorkspace({home,io:fakeIO({link:async(...a)=>{if(++links===2)throw Error('README interrupted');return fs.link(...a);}})}),/interrupted/);
 const file=path.join(home,'mrw-work/MRW.code-workspace'),saved=await fs.readFile(file);await prepareWorkspace({home,notesFolder:'/changed'});assert.deepEqual(await fs.readFile(file),saved);await fs.access(path.join(home,'mrw-work/README.md'));
});
test('retry synchronizes existing files after a directory durability failure',async t=>{
 const home=await fixture(t);let fail=true,attempts=0;const io=fakeIO({open:async(file,...a)=>{const h=await fs.open(file,...a);if(file===path.join(home,'mrw-work')){const sync=h.sync.bind(h);h.sync=async()=>{attempts++;if(fail)throw Error('directory sync failed');return sync();};}return h;}});
 await assert.rejects(prepareWorkspace({home,io}),/sync failed/);fail=false;await prepareWorkspace({home,io});const count=attempts;await prepareWorkspace({home,io});assert.ok(attempts>count);
});
test('reject redirected paths, occupied files, non-Linux host and Windows mount without overwriting',async t=>{
 const home=await fixture(t),elsewhere=await fixture(t),dir=path.join(home,'mrw-work');
 await assert.rejects(prepareWorkspace({home,platform:'win32'}),/WSL/);
 await assert.rejects(prepareWorkspace({home,io:fakeIO({statfs:async()=>({type:0x9fa0})})}),/Windows/);
 await assert.rejects(fs.access(dir));await fs.symlink(elsewhere,dir);await assert.rejects(prepareWorkspace({home}),/redirected/);assert.deepEqual(await fs.readdir(elsewhere),[]);await fs.unlink(dir);await fs.mkdir(dir);
 await fs.mkdir(path.join(dir,'MRW.code-workspace'));await assert.rejects(prepareWorkspace({home}),/will not replace/);await fs.rmdir(path.join(dir,'MRW.code-workspace'));
 await fs.symlink(path.join(elsewhere,'notes'),path.join(dir,'README.md'));await assert.rejects(prepareWorkspace({home}),/will not replace/);await assert.rejects(fs.access(path.join(elsewhere,'notes')));
});
test('a separate Windows mount at the default directory is rejected',async t=>{
 const home=await fixture(t);await assert.rejects(prepareWorkspace({home,io:fakeIO({statfs:async p=>({type:p===home?0xef53:0x9fa0})})}),/Linux filesystem/);assert.deepEqual(await fs.readdir(path.join(home,'mrw-work')),[]);
});
test('Python prerequisite check handles missing, old and supported interpreters without a shell',async()=>{
 for(const [version,ok] of [['3.10.9',false],['3.11.0',true],['3.13.5',true]])assert.equal((await pythonStatus('/a path/python3',async(exe,args,opts)=>{assert.equal(exe,'/a path/python3');assert.deepEqual(args,['--version']);assert.equal(opts.timeout,5000);assert.equal(opts.shell,undefined);return {stdout:'Python '+version+'\n',stderr:''};})).ok,ok);
 assert.equal((await pythonStatus('absent',async()=>{throw Error('missing');})).ok,false);
});
function host(choice){const commands=new Map(),calls=[],messages=[];let prepares=0;const vscode={workspace:{getConfiguration:()=>({get:(_key,f)=>f}),textDocuments:[{isDirty:true}]},window:{async showInformationMessage(message,...buttons){messages.push({message,buttons});return choice;}},Uri:{file:fsPath=>({scheme:'file',fsPath}),parse:s=>s},env:{async openExternal(u){calls.push(['guide',u]);}},commands:{async executeCommand(...a){calls.push(a);}}};
 registerWorkspaceSetup({vscode,register:(id,fn)=>commands.set(id,fn),prepare:async()=>{prepares++;return {directory:'/home/user/mrw-work',workspace:'/home/user/mrw-work/MRW.code-workspace',created:true};},checkPython:async()=>({ok:true,text:'Python 3.13.5'})});return {vscode,commands,calls,messages,prepares:()=>prepares};}
test('activation creates nothing; dismissal preserves the current window; duplicate invocations share preparation',async()=>{
 const h=host(undefined);assert.equal(h.prepares(),0);const action=h.commands.get('mrw.setupWorkspace');await Promise.all([action(),action()]);assert.equal(h.prepares(),1);assert.deepEqual(h.calls,[]);assert.match(h.messages[0].message,/remain in their original workspace/);
});
test('only explicit opening creates a new window and never closes dirty work',async()=>{
 const h=host('Open in new window');await h.commands.get('mrw.setupWorkspace')();assert.deepEqual(h.calls,[['vscode.openFolder',{scheme:'file',fsPath:'/home/user/mrw-work/MRW.code-workspace'},{forceNewWindow:true}]]);assert.equal(h.vscode.workspace.textDocuments[0].isDirty,true);
 const guide=host('Setup guide');await guide.commands.get('mrw.setupWorkspace')();assert.equal(guide.calls[0][0],'guide');assert.equal(guide.calls.length,1);
});
test('rerunning setup in the default workspace offers no duplicate window',async t=>{
 const home=await fixture(t),result=await prepareWorkspace({home}),commands=new Map();let buttons;
 const vscode={workspace:{workspaceFile:{scheme:'file',fsPath:result.workspace},getConfiguration:()=>({get:(_k,f)=>f})},window:{async showInformationMessage(_m,...b){buttons=b;}},commands:{executeCommand(){assert.fail('must not reopen');}}};
 registerWorkspaceSetup({vscode,register:(n,f)=>commands.set(n,f),prepare:async()=>result,checkPython:async()=>({text:'Python 3.13.5'})});await commands.get('mrw.setupWorkspace')();assert.deepEqual(buttons,['Setup guide']);
});
