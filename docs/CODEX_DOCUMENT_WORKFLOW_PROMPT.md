# Codex task: clear document and source terminology

Updated 2026-11-06. Reviewed baseline: MRW 0.19.1 at
`82f310bb8d0984af0535e296b2361d6cc38e5ce6`.

Implement the first GUI increment in
[RESEARCH_WORKSTATION_DESIGN](RESEARCH_WORKSTATION_DESIGN.md). MRW is a research
workstation: it should keep mathematical questions, documents, calculations,
argument reconstruction and unfinished work connected. Study and comprehension
testing are part of that work. The immediate task is consistent nomenclature
in the present GUI, followed by the ordered integrations in that design.

## Work from the current checkout

Read AGENTS.md, the current CODEX_PLAN.md priority, VOCABULARY.md and the new
design before editing. Fetch/inspect current main and preserve later commits,
local work, genuine notes, saved studies, history and installed packages.
The baseline identifies this review, not a commit to reset to. Keep the 0.19.1
repairs. Do not repeat completed review or public-preparation tasks.
GPTWork maintains design/review; local Codex implements in VS Code with WSL2.

## Visible command names

Preserve the IDs in the first column. The new names are the specification for
this implementation, not a claim about the already installed 0.19.1 package.

| Command ID | Current title | New title |
| --- | --- | --- |
| `mrw.newReadingOverview` | New Reading Overview… | New Document… |
| `mrw.openReadingOutline` | Open Reading Outline | Show Contents |
| `mrw.chooseReadingOverview` | Choose Reading Overview… | Choose Document… |
| `mrw.refreshReadingOutline` | Refresh Reading Outline | Refresh Contents |
| `mrw.returnToReadingOutline` | Return to Reading Outline | Return to Document |
| `mrw.selectReadingOutlineItem` | Open Reading Outline Location | Go to Document Location |
| `mrw.createOutline` | Create Outline from Saved Source | Retain Document as Source |
| `mrw.openOutline` | Open Saved Source Outline… | Open Saved Source… |
| `mrw.refreshSourceOutline` | Refresh Saved Source Outline | Refresh Saved Source |
| `mrw.addOutlineRegion` | Add Selected Source Region | Add Selected Passage |
| `mrw.replaceOutlineRegion` | Replace Selected Outline Region Range | Replace Selected Passage Range |
| `mrw.attachOutlineEvidence` | Attach Recorded Outline Evidence… | Attach Recorded Evidence… |
| `mrw.insertOutlineReference` | Insert Outline Reference… | Insert Source or Passage Link… |
| `mrw.followOutlineReference` | Follow Outline Reference at Cursor | Follow Source or Passage Link at Cursor |
| `mrw.copyOutlineLink` | Copy Outline or Passage Link… | Copy Source or Passage Link… |
| `mrw.importObsidianNote` | Import Obsidian Note… | Import Markdown Text… |

Keep **Open Proof Outline…** and **Studies** unchanged: they describe their
current content. Keep explicit **Open linked note in Obsidian** and companion
association actions; optional application integration is still useful.

**New Document…** still creates Markdown: use a native Save dialog titled
**New Markdown document**, the existing Markdown filter/default extension,
and helper text that says what will be created. New starter headings and the
suggested filename may use Document instead of Reading overview; do not rename
an existing file or rewrite its heading.

**Choose Document…** still selects a Markdown file for Contents: title its
picker **Choose a Markdown document for Contents** and preserve the current
scope/filter. **Show Contents** focuses the navigator; do not rename it to
**Open Document**, because it does not normally display the selected file.
General **Open Document…** is a later action that must actually open the file
through the appropriate host editor/reader, including a PDF when supported.

**Retain Document as Source** uses the active saved text document and preserves
the current selected-passage behavior. It is not a universal PDF importer.
**Refresh Saved Source** reloads saved MRW reader state; its tooltip must not
suggest that it reacquires a changed original document.

**Import Markdown Text…** is not opening a file in place. Name its destination
choices **Retain a source copy**, **Add text to a passage annotation**, and
**Insert text into a Markdown document**. Preserve size limits, attribution,
unsaved-editor checks and existing save/undo semantics. The source file remains
unchanged; linked files and embeds are not imported or resolved by this action.

## Views, reader text and documentation

| Current visible text | Replacement |
| --- | --- |
| Reading Outline (view name) | Contents |
| Whole outline | Whole source |
| Mathematical source outline | Saved source |
| Outline: TITLE | Source: TITLE |
| Copy link to this outline | Copy link to this source |
| Refresh saved source outline | Refresh saved source |
| Return to reading outline | Return to document |
| Outline links and Obsidian note | Source links and Obsidian notes |
| Whole retained source outline | Whole saved source |

Audit package contributions, welcome text, tree/context menus, picker prompts,
reader/webview buttons, tooltips, loading/error messages and the bundled tutorial.
Use Document for opened material; its format determines the available reading
and editing operations. Use Contents for its navigation view, Saved source for
retained source material, and Passage for a selected range. Apply
that vocabulary to current workflow guides as part of the same code delivery.
For example: “Open a Markdown document. Contents lists its headings and MRW
source links and updates as the document is edited.” Explain the current
Markdown/workspace limit locally without suggesting that all documents are
Markdown or that notes must be imported to remain useful.

Keep technical identities unchanged: `mrw.readingOutline`, `mrw.sourceOutline`,
`mrw.readingOutline.v1`, settings keys, event names, serialized fields and
`mrw-outline:v1` references. A prose rename is not a migration. Do not apply a
global replacement to proof terminology, code/CSS identifiers, imported text,
existing note contents or past validation/delivery reports. Update live guide
instructions; retain dated observations as records of the version observed.

No added view is needed for this patch. Follow native VS Code command, menu,
view and accessibility patterns. Preserve saved placement and do not force a
layout change. Research-question entries will justify the later Research view;
renaming a studies-only view now would misdescribe its contents.

## Verification and delivery

Use existing command/navigation/import/reader checks appropriate to the edited
paths. Verify the create/select, heading/link follow, return, unsaved editing,
cancel and reopen paths and that command IDs and existing references still
resolve. Preserve exact return locations and failure behavior. Do not add tests
that merely repeat every new string or introduce a new acceptance framework.
Follow existing packaging checks for the resulting code release; a docs-only
edit does not call for a VSIX or runtime regression run.

Inspect affected UI in the available host. If the host cannot launch, complete
the safe implementation and checks, record the precise observation gap and
provide the package. Do not invent visual acceptance, reload a working window
with drafts, or make another human study session a delivery prerequisite.

Update current README/tutorial/workflow labels, implementation status and the
continuation together. Commit the bounded patch to main without discarding
concurrent work; record the commit, package version if built, checks and any
remaining host limitation. Do not change repository visibility or move the
private store or vault. This task does not require a TypeScript rewrite, schema
migration, new provider, container, or cognitive simulator.

## Following increments

After the terminology patch, follow the design's order: existing-document
opening and optional note/PDF integrations; research questions that resume
without a model request; then a complete compressed-argument reconstruction
session using existing explanation, study and computation/checking mechanisms.
The integrated example should open an existing Zettel or ordinary document,
investigate one difficult step, preserve a correction or gap and next action,
and resume the work after closing. Start with actual work rather than another
new feature catalogue. Keep opening/reading distinct from retention and keep
research questions distinct from recall scheduling items.
