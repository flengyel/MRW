# DOMAIN_MODEL.md — v7

Draft. Companion to `VISION.md` (why the system exists), `UX_SPEC.md` (what a
mathematician does with it), and `CODEX_PLAN.md` (staged implementation).

Fixes entities and invariants. Does not fix storage technology, schema syntax,
or GUI framework.

Changes from v6: model calls fixed as operational provenance envelopes; exact
response spans anchored to immutable response digests; selected AI output
projects into the existing generic claim, admission, context, and derivation
records rather than a bespoke trust or support schema.

Changes from v5: non-factive justification terms, immutable premise admissions,
versioned contexts, and checked derivations added as a separate warrant class;
provenance, verification, correspondence, admission, and derivability kept
orthogonal; the bounded Appendix A slice excludes JAM and factive profiles.

Changes from v4: source-published cross-references and the boundary of
large-corpus ingestion made explicit; diagrams made first-class work artifacts
and representations; a fixed representation of mathematical expertise excluded.

Changes from v3: bounded task-attached model calls made first-class; exact
application-supplied request content and raw responses recorded; generated
mathematical content remains proposed material with AI provenance.

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
- proof attempts, calculations, diagrams, examples, counterexamples, code, and
  other mathematical work produced during study;
- formal statements, formal proofs, and mechanically generated facts when they
  are available;
- what has been checked, by what method, and at what revision;
- how explicitly admitted reasons compose in a checked non-factive
  justification derivation when an active task requires that account;
- observed task events and review state generated from those events.

## Non-goals

- Not a Lean documentation browser. Formal artifacts are one optional
  representation class among several.
- Not a proof assistant. Nothing here elaborates, checks, or rewrites
  mathematical or Lean proofs. The optional sidecar checks only derivations in
  the explicit justification object language.
- Not a single-source system, and not a system whose objects originate in a
  formal development.
- Not a questionnaire about a mathematician's internal state.
- Not a manually maintained classification of competence.
- Not a general chat client, prompt manager, multi-provider orchestration layer,
  or autonomous-agent system.
- Not a requirement to encode all mathematical reasoning in logic, and not an
  initial implementation of factive justification, introspection,
  Justification Awareness Models, Fitting semantics, or epistemic scores.

## Orthogonal information classes

Source content, mathematical work, model-call records, provenance, verification,
premise admission, justification derivability, task evidence, and generated
review state are distinct. The model must not infer one directly from another:
a model response is neither source content nor verification, provenance is not
admission, verification is not a formal--informal bridge, a checked derivation
does not verify the truth of its conclusion, verification is not retention, and
a recorded task event is not a claim about an internal mental state.

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
The selected result already has the stable locator
`lem:range-lifting-pullback-section`. Remaining positional manuscript
references require `\label`s before correspondence maintenance expands to
them; no formal exporter substitutes for those locators.

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
    kind              proof_attempt | calculation | diagram | example
                      | counterexample | code | exposition
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
                      | proposal_abandoned | premise_admitted
                      | premise_withdrawn | premise_replaced
                      | warrant_inspected | check_requested | completed
    assistance_kind   optional definition_explanation | result_explanation
                      | source_suggestion | strategic_hint
                      | intermediate_lemma | proof_outline | critique
                      | worked_solution | computation
    related           optional SourceOccurrence | Representation | Verification
                      | ModelCall | PremiseAdmission | JustificationContext
                      | JustificationDerivation
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

## Claims and explicit justifications

This information class represents how admitted reasons compose. It is used only
when an active mathematical task needs an inspectable warrant path. The first
profiles are the non-factive Artemov--Fitting systems \(J_0\) and \(J(CS)\).

### ClaimAtomVersion

An immutable opaque proposition in the justification language. Mathematical
content remains in its exact representations rather than being reduced to the
atom identifier.

```
ClaimAtomVersion
    id
    display_name
    assertion       immutable canonical opaque proposition payload
    representation_refs [SourceOccurrence | Representation | WorkArtifact
                         | FormalFact]
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

A constant specification \(CS\) is a downward-closed set of nested assertions
\(c_n:\cdots:c_1:A\), where \(n\geq1\) and \(A\) is a logical axiom instance:
every shorter suffix of a member also belongs to \(CS\). It is never a trust
list for sources, people, model providers, or theorem provers. Both \(J_0\) and
\(J(CS)\) permit constants as terms; only \(J(CS)\) admits a proof step by
membership in its named, versioned, decidable \(CS\). An axiomatically
appropriate \(CS\) supplies every axiom instance at every positive nesting depth
and cannot be finite. A derivation's footprint is only the finite subset of
\(CS\) members actually invoked as axioms. It is not thereby a constant
specification; even if it is downward-closed and hence forms a finite constant
specification, it is not axiomatically appropriate.

The constructor or certificate for a `ConstantSpecification` must establish
that every member terminates in a logical axiom instance and that membership is
closed under shorter suffixes. An arbitrary decidable predicate is not a
constant specification.

### PremiseAdmission and JustificationContext

```
PremiseAdmission
    id
    premise         JustificationFormula
    basis_refs      [SourceOccurrence | Representation | WorkArtifact
                    | ModelCall | FormalFact | Verification | Correspondence]
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
derivation. The first Appendix A output must say “derivable relative to these
admitted premises and policy.”

