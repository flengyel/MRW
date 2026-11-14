'use strict';
// The authoring application performs every note edit and Save. This controller
// prepares two clipboard insertions and verifies the saved result; it never
// writes a vault file or infers a new filename from a directory scan.
const fs = require('node:fs/promises');
const path = require('node:path');
const {execFile} = require('node:child_process');
const {promisify, TextDecoder} = require('node:util');
const {digest} = require('./navigation');
const {makeExternal, workspaceRoute, obsidianTarget} = require('./companionLinks');
const {createObsidianNote} = require('./obsidianNotes');
const {validateTarget} = require('./noteLinks');
const MarkdownIt = require('../media/markdown-it/markdown-it');
const markdown = new MarkdownIt('commonmark');
const exec = promisify(execFile);
const MAX = 4 * 1024 * 1024;

async function snapshot(vscode, destination) {
  const root = await fs.realpath(destination.root), file = path.join(root, destination.file);
  validateTarget({notes:destination.root, file:destination.file, workspace:'file:///validation'});
  if (root !== destination.root || await fs.realpath(file) !== file) throw Error('The notes folder or file was redirected. Relink it explicitly.');
  const dirty = (vscode.workspace.textDocuments || []).some(d => d.uri.scheme === 'file' && path.resolve(d.uri.fsPath) === file && d.isDirty);
  if (dirty) throw Error('Save or discard the unsaved VS Code buffer for this destination before continuing.');
  const stat = await fs.lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX) throw Error('Choose a regular Markdown file of at most 4 MiB.');
  const raw = await fs.readFile(file);
  if (raw.length > MAX) throw Error('The note exceeds 4 MiB.');
  return {file, text:new TextDecoder('utf-8',{fatal:true}).decode(raw), revision:digest(raw)};
}
function conflicts(text) {
  return markdown.parse(text,{}).filter(t => t.type === 'heading_open').map(t => ({tag:t.tag, line:t.map[0]}))
    .filter(h => h.tag === 'h1' || /^\s*##\s+(SEE ALSO|Research|References)\s*#*\s*$/m.test(text.split(/\r?\n/)[h.line]));
}
function dependencies(text) {
  const found = new Set();
  for (const token of markdown.parse(text, {})) {
    for (const child of token.children || []) {
      const href = child.attrGet?.('href') || child.attrGet?.('src');
      if (href && !/^[a-z][a-z0-9+.-]*:/i.test(href)) found.add(href);
    }
  }
  if (/\[\[/.test(text)) found.add('WikiLinks use the destination notes folder');
  if (/\\[A-Za-z]+/.test(text)) found.add('Check note-local TeX macros in the destination');
  if (/```\s*tikz/.test(text)) found.add('TikZ source is preserved; Obsidian rendering depends on its plugins');
  return [...found];
}
async function validateZettel(vscode, selected, execute = exec) {
  if (vscode.workspace.isTrusted === false) throw Error('Trust this workspace before running the selected Zettel validator.');
  const config = vscode.workspace.getConfiguration('mrw');
  let tool = config.get('zettelValidator', '').trim();
  if (!tool) {
    const picked = await vscode.window.showOpenDialog({title:'Select flengyel/Zettel python/zettel_validate.py',canSelectMany:false,filters:{Python:['py']}});
    if (!picked?.length) throw Error('Zettel validation was cancelled. The annotation remains current.');
    tool = picked[0].fsPath;
  }
  if (!path.isAbsolute(tool) || !tool.endsWith('.py')) throw Error('MRW: Zettel Validator must name the existing validator Python file.');
  const bytes = await fs.readFile(tool), toolRevision = digest(bytes);
  let report;
  try {
    const result = await execute(config.get('pythonExecutable','python3'), [path.join(__dirname,'../media/zettel-validation.py'), tool, selected.file],
      {timeout:15000,maxBuffer:128*1024,windowsHide:true,encoding:'utf8'});
    report=JSON.parse(result.stdout);
    if(report.valid!==true || typeof report.section!=='string') throw Error('The selected validator did not return a valid note layout.');
  } catch (error) {
    let details=error.stdout || error.message;
    try { const r=JSON.parse(error.stdout);details=r.issues.join('\n')+(r.index_suggestions.length?'\nTitle index options (choose an appropriate entry in SEE ALSO):\n'+r.index_suggestions.join('\n'):''); } catch(_) {}
    throw Error('Zettel validation did not pass. Complete its fields and title-appropriate index link in Obsidian, save, then try again.\n' + details);
  }
  if (digest(await fs.readFile(tool)) !== toolRevision) throw Error('The validator changed while running. Validate again.');
  return {tool, revision:toolRevision, section:report.section};
}
async function availability(vscode, records) {
  const result = {};
  for (const item of records) {
    if (item.phase === 'unlinked') { result[item.annotation] = 'Link removed — relink explicitly'; continue; }
    try {
      const d=item.destination, file=path.join(d.root,d.file);
      validateTarget({notes:d.root,file:d.file,workspace:'file:///validation'});
      if(await fs.realpath(d.root)!==d.root || await fs.realpath(file)!==file) throw Error('Note path redirected — relink explicitly');
      if(!(await fs.lstat(file)).isFile()) throw Error('The continuation is not a file — relink explicitly');
    }
    catch (error) { result[item.annotation] = error.code === 'ENOENT' ? 'Note missing or renamed — relink explicitly' : error.message; }
  }
  return result;
}
function createContinuation({vscode, bridge, show, publish, refresh, createNote=createObsidianNote, validate=validateZettel}) {
  const call = (c,method,extra={}) => bridge({method,store:c.store,project_root:c.root,id:c.result.outline.id,...extra});
  const change = (c, annotation, operation, data) => publish(c,{operation,annotation,outline_revision:c.result.revision,data});
  async function open(record) {
    if (record.phase === 'unlinked') throw Error('The continuation is unlinked. Use Relink to select its note.');
    const selected = await snapshot(vscode,record.destination);
    if (record.destination.url) {
      if (!await vscode.env.openExternal(obsidianTarget(vscode,record.destination.url))) throw Error('Obsidian did not accept the note address.');
    } else {
      const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(selected.file));
      await vscode.window.showTextDocument(doc,{preview:false});
    }
  }
  async function choose(root) {
    const picked = await vscode.window.showOpenDialog({title:'Select the saved continuation note',defaultUri:vscode.Uri.file(root + path.sep),canSelectMany:false,filters:{Markdown:['md','markdown']}});
    if (!picked?.length) return;
    const file = path.relative(root,picked[0].fsPath).split(path.sep).join('/');
    const isVault = (await fs.stat(path.join(root,'.obsidian')).catch(()=>undefined))?.isDirectory();
    const vault = vscode.workspace.getConfiguration('mrw').get('obsidianVault','').trim() || path.basename(root);
    const destination = {root,file,label:path.basename(file),url:isVault ? `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(file)}` : null};
    const selected = await snapshot(vscode,destination);
    return {destination,selected};
  }
  async function begin(c, annotation, original) {
    const configured = vscode.workspace.getConfiguration('mrw').get('notesFolder','');
    if (!configured) throw Error('Choose the destination notes folder first.');
    const root = await fs.realpath(configured);
    const start = await vscode.window.showQuickPick(['Choose an existing note…','Create a note in Obsidian…'],{title:'Continue this note in Obsidian',placeHolder:'The selected note receives this annotation; its other text stays in place.'});
    if (!start) return;
    if (start === 'Create a note in Obsidian…') {
      if (!(await fs.stat(path.join(root,'.obsidian')).catch(()=>undefined))?.isDirectory()) throw Error('This folder is not an Obsidian vault. Create a note in its authoring application, then choose the saved file.');
      await createNote({vscode,root,validate:async()=>{
        if (await fs.realpath(vscode.workspace.getConfiguration('mrw').get('notesFolder','')) !== root) throw Error('The notes folder changed.');
      }});
      const choice = await vscode.window.showInformationMessage('Complete the configured template in Obsidian, including the title index link if using Zettel, and save. MRW does not know the new filename.',{modal:true},'Select saved note…');
      if (!choice) return;
    }
    const picked = await choose(root); if (!picked) return;
    const policy = await vscode.window.showQuickPick([{label:'Zettel — flengyel/Zettel',value:'zettel',description:'Validate ID/title, sections and title index link'},{label:'Ordinary Markdown',value:'markdown',description:'Keep this destination’s own format'}],{title:'Format of this destination',placeHolder:picked.selected.file});
    if (!policy) return;
    let presentation = 'verbatim';
    if (conflicts(original.text).length) {
      const answer = await vscode.window.showWarningMessage('This annotation contains an H1 or a reserved section heading. Quote it as reader commentary in the destination to keep those headings from changing the note’s structure? The exact original stays in MRW.',{modal:true},'Quote reader annotation');
      if (!answer) return; presentation = 'quote';
    }
    const issues = dependencies(original.text);
    if (issues.length && !await vscode.window.showInformationMessage('Dependencies to check in the destination:\n'+issues.join('\n')+'\nNo links or mathematics will be rewritten.',{modal:true},'Continue')) return;
    if (policy.value === 'zettel') await validate(vscode,picked.selected);
    const latest = await snapshot(vscode,picked.destination);
    if (latest.revision !== picked.selected.revision) throw Error('The selected note changed during preparation. Choose it again.');
    const target = await call(c,'outline_reference',{revision:c.result.revision,region:original.region});
    const link = makeExternal({workspace:workspaceRoute(vscode,c.root),project:c.root,reference:target.reference},vscode.env.uriScheme);
    await change(c,annotation,'prepare',{destination:picked.destination,policy:policy.value,presentation,return_link:link,destination_revision:latest.revision});
    return c.notes.continuations.find(n=>n.annotation===annotation);
  }
  async function manage(c, value) {
    if (value.unsaved) throw Error('Save or discard this annotation’s unsaved edits before continuing it.');
    if (c.noteError) throw Error('Note associations are unavailable. Refresh the saved source before continuing.');
    const original = [...c.result.outline.annotations.map(n=>({...n,region:null})),...c.result.outline.regions.flatMap(r=>r.annotations.map(n=>({...n,region:r.id})))].find(n=>n.id===value.annotation);
    if (!original) throw Error('The selected reader annotation no longer exists.');
    let record = c.notes?.continuations?.find(n=>n.annotation===value.annotation);
    if (!record) record = await begin(c,value.annotation,original);
    if (!record) return;
    if (value.action === 'open' && record.phase === 'complete') return open(record);
    const choices = record.phase === 'pending' ? [
      {label:'Open destination for editing',action:'open'},
      {label:'Copy annotation for the note body',action:'body'},
      {label:'Copy source attribution and return link',action:'research'},
      {label:'Verify saved note and finish continuation',action:'verify'},
      {label:'Cancel pending transfer…',action:'cancel'}
    ] : [{label:'Open continuation',action:'open'},{label:'Relink to a selected note…',action:'relink'},{label:'Remove continuation link…',action:'unlink'}];
    const choice = await vscode.window.showQuickPick(choices,{title:record.phase==='pending'?'Pending continuation — '+record.destination.label:'Continuation — '+record.destination.label,
      placeHolder:record.phase==='pending'?(record.policy==='zettel'?'Paste the body before SEE ALSO and attribution in Research.':'Choose body and attribution locations in your note.')+' Preserve the surrounding text, then save and verify.':'The retained original is read-only. Edit the external note.'});
    if (!choice) return;
    if (choice.action === 'open') return open(record);
    if (['body','research'].includes(choice.action)) {
      const selected = await snapshot(vscode,record.destination);
      const content = record[choice.action];
      if (selected.text.replaceAll('\r\n','\n').includes(content.replaceAll('\r\n','\n'))) {
        throw Error('This text is already saved in the destination. Do not paste it again; verify the saved note instead.');
      }
      await vscode.env.clipboard.writeText(content);
      void vscode.window.showInformationMessage((choice.action === 'body'?(record.policy==='zettel'?'Paste at a body location before SEE ALSO.':'Paste at your chosen body location.'):(record.policy==='zettel'?'Paste inside Research (or the accepted older manual section).':'Paste at your chosen attribution location.'))+' Paste without replacing existing text, preserving the copied blank lines. Save in the authoring application, then use Verify saved note. This transfer is still pending.');
      return;
    }
    if (choice.action === 'verify') {
      const selected = await snapshot(vscode,record.destination);
      const validation = record.policy === 'zettel' ? await validate(vscode,selected) : null;
      if ((await snapshot(vscode,record.destination)).revision !== selected.revision) throw Error('The note changed during validation. Verify it again.');
      await change(c,value.annotation,'complete',{destination_revision:selected.revision,validation});
      vscode.window.setStatusBarMessage('Continuation saved. Edit the external note; MRW keeps the attributed original.',8000);
    } else if (choice.action === 'relink') {
      const picked = await choose(record.destination.root); if (!picked) return;
      if (!await vscode.window.showWarningMessage('Use '+picked.selected.file+' as this continuation? Its existing text will not be changed.',{modal:true},'Relink')) return;
      await change(c,value.annotation,'relink',{destination:picked.destination,destination_revision:picked.selected.revision});
    } else {
      if (!await vscode.window.showWarningMessage(choice.action==='cancel'?'Cancel this pending transfer? Any text already pasted in the external note remains there. Remove or reconcile it before starting another transfer.':'Remove only this continuation link? The external file and read-only original remain.',{modal:true},choice.action==='cancel'?'Cancel transfer':'Remove link')) return;
      await change(c,value.annotation,choice.action,{});
    }
  }
  return {manage,open};
}
module.exports = {createContinuation,snapshot,conflicts,dependencies,validateZettel,availability};
