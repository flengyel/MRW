# Mathematical Research Workstation

<p align="center">
  <a href="docs/assets/avatars/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="docs/assets/mrw-logo-dark.png">
      <img src="docs/assets/mrw-logo-light.png" width="224" alt="MRW emblem. A spear and Turing tape on the left, books and a threaded spindle on the right.">
    </picture>
  </a>
</p>

MRW supports mathematical understanding and research. Its aims are to study
literature and AI-generated mathematics, inspect grounds for using results,
and continue unfinished work.

[Download the latest published VSIX (0.23.66)](https://github.com/flengyel/MRW/releases/download/v0.23.66/mrw-0.23.66.vsix)
· [Release and checksums](https://github.com/flengyel/MRW/releases/tag/v0.23.66)
· [Installation](docs/INSTALLATION.md) · [Guides](docs/README.md)

Experimental VS Code extension: `flengyel.mrw`. Requires a Linux workspace host
(including WSL2 or Remote SSH), Python 3.11+ and VS Code 1.95+.

<a id="open-existing-work"></a>

## Start

1. Install the VSIX and run **MRW: Set Up MRW Workspace…**. On a fresh installation,
   it creates `~/mrw-work/MRW.code-workspace`. For an existing installation, reopen
   the workspace reported by setup. [Workspace setup](docs/WORKSPACE_SETUP.md)
2. For a new question, choose a notes folder with **Choose Notes Folder…**,
   then select **New Note…**. For an existing paper or note, use
   **Open Document…**. [Mathematics in ordinary notes](docs/MATHEMATICS_WITH_NOTES.md)
3. Follow references through **Contents** and use **Return to Document** to
   return to the argument. **Recent Documents…** reopens earlier work.

<a id="optional-source-study"></a>
<a id="justification"></a>

## Study and research

VS Code can reopen the files used in an argument. Their locations alone do not
say which passage was cited or which hypothesis justified a step. In MRW, the
reader can retain the cited passage at a particular revision and record the
grounds for using it.

| Task | Tools |
| --- | --- |
| Understand an argument | [Generate a mathematical atlas](docs/PROOF_STUDY_WORKFLOW.md#start-an-atlas-from-a-passage). Follow cited results in the **Proof map**, inspect exact passages in the **Blueprint**, or edit components through the **Reading list**. |
| Revisit a proof step | In **Study Current Material**, enter a question and choose **Keep for spaced review**. Return through **Resume Study**. [Attempts, feedback and scheduling](docs/ACTIVE_STUDY_WORKFLOW.md#review-and-effort). |
| Calculate | Jupyter and SagePod; [retained notebook results](docs/NOTEBOOK_RESULTS.md) preserve saved calculations for comparison. |
| Examine grounds | [Source-linked reasons and admitted premises](docs/JUSTIFICATION_WORKFLOW.md), using Artemov's Justification Logic. |

Ordinary reading requires no study record. General automatic Lean–English
translation remains a development goal.

## Related research

| System | Emphasis |
| --- | --- |
| [Eigenius](https://eigenius.io/docs/platform/justification-logic/) | Typed evidence and checkable grounds for research claims. |
| [Axiom Math](https://axiommath.ai/mission/) | Pursues mathematical discovery through conjecturing, proof search and translation between informal mathematics and Lean. |
| [Google AI co-scientist](https://research.google/blog/accelerating-scientific-breakthroughs-with-an-ai-co-scientist/) | Generates, evaluates and refines scientific hypotheses and research proposals. |
| [Kosmos](https://advances.edisonscientific.com/research/announcing-kosmos/) | Combines literature reading and computational analysis, tracing report conclusions to sources and code. |

[Further comparisons](docs/RESEARCH_WORKSTATION_DESIGN.md#related-systems-and-reuse).

## Optional plugins and integrations

| Integration | Use |
| --- | --- |
| [Obsidian](docs/OBSIDIAN_WORKFLOW.md) | Linked notes and the configured note-creation workflow. |
| [Emacs](docs/NOTE_COMPANIONS.md#capture-a-passage-in-emacs) | Send a retained passage and its link to your Denote or Org-roam template. |
| [Zotero](docs/ZOTERO_WORKFLOW.md) | References, attachments and citations. |
| [Lean](docs/LEAN_STUDY_WORKFLOW.md) | Native goals, diagnostics and proof checking. |
| [Jupyter and SagePod](docs/SAGEPOD_NOTEBOOK_WORKFLOW.md) | Notebook editing and computation. |

## Architecture

![MRW architecture](docs/assets/mrw-architecture.png)

[Architecture](docs/ARCHITECTURE.md) · [Data model](DOMAIN_MODEL.md)

The VS Code extension bundles its Python service and runs it with the workspace
host’s Python. **Open Tutorial** reports the active extension build.

## Data and transfers

Ordinary files remain in their editors. MRW stores retained sources and study
records separately; copying notes does not transfer their saved targets.
[Storage scope and moves](docs/ARTIFACT_STORAGE.md).

Files and local state from the retired desktop editor stay in their saved
locations. Its source and instructions are available in the
[0.23.66 archive](https://github.com/flengyel/MRW/blob/v0.23.66/README.md#qt-editor-source-installation).

## Contributors

- [Florian Lengyel](https://github.com/flengyel) maintains MRW.
- [Codex](https://github.com/codex) contributed to implementation, regression
  testing and release verification.

## Documentation and license

[Guides](docs/README.md) · [Avatar images](docs/assets/avatars/) · [Vision](VISION.md) · [Architecture](docs/ARCHITECTURE.md)
· [Current status](docs/DESIGN_RECONCILIATION.md) · [Contributing](CONTRIBUTING.md)

Copyright 2026 F. Lengyel. [Apache-2.0](LICENSE). Third-party material retains
its [source licenses and notices](tests/fixtures/stacks/README.md).
