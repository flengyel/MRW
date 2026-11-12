# Codex instructions

## Revised Lean introduction — pack 1.1.0

The introduction now has three lessons: Functions and composition, Implication
as a function on proofs, and Dependent application. Define type-theoretic terms
before use; preserve the detailed typing and tactic arguments. The lessons share
unchanged examples and notes, with a separate variation/error for each lesson.
The original first lesson ID and filename remain. Ordinary updates preserve
working copies. See [the writing review](docs/LEAN_LESSON_REVISION_20261112.md).


## Delivered — recent notes folders, 0.23.14

Choose Notes Folder shows the current path and up to ten recent choices in this
workspace. Browse receives an explicit current/recent/workspace/home default;
opening the chooser does not grant scope or write settings. Only an accepted
folder selection changes the notes folder. Preserve cancellation, restart,
canonical-path checks, serialized settings writes and explicit save-failure
reporting. Tests use disposable workspaces; never point the working research
window at a test folder. The small PROV trial remains the next product priority.

## Delivery status

Do not equate implemented or merged code with a delivered extension update.
Complete the authorized build, verification, release and remote integration steps
before ending the task. Report remote main, package/release and installation
status separately; identify any unfinished stage explicitly. Preserve the working
window: publication does not authorize installation or a forced reload.
[0.23.15 delivery](docs/RELEASE_0_23_15.md) records the latest package.

## Delivered — reader-note controls, 0.23.12

Expanded passages place Add reader note, Delete reader note and Link Obsidian
note before Ask AI in one action row. Preserve passage scope, drafts, stale-write
rejection and external note files. TikZ rendering remains explicit after saving.
[Delivery and actual checks](docs/READER_NOTES_REPAIR.md) records the published release and incomplete
native desktop acceptance. This repair does not implement the shared-history,
Zotero or PROV follow-ups below.

## Implemented — Zotero reference and attachment linking

The local API workflow finds references in a chosen personal or group library,
retains metadata and exact attachment bytes, inserts citations in ordinary notes,
and reopens retained references offline. Windows/WSL uses Windows loopback through
bounded read-only interop; no port forwarding, database access or Zotero writes.
Preserve dirty notes, immutable earlier citations and the existing PDF/Return path.
Study deletion does not own the Zotero records. See
[workflow](docs/ZOTERO_WORKFLOW.md) and
[delivery checks](docs/ZOTERO_DELIVERY.md).
Included in the 0.23.13 VSIX. The small PROV notebook trial is next; no general
PROV exporter was added here.

## Implemented — configurable shared usage history

The shared-history increment extends the existing recorder and Inspect/Export
workflow. Configure History explicitly imports and verifies a chosen directory;
private originals remain. Separate immutable writer batches, bounded pending
publication, conflict reporting and deletion markers protect offline use.
Active studies, drafts, scheduling and the source store remain host-local.
See [the workflow](docs/USAGE_HISTORY.md) and
[delivery checks and limits](docs/SHARED_HISTORY_DELIVERY.md).
Shared history and Zotero are included in the 0.23.13 VSIX; the small PROV
trial remains next.


## Delivered implementation — Study lifecycle

Saved Studies now have Archive/Restore, Trash/Undo and explicit permanent
deletion. Native row context actions and Command Palette pickers use the existing
study/history stores. See [docs/STUDY_LIFECYCLE.md](docs/STUDY_LIFECYCLE.md).
Preserve pending-write checks, lifecycle epochs, deletion recovery and opaque
tombstones. Shared questions/snapshots, source annotations, ordinary files and
other studies are protected. Test deletion only on disposable records.

The design section below records the requested scope. Zotero reference and
attachment linking followed the lifecycle increment. The small PROV trial
should next retain two alternative calculations through restart, comparison and
provenance export; it remains unimplemented.


## Current design — W3C PROV and Study lifecycle, 2026-11-10

MRW's direction combines continuing mathematical study with a research lab
notebook, ordinary linked notes, computation and formal proofs. Use W3C PROV
as the common provenance model for future integrations; see
[the provenance design](docs/PROVENANCE_DESIGN.md). VisTrails is a design
reference, not a new runtime dependency.

