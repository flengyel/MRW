# Documents, research continuity, and argument reconstruction

All integrations follow [Subsystem ownership and integration boundaries](INTEGRATION_BOUNDARIES.md).
That contract covers notes, Jupyter, SagePod, SageQueue, Wolfram services, Zotero
and Lean, including native editing, explicit delegation and referential integrity.

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
state are not restored by MRW. See the [reading workflow](READING_OUTLINE_WORKFLOW.md).

The [design reconciliation register](DESIGN_RECONCILIATION.md) maps the complete
evaluation to governing decisions, pending corrections and acceptance evidence.
[Codex maintenance](CODEX_MAINTENANCE.md) compares reports with this design before
selecting changes; a later narrow task does not erase the remaining requirements.

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
use. This ordinary-work rule does not cancel the accepted repairs recorded in
the [reconciliation register](DESIGN_RECONCILIATION.md).

## Purpose

MRW supports mathematical study and research, including AI-generated papers and
Lean formalizations. It connects sources, notes, calculations and proofs;
supports deliberate practice; and preserves unfinished work.

Reconstruction identifies an argument's assumptions, definitions, intermediate
claims and gaps. It can expose errors as well as supply missing steps.
Explanations concern the returned mathematics, not hidden model reasoning.

Ordinary reading and existing files remain usable without Obsidian, a prescribed
note format, an AI account, Lean or SageMath. Practice uses the mathematics under
study rather than an unrelated sequence of exercises.

## Operational feedback and maintenance

[Feature-use statistics](OPERATIONAL_USAGE.md) are a standing design requirement,
independent of study assessment. Review use, persistent non-use, errors and
coverage when choosing later improvements. The existing recorder and Study
History report supply partial evidence; they do not yet supply complete feature
coverage or a direct adoption report.

