# Study current material — 0.19.1

Select a passage in the retained reader and choose **Study current material**.
A graph claim with a retained citation has **Study this claim**. For an ordinary
saved text, Markdown or TeX file, select text and run **MRW: Study Current
Material**; MRW uses its existing exact retention path. Unsaved source changes,
PDF extraction and notebook state are outside that path. An explicit saved
editor selection takes precedence over a previously remembered reader passage.
The selection is captured before asynchronous work; ordinary focus changes leave
the study's source fixed.

The study opens without a question popup, subject questionnaire or graph.
**Enter a question** creates a definition, hypothesis, missing-step, argument or
application task. A reference answer is optional. Identify the question and
answer authors/origins. Hints and exact source references are editable in the
form. Editing creates a new revision with fresh review state; earlier questions
and observations remain in history. **Add prerequisites…** explicitly expands
the selected source set into a separate saved context; the preceding context
keeps unfinished work. No unrelated open tabs enter that set.

Alternatively, **Request questions from Codex** copies the exact selected
text, source revisions and one bounded question-object example. Paste it into
Codex, then copy the complete returned object and **Import questions from
clipboard**. At most ten questions, four hints per question and 256 KiB are
accepted. Unknown fields, duplicate JSON keys, changed source entries and
unselected references are rejected. Imported questions are available offline.
**Copy help request for Codex** requests ordinary explanatory prose; graph JSON is not
required. Clipboard transfer remains explicit. MRW invokes no provider or
compiler in these actions.

## Attempts and continuation

An empty study shows its source and **Enter a question** / **Request questions
from Codex**. Once questions are available, choose **Begin short block**, or
deliberately choose **Attempt** on a question.
Type work or select **Worked on paper**, then **Submit answer**. Every submission
has an immutable snapshot and sequence. Submitting again links another snapshot.
Hints, reference-answer reveals and source exposure keep their event order.
Revealing an answer after submission cannot alter the earlier snapshot.

Report **Unaided success**, **Completed with help**, **Unresolved** or **Not
assessed** and whether the source was consulted before that submission. Unrecorded outcome and consultation choices are checkpointed by attempt ID
through rerenders and pause/reopen; they are never submitted automatically. This
is a reader report, not a mathematical check. Unknown consultation stays unknown.
**Correct outcome** links a correction rather than rewriting an earlier event.
Reference answers retain their attribution. AI proposal format/source validation
does not check their mathematical validity. External checking remains in the
existing checked-record workflow.

The selected source is visible for orientation before an attempt. Starting recall
conceals the source and reference answer inside the study. Revealing them records
possible exposure, not that they were read. Concealing them again does not erase
that attempt’s exposure; prior study does not permanently exclude later recall. The reader/graph can remain available elsewhere.
MRW does not monitor other applications or infer consultation from tab focus.
Report consultation explicitly. Switching to Codex leaves the study context
fixed. A deliberate source change saves the earlier attempt with its source.

**Pause / save** checkpoints the attempt and form. **MRW: Resume Study**, or a
study row in **Studies**, restores the question and draft. Draft checkpoints are
batched separately for each study; Pause/save, close and shutdown flush dirty
studies rather than just the active one. Messages carry study, attempt and draft
identities; valid delayed drafts stay with their source, and stale or unknown
identities are rejected before mutation. Abrupt termination can still lose
characters not yet checkpointed. A failed question save retains the draft;
failed cancellation restores a checkpointed form. Native
VS Code ordinary files, reader annotation drafts, earlier `.mrw-study.json`
files and proof graphs retain their existing owners. The earlier proof-study
view offers **Questions and attempts** to use its selected passages here.

## Retain companion help

**Copy help request for Codex** includes the exact selected source text and
revisions, question/attempt identity, current unsent draft, and the latest
immutable submission with its snapshot reference and exact text when available.
The draft and submitted work are labeled separately. The outgoing request has
its own retained snapshot. Copying proves a request, not consultation or benefit.

