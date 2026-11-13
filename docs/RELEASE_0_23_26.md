# MRW 0.23.26 — Delegate document creation

Published 13 November 2026 and pushed to `main`. Normal GitHub release, marked
Latest. Not installed into or reloaded in the working VS Code window.

- [Release](https://github.com/flengyel/MRW/releases/tag/v0.23.26)
- [VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.26/mrw-0.23.26.vsix)
- [Checksums](https://github.com/flengyel/MRW/releases/download/v0.23.26/SHA256SUMS)
- Source commit A: `eedb5c97af4a2e3c3af4dd887377875459f0464b`
- Release commit B: `b882329880f07bdf35cf7d53adf09e99e168a8db`
- VSIX SHA-256: `3ae688a0534d41b97c142c77dfc7b380e0eea11f487f2dbafa8ac44af6f0e979`

A contains the command removal, regression checks, guide updates and version.
B changes only the build marker, recording A and `localChanges: false`. Built
from clean B with Node 22 and the documented fixed epoch. Both published assets
were downloaded and compared with local bytes; checksums, tag target, Latest
redirect and the versioned README link passed.

## Behavior

New Reading Document, its registration and fixed reading headings are removed.
MRW no longer offers that creation dialog or saves a reading-template file.
Existing documents remain readable with Contents and Return; no files or records
are migrated. New Note continues to delegate to Obsidian or a blank VS Code
editor. The authoring application owns templates, filenames and Save.

The tutorial and current guides describe this boundary. Obsolete creation
instructions in earlier prompts are marked superseded; release evidence remains
unchanged. Leftover tutorial text for the note-template settings removed in
0.23.25 is also removed. See [notes applications](NOTE_COMPANIONS.md) and
[Obsidian dispatch](OBSIDIAN_WORKFLOW.md#what-the-handoff-does).

## Checks

| Check | Actual result |
| --- | --- |
| Extension suite | 530 passed; no failures, skips or cancellations. |
| Focused checks | Saved reading document reopens after restart, dirty buffer and file bytes preserved, removed command absent, tutorial opens without writes. |
| Static/document checks | Node syntax and whitespace passed; 435 relative links in 14 changed Markdown files checked. |
| Native WSL host | VS Code 1.146.0, WSL Debian; 112 commands registered and removed creator absent. Contents, Lean chooser cancellation, native blank Markdown, Recent Notes and Return passed. Source bytes and file inventory were preserved. |
| Package | Exact inventory, manifest, source marker, README, revised tutorial and runtime bytes passed. Creator ID and template code absent from production module/manifest; obsolete note-template prose absent from tutorial. |
| Extracted bridge | Packaged Node-to-isolated-Python bridge passed without an installed backend. |
| Identity search | All tracked paths/files and archive entries searched; zero superseded-name matches. |
| Dependencies | Three high and two moderate audit findings; pins unchanged. |

The first full run passed 528 tests but had two teardown failures: fixture
folders were deleted before their history recorders closed. The affected fixtures
and the matching active-study fixture now await recorder closure before removal.
The final full run above follows that correction; failed-run logs are retained.
No production history code was changed.

Python, Lean, lesson content, note-creation handoff and Obsidian dispatch code are
unchanged from 0.23.25. Their full suites and a live Obsidian template run were
not repeated. Native checks used a disposable workspace. Genuine notes, dirty
buffers, workspace configuration, saved research and Obsidian templates were not
edited, saved or moved.

Logs, exit statuses, native reports, package inspection and downloaded assets are
retained under `~/.cache/mrw-document-delegation-20261113`.

## Limits

Custom keybindings to the removed command need removal or reassignment by their
owner. Obsidian remains separate and requires its enabled CLI and configured
creation command for New Note. Other folders receive a blank VS Code editor with
no assigned filename. Emacs and The Archive adapters remain proposals; no Org
reader is supplied. PDF Return remains file-level. MRW's retained sources,
annotations and research records continue independently of document creation.
