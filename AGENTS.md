# Codex instructions

Read `README.md`, `VISION.md`, `VOCABULARY.md`, `DOMAIN_MODEL.md`, `UX_SPEC.md`,
`CODEX_PLAN.md`, and `docs/JUSTIFICATION_LOGIC_EXPERIMENT.md` before changing
behavior.

Implementation is authorized. The first corpus is `rs_Appendix_A.tex` from
`flengyel/Categorical_Rice_Shapiro`. Begin with top-down mathematical
orientation; do not begin with session bookkeeping.

For every source, including a problem-centered text, preserve this order:

1. purpose and organization of the subject or chapter;
2. central concepts, results, and problem families;
3. a selected theorem, argument, example, or problem;
4. its governing idea or proposed method;
5. detailed proof, calculation, or construction.

An explicitly requested `why` view follows these levels and is never a
substitute for them. In the first stateless CLI, `why` must assume no earlier
command or hidden session state. It cumulatively presents purpose and
organization, central concepts and results, the selected result's role and
statement, governing idea, proof skeleton, available technical detail, and
reviewed formal correspondence in that order before the warrant. Do not expose
justification syntax, Lean material, or premise maintenance before the
mathematical context makes the warrant question relevant.

Apply these levels only to material that exists. No complete proof, solution, or
formal artifact is assumed. Formal material is optional and follows the
informal mathematical context. Never require a comprehension report, confidence
score, subject inventory, or formal declaration before mathematical work.
Ordinary TeX, Sage, code, diagram, and note files remain the primary work
artifacts.

The justification-logic warrant subsystem is architecturally integral to
Theorem Terminal. Its object language, profiles, derivations, constant
specifications, certificate checker, and certificate-soundness theorem are
implemented in the repository-owned `lean/` Lake project. The Python
application uses only the standard library: it validates and renders
Lean-generated checked bundles and never reimplements the calculus. Building or
invoking the Lean checker is task-dependent, and ordinary orientation, study,
and problem work remain usable without Lean. Run the Python checks:

```text
PYTHONPATH=src python -m unittest discover -s tests -v
python -m compileall -q src tests
```

For the authorized WSL2 checkout, start Codex in the repository root and use
the repository-owned Lake project:

```text
cd /home/flengyel/src/theorem_terminal
codex
```

Codex then runs the build and tests from that checkout:

```text
cd lean
lake build
lake test
cd ..
PYTHONPATH=src python -m unittest discover -s tests -v
python -m compileall -q src tests
```

The Lean and Lake installation already used by `/home/flengyel/src/PCats` may
supply the pinned toolchain and download cache. `PCats` is not the checker for
this repository: do not point the documentary bridge at a PCats executable or
copy its build artifacts. `lean/lean-toolchain`, `lean/lakefile.toml`, and
`lean/lake-manifest.json` govern this build. The current executable identity is
pinned for Linux x86-64/WSL and is checked before every documentary run.

The executable offline bridge has three mandatory boundaries:

1. `project-response` validates a finalized call and exact UTF-8 span and
   creates only the lossless `Representation` and documentary atom \(D\); it
   neither admits a premise nor invokes Lean.
2. `admit-documentary` explicitly serializes one scoped premise \(m:D\); it
   still does not invoke Lean and creates no substantive \(F\) or bridge. Its
   operational request has `checked_at: null`.
3. `check-documentary` is the only bridge command that invokes the pinned Lean
   checker. It rejects a pre-stamped request, stamps canonical UTC from the
   application clock, and enforces ModelCall finalization ≤ admission ≤
   check. The public path must first perform Python's strict response-digest,
   span, assertion-hash, and cross-link validation; Lean then checks the
   contextual derivation. Do not treat the raw Lean transport executable as an
   independent provenance-hash validator.

The committed multibyte `ModelCall` is synthetic regression data. Its success
tests mechanics only and never counts as a provider request, mathematical use,
or Stage 1 usefulness evidence.

Do not make a live provider call, add another provider adapter, add general
corpus ingestion, or add general Lean analysis until an active mathematical
task supplies an observed requirement. Implementation and offline testing of
the single bounded OpenAI Responses adapter described below are authorized.
The first formal increment is the bounded \(J_0/J(CS)\) checker and Appendix A fixture in
`docs/JUSTIFICATION_LOGIC_EXPERIMENT.md`. After that checker and profile exist,
Stage 1 is authorized to reuse them for the single model-response trial
specified there; it must not add a second logic or checker. Checker invocation
for either fixture remains task-dependent in ordinary mathematical sessions and
does not alter or gate `orient`, `study`, or problem work. The Appendix fixture
and model-response trial are nevertheless required acceptance tests once their respective
authorized evaluation stages are executed. Do not commit a checked bundle or
executable Lean checker until the pinned Lean command has actually compiled and
checked it; never hand-author a placeholder that claims checked status.

The single bounded OpenAI Responses API provider adapter is implemented as
infrastructure for the later Stage 1 trial. It uses the fixed endpoint, obtains
its credential only from `OPENAI_API_KEY`, rejects redirects, performs no
retries, and transmits only the exact frozen UTF-8 body shown in its preview
after the user enters `SEND`. Once transmission begins it atomically retains a
completed, failed, refused, or incomplete `ModelCall` when possible. Do not
change its transport or publication boundary unless a demonstrated defect
requires it. It never automatically projects a response, admits a premise,
invokes Lean, or creates a mathematical warrant.

The deterministic local response-review and selection precursor is implemented
over completed, finalized `ModelCall` records. It:

