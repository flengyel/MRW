# Using MRW

Start with **Open Document…** in MRW's **Commands** view, or press **F1** and run
**MRW: Open Document…**. Choose a note or paper. Questions, solutions
and commentary can stay in their notes, connected by ordinary links.

To start a new note from MRW, choose **New Note…** in **Commands**, or run
**MRW: New Note…** from the Command Palette. For a configured Obsidian vault,
MRW brings Obsidian forward and runs your selected creation command. Other notes
folders use a blank VS Code Markdown editor. Your current document stays open.
See [Obsidian setup](https://github.com/flengyel/MRW/blob/main/docs/OBSIDIAN_WORKFLOW.md).

**Contents** lists headings and links in the selected Markdown document.
**Commands** keeps opening and navigation controls available. Fleeting notes and
notes for later review can remain ordinary linked documents. Opening or following
a document never creates a problem record or launches an exercise form.

Hover over the MRW Activity Bar icon to see its version. The sidebar heading
shows it too. This tutorial reports the active extension build above. If an
installed update is waiting for a reload, the active build can still be older.


## Find an imported section and its reader notes

Choose **Open Saved Source…** in MRW's **Commands** view, next to Open Document.
Search by source title, author or passage title/tag. For example, `Stacks` or
`08ZH` finds a saved Hausdorff-spaces section containing that lemma. The result
shows its reader-note count and retained revision. Open it, then expand
**Reader notes** at the relevant passage.

This list belongs to the current workspace. A Markdown document that links to
those passages is a separate file: use **Open Document…** for that file. Changing
the notes folder does not relocate saved sources. Opening a saved source does
not import it again, replace its revision or move its annotations.

## First-time workspace setup

Use **MRW: Set Up MRW Workspace…** to create or reuse
`~/mrw-work/MRW.code-workspace` on the Linux host. Its name is **MRW**; it is not
tied to a subject or command. **Choose Notes Folder…** connects notes stored
elsewhere, including a Windows Obsidian vault reached through `/mnt/c/…`.

Setup preserves existing settings. Choose **Open in this window** after saving
your work, or **Open in new window** to keep both sessions. Creating the default
workspace does not transfer work from other workspaces.
Reopen this same `.code-workspace` file for later sessions. The
[setup guide](https://github.com/flengyel/MRW/blob/main/docs/WORKSPACE_SETUP.md)
explains installation, optional tools and recovery of earlier work.

To relocate the current saved workspace, run **Move Workspace…** and choose a
new Linux directory. MRW saves pending study work, verifies the complete copy,
and commits the destination before offering **Open moved workspace**. Unsent
reader/Ask drafts and unsaved editor buffers must be settled first. The original
files remain available. After interruption, use **Recover Workspace Move**.
External notes stay in place; their filenames are stored relative to their
recorded notes folder. Workspace-owned locations are relative to the workspace.
The [relocation guide](https://github.com/flengyel/MRW/blob/main/docs/WORKSPACE_RELOCATION_DESIGN.md)
explains recovery and the limits of restoring other extensions' panels.

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
registered host editors. **New Note…** starts note creation from MRW as described
above. To create other kinds of documents, use their authoring application or
VS Code extension, then **Open Document**.


Use the editor toolbar's book icon, **MRW Document**, for navigation. PDFs and
text files offer **Return to Document** and **Show Backlinks…**. Markdown also
offers **Show Contents**, **Edit Document Source**, **Open Note in Obsidian** and
**Copy Note Link for Obsidian**. Backlinks search the selected notes folder;
choose that folder first. Return uses the previous MRW navigation location, or
the selected Contents document when no link was followed. A PDF return reopens
the file; MRW does not restore its page. A system reader has no MRW toolbar, so
use these commands in VS Code's Command Palette.

Ordinary navigation and Return leave both sidebars and editor groups under
VS Code's layout control. New notes use the active preview group; already-open
notes retain their group.

## Follow another note or paper

1. Run **MRW: Choose Notes Folder…** and select the folder containing the notes
   to navigate. It can be outside the workspace and need not be an Obsidian
   vault. In WSL, a Windows folder such as `C:\Users\you\Notes` is reached as
   `/mnt/c/Users/you/Notes`. The choice persists in **MRW: Notes Folder** and
   becomes the starting folder for **Open Document…**. The chooser shows the
   current folder and recent choices with full paths. Select a recent folder
   directly, or **Browse for notes folder…**; MRW reports the chosen path.
   Recent choices survive restart in this workspace. Cancelling changes nothing.
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

### Write a reader note

Choose **Add a note** beside a passage. Write prose, Markdown or LaTeX, then
choose **Save**. **Cancel** closes an unchanged editor; discarding unsaved text
requires confirmation. Attribution and math/TikZ **Help** are optional details.
For a diagram, save a fenced `tikz` block and choose **Render diagram** beside
its saved code. Saving does not run TeX. Existing source and model attribution
is preserved when editing; unspecified attribution stays unknown.

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
   Select the inserted link in **Contents** to read the saved text; **Return to Document**
   restores that citation's originating occurrence.

**MRW: Open Saved Source…** reopens retained material. When opened directly,
its **Open <document>** control opens the selected Contents document. Following
a citation from Contents gives **Return to <document>** for that exact occurrence.

Each visible passage has
**Add a note**, **Delete reader note…**, **Link Obsidian note…** and **Ask AI about this passage…**
on one line, in that order. **Add a note** opens that passage's annotation
editor. Enter your text and attribution, then **Save**.
**Reader notes** displays the saved text beside the passage. **Delete reader
note…** selects a saved note when there are several, then asks for confirmation;
it is disabled when there are none. Cancelling preserves notes and drafts.
For a note kept in your vault, choose **Link Obsidian note…** and paste its
Obsidian URL. **Linked reader notes** beside the passage opens those notes in
Obsidian. **Change or remove link…** changes only the association; it never
deletes or rewrites the vault file. The link pins this retained passage, while
the external note remains editable in its vault.

To develop one saved annotation in an ordinary note, choose **Continue this note
in Obsidian…** beside it. Select a saved note, or create one through your configured
Obsidian command and then select its saved file. Choose ordinary Markdown or the
optional Zettel format. For Zettel, complete the title index link in SEE ALSO;
the template alone leaves it empty.

Copying annotation text and its attribution/return link is optional. The note
can paraphrase the annotation or combine several sources. Save it, then choose
**Confirm selected saved note and link**. The selected external validator checks
the Zettel format when requested; it does not judge the note's content.

**Open continuation** opens the external note. The source annotation remains
editable and the snapshot captured when linking stays inspectable. **Link another
note…** preserves existing associations. Pending links resume without creating a
second file; missing notes offer explicit relinking. No link opens an AI request
or compiles TikZ.
See [continuation and recovery](https://github.com/flengyel/MRW/blob/main/docs/OBSIDIAN_WORKFLOW.md#continue-a-reader-annotation).

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
| Reader annotation | **Save** | **Open Saved Source…**, then **Reader notes** |
| Optional study attempt | **Pause / save** | **MRW: Resume Study** in the Command Palette |
| Optional proof-work question | **Save question** in **Proof work** | **Continue proof work** |
| Lean lesson code and notes | **Ctrl+S** in ordinary editors | **Resume Lean Study** |

The selected document, notes folder and usable Return location survive an
ordinary restart in this workspace. **MRW: Reopen Document** restores the last
opened or followed file. If its saved Markdown position still matches, that
selection is restored. After edits, Reopen shows the current file without
applying the obsolete range; a brief status message explains the missing
position. Dirty text stays unsaved. Exact-passage Return still checks its target.
Preview scroll positions and PDF pages are not restored. MRW does not reopen
the file automatically at activation. Missing or redirected files need a new
choice through Open Document.

There is no general research-session restore command. Keep unfinished reasoning
and the next step in the working document. An external notes folder is separate
from MRW's private saved-work directory: copying Markdown does not copy linked
saved sources, annotations, studies or history. Consult the
[storage guide](https://github.com/flengyel/MRW/blob/main/docs/ARTIFACT_STORAGE.md) before moving saved work.

## Inspect the grounds of an argument

Choose **Proofs → Justification… → Explore Euclid’s lemma**. The view supplies
two arguments, using Bézout’s identity and unique prime factorization. Read
the displayed assumptions and exact source text before choosing **Search under
these admissions**. Opening the example saves nothing and admits no premise.

If needed, expand **Local checker setup → Build local checker**. It uses an
already installed Lean 4.32.2 toolchain on the workspace host and downloads
nothing; the current verified build supports Linux x86-64/WSL. Reopening a saved
result needs no checker. Ordinary MRW reading remains independent of Lean.

The result retains the routes and their source snapshots. Source buttons show
the captured passage; **Back to routes** restores the comparison. **Withdraw a
ground…** checks a successor while preserving the earlier context and its
certificates. Reopen saved results through **Justification…** after a restart;
**Open earlier context** reads the predecessor without another Lean run.

Search saves its exact context before Lean starts. After a failure or closure,
choose **Unfinished: …** in **Justification…** to reopen it. Reopening performs
no check; choose Search to retry. A completed result replaces the unfinished
entry. If saving the context fails, keep the view open and retry; Lean has not
started.

To use your own note, select Markdown text and choose **Justification… → Use
selected Markdown text**, or choose saved passages. **Copy passages for Codex**
includes their exact text and a response schema. Import the companion response
from the clipboard, correct its summaries, then select and **Admit selected
grounds**. Search is a separate action. Source selections, responses and
corrections reopen after restart. No note save or study registration is required.
See the [existing-note workflow](https://github.com/flengyel/MRW/blob/main/docs/SOURCE_GROUNDS_WORKFLOW.md).

This checks the admitted composition, not the two arithmetic proofs. An empty
bounded search is not a disproof. The
[justification guide](https://github.com/flengyel/MRW/blob/main/docs/JUSTIFICATION_WORKFLOW.md)
explains the limits and the explicit context-file route. No registration form
is required for reading or writing notes.

## Study Lean 4

Choose **Study Lean 4…** in **Commands** and begin with **Introduction and
functions**. Its introduction explains formalization and the purpose of the
three lessons, followed by contents and instructions for the examples and InfoView. Follow the contents links to **Implication as a function
on proofs**, then **Dependent application**. Each lesson also links to its
sections and back to the tutorial contents. Each lesson introduces its terminology before the
construction and has a variation, a solution and a deliberate error. The three
lessons share the editable examples and associated note.

The lesson preview and code use ordinary tabs; the official Lean InfoView opens
beside the code. Edit `Study/Examples.lean`; Markdown code blocks illustrate it.
Lean checks the file as you edit. Click `#eval compose ... 2` and run **Lean 4:
InfoView: Display Goal** from the Command Palette: its message is `14`. Change
the final `2` to `3`, observe `16`, then undo. No Run button is needed. The
`#check` lines display types. In `implication_comp_tactic`, put the cursor before
`exact hQR hQ` to inspect the live context and remaining goal `R`; after that
tactic the proof is complete. The separate Practice files contain the holes
and deliberate errors.

Hover over an icon for its command name. **∀** opens Lean's menu; **Pin**
keeps a view at one location; **Pause / Play** freezes / resumes its display;
**Refresh** updates a paused display once; the **cog** changes goal display
settings. The **book** opens MRW's document menu. **Lean Study Actions…**
opens the lesson, examples and notes. See the
[icon guide](https://github.com/flengyel/MRW/blob/main/docs/LEAN_STUDY_WORKFLOW.md#icons-and-controls).

Install the optional official **Lean 4** extension (`leanprover.lean4`) and
Lean/elan on the workspace host. In WSL2, choose **Install in WSL: Debian**.
The dedicated project pins Lean 4.33.0 and needs no Mathlib download. Ordinary
MRW activation starts no Lean build or download. Without Lean, the lesson and
code remain readable, with a route to official setup through MRW's notice.

New projects use **MRW: Lean Study Parent**, or the notes folder when that
setting is empty. The project is stored in `Lean Study/lean-foundations/`
beneath that parent. Resume keeps the current working location.
**Lean Study Actions…** opens your associated `Notes.md`, official book links, variations, solutions and deliberate
errors. The book opens in the external browser. **Return from Lean Study**
recovers the prior MRW document range; **Resume Lean Study** reuses your edited
files and code location. Save and undo in their native editors. Explicit reset
requires confirmation, preserves Undo and does not save automatically.

Unfinished variations and deliberate errors are excluded from the successful
default `lake build`. Live goals and diagnostics belong to Lean; lesson goal
blocks are illustrations. Structural pack validation and successful Lean
checking do not establish agreement with an intended informal theorem.
See the [Lean workflow](https://github.com/flengyel/MRW/blob/main/docs/LEAN_STUDY_WORKFLOW.md)
and [lesson-pack authoring](https://github.com/flengyel/MRW/blob/main/docs/LEAN_LESSON_PACKS.md).

## Use a Zotero reference

First, start Zotero and enable **Settings → Advanced → Allow other
applications on this computer to communicate with Zotero**. This is a one-time
setting in Zotero; keep it running for searches and new attachment reads.
Then run **MRW: Connect Zotero…**, choose **Windows Zotero from WSL** if Zotero
runs on Windows, and choose a library. **MRW: Find Zotero Reference…** searches
that library. If you see **Local API is not enabled**, enable the setting above
and run **MRW: Connect Zotero…** again.

Select a reference, then **Open attachment…** to retain and read the chosen file,
or **Insert citation in note** while a Markdown note is focused. Insertion uses
Zotero’s formatted citation and ordinary Undo; MRW never saves the note for you.
**Copy citation** also works while reading a saved source.

**MRW: Resume Zotero Reference…** reopens retained metadata and attachments
offline. **Read current metadata** creates a new reference without redirecting
an earlier citation. Zotero’s originals stay in place. The existing PDF reader
and **Return to Document** apply; PDF page positions are not restored by MRW.
See [Zotero setup, scope and limits](https://github.com/flengyel/MRW/blob/main/docs/ZOTERO_WORKFLOW.md).

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
through **MRW: Resume Study** in the Command Palette; its removed forms do not reopen.

## History across computers

Run **MRW: Configure History… → Choose shared history directory…** and select
an MRW data directory. A vault subfolder such as `MRW` is convenient; Obsidian is
optional. **Import and Connect** copies recorded interactions and required
submitted snapshots, verifies them, and keeps the private originals. MRW uses
only the directory's `History/` subtree. Syncthing/SyncTrayzor supplies file sync.

**Inspect Study History** reports available sessions, feature use, conflicts and
missing context. **Export Study History…** saves selected sessions as Markdown
or JSON with a unique suggested filename. **Retry shared history** retries a
pending publication; **Reimport private history** repairs a reported queue gap.
**Turn off usage recording** stops new usage counts, while existing study
records and saved work remain.

This shares history, not active drafts, study checkpoints or scheduling. Other
computers may be offline. A Study deletion marker suppresses later arrivals;
MRW cannot erase disconnected copies or exported reports. See
[history setup and recovery](https://github.com/flengyel/MRW/blob/main/docs/USAGE_HISTORY.md).

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

## Import another source

**Import Source…** lists enabled source plugins. Choose **nLab**, paste a page
URL, and select Whole page or a heading with its subsections. A supplied heading
fragment preselects its section; an unknown heading reports an error. Read the
revision/hash and destination before importing. Saved text supports MathML and
inline SVG; unsupported media is marked where it occurs. nLab blocks embedded
pages, so Original page explains the limit and Open in browser opens the site.

**Add Source Plugin…** accepts a local JSON profile or trusted installed Python
adapter. **Manage Source Plugins…** enables, disables or removes them. Saved
imports keep their text, citations and notes without the plugin. An upgrade does
not reparse saved text; **Reparse Saved Source…** creates a separate derived copy
without moving annotations. No VSIX rebuild or window reload is needed to add
a source. See the [source-plugin guide](https://github.com/flengyel/MRW/blob/main/docs/SOURCE_PLUGINS.md)
for the working external examples and trust boundary.


## Put a study aside or remove it

For saved study records, run **MRW: Archive Study** from the Command Palette
and select the record. It leaves Resume selection and stops reviews while keeping
drafts, attempts, responses and review dates. Run **MRW: Show Archived Studies**,
select the record, then **Restore study** to continue it. These commands do not
manage your ordinary notes or Lean lesson files.

**Delete Study…** moves the selected study to Trash after showing its scope.
Choose **Undo** in the notification, or later use **Show Deleted Studies** →
**Restore study**. Restoration returns it to its prior active or archived state.

For permanent removal, open **Show Deleted Studies**, select the study and
choose **Permanently delete study…**. The confirmation lists the private data
being removed and shared data being kept. Ordinary notes, source annotations,
Lean files and other studies remain. Exports and backups are outside this action.

If saving fails, the lifecycle action stops and preserves the draft. If deletion
is interrupted, run **Show Deleted Studies** to retry cleanup. Returning to the
same source does not resurrect removed work; **Start new study** explicitly
creates a new identity.

## Retain and compare notebook results

Run and save your notebook with its normal Jupyter kernel. **MRW: Retain Notebook
Result…** keeps an exact copy, with optional companion notes or input files.
**Open Retained Notebook Result…** reopens the transcript and offers comparison,
companion reading, a link, export and deletion of that copy. Your original files
stay where they are. Escape closes the action picker while leaving the result open.

**Export Notebook Provenance…** can select both alternatives. The ZIP includes
exact files and separate attributed PROV accounts. Saved outputs alone have unknown
execution context; a producer receipt is a reported execution, not independent
verification. Opening, comparison and export run no code. The transcript shows
plain text and errors; rich outputs remain in the retained notebook.

See the [notebook guide](https://github.com/flengyel/MRW/blob/main/docs/NOTEBOOK_RESULTS.md)
for a worked example using two Sage calculations.

## When commands do not respond

Version 0.23.22 fixes a startup failure that left several commands unregistered.
After installing the update, save drafts before reloading when you are ready.
If commands remain unavailable, check **Output → Log (Remote Extension Host)**
for the activation error. Notes and saved research do not need to be recreated.

## Notes while reading

Choose your Zettelkasten with **Choose Notes Folder**. The folder stays separate
from the MRW workspace; an Obsidian installation is optional.

Choose **New Note…** in MRW's **Commands** view or the document's **MRW Document**
menu. If the selected folder is an Obsidian vault, MRW brings Obsidian forward
and runs your configured new-note command. Complete its prompts in Obsidian;
Obsidian supplies the template and filename.
Enable Obsidian's **Settings → General → Command line interface** and set
**MRW: Obsidian New Note Command** to your template's creation command.
This setting has no default: MRW stops if it is unset. It never substitutes
Obsidian's plain new-file command or writes its own note into the vault.
See [Obsidian setup](https://github.com/flengyel/MRW/blob/main/docs/OBSIDIAN_WORKFLOW.md).
Your current MRW document stays open. The existing
**Open in MRW** Obsidian command brings that same file back to MRW. Obsidian
runs as a separate application, not inside the MRW pane.

For an ordinary notes folder, the command opens a blank Markdown editor beside
the document. Use **Ctrl+S** to choose its filename and location. VS Code handles
editing, Undo and draft recovery. MRW adds no title prompt, generated ID or
source link. Existing notes and other open drafts are preserved.

A failed Obsidian handoff reports the error; it does not create a fallback file
or repeat the command.

For papers, notebooks, Lean files and other documents, use the corresponding
application or VS Code extension, then **Open Document** in MRW.

Choose **Recent Documents…** beside Open Document to reopen a note, PDF or
text file. The list keeps thirty files and survives restart. Markdown entries
show their title and filename; PDFs show their filename and path. Existing
recent notes remain. MRW does not scan your notes folder or copy document text.

For older PDFs missing from this list, choose **VS Code file history…** in the
picker, or press **Ctrl+P**. The old Recent Notes list did not record PDFs.
Opening a permitted PDF from native history adds it for later MRW use.
**Return to Document** keeps the source location when known; a PDF return is
file-level, without restoring its page. Saved notes and dirty buffers are preserved.

A separate note needs no OCR. Selecting or searching text in a scanned PDF does.
Existing inline reader annotations remain in their saved sources; this command
does not convert or remove them.

## Grouped tools and companion routes

Commands has Open Document and Open Saved Source, then purpose menus: Reading
and Notes, Sources and References, Calculation, Proofs, Tools and Setup, and
Earlier Saved Work. Type in the native picker or use arrows and Enter. Escape
preserves the current work. Setup distinguishes installed, configured and
unchecked companions and opens their existing guides.

Calculation opens native notebooks, retained results, comparison and provenance
export. Retained notebooks are read-only; comparison submits no cell execution.
Proofs contains Justification, Lean lessons and Proof Outline. Lesson actions apply to the
selected lesson or associated code; shared code offers a choice. Unrelated Lean
files keep native Lean controls.

Source annotations stay editable after linking an external note. Copying is
optional: the note can paraphrase or combine sources. Create new vault notes
through the authoring application's configured template, then select the saved
file. Linking retains a source snapshot; it does not certify a completed Zettel.
See [note associations](https://github.com/flengyel/MRW/blob/main/docs/OBSIDIAN_WORKFLOW.md#continue-a-reader-annotation).

Bracketed Pandoc citations render through a trusted Pandoc processor and either
an explicit bibliography or the selected Zotero / Better BibTeX library. MRW
reuses an Obsidian Pandoc Reference List live selection; Zotero and Better
BibTeX must be running. Missing or ambiguous keys stay visible. Formatting
changes only the preview. Returning to MRW refreshes the metadata snapshot;
**MRW: Refresh Citation Preview** also retries. Remote styles are not downloaded. See [citation setup](https://github.com/flengyel/MRW/blob/main/docs/ZOTERO_WORKFLOW.md#citation-rendering-in-existing-notes).

Citation snapshot notices identify the selected live library and Zotero host.
Local bibliography exports show their filenames; live Zotero provides no
database filename through this interface.

The optional MRW Diagnostics companion adds Feature Use and Integrity and Data
Hygiene reports, export and a reviewable Codex handoff. Weekly reporting is opt-in;
missed runs coalesce while VS Code is active. Reports do not repair or delete
research or invoke Codex. See [diagnostics](https://github.com/flengyel/MRW/blob/main/docs/DIAGNOSTICS_PLUGIN.md).

## Remove a saved copy from the active list

Choose **Sources and references → Delete saved source…**, or expand **Source
details and tools** in the reader. Save or cancel unsaved reader changes first.
The confirmation moves only that MRW saved copy to Trash. Its text, reader notes,
diagrams and links are kept. Original files and vault notes are unchanged.

**Undo** restores it immediately. **Restore saved source…** in Sources and
references or Open Saved Source restores it after restart. Exact links still
open a copy in Trash read-only, with a Restore button.
See [scope and recovery](https://github.com/flengyel/MRW/blob/main/docs/SAVED_SOURCE_TRASH.md).
