# UX_SPEC.md

The mathematician's workflow the interface must support. Companion to
`VISION.md` (why the system exists) and `DOMAIN_MODEL.md` (entities and
invariants). Workflow and principles only; no screens, widgets, or framework.

## 1. Design principle

The interface supports mathematical study, not document lookup.

The question a session begins from is *what do I need to understand next*, not
*which declaration do I want to inspect*. Lookup is already solved and is not
the bottleneck; a system whose front door is a search box for declaration names
has conceded the design before it starts.

Two constraints follow from `VISION.md` and hold everywhere below.

**The formal proof is available and is not the front door.** It appears in every
relevant view, at the end of the descent rather than the beginning.

**Origin is always visible.** No view presents a machine proposal as a
mathematician's judgment or as a mechanically derived fact, and no view presents
a derived fact as a claim someone made.

---

## 2. Session types

Modes are not application tabs. They are what a mathematician is doing, and a
session moves between them.

### Orientation

Enter or revisit a subject. Browse the source hierarchy, see which concepts
organize it, see which results carry weight and how they relate. The output is a
mental map, and the system's contribution is that the map persists between
sessions and records what has decayed.

Orientation is the mode with the least existing tooling and the most exposure:
if it is done badly the system is a browser with extra steps.

### Theorem study

Understand one result. The canonical descent is in §3.

### Proof study

Learn how the mathematics is done: reconstruct the outline, identify the crucial
reduction, inspect intermediate claims, compare a proof idea against the formal
proof, and answer missing-step prompts. This is the mode Kallenberg's argument
is really about — proofs are studied because that is where the doing of
mathematics is learned.

### Formal exploration

Read the declaration, its dependencies, its axiom usage, its verification
status, and its proof states, with each formal step connected to whatever
mathematical explanation exists for it. Reachable from anywhere and never the
default landing.

The mode is not passive, which is why it is not called inspection. Comparing a
proof idea against the formal proof, discovering that a hypothesis is doing no
work, and writing that discovery down as an understanding field without leaving
the view are all part of it — see the formalization scope question below.

### Review

Retain what has been understood. The scheduler presents the weakest due level
for an object rather than the object as a unit. Review targets and their prompts
are in §7.

### Formalization

**Scope question, not yet settled.** `VISION.md` records that formalization runs
up the ladder and produces mathematics: a hypothesis turns out unnecessary, a
symmetry turns out derivable, a clause resists formalization and two lemmas
carry its content instead. Those discoveries are understanding fields that did
not exist before the formal work.

A session in this mode starts at a declaration and ends by writing prose, which
inverts every other mode. Two options, and the choice shapes the rest of the
specification:

- *In scope.* The instrument supports the work actually being done on the first
  corpus, and the understanding fields get populated as a by-product of
  formalizing rather than as a separate chore. Cost: a second navigation model
  and an editing surface next to the formal view.
- *Out of scope for the first instrument.* Discoveries are recorded through the
  ordinary authoring path of §5 after the fact. Cost: the authoring is a chore,
  and `VISION.md` §9 names authoring cost as a failure condition.

Recommendation: in scope, minimally — a way to attach an understanding field to
an object while looking at its formal view, with no separate navigation.

---

## 3. The theorem view

