# Existing documents, Contents and saved sources — 0.23.2

**Problems for Contents Section** connects a heading or link occurrence to saved
problems, independent solution review and named Return. **Problems for Document**
works from the active Markdown preview/editor. See the [learning workflow](DOCUMENT_LEARNING_WORKFLOW.md).

**Open Document…** offers **Original file** (current contents in place) and
**Saved copy** (a retained revision with MRW annotations) in one native picker.
**Browse for another document…** is usable immediately, before folder or saved-copy
loading. The current folder lists filenames and subfolders without descending.
YAML titles, or the first H1, arrive separately; unsaved titles take precedence.
Search by title, filename or path. Select a folder or **Parent folder** to navigate;
**Search subfolders…** explicitly requests a wider, bounded search. Its path,
progress and incomplete results are shown. Failed title/listing work leaves
Browse available. Folder browsing does not change **MRW: Notes Folder** or grant
an indexing scope. Cancellation preserves the current view and drafts.

Saved-copy rows show their title, source/path and retained revision. Discovery
runs independently of ordinary browsing. **Saved copy…** also opens the existing
project-scoped saved-source picker; **MRW: Open Saved Source…** remains in the
Command Palette. Opening an original does not import it; opening a saved copy
does not refresh its source or replace annotations. PDFs use the existing host
reader handoff. Shared backlink and note-ID completeness rules are unchanged.

Ordinary navigation preserves VS Code's layout: MRW does not automatically
maximize, hide either sidebar or minimize other editors. Keep MRW, Codex,
other editor groups and drafts available. This supersedes the older automatic
expanded-reading requirement.

**MRW: Open Document…** displays an existing file in place. Markdown opens in
VS Code's Markdown preview and supplies **Contents**. **Edit Document Source**
opens its source for editing without saving a dirty buffer. **Show Contents**
is available in the persistent **Commands** section to reach the document
navigator. Other formats use their registered host editor. A PDF requires an available PDF
reader. If none is registered, MRW offers **Open with system reader** as an
explicit external handoff; failure is reported locally. It never shows binary
PDF bytes as text or installs a reader. PDF extraction,
PDF Contents, page restoration and bookmarks are not supplied by MRW.

An explicitly selected file may be outside the workspace. **Choose Notes
Folder…** explicitly selects the folder used for note lookup and backlinks;
that folder may also be external, including `/mnt/c/…` in WSL.
The picker updates **MRW: Notes Folder** in workspace settings. That setting
accepts an absolute extension-host path and can also be edited directly. No
folder is inferred from an open note. Configuration is read on explicit navigation;
activation and editor link discovery do not scan the folder. It remains
ordinary document storage, separate from MRW's private saved-work store. Opening
and indexing do not rewrite files, retain a source copy or qualify a private
store. Obsidian is optional.

**Show Contents** selects Markdown for the navigator; it uses the active
Markdown document, the remembered selection or a Markdown picker. **Choose
Document…** chooses Markdown for Contents. Both visibly open or reveal the
selected Markdown in its existing group when available. The Contents header
identifies its filename and full path, including unsaved status; **Reveal
Contents Document** brings it back even with an unrelated editor active.
Cancellation leaves the current document, Contents and drafts unchanged.
These actions are not general file openers. **New Document…** creates a `.md` or `.markdown` file through the host
Save dialog and refuses to overwrite a file. An untitled Markdown document
works for the current session. VS Code owns editing, saving, undo and recovery.

## Note title and Obsidian handoff

The preview header and Contents display the YAML title with the immutable
filename. A repeated filename ID at the start of the title is omitted from its
presentation; the complete property remains in the tooltip. No metadata, note
text or filename is rewritten. Native editor tabs keep their filenames.

**Open in Obsidian** in the preview, or **MRW: Open Note in Obsidian**, opens the
same vault-relative file through Obsidian’s registered URI handler. The selected
notes folder must be its vault root. **MRW: Obsidian Vault** accepts a vault name
or ID; an empty value uses the selected folder name. Under WSL, select the
Windows vault through `/mnt/c/…`. Opening a client application does not copy or
synchronize a separate SSH/Linux file tree.

