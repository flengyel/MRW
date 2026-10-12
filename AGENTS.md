# Codex instructions

Mathematical Research Workstation is the user-facing system being developed from the Theorem Terminal experimental prototype.

The project should help people work with mathematics whose justification exceeds
their present understanding, while making further understanding possible
wherever it can. Follow VISION.md's distinction between epistemic, practical,
explanatory, and organizational benefit. Evaluate each on its own evidence;
neither full proof reconstruction nor eventual human comprehensibility is a
universal acceptance condition. Preserve the separate scopes of provenance,
verification, non-factive derivability, and human judgment. This design principle
creates no automatic truth or comprehension status and no new implementation
claim.

The primary use is gaining working access to existing mathematical literature
and approaching chosen research questions. Prioritize orientation, needed
prerequisites, connections between sources, and cumulative study. Preserve
source locations and distinguish source assertions, proposed dependencies,
checked correspondences, and human synthesis. Do not promise complete
prerequisite maps, effortless mastery, or a verified research frontier. Assess
reduced search and reconstruction effort only from actual work; no summary or
exercise quota demonstrates benefit. The current bounded study source is
Marcus's *Number Fields*. This priority adds no implemented guidance capability
and does not authorize general corpus ingestion or automatic source retrieval.

The editor-centered GUI is the principal user-facing interface; launch it with
`theorem-terminal gui [PROJECT_DIRECTORY]`. Keep the CLI and all technical
identities unchanged. Open Project Directory is the principal entry: show the
actual directory tree lazily and open ordinary mathematical files as buffers.
External references are read-only. No attachment step, preliminary form or
mathematical metadata questionnaire is required. Mathematical content belongs in
ordinary files.

All projects, navigation, files and persistence are corpus-independent.
`rs_Appendix_A.tex` opens like any other file. Add no Appendix-specific production
imports, navigation, corpus selector, study-guide option, adapter registry, saved
capability identifier or integration machinery. Preserve the legacy
Appendix-specific CLI and its source checks. Corpus-neutral format and tool
integrations are permitted when invoked by direct user action.

R1 provides a read-only existing-PDF path through ordinary file actions. Keep PDF
identity and page/zoom state separate from generated-build provenance and text
buffers, recovery and anchors. Preserve work notes on PDF loading failures or
changed content. Opening or restoring a PDF never invokes TeX or creates a
Verification. Use the focus and restoration semantics in UX_SPEC.md; no imported
PDF may be represented as a fabricated successful build.

The current GUI uses PySide6 Qt Widgets and QtPdf. Keep widgets separate from the
controller, record validation and persistence services. Neither toolkit, schema
version nor pane arrangement is a permanent domain invariant. Format-aware
behavior must preserve source integrity and the distinction between editable
text, rendered output and retained records.

The user-requested proof-outline increment is specified in
`docs/PROOF_OUTLINES.md`: vertex elimination with visible claims, explanations,
and expansion to the original steps. Preserve joint premises, local scope,
source revisions, and explanation attribution separately from proof evidence.
Identify the proof representation before selecting regions; declaration maps
do not expose internal proof structure. The preferred frontend trial is one
VS Code extension over the independent services; the editor owns its documents
and undo. Choice of an open-source distribution is deferred. This requirement
is planned, not an implemented viewer or extension. Follow the bounded roadmap
and handoff without making ordinary work depend on Lean or a new warrant.

The shared Qt plain-text document has one layout width. When two visible panes
show that document with wrapping enabled, keep their editor viewport widths
equal through splitter movement and geometry changes. Different buffers and
unwrapped views may have unequal widths. Preserve one document and undo history;
this is a Qt presentation constraint, not a domain invariant.

Unfinished-work and Working context anchors are private mutable navigation state.
Only anchors attached to loaded editable ordinary text follow workstation edits
and undo/redo. Their persisted fields are path, revision, scalar endpoints and a
plain whitespace-normalized preview bounded at 120 Unicode characters. Render
them without source reads; validate explicit navigation before moving a pane.
Publish recovery before updated pins. Deleted passages and known external
changes must not acquire guessed locations or replacement revisions. These aids
never relocate immutable mathematical or documentary records or supply model input.

