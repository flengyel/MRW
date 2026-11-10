# Vision

MRW is being developed to help read, investigate and return to mathematics across
notes, sources, calculations and proofs. This document explains its goals and the
evidence needed to assess them. The [README](README.md) describes current
capabilities; the [research-workstation design](docs/RESEARCH_WORKSTATION_DESIGN.md)
connects those capabilities to proposed work.

## Current product direction — 2026-11-08

MRW should connect ongoing mathematical questions to ordinary documents,
notes, calculations, proofs, checking evidence and unfinished work.
Reconstructing compressed arguments, including LLM-generated solutions, is a
central goal: expose assumptions and intermediate steps,
locate cited results, develop examples, check claims, and preserve gaps and
corrections. Research can start before a source passage or model response exists.

Ordinary notes and their links are the starting point. Opening or following a
document never creates a problem record or launches an exercise form. Questions,
solutions and commentary can remain where written. Any additional interaction
must remove a demonstrated obstacle without duplicate entry.

Document navigation and optional note integrations are delivered. The document
Problems subsystem was withdrawn in 0.23.3. Do not replace it with Research
Question registration: resumption first recovers documents, supported
locations and unfinished work. A new record, title, summary/next-action form or
Research view is not an entry requirement. The
[research-workstation design](docs/RESEARCH_WORKSTATION_DESIGN.md) records these
rules. Future increments follow obstacles encountered in ordinary mathematical
use. Obsidian and the Zettel note convention remain optional.

The rapid-learning-console idea guides the interaction: present mathematics,
support an attempt, test comprehension where useful, and retain the work for
continuation. Frequent local questions and light review belong within research
and study. They do not turn every research question into
a recall item or make a quiz the price of returning to work.

Track cognitive load through task-linked reports of mental effort and separate
observations of assistance, outcomes, interruptions and navigation. Use those
records to adapt the present session and evaluate later MRW versions. Preserve
the distinction between what was observed, reported, assessed or inferred.
No single score establishes understanding.

The optional source-study tools record attempts, reported effort, review and
local history; see their [workflow](docs/ACTIVE_STUDY_WORKFLOW.md) and
[design](docs/ACTIVE_STUDY_DESIGN.md). Their implementation does not establish a
learning benefit, an individual cognitive-load model or a causal comparison
between releases. The [research review](docs/LEARNING_RESEARCH.md) supplies the
evidence and limits behind these proposals.
Spacing has support in mathematics; retrieval findings are broader and less
conclusive for mathematics specifically. CHREST informs questions about
expertise and presentation without becoming a prerequisite for implementation.
Preserve the 0.19.1 repairs while integrating the wider research workflow.

The [domain model](DOMAIN_MODEL.md) defines entities and invariants, the
[UX specification](UX_SPEC.md) describes interactions, and the
[implementation plan](CODEX_PLAN.md) records delivery and priorities.

The active frontend is a VS Code extension over independent research services;
the standalone Qt application remains available. VS Code supplies ordinary
editing and document lifecycle; the extension contributes research continuity
and explicit record operations. This vision states intended benefits, not
feature parity between frontends or observed mathematical usefulness.

Simplicity and interoperability guide deployment: keep one VS Code extension
and the Python core, running the backend in the workspace environment.
Use the host's standard local Linux, WSL2 and Remote SSH mechanisms. Windows
VS Code connected to Linux is an intended arrangement. Python 3.11+ is required
on the workspace host; ordinary reading and outlining need no Lean, SageMath,
container or model provider. These remain optional integrations.
Native Windows backend portability is deferred. Scoped installed-VSIX checks
pass with WSL Debian and Remote SSH to a Raspberry Pi 5 on Debian 12 ARM64;
other Linux SSH hosts, local Linux desktop use and other Pi OS/ARM configurations
remain separate validation targets.
Deployment intent is distinct from the tested configurations recorded in the
[validation report](docs/VS_CODE_OUTLINE_VALIDATION.md); this direction adds no
new runtime, remote service or record semantics.

