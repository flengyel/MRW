# MRW 0.23.13 delivery — 2026-11-12

Published as the latest normal GitHub release:
[MRW 0.23.13 — Zotero references and shared history](https://github.com/flengyel/MRW/releases/tag/v0.23.13).
[VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.13/mrw-0.23.13.vsix) ·
[SHA256SUMS](https://github.com/flengyel/MRW/releases/download/v0.23.13/SHA256SUMS).

This packages Zotero linking and shared history, which had reached main but were
absent from the published 0.23.12 VSIX. Zotero is integrated into `flengyel.mrw`;
no separate extension is required. The documented local API setting is included
in both READMEs and the bundled tutorial.

## Exact source and package

- Commit A: `8e13edf04758368c825537f4ca51acea6171cb19` — version, installation
  examples and current workflow documentation. Dependency pins unchanged.
- Commit B: `428cc20648563c137c442975cd6d345f29e85f16` — only
  `vscode/media/build-info.json`, with version 0.23.13, A's full SHA and
  `localChanges: false`.
- Clean B was built and tagged `v0.23.13`; both commits are on remote main.
- Package: `mrw-0.23.13.vsix`, 671,557 bytes, 144 entries.
- SHA-256: `f471b582aba5d3d71f1591540ca0bf518a6a30be1dba67adf5cbdb5afd7bff7b`.

The release was created as a draft, both assets were uploaded and their digests
checked, then it was published with `prerelease: false` and marked Latest.
Anonymous downloads of both assets matched the local files byte for byte;
`sha256sum -c SHA256SUMS` passed. The public release page, Latest API, tag target
and README download links were checked. Older tags and assets were unchanged.

## Verification

The isolated release checkout used Linux Node and npm with Python 3.11+.
Build timestamps used `TZ=UTC SOURCE_DATE_EPOCH=1792094267`.

- `npm ci --prefix vscode --ignore-scripts`: exit 0.
- Tutorial tests: 3 passed, exit 0 (serial, test isolation disabled).
- `npm run check --prefix vscode`: exit 0.
- `npm run package --prefix vscode`: exit 0.
- `npm run verify-vsix --prefix vscode -- mrw-0.23.13.vsix`: exit 0; exact inventory,
  production manifest, runtime bytes and bundled notices matched.
- Documentation: 352 local paths, anchors and command targets across 11 changed
  files passed. Other external links were not exhaustively fetched.
- `git diff --check`: passed; release source remained clean after packaging.
- Identity scan: all 483 tracked paths, 476 tracked UTF-8 text files and 144
  archive entries checked; zero superseded project-identity occurrences.
- Extracted package: isolated Python import and bridge review of the synthetic
  Unicode fixture passed. Package README/tutorial contain the Zotero setting.
- Extracted Zotero modules and Windows helper loaded and reached Windows Zotero
  10.0.8, reporting API 3 and schema 44. This did not change library records.

Runtime code matches `f57c66510891fd68abc2e7344ddd16439073bda6`; only the tutorial
and build marker changed within the media/runtime paths. That source's preceding
full serial campaign passed 451 extension checks at `b5b2622`, followed by 27
Zotero checks and the activation check after the final cancellation correction.
The release does not claim a fresh full-suite run: version/document changes
required focused checks and package verification. Python and Lean were unchanged.
See [Zotero checks](ZOTERO_DELIVERY.md) and
[shared-history checks](SHARED_HISTORY_DELIVERY.md) for their actual source states.

Logs, scripts, exit codes, extracted package and public-download verification are
retained outside the repository under `~/.cache/mrw-releases/0.23.13-20261112/`.
Only the VSIX and checksum were uploaded.

## Dependency audit

`npm audit --prefix vscode --json` exited 1 with five vulnerable dependency
entries: three high and two moderate. Reported packages were `markdown-it`,
`@azure/identity`, `@azure/msal-node`, `@vscode/vsce` and `minimatch`.
Markdown-it is bundled runtime code. The other listed packages belong to the
packaging toolchain and are absent from the VSIX. Pins were preserved during
release preparation; these findings remain unresolved and are disclosed in the
release notes. The package check is not a clean dependency-audit claim.

## Installation and observation

The package was not installed into the working window and the window was not
reloaded. Notes, unsent drafts, source records and Zotero originals were not
changed. Native desktop clicking and PDF display remain unverified.

To update, download the VSIX and use **Extensions: Install from VSIX…** in the
WSL Debian workspace. Confirm `flengyel.mrw@0.23.13` on that host, save unfinished
work, then reload when requested. Reloading alone does not fetch the new package.
The [Zotero workflow](ZOTERO_WORKFLOW.md) and
[shared-history workflow](USAGE_HISTORY.md) state the supported behavior and limits.
