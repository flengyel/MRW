# MRW 0.23.43: resume unfinished justification

Search now saves its exact request and Return location before starting Lean.
If it fails or the reader closes, **Justification… → Unfinished: …** reopens
that context without another build or check. Retry remains explicit and keeps
the same request identity. A completed result replaces its unfinished picker
entry; the earlier immutable capture remains preserved.

The repair uses the existing artifact coordinator and justification store,
including pending-only discovery/moves and interrupted HEAD recovery. Workspace
Return locations are relative; notes-folder locations preserve their original
root. Ordinary files, buffers, notes and source snapshots remain independent.
Closing a reader keeps its in-flight move guard until the operation settles.
Standalone nested publication now reuses only the lock already held for that
store, while other processes remain excluded.

The [drift account](UNFINISHED_CONTEXTS.md) records the stale roadmap paragraph,
misleading closure test and actual pending-work/lock defects. Generic context
assembly from ordinary notes remains the next D15 capability; it is not
silently supplied by this repair. No claim-entry or question form was added.

## Verification and limits

Focused regressions exercise fresh-process/fresh-activation recovery, exact
requests and origins, failed/unconfirmed writes, pending-only legacy discovery,
managed recovery/moves, completed-result suppression and inter-process locking.
The full Python pass has 494 tests: 431 passed and 63 prerequisite skips
(58 Qt opt-ins, four normal-host TikZ opt-ins and an unavailable authorized
Windows-parent check). The extension pass has 653 tests: 646 passed and seven
prerequisite skips (six optional citation checks and the separate compiled
relocation-model comparison). Production syntax and changed Markdown links pass.
Extracted-package and public-asset outcomes are recorded after the clean A/B build.

The native acceptance attempt did not reach MRW activation: VS Code's Windows
WSL resolver waited indefinitely. The working window's renderer log showed the
same resolver wait. The dedicated UUID fixture body was cancelled before it
could run if connectivity later recovered. This increment has no new native
GUI/restart acceptance result. Component and actual backend/fresh-process checks
are distinct evidence. The working research window was preserved; its connection
or installed extensions were not restarted or changed by this task.

The Lean source/toolchain/engine registry and dependency pins are unchanged.
Previously verified executables are reused for the existing compiled-checker
regressions; the extracted package separately builds its own pinned runtime.
No new formal theorem is asserted. Inference checking remains relative to the
supplied admissions, separate from arithmetic or prose/formal correspondence.
The pinned npm audit reports two moderate and three high findings.

## Build and publication

Release identifiers, package checksum and actual regression/publication results
are recorded after verification. Publication does not install or reload the
working extension.
