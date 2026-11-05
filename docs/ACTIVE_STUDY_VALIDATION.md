# Study feedback delivery — 0.19.0

Date: 2026-11-05. Baseline: `923539a` fetched from `origin/main` and fast-forwarded
from clean `098f257`; no ongoing work was discarded. The assignment is
[CODEX_STUDY_FEEDBACK_PROMPT](CODEX_STUDY_FEEDBACK_PROMPT.md). Measurement, UI and
publication review ran in parallel with assigned file ownership before integration.

## Confirmed repairs

The baseline grouped corrections after partitioning releases, recomputed recall
delay using assessment time, and allowed AI/unknown-assistance outcomes to support
less-guidance offers. Focused regressions cover linked cross-release corrections,
deduplicated events, distinct attempt/submission/assessment denominators, selected
exports with supporting context and missing parents, delayed assessment, restart,
multiple submissions, reversed clocks and legacy unknown timing. A further test
found that late assessment could send an earlier time to FSRS after a subsequent
shared-question review; chronological replay now preserves both observations.
Adaptations use reader recall reports with explicit consultation and effort tied
to that attempt. Application and AI evidence stay separate. Reports name selections,
requests, retention and display opportunities without inferring use or benefit.

## Observed feedback interaction

The disposable host-controller session enters a question, submits exact work,
changes the unsent draft, copies a handoff containing both distinctly, pastes
ordinary prose, edits attribution, retains the original and revision, reports an
outcome and begins a linked assisted continuation. It resumes from real checkpoint
files and inspects readable history. Separate cases cover a failed help checkpoint
followed by a further edit/retry without duplicate retention, independently
attempted later recall, pending outcome choices through reveal/reopen, adaptation
request/response links and explicit example loading without replacing research.
The core-backed example entry check retains the actual bundled Markdown through
the existing outline path and reuses an unfinished saved example. An initial test
caught the whole-source reference where a passage was required; it now pins the
retained region. No genuine study is a test fixture.

An isolated headless Chrome session uses the actual integrated renderer/controller,
real checkpoint/history filesystem, the existing parent-masked webview transport,
and an API clipboard fixture. It exercises source → question → submission → pasted
help → attributed retention → linked continuation → outcome → pause/reopen →
readable history. Its 52 events are `developer_fixture`: two attempts, two immutable
submissions and two reader-report fixtures. Pending choices survive answer reveal;
post-submission help leaves the first submission unchanged. The original pasted
AI text and Reader edit remain distinct. Three MathML expressions render, with
zero KaTeX or runtime errors. The browser and API facade are not native VS Code.
The screenshot and session/history artifacts remain outside Git and the VSIX.

One isolated Windows VS Code / WSL development-host launch used a new disposable
profile and project. `Code.exe` exited **255** with empty output before the runner
produced a report. Native study interaction is unvalidated in this run. No further
launch diagnostics, working-window reuse, reload or editor installation repair
was performed.

## Checks and delivery

The focused integrated study/measurement/view/annotation run passes **50 tests**;
the separate core-backed current-material/example entry run passes **2 tests**.
Syntax checking and Python compilation pass. The final broader extension run
passes **206 tests**. The required shared Python suite runs **402 tests**, with
**340 passing and 62 expected skips** (opt-in Qt/native diagrams and unavailable
mounted-project checks). No provider or mathematical-checking gate was invoked.
Storage tests run in a disposable ext4 checkout; an initial temporary-filesystem
run was stopped and superseded. The package is built from committed sources with
a fresh dependency installation; its verified identity is appended below.

## Interaction changes and remaining friction

Removed: external storage of companion explanations, manual association of replies
with attempts, JSON for ordinary help, accidental loss of pending report controls,
and the empty bank's non-working block action. A linked continuation replaces the
need to recreate the question after feedback. The optional example is explicit,
attributed CC0 material with practice history separate from research.

Still manual: copying requests/replies, reviewing attribution, selecting questions,
reporting outcomes/consultation, optional effort and review admission. A pasted
reply is manually associated, not authenticated or mathematically checked. Help
questions and later independent recall remain reader choices. Current-study and
history migration between workspaces/machines remains unsupported. Batched drafts
can lose changes not yet checkpointed on abrupt termination. No learning outcome,
causal release improvement, provider call, compiler or mathematical check is claimed.

[Public readiness](../PUBLIC_READINESS.md) records the exposure review and concrete
rights/disclosure decisions before any publication. Repository visibility remains
private; no release/Marketplace upload or history rewrite is authorized here.

## Verified package and committed build

The final **0.19.0** VSIX was built from clean local checkout `b368e89` after
`npm ci --prefix vscode --ignore-scripts` installed all 127 pinned build packages.
The initial sandboxed install lacked network access; the authorized fresh install
completed. Tools: Node **24.22.1**, npm **11.13.0**, Python **3.13.5**. The documented
root package command ran with `TZ=UTC SOURCE_DATE_EPOCH=1792094267`; its bundled-core
step completed. No source-build checkout modifications were produced.

The verifier checks the production manifest, exact allowed 90-entry archive,
all runtime bytes and pinned renderer/parser/scheduler notices. Development tests,
logs and personal studies/history are excluded. VSCE rewrites relative README
links to the configured repository base URL; installed README bytes match the
package. Package SHA-256:

`18980e01c6976ebec01e6f11017d06d0fff01d8e0f5baa3e6282640f90b11942`

The embedded implementation identity is
`3f1dedf03ae89ec76e71a65e9e2f1ac704fefbc4`. The established WSL extension host
successfully installed it; its production manifest and all **85 runtime files**
match the VSIX, and its extension registry points to 0.19.0. All **50 inventoried
ordinary study, managed-source and private-state files** still match their
starting hashes. The working window was not reloaded, switched or reset.

