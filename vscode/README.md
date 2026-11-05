# Mathematical Research Workstation for VS Code

## Proof study with Codex (0.17.0)

**Prepare Proof Study…** selects a retained proof and prerequisites. Copy its
single handoff into Codex, then **Import outline from clipboard** to open the
proposed graph. **Edit summary** corrects claims/explanations without editing
JSON, with explicit author and origin. **Save question** keeps the unresolved
question; **Resume Proof Study** reconstructs it. Reader notes are excluded
from the handoff. No model request or compiler runs automatically.

See the [workflow](../docs/PROOF_STUDY_WORKFLOW.md) and
[validation](../docs/PROOF_STUDY_VALIDATION.md), including the 08ZG case and
remaining manual steps. Imports validate structure/source pins, not mathematics.

## Proof-view startup (0.16.1)

Fixes the proof view stuck on its initial loading screen. VS Code sends replies
from a same-origin wrapper window; the view accepts that origin and excludes
messages from the embedded Stacks page. Startup timeouts offer Retry.

## Graph navigation and Stacks pages (0.16.0)

Select a graph vertex to read the corresponding official Stacks tag alongside
it. **Saved text** reads the retained statement/proof offline. Drag to pan,
wheel to zoom, or use **Fit**. Deletion and restoration animate the layout while
keeping the selected page open. A title-bar graph icon opens the interactive
view from a `.mrw-proof.json` editor. See
[usage and source boundaries](../docs/PROOF_GRAPH_WORKFLOW.md#graph-and-tagged-stacks-passage-0160).

## Proof outlines (0.15.0)

**Open Proof Outline…** opens a `.mrw-proof.json` document with attributed
summaries, joint premises, alternative derivations and pinned source quotations.
**Delete vertex** projects the display; **Expand original steps** and **Restore**
retain the original argument. **Use AI outline** applies a saved proposal;
**Ask AI…** uses exact preview/Send. Edit summaries in the ordinary JSON editor.
The first case is Stacks 08ZE/08ZH with pinned Axiom Math and Mathlib source.
See [the workflow](../docs/PROOF_GRAPH_WORKFLOW.md) and
[validation](../docs/PROOF_GRAPH_VALIDATION.md). Source inspection supplies the
proposed structure; no elaborated Lean graph or local Lean check is inferred.

**Commands and file behavior:** [Using MRW](media/first-steps.md), also available
inside the extension with **MRW: Open Tutorial**. The guide covers source reading,
annotations, Markdown navigation, saved-work directories and saving.

**New installation:** [choose MRW for reading or add SagePod for computation](../docs/INSTALLATION.md).
The guide separates prerequisites, the current AI connector and optional Obsidian
links. Follow the [SagePod tutorial](../docs/GETTING_STARTED_WSL_SAGEPOD.md) for
the authenticated notebook connection, kernel selection and cell controls.
MRW 0.14.4 is distributed locally as a VSIX; a project-published Marketplace
listing and GitHub release download are not yet available.
The linked SagePod installation guide and source-build route require repository
access. The first-steps guide is bundled with the installed extension.

The extension moves retained-record inspection, response
review, exact passage retention and attributed note insertion onto the existing
Python core. It adds saved return locations and explicit Lean/browser handoffs.
It also supports selected-context request preview and a separate explicit Send.
VS Code owns ordinary files, editing, undo, saving, and document recovery.
The offline source-region reader supports informal mathematical arguments as
well as optional captured Lean evidence; see its independent boundary below.

## Open MRW

Click the **MRW** book icon in the Activity Bar. It opens **Reading Outline** and
the collapsible **Research Tools** view. Each Research Tools entry has a hover
description of the command’s target and effect. The empty navigator offers **New Reading
Overview**, **Open Reading Outline**, **Open Saved Source Outline…** and the
offline tutorial. The **New Reading Overview…** command also has a title-bar
button and an entry in the **…** menu; **Open Tutorial** is available in that menu
and through F1. **Open Reading Outline** uses an active Markdown overview,
reopens your remembered choice, or offers the native Markdown file picker.
**… → Choose Reading Overview…** lets you choose a different file at any time.
The menu also provides Refresh, Insert Outline Reference, saved-source opening,
explicit source creation/import and Show Artifact Location. The title bar retains
the Open and Return icons. Standard VS Code menus own view placement; previously
customized positions remain user choices.
**F1 → MRW: Open Reading Outline** also works.

The sidebar replaces MRW's default placement inside Explorer. It reuses the
same view/command IDs, document pointers and private records. Clicking its icon
registers/displays UI only; no source, provider, compiler or network action starts.

## Start a reading overview and learn MRW (0.13.0)

**MRW: New Reading Overview…** opens the native Save dialog for a new `.md` or
`.markdown` file in this workspace. It creates the starting page through VS Code's
file-edit and Save operations, opens its ordinary editor and selects it in Reading
Outline. Edit or remove the supplied headings as useful; later editing, undo and
saving belong to VS Code. Existing filenames are refused. Cancellation preserves
the current work; a failed first Save keeps the new editor draft and does not
report a saved selection.

The bundled [command guide](media/first-steps.md) covers source reading, annotations,
Markdown links, saved-work directories and the difference between editor Save
and Save annotation. It states that the empty Markdown template contains only
headings; the navigator selects headings and follows inserted source links.
**Open Tutorial** displays it through VS Code's Markdown preview with a read-only `mrw-help` document. No
private study is created, workspace switched or service started by opening help.
The tutorial is optional and opens only on request.

## Diagram theme (0.14.4)

Reader diagrams start in **Theme**, following the active VS Code light, dark or
high contrast theme. **Diagram appearance → Theme / Paper / Dark** supplies
explicit overrides. Theme changes only switch displayed images through CSS;
notes, drafts, SVGs and TikZ code remain unchanged. The 08ZH overview SVG adapts
to the color scheme supplied by that stylesheet in the native Markdown preview.

For saved overviews, Return uses **Reopen as Preview** when VS Code provides it,
replacing the source tab with its preview. Older hosts use the preview command.
Unrelated Untitled drafts are preserved.

## Rendered overview on Return (0.14.3)

**Return to reading outline** opens VS Code's rendered Markdown preview. Closing
the overview editor and preview tabs does not change this: Return recreates the
preview from the checked overview. The ordinary Markdown editor remains available
for edits. Existing exact return checks, unsaved text and proof controls remain.

## Return after opening a saved source directly (0.14.2)

**Return to reading outline** reopens the selected overview even when the source
was opened directly. It uses the live overview or remembered file and restores
a matching selection. If no overview is available, choose a Markdown file;
cancellation keeps the reader. An unrelated active Markdown editor is ignored.
Returns from a source link still select that exact occurrence, with the same
changed-text and workspace checks.

## Reader controls after Return (0.14.1)

**Return to reading outline** leaves local reader controls usable. An error
notification can remain open while other actions continue. When an idle reader
becomes visible again, its controls recover without refreshing its records or
clearing drafts. Controls for a pending action remain guarded.

## Import an Obsidian note (0.14.0)

**MRW: Import Obsidian Note…** offers three destinations: saved source outline,
reader annotation on a passage, or text inserted at a Markdown overview cursor.
Select one `.md` or `.markdown` file. The original stays unchanged; links and
embeds remain text. The retained-source route preserves bytes and previous
annotations on repeat imports. An overview insertion stays unsaved until Ctrl+S.
See [destination behavior and limits](../docs/OBSIDIAN_WORKFLOW.md#import-note-text-0140).

## Rename a study folder (0.12.0)

In the existing single-folder study workspace, save work and run **MRW: Prepare
Folder Rename…**. It verifies/moves saved artifacts to host-local storage outside
the folder and remembers a convenience locator. Close the workspace, rename with
your ordinary file tools, reopen the new folder in the same host/profile and run
**MRW: Reconnect Saved Work After Folder Rename…**. Choose the prepared study and
confirm its mapping. Existing exact references and saved annotations retain their
identities. Occupied stores are never merged or overwritten.

Prepare each nested study separately before renaming a parent. This does not
rename folders itself, infer identity by filenames or transfer editor recovery,
unsent requests, live drafts or UI pins. Historical original-file paths stay
unchanged; retained text stays available. [Steps](../docs/FOLDER_RENAME_WORKFLOW.md),
[validation and host limits](../docs/FOLDER_RENAME_VALIDATION.md).

## Ask AI from the source reader (0.11.0)

Click **Ask AI about this passage…** beside a visible retained passage, or use
the reader toolbar's **Ask AI about a passage…** chooser. **F1 → MRW: Ask About
Reader Passage…** opens the same chooser. Enter your mathematical question and
choose the OpenAI model, or configure `mrw.model` in User/Remote settings.
The current reader supplies the workspace; no ordinary text-editor selection
is required.

The core resolves the existing scoped passage reference. The preview includes
its outline/region identity, exact source revision, scalar range and unchanged
quotation. Reader notes, unsaved annotations and supplied evidence are excluded.
An earlier changed/removed linked range has its own **Ask AI about the earlier
linked passage…** control and keeps its original text. Missing originals are
allowed; unavailable retained storage and wrong scopes are errors without repair.

Review the full request, then choose **MRW: Send Exact Preview** with that preview
active. This reuses the existing OpenAI Responses connector and attributed
response review. `OPENAI_API_KEY` must be configured in the environment inherited
by the WSL extension host; a Copilot sign-in does not configure it. Preparation
needs no key or provider request. No automatic Send or retry occurs. Finish or
discard an existing unsent request before starting another from the reader.
Return by selecting the still-open source-reader tab; annotation drafts remain
there. Retain/edit any contribution explicitly, keeping AI attribution separate.

This is direct bounded assistance, without automatic outline generation,
proof checking or a new conversation backend. See
[workflow and validation](../docs/READER_AI_WORKFLOW.md).

For the current [manual Codex companion workflow](../docs/READER_AI_WORKFLOW.md#temporary-companion-codex-in-vs-code),
copy the retained quotation and exact MRW passage reference into Codex, then
save useful responses with AI attribution. The user reports Codex installation
and successful sidebar startup in WSL: Debian; the passage exchange and attributed
retention remain untested in this setup. MRW API-key setup and Windows-backed
storage qualification remain deferred. [Reopen the existing study workspace](../docs/CODEX_CONTINUATION.md#reopen-the-existing-study-workspace-beside-codex)
to access its saved reader separately from this development checkout. No new
VSIX or desktop campaign is needed for this documentation follow-up.

## Workspace hosts and dependencies

Keep one extension and the existing Python core in the workspace environment.
Use VS Code's standard local Linux, WSL2 or Remote SSH to Linux host. Windows
VS Code can supply the UI while the workspace extension and Python run on Linux.
**Python 3.11+ is required on the workspace host**, normally as `python3`.
Configure a different interpreter through `mrw.pythonExecutable` in User or
Remote settings. This is one executable path, without shell arguments.
Ordinary reading and outlining require no Lean, SageMath, containers or model
provider. No npm installation is needed to run an installed VSIX.

| Arrangement | Evidence and intended support |
|---|---|
| Windows VS Code with WSL2 Debian | Scoped actual-host reader checks; installed-package results are in the validation report |
| Local Linux VS Code | Intended standard deployment; Linux bridge/service regressions pass, ordinary desktop-host validation remains separate |
| Windows VS Code with Remote SSH to Linux ARM64 | Scoped installed-VSIX reader/save/normal-close/reopen checks pass on Raspberry Pi 5, Debian 12, Python 3.11.2; see the validation report |
| Other Linux SSH hosts | Separate host validation; non-ARM Linux SSH is the next configuration check when available |
| Other compatible Raspberry Pi OS / ARM configurations | Separate validation targets; other OS images, 32-bit ARM and local Pi desktop use have not been checked |
| Native Windows backend | Separate deferred portability task |

These choices preserve existing source identity, provenance and private
publication protections. They introduce no TypeScript rewrite, custom remote
service or Windows persistence port. The configuration under test is recorded
separately from this architectural direction.

## Study notebooks with SagePod

Start with [the installation and connection tutorial](../docs/GETTING_STARTED_WSL_SAGEPOD.md).
Use [the SagePod notebook workflow](../docs/SAGEPOD_NOTEBOOK_WORKFLOW.md) to
connect Microsoft's Jupyter extension explicitly to an existing authenticated
SagePod server and select its actual `sagemath` kernel. VS Code/Jupyter supplies
ordinary `.ipynb` editing, mathematical rendering, saving and kernel controls;
SagePod supplies computation. MRW supplies the source reader and Markdown
overview references introduced in 0.5.0, with its Python core still on the workspace host.

Keep the notebook in the existing persistent notebook mount. Host `~/Jupyter`
and container `/home/sage/notebooks` are distinct paths to that mount. Use
relative ordinary-file links for notebook/overview/source movement and follow
MRW references explicitly in the Markdown editor. Copying those files does not
transfer private outline targets. Saved outputs do not restore live variables;
rerun deliberately in a fresh kernel when reproduction is required.

This companion workflow adds no MRW runtime or VSIX. Opening/restoring MRW starts
no container and executes no notebook cells. Notebook-cell assistance remains
pending. See [actual checks and limits](../docs/SAGEPOD_NOTEBOOK_VALIDATION.md).

## Obsidian companion notes

Version **0.7.0** retains the bridge that connects the existing Obsidian Zettelkasten with saved source
outlines and exact retained passages. Use **Copy link to this outline** or **Copy link to this passage** in the
reader, or run **MRW: Copy Outline or Passage Link…**, then paste the ordinary
Markdown link into the Obsidian note. Following it opens the reader without
requiring an active Markdown editor or cursor inside a reference.

For the reverse direction, open the desired note **in Obsidian** and run its
**Copy Obsidian URL for current file** command. In MRW, use **Link an Obsidian
note…** on the desired outline/region and paste that note's URL and short label.
**Open linked note in Obsidian** returns there. Multiple notes offer a readable choice;
**Manage linked notes…** changes only the association. Note URLs refer to
notes rather than containing their prose. Existing IDs, titles, YAML, `[[ID]]`,
`SEE ALSO` and `References` remain unchanged. Handwritten derivations and their
scans/references can remain in the ordinary Obsidian attachment workflow.

The Command Palette also offers **MRW: Link an Obsidian Note…**, **MRW: Open
Linked Note in Obsidian…**, **MRW: Manage Linked Notes…** and
**MRW: Open Link from Clipboard**. These choose an existing saved outline/region
without requiring a text editor. The latter also accepts a whole copied Markdown
link and provides explicit recovery after a wrong window receives an extension URI.

Workspace/host routing is separate from the existing private-store scope and
revision/range-pinned `mrw-outline:v1` identity. WSL routing uses the distribution
name; SSH requires **MRW: Navigation Workspace URI** in Remote settings. Wrong
windows offer **Copy Link and Open Workspace**, then explicit clipboard opening
in the intended workspace. No transient window ID/cached callback identifies a
target. Note associations use a separate bounded `obsidian-links.json` sidecar
with the existing mutable-file lock, previous-byte checks and durability rules.
Changed region ranges do not redirect earlier note associations.

Reader controls are grouped under **Whole outline**, **This passage**, and,
when needed, **Earlier linked passage**. A single linked note shows its stored
label beside **Open linked note in Obsidian**; multiple notes retain a readable
chooser. Empty groups explain how to add a return destination. Hovering the copy
or link button explains its direction; copying an MRW link creates no reverse
association. The read-only note view supplies parsed target metadata for these
labels using the existing Python parser; no stored record or reference changes.
The user reports the Zettelkasten integration is helpful in practice; broader
mathematical usefulness remains unassessed.

**Copying or synchronizing notes does not transfer MRW private targets.** There
is no Obsidian plugin, server, indexing, note rewriting or content sync. Native
Windows backend portability remains deferred. URL dispatch cannot confirm a
note exists; Obsidian reports missing notes and the reader explains association
replacement. See [the short click guide](../docs/OBSIDIAN_WORKFLOW.md) and
[configuration, desktop evidence and limits](../docs/OBSIDIAN_VALIDATION.md).
Interoperability establishes no mathematical usefulness.

## Saved artifact location (0.7.0)

Patch **0.13.1** names the commands **Open Saved Work Directory…** and
**Move Saved Work Directory…**, preserving their IDs. Open connects the workspace
to records at the supplied directory; Move transfers records to a new directory.
Readers are released before a completion notification appears. Dismissing that
notification is not required to continue. Input and confirmation dialogs still
block competing record operations until completed or cancelled.

Run **MRW: Show Artifact Location**, then **MRW: Move Saved Work Directory…**
to move this workspace's saved sources, outlines, annotations, evidence, linked
notes' addresses and required investigation records. The command shows source,
destination and project scope before confirmation, verifies the staged bytes,
commits one host-local active binding and cleans exact old owned payloads.
Save reader drafts first; stale clients cannot write to the retired location.
**MRW: Recover Artifact Move** handles interruption/uncertain durability and
retries committed cleanup. **MRW: Refresh Artifact Location** rebinds updated
windows while keeping drafts. `mrw.artifactMoveDestination` is a suggestion only.

**MRW: Open Saved Work Directory…** verifies a complete synchronized copy
and explicitly maps its projects into an empty/unbound workspace. It never
merges stores or invents missing records. Logical store/project IDs and verified
legacy mappings preserve `mrw-outline:v1` references and exact pinned ranges.
On a different host, open the adopted mapped workspace and use **MRW: Open Link
from Clipboard**; old saved routing is not a guessed local workspace address.

The default remains existing workspace storage. Managed stores keep immutable
`store.json`, a complete hash-verified `HEAD.json` and payload generations under
`versions/UUID/payload`. Bindings, journals, locks and reservations stay under
host-local `artifact-runtime`; same-installation UUID exclusion is in host-local
global storage. Each ordinary write publishes a complete generation. Runtime,
credentials, caches, return markers and ordinary document recovery stay local;
notes, notebooks, original sources and unrelated files are not moved. Qt's
persistence is unchanged. Required external investigation records are retained
without deleting their originals.

The current `/mnt/c` DrvFS mount reports `0777` for private files/directories
and is rejected before commit. Without metadata those bits reflect the Windows
user's access; they do not prove access by all Windows accounts. A
[scoped metadata/ACL trial](../docs/WSL_ARTIFACT_STORAGE_SETUP.md) was separately
authorized and configured. A disposable move/save/reopen and local Windows-created
receiving-copy checks pass, but nested probe replacement denials remain unresolved.
The real store remains unmoved; this setup is not yet qualified for real work.
The approved [controlled comparison](../docs/WSL_ARTIFACT_STORAGE_COMPARISON.md)
passed 3/4 probes before, 4/4 paused and 3/4 resumed, with the Windows client's
folder independently verified unpaused afterward. The subsequent approved
paused transaction check stopped at the first test's preflight replacement
denial, before commit. Synchronization/configuration were restored; pausing is
not a qualified remedy. No further retry campaign ran.
A later user-requested case passed with Obsidian fully exited and Syncthing
unpaused/unchanged. It verifies one disposable core move/save/reference case,
not a normal application restart or desktop navigation under that condition.
No causality, necessary-closure or real-store support claim follows from it.
Other mounts need their own checks; do not weaken publication or mode checks.
Only the new test directory's private ACL and separate mount were changed;
existing mount/ACL/synchronization settings remain intact.
Local locks do not coordinate computers; stop writing and complete synchronization
before handover. No second-host synchronization acceptance is claimed.
See [scope, filesystem requirements and recovery](../docs/ARTIFACT_STORAGE.md)
and [actual validation](../docs/ARTIFACT_STORAGE_VALIDATION.md).

## TikZ diagrams in reader notes (0.10.0)

Save an annotation containing a `tikz` fenced block, open **Reader notes (N)**,
then choose **Render diagram**. The existing Linux/WSL pdfLaTeX and Poppler tools
run inside bubblewrap only on that explicit action. The SVG is validated and
retained beside the outline, keyed to the annotation and exact saved code.
Saving, opening, refreshing, restoring, moving artifacts and changing appearance
do not compile. Missing originals do not block valid retained images; changed
code cannot acquire an earlier rendering. Unsaved form text survives replies.

**Diagram appearance → Theme / Paper / Dark** is a workspace UI preference.
Theme follows VS Code and is the default. Dark adapts
black/white drawing values while keeping other colors and the original SVG.
Use normal TikZ colors such as `\draw[red]`. Notes keep their exact editable
source and attribution. Rendering creates no mathematical evidence or graph.

This first renderer requires installed native **pdfLaTeX**, **Poppler**
(`pdftocairo`/`pdfinfo`) and **bubblewrap** under `/usr` on Linux. Reading retained
SVGs does not require those tools. There is no bundled TikZJax engine or native
Windows backend support. The job has isolated filesystem/network, no shell
escape, bounded resources and no unsafe fallback. One block must produce one
page, and output must fit the self-contained SVG profile. Missing packages,
unsupported output and failed jobs report errors and preserve prior valid output.
Publication uncertainty retains drafts and blocks writes under existing rules.

[Full examples, bounds and persistence](../docs/TIKZ_WORKFLOW.md),
[actual host results and limits](../docs/TIKZ_VALIDATION.md). Ordinary Markdown
preview and Obsidian remain separate host/plugin workflows; this feature neither
installs another extension nor changes their notes.

## Alphabetical tools and source refresh (0.13.3)

**Research Tools** lists commands alphabetically, including contextual actions.
**Refresh saved source outline** appears on the source reader’s top toolbar,
in Research Tools while a source is open, and as **MRW: Refresh Saved Source
Outline** in the command palette. It reloads saved annotations and source status
without saving or discarding unsaved annotation text.

## Delete reader notes (0.13.5)

**Delete note…** appears beneath each saved annotation in Reader notes and
Source notes. Confirm the quoted note and passage to remove it. Unsaved edits to
that note are discarded only after deletion succeeds; other notes and drafts
remain. Cancellation or an unconfirmed publication keeps the live text.

## Notes beside their passages (0.13.2)

Saved **Reader notes (N)** appears beneath the statement or proof it annotates.
It remains accessible when a proof is folded. Notes about the whole source use
**Source notes (N)** near the source heading. There is no combined notes section
at the bottom. Each disclosure starts closed and keeps its own live open/closed
choice across replies. Editing forms remain under Source details and tools;
folding a note or proof preserves drafts, attribution, exact text and diagrams.
This changes display placement only; no saved record is rewritten.

## Compact hidden details (0.9.4)

A hidden published proof uses a compact **▸ TAG — Proof** row, rather than an
empty card. Select it to expand the exact proof. **Reader notes (N)** is a native
disclosure, initially closed; its heading opens or closes the saved notes. The
choice survives live refresh/save replies and preserves note text, attribution
and separate editor drafts. Folding these displays invokes no record write.

## Annotation mathematics (0.9.3)

Reader explanations, questions and other annotations can include TeX equations:
`\( ... \)` inline, and `\[ ... \]` or `$$ ... $$` for displayed mathematics.
Saved overview and passage annotations use bundled KaTeX 0.19.0 with its local
auto-render helper and native MathML. The ordinary editor keeps the exact text;
the reading view offers **Exact annotation text**. Existing Unicode notes remain
readable, without automatic rewriting. This is mathematics within plain prose;
HTML, Markdown links and URLs remain literal, and single dollar signs stay text.

Malformed or unsupported notation keeps its exact text with a visible warning.
Expressions have separate macro state, bounded expansion and untrusted mode,
as in the source reader. Rendering needs no stylesheets, fonts, remote service,
TeX process or checker. Attribution and the explicit Save boundary are unchanged.

### Choose the level of detail

Use **Hide proofs / Show proofs** in the reading toolbar to keep published
statements visible while choosing their detail. A proof has its own **Show proof /
Hide proof** control. These published-proof controls change the reading view,
preserving source records and drafts. The initial preference survives reopening
through host-local workspace UI state; individual expansions last for the live
view. A direct proof reference reveals its exact destination. Manual regions
offer Show/Hide details, using the existing saved expansion action when needed.

This supports the top-down outline principle as a reader supplies or develops an
outline. The broader deductive model preserves claims, joint premises, local
scope and expansion of suppressed steps. The separate 0.15.0 proof-outline view
now implements source-based inference graphs and reversible display deletion.

## Statement and proof reading (0.9.2)

A published statement with an unchanged associated proof has a direct **Proof ↓**
link. The proof has **Statement ↑** for the return. These links use the retained
import's explicit roles and tag, with exact source-span matching. Multiple
published proofs stay separately reachable. A changed association is reported;
it never sends the reader to a different passage labelled as the old proof.
A collapsed matching proof can be opened for this view without changing its
saved collapse state or any source bytes. This adds no inference or proof graph.

All region annotation forms, evidence controls, linked-note actions and editing
settings live under **Source details and tools → Notes and tools: REGION**.
They do not sit between a statement and the next proof. Existing reader notes
are displayed separately after the retained source text, with their attribution;
editing still requires the explicit existing Save action. Exact retained TeX
remains available in each source card. Sources without explicit published
statement/proof metadata retain manual region navigation; no pairing is guessed.

### Annotation save feedback

**Save annotation** shows **Saving annotation…**, then **Annotation saved.**
after the existing core confirms publication. The host status bar also reports
that the submitted annotation was saved. Open source tools and the note editor
stay open across the reply. Existing note editors start collapsed; their saved
text is readable in Reader notes beneath its passage.

Typing while a save is in flight is preserved. The reply says **Submitted version
saved. Your newer edits are still unsaved.** when it did not cover the newest
text. A failure says **Save not confirmed** beside the editor, retains its text
and keeps the existing uncertain-publication write block. Saving is explicit;
there is no retry or automatic save.

## Reading presentation (0.9.1)

Following a source from **Reading Outline** expands the active reader group and
hides the side bars using VS Code's standard layout command. Source text comes
before passage tools; metadata, source controls and bibliographic editing live
under **Source details and tools**. **Return to reading outline** stays available
while scrolling. Return expands the originating Markdown editor and reopens the
navigator. Documents remain open under VS Code ownership.

The navigator shows the short citation title, with its full original label in
the tooltip. Markdown text is unchanged. A matching, expanded published passage
opens its rendered source card directly. Exact TeX remains under that card's
source disclosure or the explicit source tools. Changed/removed associations,
edited published ranges and collapsed passages retain the exact pinned-text
fallback; no current card substitutes for an earlier reference. Reader annotations
and supplied evidence remain separate and accessible. This patch changes no
store, reference, source or mathematical checking status.

## Navigable reading outlines (0.9.0)

Patch **0.11.1** preserves the previous successful source's return pin if a
later reference fails while the overview is edited. A candidate return location
tracks edits during source opening and replaces the old pin only after the
target opens. Overlapping edits still block exact return; undo to the original
text restores it. Ordinary documents, saved sources and later reader features
remain in place. See [the renewed validation](../docs/READING_OUTLINE_VALIDATION.md#reading-navigator-recheck-and-return-race--2026-11-03).

Run **MRW: Open Reading Outline**. Patch **0.12.1** uses the active ordinary
Markdown overview or the remembered overview, including a still-open untitled
document. If none is available, or the remembered file is missing, it offers
VS Code's native Markdown file picker. Cancel leaves the current navigator,
drafts and saved choice intact. **Choose Reading Overview…** in the view's
**…** menu or command palette always offers the picker to change that choice.
Files must belong to this workspace; MRW does not search for a replacement.

The **Reading Outline** view in the MRW sidebar shows its headings and existing MRW
references. Expand/collapse sections; click a heading to select its line, or a
source link to open the existing reader and its exact retained passage.
**MRW: Return to Reading Outline**, the view's back arrow, or the reader's
**Return to reading outline** button selects the originating Markdown occurrence.
Return then opens the rendered overview, recreating its preview if closed.
The same passage may appear several times with separate return destinations.
If the source was opened directly without a source-link origin, Return opens
the selected overview or offers a file choice instead.

Continue using **Insert Outline Reference…** in the ordinary Markdown editor.
Reorganize headings, explanations and questions with normal editing and undo.
The navigator refreshes from live text, including unsaved edits; **Refresh
Reading Outline** is also explicit. Opening/refreshing the view invokes no
Python bridge or acquisition. Following references reuses the original resolver
and retained reader without import, model, compiler, notebook or container work.

The bundled CommonMark parser recognizes ATX/Setext headings, inline/reference
links, autolinks and bare MRW references. Code fences, indented code, inline code,
images and HTML comments supply no navigation links. Unicode and escaped labels
are decoded for display; repeated headings/references keep separate occurrences.
Markdown extension plugins and Obsidian-specific syntax are not interpreted.
The document limit is 4 MiB / 10,000 headings and references. Long display labels
are bounded; their underlying destinations retain exact positions.

Save/close/reopen the overview normally and run **Open Reading Outline** again.
The view reconstructs from that document, restoring collapsed sections and the
last selected location when its text revision still matches. From a source view,
the same command can reopen the last selected saved overview in this workspace.
There is one selected overview per window. Untitled overviews work live; their
text and recovery remain VS Code's responsibility, and MRW persists no untitled
navigation pin. Preferences for the selected saved overview and one exact return
pin use VS Code workspace state; no prose, vault copy or source record is stored
there. Startup registers the view without opening or reading the overview.

A live return pin follows edits wholly outside its selected syntax. An overlapping
edit blocks return; undo to the exact captured document restores it. After close
or restart, mismatching text blocks an old return instead of guessing a matching
heading/link. **Open Reading Outline** reconstructs current destinations so the
reader can choose a new location. Missing originals do not block retained
reading. Missing/incompatible retained storage or another workspace's scope
fails clearly through existing checks without replacements or workspace search.
See [examples and ownership](../docs/READING_OUTLINE_WORKFLOW.md) and
[validation](../docs/READING_OUTLINE_VALIDATION.md). Broader proof-outline analysis
remains pending. The later user-reported explanatory benefit for 08ZG is recorded
separately from functional checks and general usefulness.

## Manual Markdown overviews across sources

Version 0.5.0 provides the first manual overview spanning several sources. Write
ordinary Markdown about a subject, book, monograph, article, section or argument.
Describe purpose, concepts/results, governing ideas, connections, questions and
optional details in your own order. No template, questionnaire, hierarchy or
compulsory reading sequence is required. VS Code owns editing, saving, undo,
document recovery and Markdown preview. This prose is reader synthesis.

In a Markdown document belonging to the current workspace, run **MRW: Insert
Outline Reference…**, choose an existing saved source outline, then the whole
outline or a saved region. An untitled Markdown document can use a chosen
workspace folder and later be saved normally. The action inserts one inline
reference at the cursor; it does not replace selected prose or save the file.
Undo/redo and ordinary edits use VS Code. The readable label includes supplied
title/known bibliography (otherwise the source filename), source locator,
region range when selected and a retained-revision identifier. Missing metadata
is not invented. Labels snapshot citation text; later reader edits do not
silently rewrite the Markdown.

Place the cursor in a reference's label or URI in the Markdown editor and run
**MRW: Follow Outline Reference at Cursor**. It opens the existing reader; a
region reference also opens the retained source in a read-only plain-text view
with the exact passage selected. Preview-click integration is not implemented;
use the explicit command in the Markdown editor. Generic links and document
content are never interpreted as executable MRW commands.

The [reference contract](../docs/PROOF_OUTLINES.md#first-manual-overview-across-sources--reference-contract-2026-10-16)
binds a versioned `mrw-outline:v1/…` URI to the canonical project/private-store
scope, outline UUID and exact retained source revision. Region references also
pin the region UUID and half-open range (1-based lines, 0-based Unicode scalar
columns). Annotation edits do not invalidate them. If a region is changed or
removed, the reader reports the changed association and opens the earlier pinned
retained passage, selecting no replacement region. It does not follow the new
range. Whole-outline references expose the current reader annotations over the
pinned source, not a snapshot of mutable annotations.

Changed or missing original files do not prevent exact retained access. Missing
outlines, unavailable/corrupt retained storage, malformed references and a
different workspace/storage scope produce clear failures without changing the
Markdown, creating replacement storage or searching other projects. Following
only reads/navigates; it neither changes outline visibility nor publishes state.
References confer no proof-checking status or verified dependency relation.

**Copying Markdown alone does not transfer private outlines or retained sources.**
References require their original scope or an explicitly verified moved/adopted
store mapping. This
increment supplies no cross-machine transfer, synchronization, automatic
overview generation, source discovery, inference graph or elimination witness.
See [focused host checks and limits](../docs/VS_CODE_OVERVIEW_VALIDATION.md).

## Import a Stacks Project section (0.8.0)

Run **MRW: Import Stacks Section…** and enter `08ZD` or its official section
URL. After acquisition, confirm the displayed section identity, Git revision
and destination. The source reader shows opening context and direct buttons for
each statement/proof. Mathematical notation uses bundled KaTeX 0.19.0 generating
native MathML only; no downloaded TeX/scripts execute and no rendering network
request is made. **Exact retained TeX for this passage** and **Open retained
source** preserve the original text. Local citation buttons select the original
statement span; canonical citation buttons explicitly open the browser.

Use existing attributed **Save annotation**, copy-link and Obsidian actions.
**Open Saved Source Outline…** reopens offline. Same-revision import preserves
annotations; changed revisions are separate outlines. No automatic updating,
whole-corpus ingestion or complete proof graph is claimed. See
[workflow, source/format limits](../docs/STACKS_WORKFLOW.md) and
[focused validation](../docs/STACKS_VALIDATION.md).

Imported outlines use source-outline schema v2, adding only an acquisition-kind
and retained manifest artifact ID; ordinary v1 outlines remain unchanged. The
full exact chapter is the existing immutable source blob. Matching `tags/tags`,
`preamble.tex`, `COPYING` and the import manifest are ordinary retained supporting
artifacts. The manifest records file hashes, upstream commit/time, source
structure and original pinned spans. Rendering is rebuilt offline from these
bytes. Imported source paths name capture-time private blobs, never a fabricated
original user document. Navigation uses the retained view even after a move;
historical paths remain provenance. No storage inventory/reference-format or
logical store identity changes are introduced. Host-local preparation tickets
contain only workspace/scope/packet digest, never source prose or credentials.

## Offline source-region reader

Open a saved UTF-8 mathematical text, select a passage, and run **MRW: Create
Outline from Saved Source**. An empty selection creates an outline without
regions. **Add Selected Source Region** adds more passages; select a card in
the reader and use **Replace Selected Outline Region Range** to revise its
range. The original or **Open retained source** text view supplies positions.
The source stays unchanged; ordinary source edits, saving and undo belong to
VS Code. Save or undo source edits before capturing original-file selections.

Each card offers **Hide argument detail**, **Expand exact source**, and source
navigation. **Use Selection as Exact Statement** records a separate exact
statement, labeled either reader-selected source text or a reader-labeled
declaration statement. **Keep Selected Hypothesis / Cited Result** retains
source quotations of hypotheses, definitions, local assumptions, citations or
references. These remain accessible while details are hidden. They describe
available context, not necessary or jointly used premises.

Each shared-context quotation has an editable reading role and reader label;
choose **Save context description** to persist them. To replace its quoted
range, select exact original or retained source text, run **Replace Shared
Context with Selection…**, and choose the context item. **Remove shared
context** removes that reading selection. These actions leave source bytes,
statements, other context and reader annotations intact; **Open retained
source** still exposes the original hypotheses and argument.

Use the editable overview and region annotations for governing ideas,
intermediate claims, reconstructions, intended inferences, cited dependencies,
reusable lemmas, questions, suspected gaps and proposed repairs. Choose a
purpose, supplied origin and optional author, then **Save annotation**.
Reader text has its own attribution and never inherits a source's checking
status. Imported AI material can be labeled as such; this command makes no
model request and does not fabricate a ModelCall. Retain an existing response
or other provenance artifact explicitly when available. Unknown authorship,
edition/revision, translator or other provenance stays unknown.

Orientation, central concepts/results, governing ideas, argument structure and
technical detail can be visited through the reading-level filter in any order.
A reader can record reliance on a cited result while deferring its proof.
This is manual navigation, not automatic Kallenberg guidance or prerequisite
analysis. Textbooks, monographs, articles and AI-generated or AI-assisted
manuscripts use the same reader. Lean is optional.

**Attach Recorded Outline Evidence…** retains an existing UTF-8 artifact without
alteration or rechecking. Label supplied declaration statements separately from
intermediate tactic goals. For the captured native Lean JSON array format
(`label`, `result.goals`), choose a supplied snapshot explicitly; its local
context is available assumptions. Region associations are manual, not verified
correspondences or inference graphs. Other UTF-8 artifacts are available in a
read-only plain-text view. No tool is run to create missing evidence.

In an evidence card, choose a region and, for recorded goals, a supplied
snapshot, then **Save manual association**. **Remove region association**
keeps the artifact as an outline-level reference, including its selected
goal/context and **Open retained artifact** action. It can be associated with a
region again later. Removing a reading association changes no original
statement, hypotheses or checking evidence and deletes no retained bytes.

**Open Saved Source Outline…** restores saved selections, descriptions,
annotations, evidence and hide/expand settings after restart. A changed,
redirected or missing original is reported and source navigation refuses to
guess. Expansion and further selections can use the exact retained revision.
Refresh checks original-file status explicitly. Each action also validates its
private state revision; concurrent edits are rejected. A retained blob that is
missing or changed produces an error, while saved annotations remain readable.

Selections are 1-based lines and Unicode scalar columns pinned to a raw-byte
SHA-256 revision; host UTF-16 positions are checked at capture/navigation.
Expansion sets `pre.textContent` from retained text, preserving selected Unicode
and line endings. Native text views may normalize displayed line endings; they
are navigation surfaces, not the expansion-fidelity test. A retained BOM remains
in the blob and is excluded from host coordinates. No OCR/PDF transcription
fidelity is implied by retention.

### Outline persistence boundary

The independent Python `source_outlines.py` service reuses `SourceDocument`,
bounded file reads, immutable private publication and synchronized exact-previous-
byte mutable publication. It does not import Qt or duplicate editor buffers.
By default, under `context.storageUri/outlines-SHA256(canonical-project)/UUID/`, exact source
and supporting-artifact bytes are immutable `0600` blobs; `outline.json` is
versioned private mutable navigation and reader work. It writes nothing into
the source project and imports no Qt workspace/recovery data. The format uses
the existing Source/SourceOccurrence/VersionedSpan and attributed Representation
boundaries; it is not a universal proof schema or an immutable warrant record.

Reader forms keep unsaved drafts in the live panel across re-rendering and
failed publication. Text entered while a save is pending survives its reply;
only the submitted version is saved until another explicit save. Save explicitly
before closing/reloading; unsaved form drafts have no crash/restart recovery.
Failed or uncertain private publication
keeps the view and drafts, blocks further private writes for that project until
host reload, and leaves retained blobs unchanged. State published before a
directory-sync failure may be present on reopen; failure is never called a
successful save. Same-project concurrent host processes remain unsupported.

Supported sources: saved UTF-8 `.txt`, `.md`, `.markdown`, `.tex`, `.rst`, `.org`,
`.lean`, at most 2 MiB. PDF regions/pages, OCR, notebook cells, rendered TeX,
binary and non-UTF-8 formats are unsupported by manual capture. The bounded
Stacks adapter above separately supplies derived mathematical rendering from
retained TeX; it does not import arbitrary rendered documents. Bibliographic locators are free
text (section/theorem/page/reference); actual selection locators are text ranges.
At most 64 regions (256 KiB each), 32 contexts (64 KiB each), 2 MiB aggregate
selected text, 16 supporting artifacts (2 MiB each), 32 annotations per overview
or region (16 KiB each), 512 KiB private state, and 100 listed outlines per project.
The list does not silently page or discard work beyond that bound. There is no
user-facing outline/artifact deletion or history browsing, automatic cross-machine synchronization,
or range undo. Context removal and evidence detachment affect only reading
associations.

Opening, editing annotations, hiding, expanding, navigating retained text and
restoring make no compiler/provider calls. Navigating an original Lean source
may independently activate an installed Lean extension; that is not an MRW
check. No Verification, premise admission or inferred human judgment is created.
General automatic extraction, AI proposals, automatic gap detection, verified joint-
premise graphs and elimination witnesses remain pending. This reader partially
implements the accepted proof-outline requirement; faithful expansion does not
establish correctness. See [focused validation](../docs/VS_CODE_OUTLINE_VALIDATION.md).

## Run from this checkout

Prerequisites: VS Code 1.85 or later and Python 3.11 or later on the extension
host. Scoped installed-reader checks cover WSL Debian and Remote SSH to Debian
ARM64; see the host table above for limits. There are no npm runtime
dependencies and no Qt dependency for extension actions.

1. Open this `vscode/` directory in VS Code.
2. Run `python3 scripts/bundle-core.py`, or use the provided F5 launch task.
3. Press F5 to launch an Extension Development Host. Open a trusted local
   mathematical project there. Under Remote WSL/SSH, Python and source paths
   belong to that remote host.
4. Open the **Mathematical Research** view in Explorer, or search **MRW:** in
   the Command Palette.

If Python is named differently, set `mrw.pythonExecutable` in User or Remote
settings. It is one executable path, without arguments or a shell template.
The development bundling task separately uses `python3`; run the bundling
script with the available Python executable if necessary.

## Package and install a VSIX

Build in the Linux workspace checkout with Python 3.11+, Node.js 22+ and npm. The committed
lockfile pins the development packager, **@vscode/vsce 4.0.0**. From the repository
root:

```sh
npm ci --prefix vscode --ignore-scripts
TZ=UTC SOURCE_DATE_EPOCH=1792094267 npm run package --prefix vscode
npm run verify-vsix --prefix vscode -- theorem-terminal-0.14.4.vsix
sha256sum vscode/theorem-terminal-0.14.4.vsix
```

In WSL, use Linux Node and npm for this build; a Windows npm launcher cannot
run the Linux prepublish chain. Node/npm are development packaging requirements,
separate from the installed extension's Python dependency.

Packaging runs the existing `vscode:prepublish`/`bundle-core` hook, copying the
current repository Python core, JSON data and Apache license. The verifier
compares every runtime JS/Python/data/license byte to this checkout, checks the
production manifest and rejects missing or unexpected archive files. The
package excludes development tests, scripts, staging configuration, caches and
packaging dependencies. Generated Python copies, dependencies and VSIX files
are ignored by Git. The recorded epoch is the timestamp of the completed
prior delivery baseline `b776368`; vsce uses it for stable ZIP timestamps
and entry ordering. UTC avoids host-timezone differences. The earlier delivery produced identical archive bytes from two builds with its
recorded Node/npm/packager versions; use those
versions when reproducing the delivered SHA-256. Record the hash of the actual
file. This procedure packages locally and does not publish to the Marketplace.
The earlier 0.7.0, 0.6.1, 0.6.0, 0.5.0 and 0.4.1 archives are preserved separately. Reproduce its recorded hash
from packaging revision `15ba6cd`, with its prior epoch `1792079077` and recorded
tool versions, in a separate checkout. The companion artifact and its focused
checks are recorded in [the Obsidian validation report](../docs/OBSIDIAN_VALIDATION.md).

Open an ordinary window for the intended Linux workspace: local Linux, the
chosen WSL distribution, or an SSH-connected Linux host. Choose **Extensions:
Install from VSIX…** and select the package. In a remote window, check that MRW
appears under that workspace host's **Installed** extensions, rather than only
under the local UI's extensions. Alternatively, in that connected window's
integrated terminal on the workspace host:

```sh
code --install-extension /absolute/path/to/theorem-terminal-0.14.4.vsix
code --list-extensions --show-versions
```

The extension identity is **flengyel.theorem-terminal**, version **0.14.4**.
Reload the window if VS Code requests it. Open a trusted ordinary Linux workspace
and run an **MRW:** command from the Command Palette; F5 or a development manifest
is unnecessary. Python 3.11+ must be available on that host (normally
`python3`); no Qt or Lean installation is required for the offline reader.
The bridge runs `python3 -I` with `python/bridge.py` under the installed
extension and loads that directory's bundled core. It does not import the
checkout or an independently installed `theorem_terminal` package.

Installation keeps the existing extension identity and default private-state paths.
Only the explicit artifact move/adopt commands change the active binding.
Do not delete workspace storage to install or upgrade. Saved outlines are
reopened explicitly with **MRW: Open Saved Source Outline…**; save reader forms
before closing. Native Windows backend portability remains deferred; run the
workspace extension and Python on Linux. See the [installed-package validation](../docs/VS_CODE_OUTLINE_VALIDATION.md)
for the tested workflow and remaining limits.

### Windows UI with a Linux SSH workspace

Install Microsoft's **Remote - SSH** extension in Windows VS Code. Confirm that
the Windows SSH client can log in to the chosen Linux host, then use **Remote-SSH:
Connect to Host…** and open a folder on that host. If Remote - SSH selects an
unusable SSH executable from PATH, set `remote.SSH.path` in Windows User settings
to the working SSH client. An extra terminal suite is unnecessary.

Check `python3 --version` in the connected window's **remote** integrated
terminal. Copy the VSIX to that host using an ordinary file-transfer tool, then
run the `code --install-extension` command above there. A terminal explicitly
labeled **Local** runs on the UI computer and does not install into the Linux
workspace host. Confirm MRW is installed under the SSH host's extensions.
Authenticate and trust only the intended workspace through VS Code's prompts;
no global trust choice or MRW state reset is needed. Save reader forms before
normal close/reopen and explicitly reopen the saved outline.

The [Pi host check](../docs/VS_CODE_OUTLINE_VALIDATION.md#remote-ssh-on-raspberry-pi-5--2026-10-15)
used Remote - SSH 0.128.0, the Windows OpenSSH client and the unchanged 0.4.1
VSIX. It required no source checkout, Python package installation, Qt, Lean or
SageMath on the Pi. This checks the offline reader; optional integrations and
other host configurations need their own evidence.

### Reproduce the bounded outline host checks

The [outline report](../docs/VS_CODE_OUTLINE_VALIDATION.md) records the two examples,
repairs and limitations. Keep the pinned full Subgraph source from reconnaissance
at the path expected by `scripts/prepare-host-tests.py`; preparation checks its
exact digest and never downloads it or invokes Lean. Then run from the repo root:

```sh
python3 vscode/scripts/bundle-core.py
python3 vscode/scripts/prepare-host-tests.py --artifacts .codex-work/vscode-host-outline-run --outline-phase seed
```

Open the printed staged extension/project in a normal Windows VS Code/WSL
development host with remote URIs and without `--extensionTestsPath`. Keep the
window in the foreground. The bootstrap guards the one-shot Python bridge
against network connections and child tool processes, scripts dialog choices,
and exercises the actual webview DOM. Wait for `outline-seed.json` to contain
`complete: true` with no `failure`, then close normally. Prepare the same staged
extension/project using `--outline-phase restart`, relaunch, and require the
same completion criteria for `outline-restart.json`. That phase changes/deletes
only disposable source copies. An optional `--outline-phase refine` after closing
checks precise statement labels and restored editor-group reuse. Test artifacts
are private generated files; only the reviewed reports/digests are committed.
Production logic contains no theorem names, corpus paths or source line numbers.

For the bounded context/evidence editing follow-on, use an ordinary disposable
project; the full pinned source and previous seed campaign are unnecessary:

```sh
python3 vscode/scripts/bundle-core.py
python3 vscode/scripts/prepare-host-tests.py --artifacts .codex-work/vscode-host-associations-run --outline-phase associations
```

Launch the printed staged extension/project as above. Require
`outline-associations.json` to complete without failure, close that host normally,
then prepare the same artifacts directory with `--outline-phase associations_restart`
and relaunch. Require `outline-associations_restart.json` to complete without
failure. These phases test association edits/removal, newer typing during a
pending save, retained access, failed publication and restart persistence with
guarded offline bridge calls. They do not repeat the previous two-source campaign.

## Workflows

**Ask about selected work.** Select ordinary text, including unsaved or untitled
work, then choose **Ask About Selected Work**. Enter the mathematical question
and a model identifier (or set `mrw.model` in User/Remote settings). The complete
request opens as a read-only plain-text preview. **Add Selection to Request**,
**Remove Request Context**, and **Edit Mathematical Question** produce a new
preview. Up to eight captured passages may be included; removing all of them
sends only the question and the displayed no-context notice. Later document
edits do not alter an already captured passage. To use changed text, remove the
old context and select the new passage explicitly.

With the current preview active, choose **Send Exact Preview**. This is the
only provider action. The Python service reads `OPENAI_API_KEY` from its inherited host
process environment at Send time; start VS Code/its remote server with that
variable configured. Never put credentials in workspace settings or notes.
The existing adapter performs one attempt with its existing limits and retains
an immutable terminal ModelCall in VS Code's private workspace storage. The
preview shows its exact destination. No automatic retry occurs. A known preflight rejection retains the question
and selected contexts, reports **not sent**, and requires a new preview before
another Send. Completed answers open through the existing attributed response
review, pinned to the exact retained-record digest; failed, refused,
and incomplete outcomes remain distinct. A timeout or host interruption can
leave the outcome uncertain: inspect the shown record destination before a new
request. The extension cannot prevent closing the host while transmission is
in progress. Unsent drafts are memory-only and are discarded on host restart;
terminal records survive independently. R3's explicit linked continuation and
private task resumption are described below.

The preview includes captured source identities, hashes, scalar positions,
selected text, instructions, exact request JSON, limits, disclosure, and output
path. The editor may normalize display line endings; the adapter sends the
frozen UTF-8 body whose digest is shown. Opening, previewing, removing context,
and discarding a request make no provider call. Preparation may create an empty
private record directory; it creates no ModelCall or project file. Host state
is separate from Qt's recovery and investigation state.

**Continue one answer.** From a reviewed initial completed response, choose
**Continue an Initial Answer Once**. With no reviewed response, select its
retained ModelCall explicitly. Choose one to eight passage numbers, write the
follow-up question and a separate human correction or changed assumption, and
select the model. **Select Prior Response Passages**, **Add Selection to
Request**, the context-removal command, and the human-field commands can revise
the draft. Every change invalidates the old preview. The complete independent
child body includes only those exact prior spans, explicit current selections,
and displayed human fields. It records `in_reply_to` without provider
conversation state. **Send Exact Preview** remains separate and single-attempt.
A linked child cannot become another parent; an active investigation cannot
be overwritten with a branch.

**Resume and end.** **Resume Saved Investigation** explicitly validates the
private pointer and exact retained records after restart, without sending.
The read-only comparison keeps selected parent evidence, human task text and
child outcome separate. Missing or changed records are reported while the
human text and original pins remain. Use **Review Investigation Parent** or
**Review Investigation Completed Child** for normal passage review and retention.
Failed, refused and incomplete children remain terminal and inspectable.

Human task fields are edited through the current-question, correction,
conclusion and unresolved-issue commands. Accepted edits are visible in the
comparison and remain in memory until **Save Human Task Summary**. The
investigation-current-question command is separate from an unrelated R2 draft.
**Insert Investigation Handoff into Active Note** copies the latest matching
human fields and record identities, without model prose or automatic saving.

**End Investigation…** offers **Insert handoff and end**, **End without
insertion**, and **Cancel**. Focus the intended ordinary note before choosing
insertion. The handler rechecks that note/version/selection after confirmation
and preparation. Ending clears only the active private pointer after successful
publication; records and ordinary files remain. Insertion is one unsaved host
edit with undo. If ending fails after insertion, the note edit and live pointer
remain, with no automatic retry, duplication or undo. Ending without insertion
explicitly discards the private human task text. After ending and restart,
another independent one-parent/one-child investigation can use the slot.

### Investigation persistence boundary

The core stores a version-1 `theorem-terminal.editor-investigation` envelope
by default under the extension's private workspace storage, in
`investigation-SHA256(canonical-project-root)/active.json`. It is limited to
128 KiB and contains bounded human task fields, exact parent identity/spans,
and the child's destination and exact request fingerprint. Each human field is
limited to 16 KiB. Terminal state additionally pins the child's record hash,
identity and response digest. It contains no editor buffer, recovery snapshot,
full selected current context, or provider conversation state. It reuses the
shared investigation value validator without loading or migrating Qt session
data. Activation launches nothing; Resume is explicit.

The core reserves the sole slot durably before child transmission. A host
interruption therefore leaves a pending destination rather than permitting an
automatic second child. Explicit Resume may reconcile the first terminal record
at that destination only if all recorded request-side fields match the reserved
fingerprint and parent link. A missing or nonmatching record stays unresolved;
there is no retry. A known terminal record is subsequently checked against its
exact retained-file and response digests without replacement guesses.

Private pointer writes reuse the existing mutable-file service: exact previous
bytes, kernel publication lock, synchronized file, atomic replacement and parent
directory sync. Immutable publication is unchanged. Failed or uncertain private
publication keeps the live state and blocks further private writes/Send until
host reload. A post-replacement sync failure may leave the complete replacement
on disk; no rollback occurs. Preserve unsaved human edits with an ordinary-note
handoff before reload when needed. VS Code owns note saving and recovery; no Qt
checkpoint or close-blocking guarantee is claimed. Concurrent hosts for the same
project remain unsupported. This R3 pointer lifecycle was checked on WSL Debian;
the separate Pi/SSH check covers offline outline persistence. Native Windows
Send remains unavailable.

**Read and inspect a proof.** Keep a saved UTF-8 source or note active, then
choose **Open Lean Proof and Keep Return Location**. Select a `.lean` file and
line. The proof opens beside the work. An installed Lean extension supplies its
usual proof inspection and may process the source when opened; MRW neither
extracts a proof graph nor records a new verification. **Return to Marked
Location** restores the pinned source selection, including after restarting
the host. The Explorer view displays the saved file, line and bounded excerpt.

**Use an external viewer.** From the saved source choose **Open External Proof
Viewer**. It marks the return location and opens `mrw.proofViewerUrl` as HTTPS.
The default is ProofMaps. No file, source text, declaration or path is appended
or uploaded. Arbitrary-project support, deep links, and embedding are not
assumed. This is a browser handoff, not an integrated proof map.

**Review retained assistance.** Choose **Review Model Response**, select an
existing completed `ModelCall`, then **Show Response Passage**, **Show Response
Index Page**, or **Show Full Response**. Attribution and digest precede returned
text. Views are read-only plain-text virtual documents using the core's safe
rendering, not rendered Markdown. Reopening an earlier review tab selects that
tab's exact record and passage for subsequent actions. A changed record must
be reviewed again.

**Keep a useful passage.** After showing a passage, **Retain Response Passage**
publishes a new immutable documentary projection through the existing private,
atomic no-overwrite service. It never overwrites even when a Save dialog offers
replacement. **Insert Attributed Passage into Active Note** inserts an explicitly
unverified editable copy at the cursor in an ordinary note. It preserves selected
work, creates one editor undo step, and does not save automatically. A changed
note or selection during preparation cancels insertion. Notebook-cell insertion
is not implemented.

**Inspect a warrant.** **Inspect Retained Record** accepts any terminal ModelCall,
projection, Verification with its exact bundle, or documentary package directory.
Completed, failed, refused, and incomplete calls can all be inspected as
validated records. Passage review and projection still require a completed
response. It reuses the core validators and exposes provenance, admissions, context,
derivation, and verification separately. It never invokes Lean or admits a
premise.

## Migration boundary

| Existing responsibility | Extension implementation |
|---|---|
| Text editing, save, undo, recovery | Owned by VS Code; no Qt buffer/controller port |
| Exact response selection and attributed copying | Shared `record_actions.py`; Qt delegates to the same functions |
| Record validation and presentation | Existing `record_views.py` and `response_review.py` through `editor_bridge.py` |
| Immutable passage publication | Existing `private_persistence.py`; unchanged no-overwrite boundary |
| Request preparation and transmission | Shared `assistance_actions.py`; existing adapter and immutable publication unchanged |
| Bounded R3/R3.1 | Shared `investigation_actions.py`; independent `editor_investigation.py` private pointer; host commands and undo |
| Return location | One saved revision-pinned selection per canonical project in private VS Code workspace state |
| Proof inspection | Explicit opening of local Lean source or configured HTTPS viewer |

Return markers require saved text and retain exact byte revisions. They do not
follow edits: a changed or unsaved source blocks return until it matches again
or is explicitly re-marked. They are navigation aids, not citations or
immutable evidence. Qt workspace/recovery state is neither imported nor
rewritten. Host document recovery and workspace-state durability are VS Code's
responsibility; the Qt checkpoint guarantee is not claimed for this frontend.

Record commands launch the bundled Python service only when invoked, using
`-I`, an argument vector, and the extension directory as working directory.
Activation and sidebar display launch nothing and read no source files. The
bridge accepts one JSON request bounded at 4 MiB, uses a fixed operation
allowlist and existing bounded record readers, and exits. The outbound provider
body retains its independent 256 KiB limit. Only `send_assistance` can transmit. Workspace executable configuration
is not loaded. Untrusted and virtual workspaces are unsupported in this increment.

Native Windows Send is blocked before transmission because immutable retention
requires the core's POSIX directory and hard-link operations; use a Linux
workspace host (for example Remote WSL).
Read-only inspection and preview remain available. Other persistence failures
may still occur on supported hosts and are reported without automatic retries. Native macOS has not
been exercised. Linux bridge checks do not establish cross-platform GUI support.

PDF position tracking,
internal Lean graphs and automatic AI outline generation
remain to be transferred or implemented. Source-based proposed outlines and
reversible vertex deletion are available in 0.15.0. PDF, LaTeX, Lean and notebook
editing can use installed host extensions under their own settings and execution
behavior. MRW does not configure or attest to those tools.

## Checks

From the repository root:

```sh
python3 vscode/scripts/bundle-core.py
npm run check --prefix vscode
npm test --prefix vscode
PYTHONPATH=src python3 -m unittest discover -s tests -v
python3 -m compileall -q src tests
```

The Node tests exercise the actual bundled Python bridge and command workflows
using a VS Code API double. They are not visible UI or Extension Development
Host acceptance. No provider request occurs. The real-host checks below now
cover those workflows on Windows VS Code connected to WSL Debian.
Mathematical usefulness needs a separate real task.

API references: [tree views](https://code.visualstudio.com/api/extension-guides/tree-view),
[workspace trust](https://code.visualstudio.com/api/extension-guides/workspace-trust),
[virtual documents](https://code.visualstudio.com/api/extension-guides/virtual-documents).

### Recorded validation, 2026-10-13

- All 9 new Python bridge tests and all 9 Node bridge/command tests pass.
- The complete Python suite ran 277 tests: 212 passed, 64 skipped, and one
  existing TeX descendant-reaping test failed. The same failure was reproduced
  from the exact unchanged `63fc23be` baseline in this container. No TeX
  supervision code was changed.
- Python compilation, JavaScript syntax checks, and an installed-package bridge
  launch pass. The installed bridge reads the synthetic multibyte fixture
  without Qt, Lean or a provider request.
- VS Code and PySide6 are unavailable here. There is no claimed visible host
  run, Qt widget regression run, VSIX installation, or mathematical-use result.

### Preview/Send increment, 2026-10-13

Request preparation, preview rendering, transmission and terminal-record
matching are extracted from `Workstation` into shared independent services. Qt
delegates to them. VS Code supplies editor selection, transient draft commands,
a single in-flight action, and a consumed-on-Send preview. No provider adapter,
transport, record schema, or publication rule is changed.

The host validation remains pending: in a real Development Host, capture an
unsaved Unicode passage, remove/add context, edit the question, inspect and
discard the preview, then review/insert the synthetic completed-response
fixture. Do not use a live provider request as an implementation test.

Validation for this increment: all 15 Node bridge/command tests and all seven
new Python assistance-bridge tests pass. The complete Python suite ran 284
tests: 219 passed, 64 skipped, and the previously recorded TeX descendant-reaping
error recurred. TeX supervision is unchanged. Installed-package preview, Python
compilation, JavaScript syntax, and diff checks pass. No live provider request,
Lean check, Qt widget run, or actual VS Code UI run was performed.

### Review repairs, 2026-10-13

The review addresses exact record identity when opening a newly received
answer, inspection of all terminal outcomes, and recoverable preflight
rejections. It also exercises virtual-document language changes and restored
tabs so that the visible response cannot silently select another record.
See [the review report](../docs/VS_CODE_ASSISTANCE_REVIEW.md).

All 20 Node bridge/command tests and all 21 focused Python editor tests pass.
The complete Python suite ran 289 tests: 224 passed, 64 skipped, and the same
existing TeX descendant-reaping error. Installed-package terminal inspection,
Python compilation, JavaScript syntax, and diff checks pass. Actual VS Code
host acceptance remains pending.

### Actual host validation, 2026-10-13

The scoped command workflows now pass in Windows VS Code 1.141.1 connected to
WSL Debian, with Python 3.13.5 on the Linux workspace extension host. All
responses use an injected deterministic transport; the test launcher removes
the inherited credential and rejects socket connections. The host workflows
made no live provider call and invoked no Lean. See [results and limits](../docs/VS_CODE_ASSISTANCE_REVIEW.md#actual-extension-development-host-validation).

The real host exercised Unicode/CRLF and untitled selection, frozen preview,
context removal/addition, question editing, separate Send and duplicate
rejection, concurrent note edits, all terminal statuses, known-unsent recovery,
inert passage review, insertion/undo, private no-overwrite projection,
language changes, and saved-source handoff/Return. A separate normal
development-host close/reopen confirmed persisted Return and stale virtual-tab
rejection. Windows captures were inspected at 1280×820 and 960×680; the smaller
capture uses a hidden sidebar and two host zoom-out steps at this display
scaling. These checks script dialogs; they do not establish manual-dialog,
VSIX-installation, external-browser, cross-platform, or mathematical-use acceptance.

All 20 existing Node checks passed. The Python suite reported 289 tests: 230
passed and 59 skipped. No production defect was found in the covered paths.
The skipped checks include 58 opt-in Qt widget tests and one unavailable
authorized `/mnt/c` project parent. Production services and transport are unchanged.
The broader Python suite also exercised the already-built pinned Lean checker
through its five conditional documentary regressions; no Lake build was run.

To repeat the host checks, first bundle the core, then prepare a disposable
project and artifacts directory:

```sh
python3 vscode/scripts/bundle-core.py
python3 vscode/scripts/prepare-host-tests.py --artifacts .codex-work/vscode-host-run
```

Launch an Extension Development Host with this extension as
`--extensionDevelopmentPath`, `vscode/test/host` as `--extensionTestsPath`, and
the printed project as the workspace. Use a separate temporary `--user-data-dir`
and `--disable-extensions`; the development extension itself still loads.
On Windows/WSL invoke Windows `Code.exe` with `--remote wsl+DISTRO` and
`vscode-remote://wsl+DISTRO/absolute/path` URIs for those three locations. The WSL
remote CLI ignores development/test flags. The runner scripts prompts and
transport while using real host documents, commands and undo. It writes
`initial.json`, transport bodies, and a `ready` file under the artifacts directory,
then exits after up to 60 seconds (or when a `finish` file is created there).

VS Code uses in-memory workspace storage with `--extensionTestsPath`, so that
mode cannot test restart persistence. Prepare the normal-host bootstrap:

```sh
python3 vscode/scripts/prepare-host-tests.py --artifacts .codex-work/vscode-host-run --persistence-phase seed
```

Launch the printed staged extension with the same user-data directory and
project, **without** `--extensionTestsPath`. Its production JS/Python bytes match
the checkout; only its manifest entry/activation and test configuration differ.
The bootstrap forbids Send and writes `persistence-seed.json`. Close that host
normally, prepare `--persistence-phase restart`, and relaunch the same staged
extension. Check `persistence-restart.json` for `complete: true` and no `failure`.
Do not count a launch or an incomplete report as a pass. Keep generated host
artifacts outside version control.

### R3/R3.1 validation and reproduction

The bounded lifecycle is implemented and technically checked in normal WSL
Development Hosts, including restart, changed-record handling, failed/cancelled/
successful ending, latest-summary insertion with undo, and sequential reuse for
all terminal outcomes. A visible view-placement defect was fixed by reusing an
existing research editor group. See [the R3 report](../docs/VS_CODE_ASSISTANCE_REVIEW.md#r3r31-extension-migration).
The final regression pass has 26 Node tests passing and 297 Python tests
reported (238 passed, 59 skipped). PySide6/widget acceptance and mathematical
usefulness remain unobserved in this run.

Prepare the deterministic normal-host bootstrap with:

```sh
python3 vscode/scripts/bundle-core.py
python3 vscode/scripts/prepare-host-tests.py --artifacts .codex-work/vscode-host-r3-run --investigation-phase seed
```

Launch the printed staged extension and project through Windows `Code.exe`
and WSL remote URIs, with a separate temporary user-data directory and
`--disable-extensions`, without `--extensionTestsPath`. Keep that test window
in the foreground for reliable editor-focus events. Check `r3-seed.json` for
`complete: true` and no `failure`, then close normally. Prepare and relaunch
the same staged extension/project with `--investigation-phase resume_end`,
then `--investigation-phase sequential --investigation-outcome failed`,
repeating the latter for `refused` and `incomplete`, closing between launches.
Check `r3-resume_end.json` and each `r3-sequential-OUTCOME.json` for completion
without failure. Omitting the outcome runs all three in one host; that combined
driver hit background-window focus delays in this environment. The bootstrap
injects all responses and blocks Python network connections; it makes no live
provider request. It authors only disposable ordinary test work. Reports from
aborted focus/setup attempts do not establish acceptance.
