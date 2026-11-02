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

function reader(published = false) {
  const scrolled = [];
  class Node {
    constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.listeners = {}; this.textContent = ''; }
    append(node) { node.parent = this; this.children.push(node); }
    replaceChildren() { this.children = []; }
    addEventListener(type, callback) { this.listeners[type] = callback; }
    setAttribute(name, value) { this[name] = value; }
    all() { return this.children.flatMap(n => [n, ...n.all()]); }
    querySelectorAll(tag) { return this.all().filter(n => tag.split(',').includes(n.tag)); }
    querySelector() { return this.all().find(n => n.dataset.reference); }
    scrollIntoView() { scrolled.push(this); }
    text() { return this.textContent + this.children.map(n => n.text()).join(' '); }
  }
  const root = new Node('main'), messages = [];
  let receive;
  const globals = { document: { getElementById: () => root, createElement: tag => new Node(tag) },
    FormData: class { constructor(node) { this.values = node.all().filter(n => n.name).map(n => [n.name,n.value]); } *[Symbol.iterator]() { yield* this.values; } },
    acquireVsCodeApi: () => ({ postMessage: value => messages.push(value) }),
    addEventListener: (type, callback) => { receive = callback; } };
  globals.window = globals;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/annotationView.js'), 'utf8'), globals);
  if (published) vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/stacksView.js'), 'utf8'), globals);
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/outlineView.js'), 'utf8'), globals);
  return { root, messages, scrolled, send: data => receive({data}),
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

test('reader keeps all region forms outside the source flow and focuses the resolved card once', () => {
  const h = reader(), value = readingModel();
  value.model.outline.regions[1].collapsed = false;
  value.model.outline.regions[1].argument_text = 'Exact retained statement α.';
  value.readingFocus = { serial: 1, region: 'other' };
  h.send(value);
  const tools = h.root.all().find(n => n.className === 'reader-tools');
  assert.equal(tools.tag, 'details'); assert.ok(!tools.open);
  assert.ok(h.root.children.find(n => n.className === 'toolbar reading-bar'));
  const card = h.root.all().find(n => n.dataset.region === 'other');
  assert.ok(card.children.some(n => n.dataset.argument === 'other'));
  assert.equal(card.all().some(n => ['form','input','textarea','select'].includes(n.tag)), false);
  assert.ok(tools.all().some(n => n.className === 'passage-tools'));
  assert.equal(h.scrolled.at(-1), card);
  const count = h.scrolled.length;
  value.reference = null;
  h.send(value); assert.equal(h.scrolled.length, count, 'refresh does not steal focus from an annotation draft');
});

test('a retained publication error remains visible outside collapsed tools', () => {
  const h = reader(), value = readingModel();
  value.model.outline.published = { error: 'Retained acquisition unavailable' };
  h.send(value);
  assert.ok(h.root.children.some(n => n.className === 'warning' && n.textContent === 'Retained acquisition unavailable'));
});

function publishedModel() {
  const value = readingModel(), o = value.model.outline;
  value.reference = null;
  const span = line => ({ source_revision:'revision', start_line:line, start_col:0, end_line:line+1, end_col:3 });
  const region = (id, line, collapsed = false) => ({ id, title:id, level:id==='statement'?'concepts_results':'argument',
    span:span(line), annotations:[], collapsed, argument_text:collapsed?null:id+' exact text' });
  o.regions = [region('statement',1), region('proof',3,true)];
  o.regions[0].annotations = [{kind:'question',text:'Reader question, separate from source.',
    provenance:{origin:'human_work',author:'Reader',at:'2026-11-01T00:00:00Z'}}];
  const part = (r, role) => ({region:r.id, tag:'08ZE', role, span:r.span,
    exact_text:r.id+' original', tokens:[{kind:'text',text:r.id+' published source'}]});
  o.published = {authors:'Fixture authors',chapter:'Fixture',section_number:'1',tag:'08ZD',parts:{
    statement:part(o.regions[0],'statement'),proof:part(o.regions[1],'proof')}};
  return value;
}

test('statement has a direct Proof link; reading a collapsed proof changes no saved state', () => {
  const h = reader(true), value = publishedModel(), before = JSON.stringify(value.model);
  h.send(value);
  const card = h.root.all().find(n => n.dataset.region === 'statement' && n.tag === 'section');
  const proof = h.button(card,'published-companion');
  assert.equal(proof.textContent, 'Proof ↓');
  assert.equal(card.all().some(n => n.tag === 'form'),false);
  proof.listeners.click();
  const destination = h.scrolled.at(-1);
  assert.equal(destination.dataset.region,'proof');
  assert.match(destination.text(), /proof published source/);
  assert.equal(h.button(destination,'published-companion').textContent,'Statement ↑');
  assert.equal(JSON.stringify(value.model),before);
  assert.equal(h.messages.some(m => ['edit','toggle','navigate','stacks_reference'].includes(m.type)),false);
  assert.equal(h.messages.at(-1).type,'select');
});

test('annotation forms cannot occur between statement and proof; reader notes remain attributed', () => {
  const h = reader(true); h.send(publishedModel());
  const cards = h.root.children.filter(n => n.tag === 'section' && n.dataset.region);
  assert.deepEqual(cards.map(n=>n.dataset.region),['statement','proof']);
  for(const card of cards) assert.equal(card.all().some(n=>['form','input','textarea','select'].includes(n.tag)),false);
  const tools = h.root.all().find(n=>n.className==='reader-tools');
  assert.ok(tools.all().some(n=>n.dataset.draft==='note:statement:new'));
  const notes = h.root.children.find(n=>n.className==='reader-notes');
  assert.equal(notes.tag, 'details'); assert.equal(notes.open, false);
  assert.equal(notes.children[0].textContent, 'Reader notes (1)');
  assert.match(notes.text(),/Reader question, separate from source/); assert.match(notes.text(),/author: Reader/);
  assert.ok(h.root.children.indexOf(notes)>h.root.children.indexOf(cards[1]));
  notes.open = true; h.send(publishedModel());
  const reopened = h.root.children.find(n=>n.className==='reader-notes'); assert.equal(reopened.open, true);
  reopened.open = false; h.send(publishedModel());
  assert.equal(h.root.children.find(n=>n.className==='reader-notes').open, false);
  assert.equal(h.messages.some(m=>['edit','toggle'].includes(m.type)), false, 'folding notes changes no saved text');
});

test('overview and passage annotation displays retain raw editable TeX and attribution', () => {
  const h = reader(), value = readingModel(), text = 'Explanation \\(X\\times X\\).';
  const note = { id:'note', kind:'explanation', text, provenance:{origin:'ai_proposal',author:'Codex',at:'now'} };
  value.model.outline.annotations.push(note);
  value.model.outline.regions[1].annotations.push({...note,id:'passage-note'});
  const before = JSON.stringify(value); h.send(value);
  const notes = h.root.children.find(n => n.className === 'reader-notes');
  assert.match(notes.text(), /Overview/); assert.match(notes.text(), /other/); assert.match(notes.text(), /author: Codex/);
  assert.equal(notes.all().filter(n => n.tag === 'pre' && n.textContent === text).length, 2);
  assert.equal(h.root.all().filter(n => n.tag === 'textarea' && n.value === text).length, 2);
  assert.equal(JSON.stringify(value), before);
});

test('proof reading controls hide details, preserve statements and drafts, and reveal a chosen proof', () => {
  const h = reader(true), value = publishedModel(); value.model.outline.regions[1].collapsed = false;
  const before = JSON.stringify(value.model); h.send(value);
  const card = id => h.root.all().find(n => n.tag === 'section' && n.dataset.region === id);
  const form = h.root.all().find(n => n.dataset.draft === 'note:statement:new');
  form.all().find(n => n.tag === 'textarea').value = 'Unsaved reader work'; form.listeners.input();
  h.button(h.root, 'hide-proofs').listeners.click();
  assert.match(card('statement').text(), /statement published source/);
  assert.doesNotMatch(card('proof').text(), /proof published source/);
  assert.equal(card('proof').children.length, 1, 'hidden proof has only its compact reveal control');
  assert.equal(card('proof').children[0].textContent, '▸ proof');
  assert.equal(h.button(card('proof'), 'show-proof')['aria-expanded'], 'false');
  assert.equal(JSON.stringify(h.messages.at(-1)), JSON.stringify({type:'proofVisibility',hidden:true}));
  assert.ok(h.root.all().some(n => n.tag === 'textarea' && n.value === 'Unsaved reader work'));
  h.button(card('statement'), 'published-companion').listeners.click();
  assert.match(card('proof').text(), /proof published source/);
  h.button(card('proof'), 'hide-proof').listeners.click();
  assert.doesNotMatch(card('proof').text(), /proof published source/);
  h.button(card('proof'), 'show-proof').listeners.click();
  assert.match(card('proof').text(), /proof published source/);
  h.button(h.root, 'show-proofs').listeners.click();
  assert.match(card('proof').text(), /proof published source/);
  assert.equal(JSON.stringify(value.model), before);
  assert.equal(h.messages.some(m => ['edit','toggle','navigate'].includes(m.type)), false);
});

test('restored proof visibility preserves exact source and a focused proof remains a visible destination', () => {
  const value = {...publishedModel(),proofsHidden:true};
  const h = reader(true); h.send(value);
  const card = () => h.root.all().find(n => n.tag === 'section' && n.dataset.region === 'proof');
  assert.equal(card().children.length, 1); assert.ok(h.button(card(), 'show-proof'));
  h.send({...value,readingFocus:{serial:1,region:'proof'}});
  assert.match(card().text(), /proof published source/);
  h.send(value); assert.match(card().text(), /proof published source/, 'refresh keeps the chosen live expansion');
  const fresh = reader(true); fresh.send(value);
  const restored = fresh.root.all().find(n => n.tag === 'section' && n.dataset.region === 'proof');
  assert.equal(restored.children.length, 1); assert.ok(fresh.button(restored, 'show-proof'));
});

test('Proof links preserve multiple published proofs and reject changed or unrelated associations', () => {
  const value = publishedModel(), o=value.model.outline;
  const second = {...o.regions[1],id:'proof2'};
  o.regions.push(second);o.published.parts.proof2={...o.published.parts.proof,region:'proof2'};
  const h=reader(true);h.send(value);
  let card=h.root.all().find(n=>n.dataset.region==='statement'&&n.tag==='section');
  assert.deepEqual(card.all().filter(n=>n.dataset.action==='published-companion').map(n=>n.textContent),['Proof 1 ↓','Proof 2 ↓']);
  o.regions[1]={...o.regions[1],span:{...o.regions[1].span,start_line:20}};
  o.published.parts.proof2={...o.published.parts.proof2,tag:'OTHER'};
  h.send(value);card=h.root.all().find(n=>n.dataset.region==='statement'&&n.tag==='section');
  assert.equal(h.button(card,'published-companion'),undefined);
  assert.match(card.text(),/reading association changed/);
});

test('annotation save feedback preserves open editors and distinguishes newer unsaved text', () => {
  const h=reader(), value=readingModel(), key='note:other:new';h.send(value);
  const find=()=>h.root.all().find(n=>n.dataset.draft===key);
  let form=find(), text=form.all().find(n=>n.tag==='textarea');
  for(const node of h.root.all().filter(n=>n.dataset.disclosure))node.open=true;
  text.value='Submitted α explanation';form.listeners.input();
  h.button(form,'save-note').listeners.click();
  assert.match(form.text(),/Saving annotation/);
  text.value='Newer unsaved β explanation';form.listeners.input();
  h.send({...value,clearDraft:key,annotationSaved:true});
  form=find();assert.equal(form.all().find(n=>n.tag==='textarea').value,'Newer unsaved β explanation');
  assert.match(form.text(),/Submitted version saved.*newer edits are still unsaved/);
  for(const node of h.root.all().filter(n=>n.dataset.disclosure))assert.ok(node.open);
  h.button(form,'save-note').listeners.click();
  h.send({...value,clearDraft:key,annotationSaved:true});
  assert.match(find().text(),/Annotation saved\./);
  assert.equal(find().all().find(n=>n.dataset.saveFeedback===key).role,'status');
  h.send({type:'storageCheck'});assert.equal(h.messages.at(-1).dirty,false);
});

test('failed or uncertain annotation saving keeps text and announces no confirmed success', () => {
  const h=reader(), value=readingModel(), key='note:other:new';h.send(value);
  let form=h.root.all().find(n=>n.dataset.draft===key);
  form.all().find(n=>n.tag==='textarea').value='Keep this unsaved explanation';form.listeners.input();
  h.button(form,'save-note').listeners.click();
  h.send({type:'error',draft:key,message:'Directory synchronization failed',writesBlocked:true});
  form=h.root.all().find(n=>n.dataset.draft===key);
  assert.equal(form.all().find(n=>n.tag==='textarea').value,'Keep this unsaved explanation');
  assert.match(form.text(),/Save not confirmed.*Directory synchronization failed/);
  assert.doesNotMatch(form.text(),/Annotation saved\./);
  assert.equal(form.all().find(n=>n.dataset.saveFeedback===key).role,'alert');
  assert.equal(h.button(form,'save-note').disabled,true);
});
