# Using MRW

**Open Document…** offers **Original file** (current contents in place) and
**Saved copy** (a retained revision with MRW annotations) in one native picker.
**Browse for another document…** is usable immediately, before folder or saved-copy
loading. The current folder lists filenames and subfolders without descending.
YAML titles, or the first H1, arrive separately; unsaved titles take precedence.
Titles appear in batches while the remaining headers load; the query and
selection stay in place.
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

These actions stay in the **Commands** section as native buttons while documents
and studies open. **Contents** lists document locations; **Studies** lists saved
work. **Show Contents** returns to the document navigator and reading controls.
If an originating link changes while another note opens, select its current
occurrence again. The previous Return destination remains available. New notes
open in the active preview group; already-open notes retain their group.
Commands are also available through **F1**.

Questions, solutions and commentary can stay in their notes, connected by
ordinary links. Follow those links and use **Return to Document** to retrace
your work. Opening or following a document never creates a problem record or
launches an exercise form. Earlier work saved through the removed document
Problems feature remains readable from Studies or Resume Study, with drafts
and history preserved.

## Open existing work

Run **MRW: Open Document…** and select a note, paper or manuscript. MRW opens
the original in place. It neither imports the file nor creates a saved source.
Markdown opens in preview and supplies **Contents**: headings, note links
and MRW source links. **MRW: Show Contents** selects Markdown for that navigator;
**MRW: Choose Document…** chooses another Markdown document for Contents.
Choosing Markdown visibly opens or reveals it. Contents keeps its filename and
path visible; **MRW: Reveal Contents Document** brings that same document back.
When another file is active, Contents hides the preceding tree and identifies
that file. PDFs and text files do not acquire a Markdown outline.
Cancelling a choice preserves the current view and drafts. Ordinary navigation
and Return leave both sidebars and editor groups under VS Code's layout control,
so MRW, Codex and other work stay available.

To resume saved reading, choose a **Saved copy** in **Open Document…**.
In the Stacks workspace, choose **Hausdorff spaces** from the saved store;
no import is needed. The specialized saved-source command remains available
from the Command Palette and Contents title toolbar.

A PDF uses an available registered VS Code reader. If none is available, MRW
offers **Open with system reader**. That explicit handoff can also fail if the
system has no reader. MRW does not display PDF bytes as text, install a reader,
extract text or derive PDF Contents. PDF page restoration depends on
the reader; MRW restores the originating note location at file level.
Other formats use their registered host editors. For a new Markdown file,
use **MRW: New Document…**; its initial headings can be edited or removed.

## Follow another note or paper

A note’s preview and Contents show its YAML title alongside its filename.
The filename remains its ID; titles do not rename notes. VS Code’s tab retains
its filename. **Open in Obsidian** is available at the top of the preview and
as **MRW: Open Note in Obsidian**. **Show Contents** returns to MRW’s reading
controls.

Select the vault root with **Choose Notes Folder…**. The Obsidian vault name
defaults to that folder’s name; **MRW: Obsidian Vault** can specify a different
name or vault ID. In WSL, choose the Windows vault through `/mnt/c/…` so both
applications edit the same files. This handoff does not require the Obsidian CLI.

