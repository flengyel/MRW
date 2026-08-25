# CODEX_PLAN.md

Plan for the first experimental implementation. It inherits the purposes in
`VISION.md`, the entities and invariants in `DOMAIN_MODEL.md`, and the workflows
in `UX_SPEC.md`.

## Governing constraint

The first implementation tests the complete working session described in
`UX_SPEC.md` §9 on one coherent mathematical region. Each stage must enable or
evaluate a mathematical activity on that region. Infrastructure is added only
when a stage requires it.

Repository scaffolding, a schema, an ORM, an exporter, and a GUI framework can
all be built without establishing whether the proposed representation helps a
mathematician learn, reconstruct, understand, or retain mathematics. The plan
therefore begins with a hand-authored reconstruction of mathematical context,
adds the ordered theorem view, and mechanizes tasks only after manual work has
shown what must be represented.

## Global non-goals

The first implementation does not attempt:

- general corpus ingestion; the corpus is `Categorical_Rice_Shapiro`
- Stacks, Kerodon, Mathlib at scale, or any second corpus
- a GUI platform, component library, or framework commitment
- automated theorem understanding
- Mathlib-scale Lean analysis
- system-generated mathematical proposals before Stage 5
- multi-user operation, synchronization, accounts, or deployment

Mathematics or explanations generated outside Theorem Terminal are not
excluded. They may be recorded in Stage 0 as study material with their
provenance and verification status. General chat, prompt management,
conversation archiving, and large-scale generation remain out of scope.

## Target

Complete the first working session of `UX_SPEC.md` §9, end to end, on one
coherent mathematical region of `Categorical_Rice_Shapiro`.

The selected region must connect:

one source hierarchy · one mathematical region · its source occurrences ·
its formal artifacts · its correspondences · its evolving understanding ·
one review cycle · one discrepancy.

The selected region is not expected to begin with complete understanding.
Unknown relationships, unresolved correspondences, and questions about the
mathematics are part of the data to be preserved.

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

## Stage 0 — The mathematical context reconstruction

**Goal.** Reconstruct one coherent region of `Categorical_Rice_Shapiro` across
its historical sources, manuscript, formal development, and current
understanding. No code.

The purpose is not to create study records before understanding the mathematics.
The purpose is to determine whether a persistent context can support the process
by which mathematical understanding is recovered, extended, and retained.

**Deliverable.** Plain files — Markdown with YAML front matter, matching the
note conventions already in use — holding:

- the relevant source hierarchy;
- mathematical objects encountered in the region;
- occurrences in historical notes, manuscript sources, and formal development
  where known;
- correspondences between occurrences, with their kinds where established;
- formalization status where known;
- current understanding fields;
- any externally produced AI mathematics or explanations selected for study,
  with their provenance and verification status recorded;
- unresolved questions and uncertainties.

Understanding fields may initially record questions or incomplete understanding.
A missing proof idea is not a defect; it is information about the current state
of understanding.

**Acceptance.** The context supports an actual mathematical working session:

- a mathematical idea can be traced to its source occurrences where known;
- formal artifacts can be connected to manuscript occurrences where a
  correspondence has been established;
- a theorem, proof, argument, or explanation generated outside Theorem Terminal
  can be recorded and studied with its AI provenance and verification status
  kept distinct from later human judgments;
- discoveries made during formalization or external AI-assisted exploration can
  be attached to the relevant object with provenance;
- unknowns are recorded rather than silently guessed.

Where the model has no natural place for an important distinction, that is
recorded as a model defect rather than worked around.

**Non-goals.**

- No attempt at comprehensive coverage of `Categorical_Rice_Shapiro`.
- No requirement to write proof ideas before they are understood.
- No schema, database, parser, exporter, or validation tooling.
- No proposals generated by Theorem Terminal. Externally generated AI
  mathematics may still be represented as study material.

**Why first.** Stage 0 is not a database population exercise. It tests whether
the proposed context representation helps reconstruct a mathematical project
whose sources, formalization, and understanding have developed over time.

---

## Stage 1 — The descent

**Goal.** Render the context view and theorem view in the canonical order of
`UX_SPEC.md` §3 and let a reader move from mathematical context down to formal
details.

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

**Checkpoint.** If proof-idea review items cannot be written in a form worth
repeating, the proposed retention method has failed at that level. Record that
failure and continue to evaluate orientation, reconstruction, theorem study, and
formal comparison; this result does not by itself refute the other functions of
Theorem Terminal.

---

## Stage 3 — Formal facts

**Goal.** Obtain declaration types, signatures, dependencies, axiom usage, and
checking status mechanically for the declarations in the Stage 0 selected
region.

**Task 3.0 — reconnaissance, and it comes first.** Run the existing tools
against the branch and inspect what they emit: `lean4export`, `doc-gen4`,
`ntp-toolkit`, LeanArchitect. Decide among consuming existing output, extending
an existing tool, or writing a small exporter. The criterion is whether the
output supplies the fields `DOMAIN_MODEL.md` calls formal facts, not novelty.

**Task 3.1 — the exporter, only if 3.0 says so.** Lean-side, inside Lake,
emitting JSON. Environment data comes from the environment; nothing parses Lean
source in Python.

**Acceptance.** Every formal fact presented by Theorem Terminal is generated,
stamped with the environment revision from which it was obtained, and never
hand-edited. Regeneration after a rebuild changes nothing else.

**Non-goals.** No Mathlib-scale extraction, elaboration traces, proof states, or
coverage of declarations outside the selected region.

**Checkpoint.** If existing tooling already supplies these formal facts and
their required connections to mathematical context, use that tooling and omit
the exporter. This result would remove or reduce Stage 3; it would not invalidate
the work on orientation, reconstruction, retention, or understanding
AI-generated mathematics.

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

**Why this stage is included.** It tests whether changes in formal artifacts can
be related precisely to stored mathematical judgments. That requirement is a
reason for choosing the first corpus.

---

## Stage 5 — System-generated assistance

Deferred until Stages 0–4 have been evaluated. This stage concerns proposals
generated by Theorem Terminal. It does not determine whether externally produced
AI mathematics may be studied.

Theorem Terminal may propose candidate correspondences, context maps, outlines,
explanations, questions, and review items. Each proposal records the model as
author and is adopted, edited, or rejected by a person. Adoption records the
adopter and does not change the proposal's origin.

Externally produced AI mathematics and explanations may already have been
recorded in Stage 0 as study material, with provenance and verification status
preserved. Importing and studying such material is not a Stage 5 generation
feature.

**Acceptance.** Adopting or correcting a proposal costs less than authoring the
content from scratch. A feature failing that test is removed because it adds
review load to authoring load.

**Non-goals.** No generated understanding is presented without its origin. No
chat client, prompt manager, or conversation archive: the import path takes
finished mathematical content, not a dialogue. No system-generated proposals in
Stages 0–4.

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

Stages run −1, 0, 1, 2, 3, and 4. Stage 5 begins only if Stages 0–4 show that
system-generated proposals would reduce the effort required to understand or
record the selected mathematics.

Each checkpoint evaluates a specific claim or component. A failed checkpoint may
stop or revise that component; it is evidence against the entire project only
when it bears on the full thesis stated in `VISION.md`.