Copy the reply from the companion, then **Paste companion response…**. Review
ordinary mathematical prose and equations, correct attribution when needed and
**Retain response**. No graph/question JSON is required. The pasted original is
preserved; text edits default to Reader attribution, and **Edit response** creates
a separately identifiable revision. Successive replies do not overwrite earlier
ones. Request, attempt, source signatures and any originating adaptation choice
remain associated. With one request, association is automatic. With multiple
requests for the attempt, choose the request/purpose or leave the reply
unassociated; recency does not decide. An edited association creates an attributed
revision retaining the original text and earlier association. Pending response
drafts must be retained or discarded before Paste/Edit opens another response,
even when the pending text is empty. Manual association does not authenticate
the reply’s origin.

Retained help appears beside the work and returns on Resume. Response drafts
remain editable after a failed checkpoint. Up to 64 responses/revisions and 200
help requests fit one study; replies are limited to 64 KiB. Pasted preview,
retention and reveal opportunities have separate events. Previewing help before
submission marks that submission as exposed, including an immediate assisted
revision. Receiving help afterward does not relabel the earlier submission.
External consultation remains the reader’s report, possibly unknown.

Before an outcome, **Submit revised work** adds a new immutable submission to
the same attempt. After an outcome or skip, **Continue with revised work** starts
an explicitly linked new attempt and preserves the earlier work/outcome. That
immediate continuation is assisted; a deliberately new independent recall attempt
conceals earlier help and starts fresh exposure tracking. **Next question** also
starts independently. Submit or Pause alone leaves the current attempt unfinished;
record an outcome or skip before switching questions.

**MRW: Open Study Example** explicitly retains the bundled original Markdown
example and opens two attributed questions through these same mechanisms. Its
history is marked `practice_demo` in normal use, separately from production
research and developer fixtures. Existing work is checkpointed and preserved.

## Review and effort

**Keep for review** is explicit. Imported/saved questions do not automatically
become continuing work. **Retire** preserves records. Due questions from the
selected sources come first. A matching exact prerequisite pin can reuse a
question from another recent study; different question/source revisions do not
inherit history. Current/recent studies are bounded to 30 locators, and question
revisions to 200 per study. This is not a corpus-wide review index.

Default blocks stop after three questions or approximately five minutes, at an
attempt boundary, and admit at most one new question to the block. Newly kept
questions also count as new. Settings `mrw.studyQuestions`, `mrw.studyMinutes`
and `mrw.studyNewQuestions` adjust these prototype limits. Explicit **Attempt**
selection records a reader override; **Start another block** continues without
a forced catch-up queue. The scheduler never interrupts a live answer.

