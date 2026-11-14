# Design evaluation: decisions and remaining work

This is the current reconciliation of the MRW design evaluation, including its
interface, integration, usage and maintenance recommendations. It records
accepted requirements and remaining work; a recorded decision does not mean
its runtime implementation is complete. The implementation batch below starts from main
`ba2db577b1ab8bf512daf63300e2eedf4232d907` and is checked on 2026-11-14.
Its package and installation evidence is recorded in the
[0.23.32 delivery report](RELEASE_0_23_32.md).
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
| D01 | **Integration workbench.** Use capability-specific ports/adapters, a narrow common model and subsystem-owned creation/execution. No second editor, evaluator, kernel manager, queue, sync service or managed-database writer. [Contract](INTEGRATION_BOUNDARIES.md). | Design adopted; each adapter must demonstrate its supported route, identities and failure boundaries. Source-reader API 1 does not become a universal plugin API. The [CoCalc proposal](COCALC_ADAPTER.md) defines remote project/file handoff and exported-result capture; its adapter remains unimplemented. |
| D02 | **Source notes and Zettels.** Independent works with many-to-many associations; human selection, formulation and linking; external editor/template owns creation. Native editing after creation remains allowed. [Notes](NOTE_COMPANIONS.md#source-notes-and-zettels). | Implemented association repair: independent destination text, editable source annotations and many-to-many links preserve earlier records and linking snapshots. Focused Python/controller checks pass; creation still delegates to the configured template. See [batch evidence](MAINTENANCE_20261114.md). |
| D03 | **Identity and referential integrity.** Separate logical identity, current locator, content revision and capture. Verified moves may update current links; immutable citations keep their original target. [Contract](INTEGRATION_BOUNDARIES.md#synchronization-and-referential-integrity). | Existing protections must be preserved and adapter-specific gaps checked. Test missing, renamed, ambiguous, offline and deleted targets; never guess by title or recreate them silently. |
| D04 | **Asynchronous work and partial failure.** Distinguish dispatch, acceptance, running, completion, cancellation and uncertainty. Correlate requests/results; retry only under a verified idempotency contract. | Required for current/future adapters; a returned handler or saved output is insufficient completion evidence. Test interruption before and after acceptance, late outcomes and partial cross-system success. Do not emulate a distributed transaction or compensate by deleting external work. |
| D05 | **Concurrent editing and synchronization.** Preserve dirty buffers, revision conflicts, deletion markers and offline evidence; synchronization is not multi-writer coordination. | Keep current storage qualifications. Test concurrent edits and stale mappings without silent overwrite. Saved notebook synchronization must not imply restored kernel or queue state. |
| D06 | **Optional companions and capability discovery.** Separate source readers, lesson packs, native extensions and external services. Show installed/configured/reachable/unsupported states separately. | Implemented grouped setup access with installed/configured/unchecked states; opening setup performs no service probe or install. Component checks and native core/optional-companion activation pass. Reachability remains action-specific. |
| D07 | **Command grouping and context.** Group reading/notes, sources/references, calculation, proofs, tools/setup and earlier saved work; bind actions to the selected document. [UX requirements](../UX_SPEC.md#evaluation-follow-up--interface-and-continuity). | Implemented six purpose groups with native picker/menu access instead of the command wall. Core contributed commands register in native WSL host. Keyboard/theme layout observations beyond native control behavior remain unobserved. Plain reader-note entry is implemented: **Add a note**, focused text, Save/Cancel and optional attribution/help, preserving existing metadata and LaTeX/TikZ; [focused and native normal/narrow evidence](READER_NOTE_WRITING.md). |
| D08 | **Lean lesson controls.** Resolve a selected lesson Markdown file or its associated code, not an unrelated saved lesson. Preserve native Lean behavior. | Implemented selected-resource lesson actions; two lessons, shared code choice and unrelated Lean rejection covered by focused tests. No MRW-issued checking on open. Full native lesson/code/notes/Return acceptance remains unobserved. |
| D09 | **Optional study.** Ordinary reading must not offer unsolicited study-registration prompts. Keep deliberate study, saved work, history, review and lifecycle access separate. | Removed study/proof-study creation controls from the ordinary source toolbar and ordinary document menus. Deliberate study, history/lifecycle, Proof Outline and Lean study remain. Component regressions retain their routes. |
| D10 | **AI destination and review.** Label the API route versus Codex/another companion where the action is chosen; show exact context and proposed changes. Human review retains control. | API destination is named on reader actions and commands; Copy passage for Codex copies exact retained context/reference without sending. Preview/Send remains separate. Companion application behavior after paste is unobserved. |
| D11 | **Note → source → Return.** Make explicit source/note/proof relationships navigable without moving all material into one repository or imposing one note format. | Existing native Contents/preview and dirty-buffer preservation pass in an isolated host. Retained source/Return component and relocation-trace checks preserve exact references. Current saved-source access was also repaired: both retained Hausdorff and Kerodon sources opened in the existing installed window; prior annotations and source bytes remain unchanged ([recovery evidence](SAVED_SOURCE_RECOVERY_20261114.md)). Full interactive note/source/Return acceptance remains partial. |
| D12 | **Retained calculation → comparison → export.** Keep rich outputs and links to input/method revisions, relevant notes and proof work. Reuse native notebook views and evaluate notebook-aware comparison first. [Notebook requirements](NOTEBOOK_RESULTS.md#required-display-and-comparison-follow-up). | Implemented native read-only retained notebook viewing and notebook diff when Jupyter is installed; transcript fallback remains. nbdime evaluated. Focused capture/comparison/export tests pass; rich-output native visual acceptance remains unobserved. |
| D13 | **Zotero → attachment → Return.** Expose the delivered reference/attachment workflow in the same coherent interface. | Grouped Sources exposes Find/Resume Zotero and setup explains readiness. Existing isolated connector/attachment/Return regressions remain required. No live Zotero attachment mutation trial or claim of native acceptance in this batch. |
| D14 | **Research resumption and reconstruction.** Recover existing documents, supported locations, conclusions, gaps, attempts and next work through links/prose, without duplicated forms. | Partial. Basic Return/Reopen exists; wider continuity and compressed-argument reconstruction remain pending. Demonstrate a stopped/resumed investigation, including an unsuccessful approach; never claim live kernel restoration. |
| D15 | **Evidence, provenance and justification.** Distinguish retained source, producer account, observed run, independent reproduction, formal check, scoped premise admission, checked contextual derivation, informal correspondence and human judgment. Keep alternative grounds and failed approaches. The [justification engine](JUSTIFICATION_WORKFLOW.md) makes supporting grounds, admitted assumptions and checked inference steps inspectable; it is integral to MRW. | Partial. Bounded notebook provenance and the Lean J₀/J(CS) checker with Appendix A and offline documentary-response cases exist. General inference search and the complete interactive workflow remain pending. W3C PROV records provenance; checked derivability is relative to explicit admissions and a context. A checked Lean statement does not establish an unstated informal correspondence. |
| D16 | **Feature use over time.** Keep lightweight core recording; report used, available-but-unused, unavailable, uninstrumented and unknown periods. [Measurement contract](OPERATIONAL_USAGE.md). | Implemented bounded local-period aggregation, stable command/direct-action IDs, correlated children, trust/configuration coverage refresh and relocation invocation capture; test/development/scheduled origins excluded. Missing outcomes and unobserved/shared intervals remain explicit. Continuous availability/adoption is not inferred; broader shared aggregation remains partial. Reader-facing Study History still repeats startup inventories and empty study summaries; presentation cleanup remains pending. |
| D17 | **Periodic integrity and hygiene.** Optional diagnostics plugin; core retains essential checks. Bounded, read-only, configurable reporting with explicit incomplete/unknown findings. [Plugin design](DIAGNOSTICS_PLUGIN.md). | Initial optional diagnostics companion implemented with inspection API 1, bounded streamed hashes/metadata/manifests, pending/deletion observations, manual reports and opt-in weekly/coalesced scheduling. Isolated inspection/scheduling tests and native activation pass. External/remote targets, full schemas/dependencies and passage-anchor checks remain explicitly unchecked. |
| D18 | **Reports → Codex maintenance → design comparison.** Compare every proposed change with the current design, revalidate findings, make bounded corrections and verify outcomes. [Maintenance contract](CODEX_MAINTENANCE.md). | Implemented explicit report/export/Codex clipboard handoff with evidence marked untrusted; no model call or repair authorization. Weekly report cadence is separate from manual maintenance. Automatic maintenance scheduling remains pending. |
| D19 | **Instruction consistency.** One current decision/status register and maintenance workflow, linked from entry documents; versioned evidence remains accessible. | Current authority is consolidated here. Long historical sections remain for compatibility and invariants; further extraction must preserve anchors and map every surviving rule before deletion. Do not duplicate new status across four files. |
| D20 | **Resource budgets and realistic validation.** Bounded history/scan reads, streaming hashes, cancellable work and measured memory/I/O limits. Test adapters at their real boundary. | New inspectors enforce file/byte/time/finding budgets, streaming hashes, cancellation and bounded local history reads; fixtures test partial/offline/change states. Peak resources and actual logs belong in batch evidence; this does not diagnose the earlier memory exhaustion. The two confirmed test/demo sources and three workspace test files were removed from the active workspace with a verified external backup, interrupted-publication rehearsal and fresh-manager retained-link checks ([cleanup account](SOURCE_CLEANUP_20261114.md)). Saved-source Delete/Restore controls and guarding older host tests against working stores remain pending. |
| D21 | **Selective contract formalization.** Small executable Lean models for identity-preserving relocation, delegation/outcomes and report classification, tied explicitly to runtime behavior. Keep `MRW.Contracts` separate from the integral `MRW.Justification` subsystem. [Scope](CONTRACT_FORMALIZATION.md). | First pilot delivered: independent core/Std MRW.Contracts relocation model, executable transitions, init/preservation/reachability proofs, success/rejection/fault vectors and three concrete trace comparisons. Pinned Lean 4.32.2 checks pass without new axioms or admitted proofs. [Mapping](CONTRACT_PILOT.md). Implementation refinement, liveness and subsequent operation/report models remain open. |
| D22 | **Existing-note citation rendering.** Read Obsidian/Pandoc citation syntax using a selected existing processor and scoped bibliography or owner-supplied metadata, preserving note bytes and source positions. [Workflow](ZOTERO_WORKFLOW.md#citation-rendering-in-existing-notes). | Implemented bracketed citation rendering via Pandoc/CSL in native preview and reader annotations. Live Better BibTeX exact-key lookup respects selected libraries and explicit local bibliography precedence; WSL discovers host-PATH pandoc.exe. The unchanged Number Fields note visibly resolves to (Marcus 2018) in native WSL preview. Missing/ambiguous/offline/scope/dirty/closed-buffer checks pass; [evidence](CITATION_ZOTERO_REPAIR.md). Narrative @key, remote/dependent styles and exact companion-style matching remain unsupported. |

## Architecture correction — 2026-11-14

The [architecture overview](ARCHITECTURE.md), README and SVG/PNG now identify
the justification engine inside the MRW core. D15 distinguishes its existing
bounded checker from general inference and the full interactive workflow.
D21 keeps the proposed contract pilot separate. This clarification was checked
against main `0c63d714660b585498a9fe0c7731bd50148cb705`; it does not
change runtime behavior or mark the remaining inference work complete.

Validation: parsed the SVG as XML, exported and visually inspected the
2700 × 2130 PNG, and checked changed documentation links against the repository
tree. Lean, Python and extension suites were not rerun for this documentation
correction.

## Documentation review — 2026-11-14

The overview now explains the justification engine through its mathematical
purpose and a manuscript-lemma example; the [guide](JUSTIFICATION_WORKFLOW.md)
separates current inspection/checking from pending search and comparison.
It repairs the technical specification's stale README command reference.
The [CoCalc proposal](COCALC_ADAPTER.md) adds the missing ownership boundary,
bounded workflow and acceptance criteria. The figure describes the engine's
function and marks CoCalc as planned.

This review incorporates main `90023ba8027ebf422c306aa08b0fbe83d46949d8`:
the bounded diagnostics companion and first relocation contract pilot are now
described as implemented, with their recorded coverage limits. Automatic Codex
maintenance scheduling and subsequent contract models remain pending.
Official CoCalc sources linked in the proposal describe their named deployments.
SVG/XML, PNG layout and changed relative links were checked. Documentation
checks establish no new runtime capability, native acceptance or installation.
All D01–D22 items remain tracked.

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

The current implementation batch and its limits are recorded in
[maintenance evidence](MAINTENANCE_20261114.md). Release and installation are
reported separately after package verification. No plugin installation is
implied by implementation or publication. Publication never implies installation or a forced
reload of the working window.
