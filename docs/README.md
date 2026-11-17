# MRW documentation

Start with the [project README](../README.md) for current capabilities and the
[installation guide](INSTALLATION.md) for a Linux, WSL2 or Remote SSH workspace.
The installed **MRW: Open Tutorial** command describes the active extension build.
Understanding mathematics, including AI-generated arguments and AI-formalized
Lean developments, is a central purpose. Use the study and proof-work guides for
attempts, feedback, correction and later reconstruction alongside reading,
calculation and source navigation.

## User guides

| Task | Guide |
| --- | --- |
| Read a mathematical argument, keep a failed approach and resume its notes | [Mathematics in ordinary notes](MATHEMATICS_WITH_NOTES.md) |
| Practise a proof step or example, retain feedback and resume an attempt | [Source study and deliberate practice](ACTIVE_STUDY_WORKFLOW.md) |
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
| Inspect and edit a proof outline | [Proof outlines](PROOF_GRAPH_WORKFLOW.md) |
| Use SageMath through Jupyter and SagePod | [SagePod setup](GETTING_STARTED_WSL_SAGEPOD.md) |
| Retain, compare and export notebook results | [Notebook results](NOTEBOOK_RESULTS.md) |
| Study Lean with editable examples, native goals and Return | [Lean study](LEAN_STUDY_WORKFLOW.md) |
| Choose extensions, OCR and computation tools | [Companion software](RECOMMENDED_EXTENSIONS.md) |
| Queue SageMath batch jobs using SagePod | [SageQueue and component roles](RECOMMENDED_EXTENSIONS.md#sagemath-sagepod-jupyter-and-sagequeue) |
| Move or reconnect saved source records | [Saved-work storage](ARTIFACT_STORAGE.md) |
| Prepare to rename a folder containing an MRW workspace | [Folder renaming](FOLDER_RENAME_WORKFLOW.md) |

Starting a recorded [source study](ACTIVE_STUDY_WORKFLOW.md) or
[proof study](PROOF_STUDY_WORKFLOW.md) is explicit; ordinary document navigation
remains available independently. Practice stays tied to the selected mathematics.
The source-study guide describes the current attempt, assistance and exposure
rules.
The document Problems interface was removed in 0.23.3; its
[earlier workflow](DOCUMENT_LEARNING_WORKFLOW.md) is retained only to explain
that version and the saved records it produced.

## Design and development

- [Architecture in brief](ARCHITECTURE.md): facade, adapters, workflow coordination,
  the canonical research model and justification engine, with SVG/PNG diagrams.
- [CoCalc adapter proposal](COCALC_ADAPTER.md): remote project/notebook handoff,
  exported results, ownership and acceptance criteria; not yet implemented.
- [Justification Logic technical specification](JUSTIFICATION_LOGIC_EXPERIMENT.md):
  calculus, records, checked certificates and the two bounded executable cases.
- [Design reconciliation register](DESIGN_RECONCILIATION.md): complete evaluation,
  adopted decisions, unresolved repairs and their completion evidence.
- [Codex maintenance from reports](CODEX_MAINTENANCE.md): compare periodic findings
  with current design, make bounded corrections and retain unresolved work.
- [Selective contract formalization](CONTRACT_FORMALIZATION.md): the first
  relocation pilot, later models and the implementation-correspondence requirement.
- [Existing-note citation rendering](ZOTERO_WORKFLOW.md#citation-rendering-in-existing-notes):
  local bibliography and read-only Zotero / Better BibTeX lookup, with
  [native verification](CITATION_ZOTERO_REPAIR.md).

- [Subsystem ownership and integration boundaries](INTEGRATION_BOUNDARIES.md):
  creation, editing, execution, synchronization and reference responsibilities
  across notes, notebooks, runtimes, queues and external services.

- [Operational feature use](OPERATIONAL_USAGE.md): existing counts, coverage gaps
  and required reports of used and persistently unused features.
- [Optional diagnostics plugin](DIAGNOSTICS_PLUGIN.md): bounded local reports
  and opt-in weekly scheduling, with further checks specified separately.

- [Interface and companion audit — 13 November](INTERFACE_AUDIT_20261113.md):
  version-specific findings; use the reconciliation register for current work.

- [Optional notes adapters](NOTE_COMPANIONS.md#proposed-optional-adapters): current
  Obsidian handoff, possible Org capture and The Archive routes, and format limits.
- [W3C PROV lab-notebook design](PROVENANCE_DESIGN.md): shared provenance model,
  plugin responsibilities and a bounded implementation trial.
- [Study archive/delete requirements](ACTIVE_STUDY_DESIGN.md#archive-and-delete-studies):
  lifecycle contract, shared-data boundaries and completion checks.
- [Zotero integration](RESEARCH_WORKSTATION_DESIGN.md#zotero-integration): requested
  reference, attachment and citation design; the local API workflow is included in 0.23.13.
- [Related systems and reuse](RESEARCH_WORKSTATION_DESIGN.md#related-systems-and-reuse):
  Zotero, CoCalc, Wolfram, Proofscape, TeXmacs, MathHub/ALeA and VisTrails.

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
  [continuation](CODEX_CONTINUATION.md): current development constraints and
  reports of earlier implementations. Their opening sections identify the
  current direction; completed or withdrawn prompts do not authorize new work.

## Releases and verification

The [changelog](../CHANGELOG.md) lists releases. Each release report records its
own source, package, checks and installation status; those observations do not
qualify later builds. The [design register](DESIGN_RECONCILIATION.md) tracks
current decisions and remaining work.

- [Release 0.23.45](RELEASE_0_23_45.md): linked calculation Return and resumption.
- [Release 0.23.44](RELEASE_0_23_44.md): source-driven context preparation and review.
- [Study lifecycle](STUDY_LIFECYCLE.md): Archive, Restore, Trash and recovery.
- [Saved Source Trash](SAVED_SOURCE_TRASH.md): source deletion and restoration.
- [Contract pilot](CONTRACT_PILOT.md): proved abstract safety and sampled runtime traces.
- [Native test isolation](NATIVE_TEST_ISOLATION.md): protect ordinary working data.
- [Optional diagnostics](../diagnostics/README.md): local reports and maintenance handoff.

[Grounds from existing notes](SOURCE_GROUNDS_WORKFLOW.md) explains source
selection, the Codex handoff, proposal corrections, explicit admission and
resumption in the Justification reader.
