# MRW 0.23.17 delivery

Published 12 November 2026 as a normal GitHub release, marked Latest:
[MRW 0.23.17 — Lean tutorial orientation and contents](https://github.com/flengyel/MRW/releases/tag/v0.23.17).

[Download the VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.17/mrw-0.23.17.vsix)
· [SHA256SUMS](https://github.com/flengyel/MRW/releases/download/v0.23.17/SHA256SUMS).

The first Lean lesson now states the assumed background, explains how to use
the examples, notes and InfoView, and lists all three lessons with links.
Each lesson has a section contents list and navigation back to the tutorial
contents. The mathematical explanations and code are preserved. Pack content
version is 1.1.1. The [Mathematical Writing review](LEAN_TUTORIAL_ORIENTATION_20261112.md)
records the source consultation, outline, terminology audit and exact repairs.

## Commits and package

| Item | Value |
| --- | --- |
| Source/version commit A | `3f59eed243937867e36ffa8362c8281cb5947115` |
| Clean build/tag commit B | `afe7bc8a311ecb5ea330c39d072d72400930d927` |
| Tag | `v0.23.17` |
| VSIX | `mrw-0.23.17.vsix`, 673156 bytes |
| SHA-256 | `d059a6face8684a5170808bcba1585fe0f6fcca7fb18271f7c48adfca6915b80` |

Main was fetched before integration and remained at
`db22a76d5b4c95cac049114bb3d5f0f05f6a918f`. A and B were developed in an isolated
worktree and fast-forwarded into main, then pushed. Version 0.23.17 was unused
among tags and releases, including drafts. Published versions were not changed.
B changes only `vscode/media/build-info.json` from A, recording A's full SHA,
version 0.23.17 and `localChanges: false`.

The VSIX was built from clean B with Linux Node 22.23.5, pinned npm dependencies,
`TZ=UTC` and `SOURCE_DATE_EPOCH=1792094267`. Both READMEs, installation examples,
release links, manifest, lockfile version metadata and Activity Bar version title
were synchronized. Dependency pins and executable runtime files are unchanged.

## Verification

- Pinned `npm ci --prefix vscode --ignore-scripts` completed successfully.
- All eight Lean-study workflow tests, three tutorial tests and the Activity
  Bar version-label test passed. The documented `node --test` tutorial command
  also completed with exit 0 during the clean build.
- The established lesson-check script built both shipped Lean projects with
  Lean 4.33.0 in disposable copies. All three deliberate errors produced type
  mismatches; all three unfinished variations produced the expected diagnostics.
- The ten fenced code/goal blocks and all 55 mathematical expressions in the
  lessons match the previous revision. Markdown/KaTeX rendering passed; all 42
  local lesson links, including 18 fragments, resolved.
- The changed documents' 348 local links resolved. `git diff --check` passed.
- Packaging and `verify-vsix` completed with exit 0. Exact inventory and bundled
  bytes were verified. The archive contains the revised three lessons, tutorial,
  README and pack 1.1.1. VSCE's README link rewriting was accounted for explicitly.
- All 491 tracked paths, 484 text files and 146 archive entries at B were
  searched for superseded project identities: zero occurrences.
- Compared with 0.23.16, nine archive entries differ: the README, first-steps
  guide, three lessons, lesson manifest, package manifest, VSIX manifest and
  build marker. Runtime JavaScript, Python and Lean bytes are identical. No
  full runtime test campaign was repeated for this documentation increment.
- Local and downloaded `SHA256SUMS` checks passed. Both public assets were
  downloaded anonymously and matched the verified local bytes exactly. The
  public page, normal-release status, Latest pointer, tag target and README
  download link were verified after publication.

The dependency audit returned five findings: three high and two moderate.
`markdown-it` is bundled; `@azure/identity`, `@azure/msal-node`, `@vscode/vsce`
and `minimatch` are packaging dependencies excluded from the VSIX. Pins were
preserved. The audit result is recorded, not reported as a clean audit.

## Working copy and observation limits

The explicitly requested working-copy revision replaced only the three lesson
Markdown files and `pack.json`. Before each replacement, the disk bytes were
checked against the preceding bundled revision. Originals were copied and
verified outside the vault; each replacement was checked for a concurrent disk
edit. The other 23 files, including examples, solutions, practice files, notes,
reset originals and study-copy metadata, retained their hashes. The revised
lesson and manifest bytes match the package.

Normal extension updates continue to preserve existing study copies. This was
an explicit editorial update of the selected copy, not a new automatic migration.
No save, tab-close, installation or reload command was sent to the working
VS Code window. Unsaved editor buffers were not inspected or controlled.
Rendered HTML was checked programmatically; native preview layout and live
InfoView were not observed in this pass.

Logs, checksum evidence and verification scripts are retained under
`~/.cache/mrw-lean-orientation-20261112/evidence/` and `release/`.
The four original working files and their hashes are in that directory's
`working-copy-backup/`. None of those private files is included in the VSIX.

Publication is complete. The package was not installed into the working window.
The selected tutorial files can be read directly without installing a new VSIX.