The implemented lifecycle contract is
[Archive/Delete Studies](docs/ACTIVE_STUDY_DESIGN.md#archive-and-delete-studies):
archive/restore, Trash/Undo and explicit permanent deletion of study-owned
content, with shared sources, ordinary files and other studies preserved.
It remains independent of a general provenance engine. Earlier preservation rules
forbid unsolicited deletion; they do not prohibit these user-invoked controls.

The lifecycle commands are implemented as described above. PROV export remains
a design goal. No genuine study was deleted during implementation. Preserve the delivered
source plugins and Lean study unit. Consult
[related systems](docs/RESEARCH_WORKSTATION_DESIGN.md#related-systems-and-reuse)
before duplicating existing capabilities.

[Zotero integration](docs/RESEARCH_WORKSTATION_DESIGN.md#zotero-integration)
is an explicit requested feature: connect the existing library's references and
attachments to MRW notes, retained sources and citations. Its first local API
workflow is implemented above. Study archive/delete and Zotero are independent.


## Delivered — optional Lean study, 0.23.10

**Study Lean 4…** opens a completed companion unit for *Theorem Proving in Lean
4*, a user-owned core-only project pinned to 4.33.0 and the official extension's
native InfoView (`lean4.displayGoal`). Resume preserves the copied lesson,
code selection and notes; Return uses the existing exact document pin. In WSL,
Lean/elan and `leanprover.lean4` belong on the Debian workspace host. Ordinary
activation does not start Lean. No quiz, new record form or AI account is required.

Keep the installed integration separate from declarative content API 1.
Explicitly registered local packs load without a VSIX rebuild; they supply data,
not executable MRW hooks or new language integrations. Do not overwrite working
copies on pack updates. The lesson, notes and code remain ordinary files.
See docs/LEAN_STUDY_WORKFLOW.md and docs/LEAN_LESSON_PACKS.md.

Preserve the independent source-reader/plugin work below. Native goals belong
to Lean; illustrated lesson states are explanatory, structural checks do not
check mathematics, and compiler success does not establish informal correspondence.
Do not scrape InfoView or create another Lean language client. New units require
complete prose, explicit hypotheses, compiled solutions and isolated failing
practice files. Later course topics are a sequence, not authorization to ship
empty units. Preserve the working window, genuine source store and research data.


## Delivered — shared readers and source plugins, 0.23.9

Preserve the completed MRW rename and all genuine records. The source API 1
workflow is documented in docs/SOURCE_PLUGINS.md and docs/NLAB_WORKFLOW.md
(paths relative to the repository root). Keep direct native Stacks Project and
Kerodon buttons, explicit Original page/Saved text switching and proof frames.
New acquisition uses the plugin registry. Saved plugin snapshots reopen without
executing their producer; upgrades do not move notes or reparse saved content.
nLab is a named-page adapter; its website refuses embedding. Clowder and PreTeXt
remain unimplemented candidates. Preserve the working window.


## Delivered — complete MRW rename, 0.23.8

The user explicitly requires MRW throughout the active project: `src/mrw`, Python
distribution/module/CLI `mrw`, Lean namespace `MRW`, and extension `flengyel.mrw`.
Do not preserve an earlier backend name, add a renamed wrapper, or conceal names
through encoding. No earlier-identity aliases, readers or evidence remain in the maintained tree. Preserve originals outside active project and installation paths, and preserve
notes, drafts, source pins and saved research. Verify both installed entry points and the extracted
VSIX; documentation-only checks do not cover this rename.

## Delivered ordinary reading behavior

Reading repairs preserve these rules: Contents identifies a different active file,
WikiLinks support scoped paths and exact heading/block targets, titles arrive
progressively, and Reopen Document restores an exact Markdown selection.
Ordinary-note macros and explicit isolated TikZ rendering preserve original bytes.
See [reading repairs](docs/READING_REPAIRS.md).

The user rejected the document Problems interface. Its commands, preview,
toolbar, Contents and welcome entry points and document-study creation path
are removed. Opening/following a note displays that note. Do not restore
these forms under a different label or make a problem record a reading requirement.

Opening/following a document never creates a problem record or launches an
exercise form. Questions, solutions and commentary can stay where written,
connected by ordinary links. Add an interaction only to remove a demonstrated
obstacle without duplicate entry. Do not replace Problems with Research Question
registration. Resumption first recovers existing documents, supported locations
and unfinished work; it requires no new question record, summary/next-action
form or Research view. These rules supersede conflicting earlier prompts.
No next feature increment is authorized merely by the roadmap.

Preserve existing saved records, linked owners, drafts, source references and
history. Earlier document-linked work reopens read-only in the existing viewer,
with Return and history/export available. Accept late draft checkpoints and
failed-save retries; reject stale creation/grading/scheduling actions. No deletion or unrelated storage migration. The explicitly requested naming
upgrade preserves originals through external one-time conversion and existing MRW citations. Other explicitly invoked study/proof tools remain separate.

Preserve the delivered opening, title, scope, Return and pane-placement repairs,
native Commands buttons, note preview, WikiLinks and Obsidian interoperability.
VS Code owns dirty buffers, Save, Undo and layout. Verify the release without installing into or reloading the working window. General research resumption and argument
reconstruction remain later work; they must start from an observed task, without
adding another registration form. [Current rules and delivery](docs/ORDINARY_WORK_RULES.md).
[Delivery](docs/DOCUMENT_PROBLEMS_REMOVAL.md).

## Extension identity — 0.22.0

The workstation extension is `flengyel.mrw`, packaged as `mrw-0.22.0.vsix`.
The user explicitly chose a fresh extension namespace. Do not add a compatibility
extension, URL forwarding, automatic old-state adoption or dual installations.
New `vscode://flengyel.mrw/…` links use the current authority.
The complete MRW rename includes the backend, CLI, Lean namespace, packaging and
documentation. Earlier data is converted by a separate one-time operation outside the
maintained tree. The running application accepts only MRW formats and names.

The user separately requested preservation of the annotated Hausdorff source.
That source, its two annotations and rendered diagram are restored in the new
workspace through a completed one-time verified copy and existing store binding.
Do not repeat the copy or replace later edits with the old source store.
Do not repeat that earlier study copy or mutate mathematical prose.
The current full rename authorizes one-time conversion outside the maintained
tree, preserving originals. It prohibits compatibility readers in the application. Keep original notes available on disk. Preserve the working
window; install without forcing a reload. The current one-time conversion is explicitly authorized and remains outside
maintained source and installation directories. [Identity task](docs/EXTENSION_IDENTITY.md).

## Published source identity and retained citations — 0.21.0

Use the complete qualified identifier, for example `stacks-project:08ZH` or
`kerodon:0004`, in document links, backlinks, reader navigation and new research
records. The prefix identifies the source; a bare tag does not distinguish
corpora. Preserve the prefix across parsing, display, copying, handoffs, saving
and resumption. Do not derive authority from a link label or silently strip the
prefix when passing through another component.

**A stable source identifier does not identify an immutable revision of its
contents.** A retained citation must also preserve the source revision and exact
passage, including the retained bytes, SHA-256, scope, outline/region identity
and scalar range. A canonical website URL or qualified tag alone cannot replace
that citation. Stacks Project Git provenance and Kerodon page-snapshot provenance
remain distinct. Updating either upstream item never redirects an earlier
retained passage to current text.

New published-source citations use qualified `mrw-outline:v2` links. Existing
`mrw-outline:v1` links remain valid; qualify their identity from verified retained
provenance when needed, without rewriting genuine notes or source records.
nLab now uses source API 1; its limits are documented in docs/NLAB_WORKFLOW.md. Read
[SOURCE_IDENTIFIERS](docs/SOURCE_IDENTIFIERS.md) and
[the import workflow](docs/STACKS_WORKFLOW.md) before extending source adapters.

## Implemented document integration — 0.20.0

The existing-document task is implemented in the native host frontend. See
[workflow](docs/READING_OUTLINE_WORKFLOW.md) and
[validation](docs/EXISTING_DOCUMENTS_VALIDATION.md) for selected scopes, exact
ordinary-return pins, PDF delegation, backlink bounds and delivery evidence.
Continue with general research resumption after this delivery, then argument
reconstruction. Do not repeat the terminology or existing-document increments.
Retained-source authority and private-store qualification remain independent of
ordinary external-file access. Preserve the working window and genuine data.

## Delivered repair — study continuity and evidence, 0.19.1

The implemented handoff is [CODEX_STUDY_RELIABILITY_PROMPT](docs/CODEX_STUDY_RELIABILITY_PROMPT.md),
supported by [MRW_019_REVIEW](docs/MRW_019_REVIEW.md). Preserve its repairs,
the delivered interaction and shared source,
attribution and persistence invariants. Older delivered priorities below remain
context, not instructions to repeat completed work. GPTWork reviews and writes
handoffs; local Codex implements in VS Code connected to WSL2.

## Delivered task — study feedback and public preparation

Follow [CODEX_STUDY_FEEDBACK_PROMPT](docs/CODEX_STUDY_FEEDBACK_PROMPT.md) and the
current CODEX_PLAN.md section. MRW 0.19.0 implements the next increment: it fixes
how attempts/corrections support reports and adaptations, retains attributed
companion feedback beside the attempt, and simplifies first use. Public README,
installation and exposure review work proceeds alongside it. These priorities
supersede older completed increment instructions below; shared persistence,
source and attribution invariants remain applicable.

Do not wait for a new human study session to repair the identified code defects
or implement the requested interaction. Public preparation does not authorize a
visibility change, publication, history rewrite or disclosure of private data.

## Delivered active-study increment — 2026-11-05

The user now authorizes source-focused study with frequent attempts, light
rescheduling and cognitive-load tracking. Record meaningful MRW interactions
for both present-session adaptation and evaluation across software versions.
Read [ACTIVE_STUDY_DESIGN](docs/ACTIVE_STUDY_DESIGN.md),
[LEARNING_RESEARCH](docs/LEARNING_RESEARCH.md) and the
[implementation prompt](docs/CODEX_LIGHT_STUDY_PROMPT.md).
These control this increment where older priority/feature-status passages
below differ; shared source, attribution and persistence invariants still apply.

MRW 0.17.0 already implements the proof-study handoff/import/correction/resume
workflow and fixes the two reported data-handling defects. Do not repeat it.
Make study begin from current supported material, with graphs optional.
Keep recall scheduling, reported mental effort, observed behavior and
mathematical assessment separate. Sparse optional effort reports are authorized;
they never become prerequisites for work. Detailed local event capture is
authorized for meaningful MRW interactions, with version tags and inspect/export,
not unrelated applications or passive inference of comprehension.
Use the existing scheduler/model ecosystem; CHREST is research context, not a
runtime dependency. Complete the bounded interaction without creating a
curriculum engine, telemetry service or another frontend.

The 0.18.0 interaction is implemented within `docs/ACTIVE_STUDY_WORKFLOW.md`;
`docs/ACTIVE_STUDY_VALIDATION.md` records its evidence and limits. Repository
visibility is unchanged. For subsequent work, use
the current user's selected material; older Marcus/Appendix/Stacks examples
are not mandatory acceptance gates.

## Existing implementation and retained invariants

Mathematical Research Workstation is the user-facing system being developed from the MRW experimental prototype.

The project should help people work with mathematics whose justification exceeds
their present understanding, while making further understanding possible
wherever it can. Follow VISION.md's distinction between epistemic, practical,
explanatory, and organizational benefit. Evaluate each on its own evidence;
neither full proof reconstruction nor eventual human comprehensibility is a
universal acceptance condition. Preserve the separate scopes of provenance,
verification, non-factive derivability, and human judgment. This design principle
creates no automatic truth or comprehension status and no new implementation
claim.

Uses include gaining access to mathematical literature, investigating questions,
reconstructing arguments and resuming unfinished work. Connect orientation,
needed prerequisites and cumulative study to calculations, proof attempts and
research documents. Preserve
source locations and distinguish source assertions, proposed dependencies,
checked correspondences, and human synthesis. Do not promise complete
prerequisite maps, effortless mastery, or a verified research frontier. Assess
reduced search and reconstruction effort only from actual work; no summary or
exercise quota demonstrates benefit. Marcus's *Number Fields* was an earlier
bounded study source, not a required starting point for current work. This
purpose adds no implemented guidance capability and does not authorize general
corpus ingestion or automatic source retrieval.

The VS Code extension is the active frontend migration target, explicitly
authorized on 2026-10-13. Its first increment lives in `vscode/`; read
`vscode/README.md` for its boundaries and development launch.

Extension 0.12.0 adds explicit folder-rename preparation and reconnection for a
single-project store in a single-folder workspace. Read
`docs/FOLDER_RENAME_WORKFLOW.md` and its validation report. Preparation uses the
existing verified artifact transaction to place saved work outside the folder;
after an ordinary file-tool rename, reconnection explicitly maps the verified
store to the reopened project. Host-local shortcuts are locators, never authority.
Keep immutable source paths, exact references and attribution. Do not transfer
live drafts, unsent requests or guessed editor pins, merge occupied stores or
infer a project from filenames. Prepare nested study workspaces separately before
a parent rename. The user's real checkout and genuine Stacks study remain in
place; implementing/testing this feature does not authorize moving them.

Prioritize simplicity and interoperability: retain one VS Code extension and
the existing Python core in the workspace environment. Use standard local Linux,
WSL2 and Remote SSH to Linux extension hosts. Windows VS Code connected to Linux
is an intended arrangement; native Windows backend portability remains deferred.
Scoped installed-VSIX checks pass on Windows VS Code with WSL Debian and with
Remote SSH to a Raspberry Pi 5 running Debian 12 ARM64. Other Linux SSH hosts,
local Linux desktop use and other Raspberry Pi OS/ARM configurations require
separate validation. Distinguish actual host results from intended support.
Do not introduce a TypeScript rewrite, a remote-access service
or a Windows persistence port. Ordinary reading/outlining requires Python 3.11+
on the workspace host, without Lean, SageMath, containers or a provider.

Frontend ownership is explicit: VS Code owns ordinary text documents, editing,
saving, undo, and document recovery. The extension owns its commands, read-only
record views, and explicitly designed private research state. The independent
Python core owns research-record validation, exact request preparation, and
immutable publication. Do not port Qt buffers, widgets, recovery checkpoints,
menu implementations, or layout rules into the extension. Qt-specific instructions below apply
when maintaining the standalone application; shared record and evidence
invariants apply to both frontends. PDF, Lean, LaTeX, and notebook capabilities
provided by other VS Code extensions are not implemented MRW capabilities.

The extension implements record actions, return markers, explicit Lean/browser
handoffs, R2 exact preview/Send, and bounded R3 continuation, restart resumption
and R3.1 ending. The extension's independent private investigation pointer is
specified in `vscode/README.md`; it does not import Qt workspace/recovery state.
Extension 0.11.0 adds direct AI access from a retained reader passage through
the existing OpenAI connector. Resolve the existing scoped reference in the
Python core; preserve source revision, outline/region identity and exact scalar
range, including an earlier changed/removed association. Include only that
retained source quotation initially, excluding reader annotations and supplied
evidence. Keep the exact preview and separate Send, existing terminal records
and attribution. Reader clicks and preparing questions make no provider request;
never substitute Copilot or another backend automatically. Preserve open reader
drafts and existing unsent requests. No automatic annotation/prose rewrite,
proof status or AI-generated graph is supplied. See `docs/READER_AI_WORKFLOW.md`.
The offline source-region reader retains exact UTF-8 sources and optional
supplied evidence separately from editable attributed reader annotations. It
supports informal books/articles and AI-generated or AI-assisted manuscripts
without Lean. Read its persistence and format bounds in `vscode/README.md`.
The explicitly authorized 0.8.0 Stacks section importer uses one official
Git-revision-pinned source/tag-map acquisition route. It adds published
statement/proof regions, restricted bundled MathML and local explicit citations
to the same source reader; exact TeX, license and provenance remain retained.
Only explicit import acquires the network. Offline reading, annotation and
retained citation navigation execute no downloaded TeX or other tools.
See `docs/STACKS_WORKFLOW.md` and `docs/STACKS_VALIDATION.md`. Whole-corpus
ingestion, complete proof graphs and vertex elimination remain deferred.
The MRW Activity Bar container owns the default placement of the existing Reading
Outline and Research Tools views. Keep their IDs, the native view-title **…**
menu and command-palette access. Opening the container launches no service or
source acquisition; respect VS Code's saved user view placement.
Patch 0.9.3 renders explicitly delimited annotation equations with the bundled
KaTeX auto-render helper and restricted native MathML. Keep prose inert, exact
annotation text editable/available, attribution separate, macros isolated per
expression and failure fallback visible. Rendering never rewrites saved notes
or invokes a TeX process, network service or checker. Preserve older Unicode
annotations; only an explicitly requested annotation edit changes their text.
Published proof cards have visible Show/Hide controls and a Hide proofs / Show
proofs reading toolbar. Keep the workspace's initial proof-visibility preference
in host-local UI state; individual expansions are live view choices. Direct
proof navigation reveals its exact destination. Preserve source records and
drafts. This presentation supports reader-supplied/developing deductive outlines;
explicit inference graphs and vertex elimination remain planned.
Patch 0.9.4 gives hidden published proofs one compact reveal row, with no empty
proof card, and makes the saved Reader notes display a native disclosure that
starts closed and preserves its live open/closed choice across replies. Folding
notes must never delete them or close their separate editing forms. Keep private
screenshots of actual annotations outside Git.
Extension 0.10.0 adds explicit TikZ rendering for saved reader annotations. Read
`docs/TIKZ_WORKFLOW.md` and its validation report. Only Render diagram invokes
the Linux/WSL pdfLaTeX/Poppler job in bubblewrap; no compiler on Save, open,
refresh, restore, theme changes or artifact migration. Fail if isolation or
trusted system tools are unavailable, without an unrestricted fallback. Keep
shell escape disabled, external workspace/home/network access unavailable,
process/output limits and the restricted self-contained SVG profile. Native
Windows backend rendering and a bundled WebAssembly engine remain unsupported.
Pin retained SVGs to annotation UUID and exact UTF-8 code digest in the separate
diagram index, using existing immutable blobs and mutable publication rules.
Include the index in supported artifact moves; preserve epochs and workspace
checks. Failed rerenders preserve prior output; uncertain publication blocks
writes. No automatic annotation rewrite, compiler retry, diagram-to-proof graph
conversion or checked status. Paper/Dark is host-local display state and keeps
the original SVG and other colors. The user clicked Render again in the TikZ
trial workspace; preserve it and do not reset/reseed it automatically.
Patch 0.9.2 keeps annotation forms and region editing out of the source reading
sequence. Direct statement/proof links use only explicit published roles within
one retained import and exact matching spans. Temporary proof expansion is live
view state, not a source-record mutation. Keep changed associations from
redirecting those links; do not infer proof pairings or mathematical status.
Annotation-save feedback must follow confirmed core publication. Preserve newer
in-flight edits and report that they remain unsaved; uncertain publication must
not show success or retry. Keep open note editors and their drafts across replies.
The reading workspace now contains a user-requested, Codex-attributed explanation
on the retained 08ZG proof. Preserve that genuine study annotation and the existing
workspace identity; do not treat its retained store as disposable test data.
Patch 0.9.1 addresses the installed reading-presentation blocker: concise
navigator labels, expanded source reading through host layout commands, source
content before collapsed tools, and direct focus on exact matching published
passages. Return restores the overview and navigator. Keep original pinned-text
fallbacks for changed or incompatible associations and preserve all note/source
bytes. Do not turn navigation links into mathematical status.
Patch 0.11.1 commits a reading-outline return pin only after its source opens.
Track both the current origin and in-flight candidates through document edits;
a failed follow must not replace the previous source's return occurrence.
Overlapping edits still block return until exact undo restores the pin.
Extension 0.9.0 adds a collapsible Reading Outline view derived from one selected
ordinary Markdown overview, including unsaved text. Headings select exact editor
locations; existing scoped references open retained sources/passages and preserve
the originating occurrence for return. No prose copy or new reference format is
stored. Navigation preferences and exact return pins use host-local workspace
state. See `docs/READING_OUTLINE_WORKFLOW.md` and its validation report. It adds
no inferred dependency, proof graph, vertex elimination or comprehension status.
The first manual overview across sources uses ordinary Markdown with explicit
insertion/following of scoped saved-outline references. Region links pin the
retained revision and exact range; changed associations never redirect earlier
prose. VS Code owns overview editing, undo, recovery and preview. References
create no checked dependency or proof status. Copying Markdown alone does not
transfer private outlines or retained sources.
The 0.6.0 Obsidian companion adds explicit external outline/passage links and
private pinned note associations; read `docs/OBSIDIAN_WORKFLOW.md`. Obsidian owns
its existing Zettel notes and attachments, including handwritten work. Store
only URLs, labels and exact references, using existing mutable publication rules.
Keep workspace routing separate from target identity; wrong windows must not
resolve against unrelated private storage. Preserve existing `mrw-outline:v1`
links. No note conversion, vault indexing, automatic rewriting or synchronization
is implemented. Treat the Euclid material only as a navigation fixture; no new
exercise or study session gates this delivery. See `docs/OBSIDIAN_VALIDATION.md`
for desktop results and limitations, separate from mathematical usefulness.
Patch 0.6.1 clarifies reader labels, link directions and exact target scopes.
Show the stored note label without inspecting the vault for titles. Preserve
current versus earlier pinned ranges. The user reports practical benefit from
the Zettelkasten integration; record that report separately from broader
mathematical-usefulness claims.
Scoped actual-host checks use deterministic responses. Proof-outline vertex
elimination remains planned. Follow the bounded migration handoff. Use Windows VS Code
connected to a WSL2 checkout for Windows development; run Python and the
workspace extension in WSL. Native Windows Send is currently unsupported.

Extension 0.7.0 permits an explicit transactional move of this workspace's saved
sources, outlines, annotations, retained evidence, note associations and required
investigation records. Read `docs/ARTIFACT_STORAGE.md` and its validation report.
Keep authority in one host-local binding, with journals, locks, reservations and
runtime state outside user-selected artifact storage. Preserve logical store
identity, verified mappings for earlier references and exact immutable bytes. Settings
must not bypass migration. Missing/incomplete/conflicted stores block access;
never initialize replacements or merge stores. Local writer exclusion does not
coordinate computers. Require one writing installation and complete verified
synchronization before handover. The current `/mnt/c` mount fails private-mode
checks and is unsupported; displayed modes without metadata do not establish
effective Windows access. Read `docs/WSL_ARTIFACT_STORAGE_SETUP.md` for the scoped
metadata/ACL trial separately authorized and configured on 2026-10-20. A local
fixture move/save/reopen passed, but nested probe replacement denials remain;
it is not real-store qualification or cross-machine synchronization acceptance.
The separately approved comparison in `docs/WSL_ARTIFACT_STORAGE_COMPARISON.md`
ran once: 3/4 probes passed before, 4/4 paused, 3/4 resumed; the Windows folder
was independently verified unpaused afterward. This does not prove causality
or qualify paused writing. The subsequently approved paused transaction check
stopped at its first test: the same preflight `os.replace` EACCES occurred before
commit. Synchronization/configuration were restored and independently verified.
Pausing is not a qualified remedy; do not repeat this bounded attempt, weaken
checks or move real work into this setup. Do not change permissions/mount/sync
configuration without separate authorization. The standalone Qt storage/recovery
is unchanged.
The user subsequently requested one test with Obsidian closed: zero Obsidian
processes were verified before/after, Syncthing stayed unpaused/unchanged, and one
disposable move/save/reference case passed. This does not prove causality,
necessary closure or real-store qualification. Read the latest validation and
handoff; do not turn the single success into a supported procedure.

The existing editor-centered Qt GUI remains available as
`mrw gui [PROJECT_DIRECTORY]`. Use `mrw` for the Python package, distribution and CLI, and `MRW` for the Lean
namespace. Earlier technical-name preservation instructions are superseded. Open Project Directory is the principal entry: show the
actual directory tree lazily and open ordinary mathematical files as buffers.
External references are read-only. No attachment step, preliminary form or
mathematical metadata questionnaire is required. Mathematical content belongs in
ordinary files.

All projects, navigation, files and persistence are corpus-independent.
`rs_Appendix_A.tex` opens like any other file. Add no Appendix-specific production
imports, navigation, corpus selector, study-guide option, adapter registry, saved
capability identifier or integration machinery. Preserve the existing
Appendix-specific CLI and its source checks. Corpus-neutral format and tool
integrations are permitted when invoked by direct user action.

R1 provides a read-only existing-PDF path through ordinary file actions. Keep PDF
identity and page/zoom state separate from generated-build provenance and text
buffers, recovery and anchors. Preserve work notes on PDF loading failures or
changed content. Opening or restoring a PDF never invokes TeX or creates a
Verification. Use the focus and restoration semantics in UX_SPEC.md; no imported
PDF may be represented as a fabricated successful build.

The standalone Qt GUI uses PySide6 Qt Widgets and QtPdf. Keep widgets separate
from the controller, record validation and persistence services. Neither toolkit, schema
version nor pane arrangement is a permanent domain invariant. Format-aware
behavior must preserve source integrity and the distinction between editable
text, rendered output and retained records.

The user-requested proof-outline increment is specified in
`docs/PROOF_OUTLINES.md`: vertex elimination with visible claims, explanations,
and expansion to the original steps. Preserve joint premises, local scope,
source revisions, and explanation attribution separately from proof evidence.
Identify the proof representation before selecting regions; declaration maps
do not expose internal proof structure. The preferred frontend trial is one
VS Code extension over the independent services; the editor owns its documents
and undo. Choice of an open-source distribution is deferred. Vertex elimination
remains planned. The extension provides shared record actions, R2 exact preview/Send, and
explicit proof-source and browser handoffs, plus the first manual offline
source-region reader. It supplies no verified inference graph or elimination.
Follow the bounded roadmap and handoff without making ordinary work
depend on Lean or a new warrant.

The shared Qt plain-text document has one layout width. When two visible panes
show that document with wrapping enabled, keep their editor viewport widths
equal through splitter movement and geometry changes. Different buffers and
unwrapped views may have unequal widths. Preserve one document and undo history;
this is a Qt presentation constraint, not a domain invariant.

Unfinished-work and Working context anchors are private mutable navigation state.
Only anchors attached to loaded editable ordinary text follow workstation edits
and undo/redo. Their persisted fields are path, revision, scalar endpoints and a
plain whitespace-normalized preview bounded at 120 Unicode characters. Render
them without source reads; validate explicit navigation before moving a pane.
Publish recovery before updated pins. Deleted passages and known external
changes must not acquire guessed locations or replacement revisions. These aids
never relocate immutable mathematical or documentary records or supply model input.

Opening or viewing a project must not write inside it or read executable
configuration from it. Mutable session state, trusted tool settings, private
unsaved-text recovery and build storage belong in OS user-local application
storage keyed by canonical project identity. Provide a test-only state-root
override. Keep edits in memory and coalesce recovery writes outside the
per-keystroke path. Recovery preserves the latest successfully completed
checkpoint, not characters that were never checkpointed. Flush synchronously at
durability boundaries. Explicit Save
and Save As alone write ordinary editor files, with revision-conflict detection
and atomic replacement. A failed checkpoint must block close and quit unless an
informed user explicitly discards the session. Use the separate
mutable-file service; preserve immutable-record publication unchanged.
Recovery deletion must compare exact expected bytes under the publication lock
and synchronize the parent directory before reporting success. Any failed or
uncertain deletion blocks workspace writes until close/reopen; never compensate
with a recovery rewrite. Directory-sync errors must remain visible. Native
Windows has no implemented portable directory-fsync boundary, so crash-durable
mutable publication is unavailable there.
Different projects may be open in different workstation processes. Concurrent
workstation processes for the same project are unsupported because no
interprocess lifetime lock exists. Add such a lock only in a separately
authorized concurrency change.

Startup, opening, restoration and viewing invoke no compiler, checker, external
editor, notebook kernel, model or network. LaTeX build, external-editor and
Jupyter handoffs require explicit actions and argument vectors without a shell.
Editor templates supply the saved file and current line/column; compare disk
revisions on return without replacing dirty text. TeX root selection is an action
on an existing file. Out-of-tree staged builds execute trusted project TeX with
trusted tools; staging is not a sandbox. openin_any=p is defense in depth for
conventional input operations, not a complete read boundary. In particular,
`\immediate\pdfobj stream file` can embed an absolute external file in the PDF;
arbitrary external reads are not confined. Build only trusted project TeX.
Preserve openin_any=p, openout_any=p, no shell escape, and the accepted
pdfTeX/latexmk engine boundary. LuaLaTeX is unsupported. Enabling it requires a
separately verified OS sandbox and a separately authorized change.
Generated build files remain outside the project and are quota-monitored.
Builds are unavailable on native Windows/macOS until equivalent process-tree
termination and resource controls exist. Qt/runtime and TeX prerequisites are
platform-dependent. Capture
build provenance from the invocation, preserve the last successful PDF after
failure, and mark it stale when recorded input revisions change. Retain observed
outside inputs and explicit dependency coverage (complete, partial or unknown).
When toolchain/package revisions are untracked, say only “recorded project
inputs unchanged.” Typesetting
success creates no mathematical Verification, admission, derivation or judgment.

Justification logic is integral and task-triggered. The contextual inspector
faithfully exposes existing ClaimAtomVersion, PremiseAdmission,
JustificationContext, JustificationDerivation, associated Verification and
provenance separately. Inspection creates no admission and infers no human
decision. Ordinary work requires neither Lean nor existing warrant records.
Do not redesign the calculus, add JAM semantics or invoke Lean automatically.

For extension changes, run the applicable Node command/bridge tests and shared
Python service tests. Validate affected host workflows in an actual Extension
Development Host when available; API doubles do not establish host acceptance.
Follow `vscode/README.md` for setup and checks. Do not require Qt installation
for extension-only changes. Shared-service changes retain regression coverage
for both callers, with unavailable Qt checks reported explicitly.

For Qt changes, exercise toolkit-independent controllers and actual Qt widgets with
`MRW_GUI_TESTS=1` (an offscreen Qt platform can run widget tests).
Use ordinary test documents; no test-only controller subclass may stand in for
the GUI. When changing widgets, exercise the affected user workflow visibly at
1280×820 and 960×680. Preserve R1 regression coverage for a local PDF beside an
editable note, keyboard actions, position restoration and visible marker feedback.
Preserve R2 coverage for exact Unicode and unsaved selection, context removal,
separate preview/Send, off-thread single-attempt transport, every terminal
status, inert returned content, exact projection and concurrent note edits. Use
only deterministic injected transports in automated and visual checks; no live
provider request is an implementation test.
Exercise LaTeX rendering, diagnostics or external-editor handoff when those
paths change; they are not repeated manual gates for every widget edit.
Preserve regression coverage for source integrity and recovery. Run focused
tests during development and one final broader regression pass for a code
change; repeat it only after relevant changes or to resolve a concrete failure.
An installed launch check should confirm the delivered package and entry point,
without requiring another full acceptance campaign. Record unavailable runtime
checks accurately; never substitute offscreen checks for claimed visible use.
Open a real integration corpus only when the task authorizes access, and do not
modify its authoritative files during a visual check.

The standalone Qt GUI directly provides ordinary-file editing, existing local PDF
reading, one explicitly previewed task-local model exchange, one bounded linked
continuation with private restart restoration, external-editor and
Jupyter handoff, staged LaTeX building, generated-PDF rendering, recovery and
retained-record inspection. Proof-assistant, computer-algebra,
notebook-execution, repository, literature-service, branching/general model
conversation and Kallenberg-guidance GUI workflows remain unimplemented.
Appendix A supplied a corpus-neutral editor/build/render/re-entry
smoke test. The September 14 supplied evidence adds saved reading notes and
one persisted passage, not a completed study-assistance or warrant evaluation.
See UX_SPEC.md §§9.1–9.3 for the now-independent evaluations.
Keep Qt worker results detached; only explicitly queued main-thread QObject
slots may apply completion results to controllers or widgets.

Read `README.md`, `VISION.md`, `VOCABULARY.md`, `DOMAIN_MODEL.md`, `UX_SPEC.md`,
`CODEX_PLAN.md`, and `docs/JUSTIFICATION_LOGIC_EXPERIMENT.md` before changing
behavior. Then read `docs/CODEX_CONTINUATION.md` for the current bounded
implementation task. `CODEX_PLAN.md` controls priority; the continuation file
turns that priority into a handoff, not a competing roadmap.

The active delivery order was R1 readable source plus durable note, R2 a
task-local assistance exchange, then R3 continued investigation and resumption,
as specified in `CODEX_PLAN.md`. R1–R3.1 are delivered in Qt; the extension's
separate migration status is listed above. Observe delivered workflows in genuine
mathematical work and implement demonstrated blockers. The explicit
2026-10-12 proof-outline request separately defines the bounded increment in
`docs/PROOF_OUTLINES.md`; it does not wait for a preliminary study ceremony.
This supersedes old Appendix-first execution
ordering and evaluation prompts that require five anchors or a warrant before
study. Keep one bounded product increment active and evaluate its contribution
to actual mathematical work. Preserve existing recovery and record invariants;
do not expand their machinery merely to produce another successful audit.

No study session requires all repositories to match a shared entry-lock ritual.
Record the source revision actually used and protect unrelated work. Use durable
user work for continuation; disposable copies serve destructive tests, not as
the only copy of study notes. An inconclusive prescribed session is not a human
failure. A confirmed data-loss defect has priority; fix observed interaction
blockers and defer incidental polish. Documentation-only changes need document
validation, not GUI, compiler or full-suite reruns. On delivery, update the
roadmap's implementation status, README capability claims, any changed UX
behavior and the continuation handoff together. Mark mathematical usefulness
pending when it has not been observed; do not fabricate human acceptance or
leave authorized implementation blocked on a manual study ceremony.

Implementation is authorized. The earlier CLI experiment uses `rs_Appendix_A.tex`
from `flengyel/Categorical_Rice_Shapiro` as its first corpus. Its ordered
mathematical guidance begins with top-down orientation. This does not impose a
corpus or a preliminary activity on the general editor.

For requested orientation in unfamiliar mathematics, use Kallenberg ordering
as the default exposition. It is not a startup requirement, mandatory form or
required sequence before a focused question. A reader may request a definition,
example, prerequisite or local proof explanation at any time. The default
orientation, including for a problem-centered text, is:

1. purpose and organization of the subject or chapter;
2. central concepts, results, and problem families;
3. a selected theorem, argument, example, or problem;
4. its governing idea or proposed method;
5. detailed proof, calculation, or construction.

The existing `why` view follows these levels and is never a
substitute for them. In the first stateless CLI, `why` must assume no earlier
command or hidden session state. It cumulatively presents purpose and
organization, central concepts and results, the selected result's role and
statement, governing idea, proof skeleton, available technical detail, and
reviewed formal correspondence in that order before the warrant. Do not expose
justification syntax, Lean material, or premise maintenance before the
mathematical context makes the warrant question relevant.

Apply these levels only to material that exists. No complete proof, solution, or
formal artifact is assumed. Formal material is optional and follows the
informal mathematical context. Never require a comprehension report, confidence
score, subject inventory, or formal declaration before mathematical work.
Ordinary TeX, Sage, code, diagram, and note files remain the primary work
artifacts. A standard Jupyter notebook may replace or accompany a Markdown
study note; do not require duplicate prose or treat `study_notes.md` as a
mandatory format. The notebook/SageMath companion workflow in `CODEX_PLAN.md`
uses VS Code's Jupyter extension with SagePod's authenticated server and actual
Sage kernel; read `docs/SAGEPOD_NOTEBOOK_WORKFLOW.md`. VS Code/Jupyter owns
notebook editing, rendering, save/recovery and explicit kernel actions. MRW keeps
its Python backend on the workspace host and supplies source/overview navigation.
Opening/restoring MRW starts no container and executes no cells. Saved outputs
are separate from live variables; reproduction requires an explicit fresh-kernel
rerun. Copying ordinary notebook/Markdown files transfers no MRW private targets.
The Qt summary/handoff remains unchanged; no notebook-cell bridge to R2/R3 is
implemented. Record actual UI results separately from API checks and usefulness.

The justification-logic warrant subsystem is architecturally integral to
MRW. Its object language, profiles, derivations, constant
specifications, certificate checker, and certificate-soundness theorem are
implemented in the repository-owned `lean/` Lake project. The toolkit-independent Python
record and checker services use the standard library: they validate and render
Lean-generated checked bundles and never reimplement the calculus. Building or
invoking the Lean checker is task-dependent, and ordinary orientation, study,
and problem work remain usable without Lean. Run the Python checks:

```text
PYTHONPATH=src python -m unittest discover -s tests -v
python -m compileall -q src tests
```

When the task requires Lean verification, run the repository-owned Lake project
from the repository root:

```text
cd lean
lake build
lake test
cd ..
PYTHONPATH=src python -m unittest discover -s tests -v
python -m compileall -q src tests
```

The Lean and Lake installation already used by `/home/flengyel/src/PCats` may
supply the pinned toolchain and download cache. `PCats` is not the checker for
this repository: do not point the documentary bridge at a PCats executable or
copy its build artifacts. `lean/lean-toolchain`, `lean/lakefile.toml`, and
`lean/lake-manifest.json` govern this build. The current executable identity is
pinned for Linux x86-64/WSL and is checked before every documentary run.

The executable offline bridge has three mandatory boundaries:

1. `project-response` validates a finalized call and exact UTF-8 span and
   creates only the lossless `Representation` and documentary atom \(D\); it
   neither admits a premise nor invokes Lean.
2. `admit-documentary` explicitly serializes one scoped premise \(m:D\); it
   still does not invoke Lean and creates no substantive \(F\) or bridge. Its
   operational request has `checked_at: null`.
3. `check-documentary` is the only bridge command that invokes the pinned Lean
   checker. It rejects a pre-stamped request, stamps canonical UTC from the
   application clock, and enforces ModelCall finalization ≤ admission ≤
   check. The public path must first perform Python's strict response-digest,
   span, assertion-hash, and cross-link validation; Lean then checks the
   contextual derivation. Do not treat the raw Lean transport executable as an
   independent provenance-hash validator.

The committed multibyte `ModelCall` is synthetic regression data. Its success
tests mechanics only and never counts as a provider request, mathematical use,
or Stage 1 usefulness evidence.

Do not make a live provider call, add another provider adapter, add general
corpus ingestion, or add general Lean analysis until an active mathematical
task supplies an observed requirement. Implementation and offline testing of
the single bounded OpenAI Responses adapter described below are authorized.
The first formal increment is the bounded \(J_0/J(CS)\) checker and Appendix A fixture in
`docs/JUSTIFICATION_LOGIC_EXPERIMENT.md`. After that checker and profile exist,
Stage 1 is authorized to reuse them for the single model-response trial
specified there; it must not add a second logic or checker. Checker invocation
for either fixture remains task-dependent in ordinary mathematical sessions and
does not alter or gate `orient`, `study`, or problem work. The Appendix fixture
and model-response warrant trial retain their acceptance obligations when
those respective experiments are executed (UX_SPEC.md §9.3). They do not gate
R1–R3, ordinary assistance, or acceptance of useful study. Do not commit a
checked bundle or executable Lean checker until the pinned Lean command has actually compiled and
checked it; never hand-author a placeholder that claims checked status.

The single bounded OpenAI Responses API provider adapter is implemented as
infrastructure for the later Stage 1 trial. It uses the fixed endpoint, obtains
its credential only from `OPENAI_API_KEY`, rejects redirects, performs no
retries, and transmits only the exact frozen UTF-8 body shown in its preview.
The low-level CLI requires the exact token `SEND`; the R2 GUI requires its
separate **Send exact preview** action after the same body is displayed. Once transmission begins it atomically retains a
completed, failed, refused, or incomplete `ModelCall` when possible. Do not
change its transport or publication boundary unless a demonstrated defect
requires it. It never automatically projects a response, admits a premise,
invokes Lean, or creates a mathematical warrant.

The deterministic local response-review and selection service is implemented
over completed, finalized `ModelCall` records. It:

- make no network, provider, tool, or Lean call;
- validate the call and response digest before display;
- show attribution and response identity before mathematical content;
- implement `review-response MODEL_CALL` with the mutually exclusive index,
  passage, and full-response selectors specified in `CODEX_PLAN.md`, and extend
  `project-response` with its mutually exclusive `--passage N` selector;
- show the bounded, pageable deterministic passage index specified in
  `CODEX_PLAN.md`, bound every variable-width metadata preview, put trusted
  lengths and truncation state before untrusted text, and keep the complete
  exact response available by explicit action;
- define passages, numbering, previews, and zero-passage behavior exactly as
  `CODEX_PLAN.md` does and map a selected visible passage number to the existing
  half-open UTF-8 span internally;
- apply the exact reversible safe-rendering rule in `CODEX_PLAN.md` to every
  record-derived string, use trusted application framing, emit no terminal
  hyperlink escapes, and invoke no pager, Markdown renderer, shell, or link
  handler;
- create no artifact when the response is only viewed or the action is
  cancelled;
- use the existing parser, digest validation, and projection construction rather
  than duplicating them;
- use a single linear passage scan retaining only the requested page or selected
  passage; factor a provider-independent, mode-`0600`, synchronized, atomic
  no-overwrite persistence helper and apply it to response-bearing projection
  and admission artifacts as well as the model-call path, preserving the current
  model-call publication commit point, including retention of the complete destination and
  cleanup of only temporary or reservation artifacts after any post-link
  directory-sync failure;
- hold the synchronized temporary descriptor and stable parent directory,
  verify the installed link names that inode before accepting publication, and
  remove an identity-mismatched new link only after verifying it is the link
  created by the operation; this protects against ordinary concurrent pathname replacement,
  not arbitrary compromise of the same Unix account;
- preserve response selection as an ordinary lossless `Representation`; map
  call purposes to existing generic representation kinds rather than adding an
  AI-response hierarchy; and
- add tests for exact passage boundaries, multibyte Unicode, CRLF, repeated
  passages, a response with no blank separator, empty and blank-only responses,
  the current 4 MiB `ModelCall` input boundary, a response at the adapter's
  1 MiB ceiling, terminal controls, cancellation, digest mismatch,
  non-completed calls, mode `0600`,
  no overwrite, concurrent destinations, and failure cleanup.

This implemented review/selection service must not automatically summarize, semantically classify, retrieve
a source, record a disposition, make a second model call, admit a premise, or
invoke Lean. It records only routes present in the returned text. The task-facing
generator must not solicit hidden chain of thought; the current adapter sends no
reasoning-summary parameter and ignores auxiliary reasoning items. Never label a
returned explanation or summary as raw chain of thought, reconstruct hidden
reasoning, or claim access to provider-internal search or unreturned
alternatives. A human synthesis is a separate
derived representation. A model-produced synthesis requires another explicit
linked `ModelCall`. Source retrieval, verification, premise admission, and
justification checking remain separate explicit actions.

Ordinary orientation, study, and problem work remain independent of model
assistance and justification-logic entry. The transient request JSON remains a
low-level developer integration envelope, not a form for mathematicians. The
delivered R2 GUI derives it from one selected task, shows the exact selected
ordinary text and complete UTF-8 body, permits context removal, and requires a
separate Send. It performs transport off the Qt thread, prevents duplicate
in-flight sends, presents returned text inertly and reuses exact passage
projection; an editable note copy remains separately attributed. It sends no
PDF bytes or implicit extraction. Each transmission still requires its own
explicit user action and exact-context preview; this roadmap authorizes no
background provider call. Synthetic transport and widget checks do not establish
assistance usefulness.

R3 provides one explicit linked follow-up, correction or alternative and durable
investigation resumption. Preserve its one-initial-parent/one-child cut line,
R2's per-request preview and the adapter boundary; do not use provider
conversation state, `previous_response_id`, automatic retry, branching, source
retrieval, provider tools, a second provider or autonomous requests.

For the warrant layer:

- terms and formulas are pure syntax and mathematical claims are immutable
  opaque atoms;
- every artifact binding, premise, formal-proof-policy bridge, and
  formal--manuscript bridge is explicit, scoped, and versioned;
- checker output says derivable relative to a context, never true, known,
  understood, or externally verified;
- a `Correspondence`, formal check, source digest, or model response never
  becomes a premise automatically;
- sum is alternative reason availability, not corroboration, confidence,
  independence, or weight;
- Python validates and renders the trusted Lean-generated bundle and never
  reimplements the derivation checker;
- pin the frozen Appendix fixture's expected bundle digest in package metadata,
  but retain a runtime documentary bundle's exact-byte digest outside it in the
  generic immutable checker `Verification` created at the trusted Lean-checker
  handoff; and
- do not add factivity, introspection, JAM, Fitting semantics, or a corpus-wide
  justification graph in this slice.

For model assistance, `ModelCall` is an immutable operational and provenance
envelope, never an epistemic status record. Preserve the exact raw-response
digest and lossless digest-anchored span before creating a representation. A
paraphrase, normalization, or edit is a separate derived representation.

Project selected AI output into warrants only with the existing generic records:
opaque `ClaimAtomVersion`s, pure formulas, explicit `PremiseAdmission`s,
immutable contexts, and checked `JustificationDerivation`s. Keep the documentary
atom \(D=\operatorname{ModelProduced}(C,h,s,R)\) distinct from the substantive
claim \(F\). Admission of \(m:D\) does not admit \(F\); direct reliance requires
a separately scoped \(r:(D\to F)\). If independent work warrants \(F\), record
that reason directly and leave the model call out of the derivation.

Do not add `AITrust`, `AIWarrant`, `ModelAuthority`, a generic support edge, a
provider-wide production-to-truth bridge, or trust, reliability, confidence,
acceptance, correctness, authority, weight, integration, or adoption fields to
model-call or proposal records. Provider and model identifiers never belong in
a constant specification. Extraction, structured output, fluency, citation,
use, or proposal disposition never creates a premise automatically.

Bind the fixture to the exact manuscript revision, Categorical Rice--Shapiro
commit, Lean environment, declaration type, axiom report, admissions, logic
profile, and checker version. A successor context may make a route inactive but
does not invalidate the earlier certificate under its original context.

Additional LaTeX labels are needed only when optional correspondence maintenance
expands beyond the already labeled selected result; they are not a prerequisite
for orientation, informal study, or the bounded warrant slice.

The Appendix A interpretive guide is bound to a reviewed normalized source
digest. If the manuscript digest changes, inspect the mathematical changes and
revise the guide and tests where necessary before updating the digest. Never
update the digest alone.
