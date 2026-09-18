# Codex continuation: R3 continue an investigation

Use this document as the next implementation prompt. The active roadmap is
[CODEX_PLAN.md](../CODEX_PLAN.md#active-roadmap-mathematical-usefulness-first).
R1's PDF-plus-note workflow and R2's single task-local assistance exchange are
delivered and are regression boundaries. Current task: **implement and deliver
one explicit linked correction, alternative or follow-up that can be resumed as
ordinary mathematical work**. Do not begin R3 during the R2 delivery turn.

## Objective

In `flengyel/theorem_terminal`, let a mathematician continue one completed R2
exchange by selecting exact prior answer material, writing a correction,
changed assumption, alternative request or follow-up question, inspecting the
entire new outbound context, and explicitly sending one independently bounded
request. Preserve enough ordinary task state—current question, last useful
conclusion, unresolved issue and selected evidence—to close and reopen the
project and continue without reconstructing hidden conversation state. Complete
the code, verification, documentation and focused commit; do not stop at a plan.

R3 tests reciprocal mathematical work, not chat accumulation. A natural
follow-up or correction is sufficient. Do not require a disposition form,
confidence score, formal declaration, warrant inspection or anchor ceremony.

## Establish the working context once

Read `AGENTS.md` and all documents it names, especially the active roadmap,
UX_SPEC sections 8 and 9, and the R2 controller/widget tests. Inspect the current
branch and local work, preserve unrelated tracked and untracked files, and do
not reset, discard or force-push. No unrelated mathematical repository must
match a particular commit.

Start with `src/theorem_terminal/gui.py`, `workstation.py`,
`openai_response.py`, `model_projection.py` and `response_review.py`, plus
`tests/test_assistance.py` and `tests/test_assistance_gui.py`. Reuse R2's exact
selection snapshot, preview, worker, in-flight exclusion, immutable terminal
`ModelCall`, deterministic passage selection and private no-overwrite
persistence. Preserve the adapter's fixed endpoint, environment-only
`OPENAI_API_KEY`, redirect rejection, one-attempt behavior, `store:false`,
ceilings, terminal status retention and raw-response digest. Do not weaken or
duplicate these services for a conversation widget.

## Implement the bounded R3 workflow

1. **Continue only by explicit action.** From a completed retained R2 call, let
   the user start one linked continuation. They may select one or more exact
   deterministic response passages, add visible ordinary source/work selections,
   and write one correction, changed assumption, alternative request or
   follow-up question. No completion may trigger another request automatically.
2. **Make the link and content explicit.** Set the new `ModelCall.in_reply_to`
   to the exact prior call identity. Show that identity and digest, every selected
   prior response span, every current ordinary-text context, the user's new text,
   provider/model, limits, disclosure, destination and complete exact UTF-8
   request body. Permit removal of any context before Send. Do not use
   `previous_response_id`, provider conversation state or unshown history; the
   provider receives only the newly previewed body.
3. **Preserve authorship and correction.** A human correction or synthesis is
   ordinary editable work, separately attributed from model prose. Selecting a
   prior answer proves only exact production and span identity. It does not make
   the answer, correction or new request true, accepted, verified or admitted.
   Do not overwrite the earlier call or projection.
4. **Send one bounded continuation.** Keep preview and Send separate. Run the
   request off the Qt thread, prevent duplicate sends, make no retry and retain
   every terminal outcome exactly as R2 does. A refusal, incomplete response or
   failure must leave the prior answer and all notes intact.
5. **Support correction and comparison.** Present prior selected text, the
   explicit human correction/changed assumption and the new attributed answer
   together without rendering or executing returned markup. Let the user retain
   an exact new passage or insert another separately attributed editable copy.
   Dismissal remains valid and needs no sentence-by-sentence disposition.
6. **Resume the investigation.** Preserve the smallest useful task-local state
   needed to reopen the project and see the current question, last useful
   conclusion, unresolved issue and selected evidence. Prefer an ordinary work
   note plus immutable call/projection links; add a private workspace field only
   if a concrete restore requirement cannot be met otherwise. Any schema change
   must retain every supported historical migration and must not read source
   files during migration. Missing or changed immutable records must be reported
   without losing the ordinary note.
7. **Preserve R1 and R2.** Existing PDF/note identity and restoration, standard
   shortcuts, recovery, live anchors, explicit builds, one initial assistance
   exchange, terminal-status handling, exact projection and note insertion must
   remain unchanged.

Choose the smallest interaction that supports one parent and one child call.
Do not turn the dock into a general chat client. The task summary must be
inspectable and editable by the mathematician; it is not an automatically
generated epistemic status.

## Keep the cut line

Deliver one explicit child `ModelCall` linked to one completed parent. Defer
branching conversation trees, more than one follow-up in the live widget,
automatic retry, provider-side conversation or response IDs as state, hidden
history, autonomous requests, summaries generated without a separate call,
source/citation retrieval, source verification, PDF extraction/OCR/SyncTeX,
provider tools, a second provider, a provider registry, collaborative sync, new
warrant machinery, general corpus ingestion and a broad rendering architecture.

Do not solicit hidden chain of thought or claim access to provider-internal
reasoning. A cited route remains unverified until separately retrieved and
checked. No answer, correction, task summary, projection or link automatically
creates a premise, correspondence, Verification, acceptance or warrant.

No live provider request is authorized by implementation, tests or this
handoff. Every real parent or child transmission requires the user's own exact
preview and explicit Send. Automated and visual checks must inject deterministic
local transports and must not expose a credential. A later genuine mathematical
investigation evaluates usefulness; synthetic linked calls do not.

## Verify proportionately and deliver

Use toolkit-independent controller tests and actual Qt widgets. Cover at least:

- exact parent identity/digest and multibyte prior-response passage spans in the
  child request, with no hidden parent text or workspace data;
- a visible human correction or changed assumption kept distinct from both
  model responses;
- context removal, exact child-body preview, cancellation, missing
  configuration, duplicate-send prevention and injected completion;
- refused, incomplete and failed child outcomes without retry, false completion,
  prior-record mutation or note loss;
- `in_reply_to` linkage while the HTTP body uses no provider conversation state
  or `previous_response_id`;
- concurrent note edits and view switches while the child request runs;
- inert returned markup/URLs/code, visibly unverified citations, exact new
  passage projection and attributed editable insertion;
- close/reopen restoration of the bounded investigation state, including
  missing or changed retained-record handling; and
- established R1 PDF/note, recovery, marker, build and all R2 regressions.

Do not count direct QAction invocation as a keyboard test where a shortcut is
part of the interaction. Run focused tests during development, then one final
GUI-enabled full Python suite, compilation and whitespace checks. Exercise the
parent/correction/child/resumption flow visibly at 1280×820 and 960×680 with
deterministic local responses, and verify one installed-wheel launch. Report
genuine dependency skips or unavailable runtime checks; do not weaken tests or
claim mathematical usefulness from synthetic calls.

Update CODEX_PLAN's implementation status, README's delivered capabilities,
UX_SPEC's final interaction decisions and AGENTS only where development
instructions change. Replace this file with the next bounded handoff after R3
is delivered. Keep implementation, technical verification and observed
mathematical benefit separate.

Review the complete diff, commit only focused changes and publish through the
normal branch workflow without force-pushing. Finish with the commit/branch,
implemented behavior, verification and limits, launch/use instructions and the
next bounded task. Stop after the reviewable R3 delivery; do not silently begin
the following increment.
