# Mathematical Research Workstation

<p align="center">
  <a href="docs/assets/avatars/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="docs/assets/mrw-logo-dark.png">
      <img src="docs/assets/mrw-logo-dark.png" width="224" alt="MRW emblem. A spear and Turing tape on the left, books and a threaded spindle on the right.">
    </picture>
  </a>
</p>

MRW is an experimental VS Code extension for mathematical study and research. 

[Download MRW 0.23.70 (VSIX)](https://github.com/flengyel/MRW/releases/download/v0.23.70/mrw-0.23.70.vsix)
· [Release and checksums](https://github.com/flengyel/MRW/releases/tag/v0.23.70)
· [Installation](docs/INSTALLATION.md) · [Guides](docs/README.md)

The extension `flengyel.mrw` runs on Linux (locally, in WSL2, or over SSH).
It requires VS Code 1.95 or later and Python 3.11 or later.

<a id="open-existing-work"></a>

## Start

1. Install the VSIX and run **MRW: Set Up MRW Workspace…**. Open the workspace
   named by setup. On a first installation this is `~/mrw-work/MRW.code-workspace`.
   **Open Tutorial** shows which version of MRW is running. [Workspace setup](docs/WORKSPACE_SETUP.md)
2. Use **Open Document…** to open a paper or note. To start a note, select
   **Choose Notes Folder…**, then **New Note…**. [Writing mathematics in notes](docs/MATHEMATICS_WITH_NOTES.md)
3. Follow a link from **Contents** in a Markdown document. **Return to Document**
   takes you back to that occurrence of the link. **Recent Documents…** lists
   files opened in MRW.

<a id="optional-source-study"></a>
<a id="justification"></a>

## Study and research

| Task | How to do it |
| --- | --- |
| Cite a passage | Use [**Import Source…**](docs/SOURCE_PLUGINS.md) for the Stacks Project, Kerodon, or the nLab. A link to a saved passage opens the cited revision. |
| Trace a proof | Select a Markdown or LaTeX passage and run [**Generate Mathematical Atlas…**](docs/PROOF_STUDY_WORKFLOW.md#start-an-atlas-from-a-passage). Follow citations between results in **Proof map**, read statements and proofs in **Blueprint**, and edit hypotheses and conclusions in **Reading list**. |
| Review a question | Select a saved passage and run **Study Current Material**. Write a recall question and choose **Keep for spaced review**. **Resume Study** reopens the question and draft. [Spaced review](docs/ACTIVE_STUDY_WORKFLOW.md#review-and-effort) |
| Examine a justification | In [**Justification…**](docs/JUSTIFICATION_WORKFLOW.md), **Explore Euclid’s lemma** compares a proof using Bézout’s identity with one using unique factorization. MRW’s Lean checker verifies derivations from admitted premises in a fragment of Artemov’s Justification Logic. |
| Compare calculations | [**Retain Notebook Result…**](docs/NOTEBOOK_RESULTS.md) copies a saved `.ipynb` file, including its code and outputs. Open a copy and choose **Compare with another retained result**. |

## Related research

| System | What it does |
| --- | --- |
| [Eigenius](https://eigenius.io/docs/platform/justification-logic/) | Records evidence for research claims using Justification Logic. |
| [Axiom Math](https://axiommath.ai/mission/) | Develops AI systems to propose conjectures, find proofs, and translate between Lean and informal proofs. |
| [Google AI co-scientist](https://research.google/blog/accelerating-scientific-breakthroughs-with-an-ai-co-scientist/) | Proposes, compares and revises scientific hypotheses. |
| [Kosmos](https://advances.edisonscientific.com/research/announcing-kosmos/) | Analyzes data and links its conclusions to code and to passages in the literature. |

[Further comparisons](docs/RESEARCH_WORKSTATION_DESIGN.md#related-systems-and-reuse).

## Optional plugins and integrations

| Integration | Use |
| --- | --- |
| [Obsidian](docs/OBSIDIAN_WORKFLOW.md) | Create a note with the vault’s configured template and link notes to saved passages. |
| [Emacs](docs/NOTE_COMPANIONS.md#capture-a-passage-in-emacs) | Send a passage and its source link to a Denote or Org-roam capture template. |
| [Zotero](docs/ZOTERO_WORKFLOW.md) | Look up a reference, open an attachment, or insert a citation in a note. |
| [Lean 4](docs/LEAN_STUDY_WORKFLOW.md) | Work through Lean exercises and inspect proof goals in the Lean extension’s InfoView. |
| [Jupyter and SagePod](docs/SAGEPOD_NOTEBOOK_WORKFLOW.md) | Run SageMath cells in a Jupyter notebook using SagePod’s kernel. |
| [Codex and the OpenAI API](docs/READER_AI_WORKFLOW.md) | Copy a question and selected passages to Codex. For an API request, preview the text and send it from MRW. |
| [MRW Diagnostics](diagnostics/README.md) | In VS Code 1.96 or later, check saved records for errors and see which MRW features were used. |

## Architecture

![MRW architecture](docs/assets/mrw-architecture.png)

The extension uses its bundled Python package to import sources and save records.
[Architecture](docs/ARCHITECTURE.md) · [Data model](DOMAIN_MODEL.md)

## Data and transfers

MRW keeps saved passages, annotations and study records separately from notes.
Use [**Move Saved Work Directory…**](docs/ARTIFACT_STORAGE.md#what-moves) to
move saved sources and annotations. Use [**Move Workspace…**](docs/WORKSPACE_RELOCATION_DESIGN.md#using-the-commands)
to move a workspace with its study history and saved notebook results.

The [0.23.66 archive](https://github.com/flengyel/MRW/blob/v0.23.66/README.md#qt-editor-source-installation)
contains the source and installation instructions for the former desktop editor.

## Contributors

- [Florian Lengyel](https://github.com/flengyel) maintains MRW.
- [Codex](https://github.com/codex) contributed to implementation, regression
  testing and release verification.

## Documentation and license

[Guides](docs/README.md) · [Avatar images](docs/assets/avatars/) · [Vision](VISION.md)
· [Current status](docs/DESIGN_RECONCILIATION.md) · [Contributing](CONTRIBUTING.md)

Copyright 2026 F. Lengyel. [Apache-2.0](LICENSE). Third-party material retains
its [source licenses and notices](tests/fixtures/stacks/README.md).
