# Controlled comparison for Windows replacement denials

Status, 2026-10-20: **separately approved and executed; Windows folder resumed**.
The checkout started clean at `4a286d8`. The four before/paused/resumed probes
respectively produced **3/4, 4/4 and 3/4 successes**. Each failed probe reported
`PermissionError`, errno 13 (`EACCES`). No probe was retried. Probe-phase elapsed
times were 0.834, 0.570 and 0.826 seconds; these are not measurements of the
whole pause interval. The operator completed normally, and an independent
read-only API query confirmed `paused=false`, zero folder errors and zero
needed files, with scanning in progress. Scanning is not completed handover.
[Sanitized evidence](evidence/artifact-storage-20261020/quiet-comparison.json)
records the result. No real store or note was edited.

The difference supported testing paused operation, but twelve probes did not
establish causality, identify a blocking process, or qualify the filesystem.
The subsequent separately approved [paused transaction qualification](#paused-transaction-qualification)
failed at the first test's preflight `os.replace` with EACCES, before commit.
The original folder configuration was restored and independently verified
unpaused. **Pausing is not a qualified remedy.** Both bounded operations are
finished; do not repeat them or infer support from the earlier four successes.

The approved metadata/ACL setup was completed. It solved the private-mode
mismatch and allowed an actual fixture move/save/reopen, but nested filesystem
probes also encountered repeated `EACCES` on `os.replace`. The process causing
those denials has not been identified. Do not assume Syncthing caused them, add
blind retries, clear permissions, or recommend moving real work on that evidence.

The executed operation was one bounded comparison with the **existing
Zettelkasten Syncthing folder temporarily paused**, then resumed. It changes
only that folder's `paused` flag. It leaves all other settings, devices, mounts,
ACLs and MRW bindings unchanged. No application or WSL restart is required.
Notes stay local and editable; network synchronization of the vault waits for
the comparison to finish. No notes are edited by this operation.

AGENTS.md says: “Do not change permissions/mount/sync configuration without
separate authorization.” The previous approval covered only the new private test
directory and its mount, expressly leaving Syncthing unchanged. The user then
separately approved this comparison. That approval does not authorize permanent
configuration changes or repeated pause/probe campaigns.

## Exact scope and configuration diff

The user identifies a Raspberry Pi 5 as the network's Syncthing peer and Windows
machines as SyncTrayzor clients. The observed local engine is Windows Syncthing
v2.1.6 under SyncTrayzor; this operation changed only that client's existing
folder ID `Zettelkasten`. It sent no command to the Pi. The local API reports a
connected peer version 1.19.2-ds1; its filesystem, account and permissions were
not inspected.

```diff
- "paused": false
+ "paused": true
```

The original value must be confirmed as false before starting. A `finally`
block restores false and verifies it. Use the documented granular
[`PATCH /rest/config/folders/{id}`](https://docs.syncthing.net/rest/config.html)
operation with only `{"paused":true}` or `{"paused":false}`; do not send a
replacement configuration. The API is documented since 1.12.0 and in the
[versioned 2.0 manual](https://docs.syncthing.net/v2.0.0/rest/config.html), preceding
the installed 2.1.6. No device/authentication settings change.

The comparison used only disposable probe files under
`C:\Users\fleng\Zettelkasten\MRW-storage-test-20261020`, through its existing
metadata mount. No actual artifact store is moved or modified. Four nested
probes before pausing, four while paused, then four after resuming constitute
the entire comparison. Each phase has a 30-second process timeout. Individual
denials are recorded without retrying or forcing replacement. The whole pause
is bounded by the middle phase plus local API timeouts, normally under a minute.
No extended retry campaign follows an inconclusive result.

The guarded operator sequence is:

```powershell
$ErrorActionPreference = 'Stop'
[xml]$config = Get-Content -LiteralPath "$env:LOCALAPPDATA\Syncthing\config.xml" -Raw
if ($config.configuration.gui.address -notmatch '^(127\.0\.0\.1|localhost):[0-9]+$' -or
    $config.configuration.gui.tls -eq 'true') { throw 'Unexpected local API endpoint' }
$base = 'http://' + $config.configuration.gui.address
$headers = @{ 'X-API-Key' = [string]$config.configuration.gui.apikey }
$endpoint = $base + '/rest/config/folders/Zettelkasten'
function Read-Folder {
    Invoke-RestMethod -Uri $endpoint -Headers $headers -TimeoutSec 5 -Method Get
}
function Set-Paused([bool]$value) {
    $body = @{paused=$value} | ConvertTo-Json -Compress
    Invoke-RestMethod -Uri $endpoint -Headers $headers -TimeoutSec 5 -Method Patch `
        -ContentType 'application/json' -Body $body | Out-Null
    if ((Read-Folder).paused -ne $value) { throw 'Pause/resume verification failed' }
}
function Probe-Phase([string]$name) {
    & wsl.exe -d Debian --exec /usr/bin/timeout --kill-after=5s 30s /usr/bin/env `
        PYTHONPATH=/home/flengyel/src/theorem_terminal/src /usr/bin/python3 `
        /home/flengyel/src/theorem_terminal/.codex-work/artifact-storage-20261020/quiet-probes.py $name
    if ($LASTEXITCODE -ne 0) { throw 'Bounded probe phase failed or timed out' }
}
$folder = Read-Folder
if ($folder.path.TrimEnd('\') -ine 'C:\Users\fleng\Zettelkasten' -or $folder.paused) {
    throw 'Expected active vault folder not found; no configuration change made'
}
# No API key or complete configuration is written to the report or command line.
Probe-Phase 'before'
try {
    Set-Paused $true
    Start-Sleep -Milliseconds 1000
    Probe-Phase 'paused'
} finally {
    Set-Paused $false
}
Probe-Phase 'resumed'
```

The prepared local `quiet-probes.py` verifies the exact mount and private modes,
runs four unchanged production filesystem probes in a newly owned nested
directory, and reports only phase, successes, errors and elapsed time. It makes
no model/tool/record request. The script above and Python helper were syntax
checked before their one approved execution. Their actual outcomes are recorded
above, separately from syntax validation.

## Rollback, interruption and interpretation

Only the original `paused=false` field is restored, so unrelated settings remain
intact. The script always attempts that restoration on an ordinary exception.
If the operator process is killed or the API becomes unavailable during the
pause, open the existing Syncthing UI and **Resume** the Zettelkasten folder;
verify `paused=false`. Do not reset the configuration or restart WSL. Reports
and configuration stay host-local; no credentials are backed up into the vault.

Record which operations failed in each phase. A phase without failures does
not certify persistence or prove the cause of an earlier denial. A difference
between phases is evidence to investigate, not permission to reconfigure the
whole synchronization arrangement. If pausing does not resolve the issue,
retain the unsupported/unqualified status and report the precise filesystem
condition; do not bypass it. Full cross-machine permission/access acceptance
still requires an accessible second host, independently of this comparison.

## Paused transaction qualification

**Separately approved and executed once; failed before commit.** Starting at
clean `2b91a51`, the guarded operation verified the Windows folder paused and
ran the first selected test. It errored at the production filesystem probe's
`os.replace` with `PermissionError`, errno 13; fail-fast stopped the pass. One
test ran, zero passed, one errored. The remaining eight selected tests and extra
mode/source-absent checks did not run. The runner deliberately exited 1 rather
than timing out. The operator's `finally` restored `paused=false` and verified
the complete folder configuration unchanged (2.29 s elapsed). An independent
API read confirmed unpaused/scanning with no errors or needed files. The owned
Windows test tree was removed. [Exact results](ARTIFACT_STORAGE_VALIDATION.md#approved-paused-transaction-check--2026-10-20)
and [sanitized evidence](evidence/artifact-storage-20261020/paused-qualification.json)
retain this failure separately from the earlier comparison.

The candidate pause/write/resume workaround is **not qualified**. No runtime
code or private permission checks changed. No real store was opened/moved and
no Pi or desktop action ran. The cause remains unidentified, and actual
receiving access/synchronization and power-loss durability remain untested.
The bounded attempt stops here; no further environmental operation is proposed.

The executed operator files are local, ignored validation helpers in
`.codex-work/artifact-storage-20261020/`: `paused-qualification.ps1` and
`paused-qualification.py`. They are available for review on this installation;
they are not extension entry points or portable commands shipped with MRW.
The invocation below is an execution record, **not a request to rerun it**.
Its result-file guard now refuses another execution:

```sh
/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe \
  -NoProfile -NonInteractive -ExecutionPolicy Bypass \
  -File '\\wsl.localhost\Debian\home\flengyel\src\theorem_terminal\.codex-work\artifact-storage-20261020\paused-qualification.ps1'
```

The authorized operation selected these steps; failure stopped step 3 and
skipped step 4. Restoration in step 6 completed:

1. Refuses a previous result, an already-paused or differently located vault,
   or a trial directory without the previously approved protected Windows ACL.
2. Retains the current folder configuration in memory, sends only
   `PATCH {"paused":true}`, verifies it and waits one second. No API key or
   complete configuration is printed or saved.
3. Selects the existing nine `ArtifactStorageTests` for one pass, stopping at the
   first failed test, using fresh Linux fixture homes and Windows-mounted
   destinations. These cover move/save/
   reopen and exact references/associations, nine process-interruption points,
   uncertain binding durability, cleanup recovery, source changes, injected
   permission/disk/sync failures, later relocation, different-path adoption/
   incomplete/conflict refusal, and required research dependencies. Some existing
   branches explicitly select later Linux destinations; the report must retain
   that distinction. No model request, notebook or compiler action is included.
4. If those pass, uses one further owned fixture to reject `0640` payload and
   `0755` root modes, restore its modes and check exact retained access after
   making its disposable original source unavailable. It deletes only the
   temporary test trees it created; no real or existing navigation store opens.
5. Gives the Python process **180 seconds**, with a five-second forced-termination
   grace period. It stops after a failure or timeout, with no retry. Notes remain
   local/editable; synchronization waits during the pause. No application,
   service, mount or WSL restart is needed.
6. In `finally`, sends only `PATCH {"paused":false}`, verifies restoration and
   compares the folder configuration with its initial in-memory value. It
   reports independent changes instead of overwriting them. The result/log and
   restoration summary remain outside the vault. The operator then independently
   reads the folder's state, as for the completed comparison.

Rollback is the same **Resume Zettelkasten** operation above if the operator is
terminated before `finally` or the local API becomes unavailable. No persistent
mount, ACL, synchronization policy, actual artifact binding or Pi setting changes.
The failed check does not erase the earlier successful fixture move or ext4
desktop round trip, and those earlier successes do not qualify this setup.
Complete Windows-backed desktop return and actual receiving-host checks remain
unconfirmed. Syntax/read-only preflight checks passed before execution; they
are separate from this actual transaction-test failure. The original folder
configuration is restored. Do not repeat this bounded attempt or add retries
to turn the result into a pass.
