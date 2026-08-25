# Vocabulary

Terminology used throughout Theorem Terminal.

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
- task history;
- generated review state.

Aspects may interact but are not ordered as layers.

## Mathematical object

A theorem, definition, lemma, concept, example, or construction treated as one
object across explicitly unified source occurrences.

Ingestion does not establish identity across sources.

## Representation

A statement, explanation, problem, hint, proof, calculation, example, or formal
artifact associated with a mathematical object or problem.

Representations may include orientation, informal explanation, statement, proof
outline, proof skeleton, formal statement, and formal proof. No representation
kind is a prerequisite for another, and formal representations may be absent.

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
- example;
- counterexample;
- SageMath code;
- exposition.

A false start remains a work artifact. Correctness and provenance are recorded
separately.

## Task evidence

An observed event arising from work on a problem or review item.

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

## Provenance

The origin and attribution of a claim or artifact.

Examples:

- human work;
- human judgment;
- AI proposal;
- machine extraction;
- source quotation.

Adoption of an AI proposal does not change its origin.

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
settings, status, request time, and any raw response. Mathematical content
extracted
from the response has `Provenance.origin = ai_proposal`.

A model call is not a general chat conversation, a verification, source
retrieval, or a source authority.

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
- peer review;
- independent reproduction;
- source comparison.

Verification does not establish provenance, retention, or competence.

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
