'use strict';
// Production controller + real disposable files through a native-API facade.
// These checks are not observations of a running Extension Development Host.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL, fileURLToPath } = require('node:url');
const { createDocuments } = require('../src/documents');
const { parseReadingMarkdown } = require('../src/readingMarkdown');
const { trackLocation } = require('../src/readingOutline');

class Position { constructor(line, character) { Object.assign(this, { line, character }); } }
class Range { constructor(start, end) { Object.assign(this, { start, end }); } }
class Selection extends Range { constructor(start, end) { super(start, end); this.active = end; } }
const uri = file => ({ scheme: 'file', fsPath: file, path: file, toString: () => pathToFileURL(file).href });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

async function fixture(t) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), 'mrw-documents-'));
  t.after(() => fs.rm(base, { recursive: true, force: true }));
  const root = path.join(base, 'project'), notes = path.join(base, 'external-notes'), outside = path.join(base, 'outside');
  await Promise.all([root, notes, outside].map(p => fs.mkdir(p)));
  const contents = {
    '1a.md': '\uFEFF---\r\nid: 1a\r\ntitle: 1a A changed title\r\n---\r\n# First α😀\r\n\r\n[Second](2b.md#target)\r\n[[2b]] Second again\r\n[Paper](paper.pdf)\r\n[Missing](missing.md)\r\n[Slow](slow.md)\r\n[Third](3c.md)\r\n',
    '2b.md': '---\nid: 2b\ntitle: 2b Second\n---\n# Target\nProof text.\n',
    '3c.md': '# Third\nAnother proof.\n', 'slow.md': '# Slow\n',
    'paper.pdf': Buffer.from('%PDF-1.4\n% binary fixture \xff\x00\n', 'latin1'),
  };
  for (const [name, value] of Object.entries(contents)) await fs.writeFile(path.join(notes, name), value);
  return { base, root, notes, outside, contents, file: name => path.join(notes, name) };
}

