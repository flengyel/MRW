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
  const opens = [], inputs = [], picks = [], endings = [];
  let activeListener = () => {}, closeListener = () => {}, openListener = () => {}, service = runBridge;
  const storedDocuments = new Map();
  const disposable = { dispose() {} };
  const offset = (text, point) => text.split('\n').slice(0, point.line).reduce((n, line) => n + line.length + 1, 0) + point.character;
  function document(file, text, scheme = 'file') {
    const doc = { uri: uri(file, scheme), version: 1, isDirty: false, isClosed: false, text,
      // Exercise a user's *.txt language association for every virtual view.
      languageId: scheme === 'mrw-record' ? 'markdown' : 'plaintext',
      getText(range) { return range ? this.text.slice(offset(this.text, range.start), offset(this.text, range.end)) : this.text; },
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
    Position, Range, Selection, Uri: { file: p => uri(p), from: x => uri(x.path, x.scheme), parse: x => uri(x, 'https') },
    ViewColumn: { One: 1, Two: 2, Beside: -2 }, TextEditorRevealType: { InCenter: 1, InCenterIfOutsideViewport: 2 },
    EventEmitter: class { event() {} fire() {} dispose() {} }, TreeItem: class { constructor(label) { this.label = label; } },
    commands: { registerCommand(name, action) { commands.set(name, action); return disposable; } },
    workspace: {
      isTrusted: true, workspaceFolders: [{ uri: uri(root) }],
      getWorkspaceFolder: () => ({ uri: uri(root) }),
      getConfiguration: () => ({ get: (name, fallback) => name === 'pythonExecutable' ? 'python3' : name === 'proofViewerUrl' ? 'https://example.org/proofs/' : fallback }),
      registerTextDocumentContentProvider(scheme, provider) { providers.set(scheme, provider); return disposable; },
      onDidCloseTextDocument(fn) { closeListener = fn; return disposable; },
      onDidOpenTextDocument(fn) { openListener = fn; return disposable; },
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
    } }, env: { async openExternal() { return true; } },
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
    if (name === './bridge') return { runBridge: async (...args) => { requests.push(args[2]); return service(...args); } };
    return require(name);
  };
  vm.runInThisContext(`(function(require,module){${source}\n})`)(requires, module);
  module.exports.activate(context);
  return { api, commands, errors, shown, reads, requests, opens, inputs, picks, endings, state, document, editor, providers,
    closeDocument(doc) { doc.isClosed = true; storedDocuments.delete(doc.uri.toString()); closeListener(doc); },
    setService: fn => { service = fn; }, focus: ed => { api.window.activeTextEditor = ed; activeListener(ed); } };
}

async function temporary(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mrw-command-'));
  const root = path.join(directory, 'project'); await fs.mkdir(root);
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
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

async function ask(h, root) {
  const doc = h.document(path.join(root, 'note.md'), 'α😀\r\nPRIVATE UNSELECTED');
  doc.isDirty = true;
  const ed = h.editor(doc);
  ed.selection = new Selection(new Position(0, 0), new Position(0, 3));
  h.focus(ed); h.inputs.push('Why α?', 'fake-model');
  await h.commands.get('mrw.ask')();
  return doc;
}

test('unsaved Unicode preview contains only selection; remove and discard send nothing', async t => {
  const root = await temporary(t), h = await harness(root);
  const doc = await ask(h, root);
  assert.equal(h.errors.length, 0);
  assert.equal(h.requests[0].draft.target.end, '1.2');
  assert.equal(h.requests[0].draft.contexts[0].text, 'α😀');
  assert.ok(!h.shown.at(-1).text.includes('PRIVATE UNSELECTED'));
  const frozen = h.shown.at(-1).text;
  doc.text = 'later edits'; doc.version++;
  assert.equal(h.shown.at(-1).text, frozen);
  await h.commands.get('mrw.removeContext')();
  assert.equal(h.requests.at(-1).draft.contexts.length, 0);
  await h.commands.get('mrw.discardRequest')();
  await h.commands.get('mrw.sendRequest')();
  assert.match(h.errors.at(-1), /current exact request preview/);
  assert.ok(h.requests.every(r => r.method === 'prepare_assistance'));
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
  assert.ok(h.requests.every(r => r.method === 'prepare_assistance'));
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
  const original = h.requests[0].draft;
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
  return h.requests.findLast(r => r.method === 'prepare_assistance').draft;
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
