# Domain model

MRW connects exact source passages, attributed mathematical work and records of
checking, study and justification. Ordinary documents remain in their native
formats. Reading or asking about a passage requires no mathematical-object,
problem or study registration.

The shared model consists of scoped identities, immutable versions and captures,
exact references, associations, provenance and observed outcomes. Mathematical
objects and relations form an optional interpretation layer. Study and
justification records are created only by their respective workflows.

The schemas below describe semantic requirements, not a common serialized format
or a migration of existing records. The [design register](docs/DESIGN_RECONCILIATION.md)
identifies implemented capabilities. The [architecture](docs/ARCHITECTURE.md),
[UX specification](UX_SPEC.md) and [integration contract](docs/INTEGRATION_BOUNDARIES.md)
define service and editor ownership.

## Identity and exact references

Logical identity, content revision, capture identity and current location are
separate. An exact reference names its scoped source or record identity and
immutable version, with the retained content digest and passage range where
applicable. A moving URL, path, label or branch name alone is insufficient.
A source revision includes the exact file or captured bytes; an upstream edition
or repository commit alone does not identify uncommitted changes.

Retained source/capture versions, submitted work snapshots and attestations are
immutable while retained. Editing creates
a successor version; associations with current locations can change separately.
An attestation stays bound to its original input. Availability and staleness
relative to current work are derived, not changes to the earlier result.
Explicit deletion follows the [study lifecycle](docs/STUDY_LIFECYCLE.md) and
[saved-source contract](docs/SAVED_SOURCE_TRASH.md).

[Source identifiers](docs/SOURCE_IDENTIFIERS.md) define qualified published IDs,
private scope and retained passage references. The [storage contract](docs/ARTIFACT_STORAGE.md)
defines placement and relocation. [W3C PROV mappings](docs/PROVENANCE_DESIGN.md)
relate artifacts, operations and agents. These contracts preserve the distinction
between provenance, checking, admission, contextual derivability and study outcomes.

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
    name            descriptive title
    revision        exact retained content revision; upstream version if known
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
    source          exact Source revision
    node
    locator         latex_label | declaration_name | problem_number
                    | tag | url | anchor | retained_region_uuid
    span            optional VersionedSpan
    raw             the text or declaration as it appears
```

### SourceReference

A cross-reference published by a source. It records source structure and does
not by itself assert a conceptual or logical dependency.

```
SourceReference
    source
    from            SourceNode | SourceOccurrence
    to_locator      stable identifier in the source
    revision
    provenance
```

Large-corpus ingestion may create `Source`, `SourceNode`,
`SourceOccurrence`, and `SourceReference` records from published structure and
identify the source revision for each. It does not establish identity across
sources, conceptual dependency, relevance to a task, or any claim about a
mathematician. `MathematicalObject`, `ProblemRelation`, and other interpreted
relations are added only when active mathematical work requires them.

### VersionedSpan

A half-open range in an exact retained source revision. Lines are one-based;
columns are zero-based Unicode scalar offsets. Host UTF-16 positions are
converted at the editor boundary.

```
VersionedSpan
    source_revision
    start_line, start_col
    end_line, end_col
```

**Invariant A — identity is not positional.** A retained occurrence reference
includes its scoped source identity, immutable revision and source-local locator.
A stable label identifies an item across revisions, not unchanged mathematical
content. Spans locate passages in pinned revisions; correspondence across
revisions requires an explicit recorded relation.

---

## Optional mathematical interpretation

These groupings and relations support selected mathematical work. They are not
prerequisites for source acquisition, navigation, assistance or interoperability.

### MathematicalObject

A local grouping of occurrences concerning a theorem, definition, lemma, concept,
construction or example. Membership alone asserts no equivalence. Each asserted
identification or formalization has an explicit `Correspondence` with exact
endpoints, attribution and basis. Revising a grouping preserves its earlier version.

```
MathematicalObject
    id, revision
    kind            theorem | definition | lemma | concept | example
                    | construction
    display_name
    occurrences     [exact SourceOccurrence references]
    correspondences [Correspondence]        -- stated relations among occurrences
    provenance      Provenance
    representations [Representation]
    formal_facts    [FormalFact]            -- generated, read-only, possibly empty
    relations       [MathematicalRelation]
    discrepancies   [Discrepancy]