function harness(f, state = new Map(), options = {}) {
  const commands = new Map(), stored = new Map(), openChoices = [], dialogs = [], picks = [], informations = [], errors = [];
  const reads = [], shown = [], hostCalls = [], markdownSelections = [], external = [];
  let documents, openHook, showHook, pickHook, infoResponse, externalResult = true;
  const api = {
    Position, Range, Selection, Uri: { file: uri, parse: value => uri(fileURLToPath(value)) },
    ProgressLocation: { Notification: 15 }, TextEditorRevealType: { InCenterIfOutsideViewport: 2 },
    extensions: { all: options.pdfReader === false ? [] : [{ packageJSON: { contributes: { customEditors: [
      { viewType: 'fixture.pdf', displayName: 'Fixture PDF reader', selector: [{ filenamePattern: '*.pdf' }] },
    ] } } }] },
    env: { remoteName: 'wsl', async openExternal(value) { external.push(value); return externalResult; } },
    commands: { async executeCommand(name, ...args) {
      hostCalls.push({ name, args });
      if (name === 'vscode.openWith' || name === 'vscode.open') api.window.activeTextEditor = undefined;
    } },
    workspace: {
      workspaceFolders: [{ uri: uri(f.root) }],
      get textDocuments() { return [...stored.values()]; },
      async openTextDocument(location) {
        reads.push(location.fsPath); assert.ok(!/\.pdf$/i.test(location.fsPath), 'PDF bytes must not be opened as text');
        if (openHook) await openHook(location);
        if (stored.has(location.toString())) return stored.get(location.toString());
        const text = await fs.readFile(location.fsPath, 'utf8');
        const doc = {
          uri: location, version: 1, isDirty: false, isClosed: false, languageId: 'markdown', text,
          getText() { return this.text; },
          positionAt(at) { const parts = this.text.slice(0, at).split('\n'); return new Position(parts.length - 1, parts.at(-1).length); },
          offsetAt(point) { return this.text.split('\n').slice(0, point.line).reduce((n, line) => n + line.length + 1, 0) + point.character; },
        };
        stored.set(location.toString(), doc); return doc;
      },
    },
    window: {
      activeTextEditor: undefined,
      async showOpenDialog(settings) { dialogs.push(settings); return openChoices.shift(); },
      async showTextDocument(doc, settings) {
        if (showHook) await showHook(doc);
        const editor = { document: doc, selection: new Selection(doc.positionAt(0), doc.positionAt(0)),
          revealRange(range) { this.revealed = range; } };
        this.activeTextEditor = editor; shown.push({ doc, settings, editor }); return editor;
      },
      async withProgress(settings, callback) { return callback({}, { isCancellationRequested: !!options.cancelIndex }); },
      async showQuickPick(choices, settings) { picks.push({ choices, settings }); return pickHook ? pickHook(choices) : choices[0]; },
      async showInformationMessage(message, ...choices) { informations.push({ message, choices }); return infoResponse; },
      async showErrorMessage(message) { errors.push(message); },
    },
  };
  const context = { workspaceState: {
    get: key => state.get(key), async update(key, value) { state.set(key, structuredClone(value)); },
  } };
  documents = createDocuments({ vscode: api, context, register: (name, callback) => commands.set(name, callback), trackLocation,
    onMarkdown: async doc => markdownSelections.push({ uri: doc.uri.toString(), parsed: parseReadingMarkdown(doc.getText()) }) });
  const apiHarness = {
    api, commands, state, documents, openChoices, dialogs, picks, informations, errors, reads, shown, hostCalls, markdownSelections, external,
    setOpenHook(value) { openHook = value; }, setShowHook(value) { showHook = value; }, setPickHook(value) { pickHook = value; },
    setInfoResponse(value) { infoResponse = value; }, setExternalResult(value) { externalResult = value; },
    async open(name) { openChoices.push([uri(f.file(name))]); await commands.get('mrw.openDocument')(); return api.window.activeTextEditor?.document; },
    async folder() { openChoices.push([uri(f.notes)]); await commands.get('mrw.chooseNotesFolder')(); },
    async doc(name) { return api.workspace.openTextDocument(uri(f.file(name))); },
    async focus(doc, start = 0, end = start) {
      const editor = await api.window.showTextDocument(doc, { preview: false });
      editor.selection = new Selection(doc.positionAt(start), doc.positionAt(end)); return editor;
    },
    node(doc, target, occurrence = 0) { return parseReadingMarkdown(doc.getText()).all.filter(n => n.kind === 'document_link' && n.target === target)[occurrence]; },
    async follow(doc, target, occurrence = 0) { return documents.follow(doc, apiHarness.node(doc, target, occurrence)); },
    selected() { const e = api.window.activeTextEditor; return e.document.getText().slice(e.document.offsetAt(e.selection.start), e.document.offsetAt(e.selection.end)); },
    change(doc, at, length, text) {
      doc.text = doc.text.slice(0, at) + text + doc.text.slice(at + length); doc.version++; doc.isDirty = true;
      documents.changed({ document: doc, contentChanges: [{ rangeOffset: at, rangeLength: length, text }] });
    },
  };
  return apiHarness;
}

