# Architecture in brief

MRW is an integration workbench for mathematical research. It connects reading,
notes, calculations and proof work while preserving the context needed to
continue. The design uses ports and adapters: MRW's research services express
the capabilities they need, and adapters connect those capabilities to the
systems responsible for documents, sources and execution.

![MRW hexagonal architecture: the VS Code facade leads to workflow coordination, a canonical data model and core services. Ports and adapters connect documents, sources, computation, proof checking, AI and planned diagnostics.](assets/mrw-architecture.png)

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
| **Canonical data model** | A narrow shared vocabulary for logical identities, current locations, immutable revisions/captures, associations, provenance and observed outcomes. Ordinary documents remain in their native formats; no duplicate representation of every mathematical idea is required. |
| **Core services** | Maintain storage invariants, retained references and lightweight operational usage records. Optional companions must not disable these protections. |

External systems retain ownership. The Zettelkasten application creates its
notes using its configured workflow; existing notes can be edited natively.
Jupyter and SagePod supply notebook execution and its environment; Lean owns
proof checking; Zotero owns its reference library. MRW retains selected sources,
results and links without introducing competing template engines, evaluators,
queues or managed databases. Source notes and developed Zettels remain distinct,
potentially many-to-many works.

The proposed diagnostics companion reads bounded inspection interfaces and
produces feature-use, integrity and data-hygiene reports. Those reports feed
Codex maintenance: compare a finding with the current design, revalidate it,
make a justified correction and verify the result. Low usage alone does not
justify deleting a feature or research material. Reporting does not authorize
automatic repairs or model calls.

The design is governed by [integration boundaries](INTEGRATION_BOUNDARIES.md),
[operational usage](OPERATIONAL_USAGE.md), [diagnostics](DIAGNOSTICS_PLUGIN.md)
and [Codex maintenance](CODEX_MAINTENANCE.md). A proposed
[Lean contract model](CONTRACT_FORMALIZATION.md) would check selected invariants;
it would not by itself verify the Python/JavaScript implementation.

## Updating the figure

Edit `docs/assets/mrw-architecture.svg`, then export the PNG at 2700 pixels wide:

```sh
inkscape docs/assets/mrw-architecture.svg --export-type=png --export-filename=docs/assets/mrw-architecture.png --export-width=2700
```

Keep the status labels and accessible description synchronized with the design.
