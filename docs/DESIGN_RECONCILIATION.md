# Design evaluation: decisions and remaining work

This is the current reconciliation of the MRW design evaluation, including its
interface, integration, usage and maintenance recommendations. It records
accepted requirements and remaining work; a recorded decision does not mean
its runtime implementation is complete. Status below was checked against
0.23.31 and main `82c10210e9766c504f3102b06a27c7e97b971595` on 2026-11-14.
Update this record as implementation and evidence change.

## Authority and continuity

Current user instructions govern the task. The [research design](RESEARCH_WORKSTATION_DESIGN.md),
[integration contract](INTEGRATION_BOUNDARIES.md), [UX specification](../UX_SPEC.md),
[feature-use contract](OPERATIONAL_USAGE.md) and [diagnostics design](DIAGNOSTICS_PLUGIN.md)
define the requirements below. The [maintenance workflow](CODEX_MAINTENANCE.md)
applies them to reports and proposed corrections.

Versioned audits, release accounts and old task prompts remain evidence for
their named versions. Their former priorities and task-specific stop clauses
do not cancel later authorized work. Still-applicable invariants remain binding:
preserve work and exact identities, respect subsystem ownership and explicit
execution, keep tests isolated, and distinguish source, release and installation.
When a report and the design disagree, investigate the discrepancy; do not
silently rewrite the design to match the implementation or the report.

Record current status here once. AGENTS, CODEX_PLAN and continuation documents
link here instead of accumulating another copy of the same status. Preserve
old anchors and release evidence when reducing duplicated instructions.
Intervening questions and clarifications refine the active objective unless
they explicitly cancel or replace it. Carry unresolved findings forward.

## Reconciliation register

“Pending” means required work lacks completion evidence. “Partial” identifies
existing support that does not yet meet the whole requirement. Design-only
updates cannot change either status to delivered.

