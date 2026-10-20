# Choose where MRW keeps saved work

MRW 0.7.0 lets you move the saved sources, outlines, annotations and associated
records for **this VS Code workspace**. Existing installations keep their current
location until you explicitly move it. Other workspaces are unchanged. Obsidian
continues to own your notes and attachments; no new vault is needed.

## Move this workspace's saved artifacts

1. Save reader annotations and human investigation summaries. Finish any active
   MRW request. Close older MRW windows using this store; executables predating
   0.7.0 cannot honor the new migration exclusion. Ordinary notes and notebooks
   can stay open in their editors.
2. Run **MRW: Show Artifact Location** in the intended workspace.
3. Run **MRW: Move Artifact Directory…**. Enter an absolute **new directory**
   on the Linux/WSL/SSH workspace host. Its parent must already exist.
4. Review the current directory, destination, affected project folders and
   workspace scope. Choose **Move artifacts** to commit the operation.
5. The result shows the effective directory. Open readers rebind to it. Run
   **MRW: Show Artifact Location** whenever you want to check it.

The setting `mrw.artifactMoveDestination` only supplies the input's suggested
path. Changing it never switches stores, initializes a new store or moves work.
An existing directory belongs to the separate opening operation below; MRW never
merges stores. Symlinks, redirected paths, self-moves, ancestor/descendant moves
and destinations overlapping host-local VS Code storage are rejected.

A possible synchronized location is
`/mnt/c/Users/fleng/Zettelkasten/MRW-artifacts`. **The current Windows-backed
mount does not support this move:** it reports directories/files as `0777`
despite requests for `0700`/`0600`. MRW rejects it before commit. No mount options,
Windows permissions or Syncthing settings were changed. Another mount must pass
its own capability checks; enabling a setting alone does not establish support.
See [actual filesystem results](ARTIFACT_STORAGE_VALIDATION.md).

## What moves

One move covers all MRW-owned durable artifacts in this workspace's extension
storage, including saved project folders no longer among its currently open
folders. The confirmation lists the project roots. This bounded store moves:

| Saved material | Existing layout / treatment |
|---|---|
| Exact retained UTF-8 sources | `outlines-PROJECT_HASH/OUTLINE_ID/source-HASH.bin`; bytes remain immutable |
| Supplied evidence attachments | Corresponding `artifact-HASH.bin` files, with separate evidence distinctions |
| Outline/region identity, spans, context and attributed annotations | `outline.json`, preserved exactly during relocation |
| Obsidian return destinations and stored labels | `obsidian-links.json`; no note prose |
| Saved investigation question, correction, conclusion and pending work | `investigation-PROJECT_HASH/active.json` |
| Retained terminal model records | The workspace's `model-calls/*.json` |
| Required parent/child records outside that storage | Exact verified copies retained as dependencies; their external originals are preserved |
| Persistent store/project identity and compatibility mappings | Added once; preserved on subsequent moves/adoption |

Unresolved transmissions must be reconciled or explicitly ended before moving
or initially opening a copied store. Navigation/migration never sends a request.
Ordinary source documents, Markdown/Obsidian notes, notebooks, scans/PDFs in the
vault, explicit exported records and unrelated files stay where they are. MRW
does not collect arbitrary record graphs or exports: the dependency closure here
is the reader's retained evidence and the saved investigation's exact parent and
child records. Unknown files in old MRW directories are preserved.

These are **host-local**, outside the chosen directory: the active-location
binding, transaction/recovery journals, writer and publication locks, output
reservations, credentials, caches, UI/session state, VS Code return markers,
ordinary document recovery, trusted tool settings and build/runtime outputs.
The standalone Qt application's project storage is unchanged.

## Commit, cancellation and recovery

MRW holds writer exclusion, records exact content hashes and deletion identities,
then copies to staging **on the destination filesystem**. It verifies complete
retained content and dependencies and checks that the source has not changed.
It durably publishes the destination, then atomically replaces and synchronizes
one **host-local active-store binding**. That is the authority switch; copying
and deletion across volumes are not one filesystem operation.

- Before commit, failure/cancellation leaves the original active and intact.
  Run **MRW: Recover Artifact Move** after interruption. An incomplete staging
  directory without a complete recorded deletion inventory is retained for
  inspection and its path is reported.
- After commit, the destination remains authoritative. Cleanup deletes only
  inventoried MRW-owned files with the same identity and bytes. It never
  recursively deletes the enclosing VS Code directory. Changed/unrelated files
  are preserved.
