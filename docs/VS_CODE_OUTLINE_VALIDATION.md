# Offline source-region reader validation — 2026-10-14

The first manual reader was implemented in extension 0.4.0. It supports saved
UTF-8 mathematical text without Lean, preserves exact retained source and
supplied artifacts, and keeps editable reader explanations separate. It is a
partial delivery of [the outline requirement](PROOF_OUTLINES.md), not vertex
elimination or evidence of proof correctness or mathematical usefulness.
The association-editing follow-on and subsequent installed-VSIX delivery in
0.4.1 are recorded separately below.

## Actual host and two examples

Windows VS Code **1.141.1**, commit
`7baac39ec3ca969dab74ac12c097f6a486e46593`, connected to **WSL Debian**;
workspace Node **24.21.0**, Python **3.13.5**. The normal development hosts used
real VS Code documents, commands, webview DOM, private storage and process
close/reopen, without `--extensionTestsPath`. Dialog choices and DOM inputs were
scripted by [the host bootstrap](../vscode/test/host/outlines.js).

1. **Equation 387 implies Equation 43:** the pinned full `Subgraph.lean` source
   at equational_theories `1aec8a7acf223b7c56e4830977b6e90d4ef1924b`, SHA-256
   `63fd9ade107c888ca9b04d57f0a1ee8f0b0fb324fb4646cdac7404f8741301cd`.
   Four manual regions cover the three local `have` claims and concluding
   rewrite. Exact local source statements are distinguished from the theorem
   declaration. The existing `before_idem` goal/context is manually associated
   with the first region and displayed as an intermediate goal, not its claim.
   The existing provenance JSON is also retained. These are the previously
   captured Lean 4.29.1/server outputs; [their source/tool revisions and
   limits](PROOF_OUTLINE_RECONNAISSANCE.md) are unchanged. No exporter or compiler
   was rerun for this reader.
