'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { extractAtlasText } = require('../src/atlasText');
const { createAtlas, editAtlas } = require('../src/atlasModel');
const { digest } = require('../src/navigation');
const { atlasDiagram, NODE_WIDTH, NODE_HEIGHT, PAGE_SIZE, MARGIN } = require('../src/atlasDiagram');

function source(text, language = 'latex', range) {
  return createAtlas({ source: { text, revision: digest(text), title: 'Unpublished source',
    uri: 'file:///local/source.' + (language === 'latex' ? 'tex' : 'md'), language },
  extraction: extractAtlasText(text, language, range) });
}
const labelled = (atlas, label) => atlas.extraction.entries.find(entry => entry.label === label || entry.labels?.includes(label));
const visibleNode = (model, entry, part) => model.nodes.find(node => node.entryId === entry.id && (!part || node.part === part));
function geometry(model) {
  assert.ok(Number.isFinite(model.width) && Number.isFinite(model.height));
  assert.ok(model.nodes.length <= PAGE_SIZE); const ids = new Set(model.nodes.map(node => node.id));
  assert.equal(ids.size, model.nodes.length);
  for (const node of model.nodes) {
    assert.ok(Number.isFinite(node.x) && Number.isFinite(node.y));
    assert.ok(node.x >= MARGIN && node.y >= MARGIN);
    assert.ok(node.x + NODE_WIDTH <= model.width - MARGIN);
    assert.ok(node.y + NODE_HEIGHT <= model.height - MARGIN);
  }
  for (let i = 0; i < model.nodes.length; i++) for (let j = i + 1; j < model.nodes.length; j++) {
    const a = model.nodes[i], b = model.nodes[j];
    assert.ok(a.x + NODE_WIDTH < b.x || b.x + NODE_WIDTH < a.x || a.y + NODE_HEIGHT < b.y || b.y + NODE_HEIGHT < a.y, 'Boxes overlap');
  }
  for (const edge of model.edges) assert.ok(ids.has(edge.from) && ids.has(edge.to));
  assert.ok(ids.has(model.selected));
}

test('08ZH proof map draws the actual 08ZE citation from provider to consumer', async () => {
  const text = await fs.readFile(path.resolve(__dirname, '../../tests/fixtures/stacks/topology.tex'), 'utf8');
  const start = text.indexOf('\\begin{lemma}\n\\label{lemma-fibre-product-closed}');
  const end = text.indexOf('\\end{proof}', start) + '\\end{proof}'.length;
  const atlas = source(text, 'latex', { start, end }), before = structuredClone(atlas);
  const model = atlasDiagram(atlas, 'map'), diagonal = labelled(atlas, 'lemma-Hausdorff'), fibre = labelled(atlas, 'lemma-fibre-product-closed');
  const provider = visibleNode(model, diagonal), consumer = visibleNode(model, fibre);
  assert.equal(model.total, 2); assert.equal(model.edges.length, 1);
  assert.deepEqual(model.edges[0], { from: provider.id, to: consumer.id, kind: 'citation', label: 'lemma-Hausdorff',
    referenceId: atlas.extraction.references[0].id, references: [atlas.extraction.references[0].id] });
  assert.ok(provider.x < consumer.x); assert.equal(provider.part, 'statement'); assert.equal(consumer.part, 'statement');
  assert.equal(model.selected, consumer.id); assert.deepEqual(atlas, before); geometry(model);
  const explicitPage = atlasDiagram(atlas, 'map', { page: 0 });
  assert.equal(explicitPage.selected, explicitPage.nodes[0].id);
});

