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
const { makeNoteLink, parseNoteLink } = require('../src/noteLinks');
const { registerWikiLinks } = require('../src/wikiLinks');
const MarkdownIt = require('../media/markdown-it/markdown-it');
const { parseReadingMarkdown } = require('../src/readingMarkdown');
const { trackLocation } = require('../src/readingOutline');
const { CancellationTokenSource,quickPicker,WAIT }=require('./support/quickPicker');

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
  const reads = [], shown = [], hostCalls = [], markdownSelections = [], external = [], displayed = [];
  let selectionChanged;
  let documents, openHook, showHook, pickHook, infoResponse, externalResult = true,latestPicker;
  const configuration = { notesFolder: options.notesFolder || '' }, configurationWrites = [];
  let linkProvider;
  const api = {
    ViewColumn:{Beside:-2}, CancellationTokenSource, Position, Range, Selection, Uri: { from: fields => ({...fields,fsPath:fields.path,toString:()=>fields.scheme+'://'+(fields.authority||'')+fields.path.split('/').map(encodeURIComponent).join('/')}), file: uri, parse: value => value.startsWith('file:') ? uri(fileURLToPath(value)) : { scheme: value.split(':')[0], path: new URL(value).pathname, toString: () => value } },
    ConfigurationTarget: { Workspace: 2 }, DocumentLink: class { constructor(range, target) { Object.assign(this, { range, target }); } },
    languages: { registerDocumentLinkProvider(_selector, provider) { linkProvider = provider; return { dispose() {} }; } },
    ProgressLocation: { Notification: 15 }, TextEditorRevealType: { InCenterIfOutsideViewport: 2 },
    extensions: { getExtension: () => options.preview ? { packageJSON: { contributes: { customEditors: [{ viewType: 'vscode.markdown.preview.editor' }] } } } : undefined, all: options.pdfReader === false ? [] : [{ packageJSON: { contributes: { customEditors: [
      { viewType: 'fixture.pdf', displayName: 'Fixture PDF reader', selector: [{ filenamePattern: '*.pdf' }] },
    ] } } }] },
    env: { remoteName: options.remoteName || undefined, clipboard: { async writeText(value) { apiHarness.clipboard = value; } }, async openExternal(value) { external.push(value); return externalResult; } },
    commands: { async executeCommand(name, ...args) {
      hostCalls.push({ name, args });
      if (name === 'vscode.openWith' || name === 'vscode.open') {
        api.window.activeTextEditor = undefined;
        if (options.preview) api.window.tabGroups = { activeTabGroup: { activeTab: { input: { uri: args[0] } } } };
      }
    } },
    workspace: {
      isTrusted: true,
      getConfiguration: () => ({ get: (name, fallback) => configuration[name] ?? fallback, async update(name, value, target) { configurationWrites.push({ name, value, target }); await options.updateConfiguration?.(name, value, target); configuration[name] = value; } }),
      workspaceFolders: [{ uri: uri(f.root) }],
      get textDocuments() { return [...stored.values()]; },
      async openTextDocument(location) {
        reads.push(location.fsPath); assert.ok(!/\.pdf$/i.test(location.fsPath), 'PDF bytes must not be opened as text');
        if (openHook) await openHook(location);
        if (stored.has(location.toString())) return stored.get(location.toString());
        const text = location.scheme === 'untitled' ? '' : await fs.readFile(location.fsPath, 'utf8');
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
      onDidChangeTextEditorSelection(callback) { selectionChanged = callback; return { dispose() {} }; },
      activeTextEditor: undefined,
      async showInputBox(){return options.titleInput ? options.titleInput() : 'A working calculation';},
      createQuickPick(){const picker=quickPicker((items,settings)=>pickHook&&picker.placeholder==='Choose an original file or a saved copy.'?WAIT:this.showQuickPick(items,settings));latestPicker=picker;return picker;},
      async showOpenDialog(settings) { dialogs.push(settings); return openChoices.shift(); },
      async showTextDocument(doc, settings) {
        if (showHook) await showHook(doc);
        const editor = { document: doc, selection: new Selection(doc.positionAt(0), doc.positionAt(0)),
          revealRange(range) { this.revealed = range; }, async edit(action){action({insert:(_p,text)=>{doc.text=text;doc.isDirty=true;doc.version++;}});return true;} };
        this.activeTextEditor = editor; shown.push({ doc, settings, editor }); return editor;
      },
      async withProgress(settings, callback) { return callback({}, { isCancellationRequested: !!options.cancelIndex }); },
      async showQuickPick(choices, settings) { choices = await choices; picks.push({ choices, settings }); return pickHook ? pickHook(choices, settings) : settings.title === 'Choose Notes Folder' ? choices.find(c => c.action === 'browse') : choices[0]; },
      async showInformationMessage(message, ...choices) { informations.push({ message, choices }); return infoResponse; },
      async showErrorMessage(message) { errors.push(message); },
      async showWarningMessage(message, ...choices) { informations.push({ message, choices }); return infoResponse; },
    },
  };
  const context = { mrwIdentityRoot:options.identityRoot, subscriptions: [], workspaceState: {
    get: key => state.get(key), async update(key, value) { await options.updateState?.(key, value); state.set(key, structuredClone(value)); },
  } };
  documents = createDocuments({ vscode: api, context, obsidianNote: options.obsidianNote, register: (name, callback) => commands.set(name,async(...args)=>{const result=await callback(...args);if(latestPicker?.error)throw latestPicker.error;return result;}), trackLocation, resolveReferences: options.resolveReferences,
    onDisplayed: uri => displayed.push(uri.fsPath),
    onMarkdown: async doc => markdownSelections.push({ uri: doc.uri.toString(), parsed: parseReadingMarkdown(doc.getText()) }) });
  const apiHarness = {
    api, context, commands, state, documents, configuration, configurationWrites, get linkProvider() { return linkProvider; }, openChoices, dialogs, picks, informations, errors, reads, shown, hostCalls, markdownSelections, external, displayed,
    selection(at, end = at) { const editor = api.window.activeTextEditor; editor.selection = new Selection(editor.document.positionAt(at), editor.document.positionAt(end)); selectionChanged({ textEditor: editor, selections: [editor.selection] }); },
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

test('new Zettel from a PDF keeps the reader, names an unsaved vault draft and restores the PDF after restart', async t => {
  const f=await fixture(t),state=new Map(),h=harness(f,state,{preview:true,notesFolder:f.notes});
  await h.open('paper.pdf');
  const before=await fs.readFile(f.file('paper.pdf'));
  const draft=await h.commands.get('mrw.newZettel')();
  assert.equal(draft.uri.scheme,'untitled');assert.equal(path.dirname(draft.uri.fsPath),f.notes);
  assert.match(draft.getText(),/\[paper.pdf\]\(<paper.pdf>\)/);assert.equal(h.shown.at(-1).settings.viewColumn,-2);
  await assert.rejects(fs.stat(draft.uri.fsPath),/ENOENT/);
  const restarted=harness(f,state,{preview:true,notesFolder:f.notes});assert.equal(await restarted.documents.returnToDocument(),true);
  assert.equal(restarted.hostCalls.at(-1).args[0].fsPath,f.file('paper.pdf'));
  assert.deepEqual(await fs.readFile(f.file('paper.pdf')),before);
});

test('recent notes use dirty text and preserve the originating PDF without opening it as text',async t=>{
  const f=await fixture(t),state=new Map(),h=harness(f,state,{preview:true,notesFolder:f.notes});
  await h.open('2b.md');const note=await h.doc('2b.md');h.change(note,note.text.length,0,'unsaved calculation');
  await h.open('paper.pdf');await h.commands.get('mrw.recentNotes')();
  assert.equal(h.shown.at(-1).doc,note);assert.equal(note.isDirty,true);
  assert.match(h.picks.at(-1).choices[0].label,/Second.*2b.md/);
  assert.equal(await h.documents.returnToDocument(),true);assert.equal(h.hostCalls.at(-1).args[0].fsPath,f.file('paper.pdf'));
  const restarted=harness(f,state,{preview:true,notesFolder:f.notes});await restarted.commands.get('mrw.recentNotes')();
  assert.equal(restarted.shown.at(-1).doc.uri.fsPath,f.file('2b.md'));
  assert.equal(await fs.readFile(f.file('2b.md'),'utf8'),f.contents['2b.md']);
});

test('Zettel cancellation and changed origin preserve earlier return state and do not create files',async t=>{
  const f=await fixture(t);let input,answer;
  const h=harness(f,new Map(),{notesFolder:f.notes,titleInput:()=>input?input():answer});
  const source=await h.open('1a.md');await h.follow(source,'2b');const prior=structuredClone(h.state.get('mrw.documents.v1').origin);
  await h.focus(source);await h.commands.get('mrw.newZettel')();
  assert.deepEqual(h.state.get('mrw.documents.v1').origin,prior);
  h.selection(0,5);input=()=>{h.change(source,1,1,'X');return 'Title';};
  await assert.rejects(h.commands.get('mrw.newZettel')(),/originating document location changed/);
  assert.equal(h.shown.some(x=>x.doc.uri.scheme==='untitled'),false);
  assert.deepEqual((await fs.readdir(f.notes)).sort(),Object.keys(f.contents).sort());
});

test('explicit companion attachment uses the PDF reader and preserves the dirty originating location', async t => {
  const f=await fixture(t),state=new Map(),h=harness(f,state);await h.folder();const doc=await h.open('1a.md');
  h.change(doc,doc.text.length,0,'unsaved working text');
  const at=doc.text.indexOf('Second again'),from={uri:doc.uri.toString(),revision:require('../src/navigation').digest(doc.text),start:at,end:at+6};
  const paper=path.join(f.outside,'retained.pdf');await fs.copyFile(f.file('paper.pdf'),paper);
  assert.equal(await h.documents.openLinkedDocument(uri(paper),from),true);
  assert.equal(h.hostCalls.at(-1).name,'vscode.openWith');assert.equal(h.hostCalls.at(-1).args[0].fsPath,paper);
  const restarted=harness(f,state);await restarted.commands.get('mrw.reopenDocument')();assert.equal(restarted.hostCalls.at(-1).args[0].fsPath,paper);
  assert.equal(await h.documents.returnToDocument(),true);assert.equal(h.selected(),'Second');assert.equal(doc.isDirty,true);
  assert.equal(await fs.readFile(f.file('1a.md'),'utf8'),f.contents['1a.md']);
});

test('cancelled companion PDF opening leaves the previous Return location intact', async t => {
  const f=await fixture(t),h=harness(f,new Map(),{pdfReader:false});await h.folder();const doc=await h.open('1a.md');await h.follow(doc,'2b');
  const at=doc.text.indexOf('Second again'),from={uri:doc.uri.toString(),revision:require('../src/navigation').digest(doc.text),start:at,end:at+6};
  assert.equal(await h.documents.openLinkedDocument(uri(f.file('paper.pdf')),from),false);
  await h.documents.returnToDocument();assert.equal(h.selected(),'[[2b]]');
});

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
  const before = structuredClone(h.state.get('mrw.documents.v1')), priorPicks = h.picks.length;
  await h.commands.get('mrw.showBacklinks')();
  assert.match(h.informations.at(-1).message, /Incomplete backlinks \(cancelled\)/);
  assert.equal(h.picks.length, priorPicks); assert.deepEqual(h.state.get('mrw.documents.v1'), before);
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

test('qualified canonical links and legacy retained backlinks keep prefixes without rewriting notes or replacing return pins', async t => {
  const f = await fixture(t), requests = [];
  const legacy = 'mrw-outline:v1/' + 'a'.repeat(64) + '/11111111-1111-1111-1111-111111111111/' + 'b'.repeat(64);
  const legacyText = `[Retained proof](${legacy})\n[[kerodon:0004]]\n[Other corpus](https://stacks.math.columbia.edu/tag/0004)\n`;
  await fs.writeFile(f.file('3c.md'), legacyText);
  const h = harness(f, new Map(), { resolveReferences: async references => {
    requests.push(references);
    return { entries: references.map(reference => ({ reference, qualified_id: 'kerodon:0004', source_revision: 'b'.repeat(64) })) };
  } });
  await h.folder(); const a = await h.open('1a.md'); await h.follow(a, '2b');
  const prior = structuredClone(h.state.get('mrw.documents.v1').origin);
  await h.commands.get('mrw.showBacklinks')('kerodon:0004');
  assert.deepEqual(requests, [[legacy]]);
  assert.equal(h.picks.at(-1).choices.length, 2);
  assert.ok(h.picks.at(-1).choices.every(c => c.hit.qualified_id === 'kerodon:0004'));
  assert.equal(h.selected(), `[Retained proof](${legacy})`);
  assert.deepEqual(h.state.get('mrw.documents.v1').origin, prior);
  const c = h.api.window.activeTextEditor.document;
  assert.equal(await h.follow(c, 'kerodon:0004'), true);
  assert.equal(h.external.at(-1).toString(), 'https://kerodon.net/tag/0004');
  await h.documents.returnToDocument(); assert.equal(h.selected(), '[[kerodon:0004]]');
  const usable = structuredClone(h.state.get('mrw.documents.v1'));
  h.setExternalResult(false);
  await assert.rejects(() => h.follow(c, 'kerodon:0004'), /could not be opened/);
  assert.deepEqual(h.state.get('mrw.documents.v1'), usable);
  await h.commands.get('mrw.showBacklinks')('stacks-project:0004');
  assert.equal(h.picks.at(-1).choices.length, 1);
  assert.equal(h.picks.at(-1).choices[0].hit.qualified_id, 'stacks-project:0004');
  assert.equal(await fs.readFile(f.file('3c.md'), 'utf8'), legacyText);
});


test('document picker starts in the selected notes folder across restart, while cancellation and moved folders preserve state', async t => {
  const f=await fixture(t),state=new Map(),h=harness(f,state);
  h.openChoices.push(undefined);await h.commands.get('mrw.openDocument')();
  assert.equal(h.dialogs.at(-1).defaultUri.fsPath,f.root);
  await h.folder();const selected=structuredClone(state.get('mrw.documents.v1'));
  h.openChoices.push(undefined);await h.commands.get('mrw.openDocument')();
  assert.equal(h.dialogs.at(-1).defaultUri.fsPath,f.notes);
  assert.deepEqual(state.get('mrw.documents.v1'),selected);assert.equal(h.shown.length,0);
  const restarted=harness(f,state);
  restarted.openChoices.push(undefined);await restarted.commands.get('mrw.openDocument')();
  assert.equal(restarted.dialogs.at(-1).defaultUri.fsPath,f.notes);
  assert.deepEqual(state.get('mrw.documents.v1'),selected);assert.equal(restarted.shown.length,0);
  await fs.rename(f.notes,path.join(f.base,'moved-notes'));
  restarted.openChoices.push(undefined);await restarted.commands.get('mrw.openDocument')();
  assert.equal(restarted.dialogs.at(-1).defaultUri.fsPath,f.notes, 'Browse remains immediate even when the remembered folder has moved');
  assert.deepEqual(state.get('mrw.documents.v1'),selected);
});


test('an Obsidian alias follows its ID and Return restores the full original syntax after restart', async t => {
  const f=await fixture(t),file=f.file('1a.md');
  const text=(await fs.readFile(file,'utf8')).replace('[[2b]] Second again','[[2b|A readable name]]');
  await fs.writeFile(file,text);
  const state=new Map(),h=harness(f,state);await h.folder();const source=await h.open('1a.md');
  await h.follow(source,'2b|A readable name');
  assert.equal(h.api.window.activeTextEditor.document.uri.fsPath,f.file('2b.md'));
  const restarted=harness(f,state);await restarted.commands.get('mrw.reopenDocument')();
  assert.equal(restarted.api.window.activeTextEditor.document.uri.fsPath,f.file('2b.md'));
  await restarted.documents.returnToDocument();assert.equal(restarted.selected(),'[[2b|A readable name]]');
  assert.equal(await fs.readFile(file,'utf8'),text);
});


test('Notes Folder setting is configurable, picker updates it, and navigation validates scope lazily', async t => {
  const f = await fixture(t), h = harness(f, new Map(), { notesFolder: f.notes });
  assert.equal(h.state.size, 0, 'activation does not resolve or index the configured folder');
  const a = await h.doc('1a.md');
  assert.equal(await h.follow(a, '2b'), true, 'configured folder works without a picker or import');
  assert.equal(h.state.get('mrw.documents.v1').folder.canonical, f.notes);
  h.configuration.notesFolder = f.outside;
  await assert.rejects(h.follow(a, '2b'), /outside the selected scope/);
  await h.folder();
  assert.deepEqual(h.configurationWrites.at(-1), { name: 'notesFolder', value: f.notes, target: 2 });
  const before = structuredClone(h.state.get('mrw.documents.v1'));
  await h.commands.get('mrw.chooseNotesFolder')();
  assert.deepEqual(h.state.get('mrw.documents.v1'), before, 'cancel preserves the selected folder');
  h.configuration.notesFolder = 'C:\\Users\\somebody\\Notes';
  await assert.rejects(h.documents.check(uri(f.file('3c.md'))), /absolute path on this extension host/);
});

test('WikiLinks are clickable without an active source editor and preserve exact alias return locations', async t => {
  const f = await fixture(t), h = harness(f, new Map(), { notesFolder: f.notes, preview: true });
  const text = '---\nid: 1a\ntitle: "[[2b]]"\n---\n# Notes α😀\n`[[2b]]`\n<!-- [[hidden]] -->\n![[2b]]\n[[2b|Second & <note>]] then [[2b|Second & <note>]]\n';
  await fs.writeFile(f.file('1a.md'), text);
  const a = await h.doc('1a.md');
  a.isDirty = true;
  const wiki = registerWikiLinks({ vscode: h.api, context: h.context, register: (key, callback) => h.commands.set(key, callback), documents: h.documents });
  assert.equal(h.reads.length, 1);
  const links = h.linkProvider.provideDocumentLinks(a);
  assert.equal(links.length, 2, 'code, metadata, comments and embeds are not links');
  assert.equal(h.reads.length, 1, 'link discovery does not read the vault');
  const value = JSON.parse(decodeURIComponent(new URL(links[1].target.toString()).search.slice(1)))[0];
  assert.equal(text.slice(value.start, value.end), '[[2b|Second & <note>]]');
  assert.equal(value.start, text.lastIndexOf('[[2b|Second & <note>]]'));
  h.api.window.activeTextEditor = undefined;
  await h.commands.get('mrw.followWikiLink')(value);
  const preview = h.hostCalls.findLast(call => call.name === 'vscode.openWith');
  assert.equal(preview.args[0].fsPath, f.file('2b.md'));
  assert.equal(preview.args[1], 'vscode.markdown.preview.editor');
  assert.equal(h.api.window.activeTextEditor, undefined);
  await h.documents.returnToDocument();
  const returned = h.shown.at(-1);
  assert.equal(returned.doc, a);
  assert.equal(a.offsetAt(returned.editor.selection.start), value.start);
  assert.equal(a.offsetAt(returned.editor.selection.end), value.end);
  assert.equal(a.isDirty, true, 'opening preview never saves the source');
  assert.equal(await fs.readFile(f.file('1a.md'), 'utf8'), text);
  const md = wiki.extendMarkdownIt(new MarkdownIt('commonmark'));
  assert.equal(wiki.extendMarkdownIt(md), md, 'plugin installation is idempotent');
  const html = md.render(a.getText(), { currentDocument: a.uri });
  const hrefs = [...html.matchAll(/href="(vscode:[^"]+\/document-link[^\"]*)"/g)].map(match => match[1]);
  assert.equal(hrefs.length, 2);
  assert.match(html, />Second &amp; &lt;note&gt;<\/a>/);
  assert.notEqual(hrefs[0], hrefs[1], 'repeated links keep their distinct occurrences');
  assert.equal(await wiki.handleUri(h.api.Uri.parse(hrefs[0])), true);
  h.change(a, value.start + 2, 2, '3c');
  await h.documents.check(a.uri); // Allow the tracked-location checkpoint to finish.
  const previous = structuredClone(h.state.get('mrw.documents.v1').origin);
  await assert.rejects(h.commands.get('mrw.followWikiLink')(value), /WikiLink changed/);
  assert.deepEqual(h.state.get('mrw.documents.v1').origin, previous, 'stale click preserves preceding origin');
  await assert.rejects(wiki.handleUri(h.api.Uri.parse(hrefs[0] + '&extra=x')), /Invalid MRW/);
  h.api.workspace.isTrusted = false;
  assert.deepEqual(h.linkProvider.provideDocumentLinks(a), []);
  await assert.rejects(h.commands.get('mrw.followWikiLink')(value), /trust the intended workspace/);
});

test('backlinks from a Markdown preview return to that document instead of an unrelated editor', async t => {
  const f = await fixture(t), h = harness(f, new Map(), { notesFolder: f.notes, preview: true });
  const a = await h.doc('1a.md'); await h.follow(a, '2b');
  const unrelated = await h.doc('3c.md');
  h.api.window.activeTextEditor = { document: unrelated, selection: new Selection(unrelated.positionAt(0), unrelated.positionAt(0)) };
  await h.commands.get('mrw.showBacklinks')();
  assert.equal(h.state.get('mrw.documents.v1').origin.uri, uri(f.file('2b.md')).toString());
  await h.documents.returnToDocument();
  assert.equal(h.hostCalls.findLast(call => call.name === 'vscode.openWith').args[0].fsPath, f.file('2b.md'));
});


test('Open Note in Obsidian targets the same saved file and preserves an unsent editor draft',async t=>{
 const f=await fixture(t),h=harness(f,new Map(),{notesFolder:f.notes});await fs.mkdir(path.join(f.notes,'.obsidian'));
 h.configuration.obsidianVault='Notes & research';
 const doc=await h.doc('1a.md');await h.focus(doc);h.change(doc,0,0,'Unsent work.\n');
 const draft=doc.getText(),before=await fs.readFile(f.file('1a.md'),'utf8');
 assert.equal(await h.commands.get('mrw.openDocumentInObsidian')(),true);
 const target=h.external.at(-1);assert.equal(target.scheme,'obsidian');assert.equal(target.authority,'vault');assert.equal(target.path,'/Notes & research/1a.md');assert.match(target.toString(),/Notes%20%26%20research/);
 assert.equal(doc.getText(),draft);assert.equal(doc.isDirty,true);assert.equal(await fs.readFile(f.file('1a.md'),'utf8'),before);assert.match(h.informations.at(-1).message,/unsaved VS Code changes/);
 h.setExternalResult(false);await assert.rejects(h.commands.get('mrw.openDocumentInObsidian')(),/could not be opened/);
 h.configuration.obsidianVault='../../wrong';await assert.rejects(h.commands.get('mrw.openDocumentInObsidian')(),/vault ID/);
 h.configuration.obsidianVault='Notes';const unscoped=uri(path.join(f.outside,'private.md'));await fs.writeFile(unscoped.fsPath,'# Private\n');await assert.rejects(h.documents.openInObsidian(unscoped),/selected notes folder/);
});

test('preview identity uses YAML title alongside the immutable filename and updates when editor text changes',async t=>{
 const f=await fixture(t),h=harness(f,new Map(),{notesFolder:f.notes});await fs.mkdir(path.join(f.notes,'.obsidian'));
 const doc=await h.doc('1a.md');await h.focus(doc);
 const wiki=registerWikiLinks({vscode:h.api,context:h.context,register:(key,callback)=>h.commands.set(key,callback),documents:h.documents});
 const md=wiki.extendMarkdownIt(new MarkdownIt('commonmark'));
 let html=md.render(doc.getText(),{currentDocument:doc.uri});assert.match(html,/<strong[^>]*>A changed title<\/strong>/);assert.match(html,/<code>1a.md<\/code>/);
 const actions=[...html.matchAll(/href="(vscode:[^"]+\/document-action[^\"]*)"/g)].map(m=>m[1]);assert.equal(actions.length,3);assert.doesNotMatch(html,/>Problems</);
 const stale=new URL(actions[0]);const payload=JSON.parse(Buffer.from(stale.searchParams.get('target'),'base64url'));payload.action='problems';stale.searchParams.set('target',Buffer.from(JSON.stringify(payload)).toString('base64url'));
 await assert.rejects(wiki.handleUri(h.api.Uri.parse(stale.toString())),/action is unavailable/);assert.equal(h.hostCalls.some(c=>c.name==='mrw.documentProblems'),false);
 const obsidian=actions.find(href=>JSON.parse(Buffer.from(new URL(href).searchParams.get('target'),'base64url')).action==='obsidian');await wiki.handleUri(h.api.Uri.parse(obsidian));assert.equal(h.external.at(-1).path,'/external-notes/1a.md');
 const at=doc.getText().indexOf('A changed title');h.change(doc,at,'A changed title'.length,'Revised title <&>');
 html=md.render(doc.getText(),{currentDocument:doc.uri});assert.match(html,/Revised title &lt;&amp;&gt;/);assert.match(html,/<code>1a.md<\/code>/);assert.equal(await fs.readFile(f.file('1a.md'),'utf8'),f.contents['1a.md']);
});


test('copied note link opens from the external URI after restart without importing or overwriting a draft', async t => {
  const f = await fixture(t), h = harness(f, new Map(), { notesFolder: f.notes, preview: true });
  const a = await h.doc('1a.md'); await h.focus(a);
  const link = await h.commands.get('mrw.copyDocumentLink')();
  assert.equal(parseNoteLink(link).file, '1a.md');
  assert.match(h.clipboard, /^\[A changed title · 1a\.md — MRW\]\(vscode:/);
  const state = h.state, restarted = harness(f, state, { notesFolder: f.notes, preview: true });
  const draft = await restarted.doc('1a.md'); restarted.change(draft, draft.getText().length, 0, 'Unsent draft α😀');
  const wiki = registerWikiLinks({ vscode: restarted.api, context: restarted.context, register: (k,v) => restarted.commands.set(k,v), documents: restarted.documents });
  const before = new Map(state);
  assert.equal(await wiki.handleUri(restarted.api.Uri.parse(link)), true);
  assert.equal(restarted.markdownSelections.at(-1).uri, draft.uri.toString());
  assert.match(draft.getText(), /Unsent draft α😀$/); assert.equal(draft.isDirty, true);
  assert.equal(await fs.readFile(f.file('1a.md'), 'utf8'), f.contents['1a.md']);
  assert.equal(restarted.hostCalls.at(-1).args[1], 'vscode.markdown.preview.editor');
  assert.equal(restarted.state.get('mrw.documents.v1').last, draft.uri.toString());
  assert.deepEqual(restarted.state.get('mrw.documents.v1').grants, before.get('mrw.documents.v1').grants);
  assert.ok(!restarted.hostCalls.some(c => /openFolder|revert|save|close/.test(c.name)));
});

test('note URI checks workspace and vault, does not grant files or redirect a missing note', async t => {
  const f = await fixture(t), h = harness(f, new Map(), { notesFolder: f.notes });
  const a = await h.doc('1a.md'); await h.focus(a);
  const link = await h.documents.copyLink(), target = parseNoteLink(link);
  const previous = h.shown.length;
  await assert.rejects(h.documents.handleUri(h.api.Uri.parse(makeNoteLink({ ...target, notes: f.outside }))), /different notes folder/);
  await assert.rejects(h.documents.handleUri(h.api.Uri.parse(makeNoteLink({ ...target, file: 'absent.md' }))), /ENOENT/);
  await fs.writeFile(path.join(f.outside,'secret.md'),'Never open');
  await fs.symlink(path.join(f.outside,'secret.md'),f.file('escape.md'));
  await assert.rejects(h.documents.handleUri(h.api.Uri.parse(makeNoteLink({ ...target, file: 'escape.md' }))), /outside the selected scope|outside its linked/);
  assert.equal(h.shown.length, previous);
  const other = makeNoteLink({ ...target, workspace: 'file:///different/workspace' });
  await h.documents.handleUri(h.api.Uri.parse(other));
  assert.ok(!h.hostCalls.some(c => c.name==='vscode.openFolder'), 'no automatic workspace switch');
  h.setInfoResponse('Copy Link and Open Workspace'); await h.documents.handleUri(h.api.Uri.parse(other));
  assert.equal(h.clipboard, other);
  assert.deepEqual(h.hostCalls.at(-1).args[1], { forceNewWindow: true });
  h.api.workspace.isTrusted = false;
  await assert.rejects(h.documents.handleUri(h.api.Uri.parse(link)), /trust/);
});

test('preview copy action copies the explicit note instead of an unrelated active editor', async t => {
  const f = await fixture(t), h = harness(f, new Map(), { notesFolder: f.notes });
  const doc = await h.doc('1a.md'), other = await h.doc('2b.md'); await h.focus(other);
  const wiki = registerWikiLinks({ vscode:h.api, context:h.context, register:(k,v)=>h.commands.set(k,v), documents:h.documents });
  const md = wiki.extendMarkdownIt(new MarkdownIt('commonmark'));
  const html = md.render(doc.getText(), { currentDocument:doc.uri });
  const action = [...html.matchAll(/href="(vscode:[^"]+\/document-action[^\"]*)"/g)].map(m=>m[1]).find(href=>JSON.parse(Buffer.from(new URL(href).searchParams.get('target'),'base64url')).action==='copy');
  assert.ok(action); await wiki.handleUri(h.api.Uri.parse(action));
  const href = /\]\(([^)]+)\)$/.exec(h.clipboard)[1];
  assert.equal(parseNoteLink(href).file,'1a.md');
  assert.equal(h.api.window.activeTextEditor.document, other);
});


test('Open Document lists YAML titles with filename IDs, uses H1 fallback and preserves dirty text', async t => {
  const f = await fixture(t), h = harness(f); await h.folder();
  const doc = await h.doc('2b.md');
  h.change(doc, 0, doc.getText().length, '---\nid: 2b\ntitle: 2b Unsaved title\n---\n# Body title\n');
  h.setPickHook(items => {
    assert.ok(items.find(x => x.file === f.file('1a.md')).label.includes('A changed title · 1a.md'));
    assert.equal(items.find(x => x.file === f.file('3c.md')).label, 'Third · 3c.md');
    assert.equal(items.find(x => x.file === f.file('2b.md')).label, 'Unsaved title · 2b.md');
    return items.find(x => x.file === f.file('2b.md'));
  });
  await h.commands.get('mrw.openDocument')();
  assert.equal(h.dialogs.length, 1, 'a note selection needs no filename-only dialog');
  assert.equal(h.api.window.activeTextEditor.document, doc); assert.equal(doc.isDirty, true);
  assert.match(await fs.readFile(f.file('2b.md'), 'utf8'), /title: 2b Second/);
  assert.equal(h.picks.at(-1).settings.matchOnDescription, true);
  assert.equal(h.picks.at(-1).settings.matchOnDetail, true);
});

test('cancelling the titled note chooser preserves the current document and remembered destination', async t => {
  const f = await fixture(t), h = harness(f); await h.folder(); const doc = await h.open('1a.md');
  const state = structuredClone(h.state.get('mrw.documents.v1')), shown = h.shown.length;
  h.setPickHook(() => undefined); await h.commands.get('mrw.openDocument')();
  assert.equal(h.shown.length, shown); assert.equal(h.api.window.activeTextEditor.document, doc);
  assert.deepEqual(h.state.get('mrw.documents.v1'), state);
});

test('a note replaced by an outside symlink after title selection is rejected before granting it', async t => {
  const f = await fixture(t), h = harness(f); await h.folder();
  await fs.writeFile(path.join(f.outside, 'secret.md'), '# Outside secret\n');
  h.setPickHook(async items => {
    const choice = items.find(x => x.file === f.file('2b.md'));
    await fs.unlink(f.file('2b.md')); await fs.symlink(path.join(f.outside, 'secret.md'), f.file('2b.md'));
    return choice;
  });
  await assert.rejects(() => h.commands.get('mrw.openDocument')(), /moved outside/);
  assert.equal(h.shown.length, 0);
  assert.equal(h.state.get('mrw.documents.v1').grants.length, 0);
});


test('ordinary follow refuses an origin changed during editor opening and preserves the previous Return', async t => {
  const f = await fixture(t), h = harness(f); await h.folder(); const a = await h.open('1a.md'); await h.follow(a, '2b');
  const before = structuredClone(h.state.get('mrw.documents.v1'));
  h.setShowHook(doc => {
    if (doc.uri.fsPath === f.file('3c.md')) {
      const at = a.getText().indexOf('3c.md'); h.change(a, at, '3c.md'.length, 'slow.md');
    }
  });
  await assert.rejects(h.follow(a, '3c.md'), /originating.*changed/i);
  h.setShowHook(undefined);
  const current = h.state.get('mrw.documents.v1');
  assert.equal(current.last, before.last); assert.equal(current.origin.start, before.origin.start); assert.equal(current.origin.end, before.origin.end); assert.equal(current.origin.invalid, false);
  await h.documents.returnToDocument(); assert.equal(h.selected(), '[[2b]]');
  assert.equal(a.isDirty, true); assert.equal(await fs.readFile(a.uri.fsPath, 'utf8'), f.contents['1a.md']);
});

test('ordinary follow tracks an outside origin edit during editor opening without rejecting the current link', async t => {
  const f = await fixture(t), h = harness(f); await h.folder(); const a = await h.open('1a.md');
  h.setShowHook(doc => { if (doc.uri.fsPath === f.file('3c.md')) h.change(a, 0, 0, 'Unsaved preface α😀\n'); });
  await h.follow(a, '3c.md'); h.setShowHook(undefined);
  await h.documents.returnToDocument(); assert.equal(h.selected(), '[Third](3c.md)');
  assert.equal(a.isDirty, true); assert.equal(await fs.readFile(a.uri.fsPath, 'utf8'), f.contents['1a.md']);
});

test('backlink scope is rechecked before the host reads a picker target redirected outside the notes folder', async t => {
  const f = await fixture(t), h = harness(f); await h.folder(); const a = await h.open('1a.md'); await h.follow(a, '2b');
  const before = structuredClone(h.state.get('mrw.documents.v1')), reads = h.reads.length;
  const outside = path.join(f.outside, 'private.md'); await fs.writeFile(outside, a.getText());
  h.setPickHook(async choices => { await fs.unlink(a.uri.fsPath); await fs.symlink(outside, a.uri.fsPath); return choices[0]; });
  await assert.rejects(h.commands.get('mrw.showBacklinks')(), /different file|outside.*scope|selected scope/i);
  assert.deepEqual(h.reads.slice(reads), [], 'a rejected backlink must not ask the host to load its current file');
  assert.deepEqual(h.state.get('mrw.documents.v1'), before); assert.equal(h.api.window.activeTextEditor.document.uri.fsPath, f.file('2b.md'));
});

test('backlink refuses a return occurrence changed during editor opening and retains the prior usable Return', async t => {
  const f = await fixture(t), h = harness(f); await h.folder(); const a = await h.open('1a.md'); await h.follow(a, '2b.md#target');
  const b = h.api.window.activeTextEditor.document, before = structuredClone(h.state.get('mrw.documents.v1'));
  h.setShowHook(doc => {
    if (doc === a) { const at = b.getText().indexOf('# Target'); h.change(b, at, '# Target'.length, '# Changed'); }
  });
  await assert.rejects(h.commands.get('mrw.showBacklinks')(), /originating.*changed/i); h.setShowHook(undefined);
  const after = h.state.get('mrw.documents.v1');
  assert.deepEqual(after.origin, before.origin); assert.equal(after.last, before.last);
  assert.equal(after.location.invalid, true, 'Overwriting the saved destination must invalidate its resume position.');
  await h.documents.returnToDocument(); assert.equal(h.selected(), '[Second](2b.md#target)');
  assert.equal(b.isDirty, true); assert.equal(await fs.readFile(b.uri.fsPath, 'utf8'), f.contents['2b.md']);
});


test('PDF follow preserves the previous Return if its originating link changes during host opening', async t => {
  const f = await fixture(t), h = harness(f); await h.folder(); const a = await h.open('1a.md'); await h.follow(a, '2b');
  const before = structuredClone(h.state.get('mrw.documents.v1')), execute = h.api.commands.executeCommand;
  h.api.commands.executeCommand = async (name, ...args) => {
    const value = await execute(name, ...args);
    if (name === 'vscode.openWith' && args[1] === 'fixture.pdf') {
      const at = a.getText().indexOf('paper.pdf'); h.change(a, at, 'paper.pdf'.length, 'other.pdf');
    }
    return value;
  };
  await assert.rejects(h.follow(a, 'paper.pdf'), /originating.*changed/i);
  const current = h.state.get('mrw.documents.v1');
  assert.equal(current.last, before.last); assert.equal(current.origin.start, before.origin.start); assert.equal(current.origin.end, before.origin.end);
  await h.documents.returnToDocument(); assert.equal(h.selected(), '[[2b]]');
  assert.equal(a.isDirty, true); assert.equal(await fs.readFile(a.uri.fsPath, 'utf8'), f.contents['1a.md']);
});


test('a new note opens in the invoking preview group instead of an unrelated stale active text editor', async t => {
  const f = await fixture(t), h = harness(f); await h.folder(); const a = await h.open('1a.md');
  const unrelated = await h.doc('slow.md'), editor = await h.focus(unrelated); editor.viewColumn = 1;
  h.api.window.tabGroups = { activeTabGroup: { viewColumn: 2, activeTab: { input: { uri: a.uri, viewType: 'vscode.markdown.preview.editor' } } }, all: [
    { viewColumn: 1, tabs: [{ input: { uri: unrelated.uri } }] },
    { viewColumn: 2, tabs: [{ input: { uri: a.uri, viewType: 'vscode.markdown.preview.editor' } }] },
  ] };
  await h.follow(a, '3c.md');
  assert.equal(h.shown.findLast(value => value.doc.uri.fsPath === f.file('3c.md')).settings.viewColumn, 2,
    'the active native preview group owns a new destination when the text-editor acknowledgement lags');
});


test('chooser folder navigation grants only the explicitly opened file without changing notes scope', async t => {
 const f=await fixture(t),h=harness(f);await h.folder();await fs.writeFile(path.join(f.outside,'Chosen.txt'),'Chosen original');await fs.writeFile(path.join(f.outside,'Other.txt'),'Other original');
 let stage=0;h.setPickHook(items=>{if(stage++===0)return items.find(i=>i.key==='parent');if(stage===2)return items.find(i=>i.file===f.outside);return items.find(i=>i.file===path.join(f.outside,'Chosen.txt'));});
 await h.commands.get('mrw.openDocument')();assert.equal(h.configuration.notesFolder,f.notes);assert.equal(h.state.get('mrw.documents.v1').folder.canonical,f.notes);
 await h.documents.check(uri(path.join(f.outside,'Chosen.txt')));await assert.rejects(h.documents.check(uri(path.join(f.outside,'Other.txt'))),/outside.*scope/);
});


test('a superseding document command closes its old picker and cancellation preserves state', async t=>{
  const f=await fixture(t),h=harness(f);h.setPickHook(()=>WAIT);
  const first=h.commands.get('mrw.openDocument')();
  await new Promise(r=>setImmediate(r));
  const second=h.commands.get('mrw.openDocument')();
  await first;
  for(const disposable of h.context.subscriptions)disposable.dispose();
  await second;assert.equal(h.reads.length,0);assert.equal(h.configurationWrites.length,0);
});

test('heading and block WikiLinks follow current dirty text and Return preserves complete syntax', async t => {
  const f = await fixture(t), h = harness(f); await h.folder();
  await fs.writeFile(f.file('2b.md'), '# Target\n\nAn exact proof. ^proof\n');
  const source = await h.open('1a.md');
  h.change(source, source.text.length, 0, '\n[[2b#Target|The theorem]]\n[[2b#^proof]]\n[[./2b#Target]]\n');
  for (const target of ['2b#Target|The theorem', '2b#^proof', './2b#Target']) {
    await h.follow(source, target);
    assert.match(h.selected(), target.includes('^') ? /An exact proof/ : /# Target/);
    await h.documents.returnToDocument(); assert.equal(h.selected(), '[[' + target + ']]');
  }
  assert.ok(source.isDirty); assert.deepEqual(h.errors, []);
});

test('reopen restores an exact selection after restart and refuses changed text without guessing', async t => {
  const f = await fixture(t), state = new Map(), h = harness(f, state); const source = await h.open('1a.md');
  const at = source.text.indexOf('[Second]'); h.selection(at, at + 8);
  await new Promise(resolve => setImmediate(resolve));
  const restarted = harness(f, state); await restarted.commands.get('mrw.reopenDocument')(); assert.equal(restarted.selected(), '[Second]');
  await fs.appendFile(f.file('1a.md'), '\nExternal revision\n');
  const changed = harness(f, state);
  await assert.rejects(changed.commands.get('mrw.reopenDocument')(), /exact document location changed/);
  assert.equal(changed.shown.length, 0);
});

test('only successful non-Markdown opens publish their displayed identity', async t => {
  const f = await fixture(t), h = harness(f); await h.folder(); const a = await h.open('1a.md');
  await h.follow(a, 'paper.pdf'); assert.equal(h.displayed.at(-1), f.file('paper.pdf'));
  await h.documents.returnToDocument(); assert.equal(h.displayed.at(-1), f.file('1a.md'));
  const before = [...h.displayed]; await assert.rejects(h.follow(a, 'missing.md'));
  assert.deepEqual(h.displayed, before);
});

test('notes folder chooser shows the current full path and restores recent folders after restart', async t => {
  const f=await fixture(t),state=new Map(),h=harness(f,state,{notesFolder:f.notes});
  const doc=await h.open('1a.md');h.change(doc,doc.text.length,0,'unsaved work');
  const origin=structuredClone(state.get('mrw.documents.v1'));
  h.openChoices.push([uri(f.outside)]);await h.commands.get('mrw.chooseNotesFolder')();
  const menu=h.picks.find(p=>p.settings.title==='Choose Notes Folder');
  assert.equal(menu.choices[0].description,'Current');assert.equal(menu.choices[0].detail,f.notes);
  assert.match(menu.settings.placeHolder,new RegExp(f.notes));
  assert.equal(h.dialogs.at(-1).defaultUri.fsPath,f.notes);
  assert.deepEqual(state.get('mrw.documents.v1').recentFolders.map(x=>x.canonical),[f.outside,f.notes]);
  assert.equal(h.informations.at(-1).message,`Notes folder: ${f.outside}`);
  assert.equal(state.get('mrw.documents.v1').last,origin.last);assert.equal(doc.isDirty,true);
  assert.equal(await fs.readFile(doc.uri.fsPath,'utf8'),f.contents['1a.md']);
  const reopened=harness(f,state,{notesFolder:f.outside});
  reopened.setPickHook(items=>items.find(i=>i.detail===f.notes));
  await reopened.commands.get('mrw.chooseNotesFolder')();
  assert.equal(reopened.dialogs.length,0,'a recent selection needs no file dialog');
  assert.equal(reopened.configuration.notesFolder,f.notes);
  assert.deepEqual(state.get('mrw.documents.v1').recentFolders.map(x=>x.canonical),[f.notes,f.outside]);
});

test('cancelled folder menu and Browse do not write settings, state or history', async t => {
  const f=await fixture(t),h=harness(f,new Map(),{notesFolder:f.notes});
  h.setPickHook(()=>undefined);await h.commands.get('mrw.chooseNotesFolder')();
  assert.equal(h.state.size,0);assert.equal(h.configurationWrites.length,0);assert.equal(h.dialogs.length,0);
  h.setPickHook(items=>items.find(i=>i.action==='browse'));h.openChoices.push(undefined);
  await h.commands.get('mrw.chooseNotesFolder')();
  assert.equal(h.dialogs[0].defaultUri.fsPath,f.notes);
  assert.equal(h.state.size,0,'resolving Browse default must not persist scope');
  assert.equal(h.configurationWrites.length,0);assert.equal(h.informations.length,0);
});

test('Browse always supplies a default and falls back from a missing folder to the workspace', async t => {
  const f=await fixture(t),missing=path.join(f.base,'missing'),h=harness(f,new Map(),{notesFolder:missing});
  await h.commands.get('mrw.chooseNotesFolder')();
  assert.equal(h.dialogs[0].defaultUri.fsPath,f.root);
  assert.equal(h.configuration.notesFolder,missing);assert.equal(h.state.size,0);
});

test('missing or redirected recent folders do not replace the selected folder', async t => {
  const f=await fixture(t),h=harness(f);await h.folder();
  h.openChoices.push([uri(f.outside)]);await h.commands.get('mrw.chooseNotesFolder')();
  const before=structuredClone(h.state.get('mrw.documents.v1'));
  const moved=path.join(f.base,'moved');await fs.rename(f.notes,moved);
  h.setPickHook(items=>items.find(i=>i.detail===f.notes));
  await assert.rejects(h.commands.get('mrw.chooseNotesFolder')(),/unavailable.*selected folder has not changed/);
  assert.equal(h.configuration.notesFolder,f.outside);assert.deepEqual(h.state.get('mrw.documents.v1'),before);
  await fs.symlink(moved,f.notes);
  await assert.rejects(h.commands.get('mrw.chooseNotesFolder')(),/different location.*selected folder has not changed/);
  assert.equal(h.configuration.notesFolder,f.outside);assert.deepEqual(h.state.get('mrw.documents.v1'),before);
});

test('notes folder settings failure preserves scope and history', async t => {
  const f=await fixture(t);let fail=false;
  const h=harness(f,new Map(),{updateConfiguration:async()=>{if(fail)throw Error('settings write failed');}});
  await h.folder();const before=structuredClone(h.state.get('mrw.documents.v1'));fail=true;
  h.openChoices.push([uri(f.outside)]);
  await assert.rejects(h.commands.get('mrw.chooseNotesFolder')(),/settings write failed/);
  assert.equal(h.configuration.notesFolder,f.notes);assert.deepEqual(h.state.get('mrw.documents.v1'),before);
  assert.equal(h.informations.length,1,'no success message for a rejected change');
});

test('history save failure reports the selected folder and allows retry without losing earlier choices', async t => {
  const f=await fixture(t);let fail=false;
  const h=harness(f,new Map(),{updateState:async()=>{if(fail)throw Error('state write failed');}});
  await h.folder();const before=structuredClone(h.state.get('mrw.documents.v1'));fail=true;
  h.openChoices.push([uri(f.outside)]);
  await assert.rejects(h.commands.get('mrw.chooseNotesFolder')(),/Notes folder selected:.*Folder history could not be saved: state write failed/);
  assert.equal(h.configuration.notesFolder,f.outside);assert.deepEqual(h.state.get('mrw.documents.v1'),before);
  fail=false;h.setPickHook(items=>items.find(i=>i.description==='Current'));
  await h.commands.get('mrw.chooseNotesFolder')();
  assert.deepEqual(h.state.get('mrw.documents.v1').recentFolders.map(x=>x.canonical),[f.outside,f.notes]);
});

test('delayed notes-folder writes cannot overwrite a newer accepted choice', async t => {
  const f=await fixture(t),third=path.join(f.base,'third');await fs.mkdir(third);
  const started=deferred(),release=deferred();let delay=false;
  const h=harness(f,new Map(),{updateConfiguration:async(_name,value)=>{
    if(delay&&value===f.outside){started.resolve();await release.promise;}
  }});
  await h.folder();delay=true;h.openChoices.push([uri(f.outside)]);
  const first=h.commands.get('mrw.chooseNotesFolder')();await started.promise;
  h.openChoices.push([uri(third)]);const second=h.commands.get('mrw.chooseNotesFolder')();
  await new Promise(r=>setImmediate(r));release.resolve();await Promise.all([first,second]);
  assert.equal(h.configuration.notesFolder,third);assert.equal(h.state.get('mrw.documents.v1').folder.canonical,third);
  assert.equal(h.informations.at(-1).message,`Notes folder: ${third}`);
  assert.ok(!h.informations.some(i=>i.message===`Notes folder: ${f.outside}`));
});

test('folder history is bounded, deduplicates canonical paths and does not leak between workspaces', async t => {
  const f=await fixture(t),h=harness(f);await h.folder();
  for(let i=0;i<12;i++){
    const dir=path.join(f.base,`recent-${i}`);await fs.mkdir(dir);h.openChoices.push([uri(dir)]);
    await h.commands.get('mrw.chooseNotesFolder')();
  }
  const selected=h.configuration.notesFolder,alias=path.join(f.base,'alias');await fs.symlink(selected,alias);
  h.openChoices.push([uri(alias)]);await h.commands.get('mrw.chooseNotesFolder')();
  const recent=h.state.get('mrw.documents.v1').recentFolders;
  assert.equal(recent.length,10);assert.equal(new Set(recent.map(x=>x.canonical)).size,10);
  const other=harness({...f,root:f.outside},h.state);
  other.setPickHook(()=>undefined);await other.commands.get('mrw.chooseNotesFolder')();
  assert.deepEqual(other.picks[0].choices.map(x=>x.action),['browse']);
  assert.equal(other.configurationWrites.length,0);
});


test('a relocated workspace preserves its external note grants, last document and exact Return selection',async t=>{
 const f=await fixture(t),state=new Map(),h=harness(f,state);await h.folder();const first=await h.open('1a.md');await h.follow(first,'2b');
 const destination=path.join(f.base,'relocated');await fs.mkdir(destination);
 const {rebase}=require('../src/workspaceMove');const reopened=harness({...f,root:destination},state,{identityRoot:v=>rebase(v,[[destination,f.root]])});
 await reopened.commands.get('mrw.reopenDocument')();assert.equal(reopened.api.window.activeTextEditor.document.uri.fsPath,f.file('2b.md'));
 assert.equal(await reopened.documents.returnToDocument(),true);assert.equal(reopened.selected(),'[[2b]]');
 assert.equal(await fs.readFile(f.file('1a.md'),'utf8'),f.contents['1a.md']);
});


test('PDF editor menu keeps its explicit tab through focus changes, cancellation and restart', async t => {
  const f = await fixture(t), state = new Map(), h = harness(f, state, { notesFolder: f.notes, preview: true });
  const a = await h.doc('1a.md'); await h.follow(a, '2b');
  const original = structuredClone(state.get('mrw.documents.v1').origin);
  const unrelated = await h.doc('3c.md'); await h.focus(unrelated);
  h.api.window.tabGroups = { activeTabGroup: { activeTab: { input: { uri: unrelated.uri } } } };
  h.setPickHook(() => undefined);
  await h.commands.get('mrw.showBacklinks')(uri(f.file('paper.pdf')));
  assert.deepEqual(state.get('mrw.documents.v1').origin, original, 'cancel leaves the previous return intact');
  h.setPickHook(async choices => {
    await h.focus(unrelated); h.change(unrelated, 0, 0, 'Unsent text.\n');
    return choices.find(c => c.hit.node.target === 'paper.pdf');
  });
  await h.commands.get('mrw.showBacklinks')(uri(f.file('paper.pdf')));
  const shown = h.shown.at(-1);
  assert.equal(shown.doc.getText().slice(shown.doc.offsetAt(shown.editor.selection.start), shown.doc.offsetAt(shown.editor.selection.end)), '[Paper](paper.pdf)');
  assert.equal(state.get('mrw.documents.v1').origin.uri, uri(f.file('paper.pdf')).toString());
  assert.equal(state.get('mrw.documents.v1').origin.fileOnly, true);
  const reopened = harness(f, state);
  await reopened.documents.returnToDocument();
  const call = reopened.hostCalls.at(-1);
  assert.equal(call.name, 'vscode.openWith'); assert.equal(call.args[0].fsPath, f.file('paper.pdf'));
  assert.equal(unrelated.isDirty, true); assert.match(unrelated.getText(), /^Unsent text/);
  for (const [name, contents] of Object.entries(f.contents)) assert.deepEqual(await fs.readFile(f.file(name)), Buffer.from(contents));
});

test('an editor-menu URI is not authorization to read an external document', async t => {
  const f = await fixture(t), h = harness(f, new Map(), { notesFolder: f.notes });
  const external = path.join(f.outside, 'paper.pdf'); await fs.writeFile(external, '%PDF-1.4');
  await assert.rejects(h.commands.get('mrw.showBacklinks')(uri(external)), /outside|Choose|selected|authorized/i);
  assert.equal(h.picks.length, 0); assert.equal(h.hostCalls.length, 0);
});

test('New Note delegates vault creation without a title prompt or file write and preserves the reader through restart',async t=>{
 const f=await fixture(t);await fs.mkdir(path.join(f.notes,'.obsidian'));
 const state=new Map(),sent=[];const h=harness(f,state,{preview:true,notesFolder:f.notes,obsidianNote:async request=>{await request.validate();sent.push(request.root);}});
 await h.open('paper.pdf');const before=await fs.readdir(f.notes),shown=h.shown.length,reader=h.api.window.tabGroups.activeTabGroup.activeTab.input.uri;
 await h.commands.get('mrw.newZettel')();assert.deepEqual(sent,[f.notes]);assert.equal(h.shown.length,shown);
 assert.equal(h.api.window.tabGroups.activeTabGroup.activeTab.input.uri,reader);assert.deepEqual(await fs.readdir(f.notes),before);
 const restart=harness(f,state);assert.equal(await restart.documents.returnToDocument(),true);
 assert.equal(restart.hostCalls.at(-1).args[0].fsPath,f.file('paper.pdf'));
});
test('a pending or failed Obsidian handoff creates no duplicate draft and preserves dirty text',async t=>{
 const f=await fixture(t);await fs.mkdir(path.join(f.notes,'.obsidian'));const gate=deferred();let count=0;
 const h=harness(f,new Map(),{notesFolder:f.notes,obsidianNote:async()=>{count++;await gate.promise;throw Error('CLI unavailable');}});
 const doc=await h.open('1a.md');h.change(doc,0,0,'Unsent text\n');const before=await fs.readdir(f.notes);
 const first=h.commands.get('mrw.newZettel')();await new Promise(resolve=>setTimeout(resolve,10));
 await h.commands.get('mrw.newZettel')();gate.resolve();await assert.rejects(first,/CLI unavailable/);
 assert.equal(count,1);assert.equal(doc.isDirty,true);assert.match(doc.text,/^Unsent text/);assert.deepEqual(await fs.readdir(f.notes),before);
});
