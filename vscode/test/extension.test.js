'use strict';
// Command-level contract tests with a small VS Code API double. These are not
// Extension Development Host or visible UI acceptance tests.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const { runBridge } = require('../src/bridge');
const navigation = require('../src/navigation');

const shutdowns=new Map();
class Position { constructor(line, character) { Object.assign(this, { line, character }); } }
class Range {
  constructor(a, b, c, d) {
    this.start = typeof a === 'number' ? new Position(a, b) : a;
    this.end = typeof a === 'number' ? new Position(c, d) : b;
  }
  isEqual(other) { return JSON.stringify([this.start, this.end]) === JSON.stringify([other.start, other.end]); }
}
class Selection extends Range { constructor(a, b) { super(a, b); this.active = b; } }
class WorkspaceEdit {
  constructor() { this.operations = []; }
  createFile(location, options) { this.operations.push({ kind: 'create', location, options }); }
  insert(location, point, text) { this.operations.push({ kind: 'insert', location, point, text }); }
  replace(location, range, text) { this.operations.push({ kind: 'replace', location, range, text }); }
}
function uri(file, scheme = 'file') { return { scheme, path: file, fsPath: file, toString() { return `${scheme}:${file}`; } }; }

const {CancellationTokenSource,quickPicker,WAIT}=require('./support/quickPicker');

async function harness(root, state = new Map(), options = {}) {
  const commands = new Map(), errors = [], shown = [], reads = [], requests = [], providers = new Map(), executed = [];
  const opens = [], dialogs = [], saveChoices = [], saveDialogs = [], workspaceEdits = [], saves = [], commandCalls = [], inputs = [], picks = [], endings = [], panels = [];
  const activeListeners = new Set();
  const activeListener = editor => { for (const listener of activeListeners) listener(editor); };
  let closeListener = () => {}, openListener = () => {}, changeListener = () => {}, service = runBridge;
  const storedDocuments = new Map();
  const disposable = { dispose() {} };
  const offset = (text, point) => text.split('\n').slice(0, point.line).reduce((n, line) => n + line.length + 1, 0) + point.character;
  function document(file, text, scheme = 'file') {
    const doc = { uri: uri(file, scheme), version: 1, isDirty: false, isClosed: false, text,
      // Exercise a user's *.txt language association for every virtual view.
      languageId: scheme === 'mrw-record' ? 'markdown' : 'plaintext',
      getText(range) { return range ? this.text.slice(offset(this.text, range.start), offset(this.text, range.end)) : this.text; },
      async save() {
        saves.push(this.uri.toString());
        if (options.save === false) return false;
        await fs.writeFile(this.uri.fsPath, this.text); this.isDirty = false; return true;
      },
      positionAt(at) { const lines = this.text.slice(0, at).split('\n'); return new Position(lines.length - 1, lines.at(-1).length); },
      offsetAt(point) { return offset(this.text, point); },
      get lineCount() { return this.text.split('\n').length; }, validateRange: range => range };
    storedDocuments.set(doc.uri.toString(), doc);
    return doc;
  }
  function editor(doc) {
    return { document: doc, viewColumn: 1, selection: new Selection(new Position(0, 0), new Position(0, 1)),
      revealRange() {}, async edit(callback) {
        callback({ insert(point, text) {
          const at = offset(doc.text, point);
          doc.text = doc.text.slice(0, at) + text + doc.text.slice(at);
          doc.version++; doc.isDirty = true;
        } }); return true;
      } };
  }
  const api = {
    CancellationTokenSource,
    extensions: { getExtension: () => undefined },
    Position, Range, Selection, WorkspaceEdit, Uri: { file: p => uri(p), from: x => uri(x.path, x.scheme), parse: x => x.startsWith('file:') ? uri(x.slice(5)) : uri(x, 'https') },
    ProgressLocation: { Notification: 15 },
    ViewColumn: { One: 1, Two: 2, Beside: -2 }, TextEditorRevealType: { InCenter: 1, InCenterIfOutsideViewport: 2 },
    EventEmitter: class { event() {} fire() {} dispose() {} }, TreeItem: class { constructor(label) { this.label = label; } },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    commands: { registerCommand(name, action) { commands.set(name, action); return disposable; },
      async executeCommand(name, ...args) { executed.push(name); commandCalls.push({ name, args }); return commands.get(name)?.(...args); } },
    workspace: {
      isTrusted: true, workspaceFolders: [{ uri: uri(root) }],
      getWorkspaceFolder: () => ({ uri: uri(root) }),
      getConfiguration: () => ({ get: (name, fallback) => name === 'pythonExecutable' ? 'python3' : name === 'proofViewerUrl' ? 'https://example.org/proofs/' : fallback }),
      registerTextDocumentContentProvider(scheme, provider) { providers.set(scheme, provider); return disposable; },
      onDidCloseTextDocument(fn) { const previous = closeListener; closeListener = doc => { previous(doc); fn(doc); }; return disposable; },
      onDidOpenTextDocument(fn) { openListener = fn; return disposable; },
      onDidChangeTextDocument(fn) { const previous=changeListener; changeListener=e=>{previous(e);fn(e);}; return disposable; },
      async applyEdit(edit) {
        workspaceEdits.push(edit);
        for (const op of edit.operations) {
          if (op.kind === 'create') await fs.writeFile(op.location.fsPath, '', { flag: op.options.overwrite ? 'w' : 'wx' });
          else {
            const doc = await this.openTextDocument(op.location), at = op.kind === 'replace' ? 0 : offset(doc.text, op.point);
            doc.text = op.kind === 'replace' ? op.text : doc.text.slice(0, at) + op.text + doc.text.slice(at); doc.version++; doc.isDirty = true;
          }
        }
        return true;
      },
      async openTextDocument(location) {
        reads.push(location.toString());
        const existing = storedDocuments.get(location.toString());
        if (existing) return existing;
        const doc = document(location.path, location.scheme === 'file' ? await fs.readFile(location.path, 'utf8') : await providers.get(location.scheme).provideTextDocumentContent(location), location.scheme);
        if (location.scheme === 'file' && /\.(md|markdown)$/i.test(location.path)) doc.languageId = 'markdown';
        return doc;
      },
    },
    window: {
      createQuickPick() { return api.lastDocumentPicker=quickPicker(()=>WAIT); },
      activeTextEditor: undefined,
      createWebviewPanel(type, title, column) {
        let receive, viewState;
        const panel = { title, viewColumn: column === -2 ? (api.window.activeTextEditor?.viewColumn || 1) + 1 : column, dispose() {}, reveal() {},
          onDidDispose() { return disposable; }, onDidChangeViewState(callback) { viewState = callback; return disposable; },
          changeVisibility(visible) { this.visible = visible; this.active = visible; return viewState?.({ webviewPanel: this }); },
          webview: { html: '', messages: [], cspSource: 'vscode-webview:', asWebviewUri: uri => uri.toString(),
            onDidReceiveMessage(callback) { receive = callback; return disposable; },
            async postMessage(value) { this.messages.push(value); if (value.type === 'storageCheck') await receive({ type: 'storageStatus', dirty: !!this.dirty }); return true; } },
          receive: value => {const state=panel.webview.messages.findLast(row=>row.type==='active_study')?.study;return receive(require('./study-message-fixture').message(state,value));} };
        panels.push(panel); return panel;
      },
      onDidChangeActiveTextEditor(callback) { activeListeners.add(callback); return { dispose() { activeListeners.delete(callback); } }; },
      registerTreeDataProvider(id, provider) { (api.treeProviders ||= {})[id] = provider; return disposable; },
      createTreeView(_id, options) { api.readingProvider = options.treeDataProvider; return api.readingTree = {
        dispose() {}, onDidCollapseElement(fn) { api.collapseReading = fn; return disposable; },
        onDidExpandElement(fn) { api.expandReading = fn; return disposable; }, async reveal() {} }; },
      registerUriHandler(handler) { api.uriHandler = handler; return disposable; },
      async showErrorMessage(message) { errors.push(message); },
      async showInformationMessage() {}, setStatusBarMessage() {},
      async withProgress(_settings, action) { return action({}, { onCancellationRequested() { return disposable; } }); },
      async showOpenDialog(options) { dialogs.push(options); return opens.shift(); },
      async showSaveDialog(options) { saveDialogs.push(options); return saveChoices.shift(); },
      async showInputBox() { return inputs.shift(); },
      async showQuickPick(options) { options = await options; return picks.length ? picks.shift() : options[0]; },
      async showWarningMessage() { return endings.shift(); },
      async showTextDocument(doc, options = {}) {
        shown.push(doc); const next = editor(doc);
        next.viewColumn = options.viewColumn === -2 ? (api.window.activeTextEditor?.viewColumn || 1) + 1 : (options.viewColumn || 1);
        api.window.visibleTextEditors = [...(api.window.visibleTextEditors || []).filter(e => e.viewColumn !== next.viewColumn), next];
        api.window.activeTextEditor = next; activeListener(next); return next;
      },
    },
    languages: { async setTextDocumentLanguage(doc, languageId) {
      if (doc.languageId !== languageId) {
        // A language change emits close/open without disposing the document.
        closeListener(doc); doc.languageId = languageId; openListener(doc);
      }
      return doc;
    } }, env: { uriScheme: 'vscode', clipboard: { value: '', async writeText(value) { this.value = value; }, async readText() { return this.value; } }, async openExternal(value) { api.external = value; return true; } },
  };
  const extension = path.resolve(__dirname, '..');
  const global = options.globalState || new Map();
  const context = { extensionPath: extension, storageUri: uri(options.storage || path.join(root, '..', 'private-state')),
    globalStorageUri: uri(options.globalHome || path.join(root, '..', 'global-state')),
    globalState: { get: (key, fallback) => global.get(key) ?? fallback, async update(key, value) { global.set(key, value); } },
    subscriptions: [], workspaceState: {
    get: (key, fallback) => state.get(key) ?? fallback, keys: () => [...state.keys()],
    async update(key, value) { if (value === undefined) state.delete(key); else state.set(key, value); },
  } };
  const source = await fs.readFile(path.join(extension, 'src/extension.js'), 'utf8');
  const module = { exports: {} };
  const requires = name => {
    if (name === 'vscode') return api;
    if (name === './navigation') return navigation;
    if (name === './assistance') return require('../src/assistance');
    if (name === './zotero') return require('../src/zotero');
    if (name === './leanStudy') return require('../src/leanStudy');
    if (name === './sourcePlugins') return require('../src/sourcePlugins');
    if (name === './outlines') return require('../src/outlines');
    if (name === './readingOutline') return require('../src/readingOutline');
    if (name === './activeStudy') return require('../src/activeStudy');
    if (name === './studyHistory') return {StudyHistory:class extends require('../src/studyHistory').StudyHistory{constructor(...a){super(a[0],a[1],{origin:'test'});}}};
    if (name === './sharedHistory') return require('../src/sharedHistory');
    if (name === './historyCommands') return require('../src/historyCommands');
    if (name === './proofStudy') return require('../src/proofStudy');
    if (name === './proofGraph') return require('../src/proofGraph');
    if (name === './artifactStorage') return require('../src/artifactStorage');
    if (name === './bridge') return { runBridge: async (...args) => { requests.push(args[2]); return service(...args); } };
    return require(name);
  };
  vm.runInThisContext(`(function(require,module){${source}\n})`)(requires, module);
  module.exports.activate(context);
  shutdowns.set(root,[...(shutdowns.get(root)||[]),()=>module.exports.deactivate()]);
  return { api, commands, errors, shown, reads, requests, opens, dialogs, saveChoices, saveDialogs, workspaceEdits, saves, commandCalls, inputs, picks, endings, panels, state, document, editor, providers, executed,
    changeDocument(doc, at, length, text) { doc.text = doc.text.slice(0, at) + text + doc.text.slice(at + length); doc.version++; doc.isDirty = true;
      changeListener({ document: doc, contentChanges: [{ rangeOffset: at, rangeLength: length, text }] }); },
    closeDocument(doc) { doc.isClosed = true; storedDocuments.delete(doc.uri.toString()); closeListener(doc); },
    setService: fn => { service = fn; }, focus: ed => { api.window.activeTextEditor = ed; activeListener(ed); } };
}

async function temporary(t, persistent = false) {
  const parent = persistent ? path.resolve(__dirname, '../../.codex-work/artifact-storage-node-tests') : os.tmpdir();
  await fs.mkdir(parent, {recursive:true});
  const directory = await fs.mkdtemp(path.join(parent, 'mrw-command-'));
  const root = path.join(directory, 'project'); await fs.mkdir(root);
  t.after(async() => {
    // A rename fixture can start hosts under a new root inside this directory.
    // Drain every fixture host before removing storage that its history uses.
    for (const [key, closes] of [...shutdowns]) if (key === root || key.startsWith(directory + path.sep)) {
      for (const close of closes) await close(); shutdowns.delete(key);
    }
    await fs.rm(directory, { recursive: true, force: true });
  });
  return root;
}

test('source outline retains Unicode selections, edits annotations, and restores changed originals without remapping', async t => {
  const root = await temporary(t), source = path.join(root, 'argument.md');
  const original = 'α😀 → β\nClaim one.\nArgument.\n'; await fs.writeFile(source, original);
  const h = await harness(root), doc = h.document(source, original), ed = h.editor(doc); h.focus(ed);
  ed.viewColumn = 2; // Opening from a research group must not create group three.
  ed.selection = new Selection(new Position(0, 1), new Position(1, 5));
  const created = await h.commands.get('mrw.createOutline')();
  assert.equal(created.outline.regions[0].argument_text, '😀 → β\nClaim');
  const panel = h.panels[0], region = created.outline.regions[0];
  assert.equal(panel.viewColumn, 2);
  await panel.receive({ type: 'edit', draft: 'annotation-draft', change: { kind: 'annotation', region: region.id,
    id: null, purpose: 'suspected_gap', text: '<script>inert</script> Reader question.', origin: 'human_work', author: null } });
  assert.equal(panel.webview.messages.at(-2).clearDraft, 'annotation-draft');
  await panel.receive({ type: 'toggle', region: region.id });
  assert.equal(panel.webview.messages.at(-2).model.outline.regions[0].argument_text, null);
  await fs.writeFile(source, 'Replacement argument.');
  const restored = await harness(root); await restored.commands.get('mrw.openOutline')();
  const loaded = restored.panels[0].webview.messages.at(-1).model;
  assert.equal(loaded.outline.source_status, 'changed or unavailable');
  assert.deepEqual(loaded.outline.regions[0].span, region.span);
  await restored.panels[0].receive({ type: 'toggle', region: region.id });
  assert.equal(restored.panels[0].webview.messages.at(-2).model.outline.regions[0].argument_text, '😀 → β\nClaim');
  await restored.panels[0].receive({ type: 'source' });
  assert.equal(restored.api.window.activeTextEditor.document.getText(), original);
  restored.api.window.activeTextEditor.selection = new Selection(new Position(2, 0), new Position(2, 9));
  await restored.commands.get('mrw.replaceOutlineRegion')();
  assert.equal(restored.panels[0].webview.messages.at(-1).model.outline.regions[0].argument_text, 'Argument.');
  const retainedDoc = restored.api.window.activeTextEditor.document, before = restored.requests.length;
  retainedDoc.text = 'A different virtual view.'; retainedDoc.version++;
  await restored.commands.get('mrw.replaceOutlineRegion')();
  assert.equal(restored.requests.length, before); assert.match(restored.errors.pop(), /exact retained text/);
  restored.closeDocument(retainedDoc);
  const stale = await restored.api.workspace.openTextDocument(retainedDoc.uri);
  restored.focus(restored.editor(stale));
  await restored.commands.get('mrw.replaceOutlineRegion')();
  assert.equal(restored.requests.length, before);
  assert.match(restored.errors.pop(), /ordinary text|exact retained text/);
  assert.ok([...h.requests, ...restored.requests].every(r => r.method.startsWith('outline_') || r.method === 'artifact_status'));
  assert.equal(await fs.readFile(source, 'utf8'), 'Replacement argument.'); assert.deepEqual(restored.errors, []);
});

test('failed outline publication preserves the view and draft, blocks later writes, and permits retained reading', async t => {
  const root = await temporary(t), source = path.join(root, 'article.txt'); await fs.writeFile(source, 'Claim.\nProof.');
  const h = await harness(root); h.focus(h.editor(h.document(source, 'Claim.\nProof.')));
  const created = await h.commands.get('mrw.createOutline')(), panel = h.panels[0];
  h.setService(async (...args) => args[2].method === 'outline_mutate' ? { blocked: true, write_error: 'Injected sync failure' } : runBridge(...args));
  await panel.receive({ type: 'toggle', region: created.outline.regions[0].id });
  const failure = panel.webview.messages.at(-2); assert.equal(failure.type, 'error'); assert.equal(failure.writesBlocked, true);
  assert.equal(failure.clearDraft, undefined);
  const before = h.requests.length; await panel.receive({ type: 'toggle', region: created.outline.regions[0].id });
  assert.equal(h.requests.length, before); assert.match(h.errors.at(-1), /blocked/);
  await panel.receive({ type: 'source' }); assert.equal(h.shown.at(-1).getText(), 'Claim.\nProof.');
});

test('shared context replacement, description and removal keep unrelated work and survive restart', async t => {
  const root = await temporary(t), source = path.join(root, 'article.md'), original = 'α😀 → β\nClaim one.\nArgument.';
  await fs.writeFile(source, original);
  const h = await harness(root), ed = h.editor(h.document(source, original)); h.focus(ed);
  await h.commands.get('mrw.createOutline')();
  ed.selection = new Selection(new Position(0, 0), new Position(0, 7));
  await h.commands.get('mrw.addOutlineContext')(); await h.commands.get('mrw.addOutlineContext')();
  const panel = h.panels[0], model = () => panel.webview.messages.filter(m => m.type === 'outline').at(-1).model;
  const [context, unrelated] = model().outline.contexts;
  await panel.receive({ type: 'edit', draft: `context:${context.id}`, change: {
    kind: 'edit_context', context: context.id, context_kind: 'cited_result', label: 'Reader citation'
  } });
  ed.selection = new Selection(new Position(1, 0), new Position(1, 10));
  await h.commands.get('mrw.replaceOutlineContext')();
  assert.equal(model().outline.contexts[0].text, 'Claim one.');
  assert.equal(model().outline.contexts[0].label, 'Reader citation');
  assert.deepEqual(model().outline.contexts[1], unrelated);
  const restored = await harness(root); await restored.commands.get('mrw.openOutline')();
  const rp = restored.panels[0]; assert.deepEqual(rp.webview.messages.at(-1).model.outline.contexts, model().outline.contexts);
  await rp.receive({ type: 'edit', change: { kind: 'remove_context', context: context.id } });
  const again = await harness(root); await again.commands.get('mrw.openOutline')();
  assert.deepEqual(again.panels[0].webview.messages.at(-1).model.outline.contexts, [unrelated]);
  await again.panels[0].receive({ type: 'source' }); assert.equal(again.shown.at(-1).getText(), original);
  assert.equal(await fs.readFile(source, 'utf8'), original); assert.deepEqual([...h.errors, ...restored.errors, ...again.errors], []);
});

test('shared context replacement rejects changed selections and stale source identity before publication', async t => {
  const root = await temporary(t), source = path.join(root, 'article.md'), original = 'Claim.\nProof.';
  await fs.writeFile(source, original);
  const h = await harness(root), doc = h.document(source, original), ed = h.editor(doc); h.focus(ed);
  await h.commands.get('mrw.createOutline')(); await h.commands.get('mrw.addOutlineContext')();
  const panel = h.panels[0], context = panel.webview.messages.at(-1).model.outline.contexts[0];
  const before = h.requests.length;
  h.api.window.showQuickPick = async () => { ed.selection = new Selection(new Position(1, 0), new Position(1, 2)); return context; };
  await h.commands.get('mrw.replaceOutlineContext')();
  assert.match(h.errors.pop(), /selection changed/); assert.equal(h.requests.length, before);
  await fs.writeFile(source, 'Changed.');
  await h.commands.get('mrw.replaceOutlineContext')(); assert.match(h.errors.pop(), /exact original or retained source/);
  assert.equal(h.requests.length, before);
  await panel.receive({ type: 'source' }); const retained = h.api.window.activeTextEditor;
  retained.document.text = 'Substituted retained tab'; retained.document.version++;
  await h.commands.get('mrw.replaceOutlineContext')(); assert.match(h.errors.pop(), /exact retained text/);
  assert.equal(h.requests.length, before + 1);
});

