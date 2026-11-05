# Learning, expertise, and cognitive-load evidence for MRW

Reviewed 2026-11-05. This report informs the proposed [active study design](ACTIVE_STUDY_DESIGN.md). It does not report a learning experiment in MRW. Three parallel reviews covered learning, cognitive load/expertise, and CHREST; a fourth reviewed instrumentation.

## Findings that change the design

Frequent attempts and spaced returns are worth testing as part of ordinary mathematical study. The evidence does not identify a universally optimal schedule or establish that an adaptive system improves advanced proof learning. In particular, mathematics-specific evidence is less conclusive than the broader testing literature. Preserve this distinction in product claims.

| Evidence | Finding and boundary | MRW decision |
| --- | --- | --- |
| Yang et al. (2021), [Testing (quizzing) boosts classroom learning](https://doi.org/10.1037/bul0000309) | Across 222 studies and 48,478 students, testing had a moderate mean benefit. Effects varied with comparison condition, tasks, repetition and feedback. | Include an attempt before revealing an answer. Record the attempt and assistance, not merely a completed-quiz count. |
| Murray, Horner and Göbel (2025), [Mathematics spacing and retrieval meta-analysis](https://doi.org/10.1007/s10648-025-10035-1), [institutional record](https://eprints.whiterose.ac.uk/id/eprint/229807/) | Spacing: 27 studies, g = 0.28. Testing versus restudy: seven studies, g = 0.18, with a confidence interval crossing zero. The latter evidence is inconclusive, not evidence that retrieval never helps mathematics. | Treat improved advanced mathematical learning as a hypothesis. Evaluate delayed attempts and burden in addition to immediate task completion. |
| Rohrer and Taylor (2006), [Distributed mathematical practice](https://doi.org/10.1002/acp.1266), [institutional record](https://digitalcommons.usf.edu/psy_facpub/1770/) | Distributed practice improved four-week retention in a bounded mathematical task; extra same-session practice did not. | Prefer returning across sessions to repeated immediate drilling. No particular interval ladder follows from this experiment. |
| Rohrer et al. (2020), [A randomized controlled trial of interleaved mathematics practice](https://doi.org/10.1037/edu0000367) | A preregistered trial in 54 seventh-grade classes found better delayed performance with interleaving. | Later mix relevant methods and examples within a subject. Do not infer that arbitrary switching among unrelated projects helps. |
| Pan and Rickard (2018), [Transfer of test-enhanced learning](https://doi.org/10.1037/bul0000151), [author paper](https://rickardlab.ucsd.edu/pdf/PR_2018.pdf) | Transfer benefits varied with response relationships, elaborated retrieval and initial performance. | Keep definition recall, argument reconstruction and application to a changed example distinguishable. |
| Wisniewski, Zierer and Hattie (2020), [The power of feedback revisited](https://doi.org/10.3389/fpsyg.2019.03087) | Feedback effects varied substantially with its information content and the task. AI feedback reliability was not studied. | Prefer a specific discrepancy, useful next step or source comparison to a generic score. Record feedback provenance and subsequent corrections. |

## Expertise and cognitive-load tracking

Track reported mental effort, observed actions and task outcomes separately. A response time, number of clicks or failure count is not a direct measurement of cognitive load. High effort with successful reasoning may represent productive work.

| Evidence | Finding and boundary | MRW decision |
| --- | --- | --- |
| Paas (1992), [Training strategies for attaining transfer of problem-solving skill in statistics](https://doi.org/10.1037/0022-0663.84.4.429) | Worked and completion examples supported transfer in the studied tasks. Not all predicted differences in time and effort occurred. | Offer a worked or partially completed step when appropriate; do not infer learning from speed alone. |
| Kalyuga, Chandler and Sweller (1998), [Levels of expertise and instructional design](https://doi.org/10.1518/001872098779480587) | Instruction useful to less experienced learners became redundant as expertise increased. | Adapt support to the present material, keeping explanations available without imposing them on fluent performance. |
| Renkl et al. (2002), [From example study to problem solving](https://doi.org/10.1080/00220970209599510) | Gradually removing worked steps supported learning, particularly near transfer, in the studied tasks. | Trial a worked argument followed by a missing step. The graph is an optional presentation, not a required learning artifact. |
| Schuessler, Fischer and Walpuski (2025; online 2024), [Construct validity of single-item cognitive-load ratings](https://doi.org/10.1007/s11251-024-09692-6) | Mental effort and perceived difficulty differ; delayed ratings can overrepresent demanding items. | Attach a sparse effort rating to a specified recent attempt. Preserve scale, wording and sampling point. Missing ratings remain unknown. |
| Krieglstein et al. (2022), [Reliability and validity of cognitive-load questionnaires](https://doi.org/10.1007/s10648-022-09683-4) | Four multi-item questionnaires showed satisfactory internal consistency, with mixed relationships among the proposed load categories. This does not validate MRW's single-item rating. | A single rating must not be presented as a decomposition of intrinsic, extraneous and germane load. |
| de Jong (2010), [Cognitive load theory: some food for thought](https://doi.org/10.1007/s11251-009-9110-0) | Reviews conceptual and measurement limitations, including relations among effort, performance and duration. | Display observations and their uncertainty; do not show a percentage of working memory used. |

The proposed nine-point mental-effort item follows the single-item tradition, but its exact wording, sparse sampling and adaptation rules in MRW are design choices requiring evaluation. A score is not a clinical or physiological measurement. Omit no-response events from averages and show their count.

## CHREST: relevant model, separate experiment

CHREST means Chunk Hierarchy and REtrieval STructures. Its learned chunks/templates, constrained short-term memory, attention and timed processes make it relevant to expertise and presentation.

- Gobet and Simon (2000), [Five seconds or sixty? Presentation time in expert memory](https://doi.org/10.1207/s15516709cog2404_4), model aspects of chess recall across skill and presentation conditions. A displayed mathematical sentence or graph vertex is not one fixed cognitive chunk.
- Lane, Cheng and Gobet (2001), [Learning perceptual chunks for problem decomposition](https://bura.brunel.ac.uk/handle/2438/2123), trained CHREST+ on circuit-diagram sequences and compared predicted decompositions with participants' behavior. The encoding and training sequence were part of the experiment.
- Gobet (2005), [Chunking models of expertise: implications for education](https://doi.org/10.1002/acp.1110), draws instructional implications from chunking models. These implications are not a trial of an MRW-like tool.
- Gobet and Lane (2010), [The CHREST architecture of cognition](https://doi.org/10.2991/agi.2010.20), [institutional record](https://uhra.herts.ac.uk/id/eprint/13741/), describe perception, learning, memory and decisions under capacity/time constraints.

Decision: use these ideas to offer manageable argument segments, accessible prerequisites and less redundant guidance. Do not embed CHREST as a prerequisite for this release or label its output measured cognitive load.

An optional later offline experiment can compare two presentations of the same proof fragment. It needs a task encoding, an explicit prior-knowledge/training approximation, predictions specified in advance, and comparison with observations and a simpler baseline. Call its output simulated demand under stated assumptions.

The [CHREST software page](https://chrest.info/software.html) describes a Java/JVM implementation and task-specific models. The inspected [implementation lineage](https://github.com/mlk5060/chrest) mentions Buildr/JRuby and separate license terms for project code and JFreeChart. Current packaging, compatibility and suitability for embedding were not tested.

## Memory scheduling and workload

[Anki's FSRS documentation](https://docs.ankiweb.net/manual/deck-options#fsrs) describes fitting review history and the tradeoff between desired retention and workload. [SuperMemo's model description](https://super-memory.org/archive/help/smalg.htm) distinguishes stability and retrievability. These models predict recall under their assumptions, not mathematical understanding.

Use an existing scheduler for stable questions. Keep its recall state separate from mental effort and mathematical assessment. A time limit alone can conceal an increasing queue: limit admission, allow retirement and scope eligibility to current material. Do not record a skip, a changed source or an interrupted session as a failed recall.

## Microsoft interface guidance

Use [native views](https://code.visualstudio.com/api/ux-guidelines/views) for study/source data rather than command buttons disguised as tree rows. Keep [editor actions](https://code.visualstudio.com/api/ux-guidelines/editor-actions) and [context menus](https://code.visualstudio.com/api/ux-guidelines/context-menus) pertinent to the selected material. Use [webviews](https://code.visualstudio.com/api/ux-guidelines/webviews) for typeset mathematics and diagrams where necessary, with theme and keyboard support. Keep [progress and notifications](https://code.visualstudio.com/api/ux-guidelines/notifications) within context.

These conventions guide placement and interaction. They do not by themselves establish learning benefit.

## Observations for immediate adaptation and later versions

The user explicitly requests detailed tracking of what works and what does not. Record relevant MRW actions and results with software/policy versions, including navigation and failures, alongside sparse self-reports. Retain evidence for both successful and unsuccessful interventions.

Immediate decisions should use the current task, explicit outcomes and preferences. Later review should examine delayed retrieval, assistance burden, source-navigation effort, interruptions, errors and resumption. Compare comparable tasks and expose missing observations. A newer version receiving easier tasks cannot be credited with improved learning merely from its aggregate success rate.

Start with descriptive evidence and replayable policy decisions. Randomized comparisons, a trained load estimator and CHREST simulations are separate experiments, not conditions for delivering the first usable increment.
