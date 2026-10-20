# Artifact storage validation — 2026-10-19

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