After explicit MRW navigation, the displayed note is checked while VS Code is
focused. Saved external changes re-resolve a clean file through VS Code’s file
model and refresh its preview, links and Contents. This covers Windows saves
that do not produce WSL file events; it checks one displayed file, not the vault. Dirty VS Code text remains a labelled
draft. MRW never forces a reload, saves it or merges external changes into it.
Obsidian opens the saved file and receives no unsent VS Code text. The CLI is
optional and is not required by this handoff.

## Follow notes and files

1. Open the original note and choose its notes folder. Select a heading in
   Contents to reach its editor position.
2. Click a WikiLink in preview or Ctrl+click it in the source editor (subject
   to VS Code’s configured link modifier). Select an ordinary link in Contents,
   or place the cursor on the link and use
   **Follow Document Link**. Relative Markdown links can open another note, a
   supported heading or another local file such as a PDF. Repeated links retain
   distinct source occurrences.
3. Run **Show Backlinks…** in a destination and choose an incoming occurrence.
   The picker opens the source note at that occurrence. It distinguishes an
   incomplete search from a completed search with no backlinks.
4. Run **Return to Document** to return to the originating note occurrence.
   Opening a backlink also supplies its own usable return location. Ordinary
   note navigation keeps its return pin separate from a saved-reader citation.

ID lookup searches filenames and reads only matching notes. Windows-mounted
folders under WSL use a bounded read-only Windows enumeration to avoid a
filesystem round trip per directory. It passes only relative filenames into
the ordinary resolver, which still checks scope, duplicate IDs and current
matching-note bytes. There is no persistent or stale filename cache. Partial
results remain incomplete; unavailable enumeration falls back to the existing
filesystem scan. Backlink search
reads note text separately and reports partial results when a limit is reached.
The text search admits at most 4,096 notes and 32 MiB; larger searches remain
explicitly partial.
The entry budget counts candidate notes, directories and symlinks; ordinary
non-Markdown attachments do not consume it.

Note lookup excludes `.obsidian`, `.trash`, `.git`, `.lake`, `node_modules`,
`.venv` and `__pycache__` directories. These are not indexed as notes; the scan
limits still apply to the remaining folder.

The chosen folder bounds recursive note lookup; following a link does not index
its ancestors or another folder. `[[ID]]` resolves an exact filename stem in
that folder. Older dotted IDs and index-note IDs are supported. Editable titles
and prose following `[[ID]]` do not change identity. Obsidian display aliases
such as `[[ID|Label]]` show the label while resolving the ID; backlinks retain
the complete original link syntax. Duplicate filename IDs are reported.
YAML `id` and `title` values are metadata; a differing YAML ID does not select
a substitute file or block navigation to its immutable filename. Ordinary Markdown files need not adopt Zettel
metadata. Missing targets and unsupported wiki heading/block selectors or paths
produce local explanations rather than guessed replacements.

Ordinary Markdown heading fragments use the parser's heading anchors, including
duplicate suffixes. Non-Markdown fragments, such as a PDF `#page=…`, are not
silently dropped: use a whole-file link for MRW's file-level opening. Links are
data; executable destinations, templates and embeds are not evaluated. Directory
symlinks do not extend the selected scope. Supported link resolution remains
subject to the explicit local-file boundary checks.

## Backlinks, edits and restart

The selected folder index is rebuilt on explicit operations. Limits are 4,096
Markdown files, 32 MiB total text, 4 MiB per file, 32 directory levels and 20,000
entries. Cancellation, unreadable files and exceeded limits are reported as
incomplete, not as a complete empty result. No database, background sync or
ancestor/vault discovery is created.

Contents and backlinks use open editor text, including unsaved changes; later
explicit scans also see external edits. MRW does not save a dirty buffer while
following a link. Return pins track ordinary edits. An edit overlapping a
captured occurrence blocks return until exact undo restores it. A failed or
superseded asynchronous follow preserves the preceding successful origin.