- **Move committed; old copies still need cleanup** means the switch succeeded
  but cleanup did not. Run **MRW: Recover Artifact Move** to retry. Operations
  stay blocked while the persisted transaction requires recovery. Do not choose
  the old copy or copy its contents back over the destination.
- If binding replacement succeeds but synchronization is uncertain, both copies
  are retained and writes block. Recovery compares the actual binding with its
  exact recorded alternatives, verifies contents and synchronizes it. A journal
  phase or directory timestamp cannot select authority.

Successful completion means the old inventoried artifact payloads were removed.
An unavailable bound directory produces an error; MRW never creates an empty
replacement. Restore its mount and run recovery/refresh. **MRW: Refresh Artifact
Location** rebinds an already open updated window after another local window
moved its store; it retains reader drafts. Stale clients cannot write to the old
location. MRW's locks coordinate updated local processes in the same VS Code
user-data installation; they do not coordinate different computers, profiles or
arbitrary filesystem edits. Use one active writing installation per store.

## Open a complete synchronized copy on another computer

Relocation and network synchronization are separate. Use your existing
synchronization arrangement only with a filesystem that preserves MRW's required
publication and private permissions. MRW installs no synchronization service.

1. Stop writing on the first computer. Finish recovery and close MRW windows
   using the store. Wait for your synchronization tool to finish copying the
   entire selected artifact directory, including its identity, manifest and
   generation files. Preserve permission metadata.
2. On the receiving computer, open a workspace with one local folder for each
   project in the store. This workspace must have no existing MRW saved artifacts
   or store binding. There is no replace/merge operation in this release.
3. Run **MRW: Open Existing Artifact Directory…** and choose the local complete
   copy. Map each stored project explicitly to its local folder, then confirm
   **Open existing store** and the one-writing-computer requirement.
4. MRW verifies every required file/hash and record dependency before binding.
   The same spelling of a directory path is never evidence of identity.
5. When switching computers again, stop writing, close and finish synchronization
   before opening/refreshing the other installation. Do not let both write at once.

A manifest arriving first is insufficient. Missing bytes, altered records,
unexpected active-generation files and Syncthing conflict copies cause explicit
unavailable/conflict errors. Restore a complete consistent copy through your
normal backup/synchronization process; MRW neither selects the newer file nor
merges conflicting stores. Simultaneous writers whose changes have not yet
arrived cannot be detected locally; the single-writer procedure is mandatory.
A second-host synchronization acceptance check remains unavailable in the tested
environment; local copied-store checks do not establish distributed safety.

## Existing links and boundaries

Note opening/management resolves both verified legacy and logical references
through the existing Python resolver before matching an association's exact
retained target. Replacing/removing an existing association preserves its stored
reference bytes; a current region's changed range never selects an earlier pin.

Old `mrw-outline:v1` links retain outline/region IDs, source hashes and exact
pinned ranges. A moved store has a persistent UUID and project IDs independent
of paths. Verified compatibility mappings preserve its earlier path-derived
scopes. Immutable source provenance and absolute record locators stay unchanged;
explicit local bindings/aliases resolve retained records at the new location.

On another computer, open the mapped workspace yourself and use **MRW: Open Link
from Clipboard** with the old link. Its verified store identity permits the old
routing to resolve locally. A wrong/unbound window still offers **Copy Link and
Open Workspace**, whose saved address may belong to the original computer.
That button cannot invent a different local workspace address. Copy the link,
open your mapped local workspace and use the clipboard command. Original-source
navigation can remain unavailable if its historical path is absent; exact
retained passages and Obsidian associations remain accessible.

**Copying or synchronizing a note alone does not copy its MRW saved material.**
Moving/synchronizing the complete artifact store is the separate operation that
makes those sources, outlines and annotations available. Obsidian URLs still
need a corresponding local vault/note; MRW never copies or rewrites the vault.
Handwritten work remains in the existing note/attachment workflow.

Limits: 20,000 inventoried files and 512 MiB aggregate, including retained
unreferenced generations. Managed writes publish complete copy-on-write
generations and may temporarily require another full copy's disk space; this is
not an archive/history browser or general garbage collector. New project-folder
mappings are fixed at store creation/adoption in this increment. Native Windows
backend portability and power-loss certification remain outside this release.
The capability probe exercises private modes, file/directory synchronization,
immutable hard-link publication and atomic replacement; it cannot prove hardware,
driver or synchronization-service behavior under power loss.
