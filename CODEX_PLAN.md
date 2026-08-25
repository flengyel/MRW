# CODEX_PLAN.md

Plan for the first experimental implementation. It inherits the purposes in
`VISION.md`, the entities and invariants in `DOMAIN_MODEL.md`, and the workflows
in `UX_SPEC.md`.

## Governing constraint

The first experimental implementation begins with a substantive mathematical
task. It may not require schema population, a context questionnaire, a
declaration inventory, or a written account of comprehension before an attempt
begins.

Two initial experiments test distinct functions:

1. problem-centered study in a source with little or no formalization;
2. mathematical re-entry and optional informal/formal correspondence in
   `Categorical_Rice_Shapiro`.

Infrastructure is added only when one of these sessions requires it. Evidence
comes from the `WorkArtifact`s and `TaskEvidence` produced by the sessions, not
from asserted states of comprehension.

## Global non-goals

The first implementation does not attempt:

- general corpus ingestion or complete ingestion of any large reference;
- comprehensive coverage of either experimental source;
- formalization of the problem-centered source;
- a domain map authored before mathematical work begins;
- questionnaires, confidence ratings, or comprehension forms;
- automated correctness decisions for informal proofs;
- a GUI platform, component library, or framework commitment;
- Mathlib-scale Lean analysis;
- simultaneous support for multiple model services, autonomous follow-up calls,
  or a general chat interface;
- encoding a research-decision taxonomy or a predictive-framework schema;
- multi-user operation, synchronization, accounts, or deployment.

AI-generated theorems, proofs, explanations, and examples may be studied with
their provenance and verification status. Task-mediated model assistance is
required in Stage 1 because the assistant's-assistant claim is one of the claims
being tested. The first implementation makes one provider request per explicit user action
to one configured model, preserves each `ModelCall` and any raw response, and
records relevant extracted mathematical content as AI proposals. It defines
only the narrow provider boundary needed to keep canonical records independent
of provider-specific request types; it does not add another adapter, service
selection, or routing.

## Target

Complete both experimental sessions in `UX_SPEC.md` §9:

- solve, resume, and later reconstruct selected problems from an unformalized,
  problem-centered source;
- re-enter one region of `Categorical_Rice_Shapiro`, continue mathematical work,
  and inspect formal correspondences only where they exist.

The first target tests problem-centered learning, task-mediated model assistance,
and retention. It includes at least one bounded model call attached to an actual
obstruction in the work. The second tests reconstruction of prior work and
maintenance of explicit informal/formal relations. Success in either does not
establish success in the other.

---

## Stage −1 — Repository

**Goal.** Establish the design baseline in one place.

**Deliverable.** A repository containing `README.md`, `VISION.md`,
`VOCABULARY.md`, `DOMAIN_MODEL.md`, `UX_SPEC.md`, and `CODEX_PLAN.md`. The README
states that the repository is design-only, identifies the role of each design
document, and describes the first implementation as experimental.

**Non-goals.** No package layout, dependency manifest, CI, application skeleton,
or implementation of any kind.

**Why at all.** These six files form the design baseline against which later
stages will be evaluated.

---

## Stage 0 — Work the benchmark mathematics

**Goal.** Select a small coherent problem cluster from an algebraic number
theory text and work on it before designing storage or navigation around it. No
application code.

**Deliverable.** The mathematical artifacts that ordinary work produces: TeX
proofs or attempts, Sage calculations where useful, exact source locations, and
the unresolved step at which work stopped. Also list the system operations that
would have helped during the work, such as locating a prerequisite, restoring a
prior attempt, checking an example, or requesting a bounded hint. For at least
one actual obstruction, identify the mathematical request and the minimal source
and work context that Stage 1 should send to a model. This list describes
operations, not an internal state.

**Acceptance.** At least one theoretical problem and one computational or
example-driven problem have been attempted. The proposed first session can be
specified from observed needs without requiring preliminary classification by
the mathematician.

**Non-goals.** No YAML front matter, object inventory, domain-map population,
formalization, comprehensive chapter summary, schema, database, parser, or
framework.

