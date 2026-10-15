# Offline source-region reader validation — 2026-10-14

The first manual reader was implemented in extension 0.4.0. It supports saved
UTF-8 mathematical text without Lean, preserves exact retained source and
supplied artifacts, and keeps editable reader explanations separate. It is a
partial delivery of [the outline requirement](PROOF_OUTLINES.md), not vertex
elimination or evidence of proof correctness or mathematical usefulness.
The association-editing follow-on in 0.4.1 is recorded separately below.

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

## Current boundaries

See [the reader contract](../vscode/README.md#offline-source-region-reader) for
supported UTF-8 formats, private-state durability and size limits. PDF/OCR
regions, notebook cells, rendered documents and non-UTF-8 sources are
unsupported. Forms require explicit saving and have no restart recovery for
unsaved drafts. Outline/artifact deletion, garbage collection and cross-machine
synchronization are not implemented. VSIX
installation, manual dialog use and mathematical usefulness were not assessed.

The requested context/evidence association-editing increment is complete.
Automatic extraction, AI outline proposals, automatic gap detection, verified
joint-premise graphs, elimination witnesses and the full vertex-elimination
contract remain pending. The separately deferred mathematical-outline
capability at multiple scales does not enlarge this delivered increment.
