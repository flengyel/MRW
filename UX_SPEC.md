# UX_SPEC.md

The mathematician's workflow the interface must support. Companion to
`VISION.md` (why the system exists) and `DOMAIN_MODEL.md` (entities and
invariants). Present implementation and limitations are documented in README.
The standalone Qt GUI provides ordinary-file editing, existing local PDF reading,
external-editor and Jupyter handoff, staged LaTeX building, generated-PDF
rendering, checkpoint recovery, one explicit task-local OpenAI exchange, one
bounded linked continuation with restart restoration, an explicit end-and-
begin-again lifecycle, and retained-record
inspection. Proof-assistant, computer-algebra, notebook-execution, repository,
literature-service, branching/general model conversation and Kallenberg-guidance
GUI workflows below remain unimplemented. The active R1–R3.1 roadmap in [CODEX_PLAN.md](CODEX_PLAN.md#active-roadmap-mathematical-usefulness-first)
prioritizes readable study, task-local assistance and continued investigation.
Kallenberg ordering guides requested orientation in unfamiliar material; a
focused question need not repeat it. Qt/runtime and TeX prerequisites remain
platform-dependent; they are not permanent workflow invariants.

## VS Code frontend migration — 2026-10-13

The backend runs in the workspace environment with Python 3.11+, using standard
local Linux, WSL2 or Remote SSH to Linux hosts. Windows may supply the editor
while Linux runs the core. One extension and the existing Python services
remain the architecture; native Windows backend portability is deferred.
Reading and outlining need no Lean, SageMath, container or provider. Scoped
installed-VSIX reader/restart checks pass with WSL Debian and Remote SSH to a
Raspberry Pi 5 running Debian 12 ARM64. Other Linux SSH hosts, local desktop use
and other Raspberry Pi OS/ARM configurations remain separately unvalidated.

VS Code is the active frontend target. The mathematical workflow principles in
this document apply to both frontends; implementation details concerning QtPdf,
split panes, widgets, application-owned buffers, checkpoints, and close/quit
apply only to Qt. Preserve their source-integrity and evidence invariants when
designing host integrations, without duplicating VS Code's document lifecycle.
Statements that R1–R3.1 are delivered below refer to Qt unless the extension is
explicitly named. Other extensions' PDF, Lean, LaTeX, and notebook support is
integration context, not a claim of MRW implementation or validation.

The initial extension supplies an Explorer research view and MRW commands for
record inspection, response review, exact retention, attributed note insertion,
and Lean/browser handoffs. Ordinary documents, save, undo and recovery belong
to the host. This section describes the extension; the existing R1–R3.1 Qt
contracts below retain their implementation status.

A saved UTF-8 text selection can be marked as a return location. Its canonical
path, exact byte revision, host text revision, UTF-16 selection, and bounded
preview live in private VS Code workspace state, with one marker per canonical
project. The shelf displays it without reading the source. Returning checks
both disk and editor contents before moving the editor. Dirty or changed text
blocks return; markers do not track edits in this first increment. Host state
persistence is not presented as the Qt recovery checkpoint protocol.

Record views are read-only plain text and reuse existing validators. Showing a
passage selects its exact reviewed record revision. Retention creates a new
projection with no overwrite. Insertion adds an attributed editable copy at the
active note cursor, preserving selected work and one undo boundary; it does
not save the note. Concurrent note/selection changes cancel insertion.
Opening an earlier review tab reselects its record and passage. This association
survives document language changes. Each activation uses a distinct virtual
document namespace so restored tabs cannot acquire a new record identity.

Lean-source handoff opens a user-selected file and line beside the work. An
installed Lean extension may process that file. HTTPS viewer handoff sends no
source or appended local path. Neither action extracts a graph or supplies a
Verification. PDF/Lean/LaTeX/notebook behavior supplied by other extensions
remains their responsibility. R2 preview/Send is transferred: **Ask About
Selected Work** captures exact visible ordinary text, including unsaved and
untitled documents. Up to eight contexts can be added or removed; changing
context or the question invalidates the previous preview. The read-only current
preview must be active for the separate **Send Exact Preview** command. Send
consumes that preview before launching the asynchronous Python adapter, so
duplicate actions cannot resend it. An explicit preflight rejection reports
**not sent** and preserves the draft for a newly displayed preview. A known
terminal outcome remains distinct from a later display failure; automatic
response review checks the exact retained-record digest. All four terminal
statuses can be inspected, while passage extraction remains completed-only.
Native Windows Send is blocked before transport because immutable publication
is unsupported there. Terminal records live in private VS Code
workspace storage; unsent drafts are transient. Host interruption can leave a
request outcome uncertain and never triggers an automatic retry. R3/R3.1 is
implemented as described below; vertex elimination remains planned.
See [extension instructions](vscode/README.md).

R3 starts from one exact reviewed initial completed ModelCall. Choose one to
eight numbered prior passages, explicitly add/remove current ordinary-text
selections, and keep the human correction and task summary separate. Every
draft change invalidates its complete independent preview; Send is a separate
one-attempt action. The child records `in_reply_to` without provider conversation
state. An initial parent has one child in the active investigation; a linked
child cannot be continued again, and an existing slot cannot be overwritten.

The extension's versioned private state contains bounded human task fields and
exact record pointers/spans, with a pending reservation published before Send.
It uses the core's existing mutable-file publication service under private
extension storage, keyed by canonical project identity. No Qt workspace,
buffer or recovery state is imported. Explicit **Resume Saved Investigation**
restores the parent/human/child comparison after exact validation. A pending
destination is reconciled only against its reserved request fingerprint;
missing or changed known records leave the human summary and pins intact.
Opening the host starts no bridge or request. No automatic retry occurs.

Human fields are edited through commands and displayed in the plain-text
comparison. **Save Human Task Summary** persists them; accepted edits not yet
saved remain in memory. The investigation's current-question command is
independent of an unrelated R2 draft. Handoff insertion uses the latest matching
human fields and immutable identities without copying model prose. Repeated
previews and comparisons reuse an existing MRW editor group.

**End Investigation…** offers insert-handoff-and-end, end-without-insertion or
cancel. Busy/restore entry points are guarded, and the handler revalidates active
identity and the intended ordinary note after confirmation and preparation.
Successful ending clears only the active pointer after private publication.
Insertion remains an ordinary unsaved host edit with undo; no automatic Save or
Qt recovery guarantee is claimed. If ending fails, live state and any inserted
note text remain without duplicate insertion, retry or automatic undo. Failed
or uncertain publication blocks further private writes until reload; a complete
post-replacement result may be visible on disk after an uncertain sync failure.
Preserve unsaved human edits through a handoff before reload when needed.
Another independent bounded investigation can use the released slot after
restart. Records are retained; no archive browser or branching conversation is added.

The 2026-10-13 Windows/WSL Development Host checks exercised these command,
document, undo and record workflows with scripted dialogs and deterministic
responses. A normal-host close/reopen separately confirmed Return persistence
and rejection of stale virtual-tab identity; VS Code's extension-test mode uses
in-memory workspace storage and cannot establish that result. Visible captures
at both review sizes were inspected, using ordinary host layout controls for
the smaller window. No production UX change or mathematical-use claim follows
from this validation. Details and remaining limits are in the
[host validation record](docs/VS_CODE_ASSISTANCE_REVIEW.md#actual-extension-development-host-validation).

### Explicit TikZ reader diagrams — 2026-11-02

A saved reader annotation can contain ordinary `tikz` fences. Save leaves the
code inert. In Reader notes, **Render diagram** starts one isolated native job
and retains a validated SVG for that annotation and exact code digest. Newer
form typing survives the reply. **Exact TikZ code** and the full annotation text
remain accessible. Changed code never adopts an older rendering. Failed renders
keep prior valid output; uncertain publication never announces success.

Reopening and refreshing display retained output without tools or networking.
Paper/Dark display adapts monochrome ink and preserves other colors and the
original SVG. Its workspace preference is host-local. Rendering needs supported
Linux tools only for the explicit action; there is no unrestricted fallback.
One block produces one diagram page; unsupported active/external SVG output
fails visibly. This adds no graph inference or mathematical evidence. See
[workflow](docs/TIKZ_WORKFLOW.md) and [checks](docs/TIKZ_VALIDATION.md).

### MRW entry point — 2026-11-01

MRW has a dedicated book icon in VS Code's Activity Bar. The sidebar contains
Reading Outline and the collapsible Research Tools view, with existing IDs and
state. Reading actions have a standard native **…** menu; Open and Return remain
title icons. This replaces default placement under Explorer while respecting
host-owned view customizations. Opening the sidebar starts no backend or source
acquisition. All existing command-palette entry points remain available.

### Annotation mathematics — 2026-11-01

Reader explanations and other annotations render explicit `\( ... \)` inline
math and `\[ ... \]` / `$$ ... $$` display math with bundled KaTeX and native
MathML. Other prose remains literal text, including Unicode, HTML and URLs;
single dollar signs retain their ordinary meaning. Editing uses the exact saved
text; the reading view also offers Exact annotation text. Invalid mathematics
keeps its TeX with a visible fallback message. Rendering changes no attribution,
saved content, source identity or mathematical status and starts no external tool.

Published proof cards offer **Show proof / Hide proof** beside the mathematics.
The sticky reading toolbar has **Hide proofs / Show proofs** for the source;
statements remain visible. The initial visibility preference uses host-local
workspace UI state. Individual choices stay in the live view; following an exact
proof reveals that proof even when others are hidden. These controls preserve
drafts and create no source-record mutation. Readers choose their level of detail
without a prescribed sequence. Manual regions retain their existing saved
expansion action and gain visible Show/Hide details controls.

### Compact hidden details — 2026-11-01

A hidden published proof is one compact reveal row labelled with its retained
title. It keeps no large heading, empty card, hidden-status paragraph or duplicate
return link. Selecting it reveals the exact proof in place. Reader notes is a
native disclosure labelled with the note count and starts closed. The reader
can open/close it with mouse or keyboard; its live state survives refresh/save
replies. Folding saved notes leaves their text, attribution and editing drafts
intact, and creates no record mutation.

### Proof visibility repair — 2026-11-01

The user confirmed that the expanded 0.9.1 view improved reading, then found that
opening the annotation form pushed the proof out of view. Patch 0.9.2 removes
editing forms from the source reading sequence. Published statements and proofs
have direct reciprocal links using existing explicit part roles, tag and exact
retained spans. Temporary proof expansion changes only the live reader view.
Reader notes are separately attributed after the source text; their editors
and the remaining region controls are grouped under Source details and tools.
Changed associations are never presented as the original proof. Source,
Markdown, record identity, mathematical status and core request semantics stay
unchanged. Annotation saving shows pending, confirmed and unconfirmed results inline. A confirmation covers
only the submitted version; newer typing remains explicitly unsaved. Open note
editors stay open across refresh and save replies, and failures preserve their
text and the existing write block.

### Reading presentation repair — 2026-11-01

The first installed trial exposed a reading blocker: a selected long Markdown
citation dominated the middle editor, while metadata and controls crowded the
mathematics into a narrow reader. Patch 0.9.1 gives navigator references concise
view labels without rewriting Markdown. Source navigation expands the reader
with standard VS Code layout commands. Source text precedes passage actions;
source details and editing controls start collapsed. A sticky Return action
brings back the originating overview and navigator. A matching published passage
is shown as rendered retained source at its exact card. Earlier/changed ranges
continue to open their original pinned text, with a visible warning and no
replacement region. Exact TeX, notes and evidence remain explicitly accessible.
The patch changes no source identity, stored range, prose ownership or warrant.

### Reading-outline navigation — 2026-11-01

**MRW: Open Reading Outline** derives a collapsible Explorer view from the
selected ordinary Markdown overview, including unsaved text. CommonMark headings
supply organization; existing MRW links supply retained-source navigation.
Code examples are excluded. Selecting a heading visibly selects its exact line;
selecting a passage opens its pinned retained range through the existing reader.
Repeated headings and repeated passage links remain distinct occurrences.
**Return to Reading Outline** is available in the palette, view and reader.
It selects the originating occurrence without saving or replacing note text.
A live return location follows nonoverlapping edits; overlap blocks return,
with exact undo restoring the original pin. Restart checks the saved text hash
before returning; it never guesses from matching headings or similar links.

The view refreshes from host document events and reconstructs after normal
save/close/reopen. Collapsed-section preferences, last selected document/location
and a return pin live in existing host-local workspace UI state. No prose or
second outline record is stored. Opening/restoring the view starts no bridge,
network, provider, compiler, notebook or container. Following invokes only the
existing retained resolver/reader. Existing insertion commands and ordinary
Obsidian notes remain in use; no vault is inspected. Navigation creates no
premise, dependency, verification or comprehension status. See
[usage and format bounds](docs/READING_OUTLINE_WORKFLOW.md).

### Obsidian companion navigation — 2026-10-17

The source reader offers **Copy link to this outline** under **Whole outline**
and **Copy link to this passage** in each **This passage** group.
**MRW: Copy Outline or Passage Link…** also works without an active Markdown
editor. Ordinary Markdown labels use the source title and locator; target
identifiers and routing remain in the URI. Clicking in Obsidian opens the saved
reader and, for a region, selects the original pinned retained passage.

To associate a note, open the intended note in Obsidian and use its **Copy
Obsidian URL for current file** command. “Current file” refers to the note open
in Obsidian. Under **Whole outline** or a passage card's **This passage** group,
**Link an Obsidian note…** stores that URL and a short label.
**Open linked note in Obsidian** uses a readable chooser for multiple notes.
Replacement/removal changes only the
navigation record; earlier pinned passage associations remain accessible.
A single linked note displays its stored label beside the opening action;
multiple notes retain the chooser. An empty group explains how to link a return
destination. Tooltips distinguish copying an MRW destination from linking an
Obsidian return destination; copying creates no reverse association. A changed
range exposes a separate **Earlier linked passage** group, while current
passage actions keep their current range. The all-notes list labels those scopes.
These 0.6.1 presentation changes preserve IDs, references, retention and storage.
Obsidian owns notes, rendering and ordinary attachments, including handwritten
work. Existing Zettel notes need no conversion or derivation transcription.

An external link carries separate workspace routing and existing scoped
`mrw-outline:v1` identity. A receiving window must match the routing and project
before the Python resolver checks its private scope. A wrong window offers
**Copy Link and Open Workspace**, followed by **MRW: Open Link from Clipboard**;
it never interprets the reference against an unrelated project. Missing private
state and malformed links fail without replacement guesses. Obsidian handles
missing notes; MRW explains how to replace their association. Dispatch success
does not confirm note existence. Existing retained access survives changed or
missing original sources. Navigation performs no mathematical analysis or tool
execution. Copying a note transfers no private targets. See
[the workflow and persistence limits](docs/OBSIDIAN_WORKFLOW.md) and
[validation](docs/OBSIDIAN_VALIDATION.md).

### Saved artifact location — 2026-10-19

**MRW: Show Artifact Location** reports the effective directory for this
workspace. **MRW: Move Artifact Directory…** names the current location,
proposed new directory and all affected project folders before confirmation.
It protects unsaved reader/assistance edits, verifies a complete staged copy,
commits one host-local binding, rebinds readers and removes only exact old owned
payloads. **MRW: Recover Artifact Move** resolves interrupted/uncertain operations
from the persisted binding and manifests; postcommit cleanup never rolls back
authority. **MRW: Refresh Artifact Location** retains drafts when another updated
local window has moved the store. Editing `mrw.artifactMoveDestination` merely
changes the suggested input.

**MRW: Open Existing Artifact Directory…** is distinct: an empty/unbound
workspace explicitly maps projects and verifies every required byte before using
a complete synchronized copy. It does not merge stores or move ordinary notes,
source documents or notebooks. Missing mounts, partial synchronization and
conflicts produce actionable errors without empty replacements or guessed
locations. Unsupported private permissions/publication boundaries reject before
commit; the current `/mnt/c` mount is one observed unsupported configuration.
The separately authorized scoped metadata trial passes a disposable move and
save/reopen, but unresolved probe replacement denials prevent real-store
qualification; see [the configuration results](docs/WSL_ARTIFACT_STORAGE_SETUP.md).
One approved comparison found no denials in four paused probes and one denial
in each four-probe active phase. The Windows folder was resumed and independently
verified. The subsequent approved paused transaction check failed at its first
preflight replacement before commit. No pause/write/handover procedure is
qualified; retain the rejection and original real-store location.
Keep bindings/journals/locks and runtime state outside the selected directory.
The [storage guide](docs/ARTIFACT_STORAGE.md) defines scope, recovery and the
one-writing-computer workflow. Qt storage is unchanged. Navigation initiates no
provider, compiler, notebook or container execution.

## 1. Design principle

The interface supports doing and studying mathematics. It does not require a
declaration name, a formal development, or a preliminary account of what the
mathematician understands.

A mathematical objective describes the work, not a required data-entry field.
A session can begin by opening an ordinary file to orient in a subject, solve a
problem, study a theorem or proof, reconstruct earlier work, prepare to teach,
or examine generated mathematics. The mathematician begins the mathematical
work in the ordinary medium appropriate to it. Theorem Terminal supplies source
context, prior work, computations, and assistance when relevant.

The interface supports work with mathematics whose justification exceeds the
mathematician's present understanding, while making further understanding
possible wherever it can. Statements, evidence, and applicable checks remain
accessible without a complete explanatory account. Appropriate application
requires access to the relevant hypotheses and scope, not reconstruction of
every proof step. Missing explanation and missing justification are distinct.
The four benefit categories in
[VISION.md](VISION.md#justification-understanding-and-benefit) govern evaluation;
they add no comprehension questionnaire or automatic acceptance status.

The primary use is working into the existing literature from a chosen source
or question. The intended interface should make a passage's role, relevant
prerequisites, and connections to other sources accessible, with precise source
locations and explicit uncertainty about proposed connections. An outline or
local prerequisite lookup can support immediate work; no complete subject map
or proof reconstruction is required. Preserve these study artifacts and the
next question in an ordinary note or notebook so that progress can accumulate.
These guidance capabilities remain design requirements, subject to the
implementation limits stated above.

Five constraints follow from `VISION.md` and apply throughout this
specification.

**Mathematical work comes first.** The interface must not require a subject map,
questionnaire, or structured description of comprehension before a problem,
proof, calculation, or exposition can begin.

**Formal material is optional.** When formal material exists, it appears after
the informal mathematical context and may be consulted when useful. Its absence
never prevents orientation, theorem study, proof study, problem solving, or
review.

**Origin is always visible.** No view presents a machine proposal as a
mathematician's judgment or as a mechanically derived fact, and no view presents
a derived fact as a claim someone made.

**External transmission is explicit.** A model call is initiated from the
current mathematical task. Before transmission, a compact disclosure identifies
the configured provider and model, the exact versioned source passages and work
artifacts selected, the request limits, and any provider retention that cannot
be disabled. The system derives this disclosure from the active task; the
mathematician writes the mathematical question and may remove context but
completes no purpose or provenance form. All other workspace history and private
notes are excluded by default. No source or work artifact is transmitted in the
background.

**Warrant is explicit, distinct, and task-triggered.** The justification-logic
warrant subsystem is integral to the architecture, but its view is presented
only when an active task makes the warrant question relevant. It may show a
checked derivation relative to named admitted premises. It never presents
contextual derivability as source identity, external verification, truth, or
human acceptance, and it never precedes the mathematical study that made the
warrant question relevant.

### Ordinary files, rendered mathematics and re-entry

Begin with an existing project directory and an ordinary mathematical file.
Editing, viewing a source and comparing two documents require no preliminary
metadata. Mathematical hypotheses belong in the text or formal declarations.
The navigator and contextual information should leave room for the current work.
All operations must be available through visible menus without required key chords.
Also provide platform-standard Open, Save, Find and Find-next shortcuts, show
them in menus, and keep keyboard focus predictable. Save acts on the clearly
identified editable text target; it cannot overwrite a PDF. R1 Find/Find-next
are text operations. When PDF has focus, disable them or explain that PDF search
is unavailable; do not silently search a hidden or unrelated editor. Preserve
inherited text editing shortcuts. A completed marker action
must visibly identify the marked passage; an unavailable Return action must
make the reason discoverable. Do not make successful marker creation something
the user must infer from a later restart.

A reader must be able to select an existing local PDF through ordinary Open or
the project navigator and see it beside an editable ordinary work note, without
TeX source or a build. Keep PDF bytes outside editable text buffers, text
recovery and text anchors. Preserve its document identity, page and zoom
independently of generated-output provenance; restore the PDF and note after
reopening. Missing, invalid, unreadable or changed PDF content must be reported
without discarding the note or silently claiming the old reading location
still identifies the same passage. Failed loads must not overwrite the last
valid reading state. Workspace migration validates stored state without reading
source files; actual document loading validates the selected document.

The delivered R1 increment includes independent opening, exact-identity
page/zoom restoration, ordinary note editing, platform-standard Open, Save,
Find and Find-next shortcuts, explicit PDF-versus-editor focus status and marker
feedback. Save names the editable text target even while the PDF is focused;
Find and Find-next are visibly unavailable until an editor has focus. PDF search,
outline, SyncTeX and text extraction are deferred beyond this handoff. Add
navigation capabilities later when required by actual reading; an
internal document link must not silently launch an external action. Keep
the reader's note and return location available during a definition lookup.
Opening a PDF does not imply reliable text extraction or a source mapping.
When sending a PDF excerpt, show the exact extracted or transcribed text and
its document revision/page so that damaged notation can be corrected explicitly.
A corrected transcription is distinct from the original source.

The delivered R2 increment begins only from a nonempty visible selection in an
ordinary text buffer. Its non-modal dock freezes the selected text, current
in-memory revision and scalar location, accepts one question, permits context
removal, shows the exact request body and requires a separate Send. It includes
no PDF bytes or implicit extraction. A PDF-motivated question therefore uses an
explicit ordinary-text transcription or corresponding source selection. The
answer remains inert attributed plain text with exact raw-record access. Exact
passage retention and separately attributed editable note insertion are
explicit; neither creates a premise, Verification, warrant or disposition.

Different projects may be open in different workstation processes. This increment
supports only one active workstation process per project, without a lifetime lock.

For LaTeX, select an existing file as the root, save the intended source revisions
and explicitly request a build. TeX source is trusted executable input;
out-of-tree staging is not a sandbox. openin_any=p is defense in depth for
conventional input operations, not a complete read boundary: pdfTeX can embed
an absolute external file through `\immediate\pdfobj stream file`. Arbitrary
external reads are not confined; build only trusted project TeX. Keep the rendered
PDF beside its source. A reported file-and-line error should return directly to
the relevant text. Preserve
the last successful output after a failed build and make changed-input staleness
visible. Distinguish complete, partial and unknown dependency coverage. With
untracked external dependencies, describe only the recorded project inputs as
unchanged. Derivation/build provenance comes from the action; successful typesetting
is separate from mathematical Verification and from justification or judgment.

A deliberate external-editor action opens the saved file at the current passage.
On return, compare changed disk content with any unsaved work before refreshing.
Notebook execution likewise requires a deliberate tool action; merely opening a
notebook must not execute it or expose editable raw JSON by default.

The requested notebook/SageMath workflow permits a standard `.ipynb` as the
primary study document or alongside Markdown/TeX. Narrative, mathematical
notation, executable examples and outputs should remain together without a
duplicate note requirement. The first VS Code companion workflow uses its
existing Jupyter extension and SagePod's authenticated server with the actual
`sagemath` kernel. VS Code/Jupyter owns the notebook editor, rendering, saving
and explicit kernel actions; SagePod supplies computation. MRW keeps its core
on the workspace host and supplies source/overview navigation. Ordinary relative
links join these files; MRW private references are followed explicitly in a
Markdown editor and remain scoped to that workspace/storage. Keep the
notebook's location available on re-entry and distinguish saved outputs from
live kernel state. Opening/restoring MRW must not start containers or run cells.
The standalone Qt summary/handoff is unchanged. Notebook-cell selection into
assistance and response insertion require a later explicit bridge; the companion
workflow supplies neither. See the notebook section of `CODEX_PLAN.md` and
`docs/SAGEPOD_NOTEBOOK_WORKFLOW.md`.

Re-entry restores the open work, selected passage and rendering position. Two
panes comparing the same file retain independent cursor, selection and scroll
positions while sharing one editable document, modified state, undo/redo history
and buffer/recovery identity. Insertions and deletions adjust both views' text
positions. Wrapping survives restart. Layout changes retain a visible cursor
with minimal scrolling, or retain the visible passage when the cursor was
deliberately offscreen. Recovery restores positions even with an unavailable
saved base; placeholders and diagnostics never replace document positions. An
optional unresolved-work marker anchors a file selection without demanding a
written description. The implemented **Working context** shelf independently
retains up to 32 ordered, exact revision-pinned selections across ordinary text
files, including explicitly opened external read-only references. Its menu and
dock actions open a passage in either of the two editors or remove an anchor.
Restoring or displaying the shelf reads no source content; opening is explicit
and fails without moving the editors if a path is missing or redirected or its
current/recovered content or saved base does not match. Entries contain only the
path, content revision, selection endpoints and a plain preview of at most 120
Unicode characters with display whitespace normalized. Displayed lines and
columns are one-based; canonical stored columns remain zero-based. Previews
survive restart without source reads; they are display excerpts, not immutable
source-quotation or provenance records.
In loaded editable ordinary text, the marker and shelf follow internal edits and
undo/redo through their shared document, independently of both pane selections.
Nonempty ranges exclude insertions at their outside boundaries; a point marker
advances at its continuation point. A deleted passage retains its last completed
pin, visibly changed, rather than relocating. Recovery becomes durable before
updated pins are published. Known external changes do not re-pin anchors, and
Return validates completely before navigation, just like shelf opening.
They are private local navigation anchors,
not provenance, citations, warrant records, mathematical-object identities or
material automatically sent to a model. **Mark unfinished work here**, **Return
to unfinished work** and **Clear unfinished marker** retain their independent
single-location purpose. Private recovery retains the exact latest successfully
completed checkpoint across an interrupted process, not uncheckpointed characters; it is mutable application state, never mathematical provenance. A failed
final checkpoint must leave the work available until the user explicitly decides
whether to discard it.

Save, Discard, Refresh and return to clean text report successful recovery cleanup
only after exact-byte validation, unlink and recovery-directory synchronization.
An uncertain deletion blocks further workspace writes until close/reopen without
a compensating rewrite. Native Windows currently lacks the directory-sync
implementation required for crash-durable mutable publication and reports that
limitation as a failure.

In the current Qt GUI, wrapped views of one shared document keep equal editor
viewport widths because that document has one layout width. Splitter movement
and resizing preserve this constraint and both pane positions. Different buffers
or unwrapped views may have unequal widths; no earlier unequal ratio is restored
automatically. This toolkit constraint is not a mathematical or domain invariant.

When retained model or warrant material becomes relevant, inspect it alongside
the work. Model attribution and response identity precede returned mathematical
text; retaining a passage preserves its exact digest-anchored span. Provenance,
Verification, premise admission, contextual derivability and human judgment must
remain distinct. Viewing or cancelling creates no record. Opening a project,
restoring work or viewing any document makes no automatic tool or network call.

---

## 2. Session types

These are mathematical activities, not mutually exclusive application modes or
mandatory tabs. A session may move among them.

### Orientation

Enter or revisit a subject. Locate its organizing concepts, central results,
principal problem families, and the relations needed for the work at hand. The
system preserves the source locations and relations consulted, together with
prior work, so that a later session need not reconstruct them from nothing.

Orientation serves a mathematical task. It is not a preliminary exercise in
describing the subject or completing a domain model.

### Problem solving

Work on a source problem, an omitted proof step, a calculation, an example, or
a question arising from research. The session opens the problem and an ordinary
working file immediately. It can then supply, on request, the exact source
location, nearby definitions and results, related problems, prior attempts,
computations, and graduated hints.

The session records the resulting `WorkArtifact`s and the assistance used as
`TaskEvidence`. It does not interrupt the work to ask for a report about the
mathematician's internal state.

### Theorem study

Study one result: what it asserts, why it matters, how it is used, and why it is
true. The default order is specified in §3.

### Proof study

Reconstruct an outline, identify the crucial reduction, inspect intermediate
claims, fill omitted steps, test examples, and compare methods. When a formal
counterpart exists, comparison with it is available; proof study does not depend
on such a counterpart.

### Formal exploration

This activity applies when the current object has formal material. It shows declarations,
dependencies, axiom usage, verification status, and proof states, with links to
the corresponding informal mathematics where those correspondences have been
established.

A discovery made during formal exploration remains in the proof, code,
calculation, or ordinary note produced during the work. The system may also
record an explicit relation or discrepancy. No second account of comprehension
is required.

### Proof outlines by vertex elimination

**Delivered partial reader, updated 2026-10-15:** VS Code offers explicit manual
source-region selection and revision, exact retained-source hide/expand,
separate exact statement and context selections, editable attributed reader
explanations, optional supplied evidence and explicit source navigation. Opening
saved outlines restores persisted selections, annotations and visibility across
restart; changed or missing originals are reported without remapping. Retained
sources and artifacts stay accessible. Save annotation forms explicitly;
unsaved drafts survive live re-rendering, not host closure/reload.

Shared context has explicitly saved reader labels and roles, an exact-source
range-replacement command, and removal of the reading selection. Evidence cards
allow an explicitly saved manual region/snapshot choice and removal of the
region link. Detached evidence stays visible as an outline-level reference with
its supplied goal/context and retained-artifact action. Original statements,
hypotheses, checking evidence and unrelated reading work remain unchanged.
Text typed while a save is pending survives completion and needs its own save.
Failed or uncertain publication keeps live drafts, reports the failure and
blocks further project-private writes until host reload; retained reading
remains available. No association operation invokes a compiler, checker or
provider, or establishes a correspondence or proof edge.

The reading-level filter exposes orientation, central concepts/results,
governing ideas, argument structure and optional detail without imposing an
order. A cited result may be used while its proof is deferred. General informal
mathematics, including AI-generated/assisted articles, requires no Lean evidence.
Source statements, reader reconstruction and supplied evidence remain labeled
separately. Tactic goals are not declaration statements; local context is
available assumptions and snapshot associations are manual. Gap/repair and
dependency notes create no checked inference or source amendment. Text formats
and limits are in [the reader contract](vscode/README.md#offline-source-region-reader);
PDF/OCR and notebook regions are unsupported. Automatic extraction, AI proposals,
automatic gap detection and graph elimination remain pending. A faithful
outline does not establish proof correctness. See [validation](docs/VS_CODE_OUTLINE_VALIDATION.md).

**First manual overview across sources, 2026-10-16:** write ordinary Markdown
about a subject, book, monograph, article, section or argument. No template,
questionnaire, hierarchy or reading sequence is required. The extension inserts
a readable reference to an existing saved outline or exact region on explicit
request. VS Code owns editing, save, undo, recovery and preview. Place the cursor
in the link in the Markdown editor and explicitly follow it to the existing
reader; region references also select the pinned retained passage in plain text.
Changing annotations does not invalidate references. Changed/removed region
associations are reported without redirecting earlier prose to a new passage.
Changed or missing originals still permit exact retained navigation. Missing
targets/storage and different workspace scope fail clearly without rewriting
the document or guessing replacements. Overview prose is reader synthesis;
links confer no checking status or verified dependency. Copying Markdown alone
does not transfer private outline/source storage. Preview-click navigation and
remaining broader outline tooling stay pending.

**Accepted requirement, 2026-10-12; not implemented.** For a selected proof,
retain mathematical milestones and hide intervening vertices while preserving
dependency paths. Every summarized region shows a claim with its necessary
assumptions and an explanation of the omitted argument and its purpose. Offer
source navigation and expansion to the hidden steps. The reader may select
regions manually, explicitly request an AI proposal, and revise the proposed
selection or explanation.

Preserve joint premises and local scope. Identify whether the input is a
declaration map, source regions, tactic states, or elaborated proof structure;
these supply different levels of detail. Keep indirect edges expandable and
retain the exact source revision. A changed source invalidates the current
association without deleting the earlier outline. Inspection creates no
Verification or premise admission, and generated explanations retain separate
attribution. See [the full requirement](docs/PROOF_OUTLINES.md), including the
preferred VS Code frontend trial and the separate mathematical-use evaluation.

### Review

Perform mathematics selected from earlier work: reconstruct an argument,
complete a proof, solve a related problem, vary a hypothesis, produce an example
or counterexample, or repeat a Lean or Sage task. `ReviewState` is generated from
`TaskEvidence`; it is not a score asserted by the mathematician. See §7.

### Formalization

Formalization begins from a mathematical statement, problem, or proof step. It
may reveal an unnecessary hypothesis, a derivable symmetry, a missing lemma, or
a mismatch between prose and code. Such results are preserved as
`WorkArtifact`s, relations, or discrepancies produced during the mathematical
work.

Formalization is neither required for a corpus nor required before study. The
first problem-centered experiment therefore needs no formal development. A
separate experiment may test informal/formal correspondence where a formal
development already exists.

---

## 3. The theorem view

When the reader requests an introduction to an unfamiliar result, offer this
default presentation. It is not a required sequence of screens or completed
steps. Definitions, examples, prerequisites and local proof questions remain
accessible at any point; a focused expert question begins where the user asks.

```
Title
Why this result matters
Mathematical context — what it generalizes, what motivated it
Conceptual role — what work it does in the development
Statement
Proof idea — the idea that makes the proof work
Proof skeleton — the argument broken into its steps
Dependencies — what it rests on, formal and conceptual
Technical details
Formalization — when available
Verification — when applicable
```

`why` is a separate, explicitly requested post-correspondence view, not an
earlier Kallenberg level. In the first stateless CLI it assumes no prior command
or hidden session state. It cumulatively presents the source's purpose and
organization, central concepts and results, the selected result's role and
statement, governing idea, proof skeleton, available technical detail, and
reviewed formal correspondence in that order before displaying the exact claim
and context versions, admitted premises, term, derivation steps, checker result,
and separately labeled provenance and verification records. The checker result
is the linked `Verification` with method `justification_checker`, not a duplicate
field on the derivation. Its conclusion is labeled “derivable relative to these
admitted premises and policy,” never “true,” “known,” or “verified.”

**The statement precedes the proof idea.** Everything above the statement
answers *why am I reading this*; everything below answers *why is it true*.

**Expose dependencies when they help.** A proof skeleton can make the role of
a cited result clearer, but an unfamiliar definition or prerequisite may need
attention earlier. Formal dependencies and conceptual prerequisites remain
distinct. A source-linked explanation must make missing context visible rather
than suggesting that an incomplete definition list is exhaustive.

Each section links to its source and to related work. Any section may be absent.
An absent formalization is an ordinary state of the corpus, not a gap the
mathematician must fill. A formal proof without an explanation is likewise
displayed without treating verification as comprehension.
Missing explanatory material does not erase independently established evidence
or prevent appropriate use within its scope. The result remains available for
further study without making missing explanation a failed acceptance condition.
Ordinary retained model output remains a proposal until separately assessed; showing it does not supply
justification.

---

## 4. Subject navigation

Navigation may proceed from subject to chapter or section, then to concepts,
results, problems, proofs, attempts, examples, and formal artifacts where they
exist. No mandatory route ends in a formal proof.

The navigation graph is not the formal dependency graph. Conceptual
prerequisites, generalizations, analogies, motivations, and `ProblemRelation`s
are distinct from extracted formal dependencies. Problem-relation kinds are
`asks_to_prove`, `asks_to_prove_step_of`, `asks_to_apply`,
`asks_to_compute_instance_of`, `asks_to_construct_example_of`,
`asks_to_construct_counterexample_to`, and `prerequisite_for`.

An object may occur in several sources. Navigation shows those occurrences and
the established correspondences between them, with kinds `same_claim`,
`formalizes`, `restates`, `strengthens`, `weakens`, `implies`, and
`is_implied_by`. It never silently identifies two occurrences.

---

## 5. Work products and provenance

The primary human-produced records are `WorkArtifact`s created while doing
mathematics: attempts, proofs, calculations, diagrams, examples,
counterexamples, code, exposition, and ordinary notes. The interface does not
require these artifacts to be rewritten as structured reports.

Source-derived records include stable locators and quotations. Machine-derived
records include types, signatures, imports, dependencies, axiom usage,
verification status, and downstream references. Machine-derived facts are not
hand-edited; a suspected error is recorded as a discrepancy against the exact
fact and source revision.

Machine-proposed records include candidate correspondences, prerequisite
relations, hints, proof outlines, and review tasks. Every proposal retains its
origin whether it is accepted, edited, rejected, or merely used during an
attempt.

`ModelCall` records are generated automatically from bounded assistance
requests. They preserve the selected context, exact application-supplied request
content, provider, requested and resolved model identifiers, limits, non-secret
settings, status, and any raw response. They are operational provenance, not
mathematical work the mathematician must restate and not a trust, support,
correctness, confidence, or acceptance record.

`JustificationDerivation` records, when present, come from checked certificates
and exact context snapshots. Their `PremiseAdmission`s expose the external basis
and scope of every source, verification, correspondence, or model-derived reason
used. No such record is required before ordinary mathematical work, and the
Python interface renders rather than rechecks the justification calculus.

**Correspondence authoring.** Linking two source occurrences is a mathematical
judgment. The kind of relation is explicit because `formalizes`, `restates`, and
`implies` assert different relationships.

**Recording during work.** The system records only what the work produces or
what is needed to resume it: the source locator, relevant problem or object,
artifact, revision, assistance used, and provenance. Optional notes remain
ordinary mathematical notes. Recording may not become a gate before the next
mathematical step.

---

## 6. Discrepancies

A discrepancy records a conflict between an identified claim, relation, source
occurrence, or generated fact and another identified record about the same
subject. It records what conflicts, what detected the conflict, and how it was
resolved: claim revised, correspondence updated, mathematics changed, generated
fact regenerated, or false positive. Nothing is repaired automatically.

The constraints specified in the domain model also apply here. Absence from a
formal dependency graph does not refute a conceptual dependency. A record about
one declaration says nothing about another declaration, however similar their
names or roles.

A discrepancy may influence later task selection only as evidence about a
specific artifact or relation. It does not license an inference about the
mathematician's internal state.

---

## 7. Review

Review presents a mathematical task, not a request for a confidence rating or a
description of comprehension. `ReviewItem` kinds include reconstruction, proof
completion, hypothesis variation, example, counterexample, related problem,
Lean exercise, and Sage task.

Exact hypotheses, signatures, and source wording remain available for lookup.
Review instead tests use: state the mathematical content needed for the task,
reconstruct the argument, supply a missing step, apply the result, distinguish a
nearby false statement, or solve a variation.

Proof-completion tasks may come from gaps left by an author, an earlier failed
attempt, or a formal proof when one exists. Formal material is one possible
source of tasks, not a prerequisite.

`ReviewState` is generated from `TaskEvidence`: completion, checking result,
hints used, later reconstruction, and performance on related problems. For work
that no machine can decide, the artifact remains available for mathematical
inspection; the system does not replace judgment with a score. No prompt asks
the mathematician to declare a level of comprehension.

---

## 8. AI-generated mathematics and machine assistance

AI-generated mathematics is source material for the same activities as
human-authored mathematics. Its origin, model when known, verification status,
source revision, and later judgments remain distinct. Formal verification does
not by itself establish that a human has understood the result.

Task-mediated assistance begins when the mathematician requests help with active
work: for example, asking for an explanation of a definition or result, a
possible source, criticism of an attempted step, an intermediate lemma, a
computation to perform, a proof outline, or a related problem. Theorem Terminal
constructs the request from the current problem or object, displayed source
passages, and displayed `WorkArtifact`s. Before submission, the mathematician
can inspect and reduce the exact outbound context. Nothing else is sent.

R2 delivers one initial exchange in steps 1–3 and the exact-retain/edit/dismiss
part of step 5. R3 delivers one bounded explicit linked follow-up in step 6.
Source/citation retrieval in step 4 is not automatic:

1. Select source or work passages and write the mathematical question.
2. Inspect the provider/model and exact outbound content; remove unwanted
   context and explicitly authorize this request.
3. Read an attributed answer as a selectable inert plain-text presentation.
   Returned markup, links, citations and code stay inert and visibly unverified;
   the complete exact raw response and terminal record remain inspectable. A later safe notation view
   must preserve this exact access and may neither execute nor fetch content.
4. Open a supplied source passage, inspect an unsupported citation, or compare
   a proposed step with the work without losing the question or note.
5. Retain a useful exact passage or write a separately attributed correction or
   synthesis in the work. Reject or leave the rest unused without a mandatory
   sentence-by-sentence classification.
6. If useful, explicitly request a linked follow-up with the correction or
   alternative assumption, then continue the mathematical work.

No developer request JSON, declaration name, formal artifact, warrant or
five-anchor setup precedes this workflow. A natural-language question is enough;
metadata comes from the chosen work. The UI must not label an unverified model
citation as a retrieved source, or an answer as complete when context is missing.

The delivered R2 dock is non-modal so the selected source and ordinary note stay
reachable. It shows OpenAI and the requested model, every exact selected context
with source identity/current revision/scalar range, the question, complete
instructions/input, configured limits, destination, retention disclosure and
the exact UTF-8 body with its byte count and digest. Context removal or any draft
edit invalidates the preview. The requested model is a non-secret per-request
field optionally initialized by `THEOREM_TERMINAL_OPENAI_MODEL`; the credential
is read only from `OPENAI_API_KEY` at the separate Send action. No credential is
stored or displayed.

Transport runs off the Qt thread and keeps ordinary note editing available. One
in-flight slot prevents duplicate sends. Closing or switching a source view does
not change the frozen request, and a completion never replaces concurrent note
edits. Cancellation before Send makes no request or artifact. After Send, the
existing adapter retains completed, refused, incomplete or failed terminal
records when possible; only a completed record enables passage projection or
note contribution. Dismissal records no mandatory disposition.

R3 starts only from an initial completed retained call. The mathematician
selects one to eight deterministic exact response passages, may add current
visible ordinary-text selections, and enters one new question. A correction,
changed assumption or alternative remains a separately labeled human-authored
field; the last useful conclusion and unresolved issue are editable task-summary
fields. Editing or removing any input invalidates the preview. The preview shows
the exact parent identity and response digest, every selected half-open UTF-8
span and text, all current context, human fields, provider/model, limits,
destination and every request-body byte. The child records `in_reply_to` but the
adapter sends no `previous_response_id`, provider conversation state, unselected
parent response or hidden history.

Parent selected text, human correction and terminal child result remain visible
together. A completed child reuses exact projection and separately attributed
editable insertion. Refused, incomplete and failed children remain retained
terminal outcomes without retry. After a terminal child, private workspace state
stores only bounded human task text plus exact record paths/revisions,
parent/child identities and selected response spans. Reopening validates those
immutable records off the GUI thread and restores the comparison without a
provider call. A missing, redirected or changed record is reported while the
human task summary remains available; no replacement span or revision is
guessed. An explicit ordinary-note handoff records the human task summary and
immutable identities without copying or verifying model prose.

The R3 cut line is one initial parent and one child. The child cannot become a
new parent in this workflow, and an existing saved investigation cannot be
silently overwritten to create a branch. General conversation history,
automatic summaries, branching, retry, source retrieval and provider tools stay
outside this interaction. This is the current implementation boundary, not a
permanent product requirement; deeper follow-up needs evidence from real use.

R3.1 supplies the missing terminal lifecycle for that single slot. **End
investigation…** is available in the Work menu and the assistance dock. Because
an inserted handoff is an ordinary editable note rather than workspace metadata,
the application does not read or search note content to infer whether insertion
already occurred. Ending therefore requires one explicit choice: insert the
human task handoff and end, end without insertion, or cancel. If the dock shows
the active investigation, insertion captures and validates its latest visible
question, correction, conclusion and unresolved issue rather than an older
checkpoint, including for the standalone insertion action. It does not use an
unrelated draft or empty widgets when that investigation is not displayed. The
first choice makes an ordinary unsaved-note edit before clearing; the second
explicitly discards the private human task text and changes no note text; cancel
changes nothing. Validation failure preserves the visible fields, note and
active pointer.

Ending durably replaces only the private active-investigation pointer with no
pointer. It deletes or rewrites no `ModelCall`, projection, selected passage,
anchor, recovery entry, ordinary file or unrelated workspace field. Recovery and
workspace publication must complete before the UI reports success. Both menu and
dock End actions are disabled during foreground work, and the handler rechecks
busy state, active identity and any editable target after the modal confirmation
returns. Restore workers validate a captured pointer; an obsolete completion is
ignored rather than reinstalling an ended or replaced panel.

On an initial checkpoint or pre-publication failure, the live pointer and visible
human edits remain and the error stays visible under the existing blocked-write
policy. If an explicitly requested handoff was inserted first, that unsaved note
edit and the active pointer both remain; the application reports that ending
failed and neither retries, duplicates nor undoes the insertion. It claims no
durable recovery for text whose checkpoint did not finish. If directory
synchronization fails after atomic replacement, publication is uncertain: the
live session keeps its old pointer and blocks writes, but reopen may observe the
complete no-pointer replacement. No rollback is attempted. After a successful
end and application restart, a new independent bounded parent/child
investigation may be started in the same project. This is sequential reuse of
one slot, not simultaneous investigations, an archive browser, a conversation
tree or child-of-child chat.

Each explicit user action creates at most one provider request. The request
obeys configured input, output, and timeout limits, invokes no provider tools,
and performs no automatic retry or recursive request. R2 supplies no retry or
follow-up action. R3's one user-requested follow-up creates another `ModelCall`
linked to the preceding call and no further live child.

Each request produces a local `ModelCall`. The record contains every
application-supplied instruction and message, the source and artifact versions
used, provider, requested and resolved model identifiers, adapter version,
limits, non-secret settings, times, status, response identifier when supplied,
and raw response. This record permits inspection; it does not promise
deterministic replay. Provider-side conversation state is not canonical.

When the provider allows API response storage to be disabled, the first
experiment requests that setting and records it. This does not assert that the
provider performs no other processing or retention; the configured service's
terms still govern its handling of the request.

The raw response is preserved before extraction. Response digestion is the
human-led work of reconstructing, checking, and synthesizing returned material.
Its first executable step is a deterministic local response-review view that
keeps provider, model, purpose, and response digest
visible and initially shows a numbered passage index rather than flooding the
terminal. The complete exact response remains available. Viewing writes
nothing, makes no provider request, invokes no tool or Lean process, and creates
no representation or task event.

The mathematician selects a visible passage; the application resolves that
selection and computes and validates the digest-anchored half-open UTF-8 byte
span internally. The interface never requires the mathematician to calculate
byte offsets. Every displayed record-derived string passes through the safe
terminal renderer. The application emits no terminal hyperlink escapes and
never interprets or dispatches returned markup, commands, or URLs; a terminal
may nevertheless auto-link plain URL text. The recorded response remains
unchanged.

Only a statement, hint, outline, calculation, source suggestion, criticism,
intermediate lemma, or proposed solution that enters the mathematical work, or
whose correction, rejection, or abandonment is recorded, becomes a lossless
`Representation` with `Provenance.origin = ai_proposal`, a link to its
`ModelCall`, and its exact response span anchored to the response digest. The
call purpose maps to an existing generic representation kind; no parallel
AI-response hierarchy is introduced.

A candidate-route view is derived only from routes explicitly present in
returned response spans and routes recorded in `WorkArtifact`s; it is
not a new stored entity. It does not claim access to hidden model reasoning,
chain of thought, internal search, or alternatives that were never returned.
Use, correction, rejection, and abandonment are recorded as `TaskEvidence`, not as properties of the call.

A paraphrase or synthesis is a separate representation linked through
`derived_from`; it does not replace its exact sources or acquire their
verification, admission, or disposition. A model-produced synthesis requires a
new, explicit, linked `ModelCall`. Storage, viewing, extraction, and synthesis
are not mathematical integration. A suggested source becomes a source
occurrence only after it is independently retrieved and identified; a reported
calculation or proof check becomes a verification only after the corresponding
method or attestation is obtained separately.

When a selected proposal participates in an inspectable warrant, the interface
uses the ordinary justification records rather than an AI-specific status. It
keeps the documentary atom
\(D=\operatorname{ModelProduced}(C,h,s,R)\) distinct from the substantive atom
\(F\). Admitting \(m:D\) records only that the exact call returned the exact
proposal. A separate, scoped admission \(r:(D\to F)\) is required before a
checker may derive \(r\cdot m:F\). The view shows the call, response digest and
span, both admissions and their bases, the derivation, and any later withdrawal.

The interface does not force the model call into the mathematical warrant. If
the proposal prompts an independent proof, source retrieval, computation, or
formal check that supplies \(v:F\), it displays that direct warrant and retains
the model call only as attributed causal assistance and task evidence. Neither
using a proposal during work nor marking it corrected or rejected creates a
premise admission.

The raw response is treated as untrusted content. It cannot execute markup or
commands, open a link, invoke a tool, or be submitted again without an explicit
user action. Credentials are absent from model-call records, displayed context,
logs, exports, and error text.

Assistance is given only on request and may be revealed in stages so that it
does not replace the attempt it is meant to support. Use, correction, rejection,
or abandonment of a proposal is recorded in `TaskEvidence`; none converts the
proposal into a human judgment.

**Non-goal.** Importing external AI content and making model requests from
active mathematical work do not make Theorem Terminal a general chat client,
prompt manager, conversation archive, provider-orchestration layer, or
autonomous agent system.

Ordinary mathematical sessions never require a model call. The Stage 1
evaluation deliberately includes one request at a genuine obstruction so that
this function is tested.

Assistance is useful only if it reduces the time or obstruction between the
mathematician and substantive work. A feature that requires more correction or
record keeping than the mathematical help it supplies is removed.

The executable offline documentary bridge covers only the mechanics behind
exact-span projection and checker handoff. Its explicit sequence is projection,
documentary admission, and Lean checking of (m:D). It does not make a model
request, create a substantive (F), admit (D\to F), or show that assistance
helped. It therefore cannot replace the genuine-obstruction request below or
satisfy the acceptance criteria of §9.1.

The public check repeats strict response, span, assertion-hash, and cross-link
validation before invoking Lean and rejects a source, compiled module, or
executable that does not match the pinned Linux x86-64/WSL checker identity.
The application stamps the checker-handoff time in canonical UTC; the resulting
external `Verification` and Lean check record use it separately from the earlier
admission and context time. The external record also binds the exact retained
projection and stamped request bytes. Lean checks
derivability over opaque atom identities; it is not used as the response-hash
validator.

---

## 9. Study and collaboration evaluation

Evaluate usefulness as each R1–R3.1 increment is delivered. Source choice follows
the current mathematical need. Reading/re-entry and unformalized problem work
test distinct capabilities; neither substitutes for the other. The warrant
experiment in §9.3 has independent acceptance criteria.

Report epistemic, practical, explanatory, and organizational benefit separately,
using the evidence appropriate to each. A restored file demonstrates a mechanism;
resuming actual mathematical work can demonstrate organizational benefit without
establishing a new conceptual insight. Conversely, a clarified argument does
not establish durable resumption. Absence of explanatory progress leaves that
benefit unproved, without cancelling a demonstrated benefit elsewhere.

For existing-literature study, observe whether an outline, located prerequisite,
notation comparison, or source connection enables work on a selected passage or
question. Preserve the supporting locations, actual mathematical work, and
unresolved step, then observe later continuation. Source retrieval alone does
not establish understanding; a useful source route or appropriate application
may establish another benefit. Record consequential effort without inventing
comparative time savings.

### 9.1 Problem-centered study without formalization

Use a locally available mathematical source and a problem worth doing; a
coherent algebraic number theory cluster remains a suitable candidate.

1. Open the source and a work note. Offer purpose, definitions, relevant results
   and examples when needed, without forcing a completed orientation sequence.
2. Begin a proof, calculation, example or counterexample in an ordinary file.
3. At a genuine obstruction, select relevant context and request an explanation,
   hint, criticism or other bounded help through the workflow in §8.
4. Assess the answer through the actual mathematics. Retrieve suggested sources
   or perform checks explicitly when useful; otherwise suggestions remain
   unverified. A proposed calculation is not a computation that has been run.
5. Preserve useful passages, revisions, corrections and the resulting work,
   linked to their exact sources. Keep a synthesis distinct from its inputs.
6. Leave the next question or unfinished step in the note and continue later.
   A related problem or reconstructed argument can test later retention.

R1–R3.1 have been technically verified with deterministic local responses for
assistance. No live provider request or genuine mathematical-obstruction trial
was performed, so the following acceptance remains unobserved rather than
inferred from tests.

**Acceptance.** Useful mathematical work is possible without a formal artifact.
One real assistance exchange is traceable from inspected outbound context
through raw response to a contribution used, corrected, rejected or abandoned.
Assess its effect on subsequent work, including correction and record-keeping
cost. Exact passages are selectable without user-supplied byte arithmetic.
The saved work is sufficient to continue the actual attempt. A checked warrant
and a disposition for every sentence are not prerequisites.

### 9.2 Mathematical reading and re-entry

R1's PDF-plus-note workflow is implemented and technically verified. Its
contribution to mathematical usefulness remains pending a natural reading and
later continuation; automated and visual checks do not establish that outcome.

The supplied September 14 evidence shows useful saved notes, reopened panes and
one retained manuscript passage. The guidance came from the surrounding
assistant interaction; it does not establish implemented GUI guidance.
Five-anchor restoration and confirmed marker Return were not completed, and
the unavailable historical seed prevents a historical reduction claim. No
anchor persistence defect or crash follows from these observations.

Use the actual saved work in a durable project, or begin a clearly identified
new prospective session if it is unavailable. Do not repeatedly reconstruct a
missing note as a substitute for testing continuation. Appendix A is available
for this experiment; another current mathematical source is also legitimate.

1. Open the source and previous note at the current question. For unfamiliar
   material, establish purpose and needed definitions before unnecessary proof
   detail; a returning reader may proceed directly to the unfinished argument.
2. Locate the passages and examples needed to understand or continue the work.
   Retain only the context the user finds helpful, with no required anchor count.
3. Produce a substantive continuation: clarify a definition, explain a method,
   repair a proof step, construct an example or identify a precise open issue.
4. Save the conclusion and intended next step in ordinary work. Marking a
   passage is optional and must give visible success feedback when used.
5. Close and reopen; resume from the saved work and continue the mathematics.
   Compare consequential reconstruction effort prospectively, without claiming
   an unavailable historical baseline.

**Acceptance.** The reader can continue meaningful work with the source, note
and relevant locations available. Quality of the explanation or argument and
the burden of resuming matter together. Search counts, a restored cursor and
a shelf quota do not independently establish mathematical usefulness.
Formal counterparts are consulted only when useful.

Edit-stable anchors and their bounded previews remain mutable navigation aids.
They do not relocate immutable quotations, source occurrences, provenance,
admissions, verifications or warrants.

### 9.3 Independent formal correspondence and warrant experiment

Run this when the active mathematical question calls for it, separately from
acceptance of readable study and live assistance.

For the Appendix fixture, inspect the relevant manuscript result, Lean
declaration and `Lean/docs/AppendixA.md` correspondence. Then explicitly request
`why` for `lem:range-lifting-pullback-section`. Inspect the immutable manuscript
claim, exact proposition of
`Dom.exists_total_lift_iff_rangeLiftPullback_section`, pinned kernel-attestation
claim, separately admitted bridges and checked \(J_0\) certificate.
In a test fixture, vary a source, formal environment or admission and confirm
that only dependent current routes deactivate while old certificates remain.

For the documentary model-response experiment, trace one exact response span
to its documentary atom. Inspect either explicitly admitted \(m:D\) and
\(r:(D\to F)\) with checked \(r\cdot m:F\), an independently based
\(v:F\) route with no AI-to-claim bridge, or rejection/abandonment without a
warrant for \(F\). Never manufacture a bridge to complete the experiment.

**Acceptance.** Display only contextual derivability and keep source identity,
external verification, premise admission and human judgment distinct.
\(m:D\) alone cannot derive \(F\). The visible derivation exposes the actual
bridges, and withdrawing an admission preserves the old record while
deactivating the dependent current route. These requirements govern the
warrant experiment, not entry into mathematical study.

---

## 10. Later large-corpus experiment

**Delivered bounded exception, 2026-10-21 (VS Code 0.8.0).** **Import Stacks
Section…** accepts an official section URL/tag, downloads source and its tag map
at one Git commit, and shows identity, revision and effective destination before
publication. The source reader offers direct statement/proof navigation,
restricted bundled MathML, exact retained TeX and explicit local citation
following. Source context, authors, canonical citations and license remain
available; editable annotations retain their separate attribution. Reimport at
the same revision reopens the saved outline; a new revision creates a separate
one. Unsupported structural syntax offers explicit source-only retention;
display limitations show the complete raw fragment. Retained reading, citation
following and annotation do not download or execute anything. Existing links and
Obsidian controls apply unchanged. No earlier study ceremony gates this
separately authorized importer. [Usage and limits](docs/STACKS_WORKFLOW.md).


The broader experiment below remains deferred. Apart from the bounded exception
above, it may begin only after
the two initial sessions have been evaluated and it has been authorized
separately. Use either the Stacks Project
[@stacksprojectauthorsStacksProject2021] or Kerodon.

1. Import the selected source's published hierarchy, stable identifiers,
   cross-references, and revision information.
2. Begin from a subject-level mathematical question.
3. Obtain the statements, proofs, examples, and surrounding context required by
   the current work.
4. Preserve the ordered source locations consulted, work artifacts, model
   assistance, unresolved questions, and later reconstruction tasks.
5. Resume the work after an interruption.
6. After a source revision, identify the stored records whose cited source
   material changed.

**Acceptance.** A mathematician can identify a coherent sequence of relevant
source locations, study selected material, perform substantive mathematical
work, and later resume it without a preliminary semantic classification of the
corpus. A source revision identifies the stored records that require inspection.

---

## 11. Failure modes

The interface has failed if it requires or encourages:

- treating an incomplete prescribed evaluation ritual as a failure by the user;
- requiring five anchors, formal correspondence or a warrant before useful study;
- counting tests, searches, responses or preserved records as mathematical benefit;
- improving provenance machinery while the user still cannot read the source
  comfortably or ask a task-local mathematical question.

It has also failed if:

- a subject map, inventory, or comprehension form must be completed before
  mathematical work begins;
- large-corpus study requires manual semantic classification before a
  mathematical question can be pursued;
- a formal proof is treated as available or required when none exists;
- formal-logic entry or premise maintenance is required before mathematical
  study;
- problem solving is secondary to browsing or record maintenance;
- assistance reveals a solution before the mathematician requests that level of
  help;
- source material or a work artifact is sent to an external model without an
  explicit model call and inspectable outbound context;
- a raw model response or extracted proposal appears as a source fact,
  verification, or human judgment;
- a model call or proposal receives a bespoke trust, support, confidence,
  correctness, acceptance, authority, or integration status;
- extracting structured model output automatically creates a premise or a
  provider-wide bridge from model production to mathematical truth;
- provider-side conversation state becomes the canonical project record;
- model assistance expands into unsolicited follow-ups or a general chat
  workflow;
- an offline, synthetic, or replayed integration fixture is counted as the
  required model call at a genuine mathematical obstruction or as evidence
  that assistance improved subsequent work;
- explanations or proposals appear without their origins;
- review measures lookup or self-description instead of mathematical
  performance;
- verification status is read as comprehension;
- contextual derivability is presented as truth, knowledge, or external
  verification;
- a `Correspondence` automatically creates a logical implication or premise;
- justification sum is displayed as confidence, corroboration, independence,
  or evidential weight;
- navigation degenerates into a formal dependency-graph browser;
- preserving work costs more attention than resuming it saves;
- discrepancy detection produces more irrelevant interruptions than useful
  corrections.

---

## 12. Open questions

- Which initial problem cluster best tests both theoretical proof and
  computation without requiring broad ingestion?
- Which of the Stacks Project and Kerodon should be used for the later
  large-corpus experiment, and which published interfaces provide its hierarchy,
  identifiers, cross-references, and revision information?
- Which levels of assistance should be available, and which should require an
  explicit request?
- Which single model and service should be configured for the first experiment,
  and what minimal response schema preserves the mathematical content without
  forcing it into an inadequate schema?
- How should outbound context be selected from sources and work artifacts
  without manual classification or unnecessary disclosure?
- How much prerequisite context can be recovered from sources and prior work
  without manual classification?
- What orientation view serves a large problem-centered source and what view
  serves a small research project?
- Which `ProblemRelation`s require human judgment and which may be proposed from
  source structure and prior attempts?
- How does a curated subject map survive revisions of its sources?
- Which `ReviewItem`s can be generated from `TaskEvidence`, and which require
  mathematical authorship?