## Thesis

Mathematical Research Workstation should help people work with mathematics whose
justification exceeds their present understanding, while making further
understanding possible wherever it can.

Its uses include gaining working access to the mathematical literature,
investigating questions, reconstructing compressed solutions, and returning to
unfinished work. Entering unfamiliar subjects and locating prerequisites belong
alongside calculations, proof attempts, manuscripts and recorded checks.
Reducing repeated reconstruction of research context is a central objective.
The distinctions between justification, appropriate use, and understanding
apply to both the literature and human- or AI-generated work.

* Learning a large body of mathematics requires orientation, mathematical work,
  integration, and retention.
* Returning to mathematics after a lapse may require reconstructing context not
  explicit in the surviving sources.
* Mathematical study may begin from exposition, a theorem, a proof, an example,
  or a problem; no complete proof or formalization is assumed.
* Human- or AI-generated mathematics may be justified without being fully
  understood. It remains available for appropriate use and further study;
  complete conceptual understanding is not a condition of acceptance.
* MRW may request task-specific assistance from a configured model;
  the request, selected context, raw response, and resulting proposals retain
  their provenance.
* When a task needs an account of how reasons compose, a non-factive
  justification-logic layer records checked derivability relative to explicit,
  versioned premises and bridges.
* AI may increase the rate of mathematical production and the amount of work
  requiring evaluation, reconstruction, and integration.
* Kallenberg's top-down approach guides requested orientation in unfamiliar
  mathematics; focused questions and prerequisite lookup remain available
  without completing that sequence.
* Curry's account of increasing but never absolute precision explains why
  informal and formal representations remain distinct.
* MRW explores tools for learning, solving problems,
  reconstructing arguments, integrating results, and retaining mathematics.
* Evidence of learning comes from mathematical work and later performance.
  Reported mental effort supplies separate evidence about experienced effort;
  it does not establish understanding or mathematical correctness.

MRW is intended both for navigating and learning from a large
corpus, such as the Stacks Project
[@stacksprojectauthorsStacksProject2021], and for returning to one's own
research, an inactive project, or a subject not studied or taught for years.
AI increases these demands and supplies new forms of assistance, but did not
create them. Tao observes that the growth of the literature, the increasing
length and specialization of major proofs, and the strain on the refereeing
system all predate modern AI [@taoMathematicsAgeAI2026].

Evaluate MRW through mathematical work: do saved locations, notes, calculations,
diagrams, model exchanges and recorded checks make a later argument easier to
reconstruct or apply? Evaluate the cost of maintaining those records as well.
Determine which information can be obtained or updated mechanically and which
decisions require mathematical judgment.

A mathematician may consult several machine assistants for exploration and
criticism, a proof assistant for verification when a formal development exists,
a computer algebra system for computation, and the literature for definitions
and exposition. MRW may also make a bounded request to a configured model from
active mathematical work. It preserves the selected context, request, any raw
response, resulting mathematical representations and work artifacts,
provenance, checking status, and the state at which work stopped. No one
assistant becomes the authority. The system does not require a mathematician
to complete a description of what is supposedly understood.

### From paper to research computing

MRW should ease a gradual transition from blackboard and pen-and-paper work to
research computing. Begin with the mathematician's question, source
and handwritten work. Ordinary editable notes, precise citations and an explicit
place to resume supply continuity. When computation helps, keep the code, inputs,
outputs and interpretation together so the calculation can be inspected and
repeated. Source assertions, reader explanations, computed examples and checked
results retain their distinct roles.

The interface should make starting and continuing work discoverable, with visible
new/open choices and an optional tutorial written for mathematicians entering
this environment. Introduce tools when a task makes their purpose clear. Paper
remains a working medium; adopting a complete toolchain, formalizing a proof or
completing a tutorial is not a condition of using the workstation. This is a
design objective, with benefit assessed through actual mathematical work.

### Access to existing literature

