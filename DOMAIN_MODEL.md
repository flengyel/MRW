# DOMAIN_MODEL.md — v2

Draft. Companion to `VISION.md` (why the system exists), `UX_SPEC.md` (what a
mathematician does with it), and `CODEX_PLAN.md` (staged implementation).

Fixes entities and invariants. Does not fix storage technology, schema syntax,
or GUI framework.

Changes from v1: subject structure restored as first-class; identity across
sources replaced by an explicit correspondence relation; verification separated
from provenance; mastery separated from scheduling; traces removed from the
representation ladder; the duplication rule narrowed to storage; the discrepancy
notion generalized. The `HasRanges` worked example of v1 rested on a false
conflict and has been removed.

## Scope

For a body of mathematics under study, the model must represent:

- the structure of the subject, as sources present it;
- mathematical statements, proofs, and explanations, whether human- or
  AI-generated, and the sources in which they occur;
- what is known formally, obtained mechanically;
- what a mathematician understands, questions, or only partially understands;
- what has been verified, by what, at what revision;
- how well each kind of understanding is retained, and when it is next due.

## Non-goals

- Not a Lean documentation browser. Formal artifacts are one representation
  class among several.
- Not a proof assistant. Nothing here elaborates, checks, or rewrites proofs.
- Not a single-source system, and not a system whose objects originate in a
  formal development.

## Orthogonal information classes

Formal facts, mathematical understanding, learning state, and verification are
four orthogonal classes. They are not the ontology; they constrain how fields in
the ontology are populated, attributed, and trusted.

---

## Subject structure

Orientation is the top of the Kallenberg trajectory, so the structures carrying
orientation are first-class and precede any individual result.

### Source

```
Source
    id
    kind            manuscript | formal_development | expository_corpus
                    | textbook | paper | external
    name            e.g. rs_Appendix_A.tex, Categorical_Rice_Shapiro/Lean,
                    Stacks Project, Kerodon
    revision        commit, version, or edition
```

### SourceNode

The table-of-contents hierarchy of a source: parts, chapters, sections,
subsections, and the leaves carrying results. Browsing a subject means walking
this tree before any object is opened.

```
SourceNode
    source
    parent
    children        ordered
    kind            part | chapter | section | subsection | leaf
    title
    locator         stable identifier within the source
    span            optional VersionedSpan
```

### SourceOccurrence

An appearance of a result, definition, or discussion at a node. Occurrences are
preserved separately per source and are never merged at ingestion.

```
SourceOccurrence
    source
    node
    locator         latex_label | declaration_name | tag | url | anchor
    span            optional VersionedSpan
    raw             the text or declaration as it appears
```

### VersionedSpan

Line and column extents bound to a source revision. Spans are indispensable for
highlighting, citation, tactic-step display, and jumping into an editor.

```
VersionedSpan
    source_revision
    start_line, start_col
    end_line, end_col
```

**Invariant A — identity is not positional.** A span may locate an occurrence
and never identifies one. Identity is carried by stable locators: `\label`
targets, declaration names, corpus tags. A correspondence keyed to line numbers
is invalidated silently by every edit to its source, and `Lean/docs/AppendixA.md`
illustrates the exposure — roughly fifty line references against fifty-seven
mapping rows, with nothing to detect drift. Stable locators on the manuscript
side require adding `\label`s to `rs_Appendix_A.tex`; no formal exporter
substitutes for that.

---

## Objects and relations

### MathematicalObject

A theorem, definition, lemma, concept, construction, or worked example as
understood by the mathematician rather than as presented by any one source. An
object unifies occurrences when the mathematician judges that it should.
Ingestion does not create objects.

```
MathematicalObject
    id
    kind            theorem | definition | lemma | concept | example | construction
    display_name
    occurrences     [SourceOccurrence]      -- unification is a judgment
    representations [Representation]
    understanding   [UnderstandingField]
    formal_facts    [FormalFact]            -- generated, read-only
    relations       [MathematicalRelation]
    mastery         [Mastery]
    schedule        [ScheduleEntry]
    discrepancies   [Discrepancy]
```

### Correspondence

Relates two occurrences across or within sources. A correspondence is a claim
with a provenance, and its kind records how much is claimed.

