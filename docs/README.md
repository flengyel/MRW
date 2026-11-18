# MRW documentation

Start with the [project README](../README.md) for current capabilities and the
[installation guide](INSTALLATION.md) for a Linux, WSL2 or Remote SSH workspace.
The installed **MRW: Open Tutorial** command describes the active extension build.

## User guides

| Task | Guide |
| --- | --- |
| Read a mathematical argument, keep a failed approach and resume its notes | [Mathematics in ordinary notes](MATHEMATICS_WITH_NOTES.md) |
| Revisit a proof step or example | [Questions, attempts and spaced review](ACTIVE_STUDY_WORKFLOW.md) |
| Work through a proof with its cited passages and questions | [Proof work](PROOF_STUDY_WORKFLOW.md) |
| Choose a workspace, check prerequisites and repeat setup | [Workspace setup](WORKSPACE_SETUP.md) |
| Open documents, navigate Contents, follow links and return | [Documents and Contents](READING_OUTLINE_WORKFLOW.md) |
| Reopen recent notes, PDFs and text files | [Recent Documents](RECENT_DOCUMENTS.md) |
| Use Markdown notes, WikiLinks and an optional Obsidian vault | [Notes and Obsidian](OBSIDIAN_WORKFLOW.md) |
| Understand note handoff and companion boundaries | [Notes applications](NOTE_COMPANIONS.md) |
| Configure Obsidian note creation | [Obsidian New Note command](OBSIDIAN_WORKFLOW.md#new-note) |
| Find Zotero references, insert citations and retain attachments | [Zotero](ZOTERO_WORKFLOW.md) |
| Connect and inspect shared usage history | [Usage history](USAGE_HISTORY.md) |
| Render TikZ in notes or reader annotations | [TikZ diagrams](TIKZ_WORKFLOW.md) |
| Retain a Stacks Project or Kerodon section | [Published sources](STACKS_WORKFLOW.md) |
| Distinguish a source item, its revision and a quoted passage | [Source identifiers](SOURCE_IDENTIFIERS.md) |
| Ask about a passage using Codex or MRW's separate API connector | [AI assistance](READER_AI_WORKFLOW.md) |
| Understand a claim's grounds, assumptions and checked inference steps | [Justification Logic: purpose, example and current tools](JUSTIFICATION_WORKFLOW.md) |
| Select passages, review a companion proposal and admit grounds | [Grounds from existing notes](SOURCE_GROUNDS_WORKFLOW.md) |
| Inspect and edit a proof outline | [Proof outlines](PROOF_GRAPH_WORKFLOW.md) |
| Use SageMath through Jupyter and SagePod | [SagePod setup](GETTING_STARTED_WSL_SAGEPOD.md) |
| Retain, compare and export notebook results | [Notebook results](NOTEBOOK_RESULTS.md) |
| Study Lean with editable examples, native goals and Return | [Lean study](LEAN_STUDY_WORKFLOW.md) |
| Choose extensions, OCR and computation tools | [Companion software](RECOMMENDED_EXTENSIONS.md) |
| Queue SageMath batch jobs using SagePod | [SageQueue and component roles](RECOMMENDED_EXTENSIONS.md#sagemath-sagepod-jupyter-and-sagequeue) |
| Move or reconnect saved source records | [Saved-work storage](ARTIFACT_STORAGE.md) |
| Prepare to rename a folder containing an MRW workspace | [Folder renaming](FOLDER_RENAME_WORKFLOW.md) |

## Design and development

- [Architecture in brief](ARCHITECTURE.md): facade, adapters, workflow coordination,
  the canonical research model and justification engine, with SVG/PNG diagrams.
- [CoCalc adapter proposal](COCALC_ADAPTER.md): remote project/notebook handoff,
  exported results, ownership and acceptance criteria; not yet implemented.
- [Justification Logic technical specification](JUSTIFICATION_LOGIC_EXPERIMENT.md):
  calculus, admissions and checked certificates.
- [Design reconciliation register](DESIGN_RECONCILIATION.md): adopted decisions,
  implementation status and remaining work.
- [Codex maintenance from reports](CODEX_MAINTENANCE.md): compare periodic findings
  with current design, make bounded corrections and retain unresolved work.
- [Selective contract formalization](CONTRACT_FORMALIZATION.md): the first
  relocation pilot, later models and the implementation-correspondence requirement.
- [Existing-note citation rendering](ZOTERO_WORKFLOW.md#citation-rendering-in-existing-notes):
  local bibliography and read-only Zotero / Better BibTeX lookup.

- [Subsystem ownership and integration boundaries](INTEGRATION_BOUNDARIES.md):
  creation, editing, execution, synchronization and reference responsibilities
  across notes, notebooks, runtimes, queues and external services.

- [Operational feature use](OPERATIONAL_USAGE.md): existing counts, coverage gaps
  and required reports of used and persistently unused features.
- [Optional diagnostics plugin](DIAGNOSTICS_PLUGIN.md): bounded local reports
  and opt-in weekly scheduling, with further checks specified separately.

- [Optional notes adapters](NOTE_COMPANIONS.md#proposed-optional-adapters): current
  Obsidian handoff, possible Org capture and The Archive routes, and format limits.
- [W3C PROV lab-notebook design](PROVENANCE_DESIGN.md): shared provenance model,
  plugin responsibilities and the notebook provenance export.
- [Study archive/delete requirements](ACTIVE_STUDY_DESIGN.md#archive-and-delete-studies):
  lifecycle contract, shared-data boundaries and completion checks.
- [Zotero integration design](RESEARCH_WORKSTATION_DESIGN.md#zotero-integration):
  reference, attachment and citation responsibilities.
- [Related research](RESEARCH_WORKSTATION_DESIGN.md#related-systems-and-reuse) compares
  Eigenius, Axiom Math, Google AI co-scientist and Kosmos.
- [Optional plugins and integrations](RESEARCH_WORKSTATION_DESIGN.md#optional-plugins-and-integrations) lists
  tools for notes, references, calculation and proof checking.

- [Contributing](../CONTRIBUTING.md): focused changes, bug reports and larger proposals.
- [Lean lesson packs](LEAN_LESSON_PACKS.md): explicit local content registration and API 1.
- [Development setup](../vscode/README.md#run-from-this-checkout): source launch,
  checks and packaging.
- [Research-workstation design](RESEARCH_WORKSTATION_DESIGN.md): current scope,
  terminology and proposed work.
- [Vision](../VISION.md), [domain model](../DOMAIN_MODEL.md) and
  [UX specification](../UX_SPEC.md):
  product aims, concepts and behavior.
- [Agent instructions](../AGENTS.md), [plan](../CODEX_PLAN.md) and
  [continuation](CODEX_CONTINUATION.md): development constraints and active work.

## Releases

[GitHub releases](https://github.com/flengyel/MRW/releases) provide VSIX packages,
requirements and checksums. See [installation](INSTALLATION.md) and
[release procedure](RELEASING.md).
