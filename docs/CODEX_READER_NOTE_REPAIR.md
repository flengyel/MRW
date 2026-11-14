# Repair ordinary reader-note entry

The observed source-reader composer puts Purpose, Supplied origin and Author
above the writing area, followed by repeated proof-status and syntax guidance.
These are annotation-record fields, not justification admissions. Their
presentation conflicts with AGENTS.md's instruction to preserve deliberation
without classifications, forms or completion gates, and UX_SPEC.md's ordinary
editing rules. Treat the reported friction as an observed usability defect.

## Required interaction

Use the exact entry label **Add a note**. It opens a passage-linked writing
area with focus in the text. Make **Save** and **Cancel** the primary controls.
Allow free-form prose, questions, calculations and Markdown with LaTeX notation
and TikZ support, without a preliminary classification.
Do not introduce a separate title, purpose, study, assessment or claim form.

Move attribution controls into optional collapsed details and math/TikZ
guidance into optional Help. Remove the Purpose chooser from ordinary entry.
The data schema does not dictate the visible interaction. Keep any schema
adjustment bounded and compatible with existing records; a new plain note must
not require its writer to claim it is an explanation, repair or proof.

Preserve existing kind, origin, author, timestamp semantics and source/passages
when editing. Retain known quotation and model attribution; new unspecified
origin remains unknown. Typing or pasting alone does not establish authorship.
An optional attribution edit must not silently replace known provenance.
Keep checker and justification status available for explicit inspection,
without inserting a proof-status disclaimer into every writing interaction.
Saving a note creates no premise admission and invokes no Lean checker.

Preserve drafts through view refresh, passage navigation, association changes,
failed Save and uncertain publication. Cancel must not silently discard a
nonempty unsaved draft; use the host's existing discard semantics without
adding a routine confirmation before every operation. Keep source notes and
linked Zettels independently editable. Do not create files directly in a vault
or automate Obsidian's live authoring prompts.

## LaTeX and TikZ

Preserve editable LaTeX source and the existing mathematical rendering.
Support fenced `tikz` blocks and the existing explicit **Render diagram** action
for a saved note. Keep rendering accessible without opening attribution fields.
Saving or reopening a note must not automatically execute a TeX process.
Retain the current isolated renderer, source/digest binding and failure behavior:
a failed render preserves the source and any earlier valid diagram.
See [the existing rendering workflow](TIKZ_WORKFLOW.md).
Syntax guidance belongs in optional Help; the entry label remains **Add a note**.

## Implementation and validation

Inspect vscode/src/outlineView.js noteForm, form/draft handling, its host
messages in vscode/src/outlines.js, annotation validation/persistence and
existing regressions. Implement locally in VS Code connected to WSL2, following
AGENTS.md and the normal branch/review/release procedure.

Verify blank/new and existing notes, inline/displayed LaTeX, a saved TikZ diagram
and failed rerender, preserved editable source and metadata,
keyboard focus, Save/Cancel, failure/retry and drafts across refresh. Use
isolated retained sources and research stores. Observe the affected native
writing interaction at normal and narrow window widths. Component tests alone
do not establish that the form is usable. Preserve the working window; do not
install or force-reload it to test this repair.

Update the canonical register and affected user help with actual evidence.
Complete the code, focused checks and authorized delivery; a label change or
this documentation handoff alone does not complete the repair. Carry all other
accepted work forward.

## Status

This handoff records the observed defect and concrete correction. The existing
composer remains unchanged by this documentation commit. Its implementation
status belongs in D07 of the design register.
