# MRW 0.23.16 — version on the icon

Published 12 November 2026 as a normal GitHub release, marked Latest.

- [Release](https://github.com/flengyel/MRW/releases/tag/v0.23.16)
- [VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.16/mrw-0.23.16.vsix)
- [SHA256SUMS](https://github.com/flengyel/MRW/releases/download/v0.23.16/SHA256SUMS)

## Change

The MRW Activity Bar container title is `MRW 0.23.16`, supplying the icon hover
and sidebar heading. VS Code's supported container contribution has a title,
without a separate tooltip field; its Activity Bar action uses that name for
hover and accessibility text. See the [container schema](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/api/browser/viewsExtensionPoint.ts)
and [hover implementation](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/browser/parts/compositeBarActions.ts).

The package verifier rejects an absent or outdated version in this title.
The tutorial continues to report the active extension build; an installation
awaiting reload can differ from the running extension. Command and view IDs,
settings, saved formats and executable runtime files are unchanged.

## Build and checks

Source A: `daf6694838f573eac4590f6cf5c47c7edca7cc98`.
Release B: `1fd76be6deda3af94287301a47233d44422f9b60`.
B changes only `vscode/media/build-info.json`, recording A and `localChanges: false`.
The package was built from clean B with Node 22.23.5 and pinned npm dependencies,
`TZ=UTC` and `SOURCE_DATE_EPOCH=1792094267`.

- Existing Activity Bar registration check: passed.
- Three tutorial checks: passed, including preservation of active build identity
  when a newer package reaches disk. Direct per-case TAP logs were retained
  because the outer `node --test` runner reported only file-level results.
- Three verifier failure cases (unversioned, stale and missing title): rejected.
- JavaScript syntax checks, package build, exact archive verification and
  `git diff --check`: passed. All 300 local targets in changed Markdown resolved.
- All 489 tracked paths, 482 UTF-8 text files and 146 VSIX entries scanned for
  superseded project names: no matches.
- Compared with 0.23.15, only the manifest, VSIX metadata, build marker, packaged
  README and tutorial differ. Runtime JavaScript, Python and Lean bytes match;
  no new full runtime or Lean test campaign was run for this label change.
- Both published assets were downloaded anonymously. The checksum and bytes
  match the verified local package; the tag resolves to B, which is on main.

VSIX: 672272 bytes.
SHA-256: `9837371a8f98e161f9b15c0fc6669e828c2e0fa1b312b18744ceb64dde4e1e92`.

The dependency audit reports five findings (three high, two moderate), with
pins unchanged. markdown-it is bundled. @azure/identity, @azure/msal-node,
@vscode/vsce and minimatch are packaging dependencies excluded from the VSIX.

## Observation and installation

The native hover was not observed in this session. Source/API inspection,
registration checks and archive inspection establish the supplied label; they
do not substitute for observing the desktop rendering. No extension was
installed into the working window and no reload was forced. Notes, lesson files,
workspace settings, drafts and saved research were not written by this task.

Logs, exit statuses, package and downloaded assets are retained locally under
`/home/flengyel/.cache/mrw-icon-version-20261112`.
The small PROV lab-notebook trial remains the next recorded product increment.
