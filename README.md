# Theorem Terminal

Theorem Terminal is a mathematical context system for learning, reconstructing,
integrating, and retaining mathematics. It is intended both for entering and
absorbing a large body of mathematics and for re-entering one’s own research, an
inactive project, or a subject not studied or taught for years.

It is an assistant's assistant. It preserves the mathematical work produced
while consulting source literature and using machine assistants, proof
assistants, and computer algebra systems: source locations, problems attempted,
proof drafts, computations, diagrams, examples, counterexamples, formal checks,
corrections, and provenance. When requested during active work, it may send a
bounded mathematical question and selected context to a configured model. The
request, the exact context sent, and the raw response are preserved
automatically. Material from the response is extracted only when it enters the
mathematical work or is separately studied. Each extracted proposal remains
linked to its exact response span and is recorded as an attributed AI proposal
rather than a fact or human judgment. The system can
restore the state of an interrupted investigation and select later mathematical
tasks that test reconstruction or application. No one assistant is the
authority, and the system does not ask a mathematician to report an internal
mental state.

It is not a proof assistant, a Lean documentation browser, or a replacement for
mathematical judgment.

## Motivation

Mathematical context can be lost even when papers, notes, books, or formal
developments remain available. A mathematician may need to reconstruct the
purpose of a definition, the idea of an argument, the dependence of one result
on another, or the state of an unfinished proof. The same requirement arises at
different scales: entering a large corpus such as the Stacks Project
[@stacksprojectauthorsStacksProject2021] or Kerodon; studying a problem-centered
text in which exercises develop the theory; returning to one's own research or
an inactive project; and teaching a subject after years away.

A source need not have a machine-checked counterpart, and a complete written
proof need not be present. In a problem-centered source, problems may supply
omitted proof steps, develop examples, establish computational familiarity, or
introduce the next result. Theorem Terminal should therefore support selecting
and solving problems, locating relevant definitions and prior results,
preserving attempts and computations, and resuming unfinished work.

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
across human- and AI-generated mathematics. AI increases the need and supplies
new forms of assistance; it did not create the underlying difficulty.

The design rests on five principles:

- Kallenberg's top-down approach to reading advanced mathematics provides
  orientation before detailed study. Depending on the source, the relevant
  detail may be a theorem, proof, worked example, or problem.
- A problem-centered source is studied through mathematical work. The system
  should help select problems, recover prerequisites, provide optional
  assistance, preserve attempts, and support later reconstruction without
  requiring preliminary data entry.
- Model assistance is requested from active mathematical work. The provider,
  requested and resolved model identifiers, exact submitted request, selected
  context, raw response, and every extracted proposal are recorded
  automatically. A proposal is not a fact or human judgment.
- Curry's account of mathematical language explains how mathematical discourse
  becomes more precise without attaining absolute precision; formalization
  relocates questions of interpretation into the definitions rather than
  eliminating them [@curryFoundationsMathematicalLogic1977, §1].
- Formal verification is optional and supplies one kind of evidence. A kernel
  check settles whether a proof is correct relative to stated definitions. It
  does not settle why a result matters, what its proof idea is, whether the
  formal statement expresses the intended mathematics, or whether the argument
  can be reconstructed and used.

## Status

Initial experimental implementation has begun. Its first executable path studies
`rs_Appendix_A.tex` in Kallenberg's top-down order. `orient` presents the
appendix's purpose and organization, central concepts and results, and a first
selected result without displaying its statement, proof, or formal counterpart.
`study` then reveals the selected result's role and statement; its governing
idea, proof skeleton, and detailed source proof appear only when requested.

The current code is read-only and uses no formal artifact, model service,
session record, database, or network request. Interpretive guide text is marked
as an AI proposal; exact statements and proofs are identified as source text.

The implementation is an experiment conducted through actual mathematical
work. It tests which source relations and work artifacts can be
preserved or generated mechanically, whether they support later reconstruction
and application, and whether one bounded call to a configured model supplies
useful assistance without displacing the mathematical attempt or creating more
record keeping than it saves. Evidence will come from attempted proofs, solved
problems, computations, reconstructions, and later use, not from forms asking
what a mathematician believes is understood.

## Install and run

The current implementation is a local command-line program requiring Python
3.11 or later. Installation must run from the repository root, where
`pyproject.toml` is located.

### Install on Windows PowerShell

```powershell
git clone git@github.com:flengyel/theorem_terminal.git
Set-Location theorem_terminal
py -3 --version
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e .
```

For an existing checkout, begin with `Set-Location` and then create or activate
the virtual environment.

### Install on macOS or Linux

```bash
git clone git@github.com:flengyel/theorem_terminal.git
cd theorem_terminal
python3 --version
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e .
```

