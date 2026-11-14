# MRW design-contract implementation — 14 November 2026

Baseline: main ba2db577b1ab8bf512daf63300e2eedf4232d907; release and installed
WSL registry both 0.23.31 at inspection. Later commits are integrated normally.
The complete D01–D22 register remains in [DESIGN_RECONCILIATION](DESIGN_RECONCILIATION.md).

## Findings and dispositions

| Observation and coverage | Governing requirement | Diagnosis and action | Validation and result |
| --- | --- | --- | --- |
| Existing note contains a Pandoc citation; native preview has no processor. The selected vault export has 559 records and lacks its Marcus key. | D22; Zotero viewer ownership | Add a bounded native-preview adapter around existing Pandoc/CSL. Read metadata/export; never query Zotero on open or fabricate the absent entry. | Real isolated processor tests and native WSL rendering pass. User note bytes preserved; its missing key remains visible. Default style is processor-owned; user remote style is not fetched. |
| Exact-copy completion freezes a source annotation and permits only one continuation. | D02; integration boundary | Allow many independent destinations, optional copying and editable source annotations; preserve original snapshots/records. | Focused Python/controller tests exercise paraphrase, combinations, revisions and preservation. No live-vault creation. |
| Existing tools hidden in palette; lesson controls can inherit unrelated context; retained notebooks use text view. | D06–D13 | Six native purpose groups, contextual lessons, setup access and native read-only notebook view/diff; evaluate nbdime first. | Component routes pass; native activation/Contents/preview observed. Rich notebook visual, full lesson and live Zotero routes remain unobserved. |
| Whole-history reports and child operations prevent reliable feature totals; snapshots imply false zeroes. | D16/D20 | Bounded read-only local history aggregation, correlation and explicit partial coverage. Retain existing store; do not synchronize while inspecting. | Tests cover origins, children, conflicts, cancellation, invalid coverage/durations and byte limits. Shared replicas and closed-window intervals stay unobserved. |
| No optional diagnostics/report schedule. | D17/D18 | Separate companion, minimal inspection API 1, weekly opt-in/coalescing/locks, bounded report history and explicit Codex handoff. | Payload hashes unchanged in fixture scans; interruption/restart/change/offline tests pass. Native companion activation observed. Full semantic/external/reference coverage is explicitly unchecked. |
| Stable relocation/citation safety contract lacks executable specification. | D21 | Separate core/Std model plus runtime trace mapping. | Pinned Lean 4.32.2 proofs and three concrete success/recovery traces pass; no implementation-refinement or liveness claim. |

Independent review found and corrected vault-controlled executable selection,
unbounded growing-file reads, citation-like Markdown links, front-matter
occurrences, mismatched operation outcomes, negative durations and malformed
coverage. Citation execution now requires the host PATH or an explicit trusted
MRW setting. Processor failures terminate the child. Preserve unresolved and
unsupported cases rather than weakening the governing design.

## Native observation

Windows VS Code 1.146.0 with WSL Debian ran an isolated Extension Development
Host. Every contributed core command registered; Contents and native Markdown
preview opened. The production Markdown hook with real Pandoc produced the
fixture citation and bibliography. An unsaved native buffer survived Contents
and preview without changing saved note bytes. Inspection API 1 and optional
companion activation worked. This is not visual acceptance of every menu/theme,
rich output, lesson or live Zotero workflow.

The first native attempt exposed an executable-setting scope problem and its
failure report was retained. An initial broad suite needed its VM module loader
updated for newly added production modules. Subsequent actual checks and final
release bytes are recorded in the release report; no earlier failure is erased.

## Remaining evidence and work

The register preserves partial D11/D13/D14 continuity and broader reconstruction,
shared/continuous-availability measurement, fuller diagnostics coverage and the
subsequent contract models. No alternate editor, synchronization service, model
agent service or research registration form was introduced. No live authoring
prompts, kernel, queue, private notes or working window were controlled.

## Verification account

The full extension pass ran 563 tests: 561 passed and two older flat-menu
assertions failed after grouping. Direct saved-source navigation was restored,
the grouped-menu assertion was updated, and both focused regressions passed.
The affected citation/annotation/history/inspection/controller checks then
passed (56 in that batch, followed by focused review corrections). The full
Python pass ran 457 tests successfully with 68 skips. These are distinct runs;
no all-green rerun of the entire extension suite is claimed here.

The independent Lean build/audit and three runtime relocation traces passed.
Reports preserve initial failures and actual exit statuses. Final archive,
identity, CLI/bridge and public asset checks are recorded after clean packaging.
