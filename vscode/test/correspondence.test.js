'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { digest } = require('../src/navigation');
const { registerCorrespondence, reportScope, sourcePacket } = require('../src/correspondence');
const { aspects, renderCorrespondence, correspondenceShell } = require('../src/correspondenceView');

const manuscript = [
  '## Theorem 1',
  '',
  'For $x$, a statement with <script>inert content</script>.',
  '',
  '## Theorem 2',
  '',
  'Another statement.',
].join('\n');
const source = { title: 'Sample manuscript', label: 'Theorem 1', uri: 'file:///tmp/manuscript.md',
  revision: digest(manuscript), text: manuscript, language: 'markdown', start: 0, end: manuscript.indexOf('## Theorem 2') };
const facts = {
  version: 1, project: '/tmp', module: 'Sample', declaration: 'Sample.theoremOne',
  declaration_type: { default: '∀ x, x = x', explicit: '∀ (x : Nat), @Eq Nat x x' },
  signature_hypotheses: [{ name: 'x', kind: 'explicit', type: 'Nat' }],
  axiom_dependencies: [],
  direct_dependencies: [{ name: 'Nat', kind: 'inductive', module: 'Init', source_location: null }],
  source_location: null,
  derived_from: { commit: 'a'.repeat(40), manifest_digest: 'b'.repeat(64), toolchain: 'leanprover/lean4:v4.35.0', inputs: [] },
};
const judgments = Object.fromEntries(Object.keys(aspects).map(key => [key, { verdict: 'matches', reason: 'First review reason' }]));
const review = { revision: 'c'.repeat(64), id: 'saved-review', source, facts, aspects: judgments,
  reviewer: 'First reviewer', kind: 'formalizes', status: { manuscript: 'current', lean: 'current' }, readings: [] };
const blindSource = { ...source, text: undefined, passage: source.text.slice(source.start, source.end) };
const selection = { module: facts.module, declaration: facts.declaration };
const fields = Object.assign({ reviewer: 'Review author' }, ...Object.keys(aspects)
  .map(aspect => ({ [aspect + '-verdict']: 'matches', [aspect + '-reason']: 'Reviewed exact text' })));

