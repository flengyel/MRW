'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { digest } = require('../src/navigation');
const { readAtlasAux } = require('../src/atlasAux');
const { extractAtlasText } = require('../src/atlasText');

function spans(text, result) {
  const ids = new Set(result.entries.map(n => n.id));
  assert.equal(ids.size, result.entries.length);
  for (const node of result.entries) {
    assert.ok(node.start >= 0 && node.end > node.start && node.end <= text.length, node.title);
    for (const span of [node.statement, node.proof].filter(Boolean)) assert.ok(node.start <= span.start && span.start <= span.end && span.end <= node.end, node.title);
  }
  for (const ref of result.references) {
    assert.equal(text.slice(ref.start, ref.end), ref.raw);
    if (ref.owner) assert.ok(ids.has(ref.owner));
    if (ref.target) assert.ok(ids.has(ref.target));
    for (const id of ref.candidates || []) assert.ok(ids.has(id));
  }
}

test('selected pinned Stacks 08ZH extracts its statement and proof and follows the actual 08ZE citation', async () => {
  const text = await fs.readFile(path.resolve(__dirname, '../../tests/fixtures/stacks/topology.tex'), 'utf8');
  const start = text.indexOf('\\begin{lemma}\n\\label{lemma-fibre-product-closed}');
  const end = text.indexOf('\\end{proof}', start) + '\\end{proof}'.length;
  const result = extractAtlasText(text, 'latex', { start, end });
  assert.deepEqual(result.entries.map(n => n.label), ['lemma-Hausdorff', 'lemma-fibre-product-closed']);
  const [diagonal, fibre] = result.entries;
  assert.equal(diagonal.selected, false); assert.equal(diagonal.referenced, true); assert.ok(diagonal.end < start);
  assert.equal(fibre.selected, true); assert.equal(fibre.referenced, false);
  assert.match(text.slice(diagonal.statement.start, diagonal.statement.end), /the diagonal.*closed/s);
  assert.match(text.slice(fibre.statement.start, fibre.statement.end), /If \$Z\$ is Hausdorff/);
  assert.match(text.slice(fibre.proof.start, fibre.proof.end), /inverse image of \$\\Delta\(Z\)\$/);
  assert.equal(result.references.length, 1); assert.equal(result.references[0].label, 'lemma-Hausdorff');
  assert.equal(result.references[0].owner, fibre.id); assert.equal(result.references[0].target, diagonal.id);
  assert.equal(result.references[0].status, 'resolved');
  assert.equal(result.references[0].raw, '\\ref{lemma-Hausdorff}');
  assert.deepEqual(result.selection, { start, end }); spans(text, result);
  // The fixture's independent publication map identifies these anchors. The
  // extractor receives only TeX and never the prepared proof-graph example.
  const tags = await fs.readFile(path.resolve(__dirname, '../../tests/fixtures/stacks/tags'), 'utf8');
  assert.match(tags, /^08ZE,topology-lemma-Hausdorff$/m); assert.match(tags, /^08ZH,topology-lemma-fibre-product-closed$/m);
});

test('renaming the cited source label changes 08ZH resolution rather than consulting a prepared graph', async () => {
  const original = await fs.readFile(path.resolve(__dirname, '../../tests/fixtures/stacks/topology.tex'), 'utf8');
  const extract = text => {
    const start = text.indexOf('\\begin{lemma}\n\\label{lemma-fibre-product-closed}');
    return extractAtlasText(text, 'latex', { start, end: text.indexOf('\\end{proof}', start) + '\\end{proof}'.length });
  };
  const renamed = original.replace('\\label{lemma-Hausdorff}', '\\label{lemma-renamed-diagonal}');
  const missing = extract(renamed);
  assert.equal(missing.references[0].status, 'missing'); assert.equal(missing.references[0].target, undefined);
  assert.deepEqual(missing.entries.map(n => n.label), ['lemma-fibre-product-closed']);
  const repaired = renamed.replaceAll('\\ref{lemma-Hausdorff}', '\\ref{lemma-renamed-diagonal}');
  const resolved = extract(repaired);
  assert.equal(resolved.references[0].status, 'resolved');
  assert.equal(resolved.entries.find(n => n.id === resolved.references[0].target).label, 'lemma-renamed-diagonal');
  spans(repaired, resolved);
});

