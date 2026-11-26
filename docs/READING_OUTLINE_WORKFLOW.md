# Documents, Contents and saved sources

Open a note or paper with **Open Document…**. Markdown opens in
VS Code's preview, and **Contents** lists its headings and links. The original
file stays in place. Reading, following links and returning require no import
or problem record.

## Find an imported section and its reader notes

Choose **Open Saved Source…** in GOLEM XIV's **Commands** view, next to Open Document.
Search by source title, author or passage title/tag. For example, `Stacks` or
`08ZH` finds a saved Hausdorff-spaces section containing that lemma. The result
shows its reader-note count and retained revision. Open it, then expand
**Reader notes** at the relevant passage. Use **Proofs** to show or hide all
published proofs, or use the control on a single proof. **Add a note** opens
the composer for that passage. Assistance commands follow in the passage's
action row.

This list belongs to the current workspace. A Markdown document that links to
those passages is a separate file: use **Open Document…** for that file. Changing
the notes folder does not relocate saved sources. Opening a saved source does
not import it again, replace its revision or move its annotations.

## Open a document and find Contents

1. Choose **Open Document…** in GOLEM XIV's **Commands** section or the Command Palette.
   Select an **Original file** to read its current contents, or a **Saved copy**
   to open a retained revision with GOLEM XIV annotations.
2. Use **Browse for another document…** to select a file directly. This action
   is available before folder listings or saved copies finish loading.
3. For Markdown, choose **Show Contents** in the Commands section. The Contents
   header names its document and full path, including unsaved status. Select a
   heading or link in that tree to navigate.
4. Use **Edit Document Source** to edit the Markdown. VS Code owns Save, Undo
   and unsaved-buffer recovery.

The picker lists the current folder without descending into subfolders. Choose
one folder at a time, use **Parent folder**, or request a wider search with
**Search subfolders…**. Search matches title, filename or path. Titles from
YAML or the first H1 arrive progressively; unsaved titles take precedence, and
query and selection remain in place. Progress and incomplete results are shown.
Cancelling leaves the current document and drafts unchanged. Browsing does not
change the selected notes folder or its indexing scope.

**Show Contents** uses the active Markdown document, the remembered selection
or a Markdown picker. An active PDF or other non-Markdown file is rejected;
use **Reveal Contents Document** to return to the selected Markdown note. **Choose Document…** selects Markdown specifically for
Contents. **Reveal Contents Document** returns to that document when another
editor is active. While a different file is active, Contents hides the preceding
tree and identifies the active file, with directions for selecting its Markdown
or returning to the selected document.

To start a note from GOLEM XIV, choose **New Note…** from **Reading and notes** or the
document menu. For a configured Obsidian vault, GOLEM XIV brings Obsidian
forward and runs your selected creation command; other notes folders use a blank
VS Code Markdown editor. The current document stays open. See
[note creation and setup](NOTE_COMPANIONS.md). Create other kinds of documents
with their authoring application or VS Code extension, then use **Open Document**.
Untitled Markdown works for the current session. GOLEM XIV keeps the chosen editor groups and sidebars; it does not
maximize reading or hide Codex and other editors automatically.

Other formats use a registered host editor. If no PDF reader is available, GOLEM XIV
offers **Open with system reader**. GOLEM XIV does not install a viewer or display PDF
bytes as text. PDF extraction, PDF Contents, page restoration and bookmarks are
not implemented.

Open the document menu from the editor toolbar’s book icon. **Return to
Document** appears after following a link and returns to its recorded origin.
Use **Reveal Contents Document** to reopen the selected Markdown document
from Contents. **Show Backlinks…** searches the selected notes folder.

Markdown offers **Show Contents** and **Edit Document Source**. The option to copy a
note link is available for a note in the selected folder when the workspace has
an address for the link. **Open Note in Obsidian** appears for notes in
the selected Obsidian vault. PDF Return reopens the file. The PDF reader
controls its page position. Use the Command Palette in VS Code when the PDF
opens in a system reader.

## Note title and Obsidian handoff

The preview header and Contents show the YAML title beside the filename. A
filename ID repeated at the start of the title is omitted from the display;
the complete property remains in the tooltip. Metadata and filenames are not
rewritten, and native editor tabs keep their filenames.

**Open in Obsidian** in the preview, or **Open Note in Obsidian**, opens the
same file through Obsidian's registered URI handler. Select the vault root with
**Choose Notes Folder…**. **Obsidian Vault** accepts an optional vault name
or ID; an empty value uses the selected folder's name. Under WSL, select a
Windows vault through its `/mnt/c/…` path. Both applications must address the
same files; the action does not synchronize a separate Linux or SSH copy.

