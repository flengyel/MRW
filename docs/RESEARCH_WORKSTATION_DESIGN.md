# Documents, research continuity, and argument reconstruction

This design starts with mathematical work: open a document, follow its
references, compare passages, add an explanation or calculation, and return to
unfinished work. Delivered features are listed in the [project README](../README.md);
broader recovery and integrated argument reconstruction remain proposed work.

Published-source implementations must preserve the distinction between a stable
qualified item ID, an immutable content revision and an exact passage. Document
links, backlinks and research records carry the full source prefix. See
[SOURCE_IDENTIFIERS](SOURCE_IDENTIFIERS.md); canonical links do not replace
retained citations.

Current reading supports original files, retained source copies, Contents,
scoped note links and backlinks, and Return. Markdown previews support note-local
macros and explicit TikZ rendering; Reopen Document can restore an exact saved
Markdown selection. PDF pages, preview scroll positions and notebook kernel
state are not restored by MRW. See the [reading workflow](READING_OUTLINE_WORKFLOW.md)
and [0.23.5 repair report](READING_REPAIRS.md).

The document Problems interface was removed in 0.23.3. Its creation commands are
absent, while earlier saved work and pending drafts remain readable. Opening or
following notes stays ordinary reading; see [the removal report](DOCUMENT_PROBLEMS_REMOVAL.md).

## Rules for ordinary mathematical work

These rules govern current and future implementation:

1. Opening or following a document never creates a problem record or launches
   an exercise form.
2. Questions, solutions and commentary can remain where they were written,
   connected by ordinary links.
3. An additional MRW interaction must remove a demonstrated obstacle without
   requiring duplicate entry.

Do not replace Problems with a renamed **Research Question** registration system.
Research resumption first recovers documents, supported locations and
unfinished work. It does not require a new question record, title, summary,
next-action form or Research view. Notes and links supply the work;
VS Code owns unsaved buffers and their recovery. Preserve saved MRW records for
access to earlier work, without requiring their use for ordinary reading.
These rules supersede earlier prompts and roadmap requirements that conflict
with them. A proposed interaction needs an observed obstacle from mathematical
use; no further feature increment is selected by this correction.

## Purpose

MRW is a hub for doing and resuming mathematical research. It connects a
question to documents, attempts, calculations, proofs, explanations, checking
evidence, and the next action. Reading and learning belong within this work.
Work can begin with an unfinished question or calculation, without a solution,
a source passage, an AI response, or a comprehension exercise.

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

Design first for Florian's mathematical work and tools. Keep the
implementation usable with ordinary files and folders, without Obsidian,
Zettel conventions, a model account, Lean, or SageMath as entry requirements.
No multi-user product framework is needed for this sequence.

## Continuing study and a research lab notebook

The intended workflow connects ordinary notes and source passages to
calculations, proof attempts, results, unsuccessful approaches and the context
needed to resume. Learning and research share this material; optional spaced
review remains a study tool, not a prerequisite for research.

[W3C PROV](PROVENANCE_DESIGN.md) governs the provenance model for proposed
integrations. The core should preserve and expose versioned artifacts and their
relationships; plugins handle the external systems. Do not replace source
identities, rewrite saved records or adopt the VisTrails runtime to achieve this.

