# Codex task: complete the study feedback loop and prepare MRW for public inspection

## Goal and baseline

Make one mathematical study session useful from source selection through an
attempt, help, feedback and resumption. Make the recorded evidence reliable
enough to guide the current interaction and compare later releases. Prepare the
repository for public inspection as part of the same delivery.

Reviewed baseline: `098f2579e26e224b124369f9ffc4192199f2c722`, MRW 0.18.0.
Fetch origin, inspect the working tree and any ongoing Codex work, and reconcile
newer changes without discarding them. Do not repeat an already delivered fix.
Read AGENTS.md, the active CODEX_PLAN.md section, ACTIVE_STUDY_DESIGN.md,
ACTIVE_STUDY_WORKFLOW.md and ACTIVE_STUDY_VALIDATION.md. Shared source,
attribution and persistence requirements remain in force.

Implementation is the assignment. Continue through repairs, usable interaction,
appropriate checks, packaging and committed delivery; do not stop at a plan or
another research report. Use parallel agents for independent measurement review,
study UI work, and publication documentation/exposure review. Assign file
ownership before concurrent edits; integrate the measurement and UI changes
before final checks.

## 1. Repair evidence used for adaptation and release comparisons

The following findings are grounded in the reviewed source. Isolated function
checks reproduced the cross-release summary and AI-assessment defects; these
were not native VS Code observations. Confirm against the current checkout and
write focused regressions for defects that remain.

- **Resolve attempts before comparing releases.** In `studyHistory.js`,
  `summarize()` groups events by version before resolving corrections.
  An attempt submitted and reported successful in 0.18, then corrected to
  unresolved in a later release, remains a success in the old group and becomes
  an assessed attempt with zero submissions in the new group. Construct an
  attempt/submission projection with linked corrections before grouping.
  Attribute performance to the version in which that attempt occurred; retain
  when and under which version it was assessed/corrected separately. Deduplicate
  IDs and distinguish attempts, submission revisions and assessments in
  denominators. Keep immutable events and fixture origins intact.
- **Keep selected exports coherent.** `activeStudy.js` currently selects
  sessions before summarizing. Include the linked context required to interpret
  selected attempts, labeling supporting events from outside the selection;
  never silently count a correction as a new attempt. If required context is
  unavailable, report it as missing and exclude unsupported derived values.
  Selection must not silently export unrelated sessions or studies.
- **Preserve the experienced delay.** `studyModel.outcome()` calculates
  `delayed_days` from the current clock and the last scheduler review.
  On correction, the last review can be the attempt being corrected. Bind
  timing to the original attempt/submission and its preceding eligible review,
  not the assessment/correction time. Test delayed assessment, later correction,
  multiple submissions, and a correction replay after restart. If older records
  lack sufficient timestamps, show unknown; do not invent a delay or fabricate
  replacement history.
- **Separate assessment evidence in adaptations.** `studyModel.adaptation()`
  accepts outcomes without checking assessor, consultation or activity.
  Two AI `unaided_success` reports with unknown consultation currently produce
  “Repeated reported unaided success” and less-guidance suggestions. Require
  appropriate reader-confirmed evidence for that inference. Keep application
  performance, recall, AI proposals and unknown assistance distinct. Link effort
  to its particular attempt; do not use a rating for a different task.
- **Name observations accurately.** Selecting an adaptation or copying a
  help prompt establishes selection/request, not received help, use or benefit.
  Replace the report's ambiguous “Adaptation accepted” count with the events
  actually observed. No causal learning claim follows from a version change.

Reuse a small shared projection where it prevents the scheduler, adaptation and
report from interpreting the same event differently. Do not introduce a general
analytics framework or rewrite the scheduler.

## 2. Retain help beside the attempt

0.18 can copy a help request to Codex but cannot retain the ordinary-prose reply
in the current study. Complete that path using the existing clipboard companion:

1. Copy an exact request linked to the selected source, question and attempt.
   Record the outgoing snapshot/reference. In `questionHandoff()`, stop
   labeling `current.draft` as “Submitted work.” Distinguish the unsent/current
   draft from the latest immutable submission and identify which was included.
2. Provide an explicit action to paste, review and retain the returned
   explanation or hint in the same study. Ordinary mathematical prose and
   equations must work without graph or question JSON.
3. Preserve the pasted original and separately attributed edits using existing
   snapshot/checkpoint mechanisms. Default attribution to an AI proposal from
   the companion, allow accurate author correction, and record the association
   with source revisions, the request and attempt. This associates a manually
   pasted reply; it does not authenticate its origin or mathematical correctness.
4. Display retained help beside the work and restore it after pause/reopen.
   Preserve the response draft if saving fails. Keep successive responses
   identifiable rather than overwriting the earlier explanation.
5. Record request, response retained, and display/reveal opportunity separately.
   Help displayed during the current attempt before submission, including its
   immediate assisted revision, must prevent that submission from being treated
   as unaided recall. Help received afterward must not change the earlier
   submission's exposure. Prior study/help must not permanently disqualify later
   independently attempted spaced recall; preserve its exposure history and
   timing separately. Preserve uncertainty about help consulted externally;
   copying a request alone proves no consultation.
6. Allow continuation with revised work through the existing submission/attempt
   lifecycle. Keep earlier submitted work immutable. An already completed
   attempt is followed by an explicitly linked new attempt, not reopened by
   silently replacing its outcome.

