# W3C PROV for the mathematical lab notebook

Design direction, 2026-11-10. This specifies future work; MRW 0.23.10 does not
implement a general lab-notebook provenance service or PROV export.

**W3C PROV is the common provenance model for new research and study
integrations.** Use its concepts and relations across plugins, with a documented
MRW profile for mathematical work. VisTrails informs the handling of alternative
methods and results; its runtime and storage are not dependencies.

## Standards and scope

Use [PROV-DM](https://www.w3.org/TR/prov-dm/) for the conceptual model,
[PROV-O](https://www.w3.org/TR/prov-o/) for interoperable RDF terms, and
[PROV-CONSTRAINTS](https://www.w3.org/TR/prov-constraints/) when validating
exported provenance. The [overview](https://www.w3.org/TR/prov-overview/) and
[primer](https://www.w3.org/TR/prov-primer/) introduce the family.

Define and version a small MRW profile before implementing an exporter. Keep
the existing source identities, exact revisions, persistence services and origin
records. Map them to PROV; do not replace the saved store or require a graph
database. The first interchange target is PROV-O expressed as Turtle, accompanied
by an artifact manifest. Export each named bundle in a separate Turtle file,
with its identity and attribution in the manifest, so distinct accounts are not
silently merged. Ordinary notes remain Markdown; notebook and Lean files retain
their native formats. Export creates no network publication.

The existing domain-model `Provenance` record describes origin. It remains
valid. PROV adds relationships among artifacts, operations and responsible
agents; it does not collapse origin, verification, premise admission and human
judgment into one status.

For a related implementation, see
[Eigenius's treatment of provenance and justification](https://eigenius.io/docs/platform/justification-logic/).
It separates records of how an artifact was produced from grounds for a
proposition and a checked proof. Compare this boundary when linking the PROV
profile to MRW's [justification subsystem](JUSTIFICATION_LOGIC_EXPERIMENT.md#related-implementation).

## Minimal semantic profile

Here `prov:` denotes `http://www.w3.org/ns/prov#`. These are design mappings,
not new fields already present in every MRW record.

| MRW material or event | PROV mapping |
| --- | --- |
| An exact source passage, note revision, notebook, dataset, proof file or retained result | `prov:Entity`, with revision-specific identity and an exact content reference where available. |
| An observed import, calculation, transformation or proof-checking invocation | `prov:Activity`; each invocation is distinct, including repeated or failed runs. |
| A responsible person or software system | `prov:Agent`; `prov:wasAssociatedWith` connects an activity to the agent and `prov:wasAttributedTo` attributes an entity. |
| Recorded input and output relationships | `prov:used` from activity to input entity; `prov:wasGeneratedBy` from output entity to activity. |
| A documented derivation or revision | `prov:wasDerivedFrom`, or the more specific `prov:wasRevisionOf` from the newer entity to the earlier one. |
| A versioned method or workflow specification | `prov:Plan`; an activity's qualified association can identify it through `prov:hadPlan`. |
| A provenance account supplied by a plugin or external system | A named `prov:Bundle`, with attribution and enough context to distinguish its account from MRW's observations. |

A content hash supports integrity checks; it does not establish provenance or
responsibility. Keep logical identity, content revision and storage location
distinct. A Git branch or moving URL is not an immutable revision. Record a
commit and file revision, plus any local changes actually used.

Do not infer derivation merely because an activity used one entity and produced
another. A note link, chronology, topic match or shared session is not evidence
of a dependency. Record provenance claims with their origin: observed by MRW,
reported by a plugin or imported from another account. Missing information stays
unknown. Hash validation does not authenticate an external account.

Keep method-version history, execution dependencies and mathematical proof
dependencies distinct. An alternative calculation is a new branch of the work;
a rerun is another activity. Neither establishes a logical implication.
Validation of a PROV record checks its consistency, not the mathematics or the
truth of its supplied account. A Lean checking result retains its exact subject,
environment and checking scope.

The planned [Zotero integration](RESEARCH_WORKSTATION_DESIGN.md#zotero-integration)
adds a bibliographic connection to retained sources. Identify metadata snapshots
and attachment revisions separately, retaining the library and item identity,
API-instance context, available version and exact content hash. A later metadata
edit must not retarget an earlier retained passage. Record observed acquisition
as an activity; a citation or item association alone does not establish
`prov:wasDerivedFrom`.

## Core and plugin responsibilities

The core validates the common profile, assigns or resolves scoped identities,
retains artifacts and their relationships, and supplies inspection, comparison,
navigation and export. Plugins adapt external systems and report only the
operations and context they can observe. Source acquisition, lesson content and
execution are separate capabilities; do not force calculations through the
existing source-parser API.

For a recorded run, retain the available input revisions, code/method revision,
parameters, relevant assumptions, tool and environment versions, execution
order, start/end information, outcome and output references. Preserve failure
information as well as success. Seeds, external data and container/package
identities matter when used; an unavailable value must not be fabricated.

Notebook bytes and displayed outputs do not establish the kernel state that
produced them. Distinguish a saved/imported output, an observed run and a
successful independent reproduction. Reproduction requires an explicit action
and records a new activity. Opening, inspecting or restoring work executes
nothing. Credentials do not belong in retained requests or provenance exports.

Keep retained snapshots readable without the producer plugin. Meaningful changes
may be recorded alongside them, but reading an old result must not require
replaying a complete event stream. Use the existing recorder and persistence
services; do not add a parallel telemetry or recovery system.

## User experience and control

The lab notebook joins ordinary notes to retained work: what was tried, what
changed, why an approach was abandoned, and what is needed to continue. Rationale
is authored prose, not an inference from clicks. Capture observable metadata
during explicitly invoked operations without requiring duplicate entry or a
visual pipeline.

Provide links from a result to its inputs, method and relevant note; compare
alternative runs on request. Optional study and spaced review use the same
sources without treating all research questions as exercises.

Apply [Study lifecycle controls](ACTIVE_STUDY_DESIGN.md#archive-and-delete-studies)
to study-owned data. Provenance is not a reason to retain deleted private
content indefinitely. Archiving leaves content available and is not PROV
invalidation. PROV invalidation describes an entity becoming unavailable; it
does not itself erase files or define MRW's retention policy. Keep any minimal
deleted-target marker separate from retained mathematical content.

## First bounded implementation

First address the missing Study archive/delete controls independently of PROV
export. Then use one real SagePod/Jupyter investigation to test this profile:
retain two alternative calculations, their input and method revisions, outputs
and an explanatory note; reopen and compare them after restart. Export the
selected account without executing it or needing the producer plugin.

Acceptance requires correct relation directions and identities, preserved
revision-specific links, readable retained results, explicit missing context,
and a documented validation scope. Exercise one failed run and the deletion
boundary. Do not claim complete PROV conformance from a subset validator.

Zotero integration, CoCalc and Wolfram adapters, repository-based study imports
and data-analysis workflows remain unimplemented follow-on work. Compare their available interfaces
against this profile before adding new machinery; see
[related systems](RESEARCH_WORKSTATION_DESIGN.md#related-systems-and-reuse).
