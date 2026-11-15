# MRW 0.23.36 — Recent notes and documents

Published 14 November 2026 as a normal GitHub release and marked Latest:
[release and checksums](https://github.com/flengyel/MRW/releases/tag/v0.23.36).

## Committed source and downloads

- A: `c6d0d3304f067a9aba1bc2ab42ae1ff632ddf058` — recent-file implementation, tests, guides and version metadata.
- B/tag `v0.23.36`: `efc58db9ec73a38068f455639a7dc7ab5ca05ffb` — only the build marker, naming A with `localChanges: false`.
- Clean-B build: Node 22.23.5, UTC, `SOURCE_DATE_EPOCH=1792094267`.
- [Core VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.36/mrw-0.23.36.vsix), SHA-256 `1e5c2ff39e8135f7171296d63e0f56a2c785acc56434cfa1bfdc9112cbf43cca`.
- [Diagnostics 0.1.0](https://github.com/flengyel/MRW/releases/download/v0.23.36/mrw-diagnostics-0.1.0.vsix), unchanged, SHA-256 `4b4c5a3844273a24f635edea2de232bc2460c7599b91ca28f287d31f713d91f6`.

Main and tag were pushed before drafting the release. The uploaded core,
Diagnostics and `SHA256SUMS` assets were checked before publication. All three
public downloads then matched local bytes and passed checksum verification.
Latest points to `v0.23.36`; no earlier tag or asset was changed. This later
report commit does not change the package.

## Delivered interaction

Recent Documents is directly beside Open Document, in Reading and notes, and
in the MRW Document menu. The existing thirty-entry workspace list now includes
PDFs and text files. Existing recent notes and their command/storage IDs remain.
Markdown rows show their current title with the filename; other rows show the
filename and path. PDF bodies are not decoded for titles.

Opening a row preserves dirty text and a known Return destination. PDF Return
is file-level. Current authorization and recorded canonical paths are checked
through opening; history never grants access or redirects to another file. An
unapproved current pane does not prevent opening an authorized recent document
or acquire a Return pin. No document import or storage migration occurs.

The old note-only list never recorded PDFs. The same picker now offers VS Code
file history through native Quick Open (Ctrl+P), following the editor's settings.
Permitted files opened there enter MRW's list. MRW does not read or rewrite the
editor's history database or claim an MRW Return pin for a native-history choice.

## Checks and native observations

| Check | Actual outcome |
| --- | --- |
| Recent-file, document and menu suites | 72 passed, no skips; exit 0 |
| Navigation, links, picker, saved-document and companion grouping | 52 passed; exit 0 |
| Retained-reader/Return and related controller cases | 7 passed; exit 0 |
| Bundled tutorial | 3 passed; exit 0 |
| Production JS and native fixture syntax | Exit 0 |
| Released Markdown local targets | 234 checked; none missing |
| Pinned npm install and Python-core bundle | Exit 0; pins unchanged |
| Pinned npm audit | Exit 1: 2 moderate and 3 high findings, none critical |
| Clean-B VSIX build and exact inventory/runtime/licenses/marker verification | Exit 0 |
| Extracted Python CLI, isolated bridge annotation restart and retained reference | Passed |
| Every tracked path/text and extracted VSIX searched for superseded project names | 0 matches |
| Published assets downloaded and compared with local bytes | Both VSIX checksums passed |

An isolated development candidate passed the native VS Code 1.146.0 WSL workflow
with two generated PDFs through LaTeX Workshop (`latex-workshop-pdf-hook`): native
tab events recorded both PDFs and the titled note; Recent Documents reopened the
earlier PDF; Return reopened the other PDF; the unsaved note remained unsaved.

That complete native pass preceded the final optional-origin guard, covered by
the component suites. A subsequent native selection check chose the wrong row
because the fixture assumed an initial picker position. The fixture was changed
to select its target explicitly. Further launcher/readiness coordination timed
out; final-candidate native tab capture passed, but complete final picker/Return
acceptance remains unverified. A UI Automation text capture also encountered
an output-decoding error. These failures are preserved outside Git, not counted
as passes. The final copied candidate runtime matches package bytes; that byte
comparison alone is not native acceptance evidence. Fixture drafts were restored
and their windows closed; the working window was not reloaded or modified.

## Citation follow-up

Installed 0.23.35's read-only adapter returned **(Marcus 2018)** for the unchanged
Number Fields note. A separate fresh native preview, with zero manual renderer
calls, visibly showed the formatted citation. The note SHA-256 before and after
was `fd9db8897fb1d828e03b9d3a3c37e69ec4dc2b673c74671a36950082aad4530e`.
An earlier accessibility-text sample still contained the raw key; the later
captured image showed the formatted text. Formatting remains asynchronous.
The reader's current pane was not forcibly refreshed. No citation runtime,
Pandoc export behavior, bibliography, template or Zotero data was changed here.

Compared with 0.23.35, archive changes are limited to recent-file/navigation/group
code, README/tutorial and manifest/build metadata. Python and citation runtime
bytes are unchanged; full Python and extension suites were not rerun for this
bounded JavaScript increment. Private screenshots, fixture data and logs remain
outside tracked source and packages.

## Installation and limits

Save unfinished work, install the core 0.23.36 VSIX in the Linux/WSL workspace
host and reload to activate it. Diagnostics 0.1.0 needs no update. Publication did
not install into or reload the working window. GitHub VSIX updates remain manual.

Earlier PDFs may need the native-history entry once. The list does not reproduce
all Obsidian editing history, restore PDF pages/preview scrolling or follow a
missing/redirected path. A changed file requires an explicit Open Document choice.
Ordinary notes, annotations, retained sources, studies and original files were
preserved. No mathematical checking is implied.

See [Recent Documents](RECENT_DOCUMENTS.md),
[navigation](DOCUMENT_NAVIGATION.md), [citation setup](ZOTERO_WORKFLOW.md#citation-rendering-in-existing-notes)
and [installation](INSTALLATION.md).
