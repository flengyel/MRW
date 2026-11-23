'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { digest } = require('../src/navigation');
const { extractAtlasText } = require('../src/atlasText');
const { DETAIL_LIMIT, createAtlas, validateAtlas, editAtlas, overviewComponents, detailPage, handoffEntries, evidenceSpan } = require('../src/atlasModel');
const { atlasHtml } = require('../src/atlasView');

function source(text, language = 'markdown') {
  return { title: 'Reading copy', uri: 'file:///workspace/reading', language, revision: digest(text), text };
}

function fromText(text, previous) {
  return createAtlas({ source: source(text, 'latex'), extraction: extractAtlasText(text, 'latex'), previous });
}

const shared = String.raw`\begin{lemma}[Shared result]
\label{lem:shared}
Every witness satisfies the condition.
\end{lemma}

\begin{theorem}[First result]
\label{thm:first}
The first assertion holds.
\end{theorem}
\begin{proof}
Apply Lemma \ref{lem:shared} with the first witness.
\end{proof}

\begin{theorem}[Second result]
\label{thm:second}
The second assertion holds.
\end{theorem}
\begin{proof}
Apply Lemma \ref{lem:shared} with the second witness.
The other reason is recorded in \cite{UnavailableBook}.
\end{proof}
`;

const byLabel = (atlas, label) => atlas.extraction.entries.find(entry => entry.label === label);
const quote = (atlas, request) => {
  const span = evidenceSpan(atlas, request);
  return atlas.source.text.slice(span.start, span.end);
};

test('two exact reference occurrences lead to one shared lemma and remain distinct from a missing reason', () => {
  const atlas = fromText(shared);
  const lemma = byLabel(atlas, 'lem:shared');
  const first = byLabel(atlas, 'thm:first');
  const second = byLabel(atlas, 'thm:second');
  const resolved = atlas.extraction.references.filter(ref => ref.status === 'resolved');
  assert.deepEqual(resolved.map(ref => ref.target), [lemma.id, lemma.id]);
  assert.deepEqual(resolved.map(ref => ref.owner), [first.id, second.id]);
  assert.notEqual(evidenceSpan(atlas, { reference: resolved[0].id }).start, evidenceSpan(atlas, { reference: resolved[1].id }).start);
  assert.equal(quote(atlas, { reference: resolved[0].id }), '\\ref{lem:shared}');
  assert.match(quote(atlas, { entry: second.id, part: 'proof' }), /with the second witness/);
  const lemmaView = atlasHtml(null, atlas, { component: lemma.id });
  assert.match(lemmaView, /Explicitly referenced by/);
  assert.ok(resolved.every(ref => lemmaView.includes('data-reference="' + ref.id + '"')));
  const secondView = atlasHtml(null, atlas, { component: second.id });
  assert.ok(secondView.includes('data-entry="' + lemma.id + '"'));
  assert.match(secondView, /Reference target missing[\s\S]*?UnavailableBook/);
  assert.match(secondView, /Missing reason\. No inference has been recorded/);
});

test('an initial 08ZH overview quotes the explicit assumptions and conclusion from the pinned TeX', async () => {
  const text = await fs.readFile(path.resolve(__dirname, '../../tests/fixtures/stacks/topology.tex'), 'utf8');
  const start = text.indexOf('\\begin{lemma}\n\\label{lemma-fibre-product-closed}');
  const end = text.indexOf('\\end{proof}', start) + '\\end{proof}'.length;
  const atlas = createAtlas({ source: source(text, 'latex'), extraction: extractAtlasText(text, 'latex', { start, end }) });
  const html = atlasHtml(null, atlas);
  assert.match(html, /<dt>Question<\/dt><dd><p>What does Lemma \(lemma-fibre-product-closed\) establish\?/);
  assert.match(html, /<dt>Hypotheses<\/dt><dd><p>From the statement<\/p><pre>Let \$X[\s\S]*?If \$Z\$ is Hausdorff/);
  assert.match(html, /<dt>Conclusion<\/dt><dd><p>From the statement<\/p><pre>\$X \\times_Z Y\$ is closed in \$X \\times Y\$\./);
  assert.ok(html.includes('data-part="statement"'));
});

