'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { registerAtlas } = require('../src/atlas');
const { createAtlas } = require('../src/atlasModel');
const { extractAtlasText } = require('../src/atlasText');
const { digest } = require('../src/navigation');

async function harness(t) {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'mrw-atlas-editor-'));
  t.after(() => fs.rm(home, { recursive: true, force: true }));
  const root = path.join(home, 'workspace');
  const outside = path.join(home, 'external');
  await fs.mkdir(root);
  await fs.mkdir(outside);

  const handlers = new Map(), providers = new Map(), docs = new Map();
  const calls = [], errors = [], panels = [], publications = [];
  const writes = { allowed: false };
  let custom;
  const uri = file => ({
    scheme: 'file', fsPath: file, path: file,
    toString: () => 'file:' + file,
  });
  const api = {
    workspace: {
      isTrusted: true,
      workspaceFolders: [{ uri: uri(root) }],
      textDocuments: [],
      getWorkspaceFolder: () => ({ uri: uri(root) }),
      registerTextDocumentContentProvider(scheme, provider) {
        providers.set(scheme, provider);
        return { dispose() {} };
      },
      async openTextDocument(value) {
        calls.push(['openTextDocument', value]);
        const key = value.toString();
        if (docs.has(key)) return docs.get(key);
        const text = value.scheme === 'mrw-atlas-source'
          ? providers.get(value.scheme).provideTextDocumentContent(value)
          : await fs.readFile(value.fsPath, 'utf8');
        const doc = {
          uri: value,
          getText: () => text,
          positionAt(offset) {
            const lines = text.slice(0, offset).split('\n');
            return { line: lines.length - 1, character: lines.at(-1).length };
          },
          offsetAt(position) {
            const prior = text.split('\n').slice(0, position.line);
            return prior.reduce((n, line) => n + line.length + 1, 0) + position.character;
          },
        };
        docs.set(key, doc);
        api.workspace.textDocuments.push(doc);
        return doc;
      },
    },
    window: {
      registerCustomEditorProvider(id, provider, options) {
        custom = { id, provider, options };
        return { dispose() {} };
      },
      onDidChangeTextEditorSelection: () => ({ dispose() {} }),
      showErrorMessage: message => errors.push(message),
      async showTextDocument(doc, options) {
        calls.push(['showTextDocument', doc, options]);
        api.window.activeTextEditor = { document: doc };
        return { revealRange() {} };
      },
      createWebviewPanel() {
        const created = panel();
        panels.push(created);
        return created;
      },
    },
    commands: { executeCommand: async (...args) => calls.push(args) },
    Uri: {
      file: uri,
      parse: value => ({
        scheme: value.split(':')[0], fsPath: value.slice(5), path: value.slice(5),
        toString: () => value,
      }),
      from: value => ({ ...value, toString: () => value.scheme + ':' + value.authority + value.path }),
    },
    Range: class Range {
      constructor(start, end) { Object.assign(this, { start, end }); }
    },
    ViewColumn: { Active: 1 },
    TextEditorRevealType: { InCenterIfOutsideViewport: 1 },
  };
  const context = { subscriptions: [], extensionPath: path.resolve(__dirname, '..') };
  const controller = registerAtlas({
    vscode: api, context,
    register: (id, fn) => handlers.set(id, fn),
    bridge: async request => {
      assert.ok(writes.allowed, 'Opening must not call bridge');
      assert.equal(request.method, 'atlas_publish');
      assert.equal(request.project_root, root);
      await fs.writeFile(request.path, request.text, { flag: 'wx' });
      publications.push(request);
      return { path: request.path };
    },
    projectRoot: async () => assert.fail('Automatic opening must not select a workspace'),
    choosePath: async () => undefined,
  });
  function panel() {
    let receive;
    const disposes = [];
    return {
      viewColumn: 1,
      webview: {
        options: {},
        onDidReceiveMessage(fn) {
          receive = fn;
          return { dispose() { receive = undefined; } };
        },
      },
      reveal: () => calls.push(['reveal']),
      onDidDispose: fn => disposes.push(fn),
      receive: message => receive?.(message),
      dispose: () => disposes.forEach(fn => fn()),
    };
  }
  const text = '## Lemma A {#a}\n\nA premise.\n\n## Theorem B {#b}\n\nA conclusion uses [A](#a).\n';
  const record = {
    ...createAtlas({
      source: {
        title: 'Fixture', uri: 'file:/never-read-source.tex', text,
        language: 'markdown', revision: digest(text),
      },
      extraction: extractAtlasText(text, 'markdown'),
    }),
    id: randomUUID(), graphs: {},
    previous: { id: randomUUID(), file: 'previous.mrw-atlas.json' },
  };
  return { home, root, outside, record, api, custom, handlers, calls, errors, controller, panel, uri, panels, publications, writes };
}

