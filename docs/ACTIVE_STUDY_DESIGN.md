# Source study and scheduled review

A source study keeps questions, attempts and feedback with the passage they
concern. The reader can enroll individual questions for scheduled review.
[Commands](ACTIVE_STUDY_WORKFLOW.md) · [Research on scheduling and feedback](LEARNING_RESEARCH.md).

Opening or following a document creates no study record. Questions and solutions
can remain in ordinary notes. Research questions need not begin as source-bound
study questions and do not automatically enter spaced review.

## Archive and delete Studies

See the [lifecycle workflow](STUDY_LIFECYCLE.md) for Archive, Restore and deletion.
Retiring a question or archiving a help response does not manage the study.

The implementation uses the existing study store and recorder. It requires no
general PROV service, data-analysis plugin or replacement storage system.

### Actions and states

| Action | Required behavior |
| --- | --- |
| Archive Study | Remove it from active/recent and automatic Resume selection; suspend its review eligibility while preserving drafts, attempts, history, references and scheduler state. |
| Show Archived Studies | List archived studies in the existing view or a native picker; allow inspection, Restore and Delete. |
| Restore Study | Return an archived study to active listings with its identity and saved work intact. Restore prior review enrollment only; do not create a review event or silently change due dates. |
| Delete Study… | After a concise scope confirmation, move it to Trash, hide it from active/archived lists and suspend review. Offer Undo and later Restore. |
| Show Deleted Studies | Open Trash. Restore to the study's previous active/archived state. |
| Permanently Delete Study… | From Trash, explicitly confirm and remove study-owned content and its unshared retained payloads. This is actual deletion, not just hiding or renaming a record. |

Use the existing Command Palette pickers. Archive is
reversible and needs no routine confirmation. Deletion identifies the selected
study and the data affected; cancellation changes nothing. Avoid a new dashboard
or study-registration form. Preserve the current Return destination.

Lifecycle controls apply to saved study records,
including preserved document-linked studies. Lean lesson files and proof-study
documents remain ordinary files; removing a saved study must not delete its
working directory, lesson pack or repository.

### Preservation and deletion boundary

Before a lifecycle transition, finish or safely cancel in-flight operations and
settle pending draft/owner writes using the existing save rules. A failed save
must leave the study available with its draft; do not report success or silently
discard it. Stop timers and reject stale webview messages after the transition
so they cannot recreate deleted content.

Archive and Trash preserve all study data for restoration. Permanent deletion
covers the selected study's questions, attempts, drafts, responses, scheduling
state, study-specific history payloads and unshared snapshots. Show which shared
records remain. Never cascade into source snapshots, separately attributed source
annotations, ordinary notes, notebooks, Lean files or another study.

History sessions and content-addressed snapshots may be shared. Determine
ownership and references before deletion; do not delete an entire mixed-study
session or a shared blob. Reuse the existing persistence primitives for a
recoverable operation and publish completion only when the selected scope has
been removed. An interrupted operation must have a bounded, idempotent recovery
path; no silent partial success.

Keep at most an opaque deleted-target marker needed to prevent resurrection and
explain an old link. It must contain no title, source passage, answer or response.
An old reference reports that its target was deleted; it must never resolve to
different work. User exports, backups and external service copies are outside
this local operation, and the confirmation must say so.

Current studies are identified from their source selections. Revisiting the same
material must not silently restore an archived/trashed study or recreate a
permanently deleted one. Offer explicit Restore where possible or Start New;
a new study after permanent deletion needs a distinct identity.

[W3C PROV](PROVENANCE_DESIGN.md) describes provenance relationships. Content
can remain immutable while retained and still be subject to permanent deletion.

<a id="purpose-and-next-delivery"></a>
<a id="purpose"></a>

## Current material and session behavior

A study starts explicitly from a supported current passage/selection or Resume. The entry action supplies the source context; it does not ask for a deck, subject inventory, confidence declaration or proof graph first.

Use the selected retained reader passage, selected proof claim with its exact citation, active ordinary text selection through the existing capture/retention path, or the resumed study's saved passage. Keep source revision and question revision explicit. If a host cannot supply the selected text, explain that boundary locally; do not guess PDF text or notebook state from a filename.

Within an explicitly opened source study, selecting its material updates context and review eligibility. It does not automatically generate a question, send a provider request, mark successful recall, rewrite an interval or capture other open files. Log the GOLEM XIV navigation event. Focus moving into an answer form, Codex pane or menu must not replace the study source. A deliberate switch of study source preserves the unfinished attempt and updates context for the next task.

Eligible review questions belong to the current source/study or explicitly selected prerequisite passages. Unrelated open tabs and the rest of the workspace are outside this review scope. Shared source identity may establish membership; mathematical prerequisite relationships require an explicit link, not a path-name guess.

## One interaction

