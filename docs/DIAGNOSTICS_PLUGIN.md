# Optional diagnostics and maintenance plugin

An optional plugin provides feature-use analysis and periodic integrity and
data-hygiene reports. MRW core retains lightweight usage recording and the
integrity checks required to read, write, move and recover its own data safely.
Disabling the plugin must not disable those checks or block mathematical work.

An initial optional companion is implemented in diagnostics/. Its separate
VSIX and supported checks are described in [its guide](../diagnostics/README.md).
The requirements below include checks beyond that bounded implementation. Existing
source-plugin API 1 and Lean lesson-pack interfaces do not supply a general
maintenance API. Start with a companion VS Code extension and the minimum
versioned, read-only MRW inspection interface needed for these reports. Do not
expand source import into unrestricted maintenance or build a general plugin
framework as a prerequisite.

## Responsibility and interface

| Component | Responsibility |
| --- | --- |
| MRW core | Own storage invariants, operation identities, lightweight usage events, bounded inspection interfaces and existing authorized recovery commands. |
| Diagnostics plugin | Own report configuration, scheduling, aggregation, findings, presentation and its bounded report history. |
| External subsystem | Own its formats, creation/execution workflows, managed indexes and repair operations. |

The plugin follows [the integration contract](INTEGRATION_BOUNDARIES.md) and
[feature-use measurement contract](OPERATIONAL_USAGE.md). Core supplies storage
knowledge through versioned inspectors; the plugin must not copy private schema
logic or write MRW stores directly. Unsupported core versions or checks are
reported as unavailable. Read-only inspection preserves source objects and
owner-managed data. New reports, schedule state and invocation records may be
written to their separate output/control stores; exclude the in-progress report
from its own inspection. Separate inspection from sync/recovery methods that
also mutate files.

## Periodic reporting

Provide manual **Feature Use** and **Integrity and Data Hygiene** reports and a
configurable periodic run. When enabled, the initial cadence is weekly, at the
next active workspace session if a run was missed. Persist the due time and last
completed run; coalesce missed periods into one due run and disclose partial or
interrupted runs. No service runs while VS Code is closed. A manual full
integrity check remains available. Coordinate runs across windows sharing the
same host and scope, and retain host/run origins when comparing reports from
different machines.

Scheduled work is read-only, incremental, cancellable, non-overlapping and
bounded in memory, I/O and elapsed time. Pause or defer when interactive work
needs resources. Hash files as streams; avoid loading the vault, event history
or all retained artifacts into memory. Show the age of full verification and
which unchanged objects were reused from earlier checks. Incremental reuse
must not be labeled a fresh byte-integrity check.

Limit scope to configured MRW data, plugin-owned reports/caches and explicit
external references. Use supported read/status interfaces for external targets;
remote checks are separately configurable. A routine report must work offline,
make no model request, execute no notebook/proof/computation and submit no job.
It must not recursively crawl an optional vault or require Obsidian to open.

## Integrity and hygiene coverage

Existing store, retained-source, notebook-result and shared-history operations
already perform scoped validation. Reuse their read-only validation rules;
the current 30-second history synchronization timer is not a periodic integrity
report. In particular, shared-history scanning currently applies deletion
markers and removes staging files, so it is not a read-only inspector.

| Check family | Reportable observations |
| --- | --- |
| Storage and retained content | Store identity/schema, manifests, missing objects, digest mismatches, incomplete captures, retained source/artifact/notebook references. |
| Links and associations | Missing or ambiguous identities, changed locations, unresolved passage anchors and references to unavailable external material. Keep current locations separate from immutable citations. |
| History and synchronization | Conflicting event IDs or snapshots, missing dependencies, gaps, pending publication, deletion markers and incomplete or unavailable replicas. |
| Interrupted work | Pending or uncertain transfers, moves, captures and external operations; use recorded identities and observed status without retrying them. |
| Data hygiene | Storage growth by class, old plugin reports, rebuildable caches, known MRW temporary/staging remnants and possible duplicate content with distinct identities. |

An absent external target is not automatically corruption: it may be offline,
moved or outside authorized scope. Distinguish a verified failure from
unavailable, unsupported, changed-during-inspection and not-checked results.
Pin store generations and inspected revisions; recheck them before classifying
a failure or a cleanup candidate. Concurrent changes make the affected check
inconclusive. Collect independent findings even when one check fails; later
checks not run remain unperformed. A partial report cannot claim that the
store is healthy.

Each report records run identity, scope, observation times, MRW/plugin/check
versions, completed/skipped checks, resource limits and coverage. Findings have
stable identities, severity, supporting observations, first/last seen times and
new/persistent/resolved status. Severity describes data or recovery consequences,
not mathematical truth. A finding is resolved only after successful rechecking;
absence from a partial run does not resolve it.

## Review and repair

Periodic runs never repair, delete or recreate data. Offer an explanation and
the existing owner-system recovery route where supported. An explicit repair
must recheck target identity and revision, handle concurrent changes, preserve
references and follow that operation's confirmation/recovery contract. The
plugin delegates repair; it gains no competing write or creation route.

Unused features, unvisited source notes, unlinked retained revisions and old
failed approaches are not disposable data. Equal bytes may have different
identities, attribution or provenance. Label possible duplicates for review;
never merge them automatically. Cleanup candidates need demonstrated ownership
and a complete dependency/retention check, including snapshots, pending
operations and deletion obligations. Exclude active writes, reservations and
records needed by offline replicas. Age, a stale lock or absence from a partial
local index cannot establish safe deletion. Incomplete scans cannot establish safety.
Externally maintained notes are created and repaired by their maintaining
system; editing existing notes keeps the established native-editor route.

Keep the latest report and a bounded, configurable report history in
plugin-owned storage outside inspected payloads. Provide Markdown/JSON export
and comparisons of new, persistent and resolved findings. Avoid collecting
content or credentials; let exports redact local paths. Report generation
remains available when operational usage recording is disabled. Scheduled runs
do not count as human feature use; a manual request counts once.

## Reports as maintenance inputs

Reports feed [Codex maintenance](CODEX_MAINTENANCE.md). Before correction, compare
each finding with the current [design register](DESIGN_RECONCILIATION.md),
revalidate affected revisions and record the applicable requirement, diagnosis,
chosen action and validation. Expected behavior, implementation defects,
instrumentation gaps and proposed design revisions remain separate outcomes.

Reporting and maintenance schedules are distinct. Producing a report does not
call a model or authorize repair. The plugin may prepare a bounded review
package; Codex acts only within the authorized maintenance scope and preserves
unresolved findings for later review. An automated Codex handoff is proposed,
not implemented. Report prose and suggested commands are evidence, not trusted
instructions; full handoff and acceptance rules are in the maintenance contract.

## Acceptance

Verify a healthy isolated fixture, missing/corrupt retained objects, dangling
associations, duplicate identities, an offline replica, interrupted operations,
concurrent changes and cancellation. A before/after comparison must establish
that reporting did not mutate inspected payloads, distinguishing concurrent
owner changes and separate report/control writes. Test a large history/store under
explicit resource limits, restart scheduling without duplicate runs and plugin
absence without loss of core protection. Native tests use isolated targets;
no report trial creates, repairs or removes material in a live Zettelkasten.