test('external front-matter note follows an ID, registered PDF, backlink occurrence, return and restart without importing', async t => {
  const f = await fixture(t), state = new Map([['mrw.readingOutline.v1', { origin: { reference: 'retained-reader-origin' }, draft: 'genuine draft' }]]);
  const retained = structuredClone(state.get('mrw.readingOutline.v1')), h = harness(f, state);
  await h.folder(); const a = await h.open('1a.md');
  assert.equal(h.dialogs[0].canSelectFolders, true); assert.equal(h.dialogs[1].canSelectFiles, true);
  assert.deepEqual(h.markdownSelections.at(-1).parsed.all.filter(n => n.kind === 'heading').map(n => n.label), ['First α😀']);
  assert.equal(await h.follow(a, '2b'), true); const b = h.api.window.activeTextEditor.document;
  assert.equal(b.uri.fsPath, f.file('2b.md'));
  assert.equal(await h.documents.returnToDocument(), true); assert.equal(h.selected(), '[[2b]]');
  assert.equal(await h.follow(a, 'paper.pdf'), true);
  assert.equal(h.hostCalls.at(-1).name, 'vscode.openWith'); assert.equal(h.hostCalls.at(-1).args[1], 'fixture.pdf');
  await h.commands.get('mrw.showBacklinks')(); assert.equal(h.selected(), '[Paper](paper.pdf)');
  await h.documents.returnToDocument(); assert.equal(h.hostCalls.at(-1).name, 'vscode.openWith');
  // Opening the paper's backlink creates a file-level PDF return, not a page bookmark.
  await h.follow(a, 'paper.pdf');
  await h.documents.returnToDocument(); assert.equal(h.selected(), '[Paper](paper.pdf)');
  await h.follow(a, '2b.md#target'); assert.equal(h.selected(), '# Target');
  h.setPickHook(choices => choices.find(choice => choice.hit.node.syntax === 'zettel'));
  await h.commands.get('mrw.showBacklinks')();
  assert.equal(h.picks.at(-1).choices.length, 2); assert.equal(h.selected(), '[[2b]]');
  await h.documents.returnToDocument(); assert.equal(h.api.window.activeTextEditor.document, b); assert.equal(h.selected(), '# Target');
  const reopened = harness(f, state); await reopened.commands.get('mrw.reopenDocument')();
  assert.equal(reopened.api.window.activeTextEditor.document.uri.fsPath, f.file('2b.md'));
  await reopened.documents.returnToDocument(); assert.equal(reopened.selected(), '# Target');
  assert.deepEqual(state.get('mrw.readingOutline.v1'), retained);
  for (const [name, contents] of Object.entries(f.contents)) assert.deepEqual(await fs.readFile(f.file(name)), Buffer.from(contents));
});

test('single-file authorization does not index ancestors or grant neighbors; cancelled choices retain prior scope', async t => {
  const f = await fixture(t), h = harness(f); const a = await h.open('1a.md');
  await h.documents.check(a.uri);
  await assert.rejects(() => h.documents.check(uri(f.file('2b.md'))), /outside the selected scope/);
  await assert.rejects(() => h.follow(a, '2b'), /Choose a notes folder/);
  await assert.rejects(() => h.follow(a, '2b.md#target'), /outside the selected scope/);
  const before = structuredClone(h.state.get('mrw.documents.v1'));
  h.openChoices.push(undefined); await h.commands.get('mrw.chooseNotesFolder')();
  assert.deepEqual(h.state.get('mrw.documents.v1'), before);
  await h.folder(); await h.documents.check(uri(f.file('2b.md')));
  await fs.writeFile(path.join(f.outside, 'secret.md'), '# Outside\n');
  await fs.symlink(path.join(f.outside, 'secret.md'), f.file('escape.md'));
  await assert.rejects(() => h.documents.check(uri(f.file('escape.md'))), /outside the selected scope/);
  h.openChoices.push(undefined); await h.commands.get('mrw.openDocument')();
  assert.equal(h.api.window.activeTextEditor.document, a);
});

test('missing PDF reader offers an explicit system handoff and failed or cancelled handoffs preserve the return pin', async t => {
  const f = await fixture(t), h = harness(f, new Map(), { pdfReader: false }); await h.folder();
  const a = await h.open('1a.md'); await h.follow(a, '2b');
  const usable = structuredClone(h.state.get('mrw.documents.v1'));
  assert.equal(await h.follow(a, 'paper.pdf'), undefined);
  assert.match(h.informations.at(-1).message, /No installed PDF custom reader/);
  assert.deepEqual(h.state.get('mrw.documents.v1'), usable); assert.equal(h.external.length, 0);
  h.setInfoResponse('Open with system reader'); h.setExternalResult(false);
  await assert.rejects(() => h.follow(a, 'paper.pdf'), /system reader could not open/);
  assert.deepEqual(h.state.get('mrw.documents.v1'), usable);
  h.setExternalResult(true); assert.equal(await h.follow(a, 'paper.pdf'), true);
  assert.equal(h.external.at(-1).fsPath, f.file('paper.pdf'));
  await h.documents.returnToDocument(); assert.equal(h.selected(), '[Paper](paper.pdf)');
  assert.equal(h.reads.some(file => /\.pdf$/i.test(file)), false);
});

