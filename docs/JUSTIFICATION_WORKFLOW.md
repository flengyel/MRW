# Justification Logic in MRW

<a id="justification-grounds-for-a-mathematical-claim"></a>

MRW uses Justification Logic to represent and check explicit reasons for a
mathematical claim. A retained argument shows its supporting passages,
calculations or proof artifacts, the assumptions admitted, and the steps
connecting those grounds to the conclusion. It answers a practical question
when returning to an argument: **why was this claim used here?**

The reference is Sergei Artemov and Melvin Fitting,
*Justification Logic: Reasoning with Reasons*, Cambridge Tracts in Mathematics
216, Cambridge University Press, 2019
([publisher](https://www.cambridge.org/core/books/justification-logic/8E496BD49A8141542587B78EFBFCD5A9);
[DOI](https://doi.org/10.1017/9781108348034)).
MRW implements a limited part of the formal framework developed in this book.
Its records, checker and bounded search have the specific scope described below.

## Justification assertions and reasons

Let `A` and `B` be formulas expressing claims, and let `s` and `t` be
justification terms. The assertion `t:A` says that `t` is a reason for `A`.
The term makes the reason available for inspection instead of suppressing it
in a bare assertion of the claim. In MRW, a claim's mathematical content remains
in its versioned prose, LaTeX, Lean or other representation; an opaque atom
identifies that exact claim version.

Two operations on reasons are central:

| Operation | Inference | Meaning |
| --- | --- | --- |
| Application | From `s:(A → B)` and `t:A`, derive `(s·t):B`. | Compose a reason for an implication with a reason for its premise. |
| Sum | From `s:A`, derive `(s+t):A`; from `t:A`, derive `(s+t):A`. | Either summand suffices as an available reason for the same claim. |

Sum does not measure confidence, independence or additional corroboration.
Distinct arguments may share an admission; the retained dependencies show
that overlap.

MRW records a context: the exact admissions permitted in the argument, together
with their sources, scope and attribution. The Lean checker verifies a
certificate of derivation in the selected context and logic profile. The
current profiles, `J₀` and `J(CS)`, are non-factive: deriving `t:A` alone
does not license the further inference to `A`. Premise admission and the
decision to rely on a claim remain explicit.

A `J(CS)` profile also identifies a constant specification: the permitted
constant assertions about logical axioms. It is not a list of trusted authors,
books, model providers or software. The book treats broader logics and semantic
conditions; MRW does not implement all of them. The present subsystem adds no
factivity axiom, positive introspection or general semantic model checker.
The [technical specification](JUSTIFICATION_LOGIC_EXPERIMENT.md#logical-basis)
defines the implemented syntax and rules.

The checker and search have different scopes. The checker supports the named
profile's propositional axioms, Application, Sum, modus ponens, contextual
premises and authorized constant-specification steps. The
[bounded route search](JUSTIFICATION_ROUTE_SEARCH.md#scope-and-bounds) starts
from admitted reason assertions and composes them through Application. It does
not generate arbitrary sums, introduce constant-specification members or
perform a complete Hilbert proof search. Each returned route carries a
certificate accepted by the existing checker. Neither a limit nor an empty
result proves that the goal is underivable. The reader uses the `J₀` transport;
the generic Lean API also accepts valid `J(CS)` profiles within these limits.

## Read, search and resume grounds

Choose **Proofs → Justification…**, then **Explore Euclid’s lemma**. Read the
claim and the supplied admissions; the source buttons show their exact retained
text. Opening the view creates no admission or saved result.

Choose **Search under these admissions** to run the bounded Lean search and
retain its certificates. If its local checker is unavailable, expand **Local
checker setup** and choose **Build local checker**. This explicit build uses an
already installed Lean 4.32.2 toolchain and downloads nothing. It currently
requires the verified Linux x86-64/WSL build environment. Different compiler
output is rejected; ordinary reading and saved-result inspection remain usable.
The official Lean editor extension is optional for this headless checker.

Each route lists its admitted grounds. A source button opens the retained
passage in the same reader; **Back to routes** restores the comparison.
**Withdraw a ground…** creates and checks a successor context. The confirmation
states its scope: the earlier context, source notes and old certificates remain.
**Open earlier context** reads that predecessor without rerunning a check.
**Return to document** returns to the originating document location and preserves
its open buffer. An edited exact destination is reported rather than replaced.

Close/reopen MRW, choose **Justification…** and select the saved result. Reopening
reads the immutable result, exact sources and recorded checker identity; it
requires no Lean build, process or network connection. Before a search starts,
MRW saves its exact request, source snapshots and originating document location.
If the search fails or the reader closes, choose **Unfinished: …** in the same
picker. It reopens that saved context without building or checking; retry is
explicit and keeps the request ID. A completed result replaces the unfinished
picker entry, including after an uncertain save. Earlier context bytes remain.
If the initial context save fails, Lean is not started; keep the reader open
and retry the save. Saved workspace locations are relative; notes-folder
locations keep their original root. An unavailable or edited exact destination
is reported rather than guessed.

**Open an explicit context file…** accepts the existing formula/admission
vocabulary with exact source snapshots and scoped attribution. This is a
reviewed-input/developer route; ordinary reading never requests this file.
The current GUI does not yet assemble arbitrary contexts from a reader's
notes or check their arithmetic assertions. See the
[bounded API and format](JUSTIFICATION_ROUTE_SEARCH.md).

## Example: two proofs of Euclid's lemma

If a prime divides a product, it divides one of the factors. One proof uses
Bézout's identity; another uses unique prime factorization. The
[walkthrough](JUSTIFICATION_EUCLID_EXAMPLE.md) gives both proofs and shows their
distinct grounds. Withdrawing one bridge leaves the other recorded route
available, while preserving the earlier context. The present Lean tests check
the conditional composition of those grounds, not the arithmetic proofs.

<a id="example-using-a-formal-proof-in-a-manuscript"></a>

## Existing regression: a range-lifting warrant

Suppose a manuscript lemma is supported by a theorem checked in Lean. Three
grounds need to remain visible:

| Ground | What must be recorded |
| --- | --- |
| The formal proof was checked | The exact declaration, source and environment revisions, checker command and result. |
| The check supports the formal proposition | The explicitly admitted proof policy and its scope. |
| The formal proposition supports the manuscript lemma | A reviewed correspondence between the exact formal statement and the exact prose statement, with the person or policy admitting that bridge. |

The engine checks how these grounds combine to support the manuscript claim
under those admissions. Its retained account shows the claim, the route,
the assumptions and the source revisions. This is the existing regression from the Categorical Rice–Shapiro
manuscript (`rs_Appendix_A.tex`): the range-lifting lemma `lem:range-lifting-pullback-section`, linked to
Lean's `CategoryTheory.Dom.exists_total_lift_iff_rangeLiftPullback_section`.
Its logical details are in the [technical specification](JUSTIFICATION_LOGIC_EXPERIMENT.md#appendix-a-slice).

A changed or disputed correspondence raises a concrete question: which routes
use it, and is there another argument? The bounded reader workflow can compare
the routes in an explicit context, withdraw an admission and check a successor.
Its earlier context and certificates remain inspectable. Direct reviewed
assembly from arbitrary notes and paper–Lean correspondence review remain
separate pending work; the range-lifting example supplies no automatic bridge.

## What the records establish

| Record or relation | Question it answers |
| --- | --- |
| Provenance | Where did these bytes or this result come from? |
| External verification | What exact artifact was checked, by which tool and environment? |
| Premise admission | Which assertion or bridge was explicitly allowed in this argument? |
| Checked justification | Do the stated inference steps yield the displayed conclusion under those admissions? |
| Human assessment, recorded separately | Why were grounds or bridges accepted, challenged, qualified or withdrawn? Judgments can remain in ordinary notes. |

Provenance and source links identify origins and passages; a Justification Logic
certificate checks inference under a specified profile and context. The source
graph does not itself supply those logical steps.

A citation does not automatically admit its source's assertion. A successful
formal check does not supply the manuscript correspondence. Several citations
may share the same underlying ground. In the logic, alternatives do not
measure confidence or independent corroboration. The engine keeps these
questions available for examination; mathematical judgment remains necessary.

## Current tools

| Task | Existing route and limit |
| --- | --- |
| Search and compare admitted grounds | Choose **Proofs → Justification…**. The bounded reader retains checked routes and exact source snapshots, supports withdrawal and reopens completed or unfinished contexts. Arbitrary context assembly from ordinary notes still uses reviewed developer input. |
| Inspect retained evidence in VS Code | Run **MRW: Inspect Retained Record**. Choose **Documentary warrant package** and its directory, or **Verification and matching bundle** and select both files. Inspection validates and displays existing records; it creates no admission and does not rerun Lean. |
| Read the manuscript example | Run `mrw why PATH/TO/rs_Appendix_A.tex`. This requires the exact supported manuscript revision and reads the packaged, previously checked bundle. It neither checks a new proof nor supports arbitrary manuscripts. |
| Reopen a documentary package | Run `mrw show-documentary PACKAGE_DIRECTORY`. This displays the retained package without another model request or Lean run. |

The documentary case records **that a model returned a particular passage**.
Admitting that documentary fact does not admit the mathematical assertion
written in the passage. An independently supported mathematical argument can
cite its own grounds even if a model suggested the question.

Ordinary reading and note-taking require no claim-entry or admission form.
Direct reviewed assembly of arbitrary contexts from existing notes and retained
grounds remains pending. The current bounded comparison and resumption tools
are described above.

## Documentary response commands

This is the current developer CLI for an existing finalized `ModelCall`, not a
required reading workflow. It makes no new provider request. The commands below
use placeholder paths and fresh record IDs; use new output files outside genuine
research stores. Choose a passage after inspecting the retained response.
`UTC_ADMISSION_TIME` must be the actual admission time, at or after the call's
finalization and no later than the subsequent check.

```sh
mrw review-response MODEL_CALL
mrw review-response MODEL_CALL --passage PASSAGE_NUMBER

mrw project-response MODEL_CALL --passage PASSAGE_NUMBER \
  --representation-id REPRESENTATION_ID --claim-id DOCUMENTARY_CLAIM_ID \
  --output NEW_PROJECTION_JSON

mrw admit-documentary NEW_PROJECTION_JSON \
  --fixture-id RUN_ID --context-id CONTEXT_ID --admission-id ADMISSION_ID \
  --admitted-by-kind person --admitted-by-id ACTOR_ID \
  --at UTC_ADMISSION_TIME --rationale RATIONALE --scope SCOPE \
  --derivation-id DERIVATION_ID --output NEW_ADMISSION_JSON

mrw check-documentary NEW_PROJECTION_JSON NEW_ADMISSION_JSON \
  NEW_PACKAGE_DIRECTORY --lean-root PATH_TO_MRW_LEAN_PROJECT

mrw show-documentary NEW_PACKAGE_DIRECTORY
```

Projection retains the selected bytes and attribution without admitting a
premise. Admission explicitly records only the documentary assertion.
`check-documentary` validates the bindings, invokes this repository's pinned
Lean checker and retains a new package; its destination must not exist.
Use `--help` on each command for the supported options. The
[technical specification](JUSTIFICATION_LOGIC_EXPERIMENT.md#executable-offline-documentary-bridge)
defines the checks, chronology and logical limits.

The integral checker lives in `lean/MRW/Justification/`; the bounded search
uses its separate route-build profile. Python binds, validates and retains the
artifacts and source snapshots; it does not implement a second inference
checker. The [route-search guide](JUSTIFICATION_ROUTE_SEARCH.md) records the
bounds and setup, and the [unfinished-context guide](UNFINISHED_CONTEXTS.md)
records the resumption contract.
