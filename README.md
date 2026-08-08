# Theorem Terminal

Theorem Terminal is a laboratory instrument for studying how a mathematician
can maintain understanding, integration, and retention of mathematics in an
AI-assisted environment.

It is an assistant's assistant. It supplies the persistent context in which work
done with machine assistants, proof assistants, and computer algebra systems is
organized, attributed, reviewed, and retained — what was learned, where each
idea came from, which claims are checked, which explanations are human and
which machine, and what needs review. No one assistant is the authority. The
valuable artifact is not an assistant's answer but the corrected understanding
that accumulates around it, which at present survives only in chat logs and in
memory.

It is not a proof assistant, a Lean documentation browser, or a replacement for
mathematical judgment.

## Motivation

AI may change the rate at which mathematical results, proofs, formalizations,
and examples are produced. If mathematical production becomes less limited by
human capacity, the bottleneck shifts toward understanding, integrating, and
retaining mathematical knowledge. Theorem Terminal explores tools for that
bottleneck.

The design rests on three principles:

- Kallenberg's top-down approach to reading advanced mathematics — a general
  overview first, then individual theorems, then proofs and their structure,
  with proofs studied before exercises;
- Curry's account of mathematical language as growing steadily more precise
  without ever reaching absolute precision, so that formalization relocates
  vagueness into the definitions rather than eliminating it;
- formal verification as one aspect of mathematical knowledge. A kernel check
  settles whether a proof is correct relative to stated definitions. It settles
  nothing about why a result matters, what its proof's idea is, whether the
  statement formalized is the statement intended, or whether anyone understands
  it.

## Status

Design documents only. No implementation yet.

The first implementation will be a laboratory instrument, not a completed
platform. Its purpose is to find out which parts of mathematical understanding
can be represented, retained, and assisted, and which remain irreducibly
mathematical.

## Documents

- `VISION.md` — why the project exists.
- `DOMAIN_MODEL.md` — entities, information classes, and invariants.
- `UX_SPEC.md` — the mathematical workflow the system supports.
- `CODEX_PLAN.md` — staged implementation plan.

## First laboratory

The first corpus is `flengyel/Categorical_Rice_Shapiro`, which is private and
not publicly readable. It was chosen because it carries every aspect the project
must connect: a mathematical manuscript, a Lean formal development, proofs with
dependency and axiom information, and a hand-written document relating the
informal mathematics to the formalization.

That last artifact is the reason for the choice. It records expert judgment that
neither the manuscript nor the formal development contains — which hypotheses
turned out unnecessary, which structures are derivable rather than postulated,
where a term means different things in different parts of the development — and
it decays as the formalization moves beneath it. The project asks which parts of
such a bridge can be maintained mechanically and which require a mathematician.

The first corpus is the first laboratory, not a restriction on future corpora.

## License

Copyright 2026 F. Lengyel.

Licensed under the Apache License, Version 2.0. See `LICENSE`.
