# MRW interface and companion audit — 13 November 2026

Audited MRW **0.23.28**, commit
`bb42756188e2d5966f9b18cedeabe90e2a4e22ea`, after fetching origin/main.
This is an audit, not an implementation or release report for the repairs below.

The interface does not give a complete account of MRW's available tools. Some
implemented operations are difficult to find; other integrations discussed in
the design have not been implemented. Source plugins, Lean lesson packs,
companion applications and Codex plugins have different installation and
invocation mechanisms. Manage Source Plugins covers only the first category.

## Findings, in repair order

### 1. Computation and saved results are absent from the main controls

The 19 Commands buttons include neither a SagePod/Jupyter entry nor any of
MRW's three notebook-result commands. **Retain Notebook Result** appears in the
Jupyter notebook toolbar and Command Palette. **Open Retained Notebook Result**
and **Export Notebook Provenance** appear only in the Command Palette; comparison
is another choice after opening a retained result. A reader cannot discover this
delivered workflow from the sidebar. The bundled tutorial describes it near its end.

The repair should expose notebook opening through the native editor, the existing
retained-result actions, and the SagePod connection instructions together. Reuse
Jupyter's kernel selection and SagePod's runtime. Do not implement a second
notebook editor, kernel manager or queue. A setup link must not imply that MRW
starts SagePod or submits SageQueue jobs.