One canonical order, used by theorem study and reachable from everywhere else.

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
Formalization
Verification
```

Two corrections to the draft outline, which had the statement after the proof
idea and after dependencies in §3 while placing it before both in §2.

**The statement precedes the proof idea.** A proof idea is unintelligible
without knowing what is being proved. Kallenberg's descent goes overview →
individual theorems → proofs and their structure, and the theorem is the
statement. Everything above the statement in the list answers *why am I reading
this*; everything below answers *why is it true*.

**Dependencies follow the skeleton.** Which results a proof rests on is
informative once the shape of the argument is known and is a list of names
before that. Formal dependencies and conceptual prerequisites are shown as
distinct sets, never merged.

Each section links down to the next and up to its context. Any section may be
empty, and an empty section is displayed as absent rather than as a gap to be filled —
`VISION.md` fixes that an outline without a formalization is a legitimate final
state, and so is a formal proof without an explanation, though the second is
worth surfacing as an opportunity.

---

## 4. Subject navigation

Movement runs subject → chapter → section → concept → result → proof → formal
proof, over the source hierarchy and the relations among objects.

The navigation graph is not the formal dependency graph. Conceptual
prerequisites, generalizations, analogies, and motivations are first-class
edges, they are authored rather than extracted, and they may contradict the
dependency graph without either being wrong.

An object may occur in several sources. Navigation shows the occurrences and the
correspondences between them with their kinds — formalizes, restates,
strengthens, weakens, approximates — rather than silently presenting one
occurrence as the object.

---

## 5. Authoring

Human-authored: conceptual role, why a result matters, proof idea, crucial
reduction, hypothesis rationale, examples, counterexamples, relations among
objects, and the judgment that two occurrences correspond.

Machine-derived: types, signatures, imports, dependencies, axiom usage,
verification status, source locations, and downstream references. These are
never editable, and an attempt to correct one is a signal that either the
generator or the mathematics is wrong.

Machine-proposed: candidate correspondences, candidate dependencies, draft
outlines, draft review items. Every proposal is adopted, edited, or rejected by
a person, and adoption records the adopter without changing the origin.

Two authoring paths that the draft outline omitted and that the domain model
requires.

**Correspondence authoring.** Linking a manuscript occurrence to a declaration
is a mathematical judgment with a kind attached, not a lookup. The interface
must make the kind explicit at the moment of linking, because *formalizes* and
*approximates* are different claims and the difference is exactly what decays
when such a link is recorded as a bare pair of names.

**Understanding capture in place.** Writing an understanding field must be
possible from wherever the understanding occurred — including the formal view,
per §2.

---

## 6. Discrepancies

The domain model makes a discrepancy a first-class object. The interface treats
one as information rather than as an error to clear.

A discrepancy surfaces on the object it concerns and in a session-level list. It
records what conflicts with what, what detected it, and how it was resolved:
understanding corrected, correspondence updated, mathematics changed, or false
positive. Nothing is auto-repaired.

Two constraints carry over from the domain model. A conceptual dependency is not
refuted by its absence from a formal dependency graph. And a note recorded
against one declaration says nothing about another, however closely related — a
detector that compares a claim about one subject with a fact about a different
one generates false discrepancies and costs more attention than it saves.

Repeated discrepancies at one object are a signal about where understanding is
weak, and the review scheduler may use them.

---

## 7. Review

Levels: orientation, statement, dependencies, proof idea, technical details,
formal proof. The scheduler presents the weakest due level.

`VISION.md` adopts Kallenberg's criterion that what can be looked up need not be
retained, which raises an apparent conflict with a `statement` review level. The
resolution is what the prompt asks for. A prompt asking to reproduce a signature
or recite hypotheses tests lookup and is excluded. A prompt asking what a result
asserts, in the reader's own terms, tests whether the content is held, and that
is worth scheduling. Exact conditions are looked up; what a theorem says is
known or not.

Item kinds: reconstruction, explanation, proof completion, hypothesis analysis,
example, counterexample, dependency recall, Lean exercise, Sage task.

Proof-completion items come from the gaps an argument leaves, which Kallenberg
treats as the natural exercises. A formal development is unusually good at
locating them.

Grading is self-assessed or rubric-based above the statement level. Only items a
machine can decide — a Lean exercise, a dependency recall checked against a
derived fact — are machine-graded. No reference answer is presented as the
correct one for a proof-idea prompt.

---

## 8. Machine assistance in the interface

Assistance explains, summarizes, proposes questions, drafts outlines, and
suggests connections. It never becomes an authoritative explanation, a formal
fact, or a mathematician's judgment.

Assistance is not confined to what the system generates. An explanation obtained
from an external assistant is imported as an `ai_proposal` with the model
recorded as its author, compared against the formal facts and against
understanding fields already held, then adopted, edited, or rejected, and what
survives is scheduled for review. The point is that a correction made in a chat
window is currently lost, and the correction is the valuable part.

**Non-goal.** This is an import path with provenance attached, not a chat
client, a prompt manager, or a conversation archive. Nothing in the interface
holds a dialogue.

Adoption is explicit and cheap. `VISION.md` §9 makes authoring cost a failure
condition, so the test for any assistance feature is whether adopting or
correcting a proposal costs less than writing the thing from scratch. A feature
that fails that test is worse than absent, because it adds review load to
authoring load.

---

## 9. First laboratory session

On `Categorical_Rice_Shapiro`, a session that exercises the whole specification:

1. Open a manuscript section of Appendix A from the source hierarchy.
2. See the results it contains and the declarations corresponding to them, with
   the kind of each correspondence.
3. Read the conceptual role of one result and why its hypotheses are what they
   are.
4. Descend to the proof idea and the skeleton.
5. Inspect the formal proof, its dependencies, and its axiom usage.
6. Notice a discrepancy — a correspondence pointing at a declaration whose
   signature has changed — and resolve it.
7. Schedule what was learned; return to it later at the weakest level.

Step 6 is the step no existing tool supports and the one the first corpus makes
immediately testable.

---

## 10. Failure modes

The interface has failed if:

- users enter through declarations because that is the fastest path;
- explanations appear without their origins;
- review measures recall of things that could have been looked up;
- verification status is read as comprehension;
- navigation degenerates into a dependency-graph browser;
- authoring understanding costs more attention than the understanding returns;
- discrepancies accumulate unresolved, which means detection is noisier than it
  is useful.

---

## 11. Open questions

- Whether formalization sessions are in scope for the first instrument (§2).
- What the orientation view actually shows for a corpus with one manuscript and
  one formal development, where the hierarchy is small enough to hold in mind.
  Candidates, none settled: the source hierarchy, the concepts that organize it,
  the results that carry weight, dependency clusters, unresolved discrepancies,
  and mastery state. Not a rendering of the dependency graph, which is the thing
  that is easy to produce and answers none of the orientation questions.
- Whether relations among objects are authored only, or proposed from
  co-occurrence and dependency data and then adopted.
- How a curated subject map survives a revision of the source it was built over.
- Whether review items are authored per object or generated per level from
  existing understanding fields.