test('manual evidence can move, detach, reopen retained originals and reject failed publication', async t => {
  const root = await temporary(t), source = path.join(root, 'article.txt'); await fs.writeFile(source, 'Claim.\nProof.');
  const artifact = path.join(root, 'goals.json'), raw = JSON.stringify([{ label: 'one', result: { goals: ['h : P\n⊢ Q'] } },
    { label: 'two', result: { goals: ['h : R\n⊢ S'] } }]); await fs.writeFile(artifact, raw);
  const h = await harness(root); h.focus(h.editor(h.document(source, 'Claim.\nProof.')));
  await h.commands.get('mrw.createOutline')(); await h.commands.get('mrw.addOutlineRegion')();
  h.opens.push([uri(artifact)]); await h.commands.get('mrw.attachOutlineEvidence')();
  const panel = h.panels[0], model = () => panel.webview.messages.filter(m => m.type === 'outline').at(-1).model;
  const a = model().outline.artifacts[0], first = model().outline.regions[0];
  await fs.unlink(artifact);
  await panel.receive({ type: 'edit', draft: `evidence:${a.id}`, change: {
    kind: 'evidence_association', artifact: a.id, region: first.id, selector: 1
  } });
  assert.deepEqual(model().outline.artifacts[0].goals, ['h : R\n⊢ S']);
  await panel.receive({ type: 'edit', change: { kind: 'remove_evidence_association', artifact: a.id } });
  assert.equal(model().outline.artifacts[0].region, null);
  const restored = await harness(root); await restored.commands.get('mrw.openOutline')();
  const rp = restored.panels[0]; assert.equal(rp.webview.messages.at(-1).model.outline.artifacts[0].region, null);
  await rp.receive({ type: 'artifact', artifact: a.id }); assert.equal(restored.shown.at(-1).getText(), raw);
  h.setService(async (...args) => args[2].method === 'outline_mutate' ? { blocked: true, write_error: 'Injected failure' } : runBridge(...args));
  const saved = model();
  await panel.receive({ type: 'edit', draft: `evidence:${a.id}`, change: {
    kind: 'evidence_association', artifact: a.id, region: first.id, selector: 0
  } });
  assert.deepEqual(model(), saved); assert.equal(panel.webview.messages.at(-2).writesBlocked, true);
  assert.equal(panel.webview.messages.at(-2).clearDraft, undefined);
  const before = h.requests.length;
  await panel.receive({ type: 'edit', change: { kind: 'remove_evidence_association', artifact: a.id } });
  assert.equal(h.requests.length, before);
  await panel.receive({ type: 'artifact', artifact: a.id }); assert.equal(h.shown.at(-1).getText(), raw);
  assert.ok([...h.requests, ...restored.requests].every(r => r.method.startsWith('outline_') || r.method === 'artifact_status'));
});

test('activation does no file loading or process work; every command checks trust', async t => {
  const h = await harness(await temporary(t));
  assert.equal(h.reads.length, 0); assert.equal(h.requests.length, 0); assert.equal(h.state.size, 0);
  h.api.workspace.isTrusted = false;
  for (const command of h.commands.values()) await command();
  assert.equal(h.errors.length, h.commands.size);
  assert.equal(h.reads.length, 0); assert.equal(h.requests.length, 0);
  const manifest = require('../package.json');
  assert.deepEqual([...h.commands.keys()].sort(), manifest.contributes.commands.map(c => c.command).sort());
});

test('mark survives activation and return rejects source changes without moving editor', async t => {
  const root = await temporary(t), source = path.join(root, 'note.md');
  await fs.writeFile(source, '𝒳 → α\nnext question\n');
  const h = await harness(root);
  h.focus(h.editor(h.document(source, await fs.readFile(source, 'utf8'))));
  h.api.window.activeTextEditor.selection = new Selection(new Position(0, 0), new Position(0, 6));
  await h.commands.get('mrw.mark')();
  assert.equal(h.state.size, 1); assert.equal(h.errors.length, 0);
  const resumed = await harness(root, h.state);
  await resumed.commands.get('mrw.return')();
  assert.equal(resumed.shown[0].uri.fsPath, source);
  const position = resumed.api.window.activeTextEditor.selection;
  assert.equal(position.end.character, 6);
  await fs.writeFile(source, 'changed source');
  await resumed.commands.get('mrw.return')();
  assert.equal(resumed.shown.length, 1);
  assert.match(resumed.errors[0], /changed or moved/);
  assert.equal(resumed.state.size, 1);
});

test('dirty source cannot replace an existing return marker', async t => {
  const root = await temporary(t), file = path.join(root, 'note.md');
  await fs.writeFile(file, 'a note');
  const h = await harness(root), doc = h.document(file, 'a note');
  h.focus(h.editor(doc)); await h.commands.get('mrw.mark')();
  const prior = JSON.stringify([...h.state]);
  doc.isDirty = true; doc.text = 'unsaved work';
  await h.commands.get('mrw.mark')();
  assert.match(h.errors[0], /Save the source/);
  assert.equal(JSON.stringify([...h.state]), prior);
});

test('response insertion preserves selected work and rejects a concurrently edited note', async t => {
  const root = await temporary(t), note = path.join(root, 'note.md');
  const fixture = path.resolve(__dirname, '../../tests/fixtures/mechanical_model_call.json');
  await fs.writeFile(note, 'my argument');
  const h = await harness(root);
  h.opens.push([uri(fixture)]); await h.commands.get('mrw.review')();
  h.inputs.push('1'); await h.commands.get('mrw.passage')();
  const doc = h.document(note, 'my argument'), ed = h.editor(doc);
  h.focus(ed); await h.commands.get('mrw.insert')();
  assert.match(doc.text, /unverified editable copy/);
  assert.ok(doc.text.startsWith('m')); assert.ok(doc.text.endsWith('y argument'));
  assert.equal(await fs.readFile(note, 'utf8'), 'my argument');
  const before = doc.text;
  h.setService(async (...args) => {
    const result = await runBridge(...args); doc.version++; doc.text += ' later work'; return result;
  });
  await h.commands.get('mrw.insert')();
  assert.equal(doc.text, before + ' later work');
  assert.match(h.errors[0], /changed during preparation/);
});

test('cancelled record and proof dialogs leave project and marker state untouched', async t => {
  const root = await temporary(t), file = path.join(root, 'note.md');
  await fs.writeFile(file, 'note');
  const h = await harness(root); h.focus(h.editor(h.document(file, 'note')));
  await h.commands.get('mrw.review')(); await h.commands.get('mrw.openProof')();
  assert.equal(h.requests.length, 0); assert.equal(h.state.size, 0); assert.equal(h.errors.length, 0);
  assert.equal(await fs.readFile(file, 'utf8'), 'note');
});

async function ask(h, root) {
  const doc = h.document(path.join(root, 'note.md'), 'α😀\r\nPRIVATE UNSELECTED');
  doc.isDirty = true;
  const ed = h.editor(doc);
  ed.selection = new Selection(new Position(0, 0), new Position(0, 3));
  h.focus(ed); h.inputs.push('Why α?', 'fake-model');
  await h.commands.get('mrw.ask')();
  return doc;
}

async function sourceReader(h, root) {
  const file = path.join(root, 'reader-source.md'), text = 'α😀 → β\r\nClaim.\r\nPRIVATE UNSELECTED';
  await fs.writeFile(file, text);
  const ed = h.editor(h.document(file, text));
  ed.selection = new Selection(new Position(0, 1), new Position(1, 5)); h.focus(ed);
  const saved = await h.commands.get('mrw.createOutline')();
  assert.deepEqual(h.errors, []);
  return {file, text, saved, panel:h.panels[0], region:saved.outline.regions[0].id};
}

test('reader passage prepares frozen retained context without editor focus, then reuses explicit Send and review', async t => {
  const root = await temporary(t), h = await harness(root);
  const {file, saved, panel, region} = await sourceReader(h, root);
  panel.webview.dirty = true;
  await fs.unlink(file); h.focus(undefined);
  h.inputs.push('Explain this argument.', 'fake-model');
  await panel.receive({type:'ask_ai',region});
  const draft = h.requests.findLast(r=>r.method==='prepare_assistance').draft;
  assert.equal(draft.contexts[0].text, '😀 → β\r\nClaim');
  assert.match(draft.target.source_identity, /^mrw-outline:v1\//);
  assert.equal(draft.target.source_revision, saved.outline.source.revision);
  assert.equal(draft.target.source_path, null);
  assert.equal(draft.target.start, '1.1'); assert.equal(draft.target.end, '2.5');
  assert.equal(h.shown.at(-1).text.includes('PRIVATE UNSELECTED'), false);
  assert.equal(h.requests.some(r=>r.method==='send_assistance'), false);
  assert.equal(panel.webview.dirty, true);
  await deterministicSend(h, draft);
  assert.ok(h.requests.some(r=>r.method==='review'));
  assert.equal(h.requests.filter(r=>r.method==='send_assistance').length, 1);
  const retained=JSON.parse(await fs.readFile(draft.output,'utf8'));
  assert.equal(retained.target.id,draft.target.source_identity);
  assert.equal(retained.target.revision,saved.outline.source.revision);
  assert.equal(retained.context_refs[0].revision,saved.outline.source.revision);
  assert.equal(panel.webview.dirty, true);
});

test('reader command cancellation and an existing unsent request preserve the current preview', async t => {
  const root = await temporary(t), h = await harness(root);
  const {panel, region} = await sourceReader(h, root);
  await h.commands.get('mrw.askReader')(); // No question supplied: cancel.
  assert.equal(h.requests.some(r=>r.method==='prepare_assistance'), false);
  h.inputs.push('Explain.', 'fake-model');
  await panel.receive({type:'ask_ai',region});
  const preview=h.shown.at(-1), draft=h.requests.findLast(r=>r.method==='prepare_assistance').draft;
  await panel.receive({type:'ask_ai',region});
  assert.match(h.errors.pop(), /Finish or discard the current unsent request/);
  assert.equal(h.shown.at(-1), preview);
  assert.equal(h.requests.filter(r=>r.method==='prepare_assistance').length, 1);
  await deterministicSend(h, draft);
});

test('stale reader association refuses preparation rather than selecting newer source text', async t => {
  const root = await temporary(t), h = await harness(root);
  const {saved, panel, region} = await sourceReader(h, root);
  const sourceRequest = h.requests.find(r=>r.method==='outline_create');
  await runBridge(path.resolve(__dirname,'..'), 'python3', {method:'outline_mutate',store:sourceRequest.store,
    project_root:root,id:saved.outline.id,revision:saved.revision,
    change:{kind:'replace_region',region,start:[2,0],end:[2,5]}});
  await panel.receive({type:'ask_ai',region});
  assert.equal(h.requests.some(r=>r.method==='prepare_assistance'), false);
  assert.match(h.errors.at(-1), /changed/);
});

test('unsaved Unicode preview contains only selection; remove and discard send nothing', async t => {
  const root = await temporary(t), h = await harness(root);
  const doc = await ask(h, root);
  assert.equal(h.errors.length, 0);
  assert.equal(h.requests.find(r => r.method === 'prepare_assistance').draft.target.end, '1.2');
  assert.equal(h.requests.find(r => r.method === 'prepare_assistance').draft.contexts[0].text, 'α😀');
  assert.ok(!h.shown.at(-1).text.includes('PRIVATE UNSELECTED'));
  const frozen = h.shown.at(-1).text;
  doc.text = 'later edits'; doc.version++;
  assert.equal(h.shown.at(-1).text, frozen);
  await h.commands.get('mrw.removeContext')();
  assert.equal(h.requests.at(-1).draft.contexts.length, 0);
  await h.commands.get('mrw.discardRequest')();
  await h.commands.get('mrw.sendRequest')();
  assert.match(h.errors.at(-1), /current exact request preview/);
  assert.ok(h.requests.every(r => r.method === 'prepare_assistance' || r.method === 'artifact_status'));
});

test('send consumes one preview, blocks duplicates, and presents terminal failure', async t => {
  const root = await temporary(t), h = await harness(root);
  await ask(h, root);
  let finish;
  h.setService(async (...args) => {
    assert.equal(args[2].method, 'send_assistance');
    return new Promise(resolve => { finish = resolve; });
  });
  const pending = h.commands.get('mrw.sendRequest')();
  await h.commands.get('mrw.sendRequest')();
  assert.match(h.errors.at(-1), /Wait for/);
  assert.equal(h.requests.filter(r => r.method === 'send_assistance').length, 1);
  finish({ status: 'failed', retained: true, body: 'Mathematical assistance: failed', path: '/unused' });
  await pending;
  assert.match(h.shown.at(-1).text, /failed/);
  await h.commands.get('mrw.sendRequest')();
  assert.equal(h.requests.filter(r => r.method === 'send_assistance').length, 1);
});

test('old preview cannot authorize replacement; preparation error invalidates Send', async t => {
  const root = await temporary(t), h = await harness(root);
  await ask(h, root);
  const old = h.shown.at(-1);
  h.inputs.push('New question'); await h.commands.get('mrw.editQuestion')();
  h.focus(h.editor(old)); await h.commands.get('mrw.sendRequest')();
  assert.match(h.errors.at(-1), /current exact request preview/);
  h.setService(async () => { throw new Error('synthetic preparation failure'); });
  await h.commands.get('mrw.previewRequest')();
  await h.commands.get('mrw.sendRequest')();
  assert.ok(h.requests.every(r => r.method === 'prepare_assistance' || r.method === 'artifact_status'));
});

test('ordinary Ask preserves the unsent draft and exact preview before any replacement dialog', async t => {
  const root=await temporary(t),h=await harness(root);await ask(h,root);
  const original=h.requests.filter(r=>r.method==='prepare_assistance').at(-1).draft;
  const preview=h.shown.at(-1);h.focus(h.editor(h.document(path.join(root,'other.md'),'Other selected work')));
  await h.commands.get('mrw.ask')();
  assert.match(h.errors.at(-1),/unsent request/);
  await h.commands.get('mrw.previewRequest')();
  assert.deepEqual(h.requests.filter(r=>r.method==='prepare_assistance').at(-1).draft,original);
  assert.equal(h.shown.at(-1).text,preview.text);
  assert.equal(h.requests.some(r=>r.method==='send_assistance'),false);
});

test('cancelled question and malformed Unicode never prepare or send', async t => {
  const root = await temporary(t), h = await harness(root);
  h.focus(h.editor(h.document(path.join(root, 'note.md'), 'ordinary work')));
  await h.commands.get('mrw.ask')();
  assert.equal(h.requests.length, 0);
  h.focus(h.editor(h.document(path.join(root, 'bad.md'), '\ud800broken')));
  await h.commands.get('mrw.ask')();
  assert.equal(h.requests.length, 0);
  assert.match(h.errors.at(-1), /incomplete Unicode/);
});

test('blank restored preview cannot send; completed outcome enters validated review', async t => {
  const root = await temporary(t), h = await harness(root);
  await ask(h, root);
  const preview = h.shown.at(-1), exact = preview.text;
  preview.text = '';
  await h.commands.get('mrw.sendRequest')();
  assert.equal(h.requests.filter(r => r.method === 'send_assistance').length, 0);
  preview.text = exact;
  const fixture = path.resolve(__dirname, '../../tests/fixtures/mechanical_model_call.json');
  h.setService(async (...args) => args[2].method === 'send_assistance'
    ? { status: 'completed', retained: true, body: 'completed synthetic request', path: fixture, revision: navigation.digest(await fs.readFile(fixture)) }
    : runBridge(...args));
  await h.commands.get('mrw.sendRequest')();
  assert.equal(h.requests.filter(r => r.method === 'send_assistance').length, 1);
  assert.equal(h.requests.at(-1).method, 'review');
  assert.match(h.shown.at(-1).text, /Response|response/);
});

test('additional context uses captured text and scalar locations from untitled CRLF work', async t => {
  const root = await temporary(t), h = await harness(root);
  await ask(h, root);
  const doc = h.document('Untitled-2', '😀\r\nβ lemma', 'untitled'), ed = h.editor(doc);
  ed.selection = new Selection(new Position(0, 0), new Position(1, 1));
  h.focus(ed); await h.commands.get('mrw.addContext')();
  assert.equal(h.errors.length, 0);
  const c = h.requests.at(-1).draft.contexts[1];
  assert.equal(c.text, '😀\r\nβ'); assert.equal(c.start, '1.0'); assert.equal(c.end, '2.1');
  assert.equal(c.source_path, null);
});

test('known unsent request keeps its question but requires a new preview before Send', async t => {
  const root = await temporary(t), h = await harness(root);
  await ask(h, root);
  const original = h.requests.find(r => r.method === 'prepare_assistance').draft;
  h.setService(async (...args) => args[2].method === 'send_assistance'
    ? { status: 'not_sent', retained: false, revision: null, body: 'Request not sent: missing credential.' }
    : runBridge(...args));
  await h.commands.get('mrw.sendRequest')();
  assert.match(h.shown.at(-1).text, /not sent/);
  assert.ok(!h.shown.at(-1).text.includes('uncertain'));
  await h.commands.get('mrw.sendRequest')();
  assert.equal(h.requests.filter(r => r.method === 'send_assistance').length, 1);
  await h.commands.get('mrw.previewRequest')();
  assert.deepEqual(h.requests.at(-1).draft, original);
  assert.equal(h.errors.length, 1); // The second Send had no current preview.
});

test('record replaced after Send is rejected and does not erase the known terminal outcome', async t => {
  const root = await temporary(t), h = await harness(root);
  await ask(h, root);
  const fixture = path.resolve(__dirname, '../../tests/fixtures/mechanical_model_call.json');
  const recorded = await fs.readFile(fixture);
  const replacement = path.join(root, 'call.json');
  // Even a whitespace-only replacement is a different retained-file identity.
  await fs.writeFile(replacement, Buffer.concat([recorded, Buffer.from(' ')]));
  h.setService(async (...args) => args[2].method === 'send_assistance'
    ? { status: 'completed', retained: true, body: 'Mathematical assistance: completed',
      path: replacement, revision: navigation.digest(recorded) }
    : runBridge(...args));
  await h.commands.get('mrw.sendRequest')();
  assert.equal(h.requests.at(-1).revision, navigation.digest(recorded));
  assert.match(h.errors.at(-1), /changed since review/);
  assert.match(h.shown.at(-1).text, /completed/);
  assert.ok(h.shown.every(doc => !doc.text.includes('outcome is uncertain')));
});

test('language changes preserve the selected review identity and visible content', async t => {
  const root = await temporary(t), h = await harness(root);
  const first = path.resolve(__dirname, '../../tests/fixtures/mechanical_model_call.json');
  const second = path.join(root, 'another-call.json');
  await fs.copyFile(first, second);
  h.opens.push([uri(first)]); await h.commands.get('mrw.review')();
  h.inputs.push('1'); await h.commands.get('mrw.passage')();
  const firstPassage = h.shown.at(-1);
  h.opens.push([uri(second)]); await h.commands.get('mrw.review')();
  h.inputs.push('1'); await h.commands.get('mrw.passage')();
  // The initial *.txt association already caused a language-change close/open.
  // Exercise a later manual language change on the older review as well.
  await h.api.languages.setTextDocumentLanguage(firstPassage, 'markdown');
  assert.equal(firstPassage.isClosed, false);
  assert.equal(h.providers.get('mrw-record').provideTextDocumentContent(firstPassage.uri), firstPassage.text);
  h.focus(h.editor(firstPassage));
  h.focus(h.editor(h.document(path.join(root, 'note.md'), 'ordinary work')));
  await h.commands.get('mrw.insert')();
  assert.equal(h.requests.at(-1).method, 'contribution');
  assert.equal(h.requests.at(-1).path, first);
  assert.equal(h.requests.at(-1).number, 1);
  assert.deepEqual(h.errors, []);
});

test('new activation cannot attach a new record to a restored virtual document', async t => {
  const root = await temporary(t), h = await harness(root);
  const fixture = path.resolve(__dirname, '../../tests/fixtures/mechanical_model_call.json');
  h.opens.push([uri(fixture)]); await h.commands.get('mrw.review')();
  const old = h.shown.at(-1);
  const resumed = await harness(root);
  // A restored editor is already cached before the next explicit record action.
  const restored = resumed.document(old.uri.path, 'Previous-session content', 'mrw-record');
  resumed.opens.push([uri(fixture)]); await resumed.commands.get('mrw.review')();
  const fresh = resumed.shown.at(-1);
  assert.notEqual(fresh.uri.toString(), old.uri.toString());
  assert.notEqual(fresh.text, 'Previous-session content');
  assert.deepEqual(resumed.errors, []);
  resumed.inputs.push('1'); await resumed.commands.get('mrw.passage')();
  resumed.focus(resumed.editor(restored));
  resumed.focus(resumed.editor(resumed.document(path.join(root, 'note.md'), 'ordinary work')));
  const before = resumed.requests.length;
  await resumed.commands.get('mrw.insert')();
  assert.equal(resumed.requests.length, before);
  assert.match(resumed.errors.at(-1), /Review Model Response first/);
});

test('disposed virtual documents release content and cannot select a different review', async t => {
  const root = await temporary(t), h = await harness(root);
  const fixture = path.resolve(__dirname, '../../tests/fixtures/mechanical_model_call.json');
  h.opens.push([uri(fixture)]); await h.commands.get('mrw.review')();
  h.inputs.push('1'); await h.commands.get('mrw.passage')();
  const old = h.shown.at(-1);
  h.closeDocument(old);
  const reopened = await h.api.workspace.openTextDocument(old.uri);
  assert.match(reopened.text, /no longer available/);
  h.focus(h.editor(reopened));
  const before = h.requests.length;
  await h.commands.get('mrw.fullResponse')();
  assert.equal(h.requests.length, before);
  assert.match(h.errors.at(-1), /Review Model Response first/);
});

async function continuation(h) {
  const fixture = path.resolve(__dirname, '../../tests/fixtures/mechanical_model_call.json');
  h.opens.push([uri(fixture)]); await h.commands.get('mrw.review')();
  h.inputs.push('1', 'Follow-up question', 'Human correction α😀', 'fake-model');
  await h.commands.get('mrw.continueAnswer')();
  assert.deepEqual(h.errors, []);
  return h.requests.findLast(r => r.method === 'prepare_assistance' || r.method === 'artifact_status').draft;
}
async function deterministicSend(h, draft, status = 'completed') {
  const cp = require('node:child_process');
  const artifacts = path.dirname(draft.output);
  await fs.mkdir(artifacts, { recursive: true });
  h.setService((extension, executable, request, options = {}) => runBridge(extension, executable, request, { ...options,
    spawn: (exe, args, settings) => cp.spawn(exe, ['-I', path.join(extension, 'test/host/deterministic_bridge.py'), artifacts, status], settings) }));
  await h.commands.get('mrw.sendRequest')();
  assert.deepEqual(h.errors, []);
}

test('bounded continuation previews exact evidence, persists, resumes and ends without deleting records', async t => {
  const root = await temporary(t), h = await harness(root);
  const draft = await continuation(h);
  assert.equal(draft.passage_numbers[0], 1);
  assert.match(h.shown.at(-1).text, /Linked mathematical continuation preview/);
  assert.match(h.shown.at(-1).text, /Human correction α😀/);
  assert.ok(h.requests.every(r => r.method !== 'send_assistance'));
  await deterministicSend(h, draft);
  const child = await fs.readFile(draft.output);
  const pointer = path.join(draft.store, 'active.json');
  assert.equal(JSON.parse(await fs.readFile(pointer)).active.phase, 'terminal');
  const restarted = await harness(root);
  await restarted.commands.get('mrw.resumeInvestigation')();
  assert.match(restarted.shown.at(-1).text, /Human correction α😀/);
  assert.match(restarted.shown.at(-1).text, /Child terminal status: completed/);
  restarted.endings.push('Cancel'); await restarted.commands.get('mrw.endInvestigation')();
  assert.notEqual(JSON.parse(await fs.readFile(pointer)).active, null);
  restarted.endings.push('End without insertion'); await restarted.commands.get('mrw.endInvestigation')();
  assert.equal(JSON.parse(await fs.readFile(pointer)).active, null);
  assert.deepEqual(await fs.readFile(draft.output), child);
  assert.deepEqual(restarted.errors, []);
});

test('ending inserts the latest unsaved human summary once and preserves the selected note', async t => {
  const root = await temporary(t), h = await harness(root);
  const draft = await continuation(h); await deterministicSend(h, draft);
  h.inputs.push('Latest unsaved issue'); await h.commands.get('mrw.editIssue')();
  const pointer = path.join(draft.store, 'active.json');
  assert.equal(JSON.parse(await fs.readFile(pointer)).active.summary.unresolved_issue, '');
  const note = h.document(path.join(root, 'note.md'), 'ordinary argument'), editor = h.editor(note);
  h.focus(editor); h.endings.push('Insert handoff and end');
  await h.commands.get('mrw.endInvestigation')();
  assert.match(note.text, /Latest unsaved issue/);
  assert.ok(note.text.startsWith('o')); assert.ok(note.text.endsWith('rdinary argument'));
  assert.equal(note.text.split('[Investigation handoff').length, 2);
  assert.equal(JSON.parse(await fs.readFile(pointer)).active, null);
  assert.deepEqual(h.errors, []);
});

test('restore blocks ending, and publication failure keeps human text and inserted handoff', async t => {
  const root = await temporary(t), h = await harness(root);
  const draft = await continuation(h); await deterministicSend(h, draft);
  const original = await fs.readFile(path.join(draft.store, 'active.json'));
  const restarted = await harness(root);
  let complete;
  restarted.setService(async (...args) => args[2].method === 'resume_investigation'
    ? new Promise(resolve => { complete = () => runBridge(...args).then(resolve); }) : runBridge(...args));
  const restore = restarted.commands.get('mrw.resumeInvestigation')();
  while (!complete) await new Promise(resolve => setTimeout(resolve, 10));
  await restarted.commands.get('mrw.endInvestigation')();
  assert.match(restarted.errors.pop(), /Wait for/);
  complete(); await restore;
  restarted.inputs.push('Latest task text'); await restarted.commands.get('mrw.editConclusion')();
  restarted.focus(restarted.editor(restarted.document(path.join(root, 'note.md'), 'work')));
  const note = restarted.api.window.activeTextEditor.document;
  restarted.setService(async (...args) => args[2].method === 'end_investigation'
    ? { blocked: true, write_error: 'synthetic sync failure' } : runBridge(...args));
  restarted.endings.push('Insert handoff and end'); await restarted.commands.get('mrw.endInvestigation')();
  assert.match(restarted.errors.pop(), /publication failed/);
  assert.match(note.text, /Latest task text/);
  assert.deepEqual(await fs.readFile(path.join(draft.store, 'active.json')), original);
  await restarted.commands.get('mrw.endInvestigation')();
  assert.match(restarted.errors.pop(), /blocked/);
});

test('ending revalidates the note after confirmation and changed records keep the summary', async t => {
  const root = await temporary(t), h = await harness(root);
  const draft = await continuation(h); await deterministicSend(h, draft);
  const note = h.document(path.join(root, 'note.md'), 'work'), ed = h.editor(note); h.focus(ed);
  h.api.window.showWarningMessage = async () => { note.version++; note.text += ' concurrent'; return 'Insert handoff and end'; };
  await h.commands.get('mrw.endInvestigation')();
  assert.match(h.errors.pop(), /note or selection changed/);
  assert.equal(note.text, 'work concurrent');
  await fs.appendFile(draft.output, ' ');
  await h.commands.get('mrw.resumeInvestigation')();
  assert.match(h.shown.at(-1).text, /missing or changed/);
  assert.match(h.shown.at(-1).text, /Human correction α😀/);
  assert.deepEqual(h.errors, []);
});

test('an unrelated R2 draft cannot replace the active investigation handoff question', async t => {
  const root = await temporary(t), h = await harness(root);
  const child = await continuation(h); await deterministicSend(h, child);
  await ask(h, root);
  h.inputs.push('Current investigation question'); await h.commands.get('mrw.editInvestigationQuestion')();
  h.focus(h.editor(h.document(path.join(root, 'handoff.md'), 'saved work')));
  h.endings.push('Insert handoff and end'); await h.commands.get('mrw.endInvestigation')();
  const text = h.api.window.activeTextEditor.document.text;
  assert.match(text, /Current investigation question/);
  assert.ok(!text.includes('Why α?'));
  assert.deepEqual(h.errors, []);
});

test('repeated request views reuse the host research group', async t => {
  const root = await temporary(t), h = await harness(root);
  await ask(h, root);
  const column = h.api.window.activeTextEditor.viewColumn;
  for (let i = 0; i < 3; i++) {
    h.inputs.push(`Revised question ${i}`); await h.commands.get('mrw.editQuestion')();
    assert.equal(h.api.window.activeTextEditor.viewColumn, column);
  }
  assert.deepEqual(h.errors, []);
});

test('Markdown overview references two saved sources, follows retained regions after edits and reload, and never writes on follow', async t => {
  const root = await temporary(t), h = await harness(root), created = [];
  for (const [name, text] of [['book.md', 'α😀 → β\r\nClaim.\r\n'], ['article.txt', 'Second source.\nArgument.\n']]) {
    const file = path.join(root, name); await fs.writeFile(file, text);
    const ed = h.editor(h.document(file, text)); ed.selection = new Selection(new Position(0, 1), new Position(1, 5)); h.focus(ed);
    created.push(await h.commands.get('mrw.createOutline')());
  }
  const file = path.join(root, 'overview.md'); await fs.writeFile(file, '');
  const doc = h.document(file, ''); doc.languageId = 'markdown'; const ed = h.editor(doc);
  ed.selection = new Selection(new Position(0, 0), new Position(0, 0)); h.focus(ed);
  h.picks.push({ id: created[0].outline.id }, { region: created[0].outline.regions[0].id });
  const first = await h.commands.get('mrw.insertOutlineReference')();
  assert.ok(doc.text.includes(first.reference)); assert.equal(doc.isDirty, true);
  ed.selection = new Selection(new Position(0, doc.text.length), new Position(0, doc.text.length));
  h.picks.push({ id: created[1].outline.id }, { region: null });
  const second = await h.commands.get('mrw.insertOutlineReference')();
  assert.notEqual(second.reference, first.reference); assert.ok(doc.text.includes('article'));
  const before = doc.text;
  ed.selection = new Selection(new Position(0, 3), new Position(0, 3));
  const firstFollow = await h.commands.get('mrw.followOutlineReference')();
  assert.ok(firstFollow, h.errors.join('\n'));
  assert.equal(firstFollow.status, 'unchanged');
  assert.equal(h.api.window.activeTextEditor.document.uri.scheme, 'mrw-record');
  assert.equal(h.api.window.activeTextEditor.document.languageId, 'plaintext');
  assert.equal(h.api.window.activeTextEditor.selection.start.character, 1);
  assert.equal(doc.text, before);
  // Navigation after a fresh extension activation uses the persisted source,
  // even when its original is missing and the region was moved in the reader.
  const panel = h.panels[0], region = created[0].outline.regions[0];
  await panel.receive({ type: 'edit', change: { kind: 'replace_region', region: region.id, start: [1, 0], end: [1, 6] } });
  await fs.unlink(path.join(root, 'book.md'));
  const restarted = await harness(root), md = restarted.document(file, before); md.languageId = 'markdown';
  const re = restarted.editor(md); re.selection = ed.selection; restarted.focus(re);
  const followed = await restarted.commands.get('mrw.followOutlineReference')();
  assert.equal(followed.status, 'changed or removed'); assert.equal(followed.region, null);
  assert.equal(restarted.panels[0].webview.messages.at(-1).selected, null);
  assert.equal(restarted.api.window.activeTextEditor.document.getText(), 'α😀 → β\r\nClaim.\r\n');
  assert.equal(md.text, before); assert.deepEqual(restarted.errors, []); assert.deepEqual(h.errors, []);
});

test('Markdown reference insertion respects cancellation, editor changes, workspace and document boundaries', async t => {
  const root = await temporary(t), h = await harness(root), src = path.join(root, 'source.txt');
  await fs.writeFile(src, 'Source.'); h.focus(h.editor(h.document(src, 'Source.')));
  const created = await h.commands.get('mrw.createOutline')();
  const file = path.join(root, 'overview.md'); await fs.writeFile(file, 'Reader synthesis.');
  const doc = h.document(file, 'Reader synthesis.'); doc.languageId = 'markdown'; const ed = h.editor(doc); h.focus(ed);
  h.picks.push(undefined); await h.commands.get('mrw.insertOutlineReference')(); assert.equal(doc.text, 'Reader synthesis.');
  h.picks.push({ id: created.outline.id }, { region: null });
  h.setService(async (...args) => {
    const result = await runBridge(...args);
    if (args[2].method === 'outline_reference') doc.version++;
    return result;
  });
  await h.commands.get('mrw.insertOutlineReference')(); assert.match(h.errors.pop(), /changed during selection/);
  assert.equal(doc.text, 'Reader synthesis.');
  doc.text = '[bad](mrw-outline:v1/../../command:evil)'; ed.selection = new Selection(new Position(0, 2), new Position(0, 2));
  await h.commands.get('mrw.followOutlineReference')(); assert.match(h.errors.pop(), /Malformed/); assert.equal(h.panels.length, 1);
  doc.languageId = 'plaintext'; const calls = h.requests.length;
  await h.commands.get('mrw.insertOutlineReference')(); assert.match(h.errors.pop(), /Markdown/); assert.equal(h.requests.length, calls);
  const foreign = path.join(root, '..', 'unselected.md'); await fs.writeFile(foreign, '# Unselected\n');
  const external = h.document(foreign, '# Unselected\n'); external.languageId = 'markdown'; h.focus(h.editor(external));
  h.api.workspace.getWorkspaceFolder = () => undefined;
  await h.commands.get('mrw.insertOutlineReference')(); assert.match(h.errors.pop(), /outside the selected scope/);
});


test('companion commands work without an editor, preserve pins, and keep associations across reopen', async t => {
  const root = await temporary(t), source = path.join(root, 'book α.txt'), raw = 'α😀 → β\nClaim.\nProof.';
  await fs.writeFile(source, raw);
  const h = await harness(root); h.focus(h.editor(h.document(source, raw)));
  const created = await h.commands.get('mrw.createOutline')();
  h.focus(undefined);
  const markdown = await h.commands.get('mrw.copyOutlineLink')();
  assert.match(markdown, /vscode:\/\/flengyel.mrw\/outline/);
  assert.ok(!markdown.includes('SHA')); assert.ok(!markdown.includes('source\\:'));
  h.inputs.push('obsidian://open?vault=Notes%20α&file=Math202610170001', 'Existing mathematical note');
  await h.commands.get('mrw.associateObsidianNote')();
  const restarted = await harness(root);
  await restarted.commands.get('mrw.openObsidianNote')();
  assert.equal(restarted.api.external.scheme, 'obsidian');
  assert.equal(restarted.api.external.path, '/Notes α/Math202610170001');
  restarted.inputs.push('obsidian://open?vault=Notes%20α&file=Math202610170002', 'Second saved label');
  await restarted.commands.get('mrw.associateObsidianNote')();
  const originalPick = restarted.api.window.showQuickPick;
  let noteChoices;
  restarted.api.window.showQuickPick = async options => {
    if (options.some(o => o.url)) { noteChoices = options; return options.find(o => o.label === 'Second saved label'); }
    return options[0];
  };
  await restarted.commands.get('mrw.openObsidianNote')();
  assert.deepEqual(noteChoices.map(o => o.label), ['Existing mathematical note', 'Second saved label']);
  assert.equal(restarted.api.external.path, '/Notes α/Math202610170002');
  restarted.api.window.showQuickPick = originalPick;
  assert.equal(await fs.readFile(source, 'utf8'), raw);
  // The handler and clipboard command share the Python reference resolver.
  restarted.api.env.clipboard.value = markdown;
  await restarted.commands.get('mrw.openLinkFromClipboard')();
  assert.ok(restarted.requests.some(r => r.method === 'outline_follow_reference'));
  const rawUri = /\]\((.*)\)$/u.exec(markdown)[1];
  let minimalSerialization;
  await restarted.api.uriHandler.handleUri({ toString(skipEncoding) {
    minimalSerialization = skipEncoding;
    return skipEncoding ? rawUri : rawUri.replace('?v=1&target=', '?v%3D1%26target%3D');
  } });
  assert.equal(minimalSerialization, true);
  const panel = restarted.panels[0];
  await panel.receive({type:'manage_notes', region:null}); // cancelled replace prompt
  assert.equal(created.outline.source.revision, navigation.digest(raw));
  assert.deepEqual([...h.errors, ...restarted.errors], []);
});

