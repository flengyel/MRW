'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {within, markdown} = require('./documentLinks');
const {noteIdentity} = require('./noteIdentity');
const KEY = 'mrw.recentNotes.v1';
const LIMIT = 30;

const DEFAULT_TEMPLATE = '# {{title}}\n\n{{cursor}}\n\n{{source}}\n';
function zettelText(id, title, source, root, template = DEFAULT_TEMPLATE) {
  const label = value => value.replace(/[\\[\]]/g, '\\$&');
  const link = source ? `[${label(source.label.replace(/\s+/gu, ' '))}](<${path.relative(root, source.uri.fsPath).split(path.sep).map(encodeURIComponent).join('/')}>)` : '';
  const values = {'{{id}}':id, '{{title}}':title, '{{titleYaml}}':JSON.stringify(title), '{{source}}':link};
  let text = '', cursor;
  // One literal substitution pass: note text is never interpreted as code or
  // recursively expanded. No vault format, fields or section names are required.
  for (const part of template.split(/(\{\{(?:id|title|titleYaml|source|cursor)\}\})/g)) {
    if (part === '{{cursor}}') { if (cursor === undefined) cursor = text.length; }
    else text += values[part] ?? part;
  }
  return {text, cursor: cursor ?? text.length};
}

function createZettelNotes({vscode, context, folderRoot, open, eligible = () => true, now = () => new Date()}) {
  const valid = e => e && typeof e.uri === 'string' && e.uri.length < 8192 &&
    typeof e.canonical === 'string' && path.isAbsolute(e.canonical) &&
    typeof e.root === 'string' && path.isAbsolute(e.root) && within(e.root, e.canonical) &&
    typeof e.label === 'string' && e.label.length <= 1024;
  const saved = context.workspaceState.get(KEY, []);
  let entries = Array.isArray(saved) ? saved.filter(valid).slice(0, LIMIT) : [];
  const reserved = new Set();
  let tail = Promise.resolve(), failedSave = false;
  const report = error => void vscode.window.showErrorMessage(`MRW: ${error.message}`);
  async function identity(uri) {
    const doc = vscode.workspace.textDocuments?.find(d => !d.isClosed && d.uri.toString() === uri.toString());
    if (doc) return noteIdentity(doc, {headingFallback: true});
    const file = await fs.open(uri.fsPath, 'r');
    try {
      const buffer = Buffer.alloc(65536), {bytesRead} = await file.read(buffer, 0, buffer.length, 0);
      return noteIdentity({uri, getText: () => buffer.subarray(0, bytesRead).toString('utf8')}, {headingFallback: true});
    } finally { await file.close(); }
  }
  function remember(uri) {
    if (uri?.scheme !== 'file' || !markdown(uri.fsPath) || !eligible(uri)) return Promise.resolve();
    const job = tail.catch(() => {}).then(async () => {
      const root = await folderRoot();
      let actual;
      try {
        actual = await fs.realpath(uri.fsPath);
        if (!within(root, actual) || !(await fs.stat(actual)).isFile()) return;
      } catch (_) { return; } // A missing file never becomes a recent entry.
      const info = await identity(uri);
      if (await folderRoot() !== root || await fs.realpath(uri.fsPath) !== actual) return;
      const entry = {uri: uri.toString(), canonical: actual, root, label: info.label.slice(0, 1024)};
      if (entries[0]?.uri === entry.uri && entries[0]?.canonical === actual && entries[0]?.root === root && entries[0]?.label === entry.label && !failedSave) return;
      entries = [entry, ...entries.filter(e => e.canonical !== actual)].slice(0, LIMIT);
      try { await context.workspaceState.update(KEY, entries); failedSave = false; }
      catch (error) { failedSave = true; throw Error(`The note is open, but Recent Notes could not be saved: ${error.message}. Reopen the note to retry.`); }
    });
    tail = job; return job;
  }
  async function checkEntry(entry, root) {
    if (await folderRoot() !== root || entry.root !== root) throw Error('The notes folder changed. Open Recent Notes again.');
    const uri = vscode.Uri.parse(entry.uri), actual = await fs.realpath(uri.fsPath);
    if (uri.scheme !== 'file' || actual !== entry.canonical || !within(root, actual) || !(await fs.stat(actual)).isFile()) {
      throw Error('This recent note moved or now points elsewhere. Use Open Document to choose it again.');
    }
    return uri;
  }
  async function recent({validate = () => {}, openSelected = open} = {}) {
    await tail.catch(() => {});
    const root = await folderRoot();
    const choices = await Promise.all(entries.filter(e => e.root === root).map(async entry => {
      try {
        const uri = await checkEntry(entry, root), info = await identity(uri);
        return {label: info.label, description: path.relative(root, uri.fsPath), entry};
      } catch (_) { return {label: entry.label, description: 'Unavailable — moved or missing', entry}; }
    }));
    if (!choices.length) { await vscode.window.showInformationMessage(`No recent notes in ${root}. Open a note or create a Zettel.`); return; }
    const selected = await vscode.window.showQuickPick(choices, {title: 'Recent Notes', placeHolder: root, matchOnDescription: true});
    if (!selected) return;
    const uri = await checkEntry(selected.entry, root);
    validate();
    await openSelected(uri);
  }
  async function newDraft({source, validate = () => {}} = {}) {
    const root = await folderRoot();
    const configuration = vscode.workspace.getConfiguration('mrw');
    const prefix = configuration.get('zettelPrefix', 'Note');
    const template = configuration.get('zettelTemplate', DEFAULT_TEMPLATE);
    if (typeof template !== 'string' || !template.trim() || template.length > 65536) throw Error('MRW: Zettel Template must contain Markdown text (at most 65536 characters).');
    if (typeof prefix !== 'string' || !/^[A-Za-z][A-Za-z0-9._-]{0,31}$/.test(prefix)) throw Error('MRW: Zettel Prefix must start with a letter and contain only letters, digits, dots, underscores or hyphens (at most 32 characters).');
    const title = await vscode.window.showInputBox({title: 'New Zettel', prompt: `Title — save in ${root}`, ignoreFocusOut: true,
      validateInput: value => !value.trim() || value.length > 500 || /[\r\n\x00-\x1f]/.test(value) ? 'Enter a title on one line (at most 500 characters).' : undefined});
    if (title === undefined) return;
    if (!title.trim() || title.length > 500 || /[\r\n\x00-\x1f]/.test(title)) throw Error('Enter a title on one line (at most 500 characters).');
    if (await folderRoot() !== root) throw Error('The notes folder changed. Create the note again in the intended folder.');
    validate();
    const date = now(), pad = n => String(n).padStart(2, '0');
    const base = prefix + date.getFullYear() + pad(date.getMonth()+1) + pad(date.getDate()) + pad(date.getHours()) + pad(date.getMinutes());
    let id, uri;
    for (let n = 0; n < 1000; n++) {
      id = base + (n ? '-' + (n+1) : '');
      const candidate = vscode.Uri.from({scheme: 'untitled', path: path.join(root, id + '.md')});
      if (reserved.has(candidate.fsPath) || vscode.workspace.textDocuments?.some(d => !d.isClosed && d.uri.fsPath === candidate.fsPath)) continue;
      reserved.add(candidate.fsPath);
      try {
        await fs.lstat(candidate.fsPath);
        reserved.delete(candidate.fsPath);
      } catch (error) {
        if (error.code === 'ENOENT') { uri = candidate; break; }
        reserved.delete(candidate.fsPath); throw error;
      }
    }
    if (!uri) throw Error('No free Zettel filename is available for this minute. Try again later.');
    try {
      if (await folderRoot() !== root) throw Error('The notes folder changed. Create the note again in the intended folder.');
      validate();
      const doc = await vscode.workspace.openTextDocument(uri);
      validate();
      if (doc.getText()) throw Error('This Zettel draft already has text. Its contents were preserved.');
      const editor = await vscode.window.showTextDocument(doc, {preview: false, viewColumn: vscode.ViewColumn.Beside});
      validate();
      if (doc.getText()) throw Error('This Zettel draft acquired text while opening. Its contents were preserved.');
      const {text, cursor} = zettelText(id, title.trim(), source, root, template);
      if (!await editor.edit(edit => edit.insert(new vscode.Position(0, 0), text))) throw Error('The editor declined the new note text. No note was saved.');
      editor.selection = new vscode.Selection(doc.positionAt(cursor), doc.positionAt(cursor));
      return doc;
    } finally { reserved.delete(uri.fsPath); }
  }

  const active = () => {
    const uri = vscode.window.tabGroups?.activeTabGroup?.activeTab?.input?.uri || vscode.window.activeTextEditor?.document?.uri;
    if (uri) void remember(uri).catch(report);
  };
  for (const disposable of [
    vscode.window.onDidChangeActiveTextEditor?.(active),
    vscode.window.tabGroups?.onDidChangeTabs?.(active),
    vscode.window.tabGroups?.onDidChangeTabGroups?.(active),
    vscode.workspace.onDidSaveTextDocument?.(doc => { void remember(doc.uri).catch(report); }),
  ]) if (disposable) context.subscriptions.push(disposable);
  return {remember, recent, newDraft};
}
module.exports = {createZettelNotes, zettelText, DEFAULT_TEMPLATE};
