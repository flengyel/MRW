# MRW 0.23.14 delivery — 2026-11-12

Published as the latest normal GitHub release:
[MRW 0.23.14 — Recent notes folders](https://github.com/flengyel/MRW/releases/tag/v0.23.14).
[VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.14/mrw-0.23.14.vsix) ·
[SHA256SUMS](https://github.com/flengyel/MRW/releases/download/v0.23.14/SHA256SUMS).

## Delivered behavior

**Choose Notes Folder** shows Current and Recent rows with full paths and a
**Browse for notes folder…** action. The existing workspace state retains at
most ten distinct canonical folder paths, including the current folder. Recent
selection switches directly. Browse supplies an available current, recent,
workspace or home folder as its initial location. Successful changes show the
selected path. History is scoped to the workspace and extension host.

Cancelling leaves configuration and folder scope unchanged. Missing or redirected
recent folders are rejected. Settings-write failure leaves the preceding selection
intact; if the folder setting succeeds but saving its history fails, the message
states that distinction and permits retry. Serializing publication prevents a
slower earlier settings write from replacing a later selection.

The prior chooser did not expose the selected folder or folder history and could
leave its initial location to the host when the saved path was unavailable. The
repair removes those ambiguities; it does not assert that a spontaneous change
to the user's saved vault setting was reproduced.

Read-only inspection found that both the genuine workspace setting and its MRW
folder state still selected the configured vault. Separate disposable development
workspaces had temporary folder states. Which dialog displayed the reported
temporary path remains unconfirmed. Temporary directories are used for test
fixtures and intermediate TikZ rendering; neither requires replacing the user's
Notes Folder. This task did not change the genuine setting or saved scope.

See [documents and folders](READING_OUTLINE_WORKFLOW.md) and
[Obsidian](OBSIDIAN_WORKFLOW.md) for the delivered interaction. The bundled
tutorial was updated alongside the implementation.

## Exact source and package

- Implementation: `9a925b15e96353e661f14355b248ce36f016f007`.
- Commit A: `8cb0ad1c3a5680e2842a0808347a7eb581d6839b` — version, installation
  examples and current release links. Dependency pins unchanged.
- Commit B: `454b4b52e5ed5e1b7ba4cdfc23e40ffe338aff27` — only
  `vscode/media/build-info.json`, version 0.23.14, A's full SHA and
  `localChanges: false`.
- Clean B was built and tagged `v0.23.14`; these commits are on remote main.
- Package: `mrw-0.23.14.vsix`, 672,622 bytes, 144 entries.
- SHA-256: `982bc976c16e2c5deaccab30e94d1134545d10aaeb3bce697555c0a090149383`.

The release was created as a draft, its two assets and their digests checked,
then published with `prerelease: false` and marked Latest. Anonymous downloads
matched both local assets byte for byte. The public release page, Latest API,
tag target and README download links were verified. Published tags and assets
from preceding releases were left unchanged.

## Verification

The full serial extension campaign ran on the implementation commit above,
using one Node process per test file with no overlapping files. All **461 tests
in 34 files passed**, with zero failures, cancellations or skips. After that run,
A changed version/documentation metadata and B changed only the build marker.

The 47 document tests include eight new regression cases covering current/recent
selection, restart recovery, dirty-note preservation, both cancellation paths,
explicit fallback location, unavailable/redirected folders, failed settings and
history writes with retry, delayed publication, bounded canonical history and
workspace isolation. They use the production controller through a VS Code API
test facade and real disposable filesystem fixtures.

Clean B was built with Linux Node v24.22.1 and Python 3.13.5, with
`TZ=UTC SOURCE_DATE_EPOCH=1792094267`:

- `npm ci --prefix vscode --ignore-scripts`: exit 0.
- Tutorial tests: 3 passed, exit 0.
- `npm run check --prefix vscode`: exit 0.
- `npm run package --prefix vscode`: exit 0.
- `npm run verify-vsix --prefix vscode -- mrw-0.23.14.vsix`: exit 0; inventory,
  production manifest, runtime bytes, licenses and notices matched.
- Changed-document checks: 378 local paths, same-repository links, anchors and
  command targets across 11 Markdown files passed. The 44 other external links
  were not fetched as part of that check.
- `git diff --check`: passed. The release checkout remained clean after packaging.
- Identity scan: 484 tracked paths, 477 tracked UTF-8 files and 144 package entries;
  zero superseded project-identity occurrences.
- Extracted package: isolated Python import and real bridge review of the
  synthetic Unicode fixture passed. Packaged chooser code, README, tutorial,
  manifest and marker were inspected.
- `sha256sum -c SHA256SUMS`: passed for local and public downloaded assets.

Python and Lean source were unchanged; their full suites were not repeated for
this JavaScript repair. No new native desktop clicking was observed. Automated
checks did not use the extension installed in the working window and did not
require the user to install 0.23.13.

Logs, scripts, exit codes, extracted package and public-download checks remain
outside the repository under `~/.cache/mrw-notes-folders-20261112/`. Only the VSIX
and checksum were uploaded. This report records completed publication; a later
commit adding the report does not change the tagged package.

## Dependency audit and installation

`npm audit --prefix vscode --json` exited 1 with five vulnerable entries: three
high and two moderate (`markdown-it`, `@azure/identity`, `@azure/msal-node`,
`@vscode/vsce`, `minimatch`). Markdown-it is bundled runtime code. The others
belong to packaging and are absent from the VSIX. Pins were preserved; these
findings remain unresolved and are disclosed in the release notes.

The package was not installed into the working window; no reload was forced.
Genuine notes, dirty buffers, source records, studies and saved history were not
modified. Temporary checks used isolated files and workspace state.

To try the new chooser, install 0.23.14 using **Extensions: Install from VSIX…**
in the WSL Debian workspace, save unfinished work, then reload when requested.
Installing 0.23.13 first is unnecessary: this release also includes its Zotero
and shared-history additions. Reloading alone does not fetch a new package.
Recent folders do not transfer between workspaces or machines. The exact native
folder-dialog behavior reported by the user remains unobserved.
