# Resume an unfinished justification context

The next D14/D15 repair keeps an exact pending search available after the reader
closes or the host restarts. It uses the existing Justification picker and
private artifact coordinator. It introduces no question form or study record.

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
exact-revision checks still govern opening that destination. MRW does not save
or reconstruct ordinary editor buffers.

Managed publication, movement, interrupted HEAD recovery and private file locks
remain the existing storage system's responsibility. Pending-only stores are
included in discovery and moves. Inputs, catalog entries and total justification
bytes stay bounded. Unpublished staging is preserved, not presented as work.

## Drift findings

| Finding at main c48bfa8 | Disposition |
| --- | --- |
| The implementation-order paragraph still schedules the reader/search sequence delivered in 0.23.42. | Reconciled against the release and implementation; next work is exact unfinished-context resumption, then generic source-driven assembly. |
| Failed requests are held only in a panel object removed on disposal. | Confirmed closure/restart gap; retain the request before checking and reopen through the existing picker. |
| A test titled “pending work survives closure” only checks a disposed object, not discoverability after a fresh activation. | Replaced with a move-guard test and a separate fresh-activation/fresh-process resumption check. |
| Nested standalone publication reacquires its own workspace-store lock. | Reuse only an already-held same-store guard; a separate process still fails to acquire it. |
| Disposing a busy panel removes it from the set used to block saved-work moves. | Keep its operation in the guard until it settles, without reopening the panel. |

The scope is resumption of an explicitly started justification search. General
context assembly, larger inference search and paper–Lean correspondence remain
pending. Formal checking remains relative to the supplied admissions.
