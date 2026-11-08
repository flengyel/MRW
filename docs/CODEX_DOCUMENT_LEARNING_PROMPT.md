Implement one complete MRW learning workflow:

**Markdown document → Contents section → associated problem → attempt or review solution → return to the originating section.**

Connect this workflow to existing light spaced repetition. Deliver it before the larger general research-resumption increment.

## Establish the baseline

GPTWork reviewed origin/main at `2503d0e`, version 0.22.7. Inspect the local checkout, concurrent changes, current continuation and installed/runtime versions first. Incorporate newer work rather than repeating completed repairs.

Preserve:

- The title-aware document chooser, filename/path disambiguation, Browse route and cancellation behavior.
- Persistent native Commands buttons, hover descriptions and existing command IDs. Contents and Studies remain navigation and saved-work views.
- Document / Contents / Saved source / Passage terminology.
- `flengyel.mrw`, qualified source identifiers, exact retained revisions, notes, annotations, drafts and study history.
- Existing Obsidian/Zettel links, SagePod and Lean workflows.

Keep both sidebars, editor groups and view placement under VS Code’s control. Do not repeat identity migrations, restore archived studies, relocate work, or force a working-window reload.

## Connect the current document to problems

An outline is ordinary Markdown organized by headings; do not introduce another “Outline” object or format.

From the selected Contents section or document context, provide a clear way to find, associate or enter a problem. Reuse existing study/question records and navigation machinery.

Capture the invoking document URI, section or link occurrence, and return location explicitly. Markdown previews may have no `activeTextEditor`. Never silently substitute an unrelated previously opened retained source.

Keep the document association distinct from exact retained-source references. An incidental document edit must not make associated problems disappear. Preserve revision identity and handle changed or missing locations visibly.

Show the current document, problem and named return destination. Returning should reach the originating occurrence and preserve ongoing work.

## Make solution review independent

Offer **Attempt** and **Review solution** together.

Review solution must work without creating an attempt, submitting work or assigning an outcome. Reuse the existing attributed reference-answer representation where suitable. If no solution exists, say so and provide an explicit way to attach or enter one.

Distinguish the problem statement, attributed solution, reader’s work and unresolved step. Preserve original source or model text separately from corrections and commentary. Reviewing a solution does not establish that it is correct.

Support saving a question about a difficult step and using the existing Codex handoff when requested. AI, Obsidian, Lean and Sage must not be prerequisites for this basic workflow.

Record solution exposure separately from recall evidence. If a solution is opened during an existing attempt, preserve its draft and record consultation so the attempt cannot silently become “unaided.” Later independent recall must remain possible.

Pause and reopen must recover the problem, work, review context and return destination without rebuilding the study.

## Surface existing light spaced repetition

Reuse the existing FSRS adapter, question revisions, explicit admission, short-block limits and recorder. Do not introduce another scheduler.

Offer a small, dismissible set of due questions relevant to the current document’s explicitly associated material. Reading remains available without completing reviews. Preserve adjustable limits, skipping, pausing and retirement.

Clarify the distinction between:

- Keeping an eligible recall question for spaced review.
- Keeping or explicitly scheduling a whole problem for later work.

General application problems, solution viewing, skipped work and ordinary rereading must not produce fabricated recall grades. Preserve existing correction/replay behavior.

Retain optional effort reporting and existing adaptation. Extend the single local recorder only where needed to distinguish this workflow’s actions and outcomes; do not infer cognitive load from dwell time or add another questionnaire.

## Verify the complete path

Use a small ordinary Markdown example with a problem and attributed solution. Demonstrate both attempt and direct-review routes.

Cover these consequential cases:

- Launch from a Markdown preview with no active text editor after visiting an unrelated retained source.
- Review a solution without creating an attempt or changing FSRS state.
- Consult a solution during an attempt while preserving the draft and consultation evidence.
- Save, reopen and return to the originating section, including changed or missing locations.
- Surface relevant due questions without admitting unrelated material or requiring review.
- Preserve persistent buttons, hover/focus help, pane visibility and existing note links.

Run appropriate regression and package checks. Use one focused native workflow check to cover the relevant remaining orientation acceptance cases. Separate automated checks, actual host observations and anything unobserved; do not turn validation into a mandatory user study session.

## Update the design and deliver

Reconcile the governing next-increment statements in `CODEX_PLAN.md`, `UX_SPEC.md`, the research-workstation design and `docs/CODEX_CONTINUATION.md`. Put this learning workflow before general research resumption while preserving the broader research goals.

Update the workflow documentation, README where affected, and bundled tutorial with the actual entry points and one short example. Consolidate current status instead of prepending another competing “current” section; preserve historical validation evidence.

Keep implementation additions compatible with existing saved work. Avoid a new dashboard, project-management model or integration expansion.

Commit and push the completed increment to main while preserving concurrent work. Build, verify and install through the established process without forcing reload. Report the commit, version, checks, observation limits and exact steps for starting the new workflow.