After explicit GOLEM XIV navigation, the displayed note is checked while VS Code is
focused. Saved external changes refresh a clean document, its preview, links
and Contents, including Windows saves that produce no WSL file event. Dirty
VS Code text remains a labelled draft and is not replaced or merged. Obsidian
receives the saved file, not unsent VS Code text. See the
[Obsidian guide](OBSIDIAN_WORKFLOW.md) for setup and link directions.

## Follow notes and files

Select **Choose Notes Folder…** to select the folder used for note-ID
lookup and backlinks. It may be outside the workspace, including a Windows
folder mounted in WSL. The selection sets `mrw.notesFolder` in workspace
settings; it accepts an absolute extension-host path. Ordinary Markdown requires
neither Obsidian nor special note metadata.

The chooser shows **Current** and **Recent** folders with their full paths.
Select a recent entry to switch directly, or **Browse for notes folder…**.
The ten most recent choices are remembered for this workspace after restart.
Browse starts at the current folder; if it is unavailable, GOLEM XIV tries an available
recent folder, then the workspace or home folder. It does not reuse an unrelated
file dialog's last location. A successful choice reports the selected path.
Cancellation and an unavailable or redirected recent folder leave the selection
unchanged. If the setting is saved but history cannot be saved, GOLEM XIV reports both
facts; selecting that folder again retries the history save.

1. Click a WikiLink in preview, or Ctrl+click it in the source editor, subject
   to VS Code's configured link modifier. For ordinary links, select their
   Contents entry or place the cursor on the link and run **Follow Document Link**.
2. In a destination, run **Show Backlinks…** and choose an incoming occurrence
   to open its source note at that location.
3. Run **Return to Document** to return to the originating occurrence. Opening
   a backlink supplies its own return location. Repeated links remain distinct.

| Link | Destination |
| --- | --- |
| `[[ID]]` or `[[ID|Label]]` | Exact filename stem within the selected notes folder; the alias changes only the display |
| `[[ID#Heading]]` or `[[#Heading]]` | Exact heading in another note or the same note |
| `[[ID#^block-id]]` | Paragraph or list block with that ID |
| `[[folder/ID#Heading]]` | Vault-relative path and heading; `.md` is optional |
| `[[./ID]]` or `[[../ID]]` | Path relative to the source note, still within the selected scope |
| Ordinary Markdown file link | Local file, with supported Markdown heading or block fragments |

Duplicate filename IDs or heading names and missing/duplicate block IDs are
reported rather than guessed. A Markdown heading anchor with a duplicate
suffix can distinguish repeated headings. YAML `id` and `title` values are
metadata; they do not redirect a link to a different filename. Dotted IDs and
index-note IDs are supported.

For a PDF, use a whole-file link: selectors such as `#page=…` are not supported
or silently discarded. Obsidian embeds, executable destinations and templates
are not evaluated. Directory symlinks do not extend the selected scope.

## Backlinks, edits and restart

Lookup is limited to the chosen folder; GOLEM XIV does not discover a vault or scan
ancestors. ID lookup searches filenames and reads matching notes. Backlinks
read note text, including open unsaved buffers. The index is rebuilt on explicit
operations, with these bounds:

| Bound | Limit |
| --- | --- |
| Markdown files | 4,096 |
| Total note text | 32 MiB |
| Individual file | 4 MiB |
| Directory depth | 32 levels |
| Candidate notes, directories and symlinks | 20,000 entries |

Ordinary non-Markdown attachments do not consume that entry budget. Lookup
excludes `.obsidian`, `.trash`, `.git`, `.lake`, `node_modules`, `.venv` and
`__pycache__`. Cancellation, unreadable files and exceeded limits produce
incomplete results, not a claim that no links exist. Windows-mounted folders
use Windows filename enumeration within these limits when available, followed
by the same scope, duplicate-ID and file-content checks. No persistent filename
cache or background synchronization is created.

Following a link does not save a dirty buffer. Return locations follow edits
outside their captured occurrences; an overlapping edit blocks Return until
exact undo restores it. A failed or superseded follow preserves the previous
successful origin.

