# MRW documentation

Start with the [project README](../README.md) for current capabilities and the
[installation guide](INSTALLATION.md) for a Linux, WSL2 or Remote SSH workspace.
The installed **MRW: Open Tutorial** command describes the active extension build.

## User guides

| Task | Guide |
| --- | --- |
| Open documents, navigate Contents, follow links and return | [Documents and Contents](READING_OUTLINE_WORKFLOW.md) |
| Use Markdown notes, WikiLinks and an optional Obsidian vault | [Notes and Obsidian](OBSIDIAN_WORKFLOW.md) |
| Render TikZ in notes or reader annotations | [TikZ diagrams](TIKZ_WORKFLOW.md) |
| Retain a Stacks Project or Kerodon section | [Published sources](STACKS_WORKFLOW.md) |
| Distinguish a source item, its revision and a quoted passage | [Source identifiers](SOURCE_IDENTIFIERS.md) |
| Ask about a passage using Codex or MRW's separate API connector | [AI assistance](READER_AI_WORKFLOW.md) |
| Inspect and edit an explicit proof outline | [Proof outlines](PROOF_GRAPH_WORKFLOW.md) |
| Use SageMath through Jupyter and SagePod | [SagePod setup](GETTING_STARTED_WSL_SAGEPOD.md) |
| Choose companion extensions | [Recommended extensions](RECOMMENDED_EXTENSIONS.md) |
| Move or reconnect saved source records | [Saved-work storage](ARTIFACT_STORAGE.md) |
| Prepare to rename a folder containing an MRW workspace | [Folder renaming](FOLDER_RENAME_WORKFLOW.md) |

Optional [source study](ACTIVE_STUDY_WORKFLOW.md) and
[proof study](PROOF_STUDY_WORKFLOW.md) support deliberately selected passages,
questions and saved work. They are separate from ordinary document navigation.
The document Problems interface was removed in 0.23.3; its
[earlier workflow](DOCUMENT_LEARNING_WORKFLOW.md) is retained only to explain
that version and the saved records it produced.

## Design and development

- [Contributing](../CONTRIBUTING.md): focused changes, bug reports and larger proposals.
- [Development setup](../vscode/README.md#run-from-this-checkout): source launch,
  checks and packaging.
- [Research-workstation design](RESEARCH_WORKSTATION_DESIGN.md): current scope,
  terminology and proposed work.
- [Vision](../VISION.md), [vocabulary](../VOCABULARY.md),
  [domain model](../DOMAIN_MODEL.md) and [UX specification](../UX_SPEC.md):
  product aims, concepts and behavior.
- [Agent instructions](../AGENTS.md), [plan](../CODEX_PLAN.md) and
  [continuation](CODEX_CONTINUATION.md): current development constraints and
  preceding implementation accounts. Their opening sections identify the
  current direction; completed or withdrawn prompts do not authorize new work.

## Reports and earlier implementations

[Reading repairs for 0.23.5](READING_REPAIRS.md) records the latest delivery,
checks and limits. Other validation and repair reports describe the versions,
hosts and sources named in those reports; they do not establish that a later
build passed the same checks.

[Public readiness](../PUBLIC_READINESS.md) records a separate publication review
and unresolved disclosure and attribution decisions. Editorial changes to the
guides do not extend that review or clear those decisions.

The [changelog](../CHANGELOG.md) and
[earlier VS Code development account](VS_CODE_DEVELOPMENT_HISTORY.md) preserve
preceding workflows and the separate Qt/CLI prototype. Use current user guides
for present commands and installation.
