'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { digest } = require('./navigation');
const { parseReadingMarkdown } = require('./readingMarkdown');
const { createDocuments } = require('./documents');
const { registerWikiLinks } = require('./wikiLinks');
const { noteIdentity } = require('./noteIdentity');
const { showMarkdownPreview, documentColumn: readingDocumentColumn } = require('./documentPresentation');
const { registerTutorial } = require('./tutorial');
const KEY = 'mrw.readingOutline.v1';

// A location follows only edits wholly outside its exact selected syntax.
// Overlap blocks return; undo restoring the original text restores the pin.
function trackLocation(pin, changes, revision) {
  if (!pin) return pin;
  if (pin.initial?.revision === revision) return { ...pin, ...pin.initial, invalid: false };
  let { start, end, invalid } = pin;
  if (!invalid) for (const c of [...changes].sort((a, b) => b.rangeOffset - a.rangeOffset)) {
    if (c.rangeOffset + c.rangeLength <= start) {
      const delta = c.text.length - c.rangeLength; start += delta; end += delta;
    } else if (c.rangeOffset < end) { invalid = true; break; }
  }
  return { ...pin, start, end, invalid: !!invalid, revision };
}
function validPin(pin) {
  return pin && typeof pin.uri === 'string' && /^[a-f0-9]{64}$/.test(pin.revision) &&
    Number.isSafeInteger(pin.start) && Number.isSafeInteger(pin.end) && pin.start >= 0 && pin.end >= pin.start;
}

