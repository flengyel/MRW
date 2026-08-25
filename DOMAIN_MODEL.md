# DOMAIN_MODEL.md — v4

Draft. Companion to `VISION.md` (why the system exists), `UX_SPEC.md` (what a
mathematician does with it), and `CODEX_PLAN.md` (staged implementation).

Fixes entities and invariants. Does not fix storage technology, schema syntax,
or GUI framework.

Changes from v3: bounded task-attached model calls made first-class; exact
application-supplied request content and raw responses recorded; generated
mathematical content
remains proposed material with AI provenance.

Changes from v2: problems and mathematical work made first-class; problem-to-
result relations added for exercise-driven sources; manually asserted
internal-state and competence records removed; review state made a generated
result of task evidence; formal material made explicitly optional.

## Scope

For a body of mathematics under study, the model must represent:

- the structure of the subject, as sources present it;
- problems, statements, proofs, explanations, and examples, whether human- or
  AI-generated, and the sources in which they occur;
- bounded model calls made from active mathematical work, including the exact
  input sent, model identity, raw response, and extracted proposals;
- proof attempts, calculations, examples, counterexamples, code, and other
  mathematical work produced during study;
- formal statements, formal proofs, and mechanically generated facts when they
  are available;
- what has been checked, by what method, and at what revision;
- observed task events and review state generated from those events.

## Non-goals

- Not a Lean documentation browser. Formal artifacts are one optional
  representation class among several.
- Not a proof assistant. Nothing here elaborates, checks, or rewrites proofs.
- Not a single-source system, and not a system whose objects originate in a
  formal development.
- Not a questionnaire about a mathematician's internal state.
- Not a manually maintained classification of competence.
- Not a general chat client, prompt manager, multi-provider orchestration layer,
  or autonomous-agent system.

## Orthogonal information classes

Source content, mathematical work, model-call records, provenance, verification,
task evidence, and generated review state are distinct. The model must not infer
one directly from another: a model response is neither source content nor
verification, provenance is not verification, verification is not retention,
and a recorded task event is not a claim about an internal mental state.

---

## Subject structure

Subject structure supplies orientation before or alongside work on an individual
result or problem. A mathematician may enter at a part, chapter, section, result,
or problem and move in either direction.

### Source

```
Source
    id
    kind            manuscript | formal_development | expository_corpus
                    | textbook | problem_collection | paper | external
    name            e.g. rs_Appendix_A.tex, Categorical_Rice_Shapiro/Lean,
                    Stacks Project, Kerodon, problem-centered textbook
    revision        commit, version, or edition
```

### SourceNode

The table-of-contents hierarchy of a source: parts, chapters, sections,
subsections, and leaves containing results or problems.

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

An appearance of a problem, result, definition, example, or discussion at a
node. Occurrences are preserved separately per source and are never merged at
ingestion.

```
SourceOccurrence
    source
    node
    locator         latex_label | declaration_name | problem_number
                    | tag | url | anchor
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
and never identifies one. Stable locators identify occurrences: `\label`
targets, declaration names, problem numbers, and corpus tags. A correspondence
keyed to line numbers is invalidated silently by every edit to its source, and
`Lean/docs/AppendixA.md` illustrates the exposure — roughly fifty line
references against fifty-seven mapping rows, with nothing to detect drift.
Stable locators on the manuscript side require adding `\label`s to
`rs_Appendix_A.tex`; no formal exporter substitutes for that.

---

## Objects and relations

### MathematicalObject

A theorem, definition, lemma, concept, construction, or worked example treated
as one object across explicitly unified source occurrences. Ingestion does not
establish such unification.

```
MathematicalObject
    id
    kind            theorem | definition | lemma | concept | example
                    | construction
    display_name
    occurrences     [SourceOccurrence]      -- unification is a judgment
    representations [Representation]
    formal_facts    [FormalFact]            -- generated, read-only, possibly empty
    relations       [MathematicalRelation]
    discrepancies   [Discrepancy]
```

### Problem

A source problem or exercise that can be attempted directly. Problems are
first-class because, in an exercise-driven text, they may supply omitted proof
steps, applications, calculations, examples, or counterexamples.

```
Problem
    id
    display_name
    occurrences     [SourceOccurrence]
    representations [Representation]
    relations       [ProblemRelation]
    discrepancies   [Discrepancy]
