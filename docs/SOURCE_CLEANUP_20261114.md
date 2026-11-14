# Working saved-source cleanup — 14 November 2026

Removed two confirmed test/demo entries from the default workspace's active
saved-source store at the user's request:

- `study-example`: the bundled sums-of-odd-integers example, with no reader notes.
- `reading-navigation-source.txt`: a synthetic two-line navigation fixture,
  with no reader notes.

Also removed the three ordinary test files `Stacks/reading-navigation-source.txt`,
`Stacks/reading-navigation-validation.md` and
`Stacks/reading-outline-check-20261103.md` from the active workspace. They are
test fixtures/reports, not mathematical notes. No other workspace files were
removed. The obsolete test reports' source references were preserved in backup.

## Preservation and verification

A complete byte-verified backup was made before publication, outside the active
workspace at `~/.cache/mrw-source-cleanup-20261114/`. It includes the previous
managed store, the three test files, binding metadata and a cleanup receipt.
The directory is private to the user. The backup is retained for restoration.

The existing installed MRW 0.23.33 storage coordinator performed one copy-on-write
generation publication. Active store files were not edited in place. A private
clone first rehearsed interruption before publication: HEAD remained unchanged,
the rejected candidate was discarded and no recovery journal remained. Successful
and repeated cleanup rehearsals preserved all remaining payload bytes.

After working-store publication, a fresh coordinator instance validated the
saved store and followed both original exact retained references:

| Remaining source | Passages | Reader notes |
| --- | --- | --- |
| Hausdorff spaces, Stacks Project 08ZD | 9 | 2 |
| Simplicial Sets, Kerodon 0004 | 27 | 0 |

All 11 remaining saved payload files are byte-identical, including the
Hausdorff source, annotations and diagrams. Other Stacks workspace files are
also byte-identical. The active binding is unchanged. Mathematical notes,
proof outlines, Lean projects, saved study records and vault data were not edited.
The working window's visible tabs were read before removing the test files;
none of those files was open. The window and its buffers were not changed.

## Scope

This is a data cleanup, not a source-management feature or a storage migration.
The installed backend's fresh saved-source list contains only the two sources
above. Reopen Open Saved Source if a picker was already open; no package update
or reload is required. No runtime source, release asset or installed extension
was changed, so no new VSIX was built.

MRW still lacks user-facing saved-source Delete/Restore controls. No such
control is claimed here. Guarding older host tests against working stores also
remains pending. These limits stay in the
[design register](DESIGN_RECONCILIATION.md).
