# UX_SPEC.md

The mathematician's workflow the interface must support. Companion to
`VISION.md` (why the system exists) and `DOMAIN_MODEL.md` (entities and
invariants). Workflow and principles only; no screens, widgets, or framework.

## 1. Design principle

The interface supports doing and studying mathematics. It does not require a
declaration name, a formal development, or a preliminary account of what the
mathematician understands.

A session begins from a mathematical objective: orient in a subject, solve a
problem, study a theorem or proof, reconstruct earlier work, prepare to teach,
or examine generated mathematics. The mathematician begins the mathematical
work in the ordinary medium appropriate to it. Theorem Terminal supplies source
context, prior work, computations, and assistance when relevant.

Five constraints follow from `VISION.md` and apply throughout this
specification.

**Mathematical work comes first.** The interface must not require a subject map,
questionnaire, or structured description of comprehension before a problem,
proof, calculation, or exposition can begin.

**Formal material is optional.** When formal material exists, it appears after
the informal mathematical context and may be consulted when useful. Its absence
never prevents orientation, theorem study, proof study, problem solving, or
review.

**Origin is always visible.** No view presents a machine proposal as a
mathematician's judgment or as a mechanically derived fact, and no view presents
a derived fact as a claim someone made.

**External transmission is explicit.** A model call is initiated from the
current mathematical task. Before transmission, a compact disclosure identifies
the configured provider and model, the exact versioned source passages and work
artifacts selected, the request limits, and any provider retention that cannot
be disabled. The system derives this disclosure from the active task; the
mathematician writes the mathematical question and may remove context but
completes no purpose or provenance form. All other workspace history and private
notes are excluded by default. No source or work artifact is transmitted in the
background.

**Warrant is explicit, distinct, and task-triggered.** The justification-logic
warrant subsystem is integral to the architecture, but its view is presented
only when an active task makes the warrant question relevant. It may show a
checked derivation relative to named admitted premises. It never presents
contextual derivability as source identity, external verification, truth, or
human acceptance, and it never precedes the mathematical study that made the
warrant question relevant.

---

## 2. Session types

Modes are not application tabs. They name mathematical activities, and a
session may move among them.

### Orientation

Enter or revisit a subject. Locate its organizing concepts, central results,
principal problem families, and the relations needed for the work at hand. The
system preserves the source locations and relations consulted, together with
prior work, so that a later session need not reconstruct them from nothing.

Orientation serves a mathematical task. It is not a preliminary exercise in
describing the subject or completing a domain model.

### Problem solving

Work on a source problem, an omitted proof step, a calculation, an example, or
a question arising from research. The session opens the problem and an ordinary
working file immediately. It can then supply, on request, the exact source
location, nearby definitions and results, related problems, prior attempts,
computations, and graduated hints.

The session records the resulting `WorkArtifact`s and the assistance used as
`TaskEvidence`. It does not interrupt the work to ask for a report about the
mathematician's internal state.

### Theorem study

Study one result: what it asserts, why it matters, how it is used, and why it is
true. The default order is specified in §3.

### Proof study

Reconstruct an outline, identify the crucial reduction, inspect intermediate
claims, fill omitted steps, test examples, and compare methods. When a formal
counterpart exists, comparison with it is available; proof study does not depend
on such a counterpart.

### Formal exploration

This mode exists only for an object with formal material. It shows declarations,
dependencies, axiom usage, verification status, and proof states, with links to
the corresponding informal mathematics where those correspondences have been
established.

A discovery made during formal exploration remains in the proof, code,
calculation, or ordinary note produced during the work. The system may also
record an explicit relation or discrepancy. No second account of comprehension
is required.

### Review

Perform mathematics selected from earlier work: reconstruct an argument,
complete a proof, solve a related problem, vary a hypothesis, produce an example
or counterexample, or repeat a Lean or Sage task. `ReviewState` is generated from
`TaskEvidence`; it is not a score asserted by the mathematician. See §7.

### Formalization

Formalization begins from a mathematical statement, problem, or proof step. It
may reveal an unnecessary hypothesis, a derivable symmetry, a missing lemma, or
a mismatch between prose and code. Such results are preserved as
`WorkArtifact`s, relations, or discrepancies produced during the mathematical
work.

Formalization is neither required for a corpus nor required before study. The
first problem-centered experiment therefore needs no formal development. A
separate experiment may test informal/formal correspondence where a formal
development already exists.

---

## 3. The theorem view

The default order for theorem study is:

```
Title
Why this result matters
Mathematical context — what it generalizes, what motivated it
Conceptual role — what work it does in the development
Statement
Proof idea — the idea that makes the proof work
Proof skeleton — the argument broken into its steps
Dependencies — what it rests on, formal and conceptual
Technical details
Formalization — when available
Verification — when applicable
```

`why` is a separate, explicitly requested post-correspondence view, not an
earlier Kallenberg level. In the first stateless CLI it assumes no prior command
or hidden session state. It cumulatively presents the source's purpose and
organization, central concepts and results, the selected result's role and
statement, governing idea, proof skeleton, available technical detail, and
reviewed formal correspondence in that order before displaying the exact claim
and context versions, admitted premises, term, derivation steps, checker result,
and separately labeled provenance and verification records. The checker result
is the linked `Verification` with method `justification_checker`, not a duplicate
field on the derivation. Its conclusion is labeled “derivable relative to these
admitted premises and policy,” never “true,” “known,” or “verified.”

**The statement precedes the proof idea.** Everything above the statement
answers *why am I reading this*; everything below answers *why is it true*.

**Dependencies follow the skeleton.** Which results a proof uses becomes
informative after the shape of the argument is visible. Formal dependencies and
conceptual prerequisites remain distinct.

Each section links to its source and to related work. Any section may be absent.
An absent formalization is an ordinary state of the corpus, not a gap the
mathematician must fill. A formal proof without an explanation is likewise
displayed without treating verification as comprehension.

---

## 4. Subject navigation

Navigation may proceed from subject to chapter or section, then to concepts,
results, problems, proofs, attempts, examples, and formal artifacts where they
exist. No mandatory route ends in a formal proof.

The navigation graph is not the formal dependency graph. Conceptual
prerequisites, generalizations, analogies, motivations, and `ProblemRelation`s
are distinct from extracted formal dependencies. Problem-relation kinds are
`asks_to_prove`, `asks_to_prove_step_of`, `asks_to_apply`,
`asks_to_compute_instance_of`, `asks_to_construct_example_of`,
`asks_to_construct_counterexample_to`, and `prerequisite_for`.

An object may occur in several sources. Navigation shows those occurrences and
the established correspondences between them, with kinds `same_claim`,
`formalizes`, `restates`, `strengthens`, `weakens`, `implies`, and
`is_implied_by`. It never silently identifies two occurrences.

---

## 5. Work products and provenance

The primary human-produced records are `WorkArtifact`s created while doing
mathematics: attempts, proofs, calculations, diagrams, examples,
counterexamples, code, exposition, and ordinary notes. The interface does not
require these artifacts to be rewritten as structured reports.

Source-derived records include stable locators and quotations. Machine-derived
records include types, signatures, imports, dependencies, axiom usage,
verification status, and downstream references. Machine-derived facts are not
hand-edited; a suspected error is recorded as a discrepancy against the exact
fact and source revision.

Machine-proposed records include candidate correspondences, prerequisite
relations, hints, proof outlines, and review tasks. Every proposal retains its
origin whether it is accepted, edited, rejected, or merely used during an
attempt.

`ModelCall` records are generated automatically from bounded assistance
requests. They preserve the selected context, exact application-supplied request
content, provider, requested and resolved model identifiers, limits, non-secret
settings, status, and any raw response. They are operational provenance, not
mathematical work the mathematician must restate and not a trust, support,
correctness, confidence, or acceptance record.

`JustificationDerivation` records, when present, come from checked certificates
and exact context snapshots. Their `PremiseAdmission`s expose the external basis
and scope of every source, verification, correspondence, or model-derived reason
used. No such record is required before ordinary mathematical work, and the
Python interface renders rather than rechecks the justification calculus.

**Correspondence authoring.** Linking two source occurrences is a mathematical
judgment. The kind of relation is explicit because `formalizes`, `restates`, and
`implies` assert different relationships.

**Recording during work.** The system records only what the work produces or
what is needed to resume it: the source locator, relevant problem or object,
artifact, revision, assistance used, and provenance. Optional notes remain
ordinary mathematical notes. Recording may not become a gate before the next
mathematical step.

---

## 6. Discrepancies

A discrepancy records a conflict between an identified claim, relation, source
occurrence, or generated fact and another identified record about the same
subject. It records what conflicts, what detected the conflict, and how it was
resolved: claim revised, correspondence updated, mathematics changed, generated
fact regenerated, or false positive. Nothing is repaired automatically.