test('prose-only LaTeX keeps definitions, examples and unresolved citations in source order', () => {
  const text = String.raw`\section{Basic objects}
\label{sec:basic}

We first describe the objects; see \cite{UnavailableBook}.

\begin{definition}[Finite family]
\label{def:family}
A finite family is indexed by a finite set.
\end{definition}

\begin{example}
\label{ex:empty}
The empty family is finite.
\end{example}

The example uses Definition \ref{def:family}.
`;
  const result = extractAtlasText(text, 'latex');
  assert.deepEqual(result.entries.map(n => n.kind), ['section', 'prose', 'definition', 'example', 'prose']);
  assert.equal(result.entries.some(n => n.proof), false);
  const citation = result.references.find(n => n.kind === 'citation');
  assert.equal(citation.label, 'UnavailableBook'); assert.equal(citation.status, 'missing');
  assert.equal(result.references.find(n => n.label === 'def:family').target, result.entries.find(n => n.kind === 'definition').id);
  spans(text, result);
});

test('Markdown reads exact unsaved BOM/CRLF text, named blocks and local references without code examples', () => {
  const text = '\uFEFF---\r\ntitle: Draft α😀\r\n---\r\n# Basic objects\r\n\r\n' +
    '**Definition.** A family is finite if its index set is finite. {#finite}\r\n\r\n' +
    '**Example.** The empty family is finite.\r\n\r\n' +
    'See the [definition](#finite), [missing result](#absent), and [@MissingBook].\r\n\r\n' +
    '`[@Code]` <!-- [@Hidden] -->\r\n\r\n```md\n# Fake theorem\n[@Fenced]\n```\r\n';
  const result = extractAtlasText(text, 'markdown');
  assert.deepEqual(result.entries.slice(0, 4).map(n => n.kind), ['section', 'definition', 'example', 'prose']);
  assert.equal(result.entries[0].start, text.indexOf('# Basic'));
  assert.deepEqual(result.references.map(n => n.label), ['finite', 'absent', 'MissingBook']);
  assert.deepEqual(result.references.map(n => n.status), ['resolved', 'missing', 'missing']);
  assert.equal(result.references[0].target, result.entries.find(n => n.kind === 'definition').id);
  spans(text, result);
});

test('explicit duplicate labels stay ambiguous at each occurrence and do not select a plausible lemma', () => {
  const text = String.raw`\begin{lemma}\label{same} First statement.\end{lemma}
\begin{lemma}\label{same} Second statement.\end{lemma}
\begin{theorem}\label{last} Conclusion.\end{theorem}
\begin{proof}See \cref{same,missing}.\end{proof}`;
  const start = text.indexOf('\\begin{theorem}'), result = extractAtlasText(text, 'latex', { start, end: text.length });
  const ambiguous = result.references.find(n => n.label === 'same'), missing = result.references.find(n => n.label === 'missing');
  assert.equal(ambiguous.status, 'ambiguous'); assert.equal(ambiguous.candidates.length, 2); assert.equal(ambiguous.target, undefined);
  assert.equal(missing.status, 'missing');
  assert.equal(result.entries.filter(n => n.candidate).length, 2);
  assert.equal(result.entries.filter(n => n.selected).length, 1);
  for (const ref of result.references) assert.equal(text.slice(ref.labelStart, ref.labelEnd), ref.label);
  spans(text, result);
});

