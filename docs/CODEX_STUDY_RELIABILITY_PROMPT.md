# Codex task: preserve study work and reconcile its evidence

## Outcome

Make the delivered MRW 0.19 study cycle reliable when switching material,
editing feedback, correcting outcomes, updating the extension and recovering
from failed writes. Start from reviewed `6c7f227a3aec9861f0dc2112b83c77aa0e849b50`,
fetch origin and reconcile any newer/local work without discarding it.

Read [MRW_019_REVIEW](MRW_019_REVIEW.md), the current AGENTS.md/CODEX_PLAN.md
priority, ACTIVE_STUDY_WORKFLOW.md and ACTIVE_STUDY_VALIDATION.md. The review gives
nine reproduced failures and exact baseline locations. Confirm whether each
remains before changing it; do not redo the already delivered 0.19 work.

Implement the fixes, validate them, package, install through the established WSL
delivery route when compatible with preserving the open session, and commit/push
to main. Do not stop after another review or plan. GPTWork owns this review and
handoff; local Codex owns implementation in VS Code connected to WSL2.

## 1. Preserve every pending draft and choose the intended material

Address R1, R2 and R4 first.

- Editing a retained reply must not silently replace another unsaved response.
  Guard paste, edit and any other replacement route consistently. Retain or
  explicitly discard the existing draft before replacement. Keep original
  pasted bytes and separately attributed edits.
- Bind asynchronous messages to study, attempt and draft identities before
  mutation. Reject unavailable/stale identities instead of redirecting them
  into the active study. Preserve valid delayed messages for their original
  study. Carry the required identity through renderer messages and checkpoints.
- Replace the single global draft timer with per-study scheduling or a small
  dirty-study mechanism. Flush every pending study on explicit save, appropriate
  close and shutdown, not just whichever is active. Do not claim abrupt-process
  durability beyond the implemented checkpoint boundary.
- An explicit Study Current Material invocation on a saved editor selection
  must use that selection even if another MRW passage was previously remembered.
  Reader/graph invocations must keep their supplied exact references. Ordinary
  focus movement into an answer, help form or Codex must not retarget a study.
  Preserve the original selection across asynchronous pickers/source retention.
