'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {within, markdown} = require('./documentLinks');
const {noteIdentity} = require('./noteIdentity');
const KEY = 'mrw.recentNotes.v1';
const LIMIT = 30;

function createRecentNotes({vscode, context, folderRoot, authorize, open, eligible = () => true}) {
  const valid = e => e && typeof e.uri === 'string' && e.uri.length < 8192 &&
    typeof e.canonical === 'string' && path.isAbsolute(e.canonical) &&
    typeof e.root === 'string' && path.isAbsolute(e.root) && within(e.root, e.canonical) &&
    typeof e.label === 'string' && e.label.length <= 1024;
  const saved = context.workspaceState.get(KEY, []);
  let entries = Array.isArray(saved) ? saved.filter(valid).slice(0, LIMIT) : [];
  let tail = Promise.resolve(), failedSave = false, disposed = false;
  context.subscriptions.push({dispose(){disposed=true;}});
  async function permitted(uri) {
    const actual = await fs.realpath(uri.fsPath);
    if (authorize) { if (await authorize(uri) !== actual) throw Error('The document changed location. Choose it again with Open Document.'); }
    else if (!within(await folderRoot(), actual)) throw Error('The notes folder changed or this document is outside the selected scope.');
    return actual;
  }
  const report = error => void vscode.window.showErrorMessage(`MRW: ${error.message}`);
  async function identity(uri) {
    if (!markdown(uri.fsPath)) return {label:path.basename(uri.fsPath)};
    const doc = vscode.workspace.textDocuments?.find(d => !d.isClosed && d.uri.toString() === uri.toString());
    if (doc) return noteIdentity(doc, {headingFallback: true});
    const file = await fs.open(uri.fsPath, 'r');
    try {
      const buffer = Buffer.alloc(65536), {bytesRead} = await file.read(buffer, 0, buffer.length, 0);
      return noteIdentity({uri, getText: () => buffer.subarray(0, bytesRead).toString('utf8')}, {headingFallback: true});
    } finally { await file.close(); }
  }
  function remember(uri, {opened = false} = {}) {
    if (disposed || uri?.scheme !== 'file' || !opened && !eligible(uri)) return Promise.resolve();
    const job = tail.catch(() => {}).then(async () => {
      if (disposed) return;
      let actual, root;
      try {
        actual = await permitted(uri);
        root = await folderRoot().catch(() => undefined);
        if (!root || !within(root, actual)) root = path.dirname(actual);
        if (!(await fs.stat(actual)).isFile()) return;
      } catch (_) { return; } // A missing file never becomes a recent entry.
      const info = await identity(uri);
      if (disposed || await permitted(uri) !== actual) return;
      const entry = {uri: uri.toString(), canonical: actual, root, label: info.label.slice(0, 1024)};
      if (entries[0]?.uri === entry.uri && entries[0]?.canonical === actual && entries[0]?.root === root && entries[0]?.label === entry.label && !failedSave) return;
      entries = [entry, ...entries.filter(e => e.canonical !== actual)].slice(0, LIMIT);
      try { await context.workspaceState.update(KEY, entries); failedSave = false; }
      catch (error) { failedSave = true; throw Error(`The document is open, but Recent Documents could not be saved: ${error.message}. Reopen the document to retry.`); }
    });
    tail = job; return job;
  }
  async function checkEntry(entry) {
    const uri = vscode.Uri.parse(entry.uri);
    if (uri.scheme !== 'file') throw Error('This recent document is not a local file.');
    const actual = await permitted(uri);
    if (actual !== entry.canonical || !within(entry.root, actual) || !(await fs.stat(actual)).isFile()) {
      throw Error('This recent document moved or now points elsewhere. Use Open Document to choose it again.');
    }
    return uri;
  }
  async function recent({validate = () => {}, openSelected = open} = {}) {
    await tail.catch(() => {});
    if (disposed) return;
    const choices = await Promise.all(entries.map(async entry => {
      try {
        const uri = await checkEntry(entry), info = await identity(uri);
        return {label: info.label, description: path.relative(entry.root, uri.fsPath), detail: uri.fsPath, entry};
      } catch (_) { return {label: entry.label, description: 'Unavailable — moved, missing or outside the selected scope', detail: entry.canonical, entry}; }
    }));
    choices.push({label:'VS Code file history…', description:'Includes files opened before MRW recorded them', action:'native'});
    const selected = await vscode.window.showQuickPick(choices, {title: 'Recent Documents', placeHolder: 'Notes, PDFs and other documents in this workspace', matchOnDescription: true, matchOnDetail: true});
    if (!selected || disposed) return;
    validate();
    if (selected.action === 'native') return vscode.commands.executeCommand('workbench.action.quickOpen');
    const uri = await checkEntry(selected.entry);
    validate();
    await openSelected(uri, selected.entry.canonical);
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
  active();
  return {remember, recent};
}
module.exports = {createRecentNotes};