```

### Problem

A source problem or exercise that can be attempted directly. In an
exercise-driven text, it may supply an omitted proof step, application,
calculation, example or counterexample. The proposed representation below is
not a registration requirement for questions in ordinary notes.

```
Problem
    id, revision
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

## Work and task evidence

### WorkArtifact

Mathematics produced while studying, researching, reconstructing, or teaching.
An artifact records the work itself, not a report about the author's internal
state.

```
WorkArtifact
    id, revision
    subjects          [exact source, problem or mathematical-object references]
    kind              proof_attempt | calculation | diagram | example
                      | counterexample | code | exposition
    content
    content_hash      SHA-256 of the immutable content
    sources_consulted [SourceOccurrence]
    assistance_used   [Representation]
    provenance        Provenance
    supersedes        optional WorkArtifact
```

A retained work artifact is an immutable version. A false start remains work;
its correctness is a separate verification question. A source passage used as
context keeps its source identity rather than being relabelled as produced work.

### TaskEvidence

An immutable, attributed event from work on an exact task revision. The existing
[study contract](docs/ACTIVE_STUDY_DESIGN.md#minimal-question-and-attempt-records)
defines its study-specific payloads and persistence.

```
TaskEvidence
    id
    task              exact source, work, problem, object or ReviewItem reference
    study             study identity, when applicable
    attempt           attempt identity, when applicable
    event             operation or study action
    evidence_kind     observed_action | reader_report | ai_assessment
                      | external_check | derived_estimate
    recorded_by       identified person, system or tool
    payload           event-specific data
    at
```

Study events retain the following data:

| Event | Required content |
| --- | --- |
| Begin | Study, exact question revision and activity, attempt identity and timing context. |
| Submit | Attempt, submission identity and sequence, immutable answer snapshot or explicit paper-work report, prior submission, submission-time help/source/answer exposure and available timing. |
| Outcome | Exact submission, attributed outcome, identified assessor, author where applicable and reported consultation (`true`, `false` or unknown). |
| Correct outcome | Exact submission and prior assessment being corrected; retain both assessments. |
| Assistance/exposure | Exact attempt, selected help or source, and its order relative to submission. |
| Skip or interrupt | Exact attempt and disposition; neither supplies a failed recall outcome. |

The retained outcome is `unaided_success`, `help_dependent`, `unresolved` or
`unassessed`. Reader reports, AI assessments and external checks remain distinct.
A submission exposed to help cannot be recorded as unaided success. Exposure
after submission does not change the earlier submission's classification.
Correction links, rather than wall-clock order alone, identify the current
assessment. Missing evidence remains unknown.

Non-study events record saved work, consultation, proposal use or correction,
premise changes, warrant inspection and requested checks against exact subjects.
Completion records an operation's disposition; it does not establish correctness
or understanding. The [usage contract](docs/OPERATIONAL_USAGE.md) supplies the
common event envelope; it requires no duplicate research-event store.

## Correspondences and mathematical relations

### Correspondence

Relates two occurrences across or within sources. A correspondence is a claim
with provenance, and its kind states the exact relation being asserted.

```
Correspondence
    id, revision
    from            exact SourceOccurrence reference
    to              exact SourceOccurrence reference
    kind            same_claim | formalizes | restates | strengthens | weakens
                    | implies | is_implied_by
    note            the asserted relation and its scope
    basis           exact source, work or verification references
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

A grouping references these judgments rather than silently merging occurrences.
A changed judgment creates a new correspondence version. Neither the grouping
nor the correspondence supplies a premise admission or a checked implication.

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

## Claims and explicit justifications

This information class represents how admitted reasons compose. It is used only
when an active mathematical task needs an inspectable warrant path. The
profiles are the non-factive Artemov–Fitting systems $J_0$ and $J(CS)$.

### ClaimAtomVersion

An immutable opaque proposition in the justification language. Mathematical
content remains in its exact representations rather than being reduced to the
atom identifier.

```
ClaimAtomVersion
    id
    display_name
    assertion       immutable canonical opaque proposition payload
    representation_refs [exact SourceOccurrence | Representation | WorkArtifact
                         | FormalFact references]
    content_hash
    supersedes      optional ClaimAtomVersion
```

Matching names or normalized text never merge atom versions. A documentary
claim about exact source bytes, a claim that a passage expresses a theorem, a
formal judgment, a kernel-attestation claim, and the manuscript theorem are
different atoms.

A substantive claim atom may list an AI-proposal `Representation` for display.
That reference records neither evidence nor admission and does not identify the
substantive atom with the documentary claim that a model returned the proposal.

### JustificationTerm and JustificationFormula

Pure syntax. Terms contain no artifact binding, provenance, admission, or
mutable status.

```
JustificationTerm
    constructor     variable | constant | application | sum
    name            for variable or constant
    operands        ordered [JustificationTerm]
    structural_hash

JustificationFormula
    constructor     atom | bottom | implication | reason_assertion
    atom            optional ClaimAtomVersion
    term            optional JustificationTerm
    operands        ordered [JustificationFormula]
    structural_hash
```

Application composes a reason for an implication with a reason for its
antecedent. Sum records alternative reason availability for the same formula;
it does not mean corroboration, independence, probability, consensus, or
weight.

### ConstantSpecification and JustificationProfile

```
ConstantSpecification
    id
    membership_scheme versioned decidable predicate over formulas
    well_formedness   enforced by constructor | checked certificate
    revision
    structural_hash

JustificationProfile
    id
    system          J0 | J(CS)
    syntax_version
    rule_version
    constant_specification required for J(CS), absent for J0
    checker
    checker_version
```

A constant specification $CS$ is a downward-closed set of nested assertions
$c_n:\cdots:c_1:A$, where $n\geq1$ and $A$ is a logical axiom instance.
If such an assertion belongs to $CS$, then $c_k:\cdots:c_1:A$ belongs to $CS$
for every $1\le k<n$. The checker requires decidable membership.
A derivation's finite footprint is not thereby an axiomatically appropriate
constant specification. The [logical specification](docs/JUSTIFICATION_LOGIC_EXPERIMENT.md#logical-basis)
defines the profiles and the conditions for axiomatic appropriateness.

### PremiseAdmission and JustificationContext

```
PremiseAdmission
    id
    premise         JustificationFormula
    basis_refs      [exact SourceOccurrence | Representation | WorkArtifact
                    | ModelCall | FormalFact | Verification | Correspondence references]
    admitted_by     person | named policy
    rationale       optional prose or WorkArtifact
    scope
    at
    supersedes      optional PremiseAdmission, for a replacement

JustificationContext
    id
    profile         JustificationProfile
    admissions      ordered [PremiseAdmission]
    predecessor     optional JustificationContext
    change_kind     initial | add | remove | replace
    added           [PremiseAdmission]
    removed         [PremiseAdmission]
    created_by      person | named policy | system
    rationale       optional prose or WorkArtifact
    created_at
```

An admission is a scoped decision to include an exact justification formula as
a premise. A source, digest, model response, check, or correspondence supplies
possible external basis and never creates an admission automatically.
`id`, the exact formula and basis revisions, `admitted_by`, `scope`, `at`, and
optional `supersedes` link supply its immutable identity and history; it does
not duplicate those bases in a separate `Provenance` record.
Withdrawal creates a successor context that omits the old admission.
Qualification creates a new claim or formula and a new admission, then a
successor context that uses it. Old admissions, contexts, and certificates are
unchanged. `PremiseAdmission` is an application-level context record, not the
acceptance predicate of an Artemov--Fitting Justification Awareness Model.
For an initial context, `predecessor` is absent, `change_kind = initial`,
`added = admissions`, and `removed` is empty.
Every successor identifies its additions and removals, actor or policy,
rationale, and predecessor; these fields are the immutable withdrawal and
replacement history displayed by `why`.
For `add`, the successor admissions are the predecessor admissions plus
`added`; for `remove`, they are the predecessor admissions minus `removed`; for
`replace`, both lists are nonempty and the successor applies both operations.

### JustificationDerivation

```
JustificationDerivation
    id
    profile         JustificationProfile
    context         JustificationContext
    steps           ordered derivation DAG
    conclusion      JustificationFormula
    cs_footprint    exact CS members invoked as axioms
    certificate
    dependency_refs exact record revisions used
```

A derivation presented as checked has one `Verification` whose subject is that
derivation and whose method is `justification_checker`; the attestation is not a
second copy of the derivation.

**Invariant J — derivability is contextual.** A successful check establishes
only that the conclusion is derivable under the recorded context and profile.
It does not establish truth, knowledge, understanding, provenance, external
verification of the conclusion, or unqualified human acceptance. The checker
attestation verifies only that the certificate denotes the recorded contextual
derivation. Display the result as derivable relative to the recorded
admissions and profile.

**Invariant K — every bridge is explicit.** Provenance, verification,
correspondence, and model output never become premises automatically. A
`formalizes`, `restates`, or `same_claim` correspondence does not create
$F_L\to F_M$; any implication used by application is a separately admitted
formula with its own scope and basis.

**Invariant L — syntax and history are immutable.** Artifact bindings belong to
admissions, not terms. Only a derivation DAG must be acyclic; source, claim, and
correspondence graphs may contain legitimate cycles. A derivation remains
check-valid in its original context when a successor context omits an admission,
although its route is no longer active in the successor.

**Invariant M — the checker boundary is not duplicated.** Lean checks the
calculus and emits the bundle. Python validates bindings and renders it.
The separate `Verification` retains the checker identity and expected bundle
digest. A matching digest detects later substitution; it does not authenticate
the producer.

---

## Representations and model calls

### Representation

A statement, explanation, problem, hint, proof, calculation, diagram or example
associated with an exact source passage, mathematical object, problem, work
artifact or review item.
For the distinction between informal and formal presentations, see Haskell B.
Curry, [*Foundations of Mathematical Logic*](https://books.google.com/books?id=27dkTJFrLZIC), chapter 1.

```
Representation
    id
    version
    subject     exact VersionedSpan | SourceOccurrence | MathematicalObject
                | Problem | WorkArtifact | ReviewItem reference
    kind        orientation | informal_explanation | statement
                | problem_statement | proof_outline | proof_skeleton
                | strategic_hint | proposed_solution | calculation | diagram
                | formal_statement | formal_proof | worked_example
    content
    content_hash SHA-256 of the immutable content
    provenance
    occurrence  optional SourceOccurrence
    derived_from optional [Representation]
    supersedes  optional Representation
```

An AI-generated theorem, problem, proof, explanation, hint, solution, or worked
example requires no additional entity or representation kind. When produced
outside MRW and imported for study, it is recorded as a
`SourceOccurrence` in the appropriate source and represented with provenance
whose `Provenance.origin = ai_proposal` and whose author is the model, if known. A
proposal generated by MRW is represented in the same way but need
not have an external source occurrence. Verification, later human use or
rejection, and admission as a justification premise remain separate records.

AI-generated mathematics may be imported, compared, verified, explained, and
reviewed whether or not MRW itself generates assistance.
Generating a proposal is not a prerequisite for storing or studying one.

Task-mediated assistance uses the existing representation kinds. A definition
or result explanation and a criticism ordinarily become an
`informal_explanation`; an intermediate lemma becomes a `statement`; a source
suggestion becomes an `informal_explanation` containing the exact suggestion;
a computation becomes a `calculation`; and a worked solution remains a
`proposed_solution` until later human work is represented separately. The
purpose of the call remains available on `ModelCall` and `TaskEvidence`;
duplicating it as a specialized AI-response type is unnecessary.

A `Representation` is immutable. Editing, paraphrasing, or normalizing its
content creates a new version linked through `derived_from` or `supersedes`; it
never changes the content or hash of the earlier representation. A paraphrase
or synthesis of selected response material is a separate representation whose
`derived_from` field identifies its lossless selected sources. It neither
replaces them nor inherits their verification, premise admission, or
disposition. A synthesis produced by another model requires its own
`ModelCall` and exact response provenance.

**Invariant B — representation kinds are not prerequisites for one another.**
Nothing requires one representation kind to exist before another. A problem
with no formal statement, an outline with no formal proof, and a formal proof
with no outline are all legitimate states. The absence of formal material never
prevents study, problem solving, review, or reconstruction.

### Proof outlines by vertex elimination

The [proof-outline view](docs/PROOF_GRAPH_WORKFLOW.md) reads an ordinary
`.mrw-proof.json` document. Vertex elimination simplifies the display while
preserving joint premises, alternatives, local scopes and expansion to original
steps. It performs no proof check. Retained explanations have their own versions
and provenance; they do not inherit a proof's verification.

The [source reader](docs/PROOF_OUTLINES.md) separately retains immutable source
passages and editable attributed annotations. Reader-created associations and
dependency notes are distinct from source-published `SourceReference` records
and checked implications. Exact references bind scope, source revision, outline
and region identities, with scalar ranges for passages. Annotation edits do not
retarget earlier citations.

An overview across sources may remain an ordinary Markdown work artifact with
explicit retained references. A changed source or association preserves the
previously cited passage. Generated `FormalFact` and `Trace` records are
referenced where available rather than copied into the overview.

### ModelCall

A bounded request made by MRW to a configured model from active
mathematical work. Its terminal snapshot is immutable. The record is an
operational and provenance envelope for an external action and is generated
automatically; the mathematician does not populate it as a form.

```
ModelCall
    id
    initiated_by      person
    target            exact VersionedSpan | Problem | ReviewItem
                      | MathematicalObject | WorkArtifact reference
    purpose           general_question | definition_explanation | result_explanation
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
    finalized_at       when the terminal snapshot became immutable
    status            completed | failed | refused | incomplete
    response_id       optional provider identifier
    raw_response      optional exact returned content
    raw_response_digest optional SHA-256 of raw_response UTF-8 bytes
```

`context_refs` identify the selected source and work revisions.
`effective_input` records the instructions and messages supplied to the model.
Source-bound requests use an exact passage identity and revision as their `VersionedSpan`
target. General Ask and its follow-ups use `general_question`; they do not
classify a free-form question as an explanation, critique or computation.

Request fields freeze before transmission. A separate explicit Send action
permits at most one provider request. Finalization makes the complete call
immutable; a retry or follow-up creates another linked call. Provider-side
conversation state is not the project record.

`raw_response` is the exact Unicode response text after transport decoding and
before normalization or extraction. Its digest is required whenever text is
present. A lossless extracted `Representation` identifies the finalized call,
response digest and half-open UTF-8 byte span; its content equals those bytes.
A paraphrase or synthesis has a separate representation and derivation link.
Extracted representations are found through provenance, not a mutable list on
the call. Only finalized, digest-bound returned material can support a
documentary claim atom.

**Invariant I — a model response is proposed material.** Retention, extraction
or use supplies no verification, premise admission or checked implication.
Reported citations and checks require independently obtained source or checking
evidence. A selected response passage remains inert attributed text.

The [reader AI workflow](docs/READER_AI_WORKFLOW.md) defines preview, Send,
continuation and review. The [Responses adapter](src/mrw/openai_response.py) defines transport, response
limits, credentials and immutable publication.

### AI-to-warrant projection

This projection uses the existing generic warrant records; it introduces no
AI-specific domain entity. Let:

- $C$ be an immutable `ModelCall`;
- $h$ be its `raw_response_digest`;
- $s$ be the exact response span of a lossless `Representation` $R$;
- $D=\operatorname{ModelProduced}(C,h,s,R)$ be an opaque documentary
  `ClaimAtomVersion`; and
- $F$ be a distinct opaque substantive mathematical claim.

`ModelProduced` is only the display convention for this application atom, not
an added predicate language or domain type. If the documentary fact participates
in a warrant, a `PremiseAdmission` may admit $m:D$, with $m$ a justification
variable and with $C$, $R$, and the exact span as external basis. This says
only that the finalized call returned that proposal.

The canonical assertion payload for $D$ is the compact UTF-8 JSON array

```text
["model-produced-v1", call_id, response_digest, start_byte, end_byte,
 representation_id, representation_content_hash]
```

with JSON string escaping, base-ten integer offsets, and no insignificant
whitespace. `ClaimAtomVersion.content_hash` is the SHA-256 of those exact bytes.
All identifiers are stable immutable identifiers; $C$ must be finalized and
$R$ immutable before the atom is created.

Direct reliance on the proposal additionally requires a separate, scoped
admission $r:(D\to F)$, with an independently inspectable review or policy
basis. The checker may then derive $r\cdot m:F$. No extraction, structured
response, provider identity, fluency, citation, or use during work creates
either admission. No provider-wide bridge from model production to truth is
permitted.

When independent reconstruction, source retrieval, computation, or formal
checking directly warrants $F$, the context instead admits a separately based
reason $v:F$. The model call then remains causally relevant through provenance
and `TaskEvidence` but is correctly absent from the mathematical derivation.
Reported citations, computations, and checks remain proposals until retrieved
or run independently.

**Invariant N — AI interaction has no bespoke epistemic shortcut.** `ModelCall`,
`Representation`, `Provenance`, and `ClaimAtomVersion` acquire no field for
trust, reliability, support, confidence, acceptance, correctness, verification,
authority, weight, integration, or adoption. There is no `AITrust`, `AIWarrant`,
`ModelAuthority`, generic support edge, or provider entry in a constant
specification. If a later extension needs acceptance or knowledge-production
semantics, it must adopt a separately specified justification-logic extension
rather than add application-specific status fields.

For selected AI output, `PremiseAdmission` is the only ingress from external
records into a justification context, and a checked `JustificationDerivation`
is the only record of compositional warrant. Proposal use or disposition in
`TaskEvidence` is not a substitute for either.

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
    subject         exact occurrence or representation reference
    logical_subject optional object or problem, for navigation
    kind            declaration_type | source_location | imports
                    | direct_dependencies | transitive_dependencies
                    | axiom_dependencies | signature_hypotheses
                    | is_theorem | checking_status | downstream_references
    value
    generator       tool name and version
    inputs          exact source and artifact references
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
    subject         logical subject, for navigation
    checked_inputs  nonempty exact representation, source, work-artifact
                    or justification-derivation references
    claim           what the method checked
    method          lean_kernel | computer_algebra | external_checker
                    | peer_review | independent_reproduction
                    | source_comparison | justification_checker
    status          verified | failed | inconclusive
    axioms          for kernel checks
    checker_revision optional exact checker implementation revision
    environment     revision
    profile         optional exact JustificationProfile
    context         optional exact JustificationContext
    artifact_identity optional stable identity of exact emitted artifact
    artifact_digest optional SHA-256 of exact emitted artifact bytes
    at
```

Every verification identifies the exact retained inputs checked, including their
immutable revisions or content digests. A logical object or current path alone
is insufficient. The checker environment identifies the method, not the input.
An emitted-artifact digest identifies output, not the checked manuscript or
proof. If current work differs, derive a stale association while preserving the
original attestation and its input references. These requirements define the
generic contract; method-specific records retain their existing serializations.

For `method = justification_checker`, the claim is limited to successful
certificate checking under the exact recorded profile and context; the
`checker_revision`, `environment`, `profile`, and `context` are required and
must agree with the subject derivation. When a runtime check emits a bundle,
`artifact_identity` and `artifact_digest` are created atomically at the trusted
checker handoff and become the expected identity and digest for later
validation. These fields are generic checker-output integrity records, not
AI-specific epistemic status. Verification does not establish the mathematical
truth of the derivation's conclusion or discharge any premise admission.

### Provenance

This existing record describes origin only. Verification is recorded elsewhere.
The [PROV design](docs/PROVENANCE_DESIGN.md) extends provenance to relationships
among versioned artifacts, activities and agents without changing this record's
meaning. Immutability while retained does not prohibit explicit removal under
the Study lifecycle contract.

```
Provenance
    origin         human_work | human_judgment | ai_proposal
                   | machine_extraction | source_quotation
    author         person | model identifier | tool name and version
                   | unknown for imported material
    model_call     required for a system-generated AI proposal
    response_span  required digest-anchored half-open UTF-8 byte offsets for a
                   lossless system-generated AI proposal
    at
```

**Invariant D — later treatment does not change origin.** An AI proposal
retains `Provenance.origin = ai_proposal`. Use, correction, rejection, or
abandonment is recorded by `TaskEvidence`; admission as a justification premise
is recorded by `PremiseAdmission`. Neither changes origin. No view may present a
generated claim as machine-extracted or as human judgment.

Imported AI material may lack a `ModelCall` and instead has an exact
`SourceOccurrence`. A representation extracted from a local `ModelCall` must
have that call, its response digest, and its exact span jointly available.

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
    parties     exact references to the two items in conflict
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

An optional versioned task that can refer directly to source passages. Its question ID,
content revision and activity identify a saved study question.

```
ReviewItem
    id, revision
    subject     exact source, work, MathematicalObject or Problem reference
    activity    definition | hypotheses | missing_step | argument | application
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
    study           study identity
    item            exact ReviewItem/question ID and content revision
    activity        recorded question activity
    target
    due_at
    algorithm_state
    derived_from    exact attempt/submission/outcome TaskEvidence references
    generator       scheduler name, version and parameter identifier
    derived_at
```

**Invariant G — review state is derived.** Replay the retained eligible
observations for the same question revision and activity under the recorded
scheduler. Reader-confirmed unaided recall maps to Good; unresolved or
help-dependent reader-reported recall maps to Again. AI assessments, missing
assessments, skips, interruptions and reading alone do not supply recall ratings.
The [study contract](docs/ACTIVE_STUDY_DESIGN.md#light-rescheduling) defines
eligibility and correction replay. A changed question or source requires
explicit rebinding; prior review does not silently transfer. Scheduling reports
neither mathematical correctness nor understanding.

**Invariant H — open-ended work has no canonical answer.** A proof attempt,
explanation, example, or counterexample remains a `WorkArtifact` whether or not
it has been checked. Any correctness claim is recorded separately as a
`Verification` with a stated method and scope.

---

## Open questions

- Which task requires a mathematical-object grouping rather than direct source links?
- Which source correspondences can be proposed automatically, and what review is needed?
- When may discrepancy resolution request regeneration rather than annotation?
- Which subject maps remain useful when their sources acquire new revisions?
