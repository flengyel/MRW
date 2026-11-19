# Codex instructions

## Mathematical purpose

Use the [project purpose](README.md) when describing MRW. Research may begin
with an open question before there is a passage to cite. Document optional
study commands where readers use them. Opening a document starts no study.
Preserve submitted work, retained feedback, corrections and unfinished attempts.
A formal check applies to the declaration checked. A reader may use a supported
result without reconstructing its proof.

For requested orientation, begin with purpose and organization, central concepts
and results, a selected argument, its governing idea and then its details. A
focused question may start at any point. Use only available material; do not
invent a proof, formal artifact, prerequisite map or research frontier.

## Authority and task scope

Before changing behavior, read [VISION](VISION.md), [domain model](DOMAIN_MODEL.md),
[UX specification](UX_SPEC.md), the relevant subsystem contract and the
[design register](docs/DESIGN_RECONCILIATION.md). Use the register for current
requirements, unresolved work and acceptance evidence. Compare report findings
with those requirements through [Codex maintenance](docs/CODEX_MAINTENANCE.md).
Older prompts, completed tasks and roadmap entries do not authorize new work or
supply a competing priority order.

Intervening questions refine active work unless explicitly cancelled. Preserve
uncommitted changes, carry unresolved objectives forward and finish the authorized
scope. Fix confirmed data-loss defects first, then observed workflow blockers.
Do not expand infrastructure merely to produce another audit or require a new
human study session before fixing a demonstrated software defect.

## Documentation requirements

