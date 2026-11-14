# MRW 0.23.35 — Reopen changed documents

Published 14 November 2026 as a normal GitHub release, marked Latest:
[release and checksums](https://github.com/flengyel/MRW/releases/tag/v0.23.35).

## Source and assets

- Source A: `71868c866ec5b1e609012a4d050c8ad71f90b529`.
- Clean release/tag B: `6cbed78d97b2eee6ab0848d4f7932c851caede29`. Only `vscode/media/build-info.json` differs from A; it records A and `localChanges: false`.
- Built with Node 22.23.5, UTC and `SOURCE_DATE_EPOCH=1792094267`.
- [MRW core VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.35/mrw-0.23.35.vsix), SHA-256 `1c0a4547b7443b63a438c4186d21f6151e41a9ac6a6331bc42858bc089af10b5`.
- [Diagnostics 0.1.0](https://github.com/flengyel/MRW/releases/download/v0.23.35/mrw-diagnostics-0.1.0.vsix), unchanged, SHA-256 `4b4c5a3844273a24f635edea2de232bc2460c7599b91ca28f287d31f713d91f6`.

Main was fast-forwarded and pushed before tagging B. The verified draft's core,
Diagnostics and `SHA256SUMS` assets were checked before publication. All three
public downloads subsequently matched the local bytes and passed checksum
verification; Latest points to `v0.23.35` and the release is not a prerelease.
No earlier tag or asset was changed. This delivery report follows B and does
not change packaged source.

## Confirmed defect and repair

The working operation log identified failed Reopen Document calls in 0.23.33.
Reopen required its saved cursor's document revision to match exactly, so
editing a closed note or its selected range could prevent the file from opening.
It incorrectly imposed an exact-passage condition on ordinary reopening.

Reopen now opens current text. A matching selection is restored; a stale range
is not applied or searched for. A brief status message explains the unavailable
position, and a fresh position is persisted after successful opening. Dirty
buffers stay unsaved. Exact Return, backlinks and heading-target operations
keep their checks, as do file-scope, missing-file and redirect protections.
No saved-data format, source revision or command identity changed.

## Actual checks

| Check | Result |
| --- | --- |
| Complete document controller suite, including four new reopen cases | 59 passed; exit 0 |
| Navigation, links, document menus, picker and saved-document work | 50 passed; exit 0 |
| Retained reader opening and exact Return controller cases | 6 passed; exit 0 |
| Bundled tutorial | 3 passed; exit 0 |
| Production JS and native fixture syntax | Exit 0 |
| Changed-guide local Markdown targets | 170 targets, none missing |
| Pinned npm install and core bundling | Exit 0; dependency pins unchanged |
| Pinned npm audit | Exit 1: 2 moderate and 3 high findings, no critical findings |
| Clean-B VSIX build and exact inventory/runtime/licenses/build-marker verification | Exit 0 |
| Extracted Python CLI and disposable bridge annotation/restart/reference checks | Passed |
| Tracked paths/text and extracted VSIX searched for superseded project names | 0 matches |
| Local and downloaded core/Diagnostics checksums | Passed and byte-identical |

The native acceptance fixture used production commands in a separate VS Code
1.146.0 WSL window and ordinary disposable files outside the working workspace:

- Reopen opened revised text in the native Markdown preview and refreshed stale cursor metadata.
- Reopen preserved a native dirty buffer, its version and unchanged disk bytes.
- The original document Return remained available after reopening.

The document runtime in the final extracted VSIX is byte-identical to the
native-tested file. Native behavior was checked through VS Code's actual API;
no new screenshot/layout review is claimed. The fixture restored only its own
draft and closed its own window. The real working window and notes were not
modified or reloaded.

Initial focused tests reproduced both reported failure modes. An older test
encoded the obsolete changed-file refusal and was updated to require current
text without an obsolete selection. Existing menu-test failures were reproduced
on unchanged main; their helper omitted an existing equality predicate, so only
test assertions were corrected. Early controller invocation lacked the generated
development Python bundle; it passed after the established bundle step. The
first native fixture comparison read encoded relative paths directly; using the
production path decoder corrected the fixture and the complete native run passed.
Earlier logs are retained outside Git alongside the completed checks.

Compared with 0.23.34, the archive changes only `documents.js`, README/tutorial
and manifest/build metadata. Citation runtime, Python and Diagnostics are
unchanged. The full Python and full extension suites were not rerun for this
bounded JavaScript repair. The unchanged npm audit findings remain recorded;
dependency pins were not changed during this task.

## Installation and limits

Install the new core VSIX on the Linux/WSL workspace host, save unfinished work
and reload when ready. It includes the 0.23.34 Zotero citation repair. Existing
Diagnostics 0.1.0 needs no update. Publication did not install or reload MRW;
GitHub VSIX updates remain manual.

Reopen does not restore preview scrolling or PDF pages. A changed exact Return
target still requires selecting the intended occurrence; missing/redirected
files require an explicit choice. No mathematical checking is implied.
See [repair details](DOCUMENT_REOPEN_REPAIR.md),
[navigation](DOCUMENT_NAVIGATION.md) and [installation](INSTALLATION.md).
