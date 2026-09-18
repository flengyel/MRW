# Mathematical Research Workstation

Mathematical Research Workstation is the user-facing system being developed from the Theorem Terminal experimental prototype.

The GUI is the principal user-facing interface. The `theorem-terminal` CLI
remains available for testing, automation, reproducibility, and low-level
operations. Repository, executable, Python package, Lean namespaces, and
serialized record identities retain their existing technical names.

For development, start with [the active roadmap](CODEX_PLAN.md#active-roadmap-mathematical-usefulness-first)
and [the current Codex continuation prompt](docs/CODEX_CONTINUATION.md).
R1's PDF-plus-note workflow and R2's bounded direct mathematical-assistance
exchange are delivered. The next task is R3's explicit correction, linked
follow-up and continued investigation.

The workstation is a mathematical context system for learning, reconstructing,
integrating, and retaining mathematics. It is intended both for entering and
absorbing a large body of mathematics and for re-entering one’s own research, an
inactive project, or a subject not studied or taught for years.

It is intended to be an assistant's assistant. Its design preserves the mathematical work produced
while consulting source literature and using machine assistants, proof
assistants, and computer algebra systems: source locations, problems attempted,
proof drafts, computations, diagrams, examples, counterexamples, formal checks,
corrections, and provenance. In the intended model-assisted workflow, it may send a
bounded mathematical question and selected context to a configured model. The
request, the exact context sent, and the raw response are preserved
automatically. Material from the response is extracted only when it enters the
mathematical work or is separately studied. Each extracted proposal remains
linked to its exact response span and is recorded as an attributed AI proposal
rather than a fact or human judgment. `ModelCall` remains an operational
provenance record; it acquires no trust, support, correctness, confidence, or
acceptance field. If selected output later participates in a mathematical
warrant, the workstation uses the same generic justification-logic claim
atoms, premise admissions, contexts, and checked derivations used for every
other reason. The design calls for restoring an interrupted investigation
and selecting later mathematical tasks that test reconstruction or application. No
one assistant is the authority, and the system does not ask a mathematician to
report an internal mental state.

It is not a proof assistant, a Lean documentation browser, or a replacement for
mathematical judgment.

The design also adopts an explicit warrant layer for tasks that require more
than origin and checking status. A bounded Appendix A experiment uses
non-factive Artemov--Fitting justification logic to record how explicitly
admitted reasons compose. Source provenance, verification, admitted premises,
checked derivability, and human use or rejection remain distinct.

## Motivation

Mathematical context can be lost even when papers, notes, books, or formal
developments remain available. A mathematician may need to reconstruct the
purpose of a definition, the idea of an argument, the dependence of one result
on another, or the state of an unfinished proof. The same requirement arises at
different scales: entering a large corpus such as the Stacks Project
[@stacksprojectauthorsStacksProject2021] or Kerodon; studying a problem-centered
text in which exercises develop the theory; returning to one's own research or
an inactive project; and teaching a subject after years away.

A source need not have a machine-checked counterpart, and a complete written
proof need not be present. In a problem-centered source, problems may supply
omitted proof steps, develop examples, establish computational familiarity, or
introduce the next result. Theorem Terminal should therefore support selecting
and solving problems, locating relevant definitions and prior results,
preserving attempts and computations, and resuming unfinished work.

AI adds two demands. It may increase the rate at which mathematical results,
proofs, formalizations, and examples are produced, and it can produce
mathematics that is correct or formally verified without being understood by
the mathematician receiving it. Understanding such a result requires
reconstructing the relevant human-developed mathematics from which current
systems learn and which the result uses or extends. Tao discusses both the
prospect of verified proofs without human understanding and the dependence of
mathematical AI on canonical theories developed and organized by mathematicians
[@taoMathematicsAgeAI2026].

Theorem Terminal supports learning, reconstruction, integration, and retention
across human- and AI-generated mathematics. AI increases the need and supplies
new forms of assistance; it did not create the underlying difficulty.

The design rests on six principles:

- Kallenberg's top-down approach to reading advanced mathematics provides
  orientation before detailed study. Depending on the source, the relevant
  detail may be a theorem, proof, worked example, or problem.
- A problem-centered source is studied through mathematical work. The system
  should help select problems, recover prerequisites, provide optional
  assistance, preserve attempts, and support later reconstruction without
  requiring preliminary data entry.
- Model assistance is requested from active mathematical work. The provider,
  requested and resolved model identifiers, exact submitted request, selected
  context, raw response, and every extracted proposal are recorded
  automatically. A proposal is not a fact or human judgment. No provider-wide
  trust rule or bespoke AI-support status converts it into a premise.
- Justification logic makes the composition of admitted reasons inspectable
  when an active task needs it. The initial non-factive `J0`/`J(CS)` layer does
  not turn a source, model response, formal check, or correspondence into truth;
  each transition requires a separate, versioned premise or bridge.
- Curry's account of mathematical language explains how mathematical discourse
  becomes more precise without attaining absolute precision; formalization
  relocates questions of interpretation into the definitions rather than
  eliminating them [@curryFoundationsMathematicalLogic1977, §1].
- Formal verification is optional and supplies one kind of evidence. A kernel
  check settles whether a proof is correct relative to stated definitions. It
  does not settle why a result matters, what its proof idea is, whether the
  formal statement expresses the intended mathematics, or whether the argument
  can be reconstructed and used.

## Status

**Roadmap review, 2026-09-17:** the project has useful preservation and editing
foundations, but is not yet delivering its intended study and human/AI research
workflow. The [active roadmap](CODEX_PLAN.md#active-roadmap-mathematical-usefulness-first)
now prioritizes (R1) readable source beside a durable note, (R2) one inspectable
mathematical question and response, and (R3) correction, continuation and later
resumption. Research sources, limitations and concrete acceptance criteria are
recorded there. Formal correspondence and warrants remain integral and optional
during study; their independent evaluation does not gate these priorities.

R1 is implemented: an existing local PDF opens read-only through ordinary Open
or the project navigator beside an editable work note, without TeX source or a
compiler. Its exact path/digest identity and page/zoom are retained separately
from generated-build provenance and restored with the note. Open, Save, Find and
Find-next have platform-standard shortcuts and explicit focus behavior. R2 is
implemented: from an exact visible ordinary-text selection, the GUI accepts one
natural-language question, lets the user remove context, previews the exact
bounded request, requires a separate Send, and shows an attributed inert
plain-text presentation with access to the exact raw retained response. It can retain an exact response passage or insert a
separately attributed editable copy into the active note. Tests and visual
checks use deterministic local transports and establish technical behavior only;
no live request or mathematical usefulness claim was made.


The current desktop increment uses PySide6 Qt Widgets and QtPdf. **Open Project
Directory** displays the actual directory tree lazily. Ordinary mathematical
files open in editable buffers; external references and PDFs are read-only. The
implemented workflow covers an existing PDF beside an ordinary note, LaTeX
source, explicit root selection and build, generated PDF output, navigable
file-and-line diagnostics, and resumption at a marked passage. It has been
exercised with ordinary test projects; the broader editor/build workflow has
also been exercised with the real Categorical Rice–Shapiro manuscript. No
mathematical questionnaire precedes work, and typesetting success supplies no
mathematical verification.

Mutable session state and recovery of the latest completed checkpoint live outside the project
in user-local application storage. Opening, viewing and closing a project do not
write into it. Explicit Save and Save As alone write ordinary editor files;
revision conflicts preserve in-memory work. Two source buffers can be compared,
and a configured external editor can open a saved file at its current line.

The GUI reviews existing finalized `ModelCall`s through the existing validation,
bounded passage index, safe rendering and exact projection services. Retaining a
selected passage creates a lossless projection, not a premise. Compatible
Verification/bundle pairs and documentary warrant packages expose
`ClaimAtomVersion`, `PremiseAdmission`, `JustificationContext`,
`JustificationDerivation`, and associated `Verification` records separately.
Justification logic is integral and task-dependent. Ordinary work needs neither
Lean nor a warrant. Inspection validates retained data without rerunning a
checker, issuing a new Verification or inferring a human decision.

Projects, navigation and persistence are corpus-independent. Startup, restoration
and viewing run no external program and make no network or provider call. Build,
external-editor and notebook handoff actions require direct user action. This GUI
directly provides ordinary-file editing, existing local PDF reading, one
explicit OpenAI Responses assistance exchange, external-editor and Jupyter
handoff, out-of-tree staged LaTeX builds, generated-PDF rendering, checkpoint
recovery and retained-record inspection. Proof-assistant, computer-algebra,
notebook-execution, repository, literature-service, linked model follow-up and
Kallenberg-guidance GUI workflows remain unimplemented. Kallenberg ordering guides requested orientation in unfamiliar
material; focused questions and prerequisite lookup need not repeat it.

Appendix A supplied a corpus-neutral editor/build/render/re-entry smoke test.
The supplied September 14 report and screenshot additionally show useful saved
reading notes, two restored panes and one retained manuscript passage. The
guidance was supplied outside the application. Five-anchor re-entry was
incomplete, marker creation was unconfirmed, and no historical reduction or
anchor defect was established. Study/re-entry, assistance and the optional
warrant experiment now have separate criteria in UX_SPEC.md §§9.1–9.3.

The prototype's original CLI path studies
`rs_Appendix_A.tex` in Kallenberg's top-down order. `orient` presents the
appendix's purpose and organization, central concepts and results, and a first
selected result without displaying its statement, proof, or formal counterpart.
`study` then reveals the selected result's role and statement; its governing
idea, proof skeleton, and detailed source proof appear only when requested.

The Appendix A study path is read-only and uses no model service, session
record, database, or network request. Interpretive guide text is marked as an
AI proposal; exact statements and proofs are identified as source text.
`orient` and `study` require no formal artifact and do not load one.

The bounded justification-logic increment in
`docs/JUSTIFICATION_LOGIC_EXPERIMENT.md` is now executable. Justification logic
is an integral warrant subsystem of Mathematical Research Workstation. Its syntax, selected
axiom profiles, contextual derivations, constant specifications, certificate
checker, and certificate-soundness theorem are implemented in the
repository-owned `lean/` Lake project. That Lean implementation checks one
explicit warrant route for `lem:range-lifting-pullback-section` and generates a
deterministic audit bundle. The Python package does not reimplement the
calculus: it retains the bundle's expected SHA-256 outside that bundle,
validates its schema and exact bindings without rechecking the derivation, and
renders it with
`theorem-terminal why PATH/TO/rs_Appendix_A.tex`. `why` is stateless: it
cumulatively presents the Appendix orientation, selected result's role and
statement, idea, proof skeleton, available technical detail, and reviewed
correspondence in Kallenberg order before the admitted premises and checked
warrant. Checker invocation is task-dependent. Running `why` from an installed
package does not require Lean because it consumes the packaged, already checked
bundle.

The first AI-integration bridge mechanics are now executable offline.
`project-response` validates a finalized `ModelCall`, including the SHA-256
digest of its exact raw-response UTF-8 bytes, and selects a lossless half-open
byte span whose endpoints must be UTF-8 boundaries. It writes an immutable
`Representation` projection and the canonical documentary atom
\(D=\operatorname{ModelProduced}(C,h,s,R)\). This operation creates no premise
admission.

`admit-documentary` is a separate, explicit action that creates a request
containing the documentary admission \(m:D\). It creates no substantive
mathematical atom \(F\), no bridge \(D\to F\), and no mathematical warrant
beyond the documentary claim.

`check-documentary` explicitly invokes the repository-owned Lean justification
checker in its pinned environment. Lean checks a one-node \(J_0\) certificate
whose conclusion is \(m:D\) relative to the displayed admission and emits a
deterministic runtime bundle. Python does not reimplement the calculus: it
captures the exact emitted bytes, computes their SHA-256 digest, and records the
artifact identity, checker and environment revisions, profile, context, and
digest in a generic immutable `Verification` outside the bundle.

This offline path establishes response binding, explicit admission, checker
reuse, and trusted runtime handoff. It makes no provider request and does not
satisfy the Stage 1 requirement for assistance at a genuine mathematical
obstruction. It supplies no evidence that model assistance improved
mathematical work.

One provider-backed operation is also implemented, but no live request is made
by installation or testing. The low-level `request-assistance` CLI displays the
exact bounded OpenAI Responses API JSON and selected context and requires the
user to type `SEND`. The R2 GUI derives the same request from the visible task,
shows its exact body and uses a separate **Send exact preview** action. Both use
the same adapter, make at most one request with `store: false`, and atomically
create a terminal `ModelCall`. Projection, admission, and Lean checking remain
separate explicit actions.

The local response-review and selection service is executable over completed
`ModelCall` records and is reused by the R2 dock. It keeps attribution visible, indexes returned passages
deterministically, and lets the mathematician select visible exact text without
calculating byte offsets. It makes no model call, retrieves no source, performs
no automatic summary, admits no premise, and invokes no Lean process.
Justification logic remains the integral downstream warrant layer; it is not
required merely to view or discard a response. The technically delivered GUI
exchange does not complete the genuine-obstruction Stage 1 trial or establish
mathematical usefulness.

The implementation is an experiment conducted through actual mathematical
work. It tests which source relations and work artifacts can be
preserved or generated mechanically, whether they support later reconstruction
and application, and whether one bounded call to a configured model supplies
useful assistance without displacing the mathematical attempt or creating more
record keeping than it saves. Evidence will come from attempted proofs, solved
problems, computations, reconstructions, and later use, not from forms asking
what a mathematician believes is understood.

## Install and run

Python 3.11 or later is required. PySide6 supplies Qt Widgets and QtPdf through
the package dependency; it provides native desktop controls and local PDF
rendering without a web server. The controller and record-validation services
remain independent of the widget toolkit.

### Desktop installation and launch

From the repository root on Linux, WSL2 or macOS:

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install .
theorem-terminal gui
```

After closing its previous workstation process, resume a project with:

```bash
theorem-terminal gui /absolute/path/to/project
```

Windows PowerShell, from the repository root:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install .
theorem-terminal gui
```

Linux needs a desktop display; WSL2 can use WSLg or a forwarded X display. On
Debian/Ubuntu, the Python environment and Qt X11 prerequisites used here are:

```bash
sudo apt install python3-venv libxcb-cursor0 libxkbcommon-x11-0 libxcb-icccm4 libxcb-keysyms1
```

Opening and editing files requires no TeX installation. **Build LaTeX** uses an
installed `latexmk` and pdfTeX on Linux/WSL2, falling back to `pdflatex` if latexmk is
absent. An existing distribution can be used directly. A typical Debian/Ubuntu
installation is:

```bash
sudo apt install latexmk texlive-latex-recommended texlive-latex-extra texlive-pictures texlive-fonts-recommended
```

Individual manuscripts may require further packages. The real manuscript tested
here also needs Euler-VM, supplied by Debian's large `texlive-fonts-extra` package.
These are document dependencies, never corpus-specific application requirements.

### Ordinary files and re-entry

Choose **Open Project Directory**, expand directories and activate a file with
the pointer or keyboard,
or use **File → Open**. **New file** creates an untitled buffer. **Save** checks
the original disk revision before replacing a project file; **Save As** creates a
new project file and refuses an existing destination. External references remain
read-only, with Save As available for an explicit new project copy. Refresh and
comparison preserve dirty text until the user explicitly saves or discards it.

A `.pdf` selected through **File → Open**, Recent files, or the project
navigator opens in the read-only QtPdf pane beside the current editable note.
This path needs neither TeX source nor a compiler and never creates a text
buffer, recovery snapshot, text anchor, build report or mathematical
Verification. The imported PDF's canonical path, SHA-256 identity, page and
zoom are retained independently of the last generated build. Reload and restart
require the same exact bytes before restoring its location. A missing,
unreadable, invalid or changed PDF is reported visibly while the note and the
last valid reading state remain intact. Explicitly opening changed bytes starts
a new imported-document identity at the first page.

Open, Save, Save As, Refresh from disk, Find, Go to line, Split and Close buffer
are available through menus. Open, Save, Find and Find-next also use the
platform-standard key bindings displayed there. With PDF focus, text Find and
Find-next are disabled and the status bar says PDF search is unavailable; Save
continues to name and address the current editable text target, never the PDF.
Focus an editor to search its text. Each pane has a buffer selector and visible
saved, modified, read-only, external-change or conflict state. **View → Split** allows
two source or record buffers, or two passages of one shared file with independent
cursor, selection and scroll positions. Both views share one editable document,
modified state, undo/redo history and private recovery. Edits adjust the other
pane's selection with the text. The navigator and contextual facets can be hidden;
ordinary file editing does not require a wide identity inspector. Hashes are in
expandable technical details.

When both panes show the same document with wrapping enabled, the editor
viewports stay equally wide, including after dragging the splitter or resizing.
Qt's shared plain-text document has one layout width. Different documents and
unwrapped views permit unequal widths; turning off the constraint does not
restore an earlier splitter ratio. This is a Qt presentation constraint.

Session state retains the project root, open buffers, active buffer, cursor,
selection, scroll, wrapping, split, recent files and PDF view. Resizing, wrapping
and layout changes keep a previously visible cursor visible with minimal scrolling;
an offscreen cursor stays offscreen while the visible passage is retained.
Recovered text restores both pane positions even if its saved base is unavailable.
Loading and diagnostic displays never record document positions.
**Work → Add current selection
to working context** retains up to 32 ordered, revision-pinned passages from
ordinary project text or explicitly opened external read-only text. The bottom
**Working context** shelf shows paths, one-based line/column locations and plain
passage previews. Previews normalize whitespace and retain at most 120 Unicode
characters in private session state; tooltips show the full path, pinned SHA-256
revision and canonical stored span (whose columns remain zero-based).
Open a selected passage in the active or other
editor pane, or remove it, through the Work menu or dock buttons. Double-clicking
opens a passage; single-clicking only selects its row. Different passages in one
file coexist; adding the same exact selection again selects its existing row.
The shelf survives closing buffers and restarting the project. Showing it reads
no source content. An explicit open checks the path and exact current or recovered
UTF-8 content before navigating; missing, redirected or changed sources leave the
anchor and both editors in place. No similar-text search or relocation occurs.

**Work → Mark unfinished work here**, **Return to unfinished work**, and **Clear
unfinished marker** maintain the independent single unfinished-work location.
The status bar immediately shows the marked path and location; with no marker it
states why Return is unavailable. Return also identifies that location in its
tooltip and validates it before moving either editor. In loaded editable ordinary text, both aids follow edits through
the workstation's shared document and undo/redo history, independently of pane
selections. Insertions at either boundary of a nonempty passage stay outside it;
a point marker advances when text is inserted at its continuation point.
Edits inside a retained passage update its preview. A completely deleted passage
keeps its last completed pin, visibly changed, and cannot be opened at another
location; undo can restore its range. Checkpoints publish recovery before the
updated navigation pins. If distinct spans converge, a duplicate keeps its
previous pin as changed rather than merging shelf rows.
Known external changes freeze anchors and explicit
opening fails without navigation or a replacement revision.
Neither aid requires a descriptive form. Shelf entries are private local
navigation anchors only, not provenance, citations, warrant records or
mathematical-object identities, and nothing is automatically sent to a model.
Versions 3–7 migrate to version 8 at the next atomic checkpoint without reading
source files. Version 7 gains empty imported-PDF state and retains its generated
PDF position. Migrated anchors have empty previews until explicitly opened or
retained again. Versions 3–5 default to their historical wrapped display;
version 6 preserves its wrap setting. Version 3 gains an empty shelf; existing
shelves are retained, keeping the first anchor when canonicalization makes old
spellings equivalent. Legacy positions preserve the historically rendered
selection in independent pane views. Recovery, unfinished marker, split,
generated PDF, build and window state are preserved.

State, trusted tool settings, build outputs and private recovery are stored under:

- Linux: `$XDG_STATE_HOME/theorem-terminal`, or `~/.local/state/theorem-terminal`;
- Windows: `%LOCALAPPDATA%\theorem-terminal`;
- macOS: `~/Library/Application Support/theorem-terminal`.

Project sessions are keyed by canonical directory identity. Different projects
may be open in different workstation processes, but this increment supports only
one active workstation process per project. No lifetime lock enforces this limit.
Project files cannot configure executables or nominate restoration paths. No `.theorem-terminal`
directory or `.gitignore` entry is created in the project. Dirty text is
checkpointed privately after 250 ms of quiet editing and flushed synchronously
at Save, close, quit and other durability boundaries. Recovery restores the exact
text of the latest successfully completed checkpoint; characters not yet
checkpointed can be lost after abnormal termination. A
successful save or explicit discard removes its recovery snapshot. Closing can
keep private recovery. A failed final checkpoint blocks closing or quitting
unless the user explicitly chooses to discard the session. State uses a separate
atomic mutable-file service; immutable record publication retains its existing
service and semantics.

Recovery cleanup after Save, Discard, Refresh or return to clean text checks the
exact expected bytes under the publication lock, then unlinks and synchronizes
the recovery directory. Failure blocks further workspace writes until close and
reopen, including when unlink completed but synchronization failed. No recovery
rewrite attempts to compensate for an uncertain deletion.

### One task-local mathematical-assistance exchange

R2 adds one initial exchange to the principal GUI. Select a nonempty passage in
visible ordinary source or work text and choose **Work → Ask about current
selection…**, or use `Ctrl+Alt+Q`. The non-modal assistance dock freezes that
exact Unicode text, its current in-memory SHA-256 revision and scalar
line/column range. This includes unsaved visible text and explicitly opened
read-only text references. It does not include PDF bytes, hidden buffers,
workspace history or unselected note text. Up to eight explicit selections can
be added; each can be inspected exactly and removed before transmission.

Enter one natural-language mathematical question and a requested OpenAI model.
The model field can be initialized before launch with the non-secret
`THEOREM_TERMINAL_OPENAI_MODEL` environment variable. Choose **Preview exact
request** to see the provider/model, target and context identities, question,
complete instructions/input, limits, destination, retention disclosure, body
byte length and SHA-256, and every exact UTF-8 request-body byte. Changing the
question, model or context invalidates that preview. **Send exact preview** is a
separate per-request action. At Send time the credential is read only from
`OPENAI_API_KEY`; it is never placed in a workspace, preview, retained record or
diagnostic. For example:

```bash
export THEOREM_TERMINAL_OPENAI_MODEL='MODEL'
export OPENAI_API_KEY='YOUR_KEY'
theorem-terminal gui /absolute/path/to/project
```

The fixed OpenAI Responses adapter sends at most one request off the Qt thread,
with no redirect, retry, provider tool, remote prompt, streaming, previous
response or conversation state, and `store: false`. The R2 task-local limits are
256 KiB for the exact body, 1 MiB for the provider response, 800 requested
output tokens and 60 seconds. A second in-flight send is refused. Cancelling a
preview sends nothing and creates no record. Once transmission begins, a
completed, refused, incomplete or failed terminal `ModelCall` is retained in
private user-local project state when the adapter can do so.

A completed answer shows provider, requested/resolved model and call identity
before a readable read-only plain-text presentation. Returned markup is not
rendered, URLs are not dispatched, code is not run and citations are explicitly
unverified. The complete exact raw response remains available in the retained
terminal record in the same dock. Refused, incomplete and failed calls remain
inspectable without being presented as completed answers and without changing
the note or retrying.

Choose a visible deterministic passage number to inspect its exact UTF-8 span.
**Retain exact passage…** uses the existing lossless projection service and
creates no premise or warrant. **Insert attributed copy into active note** adds
an explicitly unverified, human-editable contribution at the current cursor;
later edits affect only the ordinary note, never the immutable response.
**Cancel / dismiss** needs no disposition form. R2 has no linked follow-up,
automatic retry, source retrieval, PDF extraction, citation verification or
provider conversation state; explicit correction and continuation are the R3
task. Automated and visual checks inject local deterministic transports and make
no live provider request. Their success does not establish mathematical
usefulness.

### External tools and LaTeX

**Tools → Configure editor…** sets a trusted user-local argument template.
Use `{file}`, `{line}` and optionally `{column}`; quoted arguments are parsed
without shell expansion. **Open in configured editor**, also on the toolbar,
uses this template, then `VISUAL`, then `EDITOR`. Use a foreground/waiting editor
command so its exit can trigger a disk-revision comparison. A terminal Vim
example, where `xterm` and `vim` are installed, is:

```text
xterm -e vim +{line} -c "normal! {column}|" {file}
```

The real handoff test used a terminal with `/usr/bin/vim.tiny`. After the editor
exits, choose Refresh, Compare or Keep buffer. Dirty text is never silently
replaced. A notebook (`.ipynb`) opens as a read-only notebook summary; configure
and invoke its Jupyter/JupyterLab handoff deliberately. No kernel runs inside
this GUI.

Open the root `.tex` file and choose **LaTeX → Set as TeX root**, then **Build
LaTeX**. Building executes **trusted project TeX only**, using trusted installed
tools. An out-of-tree staged build is **not a security sandbox**. This tranche
accepts latexmk with a fixed pdfLaTeX executable path, or direct pdfLaTeX. LuaLaTeX,
XeLaTeX and engine-switching aliases are not supported. Tool selection belongs
to trusted user-local settings. Arguments use shell=False, disable shell escape
and first-line engine selection, ignore latexmk rc files, and set both
openin_any=p and openout_any=p. The input setting is defense in depth for
conventional input operations, not a complete read boundary. In particular,
pdfTeX can use `\immediate\pdfobj stream file` to embed an absolute external
file in the generated PDF despite openin_any=p. Arbitrary external reads are
not confined by these settings; build only trusted project TeX. An explicit build
snapshots bounded ordinary project inputs into user-local storage and runs there,
keeping generated auxiliary and bibliography files outside the project. Opening or viewing a source never copies
it or initiates a build.

The text/PDF view provides previous/next page, a page number, fit width, fit page,
zoom and reload for both imported and generated PDFs. Imported identity and
position remain separate from generated output and its build report. Opening the
same exact imported PDF restores its position; **LaTeX → Show last successful
generated PDF** switches back to generated output without discarding the
imported location. A failed build retains the last successful generated PDF. A
changed recorded input revision, dirty input buffer or different root marks that
output stale. Root, source position, both PDF positions and PDF visibility
survive restart. Build diagnostics occupy a separate view; activating a
file-and-line entry opens that project file at the reported line.

Build provenance is captured from the action: executable and version, exact
arguments, working directory, times, stdout, stderr, exit code, log and output
digests, and observed project input revisions from recorder output when available.
Dependency coverage is reported as complete, partial or unknown. Current builds
have partial coverage when recorder data exists and unknown coverage otherwise:
external package/toolchain revisions are not tracked. Observed outside input
paths are retained. “Recorded project inputs unchanged” does not claim the whole
environment is current or reproducible.
A successful build establishes only that this tool invocation produced these
output bytes. It creates no `Verification`, premise admission, justification
derivation, correctness claim or human decision.

### Retained records and current limits

Use **Records** to open a completed model response, exact projection, documentary
warrant package, or Verification with its exact checked bundle. Review shows
attribution first, a bounded index, visible passage-number selection and explicit
full-response viewing. **Retain displayed exact passage** uses the existing UTF-8 projection
service. Viewing or cancelling creates no record. Context facets keep provenance,
admission, contextual derivability and mathematical verification separate.

The desktop has been exercised on Linux/WSL with real TeX and Vim and,
historically, a disposable project on `/mnt/c`. R1's existing-PDF path was
exercised without TeX beside a saved note using actual Qt widgets at 1280×820
and 960×680. R2's question, exact preview, deterministic answer, passage and
editable-note flow was exercised visibly at the same sizes with an injected
local transport and no provider request. Qt/runtime and TeX installation prerequisites depend on
the platform and distribution. Native Windows and macOS GUI operation has not
been exercised; **TeX building is unavailable there in this tranche**. Build
supervision uses Linux/WSL2 subreaping and /proc to terminate and reap descendants,
including children whose parent has exited. Mutable
storage includes Windows and POSIX paths/locking, but crash-durable mutable
publication is unavailable on native Windows because portable directory
synchronization is not implemented. Directory-sync failures are reported,
including on filesystems that reject directory fsync. Existing immutable
publication still uses its Unix descriptor boundary. Project relocation and migration from
old experimental project-local state are not automatic.

Ordinary UTF-8 text and notebooks are limited to 2 MiB, with up to 128 open buffer
references. Reads of visible documents are deferred and bounded. Standard relative
TeX inputs are staged with a 4096-file/256 MiB inventory limit; individual build
inputs, generated PDFs and imported PDFs are limited to 64 MiB. Each tool invocation is monitored for
1024 generated entries and 128 MiB of generated data, including non-stdio
auxiliaries and replaced staged inputs. Output scans run on the 20 ms polling
loop and prune staged-input descendants, which are scanned on a slower one-second
cadence. Their disjoint counts and byte totals are combined; a final complete scan
after process termination and descendant reaping also checks short-lived builds.
An inherited per-file limit supplements these scans; transient overshoot is
possible between samples. These limits provide resource control for trusted TeX
and tools, not confinement.
A quota failure stops descendants, removes that invocation's staged/generated
files and retains at most 64 KiB of each diagnostic stream plus its bounded
report. Missing, oversized and unsupported files
produce visible errors. Custom build recipes, PDF search and outlines,
extraction/OCR, staging external/symlink dependencies, SyncTeX, complete TeX-log
interpretation, automatic build-history cleanup,
language servers, notebook execution and GUI checker invocation are outside this
increment. Installed TeX packages are not a frozen reproducible environment.

For the full suite, including actual Qt widgets without a desktop display:

```bash
THEOREM_TERMINAL_GUI_TESTS=1 QT_QPA_PLATFORM=offscreen PYTHONPATH=src python -m unittest discover -s tests -v
python -m compileall -q src tests
git diff --check
```

### WSL2 and Codex

For the authorized WSL2 checkout, update `main`, enter the repository, and start
Codex there so it discovers the root `AGENTS.md`:

```bash
cd /home/flengyel/src/theorem_terminal
git pull --ff-only origin main
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -e .
codex
```

The Lean and Lake installation already used by `/home/flengyel/src/PCats` can
supply Elan's toolchain and download cache. Theorem Terminal does not import or
execute the PCats Lake project for this bridge. Its own `lean/lean-toolchain`,
`lean/lakefile.toml`, and `lean/lake-manifest.json` pin the checker build:

```bash
cd /home/flengyel/src/theorem_terminal/lean
lake build
lake test
cd ..
PYTHONPATH=src python -m unittest discover -s tests -v
python -m compileall -q src tests
```

The current documentary-checker executable identity is pinned for Linux
x86-64, including WSL2. Do not substitute a binary from PCats or another Lake
project. A changed source, compiled module, or executable is rejected until the
repository's identity bindings are deliberately reviewed and updated.
Native Windows and macOS installations may still use `orient`, `study`, and the
packaged `why` view; this increment's runtime `check-documentary` identity is
Linux x86-64/WSL2 only.

### Locate Appendix A

The initial experiment reads `rs_Appendix_A.tex` from a separate checkout of
the private `flengyel/Categorical_Rice_Shapiro` repository. The source file need
not be copied into this repository. Assign its absolute path to a shell variable
so spaces in directory names are handled correctly.

If that repository is not already present, clone it in a chosen parent
directory:

```text
git clone git@github.com:flengyel/Categorical_Rice_Shapiro.git
```

Both repositories are private, so cloning requires GitHub authentication.

PowerShell:

```powershell
$appendixA = 'C:\path with spaces\Categorical_Rice_Shapiro\rs_Appendix_A.tex'
Test-Path -LiteralPath $appendixA
```

macOS or Linux:

```bash
appendix_a='/path with spaces/Categorical_Rice_Shapiro/rs_Appendix_A.tex'
test -f "$appendix_a"
```

### Run the Appendix A experiment

The general GUI opens `rs_Appendix_A.tex` as an ordinary user-selected file. The
following commands belong to the preserved Appendix-specific CLI experiment:

PowerShell:

```powershell
theorem-terminal orient "$appendixA"
theorem-terminal study "$appendixA"
theorem-terminal study "$appendixA" --through idea
theorem-terminal study "$appendixA" --through skeleton
theorem-terminal study "$appendixA" --through details
theorem-terminal why "$appendixA"
```

macOS or Linux:

```bash
theorem-terminal orient "$appendix_a"
theorem-terminal study "$appendix_a"
theorem-terminal study "$appendix_a" --through idea
theorem-terminal study "$appendix_a" --through skeleton
theorem-terminal study "$appendix_a" --through details
theorem-terminal why "$appendix_a"
```

If the installed console command is unavailable, use
`python -m theorem_terminal` in its place, for example:

```text
python -m theorem_terminal orient PATH/TO/rs_Appendix_A.tex
```

The commands reveal cumulative levels of detail:

- `orient` displays the appendix's purpose and organization, its central
  concepts and named results, and the first selected result. It omits theorem
  statements, proofs, and formal counterparts.
- `study` displays the selected result's proposed role and exact source
  statement. The prepared result is
  `lem:range-lifting-pullback-section`.
- `--through idea` also displays the proposed governing idea.
- `--through skeleton` also displays the proposed proof skeleton.
- `--through details` also displays the exact proof from the source.
- `why` first displays all of those mathematical levels and the reviewed
  informal--formal correspondence. It then displays exact claim versions,
  premise admissions and bases, the checked derivation, the pinned external
  Lean attestation, related source bindings, and the separate justification
  verification. Its conclusion is “derivable relative to these admitted
  premises and policy,” not a claim of truth, knowledge, or understanding.

`orient`, `study`, and `why` do not write to the manuscript, create a session
record, contact a model service, or invoke Lean. Only `why` reads the packaged,
Lean-generated Appendix audit bundle; `orient` and `study` remain independent
of it. The explicitly named bridge commands below write only their requested
artifacts. None contacts a model service; only `check-documentary` invokes Lean.

### Run the offline documentary bridge

This synthetic regression exercises the integration mechanics; it makes no
provider request, is not an actual assistance event, and supplies no evidence
of mathematical usefulness. Build the pinned Linux
x86-64/WSL checker first, then run from the repository root with the virtual
environment active:

```bash
cd lean
lake build
lake test
cd ..

bridge_demo="$(mktemp -d)"

theorem-terminal project-response \
  tests/fixtures/mechanical_model_call.json \
  --start-byte 17 \
  --end-byte 26 \
  --representation-id representation-mechanical-span-v1 \
  --representation-version 1 \
  --kind strategic_hint \
  --claim-id claim-model-produced-mechanical-fixture-v1 \
  --output "$bridge_demo/projection.json"

theorem-terminal admit-documentary \
  "$bridge_demo/projection.json" \
  --fixture-id ai-documentary-mechanical-fixture-v1 \
  --context-id ai-documentary-mechanical-context-v1 \
  --admission-id admission-ai-documentary-mechanical-v1 \
  --admitted-by-kind named_policy \
  --admitted-by-id ai-documentary-mechanical-policy-v1 \
  --at 2026-09-01T00:00:00Z \
  --reason-variable m \
  --rationale \
    'Admit only that this synthetic finalized-call fixture contains the exact span.' \
  --scope \
    'Mechanical regression only; no substantive mathematical claim is admitted.' \
  --derivation-id derivation-ai-documentary-mechanical-v1 \
  --output "$bridge_demo/request.json"

cmp "$bridge_demo/request.json" tests/fixtures/mechanical_admission.json

theorem-terminal check-documentary \
  "$bridge_demo/projection.json" \
  "$bridge_demo/request.json" \
  "$bridge_demo/package" \
  --lean-root lean

theorem-terminal show-documentary "$bridge_demo/package"
```

`project-response` requires a completed and finalized `ModelCall`, verifies the
SHA-256 of its exact raw-response UTF-8 bytes, and accepts a half-open byte span
whose endpoints must be UTF-8 boundaries. It creates a lossless
`Representation` and documentary atom \(D\), but no premise. The fixture's
span `[17, 26)` is the nine-byte text `α → β`. Those offsets expose the exact
persistence boundary for testing; they are not intended to be calculated by a
mathematician. The response-review operation computes them from a visible
passage selection.

Review a completed call locally with a bounded first index page, another page,
one complete passage, or the complete response:

```bash
theorem-terminal review-response MODEL_CALL
theorem-terminal review-response MODEL_CALL --index-start 21
theorem-terminal review-response MODEL_CALL --passage 1
theorem-terminal review-response MODEL_CALL --full
```

The three selectors are mutually exclusive in both the CLI and underlying
renderer. Index pages contain at most 20 rows, and each row puts its byte
length, displayed scalar count, and truncation status in trusted framing before
a preview of at most 120 Unicode scalar values. Variable-width attribution and
request metadata are likewise bounded to 120 scalars, with trusted length and
truncation framing first; `--full` expands only the raw response. Passage
counting is a single linear scan that retains at most the requested page or one
selected passage. Record-derived backslashes, terminal controls, and bidi controls are
reversibly escaped as visible ASCII; the command emits no terminal hyperlinks,
invokes no pager or renderer, and does not interpret returned markup, commands,
TeX, or URLs. A terminal emulator may still auto-link plain URL text. Review is
read-only and needs neither `OPENAI_API_KEY`, network access, nor Lean.

Select the same exact passage through the existing documentary projection:

```bash
theorem-terminal project-response MODEL_CALL \
  --passage 1 \
  --representation-id REPRESENTATION_ID \
  --claim-id CLAIM_ID \
  --output projection.json
```

Passage mode derives the existing generic representation kind from the call's
purpose and rejects `--kind` or byte offsets. The developer byte interface
continues to require both offsets and `--kind`. Passage selection creates only
the existing lossless `Representation` and documentary atom; admission and Lean
checking remain separate explicit commands.

`admit-documentary` is the separate action that creates the explicit scoped
premise \(m:D\). It does not invoke Lean and creates no substantive \(F\),
\(D\to F\) bridge, or mathematical acceptance. Projection and request files
are created with no-overwrite semantics.

The admission request records `checked_at: null`. `check-documentary` first
repeats Python's strict response, span, assertion
hash, and cross-link checks. It then verifies every pinned checker source,
compiled module, and executable digest before invoking the repository-owned Lean
checker. Lean checks the one-node contextual-premise certificate and emits the
bundle once on standard output. The command atomically retains
`projection.json`, `request.json`, the exact `bundle.json` bytes, and a separate
generic `verification.json` in the destination directory. Immediately before
invoking Lean, the application—not the caller—stamps canonical UTC
`checked_at`; the retained request, Lean's embedded check record, and the
external `Verification` agree on that handoff time, separately from the earlier
admission time. The external record also binds the exact retained projection
and stamped request bytes. Existing destinations are refused.

`show-documentary` reloads and revalidates those four files without invoking
Lean and deliberately does not display the model's prose. The raw Lean
`--documentary-warrant` interface is an internal transport boundary: Lean
treats claim hashes as opaque atom identities, while the public Python path
establishes the response and assertion hashes before Lean checks derivability.
The retained digest detects changes relative to the immutable external
`Verification`; it is not a digital signature and does not authenticate a
maliciously replaced persistence store.

### Create one finalized OpenAI ModelCall

The low-level CLI integration surface consumes a developer envelope containing
only existing request-side `ModelCall` information. The delivered R2 GUI now
derives this transient JSON from the selected active task and does not expose it
as a form; mathematicians should not author it. For CLI testing and automation,
the envelope has exactly these fields:

```json
{
  "initiated_by": "person-id",
  "target": {"kind": "WorkArtifact", "id": "attempt-id"},
  "purpose": "strategic_hint",
  "request_text": "The mathematical assistance requested.",
  "context_refs": [
    {"kind": "WorkArtifact", "id": "attempt-id", "revision": "revision-id"}
  ],
  "effective_input": {
    "instructions": "Optional exact application instruction.",
    "input": [
      {
        "role": "user",
        "content": [
          {"type": "input_text", "text": "Exact transmitted mathematical context."}
        ]
      }
    ]
  },
  "limits": {
    "max_request_body_bytes": 262144,
    "max_provider_response_bytes": 1048576,
    "max_output_tokens": 800,
    "timeout_seconds": 60
  },
  "in_reply_to": null
}
```

This is operational input, not a persistent domain schema. `instructions` may
be omitted, and `input` may instead be one nonempty string. The adapter accepts
only text input. Configure the requested model on the command line:

```bash
export OPENAI_API_KEY='...'
theorem-terminal request-assistance prepared-request.json \
  --model MODEL \
  --output model-call.json
```

Before any network operation, the command checks the prepared input, model,
limits, credential presence, and output destination, then freezes and displays
the exact UTF-8 body. The preview includes the fixed endpoint, requested model,
non-secret `Content-Type` header, complete body, context references,
instructions and input, all limits, and destination. Only the exact token
`SEND` authorizes transmission; any other input or interruption creates no file
and sends nothing.

The adapter makes one `POST` to `https://api.openai.com/v1/responses`. The body
allowlist is `model`, optional `instructions`, `input`, `max_output_tokens`, and
`store` fixed to `false`. The authorization header is constructed from
`OPENAI_API_KEY`; the credential is excluded from previews, records, and error
text. Tools, streaming, background mode, remote prompts, previous-response and
conversation state are absent by construction. Redirects and retries are
disabled.

A completed call requires exactly one assistant message with exactly one
nonempty `output_text` block. Auxiliary reasoning items are ignored. Refusals,
incomplete responses, and unsupported output shapes produce terminal
`refused` or `incomplete` records; HTTP, transport, timeout, decoding, and
malformed-response failures produce terminal `failed` records after
transmission when the record can be retained. No error response body is printed.
Every terminal file is flushed, synchronized, and installed atomically without
overwriting an existing or concurrently created destination; temporary files
are removed on success and failure. The atomic link is the publication commit
point. If the subsequent directory durability sync fails, the command reports
that failure while retaining the complete, file-synchronized destination.
Publication holds the synchronized temporary descriptor, uses descriptor-relative
operations, and verifies the temporary file's inode, mode, stable parent-directory
identity, and installed link before accepting publication. If the staging name
was substituted during linking, only the verified link created by this operation
is removed and publication fails. This
protects the local workflow against accidental and ordinary concurrent pathname
replacement; it is not a security boundary against arbitrary compromise of the
same Unix account or host.

The resulting completed file is directly consumable by `project-response`. Nothing in
`request-assistance` automatically projects output, admits a premise, invokes Lean,
or treats the returned text as mathematics. OpenAI's handling of API data is
governed by its current
[data controls](https://developers.openai.com/api/docs/guides/your-data);
`store: false`, as documented for the
[Responses API](https://developers.openai.com/api/docs/guides/migrate-to-responses),
disables response retrieval storage but is not presented as control over every
kind of processing or retention.

The system records only the API-visible text accepted by its explicit response
contract. OpenAI documents that raw reasoning tokens are not exposed through
the API and that optional reasoning summaries are summaries rather than raw
chain of thought
([reasoning guide](https://developers.openai.com/api/docs/guides/reasoning)).
This adapter sends no reasoning-summary parameter and ignores auxiliary
reasoning items. Theorem Terminal never labels a returned explanation or
summary as raw chain of thought, reconstructs hidden reasoning, or claims access
to provider-internal search.

Automated tests inject confirmation, IDs, clocks, persistence, and byte-level
HTTP transport. They make no live OpenAI request. A successful completed file
may then be passed explicitly through the unchanged sequence
`project-response` → `admit-documentary` → `check-documentary`.
This adapter infrastructure does not complete Stage 1; the genuine-obstruction
mathematical trial and its live request remain pending.

### Reviewed source revision

The interpretive guide has been reviewed for the normalized SHA-256 revision

```text
51c3669da3b3a850b1cf8f61f10f873f297d6a598f01d3541678137f002b1945
```

Line-ending differences between Windows and Unix checkouts are normalized. Any
other source change causes `orient`, `study`, and `why` to exit with status 2
rather than present an unreviewed guide. Review the changed mathematics, revise
the guide and its tests when necessary, and only then update the reviewed
digest and any affected warrant bindings.

### Verify the checkout

From the repository root with the virtual environment active:

```text
python -m unittest discover -s tests -v
python -m compileall -q src tests
```

The packaged audit bundle is
`src/theorem_terminal/data/appendix_a_justification.json`. Its complete final
bytes have expected SHA-256

```text
3ca6794e8e9f2ec6f7d6bd08662ac19df2a4496287e8559aec556b3febdd81ed
```

The bundle contains no digest of itself. The expected value and the selected
profile, context, checker, environment, attestation, and source bindings are
retained separately in Python code. A digest match detects replacement relative
to that retained value; it is not a signature.

Maintainers with the pinned Lean toolchain can reproduce the checker and bundle
from the repository root:

```text
cd lean
lake build
lake test
lake env lean TheoremTerminal/Justification/AppendixA.lean
bundle_check_dir="$(mktemp -d)"
lake exe justification_bundle --output "$bundle_check_dir/first.json"
lake exe justification_bundle --output "$bundle_check_dir/second.json"
cmp "$bundle_check_dir/first.json" "$bundle_check_dir/second.json"
sha256sum "$bundle_check_dir/first.json"
cmp "$bundle_check_dir/first.json" \
  ../src/theorem_terminal/data/appendix_a_justification.json
```

On macOS, use `shasum -a 256` in place of `sha256sum`.

The generated file and its external expected digest must be updated only after
the full build, fixture check, deterministic double export, and identity audit
succeed. Ordinary installation and use of `why` require none of these commands.

The same order will govern a later experiment with Daniel A. Marcus's *Number
Fields*: orient in the book or chapter and its central concepts, results, and
problem families before selecting a problem.

## Documents

- `VISION.md` — why the project exists.
- `VOCABULARY.md` — controlled terminology used across the design documents.
- `DOMAIN_MODEL.md` — entities, information classes, and invariants.
- `UX_SPEC.md` — the mathematical workflow the system supports.
- [CODEX_PLAN.md](CODEX_PLAN.md) — active outcome roadmap, implementation status,
  research basis and retained implementation contracts.
- [docs/CODEX_CONTINUATION.md](docs/CODEX_CONTINUATION.md) — copyable prompt for
  the next bounded implementation task and its delivery criteria.
- `AGENTS.md` — instructions for Codex and other coding agents.
- `docs/JUSTIFICATION_LOGIC_EXPERIMENT.md` — the bounded warrant-composition
  experiment and its cut line.

## First corpus

The first corpus is `flengyel/Categorical_Rice_Shapiro`, which is private and
not publicly readable. The named mathematical re-entry and
informal/formal-correspondence test uses `rs_Appendix_A.tex`, the corresponding
Lean declarations, and `Lean/docs/AppendixA.md`. Together they provide a
mathematical manuscript, a formal development, mechanically available
dependency and axiom information, and an existing record of expert
correspondence judgments. A formal counterpart remains optional for every other
corpus.

The existing expert-authored correspondence document records judgments absent from both the
manuscript and the Lean development: which hypotheses proved unnecessary,
which structures are derivable rather than postulated, and where the same term
has different meanings in different parts of the development. Its positional
references become obsolete as either source changes. The experiment will test
which locators, dependency lists, and checking facts can be regenerated
mechanically; which proposed correspondences can be checked during mathematical
work; and which assessments require mathematical judgment.

The justification-logic slice uses the same selected Appendix A result only
after its mathematical role, statement, proof structure, and relevant formal
counterpart have been inspected. It tests whether a checked reason term makes
the formal-proof-policy and formal--manuscript bridges recoverable without
placing formal logic before study.

The first implementation does not ingest a large reference. After its two
initial experiments have been evaluated, a separately authorized experiment
will ingest and study either the Stacks Project
[@stacksprojectauthorsStacksProject2021] or Kerodon. It will import the published
hierarchy, stable identifiers, cross-references, and revision information, then
obtain and represent statements, proofs, examples, and surrounding context as
active mathematical work requires them.

## License

Copyright 2026 F. Lengyel.

Licensed under the Apache License, Version 2.0. See `LICENSE`.