The constraints specified in the domain model also apply here. Absence from a
formal dependency graph does not refute a conceptual dependency. A record about
one declaration says nothing about another declaration, however similar their
names or roles.

A discrepancy may influence later task selection only as evidence about a
specific artifact or relation. It does not license an inference about the
mathematician's internal state.

---

## 7. Review

Review presents a mathematical task, not a request for a confidence rating or a
description of comprehension. `ReviewItem` kinds include reconstruction, proof
completion, hypothesis variation, example, counterexample, related problem,
Lean exercise, and Sage task.

Exact hypotheses, signatures, and source wording remain available for lookup.
Review instead tests use: state the mathematical content needed for the task,
reconstruct the argument, supply a missing step, apply the result, distinguish a
nearby false statement, or solve a variation.

Proof-completion tasks may come from gaps left by an author, an earlier failed
attempt, or a formal proof when one exists. Formal material is one possible
source of tasks, not a prerequisite.

`ReviewState` is generated from `TaskEvidence`: completion, checking result,
hints used, later reconstruction, and performance on related problems. For work
that no machine can decide, the artifact remains available for mathematical
inspection; the system does not replace judgment with a score. No prompt asks
the mathematician to declare a level of comprehension.

---

## 8. AI-generated mathematics and machine assistance

AI-generated mathematics is source material for the same activities as
human-authored mathematics. Its origin, model when known, verification status,
source revision, and later judgments remain distinct. Formal verification does
not by itself establish that a human has understood the result.

Task-mediated assistance begins when the mathematician requests help with active
work: for example, asking for an explanation of a definition or result, a
possible source, criticism of an attempted step, an intermediate lemma, a
computation to perform, a proof outline, or a related problem. Theorem Terminal
constructs the request from the current problem or object, displayed source
passages, and displayed `WorkArtifact`s. Before submission, the mathematician
can inspect and reduce the exact outbound context. Nothing else is sent.

Each explicit user action creates at most one provider request. The request
obeys configured input, output, and timeout limits, invokes no provider tools,
and performs no automatic retry or recursive request. A retry or user-requested
follow-up creates another `ModelCall` linked to the preceding call.

Each request produces a local `ModelCall`. The record contains every
application-supplied instruction and message, the source and artifact versions
used, provider, requested and resolved model identifiers, adapter version,
limits, non-secret settings, times, status, response identifier when supplied,
and raw response. This record permits inspection; it does not promise
deterministic replay. Provider-side conversation state is not canonical.

When the provider allows API response storage to be disabled, the first
experiment requests that setting and records it. This does not assert that the
provider performs no other processing or retention; the configured service's
terms still govern its handling of the request.

The raw response is preserved before extraction. Only a statement, hint,
outline, calculation, source suggestion, criticism, or proposed solution that
enters the mathematical work, or whose correction, rejection, or abandonment is
recorded, becomes a `Representation` with
`Provenance.origin = ai_proposal`, a link to its `ModelCall`, and its exact
response span anchored to the response digest. The first extraction is
lossless; any paraphrase, normalization, or edit is a separate representation
linked to it. Storage and extraction are not integration. A suggested source
becomes a source occurrence only after it is independently retrieved and
identified; a reported calculation or proof check becomes a verification only
after the corresponding method or attestation is obtained separately.

When a selected proposal participates in an inspectable warrant, the interface
uses the ordinary justification records rather than an AI-specific status. It
keeps the documentary atom
\(D=\operatorname{ModelProduced}(C,h,s,R)\) distinct from the substantive atom
\(F\). Admitting \(m:D\) records only that the exact call returned the exact
proposal. A separate, scoped admission \(r:(D\to F)\) is required before a
checker may derive \(r\cdot m:F\). The view shows the call, response digest and
span, both admissions and their bases, the derivation, and any later withdrawal.

The interface does not force the model call into the mathematical warrant. If
the proposal prompts an independent proof, source retrieval, computation, or
formal check that supplies \(v:F\), it displays that direct warrant and retains
the model call only as attributed causal assistance and task evidence. Neither
using a proposal during work nor marking it corrected or rejected creates a
premise admission.

The raw response is treated as untrusted content. It cannot execute markup or
commands, open a link, invoke a tool, or be submitted again without an explicit
user action. Credentials are absent from model-call records, displayed context,
logs, exports, and error text.

Assistance is given only on request and may be revealed in stages so that it
does not replace the attempt it is meant to support. Use, correction, rejection,
or abandonment of a proposal is recorded in `TaskEvidence`; none converts the
proposal into a human judgment.

