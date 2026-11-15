# MRW 0.23.39 — Icon help and readable History

Published 15 November 2026 as a normal release and marked Latest:
[release and checksums](https://github.com/flengyel/MRW/releases/tag/v0.23.39).

## Source and downloads

- A: `5f97f02f4edfbd61c419e06f16b8d91afdd18575` — icon guide, History presenter, regressions, current guides and version metadata.
- B/tag `v0.23.39`: `a802c739b9fb348c4b244b8b9f9dfd2e183bd32d` — only the build marker, naming A with `localChanges: false`.
- Clean-B build: Node 22.23.5, UTC, `SOURCE_DATE_EPOCH=1792094267`.
- [Core VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.39/mrw-0.23.39.vsix), SHA-256 `e7bf5dcdddb7c260211350833da4942e3c9a21f0dbd4508ec8113db12d6d1900`.
- Diagnostics 0.1.0 is unchanged, SHA-256 `4b4c5a3844273a24f635edea2de232bc2460c7599b91ca28f287d31f713d91f6`.

Main and tag were pushed before drafting. The core, unchanged Diagnostics and
`SHA256SUMS` were checked before publication, downloaded through public URLs
and compared with local bytes. Both VSIX checksums pass; Latest resolves to
0.23.39. Earlier tags/assets remain intact. This report does not change the package.

## Repairs against the design

The source baseline was `28f7ae16fda35b2e94e0f8810cd3a94be2db9ea7`.
D08 governs explanatory Lean controls; D16 records the confirmed History clutter.
The smallest repair keeps the existing controls, journal and export formats.

The first lesson, bundled tutorial and Lean workflow now identify the Lean menu,
Pin, Pause/Play, paused Refresh, goal settings and MRW document menu. Meanings
were checked against the installed official Lean extension 0.0.242 manual and
its InfoView illustration, with its primary online manual linked in the guide.
No native Lean controls were replaced. Pack content version is 1.1.4; existing
copies and personal code/notes remain untouched.

The History inspector previously expanded every availability group, generated
empty study-measure sections and appended up to 100 raw event payloads. It now
opens a compact projection of existing production observations. Startup and
availability rows are collapsed; an empty selection produces one concise state.
Root operations use readable command titles and their explicit invocation links.
Missing, inconsistent or ambiguous endings remain labelled. Earlier source
navigation and substantive study events remain visible without reading snapshot
bodies. Nested bridge calls, scheduled actions and test/development records do
not become ordinary activity rows.

Sessions use reported timestamps for presentation, retaining sequence order
within a session under clock rollback. At most 100 activity entries are shown.
Gaps, disabled-recording observations, conflicts and unclean/unobserved endings
remain visible. The existing detailed comparison and JSON event/snapshot exports
retain their records, schemas, identities and supporting context. No Study or
question form was added. The user no longer has to scan startup JSON or empty
measure tables to find recorded actions.

The presenter consumes the recorder's already merged events; it does not perform
a second full-payload merge. The existing whole-history load/sync path remains
unchanged. The display cap is not a new I/O or peak-memory guarantee. Broader
resource scaling, feature-availability coverage and saved-source Delete/Restore
controls remain pending in the reconciliation register.

## Verification

| Check | Actual result |
| --- | --- |
| Focused History, sharing/recovery, lifecycle, measurement, Lean and tutorial suites | 106 passed, no skips; exit 0 |
| Final presenter fixture / bundled tutorial checks | 10 / 3 passed |
| Production JavaScript syntax including the presenter | Exit 0 |
| Changed Markdown local files/anchors | 179 checked, none missing |
| Programmatic lesson/KaTeX rendering | All 3 lessons and 55 formulas pass |
| Pinned npm installation and core bundling | Exit 0 |
| Pinned npm audit | Exit 1: 2 moderate, 3 high, none critical; pins unchanged |
| Clean-B VSIX inventory, runtime, licenses and marker | Exit 0 |
| Tracked paths/text and extracted VSIX searched for superseded names | 0 matches |
| Extracted activity presenter and preserved detailed report | Passed; input records unchanged |
| Extracted Python CLI, isolated bridge note restart and exact reference | Passed |
| Public assets compared with local bytes and checksums | Both VSIX assets passed |

The controller regression retains every earlier event and exact submitted
snapshot bytes across inspection, and confirms detailed coverage and snapshot
export remain available. Cases cover startup-only journals, parent/child
operations, missing/inconsistent endings, duplicates/conflicts from the existing
merger, test/scheduled/supporting records, clock rollback, offset timestamps,
display truncation, disabled recording and history notices.

In the extracted-package fixture, 152 input records
produced a 847-character activity view; the detailed
comparison remained available at 3117 characters.
These are synthetic display checks, not observations of the user's mathematical
work or a benchmark of large-history loading.

Tests used disposable stores outside the real workspace and vault. No genuine
notes, submitted work, saved research, schedule or history was changed. No new
native-window trial was run; icon functions were checked from the owner manual,
and new report/controller behavior was checked programmatically. Full Python
and extension campaigns and Lean recompilation were not repeated for this
bounded presentation repair. Archive comparison preserves Python, Lean and
unrelated runtime bytes against 0.23.38. Logs and private fixtures remain outside
tracked source and release assets.

## Activation

Install the core 0.23.39 VSIX on the Linux/WSL workspace host, save unfinished
work and reload when ready. Diagnostics needs no update. This delivery did not
install into or reload the working window. **MRW: Open Tutorial** supplies current
packaged icon help after activation; existing copied lessons retain their text.

See [icon help](LEAN_STUDY_WORKFLOW.md#icons-and-controls),
[History](HISTORY_ACTIVITY_VIEW.md) and [installation](INSTALLATION.md).
