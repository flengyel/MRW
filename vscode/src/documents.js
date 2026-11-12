'use strict';
// Ordinary host documents have their own scope and return pin. No retained-store
// authority, source import, ordinary-file writer or persistent note index lives here.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { digest } = require('./navigation');
const { qualifiedIdentifier, canonicalCitation } = require('./sourceIdentifiers');
const { parseReadingMarkdown, zettelLinkParts, wikiTarget } = require('./readingMarkdown');
const { buildNoteIndex, resolveNoteLink, backlinks, within, markdown } = require('./documentLinks');
const { showMarkdownPreview, documentColumn } = require('./documentPresentation');
const { windowsNoteFiles } = require('./noteFiles');
const { createNoteRefresh } = require('./noteRefresh');
const { DEFAULT_LIMITS } = require('./documentLinks');
const { workspaceRoute } = require('./companionLinks');
const { makeNoteLink, parseNoteLink } = require('./noteLinks');
const { noteIdentity } = require('./noteIdentity');
const { createDocumentPicker } = require('./documentPicker');
const KEY = 'mrw.documents.v1';
function createDocuments({ vscode, context, register, trackLocation, onMarkdown = async () => {}, onDisplayed = () => {}, onNavigated = async () => {}, resolveReferences, savedDocuments, sourcePlugins }) {
  const workspace = digest(JSON.stringify({ host: os.hostname(), remote: vscode.env.remoteName || '',
    workspace: vscode.workspace.workspaceFile?.toString(), folders: (vscode.workspace.workspaceFolders || []).map(f => f.uri.toString()) }));
  const remembered = context.workspaceState.get(KEY);
  const saved = remembered?.workspace === workspace ? remembered : {};
  let grants = Array.isArray(saved.grants) ? saved.grants.filter(g => typeof g.uri === 'string' && typeof g.canonical === 'string').slice(-100) : [];
  let folder = saved.folder && typeof saved.folder.uri === 'string' && typeof saved.folder.canonical === 'string' ? saved.folder : undefined;
  let recentFolders = Array.isArray(saved.recentFolders) ? saved.recentFolders.filter(validFolder).slice(0, 10) : [];
  let folderPublication = Promise.resolve();
  let last = typeof saved.last === 'string' ? saved.last : undefined;
  let lastLocation = saved.location && saved.location.uri === last && /^[a-f0-9]{64}$/.test(saved.location.revision) &&
    Number.isSafeInteger(saved.location.start) && Number.isSafeInteger(saved.location.end) &&
    saved.location.start >= 0 && saved.location.end >= saved.location.start ? saved.location : undefined;
  const pin = saved.origin;
  let origin = pin && typeof pin.uri === 'string' && (pin.fileOnly || (/^[a-f0-9]{64}$/.test(pin.revision) && Number.isSafeInteger(pin.start) && Number.isSafeInteger(pin.end) && pin.start >= 0 && pin.end >= pin.start)) ? pin : undefined;
  let latestDisplay;
  let generation = 0, publication = Promise.resolve(), chooser;
  function supersede() { chooser?.cancel(); return ++generation; }
  const candidates = new Set();
  context.subscriptions.push({dispose:()=>chooser?.cancel()});
  const noteRefresh = createNoteRefresh({ vscode, context, check, isNote });
  function persist() {
    const value = { workspace, grants: [...grants], folder, recentFolders: [...recentFolders], last, origin, location: lastLocation };
    publication = publication.catch(() => {}).then(() => context.workspaceState.update(KEY, value));
    return publication;
  }
  async function canonical(uri) {
    if (uri?.scheme !== 'file') throw new Error('Choose a file on this extension host.');
    const actual = await fs.realpath(uri.fsPath);
    if (!(await fs.stat(actual)).isFile()) throw new Error('Choose a document file.');
    return actual;
  }
  function configuredFolder() {
    return vscode.workspace.getConfiguration?.('mrw').get('notesFolder', '') || '';
  }
  async function folderRoot() {
    const configured = configuredFolder();
    if (configured) {
      if (typeof configured !== 'string' || !path.isAbsolute(configured)) throw new Error('MRW: Notes Folder must be an absolute path on this extension host. In WSL use /mnt/c/… for a Windows folder.');
      const uri = vscode.Uri.file(configured);
      if (folder?.uri !== uri.toString()) {
        const actual = await fs.realpath(configured);
        if (!(await fs.stat(actual)).isDirectory()) throw new Error('MRW: Notes Folder must name a folder.');
        folder = { uri: uri.toString(), canonical: actual }; await persist();
      }
    }
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
    if ((folder || configuredFolder()) && within(await folderRoot(), actual)) return actual;
    throw new Error('This document is outside the selected scope. Use Open Document or Choose Notes Folder explicitly.');
  }
  async function grant(uri, expected) {
    const actual = await canonical(uri);
    if (expected && actual !== expected) throw new Error('The chosen document changed while opening. Choose its current location.');
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
  async function index(qualifyPublished = false, lookupId) {
    const root = await folderRoot();
    return vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: lookupId === undefined ? 'Reading selected notes folder' : 'Finding linked note', cancellable: true },
      async (_progress, token) => {
        const catalogue = lookupId === undefined ? undefined : await windowsNoteFiles(root, { token, limits: DEFAULT_LIMITS, remoteName: vscode.env.remoteName });
        const result = await buildNoteIndex(root, { token, overrides: await overlays(root), lookupId, catalogue });
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
  function validateOrigin(doc, candidate) {
    const location = candidate.location;
    if (location.fileOnly) return;
    if (!doc || doc.isClosed || location.invalid || digest(doc.getText()) !== location.revision) {
      throw new Error('The originating document location changed while opening. Select its current occurrence again.');
    }
  }
  async function repairSupersededDisplay() {
    // The host cannot cancel an already-issued open. A late completion must not
    // leave the editor on an obsolete destination after a newer open succeeded.
    const latest = latestDisplay;
    if (latest) await display(latest.uri, latest.location, generation);
    return false;
  }
  async function display(uri, location, attempt, validate) {
    let shownLocation;
    await check(uri);
    if (attempt !== generation) return false;
    validate?.();
    if (markdown(uri.fsPath)) {
      const doc = await vscode.workspace.openTextDocument(uri);
      if (attempt !== generation) return false;
      validate?.();
      if (location && (location.invalid || digest(doc.getText()) !== location.revision || location.end > doc.getText().length)) {
        throw new Error('The exact document location changed. Restore its text or select the intended location again.');
      }
      const version = doc.version;
      const editor = await vscode.window.showTextDocument(doc, { preview: false, viewColumn: documentColumn(vscode, doc) });
      if (attempt !== generation) return repairSupersededDisplay();
      if (version !== doc.version || doc.isClosed) throw new Error('The document changed while opening. Follow its current link again.');
      if (location) {
        const range = new vscode.Range(doc.positionAt(location.start), doc.positionAt(location.end));
        editor.selection = new vscode.Selection(range.start, range.end);
        editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
      }
      shownLocation = snapshot(doc, doc.offsetAt(editor.selection.start), doc.offsetAt(editor.selection.end));
      await onMarkdown(doc);
      if (attempt !== generation) return repairSupersededDisplay();
      await showMarkdownPreview(vscode, doc, editor.viewColumn);
      noteRefresh.start();
      if (version !== doc.version || doc.isClosed) throw new Error('The document changed while opening. Follow its current link again.');
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
    // Opening yields to editor work: validate the tracked origin again before
    // publishing either this display or the new Return destination.
    validate?.();
    latestDisplay = { uri, location: shownLocation };
    lastLocation = shownLocation;
    onDisplayed(uri);
    return true;
  }
  function validFolder(value) {
    if (!value || typeof value.uri !== 'string' || typeof value.canonical !== 'string' ||
        value.uri.length > 8192 || value.canonical.length > 4096 || !path.isAbsolute(value.canonical)) return false;
    try { return vscode.Uri.parse(value.uri).scheme === 'file'; } catch (_) { return false; }
  }
  function currentFolderUri() {
    const configured = configuredFolder();
    if (configured) return typeof configured === 'string' && path.isAbsolute(configured) ? vscode.Uri.file(configured) : undefined;
    return validFolder(folder) ? vscode.Uri.parse(folder.uri) : undefined;
  }
  async function selectedFolder(uri, expected) {
    if (uri?.scheme !== 'file') throw Error('Choose a notes folder on this extension host.');
    let actual;
    try {
      actual = await fs.realpath(uri.fsPath);
      if (!(await fs.stat(actual)).isDirectory()) throw Error('Not a folder');
    } catch (_) { throw Error(`Notes folder is unavailable: ${uri.fsPath}. Browse for its current location. The selected folder has not changed.`); }
    if (expected && actual !== expected) throw Error(`Notes folder now resolves to a different location: ${uri.fsPath}. Browse to select it again. The selected folder has not changed.`);
    return { uri: uri.toString(), canonical: actual };
  }
  async function pickerFolder(current) {
    // Resolve suggestions without granting scope or changing persisted state.
    // Always supply a default, so the host cannot reuse an unrelated file dialog.
    const locations = [current, ...recentFolders.map(f => vscode.Uri.parse(f.uri)),
      vscode.workspace.workspaceFolders?.[0]?.uri, vscode.Uri.file(os.homedir())];
    for (const uri of locations) {
      if (uri?.scheme !== 'file') continue;
      try { if ((await fs.stat(uri.fsPath)).isDirectory()) return uri; } catch (_) { /* Try the next explicit location. */ }
    }
    return vscode.Uri.file(os.homedir());
  }
  function ordinaryUri() {
    return vscode.window.activeTextEditor?.document.uri || vscode.window.tabGroups?.activeTabGroup?.activeTab?.input?.uri;
  }
  async function open() {
    const attempt = supersede(), invocation = ordinaryUri();
    const session = createDocumentPicker(vscode, {
      initialFolder: () => {
        const configured=configuredFolder();
        return typeof configured==='string'&&path.isAbsolute(configured)?configured:
          folder?.uri?vscode.Uri.parse(folder.uri).fsPath:vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      },
      remoteName: vscode.env.remoteName,
      dirtyText: file => vscode.workspace.textDocuments?.find(d => d.uri.fsPath === file && d.isDirty && !d.isClosed)?.getText(),
      listSaved: savedDocuments ? token => savedDocuments.list(token, invocation) : undefined,
    });
    chooser = session;
    const choice = await session.result;
    if (chooser === session) chooser = undefined;
    if (!choice || attempt !== generation) return;
    if (choice.action === 'saved') return vscode.commands.executeCommand('mrw.openOutline');
    if (choice.action === 'saved-file') return savedDocuments.open(choice);
    let selected, expected;
    if (choice.action === 'file') {
      const uri = vscode.Uri.file(choice.file), currentFolder = await fs.realpath(choice.currentFolder);
      expected = await canonical(uri);
      if (currentFolder !== choice.folder || !within(currentFolder, expected)) throw new Error('The chosen note moved outside the browsing folder. Browse for its current location.');
      selected = uri;
    } else {
      const choices = await vscode.window.showOpenDialog({ title: 'Open original document in place', openLabel: 'Open Document',
        defaultUri: choice.currentFolder ? vscode.Uri.file(choice.currentFolder) : undefined, canSelectFiles: true, canSelectFolders: false, canSelectMany: false });
      selected = choices?.[0];
    }
    if (!selected || attempt !== generation) return;
    await grant(selected, expected);
    if (await display(selected, undefined, attempt)) { last = selected.toString(); await persist(); await onNavigated(); }
  }
  async function chooseFolder() {
    const attempt = supersede(), current = currentFolderUri();
    const entries = [];
    if (current) entries.push({ label: path.basename(current.fsPath) || current.fsPath,
      description: 'Current', detail: current.fsPath, uri: current,
      canonical: folder?.uri === current.toString() ? folder.canonical : undefined });
    const seen = new Set(current ? [current.toString()] : []);
    for (const item of recentFolders) {
      if (seen.has(item.uri)) continue;
      seen.add(item.uri);
      const uri = vscode.Uri.parse(item.uri);
      entries.push({ label: path.basename(uri.fsPath) || uri.fsPath, description: 'Recent',
        detail: uri.fsPath, uri, canonical: item.canonical });
    }
    entries.push({ label: 'Browse for notes folder…', action: 'browse', detail: 'Select an Obsidian vault or an ordinary notes folder. Files stay in place.' });
    const choice = await vscode.window.showQuickPick(entries, { title: 'Choose Notes Folder',
      placeHolder: current ? `Current notes folder: ${current.fsPath}` : 'Choose a notes folder for note links and backlinks.',
      matchOnDescription: true, matchOnDetail: true });
    if (!choice || attempt !== generation) return;
    let uri = choice.uri;
    if (choice.action === 'browse') {
      const defaultUri = await pickerFolder(current);
      if (attempt !== generation) return;
      const choices = await vscode.window.showOpenDialog({ title: 'Choose notes folder (Obsidian vault or ordinary folder)',
        openLabel: 'Use Notes Folder', defaultUri, canSelectFiles: false, canSelectFolders: true, canSelectMany: false });
      uri = choices?.[0];
    }
    if (!uri || attempt !== generation) return;
    const selected = await selectedFolder(uri, choice.canonical);
    let previous;
    if (current) {
      try { previous = await selectedFolder(current, folder?.uri === current.toString() ? folder.canonical : undefined); }
      catch (_) { if (folder?.uri === current.toString()) previous = folder; }
    }
    // Serialize settings writes so a delayed older choice cannot overwrite a newer one.
    folderPublication = folderPublication.catch(() => {}).then(async () => {
      if (attempt !== generation) return;
      const configuration = vscode.workspace.getConfiguration?.('mrw');
      if (configuration?.update && configuredFolder() !== uri.fsPath) {
        await configuration.update('notesFolder', uri.fsPath, vscode.ConfigurationTarget.Workspace);
      }
      if (attempt !== generation) return;
      folder = selected;
      const distinct = new Set();
      recentFolders = [selected, previous, ...recentFolders].filter(item => {
        if (!validFolder(item) || distinct.has(item.canonical)) return false;
        distinct.add(item.canonical); return true;
      }).slice(0, 10);
      try { await persist(); }
      catch (error) { throw Error(`Notes folder selected: ${uri.fsPath}. Folder history could not be saved: ${error.message}. Choose this folder again to retry.`); }
      if (attempt === generation) await vscode.window.showInformationMessage(`Notes folder: ${uri.fsPath}`);
    });
    return folderPublication;
  }
  // Explicit companion selection grants one verified file, never its parent.
  // Reuse the document reader and exact Return pin, including dirty note text.
  async function openLinkedDocument(uri, from) {
    const attempt = supersede(), pending = from ? { location: structuredClone(from) } : undefined;
    if (pending) candidates.add(pending);
    try {
      const doc = pending && await vscode.workspace.openTextDocument(vscode.Uri.parse(pending.location.uri));
      if (pending) await check(doc.uri);
      const validate = () => { if (pending) validateOrigin(doc, pending); };
      validate(); await grant(uri);
      if (!await display(uri, undefined, attempt, validate)) return false;
      if (pending) origin = pending.location;
      last = uri.toString(); await persist(); await onNavigated(); return true;
    } finally { if (pending) candidates.delete(pending); }
  }
  async function resolve(doc, node) {
    await check(doc.uri);
    if (node.syntax === 'markdown' && (/^[a-z][a-z0-9+.-]*:/i.test(node.target) || /^[/\\]/u.test(node.target))) throw new Error('MRW follows relative local file links here. Open other targets explicitly through the host.');
    if (node.syntax === 'zettel') {
      const wiki = wikiTarget(node.target);
      if (wiki.lookupId) return resolveNoteLink(await index(false, wiki.lookupId), doc.uri.fsPath, node.target, node.syntax);
      const root = await folderRoot();
      let file = wiki.file ? path.resolve(wiki.file.startsWith('./') || wiki.file.startsWith('../') ? path.dirname(doc.uri.fsPath) : root, wiki.file) : doc.uri.fsPath;
      if (wiki.file && !markdown(file)) file += '.md';
      const uri = vscode.Uri.file(file); await check(uri);
      if (!within(root, await canonical(uri))) throw Error('This WikiLink leaves the selected notes folder.');
      const target = await vscode.workspace.openTextDocument(uri);
      return resolveNoteLink({ root, files: new Map([[await canonical(uri), { text: target.getText(), parsed: parseReadingMarkdown(target.getText()) }]]), ids: new Map(), complete: true }, doc.uri.fsPath, node.target, node.syntax);
    }
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
    const attempt = supersede(), candidate = { location: snapshot(doc, node.start, node.end) }; candidates.add(candidate);
    try {
      if (current.qualified_id) {
        await check(doc.uri);
        await sourcePlugins?.load();
        const opened = await vscode.env.openExternal(vscode.Uri.parse(canonicalCitation(current.target || current.qualified_id)));
        if (attempt !== generation) return;
        validateOrigin(doc, candidate);
        if (opened) { origin = candidate.location; await persist(); await onNavigated(); return true; }
        throw new Error('The canonical published citation could not be opened.');
      }
      const resolved = await resolve(doc, node);
      if (attempt !== generation) return;
      if (!resolved.ok) throw new Error(resolved.error);
      validateOrigin(doc, candidate);
      const uri = vscode.Uri.file(resolved.path);
      const location = resolved.heading && { revision: resolved.note.parsed.revision, start: resolved.heading.start, end: resolved.heading.end };
      if (!await display(uri, location, attempt, () => validateOrigin(doc, candidate))) return;
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
    const attempt = supersede();
    const invocationEditor = vscode.window.activeTextEditor;
    // A rendered Markdown custom editor has no activeTextEditor. Use its URI,
    // not an unrelated text editor left visible in another group.
    const previewUri = vscode.window.tabGroups?.activeTabGroup?.activeTab?.input?.uri;
    const active = previewUri || invocationEditor?.document?.uri;
    const uri = active?.scheme === 'file' ? active : last && vscode.Uri.parse(last);
    if (!uri && !qualified) throw new Error('Open a document before inspecting backlinks.');
    const invocationDoc = active?.scheme === 'file' && markdown(active.fsPath) && invocationEditor?.document.uri.toString() === active.toString() ? invocationEditor.document : undefined;
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
      const validate = qualified ? undefined : () => validateOrigin(invocationDoc, pending);
      validate?.();
      const hit = choice.hit, sourceUri = vscode.Uri.file(hit.sourcePath);
      // The picker is a snapshot, not permission to read its old pathname.
      // Recheck redirects/scope before asking the host to load current contents.
      await check(sourceUri);
      if (attempt !== generation) return;
      validate?.();
      const source = await vscode.workspace.openTextDocument(sourceUri);
      if (attempt !== generation) return;
      const node = parseReadingMarkdown(source.getText()).all.find(n => n.id === hit.node.id && n.start === hit.node.start && n.end === hit.node.end);
      if (!node || digest(source.getText()) !== hit.sourceRevision || source.getText().slice(node.start, node.end) !== hit.sourceText) throw new Error('The backlink changed. Inspect backlinks again.');
      if (await display(source.uri, snapshot(source, node.start, node.end), attempt, validate)) {
        if (!qualified) origin = pending.location;
        last = source.uri.toString(); await persist(); await onNavigated();
      }
    } finally { candidates.delete(pending); }
  }
  async function returnToDocument() {
    if (!origin) return false;
    const attempt = supersede();
    const uri = vscode.Uri.parse(origin.uri);
    if (await display(uri, origin.fileOnly ? undefined : origin, attempt)) { last = uri.toString(); await persist(); }
    return true;
  }
  function changed(e) {
    if (!e.contentChanges.length) return;
    const uri = e.document.uri.toString();
    if (origin?.uri !== uri && lastLocation?.uri !== uri && latestDisplay?.location?.uri !== uri && ![...candidates].some(p => p.location.uri === uri)) return;
    const revision = digest(e.document.getText());
    if (latestDisplay?.location?.uri === uri) latestDisplay.location = trackLocation(latestDisplay.location, e.contentChanges, revision);
    if (lastLocation?.uri === uri) lastLocation = trackLocation(lastLocation, e.contentChanges, revision);
    if (origin?.uri === uri && !origin.fileOnly) origin = trackLocation(origin, e.contentChanges, revision);
    for (const pending of candidates) if (pending.location.uri === uri && !pending.location.fileOnly) pending.location = trackLocation(pending.location, e.contentChanges, revision);
    void persist().catch(error => vscode.window.showErrorMessage(`MRW: ${error.message}`));
  }
  function isNote(uri) {
    const root = configuredFolder() || folder?.canonical;
    return uri?.scheme === 'file' && markdown(uri.fsPath || '') && typeof root === 'string' && path.isAbsolute(root) && within(root, uri.fsPath);
  }
  async function openInObsidian(value) {
    const selected = vscode.window.tabGroups?.activeTabGroup?.activeTab?.input?.uri || vscode.window.activeTextEditor?.document?.uri;
    const uri = value?.scheme ? value : selected || (last && vscode.Uri.parse(last));
    if (!uri || !isNote(uri)) throw new Error('Open a Markdown note in the selected notes folder before opening it in Obsidian.');
    await check(uri);
    const root = await folderRoot(), actual = await canonical(uri);
    if (!within(root, actual)) throw new Error('This note is outside the selected notes folder.');
    if (!(await fs.stat(path.join(root, '.obsidian')).catch(() => undefined))?.isDirectory()) throw new Error('The selected notes folder is not an Obsidian vault. Choose its root folder.');
    const configured = vscode.workspace.getConfiguration?.('mrw').get('obsidianVault', '') || '';
    const vault = configured || path.basename(root);
    if (typeof vault !== 'string' || vault.includes('/') || vault.includes('\\') || [...vault].some(c => c.charCodeAt(0) < 32)) throw new Error('MRW: Obsidian Vault must be its name or vault ID.');
    const relative = path.relative(root, actual).split(path.sep).join('/');
    const target = vscode.Uri.from({ scheme: 'obsidian', authority: 'vault', path: `/${vault}/${relative}` });
    const doc = vscode.workspace.textDocuments?.find(d => d.uri.toString() === uri.toString());
    if (doc?.isDirty) void vscode.window.showInformationMessage('This note has unsaved VS Code changes. Obsidian will open the saved file; the VS Code draft is preserved.');
    if (!await vscode.env.openExternal(target)) throw new Error('Obsidian could not be opened. Check that it is installed and its URI handler is registered.');
    return true;
  }
  async function noteWorkspace() {
    const folders = vscode.workspace.workspaceFolders || [];
    if (!vscode.workspace.workspaceFile && (folders.length !== 1 || folders[0].uri.scheme !== 'file')) {
      throw new Error('Open a folder or save the workspace before copying a note link.');
    }
    const root = folders[0]?.uri.scheme === 'file' ? await fs.realpath(folders[0].uri.fsPath) : undefined;
    return workspaceRoute(vscode, root);
  }
  async function copyLink(value) {
    const selected = vscode.window.tabGroups?.activeTabGroup?.activeTab?.input?.uri || vscode.window.activeTextEditor?.document?.uri;
    const uri = value?.scheme ? value : selected || (last && vscode.Uri.parse(last));
    if (!uri || !isNote(uri)) throw new Error('Open a Markdown note in the selected notes folder before copying its MRW link.');
    await check(uri);
    const notes = await folderRoot(), actual = await canonical(uri);
    if (!within(notes, actual)) throw new Error('This note is outside the selected notes folder.');
    const link = makeNoteLink({ workspace: await noteWorkspace(), notes, file: path.relative(notes, actual).split(path.sep).join('/') }, vscode.env.uriScheme || 'vscode');
    const doc = await vscode.workspace.openTextDocument(uri);
    const label = `${noteIdentity(doc).label} — MRW`.replace(/\s+/gu, ' ').replace(/[\\[\]]/gu, '\\$&');
    await vscode.env.clipboard.writeText(`[${label}](${link})`);
    void vscode.window.showInformationMessage('MRW note link copied. Paste it into Obsidian.');
    return link;
  }
  async function handleUri(uri) {
    if (uri.path !== '/note') return false;
    if (vscode.workspace.isTrusted === false) throw new Error('Open and trust the intended workspace before following the MRW note link.');
    const value = uri.toString(true), target = parseNoteLink(value, vscode.env.uriScheme || 'vscode');
    const attempt = supersede();
    const here = await noteWorkspace().catch(() => undefined);
    if (here !== target.workspace) {
      const choice = await vscode.window.showWarningMessage(`This note link belongs to ${target.workspace}. Open that workspace in a separate window, then run MRW: Open Link from Clipboard.`, 'Copy Link and Open Workspace');
      if (choice === 'Copy Link and Open Workspace' && attempt === generation) {
        await vscode.env.clipboard.writeText(value);
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.parse(target.workspace), { forceNewWindow: true });
      }
      return true;
    }
    const notes = await folderRoot();
    if (notes !== target.notes) throw new Error('This note link belongs to a different notes folder. Select its vault root with MRW: Choose Notes Folder, then open the link again.');
    const destination = vscode.Uri.file(path.join(notes, target.file));
    await check(destination);
    if (!within(notes, await canonical(destination))) throw new Error('This note resolves outside its linked notes folder.');
    if (await display(destination, undefined, attempt)) { last = destination.toString(); await persist(); await onNavigated(); }
    return true;
  }
  register('mrw.copyDocumentLink', copyLink);
  register('mrw.openDocumentInObsidian', openInObsidian);
  register('mrw.openDocument', open);
  register('mrw.chooseNotesFolder', chooseFolder);
  register('mrw.followDocumentLink', followAtCursor);
  register('mrw.showBacklinks', showBacklinks);
  const selectionChanged = vscode.window.onDidChangeTextEditorSelection?.(event => {
    const doc = event.textEditor?.document, range = event.selections?.[0];
    if (!range || doc?.isClosed || doc?.uri.toString() !== last || !markdown(doc.uri.fsPath)) return;
    lastLocation = snapshot(doc, doc.offsetAt(range.start), doc.offsetAt(range.end));
    if (latestDisplay?.uri.toString() === last) latestDisplay.location = lastLocation;
    void persist().catch(error => vscode.window.showErrorMessage(`MRW: ${error.message}`));
  });
  if (selectionChanged) context.subscriptions.push(selectionChanged);
  register('mrw.reopenDocument', async () => { if (!last) throw new Error('No document has been opened here. Use Open Document.'); await display(vscode.Uri.parse(last), lastLocation, supersede()); });
  return { check, grant, follow, changed, isNote, openInObsidian, copyLink, handleUri, openLinkedDocument, watchNotes: noteRefresh.start, returnToDocument, restoreLatest: repairSupersededDisplay, hasOrigin: () => !!origin, supersede };
}
module.exports = { createDocuments };