```
Correspondence
    from            SourceOccurrence
    to              SourceOccurrence
    kind            formalizes | restates | strengthens | weakens
                    | corresponds_to | approximates
    note            optional prose
    provenance      Provenance
```

The Appendix A mapping supplies each shape. `Erratum.coassoc` and
`PCategory.diag_assoc` are the same declaration under two names — identity.
Heller's naturalizer clause is unformalized, while `p0_nat_of_isTotal` and
`p1_nat_of_isTotal` carry its content in usable form — `approximates`. The `Dom`
sense of "section," a right inverse of `π_Z`, is not the `P`-categorical
`IsSection` — a name collision, so no correspondence at all. The third case is
why matching names may not induce identity automatically.

### MathematicalRelation

Relations among objects, first-class and browsable. Conceptual relations are not
required to align with formal dependency edges.

```
MathematicalRelation
    from, to
    kind            prerequisite | conceptual_dependency | consequence
                    | generalizes | specializes | analogous_to | motivates
    note
    provenance
```

---

## Representations and traces

### Representation

A rendering of an object at some point on Curry's precision ladder.

```
Representation
    kind        orientation | informal_explanation | statement | proof_outline
                | proof_skeleton | formal_statement | formal_proof
                | worked_example
    content
    provenance
    occurrence  optional SourceOccurrence
```

An AI-generated theorem, proof, explanation, or worked example requires no new
entity or representation kind. When it was produced outside Theorem Terminal
and imported for study, it is recorded as a `SourceOccurrence` in the
appropriate source and represented with provenance whose origin is
`ai_proposal` and whose author is the model. A proposal generated by Theorem
Terminal is represented in the same way but need not have an external source
occurrence. Verification and human adoption remain separate records.

Thus AI-generated mathematics may be imported, compared, verified, explained,
and reviewed whether or not Theorem Terminal itself generates assistance.
Generating a proposal is not a prerequisite for storing or studying one.

**Invariant B — the ladder is a study trajectory, not a dependency.** Kallenberg
gives the default order in which levels are approached. Nothing requires level
*n* to exist before level *n+1*. An outline with no formal proof, or a formal
proof with no outline, is a legitimate state.

### Trace

An elaboration or execution record attached to a formal representation. Not a
rung of the ladder.

```
Trace
    representation
    kind            elaboration | tactic_step | evaluation
    step_index
    goal_before, goal_after
    span            VersionedSpan
    derived_from    environment revision
```

---

## Formal facts and verification

### FormalFact

Generated only, with one canonical generating path per fact kind, stamped with
the revision it came from so staleness is detectable.

```
FormalFact
    object | occurrence
    kind            declaration_type | source_location | imports
                    | direct_dependencies | transitive_dependencies
                    | axiom_dependencies | signature_hypotheses
                    | is_theorem | checking_status | downstream_references
    value
    generator       tool name and version
    derived_from    environment revision
    derived_at
```

**Invariant C — one canonical generator, no stored copies.** A fact of a given
kind has exactly one generating path and is never hand-entered or hand-edited.
Human explanations may freely *refer* to formal facts. What is forbidden is a
hand-maintained field that *stores* a second copy, since the copy drifts and
nothing detects it.

### Verification

Checking is an attestation about a claim, not the origin of the claim's content.
A proof written by a human, or proposed by AI, and then checked by Lean has one
origin and one or more attestations.

```
Verification
    subject         representation | object
    method          lean_kernel | external_checker | peer_review
                    | independent_reproduction
    status          verified | failed | not_attempted | stale
    axioms          for kernel checks
    environment     revision
    at
```

---

## Understanding

Understanding fields are attributed records of what the mathematician
understands, explicitly does not understand, or is still trying to determine.
The AI-generated theorem, proof, or explanation being studied remains a
`Representation`. A mathematician's account of it is an `UnderstandingField`.

An AI proposal, whether imported or generated by Theorem Terminal, becomes an
`UnderstandingField` only if a mathematician adopts it. Its provenance retains
its AI origin and adoption record.

### UnderstandingField

