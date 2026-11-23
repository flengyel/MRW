'use strict';
// Generated source captures cross the actual Python bridge. No model, source
// download or Lean run supplies these deterministic proposal fixtures.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const { digest } = require('../src/navigation');
const { runBridge } = require('../src/bridge');
const { extractAtlasText } = require('../src/atlasText');
const { createAtlas, validateAtlas, editAtlas, overviewComponents, detailPage } = require('../src/atlasModel');
const { proposalStudy, sourceGraph, reviewDraft } = require('../src/atlas');
const { handoff, sources, readProposal, studyPassages } = require('../src/proofStudy');
const extension = path.resolve(__dirname, '..');
const bridge = request => runBridge(extension, 'python3', request);
const encode = value => JSON.stringify(value, null, 2) + '\n';
const explanation = text => ({ text, author: 'Deterministic companion fixture', origin: 'ai_proposal' });

async function workspace(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mrw-atlas-'));
  t.after(() => fs.rm(root, { recursive: true, force: true })); return root;
}
function atlas(text, range, language = 'latex', uri = 'file:///unpublished/local-manuscript.tex') {
  return { ...createAtlas({ source: { text, revision: digest(text), uri, title: 'Unpublished manuscript', language },
    extraction: extractAtlasText(text, language, range) }), id: randomUUID() };
}
async function stacks() {
  const text = await fs.readFile(path.resolve(extension, '../tests/fixtures/stacks/topology.tex'), 'utf8');
  const start = text.indexOf('\\begin{lemma}\n\\label{lemma-fibre-product-closed}');
  const end = text.indexOf('\\end{proof}', start) + '\\end{proof}'.length;
  const record = atlas(text, { start, end });
  const fibre = record.extraction.entries.find(entry => entry.label === 'lemma-fibre-product-closed');
  return { text, record, fibre, component: record.components.find(component => component.id === fibre.id) };
}
function proposal(study) {
  const citation = source => ({ source: study.passages[source].id, start_line: 1,
    end_line: study.passages[source].text.split(/\r\n|\r|\n/).length,
    ...(study.passages[source].reference ? { reference: study.passages[source].reference } : {}) });
  return { version: 1, title: 'Closed fibre product from the diagonal',
    description: explanation('Proposed reconstruction from the explicitly copied source passages.'),
    sources: sources(study), scopes: [{ id: 'global', parent: null, variables: [], assumptions: [] }],
    nodes: [
      { id: 'diagonal', title: 'Closed diagonal', claim: study.passages[2].text,
        explanation: explanation('The cited Hausdorff characterization supplies a closed diagonal.'),
        scope: 'global', citations: [citation(2)] },
      { id: 'fibre', title: 'Closed fibre product', claim: study.passages[1].text,
        explanation: explanation('This is the selected statement. The cited proof gives its reduction.'),
        scope: 'global', citations: [citation(0), citation(1)] },
    ],
    inferences: [{ id: 'inverse-image', premises: ['diagonal'], conclusion: 'fibre', discharges: [],
      explanation: explanation('The proof identifies the fibre product as the inverse image of the diagonal. Continuity is among its printed hypotheses.'),
      citations: [citation(0)] }], goals: ['fibre'], suggested_hidden: [] };
}

