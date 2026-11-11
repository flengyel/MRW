# Optional source study

Use these tools when a selected passage would benefit from recorded attempts,
companion explanations or scheduled recall. They are separate from ordinary
[document reading](READING_OUTLINE_WORKFLOW.md): opening a note or following a
link creates no study. Questions and solutions can remain in their existing
notes. The document Problems interface was removed in 0.23.3; earlier saved work
remains readable without its forms. See the
[preservation checks](DOCUMENT_PROBLEMS_REMOVAL.md).

To start, select a saved passage and run **MRW: Study Current Material**, or choose
**Study current material** in the retained reader. A graph claim with a retained
citation also offers **Study this claim**. Saved text, Markdown and TeX selections
are supported; unsaved source changes, PDF extraction and notebook state are
outside this path. An explicit editor selection takes precedence over the last
reader passage. Switching tabs afterward does not change the selected source.

**Enter a question** creates a question about a definition, hypothesis, missing
step, argument or application. A reference answer and hints are optional. Record
the authors/origins of the question and answer. Editing creates a new revision
with fresh review state while preserving earlier questions and observations.
**Add prerequisites…** creates a separate context with the additional selected
passages; it preserves unfinished work in the preceding context and includes no
unrelated tabs.

Alternatively, **Request questions from Codex** copies the selected text, source
revisions and a question-object example. Paste it into Codex, then copy the
complete returned object and choose **Import questions from clipboard**. Imports
accept at most ten questions, four hints per question and 256 KiB. Changed source
entries, unselected references, duplicate JSON keys and unknown fields are
rejected. Imported questions remain available offline. These clipboard actions
make no provider request and run no compiler.

## Attempts and continuation

Choose **Begin short block** or **Attempt** on a question. Type the work, or select
**Worked on paper**, then **Submit answer**. Each submission preserves an
immutable snapshot. **Submit revised work** adds another snapshot to the same
unfinished attempt.

Report **Unaided success**, **Completed with help**, **Unresolved** or **Not
assessed**, and whether the source was consulted before submission. These are
reader reports, not mathematical checks. **Correct outcome** preserves the earlier
report and records its correction. Unsubmitted report choices survive pause and
reopen; they are never submitted automatically.

Starting recall conceals the source and reference answer inside the study.
Revealing either records possible exposure, without claiming that it was read.
Later exposure does not change an earlier submission. The source may still be
visible in another pane or application: MRW does not monitor those applications
or infer consultation from tab focus. Report consultation explicitly.

**Pause / save** saves the current work. **MRW: Resume Study**, or its row in
**Studies**, restores the question and draft. After recording an outcome or
skipping, **Continue with revised work** starts a linked, assisted attempt;
**Next question** starts independently. Submission or Pause alone does not finish
an attempt. Finish or skip it before switching questions.

Drafts are checkpointed separately for each study. Pause/save, close and shutdown
flush pending drafts; abrupt termination can lose text not yet checkpointed.
Failed saves retain the draft and report the error. Ordinary files, reader
annotations and proof-study files keep their separate save/recovery behavior.
The [proof-study view](PROOF_STUDY_WORKFLOW.md) offers **Questions and attempts**
for its selected passages.

## Retain companion help

**Copy help request for Codex** copies the selected source text and revisions,
question, current draft and latest submitted work. Draft and submitted text are
labeled separately, and the outgoing request is retained. This action requests
ordinary explanatory prose; no graph JSON is required.

After copying a reply, choose **Paste companion response…**, review the prose and
attribution, then **Retain response**. The pasted original is preserved. Edited
text defaults to Reader attribution; **Edit response** creates a new revision.
Retained help appears beside the work and returns on Resume.

A reply is associated automatically when the attempt has one request. With
multiple requests, choose the corresponding request or leave the reply
unassociated. Changing an association preserves its earlier version. Attribution
and association are supplied by the reader; neither authenticates the reply.
Save or discard a pending response draft before opening another response, even
if the pending text is empty. A failed checkpoint leaves that draft editable.

A study accepts up to 64 responses/revisions and 200 help requests; replies are
limited to 64 KiB. Previewing or revealing help before submission marks possible
exposure for that submission. Receiving help afterward does not relabel earlier
work. Copying a request or retaining a reply does not establish that help was used
or that it was useful.

For an offline example, **MRW: Open Study Example** opens original attributed
text and two questions. Its history is labeled `practice_demo`, separately from
research use and automated fixtures. Existing work is preserved.

## Review and effort

**Keep for spaced review** enrolls a question. Creating or importing one does not.
**Retire** removes it from review while preserving its records. Due questions
from the selected sources come first. A matching exact prerequisite can reuse a
question from another recent study; different question or source revisions do
not inherit its review history. The current index covers up to 30 recent studies
and 200 question revisions per study, not an entire corpus.