**Checkpoint.** If the design cannot support these attempts without preparatory
data entry unrelated to the mathematics, revise the workflow and domain model
before implementation.

---

## Stage 1 — Minimal problem session

**Goal.** Support the problem-centered session of `UX_SPEC.md` §9.1 on the Stage
0 cluster.

**Deliverable.** A local experimental application that can:

- open a selected problem with a stable source locator;
- show the relevant definitions, results, examples, and earlier problems;
- open or attach the ordinary TeX or Sage file used for the attempt;
- request graduated assistance from one configured model;
- before transmission, show a compact disclosure of the provider, requested
  model, exact versioned source passages and work artifacts selected, and input,
  output, and timeout limits; derive the disclosure from the task, allow context
  removal, and require no purpose or provenance form;
- exclude other workspace history and private notes by default and transmit
  nothing in the background;
- create at most one provider request per explicit user action, with no provider
  tools, automatic retry, or recursive request; record any user-requested retry
  or follow-up as a new `ModelCall` linked to its predecessor;
- preserve every application-supplied instruction and message, requested and
  resolved model identifiers, adapter version, limits, non-secret settings,
  status, response identifier when supplied, and raw response in the
  `ModelCall`;
- request disabled API response storage when the service supports it, record the
  setting, display any provider retention that cannot be disabled before
  submission, and avoid claiming that this controls every form of provider
  processing or retention;
- extract only proposals that enter the work or whose correction, rejection, or
  abandonment is recorded, each with
  `Provenance.origin = ai_proposal`, exact response span, and a link to its
  `ModelCall`;
- treat model output as untrusted content, with no executable markup, command
  execution, link opening, tool invocation, or resubmission without a user
  action;
- keep credentials in secret configuration and exclude them from model inputs,
  records, logs, exports, and error text;
- preserve each attempt, revision, computation, consulted source, proposal
  disposition, and check requested as `WorkArtifact`s and `TaskEvidence`.

The source material and problem relations may be entered only as needed for the
selected cluster. A complete subject model is not a prerequisite. The raw
mathematical response is preserved even if a small structured envelope is used
for status, citations, or suggested checks.

**Acceptance.** A proof problem and a computational or example-driven problem
can each be attempted end to end. Both sessions begin with the problem, work
without any formal artifact, and require no comprehension form. At least one
model call is traceable from selected context and exact input through raw
response to a proposal that is used, corrected, rejected, or abandoned. No
generated claim becomes a source fact, verification, or human judgment
automatically. Ordinary mathematical sessions need not make a model call; the
required call exists to evaluate Stage 1.

**Non-goals.** No general ingestion, comprehensive topic map, formal theorem
analysis, graph rendering, support for a second model service or adapter,
automatic model selection, provider tools, autonomous calls, conversation
interface, prompt library, or framework commitment.

---

## Stage 2 — Resumption and task-based retention

**Goal.** Resume interrupted work and test retention through later mathematical
performance.

**Deliverable.** Persistence of source location, current attempt, revisions,
computations, unresolved step, and assistance used; `ReviewItem`s derived from
the work; `ReviewState` generated from `TaskEvidence`.

Review tasks include reconstructing a proof, completing a gap, solving a related
problem, varying a hypothesis, producing an example or counterexample, and
repeating a Lean or Sage task. They do not request a confidence rating or a
written description of comprehension.

**Acceptance.** After an interruption, the exact unfinished mathematical step
can be resumed without recreating the surrounding context. After a later
interval, at least one solution is reconstructed or one related problem is
solved, and the resulting artifact updates `ReviewState` mechanically.

**Non-goals.** No scheduling-algorithm research, reference-string grading of
proof ideas, or manually asserted proficiency score.

**Checkpoint.** If stored context does not reduce the work required to resume,
remove or revise the records that failed to help. If a review task does not
exercise mathematics worth retaining, remove that task kind without treating
the result as evidence against the other functions.

---

## Stage 3 — Mathematical re-entry

**Goal.** Re-enter one coherent region of `Categorical_Rice_Shapiro` and
continue mathematical work after an interruption.

