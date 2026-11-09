# Mathematical Research Workstation for VS Code

MRW 0.23.5 opens existing mathematical documents in place and connects scoped
note links, backlinks and return locations with retained sources, annotations
and resumable study. The extension is experimental.
[Opening repair checks](../docs/DOCUMENT_OPENING_REPAIR.md).

The document Problems commands and forms are removed. Earlier document-linked
work remains readable with its drafts, attributed text, Return and history/export.
Opening or following a document never starts an exercise form. Questions,
solutions and commentary can stay in ordinary linked notes. Resumption starts
with existing documents, locations and unfinished work; additional interactions
must remove a demonstrated obstacle without duplicate entry. No replacement
Research Question registration system is planned. See
[the removal checks](../docs/DOCUMENT_PROBLEMS_REMOVAL.md).

## Open existing work

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

Select **MRW: Choose Notes Folder…** to grant one explicit folder for note-ID
lookup and backlinks; Obsidian is optional. Notes remain in place.

Follow ordinary relative Markdown links or exact Zettel `[[ID]]` links from
Contents, or use **MRW: Follow Document Link** at the cursor. **Show Backlinks…**
opens incoming occurrences and **Return to Document** restores the origin. The
selected folder/document and matching return pin persist in the workspace.
**Reopen Document** explicitly opens the last opened/followed file after restart;
activation does not open it automatically. Contents and backlinks respect dirty editor text; VS Code owns Save and Undo.
Obsidian, Zettel metadata and text import are optional.
A link changed during opening leaves the previous Return destination intact.
Backlink targets are checked against the current file scope before loading.
New notes use the active preview group; already-open notes retain their group.
[Navigation repair evidence](../docs/DOCUMENT_NAVIGATION_REPAIR.md).

A Document may be a note, PDF paper, manuscript or notebook. Other formats use
registered host editors/readers; a PDF uses a registered custom reader or an
explicit **Open with system reader** handoff when none is registered. MRW does
not extract PDF text, derive PDF Contents or supply PDF page restoration. It
does not drop an unsupported exact selector to open a different target.
**Show Contents** and **Choose Document…** select Markdown; **New Document…**
creates Markdown. Leading delimited YAML is excluded from Contents without
changing offsets. **Retain Document as Source** and **Import Markdown Text…**
remain explicit text-copy operations, separate from opening a file.

Start with **MRW: Open Tutorial**. Its header reports the active extension
version and available build identity; each activation snapshots its packaged
guide and reopening refreshes the virtual document. A newer package on disk is
not presented as active before adoption. Guide links work from the virtual URI.
See [document navigation and limits](../docs/READING_OUTLINE_WORKFLOW.md) and
[optional Obsidian associations](../docs/OBSIDIAN_WORKFLOW.md).

## Source display and Return repair (0.21.1)

Kerodon mathematical expressions remain whole across HTML parser callbacks,
including literal comparison signs and entities. Bare equation arrays have an
inert MathML display. The original retained HTML, source hashes, passage ranges,
annotations and historical manifest remain unchanged; reopening existing imports
uses the repaired display without importing again.

Successful Kerodon and Stacks Project import notifications no longer retain the
reader-action lock while hidden in Notifications. Return to Document and refresh
remain usable after new and repeated imports. **Open original source ↗** is visible
in the reader toolbar and opens today's canonical page in the external browser;
the reader continues to show its retained revision. [Checks and limits](../docs/READER_REPAIR_VALIDATION.md).

## Study a difficult passage

For your own work, select saved ordinary text and run **MRW: Study Current
Material**, or choose **Study current material** in a retained reader.
**MRW: Open Study Example** is an optional offline demonstration with two
questions and separately marked `practice_demo` history. A graph
claim with a source citation also has **Study this claim**.

An empty study shows the source, **Enter a question** and **Request questions
from Codex**. Manual entry works offline. The Codex question handoff contains
exact selected source text, references/revisions and the question schema.
**Import questions from clipboard** reviews proposed questions without enrolling
them automatically for review.

Start a question, type an answer or mark work done on paper, then **Submit answer**.
Starting recall conceals source/answer inside the study; other editors remain
untouched. Reveals create exposure opportunities, not observations that a reader
consulted them. A submitted work snapshot stays immutable.

**Copy help request for Codex** includes the exact task and identifies current
draft versus submitted work. **Paste companion response… → Review pasted
response → Retain response** keeps prose/equations beside the attempt. Correct
the author if needed. The original and attributed revisions remain identifiable;
manual paste authenticates neither origin nor mathematical correctness.

Use **Submit revised work** during an unfinished attempt. After completion,
**Continue with revised work** creates an explicitly linked attempt. Report the
outcome and consultation separately; pending choices survive rerender and
pause/reopen without submitting themselves. **Pause / save** and **Resume Study**
restore unfinished work. Retaining help does not imply use or benefit.

**Keep for review** explicitly admits a question to bounded source-scoped FSRS
review. Defaults are three questions, about five minutes and one new question,
adjustable through study settings. Effort reports are occasional, optional and
linked to the preceding attempt. Missing reports remain missing. A schedule is
not a mathematical assessment.

