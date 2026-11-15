# MRW 0.23.40 — Delete and restore saved sources

Published 15 November 2026 as a normal release and marked Latest:
[release and checksums](https://github.com/flengyel/MRW/releases/tag/v0.23.40).

## Source and assets

- Source baseline: `b484d201d301ab416c5c91ac406338d5af44ed4a`.
- Final A: `b514b141409deacac86d61c3ff5348d5980cff6c` — the completed repair and test corrections, following the initial implementation commit `4975b10`. Earlier unpublished preparation commits remain in the ancestry.
- Final B/tag `v0.23.40`: `e9b99643ab6848558c42b20908a09bb8e8baceab` — only the marker, naming A with `localChanges: false`.
- Built from clean B with Linux Node 22.23.5, UTC and `SOURCE_DATE_EPOCH=1792094267`.
- [Core VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.40/mrw-0.23.40.vsix), SHA-256 `cddeb193bcfedd99b18f607aadaa1f75ef66e89617c6a167be1f1315e420b02c`.
- Optional Diagnostics 0.1.0 is unchanged, SHA-256 `4b4c5a3844273a24f635edea2de232bc2460c7599b91ca28f287d31f713d91f6`.

Main and B's tag were pushed before drafting. The core, Diagnostics and
`SHA256SUMS` were uploaded to a draft and checked before publication. All three
assets were downloaded through public versioned URLs and match the local bytes;
both VSIX checksums pass. Latest resolves to 0.23.40. Existing tags/assets were
not changed. No generated package or private data is tracked. This report does
not alter the released package.

## Design comparison and repair

The governing requirement is D20 in the
[reconciliation register](DESIGN_RECONCILIATION.md), with the
[earlier cleanup](SOURCE_CLEANUP_20261114.md) documenting the missing controls.
The [source-storage protocol](ARTIFACT_STORAGE.md) and
[integration boundary](INTEGRATION_BOUNDARIES.md) require preserving exact
retained material and external ownership. The confirmed obstacle was that users
could not remove unwanted saved copies through the interface.

Delete now moves one MRW saved copy to Trash, with a scope confirmation. Undo
and Restore retain the identity, source revision, annotations, supporting bytes,
diagrams and external-note associations. Active lists omit Trash. Open Saved
Source includes Restore even when the active list is empty. Existing retained
links open a Trash reader read-only, with a Restore control. Importing that
same identity cannot restore it implicitly. Original files and other sources
or studies are unaffected.

The existing coordinator publishes an optional, bounded `source-status.json`
record in complete generations. Its revision changes on every transition;
stale selections and old Undo tokens cannot reverse later work. Legacy inventory,
validation, moves and fresh-host adoption include it. Source JSON, retained bytes
and link schemes do not change. A rejected status-only write discards only its
own proved-unpublished, unjournaled candidate; uncertain or published outcomes
remain subject to the existing HEAD/journal recovery guards.

An unsaved reader draft stops Delete without closing its reader. Publication
failure keeps drafts and blocks later private writes in that session. Undo's
notification does not hold the reader/action lock while awaiting dismissal.
The bundled tutorial and current reading/storage guides explain the controls.
Current README introductions also no longer contain stray patch markers.

## Verification

| Check | Observed result |
| --- | --- |
| Full Python suite | 469 discovered: 401 passed, 68 skipped. Skips: 58 opt-in Qt, 5 unbuilt pinned-Lean checker, 4 native TikZ, 1 Windows-mounted project check. |
| Full extension suite | 627 cases: 620 passed, 7 optional checks skipped; exit 0. |
| Focused Python lifecycle suite | 11 passed: restart, exact links/annotations, stale transitions, another source, strict/symlink status rejection, failed replacement, legacy move, fresh-host adoption, rejected generation and interrupted HEAD replacement on both sides of publication. |
| Focused reader/commands/tutorial | 50 passed; covers unsaved drafts, cancellation, uncertain publication, nonblocking Undo, scope protection, read-only Trash and Restore discovery. |
| Syntax and compilation | JavaScript syntax and Python compileall passed; diff whitespace check passed. |
| Clean wheel | Built, installed without runtime dependencies into a new environment; isolated import and CLI passed. Wheel Python source bytes match the final checkout. |
| Final VSIX | Inventory/runtime verifier passed. Isolated CLI and separate-process create/annotate/Trash/reopen/exact-link/Restore bridge checks passed without a previous installation. |
| Identity and package comparison | Zero superseded-name matches in all 611 tracked paths/bytes and the extracted archive. Changes against 0.23.39 are confined to version/docs and source lifecycle runtime files. Diagnostics is byte-identical. |
| Changed Markdown links | 292 local file/anchor links checked across 11 changed documents before the report; no failure. Report/index links checked after addition. |
| Native VS Code 1.146.0 / WSL | Commands register; the real picker offers Restore with no active copies, restores the exact annotation, reopens the production reader and cancels Delete without changing the original file. Final package runtime bytes match the tested native copy. |
| Genuine saved work | Read-only fresh-manager check: Hausdorff has 9 passages and 2 reader notes; Kerodon has 27 passages. Exact retained links open. HEAD and all 11 payload files are unchanged. |
| Published assets | All three public downloads match local bytes; SHA256SUMS passes; release is normal and Latest. |

The first Python pass found an older managed-source fixture on volatile tmpfs;
its disposable directory now uses persistent checkout storage. The first extension
pass found two older navigation assertions and one older History assertion, plus
four tmpfs-dependent workspace-move tests. Assertions now check the preserved
Return marker independently of Recent Documents, accept a queued rejection of
deliberately removed scope, and distinguish compact production activity from
the unchanged detailed report. The final extension pass used private persistent
temporary storage. Runtime navigation and History behavior were not weakened.
An initial native fixture mistakenly used `.txt` with Markdown import; it was
corrected to `.md` and the final package trial passed in a fresh workspace.

Full extension checks covered the unchanged JavaScript and bridge protocol;
the final status-candidate cleanup was additionally covered by the repeated
full Python suite and final packaged/native checks. No Lean proof code changed;
no theorem-checking or native TikZ/Qt result is claimed. Modal Delete and Undo
were exercised through command/webview regression checks, rather than clicked
in the native window.

The pinned dependency audit remains at 2 moderate and 3 high findings, exit 1;
versions were not changed. Logs, exit statuses, final package inspection, native
reports, preservation results and downloaded assets are retained outside Git in
`~/.cache/mrw-source-trash-20261115/`. Earlier extension/native attempts are kept;
the initial Python failure is recorded separately, with its original traceback
in the session output rather than an independently retained full log.

## Use and remaining limits

The manual cleanup helper and filesystem/store inspection are no longer needed
to remove a saved copy from active lists: choose Delete, confirm its scope, then
use Undo or Restore if wanted. There is no new registration form. Selection is
still per project. Trash preserves bytes and does not free disk space; permanent
source deletion is not implemented. Older MRW versions do not understand Trash
status, and existing host-local writer exclusions remain necessary. Guarding
older native tests against working stores remains a separate D20 item.

This release was not installed into the working window. That window, its buffers,
genuine notes and saved research were preserved. Install the downloaded VSIX
when ready; GitHub releases do not update an installed extension automatically.
