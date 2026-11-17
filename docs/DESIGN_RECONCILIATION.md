# Design decisions and implementation status

The decisions below govern current work. “Partial” means the implementation
covers only part of a requirement. Proposed work is not a delivered capability.

## Authority and continuity

User instructions govern the task. The [research design](RESEARCH_WORKSTATION_DESIGN.md),
[integration contract](INTEGRATION_BOUNDARIES.md), [UX specification](../UX_SPEC.md),
[feature-use contract](OPERATIONAL_USAGE.md) and [diagnostics design](DIAGNOSTICS_PLUGIN.md)
define subsystem requirements. Apply the [maintenance workflow](CODEX_MAINTENANCE.md)
when evaluating a proposed correction. Investigate discrepancies between design
and implementation rather than changing one merely to match a report.

Keep current status here. Preserve work, exact identities, subsystem ownership,
explicit execution and isolated testing. Source, release and installation are
separate states; publication does not authorize installation or forced reload.

<a id="reconciliation-register"></a>

## Decisions

| ID | Decision | Current capability and remaining work |
| --- | --- | --- |
| D01 | **Integration workbench.** Use capability-specific ports/adapters and a narrow common model. External systems own creation and execution. [Integration contract](INTEGRATION_BOUNDARIES.md). | Source-reader API 1 is not a universal plugin API. The [CoCalc adapter](COCALC_ADAPTER.md) is proposed. Do not duplicate editors, evaluators, kernels, queues, synchronization services or managed-database writers. |
| D02 | **Source notes and linked notes.** Keep independent works, many-to-many associations and externally owned creation/templates. [Notes](NOTE_COMPANIONS.md#source-notes-and-zettels). | Source annotations and destination notes remain independently editable. Associations preserve earlier records and linking snapshots. Creation delegates to the configured application; native editing afterward remains available. |
| D03 | **Identity and referential integrity.** Distinguish logical identity, current location, revision and capture. [Contract](INTEGRATION_BOUNDARIES.md#synchronization-and-referential-integrity). | Supported moves preserve immutable citations and verified mappings. Adapter-specific checks must cover missing, renamed, ambiguous, offline and deleted targets. Never guess a replacement by title. |
| D04 | **Asynchronous work.** Distinguish dispatch, acceptance, execution, completion, cancellation and uncertainty. | Correlate requests and outcomes. Retry only with a verified idempotency contract. A returned handler or saved output alone does not establish completion. Interruption and partial cross-system success require adapter-specific checks; never compensate by deleting external work. |
| D05 | **Editing and synchronization.** Preserve dirty buffers, revision conflicts, deletion markers and offline records. | Current storage qualifications remain binding. Synchronization does not coordinate concurrent writers or restore a kernel or queue. Check stale mappings and conflicting edits without silent overwrite. |
| D06 | **Optional companions.** Distinguish source readers, lesson packs, native extensions and external services. | Grouped setup shows installed, configured and unchecked states. Opening setup does not probe services or install software. Reachability is checked by the relevant action. |
| D07 | **Command context.** Group actions by task and bind them to the selected document. [UX](../UX_SPEC.md#evaluation-follow-up--interface-and-continuity). | Six task groups use native pickers and menus. [Reader notes](READER_NOTE_WRITING.md) support focused text entry, Save/Cancel and optional attribution while retaining metadata and mathematical markup. Broader keyboard/theme observations remain incomplete. |
| D08 | **Lean lessons.** Resolve the selected lesson or associated code and preserve native Lean behavior. [Workflow](LEAN_STUDY_WORKFLOW.md). | Lesson actions use the selected resource; opening performs no MRW-issued check. Guides explain native toolbar controls. Full lesson/code/notes/Return interaction remains unobserved. |
| D09 | **Optional study.** Ordinary reading creates no study record and opens no registration form. [Study workflow](ACTIVE_STUDY_WORKFLOW.md). | Deliberate study, history, review, lifecycle commands, Proof Outlines and Lean study remain independently available. |
| D10 | **AI destination and review.** Identify API requests and companion handoffs where chosen. [AI workflow](READER_AI_WORKFLOW.md). | API requests require exact preview and separate Send. General Ask records an exact passage target and a general question; it does not classify the question as a result explanation. Codex clipboard actions copy selected context and references without sending. Companion behavior after paste remains outside MRW's observed boundary. |
| D11 | **Note, source and Return.** Navigate linked work without imposing one repository or note format. | Contents, preview and exact Return preserve dirty buffers and retained references. Scripted note/source/Return and restart checks have exercised the native route. Obsidian creation and broader unscripted companion interaction remain separate checks. [Navigation](READING_OUTLINE_WORKFLOW.md). |
| D12 | **Retained calculations.** Keep rich outputs, input/method revisions, notes and proof links available through comparison and export. [Notebook workflow](NOTEBOOK_RESULTS.md). | Native read-only notebook viewing and diff use Jupyter; transcripts remain the fallback. Capture, comparison and export have focused tests. Native visual inspection of rich outputs remains unobserved. |
| D13 | **Zotero references.** Connect references, attachments and Return through the supported owner API. [Workflow](ZOTERO_WORKFLOW.md). | Sources exposes Find/Resume Zotero and setup. Connector/attachment/Return regressions cover the supported route. A live attachment interaction remains unobserved; no mutation of Zotero is authorized. |
| D14 | **Research resumption.** Recover documents, supported locations, conclusions, gaps and attempts through existing links and prose. | Partial. Return, Reopen, [Recent Documents](RECENT_DOCUMENTS.md) and saved-calculation links survive supported restarts. Stale cursor positions do not prevent opening current text. Wider continuity and reconstruction of compressed arguments remain open. No live kernel restoration is provided. |
| D15 | **Evidence and justification.** Separate source capture, producer accounts, observed execution, reproduction, formal checking, scoped admission, contextual derivability, correspondence and human judgment. [Guide](JUSTIFICATION_WORKFLOW.md). | Partial. The Lean J₀/J(CS) checker and bounded Application search retain certificates, exact admission dependencies and successor contexts. The reader preserves source snapshots, withdrawal, earlier contexts, Return and unfinished requests. [Source-driven preparation](SOURCE_GROUNDS_WORKFLOW.md) supports attributed proposals, corrections and explicit admission. Capture/import/correction invoke neither admission nor Lean. Reopening performs no new check. Derivability is non-factive and relative to the admitted context. General Hilbert/CS search and paper–Lean correspondence review remain open. |
| D16 | **Feature use.** Record used, available-but-unused, unavailable, uninstrumented and unknown periods. [Contract](OPERATIONAL_USAGE.md). | Bounded local aggregation uses stable feature IDs and correlated operations. Test/development/scheduled origins are excluded. [History](HISTORY_ACTIVITY_VIEW.md) preserves detailed exports and gap notices. Missing coverage is not zero use; shared aggregation remains partial. |
| D17 | **Integrity and hygiene.** Optional diagnostics supplies bounded, read-only reports; core retains essential checks. [Design](DIAGNOSTICS_PLUGIN.md). | Inspection API 1 supports streamed hashes/metadata/manifests, pending/deletion observations, manual reports and opt-in weekly scheduling. External/remote targets, complete schemas/dependencies and passage anchors remain unchecked. |
| D18 | **Maintenance.** Revalidate report findings against the design before making bounded corrections. [Contract](CODEX_MAINTENANCE.md). | Explicit export and Codex clipboard handoff retain reports as untrusted input. A report authorizes neither a model call nor a repair. Automatic maintenance scheduling is not implemented. |
| D19 | **Instruction consistency.** Maintain one current decision/status register linked from development instructions. | Keep documentation aligned with current behavior. Remove superseded instructions instead of appending repair narratives. Put routine development notes and check output in commits, pull requests or issues. |
| D20 | **Resource limits and verification.** Bound reads, memory, I/O and work duration; stream hashes and support cancellation. | Inspectors and history readers enforce budgets. Saved-source Trash uses reversible deletion and restart recovery. [Native tests](NATIVE_TEST_ISOLATION.md) require owned fixtures, dedicated stores, safe buffers and matching workspace identity. Resource observations do not establish a general performance bound. |
| D21 | **Contract formalization.** Keep small Lean safety models separate from `MRW.Justification` and relate them explicitly to runtime behavior. [Scope](CONTRACT_FORMALIZATION.md). | `MRW.Contracts` has an executable relocation model and safety proofs in a separate build profile. These do not verify the Python/JavaScript implementation. Implementation refinement, liveness, delegation and report-classification models remain open. |
| D22 | **Citation rendering.** Use an existing citation processor and scoped bibliography or owner metadata without changing note bytes. [Workflow](ZOTERO_WORKFLOW.md#citation-rendering-in-existing-notes). | Bracketed citations render through Pandoc/CSL. Better BibTeX lookup respects selected libraries and explicit bibliography precedence; notices identify the source used. Live database filenames are unavailable through the API. Narrative `@key`, remote/dependent styles and exact companion-style matching remain unsupported. |

<a id="current-implementation-order--15-november-2026"></a>
<a id="current-implementation-order--16-november-2026"></a>

## Current implementation order

Prioritize mathematical work over engine expansion. Address confirmed data-loss
or resource failures first, then concrete obstacles in reading, calculations,
proof work and resumption. Preserve pending work when addressing a narrower
repair. Wider integrations require a demonstrated mathematical need.

Bounded search, withdrawal, retained routes, unfinished-context resumption and
source-driven proposal review are implemented. Do not repeat them as new tasks.
Saving and reopening admit no premise and execute no Lean check; search and
retry remain explicit. Search runs in Lean, Python validates and retains records,
and the extension presents the interaction.

The next mathematical-use test follows one argument across sessions. Select a
passage from a paper or its Lean development, identify the grounds for one step,
attempt it, compare the attempt with the source, and keep a question for spaced
review. On return, reconstruct the step and try a changed hypothesis or example.
The [learning research and evaluation](LEARNING_RESEARCH.md#evaluating-mrw-on-a-manuscript)
specifies what would count as a benefit. Assess research continuity separately
by resuming an unfinished argument with its sources and open question intact.

[Euclid's lemma](JUSTIFICATION_EUCLID_EXAMPLE.md) illustrates justification.
Rich-output inspection and companion tests remain open. Extend an adapter or
the justification engine when a mathematical task calls for it.

**Deferred: paper–Lean correspondence review.** The selected case is
[`flengyel/Dosen-Petric-Maximality`](https://github.com/flengyel/Dosen-Petric-Maximality).
Resolve the current manuscript and Lean revisions together. Compare definitions,
types, hypotheses, quantifiers, conclusions and dependencies; preserve exact
passages and reviewed correspondence records. A Lean check alone does not
establish correspondence. The source-selection prototype remains outside main
and the release.

## Reuse and boundaries

Consult [related systems](RESEARCH_WORKSTATION_DESIGN.md#related-systems-and-reuse)
before duplicating their capabilities. Reuse supported editors, reference
managers, notebook views and execution services. Contextual help, linked sources,
expandable arguments and retained alternatives must work with ordinary documents;
no required conversion, universal graph or visual pipeline is introduced.

Keep provenance distinct from mathematical support. Neither an audit trail nor
a formal check warrants every informal claim. Reading and capture authorize no
reactive execution or agent access. Do not infer uniqueness, reliability or
learning benefit from the presence of integrations.
