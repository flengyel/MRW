# Shared history delivery — 2026-11-11

Implementation branch: `feature/shared-history-20261111`, from
`9ce47c6f292447bca56f9b0e900397e8e0873916` (clean main and fetched origin/main).
Issue: [#9](https://github.com/flengyel/MRW/issues/9).
Delivery: [PR #10](https://github.com/flengyel/MRW/pull/10).

Implementation commits: `af60f5009e9fb6695a3635de7bdd296a588b9b79`,
`de31790131ca65fdde22cbf93c91eff7264ee44b`, and `88631a8f8ef38d89b5ec8b4925cde3ae36e5efa7`
(final runtime: study-scoped interrupted staging cleanup).

## Result

Configure History connects a chosen `History/` subtree only after explicit import
and readback verification. Original private history remains. Inspect/Export uses
the existing recorder, with immutable per-writer batches, portable references,
conflicts, missing snapshots, bounded pending publication, feature counts and
opaque Study deletion markers. The tutorial and workflow explain the delivered
interaction. Active drafts, Study checkpoints and scheduling are not synchronized.

No genuine notes, sources or studies were converted or tested destructively.
No package was installed and the working VS Code window was not reloaded.
The source manifest and installed extension remain 0.23.12. This increment is
not in its already-published VSIX; this task does not require another package or
release. The Python core, dependency pins and mathematical checking are unchanged.

## Verification

- Existing history-reliability and measurement tests passed initially. The
  lifecycle check found a changed confirmation-string expectation; the message
  now retains the tested wording and explains shared deletion.
- A caller run exposed missing new-module entries and `Uri.file` in API doubles,
  plus an unstaged Python core in the new worktree. The doubles were extended and
  the unchanged core staged with `python3 vscode/scripts/bundle-core.py`.
  The affected clipboard, export and activation checks then passed (3/3, exit 0).
- `/tmp/mrw-prerelease-tools/node --test --test-isolation=none --test-concurrency=1
  vscode/test/shared-history.test.js vscode/test/study-history-reliability.test.js
  vscode/test/study-lifecycle.test.js vscode/test/study-measurement.test.js`:
  **61 passed**, exit 0. Includes 21 new shared-history checks.
- Final focused run after batch sizing, coverage ownership and interrupted-staging
  corrections: **64 passed**, exit 0. Same four test files; includes **24 new
  shared-history cases**. Source is the `88631a8` runtime commit.
- One serial pass over all 33 extension test files at `af60f5009e9fb6695a3635de7bdd296a588b9b79`:
  **421 tests, 411 passed, 10 failed, no cancellations**, driver exit 1. The ten
  artifact checks correctly rejected tmpfs. A `TMPDIR` rerun also failed because
  their helper fixes its directory relative to the checkout. A detached ext4
  checkout of `de31790131ca65fdde22cbf93c91eff7264ee44b` then ran only those ten:
  **10 passed**, exit 0. No storage checks were changed. The full suite was not
  repeated. Together with the final focused run this gives passing coverage of
  **424 checks across runs**, not one uninterrupted full-suite pass.
- Final syntax command: `env PATH=/tmp/mrw-prerelease-tools:/usr/bin:/bin
  /tmp/mrw-prerelease-tools/npm run check --prefix vscode`. Exit 0. The first
  attempt lacked `node` on PATH and exited 127; the pinned host Node was then
  supplied explicitly. `git diff --check` passed.
- Documentation: all **233** local targets, anchors (including explicit HTML
  anchors), same-repository guide links and MRW command links in the eight
  changed Markdown files resolve. External-site HTTP status was not checked.
  Tutorial tests passed in the serial regression (3/3).
- Disposable Windows-backed observation at `de31790131ca65fdde22cbf93c91eff7264ee44b`:
  import/readback/deletion passed for **separate data directory, vault
  subdirectory and vault root**, with private storage on Linux. Neighboring note
  bytes survived all three arrangements. Successful fixtures were removed.
  The subsequent interrupted-staging cleanup was tested on Linux. No live
  Syncthing trial or history-menu desktop acceptance is claimed. No mount, sync
  configuration or private-store checks were changed.
- Initial WSL memory: about 7.6 GiB available, no swap, pressure averages zero.
  The first serial run retained about 7.5 GiB available with zero pressure.
  No unrelated computation was stopped. Earlier memory exhaustion is not
  attributed to MRW.

During the serial campaign an unrelated Lean verification appeared in another
repository. It was neither started nor stopped by this task. Available memory
remained above 7 GiB in the recorded checks, with zero pressure averages.

The serial driver ran each `vscode/test/*.test.js` file in its own Node process,
one at a time, preserving each file's output and exit status. Logs, driver and
Windows observations are retained outside the repository at
`~/.cache/mrw-shared-history-20261111/`. No Python core code changed, so no new full
Python, Lean or TeX campaign was run. The earlier evidence remains in
[the reader-note report](READER_NOTES_REPAIR.md).

## Native reader-note acceptance

The existing 0.23.12 implementation and recorded verification were preserved.
One bounded Windows desktop launch used a disposable copy of the extracted
package with a test-only startup handshake and isolated store. It returned exit
0, but produced no `result.json` or test events; the subsequent title-specific
window capture found no matching test window. The close command targeted only
that disposable title and found none. No relaunch loop was attempted.

Native add/delete/link end-to-end acceptance therefore remains **unverified**.
This does not establish a product failure and does not replace the earlier
separate-process packaged-bridge evidence in [the reader-note report](READER_NOTES_REPAIR.md).
The installed 0.23.12 activation was logged; its exact active build marker was
not independently observed in the working UI.

## Limits and next action

Direct reader/proof-graph webview actions remain explicitly uninstrumented,
although their bridge requests are measured. Dates are writer-reported. The
report cannot know whether disconnected devices have synchronized. Deletion
cannot erase disconnected copies, exports or backups; a host which has not yet
received a deletion marker can still have an older copy.

Portable references do not automatically open a different machine's local note.
Snapshot exports identify their portable representation separately from the
original digest. Queue overflow requires explicit reimport from the preserved
private history. Shared-history support does not qualify a filesystem for the
private source store.

Next product task after committed delivery: Zotero reference and attachment
linking under the existing design. PROV remains subsequent work.
