'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {within, markdown} = require('./documentLinks');
const {noteIdentity} = require('./noteIdentity');
const {validTextPosition, matchesTextPosition} = require('./navigation');
const KEY = 'mrw.recentNotes.v1';
const LIMIT = 30;
const TITLE_BYTES = 65536;
const CUE_LENGTH = 120;

function savedPosition(location) {
  if (!validTextPosition(location) || location.invalid) return undefined;
  const {revision, start, end} = location;
  return {revision, start, end};
}

function samePosition(a, b) {
  return a?.revision === b?.revision && a?.start === b?.start && a?.end === b?.end;
}

function passageCue(text, position) {
  if (!position?.end || !matchesTextPosition(text, position)) return '';
  const {start, end} = position;
  const lineStart = start ? text.lastIndexOf('\n', start - 1) + 1 : 0;
  const lineEnd = text.indexOf('\n', start);
  const from = start === end ? Math.max(lineStart, start - CUE_LENGTH / 2) : start;
  const to = start === end ? (lineEnd === -1 ? text.length : lineEnd) : end;
  const sample = text.slice(from, Math.min(to, from + 2 * CUE_LENGTH)).replace(/\s+/g, ' ').trim();
  const characters = Array.from(sample);
  const truncated = to > from + 2 * CUE_LENGTH || characters.length > CUE_LENGTH;
  return sample && characters.slice(0, CUE_LENGTH).join('') + (truncated ? '…' : '');
}

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
  async function identity(uri, actual, position) {
    if (!markdown(uri.fsPath)) return {label: path.basename(uri.fsPath)};
    const info = (text, cue) => ({
      ...noteIdentity({uri, getText: () => text}, {headingFallback: true}), cue,
    });
    const doc = vscode.workspace.textDocuments?.find(d => !d.isClosed && d.uri.toString() === uri.toString());
    if (doc) {
      const text = doc.getText();
      return info(text, passageCue(text, position));
    }
    const file = await fs.open(actual, 'r');
    try {
      const buffer = Buffer.alloc(TITLE_BYTES), {bytesRead} = await file.read(buffer, 0, buffer.length, 0);
      const text = buffer.subarray(0, bytesRead).toString('utf8');
      // Confirm the whole revision. The host may strip a UTF-8 BOM.
      if (!position || bytesRead !== (await file.stat()).size) return info(text);
      const cue = passageCue(text, position) || (text.startsWith('\uFEFF') ? passageCue(text.slice(1), position) : '');
      return info(text, cue);
    } finally { await file.close(); }
  }
  function enqueue(action) {
    const job = tail.catch(() => {}).then(() => {
      if (!disposed) return action();
    });
    tail = job;
    return job;
  }
  async function publish() {
    try { await context.workspaceState.update(KEY, entries); failedSave = false; }
    catch (error) { failedSave = true; throw Error(`Recent Documents could not be saved: ${error.message}. Reopen the document to retry.`); }
  }
  function remember(uri, {opened = false, location} = {}) {
    if (disposed || uri?.scheme !== 'file' || !opened && !eligible(uri)) return Promise.resolve();
    return enqueue(async () => {
      let actual, root;
      try {
        actual = await permitted(uri);
        root = await folderRoot().catch(() => undefined);
        if (!root || !within(root, actual)) root = path.dirname(actual);
        if (!(await fs.stat(actual)).isFile()) return;
      } catch (_) { return; } // A missing file never becomes a recent entry.
      const info = await identity(uri, actual);
      if (disposed || await permitted(uri) !== actual) return;
      const entry = {uri: uri.toString(), canonical: actual, root, label: info.label.slice(0, 1024)};
      const previous = entries.find(e => e.uri === entry.uri && e.canonical === actual);
      const position = savedPosition(location) || savedPosition(previous?.position);
      if (position) entry.position = position;
      if (previous && entries[0] === previous && previous.root === root && previous.label === entry.label &&
          samePosition(previous.position, position) && !failedSave) return;
      entries = [entry, ...entries.filter(e => e.canonical !== actual)].slice(0, LIMIT);
      await publish();
    });
  }
  function rememberPosition(location) {
    const position = savedPosition(location);
    if (!position || disposed) return Promise.resolve();
    return enqueue(async () => {
      const index = entries.findIndex(entry => entry.uri === location.uri);
      if (index < 0 || samePosition(entries[index].position, position) && !failedSave) return;
      entries = entries.map((entry, i) => i === index ? {...entry, position} : entry);
      await publish();
    });
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
        const uri = await checkEntry(entry);
        const info = await identity(uri, entry.canonical, savedPosition(entry.position));
        return {label: info.label, description: path.relative(entry.root, uri.fsPath),
          detail: info.cue ? `${info.cue} · ${uri.fsPath}` : uri.fsPath, entry};
      } catch (_) { return {label: entry.label, description: 'Unavailable — moved, missing or outside the selected scope', detail: entry.canonical, entry}; }
    }));
    choices.push({label:'VS Code file history…', description:'Includes files opened before MRW recorded them', action:'native'});
    const selected = await vscode.window.showQuickPick(choices, {title: 'Recent Documents', placeHolder: 'Notes, PDFs and other documents in this workspace', matchOnDescription: true, matchOnDetail: true});
    if (!selected || disposed) return;
    validate();
    if (selected.action === 'native') return vscode.commands.executeCommand('workbench.action.quickOpen');
    const uri = await checkEntry(selected.entry);
    validate();
    await openSelected(uri, selected.entry.canonical, savedPosition(selected.entry.position));
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
  return {remember, rememberPosition, recent};
}
module.exports = {createRecentNotes};
