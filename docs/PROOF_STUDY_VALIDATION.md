# Proof-study validation — 2026-11-05

## Findings against HEAD 6899ff5

The loading-screen repair is present in HEAD as 0.16.1. Parent-window messages
have the webview’s origin even though VS Code masks window.parent. The retained
wrapper-origin filter and startup Retry regressions pass. A real parent-frame
browser test reproduces the 0.16.0 blank loading view and renders with the repair;
foreign-frame messages remain excluded. The user’s window is not reloaded.

Both reported data-handling defects are confirmed against unchanged HEAD:

- Rejected managed writes and interrupted candidate copying leave unpublished
  generation directories. The new regressions fail against HEAD and pass with
  cleanup restricted to the current call’s directory identity, absent recovery
  journal, and a HEAD that does not reference that generation. Not-sent cleanup,
  uncertain publication preservation and journaled failure preservation pass.
  Interrupted managed Send still retains and recovers its outcome without retry.
  Earlier generations are not swept.
- Ordinary Ask clears an unsent draft before a cancellable question dialog. Its
  new regression fails against HEAD. The repair refuses a replacement before
  invalidating the old draft or exact preview, matching the reader/proof Ask
  guards. Finish or Discard remains explicit. No provider call is made by these
  checks.

## Reusable workflow

Command tests use the real retained-source core and exact Stacks fixture passages
for both 08ZH and 08ZG: proof, statement and explicitly selected 08ZE statement.
Each case prepares a handoff, imports an attributed proposal with bound source
pins, creates exact quotation snapshots, opens the existing graph, saves an
unresolved question and reconstructs it with a fresh command registration.
Unselected source text, reader notes and evidence do not enter the handoff.

The 08ZG case is also saved as ordinary files under the genuine study’s new
`proof-studies` folder. It uses the real retained complete-source SHA-256 and
private references, not fixture identities. Codex companion supplies five
attributed claims and four proposed inferences. The section identity proves
both inclusions in the fixed-point description of s(Y); pairing id_X with s∘f
provides the continuous comparison map. Deleting the proposed intermediates
leaves three visible claims and retains their witnesses. The unresolved question
asks which separation hypothesis is needed. This is a second mathematical
argument using the same workflow, not proof of general corpus coverage.

Mathematical prose review covers all five claims and four explanations. Map
sources/targets, the section identity, the Hausdorff hypothesis and both set
inclusions were inspected against 08ZG and the selected 08ZE statement. Section 1
and Sections 4–5 of Knuth, Larrabee and Roberts’s Stanford Mathematical Writing
report were consulted from a local copy. No Lean check or mathematical
certification is claimed.

## Focused checks and interaction

The broader integrated run passes 160 extension tests. The storage, graph and
assistance modules pass 43 Python tests. Later focused checks cover summary form
placement, preserved typed text after rejected saves, explicit human/AI origin,
successful return to the selected claim, source-author attribution, failed question
save feedback, stale-study rejection and reopening a closed backing document.
The final focused runs pass 15 graph command/renderer tests and seven study
lifecycle tests. They also cover exact quotation bytes with a CRLF editor
default and explicit editor-title URI precedence. Syntax checks pass.
Package/install byte checks are recorded at delivery below.

The isolated Chrome run uses actual bundled renderer code, the same-origin
parent transport and real mouse events. It verifies initial graph rendering,
foreign-frame rejection, exact 08ZH page selection, pan/zoom, animated deletion
and restoration, saved text, reduced motion, and summary correction returning to
the selected claim. Study controls preserve an unsaved question, require Save
before copying, save the question, relay the handoff, expose the imported outline
and open it. Backend import and resumption are separately tested with the real
core and native-API doubles. The browser wrapper’s host replies are deterministic;
this is not a claim of operating the user’s actual VS Code window.

The first browser pass exposed a summary form below the full source passage.
It now appears beside the claim, with pending saves freezing their text fields.
The first scroll helper also scrolled the test wrapper; the corrected harness
uses a fixed viewport like VS Code. The passing browser result is scoped to that
wrapper, not a new native-window acceptance result.

## Practical assessment

The removed manual steps and remaining friction are listed in the
[workflow](PROOF_STUDY_WORKFLOW.md#steps-removed-and-remaining-friction).
The Codex companion is the author of the trial proposals, not a retained MRW API
ModelCall. Structural validation is separate from mathematical checking. Human
acceptance and improved understanding remain to be observed.


## Installed delivery

Verified **0.17.0** is installed; its production manifest and all 73 runtime
files match the checked VSIX (SHA-256
`36502f2f72e11b7d998e7add7e165bc4774b65d862b6a359521f334423255af3`). The original
21 ordinary study files, private HEAD and all 12 retained payload files are
byte-identical to the inventory taken before creating the second study. Only
the new 08ZG study/outline and their quotation snapshots were added. The installed
bridge projects that case from five to three visible claims and verifies all
three quotation snapshots. Its eleven claim expressions render with the bundled
math renderer. This does not check its mathematical inferences.

No user window reload was invoked. Save drafts before activating the installed
extension with Reload Window. Open `proof-studies/08zg.mrw-study.json` and use
its study icon or **MRW: Resume Proof Study** to resume the new question.
