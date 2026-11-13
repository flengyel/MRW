# MRW 0.23.25 — Reuse companion note creation

Published 13 November 2026 and pushed to `main`. This is a normal GitHub release,
marked Latest. It was not installed into or reloaded in the working VS Code window.

- [Release](https://github.com/flengyel/MRW/releases/tag/v0.23.25)
- [VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.25/mrw-0.23.25.vsix)
- [Checksums](https://github.com/flengyel/MRW/releases/download/v0.23.25/SHA256SUMS)
- Source commit A: `4254b6f14f31fa90accaef15bd250f1080d60952`
- Release commit B: `8ff25b0b0c76530e61eb7d3e67370bb27b81ee83`
- VSIX SHA-256: `67173a4babe14f026a59a18b3c2882ba27414cc36feab256d281e54e37d0f254`

A contains the cleanup, guide updates and version metadata. B changes only
`vscode/media/build-info.json`, recording A and `localChanges: false`. The VSIX
was built from clean B with Node 22 and the documented fixed epoch. Public assets
were downloaded and compared with local bytes; checksum, tag target, Latest
redirect and the versioned README link passed.

## Removed duplication

MRW's note template, filename generator, title prompt and template/prefix settings
are removed. **New Note** invokes the configured Obsidian command for a vault;
Obsidian owns its prompts, naming and template. This handoff is unchanged from
0.23.24. For another notes folder, the command opens an empty native Markdown
editor beside the source. VS Code owns Save, filename selection and draft recovery.

**Recent Notes** retains its existing state key, record format, failure recovery
and scope checks in a separate module. Existing note contents, saved research,
annotations, private records and settings were not rewritten. No data migration
is required. Older saved template settings are ignored. Return retains the source
location; a PDF return remains file-level.

The tutorial and current guides now describe the delivered behavior. The former
[template guide](MARKDOWN_NOTE_TEMPLATES.md) explains its removal at the same URL;
older release reports remain unchanged. Current development instructions prohibit
reconstructing the reduced template implementation.

## Verification

| Check | Actual result |
| --- | --- |
| Full extension suite | 535 passed; no failures, skips or cancellations. |
| Focused regressions | 64 passed: blank Markdown, source Return and restart, Obsidian dispatch, recent-note scope, dirty labels and failed publication/retry. |
| Static/document checks | Node syntax and whitespace passed; 412 relative links in 13 changed Markdown files checked. |
| Native WSL host | VS Code 1.146.0, WSL Debian; all 113 commands registered. Contents and Lean chooser cancellation passed. New Note opened empty Markdown beside the unchanged source; file inventory, Recent Notes and Return passed. |
| Final package | Exact inventory, manifest, marker, README, tutorial and runtime bytes verified. The removed template module/settings are absent and the Recent Notes module is present. |
| Extracted bridge | Packaged Node bridge to isolated Python passed with no installed MRW backend required. |
| Identity search | Every tracked path/file and extracted archive entry searched; zero superseded-name matches. |
| Dependency audit | Three high and two moderate findings. Pins unchanged. |

Two initial focused assertions were corrected: the cancellation fixture needed a
nonempty selected passage, and its earlier Return location legitimately acquired
the edited document's revision. The final check preserves the earlier passage
coordinates and verifies Return. Production tracking logic was not changed to
satisfy those assertions.

Python and Lean runtime files, Lean lesson content and the Obsidian CLI module
are unchanged from 0.23.24. Their full suites and a live Obsidian template run were
not repeated. The native observations above used an isolated disposable workspace;
no genuine note was created, saved, closed or edited. The working window, its
workspace configuration and the Obsidian templates were left alone.

Logs, exit statuses, native observations, package inspection and downloaded assets
are retained under `~/.cache/mrw-note-simplification-20261113`.

## Limits

Obsidian remains a separate application. Its CLI and a configured command in the
selected vault are required; see [setup](OBSIDIAN_WORKFLOW.md#new-note). A failed
handoff reports the error without retrying or creating a fallback file. Recent
Notes records files MRW has seen, not Obsidian's recent-file list. The Archive's
desktop integration is untested.

Outside Obsidian, the blank editor has no assigned notes-folder filename or source
link; use VS Code Save and ordinary links. This removes the extra MRW title prompt,
template configuration and generated naming scheme without prescribing note format.
