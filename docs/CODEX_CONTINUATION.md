# Codex continuation: R1 readable mathematics beside a durable note

Use this document as the next implementation prompt. The active roadmap is
[CODEX_PLAN.md](../CODEX_PLAN.md#active-roadmap-mathematical-usefulness-first).
Current task: **implement and deliver the bounded R1 workflow**. R2 adds a
task-local model exchange; R3 adds explicit follow-up and continued investigation.

## Objective

In `flengyel/theorem_terminal`, make it possible to open an existing local
mathematical PDF beside an editable ordinary work note, read and write
comfortably, save, close, reopen and continue. Complete the code, verification,
documentation and focused commit. Do not stop at another plan or require the
user to run a manual acceptance ceremony before implementation.

The product has useful editing, recovery, live text anchors and retained-record
services. It has not demonstrated in-application study assistance or research
collaboration. Preserve the foundation and deliver this missing reading path.

## Establish the working context once

Read `AGENTS.md` and its referenced documents, especially the active roadmap,
its development-status table and UX_SPEC's ordinary-file workflow. The roadmap
supersedes the old numbered-stage execution order. Use retained contracts for
the components you actually change.

The roadmap was committed at `b3f650011e7c9fb93265780259d584351f2f1cfa`;
this is historical context, not a required HEAD. Inspect the current branch,
local changes and relevant upstream changes. Work from current applicable code
without resetting user work, discarding commits or forcing unrelated source
repositories to match a pinned main. Use an isolated worktree if useful.

Preserve unrelated tracked and untracked files, including
`Theorem_Terminal_Justification_Logic_Integration_Review.md` and
`docs/design/mermaid-diagram.png` if present. Do not stage or modify those files.
Do not modify the authoritative Categorical Rice–Shapiro corpus to test the app.
Use a test project and an existing or generated local PDF fixture; the ordinary
opening test must work without a TeX compiler or source.

## Implement this bounded workflow

1. **Open and read.** A PDF selected through ordinary Open or the project
   navigator renders read-only in the existing QtPdf view beside an editable
   note. Preserve the note and its state while switching documents or views.
   Give the PDF a clear title/status. Reuse the current page and zoom controls.
2. **Keep identities honest.** An existing PDF has its own validated document
   identity, not a fabricated successful build. Keep its bytes outside text
   buffers, text Save, recovery and text anchors. Opening, reading or restoring
   it invokes no compiler, model, network or external document action.
3. **Resume.** Preserve the chosen PDF, page, zoom and note across close/reopen.
   Keep imported-document state distinct from generated-output provenance.
   Cancellation or a missing, unreadable, invalid or changed PDF must leave the
   note safe and report what happened. A failed load must not replace valid
   reading state; changed bytes must not silently inherit a claim of exact
   old-passage restoration.
4. **Use ordinary keys.** Bind platform-standard Open, Save, Find and Find-next;
   show the bindings in menus and retain inherited editor shortcuts. Save must
   have a clearly identified editable target and can never overwrite a PDF.
   R1 Find/Find-next apply to text. With PDF focus, visibly explain or disable
   unavailable search; do not silently search another or hidden editor.
5. **Make marking visible.** Confirm successful marking with a visible location
   or clear status and make the reason for unavailable Return discoverable.
   Preserve existing live-anchor, deletion, external-change and failure
   semantics. No anchor redesign or five-anchor quota is needed.
6. **Preserve existing workflows.** Keep source editing, shared-document pane
   behavior, trusted explicit TeX builds, last successful generated output,
   truthful staleness, retained-record inspection and private recovery working.

Start with `src/theorem_terminal/gui.py`, `workstation.py` and `workspace.py`,
and the corresponding controller/widget tests. The current layout already puts
editors beside PdfPane. The current coupling to successful-build reports and
the ordinary-file rejection of PDFs need a bounded separation, not a new
rendering framework.

Choose the smallest validated state representation after reading the code.
If workspace persistence changes, preserve all supported historical migrations,
wrap settings, buffer/pane positions, recovery, anchors and independent mutable
copies. Migration validates data without source reads. Actual document loading
validates the selected PDF. Do not prescribe a new schema solely to satisfy
this prompt.

## Keep the cut line

Deliver R1. PDF search, outlines, SyncTeX, extraction/OCR, new rendering
frameworks, R2/R3 implementation, live provider calls, new formal machinery,
corpus ingestion and autonomous agents are outside this task. Keep current PDF
external-action suppression; richer internal links can follow when needed.
Do not delay R2 afterward for complete PDF-reader feature parity.

The user may request orientation, definitions or examples at any point.
No forms, compulsory reading sequence, formal correspondence or warrant
inspection precedes ordinary study. The existing domain and provenance
distinctions remain intact.

## Verify proportionately and deliver

Use meaningful controller tests and actual Qt widgets. Cover:

- opening a real PDF with no build alongside a note, without changing PDF bytes
  or triggering external actions;
- saving the note and restoring its state plus the identified PDF's page/zoom;
- cancellation, loading failure and changed identity without losing the note
  or the last valid reading state;
- historical migration and malformed new state when persistence changes;
- actual key events for application shortcuts, correct focus behavior, visible
  marking and Return after reopening;
- imported/generated PDF switching and the established failed-build behavior
  that preserves the last successful output and truthful provenance.

Do not count direct QAction invocation as a keyboard test. Run focused tests
while developing, then the normal full Python regression suite once with
`THEOREM_TERMINAL_GUI_TESTS=1` and the available supported Qt platform, plus
compilation and whitespace checks. Preserve established test boundaries and
report legitimate dependency skips; do not weaken tests to pass. Broaden or
repeat checks only for a relevant change or an unresolved failure.

Exercise the actual PDF/note workflow visibly at 1280×820 and 960×680. Verify
one installed launch using the project's supported packaging path. Existing
tests may exercise their established TeX and offline-record boundaries; this
task does not call for a new manual Lean/warrant experiment. If the desktop or
another required runtime is unavailable, complete feasible implementation and
checks and report the exact unverified behavior. Do not claim visual acceptance
from offscreen checks, or ask the user to repeat a fragile setup ceremony.

Update CODEX_PLAN's implementation status, README's delivered capabilities,
UX_SPEC for any final interaction decisions, and AGENTS only where instructions
need to change. Replace this continuation document with a bounded R2 handoff
after R1 is delivered, preserving the roadmap's scope. Distinguish implementation
and technical verification from observed mathematical usefulness. Without a
real user study, mark usefulness pending rather than blocking delivery or
claiming success.

Review the complete diff, commit only this focused work and publish through the
repository's normal branch workflow when verification passes. Do not force-push
or include unrelated changes. Finish with the commit/branch, implemented
behavior, verification and material limits, concise launch instructions, and
the next R2 task. This implementation task ends after the reviewable R1 delivery;
further implementation follows the next handoff.
