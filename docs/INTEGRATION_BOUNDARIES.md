# Subsystem ownership and integration boundaries

This contract governs MRW's existing and future integrations. MRW connects
mathematical work across tools while respecting the system responsible for each
document, computation and service. Current capabilities remain those documented
in the [README](../README.md) and the individual workflows; this contract does
not claim that proposed adapters or synchronization features are implemented.
Where older task instructions prescribe a different ownership boundary, this
contract governs future work. Versioned release reports remain accounts of the
behavior and checks at their named versions.

## Ownership and delegation

The maintaining system owns its creation workflow, identities, format rules,
execution state and lifecycle. An MRW adapter may initiate an explicitly
requested operation through that system's supported commands, APIs or file
interfaces. It must not bypass the maintaining system or introduce a competing
template engine, editor, kernel manager, evaluator, job queue or database writer.
Putting a bypass in a plugin does not change this requirement.

Ownership concerns the operation and its contract, not which process physically
writes bytes. Opening an existing note or notebook in its appropriate VS Code
editor and explicitly editing and saving it is allowed. Calling the external
system's supported creation or execution command is delegation. Independently
creating a Zettel without its configured editor/template, rewriting a managed
database or fabricating a job's state is a bypass.

MRW owns its source notes, retained snapshots, annotations, associations and
provenance records. A retained copy has its own capture identity and does not
replace the external original or acquire authority over its lifecycle. Deleting
an MRW copy or association must not delete the original. Each subsystem remains
optional outside operations that actually require it.

| Subsystem | Responsibilities retained by the subsystem | MRW's integration role |
| --- | --- | --- |
| Zettelkasten or other notes application | Create externally maintained notes using its configured workflow; assign identities, filenames and templates; maintain its indexes. | Open existing notes, support native editing, copy selected source material and maintain explicit source associations. Optional creation shortcuts delegate to that same workflow. |
| Jupyter and the selected notebook editor | Create, edit, save and render native notebooks; select kernels and dispatch explicit cell execution. | Open notebooks through the host, retain selected saved results, associate notes and provide supported comparison/export. |
| SagePod | Supply the configured container, Jupyter server, SageMath environment and their lifecycle interfaces. | Use documented interfaces for authorized connection or lifecycle actions; record the environment actually used. No second SageMath runtime or container service. |
| SageQueue | Assign task identities; submit jobs; manage partitions, workers, resources, status, logs, cancellation and retries. | A future adapter may delegate queue operations and retain task references/results. It must not edit queue internals, invent status or maintain a competing scheduler. |
| Wolfram Alpha | Interpret and execute queries through its service. | A future adapter may submit an explicit query and retain its request, response and attribution. This is not notebook editing or formal proof checking. |
| Wolfram notebooks and engine | Maintain native documents, evaluate code and own execution state. | Delegate supported document/execution actions and retain selected results; do not substitute a new evaluator or notebook format. |
| Zotero | Maintain reference and attachment identities, bibliographic metadata and managed-library operations. | Use supported lookup, citation and attachment interfaces; retain separately identified copies. No direct writes to the live database or managed files. |
| Lean and its host extension | Elaborate and check proofs, report diagnostics and maintain native proof interaction. | Navigate to exact files/declarations, open the native InfoView and retain scoped checking evidence. No competing language client or assertion that a successful check proves an unstated informal correspondence. |

SageQueue and Wolfram adapters are not currently implemented in MRW. SagePod
connection uses the Jupyter extension; MRW does not currently start its container
or submit queue jobs. These are current capability limits, not a permanent ban
on explicit delegation through a future supported adapter.

## Source notes and externally maintained notes

Source notes remain useful working material. The reader may develop several
Zettels from one source note, or combine several sources in one Zettel. Linking
them must not require identical text, retire the source note or certify that the
Zettel is intellectually complete. Preserve the source revision used and allow
later work to develop independently. Human selection, formulation and links
between ideas remain distinct from copying and format validation.

