# UX_SPEC.md

The mathematician's workflow the interface must support. Companion to
`VISION.md` (why the system exists) and `DOMAIN_MODEL.md` (entities and
invariants). Present implementation and limitations are documented in README.
The current GUI provides ordinary-file editing, external-editor and Jupyter
handoff, staged LaTeX building, PDF rendering, checkpoint recovery and retained-record
inspection. Proof-assistant, computer-algebra, notebook-execution, repository,
literature-service, live-model and Kallenberg-guidance GUI workflows below remain
unimplemented. The active R1–R3 roadmap in [CODEX_PLAN.md](CODEX_PLAN.md#active-roadmap-mathematical-usefulness-first)
prioritizes readable study, task-local assistance and continued investigation.
Kallenberg ordering guides requested orientation in unfamiliar material; a
focused question need not repeat it. Qt/runtime and TeX prerequisites remain
platform-dependent; they are not permanent workflow invariants.

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

The bounded R1 delivery includes independent opening, page/zoom restoration,
ordinary note editing, standard shortcuts and marker feedback. PDF search,
outline, SyncTeX and text extraction are deferred beyond this handoff. Add
navigation capabilities later when required by actual reading; an
internal document link must not silently launch an external action. Keep
the reader's note and return location available during a definition lookup.
Opening a PDF does not imply reliable text extraction or a source mapping.
When sending a PDF excerpt, show the exact extracted or transcribed text and
its document revision/page so that damaged notation can be corrected explicitly.
A corrected transcription is distinct from the original source.

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

The R2–R3 live GUI workflow supports this interaction; the explicit linked
follow-up in step 6 belongs to R3:

1. Select source or work passages and write the mathematical question.
2. Inspect the provider/model and exact outbound content; remove unwanted
   context and explicitly authorize this request.
3. Read an attributed answer with mathematical notation rendered clearly and
   exact raw content still inspectable. Rendering neither executes code nor
   fetches content.
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

Each explicit user action creates at most one provider request. The request
obeys configured input, output, and timeout limits, invokes no provider tools,
and performs no automatic retry or recursive request. A retry or user-requested
follow-up creates another `ModelCall` linked to the preceding call.

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

Evaluate usefulness as each R1–R3 increment is delivered. Source choice follows
the current mathematical need. Reading/re-entry and unformalized problem work
test distinct capabilities; neither substitutes for the other. The warrant
experiment in §9.3 has independent acceptance criteria.

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

This experiment is outside the first implementation. It may begin only after
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
