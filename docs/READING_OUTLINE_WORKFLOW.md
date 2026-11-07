# Existing documents, Contents and saved sources — 0.20.0

**MRW: Open Document…** displays an existing file in place. Markdown opens in
VS Code's editor and supplies **Contents** without hiding the document. Other
formats use their registered host editor. A PDF requires an available PDF
reader. If none is registered, MRW offers **Open with system reader** as an
explicit external handoff; failure is reported locally. It never shows binary
PDF bytes as text or installs a reader. PDF extraction,
PDF Contents, page restoration and bookmarks are not supplied by MRW.

An explicitly selected file may be outside the workspace. **Choose Notes
Folder…** explicitly selects the folder used for note lookup and backlinks;
that folder may also be external, including `/mnt/c/…` in WSL. It remains
ordinary document storage, separate from MRW's private saved-work store. Opening
and indexing do not rewrite files, retain a source copy or qualify a private
store. Obsidian is optional.

**Show Contents** selects Markdown for the navigator; it uses the active
Markdown document, the remembered selection or a Markdown picker. **Choose
Document…** chooses Markdown for Contents. These actions are not general file
openers. **New Document…** creates a `.md` or `.markdown` file through the host
Save dialog and refuses to overwrite a file. An untitled Markdown document
works for the current session. VS Code owns editing, saving, undo and recovery.

## Follow notes and files

1. Open the original note and choose its notes folder. Select a heading in
   Contents to reach its editor position.
2. Select an ordinary link in Contents, or place the cursor on the link and use
   **Follow Document Link**. Relative Markdown links can open another note, a
   supported heading or another local file such as a PDF. Repeated links retain
   distinct source occurrences.
3. Run **Show Backlinks…** in a destination and choose an incoming occurrence.
   The picker opens the source note at that occurrence. It distinguishes an
   incomplete search from a completed search with no backlinks.
4. Run **Return to Document** to return to the originating note occurrence.
   Opening a backlink also supplies its own usable return location. Ordinary
   note navigation keeps its return pin separate from a saved-reader citation.

The chosen folder bounds recursive note lookup; following a link does not index
its ancestors or another folder. `[[ID]]` resolves an exact filename stem in
that folder. Older dotted IDs and index-note IDs are supported. Editable titles
and prose following `[[ID]]` do not change identity. Duplicate IDs or conflicting
identity metadata are reported. Ordinary Markdown files need not adopt Zettel
metadata. Missing targets and unsupported wiki aliases, heading or block
selectors produce local explanations rather than guessed replacements.

Ordinary Markdown heading fragments use the parser's heading anchors, including
duplicate suffixes. Non-Markdown fragments, such as a PDF `#page=…`, are not
silently dropped: use a whole-file link for MRW's file-level opening. Links are
data; executable destinations, templates and embeds are not evaluated. Directory
symlinks do not extend the selected scope. Supported link resolution remains
subject to the explicit local-file boundary checks.

## Backlinks, edits and restart

The selected folder index is rebuilt on explicit operations. Limits are 2,000
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
revision even after the original changes or disappears. **Refresh Saved Source**
reloads saved state and annotations without acquiring a new original revision.

Use **Insert Source or Passage Link…** in a working Markdown document to insert
an exact saved reference. Following it from Contents opens that saved source;
**Return to Document** restores that citation's originating occurrence and
rendered Markdown view. Existing `mrw-outline:v1` references and record fields
remain unchanged. Copying Markdown does not copy its private saved targets.

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
