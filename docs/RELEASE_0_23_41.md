# MRW 0.23.41 — Responsive notes-folder selection

The native note/source/Return trial found that Choose Notes Folder awaited
an informational notification after saving its setting and folder history.
Leaving the notification open held the command pending and serialized later
folder choices behind it. The controller now completes after saving; notification
dismissal is independent. No selection, history, scope or storage format changed.

Baseline: main `2c879cb3cd2000a59aa8a1f33b04dcff8fb5f1f7`. The focused regression
fails on that controller with a pending notification and passes with the fix.
The wider document checks also pass. Final native, package and delivery results
are recorded below after verification; this preparation is not publication.

## Workflow and verification

- 105 document/picker/link/parser checks passed, including all 64 document
  controller checks. The new regression keeps a notification promise unresolved
  and verifies that two successive folder choices still complete and persist.
- 18 focused extension Return/navigation tests passed. The existing import
  notification checks remain unchanged and pass.
- 16 fixture-isolation checks passed; all 31 exported native entry points reach
  the isolation barrier. Source Return is now an explicitly supported case.
- Three tutorial activation/version checks and production JavaScript syntax pass.
- Windows VS Code 1.146.0 with WSL Debian completed the guarded native trial.
  An ordinary notes folder outside the fixture project was explicitly selected.
  Contents followed a retained copy of the existing bundled sums-of-odd-integers
  example. A reader annotation saved; Return selected its exact citation.
  Unsaved edits outside that citation and an unrelated draft survived navigation.
  Ordinary-note Return and reader Return kept distinct occurrences.
- The same private native state survived a real test-window reload and another
  reopen. The saved source retained its annotation and exact reference, while
  ordinary note/source bytes stayed intact. No study record was created. The
  final native helper and all production JavaScript bytes match the tested copy.

The native dialogs and reader messages were scripted. Editors, Markdown preview,
Python bridge, file scopes and native Memento restart were real. No Obsidian
creation, live-vault mutation, AI call, computation or mathematical checking was
performed. This is a navigation check, not evidence for the proof's correctness.
Full Python/Lean and unrelated companion suites were not repeated for this
one-line controller repair.

Earlier attempts are retained, including a test import typo, premature background
focus/preview actions, cleanup that assumed native Undo had completed, and the
expected extension-host cancellation during reload. Foreground fixture focus,
preview readiness and explicit removal of known fixture edits make the final
trial's actions explicit. No production focus workaround was added merely to
make those attempts pass. The resumed window needed to be brought forward before
native focus-sensitive controls could be exercised.

## Remaining limits

The trial uses an ordinary external notes folder, not the user's Obsidian vault
or its authoring template. Companion creation/attachment trials remain separate.
A non-published retained source still opens an extra exact-text tab beside its
reader; this trial does not replace that fallback display. Independent Open
Saved Source is labelled as opening the selected document, rather than claiming
that a fresh citation was followed.

The working window, genuine notes and retained research were not reloaded or
installed over. Failed disposable trial files and reports remain outside the
project; only their UUID-identified windows are cleaned up. Evidence and command
exit statuses are in `~/.cache/mrw-source-return-20261115/evidence/`.

## Delivery

Package and public-asset verification is recorded here after the A/B build.
The ready source is not itself a published or installed release.
