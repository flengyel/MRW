# CODEX_PLAN.md

How to build the first instrument. Inherits `VISION.md` (why), `DOMAIN_MODEL.md`
(what exists), and `UX_SPEC.md` (what a mathematician does), all frozen.

## Governing constraint

The first implementation is a vertical slice, not a foundation. Every stage ends
in a session step that a mathematician can actually perform on the first corpus.
No stage exists to prepare for a later stage.

This inverts the usual order. Repository scaffolding, a schema, an ORM, an
exporter, and a GUI framework are all things that can be built before anything
works, which is why the project drifted into them once already. Here the data
comes first, the descent second, and mechanization only where a step is
demonstrably tedious.

## Global non-goals

Excluded from the first instrument entirely, in every stage below:

- general corpus ingestion; the corpus is `Categorical_Rice_Shapiro`
- Stacks, Kerodon, Mathlib at scale, or any second source
- a GUI platform, a component library, or a framework commitment
- automated theorem understanding
- universal Lean analysis
- large-scale AI features
- multi-user anything, sync, accounts, deployment

## Target

The seven-step laboratory session of `UX_SPEC.md` §9, end to end, on one section
of Appendix A:

one source hierarchy · one correspondence · one mathematical object · one
understanding field · one formal artifact · one review cycle · one discrepancy.

---

## Stage −1 — Repository

**Goal.** Establish the frozen design baseline in one place.

**Deliverable.** A repository containing `README.md`, `VISION.md`,
`DOMAIN_MODEL.md`, `UX_SPEC.md`, and this plan. The README states what the
project is, which documents are frozen, and that the first implementation is a
laboratory instrument.

**Non-goals.** No package layout, no dependency manifest, no CI, no application
skeleton, no implementation of any kind.

**Why at all.** The four documents are currently the only assets, and they are
the ones later stages are checked against.

---

## Stage 0 — The corpus slice

**Goal.** Author the data by hand for one section of Appendix A. No code.

**Deliverable.** Plain files — Markdown with YAML front matter, matching the
note conventions already in use — holding: the source hierarchy for that
section; the results it contains as mathematical objects; occurrences in the
manuscript and in the Lean development; correspondences between them with their
kinds; and at least one understanding field per object, including a conceptual
role and a proof idea.

**Acceptance.** Every entity in `DOMAIN_MODEL.md` that the session needs has at
least one instance, and every field carries a provenance. Where the model has
no natural place for something the section requires, that is recorded as a model
defect rather than worked around.

**Non-goals.** No schema, no database, no parser, no validation tooling. And no
attempt at comprehensiveness: the slice is one section, not Appendix A. The goal
is to discover whether the representation works, and documenting everything
before knowing that is the expensive way to find out it does not.

**Why first.** The domain model has never been populated. Authoring by hand is
the cheapest test of whether it fits the mathematics, and the resulting files
are the fixture every later stage runs against.

---

## Stage 1 — The descent

**Goal.** Render the theorem view in the canonical order of `UX_SPEC.md` §3 and
let a reader walk the hierarchy down to it.

**Deliverable.** A local Python application reading the Stage 0 files and
presenting: subject hierarchy navigation; the theorem view with its sections in order,
statement above the proof idea and dependencies below the skeleton; absent
sections shown as absent; and provenance visible on every field.

**Acceptance.** A reader who has never seen the section can reach a result
through the hierarchy, read why it matters before reading what it says, and
descend to the formal declaration last. Entry by declaration name is not
possible, deliberately, at this stage.

**Non-goals.** No editing, no search, no graph rendering, no database, no
framework — whatever renders text and links is sufficient, and the choice is not
architectural.

---

## Stage 2 — Review

**Goal.** One complete review cycle over the Stage 0 objects.

**Deliverable.** Review items authored by hand at the levels available;
per-level mastery separate from scheduler state, per `DOMAIN_MODEL.md`; a
scheduler presenting the weakest due level; and recorded outcomes.

**Acceptance.** A week of review runs without the item set being rewritten, and
prompts at proof-idea level and above are graded by rubric or self-assessment
rather than against a reference string.

**Non-goals.** No generated items, no scheduling algorithm research — any
interval scheme is adequate here, and replacing it later is cheap.

**Checkpoint.** `VISION.md` §9: if items at proof-idea level cannot be written
in a form worth repeating, the retention leg fails and the rest of the plan is
not worth executing.

