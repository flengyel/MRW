# Mathematical Research Workstation

MRW supports mathematical understanding and research. Its aims are to study
literature and AI-generated mathematics, inspect grounds for using results,
and continue unfinished work.

[Download MRW 0.23.45](https://github.com/flengyel/MRW/releases/download/v0.23.45/mrw-0.23.45.vsix)
· [Release and checksums](https://github.com/flengyel/MRW/releases/tag/v0.23.45)
· [Installation](docs/INSTALLATION.md) · [Guides](docs/README.md)

Experimental VS Code extension: `flengyel.mrw`. Requires a Linux workspace host
(including WSL2 or Remote SSH), Python 3.11+ and VS Code 1.95+.

<a id="open-existing-work"></a>

## Start

1. Install the VSIX and run **MRW: Set Up MRW Workspace…**.
2. Choose **Open Document…** to read an existing paper or note. Use
   **Choose Notes Folder…** for linked notes; Obsidian is optional.
3. Follow references through **Contents** and use **Return to Document** to
   return to the argument. **Recent Documents…** reopens earlier work.

<a id="optional-source-study"></a>
<a id="justification"></a>

## Study and research

| Task | Tools |
| --- | --- |
| Understand an argument | [Proof outlines and source passages](docs/PROOF_STUDY_WORKFLOW.md), with native Lean goals and diagnostics for formal proofs. |
| Practise | [Questions, attempts, feedback, corrections and later review](docs/ACTIVE_STUDY_WORKFLOW.md), tied to the current mathematics. |
| Calculate | Jupyter and SagePod; [retained notebook results](docs/NOTEBOOK_RESULTS.md) preserve saved calculations for comparison. |
| Examine grounds | [Source-linked reasons and admitted premises](docs/JUSTIFICATION_WORKFLOW.md), using Artemov's Justification Logic. |

Ordinary reading requires no study record. General automatic Lean–English
translation remains a development goal.

## Related systems

| System | Emphasis |
| --- | --- |
| [CoCalc](https://doc.cocalc.com/), [Jupyter AI](https://jupyter-ai.readthedocs.io/en/latest/users/chat/guide.html), [Sagebrush](https://sagebrush.space/) | Collaborative notebooks; agent chat in JupyterLab; browser-based mathematical notebooks. |
| [Proofscape](https://docs.proofscape.org/en/stable/ref/library/dc.html) | Proof charts, annotations and linked source documents. |
| [MathHub](https://kwarc.info/systems/mathhub/), [ALeA](https://kwarc.info/people/dmueller/pubs/ws_alea_voll-ki.pdf) | Mathematical document archives and services; adaptive study of annotated course material. |
| [GNU TeXmacs](https://www.texmacs.org/tmweb/home/welcome.en.html) | Mathematical authoring with computational interfaces. |
| [Obsidian](https://obsidian.md/) | Linked local Markdown notes. |
| [Zotero](https://www.zotero.org/support/quick_start_guide) | References, attachments and citations. |

[Further comparisons](docs/RESEARCH_WORKSTATION_DESIGN.md#related-systems-and-reuse).

## Data and transfers

Ordinary files remain in their editors. MRW stores retained sources and study
records separately; copying notes does not transfer their saved targets.
[Storage scope and moves](docs/ARTIFACT_STORAGE.md).

## Documentation and license

[Guides](docs/README.md) · [Vision](VISION.md) · [Architecture](docs/ARCHITECTURE.md)
· [Current status](docs/DESIGN_RECONCILIATION.md) · [Contributing](CONTRIBUTING.md)

Copyright 2026 F. Lengyel. [Apache-2.0](LICENSE). Third-party material retains
its [source licenses and notices](tests/fixtures/stacks/README.md).
