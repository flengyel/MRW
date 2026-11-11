# Shared history delivery — 2026-11-11

Implementation branch: `feature/shared-history-20261111`, from
`9ce47c6f292447bca56f9b0e900397e8e0873916` (clean main and fetched origin/main).
Issue: [#9](https://github.com/flengyel/MRW/issues/9).

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

## Checks so far

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
- One disposable Windows-backed observation, with the private store on Linux:
  shared import/readback/deletion passed under Windows Temp in a mock
  `vault/MRW/History` arrangement; the neighboring note's bytes survived.
  The successful temporary fixture was removed. No mount, sync or private-store
  checks were changed. The three directory relationships were all tested on
  Linux; this is not a Windows test of all three or a live Syncthing trial.
- Initial WSL memory: about 7.6 GiB available, no swap, pressure averages zero.
  The first serial run retained about 7.5 GiB available with zero pressure.
  No unrelated computation was stopped. Earlier memory exhaustion is not
  attributed to MRW.

Full extension regression and final content/link checks remain to be recorded.

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