function harness() {
  const panels = [], requests = [], picks = [], questions = [], shown = [], artifactClients = [], commands = new Map();
  let saved = review, resolveCollected = () => facts, warnings = [];
  const scope = { source_uri: source.uri, source_revision: source.revision, lean_project: facts.project,
    lean_commit: facts.derived_from.commit };
  const report = { id: 'report-id', revision: 'd'.repeat(64), state: 'active', scope,
    rows: [{ title: 'Theorem 1', start: source.start, end: source.end, source_revision: source.revision, lean_commit: facts.derived_from.commit,
      review: { ...review, declaration: facts.declaration, axioms: [], discrepancies: [], second_readings: [] } }] };
  let reading = { id: 'second-reader', revision: 'blind', stage: 'blind', source: blindSource };
  function service(request) {
    const { method } = request;
    if (method === 'correspondence_collect') return resolveCollected();
    if (method === 'correspondence_review') return saved;
    if (method === 'correspondence_refresh') return { kind: 'signature_changed', review: saved.revision, facts: request.facts };
    if (method === 'correspondence_list') return { reviews: [saved], reports: [report] };
    if (method === 'correspondence_save') {
      saved = { ...saved, source: request.source, facts: request.facts, aspects: request.aspects, reviewer: request.reviewer };
      return saved;
    }
    if (method === 'correspondence_report_read') return report;
    if (method === 'correspondence_report_build') return { ...report, id: null, scope: request.scope };
    if (method === 'correspondence_report_save') return { ...report, scope: request.scope };
    if (method === 'correspondence_report_export') return { path: request.destination };
    if (method === 'correspondence_report_trash') return { ...report, state: 'trash', revision: 'e'.repeat(64) };
    if (method === 'correspondence_report_restore') return report;
    if (method === 'correspondence_report_delete') return { id: report.id, state: 'deleted' };
    if (method === 'correspondence_reconstruction_begin') return reading;
    if (method === 'correspondence_reconstruction_save') {
      reading = { ...reading, stage: 'saved', revision: 'saved', reconstruction: request.reconstruction };
      return reading;
    }
    if (method === 'correspondence_reconstruction_reveal') {
      reading = reading.stage === 'saved'
        ? { ...reading, stage: 'facts', revision: 'facts', facts }
        : { ...reading, stage: 'revealed', revision: 'revealed', review };
      return reading;
    }
    if (method === 'correspondence_reconstruction_reconcile') {
      reading = { ...reading, stage: 'reconciled', reconciliation: request.reconciliation };
      return reading;
    }
    throw Error('Unexpected request ' + method);
  }
  const call = async (request, options) => { requests.push({ ...request, options }); return service(request); };
  const disposable = { dispose() {} };
  const file = fsPath => ({ scheme: 'file', fsPath, toString: () => 'file://' + fsPath });
  const vscode = { ViewColumn: { Active: 1, One: 1 }, ProgressLocation: { Notification: 1 }, Uri: { file },
    workspace: { textDocuments: [] }, window: {
      async showOpenDialog() { return [file(facts.project)]; },
      async showSaveDialog() { return file('/tmp/ordinary-report.md'); },
      async showWarningMessage(_prompt, options, button) {
        warnings.push(options.detail);
        return button;
      },
      async showQuickPick(items, options) {
        questions.push({ labels: items.map(item => typeof item === 'string' ? item : item.label), options });
        return picks.shift()?.(items);
      },
      async showInformationMessage() {},
      async withProgress(options, action) {
        assert.equal(options.cancellable, true);
        return action({}, { onCancellationRequested: () => disposable });
      },
      createWebviewPanel() {
        const messages = [];
        let dispose, receive;
        const panel = {
          messages, dirty: false, webview: { onDidReceiveMessage(action) { receive = action; return disposable; },
            async postMessage(message) {
              messages.push(message);
              if (message.type === 'storage-check') queueMicrotask(() =>
                receive({ type: 'storage-status', token: message.token, dirty: panel.dirty }));
            } },
          onDidDispose(action) { dispose = action; return disposable; },
          onDidChangeViewState() { return disposable; },
          dispose() { dispose?.(); },
          act(type, input = {}) { return receive({ type, generation: messages.at(-1).generation, ...input }); },
        };
        panels.push(panel);
        return panel;
      },
    },
  };
  const context = { subscriptions: [], storageUri: file('/tmp/mrw-correspondence-tests') };
  const controller = registerCorrespondence({ vscode, context, register: (id, fn) => commands.set(id, fn),
    bridge: call, rawBridge: call, projectRoot: async () => '/tmp/mrw-project', artifactClients, show: text => shown.push(text) });
  return { controller, panels, requests, picks, questions, commands, vscode, warnings, artifactClients, shown,
    methods: () => requests.map(request => request.method),
    view: () => panels.at(-1), collect(action) { resolveCollected = action; } };
}

test('comparison opens only a pinned passage, reads Lean on explicit action and retains field reasons', async () => {
  const h = harness();
  await h.controller.begin({ root: '/tmp/mrw-project', source });
  const panel = h.view();
  assert.deepEqual(h.methods(), []);
  const original = panel.messages.at(-1).html;
  assert.match(original, /Read Lean declaration/);
  assert.match(original, /<math/);
  assert.match(original, /&lt;script&gt;inert content/);
  assert.doesNotMatch(original, /Another statement|<script>/);
  await panel.act('choose-project', { fields: selection });
  await panel.act('read', { fields: selection, generation: 0 });
  assert.deepEqual(h.methods(), []);
  await panel.act('read', { fields: selection });
  assert.deepEqual(h.methods(), ['correspondence_collect']);
  assert.ok(h.requests[0].options.signal);
  assert.match(panel.messages.at(-1).html, /Explicit type and universes/);
  await panel.act('save', { fields, facts: { untrusted: true } });
  const saved = h.requests.at(-1);
  assert.equal(saved.method, 'correspondence_save');
  assert.deepEqual(saved.source, source);
  assert.deepEqual(saved.facts, facts);
  assert.equal(saved.aspects.quantifiers.reason, 'Reviewed exact text');
  assert.match(panel.messages.at(-1).html, /Saved review/);
});

