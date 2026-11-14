# MRW 0.23.29 — Find saved sources

Published 13 November 2026 as a normal GitHub release marked Latest. The release
commits and tag are pushed to main and origin. Not installed into or reloaded in
the working window.

- [Release](https://github.com/flengyel/MRW/releases/tag/v0.23.29)
- [VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.29/mrw-0.23.29.vsix)
- [Checksums](https://github.com/flengyel/MRW/releases/download/v0.23.29/SHA256SUMS)
- Source commit A: `aab95837f19a198a28916a6068ef39b4ce84b41a`
- Release commit B: `9637eda12219a5ec9396acee9b8101b3ceb6277e`
- VSIX SHA-256: `ebe9391ec44d91e68058d9d81bca9f44a512c11fcc58f2876385b5ef7ee0a339`

## Repair

The user could not find a retained Stacks section with reader annotations.
Open Saved Source had been removed from the Commands buttons. Its picker
searched titles only: a lemma inside a section could not be found by its tag,
and the displayed source description did not participate in search.

**Open Saved Source…** is restored beside Open Document. The saved-source list
now exposes retained authors, passage titles and an annotation count without
reading original sources or contacting a website. Both its own picker and Open
Document's saved results use this metadata. Title, description and detail are
searchable: `Stacks` or `08ZH` finds a saved Hausdorff-spaces section containing
that lemma. Qualified identifiers are preserved verbatim.

Opening still uses the same retained record and revision. IDs, schemas, paths,
source bytes, annotations and links are unchanged. No storage migration, new
record system or notes-folder change is introduced. The tutorial and reading
guide explain how to reopen an imported section and distinguish its reader
annotations from an ordinary Markdown document.

## Verification

- Clean npm install, Python bundling and JavaScript syntax checks passed.
- **531 extension tests passed**, with no skips, cancellations or failures.
  Focused command, picker and tutorial checks also passed. New regressions cover
  search metadata, cancellation, restart, reopening without the original file,
  preserving the saved revision and notes, and the Open Document route.
- Python discovery ran **443 tests: 375 passed, 68 skipped**, with no failures.
  The 27 focused source-outline tests passed. Skips cover opt-in or unavailable
  Qt, Lean, native TikZ and mounted-host checks; these are not claimed as runs.
  Listing is tested without reading the original source and without rewriting
  retained bytes. Lean code and dependencies are unchanged.
- In an isolated native **VS Code 1.146.0 / WSL** host, all contributed
  commands registered. The actual Quick Pick filtered the production result
  rows by `08ZH` and `Stacks`, selected the correct retained source with its note,
  and cancelled without changing its revision after the original was removed.
  The fixture assigned the query and invoked native acceptance/cancellation
  commands. No manual visual inspection of the working window is claimed.
  The disposable window closed itself.
- Read-only preservation checks verified **12 retained payload files**
  and **26 ordinary Stacks files**, plus the store's unchanged HEAD.
  A disposable copy of Hausdorff spaces loaded with both reader annotations;
  original note fields and diagram assets matched their saved bytes. Generated
  reader display fragments were checked separately from stored annotation fields.
  Genuine research files and settings were not edited.
- Built from clean B with the fixed UTC epoch; A-to-B changes only the build
  marker. The marker records A, version 0.23.29 and `localChanges: false`.
- VSIX inventory/source verification, final tutorial checks, packaged README,
  manifest and marker inspection passed. All **133 relative links in seven
  changed/reviewed Markdown files** passed; delivery-report links were checked
  separately before its commit.
- Tracked paths/file bytes and all extracted VSIX entries were searched for the
  superseded project identity: zero matches. Every archive entry was compared
  with 0.23.28: only the picker JavaScript, Python list metadata, README, tutorial
  and release metadata differ. Inventory, Lean and lesson files are unchanged.
- A fresh wheel environment imported the Python modules and ran the CLI help.
  The extracted VSIX's Node-to-isolated-Python bridge listed the copied retained
  source, its authors, nested passage tag and two reader notes without relying
  on an installed MRW backend.
- Both published assets were downloaded and matched local bytes. Their checksum,
  tag target, normal-release status, Latest redirect and README link passed.
- npm audit reports **three high and two moderate** findings. Pins were preserved.

Logs, exit statuses, the disposable native fixture, preservation inventories,
archive comparison and downloaded assets remain under
`~/.cache/mrw-saved-source-access-20261113`.

## Limits

This search covers the selected workspace's retained metadata, not every MRW
workspace or full passage text. Annotation counts cover inline reader notes;
linked external notes are separate. The existing 100-source list limit remains.
The [interface audit](INTERFACE_AUDIT_20261113.md) has further outstanding work;
this repair addresses the demonstrated obstacle to finding saved sources.

GitHub updates require installing the new VSIX. Publication did not install it
or reload the working window. See [installation](INSTALLATION.md) and
[finding saved sources](READING_OUTLINE_WORKFLOW.md#find-an-imported-section-and-its-reader-notes).
