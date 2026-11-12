# Mathematical Research Workstation for VS Code

MRW 0.23.19 opens mathematical notes and papers in place, follows references,
and keeps a route back to the passage being read. It adds Contents, backlinks,
retained source passages, reader annotations and explicit TikZ rendering to a
VS Code workspace. The extension is experimental.

Questions, solutions and commentary can stay in ordinary linked notes. Opening
or following a document creates no exercise form. Work saved through the removed
document Problems feature remains readable, including drafts and attribution;
see [the preservation checks](../docs/DOCUMENT_PROBLEMS_REMOVAL.md).

<a id="open-existing-work"></a>

## Open a document

For first use, [set up the MRW workspace](../docs/WORKSPACE_SETUP.md) at
`~/mrw-work/MRW.code-workspace` on the Linux host. A notes folder, including an
Obsidian vault, can remain elsewhere. Existing sessions keep their saved work.

1. Run **MRW: Open Document…** and choose an **Original file**. Markdown opens in
   preview; other formats use a registered editor or reader.
2. Hover over the MRW Activity Bar icon to see its version, then open the view. **Contents** lists the selected Markdown
   document's headings and links. **Show Contents** selects or reveals that
   document; **Choose Document…** selects another Markdown file.
3. For note-ID links and backlinks, use **Choose Notes Folder…**. Select a recent
   folder or browse for another; full paths identify the choices. The folder can
   be outside the workspace and need not be an Obsidian vault.
4. Follow a WikiLink from preview, or an ordinary link through Contents or
   **Follow Document Link**, then use **Return to Document** to return to its
   originating occurrence. **Show Backlinks…** lists incoming
   occurrences. **Reopen Document** restores the last opened file and its saved
   exact Markdown selection after restart.

The **Commands** view keeps opening and navigation controls available. Contents
identifies its selected file; when another file is active, it hides the preceding
Markdown tree and identifies the active file. Opening documents leaves editor
layout and unsaved-buffer recovery under VS Code's control.

