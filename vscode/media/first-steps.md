# Using MRW

Start with **Open Document…** in MRW's **Commands** view, or press **F1** and run
**MRW: Open Document…**. Choose a note or paper. Questions, solutions
and commentary can stay in their notes, connected by ordinary links.

**Contents** lists headings and links in the selected Markdown document.
**Commands** keeps opening and navigation controls available. **Studies** lists
separately saved work; it is not required for reading. Opening or following a
document never creates a problem record or launches an exercise form.

Hover over the MRW Activity Bar icon to see its version. The sidebar heading
shows it too. This tutorial reports the active extension build above. If an
installed update is waiting for a reload, the active build can still be older.

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
registered host editors. **MRW: New Document…** creates editable Markdown.


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

**MRW: Open Saved Source…** reopens retained material. Each visible passage has
**Add reader note**, **Delete reader note…**, **Link Obsidian note…** and **Ask AI about this passage…**
on one line, in that order. **Add reader note** opens that passage's annotation
editor. Enter your text and attribution, then **Save annotation**.
**Reader notes** displays the saved text beside the passage. **Delete reader
note…** selects a saved note when there are several, then asks for confirmation;
it is disabled when there are none. Cancelling preserves notes and drafts.
For a note kept in your vault, choose **Link Obsidian note…** and paste its
Obsidian URL. **Linked reader notes** beside the passage opens those notes in
Obsidian. **Change or remove link…** changes only the association; it never
deletes or rewrites the vault file. The link pins this retained passage, while
the external note remains editable in its vault.
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
| Lean lesson code and notes | **Ctrl+S** in ordinary editors | **Resume Lean Study** |

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

## Study Lean 4

Choose **Study Lean 4…** in **Commands** and begin with **Functions and
composition**. Its opening explains how to use the examples and InfoView and
lists the three lessons. Follow the contents links to **Implication as a function
on proofs**, then **Dependent application**. Each lesson also links to its
sections and back to the tutorial contents. Each lesson introduces its terminology before the
construction and has a variation, a solution and a deliberate error. The three
lessons share the editable examples and associated note.

The lesson preview and code use ordinary tabs; the official Lean InfoView opens
beside the code. In the implication lesson, put the cursor before `exact hQR hQ`
to inspect the live context and remaining goal.

Install the optional official **Lean 4** extension (`leanprover.lean4`) and
Lean/elan on the workspace host. In WSL2, choose **Install in WSL: Debian**.
The dedicated project pins Lean 4.33.0 and needs no Mathlib download. Ordinary
MRW activation starts no Lean build or download. Without Lean, the lesson and
code remain readable, with a route to official setup through MRW's notice.

The working project goes in `<notes folder>/Lean Study/lean-foundations/`, or
under the parent selected on first opening. **Lean Study Actions…** opens your
associated `Notes.md`, official book links, variations, solutions and deliberate
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
from Studies or Resume Study; its removed forms do not reopen.

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

In **Studies**, right-click a study and choose **Archive Study**. It leaves the
active list and stops reviews while keeping drafts, attempts, responses and
review dates. Use the Studies **…** menu → **Show Archived Studies**, select the
study, then **Restore study** to continue it. These commands also appear in the
Command Palette.

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

From the document's **MRW Document** menu, choose **New Zettel** and enter a title.
An ordinary Markdown draft opens beside the document. Its proposed filename uses
an ID such as `Note202611130907.md`; change the prefix in **MRW: Zettel Prefix**
if desired. The default draft has an H1 heading and a relative source link.
Change its layout in **MRW: Zettel Template**; existing notes need not use that
template or any particular metadata or headings. Write your note and press
**Ctrl+S** to save it in the selected notes folder. Nothing is written to the
vault before Save. VS Code handles editing, Undo and unsaved-draft recovery.

Use **Recent Notes** to reopen a note by title and ID. It lists up to thirty
notes opened or saved in this workspace, scoped to the selected notes folder,
and survives restart. It does not list every note recently edited in Obsidian.
**Return to Document** returns to the document from which you opened or created
the note. For a PDF it reopens the file; MRW does not preserve the PDF page.

A separate note needs no OCR. Selecting or searching text in a scanned PDF does.
Existing inline reader annotations remain in their saved sources; this command
does not convert or remove them.

The template substitutes `{{title}}`, `{{id}}` (the proposed filename without
`.md`), `{{source}}` (a Markdown link), and `{{cursor}}` (the insertion position).
Use `{{titleYaml}}` for a quoted YAML title if your own format uses YAML. These
are literal substitutions; no Obsidian Templater code runs. MRW does not require
the `flengyel/Zettel` conventions or alter that format specification.
