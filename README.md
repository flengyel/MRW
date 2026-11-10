# Mathematical Research Workstation

MRW is an experimental VS Code extension for mathematical study and research.
It opens documents in place, connects them through Contents, links and
backlinks, and preserves a Return destination while following references.
Questions, solutions and commentary can stay in their notes.

The extension provides reading, navigation, source retention and annotation
tools. Resuming work across notes, calculations and proofs, and reconstructing
compressed AI-generated arguments remain design goals.

**MRW 0.23.9 — source readers and plugins prerelease.**
[Download the VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.9/mrw-0.23.9.vsix)
· [Release notes and checksums](https://github.com/flengyel/MRW/releases/tag/v0.23.9).
There is no Marketplace listing. The extension ID is `flengyel.mrw`.
[Installation](docs/INSTALLATION.md) · [User guides](docs/README.md) ·
[Latest repair report](docs/READING_REPAIRS.md) · [Contributing](CONTRIBUTING.md)

## What works

- Open Markdown notes in place, including notes in an Obsidian vault. Obsidian
  and the maintainer's Zettel conventions are optional.
- Navigate headings, ordinary links, WikiLinks and backlinks. WikiLinks support
  scoped paths, headings and supported block IDs.
- Render mathematical notation and supported note-local macros. Render TikZ
  diagrams on request in Markdown notes or saved reader annotations.
- Open PDFs through an available reader and return to the referring document.
- Import a Stacks Project or Kerodon section, retain its source revision and
  exact passages, and add separately attributed annotations.
- Use SageMath/Jupyter, Lean, LaTeX tools and Codex alongside MRW through their
  VS Code interfaces.
- Study functions, proofs and dependent application through **Study Lean 4…**:
  a companion lesson, editable core-only examples and the native Lean InfoView.

Rendering, retained citations and navigation checks do not establish
mathematical correctness. Calculations, formal proof checking and review of an
argument remain distinct activities.

<a id="open-existing-work"></a>

## Open a document

1. Choose **MRW: Open Document…**. **Original file** opens the current file in
   place; **Saved copy** opens a retained revision with MRW annotations.
   **Browse for another document…** is available while other entries load.
2. With a Markdown document active, choose **MRW: Show Contents**. The MRW
   sidebar identifies the selected document and lists its headings and links,
   including unsaved edits.
3. Select a heading to move within the document. Follow a link through Contents
   or **MRW: Follow Document Link**, or click a WikiLink in preview. These routes
   retain the originating location for **MRW: Return to Document**.
   **MRW: Reopen Document** opens the last opened or followed file and restores
   a saved Markdown selection when it still matches.
4. For note-ID lookup and backlinks, choose **MRW: Choose Notes Folder…** for
   the intended folder. Use **MRW: Show Backlinks…** to inspect incoming
   references. Choosing a folder leaves its notes in place.

The document picker lists the current folder before reading titles. Enter a
subfolder to browse it, or choose **Search subfolders…** to search below it.
The picker reports when search limits leave results incomplete.
Browsing does not change the notes folder's lookup scope. Opening an
original does not import it; opening a saved copy does not refresh or overwrite
its retained source.

PDFs open in a registered reader or, on request, the system reader.
MRW does not extract PDF text, build PDF Contents or restore PDF pages.
**New Document…** creates Markdown. Ordinary reading requires no problem record
or exercise form.

Start with **MRW: Open Tutorial**, or read the
[document workflow](docs/READING_OUTLINE_WORKFLOW.md). The
[Obsidian guide](docs/OBSIDIAN_WORKFLOW.md#configure-obsidian-with-mrw) covers
opening the same notes in both applications and the Windows/WSL arrangement.

## Host and installation

MRW and Python run on a **Linux workspace host**, including WSL2 or Remote SSH.
Windows VS Code can provide the interface. Required: VS Code 1.95+ and Python
3.11+ on that host. Reading with an installed VSIX needs no npm, Qt, Lean or AI
account. TikZ rendering has separate [tool requirements](docs/TIKZ_WORKFLOW.md).

| Arrangement | Recorded checks |
| --- | --- |
| Windows VS Code + WSL2 Debian | Current reading repairs and earlier reader/persistence checks |
| Windows VS Code + Remote SSH to Raspberry Pi 5, Debian 12 ARM64 | Earlier scoped installed-reader checks |
| Local Linux and other Linux SSH hosts | Intended hosts; separate desktop validation remains |
| Native Windows or macOS backend | Not qualified |

In the intended Linux/WSL/SSH window, run **Extensions: Install from VSIX…** and
select `mrw-0.23.9.vsix`. Confirm installation on the workspace host. Save work
before a requested reload and retain workspace storage when upgrading. Follow
the [installation guide](docs/INSTALLATION.md) for details.

To build from source, install Linux Node.js 22+ and npm, then run from the
repository root:

```sh
npm ci --prefix vscode --ignore-scripts
TZ=UTC SOURCE_DATE_EPOCH=1792094267 npm run package --prefix vscode
npm run verify-vsix --prefix vscode -- mrw-0.23.9.vsix
sha256sum vscode/mrw-0.23.9.vsix
```

Packaging copies the shared Python core into the VSIX; it does not publish it.
See [development and checks](vscode/README.md#run-from-this-checkout) for F5
launching, tests and package verification.
[Release preparation](docs/RELEASING.md) records the source-marker and publication
procedure. GitHub updates require downloading and installing the newer VSIX.

## Recommended extensions

Start with VS Code's built-in Markdown preview, which renders mathematics.
Install companions for the tasks that need them:

| Task | Extension | Identifier |
| --- | --- | --- |
| Write LaTeX, build and view PDFs | [LaTeX Workshop](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop) | `James-Yu.latex-workshop` |
| Richer Markdown previews, diagrams and export | [Markdown Preview Enhanced](https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced) | `shd101wyy.markdown-preview-enhanced` |
| Work in SagePod notebooks | [Jupyter](https://marketplace.visualstudio.com/items?itemName=ms-toolsai.jupyter) | `ms-toolsai.jupyter` |
| SageMath language support | [SageMath Enhanced](https://marketplace.visualstudio.com/items?itemName=Lov3.sagemath-enhanced) | `Lov3.sagemath-enhanced` |
| Edit and check Lean proofs | [Lean 4](https://marketplace.visualstudio.com/items?itemName=leanprover.lean4) | `leanprover.lean4` |
| Read PDFs when no suitable viewer is installed | [vscode-pdf](https://marketplace.visualstudio.com/items?itemName=tomoki1207.pdf) | `tomoki1207.pdf` |

LaTeX Workshop needs a TeX distribution; Jupyter connects to a separate kernel.
These extensions handle editing, calculation and checking.
Keep a previewer or PDF reader that works. The
[companion guide](docs/RECOMMENDED_EXTENSIONS.md) explains host placement and
preview choices; the PDF extension's cross-host MRW handoff remains unobserved.

## Other reading tools

- [Lean study](docs/LEAN_STUDY_WORKFLOW.md): open the first companion unit for
  *Theorem Proving in Lean 4*, keep notes and resume edited code. The optional
  official Lean extension runs on the workspace host, including WSL Debian.
  [Local lesson packs](docs/LEAN_LESSON_PACKS.md) add content without rebuilding MRW.
- [Stacks Project and Kerodon](docs/STACKS_WORKFLOW.md): import a section with
  source-qualified identifiers such as `stacks-project:08ZE` and `kerodon:0004`;
  reopen its retained revision offline.
- [TikZ diagrams](docs/TIKZ_WORKFLOW.md): render on request using an isolated
  compiler, while preserving the note or annotation source.
- [Proof outlines](docs/PROOF_GRAPH_WORKFLOW.md): inspect claims and linked
  sources, edit attributed summaries and collapse displayed intermediate steps.
- [AI assistance](docs/READER_AI_WORKFLOW.md): exchange selected material with
  Codex manually, or use MRW's separate API request preview and Send controls.
- [SagePod notebooks](docs/GETTING_STARTED_WSL_SAGEPOD.md): work with a SageMath
  kernel through Jupyter. Opening MRW starts no container and runs no cells.

[flengyel/Zettel](https://github.com/flengyel/Zettel) and its
[wiki](https://github.com/flengyel/Zettel/wiki) describe the maintainer's optional
Zettelkasten conventions.

## Optional source study

For deliberate practice on a selected passage, **Study Current Material** offers
questions, saved attempts, attributed companion replies and opt-in review using
FSRS. **Work through a proof…** supports a separate passage-and-outline handoff.
Opening or following notes does not create a study. Earlier document-linked
work remains readable after removal of the
document Problems interface.

[Source-study workflow](docs/ACTIVE_STUDY_WORKFLOW.md) ·
[Proof-study workflow](docs/PROOF_STUDY_WORKFLOW.md) ·
[Removal and preservation checks](docs/DOCUMENT_PROBLEMS_REMOVAL.md)

## Data and transfers

Ordinary notes, notebooks, proof graphs and file-based studies remain files.
Their editors own saving, undo and recovery. MRW keeps retained source revisions
and attributed annotations in a source store associated with the workspace.

Source-study checkpoints and interaction history live separately in private
VS Code workspace storage on the host. They can include drafts, submissions,
replies, exact source snapshots and reported outcomes or effort. **Inspect Study
History** shows a local report; **Export Study History…** exports selected
sessions. MRW does not record unrelated application activity or infer
comprehension from it. Scheduling and effort reports do not establish a
learning benefit.

Companion handoffs require copying and pasting the selected material.
The separate API workflow sends only after its request preview and Send action.
Pasted attribution does not authenticate a reply or verify its mathematics.

Saved-work move/reconnect commands transfer supported source records and
annotations. They do **not** transfer current source-study checkpoints or
interaction history. Copying Markdown links alone transfers neither private
source targets nor study state. See [storage and moves](docs/ARTIFACT_STORAGE.md)
before changing the workspace or store location.

## Limits and contributions

MRW is under active development. Native preview scroll positions, PDF pages,
Obsidian embeds and arbitrary LaTeX preambles/packages are not supported.
Automatic prerequisite discovery, whole-corpus ingestion, general proof checking
and recovery of calculation sessions are not implemented. Multiple hosts writing
one private store and Windows-backed artifact storage are not qualified.
Source-study state has no cross-machine migration interface.

Contributions can improve navigation, accessibility, documentation or another
specific obstacle encountered during mathematical work. See
[CONTRIBUTING.md](CONTRIBUTING.md) for bug reports, focused pull requests and
discussion of larger proposals. Preserve notes, source attribution and
unfinished work; follow the native VS Code interface conventions.

## Project documents and license

[Documentation index](docs/README.md) ·
[Research-workstation design](docs/RESEARCH_WORKSTATION_DESIGN.md) ·
[Vision](VISION.md) · [Domain model](DOMAIN_MODEL.md) ·
[Vocabulary](VOCABULARY.md) · [UX specification](UX_SPEC.md)

[AGENTS.md](AGENTS.md), the [current plan](CODEX_PLAN.md) and
[continuation](docs/CODEX_CONTINUATION.md) guide development. The
[changelog](CHANGELOG.md) and [earlier extension details](docs/VS_CODE_DEVELOPMENT_HISTORY.md)
describe earlier versions, including the separate Qt/CLI prototype.

MRW code is Copyright 2026 F. Lengyel, [Apache-2.0](LICENSE). Bundled dependencies
retain their own licenses and notices. Stacks fixtures retain
[upstream attribution and GFDL](tests/fixtures/stacks/README.md). The project
license does not relicense retained source material.
[PUBLIC_READINESS.md](PUBLIC_READINESS.md) records the publication review and
its unresolved disclosure and attribution decisions.

Source readers provide **Original page / Saved text** controls and persistent
Stacks Project/Kerodon import buttons. **Import Source…** also supports nLab and
explicitly registered source plugins. Retained snapshots remain readable without
the plugin. See [source plugins](https://github.com/flengyel/MRW/blob/main/docs/SOURCE_PLUGINS.md)
and [nLab](https://github.com/flengyel/MRW/blob/main/docs/NLAB_WORKFLOW.md) for
installation, supported mathematics, revision evidence and limits.
