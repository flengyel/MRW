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

Published as the [latest normal release, 0.23.43](https://github.com/flengyel/MRW/releases/tag/v0.23.43).
[Download MRW](https://github.com/flengyel/MRW/releases/download/v0.23.43/mrw-0.23.43.vsix)
· [SHA256SUMS](https://github.com/flengyel/MRW/releases/download/v0.23.43/SHA256SUMS).

- Source A: `70edb7bc16ecdd4adad6583037baa6307a03fd98`.
- Clean release B/tag `v0.23.43`: `06c9212fe48ebd00e919fc995e1dfc17d736b297`.
- B changes only `vscode/media/build-info.json`, embedding A and
  `localChanges: false`. This later delivery record changes documentation only.
- Core SHA-256: `f688b00572521829ba921d975e3ba2faa1eee3c6551cc2494a1755fd7313a2d2`.
- Unchanged Diagnostics 0.1.0 SHA-256:
  `4b4c5a3844273a24f635edea2de232bc2460c7599b91ca28f287d31f713d91f6`.

The clean-B package verifier confirms its manifest, marker, runtime source bytes,
current README/tutorial and dependency notices. The packaged README agrees with
the source after VSCE's relative-link rewriting. The guide pass checked 234 local
links/anchors in ten changed Markdown files with no failure. The full wheel
installs without runtime dependencies and imports the new pending module and CLI.

The extracted VSIX was exercised through fresh isolated Python bridge processes,
using a correctly named standalone justification store. It saved an exact
request and relative Return pin, refused a missing checker, reopened the exact
unfinished request, built its own pinned checker from packaged sources, checked
two routes, suppressed the completed intent, saved/reopened a successor and
checked its surviving route. With the checker directory moved aside and elan
removed from PATH, both results reopened and completed work stayed absent from
the unfinished list. The original note and every saved JSON byte stayed unchanged
on readback. This tests real persistence and the nested publication guard without
another MRW installation; it is not a native GUI observation.

All 650 tracked paths/text files and 184 extracted archive entries have zero
superseded-identity matches. No compatibility alias, storage migration, package,
private record or log was committed. Diagnostics, the 16 original checker pins,
Lean sources/toolchain/engine registry and dependency pins are unchanged.
The separately gated relocation-model/runtime comparison passed its three
success/fault vectors with the previously verified unchanged model executable.

The first broad Python attempt lacked three required compiled Lean modules;
its verifier correctly refused the incomplete environment. All 16 original
identities were then supplied and verified unchanged, and the full 494-test
pass succeeded. Earlier logs remain alongside the final results; no failed run
was relabeled successful. Formal tests use verified reused artifacts; the
extracted package separately performs its own fresh route-checker build.

A GitHub draft was uploaded and checked before publication. Both public VSIX
assets and `SHA256SUMS` were downloaded via their versioned URLs and match the
local verified bytes; both checksum checks pass. The public release is neither
draft nor prerelease, the latest-release link resolves to 0.23.43 and its tag
remains B. Earlier published tags and assets were unchanged.

Evidence, actual commands, logs and exit statuses are retained under
`~/.cache/mrw-unfinished-contexts-20261115/evidence/`, including the unavailable
WSL observation. The dedicated fixture never ran its trial body. The working
window was preserved and the new extension was not installed or reloaded.

The next D15 work is reviewed source-driven context assembly without manual JSON
preparation. This repair does not claim to deliver that interaction or the
separately deferred paper–Lean comparison.
