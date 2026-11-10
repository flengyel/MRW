# Archive, restore and delete Studies

Delivered in [0.23.11](STUDY_LIFECYCLE_VALIDATION.md).

These controls manage saved records in **Studies**, including preserved
records from the removed document Problems interface. They do not manage Lean
lesson directories, proof-outline documents or ordinary notes.

Right-click a study to choose **Archive Study** or **Delete Study…**. The same
commands are available in the Command Palette with a study picker.

- **Archive Study** removes the study from active lists and automatic Resume
  selection. Its drafts, questions, attempts, responses, history, review
  enrollment and due dates remain saved. Reviews are suspended.
- **Show Archived Studies** is available from the Studies title menu and
  Command Palette. Select a study to inspect, restore or delete it.
- **Restore Study** restores an archived study to active use. It creates no
  recall observation and does not change review dates.
- **Delete Study…** shows the scope, then moves the study to Trash. The
  notification offers **Undo**. **Show Deleted Studies** opens Trash later.
  Restoring from Trash returns the study to its previous active or archived
  state. An archived study can then be restored to active use separately.
- **Permanently Delete Study…** works only on Trash. The confirmation identifies
  the study, question revisions, history events and unshared snapshots being
  removed, and shared records being kept. Cancellation leaves it in Trash.

Archived and trashed studies can be inspected without starting an attempt or
review. Their original Return destination remains available where one was
recorded. Opening the same source does not restore them automatically: choose
**Restore saved study** or **Start new study**. After permanent deletion, new
work requires an explicit choice and receives a different identity. An old
study reference cannot open that replacement.

Permanent deletion removes the selected study's private record, drafts,
attempts, responses, scheduling state, history events and unshared snapshots.
Shared questions remain with surviving studies. Mixed history sessions keep
other studies' events; shared snapshots remain available. Source snapshots,
separately attributed source annotations, notes, notebooks, Lean files and
repositories are outside the deletion scope. User exports, backups and external
service copies are also outside it. This is application-level deletion, not a
claim of secure erasure from disks or backups.

## Saving and recovery

The controller completes pending view checkpoints and shared-owner writes
before changing lifecycle state. A failed save blocks the action and keeps the
draft. Archive and Trash do not rewrite mathematical content or scheduling
cards. Stale view messages are rejected after a transition.

The implementation keeps the existing `active-studies-v1` and
`study-history-v1` private workspace stores. Lifecycle markers sit beside study
JSON files. An absent marker means active; no conversion of existing studies is
required. The recent-list cache is rebuilt from saved records, including work
beyond its 30-row display limit.

Permanent deletion first publishes a deletion intent containing opaque IDs and
snapshot digests. Cleanup is serialized with history writes and is idempotent.
If a history-file replacement is interrupted, cleanup uses the complete saved
batch and removes its temporary file after retry. An unreadable batch without a
complete saved counterpart stops deletion rather than discarding other work.
An interrupted deletion stays hidden and reports failure; **Show Deleted
Studies** or reopening the workspace retries it. Completion is reported only
after the selected files, events and unshared snapshots are removed. The final
marker contains only opaque study/source-selection IDs, an epoch and deleted
state. It holds no title, source text, answer or response.

Private JSON publication synchronizes the file and its parent directory. The
existing single-writing-host restriction remains; these controls do not add
multi-host coordination or a study-store transfer mechanism.