Existing adaptation choices for a smaller step, prerequisite, worked example or
clarification should use this same path. Link a returned response and subsequent
attempt to the originating choice when available. Do not add a mandatory
“was this helpful?” questionnaire or infer success from retaining a reply.

No new provider integration, automatic requests, clipboard monitoring or
background question generation is part of this task. Manual question entry and
offline use remain available.

## 3. Make the first session understandable

Use the existing Studies view and study editor. Apply Microsoft's
[Views](https://code.visualstudio.com/api/ux-guidelines/views),
[Webviews](https://code.visualstudio.com/api/ux-guidelines/webviews) and
[Editor actions](https://code.visualstudio.com/api/ux-guidelines/editor-actions)
guidance: native content/navigation, contextual actions, restrained toolbar
actions, keyboard operation, themes and accessible labels.

- In an empty study, show the selected source and a clear choice to enter a
  question or request a small set through the existing Codex handoff. Do not
  offer “Begin short block” when there are no eligible questions. Show unfinished
  work directly on Resume. Keep question banks, attribution details and history
  available without making them the starting form.
- Before an attempt starts, source preview supports orientation. When starting
  recall, conceal the answer/source within the study and make the transition
  clear. Preserve prior study exposure separately from assistance during the
  attempt; concealment alone does not establish unaided recall, and earlier
  study does not permanently disqualify later recall. Do not hide unrelated
  editors or rearrange the workspace.
- Preserve pending outcome and consultation selections by attempt ID.
  `activeStudyView.js` currently creates a new report object on every render,
  so revealing an answer or another host update can discard unrecorded choices.
  Keep them through rerenders and pause/resume; do not submit them automatically.
- Correct the instruction in `studyModel.begin()` that suggests Submit or
  Pause alone permits switching questions. Those actions leave the attempt
  unfinished. Make the available actions match the state without weakening
  preservation of unfinished work.
- Keep effort sampling sparse, optional and tied to the preceding attempt.
  Preserve short source-scoped review, limited admission, explicit review
  enrollment and existing graph/reader workflows. Avoid extra setup forms.

Provide one small, attributed offline example with ordinary Markdown/source and
one to three questions to demonstrate this path. Reuse suitable licensed/public fixture
material or write an original elementary example. Loading it must be explicit,
must preserve existing work and must mark its practice/demo history separately
from research use. It is an example, not a compulsory corpus or study ceremony.
Use existing retention/study mechanisms; do not build a general example loader
or import framework.

## 4. Prepare public-facing documentation and inspect exposure

Complete this in parallel with the study work; do not let it replace the
implementation.

- Rewrite the root README around purpose, experimental status, supported host,
  installation, one short study example, data behavior, known limitations and
  focused contribution requests. Aim for roughly 150–200 lines; move release
  history into a linked changelog and preserve material links.
- Remove contradictory current instructions such as installing 0.14.4 when
  delivering a later version. Update INSTALLATION.md, the extension README,
  the bundled tutorial and source-build instructions together. Separate earlier
  Qt/CLI material from the first VS Code session. Verify the documented build
  and package path from a clean checkout/profile where available.
- Explain what history is recorded, where it lives, explicit exports, companion
  clipboard transfers, and which state does not yet migrate with source stores.
  Keep this concise and accurate to the delivered implementation.
- Review tracked content and reachable Git history, including available
  branches/tags, logs, screenshots, fixtures and available Actions artifacts,
  for secrets, unintended private material and third-party attribution.
  Report exact reviewed scope and inaccessible surfaces. Redact credential
  values in findings; do not paste them into committed reports. Existing
  Apache-2.0 and dependency notices are starting points, not evidence that every
  included source has been reviewed.
- Preserve candid development history. Embarrassing mistakes, failed experiments
  and rough interface versions are not reasons to erase commits.
- Prepare a compact PUBLIC_READINESS.md stating findings, remaining blockers and
  proposed release contents. Fix ordinary documentation and attribution issues.
  Do not rewrite Git history, rotate credentials, change repository visibility,
  publish a release/Marketplace package, or contact testers under this task.
  A discovered exposure needs a concrete remediation proposal before those
  consequential actions.

## Delivery and checks

Implement the evidence repairs first, then complete the help/attempt interaction
and first-use path. Run focused regressions, affected integration checks and
existing required package checks; broaden only when changed dependencies or
failures justify it. Do not add tests for prose edits.

Exercise one disposable session through source, question, draft, submission,
retained help, continuation, outcome, pause/reopen and readable history. Exercise
the cross-release correction and AI-assessment exclusions separately. Preserve
all genuine sources, annotations, graphs, studies and histories. Fixture
interactions must remain labeled as fixtures, never human learning observations.

Use an isolated native VS Code host if available. If launch again fails before
the runner, record the concrete failure and deliver the checked implementation
with that limitation. Do not spend another open-ended session on launch
diagnostics, substitute browser checks for native evidence, commandeer the
working window, or block the implementation on human acceptance.

Build and verify the next appropriate VSIX version. Install in the established
WSL extension host using the existing delivery practice if compatible with
preserving the open session; do not reload the working window or reset its data.
Update implementation status in CODEX_PLAN.md, README, relevant UX/workflow
documents and CODEX_CONTINUATION.md. Commit and push completed work to main
without discarding unrelated changes.

Finish with the commit, package identity, what works, checks actually run,
remaining limitations, publication findings, and one concrete first action in
MRW. Keep the repository private until publication is separately requested.
