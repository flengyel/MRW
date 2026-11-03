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

class Position { constructor(line, character) { Object.assign(this, { line, character }); } }
class Range {
  constructor(a, b, c, d) {
    this.start = typeof a === 'number' ? new Position(a, b) : a;
    this.end = typeof a === 'number' ? new Position(c, d) : b;
  }
  isEqual(other) { return JSON.stringify([this.start, this.end]) === JSON.stringify([other.start, other.end]); }
}
class Selection extends Range { constructor(a, b) { super(a, b); this.active = b; } }
function uri(file, scheme = 'file') { return { scheme, path: file, fsPath: file, toString() { return `${scheme}:${file}`; } }; }

async function harness(root, state = new Map()) {
  const commands = new Map(), errors = [], shown = [], reads = [], requests = [], providers = new Map(), executed = [];
  const opens = [], inputs = [], picks = [], endings = [], panels = [];
  let activeListener = () => {}, closeListener = () => {}, openListener = () => {}, changeListener = () => {}, service = runBridge;
  const storedDocuments = new Map();
  const disposable = { dispose() {} };
  const offset = (text, point) => text.split('\n').slice(0, point.line).reduce((n, line) => n + line.length + 1, 0) + point.character;
  function document(file, text, scheme = 'file') {
    const doc = { uri: uri(file, scheme), version: 1, isDirty: false, isClosed: false, text,
      // Exercise a user's *.txt language association for every virtual view.
      languageId: scheme === 'mrw-record' ? 'markdown' : 'plaintext',
      getText(range) { return range ? this.text.slice(offset(this.text, range.start), offset(this.text, range.end)) : this.text; },
      positionAt(at) { const lines = this.text.slice(0, at).split('\n'); return new Position(lines.length - 1, lines.at(-1).length); },
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
    Position, Range, Selection, Uri: { file: p => uri(p), from: x => uri(x.path, x.scheme), parse: x => x.startsWith('file:') ? uri(x.slice(5)) : uri(x, 'https') },
    ProgressLocation: { Notification: 15 },
    ViewColumn: { One: 1, Two: 2, Beside: -2 }, TextEditorRevealType: { InCenter: 1, InCenterIfOutsideViewport: 2 },
    EventEmitter: class { event() {} fire() {} dispose() {} }, TreeItem: class { constructor(label) { this.label = label; } },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
    commands: { registerCommand(name, action) { commands.set(name, action); return disposable; },
      async executeCommand(name, ...args) { executed.push(name); return commands.get(name)?.(...args); } },
    workspace: {
      isTrusted: true, workspaceFolders: [{ uri: uri(root) }],
      getWorkspaceFolder: () => ({ uri: uri(root) }),
      getConfiguration: () => ({ get: (name, fallback) => name === 'pythonExecutable' ? 'python3' : name === 'proofViewerUrl' ? 'https://example.org/proofs/' : fallback }),
      registerTextDocumentContentProvider(scheme, provider) { providers.set(scheme, provider); return disposable; },
      onDidCloseTextDocument(fn) { const previous = closeListener; closeListener = doc => { previous(doc); fn(doc); }; return disposable; },
      onDidOpenTextDocument(fn) { openListener = fn; return disposable; },
      onDidChangeTextDocument(fn) { changeListener = fn; return disposable; },
      async openTextDocument(location) {
        reads.push(location.toString());
        const existing = storedDocuments.get(location.toString());
        if (existing) return existing;
        return document(location.path, location.scheme === 'file' ? await fs.readFile(location.path, 'utf8') : providers.get(location.scheme).provideTextDocumentContent(location), location.scheme);
      },
    },
    window: {
      activeTextEditor: undefined,
      createWebviewPanel(type, title, column) {
        let receive;
        const panel = { title, viewColumn: column === -2 ? (api.window.activeTextEditor?.viewColumn || 1) + 1 : column, dispose() {}, reveal() {},
          onDidDispose() { return disposable; }, onDidChangeViewState() { return disposable; },
          webview: { html: '', messages: [], cspSource: 'vscode-webview:', asWebviewUri: uri => uri.toString(),
            onDidReceiveMessage(callback) { receive = callback; return disposable; },
            async postMessage(value) { this.messages.push(value); if (value.type === 'storageCheck') await receive({ type: 'storageStatus', dirty: !!this.dirty }); return true; } },
          receive: value => receive(value) };
        panels.push(panel); return panel;
      },
      onDidChangeActiveTextEditor(callback) { activeListener = callback; return disposable; },
      registerTreeDataProvider() { return disposable; },
      createTreeView(_id, options) { api.readingProvider = options.treeDataProvider; return {
        dispose() {}, onDidCollapseElement(fn) { api.collapseReading = fn; return disposable; },
        onDidExpandElement(fn) { api.expandReading = fn; return disposable; }, async reveal() {} }; },
      registerUriHandler(handler) { api.uriHandler = handler; return disposable; },
      async showErrorMessage(message) { errors.push(message); },
      async showInformationMessage() {}, setStatusBarMessage() {},
      async withProgress(_settings, action) { return action({}, { onCancellationRequested() { return disposable; } }); },
      async showOpenDialog() { return opens.shift(); },
      async showInputBox() { return inputs.shift(); },
      async showQuickPick(options) { return picks.length ? picks.shift() : options[0]; },
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
  const context = { extensionPath: extension, storageUri: uri(path.join(root, '..', 'private-state')), subscriptions: [], workspaceState: {
    get: key => state.get(key), keys: () => [...state.keys()],
    async update(key, value) { if (value === undefined) state.delete(key); else state.set(key, value); },
  } };
  const source = await fs.readFile(path.join(extension, 'src/extension.js'), 'utf8');
  const module = { exports: {} };
  const requires = name => {
    if (name === 'vscode') return api;
    if (name === './navigation') return navigation;
    if (name === './assistance') return require('../src/assistance');
    if (name === './outlines') return require('../src/outlines');
    if (name === './readingOutline') return require('../src/readingOutline');
    if (name === './artifactStorage') return require('../src/artifactStorage');
    if (name === './bridge') return { runBridge: async (...args) => { requests.push(args[2]); return service(...args); } };
    return require(name);
  };
  vm.runInThisContext(`(function(require,module){${source}\n})`)(requires, module);
  module.exports.activate(context);
  return { api, commands, errors, shown, reads, requests, opens, inputs, picks, endings, panels, state, document, editor, providers, executed,
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
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
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
  doc.languageId = 'markdown'; h.api.workspace.getWorkspaceFolder = () => undefined;
  await h.commands.get('mrw.insertOutlineReference')(); assert.match(h.errors.pop(), /current workspace/);
});


test('companion commands work without an editor, preserve pins, and keep associations across reopen', async t => {
  const root = await temporary(t), source = path.join(root, 'book α.txt'), raw = 'α😀 → β\nClaim.\nProof.';
  await fs.writeFile(source, raw);
  const h = await harness(root); h.focus(h.editor(h.document(source, raw)));
  const created = await h.commands.get('mrw.createOutline')();
  h.focus(undefined);
  const markdown = await h.commands.get('mrw.copyOutlineLink')();
  assert.match(markdown, /vscode:\/\/flengyel.theorem-terminal\/outline/);
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
  assert.match(wrong.errors.pop(), /No saved source outlines/);
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
  const destination=path.join(root,'..','moved α');h.inputs.push(destination);h.endings.push('Move artifacts');
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
  const moved=path.join(root,'..','portable artifacts');h.inputs.push(moved);h.endings.push('Move artifacts');
  await h.commands.get('mrw.moveArtifactDirectory')();assert.deepEqual(h.errors,[]);
  const local=await temporary(t,true),copy=path.join(local,'..','synchronized artifacts');await fs.cp(moved,copy,{recursive:true});
  const receiver=await harness(local);receiver.inputs.push(copy);receiver.endings.push('Open existing store');
  await receiver.commands.get('mrw.openArtifactDirectory')();assert.deepEqual(receiver.errors,[]);
  receiver.api.env.clipboard.value=markdown;await receiver.commands.get('mrw.openLinkFromClipboard')();
  assert.deepEqual(receiver.errors,[]);assert.ok(receiver.requests.some(r=>r.method==='artifact_match_reference'));
  assert.equal(receiver.panels[0].webview.messages.at(-1).model.outline.id,created.outline.id);
  const returnLink=await receiver.commands.get('mrw.copyOutlineLink')();
  h.api.env.clipboard.value=returnLink;await h.commands.get('mrw.openLinkFromClipboard')();
  assert.deepEqual(h.errors,[]);assert.equal(h.panels[0].webview.messages.at(-1).model.outline.id,created.outline.id);
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
  assert.equal(h.requests.filter(r => r.method === 'outline_stacks_prepare').length, 1);
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
  assert.equal(h.requests.length, 0);
  h.inputs.push('08ZD');
  await h.commands.get('mrw.importStacksSection')();
  assert.equal(h.panels.length, 0);
  assert.ok(!h.requests.some(r => r.method === 'outline_stacks_import'));
  h.inputs.push('https://example.org/tag/08ZD');
  await h.commands.get('mrw.importStacksSection')();
  assert.match(h.errors.at(-1), /official/);
  assert.equal(h.panels.length, 0);
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
  assert.match(h.errors.pop(), /overview changed/);
  target = model.all.find(n => n.reference === references[1].reference);
  h.changeDocument(doc, target.start + 2, 1, 'X');
  await h.commands.get('mrw.returnToReadingOutline')(); assert.match(h.errors.pop(), /exact reading-outline location changed/);
  // Undo both edits to restore the exact original pin.
  h.changeDocument(doc, 0, doc.getText().length, original);
  await h.commands.get('mrw.returnToReadingOutline')();
  assert.equal(doc.getText(h.api.window.activeTextEditor.selection), references[1].markdown);
  model = await h.commands.get('mrw.refreshReadingOutline')();
  await h.commands.get('mrw.selectReadingOutlineItem')(model.all.at(-1));
  assert.equal(h.panels.at(-1).webview.messages.at(-1).reference.status, 'whole outline');
  await h.commands.get('mrw.returnToReadingOutline')();
  const restored = await harness(root, h.state);
  const restoredDoc = restored.document(file, original); restoredDoc.languageId = 'markdown'; restored.focus(restored.editor(restoredDoc));
  model = await restored.commands.get('mrw.openReadingOutline')();
  assert.equal(model.all.length, 7);
  assert.equal(restoredDoc.getText(restored.api.window.activeTextEditor.selection), references[2].markdown);
  const beforeWrong = restored.requests.length;
  restored.api.workspace.getWorkspaceFolder = () => undefined;
  await restored.commands.get('mrw.returnToReadingOutline')(); assert.match(restored.errors.pop(), /workspace/);
  assert.equal(restored.requests.length, beforeWrong);
  assert.equal(await fs.readFile(file, 'utf8'), original);
  assert.deepEqual(h.errors, []); assert.deepEqual(restored.errors, []);
});

test('navigator opens exact published mathematics in an expanded reader, retaining changed-range fallback and Return', async t => {
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
  const doc = h.document(file, text); doc.languageId = 'markdown'; h.focus(h.editor(doc));
  let model = await h.commands.get('mrw.openReadingOutline')(); const node = model.all[1];
  assert.equal(h.api.readingProvider.getTreeItem(node).label, 'Hausdorff spaces');
  const rawViews = () => h.shown.filter(d => d.uri.scheme === 'mrw-record').length;
  const before = rawViews();
  assert.equal((await h.commands.get('mrw.selectReadingOutlineItem')(node)).status, 'unchanged');
  assert.equal(rawViews(), before, 'an exact rendered region does not open a TeX editor automatically');
  assert.equal(h.panels[0].webview.messages.findLast(v => v.type === 'outline').readingFocus.region, region.id);
  assert.ok(h.executed.includes('workbench.action.maximizeEditorHideSidebar'));
  await h.commands.get('mrw.returnToReadingOutline')();
  assert.equal(doc.getText(h.api.window.activeTextEditor.selection), ref.markdown);
  assert.ok(h.executed.includes('workbench.action.minimizeOtherEditors'));
  await h.panels[0].receive({ type: 'edit', change: { kind: 'replace_region', region: region.id, start: [0, 0], end: [0, 3] } });
  model = await h.commands.get('mrw.refreshReadingOutline')();
  assert.equal((await h.commands.get('mrw.selectReadingOutlineItem')(model.all[1])).status, 'changed or removed');
  assert.equal(h.api.window.activeTextEditor.document.uri.scheme, 'mrw-record');
  assert.equal(h.api.window.activeTextEditor.document.getText(h.api.window.activeTextEditor.selection), region.argument_text);
  assert.equal(h.panels[0].webview.messages.findLast(v => v.type === 'outline').selected, null);
  assert.equal(await fs.readFile(file, 'utf8'), text); assert.deepEqual(h.errors, []);
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
  assert.ok(container);assert.equal(container.title,'MRW');
  const svg=await fs.readFile(path.resolve(__dirname,'..',container.icon),'utf8');
  assert.match(svg,/<svg[^>]*viewBox="0 0 24 24"/);
  assert.doesNotMatch(svg,/<script|<image|href=/i);
  assert.deepEqual(c.views.mrw.map(v=>v.id),['mrw.readingOutline','mrw.research']);
  assert.ok(!c.views.explorer?.some(v=>v.id.startsWith('mrw.')),'MRW views have one default container');
  const overflow=c.menus['view/title'].filter(v=>v.when==='view == mrw.readingOutline'&&!v.group?.startsWith('navigation'));
  for(const command of ['mrw.refreshReadingOutline','mrw.insertOutlineReference','mrw.openOutline','mrw.importStacksSection','mrw.artifactLocation']){
    assert.ok(overflow.some(v=>v.command===command));assert.ok(h.commands.has(command));
  }
  assert.equal(h.requests.length,0,'registering the icon, views and menus launches no service');
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
  assert.equal(h.requests.length,count);assert.equal(h.state.get('mrw.diagramAppearance.v1'),'dark');
  await panel.receive({type:'ready'});
  assert.equal(panel.webview.messages.findLast(m=>m.type==='outline').diagramAppearance,'dark');
  const reopened=await harness(root);await reopened.commands.get('mrw.openOutline')();
  assert.ok(reopened.panels[0].webview.messages.findLast(m=>m.type==='outline').model.outline.annotations[0].fragments.find(b=>b.kind==='tikz').image);
  assert.equal(reopened.requests.some(r=>r.method==='outline_render_diagram'),false);
  assert.equal(await fs.readFile(file,'utf8'),'Source.');assert.deepEqual(h.errors,[]);
});
