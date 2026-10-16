# Mathematical Research Workstation for VS Code

The extension moves retained-record inspection, response
review, exact passage retention and attributed note insertion onto the existing
Python core. It adds saved return locations and explicit Lean/browser handoffs.
It also supports selected-context request preview and a separate explicit Send.
VS Code owns ordinary files, editing, undo, saving, and document recovery.
The offline source-region reader supports informal mathematical arguments as
well as optional captured Lean evidence; see its independent boundary below.

## Workspace hosts and dependencies

Keep one extension and the existing Python core in the workspace environment.
Use VS Code's standard local Linux, WSL2 or Remote SSH to Linux host. Windows
VS Code can supply the UI while the workspace extension and Python run on Linux.
**Python 3.11+ is required on the workspace host**, normally as `python3`.
Configure a different interpreter through `mrw.pythonExecutable` in User or
Remote settings. This is one executable path, without shell arguments.
Ordinary reading and outlining require no Lean, SageMath, containers or model
provider. No npm installation is needed to run an installed VSIX.

| Arrangement | Evidence and intended support |
|---|---|
| Windows VS Code with WSL2 Debian | Scoped actual-host reader checks; installed-package results are in the validation report |
| Local Linux VS Code | Intended standard deployment; Linux bridge/service regressions pass, ordinary desktop-host validation remains separate |
| Windows VS Code with Remote SSH to Linux ARM64 | Scoped installed-VSIX reader/save/normal-close/reopen checks pass on Raspberry Pi 5, Debian 12, Python 3.11.2; see the validation report |
| Other Linux SSH hosts | Separate host validation; non-ARM Linux SSH is the next configuration check when available |
| Other compatible Raspberry Pi OS / ARM configurations | Separate validation targets; other OS images, 32-bit ARM and local Pi desktop use have not been checked |
| Native Windows backend | Separate deferred portability task |

These choices preserve existing source identity, provenance and private
publication protections. They introduce no TypeScript rewrite, custom remote
service or Windows persistence port. The configuration under test is recorded
separately from this architectural direction.

## Manual Markdown overviews across sources

Version 0.5.0 provides the first manual overview spanning several sources. Write
ordinary Markdown about a subject, book, monograph, article, section or argument.
Describe purpose, concepts/results, governing ideas, connections, questions and
optional details in your own order. No template, questionnaire, hierarchy or
compulsory reading sequence is required. VS Code owns editing, saving, undo,
document recovery and Markdown preview. This prose is reader synthesis.

In a Markdown document belonging to the current workspace, run **MRW: Insert
Outline Reference…**, choose an existing saved source outline, then the whole
outline or a saved region. An untitled Markdown document can use a chosen
workspace folder and later be saved normally. The action inserts one inline
reference at the cursor; it does not replace selected prose or save the file.
Undo/redo and ordinary edits use VS Code. The readable label includes supplied
title/known bibliography (otherwise the source filename), source locator,
region range when selected and a retained-revision identifier. Missing metadata
is not invented. Labels snapshot citation text; later reader edits do not
silently rewrite the Markdown.

Place the cursor in a reference's label or URI in the Markdown editor and run
**MRW: Follow Outline Reference at Cursor**. It opens the existing reader; a
region reference also opens the retained source in a read-only plain-text view
with the exact passage selected. Preview-click integration is not implemented;
use the explicit command in the Markdown editor. Generic links and document
content are never interpreted as executable MRW commands.

