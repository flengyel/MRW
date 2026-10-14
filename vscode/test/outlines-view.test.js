'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { outlineHtml } = require('../src/outlines');

test('reader script loads alongside unforgeable browser globals and requests its saved model', () => {
  const messages = [], listeners = [];
  const globals = { document: { getElementById: () => ({}) },
    acquireVsCodeApi: () => ({ postMessage: value => messages.push(value) }) };
  globals.window = globals; globals.addEventListener = (...args) => listeners.push(args);
  const browserLocation = Object.freeze({ href: 'vscode-webview://test' });
  Object.defineProperty(globals, 'location', { value: browserLocation, configurable: false });
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/outlineView.js'), 'utf8'), globals);
  assert.equal(globals.location, browserLocation);
  assert.equal(messages.length, 1); assert.equal(messages[0].type, 'ready');
  assert.equal(listeners[0][0], 'message');
});

test('reader webview permits only nonce code with no external resource fetch or script escape', () => {
  const html = outlineHtml('const text = "</script><script>inert";');
  assert.match(html, /default-src 'none'/); assert.match(html, /base-uri 'none'; form-action 'none'/);
  const nonce = /script-src 'nonce-([^']+)'/.exec(html)[1];
  assert.ok(html.includes(`<script nonce="${nonce}">const text = "<\\/script><script>inert";`));
  assert.equal((html.match(/<\/script>/g) || []).length, 1);
  assert.ok(!html.includes('src='));
  assert.ok(!html.includes('unsafe-inline')); assert.ok(!html.includes('https:'));
});
