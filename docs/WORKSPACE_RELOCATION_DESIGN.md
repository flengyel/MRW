# Workspace relocation

Requested behavior: move an MRW workspace while preserving its identity, ordinary
work, retained sources, annotations, Studies, history and working links. The name
**MRW** is generic. Its identity must not be derived from the command that created
it or the current subject. The commands are **MRW: Move Workspace…** and **MRW: Recover Workspace Move**.

The existing artifact mover already verifies a complete candidate and atomically
commits the saved-source binding. It covers the records listed in
[artifact storage](ARTIFACT_STORAGE.md#what-moves). It does not relocate the whole
VS Code workspace. A filesystem rename alone cannot atomically change a directory,
VS Code's separate state databases and routing links held in external notes.

## Required transaction

1. Inventory the selected workspace's actual stores, workspace settings, study
   state, history, ordinary project roots and resumption locations. External
   vaults, shared sources and unrelated workspaces are not owned by the move.
2. Require a settled session: native dirty buffers, reader drafts, unsent requests,
   pending writes and other writers must be accounted for. Never edit live VS Code
   databases or infer that an idle screen means there are no pending saves.
3. Prepare and verify the destination without replacing occupied paths. Preserve
   relative and absolute folder mappings and source references. Retained source
   revisions and exact passages must not be changed to match the new location.
4. Publish one durable MRW authority switch after verification. An interrupted
   precommit move leaves the original authoritative; an interrupted postcommit
   move recovers the committed destination before cleanup. An ambiguous result
   must block further writes rather than create two writable authorities.
5. Reopen under an explicit host action after saving. Treat VS Code window opening
   as a separate recoverable step, not part of a filesystem-atomic operation.
   Preserve original data until destination reopening and content checks succeed.
6. Account for existing MRW/Obsidian routing links without rewriting mathematical
   notes silently. Preserve the qualified source identifier, revision and passage.

A same-filesystem directory rename and a cross-filesystem copy have different
mechanics. Both need the same recovery contract. Do not claim cross-filesystem
rename atomicity. Repeated recovery must be safe and must not resurrect deleted
studies or drop archived states, reader diagrams, drafts or history events.

## Acceptance

Use disposable workspaces containing ordinary notes, links, an annotated retained
source, a Lean working copy, an unfinished study, archived/trashed studies and
recorded history. Test cancellation, occupied destination, concurrent/stale writes,
failures before and after the authority switch, restart/recovery and repeated
recovery. Reopen references and verify exact bytes and state at the destination.
Check both same-filesystem and cross-filesystem cases where supported. Report
native host observations separately from storage and API checks.

This work precedes the PROV trial. Do not migrate the user's workspace merely to
test it, and do not ship a button that moves only a subset under the name “Move
Workspace”.

## Using the commands

1. Open the saved `.code-workspace` file. Its containing directory must also be
   one of its workspace folders. Save native editors, including notebooks, and
   finish or copy unsent reader/Ask drafts. Close other MRW windows using the
   workspace or a saved store inside it. Stop builds or other programs writing
   files there while the move runs.
2. Run **Move Workspace…**. Enter a new absolute directory on persistent Linux
   storage. Its parent must exist; the destination must not exist. The command
   describes its scope and asks before copying. Leave the workspace files unchanged until the destination opens.
   External notes folders and
   externally stored sources and shared history remain in place.
3. MRW checkpoints study drafts and pending history, closes its write gate,
   inventories the files and copies them. It checks the destination and rechecks
   the source before committing. No source file is removed.
4. Choose **Open moved workspace** to reuse this window. This explicit action
   restarts its extensions. Ordinary file tabs and revision-matched text
   selections are restored; use Resume for saved readers and studies. Other
   extensions' transient panels and editor Undo stacks are not copied.
5. After interruption or a reported uncertain write, run **Recover Workspace
   Move**. Before commit, the original remains authoritative and the incomplete
   destination is retained. After commit, recovery uses the verified destination.
   It refuses a changed candidate before its first successful activation.

The original directory and original private storage remain as backups. This
command does not delete them. Creating a default workspace is still separate
from merging work belonging to several earlier workspaces.

## Authority, locations and identity

The host's MRW global storage contains `workspace-moves-v1/`. Each move has an
intent, file hashes and a committed or aborted state. A synchronized atomic
record replacement is the authority switch. Linux `flock` (util-linux) serializes
moves, recovery and session registration, and the kernel releases its lock after
process death. Old sessions refuse further MRW writes after commitment. The
transaction is host-local; copying its files to another host or VS Code profile
does not transfer its authority.

The destination contains `.mrw-workspace-data/`: private MRW stores, a snapshot
of MRW workspace settings/state, and file-tab locations. The original VS Code
state database is neither copied nor edited. The destination's first activation
verifies the complete candidate before enabling work. Subsequent saves use the
existing study/history stores at the new location.

New navigation and study locations use a relative path plus a workspace or notes
root. An external notes locator retains its original root, so selecting another
notes folder cannot redirect it. Existing absolute locations resolve through the
verified move mapping. Study IDs, lifecycle markers, proof-graph selections and
document-session identity survive the move. Retained source revisions, exact
passages, reader annotations and immutable history batches are not rewritten.

Workspace and owned folder settings are adjusted in the candidate when they
refer inside the moved root. Ordinary note contents remain byte-for-byte intact.
MRW links resolve earlier workspace routes through the committed mapping; a link
received by the retired workspace offers **Copy link and open moved workspace**,
followed by **Open Link from Clipboard**. This extra handoff remains necessary
when an external launcher still names the old workspace. Existing Obsidian
configuration and note text are not silently edited.

## Bounds and remaining limits

The command supports local Linux filesystems, including WSL and Linux SSH hosts.
It refuses Windows, network and memory-backed destinations, symlinked root paths,
occupied destinations, special files and snapshots above 8 GiB or 100,000 entries.
Private MRW storage must not contain symlinks. Ordinary directory symlinks are
retained as links, not traversed. Internal links are
adjusted to the candidate; external targets remain external. A shared-history
collection nested inside the workspace must be placed outside it before moving.

The atomic step selects MRW's authority; it cannot atomically relocate the entire
VS Code process, other extensions or a running external program. Dirty native
buffers prevent the move. Study drafts are checkpointed; unsent reader/Ask drafts
prevent it. Unsupported transient tabs must be reopened through their own tools.
Original copies remain available. Verification uses disposable workspaces,
including distinct filesystems; the user's workspace is not a test fixture.
