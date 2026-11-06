# Existing documents: MRW 0.20.0 validation

Date: 2026-11-06. Task: [existing documents](CODEX_EXISTING_DOCUMENTS_PROMPT.md).
Fetched main advanced cleanly from the delivered terminology release `42b465f`
to `47e6275` before implementation. A second fetch before integration found no
additional commits. No reset, worktree replacement, note import or storage move
was performed. Implementation, package and delivery identities are recorded below.

## Delivered route

Open Document displays the selected original, including an explicitly chosen
external file. Markdown opens in its existing host buffer and populates Contents
without hiding the editor. Choose Document remains a Markdown Contents selector.
Choose Notes Folder grants one remembered host/workspace-scoped directory for
ID lookup and backlinks; a file grant does not index its ancestors. Reopen
Document explicitly opens the last opened/followed file after restart.

Contents and Follow Document Link support relative Markdown file links, exact
heading fragments and `[[ID]]`. Leading delimited YAML, including BOM/CRLF input,
is excluded without shifting original offsets. An unterminated block is excluded
through EOF and reported. ID lookup preserves filenames and editable titles;
missing, duplicate or conflicting identities and unsupported selectors fail
locally. Aliases, Zettel heading/block selectors, executable destinations and
embeds are not evaluated. Ordinary Markdown files need not pass a Zettel validator.

Backlinks are exact source occurrences from a fresh cancellable selected-folder
index, including open dirty buffers and externally changed files. Limits are
2,000 notes, 32 MiB total, 4 MiB per note, depth 32 and 20,000 processed entries.
Partial/cancelled/read-error/unresolved-local-link results are identified rather
than reported as a completed empty search. Directory symlinks are not traversed;
file targets must remain within authorized scope. Backlink choices recheck the
source revision and exact syntax before opening.

Ordinary return pins are separate from retained-reader origins. Outside edits
shift an occurrence; overlap blocks return; exact undo restores it. Restart
checks the saved revision rather than guessing a changed location. Failed and
superseded opens preserve the last successful origin. A delayed native editor
completion is repaired to the latest successful destination. Retained MRW links
still use the existing private-store/project resolver, not ordinary-folder scope.
Existing wrapper history records explicit command outcomes/errors, without
indexing activity becoming comprehension evidence or adding a second recorder.

PDFs are passed to an installed matching custom reader through `vscode.openWith`.
No PDF text snapshot is made. With no registered reader, an explicit Open with
system reader action is offered; a failed system handoff preserves the return
pin. Only file-level opening/return is claimed. Optional Obsidian opening still
uses supplied associations; no vault is inferred from a directory name.

The packaged tutorial starts with original documents, follows notes/PDFs,
backlinks and return/reopen, then explains optional retention, annotation, help,
attempts and their actual save/resume owners. It snapshots activation metadata
and matching package content, displays the active version/build, emits a refresh
on every reopen and uses activation-specific virtual URIs. Advanced guide links
are resolved from that virtual document. An installation on disk does not relabel
the old running activation as the new build.

## Checks

- Final complete Node suite: **277/277 passed**, no skips or failures,
  against `5ae3a28bbb492f2c69ad61fe71402bf46748f9dc`.
- Python: **402 run, 335 passed, 67 explicit skips**; exit 0. Production Python
  sources are unchanged from the tested broader batch. Skips are 58 opt-in Qt,
  five unbuilt pinned Lean checker, three opt-in TikZ and one unavailable
  authorized Windows-project fixture. No mathematical-checking result is claimed.
- JavaScript syntax and Python compileall passed, both exit 0.
- Clean pinned `npm ci --ignore-scripts`: 127 packages; package build and VSIX
  verifier passed. All 93 archive entries were checked, with development files
  excluded. The extracted packaged tutorial passed its active-version/build,
  first-use entry, two reopen/refresh and guide-link checks.
- Logs/exit records retained locally under `/tmp/mrw-0200-*`, including
  `node-acceptance.log`, `acceptance-exit.json`, `python.log`, `verify-vsix.log`,
  `packaged-help.json` and `install-verification.json`.