The opening picker lists the current folder's files and subfolders first.
Titles arrive in batches from YAML or the first heading; unsaved titles take
precedence. Browse immediately with **Browse for another document…**, enter a
subfolder, or choose **Search subfolders…** to search nested folders within the
[chooser limits](../docs/DOCUMENT_OPENING_REPAIR.md#opening-behavior). Browsing
does not change the notes folder used for ID lookup and backlinks.
Partial searches are identified; cancellation preserves the current document.

To read a retained revision, choose a **Saved copy** in the same picker. Its row
identifies the source and revision. Opening an original does not import it;
opening a saved copy does not refresh its source or replace its annotations.
**Open Saved Source…** remains available in the Command Palette.

WikiLinks support note IDs, headings, paragraph/list block IDs and scoped paths.
Ambiguous or missing targets are reported rather than guessed. Contents and
backlinks use unsaved editor text. Return keeps an exact occurrence; a failed
follow does not replace the preceding successful return location.

PDF opening delegates to a registered reader, with an explicit **Open with
system reader** fallback. MRW supplies no PDF text extraction, PDF Contents or
page restoration. Markdown preview scrolling is not restored. See
[document navigation](../docs/READING_OUTLINE_WORKFLOW.md) for supported selectors
and return behavior.

## Mathematics and diagrams

The native Markdown preview renders equations and supported note-local macro
definitions. A fenced `tikz` block offers **Render diagram**, which runs the
isolated Linux compiler only on request. Successful light/dark views are cached
outside the note. Opening or saving a note never compiles it; rendering leaves
its source unchanged. TeX, Poppler and bubblewrap are separate dependencies for
this optional action. See [TikZ setup](../docs/TIKZ_WORKFLOW.md).

The saved-source reader has its own renderer and displays statements, proofs
and reader notes separately. Imported Stacks Project and Kerodon sections retain
source-qualified citations and their exact source revision. **Open original
source ↗** opens the current published page while the reader keeps the retained
revision. See [published-source import](../docs/STACKS_WORKFLOW.md).

## Workspace hosts and dependencies

The extension and shared Python core run on a **Linux workspace host**, including
WSL2 or Remote SSH. Windows VS Code may provide the interface. Required:
**VS Code 1.95+ and Python 3.11+ on the workspace host**, normally `python3`.
`mrw.pythonExecutable` accepts one executable path in User/Remote settings.
An installed VSIX needs no npm, Qt, Lean, SageMath, container or AI account for
ordinary reading.

**Study Lean 4…** opens three introductory companion lessons for *Theorem Proving in Lean
4*: functions, implication proofs and dependent application. The first lesson
gives a brief orientation and tutorial contents; each lesson links to its sections
and back to the contents. MRW copies a
core-only project pinned to Lean 4.33.0 into your selected notes/study parent,
with editable examples, separate solutions and an ordinary notes file.
**Resume Lean Study** preserves code edits and the cursor; **Lean Study Actions…**
opens variations, book links and Return. See the
[workflow](../docs/LEAN_STUDY_WORKFLOW.md) and
[local lesson-pack guide](../docs/LEAN_LESSON_PACKS.md).
The companion text and examples were prepared with Codex for MRW; the linked
book is by Jeremy Avigad, Leonardo de Moura, Soonho Kong and Sebastian Ullrich,
with contributions from the Lean Community.

For live goals and checking, install `leanprover.lean4` and Lean/elan on the
workspace host. In WSL2, use **Install in WSL: Debian**. MRW calls its supported
`lean4.displayGoal` command; it neither creates a second Lean client nor starts
Lean during ordinary activation. The lesson remains readable without Lean or
an AI account. Pack structure checks do not verify its mathematical content.

| Arrangement | Evidence |
| --- | --- |
| Windows VS Code + WSL2 Debian | Current scoped reading and renderer checks |
| Windows VS Code + SSH to Raspberry Pi 5, Debian 12 ARM64 | Earlier scoped reader/save/restart checks |
| Local Linux / other Linux SSH | Intended arrangements; separate desktop validation required |
| Native Windows / macOS backend | Not qualified |

The [0.23.5 reading report](../docs/READING_REPAIRS.md) identifies the observed
Windows/WSL behavior and remaining limits. Earlier
[reader checks](../docs/VS_CODE_OUTLINE_VALIDATION.md) and
[study checks](../docs/ACTIVE_STUDY_VALIDATION.md) have their own scopes.
Use a trusted file workspace. Virtual workspaces and concurrent hosts writing
one private store are unsupported.

## Package and install a VSIX

[Download MRW 0.23.19](https://github.com/flengyel/MRW/releases/download/v0.23.19/mrw-0.23.19.vsix)
· [Release notes and checksums](https://github.com/flengyel/MRW/releases/tag/v0.23.19).
Updates from GitHub require installing the newer VSIX. For publication and build
identity, follow [the release procedure](../docs/RELEASING.md).

From the repository root, with Python 3.11+, Linux Node.js 22+ and npm:

```sh
npm ci --prefix vscode --ignore-scripts
TZ=UTC SOURCE_DATE_EPOCH=1792094267 npm run package --prefix vscode
npm run verify-vsix --prefix vscode -- mrw-0.23.19.vsix
sha256sum vscode/mrw-0.23.19.vsix
```

Packaging bundles the Python core and uses pinned `@vscode/vsce` 4.0.0 to create
`vscode/mrw-0.23.19.vsix`. It publishes nothing. The fixed epoch and UTC make
archive timestamps reproducible. Use Linux npm in WSL and record the resulting
archive's hash rather than reusing an earlier package's hash.

The verifier compares packaged runtime files with the checkout and checks
bundled dependency notices and digests. Tests, build tools, dependencies,
caches and generated archives are excluded from the package.

In the intended Linux/WSL/SSH window, use **Extensions: Install from VSIX…**, or:

```sh
code --install-extension /absolute/path/to/mrw-0.23.19.vsix
code --list-extensions --show-versions
```

Confirm `flengyel.mrw@0.23.19` is installed on the workspace host. Save unfinished
work before a requested reload and retain workspace storage when upgrading.
The bridge runs the bundled core through `python3 -I`; no editable Python
installation is needed. See [installation](../docs/INSTALLATION.md).

## Run from this checkout

1. Open the repository's `vscode/` directory in the intended workspace host.
2. Run `python3 scripts/bundle-core.py`, or use the supplied F5 bundling task.
3. Press F5 for an Extension Development Host and open a disposable file workspace.
4. Run **MRW: Open Document…** on a sample Markdown file, then **MRW: Open Tutorial**.

Keep development state separate from working notes and saved studies. Tests of
private source storage require a Linux filesystem supporting the specified POSIX
modes and atomic file operations; do not weaken those checks for a test location.

From the repository root, after bundling:

```sh
npm run check --prefix vscode
npm test --prefix vscode
PYTHONPATH=src python3 -m unittest discover -s tests -v
python3 -m compileall -q src tests
```

Run checks appropriate to the change. Documentation edits need document and link
validation; runtime changes need the relevant regression checks. Node integration
tests use the bundled Python bridge with a VS Code API double, so they do not
establish rendered-interface behavior. Qt and Lean checks have separate
requirements. The isolated host runner is `vscode/scripts/prepare-host-tests.py`.

## Data and history

VS Code owns ordinary-file editing, saving, undo and unsaved-buffer recovery.
MRW keeps retained sources and annotations in its private source store. Optional
studies use `active-studies-v1/<study-id>.json`; interaction history uses
`study-history-v1/`, beneath the extension's workspace storage on the Linux host.

History records MRW actions, versions, source/question revisions, submissions,
requests, help, reported outcomes/effort and errors. It does not record unrelated
application activity. **Inspect Study History** opens a local report;
**Export Study History…** saves selected sessions as readable Markdown or JSON
with linked snapshots. Exports may contain private mathematics. Missing context
is identified, and corrections remain distinct from earlier records. These
reports do not establish a learning benefit or causal comparison between releases.

Study companion exchanges use explicit clipboard actions. The separate
**Ask… → exact preview → Send** API connector has its own request and response
records; see [reader AI](../docs/READER_AI_WORKFLOW.md).

### Saved artifact location (0.7.0)

**Move Saved Work Directory…** transfers supported retained-source records;
**Open Saved Work Directory…** connects a verified copied store. Neither
transfers current-study checkpoints or interaction history. Copying an ordinary
Markdown or `.mrw-study.json` file does not copy its private source targets.
See [storage and recovery](../docs/ARTIFACT_STORAGE.md) before moving saved work.
Windows-backed private artifact storage remains unqualified; ordinary notes may
still be opened from a Windows folder.

## Study a difficult passage

Source study is optional and separately invoked. **Study Current Material**
starts from selected saved text; **Study current material** starts from a retained
reader passage. It supports entered questions, attempts, attributed companion
responses and optional FSRS review. **Keep for spaced review** enrolls a
question; saving alone does not. **Pause / save** and **Resume Study** retain
unfinished work.

The Codex handoff copies the selected source, question and work. Pasted replies
are reviewed before retention; a supplied author name does not authenticate
origin or mathematical correctness. The [study guide](../docs/ACTIVE_STUDY_WORKFLOW.md)
explains submissions, revisions, recall and optional effort reports.
**Open Study Example** supplies an offline demonstration whose practice history
is marked separately.

## Workflows

- [Documents and Contents](../docs/READING_OUTLINE_WORKFLOW.md): headings, note
  links, backlinks and Return.
- [Stacks Project and Kerodon](../docs/STACKS_WORKFLOW.md): retain a section and
  cite its revision and passage.
- [Proof work](../docs/PROOF_STUDY_WORKFLOW.md): save a question and selected
  prerequisites, exchange an explicit Codex handoff, and inspect a proposed graph.
- [Proof graphs](../docs/PROOF_GRAPH_WORKFLOW.md): navigate claims, correct
  summaries and simplify the displayed graph. Reference and graph validation
  does not verify the argument.
- [Obsidian](../docs/OBSIDIAN_WORKFLOW.md): open the same notes in both applications.
- [SagePod/Jupyter](../docs/GETTING_STARTED_WSL_SAGEPOD.md): optional computation
  through a separate notebook kernel.

<a id="manual-markdown-overviews-across-sources"></a>

### Link retained passages from a document

Use **Insert Source or Passage Link…** in an ordinary note. **Follow Source or
Passage Link at Cursor** opens its exact retained target. The note remains an
ordinary editable document; copying its reference does not copy private storage.

<a id="offline-source-region-reader"></a>

### Offline saved-source reader

**Retain Document as Source** retains UTF-8 source bytes and selected scalar
ranges. Original-file edits do not replace that revision. Reader annotations
and supplied evidence keep their separate attribution.

### Outline persistence boundary

Exact references bind a workspace, source revision, outline and region. Changing
an association never silently redirects an earlier citation. The
[persistence details](../docs/VS_CODE_DEVELOPMENT_HISTORY.md#outline-persistence-boundary)
and [association checks](../docs/VS_CODE_OUTLINE_VALIDATION.md) describe this rule.

### Investigation persistence boundary

An API investigation supports one response and one follow-up. It keeps a
versioned private pointer and exact parent/child record bindings. It does not
import Qt recovery state or own ordinary editor buffers. Its contract is in the
[investigation persistence details](../docs/VS_CODE_DEVELOPMENT_HISTORY.md#investigation-persistence-boundary).

### Obsidian companion notes

MRW looks up note IDs and backlinks within the selected notes folder and the
[search limits](../docs/READING_OUTLINE_WORKFLOW.md#backlinks-edits-and-restart).
Optional Obsidian handoffs open the same files in that application. Saved-reader
associations are supplied separately. See [the Obsidian guide](../docs/OBSIDIAN_WORKFLOW.md).
MRW does not discover vaults or synchronize their contents.

<a id="reproduce-the-bounded-outline-host-checks"></a>

### Reproduce the outline host checks

The earlier reader runner's pinned source, seed/restart phases and offline
guards are recorded in the
[reproduction steps](../docs/VS_CODE_DEVELOPMENT_HISTORY.md#reproduce-the-bounded-outline-host-checks).
Use the report for each release to identify which behavior was observed.

## Development records and notices

[Development records](../docs/VS_CODE_DEVELOPMENT_HISTORY.md) retain earlier
commands, implementation contracts and host checks. [CHANGELOG](../CHANGELOG.md)
records releases and the separate Qt/CLI prototype.

The package includes the MRW Apache-2.0 license and notices for bundled KaTeX,
markdown-it and its dependencies, ts-fsrs, and Quiver. Fixture rights and
outstanding publication decisions are recorded in [PUBLIC_READINESS](../PUBLIC_READINESS.md).

Source readers provide **Original page / Saved text** controls and persistent
Stacks Project/Kerodon import buttons. **Import Source…** also supports nLab and
explicitly registered source plugins. Retained snapshots remain readable without
the plugin. See [source plugins](https://github.com/flengyel/MRW/blob/main/docs/SOURCE_PLUGINS.md)
and [nLab](https://github.com/flengyel/MRW/blob/main/docs/NLAB_WORKFLOW.md) for
installation, supported mathematics, revision evidence and limits.

Saved Studies have Archive/Restore, Trash/Undo and confirmed permanent deletion.
Use row context menus or the Command Palette; the Studies title menu opens
archived studies and Trash. See [lifecycle and recovery](../docs/STUDY_LIFECYCLE.md).

## Zotero references

MRW 0.23.19 includes read-only local Zotero lookup, citation insertion and
retained attachment reopening. Windows Zotero is accessed from WSL through
Windows loopback, without forwarding its API port. See the [workflow and limits](../docs/ZOTERO_WORKFLOW.md).

Before connecting, open Zotero → **Settings → Advanced** and enable
**Allow other applications on this computer to communicate with Zotero**.
Keep Zotero running for searches and new attachment reads. With Windows Zotero
and Debian WSL, select **Windows Zotero from WSL** in **MRW: Connect Zotero…**.

## Moving a workspace

**Move Workspace…** copies and verifies a saved Linux workspace and private MRW
work before committing one destination. **Recover Workspace Move** resolves
interruptions. Originals remain available; opening the destination is explicit.
Workspace-owned locations are relative to its root. External notes retain their
notes-folder root and relative filename. Study IDs and exact citations remain
stable. [Setup and relocation](https://github.com/flengyel/MRW/blob/main/docs/WORKSPACE_RELOCATION_DESIGN.md).
