# Document navigation

The editor toolbar has one book icon, **MRW Document**, for Markdown, PDF and
text files. Its menu contains Return to Document, Show Backlinks, New Note and Recent Documents. Markdown
also offers Show Contents, Edit Document Source, Open Note in Obsidian and Copy
Note Link for Obsidian. Existing command IDs and Command Palette entries remain. Menu conditions cover
local files and VS Code’s remote-file URIs used by WSL and SSH windows.
Study Current Material is an editor overflow action; Lean's secondary InfoView
action is in overflow beside its primary Study Actions button.

Backlinks search ordinary links in the explicitly selected notes folder. They
open the exact occurrence in the referring note. Cancellation preserves the
previous Return destination. Returning from that note to a PDF reopens the PDF
file, including after restart; MRW does not record its page. A dirty note stays
dirty and is never saved by these actions. File scope and current link text are
checked again before opening a backlink.

**Reopen Document** opens the last document's current text. It restores the
saved Markdown selection when it still matches; a stale position produces a
brief status message and does not block opening. Unsaved text stays unsaved.
This differs from an exact-passage Return, which checks its target before
selecting it. See the [reopen repair](DOCUMENT_REOPEN_REPAIR.md).

Editor menus use the tab that supplied the action, even if another pane has
focus. Show Contents and Edit Document Source refuse a PDF or other non-Markdown
file rather than switching to an unrelated Markdown note. The selected Contents
document remains available through Reveal Contents Document.

MRW delegates PDF rendering to the selected installed reader. It supplies no PDF
text extraction, page bookmarks, PDF annotations or PDF Contents. When the PDF
opens in a system application, use MRW's Command Palette in VS Code for Return
and backlinks; there is no MRW toolbar in the system reader. Open Note in
Obsidian still requires a Markdown note inside the selected notes folder.

## Command grouping review

The [VS Code editor-action guidance](https://code.visualstudio.com/api/ux-guidelines/editor-actions)
asks extensions to keep actions contextual, use one toolbar icon and put
secondary actions in overflow. This increment groups document actions in one
native submenu, supported by the [menu contribution API](https://code.visualstudio.com/api/references/contribution-points#contributesmenus).
It removes the three separate Markdown toolbar icons. New Note opens a
separate note in Obsidian or the Markdown editor; it does not edit the PDF. Proof study and AI requests
are not included in this document menu. The wider sidebar grouping
remains a separate review; this patch does not change saved view placement.

The regression checks use disposable files and a VS Code API facade. They cover
PDF backlink selection, focus changes, cancellation, restart Return, scope
rejection and dirty-buffer preservation. These are command-level checks, not an
observation of the native desktop menu. No connected document session was
available for this increment, and the working window was not reloaded.

<a id="zettels-and-recent-notes"></a>

## Notes while reading

For Obsidian command configuration, see [New Note](OBSIDIAN_WORKFLOW.md#new-note).

**New Note** uses **MRW: Notes Folder** to choose the companion. For a vault,
Obsidian handles the configured command, template and filename. For an ordinary
folder, MRW opens a blank native Markdown editor beside the document. VS Code
owns Save, filename selection, Undo and draft recovery. No title prompt, generated
ID, default text or source link is added by MRW.

**Recent Documents…** is directly available beside Open Document, in Reading
and notes, and in the MRW Document menu. It keeps thirty recently opened files
for this workspace and survives restart. Existing Recent Notes entries remain.
Markdown entries show the YAML title or H1 fallback with the filename; PDFs and
other files show their filename and path. PDF bodies are not read for titles.

Files opened through MRW are recorded. Native Markdown, PDF, text, TeX, Org,
Lean and notebook tabs in the permitted scope are also recorded when active or
saved. A configured notes folder is not required for workspace files or files
already selected explicitly through Open Document. The list does not scan or
import documents, copy their contents, or read Obsidian's recent-file history.

Each row keeps its original path and is checked against current file
authorization before reopening. A recent entry never grants access. Missing,
redirected or out-of-scope files must be selected through Open Document again.
An unrelated current pane does not block the list or acquire a Return pin.
Failed history saves are reported and reopening retries them.

PDFs opened before this increment were not recorded by the old note-only list.
Choose **VS Code file history…** in the same picker, or press **Ctrl+P**, to use
VS Code's native history and search. That picker follows VS Code's settings;
MRW neither reconstructs nor clears it. Reopening a permitted PDF there records
it for later MRW use. The native-history route does not claim a new MRW Return
pin. See [the workflow and checks](RECENT_DOCUMENTS.md).

Returning from a new or recent note preserves the source location where it is
known. A PDF return is file-level. Existing reader annotations and retained
sources are unchanged. These commands also appear in the Command Palette and
the MRW sidebar.

The independent `flengyel/Zettel` specification describes one optional set of
conventions. MRW does not define a note schema or require those conventions.