test('external links refuse unrelated workspaces before private resolution and offer explicit recovery', async t => {
  const root = await temporary(t), source = path.join(root, 'book.txt'); await fs.writeFile(source, 'Claim.');
  const h = await harness(root); h.focus(h.editor(h.document(source, 'Claim.'))); await h.commands.get('mrw.createOutline')();
  const markdown = await h.commands.get('mrw.copyOutlineLink')();
  const other = await temporary(t), wrong = await harness(other);
  wrong.api.env.clipboard.value = markdown;
  await wrong.commands.get('mrw.openLinkFromClipboard')();
  assert.ok(!wrong.requests.some(r => r.method === 'outline_follow_reference'));
  const recovery = [];
  wrong.api.commands.executeCommand = async (...args) => recovery.push(args);
  wrong.endings.push('Copy Link and Open Workspace');
  await wrong.commands.get('mrw.openLinkFromClipboard')();
  const opened = recovery.find(r => r[0] === 'vscode.openFolder'); assert.ok(opened); assert.equal(opened[2], undefined);
  assert.match(wrong.api.env.clipboard.value, /^vscode:/);
  assert.deepEqual(wrong.errors, []);
  let finishWarning, announceWarning;
  const displayed = new Promise(resolve => { announceWarning = resolve; });
  wrong.api.window.showWarningMessage = () => { announceWarning(); return new Promise(resolve => { finishWarning = resolve; }); };
  const pending = wrong.commands.get('mrw.openLinkFromClipboard')();
  await displayed;
  await wrong.commands.get('mrw.copyOutlineLink')();
  assert.match(wrong.errors.pop(), /No saved sources/);
  finishWarning(undefined); await pending;
  assert.deepEqual(wrong.errors, []);
});

test('artifact move confirms scope, rebinds an open reader, keeps old links and rejects a stale window', async t => {
  const root = await temporary(t, true), source = path.join(root, 'move α.txt');
  await fs.writeFile(source, 'α😀 retained passage\n');
  const h = await harness(root); const doc=h.document(source, 'α😀 retained passage\n'); h.focus(h.editor(doc));
  const created=await h.commands.get('mrw.createOutline')();
  const link=await h.commands.get('mrw.copyOutlineLink')();
  h.inputs.push('obsidian://open?vault=Zettelkasten&file=Move20261019','Saved move note');
  await h.commands.get('mrw.associateObsidianNote')();
  const savedNoteReference=h.panels[0].webview.messages.at(-1).notes[0].reference;
  const stale=await harness(root); await stale.commands.get('mrw.openOutline')();
  const destination=path.join(root,'..','moved α');h.inputs.push(destination);h.endings.push('Move saved work');
  const moved=await h.commands.get('mrw.moveArtifactDirectory')();
  assert.equal(h.errors.length,0);assert.equal(moved.committed,true);assert.equal(moved.location,destination);
  assert.ok(h.panels[0].webview.messages.some(m=>m.type==='storageCheck'));
  assert.ok(h.panels[0].webview.messages.some(m=>m.type==='storageRelease'));
  assert.equal(h.panels[0].webview.messages.at(-1).model.outline.id,created.outline.id);
  h.api.env.clipboard.value=link;await h.commands.get('mrw.openLinkFromClipboard')();
  assert.equal(h.errors.length,0);assert.equal(h.panels[0].webview.messages.at(-1).model.outline.id,created.outline.id);
  await h.panels[0].receive({type:'open_note',region:null});
  assert.deepEqual(h.errors,[]);assert.equal(h.api.external.path,'/Zettelkasten/Move20261019');
  h.picks.push('Replace linked note');h.inputs.push('obsidian://open?vault=Zettelkasten&file=MoveReplacement','Replacement note');
  await h.panels[0].receive({type:'manage_notes',region:null});
  assert.deepEqual(h.errors,[]);assert.equal(h.panels[0].webview.messages.findLast(m=>m.type==='outline').notes[0].reference,savedNoteReference);
  h.picks.push('Remove note link');await h.panels[0].receive({type:'manage_notes',region:null});
  assert.deepEqual(h.errors,[]);assert.equal(h.panels[0].webview.messages.findLast(m=>m.type==='outline').notes.length,0);
  await stale.panels[0].receive({type:'toggle',region:created.outline.regions[0].id});
  assert.match(stale.errors.at(-1),/stale client/);
  const status=await h.commands.get('mrw.artifactLocation')();assert.equal(status.location,destination);
});

for (const operation of ['move', 'open', 'prepare', 'reconnect', 'recover']) {
  test(`saved sources remain readable while the ${operation} completion notice is undismissed`, { timeout: 60000 }, async t => {
    const root = await temporary(t, true), source = path.join(root, 'source.txt');
    await fs.writeFile(source, 'Retained source.\n');
    const globalState = new Map();
    let h = await harness(root, new Map(), { globalState });
    h.focus(h.editor(h.document(source, 'Retained source.\n')));
    const created = await h.commands.get('mrw.createOutline')();
    let command;
    if (operation === 'move') {
      h.inputs.push(path.join(root, '..', 'saved-work'));
      h.endings.push('Move saved work'); command = 'mrw.moveArtifactDirectory';
    } else if (operation === 'open') {
      const destination = path.join(root, '..', 'saved-work');
      h.inputs.push(destination); h.endings.push('Move saved work');
      await h.commands.get('mrw.moveArtifactDirectory')();
      h = await harness(await temporary(t, true));
      h.inputs.push(destination); h.endings.push('Open saved work'); command = 'mrw.openArtifactDirectory';
    } else if (operation === 'prepare') {
      h.endings.push('Prepare saved work'); command = 'mrw.prepareFolderRename';
    } else if (operation === 'reconnect') {
      h.endings.push('Prepare saved work'); await h.commands.get('mrw.prepareFolderRename')();
      const renamed = path.join(root, '..', 'renamed-study'); await fs.rename(root, renamed);
      h = await harness(renamed, new Map(), { globalState, storage: path.join(root, '..', 'reconnected-state') });
      h.endings.push('Reconnect saved work'); command = 'mrw.reconnectRenamedFolder';
    } else command = 'mrw.recoverArtifactMove';
    assert.deepEqual(h.errors, []);
    let announce, dismiss;
    const displayed = new Promise(resolve => { announce = resolve; });
    const notification = new Promise(resolve => { dismiss = resolve; });
    h.api.window.showInformationMessage = () => { announce(); return notification; };
    const action = h.commands.get(command)();
    t.after(async () => { dismiss(); await action; });
    await Promise.race([displayed, action.then(() => {
      throw new Error(`No completion notice: ${h.errors.join('; ')}`);
    })]);
    await h.commands.get('mrw.openOutline')();
    assert.deepEqual(h.errors, []);
    const model = h.panels.at(-1).webview.messages.findLast(message => message.type === 'outline').model;
    assert.equal(model.outline.id, created.outline.id);
    dismiss(); await action;
  });
}