The intended workflow begins with a chosen mathematical question or source.
It should help identify the purpose and organization of a chapter or paper,
recover the definitions and earlier results needed at a particular passage,
reconcile notation and hypotheses across sources, and preserve the resulting
route for later continuation. An outline, a worked example, a comparison of
formulations, or a located prerequisite may make further work possible without
a complete account of every proof.

Reading routes and proposed connections must remain linked to identifiable
sources. A source's assertion, a suggested dependency, a checked correspondence,
and the reader's own synthesis have different evidential roles. Missing sources
and uncertain connections remain visible. A proposed route toward a research
question does not establish that the question is open or that the literature
search is complete.

This is a design objective to evaluate through actual study. The system should
reduce avoidable search, transcription, and repeated reconstruction while
supporting the mathematical work still needed. It promises neither effortless
mastery nor a complete map of a field. Useful local progress does not require
reaching a research frontier, and the four benefit categories below remain
independently assessable.

---

## 1. AI-generated mathematics and the additional pressure from AI

Mathematicians already need to orient themselves in growing literatures,
reconstruct arguments, and retain context across long interruptions. AI may
increase the number of proofs, formalizations, conjectures, examples, and
explanations requiring evaluation. The claim made here is conditional: if
machine assistance increases mathematical production faster than human capacity
to assess and absorb it, more effort must go to orientation, verification,
understanding, integration, and retention.

AI-generated mathematics is available for use and study. A result generated by
an AI may be correct or formally verified without being understood by the
mathematician receiving it. Further understanding may involve reconstructing the
relevant human-developed mathematics that the result uses or extends—the same
body of mathematics from which current systems learn. This does not guarantee
that every justified result has an explanation accessible to human cognition.
Tao discusses both the prospect of verified proofs without human understanding and
the dependence of mathematical AI on canonical theories developed and organized
by mathematicians [@taoMathematicsAgeAI2026].

