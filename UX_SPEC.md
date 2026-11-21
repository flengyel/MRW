# User experience specification

This specification defines MRW's interaction requirements. The
[README](README.md) and [user guides](docs/README.md) describe current behavior;
the [design register](docs/DESIGN_RECONCILIATION.md) identifies pending work.
Proposed behavior is not a claim that an interface exists. VS Code owns ordinary
editing, saving, undo, layout and document recovery. The
[standalone Qt maintenance rules](#standalone-qt-maintenance) apply only to
that application.

[Integration boundaries](docs/INTEGRATION_BOUNDARIES.md) govern optional
companions: the responsible system owns creation and execution; MRW delegates
explicitly and retains scoped references and results.

<a id="evaluation-follow-up--interface-and-continuity"></a>

## Interface requirements

- Keep Contents and Commands. Group secondary actions by reading/notes,
  sources/references, calculation, proofs, tools/setup and earlier saved work.
  Use contextual menus and keyboard access rather than another command wall.
- Open ordinary documents in place. Contents follows the selected Markdown
  document's headings and links, including unsaved text. Preserve exact Return
  occurrences and report missing, ambiguous or changed targets.
- Choose Notes Folder defines one explicit scope and remembers recent choices.
  Browsing documents does not change that scope. Cancellation preserves settings.
- New Note delegates to the configured Obsidian creation command for a vault,
  or opens a blank VS Code editor for an ordinary folder. Obsidian owns prompts,
  templates, filenames and Save. A missing command produces no fallback note.
- Ordinary reading creates no problem or study record and offers no unsolicited
  registration. Keep saved attempts, study history, Archive and Restore, Proof Outline
  and Lean study available on request.
- Bind lesson actions to the selected lesson or its associated code. Unrelated
  Lean files retain native controls. Preserve lesson, code, notes and Return.
- Name API and companion destinations where help is requested. Show exact context
  and proposed changes before application. Copying context does not send it.
- Keep source text and reader notes prominent. Attribution and optional tools
  must not displace the argument. Folded proofs and notes remain available for
  explicit expansion; annotation saves distinguish submitted and newer drafts.
- Reuse native notebook rendering and comparison. Keep saved output, producer
  accounts and live execution distinct; viewing or comparison executes no cells.
- Setup distinguishes installed, configured, reachable and unsupported states.
  Opening setup performs no installation, service probe or job submission.

The complete routes are note → saved source → Return; lesson → code → notes →
Return; retained calculation → comparison → export; and Zotero reference →
attachment → Return. Each preserves dirty buffers and handles missing/changed
links, cancellation and restart. Resumption recovers existing work and its
context without duplicate question, conclusion or next-action forms.

## Persistence and optional tools

The [reader](docs/READING_OUTLINE_WORKFLOW.md),
[Obsidian](docs/OBSIDIAN_WORKFLOW.md), [notebook](docs/NOTEBOOK_RESULTS.md),
[source-study](docs/ACTIVE_STUDY_WORKFLOW.md) and
[study-lifecycle](docs/STUDY_LIFECYCLE.md) guides define their current controls
and recovery limits. Immutable citations retain original revisions; mutable
navigation and current locations do not rewrite them. External notes remain
independent works with optional associations.

Use the [storage contract](docs/ARTIFACT_STORAGE.md) and
[workspace relocation contract](docs/WORKSPACE_RELOCATION_DESIGN.md) for moves,
adoption and interrupted operations. Synchronization is not multi-writer
coordination. Never initialize replacement storage merely because a target or
mount is unavailable. Windows-backed private storage remains unqualified.

The [diagnostics companion](docs/DIAGNOSTICS_PLUGIN.md) derives bounded, read-only
feature-use and integrity reports. Show period, scope, coverage and unknowns
before totals. Export is explicit; a report does not authorize repair or
retirement of work. The [provenance design](docs/PROVENANCE_DESIGN.md) connects
results, inputs, method revisions and notes without a mandatory workflow canvas.

## 1. Design principle

Begin with a source, question or unfinished calculation in an ordinary file.
Keep the relevant passages, prior work and calculations within reach. When the
reader requests an outline or a prerequisite, give its source location and
identify proposed connections. The reader can keep the next question and its
sources in the working note or notebook.

A result may be used before its proof is understood. Show the hypotheses, the
grounds for using it and the scope of any check. A missing explanation and
missing grounds raise different questions.

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
Open and edit files in place using native editors and the reader's chosen pane
layout. Viewing or comparing documents requires no preliminary metadata. Keep
MRW commands available through visible menus, preserve native editing shortcuts
and keep the active Save and Find targets clear.

Use an available PDF viewer beside the work note, or offer the system reader.
Opening a PDF requires neither TeX source nor a build and does not extract a
passage. For assistance on a PDF excerpt, use the reader's transcription and
show the exact text before sending. Keep any supplied revision and page with
the transcription, and distinguish corrections from the source.

Use [Reopen Document and Return to Document](docs/READING_OUTLINE_WORKFLOW.md#backlinks-edits-and-restart)
and [Recent Documents](docs/RECENT_DOCUMENTS.md) to recover files and supported
locations. In Recent Documents, keep the title, filename and path. When MRW
can match a previous Markdown selection to the current text, show a short
excerpt and restore the selection on opening. Store the revision and range,
and read the excerpt only from the authorized document when showing the list.
Explain why a missing, changed or ambiguous exact link cannot be
followed, and preserve the last usable Return destination. Offer the current
document when it can be opened without claiming to restore an earlier passage.
VS Code handles dirty buffers and pane layout. MRW reopens PDFs at the file
level; page and zoom belong to the viewer. MRW does not restore preview scroll
positions or live kernel state.

A standard `.ipynb` can serve as a working document alongside or in place of a
Markdown or TeX note. VS Code and Jupyter own notebook editing, rendering,
saving and explicit kernel actions; SagePod supplies computation. File links
join the notebook and notes. Use the Markdown editor to follow private
retained-source references within their owning workspace. The
[notebook workflow](docs/SAGEPOD_NOTEBOOK_WORKFLOW.md) does not pass cell
selections to MRW assistance or insert replies into cells. Keep the notebook's
location available on return and distinguish saved outputs from live state.

Opening, viewing and resuming do not make MRW submit a model request, import a
remote source, build a document, compile a diagram, check a proof, start a
container or kernel, or run a calculation. Each of those actions requires an
explicit request. Native editor services such as Lean diagnostics run as usual.

In VS Code, [Markdown citation preview](docs/ZOTERO_WORKFLOW.md#citation-rendering-in-existing-notes)
may automatically run a trusted local Pandoc executable in a trusted workspace.
It can use a scoped bibliography or inline references, or look up cited keys
in the configured Zotero libraries through Better BibTeX on loopback. This
read-only preview leaves the note and library unchanged. Keep unresolved
citations visible and show which reference data the preview used.

When retained model or warrant material becomes relevant, inspect it alongside
the work. Show attribution and response identity before returned mathematical
text. Retain exact passages on request. Inspection creates no new response,
premise admission or verification. Keep provenance, verification, premise
admission, contextual derivability and human judgment distinct.

### Standalone Qt maintenance

The older standalone Qt application opens a local PDF and a work note in
independent panes. Keep PDF bytes outside text buffers, recovery and anchors.
Preserve the document identity, page and zoom separately from generated-output
provenance. Restore the page and zoom only for the matching document. Report
missing, invalid or changed PDFs without discarding the note or overwriting the
last valid reading state. Migration validates stored state without reading
sources; loading validates the selected document.

Retain platform-standard Open, Save, Find and Find-next shortcuts, explicit
PDF-versus-editor focus status and visible marker feedback. Save names the
editable text target even when a PDF has focus. Find and Find-next are text
operations and are visibly unavailable while the PDF has focus. Qt does not
provide PDF search, outline, SyncTeX or text extraction. Keep the note and
return location available during a lookup; following an internal link must
not silently launch an external action.

Qt assistance begins from a nonempty visible selection in an ordinary text
buffer. Its non-modal dock freezes the selected text, current in-memory
revision and scalar location, accepts one question, permits context
removal, shows the exact request body and requires a separate Send. It includes
no PDF bytes or implicit extraction. A PDF-motivated question therefore uses an
explicit ordinary-text transcription or corresponding source selection. The
answer remains inert attributed plain text with exact raw-record access. Exact
passage retention and separately attributed editable note insertion are
explicit; neither creates a premise, Verification, warrant or disposition.

Different projects may be open in different Qt processes. Use one active process
per project; there is no lifetime lock.

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

On re-entry, Qt restores the open work, selected passage and rendering position.
Two panes comparing the same file retain independent cursor, selection and scroll
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

Wrapped views of one shared document keep equal viewport widths because the
document has one layout width. Splitter movement and resizing preserve this
constraint and both pane positions. Different buffers or unwrapped views may
have unequal widths; no earlier unequal ratio is restored automatically.

---

## 2. Session types

These are mathematical activities, not mutually exclusive application modes or
mandatory tabs. A session may move among them.

### Orientation

Enter or revisit a subject. Locate its organizing concepts, central results,
principal problem families, and the relations needed for the work at hand. Use
links in the working note to keep useful source locations and prior work within
reach.

Orientation serves a mathematical task. It is not a preliminary exercise in
describing the subject or completing a domain model.

### Problem solving

Work on a source problem, omitted proof step, calculation, example or research
question in an ordinary file or on paper. Keep questions, attempts and solutions
where they were written, linked to useful sources. Follow a solution link to
its note and preserve the originating location for Return. Exact passages,
definitions, prior work and assistance are available on request.

Record structured attempts and their assistance history within a study the
reader [explicitly starts](docs/ACTIVE_STUDY_WORKFLOW.md#attempts-and-continuation).
Outside a study, the reader can retain a source passage or calculation and link
it from the work. Ordinary problem solving requires no problem record or
separate attempt or outcome form.

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

The [graph workflow](docs/PROOF_GRAPH_WORKFLOW.md) supports source-based claims,
attributed explanations and reversible vertex omission. Each summarized region
retains its necessary assumptions, joint premises, alternative derivations and
local scope. Expansion exposes the original steps and exact source passages.
The reader can change the retained selection and revise explanations. The
original graph and source revisions remain available.

Identify the representation: declaration dependencies, source regions, tactic
states and elaborated proof structure provide different information. A
navigation edge or a recorded tactic context does not establish inference.
General extraction and automatic mathematical checking are separate work.
A faithful outline does not by itself establish correctness or understanding.
See the [mathematical contract](docs/PROOF_OUTLINES.md).

The [saved-source reader](vscode/README.md#offline-source-region-reader) retains
exact text and manual statement/context selections, attributed notes and
optional supplied evidence. Current selections can be revised or removed;
earlier pinned citations retain their source ranges. Detached evidence stays
readable without acquiring a new proof association. Missing or changed originals
do not remap retained passages.

Saved annotation edits preserve newer typing while a save is pending. Failed
or uncertain publication preserves drafts and reports the blocked write state;
read-only retained material stays available. Save forms before closing or
reloading: their live drafts are not host editor buffers.

Ordinary Markdown can connect subjects, books, sections and arguments across
sources without a required template, hierarchy or reading order. Source
assertions, reader synthesis, proposed connections and checking evidence remain
separate. Copying a note does not transfer private retained-source targets.
PDF/OCR and notebook-cell regions are outside the current retained-text reader.

### Review

Perform mathematics selected from earlier work: reconstruct an argument,
complete a proof, solve a related problem, vary a hypothesis, produce an example
or counterexample, or repeat a Lean or Sage task. See §7 for evidence and
scheduling within a chosen review.

### Formalization

Formalization begins from a mathematical statement, problem, or proof step. It
may reveal an unnecessary hypothesis, a derivable symmetry, a missing lemma, or
a mismatch between prose and code. Such results are preserved as
`WorkArtifact`s, relations, or discrepancies produced during the mathematical
work.

When a formal development exists, compare its declarations with the
corresponding manuscript statements. A reader can study a paper on its own.

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

In the command-line example, `why` opens a reviewed correspondence and its
justification on request. The command presents the source's purpose and
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

Working files hold the products of mathematics: attempts, proofs, calculations,
diagrams, examples, counterexamples, code and exposition. A retained
[`WorkArtifact`](DOMAIN_MODEL.md#workartifact) preserves a chosen revision without
requiring a structured report.

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

**Recording during work.** Preserve exact revisions, source locations and
provenance for work the reader retains. Record attempt and assistance evidence
for a chosen study, and preserve evidence of explicitly requested checks or
model calls. Keep ordinary drafts and next steps in their working files.
Recording may not become a gate before the next mathematical step.

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

For work the reader keeps for review, `ReviewState` draws on relevant
`TaskEvidence`, such as completion, hints used and later reconstruction. Apply
the [recall eligibility rules](docs/ACTIVE_STUDY_WORKFLOW.md#review-and-effort)
before changing a schedule; opening a source or checking a proof does not
qualify on its own. Keep the artifact available for mathematical inspection
without asking for a comprehension score.

---

## 8. AI-generated mathematics and machine assistance

AI-generated mathematics is source material for the same activities as
human-authored mathematics. Its origin, model when known, verification status,
source revision, and later judgments remain distinct. Formal verification does
not by itself establish that a human has understood the result.

Task-mediated assistance begins when the mathematician requests help with active
work: for example, asking for an explanation of a definition or result, a
possible source, criticism of an attempted step, an intermediate lemma, a
computation to perform, a proof outline, or a related problem. MRW
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

The reader enters a question in ordinary language. MRW takes its references
from the selected work. Distinguish a suggested citation from a retrieved
source and identify any missing context.

The standalone Qt assistance dock is non-modal so the selected source and ordinary note stay
reachable. It shows OpenAI and the requested model, every exact selected context
with source identity/current revision/scalar range, the question, complete
instructions/input, configured limits, destination, retention disclosure and
the exact UTF-8 body with its byte count and digest. Context removal or any draft
edit invalidates the preview. The requested model is a non-secret per-request
field optionally initialized by `MRW_OPENAI_MODEL`; the credential
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
$D=\mathrm{ModelProduced}(C,h,s,R)$ distinct from the substantive atom
$F$. Admitting $m:D$ records only that the exact call returned the exact
proposal. A separate, scoped admission $r:(D\to F)$ is required before a
checker may derive $r\cdot m:F$. The view shows the call, response digest and
span, both admissions and their bases, the derivation, and any later withdrawal.

The interface does not force the model call into the mathematical warrant. If
the proposal prompts an independent proof, source retrieval, computation, or
formal check that supplies $v:F$, it displays that direct warrant and retains
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
active mathematical work do not make MRW a general chat client,
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

**Acceptance.** Useful mathematical work is possible without a formal artifact.
One real assistance exchange is traceable from inspected outbound context
through raw response to a contribution used, corrected, rejected or abandoned.
Assess its effect on subsequent work, including correction and record-keeping
cost. Exact passages are selectable without user-supplied byte arithmetic.
The saved work is sufficient to continue the actual attempt. A checked warrant
and a disposition for every sentence are not prerequisites.

### 9.2 Mathematical reading and re-entry

Use actual saved work in a durable project. If it is unavailable, begin a
clearly identified prospective session rather than reconstructing a missing note
and claiming a comparison with it. Choose material relevant to the current
mathematical question.

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
   an unavailable earlier baseline.

**Acceptance.** The reader can continue meaningful work with the source, note
and relevant locations available. Quality of the explanation or argument and
the burden of resuming matter together. A restored cursor alone does not
establish mathematical usefulness. Formal counterparts are consulted only
when useful.

Edit-stable anchors and their bounded previews remain mutable navigation aids.
They do not relocate immutable quotations, source occurrences, provenance,
admissions, verifications or warrants.

### 9.3 Independent formal correspondence and warrant experiment

Run this when the active mathematical question calls for it, separately from
acceptance of readable study and live assistance.

Compare the hypotheses, quantifiers and conclusion of a manuscript statement
with those of its proposed Lean counterpart. Inspect the exact statement
revisions, the recorded kernel check and its environment, and the separate
admissions for the proof policy and the correspondence. The $J_0$ certificate
checks the derivation under those admissions. In a test fixture, change a
source, the formal environment or an admission. Only the routes depending on
that change should cease to apply. The earlier certificates remain inspectable.

For the documentary model-response experiment, trace one exact response span
to its documentary atom. Inspect either explicitly admitted $m:D$ and
$r:(D\to F)$ with checked $r\cdot m:F$, an independently based
$v:F$ route with no AI-to-claim bridge, or rejection/abandonment without a
warrant for $F$. Never manufacture a bridge to complete the experiment.

**Acceptance.** Display only contextual derivability and keep source identity,
external verification, premise admission and human judgment distinct.
$m:D$ alone cannot derive $F$. The visible derivation exposes the actual
bridges, and withdrawing an admission preserves the old record while
deactivating the dependent current route. These requirements govern the
warrant experiment, not entry into mathematical study.

---

## 10. Later large-corpus experiment

**Import Stacks Project Section…** accepts an official section URL/tag, downloads source and its tag map
at one Git commit, and shows identity, revision and effective destination before
publication. The source reader offers direct statement/proof navigation,
restricted bundled MathML, exact retained TeX and explicit local citation
following. Source context, authors, canonical citations and license remain
available; editable annotations retain their separate attribution. Reimport at
the same revision reopens the saved outline; a new revision creates a separate
one. Unsupported structural syntax offers explicit source-only retention;
display limitations show the complete raw fragment. Retained reading, citation
following and annotation do not download or execute anything. Existing links and
Obsidian controls apply. [Usage and limits](docs/STACKS_WORKFLOW.md).


Broader corpus ingestion requires a separately authorized task after evaluation
of the relevant study workflows. Use either the [Stacks Project](https://stacks.math.columbia.edu/)
or [Kerodon](https://kerodon.net/).

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

- requiring a quota of retained passages, a formal correspondence or an admitted
  reason before a reader can study the source;
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
- How much prerequisite context can be recovered from sources and prior work
  without manual classification?
- What orientation view serves a large problem-centered source and what view
  serves a small research project?
- Which `ProblemRelation`s require human judgment and which may be proposed from
  source structure and prior attempts?
- How does a curated subject map survive revisions of its sources?
- Which `ReviewItem`s can be generated from `TaskEvidence`, and which require
  mathematical authorship?
