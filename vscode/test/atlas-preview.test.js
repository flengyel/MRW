'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { digest } = require('../src/navigation');
const { extractAtlasText } = require('../src/atlasText');
const { createAtlas, evidenceSpan } = require('../src/atlasModel');
const { atlasDiagram } = require('../src/atlasDiagram');
const { atlasHtml } = require('../src/atlasView');
const { preview, texPreviewContext } = require('../src/atlasPreview');

test('the Stacks atlas renders the 08ZE list and the 08ZH proof with exact source actions', async () => {
  const text = await fs.readFile(path.resolve(__dirname, '../../tests/fixtures/stacks/topology.tex'), 'utf8');
  const start = text.indexOf('\\begin{lemma}\n\\label{lemma-fibre-product-closed}');
  const end = text.indexOf('\\end{proof}', start) + '\\end{proof}'.length;
  const source = { title: 'Topology', uri: 'file:///workspace/topology.tex', language: 'latex', text, revision: digest(text) };
  const atlas = createAtlas({ source, extraction: extractAtlasText(text, 'latex', { start, end }) });
  const original = structuredClone(atlas);
  const ze = atlas.extraction.entries.find(entry => entry.label === 'lemma-Hausdorff');
  const zh = atlas.extraction.entries.find(entry => entry.label === 'lemma-fibre-product-closed');
  const detail = atlasHtml(null, atlas, { component: ze.id });
  assert.match(detail, /following are equivalent:<\/p><ol><li><p><span class="katex"><math/);
  assert.match(detail, /is Hausdorff,<\/p><\/li><li><p>the diagonal <span class="katex"><math/);
  assert.doesNotMatch(detail, /\\begin\{enumerate\}|atlas-raw-math"/);
  const map = atlasHtml(null, atlas, { view: 'map', diagram: atlasDiagram(atlas, 'map', { selected: 'component:' + ze.id }) });
  const inspector = /<aside class="diagram-inspector"[\s\S]*?<\/aside>/.exec(map)[0];
  assert.match(inspector, /<ol><li><p><span class="katex"><math/);
  assert.match(inspector, new RegExp('data-entry="' + ze.id + '" data-part="statement"'));
  const blueprint = atlasHtml(null, atlas, { view: 'blueprint',
    diagram: atlasDiagram(atlas, 'blueprint', { selected: 'entry:' + zh.id + ':proof' }) });
  const proofInspector = /<aside class="diagram-inspector"[\s\S]*?<\/aside>/.exec(blueprint)[0];
  assert.match(proofInspector, /inverse image of <span class="katex"><math/);
  assert.match(proofInspector, /\[lemma-Hausdorff\]/);
  assert.match(proofInspector, new RegExp('data-entry="' + zh.id + '" data-part="proof"'));
  const bounds = evidenceSpan(atlas, { entry: zh.id, part: 'proof' });
  assert.match(atlas.source.text.slice(bounds.start, bounds.end), /^\\begin\{proof\}[\s\S]*\\ref\{lemma-Hausdorff\}/);
  assert.deepEqual(atlas, original);
});

test('supported prose, lists and formulas render offline in TeX and Markdown', () => {
  const tex = String.raw`Text with \emph{emphasis}, $x$, \(y\) and \[x^2\].

\begin{itemize}
\item A
\begin{enumerate}
\item B
\end{enumerate}
\item C
\end{itemize}`;
  const html = preview(tex, 'latex', 4096);
  assert.match(html, /<em>emphasis<\/em>/);
  assert.match(html, /<ul><li><p>A<\/p><ol><li><p>B<\/p><\/li><\/ol><\/li><li><p>C<\/p><\/li><\/ul>/);
  assert.equal((html.match(/<math\b/g) || []).length, 3);
  assert.match(html, /<math[^>]* display="block"/);
  const md = preview(String.raw`# Statement

- An *assumption* $X \times Y$.
- A formula \(Z\).

Prices are $40 and $50.

` + '\x60$x$\x60', 'markdown', 4096);
  assert.match(md, /<h1>Statement<\/h1>/);
  assert.match(md, /<ul>[\s\S]*?<li>An <em>assumption<\/em> <span class="katex"><math/);
  assert.match(md, /Prices are \$40 and \$50\./);
  assert.match(md, /<code>\$x\$<\/code>/);
  assert.equal((md.match(/<math\b/g) || []).length, 2);
});

test('unknown structure and unsafe math stay visible as inert exact text', () => {
  const tex = String.raw`\begin{tikzpicture}<img src="https://example.org/test" onerror="alert(1)">\end{tikzpicture}`;
  const fallback = preview(tex, 'latex', 4096);
  assert.match(fallback, /Preview unavailable/);
  assert.match(fallback, /<pre>\\begin\{tikzpicture\}&lt;img /);
  const unsafe = preview(String.raw`$x$ and $\href{https://example.org/test}{X}$.`, 'latex', 4096);
  assert.match(unsafe, /<math\b/);
  assert.match(unsafe, /<code class="atlas-raw-math"[^>]*>\$\\href\{/);
  const markdown = preview('[Link](https://example.org) ![Image](https://example.org/img.png) <script>alert(1)</script>', 'markdown', 4096);
  assert.match(markdown, /&lt;script&gt;/);
  for (const html of [fallback, unsafe, markdown]) assert.doesNotMatch(html, /<img\b|<script\b|<a\b|<(?:span|math)[^>]*\shref=/);
  const longer = preview(String.raw`\begin{proof}A long proof cannot be previewed in full.\end{proof}`, 'latex', 25);
  assert.match(longer, /<pre>[\s\S]*?Open the exact source to read the remainder/);
});

test('literal TeX preamble commands are scoped to display and citations remain inert', () => {
  const text = String.raw`\newcommand{\PA}{\mathrm{PA}}
\newcommand{\pair}[2]{(#1,#2)}
\newcommand{\bad}{\href{https://example.org}{X}}
\begin{document}`;
  const exact = String.raw`\noindent\textit{A source.} See \cite[p.~267]{Feferman}.
\begin{align}
\PA\vdash \pair{x}{y} \label{eq:display}
\end{align}
And $\bad$.`;
  const rendered = preview(exact, 'latex', 4096, texPreviewContext(text));
  assert.match(rendered, /<em>A source\.<\/em>/);
  assert.match(rendered, /<span class="atlas-inline-reference">\[Feferman, p\. 267\]<\/span>/);
  assert.match(rendered, /<math[^>]* display="block"/);
  assert.match(rendered, /<mi mathvariant="normal">P<\/mi><mi mathvariant="normal">A<\/mi>/);
  assert.doesNotMatch(rendered, /\\label\{eq:display\}|<a\b|\shref=/);
  assert.match(rendered, /<code class="atlas-raw-math"[^>]*>\$\\bad\$/);
  assert.match(preview(String.raw`$\PA$`, 'latex', 4096), /atlas-raw-math/);
});

test('the v38 manuscript opens on numbered results and a readable one-page map while retaining prose', async () => {
  const text = await fs.readFile(path.join(__dirname, 'fixtures/failure-of-composition-v38.tex'), 'utf8');
  const source = { title: 'Pointwise provable equality', uri: 'file:///workspace/v38.tex', language: 'latex', text, revision: digest(text) };
  const atlas = createAtlas({ source, extraction: extractAtlasText(text, 'latex') });
  const before = structuredClone(atlas);
  const resultTitles = ['Theorem 1', 'Corollary 2', 'Theorem 3', 'Theorem 4', 'Proposition 5', 'Proposition 6'];
  const html = atlasHtml(null, atlas, { view: 'list' });
  const names = Array.from(html.matchAll(/<h2><button [^>]*id="component-[^"]+">([^<]+)<\/button><\/h2>/gu), match => match[1]);
  assert.deepEqual(names.slice(0, 6), resultTitles);
  assert.match(html, /Show prose|class="atlas-section"/);
  assert.match(html, /<code class="muted">thm:characterization<\/code>/);
  assert.match(html, /For every consistent recursively enumerable [\s\S]*?<math/);
  assert.doesNotMatch(html, /Preview unavailable|No question recorded|See the statement for the stated conditions/);
  const viewport = { width: 760, height: 460 };
  const diagram = atlasDiagram(atlas, 'map', { readable: true, viewport });
  assert.equal(diagram.pageCount, 1);
  assert.deepEqual(diagram.nodes.filter(node => resultTitles.includes(node.title)).map(node => node.title), resultTitles);
  assert.ok(diagram.nodes.some(node => atlas.extraction.entries.find(entry => entry.id === node.entryId)?.label === 'eq:graph-realization'));
  assert.ok(diagram.nodes.every(node => !['prose', 'section', 'bibliography'].includes(node.kind)));
  assert.ok(Math.min((viewport.width - 40) / diagram.width, (viewport.height - 40) / diagram.height) >= diagram.minimumScale);
  const narrow = atlasDiagram(atlas, 'map', { readable: true, viewport: {width: 340, height: 360} });
  assert.equal(narrow.total, diagram.total);
  assert.ok(narrow.pageCount > 1);
  const expanded = atlasHtml(null, atlas, { view: 'list', showProse: true });
  assert.match(expanded, /Hide prose/);
  assert.match(expanded, /\[Feferman, p\. 267\]/);
  assert.ok(atlas.extraction.references.some(reference => reference.label === 'eq:graph-realization' && reference.status === 'resolved'));
  assert.deepEqual(atlas, before);
});