test('cancelling a pending Open or Move directory prompt releases the reader without changing stores', async t => {
  const root = await temporary(t, true), source = path.join(root, 'source.txt');
  await fs.writeFile(source, 'Retained source.\n');
  const h = await harness(root); h.focus(h.editor(h.document(source, 'Retained source.\n')));
  const created = await h.commands.get('mrw.createOutline')();
  for (const command of ['mrw.openArtifactDirectory', 'mrw.moveArtifactDirectory']) {
    let announce, cancel;
    const displayed = new Promise(resolve => { announce = resolve; });
    h.api.window.showInputBox = () => { announce(); return new Promise(resolve => { cancel = resolve; }); };
    const pending = h.commands.get(command)();
    t.after(async () => { cancel?.(); await pending; });
    await displayed;
    await h.commands.get('mrw.openOutline')();
    assert.match(h.errors.pop(), /operation is in progress/);
    assert.ok(!h.requests.some(request => ['artifact_move', 'artifact_adopt'].includes(request.method)));
    cancel(); await pending;
    await h.commands.get('mrw.openOutline')();
    assert.deepEqual(h.errors, []);
    assert.equal(h.panels.at(-1).webview.messages.findLast(message => message.type === 'outline').model.outline.id, created.outline.id);
  }
});

test('artifact move cancellation and dirty reader drafts preserve the original store', async t => {
  const root=await temporary(t, true),source=path.join(root,'draft.txt');await fs.writeFile(source,'retained\n');
  const h=await harness(root);h.focus(h.editor(h.document(source,'retained\n')));await h.commands.get('mrw.createOutline')();
  const before=await h.commands.get('mrw.artifactLocation')();
  h.panels[0].webview.dirty=true;
  await h.commands.get('mrw.moveArtifactDirectory')();assert.match(h.errors.at(-1),/unsaved reader annotations/);
  assert.equal(h.panels[0].webview.dirty,true);
  assert.ok(h.panels[0].webview.messages.some(m=>m.type==='storageRelease'));
  h.panels[0].webview.dirty=false;h.inputs.push(path.join(root,'..','cancelled move'));
  await h.commands.get('mrw.moveArtifactDirectory')();
  assert.equal((await h.commands.get('mrw.artifactLocation')()).location,before.location);
  assert.ok(!h.requests.some(r=>r.method==='artifact_move'));
});

test('adopted synchronized identity permits an old external route only in the explicitly mapped local workspace', async t => {
  const root=await temporary(t,true),source=path.join(root,'portable α.txt');await fs.writeFile(source,'exact retained α\n');
  const h=await harness(root);h.focus(h.editor(h.document(source,'exact retained α\n')));
  const created=await h.commands.get('mrw.createOutline')();const markdown=await h.commands.get('mrw.copyOutlineLink')();
  const moved=path.join(root,'..','portable artifacts');h.inputs.push(moved);h.endings.push('Move saved work');
  await h.commands.get('mrw.moveArtifactDirectory')();assert.deepEqual(h.errors,[]);
  const local=await temporary(t,true),copy=path.join(local,'..','synchronized artifacts');await fs.cp(moved,copy,{recursive:true});
  const receiver=await harness(local);receiver.inputs.push(copy);receiver.endings.push('Open saved work');
  await receiver.commands.get('mrw.openArtifactDirectory')();assert.deepEqual(receiver.errors,[]);
  receiver.api.env.clipboard.value=markdown;await receiver.commands.get('mrw.openLinkFromClipboard')();
  assert.deepEqual(receiver.errors,[]);assert.ok(receiver.requests.some(r=>r.method==='artifact_match_reference'));
  assert.equal(receiver.panels[0].webview.messages.at(-1).model.outline.id,created.outline.id);
  const returnLink=await receiver.commands.get('mrw.copyOutlineLink')();
  h.api.env.clipboard.value=returnLink;await h.commands.get('mrw.openLinkFromClipboard')();
  assert.deepEqual(h.errors,[]);assert.equal(h.panels[0].webview.messages.at(-1).model.outline.id,created.outline.id);
});

test('prepare, real folder rename, reconnect and reopen preserve exact passages, annotations and earlier links', async t => {
  const root = await temporary(t, true), original = 'α😀 retained\nproof α\n';
  const source = path.join(root, 'source α.txt'); await fs.writeFile(source, original);
  const globalState = new Map(), h = await harness(root, new Map(), { globalState });
  const editor = h.editor(h.document(source, original));
  editor.selection = new Selection(new Position(0, 1), new Position(1, 5)); h.focus(editor);
  const created = await h.commands.get('mrw.createOutline')(), region = created.outline.regions[0];
  await h.panels[0].receive({ type: 'edit', change: { kind: 'annotation', region: region.id, id: null,
    purpose: 'explanation', text: 'Synthetic AI explanation α', origin: 'ai_proposal', author: 'Synthetic AI' } });
  h.picks.push({ id: created.outline.id }, { region: region.id });
  const link = await h.commands.get('mrw.copyOutlineLink')();
  h.endings.push('Prepare saved work');
  const prepared = await h.commands.get('mrw.prepareFolderRename')();
  assert.deepEqual(h.errors, []); assert.equal(prepared.committed, true);
  assert.equal(path.dirname(prepared.location), path.join(root, '..', 'global-state'));
  assert.equal((await fs.readFile(source, 'utf8')), original);
  const hints = globalState.get('mrw.preparedFolderRenames.v1');
  assert.equal(hints[prepared.store_id].location, prepared.location);
  const renamed = path.join(root, '..', 'Renamed study α'); await fs.rename(root, renamed);
  const options = { globalState, storage: path.join(renamed, '..', 'renamed-private-state') };
  const receiver = await harness(renamed, new Map(), options);
  receiver.endings.push('Reconnect saved work');
  const connected = await receiver.commands.get('mrw.reconnectRenamedFolder')();
  assert.deepEqual(receiver.errors, []); assert.equal(connected.store_id, prepared.store_id);
  receiver.api.env.clipboard.value = link; await receiver.commands.get('mrw.openLinkFromClipboard')();
  assert.deepEqual(receiver.errors, []);
  let model = receiver.panels[0].webview.messages.findLast(m => m.type === 'outline').model;
  assert.equal(model.outline.id, created.outline.id);
  assert.equal(model.outline.source.path, source); // Immutable source provenance is historical.
  assert.deepEqual(model.outline.regions[0].span, region.span);
  assert.equal(model.outline.regions[0].annotations[0].text, 'Synthetic AI explanation α');
  const selected = receiver.api.window.activeTextEditor;
  assert.equal(selected.document.getText(selected.selection), '😀 retained\nproof');
  await receiver.panels[0].receive({ type: 'edit', change: { kind: 'annotation', region: region.id, id: null,
    purpose: 'question', text: 'Synthetic question after rename', origin: 'human_work', author: 'Test fixture' } });
  const restarted = await harness(renamed, new Map(), options); await restarted.commands.get('mrw.openOutline')();
  model = restarted.panels[0].webview.messages.findLast(m => m.type === 'outline').model;
  assert.equal(model.outline.regions[0].annotations.length, 2);
  assert.equal(model.outline.regions[0].annotations[0].provenance.author, 'Synthetic AI');
  assert.equal(await fs.readFile(path.join(renamed, 'source α.txt'), 'utf8'), original);
  assert.ok([...h.requests, ...receiver.requests, ...restarted.requests].every(r => /^(artifact_|outline_)/.test(r.method)));
});

test('folder preparation refuses reader drafts and cancellation without moving work or publishing a shortcut', async t => {
  const root = await temporary(t, true), source = path.join(root, 'draft.txt'), globalState = new Map();
  await fs.writeFile(source, 'retained\n');
  const h = await harness(root, new Map(), { globalState }); h.focus(h.editor(h.document(source, 'retained\n')));
  await h.commands.get('mrw.createOutline')(); const before = await h.commands.get('mrw.artifactLocation')();
  h.panels[0].webview.dirty = true;
  await h.commands.get('mrw.prepareFolderRename')(); assert.match(h.errors.pop(), /unsaved reader annotations/);
  assert.equal(h.panels[0].webview.dirty, true);
  h.panels[0].webview.dirty = false;
  await h.commands.get('mrw.prepareFolderRename')();
  assert.equal((await h.commands.get('mrw.artifactLocation')()).location, before.location);
  assert.equal(globalState.size, 0); assert.ok(!h.requests.some(r => r.method === 'artifact_move'));
  h.endings.push('Prepare saved work');
  h.setService(async (...args) => args[2].method === 'artifact_move'
    ? { committed: true, cleanup_pending: true, location: 'test location requiring recovery' } : runBridge(...args));
  await h.commands.get('mrw.prepareFolderRename')();
  assert.match(h.errors.pop(), /Preparation is unfinished.*Recover Artifact Move/);
  assert.equal(globalState.size, 0);
});

test('reconnect shortcuts cannot replace a store or bypass identity verification', async t => {
  const root = await temporary(t, true), source = path.join(root, 'retained.txt'), globalState = new Map();
  await fs.writeFile(source, 'retained\n');
  const h = await harness(root, new Map(), { globalState }); h.focus(h.editor(h.document(source, 'retained\n')));
  const created = await h.commands.get('mrw.createOutline')(); h.endings.push('Prepare saved work');
  const prepared = await h.commands.get('mrw.prepareFolderRename')(); assert.deepEqual(h.errors, []);
  await h.commands.get('mrw.reconnectRenamedFolder')(); assert.match(h.errors.pop(), /already has a saved-work binding/);
  const other = await temporary(t, true), receiver = await harness(other, new Map(), { globalState });
  receiver.setService(async (...args) => args[2].method === 'artifact_inspect'
    ? { store_id: 'different identity', projects: [root] } : runBridge(...args));
  await receiver.commands.get('mrw.reconnectRenamedFolder')();
  assert.match(receiver.errors.pop(), /identity differs/); assert.ok(!receiver.requests.some(r => r.method === 'artifact_adopt'));
  receiver.setService(runBridge);
  const ownSource = path.join(other, 'own.txt'); await fs.writeFile(ownSource, 'own study\n');
  receiver.focus(receiver.editor(receiver.document(ownSource, 'own study\n')));
  const own = await receiver.commands.get('mrw.createOutline')(); receiver.endings.push('Reconnect saved work');
  await receiver.commands.get('mrw.reconnectRenamedFolder')();
  assert.match(receiver.errors.pop(), /already has saved artifacts/);
  assert.equal((await receiver.commands.get('mrw.artifactLocation')()).store_id, null);
  await receiver.commands.get('mrw.openOutline')();
  assert.equal(receiver.panels[0].webview.messages.at(-1).model.outline.id, own.outline.id);
  assert.notEqual(own.outline.id, created.outline.id); assert.ok(prepared.store_id);
});

test('a reconnect-shortcut publication failure retains the committed store and reports its manual opening path', async t => {
  const root = await temporary(t, true), source = path.join(root, 'retained.txt'), globalState = new Map();
  await fs.writeFile(source, 'retained\n');
  globalState.set = () => { throw new Error('Injected shortcut failure'); };
  const h = await harness(root, new Map(), { globalState }); h.focus(h.editor(h.document(source, 'retained\n')));
  const created = await h.commands.get('mrw.createOutline')(); h.endings.push('Prepare saved work');
  await h.commands.get('mrw.prepareFolderRename')();
  assert.match(h.errors.pop(), /Saved work moved to .*shortcut could not be saved.*Open Saved Work Directory/);
  const status = await h.commands.get('mrw.artifactLocation')(); assert.ok(status.store_id);
  assert.ok((await fs.stat(status.location)).isDirectory()); assert.equal(globalState.size, 0);
  const restarted = await harness(root); await restarted.commands.get('mrw.openOutline')();
  assert.deepEqual(restarted.errors, []); assert.equal(restarted.panels[0].webview.messages.at(-1).model.outline.id, created.outline.id);
});

test('host directory synchronization failure blocks preparation before moving work, including an explicit retry', async t => {
  const root = await temporary(t, true), source = path.join(root, 'retained.txt'), globalState = new Map();
  await fs.writeFile(source, 'retained\n');
  const h = await harness(root, new Map(), { globalState }); h.focus(h.editor(h.document(source, 'retained\n')));
  await h.commands.get('mrw.createOutline')();
  const open = fs.open; let attempts = 0;
  fs.open = async (...args) => {
    if (args[0] === path.dirname(root) && args[1] === 'r') {
      attempts++; return { async sync() { throw new Error('Injected host directory sync failure'); }, async close() {} };
    }
    return open(...args);
  };
  try {
    for (let i = 0; i < 2; i++) {
      h.endings.push('Prepare saved work'); await h.commands.get('mrw.prepareFolderRename')();
      assert.match(h.errors.pop(), /Injected host directory sync failure/);
    }
  } finally { fs.open = open; }
  assert.equal(attempts, 2); assert.equal(globalState.size, 0);
  assert.ok(!h.requests.some(r => r.method === 'artifact_move'));
  assert.equal((await h.commands.get('mrw.artifactLocation')()).store_id, null);
});

test('Stacks import command previews identity/destination and preserves retained links, notes and repeat imports', async t => {
  const root = await temporary(t, true), h = await harness(root);
  h.setService((extension, executable, request, options) => runBridge(extension, executable, request, {
    ...options, spawn: (command, args, settings) => require('node:child_process').spawn(command,
      [args[0], path.join(extension, 'test/stacks_bridge.py')], settings),
  }));
  h.inputs.push('https://stacks.math.columbia.edu/tag/08ZD'); h.endings.push('Import section');
  const imported = await h.commands.get('mrw.importStacksSection')();
  assert.deepEqual(h.errors, []);
  assert.equal(imported.outline.regions.length, 9);
  assert.equal(imported.outline.published.tag, '08ZD');
  assert.match(h.panels[0].webview.html, /MathML|mathml/);
  assert.equal(h.requests.filter(r => r.method === 'outline_source_prepare' && r.source_id==='stacks-project').length, 1);
  await h.panels[0].receive({ type: 'stacks_reference', tag: '08ZE' });
  assert.deepEqual(h.errors, []);
  assert.match(h.shown.at(-1).getText(), /\\label\{lemma-Hausdorff\}/);
  const model = h.panels[0].webview.messages.filter(m => m.type === 'outline').at(-1).model;
  assert.equal(model.reference.status, 'unchanged');
  await h.panels[0].receive({ type: 'edit', change: { kind: 'annotation', region: null, id: null,
    purpose: 'question', text: 'Synthetic bridge check, not user work.', origin: 'unknown', author: 'Automated fixture' } });
  h.inputs.push('08ZD'); h.endings.push('Import section');
  const repeated = await h.commands.get('mrw.importStacksSection')();
  assert.equal(repeated.reused, true);
  assert.equal(repeated.outline.id, imported.outline.id);
  assert.equal(repeated.outline.annotations[0].text, 'Synthetic bridge check, not user work.');
  assert.equal(h.panels.length, 1);
  await h.panels[0].receive({ type: 'stacks_citation', tag: '08ZE' });
  assert.match(h.api.external.path, /^https:\/\/stacks.math.columbia.edu\/tag\/08ZE$/);
  const external = h.api.external;
  await h.panels[0].receive({ type: 'stacks_citation', tag: 'ZZZZ' });
  assert.equal(h.api.external, external);
  assert.match(h.errors.at(-1), /not an identified citation/);
  assert.ok(!h.requests.some(r => /send_assistance|project|check_documentary/.test(r.method)));
});

test('cancelled Stacks preview publishes no outline and invalid input cannot acquire a source', async t => {
  const root = await temporary(t, true), h = await harness(root);
  h.setService((extension, executable, request, options) => runBridge(extension, executable, request, {
    ...options, spawn: (command, args, settings) => require('node:child_process').spawn(command,
      [args[0], path.join(extension, 'test/stacks_bridge.py')], settings),
  }));
  await h.commands.get('mrw.importStacksSection')();
  assert.ok(!h.requests.some(r=>r.method==='outline_source_prepare'));
  h.inputs.push('08ZD');
  await h.commands.get('mrw.importStacksSection')();
  assert.equal(h.panels.length, 0);
  assert.ok(!h.requests.some(r => r.method === 'outline_source_import'));
  h.inputs.push('https://example.org/tag/08ZD');
  await h.commands.get('mrw.importStacksSection')();
  assert.match(h.errors.at(-1), /recognize|canonical/);
  assert.equal(h.panels.length, 0);
});