function registerReadingOutline({ vscode, context, register, followReference, resolveReferences, onReturnChanged, onDocumentChange, savedDocuments, compile, sourcePlugins }) {
  const saved = context.workspaceState.get(KEY) || {};
  let overviewUri = typeof saved.uri === 'string' ? saved.uri : undefined;
  let document, model, timer, generation = 0, origin = validPin(saved.origin) ? saved.origin : undefined;
  let displayedUri;
  const differentDocument = () => displayedUri?.scheme === 'file' && displayedUri.toString() !== (document?.uri.toString() || overviewUri);
  let route = saved.route === 'ordinary' ? 'ordinary' : 'retained';
  let selected = validPin(saved.selected) ? saved.selected : undefined;
  let collapsed = new Set(Array.isArray(saved.collapsed) ? saved.collapsed.filter(x => typeof x === 'string').slice(0, 1000) : []);
  const pendingOrigins = new Set();
  const changed = new vscode.EventEmitter();
  const fail = error => vscode.window.showErrorMessage(`MRW: ${error.message}`);
  const state = () => ({ uri: overviewUri, route,
    collapsed: [...collapsed].slice(-1000), selected: selected?.uri.startsWith('file:') ? selected : undefined,
    origin: origin?.uri.startsWith('file:') ? origin : undefined });
  let publication = Promise.resolve();
  function persist() {
    if (document?.uri.scheme === 'file') overviewUri = document.uri.toString();
    const value = state();
    publication = publication.catch(() => {}).then(() => context.workspaceState.update(KEY, value));
    onReturnChanged?.();
    return publication;
  }
  function returnDestination(location = origin) {
    const citation = validPin(location);
    const target = citation ? location.uri : document?.uri.toString() || overviewUri;
    if (!target) return { kind: 'choose', label: 'Choose a document…', detail: 'Opened independently. Choose Markdown for Contents before returning.' };
    const uri = vscode.Uri.parse(target);
    const filename = path.basename(uri.path);
    return { kind: citation ? 'citation' : 'selected', label: `← ${citation ? 'Return to' : 'Open'} ${filename}`,
      path: uri.fsPath || target,
      detail: citation ? `From a document citation. Return to its exact occurrence in ${filename}.` : `Opened independently. Open the selected Contents document ${filename}; no citation occurrence was followed.` };
  }
  const provider = {
    onDidChangeTreeData: changed.event,
    getChildren: node => differentDocument() ? [] : node ? node.children : model?.roots || [],
    getTreeItem(node) {
      // Citation prose remains authoritative in Markdown. The tree shows its
      // short title; its original label and exact location remain in the tooltip.
      const title = node.kind === 'reference' ? node.label.split(' · ')[0] : node.label;
      const item = new vscode.TreeItem(Array.from(title).slice(0, 100).join(''), node.children.length ?
        (collapsed.has(node.id) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.Expanded) : vscode.TreeItemCollapsibleState.None);
      item.id = node.id; item.contextValue = 'mrw.documentSection';
      item.description = `${node.kind === 'heading' ? 'Heading' : node.kind === 'document_link' ? 'Link' : 'Source'} · line ${node.line + 1}`;
      item.tooltip = `${Array.from(node.label).slice(0, 600).join('')}\n${document.uri.fsPath || document.uri.toString()}:${node.line + 1}`;
      item.command = { command: 'mrw.selectReadingOutlineItem', title: 'Go to document location', arguments: [node] };
      return item;
    },
    getParent: node => model?.all.find(candidate => candidate.children.includes(node)),
  };
  const tree = vscode.window.createTreeView('mrw.readingOutline', { treeDataProvider: provider, showCollapseAll: true });
  function identifyDocument() {
    const uri = document?.uri || (overviewUri && vscode.Uri.parse(overviewUri));
    if (differentDocument()) {
      tree.description = path.basename(displayedUri.path);
      tree.message = `Contents is not showing ${displayedUri.fsPath || displayedUri.toString()}. ` +
        (/\.(md|markdown)$/i.test(displayedUri.path) ? 'Use Show Contents to select this Markdown document.' : 'MRW supplies Contents for Markdown only.') +
        (uri ? `\nSelected Markdown: ${uri.fsPath || uri.toString()}. Use Reveal Contents Document to return to it.` : '');
      return;
    }
    tree.description = uri ? `${path.basename(uri.path)}${document?.isDirty ? ' •' : ''}` : undefined;
    tree.message = uri ? `Contents: ${uri.fsPath || uri.toString()}` : undefined;
  }
  identifyDocument();
  // The initial empty view shows Contents guidance. Commands live in their
  // own native welcome view, independent of this tree and its document message.
  function refresh() {
    clearTimeout(timer);
    identifyDocument();
    if (!document || document.isClosed) { model = undefined; changed.fire(); return; }
    try {
      model = parseReadingMarkdown(document.getText());
      tree.description = `${noteIdentity(document).label}${document.isDirty ? ' •' : ''}`;
      for (const node of model.all) { node.revision = model.revision; node.uri = document.uri.toString(); }
      const notice = model.frontMatter?.malformed ? 'Malformed front matter: close the leading YAML block and correct its identity fields.' : model.roots.length ? '' : 'Add Markdown headings or file, note, or MRW passage links.';
      if (notice && !differentDocument()) tree.message += `\n${notice}`;
    } catch (error) { model = undefined; tree.message += `\n${error.message}`; }
    changed.fire();
  }
  const isOverview = doc => doc && !doc.isClosed && doc.languageId === 'markdown' && ['file', 'untitled'].includes(doc.uri.scheme);
  async function checkFile(uri) {
    return documents.check(uri);
  }
  async function checkDocument(doc) {
    if (!isOverview(doc) || /\.pdf$/i.test(doc.uri.path)) throw new Error('Choose an ordinary Markdown document.');
    if (doc.uri.scheme === 'file') await checkFile(doc.uri);
  }
  function pin(doc, start, end) {
    const revision = digest(doc.getText());
    return { uri: doc.uri.toString(), revision, start, end, initial: { revision, start, end } };
  }
  function documentColumn(doc) {
    return readingDocumentColumn(vscode, doc);
  }
  async function showLocation(doc, location) {
    await checkDocument(doc);
    if (location.invalid || digest(doc.getText()) !== location.revision || location.end > doc.getText().length) {
      throw new Error('The exact document location changed or is unavailable. No replacement was guessed; select the intended location in the document again.');
    }
    const version = doc.version;
    const editor = await vscode.window.showTextDocument(doc, { preview: false, viewColumn: documentColumn(doc) });
    if (doc.version !== version || doc.isClosed) throw new Error('The document changed while opening. Select its location again.');
    const range = new vscode.Range(doc.positionAt(location.start), doc.positionAt(location.end));
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    const focused = () => {
      const active = vscode.window.activeTextEditor;
      return active?.document === doc && active.viewColumn === editor.viewColumn && active.selection.isEqual(range) ? active : undefined;
    };
    if (focused()) return focused();
    return new Promise((resolve, reject) => {
      const listeners = [];
      let timer;
      const finish = error => {
        clearTimeout(timer); for (const listener of listeners) listener.dispose();
        if (error) reject(error); else resolve(focused());
      };
      const check = () => {
        if (doc.isClosed || doc.version !== version) finish(new Error('The document changed while opening. Select its location again.'));
        else if (focused()) finish();
      };
      listeners.push(vscode.window.onDidChangeActiveTextEditor(check));
      const selectionListener = vscode.window.onDidChangeTextEditorSelection?.(check);
      if (selectionListener) listeners.push(selectionListener);
      timer = setTimeout(() => finish(new Error('The selected document did not receive focus. Reveal it and select the location again.')), 2000);
      check();
    });
  }
  async function showReadingView(doc, column) {
    return showMarkdownPreview(vscode, doc, column);
  }
  async function openReadingOutline(choose = false, fromReader = false, revealSelected = false, targetUri) {
    const attempt = ++generation; documents.supersede();
    // Return prefers the selected document, including after restart. A text
    // editor left active behind a reader need not be that overview.
    let doc = choose ? undefined : fromReader || revealSelected ? document : vscode.window.activeTextEditor?.document;
    const previewUri = targetUri || vscode.window.tabGroups?.activeTabGroup?.activeTab?.input?.uri;
    if (!choose && !fromReader && !revealSelected && previewUri?.scheme === 'file') {
      if (!/\.(md|markdown)$/i.test(previewUri.path)) throw new Error('Contents is available for Markdown documents. Use this file’s reader for its own navigation.');
      await checkFile(previewUri);
      if (attempt !== generation) return;
      doc = await vscode.workspace.openTextDocument(previewUri);
    }
    if (!choose && !isOverview(doc) && isOverview(document)) doc = document;
    if (!choose && !isOverview(doc) && overviewUri) {
      const uri = vscode.Uri.parse(overviewUri);
      if (uri.scheme === 'file') {
        try {
          // Validate scope, including symlinks, before asking the host to read.
          await checkFile(uri);
          if (attempt !== generation) return;
          doc = await vscode.workspace.openTextDocument(uri);
        } catch (error) {
          if (!['ENOENT', 'ENOTDIR', 'FileNotFound'].includes(error.code)) throw error;
          // A deleted/renamed overview needs an explicit new choice, not a guess.
        }
      }
    }
    if (attempt !== generation) return;
    if (!isOverview(doc)) {
      const choices = await vscode.window.showOpenDialog({ title: 'Choose a Markdown document for Contents',
        openLabel: 'Show Contents', canSelectFiles: true, canSelectFolders: false, canSelectMany: false,
        filters: { Markdown: ['md', 'markdown'] }, defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri });
      if (attempt !== generation || !choices?.length) return;
      if (choices[0].scheme !== 'file' || !/\.(md|markdown)$/i.test(choices[0].path)) throw new Error('Choose a .md or .markdown document for Contents. Use Open Document for other formats.');
      await documents.grant(choices[0]);
      await checkFile(choices[0]);
      if (attempt !== generation) return;
      doc = await vscode.workspace.openTextDocument(choices[0]);
    }
    const column = documentColumn(doc);
    const opened = await selectOverview(doc, attempt, fromReader);
    if (opened && attempt === generation) {
      await showReadingView(doc, column);
    }
    return opened;
  }
  async function selectOverview(doc, attempt, fromReader = false) {
    await checkDocument(doc);
    if (attempt !== generation) return;
    await vscode.window.showTextDocument(doc, { preview: false, viewColumn: documentColumn(doc) });
    if (attempt !== generation) return;
    const previous = document?.uri.toString() || overviewUri;
    if (previous && previous !== doc.uri.toString()) { collapsed = new Set(); selected = undefined; }
    document = doc; displayedUri = doc.uri; refresh();
    if (!fromReader) await vscode.commands.executeCommand('mrw.readingOutline.focus');
    if (selected?.uri === doc.uri.toString() && model && selected.revision === model.revision) {
      await showLocation(doc, selected);
      const node = model.all.find(n => n.start === selected.start && n.end === selected.end);
      if (node) await tree.reveal(node, { select: true, focus: false });
    }
    await persist();
    documents.watchNotes();
    return model;
  }
  const documents = createDocuments({ vscode, context, register, trackLocation, resolveReferences, savedDocuments, sourcePlugins,
    onDisplayed: uri => { displayedUri = uri; refresh(); },
    onNavigated: async () => { route = 'ordinary'; await persist(); },
    onMarkdown: async doc => {
      generation++;
      if (document !== doc) { collapsed = new Set(); selected = undefined; }
      document = doc; refresh();
      tree.description = `${noteIdentity(doc).label}${doc.isDirty ? ' •' : ''}`;
      await persist();
    } });
  const tabsChanged = vscode.window.tabGroups?.onDidChangeTabs?.(() => {
    const uri = vscode.window.tabGroups.activeTabGroup?.activeTab?.input?.uri;
    if (uri?.scheme === 'file') { displayedUri = uri; refresh(); }
  });
  const groupsChanged = vscode.window.tabGroups?.onDidChangeTabGroups?.(() => {
    const uri = vscode.window.tabGroups.activeTabGroup?.activeTab?.input?.uri;
    if (uri?.scheme === 'file') { displayedUri = uri; refresh(); }
  });
  for (const listener of [tabsChanged, groupsChanged]) if (listener) context.subscriptions.push(listener);
  const wikiLinks = registerWikiLinks({ vscode, context, register, documents, compile });
  register('mrw.openReadingOutline', value => openReadingOutline(false, false, false, value?.scheme === 'file' ? value : undefined));
  register('mrw.editDocumentSource', async value => {
    const active = value?.scheme === 'file' ? value : vscode.window.tabGroups?.activeTabGroup?.activeTab?.input?.uri;
    let doc;
    if (active?.scheme === 'file') {
      if (!/\.(md|markdown)$/i.test(active.path)) throw new Error('Edit Document Source is available for Markdown documents.');
      await checkFile(active);
      doc = await vscode.workspace.openTextDocument(active);
    } else doc = document || vscode.window.activeTextEditor?.document;
    await checkDocument(doc);
    await vscode.window.showTextDocument(doc, { preview: false, viewColumn: readingDocumentColumn(vscode, doc) });
  });
  register('mrw.chooseReadingOverview', () => openReadingOutline(true));
  register('mrw.revealReadingDocument', () => openReadingOutline(false, false, true));
  registerTutorial({ vscode, context, register });
  register('mrw.refreshReadingOutline', () => { refresh(); return model; });
  register('mrw.selectReadingOutlineItem', async node => {
    const attempt = ++generation; documents.supersede();
    const source = document;
    if (!source || source.isClosed) throw new Error('Reopen the Markdown document with MRW: Show Contents.');
    refresh();
    const current = model?.all.find(n => n.id === node?.id);
    if (!current || current.uri !== node.uri || current.revision !== node.revision || current.start !== node.start || current.end !== node.end) {
      throw new Error('The document changed. Select its current navigator entry again.');
    }
    const location = pin(source, current.start, current.end);
    if (current.kind === 'document_link') { selected = location; return documents.follow(source, current); }
    const editor = await showLocation(source, location);
    if (attempt !== generation || source !== document) return documents.restoreLatest();
    selected = location;
    if (current.kind === 'reference') {
      documents.supersede();
      // Track a candidate during resolution without replacing the last source's
      // return pin. Both locations follow intervening edits; commit only once
      // the retained target has actually opened.
      const pending = { location }; pendingOrigins.add(pending);
      pending.release = () => pendingOrigins.delete(pending);
      let committed = false;
      try {
        const result = await followReference(current.reference, editor, { reading: true, returnContext: pending });
        if (attempt !== generation) return result;
        committed = true;
        origin = pending.location; route = 'retained';
        await persist(); return result;
      }
      finally { if (!committed) pending.release(); }
    }
    await showMarkdownPreview(vscode, source, editor.viewColumn);
    await persist();
  });
  async function returnToReadingOutline(options) {
    if (!options?.retained && route === 'ordinary' && await documents.returnToDocument()) return;
    documents.supersede();
    const destination = options && Object.hasOwn(options, 'location') ? options.location : origin;
    if (!validPin(destination)) return openReadingOutline(false, true);
    const uri = vscode.Uri.parse(destination.uri);
    if (!['file', 'untitled'].includes(uri.scheme)) {
      throw new Error('The originating document is unavailable in this workspace.');
    }
    if (uri.scheme === 'file') await checkFile(uri);
    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await showLocation(doc, destination);
    displayedUri = doc.uri;
    selected = destination;
    if (document !== doc) { document = doc; collapsed = new Set(); }
    refresh();
    await showReadingView(doc, editor.viewColumn);
    const node = model?.all.find(n => n.start === destination.start && n.end === destination.end);
    if (node) await tree.reveal(node, { select: true, focus: false });
    await persist();
  }
  register('mrw.returnToReadingOutline', returnToReadingOutline);
  context.subscriptions.push(changed, tree,
    tree.onDidCollapseElement(e => { collapsed.add(e.element.id); void persist().catch(fail); }),
    tree.onDidExpandElement(e => { collapsed.delete(e.element.id); void persist().catch(fail); }),
    vscode.workspace.onDidChangeTextDocument(e => {
      documents.changed(e); onDocumentChange?.(e);
      const uri = e.document.uri.toString();
      if (e.document !== document && uri !== origin?.uri && ![...pendingOrigins].some(p => p.location.uri === uri)) return;
      const revision = digest(e.document.getText());
      if (e.contentChanges.length) {
        if (origin?.uri === uri) origin = trackLocation(origin, e.contentChanges, revision);
        if (selected?.uri === uri) selected = trackLocation(selected, e.contentChanges, revision);
        for (const pending of pendingOrigins) if (pending.location.uri === uri) {
          pending.location = trackLocation(pending.location, e.contentChanges, revision);
        }
      }
      clearTimeout(timer); timer = setTimeout(() => { refresh(); void persist().catch(fail); }, 120);
    }),
    vscode.workspace.onDidCloseTextDocument(doc => { if (doc === document && doc.isClosed) refresh(); }),
    { dispose() { clearTimeout(timer); } });
  async function returnToStudy(origin, fileOnly = false) {
    if (!validPin(origin) || vscode.Uri.parse(origin.uri).scheme !== 'file') throw Error('The saved document destination is unavailable.');
    await checkFile(vscode.Uri.parse(origin.uri));
    if (!fileOnly) return returnToReadingOutline({ retained: true, location: origin });
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(origin.uri));
    await checkDocument(doc); selected = undefined; await selectOverview(doc, ++generation, true); await showReadingView(doc, documentColumn(doc));
  }
  return { currentLocation:()=>structuredClone(selected || (document && {uri:document.uri.toString(),revision:digest(document.getText()),start:0,end:0})), provider, refresh, checkFile, returnDestination, returnToStudy, openLinkedDocument:documents.openLinkedDocument, extendMarkdownIt: wikiLinks.extendMarkdownIt, handleDocumentUri: wikiLinks.handleUri };
}
module.exports = { registerReadingOutline, trackLocation };