Opening or viewing a project must not write inside it or read executable
configuration from it. Mutable session state, trusted tool settings, private
unsaved-text recovery and build storage belong in OS user-local application
storage keyed by canonical project identity. Provide a test-only state-root
override. Keep edits in memory and coalesce recovery writes outside the
per-keystroke path. Recovery preserves the latest successfully completed
checkpoint, not characters that were never checkpointed. Flush synchronously at
durability boundaries. Explicit Save
and Save As alone write ordinary editor files, with revision-conflict detection
and atomic replacement. A failed checkpoint must block close and quit unless an
informed user explicitly discards the session. Use the separate
mutable-file service; preserve immutable-record publication unchanged.
Recovery deletion must compare exact expected bytes under the publication lock
and synchronize the parent directory before reporting success. Any failed or
uncertain deletion blocks workspace writes until close/reopen; never compensate
with a recovery rewrite. Directory-sync errors must remain visible. Native
Windows has no implemented portable directory-fsync boundary, so crash-durable
mutable publication is unavailable there.
Different projects may be open in different workstation processes. Concurrent
workstation processes for the same project are unsupported because no
interprocess lifetime lock exists. Add such a lock only in a separately
authorized concurrency change.

Startup, opening, restoration and viewing invoke no compiler, checker, external
editor, notebook kernel, model or network. LaTeX build, external-editor and
Jupyter handoffs require explicit actions and argument vectors without a shell.
Editor templates supply the saved file and current line/column; compare disk
revisions on return without replacing dirty text. TeX root selection is an action
on an existing file. Out-of-tree staged builds execute trusted project TeX with
trusted tools; staging is not a sandbox. openin_any=p is defense in depth for
conventional input operations, not a complete read boundary. In particular,
`\immediate\pdfobj stream file` can embed an absolute external file in the PDF;
arbitrary external reads are not confined. Build only trusted project TeX.
Preserve openin_any=p, openout_any=p, no shell escape, and the accepted
pdfTeX/latexmk engine boundary. LuaLaTeX is unsupported. Enabling it requires a
separately verified OS sandbox and a separately authorized change.
Generated build files remain outside the project and are quota-monitored.
Builds are unavailable on native Windows/macOS until equivalent process-tree
termination and resource controls exist. Qt/runtime and TeX prerequisites are
platform-dependent. Capture
build provenance from the invocation, preserve the last successful PDF after
failure, and mark it stale when recorded input revisions change. Retain observed
outside inputs and explicit dependency coverage (complete, partial or unknown).
When toolchain/package revisions are untracked, say only “recorded project
inputs unchanged.” Typesetting
success creates no mathematical Verification, admission, derivation or judgment.

Justification logic is integral and task-triggered. The contextual inspector
faithfully exposes existing ClaimAtomVersion, PremiseAdmission,
JustificationContext, JustificationDerivation, associated Verification and
provenance separately. Inspection creates no admission and infers no human
decision. Ordinary work requires neither Lean nor existing warrant records.
Do not redesign the calculus, add JAM semantics or invoke Lean automatically.

Exercise toolkit-independent controllers and actual Qt widgets with
`THEOREM_TERMINAL_GUI_TESTS=1` (an offscreen Qt platform can run widget tests).
Use ordinary test documents; no test-only controller subclass may stand in for
the GUI. When changing widgets, exercise the affected user workflow visibly at
1280×820 and 960×680. Preserve R1 regression coverage for a local PDF beside an
editable note, keyboard actions, position restoration and visible marker feedback.
Preserve R2 coverage for exact Unicode and unsaved selection, context removal,
separate preview/Send, off-thread single-attempt transport, every terminal
status, inert returned content, exact projection and concurrent note edits. Use
only deterministic injected transports in automated and visual checks; no live
provider request is an implementation test.
Exercise LaTeX rendering, diagnostics or external-editor handoff when those
paths change; they are not repeated manual gates for every widget edit.
Preserve regression coverage for source integrity and recovery. Run focused
tests during development and one final broader regression pass for a code
change; repeat it only after relevant changes or to resolve a concrete failure.
An installed launch check should confirm the delivered package and entry point,
without requiring another full acceptance campaign. Record unavailable runtime
checks accurately; never substitute offscreen checks for claimed visible use.
Open a real integration corpus only when the task authorizes access, and do not
modify its authoritative files during a visual check.

