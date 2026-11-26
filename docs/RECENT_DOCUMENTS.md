# Recent notes and documents

Choose **Recent Documents…** beside Open Document. It reopens a recently read
note or PDF without browsing its directory again. The list also appears in
Reading and notes, the document menu and the Command Palette.

1. Open a Markdown note through GOLEM XIV. In **Edit Document Source**, select the
   sentence where you left off, then open a related note or paper.
2. Choose **Recent Documents…**. Find the earlier note by its title, filename
   or the excerpt from your selection.
3. Reopen it. GOLEM XIV restores a matching selection in the Markdown editor.
   **Return to Document** recovers the document you came from.
4. Restart VS Code in the same workspace. The earlier note and its saved
   selection are available again if the text still matches.

GOLEM XIV keeps thirty entries in workspace state. It records files opened through
GOLEM XIV and active or saved native reading tabs in the authorized scope. A saved
Markdown position contains a revision and offsets. The picker reads the
excerpt from the live buffer or a verified complete read within the 64 KiB
title-read limit. A change to the text can leave only the title and path.
Opening then shows the current document and reports that the saved position
is unavailable. The Markdown preview opens normally. Preview scrolling and
PDF page positions belong to their viewers.

The picker uses the current YAML title or H1 fallback with the filename ID.
Binary PDF contents are not decoded for titles. Files, notes, private source
records and dirty buffers stay where they are.

## Native file history

Choose **VS Code file history…**
in the picker or press **Ctrl+P** for VS Code's native file picker. It follows
the editor's history settings and may include files GOLEM XIV has not recorded. Opening
a permitted PDF there makes it available to GOLEM XIV's list. GOLEM XIV does not inspect or
rewrite VS Code's history database, import files or infer a new Return location
from that native selection.

See [VS Code Quick Open](https://code.visualstudio.com/docs/editing/getting-started/tips-and-tricks#_quick-open).

## File checks and Return

A row records a location, not permission to read arbitrary files. GOLEM XIV checks
current authorization and the original canonical path when opening it. A moved,
missing, redirected or no-longer-authorized file stays unavailable until selected
again through Open Document. A notes folder is unnecessary for workspace files
or explicitly selected files. An unapproved current pane does not block the list
or become an authorized Return target.

Selecting a GOLEM XIV row preserves the current Return destination where known.
PDF Return reopens the file; it does not restore a page. Opening from the list
does not save or discard an unrelated dirty note. Failed recent-list writes are
reported; retrying an open retries metadata publication.
