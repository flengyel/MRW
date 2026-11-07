'use strict';
// Ordinary host documents have their own scope and return pin. No retained-store
// authority, source import, ordinary-file writer or persistent note index lives here.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { digest } = require('./navigation');
const { qualifiedIdentifier, canonicalCitation } = require('./sourceIdentifiers');
const { parseReadingMarkdown } = require('./readingMarkdown');
const { buildNoteIndex, resolveNoteLink, backlinks, within, markdown } = require('./documentLinks');
const KEY = 'mrw.documents.v1';
function createDocuments({ vscode, context, register, trackLocation, onMarkdown = async () => {}, onNavigated = async () => {}, resolveReferences }) {
  const workspace = digest(JSON.stringify({ host: os.hostname(), remote: vscode.env.remoteName || '',
    workspace: vscode.workspace.workspaceFile?.toString(), folders: (vscode.workspace.workspaceFolders || []).map(f => f.uri.toString()) }));
  const remembered = context.workspaceState.get(KEY);
  const saved = remembered?.workspace === workspace ? remembered : {};
  let grants = Array.isArray(saved.grants) ? saved.grants.filter(g => typeof g.uri === 'string' && typeof g.canonical === 'string').slice(-100) : [];
  let folder = saved.folder && typeof saved.folder.uri === 'string' && typeof saved.folder.canonical === 'string' ? saved.folder : undefined;
  let last = typeof saved.last === 'string' ? saved.last : undefined;
  const pin = saved.origin;
  let origin = pin && typeof pin.uri === 'string' && (pin.fileOnly || (/^[a-f0-9]{64}$/.test(pin.revision) && Number.isSafeInteger(pin.start) && Number.isSafeInteger(pin.end) && pin.start >= 0 && pin.end >= pin.start)) ? pin : undefined;
  let latestDisplay;
  let generation = 0, publication = Promise.resolve();
  const candidates = new Set();
  function persist() {
    const value = { workspace, grants: [...grants], folder, last, origin };
    publication = publication.catch(() => {}).then(() => context.workspaceState.update(KEY, value));
    return publication;
  }
  async function canonical(uri) {
    if (uri?.scheme !== 'file') throw new Error('Choose a file on this extension host.');
    const actual = await fs.realpath(uri.fsPath);
    if (!(await fs.stat(actual)).isFile()) throw new Error('Choose a document file.');
    return actual;
  }
  async function folderRoot() {
    if (!folder?.uri || !folder?.canonical) throw new Error('Choose a notes folder with MRW: Choose Notes Folder. No parent folder is indexed automatically.');
    const uri = vscode.Uri.parse(folder.uri);
    if (uri.scheme !== 'file') throw new Error('Choose the notes folder on this extension host again.');
    const actual = await fs.realpath(uri.fsPath);
    if (actual !== folder.canonical || !(await fs.stat(actual)).isDirectory()) throw new Error('The selected notes folder moved or changed. Choose its current location.');
    return actual;
  }
  async function check(uri, newFile = false) {
    if (uri.scheme !== 'file') throw new Error('Choose a file on this extension host.');
    const actual = newFile ? await fs.realpath(path.dirname(uri.fsPath)) : await canonical(uri);
    for (const f of vscode.workspace.workspaceFolders || []) {
      if (f.uri.scheme === 'file' && within(await fs.realpath(f.uri.fsPath), actual)) return actual;
    }
    const grant = grants.find(g => g.uri === uri.toString());
    if (!newFile && grant) {
      if (grant.canonical !== actual) throw new Error('This selected document now resolves to a different file. Choose its current location.');
      return actual;
    }
    if (folder && within(await folderRoot(), actual)) return actual;
    throw new Error('This document is outside the selected scope. Use Open Document or Choose Notes Folder explicitly.');
  }
  async function grant(uri) {
    const actual = await canonical(uri);
    grants = [...grants.filter(g => g.uri !== uri.toString()), { uri: uri.toString(), canonical: actual }].slice(-100);
    await persist(); return actual;
  }
  async function overlays(root) {
    const result = new Map();
    for (const doc of vscode.workspace.textDocuments || []) {
      if (doc.uri.scheme === 'file' && doc.isDirty && !doc.isClosed) {
        try { const actual = await fs.realpath(doc.uri.fsPath); if (within(root, actual)) result.set(actual, doc.getText()); } catch (_) { /* Missing files remain errors, never substitutes. */ }
      }
    }
    return result;
  }
  async function index(qualifyPublished = false) {
    const root = await folderRoot();
    return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: 'Reading selected notes folder', cancellable: true },
      async (_progress, token) => {
        const result = await buildNoteIndex(root, { token, overrides: await overlays(root) });
        if (qualifyPublished) {
          const nodes = [...result.files.values()].flatMap(n => n.parsed.all).filter(n => n.kind === 'reference' && !n.qualified_id);
          const references = [...new Set(nodes.map(n => n.reference))];
          if (references.length && resolveReferences && !token?.isCancellationRequested) {
            try {
              const resolved = await resolveReferences(references.slice(0, 256));
              const identities = new Map(resolved.entries.filter(e => e.qualified_id).map(e => [e.reference,e.qualified_id]));
              for (const node of nodes) if (identities.has(node.reference)) node.qualified_id = identities.get(node.reference);
              for (const entry of resolved.entries.filter(e => e.error)) { result.complete = false; result.errors.push({code:'legacy_reference',message:entry.error}); }
            } catch (error) { result.complete = false; result.errors.push({code:'legacy_reference',message:error.message}); }
          }
          if (references.length > 256 || references.length && !resolveReferences) { result.complete = false; result.errors.push({code:'legacy_reference',message:'Some older references lack a verified source-qualified identity; their prefix was not guessed.'}); }
        }
        return result;
      });
  }
  function snapshot(doc, start, end) {
    const revision = digest(doc.getText());
    return { uri: doc.uri.toString(), revision, start, end, initial: { revision, start, end } };
  }
  async function repairSupersededDisplay() {
    // The host cannot cancel an already-issued open. A late completion must not
    // leave the editor on an obsolete destination after a newer open succeeded.
    const latest = latestDisplay;
    if (latest) await display(latest.uri, latest.location, generation);
    return false;
  }
  async function display(uri, location, attempt) {
    await check(uri);
    if (attempt !== generation) return false;
    if (markdown(uri.fsPath)) {
      const doc = await vscode.workspace.openTextDocument(uri);
      if (attempt !== generation) return false;
      if (location && (location.invalid || digest(doc.getText()) !== location.revision || location.end > doc.getText().length)) {
        throw new Error('The exact document location changed. Restore its text or select the intended location again.');
      }
      const version = doc.version;
      const editor = await vscode.window.showTextDocument(doc, { preview: false });
      if (attempt !== generation) return repairSupersededDisplay();
      if (version !== doc.version || doc.isClosed) throw new Error('The document changed while opening. Follow its current link again.');
      if (location) {
        const range = new vscode.Range(doc.positionAt(location.start), doc.positionAt(location.end));
        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
      }
      await onMarkdown(doc);
    } else if (/\.pdf$/i.test(uri.fsPath)) {
      const readers = [];
      for (const extension of vscode.extensions?.all || []) for (const editor of extension.packageJSON?.contributes?.customEditors || []) {
        if (editor.selector?.some(s => typeof s.filenamePattern === 'string' && path.matchesGlob((s.filenamePattern.includes('/') ? uri.fsPath : path.basename(uri.fsPath)).toLowerCase(), s.filenamePattern.toLowerCase()))) {
          readers.push({ label: editor.displayName || editor.viewType, viewType: editor.viewType });
        }
      }
      const reader = readers.length === 1 ? readers[0] : readers.length ? await vscode.window.showQuickPick(readers, { title: 'Choose PDF reader' }) : undefined;
      if (attempt !== generation) return false;
      if (!reader) {
        if (readers.length) return false;
        const action = await vscode.window.showInformationMessage('No installed PDF custom reader is available. MRW can ask the system reader to open this file; it cannot restore a PDF page.', 'Open with system reader');
        if (attempt !== generation || action !== 'Open with system reader') return false;
        if (!await vscode.env.openExternal(uri)) throw new Error('The system reader could not open this PDF. Choose an available host reader.');
      } else await vscode.commands.executeCommand('vscode.openWith', uri, reader.viewType, { preview: false });
    } else await vscode.commands.executeCommand('vscode.open', uri, { preview: false });
    if (attempt !== generation) return repairSupersededDisplay();
    latestDisplay = { uri, location: location ? { ...location, uri: uri.toString() } : undefined };
    return true;
  }
  async function pickerFolder() {
    if (!folder) return undefined;
    try { return vscode.Uri.file(await folderRoot()); }
    catch (_) { return undefined; } // A moved folder must not prevent choosing a new document.
  }
  async function open() {
    const attempt = ++generation;
    const choices = await vscode.window.showOpenDialog({ title: 'Open document in place', openLabel: 'Open Document', defaultUri: await pickerFolder(), canSelectFiles: true, canSelectFolders: false, canSelectMany: false });
    if (!choices?.length || attempt !== generation) return;
    await grant(choices[0]);
    if (await display(choices[0], undefined, attempt)) { last = choices[0].toString(); await persist(); await onNavigated(); }
  }
  async function chooseFolder() {
    const attempt = ++generation;
    const choices = await vscode.window.showOpenDialog({ title: 'Choose notes folder (Obsidian vault or ordinary folder)', openLabel: 'Use Notes Folder', defaultUri: await pickerFolder(), canSelectFiles: false, canSelectFolders: true, canSelectMany: false });
    if (!choices?.length || attempt !== generation) return;
    const actual = await fs.realpath(choices[0].fsPath);
    if (!(await fs.stat(actual)).isDirectory()) throw new Error('Choose a notes folder.');
    if (attempt !== generation) return;
    folder = { uri: choices[0].toString(), canonical: actual }; await persist();
  }
  async function resolve(doc, node) {
    await check(doc.uri);
    if (node.syntax === 'markdown' && (/^[a-z][a-z0-9+.-]*:/i.test(node.target) || /^[/\\]/u.test(node.target))) throw new Error('MRW follows relative local file links here. Open other targets explicitly through the host.');
    if (node.syntax === 'zettel') return resolveNoteLink(await index(), doc.uri.fsPath, node.target, node.syntax);
    // Relative-file navigation need not scan any directory. This temporary map
    // supplies heading text only; final scope is independently checked below.
    const source = await canonical(doc.uri), files = new Map();
    const marker = node.target.indexOf('#');
    let destination;
    try { destination = path.resolve(path.dirname(source), decodeURIComponent(marker < 0 ? node.target : node.target.slice(0, marker)) || path.basename(source)); }
    catch (_) { throw new Error('This link has invalid percent encoding.'); }
    const targetUri = vscode.Uri.file(destination);
    await check(targetUri);
    if (markdown(destination)) {
      const target = await vscode.workspace.openTextDocument(targetUri);
      files.set(await canonical(targetUri), { text: target.getText(), parsed: parseReadingMarkdown(target.getText()) });
    }
    return resolveNoteLink({ root: path.parse(source).root, files, ids: new Map(), complete: true }, source, node.target, node.syntax);
  }
  async function follow(doc, node) {
    const parsed = parseReadingMarkdown(doc.getText());
    const current = parsed.all.find(n => n.kind === 'document_link' && n.id === node.id && n.start === node.start && n.end === node.end && n.target === node.target && n.syntax === node.syntax);
    if (!current || (node.revision && node.revision !== parsed.revision)) throw new Error('The document link changed. Follow its current occurrence again.');
    const attempt = ++generation, candidate = { location: snapshot(doc, node.start, node.end) }; candidates.add(candidate);
    try {
      if (current.qualified_id) {
        await check(doc.uri);
        const opened = await vscode.env.openExternal(vscode.Uri.parse(canonicalCitation(current.qualified_id)));
        if (attempt !== generation) return;
        if (candidate.location.invalid || digest(doc.getText()) !== candidate.location.revision) throw new Error('The originating link changed while opening. Follow its current occurrence again.');
        if (opened) { origin = candidate.location; await persist(); await onNavigated(); return true; }
        throw new Error('The canonical published citation could not be opened.');
      }
      const resolved = await resolve(doc, node);
      if (attempt !== generation) return;
      if (!resolved.ok) throw new Error(resolved.error);
      if (candidate.location.invalid || digest(doc.getText()) !== candidate.location.revision) throw new Error('The originating link changed while opening. Follow its current occurrence again.');
      const uri = vscode.Uri.file(resolved.path);
      const location = resolved.heading && { revision: resolved.note.parsed.revision, start: resolved.heading.start, end: resolved.heading.end };
      if (!await display(uri, location, attempt)) return;
      origin = candidate.location; last = uri.toString(); await persist(); await onNavigated(); return true;
    } finally { candidates.delete(candidate); }
  }
  async function followAtCursor() {
    const editor = vscode.window.activeTextEditor, doc = editor?.document;
    if (!doc || !markdown(doc.uri.fsPath || '') || doc.uri.scheme !== 'file') throw new Error('Place the cursor on a link in a saved Markdown document.');
    const at = doc.offsetAt(editor.selection.active || editor.selection.start);
    const node = parseReadingMarkdown(doc.getText()).all.find(n => n.kind === 'document_link' && n.start <= at && at <= n.end);
    if (!node) throw new Error('Place the cursor on a Markdown file link or [[ID]] link.');
    return follow(doc, node);
  }
  async function showBacklinks(identifier) {
    const qualified = qualifiedIdentifier(identifier);
    if (identifier !== undefined && !qualified) throw new Error('Choose a complete source-qualified identifier.');
    const attempt = ++generation;
    const invocationEditor = vscode.window.activeTextEditor;
    const active = invocationEditor?.document?.uri;
    const uri = active?.scheme === 'file' ? active : last && vscode.Uri.parse(last);
    if (!uri && !qualified) throw new Error('Open a document before inspecting backlinks.');
    const invocationDoc = active?.scheme === 'file' && markdown(active.fsPath) ? invocationEditor.document : undefined;
    const pending = { location: invocationDoc ? snapshot(invocationDoc, invocationDoc.offsetAt(invocationEditor.selection.start), invocationDoc.offsetAt(invocationEditor.selection.end)) : { uri: uri?.toString(), fileOnly: true } };
    candidates.add(pending);
    try {
      if (!qualified) await check(uri);
      const result = await backlinks(await index(!!qualified), qualified || uri.fsPath);
      if (attempt !== generation) return;
      const notice = !result.complete ? `Incomplete backlinks${result.cancelled ? ' (cancelled)' : ''}: ${result.errors[0]?.message || 'index limit or cancellation'}.` : '';
      if (!result.occurrences.length) { await vscode.window.showInformationMessage(notice || 'No backlinks in the selected notes folder.'); return; }
      const choices = result.occurrences.map(hit => ({ label: `${path.relative(folder.canonical, hit.sourcePath)}:${hit.node.line + 1}`, description: hit.node.label, hit }));
      const choice = await vscode.window.showQuickPick(choices, { title: notice || 'Backlinks', placeHolder: 'Open the exact source occurrence' });
      if (!choice?.hit || attempt !== generation) return;
      const hit = choice.hit, source = await vscode.workspace.openTextDocument(vscode.Uri.file(hit.sourcePath));
      const node = parseReadingMarkdown(source.getText()).all.find(n => n.id === hit.node.id && n.start === hit.node.start && n.end === hit.node.end);
      if (!node || digest(source.getText()) !== hit.sourceRevision || source.getText().slice(node.start, node.end) !== hit.sourceText) throw new Error('The backlink changed. Inspect backlinks again.');
        if (await display(source.uri, snapshot(source, node.start, node.end), attempt)) { if (!qualified) origin = pending.location; last = source.uri.toString(); await persist(); await onNavigated(); }
    } finally { candidates.delete(pending); }
  }
  async function returnToDocument() {
    if (!origin) return false;
    const attempt = ++generation;
    const uri = vscode.Uri.parse(origin.uri);
    if (await display(uri, origin.fileOnly ? undefined : origin, attempt)) { last = uri.toString(); await persist(); }
    return true;
  }
  function changed(e) {
    if (!e.contentChanges.length) return;
    const uri = e.document.uri.toString();
    if (origin?.uri !== uri && latestDisplay?.location?.uri !== uri && ![...candidates].some(p => p.location.uri === uri)) return;
    const revision = digest(e.document.getText());
    if (latestDisplay?.location?.uri === uri) latestDisplay.location = trackLocation(latestDisplay.location, e.contentChanges, revision);
    if (origin?.uri === uri && !origin.fileOnly) origin = trackLocation(origin, e.contentChanges, revision);
    for (const pending of candidates) if (pending.location.uri === uri && !pending.location.fileOnly) pending.location = trackLocation(pending.location, e.contentChanges, revision);
    void persist().catch(error => vscode.window.showErrorMessage(`MRW: ${error.message}`));
  }
  register('mrw.openDocument', open);
  register('mrw.chooseNotesFolder', chooseFolder);
  register('mrw.followDocumentLink', followAtCursor);
  register('mrw.showBacklinks', showBacklinks);
  register('mrw.reopenDocument', async () => { if (!last) throw new Error('No document has been opened here. Use Open Document.'); await display(vscode.Uri.parse(last), undefined, ++generation); });
  return { check, grant, follow, changed, returnToDocument, restoreLatest: repairSupersededDisplay, hasOrigin: () => !!origin, supersede: () => { generation++; } };
}
module.exports = { createDocuments };