The extension now requires VS Code 1.95+ for its Node 20+ host runtime
([Microsoft runtime release notes](https://code.visualstudio.com/updates/v1_95#_electron-32-update)).
The versioned adapter bundles maintained **ts-fsrs 5.4.2** (MIT), its default
parameters and retention, with fuzz disabled for deterministic decisions:
`ts-fsrs/5.4.2:defaults:no-fuzz:adapter-2`. Nothing is fitted from these sessions.
Reader-confirmed unaided recall maps to **Good**. Explicit unresolved or
help-dependent recall maps to **Again**, with the original observation retained.
Only kept, current recall revisions with an explicit consultation report qualify.
Opening, rereading, skips, interruption, missing assessment, AI assessment and
application tasks do not update recall. Each attempt maps once. A correction
replays the unchanged question's observations and replaces its mapped review,
without adding a second review. Retired questions still reconstruct their
historical reviews after corrections, while staying excluded from selection
until Keep for review. Reviews use the original submission time; late
assessments replay subsequent observations chronologically. Experienced delay is
pinned to each submission and its preceding eligible review, never the correction
clock. Earlier records without that evidence report unknown. Learning intervals are FSRS estimates, not
mathematical understanding or mental effort. The pinned implementation and
license hashes are checked during package verification.

At a block boundary, or through **Report effort**, the last completed attempt
can receive the optional 1–9 item “How much mental effort did that last attempt
require?” Missing, declined and not sampled are distinct. High effort (prototype
threshold 7–9) with repeated difficulty can offer a smaller step, prerequisite,
worked example or pause. High effort with success preserves the challenge.
Missing ratings, long duration and focus changes imply no load diagnosis.
Help proposals use the same explicit Codex clipboard handoff. Offers require reader-confirmed recall evidence and effort linked to that
particular attempt. Correcting an outcome withdraws or replaces any unsupported
outstanding offer using that attempt's original effort response; the earlier
offer and withdrawal remain events. Obsolete offer choices are rejected.
AI assessments, application work and unknown consultation
are kept separate. Offers and choices record their evidence; they do not change recall outcomes to force an interval.

## History and export

**Studies** replaces the Research Tools command list using the same movable view
ID. It contains recent studies, their exact source rows and questions. Its book
action studies current material; Resume, Inspect, Export and source operations
are in **…**. All earlier command IDs remain in the Command Palette. Source and
question rows open that content; there is no new full source explorer.

One recorder instruments MRW command/dialog and reader/graph/study boundaries.
It records navigation, question/review decisions, submissions, exposure, effort,
adaptations, operations, cancellation, error, elapsed operation latency and
resumption. It does not record unrelated editor/application actions or keystrokes
as history. Draft checkpoint messages are not interaction events. Focus-away
intervals are observations, never active-thinking time or cognitive-load scores.

Every event has schema, session/sequence, event ID, UTC and monotonic times,
software commit/version, policy, scheduler, origin and available study/source/
question/attempt identity. Observed actions, reader reports, AI assessments and
derived estimates remain distinct. Source-navigation events before a study
retain the available source identity. No earlier 0.17.0 events are fabricated.

Personal state is local to VS Code's private workspace storage:
`active-studies-v1/` holds bounded study checkpoints; `study-history-v1/` holds
batched event files and content-addressed immutable submission/question snapshots.
Neither directory is Git content, a VSIX resource, a telemetry service, or part
of managed retained-source migration. Workspace rename/machine transfer of this
new learning history is not implemented; earlier retained-source move guarantees
are unchanged. The active study and recorder use one local writer per workspace.
Recorder failure exposes a history gap in the study/status bar, buffers events,
and keeps reading and live drafts usable. A failed study checkpoint is reported;
keep the view open or copy the draft. A successful checkpoint uses atomic file
replacement, with the latest completed checkpoint available on restart.

Snapshot publication writes and synchronizes a complete operation-owned temporary
file before linking its immutable digest name without overwrite. Partial-write
failure leaves buffered events retryable; cleanup removes only the owned inode.
Existing mismatched snapshots and unrecognized files remain intact and keep the
history gap visible. A retry can record later events after successful recovery.

A shared question may belong to another recent study. Before updating that
owner, the active checkpoint retains the outcome and a bounded `pendingOwners`
intent: owner/question/revision, preceding digest and exact derived question
state. This checkpoint is authoritative for recovery. Retry, dirty flush and
restart reconcile unchanged or already-applied owner state idempotently, then
clear the intent. A conflicting owner checkpoint is preserved and reported;
MRW does not overwrite it or invent another review. This is a single-writer
workspace recovery boundary, not synchronization or a general transaction store.
Event history remains separately buffered and may report a gap.

**Inspect history** displays the current study's readable summary and latest
100 events. **Export history…** selects recorded sessions (with dates/versions)
and exports either a readable comparison or events plus submitted/request/help
snapshots. Linked context outside the selected sessions is labeled supporting;
unrelated sessions/studies are not added. Missing context is reported and
unsupported derived values are excluded.
Exports use native document creation/save and refuse overwrites. Only explicit
export writes personal history outside private storage.

The report includes denominators, missing outcomes/ratings, separately identified
application tasks, delayed recall (at least one day), help/exposure, navigation,
pauses/resumption, errors, operation latency and review admission/deferral/
retirement. Comparisons across versions are descriptive: task mix, exposure and
elapsed intervals differ. Test fixtures carry a separate origin and are never
presented as user observations. No learning benefit is inferred from test counts.

Corrections resolve across releases before comparison. An attempt and its
submission revisions belong to the release where that attempt occurred;
assessment/correction dates and versions are listed separately. Attempt,
submission-revision and assessment denominators are distinct and event IDs are
deduplicated. Adaptation selections, copied requests, retained replies and display
opportunities are named separately; none establishes help use or benefit.

Effort offers and responses resolve globally by task and offer IDs before release
or selected-session grouping. The observation belongs to the original task;
response UTC/version are listed separately. Supporting-only earlier tasks resolve
links without adding selected attempts, assessments or unsampled-effort counts.
Missing links remain unknown rather than becoming a numerical sample.