test('return follows edits outside the occurrence, blocks overlap, recovers exact undo and checks restart revisions', async t => {
  const f = await fixture(t), h = harness(f); await h.folder(); const a = await h.open('1a.md'); await h.follow(a, '2b');
  const original = a.getText(); h.change(a, 0, 0, 'Preface α😀\n');
  await h.documents.returnToDocument(); assert.equal(h.selected(), '[[2b]]');
  const at = a.getText().indexOf('[[2b]]'); h.change(a, at + 2, 1, '3');
  await assert.rejects(() => h.documents.returnToDocument(), /exact document location changed/);
  h.change(a, 0, a.getText().length, original);
  await h.documents.returnToDocument(); assert.equal(h.selected(), '[[2b]]');
  // Saving is an explicit host edit. Reopening accepts that exact saved revision.
  h.change(a, 0, 0, 'Saved prefix\n'); await h.documents.returnToDocument();
  await fs.writeFile(a.uri.fsPath, a.getText()); a.isDirty = false;
  const reopened = harness(f, h.state); await reopened.documents.returnToDocument(); assert.equal(reopened.selected(), '[[2b]]');
  await fs.writeFile(a.uri.fsPath, 'External replacement\n' + a.getText());
  const changed = harness(f, h.state);
  await assert.rejects(() => changed.documents.returnToDocument(), /exact document location changed/);
  await fs.rename(f.file('1a.md'), f.file('moved.md'));
  await assert.rejects(() => harness(f, h.state).documents.returnToDocument(), /ENOENT/);
});

test('unsaved note text and target headings drive navigation and backlinks without writing originals', async t => {
  const f = await fixture(t), h = harness(f); await h.folder(); const a = await h.open('1a.md'), c = await h.doc('3c.md');
  h.change(a, 0, a.getText().length, '# Unsaved note\n[Unfinished argument](3c.md#unsaved-heading)\n');
  h.change(c, 0, c.getText().length, '# Unsaved heading\nA draft proof.\n');
  await h.follow(a, '3c.md#unsaved-heading'); assert.equal(h.selected(), '# Unsaved heading');
  await h.commands.get('mrw.showBacklinks')();
  assert.equal(h.picks.at(-1).choices.length, 1); assert.equal(h.selected(), '[Unfinished argument](3c.md#unsaved-heading)');
  assert.equal(a.isDirty, true); assert.equal(c.isDirty, true);
  assert.equal(await fs.readFile(a.uri.fsPath, 'utf8'), f.contents['1a.md']);
  assert.equal(await fs.readFile(c.uri.fsPath, 'utf8'), f.contents['3c.md']);
});

test('failed and superseded asynchronous follows preserve the newest successful destination and its exact origin', async t => {
  const f = await fixture(t), h = harness(f); await h.folder(); const a = await h.open('1a.md'); await h.follow(a, '2b');
  const usable = structuredClone(h.state.get('mrw.documents.v1'));
  await assert.rejects(() => h.follow(a, 'missing.md'), /ENOENT|missing/);
  assert.deepEqual(h.state.get('mrw.documents.v1'), usable);
  h.setShowHook(doc => { if (doc.uri.fsPath === f.file('3c.md')) throw new Error('fixture host refused editor'); });
  await assert.rejects(() => h.follow(a, '3c.md'), /fixture host refused/);
  assert.deepEqual(h.state.get('mrw.documents.v1'), usable); h.setShowHook(undefined);
  const entered = deferred(), release = deferred();
  h.setOpenHook(async location => { if (location.fsPath === f.file('slow.md')) { entered.resolve(); await release.promise; } });
  const old = h.follow(a, 'slow.md'); await entered.promise;
  await h.follow(a, '3c.md'); release.resolve(); await old;
  assert.equal(h.api.window.activeTextEditor.document.uri.fsPath, f.file('3c.md'));
  assert.equal(h.state.get('mrw.documents.v1').last, uri(f.file('3c.md')).toString());
  await h.documents.returnToDocument(); assert.equal(h.selected(), '[Third](3c.md)');
});