---

## Stage 3 — Formal facts

**Goal.** Obtain declaration types, signatures, dependencies, axiom usage, and
checking status mechanically, for the declarations in the Stage 0 slice.

**Task 3.0 — reconnaissance, and it comes first.** Run the existing tools
against the branch and inspect what they emit: `lean4export`, `doc-gen4`,
`ntp-toolkit`, LeanArchitect. Decide among consuming existing output, extending
an existing tool, or writing a small exporter. The criterion is whether the
output supplies the fields `DOMAIN_MODEL.md` calls formal facts, not novelty.

**Task 3.1 — the exporter, only if 3.0 says so.** Lean-side, inside Lake,
emitting JSON. Environment data comes from the environment; nothing parses Lean
source in Python.

**Acceptance.** Every formal fact in the instrument is generated, stamped with
the environment revision it came from, and never hand-edited. Regeneration after
a rebuild changes nothing else.

**Non-goals.** No Mathlib-scale extraction, no elaboration traces, no proof
states, no coverage of declarations outside the slice.

**Checkpoint.** If existing tooling already supplies the translation between
formal artifacts and mathematical understanding, `VISION.md` §9 applies and the
project has nothing in between to build.

---

## Stage 4 — Discrepancy

**Goal.** Detect and resolve the one discrepancy of the session: a
correspondence pointing at a declaration whose signature has changed, or that no
longer exists.

**Deliverable.** A check comparing hand-authored claims against generated facts,
producing `Discrepancy` records with kinds; surfacing on the object and in a
session list; resolution recorded as understanding corrected, correspondence
updated, mathematics changed, or false positive. Nothing auto-repaired.

**Acceptance.** Introducing a change on the branch — renaming a declaration,
adding a hypothesis — produces the expected discrepancies and no spurious ones,
each at the right object and with the right kind. One change may legitimately
have several consequences: a signature altered, a correspondence invalidated, an
understanding field downstream put in doubt. The criterion is precision, not
cardinality.

**Non-goals.** No conflict-management workflow, no notifications, no repair
suggestions.

**Constraints, from `DOMAIN_MODEL.md`.** Absence from a formal dependency graph
does not refute a claimed conceptual dependency. A note recorded against one
declaration says nothing about another — comparisons are between claims and
facts about the same subject.

**Why this stage matters most.** It is the step no existing tool performs, and
it is the reason the first corpus was chosen.

---

## Stage 5 — AI-assisted understanding

Deferred, and specified only so its boundary is fixed in advance.

Machine assistance proposes: candidate correspondences, draft outlines, draft
review items. Explanations obtained from external assistants are imported the
same way, with the model recorded as author. Every proposal is adopted, edited,
or rejected by a person. Adoption records the adopter and never changes the
origin.

**Acceptance.** Adopting or correcting a proposal costs less than authoring the
thing from scratch. A feature failing that test is removed rather than improved,
because it adds review load to authoring load.

**Non-goals.** No generated understanding presented without its origin. No chat
client, prompt manager, or conversation archive — the import path takes a
finished explanation, not a dialogue. No assistance in Stages 0–4.

---

## Manuscript prerequisite

Independent of the stages and required before Stage 4 is meaningful: add
`\label`s to `rs_Appendix_A.tex` and reference labels rather than line numbers.
`UX_SPEC.md` and `DOMAIN_MODEL.md` both require stable locators, and the current
correspondence carries roughly fifty positional references into a manuscript
that moves. This is an edit to the manuscript; no exporter substitutes for it.

---

## Not decided here

- Storage. Files are adequate through Stage 4. A database is introduced when a
  stage cannot proceed without one, and the reason is recorded.
- GUI framework. Deferred until a session step is impossible without one.
- The orientation view. `UX_SPEC.md` §11 leaves it open; Stage 1 navigation is
  the hierarchy only, which is the minimum, and what orientation needs beyond
  that is expected to become visible from use.
- Whether relations among objects are authored only or proposed and adopted.

## Order and stopping

Stages run −1, 0, 1, 2, 3, 4. Stage 5 follows only if Stages 0–4 produce
something worth assisting.

Each checkpoint above is a stopping point, not a formality. `VISION.md` §9 names
the conditions under which the thesis is wrong; the plan is arranged so that the
cheapest of them are tested first.
