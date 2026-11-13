# MRW documentation

Start with the [project README](../README.md) for current capabilities and the
[installation guide](INSTALLATION.md) for a Linux, WSL2 or Remote SSH workspace.
The installed **MRW: Open Tutorial** command describes the active extension build.

## User guides

| Task | Guide |
| --- | --- |
| Choose a workspace, check prerequisites and repeat setup | [Workspace setup](WORKSPACE_SETUP.md) |
| Open documents, navigate Contents, follow links and return | [Documents and Contents](READING_OUTLINE_WORKFLOW.md) |
| Use Markdown notes, WikiLinks and an optional Obsidian vault | [Notes and Obsidian](OBSIDIAN_WORKFLOW.md) |
| Configure Obsidian note creation | [Obsidian New Note command](OBSIDIAN_WORKFLOW.md#new-note) |
| Find Zotero references, insert citations and retain attachments | [Zotero](ZOTERO_WORKFLOW.md) |
| Connect and inspect shared usage history | [Usage history](USAGE_HISTORY.md) |
| Render TikZ in notes or reader annotations | [TikZ diagrams](TIKZ_WORKFLOW.md) |
| Retain a Stacks Project or Kerodon section | [Published sources](STACKS_WORKFLOW.md) |
| Distinguish a source item, its revision and a quoted passage | [Source identifiers](SOURCE_IDENTIFIERS.md) |
| Ask about a passage using Codex or MRW's separate API connector | [AI assistance](READER_AI_WORKFLOW.md) |
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

[Release 0.23.23](RELEASE_0_23_23.md) records the latest package, publication,
checks and installation status. [Reading repairs for 0.23.5](READING_REPAIRS.md)
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
