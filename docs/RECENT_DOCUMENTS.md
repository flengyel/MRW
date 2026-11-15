# Recent notes and documents

Choose **Recent Documents…** beside Open Document. It reopens a recently read
note or PDF without browsing its directory again. The list also appears in
Reading and notes, the MRW Document menu and the Command Palette.

1. Open a Markdown note, then two PDFs.
2. Choose Recent Documents and select the earlier PDF. Its installed reader opens it.
3. Use Return to Document to reopen the PDF from which you made that choice.
4. After restarting this workspace, Recent Documents retains the files. Markdown
   rows show their current YAML title or H1 fallback with the filename ID.

MRW keeps thirty entries in the existing workspace-state list. Existing recent
notes remain; no storage migration or extra registration is required. Files
opened through MRW are recorded, as are active/saved native reading tabs in
the authorized scope. Binary PDF contents are not decoded for titles. Files,
notes, private source records and dirty buffers stay where they are.

## Earlier PDFs and native history

The older Recent Notes list did not record PDFs. Choose **VS Code file history…**
in the picker or press **Ctrl+P** for VS Code's native file picker. It follows
the editor's history settings and may include files MRW has not recorded. Opening
a permitted PDF there makes it available to MRW's list. MRW does not inspect or
rewrite VS Code's history database, import files or infer a new Return location
from that native selection.

See [VS Code Quick Open](https://code.visualstudio.com/docs/editing/getting-started/tips-and-tricks#_quick-open).

## File checks and Return

A row records a location, not permission to read arbitrary files. MRW checks
current authorization and the original canonical path when opening it. A moved,
missing, redirected or no-longer-authorized file stays unavailable until selected
again through Open Document. A notes folder is unnecessary for workspace files
or explicitly selected files. An unapproved current pane does not block the list
or become an authorized Return target.

Selecting an MRW row preserves the current Return destination where known.
PDF Return reopens the file; it does not restore a page. Opening from the list
does not save or discard an unrelated dirty note. Failed recent-list writes are
reported; retrying an open retries metadata publication.

## Verification and citation observation — 14 November 2026

Focused disposable-file tests cover two PDFs, text files, restart, title refresh,
dirty notes, cancellation, failed saves/retry, authorization removal and a path
redirect during opening. Native acceptance used two generated PDFs through
LaTeX Workshop in an isolated VS Code 1.146.0 WSL window. The Recent Documents
picker reopened the earlier PDF, Return reopened the other PDF, and the unsaved
Markdown draft remained unsaved. A private UI Automation capture attempt hit an
output-decoding error; native command checks completed independently. The final
release account records the package and exact checks. That full native pass
preceded the final optional-origin guard, which is covered by component tests.
Later native UI rechecks encountered launcher/selection coordination failures;
complete final-candidate native picker acceptance is not claimed.

The separate missing-citation report was checked using the real Number Fields
note read-only. Installed 0.23.35's lookup returned (Marcus 2018). A fresh native
preview, with zero manual renderer calls, visibly displayed the same citation.
Formatting is asynchronous: a raw key may be visible before lookup completes.
The source hash before/after was
`fd9db8897fb1d828e03b9d3a3c37e69ec4dc2b673c74671a36950082aad4530e`.
The captured image showed the formatted citation; an earlier accessibility-text
sample still contained the raw key. Screenshots remain private outside Git.
Citation runtime, Pandoc export behavior and bibliography choices are unchanged
by this increment. **Refresh Citation Preview** remains available from the MRW
Document menu or Tools and setup.
