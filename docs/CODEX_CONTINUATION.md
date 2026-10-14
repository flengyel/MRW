# Codex continuation: VS Code migration and proof outlines

## Active handoff — offline source-region reader, 2026-10-14

The first offline reader is implemented in the existing VS Code extension.
Read [its workflow and persistence boundary](../vscode/README.md#offline-source-region-reader),
[the governing outline requirement](PROOF_OUTLINES.md), and
[the validation report](VS_CODE_OUTLINE_VALIDATION.md). The bounded reconnaissance
at `2c6019f` remains the source of the optional Equation 387 evidence; its original
source/export/server bytes have not been changed and no exporter was rerun.

`source_outlines.py` reuses SourceDocument, bounded reads and existing immutable
and mutable private publication services. Exact source and supplied artifact
blobs are separate from mutable source ranges, visibility, bibliography and
attributed reader annotations. This is private reading state, not a new proof
calculus/schema or a Verification. VS Code owns ordinary documents and undo.
The reader supports informal mathematical books, monographs, articles and
AI-generated/assisted manuscripts without requiring Lean. Orientation, central
concepts/results, governing ideas, argument structure and optional detail are
freely navigable. A cited result may be used while its proof is deferred.

Manual ranges can be added/replaced; exact statements and selected context stay
accessible while argument details are hidden. Explanations, intended inferences,
manual dependency descriptions, questions, gaps and proposed repairs are reader
material. Supplied declaration statements differ from tactic goals. Context lists
available assumptions, not necessary or joint premises; snapshot associations
are explicitly manual. Unknown provenance stays unknown. Saved state is reopened
explicitly after restart. Changed/missing originals never cause remapping;
retained source and evidence remain accessible. Unsaved form drafts have no
restart recovery: save explicitly. Failed/uncertain private publication keeps
live text and blocks project-private writes until reload.

The two acceptance examples are the captured Equation 387 proof and a non-Lean
Euclid IX.20 HTML-to-text validation transcription (CRLF, original HTML retained;
translator/edition unknown). See the report for actual host checks, source/tool
pins, corrected defects, regression results and remaining runtime limits.
Scripted mechanics do not establish mathematical correctness, comprehension or
usefulness. No live provider call was made or authorized. No compiler/provider
call is part of opening, editing, hiding, expanding or restoring this reader.
An installed Lean extension may independently process an original source jump.

Windows VS Code 1.141.1/WSL seed, restart and statement/placement refinement
reports pass. The final regression results are 30 Node tests and 308 Python
tests (249 passed, 59 skipped; PySide6 unavailable), plus compilation/syntax and
document checks. The report distinguishes scripted mechanics from visible
inspection and unobserved mathematical usefulness. A stale retained-tab guard
and restored editor-group reuse were fixed and checked.

Supported sources are bounded saved UTF-8 text; PDF/OCR regions, notebook cells,
rendered formats and non-UTF-8 sources are unsupported. Automatic extraction,
AI outline proposals, automatic gap detection, verified joint-premise graphs,
elimination witnesses and full vertex elimination remain pending. This partial
increment does not replace the full accepted contract. The separately deferred
mathematical-outline capability at multiple scales does not enlarge this task.

Next proposed bounded implementation step: edit/remove shared context and
manual evidence associations, with retained originals still explicitly
accessible and no inferred proof edges. There is no deletion/garbage-collection
or cross-machine state synchronization yet. The full graph increment still
requires a representation that actually supplies scoped joint-premise inferences
and witnesses; declaration maps and tactic context membership do not supply them.
Do not repeat reconnaissance, R3 acceptance or add another extractor merely to
continue. Mathematical usefulness remains pending without gating this delivery.

## Delivered VS Code migration — 2026-10-13–14

The user explicitly requested beginning the VS Code extension and transferring
existing code. The first increment is now in `vscode/`; read its README.
`record_actions.py` supplies the shared projection and attributed-copy functions
used by Qt and the extension. `editor_bridge.py` exposes bounded explicit
record and explicitly previewed assistance actions without owning text
buffers, importing Qt, or invoking Lean. Only Send invokes the model adapter. The host owns documents and undo. Return markers and local Lean/HTTPS
handoffs are present; proof graph extraction and vertex elimination are absent.

PR #2 was merged into main at `f6fcc66ae4d9e9ed27a6ef49d13c8a138d96b43e`.
The follow-on increment implements R2 preview/Send: `assistance_actions.py` supplies
shared preparation, preview, transmission and terminal matching. Qt delegates;
VS Code captures ordinary selections and owns the transient draft. A separate
Send requires the active current preview and consumes it before transmission.
The review repairs additionally pin received records by digest, preserve
virtual-tab record identity, inspect all terminal statuses, and distinguish
known preflight rejection from uncertain transmission. Native Windows Send
is rejected before transport; a known-unsent draft needs a new preview. See
[the review report](VS_CODE_ASSISTANCE_REVIEW.md) for findings and validation.
These repairs were published in PR #3 on `codex/vscode-assistance` at
`d82dfb311db5a020173054e87085c2f2f2de5588`, followed by documentation alignment
at `1fdb6f1a737bc0c82131da62ea786b66b5565495`. PR #3 is merged on `main` at
`f8812ea`; the obsolete branches were removed. Continue from `main`, which
preserves those commits; do not resume from an old review branch.
No live request is authorized by this migration or its tests.

The scoped actual-host validation is now complete on Windows VS Code 1.141.1
connected to WSL Debian. The command suite used deterministic injected responses;
a separate normal-host close/reopen checked persisted Return and stale virtual
tabs. See [results, harness, and limits](VS_CODE_ASSISTANCE_REVIEW.md#actual-extension-development-host-validation)
and `vscode/README.md`. No production defect was found in the covered paths.
The smaller visible check used ordinary host layout adjustments. Manual dialogs,
VSIX installation, external-browser handoff and mathematical usefulness were
not established. Do not repeat this campaign merely to begin the next increment.

The host-validation harness/report is committed as `e4e65ba` and was synced by
the user. The subsequent bounded R3/R3.1 migration is implemented through
shared `investigation_actions.py` and independent `editor_investigation.py`.
Its persistence boundary is in
[vscode/README.md](../vscode/README.md#investigation-persistence-boundary).
The core reserves one pending child before Send, pins terminal identities,
restores explicitly without retry, and publishes only the private pointer and
bounded human text. The host owns documents, saving, undo and recovery. No Qt
workspace or recovery state is imported. Explicit ending uses the latest
matching human fields and retains immutable records; private publication
failure keeps live state and any inserted note text and blocks later private
writes until reload.

Normal WSL Development Hosts exercised restart, changed-record reporting,
ending failure/cancel/success and sequential independent investigations with
deterministic responses. Repeated views now reuse an existing MRW editor group.
See [the R3 results and limits](VS_CODE_ASSISTANCE_REVIEW.md#r3r31-extension-migration).
Usefulness remains unobserved; do not repeat this acceptance campaign merely to
begin another bounded task. The subsequently requested proof-outline
reconnaissance is recorded above. Vertex elimination
remains planned; no complete replacement of the standalone application has been delivered.

The Python/Node checks use synthetic data and make no provider request. The
review environment had no installed VS Code executable or PySide6; command API
doubles and service checks do not establish visible UI acceptance. The user has
now opened Windows VS Code against the WSL2 checkout; the subsequent actual-host
checks are recorded above, separately from that setup and the earlier API doubles.
Keep their limits explicit. The existing Qt study observation below remains independent, and
its instruction to make no code change during observation does not revoke the
new migration request.

VS Code owns text documents, saving, undo, and document recovery. Keep shared
record validation and immutable publication in Python. Port only the bounded
research-state behavior that the host does not supply. Do not reproduce Qt
buffers, checkpoint machinery, widgets, or splitter constraints in the extension.
R3/R3.1 is implemented in VS Code; proof-outline vertex elimination is not.

## Separate Qt study observation and historical evidence

The active roadmap is
[CODEX_PLAN.md](../CODEX_PLAN.md#active-roadmap-mathematical-usefulness-first).
In the standalone Qt application, R1's PDF-plus-note workflow, R2's single
task-local assistance exchange and
R3's one linked, resumable continuation are implemented and technically
verified. R3.1 can explicitly end that sole active investigation without
deleting its records, preserves latest visible handoff edits, rejects stale
restore completion and then permits a new bounded investigation after restart.
Reviewed repair `d91e35bc56d5e66778c115e1c8ffea4d6937cd28` is integrated
in `main` as a historical checkpoint. The focused controller/widget
gate passed 21 deterministic tests; the installed module matches the integrated
source and its GUI entry point launched against a durable study project. A
private ordinary note has been prepared outside this repository. The selected
next source is Daniel Marcus's *Number Fields*; the user has the book and some
exercise answers. The specific passage or exercise remains to be selected. No
new in-application study evidence has been supplied: the system is **ready for
study; the intended benefits of this trial remain unobserved**.
The Marcus study-and-explanation observation remains pending. The explicit
2026-10-12 request separately authorizes the bounded proof-outline requirement
below; its implementation and evaluation must not be reported as completed by
this documentation update.

## Qt observation objective

With a mathematical source and problem chosen by the user, observe whether the
delivered workstation helps produce and later resume worthwhile mathematical
work. Aim first for a useful explanation, reconstructed argument, worked
example or diagnosed error, then preserve it for a genuinely later
continuation. Use an ordinary note or a Jupyter notebook as the durable work
product; the prepared Markdown file is optional. If an actual
interaction blocker appears, diagnose it and make only the smallest authorized
correction needed for that task; otherwise make no code change.

The governing purpose, clarified 2026-09-27, is to help people work with
mathematics whose justification exceeds their present understanding, while
making further understanding possible wherever it can. This study trial tests
a particular function; it does not require every justified result to admit a
complete human explanation. Use the four benefit categories in
[VISION.md](../VISION.md#justification-understanding-and-benefit).

Keep implementation checks, mathematical evidence, and observed benefit
separate. The deterministic R1–R3.1 tests establish mechanics only. Claim
correctness only on identified mathematical grounds within their scope, and
claim each benefit only on the corresponding evidence. A successful check does
not demonstrate comprehension; an unresolved explanation does not negate an
independently observed epistemic, practical, or organizational benefit.

## Requested proof-outline increment

Read [PROOF_OUTLINES.md](PROOF_OUTLINES.md) and the roadmap's
[requested increment](../CODEX_PLAN.md#requested-proof-outlines-and-editor-integration).
For one selected Lean proof, support vertex elimination with visible claims and
explanations, source links, and expansion to the hidden steps. AI may propose
the selection; the reader must be able to revise it.

The bounded inspection of existing exporter/viewer output is now recorded in
[the reconnaissance report](PROOF_OUTLINE_RECONNAISSANCE.md). It distinguishes
declarations, source regions, tactic states and elaborated terms for the pinned
Equation 387 example. Its raw exports and goal responses are actual machine
output; the source-based illustration remains separate from an inference graph.
Consume that output, preserving joint premises, local scope, exact source
revisions and the existing evidence boundaries.

The preferred frontend trial is one VS Code extension over the independent
Python services, reusing the established Lean and mathematical-tool ecosystem.
Let the host own text documents and undo; retain research records in the core.
Choosing an open-source editor distribution is deferred. The extension's record
actions, R2 preview/Send and its manual source-region reader are implemented.
Vertex elimination remains planned. Do not claim planned capabilities or silently replace
the Qt GUI.

The outline service performs no model request or compiler invocation merely to
open or expand an existing outline; separately identify processing initiated by
an installed Lean extension when navigating to source. An AI proposal uses the
bounded exact preview and separate Send;
this handoff does not authorize a live request on its own. Check a newly proposed
formal claim separately. Test reversible graph navigation and retained state,
then observe whether the outline helps reconstruct or continue the proof.
Update status from the actual results. The Marcus observation remains a
separate task and is not a required preliminary ceremony for this increment.

## Existing-literature objective

The primary use is gaining working access to the existing mathematical
literature and progressively approaching the questions of interest. For Marcus,
choose a section, result, or exercise and develop only the orientation needed
for that task: its purpose, relevant definitions and prior results, and a
representative argument or example. An outline is a useful possible work product;
it is not a mandatory preliminary exercise.

Preserve exact source locations and distinguish an author's statement from a
model's suggested connection or the reader's synthesis. Record absent sources
and unresolved prerequisites without inventing a complete dependency map.
Observe whether this work makes the selected material usable and whether the
saved route supports later continuation. A justified application or successful
retrieval may be useful while explanation remains incomplete. Compare effort
only when evidence supports the comparison.

This is a bounded study observation using the delivered workflow. Literature
guidance remains an intended capability; assistance supplied outside the
application does not demonstrate an integrated feature. General ingestion and
automatic literature retrieval remain outside the current increment.

## Establish context once

Read `AGENTS.md` and the documents it names. Inspect the branch and preserve
unrelated tracked and untracked files. The integration and focused gate above
are complete; do not repeat them or the implementation acceptance campaign
merely to begin a study session. Reconfirm installation only if the environment
or integrated commit changes.

Use a durable user project for the note. A disposable copy is appropriate for a
destructive test, not as the only copy of mathematical work. A real integration
corpus may be opened only when the user authorizes it, and its authoritative
files must not be modified during a visual check.

## Notebook option requested September 22

A standard `.ipynb` may replace or accompany the Markdown study note. The
notebook/SageMath increment in `CODEX_PLAN.md` is planned, not implemented.
Current MRW can summarize an existing project notebook and explicitly launch
the configured Jupyter/JupyterLab tool. Use that handoff when suitable, with
JupyterLab providing the editable notebook and an installed SageMath kernel.
Do not present the summary as an embedded notebook editor.

Keep explanation, code, saved outputs and the next question in the notebook
when that serves the task; no duplicate Markdown report is required. Record the
selected kernel and preserve external notebook edits. Saving/reopening notebook
content does not prove restoration of live kernel state. Direct notebook-cell
selection into R2/R3 and response insertion are not delivered; any manual
transfer must remain explicit and accurately described.

Do not repeat the R1–R3.1 acceptance campaign or automatically convert the
prepared note. Keep notebook setup and any bounded implementation separate from
the observation of mathematical benefit.

## Run one natural task

1. Open the relevant local PDF or ordinary source and the chosen study document
   (note or notebook).
   Resume at the actual current question; do not require a questionnaire,
   orientation ceremony, anchor quota, formal artifact or warrant inspection.
2. Do enough mathematics to identify a genuine question or obstruction. Record
   the attempt, useful source location and current assumption in that durable
   study document.
3. If the user chooses model assistance, select only the visible context they
   want sent, ask for an explanation at the actual obstruction, inspect the
   complete R2 preview and let the user perform the explicit Send. No agent,
   test or roadmap authorization may substitute for that per-request user action
   or expose a credential.
4. Assess and, when useful, challenge or correct the returned proposal through
   the mathematics. Returned citations, code and claims remain unverified until
   separately checked. Retain or insert only material the user finds useful;
   dismissal is a valid outcome.
5. If a correction, changed assumption or focused follow-up is useful, select
   the exact prior passages, keep the human correction separate, inspect the
   complete R3 child preview and let the user explicitly Send once. Do not add a
   branch, child-of-child continuation, retry or provider conversation state.
6. Preserve the resulting explanation, worked example, correction or unresolved
   step in the chosen note or notebook. Save the current question, last useful conclusion
   and unresolved issue when useful. Close and reopen later, then continue from
   the durable study document and, when used, bounded investigation state.
7. When that investigation is genuinely over, use **End investigation…** and
   explicitly choose insert-handoff-and-end, end-without-insertion, or cancel.
   Restart before beginning a separate investigation when sequential reuse is
   relevant to the task. Ending clears only the active pointer; it is not record
   deletion or archival.

No live provider request is authorized merely by this handoff. It occurs only
if the user explicitly chooses Send after inspecting that request's preview.

## Record only consequential evidence

Capture the source used, the real question or obstruction, the resulting
mathematical work, any consequential interaction friction and what remains to
do. Note whether the later reopen reduced reconstruction burden and whether
model and human contributions remained distinguishable. Do not ask for a
confidence score or sentence-by-sentence disposition.

Identify which benefit was observed: epistemic (inspectable grounds and limits),
practical (appropriate application), explanatory (a clearer idea or argument),
or organizational (retrieval and resumption). Leave the others unassessed when
evidence is absent. Record explanatory limits without demanding full proof
reconstruction as a prerequisite for using a justified result.

An inconclusive session is not a human failure. If the benefit under evaluation
is absent, identify one concrete obstruction. A confirmed data-loss defect has
priority. For an interaction blocker, make a bounded correction and observe it once; defer
incidental polish and new subsystems.

## Keep the cut line

Do not add automatic follow-ups, branching conversation trees, hidden history,
provider response IDs as conversation state, source retrieval, citation
verification, PDF extraction/OCR/SyncTeX, autonomous requests, another provider,
new warrant machinery, general corpus ingestion or a broad rendering redesign
without a separately authorized, observed requirement.

R1–R3.1 ordinary work remains independent of Lean and justification-logic entry.
A model response, human correction, task summary, projection or link creates no
premise, Verification, acceptance or warrant.

R3.1 currently permits only one active investigation and one child. This is a
bounded implementation cut, not a permanent product requirement. It adds no
archive browser, simultaneous slot, branch, child-of-child request, automatic
summary or retry. If ending cannot checkpoint durably, the old investigation
must remain active and the failure must be reported. Record any actual
obstruction caused by PDF transcription, response notation or insufficient
follow-up depth; do not implement those expansions during the observation.

## Finish the observation

Preserve the actual study document and immutable records. Report the mathematical outcome,
resume outcome, concrete friction and any bounded correction separately from
automated verification. Update the roadmap and handoff only if the observation
changes evidence or authorizes a next increment. Do not infer a broader feature
roadmap from synthetic checks or silently begin later-stage implementation. A
same-session close/reopen can establish restoration, but reduced reconstruction
burden remains pending until a genuinely later continuation occurs.