test('same-document reference closure is cycle-safe and shared lemmas keep one source identity', () => {
  const text = String.raw`\begin{lemma}\label{base} Base; compare \ref{cycle}.\end{lemma}
\begin{lemma}\label{cycle} Cycle; compare \ref{base}.\end{lemma}
\begin{theorem}\label{one} First conclusion.\end{theorem}
\begin{proof}Use \ref{base}.\end{proof}
\begin{theorem}\label{two} Second conclusion.\end{theorem}
\begin{proof}Use \ref{base}.\end{proof}`;
  const start = text.indexOf('\\begin{theorem}'), result = extractAtlasText(text, 'latex', { start, end: text.length });
  const base = result.entries.find(n => n.label === 'base');
  assert.equal(result.entries.length, 4); assert.equal(base.selected, false); assert.equal(base.referenced, true);
  assert.equal(result.references.filter(n => n.label === 'base').length, 3);
  assert.ok(result.references.filter(n => n.label === 'base').every(n => n.target === base.id));
  spans(text, result);
});

test('partial selections retain full source anchors while marking exactly what was selected', () => {
  const text = '# Draft\n\nA λ😀 paragraph cites [one](#draft) and [two](#missing).\n';
  const start = text.indexOf('λ'), end = text.indexOf(' and');
  const result = extractAtlasText(text, 'markdown', { start, end });
  const prose = result.entries.find(n => n.kind === 'prose');
  assert.equal(prose.partial, true); assert.deepEqual(prose.selectedRange, { start, end });
  assert.equal(text.slice(prose.selectedRange.start, prose.selectedRange.end), 'λ😀 paragraph cites [one](#draft)');
  assert.deepEqual(result.references.map(n => n.label), ['draft']);
  assert.equal(result.entries.find(n => n.kind === 'section').selected, false);
  assert.ok(result.limitations.some(n => n.includes('extend beyond the selection'))); spans(text, result);
});

test('literal LaTeX theorem declarations and nested proofs retain exact statement/proof boundaries', () => {
  const text = String.raw`\newtheorem{result}{Lemma}
\begin{result}[A local result]\label{local}
Let $x=x$.
\begin{proof}By reflexivity.\end{proof}
\end{result}
\section{Use}\label{use}
Apply \ref{local}.`;
  const result = extractAtlasText(text, 'latex'), lemma = result.entries.find(n => n.label === 'local');
  assert.equal(lemma.kind, 'lemma'); assert.equal(lemma.title, 'A local result');
  assert.equal(text.slice(lemma.statement.start, lemma.statement.end).trimEnd(), String.raw`\begin{result}[A local result]\label{local}
Let $x=x$.`);
  assert.equal(text.slice(lemma.proof.start, lemma.proof.end), String.raw`\begin{proof}By reflexivity.\end{proof}`);
  assert.equal(result.references[0].target, lemma.id); spans(text, result);
});

test('comments, verbatim, escaped commands and verb are never reference or theorem inputs', () => {
  const text = String.raw`% \begin{lemma}\label{comment}\ref{hidden}\end{lemma}
\verb|\ref{verb}| and a literal \\ref{escaped}.
\begin{verbatim}
\begin{lemma}\label{fake}\ref{fake}\end{lemma}
\end{verbatim}
\begin{lemma}\label{real} A real statement.\end{lemma}
\begin{proof}Use \ref{missing}. % \ref{commented}
\end{proof}`;
  const result = extractAtlasText(text, 'latex');
  assert.deepEqual(result.references.map(n => n.label), ['missing']);
  assert.deepEqual(result.entries.filter(n => n.kind === 'lemma').map(n => n.label), ['real']);
  spans(text, result);
});

test('local Markdown headings, duplicate anchors and external references remain distinct', () => {
  const text = '# A λ result\n\n# A λ result\n\n' +
    '[first](#a-%CE%BB-result) [second](#a-%CE%BB-result-1) [[#a-λ-result]] [outside](other.md#x)\n';
  const result = extractAtlasText(text, 'markdown');
  assert.deepEqual(result.references.map(n => n.status), ['resolved', 'resolved', 'resolved', 'external']);
  assert.equal(result.references[0].target, result.references[2].target);
  assert.notEqual(result.references[0].target, result.references[1].target);
  assert.ok(result.limitations.some(n => n.includes('not fetched'))); spans(text, result);
});

