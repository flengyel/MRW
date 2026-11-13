'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {session, guardWindow} = require('../src/workspaceMoveHost');

test('read-only extension context permits wrapped state without replacing native properties', async () => {
  const values = new Map();
  const native = Object.freeze({
    workspaceState: Object.freeze({keys: () => [...values.keys()], get: (k, d) => values.get(k) ?? d,
      update: async (k, v) => { values.set(k, v); }}),
    storageUri: Object.freeze({fsPath: '/private'}), subscriptions: [],
    asAbsolutePath(file) { assert.equal(this, native); return '/extension/' + file; },
  });
  const owner = session({workspace: {}}, native);
  await owner.ready;
  assert.notEqual(owner.context.workspaceState, native.workspaceState);
  await owner.context.workspaceState.update('draft', {text: 'Unfinished proof'});
  assert.deepEqual(owner.context.workspaceState.get('draft'), {text: 'Unfinished proof'});
  assert.equal(owner.context.storageUri, native.storageUri);
  assert.equal(owner.context.subscriptions, native.subscriptions);
  assert.equal(owner.context.asAbsolutePath('a.md'), '/extension/a.md');
});

test('read-only host window, provider and panel retain guarded callbacks and native setters', async () => {
  let callback, html = '', pending = 0, selectedProvider;
  const calls = [];
  const owner = {panels: new Set(), frozen: false,
    run: async fn => { pending++; try { return await fn(); } finally { pending--; } },
    guardEvent: fn => (...args) => fn(...args)};
  const webview = Object.freeze({
    onDidReceiveMessage(fn) { assert.equal(this, webview); callback = fn; },
    postMessage: async value => { calls.push(value); },
    get html() { return html; }, set html(value) { html = value; },
  });
  const panel = Object.freeze({webview, onDidDispose() {}, reveal() { assert.equal(this, panel); }});
  const window = Object.freeze({
    createWebviewPanel() { assert.equal(this, window); return panel; },
    registerTreeDataProvider(_id, provider) { assert.equal(this, window); selectedProvider = provider; },
  });
  const guarded = guardWindow(window, owner);
  guarded.registerTreeDataProvider('mrw.readingOutline', Object.freeze({getChildren() { return ['Heading']; }}));
  assert.deepEqual(await selectedProvider.getChildren(), ['Heading']);
  const opened = guarded.createWebviewPanel();
  opened.reveal();
  opened.webview.html = '<body><script nonce="test"></script></body>';
  assert.match(html, /workspace_freeze/);
  opened.webview.onDidReceiveMessage(async m => { assert.equal(pending, 1); calls.push(m); });
  await callback({type: 'reader_action'});
  assert.deepEqual(calls, [{type: 'reader_action'}]);
  owner.frozen = true;
  await callback({type: 'reader_action'});
  assert.equal(calls.length, 1);
});