The **Studies** sidebar lists studies, their source passages and questions.
Its **…** menu and the Command Palette contain source operations and history
inspection/export. See the [tutorial](media/first-steps.md),
[workflow](../docs/ACTIVE_STUDY_WORKFLOW.md) and
[validation and limits](../docs/ACTIVE_STUDY_VALIDATION.md).

## Workspace hosts and dependencies

The workspace extension and shared Python core run on Linux: local Linux,
WSL2 or Remote SSH. Windows VS Code can supply the interface. Required:
**VS Code 1.95+ and Python 3.11+ on the workspace host**, normally `python3`.
`mrw.pythonExecutable` accepts one executable path in User/Remote settings.
An installed VSIX requires no npm, Qt, Lean, SageMath, container or provider.

| Arrangement | Evidence |
| --- | --- |
| Windows VS Code + WSL2 Debian | Earlier scoped installed reader/restart checks |
| Windows VS Code + SSH to Raspberry Pi 5, Debian 12 ARM64 | Earlier scoped installed reader/save/restart checks |
| Local Linux / other Linux SSH | Intended arrangements; desktop validation separate |
| Native Windows / macOS backend | Not qualified |

See [reader host evidence](../docs/VS_CODE_OUTLINE_VALIDATION.md) and the current
[study validation](../docs/ACTIVE_STUDY_VALIDATION.md). Earlier checks do not
establish current native-host acceptance. Use a trusted ordinary Linux workspace;
untrusted/virtual workspaces and concurrent hosts writing one store are unsupported.

## Package and install a VSIX

From a **repository-root checkout** with Python 3.11+, Linux Node.js 22+ and npm:

```sh
npm ci --prefix vscode --ignore-scripts
TZ=UTC SOURCE_DATE_EPOCH=1792094267 npm run package --prefix vscode
npm run verify-vsix --prefix vscode -- mrw-0.23.5.vsix
sha256sum vscode/mrw-0.23.5.vsix
```

`npm run package` runs the Python bundling prepublish hook and pinned
`@vscode/vsce` 4.0.0. It creates `vscode/mrw-0.23.5.vsix`; it does
not publish it. The fixed epoch/UTC supplies stable archive timestamps. Record
the hash of the actual archive and tool versions used; do not assume an older
release's hash. Use Linux npm in WSL, not a Windows npm launcher.

The verifier compares production manifest/runtime bytes against this checkout,
checks bundled dependency notices/digests, and rejects missing/unexpected files.
Tests, scripts, npm dependencies, caches, host-test configuration and generated
VSIX archives are excluded. Python core copies and package files are Git-ignored.

In the intended Linux/WSL/SSH window, use **Extensions: Install from VSIX…** or:

```sh
code --install-extension /absolute/path/to/mrw-0.23.5.vsix
code --list-extensions --show-versions
```

Confirm `flengyel.mrw@0.23.5` is installed on the **workspace host**,
not solely the Windows UI. Save documents/forms before a requested reload. Keep
workspace storage for future updates of `flengyel.mrw`. The bridge
uses the package's bundled core through `python3 -I`; it needs no editable Python
install. Full Windows/WSL setup: [installation](../docs/INSTALLATION.md).

## Run from this checkout

1. Open the repository's `vscode/` directory in the intended workspace host.
2. Run `python3 scripts/bundle-core.py`, or use the supplied F5 bundling task.
3. Press F5 for an isolated Extension Development Host and open a trusted,
   disposable ordinary workspace there.
4. Run **MRW: Open Study Example** or another **MRW:** command.

Keep development state distinct from genuine studies. Source retention and
publication tests require a filesystem supporting the existing private POSIX
modes and atomic file operations. Do not weaken guards to make `/tmp`, DrvFS or
synchronized storage pass. Use a disposable directory on a qualified Linux volume.

From the repository root, after bundling:

```sh
npm run check --prefix vscode
npm test --prefix vscode
PYTHONPATH=src python3 -m unittest discover -s tests -v
python3 -m compileall -q src tests
```

Run focused changed-module checks first. Node integration tests use the real
bundled Python bridge with a VS Code API double; they are not native UI checks.
Opt-in Qt/Lean checks have separate requirements. An isolated host runner is in
`vscode/scripts/prepare-host-tests.py`; old host reproduction details are in the
[development history](../docs/VS_CODE_DEVELOPMENT_HISTORY.md#checks).
Never treat a failed launch or incomplete runner report as a pass.

## Data and history

Native files retain VS Code save, undo and recovery. Saved sources/annotations
use the existing private source-store publication rules and explicit bindings.
Current studies use `active-studies-v1/<study-id>.json`; the recorder uses
`study-history-v1/`, both beneath the extension's `context.storageUri` (VS Code's
workspace storage on the workspace host).

History records meaningful MRW actions, software/build identity, source/question
revisions, immutable submission/request/help snapshots, assessment/correction
links, optional effort, cancellations, errors and persistence gaps. It does not
record unrelated application activity. Snapshots can contain private mathematics.
Practice and automated fixtures retain distinct origins from production work.

