# Paper–Lean correspondence review

See the [design register](DESIGN_RECONCILIATION.md#paper-lean-correspondence-review).

A reader comparing a paper with a Lean development needs to know which
declaration is claimed to formalize a printed result and why the reader
should accept that claim. The comparison covers the objects, hypotheses,
quantifiers, conclusion and assumptions. A build can succeed with admitted
axioms or unfinished proofs. A declaration's type and axiom dependencies are
evidence for the review. The correspondence judgment belongs to the reviewer.

GOLEM XIV retains each judgment against exact source revisions, detect changes
to either side and record a second reader's reconstruction before revealing
the Lean declaration or the first review.

## Records and evidence

Use the [domain model](../DOMAIN_MODEL.md).

- A `SourceOccurrence` pins the printed statement or Lean declaration to a
  source revision and span.
- A `Correspondence` records a directed judgment from the paper to Lean. Use
  `formalizes`, `strengthens` or `weakens` for the review outcomes below.
  A revised judgment creates a new revision and retains its basis and provenance.
- A `FormalFact` comes from one canonical generator and remains read-only
  under invariant C. An existing check or replay receipt can be attached as a
  separate `Verification`, with its own scope and provenance.
- A `Discrepancy` records a mismatch, stale correspondence, changed signature
  or missing declaration. Under invariant E, absence from a formal dependency
  list does not settle whether an informal argument uses a prerequisite.

## Read a Lean declaration

The reader selects a Lean project with a Lake configuration and
`lean-toolchain`, a module and a fully qualified declaration name. The
[existing source scan](../vscode/src/atlasLean.js) can suggest names. The
elaborated environment supplies the declaration data.

On **Read Lean declaration**, use the installed, pinned toolchain to run a
generated Lean file in the project's Lake environment. The file imports the
selected module and emits bounded JSON for these facts.

| Fact | Contents |
| --- | --- |
| `declaration_type` | Pretty-printed type with default options and with `pp.explicit` and `pp.universes` enabled |
| `signature_hypotheses` | Binders in order, with names, types and explicit, implicit, strict implicit or instance status |
| `axiom_dependencies` | Transitive axiom dependencies from `collectAxioms`, including `sorryAx` and any added axioms |
| `direct_dependencies` | Constants occurring in the type, with their declaration kinds and declaring modules |
| `source_location` | File and source range from the declaration ranges, with unavailable locations recorded explicitly |

Record the toolchain, Lake manifest digest and project commit in
`derived_from`. Bind the declaration range and facts to the exact source
revision represented by the build. The facts describe the loaded environment.
An existing proof verification has its own record.

Use the project's pinned toolchain, as in `lake env lean`, after verifying
that the toolchain and the current compiled import closure are available.
The action is explicit, cancellable and subject to timeout and byte limits.
Use a trusted Git checkout on a Linux workspace host (including WSL2),
with Bubblewrap supporting `--tmp-overlay` and the pinned Lean/Lake toolchain
already installed. Lake configuration and Lean imports execute in a sandbox
with no network and a read-only project. Temporary overlays contain Lake’s
freshness-check writes. Dependencies must be available within the selected
project or toolchain. If the required build artifacts are missing or stale, ask the
reader to **Build the project first** with `lake build <module>`. GOLEM XIV does
not run that command, update dependencies or fetch a toolchain or cache.
Opening a review uses saved evidence and reads current revisions without
running Lean.

## Review a correspondence

Open **Compare with Lean declaration…** from an atlas component or saved
passage. **Proofs… → Correspondence review…** lists reviews for the manuscript.

Place the typeset printed statement and **Exact text** beside the Lean type.
Offer the explicit type rendering, binder table, axiom list and links to the
source of the type's constants where available. Give each aspect one verdict
and a reason. **Save** records the manuscript and Lean occurrences, the
generated facts, reviewer, time and any supplied attribution.

| Aspect | Compare |
| --- | --- |
| Objects and definitions | Definitions used by the type and the corresponding notions in the paper |
| Hypotheses | Binders and instance arguments against the printed hypotheses |
| Quantifiers | Order, scope and variables quantified outside the theory |
| Conclusion | The result stated by the type and the printed conclusion |
| Assumptions outside the statement | Axioms, global instances and hypotheses carried by structures |

The aspect verdicts are `matches`, `lean_assumes_more`,
`lean_proves_less`, `lean_stronger` and `not_comparable`. Each reason
identifies the relevant evidence. A declaration that depends on `sorryAx`
has an unfinished proof. GOLEM XIV keeps the aspect judgments and opens a
discrepancy. The overall verdict stays unresolved. For declarations without
that dependency, GOLEM XIV applies these rules.

| Aspect judgments or proof status | Overall result |
| --- | --- |
| All aspects match | `formalizes` |
| Lean assumes more or proves less, with comparable objects | `weakens` plus a `manuscript_vs_formalization` discrepancy |
| Lean strengthens at least one aspect and weakens none, with comparable objects | `strengthens` |
| An aspect is incomparable | Open discrepancy without a correspondence verdict |

The first version accepts reviewer judgments and supplies no model proposals.

On reopening, compare the saved revisions with the current files. Mark a
changed manuscript passage stale. If the Lean file or commit changes, offer
**Read Lean declaration** again. A new type or changed axiom dependencies
creates a `signature_changed` discrepancy. An absent declaration creates
`declaration_missing`. Keep the earlier review and its exact evidence
available. A missing current file leaves its comparison unresolved. Older
reviews and saved reports keep their stored revisions. When they depend on
`sorryAx`, GOLEM XIV displays the unresolved proof obligation in the review and
report and includes it in exports made after the update.

## Second reading

1. **Reconstruct.** Show only the printed statement. The second reader writes
   what a faithful formal statement must contain for each aspect. Save this
   reconstruction as an immutable revision.
2. **Reveal.** After the reconstruction is saved, reveal the generated Lean
   facts and then the first review. Record the reveal time and the revisions
   disclosed.
3. **Reconcile.** For each disagreement, record a revision to the first reading,
   a revision to the second reading or an open discrepancy. Retain both
   earlier readings.

The report says “reconstruction saved before reveal.” This describes what
happened in GOLEM XIV. Readers may have consulted material elsewhere.

## Reports

For a selected manuscript revision and Lean commit, show each review on its
own row. Each row names the pinned passage, the Lean module and qualified
declaration, and both source revisions. A result awaiting review has one row.
Each review shows its verdict, aspect judgments, axioms, open discrepancies
and second-reading status. Filter for open discrepancies, stale reviews or
missing second readings.

**Save report** writes an immutable snapshot to the workspace's private GOLEM XIV
store. Keep exact references to the reviews and revisions for comparison or
regeneration. **Export report…** writes a Markdown copy with exact references
to a reader-selected path and refuses to overwrite a file. **Delete report…**
moves only the snapshot to reversible Trash. **Earlier saved work** lists
saved reports and reports in Trash with **Restore** and a separate
**Permanently delete** action. Reviews, generated facts, discrepancies, second
readings and exports survive each snapshot lifecycle action. Permanent deletion
removes the report from the active store and prevents its recovery through
GOLEM XIV. Earlier storage generations and exported copies may retain its bytes.

## Acceptance

Use *Maximality of the Došen–Petrić Boolean Category* at the registered
[Palomar v3 revision](https://github.com/flengyel/Dosen-Petric-Maximality/tree/76a4ea71f257746bb6ea2cb2e686e85914c7347c).
Pin the [v25 manuscript](https://github.com/flengyel/Dosen-Petric-Maximality/blob/76a4ea71f257746bb6ea2cb2e686e85914c7347c/manuscript/Maximality_of_the_Dosen_Petric_Boolean_Category_v25.tex)
and use a matching local build in an isolated copy.

1. Review each numbered result and the Appendix D theorems against the
   declarations in the [claim map](https://github.com/flengyel/Dosen-Petric-Maximality/blob/76a4ea71f257746bb6ea2cb2e686e85914c7347c/docs/MANUSCRIPT_COMPLETE_CLAIM_MAP.md).
   Compare the report with the claim map and Palomar statements. Explain each
   difference as a review finding or a GOLEM XIV defect.
2. Read a declaration with an unfinished proof from the challenge module in
   its own Lean environment. Check that `sorryAx` is visible and blocks the
   overall verdict for matching and differing aspect judgments. The solution
   and challenge can use the same qualified names.
3. Change a hypothesis and rebuild the scratch project. Reopen the review.
   Check that the old revision stays available, reopening runs neither Lean nor
   Lake, and an explicit read records `signature_changed`.
4. Have a second reader complete a reconstruction and reconciliation.
   Verify that the report records the save before reveal and carries the
   resulting discrepancies.
5. Save and export a report. Try exporting onto the existing path. Trash,
   restore and permanently delete the snapshot. Verify that the export and
   underlying records survive all three actions.

Two v25 comparisons illustrate the **Strengthens** verdict on hypotheses.

- For Theorem 2.1, review `DosenPetric.Presentation.maximality` in
  `DosenPetric.PresentationMaximality`. It quantifies over arbitrary `P` and
  retains substitution closure and the distinct-pair hypotheses. The
  `DosenPetric.Palomar.maximality` declaration retains the nonemptiness
  hypothesis. [Lean declaration](https://github.com/flengyel/Dosen-Petric-Maximality/blob/76a4ea71f257746bb6ea2cb2e686e85914c7347c/DosenPetric/PresentationMaximality.lean#L10-L16)
- For Lemma 5.2, review `DosenPetric.Presentation.ShortProof.total` in
  `DosenPetric.PresentationShortProjection`. It needs compatibility with
  composition, pairing and copairing, and the contextual equation for each
  formula. The printed lemma assumes a full proof congruence.
  [Lean hypotheses](https://github.com/flengyel/Dosen-Petric-Maximality/blob/76a4ea71f257746bb6ea2cb2e686e85914c7347c/DosenPetric/PresentationShortProjection.lean#L33-L45)

Automatic paper-to-Lean matching, Lean-to-English translation, proof-structure
comparison, proof replay and new companion integrations are outside this design.