**Non-goal.** Importing external AI content and making model requests from
active mathematical work do not make Theorem Terminal a general chat client,
prompt manager, conversation archive, provider-orchestration layer, or
autonomous agent system.

Ordinary mathematical sessions never require a model call. The Stage 1
evaluation deliberately includes one request at a genuine obstruction so that
this function is tested.

Assistance is useful only if it reduces the time or obstruction between the
mathematician and substantive work. A feature that requires more correction or
record keeping than the mathematical help it supplies is removed.

The executable offline documentary bridge covers only the mechanics behind
exact-span projection and checker handoff. Its explicit sequence is projection,
documentary admission, and Lean checking of (m:D). It does not make a model
request, create a substantive (F), admit (D\to F), or show that assistance
helped. It therefore cannot replace the genuine-obstruction request below or
satisfy the acceptance criteria of §9.1.

The public check repeats strict response, span, assertion-hash, and cross-link
validation before invoking Lean and rejects a source, compiled module, or
executable that does not match the pinned Linux x86-64/WSL checker identity.
The application stamps the checker-handoff time in canonical UTC; the resulting
external `Verification` and Lean check record use it separately from the earlier
admission and context time. The external record also binds the exact retained
projection and stamped request bytes. Lean checks
derivability over opaque atom identities; it is not used as the response-hash
validator.

---

## 9. Initial experimental sessions

The first implementation is evaluated through two distinct sessions. Neither
session substitutes for the other.

### 9.1 Problem-centered study without formalization

Use a coherent cluster from a problem-centered algebraic number theory text.

1. Enter through a chapter objective or a selected problem family.
2. See a concise orientation: relevant definitions and results, nearby examples,
   and previously completed problems that may be useful.
3. Open one problem and begin an attempt in an ordinary work file, such as a TeX
   file, Sage worksheet, or diagram, without first completing a subject map or
   questionnaire.
4. Request help only when useful: a source locator, definition reminder, related
   result, strategic hint, intermediate lemma, computation, criticism, or
   comparison with a solution when one is available.
5. At one genuine obstruction, make a bounded call to the configured model.
   Inspect the selected outbound context, submit the request, and preserve the
   `ModelCall` and raw response.
6. Extract only proposals that enter the work or whose correction, rejection,
   or abandonment is recorded, retaining their AI origin, lossless exact
   response spans, response digest, and links to the call.
7. For one selected substantive claim, inspect the generic warrant projection.
   Either review separate admissions \(m:D\) and \(r:(D\to F)\) and the checked
   route \(r\cdot m:F\), or retain an explicit no-bridge outcome and display the
   independent reason \(v:F\) that actually warrants the mathematics. If the
   proposal is wrong or irrelevant, retain \(D\) without an active bridge or
   admission and record rejection or abandonment; no warrant for \(F\) is
   required.
8. Preserve the attempt, revisions, calculations, exact sources consulted, and
   assistance used.
9. Resume later at the unfinished mathematical step.
10. Test retention by reconstructing the solution or solving a related problem.

**Acceptance.** The session is useful when no formal artifact exists. It begins
with top-down orientation and proceeds directly to substantive problem work,
preserves enough evidence to resume and test the work, and requires no
declaration of comprehension. At least one model call is
traceable from exact outbound context through raw response to a proposal that is
used, corrected, rejected, or abandoned during the mathematical attempt. One
exact response span is also traceable through its documentary atom and explicit
admissions to a checked derivation, or to a recorded no-bridge decision and the
independent warrant used instead, or to rejection or abandonment with no
warrant for \(F\). Proposal disposition alone is task evidence, not a
mathematical warrant, and \(m:D\) alone cannot derive \(F\).

### 9.2 Mathematical re-entry and formal correspondence

Use `rs_Appendix_A.tex` as the mathematical source, the corresponding Lean
declarations when relevant, and `Lean/docs/AppendixA.md` as the existing
correspondence record.

1. Orient in the appendix's purpose and organization, central concepts, and
   named results before selecting detailed material.
2. Begin from a mathematical question, manuscript result, unfinished proof, or
   earlier work product.
3. Recover the relevant source occurrences, prior attempts, computations, and
   unresolved questions.
4. Reconstruct or continue the mathematical argument.
5. When a formal counterpart exists and is useful, inspect its declaration,
   dependencies, axiom usage, and verification status.
6. Check explicit correspondences and resolve any discrepancy exposed by the
   mathematical or formal work.
7. For the bounded justification experiment, explicitly request `why` for
   `lem:range-lifting-pullback-section` after the correspondence has been
   reviewed.