**Deliverable.** A session beginning from a mathematical question, manuscript
result, unfinished proof, or earlier `WorkArtifact`. It makes available stable
source occurrences, relevant prior artifacts, unresolved questions, and the
source locations and relations needed to resume. Formal artifacts remain
optional and are not the initial object of the session.

**Acceptance.** The session reconstructs enough specific context to continue a
proof, calculation, exposition, or formalization task. The evidence is the
continued work product and its source use, not a report about comprehension.

**Non-goals.** No comprehensive reconstruction of the project, no requirement
to inspect Lean, and no discrepancy machinery yet.

---

## Stage 4 — Optional formal correspondence and discrepancy

**Goal.** Where formal artifacts exist, connect them to the mathematical work
and test whether changes can be detected precisely.

**Task 4.0 — reconnaissance.** Run existing tools against the selected Lean
region and inspect what they emit: `lean4export`, `doc-gen4`, `ntp-toolkit`, and
LeanArchitect. Consume existing output unless a required formal fact is absent.

**Task 4.1 — minimal extraction, only if required.** Obtain declaration types,
signatures, dependencies, axiom usage, verification status, and environment
revision mechanically. Nothing parses Lean source in Python, and generated facts
are never hand-edited.

**Deliverable.** Explicit correspondences between source occurrences and formal
artifacts, plus `Discrepancy` records for an identified mismatch. Formal views do
not appear for objects without formal material.

**Acceptance.** A change such as renaming a declaration or adding a hypothesis
invalidates only the exact affected correspondence or source-linked claim. A
conceptual dependency is not rejected merely because it is absent from the
formal dependency graph.

**Non-goals.** No Mathlib-scale extraction, elaboration traces, proof-state
archive, automatic repair, notifications, or formal coverage outside the
selected region.

**Checkpoint.** If existing tooling already supplies the required facts and
connections, use it and omit extraction work. If discrepancy detection produces
irrelevant conflicts, narrow or remove it.

---

## Stage 5 — Evaluate the experiment

**Goal.** Decide which components helped actual mathematical work and which
should be removed or revised before another corpus is attempted.

**Deliverable.** An evaluation based on completed and abandoned
`WorkArtifact`s, `TaskEvidence`, source-recovery operations, `ModelCall`s,
outbound context, raw responses, proposals used or rejected, incorrect or
premature assistance, successful resumptions, and later mathematical tasks. No
questionnaire about comprehension is introduced.

**Acceptance.** Each component receives a decision supported by session
evidence: retain, revise, or remove. Model assistance is retained only if at
least one call improves subsequent mathematical work enough to justify its
correction, provenance, disclosure, and record-keeping costs. Expansion to a
large reference work is considered only after the problem-centered and re-entry
experiments have each been evaluated on their own terms.

**Non-goals.** No scale-up, production deployment, or claim that one successful
session establishes a general theory of mathematical understanding.

---

## Manuscript prerequisite

Before Stage 4, add `\label`s to `rs_Appendix_A.tex` and reference labels rather
than line numbers. `UX_SPEC.md` and `DOMAIN_MODEL.md` require stable locators,
and the current correspondence contains roughly fifty positional references to
a manuscript that changes. This is a manuscript edit; no exporter substitutes
for it.

---

## Not decided here

- Which initial algebraic number theory problem cluster to use.
- Storage beyond the files needed by the first sessions.
- Whether the application edits TeX and Sage work directly or opens existing
  tools and records their artifacts.
- Which single model and service supplies Stage 1 assistance; the selection is
  configuration and every call records the exact model used.
- Whether later experiments should add tool-enabled calls, another model service,
  or analysis by research-decision type. None is a Stage 1 requirement.
- How the orientation view differs between a large problem-centered source and
  a small research project.
- Which relations are authored and which may be proposed from source structure
  and prior attempts.

## Order and stopping

Stages run −1, 0, 1, 2, 3, 4, and 5. Each checkpoint evaluates a specific
component. Failure revises or stops that component unless the evidence bears on
the full thesis in `VISION.md`.

The repository remains design-only until a separate decision authorizes Stage
0. This plan does not authorize implementation.
