# MRW documentation

Start with the [project README](../README.md) for current capabilities and the
[installation guide](INSTALLATION.md) for a Linux, WSL2 or Remote SSH workspace.
The installed **MRW: Open Tutorial** command describes the active extension build.

## User guides

| Task | Guide |
| --- | --- |
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
| Understand a claim's grounds, assumptions and checked inference steps | [Justification: purpose, example and current tools](JUSTIFICATION_WORKFLOW.md) |
| Inspect and edit a proof outline | [Proof outlines](PROOF_GRAPH_WORKFLOW.md) |
| Use SageMath through Jupyter and SagePod | [SagePod setup](GETTING_STARTED_WSL_SAGEPOD.md) |
| Retain, compare and export notebook results | [Notebook results](NOTEBOOK_RESULTS.md) |
| Study Lean with editable examples, native goals and Return | [Lean study](LEAN_STUDY_WORKFLOW.md) |
| Choose extensions, OCR and computation tools | [Companion software](RECOMMENDED_EXTENSIONS.md) |
| Queue SageMath batch jobs using SagePod | [SageQueue and component roles](RECOMMENDED_EXTENSIONS.md#sagemath-sagepod-jupyter-and-sagequeue) |
| Move or reconnect saved source records | [Saved-work storage](ARTIFACT_STORAGE.md) |
| Prepare to rename a folder containing an MRW workspace | [Folder renaming](FOLDER_RENAME_WORKFLOW.md) |

Optional [source study](ACTIVE_STUDY_WORKFLOW.md) and
[proof study](PROOF_STUDY_WORKFLOW.md) support selected passages,
questions and saved work. They are separate from ordinary document navigation.
The document Problems interface was removed in 0.23.3; its
[earlier workflow](DOCUMENT_LEARNING_WORKFLOW.md) is retained only to explain
that version and the saved records it produced.

## Design and development

- [Architecture in brief](ARCHITECTURE.md): facade, adapters, workflow coordination,
  the canonical research model and justification engine, with SVG/PNG diagrams.
- [CoCalc adapter proposal](COCALC_ADAPTER.md): remote project/notebook handoff,
  exported results, ownership and acceptance criteria; not yet implemented.
- [Justification technical specification](JUSTIFICATION_LOGIC_EXPERIMENT.md):
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

- [Interface and companion audit — 13 November](INTERFACE_AUDIT_20261113.md): current
  tool access, missing integrations, observed limits and the next interface repairs.

- [Optional notes adapters](NOTE_COMPANIONS.md#proposed-optional-adapters): current
  Obsidian handoff, possible Org capture and The Archive routes, and format limits.
- [W3C PROV lab-notebook design](PROVENANCE_DESIGN.md): shared provenance model,
  plugin responsibilities and a bounded implementation trial.
- [Study archive/delete requirements](ACTIVE_STUDY_DESIGN.md#archive-and-delete-studies):
  proposed lifecycle, shared-data boundaries and completion checks.
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
- [Vision](../VISION.md), [vocabulary](../VOCABULARY.md),
  [domain model](../DOMAIN_MODEL.md) and [UX specification](../UX_SPEC.md):
  product aims, concepts and behavior.
- [Agent instructions](../AGENTS.md), [plan](../CODEX_PLAN.md) and
  [continuation](CODEX_CONTINUATION.md): current development constraints and
  reports of earlier implementations. Their opening sections identify the
  current direction; completed or withdrawn prompts do not authorize new work.

## Reports and earlier implementations

[Release 0.23.38](RELEASE_0_23_38.md) records the Lean example instructions,
compiler/rendering checks and verified publication.

[Release 0.23.37](RELEASE_0_23_37.md) records citation source identification,
live-owner verification, package checks and the native observation limit.

[Release 0.23.36](RELEASE_0_23_36.md) records Recent Documents, the citation
observation, exact package checks, publication and native acceptance limits.

[Release 0.23.35](RELEASE_0_23_35.md) records the document-reopen repair,
exact source, native checks, package and publication.

[Working source cleanup](SOURCE_CLEANUP_20261114.md) records removal of the
confirmed test/demo clutter, its recoverable backup and preserved source links.

[Release 0.23.34](RELEASE_0_23_34.md) records the live Zotero citation repair,
exact sources, native observations, package checks and publication.

[Release 0.23.31](RELEASE_0_23_31.md) records that package's publication,
checks and installation status. The [0.23.32 implementation account](MAINTENANCE_20261114.md)
records the subsequent repairs and limits; use the [README](../README.md) for
current package links. [Reading repairs for 0.23.5](READING_REPAIRS.md)
records that earlier increment. Other validation and repair reports describe the versions,
hosts and sources named in those reports; they do not establish that a later
build passed the same checks.

[Public readiness](../PUBLIC_READINESS.md) records a separate publication review
and unresolved disclosure and attribution decisions. Editorial changes to the
guides do not extend that review or clear those decisions.

The [changelog](../CHANGELOG.md) and
[earlier VS Code development account](VS_CODE_DEVELOPMENT_HISTORY.md) preserve
preceding workflows and the separate Qt/CLI prototype. Use current user guides
for present commands and installation.

- [Source plugins: installation and API 1](SOURCE_PLUGINS.md)
- [nLab reader and revision limits](NLAB_WORKFLOW.md)

- [Study lifecycle](STUDY_LIFECYCLE.md): Archive/Restore, Trash/Undo,
  permanent deletion and interrupted-operation recovery.

- [Current implementation evidence](MAINTENANCE_20261114.md): citations, note associations, grouped tools, diagnostics and contract pilot.
- [Optional diagnostics companion](../diagnostics/README.md): install separately; core remains usable without it.
- [Contract pilot mapping](CONTRACT_PILOT.md): proved abstract safety and sampled runtime traces, with explicit assumptions.