test('native custom editor renders a saved atlas without publishing or choosing a workspace', async t => {
  const h = await harness(t);
  const file = path.join(h.root, 'sample.mrw-atlas.json');
  await fs.writeFile(file, JSON.stringify(h.record));
  const before = await fs.readFile(file);
  assert.equal(h.custom.id, 'mrw.atlasEditor');
  assert.equal(h.custom.options.supportsMultipleEditorsPerDocument, false);

  const document = await h.custom.provider.openCustomDocument(h.uri(file), {}, {});
  const panel = h.panel();
  const c = await h.custom.provider.resolveCustomEditor(document, panel, {});
  assert.equal(c.readOnly, false);
  assert.equal(c.panel, panel);
  assert.equal(h.panels.length, 0, 'Native resolution uses the supplied panel');
  assert.match(panel.webview.html, /Proof map/);
  assert.match(panel.webview.html, /data-type="saveAtlas"/);
  assert.equal(h.calls.length, 0);
  assert.deepEqual(await fs.readFile(file), before);

  await h.handlers.get('mrw.openAtlas')(h.uri(file));
  assert.ok(h.calls.some(call => call[0] === 'reveal'));
  assert.equal(h.errors.length, 0);
});

test('external atlas stays read-only, uses only captured evidence and preserves Return', async t => {
  const h = await harness(t);
  const file = path.join(h.outside, 'external.mrw-atlas.json');
  h.record.graphs = { [h.record.components[0].id + ':0']: 'missing.mrw-proof.json' };
  await fs.writeFile(file, JSON.stringify(h.record));
  const before = await fs.readFile(file), names = await fs.readdir(h.outside);
  const document = await h.custom.provider.openCustomDocument(h.uri(file), {}, {});
  const panel = h.panel();
  const c = await h.custom.provider.resolveCustomEditor(document, panel, {});
  assert.equal(c.readOnly, true);
  assert.equal(c.root, null);
  for (const type of ['saveAtlas', 'regenerate', 'edit', 'openPrevious', 'openGraph', 'openOriginal', 'copyHandoff', 'startDraft', 'importProposal']) {
    assert.ok(!panel.webview.html.includes('data-type="' + type + '"'));
  }

  const entry = c.atlas.extraction.entries[0];
  await panel.receive({ type: 'selectComponent', component: entry.id });
  assert.match(panel.webview.html, /Passages/);
  assert.doesNotMatch(panel.webview.html, /data-change="component"|Copy handoff|Write an outline|Open proof outline/);
  await panel.receive({
    type: 'edit',
    change: { type: 'component', component: entry.id, fields: { title: 'Disallowed' } },
  });
  assert.equal(c.atlas.components[0].title, h.record.components[0].title);

  await panel.receive({ type: 'openSource', entry: entry.id, part: 'entry' });
  assert.equal(h.calls.find(call => call[0] === 'showTextDocument')[2].preview, false);
  assert.ok(!h.calls.some(call => call[0] === 'workbench.action.keepEditor'));
  assert.ok(h.controller.returnFromCapture());
  await panel.receive({ type: 'return' });
  assert.ok(h.calls.filter(call => call[0] === 'openTextDocument').every(call => call[1].scheme === 'mrw-atlas-source'));
  assert.deepEqual(await fs.readFile(file), before);
  assert.deepEqual(await fs.readdir(h.outside), names);
  assert.equal(h.errors.length, 0);
});

