# Reader-note repair — MRW 0.23.12

Published 11 November 2026 as a normal GitHub release, marked Latest:
[release](https://github.com/flengyel/MRW/releases/tag/v0.23.12),
[VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.12/mrw-0.23.12.vsix),
[checksums](https://github.com/flengyel/MRW/releases/download/v0.23.12/SHA256SUMS).

## Delivered behavior

Every expanded retained passage has one action row, ordered **Add reader note ·
Delete reader note… · Link Obsidian note… · Ask AI about this passage…**.
The row can wrap when the reader is too narrow. Add opens the existing editor
at that passage and focuses its text field. It makes no provider request.
Linked reader notes are shown beside the exact retained passage; links to an
older range remain separate. Opening, changing and removing links use the
existing Obsidian association controls.

Delete is disabled for an empty passage. With multiple annotations it asks which
one to remove, then confirms. A pending deletion freezes the affected passage's
annotation editors. Cancellation or failure preserves drafts; confirmed deletion
clears only the selected note's draft. External vault notes, source text and other
annotations are preserved.

The repair reuses the existing store and formats. Revision comparison occurs
again after dialogs and under the publication lock. Regression checks establish
that a stale whole-record writer and a late edit cannot restore a deleted note.
Process exits immediately before or after atomic replacement leave one complete
snapshot and release the lock. An uncertain directory-sync failure blocks later
private writes and does not report confirmed success. These guarantees concern
local records under the existing single-writing-host restriction; they do not
provide distributed transactions.

TikZ reader annotations remain supported: save a fenced `tikz` block, expand
**Reader notes**, then choose **Render diagram**. A fresh-process check of the
packaged bridge compiled and reopened an attributed example showing the pullback
for the two copies of a map and its diagonal. It was saved only as a disposable
test annotation and a separate example, not inserted into genuine reading notes.
Compilation does not check commutativity or mathematical correctness.
See [TikZ workflow](TIKZ_WORKFLOW.md) and [reader controls](READER_AI_WORKFLOW.md).

## Exact build and integration

- Implementation: `9526869`.
- Initial tested build: `f27fac5`.
- Final source A: `b833b8875433937ffac3385cf12421c34e6f1d93`.
- Final marker-only B, tagged `v0.23.12`:
  `ca32b33028fdc2f32d3523ed995b501557f9080e`.
- A incorporates the intervening main documentation through `5a60d7f`; runtime
  files are unchanged from the tested initial build. No concurrent commits or
  local work were reset.
- Embedded marker: version `0.23.12`, A's full SHA, `localChanges: false`.
- VSIX built from clean B: 645,182 bytes; 136 archive entries.
- SHA-256: `75efe092a08b32b4a4464f3e460af037dfdb6e565b5f0d921d2777c3fa3346f4`.

Dependency pins and earlier release assets/tags are unchanged. This report and
continuation status were committed after B and are not claimed as packaged bytes.

## Checks and observations

| Check | Actual result |
| --- | --- |
| Full Python suite | 432 tests: 364 passed, 68 skipped; exit 0 |
| Focused source-outline suite | 26 passed; exit 0 |
| Full extension run | 400 tests: 391 passed, 4 failed, 5 cancelled during host memory trouble; original shell exit status was not retained |
| Serial rerun of the nine affected artifact operations | 9 passed; exit 0; all 400 checks have passing coverage across the two runs |
| Opt-in diagram suite | 15 passed, including actual isolated TeX compilation, external-file refusal, timeout and multipage checks; exit 0 |
| Syntax and tutorial | Syntax checks passed; three tutorial tests passed |
| Relative documentation targets | 331 resolved, none missing before release |
| Build and VSIX verifier | Passed; exact inventory, runtime bytes, manifest, marker, tutorial, README and bundled notices inspected |
| Identity searches | 469 tracked files and 136 package entries searched; no superseded project identities |
| Extracted package | Isolated Python bridge parsed the proof fixture; separate-process annotation, diagram and external-link checks passed |
| Published assets | Anonymous downloads match local bytes; checksum passes; tag points to B; release is public, normal and Latest |

The full Python run's skipped checks include optional Qt and diagram tests. The
later opt-in diagram run covers its four skipped native diagram cases. No new Qt,
Lean-checker or mathematical proof result is claimed.

Native end-to-end desktop acceptance remains incomplete. A disposable Windows
VS Code 1.145.3 / WSL test used production webview code and handlers with automated
dialog answers. The first wrapper failed on a proxy setter; after its repair,
the wrapper clicked Save before source creation had released the action lock.
The host correctly rejected that action. After adding a startup handshake,
development-host relaunches did not complete. A remote-CLI fallback opened an
ordinary window and explicitly ignored the development-extension option. That
window was inspected and closed; it does not establish acceptance. The failure
reports remain in local evidence. No successful complete native add/delete/link
interaction is claimed for this patch.

The independent packaged-bridge trial used one authorized temporary Markdown
file in the real vault and a disposable source store. It linked the exact passage,
reopened the association in another process, removed the link, and reopened the
saved annotation and diagram. The vault file and source bytes stayed identical.
Only that unchanged temporary vault file was removed afterward. Obsidian itself
was not launched by this trial. Genuine annotations, notes and study data were
not modified. The working extension was neither installed into nor reloaded.

The pinned npm audit reports five unresolved findings: two moderate and three
high. The patch preserves pins. The existing Windows-backed private-store and
single-writing-host limitations remain; ordinary vault files are distinct from
MRW private storage.

Logs, actual exit-status files, package checks, wrapper failures, the public
download record and the separate diagram example are retained outside the
repository in `~/.cache/mrw-releases/0.23.12-20261111/`. The missing original
extension-run exit status is not reconstructed. GitHub updates require installing
the newer VSIX, then reloading when ready; reloading alone does not download it.
