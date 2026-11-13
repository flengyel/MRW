# Document navigation

The editor toolbar has one book icon, **MRW Document**, for Markdown, PDF and
text files. Its menu contains Return to Document, Show Backlinks, New Note and Recent Notes. Markdown
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

For configuration steps, placeholder details and portable examples, see
[Markdown note templates](MARKDOWN_NOTE_TEMPLATES.md).

**New Note** uses **MRW: Notes Folder**. In an Obsidian vault, it invokes your
configured Obsidian new-note command, leaving the current MRW document open.
Obsidian owns creation and the template; see [setup](OBSIDIAN_WORKFLOW.md#new-note). In an ordinary folder, it opens an unsaved draft beside the document;
Ctrl+S saves it. The default text contains an H1 heading and a source link.
For the ordinary-folder draft, the proposed filename is formed from **MRW: Zettel Prefix** (default `Note`) and local date/time
`YYYYMMDDHHmm`. Occupied names receive a numeric suffix. The source link uses a
relative path. Keep both files in their
relative locations or update that ordinary link after moving one. No PDF page
or exact quotation is inferred. For the Markdown editor path, Save, conflicts,
Undo and draft recovery belong to VS Code. The source and other open drafts are preserved.

**Recent Notes** lists the thirty most recently opened or saved Markdown notes
seen by MRW in this workspace. It shows the YAML title, or H1 fallback, beside
the filename ID. The list survives restart, belongs to its recorded notes root,
and never redirects entries when another folder is selected. Missing or
redirected notes must be selected again through Open Document. Failed history
saves are reported; reopening retries them. Recent Notes does not scan the
vault, copy note content or read Obsidian's recent-file history.

Returning from a new or recent note preserves the source location where it is
known. A PDF return is file-level. Existing reader annotations and retained
sources are unchanged. These commands also appear in the Command Palette and
the MRW sidebar.

**MRW: Zettel Template** is user-configurable Markdown, with literal placeholders
`{{title}}`, `{{titleYaml}}` (a quoted YAML scalar), `{{id}}` (the proposed filename
without `.md`), `{{source}}` (a Markdown link), and `{{cursor}}` (the insertion
position). No template code executes. For example, a user who wants a YAML title
can choose:

```text
---
title: {{titleYaml}}
---
# {{title}}

{{cursor}}

{{source}}
```

This controls only newly created drafts. Existing notes can use any Markdown
layout; YAML fields, matching title/ID conventions, `SEE ALSO` and `Research`
headings are not required. The independent `flengyel/Zettel` specification is one
optional set of conventions, not MRW's note schema or a runtime dependency.
