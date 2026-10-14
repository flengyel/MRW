# Vocabulary

Terminology used throughout Theorem Terminal.

These terms apply to the shared mathematical domain, independently of the
frontend. Mathematical Research Workstation is the user-facing name; Theorem
Terminal remains the repository, package, and CLI identity.

## Frontend and editor host

The VS Code extension is the active frontend target. VS Code is its editor
host and owns ordinary documents, editing, saving, undo, and document recovery.
The standalone Qt application is a separate frontend over shared Python
services. An editor buffer is not an immutable research record; explicitly
retaining a passage creates a separate record with source identity and
provenance. A VS Code workspace supplies host configuration and storage context;
it is not a JustificationContext and creates no mathematical warrant.

## Context

The persistent mathematical environment maintained by Theorem Terminal.

Context records sources, active problems, mathematical work, model calls,
provenance, verification, previous task events, and proposed next work. It does
not assert a mathematician's internal state.

The term does not imply a hierarchy of mathematical knowledge. It names the
surrounding information needed to resume work.

## Aspect

An independent dimension of mathematical information.

Examples:

- source structure;
- mathematical work;
- provenance;
- verification;
- explicit warrant;
- task history;
- generated review state.

Aspects may interact but are not ordered as layers.

## Ingestion

Mechanical import of a source's published hierarchy, stable identifiers, source
occurrences, explicit cross-references, and revision information.

Ingestion does not establish mathematical identity across sources, conceptual
dependency, relevance to a task, verification, or any claim about a
mathematician. Mathematical objects and interpreted relations are added only as
active work requires them.

## Mathematical object

A theorem, definition, lemma, concept, example, or construction treated as one
object across explicitly unified source occurrences.

Ingestion does not establish identity across sources.

## Representation

A statement, explanation, problem, hint, proof, calculation, diagram, example,
or formal artifact associated with a mathematical object or problem.

Representations may include orientation, informal explanation, statement,
strategic hint, proposed solution, calculation, proof outline, proof skeleton,
formal statement, and formal proof. An AI response's purpose is retained on its
model call and task evidence; it does not require a parallel family of
AI-specific representation types. No representation
kind is a prerequisite for another, and formal representations may be absent.
A representation is immutable and content-hashed. Editing, paraphrasing, or
normalizing it creates a new derived or successor representation.

## Problem

A source problem or exercise that can be attempted directly.

A problem may request a proof, an omitted proof step, an application, a
calculation, an example, or a counterexample. It remains distinct from attempts
to solve it.

## Problem relation

A provenance-bearing claim specifying what a problem asks or which later problem
requires it.

Examples:

- asks to prove;
- asks to prove a step of;
- asks to apply;
- asks to compute an instance of;
- asks to construct an example of;
- asks to construct a counterexample to;
- prerequisite for.

A problem relation describes the prompt; it does not attest that an attempt
succeeded.

## Work artifact

Mathematics produced during study, research, reconstruction, or teaching.

Examples:

- proof attempt;
- calculation;
- diagram;
- example;
- counterexample;
- SageMath code;
- exposition.

A false start remains a work artifact. Correctness and provenance are recorded
separately.

## Task evidence

An observed event arising from work on a problem, review item, or mathematical
object.

Examples:

- an attempt was started or resumed;
- an artifact was saved;
- a source was consulted;
- assistance was requested;
- a check was requested;
- a task was completed.

Task evidence records activity, not an assertion about understanding or
competence.

## Review item

A substantive mathematical task proposed for resumption, reconstruction,
practice, or checking.

Examples include reconstructing an argument, completing a proof, solving a
related problem, constructing an example, or performing a SageMath computation.

## Review state

Generated scheduling data derived from task evidence.

Review state may determine which task is proposed next. It is not a
mathematician-authored rating and does not assert competence.

## Formal fact

A read-only fact generated from a formal or mechanical source and stamped with
the source revision.

Formal facts may be absent. Their absence does not prevent study, problem
solving, reconstruction, or review.

## Vertex elimination

A graph operation that removes a vertex after joining each of its predecessors
to each of its successors. In the planned proof-outline view, hidden vertices
are eliminated while the original graph and witnesses remain available for
expansion. Each summarized proof region has a visible claim and explanation;
required assumptions and joint premises are preserved. This is distinct from
transitive reduction, node grouping, and proof checking. See
[PROOF_OUTLINES.md](docs/PROOF_OUTLINES.md).

