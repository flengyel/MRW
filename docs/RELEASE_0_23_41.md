# MRW 0.23.41 — Responsive notes-folder selection

The native note/source/Return trial found that Choose Notes Folder awaited
an informational notification after saving its setting and folder history.
Leaving the notification open held the command pending and serialized later
folder choices behind it. The controller now completes after saving; notification
dismissal is independent. No selection, history, scope or storage format changed.

Baseline: main `2c879cb3cd2000a59aa8a1f33b04dcff8fb5f1f7`. The focused regression
fails on that controller with a pending notification and passes with the fix.
The wider document checks also pass. Final native, package and public-asset checks below passed; 0.23.41 is published.

## Workflow and verification

- 105 document/picker/link/parser checks passed, including all 64 document
  controller checks. The new regression keeps a notification promise unresolved
  and verifies that two successive folder choices still complete and persist.
- 18 focused extension Return/navigation tests passed. The existing import
  notification checks remain unchanged and pass.
- 16 fixture-isolation checks passed; all 31 exported native entry points reach
  the isolation barrier. Source Return is now an explicitly supported case.
- Three tutorial activation/version checks and production JavaScript syntax pass.
- Windows VS Code 1.146.0 with WSL Debian completed the guarded native trial.
  An ordinary notes folder outside the fixture project was explicitly selected.
  Contents followed a retained copy of the existing bundled sums-of-odd-integers
  example. A reader annotation saved; Return selected its exact citation.
  Unsaved edits outside that citation and an unrelated draft survived navigation.
  Ordinary-note Return and reader Return kept distinct occurrences.
- The same private native state survived a real test-window reload and another
  reopen. The saved source retained its annotation and exact reference, while
  ordinary note/source bytes stayed intact. No study record was created. The
  final native helper and all production JavaScript bytes match the tested copy.

The native dialogs and reader messages were scripted. Editors, Markdown preview,
Python bridge, file scopes and native Memento restart were real. No Obsidian
creation, live-vault mutation, AI call, computation or mathematical checking was
performed. This is a navigation check, not evidence for the proof's correctness.
Full Python/Lean and unrelated companion suites were not repeated for this
one-line controller repair.

Earlier attempts are retained, including an initial test harness name error, premature background
focus/preview actions, cleanup that assumed native Undo had completed, and the
expected extension-host cancellation during reload. Foreground fixture focus,
preview readiness and explicit removal of known fixture edits make the final
trial's actions explicit. No production focus workaround was added merely to
make those attempts pass. The resumed window needed to be brought forward before
native focus-sensitive controls could be exercised.

## Remaining limits

The trial uses an ordinary external notes folder, not the user's Obsidian vault
or its authoring template. Companion creation/attachment trials remain separate.
A non-published retained source still opens an extra exact-text tab beside its
reader; this trial does not replace that fallback display. Independent Open
Saved Source is labelled as opening the selected document, rather than claiming
that a fresh citation was followed.

The working window, genuine notes and retained research were not reloaded or
installed over. Failed disposable trial files and reports remain outside the
project; only their UUID-identified windows are cleaned up. Evidence and command
exit statuses are in `~/.cache/mrw-source-return-20261115/evidence/`.

## Delivery

Published as the latest normal GitHub release (not a prerelease):
[MRW 0.23.41](https://github.com/flengyel/MRW/releases/tag/v0.23.41) ·
[core VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.41/mrw-0.23.41.vsix) ·
[SHA256SUMS](https://github.com/flengyel/MRW/releases/download/v0.23.41/SHA256SUMS).

- A: `21e76aabcc3e4982b51671efb91a0f938710a347` contains the runtime repair, checks,
  version/Activity Bar title and current documentation/examples.
- B/tag: `e25f4281c92dad92e59a2c2f9827e72106df7e26` changes only
  `vscode/media/build-info.json`, recording A and `localChanges: false`.
  The package was built from clean B with UTC and `SOURCE_DATE_EPOCH=1792094267`.
- Pinned `npm ci`, tutorial, package and `verify-vsix` commands exited 0.
  All 166 archive files passed verification. Only the expected manifest, marker,
  README, tutorial and `documents.js` files differ from 0.23.40. Dependency pins
  and the Python backend are unchanged; npm reports the existing two moderate
  and three high audit findings.
- All 622 tracked paths/text files and the extracted archive were checked for
  superseded project identities: zero occurrences. The extracted CLI, bridge,
  annotation/exact reference and Trash/Restore checks passed. Production runtime
  bytes match the successful native fixture.
- The genuine Hausdorff and Kerodon sources and their exact links reopened in a
  read-only check: nine and 27 passages, respectively, with both Hausdorff reader
  notes. The active HEAD and all 11 retained payload files stayed unchanged.
- The core VSIX, unchanged Diagnostics 0.1.0 VSIX and `SHA256SUMS` were uploaded
  to a draft before publication. Their public versioned downloads match the
  verified local bytes and pass `sha256sum -c`. The latest-release redirect
  resolves to 0.23.41. Earlier release tags/assets were left intact.
- Failed disposable drafts were saved only inside their owned fixtures through
  native Save All before closing their UUID-verified windows. A final native
  window enumeration showed the genuine MRW window still open and no test
  windows. No core VSIX installation or working-window reload was performed.

Core VSIX SHA-256:

```text
af5adcd3ca5205689657368804d7cfd69f1cf060b8e9779c57c5962c10e86b4b
```

Diagnostics 0.1.0 remains byte-identical to the preceding release, SHA-256
`4b4c5a3844273a24f635edea2de232bc2460c7599b91ca28f287d31f713d91f6`.
This final report commit changes documentation only; the release tag remains B.