test('new reading overview uses the native Save choice and host editing, then remembers an editable saved page', async t => {
  const root = await temporary(t), h = await harness(root), file = path.join(root, 'my-study.md');
  const draft = h.document(path.join(root, 'other.md'), 'Unfinished work α😀'); draft.isDirty = true;
  h.focus(h.editor(draft)); h.saveChoices.push(uri(file));
  const model = await h.commands.get('mrw.newReadingOverview')();
  assert.ok(model, h.errors.join('\n'));
  assert.equal(h.saveDialogs.length, 1);
  assert.equal(h.saveDialogs[0].title, 'New Markdown document');
  assert.deepEqual(h.saveDialogs[0].filters, { Markdown: ['md', 'markdown'] });
  assert.equal(h.workspaceEdits.length, 1);
  assert.deepEqual(h.workspaceEdits[0].operations[0].options, { overwrite: false, ignoreIfExists: false });
  const doc = h.api.window.activeTextEditor.document;
  assert.equal(doc.uri.toString(), uri(file).toString());
  assert.equal(doc.languageId, 'markdown'); assert.equal(doc.isDirty, false);
  assert.match(doc.getText(), /^# Document\n/);
  assert.ok(model.all.some(node => node.label === 'Current question'));
  assert.equal(await fs.readFile(file, 'utf8'), doc.getText());
  assert.deepEqual(h.saves, [uri(file).toString()]);
  assert.equal(draft.getText(), 'Unfinished work α😀'); assert.equal(draft.isDirty, true);
  assert.equal(h.state.get('mrw.readingOutline.v1').uri, uri(file).toString());
  const restarted = await harness(root, h.state);
  assert.equal((await restarted.commands.get('mrw.openReadingOutline')()).all[0].label, 'Document');
  assert.equal(h.requests.length + restarted.requests.length, 0);
  assert.deepEqual([...h.errors, ...restarted.errors], []);
});

test('cancelling a new overview leaves the selected overview, files and drafts intact', async t => {
  const root = await temporary(t), h = await harness(root), file = path.join(root, 'existing.md');
  await fs.writeFile(file, '# Existing\n'); h.opens.push([uri(file)]);
  await h.commands.get('mrw.openReadingOutline')();
  const before = structuredClone(h.state.get('mrw.readingOutline.v1'));
  await h.commands.get('mrw.newReadingOverview')();
  assert.deepEqual(h.state.get('mrw.readingOutline.v1'), before);
  assert.equal(h.api.readingProvider.getChildren()[0].label, 'Existing');
  assert.equal(h.workspaceEdits.length, 0); assert.equal(h.saves.length, 0);
  assert.deepEqual(await fs.readdir(root), ['existing.md']);
  assert.equal(h.requests.length, 0); assert.deepEqual(h.errors, []);
});

test('new overview refuses an existing filename, a non-Markdown name and a symlink outside the workspace', async t => {
  const root = await temporary(t), h = await harness(root), file = path.join(root, 'existing.md');
  await fs.writeFile(file, 'Existing work α😀'); h.saveChoices.push(uri(file));
  await h.commands.get('mrw.newReadingOverview')(); assert.match(h.errors.pop(), /already exists/);
  assert.equal(await fs.readFile(file, 'utf8'), 'Existing work α😀');
  h.saveChoices.push(uri(path.join(root, 'wrong.txt')));
  await h.commands.get('mrw.newReadingOverview')(); assert.match(h.errors.pop(), /\.md or \.markdown/);
  const outside = path.join(root, '..', 'outside'); await fs.mkdir(outside);
  await fs.symlink(outside, path.join(root, 'escape'));
  h.saveChoices.push(uri(path.join(root, 'escape', 'new.md')));
  await h.commands.get('mrw.newReadingOverview')(); assert.match(h.errors.pop(), /outside the selected scope/);
  assert.deepEqual(await fs.readdir(outside), []);
  assert.equal(h.workspaceEdits.length, 0); assert.equal(h.saves.length, 0); assert.equal(h.state.size, 0);
});

test('a host creation failure preserves the prior navigator and never attempts Save', async t => {
  const root = await temporary(t), h = await harness(root), original = path.join(root, 'original.md');
  await fs.writeFile(original, '# Original\n'); h.opens.push([uri(original)]);
  await h.commands.get('mrw.openReadingOutline')();
  const before = structuredClone(h.state.get('mrw.readingOutline.v1'));
  h.api.workspace.applyEdit = async () => false;
  h.saveChoices.push(uri(path.join(root, 'new.md')));
  await h.commands.get('mrw.newReadingOverview')(); assert.match(h.errors.pop(), /could not be created/);
  assert.deepEqual(h.state.get('mrw.readingOutline.v1'), before);
  assert.equal(h.api.readingProvider.getChildren()[0].label, 'Original');
  assert.equal(h.saves.length, 0); assert.equal(h.requests.length, 0);
});

test('a failed first Save keeps the new editor draft without claiming a selected saved overview', async t => {
  const root = await temporary(t), options = { save: false }, h = await harness(root, new Map(), options);
  const file = path.join(root, 'new.md'); h.saveChoices.push(uri(file));
  await h.commands.get('mrw.newReadingOverview')();
  assert.match(h.errors.pop(), /open but was not saved/);
  const doc = h.api.window.activeTextEditor.document;
  assert.equal(doc.isDirty, true); assert.match(doc.getText(), /## Current question/);
  assert.equal(h.state.size, 0);
  assert.equal(await fs.readFile(file, 'utf8'), '');
  options.save = true; await doc.save();
  assert.ok(await h.commands.get('mrw.openReadingOutline')());
  assert.equal(h.state.get('mrw.readingOutline.v1').uri, uri(file).toString());
  assert.equal(h.requests.length, 0); assert.deepEqual(h.errors, []);
});

test('a delayed New dialog cannot create a file after a newer overview selection', async t => {
  const root = await temporary(t), h = await harness(root), file = path.join(root, 'late.md');
  let resolve;
  h.api.window.showSaveDialog = () => new Promise(done => { resolve = done; });
  const pending = h.commands.get('mrw.newReadingOverview')();
  const original = path.join(root, 'original.md'); await fs.writeFile(original, '# Original\n');
  const doc = await h.api.workspace.openTextDocument(uri(original)); h.focus(h.editor(doc));
  await h.commands.get('mrw.openReadingOutline')();
  resolve(uri(file)); await pending;
  assert.equal(h.workspaceEdits.length, 0);
  await assert.rejects(fs.lstat(file), { code: 'ENOENT' });
  assert.equal(h.state.get('mrw.readingOutline.v1').uri, uri(original).toString());
  assert.deepEqual(h.errors, []);
});

test('the offline tutorial opens a read-only Markdown preview without creating files or invoking services', async t => {
  const root = await temporary(t), h = await harness(root);
  assert.equal(h.reads.length, 0, 'activation does not read or open the tutorial');
  await h.commands.get('mrw.openTutorial')();
  const call = h.commandCalls.find(call => call.name === 'markdown.showPreview');
  assert.ok(call); assert.equal(call.args[0].scheme, 'mrw-help');
  const doc = await h.api.workspace.openTextDocument(call.args[0]);
  const exact = await fs.readFile(path.resolve(__dirname, '../media/first-steps.md'), 'utf8');
  assert.ok(doc.getText().includes('Active extension: **MRW'));
  assert.ok(doc.getText().includes('Open Document'));
  assert.ok(doc.getText().includes('https://github.com/flengyel/MRW/blob/main/docs/'));
  assert.equal(h.workspaceEdits.length, 0); assert.equal(h.requests.length, 0);
  assert.deepEqual(await fs.readdir(root), []);
});

test('Obsidian import offers three destinations and retains an external note as a reopenable source', async t => {
  const root=await temporary(t),note=path.join(root,'..','Note α.md');
  const text='---\r\ntitle: Note\r\n---\r\n# Claim\r\n[[Other]] ![[image.png]]\r\n\\(X\\times_ZY\\)\r\n';
  await fs.writeFile(note,'\ufeff'+text);
  const h=await harness(root),choices=[];
  h.api.window.showQuickPick=async options=>{choices.push(options);return options.find(o=>o.kind==='source')};
  h.opens.push([uri(note)]);
  const imported=await h.commands.get('mrw.importObsidianNote')();assert.ok(imported,h.errors.join('\n'));
  assert.deepEqual(choices[0].map(o=>o.kind),['source','annotation','overview']);
  assert.equal(imported.outline.regions[0].argument_text,text);
  assert.equal(imported.outline.source.authorship,'unknown');
  assert.equal(imported.outline.source.path,note);
  assert.equal(await fs.readFile(note,'utf8'),'\ufeff'+text);
  assert.equal(h.requests.filter(r=>r.method==='outline_import_note').length,1);
  await fs.unlink(note);const reopened=await harness(root);await reopened.commands.get('mrw.openOutline')();
  assert.equal(reopened.panels[0].webview.messages.findLast(m=>m.type==='outline').model.outline.regions[0].argument_text,text);
  assert.equal(h.requests.some(r=>r.method==='send_assistance'||r.method==='outline_render_diagram'),false);
  const manifest=JSON.parse(await fs.readFile(path.resolve(__dirname,'../package.json'),'utf8'));
  assert.ok(manifest.contributes.commands.some(c=>c.command==='mrw.importObsidianNote'));
});

test('Obsidian import can add exact note text to a chosen passage without replacing its notes', async t => {
  const root=await temporary(t),source=path.join(root,'source.txt'),note=path.join(root,'..','Obsidian.md');
  await fs.writeFile(source,'Source.');await fs.writeFile(note,'# My note\r\nA quotation [[Other]].');
  const h=await harness(root);h.focus(h.editor(h.document(source,'Source.')));
  const created=await h.commands.get('mrw.createOutline')(),region=created.outline.regions[0].id;
  await h.panels[0].receive({type:'edit',change:{kind:'annotation',region,id:null,purpose:'question',text:'Keep this note',origin:'human_work',author:'Reader'}});
  h.picks.push({kind:'annotation'});h.opens.push([uri(note)]);
  const saved=await h.commands.get('mrw.importObsidianNote')();assert.ok(saved,h.errors.join('\n'));
  const notes=saved.outline.regions[0].annotations;
  assert.equal(notes.length,2);assert.equal(notes[0].text,'Keep this note');
  assert.equal(notes[1].text,await fs.readFile(note,'utf8'));
  assert.equal(notes[1].provenance.origin,'unknown');assert.equal(notes[1].provenance.author,null);
  assert.equal(saved.outline.id,created.outline.id);
  assert.deepEqual(h.panels[0].webview.messages.at(-1),{type:'publishedFocus',region});
  assert.equal(h.requests.some(r=>r.method==='outline_import_note'),false);
});

test('Obsidian overview import uses the editor cursor and leaves the file unsaved without private writes', async t => {
  const root=await temporary(t),overview=path.join(root,'overview.md'),note=path.join(root,'..','Obsidian.md');
  const original='# Overview\n',text='# Imported\n[[Other]]\n';
  await fs.writeFile(overview,original);await fs.writeFile(note,text);
  const h=await harness(root),doc=await h.api.workspace.openTextDocument(uri(overview)),editor=h.editor(doc);
  editor.selection=new Selection(new Position(0,0),new Position(0,0));h.focus(editor);
  const edit=editor.edit.bind(editor);editor.edit=(change,options)=>{assert.deepEqual(options,{undoStopBefore:true,undoStopAfter:true});return edit(change)};
  h.picks.push({kind:'overview'});h.opens.push([uri(note)]);
  await h.commands.get('mrw.importObsidianNote')();
  assert.equal(doc.getText(),text+original);assert.equal(doc.isDirty,true);
  assert.equal(await fs.readFile(overview,'utf8'),original);assert.equal(await fs.readFile(note,'utf8'),text);
  assert.equal(h.requests.length,0);assert.equal(h.saves.length,0);assert.deepEqual(h.errors,[]);
});

test('Obsidian overview import offers a target picker when no overview is active', async t => {
  const root=await temporary(t),overview=path.join(root,'overview.md'),note=path.join(root,'..','Obsidian.md');
  await fs.writeFile(overview,'# Overview\n');await fs.writeFile(note,'Imported text');
  const h=await harness(root);h.picks.push({kind:'overview'});h.opens.push([uri(overview)],[uri(note)]);
  await h.commands.get('mrw.importObsidianNote')();
  assert.equal(h.dialogs[0].title,'Choose a Markdown document for insertion');assert.equal(h.dialogs[1].title,'Import Markdown text');
  assert.ok(h.api.window.activeTextEditor.document.getText().includes('Imported text'));
  assert.equal(h.requests.length,0);assert.deepEqual(h.errors,[]);
});

test('Obsidian import cancellation, unsaved notes and annotation limits make no private writes', async t => {
  const root=await temporary(t),note=path.join(root,'..','Obsidian.md');await fs.writeFile(note,'Text');
  const cancelled=await harness(root);cancelled.picks.push(undefined);await cancelled.commands.get('mrw.importObsidianNote')();
  assert.equal(cancelled.dialogs.length,0);assert.equal(cancelled.requests.length,0);
  const noFile=await harness(root);noFile.picks.push({kind:'source'});await noFile.commands.get('mrw.importObsidianNote')();
  assert.equal(noFile.requests.length,0);
  const dirty=await harness(root);const doc=dirty.document(note,'Changed buffer');doc.isDirty=true;dirty.api.workspace.textDocuments=[doc];
  dirty.picks.push({kind:'source'});dirty.opens.push([uri(note)]);await dirty.commands.get('mrw.importObsidianNote')();
  assert.match(dirty.errors[0],/Save the Markdown document/);assert.equal(dirty.requests.length,0);
  await fs.writeFile(note,'x'.repeat(16385));const large=await harness(root);large.picks.push({kind:'annotation'});large.opens.push([uri(note)]);
  await large.commands.get('mrw.importObsidianNote')();assert.match(large.errors[0],/16 KiB/);assert.equal(large.requests.length,0);
});

test('Obsidian overview import refuses a changed cursor or document without overwriting edits', async t => {
  for(const moved of [true,false]){
    const root=await temporary(t),overview=path.join(root,'overview.md'),note=path.join(root,'..','Obsidian.md');
    await fs.writeFile(overview,'# Overview\n');await fs.writeFile(note,'Imported text');
    const h=await harness(root),doc=await h.api.workspace.openTextDocument(uri(overview)),editor=h.editor(doc);h.focus(editor);
    h.picks.push({kind:'overview'});h.api.window.showOpenDialog=async()=>{
      if(moved)editor.selection=new Selection(new Position(0,0),new Position(0,0));
      else h.changeDocument(doc,0,0,'User edit\n');return[uri(note)];
    };
    await h.commands.get('mrw.importObsidianNote')();
    assert.match(h.errors[0],/document or cursor changed/);assert.ok(!doc.getText().includes('Imported text'));
    if(!moved)assert.ok(doc.getText().startsWith('User edit'));
    assert.equal(h.requests.length,0);
  }
});

test('the MRW starting view offers New, Open, saved sources and tutorial as registered commands', async t => {
  const root = await temporary(t), h = await harness(root);
  const manifest = JSON.parse(await fs.readFile(path.resolve(__dirname, '../package.json'), 'utf8'));
  const welcome = manifest.contributes.viewsWelcome.find(view => view.view === 'mrw.commands').contents;
  for (const command of ['mrw.openDocument', 'mrw.chooseNotesFolder', 'mrw.reopenDocument', 'mrw.newReadingOverview', 'mrw.openReadingOutline', 'mrw.openTutorial']) {
    assert.ok(welcome.includes('(command:' + command + ' ')); assert.ok(h.commands.has(command));
  }
  assert.ok(h.commands.has('mrw.openOutline'));
  assert.ok(!welcome.includes('(command:mrw.openOutline '));
  for (const command of ['mrw.newReadingOverview', 'mrw.openTutorial']) {
    assert.ok(manifest.contributes.menus['view/title'].some(item => item.when === 'view == mrw.readingOutline' && item.command === command));
  }
  assert.equal(h.requests.length, 0); assert.equal(h.reads.length, 0);
  const buttons = h.api.treeProviders['mrw.commands'];
  assert.deepEqual(await buttons.getChildren(), []);
  const file = path.join(root, 'active.md'); await fs.writeFile(file, '# Active document\n');
  const doc = await h.api.workspace.openTextDocument(uri(file)); doc.languageId = 'markdown';
  h.focus(h.editor(doc));
  await h.commands.get('mrw.openReadingOutline')();
  assert.equal(h.errors.length, 0); assert.equal(h.api.readingProvider.getChildren()[0].label, 'Active document');
  const saved = require('../src/studyModel').createStudy([{reference:'fixture-saved',source_revision:'a'.repeat(64),text:'Saved source',label:'Saved study'}],root);
  const studyHome=path.join(root,'..','private-state','active-studies-v1');
  await fs.mkdir(studyHome,{recursive:true});
  await fs.writeFile(path.join(studyHome,saved.id+'.json'),JSON.stringify(saved));
  h.state.set('mrw.lightStudy.recent.v1', [{id:'a'.repeat(64),title:'Stale cache entry',sources:1}]);
  assert.deepEqual(await buttons.getChildren(), []);
  const studies=await h.api.treeProviders['mrw.research'].getChildren();
  assert.equal(studies.length, 1);assert.equal(studies[0].study,saved.id);
  assert.equal(h.requests.length, 0);
});

test('reading outline offers a native Markdown file choice and remembers it without an active editor', async t => {
  const root = await temporary(t), h = await harness(root);
  const file = path.join(root, 'overview.md'), text = '# Chosen overview α😀\n\n## Next question\n';
  await fs.writeFile(file, text);
  h.opens.push([uri(file)]);
  let model = await h.commands.get('mrw.openReadingOutline')();
  assert.ok(model, h.errors.join('\n'));
  assert.equal(model.all.length, 2);
  assert.equal(h.dialogs.length, 1);
  assert.equal(h.dialogs[0].canSelectFiles, true);
  assert.equal(h.dialogs[0].canSelectFolders, false);
  assert.equal(h.dialogs[0].canSelectMany, false);
  assert.deepEqual(h.dialogs[0].filters, { Markdown: ['md', 'markdown'] });
  assert.equal(h.state.get('mrw.readingOutline.v1').uri, uri(file).toString());
  const doc = await h.api.workspace.openTextDocument(uri(file));
  h.changeDocument(doc, 0, 0, '# Unsaved question\n');
  h.focus(undefined);
  model = await h.commands.get('mrw.openReadingOutline')();
  assert.equal(model.all[0].label, 'Unsaved question');
  assert.equal(h.dialogs.length, 1, 'the live overview is remembered, including unsaved edits');
  const restored = await harness(root, h.state);
  model = await restored.commands.get('mrw.openReadingOutline')();
  assert.equal(model.all[0].label, 'Chosen overview α😀');
  assert.equal(restored.dialogs.length, 0, 'a saved choice reopens after restart without another picker');
  assert.equal(await fs.readFile(file, 'utf8'), text);
  assert.equal(h.requests.length + restored.requests.length, 0);
  assert.deepEqual([...h.errors, ...restored.errors], []);
});

test('reading overview choice can be cancelled or changed from the native menu without replacing drafts', async t => {
  const root = await temporary(t), h = await harness(root);
  assert.equal(await h.commands.get('mrw.openReadingOutline')(), undefined);
  assert.equal(h.state.size, 0); assert.equal(h.reads.length, 0);
  const file = path.join(root, 'first.md'); await fs.writeFile(file, '# First\n');
  h.opens.push([uri(file)]); await h.commands.get('mrw.openReadingOutline')();
  const doc = await h.api.workspace.openTextDocument(uri(file));
  h.changeDocument(doc, 0, 0, 'Unsent question α😀\n');
  h.api.collapseReading({ element: h.api.readingProvider.getChildren()[0] });
  await h.commands.get('mrw.openReadingOutline')();
  const before = structuredClone(h.state.get('mrw.readingOutline.v1'));
  assert.ok(h.commands.has('mrw.chooseReadingOverview'));
  await h.commands.get('mrw.chooseReadingOverview')();
  assert.deepEqual(h.state.get('mrw.readingOutline.v1'), before);
  const second = path.join(root, 'second.markdown'); await fs.writeFile(second, '# Second\n');
  h.opens.push([uri(second)]);
  const model = await h.commands.get('mrw.chooseReadingOverview')();
  assert.equal(model.all[0].label, 'Second');
  assert.equal(doc.getText(), 'Unsent question α😀\n# First\n');
  assert.ok(doc.isDirty);
  assert.equal(await fs.readFile(file, 'utf8'), '# First\n');
  assert.deepEqual(h.state.get('mrw.readingOutline.v1').collapsed, []);
  assert.equal(h.requests.length, 0); assert.deepEqual(h.errors, []);
});

test('a live untitled reading overview remains usable while another view is active', async t => {
  const root = await temporary(t), h = await harness(root);
  const doc = h.document('Untitled-1', '# Live overview\n', 'untitled'); doc.languageId = 'markdown';
  h.focus(h.editor(doc)); await h.commands.get('mrw.openReadingOutline')();
  h.focus(undefined);
  const model = await h.commands.get('mrw.openReadingOutline')();
  assert.equal(model.all[0].label, 'Live overview');
  assert.equal(h.dialogs.length, 0); assert.equal(h.reads.length, 0);
  assert.equal(h.state.get('mrw.readingOutline.v1').uri, undefined);
  assert.deepEqual(h.errors, []);
});

test('closing an untitled overview remembers the latest saved choice rather than the activation snapshot', async t => {
  const root = await temporary(t), first = path.join(root, 'first.md'), latest = path.join(root, 'latest.md');
  await fs.writeFile(first, '# First\n'); await fs.writeFile(latest, '# Latest\n');
  const state = new Map([['mrw.readingOutline.v1', { uri: uri(first).toString() }]]);
  const h = await harness(root, state);
  const doc = await h.api.workspace.openTextDocument(uri(latest)); h.focus(h.editor(doc));
  await h.commands.get('mrw.openReadingOutline')();
  const untitled = h.document('Untitled-2', '# Temporary\n', 'untitled'); untitled.languageId = 'markdown';
  h.focus(h.editor(untitled)); await h.commands.get('mrw.openReadingOutline')();
  assert.equal(state.get('mrw.readingOutline.v1').uri, uri(latest).toString());
  h.closeDocument(untitled); h.focus(undefined);
  const model = await h.commands.get('mrw.openReadingOutline')();
  assert.equal(model.all[0].label, 'Latest');
  assert.equal(h.dialogs.length, 0); assert.deepEqual(h.errors, []);
});

test('a missing remembered overview offers a replacement choice and cancellation preserves the old pointer', async t => {
  const root = await temporary(t), missing = path.join(root, 'missing.md'), next = path.join(root, 'next.md');
  const initial = { uri: uri(missing).toString(), collapsed: ['remembered-section'] };
  const state = new Map([['mrw.readingOutline.v1', initial]]), h = await harness(root, state);
  await h.commands.get('mrw.openReadingOutline')();
  assert.equal(h.dialogs.length, 1);
  assert.deepEqual(state.get('mrw.readingOutline.v1'), initial);
  await fs.writeFile(next, '# Next\n'); h.opens.push([uri(next)]);
  const model = await h.commands.get('mrw.openReadingOutline')();
  assert.equal(model.all[0].label, 'Next');
  assert.equal(state.get('mrw.readingOutline.v1').uri, uri(next).toString());
  assert.deepEqual(state.get('mrw.readingOutline.v1').collapsed, []);
  assert.equal(h.requests.length, 0); assert.deepEqual(h.errors, []);
});

test('Contents rejects unselected external documents but remembers an explicit external choice without importing it', async t => {
  const root = await temporary(t), h = await harness(root), foreign = path.join(root, '..', 'foreign.md');
  await fs.writeFile(foreign, '# Foreign\n');
  const unselected = h.document(foreign, '# Foreign\n'); unselected.languageId = 'markdown';
  h.focus(h.editor(unselected)); await h.commands.get('mrw.openReadingOutline')();
  assert.match(h.errors.pop(), /outside the selected scope/); assert.equal(h.reads.length, 0);
  h.focus(undefined); h.opens.push([uri(foreign)]);
  const model = await h.commands.get('mrw.openReadingOutline')();
  assert.equal(model.all[0].label, 'Foreign');
  const restarted = await harness(root, h.state);
  assert.equal((await restarted.commands.get('mrw.openReadingOutline')()).all[0].label, 'Foreign');
  const link = path.join(root, 'escape.md'); await fs.symlink(foreign, link);
  const unselectedLink = h.document(link, '# Foreign\n'); unselectedLink.languageId = 'markdown';
  h.focus(h.editor(unselectedLink)); await h.commands.get('mrw.openReadingOutline')();
  assert.match(h.errors.pop(), /outside the selected scope/);
  assert.equal(await fs.readFile(foreign, 'utf8'), '# Foreign\n');
  assert.equal(h.requests.length + restarted.requests.length, 0); assert.deepEqual(h.errors, []);
});

test('a delayed reading overview picker cannot replace a newer selected overview', async t => {
  const root = await temporary(t), h = await harness(root), older = path.join(root, 'older.md'), latest = path.join(root, 'latest.md');
  await fs.writeFile(older, '# Older\n'); await fs.writeFile(latest, '# Latest\n');
  let resolve;
  h.api.window.showOpenDialog = () => new Promise(done => { resolve = done; });
  const pending = h.commands.get('mrw.openReadingOutline')();
  const doc = await h.api.workspace.openTextDocument(uri(latest)); h.focus(h.editor(doc));
  await h.commands.get('mrw.openReadingOutline')();
  resolve([uri(older)]); await pending;
  assert.equal(h.state.get('mrw.readingOutline.v1').uri, uri(latest).toString());
  assert.equal(h.api.readingProvider.getChildren()[0].label, 'Latest');
  assert.ok(!h.reads.includes(uri(older).toString()));
  assert.deepEqual(h.errors, []);
});

test('reading navigator derives live Markdown, follows two sources, pins returns, and reconstructs saved UI state', async t => {
  const root = await temporary(t, true), h = await harness(root), references = [];
  for (const name of ['book.txt', 'article.txt']) {
    const file = path.join(root, name); await fs.writeFile(file, 'α😀 statement\nProof detail.\n');
    const doc = h.document(file, await fs.readFile(file, 'utf8')), ed = h.editor(doc); h.focus(ed);
    ed.selection = new Selection(new Position(0, 0), new Position(0, 13));
    const created = await h.commands.get('mrw.createOutline')();
    const model = created.outline;
    const base = { store: path.join(root, '..', 'private-state', `outlines-${navigation.digest(root)}`), project_root: root };
    for (const region of [null, model.regions[0].id]) references.push(await runBridge(path.resolve(__dirname, '..'), 'python3', {
      method: 'outline_reference', ...base, id: model.id, revision: created.revision, region }));
  }
  const file = path.join(root, 'overview.md'), original = `# α😀\n\n${references[0].markdown}\n\n## Again\n${references[1].markdown}\n\n## Again\n${references[1].markdown}\n${references[2].markdown}\n`;
  await fs.writeFile(file, original);
  const doc = h.document(file, original); doc.languageId = 'markdown'; h.focus(h.editor(doc));
  const before = h.requests.length;
  let model = await h.commands.get('mrw.openReadingOutline')();
  assert.equal(h.requests.length, before, 'opening the tree launches no bridge');
  assert.equal(model.all.length, 7);
  await h.commands.get('mrw.selectReadingOutlineItem')(model.all[4]);
  assert.equal(doc.getText(h.api.window.activeTextEditor.selection), '## Again');
  h.api.collapseReading({ element: model.roots[0] });
  let target = model.all.find(n => n.reference === references[1].reference);
  await h.commands.get('mrw.selectReadingOutlineItem')(target);
  assert.equal(h.api.window.activeTextEditor.document.getText(h.api.window.activeTextEditor.selection), 'α😀 statement');
  await h.commands.get('mrw.returnToReadingOutline')();
  assert.equal(doc.getText(h.api.window.activeTextEditor.selection), references[1].markdown);
  const prefix = 'Reader question\n\n'; h.changeDocument(doc, 0, 0, prefix);
  await h.commands.get('mrw.returnToReadingOutline')();
  assert.equal(doc.getText(h.api.window.activeTextEditor.selection), references[1].markdown);
  assert.equal(await fs.readFile(file, 'utf8'), original); assert.ok(doc.isDirty);
  model = await h.commands.get('mrw.refreshReadingOutline')();
  assert.equal(model.all[0].line, 2);
  await h.commands.get('mrw.selectReadingOutlineItem')(target);
  assert.match(h.errors.pop(), /document changed/);
  target = model.all.find(n => n.reference === references[1].reference);
  h.changeDocument(doc, target.start + 2, 1, 'X');
  await h.commands.get('mrw.returnToReadingOutline')(); assert.match(h.errors.pop(), /exact document location changed/);
  // Undo both edits to restore the exact original pin.
  h.changeDocument(doc, 0, doc.getText().length, original);
  await h.commands.get('mrw.returnToReadingOutline')();
  assert.equal(doc.getText(h.api.window.activeTextEditor.selection), references[1].markdown);
  model = await h.commands.get('mrw.refreshReadingOutline')();
  await h.commands.get('mrw.selectReadingOutlineItem')(model.all.at(-1));
  assert.equal(h.panels.at(-1).webview.messages.findLast(message => message.type === 'outline').reference.status, 'whole outline');
  await h.commands.get('mrw.returnToReadingOutline')();
  const restored = await harness(root, h.state);
  const restoredDoc = restored.document(file, original); restoredDoc.languageId = 'markdown'; restored.focus(restored.editor(restoredDoc));
  model = await restored.commands.get('mrw.openReadingOutline')();
  assert.equal(model.all.length, 7);
  assert.equal(restoredDoc.getText(restored.api.window.activeTextEditor.selection), references[2].markdown);
  const beforeWrong = restored.requests.length;
  restored.api.workspace.getWorkspaceFolder = () => undefined;
  restored.api.workspace.workspaceFolders = []; // No workspace or explicitly selected external scope remains.
  await restored.commands.get('mrw.returnToReadingOutline')(); assert.match(restored.errors.pop(), /scope/);
  assert.equal(restored.requests.length, beforeWrong);
  assert.equal(await fs.readFile(file, 'utf8'), original);
  assert.deepEqual(h.errors, []); assert.deepEqual(restored.errors, []);
});

test('failed source navigation during unsaved edits keeps the previous successful return occurrence', async t => {
  const root=await temporary(t),h=await harness(root);
  const {saved,region}=await sourceReader(h,root);
  const base={store:path.join(root,'..','private-state',`outlines-${navigation.digest(root)}`),project_root:root};
  const ref=(await runBridge(path.resolve(__dirname,'..'),'python3',{
    method:'outline_reference',...base,id:saved.outline.id,revision:saved.revision,region,
  })).reference;
  const first=`[First occurrence](${ref})`,second=`[Second occurrence](${ref})`;
  const original=`# Outline\n\n${first}\n\n${second}\n`,file=path.join(root,'overview.md');
  await fs.writeFile(file,original);
  const doc=h.document(file,original);doc.languageId='markdown';h.focus(h.editor(doc));
  const model=await h.commands.get('mrw.openReadingOutline')();
  await h.commands.get('mrw.selectReadingOutlineItem')(model.all[1]);
  let rejectFollow,started;
  const loading=new Promise(resolve=>{started=resolve;});
  h.setService((...args)=>args[2].method==='outline_follow_reference'
    ?new Promise((resolve,reject)=>{rejectFollow=reject;started();}):runBridge(...args));
  const following=h.commands.get('mrw.selectReadingOutlineItem')(model.all[2]);
  await loading;
  h.changeDocument(doc,0,0,'An unsaved reader question.\n\n');
  rejectFollow(Error('Retained source unavailable; no replacement was guessed.'));
  await following;
  assert.match(h.errors.pop(),/Retained source unavailable/);
  await h.commands.get('mrw.returnToReadingOutline')();
  assert.equal(doc.getText(h.api.window.activeTextEditor.selection),first);
  assert.equal(await fs.readFile(file,'utf8'),original);
  assert.equal(doc.isDirty,true);assert.deepEqual(h.errors,[]);
});

test('pending source returns track outside edits and reject overlap until exact undo', async t => {
  for (const overlap of [false,true]) await t.test(overlap?'overlap':'outside edit',async t=>{
    const root=await temporary(t),h=await harness(root);
    const {saved,region}=await sourceReader(h,root);
    const base={store:path.join(root,'..','private-state',`outlines-${navigation.digest(root)}`),project_root:root};
    const ref=(await runBridge(path.resolve(__dirname,'..'),'python3',{
      method:'outline_reference',...base,id:saved.outline.id,revision:saved.revision,region,
    })).reference;
    const link=`[Retained passage](${ref})`,original=`# Outline\n\n${link}\n`,file=path.join(root,'overview.md');
    await fs.writeFile(file,original);
    const doc=h.document(file,original);doc.languageId='markdown';h.focus(h.editor(doc));
    const model=await h.commands.get('mrw.openReadingOutline')();
    let release,started;const loading=new Promise(resolve=>{started=resolve;});
    const gate=new Promise(resolve=>{release=resolve;});
    // Pause after reference validation, while the real reader loads its notes.
    // Edits during the resolver itself are already refused by that caller.
    h.setService(async(...args)=>{if(args[2].method==='outline_notes'){started();await gate;}return runBridge(...args);});
    const following=h.commands.get('mrw.selectReadingOutlineItem')(model.all[1]);await loading;
    if(overlap)h.changeDocument(doc,model.all[1].start+2,1,'X');
    else h.changeDocument(doc,0,0,'An unsaved question.\n\n');
    release();await following;await h.commands.get('mrw.returnToReadingOutline')();
    if(overlap){
      assert.match(h.errors.pop(),/exact document location changed/);
      h.changeDocument(doc,0,doc.getText().length,original);
      await h.commands.get('mrw.returnToReadingOutline')();
    }
    assert.equal(doc.getText(h.api.window.activeTextEditor.selection),link);
    assert.equal(await fs.readFile(file,'utf8'),original);assert.deepEqual(h.errors,[]);
  });
});

test('navigator opens exact published mathematics without changing surrounding layout, retaining changed-range fallback and Return', async t => {
  const root = await temporary(t, true), h = await harness(root);
  h.setService((extension, executable, request, options) => runBridge(extension, executable, request, {
    ...options, spawn: (command, args, settings) => require('node:child_process').spawn(command,
      [args[0], path.join(extension, 'test/stacks_bridge.py')], settings),
  }));
  h.inputs.push('08ZD'); h.endings.push('Import section');
  const imported = await h.commands.get('mrw.importStacksSection')();
  const id = imported.outline.id, region = imported.outline.regions[1];
  const store = path.join(root, '..', 'private-state', `outlines-${navigation.digest(root)}`);
  const ref = await runBridge(path.resolve(__dirname, '..'), 'python3', { method: 'outline_reference', store,
    project_root: root, id, revision: imported.revision, region: region.id });
  const file = path.join(root, 'overview.md'), text = '# Reading\n\n' + ref.markdown + '\n';
  await fs.writeFile(file, text);
  const doc = h.document(file, text); doc.languageId = 'markdown';
  const unrelated = h.editor(h.document(path.join(root, 'unrelated.txt'), 'Unsaved surrounding work'));
  unrelated.viewColumn = 3; unrelated.document.isDirty = true;
  const draft = h.editor(h.document('Untitled-1', 'Keep this draft', 'untitled'));
  draft.viewColumn = 4; draft.document.isDirty = true;
  h.api.window.visibleTextEditors = [unrelated, draft]; h.focus(unrelated);
  h.api.window.tabGroups = { all: [{ viewColumn: 1, tabs: [{ input: { uri: doc.uri } }] }] };
  h.opens.push([doc.uri]);
  let model = await h.commands.get('mrw.chooseReadingOverview')();
  assert.equal(h.shown.at(-1), doc);
  assert.equal(h.api.window.activeTextEditor.viewColumn, 1);
  assert.equal(h.api.readingTree.description, 'overview.md');
  assert.ok(h.api.readingTree.message.includes(file));
  h.focus(unrelated);
  await h.commands.get('mrw.revealReadingDocument')();
  assert.equal(h.api.window.activeTextEditor.document, doc);
  const selectedBeforeCancel = JSON.stringify(h.state.get('mrw.readingOutline.v1'));
  const shownBeforeCancel = h.shown.length;
  await h.commands.get('mrw.chooseReadingOverview')();
  assert.equal(h.shown.length, shownBeforeCancel);
  assert.equal(JSON.stringify(h.state.get('mrw.readingOutline.v1')), selectedBeforeCancel);
  assert.ok(h.api.readingTree.message.includes(file));
  h.changeDocument(doc, 0, 0, 'Unsaved notes\n\n');
  model = await h.commands.get('mrw.refreshReadingOutline')();
  const node = model.all[1];
  assert.equal(h.api.readingProvider.getTreeItem(node).label, 'stacks-project:08ZE');
  const rawViews = () => h.shown.filter(d => d.uri.scheme === 'mrw-record').length;
  const before = rawViews();
  assert.equal((await h.commands.get('mrw.selectReadingOutlineItem')(node)).status, 'unchanged');
  assert.equal(rawViews(), before, 'an exact rendered region does not open a TeX editor automatically');
  assert.equal(h.panels[0].webview.messages.findLast(v => v.type === 'outline').readingFocus.region, region.id);
  const destination = h.panels[0].webview.messages.findLast(v => v.type === 'outline').returnDestination;
  assert.equal(destination.kind, 'citation'); assert.equal(destination.path, file);
  assert.match(destination.label, /Return to overview.md/);
  assert.equal(h.executed.some(command => /maximize|minimize|Sidebar|sideBar/i.test(command)), false);
  await h.commands.get('mrw.returnToReadingOutline')();
  assert.equal(doc.getText(h.api.window.activeTextEditor.selection), ref.markdown);
  for (const editor of [unrelated, draft]) {
    assert.ok(h.api.window.visibleTextEditors.includes(editor));
    assert.equal(editor.document.isDirty, true); assert.equal(editor.document.isClosed, false);
  }
  assert.equal(unrelated.document.getText(), 'Unsaved surrounding work');
  assert.equal(draft.document.getText(), 'Keep this draft');
  assert.equal(doc.isDirty, true); assert.equal(h.saves.length, 0);
  assert.equal(h.executed.some(command => /maximize|minimize|Sidebar|sideBar/i.test(command)), false);
  await h.panels[0].receive({ type: 'edit', change: { kind: 'replace_region', region: region.id, start: [0, 0], end: [0, 3] } });
  model = await h.commands.get('mrw.refreshReadingOutline')();
  assert.equal((await h.commands.get('mrw.selectReadingOutlineItem')(model.all[1])).status, 'changed or removed');
  assert.equal(h.api.window.activeTextEditor.document.uri.scheme, 'mrw-record');
  assert.equal(h.api.window.activeTextEditor.document.getText(h.api.window.activeTextEditor.selection), region.argument_text);
  assert.equal(h.panels[0].webview.messages.findLast(v => v.type === 'outline').selected, null);
  assert.equal(await fs.readFile(file, 'utf8'), text); assert.deepEqual(h.errors, []);
});

test('Contents navigation waits for native focus acknowledgement before using its exact selection', async t => {
  const root = await temporary(t), h = await harness(root), file = path.join(root, 'orientation.md');
  await fs.writeFile(file, '# Heading\n');
  const doc = h.document(file, '# Heading\n'); doc.languageId = 'markdown'; h.focus(h.editor(doc));
  const model = await h.commands.get('mrw.openReadingOutline')();
  const unrelated = h.editor(h.document('Untitled-1', 'Keep this draft', 'untitled'));
  unrelated.document.isDirty = true; h.focus(unrelated);
  h.api.window.showTextDocument = async document => {
    const target = h.editor(document);
    setTimeout(() => h.focus(target), 20);
    return target;
  };
  await h.commands.get('mrw.selectReadingOutlineItem')(model.all[0]);
  assert.equal(h.api.window.activeTextEditor.document, doc);
  assert.equal(doc.getText(h.api.window.activeTextEditor.selection), '# Heading');
  assert.equal(unrelated.document.getText(), 'Keep this draft'); assert.equal(unrelated.document.isDirty, true);
  assert.deepEqual(h.errors, []);
});

test('saved-source opening is discoverable and independent of an earlier citation return', async t => {
  const root = await temporary(t), h = await harness(root);
  const { saved, panel } = await sourceReader(h, root);
  const store = path.join(root, '..', 'private-state', `outlines-${navigation.digest(root)}`);
  const ref = await runBridge(path.resolve(__dirname, '..'), 'python3', { method: 'outline_reference', store,
    project_root: root, id: saved.outline.id, revision: saved.revision, region: null });
  const file = path.join(root, 'citation.md'), text = '# Citation\n' + ref.markdown + '\n';
  await fs.writeFile(file, text); const doc = h.document(file, text); doc.languageId = 'markdown'; h.focus(h.editor(doc));
  const model = await h.commands.get('mrw.openReadingOutline')();
  await h.commands.get('mrw.selectReadingOutlineItem')(model.all[1]);
  assert.equal(panel.webview.messages.findLast(message => message.type === 'outline').returnDestination.kind, 'citation');
  h.changeDocument(doc, 0, 0, 'Unsaved prefix\n');
  await panel.receive({ type: 'reading_return' });
  assert.equal(doc.getText(h.api.window.activeTextEditor.selection), ref.markdown);
  await h.commands.get('mrw.openOutline')();
  const independent = panel.webview.messages.findLast(message => message.type === 'outline').returnDestination;
  assert.equal(independent.kind, 'selected'); assert.match(independent.detail, /Opened independently/);
  assert.equal(independent.path, file);
  const manifest = JSON.parse(await fs.readFile(path.resolve(__dirname, '../package.json'), 'utf8'));
  assert.ok(manifest.contributes.viewsWelcome.find(view => view.view === 'mrw.commands').contents.includes('[Open Document…](command:mrw.openDocument '));
  assert.ok(!manifest.contributes.viewsWelcome.find(view => view.view === 'mrw.commands').contents.includes('(command:mrw.openOutline '));
  assert.ok(manifest.contributes.menus['view/title'].some(item => item.command === 'mrw.openOutline' && item.group.startsWith('navigation')));
  assert.equal(doc.isDirty, true); assert.equal(h.saves.length, 0); assert.deepEqual(h.errors, []);
});

test('annotation success feedback follows core publication and is absent after rejection', async t => {
  const root=await temporary(t), file=path.join(root,'source.txt');await fs.writeFile(file,'Source.');
  const h=await harness(root);h.focus(h.editor(h.document(file,'Source.')));
  const created=await h.commands.get('mrw.createOutline')();assert.ok(created);
  assert.match(h.panels[0].webview.html, /MRWAnnotations/);
  assert.match(h.panels[0].webview.html, /renderMathInElement/);
  const notices=[];h.api.window.setStatusBarMessage=text=>notices.push(text);
  const panel=h.panels[0], draft='note:overview:new';
  const value={type:'edit',draft,change:{kind:'annotation',region:null,id:null,purpose:'explanation',text:'Saved reader explanation',origin:'human_work',author:'Reader'}};
  await panel.receive(value);
  const saved=panel.webview.messages.findLast(m=>m.type==='outline');
  assert.equal(saved.annotationSaved,true);assert.equal(saved.clearDraft,draft);
  assert.equal(saved.model.outline.annotations[0].text,'Saved reader explanation');
  assert.deepEqual(notices,['MRW: Submitted annotation saved.']);
  const before=panel.webview.messages.length;
  h.setService(async()=>{const e=new Error('Revision conflict');e.code='ACTION_REJECTED';throw e});
  await panel.receive(value);
  assert.equal(panel.webview.messages.slice(before).some(m=>m.annotationSaved),false);
  assert.equal(panel.webview.messages.findLast(m=>m.type==='error').draft,draft);
  assert.equal(notices.length,1);
});

test('MRW Activity Bar entry exposes existing views and a registered reading menu without starting a bridge', async t => {
  const root=await temporary(t),h=await harness(root);
  const manifest=JSON.parse(await fs.readFile(path.resolve(__dirname,'../package.json'),'utf8'));
  const c=manifest.contributes,container=c.viewsContainers.activitybar.find(v=>v.id==='mrw');
  assert.ok(container);assert.equal(container.title,`MRW ${manifest.version}`);
  const svg=await fs.readFile(path.resolve(__dirname,'..',container.icon),'utf8');
  assert.match(svg,/<svg[^>]*viewBox="0 0 24 24"/);
  assert.doesNotMatch(svg,/<script|<image|href=/i);
  assert.deepEqual(c.views.mrw.map(v=>v.id),['mrw.readingOutline','mrw.commands','mrw.research']);
  assert.ok(!c.views.explorer?.some(v=>v.id.startsWith('mrw.')),'MRW views have one default container');
  const overflow=c.menus['view/title'].filter(v=>v.when==='view == mrw.readingOutline'&&!v.group?.startsWith('navigation'));
  for(const command of ['mrw.chooseReadingOverview','mrw.refreshReadingOutline','mrw.insertOutlineReference','mrw.importStacksSection','mrw.artifactLocation']){
    assert.ok(overflow.some(v=>v.command===command));assert.ok(h.commands.has(command));
  }
  for(const command of ['mrw.openOutline','mrw.revealReadingDocument']){
    assert.ok(c.menus['view/title'].some(item=>item.command===command&&item.when==='view == mrw.readingOutline'&&item.group?.startsWith('navigation')));
    assert.ok(h.commands.has(command));
  }
  assert.equal(h.requests.length,0,'registering the icon, views and menus launches no service');
});

test('reader Return reopens the rendered overview after its editor and preview tabs are closed', async t => {
  const root=await temporary(t),h=await harness(root),source=path.join(root,'source.txt');
  await fs.writeFile(source,'Source.');h.focus(h.editor(h.document(source,'Source.')));
  await h.commands.get('mrw.createOutline')();
  const file=path.join(root,'overview.md'),text='# Reading\n\n$x=y$\n';await fs.writeFile(file,text);
  const doc=h.document(file,text);doc.languageId='markdown';h.focus(h.editor(doc));
  await h.commands.get('mrw.openReadingOutline')();h.closeDocument(doc);h.focus(undefined);
  const previews=[];
  h.commands.set('markdown.showPreview',resource=>{
    assert.equal(h.api.window.activeTextEditor.document.uri.toString(),resource.toString());
    previews.push(h.api.window.activeTextEditor.document);h.focus(undefined);
  });
  for(let i=0;i<2;i++){
    await h.commands.get('mrw.openOutline')();const panel=h.panels[0],before=h.requests.length;
    await panel.receive({type:'reading_return'});
    assert.equal(previews.length,i+1,'Return must recreate a closed rendered view');
    assert.equal(previews.at(-1).uri.fsPath,file);assert.equal(previews.at(-1).getText(),text);
    assert.equal(h.api.window.activeTextEditor,undefined,'The rendered overview is the reading destination');
    assert.equal(h.requests.length,before);assert.equal(panel.webview.messages.at(-1).type,'idle');
    h.closeDocument(previews.at(-1));
  }
  assert.equal(await fs.readFile(file,'utf8'),text);assert.equal(h.saves.length,0);
  assert.equal(h.state.get('mrw.readingOutline.v1').origin,undefined);assert.deepEqual(h.errors,[]);
});

test('reader Return renders the exact source-link occurrence and rejects changed origins before preview', async t => {
  const root=await temporary(t),h=await harness(root);
  const {saved,region}=await sourceReader(h,root);
  const ref=(await runBridge(path.resolve(__dirname,'..'),'python3',{
    method:'outline_reference',store:path.join(root,'..','private-state',`outlines-${navigation.digest(root)}`),
    project_root:root,id:saved.outline.id,revision:saved.revision,region,
  })).reference;
  const link=`[Retained passage](${ref})`,text=`# Reading\n\n${link}\n\n## Again\n\n${link}\n`,file=path.join(root,'overview.md');
  await fs.writeFile(file,text);const doc=h.document(file,text);doc.languageId='markdown';h.focus(h.editor(doc));
  const model=await h.commands.get('mrw.openReadingOutline')(),target=model.all.at(-1);
  await h.commands.get('mrw.selectReadingOutlineItem')(target);h.closeDocument(doc);h.focus(undefined);
  const previews=[];
  h.commands.set('markdown.showPreview',resource=>{
    const editor=h.api.window.activeTextEditor;
    previews.push({resource,doc:editor.document,selected:editor.document.getText(editor.selection),start:editor.selection.start});
    h.focus(undefined);
  });
  await h.commands.get('mrw.returnToReadingOutline')();
  assert.equal(previews.length,1);assert.equal(previews[0].resource.fsPath,file);
  assert.equal(previews[0].selected,link);assert.equal(previews[0].start.line,6);
  assert.equal(h.api.window.activeTextEditor,undefined);
  h.changeDocument(previews[0].doc,target.start+2,1,'X');
  await h.commands.get('mrw.returnToReadingOutline')();
  assert.match(h.errors.pop(),/exact document location changed/);
  assert.equal(previews.length,1,'A failed exact return must not open a replacement preview');
  assert.equal(await fs.readFile(file,'utf8'),text);assert.equal(h.saves.length,0);assert.deepEqual(h.errors,[]);
});

test('reader Return without a source-link origin reopens the selected overview after restart', async t => {
  const root=await temporary(t),h=await harness(root),source=path.join(root,'source.txt');
  await fs.writeFile(source,'Source.');h.focus(h.editor(h.document(source,'Source.')));
  await h.commands.get('mrw.createOutline')();
  const file=path.join(root,'overview.md'),text='# Reading\n\n## Current question\n';
  await fs.writeFile(file,text);const doc=h.document(file,text);doc.languageId='markdown';h.focus(h.editor(doc));
  const model=await h.commands.get('mrw.openReadingOutline')();
  await h.commands.get('mrw.selectReadingOutlineItem')(model.all[1]);
  assert.equal(h.state.get('mrw.readingOutline.v1').origin,undefined);
  const restored=await harness(root,h.state);
  await restored.commands.get('mrw.openOutline')();const panel=restored.panels[0];
  const other=path.join(root,'README.md');await fs.writeFile(other,'# Other document\n');
  const unrelated=restored.document(other,'# Other document\n');unrelated.languageId='markdown';
  restored.focus(restored.editor(unrelated));
  const before=restored.requests.length;
  await panel.receive({type:'reading_return'});
  const editor=restored.api.window.activeTextEditor;
  assert.equal(editor.document.uri.fsPath,file);
  assert.equal(editor.document.getText(editor.selection),'## Current question');
  assert.equal(restored.api.readingProvider.getChildren()[0].label,'Reading');
  assert.equal(restored.executed.some(command => /maximize|minimize|Sidebar|sideBar/i.test(command)), false);
  assert.equal(restored.executed.includes('mrw.readingOutline.focus'), false);
  assert.equal(panel.webview.messages.at(-1).type,'idle');
  assert.equal(restored.requests.length,before,'Returning without a link does not read or change source records');
  assert.equal(restored.state.get('mrw.readingOutline.v1').origin,undefined,'An overview return is not a source-link occurrence');
  assert.equal(restored.commandCalls.findLast(call=>call.name==='markdown.showPreview').args[0].fsPath,file);
  assert.equal(await fs.readFile(file,'utf8'),text);
  assert.deepEqual(restored.errors,[]);
});

test('Return without a source-link origin preserves the live untitled overview and unsaved edits', async t => {
  const root=await temporary(t),h=await harness(root);
  const doc=h.document('/Reading draft.md','# Reading\n\n## Question\n','untitled');
  doc.languageId='markdown';h.focus(h.editor(doc));
  const model=await h.commands.get('mrw.openReadingOutline')();
  await h.commands.get('mrw.selectReadingOutlineItem')(model.all[1]);
  h.changeDocument(doc,0,0,'An unsaved question.\n\n');h.focus(undefined);
  await h.commands.get('mrw.returnToReadingOutline')();
  assert.equal(h.api.window.activeTextEditor.document,doc);
  assert.equal(doc.getText(h.api.window.activeTextEditor.selection),'## Question');
  assert.equal(doc.isDirty,true);assert.match(doc.getText(),/^An unsaved question/);
  assert.equal(h.commandCalls.findLast(call=>call.name==='markdown.showPreview').args[0].scheme,'untitled');
  assert.equal(h.requests.length,0);assert.equal(h.saves.length,0);assert.deepEqual(h.errors,[]);
});

test('reader Return without an overview offers a choice and cancellation leaves the reader usable', async t => {
  const root=await temporary(t),h=await harness(root),file=path.join(root,'source.txt');
  await fs.writeFile(file,'Source.');h.focus(h.editor(h.document(file,'Source.')));
  await h.commands.get('mrw.createOutline')();const panel=h.panels[0],before=h.requests.length;
  await panel.receive({type:'reading_return'});
  assert.equal(h.dialogs.at(-1).title,'Choose a Markdown document for Contents');
  assert.equal(panel.webview.messages.at(-1).type,'idle');
  assert.equal(h.requests.length,before);assert.equal(h.state.has('mrw.readingOutline.v1'),false);
  assert.equal(h.commandCalls.some(call=>call.name==='markdown.showPreview'),false);
  const overview=path.join(root,'overview.md');await fs.writeFile(overview,'# Chosen overview\n');
  h.opens.push([uri(overview)]);await panel.receive({type:'reading_return'});
  assert.equal(h.api.window.activeTextEditor.document.uri.fsPath,overview);
  assert.equal(h.state.get('mrw.readingOutline.v1').uri,uri(overview).toString());
  assert.equal(h.state.get('mrw.readingOutline.v1').origin,undefined);
  assert.ok(await h.commands.get('mrw.refreshSourceOutline')());
  assert.deepEqual(h.errors,[]);
});

test('Return without a source-link origin checks the remembered overview workspace before reading', async t => {
  const root=await temporary(t),file=path.join(root,'..','outside.md');await fs.writeFile(file,'# Outside\n');
  const state=new Map([['mrw.readingOutline.v1',{uri:uri(file).toString()}]]),h=await harness(root,state);
  await h.commands.get('mrw.returnToReadingOutline')();
  assert.match(h.errors.at(-1),/outside the selected scope/);
  assert.equal(h.reads.includes(uri(file).toString()),false);assert.equal(h.shown.length,0);
  assert.equal(h.state.get('mrw.readingOutline.v1').origin,undefined);
});

test('failed reader Return releases controls while its error notification remains open', async t => {
  const root=await temporary(t),file=path.join(root,'source.txt');await fs.writeFile(file,'Source.');
  const overview=path.join(root,'overview.md');
  const h=await harness(root);h.focus(h.editor(h.document(file,'Source.')));
  const saved=await h.commands.get('mrw.createOutline')(),panel=h.panels[0];
  const store=path.join(root,'..','private-state',`outlines-${navigation.digest(root)}`);
  const ref=await runBridge(path.resolve(__dirname,'..'),'python3',{method:'outline_reference',store,project_root:root,id:saved.outline.id,revision:saved.revision,region:null});
  await fs.writeFile(overview,'# Reading\n'+ref.markdown+'\n');
  const doc=h.document(overview,'# Reading\n'+ref.markdown+'\n');doc.languageId='markdown';h.focus(h.editor(doc));
  const model=await h.commands.get('mrw.openReadingOutline')();
  await h.commands.get('mrw.selectReadingOutlineItem')(model.all[1]);
  h.changeDocument(doc,model.all[1].start+2,1,'X');
  let dismiss,finished=false;
  h.api.window.showErrorMessage=message=>{h.errors.push(message);return new Promise(resolve=>{dismiss=resolve})};
  const pending=panel.receive({type:'reading_return'}).then(()=>{finished=true});
  try {
    await new Promise(resolve=>setTimeout(resolve,50));
    assert.match(h.errors.at(-1),/exact document location changed/);
    assert.equal(finished,true,'Dismissing an error notification is not part of Return');
    assert.equal(panel.webview.messages.at(-1).type,'idle');
    const refreshed=await h.commands.get('mrw.refreshSourceOutline')();
    assert.ok(refreshed,'A failed Return must release the outline operation lock');
  } finally { dismiss?.(); await pending; }
});

test('revealing a reader restores controls only after its pending operation finishes', async t => {
  const root=await temporary(t),file=path.join(root,'source.txt');await fs.writeFile(file,'Source.');
  const h=await harness(root);h.focus(h.editor(h.document(file,'Source.')));
  const saved=await h.commands.get('mrw.createOutline')(),panel=h.panels[0];
  panel.changeVisibility(false);let start=panel.webview.messages.length;
  const reads=h.requests.length;await panel.changeVisibility(true);
  assert.ok(panel.webview.messages.slice(start).some(m=>m.type==='idle'));
  assert.equal(h.requests.length,reads,'Restoring controls performs no core request');
  let release,entered;
  const waiting=new Promise(resolve=>{entered=resolve});
  h.setService(async(_a,_b,request)=>{
    if(request.method==='outline_load'){entered();return new Promise(resolve=>{release=()=>resolve(saved)})}
    if(request.method==='outline_notes')return{links:[],targets:{}};
    throw new Error('Unexpected request '+request.method);
  });
  const pending=panel.receive({type:'refresh'});await waiting;
  try {
    panel.changeVisibility(false);start=panel.webview.messages.length;await panel.changeVisibility(true);
    assert.equal(panel.webview.messages.slice(start).some(m=>m.type==='idle'),false);
  } finally {release();await pending;}
  assert.equal(panel.webview.messages.at(-1).type,'idle');
});

test('reader note deletion is confirmed, scoped, and announced only after core publication', async t => {
  const root=await temporary(t),file=path.join(root,'source.txt');await fs.writeFile(file,'Source.');
  const h=await harness(root);h.focus(h.editor(h.document(file,'Source.')));
  await h.commands.get('mrw.createOutline')();const panel=h.panels[0];
  const edit=async(region,text)=>panel.receive({type:'edit',change:{kind:'annotation',region,id:null,purpose:'explanation',text,origin:'ai_proposal',author:'Automated check'}});
  let latest=()=>panel.webview.messages.findLast(m=>m.type==='outline');
  const region=latest().model.outline.regions[0].id;
  await edit(null,'Keep source note');await edit(region,'Remove synthetic note');
  const note=latest().model.outline.regions[0].annotations[0],notices=[];
  h.api.window.setStatusBarMessage=text=>notices.push(text);
  const deletion={type:'delete_annotation',region,annotation:note.id,unsaved:true};
  let count=h.requests.length;await panel.receive(deletion);
  assert.equal(h.requests.length,count,'Cancellation makes no bridge call');
  assert.equal(latest().model.outline.regions[0].annotations.length,1);
  const confirmations=[];
  h.api.window.showWarningMessage=async(...args)=>{confirmations.push(args);return 'Delete note'};
  await panel.receive(deletion);
  assert.match(confirmations[0][0],/Remove synthetic note/);assert.match(confirmations[0][0],/Unsaved edits/);
  assert.deepEqual(confirmations[0].slice(1),[{modal:true},'Delete note']);
  assert.equal(latest().model.outline.regions[0].annotations.length,0);
  assert.equal(latest().model.outline.annotations[0].text,'Keep source note');
  assert.deepEqual(latest().deletedAnnotation,{region,id:note.id});
  assert.deepEqual(notices,['MRW: Reader note deleted.']);
  const before=h.requests.length;await panel.receive(deletion);
  assert.equal(h.requests.length,before);assert.equal(notices.length,1);
  assert.match(h.errors.at(-1),/Reader note changed/);
});

test('passage delete chooses only its own notes and cancellation preserves saved work', async t => {
  const root=await temporary(t),file=path.join(root,'source.txt');await fs.writeFile(file,'Source.');
  const h=await harness(root);h.focus(h.editor(h.document(file,'Source.')));
  await h.commands.get('mrw.createOutline')();const panel=h.panels[0];
  const latest=()=>panel.webview.messages.findLast(m=>m.type==='outline');
  const region=latest().model.outline.regions[0].id;
  const add=async(scope,text)=>panel.receive({type:'edit',change:{kind:'annotation',region:scope,id:null,purpose:'question',text,origin:'human_work',author:'Reader'}});
  await add(null,'Keep source note');await add(region,'Keep first');await add(region,'Delete second');
  const second=latest().model.outline.regions[0].annotations[1].id;
  const request={type:'delete_annotation',region,unsavedAnnotations:[second]},before=h.requests.length;
  h.api.window.showQuickPick=async()=>undefined;await panel.receive(request);
  assert.equal(h.requests.length,before);assert.equal(latest().model.outline.regions[0].annotations.length,2);
  h.api.window.showQuickPick=async(items,options)=>{
    assert.deepEqual(items.map(n=>n.label),['Keep first','Delete second']);
    assert.match(options.title,/Delete reader note/);return items[1];
  };
  h.api.window.showWarningMessage=async(message)=>{assert.match(message,/Delete second/);assert.match(message,/Unsaved edits/);return 'Delete note';};
  await panel.receive(request);
  assert.deepEqual(latest().model.outline.regions[0].annotations.map(n=>n.text),['Keep first']);
  assert.equal(latest().model.outline.annotations[0].text,'Keep source note');
  h.api.window.showQuickPick=async()=>{throw new Error('One note needs no picker');};
  h.api.window.showWarningMessage=async()=>undefined;const count=h.requests.length;
  await panel.receive({type:'delete_annotation',region});assert.equal(h.requests.length,count);
  assert.equal(latest().model.outline.regions[0].annotations.length,1);
});

test('reader note deletion rejection and uncertain publication preserve live notes without a success reply', async t => {
  for(const blocked of [false,true]){
    const root=await temporary(t),file=path.join(root,'source.txt');await fs.writeFile(file,'Source.');
    const h=await harness(root);h.focus(h.editor(h.document(file,'Source.')));
    await h.commands.get('mrw.createOutline')();const panel=h.panels[0];
    await panel.receive({type:'edit',change:{kind:'annotation',region:null,id:null,purpose:'question',text:'Keep until confirmed',origin:'human_work',author:'Reader'}});
    const saved=panel.webview.messages.findLast(m=>m.type==='outline'),note=saved.model.outline.annotations[0],notices=[];
    h.api.window.setStatusBarMessage=text=>notices.push(text);h.endings.push('Delete note');
    h.setService(async()=>{if(blocked)return{blocked:true,write_error:'Uncertain publication'};const e=new Error('Revision conflict');e.code='ACTION_REJECTED';throw e});
    const count=panel.webview.messages.length;
    await panel.receive({type:'delete_annotation',region:null,annotation:note.id});
    assert.equal(panel.webview.messages.slice(count).some(m=>m.deletedAnnotation),false);
    assert.equal(panel.webview.messages.findLast(m=>m.type==='outline'),saved);
    assert.deepEqual(notices,[]);
    assert.equal(panel.webview.messages.findLast(m=>m.type==='error').writesBlocked,blocked);
  }
});

test('proof visibility uses only host-local UI preferences and survives reader reopening', async t => {
  const root=await temporary(t),file=path.join(root,'source.txt');await fs.writeFile(file,'Source.');
  const state=new Map(),h=await harness(root,state);h.focus(h.editor(h.document(file,'Source.')));
  const created=await h.commands.get('mrw.createOutline')();assert.ok(created);
  const count=h.requests.length;
  await h.panels[0].receive({type:'proofVisibility',hidden:true});
  assert.equal(h.requests.length,count,'hiding invokes no Python service or record write');
  assert.equal(h.state.get('mrw.readerProofsHidden.v1'),true);
  await h.panels[0].receive({type:'ready'});
  assert.equal(h.panels[0].webview.messages.findLast(v=>v.type==='outline').proofsHidden,true);
  const reopened=await harness(root,state);await reopened.commands.get('mrw.openOutline')();
  assert.equal(reopened.panels[0].webview.messages.findLast(v=>v.type==='outline').proofsHidden,true);
});

test('diagram actions retain exact saved code, preserve notes, and reopen without rendering', async t => {
  const root=await temporary(t),file=path.join(root,'source.txt');await fs.writeFile(file,'Source.');
  const h=await harness(root);h.focus(h.editor(h.document(file,'Source.')));
  h.setService((extension,executable,request,options)=>runBridge(extension,executable,request,{
    ...options,spawn:(command,args,settings)=>require('node:child_process').spawn(command,[args[0],path.join(extension,'test/diagram_bridge.py')],settings)}));
  await h.commands.get('mrw.createOutline')();const panel=h.panels[0];
  const text='Reader explanation α\n```tikz\n\\begin{tikzcd}A \\arrow[r] & B\\end{tikzcd}\n```';
  await panel.receive({type:'edit',change:{kind:'annotation',region:null,id:null,purpose:'explanation',text,origin:'human_work',author:'Reader'}});
  const saved=panel.webview.messages.findLast(m=>m.type==='outline').model;
  const note=saved.outline.annotations[0],block=note.fragments.find(b=>b.kind==='tikz');
  assert.equal(h.requests.filter(r=>r.method==='outline_render_diagram').length,0);
  await panel.receive({type:'render_diagram',annotation:note.id,code:block.key});
  const rendered=panel.webview.messages.findLast(m=>m.type==='outline').model;
  assert.equal(rendered.revision,saved.revision);assert.equal(rendered.outline.annotations[0].text,text);
  assert.ok(rendered.outline.annotations[0].fragments.find(b=>b.kind==='tikz').image);
  assert.equal(h.requests.filter(r=>r.method==='outline_render_diagram').length,1);
  const count=h.requests.length;await panel.receive({type:'diagram_appearance',value:'dark'});
  assert.equal(h.requests.length,count);assert.equal(h.state.get('mrw.diagramAppearance.v2'),'dark');
  await panel.receive({type:'ready'});
  assert.equal(panel.webview.messages.findLast(m=>m.type==='outline').diagramAppearance,'dark');
  const reopened=await harness(root);await reopened.commands.get('mrw.openOutline')();
  assert.ok(reopened.panels[0].webview.messages.findLast(m=>m.type==='outline').model.outline.annotations[0].fragments.find(b=>b.kind==='tikz').image);
  assert.equal(reopened.requests.some(r=>r.method==='outline_render_diagram'),false);
  assert.equal(await fs.readFile(file,'utf8'),'Source.');assert.deepEqual(h.errors,[]);
});

test('diagram Theme default supersedes the legacy fixed mode and persists explicit overrides without core work', async t => {
  const root=await temporary(t),file=path.join(root,'source.txt');await fs.writeFile(file,'Source.');
  const state=new Map([['mrw.diagramAppearance.v1','dark']]),h=await harness(root,state);
  h.focus(h.editor(h.document(file,'Source.')));await h.commands.get('mrw.createOutline')();
  const panel=h.panels[0],latest=()=>panel.webview.messages.findLast(m=>m.type==='outline');
  assert.equal(latest().diagramAppearance,'theme');assert.match(panel.webview.html,/body\.vscode-dark/);
  const before=h.requests.length;
  for(const value of ['paper','dark','theme']){
    await panel.receive({type:'diagram_appearance',value});
    assert.equal(h.state.get('mrw.diagramAppearance.v2'),value);
  }
  assert.equal(h.requests.length,before);assert.equal(h.state.get('mrw.diagramAppearance.v1'),'dark');
  await panel.receive({type:'ready'});assert.equal(latest().diagramAppearance,'theme');
  const reopened=await harness(root,state);await reopened.commands.get('mrw.openOutline')();
  assert.equal(reopened.panels[0].webview.messages.findLast(m=>m.type==='outline').diagramAppearance,'theme');
  assert.equal(reopened.requests.some(r=>r.method==='outline_render_diagram'),false);
});

test('Return explicitly opens the overview preview in its group and preserves an unrelated Untitled draft', async t => {
  const root=await temporary(t),h=await harness(root),file=path.join(root,'overview.md');await fs.writeFile(file,'# Reading\n');
  const doc=h.document(file,'# Reading\n');doc.languageId='markdown';h.focus(h.editor(doc));
  await h.commands.get('mrw.openReadingOutline')();
  const returnCallsStart=h.commandCalls.length;
  const draft=h.document('Untitled-1','Unsaved reader work','untitled');draft.isDirty=true;
  h.api.commands.getCommands=async()=>['markdown.reopenAsPreview'];
  let rendered;
  h.commands.set('vscode.openWith',(resource,viewType,options)=>{rendered=resource;assert.equal(viewType,'vscode.markdown.preview.editor');assert.equal(options.viewColumn,1);h.focus(undefined)});
  await h.commands.get('mrw.returnToReadingOutline')();
  assert.equal(rendered,doc.uri);assert.equal(h.commandCalls.slice(returnCallsStart).some(c=>c.name==='markdown.showPreview'),false);
  assert.equal(draft.getText(),'Unsaved reader work');assert.equal(draft.isDirty,true);assert.equal(draft.isClosed,false);
  assert.equal(h.requests.length,0);assert.equal(h.saves.length,0);assert.deepEqual(h.errors,[]);
});

test('Return keeps its explicit document and group when editor focus changes before preview', async t => {
  const root=await temporary(t),h=await harness(root),file=path.join(root,'overview.md');await fs.writeFile(file,'# Reading\n');
  const doc=h.document(file,'# Reading\n');doc.languageId='markdown';
  const editor=h.editor(doc);editor.viewColumn=2;h.api.window.visibleTextEditors=[editor];h.focus(editor);
  await h.commands.get('mrw.openReadingOutline')();
  const draft=h.document('Untitled-1','Keep my draft','untitled');draft.isDirty=true;
  h.api.commands.getCommands=async()=>{h.focus(h.editor(draft));return ['markdown.reopenAsPreview']};
  await h.commands.get('mrw.returnToReadingOutline')();
  assert.equal(h.commandCalls.some(c=>c.name==='markdown.reopenAsPreview'),false);
  const preview=h.commandCalls.findLast(call=>call.name==='vscode.openWith');
  assert.equal(preview.args[0].fsPath,file);assert.equal(preview.args[2].viewColumn,2);
  assert.equal(draft.getText(),'Keep my draft');assert.equal(draft.isDirty,true);assert.equal(draft.isClosed,false);
  assert.equal(h.saves.length,0);assert.deepEqual(h.errors,[]);
});

test('Return discovers the native preview before its commands have activated', async t => {
  const root=await temporary(t),h=await harness(root),file=path.join(root,'overview.md');await fs.writeFile(file,'# Reading\n');
  const doc=h.document(file,'# Reading\n');doc.languageId='markdown';h.focus(h.editor(doc));
  await h.commands.get('mrw.openReadingOutline')();
  const returnCallsStart=h.commandCalls.length;
  h.api.extensions.getExtension=()=>({packageJSON:{contributes:{customEditors:[{viewType:'vscode.markdown.preview.editor'}]}}});
  h.api.commands.getCommands=async()=>[];
  await h.commands.get('mrw.returnToReadingOutline')();
  const preview=h.commandCalls.findLast(call=>call.name==='vscode.openWith');
  assert.equal(preview.args[0],doc.uri);assert.equal(preview.args[1],'vscode.markdown.preview.editor');assert.equal(preview.args[2].viewColumn,1);
  assert.equal(h.commandCalls.slice(returnCallsStart).some(call=>call.name==='markdown.showPreview'),false);
  assert.equal(h.saves.length,0);assert.deepEqual(h.errors,[]);
});

test('Study Current Material uses the selected retained passage without a question popup and preserves the old reader',async t=>{
 const root=await temporary(t),h=await harness(root),{saved,region}=await sourceReader(h,root),reader=h.panels[0];
 await reader.receive({type:'select',region});h.focus(undefined);
 const before=h.inputs.length;await reader.receive({type:'study_current'});
 assert.equal(h.inputs.length,before);assert.deepEqual(h.errors,[]);
 const study=h.panels.at(-1);await study.receive({type:'ready'});const view=study.webview.messages.findLast(m=>m.type==='active_study');
 assert.ok(view);assert.equal(view.study.passages.length,1);assert.ok(view.study.passages[0].reference.startsWith('mrw-outline:v1/'));assert.equal(view.study.questions.length,0);
 assert.ok(h.panels.includes(reader));assert.equal(saved.outline.regions.some(r=>r.id===region),true);
 const manifest=JSON.parse(await fs.readFile(path.resolve(__dirname,'../package.json'),'utf8'));
 assert.equal(manifest.contributes.views.mrw.find(v=>v.id==='mrw.research').name,'Studies');
 assert.ok(manifest.contributes.menus['view/title'].some(v=>v.command==='mrw.studyCurrent'&&v.group==='navigation'));
});

test('Open Study Example retains the bundled source explicitly and reuses the saved practice without replacing research',async t=>{
 const root=await temporary(t),h=await harness(root);await sourceReader(h,root);const sourcePanels=h.panels.length;
 const inputs=h.inputs.length;await h.commands.get('mrw.openStudyExample')();assert.deepEqual(h.errors,[]);assert.equal(h.inputs.length,inputs);
 const p=h.panels.at(-1);await p.receive({type:'ready'});const s=p.webview.messages.findLast(m=>m.type==='active_study').study;
 assert.ok(s.practice);assert.equal(s.questions.length,2);assert.ok(s.passages[0].reference.startsWith('mrw-outline:v1/'));
 assert.match(s.passages[0].text,/Sums of odd integers/);assert.equal(s.passages[0].license,'CC0-1.0');assert.equal(h.panels.length,sourcePanels+1);
 await p.receive({type:'next'});await p.receive({type:'draft',study:s.id,attempt:p.webview.messages.findLast(m=>m.type==='active_study').study.current.id,text:'Saved example work',paper:false});
 await h.commands.get('mrw.openStudyExample')();await p.receive({type:'ready'});assert.equal(p.webview.messages.findLast(m=>m.type==='active_study').study.current.draft,'Saved example work');
});

test('R4 explicit editor selection wins over remembered reader and stays pinned when retention moves focus',async t=>{
 const root=await temporary(t),h=await harness(root),{region}=await sourceReader(h,root),reader=h.panels[0];
 const file=path.join(root,'selected-B.md'),text='Selected B λ.\nOther text.';await fs.writeFile(file,text);
 const doc=h.document(file,text),ed=h.editor(doc);ed.selection=new Selection(new Position(0,0),new Position(0,13));h.focus(ed);
 // The reader remembers A while saved B remains the active text editor.
 await reader.receive({type:'select',region});
 let moved=false;h.setService(async(...args)=>{if(args[2].method==='outline_create'&&!moved){moved=true;h.focus(undefined);}return runBridge(...args);});
 await h.commands.get('mrw.studyCurrent')();assert.deepEqual(h.errors,[]);
 const study=h.panels.at(-1),state=()=>study.webview.messages.findLast(m=>m.type==='active_study').study;
 assert.equal(state().passages[0].text,'Selected B λ.');const b=state().id;
 const count=h.requests.length;h.focus(undefined);assert.equal(state().id,b);assert.equal(h.requests.length,count);
 // Reader action carries its own exact reference even with B selected in an editor.
 h.focus(ed);await reader.receive({type:'study_current'});assert.notEqual(state().id,b);assert.notEqual(state().passages[0].text,'Selected B λ.');
});

test('ordinary document follows and cursor commands keep the retained reader return occurrence isolated', async t => {
  const root = await temporary(t), h = await harness(root), { saved, region, panel } = await sourceReader(h, root);
  const reference = (await runBridge(path.resolve(__dirname, '..'), 'python3', {
    method: 'outline_reference', store: path.join(root, '..', 'private-state', `outlines-${navigation.digest(root)}`),
    project_root: root, id: saved.outline.id, revision: saved.revision, region,
  })).reference;
  const retained = `[Retained passage](${reference})`, ordinary = '[Note](other.md)';
  const original = `# Document\n\n${retained}\n\n${ordinary}\n`, file = path.join(root, 'overview.md'), other = path.join(root, 'other.md');
  await fs.writeFile(file, original); await fs.writeFile(other, '# Other note\nA separate argument.\n');
  const doc = h.document(file, original); doc.languageId = 'markdown'; h.focus(h.editor(doc));
  doc.offsetAt = point => doc.getText().split('\n').slice(0, point.line).reduce((offset, line) => offset + line.length + 1, 0) + point.character;
  const model = await h.commands.get('mrw.openReadingOutline')();
  const retainedNode = model.all.find(n => n.kind === 'reference'), ordinaryNode = model.all.find(n => n.kind === 'document_link');
  const draft = h.document('Untitled research', 'Unsent research work', 'untitled'); draft.isDirty = true;
  await h.commands.get('mrw.selectReadingOutlineItem')(retainedNode);
  const retainedOrigin = structuredClone(h.state.get('mrw.readingOutline.v1').origin);
  assert.equal(retainedOrigin.start, retainedNode.start); assert.equal(retainedOrigin.end, retainedNode.end);

  // Selecting an ordinary tree link establishes a separate generic Return route.
  await h.commands.get('mrw.selectReadingOutlineItem')(ordinaryNode);
  assert.equal(h.api.window.activeTextEditor.document.uri.fsPath, other);
  assert.equal(h.state.get('mrw.readingOutline.v1').route, 'ordinary');
  assert.deepEqual(h.state.get('mrw.readingOutline.v1').origin, retainedOrigin);
  await h.commands.get('mrw.returnToReadingOutline')();
  assert.equal(h.api.window.activeTextEditor.document, doc);
  assert.equal(doc.getText(h.api.window.activeTextEditor.selection), ordinary);

  // The retained reader's own Return restores its original exact occurrence.
  await panel.receive({ type: 'reading_return' });
  assert.equal(doc.getText(h.api.window.activeTextEditor.selection), retained);
  assert.deepEqual(h.state.get('mrw.readingOutline.v1').origin, retainedOrigin);
  assert.equal(panel.webview.messages.at(-1).type, 'idle');

  // The command-palette/cursor path must use the same ordinary route wiring.
  const editor = h.api.window.activeTextEditor, cursor = doc.positionAt(ordinaryNode.start + 2);
  editor.selection = new Selection(cursor, cursor); h.focus(editor);
  await h.commands.get('mrw.followDocumentLink')();
  assert.equal(h.api.window.activeTextEditor.document.uri.fsPath, other);
  await h.commands.get('mrw.returnToReadingOutline')();
  assert.equal(doc.getText(h.api.window.activeTextEditor.selection), ordinary);
  await panel.receive({ type: 'reading_return' });
  assert.equal(doc.getText(h.api.window.activeTextEditor.selection), retained);
  assert.deepEqual(h.state.get('mrw.readingOutline.v1').origin, retainedOrigin);
  assert.equal(await fs.readFile(file, 'utf8'), original); assert.equal(h.saves.length, 0);
  assert.equal(draft.getText(), 'Unsent research work'); assert.equal(draft.isDirty, true); assert.equal(draft.isClosed, false);
  assert.deepEqual(h.errors, []);
});

test('an explicitly chosen external document follows its current-workspace retained reference and returns without widening authority', async t => {
  const root = await temporary(t), h = await harness(root), { saved, region, panel } = await sourceReader(h, root);
  const artifactHome = path.join(root, '..', 'private-state');
  const before = await runBridge(path.resolve(__dirname, '..'), 'python3', { method: 'artifact_status', artifact_home: artifactHome });
  const reference = (await runBridge(path.resolve(__dirname, '..'), 'python3', {
    method: 'outline_reference', store: path.join(artifactHome, `outlines-${navigation.digest(root)}`),
    project_root: root, id: saved.outline.id, revision: saved.revision, region,
  })).reference;
  const foreign = path.join(root, '..', 'external-note.md'), neighbor = path.join(root, '..', 'neighbor.md');
  const link = `[Retained proof](${reference})`, text = `# External document\n\n${link}\n\n[Neighbor](neighbor.md)\n`;
  await fs.writeFile(foreign, text); await fs.writeFile(neighbor, '# Unselected neighbor\n');
  // Unlike the general legacy fixture, this facade models real workspace membership.
  h.api.workspace.getWorkspaceFolder = candidate => {
    const relative = path.relative(root, candidate.fsPath);
    return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative) ? { uri: uri(root) } : undefined;
  };
  assert.equal(h.api.workspace.getWorkspaceFolder(uri(foreign)), undefined);
  h.opens.push([uri(foreign)]);
  const model = await h.commands.get('mrw.chooseReadingOverview')();
  assert.ok(model); const retained = model.all.find(n => n.kind === 'reference');
  const selectedScope = structuredClone(h.state.get('mrw.documents.v1'));
  assert.deepEqual(selectedScope.grants.map(g => g.uri), [uri(foreign).toString()]);
  assert.equal(selectedScope.folder, undefined);
  const followed = await h.commands.get('mrw.selectReadingOutlineItem')(retained);
  assert.ok(followed, h.errors.join('\n'));
  assert.equal(followed.status, 'unchanged');
  const foreignDoc = h.shown.find(doc => doc.uri.fsPath === foreign);
  h.closeDocument(foreignDoc); h.focus(undefined);
  await panel.receive({ type: 'reading_return' });
  const editor = h.api.window.activeTextEditor;
  assert.equal(editor.document.uri.fsPath, foreign); assert.equal(editor.document.getText(editor.selection), link);
  assert.deepEqual(h.state.get('mrw.documents.v1').grants, selectedScope.grants);
  assert.equal(h.state.get('mrw.documents.v1').folder, undefined);
  assert.ok(h.requests.filter(r => r.method === 'outline_follow_reference').every(r => r.project_root === root));
  const after = await runBridge(path.resolve(__dirname, '..'), 'python3', { method: 'artifact_status', artifact_home: artifactHome });
  assert.deepEqual(after, before);
  assert.equal(await fs.readFile(foreign, 'utf8'), text); assert.equal(await fs.readFile(neighbor, 'utf8'), '# Unselected neighbor\n');
  assert.equal(h.saves.length, 0); assert.deepEqual(h.errors, []);
});


test('Contents rejects a PDF picker result before any host text read', async t => {
  const root = await temporary(t), h = await harness(root), file = path.join(root, 'paper.pdf');
  await fs.writeFile(file, '%PDF-1.4\n'); h.opens.push([uri(file)]);
  await h.commands.get('mrw.chooseReadingOverview')();
  assert.match(h.errors.pop(), /Use Open Document for other formats/);
  assert.equal(h.reads.length, 0); assert.equal(h.state.size, 0);
});

test('Kerodon import confirms a source-qualified page snapshot and reopens its exact reader offline', async t => {
  const root=await temporary(t),h=await harness(root);
  h.setService((extension,executable,request,options)=>runBridge(extension,executable,request,{...options,
    spawn:(command,args,settings)=>require('node:child_process').spawn(command,[args[0],path.join(extension,'test/kerodon_bridge.py')],settings)}));
  h.inputs.push('kerodon:0004');h.endings.push('Import section');
  const result=await h.commands.get('mrw.importKerodonSection')();assert.ok(result,h.errors.join('\n'));
  const pub=result.outline.published;assert.equal(pub.qualified_tag,'kerodon:0004');assert.equal(pub.authors,'Jacob Lurie');assert.equal(pub.commit,null);
  assert.ok(h.panels[0].webview.html.includes('MRWStacks'));assert.equal(h.requests.filter(r=>r.method==='outline_source_prepare'&&r.source_id==='kerodon').length,1);
  const statement=Object.values(pub.parts).find(p=>p.tag==='000A'&&p.role==='statement');
  await h.panels[0].receive({type:'stacks_reference',tag:'kerodon:000A'});
  assert.ok(h.panels[0].webview.messages.findLast(m=>m.type==='outline').reference.uri.startsWith('mrw-outline:v2/kerodon:000A/'));
  await h.panels[0].receive({type:'stacks_citation',tag:'kerodon:ZZZZ'});
  assert.equal(h.api.external.path,'https://kerodon.net/tag/ZZZZ');
  await h.panels[0].receive({type:'stacks_citation',tag:'stacks-project:ZZZZ'});assert.match(h.errors.pop(),/identified citation/);
  const again=await harness(root);await again.commands.get('mrw.openOutline')();
  assert.equal(again.panels[0].webview.messages.findLast(m=>m.type==='outline').model.outline.published.qualified_tag,'kerodon:0004');
  assert.deepEqual(h.errors,[]);assert.deepEqual(again.errors,[]);
});


test('import completion notifications do not hold the reader lock or block Return and refresh', async t => {
  for (const source of ['stacks', 'kerodon']) await t.test(source, async t => {
    const root = await temporary(t, true), file = path.join(root, 'overview.md');
    await fs.writeFile(file, '# Existing document\n\n## Question\n');
    const h = await harness(root, new Map([['mrw.readingOutline.v1', { uri: uri(file).toString() }]]));
    h.setService((extension, executable, request, options) => runBridge(extension, executable, request, {
      ...options, spawn: (command, args, settings) => require('node:child_process').spawn(command,
        [args[0], path.join(extension, `test/${source}_bridge.py`)], settings),
    }));
    const notifications = []; let notificationShown=()=>{};
    h.api.window.showInformationMessage = () => new Promise(resolve => { notifications.push(resolve); notificationShown(); });
    t.after(() => notifications.forEach(resolve => resolve()));
    const command = source === 'stacks' ? 'mrw.importStacksSection' : 'mrw.importKerodonSection';
    for (let repeat = 0; repeat < 2; repeat++) {
      h.inputs.push(source === 'stacks' ? 'stacks-project:08ZD' : 'kerodon:0004');
      h.endings.push('Import section');
      // Measure release from the notification boundary, not acquisition/disk I/O.
      const shown=new Promise(resolve=>{notificationShown=resolve;});
      const operation=h.commands.get(command)();
      const first=await Promise.race([operation.then(result=>({result})),shown.then(()=>({shown:true}))]);
      let timer;
      const result=first.shown?await Promise.race([operation,new Promise((_,reject)=>{
        timer=setTimeout(()=>reject(new Error('Completed import is waiting for a notification dismissal')),10000);
      })]).finally(()=>clearTimeout(timer)):first.result;
      assert.ok(result, h.errors.join('\n'));
      assert.equal(!!result.reused, !!repeat);
      const panel = h.panels[0];
      await panel.receive({ type: 'reading_return' });
      assert.equal(h.api.window.activeTextEditor.document.uri.fsPath, file);
      assert.equal(panel.webview.messages.at(-1).type, 'idle');
      assert.ok(await h.commands.get('mrw.refreshSourceOutline')());
      assert.deepEqual(h.errors, []);
    }
    assert.equal(notifications.length, 2, 'Both new and reused imports leave success notifications open');
  });
});


test('Contents displays the YAML title with filename identity and updates it after unsaved edits',async t=>{
 const root=await temporary(t),h=await harness(root),file=path.join(root,'immutable-id.md');
 const text='---\nid: metadata-id\ntitle: immutable-id The EFG Theorem\n---\n# The EFG Theorem\n';await fs.writeFile(file,text);
 const doc=h.document(file,text);doc.languageId='markdown';h.focus(h.editor(doc));await h.commands.get('mrw.openReadingOutline')();
 assert.match(h.api.readingTree.description,/The EFG Theorem.*immutable-id\.md/);
 h.changeDocument(doc,text.indexOf('The EFG Theorem'),'The EFG Theorem'.length,'Fields and groups');await new Promise(resolve=>setTimeout(resolve,200));
 assert.match(h.api.readingTree.description,/Fields and groups.*immutable-id\.md/);assert.equal(doc.isDirty,true);assert.equal(await fs.readFile(file,'utf8'),text);assert.equal(h.saves.length,0);assert.deepEqual(h.errors,[]);
});

test('reading and Contents have no document Problems entry points or automatic study creation',async t=>{
 const root=await temporary(t),h=await harness(root),a=path.join(root,'a.md'),b=path.join(root,'b.md');
 const text='# Original note\n\n[Related note](b.md)\n';await fs.writeFile(a,text);await fs.writeFile(b,'# Related note\n\nExisting solution text.\n');
 const doc=h.document(a,text);doc.languageId='markdown';h.focus(h.editor(doc));const nav=await h.commands.get('mrw.openReadingOutline')();
 for(const command of ['mrw.documentProblems','mrw.sectionProblems'])assert.equal(h.commands.has(command),false);
 assert.equal(h.panels.length,0);const follow=nav.all.find(n=>n.kind==='document_link');assert.ok(follow);
 await h.commands.get('mrw.selectReadingOutlineItem')(follow);assert.equal(h.panels.length,0);assert.deepEqual(h.errors,[]);
 assert.equal(h.requests.some(r=>/^study/.test(r.method)),false);assert.equal(h.saves.length,0);assert.equal(await fs.readFile(a,'utf8'),text);
});

test('background saved-copy discovery never prompts for a project in an ambiguous workspace', async t => {
  const root=await temporary(t),h=await harness(root);
  h.api.workspace.workspaceFolders.push({uri:uri(path.join(root,'another-project'))});
  let prompts=0;h.api.window.showWorkspaceFolderPick=async()=>{prompts++;throw Error('background project prompt');};
  const opening=h.commands.get('mrw.openDocument')();
  for(let i=0;i<100&&!h.api.lastDocumentPicker.items.some(row=>row.label.includes('Use Saved copy'));i++)await new Promise(r=>setImmediate(r));
  assert.ok(h.api.lastDocumentPicker.items.some(row=>row.action==='browse'));
  assert.ok(h.api.lastDocumentPicker.items.some(row=>row.label.includes('Use Saved copy')));
  assert.equal(prompts,0);assert.equal(h.requests.some(r=>r.method==='outline_list'),false);
  h.api.lastDocumentPicker.hide();await opening;assert.deepEqual(h.errors,[]);
});

test('Contents hides the preceding Markdown tree for a text document and restores it on Return', async t => {
  const root = await temporary(t), h = await harness(root), a = path.join(root, 'a.md');
  await fs.writeFile(a, '# Mathematics\n\n[Text](plain.txt)\n'); await fs.writeFile(path.join(root, 'plain.txt'), 'A text file.');
  const doc = h.document(a, await fs.readFile(a, 'utf8')); doc.languageId = 'markdown'; h.focus(h.editor(doc));
  const nav = await h.commands.get('mrw.openReadingOutline')(); assert.equal(h.api.readingProvider.getChildren().length, 1);
  await h.commands.get('mrw.selectReadingOutlineItem')(nav.all.find(n => n.kind === 'document_link'));
  assert.deepEqual(h.api.readingProvider.getChildren(), []); assert.match(h.api.readingTree.message, /plain.txt.*Markdown only/);
  assert.equal(h.state.get('mrw.readingOutline.v1').uri, doc.uri.toString());
  await h.commands.get('mrw.returnToReadingOutline')(); assert.equal(h.api.readingProvider.getChildren()[0].label, 'Mathematics');
  assert.match(h.api.readingTree.message, /Contents: .*a.md/); assert.deepEqual(h.errors, []);
});