1. Open a source or Resume study; retain its position and current question.
2. Present one relevant question. The activity may be definition/hypothesis recall, a missing step, argument reconstruction, or an application/example.
3. Allow a typed or paper-based attempt. Reveal a hint, reference answer or source comparison on request. Keep the source easy to recover; record whether the relevant answer was visible.
4. Record the outcome with its origin. For paper work, one brief reader report suffices. A skipped question is not failed recall.
5. Continue, return to the source, or stop. Preserve unfinished work.

Use the existing exact-context Codex handoff for proposed questions, explanations and hints; make the requested output appropriate to the activity instead of always demanding graph JSON. Support editing or entering a question manually and reuse saved questions offline. Generated answers retain attribution and source links. No new provider integration is required.

Question generation and mathematical feedback remain separate from formal checking. A model's proposed assessment is correctable and must not silently become the reader's recall report or a checked proof.

### Minimal question and attempt records

A saved question needs an application-assigned identity, content revision, activity kind, prompt, reference answer (or explicitly unavailable), optional ordered hints, exact selected source references and author/origin. Keep revision history when editing its mathematical content. The reference answer remains attributed material, not a proof certificate.

Provide a small editable question form and one bounded import path: the existing Codex clipboard exchange may return a versioned object containing at most ten question records with these fields. Reuse exact selected-source binding and strict JSON/code-block parsing; reject unsupported fields or references with local feedback. Do not add a general prose-to-question parser. Imported questions are available for use; only explicitly kept questions enter continuing review. Choose storage compatible with existing study validation, preserving older study files.

At submission, retain the exact answer snapshot or an existing immutable record reference, plus attempt ID and submission sequence. A link to a subsequently mutable note is insufficient. Paper-based attempts may have no answer text and carry an explicit reader report instead. Later answer edits/corrections create linked submissions. Hint, source and answer exposure events retain their order relative to submission: reviewing feedback afterward must not relabel the earlier unaided attempt as assisted.

## Light rescheduling

Separate scheduling from admission and selection:

- The scheduler uses bundled ts-fsrs with default parameters and fuzzing disabled. Each scheduled observation records the scheduler version and parameter identifier.
- A stable question revision and activity type are the scheduling item. A changed answer, substantially different question or changed source requires explicit rebinding/new revision; retain earlier history instead of silently transferring it.
- Eligible due questions come first within the current material. Add new questions only while the current study's admission and time budgets permit. Stable tie-breaking makes selection explainable.
- Initial product defaults: at most **three questions or approximately five minutes** in one light-review block, stopping at an attempt boundary; at most **one new question** in that block. These are adjustable prototype choices, not research-derived optima. Continuing is always possible.
- **Keep for spaced review** enrolls a selected recall question. Saving a question alone does not enroll it.
- Questions outside the current context remain available with their history; they are not obligations displayed as a global overdue queue. Retirement/suspension preserves records. Logs distinguish relevance deferral, budget deferral and retirement.
- Update the scheduler only from an eligible completed recall observation. Record hints and answer visibility separately. Recollection after seeing the answer is not unaided success; skip, interruption, reading and missing assessment do not update recall as failure.
- Keep scheduling outcomes distinguishable from mathematical correctness and effort. Document the adapter's exact mapping (for example, reader-confirmed unaided recall to Good, failed unaided recall including answer-dependent completion to Again). Store the original observation, not only the mapped rating.
- Opening the same material repeatedly does not repeatedly reschedule it. Use timestamps and event identities to make updates idempotent. After a gap, select a short relevant block rather than requiring catch-up first.

If the scheduler is unavailable, attempts and feedback must still be savable.
Distinguish manual revisits from FSRS-scheduled reviews.

<a id="cognitive-load-observations-and-responses"></a>

## Reported effort

A rating records the reader's effort on one attempt. Keep it separate from the outcome, time spent and help used.

Choosing **Report effort** opens the question “How much mental effort did that last attempt require?” on a scale from 1 (very low) to 9 (very high). Record the wording, scale, time of request and attempt ID. Record a rating only when the reader gives one.

Capture hint/answer use, task kind, self-reported or suggested outcome, source visibility and elapsed duration automatically where available. Record pause/focus events so elapsed time is not misrepresented as active thinking. Work done on paper or away from the app remains unobserved unless reported.

Offer temporary concealment of the target answer for a retrieval attempt while preserving the reading position. Visibility records possible exposure, not proof of reading; record a reader's report of consulting the source separately. Do not infer unaided recall from window state.

Initial adaptation rules are conservative, inspectable product policies:

| Observation | Response |
| --- | --- |
| High reported effort plus repeated assisted/unresolved attempts on the current material | Offer one smaller step, pertinent prerequisite, worked example or pause; preserve the original task. |
| High effort with successful reasoning | Preserve the challenge; allow continuation or pause. Do not automatically simplify. |
| Repeated unaided success | Offer less guidance or a changed example; keep recall scheduling separate. |
| Low effort with failure | Offer clarification or a prerequisite. Do not infer disengagement or fatigue. |
| Missing effort rating, long duration or tab switching | No cognitive-load conclusion. Use explicit outcomes and preferences. |
| Repeated import/save/navigation failures | Treat these as interface obstacles, not evidence of poor mathematical understanding. |

If a high-effort threshold is needed initially, 7–9 is a documented provisional rule, not a validated overload boundary. Record the observations used and the reader's acceptance or override. Never change a recall outcome to force a preferred interval.

## Instrumentation for two uses

The [history workflow](USAGE_HISTORY.md) describes configurable storage and
exports. Use one recorder for GOLEM XIV commands and study interactions. Request
subjective input sparingly; keep observed actions, reader reports and estimates
distinct.

### Event envelope and categories

Every event carries an ID, session sequence, UTC timestamp, monotonic duration where relevant, GOLEM XIV version/commit, event-schema version, policy version and scheduler version/parameter identifier. Link study/source/passage/question revisions when applicable. Distinguish production use from developer fixtures and automated tests.

Evidence kinds are observed action, reader report, AI assessment, external-check result and derived estimate. Derived estimates identify their input events and model/version; they never overwrite observations. Corrections link to the earlier event.

Record, where supported:

- study/source open, selection, navigation away/back, graph expansion, source visibility and restored location;
- question offered, begun, skipped, completed, revised, admitted or retired;
- submitted answer or saved-attempt reference, hint/answer reveal, source comparison and outcome/correction;
- effort-rating offer and its disposition (answered, explicitly declined, or no response), linked to the exact attempt; distinguish these from not sampled;
- adaptation candidates, selection reason, relevant observations, offered help, acceptance/override and resulting action;
- deferred review candidates with reasons, scheduled time before/after and mapping to scheduler input;
- command/request/save/import/export start, completion, cancellation, retry, failure and latency;
- session pause/resume/end and unclean termination inferred on next launch, labeled as inference.

Keep exact submitted questions/attempts by immutable snapshot or immutable record reference; avoid repeated copies of complete sources. Record meaningful edits/submissions, not every keystroke. An answer can be absent for paper work. Do not infer failure from absence.

Keep data local by default, outside source repositories and packaged fixtures. Record activity inside GOLEM XIV and explicit source interactions, not unrelated applications. Reuse existing identity and persistence boundaries. Batch writes outside the UI path; a failed recorder reports a gap without blocking reading or losing drafts. Expose Inspect study history, correction and explicit export. Existing personal study logs must never enter Git or a VSIX.

### Immediate use

Select relevant questions within the budget, offer support based on explicit task observations and effort, and preserve the reader's choice. Record enough of each decision to explain why this question/help appeared. Do not tune policies from hidden success assumptions.

### Version-to-version evaluation

Provide a compact local summary/export for selected studies, date ranges and versions:

| Development question | Evidence |
| --- | --- |
| Is recall improving? | Delayed unaided outcomes on unchanged questions, with intervals, assistance and source visibility. |
| Is application improving? | Separately identified new examples/tasks and their outcomes; do not pool with memorized answers. |
| Does work begin and resume more easily? | Actions from opening/resuming to an attempt, navigation detours, preserved position/draft, explicit restart success. |
| Is help useful? | Accepted/overridden adaptations, subsequent attempts, corrections and occasional reader usefulness reports. |
| Is review burdensome? | Time, question admissions/retirements, skips, early stops, deferrals and return after gaps. |
| Is the interface reliable? | Errors, retries, operation latency, failed saves/imports, logging gaps and lost-state reports. |
| Is effort changing? | Task-linked effort ratings with outcome, assistance and missing-rating counts. |

Show denominators, missing observations, task/revision mix and exposure history. A before/after release difference is descriptive: task difficulty, prior practice and elapsed intervals can explain it. No automatic code changes follow from a metric. Use the report to choose the next concrete improvement; later controlled comparisons can test causal hypotheses.

Do not invent missing earlier events or count automated fixtures as usage.
Application to a new example is assessed separately from recall of a memorized
answer.

## VS Code interface

Use the existing Contents and Commands views, contextual actions and Command
Palette. Preserve command IDs, saved placement, keyboard access and native file
lifecycle. No separate study sidebar is required.

Keep the main source and study interaction together without forcing a new layout. Use webviews for mathematics/graphs that need them; use native menus, file lifecycle, selection and settings elsewhere. Keep one pertinent primary editor action and secondary actions in overflow. Support keyboard use, host themes and reduced motion. Load/error feedback stays near the work.

A small history for current material may show “reported effort 7/9; hint used; question unresolved.” Detailed logs and release comparison belong behind Inspect/Export, not in a dashboard that displaces mathematics.