The chosen notes folder, document and return pin persist in this workspace's
host-local state. **Reopen Document** explicitly reopens the last opened or
followed file after restart; activation does not open it automatically. Use
**Open Document…** for another file, or **Show Contents** for selected Markdown.
**Return to Document** can reopen a matching origin.
A mismatching saved revision or missing file requires an explicit new choice,
without substituting similar text. VS Code separately owns unsaved-buffer
recovery. Cancellation preserves the previous choice and drafts.

## Front matter and Contents

Contents parses CommonMark ATX/Setext headings, ordinary Markdown links and
existing exact MRW references. Code, images and comments are excluded. Leading
YAML between `---` and a closing `---` or `...` is excluded without shifting
original line/character offsets, including BOM and CRLF files. An unclosed
leading block reports malformed front matter and excludes the remainder from
Contents until the delimiter is repaired. Simple `id` and `title` values support
note identity; MRW does not validate arbitrary YAML or rewrite metadata.

Unicode, escaped labels, repeated headings and duplicate references keep their
locations. Contents has a 4 MiB / 10,000-entry limit. One Markdown document is
selected per window. No headings, IDs, filenames or note contents are renamed.

## Retain text only when needed

**Retain Document as Source** keeps a saved UTF-8 text document and its selected
passage. It does not import a PDF. **Open Saved Source…** reopens that retained
revision even after the original changes or disappears. It is visible in the
Commands section and the Contents title toolbar. In the Stacks workspace,
choose **Hausdorff spaces** from the existing saved store; no re-import or
preservation copy is needed. **Refresh Saved Source**
reloads saved state and annotations without acquiring a new original revision.

Use **Insert Source or Passage Link…** in a working Markdown document to insert
an exact saved reference. Following it from Contents opens that saved source;
**Return to Document** restores that citation's originating occurrence and
rendered Markdown view. The reader names **Return to filename** for a citation;
independent saved-source opening instead offers **Open filename** for the
selected Contents document, or **Choose a document…** when none is selected.
Each live reader tracks its own citation occurrence, including nonoverlapping
unsaved edits. No Return saves text or changes surrounding groups/sidebar choices.
The rendered preview opens in the document's group; an unrelated editor remains
visible in its own group.
Existing `mrw-outline:v1` references and record fields
remain unchanged. Copying Markdown does not copy its private saved targets.

The reader's sticky location line shows source collection, chapter/section when
available and qualified identifier. Hashes and storage details stay collapsed.
Hover or Tab-focus reader controls for concise help; Escape dismisses it.
The location and destination remain visible without hovering. Host tree and
title tooltips use VS Code's own help presentation.

Reader annotations use **Save annotation**. Current studies use **Pause / save**
and **Resume Study**; work on a proof uses **Save question**
and **Continue proof work**. Proof Outline still names a mathematical argument.
There is no general research-session restore or automatic argument
reconstruction yet. Links and structural graph checks establish no mathematical
correctness or comprehension status.

The [tutorial](../vscode/media/first-steps.md) teaches this route and displays the
active extension version/build when opened in MRW. Reopening it refreshes that
activation's packaged guide. A newly installed build is not called active before
the window adopts it. Advanced guides remain usable from its virtual URI.
See the [Obsidian guide](OBSIDIAN_WORKFLOW.md) for optional supplied associations.
Earlier [navigation](READING_OUTLINE_VALIDATION.md) and
[terminology](DOCUMENT_TERMINOLOGY_VALIDATION.md) reports retain their original
scope and labels.

## Navigation repair — 0.23.1

A new destination uses the invoking native preview group when no editor for it
is open. An unrelated text editor left visible in another group does not own
that destination. Already-open documents retain their group.

When a note link or backlink is still opening, edits outside its originating
occurrence continue to shift Return. An overlapping edit or closed source
rejects the new origin and retains the previous usable Return destination.
The target may already be visible when the host finishes opening; that does not
commit a changed origin. Select the current occurrence to follow it again.

A backlink picker contains an indexed snapshot. After selection, MRW checks the
current file scope before asking the host to load that path, then verifies the
exact indexed occurrence. A moved or redirected path requires an explicit new
choice. No note, citation, draft or storage format is rewritten.
[Repair checks and limits](DOCUMENT_NAVIGATION_REPAIR.md).
