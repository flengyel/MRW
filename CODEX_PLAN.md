# CODEX_PLAN.md

Active product roadmap. VS Code migration and source-reader status updated 2026-10-14;
the product assessment was reviewed 2026-09-20 against the integrated Qt R1–R3.1
implementations, the supplied September 13–14 session reports, and the research
below. It inherits the information-class invariants in `DOMAIN_MODEL.md` and the
purpose in `VISION.md`.

## Frontend scope and immediate delivery

VS Code is the active frontend target. The extension owns explicit research
commands and views; VS Code owns ordinary editing, saving, undo, and document
recovery. Shared Python services own record validation, exact request preparation,
and immutable publication. Qt remains a separate supported frontend. Its buffers,
checkpoint protocol, widgets, and layout are not extension requirements.

| Capability | VS Code extension status | Standalone Qt status |
|---|---|---|
| Ordinary editing and recovery | Provided by VS Code; do not duplicate | Application-owned implementation |
| Existing PDF and TeX/notebook tools | Other host integrations; MRW does not claim parity | PDF reading, staged TeX build, and external Jupyter handoff delivered |
| Retained records and R2 exact preview/Send | Implemented; scoped Windows/WSL host checks pass with deterministic responses | Delivered |
| R3 continuation, restart resumption, and R3.1 ending | Implemented with independent private state; deterministic WSL host lifecycle checks | Delivered |
| Manual offline source-region reader | Implemented for UTF-8 mathematical text with exact retained expansion, editable attributed reader material, optional supplied evidence and restart restoration | Not implemented |
| Proof-outline vertex elimination | Planned separate increment | Not implemented |

