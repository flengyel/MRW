# MRW 0.23.31 — Obsidian creation template

Published as a normal release and marked Latest:
[release](https://github.com/flengyel/MRW/releases/tag/v0.23.31),
[VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.31/mrw-0.23.31.vsix),
[checksums](https://github.com/flengyel/MRW/releases/download/v0.23.31/SHA256SUMS).

## Change

New Note and reader-note continuation use the same Obsidian handoff. It now
requires an explicitly configured template creation command. An unset setting,
the plain new-file command, or a known insert-template command stops before CLI
discovery, focus or dispatch. No note bytes, filename, fallback file or retry are
supplied by MRW. A valid template command is still dispatched exactly once.
The ordinary non-vault editor route remains available.

The default setting was a confirmed bypass of template-based creation. It is
now empty. Existing valid settings are preserved. See the
[configuration guide](OBSIDIAN_WORKFLOW.md#new-note). The instructions, tutorial
and contributor guide require native creation tests to use an isolated vault
and its configured template. They prohibit writing fixture notes directly into
a user's vault or automating prompts in their working Obsidian window.

## Source and package

- A: `c9960919b7aee065a4b4d72d3599f11d758bad7b` — code, tests, instructions and version metadata.
- B: `d601dc29efd9ae0df9d98fe78ab14d70e76766c4` — only `vscode/media/build-info.json` changed from A.
- Tag `v0.23.31` points to B. The embedded marker names A and has
  `localChanges: false`. Packaging used clean B.
- VSIX SHA-256: `be9b74f15a27acb3d9de15ee05e5b54b2fe44f15565c9a7f7b70afd9b2047bb3`.

The runtime diff from 0.23.30 is confined to `obsidianNotes.js`. Version,
configuration description/default, documentation and tutorial changes accompany
it. Dependency pins, Python/Lean source and saved-record formats are unchanged.

## Checks

- Pinned dependency installation with `npm ci --ignore-scripts`: exit 0.
- Seven focused Obsidian command checks: passed. Missing, invalid and known
  non-creation commands produce no CLI call or focus action. Vault mismatch,
  trust, changed folder, missing command, focus failure and uncertain dispatch
  retain their guards. Another explicitly configured template plugin command
  remains supported.
- Full extension suite: 540 passed, none failed or skipped. Syntax checks passed.
- Python suite: 456 run, 388 passed, 68 skipped; exit 0.
- Tutorial checks, 431 local links in the changed documents and
  `git diff --check`: passed before the release commits.
- Fixed-epoch VSIX build and exact package inventory/byte verification: passed.
  The packaged README, tutorial, manifest and marker contain this repair.
- Identity scan: zero superseded-name occurrences across all 545 tracked files
  and paths and all 157 VSIX entries. No exclusions were used.
- Extracted package: isolated Python import/CLI, positive bridge reference
  parsing and the missing-command guard passed without a working installation.
- The draft contained only the VSIX and SHA256SUMS. After publication, both
  public downloads matched local bytes, `sha256sum -c` passed, and the public
  Latest endpoint returned 0.23.31.
- npm audit: 3 high and 2 moderate findings, unchanged dependency pins. No
  automatic dependency updates were applied.

An initial broad test run lacked the generated Python bundle in the new
worktree and failed. Its log was preserved separately. After `bundle-core`,
the complete extension suite was rerun successfully. Verification commands,
exit statuses and logs are retained in the local repair evidence directory.

## Observation and limits

No interactive Obsidian creation trial or native-window test was performed in
this repair. Controller tests and extracted-package checks are not observations
of template prompts. The CLI can establish registration and dispatch; it cannot
certify the behavior of an arbitrary plugin command or completion of a template.
The user still completes the template and saves in Obsidian; continuation still
requires explicit selection and verification of the saved note.

The configured NewFileTemplate command was confirmed read-only. Its template
and two inspected notes retained their pre-repair hashes. No vault files,
templates, notes-folder settings, research records or open drafts were written
by this task. Older fixture notes were left intact.

The release was not installed and no window was reloaded. The WSL extension
registry still listed 0.23.29 at delivery; that registry observation does not
establish the version active in every open window. Downloading and installing
the new VSIX remains the update step.