The current GUI directly provides ordinary-file editing, existing local PDF
reading, one explicitly previewed task-local model exchange, one bounded linked
continuation with private restart restoration, external-editor and
Jupyter handoff, staged LaTeX building, generated-PDF rendering, recovery and
retained-record inspection. Proof-assistant, computer-algebra,
notebook-execution, repository, literature-service, branching/general model
conversation and Kallenberg-guidance GUI workflows remain unimplemented.
Appendix A supplied a corpus-neutral editor/build/render/re-entry
smoke test. The September 14 supplied evidence adds saved reading notes and
one persisted passage, not a completed study-assistance or warrant evaluation.
See UX_SPEC.md §§9.1–9.3 for the now-independent evaluations.
Keep Qt worker results detached; only explicitly queued main-thread QObject
slots may apply completion results to controllers or widgets.

Read `README.md`, `VISION.md`, `VOCABULARY.md`, `DOMAIN_MODEL.md`, `UX_SPEC.md`,
`CODEX_PLAN.md`, and `docs/JUSTIFICATION_LOGIC_EXPERIMENT.md` before changing
behavior. Then read `docs/CODEX_CONTINUATION.md` for the current bounded
implementation task. `CODEX_PLAN.md` controls priority; the continuation file
turns that priority into a handoff, not a competing roadmap.

The active delivery order was R1 readable source plus durable note, R2 a
task-local assistance exchange, then R3 continued investigation and resumption,
as specified in `CODEX_PLAN.md`. R1–R3 are delivered; observe them in genuine
mathematical work and implement demonstrated blockers. The explicit
2026-10-12 proof-outline request separately defines the bounded increment in
`docs/PROOF_OUTLINES.md`; it does not wait for a preliminary study ceremony.
This supersedes old Appendix-first execution
ordering and evaluation prompts that require five anchors or a warrant before
study. Keep one bounded product increment active and evaluate its contribution
to actual mathematical work. Preserve existing recovery and record invariants;
do not expand their machinery merely to produce another successful audit.

No study session requires all repositories to match a shared entry-lock ritual.
Record the source revision actually used and protect unrelated work. Use durable
user work for continuation; disposable copies serve destructive tests, not as
the only copy of study notes. An inconclusive prescribed session is not a human
failure. A confirmed data-loss defect has priority; fix observed interaction
blockers and defer incidental polish. Documentation-only changes need document
validation, not GUI, compiler or full-suite reruns. On delivery, update the
roadmap's implementation status, README capability claims, any changed UX
behavior and the continuation handoff together. Mark mathematical usefulness
pending when it has not been observed; do not fabricate human acceptance or
leave authorized implementation blocked on a manual study ceremony.

Implementation is authorized. The legacy CLI experiment uses `rs_Appendix_A.tex`
from `flengyel/Categorical_Rice_Shapiro` as its first corpus. Its ordered
mathematical guidance begins with top-down orientation. This does not impose a
corpus or a preliminary activity on the general editor.

For requested orientation in unfamiliar mathematics, use Kallenberg ordering
as the default exposition. It is not a startup requirement, mandatory form or
required sequence before a focused question. A reader may request a definition,
example, prerequisite or local proof explanation at any time. The default
orientation, including for a problem-centered text, is:

1. purpose and organization of the subject or chapter;
2. central concepts, results, and problem families;
3. a selected theorem, argument, example, or problem;
4. its governing idea or proposed method;
5. detailed proof, calculation, or construction.

The legacy explicitly requested `why` view follows these levels and is never a
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
artifacts. A standard Jupyter notebook may replace or accompany a Markdown
study note; do not require duplicate prose or treat `study_notes.md` as a
mandatory format. The notebook/SageMath workflow in `CODEX_PLAN.md` is requested
and planned. Build from the existing external Jupyter handoff when implementing
that increment; do not claim that its current summary view supplies notebook
editing, a SageMath kernel, or a notebook-cell bridge to R2/R3.

The justification-logic warrant subsystem is architecturally integral to
Theorem Terminal. Its object language, profiles, derivations, constant
specifications, certificate checker, and certificate-soundness theorem are
implemented in the repository-owned `lean/` Lake project. The toolkit-independent Python
record and checker services use the standard library: they validate and render
Lean-generated checked bundles and never reimplement the calculus. Building or
invoking the Lean checker is task-dependent, and ordinary orientation, study,
and problem work remain usable without Lean. Run the Python checks:

