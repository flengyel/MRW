# Proof outlines and vertex deletion

Open an explicit proof outline to inspect its claims, sources and proposed
dependencies. **Delete vertex** simplifies the displayed graph; it preserves
the original steps and can be reversed. This is a reading aid, not a proof checker.

If the outline does not open within 15 seconds, **Retry** requests it again.
Host errors and rendering failures appear in the view.

## Graph and tagged Stacks passage (0.16.0)

Click a vertex to select it and show its corresponding Stacks tag beside the
graph. The complete vertex is clickable and keyboard accessible. Connected
vertices and arrows are highlighted. Drag the graph to pan; use the wheel or
**− / Fit / +** to zoom. **Find a claim** followed by Enter locates a vertex.
Deletion and restoration animate the changed layout; reduced-motion preferences
disable those transitions. The original joint-premise derivations remain under
**Premises and original steps** and **All displayed claims and derivations**.

**Stacks page** loads the official `https://stacks.math.columbia.edu/tag/TAG`
page inside the reading panel. This is explicit web navigation on vertex
selection, not a new import or a pinned copy of the current website. **Saved
text** displays the retained statement and proof offline, with their revision.
**Open on Stacks** opens the same tag in the browser. The graph stays visible;
deletion/restoration keep an already selected page in place. Opening or restoring
the graph alone loads no web page. A source page's own navigation and network
activity belong to that embedded page.

The tag comes from an exact, scope-checked retained Stacks association and its
published part. A changed or removed association shows its original retained
quotation without guessing a replacement tag. Late replies from earlier vertex
selections are discarded. Proposed intermediate claims can cite the same tag;
the displayed Stacks statement remains distinct from their AI summaries.

The embedded page is restricted to the official Stacks origin, sandboxed and
given no referrer. It has no MRW API. Messages from child frames are ignored.
The ordinary source reader retains its previous frame-free policy. No live page
content is added to an AI request or written into the saved source store.

An **Open Proof Outline** icon now appears in the title bar of a
`.mrw-proof.json` editor, alongside the Command Palette and Contents view menu.
Selecting a JSON file in Explorer still opens its ordinary editor;
the icon opens the interactive graph without another MRW-sidebar step.

Run **MRW: Open Proof Outline…** and choose a `.mrw-proof.json` file in the
workspace. The command also uses an active file with that suffix. Opening an
outline starts no network, model or Lean job.

Each claim has a statement, attributed explanation, variables/hypotheses and
source citations. The graph shows dependency paths. The derivations under each
claim specify premises needed **jointly**; different derivations are alternatives.

- **Delete vertex** omits an intermediate claim from the display and reconnects
  its dependencies. **Expand original steps** shows the omitted claims, source
  citations and original inferences for that particular derivation.
- **Restore vertex** or **Restore all vertices** reverses the display operation.
  Premises, conclusions and local scope boundaries stay visible.
- **Use AI outline** applies the attributed selection saved in the file. It
  invokes no model. The reader can change that selection one vertex at a time.
- **Edit summary** opens an inline form for the claim, explanation and
  attribution. **Save summary** applies and saves a document edit to the outline
  file. The JSON file can also be edited directly; **Refresh** reads its current
  editor text, including unsaved changes. VS Code owns undo and file recovery.
- **Ask AI…** prepares a question using only the exact outline JSON, through the
  existing preview/Send workflow. Source files are not added implicitly. An unsent
  request cannot be replaced by this action. Nothing is sent until **Send exact
  preview**. Responses remain separate; no response is installed as an inference.
- **Conclusion** selects the first goal and opens its corresponding tag. **Sources** opens pinned quotations
  offline, retained MRW passages where linked, or the upstream URL by explicit
  browser action.

The original graph file is unchanged by deletion, expansion or restoration.
The selected vertices persist in host workspace state, keyed by canonical file
path and exact editor-text digest. A changed outline starts with all vertices;
the earlier selection remains available if exact undo restores that revision.

## File boundary

Version 1 is an ordinary document containing `sources`, `scopes`, `nodes`,
`inferences`, `goals` and `suggested_hidden`. See
[`tests/fixtures/proof_graph_08zh.json`](../tests/fixtures/proof_graph_08zh.json).
Claims, dependencies and summaries are proposed source interpretations. This
format creates no FormalFact, Correspondence, premise admission or Verification.
The Python core validates structure and projects the graph; it does not check
mathematical implications or extract an elaborated Lean proof graph.

An inference lists its joint premises and one conclusion. Several inferences
may conclude the same claim. Scopes explicitly record parent scope, variables
and assumptions. Cross-scope use must follow scope ancestry or name the direct
child scope discharged by the inference. All crossing endpoints remain visible.
Text is not parsed into a binding calculus or certified by this structural check.

Source entries pin local snapshot files by exact SHA-256, upstream revision,
HTTPS URL and review tier. Local paths remain inside the outline directory;
symlink escapes and changed bytes cannot supply the pinned quotation. Previously
loaded exact bytes remain readable during that view's lifetime. Missing or changed
snapshots after reopening are reported; no replacement is fetched. A retained MRW
reference independently resolves its original revision under the existing store
scope rules. Copy the snapshot directory with the outline for offline use;
copying the JSON alone does not transfer private MRW targets.

Limits: 512 KiB graph document, 64 claims, 128 inferences, 16 sources, 16 scopes,
16 premises per inference and 1,024 projected derivations. Each snapshot has the
existing 4 MiB text limit. A deletion exceeding the derivation bound is rejected
without truncating alternatives or replacing the displayed graph. This first
consumer supports source-based AI/human outlines; general extraction, automatic
correspondence checking and automatic summary generation remain separate work.

## 08ZE / 08ZH study

The study's `proof-outlines/08zh.mrw-proof.json` compares the diagonal argument
with Axiom Math's equalizer application. Its proposed selection displays 10 of
15 claims, preserving both derivations. The source snapshots include:

- Stacks topology at `a04446e57ec1fbc252a871afcec7752fb2807b14`;
- Axiom Math Stacks at `f8e70c5dd04bfabcb423d5e325461f527c85a5d6`;
- Mathlib at `16edf57de7933555826307a3d81b4391a3657a09`, as pinned by that
  Axiom repository's Lake manifest; Lean `v4.34.0-rc2`.

08ZE is registered in StacksCore; 08ZH is in StacksFrontier. Those review tiers
and the project's report of kernel checking remain separate from the Codex
reconstruction. No local Lean build or check has been performed for this case.

The existing Markdown overview, TikZ diagram and reader annotations remain in
place. This is a bounded trial of summaries and reversible deletion, with
mathematical usefulness still to be observed. See [validation](PROOF_GRAPH_VALIDATION.md).