```

### ProblemRelation

An explicit relation between a problem and the mathematical object or later
problem to which its prompt refers.

```
ProblemRelation
    from            Problem
    to              MathematicalObject | Problem
    kind            asks_to_prove | asks_to_prove_step_of | asks_to_apply
                    | asks_to_compute_instance_of
                    | asks_to_construct_example_of
                    | asks_to_construct_counterexample_to
                    | prerequisite_for
    note            optional prose
    provenance      Provenance
```

The first six relation kinds describe what the problem asks; they do not attest
that any attempt succeeded. `prerequisite_for` relates one problem to another.
No relation is inferred solely from source order or matching terminology.

### WorkArtifact

Mathematics produced while studying, researching, reconstructing, or teaching.
An artifact records the work itself, not a report about the author's internal
state.

```
WorkArtifact
    id
    subjects          [Problem | MathematicalObject]
    kind              proof_attempt | calculation | example | counterexample
                      | code | exposition
    content
    sources_consulted [SourceOccurrence]
    assistance_used   [Representation]
    provenance        Provenance
    supersedes        optional WorkArtifact
```

A false start remains a work artifact. Whether an artifact is correct is a
separate verification question.

### TaskEvidence

An observed event arising from work on a problem or review item.

```
TaskEvidence
    task              Problem | ReviewItem
    artifact          optional WorkArtifact
    event             started | resumed | artifact_saved | source_consulted
                      | assistance_requested | proposal_used
                      | proposal_corrected | proposal_rejected
                      | proposal_abandoned | check_requested | completed
    assistance_kind   optional definition_explanation | result_explanation
                      | source_suggestion | strategic_hint
                      | intermediate_lemma | proof_outline | critique
                      | worked_solution | computation
    related           optional SourceOccurrence | Representation | Verification
                      | ModelCall
    recorded_by       person | system | tool
    at
```

`completed` records a workflow event, not correctness or competence. Task
evidence is obtained from substantive activity; the interface must not require
ratings or declarations of understanding.

### Correspondence

Relates two occurrences across or within sources. A correspondence is a claim
with provenance, and its kind states the exact relation being asserted.

```
Correspondence
    from            SourceOccurrence
    to              SourceOccurrence
    kind            same_claim | formalizes | restates | strengthens | weakens
                    | implies | is_implied_by
    note            optional prose
    provenance      Provenance
```

All directed kinds are interpreted from `from` to `to`:

- `same_claim`: both occurrences state the same mathematical claim;
- `formalizes`: `to` is a formal version of `from`;
- `restates`: `to` states `from` in different language or notation;
- `strengthens`: `to` states a stronger claim than `from`;
- `weakens`: `to` states a weaker claim than `from`;
- `implies`: `from` has been shown to imply `to`;
- `is_implied_by`: `to` has been shown to imply `from`.

The Appendix A mapping supplies examples. `Erratum.coassoc` and
`PCategory.diag_assoc` are two names for the same declaration, so their source
occurrences have kind `same_claim`. Heller's naturalizer clause has no
corresponding Lean declaration. `p0_nat_of_isTotal` and `p1_nat_of_isTotal`
prove projection-naturality statements under `IsTotal`; no correspondence to
Heller's clause is recorded unless an implication or equivalence is established.
The `Dom` sense of "section," a right inverse of `π_Z`, is not the
`P`-categorical `IsSection`; a shared word does not establish a correspondence.

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

## Representations and model calls

### Representation

A statement, explanation, problem, hint, proof, calculation, or example
associated with a mathematical object, problem, work artifact, or review item.
The kinds include stages in Curry's account of increasing precision
[@curryFoundationsMathematicalLogic1977, §1], but no stage is required.

```
Representation
    subject     MathematicalObject | Problem | WorkArtifact | ReviewItem
    kind        orientation | informal_explanation | statement
                | problem_statement | proof_outline | proof_skeleton
                | strategic_hint | proposed_solution | calculation
                | formal_statement | formal_proof | worked_example
    content
    provenance
    occurrence  optional SourceOccurrence
