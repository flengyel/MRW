# Proof-outline projection validation — 2026-11-04

## Loading-screen regression — 0.16.1, 2026-11-05

The user’s native 0.16.0 proof view remained at “Opening recorded outline…”.
The initial browser harness dispatched messages with no source window, so it
missed this failure. Inspection of the installed VS Code preload shows that
host replies are forwarded from a same-origin wrapper while window.parent is
masked. The old event.source filter rejected those replies.

The regression harness now uses real parent-frame postMessage delivery over
HTTP, with the same parent masking. It reproduces 0.16.0 displaying zero vertices
after receiving a 15-vertex graph. With 0.16.1 the graph renders 15 vertices.
A sandboxed foreign frame’s actual message is ignored. Unit checks also reject
Stacks-origin and opaque-origin messages and verify timeout, Retry and recovery.

The parent-frame browser run passes real mouse selection of 08ZH, live tagged
page display, 15 → 10 → 9 → 15 → 10 → 15 claims, animated layout, pan/zoom,
unchanged iframe identity through deletion/restoration, saved statement/proof
(267 MathML expressions, no KaTeX errors), and reduced motion. This is an
isolated transport/browser test; native-window acceptance remains pending.

The focused **14 command/renderer/layout tests** and syntax checks pass.
The verified **0.16.1** VSIX is installed (SHA-256
`fe53c679e4eb67627be70b74c39c8d346c6588d0eac10231ad746622fed00875`).
Its production manifest and all 70 runtime files match the package. The private
head, 12 retained study payload files, ordinary overview and graph JSON remain
unchanged. No native window reload was invoked.

## Animated graph and tagged page — 0.16.0

The user confirmed access to the 0.15.0 outline/source view, then reported that
Axiom's animated graph and direct display of the corresponding Stacks tag were
superior. This increment adds those interactions to the bounded MRW graph.

Focused command and renderer checks cover exact tag/part/span matching, changed
associations, scope-preserving resolution, rapid selection and stale replies,
explicit canonical/cited-tag browser navigation, iframe transport isolation,
frame-free ordinary readers, retained iframe identity across projection changes,
offline statement/proof rendering, and JSON-editor command discovery. Existing
joint-premise, persistence, draft and source-integrity checks remain in place.

An isolated Chrome profile with the actual bundled scripts was driven through
Chrome's input protocol with real mouse events. Clicking the conclusion vertex
opened the official 08ZH page alongside the graph; the screenshot visibly shows
the tagged statement and proof. The graph followed 15 → 10 → 9 → 15 → 10 → 15
claims. Layout motion, pan, zoom, reduced-motion handling and the same iframe
element surviving deletion/restoration passed. Saved text displayed both pinned
parts, with 267 MathML expressions in the complete test DOM and no KaTeX errors.

These are browser and command checks. Native VS Code acceptance of 0.16.0 and
mathematical usefulness remain to be observed. Python inference projection,
record formats, the study graph and reader annotations are unchanged.

All **152 extension tests passed** from a disposable persistent checkout,
including the focused **32 command/renderer checks**. JavaScript syntax checks
pass. The browser's live-page screenshot and offline-source screenshot were
inspected. No Python implementation change was needed for this interaction.

MRW 0.15.0 adds the source-based inference-outline consumer described in
[the workflow](PROOF_GRAPH_WORKFLOW.md). It adds no Lean extractor or checker.

## Core and command checks

The focused Python checks cover the two 08ZH routes; conjunctive premises and
alternative derivations; all witnesses in a diamond with a simultaneous direct
edge; path-oracle comparisons across generated DAGs and retained selections;
local assumptions, scope discharge and protected boundaries; cycle/missing-node
rejection; rejection of fabricated status fields and duplicate JSON keys; and
bounded failure rather than truncation of exponential alternatives. Opening,
deleting and restoring are pure operations with network/process creation denied.

VS Code command/renderer checks cover exact file preservation, revision-bound
selection persistence after close/reopen, source changes and exact undo, stale
actions, rejected premise deletion, changed/missing/escaped snapshots, retained
session quotation bytes, explicit AI preparation with exact JSON only, no Send
on view actions, inert HTML-like prose and full joint-premise witnesses.

The first combined run from `/tmp` reached the established artifact-storage
guard: tmpfs cannot retain saved artifacts across restart. The broader regression
run uses a disposable persistent checkout under `.codex-work`, retaining the
guard and leaving the real study store untouched.

## Browser check

An isolated headless Chrome profile loaded the actual bundled KaTeX, annotation
renderer, graph view and source-based 08ZH data from local test HTML. The controls
performed **Use AI outline → Delete closed diagonal → Restore all → Use AI
outline**. Visible claim counts were **15 → 10 → 9 → 15 → 10**. Both alternative
goal derivations and their joint premises remained present. The browser rendered
242 MathML expressions with no KaTeX errors before the final presentation cleanup;
the exact-text disclosures used only by annotations were then removed from graph
claims. The graph uses the host theme and scrolls horizontally at readable label
size instead of shrinking every node to fit.

This is a browser/command check, not a report of operating the user's native
VS Code window. Actual-window acceptance and the explanatory benefit of the
summary/deletion choices remain unobserved. Lean checking is reported by the
source project; MRW has not run that toolchain. Opening, deleting, expansion,
restoration and reopening have no provider or compiler path.

## Regression results

- Python: **397 tests**, **67 skipped**, no failures. Skips are the existing
  opt-in Qt widget and unbuilt pinned-checker cases.
- VS Code: **145 tests passed** in the persistent disposable checkout.
- The final proof-outline command/renderer checks separately passed **6 tests**,
  including concurrent reopen exclusion and host-state publication failure.
- Python compilation and JavaScript syntax checks passed. Package verification
  compares all runtime bytes and the production manifest with the checkout.

The final browser pass again produced 15 → 10 → 9 → 15 → 10 claims, 242 MathML
expressions, no KaTeX errors, both alternatives and joint premises. Its screenshot
was inspected after removing repeated annotation-text disclosures and enabling
horizontal graph scrolling. The real reading overview and private study payload
are checked for byte preservation during delivery.

## Installed delivery

Verified and installed **0.15.0** from `vscode/theorem-terminal-0.15.0.vsix`
(SHA-256 `ef1a2d1a6bc981e82e53ffd84fd54fa67b07635533177337e390055faf7609bc`). The installed production manifest and all
68 runtime files match the package. The installed bridge reproduces 15 → 10 → 15
claims and both goal routes; both saved Stacks references resolve unchanged.
The overview, store head and all 12 retained study payload files are byte-identical
to the pre-delivery inventory. No window reload was performed. Native-window
acceptance and mathematical usefulness remain pending.

## Installed 0.16.0 delivery

The checked VSIX is installed without a window reload. Its manifest and all
70 installed runtime files match the package (SHA-256
`958a37bdb3f15a77a979a55a63d725c69653435cfe8980abf191a655ef9e60ec`). The proof-outline JSON, reading overview, store head and
all 12 retained payload files are unchanged. The live/saved browser screenshots
remain outside Git under `/tmp/mrw-0160-live.png` and `/tmp/mrw-0160-saved.png`.
The native VS Code graph still requires user activation and confirmation.
