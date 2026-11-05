# Reading-outline navigator validation — 2026-11-01

## Theme-following diagrams and preview tabs — 2026-11-04

The user confirms that the rendered overview shows the pullback and requests
theme following there and in reader notes. Patch **0.14.4** shares theme CSS
between the reader and native Markdown previews. Theme is the default; reader
notes also retain explicit Paper/Dark overrides. Changes do not rebuild note
forms, compile diagrams or modify records. The new v2 preference defaults to
Theme instead of retaining the user's old fixed-Dark setting.

Tests cover paired display images, the three choices, missing-dark fallback,
preference persistence and no core work for appearance changes. Return prefers
the native same-tab preview command for saved overviews when available; tests
preserve an unrelated Untitled draft and refuse to reopen it after a focus
change. The current Untitled-1 was not identified as MRW-owned and is left intact.
The 08ZH overview's six source references and mathematical text are unchanged.
Light/dark display images were visually inspected; native theme switching is
pending user confirmation.

All 37 focused command checks and 42 renderer/parser/link checks pass. The
overview stays byte-identical to preserve the saved return pin and all six
source references. Its theme-aware SVG preserves the original paths. The host API double now
honors the documented workspace-state default argument.

A headless Chrome check verifies light and dark rendering from the VS Code
theme classes. A live light-to-dark switch keeps the same image nodes and
unsaved text while changing diagram visibility; Theme remains selected. The
overview SVG receives the embedding image’s color scheme, following the
[CSS media-query rule](https://drafts.csswg.org/mediaqueries-5/#prefers-color-scheme).
The actual VS Code window still needs user confirmation after activation.

The checked 0.14.4 VSIX matches the production manifest and runtime bytes and
has SHA-256
`2a0d376202892e2bd1122a74722572c0e6f019f6a138c0ed5d7138759067ef2f`.
The local extension installer reports success in WSL Debian. Registry and
manifest select 0.14.4; all 65 installed runtime files match. The overview is
byte-identical and its exported SVG matches the browser-tested file. No window
reload was invoked.


## Rendered overview after closing tabs — 2026-11-04

The user's screenshot shows raw Markdown after closing editor/preview tabs,
opening a saved source and using Return. Patch **0.14.3** opens the native
Markdown preview after restoring the checked overview or exact source-link
location. No file is saved or rewritten during Return.

Two new command regressions fail against 0.14.2 and pass with the fix. They cover
repeated reopening after editor/preview closure and previewing the exact duplicate
source-link occurrence while blocking a changed origin. Existing tests also
check the preview target after restart, live untitled drafts and cancellation.
The installed Markdown extension's public preview command implementation was
inspected locally. These are command/bridge and renderer checks; a native-window
confirmation remains pending. No window reload is invoked automatically.

All 33 focused command/bridge checks and 40 renderer/parser/link checks pass,
covering reading choices, drafts, source pins across edits and undo, failed-return
lock release, proof controls and the two new preview regressions.
The checked 0.14.3 VSIX matches the production manifest and runtime bytes,
excludes development files, and has SHA-256
`1b335059f9789d0e116bfc8a281006ad99d7d89a7ce4d42490bb9e64012ba67d`.
VS Code's local extension installer reports successful installation in WSL
Debian. The registry selects 0.14.3 and all 64 installed runtime files match.
The unresponsive window CLI relay was stopped before this local install;
the window and server were not restarted. No reload was invoked.

## 08ZH diagram contrast in Markdown — 2026-11-04

The user's dark preview exposes the transparent SVG's black paths without the
MRW reader's white image background. The overview now links to a separate
`08zh-pullback-paper.svg`, retaining the original SVG and exact TikZ code. The
display export adds a white rectangle, padding and 400-pixel sizing; diagram
paths and links are unchanged. It uses conventional SVG namespaces.

The original export rasterizes as a blank image against black. The corrected
export was rasterized against black and white and visually inspected in both
cases. XML comparison preserves all original child elements and adds only the
background rectangle; the root changes only in namespace serialization and
display dimensions. The Markdown source changes only in its image filename.
No TeX compiler or model call was made. Native-preview confirmation is pending.

## First 08ZH proof outline — 2026-11-04

The user authorized an AI-assisted outline of the retained 08ZH proof. The study
overview now contains four claims with explicit premises, an inverse-image
calculation and the retained pullback diagram at that calculation. The final
claim cites all three previous claims jointly. Codex attribution is recorded in
the study README; the original Stacks passages and reader notes remain intact.

The installed checked core generates and resolves all four cited region
references with unchanged associations. The Markdown navigator parses the
actual document into six headings and six exact reference occurrences. All 31
inline/display math expressions render with the bundled KaTeX in strict mode.
The SVG is byte-identical to the previously retained rendering and was visually
inspected; the TikZ code is copied exactly from its annotation. All 12 retained
payload files remain byte-identical. No compiler, API call, extension release
or window reload was needed. This checks the ordinary Markdown/source-link
workflow; graph extraction and vertex elimination remain planned.

## Return after direct source opening — 2026-11-04

The user reported the missing-origin error after opening a saved source directly
and clicking Return. Patch **0.14.2** reopens the selected overview in this case,
including after restart, or offers a Markdown file choice. It does not fabricate
a source-link origin or change source records. Existing exact origins still
reject changed text and foreign workspaces.

Four new command regressions fail against 0.14.1 and pass with the fix: remembered
overview with an unrelated editor active, live untitled overview with unsaved
edits, file choice/cancellation with continued reader use, and workspace
validation before reads. The error-notification regression uses a changed exact
origin rather than a missing one. These are command/bridge and DOM checks;
the user's subsequent installed-window confirmation is recorded below.

The focused navigation/control run passes 37 checks; the renderer, Markdown
parser and link run passes 40 checks. Their coverage overlaps on local proof
controls. These runs preserve exact-source returns across edits, undo and
restart, failed-return lock release, pending-operation guards, proof visibility,
annotation drafts, overview import and workspace checks. The checked 0.14.2
VSIX has SHA-256
`12c75effe3fbbb8d40640097875d01b01bd5f17bb57a882ed405294cbb40066a`;
its manifest and runtime bytes match the checkout and exclude development files.
VS Code reported successful installation in WSL Debian. The selected extension
registry entry, installed manifest and all 64 runtime files match 0.14.2.
No window reload was invoked by Codex. The user subsequently reports that the
direct saved-source opening followed by Return works in their window.

## Return leaves reader controls usable — 2026-11-04

The user reported that Return to reading outline disabled controls such as
Hide proofs. The shared toolbar sender marked Return busy; a failed return then
waited in the command wrapper for error-notification dismissal, preventing the
reader action from completing. Reader error handling also awaited notifications.

Patch **0.14.1** makes these notifications nonblocking and keeps the reader out
of its busy state for Return navigation. On visibility changes the host sends
idle state only when that reader has no pending requests. Actual pending work,
write blocking and storage freezes retain their guards.

Three regressions fail before the fix and pass afterward: failed Return with an
undismissed error notification, restoring a reader while idle versus during a
pending action, and proof controls/drafts after Return without a completion
message. All 32 view/annotation/Stacks renderer checks pass. Focused command
checks cover pinned navigation, proof preferences, annotation feedback and
deletion failure, overview import and the new regressions. These are DOM and
command/bridge checks; installed-window confirmation remains pending.

The focused command run passes 11 checks, alongside the 32 renderer checks.
The checked 0.14.1 VSIX has SHA-256
`1f2e497e5bb63a1380dea7fc29529db19fecc82a8d7314f1a856b328ea5a352a`.
VS Code reported successful installation in WSL Debian; registry and all 64
installed runtime files match. No window reload was invoked. Dismiss an MRW
error notification holding the old lock, save drafts and finish any open request
before reloading to activate the fix.

## Delete reader annotations — 2026-11-04

Patch **0.13.5** adds **Delete note…** inside Reader notes and Source notes.
The host confirms the selected note and passage; the core checks its scope, UUID
and outline revision before publication. Confirmed publication updates the
reading display and removes only that note’s draft. The target editor is frozen
while confirming and deleting; other text fields remain editable.

The 19 core source-outline checks pass, including new tests for whole-source
and passage notes of all four origins, wrong scopes and missing identities,
stale revisions, repeated deletion, and failed/uncertain publication. The 31
view/annotation/Stacks renderer checks pass, including deletion routing, draft
preservation, cancellation/failure and write-blocked controls. Five focused
command/bridge checks cover confirmed deletion, cancellation, rejection and
uncertain publication alongside source retention, annotation saving and diagrams.
JavaScript syntax and diff whitespace checks pass. Native installed-window
confirmation remains pending.

The checked 0.13.5 VSIX has SHA-256
`8981f565223c72ae686728d6189c73e422b8d3ecaeeabaf945415a4c0cae807f`.
VS Code reported successful installation in WSL Debian; registry and all 64
installed runtime files match. No window reload was invoked.

The user-authorized synthetic 08ZE annotation was removed through the installed
checked bridge. The reopened raw outline equals its prior state with only that
annotation removed; all other retained payload files are byte-identical. The
08ZG and 08ZH study notes remain unchanged, and the 08ZH retained SVG reopens.
The current reader needs Refresh saved source outline to display the new state.

## Research Tools hover descriptions — 2026-11-04

Patch **0.13.4** supplies descriptions for all 53 Research Tools command
identities. The tree sets native plain-text TreeItem tooltips; the disabled
End investigation row retains its description through a separate tooltip key.
Descriptions explain command targets, preparation versus sending, editor saving,
and the difference between opening and moving saved work.

A static coverage check finds a description for every command in the fixed and
contextual row definitions. A temporary smoke script checks 215 tree items across
initial, return-marker, source, request-preview and busy/idle investigation states,
including disabled End investigation. Constructing hover items makes no bridge
calls and preserves command routing. Five existing command checks pass, covering
activation, tutorial opening, source annotation, save feedback and proof
visibility. JavaScript syntax and diff whitespace checks pass. Actual native
hover display remains for user confirmation.

The checked 0.13.4 VSIX has SHA-256
`110ee3fb11692fa5ffd2cffb439303f7a0fbb15c2b5e85a7f66ba854968a87a3`.
VS Code reported successful installation in WSL Debian. Its registry selects
0.13.4 and all 64 installed runtime files match the package. No reload was
invoked; finish or discard the open request before reloading to activate it.

## Alphabetical tools and visible refresh — 2026-11-04

Patch **0.13.3** sorts all Research Tools entries by their displayed labels,
including source, review and return-marker actions. The source reader moves
refresh out of the collapsed Source details and tools section to its visible
reading toolbar. **Refresh saved source outline** also has a Research Tools row
for an open source and a command-palette entry. All routes use the existing
read-only outline load and preserve reader drafts.

The 29 existing view/annotation/Stacks renderer checks pass. Two temporary smoke
checks exercise alphabetical initial and contextual rows, command routing, a
second client saving a note followed by refresh without record changes, visible
toolbar placement, and draft preservation. JavaScript syntax checks pass. These
checks use DOM and command doubles; actual-window acceptance remains pending.

The 0.13.3 VSIX passed source/manifest verification with SHA-256
`d7acaac04019437211727d66bb89eb0488315727f1083ae372a2c4b20edfc59b`.
VS Code reported successful installation in WSL Debian; its registry selects
0.13.3 and all 64 installed runtime files match the package. No window reload
was invoked. Save annotation drafts and reload normally to activate the update.

## Notes beside source passages — 2026-11-04

The user found the retained 08ZG explanation in the combined bottom notes
section, away from its proof. The stored explanation and attribution were intact;
the retained outline and HEAD matched the relocation receipt. No data recovery
or mathematical reconstruction was needed.

Patch 0.13.2 renders saved notes in their source card and whole-source notes near
the heading. Separate native disclosures retain independent live state. Folding
a proof leaves its note disclosure available. Editing forms stay outside the
source sequence; the change does not publish records or alter attribution.

Three placement/preservation tests fail against the prior placement and pass
with the change. They check local association, source-wide scope, exact TeX,
attribution, independent disclosure state, folded-proof access, unsaved editor
text and absence of record-edit messages. Annotation renderer tests retain
math/diagram behavior and explicit render boundaries.

The final focused run passed 29 DOM/renderer tests, five reader command/bridge
cases and 32 Python source-outline/reference/note tests. JavaScript syntax checks
and diff whitespace checks pass. DOM doubles and bridge results do not establish
installed-window acceptance. The 0.13.2 VSIX matches the production manifest and runtime bytes, with
SHA-256 `89928cb668e9a36990d50bd667e1b0472c90b256fd143b5e15ac98f1e17def20`.
All 273 checked documentation links resolve. The retained Hausdorff outline,
including the 08ZG annotation, still matches its pre-move hash. VS Code reported successful installation of 0.13.2 in WSL Debian. Its extension
registry selects 0.13.2 and all 64 installed runtime files match the package.
No reload or workspace switch was invoked. A normal user-triggered reload is
required to activate the update; actual-window confirmation remains pending. The user's correction that proof folding
was present is recorded separately from this requested notes-placement change.

Started from clean main and origin/main at the supplied MRW 0.8.0 baseline,
`2885857da79e60c81bc196b86d9958d9c5e84069`. A final fetch confirmed no later
remote commits. No unrelated changes or user work were replaced.
[Usage and format bounds](READING_OUTLINE_WORKFLOW.md).

## New work and tutorial — 2026-11-04

Extension **0.13.0** addresses the user's request for a visible new-work action
and an introductory tutorial. **New Reading Overview…** uses a native Save
chooser, creates a new Markdown file through the host's WorkspaceEdit and Save
APIs, opens it for editing and selects its navigator. **Open Tutorial** reads
the bundled guide through a read-only content provider in native Markdown
preview. The empty view, title/menu actions and Research Tools expose these
entry points without a workspace switch.

Eight new command regressions cover creation and remembered restart, preserving
other drafts, cancellation, existing-file/type/symlink refusal, failed creation,
failed Save with a retained draft, a stale dialog, exact offline tutorial
content and registered starting/menu actions. These use an API double; host
file-edit and Save behavior, native dialogs and Markdown preview still need
actual-window observation. The tutorial's mathematical-use contribution remains
unassessed. No working window is reloaded, no genuine study store is seeded or
moved, and no provider or compiler request is made.

The final standard checks pass **109 Node tests** and **379 Python tests:
317 passed, 62 skipped**, plus syntax and Python compilation. Skips remain the
58 opt-in Qt checks, three opt-in native diagram checks and the unavailable
authorized Windows-mounted test parent. All 11 changed Markdown files, 272
parsed local links/anchors, version consistency and whitespace checks pass.
Logs are private under `.codex-work/reading-outline-first-steps-20261104/`.

The verified **0.13.0** VSIX has **67 files**, SHA-256
`045559727b49189b0f9f97acaca394838161c9431375741a6139a8424eb097a2`.
It is installed in WSL. All 64 non-manifest installed payload files match the
archive exactly, including the offline tutorial and README; the production
manifest matches after excluding VS Code installation metadata. The installed
isolated bridge answered an artifact-status request against a disposable empty
home. Previous archives are preserved. The new code loads on the user's next
normal reload; this delivery does not reload their working window.

## Reading overview file choice — 2026-11-04

The user reports **Open Reading Outline** demanding an active Markdown editor.
The initial no-overview branch reproduced the exact error in a command regression.
Patch **0.12.1** offers VS Code's native Markdown file picker, remembers its
selected file and adds **Choose Reading Overview…** to the native view menu and
command palette. Missing saved files offer an explicit replacement choice.
A live untitled overview remains usable from another view; closing it preserves
the latest saved-file choice rather than the activation-time snapshot.

Seven new command regressions cover initial file choice, live unsaved edits and
restart reopening, initial/change cancellation, changing the selected file
without changing drafts, untitled use, the latest saved choice, missing-file
replacement, foreign/symlink scope rejection before host content reads, and a
delayed chooser losing to a newer selection. The existing native-menu contract
checks the new command. These checks use API doubles; no provider or Python
bridge is invoked by overview selection.

Final checks in the persistent checkout pass **101 Node tests**, all syntax
checks and **379 Python tests: 317 passed, 62 skipped**. Skips are 58 opt-in Qt
checks, three opt-in native diagram checks and the unavailable authorized
Windows-mounted test parent. Python compilation, seven Markdown files, all 234
parsed local links/anchors, release versions and whitespace checks pass. Initial
temporary-copy storage regressions correctly rejected the sandbox's volatile
`tmpfs`; verification was repeated on the persistent checkout without changing
that guard. Logs are private under `.codex-work/reading-outline-choice-20261104/`.

The verified **0.12.1** VSIX contains **66 files**, SHA-256
`18652a113469444ed5b067df8ef8d77b8946370f7f4c4a5244ce3f5f29e38783`.
It is installed in WSL. All 62 runtime/license files and the packaged README
match exactly; the production manifest matches after excluding VS Code's added
installation metadata. Its installed isolated bridge answered an artifact-status
request against a disposable empty home. The earlier VSIX remains preserved.

The fix does not switch workspaces or reload the window. This delivery performs
no fresh Development Host or visible-dialog check; prior failed launch trials
are not repeated and no working window is closed or reloaded. The updated code
loads on the user's next normal reload. Native-dialog presentation and ordinary
installed-window acceptance remain unobserved. The genuine study store,
annotations and notebook project are not test fixtures. Mathematical usefulness
remains unassessed.

## Reading navigator recheck and return race — 2026-11-03

The repeated navigator request was reviewed from clean `62e8d64`, with MRW
0.11.0 already installed. The supplied 0.8.0 commit remains an ancestor;
subsequent navigator, layout, TikZ and direct-reader AI commits are preserved.
The requested navigator already exists. This delivery is patch **0.11.1** for
one concrete return-location race found during the audit.

If a second reference fails while the overview is edited, the old rollback
compares object identity after edit tracking has replaced the candidate object.
It can retain the failed reference as the origin of a still-open earlier source.
The regression failed with **Second occurrence** selected instead of **First
occurrence**. The fix tracks committed and pending locations independently and
commits a candidate only after source opening succeeds. It also tracks edits
during the reader-opening phase after reference validation. Overlapping edits
still refuse return; exact undo restores it. Source and note formats are unchanged.

Focused cases pass for the failed-follow race, successful opening with outside
edits, overlap refusal and exact undo. Existing parser, command, bridge and
private-store tests cover the rest of the requested workflow:

| Requirement | Existing and renewed evidence |
| --- | --- |
| Headings, native expansion/collapse and visible selection | Markdown/parser and command tests; earlier real TreeView seed/reopen checks |
| Several sources, whole-source and exact-passage links, duplicate occurrences | Real bridge tests and the two-source host overview |
| Unsaved reorganization and undo/redo | Editor command tests and earlier actual-host document/undo observations |
| Save, normal close, reopen, selected location and collapse restoration | Existing actual-host seed/reopen results and current state-reconstruction tests |
| Changed associations, missing originals, unavailable retained bytes and wrong scope | Shared resolver regressions, with exact-range/hash and no-repair assertions |
| Return during asynchronous edits and failed following | New regression and edit-tracking cases |
| No acquisition/provider/compiler/notebook/container on navigation | Explicit bridge-method traces and offline resolver checks |

The fresh disposable overview `reading-outline-check-20261103.md` lives in the
existing Stacks reading workspace. It links the retained Stacks whole source,
its exact 08ZE statement, a second already retained source, and a second
occurrence of the same Stacks passage. A fenced example supplies no navigator
entry. Preparation followed all three references through the installed bridge
and current Linux binding; all **16 record-file hashes** remained unchanged.
No original/private source was added or rewritten, and no import occurred.

Final JavaScript syntax checks and all **89 Node tests pass**, including the
real Python bridge and the new regressions. The shared Python suite ran **379
tests: 317 passed, 62 skipped**, with no failures; compilation also passed.
Skips are 58 opt-in Qt widget checks, three opt-in native diagram checks and one
unavailable authorized Windows-mounted test parent. No Qt installation, Lean
build or unrelated host campaign was required. Logs remain in
`.codex-work/reading-outline-recheck-20261103/`.

Tests, packaging and installed bridge checks ran sequentially. The verified
archive is `vscode/theorem-terminal-0.11.1.vsix`, **66 files**, SHA-256
`3adda92714ed3a4f41f5e934e8553c619c5cbe73a162ab373736608fabc93bfe`.
The current WSL code-server CLI reported successful installation. All **61
installed runtime files**, the production manifest and packaged README match
the archive. Earlier 0.11.0, 0.10.0 and 0.9.4 archives retain their original hashes.
Packaging used Linux Node **24.22.1**, npm **11.13.0**, vsce **4.0.0** and Python
**3.13.5**. Final document checks passed for 12 changed Markdown files, all 256
parsed local links/anchors, release JSON/version consistency and whitespace.
The installed isolated bridge resolved the whole Stacks source, exact retained
08ZE passage and second source. Wrong-workspace and unavailable-target requests
were refused without replacements. All 16 retained record files and the new
overview retained their exact bytes. See the
[sanitized delivery record](evidence/reading-outline-recheck-20261103/validation.json).

One ordinary installed-window attempt used Windows VS Code **1.144.1**, commit
`261c84cb1eddf11235f9e2c921425e9663fbe556`, connected to WSL Debian. It stopped
at launch: **A new ordinary window for the disposable overview was not
identified; no input sent**. Windows also emitted
`crashpad/util/win/registration_protocol_win.cc:108: CreateFile: The system cannot find the file specified. (0x2)`.
This records the observed failure; it does not establish its cause. No keyboard
or mouse input was sent, no working window was closed/reloaded, and no retry
loop was undertaken.

The earlier user-led ordinary installed reader opening remains established
below; development-host seed/reopen evidence remains separate. Still unobserved
in this current installed window are the new two-source overview's heading and
collapse actions, whole/exact/duplicate navigation and occurrence-specific
Return, unsaved reorganization with undo/redo, and normal saved close/reopen.
Automated and earlier actual development-host results do not establish this
fresh installed-window observation. No AI, graph or storage increment is included.

## Implementation and review

MRW 0.9.0 adds a native Explorer tree, derived from one selected live Markdown
document, with heading/reference occurrences, collapse preferences, explicit
heading selections, retained-source following and exact return pins. The same
scoped Python resolver and existing reader perform source navigation. No shared
Python service, reference grammar, mathematical record schema, importer,
provider boundary or storage configuration changed.

Review covered command arguments/stale entries, workspace/canonical-path checks,
unsaved-document ownership, reference identity, duplicate occurrences, edit/undo
tracking, restart hashes, bounded parser input and display, and packaging.
No unresolved production defect was found in the covered paths. The parser is
bundled markdown-it 14.1.0 (CommonMark), pinned with its license and exact-byte
notice; it parses data without rendering, plugins or URI dispatch. No downloaded
code is executed. Long labels are bounded, and documents are limited to 4 MiB
and 10,000 heading/reference entries. Custom Markdown/Obsidian syntax is outside
this parser's scope. Return tracking deliberately refuses overlapping edits;
only exact restoration of the captured text recovers an invalid live pin.

## Automated checks

- All **58 Node tests passed**, including the actual bundled Python bridge,
  command workflows and new navigator tests. The final pass ran before packaging;
  installed bridge checks ran afterward, sequentially.
- Python suite: **362 tests run, 303 passed, 59 skipped**, no failures. The skips
  are 58 opt-in Qt widget tests and the unavailable authorized Windows-mounted
  test parent. No Qt installation or new Qt acceptance claim was required.
- JavaScript syntax checks, Python compilation and `git diff --check` passed.
- Parser tests cover Unicode/CRLF, escaped labels, repeated headings and links,
  fenced/indented/inline code, comments/images, Setext headings, lists, quoted
  multiline links, reference definitions and autolinks. Command tests cover two
  sources, unsaved edits, stale clicks, tracked/invalid return pins, reconstruction
  of saved state and wrong-workspace refusal before bridge navigation.
- Existing shared regressions cover changed associations, absent originals,
  missing outlines/stores/blobs, corrupt retained bytes, strict scope/revision/
  range validation and no repair or replacement on failure.

Logs are retained in `.codex-work/reading-outline-20261101/`. No live provider
request or new Lean build was used. Existing conditional documentary-checker
regressions in the Python suite retain their own scope.

## Actual Windows/WSL Development Host

Windows VS Code **1.143.1**, WSL Debian, Linux extension host, Python **3.13.5**.
The normal Development Host used the existing retained Stacks reading workspace:
`.codex-work/stacks-import-20261021/reading-workspace`. It used the valid default
Linux store, with no move or adoption. The new disposable
`reading-navigation-validation.md` links **Hausdorff spaces** and one synthetic
source. Stacks outline UUID `22f61967-81f4-5c76-9a27-2325845e773e`, exact source
SHA-256 `c6bac8dcf8ad96dc47416bf34cb45ba4a10b894e40d67d3e1fa68d8ef0d9f872`,
and its saved annotations remained unchanged. Existing useful retained material
and the earlier reading-workspace README were preserved.

The [host driver](../vscode/test/host/reading.js) scripts dialogs and commands;
real VS Code documents, undo/redo, TreeView, webviews, Python bridge and
persistence execute production code. Its staged extension changes only the entry
point/startup event and adds the driver; production runtime bytes match checkout.
The first setup attempt encountered a document-focus race during insertion and
was not counted as acceptance. One corrected setup used unrelated extensions
disabled. A later guarded foreground request was refused, but the real-host
script completed successfully without that input.

[Seed results](evidence/reading-outline-20261101/host-seed.json) establish:

1. Existing insertion into ordinary Markdown, with undo/redo and no automatic
   save. The unsaved navigator contains eight heading/reference entries; code
   examples supply no entries.
2. Actual TreeView expansion/collapse and persisted collapse preferences.
   Heading selection visibly selects the exact Markdown line.
3. Whole-source references open the retained reader. Two occurrences of the
   same Stacks passage each open its exact text and return to their own offsets.
4. Reorganization and undo/redo refresh the live unsaved tree. Return follows an
   outside edit, rejects an overlapping edit, and works again after exact undo.
5. A changed region association and missing synthetic original open the earlier
   pinned passage, reporting the change and selecting no replacement region.
6. Unavailable target and unrelated-scope links fail explicitly. Ordinary note
   text remains unchanged after undoing disposable error cases.
7. Explicit save and normal close retain note and navigation preferences.

[Normal reopen results](evidence/reading-outline-20261101/host-reopen.json)
confirm reconstruction, saved selection, collapse state and the exact retained
Stacks passage. Bridge traces contain only status and retained-reader methods,
no import or acquisition. The test closes only its isolated window. No user
working windows or notes were closed or rewritten.

These are scripted host mechanics, not independent human mathematical use or
an installed-window click observation. Prepare with
`python3 vscode/scripts/prepare-reading-host.py --phase seed` or `--phase reopen`
only in the retained validation arrangement described by that script; it refuses
to create a replacement Stacks workspace. Generated artifacts remain outside Git.

## VSIX, installed bundle and remaining desktop observation

Delivered **flengyel.theorem-terminal 0.9.0**, production entry
`./src/extension.js`, workspace extension host. Package:
`vscode/theorem-terminal-0.9.0.vsix`, **62 files**, SHA-256
`be1a285a48184e3f458e4ceeaf93bae2f5ebc40bac89513034b3f4e8fe174197`.
The established prepublish/core-bundle/vsce path completed, followed by exact
manifest/runtime verification, including both bundled parser/renderer licenses
and hashes. Final review added the parser distribution’s transitive library
license notices; only license/notice files changed after the completed tests,
then the package was rebuilt, verified and reinstalled. Tests, drivers, caches
and node_modules are excluded. Earlier VSIX
packages remain; 0.8.0 SHA-256 is still
`f0ade3a00c8a203136b074347d52b79832dbddcbb8df5165e92a26594e0cdbb4`.

The WSL code-server CLI reported successful installation. All **57 installed
runtime files** and the production manifest match the verified archive; see
[installed package](evidence/reading-outline-20261101/installed-package.json).
The [installed bundled bridge](evidence/reading-outline-20261101/installed-bridge.json)
opened 08ZE at zero-based host positions **121:0–128:11** (source scalar lines
122:0–129:11), verified the full retained source hash, and left the overview and
all outline-store bytes unchanged. The first sandboxed check could not obtain
its required host-local coordination lock; the authorized unsandboxed check
acquired it normally. A test-only assumption about the source's opening TeX
command was corrected to an exact source-hash assertion. Neither was a product
storage failure or a reason to weaken checks.

A fresh **ordinary installed** Windows/WSL window opened the same reading
workspace, without a development-extension flag. Its one guarded workflow
attempt stopped before sending input: **“Ordinary installed reading window did
not acquire foreground; no input sent.”** See
[the desktop result](evidence/reading-outline-20261101/installed-window.json).
No extended retry campaign followed.

**At initial delivery, the remaining installed-window observation was:** run **Open Reading Outline** on the
disposable overview, select its whole-source and exact-passage entries, observe
the ordinary installed retained reader, and use **Return to Reading Outline** to
confirm the originating occurrence. Ordinary-window reader opening from 0.8.0
was unobserved at that point; the follow-up below records the later ordinary
reader opening and its presentation blocker.

## Reading presentation follow-up — 2026-11-01

The user explicitly requested further attempts and helped coordinate focus.
The first coordinated retry still stopped before input. A passive diagnostic
subsequently found the WSL-Debian terminal foreground, rather than the reading
window; this suggests a launch/focus interaction without proving its cause.
See [retry](evidence/reading-outline-20261101/installed-window-retry.json) and
[passive diagnostic](evidence/reading-outline-20261101/foreground-diagnostic.json).
A driver started before the next Ready signal did observe the intended window
foreground. It sent the command-palette shortcut, then stopped before command
text because its accessibility probe did not identify the palette. See
[coordinated result](evidence/reading-outline-20261101/installed-window-coordinated.json).
The title-bar workspace name also opened a menu when clicked; the earlier focus
instructions were ambiguous. Editor-area focus and native F1 were clearer.

The user then performed ordinary **installed 0.9.0** actions manually:
**Open Reading Outline** displayed headings/references; its first whole-source
link opened **Outline: Hausdorff spaces**. A passive
[actual-window capture](evidence/reading-outline-20261101/installed-reader-whole.png)
independently confirms that reader and its whole-source reference. Clicking
**08ZE · statement** displayed the equivalence statement, as reported by the user.
Thus the earlier ordinary-window reader-opening observation is now established.
The [manual record](evidence/reading-outline-20261101/installed-manual-followup.json)
keeps those observations separate from the uncompleted exact-link/Return steps.
No mathematical study or correctness claim follows from these observations.

This trial exposed an actual usability blocker. Long Markdown citations dominated
the middle editor while controls and metadata crowded mathematics into a narrow
right pane. The user could not recognize the intended reading destination and
reported that mathematics occupied only a postage-stamp-sized area. Further
manual test instructions were stopped; the blocker took priority over completing
a checklist.

Patch **0.9.1** implements the bounded repair:

- Navigator labels use the short citation title; the original citation stays in
  the tooltip and Markdown without rewriting note bytes.
- Following a navigator reference uses VS Code's standard **Maximize Editor Group
  and Hide Side Bars** command. Return expands the originating Markdown editor
  and shows the navigator. Existing documents remain open.
- Source content precedes passage controls. Metadata, section contents,
  bibliographic editing and source controls start under **Source details and
  tools**. A sticky Return button stays available while scrolling.
- An unchanged, expanded published region with an exact matching retained span
  opens at its rendered card. Exact TeX remains explicitly available. A changed,
  removed, edited or collapsed current association retains the original pinned
  text fallback and cannot select a replacement region.

All **61 Node tests passed**, including new DOM/command checks for collapsed
source tools, source-before-controls ordering, concise labels, one-time card
focus, expanded-reader commands, Return and old-range fallback. Python again
ran **362 tests: 303 passed, 59 expected skips**. Syntax, compilation and diff
checks passed. Python services, acquisition, transport, schema and storage are
unchanged. Packaging follows these bridge tests sequentially. The native layout
commands were also checked in the
[VS Code 1.85 source](https://github.com/microsoft/vscode/blob/1.85.0/src/vs/workbench/browser/parts/editor/editorActions.ts#L937);
that API check does not establish a visual host result.

The patch's fresh actual-host presentation check remains unavailable: VS Code
1.144.0 restored the disposable Development Host without a workspace folder.
The overview was correctly refused; attempts to open the driver's fixed test
folder did not establish that workspace. Setup was stopped. See the
[scoped blocked result](evidence/reading-outline-20261101/host-presentation-blocked.json).
The new reader layout and exact rendered-link/Return path must not be described
as visually accepted from the automated checks. The earlier 0.9.0 user
observations remain valid and are the evidence for the repair.

The 0.9.1 VSIX was built and verified after the completed bridge tests:
`vscode/theorem-terminal-0.9.1.vsix`, 62 files, SHA-256
`b1446a3091881c200a1ca7723411523c38ef37c656ddbe01651324e7650b5e61`.
The 0.9.0 package and earlier packages remain unchanged. The [installed manifest and all 57 runtime files](evidence/reading-outline-20261101/installed-package-patch.json)
match that archive. The [installed bridge](evidence/reading-outline-20261101/installed-bridge-patch.json)
opened the original exact passage and preserved all note/store bytes; these checks
are separate from visual acceptance. The already-open 0.9.0 window
requires an explicit **Developer: Reload Window** to load the update. Only the
isolated test Development Host was closed; user working windows were preserved.


## Proof visibility follow-up — 2026-11-01

The user reports that the ordinary installed **0.9.1** reading layout is
improved. They then found the proof and identified the obstruction precisely:
**Add reader explanation / question / repair**. Opening that editor put an
administrative form between the statement and proof, pushing the proof away.
The [user report](evidence/reading-outline-20261101/proof-visibility-report.json)
establishes an observed reading problem, not absent retained source or a
mathematical verification result.

Patch **0.9.2** moves all region annotation forms, evidence controls, linked-note
actions and settings into **Source details and tools → Notes and tools: REGION**.
Context editing controls are there too. Source cards remain consecutive without
editing forms between them. Existing reader notes appear separately after the
source text, retaining attribution; their records and explicit Save boundary are unchanged.

A published statement has a direct **Proof ↓** link; the proof has **Statement ↑**.
The links use only explicit published roles and a shared tag from the same retained
import, with exact matching source spans. Multiple published proofs remain
separate. Changed or unrelated associations are not used as replacement targets.
Opening a collapsed matching proof reveals it only for this live view, without
publishing a changed outline. Manual sources retain manual region navigation;
there is no automatic proof discovery, inferred dependency or checking status.

The user also reported that **Save annotation** provided no feedback. Saves now
show **Saving annotation…**, **Annotation saved.**, or **Save not confirmed**
beside the editor, with a host status-bar message only after confirmed core
publication. Open editors remain open; newer typing survives a reply with an
explicit unsaved warning. A failed or uncertain save retains the text and the
existing write block, without a success message or retry.

The requested dedicated **MRW** Activity Bar book icon contains Reading Outline
and collapsible Research Tools. Stable view IDs retain existing host navigation
state. The native view-title **…** menu exposes Open Reading Outline, refresh,
insertion, saved sources and the existing explicit source commands. An empty
navigator shows its welcome button. Opening the container starts no bridge.
This follows the [official Tree View contribution model](https://code.visualstudio.com/api/extension-guides/tree-view);
the manifest/API check is separate from a visible installed-window observation.

All **68 Node tests passed**. New DOM tests cover source/form separation,
attributed note placement, direct statement/proof links, multiple proofs,
changed spans and temporary expansion without any record mutation or edit
request, plus pending/success/failure save feedback, newer edits and open editors.
Command tests exercise the actual bundled core's confirmed and rejected saves;
the container/menu integration test checks registrations and no startup bridge.
Python again ran **362 tests: 303 passed, 59 expected skips**.
JavaScript syntax, Python compilation and documentation/diff checks passed.
Packaging follows bridge tests sequentially. Services, transport, importer,
reference grammar and artifact-store configuration remain unchanged.

The new 0.9.2 visual layout has not been independently observed. The known
Development Host workspace setup barrier was not retried. The user's positive
0.9.1 layout feedback is recorded as such, separately from the pending 0.9.2
visual observation. No new exercise, study gate,
provider, acquisition, compiler, notebook, container, Pi or storage campaign was
introduced.

The final **0.9.2** package was built after all command/bridge tests completed,
then verified and installed through the existing WSL code-server workflow:
`vscode/theorem-terminal-0.9.2.vsix`, **63 files**, SHA-256
`f69c7d528629ea8ca1cde418c2c440c59b236c64a1e606de0a52dc8a020834bb`.
The [installed manifest and all 58 runtime files](evidence/reading-outline-20261101/installed-package-proof.json)
match the verified archive, including the new icon. The
[installed read-only bridge check](evidence/reading-outline-20261101/installed-bridge-proof.json)
opened the original exact retained 08ZE passage and preserved all overview and
outline-store bytes, including the new genuine annotation described below.
Earlier packages remain, and the preliminary 0.9.2 package from before the
save-feedback/icon changes was preserved separately in the ignored work folder.
The already-open window requires **Developer: Reload Window** after saving or
copying any unsaved reader-form text. No user window was forcibly reloaded or
closed. These package/bridge results do not establish visible acceptance of the
new icon, menus, proof links or save feedback.

## User-reported explanatory benefit

During this ordinary reading, the user recognized the equation in **08ZG** as a
diagonal preimage and reported that MRW was doing what it should. See the
[scoped report](evidence/reading-outline-20261101/reading-use-report.json).
The requested explanation was saved on the retained **08ZG — Proof**, with
**Codex / AI proposal** attribution, separately from the published source.
The user explicitly approved that authorship correction. The save used the
existing core mutation/publication path and was confirmed by a subsequent load;
source/support bytes, ordinary overview bytes and earlier annotations were
preserved. The private annotation text is not committed. This workspace/store
now contains genuine study work; old synthetic-test baseline hashes must not be
used to reset it or rerun seed mutations.

This is user-reported explanatory benefit for one passage. No formal checker
ran on the explanation, no model API request was made, and no broad claim of
proof correctness, comprehension or measured productivity follows from it.

## Annotation mathematics — 2026-11-01

Started clean at `ddab6489a28bf91914b9b106302647d55c66f587`. The user reports
that the installed **0.9.2 MRW icon** is visible and likes it. That observation
supersedes the earlier pending icon check; it does not establish the new 0.9.3
math/proof-controls appearance. They pointed out that the saved explanation used
Unicode, then requested hidden/expanded proofs for top-down reading. They
clarified that vertex elimination informs the deductive model when a reader
supplies or develops an outline. The
[scoped report](evidence/reading-outline-20261101/annotation-math.json) separates
these observations and design requests.

Patch **0.9.3** adds local equation rendering for overview and passage
annotations, preserving exact editable text, attribution and Save behavior.
It uses the existing pinned KaTeX **0.19.0** and that version's bundled MIT
auto-render helper, with exact hash/license checks. Only explicit `\( ... \)`,
`\[ ... \]` and `$$ ... $$` delimiters render. Single dollars, Unicode, HTML,
Markdown links and URLs remain literal prose. Exact annotation text remains
available, and invalid math retains its text with a visible warning. Output is
restricted native MathML, with fresh macro state per expression, bounded
expansion/size and untrusted mode. See the official
[delimiter API](https://katex.org/docs/autorender.html) and
[rendering options](https://katex.org/docs/options.html); the bundled version
and tests govern this implementation.

The published-source reading toolbar has **Hide proofs / Show proofs**, with
individual **Show proof / Hide proof** controls. Statements stay visible. A
Boolean workspace UI preference restores initial visibility, while individual
choices remain live view state. An exact proof destination reveals that proof.
Published-proof hiding invokes no Python service or record publication, and
preserves annotation drafts. Manual regions retain their existing saved
expansion action, now with visible detail controls. This is progressive
disclosure toward the reader's outline; explicit inference graphs and vertex
elimination are still pending.

One guarded core edit changed only the requested **Codex / AI proposal**
annotation on **08ZG — Proof** to equivalent TeX notation. A subsequent load
confirmed the same annotation ID and attribution. All **23 expressions**
rendered to restricted MathML. All other outline fields/annotations, immutable
source/support blobs and ordinary overview bytes were unchanged. The earlier
annotation is preserved privately, and neither version's body is committed.
The writer refuses a changed annotation or a repeated run.

Focused checks cover actual bundled delimiter parsing and KaTeX output, inline
and display math, literal Unicode/currency/HTML/links, malformed notation,
isolated macros, exact editor text, fallback and the nonce policy. DOM/command
checks cover hidden proofs with visible statements, chosen-proof expansion,
exact focus, draft preservation, no record mutation and host-local preference
restoration on reopening. Actual 0.9.3 layout observation remains unperformed;
the known desktop-automation barrier was not retried. No provider request,
source acquisition, compiler, notebook, container or storage trial was added.

All **77 Node tests passed**, including command/bridge tests before packaging.
The Python suite ran **362 tests: 303 passed, 59 expected skips**; no shared
Python code changed afterward. JavaScript syntax, Python compilation,
documentation targets and diff checks passed. Packaging and bridge checks ran
sequentially. The first focused fallback test incorrectly tried to delete a
nonconfigurable VM global; assigning it undefined exercised the intended
missing-renderer path. This was a test setup correction.

The verified **0.9.3** package contains **65 files**, SHA-256
`c9e3d2cd74b30e5646bda70e239b50f6c846f02af50b202404ffd42a3738396e`.
Installation through the established WSL code-server CLI succeeded; the
[manifest and all 60 installed runtime files](evidence/reading-outline-20261101/installed-package-math.json)
match the archive. The [installed bridge check](evidence/reading-outline-20261101/installed-bridge-math.json)
opened the original exact retained passage and rendered the saved annotation's
23 equations to MathML, with all note/store bytes unchanged. Earlier packages
remain preserved. An open window loads this update with **Developer: Reload
Window** after saving or copying unsaved reader-form text; no user window was
forcibly reloaded or closed. Visible acceptance of these new controls remains
unobserved and separate from those installed-byte/bridge results.

## Compact hidden details — 2026-11-01

Started clean at `ff1b08324cb854b6dc1c98fe4bf81f410854dfce`. The user explicitly
requested a screenshot of the excessive space occupied by hidden proofs, then
reported that Reader notes could not be closed. A single passive PrintWindow
capture of the existing normal Windows/WSL reader succeeded without changing
focus or sending keyboard/mouse input. It confirms the installed 0.9.3 controls,
hidden proof display and typeset annotation mathematics. Thus the earlier
pending observation of those features is now established, alongside a newly
observed layout problem. The capture is kept privately in
`.codex-work/reading-outline-20261101/hidden-proofs-20261101.png`; it contains
genuine annotation text and is not published. See the
[sanitized report](evidence/reading-outline-20261101/compact-details.json).

The hidden proof still occupied a large card with a heading, hidden-status
paragraph, Show proof button and Statement return link. Reader notes consumed
the remaining space without a closing control. Patch **0.9.4** replaces hidden
published proof cards with a single compact reveal row, retaining their title
and exact destination. Saved **Reader notes (N)** now uses a native disclosure,
initially closed. The live choice survives refresh/save replies. Opening or
closing it changes no saved note or separate editing draft; the source reading
sequence and attribution stay intact.

Focused reader checks pass for one-control hidden proofs, exact expansion,
visible statements, note open/close across refresh, attribution, raw text and
absence of record-mutation requests. The new 0.9.4 layout has not been observed
in the installed window. The screenshot establishes the preceding defect and
0.9.3 rendering, rather than visual acceptance of this repair. No additional
desktop input/retry, private annotation edit, network acquisition, provider,
compiler, notebook, container or storage campaign was introduced.

All **77 Node tests passed**, including the actual bundled bridge and updated
reader regressions. Python ran **362 tests: 303 passed, 59 expected skips**.
Syntax, compilation, document targets and diff checks pass. Packaging follows
these completed command/bridge tests sequentially.

The verified **0.9.4** VSIX contains **65 files**, SHA-256
`cee62ec8ec49cd4381b3031e36489d9f05f767a6946a3d6df1b19901754fa5fb`.
It installed through the existing WSL code-server workflow. The
[manifest and all 60 installed runtime files](evidence/reading-outline-20261101/installed-package-compact.json)
match the archive, and the [installed read-only bridge](evidence/reading-outline-20261101/installed-bridge-compact.json)
opened the original exact passage and rendered the saved explanation with all
overview/store bytes unchanged. Earlier packages remain. A current window loads
the update through **Developer: Reload Window** after saving or copying any
unsaved annotation draft; no user window was forcibly reloaded or closed.

## Boundaries

The local explanatory-benefit report and the user's earlier practical-benefit
report for Zettelkasten navigation remain separate from general usefulness. Automatic
outlines, AI explanations, prerequisites, proof graphs, vertex elimination,
PDF/OCR, whole-corpus import and source comparison remain pending. No new study,
Pi, R3, SagePod, exporter or Euclid campaign was performed. No vault scan,
mount/permission/synchronization change, Windows storage experiment or real-store
move occurred. Windows-backed storage qualification remains deferred.
