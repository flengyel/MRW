# Documents, research continuity, and argument reconstruction

## Purpose

MRW supports mathematical understanding and research. Its aims are to study
literature and AI-generated mathematics, inspect grounds for using results,
and continue unfinished work.

Work can begin with an unsolved question or an unfinished calculation. Write
it in a note or notebook. When the argument calls for a theorem, compare its
hypotheses with those available. For an AI-generated proof, keep the proposed
inference beside its source so that a correction can identify the precise gap.
[Mathematics in ordinary notes](MATHEMATICS_WITH_NOTES.md)

## Rules for ordinary mathematical work

Open the original document or retain a copy when an exact citation is needed.
Each imported item has a [qualified source identifier](SOURCE_IDENTIFIERS.md).
An exact citation also identifies the revision and passage. A canonical website
link opens the current page.

Questions, solutions and commentary can stay where they were written, joined by
ordinary links. Opening a document or following a link creates no study record.
VS Code owns editing and unsaved buffers. The [integration contract](INTEGRATION_BOUNDARIES.md)
assigns editing, execution and storage to their respective applications.

<a id="continuing-study-and-a-research-lab-notebook"></a>

## Research that can be resumed

Leave the conclusion, failed approach or unfinished step in the working note.
Link to the exact passage or saved calculation it depends on. A retained
notebook result preserves the saved notebook and any selected inputs.
[Notebook results](NOTEBOOK_RESULTS.md) · [Provenance](PROVENANCE_DESIGN.md)