- make no network, provider, tool, or Lean call;
- validate the call and response digest before display;
- show attribution and response identity before mathematical content;
- implement `review-response MODEL_CALL` with the mutually exclusive index,
  passage, and full-response selectors specified in `CODEX_PLAN.md`, and extend
  `project-response` with its mutually exclusive `--passage N` selector;
- show the bounded, pageable deterministic passage index specified in
  `CODEX_PLAN.md` and keep the complete exact response available by explicit
  action;
- define passages, numbering, previews, and zero-passage behavior exactly as
  `CODEX_PLAN.md` does and map a selected visible passage number to the existing
  half-open UTF-8 span internally;
- apply the exact reversible safe-rendering rule in `CODEX_PLAN.md` to every
  record-derived string, use trusted application framing, emit no terminal
  hyperlink escapes, and invoke no pager, Markdown renderer, shell, or link
  handler;
- create no artifact when the response is only viewed or the action is
  cancelled;
- use the existing parser, digest validation, and projection construction rather
  than duplicating them;
- factor a provider-independent, mode-`0600`, synchronized, atomic
  no-overwrite persistence helper and apply it to response-bearing projection
  and admission artifacts as well as the model-call path, preserving the current
  model-call publication commit point, including retention of the complete destination and
  cleanup of only temporary or reservation artifacts after any post-link
  directory-sync failure;
- preserve response selection as an ordinary lossless `Representation`; map
  call purposes to existing generic representation kinds rather than adding an
  AI-response hierarchy; and
- add tests for exact passage boundaries, multibyte Unicode, CRLF, repeated
  passages, a response with no blank separator, empty and blank-only responses,
  the current 4 MiB `ModelCall` input boundary, a response at the adapter's
  1 MiB ceiling, terminal controls, cancellation, digest mismatch,
  non-completed calls, mode `0600`,
  no overwrite, concurrent destinations, and failure cleanup.

This implemented precursor must not automatically summarize, semantically classify, retrieve
a source, record a disposition, make a second model call, admit a premise, or
invoke Lean. It records only routes present in the returned text. The task-facing
generator must not solicit hidden chain of thought; the current adapter sends no
reasoning-summary parameter and ignores auxiliary reasoning items. Never label a
returned explanation or summary as raw chain of thought, reconstruct hidden
reasoning, or claim access to provider-internal search or unreturned
alternatives. A human synthesis is a separate
derived representation. A model-produced synthesis requires another explicit
linked `ModelCall`. Source retrieval, verification, premise admission, and
justification checking remain separate explicit actions.

Ordinary orientation, study, and problem work remain independent of model
assistance and justification-logic entry. The current transient request JSON is
a low-level developer integration envelope, not a form for mathematicians and
not the task-facing live workflow; deriving its request metadata and limits
still waits for active mathematical work and a genuine Stage 1 obstruction.
The response-review precursor authorizes no live request and does not
establish Stage 1 usefulness.

For the warrant layer:

- terms and formulas are pure syntax and mathematical claims are immutable
  opaque atoms;
- every artifact binding, premise, formal-proof-policy bridge, and
  formal--manuscript bridge is explicit, scoped, and versioned;
- checker output says derivable relative to a context, never true, known,
  understood, or externally verified;
- a `Correspondence`, formal check, source digest, or model response never
  becomes a premise automatically;
- sum is alternative reason availability, not corroboration, confidence,
  independence, or weight;
- Python validates and renders the trusted Lean-generated bundle and never
  reimplements the derivation checker;
- pin the frozen Appendix fixture's expected bundle digest in package metadata,
  but retain a runtime documentary bundle's exact-byte digest outside it in the
  generic immutable checker `Verification` created at the trusted Lean-checker
  handoff; and
- do not add factivity, introspection, JAM, Fitting semantics, or a corpus-wide
  justification graph in this slice.

For model assistance, `ModelCall` is an immutable operational and provenance
envelope, never an epistemic status record. Preserve the exact raw-response
digest and lossless digest-anchored span before creating a representation. A
paraphrase, normalization, or edit is a separate derived representation.

Project selected AI output into warrants only with the existing generic records:
opaque `ClaimAtomVersion`s, pure formulas, explicit `PremiseAdmission`s,
immutable contexts, and checked `JustificationDerivation`s. Keep the documentary
atom \(D=\operatorname{ModelProduced}(C,h,s,R)\) distinct from the substantive
claim \(F\). Admission of \(m:D\) does not admit \(F\); direct reliance requires
a separately scoped \(r:(D\to F)\). If independent work warrants \(F\), record
that reason directly and leave the model call out of the derivation.

Do not add `AITrust`, `AIWarrant`, `ModelAuthority`, a generic support edge, a
provider-wide production-to-truth bridge, or trust, reliability, confidence,
acceptance, correctness, authority, weight, integration, or adoption fields to
model-call or proposal records. Provider and model identifiers never belong in
a constant specification. Extraction, structured output, fluency, citation,
use, or proposal disposition never creates a premise automatically.

Bind the fixture to the exact manuscript revision, Categorical Rice--Shapiro
commit, Lean environment, declaration type, axiom report, admissions, logic
profile, and checker version. A successor context may make a route inactive but
does not invalidate the historical certificate under its original context.

Additional LaTeX labels are needed only when optional correspondence maintenance
expands beyond the already labeled selected result; they are not a prerequisite
for orientation, informal study, or the bounded warrant slice.

The Appendix A interpretive guide is bound to a reviewed normalized source
digest. If the manuscript digest changes, inspect the mathematical changes and
revise the guide and tests where necessary before updating the digest. Never
update the digest alone.