Evidence: [Commands](../vscode/package.json#L1048),
[notebook toolbar](../vscode/package.json#L904),
[result actions](../vscode/src/notebookResults.js#L48),
[SagePod boundaries](SAGEPOD_NOTEBOOK_WORKFLOW.md).

### 2. Plugin and companion discovery is incomplete

**Add/Manage Source Plugins** operate on source acquisition only. They cannot
manage Lean content packs, Obsidian, Zotero, SagePod, VS Code extensions or Codex
plugins. nLab is included but appears through **Import Source**, whereas Stacks
Project and Kerodon have named buttons. Lean's Add/Manage Lesson Pack actions
are available only through the Command Palette. There is no companion-status
or setup entry in the main controls.

Provide a concise route to each supported tool and its setup. Distinguish
installed extensions from working connections and unimplemented integrations.
Keep Source Plugins and Lean Lesson Packs separately named. Do not create a
general plugin registry merely to put existing commands and guide links in one
place. No service probe, container startup, model call or installation should
occur just because the interface is opened.

Evidence: [source registry UI](../vscode/src/sourcePlugins.js),
[built-in sources](../src/mrw/source_plugins.py#L34),
[lesson registrations](../vscode/src/leanStudy.js#L88),
[companion guide](RECOMMENDED_EXTENSIONS.md).

### 3. Lean controls are attached to the code, not the lesson being read

**Lean Study Actions** has the editor condition `resourceExtname == .lean`.
It therefore does not appear on `01-functions-and-proofs.md`, the document
identified in the user's IDE context. Conversely, it appears on unrelated Lean
files and uses the saved lesson state, rather than deriving a lesson from the
clicked file. With no saved lesson, it reports that a lesson must first be opened.
The prose supplies links and names the palette command, but that does not repair
the mismatch between the active document and the controls.

Expose lesson actions for a recognized lesson document or its associated code;
bind the action to that explicit document. Preserve ordinary native Lean commands
for other Lean files. Keep the lesson's notes, examples, solutions and source
Return location accessible while reading the Markdown preview. Verify switching
between two lessons and an unrelated Lean file, rather than merely testing
that a command is registered.

Evidence: [menu condition](../vscode/package.json#L893),
[saved lesson and action handling](../vscode/src/leanStudy.js#L31),
[lesson instructions](../vscode/media/lean-study/lessons/01-functions-and-proofs.md#working-with-the-examples).

### 4. Removing the Studies pane did not remove study creation from the interface

0.23.28 removed the tree, not the study engine. **Study Current Material** remains
in the editor context menu, editor title overflow and source-reader toolbar.
**Open Study Example**, proof-study creation and the question/attempt view also
remain available. Preservation of saved work and presentation of new-study
actions are separate decisions. The prior removal report is accurate about the
tree, but the remaining entry points still need review against the user's
rejection of study-registration bureaucracy.

Remove study-creation prompts from ordinary reading controls in the next repair;
retain explicit access to earlier saved work and history/export. Preserve
Proof Outline and Study Lean 4, which perform different tasks. Do not replace
Studies with a Research Question or Fleeting Note registration form. Questions,
calculations and notes for later review can remain ordinary linked documents.

Evidence: [editor menus](../vscode/package.json#L789),
[source-reader toolbar](../vscode/src/outlineView.js#L328),
[proof-work view](../vscode/src/proofStudyView.js#L20),
[scope of the previous removal](RELEASE_0_23_28.md).

### 5. Commands compete for attention without a coherent grouping

The manifest contributes **111 commands**, of which **109** are exposed in the
Command Palette. Commands has **19 ungrouped welcome buttons**. Contents has
**23 title actions**, while the Commands title menu has only Set Up Workspace.
Maintenance actions such as Move Workspace and Recover Workspace Move occupy
the main list, but reopening a retained calculation does not. Context-dependent
response-review commands remain in the palette without indicating whether a
response has been selected; invoking them can lead to prerequisite errors.

Retain common actions close to the document and group other actions by their
actual purpose. A proposed arrangement is below; it does not require another
view or data model. Keep command IDs and recovery paths. Use context to select
applicable actions, and avoid duplicating a long list in several places.

Microsoft recommends limiting welcome buttons, using buttons for primary
actions, grouping related menu actions and showing them in the appropriate
context. It advises against using tree rows merely as command buttons. These
are guidelines, not a numerical limit of 19 or 109.
[Views](https://code.visualstudio.com/api/ux-guidelines/views) ·
[Context menus](https://code.visualstudio.com/api/ux-guidelines/context-menus) ·
[Command Palette](https://code.visualstudio.com/api/ux-guidelines/command-palette).

### 6. The AI action does not identify the companion route

**Ask AI about this passage** uses MRW's separate OpenAI API connector, not the
Codex pane. Codex currently receives retained text and references by copying and
pasting, or through the proof-work handoff. Mathematical Writing and HostileReferee
are available in the present Codex session, but there are no MRW commands to
invoke them. Their presence in Codex is not an MRW plugin installation.

Name the destination where the reader chooses the action. Make copying exact
passage text and references for a companion easy without requiring a study
record. Keep reader-note actions before AI actions. Preserve explicit request
preview and Send for the API route; selecting a plugin must not transmit a note.

Evidence: [reader actions](../vscode/src/outlineView.js#L499),
[separate AI routes](READER_AI_WORKFLOW.md),
[proof-work clipboard actions](../vscode/src/proofStudyView.js#L20).

## What exists, and how it is reached

This table describes MRW 0.23.28. A documented companion is not necessarily an
installed program, a tested current connection or an MRW plugin.

| Tool or integration | Implemented access | Remaining gap |
| --- | --- | --- |
| Stacks Project, Kerodon | Named import buttons; shared reader, exact retained sources and annotations. | Keep these direct routes. |
| nLab | Built-in source adapter under Import Source; also listed by Manage Source Plugins. | Its availability is not named in the main Import Source label or tooltip. |
| Additional source adapters | Add/Manage Source Plugins; local data profiles or trusted installed Python adapters. | This manager does not install or manage other kinds of companions. |
| Lean 4 | Study/Resume buttons, native InfoView and ordinary working files. | Actions missing on lesson Markdown; add/manage content packs are palette-only. |
| Obsidian | New Note invokes the configured creation command; document menus offer opening and return links. | Built-in handoff, not a general notes-companion API. |
| Zotero | Find/Resume buttons; Connect is also in the palette. Find prompts for connection if none is configured. | Current library/connection is not visible before invocation. Requires Zotero's local API setting. |
| SagePod with Jupyter | Existing VS Code notebook workflow and setup guides. | No MRW launch/setup control; MRW does not start the container. |
| SageQueue | Documented separate batch queue using SagePod. | No MRW submission, monitoring or job-resumption integration. |
| Retained notebook results and W3C PROV | Three commands; capture also appears on the notebook toolbar. Reopen offers compare/export. | Missing from main controls; bounded saved-result provenance, not a general lab-notebook engine. |
| LaTeX Workshop and PDFs | Host extension provides editing, compilation and PDF viewing. MRW opens files in the chosen reader. | No MRW TeX setup control. PDF Return remains file-level; no MRW OCR. |
| Codex and writing/review plugins | Separate companion, with manual passage/handoff transfer. | No MRW invocation API for Mathematical Writing or HostileReferee. |
| Justification logic | Executable Python/Lean subsystem and CLI experiment. | No VS Code command for premise admission or justification checking; it is not a delivered GUI plugin. |
| Emacs/Org, The Archive | Proposed notes-companion adapters. | Not implemented; Org reading/navigation is also unsupported. |
| Clowder, PreTeXt | Proposed source adapters. | Not implemented. |
| CoCalc, Wolfram, repository imports, data-analysis plugin | Proposed integrations in the design. | Not implemented in MRW. Availability of a separate chat tool does not establish MRW support. |

See [source plugins](SOURCE_PLUGINS.md), [notes companions](NOTE_COMPANIONS.md),
[current support and proposals](RESEARCH_WORKSTATION_DESIGN.md#current-support-and-proposed-integrations),
[notebook results](NOTEBOOK_RESULTS.md) and
[justification experiment](JUSTIFICATION_LOGIC_EXPERIMENT.md).

## Proposed arrangement for the next interface repair

Keep **Contents** and **Commands**. Preserve the stable native controls introduced
to prevent buttons changing into unbordered tree rows. Use a few primary buttons
and compact grouped links or native action menus, with a searchable command
route for less common actions. Alphabetical ordering can help within a group;
it cannot explain which tools exist or why they apply to the current document.

| Group | Actions and boundaries |
| --- | --- |
| Reading and notes | Open Document, New Note, Recent Notes; Contents, backlinks and Return follow the current file. New Note continues to delegate creation. |
| Sources and references | Open Saved Source, named Stacks/Kerodon imports, Import Source including nLab, and Zotero Find/Resume. |
| Calculation | Native notebook opening/setup; retain, reopen, compare and export results. Label SageQueue as external until an integration is implemented. |
| Proofs | Open Proof Outline, open Lean proof, Study/Resume Lean and context-bound lesson actions. |
| Tools and setup | Companion guide and actual availability, source registrations, Lean packs, notes folder and workspace setup. Move/recovery remain explicit maintenance actions. |
| Earlier saved work | Existing resumption, history/export and lifecycle commands; no requirement to create another record. |

Deliver the next change against four concrete routes: read a note and follow a
saved source; read a Lean lesson and open its code/notes; reopen two notebook
results and compare/export them; find a Zotero reference and return from its
attachment. Check Markdown, retained-source, notebook, Lean and PDF contexts,
missing companions, cancellation and keyboard access. Keep native application
responsibilities, existing IDs, data, drafts and the working window intact.

## Evidence and limits

- Fetched origin/main and audited the clean commit above. The installed WSL
  extension catalog lists MRW **0.23.28**, Lean **0.0.242**, Jupyter **2025.9.1**,
  SageMath Enhanced **2.0.8**, LaTeX Workshop **10.20.0** and Codex
  **26.1111.21308**. These are installation observations, not live readiness checks.
- Installed MRW contributions match the audited manifest; **64 source/media
  files**, including the tutorial and build marker, match byte for byte.
- No manifest menu or welcome action references a missing contributed command.
  This checks wiring, not discoverability or successful external connections.
- Ran **55** existing companion/reader/menu/tutorial tests and **3** command-entry
  checks: all passed. They used disposable records and mocked external services.
  No new mathematical check, live Zotero request, model call, kernel run or
  container operation was performed.
- The prior release's isolated native WSL check registered all 111 commands;
  see [0.23.28 verification](RELEASE_0_23_28.md). No connected document-control
  session was available for this audit. The current window's active extension
  version, rendered layout, scroll position and enabled companion state were
  not observed. No new screenshot or manual visual acceptance is claimed.
- Full command inventory, comparisons and test logs are retained locally under
  `~/.cache/mrw-interface-audit-20261113/evidence`. No runtime files, notes,
  settings, saved research or installed packages were changed for this audit.

The committed audit does not require a new VSIX. The repairs identified above
remain to be implemented and verified before another extension release.
