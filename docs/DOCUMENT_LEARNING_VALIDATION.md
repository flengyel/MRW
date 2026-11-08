# Document problems and independent solution review — 0.23.0

This increment implements ordinary Markdown → Contents section → associated
problem → Attempt or Review solution → named Return. The existing version-2
study/question records, reference answers, local recorder and pinned FSRS adapter
are reused. [Workflow and starting steps](DOCUMENT_LEARNING_WORKFLOW.md).
General research resumption and argument reconstruction remain subsequent work.

Document association uses the document URI independently of a revision. Exact
section snapshots retain their original text and revision separately; retained
published citations keep their own qualified source/revision/passage identity.
Direct solution review creates no attempt or recall grade. Consultation during
an attempt preserves its draft and marks later submission evidence. Attributed
originals remain available after solution correction. Due offers require explicit
association and recall admission; later-problem flags/dates do not run FSRS.

## Automated checks

The final extension pass completed **339/339 tests**, exit 0, with no skips.
The final focused document/controller/renderer/reliability pass completed
**29/29**, exit 0. Shared Python study-question **2/2** and editor-bridge
**11/11** checks passed, exit 0. JavaScript syntax and whitespace checks passed.
The earlier broad pass exposed two outdated assertions: preview actions now
include Problems, and the import-lock timeout must start after acquisition
finishes. Those assertions were corrected and the complete final pass rerun.

Regressions cover preview invocation without an active text editor after an
unrelated retained source; stable document associations and exact snapshots;
independent review; missing/attributed/revised solutions; consultation and later
independent recall; explicit shared-question ownership; bounded relevant due
offers; failed-write recovery; dirty buffers; changed/missing Return locations;
and inherited navigation, persistence, reply and correction behavior. Focus-help
tracking also preserves keyboard help when the pointer leaves its control.

These checks establish software behavior and record/graph structure where
applicable. They do not establish mathematical correctness, learning benefit,
human comprehension, or a Lean verification result.

## Native workflow observation

Windows VS Code **1.144.1** with **WSL Debian**, using the high-contrast theme,
completed **twelve behavioral checks** across the main and fresh-host phases.
The main phase covered document choice/cancellation, preview-only section launch
after an unrelated retained source, direct review, consultation with saved work,
reopen, relevant due dismissal, whole-problem later work, outside/overlapping
edits, missing files, explicit relocation, repeated retained-citation Return,
ordinary note-link Return and keyboard-focus help. The fresh host recovered the
problem, draft, solution review and unresolved question and returned to the exact
changed heading while preserving its **two native editor groups** and visible
unrelated dirty pane. No production layout commands were issued.

The fixture is [documentLearning.js](../vscode/test/host/documentLearning.js).
It uses a disposable project, isolated study storage, the packaged parity
example, real native views and final production JavaScript. File-dialog answers,
webview input/click probes and offline Stacks acquisition are injected. It is
an automated host observation, not a human study session. Its main and cold
phases use separate extension-host activations over the same disposable study.
The first run's screenshot checkpoint timed out after its eleven behavioral
checks; that raw report is retained. Cold setup initially assumed exactly two
editor groups; a preliminary setup produced three. The final check requires
multiple groups, records the settled layout (two), and asserts it is unchanged
by resume and Return. No product assertion was removed for these checkpoints.

Screenshots show high-contrast native Commands button borders, document
Contents, and both sidebars. Other themes/platforms, PDFs, live AI, Obsidian,
Sage and Lean were not exercised in this increment. Historical orientation
reports remain unchanged; this records the additional observed scope only.
Genuine notes, annotations and study records were not fixtures or rewritten.
The working window was not switched, closed, reloaded or rearranged.

## Package and installation

The verified package is `vscode/mrw-0.23.0.vsix`, **577,432 bytes**, SHA-256
`2e40ae362a9c9090a1260fdfcc23746008890060d95fdf7b6b73d0a4391f4195`.
Verification checked **106 archive files**, the production manifest and runtime
bytes, with development fixtures excluded. All production JavaScript matches
the native fixture. The packaged tutorial and source README match this checkout;
vsce expands relative README links. The isolated build marker records base
`2503d0e0734a219ae05d6dec4c132915cbf5729a` plus local changes. The root's historical
marker was preserved. No runtime code changed after the final regression pass.

Installation through the established WSL `code-server --install-extension …
--force` route returned exit 0. All **104 installed payload files** match the
VSIX, excluding installer-only manifest metadata, and the registry selects
**flengyel.mrw 0.23.0**. No working-window reload was forced; its active instance
adopts the update at its next normal activation. Native observations used the
verified package in the separate fixture, not an asserted live working-window
adoption. [Machine evidence](evidence/document-learning-20261107.json) records
hashes, statuses and observations. Logs/screenshots remain under the ignored
`.codex-work/vscode-host-document-learning/evidence` directory.

## Removed steps and remaining friction

A document section no longer requires arbitrary text selection or source import
to start work. Independent review needs no preliminary attempt/outcome. Saved
problem entry and solution correction need no JSON editing. Pause/reopen retains
work, review context, unresolved question and named Return without reconstructing
the study. Explicit links preserve a saved question's original owner and sources.

Problem/solution entry and attribution remain manual. The reused form still
calls its fields Question and Reference answer. There is one active attempt and
one study-wide unresolved-question field; the existing bounds remain sixteen
retained contexts and 200 question revisions. Problem dates are displayed, with
no background notification. Changed/renamed origins require an explicit choice
or a new Contents invocation. Optional Codex handoff still uses the clipboard.
These are workflow limits, not claims that a broader research-question system
has been delivered.
