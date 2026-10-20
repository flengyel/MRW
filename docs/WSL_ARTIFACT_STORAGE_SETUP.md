# Windows-backed artifact storage: prepared metadata trial

Status, 2026-10-20: **prepared, awaiting separate authorization; not run**.
MRW 0.7.0 remains installed. The real artifact store has not moved. The existing
`/mnt/c` configuration still fails MRW's private-mode contract. This document
does not declare synchronized Zettelkasten storage supported.

## Diagnosis

The actual host uses WSL 2.6.3.0, Debian, kernel 6.6.87.2, uid/gid 1000.
`C:` is NTFS, exposed at `/mnt/c` as read/write 9p/DrvFS without `metadata`.
`/etc/wsl.conf` contains only `[boot]` / `systemd=true`; `/etc/fstab` contains
only its unconfigured-file comment. The tool sandbox presents a read-only view;
the host mount was inspected separately outside it.

Without metadata, WSL derives displayed Unix bits from the Windows user's
effective access. `0777` therefore does **not** mean every Windows account can
read the directory. Metadata adds Linux ownership/modes while Windows access
checks continue to apply. See Microsoft's [permission model](https://learn.microsoft.com/en-us/windows/wsl/file-permissions)
and [mount configuration](https://learn.microsoft.com/en-us/windows/wsl/wsl-config).

The inspected vault ACL has an unopposed FullControl grant to the current
Windows account, plus SYSTEM and Administrators. A separate inheritable
ReadAndExecute grant permits the local CodexSandboxUsers group. No Everyone or
Users read grant appears on the vault itself. Enabling Linux metadata would
not remove that Windows grant. The trial below isolates only a new empty test
directory with an explicit Windows ACL; existing vault ACLs remain unchanged.

Syncthing actually runs on **Windows**, under the user's account, via
**SyncTrayzor 2.2.0 / Syncthing v2.1.6 windows-amd64**. Active local configuration
identifies the existing Zettelkasten folder as send/receive, not paused, with
`ignorePerms=false`, `disableFsync=false`, `copyOwnershipFromParent=false`, and
all four ownership/extended-attribute send/sync flags false. The local API
reported idle, zero errors and zero needed files at inspection. Those values
are a snapshot, not a verified handover. Its connected peer reported
**v1.19.2-ds1**; that does not establish the peer's OS, user or local access rules.
No credentials, device IDs, addresses or API keys are included here.

The [configuration manual shipped at the v2.1.6 tag](https://github.com/syncthing/syncthing/blob/v2.1.6/man/syncthing-config.5)
and the peer's [v1.19.2 configuration](https://docs.syncthing.net/v1.19.2/users/config.html)
and [replacement behavior](https://docs.syncthing.net/v1.19.2/users/syncing.html)
were consulted. [Extended-attribute synchronization](https://docs.syncthing.net/advanced/folder-sync-xattrs.html)
was added in 1.22.0 and is OS-specific. It cannot be assumed to carry WSL's
NTFS metadata through this pair. Do not enable it across the vault as a remedy.
Syncthing replaces files through temporary copies: an existing receiving file's
metadata alone is insufficient evidence for later replacements.

## Exact proposed operation

AGENTS.md requires separate authorization for mount, permission and
synchronization-configuration changes. The single proposed operation is a
**temporary, isolated metadata fixture setup**, comprising the new directory's
private ACL and its separate mount. It is not a move of real saved work.

Scope:

- New Windows directory:
  `C:\Users\fleng\Zettelkasten\MRW-storage-test-20261020`.
- New Linux mountpoint:
  `/home/flengyel/src/theorem_terminal/.codex-work/artifact-storage-20261020/windows-metadata`.
- Windows access: current account, SYSTEM and Administrators only, inherited
  by this test directory's children. No existing ACL is edited.
- Linux mount: `metadata,uid=1000,gid=1000,umask=077,fmask=111` on that Windows
  directory only. No active drive is unmounted or remounted.
- No `/etc/wsl.conf`, `/etc/fstab`, Syncthing setting or global configuration
  change. **No restart or WSL shutdown**; existing work stays running.

In Windows PowerShell, after authorization:

```powershell
$ErrorActionPreference = 'Stop'
$trial = 'C:\Users\fleng\Zettelkasten\MRW-storage-test-20261020'
if (Test-Path -LiteralPath $trial) { throw 'Trial path already exists; stop.' }
$who = [Security.Principal.WindowsIdentity]::GetCurrent().User
$acl = New-Object Security.AccessControl.DirectorySecurity
$acl.SetAccessRuleProtection($true, $false)
$acl.SetOwner($who)
$inherit = [Security.AccessControl.InheritanceFlags]'ContainerInherit,ObjectInherit'
$propagate = [Security.AccessControl.PropagationFlags]::None
$allow = [Security.AccessControl.AccessControlType]::Allow
foreach ($sid in @($who, [Security.Principal.SecurityIdentifier]'S-1-5-18',
                         [Security.Principal.SecurityIdentifier]'S-1-5-32-544')) {
    $rule = New-Object Security.AccessControl.FileSystemAccessRule(
        $sid, 'FullControl', $inherit, $propagate, $allow)
    $acl.AddAccessRule($rule)
}
# New-Item without -Force fails if a directory already exists. It is empty
# until its final ACL has been installed and inspected.
New-Item -ItemType Directory -Path $trial -ErrorAction Stop | Out-Null
Set-Acl -LiteralPath $trial -AclObject $acl
Get-Acl -LiteralPath $trial | Format-List Owner,AreAccessRulesProtected,Access
```

In the actual Debian host, not the sandbox, after confirming that ACL:

```sh
mkdir -m 700 /home/flengyel/src/theorem_terminal/.codex-work/artifact-storage-20261020/windows-metadata
sudo mount -t drvfs 'C:\Users\fleng\Zettelkasten\MRW-storage-test-20261020' \
  /home/flengyel/src/theorem_terminal/.codex-work/artifact-storage-20261020/windows-metadata \
  -o metadata,uid=1000,gid=1000,umask=077,fmask=111
findmnt -T /home/flengyel/src/theorem_terminal/.codex-work/artifact-storage-20261020/windows-metadata \
  -o TARGET,SOURCE,FSTYPE,OPTIONS
```

Stop on an error or an unexpected mount source/options. This exact scoped
mount has not yet been attempted; a successful command is not itself acceptance.
Do not fall back to remounting C: or applying global options. Existing
configuration files require no restoration because this proposal does not edit
them. Their inspected contents and hashes are retained with the local diagnostics.

## Check that will establish success

1. Inspect the new directory and both WSL-created and Windows-created children:
   private Windows ACL, actual WSL uid/gid and `0700` directories / `0600` files.
   Check a Windows temporary-file replacement as well as initial creation.
   Unexpected modes/ownership/access stop the trial. Never repair unrelated files.
2. Run the **unchanged production filesystem probe** on the mounted directory.
   It must pass private modes, immutable publication, exact replacement and
   file/directory synchronization. Successful fsync return values provide no
   power-loss certification.
3. Use **MRW: Move Artifact Directory…** in an isolated disposable workspace to
   move its complete fixture to a new `store` child of this mountpoint. Verify
   source cleanup, effective binding, a subsequent annotation save, normal
   close/reopen, old exact pinned link, linked note and retained access with the
   original source unavailable. Do not point this command at the real store.
4. Exercise incomplete/conflicted copies and rejected access, plus actual
   synchronized creation and a later edit synchronized back, if the second host
   is accessible with existing authorization. Verify identities/access on both
   hosts. A local copy or remote completion counter cannot replace that check.

If Windows-created replacement files lose required metadata, retain the
rejection. A receiving-side permission establishment operation would need to
validate complete manifests/dependencies, constrain itself to inventoried
MRW-owned files, establish this host's ownership/access, reverify exact bytes,
and be repeated after later receiving replacements. No such repair operation
is implemented or authorized by this document. Do not use a blanket recursive
chmod/chown, or initialize missing content to make adoption pass.

Only after those results can a permanent scoped mount and any necessary
receiving operation be proposed. A future permanent configuration must preserve
existing entries and be separately authorized; this trial adds no fstab entry.
The ordinary procedure remains **Show Artifact Location → Move Artifact
Directory… → review scope/destination → Move artifacts**. The setting
`mrw.artifactMoveDestination` remains a suggestion. The original `/mnt/c/...`
address uses its original mount and remains unsupported unless separately
verified; use the verified mountpoint's address for a successful trial.

## Rollback of the setup

Close only fixture clients. Unmount just the new mountpoint, without force or
lazy unmount:

```sh
sudo umount /home/flengyel/src/theorem_terminal/.codex-work/artifact-storage-20261020/windows-metadata
rmdir /home/flengyel/src/theorem_terminal/.codex-work/artifact-storage-20261020/windows-metadata
```

Remove the new Windows test directory only if empty (`Remove-Item -LiteralPath
$trial`, without `-Recurse` or `-Force`). If fixture payloads remain, retain them
for inventoried cleanup; do not recursively delete the vault or enclosing
storage. Syncthing may have copied those deliberately temporary files, so its
completed deletion must also be checked before declaring cleanup complete.
No real store binding has changed merely by setting up or rolling back a mount.

## Handover remains explicit

One writing installation at a time, completed synchronization, full MRW
manifest/dependency verification and explicit local adoption remain mandatory.
Local locks do not coordinate computers. Numeric uid/gid, path spelling and a
completion marker are not portable identity or completeness proofs. The prior
SSH authentication failure was not retried and no credentials were changed.
Cross-machine creation/replacement/access acceptance remains unperformed.
