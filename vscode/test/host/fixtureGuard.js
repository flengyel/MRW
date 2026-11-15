// Test-only preflight. It never changes settings, storage bindings or user data.
'use strict';
const fs=require('node:fs/promises'),path=require('node:path');
const UUID=/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/;
let verified;
const contexts=new WeakMap();
const inside=(root,file)=>{const rel=path.relative(root,file);return rel==='' || (!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep));};
function fail(message){throw Error('MRW native fixture refused: '+message);}
async function canonical(value){
 if(typeof value!=='string'||!path.isAbsolute(value)||value.includes('\0')||path.normalize(value)!==value)fail('a canonical absolute fixture path is required');
 let p=value;
 for(;;){try{if(await fs.realpath(p)!==p)fail('redirected fixture path');break;}catch(e){if(e.code!=='ENOENT')throw e;const parent=path.dirname(p);if(parent===p)throw e;p=parent;}}
 return value;
}
async function json(file,limit=32768){
 const st=await fs.lstat(file);if(!st.isFile()||st.isSymbolicLink()||st.nlink!==1||st.size>limit)fail('invalid fixture metadata');
 const handle=await fs.open(file,require('node:fs').constants.O_RDONLY|require('node:fs').constants.O_NOFOLLOW);
 try{const current=await handle.stat();if(current.ino!==st.ino||current.dev!==st.dev)fail('fixture metadata changed');const raw=await handle.readFile();if(raw.length>limit)fail('fixture metadata grew');return JSON.parse(raw.toString('utf8'));}finally{await handle.close();}
}
async function receipt(extension){
 extension=await canonical(extension);
 const pointer=await json(path.join(extension,'host-fixture.json'));
 if(!UUID.test(pointer.id))fail('missing fixture identity');
 const root=await canonical(pointer.root),marker=await json(path.join(root,'.mrw-native-fixture.json'));
 const stat=await fs.stat(root);
 if(marker.schema!=='mrw.native-fixture'||marker.version!==1||marker.id!==pointer.id||marker.root!==root
  ||marker.device!==String(stat.dev)||marker.inode!==String(stat.ino)||marker.profile!=='MRW-Fixture-'+pointer.id
  ||marker.extension!==extension||!inside(root,extension)||extension===root)fail('fixture ownership differs');
 if(typeof process.getuid==='function'&&(stat.uid!==process.getuid()||(stat.mode&0o077)!==0))fail('fixture root must be private and owned by this user');
 if(!['isolation','sourceTrash','activation','sourceReturn','warrantInspection','justification'].includes(marker.case))fail('this older native case needs explicit fixture/UI migration');
 if(!Array.isArray(marker.projects)||!marker.projects.length||marker.projects.length>4)fail('invalid fixture projects');
 for(const project of marker.projects)if(!inside(root,await canonical(project))||project===root)fail('project leaves disposable root');
 return marker;
}
function stable(value){if(Array.isArray(value))return value.map(stable);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>[k,stable(v)]));return value;}
async function tree(root,marker){
 let runtime,expected,count=0,bytes=0,seenRuntime=false;
 if(marker?.runtimeFile){
  if(marker.case!=='justification')fail('checker runtime grant belongs only to the justification case');
  const registry=await json(path.join(marker.extension,'python/mrw/data/route_runtime.json'));
  const engine=registry.engines[registry.current],crypto=require('node:crypto');
  const key=crypto.createHash('sha256').update(JSON.stringify(stable(engine))).digest('hex');
  expected=path.join(root,'global-storage','justification-checkers','route-'+key,'.lake/routes-build/bin/route_search');
  runtime=path.join(root,marker.runtimeFile);
  if(runtime!==expected||!inside(root,runtime))fail('runtime grant differs from the pinned private checker');
 }
 async function walk(dir){for(const name of await fs.readdir(dir)){
  if(name==='.git'||name==='.aws'||name==='.codex')fail('working repository or private account directory in fixture');
  const p=path.join(dir,name),st=await fs.lstat(p);
  if(++count>5000)fail('fixture exceeds its inspection budget');
  if(st.isSymbolicLink()||(!st.isDirectory()&&(!st.isFile()||st.nlink!==1)))fail('redirected or shared fixture file');
  if(p===runtime){
   if(!st.isFile()||st.size>256*1024*1024)fail('invalid pinned checker size');
   const registry=await json(path.join(marker.extension,'python/mrw/data/route_runtime.json'));
   const handle=await fs.open(p,'r'),hash=require('node:crypto').createHash('sha256');
   try{const block=Buffer.alloc(65536);for(;;){const {bytesRead}=await handle.read(block,0,block.length,null);if(!bytesRead)break;hash.update(block.subarray(0,bytesRead));}
    const after=await handle.stat();if(after.ino!==st.ino||after.dev!==st.dev||after.size!==st.size||after.mtimeMs!==st.mtimeMs)fail('runtime changed during preflight');
   }finally{await handle.close();}
   if(hash.digest('hex')!==registry.engines[registry.current].executable_sha256)fail('checker runtime hash differs');
   seenRuntime=true;
  }else if((bytes+=st.size)>80*1024*1024)fail('fixture exceeds its inspection budget');
  if(st.isDirectory())await walk(p);
 }}await walk(root);
 if(runtime&&!seenRuntime)fail('declared checker is missing');
}

