'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const katex = require('../media/katex/katex.min.js');

// Exercise the actual bundled delimiter parser and KaTeX with a small DOM;
// generated MathML is checked as bytes, not imitated by a renderer double.
function view() {
  class Node {
    constructor(name, text) {
      this.nodeName = name; this.nodeType = name === '#text' ? 3 : name === '#fragment' ? 11 : 1;
      this.childNodes = []; this.className = ''; this.data = text || '';
    }
    get nextSibling() { return this.parent?.childNodes[this.parent.childNodes.indexOf(this) + 1]; }
    get textContent() { return this.nodeType === 3 ? this.data : this.childNodes.map(n => n.textContent).join(''); }
    set textContent(text) { this.childNodes = []; if (text) this.append(new Node('#text', text)); }
    append(...nodes) { for (const n of nodes) { n.parent = this; this.childNodes.push(n); } }
    appendChild(n) { if (n.nodeType === 11) this.append(...n.childNodes); else this.append(n); }
    replaceChild(n, old) {
      const nodes = n.nodeType === 11 ? n.childNodes : [n];
      for (const child of nodes) child.parent = this;
      this.childNodes.splice(this.childNodes.indexOf(old), 1, ...nodes);
    }
    remove() { this.parent.childNodes.splice(this.parent.childNodes.indexOf(this), 1); }
    all() { return this.childNodes.flatMap(n => [n, ...n.all()]); }
  }
  const calls = [], globals = {
    document: { createElement: name => new Node(name), createTextNode: text => new Node('#text', text),
      createDocumentFragment: () => new Node('#fragment') },
    Node: { TEXT_NODE: 3 },
    katex: { ParseError: katex.ParseError, render(text, node, options) {
      calls.push({ text, ...options }); node.mathml = katex.renderToString(text, options);
    } },
  };
  globals.window = globals;
  for (const name of ['media/katex/auto-render.min.js', 'src/annotationView.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', name), 'utf8'), globals);
  }
  const root = new Node('section');
  return { root, calls, globals, render: text => globals.MRWAnnotations.render(root, text),
    math: () => root.all().filter(n => n.mathml), raw: () => root.all().find(n => n.nodeName === 'pre') };
}

test('reader annotations render explicit inline and display TeX while keeping exact input', () => {
  const h = view(), text = 'Unicode Δ. Let \\(f\\colon X\\to Y\\).\n\\[s(Y)=G^{-1}(\\Delta).\\]\nAlso $$X\\times X$$';
  h.render(text);
  assert.equal(h.math().length, 3);
  assert.deepEqual(h.calls.map(c => c.displayMode), [false, true, true]);
  assert.equal(h.raw().textContent, text);
  for (const node of h.math()) assert.match(node.mathml, /<math /);
  for (const call of h.calls) {
    assert.equal(call.output, 'mathml'); assert.equal(call.trust, false);
    assert.equal(call.strict, 'error'); assert.equal(call.maxExpand, 1000); assert.equal(call.maxSize, 20);
  }
});

test('plain Unicode, currency, HTML, Markdown links and unmatched delimiters remain literal', () => {
  for (const text of ['x = s(f(x)); Δ ⊆ X × X. $5 and $10.', '<img src=x onerror=bad> [link](command:bad)', 'Incomplete \\(x']) {
    const h = view(); h.render(text);
    assert.equal(h.math().length, 0); assert.equal(h.calls.length, 0);
    const display = h.root.childNodes[0]; assert.equal(display.textContent, text);
    assert.equal(h.root.all().some(n => ['img','a','script'].includes(n.nodeName)), false);
  }
});

test('malformed math keeps exact TeX and later valid equations still render', () => {
  const h = view(), text = 'Bad \\(\\notACommand{x}\\), good \\(x^2\\).'; h.render(text);
  assert.equal(h.math().length, 1); assert.equal(h.raw().textContent, text);
  assert.match(h.root.childNodes[0].textContent, /\\notACommand/);
  assert.ok(h.root.all().some(n => n.className === 'warning'));
});

test('annotation equations cannot create resource links or leak macro definitions', () => {
  const h = view();
  h.render('\\(\\gdef\\changed{x}\\changed\\) then \\(\\changed\\) then \\(\\href{https://example.org}{x}\\)');
  assert.equal(h.math().length, 2);
  assert.doesNotMatch(h.math().map(n => n.mathml).join(''), /href=|<a |<img|<script/);
  assert.ok(h.root.all().some(n => n.className === 'warning'), 'second expression cannot reuse a global definition');
});

test('missing renderer preserves the complete annotation and reports the fallback', () => {
  const h = view(), text = 'Retain \\(X\\).'; h.globals.renderMathInElement = undefined; h.render(text);
  assert.equal(h.root.childNodes[0].textContent, text); assert.equal(h.raw().textContent, text);
  assert.ok(h.root.all().some(n => n.className === 'warning'));
});
