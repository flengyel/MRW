# MRW 0.23.19 delivery

Published as a normal GitHub release, marked Latest:
[MRW 0.23.19 — recoverable workspace relocation](https://github.com/flengyel/MRW/releases/tag/v0.23.19).

[Download the VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.19/mrw-0.23.19.vsix) · [SHA256SUMS](https://github.com/flengyel/MRW/releases/download/v0.23.19/SHA256SUMS).

## Source and package

- Source A: `a8cc0dda980cbbc3f45fcbd849cfe7a2f0ae0699`.
- Release B/tag `v0.23.19`: `d44efb898208d9e24bfc143d16c218f2448e4c0c`.
- B changes only `vscode/media/build-info.json`; its marker identifies A with
  `localChanges: false`. The VSIX was built from clean B.
- VSIX: 690,596 bytes.
- SHA-256: `2237cb9f9054a0c9f149830e96c3d2420b951a30198d1e62e831f81fe3a88d18`.
- Main was fast-forwarded from `dced0ca21e8498e7df1c6c2b330dcae43e8e4e2f`
  and pushed normally. No published tag or asset was changed. This later
  report commit does not alter the release package.

## Delivered behavior

**Move Workspace…** inventories and copies a saved workspace and its private MRW
state, verifies the destination and rechecks the source, then publishes one durable
authority record. Original directories and private stores remain. **Recover
Workspace Move** selects the original before commitment or the destination after
commitment, including after process termination. Changed candidates block activation.
The old MRW session cannot continue writing after commitment.

Studies, unfinished study drafts, archived schedules, Trash, deletion markers,
retained citations, reader annotations, diagrams and history are preserved. Reader
or unsent Ask drafts, dirty native editors, failed checkpoints and competing MRW
sessions prevent a move. External vaults and external shared stores stay in place.

New study and navigation locations are relative to the workspace or their recorded
notes root. Existing absolute locations resolve through the verified move mapping.
Changing the selected vault does not redirect older note references. Study IDs,
document return locations and proof-graph selections survive relocation. Source
revisions, exact passages and ordinary mathematical text are not rewritten.

**Set Up MRW Workspace…** offers **Open in this window** and follows a committed
move of the default workspace. The move command opens its destination only after
an explicit choice. File tabs and revision-matched text selections are restored;
use Resume for saved reader and study panels.

See [the relocation workflow and limits](WORKSPACE_RELOCATION_DESIGN.md) and
[workspace setup](WORKSPACE_SETUP.md). The tutorial and current setup instructions
were updated with the implementation.

## Checks and exact scope

- At B, all **506 extension tests passed**, with zero failures or skips, including
  **28 workspace-relocation checks**. Tested runtime hashes match B.
- Cases include interruption at each commit boundary, failed writes before/after
  publication, actual `SIGKILL` and kernel lock release, stale/competing sessions,
  changed sources/candidates, occupied destinations, repeat recovery, a second
  move, relative paths, JSONC/remote URIs and dirty text/notebook/tab guards.
- Study lifecycle checks preserve an unfinished study, archive scheduling state,
  Trash and permanent-deletion markers through relocation and restart. Document
  checks preserve scoped external-note grants and the exact return selection.
  Proof-graph checks retain hidden vertices under the same logical identity.
- Same-filesystem copies ran on persistent Linux storage. A separate-filesystem
  fixture exercised copy/commit mechanics between that storage and `/dev/shm`.
  The latter is disposable test storage, not a supported production destination;
  the host command refuses memory-backed mounts.
- **432 Python tests**, **68 optional skips**, zero failures. Python source, tests,
  Lean files and `pyproject.toml` at B match the full Python run. Optional skips
  include Qt, explicit native TikZ checks and the unbuilt pinned Lean checker.
  No new Lean or mathematical verification is claimed.
- Clean wheel build/install, isolated `mrw` import and installed CLI help passed.
  The unchanged Python distribution retains version 0.23.12; the extension is
  0.23.19. No earlier MRW Python installation supplied the isolated import.
- The extracted VSIX's own bridge and move implementation reopened an unchanged
  retained citation and reader annotation after relocation, verified relative
  paths and recovery, and preserved the original source. No native window opened.
- Syntax, tutorial, **325 local Markdown links** in ten changed documents,
  `git diff --check`, package creation and exact VSIX inventory/byte verification
  passed. Dependency pins were preserved.
- Searched **501 tracked paths/files** and **150 archive entries**: zero
  superseded project-identity occurrences in names or contents.
- Both published assets were downloaded without authentication. Their bytes match
  the local release assets and `sha256sum -c SHA256SUMS` passed. The public tag,
  normal-release flag, Latest redirect and versioned README link agree.

Earlier diagnostic failures remain in the evidence: one picker test needed to
await asynchronous activation; its corrected test passed in both later full
runs. The system Python lacked pip; an isolated environment using the locally
available packaging wheels completed the clean wheel check. A post-build clean
check found the generated checksum file; it was moved outside tracked source
without changing source or package bytes. No failed check was hidden by weakening
production storage checks.

## Host observations and remaining limits

Linux filesystem and extracted-runtime checks ran on this host. Native move
controls and an actual VS Code restart were not observed; API doubles do not
establish native desktop acceptance. No isolated graphical host was available.
The working VS Code window was not replaced or reloaded, and this VSIX was **not
installed** into it. Genuine notes and saved research were not test fixtures.

The transaction is local to one Linux host and VS Code profile. It requires a
saved workspace with an owned root and Linux `flock` from util-linux. It rejects
occupied, Windows, network and volatile destinations and special files. A shared
history collection inside the root must be placed outside it first. File counts
and total bytes are bounded as documented.

The atomic step selects MRW's authority; it cannot atomically relocate VS Code,
other extensions or external programs. Save native editors and stop external
writers first. Other extensions' transient panels and Undo stacks are not copied.
Original backups require later explicit cleanup. An external launcher still
naming the old workspace may require **Copy link and open moved workspace**, then
**Open Link from Clipboard**. Vault configuration is not silently rewritten.

Manual copying of private study/history stores and manual repair of MRW-owned
locations are no longer required for a supported move. Saving/settling work and
explicitly opening the destination remain necessary. General cross-host transfer
and automatic consolidation of several earlier workspaces are not implemented.

Evidence, command exits, initial failures, hashes, package and downloads remain
outside tracked source at `~/.cache/mrw-workspace-transaction-20261112/`.
The next product increment remains the small PROV notebook trial.

## Dependency audit

Unchanged pins report **five findings: three high, two moderate**. `markdown-it`
is bundled. The other affected packages (`@azure/identity`, `@azure/msal-node`,
`@vscode/vsce`, `minimatch`) are packaging dependencies excluded from the VSIX.
These findings remain open; no automatic dependency update was performed.