The [reference contract](../docs/PROOF_OUTLINES.md#first-manual-overview-across-sources--reference-contract-2026-10-16)
binds a versioned `mrw-outline:v1/…` URI to the canonical project/private-store
scope, outline UUID and exact retained source revision. Region references also
pin the region UUID and half-open range (1-based lines, 0-based Unicode scalar
columns). Annotation edits do not invalidate them. If a region is changed or
removed, the reader reports the changed association and opens the earlier pinned
retained passage, selecting no replacement region. It does not follow the new
range. Whole-outline references expose the current reader annotations over the
pinned source, not a snapshot of mutable annotations.

Changed or missing original files do not prevent exact retained access. Missing
outlines, unavailable/corrupt retained storage, malformed references and a
different workspace/storage scope produce clear failures without changing the
Markdown, creating replacement storage or searching other projects. Following
only reads/navigates; it neither changes outline visibility nor publishes state.
References confer no proof-checking status or verified dependency relation.

**Copying Markdown alone does not transfer private outlines or retained sources.**
References work only in their current workspace/private-storage scope. This
increment supplies no cross-machine transfer, synchronization, automatic
overview generation, source discovery, inference graph or elimination witness.
See [focused host checks and limits](../docs/VS_CODE_OVERVIEW_VALIDATION.md).

## Offline source-region reader

Open a saved UTF-8 mathematical text, select a passage, and run **MRW: Create
Outline from Saved Source**. An empty selection creates an outline without
regions. **Add Selected Source Region** adds more passages; select a card in
the reader and use **Replace Selected Outline Region Range** to revise its
range. The original or **Open retained source** text view supplies positions.
The source stays unchanged; ordinary source edits, saving and undo belong to
VS Code. Save or undo source edits before capturing original-file selections.

Each card offers **Hide argument detail**, **Expand exact source**, and source
navigation. **Use Selection as Exact Statement** records a separate exact
statement, labeled either reader-selected source text or a reader-labeled
declaration statement. **Keep Selected Hypothesis / Cited Result** retains
source quotations of hypotheses, definitions, local assumptions, citations or
references. These remain accessible while details are hidden. They describe
available context, not necessary or jointly used premises.

Each shared-context quotation has an editable reading role and reader label;
choose **Save context description** to persist them. To replace its quoted
range, select exact original or retained source text, run **Replace Shared
Context with Selection…**, and choose the context item. **Remove shared
context** removes that reading selection. These actions leave source bytes,
statements, other context and reader annotations intact; **Open retained
source** still exposes the original hypotheses and argument.

Use the editable overview and region annotations for governing ideas,
intermediate claims, reconstructions, intended inferences, cited dependencies,
reusable lemmas, questions, suspected gaps and proposed repairs. Choose a
purpose, supplied origin and optional author, then **Save annotation**.
Reader text has its own attribution and never inherits a source's checking
status. Imported AI material can be labeled as such; this command makes no
model request and does not fabricate a ModelCall. Retain an existing response
or other provenance artifact explicitly when available. Unknown authorship,
edition/revision, translator or other provenance stays unknown.

Orientation, central concepts/results, governing ideas, argument structure and
technical detail can be visited through the reading-level filter in any order.
A reader can record reliance on a cited result while deferring its proof.
This is manual navigation, not automatic Kallenberg guidance or prerequisite
analysis. Textbooks, monographs, articles and AI-generated or AI-assisted
manuscripts use the same reader. Lean is optional.

**Attach Recorded Outline Evidence…** retains an existing UTF-8 artifact without
alteration or rechecking. Label supplied declaration statements separately from
intermediate tactic goals. For the captured native Lean JSON array format
(`label`, `result.goals`), choose a supplied snapshot explicitly; its local
context is available assumptions. Region associations are manual, not verified
correspondences or inference graphs. Other UTF-8 artifacts are available in a
read-only plain-text view. No tool is run to create missing evidence.

In an evidence card, choose a region and, for recorded goals, a supplied
snapshot, then **Save manual association**. **Remove region association**
keeps the artifact as an outline-level reference, including its selected
goal/context and **Open retained artifact** action. It can be associated with a
region again later. Removing a reading association changes no original
statement, hypotheses or checking evidence and deletes no retained bytes.

**Open Saved Source Outline…** restores saved selections, descriptions,
annotations, evidence and hide/expand settings after restart. A changed,
redirected or missing original is reported and source navigation refuses to
guess. Expansion and further selections can use the exact retained revision.
Refresh checks original-file status explicitly. Each action also validates its
private state revision; concurrent edits are rejected. A retained blob that is
missing or changed produces an error, while saved annotations remain readable.

Selections are 1-based lines and Unicode scalar columns pinned to a raw-byte
SHA-256 revision; host UTF-16 positions are checked at capture/navigation.
Expansion sets `pre.textContent` from retained text, preserving selected Unicode
and line endings. Native text views may normalize displayed line endings; they
are navigation surfaces, not the expansion-fidelity test. A retained BOM remains
in the blob and is excluded from host coordinates. No OCR/PDF transcription
fidelity is implied by retention.

### Outline persistence boundary

The independent Python `source_outlines.py` service reuses `SourceDocument`,
bounded file reads, immutable private publication and synchronized exact-previous-
byte mutable publication. It does not import Qt or duplicate editor buffers.
Under `context.storageUri/outlines-SHA256(canonical-project)/UUID/`, exact source
and supporting-artifact bytes are immutable `0600` blobs; `outline.json` is
versioned private mutable navigation and reader work. It writes nothing into
the source project and imports no Qt workspace/recovery data. The format uses
the existing Source/SourceOccurrence/VersionedSpan and attributed Representation
boundaries; it is not a universal proof schema or an immutable warrant record.

Reader forms keep unsaved drafts in the live panel across re-rendering and
failed publication. Text entered while a save is pending survives its reply;
only the submitted version is saved until another explicit save. Save explicitly
before closing/reloading; unsaved form drafts have no crash/restart recovery.
Failed or uncertain private publication
keeps the view and drafts, blocks further private writes for that project until
host reload, and leaves retained blobs unchanged. State published before a
directory-sync failure may be present on reopen; failure is never called a
successful save. Same-project concurrent host processes remain unsupported.

Supported sources: saved UTF-8 `.txt`, `.md`, `.markdown`, `.tex`, `.rst`, `.org`,
`.lean`, at most 2 MiB. PDF regions/pages, OCR, notebook cells, rendered TeX,
binary and non-UTF-8 formats are unsupported. Bibliographic locators are free
text (section/theorem/page/reference); actual selection locators are text ranges.
At most 64 regions (256 KiB each), 32 contexts (64 KiB each), 2 MiB aggregate
selected text, 16 supporting artifacts (2 MiB each), 32 annotations per overview
or region (16 KiB each), 512 KiB private state, and 100 listed outlines per project.
The list does not silently page or discard work beyond that bound. There is no
outline or artifact deletion/garbage collection, cross-machine synchronization,
or range undo. Context removal and evidence detachment affect only reading
associations.

Opening, editing annotations, hiding, expanding, navigating retained text and
restoring make no compiler/provider calls. Navigating an original Lean source
may independently activate an installed Lean extension; that is not an MRW
check. No Verification, premise admission or inferred human judgment is created.
Automatic extraction, AI proposals, automatic gap detection, verified joint-
premise graphs and elimination witnesses remain pending. This reader partially
implements the accepted proof-outline requirement; faithful expansion does not
establish correctness. See [focused validation](../docs/VS_CODE_OUTLINE_VALIDATION.md).

## Run from this checkout

Prerequisites: VS Code 1.85 or later and Python 3.11 or later on the extension
host. Scoped installed-reader checks cover WSL Debian and Remote SSH to Debian
ARM64; see the host table above for limits. There are no npm runtime
dependencies and no Qt dependency for extension actions.

1. Open this `vscode/` directory in VS Code.
2. Run `python3 scripts/bundle-core.py`, or use the provided F5 launch task.
3. Press F5 to launch an Extension Development Host. Open a trusted local
   mathematical project there. Under Remote WSL/SSH, Python and source paths
   belong to that remote host.
4. Open the **Mathematical Research** view in Explorer, or search **MRW:** in
   the Command Palette.

If Python is named differently, set `mrw.pythonExecutable` in User or Remote
settings. It is one executable path, without arguments or a shell template.
The development bundling task separately uses `python3`; run the bundling
script with the available Python executable if necessary.

## Package and install a VSIX

Build in the Linux workspace checkout with Python 3.11+, Node.js 22+ and npm. The committed
lockfile pins the development packager, **@vscode/vsce 4.0.0**. From the repository
root:

```sh
npm ci --prefix vscode --ignore-scripts
TZ=UTC SOURCE_DATE_EPOCH=1792094267 npm run package --prefix vscode
npm run verify-vsix --prefix vscode -- theorem-terminal-0.5.0.vsix
sha256sum vscode/theorem-terminal-0.5.0.vsix
```

In WSL, use Linux Node and npm for this build; a Windows npm launcher cannot
run the Linux prepublish chain. Node/npm are development packaging requirements,
separate from the installed extension's Python dependency.

Packaging runs the existing `vscode:prepublish`/`bundle-core` hook, copying the
current repository Python core, JSON data and Apache license. The verifier
compares every runtime JS/Python/data/license byte to this checkout, checks the
production manifest and rejects missing or unexpected archive files. The
package excludes development tests, scripts, staging configuration, caches and
packaging dependencies. Generated Python copies, dependencies and VSIX files
are ignored by Git. The recorded epoch is the timestamp of the completed
prior delivery baseline `b776368`; vsce uses it for stable ZIP timestamps
and entry ordering. UTC avoids host-timezone differences. Two builds with the
recorded Node/npm/packager versions produced identical archive bytes; use those
versions when reproducing the delivered SHA-256. Record the hash of the actual
file. This procedure packages locally and does not publish to the Marketplace.
The earlier 0.4.1 archive is preserved separately. Reproduce its recorded hash
from packaging revision `15ba6cd`, with its prior epoch `1792079077` and recorded
tool versions, in a separate checkout. The new overview artifact and its focused
checks are recorded in the overview validation report.

Open an ordinary window for the intended Linux workspace: local Linux, the
chosen WSL distribution, or an SSH-connected Linux host. Choose **Extensions:
Install from VSIX…** and select the package. In a remote window, check that MRW
appears under that workspace host's **Installed** extensions, rather than only
under the local UI's extensions. Alternatively, in that connected window's
integrated terminal on the workspace host:

```sh
code --install-extension /absolute/path/to/theorem-terminal-0.5.0.vsix
code --list-extensions --show-versions
```

The extension identity is **flengyel.theorem-terminal**, version **0.5.0**.
Reload the window if VS Code requests it. Open a trusted ordinary Linux workspace
and run an **MRW:** command from the Command Palette; F5 or a development manifest
is unnecessary. Python 3.11+ must be available on that host (normally
`python3`); no Qt or Lean installation is required for the offline reader.
The bridge runs `python3 -I` with `python/bridge.py` under the installed
extension and loads that directory's bundled core. It does not import the
checkout or an independently installed `theorem_terminal` package.

Installation keeps the existing extension identity and private-state paths.
Do not delete workspace storage to install or upgrade. Saved outlines are
reopened explicitly with **MRW: Open Saved Source Outline…**; save reader forms
before closing. Native Windows backend portability remains deferred; run the
workspace extension and Python on Linux. See the [installed-package validation](../docs/VS_CODE_OUTLINE_VALIDATION.md)
for the tested workflow and remaining limits.

### Windows UI with a Linux SSH workspace

Install Microsoft's **Remote - SSH** extension in Windows VS Code. Confirm that
the Windows SSH client can log in to the chosen Linux host, then use **Remote-SSH:
Connect to Host…** and open a folder on that host. If Remote - SSH selects an
unusable SSH executable from PATH, set `remote.SSH.path` in Windows User settings
to the working SSH client. An extra terminal suite is unnecessary.

Check `python3 --version` in the connected window's **remote** integrated
terminal. Copy the VSIX to that host using an ordinary file-transfer tool, then
run the `code --install-extension` command above there. A terminal explicitly
labeled **Local** runs on the UI computer and does not install into the Linux
workspace host. Confirm MRW is installed under the SSH host's extensions.
Authenticate and trust only the intended workspace through VS Code's prompts;
no global trust choice or MRW state reset is needed. Save reader forms before
normal close/reopen and explicitly reopen the saved outline.

The [Pi host check](../docs/VS_CODE_OUTLINE_VALIDATION.md#remote-ssh-on-raspberry-pi-5--2026-10-15)
used Remote - SSH 0.128.0, the Windows OpenSSH client and the unchanged 0.4.1
VSIX. It required no source checkout, Python package installation, Qt, Lean or
SageMath on the Pi. This checks the offline reader; optional integrations and
other host configurations need their own evidence.

### Reproduce the bounded outline host checks

The [outline report](../docs/VS_CODE_OUTLINE_VALIDATION.md) records the two examples,
repairs and limitations. Keep the pinned full Subgraph source from reconnaissance
at the path expected by `scripts/prepare-host-tests.py`; preparation checks its
exact digest and never downloads it or invokes Lean. Then run from the repo root:

```sh
python3 vscode/scripts/bundle-core.py
python3 vscode/scripts/prepare-host-tests.py --artifacts .codex-work/vscode-host-outline-run --outline-phase seed
```

Open the printed staged extension/project in a normal Windows VS Code/WSL
development host with remote URIs and without `--extensionTestsPath`. Keep the
window in the foreground. The bootstrap guards the one-shot Python bridge
against network connections and child tool processes, scripts dialog choices,
and exercises the actual webview DOM. Wait for `outline-seed.json` to contain
`complete: true` with no `failure`, then close normally. Prepare the same staged
extension/project using `--outline-phase restart`, relaunch, and require the
same completion criteria for `outline-restart.json`. That phase changes/deletes
only disposable source copies. An optional `--outline-phase refine` after closing
checks precise statement labels and restored editor-group reuse. Test artifacts
are private generated files; only the reviewed reports/digests are committed.
Production logic contains no theorem names, corpus paths or source line numbers.

For the bounded context/evidence editing follow-on, use an ordinary disposable
project; the full pinned source and previous seed campaign are unnecessary:

```sh
python3 vscode/scripts/bundle-core.py
python3 vscode/scripts/prepare-host-tests.py --artifacts .codex-work/vscode-host-associations-run --outline-phase associations
```

Launch the printed staged extension/project as above. Require
`outline-associations.json` to complete without failure, close that host normally,
then prepare the same artifacts directory with `--outline-phase associations_restart`
and relaunch. Require `outline-associations_restart.json` to complete without
failure. These phases test association edits/removal, newer typing during a
pending save, retained access, failed publication and restart persistence with
guarded offline bridge calls. They do not repeat the previous two-source campaign.

## Workflows

**Ask about selected work.** Select ordinary text, including unsaved or untitled
work, then choose **Ask About Selected Work**. Enter the mathematical question
and a model identifier (or set `mrw.model` in User/Remote settings). The complete
request opens as a read-only plain-text preview. **Add Selection to Request**,
**Remove Request Context**, and **Edit Mathematical Question** produce a new
preview. Up to eight captured passages may be included; removing all of them
sends only the question and the displayed no-context notice. Later document
edits do not alter an already captured passage. To use changed text, remove the
old context and select the new passage explicitly.

With the current preview active, choose **Send Exact Preview**. This is the
only provider action. The Python service reads `OPENAI_API_KEY` from its inherited host
process environment at Send time; start VS Code/its remote server with that
variable configured. Never put credentials in workspace settings or notes.
The existing adapter performs one attempt with its existing limits and retains
an immutable terminal ModelCall in VS Code's private workspace storage. The
preview shows its exact destination. No automatic retry occurs. A known preflight rejection retains the question
and selected contexts, reports **not sent**, and requires a new preview before
another Send. Completed answers open through the existing attributed response
review, pinned to the exact retained-record digest; failed, refused,
and incomplete outcomes remain distinct. A timeout or host interruption can
leave the outcome uncertain: inspect the shown record destination before a new
request. The extension cannot prevent closing the host while transmission is
in progress. Unsent drafts are memory-only and are discarded on host restart;
terminal records survive independently. R3's explicit linked continuation and
private task resumption are described below.

The preview includes captured source identities, hashes, scalar positions,
selected text, instructions, exact request JSON, limits, disclosure, and output
path. The editor may normalize display line endings; the adapter sends the
frozen UTF-8 body whose digest is shown. Opening, previewing, removing context,
and discarding a request make no provider call. Preparation may create an empty
private record directory; it creates no ModelCall or project file. Host state
is separate from Qt's recovery and investigation state.

**Continue one answer.** From a reviewed initial completed response, choose
**Continue an Initial Answer Once**. With no reviewed response, select its
retained ModelCall explicitly. Choose one to eight passage numbers, write the
follow-up question and a separate human correction or changed assumption, and
select the model. **Select Prior Response Passages**, **Add Selection to
Request**, the context-removal command, and the human-field commands can revise
the draft. Every change invalidates the old preview. The complete independent
child body includes only those exact prior spans, explicit current selections,
and displayed human fields. It records `in_reply_to` without provider
conversation state. **Send Exact Preview** remains separate and single-attempt.
A linked child cannot become another parent; an active investigation cannot
be overwritten with a branch.

**Resume and end.** **Resume Saved Investigation** explicitly validates the
private pointer and exact retained records after restart, without sending.
The read-only comparison keeps selected parent evidence, human task text and
child outcome separate. Missing or changed records are reported while the
human text and original pins remain. Use **Review Investigation Parent** or
**Review Investigation Completed Child** for normal passage review and retention.
Failed, refused and incomplete children remain terminal and inspectable.

Human task fields are edited through the current-question, correction,
conclusion and unresolved-issue commands. Accepted edits are visible in the
comparison and remain in memory until **Save Human Task Summary**. The
investigation-current-question command is separate from an unrelated R2 draft.
**Insert Investigation Handoff into Active Note** copies the latest matching
human fields and record identities, without model prose or automatic saving.

**End Investigation…** offers **Insert handoff and end**, **End without
insertion**, and **Cancel**. Focus the intended ordinary note before choosing
insertion. The handler rechecks that note/version/selection after confirmation
and preparation. Ending clears only the active private pointer after successful
publication; records and ordinary files remain. Insertion is one unsaved host
edit with undo. If ending fails after insertion, the note edit and live pointer
remain, with no automatic retry, duplication or undo. Ending without insertion
explicitly discards the private human task text. After ending and restart,
another independent one-parent/one-child investigation can use the slot.

### Investigation persistence boundary

The core stores a version-1 `theorem-terminal.editor-investigation` envelope
under the extension's private workspace storage, in
`investigation-SHA256(canonical-project-root)/active.json`. It is limited to
128 KiB and contains bounded human task fields, exact parent identity/spans,
and the child's destination and exact request fingerprint. Each human field is
limited to 16 KiB. Terminal state additionally pins the child's record hash,
identity and response digest. It contains no editor buffer, recovery snapshot,
full selected current context, or provider conversation state. It reuses the
shared investigation value validator without loading or migrating Qt session
data. Activation launches nothing; Resume is explicit.

The core reserves the sole slot durably before child transmission. A host
interruption therefore leaves a pending destination rather than permitting an
automatic second child. Explicit Resume may reconcile the first terminal record
at that destination only if all recorded request-side fields match the reserved
fingerprint and parent link. A missing or nonmatching record stays unresolved;
there is no retry. A known terminal record is subsequently checked against its
exact retained-file and response digests without replacement guesses.

Private pointer writes reuse the existing mutable-file service: exact previous
bytes, kernel publication lock, synchronized file, atomic replacement and parent
directory sync. Immutable publication is unchanged. Failed or uncertain private
publication keeps the live state and blocks further private writes/Send until
host reload. A post-replacement sync failure may leave the complete replacement
on disk; no rollback occurs. Preserve unsaved human edits with an ordinary-note
handoff before reload when needed. VS Code owns note saving and recovery; no Qt
checkpoint or close-blocking guarantee is claimed. Concurrent hosts for the same
project remain unsupported. This R3 pointer lifecycle was checked on WSL Debian;
the separate Pi/SSH check covers offline outline persistence. Native Windows
Send remains unavailable.

**Read and inspect a proof.** Keep a saved UTF-8 source or note active, then
choose **Open Lean Proof and Keep Return Location**. Select a `.lean` file and
line. The proof opens beside the work. An installed Lean extension supplies its
usual proof inspection and may process the source when opened; MRW neither
extracts a proof graph nor records a new verification. **Return to Marked
Location** restores the pinned source selection, including after restarting
the host. The Explorer view displays the saved file, line and bounded excerpt.

**Use an external viewer.** From the saved source choose **Open External Proof
Viewer**. It marks the return location and opens `mrw.proofViewerUrl` as HTTPS.
The default is ProofMaps. No file, source text, declaration or path is appended
or uploaded. Arbitrary-project support, deep links, and embedding are not
assumed. This is a browser handoff, not an integrated proof map.

**Review retained assistance.** Choose **Review Model Response**, select an
existing completed `ModelCall`, then **Show Response Passage**, **Show Response
Index Page**, or **Show Full Response**. Attribution and digest precede returned
text. Views are read-only plain-text virtual documents using the core's safe
rendering, not rendered Markdown. Reopening an earlier review tab selects that
tab's exact record and passage for subsequent actions. A changed record must
be reviewed again.

**Keep a useful passage.** After showing a passage, **Retain Response Passage**
publishes a new immutable documentary projection through the existing private,
atomic no-overwrite service. It never overwrites even when a Save dialog offers
replacement. **Insert Attributed Passage into Active Note** inserts an explicitly
unverified editable copy at the cursor in an ordinary note. It preserves selected
work, creates one editor undo step, and does not save automatically. A changed
note or selection during preparation cancels insertion. Notebook-cell insertion
is not implemented.

**Inspect a warrant.** **Inspect Retained Record** accepts any terminal ModelCall,
projection, Verification with its exact bundle, or documentary package directory.
Completed, failed, refused, and incomplete calls can all be inspected as
validated records. Passage review and projection still require a completed
response. It reuses the core validators and exposes provenance, admissions, context,
derivation, and verification separately. It never invokes Lean or admits a
premise.

## Migration boundary

| Existing responsibility | Extension implementation |
|---|---|
| Text editing, save, undo, recovery | Owned by VS Code; no Qt buffer/controller port |
| Exact response selection and attributed copying | Shared `record_actions.py`; Qt delegates to the same functions |
| Record validation and presentation | Existing `record_views.py` and `response_review.py` through `editor_bridge.py` |
| Immutable passage publication | Existing `private_persistence.py`; unchanged no-overwrite boundary |
| Request preparation and transmission | Shared `assistance_actions.py`; existing adapter and immutable publication unchanged |
| Bounded R3/R3.1 | Shared `investigation_actions.py`; independent `editor_investigation.py` private pointer; host commands and undo |
| Return location | One saved revision-pinned selection per canonical project in private VS Code workspace state |
| Proof inspection | Explicit opening of local Lean source or configured HTTPS viewer |

Return markers require saved text and retain exact byte revisions. They do not
follow edits: a changed or unsaved source blocks return until it matches again
or is explicitly re-marked. They are navigation aids, not citations or
immutable evidence. Qt workspace/recovery state is neither imported nor
rewritten. Host document recovery and workspace-state durability are VS Code's
responsibility; the Qt checkpoint guarantee is not claimed for this frontend.

Record commands launch the bundled Python service only when invoked, using
`-I`, an argument vector, and the extension directory as working directory.
Activation and sidebar display launch nothing and read no source files. The
bridge accepts one JSON request bounded at 4 MiB, uses a fixed operation
allowlist and existing bounded record readers, and exits. The outbound provider
body retains its independent 256 KiB limit. Only `send_assistance` can transmit. Workspace executable configuration
is not loaded. Untrusted and virtual workspaces are unsupported in this increment.

Native Windows Send is blocked before transmission because immutable retention
requires the core's POSIX directory and hard-link operations; use a Linux
workspace host (for example Remote WSL).
Read-only inspection and preview remain available. Other persistence failures
may still occur on supported hosts and are reported without automatic retries. Native macOS has not
been exercised. Linux bridge checks do not establish cross-platform GUI support.

PDF position tracking,
internal Lean graphs, vertex elimination, and AI outline
proposals remain to be transferred or implemented. PDF, LaTeX, Lean and notebook
editing can use installed host extensions under their own settings and execution
behavior. MRW does not configure or attest to those tools.

## Checks

From the repository root:

```sh
python3 vscode/scripts/bundle-core.py
npm run check --prefix vscode
npm test --prefix vscode
PYTHONPATH=src python3 -m unittest discover -s tests -v
python3 -m compileall -q src tests
```

The Node tests exercise the actual bundled Python bridge and command workflows
using a VS Code API double. They are not visible UI or Extension Development
Host acceptance. No provider request occurs. The real-host checks below now
cover those workflows on Windows VS Code connected to WSL Debian.
Mathematical usefulness needs a separate real task.

API references: [tree views](https://code.visualstudio.com/api/extension-guides/tree-view),
[workspace trust](https://code.visualstudio.com/api/extension-guides/workspace-trust),
[virtual documents](https://code.visualstudio.com/api/extension-guides/virtual-documents).

### Recorded validation, 2026-10-13

- All 9 new Python bridge tests and all 9 Node bridge/command tests pass.
- The complete Python suite ran 277 tests: 212 passed, 64 skipped, and one
  existing TeX descendant-reaping test failed. The same failure was reproduced
  from the exact unchanged `63fc23be` baseline in this container. No TeX
  supervision code was changed.
- Python compilation, JavaScript syntax checks, and an installed-package bridge
  launch pass. The installed bridge reads the synthetic multibyte fixture
  without Qt, Lean or a provider request.
- VS Code and PySide6 are unavailable here. There is no claimed visible host
  run, Qt widget regression run, VSIX installation, or mathematical-use result.

### Preview/Send increment, 2026-10-13

Request preparation, preview rendering, transmission and terminal-record
matching are extracted from `Workstation` into shared independent services. Qt
delegates to them. VS Code supplies editor selection, transient draft commands,
a single in-flight action, and a consumed-on-Send preview. No provider adapter,
transport, record schema, or publication rule is changed.

The host validation remains pending: in a real Development Host, capture an
unsaved Unicode passage, remove/add context, edit the question, inspect and
discard the preview, then review/insert the synthetic completed-response
fixture. Do not use a live provider request as an implementation test.

Validation for this increment: all 15 Node bridge/command tests and all seven
new Python assistance-bridge tests pass. The complete Python suite ran 284
tests: 219 passed, 64 skipped, and the previously recorded TeX descendant-reaping
error recurred. TeX supervision is unchanged. Installed-package preview, Python
compilation, JavaScript syntax, and diff checks pass. No live provider request,
Lean check, Qt widget run, or actual VS Code UI run was performed.

### Review repairs, 2026-10-13

The review addresses exact record identity when opening a newly received
answer, inspection of all terminal outcomes, and recoverable preflight
rejections. It also exercises virtual-document language changes and restored
tabs so that the visible response cannot silently select another record.
See [the review report](../docs/VS_CODE_ASSISTANCE_REVIEW.md).

All 20 Node bridge/command tests and all 21 focused Python editor tests pass.
The complete Python suite ran 289 tests: 224 passed, 64 skipped, and the same
existing TeX descendant-reaping error. Installed-package terminal inspection,
Python compilation, JavaScript syntax, and diff checks pass. Actual VS Code
host acceptance remains pending.

### Actual host validation, 2026-10-13

The scoped command workflows now pass in Windows VS Code 1.141.1 connected to
WSL Debian, with Python 3.13.5 on the Linux workspace extension host. All
responses use an injected deterministic transport; the test launcher removes
the inherited credential and rejects socket connections. The host workflows
made no live provider call and invoked no Lean. See [results and limits](../docs/VS_CODE_ASSISTANCE_REVIEW.md#actual-extension-development-host-validation).

The real host exercised Unicode/CRLF and untitled selection, frozen preview,
context removal/addition, question editing, separate Send and duplicate
rejection, concurrent note edits, all terminal statuses, known-unsent recovery,
inert passage review, insertion/undo, private no-overwrite projection,
language changes, and saved-source handoff/Return. A separate normal
development-host close/reopen confirmed persisted Return and stale virtual-tab
rejection. Windows captures were inspected at 1280×820 and 960×680; the smaller
capture uses a hidden sidebar and two host zoom-out steps at this display
scaling. These checks script dialogs; they do not establish manual-dialog,
VSIX-installation, external-browser, cross-platform, or mathematical-use acceptance.

All 20 existing Node checks passed. The Python suite reported 289 tests: 230
passed and 59 skipped. No production defect was found in the covered paths.
The skipped checks include 58 opt-in Qt widget tests and one unavailable
authorized `/mnt/c` project parent. Production services and transport are unchanged.
The broader Python suite also exercised the already-built pinned Lean checker
through its five conditional documentary regressions; no Lake build was run.

To repeat the host checks, first bundle the core, then prepare a disposable
project and artifacts directory:

```sh
python3 vscode/scripts/bundle-core.py
python3 vscode/scripts/prepare-host-tests.py --artifacts .codex-work/vscode-host-run
```

Launch an Extension Development Host with this extension as
`--extensionDevelopmentPath`, `vscode/test/host` as `--extensionTestsPath`, and
the printed project as the workspace. Use a separate temporary `--user-data-dir`
and `--disable-extensions`; the development extension itself still loads.
On Windows/WSL invoke Windows `Code.exe` with `--remote wsl+DISTRO` and
`vscode-remote://wsl+DISTRO/absolute/path` URIs for those three locations. The WSL
remote CLI ignores development/test flags. The runner scripts prompts and
transport while using real host documents, commands and undo. It writes
`initial.json`, transport bodies, and a `ready` file under the artifacts directory,
then exits after up to 60 seconds (or when a `finish` file is created there).

VS Code uses in-memory workspace storage with `--extensionTestsPath`, so that
mode cannot test restart persistence. Prepare the normal-host bootstrap:

```sh
python3 vscode/scripts/prepare-host-tests.py --artifacts .codex-work/vscode-host-run --persistence-phase seed
```

Launch the printed staged extension with the same user-data directory and
project, **without** `--extensionTestsPath`. Its production JS/Python bytes match
the checkout; only its manifest entry/activation and test configuration differ.
The bootstrap forbids Send and writes `persistence-seed.json`. Close that host
normally, prepare `--persistence-phase restart`, and relaunch the same staged
extension. Check `persistence-restart.json` for `complete: true` and no `failure`.
Do not count a launch or an incomplete report as a pass. Keep generated host
artifacts outside version control.

### R3/R3.1 validation and reproduction

The bounded lifecycle is implemented and technically checked in normal WSL
Development Hosts, including restart, changed-record handling, failed/cancelled/
successful ending, latest-summary insertion with undo, and sequential reuse for
all terminal outcomes. A visible view-placement defect was fixed by reusing an
existing research editor group. See [the R3 report](../docs/VS_CODE_ASSISTANCE_REVIEW.md#r3r31-extension-migration).
The final regression pass has 26 Node tests passing and 297 Python tests
reported (238 passed, 59 skipped). PySide6/widget acceptance and mathematical
usefulness remain unobserved in this run.

Prepare the deterministic normal-host bootstrap with:

```sh
python3 vscode/scripts/bundle-core.py
python3 vscode/scripts/prepare-host-tests.py --artifacts .codex-work/vscode-host-r3-run --investigation-phase seed
```

Launch the printed staged extension and project through Windows `Code.exe`
and WSL remote URIs, with a separate temporary user-data directory and
`--disable-extensions`, without `--extensionTestsPath`. Keep that test window
in the foreground for reliable editor-focus events. Check `r3-seed.json` for
`complete: true` and no `failure`, then close normally. Prepare and relaunch
the same staged extension/project with `--investigation-phase resume_end`,
then `--investigation-phase sequential --investigation-outcome failed`,
repeating the latter for `refused` and `incomplete`, closing between launches.
Check `r3-resume_end.json` and each `r3-sequential-OUTCOME.json` for completion
without failure. Omitting the outcome runs all three in one host; that combined
driver hit background-window focus delays in this environment. The bootstrap
injects all responses and blocks Python network connections; it makes no live
provider request. It authors only disposable ordinary test work. Reports from
aborted focus/setup attempts do not establish acceptance.
