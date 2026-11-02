# Mathematical source outlines and proof-outline vertex elimination

**Scope:** understanding and logical deconstruction of arguments in textbooks,
monographs, articles, and AI-generated or AI-assisted manuscripts, including
sources with no Lean formalization. Lean evidence is optional. Orientation,
central concepts/results, governing ideas, argument structure and technical
detail are freely navigable, not a compulsory sequence. A reader may use a
cited theorem while deferring inspection of its proof.

**Reader diagrams, 2026-11-02:** 0.10.0 explicitly renders saved TikZ annotation
blocks to retained SVGs. Code, attribution and source statements remain separate;
drawing an arrow or square supplies no checked dependency or commutativity.
Diagrams support a reader's explanation as they develop an outline. The graph
representation and vertex-elimination machinery remain planned. See
[the bounded workflow](TIKZ_WORKFLOW.md).

The reader supplies an outline or works toward one. For a deductive outline,
vertex elimination provides the organizing model: selected claims remain visible,
joint premises and local scope are preserved, and suppressed steps can be
expanded back to the original argument. A prose heading or navigation link alone
does not supply an inference. The current reading controls are a presentation
step toward that model; the explicit inference graph remains to be implemented.

**Annotation display, 2026-11-01:** 0.9.3 typesets explicitly delimited annotation
equations locally, retaining exact editable text and attribution. This is a
derived reading view, separate from the retained source and proof evidence.
The reader can hide/show published proofs together or individually while
retaining visible statements; exact proof navigation reveals its destination.
Patch 0.9.4 makes hidden proofs compact reveal rows and saved Reader notes a
closable disclosure, preserving exact text and attribution.

**Proof-visibility follow-up, 2026-11-01:** 0.9.2 keeps annotation editing out of
the source sequence and provides direct navigation between explicitly published
statement/proof parts in the same retained import. Links require exact current
span matches; multiple proofs remain distinct and changed associations are
reported. Temporary expansion changes no source or saved outline bytes. This
uses published source structure and supplies no inference or proof status.

**Presentation follow-up, 2026-11-01:** patch 0.9.1 addresses the observed narrow,
control-heavy reading view with concise navigator labels, expanded mathematics,
collapsed source tools and direct focus on matching published passages. Source
and note bytes, original reference grammar and earlier-range behavior remain
unchanged. This is reading presentation, with no graph or inference capability.

**Update, 2026-11-01:** 0.9.0 adds a navigable reading outline derived from one
ordinary Markdown overview. Its headings collapse/expand and select exact editor
locations; existing references open the same retained reader/passages and return
to the originating occurrence. Unsaved editing, undo and recovery remain host
responsibilities. This extends the manual overview contract below, without a
new reference grammar or inference graph. See [usage](READING_OUTLINE_WORKFLOW.md)
and [validation](READING_OUTLINE_VALIDATION.md). Vertex elimination remains planned.

**Update, 2026-10-21:** 0.8.0 imports one explicitly selected Stacks section
from pinned upstream source and tag-map bytes into this reader. Published
statement/proof regions and explicit citations are source structure, not a
complete dependency graph or verified inference. Rendering is derived; exact
TeX and earlier pinned spans remain authoritative. The adapter does not implement
vertex elimination. See [the bounded workflow](STACKS_WORKFLOW.md).

**Update, 2026-10-16:** the first manual overview spanning several sources is
implemented in VS Code 0.5.0 as ordinary Markdown with scoped saved-outline and
exact-region references. See the reference contract below and
[focused validation](VS_CODE_OVERVIEW_VALIDATION.md). Remaining broader outline
tooling and the graph contract remain pending.

