# Mathematical Research Workstation for VS Code

MRW connects mathematical reading, source notes, calculations and proof work.
Open a document in place, follow its references, write while reading and return
to the argument. It retains exact source passages and results while companion
applications keep their editing and execution workflows.

**MRW 0.23.43 — Resume unfinished justification.**
[Download the VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.43/mrw-0.23.43.vsix)
· [Release and checksums](https://github.com/flengyel/MRW/releases/tag/v0.23.43)
· [Installation](../docs/INSTALLATION.md).
The extension ID is `flengyel.mrw`. GitHub updates require installing a newer
VSIX; there is no Marketplace listing. MRW remains experimental.

<a id="open-existing-work"></a>

## Open a document

[Set up the workspace](../docs/WORKSPACE_SETUP.md) at
`~/mrw-work/MRW.code-workspace` on the Linux host. Your notes folder can remain
elsewhere, including in a Windows Obsidian vault accessed from WSL.

1. Choose **Open Document… → Original file**. Markdown opens in preview; other
   files use a registered editor or reader.
2. Choose **Show Contents** for Markdown headings and links. **Choose Notes
   Folder…** sets the scope for note-ID lookup and backlinks and remembers
   recent folders. Browsing the document picker does not change that scope.
3. Follow a link from Contents or **Follow Document Link**, or click a WikiLink
   in preview. **Return to Document** returns to the originating occurrence.
   Missing or ambiguous targets are reported.
4. Use **Recent Documents…** after a restart. It lists notes, PDFs and other
   files; **Reopen Document** restores a Markdown selection when it still matches.

Filenames appear immediately in the picker; YAML or heading titles arrive in
batches. Browse subfolders or choose **Search subfolders…**. Partial searches
are identified, and cancellation leaves the current document open.
**Saved copy** and **Open Saved Source…** open retained revisions and their
annotations. Search `Stacks`, `Kerodon` or a passage tag to find a saved section.

Contents reflects unsaved Markdown text. VS Code owns editing and buffer
recovery. PDF text extraction, PDF Contents, page restoration and preview scroll
restoration are outside MRW's current capabilities.
[Navigation and Return](../docs/READING_OUTLINE_WORKFLOW.md).

### Notes while reading

**New Note…** in Commands or the MRW Document menu delegates to the configured
authoring application. For Obsidian, it runs your selected creation command and
template; it does not substitute a reduced template. An ordinary notes folder
uses a blank Markdown editor. Your current document stays open.
[Note companions](../docs/NOTE_COMPANIONS.md).

Reader notes remain beside retained passages. Add or edit the text, delete a
note, link an Obsidian note or continue it through the configured handoff.
[Reader notes](../docs/READER_NOTE_WRITING.md).

## Justification

A **ground** supports a claim. An **admission** records which assertion is
accepted, by whom and within what scope. A **context** selects the admissions
available to a derivation.

Choose **Proofs → Justification… → Explore Euclid’s lemma**. Read the supplied
Bézout and unique-factorization arguments and their admissions, then choose
**Search under these admissions**. MRW retains the checked routes and exact
source snapshots. A source button opens its passage; **Back to routes** restores
the comparison.

**Withdraw a ground…** checks a successor context while preserving the earlier
context and certificates. Reopen either result through **Justification…** after
a restart; reopening performs no new check. Failed searches retain their exact
pending request for an explicit retry. **Unfinished: …** entries recover it
after closure or restart, including its original Return location. A failed
initial context save starts no Lean process.

For checking, expand **Local checker setup → Build local checker**. It uses an
already installed Lean 4.32.2 toolchain and downloads nothing. The current
executable identity is verified on Linux x86-64/WSL; a different compiler output
is rejected. Saved results remain readable without this checker.

The engine checks conditional composition under explicit admissions. It does
not establish the two arithmetic proofs or an informal paper–Lean correspondence.
An empty bounded search is not a disproof. Direct assembly of arbitrary contexts
from notes remains pending; **Open an explicit context file…** is the current
reviewed-input/developer route. [Guide and limits](../docs/JUSTIFICATION_WORKFLOW.md).

## Mathematics and diagrams

Markdown preview renders notation and supported note-local macros. A fenced
`tikz` block offers explicit diagram rendering using separately installed TeX,
Poppler and bubblewrap. Successful views are cached outside the note; opening
or saving a note never compiles it. [TikZ setup](../docs/TIKZ_WORKFLOW.md).

The saved-source reader separates statements, proofs and annotations. Imported
Stacks Project and Kerodon sections preserve qualified source identifiers,
revision evidence and exact passages. **Original page / Saved text** separates
the current web page from the retained version. Registered readers also support
nLab; snapshots remain readable without their plugin.
[Sources](../docs/STACKS_WORKFLOW.md) · [Plugins](../docs/SOURCE_PLUGINS.md).

## Workspace hosts and dependencies

MRW and Python run on a Linux workspace host, including WSL2 or Remote SSH.
Windows VS Code may provide the interface. Ordinary reading requires VS Code
1.95+ and Python 3.11+, normally `python3`; set `mrw.pythonExecutable` in
User/Remote settings when needed. It requires no Qt, Lean, SageMath or AI account.

Windows VS Code with Debian WSL is the current checked arrangement. Earlier
reader checks cover Debian ARM64 over SSH; that does not qualify the separate
x86-64 justification runtime. Native Windows/macOS backends and Windows-backed
private artifact storage remain unqualified. Use one writing host per private
store and a trusted file workspace.

## Package and install a VSIX

Install `mrw-0.23.43.vsix` with **Extensions: Install from VSIX…** in the intended
workspace host. The recommended optional companion is
[MRW Diagnostics 0.1.0](https://github.com/flengyel/MRW/releases/download/v0.23.43/mrw-diagnostics-0.1.0.vsix).
Its weekly reports are opt-in. Save work before a requested reload and retain
workspace storage when upgrading.

To build from the repository root, use Python 3.11+, Linux Node.js 22+ and npm:

```sh
npm ci --prefix vscode --ignore-scripts
TZ=UTC SOURCE_DATE_EPOCH=1792094267 npm run package --prefix vscode
npm run verify-vsix --prefix vscode -- mrw-0.23.43.vsix
sha256sum vscode/mrw-0.23.43.vsix
```

Packaging bundles the Python core and pinned Lean source assets, not a compiled
checker, and publishes nothing. The verifier checks the manifest, runtime bytes,
source pins and dependency notices. Tests, build caches and generated archives
are excluded. [Release procedure](../docs/RELEASING.md).

## Workflows

- [Lean study](../docs/LEAN_STUDY_WORKFLOW.md): companion lessons, editable examples,
  solutions, notes and Return. The lesson project pins Lean 4.33.0, independently
  of the justification runtime's 4.32.2. Live goals use the official
  `leanprover.lean4` extension on the workspace host.
- [SagePod/Jupyter](../docs/GETTING_STARTED_WSL_SAGEPOD.md): computation in an
  external kernel. Opening MRW starts no container and runs no cells.
- [Proof Outlines](../docs/PROOF_GRAPH_WORKFLOW.md): claims, cited passages,
  editable summaries and reversible display simplification. Graph validation
  does not check a mathematical proof.
- [AI assistance](../docs/READER_AI_WORKFLOW.md): explicit Codex clipboard handoffs
  or the separate API preview and Send workflow. Replies remain attributed proposals.
- [Recommended companions](../docs/RECOMMENDED_EXTENSIONS.md): LaTeX/PDF, Markdown,
  Lean, notebook and citation tools, with prerequisites and compatibility limits.

## Zotero references

Use **Sources and References → Find Zotero Reference…** for lookup, citation
insertion and attachments. Enable Zotero's **Settings → Advanced → Allow other
applications on this computer to communicate with Zotero**, and keep it running
for new reads. Windows Zotero can be reached from WSL through Windows loopback.

Pandoc-style citations such as `[@key]` render through a selected processor and
bibliography or Better BibTeX lookup. Snapshot notices identify the library or
bibliography actually read. [Zotero workflow](../docs/ZOTERO_WORKFLOW.md).

### Notebook results

Retain a saved notebook with optional companion notes, reopen its outputs,
compare alternatives and export their provenance. Producer-reported execution
and retained output bytes remain distinct; reopening restores no kernel or
running job. SageQueue queues SageMath jobs through SagePod; an MRW adapter
is not implemented. [Notebook workflow](../docs/NOTEBOOK_RESULTS.md).

## Data and history

Ordinary notes, notebooks and Lean files remain files owned by their editors.
MRW stores source captures, annotations, API investigation records and immutable
justification results separately. Copying a note link does not copy its private
target. Source-note and Zettelkasten-note associations preserve each work's
text and attribution independently.

History records MRW operations, versions and outcomes rather than unrelated
application activity. **Inspect Study History** and **Export Study History…**
provide local reports; exports may contain private mathematics. Diagnostics and
shared history are optional. Missing observations are not zero use.

<a id="saved-artifact-location-070"></a>

### Saved artifact location

**Move Saved Work Directory…** transfers supported source, annotation, API
investigation and justification records. **Open Saved Work Directory…** adopts
a verified store. These commands do not transfer every notebook snapshot,
study checkpoint or history record. [Storage and recovery](../docs/ARTIFACT_STORAGE.md).

## Moving a workspace

**Move Workspace…** verifies its defined workspace and private-data scope before
committing a destination; **Recover Workspace Move** handles interruptions.
Opening the destination is explicit. External notes retain their notes-folder
root and relative filename. Exact citations keep their original revisions.
[Workspace relocation](../docs/WORKSPACE_RELOCATION_DESIGN.md).

## Study a difficult passage

Deliberate source study, saved attempts and opt-in spaced review remain
separately accessible from the Command Palette. **Resume Study**, history
inspection/export and Archive/Restore or Trash controls preserve earlier work.
Opening or following a note requires none of these records.
[Study workflow](../docs/ACTIVE_STUDY_WORKFLOW.md) ·
[Lifecycle](../docs/STUDY_LIFECYCLE.md).

<a id="manual-markdown-overviews-across-sources"></a>

### Link retained passages from a document

**Insert Source or Passage Link…** inserts an exact retained reference;
**Follow Source or Passage Link at Cursor** opens it. The note stays an ordinary
editable file. A stable source identifier does not freeze its contents.

<a id="offline-source-region-reader"></a>

### Offline saved-source reader

**Retain Document as Source** keeps the selected UTF-8 text and exact ranges.
Original-file edits do not replace that revision or its reader notes.

<a id="outline-persistence-boundary"></a>

### Retained-source references

Exact citations bind the source, revision and passage. Changing a current
locator or note association does not redirect an earlier citation.
[Persistence details](../docs/VS_CODE_DEVELOPMENT_HISTORY.md#outline-persistence-boundary).

### Investigation persistence boundary

The API investigation retains exact parent/child response bindings and an
unfinished summary. It does not own ordinary editor buffers.
[Investigation details](../docs/VS_CODE_DEVELOPMENT_HISTORY.md#investigation-persistence-boundary).

### Obsidian companion notes

MRW resolves note IDs and backlinks within the chosen folder. Obsidian creates
notes through its configured command and template; MRW opens the same files.
It neither discovers arbitrary vaults nor synchronizes them.
[Obsidian setup](../docs/OBSIDIAN_WORKFLOW.md).

## Run from this checkout

Open `vscode/` on the intended host, run `python3 scripts/bundle-core.py` and
press F5. Use a disposable workspace, not working notes or saved research.
From the repository root:

```sh
npm run check --prefix vscode
npm test --prefix vscode
PYTHONPATH=src python3 -m unittest discover -s tests -v
```

Lean checks use the repository's pinned toolchain and separate build profiles;
see [route search](../docs/JUSTIFICATION_ROUTE_SEARCH.md). Tests that require a
compiled checker, Qt, TikZ or native host report those prerequisites separately.
The guarded native preparer is `vscode/scripts/prepare-native-host.py`.
[Native isolation](../docs/NATIVE_TEST_ISOLATION.md).

<a id="reproduce-the-bounded-outline-host-checks"></a>

### Reproduce the outline host checks

Earlier checks retain their [source and reproduction steps](../docs/VS_CODE_DEVELOPMENT_HISTORY.md#reproduce-the-bounded-outline-host-checks).
Use each release's report for the behavior observed in that version.

## Development records and notices

[Development records](../docs/VS_CODE_DEVELOPMENT_HISTORY.md) and the
[CHANGELOG](../CHANGELOG.md) retain earlier implementation and host evidence,
including the separate Qt/CLI prototype. [Contributing](../CONTRIBUTING.md).

The package includes MRW's [Apache-2.0 license](../LICENSE) and notices for
KaTeX, markdown-it, ts-fsrs and Quiver. Source material retains its own license;
[publication notes](../PUBLIC_READINESS.md) describe attribution and disclosure.