**Invariant K — every bridge is explicit.** Provenance, verification,
correspondence, and model output never become premises automatically. A
`formalizes`, `restates`, or `same_claim` correspondence does not create
\(F_L\to F_M\); any implication used by application is a separately admitted
formula with its own scope and basis.

**Invariant L — syntax and history are immutable.** Artifact bindings belong to
admissions, not terms. Only a derivation DAG must be acyclic; source, claim, and
correspondence graphs may contain legitimate cycles. A derivation remains
check-valid in its original context when a successor context omits an admission,
although its route is no longer active in the successor.

**Invariant M — the checker boundary is not duplicated.** A separate Lean deep
embedding checks the calculus and emits a deterministic bundle. The Python
application may validate the known schema, profile, dependencies, and a trusted
expected digest and render the result; it does not reimplement the derivation
checker. The emitted bundle contains no digest of itself. For a frozen fixture
shipped with the application, the expected SHA-256 of the complete bundle bytes
is pinned in Python package or code metadata. For a bundle generated at runtime,
the application computes SHA-256 over the complete bytes received at the
trusted sidecar handoff and atomically retains it in the immutable
`Verification`, with the artifact identity, checker and environment revision,
profile, and context. Subsequent validation compares the bytes with that
separate retained value. A bundle hash detects later substitution relative to
its independently retained expected digest; it is not a signature and does not
authenticate the producer.

---

## Representations and model calls

### Representation

A statement, explanation, problem, hint, proof, calculation, diagram, or
example associated with a mathematical object, problem, work artifact, or
review item.
The kinds include stages in Curry's account of increasing precision
[@curryFoundationsMathematicalLogic1977, §1], but no stage is required.

```
Representation
    id
    version
    subject     MathematicalObject | Problem | WorkArtifact | ReviewItem
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
outside Theorem Terminal and imported for study, it is recorded as a
`SourceOccurrence` in the appropriate source and represented with provenance
whose `Provenance.origin = ai_proposal` and whose author is the model. A
proposal generated by Theorem Terminal is represented in the same way but need
not have an external source occurrence. Verification, later human use or
rejection, and admission as a justification premise remain separate records.

AI-generated mathematics may be imported, compared, verified, explained, and
reviewed whether or not Theorem Terminal itself generates assistance.
Generating a proposal is not a prerequisite for storing or studying one.

A `Representation` is immutable. Editing, paraphrasing, or normalizing its
content creates a new version linked through `derived_from` or `supersedes`; it
never changes the content or hash of the earlier representation.

**Invariant B — representation kinds are not prerequisites for one another.**
Nothing requires one representation kind to exist before another. A problem
with no formal statement, an outline with no formal proof, and a formal proof
with no outline are all legitimate states. The absence of formal material never
prevents study, problem solving, review, or reconstruction.

### ModelCall

A bounded request made by Theorem Terminal to a configured model from active
mathematical work. Its terminal snapshot is immutable. The record is an
operational and provenance envelope for an external action and is generated
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
    finalized_at       when the terminal snapshot became immutable
    status            completed | failed | refused | incomplete
    response_id       optional provider identifier
    raw_response      optional exact returned content
    raw_response_digest optional SHA-256 of raw_response UTF-8 bytes
```

`context_refs` identify the exact source revisions and artifact versions used to
construct `effective_input`. The effective input includes every
application-supplied instruction and message, not only the mathematician's
question. The record permits inspection of what was sent; it does not promise
deterministic replay.

Request fields are frozen when transmission begins. Response and terminal
fields are appended as events arrive; once `finalized_at` is set, the complete
`ModelCall` is immutable. A correction or retry creates another linked call.
Only a finalized call with a fixed response digest may participate in a
documentary claim atom.

Each explicit user action creates at most one provider request and one
`ModelCall`. The request includes only the displayed selected context, obeys its
recorded limits, invokes no provider tools, and performs no automatic retry or
recursive request. A retry or user-requested follow-up is another `ModelCall`
linked through `in_reply_to`. The `purpose` is derived from the invoked
assistance operation; the mathematician does not classify it separately.

For the first adapter, `raw_response` is the exact Unicode mathematical-response
text delivered by the adapter after transport decoding and before trimming,
normalization, parsing, or extraction. The first experiment accepts one such
text payload; unsupported multipart or non-text output is recorded as an
incomplete call and is not projected into a warrant.

