 'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto'),cp=require('node:child_process'),vm=require('node:vm');
const {createRequire}=require('node:module');
const guard=require('./host/fixtureGuard');
const uri=file=>({scheme:'file',fsPath:file,toString:()=>require('node:url').pathToFileURL(file).href});
async function fixture(t){
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-guard-'));t.after(()=>fs.rm(base,{recursive:true,force:true}));
 const root=path.join(base,'owned'),project=path.join(root,'project'),extension=path.join(root,'extension'),id=crypto.randomUUID(),profile='MRW-Fixture-'+id;
 await fs.mkdir(project,{recursive:true,mode:0o700});await fs.chmod(root,0o700);await fs.mkdir(extension);await fs.mkdir(path.join(root,'workspace-storage'));await fs.mkdir(path.join(root,'global-storage'));
 const user=path.join(base,'User'),global=path.join(user,'profiles','profile-id','globalStorage','flengyel.mrw'),storage=path.join(user,'workspaceStorage','workspace-id','flengyel.mrw');
 await fs.mkdir(global,{recursive:true});await fs.mkdir(storage,{recursive:true});await fs.mkdir(path.join(user,'globalStorage'));
 const put=(file,value)=>fs.writeFile(file,JSON.stringify(value));
 await put(path.join(user,'globalStorage/storage.json'),{userDataProfiles:[{name:profile,location:'profile-id'}]});
 const st=await fs.stat(root),marker={schema:'mrw.native-fixture',version:1,case:'isolation',id,root,extension,projects:[project],profile,device:String(st.dev),inode:String(st.ino)};
 await put(path.join(root,'.mrw-native-fixture.json'),marker);await put(path.join(extension,'host-fixture.json'),{root,id});
 const config={project,artifacts:root};await put(path.join(extension,'host-test.json'),config);
 const nativeWorkspace=new Map(),nativeGlobal=new Map();
 const mem=map=>({keys:()=>[...map.keys()],get:(key,d)=>map.has(key)?map.get(key):d,update:async(key,v)=>{if(v===undefined)map.delete(key);else map.set(key,v);}});
 const context={extensionPath:extension,extensionMode:2,storageUri:uri(storage),globalStorageUri:uri(global),workspaceState:mem(nativeWorkspace),globalState:mem(nativeGlobal)};
 const values={notesFolder:project},vscode={Uri:{file:uri},ExtensionMode:{Development:2,Test:3},workspace:{workspaceFolders:[{uri:uri(project)}],textDocuments:[],getConfiguration:()=>({get:(key,def)=>values[key]??def})},window:{tabGroups:{all:[]}}};
 return {base,root,project,extension,id,marker,context,vscode,put,config,values,storage,global,nativeWorkspace,nativeGlobal,
  check:()=>guard.isolateContext(vscode,context,extension).then(c=>guard.assertFixture(vscode,c,extension))};
}
test('declared fixture keeps native context/stores and pins restart identity',async t=>{
 const f=await fixture(t),result=await f.check();assert.notEqual(result.context,f.context);assert.equal(result.storage,path.join(f.root,'workspace-storage'));
 assert.equal(JSON.parse(await fs.readFile(path.join(f.root,'native-scope.json'))).id,f.id);
 await f.check();assert.equal(process.env.MRW_TEST_FIXTURE,path.join(f.root,'.mrw-native-fixture.json'));
});
test('missing receipt, mismatched inode and production mode refuse before scope publication',async t=>{
 for(const kind of ['missing','inode','production']){const f=await fixture(t);
  if(kind==='missing')await fs.unlink(path.join(f.extension,'host-fixture.json'));
  if(kind==='inode'){f.marker.inode='wrong';await f.put(path.join(f.root,'.mrw-native-fixture.json'),f.marker);}
  if(kind==='production')f.context.extensionMode=1;
  await assert.rejects(f.check());await assert.rejects(fs.stat(path.join(f.root,'native-scope.json')),/ENOENT/);
 }
});
test('a supplied working project and an unisolated native context are refused',async t=>{
 const f=await fixture(t),outside=path.join(f.base,'working');await fs.mkdir(outside);const sentinel=path.join(outside,'note.md');await fs.writeFile(sentinel,'Keep mathematical work.');
 f.vscode.workspace.workspaceFolders=[{uri:uri(outside)}];await assert.rejects(f.check(),/active workspace/);
 f.vscode.workspace.workspaceFolders=[{uri:uri(f.project)}];
 await assert.rejects(guard.assertFixture(f.vscode,f.context,f.extension),/unisolated native context/);assert.equal(await fs.readFile(sentinel,'utf8'),'Keep mathematical work.');
});
test('native user keys stay separate and only the owned prefix is updated',async t=>{
 const f=await fixture(t);f.nativeGlobal.set('existing-research',{text:'Keep this mathematical note.'});
 const result=await f.check();assert.deepEqual(result.context.globalState.keys(),[]);
 assert.equal(result.context.globalState.get('existing-research'),undefined);
 await result.context.globalState.update('test-result',42);
 assert.deepEqual(f.nativeGlobal.get('existing-research'),{text:'Keep this mathematical note.'});
 assert.equal(f.nativeGlobal.get('mrw.fixture.'+f.id+'.test-result'),42);
 assert.ok(guard.scopeInfo(result.context).writes.every(k=>k.startsWith('mrw.fixture.'+f.id+'.')));
 assert.throws(()=>result.context.globalState.setKeysForSync(['test-result']),/Settings Sync/);
 await guard.clearOwnedState(result.context);assert.deepEqual(result.context.globalState.keys(),[]);
 assert.deepEqual(f.nativeGlobal.get('existing-research'),{text:'Keep this mathematical note.'});
});
test('orphaned fixture-owned native state is not silently adopted',async t=>{
 const f=await fixture(t);f.nativeGlobal.set('mrw.fixture.'+f.id+'.old-result',1);await assert.rejects(f.check(),/already contains MRW state/);
});
test('symlinks, hardlinks and a redirected notes folder refuse without changing targets',async t=>{
 for(const kind of ['symlink','hardlink','notes']){const f=await fixture(t),outside=path.join(f.base,'real-note.md');await fs.writeFile(outside,'Keep this exact note.');
  if(kind==='symlink')await fs.symlink(outside,path.join(f.project,'linked.md'));
  if(kind==='hardlink')await fs.link(outside,path.join(f.project,'linked.md'));
  if(kind==='notes')f.values.notesFolder=f.base;
  await assert.rejects(f.check(),/redirected|shared|notesFolder/);assert.equal(await fs.readFile(outside,'utf8'),'Keep this exact note.');
 }
});
test('external config inputs, managed bindings and unverified companion mutations are refused',async t=>{
 for(const kind of ['config','windows','unc','binding','companion']){const f=await fixture(t);
  if(kind==='config'){f.config.note=path.join(f.base,'outside.md');await f.put(path.join(f.extension,'host-test.json'),f.config);}
  if(kind==='windows'||kind==='unc'){f.config.note=kind==='windows'?'C:'+String.fromCharCode(92)+'research.md':String.fromCharCode(92).repeat(2)+'server'+String.fromCharCode(92)+'vault';await f.put(path.join(f.extension,'host-test.json'),f.config);}
  if(kind==='binding'){await fs.mkdir(path.join(f.root,'workspace-storage/artifact-runtime'));await f.put(path.join(f.root,'workspace-storage/artifact-runtime/active-store.json'),{location:f.base});}
  if(kind==='companion'){f.config.vault='Working vault';await f.put(path.join(f.extension,'host-test.json'),f.config);}
  await assert.rejects(f.check(),/outside|leaves|companion mutation|Windows paths/);
 }
});
test('unsaved documents, external tabs and extra workspace folders are refused before body work',async t=>{
 for(const kind of ['dirty','tab','folders']){const f=await fixture(t);
  if(kind==='dirty')f.vscode.workspace.textDocuments=[{isDirty:true,uri:uri(path.join(f.project,'draft.md'))}];
  if(kind==='tab')f.vscode.window.tabGroups.all=[{tabs:[{input:{uri:uri(path.join(f.base,'outside.pdf'))}}]}];
  if(kind==='folders')f.vscode.workspace.workspaceFolders.push({uri:uri(f.base)});
  await assert.rejects(f.check(),/unsaved|external|exactly one/);await assert.rejects(fs.stat(path.join(f.root,'native-scope.json')),/ENOENT/);
 }
});
test('restart cannot redirect a pinned native store',async t=>{
 const f=await fixture(t);await f.check();f.context.storageUri=uri(path.join(f.base,'another-store'));await assert.rejects(f.check(),/stores differ/);
});
test('every native entry reaches the preflight barrier before activation, commands or writes',async()=>{
 const dir=path.join(__dirname,'host');let count=0;
 const entries=(await fs.readdir(dir)).filter(n=>n.endsWith('.js')&&n!=='fixtureGuard.js');
 assert.ok(entries.includes('atlas.js'));
 for(const file of entries){
  const filename=path.join(dir,file),req=createRequire(filename),module={exports:{}};let mutations=0,gates=0;
  const forbidden=()=>{mutations++;throw Error('Unexpected native test mutation');};
  const vscode={workspace:{workspaceFolders:[]},window:{},commands:{executeCommand:forbidden}};
  const barrier={protect(exports){for(const method of ['activate','run','check'])if(typeof exports[method]==='function')exports[method]=async()=>{gates++;throw Error('isolation gate sentinel');};return exports;}};
  const needs=name=>name==='vscode'?vscode:name==='./fixtureGuard'?barrier:name==='node:fs/promises'?new Proxy(req(name),{get:(owner,key)=>['writeFile','appendFile','mkdir','rm','unlink','rename','copyFile'].includes(key)?forbidden:owner[key]}):req(name);
  vm.runInNewContext('(function(require,module,__filename,__dirname){'+await fs.readFile(filename,'utf8')+'\n})',{console,process,Buffer,setTimeout,clearTimeout,setInterval,clearInterval})(needs,module,filename,dir);
  for(const method of ['activate','run','check'])if(typeof module.exports[method]==='function'){
   await assert.rejects(module.exports[method]({extensionPath:path.dirname(dir),extensionMode:2}),/isolation gate sentinel/);count++;
  }
  assert.equal(mutations,0,file);assert.ok(gates>0,file);
 }
 assert.equal(count,35);
});
test('both direct Python test bridges refuse unscoped and outside writes',async t=>{
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-bridge-guard-'));t.after(()=>fs.rm(base,{recursive:true,force:true}));
 const root=path.join(base,'owned'),project=path.join(root,'project'),artifacts=path.join(root,'reports');await fs.mkdir(project,{recursive:true,mode:0o700});await fs.chmod(root,0o700);await fs.mkdir(artifacts);
 const marker=path.join(root,'.mrw-bridge-fixture.json'),st=await fs.stat(root);await fs.writeFile(marker,JSON.stringify({schema:'mrw.bridge-fixture',version:1,id:crypto.randomUUID(),root,device:String(st.dev),inode:String(st.ino)}));
 for(const name of ['offline_outline_bridge.py','deterministic_bridge.py']){
  const argv=['-I',path.join(__dirname,'host',name),...(name.startsWith('deterministic')?[artifacts,'completed']:[])];
  const invoke=(request,scope)=>{const env={...process.env};delete env.MRW_TEST_FIXTURE;if(scope)env.MRW_TEST_FIXTURE=scope;return cp.spawnSync('python3',argv,{input:JSON.stringify({protocol:1,...request}),encoding:'utf8',env});};
  let p=invoke({method:'artifact_status',artifact_home:path.join(root,'private')});assert.equal(p.status,1);assert.match(JSON.parse(p.stdout).error,/explicit disposable fixture/);
  p=invoke({method:'artifact_status',artifact_home:path.join(base,'working')},marker);assert.equal(p.status,1);assert.match(JSON.parse(p.stdout).error,/outside its disposable fixture/);await assert.rejects(fs.stat(path.join(base,'working')),/ENOENT/);
  p=invoke({method:'artifact_status',artifact_home:path.join(root,'private')},marker);assert.equal(p.status,0,p.stdout+p.stderr);assert.equal(JSON.parse(p.stdout).ok,true);
  const runtime=path.join(root,'private/artifact-runtime');await fs.mkdir(runtime,{recursive:true});
  const journal=path.join(runtime,'transaction.json');await fs.writeFile(journal,JSON.stringify({operation:'move',binding_after:JSON.stringify({location:base})}));
  p=invoke({method:'artifact_recover',artifact_home:path.join(root,'private')},marker);assert.equal(p.status,1);assert.match(JSON.parse(p.stdout).error,/outside its disposable fixture/);await fs.unlink(journal);

 }
});
test('retired preparers cannot create or reuse supplied work',async t=>{
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-retired-'));t.after(()=>fs.rm(base,{recursive:true,force:true}));
 for(const name of ['prepare-host-tests.py','prepare-reading-host.py','prepare-overview-host.py','prepare-diagram-host.py']){
  const p=cp.spawnSync('python3',[path.join(__dirname,'../scripts',name),'--artifacts',base,'--project',base],{encoding:'utf8'});assert.equal(p.status,1);assert.match(p.stderr,/not changed/);
 }
 assert.deepEqual(await fs.readdir(base),[]);
});

