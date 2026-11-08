# Mathematical Research Workstation

MRW is an experimental mathematical research workstation in VS Code for working
with notes, papers, calculations and proofs. It opens documents in place and
connects them through Contents, ordinary links, backlinks and Return. Questions,
solutions and commentary can stay in the notes that contain them.

Opening or following a document never creates a problem record or launches an
exercise form. Additional interactions must remove a demonstrated obstacle
without duplicate entry. Research resumption starts with existing documents,
locations and unfinished work; it does not require Research Question registration.
Broader recovery and integrated argument reconstruction remain planned.

The current release opens existing notes and papers in place, follows note and
PDF links, and provides Contents, backlinks and Return. Reading requires no
problem record. The document Problems interface introduced in 0.23.0 is removed;
earlier saved work and drafts remain readable.

**Current version: 0.23.4.** [Ordinary-work rules and delivery](docs/ORDINARY_WORK_RULES.md).
[Subsystem removal and preservation checks](docs/DOCUMENT_PROBLEMS_REMOVAL.md).
The repository remains private. There is no published Marketplace listing or
GitHub release; obtain a maintainer VSIX or build locally. The technical
extension identity is `flengyel.mrw`.

The [current design](docs/RESEARCH_WORKSTATION_DESIGN.md) distinguishes Document,
Contents, Saved source and Passage. Use **Open Document…**, follow links and use
**Return to Document** to continue reading. The tutorial identifies the active
extension build. General research resumption and integrated argument
reconstruction remain later increments.

Navigation repair **0.23.1** preserves the last usable Return destination when
a note link or backlink changes during opening, and rechecks a backlink's
current folder scope before loading it. New notes use the active preview group
without displacing an unrelated text pane. [Checks and limits](docs/DOCUMENT_NAVIGATION_REPAIR.md).

## What works

- Open original notes and papers without importing them.
- Follow note/PDF links, inspect backlinks and return within an explicitly chosen notes folder.
- Retain a saved text passage with its exact reference and source revision.
- Import a Stacks Project section or Kerodon section with source-qualified citations.
- Enter questions manually or exchange one bounded handoff with the Codex companion.
- Submit work, retain a returned explanation, revise the work and resume later.
- Keep selected recall questions for short, source-scoped review using FSRS.
- Inspect and explicitly export local interaction history and its source snapshots.
- Read and annotate sources, navigate Markdown documents and inspect proof graphs.

Source retention and graph validation check structure and identity. They do not
check a mathematical argument. Reader reports, AI proposals and external checking
remain separate. Scheduling and optional mental-effort reports establish no
learning benefit or causal comparison between releases.

Patch **0.21.1** repairs Kerodon equations split by HTML parsing and prevents
completed source imports from blocking Return, refresh and other reader actions.
The reader's **Open original source ↗** button opens the current published page;
offline reading keeps the exact retained revision. Existing sources, citations
and annotations are unchanged. [Repair and checks](docs/READER_REPAIR_VALIDATION.md).

## Host and installation

The extension and Python run on a **Linux workspace host**, including WSL2 or
Remote SSH. Windows VS Code may supply the interface. Required: VS Code 1.95+
and Python 3.11+ on that host. An installed VSIX needs no npm, Qt, Lean or AI account.

| Arrangement | Evidence |
| --- | --- |
| Windows VS Code + WSL2 Debian | Earlier installed reader and persistence checks |
| Windows VS Code + Remote SSH to Raspberry Pi 5, Debian 12 ARM64 | Earlier scoped installed reader checks |
| Local Linux and other Linux SSH hosts | Intended hosts; separate desktop validation required |
| Native Windows or macOS backend | Not qualified |

The latest study checks and host limitations are recorded in
[ACTIVE_STUDY_VALIDATION.md](docs/ACTIVE_STUDY_VALIDATION.md). Earlier reader checks
are not acceptance evidence for the new interaction.

In the intended Linux/WSL/SSH window, run **Extensions: Install from VSIX…** and
select `mrw-0.23.4.vsix`. Confirm installation under that workspace
host's extensions. Save work before a requested reload; keep workspace storage
when upgrading. Detailed steps: [installation](docs/INSTALLATION.md).

To build from a checkout with repository access, install Linux Node.js 22+ and npm,
then run from the repository root:

```sh
npm ci --prefix vscode --ignore-scripts
TZ=UTC SOURCE_DATE_EPOCH=1792094267 npm run package --prefix vscode
npm run verify-vsix --prefix vscode -- mrw-0.23.4.vsix
sha256sum vscode/mrw-0.23.4.vsix
```

