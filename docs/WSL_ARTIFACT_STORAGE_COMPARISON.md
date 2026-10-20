# Prepared comparison for Windows replacement denials

Status: **not executed; separate synchronization-setting authorization required**.
The approved metadata/ACL setup was completed. It solved the private-mode
mismatch and allowed an actual fixture move/save/reopen, but nested filesystem
probes also encountered repeated `EACCES` on `os.replace`. The process causing
those denials has not been identified. Do not assume Syncthing caused them, add
blind retries, clear permissions, or recommend moving real work on that evidence.

The next proposed operation is one bounded comparison with the **existing
Zettelkasten Syncthing folder temporarily paused**, then resumed. It changes
only that folder's `paused` flag. It leaves all other settings, devices, mounts,
ACLs and MRW bindings unchanged. No application or WSL restart is required.
Notes stay local and editable; network synchronization of the vault waits for
the comparison to finish. No notes are edited by this operation.

AGENTS.md says: “Do not change permissions/mount/sync configuration without
separate authorization.” The previous approval covered only the new private test
directory and its mount, expressly leaving Syncthing unchanged. This is why the
comparison requires its own authorization.

## Exact scope and configuration diff

Windows Syncthing v2.1.6, existing folder ID `Zettelkasten`:

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

The comparison uses only disposable probe files under
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
no model/tool/record request. The script above and Python helper are syntax
checked; **syntax checking is not execution or acceptance**.

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
