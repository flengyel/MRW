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
  const commands = new Map(), errors = [], shown = [], reads = [], requests = [], providers = new Map();
  const opens = [], inputs = [], picks = [];
  let activeListener = () => {}, service = runBridge;
  const storedDocuments = new Map();
  const disposable = { dispose() {} };
  const offset = (text, point) => text.split('\n').slice(0, point.line).reduce((n, line) => n + line.length + 1, 0) + point.character;
  function document(file, text, scheme = 'file') {
    const doc = { uri: uri(file, scheme), version: 1, isDirty: false, isClosed: false, text,
      getText(range) { return range ? this.text.slice(offset(this.text, range.start), offset(this.text, range.end)) : this.text; },
      get lineCount() { return this.text.split('\n').length; }, validateRange: range => range };
    storedDocuments.set(doc.uri.toString(), doc);
    return doc;
  }
  function editor(doc) {
    return { document: doc, selection: new Selection(new Position(0, 0), new Position(0, 1)),
      revealRange() {}, async edit(callback) {
        callback({ insert(point, text) {
          const at = offset(doc.text, point);
          doc.text = doc.text.slice(0, at) + text + doc.text.slice(at);
          doc.version++; doc.isDirty = true;
        } }); return true;
      } };
  }
  const api = {
    Position, Range, Selection, Uri: { file: p => uri(p), from: x => uri(x.path, x.scheme), parse: x => uri(x, 'https') },
    ViewColumn: { Beside: 2 }, TextEditorRevealType: { InCenter: 1, InCenterIfOutsideViewport: 2 },
    EventEmitter: class { event() {} fire() {} dispose() {} }, TreeItem: class { constructor(label) { this.label = label; } },
    commands: { registerCommand(name, action) { commands.set(name, action); return disposable; } },
    workspace: {
      isTrusted: true, workspaceFolders: [{ uri: uri(root) }],
      getWorkspaceFolder: () => ({ uri: uri(root) }),
      getConfiguration: () => ({ get: (name, fallback) => name === 'pythonExecutable' ? 'python3' : fallback || 'https://example.org/proofs/' }),
      registerTextDocumentContentProvider(scheme, provider) { providers.set(scheme, provider); return disposable; },
      onDidCloseTextDocument: () => disposable,
      async openTextDocument(location) {
        reads.push(location.toString());
        const existing = storedDocuments.get(location.toString());
        if (existing) return existing;
        return document(location.path, location.scheme === 'file' ? await fs.readFile(location.path, 'utf8') : providers.get(location.scheme).provideTextDocumentContent(location), location.scheme);
      },
    },
    window: {
      activeTextEditor: undefined,
      onDidChangeActiveTextEditor(callback) { activeListener = callback; return disposable; },
      registerTreeDataProvider() { return disposable; },
      async showErrorMessage(message) { errors.push(message); },
      async showInformationMessage() {}, setStatusBarMessage() {},
      async showOpenDialog() { return opens.shift(); },
      async showInputBox() { return inputs.shift(); },
      async showQuickPick(options) { return picks.length ? picks.shift() : options[0]; },
      async showTextDocument(doc) {
        shown.push(doc); const next = editor(doc); api.window.activeTextEditor = next; activeListener(next); return next;
      },
    },
    languages: { async setTextDocumentLanguage() {} }, env: { async openExternal() { return true; } },
  };
  const extension = path.resolve(__dirname, '..');
  const context = { extensionPath: extension, subscriptions: [], workspaceState: {
    get: key => state.get(key), keys: () => [...state.keys()],
    async update(key, value) { if (value === undefined) state.delete(key); else state.set(key, value); },
  } };
  const source = await fs.readFile(path.join(extension, 'src/extension.js'), 'utf8');
  const module = { exports: {} };
  const requires = name => {
    if (name === 'vscode') return api;
    if (name === './navigation') return navigation;
    if (name === './bridge') return { runBridge: async (...args) => { requests.push(args[2]); return service(...args); } };
    return require(name);
  };
  vm.runInThisContext(`(function(require,module){${source}\n})`)(requires, module);
  module.exports.activate(context);
  return { api, commands, errors, shown, reads, requests, opens, inputs, state, document, editor,
    setService: fn => { service = fn; }, focus: ed => { api.window.activeTextEditor = ed; activeListener(ed); } };
}

async function temporary(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mrw-command-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

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
