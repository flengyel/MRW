# MRW 0.23.33 — plain reader notes

Published as the latest normal release:
[release page](https://github.com/flengyel/MRW/releases/tag/v0.23.33) ·
[core VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.33/mrw-0.23.33.vsix) ·
[checksums](https://github.com/flengyel/MRW/releases/download/v0.23.33/SHA256SUMS).

## Source and package

- Source A: `39cf28da64246822831317fe587cb976bf54fbcb`.
- Clean build/tag B: `57cf08d9bb2f61d8d79c53de4f5d87887e11c493`.
- B changes only `vscode/media/build-info.json`, naming A and `localChanges: false`.
- Core SHA-256: `ef8aae3ee47a4da0d65d6b3fafbacfa889ccc6cff389c34e630ba2027067de76`.
- Optional Diagnostics 0.1.0 SHA-256: `4b4c5a3844273a24f635edea2de232bc2460c7599b91ca28f287d31f713d91f6`.
  This asset is byte-identical to the 0.23.32 release; installed Diagnostics needs
  no update for this repair.

Current remote documentation was integrated before A; published tags and assets
were preserved. Main contains A/B. The GitHub draft's tag, ancestry, notes and
asset digests were verified before publication. Downloaded all three public
assets afterward: checksums pass and both VSIX files match local bytes. The
public latest-release route resolves to 0.23.33; `prerelease` is false.

## Result

**Add a note** opens focused text with **Save / Cancel**. Purpose classification
is removed; attribution and syntax guidance are collapsed optional details.
Existing kinds/provenance remain available. New unspecified notes use neutral
kind `note`, unknown origin and no author. Existing records are not migrated.
Older backends may reject the new kind; use the matching bundled extension.

Refresh preserves drafts and caret. A text-only draft preserves newer recorded
attribution rather than silently replacing it; explicit attribution corrections
remain editable. Cancel confirms discarding nonempty changes and cannot erase
newer typing while confirmation is open. Failed or uncertain Save retains drafts.

The narrow-reader toolbar scrolls away so the editor and primary controls fit.
LaTeX stays editable/rendered; TikZ uses the existing explicit isolated renderer.
No compiler, premise admission or mathematical check runs on Save. See
[workflow and evidence](READER_NOTE_WRITING.md).

## Checks and actual observation

- 52 reader/annotation/source/tutorial component checks: exit 0.
- 59 focused Python source, note, reference and diagram checks, including
  opt-in native TeX: exit 0.
- 16 affected extension-controller checks: exit 0.
- Syntax, changed local Markdown links and dependency-pin comparison passed.
- Clean packaging used Linux Node 22.23.5, UTC and epoch 1792094267. Exact VSIX
  inventory, runtime bytes, manifest, licenses and marker verification: exit 0.
- All tracked paths/text and extracted VSIX names/text were searched for the
  superseded project identity: zero matches.
- Extracted-package Python CLI and bridge ran in isolated mode, created and
  reopened a plain note, followed its exact retained reference and preserved
  original source bytes without using an installed backend.
- A separate Windows VS Code / WSL Debian fixture exercised actual webview text
  focus, keyboard Save, draft/caret refresh, Cancel, inline/display math and a
  real decoded TikZ SVG. Editor, Save and Cancel were visible at both tested
  native widths, with no horizontal overflow. Discard choices and a rerender
  rejection were injected only in the disposable host. Rejection retained the
  exact editable note and earlier valid diagram.

Initial fixture setup/focus, probe lookup and obsolete-label assertions failed
and were corrected. Early screenshots were obscured or DPI-cropped; a later
observation exposed actual toolbar crowding, which was repaired. Logs and those
attempts remain under `~/.cache/mrw-plain-reader-notes-20261114/`. The final native
report completed with no errors. No full application-suite rerun is claimed.

Pinned dependencies were preserved. npm audit still reports two moderate and
three high build-dependency findings. No genuine source, annotation, vault note,
template or working window was modified by the fixture checks.

## Installation and remaining work

The working window remains on installed MRW 0.23.32; this delivery did not
install or reload it. Install the 0.23.33 core VSIX in WSL Debian and save work
before a requested reload. Diagnostics 0.1.0 is unchanged.

Study History's repeated inventories/empty study summaries and two older
confirmed test/demo entries in the working source list remain separate pending
cleanup. This release does not silently remove saved work. Broader reconstruction
and integration requirements remain in the [design register](DESIGN_RECONCILIATION.md).
