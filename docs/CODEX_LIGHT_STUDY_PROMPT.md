# Codex continuation: study the open material and track what works

Implement the next usable MRW increment described in `docs/ACTIVE_STUDY_DESIGN.md`, using `docs/LEARNING_RESEARCH.md` for evidence and limitations. The product goal is easier mathematical study with frequent attempts, useful feedback, light rescheduling and continuity. Complete implementation, focused checks, packaging and the normal authorized delivery; do not stop with a plan or another documentation-only pass.

## Establish the current state

Work in the existing VS Code WSL2 repository. Inspect status and current HEAD first; preserve unrelated work and concurrent changes. The reviewed baseline is MRW 0.17.0 at `db656402190c255afd6a296da6ef8e549cc0b293`, followed by this design update. It already has proof-study preparation, combined Codex handoff, outline import, in-view summary corrections, saved-question resumption, the loading repair, candidate-generation cleanup and draft preservation. Inspect current code before repeating any of those tasks.

Read the active sections of AGENTS.md, VISION.md, UX_SPEC.md, CODEX_PLAN.md and the two new design/research documents. Earlier release narratives describe their own dates. This task supersedes earlier product-priority statements that restrict the next work to graph authoring or passive observation.

## Deliver one coherent interaction

Work in delivery order: complete the current-material attempt/effort/history/resumption path on existing surfaces, connect light scheduling, then consolidate native discovery and the compact export. Continue through the usable increment rather than stopping after the recorder. Limit the new content view to current/recent studies and their source-linked questions; do not build a full explorer or analytics UI.

1. Make Study current material / Resume discoverable using Microsoft's VS Code UX guidance. Replace the Research Tools command-button tree with native study/source/question content, retaining existing command IDs in suitable menus. Preserve layout preferences, keyboard access, theme support, documents and drafts. Reuse the current reader/study surfaces.
2. Scope the session to the selected supported reader passage, cited proof claim, captured ordinary text selection or resumed study. Keep that context when focus moves to an answer or Codex. A deliberate source change preserves unfinished work. Opening material updates eligibility and records navigation; it never counts as recall or starts a provider call.
3. Support a small number of questions about definitions/hypotheses, a missing step or an application. Use the existing explicit Codex handoff for proposed questions, hints and explanations, with editable source-linked saved questions available offline. Do not require every response to be proof-graph JSON. Keep existing graph use optional and existing studies compatible.
4. Reuse a maintained FSRS implementation if packaging permits, with a versioned adapter and default parameters. Keep original observations and document their rating mapping. Stable question/source revisions matter; do not transfer learning history to a changed question silently. Select due questions from current material and explicitly selected prerequisites, subject to a short block and limited admission. Initial adjustable defaults are three questions or about five minutes, at most one new question, stopping at an attempt boundary. These defaults are prototype choices. Avoid a global overdue queue or forced catch-up.
5. Distinguish unaided success, help-dependent completion, unresolved work and skipping, including who assessed the outcome and whether the answer was visible. Never count opening, rereading, interruption or missing assessment as a failed or successful retrieval.
6. Track cognitive load through a sparse, optional, task-linked 1–9 mental-effort report plus separately recorded task outcomes and assistance. Ask about the specified recent attempt; record missingness. High effort plus repeated difficulty can offer a smaller step, prerequisite, worked example or pause. High effort plus success must not automatically trigger simplification. Do not invent a cognitive-capacity percentage or global expertise score.

## Instrument both the existing workflow and the new behavior

For question entry, use a small editable record: stable ID/revision, activity kind, prompt, attributed reference answer (or unavailable), optional hints and exact source references. Support manual entry and one strict bounded Codex clipboard object (at most ten questions), reusing existing source binding. Keep older study files readable. Do not build a general response parser. At each answer submission, preserve its exact snapshot and event order; later edits or post-answer reveals must not rewrite the evidence for the earlier attempt.

The user explicitly requests as much useful tracking as possible to inform current responses and future releases.

Use one local recorder for meaningful MRW actions: source changes, question/attempt lifecycle, hints and answer visibility, graph/source navigation, effort-rating offers and their dispositions, corrections, adaptation offers and overrides, review admission/deferral/retirement, saves/imports, cancellations, errors, latency and resumption. Distinguish a missing response from not sampling effort. Include versioned event/session IDs, exact task/source/question identity, event origin, MRW commit/version, policy version and scheduler/parameter identifier.

Distinguish observed actions, reader reports, AI assessments, external checks and derived estimates. Keep corrections linked to earlier events and decision reasons linked to their evidence. Preserve submitted work by immutable record reference where possible, otherwise by one immutable snapshot. Do not capture unrelated applications or every keystroke. Do not equate elapsed time or tab switching with cognitive load.

Batch persistence outside the UI path. Keep personal histories outside Git/VSIX and export them only by explicit action. A logging failure must preserve drafts and reading, expose a gap, and avoid blocking the session.

Deliver an inspectable current-study history and a concise local comparison/export across selected sessions and software versions. Include delayed unaided outcomes, assistance, effort, navigation burden, errors, interruptions, resumption and review workload, with denominators and missing data. Label release comparisons descriptive; differing tasks and prior exposure prevent causal conclusions from raw averages. No analytics server or dashboard is needed.

The first instrumented release establishes the usage baseline. Do not fabricate earlier 0.17.0 events or mix tests with real study. Recorded source visibility is exposure opportunity, not evidence that it was read. New application tasks remain distinct from recall of existing answers.

## Research boundaries and verification

CHREST informs hypotheses about learned chunks, task presentation and expertise. It is not a runtime dependency or a validated individual load meter. Do not build a simulator, curriculum engine, corpus scanner, new provider adapter or new frontend for this increment.

Use focused meaningful regressions for context/draft preservation, revision isolation, scheduler outcomes/budgets, missing effort, adaptation decisions, event versioning/corrections, persistence and recorder failures. Run the affected broader checks once after changes stabilize. Exercise the native host when available; otherwise distinguish command/browser checks from native results without stalling delivery on a user ceremony.

Update the bundled tutorial and current workflow/capability documents to match what was delivered. State what remains incomplete. Show one saved session history and a readable summary without mixing fixtures into user observations. Report which interaction steps disappeared and which remain awkward; test counts are not learning evidence.

Do not change repository visibility. A possible public experimental release is a separate user decision. Preserve existing sources, annotations, private study files and the current WSL arrangement.