Apply the [documentation requirements](CONTRIBUTING.md#documentation) before
completion. Write purpose, current behavior, usage and meaningful limits;
verify examples and links, separate implemented capabilities from goals, and
remove obsolete plans and process narration. Record routine change and check
notes in commits, pull requests or issues, not new repository reports. Use
ordinary notes terminology; Obsidian and the maintainer's format are optional.
Preserve exact external names, quoted source text, saved records and links.

In GitHub and Obsidian Markdown, use `$...$` inline and put each `$$` display
delimiter on its own line. Use built-in commands such as `\gcd` for named
operators. For other upright names use `\mathrm{...}`. Avoid `\operatorname`.
Preserve fenced code, imported text and exact retained passages. Define
mathematical terms before technical use. Do not alter a mathematical statement
to simplify its presentation.

## Frontend and companion ownership

Use one MRW core VS Code extension in `vscode/` and the Python core in `src/mrw`.
Use `mrw` for the package, distribution and CLI, `MRW` for Lean, and
`flengyel.mrw` for the extension. Do not add previous-name wrappers, compatibility
readers, automatic old-state adoption or another frontend. Keep any explicitly
authorized one-time data conversion outside maintained source and installation
paths, preserve originals and never repeat a completed copy over later work.

Follow [integration boundaries](docs/INTEGRATION_BOUNDARIES.md). VS Code owns
ordinary documents, buffers, Save, Undo, recovery and layout. MRW owns its
commands, record views and explicitly designed private state; the Python core
owns record validation, exact request preparation and immutable publication.
Do not port Qt widgets, buffer recovery or layout rules into VS Code, rewrite
the frontend in TypeScript, add a remote-access service or introduce a Windows
persistence port without an authorized scope change.

External systems own their editors, templates, evaluators, kernels, queues and
managed databases. Delegate through supported interfaces and argument vectors,
not a shell. Preserve their identities separately from MRW captures. Missing
companions must not block unrelated work. Use Linux, WSL2 or Linux Remote SSH
workspace hosts; distinguish intended support from actual host observations.
Native Windows/macOS backend support requires its own validation.

Keep Zotero access read-only through its supported local API: no port forwarding,
direct database access or Zotero writes. Follow [Zotero](docs/ZOTERO_WORKFLOW.md).

For Lean, use the official extension's goals and diagnostics. Do not scrape
InfoView or create another language client. Local lesson packs supply content,
not executable hooks; preserve user working copies on updates. New lessons need
complete prose, explicit hypotheses, compiled solutions and isolated failing
practice examples. Follow [Lean study](docs/LEAN_STUDY_WORKFLOW.md) and
[lesson packs](docs/LEAN_LESSON_PACKS.md).

## Ordinary files, notes and navigation

Opening or following a document displays it; it creates no study or question
record and opens no exercise or registration form. Preserve Contents, contextual
commands, native preview, scoped WikiLinks, backlinks, exact Return locations
and the chosen pane layout. Resumption recovers existing work without requiring
a question, summary, next-action form or new schema. Native editors retain their
normal behavior, including Lean diagnostics.

Preserve dirty buffers, draft checkpoints, source locations, genuine annotations,
user-generated diagrams and unfinished work. Commit a Return pin only after
navigation succeeds; a failed or stale follow must preserve the preceding pin.
Changes to the selected notes folder must not redirect older references.
Neither copying Markdown nor synchronizing ordinary files transfers private
MRW targets or restores kernel state.

[Source notes and linked notes](docs/NOTE_COMPANIONS.md#develop-and-link-notes)
are independent works with potentially many-to-many associations. Preserve prior
links, attribution and snapshots. Do not require exact-copy transfers, special
markers, format validation or annotation retirement as proof of useful work.
Machine-suggested prose and links remain proposals. Keep MRW integration rules
out of an independent note-format specification.

For an Obsidian vault, New Note and reader-note continuation use the configured
Obsidian creation command and template. Verify vault identity, command
registration and workspace trust. Do not create a preliminary file, duplicate
title prompts, fill interactive template prompts, install a reduced template,
fall back to plain-file creation or retry uncertain dispatch. The application
owns filenames, prompts and Save. Non-vault folders use a blank VS Code editor.
Follow [Obsidian setup](docs/OBSIDIAN_WORKFLOW.md#new-note).

## Sources, graphs and rendering

Use qualified source IDs, such as `stacks-project:08ZH` and `kerodon:0004`,
through parsing, display, links, handoffs and persistence. A stable ID is not an
immutable revision. Retained citations preserve exact bytes, digest, revision,
scope, outline/region identity and scalar range. Preserve existing v1 references;
qualify them from verified provenance without rewriting genuine notes. Keep
Stacks Git provenance separate from Kerodon snapshots. Changed sources or
associations never redirect an earlier citation. Follow
[source identifiers](docs/SOURCE_IDENTIFIERS.md) and [source plugins](docs/SOURCE_PLUGINS.md).

Acquire sources only on explicit import. Offline viewing invokes no downloaded
code or producer plugin. Preserve exact source, licenses and original-page/saved-
text choices. Keep editable attributed annotations separate from retained source
and supplied evidence. Do not infer mathematical status from links or diagrams.

For [proof outlines](docs/PROOF_OUTLINES.md), identify the representation before
selecting regions. Declaration maps do not expose internal proof structure.
Preserve joint premises, alternatives, local scope, revision, explanation
attribution and expansion to original steps. Display simplification is not proof
checking. Keep the original graph and undo behavior intact.

Rendering must preserve source text and visible failure fallback. Keep annotation
math inert, macros isolated and older Unicode text intact. TikZ compilation is
explicit and isolated as specified in [TikZ](docs/TIKZ_WORKFLOW.md): no shell
escape, unrestricted fallback, workspace/home/network access or automatic retry.
Preserve resource limits, trusted-tool checks, restricted SVGs, UUID/code-digest
bindings, diagram indexes, prior output after failure and publication epochs.
Save, open, refresh, migration and theme changes must not compile diagrams.

## Storage, lifecycle and relocation

Use the existing artifact coordinator and publication rules. Preserve immutable
bytes, logical identity, verified earlier-reference mappings, conflict detection,
deletion markers and uncertain-outcome recovery. Settings are not authority to
move or adopt storage. Missing, incomplete or conflicted stores block access;
never initialize a replacement, merge occupied stores or infer identity from a
path or filename. Local writer exclusion does not coordinate computers.

Keep host bindings, locks, journals, reservations and runtime state outside
user-selected artifact storage. Require one writing installation and complete
verified synchronization before handover. Windows-backed private storage remains
unqualified; do not weaken checks or treat closing Obsidian/pausing sync as an
established remedy. Permissions, mounts and synchronization configuration need
separate authorization. Follow [saved-work storage](docs/ARTIFACT_STORAGE.md).

Workspace relocation verifies a complete candidate, publishes one durable
authority record and reopens on explicit request. Folder renaming uses verified
external placement and explicit reconnection. Prepare nested workspaces
separately. Do not transfer live drafts or unsent requests, guess editor pins,
edit live VS Code databases or move genuine work as a test. Follow
[relocation](docs/WORKSPACE_RELOCATION_DESIGN.md) and
[folder renaming](docs/FOLDER_RENAME_WORKFLOW.md).

User-invoked study and saved-source deletion preserve ordinary files, shared
sources, unrelated records and exports. Keep lifecycle epochs, pending-write
checks, tombstones and interrupted-operation recovery. Trash links open read-only;
import must not implicitly restore deleted sources or discard a reader draft.
Use [study lifecycle](docs/STUDY_LIFECYCLE.md) and [source Trash](docs/SAVED_SOURCE_TRASH.md).

Keep records from the removed document Problems workflow read-only. Accept late
draft checkpoints and failed-save retries, but reject stale creation, grading
and scheduling actions. Other explicit [study workflows](docs/ACTIVE_STUDY_WORKFLOW.md) remain separate.

Notebook captures preserve exact saved files and separate producer execution
accounts. They do not prove that current code produced displayed outputs.
Reopening, comparison, export and synchronization start no kernel, container,
queue or replay. Keep native Jupyter ownership and
[notebook provenance](docs/NOTEBOOK_PROVENANCE_PROFILE.md).

## AI and justification

Startup, restoration and viewing submit no model request, build, proof check or
kernel execution. API requests require exact selected context, complete frozen
UTF-8 preview and a separate Send action for each request. Companion clipboard
handoffs retain their explicit copy/import workflow; they make no API request.
Preserve unsent
requests, open drafts, attribution, inert returned content and immutable terminal
call records. Use deterministic injected transports in tests; never a live
provider request. Do not substitute another backend or automatically retrieve,
rewrite, summarize, project, admit or check a response.

Keep the bounded Responses adapter's fixed endpoint, environment-only credential,
redirect rejection, no-retry boundary and exact preview bytes. Preserve linked
continuation limits; no provider conversation state, `previous_response_id`,
automatic branching, tools or autonomous follow-ups. A returned explanation is
not hidden model reasoning; do not solicit or claim access to unreturned search,
alternatives or internal reasoning. Follow [reader AI](docs/READER_AI_WORKFLOW.md)
and the [UX contract](UX_SPEC.md#8-ai-generated-mathematics-and-machine-assistance).

Justification Logic is integral and task-triggered. Preserve the separation of
provenance, external verification, explicit scoped admission, non-factive
contextual derivability, informal/formal correspondence and human judgment.
Use immutable opaque claim versions, pure formulas, explicit versioned artifact
bindings and immutable contexts. Sum means alternative reasons, not confidence,
corroboration, independence or weight. No citation, check, digest, correspondence
or model response automatically becomes a premise.

The repository-owned `lean/` project supplies the calculus and checker. Python
validates exact bindings and renders Lean-generated bundles; it does not
reimplement derivation checking. Use that project's pinned toolchain, manifest
and compiler identity, not a neighboring project's executable or build cache.
Never hand-author a bundle claiming checked status or update a pinned manuscript
digest without inspecting the mathematical changes and updating its guide/tests.

Keep response review lossless, bounded, pageable, safely rendered and free of
network, tool, shell, pager or Lean calls. Verify response digests before display;
retain exact UTF-8 spans and attribution. Preserve linear passage scanning,
metadata bounds, reversible safe rendering and atomic synchronized no-overwrite
publication with inode/parent checks, mode `0600` and correct post-link cleanup.
Follow the [documentary specification](docs/JUSTIFICATION_LOGIC_EXPERIMENT.md#executable-offline-documentary-bridge)
and [bounded search](docs/JUSTIFICATION_ROUTE_SEARCH.md).

Projection creates a representation and documentary atom only; admission records
an explicit scoped premise without invoking Lean. Within the documentary bridge,
only `check-documentary` invokes Lean after strict Python binding validation, stamps its own
canonical time and enforces finalization ≤ admission ≤ check. Lean transport is
not a standalone provenance-hash validator. Keep documentary production distinct
from the mathematical assertion; relying on that assertion requires its own
explicit reason or reviewed bridge. Preserve earlier certificates under their
original context when admissions are withdrawn in a successor.

Keep runtime bundle digests in the external immutable Verification, and frozen
fixture digests in package metadata. Do not add factivity,
introspection, JAM/Fitting semantics, a corpus-wide warrant graph, provider IDs
in constant specifications, or trust/confidence/authority fields and AI-specific
support entities to this calculus slice. Inspection creates no admission. Synthetic fixtures establish
mechanics, not provider use or mathematical benefit.

Keep `ModelCall` and proposal records operational and provenance-only. Add no
epistemic, adoption or weight fields, generic support edges or provider-wide
production-to-truth bridges.

## Standalone application maintenance

When working on the Qt application, keep widgets separate from controllers and
services; apply worker results only through queued main-thread QObject slots.
Keep one shared text document/undo history and equal viewport widths for wrapped
views of that document. Preserve existing local-PDF page/zoom state separately
from text buffers and generated-build provenance. PDF opening never builds TeX
or fabricates a Verification.

Opening a project writes nothing inside it and reads no executable configuration.
Use canonical user-local state, coalesced recovery outside the keystroke path and
a test-only state-root override. Save/Save As perform conflict-checked atomic
replacement. Flush at durability boundaries; failed checkpoints block close/quit
unless the user explicitly discards work. Recovery deletion compares exact bytes
under lock and syncs the parent; failure blocks writes until reopen, without a
compensating rewrite. Native Windows directory-fsync and same-project concurrent
processes remain unsupported. Navigation anchors track loaded editable text and
undo only; keep path/revision/scalar bounds and a whitespace-normalized preview
of at most 120 characters. Publish recovery before pins and never guess changed
locations or use these anchors as model input.

Build only trusted project TeX through the accepted pdfTeX/latexmk boundary.
Out-of-tree staging is not a sandbox; preserve `openin_any=p`, `openout_any=p`, no
shell escape, quotas, process-tree termination and input-coverage provenance.
LuaLaTeX requires a separately authorized and verified sandbox. Keep generated
files outside the project and preserve the last successful PDF after failures,
marking stale inputs accurately. Typesetting success is not proof verification.
Do not introduce corpus-specific GUI behavior or change the existing bounded
manuscript CLI into a general importer. Follow [UX](UX_SPEC.md) and the
[development guide](vscode/README.md).

## Verification and delivery

Use [native-test isolation](docs/NATIVE_TEST_ISOLATION.md) before activation,
host-API patches, external dispatch or writes. Verify owned disposable vaults,
kernels, runtimes, queues, profiles and stores before mutation. Genuine notes,
open drafts, research stores and working windows are never test fixtures.
Model read-only host properties faithfully; writable doubles do not establish
native compatibility.

Run focused Node/bridge and Python tests for affected behavior. Shared-service
changes retain coverage for both callers; report unavailable checks. For Qt,
use actual widgets with `MRW_GUI_TESTS=1`; relevant visible changes require
1280×820 and 960×680 observations, not only offscreen tests. Preserve PDF,
Unicode/unsaved-selection, exact preview/Send, terminal statuses, inert-response,
projection, concurrent-edit and recovery regressions when their paths change.
A live integration corpus requires task authorization and remains read-only.

Documentation-only changes require link, example and consistency checks, not
GUI/compiler/full-suite runs. Do not claim mocks, offscreen checks, fixture
counts or synthetic receipts establish native use, independent reproduction or
learning benefit. Run one appropriate broader regression pass for code changes;
repeat only after relevant changes or a concrete failure.

Keep feature instrumentation lightweight and reports bounded through
[operational usage](docs/OPERATIONAL_USAGE.md) and the optional
[diagnostics companion](docs/DIAGNOSTICS_PLUGIN.md). Separate test activity,
observed actions, reader reports, AI assessments and derived estimates. Missing
coverage is not zero use, effort is not a diagnosis and low counts do not justify
automatic removal. Do not record unrelated application activity or export private
research through maintenance reports.

Complete authorized build, package, release and remote-integration work. Verify
repository revision, package/release and installation separately; publication
never authorizes installation into or forced reload of the working window.
Keep the Activity Bar version and tutorial synchronized with the package. Follow
[releasing](docs/RELEASING.md), preserve license notices and report material
remaining limits accurately.
