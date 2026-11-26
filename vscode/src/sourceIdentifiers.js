'use strict';
// Source item, acquired revision, fragment and private retained scope are distinct.
const encode=value=>encodeURIComponent(value).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
const reserved=new Set(['javascript','data','file','mailto','http','https','command','vscode','vscode-insiders','mrw-outline','obsidian']);
const sources=new Map([
 ['stacks-project',{origins:['https://stacks.math.columbia.edu'],urlRules:{identifier:'tag',itemPath:'/tag/{id}',revisionPath:null}}],
 ['kerodon',{origins:['https://kerodon.net'],urlRules:{identifier:'tag',itemPath:'/tag/{id}',revisionPath:null}}],
 ['nlab',{origins:['https://ncatlab.org'],urlRules:{identifier:'page',itemPath:'/nlab/show/{id}',revisionPath:'/nlab/revision/{id}/{revision}'}}],
]);
function setSources(items){
 for(const item of Array.isArray(items)?items:[]){
  if(!item||typeof item.sourceId!=='string'||reserved.has(item.sourceId)||!/^[a-z][a-z0-9-]{0,63}$/.test(item.sourceId))continue;
  if(!Array.isArray(item.origins)||!item.origins.length||item.origins.some(o=>typeof o!=='string'||!/^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/.test(o)))continue;
  const rules=item.urlRules;
  if(!rules||!['tag','page'].includes(rules.identifier))continue;
  const valid=(t,revision)=>typeof t==='string'&&t.length<=500&&t.startsWith('/')&&!/[?#\\\s]/.test(t)&&t.split('{id}').length===2&&(!revision||t.split('{revision}').length===2)&&!/[{}]/.test(t.replace('{id}','').replace('{revision}',''));
  if(!valid(rules.itemPath,false)||(rules.revisionPath!==null&&!valid(rules.revisionPath,true)))continue;
  sources.set(item.sourceId,{origins:[...item.origins],urlRules:{...rules}});
 }
}
function split(value){
 const match=/^([a-z][a-z0-9-]{0,63}):([^\s/#]{1,3072})$/.exec(value);
 if(!match||reserved.has(match[1]))return;
 try {const item=decodeURIComponent(match[2]);if(!item||Array.from(item).length>256||/[\x00-\x1f\x7f]/.test(item)||encode(item)!==match[2])return;return {source:match[1],item,id:match[0]};}catch{return;}
}
function urlIdentity(value){
 let uri;try{uri=new URL(value);}catch{return;}
 if(uri.protocol!=='https:'||uri.username||uri.password||uri.search)return;
 for(const [source,spec] of sources){
  if(uri.origin!==spec.origins[0])continue;
  for(const template of [spec.urlRules.itemPath,spec.urlRules.revisionPath]){
   if(!template)continue;
   const pattern=template.split('{id}').map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('(.+?)').replace('\\{revision\\}','[1-9][0-9]*');
   const match=new RegExp('^'+pattern+'/?$').exec(uri.pathname);if(!match)continue;
   try{const item=decodeURIComponent(spec.urlRules.identifier==='page'?match[1].replaceAll('+',' '):match[1]);const id=source+':'+encode(item);if(split(id))return {source,item,id,uri};}catch{}
  }
 }
}
function qualifiedIdentifier(value){
 if(typeof value!=='string'||value.length>4096)return;
 const retained=/^mrw-outline:v2\/([^/]+)\//.exec(value);if(retained)return split(retained[1])?.id;
 const plain=split(value.split('#')[0]);return plain?.id||urlIdentity(value)?.id;
}
function canonicalCitation(value){
 const online=urlIdentity(value);if(online)return online.uri.href;
 const ref=qualifiedIdentifier(value),item=ref&&split(ref),spec=item&&sources.get(item.source);
 if(!spec)throw new Error('The source namespace is unavailable. Enable its source profile, or follow the retained MRW citation.');
 let local=encode(item.item);if(spec.urlRules.identifier==='page')local=local.replaceAll('%20','+');
 const marker=value.indexOf('#'),fragment=marker<0?'':'#'+encode(decodeURIComponent(value.slice(marker+1)));
 return spec.origins[0]+spec.urlRules.itemPath.replace('{id}',local)+fragment;
}
// User-local registration metadata is data, never executable workspace code.
// The backend performs full validation before acquisition; this bounded read
// also makes registered URL namespaces available to offline note/backlink scans.
try {
 const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
 const file=process.env.MRW_SOURCE_PLUGIN_REGISTRY||path.join(process.env.XDG_CONFIG_HOME||path.join(os.homedir(),'.config'),'mrw','source-plugins.json');
 const stat=fs.lstatSync(file);
 if(stat.isFile()&&!stat.isSymbolicLink()&&stat.size<=256*1024){const data=JSON.parse(fs.readFileSync(file,'utf8'));if(data.schema==='mrw.source-plugins'&&data.version===1)setSources(data.entries.map(e=>e.manifest));}
}catch{/* An absent or invalid registration file cannot disable ordinary notes. */}
module.exports={qualifiedIdentifier,canonicalCitation,setSources,encodeItem:encode};
