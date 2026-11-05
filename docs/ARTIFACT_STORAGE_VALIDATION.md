# Artifact storage validation — 2026-10-19

## Completion notifications and command labels — 2026-11-04

The user reported an operation-in-progress error while opening a saved source
after reconnecting a relocated study. The new host-local binding was present
and there was no pending move journal. The user also reported possibly choosing
Move instead of Open; the exact click sequence is unconfirmed.

The command handlers awaited `showInformationMessage` inside their storage
transaction. A completion notice that remained open therefore kept readers
frozen and the operation guard set. Patch 0.13.1 completes the transaction,
refreshes its epoch and releases readers before displaying the notice.

Five regression cases leave completion notifications unresolved and then open
the retained source: Move, Open, folder preparation, reconnection and recovery.
They use disposable stores on the persistent Linux filesystem. An initial /tmp
fixture attempt was refused by the core's tmpfs check; no check was weakened.
The original preparation and recovery cases reproduced the operation-in-progress
error. Three initial baseline cases exceeded a 15-second test limit; the patched
focused run used a 60-second limit and passed all five cases.

The shared Python run completed 379 tests: 312 passed and 67 were skipped. The
skips were:
58 opt-in Qt widget checks, five unavailable built-checker checks, three opt-in
TikZ host checks and one unauthorized Windows-backed fixture. Syntax checks,
Python compilation and 271 local documentation links pass. The 0.13.1 VSIX
matches its production manifest and all runtime bytes; development files are
excluded. Its SHA-256 is
`1f27ab7b1e40e0a517ed9d6001071fd965e389079fc0b6f56d878af1aff91b29`.
The broad extension run executed 115 tests: 114 passed. Its only failure was an
obsolete assertion requiring the removed tutorial advice. The content-string
assertions were removed; exact preview bytes, read-only behavior, no file
creation and no service calls remain checked. The tutorial and starting-view
cases then both passed. No production code changed after the broad run. The
pending Open/Move cancellation case also passed, confirming that prompts retain
the guard until cancelled and cancellation does not move or adopt a store.

The VS Code CLI reported successful installation of 0.13.1 in WSL Debian.
The installed version and 64 packaged runtime files were checked against the
verified VSIX. No window reload or workspace switch was invoked. Actual-window
acceptance remains pending; installation does not establish that the running
extension has loaded the update.

Commands are labelled **Open Saved Work Directory…** and **Move Saved Work
Directory…**. IDs, source records and core publication behavior are unchanged.
The bundled tutorial covers controls and persistence; generic study advice is
removed. API-double checks do not establish actual-window acceptance.

## User-requested Obsidian-closed check — 2026-10-20

Started at clean `2101421395f1ac43799efbb5f6217f835f85d6d2`. The user
proposed Obsidian interference, agreed to a single disposable check and confirmed
normal application closure. The Windows operator verified **zero Obsidian
processes both before and after**. The Zettelkasten Syncthing folder was
**unpaused before and after**, with its complete configuration unchanged. No
configuration write, application restart, Pi command, mount or ACL change ran.

The same existing case that errored in the preceding paused attempt,
`test_move_pinned_links_notes_mutation_restart_and_old_payload_removal`, now
**passed: one run, one pass, zero failures/errors**, in 11.158 seconds (operator
11.848 seconds). It used a fresh Linux fixture and destination under the actual
scoped Windows metadata mount. Only the test's destination setup was redirected;
production core/probe/publication checks were unchanged. No failed operation was
retried. This is a core fixture check, not an installed-command or desktop test.

The case verifies committed relocation and removal of old owned payloads,
unchanged ordinary source/unrelated host state, whole-outline and exact pinned
references, stored Obsidian association/label, a later annotation save and logical
reference, plus a fresh `ArtifactStorage` client seeing the same store UUID.
That client is constructed in the same Python process; **normal application
close/reopen was not tested here**. No Obsidian URL was dispatched or note moved.
The owned test trees were cleaned. All 14 prior inventoried work/package files,
the original navigation source, temporary note, WSL configuration and existing
0.7.0 VSIX retained their bytes. No real store was moved.