function configPaths(config,owned,marker){
 function visit(value,key=''){
  if(Array.isArray(value)){for(const item of value)visit(item,key);return;}
  if(value&&typeof value==='object'){for(const [k,v]of Object.entries(value))visit(v,k);return;}
  if(typeof value!=='string')return;
  if(key==='vault'&&value!==marker.profile)fail('native vault must have the disposable fixture identity');
  if(/^obsidian:/i.test(value)){
   const u=new URL(value);if(u.protocol!=='obsidian:'||u.hostname!=='open'||u.searchParams.get('vault')!==marker.profile)fail('external vault link');return;
  }
  if((/^[a-z]:/i.test(value)&&[47,92].includes(value.charCodeAt(2)))||(value.charCodeAt(0)===92&&value.charCodeAt(1)===92))fail('Windows paths are not fixture grants; copy inputs into the host fixture');
  if(value.startsWith('file:'))value=require('node:url').fileURLToPath(value);
  if(path.isAbsolute(value)&&!owned.some(root=>inside(root,value)))fail('configuration path leaves disposable scope: '+key);
 }
 visit(config);
}
function controlPaths(value,root,key=''){
 if(Array.isArray(value)){for(const item of value)controlPaths(item,root,key);return;}
 if(value&&typeof value==='object'){for(const [k,v]of Object.entries(value)){
  if(path.isAbsolute(k)&&!inside(root,k))fail('control metadata scope leaves fixture');
  controlPaths(v,root,k);
 }return;}
 if(typeof value!=='string')return;
 if(['binding_after','binding_before'].includes(key)){controlPaths(JSON.parse(value),root);return;}
 if(['location','destination','output','original_home'].includes(key)&&(!path.isAbsolute(value)||path.normalize(value)!==value||!inside(root,value)))fail('control metadata target leaves fixture');
 if(path.isAbsolute(value)&&!inside(root,value))fail('control metadata target leaves fixture');
}
function memento(owner,prefix,writes){
 return {get:(key,fallback)=>owner.get(prefix+key,fallback),
  update:async(key,value)=>{writes.push(prefix+key);return owner.update(prefix+key,value);},
  keys:()=>owner.keys().filter(key=>key.startsWith(prefix)).map(key=>key.slice(prefix.length)),
  setKeysForSync:()=>fail('fixture state must not enter Settings Sync')};
}
async function isolateContext(vscode,native,extension){
 if(contexts.has(native))return native;
 const marker=await receipt(extension),prefix='mrw.fixture.'+marker.id+'.',writes=[];
 if(native?.storageUri?.scheme!=='file'||native?.globalStorageUri?.scheme!=='file')fail('local native storage required');
 // All persistence still uses native Memento.update. No state database is
 // edited directly, and the working extension's keys are never exposed.
 const overrides={storagePath:path.join(marker.root,'workspace-storage'),globalStoragePath:path.join(marker.root,'global-storage'),
  secrets:{get:()=>fail('native secret access is disabled; use a synthetic test transport'),store:()=>fail('native secret access is disabled'),delete:()=>fail('native secret access is disabled')},
  storageUri:vscode.Uri.file(path.join(marker.root,'workspace-storage')),
  globalStorageUri:vscode.Uri.file(path.join(marker.root,'global-storage')),
  workspaceState:memento(native.workspaceState,prefix,writes),globalState:memento(native.globalState,prefix,writes)};
 const context=new Proxy({}, {get:(_target,key)=>{
  if(Object.hasOwn(overrides,key))return overrides[key];
  const value=Reflect.get(native,key,native);return typeof value==='function'?value.bind(native):value;
 },has:(_target,key)=>Object.hasOwn(overrides,key)||key in native,
 ownKeys:()=>[...new Set([...Reflect.ownKeys(native),...Reflect.ownKeys(overrides)])],
 getOwnPropertyDescriptor:(_target,key)=>{
  const descriptor=Reflect.getOwnPropertyDescriptor(native,key);
  return Object.hasOwn(overrides,key)||descriptor?{configurable:true,enumerable:Object.hasOwn(overrides,key)||descriptor.enumerable,get:()=>context[key]}:undefined;}});
 contexts.set(context,{native,prefix,writes});
 await assertFixture(vscode,context,extension);return context;
}
function scopeInfo(context){
 const info=contexts.get(context);if(!info)fail('unisolated native context');
 return {prefix:info.prefix,writes:info.writes.slice(),nativeStorage:info.native.storageUri.fsPath,nativeGlobal:info.native.globalStorageUri.fsPath};
}
async function clearOwnedState(context){
 const info=contexts.get(context);if(!info)fail('unisolated native context');
 for(const owner of [info.native.workspaceState,info.native.globalState]){
  for(const key of owner.keys().filter(key=>key.startsWith(info.prefix)))await owner.update(key,undefined);
 }
}
async function assertFixture(vscode,context,extension){
 const marker=await receipt(extension);
 const info=scopeInfo(context);
 if(!context||![vscode.ExtensionMode?.Development,vscode.ExtensionMode?.Test].filter(v=>v!==undefined).includes(context.extensionMode))fail('a Development/Test extension context is required');
 if(await canonical(context.extensionPath)!==marker.extension)fail('wrong development extension');
 const folders=vscode.workspace.workspaceFolders;
 if(!Array.isArray(folders)||folders.length!==1||folders[0].uri.scheme!=='file')fail('exactly one local disposable workspace is required');
 const project=await canonical(folders[0].uri.fsPath);
 if(!marker.projects.includes(project))fail('active workspace is not the declared disposable project');
 if(vscode.workspace.workspaceFile&&!inside(marker.root,await canonical(vscode.workspace.workspaceFile.fsPath)))fail('workspace file leaves disposable scope');
 const config=await json(path.join(extension,'host-test.json'));
 if(config.vault||config.obsidianExecutable)fail('native companion mutation needs a separately verified owner fixture; this harness is disabled until supplied');
 if(config.project!==project||!inside(marker.root,await canonical(config.artifacts)))fail('configuration does not match the disposable project/artifacts');
 await tree(marker.root,marker);
 const global=await canonical(context.globalStorageUri.fsPath);
 if(global!==path.join(marker.root,'global-storage')||context.storageUri.fsPath!==path.join(marker.root,'workspace-storage'))fail('native store facade leaves disposable scope');
 if(context.storageUri?.scheme!=='file')fail('local native workspace storage required');
 const storage=await canonical(context.storageUri.fsPath);
 const pinPath=path.join(marker.root,'native-scope.json');
 let pin;try{pin=await json(pinPath);}catch(e){if(e.code!=='ENOENT')throw e;}
 if(pin&&(pin.id!==marker.id||pin.storage!==storage||pin.global!==global||pin.project!==project||pin.nativeStorage!==info.nativeStorage||pin.nativeGlobal!==info.nativeGlobal))fail('native stores differ from the fixture first launch');
 if(!pin&&(context.workspaceState.keys().length||context.globalState.keys().length))fail('first fixture launch already contains MRW state');
 const owned=[marker.root,storage,global];configPaths(config,owned,marker);
 const configuration=vscode.workspace.getConfiguration('mrw');
 for(const key of ['notesFolder','dataDirectory','leanStudyParent']){
  const value=configuration.get(key,'');if(value&&!inside(marker.root,await canonical(value)))fail('inherited '+key+' points outside the fixture');
 }
 for(const name of ['active-store.json','transaction.json']){
  try{controlPaths(await json(path.join(storage,'artifact-runtime',name),1024*1024),marker.root);}
  catch(e){if(e.code!=='ENOENT')throw e;}
 }
 if(verified?.context!==context)for(const document of vscode.workspace.textDocuments||[]){
  if(document.isDirty)fail('unsaved document already open');
  if(document.uri.scheme==='file'&&!owned.some(root=>inside(root,document.uri.fsPath)))fail('external document already open');
 }
 if(verified?.context!==context)for(const group of vscode.window.tabGroups?.all||[])for(const tab of group.tabs){
  if(tab.isDirty)fail('unsaved tab already open');
  for(const uri of [tab.input?.uri,tab.input?.original,tab.input?.modified])if(uri?.scheme==='file'&&!owned.some(root=>inside(root,uri.fsPath)))fail('external document tab already open');
 }
 if(!pin)await fs.writeFile(pinPath,JSON.stringify({id:marker.id,storage,global,project,nativeStorage:info.nativeStorage,nativeGlobal:info.nativeGlobal}),{flag:'wx',mode:0o600});
 process.env.MRW_TEST_FIXTURE=path.join(marker.root,'.mrw-native-fixture.json');
 verified={context,marker};return {context,marker,config,storage,global};
}
function protect(exports,options){
 const extension=path.resolve(path.dirname(options.filename),'../..');
 for(const name of ['activate','run','check'])if(typeof exports[name]==='function'){
  const original=exports[name];exports[name]=async function(...args){
   if(path.basename(options.filename)==='documentLearning.js')fail('retired document Problems UI; this is not a current acceptance test');
   const declaration=await receipt(extension),entry=path.basename(options.filename,'.js');
   if(entry!==declaration.case&&!(declaration.case==='activation'&&['bootstrap','notes'].includes(entry)))fail('undeclared native entry point');
   let context=name==='activate'?args[0]:verified?.context;
   if(!context){
    const marker=await receipt(extension),manifest=await json(path.join(extension,'package.json'));
    if(manifest.main!=='./test/host/bootstrap.js')fail('run-style tests require the guarded bootstrap');
    const installed=options.vscode.extensions.getExtension('flengyel.mrw');
    if(installed?.extensionPath!==marker.extension)fail('installed working extension cannot be a test target');
    context=(await installed.activate())?.fixtureContext;
   }
   context=await isolateContext(options.vscode,context,extension);
   await assertFixture(options.vscode,context,extension);
   if(name==='activate')args[0]=context;
   if(name==='check'&&(!inside(verified.marker.root,await canonical(args[0]))||args[1]?.extensionPath!==context.extensionPath))fail('helper arguments leave the verified fixture');
   return original.apply(this,args);
  };
 }
 return exports;
}
module.exports={assertFixture,isolateContext,scopeInfo,clearOwnedState,protect,receipt,inside,configPaths};
