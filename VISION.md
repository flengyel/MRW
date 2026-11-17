# Vision

MRW supports mathematical understanding and research. Its aims are to study
literature and AI-generated mathematics, inspect grounds for using results,
and continue unfinished work.

## Mathematical understanding

An AI-generated argument or a checked formal proof may be available before its
recipient understands it. MRW should help expose its governing idea, recover
needed definitions, examine hypotheses, fill omitted steps and develop examples
or counterexamples. An attempted reconstruction may reveal an error or an
unresolved gap. It concerns the returned mathematics, not hidden model reasoning.

Lean-to-English explanation and English-to-Lean formalization are intended uses.
Compare the mathematical statement with the formal declaration, including its
types, hypotheses and conclusion. A successful Lean check does not establish
that the declaration expresses the intended mathematics. Existing Lean tools
supply checking, goals and diagnostics; MRW connects them to the argument being
studied.

Requested orientation should begin with the purpose and organization of the
subject, then its central concepts and results, a selected argument, its idea
and its details. A focused question can start at any of these points.

## Deliberate practice

Deliberate practice is central to learning with MRW. Work from the current
mathematics: attempt a proof step, reconstruct an argument, solve a changed
example, explain why a hypothesis is needed, or repair a Lean proof. Connect the
attempt to targeted feedback, correction and a later reconstruction or
application. Paper-based work remains a supported way to practise.

Within a chosen study, preserve the distinction between unaided work, assistance,
correction and unfinished attempts. Viewing a solution must not count as
successful recall. Keep the submitted work and the help used so practice can be
resumed rather than replaced by passive rereading. Selected questions may enter
spaced review; ordinary reading does not automatically start exercises or create
an overdue queue.

The [study workflow](docs/ACTIVE_STUDY_WORKFLOW.md) describes current controls
and limits. Reported effort, observed activity, AI feedback and mathematical
assessment remain separate; none supplies a general mastery score.

## Justification, understanding and benefit

Sufficient grounds for using a result need not provide an explanation of it.
MRW should support appropriate use and further understanding without requiring
complete proof reconstruction first. It promises neither effortless mastery nor
that every justified result has a human-accessible explanation.

Explanatory progress, practical application, inspectable grounds and research
continuity are distinct benefits. A saved source or successful check may support
one without establishing the others.

Retain exact source passages, revisions, original AI responses and attribution
alongside explanations, calculations and corrections. A paraphrase is separate
from its source. Formal checks have a recorded scope; informal-to-formal
correspondence requires mathematical review.

The integral Justification Logic engine, based on Artemov's theory as presented
by [Artemov and Fitting](https://doi.org/10.1017/9781108348034), composes explicit
reasons under scoped admissions. It keeps alternative routes and the effect of
withdrawing an admission inspectable. The calculus is non-factive: deriving
$t:A$ does not assert bare $A$. Provenance, formal verification, admitted reasons
and understanding answer different questions.

## Working environment

Keep ordinary documents and the mathematician's chosen tools. VS Code owns
editing and buffer recovery; Lean checks proofs; Jupyter and SagePod execute
calculations; Zotero manages references. Obsidian and the maintainer's
[published note format](https://github.com/flengyel/Zettel) are optional.
MRW connects the work without replacing those applications.

Preserve the source location, attempt, failed approach, useful result and place
to continue. [Vertex elimination](docs/PROOF_GRAPH_WORKFLOW.md#vertex-elimination)
should simplify a displayed proof while leaving the original steps available
for expansion. Different views and explanations must not silently change the
source argument or its checking status.

Introduce an interaction when it helps the mathematics. Reading needs no
registration form or account of an internal mental state. Model requests,
calculations and checks remain explicit actions; resumption does not silently
repeat them.

## Study material

The current public walkthrough uses [Euclid's lemma](docs/JUSTIFICATION_EUCLID_EXAMPLE.md).
Euclid's algorithm can supply further elementary examples. Two manuscript cases
are [Pointwise provable equality and the failure of composition](https://github.com/flengyel/FailureOfComposition)
and [Došen–Petrić maximality](https://github.com/flengyel/Dosen-Petric-Maximality),
with their associated Lean developments. Other manuscripts can be added later.

Current capabilities and remaining work belong in the [README](README.md) and
[design register](docs/DESIGN_RECONCILIATION.md).
