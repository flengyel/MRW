# Selective formalization of MRW contracts

MRW is a candidate for a small executable specification of its stable storage
and integration rules. The first target is identity preservation during
relocation, followed by operation-state and report-classification invariants.
Formalizing the complete interface, external applications or mathematical
usefulness is outside this proposal. This document authorizes no toolchain
upgrade or claim that MRW's runtime is verified.

## Candidate obligations

| Model | Invariant to prove | Explicit limit |
| --- | --- | --- |
| Relocation and references | A verified relocation changes current locators while preserving logical IDs, capture IDs and immutable citation targets. Removing an association does not remove its external original. | Filesystem identity, durable publication and concurrent writes need stated environment assumptions and implementation checks. |
| Delegated operations | Core-generated creation/execution effects require an explicit request and a supported owner route. Uncertain dispatch cannot be retried without the required reconciliation/idempotency evidence; dispatch is not completion. | Native owner behavior, including Lean diagnostics, is distinct. Network loss, crashes and external outcomes remain nondeterministic inputs. |
| Report classification | Missing or incomplete coverage cannot imply available-but-unused; partial inspection cannot imply healthy; reporting preserves inspected payload state. | New report/control writes are permitted in their separate stores. Observed trace coverage is not proved by a classification theorem. |

Start with the relocation model because identity and retained-citation rules
already have concrete persisted representations. Keep independently editable
source notes and derived Zettels distinct; a formal model must not reintroduce
the rejected exact-copy/freeze requirement.

The first pilot proves safety and invariant preservation. Eventual completion
or recovery requires separate liveness obligations and explicit fairness or
availability assumptions; it does not follow from a safe transition relation.

## Relation to implementation

Define raw states/events, an executable transition function and desired
invariants separately. Prove the initial state and transition preservation,
then the invariant for reachable states. Include successful nontrivial
operations and rejected invalid transitions. A transition system that rejects
everything, has no reachable success, or assumes its desired postcondition
does not satisfy this objective.

For each obligation, identify the concrete Python/JavaScript entry points,
persisted fields and effects represented by the abstraction. Record omitted
effects and trust assumptions. Compare concrete traces and fault-injection
cases with the executable model; share test vectors where practical.
A conforming observed trace does not prove all implementation executions or
exclude unobserved writes. Claim implementation verification only for code with
a demonstrated refinement/correspondence argument, not from a separate model
alone. External libraries, OS durability and synchronization services retain
their own trust boundaries.

The model should inform [Codex maintenance](CODEX_MAINTENANCE.md): attach the
relevant obligation and counterexample/trace to a finding, compare it with the
[design contract](INTEGRATION_BOUNDARIES.md), repair the implementation or
justify a design revision, and rerun affected checks. The formal model is not
an authority above the intended contract. A mismatch requires investigation.

## Lean scope and dependencies

The repository already contains a separate justification development in
`lean/MRW/Justification`, pinned by `lean/lean-toolchain` to Lean 4.32.2 at this
review. Design-contract models belong in a separate `MRW.Contracts` namespace
and independently buildable target. They must not alter the mathematical
meaning or runtime role of the justification checker.

Start with Lean core and Std. Add dependencies only for an identified missing
capability, pinned compatibly with the selected toolchain:

- [Batteries](https://github.com/leanprover-community/batteries) supplies additional
  data structures and tactics; it is not a ready-made MRW contract verifier.
- [Veil](https://github.com/verse-lab/veil) is a Lean framework for transition
  systems. Evaluate it if the protocol model needs that machinery; a small
  state machine may need only ordinary inductive definitions and proofs.
- Lean provides verification-condition support for programs written in Lean.
  Current [documentation](https://lean-lang.org/doc/reference/latest/The--mvcgen--tactic/)
  recommends `vcgen` over `mvcgen`; [4.35 release notes](https://lean-lang.org/doc/reference/latest/releases/v4.35.0/)
  describe the newer support. Do not copy latest APIs into the existing 4.32.2
  development or upgrade its checker merely to run this pilot. These tools do
  not automatically verify arbitrary JavaScript/Python or external applications.

No `sorry` or new axioms may discharge the contract obligations. List environment
assumptions explicitly and inspect theorem dependencies. Use bounded build/test
jobs with measured memory/time; ordinary MRW reading must not require Lean.
Formalization must not block concrete usability repairs, including bibliography
rendering and the remaining [evaluation items](DESIGN_RECONCILIATION.md).

## Completion evidence

A completed pilot includes the prose-to-model mapping, executable transitions,
checked invariant proofs, nontrivial success and rejected/fault cases, explicit
assumptions, and links to corresponding runtime tests. State separately whether
the result is a proved specification, tested implementation conformance or a
proved implementation refinement. At present this is a proposal; no new
contract model or proof has been delivered.
