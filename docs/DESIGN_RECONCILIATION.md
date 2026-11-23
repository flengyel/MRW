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
| D02 | **Source notes and linked notes.** Keep independent works, many-to-many associations and externally owned creation/templates. [Notes](NOTE_COMPANIONS.md#develop-and-link-notes). | Source annotations and destination notes remain independently editable. Associations preserve earlier records and linking snapshots. Creation delegates to the configured application; native editing afterward remains available. |
| D03 | **Identity and referential integrity.** Distinguish logical identity, current location, revision and capture. [Contract](INTEGRATION_BOUNDARIES.md#synchronization-and-referential-integrity). | Supported moves preserve immutable citations and verified mappings. Adapter-specific checks must cover missing, renamed, ambiguous, offline and deleted targets. Never guess a replacement by title. |
| D04 | **Asynchronous work.** Distinguish dispatch, acceptance, execution, completion, cancellation and uncertainty. | Correlate requests and outcomes. Retry only with a verified idempotency contract. A returned handler or saved output alone does not establish completion. Interruption and partial cross-system success require adapter-specific checks; never compensate by deleting external work. |
| D05 | **Editing and synchronization.** Preserve dirty buffers, revision conflicts, deletion markers and offline records. | Current storage qualifications remain binding. Synchronization does not coordinate concurrent writers or restore a kernel or queue. Check stale mappings and conflicting edits without silent overwrite. |
| D06 | **Optional companions.** Distinguish source readers, lesson packs, native extensions and external services. | Grouped setup shows installed, configured and unchecked states. Opening setup does not probe services or install software. Reachability is checked by the relevant action. |
| D07 | **Command context.** Group actions by task and bind them to the selected document. [UX](../UX_SPEC.md#evaluation-follow-up--interface-and-continuity). | The sidebar keeps its three reading entry points. The editor menu shows Return for a recorded origin and companion actions for eligible notes. Setup opens smaller task menus. Proof display changes restore control focus. [Reader notes](READER_NOTE_WRITING.md) opens a focused composer and keeps assistance at the passage. Broader first-use and theme observations remain open. |
| D08 | **Lean lessons.** Resolve the selected lesson, associated code and working note. [Workflow](LEAN_STUDY_WORKFLOW.md). | Native WSL checks covered the working note, exact Return and restoration of the saved note and code selection after reload. Opening performs no MRW-issued check. The pinned lessons build with Lean. Live InfoView in this route still awaits an isolated companion check. |
| D09 | **Optional study.** Ordinary reading creates no study record and opens no registration form. [Study workflow](ACTIVE_STUDY_WORKFLOW.md). | Source study, history, review, lifecycle commands, Proof Outlines and Lean study remain independently available. |
| D10 | **AI destination and review.** Identify API requests and companion handoffs where chosen. [AI workflow](READER_AI_WORKFLOW.md). | API requests require exact preview and separate Send. General Ask records an exact passage target and a general question; it does not classify the question as a result explanation. Codex clipboard actions copy selected context and references without sending. Companion behavior after paste remains outside MRW's observed boundary. |
| D11 | **Note, source and Return.** Navigate linked work without imposing one repository or note format. | Contents, preview and exact Return preserve dirty buffers and retained references. Inserted captions give the source and passage. The destination keeps the exact citation. Scripted note/source/Return and restart checks have exercised the native route. Bundled notes and examples share a picker. The operads preview opens reader notes on an exact saved copy on request. [Emacs capture](NOTE_COMPANIONS.md#capture-a-passage-in-emacs) delegates the saved passage to Denote or Org-roam. Obsidian creation and desktop link handling from Emacs remain separate checks. [Navigation](READING_OUTLINE_WORKFLOW.md). |
| D12 | **Retained calculations.** Keep rich outputs, input/method revisions, notes and proof links available through comparison and export. [Notebook workflow](NOTEBOOK_RESULTS.md). | Native read-only notebook viewing and diff use Jupyter. Transcripts are the fallback. An isolated WSL check reopened exact retained notebooks after restart and displayed both saved PNG outputs in the native diff. Capture, comparison and export have focused tests. |
| D13 | **Zotero references.** Connect references, attachments and Return through the supported owner API. [Workflow](ZOTERO_WORKFLOW.md). | Sources exposes Find/Resume Zotero and setup. Connector/attachment/Return regressions cover the supported route. A live attachment interaction remains unobserved; no mutation of Zotero is authorized. |
| D14 | **Research resumption.** Recover documents, supported locations, conclusions, gaps and attempts through existing links and prose. | Partial. Return, Reopen and saved-calculation links survive supported restarts. [Recent Documents](RECENT_DOCUMENTS.md) shows a short excerpt for matching Markdown positions and can restore a selection in an earlier note. A changed revision opens the current note with a status message. Resume Study finds unfinished attempts and saved unresolved questions beyond the recent list. Wider continuity and reconstruction of compressed arguments remain open. |
| D15 | **Evidence and justification.** Separate source capture, producer accounts, observed execution, reproduction, formal checking, scoped admission, contextual derivability, correspondence and human judgment. [Guide](JUSTIFICATION_WORKFLOW.md). | Partial. The Lean J₀/J(CS) checker and bounded Application search retain certificates, exact admission dependencies and successor contexts. The reader preserves source snapshots, withdrawal, earlier contexts, Return and unfinished requests. [Source-driven preparation](SOURCE_GROUNDS_WORKFLOW.md) supports attributed proposals, corrections and explicit admission. Capture/import/correction invoke neither admission nor Lean. Reopening performs no new check. Derivability is non-factive and relative to the admitted context. General Hilbert/CS search and paper–Lean correspondence review remain open. |
| D16 | **Feature use.** Record used, available-but-unused, unavailable, uninstrumented and unknown periods. [Contract](OPERATIONAL_USAGE.md). | Bounded local aggregation uses stable feature IDs and correlated operations. Test/development/scheduled origins are excluded. [History](HISTORY_ACTIVITY_VIEW.md) preserves detailed exports and gap notices. Missing coverage is not zero use; shared aggregation remains partial. |
| D17 | **Integrity and hygiene.** Optional diagnostics supplies bounded, read-only reports; core retains essential checks. [Design](DIAGNOSTICS_PLUGIN.md). | Inspection API 1 supports streamed hashes/metadata/manifests, pending/deletion observations, manual reports and opt-in weekly scheduling. External/remote targets, complete schemas/dependencies and passage anchors remain unchecked. |
| D18 | **Maintenance.** Revalidate report findings against the design before making bounded corrections. [Contract](CODEX_MAINTENANCE.md). | Explicit export and Codex clipboard handoff retain reports as untrusted input. A report authorizes neither a model call nor a repair. Automatic maintenance scheduling is not implemented. |
| D19 | **Instruction consistency.** Maintain one current decision/status register linked from development instructions. | Keep documentation aligned with current behavior. Remove superseded instructions instead of appending repair narratives. Put routine development notes and check output in commits, pull requests or issues. |
| D20 | **Resource limits and verification.** Bound reads, memory, I/O and work duration; stream hashes and support cancellation. | Inspectors and history readers enforce budgets. Saved-source Trash uses reversible deletion and restart recovery. [Native tests](NATIVE_TEST_ISOLATION.md) require owned fixtures, dedicated stores, safe buffers and matching workspace identity. Resource observations do not establish a general performance bound. |
| D21 | **Contract formalization.** Keep small Lean safety models separate from `MRW.Justification` and relate them explicitly to runtime behavior. [Scope](CONTRACT_FORMALIZATION.md). | `MRW.Contracts` has an executable relocation model and safety proofs in a separate build profile. These do not verify the Python/JavaScript implementation. Implementation refinement, liveness, delegation and report-classification models remain open. |
| D22 | **Citation rendering.** Use an existing citation processor and scoped bibliography or owner metadata without changing note bytes. [Workflow](ZOTERO_WORKFLOW.md#citation-rendering-in-existing-notes). | Bracketed citations render through Pandoc/CSL. Better BibTeX lookup respects selected libraries and explicit bibliography precedence; notices identify the source used. Live database filenames are unavailable through the API. Narrative `@key`, remote/dependent styles and exact companion-style matching remain unsupported. |
| D23 | **Mathematical atlases.** Generate a revisable outline from selected text or a Lean proof. Link each component to its inputs, result and exact source. [Generation and acceptance examples](PROOF_OUTLINES.md#generating-a-mathematical-atlas). | Partial. The text workflow extracts anchored Markdown and LaTeX, shows explicit and unresolved references, reviews cited proposals, retains reader corrections and reopens captured revisions offline. Local Lean files can be read as text. Elaborated type and proof-value dependencies, internal Lean proof steps and inference across components remain open. [Reader workflow](PROOF_STUDY_WORKFLOW.md#start-an-atlas-from-a-passage). |

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

The next test begins with an open mathematical question. For instance, can a
result from the literature be applied at a doubtful step in an argument?
Identify the hypotheses available there. Consult the paper, a Lean declaration
or a calculation as the question requires. State what follows and on what
grounds, or identify the missing hypothesis, counterexample or remaining gap.
On return, determine whether the working note and its links recover the grounds
for the last justified step and the question still open.

When a reader chooses to revisit a proof step, assess later reconstruction
and use on a changed example through the separate
[study evaluation](LEARNING_RESEARCH.md#evaluating-mrw-on-a-manuscript).

[Euclid's lemma](JUSTIFICATION_EUCLID_EXAMPLE.md) illustrates justification.
Companion tests remain open. Extend an adapter or the justification engine
when a mathematical task calls for it.

**Deferred: paper–Lean correspondence review.** The selected case is
[*Maximality of the Došen–Petrić Boolean Category*](https://arxiv.org/abs/2611.19496).
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
