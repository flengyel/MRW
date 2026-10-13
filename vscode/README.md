# Mathematical Research Workstation for VS Code

The extension moves retained-record inspection, response
review, exact passage retention and attributed note insertion onto the existing
Python core. It adds saved return locations and explicit Lean/browser handoffs.
It also supports selected-context request preview and a separate explicit Send.
VS Code owns ordinary files, editing, undo, saving, and document recovery.

## Run from this checkout

Prerequisites: VS Code 1.85 or later and Python 3.11 or later on the extension
host. Linux/WSL is the initial tested service platform. There are no npm runtime
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

For a VSIX using an installed `@vscode/vsce` development tool, run `vsce package`
in this directory. Its prepublish step stages the current repository Python
sources. Install the result using **Extensions: Install from VSIX…**. The
publisher field identifies the package; no Marketplace publication is implied.
The generated Python directory is ignored by Git and is rebuilt from `src/`.

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
only provider action. The extension reads `OPENAI_API_KEY` from its host
process environment at Send time; start VS Code/its remote server with that
variable configured. Never put credentials in workspace settings or notes.
The existing adapter performs one attempt with its existing limits and retains
an immutable terminal ModelCall in VS Code's private workspace storage. The
preview shows its exact destination. No automatic retry occurs. Completed
answers open through the existing attributed response review; failed, refused,
and incomplete outcomes remain distinct. A timeout or host interruption can
leave the outcome uncertain: inspect the shown record destination before a new
request. The extension cannot prevent closing the host while transmission is
in progress. Unsent drafts are memory-only and are discarded on host restart;
terminal records survive independently. R3 task resumption is not yet ported.

The preview includes captured source identities, hashes, scalar positions,
selected text, instructions, exact request JSON, limits, disclosure, and output
path. The editor may normalize display line endings; the adapter sends the
frozen UTF-8 body whose digest is shown. Opening, previewing, removing context,
and discarding a request make no provider call. Preparation may create an empty
private record directory; it creates no ModelCall or project file. Host state
is separate from Qt's recovery and investigation state.

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

**Inspect a warrant.** **Inspect Retained Record** accepts a completed ModelCall,
projection, Verification with its exact bundle, or documentary package directory.
It reuses the core validators and exposes provenance, admissions, context,
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

Native Windows immutable retention inherits the core's POSIX directory and
hard-link requirements; use Remote WSL for that action. Native macOS has not
been exercised. Linux bridge checks do not establish cross-platform GUI support.

R3 investigation continuation, PDF position tracking,
Qt state migration, internal Lean graphs, vertex elimination, and AI outline
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
Host acceptance. No provider request occurs. The next host check is: open a
saved note, hand off to Lean, return, review the synthetic fixture, insert a
passage, undo it, retain a projection, then restart and return again. Test at
1280×820 and 960×680. Mathematical usefulness needs a separate real task.

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
