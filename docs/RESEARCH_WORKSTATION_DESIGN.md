# Documents, research continuity, and argument reconstruction

Status: approved design direction, 2026-11-06; implementation is staged below.
Reviewed baseline: MRW 0.19.1, `82f310bb8d0984af0535e296b2361d6cc38e5ce6`.
This document governs the next product increments. Earlier delivery reports
remain evidence of what was implemented and observed; they are not superseded
as records of those deliveries.

## Purpose

MRW is a hub for doing and resuming mathematical research. It connects a
question to documents, attempts, calculations, proofs, explanations, checking
evidence, and the next action. Reading and learning belong within this work.
Work can begin with an unfinished question or calculation, without an existing
solution, a source passage, an AI response, or a comprehension exercise.

A central use is reconstructing a compressed mathematical argument, including
an LLM-generated solution: identify its assumptions, definitions, intermediate
claims, cited results and gaps; develop explanations and examples; check what
can be checked; and preserve the work so it can be continued. Reconstruction
may discover that a step is false or remains unjustified. Fluency is not the
criterion of success. This concerns the returned mathematical argument, not
the model's hidden reasoning or unreturned search.

The original rapid-learning-console idea guides the interaction: present useful
mathematics, let the reader work, offer pertinent tests of comprehension, and
remember where work stopped. Speed is not a performance target. A feature is
valuable when it contributes to that interaction or makes research resumable.

Design first for Florian's existing mathematical work and tools. Keep the
implementation usable with ordinary files and folders, without Obsidian,
Zettel conventions, a model account, Lean, or SageMath as entry requirements.
No multi-user product framework is needed for this sequence.

## Vocabulary and the first GUI change

| Term | Meaning |
| --- | --- |
| Document | Material opened for work, such as a Markdown note, PDF paper, manuscript, or notebook. Format determines available operations. |
| Contents | Navigation within the selected document. It is derived from the document, not a second authored document. |
| Source | A document or other material used as a reference for a particular question or claim. This is a role, not a file format. |
| Saved source | An explicitly retained source revision available independently of changes to its original, together with its reader selections and annotations where present. |
| Passage | A selected part of a document or saved source; retained references identify the exact revision and range. |
| Note / Zettel | A note is a document. A Zettel follows the existing Zettel note convention; that convention is optional. |
| Research question | The mathematical question under investigation, with linked work and a place to resume. It need not be a recall question. |
| Study question | A task used to test or develop comprehension of particular material. Keeping it for scheduled review remains explicit. |
| Proof outline | A condensed account of an argument. A proof graph is one representation of its claims and inferences. Neither term names a document's contents list. |
| Reconstruction | Attributed work making an argument's reasoning explicit, including corrections and remaining gaps. It does not inherit the source's checking status. |

Use Document in the interface and ordinary prose. Name the format when it
changes a choice or explains a current limit. Show the document's title or
filename once selected. Retire Reading overview as an application object name.
Keep overview and outline as ordinary mathematical or expository words where
they have their ordinary meanings.

The immediate GUI patch changes visible labels, help, welcome text and current
workflow instructions. It preserves command IDs, view IDs, settings keys,
serialized records, stored references, existing filenames and note bytes.
In particular, `mrw-outline:v1` remains a compatible reference format.
The exact first-patch label map and implementation boundaries are in
[the Codex task](CODEX_DOCUMENT_WORKFLOW_PROMPT.md).

At the reviewed baseline, the document navigator handles Markdown headings and
MRW retained-source links. Its choose/show actions select a Markdown document
and focus the tree; they do not constitute a general file-opening action.
The first patch must not imply PDF contents, vault WikiLink resolution or
opening an arbitrary external file has been delivered. Its picker/help should
state the Markdown support plainly. Existing **File: Open File…** remains
available through the host. General document opening is the next increment.

## Existing documents and optional integrations

Opening a document means working with the selected existing file. Importing or
retaining a source revision is a separate action. No conversion into an MRW
overview, move into private storage, or new note template is required merely
to read a file. Ordinary files remain under VS Code's editing, saving, undo,
external-change handling and recovery. MRW's retained records remain separate.

| Material | Intended integration |
| --- | --- |
| Markdown | Open in place; edit or preview; derive Contents from headings; follow ordinary document links. |
| PDF | Open in an available PDF reader; restore page/position when the reader exposes it; use bookmarks or page navigation when available. |
| Existing Zettel | Open the same Markdown file; recognize its stable ID and editable title; resolve its note links within a selected notes folder. |
| Notebook / SageMath | Reopen the notebook through VS Code/Jupyter and the existing SagePod arrangement; keep calculation inputs, saved outputs, interpretation and relevant revisions connected to the question. |
| Lean / LaTeX / code | Reopen the relevant file/location through the established host extension or tool; associate recorded checks with the input revision and scope actually checked. |
| Handwritten work | Link an existing scan, image or PDF alongside the question; transcription is optional. |