### Locate Appendix A

The initial experiment reads `rs_Appendix_A.tex` from a separate checkout of
the private `flengyel/Categorical_Rice_Shapiro` repository. The source file need
not be copied into this repository. Assign its absolute path to a shell variable
so spaces in directory names are handled correctly.

If that repository is not already present, clone it in a chosen parent
directory:

```text
git clone git@github.com:flengyel/Categorical_Rice_Shapiro.git
```

Both repositories are private, so cloning requires GitHub authentication.

PowerShell:

```powershell
$appendixA = 'C:\path with spaces\Categorical_Rice_Shapiro\rs_Appendix_A.tex'
Test-Path -LiteralPath $appendixA
```

macOS or Linux:

```bash
appendix_a='/path with spaces/Categorical_Rice_Shapiro/rs_Appendix_A.tex'
test -f "$appendix_a"
```

### Run the Appendix A experiment

PowerShell:

```powershell
theorem-terminal orient "$appendixA"
theorem-terminal study "$appendixA"
theorem-terminal study "$appendixA" --through idea
theorem-terminal study "$appendixA" --through skeleton
theorem-terminal study "$appendixA" --through details
```

macOS or Linux:

```bash
theorem-terminal orient "$appendix_a"
theorem-terminal study "$appendix_a"
theorem-terminal study "$appendix_a" --through idea
theorem-terminal study "$appendix_a" --through skeleton
theorem-terminal study "$appendix_a" --through details
```

If the installed console command is unavailable, use
`python -m theorem_terminal` in its place, for example:

```text
python -m theorem_terminal orient PATH/TO/rs_Appendix_A.tex
```

The commands reveal cumulative levels of detail:

- `orient` displays the appendix's purpose and organization, its central
  concepts and named results, and the first selected result. It omits theorem
  statements, proofs, and formal counterparts.
- `study` displays the selected result's proposed role and exact source
  statement. The prepared result is
  `lem:range-lifting-pullback-section`.
- `--through idea` also displays the proposed governing idea.
- `--through skeleton` also displays the proposed proof skeleton.
- `--through details` also displays the exact proof from the source.

No command currently writes to the manuscript, creates a session record,
contacts a model service, or loads the Lean development.

### Reviewed source revision

The interpretive guide has been reviewed for the normalized SHA-256 revision

```text
51c3669da3b3a850b1cf8f61f10f873f297d6a598f01d3541678137f002b1945
```

Line-ending differences between Windows and Unix checkouts are normalized. Any
other source change causes `orient` and `study` to exit with status 2 rather
than present an unreviewed guide. Review the changed mathematics, revise the
guide and its tests when necessary, and only then update the reviewed digest.

### Verify the checkout

From the repository root with the virtual environment active:

```text
python -m unittest discover -s tests -v
python -m compileall -q src tests
```

The same order will govern a later experiment with Daniel A. Marcus's *Number
Fields*: orient in the book or chapter and its central concepts, results, and
problem families before selecting a problem.

## Documents

- `VISION.md` — why the project exists.
- `VOCABULARY.md` — controlled terminology used across the design documents.
- `DOMAIN_MODEL.md` — entities, information classes, and invariants.
- `UX_SPEC.md` — the mathematical workflow the system supports.
- `CODEX_PLAN.md` — staged implementation plan.
- `AGENTS.md` — instructions for Codex and other coding agents.

## First corpus

The first corpus is `flengyel/Categorical_Rice_Shapiro`, which is private and
not publicly readable. The named mathematical re-entry and
informal/formal-correspondence test uses `rs_Appendix_A.tex`, the corresponding
Lean declarations, and `Lean/docs/AppendixA.md`. Together they provide a
mathematical manuscript, a formal development, mechanically available
dependency and axiom information, and an existing record of expert
correspondence judgments. A formal counterpart remains optional for every other
corpus.

The hand-written document records expert judgments absent from both the
manuscript and the Lean development: which hypotheses proved unnecessary,
which structures are derivable rather than postulated, and where the same term
has different meanings in different parts of the development. Its positional
references become obsolete as either source changes. The experiment will test
which locators, dependency lists, and checking facts can be regenerated
mechanically; which proposed correspondences can be checked during mathematical
work; and which assessments require mathematical judgment.

The first implementation does not ingest a large reference. After its two
initial experiments have been evaluated, a separately authorized experiment
will ingest and study either the Stacks Project
[@stacksprojectauthorsStacksProject2021] or Kerodon. It will import the published
hierarchy, stable identifiers, cross-references, and revision information, then
obtain and represent statements, proofs, examples, and surrounding context as
active mathematical work requires them.

## License

Copyright 2026 F. Lengyel.

Licensed under the Apache License, Version 2.0. See `LICENSE`.