test('a backlink changed while its picker is open is rejected even when label and offsets are unchanged', async t => {
  const f = await fixture(t), h = harness(f); await h.folder(); const a = await h.open('1a.md');
  h.change(a, 0, a.getText().length, '# First\n[Same](2b.md)\n'); await h.follow(a, '2b.md');
  h.setPickHook(choices => {
    const at = a.getText().indexOf('2b.md'); h.change(a, at, '2b.md'.length, '3c.md'); return choices[0];
  });
  await assert.rejects(() => h.commands.get('mrw.showBacklinks')(), /backlink changed|Inspect backlinks again/i);
  assert.equal(h.api.window.activeTextEditor.document.uri.fsPath, f.file('2b.md'));
});

test('backlink return point is captured before asynchronous picker focus changes', async t => {
  const f = await fixture(t), h = harness(f); await h.folder(); const a = await h.open('1a.md'); await h.follow(a, '2b.md#target');
  h.setPickHook(async choices => { await h.focus(a, a.getText().indexOf('[Third]')); return choices[0]; });
  await h.commands.get('mrw.showBacklinks')();
  await h.documents.returnToDocument();
  assert.equal(h.api.window.activeTextEditor.document.uri.fsPath, f.file('2b.md')); assert.equal(h.selected(), '# Target');
});

test('cancelled backlinks are reported as incomplete and preserve the last usable location', async t => {
  const f = await fixture(t), h = harness(f, new Map(), { cancelIndex: true }); await h.folder();
  const a = await h.open('1a.md'); await h.follow(a, '2b.md#target');
  const before = structuredClone(h.state.get('mrw.documents.v1'));
  await h.commands.get('mrw.showBacklinks')();
  assert.match(h.informations.at(-1).message, /Incomplete backlinks \(cancelled\)/);
  assert.equal(h.picks.length, 0); assert.deepEqual(h.state.get('mrw.documents.v1'), before);
  await h.documents.returnToDocument(); assert.equal(h.selected(), '[Second](2b.md#target)');
});

test('a pending successful follow tracks origin edits made before its editor opens', async t => {
  const f = await fixture(t), h = harness(f); await h.folder(); const a = await h.open('1a.md');
  const entered = deferred(), release = deferred();
  h.setOpenHook(async location => { if (location.fsPath === f.file('2b.md')) { entered.resolve(); await release.promise; } });
  const pending = h.follow(a, '2b'); await entered.promise;
  h.change(a, 0, 0, 'Unsaved preface\n'); release.resolve(); await pending;
  await h.documents.returnToDocument(); assert.equal(h.selected(), '[[2b]]');
  assert.equal(await fs.readFile(a.uri.fsPath, 'utf8'), f.contents['1a.md']);
});

test('a late host editor result cannot replace a newer successful destination', async t => {
  const f = await fixture(t), h = harness(f); await h.folder(); const a = await h.open('1a.md');
  const entered = deferred(), release = deferred();
  h.setShowHook(async doc => { if (doc.uri.fsPath === f.file('slow.md')) { entered.resolve(); await release.promise; } });
  const old = h.follow(a, 'slow.md'); await entered.promise;
  await h.follow(a, '3c.md'); release.resolve(); await old;
  assert.equal(h.api.window.activeTextEditor.document.uri.fsPath, f.file('3c.md'));
  await h.documents.returnToDocument(); assert.equal(h.selected(), '[Third](3c.md)');
});


test('unrelated editor changes do not publish document navigation state', async t => {
  const f = await fixture(t), h = harness(f); await h.folder(); const a = await h.open('1a.md'); await h.follow(a, '2b');
  const before = h.state.get('mrw.documents.v1'), unrelated = await h.doc('3c.md');
  h.change(unrelated, 0, 0, 'An unrelated draft\n');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.state.get('mrw.documents.v1'), before);
});