test('Blueprint separates exact statements and proofs and cites into the proof occurrence', async () => {
  const text = await fs.readFile(path.resolve(__dirname, '../../tests/fixtures/stacks/topology.tex'), 'utf8');
  const start = text.indexOf('\\begin{lemma}\n\\label{lemma-fibre-product-closed}');
  const atlas = source(text, 'latex', { start, end: text.indexOf('\\end{proof}', start) + '\\end{proof}'.length });
  const model = atlasDiagram(atlas, 'blueprint'), diagonal = labelled(atlas, 'lemma-Hausdorff'), fibre = labelled(atlas, 'lemma-fibre-product-closed');
  assert.equal(model.total, 4);
  const provider = visibleNode(model, diagonal, 'statement'), consumer = visibleNode(model, fibre, 'proof');
  assert.equal(model.edges.find(edge => edge.kind === 'citation').from, provider.id);
  assert.equal(model.edges.find(edge => edge.kind === 'citation').to, consumer.id);
  assert.equal(model.selected, visibleNode(model, fibre, 'statement').id);
  for (const entry of [diagonal, fibre]) {
    const proof = visibleNode(model, entry, 'proof'), statement = visibleNode(model, entry, 'statement');
    assert.equal(proof.kind, 'proof'); assert.equal(statement.kind, 'statement');
    assert.ok(model.edges.some(edge => edge.from === proof.id && edge.to === statement.id && edge.kind === 'proof'));
    assert.ok(proof.x < statement.x);
  }
  assert.ok(provider.x < consumer.x); geometry(model);
});

test('a citation inside a labelled equation belongs to its enclosing displayed proof', () => {
  const text = String.raw`\begin{lemma}\label{base} A source lemma.\end{lemma}
\begin{lemma}\label{result} A result.\end{lemma}
\begin{proof}\begin{equation}\label{calculation} x=x\quad\ref{base}\end{equation}\end{proof}`;
  const atlas = source(text), result = labelled(atlas, 'result'), equation = labelled(atlas, 'calculation');
  assert.equal(atlas.extraction.references[0].owner, equation.id);
  const model = atlasDiagram(atlas, 'blueprint'), edge = model.edges.find(edge => edge.kind === 'citation');
  assert.equal(edge.to, visibleNode(model, result, 'proof').id);
  assert.notEqual(edge.to, visibleNode(model, equation).id); geometry(model);
});

test('shared citations create a branch with sibling consumers rather than a fabricated chain', () => {
  const atlas = source(String.raw`\begin{lemma}\label{base} Base.\end{lemma}
\begin{lemma}\label{first} See \ref{base}.\end{lemma}
\begin{lemma}\label{second} See \ref{base}.\end{lemma}`);
  const model = atlasDiagram(atlas, 'map'), base = visibleNode(model, labelled(atlas, 'base'));
  const first = visibleNode(model, labelled(atlas, 'first')), second = visibleNode(model, labelled(atlas, 'second'));
  assert.equal(model.edges.length, 2); assert.ok(model.edges.every(edge => edge.from === base.id));
  assert.equal(first.x, second.x); assert.ok(first.x > base.x); assert.notEqual(first.y, second.y);
  assert.equal(base.y, (first.y + second.y) / 2); geometry(model);
});

test('cyclic citations share a rank and a self-reference remains explicit', () => {
  const atlas = source(String.raw`\begin{lemma}\label{a} See \ref{b}.\end{lemma}
\begin{lemma}\label{b} See \ref{a}.\end{lemma}
\begin{lemma}\label{c} See \ref{a} and \ref{c}.\end{lemma}`);
  const model = atlasDiagram(atlas, 'map'), a = visibleNode(model, labelled(atlas, 'a'));
  const b = visibleNode(model, labelled(atlas, 'b')), c = visibleNode(model, labelled(atlas, 'c'));
  assert.equal(a.x, b.x); assert.notEqual(a.y, b.y); assert.ok(c.x > a.x);
  assert.ok(model.edges.some(edge => edge.from === a.id && edge.to === b.id));
  assert.ok(model.edges.some(edge => edge.from === b.id && edge.to === a.id));
  assert.ok(model.edges.some(edge => edge.from === c.id && edge.to === c.id)); geometry(model);
});

