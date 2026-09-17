# Codex continuation: R2 ask about the work

Use this document as the next implementation prompt. The active roadmap is
[CODEX_PLAN.md](../CODEX_PLAN.md#active-roadmap-mathematical-usefulness-first).
R1's PDF-plus-note workflow is delivered and must remain a regression boundary.
Current task: **implement and deliver one bounded, task-local mathematical
assistance exchange**. R3 adds linked follow-up, correction and continued
investigation.

## Objective

In `flengyel/theorem_terminal`, let a mathematician ask one natural-language
question about selected ordinary source or work text, inspect and reduce the
exact outbound context, explicitly send it through the existing OpenAI
Responses adapter, read an attributed answer, and either retain an exact useful
passage, edit a separately authored contribution into the work note, or leave
the answer unused. Complete the code, verification, documentation and focused
commit. Do not stop at another plan.

This is the first assistance milestone, not another retained-record-only
release. Explanation, definition, example, strategic hint, proof-step criticism
and purpose/prerequisite questions are ordinary questions in one workflow, not
new modes or schemas. No form, declaration, formal correspondence, warrant or
five-anchor ceremony precedes the question.

## Establish the working context once

Read `AGENTS.md` and its referenced documents, especially the active roadmap,
UX_SPEC sections 8.3 and 9.2, and the retained OpenAI adapter/projection
contracts. The roadmap controls priority; this handoff supplies the current
bounded implementation task. Inspect the current branch and local work, preserve
unrelated tracked and untracked files, and do not reset, discard or force-push.
No unrelated mathematical repository must match a particular commit.

Start with `src/theorem_terminal/gui.py`, `workstation.py`,
`openai_response.py`, `model_projection.py` and `response_review.py`, plus their
tests. Reuse the existing bounded adapter, immutable `ModelCall`, strict parser,
exact response spans and private no-overwrite persistence. Preserve the adapter's
fixed endpoint, `OPENAI_API_KEY` credential boundary, redirect rejection,
single-attempt behavior, `store:false`, byte/time/output ceilings, terminal
status retention and raw-response digest. Do not weaken or duplicate these
services to fit a widget.

## Implement this bounded workflow

1. **Ask from visible work.** Add one clear task-local question action to the
   principal GUI. A natural-language question is sufficient. Let the user add
   explicitly selected text from an ordinary text source or work buffer and
   remove it before sending. The selected source may be editable project text
   or an explicitly opened read-only text reference. Keep the source and note
   reachable while the question and answer are open. Do not include other
   buffers, workspace history, hidden note text or PDF bytes by default.
2. **Keep context exact and understandable.** Show provider, requested model,
   exact selected text, its ordinary-file identity/version/location, the
   question, complete transmitted instructions/input, configured limits,
   destination and the existing retention disclosure. Derive low-level
   `ModelCall` metadata from the selected task; do not expose the transient JSON
   request envelope as a mathematician's form. Make missing or incomplete
   context visible. The final preview must identify the exact UTF-8 request-body
   bytes that will be sent.
3. **Require an explicit send.** The preview and confirmation are separate from
   editing the question. Each explicit Send makes at most one request through
   the existing adapter. Cancellation creates no artifact or network request.
   Run transport work off the Qt main thread, keep the mathematical work usable,
   prevent a duplicate in-flight send, and report completion or failure visibly.
   A failed, refused or incomplete terminal call remains inspectable exactly as
   the adapter specifies. Never retry or follow up automatically.
4. **Inspect the attributed answer.** For a completed call, show provider,
   requested/resolved model and call identity before readable answer content.
   Preserve access to the exact raw response. Any readable mathematical
   presentation must be non-executing and must not fetch URLs, dispatch links,
   run returned code or change the immutable record. Clearly distinguish model
   prose and unsupported citations from retrieved source material.
5. **Use or leave the contribution.** Let the user select visible exact answer
   text using the existing deterministic passage/UTF-8-span machinery and retain
   it as the existing lossless `Representation`, with no manual byte offsets.
   Let the user copy or insert an editable version into the current note only as
   separately attributed, human-editable work; later edits are not the raw model
   response. Provide a clear way to dismiss or leave the answer unused.
   Cancellation, rejection or simply closing the answer needs no disposition
   form and creates no premise, verification or warrant.
6. **Preserve R1 and the desktop foundation.** Existing local PDF reading,
   generated-PDF provenance, text editing and Save semantics, recovery, live
   anchors, explicit TeX builds, retained-record inspection and external-change
   behavior must continue to work. Network completions may update GUI state only
   on the Qt thread and must not overwrite concurrent note edits.

For R2, selected context is ordinary text that the user can inspect exactly.
Do not add PDF extraction, OCR or SyncTeX. A PDF page may motivate the question,
but PDF content is sent only if the user supplies an explicit transcription as
separately identified work text, or selects corresponding ordinary source text.
Record the available document/page locator without claiming that a transcription
is lossless PDF extraction.

Choose the smallest validated UI and persistence changes after reading the
current code. Request configuration may use a compact project/user setting or a
clearly documented environment/config boundary, but secrets stay only in
`OPENAI_API_KEY` and never enter workspace state, previews, logs or records.
Avoid a new workspace schema unless durable user state genuinely requires it;
if the schema changes, preserve every supported historical migration without
reading source files during migration.

## Keep the cut line

Deliver one initial question and response. Linked follow-ups, retries,
conversation state, correction/alternative exchanges and investigation
summaries belong to R3. Also defer PDF search/outlines/extraction/OCR, citation
retrieval, source verification, provider tools, a second provider adapter, a
provider registry, autonomous requests, new formal machinery, general corpus
ingestion and a broad rendering architecture.

Do not solicit hidden chain of thought, reconstruct provider-internal reasoning
or label an explanation as raw chain of thought. Retain only returned text and
routes explicitly present in it. A response, citation, extracted passage or
edited note is never automatically a fact, premise, correspondence, acceptance,
verification or mathematical warrant. Projecting an exact response passage and
the separate documentary-warrant experiment remain distinct explicit actions.

No live request is authorized by implementation, tests or this handoff alone.
Every real transmission requires the user's per-request inspection and explicit
Send action. Automated tests must inject a deterministic transport and use no
credential or network. A later genuine mathematical exchange may evaluate
usefulness; it is not a prerequisite for delivering technically verified R2.

## Verify proportionately and deliver

Use controller tests and actual Qt widgets. Cover at least:

- building task metadata from an exact selected ordinary-file range, including
  Unicode and changed/unsaved text, while excluding unselected workspace data;
- previewing the exact request body and removing context before confirmation;
- cancellation with no transport and no artifact, missing credential/config,
  duplicate-send prevention, and an injected successful completion;
- failed, refused and incomplete terminal outcomes without note loss, automatic
  retry or a false completed answer;
- answer attribution, exact raw inspection, deterministic visible-passage
  selection/projection, multibyte spans, no-overwrite persistence and insertion
  into a note as separately attributed editable text;
- returned markup/URLs/code remaining inert, and provider citations remaining
  visibly unverified;
- actual key/focus actions and an in-flight completion arriving after the user
  edits, switches or closes a view; and
- the established R1 PDF/note, recovery, marker and explicit-build regressions.

Do not count direct QAction invocation as a keyboard test where the feature has
a shortcut. Run focused tests while developing, then the normal full Python
regression suite once with `THEOREM_TERMINAL_GUI_TESTS=1` and the available
supported Qt platform, plus compilation and whitespace checks. Use only an
injected/fake transport in automated and visual checks; do not make a live
provider request. Preserve legitimate dependency skips rather than weakening
tests.

Exercise the question/preview/answer/note flow visibly at 1280×820 and 960×680
with a deterministic local response, and verify one installed launch through
the supported packaging path. Report unavailable desktop or packaging checks
exactly. Do not claim mathematical usefulness merely because tests, a synthetic
response or the UI exercise passes.

Update CODEX_PLAN's implementation status, README's delivered capabilities,
UX_SPEC for final interaction decisions, and AGENTS only where instructions
change. Replace this file with a bounded R3 handoff after R2 is delivered.
Separate implementation, technical verification and observed mathematical
benefit in every status report.

Review the complete diff, commit only focused changes and publish through the
normal branch workflow without force-pushing. Finish with the commit/branch,
implemented behavior, verification and limits, launch instructions, and the
next R3 task. The R2 task ends with a reviewable single-exchange delivery; do not
silently continue into R3.
