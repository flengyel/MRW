# Reading-outline navigator validation — 2026-11-01

Started from clean main and origin/main at the supplied MRW 0.8.0 baseline,
`2885857da79e60c81bc196b86d9958d9c5e84069`. A final fetch confirmed no later
remote commits. No unrelated changes or user work were replaced.
[Usage and format bounds](READING_OUTLINE_WORKFLOW.md).

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

## Boundaries

The local explanatory-benefit report and the user's earlier practical-benefit
report for Zettelkasten navigation remain separate from general usefulness. Automatic
outlines, AI explanations, prerequisites, proof graphs, vertex elimination,
PDF/OCR, whole-corpus import and source comparison remain pending. No new study,
Pi, R3, SagePod, exporter or Euclid campaign was performed. No vault scan,
mount/permission/synchronization change, Windows storage experiment or real-store
move occurred. Windows-backed storage qualification remains deferred.
