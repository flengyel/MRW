'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { outlineHtml } = require('../src/outlines');

test('selected passage has inline padding after compact proof spacing', () => {
  const html = outlineHtml('');
  assert.match(html, /\.region\.compact-proof\{[^}]+\}\s*\.region\.selected\{padding-inline:10px\}/);
});

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
  const scrolled = [], focused = [];
  let active;
  class Node {
    constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.listeners = {}; this.textContent = ''; }
    append(node) { node.parent = this; this.children.push(node); }
    replaceChildren() { if (this.contains(active)) active = undefined; this.children = []; }
    contains(node) { return this === node || this.all().includes(node); }
    addEventListener(type, callback) { this.listeners[type] = callback; }
    setAttribute(name, value) { this[name] = value; }
    all() { return this.children.flatMap(n => [n, ...n.all()]); }
    querySelectorAll(tag) { return this.all().filter(n => tag.split(',').includes(n.tag)); }
    querySelector() { return this.all().find(n => n.dataset.reference); }
    scrollIntoView() { scrolled.push(this); }
    focus() { active = this; focused.push(this); }
    text() { return this.textContent + this.children.map(n => n.text()).join(' '); }
  }
  const root = new Node('main'), messages = [];
  let receive;
  const globals = { document: { getElementById: () => root, createElement: tag => new Node(tag), get activeElement() { return active; } },
    FormData: class { constructor(node) { this.values = node.all().filter(n => n.name).map(n => [n.name,n.value]); } *[Symbol.iterator]() { yield* this.values; } },
    acquireVsCodeApi: () => ({ postMessage: value => messages.push(value) }),
    addEventListener: (type, callback) => { receive = callback; } };
  globals.window = globals;
  globals.markdownit = require('../media/markdown-it/markdown-it.js');
  globals.katex = require('../media/katex/katex.min.js');
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/mathNegation.js'), 'utf8'), globals);
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/atlasPreview.js'), 'utf8'), globals);
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/annotationView.js'), 'utf8'), globals);
  if (published) vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/stacksView.js'), 'utf8'), globals);
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/outlineView.js'), 'utf8'), globals);
  return { root, messages, scrolled, focused, get active() { return active; }, send: data => receive({data}),
    showProofs(show) {
      const control = root.all().find(n => n.dataset.action === 'proof-visibility');
      control.focus();
      control.value = show ? 'show' : 'hide';
      control.listeners.change();
    },
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

test('reader AI controls distinguish current passages from an earlier pinned range', () => {
  const h = reader(); h.send(readingModel());
  const button = action => h.root.all().find(n => n.dataset.action === action);
  button('ask-ai-passage').listeners.click();
  assert.equal(JSON.stringify(h.messages.at(-1)), JSON.stringify({type:'ask_ai',region:'changed'}));
  h.send({type:'idle'});
  button('ask-ai-pinned').listeners.click();
  assert.equal(JSON.stringify(h.messages.at(-1)), JSON.stringify({type:'ask_ai',pinned:true}));
  h.send({type:'idle'});
  assert.equal(button('ask-ai'), undefined, 'assistance is scoped to the passage or pinned citation');
  assert.equal(h.messages.some(m => m.type === 'send_assistance'), false);
});

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
  assert.equal(h.button(whole,'copy-link').textContent, 'Copy link to this source');
  assert.equal(h.button(current,'copy-link').textContent, 'Copy link to this passage');
  assert.match(current.text(), /2 linked notes — choose when opening/);
  assert.match(whole.text(), /From your note to MRW/);
  assert.match(h.button(whole,'copy-link').title, /opens this retained source or passage in MRW/);
  assert.match(whole.text(), /From MRW to your note/);
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

test('retained Markdown displays inert reading markup alongside unchanged exact passages', () => {
  const h = reader(), value = readingModel(), { outline } = value.model;
  outline.source.path = '/fixture.md';
  const region = outline.regions[0];
  const exact = '**Lemma 1.** For $p \\mid ab$, either $p \\mid a$ or $p \\mid b$.\r\n\r\n' +
    '*Proof.* [Reference](https://example.test) ![Figure](https://example.test/fig.png)\r\n' +
    '<script>alert(1)</script>';
  region.collapsed = false;
  region.argument_text = exact;
  region.statement = {kind:'statement'};
  region.statement_text = '**Lemma 1.** A statement.';
  outline.contexts = [{id:'context1',kind:'hypothesis',span:region.span,label:'Assumption',text:'**Prime** $p$.'}];
  h.send(value);
  const passage = h.root.children.find(n => n.dataset.region === region.id);
  const block = passage.children.find(n => n.className === 'retained-prose');
  assert.match(block.innerHTML, /<strong>Lemma 1\.<\/strong>/);
  assert.match(block.innerHTML, /<em>Proof\.<\/em>/);
  assert.match(block.innerHTML, /<math/);
  assert.match(block.innerHTML, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(block.innerHTML, /\*\*|<img(?:\s|>)|<a(?:\s|>)|<script(?:\s|>)/);
  const retained = passage.children.find(n => n.className === 'source-exact');
  assert.equal(retained.open, false);
  assert.equal(retained.children[0].textContent, 'Exact text');
  assert.equal(retained.children[1].textContent, exact);
  assert.equal(retained.children[1].dataset.argument, region.id);
  assert.equal(passage.all().find(n => n.dataset.statement === region.id).textContent, region.statement_text);
  assert.equal(h.root.all().find(n => n.dataset.context === 'context1').textContent, outline.contexts[0].text);
  retained.open = true; h.send(value);
  assert.equal(h.root.all().find(n => n.dataset.disclosure === 'exact:argument:changed').open, true);
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

test('retained Stacks theorem action requests its passage without forwarding source data', () => {
  const h = reader(true), value = publishedModel();
  value.model.outline.published.source_id = 'stacks-project';
  value.model.outline.published.format = 'tex';
  h.send(value);
  const statement = h.root.all().find(n => n.dataset.region === 'statement' && n.tag === 'section');
  h.button(statement, 'generate-atlas').listeners.click();
  assert.equal(JSON.stringify(h.messages.at(-1)), JSON.stringify({type:'generate_atlas',region:'statement'}));
  value.model.outline.published.source_id = 'kerodon';
  h.send(value);
  assert.equal(h.button(h.root, 'generate-atlas'), undefined);
});

test('source collection, section and qualified identity stay visible above text while hashes remain collapsed', () => {
  for (const [source, collection, chapter, section, tag] of [
    ['stacks-project', 'The Stacks Project', 'Topology', 3, '08ZD'],
    ['kerodon', 'Kerodon', 'Kerodon', '1.1', '0004']
  ]) {
    const h = reader(true), value = publishedModel();
    Object.assign(value.model.outline.published, { source_id: source, source_name: collection, chapter, section_number: section,
      title: 'Hausdorff spaces', qualified_tag: `${source}:${tag}`, source_revision: 'secret-hash' });
    value.returnDestination = { kind: 'citation', label: '← Return to reading-overview.md',
      path: '/notes/reading-overview.md', detail: 'Opened from a link in notes/reading-overview.md.' };
    h.send(value);
    const bar = h.root.children.find(node => node.className === 'toolbar reading-bar');
    const location = bar.children.find(node => node.className === 'source-location');
    assert.ok(location.text().includes(collection)); assert.ok(location.text().includes(chapter));
    assert.ok(location.text().includes(`Section ${section}`)); assert.ok(location.text().includes(`${source}:${tag}`));
    assert.equal(bar.text().includes('secret-hash'), false);
    assert.equal(h.root.children.find(node => node.className === 'reader-tools').open, false);
    assert.match(h.button(h.root, 'reading-return').text(), /Return to reading-overview.md/);
    assert.equal(h.root.children.find(node => node.className === 'return-context').text(), 'Opened from a link in notes/reading-overview.md.');
  }
});

test('hover and keyboard focus explain controls without an action; destination updates preserve reader drafts', () => {
  const h = reader(true), value = publishedModel(); h.send(value);
  const note = h.root.all().find(node => node.dataset.draft === 'note:statement:new' && node.tag === 'form');
  note.all().find(node => node.tag === 'textarea').value = 'Keep my unsaved explanation'; note.listeners.input();
  const before = h.messages.length;
  const help = h.root.children.find(node => node.className === 'control-help');
  const ask = h.button(h.root, 'ask-ai-passage'), refresh = h.button(h.root, 'refresh');
  assert.equal(help.hidden, true);
  ask.listeners.mouseenter(); assert.equal(help.hidden, false); assert.match(help.text(), /Send is a separate action/);
  ask.listeners.focus(); ask.listeners.mouseleave(); assert.equal(help.hidden, false);
  refresh.listeners.mouseenter(); refresh.listeners.mouseleave(); assert.match(help.text(), /Send is a separate action/);
  assert.equal(ask['aria-description'], ask.title); assert.equal(ask['aria-describedby'], help.id);
  ask.listeners.keydown({ key: 'Escape' }); assert.equal(help.hidden, true);
  ask.listeners.blur(); refresh.listeners.focus(); assert.match(help.text(), /from MRW storage/);
  refresh.listeners.blur(); assert.equal(help.hidden, true);
  assert.equal(h.messages.length, before);
  h.send({ type: 'return_destination', destination: { kind: 'selected', label: '← Open reading-overview.md',
    path: '/notes/reading-overview.md', detail: 'Opened directly.' } });
  assert.match(h.button(h.root, 'reading-return').text(), /Open reading-overview.md/);
  assert.equal(h.root.children.find(node => node.className === 'return-context').text(), 'Opened directly.');
  assert.ok(h.button(h.root, 'reading-return').title.includes('/notes/reading-overview.md'));
  assert.equal(note.all().find(node => node.tag === 'textarea').value, 'Keep my unsaved explanation');
  assert.equal(h.root.all().find(node => node.dataset.draft === 'note:statement:new' && node.tag === 'form'), note);
});

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

test('saved notes appear with their passage while annotation forms stay outside the source flow', () => {
  const h = reader(true); h.send(publishedModel());
  const cards = h.root.children.filter(n => n.tag === 'section' && n.dataset.region);
  assert.deepEqual(cards.map(n=>n.dataset.region),['statement','proof']);
  for(const card of cards) assert.equal(card.all().some(n=>['form','input','textarea','select'].includes(n.tag)),false);
  const tools = h.root.all().find(n=>n.className==='reader-tools');
  assert.ok(tools.all().some(n=>n.dataset.draft==='note:statement:new'));
  const notes = cards[0].all().find(n=>n.dataset.notesFor==='statement');
  assert.equal(notes.tag, 'details'); assert.equal(notes.open, false);
  assert.equal(notes.children[0].textContent, 'Reader notes (1)');
  assert.match(notes.text(),/Reader question, separate from source/); assert.match(notes.text(),/author: Reader/);
  assert.equal(notes.parent, cards[0]);
  assert.equal(h.root.children.some(n=>n.className==='reader-notes'), false);
  notes.open = true; h.send(publishedModel());
  const reopened = h.root.all().find(n=>n.dataset.notesFor==='statement'); assert.equal(reopened.open, true);
  reopened.open = false; h.send(publishedModel());
  assert.equal(h.root.all().find(n=>n.dataset.notesFor==='statement').open, false);
  assert.equal(h.messages.some(m=>['edit','toggle'].includes(m.type)), false, 'folding notes changes no saved text');
});

test('passage notes stay on the action row and both AI commands are under More', () => {
  for (const published of [false, true]) {
    const h = reader(published), value = published ? publishedModel() : readingModel();
    const region = value.model.outline.regions[0]; region.annotations = [];
    h.send(value);
    const card = () => h.root.children.find(n => n.dataset.region === region.id);
    const row = card().children.find(n => n.className === 'toolbar passage-actions');
    assert.deepEqual(row.children.filter(n => n.tag === 'button').map(n => n.dataset.action),
      ['add-reader-note', 'link-reader-note']);
    const more = row.children.find(n => n.className === 'passage-more');
    assert.equal(more.children[0].textContent, 'More…');
    assert.equal(more.open, false);
    assert.deepEqual(more.querySelectorAll('button').map(n => n.dataset.action),
      ['ask-ai-passage', 'copy-companion']);
    assert.equal(h.button(card(), 'delete-reader-note'), undefined);
    const key = `note:${region.id}:new`, find = () => h.root.all().find(n => n.dataset.draft === key);
    let form = find(); const text = form.all().find(n => n.tag === 'textarea');
    text.value = 'My own unsaved argument'; form.listeners.input();
    const count = h.messages.length;
    h.button(card(), 'add-reader-note').listeners.click();
    assert.equal(h.messages.length, count, 'opening sends no AI request and makes no write');
    assert.equal(h.focused.at(-1), text);
    for (const key of ['source-tools', `passage:${region.id}`, `note:${region.id}:new`]) {
      assert.equal(h.root.all().find(n => n.dataset.disclosure === key).open, true);
    }
    assert.equal(card().all().some(n => n.tag === 'form'), false);
    h.send(value); form = find();
    assert.equal(form.all().find(n => n.tag === 'textarea').value, 'My own unsaved argument');
    h.button(form, 'save-note').listeners.click();
    assert.equal(h.messages.at(-1).change.region, region.id);
    assert.equal(h.messages.at(-1).change.text, 'My own unsaved argument');
    assert.equal(h.active, form.all().find(n => n.tag === 'textarea'));
  }
});

test('passage delete freezes its drafts during selection and preserves all but the confirmed note', () => {
  const h = reader(true), value = publishedModel(), r = value.model.outline.regions[0];
  r.annotations[0].id = 'first'; r.annotations.push({...r.annotations[0], id:'second', text:'Keep saved second'});
  h.send(value);
  const forms = () => h.root.all().filter(n => n.tag === 'form' && n.dataset.draft.startsWith('note:statement:'));
  for (const form of forms()) { form.all().find(n => n.tag === 'textarea').value = form.dataset.draft; form.listeners.input(); }
  const remove = () => h.button(h.root.children.find(n => n.dataset.region === 'statement'), 'delete-reader-note');
  remove().listeners.click();
  assert.deepEqual(JSON.parse(JSON.stringify(h.messages.at(-1))), {type:'delete_annotation',region:'statement',unsavedAnnotations:['first','second','new']});
  for (const f of forms()) assert.equal(f.all().find(n => n.tag === 'textarea').disabled, true);
  h.send({type:'idle'});
  for (const f of forms()) assert.equal(f.all().find(n => n.tag === 'textarea').disabled, false);
  remove().listeners.click();
  r.annotations.shift(); h.send({...value, deletedAnnotation:{region:'statement', id:'first'}});
  assert.deepEqual(forms().map(f => f.all().find(n => n.tag === 'textarea').value), ['note:statement:second','note:statement:new']);
  assert.equal(remove().disabled, false);
});

test('linked reader notes stay beside their exact passage and use link management, never file deletion', () => {
  const h = reader(), value = readingModel(); h.send(value);
  const card = id => h.root.children.find(n => n.dataset.region === id);
  const linked = card('other').all().find(n => n.dataset.disclosure === 'linked-reader-notes:other');
  assert.match(linked.text(), /Saved passage note <literal>/);
  assert.doesNotMatch(linked.text(), /Saved earlier note|Saved outline note/);
  assert.equal(card('changed').all().some(n => n.dataset.disclosure === 'linked-reader-notes:changed'), false);
  h.button(linked, 'manage-notes').listeners.click();
  assert.equal(JSON.stringify(h.messages.at(-1)), JSON.stringify({type:'manage_notes',note:'c'}));
  h.send({type:'idle'}); h.button(card('other'), 'link-reader-note').listeners.click();
  assert.equal(JSON.stringify(h.messages.at(-1)), JSON.stringify({type:'associate_note',region:'other',pinned:false}));
});

test('overview and passage annotation displays retain raw editable TeX and attribution', () => {
  const h = reader(), value = readingModel(), text = 'Explanation \\(X\\times X\\).';
  const note = { id:'note', kind:'explanation', text, provenance:{origin:'ai_proposal',author:'Codex',at:'now'} };
  value.model.outline.annotations.push(note);
  value.model.outline.regions[1].annotations.push({...note,id:'passage-note'});
  const before = JSON.stringify(value); h.send(value);
  const overview = h.root.children.find(n => n.dataset.notesFor === 'overview');
  const card = h.root.children.find(n => n.dataset.region === 'other');
  const passage = card.all().find(n => n.dataset.notesFor === 'other');
  assert.equal(overview.children[0].textContent, 'Source notes (1)');
  assert.match(overview.text(), /author: Codex/); assert.match(passage.text(), /author: Codex/);
  assert.equal(h.root.all().filter(n => n.tag === 'pre' && n.textContent === text).length, 2);
  assert.equal(h.root.all().filter(n => n.tag === 'textarea' && n.value === text).length, 2);
  assert.equal(JSON.stringify(value), before);
});

test('note deletion targets its scope, freezes its editor, and clears only its draft after publication', () => {
  const h = reader(), value = readingModel();
  const note = {id:'remove-me',kind:'question',text:'Synthetic note',provenance:{origin:'unknown',author:'Automated check',at:'now'}};
  value.model.outline.regions[0].annotations.push(note);
  value.model.outline.annotations.push({...note,id:'source-note'});
  h.send(value);
  const form = key => h.root.all().find(n => n.tag === 'form' && n.dataset.draft === key);
  const target = 'note:changed:remove-me', other = 'note:other:new';
  for (const [key,text] of [[target,'Unsaved target text'],[other,'Keep this other draft']]) {
    const f=form(key); f.all().find(n=>n.tag==='textarea').value=text; f.listeners.input();
  }
  const remove = h.root.all().find(n=>n.dataset.action==='delete-note'&&n.dataset.annotation==='remove-me');
  assert.equal(remove.dataset.write,'true'); remove.listeners.click();
  assert.equal(JSON.stringify(h.messages.at(-1)),JSON.stringify({type:'delete_annotation',region:'changed',annotation:'remove-me',unsaved:true}));
  assert.ok(form(target).all().filter(n=>['input','textarea','select'].includes(n.tag)).every(n=>n.disabled));
  assert.equal(form(other).all().find(n=>n.tag==='textarea').disabled,false);
  h.send({type:'idle'});
  assert.equal(form(target).all().find(n=>n.tag==='textarea').value,'Unsaved target text');
  assert.equal(form(target).all().find(n=>n.tag==='textarea').disabled,false);
  h.root.all().find(n=>n.dataset.action==='delete-note'&&n.dataset.annotation==='remove-me').listeners.click();
  const updated=JSON.parse(JSON.stringify(value));updated.model.outline.regions[0].annotations=[];
  updated.deletedAnnotation={region:'changed',id:'remove-me'};h.send(updated);h.send({type:'idle'});
  assert.equal(form(target),undefined);
  assert.equal(h.root.all().some(n=>n.dataset.notesFor==='changed'),false);
  assert.equal(form(other).all().find(n=>n.tag==='textarea').value,'Keep this other draft');
  assert.ok(h.root.all().some(n=>n.dataset.annotation==='source-note'));
  assert.equal(h.messages.some(m=>m.type==='edit'),false);
});

test('failed note deletion keeps its saved display and draft; whole-source deletion has a null region', () => {
  const h=reader(),value=readingModel();
  value.model.outline.annotations.push({id:'whole',kind:'explanation',text:'Saved text',provenance:{origin:'ai_proposal',author:'Codex',at:'now'}});
  h.send(value);
  const form=h.root.all().find(n=>n.dataset.draft==='note:overview:whole'&&n.tag==='form');
  form.all().find(n=>n.tag==='textarea').value='Keep draft after failure';form.listeners.input();
  h.root.all().find(n=>n.dataset.action==='delete-note').listeners.click();
  assert.equal(h.messages.at(-1).region,null);
  h.send({type:'error',message:'Deletion not confirmed',writesBlocked:true});
  assert.match(h.root.all().find(n=>n.dataset.notesFor==='overview').text(),/Saved text/);
  assert.ok(h.root.all().some(n=>n.tag==='textarea'&&n.value==='Keep draft after failure'&&!n.disabled));
  assert.equal(h.root.all().find(n=>n.dataset.action==='delete-note').disabled,true);
});

test('proof notes stay beside a folded proof and keep their own disclosure state and editor draft', () => {
  const value = publishedModel(), note = { id:'proof-note',kind:'explanation',text:'G(x) = (x, s(f(x)))',
    provenance:{origin:'ai_proposal',author:'Codex',at:'now'} };
  value.model.outline.regions[1].annotations.push(note);
  value.model.outline.annotations.push({...note,id:'source-note',text:'Source-wide note.'});
  const before = JSON.stringify(value), h = reader(true); h.send(value);
  const card = id => h.root.children.find(n => n.dataset.region === id);
  const notes = id => h.root.all().find(n => n.dataset.notesFor === id);
  assert.equal(notes('proof').parent, card('proof'));
  assert.match(notes('proof').text(), /G\(x\) = \(x, s\(f\(x\)\)\)/);
  assert.equal(h.root.children.indexOf(notes('overview')) < h.root.children.indexOf(card('statement')), true);
  assert.doesNotMatch(notes('statement').text(), /G\(x\)/);
  notes('proof').open = true;
  const form = h.root.all().find(n => n.dataset.draft === 'note:proof:new');
  form.all().find(n => n.tag === 'textarea').value = 'Unsaved proof question'; form.listeners.input();
  h.send(value);
  assert.equal(notes('proof').open, true); assert.equal(notes('statement').open, false);
  h.showProofs(false);
  assert.doesNotMatch(card('proof').text(), /proof published source/);
  assert.equal(notes('proof').open, true);
  notes('proof').open = false; h.send(value);
  assert.equal(notes('proof').open, false);
  assert.ok(h.root.all().some(n => n.tag === 'textarea' && n.value === 'Unsaved proof question'));
  h.button(card('proof'), 'show-proof').listeners.click();
  assert.match(card('proof').text(), /proof published source/);
  assert.equal(notes('proof').parent, card('proof'));
  assert.equal(JSON.stringify(value), before);
  assert.equal(h.messages.some(m => ['edit','toggle'].includes(m.type)), false);
});

test('proof controls preserve keyboard focus through bulk and individual changes', () => {
  const h = reader(true), value = publishedModel();
  value.model.outline.regions[1].collapsed = false;
  h.send(value);
  const oldControl = h.button(h.root, 'proof-visibility');
  h.showProofs(false);
  assert.equal(h.active, h.button(h.root, 'proof-visibility'));
  assert.notEqual(h.active, oldControl);
  assert.equal(h.active.value, 'hide');

  const reveal = h.button(h.root, 'show-proof');
  reveal.focus();
  reveal.listeners.click();
  assert.equal(h.active, h.button(h.root, 'hide-proof'));
  assert.equal(h.active['aria-expanded'], 'true');
  assert.equal(h.button(h.root, 'proof-visibility').value, 'show');
});

test('proof reading controls hide details, preserve statements and drafts, and reveal a chosen proof', () => {
  const h = reader(true), value = publishedModel(); value.model.outline.regions[1].collapsed = false;
  const before = JSON.stringify(value.model); h.send(value);
  const card = id => h.root.all().find(n => n.tag === 'section' && n.dataset.region === id);
  const form = h.root.all().find(n => n.dataset.draft === 'note:statement:new');
  form.all().find(n => n.tag === 'textarea').value = 'Unsaved reader work'; form.listeners.input();
  h.showProofs(false);
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
  h.showProofs(true);
  assert.match(card('proof').text(), /proof published source/);
  assert.equal(JSON.stringify(value.model), before);
  assert.equal(h.messages.some(m => ['edit','toggle','navigate'].includes(m.type)), false);
});

test('Return keeps local proof controls usable without a completion message and preserves drafts', () => {
  const h=reader(true),value=publishedModel();h.send(value);
  const form=h.root.all().find(n=>n.tag==='form'&&n.dataset.draft==='note:statement:new');
  form.all().find(n=>n.tag==='textarea').value='Keep this unsaved note';form.listeners.input();
  h.button(h.root,'reading-return').listeners.click();
  assert.equal(h.messages.at(-1).type,'reading_return');
  assert.equal(h.button(h.root,'proof-visibility').disabled,false);
  h.showProofs(false);
  const card=h.root.all().find(n=>n.tag==='section'&&n.dataset.region==='proof');
  assert.ok(h.button(card,'show-proof'));assert.equal(h.button(h.root,'proof-visibility').disabled,false);
  assert.ok(h.root.all().some(n=>n.tag==='textarea'&&n.value==='Keep this unsaved note'));
  assert.equal(h.messages.some(m=>m.type==='edit'||m.type==='toggle'),false);
  h.send({type:'storageCheck'});h.send({type:'idle'});
  assert.ok(h.root.all().filter(n=>n.tag==='button').every(n=>n.disabled));
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
  assert.match(form.text(),/Saving note/);
  text.value='Newer unsaved β explanation';form.listeners.input();
  h.send({...value,clearDraft:key,annotationSaved:true});
  form=find();assert.equal(form.all().find(n=>n.tag==='textarea').value,'Newer unsaved β explanation');
  assert.match(form.text(),/Submitted version saved.*newer edits are still unsaved/);
  for(const node of h.root.all().filter(n=>n.dataset.disclosure))assert.ok(node.open);
  h.button(form,'save-note').listeners.click();
  h.send({...value,clearDraft:key,annotationSaved:true});
  assert.match(find().text(),/Note saved\./);
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
  assert.doesNotMatch(form.text(),/Note saved\./);
  assert.equal(form.all().find(n=>n.dataset.saveFeedback===key).role,'alert');
  assert.equal(h.button(form,'save-note').disabled,true);
});


test('associations keep source editing and immutable linking snapshots visible', () => {
  const h=reader();const value=readingModel();
  const note={id:'annotation',kind:'explanation',text:'Exact original α',provenance:{origin:'human_work',author:'Reader',at:'retained time'}};
  value.model.outline.regions[0].annotations=[note];
  value.continuations=[{annotation:note.id,association:'association-1',phase:'complete',original:{...note,text:'Earlier source snapshot'},destination:{label:'Ordinary note',file:'N.md'}},{annotation:note.id,association:'association-2',phase:'complete',destination:{label:'Another note',file:'M.md'}}];
  value.continuationErrors={'association-1':'Note missing or renamed — relink explicitly'};
  h.send(value);
  assert.ok(h.root.text().includes('Inspect source snapshot at linking'));
  assert.ok(h.root.text().includes('Earlier source snapshot'));
  assert.ok(h.root.text().includes('Another note'));
  assert.ok(h.root.text().includes('Link another note'));
  assert.ok(h.root.text().includes('Exact original α'));
  assert.ok(h.root.text().includes('Reader'));
  assert.ok(h.root.text().includes('Note missing or renamed'));
  assert.ok(h.root.text().includes('Edit note'));
  assert.ok(h.root.text().includes('Manage note association'));
  value.continuations[0].phase='pending';h.send(value);
  assert.ok(h.root.text().includes('Edit note'));
  assert.ok(h.root.text().includes('Resume pending association'));
});


test('plain note writing has text first, optional attribution, and no purpose classification', () => {
  const h=reader();h.send(readingModel());
  const f=h.root.all().find(n=>n.tag==='form'&&n.dataset.draft==='note:other:new');
  assert.equal(f.children[0].tag,'textarea');
  assert.equal(f.all().some(n=>n.name==='purpose'),false);
  assert.deepEqual(f.children.filter(n=>n.tag==='details').map(n=>[n.children[0].textContent,n.open]),[['Attribution',false],['Help',false]]);
  h.button(f,'save-note').listeners.click();assert.equal(h.messages.some(m=>m.type==='edit'),false);
  const text=f.all().find(n=>n.name==='text');text.value='Why does \\(f(x)=g(y)\\) hold?';f.listeners.input();
  h.button(f,'save-note').listeners.click();const edit=h.messages.at(-1);
  assert.equal(edit.change.purpose,'note');assert.equal(edit.change.origin,'unknown');assert.equal(edit.change.author,null);
  assert.equal(edit.change.text,text.value);
});

test('editing a quoted note preserves its kind and known attribution without visiting details',()=>{
  const h=reader(),v=readingModel();v.model.outline.regions[1].annotations=[{id:'old',kind:'cited_dependency',text:'Quoted text',provenance:{origin:'source_quotation',author:'Original author',at:'2026-11-01T00:00:00Z'}}];h.send(v);
  const f=h.root.all().find(n=>n.tag==='form'&&n.dataset.draft==='note:other:old');
  f.all().find(n=>n.name==='text').value='Quoted text, with a question.';f.listeners.input();h.button(f,'save-note').listeners.click();
  assert.equal(h.messages.at(-1).change.purpose,'cited_dependency');assert.equal(h.messages.at(-1).change.origin,'source_quotation');assert.equal(h.messages.at(-1).change.author,'Original author');
});

test('Cancel closes an untouched note locally and confirms a nonempty draft without any save',()=>{
  const h=reader();h.send(readingModel());let f=h.root.all().find(n=>n.tag==='form'&&n.dataset.draft==='note:other:new');
  h.button(f,'cancel-note').listeners.click();assert.equal(h.messages.some(m=>m.type==='cancel_note'||m.type==='edit'),false);
  f=h.root.all().find(n=>n.tag==='form'&&n.dataset.draft==='note:other:new');const text=f.all().find(n=>n.name==='text');text.value='Keep this draft';f.listeners.input();
  h.button(f,'cancel-note').listeners.click();let m=h.messages.at(-1);assert.equal(m.type,'cancel_note');
  h.send({type:'noteCancel',draft:m.draft,request:m.request,discard:false});assert.equal(text.value,'Keep this draft');
  h.button(f,'cancel-note').listeners.click();m=h.messages.at(-1);h.send({type:'noteCancel',draft:m.draft,request:m.request,discard:true});
  f=h.root.all().find(n=>n.tag==='form'&&n.dataset.draft==='note:other:new');assert.equal(f.all().find(n=>n.name==='text').value,'');
  assert.equal(h.messages.some(m=>m.type==='edit'),false);h.send({type:'storageCheck'});assert.equal(h.messages.at(-1).dirty,false);
});

test('a discard reply cannot clear typing made while the confirmation was open',()=>{
  const h=reader();h.send(readingModel());const f=h.root.all().find(n=>n.tag==='form'&&n.dataset.draft==='note:other:new');const text=f.all().find(n=>n.name==='text');
  text.value='Earlier draft';f.listeners.input();h.button(f,'cancel-note').listeners.click();const m=h.messages.at(-1);
  text.value='Newer draft';f.listeners.input();h.send({type:'noteCancel',draft:m.draft,request:m.request,discard:true});
  assert.equal(text.value,'Newer draft');assert.match(f.text(),/Newer changes kept/);h.send({type:'storageCheck'});assert.equal(h.messages.at(-1).dirty,true);
});


test('a text draft does not overwrite attribution refreshed by another writer',()=>{
 const h=reader(),v=readingModel();const n={id:'old',kind:'question',text:'Question',provenance:{origin:'unknown',author:null,at:'earlier'}};v.model.outline.regions[1].annotations=[n];h.send(v);
 let f=h.root.all().find(n=>n.tag==='form'&&n.dataset.draft==='note:other:old');f.all().find(n=>n.name==='text').value='Unsaved question';f.listeners.input();
 v.model.outline.regions[1].annotations=[{...n,provenance:{origin:'ai_proposal',author:'Recorded model attribution',at:'later'}}];h.send(v);
 f=h.root.all().find(n=>n.tag==='form'&&n.dataset.draft==='note:other:old');h.button(f,'save-note').listeners.click();assert.equal(h.messages.at(-1).change.origin,'ai_proposal');assert.equal(h.messages.at(-1).change.author,'Recorded model attribution');assert.equal(h.messages.at(-1).change.text,'Unsaved question');
});

test('an explicitly edited author survives refresh with the text draft',()=>{
 const h=reader(),v=readingModel();v.model.outline.regions[1].annotations=[{id:'old',kind:'note',text:'Note',provenance:{origin:'human_work',author:'Original',at:'earlier'}}];h.send(v);
 let f=h.root.all().find(n=>n.tag==='form'&&n.dataset.draft==='note:other:old');const author=f.all().find(n=>n.name==='author');author.value='Explicit correction';author.listeners.input();f.listeners.input();h.send(v);
 f=h.root.all().find(n=>n.tag==='form'&&n.dataset.draft==='note:other:old');h.button(f,'save-note').listeners.click();assert.equal(h.messages.at(-1).change.author,'Explicit correction');
});

test('Trash reader retains its passage and offers Restore with editing disabled',()=>{
 const h=reader(),value=readingModel();value.model.lifecycle={state:'trash',revision:'status'};h.send(value);
 assert.match(h.root.text(),/in Trash/);
 const button=action=>h.root.all().find(n=>n.dataset.action===action);
 assert.equal(button('trash-source'),undefined);assert.ok(button('restore-source'));
 assert.ok(h.root.querySelectorAll('input,textarea,select').every(n=>n.disabled));
 assert.ok(h.root.querySelectorAll('button').filter(n=>n.dataset.write==='true').every(n=>n.disabled));
 button('restore-source').listeners.click();assert.equal(h.messages.at(-1).type,'restore_source');
});

test('active reader exposes Delete inside source details and keeps notes editable',()=>{
 const h=reader();h.send(readingModel());const control=h.root.all().find(n=>n.dataset.action==='trash-source');
 assert.ok(control);assert.equal(control.disabled,false);assert.match(control.title,/Restore keeps its passages, notes and links/);
});

test('retained LaTeX typesets a selected result with its own macros and keeps exact text', () => {
  const h = reader(), value = readingModel(), { outline } = value.model;
  outline.source.path = '/fixture.TEX';
  outline.tex_preview_source = String.raw`\newcommand{\B}{\mathsf B}
\newtheorem{result}{Result}
\begin{document}
\begin{equation} x=y \tag{$K_A$}\label{eq:context} \end{equation}`;
  const exact = String.raw`\begin{result}\label{lem:collapse}
Let $\theta$ be a proof congruence on $\B$ satisfying \eqref{eq:context}. Then $\B/\theta$ is a preorder.
\end{result}`;
  const [region, unsupported] = outline.regions;
  Object.assign(region, { title: String.raw`\begin{result}\label{lem:collapse}`,
    collapsed: false, argument_text: exact,
    statement: { kind: 'statement' }, statement_text: exact });
  Object.assign(unsupported, { collapsed: false, argument_text: String.raw`\input{outside.tex}` });
  outline.contexts = [{ id: 'context1', kind: 'hypothesis', span: region.span,
    label: 'Assumption', text: String.raw`A congruence on $\B$.` }];
  h.send(value);

  const passage = h.root.children.find(n => n.dataset.region === region.id);
  for (const block of [...passage.all(), ...h.root.children.find(n => n.dataset.contextItem === 'context1').all()]
    .filter(n => n.className === 'retained-prose')) {
    assert.match(block.innerHTML, /<math/);
    assert.doesNotMatch(block.innerHTML, /atlas-raw-math|Preview unavailable|\\begin\{result\}/);
  }
  assert.equal(passage.all().find(n => n.dataset.statement === region.id).textContent, exact);
  assert.equal(passage.children.find(n => n.tag === 'h2').textContent, 'Result · lem:collapse');
  const rendered = passage.children.find(n => n.className === 'retained-prose');
  assert.equal(rendered.dataset.format, 'latex');
  assert.match(rendered.innerHTML, /<msub><mi>K<\/mi><mi>A<\/mi><\/msub>/);
  assert.doesNotMatch(rendered.innerHTML, /\[eq:context\]/);
  const retained = passage.children.find(n => n.className === 'source-exact');
  assert.equal(retained.open, false);
  assert.equal(retained.children[1].textContent, exact);
  const failed = h.root.children.find(n => n.dataset.region === unsupported.id);
  assert.match(failed.children.find(n => n.className === 'retained-prose').innerHTML, /Preview unavailable/);
  assert.equal(failed.all().find(n => n.dataset.argument === unsupported.id).textContent, unsupported.argument_text);

  const actions = passage.children.find(n => n.className?.includes('passage-actions'));
  h.button(actions, 'compare-lean').listeners.click();
  assert.equal(JSON.stringify(h.messages.at(-1)), JSON.stringify({ type: 'compare_lean', region: region.id }));
});
