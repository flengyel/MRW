# Using MRW

Start with **Open Document…** in MRW's **Commands** view, or press **F1** and run
**MRW: Open Document…**. Choose a note or paper. Questions, solutions
and commentary can stay in their notes, connected by ordinary links.

**Contents** lists headings and links in the selected Markdown document.
**Commands** keeps opening and navigation controls available. **Studies** lists
separately saved work; it is not required for reading. Opening or following a
document never creates a problem record or launches an exercise form.

<a id="open-existing-work"></a>

## Open a document

The picker offers two kinds of document:

| Choice | What opens |
| --- | --- |
| **Original file** | The current file, in place. No import or saved source is created. |
| **Saved copy** | A retained source revision with its MRW annotations. Opening it does not refresh or replace that revision. |

Choose **Browse for another document…** to use the file dialog immediately.
The picker lists the current folder's files and subfolders before loading their
titles. Search by title, filename or path, enter a subfolder, or choose **Parent
folder**. **Search subfolders…** searches nested folders within the
[chooser limits](https://github.com/flengyel/MRW/blob/main/docs/DOCUMENT_OPENING_REPAIR.md).
Titles arrive in batches without changing the current query or selection;
incomplete results are identified. Cancelling preserves the current view and
drafts.

Markdown opens in preview and supplies Contents. **MRW: Show Contents** selects
or reveals that document; **MRW: Choose Document…** selects another Markdown
file. Contents identifies its filename and path. **MRW: Reveal Contents Document**
brings it back into view. When another file is active, Contents hides the
preceding tree and identifies the active file. PDFs and text files do not acquire
a Markdown outline.

A PDF opens in an available registered reader. If none is available, MRW offers
**Open with system reader**. PDF page restoration depends on the external reader;
MRW supplies neither a PDF reader nor text extraction, PDF Contents or page
restoration. Other formats use their
registered host editors. **MRW: New Document…** creates editable Markdown.

Ordinary navigation and Return leave both sidebars and editor groups under
VS Code's layout control. New notes use the active preview group; already-open
notes retain their group.

## Follow another note or paper

1. Run **MRW: Choose Notes Folder…** and select the folder containing the notes
   to navigate. It can be outside the workspace and need not be an Obsidian
   vault. In WSL, a Windows folder such as `C:\Users\you\Notes` is reached as
   `/mnt/c/Users/you/Notes`. The choice persists in **MRW: Notes Folder** and
   becomes the starting folder for **Open Document…**.
2. Click a WikiLink in preview or **Ctrl+click** it in the source editor using
   the modifier shown by VS Code. For an ordinary Markdown link, select its
   Contents entry or run **MRW: Follow Document Link** at the cursor. These
   routes retain an MRW Return destination; native preview links do not
   necessarily do so.
3. In the destination, **MRW: Show Backlinks…** lists incoming occurrences.
   Select one to open the note containing it.
4. Use **MRW: Return to Document** to return to the originating occurrence.
   A failed follow preserves the preceding successful return location.

Relative Markdown links can target another note, a heading or a PDF. WikiLinks
support these forms within the chosen notes folder:

| Link | Destination |
| --- | --- |
| `[[ID]]` or `[[ID|label]]` | A note identified by its ID; the label changes display only |
| `[[ID#Heading]]` | A heading in that note |
| `[[ID#^block-id]]` | A supported paragraph/list block |
| `[[folder/ID#Heading]]` | A heading in a note at a vault-relative path |
| `[[#Heading]]` | A heading in the current note |

Paths beginning with `./` or `../` are relative to the source note and cannot
leave the chosen notes folder. Markdown links can also use `#^block-id`.
Missing or ambiguous IDs, headings and blocks produce an explanation rather
than a guessed destination. Use a path to distinguish duplicate note IDs.

Lookup and backlink searches follow the
[documented limits](https://github.com/flengyel/MRW/blob/main/docs/READING_OUTLINE_WORKFLOW.md)
and report incomplete results. They exclude `.obsidian`, `.trash`, `.git`,
`.lake`, `node_modules`, `.venv` and `__pycache__`. Browsing another folder does
not change the selected notes folder or extend backlink indexing. If a link
changes while another note opens, select
its current occurrence again; the previous Return destination remains available.

### Use the same notes in Obsidian

Choose the vault root as the notes folder. The Obsidian vault name defaults to
that folder's name; **MRW: Obsidian Vault** can specify a different name or vault
ID. For Windows Obsidian with WSL, use the vault's `/mnt/c/…` path.

Click **Open in Obsidian** above a note preview, or run **MRW: Open Note in
Obsidian**. The handoff needs Obsidian's registered URI handler, not its CLI.
Save an edit in Obsidian and return to MRW: the clean note and preview refresh.
Unsaved VS Code text stays intact and is labelled **Unsaved VS Code changes**;
MRW does not save, discard or merge that draft.

**Copy MRW link**, also available as **MRW: Copy Note Link for Obsidian**, copies
a link to the current file for pasting into a note. It opens that file's current
contents, including after restart. It does not pin a retained revision. If the
link reaches another workspace, use **Copy Link and Open Workspace**, then run
**MRW: Open Link from Clipboard** in the intended workspace. The original window
stays open.

The optional **Templater: Open in MRW** command described in the
[Zettel template guide](https://github.com/flengyel/Zettel/blob/main/doc/OpenInMRW.md)
opens the current Obsidian note in MRW without inserting text. Its setup belongs
to that guide; it is not a built-in Obsidian command.

## Read mathematical notation and diagrams

The preview renders mathematics and supported `\newcommand`, `\renewcommand`
and `\providecommand` definitions from the note's leading YAML front matter.
Definitions apply to that note's equations only. Arbitrary LaTeX preambles and
packages are not evaluated by the math preview. Leading YAML is excluded from
Contents without changing the note.

A fenced `tikz` block offers **Render diagram**. Click it to run the isolated
Linux/WSL pdfLaTeX renderer. This requires TeX, Poppler and bubblewrap; the pinned
Quiver package is supplied for exported curve styles. Opening or saving a note
never compiles it. Successful diagrams are cached outside the note, follow the
light/dark theme and remain available after restart.

After changing the code, render the block again. **TikZ source** reveals
the exact code. A failed render preserves the source and earlier derived views.
Rendering does not check the mathematics. Obsidian embeds and arbitrary TeX
packages remain unsupported. See
[TikZ setup](https://github.com/flengyel/MRW/blob/main/docs/TIKZ_WORKFLOW.md).

**MRW: Edit Document Source** opens Markdown for editing. Contents and backlinks
use unsaved editor text. **Ctrl+S** saves the note; opening, indexing or following
it does not save a draft. VS Code owns undo and unsaved-buffer recovery.

## Retain a passage when needed

Retain text when a stable revision is needed for citations or reader annotations.
Ordinary note opening does not require this step.

1. Open a UTF-8 text, Markdown or TeX source and save its editor changes.
2. Select the passage and run **MRW: Retain Document as Source**. MRW keeps that
   revision and opens its reader. Later original-file edits do not replace it.
3. In a working Markdown document, use **MRW: Insert Source or Passage Link…**.
   Follow the inserted link to read the saved text; **Return to Document**
   restores that citation's originating occurrence.

**MRW: Open Saved Source…** reopens retained material. Under a passage's **Notes
and tools**, choose **Add reader explanation / question / repair**, enter text
and attribution, then **Save annotation**. **Reader notes** displays it.
**Refresh saved source** reloads the saved state without acquiring a new revision.

The reader identifies the source above the text and keeps storage details
collapsed. **Return to filename** returns to the exact citation occurrence.
For an independently opened source, **Open filename** opens the selected Contents
document instead; **Choose a document…** appears if none is selected. Hover or
Tab-focus controls for help; Escape dismisses it. Return never saves a document.

**MRW: Import Markdown Text…** copies text into a saved source, a
passage annotation or a Markdown document. It does not synchronize files.

## Import a published section

**MRW: Import Stacks Project Section…** accepts `stacks-project:08ZD`, a bare
tag or its official URL. **MRW: Import Kerodon Section…** accepts `kerodon:0004`,
a bare tag or its official URL. Confirm the source, revision and saved-work
destination. Stacks Project uses pinned Git/TeX; Kerodon retains one
section/subsection HTML snapshot without importing linked subsections.

The reader displays qualified IDs and local statement/proof links. **Open
original source ↗** opens the current published page. **Show backlinks** searches
the chosen notes folder for the qualified item, including retained citations.
A live link such as `[[kerodon:0004]]` opens the current page; a retained citation
also pins a revision and exact passage. Its prefix alone cannot do that.
Reopen an imported section offline with **Open Saved Source…**. See
[published sections](https://github.com/flengyel/MRW/blob/main/docs/STACKS_WORKFLOW.md).

## Save and resume

| Work | Save | Resume |
| --- | --- | --- |
| Original document | **Ctrl+S** in its editor | **Reopen Document**, or **Open Document…** for another file |
| Reader annotation | **Save annotation** | **Open Saved Source…**, then **Reader notes** |
| Optional study attempt | **Pause / save** | **Resume Study** or its row in **Studies** |
| Optional proof-work question | **Save question** in **Proof work** | **Continue proof work** |

The selected document, notes folder and usable Return location survive an
ordinary restart in this workspace. **MRW: Reopen Document** restores the last
opened or followed file and its last exact Markdown selection. Contents,
heading/block targets and source-editor selections are recorded; preview scroll
positions and PDF pages are not. MRW does not reopen the file automatically at
activation. If its saved location no longer matches, select the file again.

There is no general research-session restore command. Keep unfinished reasoning
and the next step in the working document. An external notes folder is separate
from MRW's private saved-work directory: copying Markdown does not copy linked
saved sources, annotations, studies or history. Consult the
[storage guide](https://github.com/flengyel/MRW/blob/main/docs/ARTIFACT_STORAGE.md) before moving saved work.

## Work through a difficult step

Optional source study keeps a selected passage beside questions and attempts.
Run **MRW: Study Current Material** on saved source text, or choose **Study
current material** in its reader. **Enter a question** works offline; **Request
questions from Codex** and **Import questions from clipboard** provide a manual
companion exchange.

An attempt can contain typed work or **Worked on paper**. **Submit answer**
retains a version; **Submit revised work** preserves subsequent work separately.
**Copy help request for Codex** includes the source, question and work. Use
**Paste companion response… → Review pasted response → Retain response** to
keep a returned explanation with attribution. Pasting does not authenticate its
author or check its mathematics.

**Pause / save** keeps unfinished work. **Continue with revised work** starts a
linked attempt after completion. **Keep for spaced review** opts a question into later
source-scoped review; saving alone does not enroll it. Effort reports are
optional. See [the study guide](https://github.com/flengyel/MRW/blob/main/docs/ACTIVE_STUDY_WORKFLOW.md) for recall,
submission and history details. Earlier document-linked work remains readable
from Studies or Resume Study; its removed forms do not reopen.

## Work through a proof

**MRW: Work through a proof…** collects a saved proof, selected prerequisite
passages and a question for a Codex handoff. A returned outline can
be inspected as a graph and its claim summaries edited. **Continue proof work**
reopens the saved question and linked outline. Graph validation checks references
and structure, not the mathematical argument. See
[the proof workflow](https://github.com/flengyel/MRW/blob/main/docs/PROOF_STUDY_WORKFLOW.md).

## Optional integrations and guides

- [Documents, Contents and backlinks](https://github.com/flengyel/MRW/blob/main/docs/READING_OUTLINE_WORKFLOW.md)
- [Note links and Obsidian](https://github.com/flengyel/MRW/blob/main/docs/OBSIDIAN_WORKFLOW.md)
- [Questions, attempts, history and review](https://github.com/flengyel/MRW/blob/main/docs/ACTIVE_STUDY_WORKFLOW.md)
- [Reader Ask, exact preview and Send](https://github.com/flengyel/MRW/blob/main/docs/READER_AI_WORKFLOW.md)
- [Saved-work storage and recovery](https://github.com/flengyel/MRW/blob/main/docs/ARTIFACT_STORAGE.md)
- [SagePod computation](https://github.com/flengyel/MRW/blob/main/docs/GETTING_STARTED_WSL_SAGEPOD.md)

**MRW: Open Study Example** supplies an optional offline demonstration. Reopen
this active build's guide with **MRW: Open Tutorial**.


## Read a published section

**Import Stacks Project Section…** and **Import Kerodon Section…** are available
in Commands even with a document open. Import a section, then use **Original
page** to read its current official page inside MRW, or **Saved text** to return
to the retained revision and annotations. **Open in browser** opens the official
page separately. The online page may have changed since import; switching views
does not update saved text or relocate annotations. Save reader annotations
explicitly before closing the reader.