In his ICM public lecture, Tao distinguishes proof generation, verification,
exposition, digestion and acceptance, and canonicalization; under an explicitly
stated working hypothesis, he argues that increased generation may create
bottlenecks among those later activities
([preprint](https://doi.org/10.48550/arXiv.2608.16753),
[slides](https://teorth.github.io/tao-web/slides/age-of-ai-icm-2026.pdf),
[Simons Foundation recording](https://www.youtube.com/watch?v=M0--ZH1lOzg)). A
separate first-person account reports cross-field source discovery, rapid
testing of ideas and wrong avenues, and substantial human effort spent
reconstructing poorly anchored model prose
([garvy, “No Country for Mediocre Mathematicians”][garvy-essay]).
That account is anecdotal workflow evidence, not a controlled productivity
study or a labor-market forecast. Together these sources motivate an explicit
response-digestion bridge: preserve exact output and origin, expose the routes
actually returned, retrieve and check suggested sources independently, and
support reconstruction and durable synthesis. Canonicalization remains the
mathematical community's longer process of absorbing work into dependable
theory and exposition; it is not an automatic application action.

[garvy-essay]: https://garvvee.substack.com/p/no-country-for-mediocre-mathematicians

Studying externally generated mathematics and requesting task-specific
assistance from a configured model are both part of the initial workflow. A
request is attached to active mathematical work. The exact outbound context and
any raw response are preserved before a statement, hint, outline, calculation,
or source suggestion is recorded as an AI proposal.

`ModelCall` is the operational and provenance envelope for this interaction,
not an epistemic model. It records what was sent and returned; it has no field
for trust, support, correctness, confidence, acceptance, or authority. If a
selected proposal participates in a warrant, it crosses into the generic
justification layer through explicit claim atoms and premise admissions. No
AI-specific support edge or provider-wide reliance rule is introduced.

A claim's epistemic status cannot be inferred from its availability. A result
posted publicly, a result checked by a kernel, a result refereed, and a result
independently reproduced are four different things. Research-active
mathematicians can disagree about whether an argument is a valid proof
[@inglisMathematiciansDifferentStandards2013], and an argument's attributed
source can affect how it is read and judged
[@weberInfluenceSourcesReading2013]. MRW must keep source,
verification, admitted warrant, checked derivability, epistemic status, and
later judgments distinct in its data model and interface.

### Justification, understanding, and benefit

Verifiable truth can outrun human understanding. Adequate grounds for accepting
a proposition need not supply a conceptual explanation of it. The project
assumes neither that human understanding will eventually encompass every
verifiable result nor that present incomprehension is permanent. Reducing an
explanatory gap is a useful objective even when complete closure is unavailable.
The total gap may widen while particular explanations and applications improve.

Understanding includes familiarity with definitions and examples, command of
applications, insight into a mechanism, and reconstruction of a proof. These are
different attainments. A result may be used with sufficient command of its
statement, hypotheses, scope, and grounds for acceptance without mentally
surveying or independently reconstructing its entire proof.

The workstation has four separately assessable kinds of benefit:

1. **Epistemic:** preserve a result's statement, assumptions, dependencies, and
   grounds for acceptance, including the scope and limitations of checks.
2. **Practical:** support appropriate application of a result without requiring
   reconstruction of its entire proof.
3. **Explanatory:** develop examples, connections, partial explanations, or
   simpler arguments, and make unresolved explanatory questions accessible.
4. **Organizational:** make accumulated mathematics retrievable and unfinished
   investigations resumable.

Success in one category need not imply success in another. A lack of observed
explanatory progress leaves that benefit unproved; it does not negate separately
demonstrated epistemic, practical, or organizational value. Evaluation must name
the benefit and the evidence for it. These are design and evaluation criteria,
not a claim that every function has been implemented or its benefit observed.

This distinction does not promote available output into justified mathematics.
Provenance alone establishes no truth. Formal verification is scoped to a
statement, definitions, assumptions, and checking procedure; correspondence to
an intended informal claim remains a separate question. The non-factive warrant
layer continues to report derivability relative to admitted premises and policy,
without automatically asserting truth, knowledge, or understanding.

## 2. Activities MRW should support

Five activities are not completed merely by possessing a theorem statement or a
proof.

**Orientation.** Before detailed study, identify the subject's organizing
concepts, principal results or problem families, dependencies, and sources. A
table of contents or declaration index does not by itself establish these
relationships.

**Problem solving.** Problems may test prior exposition, supply omitted proof
steps, develop examples, or constitute the exposition itself. The system should
present a selected problem with its source location and relevant prior material,
accept ordinary mathematical work, and provide optional assistance without
requiring preliminary classification or self-description.

**Reconstruction.** Recovering an argument, governing idea, and dependence on
hypotheses can deepen understanding and extend a result's uses. Complete proof
reconstruction is not a prerequisite for every justified application. Evidence
of reconstruction or explanatory benefit includes a reconstructed proof, a
completed missing step, or an example or application that clarifies how a
hypothesis is used. A declaration that the
result is understood is not evidence.

**Integration.** A result is integrated when it can be related to earlier
results and used in subsequent work: for example, to solve another problem,
replace a stronger hypothesis, compare two methods, or explain a new case.
These relations may be proposed mechanically, but accepting them is
mathematical work.

**Retention.** Previously completed work should be recoverable after an
interruption. The system can preserve dated attempts, assistance used,
corrections, and later task results. These observations support review
scheduling, but they do not justify a general claim about a person's knowledge.

Studies of mathematical work identify strategic knowledge in proof construction
[@weberStudentDifficultyConstructing2001]; formal reconstruction, informal
deduction, examples, and conceptual knowledge in proof validation
[@weberHowMathematiciansDetermine2008]; line-by-line, modular, and
authority-based proof reading [@weberWhyHowMathematicians2011]; local use of
definitions, fragments, examples, and instantiated constructions while studying
unfamiliar mathematics [@wilkerson-jerdeHowMathematiciansLearn2011]; more
frequent movement between adjacent proof lines, interpreted as attention to
implicit warrants [@inglisExpertNoviceApproaches2012]; and diagrams developed
during problem solving [@stylianouInteractionVisualizationAnalysis2002].

These studies concern particular tasks and do not establish a universal
representation of mathematical expertise. MRW represents sources,
mathematical objects and relations, work artifacts, requests for assistance, and
task results. Proof attempts, informal deductions, examples, computations,
diagrams, formal checks, and source use remain distinct records available as the
current task requires them. No artifact must be translated into a single
prescribed representation before work continues.

## 3. Kallenberg: the order of study

Kallenberg prescribes a reading method for advanced mathematics and contrasts it
with reading a novel from beginning to end: gain a general overview first,
proceed gradually to individual theorems, and examine proofs and their logical
structure after their place in the subject is known
[@kallenbergFoundationsModernProbability2021, 1].

His recommendation to study proofs before exercises is useful when completed
proofs provide the exposition. It is not an assumption that every source
contains such proofs, and it does not make a problem collection wait for a
separate proof corpus. In a problem-centered text in which exercises develop
the theory, selected problems may supply omitted arguments and establish command
of examples. After an initial orientation, solving those problems is the study
method.

The default top-down order for requested orientation is:

1. the purpose and organization of the subject or chapter;
2. its central concepts, results, and problem families;
3. the selected theorem, argument, example, or problem;
4. the governing idea or proposed method;
5. the detailed proof, calculation, or construction.

This order applies only to material that exists. It neither assumes a
machine-checked proof nor requires a complete informal proof before study can
begin. It is an exposition aid, not a compulsory reading algorithm or a claim
about all experts' behavior. A returning researcher can ask directly about a
local inference; an unfamiliar definition or example can be examined at any
point. The research basis and its limits are in the active CODEX_PLAN roadmap.

A theorem view therefore opens with the result's role and mathematical effect.
A problem view opens with the problem, its exact source location, the relevant
definitions and prior results, and links to earlier related attempts.
Assistance is optional and increasingly explicit: locate a definition or
result; produce a small example; check a calculation; give a strategic hint;
inspect a proposed step; suggest an intermediate lemma; or show a complete
solution only when requested. The attempted proof or computation is the primary
work artifact.

Research and formalization need not proceed in this order. Formal work may show
that an asserted assumption is derivable, that an identity uses fewer axioms
than expected, or that a manuscript hypothesis is unnecessary. The interface
must accept these results and update the relationships among the affected
artifacts. Top-down study supplies a default orientation, not a required
discovery order, dependency order or interaction sequence.

## 4. Curry: the representation model

Curry calls the unformalized language in which mathematics is discussed the U
language. It includes mathematical terminology and notation whose use changes
and becomes more precise as work proceeds
[@curryFoundationsMathematicalLogic1977, §1].

New terms and symbols are introduced, old terms acquire new meanings or are
abandoned, and usage becomes more precise. Curry nevertheless argues that
absolute precision is unattainable. Formalization does not eliminate the
interpretive decisions expressed in definitions; it makes a proof checkable
relative to those definitions.

The same mathematical subject may therefore have an overview, a theorem
statement, a proof outline, a detailed informal proof, computations, a formal
statement, and a machine-checked proof. These representations answer different
questions. None is merely an incomplete version of another, and no fixed
sequence of them must exist.

An outline without a formalization is a legitimate final representation. A
machine-checked proof without an account of its role or governing idea is also a
legitimate but different representation. The system records explicit proposed
relationships among representations rather than identifying them.

Mathematical reading includes textbooks, monographs, articles and AI-generated
or AI-assisted manuscripts. The first offline source-region reader supports
manual deconstruction of their arguments without requiring formal evidence.
Orientation, central concepts and results, governing ideas, argument structure
and optional technical detail are navigable at the reader's discretion. Using
a cited theorem need not wait for reconstructing its proof. Source quotations,
reader explanations and proposed repairs, and supporting checking evidence
remain separately attributed. This bounded delivery does not establish proof
correctness or observed explanatory benefit.

Machine assistance can propose an outline of a formal proof, suggest a
formalization target for an informal argument, compare definitions, or identify
possible source correspondences. When MRW requests such assistance,
the model call and its raw response remain available alongside any extracted
representations. Each proposal retains its origin and checking status.

## 5. Formal verification is one aspect

Lean settles a question of unusual sharpness: whether a proof is correct
relative to stated definitions and a recorded set of axioms. That is worth
having and is not the whole problem.

What a kernel check does not settle: whether the statement formalized is the
statement intended; why the result matters; what the proof's idea is; which
hypotheses are essential; how the argument relates to the surrounding
mathematics; and whether the argument can be reconstructed and used.

Where a formal development exists, it supplies mechanically checkable facts
about types, dependencies, axioms, and verification status. Where none exists,
MRW should still support orientation, problem solving, proof attempts,
computations, reconstruction and review. An informal argument or problem
attempt is not treated as awaiting formalization.

Two rules follow. Formal facts — types, dependencies, axiom usage, checking
status — are obtained mechanically, from one canonical generator, and never
maintained by hand. And verification is an attestation about a claim, not the
origin of the claim: a proof written by a human, or proposed by a machine, and
then checked, has one origin and one or more attestations.

## 6. Explicit warrants are an integral, distinct aspect

Provenance answers where a claim or artifact came from. Verification records a
scoped check. Neither records how one admitted reason combines with another.
MRW therefore adopts a bounded justification-logic layer for
explicit warrant composition, based initially on the non-factive
Artemov--Fitting systems \(J_0\) and \(J(CS)\)
([Chapter 2](https://doi.org/10.1017/9781108348034.003)).
This is an integral warrant subsystem, not an external add-on. Its separation
from provenance and verification is a semantic boundary: those records answer
different questions and must not be collapsed into one status.

Mathematical statements remain immutable opaque atoms in the first experiment.
Justification application records composition: a reason for \(F\to G\) and a
reason for \(F\) yield a reason for \(G\). Sum records alternative availability
for the same formula; it is not a confidence score, independent corroboration,
or evidential weight. The global system is non-factive: storing or deriving
\(t:F\) does not add \(F\) as a theorem.

Every source, formal check, correspondence, and AI proposal remains outside the
calculus until an explicit, versioned premise or bridge admits its scoped use.
A kernel check of \(F_L\) does not establish a manuscript claim \(F_M\), and a
`formalizes` correspondence does not silently create \(F_L\to F_M\). The first
Appendix A certificate therefore displays separately the checking-event reason,
the formal-proof-policy bridge, and the reviewed directional
formal--manuscript bridge.

The same boundary governs model assistance. Let \(C\) be an exact `ModelCall`,
\(h\) its response digest, \(s\) an exact response span, and \(R\) the lossless
proposal extracted from that span. The documentary atom
\(D=\operatorname{ModelProduced}(C,h,s,R)\) says only that the call produced the
proposal. It is distinct from the substantive mathematical atom \(F\). If the
origin itself is used in a warrant, separate admissions of \(m:D\) and
\(r:(D\to F)\) permit the checked application \(r\cdot m:F\). Neither admission
is automatic, and \(r\) must be scoped to that exact output with an inspectable
basis. More commonly, independent reconstruction, source retrieval,
computation, or formal checking directly supplies a reason \(v:F\); then the
honest mathematical warrant is \(v:F\), while the model call remains causal
assistance recorded by provenance and task evidence.

Use of this integral subsystem is task-dependent in the workflow. Its
presentation includes the result's role, statement, available explanatory
material, and relevant formal correspondence; an absent governing idea or proof
outline does not block warrant inspection. It never becomes preliminary logic
entry for ordinary mathematical work. The term and formula syntax, axiom
profiles, contextual derivations, constant
specifications, certificate checker, and certificate-soundness theorem are
implemented in Lean. The ordinary Python application validates and renders the
Lean-generated versioned bundle without reimplementing the logic and continues
to orient and study the source when Lean is absent. The exact first slice and
cut line are fixed in `docs/JUSTIFICATION_LOGIC_EXPERIMENT.md`.

The first command-line interface is stateless. Its explicitly requested `why`
view therefore assumes no earlier command or hidden session state. It is a
cumulative post-correspondence view: it presents purpose and organization,
central concepts and results, the selected result's role and statement,
governing idea, proof skeleton, available technical detail, and reviewed formal
correspondence in that order before the warrant.

Factivity, positive introspection, Justification Awareness Models, Fitting
semantics, quantifiers, and corpus-wide warrant graphs are not part of the first
slice. Its evaluation determines how the adopted warrant layer should be
represented and where it is useful, not whether provenance and verification
should be collapsed back into a single status.

## 7. Retention and later reconstruction

Review is included because rereading an entire corpus or project after every
interruption does not scale. The system may schedule short mathematical tasks
drawn from work already performed.

Useful tasks include reconstructing an argument, completing a previously omitted
step, solving a related problem, applying a method under altered hypotheses,
producing an example or counterexample, or checking a remembered proof against
the source. Recalling a type signature or reproducing a list of hypotheses is
normally unnecessary when the source can be consulted.

Problem-centered sources already supply many suitable tasks. Additional tasks
may be derived from unfinished attempts, errors that were corrected, assistance
that proved necessary, and later results that use the same method.

Scheduling status is an operational estimate derived from dated task results,
elapsed time, and assistance used. It is not a self-assigned level of knowledge.
No review session requires completion of fields describing what the
mathematician believes is understood.

## 8. What this is not

Not a Lean documentation browser. Not a theorem database. Not a proof assistant,
a search engine, or a formalization tool.

This is recorded as a design hazard rather than a slogan, because the project
has already drifted this way once. The sequence was: mathematical learning
system, then Lean integration, then an exporter, then a documentation
consistency checker. Each step was locally defensible and the composite lost the
research question, because the infrastructure end of the problem is the part
that is easiest to specify.

Infrastructure is justified only by a specified mathematical function. Extract
formal dependencies when they help explain a proof or restore the state of an
investigation. Do not build an extractor merely because extraction is an
available engineering task. The test is whether the component enables a
mathematician to orient, solve, reconstruct, integrate, or review work that
could not otherwise be handled adequately. Existing tools should be used when
they already provide the required function.

## 9. Corpora with different available evidence

`flengyel/Categorical_Rice_Shapiro` supplied the initial formal-correspondence
corpus. Its named mathematical re-entry and informal/formal-correspondence test
uses
`rs_Appendix_A.tex`, the corresponding Lean declarations, and
`Lean/docs/AppendixA.md`.

`Lean/docs/AppendixA.md` records expert mathematical judgments absent from
`rs_Appendix_A.tex` and the corresponding Lean declarations. It identifies
hypotheses that formalization showed to be
unnecessary, structures that proved derivable rather than postulated, terms
used with different meanings, and manuscript claims with corresponding Lean
results. Its positional references become obsolete as the manuscript and Lean
development change. The first-corpus experiment asks which locators and formal
facts can be regenerated, which proposed source-to-formal correspondences can
be checked, and which assessments require mathematical judgment.

A problem-centered and mostly unformalized source requires a different
workflow. For a problem-centered text in which exercises develop the theory,
the principal artifacts are source locations, selected problems, relevant
definitions and earlier results, proof attempts, computations, diagrams,
examples, corrections, and assistance used. A formal counterpart is included
only when one already exists or is deliberately produced during the
mathematical work.

The separately authorized 2026-10-21 Stacks section importer supplies bounded
access to one selected published section in extension 0.8.0, with retained
source, explicit citations and annotations. It does not complete the broader
experiment below or establish mathematical usefulness; earlier study/evaluation
prerequisites do not gate this implementation.

A separately authorized large-corpus ingestion experiment will use either the
Stacks Project
[@stacksprojectauthorsStacksProject2021] or Kerodon. It will import the source's
published hierarchy, stable identifiers, cross-references, and revision
information. Statements, proofs, examples, and surrounding context will be
obtained and represented as active mathematical work requires them. No
corpus-wide semantic classification is required before study begins.

The system must not require the same evidence from every corpus. Formal data is
used when available and omitted when absent. In neither case is the
mathematician asked to complete a form describing an internal mental state.
Provenance attaches to source claims, machine proposals, computations, formal
checks, and mathematical work artifacts.

## 10. Tests of the design

The design makes distinct, falsifiable claims. Each trial evaluates the relevant
epistemic, practical, explanatory, or organizational benefit described in §1;
no single trial is a universal test of the workstation's value. Implementation
checks and observed benefits remain separate:

- The Appendix A trial uses `rs_Appendix_A.tex`, the corresponding Lean
  declarations, and `Lean/docs/AppendixA.md` to test whether mechanically
  obtained source locations, dependencies, axiom information, and change
  detection reduce the effort required to maintain source-to-formal
  correspondences.
- The bounded justification-logic slice tests whether one checked, explicit
  reason term makes the formal-proof-policy and formal--manuscript bridges for
  `lem:range-lifting-pullback-section` easier to inspect and reconstruct. It
  fails operationally if it requires logic entry before mathematical work,
  hides an admission, or conflates derivability with truth or verification.
- A problem-centered trial tests whether, after top-down orientation, detailed
  mathematical work can begin from a selected problem without prior
  formalization or manual population of a knowledge model. It fails if
  preparation of the system requires more effort than beginning the mathematics
  directly.
- An existing-literature study trial tests whether a selected passage or
  question becomes accessible through an outline, located prerequisites,
  clarified notation, or connections to earlier results. The evidence is the
  mathematical work that these aids enable and its later continuation. Counts
  of retrieved sources or generated summaries do not establish benefit.
  Comparative time savings require a comparable baseline.
- A later large-corpus trial tests whether, beginning from a subject-level
  question, a mathematician can identify an ordered sequence of relevant source
  locations, study selected material, preserve the resulting work, resume after
  interruption, and identify records affected by a source revision without
  classifying the corpus in advance.
- A model call during a problem attempt is useful only if its response helps
  suggest relevant material to obtain or a computation to perform, identify a
  specific gap, criticize an attempted step, or supply requested assistance
  without displacing the mathematician's choice of method. The response and its
  later use, correction, or rejection must remain observable.
  In the separately requested warrant experiment, one selected exact response
  span must expose either an explicit checked AI-to-claim bridge or the
  deliberate absence of that bridge when independent
  work supplies the mathematical warrant. An incorrect or irrelevant proposal
  may instead end with no bridge and no warrant for its substantive claim; its
  rejection or abandonment remains task evidence.
  An offline fixture may establish exact response binding, explicit
  documentary admission, Lean-checker reuse, and runtime-bundle integrity. It
  is not evidence that model assistance was useful, because it contains no
  genuine obstruction, provider request, proposal use, or subsequent
  mathematical work.
- Retention support is useful only if later reconstruction, application, or
  related problem solving improves. A self-rating is not evidence.
- Existing formal tools should be used when they already provide the required
  declaration, dependency, axiom, or checking information.
- If maintaining the stored relationships costs more attention than their later
  use saves, the representation and workflow must be revised.

The initial two trials test different functions. A corpus with an extensive
formal development cannot establish that the problem-centered workflow works,
and a mostly unformalized problem collection cannot test maintenance of
source-to-formal correspondences. The large-corpus ingestion trial requires
separate authorization and is not
part of the first implementation. Its scheduling follows the active roadmap;
it does not gate ordinary navigation among existing sources or the selected
Marcus study trial.