test('more than 64 source entries remain available for bounded component graphs', () => {
  const text = Array.from({ length: 80 }, (_, i) => `## Lemma ${i} {#lemma-${i}}\n\nStatement ${i}.\n`).join('\n');
  const result = extractAtlasText(text, 'markdown');
  assert.equal(result.entries.length, 80); assert.equal(result.entries.at(-1).label, 'lemma-79');
  assert.equal(result.entries.every(n => n.selected), true); spans(text, result);
});

test('unclosed supported environments and selection/size limits are explicit', () => {
  const text = String.raw`\section{Draft}
\begin{lemma}\label{unfinished} Unfinished statement.\ref{unknown}`;
  const result = extractAtlasText(text, 'latex');
  assert.equal(result.entries.find(n => n.label === 'unfinished').incomplete, true);
  assert.ok(result.limitations.some(n => n.includes('Unclosed lemma')));
  assert.equal(result.references[0].status, 'missing'); spans(text, result);
  for (const range of [{ start: -1, end: 1 }, { start: 5, end: 2 }, { start: 0, end: text.length + 1 }, { start: 0.5, end: 1 }]) {
    assert.throws(() => extractAtlasText(text, 'latex', range), /UTF-16 range/);
  }
  assert.throws(() => extractAtlasText('x'.repeat(4 * 1024 * 1024 + 1), 'markdown'), /4 MiB/);
  assert.throws(() => extractAtlasText('theorem x := rfl', 'lean'), /Markdown and LaTeX/);
});

test('macro definitions and command-name prefixes are not displayed mathematical statements or references', () => {
  const text = String.raw`\newcommand{\fake}[1]{\begin{lemma}\label{not-real}\ref{hidden}\end{lemma}}
\def\other#1{\ref{also-hidden}}
\referencename{A caption}
\begin{lemma}\label{actual} A displayed statement.\end{lemma}
\begin{proof}Use \ref{missing}.\end{proof}`;
  const result = extractAtlasText(text, 'latex');
  assert.deepEqual(result.entries.filter(n => n.kind === 'lemma').map(n => n.label), ['actual']);
  assert.deepEqual(result.references.map(n => n.label), ['missing']);
  assert.ok(result.limitations.some(n => n.includes('macro definitions'))); spans(text, result);
  const malformed = extractAtlasText(String.raw`\newcommand{\broken}{\begin{lemma}\label{hidden}not displayed\end{lemma}`, 'latex');
  assert.equal(malformed.entries.length, 0); assert.ok(malformed.limitations.some(n => n.includes('document boundary')));
  // Long escaped runs remain bounded lexical input, rather than repeated
  // backward scans at every slash.
  assert.equal(extractAtlasText('\\'.repeat(100000) + '\nA paragraph.', 'latex').references.length, 0);
});

test('a proof explicitly naming an earlier result is not attached to the intervening lemma', () => {
  const text = String.raw`\begin{lemma}\label{first} First statement.\end{lemma}
\begin{lemma}\label{second} Second statement.\end{lemma}
\begin{proof}[Proof of Lemma \ref{first}]A separate proof.\end{proof}`;
  const result = extractAtlasText(text, 'latex'), second = result.entries.find(n => n.label === 'second');
  assert.equal(second.proof, undefined); assert.equal(result.entries.some(n => n.kind === 'proof'), true);
  assert.ok(result.limitations.some(n => n.includes('kept separate'))); spans(text, result);
});