Blocks default to three questions, about five minutes and at most one new
question. Adjust these limits with `mrw.studyQuestions`, `mrw.studyMinutes` and
`mrw.studyNewQuestions`. A block stops at an attempt boundary, never during an
answer. **Attempt** permits a direct choice, and **Start another block** continues
without a compulsory catch-up queue.

Scheduling uses bundled ts-fsrs 5.4.2 with default parameters and retention, and
with fuzz disabled (`ts-fsrs/5.4.2:defaults:no-fuzz:adapter-2`). It fits no model
from these sessions. Reader-confirmed unaided recall maps to **Good**; unresolved
or help-dependent recall maps to **Again**. Only current, enrolled recall
questions with an explicit consultation report qualify. Opening, rereading,
skipping, interruption, missing assessment, AI assessment and application work
do not update recall.

A correction recalculates the affected reviews using their original submission
times; it does not add a second review. Retired questions stay out of selection.
Missing earlier timing evidence remains unknown. The resulting intervals are
scheduling estimates, not measures of mathematical understanding or mental effort.

At a block boundary, or through **Report effort**, an optional 1–9 rating asks:
“How much mental effort did that last attempt require?” Missing, declined and
unsampled ratings remain distinct. High reported effort (7–9) with repeated
difficulty can offer a smaller step, prerequisite, worked example or pause.
High effort with success preserves the challenge. Offers require reader-confirmed
recall evidence and effort linked to that attempt. Correcting the outcome
withdraws or replaces unsupported offers while preserving their earlier records.

Long duration, focus changes and missing ratings produce no cognitive-load
diagnosis. AI assessments, application work and unknown consultation remain
separate. Help offers use the explicit Codex clipboard handoff and do not change
reported outcomes to force a review interval.

## History and export

**Studies** contains recent studies, sources and questions. Its **…** menu and
the Command Palette provide Resume, Inspect, Export and source operations.

MRW records its navigation, submissions, question/review decisions, exposure,
effort reports, help offers, cancellations, errors, operation times and
resumption. Records include available source/question/attempt identity and
software versions. It does not record unrelated application activity or
keystrokes as history. Focus-away intervals are not active-thinking time.
Observed actions, reader reports, AI assessments and derived estimates remain
distinct.

Study checkpoints live in `active-studies-v1/` and events and immutable snapshots
in `study-history-v1/`, within private VS Code workspace storage. They are not
repository files or package resources. Managed saved-source moves do not transfer
this state, and cross-machine or renamed-workspace migration is not implemented.
Keep the original workspace storage when continuing work. One local writer per
workspace is supported.

**Configure History…** can now connect a separate data directory, a vault
subdirectory (preferably `<vault>/MRW/`) or the vault root. It imports and verifies
private history before changing the connection. Original files remain. Only
`History/` is managed. Existing Syncthing/SyncTrayzor handles synchronization.
Read the [shared-history workflow](USAGE_HISTORY.md) for offline recovery,
conflicts, deletion and the recording switch. The published 0.23.12 package does
not contain this increment. Active checkpoints and scheduling remain private.

A recorder failure displays a history gap and buffers events while keeping
reading and drafts usable. A failed study checkpoint is reported separately;
keep the view open or copy the draft. Recovery preserves conflicting stored
work rather than overwriting it. The [design](ACTIVE_STUDY_DESIGN.md) and
[validation report](ACTIVE_STUDY_VALIDATION.md) describe persistence and recovery
in detail.

**Inspect history** shows usage and study reports plus a sample of up to 100 events in session/sequence order.
**Export history…** selects recorded sessions and creates a readable comparison
or a JSON export with linked submission, request and help snapshots. Supporting
context outside the selection is labeled; unrelated sessions are excluded, and
missing context is reported. Exports use native document creation/save and refuse
overwrites. Export and an explicitly connected history directory can write personal history outside private storage.

Reports distinguish attempts, submitted revisions and assessments, with their
missing values and denominators. They include delayed recall of at least one
day, help/exposure, navigation, pauses, errors, operation times and review
choices. Corrections and later effort responses remain linked to the original
attempt, with their own dates and software versions recorded separately.
Supporting context does not add extra attempts to the selected sample.

Comparisons across releases are descriptive: tasks, exposure and elapsed intervals
may differ. Automated fixtures remain separate from reader observations. Neither
test counts nor these reports establish a learning benefit.

## Manage saved studies

Use the native study row menu for **Archive Study** or **Delete Study…**.
[Archive, Restore, Trash, Undo and permanent deletion](STUDY_LIFECYCLE.md)
manage optional saved work without deleting ordinary documents or shared sources.
