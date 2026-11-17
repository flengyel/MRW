# Recent notes and documents

Choose **Recent Documents…** beside Open Document. It reopens a recently read
note or PDF without browsing its directory again. The list also appears in
Reading and notes, the MRW Document menu and the Command Palette.

1. Open a Markdown note, then two PDFs.
2. Choose Recent Documents and select the earlier PDF. Its installed reader opens it.
3. Use Return to Document to reopen the PDF from which you made that choice.
4. After restarting this workspace, Recent Documents retains the files. Markdown
   rows show their current YAML title or H1 fallback with the filename ID.

MRW keeps thirty entries in the workspace-state list. Files
opened through MRW are recorded, as are active/saved native reading tabs in
the authorized scope. Binary PDF contents are not decoded for titles. Files,
notes, private source records and dirty buffers stay where they are.

## Native file history

Choose **VS Code file history…**
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
