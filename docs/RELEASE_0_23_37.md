# MRW 0.23.37 — Citation source details

Published 14 November 2026 as a normal release, marked Latest:
[release and checksums](https://github.com/flengyel/MRW/releases/tag/v0.23.37).

## Source and package

- A: `f3da6fcda436ee632f935cad38eebff29839c33c` — citation notices, tests, guides and version metadata.
- B/tag `v0.23.37`: `f9991980bdd55b3384b1c7b4d829bbc0522487c9` — only the build marker, naming A with `localChanges: false`.
- Built from clean B with Node 22.23.5, UTC and `SOURCE_DATE_EPOCH=1792094267`.
- [Core VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.37/mrw-0.23.37.vsix), SHA-256 `b33850f68e2804fd1991bf8a99a620c4b9813006b0b220b928ac249e6c19b558`.
- Diagnostics 0.1.0 is unchanged, SHA-256 `4b4c5a3844273a24f635edea2de232bc2460c7599b91ca28f287d31f713d91f6`.

Main and tag were pushed before drafting. Both VSIX files and `SHA256SUMS` were
checked in the draft; all three public downloads then matched the local bytes.
Latest resolves to 0.23.37. Earlier tags/assets were left intact. This later
report commit does not change the package.

## Source identification

The live snapshot notice keeps its read time and now names each selected
library, its Better BibTeX ID and Windows/local Zotero host. The packaged adapter
reported **“My Library” (BBT library 1); Windows Zotero** and rendered the Marcus
key as **(Marcus 2018)**. Optional names come from `user.groups(false)`; only
selected library names appear. This requests no collections or item contents.
It uses a shorter timeout, and a missing or malformed name reply cannot discard
resolved citations. Default personal-library lookup remains labelled My Library.

The supported live API exposes no database filename or path. MRW does not infer
one from an export setting. When a local bibliography is actually read, its
relative filename appears in the notice, including an offline fallback. Several
inputs are listed separately. Inline references identify the containing note.
The reader can identify these inputs without opening companion configuration.
Library identity and a preview read time remain distinct from an immutable
retained citation or source revision.

## Verification

| Check | Actual result |
| --- | --- |
| Citation, Zotero, shared reader and tutorial regressions | 57 passed, no skips; exit 0 |
| Production JavaScript syntax | Exit 0 |
| Changed Markdown local files/anchors | 146 checked, none missing |
| Pinned Linux npm install | Exit 0 |
| Pinned npm audit | Exit 1: 2 moderate, 3 high, none critical; pins unchanged |
| Clean-B build and exact VSIX inventory/runtime/marker/licenses | Exit 0 |
| Every tracked path/text and extracted VSIX searched for superseded names | 0 matches |
| Extracted Python CLI and isolated bridge annotation/restart/exact reference | Passed |
| Extracted live Windows Zotero/Pandoc Marcus lookup and library notice | Passed |
| Windows transport rejects unsupported method/case/parameters | 5 cases passed |
| Published VSIX bytes and checksums | Both passed; match local package |

Regressions cover multiple selected libraries, unrelated libraries, duplicate
IDs, wrong response identity, invalid/oversized names and replies, unavailable
metadata, cancellation, HTML escaping, explicit local bibliography precedence,
several bibliography files, labelled offline fallback and unchanged dirty text.

The real Number Fields note, configured local export and companion configuration
were hashed before and after the packaged read-only check; all were unchanged.
The note SHA-256 was `fd9db8897fb1d828e03b9d3a3c37e69ec4dc2b673c74671a36950082aad4530e`.
No fixture notes were written into the vault and no Zotero mutation was sent.

The isolated native VS Code 1.146.0 WSL preview became ready after the
launcher's readiness deadline. It opened the existing note, made zero manual
renderer calls, verified unchanged source bytes and closed its own clean
window after its timeout. The new notice was not captured or visually observed
there. That is a native observation limit, not a passed notice-display check.
The packaged owner lookup and preview HTML escaping checks passed independently.
Private logs and fixture evidence remain outside source and release assets.

Compared with 0.23.36, archive changes are limited to the two citation JavaScript
modules, Windows citation transport, README/tutorial and version/build metadata.
Python and unrelated reader/navigation bytes are unchanged. Full Python and
extension campaigns were not repeated for this bounded notice increment.

## Installation and limits

Install the core 0.23.37 VSIX on the Linux/WSL workspace host, save unfinished
work and reload to activate. Diagnostics needs no update. This delivery did not
install into or reload the working window. Updates from GitHub remain manual.

Zotero names are current owner metadata, not filenames or retained revisions.
Name lookup may be unavailable while exact-key lookup succeeds; selected IDs
remain visible. Citation rendering still requires trusted Pandoc and scoped
inputs; narrative @key, remote/dependent styles and exact companion-style
matching remain unsupported. Existing documents, source notes, annotations,
saved research and links are preserved. No mathematical checking is implied.

See [citation setup](ZOTERO_WORKFLOW.md#citation-rendering-in-existing-notes)
and [installation](INSTALLATION.md).