This supports investigating the user's hypothesis; it does **not** prove that
Obsidian caused the earlier intermittent denials or that closing it is necessary.
Earlier probes and a fixture move also passed, so a single new success cannot
identify the blocking process. The remaining transaction cases, normal restart,
full Windows-backed desktop return, receiving-host permissions and actual
creation/edit-back synchronization remain outside this one check. The real-store
procedure is still unqualified and the storage goal unfinished. Obsidian may be
reopened; no further test or shutdown is requested. No runtime/new VSIX change.
[Sanitized observations](evidence/artifact-storage-20261020/obsidian-closed.json)
record this pass separately from the earlier failed paused test below.

## Approved paused transaction check — 2026-10-20

Started at clean `2b91a51bba761513ba492684182a8565d3bca2b3`, installed MRW
0.7.0 unchanged. The user separately approved the exact prepared operation.
It ran once, with **fail-fast** enabled and no automatic retry. The Windows
client's vault folder was verified paused before the Python fixture runner.
This verifies its API configuration flag; native file-handle quiescence was not
measured.

The first selected test,
`test_move_pinned_links_notes_mutation_restart_and_old_payload_removal`, errored
during `artifact_plan → destination → probe → save_mutable → os.replace`.
The exception was **`PermissionError: [Errno 13] Permission denied`**, replacing
a disposable probe temporary file with its `record` target under the actual
scoped NTFS-backed metadata mount. The test ran for 0.312 seconds. It did not
reach the move or authority switch. **One test ran, zero passed, one errored;
the other eight selected tests did not run.** The extra rejected-mode and
original-source-unavailable checks were also not reached. These are not passing
or skipped tests, and the earlier nine-case active-sync run remains separate.

The helper deliberately exited 1 after the first error; this was not a timeout
or interrupted operator. `finally` restored `paused=false` and verified that
the whole folder configuration equalled its initial in-memory value. Operator
elapsed time was 2.29 seconds, including its one-second settling delay. An
independent read-only API query confirmed the Windows folder unpaused, scanning,
with zero errors and needed files. These counters do not prove completed network
handover. The owned Windows temporary test tree was removed. No Pi command,
application/WSL restart, lasting configuration/ACL/mount change, provider request,
compiler, notebook action, desktop input or real-store move occurred.

**Pausing the Windows client's folder is not a qualified workaround.** The
four passing paused probes in the earlier comparison did not establish reliable
transaction prerequisites. No blocking process or definitive cause has been
identified; do not assert that Syncthing caused the denial or that all DrvFS
configurations are impossible. The original mount still lacks private modes;
the metadata trial fixes that mismatch but cannot reliably complete preflight
atomic replacement in this tested environment. Retain all publication/mode
checks and leave the real store at its original location. The bounded attempt
ends here without retries, a proposed permanent configuration, or another pause
request. No new environmental operation is prepared or required of the user.

Actual receiving-host creation/edit-back/access and the complete Windows-backed
desktop return remain unconfirmed. The earlier ext4 physical round trip remains
valid separate evidence. The synchronized Zettelkasten storage goal is **not
complete**. [Sanitized failure and restoration evidence](evidence/artifact-storage-20261020/paused-qualification.json)
records this actual host result. No runtime or package change is delivered.

All 14 previously inventoried work/package files, the original navigation source,
the temporary note, `/etc/wsl.conf` and `/etc/fstab` retained their bytes. The
fixture cleanup and final configuration checks are actual observations, not
claims that the transaction suite passed.

## Approved Windows-client pause comparison — 2026-10-20

Started at clean `4a286d873e5821f77683dda886f96c3f5d016206`, with unchanged
installed MRW 0.7.0. The user separately approved the prepared comparison and
clarified the topology: a Raspberry Pi 5 is the Syncthing peer, and Windows
machines are SyncTrayzor clients. The local API observes the Windows client's
Syncthing v2.1.6 engine, not a WSL service. No command or SSH attempt was sent to
the Pi; the connected peer's version does not establish its filesystem access.

