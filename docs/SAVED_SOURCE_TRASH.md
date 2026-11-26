# Delete and restore saved sources

Open the saved source and choose **Move to Trash…** under **Source details and
tools**. **Delete Saved Source…** in the Command Palette opens a picker for
the same operation. The confirmation names the selected copy and explains the scope.
An unsaved reader draft stops deletion; save or cancel it first. Cancelling
the picker or confirmation changes nothing.

Trash removes the copy from active saved-source and document-search lists.
It keeps its exact source revision, passages, annotations, diagrams, supporting
artifacts and note associations. Original documents, vault notes, other saved
sources and studies are unchanged. Trash does not reclaim their disk space.

Choose **Undo** in the completion notification, or **Restore saved source from Trash…**
in Sources and references. **Open Saved Source…** also includes Restore,
including when there are no active copies. Restore is available after restart.
It uses the same identity and revisions; no reacquisition or copying of notes
is needed. There is no permanent-delete control in this increment.

Exact retained links still open a copy in Trash. The reader shows its status
and a Restore button, and permits reading and copying the retained passage.
Edits, new links, diagram compilation and repeated imports of that saved
identity are blocked until restoration. A different upstream revision remains
a different capture. GOLEM XIV does not silently replace or redirect the old link.

## Storage and recovery

The existing artifact coordinator publishes transitions in complete generations.
A bounded `source-status.json` record accompanies the source directory; its
revision changes on every Trash/Restore transition, including repeated cycles.
Sources without this record remain active. The source JSON and retained bytes
are unchanged. Moves and opening a managed store on a fresh host preserve status.

A stale selection or Undo cannot reverse a later transition. If publication
fails or its outcome is uncertain, the open reader and drafts stay available
and further private writes are blocked in that session. Reload and use
**Recover Artifact Move** if recovery is required; GOLEM XIV verifies the observed
HEAD rather than retrying the action. Reopen the picker to inspect its state.
Use a GOLEM XIV version supporting Trash when sharing a store; older versions do
not understand these status records. Existing host-local writer exclusions
remain required; this is not a distributed deletion protocol.