**Status, 2026-10-14:** the first offline source-region reader is implemented in
VS Code; see [its contract](../vscode/README.md#offline-source-region-reader) and
[validation evidence and limits](VS_CODE_OUTLINE_VALIDATION.md). This partially
implements the accepted requirement. A faithful outline does not establish
proof correctness. The bounded Task 4.0 reconnaissance is complete; see
[actual outputs, source/tool revisions and the recommended first consumer](PROOF_OUTLINE_RECONNAISSANCE.md).
Vertex elimination remains an accepted product requirement, not implemented.
The VS Code extension supplies manual source regions, shared record actions
and explicit Lean-source/browser handoffs; see [its README](../vscode/README.md). The
workstation should help a reader obtain and inspect a mathematical outline of
a selected argument. AI may eventually propose which details to hide and explain the
retained claims. The original proof and its evidence remain available.

## Visible claims and explanations

The reader retains useful intermediate claims and hides the arguments between
them. Every summarized proof region has a visible claim and an explanation of
the omitted argument and its role in the proof. Each summary offers expansion
to the underlying steps and navigation to their source. Existing local lemmas
can provide boundaries; AI may propose boundaries inside longer calculations.
The reader can revise that selection and the explanations.

A claim keeps its necessary hypotheses, quantified variables, and local
assumptions. Its exact source statement is available for inspection. A prose
paraphrase remains linked to that statement; it does not acquire the original
statement's checking status merely by describing it. A newly proposed
intermediate lemma requires its own checking or correspondence evidence.

The overview should explain the governing construction, principal reductions,
and the work done by the selected lemmas. A smaller graph is not an acceptance
criterion. Explanation depends on the mathematical question and available
background; no unique or optimal outline is assumed.

## Graph operation

Identify the representation before applying vertex elimination: declaration
dependencies, source regions, tactic states, and elaborated proof structure
are different inputs. A declaration map does not supply the internal argument
of a proof. Source inspection is not elaboration-graph extraction.

For a finite directed acyclic graph \(G=(V,E)\), let \(R\subseteq V\) be the
retained vertices and \(V\setminus R\) the hidden vertices. Between distinct
vertices \(u,v\in R\), the displayed graph has an edge \(u\to v\) exactly when
the original graph has a directed path from \(u\) to \(v\) whose internal
vertices are hidden. Operationally, eliminate a vertex by joining each of its
predecessors to each of its successors and then removing it. This preserves
reachability between retained vertices.

Each added edge expands to an original path. Conversely, replacing hidden
segments of an original path by their displayed edges gives a path between
the same retained endpoints.

Retain the original graph, the selection, and witness information for
expansion. Distinguish original edges from edges obtained through hidden
vertices. Where several paths support the same edge, expansion must not
present an arbitrary path as the complete argument. Vertex elimination is
distinct from grouping a region into a synthetic node and from transitive
reduction, which removes edges. The original graph remains unchanged.

Reachability alone does not express inference. Preserve which premises are
needed jointly, alternative derivations, variable binding, and local scope.
An assumption with no retained predecessor must not disappear from the visible
claim. Every hidden inference region keeps its premise and conclusion
boundaries. Graph operations provide navigation; they create no theorem or
Verification.

## Source and evidence

Bind the outline to the exact proof/source revision and, where available, the
graph generator and Lean environment. Use existing `Representation`,
`VersionedSpan`, `Trace`, `FormalFact`, `Correspondence`, and `Verification`
boundaries when they supply the needed information. This is a behavior
requirement, not a new serialized schema or a second copy of generated facts.

Keep explanation attribution and human review separate from the original
proof's checking evidence. Preserve exact AI-response provenance for a
selection or explanation generated through a `ModelCall`. A changed source
invalidates the current association; the earlier outline remains inspectable
against its pinned source. Do not silently reassign it to similar-looking nodes.

The outline service invokes no model or compiler merely to open, hide, expand,
or restore an existing outline. An installed Lean extension may process a
source file opened through navigation; that is a separate tool action, not an
outline-service check or a new MRW Verification. Requesting an AI outline is an
explicit action using the existing bounded preview/Send boundary. Checking a
newly proposed formal claim is a separate action. These actions do not admit
premises into the warrant layer.

## First bounded increment

The delivered reader retains exact UTF-8 source and supplied artifact bytes,
manual revision-pinned ranges, separately selected statements and context,
editable attributed annotations, source navigation, hide/expand state, and
explicit reopening after restart. Selected hypotheses, definitions, local
assumptions and cited results remain accessible when details are hidden.
Supplied declaration statements are distinct from manually associated recorded
tactic goals. Context means available assumptions, not necessary or jointly
used premises. Manual dependency descriptions remain reader annotations.
Changed or absent sources never remap selections; retained text remains accessible.

Bibliographic fields, source authorship and artifact references preserve unknowns.
Saved text formats are supported; PDF regions, OCR, notebook cells, binary and
non-UTF-8 sources are explicitly unsupported. Exact expansion refers to retained
text ranges; an externally transcribed source is not thereby certified faithful
to a page image. No compiler, provider, extraction or formalization is required.

Beyond the bounded published Stacks structure adapter, automatic extraction,
AI proposals, automatic gap detection, verified joint-premise
graphs and elimination witnesses remain pending. The graph demonstrations below
describe the full accepted contract, not completed reader acceptance.

The pinned example's existing export/server output has been inspected in the
reconnaissance linked above. Consume it before writing another extractor. Keep
the input kind visible and expose only claims actually
supplied by that representation. Use the existing Lean editor/viewer ecosystem;
the preferred frontend trial is one VS Code extension over the independent
core. Choice of an open-source editor distribution is deferred. The initial
extension implements those handoffs, record actions and the manual reader,
without graph extraction or elimination; ordinary files remain the work artifacts.

Demonstrate:

1. A retained theorem and intermediate claims, each with a visible explanation,
   source link, and expansion control.
2. Manual selection and an explicit AI-proposal route; the reader can alter the
   proposed selection and explanation.
3. Agreement between displayed edges and paths through hidden vertices,
   including a branching example requiring premises jointly.
4. Expansion without losing assumptions, scope, or alternative paths; hiding
   and expansion do not change the proof or its records.
5. Source-change detection, honest evidence labels, and restoration of the
   selection and explanations after reopening.

Deterministic checks establish graph and retention behavior. Mathematical use
must separately establish whether the outline helps reconstruct or continue
the argument. R1–R3.1 and the Marcus observation retain their separate evidence;
they are not preliminary ceremonies for this increment.

## First manual overview across sources — reference contract, 2026-10-16

This increment activates ordinary Markdown overviews referring to existing
saved source outlines, including informal sources. An overview may concern a
subject, book, monograph, article, section or argument and connect sources
without imposing a hierarchy. VS Code owns editing, undo, saving, recovery and
preview. No template, questionnaire or reading sequence is required. Overview
prose is reader synthesis; its references supply navigation, not checked
dependencies, proof status or source assertions.

Reference identity is defined before implementation:

```text
mrw-outline:v1/SCOPE/OUTLINE/SOURCE
mrw-outline:v1/SCOPE/OUTLINE/SOURCE/REGION/SL.SC-EL.EC
```

For legacy stores, `SCOPE` is the lowercase SHA-256 of the canonical project
path, NUL and canonical private outline-store path (UTF-8). For explicitly moved
0.7.0 stores it is SHA-256 of `mrw-store-v1`, NUL, persistent store UUID, NUL and
persistent project UUID. The immutable store identity retains a recomputed,
verified compatibility mapping for its legacy scope. Explicit local adoption
maps each project to a local folder; matching path names alone cannot establish
identity. The grammar is unchanged, and unrelated scope checks remain enforced.
See [the relocation/adoption contract](ARTIFACT_STORAGE.md).
`OUTLINE` and optional `REGION`
are existing UUIDs; `SOURCE` is the retained source's exact-byte SHA-256.
Region endpoints are half-open, 1-based lines and 0-based Unicode scalar
columns, with canonical decimal spelling. The URI contains no filesystem path,
command, query, fragment, encoded argument or executable payload. It is bounded
and strictly parsed. Only the current Markdown document's workspace-derived
store is eligible; document text cannot choose another store or project.

Insertion explicitly chooses an existing outline, then its whole retained
source or a saved region. A normal inline Markdown link includes the supplied
title (otherwise source filename), known bibliography, useful range/source
locator and retained revision. Missing metadata stays unknown. The visible
label is a citation snapshot; later metadata/annotation changes do not rewrite
the Markdown or invalidate its target.

An explicit **Follow Outline Reference at Cursor** action accepts only this
reference grammar. It opens the existing reader; a region reference also opens
and selects its exact retained passage. Annotation edits do not change reference
identity. If a region is removed or its range changes, navigation reports the
changed association and opens the originally pinned retained passage, selecting
no replacement reader region. It does not silently follow the region's new
range. Whole-outline references address the retained source and its current
reader annotations, not a frozen copy of mutable annotations.

Changed or missing original files do not prevent retained navigation. Missing
outlines, unavailable/corrupt retained storage, source-identity mismatch or a
different workspace/storage scope cause a clear failure, without rewriting
Markdown, creating storage, searching other projects or guessing a replacement.
Following is read-only, including when a reader region is collapsed. It invokes
no provider, compiler, external command or arbitrary URI handler. The Command
Palette action works in the Markdown editor; preview-click handling is outside
this first increment.

Copying Markdown alone does not transfer private outlines or retained sources.
References are scoped navigation data, not a synchronization/export format,
authority credential or universal identity for mathematical occurrences.
Beyond explicit Stacks section acquisition, automatic generation/source
discovery, cross-host synchronization, general
overview tooling, inference graphs and vertex elimination remain pending.

## Obsidian companion navigation — 2026-10-17

Version 0.6.0 wraps the existing `mrw-outline:v1` reference in a standard VS Code
extension URI. The permanent payload contains the unchanged reference plus
separate project/workspace routing, never a transient window ID or cached
external callback. The original parser, scope validation, resolver and reader
remain authoritative. Changed/removed region associations still open their
original pinned range. Ordinary Markdown labels use a bounded source title and
locator rather than diagnostic identities.

Explicit Obsidian note associations are stored separately in a bounded private
mutable sidecar using existing publication rules. They bind the exact reference,
so a changed range does not redirect an earlier note association. Notes, sources,
evidence and explanations are not copied or rewritten by navigation. Wrong
workspace routing is rejected before resolution; a recovery action uses normal
VS Code workspace opening and explicit clipboard navigation. No outline or
proof status follows from a link. See [the guide](OBSIDIAN_WORKFLOW.md).

## Source-based illustration

The pinned proof
[`Subgraph.Equation387_implies_Equation43`](https://github.com/teorth/equational_theories/blob/1aec8a7acf223b7c56e4830977b6e90d4ef1924b/equational_theories/Subgraph.lean)
provides three local lemmas and a concluding rewrite block. Let \(G\) have a
binary operation \(\diamond\), assume
\(x\diamond y=(y\diamond y)\diamond x\) for all \(x,y\in G\), and write
\(s(x)=x\diamond x\).

| Selected source region | Visible claim | Explanation |
|---|---|---|
| `idem` | Squares are idempotent: \(s(x)\diamond s(x)=s(x)\). | Apply the assumed identity twice to reduce the product of two squares to one square. |
| `comm` | Every square commutes with every element: \(s(x)\diamond y=y\diamond s(x)\). | Apply the assumed identity with the idempotent element \(s(x)\), whose square is itself. |
| `op_idem` | Squaring both factors preserves their product: \(s(x)\diamond s(y)=x\diamond y\). | Rewrite first to \(s(y)\diamond x\), then to \(x\diamond y\). |
| Concluding rewrite block | The operation is commutative. | Replace both factors by their squares, exchange the squares, and undo the replacement. |

The final chain is
\(x\diamond y=s(x)\diamond s(y)=s(y)\diamond s(x)=y\diamond x\).
All claims use the assumed identity; `comm` additionally uses `idem`, and the
conclusion uses `comm` and `op_idem` jointly. These are selected source boundaries;
this illustration itself is not machine output. The subsequent pinned
exporter/server runs are recorded in the reconnaissance report. The project's
[blueprint](https://github.com/teorth/equational_theories/blob/1aec8a7acf223b7c56e4830977b6e90d4ef1924b/blueprint/src/chapter/implications.tex)
provides a corresponding prose argument. This illustration supplies no evidence
of implementation or observed workstation use.

## References

- Rankooh and Rintanen, [*Propositional Encodings of Acyclicity and Reachability
  by using Vertex Elimination*](https://arxiv.org/html/2105.12908v1), §2.2,
  defines the directed elimination operation.
- The [Lean reference on proof states](https://lean-lang.org/doc/reference/latest/Tactic-Proofs/Reading-Proof-States/)
  supplies the target and local-context distinction at proof boundaries.
- Davis and Kirk, *Lecture Notes in Algebraic Topology*, AMS, 2001, Preface,
  p. xi, motivates attention to the overall structure of difficult proofs.
  [Author's bibliography](https://jfdavis.pages.iu.edu/books/); the
  [online draft](https://www.maths.gla.ac.uk/~mpowell/Davis_Kirk_Lecture%20notes%20in%20algebraic%20topology.pdf)
  places the passage on p. ix.