The raw response and its digest are preserved before extraction. Only response
material that enters the mathematical work, or whose correction, rejection, or
abandonment is recorded, is extracted as a `Representation`. In the first
experiment this extraction is lossless: its content is the exact half-open
UTF-8 byte span `[start, end)` of `raw_response` identified by
`raw_response_digest`. Its provenance identifies the `ModelCall` and span and
has `Provenance.origin = ai_proposal`. A paraphrase, normalization, or edit is a
separate `Representation` linked through `derived_from`; it is never described
as the exact returned span. Extraction establishes attribution only, not
correctness or a relation to any source.

`raw_response_digest` is required whenever `raw_response` is present. A failed,
refused, or incomplete call with no returned content has neither a response
digest nor a response span.

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

Representations extracted from a call are obtained by reverse lookup through
their provenance. They are not a mutable list stored on the immutable
`ModelCall`.

**Invariant I — a model response is proposed material.** Storing a raw response,
extracting representations from it, or using one during work does not convert
its mathematical claims into source facts, verifications, premise admissions,
justification derivations, or human judgments.

### AI-to-warrant projection

This projection uses the existing generic warrant records; it introduces no
AI-specific domain entity. Let:

- \(C\) be an immutable `ModelCall`;
- \(h\) be its `raw_response_digest`;
- \(s\) be the exact response span of a lossless `Representation` \(R\);
- \(D=\operatorname{ModelProduced}(C,h,s,R)\) be an opaque documentary
  `ClaimAtomVersion`; and
- \(F\) be a distinct opaque substantive mathematical claim.

`ModelProduced` is only the display convention for this application atom, not
an added predicate language or domain type. If the documentary fact participates
in a warrant, a `PremiseAdmission` may admit \(m:D\), with \(m\) a justification
variable and with \(C\), \(R\), and the exact span as external basis. This says
only that the finalized call returned that proposal.

The canonical assertion payload for \(D\) is the compact UTF-8 JSON array

```text
["model-produced-v1", call_id, response_digest, start_byte, end_byte,
 representation_id, representation_content_hash]
```

with JSON string escaping, base-ten integer offsets, and no insignificant
whitespace. `ClaimAtomVersion.content_hash` is the SHA-256 of those exact bytes.
All identifiers are stable immutable identifiers; \(C\) must be finalized and
\(R\) immutable before the atom is created.

Direct reliance on the proposal additionally requires a separate, scoped
admission \(r:(D\to F)\), with an independently inspectable review or policy
basis. The checker may then derive \(r\cdot m:F\). No extraction, structured
response, provider identity, fluency, citation, or use during work creates
either admission. No provider-wide bridge from model production to truth is
permitted.

When independent reconstruction, source retrieval, computation, or formal
checking directly warrants \(F\), the context instead admits a separately based
reason \(v:F\). The model call then remains causally relevant through provenance
and `TaskEvidence` but is correctly absent from the mathematical derivation.
Reported citations, computations, and checks remain proposals until retrieved
or run independently.

**Invariant N — AI interaction has no bespoke epistemic shortcut.** `ModelCall`,
`Representation`, `Provenance`, and `ClaimAtomVersion` acquire no field for
trust, reliability, support, confidence, acceptance, correctness, verification,
authority, weight, integration, or adoption. There is no `AITrust`, `AIWarrant`,
`ModelAuthority`, generic support edge, or provider entry in a constant
specification. If a later experiment needs acceptance or knowledge-production
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
                    | justification_derivation
    claim           what the method checked
    method          lean_kernel | computer_algebra | external_checker
                    | peer_review | independent_reproduction
                    | source_comparison | justification_checker
    status          verified | failed | inconclusive | stale
    axioms          for kernel checks
    checker_revision optional exact checker implementation revision
    environment     revision
    profile         optional exact JustificationProfile
    context         optional exact JustificationContext
    artifact_identity optional stable identity of exact emitted artifact
    artifact_digest optional SHA-256 of exact emitted artifact bytes
    at
```

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

Origin only. Verification is recorded elsewhere.

```
Provenance
    origin         human_work | human_judgment | ai_proposal
                   | machine_extraction | source_quotation
    author         person | model identifier | tool name and version
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
- Any fixed representation of mathematical expertise or of a mathematician's
  organization of knowledge.
- Any manually asserted competence score.
- Any authoritative explanation.
- Any inference from verification status to retention or competence.
- Any requirement that formal material exist before study or problem solving.
- Any assumption that ingestion establishes identity across sources.
- Provider-side conversation state as the canonical mathematical context.
- Autonomous chains of model calls or a general conversation archive.
- Global factivity, positive introspection, Fitting-world semantics, or a
  Justification Awareness Model in the first warrant slice.
- Any inference from checked contextual derivability to mathematical truth,
  knowledge, understanding, or competence.

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
- Which later mathematical tasks warrant another justification profile or claim
  route after the first Appendix A certificate is evaluated.
