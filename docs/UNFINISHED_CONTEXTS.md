# Resume an unfinished justification context

An exact pending search remains available after the reader closes or the host
restarts. Choose **Unfinished: …** in **Proofs → Justification…** to resume it.

Search first publishes an immutable `mrw.route-intent` under the justification
store's `pending` directory. Its request, source snapshots and Return pin are
validated and retained before Lean starts. Opening an example does not save it.
A failed initial publication starts no check. An uncertain save can be retried
with the same request identity; it reuses the first captured Return location.

The picker derives unfinished/completed status from matching exact retained
results. It never promotes a saved request to a checked result. A late successful
result is opened as that result, rather than searched again. Earlier intent
bytes remain; completed intents are suppressed from the unfinished list.

Workspace Return paths use the existing relative-location encoding. External
notes keep their recorded notes root; choosing a different notes folder cannot
redirect an earlier Return location. The existing navigation authorization and
exact-revision checks still govern opening that destination. GOLEM XIV does not save
or reconstruct ordinary editor buffers.

Managed publication, movement, interrupted HEAD recovery and private file locks
remain the existing storage system's responsibility. Pending-only stores are
included in discovery and moves. Inputs, catalog entries and total justification
bytes stay bounded. Unpublished staging is preserved, not presented as work.

General proof search and automatic paper–Lean correspondence checking remain
outside this workflow. Formal checking is relative to the supplied admissions.
Use [selected sources](SOURCE_GROUNDS_WORKFLOW.md) to assemble a new context.
