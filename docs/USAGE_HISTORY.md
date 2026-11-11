# Usage history in the Obsidian vault

Requested design, 2026-11-10. Not implemented in MRW 0.23.11.

Store MRW's shared usage and interaction history in the user's Obsidian vault.
Use the existing local recorder, extended for this storage location; do not add
a second telemetry system. The selected arrangement uses Syncthing on the
Raspberry Pi 5 and SyncTrayzor on the Windows machines. Synchronization remains
the responsibility of those applications, not a new MRW service.

## Location and ownership

Use a configurable vault-relative directory, suggested as
`MRW/History/`. Each workspace host resolves its own local vault path; do not
synchronize machine-specific absolute paths. Associate history with stable
logical workspace and source identities rather than the mount path.

Keep credentials, process locks, writer identity, caches and UI state outside
the synchronized directory. Give each installation a distinct writer ID,
including WSL and remote hosts; cloning a vault must not clone the writer ID.

This change covers history and the immutable snapshots required to interpret
it. It does not by itself synchronize active Study checkpoints, drafts, review
scheduling state or the complete research store. Preserve their current
lifecycle and recovery behavior. Do not add note contents or prompts to
feature-use events merely to count use.

## Concurrent and offline use

Each writer publishes immutable event batches beneath its own directory, with
unique session/batch names. Preserve event IDs, origin, software version, schema,
timestamps, sequence and explicit links to related events. Prepare complete
files before publishing them. Multiple machines must never append to one shared
log or edit one synchronized database.

Read all available batches, deduplicate by event ID, and resolve linked records
without assuming synchronized clocks or file-arrival order. Identical duplicate
records count once; different payloads with the same ID are a reported conflict,
not a last-writer-wins decision. Missing batches or snapshots remain missing,
rather than becoming zero use or a failed study outcome. Discover later arrivals
without requiring a restart.

Keep reporting usable while other machines are offline. Show which writers and
periods are represented; do not claim that MRW knows all devices have synchronized.
If the vault is unavailable, retain a bounded host-local pending queue and expose
the recording gap; retry without duplicate events or blocking reading.

Syncthing can preserve conflicting edits as conflict copies; it does not merge
application records. Validate and identify records independently of file names.
See [Syncthing's synchronization documentation](https://docs.syncthing.net/users/syncing.html).

## Feature-use report

Extend Inspect/Export history with a compact report by feature, writer, period
and MRW version: invocation count, last use, observed completion, cancellation,
failure and operation duration. Document which command and webview actions are
covered. Distinguish available-but-unused, unavailable and uninstrumented
features. Completion of a command is not evidence of benefit or mathematical
understanding.

Use the existing study measures alongside these counts where relevant. Reports
are derived from events, not another authoritative store. Provide Markdown
exports readable in Obsidian with unique output names; do not make every host
rewrite a common report. Preserve the option to disable new usage recording.

## Migration and verification

Offer an explicit, recoverable import of existing private history and its
required snapshots into the chosen vault directory. Preserve IDs, original
versions, linked context and fixture/production distinctions. Importing the same
history twice must not double-count it. Verify the copied history before
activating the new binding and retain the original until recovery is established.

Preserve Study deletion semantics when history becomes shared. Suppress stale
records using the existing opaque deletion identity scheme or a compatible
extension; an offline writer's later synchronization must not resurrect deleted
study content. Do not promise deletion from disconnected copies or external
backups. Implement and test this boundary before enabling shared storage.

Verify two writers offline and after synchronization, duplicate import,
out-of-order batches, missing references, conflict copies, interrupted
publication, unavailable vaults and late arrivals after deletion. Use disposable
vaults on the intended Windows/WSL2 and Linux paths; do not infer Windows-backed
filesystem behavior from a Linux-only test.

The current implementation remains documented in
[History and export](ACTIVE_STUDY_WORKFLOW.md#history-and-export). Shared history
storage and the feature-use report are the requested follow-up, not capabilities
already shipped.
