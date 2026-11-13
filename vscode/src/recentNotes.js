'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {within, markdown} = require('./documentLinks');
const {noteIdentity} = require('./noteIdentity');
const KEY = 'mrw.recentNotes.v1';
const LIMIT = 30;

function createRecentNotes({vscode, context, folderRoot, open, eligible = () => true}) {
  const valid = e => e && typeof e.uri === 'string' && e.uri.length < 8192 &&
    typeof e.canonical === 'string' && path.isAbsolute(e.canonical) &&
    typeof e.root === 'string' && path.isAbsolute(e.root) && within(e.root, e.canonical) &&
    typeof e.label === 'string' && e.label.length <= 1024;
  const saved = context.workspaceState.get(KEY, []);
  let entries = Array.isArray(saved) ? saved.filter(valid).slice(0, LIMIT) : [];
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
    if (!choices.length) { await vscode.window.showInformationMessage(`No recent notes in ${root}. Open or create a note.`); return; }
    const selected = await vscode.window.showQuickPick(choices, {title: 'Recent Notes', placeHolder: root, matchOnDescription: true});
    if (!selected) return;
    const uri = await checkEntry(selected.entry, root);
    validate();
    await openSelected(uri);
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
  return {remember, recent};
}
module.exports = {createRecentNotes};
