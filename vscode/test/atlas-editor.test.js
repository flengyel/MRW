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

async function harness(t, { compareWithLean } = {}) {
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
    vscode: api, context, compareWithLean,
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

test('the saved LaTeX atlas filters results in its panel and toggles prose without rewriting the record', async t => {
  const h = await harness(t);
  const text = String.raw`\newtheorem{theorem}{Theorem}
\begin{document}
\section{Context}
Original explanatory passage for the atlas.

\begin{theorem}\label{thm:result}
A retained statement.
\end{theorem}
\end{document}`;
  const record = { ...createAtlas({
    source: { title: 'Fixture', uri: 'file:/never-read-source.tex', text, language: 'latex', revision: digest(text) },
    extraction: extractAtlasText(text, 'latex'),
  }), id: randomUUID() };
  const file = path.join(h.outside, 'source.mrw-atlas.json');
  const saved = JSON.stringify(record);
  await fs.writeFile(file, saved);
  const document = await h.custom.provider.openCustomDocument(h.uri(file), {}, {});
  const panel = h.panel();
  const c = await h.custom.provider.resolveCustomEditor(document, panel, {});
  assert.equal(c.readOnly, true);
  assert.match(panel.webview.html, /data-readable="0\.75"/);
  assert.match(panel.webview.html, /Theorem 1/);
  assert.match(panel.webview.html, /Show prose/);
  assert.doesNotMatch(panel.webview.html, /Original explanatory passage/);
  await panel.receive({ type: 'selectView', view: 'list' });
  await panel.receive({ type: 'toggleProse' });
  assert.match(panel.webview.html, /aria-pressed="true" data-type="toggleProse">Hide prose/);
  assert.match(panel.webview.html, /Original explanatory passage/);
  await panel.receive({ type: 'toggleProse' });
  assert.doesNotMatch(panel.webview.html, /Original explanatory passage/);
  assert.equal(await fs.readFile(file, 'utf8'), saved);
  assert.deepEqual(h.errors, []);
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


test('switching from the 08ZE component opens the wrapped 08ZH Blueprint', async t => {
  const h = await harness(t);
  const text = await fs.readFile(path.join(__dirname, '../../tests/fixtures/stacks/topology.tex'), 'utf8');
  const start = text.indexOf('\\begin{lemma}\n\\label{lemma-fibre-product-closed}');
  const end = text.indexOf('\\end{proof}', start) + '\\end{proof}'.length;
  const file = path.join(h.root, 'hausdorff.mrw-atlas.json');
  const record = {
    ...createAtlas({
      source: { title: 'Hausdorff spaces', uri: 'file:///topology.tex', text, language: 'latex', revision: digest(text) },
      extraction: extractAtlasText(text, 'latex', { start, end }),
    }),
    id: randomUUID(),
  };
  await fs.writeFile(file, JSON.stringify(record));
  const original = await fs.readFile(file);
  const document = await h.custom.provider.openCustomDocument(h.uri(file), {}, {});
  const panel = h.panel();
  const current = await h.custom.provider.resolveCustomEditor(document, panel, {});
  assert.equal(current.diagram.nodes.length, 2);

  const viewport = { width: 570, height: 540 };
  await panel.receive({ type: 'fitDiagramLayout', view: 'map', ...viewport });
  const lemma = record.extraction.entries.find(entry => entry.label === 'lemma-Hausdorff');
  await panel.receive({ type: 'selectComponent', component: lemma.id });
  await panel.receive({ type: 'selectView', view: 'blueprint' });
  assert.equal(current.component, undefined);
  assert.equal(current.diagram.nodes.length, 4);
  assert.equal(new Set(current.diagram.nodes.map(node => node.y)).size, 2);
  assert.match(panel.webview.html, /id="atlas-view-blueprint" aria-pressed="true"/);

  const proof = current.diagram.nodes.find(node => node.entryId === lemma.id && node.part === 'proof');
  await panel.receive({ type: 'selectNode', node: proof.id });
  assert.equal(current.diagram.selected, proof.id);
  assert.match(panel.webview.html, /data-part="proof"/);
  assert.match(panel.webview.html, /<math\b/);
  assert.deepEqual(await fs.readFile(file), original);
  assert.deepEqual(h.errors, []);
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

test('a numbered equation link opens retained text from a 0.23.61 atlas without changing its bytes', async t => {
  const h = await harness(t);
  const text = String.raw`\newtheorem{theorem}{Theorem}
\begin{equation}\label{eq:target}x=x\end{equation}
\begin{theorem}\label{thm:result}By \eqref{eq:target}, the claim follows.\end{theorem}
`;
  const extraction = extractAtlasText(text, 'latex');
  const equation = extraction.entries.find(entry => entry.label === 'eq:target');
  const theorem = extraction.entries.find(entry => entry.label === 'thm:result');
  for (const entry of extraction.entries) delete entry.labelNumbers;
  delete equation.printedNumber;
  delete equation.printedTitle;
  const record = { ...createAtlas({ source: {
    title: 'Prior capture', uri: 'file:///capture.tex', text, language: 'latex', revision: digest(text),
  }, extraction }), id: randomUUID() };
  const file = path.join(h.root, 'prior.mrw-atlas.json');
  await fs.writeFile(file, JSON.stringify(record));
  const original = await fs.readFile(file);
  const document = await h.custom.provider.openCustomDocument(h.uri(file), {}, {});
  const panel = h.panel();
  await h.custom.provider.resolveCustomEditor(document, panel, {});
  await panel.receive({ type: 'selectComponent', component: theorem.id });
  const [, type, entry, part] = /<a class="atlas-inline-reference"[^>]+data-type="([^"]+)" data-entry="([^"]+)" data-part="([^"]+)">\(1\)<\/a>/
    .exec(panel.webview.html);
  await panel.receive({ type, entry, part });
  const [, exactDocument, options] = h.calls.findLast(call => call[0] === 'showTextDocument');
  assert.equal(exactDocument.uri.scheme, 'mrw-atlas-source');
  assert.equal(exactDocument.getText().slice(
    exactDocument.offsetAt(options.selection.start), exactDocument.offsetAt(options.selection.end)),
  String.raw`\begin{equation}\label{eq:target}x=x\end{equation}`);
  assert.deepEqual(await fs.readFile(file), original);
  assert.deepEqual(h.errors, []);
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

test('regenerating an unchanged LaTeX atlas keeps deliberate front matter and uses fresh printed labels', async t => {
  const h = await harness(t);
  h.api.window.visibleTextEditors = [];
  const file = path.join(h.root, 'article.tex');
  const auxiliary = path.join(h.root, 'article.aux');
  const text = String.raw`\newtheorem{theorem}{Theorem}
\begin{document}
\maketitle
\begin{abstract}
A summary meant for the title page.
\end{abstract}

\section{Results}
\begin{theorem}\label{thm:result}
A retained statement.
\end{theorem}
\end{document}`;
  const source = { title: 'Article', uri: h.uri(file).toString(), text, language: 'latex', revision: digest(text) };
  await fs.writeFile(file, text);
  await fs.writeFile(auxiliary, String.raw`\newlabel{thm:result}{{17}{1}}`);
  await fs.utimes(file, 1000, 1000);
  await fs.utimes(auxiliary, 1100, 1100);

  for (const explicit of [false, true]) {
    const selection = explicit ? { start: 0, end: text.length } : undefined;
    const record = { ...createAtlas({ source, extraction: extractAtlasText(text, 'latex', selection) }),
      id: randomUUID() };
    const savedFile = path.join(h.root, (explicit ? 'selected' : 'implicit') + '.mrw-atlas.json');
    const original = JSON.stringify(record);
    await fs.writeFile(savedFile, original);
    const saved = await h.custom.provider.openCustomDocument(h.uri(savedFile), {}, {});
    const panel = h.panel();
    await h.custom.provider.resolveCustomEditor(saved, panel, {});
    await panel.receive({ type: 'regenerate' });
    const successor = h.panels.at(-1);
    assert.ok(successor);
    await successor.receive({ type: 'selectView', view: 'list' });
    assert.match(successor.webview.html, />Theorem 17<\/button>/);
    assert.equal(successor.webview.html.includes('>Abstract</button>'), explicit);
    assert.equal(await fs.readFile(savedFile, 'utf8'), original);
  }
  assert.deepEqual(h.errors, []);
});

test('atlas comparison hands off the selected pinned statement and leaves the atlas untouched', async t => {
  const captured = [];
  const h = await harness(t, { compareWithLean: async input => captured.push(input) });
  const file = path.join(h.root, 'sample.mrw-atlas.json');
  const text = String.raw`\newtheorem{theorem}{Theorem}
\begin{theorem}The retained statement.\end{theorem}
\begin{proof}A separate proof.\end{proof}
`;
  const record = { ...createAtlas({
    source: { title: 'Paper', uri: 'file:///paper.tex', language: 'latex', text, revision: digest(text) },
    extraction: extractAtlasText(text, 'latex'),
  }), id: randomUUID() };
  const original = JSON.stringify(record);
  await fs.writeFile(file, original);
  const document = await h.custom.provider.openCustomDocument(h.uri(file), {}, {});
  const panel = h.panel();
  await h.custom.provider.resolveCustomEditor(document, panel, {});
  const theorem = record.extraction.entries.find(entry => entry.kind === 'theorem');
  await panel.receive({type: 'selectComponent', component: theorem.id});
  assert.match(panel.webview.html, /Compare with Lean declaration…/);
  await panel.receive({type: 'compareLean', component: theorem.id, entry: theorem.id,
    source: {text: 'Message data cannot replace the retained statement.'}});
  assert.equal(captured.length, 1);
  const {root, source} = captured[0];
  assert.equal(root, h.root);
  assert.equal(source.text, record.source.text);
  assert.equal(source.revision, record.source.revision);
  assert.equal(source.start, theorem.statement.start);
  assert.equal(source.end, theorem.statement.end);
  assert.equal(await fs.readFile(file, 'utf8'), original);
  assert.deepEqual(h.errors, []);
});