- Use native VS Code context actions and ordinary save/error affordances.
  Preserve user layout, keyboard access and pending controls. Follow
  [Microsoft Views guidance](https://code.visualstudio.com/api/ux-guidelines/views)
  and [Webviews guidance](https://code.visualstudio.com/api/ux-guidelines/webviews).

Acceptance: edit A/paste B/unsaved correction/edit A; delayed A draft followed by
B draft and shutdown; unknown/stale message; explicit editor B after reader A;
return from companion with no explicit source change. Verify persisted content
and exact source identity, not just the absence of an exception.

## 2. Recover recording and shared scheduling after interrupted writes

Address R3 and R5.

- Publish immutable snapshot files only after the complete content is written.
  Reuse a suitable existing publication primitive or implement the smallest
  Node-side equivalent needed here. Keep immutable no-overwrite/digest checks;
  do not repair arbitrary collisions by overwriting them.
- Clean up or recover operation-owned incomplete temporary output after a
  partial write, then allow buffered events and subsequent events to flush.
  A persistent error must remain visible while study and live drafts remain
  usable. Preserve any unrecognized existing file rather than sweeping it away.
- Track every study/question owner mutated by a shared-question operation.
  A failure between saving the active attempt and its owning question must
  remain recoverable after retry and restart. Reconcile the retained outcome
  and derived schedule idempotently; do not fabricate another attempt/review.
  Define what is authoritative and where pending recovery is represented.
- Prefer a focused checkpoint/reconciliation mechanism around the existing
  store. This assignment is not authorization for a storage migration, general
  transaction framework, synchronization service or history rewrite.

Acceptance: inject ENOSPC after some snapshot bytes exist, restore the I/O,
retry and record a later event; verify complete immutable snapshots and event
order. Fail the shared owner's checkpoint after the active study save, then
retry/restart; verify the owner schedule reflects the retained outcome exactly
once. Cover preexisting mismatched snapshots without destructive repair.

## 3. Keep corrected evidence, effort and offers consistent

Address R6, R7 and R8.

- Replay of earlier reviews must work while a question is retired/suspended.
  Separate reconstruction from eligibility for a new review. Preserve the
  original observations, apply the linked correction and keep the question
  excluded from selection until explicitly re-enrolled.
- Withdraw/recompute an adaptation when its supporting outcome is corrected.
  Keep the original offer and withdrawal/supersession events. Use the effort
  report for that exact attempt, and reject stale choices carrying an obsolete
  offer identity. Do not substitute a new rating or claim the earlier offer
  never existed.
- Resolve effort offers and dispositions by their offer/attempt identities
  before splitting a report by software version or selected sessions. Attribute
  the effort observation to its task with response time/version recorded
  separately. Supporting export context must resolve a selected observation
  without becoming extra selected-session activity or a fabricated sample.
- Preserve distinctions among reader reports, observed exposure, AI assessment,
  application tasks and recall. Earlier help must not permanently disqualify a
  later independent attempt. Keep the pinned FSRS adapter; do not fit a new
  memory or cognitive-load model.

Acceptance: two reviews → retire → correct → reload → re-enroll; effort-based
less-guidance offer → corrected unresolved outcome → old choice; effort offered
before upgrade and answered/declined after upgrade; resumed-session-only export;
missing linked evidence. Check counts, reason/evidence links and schedule state.

## 4. Make manual help association accurate

Address R9 in the existing feedback view.

After multiple requests for an attempt, do not assign a pasted reply to the
newest request by recency alone. Show the chosen request/purpose and allow an
explicit selection when ambiguous, or save an unassociated reply. Preserve the
one-request path without unnecessary extra forms. The selected request must
carry its own attempt/source/adaptation identity; never borrow a newer
adaptation's link. Preserve attributed reassociation without replacing original
pasted text. A manual association does not authenticate origin or prove benefit.

Acceptance: requests R1/R2 with different purposes/adaptation links, replies
returned in reverse order, an unrelated pasted explanation, and pause/reopen.
Check the saved association and the exported evidence.

## Engineering and delivery

Use parallel agents for independent files: model/evidence/report tests; recorder
publication; renderer/help behavior. Assign one owner to activeStudy.js and
integrate the shared controller there. Review changes across these boundaries
before delivery. Split dense modified code into readable functions where that
helps enforce the required state transitions; avoid a general rewrite.

Add regressions that fail for the reproduced defects and pass after the fixes.
Retain the existing 23 focused tests. Include at least one integrated renderer/
controller path for the modified draft and reply controls, plus real disposable
filesystem tests for partial writes and owner recovery. Run affected existing
integration/shared-service checks and one final broader required regression
pass. Repeat checks only after relevant changes or a concrete failure.

Use one disposable session with two source passages, pending work, help,
correction, effort, pause/reopen and selected-history export. No private research
or genuine learning history may be used as a disposable fixture. Keep test/demo
origins separate and preserve all existing sources, annotations, graphs, current
studies and histories.

Try an isolated native host if available. If it again fails before the runner,
record that result and deliver the checked fixes with the limitation. No
open-ended Windows launch campaign, working-window takeover or mandatory human
acceptance ceremony is required. Do not reload/reset the working window.

Build/verify the next appropriate patch version (0.19.1 if still available) and
retain the extension identity and package verification practice. Update the
workflow, UX/status claims and continuation together; reference this review
rather than copying the entire defect list into every file. Report which review
IDs are fixed, the focused/broader checks actually run, package/commit identity,
and any remaining limitation. Finish with one ordinary use action, not a new
research assignment for the reader.

No new provider adapter, CHREST runtime, analytics service, corpus ingestion,
telemetry upload or general migration belongs in this repair. The public README
and exposure review already exist. Do not repeat that campaign, change repository
visibility, publish packages or resolve ownership/disclosure choices by
assumption. Continue to preserve the decisions recorded in PUBLIC_READINESS.md.
