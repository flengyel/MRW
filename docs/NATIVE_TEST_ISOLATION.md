# Native test isolation and drift review

Checked from main `80b6c9465e203f7f5637299afa3d0ff13baacac6`, after fetching origin
on 15 November 2026. D19 governs instruction consistency; D20 governs realistic,
isolated testing. This repair changes test tooling and development instructions,
not installed MRW behavior or saved-data formats.

## Findings

Older native entry points checked a folder name or a config path, sometimes only
after patching host APIs. One preparer reused a former Stacks reading workspace;
others accepted existing project/output directories. The diagram-repair harness
could remove a cache in the supplied native store. Test bridges could be invoked
directly without proving ownership of their write targets. These were current
implementation gaps, independently of any earlier successful fixture trial.

A separate window or Windows user-data directory does not by itself verify the
workspace extension's remote storage. VS Code supplies workspace and global
storage through its [ExtensionContext](https://code.visualstudio.com/api/references/vscode-api#ExtensionContext).
The new check requires an actual Development/Test context, not an installed
production context or a fabricated directory name. The native trial confirmed
that the WSL workspace extension can still receive shared remote global storage
even under a distinct UI profile; the initial preflight correctly refused it.

## Supported preparation

After bundling the unchanged Python backend, run:

```sh
npm run bundle-core --prefix vscode
python3 vscode/scripts/prepare-native-host.py --case isolation
```

The preparer creates a new private directory under `~/.cache/mrw-native-tests/`;
`--parent` may select a canonical persistent output parent under `~/.cache`;
a vault or working notes folder is not an output destination. It never
reuses that parent as the fixture or accepts a working project as its destination.
The receipt binds the new directory's device/inode, UUID, staged extension,
project and uniquely named `MRW-Fixture-<UUID>` profile. Its `launch.json` contains
the explicit Windows/WSL arguments. Preparation launches or installs nothing.

Use those arguments with the Windows VS Code CLI. Enable the WSL connector in
that specific profile first, using the approved installed connector version.
Do not disable every extension: doing so can disable remote resolution. Keep
the working profile and windows open. The isolated profile does not need GitHub
sign-in or Settings Sync. Do not substitute the working profile when setup fails.

Supported cases are `isolation`, `sourceTrash`, `activation`, `sourceReturn`,
`warrantInspection` and `justification`. The activation
case uses a guarded bootstrap before its run-style test entry. Other older
cases require explicit fixture/UI migration before they are added to this list.
`--seed` copies at most 4,000 entries/64 MiB into the new project; symlinks and private
repository/account directories are refused. `--config` accepts case options
with `${ROOT}`, `${PROJECT}` and `${PROFILE}` placeholders. It does not grant
permission to use external paths. Existing notes are not created in a vault.

The four older `prepare-*-host.py` routes stop before writes and point here.
Their earlier implementations remain at the
[review baseline](https://github.com/flengyel/MRW/tree/80b6c9465e203f7f5637299afa3d0ff13baacac6/vscode/scripts).
Older reports and evidence were not rewritten.

## Preflight and scope

Every host module's exported activation/run/check is guarded before its body:

- The owned directory and staged extension must match their receipt and remain
  canonical, private and free of redirected/shared files. Inspection is bounded
  to 5,000 entries and 80 MiB.
- Exactly one declared project may be open. Config paths, notes/data/Lean-parent
  settings and saved-source bindings/recovery metadata must stay in the declared scopes. External
  file tabs and pre-existing unsaved documents stop the first entry.
- The test context uses dedicated workspace/global store directories under the
  owned root. Raw native contexts are not passed to production activation.
  Native Mementos are wrapped with a UUID key prefix, using their existing
  `get`, `keys` and `update` methods. Genuine MRW keys are neither exposed nor
  overwritten, and test keys cannot enter Settings Sync. This is a scoped native
  adapter, not another persistence engine or a direct state-database writer.
- A first launch must have no orphaned state in that fixture namespace. Only
  after every check passes is the test scope pinned in the owned root. Restart
  must match its stores, project and underlying native context paths. Completed
  isolation checks remove only their own Memento namespace through native APIs;
  interrupted fixture data remains available for inspection.
- Direct deterministic/offline Python bridges require the owned receipt and
  check every output, store, destination and project scope before dispatch or
  transport logging. Immutable read inputs are not write grants. Deterministic
  transport still uses synthetic credentials and forbids actual networking.

This is preflight for trusted test code, not an operating-system sandbox against
arbitrary code or a concurrent malicious filesystem writer. Native companion
mutation cases are refused until a separate owner fixture is verified; the
earlier Obsidian template trial is not automatically reused. The retired document
Problems harness cannot activate its old UI and is not a current requirement.

A separate profile remains useful for UI settings and companion enablement;
it is not used as proof that remote state is separate. Store paths and Memento
namespaces establish the test data boundary. Owned fixture evidence and test
profiles are retained for inspection. Remove a test profile through
VS Code's profile management when no longer needed, not by editing its registry.

## Drift disposition

| Observation | Disposition |
| --- | --- |
| Source/release/installed version | Main and the registered WSL MRW were 0.23.40. Registration is not proof of activation in every open/forked window. The package/install byte comparison is recorded with the final checks. |
| Three instruction sections still called the 0.23.28 audit the next repair | Replaced with version-specific findings and current-register links. The old anchors and enduring preservation/UI rules remain. |
| Continuation text still said independent source-note semantics were pending | Updated to D02's delivered repair and D11's remaining native acceptance, without marking the wider workflow complete. |
| Contributor guide called Diagnostics proposed | Corrected to optional; D17 still states its actual limits. |
| Old Problems automation could be mistaken for a current workflow | Refused and excluded from supported preparation. No Problems or renamed registration system was restored. |
| Unsafe older native staging/entry paths | Replaced by an owned-fixture route and guards; older evidence stays pinned to its version. |

## Verification

Focused guard checks cover wrong/missing ownership, working scopes/raw contexts,
orphaned fixture-owned state, source bindings, inherited settings, symlinks/hardlinks,
external paths/tabs, dirty buffers and changed restart scopes. All 32 exported activation/run/check entry points are checked with a
preflight barrier and forbidden-body spies; the guard refusal cases exercise the
real preflight separately. Both direct Python bridges refuse unscoped/external writes and still
accept an owned fixture. Retired preparers leave supplied directories unchanged.

The [maintenance report](MAINTENANCE_20261115_DRIFT.md) records actual native
observation, focused command checks, package/install comparison, logs and exit
statuses. No whole-suite,
mathematical-checking, live-vault or new-release result follows from this guard.

## Note/source/Return case

`--case sourceReturn` uses the bundled sums-of-odd-integers example in a fresh
fixture. It chooses an ordinary notes folder outside its project, saves a reader
annotation, follows ordinary and retained links, checks native dirty buffers and
reloads only its own fixture window before reopening. Keep the fixture window in the foreground; bring it forward again after reload
if VS Code restores it behind the working window. The focus wait is bounded.
Dialog choices and reader messages are scripted; editors, preview, bridge writes and native Memento restart
are real. No Obsidian vault or authoring command is involved. See the
[repair report](RELEASE_0_23_41.md) for actual outcomes and limits.

## Documentary inspection case

`--case warrantInspection` reads an already checked synthetic package at
`<project>/documentary-package`. Generate it with the repository-owned pinned
checker before launch; do not copy the checker executable into the bounded
fixture. The native test invokes only Inspect, checks the documentary boundary
and preservation of the package and an unrelated draft, then clears its owned
state and closes its window. It needs foreground focus but no authoring
companion. See the [checker audit](LEAN_CHECKER_DRIFT_20261115.md) for actual
commands, outcomes and remaining limits.

## Justification runtime fixture

The `justification` case may stage one additional pinned checker executable
through `prepare-native-host.py --route-cache`. The receipt names its exact
private relative path. Preflight recomputes the expected cache path from the
packaged engine manifest, streams the binary hash and requires its exact pinned
identity, regular single-link ownership and size below 256 MiB. All other files
retain the 5,000-entry/80-MiB budget. Other cases cannot claim this allowance.
No compiled cache, olean tree or external execution path is admitted.

The native case uses real source/reader/editor/bridge behavior, a real local
Lean run and native persistence, with scripted picker/confirmation choices and
button clicks. A test-only DOM observer exposes rendered text/math; it is
injected only into the owned development fixture. The production HTML and code
contain no fixture hook. The case preserves an unsent synthetic buffer, checks
withdrawal and exact source navigation, returns to the document, performs a
real window reload and reopens a saved successor without another Lean run.


## Investigation and window closure

The sourceReturn case also accepts `investigation: true` with the
quadratic-discriminant note/proof and saved trace, resultant and failed
notebooks as its seed. Notebook execution belongs to the separate producer
helper. The native case follows actual retained links, compares/exports,
closes its work, reloads, resumes the exact remaining step and follows the
supporting proof. Clipboard contents are restored immediately after each copy.
It waits for the owned window and source-editor acknowledgement before
requesting Contents.

On the tested Windows CLI, installing a connector into a new named profile
requires that profile to exist first. If a bootstrap window is needed, give it
the same unique fixture title through a disposable local folder, disable MRW
there, and close that exact window after enabling the pinned WSL connector.
Verify its closure before launching the remote fixture. Do not leave an
unidentified blank window behind. Keep inherited CLI IPC/Electron settings out
of the GUI launcher process; do not alter the working shell or profile.

A timed-out launcher can still open a window after an access prompt is approved.
Recheck every owned profile used in the trial, including earlier attempts.

A completed result report does not prove that a window closed. Verify closure
of the uniquely titled fixture after saving the report; never kill a shared
VS Code process to clean up a test. The current investigation checks and the
repeat requested after window-access approval are recorded in
[0.23.45 delivery](RELEASE_0_23_45.md).