test('explicit local bibliography resolves citation keys, while escaped Markdown and email brackets do not invent citations', () => {
  const latex = String.raw`A reference is \cite[Chapter 2]{Book}.
\begin{thebibliography}{9}
\bibitem{Book} Author. The exact edition and title.
\end{thebibliography}`;
  const result = extractAtlasText(latex, 'latex'), bibliography = result.entries.find(n => n.kind === 'bibliography');
  assert.equal(result.references[0].status, 'resolved'); assert.equal(result.references[0].target, bibliography.id);
  assert.match(latex.slice(bibliography.start, bibliography.end), /The exact edition and title/); spans(latex, result);
  const markdown = String.raw`A bracket [email@example.org], an escaped \[@Hidden], and \\ref{hidden}.

![Image only](image.png)

See [@Real; @Second].`;
  const parsed = extractAtlasText(markdown, 'markdown');
  assert.deepEqual(parsed.references.map(n => n.label), ['Real', 'Second']);
  assert.equal(parsed.entries.some(n => !n.title), false); spans(markdown, parsed);
});

test('v38 theorem numbering uses the shared counter and omits front matter until explicitly selected', async () => {
  const text = await fs.readFile(path.join(__dirname, 'fixtures/failure-of-composition-v38.tex'), 'utf8');
  assert.equal(digest(text), '94e80f24abd3a9c17fffa9075a017fdb1f04ea48995ad35b263386a4ddf6613b');
  const result = extractAtlasText(text, 'latex');
  const numbered = result.entries.filter(node => node.printedTitle && node.kind !== 'equation');
  assert.deepEqual(numbered.map(node => node.printedTitle), [
    'Theorem 1', 'Corollary 2', 'Theorem 3', 'Theorem 4', 'Proposition 5', 'Proposition 6',
  ]);
  assert.equal(numbered[2].label, 'thm:characterization');
  assert.equal(numbered[2].title, 'Theorem (thm:characterization)');
  const equation = result.entries.find(node => node.label === 'eq:graph-realization');
  const feferman = result.references.find(ref => ref.label === 'Feferman' && ref.raw === String.raw`\cite[p.~267]{Feferman}`);
  assert.equal(equation.kind, 'equation');
  assert.equal(equation.printedTitle, 'Equation (5)');
  assert.deepEqual(result.entries.find(node => node.label === 'eq:uniform').labelNumbers,
    [['eq:uniform', '1'], ['eq:pointwise', '2']]);
  assert.equal(result.entries.find(node => node.label === 'eq:quotient-composition').printedTitle, 'Equation (3)');
  assert.equal(new Map(numbered[2].labelNumbers).get('it:pi'), '3');
  assert.ok(feferman);
  assert.ok(result.references.some(ref => ref.target === equation.id && ref.owner === feferman.owner));
  const start = text.indexOf(String.raw`\maketitle`);
  const end = text.indexOf(String.raw`\section{Introduction}`);
  assert.ok(result.entries.every(node => node.start >= end));
  const selected = extractAtlasText(text, 'latex', { start, end });
  assert.deepEqual(selected.entries.filter(node => node.frontMatter).map(node => node.title),
    ['Title page', 'Abstract', 'Mathematics Subject Classification']);
  assert.match(text.slice(selected.entries[1].start, selected.entries[1].end), /^\\begin{abstract}[\s\S]+\\end{abstract}$/);
  spans(text, result);
  spans(text, selected);
});

test('the equation counter counts unlabelled displays, skips unnumbered rows and respects a section reset', () => {
  const text = String.raw`\numberwithin{equation}{section}
\begin{document}
\section{First}
\begin{equation}x=x\end{equation}
\begin{equation*}y=y\end{equation*}
\begin{align}
 a&=a \notag\\
 b&=\begin{aligned}b\\b\end{aligned}\label{eq:b}\\[.3em]
 c&=c\label{eq:c}
\end{align}
\section{Second}
\begin{equation}d=d\label{eq:d}\end{equation}
\end{document}
`;
  const result = extractAtlasText(text, 'latex');
  const align = result.entries.find(node => node.label === 'eq:b');
  assert.deepEqual(align.labelNumbers, [['eq:b', '1.2'], ['eq:c', '1.3']]);
  assert.equal(align.printedTitle, 'Equations (1.2), (1.3)');
  assert.equal(result.entries.find(node => node.label === 'eq:d').printedTitle, 'Equation (2.1)');
  spans(text, result);
});