Opening, reading, extracting selected text, restoring an exact position, and
running a computation are different capabilities. Detect what the host exposes
and describe missing operations locally. A filename supplies neither PDF text
nor notebook kernel state. Prefer existing host integrations over new readers,
editors, kernel managers or tool runtimes. Opening/resuming work starts no
container, executes no cells, invokes no checker, and sends no model request.

An explicitly chosen external document or notes folder needs a deliberate
navigation path. Implement it without weakening the private-store, workspace,
trust and exact-reference checks used for retained research records. Record a
host-appropriate file URI; reopening in another workspace or on another machine
must not guess a replacement file or private store. Do not require moving a
Windows-backed vault into the WSL repository to read it.

### Existing Zettelkasten

Use the existing vault as Florian's working note collection. The public
`flengyel/Zettel` repository contains its specification and tools; it is not the
private vault. Notes can be used without the Obsidian application.

Preserve the [Zettel specification](https://github.com/flengyel/Zettel/blob/fdce8d73b7d6c947b58d7028e4e4e4e03138f186/README.md):
the immutable ID equals the filename stem; YAML `id` contains that ID; YAML
`title` contains ID plus title; the H1 contains the title; links target `[[ID]]`.
Keep existing YAML, `SEE ALSO`, `References`, citations, embeds and formatting.
Older ID forms remain valid. Merely opening a note never runs a template,
renames a file, normalizes prose, or requires successful note validation.
Not every Markdown document in the vault is a Zettel.

The [Alphanumeric Index](https://github.com/flengyel/Zettel/wiki/Alphanumeric-Index)
uses links to reserved index notes and the resulting backlinks. Preserve
`[[ID]] Title` with the title outside the link; Contents alone cannot replace
that navigation. The notes integration should resolve outgoing links and show
backlinks using a bounded index of an explicitly selected folder. Show duplicate
or missing IDs rather than choosing a target by title. The index is derived and
rebuildable; the files remain authoritative. Do not scan unrelated folders or
send a vault to a model. An optional **Open in Obsidian** action opens the same
note using a supplied Obsidian URL or an explicitly configured folder-to-vault
mapping. The existing companion bridge opens stored associations; it does not
identify an arbitrary file's vault. Never infer that identity from a folder
name or WSL path.

Keep note categories optional. The wiki's
[note-category discussion](https://github.com/flengyel/Zettel/wiki/From-Fleeting-Notes-to-Project-Notes)
does not justify classifying every document before work can begin. A research
question may link a main note, project note, paper and calculation without
moving them into one directory or imposing one note format.

## Research that can be resumed

Provide a visible way to find ongoing questions and resume their work. Start
with a small **Research** content view in the existing MRW container, reusing
the current research/study surface where practical rather than adding a panel
for every tool. Show saved questions and linked work; keep commands in menus.
Studies remain accessible within the work and independently.

A resumable question needs a title or question, links to relevant work, and
durable places for the latest useful conclusion, unresolved issue and next
action. Record locations and revisions where supported. These are aids, not
mandatory reporting fields. Begin from current work and ask only for information
that cannot be obtained from the selected documents or explicit actions.
Capture observed file locations, actions and outputs automatically where
supported. Conclusions and next actions remain authored text or clearly marked
proposals; they are not inferred facts merely because an event was recorded.

Reuse existing record publication, study, navigation and summary services. The
existing R3 investigation is a single model parent/child transaction. Preserve
that contract and link its records from research work; do not turn it into a
project model by removing its limits. A general research question must exist
without a model call or source passage and may have several sessions, studies,
calculations and linked exchanges. Ending a session retains its summary and
next action. Closing, completing or archiving work does not discard those notes.

Retain meaningful attempts and abandoned approaches with their reasons when
recorded. Keep a calculation's observed output separate from its interpretation,
and a check separate from a claim about the current manuscript. If the relevant
input changes, show that an earlier check belongs to an earlier revision.
Reopening saved notebook output does not mean a kernel has reconstructed its
variables. Capturing unknown or missing evidence as unknown is sufficient.

Begin with resumable questions in the current workspace and explicit links to
other work. A later recent-project list may route through VS Code's existing
workspace opening. Do not pool unrelated private stores or add a global project
database to deliver the first useful question/session workflow.

## Reconstructing a compressed solution

Use the existing source reader, notes, companion exchange, study and checking
surfaces in one session:

1. Open the solution and state or recover the question being addressed. Keep
   the original and its attribution; outside model output can be retained as
   supplied text without inventing a ModelCall or missing request metadata.
2. Select a difficult passage. Identify missing definitions, assumptions,
   intermediate claims, citations or calculations needed to justify it.
3. Request or write an expansion tied to that passage. Explanations, examples,
   counterexamples and diagrams are options. Preserve competing explanations
   and corrections separately from the original.
4. Attempt the step independently, apply it to a changed example, or explain
   why a hypothesis is needed. Offer a pertinent comprehension question when
   useful; allow research to continue without answering it.
5. Follow a source or make an explicit calculation/check when appropriate.
   Record what the evidence establishes and which version it concerns.
6. Save the useful conclusion, remaining gap and next action with the work.
   Resume at those documents and locations after closing the session.

A proof graph is optional. The workflow does not require full formalization,
complete reconstruction of every step, or a positive correctness verdict.
Keep review scoped to the material currently relevant, with explicit admission
and a small budget. Preserve the existing FSRS, effort-report and assistance
distinctions from [ACTIVE_STUDY_DESIGN](ACTIVE_STUDY_DESIGN.md).

## Implementation order and useful evidence

| Increment | Deliverable | Concrete completion evidence |
| --- | --- | --- |
| 1. GUI terminology | Document / Contents / Saved source / Passage labels with matching help and tutorial | Existing create/select/follow/return/edit/reopen path works; command IDs, links and saved work are preserved. |
| 2. Existing documents and notes | Open in place, ordinary links, selected-folder Zettel links/backlinks, optional Obsidian opening, PDF host handoff | Open a supplied note, follow another note and a PDF, return without an import or note rewrite; the ordinary-folder path works without Obsidian. |
| 3. Research resumption | Saved questions independent of ModelCall, linked documents/calculations/checks, persistent conclusion/gap/next action | Stop one investigation and resume its documents and unfinished work; ending the session preserves the summary. |
| 4. Integrated reconstruction | One compressed-solution session joins reading, explanation, an attempt, optional computation/checking and resumption | Trace one original passage through expansion, correction or remaining gap, recorded work and restart; use existing study/history mechanisms. |

Deliver coherent increments in that order; do not combine a naming patch with
a storage rewrite. A discovered data-loss defect takes priority. The broad
design is authorized; the immediate Codex task implements increment 1, with
the following increments specified here rather than hidden in a feature backlog.

Evaluate practical continuity, explanatory help and learning separately. Extend
the existing local history for explicit research open/resume, document-link
navigation, attempts, checking actions and failed operations, including software
and input revisions. A model proposal, reader report, observed event and derived
estimate remain distinguishable. Use the history to adapt the current session
and choose later improvements. Time away and tab switching alone establish no
cognitive-load or comprehension result. Do not create a second telemetry system.

Use a supplied mathematical example and existing notes for read-only opening;
new work has an explicit destination. Use disposable copies for destructive
checks. Missing native-host access is a reported limit, not a requirement for
another manual study ceremony. Automated checks demonstrate mechanics; genuine
use demonstrates whether work became easier to resume or understand.

## Interface guidance and scope

Follow Microsoft's [UX overview](https://code.visualstudio.com/api/ux-guidelines/overview),
[Views](https://code.visualstudio.com/api/ux-guidelines/views) and
[Command Palette](https://code.visualstudio.com/api/ux-guidelines/command-palette)
guidance: concise names, native content views, contextual actions, few primary
controls, and host-owned document handling. Respect user placement, keyboard
navigation, themes and accessibility. Limit custom webviews to work that needs
them. The proposed labels are MRW design decisions, not names prescribed by
Microsoft. Consistent terminology applies the notation and reader-orientation
principles in Knuth, Larrabee and Roberts, *Mathematical Writing*, sections 1 and
13 ([Stanford text](https://www-cs-faculty.stanford.edu/~knuth/papers/cs1193.pdf)).

Keep one VS Code extension and the existing Python services on the workspace
host. This sequence adds no frontend rewrite, universal knowledge graph,
autonomous research agent, new cognitive simulator or project-management suite.
Preserve the delivered 0.19.1 reliability repairs. Repository publication,
private-store migration and Windows storage qualification are separate from
this design and remain unchanged.