test('08ZH generation copies exact selected proof and explicit 08ZE input into a URL-free attributed proposal', async () => {
  const { text, record, fibre, component } = await stacks();
  const study = proposalStudy(record, component);
  assert.equal(study.passages.length, 3);
  assert.equal(study.passages[0].text, text.slice(fibre.proof.start, fibre.proof.end));
  assert.equal(study.passages[1].text, text.slice(fibre.statement.start, fibre.statement.end));
  assert.match(study.passages[2].text, /diagonal.*closed/s);
  assert.equal(study.passages.some(passage => passage.url), false);
  assert.equal(study.passages.every(passage => passage.anchor.startsWith(record.source.revision + '#')), true);
  const schema = JSON.parse(await fs.readFile(path.join(extension, 'media/proof-outline.schema.json'), 'utf8'));
  const copied = handoff(study, schema, true);
  for (const passage of study.passages) assert.ok(copied.includes(passage.text));
  assert.match(copied, /Capture anchor:/); assert.match(copied, /Structural validation is separate from mathematical checking/);
  assert.deepEqual(sources(study).map(source => 'url' in source), [false, false, false]);
  assert.equal(copied.includes('\\label{lemma-graph-closed}'), false);
  const checked = await readProposal({ readText: async () => '```json\n' + encode(proposal(study)) + '```' }, bridge, study, true);
  assert.deepEqual(checked, proposal(study));
  assert.equal(checked.inferences[0].citations[0].source, study.passages[0].id);
});

test('atlas proposal binding rejects uncited reasons and changed approved sources or inference spans', async () => {
  const { record, component } = await stacks(), study = proposalStudy(record, component);
  for (const [change, expected] of [
    [graph => { graph.inferences[0].citations = []; }, /Cite the approved reason/],
    [graph => { graph.inferences[0].citations[0].end_line = 9999; }, /leaves its selected passage/],
    [graph => { graph.sources[0].revision = '0'.repeat(64); }, /sources differ/],
    [graph => { graph.description.author = ''; }, /author|Invalid proof outline text/],
  ]) {
    const graph = proposal(study); change(graph);
    await assert.rejects(() => readProposal({ readText: async () => encode(graph) }, bridge, study, true), expected);
  }
  assert.throws(() => proposalStudy(record, component, ['unselected-private-source']), /displayed source inputs/);
  const proofAndStatementOnly = proposalStudy(record, component, []);
  assert.equal(proofAndStatementOnly.passages.length, 2);
  assert.equal(proofAndStatementOnly.passages.some(passage => passage.text.includes('following are equivalent')), false);
});

test('approved URL-free graph and atlas publish exact quotations, reopen offline, and preserve earlier corrections after source change', async t => {
  const root = await workspace(t), { record, component, text } = await stacks();
  const corrected = editAtlas(record, { type: 'component', component: component.id, fields: {
    question: 'Where is the Hausdorff hypothesis used?', hypotheses: 'The maps are continuous and Z is Hausdorff.',
    conclusion: 'The fibre product is closed.', nextUse: 'Inspect the diagonal characterization.',
  } });
  const study = proposalStudy(corrected, corrected.components.find(item => item.id === component.id));
  const graph = await readProposal({ readText: async () => encode(proposal(study)) }, bridge, study, true);
  const output = path.join(root, 'proof.mrw-proof.json');
  await bridge({ method: 'atlas_graph_publish', project_root: root, path: output, graph,
    snapshots: Object.fromEntries(study.passages.map(passage => [passage.id, passage.text])) });
  assert.deepEqual(JSON.parse(await fs.readFile(output, 'utf8')), graph);
  for (const passage of study.passages) assert.deepEqual(await fs.readFile(path.join(root, 'study-sources', passage.sha256 + '.txt')), Buffer.from(passage.text));
  const saved = { ...corrected, graphs: { [component.id + ':0']: path.basename(output) } };
  const file = path.join(root, 'old.mrw-atlas.json'), oldBytes = encode(saved);
  await bridge({ method: 'atlas_publish', project_root: root, path: file, text: oldBytes });
  const reopened = validateAtlas(JSON.parse(await fs.readFile(file, 'utf8')));
  assert.equal(reopened.components.find(item => item.id === component.id).attribution, 'Reader');
  assert.equal(reopened.source.text, text);
  // Offline reopen performs only local record validation and pure projection.
  const projection = await bridge({ method: 'proof_graph', graph: JSON.parse(await fs.readFile(output, 'utf8')), hidden: [] });
  assert.equal(projection.graph.inferences[0].id, 'inverse-image');
  const changed = '% An editorial prefix changes the capture revision.\n' + text;
  const start = changed.indexOf('\\begin{lemma}\n\\label{lemma-fibre-product-closed}');
  const end = changed.indexOf('\\end{proof}', start) + '\\end{proof}'.length;
  const successor = { ...createAtlas({ source: { ...saved.source, text: changed, revision: digest(changed) },
    extraction: extractAtlasText(changed, 'latex', { start, end }), previous: saved }), id: randomUUID(),
    previous: { id: saved.id, file: path.basename(file) } };
  const carried = successor.components.find(item => item.id === component.id);
  assert.equal(carried.question, 'Where is the Hausdorff hypothesis used?'); assert.equal(carried.carriedFrom, saved.source.revision);
  const next = path.join(root, 'next.mrw-atlas.json');
  await bridge({ method: 'atlas_publish', project_root: root, path: next, text: encode(successor) });
  assert.equal(await fs.readFile(file, 'utf8'), oldBytes);
  assert.equal(validateAtlas(JSON.parse(await fs.readFile(next, 'utf8'))).previous.file, path.basename(file));
  await assert.rejects(() => bridge({ method: 'atlas_publish', project_root: root, path: file, text: encode(successor) }), /exists|overwrite|occupied/i);
  assert.equal(await fs.readFile(file, 'utf8'), oldBytes);
});

