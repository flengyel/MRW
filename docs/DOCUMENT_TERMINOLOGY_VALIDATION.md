# Document terminology — 0.19.2

Delivered 2026-11-06 from design `a87d5473b3d9d574c2adbec86be5e9c754c2dafd`.
Fetched origin and fast-forwarded clean main from `82f310b`; no reset, discarded
work or forced push. The implementation is `6b65a02eede188fa49e5d5e9d273af9181e5690a`;
the clean package build is `f1d27f248a2fc82f8ed64b2cc13af439a2a4ceae`.

## Scope and compatibility

All 16 command-title mappings in
[the approved task](CODEX_DOCUMENT_WORKFLOW_PROMPT.md) are implemented. Document,
Contents, Saved source and Passage also replace the earlier application labels
in the reader, tree actions, welcome text, pickers, tooltips, loading/errors,
Markdown import destinations and bundled tutorial. Shared HTML captions retain
Proof outline, Proof study and Study for their respective views.

New Document creates Markdown through **New Markdown document**; Choose Document
uses **Choose a Markdown document for Contents**. The Markdown filter and
workspace bounds are unchanged. New files suggest `document.md` and `# Document`;
existing filenames and headings are untouched. Show Contents focuses the existing
navigator. It adds no general document opener, PDF contents or extraction.
Retain Document as Source still uses saved text and its selection. Refresh Saved
Source explicitly reloads saved reader state rather than reacquiring the original.
Import Markdown Text retains all three destinations, bounds and native save/undo
semantics. Optional explicit Obsidian association/opening remains available.

Manifest comparison confirms unchanged command/view IDs, settings, menus,
enablement and placement; only the specified command titles, Contents name,
welcome copy and version differ. Proof Outline and Studies keep their names.
Serialized fields, event names, `mrw-outline:v1` and the legacy `whole outline`
status remain unchanged. Human messages and defaults for newly created passages
change; existing source/note/study bytes do not. No storage migration was run.
Earlier validation reports retain the labels they observed; current guides now
use the delivered terms. The following research integrations remain planned in
[the design](RESEARCH_WORKSTATION_DESIGN.md).

## Checks

- Existing focused command scenarios: **13 passed**, covering creation,
  selection, import destinations, scope, cancellation, unsaved text and reopening.
- Existing reader/parser/link checks: **24 passed**, including original action
  payloads, exact return pins, proof controls and annotation drafts.
- Focused shared Python outline/reference/note checks: **40 passed**.
- Broader Node suite: **243 passed**, exit 0, in a disposable persistent ext4
  checkout. It includes retained-source/navigation/import/storage/study and
  0.19.1 reliability regressions. No new string-matrix test framework was added.
- Shared Python discovery: **402 run, 335 passed, 67 skipped**, exit 0.
  Skips are 58 opt-in Qt checks, five unavailable built Lean-checker cases,
  three opt-in isolated TikZ cases and one unauthorized `/mnt/c` project case.
- `compileall`, final `npm run check`, packaging and VSIX verification: exit 0.

After capturing the broader checkout, two storage-notification phrases dropped
the redundant source-outline term. The existing move-completion reader scenario
passed separately against final main (**1/1**). Other source/test hashes match
the broader checkout; the [compatibility record](evidence/document-terminology-20261106/compatibility.json)
identifies this display-only delta. Logs/status records remain in
`/tmp/mrw-0192-*`; committed evidence preserves source/package hashes and results.
Initial focused failures were old-copy expectations plus a storage qualification
case run under `/tmp`; final expectations and the persistent broader run pass.

## Interface observation and limit

An isolated headless Chrome page used the actual source renderer and ordinary
DOM with a host API facade and disposable published-source fixture. The dark
reader displays Saved source, Return to document, Refresh saved source, Whole
source and Passage controls. The refresh tooltip states its scope. An unsaved
annotation survives refresh, the unchanged return payload and proof folding;
there were zero runtime errors. Its screenshot was inspected. This observes the
reader, not native command menus, Contents placement or dialogs.

One isolated Windows VS Code development-host launch used a fresh profile and
disposable WSL project. It exited **255**, with empty stdout/stderr and no runner
report. Native interface observation remains unavailable. No retry campaign,
working-window reload/switch or manual study session was required.

## Package and preservation

A clean local clone at `f1d27f2` installed all 127 pinned build packages
with `npm ci --prefix vscode --ignore-scripts`. Tools: Node **24.22.1**, npm
**11.13.0**, Python **3.13.5**. The documented package command used `TZ=UTC` and
`SOURCE_DATE_EPOCH=1792094267`; the build checkout stayed clean.

Package: `vscode/theorem-terminal-0.19.2.vsix` (retained locally, Git-ignored).
SHA-256: `11760d7d2e216e13361018d5de9bb81a326c870a8a1106b385d9691903bfda99`.
The verifier accepted the exact **90 archive files**, production manifest,
runtime bytes and pinned renderer/parser/scheduler/license hashes. Tests, logs,
private notes, studies and history are excluded.

The package was installed through the established WSL code-server route.
Installed production manifest, **85 runtime files**, packaged README/license and
extension-registry version match. Normal VSCE README-link rewriting is retained.
All **69 inventoried genuine files** remain byte-identical after installation.
The current window and drafts were left open; the new labels activate with the
next ordinary reload. No public release or repository-visibility change occurred.