test('grouping changes component nodes but retains each Blueprint entry and proof identity', () => {
  const atlas = source(String.raw`\begin{lemma}\label{base} Base.\end{lemma}
\begin{lemma}\label{helper} See \ref{base}.\end{lemma}
\begin{lemma}\label{result} See \ref{base}.\end{lemma}`);
  const base = labelled(atlas, 'base'), helper = labelled(atlas, 'helper');
  const original = atlasDiagram(atlas, 'blueprint');
  const grouped = editAtlas(atlas, { type: 'group', title: 'Shared construction', components: [base.id, helper.id] });
  const map = atlasDiagram(grouped, 'map'), group = map.nodes.find(node => node.kind === 'group');
  assert.equal(map.nodes.length, 2); assert.equal(group.entryId, null); assert.equal(group.title, 'Shared construction');
  assert.ok(map.edges.some(edge => edge.from === group.id && edge.to === group.id && edge.label === 'base'));
  const blueprint = atlasDiagram(grouped, 'blueprint');
  assert.deepEqual(blueprint.nodes.map(node => node.id), original.nodes.map(node => node.id));
  assert.equal(visibleNode(blueprint, base).componentId, group.componentId);
  assert.equal(visibleNode(blueprint, helper).componentId, group.componentId); geometry(map); geometry(blueprint);
});

test('repeated citations keep exact occurrence witnesses and distinct published labels', () => {
  const atlas = source(String.raw`\begin{lemma}\label{base}\label{alias} A lemma.\end{lemma}
\begin{lemma}\label{use} Use \ref{base}, \ref{base}, and \ref{alias}.\end{lemma}`);
  const model = atlasDiagram(atlas, 'map'), repeated = model.edges.find(edge => edge.label === 'base');
  assert.equal(model.edges.length, 2); assert.equal(repeated.references.length, 2);
  assert.deepEqual(repeated.references, atlas.extraction.references.filter(reference => reference.label === 'base').map(reference => reference.id));
  assert.equal(repeated.referenceId, repeated.references[0]); assert.ok(model.edges.some(edge => edge.label === 'alias')); geometry(model);
});

test('missing, ambiguous and external references remain available without invented arcs', () => {
  const atlas = source('## Definition A {#same}\n\nA.\n\n## Definition B {#same}\n\nB.\n\n' +
    '## Lemma Result {#result}\n\n[Missing](#absent), [ambiguous](#same), and [external](other.md).\n', 'markdown');
  const before = structuredClone(atlas), model = atlasDiagram(atlas, 'map');
  assert.equal(model.edges.length, 0);
  assert.deepEqual(model.unresolved, atlas.extraction.references.map(reference => reference.id));
  assert.deepEqual(atlas.extraction.references.map(reference => reference.status), ['missing', 'ambiguous', 'external']);
  assert.deepEqual(atlas, before); geometry(model);
});

test('zero-reference sections, definitions and examples form a compact grid without arrows', () => {
  const text = '# A chapter\n\n' + Array.from({ length: 31 }, (_, index) =>
    `## ${index % 2 ? 'Example' : 'Definition'} ${index} {#item-${index}}\n\nAn exact source passage.\n`).join('\n');
  const atlas = source(text, 'markdown'), model = atlasDiagram(atlas, 'blueprint');
  assert.equal(model.nodes.length, 32); assert.equal(model.edges.length, 0);
  assert.ok(model.nodes.some(node => node.kind === 'section')); assert.ok(model.nodes.some(node => node.kind === 'definition'));
  assert.ok(model.nodes.some(node => node.kind === 'example')); assert.ok(new Set(model.nodes.map(node => node.x)).size > 1);
  assert.ok(model.height < 1000); assert.ok(model.width < 1100); geometry(model);
});