From Obsidian, run **Templater: Open in MRW** on the note you are reading or
editing. It opens the current filename in MRW's preview and Contents without
inserting text or processing selections. The [Zettel template guide](https://github.com/flengyel/Zettel/blob/main/doc/OpenInMRW.md)
describes the vault-local workspace setting and command registration.

To keep a link to a particular note, click **Copy MRW link** above the preview,
or run **MRW: Copy Note Link for Obsidian**. Paste the Markdown link into an
Obsidian note. Clicking it opens this file's current contents in MRW's preview,
including after restarting MRW. It is a live file link, not a retained citation.
If VS Code sends it to another workspace, use **Copy Link and Open Workspace**
to open the intended workspace in a separate window, then run **MRW: Open Link
from Clipboard** there. The original working window stays open.

Save changes in Obsidian, then return to MRW: its clean note and preview update
within a few seconds. Unsaved
VS Code text remains the current draft and is labelled **Unsaved VS Code
changes**. MRW does not save, discard or merge that draft when opening Obsidian.


1. Run **MRW: Choose Notes Folder…** and explicitly select the folder containing
   the notes to navigate. It can be outside the workspace, including a Windows
   folder reached through `/mnt/c/…` in WSL. It need not be an Obsidian vault.
   For example, `C:\Users\you\Notes` is `/mnt/c/Users/you/Notes`. After folder
   selection, **Open Document…** starts there, including after restart.
   The picker sets **MRW: Notes Folder** in workspace settings. You can edit that
   setting directly; it is an absolute path on the extension host.
2. Click a WikiLink in Markdown preview, or **Ctrl+click** it in the source
   editor (use the modifier shown by VS Code). You can also use its **Contents**
   link entry, or place the cursor on
   a link and run **MRW: Follow Document Link**. Relative Markdown links can
   target another note, a heading or a PDF. Zettel links such as `[[ID]]` resolve
   within the selected notes folder. Obsidian `[[ID|label]]` links display the
   label and follow the ID; a title after `[[ID]]` is also descriptive.
3. Run **MRW: Show Backlinks…** in the destination. Choose an incoming occurrence
   to open the note that contains it. The picker reports incomplete searches
   separately from a completed search with no links.
4. Use **MRW: Return to Document** to return to the originating occurrence.
   A failed follow preserves the preceding successful return location.

ID lookup searches filenames and reads only matching notes. In WSL, a Windows
notes folder uses one bounded Windows filename enumeration to avoid repeated
filesystem calls across the mount. Failed enumeration falls back to the normal
lookup; an incomplete enumeration remains incomplete. Backlink search
reads note text separately and reports partial results when a limit is reached.
The entry budget counts candidate notes, directories and symlinks; ordinary
non-Markdown attachments do not consume it.

Note lookup excludes `.obsidian`, `.trash`, `.git`, `.lake`, `node_modules`,
`.venv` and `__pycache__` directories. These are not indexed as notes; the scan
limits still apply to the remaining folder.

The selected folder bounds the note lookup and backlink search. Following a link
does not authorize indexing another folder. Missing or ambiguous IDs and
missing or ambiguous selectors produce an explanation rather than a guessed destination.

WikiLinks can select a heading (`[[ID#Heading]]`), a paragraph block
(`[[ID#^block-id]]`), or a vault-relative path (`[[folder/ID#Heading]]`).
`[[#Heading]]` stays in the same note; `./` and `../` paths are relative to the
source note and cannot leave the chosen notes folder. Duplicate IDs remain
ambiguous; use a path to distinguish them. Markdown links can use `#^block-id`
as well. These links retain their complete original occurrence for Return.

## Read mathematical notation and diagrams

The preview uses bounded `\newcommand`, `\renewcommand` and
`\providecommand` definitions from leading front matter for that note's
equations. Packages and arbitrary LaTeX preambles are not evaluated by the math
preview. Definitions do not carry into another note.

A `tikz` fence offers **Render diagram**. That explicit action runs the existing
isolated pdfLaTeX renderer on Linux/WSL; opening a note never compiles it. It
requires the installed TeX, Poppler and bubblewrap tools. A pinned, attributed
Quiver package supplies exported curve styles. Successful diagrams are cached
outside the note, follow the light/dark theme and remain available after restart.
Changing the code shows its source until the new code is rendered. A compilation
failure preserves the source and earlier derived views. **TikZ source** expands
the exact code. Obsidian embeds and arbitrary TeX packages remain separate limits.
Leading delimited YAML is metadata, not Contents. Notes, filenames, IDs, titles
and existing links stay unchanged. Embeds and executable link destinations are
not evaluated.

**Edit Document Source** opens the Markdown for editing. Contents and backlinks
use dirty editor text; opening preview does not save a draft. **Ctrl+S**
saves the note; MRW does not save it merely by opening, indexing or following.
The selected document, notes folder and usable return pin survive an ordinary
restart in this workspace. Run **MRW: Reopen Document** to reopen the last opened
or followed file and its last exact Markdown selection. Contents, followed
heading/block locations and source-editor selections are recorded; preview
scrolling is not. MRW does not open it automatically at activation. If the saved
original has changed incompatibly or is missing, select it explicitly again.
VS Code owns unsaved-buffer recovery.

## Retain a passage when needed

Reading the original and keeping a source revision are separate actions.
Retain text when it needs stable passage references, reader annotations or study.

1. Open a UTF-8 text, Markdown or TeX source and save its editor changes.
2. Select the passage and run **MRW: Retain Document as Source**. MRW keeps that
   revision and opens its reader. Later original-file edits do not replace it.
3. In a working Markdown document, use **MRW: Insert Source or Passage Link…**
   to insert its exact reference. Follow it from Contents to read the saved text;
   **Return to Document** restores that citation's originating occurrence.

**MRW: Open Saved Source…** reopens retained material independently. Under a
passage's **Notes and tools**, choose **Add reader explanation / question /
repair**, enter the text and attribution, then **Save annotation**. **Reader
notes** displays the saved annotation. **Refresh saved source** reloads its saved
state; it does not acquire a new original-file revision.

The reader shows collection, chapter/section when available and the qualified
source identifier above the text. Storage and hash details stay collapsed.
**Return to filename** restores the exact citation occurrence. For an
independently opened source, **Open filename** opens the selected Contents
document instead; **Choose a document…** appears when none is selected.
Hover or Tab-focus controls to read their help; Escape dismisses it. Location
and destination remain visible without hover. Return never saves your document.

**MRW: Import Markdown Text…** is optional. It copies text into a saved source,
a passage annotation or a Markdown document. It is not needed to open notes or
follow their links, and it does not synchronize them.

## Import a published section

**MRW: Import Stacks Project Section…** accepts `stacks-project:08ZD`, a bare
tag or its official URL. **MRW: Import Kerodon Section…** accepts
`kerodon:0004`, a bare tag or its official URL. Confirm the source, revision and
saved-work destination. Stacks Project uses pinned Git/TeX; Kerodon retains one
section/subsection HTML page with its hash and acquisition time. It does not
import linked subsections.

The reader shows qualified IDs, local statement/proof links and an explicit
**Open canonical source citation ↗** browser button. **Show backlinks** searches
the chosen notes folder for that qualified item, including retained citations.
A live link such as `[[kerodon:0004]]` opens today's page. A retained citation
also fixes the content revision and exact passage; its prefix alone cannot do so.
Reopen an imported section offline with **Open Saved Source…**. Reader notes stay
separate from the source. See [published sections](../docs/STACKS_WORKFLOW.md).

## Work through a difficult step

For a local explanation, add a reader annotation as above. For a question and
attempt, select saved source text and run **MRW: Study Current Material**, or
choose **Study current material** in its reader. The study keeps that source
fixed while other tabs or Codex are used.

1. Choose **Enter a question**, such as “Which hypothesis justifies this
   equality?” A reference answer is optional. **Request questions from Codex**
   instead copies the exact source and request; paste the reply with **Import
   questions from clipboard**.
2. Choose **Attempt**, type the work or mark **Worked on paper**, then **Submit
   answer**. Starting recall conceals source and answer inside the study.
3. Reveal source context or a reference answer when useful. **Copy help request
   for Codex** includes the source, question and work. Paste the request into
   Codex; copy its reply back through **Paste companion response… → Review
   pasted response → Retain response**. Check the attribution and request
   association. Manual paste does not authenticate authorship or correctness.
4. Use **Submit revised work** during an unfinished attempt. After recording an
   outcome, **Continue with revised work** starts a linked attempt and preserves
   earlier submissions and replies.

Report the outcome and consultation for that submission. These are reader
reports, not mathematical checking. **Keep for review** opts a question into
later source-scoped review; saving it alone does not enroll it. Effort reports
are optional. No study example or comprehension test is required to read a note.

## Work through a proof

For a question about a proof, **MRW: Work through a proof…** collects the saved
proof, prerequisite passages you select, and your question. **Copy handoff for
Codex** includes their exact text and references. Import a returned outline to
inspect its proof graph and edit claim summaries. **Continue proof work** reopens
the saved question and linked outline. See [the proof workflow](../docs/PROOF_STUDY_WORKFLOW.md).

## Save and resume

| Work | Save | Resume |
| --- | --- | --- |
| Original document | **Ctrl+S** in its editor | **Reopen Document**, or **Open Document…** for another file |
| Reader annotation | **Save annotation** | **Open Saved Source…**, then **Reader notes** |
| Current study question and attempt | **Pause / save** | **Resume Study** or its row in **Studies** |
| Question about a proof | **Save question** in its **Proof work** tab | **Continue proof work** |

**Pause / save** keeps unfinished work without recording an outcome. **Resume Study**
restores attempts; **Continue proof work** restores a question and its outline. There is no general research
session restore command yet; keep the next step in the working document.

Ordinary notes and MRW private records have separate storage. An external notes
folder is not an MRW saved-work directory. Copying Markdown does not copy its
linked saved sources, annotations, current studies or history. Consult the
storage guide before moving or reconnecting saved work.

## Optional integrations and guides

Obsidian is optional. An existing vault can be chosen as an ordinary notes
folder without converting or importing it. **Open linked note in Obsidian** in
a saved reader requires a supplied, validated note association; MRW does not
infer a vault from the selected folder. See [note links and Obsidian](../docs/OBSIDIAN_WORKFLOW.md).

- [Documents, Contents and backlinks](../docs/READING_OUTLINE_WORKFLOW.md)
- [Questions, attempts, history and review](../docs/ACTIVE_STUDY_WORKFLOW.md)
- [Work through a proof and Proof Outline](../docs/PROOF_STUDY_WORKFLOW.md)
- [Reader Ask, exact preview and Send](../docs/READER_AI_WORKFLOW.md)
- [Saved-work storage and recovery](../docs/ARTIFACT_STORAGE.md)
- [Optional SagePod computation](../docs/GETTING_STARTED_WSL_SAGEPOD.md)

**MRW: Open Study Example** remains an optional offline demonstration. Graph
validation checks structure and references, not the mathematical argument.
Reopen this active build's guide with **MRW: Open Tutorial**.