test('opening offline reports source drift and explicit reread leaves the older judgment accessible', async () => {
  const h = harness();
  h.vscode.workspace.textDocuments = [{ uri: { toString: () => source.uri }, getText: () => 'Later dirty text' }];
  h.picks.push(items => items[0], () => 'Open review');
  await h.commands.get('mrw.correspondenceReview')();
  const panel = h.view();
  assert.deepEqual(h.methods(), ['correspondence_list', 'correspondence_review']);
  assert.match(panel.messages.at(-1).html, /Manuscript<\/strong> · The current revision differs/);
  h.collect(() => ({ ...facts, declaration_type: { default: 'True', explicit: 'True' } }));
  await panel.act('read', { fields: selection });
  assert.deepEqual(h.methods().slice(-2), ['correspondence_collect', 'correspondence_refresh']);
  assert.match(panel.messages.at(-1).html, /Open earlier evidence/);
  assert.doesNotMatch(panel.messages.at(-1).html, /First review reason/);
  await panel.act('show-saved');
  assert.match(h.view().messages.at(-1).html, /First review reason/);
});

test('blind panel contains no Lean facts or first judgment until staged reveal', async () => {
  const h = harness();
  h.picks.push(items => items[0], () => 'Second reading');
  await h.controller.openReviews({ uri: source.uri });
  const panel = h.view();
  assert.match(panel.messages.at(-1).html, /Save reconstruction/);
  assert.doesNotMatch(panel.messages.at(-1).html, /Sample\.theoremOne|First review reason|Another statement|Reveal Lean evidence/);
  await panel.act('reveal');
  assert.equal(h.methods().includes('correspondence_reconstruction_reveal'), false);
  await panel.act('save-reconstruction', { fields: { reviewer: 'Separate reader',
    ...Object.fromEntries(Object.keys(aspects).map(key => [key, 'Manuscript reconstruction'])) } });
  assert.match(panel.messages.at(-1).html, /Reveal Lean evidence/);
  assert.doesNotMatch(panel.messages.at(-1).html, /Sample\.theoremOne|First review reason/);
  await panel.act('reveal');
  assert.match(panel.messages.at(-1).html, /Sample\.theoremOne/);
  assert.doesNotMatch(panel.messages.at(-1).html, /First review reason/);
  await panel.act('reveal');
  assert.match(panel.messages.at(-1).html, /First review reason/);
  await panel.act('reconcile', { fields: { 'hypotheses-resolution': 'open', 'hypotheses-reason': 'Instance unresolved' } });
  assert.match(panel.messages.at(-1).html, /Instance unresolved/);
  assert.equal(h.methods().includes('correspondence_collect'), false);
});

test('report preserves a saved revision pair through export, Trash, Restore and permanent deletion', async () => {
  const h = harness();
  h.picks.push(items => items[0], () => 'Build report');
  await h.controller.openReviews();
  const panel = h.view(), prepared = h.requests.at(-1);
  assert.equal(prepared.method, 'correspondence_report_build');
  assert.deepEqual(prepared.scope.results.map(entry => entry.title), ['Theorem 1', 'Theorem 2']);
  assert.match(panel.messages.at(-1).html, /data-filter="missing-second"/);
  await panel.act('report-passage', { value: '0' });
  assert.deepEqual(h.shown, [source.text.slice(source.start, source.end)]);
  await panel.act('save-report');
  await panel.act('export-report');
  assert.equal(h.requests.at(-1).destination, '/tmp/ordinary-report.md');
  await panel.act('trash-report');
  assert.match(panel.messages.at(-1).html, /Restore report/);
  await panel.act('restore-report');
  assert.match(panel.messages.at(-1).html, /Delete report…/);
  await panel.act('trash-report');
  await panel.act('delete-report');
  assert.match(panel.messages.at(-1).html, /Report permanently deleted/);
  assert.deepEqual(h.methods().slice(-6), ['correspondence_report_save', 'correspondence_report_export',
    'correspondence_report_trash', 'correspondence_report_restore', 'correspondence_report_trash', 'correspondence_report_delete']);
  assert.equal(h.warnings.length, 3);
  assert.equal(h.methods().includes('correspondence_collect'), false);
});

