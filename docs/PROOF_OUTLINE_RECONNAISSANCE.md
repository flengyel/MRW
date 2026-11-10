# Bounded proof-outline reconnaissance

2026-10-14 — Task 4.0, limited to
`Subgraph.Equation387_implies_Equation43`.

The available output supports exact local claims, assumption inspection and
source navigation. It does **not** supply a ready-made inference graph with
joint-premise boundaries and reversible vertex-elimination witnesses. The
smallest useful next increment is a manually selected source-region outline
using recorded Lean output; full graph elimination remains planned.

The subject is `teorth/equational_theories` at
[`1aec8a7`](https://github.com/teorth/equational_theories/blob/1aec8a7acf223b7c56e4830977b6e90d4ef1924b/equational_theories/Subgraph.lean#L236-L242),
with Lean 4.29.1 (`f72c35b3f637c8c6571d353742168ab66cc22c00`) and Mathlib
`5e932f97dd25535344f80f9dd8da3aab83df0fe6`. The unchanged module compiled with
`lake build +equational_theories.Subgraph`, using its pinned dependency manifest
and a selective Mathlib cache. Full source hashes, tool revisions, commands,
outcomes and retained-output hashes are in
[provenance.json](https://github.com/flengyel/MRW/blob/af623be0a9dc85cb23dbdde610484ad886ea687a/docs/evidence/proof-outline-20261014/provenance.json).

| Existing tool / inspected revision | Actual result and granularity |
|---|---|
| [lean4export `6f4e21d`](https://github.com/leanprover/lean4export/tree/6f4e21dd70c3c11d7fbd07d39e3192792c657448), tag `v4.29.1` | Selected-declaration export succeeded: [652 NDJSON records](https://github.com/flengyel/MRW/blob/af623be0a9dc85cb23dbdde610484ad886ea687a/docs/evidence/proof-outline-20261014/equation387.ndjson), including 543 expression entries and transitive constant definitions. This is elaborated term structure, with typed binders and applications, rather than a source/tactic graph. |
| [doc-gen4 `a0aebd7`](https://github.com/leanprover/doc-gen4/tree/a0aebd77a6619214a727994fade0e05203fc5252), tag `v4.29.1` | Inspected the [published declaration element](https://github.com/flengyel/MRW/blob/af623be0a9dc85cb23dbdde610484ad886ea687a/docs/evidence/proof-outline-20261014/docgen-selected.html): parameters, `h : Equation387 G`, conclusion and an exact revision/source-range link. No local `have` claims or proof body appear. Local generation failed because the C toolchain was unavailable. The published page does not identify its producing tool commit; the inspected revision must not be attributed to it. |
| [ntp-toolkit `64c9047`](https://github.com/cmu-l3/ntp-toolkit/tree/64c9047dc53bf9ef29a3323fe31f1e1f79389db2) | Source inspection only; its Lean/Mathlib/doc-gen4 dependencies target 4.24.0. No compatible selected-proof output was obtained or port attempted. `training_data` emits state/tactic examples; `premises` collects named-constant uses. Its internal InfoTree JSON code includes syntax ranges, children and before/after goals, but those fields are not a demonstrated outline export here. |
| [LeanArchitect `1b7341d`](https://github.com/hanwenzhu/LeanArchitect/tree/1b7341de673b0572e4ffbd17c222ff7d35e0d4f4), tag `v4.29.1` | Built and ran `extract_blueprint single --json` on the unchanged module: [empty array](https://github.com/flengyel/MRW/blob/af623be0a9dc85cb23dbdde610484ad886ea687a/docs/evidence/proof-outline-20261014/architect-Subgraph.json). The module has no blueprint annotations. The tool's annotated declaration dependencies do not expose these local proof steps. No annotations or synthetic nodes were added. |
| Native Lean server, same pinned Lean | Six `$/lean/plainGoal` requests returned [goal/context snapshots](https://github.com/flengyel/MRW/blob/af623be0a9dc85cb23dbdde610484ad886ea687a/docs/evidence/proof-outline-20261014/lean-goals.json). Definition lookup on the final use of `comm` returned its local binder at line 240. These are position-associated tactic views and a source location, not inference edges. |

The term export retains `idem`, `comm` and `op_idem` as three nested `letE`
expressions (IDs 539, 538 and 537 in the default export), inside the `G`, magma
instance and `h` binders. Each has its own type, value and continuation. The
[`--export-mdata` run](https://github.com/flengyel/MRW/blob/af623be0a9dc85cb23dbdde610484ad886ea687a/docs/evidence/proof-outline-20261014/equation387-mdata.ndjson)
also succeeded and supplied no metadata/source-position nodes. Its only output
difference was retaining `nondep: true` on those three bindings; that elaborator
flag does not mean an unused proof premise.

The final goal snapshot displays all three quantified local claims and `h`.
The `op_idem` snapshot also has `idem` and `comm` available, although its
[source body](https://github.com/flengyel/MRW/blob/af623be0a9dc85cb23dbdde610484ad886ea687a/docs/evidence/proof-outline-20261014/Subgraph-L236-L242.lean.txt) only
rewrites with `h`. Context availability therefore cannot be converted into
dependency edges. Declaration references, lexical scope, tactic nesting and
actual inference arguments must remain distinct.

| Requirement | What the obtained output supports |
|---|---|
| Visible claims | Exact local statement text in goal contexts, and typed term expressions. Explanations remain separately attributed prose; none was generated by these runs. |
| Joint premises | The original term preserves the arguments of each application together. No captured output supplies groups of premises for summarized regions or alternative-path witnesses. The concluding source uses `comm` and `op_idem` together; a pairwise declaration map cannot substitute for that inference. |
| Local assumptions | Goal contexts and term binders retain `G`, the instance, `h`, quantified variables and local lemmas. These must remain visible at region boundaries. |
| Source navigation | Published declaration link covers lines 236–242; native lookup locates the local `comm` binder. Term IDs alone carry no source range. Every association needs the exact source digest. |
| Reversible expansion | Retained source and typed term bodies permit verbatim source/term inspection. No collapse/expand UI or reachability-witness mapping was produced or tested. |

The pinned prose blueprint is useful explanation material, but its label
`op-idem` denotes commutation of squares, while the Lean local `op_idem`
denotes product preservation. Label similarity is not correspondence evidence.

Recommend one **offline source-region consumer** in the existing extension:
let the reader select the three local lemma regions and final rewrite region;
display their recorded claims with the complete boundary context, separately
attributed explanations, revision-checked source links and verbatim expansion.
Reuse existing representation/span/provenance boundaries and host documents.
Keep the original outputs intact and bind saved selections to their exact
bytes. Require opening, expansion and restoration of the recorded view without
a compiler or model request. That would be a partial source-outline trial, not
acceptance of the vertex-elimination contract. Graph elimination still needs an explicit mapping
from typed inference arguments to regions, joint boundaries and expansion
witnesses; do not manufacture it from dependencies or tactic order.

Only the disposable pinned checkout and generated storage were used. An initial
build overlapped relocation of the generated cache and was invalidated; the
subsequent isolated build succeeded. The local doc-gen4 attempt and bundled
compiler workaround failed; the published HTML is the actual documentation
output inspected. No new extractor, proof graph, outline GUI, provider call,
MRW Verification or mathematical-use claim was introduced. R3 acceptance was
not repeated. Documentation/evidence validation is the repository change check.
