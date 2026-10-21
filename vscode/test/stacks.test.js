'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const katex = require('../media/katex/katex.min.js');
const { outlineHtml } = require('../src/outlines');
const settings = { output: 'mathml', trust: false, strict: 'error', throwOnError: true,
  maxExpand: 1000, maxSize: 20, macros: {}, globalGroup: false };

test('all mathematics in the actual section fixture renders to local MathML', () => {
  const source = fs.readFileSync(path.join(__dirname, '../../tests/fixtures/stacks/topology.tex'), 'utf8');
  const section = source.slice(source.indexOf('\\section{Hausdorff spaces}'), source.indexOf('\\section{Separated maps}'));
  const expressions = [...section.matchAll(/(?<!\\)\$([^$]+)\$/gs)].map(m => m[1]);
  assert.ok(expressions.length > 40);
  for (const text of expressions) {
    const result = katex.renderToString(text, { ...settings, macros: {} });
    assert.match(result, /<math /);
    assert.doesNotMatch(result, /<img|<script|style=|href=/);
  }
});

test('renderer refuses external resources and independent expressions do not share macros', () => {
  assert.doesNotMatch(katex.renderToString('\\href{javascript:bad}{x}', { ...settings, macros: {} }), /href=|<a /);
  const first = katex.renderToString('\\gdef\\changed{x}\\changed', { ...settings, macros: {} });
  assert.match(first, /<math /);
  assert.throws(() => katex.renderToString('\\changed', { ...settings, macros: {} }), /Undefined control sequence/);
});

test('bundled math code stays under the existing nonce policy without network/fonts', () => {
  const support = ['media/katex/katex.min.js', 'src/stacksView.js'].map(n =>
    fs.readFileSync(path.join(__dirname, '..', n), 'utf8'));
  const html = outlineHtml('const inert = "</script>";', support);
  assert.match(html, /default-src 'none'/);
  assert.equal((html.match(/<\/script>/g) || []).length, 1);
  assert.doesNotMatch(html, /<script[^>]*src=|<link |unsafe-inline|unsafe-eval/);
});

test('published prose remains inert and retained/external references have distinct actions', () => {
  class Node {
    constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.listeners = {}; }
    append(n) { this.children.push(n); }
    addEventListener(type, fn) { this.listeners[type] = fn; }
    all() { return this.children.flatMap(n => [n, ...n.all()]); }
  }
  const actions = [], mathCalls = [], globals = {
    document: { createElement: tag => new Node(tag) },
    katex: { render(text, node, options) { mathCalls.push(options); node.innerHTML = katex.renderToString(text, options); } },
  };
  globals.window = globals;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/stacksView.js'), 'utf8'), globals);
  const parent = new Node('section');
  globals.MRWStacks.part(parent, { region: 'fixture', exact_text: 'Exact retained source',
    tokens: [{ kind: 'text', text: '<img src=x onerror=bad>' }, { kind: 'math', text: 'X \\times_Z Y', display: false },
      { kind: 'reference', tag: '08ZE', label: 'lemma', retained: true },
      { kind: 'reference', tag: '004E', label: 'section', retained: false }] },
  (...args) => actions.push(args));
  assert.equal(parent.all().some(n => n.tag === 'img'), false);
  assert.ok(parent.all().some(n => n.textContent === '<img src=x onerror=bad>'));
  assert.equal(mathCalls[0].trust, false); assert.equal(mathCalls[0].output, 'mathml');
  const buttons = parent.all().filter(n => n.tag === 'button');
  for (const button of buttons) button.listeners.click();
  assert.deepEqual(actions.map(v => [...v]), [['stacks_reference', '08ZE'], ['stacks_citation', '004E']]);
});