**Inspect Study History** reads a local report. **Export Study History…** selects
sessions and saves readable Markdown or events plus snapshots through an ordinary
new document. Required linked context is labeled separately; missing context is
reported rather than fabricated. Corrections remain immutable events while
reports attribute attempts to the version in which they occurred. The reports
are descriptive: different tasks/exposure prevent a causal release comparison.

Study companion requests/replies use deliberate clipboard actions. No clipboard
monitoring, automatic provider request or background generation occurs. The
separate **Ask… → exact preview → Send** API connector retains its own record
lifecycle; see [reader AI](../docs/READER_AI_WORKFLOW.md).

### Saved artifact location (0.7.0)

**Move Saved Work Directory…** transfers supported retained-source records;
**Open Saved Work Directory…** connects a verified copied store. These commands
currently do **not** transfer active-study checkpoints or interaction history.
Ordinary Markdown or `.mrw-study.json` copies also do not transfer private source
targets. Preserve workspace storage; see [storage/recovery](../docs/ARTIFACT_STORAGE.md).
Windows-backed/synchronized storage remains unqualified.

## Workflows

- **Open Saved Source…** reopens a retained source offline. Statements,
  proofs and reader notes have separate controls; annotation forms save explicitly.
- **Show Contents** navigates Markdown headings, note links and exact saved
  references. **Show Backlinks…** and **Return to Document** keep source-note
  occurrences. [Document guide](../docs/READING_OUTLINE_WORKFLOW.md).
- [Proof study with Codex](../docs/PROOF_STUDY_WORKFLOW.md) retains an unresolved
  question, explicit prerequisite passages and attributed proposed graph.
- [Proof graphs](../docs/PROOF_GRAPH_WORKFLOW.md) support source selection,
  summary corrections, pan/zoom and reversible display deletion. Validation of
  references and graph structure does not check the mathematics.
- [Stacks Project / Kerodon import](../docs/STACKS_WORKFLOW.md) retains a bounded
  section from pinned Git source or one official HTML snapshot on explicit import.
  Qualified IDs distinguish sources; retained citations still pin revision and passage.
- [Obsidian](../docs/OBSIDIAN_WORKFLOW.md), [TikZ](../docs/TIKZ_WORKFLOW.md) and
  [SagePod/Jupyter](../docs/GETTING_STARTED_WSL_SAGEPOD.md) remain optional.

### Manual Markdown overviews across sources

Use **Insert Source or Passage Link…** in an ordinary note; **Follow Source or Passage Link at Cursor** opens the exact retained target. Copying a reference does not copy its
private storage. VS Code owns the overview's editing, saving and recovery.

### Offline saved-source reader

**Retain Document as Source** retains UTF-8 source bytes and selected
scalar ranges. Original-file edits do not replace an earlier source revision.
Source annotations and supplied evidence remain separately attributed. There is
no PDF extractor, automatic corpus scan or inferred proof correspondence.

### Outline persistence boundary

Exact references bind the workspace/source revision, outline and region. A changed
association never silently redirects an earlier citation. See the
[historical persistence details](../docs/VS_CODE_DEVELOPMENT_HISTORY.md#outline-persistence-boundary)
and [source-association checks](../docs/VS_CODE_OUTLINE_VALIDATION.md).

### Investigation persistence boundary

The separate bounded API investigation keeps a versioned private pointer and
exact parent/child record bindings. It does not import Qt recovery state or own
ordinary editor buffers. Its publication/restart rules and limits are preserved
in [the original contract](../docs/VS_CODE_DEVELOPMENT_HISTORY.md#investigation-persistence-boundary).

### Obsidian companion notes

Use [the Obsidian guide](../docs/OBSIDIAN_WORKFLOW.md) for optional supplied
note/passage associations and import destinations. An explicitly selected notes
folder has a bounded link/backlink index. MRW does not discover vaults,
synchronize notes or infer an Obsidian mapping from the folder name.

### Reproduce the bounded outline host checks

The earlier reader runner and its required pinned source, seed/restart phases
and offline guards are documented in
[the historical reproduction steps](../docs/VS_CODE_DEVELOPMENT_HISTORY.md#reproduce-the-bounded-outline-host-checks).
Those scoped checks are separate from current study feedback validation.

## Legacy development and notices

[Development history](../docs/VS_CODE_DEVELOPMENT_HISTORY.md) retains older commands,
implementation contracts and scoped host checks. [CHANGELOG](../CHANGELOG.md) keeps
release history and the separate Qt/CLI prototype. These are historical accounts,
not current installation instructions.

The package includes the MRW Apache-2.0 license and bundled KaTeX, markdown-it
(and its dependencies) and ts-fsrs notices. Repository fixture rights and public
exposure findings are listed in [PUBLIC_READINESS](../PUBLIC_READINESS.md).

Reading repairs add exact heading/block WikiLinks, note-local macros and explicit
isolated TikZ rendering, progressive titles and saved Markdown selections.
See [reading repairs](../docs/READING_REPAIRS.md).