test('human-only source graphs retain a shared lemma and never convert its reference to an inference', async () => {
  const text = String.raw`\begin{lemma}\label{shared} A shared source lemma.\end{lemma}
\begin{theorem}\label{first} The first result.\end{theorem}
\begin{proof}Use \ref{shared}.\end{proof}
\begin{theorem}\label{second} The second result.\end{theorem}
\begin{proof}Use \ref{shared}.\end{proof}`;
  const record = atlas(text), graphFor = label => {
    const entry = record.extraction.entries.find(item => item.label === label);
    return sourceGraph(record, record.components.find(item => item.id === entry.id), 0);
  };
  const first = graphFor('first'), second = graphFor('second');
  assert.equal(first.graph.inferences.length + second.graph.inferences.length, 0);
  assert.equal(first.graph.sources.length, 2); assert.equal(second.graph.sources.length, 2);
  assert.equal(first.graph.sources[1].sha256, second.graph.sources[1].sha256);
  assert.equal(first.graph.sources[1].revision, second.graph.sources[1].revision);
  assert.equal(first.graph.sources[1].file, second.graph.sources[1].file);
  for (const generated of [first, second]) await bridge({ method: 'proof_graph', graph: generated.graph, hidden: [] });
});

test('an 80-result grouped overview opens every bounded detail page without losing original entries', async t => {
  const root = await workspace(t), text = Array.from({ length: 80 }, (_, i) => `## Lemma ${i} {#r-${i}}\n\nExact statement ${i}.\n`).join('\n');
  let record = atlas(text, undefined, 'markdown', 'file:///unpublished/chapter.md');
  record = editAtlas(record, { type: 'group', title: 'A chapter of results', components: record.components.map(item => item.id) });
  const group = overviewComponents(record)[0], page = detailPage(record, group.id);
  assert.equal(overviewComponents(record).length, 1); assert.equal(group.itemIds.length, 80); assert.equal(page.pages, 7);
  const all = [];
  for (let number = 0; number < page.pages; number++) {
    const detail = detailPage(record, group.id, number), generated = sourceGraph(record, group, number);
    all.push(...detail.entries.map(item => item.id));
    assert.ok(generated.graph.nodes.length <= 12); assert.equal(generated.graph.inferences.length, 0);
    await bridge({ method: 'atlas_graph_publish', project_root: root, path: path.join(root, `page-${number}.mrw-proof.json`),
      graph: generated.graph, snapshots: Object.fromEntries(generated.study.passages.map(passage => [passage.id, passage.text])) });
  }
  assert.deepEqual(all, record.extraction.entries.map(item => item.id)); assert.equal(new Set(all).size, 80);
  assert.equal(record.components.filter(item => !item.members).length, 80);
  assert.throws(() => sourceGraph(record, group, 7), /no entries/);
});