**Return to Document** recovers the originating link occurrence when it still
matches. **Reopen Document** opens the last file and restores a matching
Markdown selection. Use **Recent Documents…** for an earlier note. PDF return
is file-level. For a saved study attempt, use **Resume Study**.
[Reading and restart](READING_OUTLINE_WORKFLOW.md#backlinks-edits-and-restart) ·
[Study controls](ACTIVE_STUDY_DESIGN.md#archive-and-delete-studies)

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
4. Test the step by deriving it, changing an example or examining where a
   hypothesis enters.
5. Follow a source or make an explicit calculation/check when appropriate.
   Record what the evidence establishes and which version it concerns.
6. Keep useful conclusions, remaining gaps and next actions in the working
   documents where they are written. Resume those documents and locations
   without re-entering their contents in a form.

A reader can use an outline for selected steps and leave the rest of the proof
in the original document. **Keep for spaced review** enrolls a source question.
The [study design](ACTIVE_STUDY_DESIGN.md) defines which recorded outcomes affect
its schedule.

<a id="related-systems-and-reuse"></a>

## Related research

| System | Emphasis |
| --- | --- |
| [Eigenius](https://eigenius.io/docs/platform/justification-logic/) | Typed evidence and checkable grounds for research claims. Its [justification implementation](JUSTIFICATION_LOGIC_EXPERIMENT.md#related-implementation) is relevant to MRW's separation of provenance, admitted reasons and checked derivations. |
| [Axiom Math](https://axiommath.ai/mission/) | Pursues mathematical discovery through conjecturing, proof search and translation between informal mathematics and Lean, including explanations of formal proofs. |
| [Google AI co-scientist](https://research.google/blog/accelerating-scientific-breakthroughs-with-an-ai-co-scientist/) | Generates, evaluates and refines scientific hypotheses and research proposals. |
| [Kosmos](https://advances.edisonscientific.com/research/announcing-kosmos/) | Combines literature reading and computational analysis, tracing report conclusions to source passages and code. |

## Optional plugins and integrations

| Integration | Current role |
| --- | --- |
| [Obsidian](OBSIDIAN_WORKFLOW.md) | Linked notes and externally owned note creation. |
| [Zotero](ZOTERO_WORKFLOW.md) | Read-only reference and attachment access; citation rendering. |
| [Lean](LEAN_STUDY_WORKFLOW.md) | Native proof interaction and optional [local lesson packs](LEAN_LESSON_PACKS.md). |
| [Jupyter and SagePod](SAGEPOD_NOTEBOOK_WORKFLOW.md) | Notebook execution, with MRW capture, comparison and export of retained results. |
| [Source plugins](SOURCE_PLUGINS.md) | Explicit imports from Stacks Project, Kerodon and nLab. |
| [Diagnostics companion](DIAGNOSTICS_PLUGIN.md) | Optional local feature-use and integrity reports. |

CoCalc, Wolfram interoperability, repository study imports and broader
lab-notebook provenance remain proposed. Clowder and PreTeXt source adapters
also remain proposed. The [provenance design](PROVENANCE_DESIGN.md) defines the
common W3C PROV vocabulary for new integrations. External systems retain their
editors, execution environments and managed data.

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

### Zotero integration

Zotero owns its references and attachments. MRW uses Zotero's read-only
[local API](https://www.zotero.org/support/dev/web_api/v3/local_api) to select a
reference, open an available attachment and insert a citation into an existing
note. In WSL, the Windows Zotero connection uses Windows PowerShell to reach
the local API on the Windows host. Report an inaccessible attachment without
substituting another file. The [workflow](ZOTERO_WORKFLOW.md) gives the
connection and path requirements.

Native Markdown preview renders bracketed Pandoc citations with a scoped
bibliography or a configured Better BibTeX lookup. Rendering leaves the text
of the note intact. [Citation setup](ZOTERO_WORKFLOW.md#citation-rendering-in-existing-notes).

Keep the library scope, API instance when available, item and attachment keys
and metadata version. Local and [Web API](https://www.zotero.org/support/dev/web_api/v3/basics)
version counters have different scopes. A retained attachment also needs its
exact bytes and revision. A citation key or DOI cannot identify those bytes.
The adapter leaves Zotero's files and database under Zotero's control.

## Interface labels

Use **Document** for the current file and **Contents** for its navigation.
Proof outlines remain separate views of mathematical claims and inferences.
Existing command IDs, settings, stored references and note bytes retain their
identities when visible labels change.

<a id="existing-documents-and-optional-integrations"></a>

## Documents and optional integrations

Open a selected file in place. Retaining an exact copy is a separate action.

| Material | Current path and limits |
| --- | --- |
| Markdown | Open in place; edit or preview; navigate headings and supported links through Contents. Note-local macros and explicitly rendered TikZ diagrams stay separate from the original text. |
| PDF | Hand off to an available reader. MRW does not extract text or Contents, or restore a PDF page. |
| Notebook / SageMath | Use VS Code/Jupyter with SagePod. Notebook editing and execution belong to that integration; MRW does not restore live kernel state. |
| Lean / LaTeX / code | Use the relevant host extension or tool. MRW does not independently submit a check, build or run on opening; normal owner-extension diagnostics remain available. |
| Handwritten work | Keep a link to the scan, image or PDF in a note and open it with an available viewer. MRW supplies no handwriting recognition. |

Opening or resuming a file starts no MRW build, kernel, container, model
request or proof check. Native editor services such as Lean diagnostics still
run. Delegate a requested action to the application that owns it.

Reopening an external file uses its recorded URI and the applicable workspace,
trust and access checks. If the target is unavailable on another host, report
the missing target. WSL can read an accessible Windows notes folder in place.

<a id="existing-zettelkasten"></a>

### Notes applications

Choose **New Note…** in MRW. For a configured Obsidian vault, MRW invokes the
selected creation command. Obsidian owns templates and naming. For an ordinary
folder, MRW opens a blank Markdown editor. The current document stays open.
[Notes applications](NOTE_COMPANIONS.md) describes the handoff and the proposed
integrations with Org and The Archive.

<a id="zettelkasten"></a>

### Linked notes

A source note and any notes developed from it remain independently editable.
Several notes may refer to one passage, and a note may use several sources.
Linking records the association and preserves each work. [Develop and link notes](NOTE_COMPANIONS.md#develop-and-link-notes).

In a selected notes folder, `[[ID]]` resolves to the exact filename stem.
A label in `[[ID|label]]` changes the displayed text. The YAML `id` and `title`
do not redirect a link. Report missing or ambiguous targets. Backlinks search
the selected folder and include open, unsaved notes. [Link forms and scope](READING_OUTLINE_WORKFLOW.md#backlinks-edits-and-restart).

Opening a note preserves its filename, front matter and contents. The
[published note template](https://github.com/flengyel/Zettel#self-documenting-note-specification)
is one optional format. **Open in Obsidian** uses the configured vault name or
ID, with the selected notes folder's name as a fallback. The host and Obsidian
must have access to the same file. [Obsidian configuration](OBSIDIAN_WORKFLOW.md#configure-obsidian-with-mrw).

## Implementation status

The [design register](DESIGN_RECONCILIATION.md) identifies outstanding work on
resumption, argument reconstruction and manuscript–Lean correspondence. The
[research guide](LEARNING_RESEARCH.md) describes how to evaluate the use of
these tools on an argument.

## Interface guidance and scope

Use VS Code's native views and contextual actions, with keyboard navigation
and accessible labels. Reserve a webview for content that needs its own
rendering, such as a proof diagram. Preserve the reader's pane layout.
[Microsoft's UX guidance](https://code.visualstudio.com/api/ux-guidelines/overview)
covers [views](https://code.visualstudio.com/api/ux-guidelines/views) and the
[Command Palette](https://code.visualstudio.com/api/ux-guidelines/command-palette).

The core extension and Python services run on the workspace host. Optional
companions use scoped interfaces. The bundled tutorial identifies the active
extension build and describes the commands available in that build.

## Operational feedback and maintenance

The [diagnostics companion](DIAGNOSTICS_PLUGIN.md) reads MRW's versioned
inspection interface to produce [feature-use](OPERATIONAL_USAGE.md) and
integrity reports. A reader can request a report or enable weekly reporting.
Reports state their scope and coverage. Core owns the event recorder and the
checks used to read, write and recover its stores. Repairs belong to the
application that manages the data.