test('page boundaries retain both directions, exact citations and selection without changing the requested page', () => {
  const text = Array.from({ length: 40 }, (_, index) => `## Definition ${index} {#item-${index}}\n\n` +
    (index === 0 ? '[Last](#item-39)' : index === 39 ? '[First](#item-0)' : 'A passage.') + '\n').join('\n');
  const atlas = source(text, 'markdown'), first = atlasDiagram(atlas, 'map'), last = atlasDiagram(atlas, 'map', { page: 1 });
  assert.equal(first.pageCount, 2); assert.equal(first.total, 40); assert.equal(first.nodes.length, PAGE_SIZE);
  assert.deepEqual(first.omitted, { incoming: 1, outgoing: 1 }); assert.equal(first.boundaryEdges.length, 2);
  for (const edge of first.boundaryEdges) {
    assert.ok(edge.referenceId); assert.ok(edge.fromTitle && edge.toTitle); assert.notEqual(edge.fromPage, edge.toPage);
  }
  const lastId = last.nodes.at(-1).id;
  const samePage = atlasDiagram(atlas, 'map', { page: 0, selected: lastId });
  assert.equal(samePage.page, 0); assert.equal(samePage.selected, samePage.nodes[0].id);
  const chosen = atlasDiagram(atlas, 'map', { page: 1, selected: lastId });
  assert.equal(chosen.page, 1); assert.equal(chosen.selected, lastId);
  assert.equal(atlasDiagram(atlas, 'map', { page: 999 }).page, 1);
  assert.equal(atlasDiagram(atlas, 'map', { page: -4 }).page, 0);
  geometry(first); geometry(last); geometry(chosen);
});

test('large chains are bounded and deterministic without recursive layout or whole-document dimensions', () => {
  const count = 1100;
  const text = Array.from({ length: count }, (_, index) => `## Lemma ${index} {#item-${index}}\n\n` +
    (index ? `[Previous](#item-${index - 1})` : 'Initial source.') + '\n').join('\n');
  const atlas = source(text, 'markdown'), model = atlasDiagram(atlas, 'map', { page: 15 });
  assert.equal(model.total, count); assert.equal(model.nodes.length, PAGE_SIZE); assert.equal(model.pageCount, Math.ceil(count / PAGE_SIZE));
  assert.ok(model.width < 12000); assert.ok(model.height < 1000); assert.equal(model.boundaryEdges.length, 2);
  assert.deepEqual(atlasDiagram(atlas, 'map', { page: 15 }), model); geometry(model);
  assert.throws(() => atlasDiagram(atlas, 'inference'), /Proof map or Blueprint/);
});

test('initial position follows the selected theorem beyond earlier prerequisites without overriding explicit pages', () => {
  const text = Array.from({ length: 80 }, (_, index) => `## Lemma ${index} {#item-${index}}\n\n` +
    (index === 79 ? Array.from({ length: 79 }, (_, i) => `[Input ${i}](#item-${i})`).join(' ') : 'An earlier cited result.') + '\n').join('\n');
  const start = text.indexOf('## Lemma 79 '), atlas = source(text, 'markdown', { start, end: text.length });
  assert.equal(atlas.extraction.entries.filter(entry => entry.selected).length, 1);
  const initial = atlasDiagram(atlas, 'map');
  assert.equal(initial.total, 80); assert.equal(initial.page, 2);
  assert.equal(initial.nodes.find(node => node.id === initial.selected).entryId, labelled(atlas, 'item-79').id);
  const explicit = atlasDiagram(atlas, 'map', { page: 0 });
  assert.equal(explicit.page, 0); assert.equal(explicit.selected, explicit.nodes[0].id);
  const clicked = atlasDiagram(atlas, 'map', { selected: explicit.nodes[3].id });
  assert.equal(clicked.page, 0); assert.equal(clicked.selected, explicit.nodes[3].id);
  geometry(initial); geometry(explicit); geometry(clicked);
});
