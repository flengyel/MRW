# Shared usage and interaction history

Implemented on the shared-history task branch after 0.23.12. The published
0.23.12 package does not contain this increment. See
[delivery and checks](SHARED_HISTORY_DELIVERY.md).

## Connect a directory

Run **MRW: Configure History… → Choose shared history directory…**. Select an
MRW data directory and confirm **Import and Connect**. MRW publishes the existing
private history and its required snapshots, reads them back, and changes the
connection only after verification. Cancellation leaves the previous connection
and files intact. Missing private snapshots or conflicting event copies stop the
import. Original private files remain available for recovery.

The data directory is independent of **MRW: Notes Folder**. Supported layouts:

| Data directory | Managed history |
| --- | --- |
| A separate directory | `<data>/History/` |
| A vault subdirectory, preferably `<vault>/MRW/` | `<vault>/MRW/History/` |
| The vault root | `<vault>/History/` |

Select an ordinary directory on the extension host. WSL paths use `/mnt/c/...`
for Windows folders. MRW refuses an occupied `History/` directory without its
format marker. It does not scan, import or change unrelated notes. The
`mrw.dataDirectory` machine setting suggests a location; changing the setting
alone does not change the verified connection. Each workspace's connection is
stored privately on that host.

Use the existing Syncthing/SyncTrayzor configuration to synchronize this
subtree. Another host selects the synchronized copy through the same command.
MRW supplies no synchronization service. A copy must include the format marker,
writer batches and deletion markers. Independently initialized collections are
not interchangeable connections.

**Reimport private history** verifies it again without duplicating event IDs.
**Retry shared history** publishes pending batches and refreshes the available
sessions. MRW also checks every 30 seconds after its recorder starts, and when
Inspect/Export history opens. **Disconnect shared history** keeps both copies;
pending batches and unverified deletion markers must be delivered first.

## What is shared

The existing recorder supplies the events. A complete immutable batch contains
schema 1, the publisher's writer ID, a logical workspace ID, study scope,
original event IDs, sequences, timestamps, origin, software versions, explicit
links, and the snapshots needed to interpret those events. Batches are grouped
by study so deletion does not rewrite another study's records. Snapshot copies
may occur in more than one batch; that protects surviving references.

Writer IDs live in the extension's host-local global storage, outside the data
directory. WSL, SSH and other installations receive separate IDs. Logical
workspace IDs live in private workspace storage; they do not expose mount paths.
Old events without a writer ID retain that absence and are labeled by their
import workspace. The report distinguishes their importer from a known original
writer. Qualified source references and revision hashes remain qualified.

File locators become `mrw-location:` references in the shared representation.
They are opaque and do not pretend to open a file on another machine. Private
originals retain their locators. Snapshot IDs remain the original snapshot
identities; each shared snapshot has `representation: portable-v1` and a separate
`sha256` for its actual portable bytes. Import verifies those bytes against the
projection of the digest-verified original. Exports label the representation;
they do not claim that a portable snapshot's bytes hash to the original ID.
Mathematical prose and ordinary formulas are not interpreted as filesystem paths.

Credentials, writer identities, locks, caches and UI state stay host-local.
History sharing **does not synchronize active drafts, Study checkpoints, review
scheduling or the saved-source store**. Those stores retain their existing
single-writer and filesystem restrictions. Ordinary notes remain ordinary files.

## Offline use, conflicts and deletion

Batches are staged, flushed, published without overwriting an immutable file,
read back, and directory-synced. A failed publication retains its pending batch.
The host-local outbox is limited to 128 batches / 16 MiB, with a 2 MiB per-batch
limit. An unavailable or invalid shared directory does not block ordinary
reading or private study saves. Queue overflow records a durable gap; original
private records remain for **Reimport private history**. Retry deduplicates by
event ID. Recovery also checks for private commits that had not reached the
outbox when the process stopped.

Identical IDs and payloads count once. Different payloads with the same event
ID are reported and excluded from derived results. Snapshot conflicts and
missing snapshots are explicit. Synchronizer conflict-copy filenames do not
select the winner. Session sequence and explicit links determine relations;
file-arrival order and clocks on different machines do not. Missing or
contradictory study evidence is not converted into a grade.

Permanent Study deletion first retains an opaque local marker. It publishes
that marker when the shared directory is available, removes accessible batches
for the study, and filters later arrivals before exposing them. Other studies'
batches and shared snapshots survive. A host keeps markers it has already seen,
including while offline. Deletion cannot erase disconnected machines, exported
reports or backups. The confirmation states this limit. Pending deletion cannot
be abandoned by changing or disconnecting the directory.

## Inspect and export

**MRW: Inspect Study History** includes the available workspace history, not
only the active study. **Export Study History…** selects sessions and includes
linked supporting context. Readable Markdown reports and inspectable JSON use
ordinary Save and a unique suggested filename; existing files are not replaced.

The usage table groups observations by feature, original writer/import origin,
UTC calendar date, software version and commit. It reports invocations,
completion, cancellation, failure, duration and last reported use. Dates and last
use are writer-reported, not assertions that clocks agree. Earlier unlinked
outcomes are shown separately rather than matched by timestamps.

Coverage in this increment:

- MRW commands registered through the command wrapper; the inventory distinguishes
  registered/available commands from unavailable commands in an untrusted workspace.
  Availability here means the command entry point; it does not assert that an
  optional external tool is installed or that the command will succeed.
- Bridge invocations and validated Study action handlers have invocation/outcome
  links. Cancelled native MRW dialogs and explicit Study cancellation are recorded.
  Completion means the handler returned, not that its mathematical task succeeded.
- Direct reader and proof-graph webview actions are listed as uninstrumented;
  their bridge requests, where made, are counted separately. Typing is not counted.
- Unused means no invocation in the represented period for an inventoried available
  feature. Missing inventory is not zero use. Other devices may still be offline.

**Configure History → Turn off usage recording**, or `mrw.usageRecording`, stops
new command/bridge/action counts and durations. It does not erase earlier records
or stop the pre-existing Study evidence and submitted-snapshot records. Usage
counts do not collect arguments, prompt text, returned prose or error prose.
Existing submitted work is shared only through the explicit history import and
subsequent connection, not to measure feature use.

Counts do not establish comprehension, usefulness or mathematical correctness.
Study measures retain their separate origins, missing context and denominators.
See [the study workflow](ACTIVE_STUDY_WORKFLOW.md#history-and-export).
