# MRW 0.19.0 code review

Reviewed commit: `6c7f227a3aec9861f0dc2112b83c77aa0e849b50`. Scope: the 0.19 study, feedback,
recorder, scheduler and report changes, their integration with source selection,
and the delivery/public-readiness documents.

## Verdict

0.19 implements the preceding assignment. The earlier correction/timing and
assessment distinctions have focused regression coverage; retained prose,
pending outcome inputs and the offline example are implemented. The next task
should repair continuity and evidence consistency during switching, corrections
and interrupted saves. A new learning subsystem is not required.

Nine further defects were reproduced. P1 denotes loss of pending work or a
persistent recording failure; P2 denotes wrong selection/association or an
incorrect derived schedule/report/offer. These are code/controller results,
not observations of the installed native VS Code window.

## Findings

### R1 — P1: editing an old reply replaces an unsaved response draft

Location: [activeStudy.js:137](https://github.com/flengyel/MRW/blob/6c7f227a3aec9861f0dc2112b83c77aa0e849b50/vscode/src/activeStudy.js#L137),
with Edit still available in [activeStudyView.js:113](https://github.com/flengyel/MRW/blob/6c7f227a3aec9861f0dc2112b83c77aa0e849b50/vscode/src/activeStudyView.js#L113).

Retain reply A, paste reply B, type an unsaved correction to B, then select Edit
on A and pause. `help_edit` replaces `s.helpDraft` without the protection used
by `help_paste`. The new correction disappears from live state and the saved
checkpoint. Reproduction output: `persistedContainsUnsaved: false`.

Guard every path replacing a response draft, preserve its identity and offer
explicit retention/discard when a replacement is requested. An error/retry or
delayed message must not bypass the guard.

### R2 — P1: another study cancels a pending draft save

Location: [activeStudy.js:99](https://github.com/flengyel/MRW/blob/6c7f227a3aec9861f0dc2112b83c77aa0e849b50/vscode/src/activeStudy.js#L99)
and [flush:252](https://github.com/flengyel/MRW/blob/6c7f227a3aec9861f0dc2112b83c77aa0e849b50/vscode/src/activeStudy.js#L252).

Save A's original form, switch to B, deliver a delayed updated form from A,
then B's own draft. The single global debounce timer is canceled by B. Even
after the timer and controller flush, A's memory contains the new form while
its checkpoint contains the original. Flush persists only the active study.

Track dirty studies or use per-study timers, and flush all affected studies.
Validate study/attempt/draft identity before applying a message; unknown study
IDs must not fall back to the active study. Preserve normal focus changes and
late valid messages without redirecting their content.

### R3 — P1: a partial immutable snapshot write blocks all later recording

Location: [studyHistory.js:47](https://github.com/flengyel/MRW/blob/6c7f227a3aec9861f0dc2112b83c77aa0e849b50/vscode/src/studyHistory.js#L47).

Inject a write that creates part of the final snapshot and then fails with
ENOSPC. After storage recovers, retry encounters the existing partial file,
fails the content comparison and leaves the batch buffered. Adding a later
event grows the blocked queue from two to three. The partial snapshot remains.

Write complete snapshots before publishing their final immutable names. Keep
the no-overwrite/content-identity guarantee for genuine existing snapshots.
Recover operation-owned incomplete output without broad cleanup or replacement
of existing research data. The test must fail after creating partial bytes,
not only before opening the file.

### R4 — P2: explicit text selection loses to remembered source context

Location: [extension.js:294](https://github.com/flengyel/MRW/blob/6c7f227a3aec9861f0dc2112b83c77aa0e849b50/vscode/src/extension.js#L294).

With retained passage A remembered in the workspace, select ordinary saved text
in source B and invoke Study Current Material from that editor. `getCurrent`
returns A before inspecting the editor selection. Executing the current callback
with these inputs returned `retained-source-A` instead of selected B.

An explicit editor/context invocation must bind the selected source B. Preserve
the remembered source when focus moves to a study answer, help form or companion;
a blanket focus-driven switch would reintroduce an earlier problem. Carry the
invocation target where needed rather than guessing from the last remembered
reader.

### R5 — P2: shared-question owner save failure loses its updated schedule

Location: [activeStudy.js:30](https://github.com/flengyel/MRW/blob/6c7f227a3aec9861f0dc2112b83c77aa0e849b50/vscode/src/activeStudy.js#L30)
and [flush:252](https://github.com/flengyel/MRW/blob/6c7f227a3aec9861f0dc2112b83c77aa0e849b50/vscode/src/activeStudy.js#L252).

Review an owner's question from a study containing the explicitly matching source.
Fail the owner checkpoint after saving the active study. In memory the owner has
one review; after restart its saved question has zero reviews and a null card.
The active study is completed and the immutable history still records success.

Track every mutated owner and support idempotent recovery/reconciliation when
only part of the operation was saved. Do not claim the immutable evidence was
erased: it remains, but the derived schedule diverges from it. A whole-store
migration feature is unnecessary.

### R6 — P2: correcting a retired question clears its review/card state

Location: [studyModel.js:70](https://github.com/flengyel/MRW/blob/6c7f227a3aec9861f0dc2112b83c77aa0e849b50/vscode/src/studyModel.js#L70)
and [studyScheduler.js:8](https://github.com/flengyel/MRW/blob/6c7f227a3aec9861f0dc2112b83c77aa0e849b50/vscode/src/studyScheduler.js#L8).

Complete two reviews, retire the question, and correct its current outcome.
Replay first clears the review array/card, then the observation function rejects
every entry because the question is retired. Reproduction: two reviews become
zero, with `card: null`. Immutable events remain.

Separate reconstruction of past scheduling evidence from eligibility for new
review. Retirement should suspend selection while preserving the corrected
history. Check reload and re-enrollment without adding a duplicate review.

### R7 — P2: outcome correction leaves an obsolete adaptation actionable

Location: [activeStudy.js:169](https://github.com/flengyel/MRW/blob/6c7f227a3aec9861f0dc2112b83c77aa0e849b50/vscode/src/activeStudy.js#L169)
and [adaptation handling:188](https://github.com/flengyel/MRW/blob/6c7f227a3aec9861f0dc2112b83c77aa0e849b50/vscode/src/activeStudy.js#L188).

Two reader-confirmed successes and effort 4 produce a less-guidance offer.
Correct the latest outcome to unresolved. The stored offer remains, although
recomputation from the corrected evidence returns null.

Withdraw or recompute offers whose supporting evidence changes. Preserve the
original offer and its withdrawal/supersession as events, retain the rating's
attempt identity, and reject delayed choices referring to the old offer.

### R8 — P2: effort responses disappear across release/session boundaries

Location: [studyHistory.js:87](https://github.com/flengyel/MRW/blob/6c7f227a3aec9861f0dc2112b83c77aa0e849b50/vscode/src/studyHistory.js#L87)
and [effort pairing:92](https://github.com/flengyel/MRW/blob/6c7f227a3aec9861f0dc2112b83c77aa0e849b50/vscode/src/studyHistory.js#L92).

Offer an effort item in 0.19, then resume and answer 7 under another version.
The report shows zero of one answered and one nonresponse in the old version,
and zero of zero in the new one. Selecting only the resumed session likewise
loses the answer from effort statistics despite supporting linked context.

Resolve offer/response/attempt links before grouping or filtering, retaining
response date/version separately. Compute answered, declined, unreturned and
not-sampled states from that record without counting supporting context as a
new selected-session action.

### R9 — P2: reply association silently assumes the latest request

Location: [studyHelp.js:21](https://github.com/flengyel/MRW/blob/6c7f227a3aec9861f0dc2112b83c77aa0e849b50/vscode/src/studyHelp.js#L21).

Copy requests R1 and R2 for the same attempt, then paste the response to R1.
The response receives R2's request ID and adaptation association. Recency does
not establish that correspondence.

Display the request being associated and allow selection when ambiguous, or
retain a reply without a claimed association. Preserve the ordinary one-request
path without repeated mandatory forms. Keep reassociations attributed and do
not infer effectiveness from a request, paste or retained explanation.

## Evidence and limits

The following existing suite passed here: **23 tests**, zero failures.

```sh
cd vscode
node --test test/study-measurement.test.js test/study-feedback.test.js test/active-study-view.test.js
```

R1/R2/R5/R9 used the fetched controller and recorder with real temporary
checkpoint files and disposable API doubles. R3 injected a partial write into
the recorder's I/O boundary. R6/R7/R8 executed the current model/report functions
with synthetic events; R4 executed the fetched source-selection callback.
All nine cases were rerun by the reviewing coordinator. No production source
was edited during review.

The initial sparse snapshot lacked vendored renderer files; after retrieving
the exact committed files the 23 tests passed. Those initial ENOENT failures
were review-environment omissions, not repository defects.

This review did not run the full Node/Python suites, rebuild or install the VSIX,
operate the native VS Code window, or establish a learning outcome. The separate
0.19 delivery report states its broader checks and native-launch limitation.
The repository remains private; the rights/disclosure questions in
[PUBLIC_READINESS](../PUBLIC_READINESS.md) are unchanged by this code review.

## Next action

Implement [CODEX_STUDY_RELIABILITY_PROMPT](CODEX_STUDY_RELIABILITY_PROMPT.md).
Preserve the implemented study interaction while repairing the nine identified
cases with focused tests. Keep the next increment tied to reliable ongoing
mathematical work.
