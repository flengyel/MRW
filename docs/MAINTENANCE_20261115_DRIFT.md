# Native test isolation and instruction drift — 15 November 2026

Reviewed main `80b6c9465e203f7f5637299afa3d0ff13baacac6` after fetching origin.
The source, published package and registered WSL installation were MRW 0.23.40.
This commit changes test tooling and development instructions. It changes no
production source, manifest, runtime dependency, reader content or saved format.
The [reconciliation register](DESIGN_RECONCILIATION.md) remains the current
status authority; the [native procedure](NATIVE_TEST_ISOLATION.md) describes the
supported test scope.

## Findings and disposition

| Observation | Design comparison and diagnosis | Correction and outcome |
| --- | --- | --- |
| Older native tests accepted supplied directories or checked ownership after patching host APIs. Four preparers could reuse working paths; direct bridges did not prove output ownership. | D20 and the integration boundary require isolation before mutation. A successful earlier trial did not close these entry paths. | Guard all 30 exported native activation/run/check entry points before their bodies, add bounded fresh staging and direct bridge write checks, and retire the four unsafe preparers. Supported staged cases are isolation, sourceTrash and activation; the older UI bodies are not all migrated. |
| A new Windows profile still received shared WSL extension global storage. | Profile separation alone cannot establish the remote data boundary. The initial native refusal was correct. | Supply owned file-store paths and UUID-prefixed wrappers over native Mementos before activating unchanged production MRW. Refuse native secrets and Settings Sync in the fixture. Pin the actual native backing paths for restart; clear only the fixture namespace after success. No direct state-database writer was added. |
| Three instruction sections still named the 0.23.28 interface audit as the next repair; continuation and contributor text understated later repairs. | D19 requires current decisions to come from the register, preserving older evidence and enduring rules. | Replace stale priority labels, retain their anchors and preservation rules, correct independent-note status and the shipped optional Diagnostics description, and distinguish the register's original batch baseline from current main. Earlier reports remain unchanged. |
| The retired document Problems harness could be read as a current acceptance requirement. | Ordinary reading must not create or register exercises. | Refuse that harness explicitly. Do not restore its UI to make an older test pass. |

## Checks actually run

All final commands below exited 0. Focused checks were chosen because runtime
files and dependency pins are unchanged.

| Check | Result |
| --- | --- |
| `npm ci --prefix vscode --ignore-scripts` | Pinned install passed. npm reported the existing five audit findings: two moderate and three high. Pins were not changed. |
| `npm run bundle-core --prefix vscode` | Unchanged backend bundle passed. |
| `node --test vscode/test/native-fixture.test.js` | 15 tests passed. Covers ownership, unsafe destinations, symlinks/hardlinks, inherited settings, genuine versus fixture Memento keys, dirty/external buffers, restart scope, bridge writes/recovery targets, retired preparers and all 30 entry-point barriers. |
| Focused `vscode/test/extension.test.js` continuation selection | Seven cases passed. |
| Every existing `deterministicSend` call-site scenario in that extension suite | Seven cases passed, including cancelled/unsent work, bounded continuation, latest human summaries, failed publication, changed notes and an unrelated draft. These runs overlap; their totals are not added. |
| `node --test vscode/test/tutorial.test.js` | Three tests passed. |
| Native Windows VS Code 1.146.0 / WSL Debian | Owned Development fixture activated unchanged production MRW; real bridge capture, Trash and Restore passed. Every observed Memento write stayed in the fixture namespace; an unisolated context was refused and final cleanup cleared only owned keys. |
| JavaScript/Python syntax | All 31 host JavaScript modules passed `node --check`; changed host and preparer Python scripts compiled. |
| Package and `verify-vsix` | Passed. All 166 archive files, and the entire ZIP, equal the published 0.23.40 package. Tests and preparers are excluded from it. |
| Registered installation comparison | All 164 installed extension files match the published package; VS Code's installer-only `__metadata` was omitted from manifest comparison. Activation in every working/forked window was not observed. |
| Changed Markdown links, superseded-identity scan and `git diff --check` | Passed. No previous project-name variants in tracked/new maintained paths or text. The existing published archive is unchanged. |
| Genuine retained work, read-only | Hausdorff: nine passages and two reader notes. Kerodon: 27 passages. Exact links reopen both. The active HEAD and all 11 payload files stayed unchanged during inspection. |

The package SHA-256 remains:

```text
cddeb193bcfedd99b18f607aadaa1f75ef66e89617c6a167be1f1315e420b02c
```

No whole Python/extension suite, Lean proof audit, live-vault template creation,
or broad UI/companion acceptance is claimed for this test-tooling change. It is
not a new mathematical check or a diagnosis of the earlier memory exhaustion.

## Evidence and limits

Command logs, exit-status files, package/install comparisons, preservation
results and native reports are retained outside the project in
`~/.cache/mrw-native-test-isolation-20261115/evidence/`. Native fixture and
profile identity: `MRW-Fixture-d3839865-80b2-4fce-9795-520aba61a4a7`.
The final guard, native trial and Python helper bytes match those staged for the
successful host run. Later staging-parent and entry-barrier changes have their
own focused checks.

Earlier failure evidence is retained: the shared-remote-store refusal, the
initial guard-check failure and a native helper assertion that accidentally
read a proposed API by spreading ExtensionContext. The latter assertion now
reads stable fields explicitly; no proposed API was enabled. Final success does
not erase those attempts.

The scoped adapter is preflight for trusted tests, not an OS sandbox against
arbitrary code or concurrent hostile filesystem changes. Older UI cases and
native companion mutation need explicit fixture/owner migration before they can
run. They fail closed in the meantime. Wider workflow acceptance, continuous
measurement, fuller diagnostics and later contract models remain in the
register; this repair does not mark them complete.

The working profile, windows, genuine vault, templates and saved research were
preserved. This patch needs no new VSIX, installation, release tag or window
reload: its deliverable is the committed test tooling and corrected instructions.
