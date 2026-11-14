# MRW 0.23.34 — Zotero citations in existing notes

Published 14 November 2026 as a normal GitHub release, marked Latest:
[release and checksums](https://github.com/flengyel/MRW/releases/tag/v0.23.34).

## Delivered source and packages

- A: `5e4a0e1cca0dc5399753121955900776f67567e7` — citation repair, focused tests, current guides and version metadata.
- B/tag `v0.23.34`: `7f18aa7d1531ac9c17b0774cb2b4e44e4e43d3d8` — only `vscode/media/build-info.json`, naming A with `localChanges: false`.
- Built from clean B using Node 22.23.5, UTC and `SOURCE_DATE_EPOCH=1792094267`.
- [Core VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.34/mrw-0.23.34.vsix), SHA-256 `183a6699ee78b44dde67b5ff2896d9710d25371af34d929c78db89e3fdb74e0d`.
- [Diagnostics 0.1.0](https://github.com/flengyel/MRW/releases/download/v0.23.34/mrw-diagnostics-0.1.0.vsix), unchanged, SHA-256 `4b4c5a3844273a24f635edea2de232bc2460c7599b91ca28f287d31f713d91f6`.
- Both public packages and `SHA256SUMS` were downloaded from their versioned URLs, compared byte for byte with local assets, and passed `sha256sum -c`. The public Latest redirect and non-prerelease status were verified.

The repair was fast-forwarded to main and pushed before tagging B. No existing
release tag or asset was changed. This report is a subsequent documentation
commit and does not change the packaged source.

## Confirmed repair

The Number Fields note's `[@marcusNumberFields2018]` now renders as
**(Marcus 2018)**. Its Obsidian companion selected live Zotero lookup, while
MRW had used an older local export missing that key. MRW now requests only the
cited keys from the selected Better BibTeX libraries through the read-only
`item.pandoc_filter` method. Explicit local bibliographies retain precedence.
Missing/ambiguous keys stay visible; no guessed reference or library write is
used. WSL tries host-PATH `pandoc.exe` after a missing `pandoc` command.

An isolated VS Code 1.146.0 WSL development window visibly displayed the actual
note's formatted citation and bibliography using Zotero 10.0.8 / Better BibTeX
9.0.77. The successful run took about 4.8 seconds. A separate dirty fixture
remained unsaved and unchanged. After that observation, late-response lifecycle
handling was hardened and tested; the final clean-B extracted package then
independently resolved the same live citation. The final VSIX was not installed
into the working window or used for another native-window campaign.

The real note's SHA-256 before and after both checks was
`fd9db8897fb1d828e03b9d3a3c37e69ec4dc2b673c74671a36950082aad4530e`.
The packaged check also verified unchanged hashes for the selected bibliography
export and companion configuration. No note, citekey, template, bibliography,
Zotero record, saved research or working-window state was changed. Private
screenshots/logs remain outside tracked source and packages.

## Checks and their scope

| Check | Actual result |
| --- | --- |
| Citation, Better BibTeX, Zotero, annotation and continuation regressions, serialized | 65 passed, no skips; exit 0 |
| Reader view, source reader and tutorial | 39 passed; exit 0 |
| Source-outline opening/editing and annotation publication controller checks | 3 passed; exit 0 |
| Tutorial after documentation edits | 3 passed; exit 0 |
| Production JS syntax and native fixture syntax | Exit 0 |
| Changed-guide local Markdown targets | 211 targets found; none missing |
| Pinned npm install | Exit 0; dependency pins unchanged |
| Pinned npm audit | Exit 1: 2 moderate, 3 high, no critical findings; reported packages @azure/identity, @azure/msal-node, @vscode/vsce, markdown-it and minimatch |
| VSIX build and exact inventory/runtime/license/manifest/build-marker verification | Exit 0 |
| Extracted Python CLI/bridge, annotation restart and exact retained-reference reopening | Passed in disposable storage |
| Extracted live citation lookup against the unchanged Number Fields note | (Marcus 2018), bibliography present |
| Every tracked path/text and extracted VSIX searched for superseded project names | 0 matches |
| Final local and downloaded asset checksums | Both packages passed and matched |

The comparison with 0.23.33 found changes only in citation processing,
its reader caller, the new lookup/Windows transport, README/tutorial and
version/build metadata. Python runtime and Diagnostics bytes are unchanged.
The full Python and full extension suites were not rerun for this bounded
JavaScript repair. Earlier unsuccessful fixture runs and a terminated broader
test invocation were retained; the final serialized checks above completed.

## Installation and remaining limits

Install the new core VSIX on the Linux/WSL workspace host, save unfinished work
and reload when ready. Existing Diagnostics 0.1.0 needs no update. Publication
did not update or reload the working window. GitHub VSIX updates remain manual.

Live formatting requires Zotero with Better BibTeX and trusted Pandoc. The
existing companion live-library selection is reused; local bibliography mode
remains available. Rendering is asynchronous and current metadata is a snapshot,
not an immutable retained revision. Narrative `@key`, remote/dependent styles
and automatic matching of the companion's remote CSL style remain unsupported.
Formatting does not check mathematics.

See [citation setup](ZOTERO_WORKFLOW.md#citation-rendering-in-existing-notes),
[repair details](CITATION_ZOTERO_REPAIR.md) and
[installation](INSTALLATION.md). Other pending work remains in the
[design register](DESIGN_RECONCILIATION.md).