The focused controller route uses disposable external notes with genuine
front-matter conventions: note A → ID/heading in note B → registered PDF reader
→ backlink occurrence → Return → restart/reopen. No Obsidian or import is used.
Fixtures verify original bytes, dirty buffers, cancellation, scope/symlinks,
missing and ambiguous IDs, outside edits/overlap/exact undo, stale restart pins,
failed and late host opens, picker focus changes, stale backlink substitution,
PDF no-reader/failure/cancel paths and tutorial active-build/reopen behavior.
An integration regression uses the real Python retained-reference bridge to
check tree/cursor ordinary navigation alongside an independent retained-reader
origin and an unrelated dirty draft. These are API-facade/filesystem checks,
not observations of a visible VS Code window or mathematical checking.

The initial extension-only run in `/tmp` encountered the existing intentional
volatile-storage rejection in artifact-move fixtures. Those fixtures were run
in the final persistent-filesystem regression copy without weakening storage
qualification. A broader run exposed a rename-fixture teardown race: hosts
under the renamed root were not closed before their history directory was
removed. Teardown now drains every fixture host first. Old assertions requiring rejection after deliberate external-file
selection were updated for the authorized scope behavior; unauthorized active
files and remembered foreign paths still fail before host reads.

## Host observations and limits

Read-only inspection found VS Code 1.144.1 with running WSL server/extension-host
processes and MRW 0.19.2 registered before installation. The Windows UI registry
declares PDF Preview 1.2.2 and LaTeX Workshop 10.20.0 PDF custom editors; the WSL
registry declares none. Installed declarations do not prove which readers the
active remote API enumerates or that a PDF has opened successfully.

No controlled native Extension Development Host interaction was available.
The earlier isolated Code.exe launch failure (exit 255 before the runner) was
not repeated. No window was closed, switched, reloaded, maximized or reconfigured
for this validation. The new command route, visible help and PDF handoff were not
observed in the user's working window. API doubles and read-only process/package
inspection are reported separately from native acceptance.

## Package, installation and preservation

Implementation: `c049c681ad69e3d0fd5e27c30093b0f16bf01862`. Clean package build: `9ffd99a5b8b08e0ac61725f94bb6927f745997c3`.
The later test-only scope assertion correction is `5ae3a28bbb492f2c69ad61fe71402bf46748f9dc`; all packaged
runtime sources match it byte for byte.

Package: `vscode/theorem-terminal-0.20.0.vsix` (535,887 bytes).
SHA-256: `eda39e9282ee3d25f34ca96efadbac0233df2f5c86d965355a42672e57e9194e`.

Installed with the existing WSL `code-server --install-extension … --force`
route. The installed registry selects 0.20.0; its manifest matches after
removing installer metadata. All **88 runtime files** and
all **91 installed package files** match the verified VSIX.
All **82 inventoried genuine study files** retain their starting hashes.
No study was used as a fixture. Existing drafts, documents, sources, private
storage, associations and history were not reset or migrated.

The working window was preserved. No reload was requested or performed by this
delivery. Adoption of 0.20.0 and visible tutorial/PDF behavior in that window
were not observed; the update is available at its next ordinary activation.
The same WSL server and extension-host processes remained running across installation.

## Removed steps and remaining friction

Reading no longer requires importing/copying a note, retaining a source, opening
Obsidian or editing a JSON file. A selected external folder and its navigation
scope survive restart; return restores the originating link occurrence. Help is
versioned and no longer relies on a stale fixed virtual-document identity.

The folder choice is explicit and one folder is indexed at a time. Use Contents
or Follow Document Link for MRW return tracking; native Markdown clicks retain
the host's own navigation semantics. PDF capabilities depend on the installed
reader/system association and do not include page restoration or extraction.
Zettel aliases and block/heading selectors need ordinary Markdown heading links
instead. Research-question resumption and argument reconstruction remain the
next increments, rather than new claims of this delivery.