The concrete next usability requirement is
[Archive/Delete Studies](ACTIVE_STUDY_DESIGN.md#archive-and-delete-studies).
These controls provide reversible archive/restore and deletion through Trash,
including explicit permanent deletion. They do not require a general workflow
engine and are not yet delivered.

## Related systems and reuse

MRW is experimenting with workflows that combine continuing mathematical
study, a research lab notebook, linked Markdown/Zettelkasten notes, computation
and formal proofs. The combination is a design direction, not a claim that
comparable systems do not exist or that the complete workflow is implemented.

The links below were checked on 2026-11-10. Documented capabilities and proposed
uses in MRW are separate; this is not a hands-on evaluation of these systems.

| System | Documented overlap | What MRW should investigate or reuse |
| --- | --- | --- |
| [Zotero](https://www.zotero.org/support/quick_start_guide) | Bibliographic references, attachments, notes and citation formatting. | Connect the existing library to MRW source reading, notes and citations; reuse its reference-management functions. |
| [CoCalc](https://doc.cocalc.com/) | Projects combining SageMath, Jupyter, Markdown, LaTeX, AI assistance and course tools. | Interoperate with existing projects, notebooks and computation rather than build another hosted computing environment. |
| [Wolfram Notebooks](https://www.wolfram.com/notebooks/) | Documents combining text, executable code, results and interactive content. | Link calculations and notebooks to research notes, preserving available inputs, outputs and execution context. |
| [Proofscape / PISE](https://docs.proofscape.org/en/stable/ref/library/dc.html) | A mathematical study environment connecting proof charts, annotations and source documents. | Study its [bidirectional linking](https://www.proofscape.org/en/stable/tutorials/users/linking.html), proof expansion and comparison before adding equivalent navigation. |
| [GNU TeXmacs](https://www.texmacs.org/tmweb/home/welcome.en.html) | Mathematical writing, graphics and interfaces to computational systems. | Learn from its document-and-computation interaction; use existing editors and computational tools where they fit. |
| [MathHub](https://kwarc.info/systems/mathhub/), [sTeX and FLAMS](https://kwarc.info/systems/sTeX/) | Mathematical archives, semantic document navigation and active course materials. | Investigate reusable source representations, concept links and document services. |
| [ALeA](https://www.voll-ki.fau.de/ssfc/) | Adaptive learning from annotated course material; [published work](https://kwarc.info/people/dmueller/pubs/ws_alea_voll-ki.pdf) describes flashcards, quizzes and guided tours. | Examine its learning objects and prerequisite navigation before designing new study machinery. |
| [Eigenius](https://eigenius.io/docs/platform/justification-logic/) | An application of Artemov's justification logic to scientific records, with source-linked evidence, justification composition and Lean proof checking. | Compare its evidence representation and the distinction between checking a justification and proving its conclusion; see the [related implementation](JUSTIFICATION_LOGIC_EXPERIMENT.md#related-implementation). |
| [VisTrails](https://www.vistrails.org/index.php/Main_Page) | Workflow versions, execution provenance, annotations and comparison of alternative results. | Use its [provenance design](https://aosabook.org/en/v1/vistrails.html) as a reference for retaining how an investigation developed. The original project reports no maintenance since 2018. |

MathHub's ecosystem includes learning support, particularly through active
course materials and the related ALeA work. The reviewed sources do not
establish the complete combination sought for MRW: personal linked notes,
continuing study, a research lab notebook, repository notes and Lean proofs,
and external computation in one resumable workflow. This is a distinction of
documented scope and intended use, not evidence that MathHub cannot be extended
or that MRW is unique.

For each proposed feature, first check these systems for an existing capability,
interface or export format. Prefer interoperability or component reuse where it
meets the task. Record the remaining gap with a concrete research or study
example before adding another editor, kernel manager, scheduler or document
format. A link here does not make a system a required dependency.

### Current support and proposed integrations

The [source plugins](SOURCE_PLUGINS.md) for Stacks Project, Kerodon and nLab,
[optional source study](ACTIVE_STUDY_WORKFLOW.md), and the first
[Lean study unit](LEAN_STUDY_WORKFLOW.md) with
[local lesson packs](LEAN_LESSON_PACKS.md) are implemented. Notebook computation
currently uses the separate [SagePod/Jupyter workflow](SAGEPOD_NOTEBOOK_WORKFLOW.md).

Zotero’s first local reference/attachment workflow is implemented; its scope is
below. Repository study imports, CoCalc and Wolfram interoperability plugins, a
data-analysis plugin and broader lab-notebook provenance remain unimplemented.
Clowder and PreTeXt source adapters also remain proposed. These are distinct
from the delivered source-import and local lesson-pack interfaces.

W3C PROV is the common model for the proposed lab notebook; see
[the provenance design](PROVENANCE_DESIGN.md). VisTrails supplies ideas for
workflow evolution and result comparison. Existing libraries, formats and
interfaces should be assessed before implementing equivalent mechanisms.

### Zotero integration

First local API increment implemented after 0.23.12; see [workflow and limits](ZOTERO_WORKFLOW.md). The following scope governs the integration. Connect the existing Zotero
library to mathematical study and the research lab notebook. Zotero continues
to manage references; MRW links them to the passages, notes, calculations and
proofs that use them.

The initial workflow should support:

1. Find and select an item from a chosen Zotero library, retaining its
   bibliographic metadata and a link back to the item.
2. Open an available attachment through the existing document/PDF reader and
   associate it with an MRW note or retained source. Report unavailable files;
   do not substitute a different attachment.
3. Add a citation to an existing note using the selected reference, reusing
   Zotero's metadata and citation facilities. Keep bibliographic citations
   distinct from MRW's exact retained-passage references.

Use Zotero's documented [local API](https://www.zotero.org/support/dev/web_api/v3/local_api)
or [Web API](https://www.zotero.org/support/dev/web_api/v3/basics) as appropriate to
the selected library and host. Begin with reference lookup and linking; automatic
two-way synchronization and library editing are outside the first increment.
Do not read or modify the live SQLite database or move Zotero-managed files.

Verify the Windows Zotero / WSL2 MRW connection explicitly before choosing a
transport. Do not assume both applications share localhost or filesystem paths,
and do not expose Zotero's unauthenticated local API through a forwarded port.
Detect the available API capabilities; do not require a cloud-synced library
for a local workflow or mistake cloud metadata access for attachment access.

Carry library scope, item and attachment keys, metadata versions and the
available API-instance identity. Local and Web API version counters are not
interchangeable. When retaining source content, preserve its exact bytes and
hash as well as the Zotero reference; an item key or DOI alone is not a source
revision. Map acquired records into the [common PROV model](PROVENANCE_DESIGN.md)
without treating a citation link as proof of a derivation.

A first implementation should demonstrate selection, attachment opening,
citation insertion and resumption in the Windows/WSL2 arrangement. Include a
missing attachment and changed metadata/content; earlier retained citations
must keep their original targets. Archive/delete of an MRW Study must leave
Zotero's library and attachments intact.

## Vocabulary and interface labels

| Term | Meaning |
| --- | --- |
| Document | Material opened for work, such as a Markdown note, PDF paper, manuscript, or notebook. Format determines available operations. |
| Contents | Navigation within the selected document. It is derived from the document, not a second authored document. |
| Source | A document or other material used as a reference for a particular question or claim. This is a role, not a file format. |
| Saved source | An explicitly retained source revision, with reader selections and annotations where present. The Open Document picker labels this choice **Saved copy**. |
| Passage | A selected part of a document or saved source; retained references identify the exact revision and range. |
| Note / Zettel | A note is a document. The example [Zettel convention](https://github.com/flengyel/Zettel) uses a stable ID and editable title; that convention is optional. |
| Research question | The mathematical question under investigation; it may already be written in an ordinary note. This term does not require an MRW registration object or recall item. |
| Study question | A task used to test or develop comprehension of particular material. Keeping it for scheduled review remains explicit. |
| Proof outline | A condensed account of an argument. A proof graph is one representation of its claims and inferences. Neither term names a document's contents list. |
| Reconstruction | Attributed work making an argument's reasoning explicit, including corrections and remaining gaps. It does not inherit the source's checking status. |

Use Document in the interface and ordinary prose. Name the format when it
changes a choice or explains a current limit. Show the document's title or
filename once selected. Retire Reading overview as an application object name.
Keep overview and outline as ordinary mathematical or expository words where
they have their ordinary meanings.

The delivered 0.19.2 GUI patch changed visible labels, help, welcome text and
current workflow instructions. It preserved command IDs, view IDs, settings keys,
serialized records, stored references, filenames and note bytes.
In particular, `mrw-outline:v1` remains a compatible reference format.
The exact first-patch label map and implementation boundaries are in
[the Codex task](CODEX_DOCUMENT_WORKFLOW_PROMPT.md).

**Open Document…** opens an original file or a saved copy. **Show Contents**
focuses navigation for a selected Markdown document. Contents supports headings,
ordinary links, scoped WikiLinks and retained-source references; it does not
extract a contents tree from a PDF. The host's **File: Open File…** remains
available alongside MRW's commands.

<a id="existing-documents-and-optional-integrations"></a>

## Documents and optional integrations

Opening a document means working with the selected file. Importing or
retaining a source revision is a separate action. No conversion into an MRW
overview, move into private storage, or new note template is required merely
to read a file. Ordinary files remain under VS Code's editing, saving, undo,
external-change handling and recovery. MRW's retained records remain separate.

| Material | Current path and limits |
| --- | --- |
| Markdown | Open in place; edit or preview; navigate headings and supported links through Contents. Note-local macros and explicitly rendered TikZ diagrams stay separate from the original text. |
| PDF | Hand off to an available reader. MRW does not extract text or Contents, or restore a PDF page. |
| Zettel | Open the same Markdown file; recognize its ID and title; resolve supported links within a selected notes folder. Obsidian embeds remain unsupported in MRW. |
| Notebook / SageMath | Use VS Code/Jupyter with SagePod. Notebook editing and execution belong to that integration; MRW does not restore live kernel state. |
| Lean / LaTeX / code | Use the relevant host extension or tool. Opening a file does not check a proof, compile a manuscript or run code. |
| Handwritten work | Keep a link to the scan, image or PDF in a note and open it with an available viewer. MRW supplies no handwriting recognition. |

Opening, reading, extracting selected text, restoring an exact position, and
running a computation are different capabilities. Detect what the host exposes
and describe missing operations locally. A filename supplies neither PDF text
nor notebook kernel state. Prefer host integrations over new readers,
editors, kernel managers or tool runtimes. Opening/resuming work starts no
container, executes no cells, invokes no checker, and sends no model request.

Support navigation to a selected external document or notes folder without
weakening the private-store, workspace, trust and exact-reference checks used
for retained research records. Record a host-appropriate file URI; reopening
in another workspace or on another machine
must not guess a replacement file or private store. Do not require moving a
Windows-backed vault into the WSL repository to read it.

<a id="existing-zettelkasten"></a>

### Zettelkasten

Use Florian's vault as the working note collection. The public
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
send a vault to a model. **Open in Obsidian** opens the same note through the
registered URI handler. It uses the configured vault name or ID, or the name
of the explicitly selected notes folder when that setting is empty. Windows
and WSL paths must refer to the same file; the action does not synchronize a
remote copy. Stored source-to-note associations remain a separate companion
link. See [Obsidian configuration](OBSIDIAN_WORKFLOW.md#configure-obsidian-with-mrw).

Keep note categories optional. The wiki's
[note-category discussion](https://github.com/flengyel/Zettel/wiki/From-Fleeting-Notes-to-Project-Notes)
does not justify classifying every document before work can begin. A research
question may link a main note, project note, paper and calculation without
moving them into one directory or imposing one note format.

## Research that can be resumed

Start with the documents already in use, their supported locations, the last
usable Return destination and unfinished work. Keep questions, solutions and
commentary in those documents, connected by ordinary links. Reopening a note
containing a solution displays that note, with the surrounding work preserved.
VS Code owns recovery of unsaved buffers; MRW must not save or discard them to
resume reading. Current Reopen Document and Return behavior is described in the
[reading workflow](READING_OUTLINE_WORKFLOW.md). Broader recovery remains planned.

Do not introduce Research Question registration, a question-object hierarchy,
a Research view or required title/summary/next-action fields as the default
resumption path. An outline or linked note can organize the mathematics. A
conclusion, remaining gap or intended next action may stay as ordinary prose
where written; do not request a second copy in a form.

Preserve private studies, retained annotations and history so previous
work remains accessible. Source retention continues to serve exact citations;
it is separate from opening a live note. Keep the bounded R3 model exchange's
contract and its records. Resumption does not require a model call, exercise,
new record schema, project database or automatic classification of notes.

Keep a calculation's saved output separate from an assertion that its kernel
state has been reconstructed. A check belongs to the input revision it checked.
Use the host and navigation/persistence services first. Add a
control or saved navigation aid only after ordinary use demonstrates a specific
failure to recover work, and keep it free of duplicate mathematical entry.

## Reconstructing a compressed solution

The intended integrated workflow uses the source reader, notes,
companion exchange and checking tools. Its components are available separately;
MRW does not yet automate or restore the complete sequence:

1. Open the solution with the question or context already present in its note
   or linked sources. Keep the original and its attribution; outside model output can be retained as
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
6. Keep useful conclusions, remaining gaps and next actions in the working
   documents where they are written. Resume those documents and locations
   without re-entering their contents in a form.

A proof graph is optional. The workflow does not require full formalization,
complete reconstruction of every step, or a positive correctness verdict.
Optional recall should concern the material currently relevant. **Keep for
spaced review** enrolls a study question; reading a document does not.
Preserve the FSRS, effort-report and assistance distinctions from [ACTIVE_STUDY_DESIGN](ACTIVE_STUDY_DESIGN.md).

## Delivered work and possible next steps

| Increment | Deliverable | Concrete completion evidence |
| --- | --- | --- |
| 1. GUI terminology | Document / Contents / Saved source / Passage labels with matching help and tutorial | The create/select/follow/return/edit/reopen path works; command IDs, links and saved work are preserved. |
| 2. Documents and notes | Open in place, ordinary links, selected-folder Zettel links/backlinks, optional Obsidian opening, PDF host handoff, matching tutorial | Open a supplied note, follow another note and a PDF, inspect backlinks, return/reopen without an import or note rewrite; the ordinary-folder path works without Obsidian. |
| 3. Document Problems | Withdrawn at the user’s request in 0.23.3 | Creation routes removed; earlier records and drafts remain readable. |
| 4. Reading repairs, 0.23.5 | Delivered: exact heading/block WikiLinks, note macros, explicit TikZ rendering, progressive titles and saved Markdown selections | [Repair report and limits](READING_REPAIRS.md). |
| 5. Broader resumption | Proposed: recover additional locations and unfinished work without question registration | Resume the same notes and drafts with their links and surrounding work preserved; add only a demonstrated missing recovery action. |
| 6. Integrated reconstruction | Proposed: one compressed-solution session joins reading, explanation, an attempt, optional computation/checking and resumption | Trace one original passage through expansion, correction or remaining gap, recorded work and restart; use the study/history mechanisms. |

Choose future changes from obstacles encountered in ordinary mathematical use;
the table is not a queue of required features. Increments 1, 2 and 4 are
delivered. Increment 3 is withdrawn and is not a prerequisite for research.
General resumption and integrated reconstruction remain possible future work under the
rules above. A demonstrated data-loss defect takes priority. This correction
authorizes no new question registry, storage rewrite, outline format, scheduler
or dashboard.

Evaluate practical continuity, explanatory help and learning separately. Extend
the local history for explicit research open/resume, document-link
navigation, attempts, checking actions and failed operations, including software
and input revisions. A model proposal, reader report, observed event and derived
estimate remain distinguishable. Use the history to adapt the current session
and choose later improvements. Time away and tab switching alone establish no
cognitive-load or comprehension result. Do not create a second telemetry system.
The requested [shared history and feature-use report](USAGE_HISTORY.md) extends
that recorder with per-writer history in a configurable data directory, synchronized
by the user's Syncthing/SyncTrayzor setup. The directory may be separate from,
beneath, or identical to the Obsidian vault; a vault subdirectory is the preferred
choice for this setup. It remains unimplemented in 0.23.11.

Use a supplied mathematical example and notes for read-only opening;
new work has an explicit destination. Use disposable copies for destructive
checks. Missing native-host access is a reported limit, not a requirement for
a manual study procedure. Automated checks demonstrate mechanics; mathematical
use demonstrates whether the software makes work easier to resume or understand.

## Interface guidance and scope

The bundled tutorial is part of each increment. Lead with opening documents,
then navigating, retaining a useful passage when needed, working through a step,
and saving/resuming. Keep optional graphs and setup/recovery in linked guides.
Describe only delivered commands and show the active extension build in help;
repository Markdown and installed help can differ. A tutorial update is not
complete until its packaged content and reopening behavior are checked.

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

Keep one VS Code extension and the Python services on the workspace
host. This sequence adds no frontend rewrite, universal knowledge graph,
autonomous research agent, new cognitive simulator or project-management suite.
Preserve the delivered 0.19.1 reliability repairs. Repository publication,
private-store migration and Windows storage qualification are separate from
this design and remain unchanged.