Packaging copies the shared Python core into the VSIX. It publishes nothing.
[Development and checks](vscode/README.md#run-from-this-checkout) describe F5,
regressions and package verification.

## Recommended extensions

Start with VS Code's built-in Markdown preview, which already renders mathematics.
For other tasks, install only the relevant companions:

| Task | Recommended extension | Extension identifier |
| --- | --- | --- |
| Write LaTeX manuscripts, build and view PDFs | [LaTeX Workshop](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop) | `James-Yu.latex-workshop` |
| Richer Markdown previews, diagrams and export | [Markdown Preview Enhanced](https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced) | `shd101wyy.markdown-preview-enhanced` |
| Work in SagePod notebooks | [Jupyter](https://marketplace.visualstudio.com/items?itemName=ms-toolsai.jupyter) | `ms-toolsai.jupyter` |
| SageMath language support for the documented notebook setup | [SageMath Enhanced](https://marketplace.visualstudio.com/items?itemName=Lov3.sagemath-enhanced) | `Lov3.sagemath-enhanced` |
| Edit and check Lean proofs | [Lean 4](https://marketplace.visualstudio.com/items?itemName=leanprover.lean4) | `leanprover.lean4` |
| Read standalone PDFs if no suitable viewer is already installed | [vscode-pdf](https://marketplace.visualstudio.com/items?itemName=tomoki1207.pdf) | `tomoki1207.pdf` |

These companions are optional. LaTeX Workshop needs a TeX distribution; Jupyter
connects to a separate kernel. The PDF viewer's MRW handoff across WSL/local hosts
has not yet been observed. Keep an existing working previewer or PDF reader.
See [the companion guide](docs/RECOMMENDED_EXTENSIONS.md) for setup, host placement
and the distinction between Markdown previews and MRW's saved-source reader.

Obsidian can edit the same Markdown files opened in MRW. Select the vault root
with **MRW: Choose Notes Folder…**; see [Obsidian configuration](docs/OBSIDIAN_WORKFLOW.md#configure-obsidian-with-mrw)
for settings and the Windows/WSL setup. [flengyel/Zettel](https://github.com/flengyel/Zettel)
and its [wiki](https://github.com/flengyel/Zettel/wiki) document the maintainer's
Zettelkasten format and Obsidian configuration. Those conventions are optional.

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

Follow a note or PDF from Contents, or use **MRW: Follow Document Link** at its
link in the editor. **MRW: Show Backlinks…** opens incoming source occurrences;
**MRW: Return to Document** returns to the origin. The selected document/folder
and matching return pin survive an ordinary restart in this workspace.
**MRW: Reopen Document** opens the last opened/followed file explicitly; activation
does not open it automatically. VS Code owns dirty buffers, Save, Undo and recovery.

A PDF uses an available host reader; if none is registered, MRW offers an explicit
**Open with system reader** handoff. MRW supplies file-level opening and return,
without extraction, PDF Contents or page restoration. **Show Contents**
and **Choose Document…** select Markdown for navigation; **New Document…**
creates Markdown. Retaining a source revision and importing text remain separate,
optional operations. Start with **MRW: Open Tutorial** or the
[document workflow](docs/READING_OUTLINE_WORKFLOW.md).

## Optional source study

These tools are explicitly invoked when useful. Reading and returning to notes
use the document navigation above.

For an offline demonstration, run **MRW: Open Study Example**. It opens original,
attributed elementary source text and two questions. Loading is explicit and its
practice history is marked separately from research use. It does not replace a
study or require Codex.

For your own material:

1. Select a passage in a saved UTF-8 text/Markdown/TeX file and run **MRW: Study
   Current Material**. In a retained source, use **Study current material**.
2. Read the selected passage, then **Enter a question**. Alternatively, copy the
   question handoff to Codex and import its proposed questions from the clipboard.
3. Start a question, type an answer or mark work done on paper, then **Submit
   answer**. A submitted version stays immutable when you revise the work.
4. If you need help, copy a help handoff to Codex. Paste the reply into MRW's
   help form, review the text and attribution, and retain it beside the attempt.
5. Continue with revised work, report the outcome and consultation, then
   **Pause / save**. **MRW: Resume Study** restores unfinished work directly.

Starting recall conceals the answer and source within the study. Revealing help
before submission marks exposure for that submission. Later help does not change
the earlier submission. Prior study remains recorded without permanently
excluding a later independent recall attempt.

The **Studies** sidebar contains recent studies, sources and questions. Its **…**
menu and the Command Palette contain source operations and history inspection.
**Keep for review** explicitly enrolls a question; creating it alone does not.
Short blocks default to three questions, about five minutes and one new question,
with adjustable limits and no interrupted attempt.

[Study workflow](docs/ACTIVE_STUDY_WORKFLOW.md) ·
[offline tutorial](vscode/media/first-steps.md) ·
[proof-study handoff](docs/PROOF_STUDY_WORKFLOW.md).


## Data and transfers

Ordinary source, note, graph and legacy study files remain ordinary files; VS Code
owns their save, undo and recovery. MRW retains source revisions and attributed
annotations in a private source store associated with the workspace.

Current studies and local history live in the extension's **private VS Code
workspace storage on the workspace host**, in `active-studies-v1` and
`study-history-v1`. They include question revisions, drafts/checkpoints,
submissions, reported outcomes/effort, help and request snapshots, references,
software versions, actions, cancellations and errors. They can contain private
mathematics. No unrelated application activity or passive comprehension is recorded.

**Inspect Study History** opens a local report. **Export Study History…** creates
an ordinary readable or JSON export after session selection. Required linked
context outside the selection is labeled; unavailable context stays missing.
Exports are not automatic. Review their content before sharing.

The companion uses **explicit clipboard transfers**. A handoff contains the exact
selected passages, references and task/work included in the request. You choose
where to paste it. Pasting a reply into MRW associates it with the request; it
does not authenticate the author or check correctness. MRW does not monitor the
clipboard or send these study requests automatically.

Source-store move/reconnect commands transfer supported source records and
annotations. They do **not yet transfer current-study checkpoints or interaction
history**. Copying Markdown links alone transfers neither private source targets
nor study state. Keep the original workspace/storage when continuing work.

## Other reading tools

- [Source reader and Stacks import](docs/STACKS_WORKFLOW.md): retain a bounded
  section at a pinned official revision; reopen it offline.
- [Documents and Contents](docs/READING_OUTLINE_WORKFLOW.md): headings, local note
  links and exact saved references become a navigator. Backlinks and Return keep
  their originating occurrences.
- [Proof graphs](docs/PROOF_GRAPH_WORKFLOW.md): select claims, inspect linked
  sources, correct summaries and reversibly omit intermediate displayed vertices.
- [Notes and Obsidian](docs/OBSIDIAN_WORKFLOW.md): navigate an explicitly selected
  folder in place, or supply an optional Obsidian association without converting
  a vault. [TikZ](docs/TIKZ_WORKFLOW.md) rendering is explicit and isolated.
- [SagePod notebooks](docs/GETTING_STARTED_WSL_SAGEPOD.md) use Jupyter separately;
  computation is optional and opening MRW starts no container.

## Limits and contributions

MRW is under active development. Companion exchange is manual; pasted attribution
is a reader claim. Source extraction from PDFs, automatic prerequisite discovery,
whole-corpus ingestion and general proof checking are not implemented. Multiple
hosts writing one private store and Windows-backed artifact storage are not
qualified. Current-study state has no cross-machine migration interface.

Useful contributions address a reproducible obstacle in a mathematical session:
a lost draft, a wrong reference, an inaccessible control, a misleading report or
a failed save/reopen. Include extension/host versions, a small distributable
source and precise reproduction steps. Keep private history, paths and credentials
out of reports. A focused regression should identify what was preserved or changed.

Read [AGENTS.md](AGENTS.md) and [the current plan](CODEX_PLAN.md) before changing
persistence or evidence handling. Preserve source bytes, attribution and existing
work. Keep structural tests separate from mathematical assessment and measured use.

## Project documents and license

[Vision](VISION.md) · [domain model](DOMAIN_MODEL.md) · [vocabulary](VOCABULARY.md) ·
[UX specification](UX_SPEC.md) · [continuation](docs/CODEX_CONTINUATION.md) ·
[public readiness](PUBLIC_READINESS.md) · [changelog](CHANGELOG.md).

The [historical development account](CHANGELOG.md) preserves earlier releases and
legacy Qt/CLI usage. Those frontends and the optional Lean justification experiment
are separate from the first VS Code study session; see
[the archived extension details](docs/VS_CODE_DEVELOPMENT_HISTORY.md) for old checks.

MRW code is Copyright 2026 F. Lengyel, [Apache-2.0](LICENSE). Bundled KaTeX,
markdown-it and ts-fsrs retain their licenses and dependency notices. Stacks test
fixtures retain their [upstream attribution and GFDL](tests/fixtures/stacks/README.md).
Third-party evidence and the remaining publication decisions are documented in
[PUBLIC_READINESS.md](PUBLIC_READINESS.md); the project license does not relicense
retained source material.