```
UnderstandingField
    id
    object
    kind                conceptual_role | why_it_matters | proof_idea
                        | crucial_reduction | hypothesis_rationale
                        | relation_to_surroundings | common_misunderstanding
                        | correspondence_note
    epistemic_state     unknown | question | partial | accepted
    content
    provenance
    supersedes          optional UnderstandingField
```

`unknown` records a known absence of understanding; `question` records a
specific matter to be determined; `partial` records an incomplete account; and
`accepted` records the account the mathematician currently holds. `accepted`
does not mean authoritative or verified.

Understanding fields are immutable. A correction creates a new field whose
`supersedes` value points to the earlier field. The earlier field and its
provenance remain available. A field is current when no later field supersedes
it. Thus correction is represented by a relation between records, not by
overwriting a record.

### Provenance

Origin only. Verification is elsewhere.

```
Provenance
    origin      human_judgment | ai_proposal | machine_extraction | source_quotation
    author      person | model identifier | tool name and version
    at
    adopted_by  set when a human accepts an ai_proposal
    adopted_at
```

**Invariant D — adoption does not launder origin.** An adopted AI proposal
remains `ai_proposal` with an adoption record. No view may present a generated
claim as machine-extracted or as human judgment.

---

## Discrepancy

A first-class object covering any detected conflict, not only understanding
against formal fact.

```
Discrepancy
    kind        stale_correspondence | signature_changed | declaration_missing
                | manuscript_vs_formalization | source_vs_source
                | claim_vs_verification | understanding_vs_formal_fact
    parties     the two items in conflict
    detected_by generator or human
    at
    resolution  unresolved | understanding_corrected | correspondence_updated
                | mathematics_changed | false_positive
```

**Invariant E — absence is not refutation.** A conceptual dependency claimed by
a mathematician is not contradicted by its absence from a formal dependency
graph; formal dependency and mathematical prerequisite are different notions. A
discrepancy of kind `understanding_vs_formal_fact` may be raised only where the
two make claims of the same type — a hypothesis asserted absent from a signature
that is present in it, a declaration cited that does not exist.

**Invariant F — a scoped claim does not transfer.** A note recorded against one
declaration says nothing about another, however closely related. Detection must
compare a claim with the fact about the same subject.

---

## Learning state

### Mastery

Retention, per object and per level. Not a scheduler field.

```
Mastery
    object
    level       orientation | statement | dependencies | proof_idea
                | technical_details | formal_proof
    state       unseen | weak | adequate | secure
    history     [ReviewEvent]
    last_assessed
```

### ScheduleEntry

Scheduler state, per object and level. An item may be secure and due.

```
ScheduleEntry
    object
    level
    due_at
    interval
    ease
    lapses
    scheduler_state
```

**Invariant G — scheduling targets levels.** The scheduler selects a due level
for an object, weakest first, rather than presenting the object as a unit.

### ReviewItem

```
ReviewItem
    object
    level
    kind        reconstruction | explanation | proof_completion
                | hypothesis_analysis | example | counterexample
                | lean_exercise | sage_task | dependency_recall
    prompt
    reference   optional notes, rubric, or exemplars — not a unique answer
    grading     self_assessed | rubric | machine_checked
    provenance
```

**Invariant H — no canonical answer above `statement`.** Items at `proof_idea`
and above are graded against a rubric or exemplars, or self-assessed. Only items
whose correctness a machine can decide — a Lean exercise, a dependency recall
checked against a `FormalFact` — carry `machine_checked` grading.

---

## What the model deliberately omits

- Any authoritative explanation. Understanding fields are attributed and kept
  as immutable histories; `accepted` means currently held, not certified true.
- Any coupling between verification status and mastery. A machine-checked
  theorem may be entirely unlearned.
- Any assumption that ingestion establishes identity across sources.

## Open questions

- Which source or formal changes should cause an understanding field to be
  reviewed; explicit corrections are already represented by `supersedes`.
- Granularity: whether a definition and its induced instances are one object.
- Whether `Discrepancy` resolution may trigger regeneration or only annotation.
- Versioning of understanding fields as the mathematics changes beneath them.
- How subject-level maps are produced — curated by hand, derived from
  `SourceNode` trees, proposed by AI, or some combination — and how a curated map
  survives a source revision.
