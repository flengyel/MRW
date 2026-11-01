# Reading with an ordinary Markdown outline

MRW 0.9.0 adds **MRW: Open Reading Outline**. Use the current Linux artifact
store and Windows VS Code connected to WSL. No storage move, new vault, Lean,
provider or prescribed reading sequence is required.

Click the **MRW** book icon in the Activity Bar to open the reading navigator.
Its **…** menu contains the reading and source commands. **Research Tools** is
collapsed by default; the same commands remain available through F1. This is a
native VS Code view container over the existing extension, with no new project
or private-store setup.

1. Open an ordinary Markdown overview in the intended workspace. Write headings,
   explanations, connections and questions in your own words. Existing notes
   and Obsidian remain ordinary notes; MRW never scans the vault.
2. Use **MRW: Insert Outline Reference…** to choose a saved source outline and
   either its whole source or one exact retained region. Repeat for other
   sources, or cite the same passage in several sections. This is the unchanged
   [0.5.0 reference format](PROOF_OUTLINES.md#first-manual-overview-across-sources--reference-contract-2026-10-16).
3. Run **MRW: Open Reading Outline**. The MRW sidebar's **Reading Outline** view derives
   headings and MRW references from the active document. Use the section arrows
   to collapse/expand. Select a heading to select its Markdown line visibly.
4. Select a source reference to open its retained reader. A passage reference
   additionally selects the exact original range in read-only retained text.
   Changed or removed associations report the change and open the old pinned
   passage, without selecting a replacement region.
5. Use **MRW: Return to Reading Outline**, the view's back arrow, or the reader's
   **Return to reading outline** button. It selects the originating occurrence,
   even if another section cites the same passage. Continue inserting references
   and editing the ordinary document. MRW never saves it automatically.
6. Edit/reorganize headings with normal VS Code commands and undo/redo. The tree
   updates after a short debounce, including unsaved edits. **Refresh Reading
   Outline** refreshes immediately. A stale clicked entry asks you to select
   its current replacement, instead of navigating stale offsets.
7. Save and close normally. Reopen the overview and run **Open Reading Outline**.
   It reconstructs from the document and restores collapse preferences and the
   last selected location when the saved text matches. From a reader, the same
   command can reopen the last saved overview for this window.

Patch **0.9.1** improves the reading presentation observed in the first trial.
Source entries use short titles in the navigator; their full citation labels
remain in tooltips and the unchanged Markdown. Following an entry expands the
reader and hides the side bars through VS Code's standard layout commands.
Source content appears before its passage tools, and **Source details and tools**
starts collapsed. The Return button stays visible while scrolling. Return
expands the originating Markdown editor and opens Reading Outline again.

A matching expanded published passage opens its rendered retained card directly.
Its exact TeX is available by expanding the source disclosure on that card.
Changed/removed region associations or an incompatible/collapsed current card
still open the exact original pinned text. Source details, original-file/source
controls, linked notes, bibliographic editing and evidence remain available;
navigation does not rewrite them. **Source details and tools** also contains the
section contents controls. The VS Code title-bar workspace name opens a menu;
to focus the editor, click inside its text area. F1 opens the command palette.

In **0.9.2**, use **Proof ↓** on a published statement to read its associated
retained proof; **Statement ↑** returns to the statement. These links require
explicit published roles and matching retained spans. Multiple proofs stay
separate. A changed association is reported rather than redirecting the link.
Opening a hidden proof for reading does not save a collapse-state change.

Region editing forms now live under **Source details and tools → Notes and
tools: REGION**, outside the statement/proof sequence. Opening an annotation
form there cannot insert it between the statement and proof. Existing notes
appear separately after the source text with their supplied attribution. Their
text and saved records are unchanged. Manual sources retain manual region
navigation; MRW does not infer which region proves another.

When saving a note, look for **Saving annotation…** and then **Annotation saved.**
The confirmation follows core publication; a status-bar message also identifies
the submitted annotation. If you typed more during the save, the message says
that the submitted version was saved and the newer edits remain unsaved. An
unconfirmed or failed publication keeps the text and says **Save not confirmed**.
The open editor stays open; the application does not retry or save newer text
without another explicit action.

For example, an overview might have `# Separation`, `## Statements to compare`,
and `## Questions for later`. Insert a whole-source reference to the retained
Stacks **Hausdorff spaces** section under the first heading, an exact **08ZE**
statement link under the second, and a reference to another retained article or
book under the third. Explanations and questions between links remain ordinary
reader-authored prose. Repeating 08ZE under another heading creates another
navigation occurrence; it creates no mathematical dependency.

The bundled CommonMark parser recognizes ATX/Setext headings, normal inline and
reference links, autolinks and bare MRW references. It excludes fenced/indented
code, inline code, images and HTML comments. Unicode, escaped labels, repeated
headings and duplicate references remain distinct. Custom Markdown plugins and
Obsidian-specific syntax are not interpreted. The limit is 4 MiB and 10,000
heading/reference entries; long display labels are bounded. Prose stays in its
original document. There is one selected overview per window; switching to a
different document resets its collapse preferences. Untitled documents work
live, with no persistent MRW untitled pointer.

Live return pins follow edits wholly outside the selected link. Editing or
removing the selected syntax blocks return. Undo to the exact captured document
restores the pin; MRW does not search for similar text. After close or restart,
a mismatching text hash also blocks an old pin. Select a current navigator entry
to establish a new destination. VS Code owns unsaved text and its recovery;
MRW stores only document identity, hashes, offsets and navigation preferences
in host-local workspace UI state. It creates no private copy of the prose.

Changed/missing originals do not block valid retained material. Missing,
incompatible or corrupt retained storage and unrelated workspace scope produce
an error through the existing resolver, without creating replacements or looking
in other workspaces. Copying Markdown alone transfers no retained sources or
private outlines. Source/region/revision identity and pinned ranges keep their
existing meaning. Opening, refreshing, following and restoring this view start
no acquisition, provider request, compiler, notebook or container. Stacks import
remains a separate explicit command.

This is reading navigation. Links establish no necessary premise, checked
dependency, proof correctness or understanding. Automatic outlines, AI
explanations, prerequisite discovery, proof graphs, vertex elimination,
PDF/OCR ingestion, source-revision comparison and whole-corpus ingestion remain
pending. Windows-backed storage qualification is deferred. See
[actual checks and remaining observations](READING_OUTLINE_VALIDATION.md).
