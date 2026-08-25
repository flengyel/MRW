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

Three constraints follow from `VISION.md` and apply throughout this
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
mathematics: attempts, proofs, calculations, examples, counterexamples, code,
exposition, and ordinary notes. The interface does not require these artifacts
to be rewritten as structured reports.

Source-derived records include stable locators and quotations. Machine-derived
records include types, signatures, imports, dependencies, axiom usage,
verification status, and downstream references. Machine-derived facts are not
hand-edited; a suspected error is recorded as a discrepancy against the exact
fact and source revision.

Machine-proposed records include candidate correspondences, prerequisite
relations, hints, proof outlines, and review tasks. Every proposal retains its
origin whether it is accepted, edited, rejected, or merely used during an
attempt.

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

During problem solving or proof study, Theorem Terminal may retrieve relevant
source material, propose a hint or intermediate lemma, test examples, criticize
an attempted step, draft an outline, or suggest a related problem. Assistance is
given on request and may be revealed in stages so that it does not replace the
attempt it is meant to support.

Each generated output is a proposal with provenance. It may be compared with
sources, formal facts when present, and existing `WorkArtifact`s. Use of a
proposal is recorded in `TaskEvidence`; it does not convert the proposal into a
human judgment.

**Non-goal.** The import path records finished mathematical content and its
provenance. It is not a general chat client, prompt manager, or conversation
archive.

Assistance is useful only if it reduces the time or obstruction between the
mathematician and substantive work. A feature that requires more correction or
record keeping than the mathematical help it supplies is removed.

---

## 9. Initial experimental sessions

The first implementation is evaluated through two distinct sessions. Neither
session substitutes for the other.

### 9.1 Problem-centered study without formalization

Use a coherent cluster from a problem-centered algebraic number theory text.

1. Enter through a chapter objective or a selected problem family.
2. See a concise orientation: relevant definitions and results, nearby examples,
   and previously completed problems that may be useful.
3. Open one problem and begin an attempt in an ordinary TeX or Sage work file,
   without first completing a subject map or questionnaire.
4. Request help only when useful: a source locator, definition reminder, related
   result, strategic hint, intermediate lemma, computation, or comparison with a
   solution when one is available.
5. Preserve the attempt, revisions, calculations, exact sources consulted, and
   assistance used.
6. Resume later at the unfinished mathematical step.
7. Test retention by reconstructing the solution or solving a related problem.

**Acceptance.** The session is useful when no formal artifact exists. It begins
with a substantive problem, preserves enough evidence to resume and test the
work, and requires no declaration of comprehension.

### 9.2 Mathematical re-entry and formal correspondence

Use one coherent region of `Categorical_Rice_Shapiro`.

1. Begin from a mathematical question, manuscript result, unfinished proof, or
   earlier work product.
2. Recover the relevant source occurrences, prior attempts, computations, and
   unresolved questions.
3. Reconstruct or continue the mathematical argument.
4. When a formal counterpart exists and is useful, inspect its declaration,
   dependencies, axiom usage, and verification status.
5. Check explicit correspondences and resolve any discrepancy exposed by the
   mathematical or formal work.
6. Resume later from the preserved work product or perform a related task.

**Acceptance.** The session restores enough specific context to continue work
after an interruption. Its formal features are tested only on objects for which
formal material exists.

The first session tests problem-centered learning in an unformalized source. The
second tests re-entry and optional informal/formal correspondence in an existing
project.

---

## 10. Failure modes

The interface has failed if:

- a subject map, inventory, or comprehension form must be completed before
  mathematical work begins;
- a formal proof is treated as available or required when none exists;
- problem solving is secondary to browsing or record maintenance;
- assistance reveals a solution before the mathematician requests that level of
  help;
- explanations or proposals appear without their origins;
- review measures lookup or self-description instead of mathematical
  performance;
- verification status is read as comprehension;
- navigation degenerates into a formal dependency-graph browser;
- preserving work costs more attention than resuming it saves;
- discrepancy detection produces more irrelevant interruptions than useful
  corrections.

---

## 11. Open questions

- Which initial problem cluster best tests both theoretical proof and
  computation without requiring broad ingestion?
- Which levels of assistance should be available, and which should require an
  explicit request?
- How much prerequisite context can be recovered from sources and prior work
  without manual classification?
- What orientation view serves a large problem-centered source and what view
  serves a small research project?
- Which `ProblemRelation`s require human judgment and which may be proposed from
  source structure and prior attempts?
- How does a curated subject map survive revisions of its sources?
- Which `ReviewItem`s can be generated from `TaskEvidence`, and which require
  mathematical authorship?