```text
PYTHONPATH=src python -m unittest discover -s tests -v
python -m compileall -q src tests
```

When the task requires Lean verification, run the repository-owned Lake project
from the repository root:

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
and model-response warrant trial retain their acceptance obligations when
those respective experiments are executed (UX_SPEC.md §9.3). They do not gate
R1–R3, ordinary assistance, or acceptance of useful study. Do not commit a
checked bundle or executable Lean checker until the pinned Lean command has actually compiled and
checked it; never hand-author a placeholder that claims checked status.

The single bounded OpenAI Responses API provider adapter is implemented as
infrastructure for the later Stage 1 trial. It uses the fixed endpoint, obtains
its credential only from `OPENAI_API_KEY`, rejects redirects, performs no
retries, and transmits only the exact frozen UTF-8 body shown in its preview.
The low-level CLI requires the exact token `SEND`; the R2 GUI requires its
separate **Send exact preview** action after the same body is displayed. Once transmission begins it atomically retains a
completed, failed, refused, or incomplete `ModelCall` when possible. Do not
change its transport or publication boundary unless a demonstrated defect
requires it. It never automatically projects a response, admits a premise,
invokes Lean, or creates a mathematical warrant.

The deterministic local response-review and selection service is implemented
over completed, finalized `ModelCall` records. It:

- make no network, provider, tool, or Lean call;
- validate the call and response digest before display;
- show attribution and response identity before mathematical content;
- implement `review-response MODEL_CALL` with the mutually exclusive index,
  passage, and full-response selectors specified in `CODEX_PLAN.md`, and extend
  `project-response` with its mutually exclusive `--passage N` selector;
- show the bounded, pageable deterministic passage index specified in
  `CODEX_PLAN.md`, bound every variable-width metadata preview, put trusted
  lengths and truncation state before untrusted text, and keep the complete
  exact response available by explicit action;
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
- use a single linear passage scan retaining only the requested page or selected
  passage; factor a provider-independent, mode-`0600`, synchronized, atomic
  no-overwrite persistence helper and apply it to response-bearing projection
  and admission artifacts as well as the model-call path, preserving the current
  model-call publication commit point, including retention of the complete destination and
  cleanup of only temporary or reservation artifacts after any post-link
  directory-sync failure;
- hold the synchronized temporary descriptor and stable parent directory,
  verify the installed link names that inode before accepting publication, and
  remove an identity-mismatched new link only after verifying it is the link
  created by the operation; this protects against ordinary concurrent pathname replacement,
  not arbitrary compromise of the same Unix account;
- preserve response selection as an ordinary lossless `Representation`; map
  call purposes to existing generic representation kinds rather than adding an
  AI-response hierarchy; and
- add tests for exact passage boundaries, multibyte Unicode, CRLF, repeated
  passages, a response with no blank separator, empty and blank-only responses,
  the current 4 MiB `ModelCall` input boundary, a response at the adapter's
  1 MiB ceiling, terminal controls, cancellation, digest mismatch,
  non-completed calls, mode `0600`,
  no overwrite, concurrent destinations, and failure cleanup.

This implemented review/selection service must not automatically summarize, semantically classify, retrieve
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
assistance and justification-logic entry. The transient request JSON remains a
low-level developer integration envelope, not a form for mathematicians. The
delivered R2 GUI derives it from one selected task, shows the exact selected
ordinary text and complete UTF-8 body, permits context removal, and requires a
separate Send. It performs transport off the Qt thread, prevents duplicate
in-flight sends, presents returned text inertly and reuses exact passage
projection; an editable note copy remains separately attributed. It sends no
PDF bytes or implicit extraction. Each transmission still requires its own
explicit user action and exact-context preview; this roadmap authorizes no
background provider call. Synthetic transport and widget checks do not establish
assistance usefulness.

R3 provides one explicit linked follow-up, correction or alternative and durable
investigation resumption. Preserve its one-initial-parent/one-child cut line,
R2's per-request preview and the adapter boundary; do not use provider
conversation state, `previous_response_id`, automatic retry, branching, source
retrieval, provider tools, a second provider or autonomous requests.

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
