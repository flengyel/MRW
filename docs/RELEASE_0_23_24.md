# MRW 0.23.24 — Lean introduction and New Note

Published 13 November 2026 and pushed to `main`. This is a normal GitHub release,
marked Latest. It was not installed into or reloaded in the working VS Code window.

- [Release](https://github.com/flengyel/MRW/releases/tag/v0.23.24)
- [VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.24/mrw-0.23.24.vsix)
- [Checksums](https://github.com/flengyel/MRW/releases/download/v0.23.24/SHA256SUMS)
- Source commit A: `c5baa3db8a5bd75e7da21df75ac2313cb79365a4`
- Release commit B: `b6361921919ac07382ef8dca582d70cde2583cc3`
- VSIX SHA-256: `492db65600f092dac55f422127ef47c84fc67fa9eebaf35ca74c63164646484a`

A contains the implementation, prose, version and installation examples. B changes
only `vscode/media/build-info.json`, recording A and `localChanges: false`.
The package was built from clean B with Node 22 and the documented fixed epoch.
The public assets were downloaded and compared with the local bytes; checksum,
tag target, Latest redirect and versioned README download link passed.

## Delivered behavior

**New Note** replaces the New Zettel label. For a selected Obsidian vault it
runs the configured Obsidian command, after checking the vault path and command
availability. Obsidian handles its template, filename and prompts. MRW creates
no preliminary file, adds no duplicate title prompt, inserts no source text and
never retries an uncertain command. The MRW document and other drafts remain
open. The command is configurable; no personal note format is a requirement.
See [Obsidian setup](OBSIDIAN_WORKFLOW.md#new-note).

The user's default MRW workspace now selects
`templater-obsidian:create-Templates/NewFileTemplate.md`, confirmed by the live
Obsidian command list. Its settings were backed up before adding that one field.
The vault, templates and existing notes were not edited for this handoff.

Ordinary folders keep the assigned-path Markdown draft and MRW template. New
Reading Document remains in the Command Palette for a workspace Markdown file
with reading headings; it was removed from the main creation controls. Existing
command IDs, private state, studies and reader annotations are unchanged.

Lean pack 1.1.2 has a separate introduction before its contents and first
construction. The [Mathematical Writing review](LEAN_INTRODUCTION_REVIEW_20261113.md)
records the source, original outline, definition audit and revisions. Detailed
rules and proofs remain; definitions precede their technical use. Lesson IDs,
filenames, code and toolchain are unchanged.

## Checks and observations

| Check | Actual result |
| --- | --- |
| Extension suite | 541 passed, no failures or skips. |
| Python suite | 442 tests, 68 skipped; no failures. Skips: 58 opt-in Qt, 5 unbuilt repository Lean-checker tests, 4 opt-in TikZ, 1 unavailable authorized Windows project-parent case. |
| Lean lessons | Both completed projects compiled under Lean 4.33.0. Three deliberate errors and three incomplete variations failed with expected diagnostics. This is separate from the repository's justification checker. |
| Lesson preservation/rendering | Ten code/goal blocks and 55 mathematical expressions match the preceding pack; all expressions rendered. All 47 local lesson links checked. |
| Documentation | 472 relative links in 19 changed Markdown documents checked; a retained section anchor preserves earlier links. |
| Static checks | Node syntax, Python compileall and whitespace checks passed. |
| Final-package rechecks | Note/controller checks, tutorial checks and affected menu checks passed. |
| Native WSL host | VS Code 1.146.0 registered all 113 commands; Contents, Lean picker cancellation and ordinary-note editing/Save passed in an isolated window. |
| Obsidian | Production discovery reached the Windows CLI, verified the real vault path and found the user's Templater creation command. Dispatch and focus were intercepted after these read-only checks; no template prompt was completed. |
| Package | Exact inventory, manifest, marker, tutorial, revised Lean introduction and runtime bytes passed verification. Extracted Node-to-isolated-Python bridge passed. |
| Identity search | Every tracked path/file and extracted VSIX entry checked: zero superseded-name matches. |
| Dependency audit | 3 high and 2 moderate findings; dependency pins unchanged. |

Initial test attempts exposed missing bundled Python files and tmpfs placement of
persistent-storage fixtures. The worktree and fixtures were moved to persistent
Linux storage, without bypassing those checks. Two UI/link expectations were
then corrected for the requested command change. Final full-suite results above
follow those corrections. Earlier logs and unsuccessful native checks of the
superseded create/save approach were retained outside the repository.

The user's working-copy pack and three unchanged lesson files were updated only
after comparison with the previous committed bytes. Verified originals are under
`~/.cache/mrw-lean-introduction-20261113/working-copy-backup`. The other 23
non-build files, including Lean code and personal notes, retain their hashes.
No editor buffer was saved, closed or reloaded. Ordinary extension updates still
preserve working copies; this was a separate guarded revision of the requested
study text.

Logs, exit statuses, hashes, native reports and downloaded release assets are
retained under `~/.cache/mrw-lean-introduction-20261113`.

## Limits

The real Obsidian template interaction was not exercised end to end. Obsidian
runs separately; **Open in MRW** returns its completed note to MRW. Recent Notes
records files MRW has opened or saved, not Obsidian's recent-file history.

The revised lesson's rendering was checked programmatically; no native layout
observation of its introduction is claimed. Lean compilation checks the formal
terms. The writing review separately examines their informal correspondence;
neither a graph-structure check nor a successful build certifies that correspondence.