## Claim atom version

An immutable identifier for one opaque proposition used by the
justification-logic layer.

Its mathematical content remains in one or more exact representations, such as
LaTeX source, a Lean proposition, or prose. Matching names or normalized text do
not identify two atoms.

## Justification profile

The named justification calculus, syntax and rule versions, named constant
specification required for \(J(CS)\) and absent for \(J_0\), and checker identity
under which a derivation is checked.

The initial profiles belong to the non-factive Artemov--Fitting \(J_0/J(CS)\)
family. A constant specification \(CS\) is a downward-closed set of nested
assertions \(c_n:\cdots:c_1:A\), where \(n\geq1\) and \(A\) is a logical axiom
instance; every shorter suffix of a member is also a member. It is not a
database of trusted sources or tools. Both profiles admit constants as terms;
only \(J(CS)\) permits a proof step by membership in its named, versioned,
decidable constant specification. An axiomatically appropriate \(CS\) supplies
every axiom instance at every positive nesting depth and cannot be finite. A
derivation's footprint is only the finite subset of \(CS\) members actually
invoked as axioms. It is not thereby a constant specification; even if it is
downward-closed and hence forms a finite constant specification, it is not
axiomatically appropriate.

## Justification term and formula

Pure syntax for explicit reasons and the formulas they justify.

The initial terms are variables, constants, application, and sum. Application
composes reasons. Sum records alternative availability for the same formula; it
does not record corroboration, probability, source independence, or weight.
Provenance and external evidence bindings are not embedded in term identity.

## Premise admission

An immutable, scoped decision that a justification formula may be used in one
justification context, together with the external basis, actor or policy,
scope, time, and optional replacement link on which that decision depends. Its
exact basis records retain their own provenance and revisions; the admission
does not duplicate them in a second provenance record.

A source occurrence, digest, model response, formal check, or correspondence
does not create a premise admission automatically. A bridge such as
\(F_L\to F_M\) is itself an admitted premise with a stated scope and basis.
This application-level admission is not the acceptance predicate of an
Artemov--Fitting Justification Awareness Model.

## Justification context

An immutable selection of active premise admissions for a derivation.

Withdrawing an admission creates a new context that omits it. Qualifying one
creates a new claim or formula and admission and then a new context that uses
the replacement. An old derivation remains check-valid relative to its old
context even when it is no longer an active warrant in the current context.
Every successor context records its predecessor, additions, removals, actor or
policy, rationale, and time; history is not inferred from a set difference.

## Justification derivation

A derivation of one formula relative to a justification profile and context,
including its term, rule steps, dependencies, finite constant-specification
footprint, and certificate. A separate `Verification` with method
`justification_checker` records the checker result. An emitted bundle never
contains its own expected digest. A frozen bundle shipped as a fixture has its
expected digest in external package or code metadata. A bundle generated at
runtime has the digest of its exact final bytes retained in the immutable
`Verification` created at the trusted checker handoff, outside the bundle.

It establishes derivability relative to displayed admissions. It does not by
itself establish truth, knowledge, understanding, provenance, verification, or
human acceptance. A displayed derivation and its admitted bases form a
*warrant path*.

## Provenance

The origin and attribution of a claim or artifact.

Examples:

- human work;
- human judgment;
- AI proposal;
- machine extraction;
- source quotation.

Adoption of an AI proposal does not change its origin.

Provenance does not admit a premise or establish a justification derivation.

## AI-generated mathematical content

A theorem, problem, proof, explanation, hint, example, solution, or other
mathematical representation produced by a model.

Content produced outside Theorem Terminal may be imported through a source
occurrence and studied like any other representation. Formal verification does
not change its origin.

## System-generated assistance

An AI proposal produced through a model call made by Theorem Terminal.

It is one source of AI-generated mathematical content, not a condition for
studying such content. AI output produced elsewhere may be imported and studied
before Theorem Terminal generates any assistance. The request and raw response
remain distinct from any mathematical representations extracted from the
response.

## Model call

A task-attached request made by Theorem Terminal to a configured model,
together with its outcome and returned response, if any.

