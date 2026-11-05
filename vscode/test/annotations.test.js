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
      this.childNodes = []; this.className = ''; this.data = text || ''; this.dataset = {}; this.listeners = {};
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
    addEventListener(name, action) { this.listeners[name] = action; }
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
  return { root, calls, globals, render: (text, options) => globals.MRWAnnotations.render(root, text, options),
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

test('TikZ and other fenced examples stay inert until the explicit diagram action', () => {
  const h=view(), actions=[],code='\\begin{tikzcd}A \\arrow[r] & B\\end{tikzcd}',raw='```tikz\n'+code+'\n```';
  const block={kind:'tikz',code,raw,key:'exact-code-hash',index:0,image:null};
  h.render(raw,{fragments:[{kind:'code',text:'```text\n\\(not math\\)\n```'},block],onRender:b=>actions.push(b)});
  assert.equal(h.calls.length,0);assert.equal(actions.length,0);assert.equal(h.math().length,0);
  assert.ok(h.root.all().some(n=>n.nodeName==='pre'&&n.textContent===code));
  h.root.all().find(n=>n.dataset.action==='render-diagram').listeners.click();
  assert.equal(actions.length,1);assert.equal(actions[0],block);
});

test('a retained diagram is an image with exact code and never triggers a render', () => {
  const h=view(), actions=[],image='data:image/svg+xml;base64,PHN2Zy8+';
  h.render('saved',{fragments:[{kind:'tikz',code:'exact TeX',raw:'fence',key:'hash',image,rendered_at:'now'}],onRender:b=>actions.push(b)});
  assert.equal(h.root.all().find(n=>n.nodeName==='img').src,image);assert.equal(actions.length,0);
  assert.equal(h.root.all().find(n=>n.dataset.action==='render-diagram').textContent,'Render diagram again');
});

test('dark diagram appearance chooses a derived image and changes only a UI preference', () => {
  const h=view(),preferences=[],image='data:image/svg+xml;base64,PHN2Zy8+',dark='data:image/svg+xml;base64,ZGFyaw==';
  const fragments=[{kind:'tikz',code:'exact source',key:'hash',image,dark_image:dark,rendered_at:'now'}];
  h.render('source',{fragments,appearance:'dark',onAppearance:value=>preferences.push(value)});
  assert.equal(h.root.all().find(n=>n.nodeName==='img').src,dark);
  assert.equal(h.root.all().find(n=>n.nodeName==='figure').dataset.appearance,'dark');
  const select=h.root.all().find(n=>n.dataset.action==='diagram-appearance');select.value='paper';select.listeners.change();
  assert.deepEqual(preferences,['paper']);assert.equal(fragments[0].image,image);
});

test('diagrams default to Theme with light and dark images and explicit overrides', () => {
  const h=view(),preferences=[],image='data:image/svg+xml;base64,PHN2Zy8+',dark='data:image/svg+xml;base64,ZGFyaw==';
  const block={kind:'tikz',code:'exact source',key:'hash',image,dark_image:dark,rendered_at:'now'};
  h.render('source',{fragments:[block],onAppearance:value=>preferences.push(value)});
  const figure=h.root.all().find(n=>n.nodeName==='figure'),images=figure.all().filter(n=>n.nodeName==='img');
  assert.equal(figure.dataset.appearance,'theme');assert.match(figure.className,/mrw-diagram-theme/);
  assert.equal(images.length,2);assert.equal(images[0].src,image);assert.equal(images[1].src,dark);
  assert.equal(images[0].className,'mrw-diagram-light');assert.equal(images[1].className,'mrw-diagram-dark');
  const choice=figure.all().find(n=>n.nodeName==='select');assert.equal(choice.value,'theme');
  assert.deepEqual(choice.all().filter(n=>n.nodeName==='option').map(n=>n.value),['theme','paper','dark']);
  choice.value='paper';choice.listeners.change();choice.value='theme';choice.listeners.change();
  assert.deepEqual(preferences,['paper','theme']);assert.equal(block.image,image);assert.equal(block.dark_image,dark);
});

test('Theme falls back to a readable paper image when a dark rendering is unavailable', () => {
  const h=view(),image='data:image/svg+xml;base64,PHN2Zy8+';
  h.render('source',{fragments:[{kind:'tikz',code:'saved code',key:'hash',image}],appearance:'theme'});
  const figure=h.root.all().find(n=>n.nodeName==='figure');assert.equal(figure.dataset.appearance,'paper');
  assert.doesNotMatch(figure.className,/mrw-diagram-theme/);
  assert.equal(figure.all().filter(n=>n.nodeName==='img').length,1);
});
