# Reopen Document after edits — 14 November 2026

The working-window log recorded two failed Reopen Document operations in
0.23.33. The message was “The exact document location changed.” Reopen had
applied the same whole-document revision requirement as exact-passage Return.
An edit made while the file was closed, or an edit overlapping its saved
selection, could therefore prevent ordinary reopening.

Reopen now opens the current file. If the saved position still matches, MRW
restores it. Otherwise it leaves positioning to the native editor, displays a
brief status message and persists a fresh position. It neither searches for
similar text nor applies an obsolete range. Dirty buffers stay unsaved.
The source note, exact Return pin, file authorization and scope checks are
preserved. Missing or redirected files still fail explicitly.

Exact-passage Return, backlink selection and heading-target navigation keep
their revision checks. A failed exact return no longer tells the reader to
restore old text: open the current document and select the intended occurrence.
No saved-data format, source revision or command ID changed.

Focused regressions first reproduced both the external-edit and dirty-buffer
failures, then passed with the repair. Existing document/navigation checks cover
matching selection restart, exact Return rejection/undo, file scope, redirects,
cancellation and late opens. One older test encoded refusal of changed-file
Reopen; its expectation now checks current-file opening without an obsolete
selection. Two menu-test failures were reproduced on unchanged main: their
predicate helper omitted the existing citation command's equality condition.
Only those test assertions were corrected; menu behavior is unchanged.

The release report records the final native-window observation, exact source
commits, package checks, dependency audit and published download verification.
Private fixture evidence stays outside the repository. The working window and
real notes are not used for mutation tests or reloaded during delivery.

For an older installed build, Open Document remains a way to reopen the file
without relying on its saved position. The fix takes effect after installing
the new core VSIX and reloading when unfinished work is safe.
