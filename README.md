# Mathematical Research Workstation

MRW is an experimental mathematical research workstation in VS Code. Its purpose
is to keep questions, documents, attempts, calculations and checking evidence
connected so work can be resumed. Reconstructing compressed arguments, including
LLM-generated solutions, and testing comprehension are central uses.

The current release supplies source reading, study, attributed assistance and
bounded resumption. The broader document and research workflow is being built
in stages; the capability list below describes what is delivered.

**Current version: 0.19.2.** The repository remains private. There is no published
Marketplace listing or GitHub release; obtain a maintainer VSIX or build locally.
The technical extension identity remains `flengyel.theorem-terminal`.

The [current design](docs/RESEARCH_WORKSTATION_DESIGN.md) starts with the delivered
Document, Contents, Saved source and Passage terminology; the command instructions
below name the 0.19.2 interface. The next [implementation task](docs/CODEX_EXISTING_DOCUMENTS_PROMPT.md)
connects existing documents and optional Zettel/Obsidian notes and updates the
tutorial with that workflow. Later increments make research questions resumable
independently of an AI exchange and join these tools in an argument-reconstruction
session. The [tutorial source](vscode/media/first-steps.md) now starts with existing
work; this documentation revision alone does not update an installed VSIX.

## What works

- Retain a saved text passage with its exact reference and source revision.
- Enter questions manually or exchange one bounded handoff with the Codex companion.
- Submit work, retain a returned explanation, revise the work and resume later.
- Keep selected recall questions for short, source-scoped review using FSRS.
- Inspect and explicitly export local interaction history and its source snapshots.
- Read and annotate sources, navigate Markdown documents and inspect proof graphs.

Source retention and graph validation check structure and identity. They do not
check a mathematical argument. Reader reports, AI proposals and external checking
remain separate. Scheduling and optional mental-effort reports establish no
learning benefit or causal comparison between releases.

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
select `theorem-terminal-0.19.2.vsix`. Confirm installation under that workspace
host's extensions. Save work before a requested reload; keep workspace storage
when upgrading. Detailed steps: [installation](docs/INSTALLATION.md).

To build from a checkout with repository access, install Linux Node.js 22+ and npm,
then run from the repository root:

```sh
npm ci --prefix vscode --ignore-scripts
TZ=UTC SOURCE_DATE_EPOCH=1792094267 npm run package --prefix vscode
npm run verify-vsix --prefix vscode -- theorem-terminal-0.19.2.vsix
sha256sum vscode/theorem-terminal-0.19.2.vsix
```

Packaging copies the shared Python core into the VSIX. It publishes nothing.
[Development and checks](vscode/README.md#run-from-this-checkout) describe F5,
regressions and package verification.

## One short study

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

## Documents and Contents

**Show Contents** lists headings and MRW source links in the selected Markdown
document, including unsaved edits. **New Document…** creates Markdown;
**Choose Document…** selects Markdown for Contents. Document is a general term;
other formats use the host's available editors/readers. This patch adds no PDF
extraction or general document opener. **Retain Document as Source** and **Open
Saved Source…** preserve the existing retention path. Proof Outline and Studies
keep their meanings. [Guide](docs/READING_OUTLINE_WORKFLOW.md) ·
[Patch validation](docs/DOCUMENT_TERMINOLOGY_VALIDATION.md).

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
- [Markdown overviews](docs/READING_OUTLINE_WORKFLOW.md): headings and exact source
  links become a navigator. Return reopens the originating overview.
- [Proof graphs](docs/PROOF_GRAPH_WORKFLOW.md): select claims, inspect linked
  sources, correct summaries and reversibly omit intermediate displayed vertices.
- [Obsidian](docs/OBSIDIAN_WORKFLOW.md): import a note or link it without converting
  the vault. [TikZ](docs/TIKZ_WORKFLOW.md) rendering is explicit and isolated.
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
