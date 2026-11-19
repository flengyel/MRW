# Mathematical practice, spaced review and evidence of learning

Source study can begin with an argument the reader has reason to understand or
use. The reader can look up a definition, inspect a cited result, attempt an inference,
compare it with the proof, and return later to reconstruct or apply it.
[Source study](ACTIVE_STUDY_WORKFLOW.md) implements attempts and scheduled recall.
Whether this helps a mathematician understand a research paper remains open.

## Findings that change the design

Frequent attempts and spaced returns are worth testing as part of ordinary mathematical study. The evidence does not identify a universally optimal schedule or establish that an adaptive system improves advanced proof learning. In particular, mathematics-specific evidence is less conclusive than the broader testing literature. Preserve this distinction in product claims.

| Evidence | Finding and boundary | MRW decision |
| --- | --- | --- |
| Yang et al. (2021), [Testing (quizzing) boosts classroom learning](https://doi.org/10.1037/bul0000309) | Across 222 studies and 48,478 students, testing had a moderate mean benefit. Effects varied with comparison condition, tasks, repetition and feedback. | Offer an independent attempt first. A reader who needs help may reveal it. Record exposure at submission and preserve the subsequent correction. |
| Murray, Horner and Göbel (2025), [Mathematics spacing and retrieval meta-analysis](https://doi.org/10.1007/s10648-025-10035-1), [institutional record](https://eprints.whiterose.ac.uk/id/eprint/229807/) | Spacing: 27 studies, g = 0.28. Testing versus restudy: seven studies, g = 0.18, with a confidence interval crossing zero. The latter evidence is inconclusive, not evidence that retrieval never helps mathematics. | Treat improved advanced mathematical learning as a hypothesis. Evaluate delayed attempts and burden in addition to immediate task completion. |
| Rohrer and Taylor (2006), [Distributed mathematical practice](https://doi.org/10.1002/acp.1266), [institutional record](https://digitalcommons.usf.edu/psy_facpub/1770/) | Distributed practice improved four-week retention in a bounded mathematical task; extra same-session practice did not. | Prefer returning across sessions to repeated immediate drilling. No particular interval ladder follows from this experiment. |
| Rohrer et al. (2020), [A randomized controlled trial of interleaved mathematics practice](https://doi.org/10.1037/edu0000367) | A preregistered trial in 54 seventh-grade classes found better delayed performance with interleaving. | Later mix relevant methods and examples within a subject. Do not infer that arbitrary switching among unrelated projects helps. |
| Pan and Rickard (2018), [Transfer of test-enhanced learning](https://doi.org/10.1037/bul0000151), [author paper](https://rickardlab.ucsd.edu/pdf/PR_2018.pdf) | Transfer benefits varied with response relationships, elaborated retrieval and initial performance. | Keep definition recall, argument reconstruction and application to a changed example distinguishable. |
| Wisniewski, Zierer and Hattie (2020), [The power of feedback revisited](https://doi.org/10.3389/fpsyg.2019.03087) | Feedback effects varied substantially with its information content and the task. AI feedback reliability was not studied. | Prefer a specific discrepancy, useful next step or source comparison to a generic score. Record feedback provenance and subsequent corrections. |

## Expertise and reading proofs

For a reader who cannot justify an implication, the question is which hypothesis
licenses the inference. The reader can compare an answer with the passage and
try the step again later. Ericsson, Krampe and Tesch-Römer studied expert musicians.
A later violinist study found that cumulative practice time failed to distinguish
the two more accomplished groups. Counts of hours or repetitions cannot grade
an individual's mathematical expertise. [Ericsson et al. (1993)](https://doi.org/10.1037/0033-295X.100.3.363) · [Macnamara and Maitra (2019)](https://doi.org/10.1098/rsos.190327)

| Evidence | Consequence for MRW |
| --- | --- |
| Hodds, Alcock and Inglis improved undergraduate proof comprehension in three experiments by training readers to explain logical connections. [Study](https://doi.org/10.5951/jresematheduc.45.1.0062) | Ask which earlier fact licenses a chosen inference. Retain the reader's explanation and the source used to correct it. |
| In a survey of 118 research mathematicians, respondents reported looking for a proof's governing method and working through steps on examples. Their purposes varied between reading and refereeing. [Mejía-Ramos and Weber](https://doi.org/10.1007/s10649-013-9514-2) | Let ordinary reading start with the governing idea. When grounds matter, inspect the statement, its assumptions and its source. |
| A guided multimedia proof produced similar immediate comprehension but poorer delayed retention than the written proof in one undergraduate study. [Roy, Inglis and Alcock](https://doi.org/10.1007/s10649-017-9754-7) | Test whether readers can reconstruct a step after closing an outline. Preserve access to the original argument. |
| In a high-school mathematics experiment, access to a general GPT tutor improved assisted practice grades and reduced subsequent unaided exam performance. A tutor designed with teachers largely mitigated the loss. [Bastani et al.](https://doi.org/10.1073/pnas.2422633122) | Record what was attempted before help, what the help supplied and what the reader later did independently. Transfer to research mathematics requires testing. |

Spacing has direct support in mathematics. In engineering precalculus, spacing
quiz practice improved retention four weeks after the course, when increasing
practice quantity alone showed no detectable benefit. A preregistered study
of university students learning permutations found no robust spacing effect
at either one or five weeks. The pooled result above supports offering a return
to selected material. The best interval and activity for a research proof
remain open. [Lyle et al.](https://doi.org/10.1007/s10648-019-09489-x) ·
[Ebersbach and Barzagar Nazari](https://doi.org/10.3389/fpsyg.2020.00811)

## Professional mathematical work

The EMS asks authors to seek prior work, credit contributions, correct omissions
and describe the role of automated tools used to create content. Authors retain
responsibility for correctness. The IMU-endorsed Leiden Declaration calls for
precise references and independent scrutiny, including scrutiny of the relation
between a formal statement and the intended theorem. [EMS Code, authors §§1–3](https://euromathsoc.org/code-of-practice) · [Leiden Declaration](https://leidendeclaration.ai/)

A reader using an AI-generated proof should be able to recover the cited
passage, state which hypotheses license the inference, identify the source
of a proposed explanation and preserve a correction. For a paper paired with
Lean, compare the quantifiers, hypotheses and conclusion of the particular
declaration with the prose. If the declaration assumes more, retain its checking
result and mark the extra hypothesis as a gap in the correspondence. Authorship,
checking, correspondence and the reader's ability to reconstruct the proof
answer different questions.

## Evaluating MRW on a manuscript

In *Pointwise provable equality and the failure of composition*, the obstruction
theorem supplies four relations among programs. Cover its final calculation.
Which substitution in a putative quotient operation forces the classes of
$g$ and $z$ to coincide? Compare the answer with the paper. In Lean,
`no_quotient_composition` abstracts this deduction to any setoid and takes the
four relations as hypotheses. Locating the separate construction of the
arithmetic witnesses tests a different part of the proof.
[Manuscript calculation](https://github.com/flengyel/FailureOfComposition/blob/58579d2e0a94f8a3dee1435c6e0a1908f264f33a/manuscript/failure_of_composition_2026-11-14_v38.tex#L377-L388) · [Lean deduction](https://github.com/flengyel/FailureOfComposition/blob/58579d2e0a94f8a3dee1435c6e0a1908f264f33a/Lean/FailureOfComposition/QuotientObstruction.lean#L37-L53) · [Arithmetic witnesses](https://github.com/flengyel/FailureOfComposition/blob/58579d2e0a94f8a3dee1435c6e0a1908f264f33a/Lean/FailureOfComposition/ManuscriptObstruction.lean#L318-L332)

A familiar manuscript can establish that the workflow is usable. In a separate
study, the evaluator scores the mathematical work. To test a learning benefit,
select several pairs of unfamiliar arguments with comparable
length, prerequisites and difficulty. Record prior familiarity and fix the scoring
criteria before allocating one passage from each pair at random to MRW study
and the other to ordinary study with the same time budget. Give both conditions
the same delayed assessment, for example one week after the last study session.
That delay is an evaluation choice. To isolate scheduling itself, hold the
activities, total practice and delay to assessment constant and vary how practice
is distributed.

Score each written attempt for the governing idea, the validity of the
selected inference and the use of its hypotheses. Score transfer separately on
a previously unseen example or changed hypothesis. Conceal solutions during
assessment. Where feasible, strip condition labels before scoring. Report the
paired differences, time spent, assistance, missing attempts and burden. Record
a correction or null result as readily as an improvement. One reader's results
can guide that reader's workstation. Claims about other mathematicians require
independent readers and arguments. [Proof-comprehension assessment](https://doi.org/10.1007/s10649-011-9349-7) · [Existing study measures](ACTIVE_STUDY_DESIGN.md#version-to-version-evaluation)

Measure the other two aims directly. Give the reader a cited result and ask
which hypothesis licenses its use in this proof. Check the answer against the
cited passage. For continuity, leave a proof unfinished. On return, record the
time needed to find the last justified step and whether the reader identifies
the outstanding obligation correctly. Compare both tasks with ordinary study,
allowing access to sources in both conditions.

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

## Models of expertise

CHREST means Chunk Hierarchy and REtrieval STructures. Its learned chunks/templates, constrained short-term memory, attention and timed processes make it relevant to expertise and presentation.

- Gobet and Simon (2000), [Five seconds or sixty? Presentation time in expert memory](https://doi.org/10.1207/s15516709cog2404_4), model aspects of chess recall across skill and presentation conditions. A displayed mathematical sentence or graph vertex is not one fixed cognitive chunk.
- Lane, Cheng and Gobet (2001), [Learning perceptual chunks for problem decomposition](https://bura.brunel.ac.uk/handle/2438/2123), trained CHREST+ on circuit-diagram sequences and compared predicted decompositions with participants' behavior. The encoding and training sequence were part of the experiment.
- Gobet (2005), [Chunking models of expertise: implications for education](https://doi.org/10.1002/acp.1110), draws instructional implications from chunking models. These implications are not a trial of an MRW-like tool.
- Gobet and Lane (2010), [The CHREST architecture of cognition](https://doi.org/10.2991/agi.2010.20), [institutional record](https://uhra.herts.ac.uk/id/eprint/13741/), describe perception, learning, memory and decisions under capacity/time constraints.

These models motivate trying smaller argument segments, accessible prerequisites
and less guidance as an argument becomes familiar. Their predictions depend on
how a task and prior knowledge are represented. The existing reader can test
these choices on mathematical work without a cognitive simulator.

## Memory scheduling and workload

[Anki's FSRS documentation](https://docs.ankiweb.net/manual/deck-options#fsrs) describes fitting review history and the tradeoff between desired retention and workload. [SuperMemo's model description](https://super-memory.org/archive/help/smalg.htm) distinguishes stability and retrievability. These models predict recall under their assumptions, not mathematical understanding.

Use an existing scheduler for stable questions. Keep its recall state separate from mental effort and mathematical assessment. A time limit alone can conceal an increasing queue: limit admission, allow retirement and scope eligibility to current material. Do not record a skip, a changed source or an interrupted session as a failed recall.

## Microsoft interface guidance

Use [native views](https://code.visualstudio.com/api/ux-guidelines/views) for study/source data rather than command buttons disguised as tree rows. Keep [editor actions](https://code.visualstudio.com/api/ux-guidelines/editor-actions) and [context menus](https://code.visualstudio.com/api/ux-guidelines/context-menus) pertinent to the selected material. Use [webviews](https://code.visualstudio.com/api/ux-guidelines/webviews) for typeset mathematics and diagrams where necessary, with theme and keyboard support. Keep [progress and notifications](https://code.visualstudio.com/api/ux-guidelines/notifications) within context.

These conventions guide placement and interaction. They do not by themselves establish learning benefit.

## Observations for immediate adaptation and later versions

The separate [operational feature-use requirement](OPERATIONAL_USAGE.md) asks
which features are used, unused or unobserved, independently of their learning
effect. Core records lightweight events; an optional
[diagnostics plugin](DIAGNOSTICS_PLUGIN.md) analyzes use and reports data health.
Neither adoption statistics nor integrity checks measure understanding.

Record relevant MRW actions and results with software/policy versions, including navigation and failures, alongside sparse self-reports. Retain evidence for both successful and unsuccessful interventions.

Immediate decisions should use the current task, explicit outcomes and preferences. Later review should examine delayed retrieval, assistance burden, source-navigation effort, interruptions, errors and resumption. Compare comparable tasks and expose missing observations. A newer version receiving easier tasks cannot be credited with improved learning merely from its aggregate success rate.

Start with descriptive evidence and replayable policy decisions. Randomized comparisons, a trained load estimator and CHREST simulations are separate experiments, not conditions for delivering the first usable increment.