The initial actual-host validation and bounded R3/R3.1 transfer are delivered.
Use `vscode/README.md` for the independent private pointer, explicit Resume and
ending commands, and failure boundaries. Mathematical usefulness remains pending.
`docs/CODEX_CONTINUATION.md` records the next bounded handoff. Proof-outline
reconnaissance is complete and the first manual source-region consumer is
delivered; broader outline requirements remain deferred. The 2026-10-13 host validation
completed the scoped command checks and a normal-host persistence check;
see [evidence and limits](docs/VS_CODE_ASSISTANCE_REVIEW.md#actual-extension-development-host-validation).
Mathematical usefulness remains unobserved. The Qt delivery and observation
reports below are historical evidence, not extension acceptance evidence.

Documentation clarification, 2026-09-27: justification may exceed present
understanding; the four benefit categories below refine evaluation without
changing implementation status or the delivered R1–R3.1 boundaries.

## Active roadmap: mathematical usefulness first

### Justification and distinct benefits

The project should help people work with mathematics whose justification exceeds
their present understanding, while making further understanding possible
wherever it can. [VISION.md](VISION.md#justification-understanding-and-benefit)
states the distinction: neither complete human explanation nor eventual
comprehensibility is assumed as a condition of accepting justified mathematics.

| Benefit | Purpose | Evidence in actual work |
|---|---|---|
| Epistemic | Preserve statements, assumptions, dependencies, and grounds for acceptance | A result's evidence and its limits can be inspected without confusing origin, checking, and justification |
| Practical | Support appropriate application without reconstructing the entire proof | A result is applied with its hypotheses and scope accounted for, even when its proof remains partly opaque |
| Explanatory | Develop examples, connections, partial explanations, or simpler arguments | A specific idea, inference, or relation becomes clearer through observable mathematical work |
| Organizational | Make accumulated mathematics retrievable and unfinished investigations resumable | Needed material is recovered or actual work continues from the saved context |

Assess these benefits separately. An unresolved explanation does not invalidate
an independently observed benefit in another category. Formal checks retain
their stated scope; this distinction adds no automatic acceptance, comprehension
status, or inference of truth from the non-factive warrant layer.

### Primary use: access to existing literature

The principal use is entering and navigating the existing mathematical
literature toward a chosen question or area of research. Prioritize orientation,
needed prerequisites, connections between sources, and cumulative study that can
be resumed. This complements the epistemic purpose above: a useful source route
or appropriate application can count as progress while a proof remains partly
opaque.

The selected next source is Daniel Marcus's *Number Fields*. Begin with one
chosen section, result, or exercise, using an outline, relevant prerequisites,
or a representative argument as the task requires. Preserve precise source
locations, the resulting work, and the next question in the chosen note or
notebook. Record whether these aids enable the actual task and later
continuation, including consequential search, transcription, and reconstruction
effort. A summary count or a completed exercise count does not establish benefit;
comparative time savings require a comparable baseline.

This clarification sets product priority without changing R1–R3.1's delivered
capabilities or authorizing corpus-wide ingestion, automatic concept maps, or
background literature retrieval. Ordinary study across existing sources does
not wait for the separate large-corpus ingestion experiment. Use the bounded
Marcus task to identify the next concrete interaction obstacle; assess each of
the four benefits on its own evidence.

### Current assessment

**Assessment: the project has reached the interaction needed to test its intended
user outcomes in Qt, but has not yet demonstrated them.** The Qt application
has a reusable editor,
independent local-PDF and build/render paths, durable recovery, navigation
anchors, exact retained-record services, one bounded task-local assistance
exchange, one explicitly linked resumable continuation, and an explicit way to
end that investigation before beginning another. No genuine
mathematical obstruction has yet been helped through those exchanges, and no
continued in-application research collaboration has been observed. Continue
from this foundation; do not restart the architecture.

**Integration status, 2026-09-20:** reviewed repair
`d91e35bc56d5e66778c115e1c8ffea4d6937cd28` was integrated into `main` at that
review. This is a historical checkpoint, not the current branch tip. The
combined focused investigation
suite passed 21 deterministic controller/widget tests, the installed module
matches the integrated source bytes, and the GUI entry point launched against a
durable study project. An ordinary note has been prepared outside this
repository, but no mathematical source or question has been selected. The
system is **ready for study; usefulness remains unobserved**.

This section controls implementation priority. It supersedes the old
Appendix-first serial execution order and any evaluation prompt that makes
five anchors or a warrant inspection a prerequisite for useful study.
Stages −1 through 6 below retain detailed implementation contracts and
independent experiments; their numbering no longer determines delivery order.
The warrant architecture remains integral, with evaluation triggered by an
actual warrant question.

### Evidence and diagnosis

| Area | Evidence at review | Product implication |
|---|---|---|
| Preservation and navigation | Implemented recovery and live anchors; the supplied September 14 report and screenshot show a saved note, two reopened panes and one persisted manuscript shelf entry | Preserve these services and their regression coverage; stop treating another anchor demonstration as the main product milestone |
| Readable mathematics | R1 opens an exact-identity local PDF independently of TeX beside an editable note and restores page/zoom; PDF search and outline remain absent | The minimum literature-reading entry point is delivered. Observe real use before adding deferred reader features |
| Routine operation | R1 binds platform-standard Open, Save, Find and Find-next, makes PDF-versus-text focus explicit, and shows marker/Return status | Preserve these behaviors while evaluating the delivered continuation |
| Study benefit | The September 14 session saved useful purpose, definition and near-product notes; explanatory guidance came from the surrounding assistant interaction | This supports the value of the study activity, not a delivered workstation guidance feature |
| AI collaboration | R2 can initiate one explicitly previewed question; R3 can send one independently previewed child from selected exact parent passages plus separate human correction/current context, then restore the parent, correction, child and task summary; R3.1 can explicitly end that active pointer without deleting its records | Observe genuine sequential use; synthetic responses establish mechanics, not benefit, and do not justify simultaneous investigations or a conversation tree |
| Re-entry evidence | Five-anchor evaluation was incomplete; marker creation was unconfirmed; the original historical note was unavailable | No anchor defect, crash, mislanding or historical reduction is established. Use a fresh prospective continuation test |

The failed prescribed sessions are evidence about the product and evaluation
design, not a failure by the human participant. Starting at a local lifting
lemma without adequate orientation and excluding rendered reading from a
study session both obscured the intended use. R1 now supplies the practical
literature-reading entry point; its contribution to mathematical work has not
yet been observed.

### Research basis and limits

The following are design inputs, not proof that this application works.

| Primary source | Finding and limit | Design decision |
|---|---|---|
| [Nørgaard and Hornbæk, DIS 2006](https://hjemmesider.diku.dk/~kash/papers/dis2006_noergaard.pdf) | Observation of 14 professional think-aloud sessions found procedural usability concerns often displaced questions of utility; this was exploratory, not a controlled comparison | Observe a real mathematical task and its resulting work; do not make completion of an evaluator's script the benefit |
| [Head et al., ScholarPhi, CHI 2021](https://arxiv.org/html/2009.14237v3) | In a 27-person study on one scientific paper, contextual definitions reduced time and traversal but did not significantly improve correctness; incomplete definitions could mislead | Make definitions and notation accessible at the passage, with source links and visible gaps; defer automatic comprehensive concept maps |
| [Hornbæk and Frøkjær, TOCHI 2003](https://hjemmesider.diku.dk/~kash/papers/TOCHI2003_hornbaek.pdf) | In 20 participants, overview-plus-detail improved essay quality while slowing question answering; the tasks were not research mathematics | Assess the quality of the mathematical work as well as friction; fewer searches alone is not success |
| [Trafton et al., IJHCS 2003](https://interruptions.net/literature/Trafton-IJHCS03.pdf) | Preparation helped 17 participants resume a laboratory resource-allocation task; transfer to multi-day research remains untested | Preserve the current question, last useful conclusion and intended next step with their source passages, using an ordinary note |
| [Mejía-Ramos and Weber, 2014](https://sites.math.rutgers.edu/~jpmejia/files/Mejia-Ramos%20%26%20Weber%20%28survey%29.pdf) | A 118-response self-report survey emphasizes reusable ideas, main arguments and examples; it does not measure actual reading frequencies | Support conceptual explanation, examples, proof methods and hypothesis exploration, not only validation and storage |
| [Inglis and Alcock, 2018](https://repository.lboro.ac.uk/articles/conference_contribution/Watching_mathematicians_read_mathematics/9376565) | An eye-movement study found no evidence of the initial skimming reported in prior surveys; this does not show experts never skim | Keep top-down orientation available for unfamiliar material, while allowing focused questions and prerequisite lookup at any time |
| [Thurston, 1994](https://arxiv.org/pdf/math/9404236) | An expert reflective account distinguishes proof correctness from understanding and communication; it is not an experiment | Treat a clarified idea, explanatory example or corrected argument as a substantive outcome |
| [Amershi et al., CHI 2019](https://www.microsoft.com/en-us/research/wp-content/uploads/2019/01/Guidelines-for-Human-AI-Interaction-camera-ready.pdf) | Human–AI guidelines evaluated with design practitioners emphasize accessible invocation, dismissal, correction and clear limitations; they do not establish mathematical performance | Provide explicit, inspectable requests and easy correction or rejection, with no autonomous calls |
| [Collins et al., CheckMate, 2023](https://arxiv.org/html/2306.01694v2) | Interactive mathematics evaluation found correctness and helpfulness can diverge, and corrections can stall; the small cohort, undergraduate tasks and then-current models limit generalization | Evaluate an exchange and its contribution to ongoing work, including correction cost, rather than counting responses or citing current model capability |

### Delivery order

One product increment is active at a time. R1–R3.1 are delivered Qt implementation
boundaries; their usefulness columns remain prospective observations, not claims
from automated checks.

| Priority | Deliverable | Evidence of mathematical usefulness |
|---|---|---|
| R1 — Read and work | Open an existing local PDF without building it, keep it beside a durable work note, preserve page/zoom, and provide standard application shortcuts and clear marker feedback | Use a real source to write a useful explanation, example or question; close/reopen and continue from the saved work |
| R2 — Ask about the work | From selected source/work passages, ask one natural-language mathematical question, preview exact outbound context, explicitly send through the existing adapter, inspect an attributed answer, and retain/edit/reject a contribution | One actual obstruction is helped through an in-application exchange, with inspectable sources and a useful resulting work artifact |
| R3 — Continue an investigation | Support an explicit linked follow-up, correction or alternative approach; preserve the current question, conclusions, unresolved issue and selected evidence; resume later | A continued proof, counterexample, hypothesis comparison or exposition survives interruption, and the assistant's contribution and corrections remain distinguishable |
| R3.1 — End and begin again | Explicitly release the sole active investigation pointer while preserving immutable records, note choice and unrelated state, then permit another bounded investigation after restart | Two independent investigations can be completed sequentially in one real project without losing either one's mathematical record |
| Requested notebook/SageMath workflow — planned | Standard study notebooks through JupyterLab with an installed SageMath kernel, building on the existing handoff | A saved explanation and computation can be continued later; kernel state and reproducibility are assessed separately |
| Later, task-dependent | Deeper PDF/source correspondence, formal tools, generic warrant inspection and larger corpora | A demonstrated obstruction in R1–R3.1 justifies each addition; evaluate each on its own terms |

**Active implementation priority, 2026-10-13: continue the explicitly requested
VS Code migration over the existing core in the order above.** The Qt R1–R3.1
mathematical-use
observation remains independent and pending.
In the standalone Qt application, R1 is delivered: ordinary Open and navigator
actions route an existing PDF to
the read-only QtPdf pane without a build; its canonical path, exact digest and
page/zoom are distinct from generated-build provenance and text state. Failed,
missing, invalid or changed loads retain the note and last valid reading state.
Platform-standard Open, Save, Find and Find-next have explicit focus behavior,
and marker/Return status is visible. R2 is also delivered: one GUI action freezes
only explicitly selected visible ordinary text, accepts one natural-language
question, shows provider/model, source identity and scalar location, limits,
disclosure and the exact UTF-8 body, then requires a separate Send. Transport
runs off the Qt thread through the existing single-attempt adapter. Completed,
refused, incomplete and failed records remain distinct and inspectable; completed
answers are attributed inert plain text with exact raw access. Existing passage
selection creates the same lossless projection, while note insertion creates a
separately attributed editable copy. Controller and actual-widget checks cover
the implementation. They made no live provider request, so mathematical
usefulness remains pending observation. R3 is delivered as one bounded parent
and one child: the user selects one to eight deterministic passages from an
initial completed call, may add current ordinary-text selections, keeps a human
correction/changed assumption distinct, and sees the complete independent child
body before a separate Send. The child records `in_reply_to` but sends no
`previous_response_id` or provider conversation state. Parent evidence,
correction and child answer remain visible together. Exact record pointers and
the human-maintained question, conclusion and unresolved issue restore from
private workspace state; an explicit editable handoff can be inserted into an
ordinary note. Missing or changed records are reported without guessed
replacement revisions or loss of the task summary.
R3.1 completes the bounded lifecycle: **End investigation…** offers insert the
handoff and end, end without insertion, or cancel. When the active investigation
is displayed, insertion validates and uses its latest visible human question,
correction, conclusion and unresolved issue even if **Save task summary** was not
pressed; it never substitutes an unrelated or empty draft. Successful ending
clears only the private active pointer after the recovery-first checkpoint and
candidate publication return successfully. End is unavailable during a restore,
the handler rechecks the active identity and editable target after confirmation,
and a late obsolete restore result is ignored. Immutable calls, projections,
passages, anchors, ordinary note bytes and unrelated workspace state are not
deleted or rewritten. After restart, a new independent bounded parent/child
investigation may occupy the released slot. This is sequential reuse, not
multiple active investigations or a conversation archive.

Keep the R1–R3.1 cut lines while evaluating actual use. PDF search, outline and richer
internal navigation wait unless their absence demonstrably blocks the chosen
task. Internal document navigation must not silently dispatch external URLs,
files or commands. Exact source/PDF mapping
is a separate task where source and build metadata exist; lack of SyncTeX or
editable source must not prevent ordinary PDF study. Do not hold evaluation behind
complete PDF feature parity, a new editor, a new rendering framework or
comprehensive document analysis. Preserve text-only and source-only work.

R2 is the first assistance milestone, not another retained-record-only release.
Its delivered single exchange treats explanation, a definition, an example, a
strategic hint and criticism of a proof step as ordinary questions rather than
schema modes. It does not render returned markup or fetch a citation: exact
response text stays selectable, inert and visibly unverified. It sends no PDF
bytes or extracted PDF text. A PDF-motivated question requires an explicit
ordinary-text transcription or corresponding source selection. No provider call
is authorized merely by adopting this roadmap; each real call requires the
per-request preview and Send action.

R3 tests collaboration through reciprocal work: ask, inspect, challenge,
revise, compare and continue. A saved question with a raw answer is not by
itself research collaboration. Retain useful model passages as attributed
proposals and human revisions or syntheses as separate authored work linked to
their inputs. Keep rejected suggestions and corrections inspectable without
requiring a disposition form for every sentence. A later handoff to another
human or assistant should expose the question, notation, assumptions, worked
attempts, evidence and remaining issue through ordinary files and existing
records. Multiuser synchronization, autonomous agents and a provider registry
are not prerequisites.

The Appendix A material remains an available task, not a gate on all other
mathematics. An unfamiliar chapter or problem in a locally available source
without formalization may be used as soon as it serves the current study need.
Before claiming general usefulness, test both reading/re-entry and actual
problem work, including an example or counterexample. Do not infer research
capability from a single guided-reading success.

### Requested notebook and SageMath workflow

The September 22 request adds Jupyter notebooks as ordinary study documents,
either instead of or alongside Markdown notes. `study_notes.md` is one prepared
file, not a required format. Notebook support serves explanations with rendered
mathematics, examples, calculations and plots kept together. It is an explicit
study requirement; no unsuccessful Markdown-only session is needed to record it.

**Current boundary:** the GUI recognizes an existing `.ipynb`, shows a read-only
summary and can launch a configured Jupyter/JupyterLab command. It does not edit
or render notebook cells, execute kernels, or connect notebook cells directly to
R2/R3 selection and response insertion. The title already uses Mathematical
Research Workstation; the `theorem-terminal` command and package identity remain.

**Planned first increment:** make the existing external Jupyter handoff usable
for a durable study notebook and an installed SageMath kernel.

- Provide a clear New/Open study notebook path, saving a standard `.ipynb` in
  the chosen study project. Preserve existing Markdown/TeX notes; require no
  duplicate account of the mathematics.
- Configure or discover the intended JupyterLab installation and its available
  kernels. Select an installed SageMath kernelspec by its actual name. Report an
  unavailable kernel; do not silently run Sage code as ordinary Python.
- Let JupyterLab provide notebook editing, rendered mathematical prose, code
  execution and output display. Opening/restoring the MRW project must not run
  cells. Execution remains an explicit notebook action.
- Keep the notebook path and source reference available for later continuation.
  Detect externally saved changes without waiting for a long-running Jupyter
  server to exit; never overwrite the notebook with a stale MRW snapshot.
- Distinguish saved cells and outputs from live kernel state. Reopening a file
  does not establish that its computation can be reproduced. Where the task
  requires reproduction, explicitly rerun the relevant computation in a fresh
  kernel and record its dependencies.

Status: requested and planned; no new notebook capability is delivered by this
roadmap change. Use the existing handoff for study when suitable. A real example
should combine an explanation with a Sage calculation or plot, save the work,
and continue it later. Report setup checks separately from mathematical benefit.

Embedded notebook editing, kernel orchestration and a direct notebook-cell AI
bridge are later increments. The first handoff must not be described as
integrated cell selection, automatic response insertion or restored kernel
memory. Broader work must address a concrete limitation of this workflow.

Implementation references: [JupyterLab notebooks](https://jupyterlab.readthedocs.io/en/stable/user/notebook.html),
[SageMath's Jupyter kernel setup](https://doc.sagemath.org/html/en/installation/launching.html),
[notebook file format](https://nbformat.readthedocs.io/en/stable/format_description.html),
and [JupyterLab kernel/session management](https://jupyterlab.readthedocs.io/en/stable/user/running.html).

### Requested proof outlines and editor integration

The explicit request of 2026-10-12 defines a bounded proof-outline increment:
support vertex elimination with a visible claim and explanation for each
summarized region, source links, and expansion to the omitted proof steps. AI
may propose the selection and explanations; the reader can alter them. Preserve
joint premises, local scope, source revision, and the separate status of proof
evidence and explanation. The full contract and source-based illustration are
in [docs/PROOF_OUTLINES.md](docs/PROOF_OUTLINES.md).

**Status, 2026-10-13:** the first VS Code extension increment is implemented
under `vscode/`. Shared record actions now live in `record_actions.py`, with Qt
delegating to them. A bounded one-shot Python bridge serves record inspection,
response review, attributed copying and immutable projection. The host owns
editing, save, undo and recovery. Saved revision-pinned return locations and
explicit Lean/browser handoffs are implemented. Source changes block return;
no outline graph or correspondence is inferred.

The extension is the active frontend migration target. R2 preview/Send is now
transferred through `assistance_actions.py`; Qt delegates to the same functions.
The extension captures ordinary and untitled editor selections, allows explicit
context changes, displays the exact request, and consumes the preview on its
separate Send action. The existing adapter and immutable publication boundary
are unchanged. Review repairs pin automatic response display to exact retained
bytes, preserve response identity across virtual-document lifecycle events,
expose all terminal records, and preserve known-unsent drafts after preflight
rejection. Native Windows Send is blocked before transport. No live request
was made during implementation or review.
R3/R3.1 is now transferred. Shared `investigation_actions.py` supplies exact
parent/passage selection, independent child preparation, restoration and human
handoff for both callers. `editor_investigation.py` owns a separate versioned
private pointer in extension storage; it reads no Qt workspace or recovery data.
The sole slot is durably reserved before Send and pins the first matching child
terminal record. Explicit Resume validates identities without a request or retry.
Human task edits, explicit saving, handoff insertion and three-choice ending
preserve the bounded lifecycle. Failed/uncertain private publication keeps live
state and blocks further private writes until reload. Ordinary notes, undo and
recovery stay under VS Code ownership. See
[the persistence boundary](vscode/README.md#investigation-persistence-boundary).
An actual Extension Development Host run was unavailable during the earlier
review. The subsequent Windows VS Code/WSL run passed the scoped command suite
with injected responses and a separate normal-host close/reopen persistence
check. Visible captures at both review sizes were inspected with the layout
limits recorded in the review report. Scripted dialogs, deterministic responses,
and restored selections establish mechanics; mathematical usefulness remains
pending. Subsequent normal WSL hosts exercised R3 restart, exact identity
checks, terminal outcomes, ending failures and sequential slot reuse. A visible
view-placement defect was corrected by reusing the existing research editor
group. The full results and remaining runtime limits are recorded in the
[R3 validation report](docs/VS_CODE_ASSISTANCE_REVIEW.md#r3r31-extension-migration).
The bounded Equation 387 reconnaissance now supplies actual exporter and Lean
server output, published documentation, tool/source pins and explicit limits;
see [the findings](docs/PROOF_OUTLINE_RECONNAISSANCE.md). The recommended first
consumer is a manually selected source-region outline. Joint-premise region
boundaries and elimination witnesses are not supplied by a declaration map.
Graph navigation and vertex elimination remain unimplemented. See
[vscode/README.md](vscode/README.md) for the delivered boundary and host check.

The first offline source-region reader is implemented; see
[its boundary](vscode/README.md#offline-source-region-reader) and
[focused validation](docs/VS_CODE_OUTLINE_VALIDATION.md). It uses manual text
ranges over retained source bytes, separate exact statement/context selections,
editable attributed reader annotations, optional supplied evidence, source
navigation and explicit restart restoration. It serves mathematical books,
monographs, articles and AI-generated/assisted manuscripts without requiring
Lean. Reading levels follow the adopted Kallenberg order without enforcing it;
cited results may be used while their proofs are deferred. Changed or missing
originals do not remap selections. Unknown provenance remains unknown.

This partially implements the proof-outline requirement; it does not complete
or replace the vertex-elimination contract or the deferred broader capability
of mathematical outlines at multiple scales. PDF/OCR/notebook regions,
automatic extraction, AI proposals, automatic gap detection, verified joint-
premise graphs and elimination witnesses remain pending. A faithful outline
does not establish proof correctness; usefulness remains unobserved.
No graph exporter or automatic selection is implemented.
The interface trial uses one VS Code extension with the existing core and
established mathematical tools. Choice of an open-source editor
distribution is deferred. The existing Qt application and R1–R3.1 retain their
delivery status; their mathematical-use observation remains independent.

Task 4.0's bounded proof-outline reconnaissance is complete; consume its existing
export/server output and keep its granularity visible when selecting regions. Add
only missing information needed for retained claims, explanations, and
reversible expansion; do not parse Lean source in Python or infer proof steps
from a declaration map. Apply the existing explicit model-request boundary to
AI proposals. Test graph behavior, assumption preservation, source-change
detection, and restoration, then evaluate reconstruction or continued work on
that proof. A smaller graph alone supplies no evidence of mathematical benefit.

### Observation handoff and status

[docs/CODEX_CONTINUATION.md](docs/CODEX_CONTINUATION.md) contains the active
extension handoff followed by the separate Qt mathematical-use observation.
This roadmap controls priority; advance the handoff when implementation or
observation evidence changes.

| Qt milestone | Qt implementation status at 2026-09-20 | Product evidence |
|---|---|---|
| R1 | Implemented and technically verified: independent exact-identity PDF opening, separate imported/generated positions, durable note restoration, standard shortcuts and visible marker/focus status | A natural PDF-plus-note study and later continuation remain to be observed; usefulness is pending |
| R2 | Implemented and technically verified: exact selected ordinary-text context, natural-language question, removable context, exact request preview, separate Send, off-thread single-attempt transport, terminal-status inspection, inert attributed answer, exact projection and attributed editable note insertion | No live provider request or genuine mathematical use was performed; usefulness remains pending |
| R3 | Implemented and technically verified: one initial completed parent, exact selected prior passages and optional current context, separate human correction/task summary, complete child preview and Send, `in_reply_to`, inert terminal handling, exact child projection/note insertion and private restart restoration with changed-record reporting | No live provider request or genuine continued mathematical investigation was performed; usefulness remains pending |
| R3.1 | Implemented and technically verified: explicit three-choice ending, validated latest-visible handoff text, synchronized End/restore entry points, stale-result rejection, recovery-first pointer-only release, precise failure retention, preservation of terminal records and unrelated state, and a second bounded investigation after restart | Sequential use in a genuine mathematical project remains unobserved; usefulness remains pending |

Keep implementation delivery, automated/visual verification and observed
mathematical usefulness separate in status reports. A verified implementation
can be delivered while user observation remains pending. That pending observation
does not block the authorized bounded correction to R1–R3.1. Pending observation
blocks claims about the corresponding benefit. Record epistemic, practical,
explanatory, and organizational outcomes separately; no deterministic
implementation check establishes all four. Explicit user requests,
including the notebook/SageMath workflow above, can define a bounded next
increment without a prescribed preliminary study test.

The delivered Qt R1 boundary is:

- Route a PDF selected through ordinary Open or the project navigator to the
  existing QtPdf view, read-only, beside an editable ordinary work note. Preserve
  the note while switching documents or views. Do not put binary PDF bytes into
  editable text buffers, text recovery or text anchors.
- Give an existing PDF its own validated identity and page/zoom state, separate
  from a successful TeX build. Restore that PDF and note after reopening without
  invoking TeX. On missing, unreadable, invalid or changed content, report the
  condition and keep the note safe; do not silently apply an old location to
  different bytes or replace valid state with a failed load.
- Bind platform-standard Open, Save, Find and Find-next and show their bindings
  in menus. Save addresses the clearly identified editable text target and can
  never write a PDF. Find/Find-next remain text operations in R1: while PDF has
  focus, visibly explain or disable unavailable search rather than searching an
  unrelated or hidden text pane. Preserve inherited editor shortcuts.
- Include the small marker-feedback improvement already named in R1: visibly
  confirm successful marking and make the reason for an unavailable Return
  discoverable. Keep the established anchor semantics.
- Use the smallest validated workspace-state change required. Preserve all
  supported historical migrations, recovery, pane positions, wrap preference
  and anchors. Migration must not read source files or fabricate build records.

R1 ended with the above working through actual GUI actions, meaningful
controller and Qt regressions, a visible PDF/note exercise at both supported
review sizes, and updated status and handoff documents. PDF search, outline,
SyncTeX, text extraction and broader reader redesign remain deferred. Add a
deferred reader capability only if a demonstrated obstruction makes it necessary.

The delivered Qt R2 boundary is:

- Begin from a nonempty visible selection in an ordinary editable buffer or an
  explicitly opened read-only text reference. Freeze exact Unicode text,
  in-memory revision and scalar location. Include no PDF bytes, hidden buffers,
  workspace history or unselected note text.
- Let the mathematician write one question, remove any selected context and
  inspect the complete provider/model disclosure, instructions/input, limits,
  destination and exact UTF-8 request body. The developer request envelope is
  derived, not presented as an editable provenance form.
- Require a distinct Send action. Obtain the credential only from
  `OPENAI_API_KEY`, prevent duplicate in-flight sends, make at most one adapter
  attempt off the Qt thread and never retry or follow up automatically.
- Show completed content as attributed inert plain text while preserving exact
  raw-record access. Returned markup, URLs, citations and code remain inert and
  unverified. Keep refused, incomplete and
  failed terminal records inspectable without presenting a false answer.
- Reuse deterministic passage numbering and exact UTF-8 projection. An inserted
  note contribution is a separately attributed, explicitly unverified editable
  copy; changing it never changes the immutable response. Dismissal requires no
  disposition and creates no premise, Verification or warrant.

R2 ended with deterministic injected transports, controller and actual-widget
coverage, visible checks at the two review sizes, and no live provider call.
Those results establish technical behavior only.

The delivered Qt R3 boundary is:

- Continue only an initial completed retained `ModelCall`, with one child and no
  branch or child-of-child continuation in this bounded workflow.
- Select one to eight exact deterministic prior-response passages and optional
  current ordinary-text selections. Keep the human correction, changed
  assumption or alternative and the task summary visibly distinct from both
  model responses.
- Preview provider/model, exact parent identity/digest/spans, current context,
  limits, destination and every child request-body byte; require a separate Send.
  Record `in_reply_to` while using neither `previous_response_id` nor hidden
  provider conversation state.
- Retain every terminal child outcome without retry. Preserve parent and note
  bytes, keep returned content inert and reuse exact projection and attributed
  note insertion for a completed child.
- Persist only bounded private task text and exact immutable-record pointers.
  Restore the visible parent/correction/child comparison after restart; report
  missing or changed records while retaining the human task summary. Permit an
  explicit editable handoff in an ordinary work note.

R3 ended with deterministic controller and actual-widget checks and visible
exercises at both review sizes. No live provider call or genuine mathematical
investigation was performed. Automatic conversation state, branching, retries,
source retrieval, provider tools and a second provider remain outside R1–R3.1.

The delivered Qt R3.1 boundary is:

- Offer an explicit **End investigation…** GUI action for the sole active
  parent/child pointer.
- Require the explicit choice to insert an editable handoff and end, end without
  insertion, or cancel. A requested insertion uses the latest validated visible
  human summary belonging to the active investigation; standalone insertion uses
  the same path. Do not infer insertion by scanning ordinary note contents.
- Disable both End entry points during foreground restoration, recheck busy
  state, active identity and any editable insertion target after modal
  confirmation, and reject a late restore result for an ended or replaced
  pointer.
- Publish `investigation: null` only after required recovery and workspace
  checkpoints succeed. Initial checkpoint and pre-publication failures retain
  the live pointer and visible human edits. If handoff insertion precedes a
  failure, retain that unsaved note edit and the active pointer without retry,
  duplication or automatic undo. If directory synchronization fails after
  replacement, retain the live pointer and block writes as uncertain even though
  reopen may observe the complete null-pointer replacement; never roll it back.
- Preserve parent and child `ModelCall` bytes, projections, retained passages,
  anchors, ordinary note bytes when insertion was not chosen, and every other
  workspace field.
- Permit a new independent one-parent/one-child investigation after ending and
  restarting. Do not add simultaneous slots, an archive browser, record
  deletion, branching or child-of-child continuation.

R3.1 ended with deterministic controller and actual-widget coverage for every
terminal child status, unsaved-summary insertion, cancellation and validation,
delayed restore completion, confirmation reentrancy and all three persistence
failure phases. No provider request or genuine sequential mathematical
investigation was performed.

### Evaluation and drift control

Evaluate each delivered increment during a short, natural study session.
The user's next mathematical question determines the task. Capture only the
source used, question or obstruction, resulting mathematical work, consequential
friction, and what remains to do. Existing notes and automatic records should
supply most of this evidence; no comprehension questionnaire or anchor quota.
Name the benefit being evaluated and its evidence. Record unchanged or
unassessed understanding without classifying other demonstrated benefits as
failures. The selected study trial evaluates its particular function and does
not decide the value of every workstation function.

Use the user's ordinary PDF reader/editor/assistant workflow as the practical
comparison. Record setup, navigation and correction burden when consequential,
but judge whether the workstation helps produce and resume worthwhile work.
A repeat of the same learned task is not a controlled speed comparison.
No historical improvement claim is available without a comparable baseline.
Observe prospective resumption from the actual saved work instead of repeatedly
reconstructing a missing historical seed.

Before expanding beyond R1–R3.1, require useful work in two separate sessions
and one later continuation. This is a chosen adoption check, not a
research-validated threshold. User observation evaluates benefit; it is not a
manual preflight gate on authorized implementation. If the user is unavailable,
finish the bounded deliverable and report usefulness as pending. If benefit is
absent, identify one concrete obstruction, make a bounded correction and observe again. If that still fails,
reconsider the affected workflow before adding features. Never leave the human
repeating an inconclusive setup ritual while development accumulates elsewhere.

Triage defects by effect: protect work immediately when loss or corruption is
demonstrated; fix interaction failures that block the current study; defer
cosmetic differences that do not affect the work. Retain controller and widget
regressions for the invariants they protect. Run broader verification when code
changes warrant it, not after documentation-only work or every study session.
A source repository advancing independently is not a study blocker: record the
revision actually used and inspect relevant changes without forcing unrelated
repositories to move together.

The following remain deferred until demanded by useful work: corpus ingestion,
a universal knowledge graph, elaborate review scheduling, additional providers,
autonomous research agents, multiuser infrastructure, and further formal-warrant
machinery. Keep the existing warrant semantics and provenance distinctions;
their preservation does not require putting them in front of ordinary study.

## Retained implementation contracts

The sections below retain shared domain contracts, standalone Qt implementation
details, and task-dependent CLI/Lean experiments. They do not prescribe a new
VS Code editor, PDF renderer, or recovery system, and their historical sequence
does not override the active migration order above.

## Governing constraint

The first experimental implementation begins with a substantive mathematical
task. It may not require schema population, a context questionnaire, a
declaration inventory, or a written account of comprehension before an attempt
begins.

Two initial experiments test distinct functions:

1. mathematical re-entry and optional informal/formal correspondence using
   `rs_Appendix_A.tex`, the corresponding Lean declarations, and
   `Lean/docs/AppendixA.md`;
2. problem-centered study in a source with little or no formalization.

The original 2026-08-25 authorization began with Appendix A and a top-down
orientation command. That legacy CLI behavior remains. The active GUI roadmap
above supersedes the old corpus order. For requested guidance in unfamiliar
material, offer purpose, organization, concepts and examples before unnecessary
detail; allow the user to go directly to a selected problem or local question.
No session record or completed orientation sequence is an entry requirement.

Apart from the later explicitly authorized general GUI tranche below,
infrastructure is added only when one of these sessions requires it. Evidence
comes from the `WorkArtifact`s and `TaskEvidence` produced by the sessions, not
from asserted states of comprehension.

## Later authorization: general graphical workstation

On 2026-09-09 the user explicitly authorized a working GUI, superseding the prior
framework deferral. Subsequent corrections removed proposed objective,
hypothesis, relationship and unfinished-step forms. The plain-text Tk editor was
not an accepted Mathematical Research Workstation. The later LaTeX increment
explicitly superseded its toolkit, project-local version 2 state and screen
layout: LaTeX source → explicit build → rendered PDF → navigable diagnostics and
resumable state. These implementation choices are not domain invariants.

Mathematical Research Workstation is the user-facing system being developed from
the Theorem Terminal experimental prototype. Its principal interface is
`theorem-terminal gui [PROJECT_DIRECTORY]`; the CLI remains available for testing,
automation, reproducibility, low-level records and legacy study commands.

Implemented with PySide6 Qt Widgets and QtPdf: ordinary project-directory
navigation, editable mathematical files, read-only external references, two
source/record buffers, a source/PDF view, menu-accessible editing and a trusted
user-local editor argument template. Root selection acts on an existing TeX file.
Builds and editor/notebook handoffs run only after direct actions, without a
shell. No project file supplies executable configuration. Opening and viewing
invoke no tool and do not write into the project.

Session state, recovery checkpoints, tool settings and build output now reside
in OS user-local storage. Atomic mutable saves use kernel-released locks,
revision checks and explicit checkpoint failure handling. Existing immutable
record publication is unchanged. Deferred bounded document reads, notebook
recognition, companion-aware retained records, current-line editor handoff and
safe external-change comparison correct the earlier editor foundations. Source
cursor/selection, split, root, PDF page/zoom and optional exact-passage marker
support re-entry without descriptive forms.

Explicit build observations retain tool/version, exact arguments, times, streams,
exit code, log/PDF digests and observed project-local input revisions. Diagnostics
can return to a file and line. Failed builds preserve the previous successful PDF;
changed inputs make it visibly stale. None of this is mathematical Verification,
premise admission, contextual derivability or human judgment.

The 2026-09-10 graphical sessions exercised both requested window sizes, a real
LaTeX proof/calculation project, an intentionally failed build and diagnostic,
actual terminal Vim editing, a process restart and recovery of checkpointed unsaved text.
The ordinary installed application also opened the real Categorical Rice–Shapiro
project, built its 76-page manuscript, restored a file/PDF position at the selected
`lem:range-lifting-pullback-section` passage in `rs_Appendix_A.tex` (page 60), and
opened the relevant Lean source and existing expert-authored correspondence
document through the same navigator. This was a corpus-neutral
editor/build/render/re-entry smoke test. It did not complete the mathematical
re-entry and warrant evaluations now separated in UX_SPEC.md §§9.2–9.3,
establish Stage 1 model
usefulness, or supply mathematical verification.

The initial real build exposed latexmk/BibTeX writing into the source directory
despite an output-directory flag. The corrected build stages bounded ordinary
inputs outside the project, with an automated bibliography regression test. A
repeat real build preserved all 688 inventoried project files byte-for-byte. The
earlier `rs_main.bbl` newline change was subsequently restored to its captured
original exact-byte digest. The earlier regenerated `rs_main.blg` remains; its
original bytes were not available. This remains unresolved, not an acceptable
permanent state. The repair-pass audit classifies rs_main.blg as ignored by
.gitignore:48 (*.blg), with no tracked HEAD version and SHA-256
bcbad377f6e78db3b46da6bfef76f1155b4b52f0bf5afd5e189d00a80b4134ba.
The external repository remains untouched pending explicit user direction. No manuscript text or pre-existing Lean edits
were replaced. Final logs and screenshots are review artifacts outside the
repository.

Finalized ModelCall review and exact passage projection reuse the existing
parser, digest checks, bounded index and lossless UTF-8 span construction.
Justification logic remains a settled integral subsystem. Compatible retained
records expose ClaimAtomVersion, PremiseAdmission, JustificationContext,
JustificationDerivation, Verification and provenance separately. No human
decision is inferred. No calculus, Lean source, fixture or checked bundle changed;
no Lean or model provider was invoked for this increment.

No corpus-specific production import, navigation, registry or persistence field
exists. Appendix A supplied the first real integration smoke test, selected as ordinary
files. The legacy CLI and frozen source bindings remain unchanged. Current limits
and installation commands belong in README; the workflow specification belongs
in UX_SPEC.

The 2026-09-11 repair preserved this increment without adding product
features. Worker completions now enter explicitly queued main-thread QObject
slots; background observations return detached data. Editing changes memory
without serializing or syncing recovery on each keystroke. A 250 ms debounce
coalesces checkpoints, with synchronous durability boundaries. “Exact recovery”
means the latest successfully completed checkpoint. Recent-project settings
merge under a kernel lock across processes; genuine tool-setting collisions
remain explicit. Different projects may be open in different workstation
processes, but only one active workstation process per project is supported in
this increment. No lifetime-lock subsystem was implemented or added.

Out-of-tree staged builds execute trusted TeX with trusted installed tools.
Staging is not a sandbox. The repair accepted latexmk with a fixed pdfLaTeX
executable path, or direct pdfLaTeX, with openin_any=p, restricted writes via
openout_any=p and no shell escape. openin_any=p is defense in depth for
conventional input operations, not a complete read boundary. pdfTeX can still
embed an absolute external file through `\immediate\pdfobj stream file`.
The correction removed the contrary comment and narrowed the existing test
names to conventional `\input`/`\openout` and `\pdffiledump`/`\pdffilesize`
restrictions. A real pdfTeX regression requires the external stream to appear
in a successful PDF, its path to remain in `outside_inputs`, partial coverage,
unchanged sentinel bytes, and no mathematical Verification or warrant. These
settings do not confine arbitrary external reads. LuaLaTeX is
rejected; no general sandbox was added. Linux/WSL2 supervision bounds generated
files and reaps descendants, even after their parent exits. Native Windows/macOS
TeX builds are unavailable pending equivalent controls. Recorder coverage is
partial or unknown because external toolchain/package revisions are not tracked;
outside observations are retained. An unrelated .bib no longer suppresses a
supplied .bbl. Qt/runtime and TeX prerequisites remain platform-dependent.

Commit `d82685f7b28e26f9502827e5f3bcd6f5f9d9a4ee` recorded the seven modified
and eleven added GUI/LaTeX paths on `main`. All committed paths have Git mode
`100644`; DrvFS working-tree modes do not determine Git index modes.

The GUI directly provides ordinary-file editing, existing local PDF reading,
one explicitly previewed task-local model exchange plus one bounded linked
continuation and restart summary, external-editor and Jupyter
handoff, staged LaTeX building, generated-PDF rendering, checkpoint recovery and
retained-record inspection. Proof-assistant, computer-algebra,
notebook-execution, repository, literature-service, branching/general model
conversation and Kallenberg-guidance GUI workflows remain unimplemented.
Kallenberg ordering guides requested orientation in unfamiliar
material; focused questions and prerequisite lookup may begin directly.

Later notebook support must preserve cells, outputs, execution order, kernel
identity and explicit execution provenance. The current handoff executes no
notebook in the workstation. Later MathML support means validated source beside
rendered mathematics with external resources and active content disabled. A
restricted local QWebEngineView may support such later work; this increment adds
no unused web framework or notebook-execution machinery.

## Initial-implementation non-goals

Stages 0 through 5 do not attempt:

- general corpus ingestion or complete ingestion of any large reference;
- comprehensive coverage of either experimental source;
- formalization of the problem-centered source;
- a domain map authored before mathematical work begins;
- questionnaires, confidence ratings, or comprehension forms;
- automated correctness decisions for informal proofs;
- GUI scope beyond R1–R3.1 and the retained desktop contracts;
- Mathlib-scale Lean analysis;
- simultaneous support for multiple model services, autonomous follow-up calls,
  or a general chat interface;
- encoding the 29-decision taxonomy or predictive-framework schema developed
  for science and engineering [@priceDetailedCharacterizationExpert2021;
  @wiemanHowBecomeSuccessful2022];
- a corpus-wide justification graph, factive justification profile,
  Justification Awareness Model, Fitting semantics, introspection,
  multi-agent epistemic model, or acceptance questionnaire;
- multi-user operation, synchronization, accounts, or deployment.

AI-generated theorems, proofs, explanations, and examples may be studied with
their provenance and verification status. Task-mediated model assistance is
required in Stage 1 because the assistant's-assistant claim is one of the claims
being tested. The first implementation makes one provider request per explicit
user action to one configured model, preserves each `ModelCall` and any raw
response, and records relevant extracted mathematical content as AI proposals.
When selected output participates in a warrant, it uses the existing generic
claim atoms, premise admissions, contexts, and checked justification
derivations; extraction and proposal disposition never create a premise. It
defines only the narrow provider boundary needed to keep canonical records
independent of provider-specific request types; it does not add another adapter,
service selection, routing, or AI-specific trust structure.

## Target

Demonstrate both study/re-entry and unformalized problem work in `UX_SPEC.md` §9,
following R1–R3.1 above:

- re-enter the mathematics in `rs_Appendix_A.tex`, continue mathematical work,
  and inspect the corresponding Lean declarations and
  `Lean/docs/AppendixA.md` only where they are relevant;
- solve, resume, and later reconstruct selected problems from an unformalized,
  problem-centered source.

The active study question determines which source is used next. Appendix A
tests reconstruction and, when useful, informal/formal relations. The
problem-centered target tests learning, task-mediated assistance and retention.
The assistance evaluation includes a bounded model call attached to an actual
obstruction; success in one experiment does not establish success in the other.

The bounded justification experiment remains separately evaluable under
`UX_SPEC.md` §9.3. Its Appendix fixture begins only after the active task has
reviewed the selected manuscript--Lean correspondence. It does not gate R1–R3.1.

---

## Stage −1 — Repository

**Goal.** Establish the design baseline in one place.

**Completed baseline.** A repository containing `README.md`, `VISION.md`,
`VOCABULARY.md`, `DOMAIN_MODEL.md`, `UX_SPEC.md`, and `CODEX_PLAN.md`. The README
identified the role of each design document and described the planned first
implementation as experimental. Implementation began only after a later,
separate authorization.

**Non-goals at completion.** No package layout, dependency manifest, CI,
application skeleton, or implementation of any kind.

**Why at all.** These six files form the design baseline against which later
stages will be evaluated.

---

## Stage 0 — Orient in and work the benchmark mathematics

This is an optional benchmark protocol, not an R1–R3.1 prerequisite. Current
sources and focused questions may be used directly; its prescribed orientation
tests that particular mode of study.

**Goal.** Establish the book or chapter's purpose and organization and its
central concepts, results, and problem families; then select a small coherent
problem cluster from an algebraic number theory text and work on it before
designing storage or navigation around it. No application code for this stage.

**Deliverable.** The mathematical artifacts that ordinary work produces: TeX
proofs or attempts, Sage calculations and diagrams where useful, exact source
locations, and the unresolved step at which work stopped. Also list the system
operations that would have helped during the work, such as locating a
prerequisite, restoring a prior attempt, checking an example, or requesting a
bounded hint. For at least one actual obstruction, identify the mathematical
request and the minimal source and work context that Stage 1 should send to a
model. This list describes operations, not an internal state.

**Acceptance.** The orientation precedes problem selection. At least one
theoretical problem and one computational or example-driven problem have been
attempted. The proposed first problem workflow can be specified from observed
needs without requiring preliminary classification by the mathematician.

**Non-goals.** No YAML front matter, object inventory, domain-map population,
formalization, comprehensive chapter summary, schema, database, parser, or
framework.

**Checkpoint.** If the design cannot support these attempts without preparatory
data entry unrelated to the mathematics, revise the workflow and domain model
before implementation.

---

## Stage 1 — Minimal support for oriented problem work

**Goal.** Support the selected active mathematical task and the problem-centered
session of `UX_SPEC.md` §9.1.

**Deliverable.** A local experimental application that can:

- open a selected problem with a stable source locator;
- show the relevant definitions, results, examples, and earlier problems;
- open or attach the ordinary work file used for the attempt, whether a TeX
  file, Sage worksheet, or diagram;
- request graduated assistance from one configured model;
- before transmission, show a compact disclosure of the provider, requested
  model, exact versioned source passages and work artifacts selected, and input,
  output, and timeout limits; derive the disclosure from the task, allow context
  removal, and require no purpose or provenance form;
- exclude other workspace history and private notes by default and transmit
  nothing in the background;
- create at most one provider request per explicit user action, with no provider
  tools, automatic retry, or recursive request; record any user-requested retry
  or follow-up as a new `ModelCall` linked to its predecessor;
- preserve every application-supplied instruction and message, requested and
  resolved model identifiers, adapter version, limits, non-secret settings,
  status, response identifier when supplied, and raw response in the
  `ModelCall`, together with the SHA-256 digest of the exact raw-response UTF-8
  bytes;
- define `raw_response` for the first adapter as the exact Unicode mathematical
  response text after transport decoding and before trimming, normalization,
  parsing, or extraction; accept one text payload and do not project unsupported
  multipart or non-text output into a warrant;
- request disabled API response storage when the service supports it, record the
  setting, display any provider retention that cannot be disabled before
  submission, and avoid claiming that this controls every form of provider
  processing or retention;
- provide a deterministic local response-review and selection view that keeps
  attribution
  visible, initially indexes passages rather than flooding the terminal, and
  lets the mathematician select visible exact text without entering byte
  offsets; compute and validate digest-anchored UTF-8 spans internally;
- for CLI output, render every record-derived string through the exact safe
  terminal renderer; emit no terminal hyperlink escapes and never interpret or
  dispatch returned markup, commands or URLs. GUI mathematics rendering is a
  separate non-executing presentation with no network effects; preserve the
  exact recorded response and its raw inspection view;
- extract only proposals that enter the work or whose correction, rejection, or
  abandonment is recorded, each with
  `Provenance.origin = ai_proposal`, a lossless half-open UTF-8 byte span
  anchored to the response digest, and a link to its `ModelCall`;
- preserve only candidate routes explicitly returned by the provider or
  recorded by the mathematician in `WorkArtifact`s; never claim to retain hidden reasoning,
  chain of thought, internal search, or unreturned alternatives;
- retain any paraphrase or synthesis as a separate derived representation
  linked to its lossless selected sources; a model-produced synthesis requires
  another explicit linked `ModelCall`;
- keep source suggestions proposed until the cited material is independently
  retrieved and identified, and keep reported calculations or checks proposed
  until separately performed or attested;
- only in the separately requested documentary-warrant experiment, for one
  selected response span create the documentary opaque atom
  \(D=\operatorname{ModelProduced}(C,h,s,R)\), distinct from the substantive
  mathematical atom \(F\), using the generic `ClaimAtomVersion` record;
- in that warrant experiment, admit \(m:D\) only when its exact call, digest,
  span and representation are
  displayed as external basis; if the proposal itself is relied upon, admit the
  separately scoped bridge \(r:(D\to F)\) and check \(r\cdot m:F\) with the
  Task 4.2 \(J_0/J(CS)\) checker;
- in that warrant experiment, when independent reconstruction, retrieval,
  computation or formal checking supplies \(v:F\), preserve that direct warrant
  and leave the model
  call outside the mathematical derivation;
- treat model output as untrusted content, with no executable markup, command
  execution, link opening, tool invocation, or resubmission without a user
  action;
- keep credentials in secret configuration and exclude them from model inputs,
  records, logs, exports, and error text;
- preserve each attempt, revision, computation, consulted source, proposal
  disposition, and check requested as `WorkArtifact`s and `TaskEvidence`.

The source material and problem relations may be entered only as needed for the
selected cluster. A complete subject model is not a prerequisite. The raw
mathematical response is preserved even if a small structured envelope is used
for status, citations, or suggested checks.

Stage 1 reuses the generic Task 4.2 justification checker after its pinned
profile and executable exist. It does not add a Python checker or an AI-specific
epistemic schema. If that checker has not been compiled and tested, Stage 1 may
preserve calls and proposals but may not describe a model-response documentary
derivation as checked.

**Implemented bridge-mechanics precursor.** Before the provider-backed Stage 1
trial, an executable offline path exercises the generic response-to-warrant
boundary. It validates a finalized call record and exact UTF-8 response span,
freezes the lossless `Representation`, constructs the canonical documentary
atom (D), and requires a separate explicit action to admit (m:D). The
existing Lean checker then checks a one-node contextual-premise certificate for
(m:D), emits a deterministic runtime bundle, and supplies the exact bytes
from which the generic external checker `Verification` is created. The path
creates no substantive (F), no (D\to F) bridge, and no (r\cdot m:F)
route.

The public check path first repeats the strict Python digest, exact-span,
assertion-hash, and cross-link checks, then verifies the pinned Linux
x86-64/WSL identities of the Lean sources, compiled modules, and executable.
The application stamps the actual checker-handoff time in canonical UTC; the
external `Verification` and Lean check record use it separately from the earlier
admission and context time. The external record also binds the exact retained
projection and stamped request bytes. Lean treats atom hashes as opaque
identities and remains solely responsible for checking derivability; its raw
transport executable is not presented as an independent provenance-hash
validator.

Its regression fixture is declared synthetic test data. Passing it establishes
serialization, integrity, and checker integration only. It is not the required
provider request at a genuine obstruction, a proposal disposition, evidence of
subsequent mathematical progress, or Stage 1 acceptance.

**Implemented provider infrastructure and task-facing R2 generator.** One bounded
OpenAI Responses adapter previews and freezes one exact request, makes at most
one non-retried request with `store: false`, and retains a terminal `ModelCall`
without automatically projecting, admitting, or invoking Lean. Its low-level
CLI requires explicit `SEND`. The R2 GUI derives the same transient JSON envelope
from visible selected ordinary text and one question, displays the complete
exact UTF-8 body and requires a separate Send action; the mathematician does not
author the envelope. This implementation does not execute or complete the
genuine-obstruction Stage 1 trial, which remains pending.

**Implemented response-review and selection service.** This executable bridge
increment operates only on completed, finalized local `ModelCall` records. It
makes no provider, network, tool, or Lean call. It validates the response digest
and shows attribution plus a deterministic numbered passage index.

For this increment, logical lines are separated only by LF (`U+000A`); an
immediately preceding CR (`U+000D`) belongs to the line terminator, while a
lone CR remains line content. After removing its LF or CRLF terminator, a line is
blank exactly when its content contains only ASCII space (`U+0020`) or
horizontal tab (`U+0009`). A passage is a maximal sequence of nonblank logical
lines. Its span begins at the first line's first code point and includes the
last nonblank line's terminator when present. Surrounding blank lines and their
terminators are excluded. Passages are numbered from 1 in source order. A
response with at least one nonblank logical line and no separating blank line is
one passage; an empty response or a response containing only blank lines has
zero passages and cannot be projected by passage number.

The CLI surface is `review-response MODEL_CALL`. With no selector it shows the
first index page. `--index-start N`, `--passage N`, and `--full` are mutually
exclusive. `project-response --passage N` selects the same computed span and
is mutually exclusive with its existing `--start-byte` and `--end-byte`
developer pair; otherwise both byte arguments remain required.

The default index shows at most 20 passages from a requested starting passage.
Each row puts trusted passage number, UTF-8 byte length, preview scalar count,
and truncation status before a one-line preview of at most the first 120 Unicode
scalar values. Variable-width attribution and request metadata use the same
120-scalar bound and trusted length/truncation-first framing; `--full` expands
only the raw response. One linear scan counts passages while retaining at most
the requested page or selected passage. Further rows require an explicit page
request. Explicit passage and full-response views may be longer.

Every record-derived string, including identifiers, provider and model names,
purpose, request text, and response text, is passed through one renderer. It
maps backslash (`U+005C`) to two ASCII backslashes. It maps each C0 control
(`U+0000`--`U+001F`), DEL (`U+007F`), C1 control
(`U+0080`--`U+009F`), and bidi control (`U+061C`, `U+200E`,
`U+200F`, `U+202A`--`U+202E`, and `U+2066`--`U+2069`) to
the ASCII form `\u{XXXX}`, using four uppercase hexadecimal digits. All other
Unicode scalars are emitted unchanged. Only application-constant framing
supplies control characters. The application emits no OSC-8 or other terminal
hyperlink escape, does not invoke a pager or Markdown renderer, and never
interprets, opens, or dispatches returned links, markup, or commands. A terminal
may still auto-link plain URL text.

The mathematician may select a displayed passage number; the application, not
the mathematician, computes the existing `project-response` span. Merely
viewing or cancelling creates no artifact. This increment also factors the provider-
independent private persistence needed by response-bearing records: mode
`0600`, synchronization, a held synchronized descriptor, descriptor-relative
atomic no-overwrite publication in a stable parent directory, verification that
the installed link names that inode, and failure cleanup. A mismatched new link
is removed only after its identity is verified. This local
filesystem boundary handles accidental and ordinary concurrent replacement,
not arbitrary compromise of the same Unix account.
A successful hard link remains the publication commit point. Every pre-link
failure leaves no destination; after link success, even a directory-sync failure
retains the complete destination, reports a durability error, and removes only
temporary, reservation, or other pre-publication artifacts.

Synthetic fixtures establish mechanics only. This increment does not select
the Stage 1 obstruction, create the active-task request envelope, make a live
request, infer a semantic classification, generate a summary, retrieve a
source, record a proposal disposition, admit a premise, invoke Lean, or satisfy
the genuine-obstruction trial. It is the local selection boundary through which
material may later enter the integral justification layer.

For the designated evaluation fixture, finalize the call, freeze the selected
response representation and admissions, and invoke the Lean justification
checker explicitly in its pinned build environment. The checker emits a
deterministic documentary-warrant bundle. At the trusted handoff, Python computes
SHA-256 over the exact final bytes and atomically retains it in the generic
immutable checker `Verification`, with the bundle identity, checker and
environment revision, profile, and context. Later validation compares the
bundle with that external digest; a runtime bundle cannot be package-pinned in
advance and never contains its own expected digest. Python renders the bundle
later; handling a model response never invokes Lean implicitly, and ordinary
problem work requires neither Lean nor logic entry.

**Study and assistance acceptance.** A proof problem and an example-driven or
computational problem can each be attempted without a formal artifact or a
comprehension form. Offer orientation where needed, then support the selected
mathematical work. At least one real model call is traceable from inspected
context and exact input through raw response to a contribution used, corrected,
rejected or abandoned. Demonstrate its effect on subsequent work and account
for correction cost. No generated claim becomes a source fact, verification
or human judgment automatically. Ordinary sessions need not make a call;
the assistance evaluation deliberately tests one.

**Independent warrant acceptance.** When the documentary-warrant experiment
is actually run, trace one exact span to its documentary atom and either an
explicitly admitted \(r\cdot m:F\) route, an independently based \(v:F\) route
with no AI-to-claim bridge, or rejection/abandonment without a warrant for
\(F\). Tests must show \(m:D\) alone cannot derive \(F\), and withdrawing an
admission changes only the dependent current route while preserving prior
records. These obligations remain; they are not prerequisites for accepting
a useful study exchange.

**Non-goals.** No general ingestion, comprehensive topic map, formal theorem
analysis, graph rendering, support for a second model service or adapter,
automatic model selection, provider tools, autonomous calls, a general-purpose
conversation interface unrelated to the active mathematical work, a prompt
library, or a framework beyond R1–R3.1 and the retained desktop contracts.
No capture or reconstruction of provider-internal reasoning, hidden chain of thought, internal search, or
unreturned alternatives. No `AITrust`, `AIWarrant`, `ModelAuthority`,
provider-wide truth bridge, generic support edge, or trust, reliability,
confidence, acceptance, correctness, authority, weight, integration, or
adoption field on model records.

---

## Stage 2 — Resumption and task-based retention

**Goal.** Resume interrupted work and test retention through later mathematical
performance.

**Immediate deliverable.** Preserve source location, current attempt, revisions,
computations, unresolved step and assistance used through ordinary work files
and existing state. R1–R3.1 do not require ReviewItem or ReviewState machinery.
The later retention experiment may derive `ReviewItem`s from the work and
generate `ReviewState` from `TaskEvidence` when that experiment is undertaken.

Review tasks include reconstructing a proof, completing a gap, solving a related
problem, varying a hypothesis, producing an example or counterexample, and
repeating a Lean or Sage task. They do not request a confidence rating or a
written description of comprehension.

**Acceptance.** After an interruption, the exact unfinished mathematical step
can be resumed without recreating the surrounding context. This is evaluated
independently of the later retention experiment, in which a reconstructed
solution or related problem supplies TaskEvidence and updates ReviewState
mechanically if that machinery is implemented.

**Non-goals.** No scheduling-algorithm research, reference-string grading of
proof ideas, or manually asserted proficiency score.

**Checkpoint.** If stored context does not reduce the work required to resume,
remove or revise the records that failed to help. If a review task does not
exercise mathematics worth retaining, remove that task kind without treating
the result as evidence against the other functions.

---

## Stage 3 — Mathematical re-entry

**Goal.** Re-enter the mathematics of `rs_Appendix_A.tex` and continue
mathematical work after an interruption.

**Deliverable.** The legacy Appendix A guidance path presents purpose,
organization and central concepts before a selected result. In the general
GUI, make that orientation available when requested; a returning user may
resume directly at the relevant question, definition or unfinished argument.
Re-entry may begin from a mathematical question, manuscript result, unfinished proof, or earlier `WorkArtifact` in
`rs_Appendix_A.tex`. Stable manuscript occurrences, relevant prior artifacts,
unresolved questions, and the source locations and relations needed to resume
are available. The corresponding Lean declarations and
`Lean/docs/AppendixA.md` are available only when relevant. Formal artifacts
remain optional and are not the initial object of the work.

**Acceptance.** The session reconstructs enough specific context to continue a
proof, calculation, exposition, or formalization task. The evidence is the
continued work product and its source use, not a report about comprehension.

**Non-goals.** No comprehensive reconstruction of the project, no requirement
to inspect Lean, and no discrepancy machinery yet.

---

## Stage 4 — Optional formal correspondence and discrepancy

**Goal.** Where corresponding Lean declarations exist, relate them to
`rs_Appendix_A.tex` occurrences and the mathematical work, then test whether
changes can be detected precisely.

**Task 4.0 — reconnaissance.** Run existing tools against the Lean declarations
corresponding to the selected manuscript material and inspect what they emit:
`lean4export`, `doc-gen4`, `ntp-toolkit`, and LeanArchitect. Consume existing
output unless a required formal fact is absent.

The bounded proof-outline reconnaissance is complete for
`Subgraph.Equation387_implies_Equation43` at the pinned source revision; see
[the 2026-10-14 findings and actual outputs](docs/PROOF_OUTLINE_RECONNAISSANCE.md).
It recommends a bounded consumer of source regions and recorded Lean states;
it implements no extractor or outline GUI and does not complete the separate
Appendix A correspondence experiment. Full vertex-elimination acceptance and
mathematical usefulness remain pending.

The [requested proof-outline increment](#requested-proof-outlines-and-editor-integration)
uses this reconnaissance on one selected proof. Its vertex elimination is a
presentation operation with claims, explanations, and reversible expansion;
it supplies no new theorem or checking attestation.

**Task 4.1 — minimal extraction, only if required.** Obtain declaration types,
signatures, dependencies, axiom usage, verification status, and environment
revision mechanically. Nothing parses Lean source in Python, and generated facts
are never hand-edited.

**Task 4.2 — bounded explicit-justification experiment.** Begin only after the
selected manuscript and Lean statements and their directional correspondence
have been reviewed. Implement the integral warrant subsystem in Lean as a deep
embedding of pure Artemov--Fitting \(J_0/J(CS)\) term and formula syntax,
immutable premise contexts, contextual Hilbert derivations, constant
specifications, and a decidable certificate checker. Prove that every accepted
certificate denotes a derivation in the represented profile. Do not modify the
Lean kernel or identify Lean proof terms with justification terms.

The Lean implementation is owned by this repository at `lean/` as a standalone
Lake project. Here `standalone` names its build and dependency boundary, not its
architectural status: the warrant subsystem is integral to Theorem Terminal.
Before executable checker code or a checked bundle is committed, pin and test
`lean/lean-toolchain`, `lean/lakefile.toml`, the source directory
`lean/TheoremTerminal/Justification/`, the fixture
`lean/TheoremTerminal/Justification/AppendixA.lean`, and the
`justification_bundle` executable. The canonical commands are:

```text
cd lean
lake build
lake env lean TheoremTerminal/Justification/AppendixA.lean
lake exe justification_bundle --output \
  ../src/theorem_terminal/data/appendix_a_justification.json
```

Also record and reproduce the exact check command in the pinned Categorical
Rice--Shapiro environment that supplies the external basis for \(K\). Stop Task
4.2 before code if that environment, command, and output are unavailable; a
source declaration or an entry in `Lean/check_axioms.lean` is reconnaissance,
not a run attestation.

Use these immutable opaque atoms:

- \(F_M\): the statement at
  `lem:range-lifting-pullback-section`, bound to the reviewed normalized
  manuscript revision;
- \(F_L\): the exact proposition of
  `Dom.exists_total_lift_iff_rangeLiftPullback_section`, bound to a frozen
  Categorical Rice--Shapiro repository and Lean environment; and
- \(K\): a claim describing one exact kernel attestation, including declaration
  type, repository revision, toolchain, imports, options, axiom report, and
  checked artifact identity.

Let \(k\), \(p\), and \(a\) be justification variables and record separate
contextual admissions

\[
k:K,\qquad p:(K\to F_L),\qquad a:(F_L\to F_M),
\]

and check

\[
a\cdot(p\cdot k):F_M.
\]

The checking record supplies the external basis for \(k\), but does not create
the formal-proof-policy bridge \(p\). The reviewed correspondence supplies
relevant basis for considering \(a\), but does not create that directional
implication automatically. The certificate is a \(J_0\) derivation because it
uses only contextual premises and \(J_0\) rules. It is therefore valid in every
\(J(CS)\) profile extending the same \(J_0\) syntax and rule version, with an
empty constant-specification footprint. Both profiles permit constants as
terms. Separate profile-boundary tests must reject a proof step tagged
`constant specification` in \(J_0\), accept it in \(J(CS)\) exactly when its
formula belongs to the named \(CS\), and permit the same formula as a contextual
premise in \(J_0\). They also reject a purported \(CS\) member that does not
terminate in an axiom instance and a membership representation that is not
closed under suffixes.

Emit one deterministic, versioned audit bundle only from a successfully checked
derivation. Ship that frozen bundle with the Python package and pin its exact
byte digest in code. Python validates the known bundle schema, profile, exact
source and environment bindings, and independently retained expected digest,
then renders `theorem-terminal why PATH/TO/rs_Appendix_A.tex`. This is a
cumulative, explicitly requested post-correspondence view that assumes no prior
command or hidden session state and restates the Kallenberg levels before the
warrant. Python does not reproduce the derivation checker. No hand-authored
placeholder may claim checked status. A clean wheel-install smoke test must
confirm that the frozen bundle and expected digest are package data and that
`why` works without a local Lean installation.

The emitted bundle does not serialize a digest of itself. Compute SHA-256 over
the complete final bundle bytes after emission and store the expected value in
separate Python package or code metadata. Validation compares those bytes with
that external value; neither the derivation nor the bundle owns its own digest.
This package-pinned rule applies to the frozen Appendix A fixture. A runtime
bundle in Stage 1 instead retains its handoff digest in the generic immutable
checker `Verification` as specified there.

**Deliverable.** Explicit correspondences between source occurrences and formal
artifacts, plus `Discrepancy` records for an identified mismatch. For Task 4.2,
also the Lean checker and soundness boundary, one checked Appendix A
certificate, its deterministic audit bundle, bundle-integrity and profile tests,
standard-library Python validation and rendering, and an explicit `why` command.
Formal and warrant views do not appear for objects without the corresponding
material.

**Acceptance.** A change such as renaming a declaration or adding a hypothesis
invalidates only the exact affected correspondence or source-linked claim. A
conceptual dependency is not rejected merely because it is absent from the
formal dependency graph. The warrant slice displays the derivation above and
labels it “derivable relative to these admitted premises and policy.” The Lean
checker rejects malformed certificates and unauthorized
constant-specification steps. Python bundle validation rejects schema, profile,
dependency, and independently retained expected-digest mismatches without
checking derivations. A successor context deactivates the dependent current
route while preserving the old checked certificate for its pinned context.
Existing `orient` and `study` behavior remains unchanged, and neither command
requires Lean, a warrant record, or user-authored logic.

**Non-goals.** No Mathlib-scale extraction, general proof-state archive,
automatic repair, notifications, or formal coverage outside the selected
region. Existing bounded trace output may be consumed for the explicitly
requested proof-outline increment. No factivity, positive introspection, JAM, Fitting semantics,
quantifiers, multi-agent logic, corpus-wide warrant graph, confidence score, or
Python reimplementation of the checker.

**Checkpoint.** If existing tooling already supplies the required facts and
connections, use it and omit extraction work. If discrepancy detection produces
irrelevant conflicts, narrow or remove it. Task 4.2 determines the certificate
representation, serialization, interface, and appropriate scope for expansion.
If a particular form interrupts the mathematics or fails later reconstruction,
revise that form or halt expansion without collapsing provenance, verification,
admission, and derivability into generic support edges.

---

## Stage 5 — Evaluate the experiment

**Goal.** Evaluate each delivered increment while it is used, rather than waiting
for all numbered stages. Decide which components helped mathematical work and
which should be removed or revised before expanding the product scope.

**Deliverable.** An evaluation based on completed and abandoned
`WorkArtifact`s, `TaskEvidence`, source-recovery operations, `ModelCall`s,
outbound context, raw responses, proposals used or rejected, incorrect or
premature assistance, checked warrant paths, bridge admissions, successful
resumptions, and later mathematical tasks. No questionnaire about comprehension
is introduced.

**Acceptance.** Each component receives a decision supported by session
evidence: retain, revise, or remove. Model assistance is retained only if at
least one call improves subsequent mathematical work enough to justify its
correction, provenance, disclosure, and record-keeping costs. Stage 6 may begin
only after the problem-centered and Appendix A experiments have each been
evaluated on their own terms and the large-corpus experiment has been authorized
separately.

The offline documentary fixture cannot be counted as the required model call
or as evidence that assistance improved mathematical work.

The AI-to-warrant projection is retained only if the exact-span documentary
atom and explicit bridge make later inspection or reconstruction clearer than
the pre-existing `ModelCall`, proposal provenance, and `TaskEvidence` alone. An
honest no-bridge outcome is not a failure when independent work warrants the
mathematics; manufacturing a model-authority bridge would be a failure.

The separation of provenance, verification, premise admission, and contextual
derivability, and the source-faithful non-factive \(J_0/J(CS)\) basis, are
architectural commitments. Evaluation may revise or defer the certificate
representation, serialization, `why` interface, and scope of expansion; it must
not collapse the warrant layer into an untyped `supports` edge or another
information class.

**Non-goals.** No scale-up, production deployment, or claim that one successful
session establishes a general theory of mathematical understanding.

---

## Stage 6 — Large-corpus ingestion and study

**Authorization boundary.** This stage is not part of the first experimental
implementation. It may begin only after Stage 5 has been completed and the
large-corpus experiment has been authorized separately.

**Goal.** Test whether Theorem Terminal supports beginning and progressively
studying one large structured mathematical corpus, initially either the Stacks
Project [@stacksprojectauthorsStacksProject2021] or Kerodon.

**Deliverable.** Import the selected corpus's published hierarchy, stable
identifiers, cross-references, and revision information. Beginning from active
mathematical work, obtain and represent the statements, proofs, examples, and
surrounding context that the work requires. Preserve the ordered source
locations consulted, work artifacts, model assistance, unresolved questions,
and later reconstruction tasks.

**Acceptance.** Beginning from a subject-level question, a mathematician can
identify a coherent sequence of relevant source locations, study selected
material, perform associated mathematical work, resume after interruption, and
identify affected records after a source revision without manually classifying
the corpus in advance.

**Non-goals.** No semantic representation of the entire corpus, no preliminary
hand-authored subject map, no simultaneous ingestion of both the Stacks Project
and Kerodon, and no production-scale deployment.

---

## Manuscript prerequisite

The selected warrant experiment already has the stable manuscript locator
`lem:range-lifting-pullback-section`; no new label is required for Task 4.2.
Before correspondence maintenance expands to other positional entries in
`Lean/docs/AppendixA.md`, add `\label`s to the corresponding statements or
sections in `rs_Appendix_A.tex` and reference labels rather than line numbers.
The current correspondence contains roughly fifty positional references to a
manuscript that changes. This is a later manuscript edit; no exporter substitutes
for it.

---

## Not decided here

- Which initial algebraic number theory problem cluster to use.
- Whether the Stacks Project or Kerodon is selected for Stage 6 and which
  published interfaces provide its hierarchy, stable identifiers,
  cross-references, and revision information.
- Storage beyond the files needed by the first sessions.
- Which additional external tool handoffs actual study requires; ordinary
  source editing and the implemented editor/Jupyter handoffs already exist.
- Which single model and service supplies Stage 1 assistance; the selection is
  configuration and every call records the exact model used.
- Whether later experiments should add tool-enabled calls, another model service,
  or analysis by research-decision type. None is a Stage 1 requirement.
- How the orientation view differs between a large problem-centered source and
  a small research project.
- Which relations are authored and which may be proposed from source structure
  and prior attempts.

## Order and stopping

The controlling delivery order is R1 readable study, R2 task-local assistance,
then R3 continued investigation and resumption. Evaluate usefulness within each
increment. Preserve the detailed contracts above for the components actually
changed; numbered legacy stages are not a serial release gate.

Formal correspondence and warrant experiments remain available on demand and
retain their independent acceptance obligations. Appendix A completion, a
five-anchor rehearsal, a checked documentary response fixture, and generated
review schedules do not gate ordinary study or the first assistance workflow.

If an increment fails its usefulness check, revise the specific obstruction
before expanding scope. Stage 6 still requires a separate authorization; it does
not begin automatically after an editor, model or warrant demonstration.
