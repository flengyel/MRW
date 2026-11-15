# Architecture in brief

MRW is an integration workbench for mathematical research. It connects reading,
notes, calculations, proof work and the reasons supporting claims while
preserving the context needed to continue. The design uses ports and adapters:
MRW's research services express the capabilities they need, and adapters connect those capabilities to the
systems responsible for documents, sources and execution.

![MRW architecture: the VS Code facade leads to workflow coordination, a canonical data model, the integral justification logic engine and core services. Ports and adapters connect documents, sources, computation, external proof checking, AI and planned diagnostics.](assets/mrw-architecture.png)

[Scalable SVG](assets/mrw-architecture.svg) · [PNG](assets/mrw-architecture.png)

The hexagon groups responsibilities; it is not a deployment map or a claim
that exactly six interchangeable interfaces exist. It combines current and
intended architecture. Dashed elements are proposed. The
[design register](DESIGN_RECONCILIATION.md) gives implementation status and
remaining acceptance work.

| Design element | Role in MRW |
| --- | --- |
| **Facade** | Contextual VS Code actions provide a coherent route into MRW services and native editors. The facade does not replace those editors. |
| **Ports and adapters** | Capability-specific interfaces connect notes, sources, computation, proof tools, AI and inspection. Adapters translate each external system's API and data. |
| **Anti-corruption layer** | Translation preserves identity, revision, attribution and meaning across unlike systems; external formats and status conventions do not silently redefine MRW records. This is a software boundary, not a correctness guarantee. |
| **Workflow coordination** | Connect reading, comparison, annotation, linking and resumption. Keep operations explicit and distinguish dispatch, acceptance and completion. |
| **Canonical data model** | A narrow shared vocabulary for logical identities, current locations, immutable revisions/captures, associations, provenance, observed outcomes, claim versions, admissions, contexts and derivations. Ordinary documents remain in their native formats; no duplicate representation of every mathematical idea is required. |
| **Justification logic engine** | Make the grounds for using a claim inspectable: its supporting passages, calculations or proof artifacts, admitted assumptions and inference steps. Check specified inferences under those assumptions; retain distinct grounds and their dependencies. The broader comparison workflow is pending. |
| **Core services** | Maintain storage invariants, retained references and lightweight operational usage records. Optional companions must not disable these protections. |

The engine answers: **what grounds support this claim, and which assumptions
does the argument use?** For example, a manuscript lemma may rely on a formal
proof, a recorded Lean check, and a reviewed explanation of why that formal
statement matches the prose. The engine keeps these grounds and bridges
explicit and checks their stated composition. Provenance identifies origins;
a justification records the admitted reasons for a conclusion.

The existing checker handles a range-lifting warrant and an offline
documentary-response case. The [bounded search API](JUSTIFICATION_ROUTE_SEARCH.md)
now discovers Application routes and surviving support after withdrawal;
its durable-record and reader integration remain pending. The
[Euclid example](JUSTIFICATION_EUCLID_EXAMPLE.md) supplies a public introduction.
[The user guide](JUSTIFICATION_WORKFLOW.md) explains current commands and limits;
[the technical specification](JUSTIFICATION_LOGIC_EXPERIMENT.md)
defines the non-factive J₀/J(CS) calculus and records. Ordinary reading requires
no claim or premise-entry form.

External systems retain ownership. The Zettelkasten application creates its
notes using its configured workflow; existing notes can be edited natively.
Jupyter and SagePod supply notebook execution and its environment; the Lean
extension supplies native proof-checking interaction; Zotero owns its reference
library. MRW retains selected sources, results and links without introducing competing template engines, evaluators,
queues or managed databases. Source notes and developed Zettels remain distinct,
potentially many-to-many works.

The [proposed CoCalc adapter](COCALC_ADAPTER.md) uses the computation and
document-handoff capabilities: open a selected remote project or notebook and
retain deliberately exported results with links to local notes. CoCalc retains
its collaborative editors, kernels and project lifecycle. Its first proposed
increment uses browser handoff and the existing notebook-result workflow;
authenticated CLI/API operations require a deployment-specific contract.

The [optional diagnostics companion](../diagnostics/README.md) produces bounded
local feature-use, integrity and data-hygiene reports. It supports manual
reports, opt-in weekly reporting while the workspace is active, export and an
explicit clipboard handoff for Codex maintenance. Core retains essential
integrity checks and lightweight recording. Reports do not call a model or
repair data. Automatic Codex maintenance scheduling remains pending.
External targets, full schemas/dependencies and passage anchors remain outside
the initial inspector's checked coverage.

The design is governed by [integration boundaries](INTEGRATION_BOUNDARIES.md),
[operational usage](OPERATIONAL_USAGE.md), [diagnostics](DIAGNOSTICS_PLUGIN.md)
and [Codex maintenance](CODEX_MAINTENANCE.md). The first
[`MRW.Contracts` pilot](CONTRACT_PILOT.md) provides an executable Lean
specification of relocation and immutable-citation safety, with proved invariants
and three concrete runtime trace comparisons. It remains separate from
`MRW.Justification`. This is not a verified Python/JavaScript implementation or
a liveness proof. Delegated-operation and report-classification models remain
[subsequent bounded work](CONTRACT_FORMALIZATION.md).

## Updating the figure

Edit `docs/assets/mrw-architecture.svg`, then export the PNG at 2700 pixels wide:

```sh
inkscape docs/assets/mrw-architecture.svg --export-type=png --export-filename=docs/assets/mrw-architecture.png --export-width=2700
```

Keep the status labels and accessible description synchronized with the design.
