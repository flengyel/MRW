# MRW 0.23.28 — Contents and Commands

Published 13 November 2026 as a normal GitHub release, marked Latest. Release
commits and tag were pushed to `main` and origin. Not installed into or reloaded
in the working window.

- [Release](https://github.com/flengyel/MRW/releases/tag/v0.23.28)
- [VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.28/mrw-0.23.28.vsix)
- [Checksums](https://github.com/flengyel/MRW/releases/download/v0.23.28/SHA256SUMS)
- Source commit A: `0ca1f21aa93a3573f81e2fb5cdbebe96682aba35`
- Release commit B: `dbf2e3eee5f4c216a41ded82c6e1a58628affe4b`
- VSIX SHA-256: `19acda1442bd59197afd753444ff4718769289ef7f32ccacca2e51c51ff5ea43`

## Change

The Studies sidebar, tree provider, row action and associated menus are removed.
MRW's sidebar contains Contents and Commands. Saved records, drafts and history
remain accessible through Resume Study, Inspect/Export Study History and the
existing lifecycle commands in the Command Palette. No storage migration or
deletion is performed. Ordinary documents, annotations, notes, Obsidian handoff,
the Lean tutorial and user lesson files are unchanged.

Removing the tree exposed a navigation dependency: Resume automatically chose
the active record even when others existed. It now offers the saved-record picker
when several records exist, including when one is open. Cancellation preserves
current work. Explicit record arguments and direct resumption of a sole saved
record remain supported.

Fleeting notes and notes intended for later review remain ordinary documents.
No replacement view, registration form, schema or notes-based spaced-review
workflow is introduced. The underlying study engine and saved-work commands
remain; this release removes its sidebar. Current design instructions, README,
tutorial and recovery directions reflect that scope.

## Verification

- Clean npm install, bundling and syntax checks passed.
- All **530 extension tests** passed with no failures, skips or cancellations.
  Focused runs covered active study, lifecycle, saved-document work, host facades,
  feedback and command entry points. Resume regression checks cover stale-index
  recovery, choosing another saved record, returning to unfinished text and
  cancelling without changing saved bytes. Existing tests exercise restart,
  interrupted writes, deletion markers, shared-source protection and relocation.
- An earlier full run was stopped after review found the Resume-picker defect;
  its partial log and exit status were preserved. The final full run passed
  after the correction, in 270.18 seconds.
- An isolated native VS Code **1.146.0 / WSL** host confirmed Studies is absent,
  all **111** remaining contributed commands register, Show Contents works and
  the Lean chooser settles after cancellation. Blank Markdown, unchanged source
  and file inventory, Recent Notes and Return checks also passed. This native
  run preceded the final Resume-picker correction; the final automated suite
  covers that correction. No manual visual inspection or live Obsidian trial
  is claimed. The working research window was not reloaded or reconfigured.
- All three final tutorial tests and **437 relative links in 14 changed Markdown
  files** passed before the release commits. Delivery-report links were checked
  separately before its commit.
- Built from clean B with the fixed UTC epoch. A-to-B changes only the build
  marker, recording A, version 0.23.28 and `localChanges: false`.
- VSIX verification checked inventory, manifest and runtime source bytes.
  Inspection confirmed the two sidebar views, removal of the tree command,
  current README/tutorial and build marker. All tracked paths/file bytes and
  VSIX entries were searched for the superseded project identity: zero matches.
- Every archive entry was compared with 0.23.27. Only the three changed
  JavaScript files, README, tutorial, manifest and build/version metadata differ.
  Python, Lean and lesson bytes are identical. Their full suites were not
  repeated. The extracted VSIX's Node-to-isolated-Python bridge passed.
- Both published assets were downloaded and compared byte for byte with the
  local package/checksum file. SHA256SUMS, tag target, normal-release status,
  Latest redirect and README download link passed.
- Dependency audit: **three high and two moderate** findings; pins preserved.

Logs, exit statuses, native-host observations, package comparison and downloaded
assets remain under `~/.cache/mrw-no-studies-20261113`. Tests used disposable
records; genuine notes, saved research and settings were not edited.

Updates from GitHub require installing the newer VSIX. Publication did not
install it or reload the working window. PDF Return remains file-level; Obsidian
remains a separate authoring application. See [installation](INSTALLATION.md),
[saved work](ACTIVE_STUDY_WORKFLOW.md) and [lifecycle commands](STUDY_LIFECYCLE.md).