The exact prepared operation ran once on disposable nested directories through
the existing metadata mount. It changed only the Windows Zettelkasten folder's
`paused` flag, `false → true → false`, with restoration in `finally`:

| Phase | Passed | Denied | Probe-phase elapsed |
|---|---:|---:|---:|
| Before pause | 3 | 1 | 0.834 s |
| Paused | 4 | 0 | 0.570 s |
| Resumed | 3 | 1 | 0.826 s |

Both denials were `PermissionError`, errno 13 (`EACCES`); the helper records the
exception class/errno, not a new native-handle trace or responsible process.
Earlier regression traces locate that condition at preflight `os.replace`.
No failed probe was retried or forced. The phase timings do not measure the
complete pause interval. The operator exited successfully, and an independent
read-only API inspection confirmed `paused=false`, `errors=0`, `neededFiles=0`
and state `scanning`. This is resumed operation, not proof of completed network
handover or actual receiving-side validation. Ownership/xattr/fsync settings
still match the earlier inspected values; no lasting configuration change was
made. No WSL/application restart or desktop input was performed in this step.

This bounded difference warranted testing paused writing; it did not establish
Syncthing causality or filesystem qualification. The [paused transaction check](WSL_ARTIFACT_STORAGE_COMPARISON.md#paused-transaction-qualification)
was subsequently separately approved and stopped at its first preflight error,
as recorded above, with configuration restored. It supplies no supported
pause/write procedure. The real store remains unmoved; actual Pi
creation/edit-back/access tests and the complete Windows-backed desktop return
remain unconfirmed. There is no runtime change or new VSIX. Document/helper
syntax and preservation checks are separate from the historical 0.7.0 regression
suite. [Sanitized comparison evidence](evidence/artifact-storage-20261020/quiet-comparison.json)
retains the exact per-probe results and independent final API status.

All 14 previously inventoried work/package files, the original navigation source,
the temporary note, `/etc/wsl.conf` and `/etc/fstab` retained their bytes. The new
Python helper parses, PowerShell reports zero syntax errors, and its read-only
`-ValidateOnly` preflight confirms the unpaused folder/private trial ACL without
running tests or changing settings. These are preparation checks, not paused
transaction-test results.

## Authorized metadata trial — 2026-10-20

The user approved the exact scoped operation prepared in `2cc1590`. The checkout
was clean at that commit. MRW runtime/package remains **0.7.0**; no runtime checks
were changed. Only the new disposable Windows directory's ACL and its separate
mount were configured. The real artifact store, existing vault ACLs, `/mnt/c`
and WSL configuration remain unchanged. The later approved temporary Syncthing
pause and verified restoration are recorded above.

The new directory is `C:\Users\fleng\Zettelkasten\MRW-storage-test-20261020`.
Its protected Windows ACL has three inheritable FullControl grants: current
account, SYSTEM and Administrators; its owner is the current Windows account.
WSL-created and Windows-created children inherit those grants, without the
vault parent's sandbox-group read grant. No unrelated ACL was edited.

The actual separate mount is the repository's ignored
`.codex-work/artifact-storage-20261020/windows-metadata`, source exactly that
Windows directory, read/write **9p/DrvFS with metadata, uid/gid 1000, umask 077,
fmask 111**. Passwordless sudo was unavailable; the successful command used
`wsl.exe -d Debian -u root --exec /bin/mount …`. No session stopped. An earlier
invocation without `--exec` lost Windows path separators and installed no mount.
No fstab/wsl.conf entry was changed; this mount is temporary across WSL restarts.

Observed results:

| Check | Actual result |
|---|---|
| Unchanged production filesystem probe | Passed private modes, hard-link publication, replacement, file/directory fsync |
| WSL-created directory/file | `0700` / `0600`, uid/gid 1000 |
| Windows-created directory/file | `0700` / `0600`, local uid/gid 1000 through verified mount defaults |
| Windows replacement of WSL-created file | Exact new bytes, `0600`, local ownership and private inherited Windows ACL |
| Production VS Code command, ext4 → scoped Windows mount | Committed; five old owned files removed, old source directory empty, same store UUID |
| Subsequent reader annotation | Saved through actual production edit handler; reopened with exact text |
| Original source temporarily absent | Old link still selected the exact retained passage; original restored byte-identically |
| Windows-created identity/HEAD before payload | Rejected as incomplete before adoption |
| Complete Windows-created byte-only copy | Full manifest/dependency/identity and local ownership/private-mode validation passed |
| Different-path adoption and later MRW edit | Passed using production core; old reference and stored Obsidian association preserved |
| Later Windows replacement of edited receiving HEAD | Complete store and annotation remained available, `0600`, without copied Linux metadata |
| Unsafe `0755` root / `0640` metadata and conflict file | Rejected; exact fixture contents/modes restored |

The actual Development Host used copied installed production JS/core, real
commands, reader and workspace storage; only its entry point/dialog answers and
test guard differed. It blocked provider/network/tool subprocess execution in
the Python bridge. The annotation was a scripted reader-message action, **not
manual typing or independent human use**, with unknown origin and explicit
fixture attribution. Windows receiving-copy preparation wrote bytes through
native Windows file handles; it did not copy Linux metadata. These are **local
copied-store tests, not actual inter-computer synchronization**. No second-host
authentication retry or credentials/configuration change occurred. Successful
fsync return values are not power-loss durability evidence.

The normally restarted installed window followed the saved link with **Open Link
from Clipboard**, selected exactly `α😀 retained`, and displayed the later
annotation. A first physical Obsidian click did not confirm a new retained view.
After explicit command activation, one final bounded physical click produced
fresh native view `361c324d-67da-4353-b4c5-73e5fe61ad0d/2`, distinct from the
clipboard-follow view `/1`. Read-only selection bytes independently equalled
`ceb1f09f98802072657461696e6564`; the saved annotation was also observed. The
reader's linked-note accessibility invocation did **not** produce a foreground
confirmation within its five-second observation window. Therefore the full
Windows-backed desktop return is **unconfirmed**. The earlier completed ext4
round trip remains separate evidence. One clipboard wrapper initially replaced
the URI while entering the command name; that setup error was corrected and is
not a production-navigation result. No further desktop retry campaign ran.

Publication qualification remains open. The first nine existing regression cases
with Windows-backed destinations produced **seven passes and two errors**;
the targeted repeat of two cases produced **three errors**, including subcases.
All those errors were `PermissionError(EACCES)` at the disposable probe's
`os.replace`, before authority switched. The reached cleanup/uncertain-binding,
changed-source, adoption and required-research-record cases passed. Some test
branches explicitly choose a later Linux destination; this run does not prove
every injected branch on Windows. These are injected failures/process exits,
not actual disk exhaustion or power loss.

Eight short root-level diagnostic probes passed. A nested diagnostic reproduced
the denial, retaining exact previous/pending bytes; one 200 ms delayed attempt
with the same temporary inode also failed. Four later bounded nested probes
passed without exposing a failure for native Windows access inspection. **No
responsible process or Syncthing cause was established.** Do not describe the
failed regression runs as passing, add blind retries, or declare this setup
qualified for real work. The [single controlled comparison](WSL_ARTIFACT_STORAGE_COMPARISON.md)
was subsequently separately approved and executed as recorded above. No
permanent configuration is recommended yet.

The real store remains unmoved. The disposable fixture is now bound to the
temporary Windows mount; restore that exact mount after WSL restart before using
its links, or explicitly move the fixture back before unmounting. Host-local
bindings/journals/locks remain outside the store. All prior 14 inventoried
work/package files, the original fixture source and temporary note retained
their hashes; intentional disposable annotation changes are separate. No new
VSIX is appropriate for this configuration/evidence-only result. The full 0.7.0
regressions are historical below; the new Windows runs and their errors are
reported separately. [Sanitized trial evidence](evidence/artifact-storage-20261020/metadata-trial.json)
records the distinctions.

## Windows-backed follow-up — 2026-10-20

Started at clean `8ae554394943961248991704f9ef24dd85eddb04`; installed MRW
remains 0.7.0. All 47 installed non-manifest files match the existing VSIX.
This follow-up changes documentation and prepares a configuration trial; it
does not change runtime code or relax persistence checks. No new VSIX is needed.

Read-only host inspection distinguished the sandbox's read-only mount view
from the actual read/write NTFS 9p/DrvFS host mount, still without metadata.
WSL is 2.6.3.0, Debian kernel 6.6.87.2, uid/gid 1000. The vault's Windows ACL
grants the current account, SYSTEM and Administrators FullControl and a local
CodexSandboxUsers group ReadAndExecute. The `0777` presentation alone is not
evidence of access by all Windows accounts. The prior failure is a concrete
Unix-mode policy incompatibility; it does not prove every DrvFS configuration
incapable of preserving MRW artifacts.

The active local Syncthing API confirms Windows-amd64 v2.1.6, launched by
SyncTrayzor 2.2.0 under the Windows user's account. The vault is send/receive,
not paused, `ignorePerms=false`, `disableFsync=false`, and ownership/xattr send
and sync flags are false. At inspection it was idle with zero errors/needed
files. Its connected peer reports v1.19.2-ds1. These are local observations of
configuration/status, **not receiving-host filesystem or synchronization
acceptance**. No key, device identifier or credential was exposed. No SSH retry
or configuration change was attempted.

[The exact scoped metadata/ACL trial](WSL_ARTIFACT_STORAGE_SETUP.md) is prepared
with scope, commands, rollback, restart impact and success checks. It creates
one disposable Windows directory with a private ACL and mounts only that
directory, preserving `/mnt/c`, existing configuration and working sessions.
It awaits AGENTS.md's separate permission/mount authorization. No metadata mount
has been tried, no Linux→Windows fixture move has committed, and synchronized
creation, later replacement/edit-back, receiving ownership and access checks
remain unperformed. Metadata portability is not assumed; the peer predates
Syncthing's xattr feature. The Zettelkasten storage goal remains unfinished.

The independent outstanding Obsidian check **passed on the existing moved ext4
fixture**, with installed 0.7.0, Windows VS Code 1.141.2 and Obsidian 1.14.4:

1. Opened the existing persistent fixture as an isolated ordinary installed
   workspace after its previous normal close. Accessibility showed no retained
   source editor before the click. The user's two working VS Code windows stayed
   open and untouched.
2. Normally closed the temporary-note Obsidian window with Alt+F4 and reopened
   it through its existing note URL. A new application window/process appeared.
   Startup was slow; no repeated launch/input campaign ran. The user reported
   that loading had finished before the guarded link action.
3. Inspected the existing temporary note's saved hyperlink. Foregrounded the
   isolated intended workspace, allowed it to settle, then foregrounded Obsidian.
   A **physical pointer click**, guarded by the actual hyperlink identity at
   that point, followed the same saved pre-move URI.
4. A fresh native retained-source view, instance
   `0e81c559-b240-4760-96e4-819a0aebb025`, appeared in the intended WSL workspace.
   Read-only accessibility selected exactly `α😀 retained`; the saved UTF-8 bytes
   independently matched `ceb1f09f98802072657461696e6564` (11 Unicode scalars,
   12 UTF-16 code units). This is a fresh retained selection, not dispatch alone.
5. Invoked the enabled passage **Open linked note in Obsidian** reader control
   through accessibility (the passage card was below the visible viewport).
   The correct **Temporary MRW artifact move navigation check** Obsidian window
   was observed returning to the foreground. The whole-outline return button
   remained disabled because the association belongs to the passage.

This closes the physical post-move desktop round-trip gap for the ext4 fixture;
it establishes no Windows-backed or cross-machine acceptance. These are
agent-operated desktop observations, separate from independent human use and
the user's earlier report of practical benefit. No mathematical exercise or
broader usefulness claim was added.

All seven inventoried fixture source/note/identity/manifest/payload files retained
their hashes. No real artifact binding was changed. A clipboard-restoration
wrapper reported an error during initial note launch; that action neither set
the clipboard nor edited a note, and is not counted as hyperlink acceptance.
The later guarded physical click and read-only UTF-8 comparison completed.
Nineteen existing focused Python storage tests passed again. Required 0.7.0
final regressions below remain historical (345 run = 286 passed + 59 skipped);
no runtime change requires a repeated full-suite or package build.
Both proposed shell blocks passed syntax checking. Windows PowerShell parsed the
proposed ACL commands without errors and constructed the three-rule protected
ACL in memory; no ACL was applied. All 14 prior inventoried work/package files
also retained their hashes. The isolated fixture VS Code window was normally
closed after observation, leaving the user's working windows and Obsidian open.
[Sanitized observations](evidence/artifact-storage-20261020/validation.json)
record these results separately from the unperformed setup/synchronization tests.

## Original 0.7.0 increment

This increment starts at clean `9f1c4c7` / MRW 0.6.1. No subsequent/unrelated
changes were present. Version 0.7.0 keeps the extension identity
`flengyel.theorem-terminal` and the existing Python core. The user's actual
artifact location was not moved. Ordinary notes, source documents, notebooks,
existing private outlines and previous VSIX packages were preserved.

## Automated evidence

- **48 Node cases passed** in the non-isolated runner before the final note-target
  correction. That correction then passed focused command coverage and the final
  standard `npm test` run (all five test-file wrappers, containing the same 48
  cases). The tests use the production bundled bridge where applicable; command
  doubles establish API/bridge contracts, not desktop use.
- **345 Python tests ran: 286 passed, 59 skipped** (58 opt-in Qt checks and one
  unavailable external project-parent check). Shared record regressions passed;
  Qt was not installed/exercised for this extension increment. Existing available
  tool integrations, including TeX engine tests, ran inside the required suite;
  migration/navigation itself invoked none of them.
- JavaScript syntax checks and Python compilation passed.
- Nineteen new Python storage tests cover exact Unicode/CRLF retained bytes,
  pinned passage identity/ranges, evidence, annotations and Obsidian sidecars;
  removal of only inventoried owned files; changed/unrelated-file preservation;
  stale clients and independent updated publishers; missing directories;
  invalid/self/ancestor/descendant/symlink destinations; source changes during
  copy and after confirmation; exclusive destination reservation after a raced
  preflight check; second relocation; required external ModelCall
  dependencies and investigation resumption/summary saving after adoption with
  the old project and original records unavailable; different
  local project paths; incomplete copies, conflict files and no merging.
- Forked processes actually exit at nine move boundaries: before copy, staging,
  during copy, verification, destination publication, before binding, immediately
  after binding replacement, and before/after cleanup. Restart recovery selects
  authority from exact binding bytes and verified content. These are process
  interruption checks, **not power-loss tests**.
- Permission/disk-full errors and directory synchronization failures are injected
  with real file publication otherwise intact. A failure after binding replacement
  preserves both copies and blocks operations until verified recovery; committed
  cleanup failures retain destination authority and support repeated cleanup.
- Managed assistance tests use deterministic injected transport only. A pending
  R3 reservation is durably published before transport; a subprocess interrupted
  after terminal retention recovers the exact outcome and explicitly resumes
  without retry. Migration/navigation initiate no provider call.
- Frontend checks cover dirty-reader refusal, freezing/rebinding without losing
  text, stale windows and an old external route resolving only after explicit
  copied-store adoption into the mapped local workspace. Local bindings sharing
  a UUID serialize through host-local exclusion.

Validation exposed a real post-move note-opening defect: the reader generated a
logical-scope reference but filtered legacy associations by literal URI equality.
The core now resolves the selected target with its existing parser/resolver and
matches only already-validated associations with the same exact region/span.
Existing stored references are unchanged. Focused bridge/command coverage opens,
replaces and removes a pre-move note link after relocation and rejects redirecting
an earlier pin to a changed current range. This correction is included in the
final package.

## Actual filesystems

The desktop arrangement is Windows VS Code **1.141.2**, WSL2 **Debian**, Python
**3.13.5**, Windows Obsidian **1.14.4**. Production reads Linux mount information
and probes actual publication capabilities; checking `os.name == 'posix'` alone
is insufficient.

The persistent Linux fixture and selected destination are on **ext4** under the
repository's ignored `.codex-work/artifact-storage-20261019/`. File/directory
synchronization, private modes, immutable hard-link publication and atomic
replacement pass there. The host-local binding is under the existing WSL VS Code
workspace-storage directory on ext4.

The actual Windows-backed `/mnt/c` mount is **9p/DrvFS**, source `C:\`, with
`aname=drvfs`, `access=client`, uid/gid 1000 and **no metadata option**. Disposable
probes in Windows Temp and, following the user's express authorization, inside
`C:\Users\fleng\Zettelkasten`, observed:

| Capability | Actual result |
|---|---|
| Directory requested `0700` | Reported `0777` |
| File opened and fchmod requested `0600` | Reported `0777` |
| File fsync | Returned success |
| Directory fsync | Returned success |
| Immutable hard-link publication | Returned success |
| Atomic replacement | Returned success |

The actual VS Code move command attempted a disposable Windows Temp destination
on this mount and **rejected before commit**, preserving the original legacy
store and leaving no destination. The private-permission condition is unsupported;
no completed Linux→Windows artifact move is claimed. The exact intended vault
filesystem also fails those mode checks. Probes removed only their temporary
files. No mount options, Windows ACLs or synchronization settings were changed.
Other Windows-backed mounts need separate checks; no blanket WSL/DrvFS acceptance
is inferred. Successful fsync return values are not power-loss certification.

A separate actual cross-device ext4→`/dev/shm` tmpfs fixture exercises the copy,
verification, binding commit, old-payload cleanup and unchanged reference. It
explicitly bypasses the volatile-destination gate **only in the test**. This is
cross-device protocol evidence, not support for durable stores on tmpfs. The
final installed command correctly rejected an initial `/tmp` test destination
as volatile; that rejected trial is not counted as persistence acceptance. The
persistent ext4 fixture below replaces it. Production rejects tmpfs/ramfs.

## Actual host and desktop checks

A normal isolated Extension Development Host used the final production JS/core,
real commands, clipboard, reader webview and persistent workspace storage.
Only its entry point, scripted dialog answers and test configuration differed.
The test Python launcher blocked network sockets/subprocesses and removed the
provider key. The isolated launch disabled workspace trust for that test window;
no global trust setting was changed.

The source is a 61-byte navigation fixture, not a new mathematical exercise:
`persistent-navigation-fixture.txt`, exact SHA-256
`6cbd8065a05fc1a186c25177f082aab9af5a921fec8e64cee1372baade42791c`.
It retains Greek text, a supplementary Unicode character and CRLF. The pinned
selection is `α😀 retained`: line 1 scalar columns 0–11 (VS Code UTF-16 columns
0–12). A pre-move copied Markdown link and an explicit Obsidian association are
retained. The ext4 move showed scope/source/destination, committed, removed the
old owned payloads, rebound the open reader, and followed that same earlier link
to the exact selected text. The stored note label survived. This was observed
through actual host APIs; separate accessibility inspection is not substituted
for that assertion.

The one new ordinary note is `MRWStoreNav20261019de166d.md`, titled **Temporary
MRW artifact move navigation check**, in the existing Zettelkasten. It follows
matching immutable ID/filename, editable title, YAML, `SEE ALSO` and `References`.
It is visibly temporary. Scripted fixture preparation checked exact previous
bytes and inserted the copied link; this is not claimed as manual typing in
Obsidian. No vault index or unrelated title lookup was used.

After normal close/reopen as an ordinary installed-extension window, the same
pre-move URI was dispatched through Windows' normal protocol handler. The
intended WSL workspace opened the moved retained source. Read-only accessibility
selected exactly `α😀 retained`; its UTF-8 result was independently compared
with the saved fixture value. The installed **Show Artifact Location** command also visibly reported the
committed directory and this-workspace scope. The installed move command's input/current-location
control was observed. Its initial `/tmp` destination correctly failed the volatile
filesystem gate, with no commit. This was replaced by the ext4 Development Host
fixture above, not counted as a successful persistent move.

A physical pointer attempt in the temporary Obsidian note verified that the
pointer target was the exact saved MRW hyperlink before clicking. It did **not**
produce a confirmed fresh retained selection in the intended window. Initial reader-return attempts exposed the legacy/logical reference comparison
defect described above. After correction, a fresh actual Development Host
followed the same old link, checked the exact passage and stored label, and
successfully ran the production linked-note command with real URI dispatch and
no error. Its scripted chooser selected the existing passage. This establishes
actual command dispatch after relocation/restart; it is distinct from independent
human use or an Obsidian acknowledgment of note existence. The note itself was
also observed open after direct standard-URI dispatch. The **complete post-move
Obsidian desktop round trip remains unconfirmed** because the physical hyperlink
click did not establish a fresh exact retained selection. No extended retry campaign was performed.
A focus change to Chrome stopped an earlier keyboard attempt before dispatch;
no input was sent to that other window. An initial accessibility comparison
also used the wrong file decoding; that setup attempt is not acceptance evidence.

Seven navigation-fixture source/payload/note files were compared after these
actions and remained byte-identical. All 14 inventoried pre-existing fixture,
study, old-note and VSIX files also retained their earlier hashes. The user's
working windows and drafts were not reloaded or closed. Raw Obsidian captures
remain local because the sidebar contains unrelated private names. These are
agent-operated checks, not independent human use.

One intermediate Node run overlapped packaging, which refreshes the bundled
Python files, and failed one overview check. The isolated diagnostic passed
without a production change; the final complete 48-test run passed against the
stable completed bundle. Packaging and bridge tests must run sequentially.

## Synchronization and remaining bounds

Local copies at different paths pass complete hash/dependency/identity validation
before explicit adoption. Missing retained files and Syncthing conflict copies
fail. A bounded SSH probe to the previously used second host failed with
`Permission denied (publickey,password)`; credentials were not changed and no
retry campaign ran. **No second-host synchronization acceptance is claimed.**
Local locks are not distributed exclusion. One writing installation at a time
and completed synchronization before handover are mandatory. Undelivered
concurrent remote changes cannot be detected. MRW neither merges conflicts nor
chooses by timestamps, and a manifest arriving first is insufficient.

Limits include new/nonoverlapping move destinations, empty/unbound receiving
workspaces, a fixed explicit project mapping, 20,000 files/512 MiB aggregate,
full-generation copy space, and retained unreferenced generations after some
interruptions. Pre-0.7 executables must be closed before relocation. Native
Windows backend portability, distributed transactions, automatic synchronization
and power-loss validation remain outside the increment. The user's reported
practical benefit from the Zettelkasten bridge is preserved separately; this
implementation establishes no broader mathematical-use claim. Pi, R3, SagePod
and mathematics acceptance campaigns were not repeated.

## Package

Built with the established UTC/`SOURCE_DATE_EPOCH=1792094267` workflow:
`vscode/theorem-terminal-0.7.0.vsix`, SHA-256
`58fb0067adf8564325e7703215890e05711253f7be8a12ecd21d3cd8e5ed1975`.
Archive verification excludes development entry points and verifies runtime/core
bytes. VS Code's WSL extension-management CLI installed it successfully. All 47
installed non-manifest files exactly match the archive; the manifest differs only
by installation `__metadata`. Previous packages retain their original hashes.
No Marketplace publication was performed.

[Reviewed evidence](evidence/artifact-storage-20261019/validation.json),
[archive verification](evidence/artifact-storage-20261019/package-verification.json)
and [installed files](evidence/artifact-storage-20261019/installed-verification.json)
record the separate results.