test('LaTeX theorem counters reset by section, share across kinds and skip starred headings and environments', () => {
  const text = String.raw`\documentclass{article}
\newtheorem{result}{Theorem}[section]
\newtheorem{consequence}[result]{Corollary}
\newtheorem{definition}{Definition}[subsection]
\newtheorem*{observation}{Remark}
\section{First}
\begin{result}\label{first}A statement.\end{result}
\section*{Interlude}
\begin{consequence}\label{second}A consequence.\end{consequence}
\subsection{More results}
\begin{definition}\label{def}A definition.\end{definition}
\begin{observation}\label{unnumbered}A remark.\end{observation}
\section{Second}
\begin{result}\label{third}A statement.\end{result}
\subsection{More definitions}
\begin{definition}\label{other}A definition.\end{definition}
`;
  const result = extractAtlasText(text, 'latex');
  const captions = result.entries.filter(node => node.printedTitle).map(node => node.printedTitle);
  assert.deepEqual(captions, ['Theorem 1.1', 'Corollary 1.2', 'Definition 1.1.1', 'Theorem 2.1', 'Definition 2.1.1']);
  const unnumbered = result.entries.find(node => node.label === 'unnumbered');
  assert.equal(unnumbered.printedTitle, undefined);
  assert.equal(unnumbered.unnumbered, true);
  assert.equal(extractAtlasText(text + '\n' + String.raw`\setcounter{result}{9}`, 'latex')
    .entries.find(node => node.label === 'first').printedTitle, undefined);
});

test('the auxiliary is bounded and local, and only applies to the current saved source', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'mrw-atlas-aux-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const source = path.join(directory, 'paper.tex'), auxiliary = path.join(directory, 'paper.aux');
  const text = String.raw`\newtheorem{theorem}{Theorem}
\begin{theorem}\label{label:result}A statement.\end{theorem}
\begin{equation}\label{label:eq}x=x\end{equation}
`;
  const numbers = String.raw`\newlabel{label:result}{{A.4}{2}{A title}{theorem.4}{}}
\newlabel{label:eq}{{7a}{2}{A title}{equation.7}{}}
\newlabel{ignored}{{\input{x}}{3}}
\newlabel{duplicate}{{1}{3}}
\newlabel{duplicate}{{2}{3}}
`;
  await fs.writeFile(source, text);
  await fs.writeFile(auxiliary, numbers);
  await fs.utimes(source, 1000, 1000);
  await fs.utimes(auxiliary, 1100, 1100);
  const printedLabels = await readAtlasAux(source, text);
  assert.deepEqual([...printedLabels], [
    ['label:result', 'A.4'], ['label:eq', '7a'], ['ignored', null], ['duplicate', null],
  ]);
  const result = extractAtlasText(text, 'latex', undefined, { printedLabels });
  assert.deepEqual(result.entries.map(node => node.printedTitle), ['Theorem A.4', 'Equation (7a)']);
  assert.deepEqual(result.entries[1].labelNumbers, [['label:eq', '7a']]);
  assert.equal(await readAtlasAux(source, text + '\nnew editor text'), undefined);
  await fs.utimes(auxiliary, 900, 900);
  assert.equal(await readAtlasAux(source, text), undefined);
  assert.equal(extractAtlasText(text, 'latex').entries[0].printedTitle, 'Theorem 1');
  await fs.writeFile(auxiliary, 'x'.repeat(1024 * 1024 + 1));
  assert.equal(await readAtlasAux(source, text), undefined);
  await fs.rename(auxiliary, path.join(directory, 'other.aux'));
  await fs.symlink(path.join(directory, 'other.aux'), auxiliary);
  assert.equal(await readAtlasAux(source, text), undefined);
});
