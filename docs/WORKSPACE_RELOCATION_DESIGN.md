# Workspace relocation

Requested behavior: move an MRW workspace while preserving its identity, ordinary
work, retained sources, annotations, Studies, history and working links. The name
**MRW** is generic. Its identity must not be derived from the command that created
it or the current subject. This is a pending implementation, not a shipped command.

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
