# MRW development plan

Follow [AGENTS.md](AGENTS.md) and the mandatory
[documentation requirements](CONTRIBUTING.md#documentation). The
[design register](docs/DESIGN_RECONCILIATION.md) is the single record of accepted
requirements, implementation status and remaining verification. Read its current
implementation order before selecting work. This plan grants no additional
feature, external-service or data-mutation authorization.

<a id="active-roadmap-mathematical-usefulness-first"></a>

## Direction

Begin with a mathematical question, a passage under study or an unfinished
calculation. In research, establish what follows from the available grounds or
identify what remains open. Add an interaction when the work reveals a
concrete obstacle.

The [vision](VISION.md) defines the purposes; the
[research design](docs/RESEARCH_WORKSTATION_DESIGN.md) and
[UX specification](UX_SPEC.md) define the intended interactions. Use their
requirements without presenting proposed capabilities as current behavior.

## Remaining objectives

| Objective | Governing requirements and scope |
| --- | --- |
| Research continuity and argument reconstruction | D14 and the [research workflow](docs/RESEARCH_WORKSTATION_DESIGN.md#research-that-can-be-resumed). Resume documents, useful conclusions, failed approaches and unfinished steps through existing files and links. Let the mathematical task identify missing interactions. |
| Outlines across sources and scales | [Outline contract](docs/PROOF_OUTLINES.md) and [subject navigation](UX_SPEC.md#4-subject-navigation). Support subjects, bodies of literature, books, articles, sections and individual arguments. Connections can cross sources without forming a strict hierarchy. Purpose, organization, concepts, governing ideas and details remain freely navigable; Lean is optional. Broader generation, discovery and corpus ingestion require separately scoped work. |
| Returning to a proof step | Preserve the exact question, the reader’s attempt, retained feedback and the correction. Assess later reconstruction and application separately. [Study design](docs/ACTIVE_STUDY_DESIGN.md) · [Study workflow](docs/ACTIVE_STUDY_WORKFLOW.md) |
| Paper–Lean correspondence | D15 and the register's deferred review. Use the author-selected Došen–Petrić manuscript and resolve its current prose and Lean revisions together. Compare types, hypotheses, quantifiers, conclusions and dependencies. Preserve reviewed correspondences separately from formal checking. |
| Grounds and derivations | D15 and the [justification specification](docs/JUSTIFICATION_LOGIC_EXPERIMENT.md). Keep explicit admissions, alternative routes, withdrawal and retained contexts distinct from provenance and truth. Extend the engine only for an authorized mathematical need. |
| Native workflow verification | D08 and D11–D13. Complete the specifically unobserved lesson/code/notes, companion interaction, rich-output comparison and reference/attachment routes when the relevant host and services are available. Do not repeat completed demonstrations or infer native acceptance from mocks. |
| Diagnostics and contract models | D16–D21, [maintenance](docs/CODEX_MAINTENANCE.md) and [contract scope](docs/CONTRACT_FORMALIZATION.md). Preserve bounded observation, source/release/installation distinctions and implementation correspondence. Automatic maintenance scheduling and later models need their own implementation evidence. |
| External adapters and portability | D01, the [integration contract](docs/INTEGRATION_BOUNDARIES.md) and [CoCalc proposal](docs/COCALC_ADAPTER.md). Start from the owner system's supported route. Other proposed readers, services, hosts and synchronized private-store arrangements remain separate qualifications, not implicit next tasks. |

## Mathematical-use evidence

Apply the [study and collaboration evaluation](UX_SPEC.md#9-study-and-collaboration-evaluation)
to work actually undertaken. Reading/re-entry and problem solving test distinct
functions. Preserve source locations, attempted mathematics, useful results,
consequential friction and the next unfinished step in the ordinary work product.
Observe later continuation when assessing retention or reconstruction effort.

Assess explanatory, practical, epistemic and organizational benefit separately.
Synthetic responses, successful checks and a restored cursor establish their
specific mechanics. They do not establish human understanding, usefulness or
comparative time savings. A concrete example, corrected argument or resumed
investigation supplies evidence for the corresponding benefit. No questionnaire,
anchor quota or repeated setup exercise is required.

## Implementation contracts

Reuse the existing [domain model](DOMAIN_MODEL.md),
[source identity rules](docs/SOURCE_IDENTIFIERS.md),
[storage contract](docs/ARTIFACT_STORAGE.md),
[workspace relocation contract](docs/WORKSPACE_RELOCATION_DESIGN.md),
[AI workflow](docs/READER_AI_WORKFLOW.md) and
[investigation persistence boundary](vscode/README.md#investigation-persistence-boundary).
The standalone Qt behavior remains specified in [UX_SPEC.md](UX_SPEC.md);
it does not prescribe extension-owned editors, buffers or recovery machinery.

Opening and restoring work run no provider, compiler, kernel or container.
Provider requests require the exact preview and separate Send. Keep original
responses, derived explanations, formal checks, admissions and human judgments
separate. Preserve the bounded current investigation lifecycle rather than
silently introducing branching, hidden conversation state or automatic retries.