```

An AI-generated theorem, problem, proof, explanation, hint, solution, or worked
example requires no additional entity or representation kind. When produced
outside Theorem Terminal and imported for study, it is recorded as a
`SourceOccurrence` in the appropriate source and represented with provenance
whose `Provenance.origin = ai_proposal` and whose author is the model. A
proposal generated by Theorem Terminal is represented in the same way but need not have an external
source occurrence. Verification and human adoption remain separate records.

AI-generated mathematics may be imported, compared, verified, explained, and
reviewed whether or not Theorem Terminal itself generates assistance.
Generating a proposal is not a prerequisite for storing or studying one.

**Invariant B — representation kinds are not prerequisites for one another.**
Nothing requires one representation kind to exist before another. A problem
with no formal statement, an outline with no formal proof, and a formal proof
with no outline are all legitimate states. The absence of formal material never
prevents study, problem solving, review, or reconstruction.

### ModelCall

A bounded request made by Theorem Terminal to a configured model from active
mathematical work. The record describes an external action and is generated
automatically; the mathematician does not populate it as a form.

```
ModelCall
    id
    initiated_by      person
    target            Problem | ReviewItem | MathematicalObject | WorkArtifact
    purpose           definition_explanation | result_explanation
                      | source_suggestion | strategic_hint
                      | intermediate_lemma | proof_outline | critique
                      | worked_solution | computation
    request_text      assistance requested in mathematical terms
    context_refs      [VersionedSpan | SourceOccurrence | Representation
                      | WorkArtifact]
    effective_input   exact application-supplied request content, including all
                      instructions, messages, template text, and selected
                      mathematical context; excludes authentication credentials
    provider
    requested_model
    resolved_model    optional provider-reported model or version
    adapter_version
    limits            input, output, and timeout
    settings          non-secret parameters needed to interpret the call
    in_reply_to       optional ModelCall
    requested_at
    completed_at
    status            completed | failed | refused | incomplete
    response_id       optional provider identifier
    raw_response      optional exact returned content
    extracted_representations [Representation]
```

`context_refs` identify the exact source revisions and artifact versions used to
construct `effective_input`. The effective input includes every
application-supplied instruction and message, not only the mathematician's
question. The record permits inspection of what was sent; it does not promise
deterministic replay.

Each explicit user action creates at most one provider request and one
`ModelCall`. The request includes only the displayed selected context, obeys its
recorded limits, invokes no provider tools, and performs no automatic retry or
recursive request. A retry or user-requested follow-up is another `ModelCall`
linked through `in_reply_to`. The `purpose` is derived from the invoked
assistance operation; the mathematician does not classify it separately.

The raw response is preserved before extraction. Only response material that
enters the mathematical work, or whose correction, rejection, or abandonment is
recorded, is extracted as a `Representation`. Its provenance identifies the
`ModelCall` and exact response span and has
`Provenance.origin = ai_proposal`. Extraction
does not establish correctness or a relation to any source.

A suggested source does not become a `SourceOccurrence` until it is
independently retrieved and identified. A reported computation or proof check
does not become a `Verification` until the corresponding method is run or its
attestation is obtained separately.

Provider-side conversation state is never the canonical project record. When
the service allows remote response storage to be disabled, the first experiment
requests that setting and records it. The setting does not assert that the
provider performs no other processing or retention.

A narrow provider adapter translates between the canonical request record and
one service in the first experiment. Provider-specific request and response
types do not become domain entities. This boundary does not add service
selection, multiple adapters, or routing.

Credentials remain in the application's secret configuration and never appear
in `effective_input`, raw responses, project records, diagnostic logs, exports,
or error text. A raw response is untrusted content: it cannot execute markup or
commands, open a link, invoke a tool, or be submitted again without an explicit
user action.

**Invariant I — a model response is proposed material.** Storing a raw response,
extracting representations from it, or using one during work does not convert
its mathematical claims into source facts, verifications, or human judgments.

### Trace

An elaboration or execution record attached to a formal representation. It is
not one of the representation stages above.

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

A formal fact exists only when a formal or mechanical source supplies it. It is
generated through one canonical path per fact kind and stamped with the source
revision so staleness is detectable.

```
FormalFact
    subject         object | problem | occurrence | representation
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
Human explanations may freely *refer* to formal facts. A hand-maintained field
that stores a second copy is forbidden because the copy may diverge without
detection.

### Verification

Checking is an attestation about a specified claim, not the origin of its
content. A proof written by a human, or proposed by AI, and then checked by Lean
has one origin and one or more attestations.

