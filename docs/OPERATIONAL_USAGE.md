# Operational feature use

Feature-use statistics are a standing MRW design requirement. They show which
features are used, which remain unused and where failures or friction warrant
investigation. They are separate from mathematical evidence, learning assessment
and reported cognitive load. Maintaining them must not require a Study, a
question registration form or a change to ordinary mathematical work.

## Current implementation and gaps

The 0.23.31 code records command, bridge and validated Study-action invocations,
outcomes and durations. **MRW: Inspect Study History** opens a compact activity
view; **Export Study History… → Detailed comparison and coverage** retains the
full usage table and study measures. **Events and submitted snapshots** retains
the JSON export. Recording is local by
default, with optional explicitly connected shared history. See
[the current workflow](USAGE_HISTORY.md).

This is partial implementation of the requirement, not evidence of actual
feature adoption. A repository checkout contains no observations of the
maintainer's ordinary use. The following table records the earlier gaps that motivated the 0.23.32
measurement increment. Consult the [current reconciliation](DESIGN_RECONCILIATION.md)
for delivered repairs and remaining limits:

| Area | Current limitation | Required correction |
| --- | --- | --- |
| Access | Usage is inside Study History. | Direct access to a feature-use report, independent of creating a Study. |
| Feature coverage | Direct reader and proof-graph actions are uninstrumented; internal bridge calls are separate rows. | Stable user-facing feature IDs with declared coverage across commands, buttons and webviews. |
| Availability | Inventory is captured at recorder initialization; command registration/trust is not external-tool readiness. | Refresh coverage when availability changes; state the interval and what availability establishes. |
| False zeroes | Workspace move/recovery bypass the usage wrapper while appearing in its command inventory. | Record these invocations safely across relocation, or label them uninstrumented until supported. |
| Analysis | Rows are grouped by writer, version and day, without a selected-period adoption summary. | Period totals, use on distinct recorded days, last use and comparable period/version views. |
| Scale | Reporting loads and merges the available history in memory. | Bounded reads and incremental aggregation; no whole-history load for routine reports. |

The measurement corrections and initial [optional diagnostics plugin](DIAGNOSTICS_PLUGIN.md)
were subsequently delivered in 0.23.32, with the limits recorded above. Preserve current history and its
inspection/export while extending it; do not start a second event store.

## Measurement contract

Maintain a small versioned inventory of user-facing capabilities, with stable
IDs, labels, categories, entry points and instrumentation status. Renaming a
button must not create an unrelated feature. Record mappings when a feature
splits, merges or is retired; do not silently combine incomparable versions.
Every added or changed feature declares its coverage, including any omissions.

Count one user action once at the feature level. Correlate nested commands,
bridge calls and external operation IDs as children; retain them for diagnosis
without adding them to the feature total. Distinguish human activity from tests,
demonstrations, scheduled reporting, synchronization and recovery automation.
Do not infer production use from synthetic fixtures or import time.

Record only observable outcomes. Handler return, request dispatch, external
acceptance and external completion have different meanings. Preserve pending
or uncertain outcomes across interruption; reconcile late results by operation
identity without counting another user invocation. Closing a picker does not
cancel an already submitted external job. Duration is elapsed operation time,
possibly including waits; it does not measure attention or mental effort.

The report distinguishes these cases:

| Label | Meaning |
| --- | --- |
| Used | An attributable user invocation occurred in the selected recorded interval. |
| Available, unused | No invocation occurred during an interval with established availability and complete instrumentation. |
| Unavailable | The required entry point or declared prerequisite was unavailable during the stated interval. |
| Uninstrumented | MRW cannot observe this feature's use completely. |
| Unknown or partial | Recording was disabled, history is missing, a device is offline, or coverage cannot be established. |

Availability of a command is distinct from readiness of its optional companion.
Do not probe by creating notes, starting kernels or submitting requests. Use
known configuration and supported read-only status, and label unchecked
prerequisites. Do not treat an unobserved interval as a zero or extend a stale
availability snapshot across an unobserved restart.

## Report and design review

Provide a direct **Feature Use** report through the optional diagnostics plugin,
using the existing recorder and basic history export. It must show the selected
period, included workspaces/writers, software versions, coverage and missing
history before interpreting counts. Initial summaries need:

- user invocations, distinct recorded active days used, last reported use;
- observed outcomes, pending/uncertain operations and elapsed durations grouped
  by outcome, with the number of duration samples;
- available-but-unused features, unavailable features and instrumentation gaps;
- comparisons with another selected period or version, retaining changes in
  availability and recording coverage.

Define an active day as a writer-reported date containing recorded human MRW
activity. Show days with established feature availability separately. Neither
is total wall-clock availability or evidence of work on an unobserved device.
Session-based rates require an explicit session definition before introduction.
Deduplicate shared event IDs and preserve clock/source qualifications.

Review these reports during release planning. Sustained non-use prompts an
investigation of discoverability, relevance and workflow fit; frequent failure
or cancellation prompts a reliability review. Record the finding and resulting
decision. Low use alone does not justify removing recovery, accessibility or
specialist features. High use does not establish benefit, correctness or learning.
Do not hide, retire or rearrange features automatically from counts.

Periodic use reports are also inputs to [Codex maintenance](CODEX_MAINTENANCE.md).
For each proposed change, compare the finding with the current design and
[reconciliation register](DESIGN_RECONCILIATION.md), check coverage and present
state, and record the decision plus actual validation. Keep unexplained low use
as a question rather than a mandate to remove the feature.

## Recording and resource boundaries

Keep lightweight recording in MRW core, independent of the reporting plugin.
Reuse `mrw.usageRecording`, the local history store and explicit sharing choices.
Operational counts need no document bodies, filenames, prompts, replies,
keystrokes, credentials or unrelated application activity. Existing submitted
study evidence retains its separate purpose and controls.

Use bounded buffering and failure isolation: unavailable history must not block
ordinary reading. The reporting plugin consumes bounded, paginated observations
or aggregates, supports cancellation and states truncation or incomplete
coverage. Derived caches are rebuildable; the event history remains authoritative.
Retention or deletion follows explicit history controls, not a usage ranking.

Validation must cover one action reached through different entry points,
nested calls, zero versus missing observations, changing availability,
relocation/restart, late external outcomes, duplicate shared events and large
histories under a measured memory limit. Tests remain outside the ordinary-use
population. Verify discoverability in the native interface separately from
counts in a test report.

## Bounded report interface

The optional diagnostics companion consumes inspection API 1. Routine reports
read bounded local history batches and pending observations, without calling
the mutating shared-history synchronization scan or loading the whole history.
Root actions count once; correlated children remain diagnostic detail. Tests,
development and scheduled origins are excluded from human totals. Coverage
refreshes on configuration/trust changes. Workspace move actions are observed
before relocation; a missing ending remains pending/unobserved.

Limits and local/shared/unobserved coverage precede counts. Command registration
establishes entry-point availability, not companion reachability or continuous
availability while VS Code is closed. Unknown intervals are not zero use.
Remaining adoption/availability evidence stays in the [register](DESIGN_RECONCILIATION.md).
