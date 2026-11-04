'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { digest } = require('./navigation');
const { parseReadingMarkdown } = require('./readingMarkdown');
const KEY = 'mrw.readingOutline.v1';
const STARTER = '# Reading overview\n\n## Current question\n\n## Sources and passages\n\n## Working notes\n\n## Next step\n';

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

function registerReadingOutline({ vscode, context, register, followReference }) {
  const saved = context.workspaceState.get(KEY) || {};
  let overviewUri = typeof saved.uri === 'string' ? saved.uri : undefined;
  let document, model, timer, generation = 0, origin = validPin(saved.origin) ? saved.origin : undefined;
  let selected = validPin(saved.selected) ? saved.selected : undefined;
  let collapsed = new Set(Array.isArray(saved.collapsed) ? saved.collapsed.filter(x => typeof x === 'string').slice(0, 1000) : []);
  const pendingOrigins = new Set();
  const changed = new vscode.EventEmitter();
  const fail = error => vscode.window.showErrorMessage(`MRW: ${error.message}`);
  const state = () => ({ uri: overviewUri,
    collapsed: [...collapsed].slice(-1000), selected: selected?.uri.startsWith('file:') ? selected : undefined,
    origin: origin?.uri.startsWith('file:') ? origin : undefined });
  let publication = Promise.resolve();
  function persist() {
    if (document?.uri.scheme === 'file') overviewUri = document.uri.toString();
    const value = state();
    publication = publication.catch(() => {}).then(() => context.workspaceState.update(KEY, value));
    return publication;
  }
  const provider = {
    onDidChangeTreeData: changed.event,
    getChildren: node => node ? node.children : model?.roots || [],
    getTreeItem(node) {
      // Citation prose remains authoritative in Markdown. The tree shows its
      // short title; its original label and exact location remain in the tooltip.
      const title = node.kind === 'reference' ? node.label.split(' · ')[0] : node.label;
      const item = new vscode.TreeItem(Array.from(title).slice(0, 100).join(''), node.children.length ?
        (collapsed.has(node.id) ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.Expanded) : vscode.TreeItemCollapsibleState.None);
      item.id = node.id;
      item.description = `${node.kind === 'heading' ? 'Heading' : 'Source'} · line ${node.line + 1}`;
      item.tooltip = `${Array.from(node.label).slice(0, 600).join('')}\n${document.uri.fsPath || document.uri.toString()}:${node.line + 1}`;
      item.command = { command: 'mrw.selectReadingOutlineItem', title: 'Open reading location', arguments: [node] };
      return item;
    },
    getParent: node => model?.all.find(candidate => candidate.children.includes(node)),
  };
  const tree = vscode.window.createTreeView('mrw.readingOutline', { treeDataProvider: provider, showCollapseAll: true });
  // Leave the initial view empty so VS Code displays the contributed welcome
  // content and its labelled Open Reading Outline button.
  function refresh() {
    clearTimeout(timer);
    if (!document || document.isClosed) { model = undefined; changed.fire(); return; }
    try {
      model = parseReadingMarkdown(document.getText());
      for (const node of model.all) { node.revision = model.revision; node.uri = document.uri.toString(); }
      tree.description = `${path.basename(document.uri.path)}${document.isDirty ? ' •' : ''}`;
      tree.message = model.roots.length ? undefined : 'Add Markdown headings or insert an MRW outline reference.';
    } catch (error) { model = undefined; tree.message = error.message; }
    changed.fire();
  }
  const isOverview = doc => doc && !doc.isClosed && doc.languageId === 'markdown' && ['file', 'untitled'].includes(doc.uri.scheme);
  async function checkFile(uri, newFile = false) {
    const folder = uri.scheme === 'file' && vscode.workspace.getWorkspaceFolder(uri);
    if (!folder || folder.uri.scheme !== 'file') throw new Error('The reading overview must belong to the current workspace.');
    const root = await fs.realpath(folder.uri.fsPath);
    const actual = await fs.realpath(newFile ? path.dirname(uri.fsPath) : uri.fsPath);
    const relative = path.relative(root, actual);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('The reading overview resolves outside this workspace.');
  }
  async function checkDocument(doc) {
    if (!isOverview(doc)) throw new Error('Choose an ordinary Markdown overview.');
    if (doc.uri.scheme === 'file') await checkFile(doc.uri);
  }
  function pin(doc, start, end) {
    const revision = digest(doc.getText());
    return { uri: doc.uri.toString(), revision, start, end, initial: { revision, start, end } };
  }
  async function showLocation(doc, location) {
    await checkDocument(doc);
    if (location.invalid || digest(doc.getText()) !== location.revision || location.end > doc.getText().length) {
      throw new Error('The exact reading-outline location changed or is unavailable. No replacement was guessed; select the intended location in the overview again.');
    }
    const version = doc.version;
    const editor = await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
    if (doc.version !== version || doc.isClosed) throw new Error('The overview changed while opening. Select its location again.');
    const range = new vscode.Range(doc.positionAt(location.start), doc.positionAt(location.end));
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
    return editor;
  }
  async function openReadingOutline(choose = false) {
    const attempt = ++generation;
    let doc = choose ? undefined : vscode.window.activeTextEditor?.document;
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
      const choices = await vscode.window.showOpenDialog({ title: 'Choose a Markdown reading overview',
        openLabel: 'Open Reading Outline', canSelectFiles: true, canSelectFolders: false, canSelectMany: false,
        filters: { Markdown: ['md', 'markdown'] }, defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri });
      if (attempt !== generation || !choices?.length) return;
      await checkFile(choices[0]);
      if (attempt !== generation) return;
      doc = await vscode.workspace.openTextDocument(choices[0]);
    }
    return selectOverview(doc, attempt);
  }
  async function selectOverview(doc, attempt) {
    await checkDocument(doc);
    if (attempt !== generation) return;
    const previous = document?.uri.toString() || overviewUri;
    if (previous && previous !== doc.uri.toString()) { collapsed = new Set(); selected = undefined; }
    document = doc; refresh();
    await vscode.commands.executeCommand('mrw.readingOutline.focus');
    if (selected?.uri === doc.uri.toString() && model && selected.revision === model.revision) {
      await showLocation(doc, selected);
      const node = model.all.find(n => n.start === selected.start && n.end === selected.end);
      if (node) await tree.reveal(node, { select: true, focus: false });
    }
    await persist();
    return model;
  }
  register('mrw.openReadingOutline', () => openReadingOutline());
  register('mrw.chooseReadingOverview', () => openReadingOutline(true));
  register('mrw.newReadingOverview', async () => {
    const attempt = ++generation;
    const root = vscode.workspace.workspaceFolders?.[0]?.uri;
    if (!root || root.scheme !== 'file') throw new Error('Open a project folder before creating a reading overview.');
    const uri = await vscode.window.showSaveDialog({ title: 'New Reading Overview', saveLabel: 'Create Reading Overview',
      filters: { Markdown: ['md', 'markdown'] }, defaultUri: vscode.Uri.file(path.join(root.fsPath, 'reading-overview.md')) });
    if (!uri || attempt !== generation) return;
    if (!/\.(md|markdown)$/i.test(uri.path)) throw new Error('Choose a .md or .markdown filename for the reading overview.');
    await checkFile(uri, true);
    let existing = false;
    try { await fs.lstat(uri.fsPath); existing = true; }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (existing) throw new Error('A file already exists there. Choose another name, or use Open Reading Outline.');
    if (attempt !== generation) return;
    // The explicit creation uses the host's file edit and Save operations.
    // Do not introduce another ordinary-file writer or overwrite an existing file.
    const edit = new vscode.WorkspaceEdit();
    edit.createFile(uri, { overwrite: false, ignoreIfExists: false });
    edit.insert(uri, new vscode.Position(0, 0), STARTER);
    if (!await vscode.workspace.applyEdit(edit)) throw new Error('The reading overview could not be created. Check the editor for any draft left by VS Code.');
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc, { preview: false });
    if (!await doc.save()) throw new Error('The new overview is open but was not saved. Keep its draft and use Save to finish.');
    return selectOverview(doc, attempt);
  });
  const tutorial = vscode.Uri.from({ scheme: 'mrw-help', path: '/First steps with MRW.md' });
  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('mrw-help', {
    provideTextDocumentContent: () => fs.readFile(path.join(context.extensionPath, 'media', 'first-steps.md'), 'utf8'),
  }));
  register('mrw.openTutorial', () => vscode.commands.executeCommand('markdown.showPreview', tutorial));
  register('mrw.refreshReadingOutline', () => { refresh(); return model; });
  register('mrw.selectReadingOutlineItem', async node => {
    if (!document || document.isClosed) throw new Error('Reopen the Markdown overview with MRW: Open Reading Outline.');
    refresh();
    const current = model?.all.find(n => n.id === node?.id);
    if (!current || current.uri !== node.uri || current.revision !== node.revision || current.start !== node.start || current.end !== node.end) {
      throw new Error('The overview changed. Select its current navigator entry again.');
    }
    const location = pin(document, current.start, current.end);
    const editor = await showLocation(document, location);
    selected = location;
    if (current.kind === 'reference') {
      // Track a candidate during resolution without replacing the last source's
      // return pin. Both locations follow intervening edits; commit only once
      // the retained target has actually opened.
      const pending = { location }; pendingOrigins.add(pending);
      try {
        const result = await followReference(current.reference, editor, { reading: true });
        origin = pending.location;
        await vscode.commands.executeCommand('workbench.action.maximizeEditorHideSidebar');
        await persist(); return result;
      }
      finally { pendingOrigins.delete(pending); }
    }
    await persist();
  });
  register('mrw.returnToReadingOutline', async () => {
    if (!validPin(origin)) throw new Error('Follow a source from the reading-outline navigator first.');
    const uri = vscode.Uri.parse(origin.uri);
    if (!['file', 'untitled'].includes(uri.scheme) || (uri.scheme === 'file' && !vscode.workspace.getWorkspaceFolder(uri))) {
      throw new Error('The originating overview is unavailable in this workspace.');
    }
    const doc = await vscode.workspace.openTextDocument(uri);
    await showLocation(doc, origin);
    selected = origin;
    if (document !== doc) { document = doc; collapsed = new Set(); }
    refresh();
    await vscode.commands.executeCommand('workbench.action.minimizeOtherEditors');
    await vscode.commands.executeCommand('mrw.readingOutline.focus');
    const node = model?.all.find(n => n.start === origin.start && n.end === origin.end);
    if (node) await tree.reveal(node, { select: true, focus: false });
    await persist();
  });
  context.subscriptions.push(changed, tree,
    tree.onDidCollapseElement(e => { collapsed.add(e.element.id); void persist().catch(fail); }),
    tree.onDidExpandElement(e => { collapsed.delete(e.element.id); void persist().catch(fail); }),
    vscode.workspace.onDidChangeTextDocument(e => {
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
  return { provider, refresh };
}
module.exports = { registerReadingOutline, trackLocation };