test('corrections follow uniquely matching exact evidence and stop following a changed prerequisite', () => {
  const atlas = fromText(shared);
  const result = byLabel(atlas, 'thm:first');
  const correction = 'Use the first witness in the shared lemma.';
  const edited = editAtlas(atlas, { type: 'component', component: result.id, fields: { conclusion: correction, question: 'Which witness enters?' } });
  assert.equal(atlas.components.find(item => item.id === result.id).conclusion, '');
  const relocated = fromText('A separate introduction.\n\n' + shared, edited);
  const retained = relocated.components.find(item => item.id === result.id);
  assert.equal(retained.conclusion, correction);
  assert.equal(retained.attribution, 'Reader');
  assert.equal(retained.carriedFrom, edited.source.revision);
  assert.match(atlasHtml(null, relocated), /Which witness enters\?/);
  const changed = fromText(shared.replace('Every witness', 'Every positive witness'), edited);
  assert.equal(changed.components.find(item => item.id === result.id).conclusion, '');
  assert.equal(edited.components.find(item => item.id === result.id).conclusion, correction);
  assert.throws(() => validateAtlas({ ...atlas, source: { ...atlas.source, text: 'Changed content' } }), /invalid/);
});

test('cited statement and proof remain separate handoff choices, with an exact return site', () => {
  const text = shared.replace('\\end{lemma}', '\\end{lemma}\n\\begin{proof}\nA witness supplies the condition.\n\\end{proof}');
  const atlas = fromText(text);
  const first = byLabel(atlas, 'thm:first'), lemma = byLabel(atlas, 'lem:shared');
  const html = atlasHtml(null, atlas, { component: first.id });
  assert.ok(lemma.proof);
  assert.match(html, /Open cited statement/);
  assert.match(html, /data-return-entry="/);
  assert.ok(html.includes('data-handoff value="' + lemma.id + '"'));
  assert.ok(html.includes('data-handoff-proof value="' + lemma.id + '"'));
  assert.doesNotMatch(html, /data-handoff-proof[^>]* checked/);
  assert.match(html, /data-type="startDraft"/);
});

test('a group of more than 64 passages keeps source order and links twelve-passage detail pages', () => {
  const count = 70;
  const text = Array.from({ length: count }, (_, i) => 'Passage ' + (i + 1)).join('\n');
  const entries = text.split('\n').map((title, i, all) => {
    const start = i === 0 ? 0 : all.slice(0, i).join('\n').length + 1;
    return { id: 'p-' + (i + 1), kind: 'prose', title, start, end: start + title.length, selected: true };
  });
  const atlas = createAtlas({ source: source(text), extraction: { entries, references: [], selection: { start: 0, end: text.length } } });
  const grouped = editAtlas(atlas, { type: 'group', title: 'A long composite argument',
    components: entries.map(entry => entry.id).reverse() });
  const [group] = overviewComponents(grouped);
  assert.equal(overviewComponents(grouped).length, 1);
  assert.deepEqual(group.members, entries.map(entry => entry.id));
  assert.equal(DETAIL_LIMIT, 12);
  const reached = [];
  for (let page = 0; page < 6; page++) {
    const detail = detailPage(grouped, group.id, page);
    assert.equal(detail.pages, 6);
    assert.ok(detail.entries.length <= DETAIL_LIMIT);
    reached.push(...detail.entries.map(entry => entry.id));
    const render = atlasHtml(null, grouped, { component: group.id, page });
    if (page < 5) assert.ok(render.includes('data-page="' + (page + 1) + '">Next passages'));
    assert.ok(render.includes('data-page="' + page + '">Write an outline'));
  }
  assert.deepEqual(reached, entries.map(entry => entry.id));
  assert.equal(grouped.components.find(item => item.id === 'p-65').title, 'Passage 65');
  const handoff = handoffEntries(grouped, group.id, 5);
  assert.equal(handoff.primary.id, 'p-61');
  assert.deepEqual(handoff.optional.map(item => item.id), entries.slice(61).map(item => item.id));
});

test('the handoff lists additional page passages and resolved cited targets once', () => {
  const atlas = fromText(shared);
  const lemma = byLabel(atlas, 'lem:shared');
  const first = byLabel(atlas, 'thm:first');
  const second = byLabel(atlas, 'thm:second');
  const grouped = editAtlas(atlas, { type: 'group', title: 'Two uses', components: [first.id, second.id] });
  const [group] = grouped.components.filter(item => item.members);
  const { primary, optional } = handoffEntries(grouped, group.id, 0);
  assert.equal(primary.id, first.id);
  assert.deepEqual(optional.map(item => item.id), [lemma.id, second.id]);
  const html = atlasHtml(null, grouped, { component: group.id });
  const values = [...html.matchAll(/data-handoff value="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(values, [lemma.id, second.id]);
});

test('Lean is read as retained source text', () => {
  const text = 'theorem demo : True := by\n  exact True.intro\n';
  const statement = { start: 0, end: text.indexOf(':=') };
  const item = { id: 'demo', kind: 'theorem', title: 'demo', ...{ start: 0, end: text.trimEnd().length },
    statement, selected: true };
  const extraction = { entries: [item], references: [], selection: { start: 0, end: text.length } };
  const atlas = createAtlas({ source: source(text, 'lean'), extraction });
  assert.equal(quote(atlas, { entry: item.id, part: 'statement' }), 'theorem demo : True ');
  const html = atlasHtml(null, atlas);
  assert.match(html, /theorem demo : True/);
  assert.match(html, /data-part="statement"/);
  assert.doesNotMatch(html, /Elaborated declaration type|Direct constants|Local proof steps/);
});

test('review displays the attributed joint premises and escapes captured and proposed text', () => {
  const atlas = fromText(shared.replace('The first assertion holds.', 'The first assertion holds. </script><img src=x>'));
  const component = byLabel(atlas, 'thm:first').id;
  const citations = [{ source: 'src', start_line: 2, end_line: 3 }];
  const aiRule = { id: 'rule', premises: ['b'], conclusion: 'c',
    explanation: { author: 'Fixture AI', text: 'Use B.', origin: 'ai_proposal' }, discharges: ['b'], citations };
  const correctedRule = { ...aiRule, premises: ['a', 'b'],
    explanation: { author: 'Fixture author', text: 'Use A and B.', origin: 'human' } };
  const graph = { nodes: [
    { id: 'a', title: 'Premise A', claim: 'A', citations }, { id: 'b', title: 'Premise B', claim: 'B' },
    { id: 'c', title: 'Claim C', claim: 'C<script>' },
  ], inferences: [correctedRule, { ...aiRule, id: 'alternative', citations: [] }],
    sources: [{ id: 'src', title: 'Exact source' }] };
  const proposal = { graph, original: { ...graph, inferences: [aiRule] }, corrected: true,
    study: { passages: [{ id: 'src', text: 'Opening\r\nEvidence <here>\r\nMore evidence\nEnd' }] } };
  const html = atlasHtml(null, atlas, { component, proposal, previous: true });
  assert.ok(html.includes('&lt;/script&gt;&lt;img src=x&gt;'));
  assert.ok(html.includes('C&lt;script&gt;'));
  assert.doesNotMatch(html, /<img /);
  assert.match(html, /Joint premises<\/strong> Premise A \+ Premise B/);
  assert.match(html, /Corrected outline/);
  assert.match(html, /Written by Fixture author/);
  assert.match(html, /Original proposal for this inference[\s\S]*Proposal by Fixture AI/);
  assert.match(html, /Alternative 1 of 2[\s\S]*Alternative 2 of 2/);
  assert.match(html, /No retained citation for this inference\./);
  assert.match(html, /Exact source · lines 2–3[\s\S]*Evidence &lt;here&gt;\nMore evidence/);
  assert.match(html, /data-change="editInference"/);
  assert.match(html, /data-change="addInference"/);
  assert.match(html, /name="source" required/);
  assert.match(html, /data-type="acceptProposal"/);
  assert.match(html, /Discharges b/);
  assert.match(html, /data-focus="proposal-title"/);
  assert.match(html, /data-type="openPrevious"/);
});