An [optional diagnostics plugin](DIAGNOSTICS_PLUGIN.md) should provide feature-use
analysis and periodic integrity/data-hygiene reports. Core retains its event
recording and the checks needed for safe storage operations. The plugin consumes
bounded, versioned inspection interfaces, owns report scheduling and presents
findings. It delegates repairs to the owner and never treats unvisited notes or
retained revisions as disposable. This extends the
[integration contract](INTEGRATION_BOUNDARIES.md#integration-review-and-testing);
it does not expand source-import API 1 into a general maintenance interface.

## Continuing study and a research lab notebook

The intended workflow connects ordinary notes and source passages to
calculations, proof attempts, results, unsuccessful approaches and the context
needed to resume. Learning and research share this material; optional spaced
review remains a study tool, not a prerequisite for research.

[W3C PROV](PROVENANCE_DESIGN.md) governs the provenance model for proposed
integrations. The core should preserve and expose versioned artifacts and their
relationships; plugins handle the external systems. Do not replace source
identities, rewrite saved records or adopt the VisTrails runtime to achieve this.

[Archive/Delete Studies](ACTIVE_STUDY_DESIGN.md#archive-and-delete-studies)
is delivered through Command Palette pickers. The Studies sidebar was removed
in 0.23.28. Preserve saved work through Resume Study and history/export; retain
the lifecycle controls without restoring a study tree or a renamed registration
system. Fleeting notes and notes intended for later review are ordinary documents.
The sidebar provides Contents and Commands; the Lean tutorial remains separate.

## Related systems and reuse

MRW is experimenting with workflows that combine continuing mathematical
study, a research lab notebook, linked Markdown notes, computation
and formal proofs. The combination is a design direction, not a claim that
comparable systems do not exist or that the complete workflow is implemented.

The links below were checked on 2026-11-10. Documented capabilities and proposed
uses in MRW are separate; this is not a hands-on evaluation of these systems.

| System | Documented overlap | What MRW should investigate or reuse |
| --- | --- | --- |
| [Zotero](https://www.zotero.org/support/quick_start_guide) | Bibliographic references, attachments, notes and citation formatting. | Connect the existing library to MRW source reading, notes and citations; reuse its reference-management functions. |
| [CoCalc](https://doc.cocalc.com/) | Projects combining SageMath, Jupyter, Markdown, LaTeX, AI assistance and course tools. | A [proposed adapter](COCALC_ADAPTER.md) would open selected projects/files and retain exported notebook results. CoCalc owns collaborative editing and execution; no second hosted environment. |
| [Wolfram Notebooks](https://www.wolfram.com/notebooks/) | Documents combining text, executable code, results and interactive content. | Link calculations and notebooks to research notes, preserving available inputs, outputs and execution context. |
| [Proofscape / PISE](https://docs.proofscape.org/en/stable/ref/library/dc.html) | A mathematical study environment connecting proof charts, annotations and source documents. | Study its [bidirectional linking](https://www.proofscape.org/en/stable/tutorials/users/linking.html), proof expansion and comparison before adding equivalent navigation. |
| [GNU TeXmacs](https://www.texmacs.org/tmweb/home/welcome.en.html) | Mathematical writing, graphics and interfaces to computational systems. | Learn from its document-and-computation interaction; use existing editors and computational tools where they fit. |
| [MathHub](https://kwarc.info/systems/mathhub/), [sTeX and FLAMS](https://kwarc.info/systems/sTeX/) | Mathematical archives, semantic document navigation and active course materials. | Investigate reusable source representations, concept links and document services. |
| [ALeA](https://www.voll-ki.fau.de/ssfc/) | Adaptive learning from annotated course material; [published work](https://kwarc.info/people/dmueller/pubs/ws_alea_voll-ki.pdf) describes flashcards, quizzes and guided tours. | Examine its learning objects and prerequisite navigation before designing new study machinery. |
| [Eigenius](https://eigenius.io/docs/platform/justification-logic/) | An application of Artemov's justification logic to scientific records, with source-linked evidence, justification composition and Lean proof checking. | Compare its evidence representation and the distinction between checking a justification and proving its conclusion; see the [related implementation](JUSTIFICATION_LOGIC_EXPERIMENT.md#related-implementation). |
| [VisTrails](https://www.vistrails.org/index.php/Main_Page) | Workflow versions, execution provenance, annotations and comparison of alternative results. | Use its [provenance design](https://aosabook.org/en/v1/vistrails.html) as a reference for retaining how an investigation developed. The original project reports no maintenance since 2018. |

The following additional sources were checked on 2026-11-14. These comparisons
guide reuse; they do not establish an installed or working MRW integration.

| System | Documented overlap | MRW decision and boundary |
| --- | --- | --- |
| [Jupyter AI](https://jupyter-ai.readthedocs.io/en/latest/users/chat/guide.html) | Attach selected notebook material to a conversation; act on suggested code through explicit controls. Its [agent workflow](https://jupyter-ai.readthedocs.io/en/latest/users/terminal-agents/workflows.html) describes reviewing notebook changes. | Make context and proposed edits inspectable beside the work, using existing companions. Do not duplicate its chat interface or assume JupyterLab facilities are a VS Code API. |
| [nbdime](https://nbdime.readthedocs.io/en/stable/cli.html) | Notebook-aware comparison of sources, outputs, metadata and attachments, including a rich diff viewer. | Evaluate native notebook diff and nbdime before building a comparison engine. No integration is selected yet; assess host compatibility, read-only output handling, resource use and any server exposure before adoption. |
| [Org/Babel](https://orgmode.org/guide/Working-with-Source-Code.html) | Source blocks, code editing/evaluation and results kept with surrounding prose, with export options. | Keep explanation, code, result and reference near enough to follow through existing documents and links. No required Org format, duplicated prose or second evaluator follows from this lesson. |

The adopted directions and exclusions are recorded in the
[reconciliation register](DESIGN_RECONCILIATION.md#reuse-and-boundaries).
Preserve alternatives and failed approaches, inspectable input/method revisions,
and explicit source/note/proof links. Neither a mandatory visual pipeline nor
formal evidence for every ordinary note is required. Reuse ideas from other
systems without inferring that MRW needs their whole runtime or user interface.

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

[Sagebrush](https://sagebrush.space/) was reviewed separately on 2026-11-17;
[the assessment below](#sagebrush) covers its notebook interchange, reactive
execution and computational evidence.

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

### CoCalc adapter

The [CoCalc adapter proposal](COCALC_ADAPTER.md) defines a bounded first
increment: select the deployment/project/file, open it through CoCalc, and
retain an explicitly saved/exported notebook with selected companion files.
Reuse MRW's existing notebook capture, comparison and provenance records.
Authenticated CLI/API access and remote execution need a later verified
contract for the selected deployment. This is a proposal, not a delivered
adapter or replacement for the current SagePod/Jupyter workflow.

### Sagebrush

[Sagebrush](https://sagebrush.space/) fits as an optional calculation and
document companion. Its [product description](https://github.com/sagemathinc/sagebrush/blob/4bcb319294e73be1fe67c602ea7a92b6d4933eb6/PRODUCT.md)
describes browser and desktop notebooks with its own mathematical engines and
partial Sage, Magma, Python and MATLAB interfaces. It is a separate execution
system from SagePod/SageMath. MRW should first use exported notebooks through
the existing capture, comparison, linking and Return workflow.

| MRW requirement | Fit and boundary |
| --- | --- |
| Keep mathematics, explanation and computation connected | Sagebrush supplies executable notebooks; ordinary MRW notes can link their retained outputs and supporting arguments. Its cell-dependency graph describes computation, not a proof graph. |
| Preserve exact work through interruption | Its [exporter](https://github.com/sagemathinc/sagebrush/blob/4bcb319294e73be1fe67c602ea7a92b6d4933eb6/web/notebook/ipynb.js) writes nbformat 4 with code, outputs and metadata. Retain those exact bytes and selected input files; a browser document or share URL alone is not an immutable result revision. |
| Delegate execution explicitly | The [cell-execution guide](https://sagebrush.space/articles/notebook/01-how-cells-run) describes downstream reruns, an edit-and-run agent operation, and recomputation on history reversion. MRW reading, capture, comparison and resumption must stay separate from those operations. A future adapter must expose their actual execution scope and respect the owner's policy. |
| Distinguish different kinds of evidence | The [engine README](https://github.com/sagemathinc/sagebrush/blob/4bcb319294e73be1fe67c602ea7a92b6d4933eb6/README.md) distinguishes exact, conditional and heuristic results; some class-group certification is conditional on GRH. Preserve the algorithm, version, assumptions and available certificate. A producer's label or agreement with SageMath does not become a Lean check, unconditional proof or automatic premise admission. |
| Keep authority with the owning application | File, agent and execution grants remain Sagebrush's. Importing a notebook grants no additional access. Its [security model](https://github.com/sagemathinc/sagebrush/blob/4bcb319294e73be1fe67c602ea7a92b6d4933eb6/SECURITY-MODEL.md) separates intended controls from incomplete implementation; an MRW adapter would need its own tested boundary rather than inheriting a general assurance. |

A useful bounded comparison is the existing
[quadratic-discriminant investigation](../examples/notebook-provenance/README.md):
evaluate the two trace determinants in both Sagebrush and SagePod, preserve
their basis choices and exact outputs, compare them, and reopen without a run.
This would test the benefit of a second implementation before adding an MCP
or native adapter. No such execution trial or adapter is delivered by this review.

The code/format review uses upstream revision
`4bcb319294e73be1fe67c602ea7a92b6d4933eb6`, checked on 2026-11-17.
One [upstream number-field notebook](https://github.com/sagemathinc/sagebrush/blob/4bcb319294e73be1fe67c602ea7a92b6d4933eb6/examples/notebook/sage-algebraic-number-theory/main.ipynb)
(13 cells, 12 saved outputs) passed MRW's existing capture/read path with
byte-for-byte recovery in a disposable store. It correctly retained
**saved outputs, execution unknown**. This checks one file, not browser export,
native rendering, execution or general API compatibility. Its kernelspec says
`sagemath`; that name alone cannot establish which engine produced the output.

### Zotero integration

Existing-note citation rendering is separate from lookup, Markdown insertion
and retained attachments. Obsidian/Pandoc `[@key]` syntax does not currently
resolve in MRW. The [reader requirement](ZOTERO_WORKFLOW.md#citation-rendering-in-existing-notes)
calls for an optional existing processor and scoped bibliography without note
rewrites, duplicate library management or an automatic live Zotero query.

See [workflow and limits](ZOTERO_WORKFLOW.md). Connect the existing Zotero
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

## Interface labels

Use **Document** for the current file and **Contents** for its navigation.
Proof outlines remain separate views of mathematical claims and inferences.
Existing command IDs, settings, stored references and note bytes retain their
identities when visible labels change.

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
| Notebook / SageMath | Use VS Code/Jupyter with SagePod. Notebook editing and execution belong to that integration; MRW does not restore live kernel state. |
| Lean / LaTeX / code | Use the relevant host extension or tool. MRW does not independently submit a check, build or run on opening; normal owner-extension diagnostics remain available. |
| Handwritten work | Keep a link to the scan, image or PDF in a note and open it with an available viewer. MRW supplies no handwriting recognition. |

Opening, reading, extracting selected text, restoring an exact position, and
running a computation are different capabilities. Detect what the host exposes
and describe missing operations locally. A filename supplies neither PDF text
nor notebook kernel state. Prefer host integrations over new readers,
editors, kernel managers or tool runtimes. MRW opening/resuming starts no
container, executes no cells and independently submits no checker or model
request. Native Lean diagnostics and other normal editor behavior remain owned
by their extensions; see the integration contract.
A separately requested execution or lifecycle action may delegate through its
owner's supported interface; this does not authorize a competing implementation.

Support navigation to a selected external document or notes folder without
weakening the private-store, workspace, trust and exact-reference checks used
for retained research records. Record a host-appropriate file URI; reopening
in another workspace or on another machine
must not guess a replacement file or private store. Do not require moving a
Windows-backed vault into the WSL repository to read it.

<a id="existing-zettelkasten"></a>

### Notes applications

The [notes-companion proposal](NOTE_COMPANIONS.md) separates application handoff
from document reading. Preserve the existing Obsidian workflow while considering
an optional adapter; the companion owns creation, templates and naming.
Existing notes may also be edited through an appropriate native MRW/VS Code
editor. Org capture
and The Archive are candidate integrations, not delivered capabilities. A note
may be an entry in a file. Do not infer a separate note schema or require a new
registration form. The reader can start note creation from MRW with New Note:
MRW invokes the configured Obsidian command or opens a blank host editor.
The invoked application owns its prompts, templates, filename and Save;
the separate reading-starter command was removed in 0.23.26.

<a id="zettelkasten"></a>

### Linked notes

Workspace working notes serve as source notes. They preserve material from
which the reader may develop further notes, without requiring every observation or
calculation to use a particular notes application. The reader selects material, formulates it
and chooses its links; the selected notes application and configured template own note
creation. MRW retains working material, exact source references and return
locations. This separation preserves the reader's own format and authoring
practice. Source notes and independently developed notes may have many-to-many associations;
they need not have identical text or a single editing location. Linking a note
must not retire its source material. Current associations preserve both works independently; see [source notes and linked notes](NOTE_COMPANIONS.md#source-notes-and-zettels).

Keep the effort of selection and linking while removing repeated entry and
navigation obstacles. Do not turn that effort into a registration form or
automatically declare a copied or format-valid note a completed mathematical note. Machine
suggestions remain proposals for the reader to consider.

The maintainer's vault is one instance of this workflow. Its
[published note format](https://github.com/flengyel/Zettel) and tools are optional. Reading a note in place remains possible
without Obsidian; creation in this vault goes through Obsidian and its template.

When this format is selected, preserve the
[optional note-format specification](https://github.com/flengyel/Zettel#self-documenting-note-specification):
the immutable ID equals the filename stem; YAML `id` contains that ID; YAML
`title` contains ID plus title; the H1 contains the title; links target `[[ID]]`.
Keep existing YAML, `SEE ALSO`, `Research`, older section headings, citations,
embeds and formatting. `reference-section-title: References` names the exported
bibliography; it is separate from the manually maintained Research section.
Older ID forms remain valid. Merely opening a note never runs a template,
renames a file, normalizes prose, or requires successful note validation.
The selected format is not required for other Markdown documents in the vault.

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
[reading workflow](READING_OUTLINE_WORKFLOW.md).
PDF pages, preview scroll positions and live kernels are not restored.

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

## Implementation status

The [design register](DESIGN_RECONCILIATION.md) records delivered capabilities
and remaining work. Broader resumption and integrated argument reconstruction
require further implementation. Add an interaction only for an observed
obstacle; preserve ordinary files, links and unfinished work.

Assess practical continuity, explanation and learning separately. Observed
actions, reader reports, AI assessments and derived estimates remain distinct.
Time away and tab switching alone establish no cognitive-load or comprehension
result. Use the [existing recorder](USAGE_HISTORY.md), not a second telemetry
system.

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

Keep one MRW core VS Code extension and the Python services on the workspace
host. Optional companion extensions, including diagnostics, use scoped interfaces
and do not become competing frontends. This sequence adds no frontend rewrite, universal knowledge graph,
autonomous research agent, new cognitive simulator or project-management suite.
Preserve the delivered 0.19.1 reliability repairs. Repository publication,
private-store migration and Windows storage qualification are separate from
this design and remain unchanged.