```
Verification
    subject         representation | object | problem | work_artifact
    claim           what the method checked
    method          lean_kernel | computer_algebra | external_checker
                    | peer_review | independent_reproduction
                    | source_comparison
    status          verified | failed | inconclusive | stale
    axioms          for kernel checks
    environment     revision
    at
```

### Provenance

Origin only. Verification is recorded elsewhere.

```
Provenance
    origin         human_work | human_judgment | ai_proposal
                   | machine_extraction | source_quotation
    author         person | model identifier | tool name and version
    model_call     optional ModelCall
    response_span  optional exact offsets in ModelCall.raw_response
    at
    adopted_by     set when a human accepts an ai_proposal
    adopted_at
```

**Invariant D — adoption does not change origin.** An adopted AI proposal
retains `Provenance.origin = ai_proposal` with an adoption record. No view
may present a generated claim as machine-extracted or as human judgment.

---

## Discrepancy

A first-class object for any detected conflict between claims, sources,
artifacts, generated facts, or attestations.

```
Discrepancy
    kind        stale_correspondence | signature_changed | declaration_missing
                | manuscript_vs_formalization | source_vs_source
                | artifact_vs_source | claim_vs_verification
                | claim_vs_formal_fact
    parties     the two items in conflict
    detected_by generator or human
    at
    resolution  unresolved | claim_corrected | correspondence_updated
                | artifact_revised | mathematics_changed | false_positive
```

**Invariant E — absence is not refutation.** A conceptual dependency claimed by
a mathematician is not contradicted by its absence from a formal dependency
graph; formal dependency and mathematical prerequisite are different notions. A
discrepancy of kind `claim_vs_formal_fact` may be raised only where both parties
make claims of the same type — for example, a hypothesis asserted absent from a
signature that includes it, or a cited declaration that does not exist.

**Invariant F — a scoped claim does not transfer.** A note recorded against one
declaration says nothing about another, however closely related. Detection must
compare a claim with the fact about the same subject.

---

## Tasks and review

### ReviewItem

A mathematical task proposed for resumption, reconstruction, practice, or
checking.

```
ReviewItem
    id
    subject     MathematicalObject | Problem
    target      orientation | statement | dependencies | method
                | proof_reconstruction | calculation | application
                | technical_details | formal_proof
    kind        reconstruct_argument | solve_problem | solve_related_problem
                | proof_completion | hypothesis_analysis
                | construct_example | construct_counterexample
                | lean_exercise | sage_task | dependency_recall
    prompt
    reference   optional source passages, rubric, or exemplars
    provenance
```

A reference is not required before work begins and need not specify a unique
answer.

### ReviewState

Generated scheduling data. It is not a user-authored evaluation.

```
ReviewState
    subject         MathematicalObject | Problem
    target
    due_at
    algorithm_state
    derived_from    [TaskEvidence]
    generator       scheduler name and version
    derived_at
```

**Invariant G — review state is derived, not reported.** `ReviewState` is
generated from task evidence and can be recomputed. It may determine which task
is offered next, but it never asserts that a mathematician understands or has
mastered its subject. The interface must not require a rating or questionnaire
before work continues.

**Invariant H — open-ended work has no canonical answer.** A proof attempt,
explanation, example, or counterexample remains a `WorkArtifact` whether or not
it has been checked. Any correctness claim is recorded separately as a
`Verification` with a stated method and scope.

---

## What the model deliberately omits

- Any required account of a mathematician's internal state.
- Any manually asserted competence score.
- Any authoritative explanation.
- Any inference from verification status to retention or competence.
- Any requirement that formal material exist before study or problem solving.
- Any assumption that ingestion establishes identity across sources.
- Provider-side conversation state as the canonical mathematical context.
- Autonomous chains of model calls or a general conversation archive.

## Open questions

- Granularity: whether a definition and its induced instances are one object.
- Whether `Discrepancy` resolution may trigger regeneration or only annotation.
- Which task events and thresholds a review-state generator should use.
- Which parts of a raw model response, beyond representations used during the
  work, should be extracted automatically in the first experiment.
- How problem relations are proposed, checked, and revised.
- How subject-level maps are produced — curated by hand, derived from
  `SourceNode` trees, proposed by AI, or some combination — and how a curated map
  survives a source revision.