In the first experiment, *bounded* has an operational meaning. Each explicit
user action creates at most one provider request. The request includes only the
displayed selected context, obeys configured input, output, and timeout limits,
invokes no provider tools, and performs no automatic retry or recursive request.
A retry or user-requested follow-up is a new model call linked to the preceding
call.

The record is generated automatically. It identifies the mathematical purpose,
exact context sent, provider, requested and resolved model identifiers, limits,
settings, status, request time, raw response, and digest of that response.
For the first adapter, the raw response is the exact Unicode mathematical text
after transport decoding and before trimming, normalization, parsing, or
extraction.

Request fields are frozen at transmission; response and terminal fields are
appended during the call. Finalization makes the complete record immutable, and
only a finalized call with a fixed response digest may enter a documentary atom.

Mathematical content extracted from the response has
`Provenance.origin = ai_proposal` and a lossless half-open UTF-8 byte span
anchored to that digest. A paraphrase, normalization, or edit is a separate
derived representation.

A model call is not a general chat conversation, a verification, source
retrieval, source authority, or warrant. It is an operational and provenance
envelope and has no trust, support, correctness, confidence, acceptance, or
authority status.

## Response digestion

A human-led workflow over an immutable completed model call and the ordinary
records already defined here. It supports reconstruction, independent checking,
and synthesis; it is not a new entity or an automatic summary.

Its first executable step is a deterministic local response-review view. The
view keeps attribution and the response digest visible, indexes returned
passages, and lets the mathematician select visible exact text while the
application computes the digest-anchored UTF-8 span. Viewing creates no
representation, task disposition, premise admission, or check. A candidate-route view is derived only from routes actually returned or
recorded in ordinary work artifacts; it is not a new stored entity. The current adapter sends no reasoning-summary parameter
and ignores auxiliary reasoning items. Theorem Terminal does not label returned
explanations as raw chain of thought or claim access to hidden model reasoning
or search history.

A lossless selected passage may become an AI-proposal representation. A human
paraphrase or synthesis is a separate derived representation; a model-produced
synthesis requires a separate explicit model call. Source retrieval,
mathematical verification, premise admission, and justification checking remain
separate operations.

## AI-to-warrant projection

The use of existing generic justification records when a selected AI proposal
participates in an inspectable warrant. It is not a new domain entity.

For an exact model call \(C\), response digest \(h\), response span \(s\), and
lossless extracted representation \(R\), the opaque documentary atom

\[
D=\operatorname{ModelProduced}(C,h,s,R)
\]

says only that this exact call produced this exact proposal. It is distinct
from any substantive mathematical atom \(F\). An admission \(m:D\) records the
documentary basis. Direct reliance additionally requires a separately scoped
and based admission \(r:(D\to F)\), after which application may derive
\(r\cdot m:F\). Extraction creates neither admission.

`ModelProduced` is a display convention for an ordinary opaque atom. It adds no
predicate language or AI-specific domain type.

If independent reconstruction, source retrieval, computation, or formal
checking instead warrants \(F\) directly, the resulting reason \(v:F\) omits
the model call from the mathematical derivation. Causal assistance remains
visible through provenance and task evidence without being converted into
epistemic authority. No `AITrust`, `AIWarrant`, `ModelAuthority`, generic
support edge, or provider-wide trust rule belongs to this projection.

## Correspondence

A provenance-bearing claim that two source occurrences have one of these exact
relations:

- `same_claim`;
- `formalizes`;
- `restates`;
- `strengthens`;
- `weakens`;
- `implies`;
- `is_implied_by`.

The direction and mathematical content of the relation must be established. A
shared name or related subject matter is insufficient.

## Verification

An attestation that a specified claim has been checked by a specified method.

Examples:

- Lean kernel verification;
- computer algebra;
- external checker;
- justification-derivation checker;
- peer review;
- independent reproduction;
- source comparison.

Verification does not establish provenance, premise admission, retention, or
competence, and it does not create a formal--informal bridge. A
justification-derivation check verifies only contextual derivability, not the
truth of its conclusion.

## Discrepancy

A recorded conflict between claims, sources, work artifacts, generated facts, or
attestations.

A discrepancy is information to investigate, not merely an error condition.

Examples:

- stale correspondence;
- changed signature;
- manuscript/formalization mismatch;
- work artifact/source conflict;
- claim/verification conflict.