test('a recovery journal cannot redirect cleanup outside the fixture',async t=>{
 const f=await fixture(t),runtime=path.join(f.root,'workspace-storage/artifact-runtime');await fs.mkdir(runtime);
 for(const destination of [f.base,'../working']){
  await f.put(path.join(runtime,'transaction.json'),{operation:'move',destination,binding_after:JSON.stringify({location:destination})});
  await assert.rejects(f.check(),/control metadata target leaves fixture/);
 }
});

test('obsolete or undeclared native cases cannot use another fixture receipt',async t=>{
 const f=await fixture(t);f.marker.case='documentLearning';await f.put(path.join(f.root,'.mrw-native-fixture.json'),f.marker);
 await assert.rejects(f.check(),/older native case/);
});

test('preparation cannot put a test note in a working output directory',async t=>{
 const f=await fixture(t),outside=path.join('/tmp','mrw-not-a-fixture-'+f.id);
 const p=cp.spawnSync('python3',[path.join(__dirname,'../scripts/prepare-native-host.py'),'--case','isolation','--parent',outside],{encoding:'utf8'});
 assert.equal(p.status,1);assert.match(p.stderr,/under ~\/.cache/);await assert.rejects(fs.stat(outside),/ENOENT/);
});

test('source Return preparation stages a fresh scoped case without granting external targets',async t=>{
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'mrw-return-staging-'));t.after(()=>fs.rm(base,{recursive:true,force:true}));
 const home=path.join(base,'home');await fs.mkdir(home);
 const result=cp.spawnSync('python3',[path.resolve(__dirname,'../scripts/prepare-native-host.py'),'--case','sourceReturn'],{encoding:'utf8',env:{...process.env,HOME:home}});
 assert.equal(result.status,0,result.stderr);const launch=JSON.parse(result.stdout);
 assert.ok(launch.root.startsWith(path.join(home,'.cache/mrw-native-tests')+path.sep));
 const marker=await guard.receipt(launch.extension);assert.equal(marker.case,'sourceReturn');
 assert.ok(launch.arguments.includes('--new-window'));assert.ok(launch.arguments.includes('--profile'));
 assert.equal(JSON.parse(await fs.readFile(path.join(launch.extension,'package.json'))).main,'./test/host/sourceReturn.js');
});

test('native checker allowance is case-specific, path-pinned and content-verified',async t=>{
 for(const kind of ['correct','case','path','hash']){
  const f=await fixture(t),bytes=Buffer.from('owned checker fixture');
  const engine={executable_sha256:crypto.createHash('sha256').update(bytes).digest('hex'),sources:{}};
  const key=crypto.createHash('sha256').update(JSON.stringify(engine)).digest('hex');
  const relative=path.join('global-storage','justification-checkers','route-'+key,'.lake/routes-build/bin/route_search');
  const binary=path.join(f.root,relative);await fs.mkdir(path.dirname(binary),{recursive:true});await fs.writeFile(binary,kind==='hash'?'changed':bytes);
  const registry=path.join(f.extension,'python/mrw/data/route_runtime.json');await fs.mkdir(path.dirname(registry),{recursive:true});await f.put(registry,{current:'fixture',engines:{fixture:engine}});
  f.marker.case=kind==='case'?'isolation':'justification';f.marker.runtimeFile=kind==='path'?'outside-checker':relative;
  await f.put(path.join(f.root,'.mrw-native-fixture.json'),f.marker);
  if(kind==='correct')await f.check();else await assert.rejects(f.check(),/grant|hash/);
 }
});
