# MRW 0.23.21 — document navigation

Published as a normal GitHub release and Latest:
[release](https://github.com/flengyel/MRW/releases/tag/v0.23.21) ·
[VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.21/mrw-0.23.21.vsix) ·
[SHA256SUMS](https://github.com/flengyel/MRW/releases/download/v0.23.21/SHA256SUMS).

- Final source A: `397bc5800029ff75114340d490fcc93b3902a46e`.
- Marker-only B and tag: `0d2a8af14a2af992fa96c3b7aebb6a997981f0be`.
- VSIX SHA-256: `884515675ae8ab910dfdbbe0b9f0f6afb9d4e41e7e3478f83e78c47a8a14efc8`.
- Built from clean B, with A in the build marker and `localChanges: false`.

## Changes

The editor toolbar's **MRW Document** menu groups Return and backlinks for PDFs,
text files and Markdown. Only Markdown offers Contents, source editing and
Obsidian actions. Its conditions cover local and remote-file contexts in
WSL/SSH windows. Study Current Material and Lean's secondary InfoView action
are editor overflow actions. Command IDs and native saved view placement remain.

Backlinks, Show Contents and Edit Document Source honor the tab supplied by the
editor menu. Show Contents and Edit Document Source reject a PDF instead of
opening a different Markdown note. Return retains its exact referring occurrence;
a return to a PDF reopens that file. The tutorial and current guides describe
these controls. See [document navigation](DOCUMENT_NAVIGATION.md).

No note or study registration was introduced. Existing notes, saved research,
annotations, ordinary files and dirty buffers are unchanged. No data migration,
installation or window reload was performed.

## Checks and source state

- The full serialized extension suite passed **518 tests**, with no failures or
  skips, at `713be18de37c11fb228c69b62d0a9069538c35ac`.
- The full Python suite at that commit ran **442 tests**, with **68 optional
  skips** and no failures. Python production bytes are unchanged in final B.
- Final review then corrected the menu conditions to include `vscode-remote`
  resources. Relative to the full-suite commit, only the manifest conditions,
  their test, two guide passages and the build marker changed. All JavaScript
  and Python production files and the bundled tutorial are byte-identical.
- On final B, both menu checks passed, including local/remote and virtual-file
  cases. Three extension command checks passed: activation, registered menus,
  and explicit-tab navigation with dirty-buffer preservation.
- The document-controller checks include PDF backlinks, cancellation, changed
  focus, restart Return, scope rejection and unchanged original file bytes.
  The first new test assumed a text editor remained active after a preview
  opened. Its assertion was corrected to inspect the displayed selection;
  the final checks passed.
- Syntax and tutorial checks passed. The clean VSIX verifier checked exact
  inventory and runtime bytes. Packaged README, tutorial, manifest and source
  marker were inspected. **383** local Markdown link targets resolved.
- Tracked paths/text and the extracted archive had **zero** previous-identity
  matches. The extracted Node launcher called the bundled Python bridge in
  isolated mode successfully, without relying on an installed MRW backend.
- The final checksum passed. Both published assets were downloaded anonymously
  and matched their local bytes. The public tag target, normal-release status,
  Latest redirect and versioned README link were verified.

Dependency pins remain unchanged. `npm audit` returned exit 1 with five existing
findings: high in `@azure/identity`, `@azure/msal-node` and `markdown-it`; moderate
in `@vscode/vsce` and `minimatch`. Markdown-it is bundled at runtime; the others
belong to the build toolchain. No pin changes were folded into this patch.

Build, regression, audit and downloaded-asset evidence is retained outside the
project under `~/.cache/mrw-document-actions-20261112/`. The earlier candidate
package and its logs were retained separately before rebuilding final B.

## Limits and observation

No connected document session exposed the user's live PDF pane. The interface
checks used a VS Code API facade and manifest conditions; they are not native
window observations. The working window was preserved and this VSIX was not
installed there.

MRW supplies no PDF rendering, text extraction, page annotations, PDF Contents
or page-position restoration. Any such support depends on the installed reader.
Backlinks remain scoped to the selected notes folder. System-reader handoffs
have no MRW toolbar; use VS Code's Command Palette. The wider sidebar command
grouping remains a separate follow-up.
