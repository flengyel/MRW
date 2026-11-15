# Justification: grounds for a mathematical claim

The engine makes the reasons for using a claim inspectable: the supporting
passages, calculations or proof artifacts, the assumptions admitted, and the
steps connecting those grounds to the conclusion. It helps answer a practical
question when returning to an argument: **why was this claim used here?**

The current Lean checker verifies specified inference steps under a recorded
set of admissions. It does not search for arbitrary mathematical proofs.
The [bounded route-search API](JUSTIFICATION_ROUTE_SEARCH.md) now finds
alternative composed reasons from explicit admissions and rechecks a successor
context after withdrawal. Its integration with retained records and the reader
remains pending; it is not a complete proof search.

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
use it, and is there another argument? The proposed interactive workflow will
compare those routes and create a successor context when an admission is
withdrawn. The earlier context and its certificate remain inspectable.
General route search and that complete interaction are not delivered.

## What the records establish

| Record or relation | Question it answers |
| --- | --- |
| Provenance | Where did these bytes or this result come from? |
| External verification | What exact artifact was checked, by which tool and environment? |
| Premise admission | Which assertion or bridge was explicitly allowed in this argument? |
| Checked justification | Do the stated inference steps yield the displayed conclusion under those admissions? |
| Human assessment, recorded separately | What grounds were accepted, challenged or qualified, and why? Judgments can remain in ordinary notes; the complete assessment/comparison interface remains pending. |

A citation does not automatically admit its source's assertion. A successful
formal check does not supply the manuscript correspondence. Several citations
may share the same underlying ground. In the logic, alternatives do not
measure confidence or independent corroboration. The engine keeps these
questions available for examination; mathematical judgment remains necessary.

## Current tools

| Task | Existing route and limit |
| --- | --- |
| Inspect retained evidence in VS Code | Run **MRW: Inspect Retained Record**. Choose **Documentary warrant package** and its directory, or **Verification and matching bundle** and select both files. Inspection validates and displays existing records; it creates no admission and invokes no checker. |
| Read the manuscript example | Run `mrw why PATH/TO/rs_Appendix_A.tex`. This requires the exact supported manuscript revision and reads the packaged, previously checked bundle. It neither checks a new proof nor supports arbitrary manuscripts. |
| Reopen a documentary package | Run `mrw show-documentary PACKAGE_DIRECTORY`. This displays the retained package without another model request or Lean run. |

The documentary case records **that a model returned a particular passage**.
Admitting that documentary fact does not admit the mathematical assertion
written in the passage. An independently supported mathematical argument can
cite its own grounds even if a model suggested the question.

Ordinary reading and note-taking require no claims, logic terms or admission
forms. The complete generic claim-to-alternative-arguments interface is pending.

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

The implementation uses the non-factive J₀/J(CS) calculus in
`lean/MRW/Justification/`. Python binds, validates and retains its artifacts;
it does not implement a second inference checker.