For the maintainer's Zettelkasten, Obsidian and its configured template create
Zettels according to [flengyel/Zettel](https://github.com/flengyel/Zettel).
Other maintaining applications and formats retain their own rules. Existing
notes may be edited in MRW using native Save and Undo. Integration code must not
create a parallel route that writes new vault notes directly, reproduces the
template or bypasses its interactive steps.

The 0.23.30–31 exact-copy continuation remains an implemented transfer workflow.
It currently checks two exact insertions and makes the original read-only after
completion. That is not the source-to-Zettel relationship required here. Correct
it without discarding prior transfer records, original snapshots or links; do
not describe this design requirement as already delivered.

## Synchronization and referential integrity

Synchronization with the maintaining system is encouraged. Preserve usable
references as existing material is edited, moved or renamed. Prefer shared files
where both editors can safely use them; otherwise use the selected synchronization
service or the subsystem's supported interface. MRW should maintain its scoped
associations, not introduce a second general synchronization service.

Keep external logical identity, current location, content revision and MRW
capture identity separate. A verified rename can update a current locator;
an immutable citation still identifies the revision originally retained.
Use explicit identity mappings, supported notifications or deliberate relinking.
Do not guess by title, silently replace dirty buffers, overwrite conflicting
edits, recreate a deleted target or report an unavailable replica as current.
When automatic reconciliation is unsupported, report the limit and offer a
working relink/recovery route.

Synchronizing saved notebook files does not synchronize live kernel memory,
reconstruct a container environment or recreate queue execution state.
Refreshing a job uses the queue's identity and status interface; reconnecting a
kernel does not rerun it. Source notes and derived Zettels are separate works,
not replicas whose text must be synchronized.

## Execution and evidence

Ordinary opening, reading, synchronization, comparison and recovery do not make
MRW independently submit a computation, job, proof check, model request or
Wolfram query. Native editors retain their normal behavior: opening a Lean file
may trigger the Lean extension's elaboration and diagnostics. That is distinct
from an MRW-initiated Check or rerun. Scoped reads of metadata, external
identities and status may support synchronization without submitting work. An explicit Run,
Submit, Retry, Query or Check action may delegate the named operation. Make its
destination and scope visible and preserve the subsystem's confirmation and
resource rules. Do not retry an uncertain submission unless the subsystem's
idempotency contract or a verified request identity makes that safe.

Distinguish request preparation, dispatch, acceptance, running, completion,
failure and cancellation. Record only states the adapter can establish, with
their origin. A submitted request is not a completed computation; a retained
output is not an independently reproduced result. Keep external task/run IDs
beside MRW capture IDs when available. A hash verifies retained bytes, not
mathematical truth or the authenticity of a producer's account.

## Integration review and testing

MRW is an integration workbench. Use ports and adapters: core expresses the
needed capability; each adapter translates it into its subsystem's supported
operations. Keep the common model limited to references, captures, provenance
and observable outcomes. A query service, notebook editor and job queue need
different capability contracts, not an artificial universal create/run/sync API.

Each adapter supplies a compact, versioned contract:

| Contract item | Required statement |
| --- | --- |
| Ownership and capabilities | Responsible system, supported operations, authorized write/execution route, host/API versions and prerequisites. |
| Identity and scope | External logical ID, current locator, revision and MRW capture ID; selected workspace, account, kernel or queue as applicable. |
| Outcomes and recovery | What dispatch, acceptance and completion establish; correlation, cancellation, uncertain outcomes, safe retry and reconciliation. |
| Synchronization | Freshness, concurrent edits, conflict/rename/deletion handling, and limits when the owner is unavailable. |
| Observation | User-facing feature ID, instrumentation owner, availability/coverage, observable outcomes and unobservable intervals. |
| Inspection and repair | Bounded read-only checks, ownership of findings and supported recovery routes; inspection must not invoke a mutating sync operation. |
| Tests | Isolated targets and evidence for success, failure, cancellation, interruption and missing optional software. |

Missing optional software must not prevent unrelated MRW work. Lightweight
[usage recording](OPERATIONAL_USAGE.md) remains in core; the optional
[diagnostics plugin](DIAGNOSTICS_PLUGIN.md) owns periodic reports and their
presentation. Core integrity checks remain necessary without that plugin.

Use isolated vaults, workspaces, kernels, containers and queues for automated
mutation tests. Read-only identity inspection may establish the target; verify
it before focus changes, dispatch of work or writes. A fixture filename is
insufficient. Tests must not automate
the user's live authoring prompts, restart an unrelated kernel, submit production
jobs or delete external work. Exercise cancellation and uncertain completion as
well as the successful round trip. Keep component tests distinct from evidence
that the intended external workflow was exercised.