8. Inspect the immutable manuscript claim, exact proposition of
   `Dom.exists_total_lift_iff_rangeLiftPullback_section`, pinned
   kernel-attestation claim, separately admitted bridges, and checked
   \(J_0\) certificate.
9. Change a source, formal environment, or admission in a test fixture. Confirm
   that a successor context deactivates only the dependent current route while
   preserving the old certificate for its pinned snapshot.
10. Resume later from the preserved work product or perform a related task.

**Acceptance.** The session restores enough specific context to continue work
after an interruption. Its formal features are tested only on objects for which
formal material exists. The warrant slice succeeds when its displayed
application term exposes the formal-proof-policy and formal--manuscript bridges,
reports only contextual derivability, and supports later inspection without
requiring logic entry before study.

The first session tests problem-centered learning in an unformalized source. The
second tests re-entry and optional informal/formal correspondence in an existing
project.

---

## 10. Later large-corpus experiment

This experiment is outside the first implementation. It may begin only after
the two initial sessions have been evaluated and it has been authorized
separately. Use either the Stacks Project
[@stacksprojectauthorsStacksProject2021] or Kerodon.

1. Import the selected source's published hierarchy, stable identifiers,
   cross-references, and revision information.
2. Begin from a subject-level mathematical question.
3. Obtain the statements, proofs, examples, and surrounding context required by
   the current work.
4. Preserve the ordered source locations consulted, work artifacts, model
   assistance, unresolved questions, and later reconstruction tasks.
5. Resume the work after an interruption.
6. After a source revision, identify the stored records whose cited source
   material changed.

**Acceptance.** A mathematician can identify a coherent sequence of relevant
source locations, study selected material, perform substantive mathematical
work, and later resume it without a preliminary semantic classification of the
corpus. A source revision identifies the stored records that require inspection.

---

## 11. Failure modes

The interface has failed if:

- a subject map, inventory, or comprehension form must be completed before
  mathematical work begins;
- large-corpus study requires manual semantic classification before a
  mathematical question can be pursued;
- a formal proof is treated as available or required when none exists;
- formal-logic entry or premise maintenance is required before mathematical
  study;
- problem solving is secondary to browsing or record maintenance;
- assistance reveals a solution before the mathematician requests that level of
  help;
- source material or a work artifact is sent to an external model without an
  explicit model call and inspectable outbound context;
- a raw model response or extracted proposal appears as a source fact,
  verification, or human judgment;
- a model call or proposal receives a bespoke trust, support, confidence,
  correctness, acceptance, authority, or integration status;
- extracting structured model output automatically creates a premise or a
  provider-wide bridge from model production to mathematical truth;
- provider-side conversation state becomes the canonical project record;
- model assistance expands into unsolicited follow-ups or a general chat
  workflow;
- an offline, synthetic, or replayed integration fixture is counted as the
  required model call at a genuine mathematical obstruction or as evidence
  that assistance improved subsequent work;
- explanations or proposals appear without their origins;
- review measures lookup or self-description instead of mathematical
  performance;
- verification status is read as comprehension;
- contextual derivability is presented as truth, knowledge, or external
  verification;
- a `Correspondence` automatically creates a logical implication or premise;
- justification sum is displayed as confidence, corroboration, independence,
  or evidential weight;
- navigation degenerates into a formal dependency-graph browser;
- preserving work costs more attention than resuming it saves;
- discrepancy detection produces more irrelevant interruptions than useful
  corrections.

---

## 12. Open questions

- Which initial problem cluster best tests both theoretical proof and
  computation without requiring broad ingestion?
- Which of the Stacks Project and Kerodon should be used for the later
  large-corpus experiment, and which published interfaces provide its hierarchy,
  identifiers, cross-references, and revision information?
- Which levels of assistance should be available, and which should require an
  explicit request?
- Which single model and service should be configured for the first experiment,
  and what minimal response schema preserves the mathematical content without
  forcing it into an inadequate schema?
- How should outbound context be selected from sources and work artifacts
  without manual classification or unnecessary disclosure?
- How much prerequisite context can be recovered from sources and prior work
  without manual classification?
- What orientation view serves a large problem-centered source and what view
  serves a small research project?
- Which `ProblemRelation`s require human judgment and which may be proposed from
  source structure and prior attempts?
- How does a curated subject map survive revisions of its sources?
- Which `ReviewItem`s can be generated from `TaskEvidence`, and which require
  mathematical authorship?