The notes folder, selected document and return location persist in this
workspace. **Reopen Document** opens the last opened or followed
file. It restores the last Markdown selection when the saved position still
matches. After edits, it opens the current text without applying the obsolete
range and records a fresh position. Dirty buffers remain unsaved. This covers
source-editor selections and followed heading/block locations, not native
preview scrolling. Exact-passage Return still requires its target to match.
Activation does not open a document automatically. Missing or redirected files
still require a new choice; GOLEM XIV does not guess a replacement by title or similar
text. VS Code separately owns unsaved-buffer and window recovery.

## Front matter and Contents

Contents parses CommonMark ATX/Setext headings, Markdown links and exact GOLEM XIV
references. Code, images and comments are excluded. Leading YAML between `---`
and a closing `---` or `...` is omitted without shifting original positions,
including in BOM and CRLF files. An unclosed block is reported and the remainder
is excluded until its delimiter is repaired. GOLEM XIV does not validate arbitrary
YAML or rewrite metadata.

Unicode, escaped labels, repeated headings and duplicate references keep their
locations. Contents accepts up to 4 MiB and 10,000 entries, with one selected
Markdown document per window.

## Retain text only when needed

Under **Sources and references**, use **Retain Document as Source** to keep a
saved UTF-8 text document at an exact revision. If you select text first, GOLEM XIV
keeps that passage and names it from a heading, a result name such as
“Lemma 1”, or its opening words. The status bar confirms the saved passage.
Use **Open Saved Source…** or **Open Document… → Saved copy** to reopen the
saved revision after edits to the original. **Refresh saved source** reloads the
saved reader and its annotations.

In a working Markdown document, choose **Insert Source or Passage Link…**.
The first choice links the recently retained passage from this session when
one is available. Choose a saved source to see its other passages. To edit
the caption in Markdown, change the text between the brackets and keep the
destination in parentheses. Follow the link from Contents or use **Follow
Source or Passage Link at Cursor**. An exact text tab names the source and
marks it as retained. **Return to Document** restores
the exact citation occurrence in the Markdown preview. Each reader keeps its
own return occurrence, including nonoverlapping unsaved edits. An independently
opened saved source offers **Open filename** for the selected Contents document,
or **Choose a document…** when none is selected.

The reader's location line names the source collection, chapter/section when
available, and qualified identifier. Source and storage details stay under
**Source details and tools**. Hover or Tab-focus reader controls for help;
Escape dismisses it. Destination labels remain visible without hovering.
Annotations use **Save** and remain separate from the source text.
To continue one in an ordinary note, use **Link another note…**
beside its saved text. Confirm the selected saved note to link it. The source
annotation and external note remain independently editable; copying is optional.
See [the handoff](OBSIDIAN_WORKFLOW.md#continue-a-reader-annotation).
Copying a Markdown link does not copy its private retained target.
`mrw-outline:v1` references remain valid.

Optional source-study and proof tools have their own
[study](ACTIVE_STUDY_WORKFLOW.md) and [proof](PROOF_STUDY_WORKFLOW.md) guides.
They are not required for ordinary reading. General research-session restoration
and automatic argument reconstruction remain unimplemented.

<a id="navigation-repair--0231"></a>

## Editor placement

A new destination uses the invoking preview group; an already-open document
keeps its group. An unrelated text editor in another group is not
replaced. Note and backlink origins are checked again after asynchronous
opening, and backlink scope is checked before loading. Changed or redirected
occurrences require a new selection.

## Mathematical rendering in ordinary notes

The native Markdown preview applies supported note-local macro definitions
from leading front matter. It does not evaluate arbitrary LaTeX preambles.
A `tikz` fence offers **Render diagram**, using the isolated Linux/WSL compiler
only on an explicit click. Light/dark SVG views are cached outside the note by
exact code. Opening, reopening and theme changes do not compile or rewrite the
note. Exported Quiver curves use the bundled attributed package. Changed code
needs a new render; compiler failures preserve source and earlier views.
See [TikZ rendering](TIKZ_WORKFLOW.md) for requirements and limits.

The [tutorial](../vscode/media/first-steps.md) introduces these actions and names
the active extension build.

## Remove a saved copy from the active list

Open the saved source. Choose **Move to Trash…** under **Source details and
tools**. Save or cancel unsaved reader changes first.
The confirmation moves only that GOLEM XIV saved copy to Trash. Its text, reader notes,
diagrams and links are kept. Original files and vault notes are unchanged.

**Undo** restores it immediately. **Restore saved source from Trash…** in Sources and
references or Open Saved Source restores it after restart. Exact links still
open a copy in Trash read-only, with a Restore button.
See [scope and recovery](SAVED_SOURCE_TRASH.md).