test('actual generated qualified 08ZH v2 references survive the existing handoff schema and proposal binding alongside v1', async t => {
  const location = await workspace(t), root = path.join(location, 'project'); await fs.mkdir(root);
  const base = { project_root: root, store: path.join(location, 'private') };
  // Only acquisition is doubled. The bundled importer, reference generator,
  // scope resolver, context freezer and proposal validator are production code.
  const offlinePrepare = request => runBridge(extension, 'python3', request, {
    spawn: (command, args, settings) => spawn(command, [args[0], path.join(extension, 'test/stacks_bridge.py')], settings),
  });
  const prepared = await offlinePrepare({ method: 'outline_stacks_prepare', ...base, input: '08ZD' });
  const loaded = await bridge({ method: 'outline_stacks_import', ...base, ticket: prepared.ticket, packet: prepared.packet });
  const publication = loaded.outline.published, selected = [];
  for (const [tag, role] of [['08ZH', 'proof'], ['08ZH', 'statement'], ['08ZE', 'statement']]) {
    const [region] = Object.entries(publication.parts).find(([, part]) => part.tag === tag && part.role === role);
    const generated = await bridge({ method: 'outline_reference', ...base, id: loaded.outline.id, revision: loaded.revision, region });
    assert.match(generated.reference, new RegExp('^mrw-outline:v2/stacks-project:' + tag + '/'));
    const { context } = await bridge({ method: 'outline_assistance_context', ...base, reference: generated.reference });
    selected.push({ reference: generated.reference, label: `${tag} ${role}`, text: context.text,
      source_revision: context.source_revision, review: 'published', authors: publication.authors,
      license: publication.license,
      url: `https://github.com/stacks/stacks-project/blob/${publication.commit}/${publication.source_file}` });
  }
  const study = { version: 1, title: '08ZH retained source', question: 'Why does Hausdorffness of Z give the closed diagonal?',
    passages: studyPassages(selected), outline: null };
  const schema = JSON.parse(await fs.readFile(path.join(extension, 'media/proof-outline.schema.json'), 'utf8'));
  const pattern = new RegExp(schema.$defs.citation.properties.reference.pattern);
  const copied = handoff(study, schema);
  for (const passage of study.passages) {
    assert.ok(pattern.test(passage.reference)); assert.ok(copied.includes(passage.reference)); assert.ok(copied.includes(passage.text));
  }
  const graph = await readProposal({ readText: async () => encode(proposal(study)) }, bridge, study, true);
  assert.equal(graph.inferences[0].citations[0].reference, selected[0].reference);
  assert.equal(graph.nodes[0].citations[0].reference, selected[2].reference);

  const local = path.join(root, 'ordinary.txt'), text = 'An ordinary retained local source.\n'; await fs.writeFile(local, text);
  const legacy = await bridge({ method: 'outline_create', ...base, path: local, source_revision: digest(text) });
  const generatedV1 = await bridge({ method: 'outline_reference', ...base, id: legacy.outline.id, revision: legacy.revision, region: null });
  assert.match(generatedV1.reference, /^mrw-outline:v1\//); assert.ok(pattern.test(generatedV1.reference));
  const tampered = proposal(study); tampered.inferences[0].citations[0].reference = generatedV1.reference;
  await assert.rejects(() => readProposal({ readText: async () => encode(tampered) }, bridge, study, true), /MRW reference/);
});

test('pre-publication review corrects the reason and joint premises while retaining the attributed original', async t => {
  const root = await workspace(t), { record, component } = await stacks(), study = proposalStudy(record, component);
  const graph = proposal(study);
  graph.nodes.unshift({ id: 'maps', title: 'Printed hypotheses', claim: study.passages[1].text,
    explanation: explanation('The proposed dependency list omitted these hypotheses.'), scope: 'global',
    citations: [{ source: study.passages[1].id, start_line: 1, end_line: study.passages[1].text.split('\n').length }] });
  const original = await readProposal({ readText: async () => encode(graph) }, bridge, study, true);
  const pending = { graph: original, original: structuredClone(original), study }, before = structuredClone(pending);
  const checked = await reviewDraft(bridge, pending, { rule: 'inverse-image', premises: ['maps', 'diagonal'],
    reason: 'Z is the Hausdorff space. Hence its diagonal is closed by 08ZE. Continuity of f and g makes their product map continuous, and the fibre product is its inverse image of the diagonal.',
    author: 'Reader' });
  assert.deepEqual(pending, before); assert.deepEqual(checked.original, original);
  assert.deepEqual(checked.graph.inferences[0].premises, ['maps', 'diagonal']);
  assert.equal(checked.graph.inferences[0].explanation.origin, 'human');
  assert.equal(checked.graph.inferences[0].explanation.author, 'Reader');
  assert.match(checked.graph.inferences[0].explanation.text, /^Z is the Hausdorff space/);
  assert.equal(checked.original.inferences[0].explanation.origin, 'ai_proposal');
  assert.deepEqual(await fs.readdir(root), [], 'review checks create no published graph');
  for (const change of [
    { rule: 'inverse-image', premises: ['not-in-the-proposal'], reason: 'Unapproved premise.', author: 'Reader' },
    { rule: 'inverse-image', premises: ['fibre'], reason: 'A circular route.', author: 'Reader' },
    { rule: 'inverse-image', premises: ['maps'], reason: 'A reason with no author.', author: '' },
  ]) {
    await assert.rejects(() => reviewDraft(bridge, checked, change));
    assert.deepEqual(checked.original, original);
  }
  const withAlternative = await reviewDraft(bridge, checked, { conclusion: 'fibre', premises: ['maps', 'diagonal'],
    source: study.passages[0].id, reason: 'A second reader presentation of the same cited inverse-image reduction.', author: 'Reader' }, true);
  assert.equal(withAlternative.graph.inferences.length, 2);
  assert.equal(withAlternative.graph.inferences[1].citations[0].source, study.passages[0].id);
  assert.deepEqual(withAlternative.original, original);
  const snapshots = Object.fromEntries(study.passages.map(passage => [passage.id, passage.text]));
  for (const [name, accepted] of [['original', original], ['corrected', withAlternative.graph]]) {
    await bridge({ method: 'atlas_graph_publish', project_root: root, path: path.join(root, `${name}.mrw-proof.json`), graph: accepted, snapshots });
  }
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, 'original.mrw-proof.json'), 'utf8')), original);
  assert.match(JSON.parse(await fs.readFile(path.join(root, 'corrected.mrw-proof.json'), 'utf8')).inferences[0].explanation.text, /^Z is the Hausdorff space/);
});

test('pinned Lean 08ZH generates exact source evidence without an elaborated dependency claim', async () => {
  const { inspectLeanSource } = require('../src/atlasLean');
  const text = await fs.readFile(path.join(__dirname, 'fixtures/atlas-lean/axiom-stacks/FibreProduct.lean'), 'utf8');
  const source = inspectLeanSource({ source: text, declaration: 'fibreProduct_isClosed',
    selection: { start: text.indexOf('theorem fibreProduct_isClosed'), end: text.length } });
  assert.equal(source.observations, 'source-only');
  assert.equal(source.proofValue, 'unavailable');
  assert.equal(source.valueConstants, null);
  assert.match(text.slice(source.sourceSpan.start, source.proofSpan.start), /\[T2Space Z\]/);
  assert.match(text.slice(source.proofSpan.start, source.proofSpan.end),
    /isClosed_eq \(hf\.comp continuous_fst\) \(hg\.comp continuous_snd\)/);
  const fixture = JSON.parse(await fs.readFile(path.join(__dirname, '../../tests/fixtures/proof_graph_08zh.json'), 'utf8'));
  assert.ok(fixture.sources.some(entry => entry.sha256 === source.sourceDigest));
});
