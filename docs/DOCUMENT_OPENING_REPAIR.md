# Document-opening repair — 0.23.2

Baseline: fetched main `828bc8c48cd0cfb6618de3fd414d5bedcc14751d`.
The separate solution-export fix is commit `3b63d5a`. No delivered learning
workflow, genuine notes, source annotations, studies or history were replaced.

## Opening behavior

**Open Document…** is the primary Commands button. Its native picker offers
original files and saved copies together. Browse and the specialized saved-copy
action appear before I/O. Saved discovery runs independently; an ambiguous
multi-root workspace never opens a background project-selection dialog.
Saved rows identify title, source/path and retained revision. The specialized
`mrw.openOutline` command remains available. Opening an original does not import
it; saved opening does not refresh the retained revision or replace annotations.

Initial listing calls only the current directory. Folders and Parent navigate;
only **Search subfolders…** descends recursively. Neither action changes Notes
Folder or grants ancestor indexing scope. Filenames precede bounded YAML/H1
titles. Dirty titles win, with query, active item and selection preserved.
Folder changes, closure and superseding commands cancel pending workers and
ignore late replies, including saved metadata. Worker errors/timeouts leave
Browse usable, with no full-index fallback. Current canonical scope is checked
again before opening a selected file. Shared `DEFAULT_LIMITS`, backlink
completeness and note-ID uniqueness rules are unchanged.

Chooser bounds: 20,000 returned items, 40,000 examined entries, recursive depth
32, 16 KiB disk headers and 16 MiB total title bytes; dirty title parsing is also
bounded to the header. Windows enumeration uses the chooser-specific worker
with a 12-second timeout per phase. Limits and failures remain visible.

## Export correction

Another problem's solution review is linked by its recorded review-event ID,
then exported with the exact attributed snapshot. Older `solution:<revision>`
markers still resolve to matching same-study reviews. Missing solution evidence
is identified as a missing solution review, rather than a missing help reply.
The cross-session regression covers both record formats, draft
preservation and rejection of another study's evidence. Assistance classification
is unchanged; neither export nor structural validation checks mathematics.

## Timing and native display

Read-only measurements used the representative Windows-mounted vault: 1,326
shallow entries and 1,286 Markdown headers. The standalone worker run returned
filenames in **1.04 s**, with titles complete at **4.86 s**. During native-host
verification alongside regression work, controls were actionable after
**2.17 ms**, filenames arrived at **3.97 s**, and titles finished at **10.47 s**.
The control metric is when native QuickPick.show returned with actionable items,
before I/O. It is not a renderer-paint measurement. Worker completion time is
not presented as the time before Browse becomes usable. Timings are individual
runs, not a performance guarantee; metadata loading still costs seconds.

A disposable Windows VS Code **1.144.1 / WSL Debian**, high-contrast window
completed six checks. Actual captures were inspected after ordinary Open,
Follow, Return, rename/restore with an unsaved Markdown prefix, and saved-copy
opening. Text rendered in each case. Both sidebars, bordered Commands, two
editor groups and the unrelated dirty editor remained visible. API assertions
also checked unchanged on-disk Markdown, retained source revision and annotation,
notes-folder setting and settled layout. Saved opening displayed its exact
retained passage. The fixture injects native picker choices; it is not a human
study or mathematical-usefulness test.

Earlier attempts had restored duplicate fixture tabs, an unsettled pixel-width
baseline and Save prompts. They were not accepted as passing evidence. The final
window used a unique disposable workspace, cleared only fixture tabs, waited
for a settled layout, and saved only owned temporary buffers at cleanup. The
blank preview did not recur with clean setup and a rendered capture; no further
product display patch was justified. The final native run predates only the
last dirty-title header clamp; its focused and full regressions cover that change.
Host notifications about slow startup and unsupported test-only auto-update
settings were visible. These were not MRW reader errors. Other themes/hosts,
live Obsidian and native PDF readers were not exercised in this repair.

## Verification and installation

Final frozen-source extension regression: **357/357**, exit 0, no skips.
Shared Python study-question and editor-bridge checks: **13/13**, exit 0.
JavaScript syntax and whitespace checks passed. The first broader run found one
obsolete welcome-button assertion, which was updated. Another run was stopped
when cancellation/title bounds were finalized; neither is reported as the final
pass. Deliberately delayed/failed workers, strictly shallow reads, explicit
recursive search, cancellation, stale replies, dirty titles, query/selection,
folder scope and superseding commands have focused coverage.

Verified `vscode/mrw-0.23.2.vsix`: **584,637 bytes**, **108 archive files**,
SHA-256 `ee30ed548d02589bca841210c7ab7e182de47a522081bfc326029bf9a7b9c81d`. Manifest, production JavaScript, media and Python
bytes match the isolated build; development files are excluded. Packaged tutorial
matches current instructions; vsce expands README links. The isolated marker
records base `3b63d5a` plus local repair bytes; the root's previous marker is intact.
Installed by the established WSL code-server route, exit 0. All
**106 installed payload files** match the archive,
excluding installer-only manifest metadata. The registry selects **flengyel.mrw
0.23.2**. The working window was not reloaded; adoption occurs at normal activation.

[Machine evidence](https://github.com/flengyel/MRW/blob/af623be0a9dc85cb23dbdde610484ad886ea687a/docs/evidence/document-opening-repair-20261108.json) records source
hashes, phase timings, checks and package identity. Full logs, statuses and captures
remain under ignored `.codex-work/vscode-host-opening-repair/evidence`.
Genuine vault data was read only for metadata timing, never used as a write fixture.
Current README, workflow, design instructions and bundled tutorial describe the
same opening flow. General research resumption and argument reconstruction remain
subsequent work; no manual problem session is required for this delivery.