test('bad direct open has inline error, Text Editor route and retry after correction', async t => {
  const h = await harness(t);
  const file = path.join(h.root, 'broken.mrw-atlas.json');
  await fs.writeFile(file, '{ invalid JSON <script>');
  const document = await h.custom.provider.openCustomDocument(h.uri(file), {}, {});
  const panel = h.panel();
  await h.custom.provider.resolveCustomEditor(document, panel, {});
  assert.match(panel.webview.html, /Could not open this atlas/);
  assert.match(panel.webview.html, /data-type="retryOpen"/);
  assert.match(panel.webview.html, /data-type="openAsText"/);
  assert.equal(h.errors.length, 0);

  await panel.receive({ type: 'openAsText' });
  assert.deepEqual(h.calls.at(-1).slice(0, 3), ['vscode.openWith', document.uri, 'default']);
  await fs.writeFile(file, JSON.stringify(h.record));
  await panel.receive({ type: 'retryOpen' });
  assert.match(panel.webview.html, /Proof map/);
  assert.doesNotMatch(panel.webview.html, /Could not open this atlas/);
});

test('Open Mathematical Atlas command uses native editor routing when registered', async t => {
  const h = await harness(t);
  const file = path.join(h.outside, 'sample.mrw-atlas.json');
  await fs.writeFile(file, JSON.stringify(h.record));
  await h.handlers.get('mrw.openAtlas')(h.uri(file));
  const call = h.calls.at(-1);
  assert.equal(call[0], 'vscode.openWith');
  assert.equal(call[1].fsPath, file);
  assert.equal(call[2], 'mrw.atlasEditor');
});


test('saving from a native atlas preserves its opened revision and continues a separate successor', async t => {
  const h = await harness(t);
  const file = path.join(h.root, 'original.mrw-atlas.json');
  await fs.writeFile(file, JSON.stringify(h.record));
  const originalBytes = await fs.readFile(file);
  const document = await h.custom.provider.openCustomDocument(h.uri(file), {}, {});
  const panel = h.panel();
  const original = await h.custom.provider.resolveCustomEditor(document, panel, {});
  const component = original.atlas.components[0];
  await panel.receive({ type: 'selectComponent', component: component.id });
  await panel.receive({
    type: 'edit',
    change: { type: 'component', component: component.id, fields: { title: 'A developed successor' } },
  });
  assert.equal(original.unsaved, true);
  assert.equal(original.atlas.components[0].title, 'A developed successor');

  h.writes.allowed = true;
  await panel.receive({ type: 'saveAtlas' });
  assert.equal(h.publications.length, 1);
  assert.equal(h.panels.length, 1);
  const saved = h.publications[0];
  const successor = JSON.parse(await fs.readFile(saved.path, 'utf8'));
  assert.notEqual(saved.path, file);
  assert.equal(successor.previous.file, path.basename(file));
  assert.equal(successor.components[0].title, 'A developed successor');
  assert.equal(original.file, file);
  assert.equal(original.atlas.components[0].title, component.title);
  assert.equal(original.unsaved, false);
  assert.deepEqual(await fs.readFile(file), originalBytes);
  assert.match(h.panels[0].webview.html, /A developed successor/);

  await h.panels[0].receive({ type: 'openPrevious' });
  assert.equal(original.atlas.components[0].title, component.title);
  assert.match(panel.webview.html, /This|Fixture|Lemma A/);
  assert.ok(!panel.webview.html.includes('<h1 id="atlas-heading" tabindex="-1">A developed successor'));
  assert.deepEqual(await fs.readFile(file), originalBytes);
  assert.equal(h.errors.length, 0);
});

test('a saved successor that fails to open leaves the current atlas correction available', async t => {
  const h = await harness(t);
  const file = path.join(h.root, 'original.mrw-atlas.json');
  await fs.writeFile(file, JSON.stringify(h.record));
  const document = await h.custom.provider.openCustomDocument(h.uri(file), {}, {});
  const panel = h.panel();
  const original = await h.custom.provider.resolveCustomEditor(document, panel, {});
  const component = original.atlas.components[0].id;
  await panel.receive({
    type: 'edit',
    change: { type: 'component', component, fields: { title: 'Keep this correction' } },
  });
  h.writes.allowed = true;
  h.api.window.createWebviewPanel = () => { throw new Error('Viewer unavailable'); };
  await panel.receive({ type: 'saveAtlas' });
  assert.equal(h.publications.length, 1);
  assert.equal(original.file, file);
  assert.equal(original.unsaved, true);
  assert.equal(original.atlas.components[0].title, 'Keep this correction');
  assert.match(h.errors[0], /Saved .*but its viewer could not open/);
});
