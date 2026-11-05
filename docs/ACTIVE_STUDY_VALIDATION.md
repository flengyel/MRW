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
