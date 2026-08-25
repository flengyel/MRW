# Theorem Terminal

Theorem Terminal is a mathematical context system for learning, reconstructing, integrating, and retaining mathematics. It is intended both for entering and absorbing a large body of mathematics and for re-entering one’s own research, an inactive project, or a subject not studied or taught for years.

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

Mathematical context can decay. Results may remain available in papers, notes,
and formal developments while the understanding that made them usable—their
role, proof ideas, dependencies, and relation to surrounding mathematics—is
lost. The same difficulty arises at different scales: entering a large corpus
such as the Stacks Project [@stacksprojectauthorsStacksProject2021] or Kerodon,
returning to one's own research or an inactive project, and teaching a subject
after years away.

AI adds two demands. It may increase the rate at which mathematical results,
proofs, formalizations, and examples are produced, and it can produce
mathematics that is correct or formally verified without being understood by
the mathematician receiving it. Understanding such a result requires
reconstructing the relevant human-developed mathematics from which current
systems learn and which the result uses or extends. Tao discusses both the
prospect of verified proofs without human understanding and the dependence of
mathematical AI on canonical theories developed and organized by mathematicians
[@taoMathematicsAgeAI2026].

Theorem Terminal supports learning, reconstruction, integration, and retention
across both human- and AI-generated mathematics. AI increases the need and
supplies new forms of assistance; it did not create the underlying difficulty.

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

The first implementation will be experimental. It will test which parts of
mathematical understanding can be represented or retained with software
assistance and which still require mathematical judgment.

## Documents

- `VISION.md` — why the project exists.
- `VOCABULARY.md` — controlled terminology used across the design documents.
- `DOMAIN_MODEL.md` — entities, information classes, and invariants.
- `UX_SPEC.md` — the mathematical workflow the system supports.
- `CODEX_PLAN.md` — staged implementation plan.

## First corpus

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

The choice of this first corpus does not restrict which corpora may be studied
later.

## License

Copyright 2026 F. Lengyel.

Licensed under the Apache License, Version 2.0. See `LICENSE`.