2. **Euclid, Elements IX.20:** a non-Lean passage from the
   [Clay-hosted text](https://www.claymath.org/library/historical/euclid/files/elem.9.20.html).
   [Original HTML, CRLF transcription and provenance](evidence/source-outline-20261014/provenance.json)
   are retained. The English translator, edition and original-page revision
   remain unknown. Whitespace/sentence layout was deliberately transcribed;
   expansion fidelity is to the saved text, not a claim about page-image or
   OCR fidelity. Three regions expose construction/cases, the cited prime-divisor
   result and the argument that the divisor is new. Separate orientation and
   governing-idea annotations and a note deferring VII.31's proof demonstrate
   the informal reading route. There is no Lean evidence for this example.

Both use the same production reader. Test annotations are labeled **AI proposal,
Codex scripted validation fixture**; no provider was called to produce them.
No third acceptance example was added for AI authorship. Core tests separately
cover recording supplied AI authorship while preserving unknown bibliography.

## Results

The committed [seed](evidence/source-outline-20261014/outline-seed.json),
[restart](evidence/source-outline-20261014/outline-restart.json) and
[statement/placement refinement](evidence/source-outline-20261014/outline-refine.json)
reports all have `complete: true`, no failure, and four passing checks each.

The real-host checks covered selection, multiple regions, exact statement and
shared context capture, editable/saveable explanations, visibility controls,
source navigation, and exact expanded DOM `textContent` (including Unicode and
Euclid's CRLF). Context, statements and optional recorded goals remained
accessible with argument details hidden. Markup-like annotation text stayed
inert. Live unsaved form text survived re-rendering.

After normal close/reopen, both outlines restored exact source/item identities,
ranges, saved explanations and collapsed state. Unsaved form drafts correctly
did not return. On disposable copies only, a changed Lean source and deleted
Euclid source produced status feedback and refused original navigation.
Retained source remained readable; explicit range replacement and restoration
used that retained text. The refinement corrected the fixture's manual labels:
local `have` statements are source statements, while the final region points
to the theorem declaration rather than labeling a tactic term a statement.
These corrected statements were explicitly reread from private storage.

Visible Windows captures were inspected at **1280×820** and **960×680**. The
final host check confirmed at most two native editor groups. The smaller view
with the inherited editor zoom shows limited text per pane and requires
scrolling or native group maximization; this is not a full usability study.
Captures/logs remain under `.codex-work/vscode-host-outline-20261014/`, with
their hashes in the committed [validation manifest](evidence/source-outline-20261014/validation-manifest.json).
Final staged production JS/Python bytes match the checkout and bundled core;
[production digests](evidence/source-outline-20261014/production-digests.json)
record that comparison. Only the staged manifest entry/activation and test
bootstrap/config differ from production.

## Defects and failed attempts

- Remote script-resource loading failed in the WSL webview. The reader now
  embeds trusted bundled code under a nonce with a restrictive CSP and no
  resource fetch. Script scope also avoids browser-global name collisions.
- Review found that a stale or substituted retained-text tab could otherwise
  supply misleading positions. Content is now checked and closed-tab mappings
  are removed; focused command tests reject both cases before publication.
- A restored research tab could cause **Beside** to create an additional empty
  editor group. The reader now reuses its existing group or native group two;
  command and actual-host checks cover opening from a research group.
- Initial failed/incomplete reports are not passes. They record the loading
  defect and driver delays that checked refresh/navigation before completion.
  The final driver waits for action completion and observed state changes.
  A VS Code update mutex blocked an isolated-profile relaunch; the running
  editor's standard Windows CLI opened separate development windows instead.
  No updater was stopped and no unrelated work window was closed.

## Focused and regression checks

- **11 new Python tests:** changed/missing originals; exact retained expansion;
  invalid/out-of-bounds/reversed/surrogate-splitting ranges; Unicode, BOM and
  LF/CRLF/CR; optional unchanged artifacts and manual goals; retained corruption;
  selection revision; unknown/AI provenance; stale state and failed/uncertain
  publication; unsupported formats and offline process/network guards.
- **30 Node tests pass:** 24 command, four bridge, two browser/CSP checks.
  Changed-original restoration, attribution editing, private-write blocking,
  retained-tab identity and research-group reuse are covered alongside existing
  command regressions. API doubles are separate from the host evidence above.
- Full shared Python suite: **308 tests, 249 passed, 59 skipped**. The skips are
  58 opt-in Qt widget checks (PySide6 is unavailable) and one unavailable
  authorized `/mnt/c` project-parent check. `compileall`, JS syntax checks and
  document/diff checks pass. Existing TeX regressions ran in that shared suite;
  reader operations themselves initiate no compiler.

The host bridge [guard](../vscode/test/host/offline_outline_bridge.py) removes
the provider credential and rejects socket connections and child processes;
the bootstrap permits only `outline_*` bridge actions. No live provider request,
MRW compiler invocation, Verification or premise admission occurs in these
workflows. Original-source navigation can independently activate installed
extensions; this is not an OS-wide audit of VS Code or a new MRW check. R3
acceptance and exporter reconnaissance were not repeated.

## Association-editing follow-on — 2026-10-15

Extension **0.4.1** adds explicitly saved shared-context labels/roles, exact
range replacement, and context removal; manual evidence can move between
regions, select another supplied snapshot, or detach into an outline-level
reference. Retained source/artifact bytes and original statements, hypotheses
and checking evidence stay unchanged. Detached artifacts retain their
**Open retained artifact** action. These are manual reading associations, not
checked correspondences or proof edges. No storage migration or artifact
deletion was added.

The live panel also preserves text entered after an older form version was
submitted for save. Only the submitted draft clears on success; newer typing
still needs an explicit save. Failed publication retains live drafts and the
last saved state; an uncertain post-replacement sync failure can leave the
complete replacement on disk and is still reported as failure. The existing
blocked-write policy remains in force until host reload.

The scoped normal development-host runs used **Windows VS Code 1.141.2 with
WSL Debian**, Linux Node 24.21.0 and Python 3.13.5. They used an ordinary
disposable Unicode note, the existing captured goal JSON and a reader-labeled
declaration-artifact fixture. The latter tests presentation controls only; it
is not a new formal declaration or mathematical check. No authoritative source
was modified and no exporter was rerun. Production JS and bundled Python bytes
match the checkout; the staged manifest and test bootstrap remain separate.

The committed [editing report](evidence/source-outline-associations-20261015/outline-associations.json)
has six passing checks. The [normal close/reopen report](evidence/source-outline-associations-20261015/outline-associations_restart.json)
has three. Both report `complete: true` without failure. The actual host exercised:

- context role/label editing, source-derived replacement and removal while
  unrelated context and unsaved explanation/label drafts survived refresh;
- typing into the same form while its publication was deliberately held,
  retention of that newer draft on completion, and its later explicit save;
- moving a manual region association, changing the selected supplied snapshot,
  detaching it, retaining goal/local-context display and opening exact retained
  source/artifact text;
- an injected pre-replacement publication failure through the real Python
  mutable-save path: unchanged saved bytes, unchanged live saved association,
  visible blocked-write state, preserved drafts and continued retained reading;
- normal process close/reopen: persisted edits/removals and unrelated evidence,
  retained-original access, cleared transient drafts and cleared session block.

The offline bridge guard removes the provider credential and forbids Python
socket connections and child tool processes. The bootstrap allows only
`outline_*` requests. These reader actions invoked no compiler, checker or
provider and created no Verification or premise admission. Dialog choices and
webview input were scripted, using actual host documents, DOM, commands and
private storage. The restored context controls were visibly inspected in a
**1280×820** Windows capture; scrolling is required at the inherited large host
zoom. This does not establish manual-dialog use, smaller-window usability or
mathematical benefit. Captures and logs remain in
`.codex-work/vscode-host-associations-20261015/`; the committed
[manifest](evidence/source-outline-associations-20261015/validation-manifest.json)
records their digests and the production-byte comparison. The original reader
and R3 host campaigns were not repeated.

Validation:

- **16 focused Python source-reader tests pass**, including five new tests for
  association replacement/removal, unrelated work and originals, invalid/stale
  selections, restart, pre-replacement failure, uncertain sync and offline use.
- **33 Node tests pass** (27 command, four bridge, two browser/CSP checks),
  including three new command tests for context editing, selection/source
  validation, evidence detachment/retained access and failed-publication blocking.
- Shared Python regression: **313 tests, 254 passed, 59 skipped**. PySide6 is
  unavailable; 58 opt-in Qt widget checks and the unavailable authorized `/mnt/c`
  project-parent check were skipped. Existing shared controller/TeX checks and
  the five conditional documentary regressions against the already-built pinned
  Lean executable passed. No Lake build was needed for the reader change.
- `npm run check --prefix vscode`, Python `compileall`, and document/diff checks
  pass. The Node suite used the installed Linux VS Code-server Node executable
  with `--test --test-isolation=none` to report individual tests.

Reproduction uses `--outline-phase associations`, normal close, and
`--outline-phase associations_restart` with the same staged extension/project;
see [the reader instructions](../vscode/README.md#reproduce-the-bounded-outline-host-checks).
VSIX installation, Qt widget execution, other platforms and mathematical
usefulness remain unassessed. Unsaved forms still have no crash/restart recovery.

## Installed VSIX — 2026-10-15

The completed association-editing runtime at `db3665a` is delivered without a
runtime rewrite as **flengyel.theorem-terminal 0.4.1**. The package is
`vscode/theorem-terminal-0.4.1.vsix`; its final SHA-256 and file digests are in
the committed [archive verification](evidence/vsix-install-20261015/package-verification.json).
Use [the build/install instructions](../vscode/README.md#package-and-install-a-vsix).
No Marketplace publication or live MRW provider call occurred.

Packaging uses **@vscode/vsce 4.0.0**, pinned with its dependency lockfile,
Linux Node **24.21.0**, npm **11.13.0** and Python **3.13.5**. A clean `npm ci
--ignore-scripts` succeeded from the package cache. The existing prepublish
hook then bundled the current Python core and license. With `TZ=UTC` and
`SOURCE_DATE_EPOCH=1792079077` (the `db3665a` timestamp), two complete package
builds produced identical VSIX bytes. The
[packaging checks](evidence/vsix-install-20261015/packaging-checks.json) record
the versions, repeat hashes and negative checks. Reproduction of those bytes
uses the recorded toolchain; this is not a cross-version compression guarantee.

The archive has **43 files**: the production manifest, VSIX metadata, README,
Apache 2.0 license, seven production JavaScript modules including the reader's
webview script, the isolated Python bridge, and all 30 Python-core/data files,
including `data/appendix_a_justification.json`. Runtime JS, Python, data and
license bytes match the checkout. Tests, host bootstraps, staged configuration,
development scripts, npm dependencies and bytecode caches are excluded. The
verifier rejects unexpected/missing files, duplicate entries, a substituted
manifest or modified runtime bytes. Disposable malformed archives demonstrated
rejection of an added host harness, missing JSON data, changed bridge and
duplicate manifest. README links now resolve relative to the repository's
`vscode/` directory; the packager's default root-relative base was incorrect.

The VSIX installed successfully into the **WSL Debian workspace extension
host**. The ordinary Windows **VS Code 1.141.2** window (commit
`16507d91be0dc1ce4f94c04d4d0430210b8685d9`) opened the disposable workspace
`/tmp/mrw-vsix-install-20261015`. There was no development-host flag, test entry
point, bridge guard or substituted manifest. Native Command Palette commands,
file/kind pickers and installed webview controls were driven by Windows UI
automation and DevTools DOM input. This establishes scripted use of real
dialogs and an installed extension, not an independently performed human
usability trial.

The [host report](evidence/vsix-install-20261015/host-checks.json) records:

- Created one saved-source outline, edited/saved an attributed overview
  annotation, replaced a context's exact range, and edited/saved its role and
  label. The small UTF-8 fixture is explicitly synthetic installation evidence;
  it makes no mathematical or checking claim.
- Attached the supplied text fixture as a supporting artifact with a manual
  region association, then detached it into a retained outline-level reference.
  Its **Open retained artifact** action remained available.
- Closed the ordinary workspace window normally; its WSL extension host exited
  with code 0. Reopened the same workspace and explicitly opened the saved
  outline. Annotation/context values, identifiers, spans and detached evidence
  restored; the persisted outline bytes were identical before/after restart.
- Opened both retained artifact and retained source through the restored
  reader. Their exact retained bytes matched the unchanged original files;
  the restored reader reported no warnings. Visible captures were inspected.
- Compared all 41 installed extension files with the final archive (ignoring
  only VS Code's installation metadata in `package.json`). Observed real host
  requests running `python3 -I` with the installed extension's `python/bridge.py`
  and installed directory as cwd. Its explicit import path, equal bundled
  source bytes and imported `source_outlines` code filename establish that it
  uses the installed bundled core, not the checkout/global Python installation.
- All **82 pre-existing MRW private files** retained their prior digests.
  Installation preserved identity, storage paths and user state; no reset or
  migration occurred.

Console diagnostics were inspected, including the restarted window's renderer
and remote extension-host logs. The latter recorded MRW activation without an
error. Existing errors identify Copilot API-proposal declarations,
GitHub-authentication/Remote WSL `navigator` migration warnings and unrelated
Python-snippet language declarations; Node deprecations and standard webview
iframe/feature warnings also remain. They are not evidence of an MRW packaging
failure. Automation mistakes separately produced console errors: selecting a
worker rather than the reader frame, incomplete/concatenated console input and
reading a collapsed card through `innerText`. Corrected frame/input and
`textContent` checks passed against the saved state. None established a runtime
defect, so production JS/Python was unchanged. An isolated-profile launch was
blocked by the VS Code updater mutex; the running editor's ordinary CLI was
used without stopping its updater or closing unrelated windows.

The [evidence manifest](evidence/vsix-install-20261015/validation-manifest.json)
pins the successful DOM reports, saved state, fixtures, package/installation
checks, scoped logs and inspected captures. Full local logs and automation
artifacts remain under `.codex-work/vscode-host-vsix-20261015/`. This task's
regressions passed: **33 Node tests**, **313 Python tests (254 passed, 59
skipped)**, JavaScript syntax, Python compilation and document/diff checks.
PySide6 is unavailable; skips remain the 58 opt-in Qt checks and one unavailable
authorized `/mnt/c` project-parent check. The existing broader campaigns were
not repeated. The installed workflow used only offline MRW reader actions;
other installed extensions may independently use network services.

Architectural intent now explicitly retains one extension over the existing
Python core in the workspace environment, using standard local Linux, WSL2
and Remote SSH to Linux. **Python 3.11+ on that host is required**. Lean,
SageMath, containers and providers are optional for ordinary reading/outlining.
Windows UI plus Linux backend is the supported architecture exercised here;
native Windows backend portability remains deferred. This WSL check does not
establish Remote SSH, ARM or ordinary local Linux desktop use; the subsequent
Pi/SSH result is recorded separately below. No new remote service, TypeScript
rewrite, Windows persistence port or data migration was introduced.

Mathematical usefulness, proof correctness and human comprehension remain
unassessed. This was a focused installation workflow, not a repeat of outline
acceptance, R3 acceptance or source reconnaissance.

## Remote SSH on Raspberry Pi 5 — 2026-10-15

The **same VSIX**, SHA-256
`721e9ec6fa011807508947c4fe3a132702ce705b5d30b6c80cf5f2ea4fbc1f29`,
installed and passed the focused offline reader/restart check through ordinary
**Windows VS Code 1.141.2 / Remote - SSH 0.128.0**. The workspace host was the
user's **Raspberry Pi 5**, reporting **Debian GNU/Linux 12 (bookworm), aarch64,
64-bit, Python 3.11.2**. Client/server commit:
`16507d91be0dc1ce4f94c04d4d0430210b8685d9`. This is an actual Linux SSH and
ARM64 host result, not a claim about all Raspberry Pi OS images or architectures.
The package was built in the prior packaging increment `15ba6cd` with
**@vscode/vsce 4.0.0**; it was not rebuilt for this documentation follow-on.

The user supplied authentication and workspace/file trust decisions in VS Code.
The reader commands, file/kind pickers, real webview form input/button clicks,
retained-document checks and disk/process comparisons were scripted, with
captures inspected. This is installed-host validation, not independent manual
mathematical use or a human usability acceptance trial. No development-host
launch, API double, bridge substitution, staging manifest or MRW provider call
was used. Other installed extensions may independently access network services.

The VSIX was copied with Windows OpenSSH SCP and installed with ordinary
`code --install-extension` in the **remote Linux integrated terminal**. VS Code
reported successful installation on the SSH host. All **41 installed files**
matched the archive, ignoring only VS Code's `package.json` installation
metadata. The Python core/data, interface resources and license were present;
the test directory and host-test manifest were absent. No source checkout,
Python package install, Qt, Lean, SageMath or container was needed on the Pi.

The [host checks](evidence/vsix-pi-20261015/host-checks.json),
[installed-file checks](evidence/vsix-pi-20261015/installed-files.json) and
[restored controls](evidence/vsix-pi-20261015/restart-dom.json) record:

- Created one outline in `/tmp/mrw-vsix-pi-20261015-90c812c7`, using the same
  synthetic UTF-8 source/evidence fixtures as the WSL installation check.
  Created, then edited and explicitly saved an attributed overview annotation.
- Kept context from line 1, replaced its exact range with Unicode line 2, then
  edited/saved its role as cited result and its label as `Edited Pi ARM64 context`.
- Attached the supplied supporting artifact to the selected region, then
  detached it to an outline-level retained reference. Both steps reported no
  reader warning. No compiler or checking attestation was claimed.
- Closed only the disposable workspace window normally. An extra automation
  Enter had dirtied its disposable audit JSON; the user saved that report to
  complete close. The outline forms were already saved. Remote extension host
  PID 1952653 exited with **code 0**. Reopened the same workspace, authenticated
  again, and ran **MRW: Open Saved Source Outline…**.
- Annotation, attribution, context role/label/exact quotation, identifiers and
  detached evidence restored without a reader warning. The persisted outline's
  SHA-256 stayed `2b3e045161832c8d3e1e8153a2a1b0b77c593da0b3ac6e781c8e11c7767be335`.
  Both retained blobs stayed byte-identical and matched the unchanged originals.
  **Open retained source** and **Open retained artifact** opened their expected
  text before and after restart; Unicode comparisons used the UTF-8 capture,
  not PowerShell's lossy display encoding.
- Observed **16 actual isolated bridge processes** using `python3 -I` and the
  installed extension's `python/bridge.py`, with the installed directory as cwd.
  The [19 imported module code origins](evidence/vsix-pi-20261015/installed-core-origins.json),
  including `source_outlines`, point inside that installed bundle. The restarted
  host ran the ordinary ARM64 VS Code server extension-host entry point.
- The initial Pi inventory contained **zero existing MRW private files**.
  Identity and standard private storage paths were preserved; no reset or
  migration occurred. The previous WSL result independently preserves its
  existing 82-file inventory; this Pi run is not an upgrade-state test.

The [console findings](evidence/vsix-pi-20261015/console-findings.json) separate
installation friction and corrected automation from product defects. Remote -
SSH initially selected an unusable MobaXterm `ssh.exe`; configuring the working
Windows OpenSSH client fixed connection setup. Its initial dependency download
failed certificate-chain verification; VS Code's Node `--use-system-ca` retry
succeeded with certificate verification enabled. No extra terminal suite was
required. Local VSIX-picker automation did not establish installation; the
subsequent remote CLI installation and file comparison did. An initial local
terminal selection and a too-fast save were corrected; failed attempts were not
counted as passes. An unrelated clipboard capture during a focus change was
removed and excluded, and foreground/expected-content checks were added.

Before/after remote host logs record MRW activation without errors. Renderer
diagnostics still include Copilot API-proposal mismatches, authentication-extension
`navigator` migration errors, Python-snippet language declarations and Node
deprecations; standard webview warnings remain.
VS Code also canceled a local-history `entries.json` write during shutdown.
The saved audit JSON stayed parseable, and the MRW outline/retained bytes were
unchanged. No MRW packaging or installation defect was established, so no
production runtime was changed. This documentation/evidence increment uses
document, evidence-consistency and diff checks; it reuses the earlier **33 Node
and 313 Python** packaging regressions rather than repeating the campaigns.

The [evidence manifest](evidence/vsix-pi-20261015/validation-manifest.json) pins
the committed reports and local inspected captures under
`.codex-work/vscode-host-pi-20261015/`. This completes the scoped Pi/SSH offline
installation check. A non-ARM Linux SSH host is the next interoperability
configuration check when available. Other Pi OS images, 32-bit ARM, local
Pi/Linux desktop use, ARM R2/R3 and optional tools remain unvalidated. The pinned
Lean checker is still Linux x86-64/WSL only. Unsaved forms still require explicit
saving, and private state does not synchronize between hosts. Mathematical
usefulness, proof correctness and human comprehension remain unassessed.

## Current boundaries

The subsequent **0.5.0 first manual Markdown overview across sources** adds
explicit references to these saved outlines and exact retained regions. Its
[separate focused report](VS_CODE_OVERVIEW_VALIDATION.md) records new WSL
Development Host behavior and reuses this completed 0.4.1 WSL/Pi deployment
evidence. Installation/Pi checks were not repeated. This adds no inference graph
or elimination witness and leaves mathematical usefulness unassessed.

See [the reader contract](../vscode/README.md#offline-source-region-reader) for
supported UTF-8 formats, private-state durability and size limits. PDF/OCR
regions, notebook cells, rendered documents and non-UTF-8 sources are
unsupported. Forms require explicit saving and have no restart recovery for
unsaved drafts. Outline/artifact deletion, garbage collection and cross-machine
synchronization are not implemented. Ordinary installed-VSIX use is established
only for the scoped Windows/WSL and Windows/SSH/Pi configurations above.
Independent human dialog use and mathematical usefulness remain unassessed.

The requested context/evidence association-editing increment is complete.
Automatic extraction, AI outline proposals, automatic gap detection, verified
joint-premise graphs, elimination witnesses and the full vertex-elimination
contract remain pending. The separately deferred mathematical-outline
capability at multiple scales does not enlarge this delivered increment.