| ID | Evaluation point and governing decision | Current status and completion evidence |
| --- | --- | --- |
| D01 | **Integration workbench.** Use capability-specific ports/adapters, a narrow common model and subsystem-owned creation/execution. No second editor, evaluator, kernel manager, queue, sync service or managed-database writer. [Contract](INTEGRATION_BOUNDARIES.md). | Design adopted; each adapter must demonstrate its supported route, identities and failure boundaries. Source-reader API 1 does not become a universal plugin API. |
| D02 | **Source notes and Zettels.** Independent works with many-to-many associations; human selection, formulation and linking; external editor/template owns creation. Native editing after creation remains allowed. [Notes](NOTE_COMPANIONS.md#source-notes-and-zettels). | Partial. 0.23.31 delegates template creation, but exact-copy continuation and freezing source annotations still require correction. Preserve prior transfer records, source revisions and links; demonstrate paraphrase/combination without loss or forced text equality. |
| D03 | **Identity and referential integrity.** Separate logical identity, current locator, content revision and capture. Verified moves may update current links; immutable citations keep their original target. [Contract](INTEGRATION_BOUNDARIES.md#synchronization-and-referential-integrity). | Existing protections must be preserved and adapter-specific gaps checked. Test missing, renamed, ambiguous, offline and deleted targets; never guess by title or recreate them silently. |
| D04 | **Asynchronous work and partial failure.** Distinguish dispatch, acceptance, running, completion, cancellation and uncertainty. Correlate requests/results; retry only under a verified idempotency contract. | Required for current/future adapters; a returned handler or saved output is insufficient completion evidence. Test interruption before and after acceptance, late outcomes and partial cross-system success. Do not emulate a distributed transaction or compensate by deleting external work. |
| D05 | **Concurrent editing and synchronization.** Preserve dirty buffers, revision conflicts, deletion markers and offline evidence; synchronization is not multi-writer coordination. | Keep current storage qualifications. Test concurrent edits and stale mappings without silent overwrite. Saved notebook synchronization must not imply restored kernel or queue state. |
| D06 | **Optional companions and capability discovery.** Separate source readers, lesson packs, native extensions and external services. Show installed/configured/reachable/unsupported states separately. | Partial. Supported tools need coherent discovery/setup access. Opening that access performs no installation, query, kernel start or mutation; absent companions leave unrelated work usable. |
| D07 | **Command grouping and context.** Group reading/notes, sources/references, calculation, proofs, tools/setup and earlier saved work; bind actions to the selected document. [UX requirements](../UX_SPEC.md#evaluation-follow-up--interface-and-continuity). | Pending beyond individual controls. Verify native menus, keyboard access, themes, missing companions and applicable document types. Avoid duplicated command walls, competing panes and redundant previews. |
| D08 | **Lean lesson controls.** Resolve a selected lesson Markdown file or its associated code, not an unrelated saved lesson. Preserve native Lean behavior. | Pending. Demonstrate lesson → code → notes → Return with two lessons and an unrelated Lean file. Normal Lean diagnostics on opening are owner behavior, not an MRW-issued rerun. |
| D09 | **Optional study.** Ordinary reading must not offer unsolicited study-registration prompts. Keep deliberate study, saved work, history, review and lifecycle access separate. | Pending interface review. Remove study-creation prompts from ordinary reading controls; do not remove saved studies, Proof Outline or Lean study. No replacement Research Question/Fleeting Note registration. |
| D10 | **AI destination and review.** Label the API route versus Codex/another companion where the action is chosen; show exact context and proposed changes. Human review retains control. | Partial. API preview/Send and manual companion handoff exist; ambiguous labels/context access remain to repair. Selecting a plugin or reading a note must not transmit it. No additional chat frontend is required. |
| D11 | **Note → source → Return.** Make explicit source/note/proof relationships navigable without moving all material into one repository or imposing one note format. | Partial; complete the native round trip with dirty buffers, exact retained revisions, supported positions and broken-link recovery. Works without Obsidian; importing into a Zettelkasten still uses its editor. |
| D12 | **Retained calculation → comparison → export.** Keep rich outputs and links to input/method revisions, relevant notes and proof work. Reuse native notebook views and evaluate notebook-aware comparison first. [Notebook requirements](NOTEBOOK_RESULTS.md#required-display-and-comparison-follow-up). | Partial. Capture/export and text comparison exist; rich display/comparison and main-control access remain pending. Demonstrate two differing results, output/error differences and provenance export without execution. |
| D13 | **Zotero → attachment → Return.** Expose the delivered reference/attachment workflow in the same coherent interface. | Partial. Local API integration exists; complete the round trip and connection-status presentation. Test a missing attachment and changed metadata while retained citations remain stable. |
| D14 | **Research resumption and reconstruction.** Recover existing documents, supported locations, conclusions, gaps, attempts and next work through links/prose, without duplicated forms. | Partial. Basic Return/Reopen exists; wider continuity and compressed-argument reconstruction remain pending. Demonstrate a stopped/resumed investigation, including an unsuccessful approach; never claim live kernel restoration. |
| D15 | **Evidence and provenance.** Distinguish retained source, producer account, observed run, independent reproduction, formal check, premise admission and informal correspondence. Keep alternatives and failed approaches. | Bounded notebook provenance exists; general integrations remain proposed. W3C PROV is vocabulary, not a proof checker or mandatory workflow canvas. A checked Lean statement does not establish an unstated informal correspondence. |
| D16 | **Feature use over time.** Keep lightweight core recording; report used, available-but-unused, unavailable, uninstrumented and unknown periods. [Measurement contract](OPERATIONAL_USAGE.md). | Partial. Repair coverage, relocation counts and aggregation; exclude test/automated activity. Direct reports belong to the optional diagnostics plugin. Use findings in maintenance, not automatic feature retirement. |
| D17 | **Periodic integrity and hygiene.** Optional diagnostics plugin; core retains essential checks. Bounded, read-only, configurable reporting with explicit incomplete/unknown findings. [Plugin design](DIAGNOSTICS_PLUGIN.md). | Proposed. No reporting plugin/schedule is delivered. Test interrupted scans, concurrent changes, offline replicas and resource limits. Old/unvisited/unlinked research is not garbage. |
| D18 | **Reports → Codex maintenance → design comparison.** Compare every proposed change with the current design, revalidate findings, make bounded corrections and verify outcomes. [Maintenance contract](CODEX_MAINTENANCE.md). | Required workflow now documented; automated handoff/maintenance scheduling remains unimplemented. Reporting cadence and maintenance cadence are separate. |
| D19 | **Instruction consistency.** One current decision/status register and maintenance workflow, linked from entry documents; versioned evidence remains accessible. | Current authority is consolidated here. Long historical sections remain for compatibility and invariants; further extraction must preserve anchors and map every surviving rule before deletion. Do not duplicate new status across four files. |
| D20 | **Resource budgets and realistic validation.** Bounded history/scan reads, streaming hashes, cancellable work and measured memory/I/O limits. Test adapters at their real boundary. | Required for new reporting and relevant repairs. Current whole-history aggregation is a known gap, not a proven cause of prior exhaustion. Tests must use isolated vaults/kernels/queues and must not control live authoring prompts. |
| D21 | **Selective contract formalization.** Small executable Lean models for identity-preserving relocation, delegation/outcomes and report classification, tied explicitly to runtime behavior. [Scope](CONTRACT_FORMALIZATION.md). | Proposed. Begin with core/Std and the existing pinned toolchain; no new contract proof or implementation refinement is claimed. Models must not block UI repairs or assume the property they claim to prove. |
| D22 | **Existing-note citation rendering.** Read Obsidian/Pandoc citation syntax using a selected existing processor and scoped bibliography, preserving note bytes and source positions. [Zotero viewer gap](ZOTERO_WORKFLOW.md#citation-rendering-in-existing-notes). | Pending. User reports Obsidian/Pandoc references do not resolve in the viewer; current code has no citeproc support. Formatted Markdown insertion is a different supported route. Verify the configured syntax/bibliography and actual viewer; no live-vault rewriting or automatic Zotero queries. |

## Reuse decisions and exclusions

The [related-systems review](RESEARCH_WORKSTATION_DESIGN.md#related-systems-and-reuse)
supplies the sources. These are adopted directions, not promises to install
each system or implement every feature:

| Source of the lesson | Adopt or investigate | Boundary |
| --- | --- | --- |
| Proofscape | Explicit links among sources, notes and arguments; expansion and return. | No compulsory proof chart, hidden navigation rules or new universal graph. |
| CoCalc and Jupyter AI | Contextual assistance beside ongoing work; visible context and reviewable changes. | Reuse existing companions; no new hosted platform or chat frontend, automatic execution or silent edits. |
| Native notebook tools and nbdime | Cell/output-aware comparison and rich retained-result viewing. | Evaluate compatibility before adoption; no bespoke diff engine or automatic merge/replay. A comparison must not execute cells. |
| Org/Babel | Keep explanation, code, results and references close enough to follow. | Proximity through existing documents/links, not required Org conversion, another evaluator or duplicated prose. |
| VisTrails | Preserve alternative investigations, method/input revisions and failed approaches. | Reuse provenance ideas and W3C PROV; do not adopt a runtime or mandatory visual pipeline. |
| Eigenius and existing evidence tools | Keep grounds, derivation and independently checked conclusions distinct. | No inference from an audit trail to reliability, or from formal checking to every informal claim. Formal evidence is optional where the task does not require it. |
| Zotero, TeXmacs, MathHub/ALeA and native VS Code tools | Reuse reference management, mathematical presentation and source navigation where they remove a demonstrated obstacle. | No replacement editor, mandatory source schema, cognitive model or claim of uniqueness. |

## Order of work

Confirmed data-loss/invariant violations and resource failures come first.
Then repair coherent existing workflows (D02 and D06–D13), close observation
gaps and implement bounded diagnostics. Wider integrations follow demonstrated
mathematical needs, not a feature-count target. These workstreams do not cancel
one another: a narrower repair or follow-up question must preserve the remaining
accepted items and their evidence requirements.

No runtime correction, native acceptance, plugin installation or release is
claimed by this reconciliation. The release remains 0.23.31 until a separately
verified runtime delivery. Publication never implies installation or a forced
reload of the working window.