test('rendering a missing review and second-reading status uses the report row evidence', () => {
  const scope = reportScope(review);
  const html = renderCorrespondence({ mode: 'report', report: { scope, rows: [
    { title: 'Unreviewed passage', source_revision: source.revision, lean_commit: facts.derived_from.commit },
    { title: 'Changed passage', source_revision: source.revision, lean_commit: facts.derived_from.commit, review: {
      ...review, declaration: facts.declaration, status: { manuscript: 'changed', lean: 'current' },
      second_readings: [{ stage: 'reconciled', saved_before_reveal: true, reconciled: true }],
      discrepancies: [{ kind: 'signature_changed' }], axioms: ['sorryAx'],
    } },
  ] } });
  assert.match(html, /Unreviewed passage[\s\S]+Awaiting review/);
  assert.match(html, /data-report-row="stale open"/);
  assert.match(html, /Reconstruction saved before reveal · reconciled/);
  assert.match(html, /sorryAx/);
  const shell = correspondenceShell();
  assert.match(shell, /default-src 'none'/);
  assert.doesNotThrow(() => new Function(shell.match(/<script nonce="[^"]+">([\s\S]*?)<\/script>/)[1]));
});

test('closing a busy review cancels its read and retains the move guard until it settles', async () => {
  const h = harness();
  await h.controller.begin({ root: '/tmp/mrw-project', source });
  const panel = h.view();
  await panel.act('choose-project', { fields: selection });
  let finish;
  h.collect(() => new Promise(resolve => { finish = resolve; }));
  const pending = panel.act('read', { fields: selection });
  assert.equal(h.requests.at(-1).method, 'correspondence_collect');
  await assert.rejects(h.artifactClients[0].freeze(), /Finish or cancel/);
  panel.dispose();
  assert.equal(h.requests.at(-1).options.signal.aborted, true);
  await assert.rejects(h.artifactClients[0].freeze(), /Finish or cancel/);
  finish(facts);
  await pending;
  await h.artifactClients[0].freeze();
  await h.artifactClients[0].release();
  assert.equal(h.methods().includes('correspondence_save'), false);
});

test('workspace switching checks review drafts and preserves them on refusal', async () => {
  const h = harness();
  await h.controller.begin({ root: '/tmp/mrw-project', source });
  const panel = h.view();
  panel.dirty = true;
  await assert.rejects(h.artifactClients[0].freeze(), /Save the correspondence draft/);
  assert.equal(panel.messages.at(-1).busy, false);
  await h.artifactClients[0].freeze(true);
  await h.artifactClients[0].release();
  assert.ok(panel.dirty);
  await panel.act('choose-project', { fields: selection });
  assert.match(panel.messages.at(-1).html, /class="path">\/tmp<\/p>/);
  assert.throws(() => sourcePacket({ ...source, uri: 'untitled:Manuscript' }), /Save the manuscript/);
});

test('reading a different Lean declaration cannot replace an unsaved review draft', async () => {
  const h = harness();
  await h.controller.begin({ root: '/tmp/mrw-project', source });
  const panel = h.view();
  await panel.act('choose-project', { fields: selection });
  await panel.act('read', { fields: selection });
  panel.dirty = true;
  await panel.act('read', { fields: { ...selection, declaration: 'Another.Result' } });
  assert.equal(h.methods().filter(method => method === 'correspondence_collect').length, 1);
  assert.match(panel.messages.at(-1).html, /Save or discard the review draft/);
  await panel.act('discard-review-draft');
  assert.deepEqual(panel.messages.at(-1).clear, ['review-new']);
  assert.equal(h.methods().includes('correspondence_save'), false);
});

test('a retained source provides the exact manuscript for an atlas correspondence review', async () => {
  const h = harness();
  const uri = 'mrw-outline:v1/' + 'a'.repeat(64) + '/00000000-0000-4000-8000-000000000000/' + source.revision;
  const retained = { ...source, uri };
  assert.equal(sourcePacket(retained).uri, uri);
  await h.controller.begin({ root: '/tmp/mrw-project', source: retained });
  assert.match(h.view().messages.at(-1).html, /Triangle/);
  assert.deepEqual(h.methods(), []);
});
