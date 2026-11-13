# MRW 0.23.27 — Start a note from MRW

Published 13 November 2026 as a normal GitHub release, marked Latest. Committed
and pushed to `main`. Not installed into or reloaded in the working window.

- [Release](https://github.com/flengyel/MRW/releases/tag/v0.23.27)
- [VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.27/mrw-0.23.27.vsix)
- [Checksums](https://github.com/flengyel/MRW/releases/download/v0.23.27/SHA256SUMS)
- Source commit A: `262cdec43d97c51606e420581470dc59df41d6b4`
- Release commit B: `24c8a215c6eed50bf9ced1be093ca0a84148e616`
- VSIX SHA-256: `145acba403d72484ee07f80e5739155a1f1dab42b0f4ac22489fc89e9f24a1f2`

The tutorial and READMEs now lead with New Note in MRW. They identify the
Commands view, MRW Document menu and Command Palette, explain how MRW invokes
the configured Obsidian creation command, and link its setup. Other notes folders
use a blank VS Code Markdown editor. The current document stays open. The
guides distinguish those routes from other authoring applications that MRW does
not yet invoke. See [the workflow](NOTE_COMPANIONS.md#start-a-note-from-mrw).

No runtime code, commands, data formats, dependency pins, note contents, saved
research, templates or workspace settings changed. This update clarifies how to
start the delivered interaction; it adds no creation form or adapter.

## Verification

- Clean npm install and all three tutorial tests passed.
- Checked 403 relative links in twelve changed Markdown files; no failures.
- Built from clean B. Only the build marker changed between A and B; it records
  A, version 0.23.27 and `localChanges: false`.
- Package verification checked the exact inventory and source bytes. Inspection
  confirmed the corrected README and bundled tutorial, version and marker.
- Compared every archive entry with the verified 0.23.26 VSIX. Only the README,
  tutorial, package manifest, VSIX manifest and build marker differ. All runtime
  files are byte-identical. Source runtime/test directories also have no changes.
- All tracked paths and file bytes and all VSIX entries were searched for the
  superseded identity; zero matches.
- Downloaded both published assets, compared their bytes with the local files,
  and verified SHA256SUMS. The tag, normal-release status, Latest redirect and
  README download link passed.
- Dependency audit: three high and two moderate findings; pins preserved.

Full Python/extension suites, Lean and native-window checks were not repeated for
this documentation-only change. The unchanged runtime's checks are recorded in
[0.23.26 delivery](RELEASE_0_23_26.md). No new live Obsidian or desktop observation
is claimed. Logs, exit statuses, package comparison and downloaded assets remain
under `~/.cache/mrw-note-guide-20261113`.

Obsidian requires its enabled CLI and configured creation command for New Note;
it opens as a separate application. Emacs and The Archive remain proposed
integrations. The release is available as a manual VSIX update; publication did
not install it or reload the working window.
