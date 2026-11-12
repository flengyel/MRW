# MRW 0.23.18 delivery

Published 12 November 2026 as a normal GitHub release, marked Latest:
[MRW 0.23.18 — default Linux workspace](https://github.com/flengyel/MRW/releases/tag/v0.23.18).

[Download the VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.18/mrw-0.23.18.vsix) · [SHA256SUMS](https://github.com/flengyel/MRW/releases/download/v0.23.18/SHA256SUMS).

## Source and package

- Source A: `09f4480a90cdbec037bdfdd7a7b8ae79268c946e`.
- Release B/tag `v0.23.18`: `b126c4ce7248bfd8b0fcf4d1c9f309ea65ea3cfa`.
- B changes only `vscode/media/build-info.json`; its marker identifies A and
  declares `localChanges: false`. Build began and ended at clean B.
- VSIX: 676,374 bytes.
- SHA-256: `6e5630d71ee1667f6c1a07c8112526729c9a249ebce9a2ea5ee1c650a98312e5`.
- Main and tag were pushed without rewriting earlier commits or releases.
  This report is a subsequent documentation commit; it does not change the VSIX.

## Delivered behavior

**Set Up MRW Workspace…** creates or reuses `~/mrw-work/MRW.code-workspace`,
with generic folder name **MRW**. It preserves existing workspace settings,
comments, README edits and files. Interrupted preparation can be retried;
exclusive publication prevents competing setup runs from overwriting each other.
Windows/network and volatile mounts and redirected target paths are rejected.
Python is checked on the workspace host. Setup installs no system dependencies.

Opening is explicit and uses a new window. The current window, native drafts and
MRW forms stay open. Repeating setup from the default workspace offers no second
window. Notes remain independently selected; new Lean projects can use
`mrw.leanStudyParent` on Linux while existing copies retain their locations.
The installation guide, tutorial, Obsidian and SagePod guidance explain this
layout and optional prerequisites.

Whole-workspace atomic relocation is **not implemented**. The existing artifact
mover switches a narrower saved-source binding. Its scope excludes active
Studies, recorder history and much editor/resumption state. The
[relocation contract](WORKSPACE_RELOCATION_DESIGN.md) is the next setup task.
No source-store move, workspace-state merge or Obsidian routing change occurred.

## Checks and exact scope

- Full extension regression run: **474 passed**, zero failures/skips, covering
  implementation `3b0975691c247c8699f34dde2545f4380e37094d`.
- The final mount rejection change at A passed **12 focused setup checks** on
  persistent Linux fixtures. Other extension runtime files were unchanged after
  the full run. Cases include concurrent setup, interrupted publication,
  directory-sync retry, custom settings, symlinks, volatile/network mounts,
  explicit opening and preservation of dirty work in the original window.
- Lean integration: **9 checks passed**, including a Linux parent taking
  precedence over a notes folder and retained study paths/edits surviving a
  changed configuration. Lean proof files and toolchain pins are unchanged.
- Python: **432 tests**, **68 optional skips**, zero failures with persistent
  `TMPDIR`; source compilation passed. Skips include opt-in Qt/TikZ cases and
  the unbuilt pinned Lean checker. No new Lean mathematical verification is claimed.
- Syntax checks, tutorial checks, **399 local Markdown links**, `git diff --check`,
  package construction and exact VSIX inventory/byte verification passed.
- At B, searched **496 tracked paths**, **489 UTF-8 files** and **147 archive
  entries**: zero superseded project-name occurrences. Package comparison with
  0.23.17 found only the intended JS, documentation, version and marker changes;
  Python and Lean bytes are unchanged.
- Extracted-package setup created/reused a disposable persistent workspace and
  reused the actual default. Its isolated Python bridge reviewed the exact Unicode
  fixture passage. No earlier MRW Python installation supplied the bridge.
- Anonymous downloads of both published assets match the verified local bytes.
  `sha256sum -c SHA256SUMS` passed locally and for the downloads. The public tag,
  release metadata, Latest designation and README download link agree.

Initial failures remain in the logs: the fresh worktree needed its Python bridge
bundle before extension tests; the first Python run had one managed-store test
reject memory-backed `/tmp`. The corrected full runs passed. No production
storage checks were disabled to obtain those results.

## Host observations and preservation

On Debian 13, `/home/flengyel` is ext4 and Python is 3.13.5. The actual default
was created at `/home/flengyel/mrw-work/MRW.code-workspace`, with
`/mnt/c/Users/fleng/Zettelkasten` as its notes folder. A second process reused it.
Hashes of **226 selected existing files**—the earlier workspace and Obsidian
routing configuration, two open notes, Lean working files and retained-source
files—were unchanged across preparation.

No connected Codex document-control session was available. New native command
appearance and opening a new VS Code window were not observed. Command behavior
was tested through API doubles; filesystem preparation and extracted runtime
checks were executed on the actual Linux host. The working window was neither
closed nor reloaded. The VSIX was **not installed** into it.

Evidence, commands, exit statuses, initial failures, package extraction, hashes
and downloaded assets are retained outside tracked source at
`~/.cache/mrw-default-workspace-20261112/`.

## Dependency audit

Unchanged pins report **five findings: three high, two moderate**. `markdown-it`
is bundled. The other affected packages (`@azure/identity`, `@azure/msal-node`,
`@vscode/vsce`, `minimatch`) are packaging dependencies excluded from the VSIX.
These findings remain open; no automatic dependency update was performed.
