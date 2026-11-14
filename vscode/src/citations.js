'use strict';
// Pandoc parses citations and formats them with CSL. This adapter never edits
// source text, resolves a library over the network, or executes document filters.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {frontMatterInfo}=require('./readingMarkdown');
const MarkdownIt=require('../media/markdown-it/markdown-it');
const LIMIT=4*1024*1024;
function candidates(text){
 const front=frontMatterInfo(text);if(front.closed)text=text.slice(front.end);
 const found=[];const md=new MarkdownIt();
 md.inline.ruler.before('link','mrw_citation_candidate',(s,silent)=>{
  if(s.src[s.pos]!=='['||s.pos>0&&s.src[s.pos-1]==='\\')return false;
  const end=s.src.indexOf(']',s.pos+1);if(end<0||end-s.pos>2048)return false;
  const raw=s.src.slice(s.pos,end+1);if(['(','['].includes(s.src[end+1])||!/(?:^|[\s;\[])-?@[\w]/.test(raw))return false;
  if(!silent){const t=s.push('mrw_citation','',0);t.content=raw;found.push(raw);}s.pos=end+1;return true;
 });md.parse(text,{});return [...new Set(found)];
}
function run(executable,args,input){if(Buffer.byteLength(input)>LIMIT)return Promise.reject(Error('Citation processor input exceeds 4 MiB'));return new Promise((resolve,reject)=>{
 const child=spawn(executable,args,{shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']}),out=[],err=[];let size=0,done=false;
 const finish=(e,v)=>{if(done)return;done=true;clearTimeout(timer);if(e){child.kill();reject(e);}else resolve(v);};
 const timer=setTimeout(()=>{child.kill();finish(Error('Citation processor timed out'));},15000);
 child.on('error',e=>finish(e));child.stdin.on('error',e=>finish(e));
 child.stdout.on('data',b=>{size+=b.length;if(size>LIMIT){child.kill();finish(Error('Citation output exceeds 4 MiB'));}else out.push(b);});
 child.stderr.on('data',b=>{if(err.reduce((n,x)=>n+x.length,0)<8192)err.push(b);});
 child.on('close',code=>code?finish(Error('Pandoc citation rendering failed: '+Buffer.concat(err).toString().slice(0,600))):finish(null,Buffer.concat(out).toString()));child.stdin.end(input);
 });}
function hostPath(p){if(process.platform!=='win32'&&/^[A-Za-z]:[\\/]/.test(p))return '/mnt/'+p[0].toLowerCase()+'/'+p.slice(3).replaceAll('\\','/');return p;}
function metaString(m){return m?.t==='MetaString'?m.c:m?.t==='MetaInlines'?m.c.map(v=>v.t==='Str'?v.c:v.t==='Space'?' ':'').join(''):'';}
function metaValue(v){if(Array.isArray(v))return {t:'MetaList',c:v.map(metaValue)};if(v&&typeof v==='object')return {t:'MetaMap',c:Object.fromEntries(Object.entries(v).map(([k,x])=>[k,metaValue(x)]))};return {t:'MetaString',c:String(v??'')};}
async function bounded(file){const h=await fs.open(file,require('node:fs').constants.O_RDONLY|require('node:fs').constants.O_NOFOLLOW);try{const before=await h.stat();if(!before.isFile()||before.size>LIMIT)throw Error('Citation data exceeds 4 MiB');let total=0;const chunks=[];while(true){const buf=Buffer.alloc(Math.min(65536,LIMIT+1-total));const {bytesRead}=await h.read(buf,0,buf.length,null);if(!bytesRead)break;total+=bytesRead;if(total>LIMIT)throw Error('Citation data grew beyond limit');chunks.push(buf.subarray(0,bytesRead));}const after=await h.stat();if(before.size!==after.size||before.mtimeMs!==after.mtimeMs)throw Error('Citation resource changed during inspection');return Buffer.concat(chunks).toString('utf8');}finally{await h.close();}}

async function prepare({text,file,root,configuration={},execute=run}){
 if(text.length>LIMIT||Buffer.byteLength(text)>LIMIT)throw Error('Note exceeds citation rendering limit');
 const raw=candidates(text);if(raw.length>128)throw Error('More than 128 citation groups; rendering is incomplete');if(!raw.length)return {citations:{},bibliography:'',status:'No citation occurrences'};
 if(Buffer.byteLength(text)>LIMIT)throw Error('Note exceeds citation rendering limit');
 const scope=await fs.realpath(root);const inside=p=>{const rel=path.relative(scope,p);return rel===''||!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel);};
 async function scoped(value){if(!value||/^\w+:\/\//.test(value))throw Error('Only local bibliography and CSL paths are supported');const p=await fs.realpath(path.resolve(path.dirname(file),hostPath(value)));if(!inside(p))throw Error('Citation resource is outside the selected notes/workspace scope');return p;}
 let executable=configuration.executable||'pandoc',bib=configuration.bibliography||'',style=configuration.style||'',warning='';
 if(!bib){
  // Read only this known companion configuration. It grants no new scope and
  // its remote style URL and live-Zotero option are deliberately not followed.
  try{const config=JSON.parse(await bounded(path.join(scope,'.obsidian/plugins/obsidian-pandoc-reference-list/data.json')));
   bib=String(config.pathToBibliography||'').replace(/^['"]|['"]$/g,'');

  }catch(e){if(e.code!=='ENOENT')warning='Companion citation configuration could not be read. ';}
 }
 const front=frontMatterInfo(text);const header=front.closed?text.slice(0,front.end):'';
 const ast=JSON.parse(await execute(executable,['--sandbox','--from=markdown','--to=json'],header+'\n\n'+raw.join('\n\n')));
 const metadata=ast.meta||{},field=metadata.bibliography;
 const paths=field?(field.t==='MetaList'?field.c.map(metaString):[metaString(field)]):bib?[bib]:[];
 if(metadata.csl)style=metaString(metadata.csl);
 if(paths.length>4)throw Error('At most four bibliography files are supported per note');
 let references=[],resourceBytes=0;
 if(metadata.references){const wrapped={...ast,meta:{references:metadata.references},blocks:[]};references=JSON.parse(await execute(executable,['--sandbox','--from=json','--to=csljson'],JSON.stringify(wrapped)));}
 for(const p of paths){const target=await scoped(p),input=await bounded(target),ext=path.extname(target).toLowerCase();
  resourceBytes+=Buffer.byteLength(input);if(resourceBytes>LIMIT)throw Error('Combined bibliography resources exceed 4 MiB');
  if(ext==='.json')references.push(...JSON.parse(input));
  else {const format={'.bib':'biblatex','.bibtex':'bibtex','.yaml':'markdown','.yml':'markdown'}[ext];if(!format)throw Error('Unsupported bibliography format');references.push(...JSON.parse(await execute(executable,['--sandbox','--from='+format,'--to=csljson'],format==='markdown'?'---\nreferences:\n'+input+'\n---':input)));}
 }
 if(references.length>20000||Buffer.byteLength(JSON.stringify(references))>LIMIT)throw Error('Combined reference data exceeds citation budget');
 if(!references.length)throw Error('No local bibliography or inline references; citation keys remain unresolved');
 const ids=new Map();for(const ref of references){const key=String(ref.id);ids.set(key,(ids.get(key)||0)+1);}
 const args=['--sandbox','--from=json','--to=plain','--wrap=none','--citeproc'];
 if(style){const target=await scoped(style),xml=await bounded(target);if(!/\.csl$/i.test(target)||!/<style\b/.test(xml)||/rel=["']independent-parent["']/.test(xml))throw Error('Select a local independent CSL style; remote/dependent styles are not fetched');args.push('--csl='+(/\.exe$/i.test(executable)?require('./obsidianNotes').windowsPath(target):target));}
 const separator='MRWCITATION'+crypto.randomBytes(12).toString('hex');
 const blocks=[],valid=[];const citations={};
 ast.blocks.forEach((block,i)=>{if(i>=raw.length)return;const keys=[];function walk(v){if(Array.isArray(v))v.forEach(walk);else if(v&&typeof v==='object'){if(v.t==='Cite')for(const c of v.c[0])keys.push(c.citationId);Object.values(v).forEach(walk);}}walk(block);
  const missing=keys.filter(k=>!ids.has(k)),ambiguous=keys.filter(k=>ids.get(k)>1);
  if(!keys.length||missing.length||ambiguous.length){citations[raw[i]]={text:raw[i],problem:ambiguous.length?'Ambiguous citation keys: '+ambiguous.join(', '):'Unresolved citation keys: '+missing.join(', ')};return;}
  valid.push(raw[i]);blocks.push(block,{t:'Para',c:[{t:'Str',c:separator}]});});
 // Only whitelisted metadata reaches citeproc; executable document settings,
 // remote resources, filters and unrelated YAML are never forwarded.
 const meta={references:metaValue(references)};if(metadata['reference-section-title'])meta['reference-section-title']=metadata['reference-section-title'];
 const plain=await execute(executable,args,JSON.stringify({...ast,meta,blocks}));const chunks=plain.split(separator);
 valid.forEach((key,i)=>{citations[key]={text:chunks[i].trim()};});
 return {citations,bibliography:chunks.at(-1).trim(),status:warning+'Local bibliography snapshot; freshness relative to Zotero is unknown.'};
}
function registerCitations({vscode,context,documents,prepareNote=prepare}){
 const cache=new Map(),pending=new Set(),watchers=[];let timer,tail=Promise.resolve();
 async function perform(doc){if(!doc||doc.uri?.scheme!=='file'||! /\.(md|markdown)$/i.test(doc.uri.fsPath)||vscode.workspace.isTrusted===false)return;
  const key=doc.uri.toString(),text=doc.getText();if(text.length>LIMIT||Buffer.byteLength(text)>LIMIT){cache.set(key,{text:'',citations:{},status:'Note exceeds citation limit'});return;}if(!/\[@/.test(text))return;
  const version=doc.version;
  try{await documents.check(doc.uri);const c=vscode.workspace.getConfiguration('mrw');const roots=[c.get('notesFolder',''),...vscode.workspace.workspaceFolders?.map(f=>f.uri.fsPath)||[]].filter(Boolean);const root=roots.find(r=>{const rel=path.relative(r,doc.uri.fsPath);return rel!== '..'&&!rel.startsWith('..'+path.sep)&&!path.isAbsolute(rel);});if(!root)return;
   const value=await prepareNote({text,file:doc.uri.fsPath,root,configuration:{executable:c.get('citationExecutable',''),bibliography:c.get('citationBibliography',''),style:c.get('citationStyle','')}});if(doc.version===version)cache.set(key,{text,...value});
  }catch(e){if(doc.version===version)cache.set(key,{text,citations:{},bibliography:'',status:e.message});}
  finally{pending.delete(key);await vscode.commands.executeCommand('markdown.preview.refresh');}
 }
 function update(doc){const key=doc?.uri?.toString();if(!key||pending.has(key))return tail;pending.add(key);const job=tail.then(()=>perform(doc)).finally(()=>pending.delete(key));tail=job.catch(()=>{});return job;}
 const refresh=()=>{clearTimeout(timer);timer=setTimeout(()=>{for(const doc of (vscode.workspace.textDocuments||[]).slice(0,16))void update(doc);},300);timer.unref?.();};
 if(vscode.workspace.onDidChangeTextDocument)context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(refresh));
 if(vscode.workspace.onDidChangeConfiguration)context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(()=>{attachWatchers();refresh();}));
 // Watch only the explicitly scoped roots' citation files; no recursive vault read.
 function attachWatchers(){if(!vscode.workspace.createFileSystemWatcher)return;for(const w of watchers.splice(0))w.dispose();const roots=[vscode.workspace.getConfiguration('mrw').get('notesFolder',''),...vscode.workspace.workspaceFolders?.map(f=>f.uri.fsPath)||[]].filter(Boolean);for(const root of roots){const pattern=vscode.RelativePattern?new vscode.RelativePattern(root,'**/*.{bib,bibtex,csl,json,yaml,yml}'): '**/*.{bib,bibtex,csl,json,yaml,yml}';const watcher=vscode.workspace.createFileSystemWatcher?.(pattern);if(watcher){watchers.push(watcher);for(const method of ['onDidChange','onDidCreate','onDidDelete'])watcher[method]?.(refresh);}}}attachWatchers();
 context.subscriptions.push({dispose(){clearTimeout(timer);for(const w of watchers)w.dispose();cache.clear();}});
 function extendMarkdownIt(md){
  if(md.inline.ruler.__rules__.some(r=>r.name==='mrw_citation'))return md;
  md.inline.ruler.before('link','mrw_citation',(s,silent)=>{if(s.src[s.pos]!=='[')return false;const end=s.src.indexOf(']',s.pos+1);if(end<0||end-s.pos>2048)return false;const raw=s.src.slice(s.pos,end+1);if(['(','['].includes(s.src[end+1])||!/(?:^|[\s;\[])-?@[\w]/.test(raw))return false;if(!silent){const token=s.push('mrw_citation','',0);token.content=raw;}s.pos+=raw.length;return true;});
  md.renderer.rules.mrw_citation=(tokens,i,_opts,env)=>{const key=env.currentDocument?.toString(),doc=vscode.workspace.textDocuments?.find(d=>d.uri.toString()===key),value=cache.get(key),raw=tokens[i].content;if(doc&&value?.text!==doc.getText())void update(doc);const hit=doc&&value?.text===doc.getText()?value.citations[raw]:null;return '<span title="'+md.utils.escapeHtml(hit?.problem||value?.status||'Citation rendering pending')+'">'+md.utils.escapeHtml(hit?.text||raw)+'</span>';};
  md.core.ruler.push('mrw_citation_footer',s=>s.tokens.push(new s.Token('mrw_citation_footer','',0)));
  md.renderer.rules.mrw_citation_footer=(_t,_i,_o,env)=>{const doc=vscode.workspace.textDocuments?.find(d=>d.uri.toString()===env.currentDocument?.toString()),v=doc&&cache.get(doc.uri.toString());if(!v||v.text!==doc.getText())return '';return '<aside class="mrw-citation-status">'+md.utils.escapeHtml(v.status+' '+Object.values(v.citations).map(c=>c.problem||'').filter(Boolean).join('; '))+'</aside>'+(v.bibliography?'<section aria-label="Generated bibliography"><h2>References</h2><pre style="white-space:pre-wrap">'+md.utils.escapeHtml(v.bibliography)+'</pre></section>':'');};return md;
 }
 return {extendMarkdownIt,update,cache};
}
module.exports={candidates,prepare,registerCitations,run};
