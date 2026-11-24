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
checker setup** and choose **Build local checker**. It runs Lake from the
installed Lean 4.32.2 toolchain and downloads nothing. If Lean 4.32.2 is missing,
install it in the workspace host’s terminal with
`elan toolchain install leanprover/lean4:v4.32.2`, then retry the build.
The checker requires the verified Linux x86-64/WSL build environment. MRW
rejects different compiler output. The official Lean editor extension is optional.

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
For ordinary notes, use the [source-selection and proposal-review workflow](SOURCE_GROUNDS_WORKFLOW.md).
Mathematical checking of the assertions remains separate. See the
[bounded API and format](JUSTIFICATION_ROUTE_SEARCH.md).

## Example: two proofs of Euclid's lemma

If a prime divides a product, it divides one of the factors. One proof uses
Bézout's identity; another uses unique prime factorization. The
[walkthrough](JUSTIFICATION_EUCLID_EXAMPLE.md) gives both proofs and shows their
distinct grounds. Withdrawing one bridge leaves the other recorded route
available, while preserving the earlier context. The route checker verifies
the conditional composition of those grounds, not the arithmetic proofs.

<a id="example-using-a-formal-proof-in-a-manuscript"></a>

## Relate a formal proof to a manuscript

A formal check concerns an exact declaration in a recorded environment. Using
it to support a manuscript also requires an admitted proof policy and a reviewed
correspondence between the formal proposition and the prose statement. MRW
checks how those grounds compose under the selected admissions; it does not
automatically establish the correspondence.

The [formal-proof example](JUSTIFICATION_LOGIC_EXPERIMENT.md#formal-proof-and-manuscript)
gives the admissions and the resulting derivation.

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
| Search and compare admitted grounds | Choose **Proofs → Justification…**. The bounded reader retains checked routes and exact source snapshots, supports withdrawal and reopens completed or unfinished contexts. Selected Markdown text or saved passages can supply a companion proposal for review and explicit admission. |
| Inspect retained evidence in VS Code | Run **MRW: Inspect Retained Record**. Choose **Documentary warrant package** and its directory, or **Verification and matching bundle** and select both files. Inspection validates and displays existing records; it creates no admission and does not rerun Lean. |

The documentary case records **that a model returned a particular passage**.
Admitting that documentary fact does not admit the mathematical assertion
written in the passage. An independently supported mathematical argument can
cite its own grounds even if a model suggested the question.

Ordinary reading and note-taking require no claim-entry or admission form.
Use [selected text or retained passages](SOURCE_GROUNDS_WORKFLOW.md) to prepare a
companion proposal, correct summaries and explicitly admit grounds. The supplied
response and exact source captures remain saved separately from admission.

<a id="documentary-response-commands"></a>

Developer commands for projecting, admitting and checking a retained model
response are documented in the
[technical specification](JUSTIFICATION_LOGIC_EXPERIMENT.md#executable-offline-documentary-bridge).
The [route-search guide](JUSTIFICATION_ROUTE_SEARCH.md) gives checker setup and
bounds; the [unfinished-context guide](UNFINISHED_CONTEXTS.md) describes resumption.
