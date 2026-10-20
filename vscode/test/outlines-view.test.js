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

function reader() {
  class Node {
    constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.listeners = {}; this.textContent = ''; }
    append(node) { this.children.push(node); }
    replaceChildren() { this.children = []; }
    addEventListener(type, callback) { this.listeners[type] = callback; }
    all() { return this.children.flatMap(n => [n, ...n.all()]); }
    querySelectorAll(tag) { return this.all().filter(n => tag.split(',').includes(n.tag)); }
    querySelector() { return this.all().find(n => n.dataset.reference); }
    scrollIntoView() {}
    text() { return this.textContent + this.children.map(n => n.text()).join(' '); }
  }
  const root = new Node('main'), messages = [];
  let receive;
  const globals = { document: { getElementById: () => root, createElement: tag => new Node(tag) },
    FormData: class { constructor(node) { this.values = node.all().filter(n => n.name).map(n => [n.name,n.value]); } *[Symbol.iterator]() { yield* this.values; } },
    acquireVsCodeApi: () => ({ postMessage: value => messages.push(value) }),
    addEventListener: (type, callback) => { receive = callback; } };
  globals.window = globals;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/outlineView.js'), 'utf8'), globals);
  return { root, messages, send: data => receive({data}),
    scopes: () => root.all().filter(n => n.dataset.linkScope),
    button: (node, action) => node.all().find(n => n.dataset.action === action) };
}
function readingModel() {
  const span = (start, end) => ({source_revision:'revision', start_line:start, start_col:0, end_line:end, end_col:3});
  const old = span(1, 2), current = span(3, 4);
  const region = (id, range) => ({id, title:id, level:'argument', span:range, annotations:[], collapsed:true});
  return { type:'outline', model:{outline:{source:{bibliography:{}, path:'/fixture.txt', revision:'revision'},
    annotations:[], contexts:[], artifacts:[], regions:[region('changed',current), region('other',old)]}, source_status:'unchanged'},
  reference:{uri:'earlier', status:'changed or removed', notice:'Earlier retained range, lines 1–2'},
  notes:[{id:'a',reference:'whole',label:'Saved outline note α'}, {id:'b',reference:'earlier',label:'Saved earlier note'},
    {id:'c',reference:'current',label:'Saved passage note <literal>'}],
  noteTargets:{whole:{region:null,span:null},earlier:{region:'changed',span:old},current:{region:'other',span:old}} };
}

test('reader distinguishes whole, current and earlier pinned targets and displays only their saved labels', () => {
  const h = reader(); h.send(readingModel());
  const [whole, pinned, changed, current] = h.scopes();
  assert.deepEqual(h.scopes().map(n => n.dataset.linkScope), ['outline','pinned','passage','passage']);
  assert.match(whole.text(), /Saved outline note α/); assert.doesNotMatch(whole.text(), /Saved earlier note/);
  assert.match(pinned.text(), /Earlier linked passage/); assert.match(pinned.text(), /Saved earlier note/);
  assert.match(changed.text(), /No Obsidian note linked to this passage yet/);
  assert.equal(h.button(changed,'open-note').disabled, true);
  h.send({type:'idle'}); assert.equal(h.button(changed,'open-note').disabled, true);
  assert.equal(h.button(changed,'associate-note').disabled, false);
  assert.match(current.text(), /Saved passage note <literal>/);
  assert.equal(h.button(current,'open-note').textContent, 'Open linked note in Obsidian');
  assert.equal(h.root.all().some(n => n.tag === 'img'), false);
  h.button(pinned,'open-note').listeners.click();
  assert.equal(JSON.stringify(h.messages.at(-1)), JSON.stringify({type:'open_note',region:null,pinned:true}));
});

test('copy and return-note actions explain opposite directions and preserve explicit action payloads', () => {
  const h = reader(), value = readingModel();
  value.notes.push({id:'d',reference:'current',label:'Second linked note'});
  h.send(value);
  const [whole,,changed,current] = h.scopes();
  assert.equal(h.button(whole,'copy-link').textContent, 'Copy link to this outline');
  assert.equal(h.button(current,'copy-link').textContent, 'Copy link to this passage');
  assert.match(current.text(), /2 linked notes — choose when opening/);
  assert.match(h.button(whole,'copy-link').title, /paste into an Obsidian note.*does not set a return note/);
  assert.match(h.button(whole,'associate-note').title, /return destination from MRW/);
  h.button(whole,'copy-link').listeners.click();
  assert.equal(h.messages.filter(m => m.type === 'associate_note').length, 0);
  assert.equal(JSON.stringify(h.messages.at(-1)), JSON.stringify({type:'copy_link',region:null,pinned:false}));
  h.send({type:'idle'});
  h.button(changed,'associate-note').listeners.click();
  assert.equal(JSON.stringify(h.messages.at(-1)), JSON.stringify({type:'associate_note',region:'changed',pinned:false}));
});

test('storage handshake freezes controls and preserves unsaved annotation text across rebind', () => {
  const h = reader(); h.send(readingModel());
  const form = h.root.all().find(n => n.tag === 'form' && n.dataset.draft.startsWith('note:'));
  const text = form.all().find(n => n.tag === 'textarea'); text.value = 'Unsaved human α annotation';
  form.listeners.input();
  h.send({type:'storageCheck'});
  assert.equal(h.messages.at(-1).type, 'storageStatus'); assert.equal(h.messages.at(-1).dirty, true);
  assert.ok(h.root.all().filter(n => ['button','input','textarea','select'].includes(n.tag)).every(n => n.disabled));
  h.send({type:'storageRelease'}); h.send(readingModel());
  assert.ok(h.root.all().some(n => n.tag === 'textarea' && n.value === 'Unsaved human α annotation'));
  assert.equal(h.root.all().find(n => n.tag === 'textarea').disabled, false);
});