First action after saving/checkpointing and reloading when convenient:
**F1 → MRW: Open Study Example**. For genuine unfinished work use
**MRW: Resume Study** instead. No native-host acceptance or mathematical/learning
result is inferred from packaging, installation or fixture interactions.

---

# Active study delivery — 0.18.0

Date: 2026-11-05. Implementation baseline: fetched `origin/main` at `560e733`,
fast-forwarded from the clean 0.17.0 checkout. No local commits or study material
were discarded. The task is `CODEX_LIGHT_STUDY_PROMPT.md`; the implemented
interaction and limits are in [ACTIVE_STUDY_WORKFLOW](ACTIVE_STUDY_WORKFLOW.md).

## Observed interaction

The command check begins with a retained reader passage and opens the study
without a question popup. It preserves the old reader, exact scoped source and
existing notes. Separate command checks preserve drafts when deliberately
switching sources, resume after fresh registration, share eligibility only with
explicit matching prerequisite pins, and reject changed source/question history.
Older proof-study preparation/import/question-save cases remain in regression.

An isolated Chrome check uses the actual renderer and host controller with real
filesystem persistence, a real retained 08ZG quotation and scripted reader
reports. It enters a question, explicitly keeps it, submits typed work, reveals
the reference answer afterward, reports an outcome, answers the effort item,
inspects history and pauses. The earlier submission remains unexposed; the later
reveal cannot rewrite it. Reported effort 9/9 with success offers continuation or
pause. The inspector opens without leaving the original study controls disabled.
The final rendering has no KaTeX errors. Browser fixture events are marked
`developer_fixture`, with a separate temporary profile/history directory.

One saved fixture session and its readable history were inspected. They contain
the ordered immutable submission reference, distinct later reveal/outcome/effort,
FSRS mapping, adaptation offer/choice, history opening and pause. The comparison
shows denominators and missing observations. This is scripted interaction
evidence, **not** a learner observation, mathematical assessment, delayed recall
result or learning experiment. No 0.17.0 usage events were generated retroactively.
Personal histories, fixture histories and screenshots are outside Git/VSIX.

A separate native VS Code WSL development-host launch was attempted with its own
Windows profile and disposable project. The Windows executable exited with code
`0xffffffff` before the runner produced a report, including when launched with a
clean child environment. Native interaction is therefore unvalidated in this
run. The user's working window was not reloaded, reused or switched; the editor
installation was not modified to investigate this launch issue. Browser and API
checks are not represented as native-window acceptance.

## Regressions and boundaries

Focused checks cover exact submission snapshots and post-submission exposure;
linked corrections and scheduler replay/idempotence; question/source revisions;
due ordering and new/time/count budgets; no FSRS update on skip, missing report,
AI assessment or application; missing, declined and unsampled effort; high-effort
success and repeated difficulty; offline resumption and explicit prerequisite
membership; recorder failure/buffer recovery; strict duplicate-key/field/source
bounds; native document export, selected versions and overwrite refusal; and
ordinary-prose help handoffs independent of question JSON.

The first broader run found a recorder initialization delay that changed the
existing delayed-picker race, plus a test teardown racing batched history writes.
Recorder initialization now stays off the command's awaited path. Session end
awaits initialization and flush, and command fixtures deactivate before deletion.
The two regressions and the current-source entry check pass after repair.

The final broader extension run passes **179 tests**. Final focused graph/study
checks pass **29 tests**, and the final command-facade check passes **3 tests**.
A final **16-test** study run also covers checkpoint failure feedback, retry
without duplicate questions, and reopening a saved study after its recent-item
locator is lost. A failed checkpoint cannot announce save success; a missing
locator cannot replace an earlier saved study or unfinished attempt.
The affected Python run passes **45 tests** in artifact storage, proof graphs,
editor assistance and question parsing. The final import-message wording check
also passes. Existing immutable publication, genuine retained notes and sources,
unsent requests and proof graph invariants are preserved. No provider call,
compiler, Lean check, cognitive simulator or telemetry endpoint was invoked.

## What changed in the interaction

Removed: the mandatory preliminary question popup on the current-material path;
the command-list tree; the requirement to author a graph for a study question;
manual request assembly for proposed questions; recreation of an unfinished
attempt/question; and external assembly of a local descriptive comparison.

Still manual: question/prerequisite choice, clipboard relay to/from Codex,
reference-answer attribution/correction, reader outcomes, optional effort and
review admission. The source is easy to reopen but remains a separate reader
when expanded there. Legacy proof-study and current-material modes remain
separate editor tabs. Adding prerequisites creates a separate source context;
its earlier unfinished attempt remains in the preceding study. The native tree
shows current/recent content only. The new learning history is local to the
workspace host and is not included in managed source-store moves or cross-machine
handover. The scheduler has default parameters and has not been personalized or
validated for advanced mathematical learning. These are stated limits, not
reasons to fabricate success or delay the implemented interaction for a ceremony.

## Installed package

The verified **0.18.0** package is installed. The production manifest and all
**81 runtime files** match the VSIX. SHA-256:
`eb7ff047a6425ab2d3371715f23e8664293f3e6978e737cc89c74aa0e134820b`.
The package records implementation commit
`876a33dfa2d9eda3089a26d3161bbab370f04c30`.
The 26 ordinary study files and 13 managed-store files match their recorded
baselines after installation. No original source, annotation, graph or workspace
file was replaced. The actual window was not reloaded or switched. Save drafts
and reload when ready; select a retained passage and choose **Study current
material**, or use **MRW: Resume Study** for a saved current-material session.
