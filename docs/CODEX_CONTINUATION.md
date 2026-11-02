# Codex continuation: MRW source work and companion notes

## Explicit TikZ diagrams and appearance — 2026-11-02

Started clean at **0.9.4**, `a400589`. The user reports that layout is
“Considerably improved” and requested TikZ after reviewing Obsidian TikZJax and
VS Code preview options. They agreed to explicit rendering with retained output.
Extension **0.10.0** adds **Render diagram** to saved annotation `tikz` fences,
then reads the retained SVG on reopening. This first renderer uses installed
Linux/WSL pdfLaTeX and Poppler inside bubblewrap; TikZJax is not bundled. Ordinary
reading still needs only the existing Python host, without rendering tools.
[Workflow](TIKZ_WORKFLOW.md), [validation](TIKZ_VALIDATION.md).

Exact editable prose/code and attribution stay in the existing annotation.
The separate diagram index pins annotation UUID/code SHA-256 to immutable SVG
blobs, render time, renderer and compiler/converter fingerprints. It uses the
existing mutable/immutable publication and artifact-epoch rules, and participates
in supported moves. Missing/corrupt retained storage never initializes a
replacement. Changed code never receives an earlier image as its own. Explicit
rerender failures preserve prior output; uncertain publication blocks writes.

Only Render starts tools. Save, open, refresh, restore, appearance and relocation
do not compile. Native jobs have isolated filesystem/network, cleared environment,
no shell escape, process/output limits and no unrestricted fallback. The SVG
profile excludes active/external resources; output is displayed only as an image.
One-page blocks, 2 MiB SVGs, 128 cache targets and an 8 MiB base-image view budget
are bounded. Rendering creates no verification or inference graph.

One normal Windows VS Code **1.144.0 / WSL Debian** Development Host workflow
saved/rendered a synthetic commutative diagram, preserved a newer unsaved draft
during compilation, decoded its SVG without a CSP violation and normally
closed/reopened it with no compiler request. The user clicked through to open
the workspace, later clicked **Render diagram again** and reported **“Nice.”**
The trial workspace is `.codex-work/tikz-20261102/mrw-tikz-validation`.
The annotation is explicitly synthetic, but preserve this workspace now that the
user is interacting with it; do not reset it, rerun seed mutations, force-close
its window or discard unexamined drafts. The genuine Stacks workspace and its
Codex explanation were never modified. A disposable Linux move regression
initially exposed the missing index inventory entry; it passes after the fix.

The user's later request for white-on-dark and colors adds **Diagram appearance
→ Paper / Dark**. It adapts monochrome values in a derived display copy, retains
the original SVG and other colors, and saves only a workspace UI preference.
Native red/blue checks and DOM/command preference tests pass; the selector's
visible appearance remains unobserved in the actual window. No engine runs on
appearance changes. The staged test extension may be updated atomically without
rewriting the source or forcing a reload; its reopen driver is read-only.

Keep Windows storage qualification, Pi/R3/SagePod/exporter campaigns, automatic
ingestion, inference graphs and vertex elimination deferred. The user-reported
diagram reaction is a scoped UX observation, not a proof or usefulness study.

Final checks pass: **81 Node tests** and **376 Python tests (317 passed, 59
expected skips)**, with actual native diagram tests enabled. Syntax, compilation
and diff/document checks pass. Packaging follows completed command/bridge tests
sequentially. Do not repeat the complete regression campaign without a new
relevant change or unresolved concern.

The final **0.10.0** VSIX is installed: **66 package files**, all **61 installed
runtime files** matching, SHA-256
`1ba44124d4755caca7516c26d9339a4fde784058943874c48010082fa1c43792`.
An installed native-bridge fixture saved/rendered a colored diagram, obtained
Paper/Dark images, preserved annotation bytes and reopened without its original
or a new compiler request. A separate read-only check preserved every genuine
Stacks store and overview byte. Earlier packages remain. The trial runtime was
updated atomically; do not force-reload/close it. Save or copy unsaved reader
drafts before **Developer: Reload Window**, then use **Diagram appearance →
Dark** beside the rendered figure. The native prerequisites apply only to the
explicit Render action; the final selector's visible appearance remains pending.

## Compact proofs and closable Reader notes — 2026-11-01

Started clean at `ff1b08324cb854b6dc1c98fe4bf81f410854dfce`. The user requested
a screenshot because hidden proofs still occupied excessive space, then reported
that Reader notes could not be closed. One passive Windows PrintWindow capture
of the existing normal WSL reading window succeeded without focus changes or
input. It confirms the 0.9.3 reading controls and typeset annotation mathematics,
but also a tall, mostly empty hidden-proof card and always-expanded Reader notes.
The image contains genuine private annotation text and stays in the ignored work
folder, not Git. See [the scoped follow-up](READING_OUTLINE_VALIDATION.md#compact-hidden-details--2026-11-01).

Patch **0.9.4** renders a hidden published proof as a single compact reveal row
with its retained title. It removes the empty card's heading, status paragraph,
large button spacing and redundant return link. Revealing it retains exact source
navigation. Saved **Reader notes (N)** now uses a native disclosure, initially
closed; the live open/closed choice survives refresh/save replies through the
existing disclosure-state mechanism. Closing it changes no text, attribution,
record or separate annotation-editor draft. The repair changes no shared core,
storage, reference format, mathematical status or acquisition boundary.

Do not publish the screenshot, rerun the private annotation writer, reset the
genuine reading store, force-reload user windows or start another desktop retry
campaign. The new 0.9.4 layout has not yet been observed in the installed window;
the screenshot is evidence of the preceding problem, not acceptance of the fix.
Broader inference graphs, vertex elimination and Windows storage qualification
remain deferred.

All **77 Node tests** pass, including updated hidden-proof and Reader notes
open/close regression checks. Python ran **362 tests (303 passed, 59 expected
skips)**. Syntax, compilation, document and diff checks pass; packaging follows
completed command/bridge tests sequentially.

The verified **0.9.4** VSIX is installed: 65 package files, all 60 installed
runtime files matching, SHA-256
`cee62ec8ec49cd4381b3031e36489d9f05f767a6946a3d6df1b19901754fa5fb`.
The installed read-only bridge opened the original exact passage and rendered
the saved explanation, preserving all overview/store bytes. Earlier packages
remain. Load the update with **Developer: Reload Window** after saving or copying
unsaved reader-form text; no window was forcibly reloaded. New layout acceptance
remains unobserved.

## Typeset annotations and proof visibility — 2026-11-01

Started clean at `ddab6489a28bf91914b9b106302647d55c66f587`. The user confirms
the installed MRW icon is visible and likes it. They identified plain Unicode
in the explanation as a presentation limitation, then requested easily hidden
proofs in the top-down reading pattern. They clarified that vertex elimination
is the deductive organizing model when a reader supplies or works toward an
outline. Preserve that direction in `docs/PROOF_OUTLINES.md`; it does not turn
current navigation links into inferred premises or implemented graph elimination.

Patch **0.9.3** renders explicitly delimited annotation equations with bundled
KaTeX 0.19.0 and its pinned auto-render helper. Support `\( ... \)` inline and
`\[ ... \]` / `$$ ... $$` display math; single dollar signs remain prose.
Annotations retain exact editable text and attribution. HTML/URLs stay literal,
macros are isolated per expression, and errors keep the original TeX with a
visible message. Overview annotations also have a separate reading display.
No schema, resolver, reference, core publication or acquisition change is added.

The sticky reading toolbar has **Hide proofs / Show proofs** and published
proof cards have individual controls. Statements remain visible. A Boolean
workspace UI preference controls initial visibility across reopening; individual
choices last in the live view. Direct proof navigation reveals its exact target.
Published-proof controls preserve records and unsaved drafts. Manual regions
gain visible detail controls using their existing saved expansion action when
the collapsed text needs loading.

The specific Codex explanation on **08ZG — Proof** was changed to equivalent
TeX notation by one guarded core edit, with the same annotation ID and attribution.
All **23 equations** rendered to restricted MathML; the earlier text was saved
privately first. All other outline fields/annotations, source/support blobs and
ordinary overview bytes were verified unchanged. Preserve this genuine study
work and do not rerun the guarded writer or old seed fixtures. No annotation body
is committed. See [the validation follow-up](READING_OUTLINE_VALIDATION.md#annotation-mathematics--2026-11-01).

The new math/proof-controls visual observation is pending. Keep the confirmed
0.9.2 icon report separate. Do not restart the known desktop-automation retry
campaign or demand another Ready/study sequence. Broader inference graphs and
vertex elimination remain planned; Windows-backed storage qualification stays
deferred.

All **77 Node tests** pass. Python ran **362 tests (303 passed, 59 expected
skips)**, with no later shared-service changes. Syntax, compilation and document
checks pass; packaging follows completed command/bridge tests sequentially.

The verified **0.9.3** VSIX is installed: **65 package files**, all **60 installed
runtime files** matching, SHA-256
`c9e3d2cd74b30e5646bda70e239b50f6c846f02af50b202404ffd42a3738396e`.
The installed read-only bridge opened the exact retained passage and rendered
all 23 saved annotation equations, preserving overview/store bytes. Earlier
packages remain. The current window loads it with **Developer: Reload Window**
after saving or copying unsaved reader-form text. Use **Hide proofs**, then
**Proof ↓ / Show proof** to choose detail. Do not force a reload or repeat the
private annotation writer. The new layout still needs a visible observation.

## MRW entry point, proof visibility and save feedback — 2026-11-01

Started clean at `9ee11b4bfa98be09e34e02783cabe0d1c710ca2c`. The user confirms
the ordinary installed 0.9.1 layout is improved. They then found the proof, but
reported that the **Add reader explanation / question / repair** form hid it.
The proof was retained; the problem was a form inserted into the source reading
sequence. See the [specific report and repair](READING_OUTLINE_VALIDATION.md#proof-visibility-follow-up--2026-11-01).

Patch **0.9.2** moves region annotation/evidence/settings/link forms into
**Source details and tools → Notes and tools: REGION**. Retained source cards
remain consecutive. Existing reader notes are displayed separately after source
text with attribution; their stored text and explicit edit/Save boundary are unchanged.
Published statements have **Proof ↓**, and proofs have **Statement ↑**, based
only on explicit part roles/tag in the same retained import and exact span
matches. Multiple proofs remain distinct. Changed associations cannot acquire
a replacement target. Opening a collapsed matching proof temporarily expands
its live view without changing saved records. No proof pairing is inferred for
manual sources; no proof graph or checking status is created.

The user also requested a discoverable Activity Bar entry and reported missing
Save feedback. The dedicated **MRW** book icon opens Reading Outline and a
collapsible Research Tools view. Its native **…** menu includes Open Reading
Outline, Open Saved Source Outline and existing explicit source commands. View
IDs and host customizations remain stable; opening the sidebar starts no bridge.
The empty navigator has a labelled Open Reading Outline welcome button.
Annotation saves now show pending/confirmed/unconfirmed results beside the
editor and a host status-bar confirmation. Open editors and newer typing survive
replies; uncertain publication never reports success or retries.

The user subsequently reported explanatory benefit: recognizing 08ZG's
fixed-point equation as a diagonal preimage. Their requested expansion was saved
on the retained **08ZG — Proof**, attributed to **Codex / AI proposal**. The
original source, ordinary overview and earlier notes were preserved. This is
genuine study work: preserve the reading workspace and its existing private
store, and do not rerun old seed scripts against their stale baseline. The
annotation body is private and is not committed. Record this as user-reported
explanatory benefit for one passage, separate from proof verification or broad
usefulness claims.

All **68 Node checks pass**, including native-container/command integration,
save feedback/failure/newer-edit preservation, form placement, direct-proof
navigation, multiple proofs, changed spans and read-only temporary expansion.
Python ran **362 tests (303 passed, 59 expected skips)**. The complete bridge
test pass precedes packaging. Actual 0.9.2 visual acceptance remains unobserved;
the known empty-workspace Development Host barrier was not retried. Do not ask
for another Ready/checklist campaign. Keep Windows-backed storage qualification
deferred.

The verified final **0.9.2** VSIX is installed: 63 package files, all 58 installed
runtime files identical, SHA-256
`f69c7d528629ea8ca1cde418c2c440c59b236c64a1e606de0a52dc8a020834bb`.
Its read-only bundled bridge followed the original exact retained passage and
preserved overview/store bytes, including the genuine annotation. Earlier
packages and the preliminary 0.9.2 package are preserved. The current window
loads the final update with **Developer: Reload Window** after saving or copying
unsaved reader-form text; do not force it. Then click the **MRW** Activity Bar
icon, and use **… → Open Saved Source Outline…** or **Open Reading Outline**.
New icon/menu, proof-link and Save-feedback visual acceptance remain unobserved.

## Installed reading trial and presentation repair — 2026-11-01

Started this follow-up clean at `866c479930dede61b04ee5323f14fd609643ae5f`.
The user explicitly requested focus retries. A same-process wait resolved the
foreground guard, but accessibility automation did not identify Command Palette.
Native F1 and user-performed actions then confirmed the ordinary installed
0.9.0 navigator, whole-source reader and rendered 08ZE statement. The actual
window capture is linked in the
[follow-up validation](READING_OUTLINE_VALIDATION.md#reading-presentation-follow-up--2026-11-01).

The trial exposed a reading blocker: long citation labels, a dominant raw
Markdown selection, and a narrow reader crowded by controls/metadata. The user
reported a postage-stamp-sized statement surrounded by instrumentation.
Manual checklist requests were stopped. Patch **0.9.1** now uses concise view
labels, expands reading with standard host layout commands, places source
content before collapsed tools, and opens exact matching expanded published
passages at their rendered cards. A sticky Return action restores Markdown and
navigation. Changed/removed/edited/collapsed associations preserve their earlier
pinned-text fallback. No prose, source bytes, reference grammar, schema,
acquisition, provider or storage boundary changes.

All 61 Node tests and the Python suite (303 passes, 59 skips) passed. New
actual-host layout observation is unavailable because the disposable Development
Host restored without a workspace; its fixed source was correctly refused and
setup attempts were stopped. Do not label this patch visually accepted from
API/DOM tests or the earlier 0.9.0 observation. Do not resume a prolonged desktop
retry loop or ask the user to inspect mathematics to establish navigation.
The observed reading problem remains the priority; broader outline/proof
analysis and Windows storage qualification remain deferred.
The verified 0.9.1 VSIX is installed; an already-open reading window needs
**Developer: Reload Window**. Earlier packages are preserved. Keep the new
installed byte/bridge evidence separate from the unobserved visual patch check.

## Navigable reading outline delivered — 2026-11-01

The user explicitly authorized the next bounded extension of 0.5.0 Markdown
overviews. Work started clean at the verified 0.8.0 baseline
`2885857da79e60c81bc196b86d9958d9c5e84069`; no later commit or unrelated work was
replaced. Extension **0.9.0** adds **MRW: Open Reading Outline** and **Return to
Reading Outline**, plus an Explorer tree derived from one live ordinary Markdown
overview. Headings collapse/expand and select exact document lines. Existing
references open the unchanged retained reader/resolver; passage references retain
revision, region and exact pinned range. Duplicate links return to their own
occurrence. Existing insertion commands, ordinary Obsidian notes and the Linux
artifact store remain in use. No second prose store, reference grammar or record schema is
added. VS Code owns editing, save, undo and recovery. See
[usage and bounds](READING_OUTLINE_WORKFLOW.md) and
[checks and package evidence](READING_OUTLINE_VALIDATION.md).

The bundled pinned CommonMark parser excludes code examples/comments/images and
handles Unicode, escaped labels, repeated headings and reference links. The view
refreshes on unsaved edits; workspace UI state retains only navigation preferences
and exact return pins. Live pins follow nonoverlapping edits; overlap or a
restart revision mismatch blocks return. Exact undo restores the captured pin.
Opening/restoring the view starts no bridge. Following uses only existing
retained operations; no import, acquisition, provider, compiler, notebook or
container action is added.

Normal Windows VS Code 1.143.1 / WSL Debian Development Host checks passed the
two-source workflow, exact Stacks selections, separate duplicate occurrences,
unsaved edits/undo/redo, changed associations/missing originals, error paths,
save/normal-close/reopen and restored selection/collapse state. All 58 Node tests
passed; the Python suite ran 362 tests
(303 passed, 59 expected skips). Installed 0.9.0 has all 57 runtime files matching
the verified VSIX, and its bundled bridge preserved note/store bytes. The ordinary
installed-window attempt was blocked before input because Windows refused
foreground focus. Reader opening and the navigator-to-reader/Return clicks there
remain unobserved. Do not retry an extended UI campaign or infer those clicks
from the scripted Development Host. The useful retained Stacks record was unchanged.
The disposable overview is
`.codex-work/stacks-import-20261021/reading-workspace/reading-navigation-validation.md`.
Its second source and descriptions are synthetic functional-test material,
not user mathematics. The initial focus-race setup failure is retained separately;
its corrected Development Host used unrelated extensions disabled.

Automatic outline generation, AI explanations, prerequisite discovery, source
comparison, inference graphs and vertex elimination remain pending. Mathematical
usefulness of this navigator had not been observed at initial delivery; the later
scoped explanatory-benefit report is recorded above. Keep the prior practical-benefit
report for Zettelkasten navigation separate. Windows-backed storage qualification
remains deferred; do not change permissions, mounts, sync, the real store or vault.
No Pi, R3, SagePod, exporter, Euclid or compulsory study campaign is needed.

## Stacks section import delivered — 2026-10-21

The saved user prompt `MRW_Codex_Stacks_Import_Prompt_2026-10-21.txt` advances
this bounded part of ingestion and sets aside Windows-backed storage diagnosis.
Started from clean main/origin `d50dfbff8e7b7e58ebcab4f8cd9f203bf6e9dc67`,
installed 0.7.0. Extension 0.8.0 adds **MRW: Import Stacks Section…** (`08ZD`),
using the official GitHub ref then chapter/tag-map/license/preamble at one commit.
[Usage/format contract](STACKS_WORKFLOW.md), [actual evidence](STACKS_VALIDATION.md).
The actual imported commit is `a04446e57ec1fbc252a871afcec7752fb2807b14`.

The bounded extractor retains full source, opening context and all four complete
statement/proof spans with stable tags. Restricted bundled KaTeX 0.19.0 emits
native MathML; source prose stays inert, exact TeX remains available. Explicit
08ZE citations resolve through the existing pinned parser/resolver. Existing
annotations, overviews and Obsidian controls are reused. Same revision reopens
its saved outline; changed revision creates a separate outline. Unsupported
structure is explicit source-only retention, never a falsely complete outline.
All required metadata are retained artifact blobs; source-outline v2 adds only
an acquisition-manifest pointer. Ordinary v1 states/reference syntax/storage
identity remain unchanged. Preparation tickets are host-local digests.

Actual Windows VS Code 1.141.2 / WSL Debian / Python 3.13.5 checks imported online,
rendered nine parts/46 mathematical expressions without warnings, followed the
actual DOM 08ZE citation to its exact statement, saved a labeled synthetic
annotation via the reader form, and normally closed/reopened the isolated window.
Reopen restored exact hash/range/annotation with no acquisition bridge call.
The host driver scripts dialogs and DOM input but uses actual production code,
webview and persistence; it is not independent human study evidence. Full test,
package and installation results are recorded in the focused validation report.
The verified 0.8.0 VSIX is installed; all 51 runtime files and its production
entry/command match. Ordinary installed-window reader opening remains
unobserved: the bounded UI attempt reached Command Palette but did not observe
the expected outline chooser, and stopped. Do not claim that ordinary-window
step passed or restart an extended UI campaign.

The retained example remains in
`.codex-work/stacks-import-20261021/reading-workspace`; open that workspace and
**Open Saved Source Outline… → Hausdorff spaces**. The `Automated host validation`
annotation is synthetic, not attributed to the user. Import in any intended
workspace explicitly to create that workspace's own copy. Preserve the useful
retained source; do not automatically remove it with disposable test fixtures.
User work, ordinary notes/notebook, earlier VSIX packages and other windows stay
in place. No vault scan, Obsidian launch, mount/ACL/sync operation, real-store
move, live provider, Lean, notebook or container action belongs to this task.

Do not restart the storage experiments below. Their prior pass/fail evidence
and unqualified Windows/synchronization status remain unchanged. No new Marcus,
Appendix A, Euclid, Pi, R3 or SagePod campaign is required. Whole-corpus ingestion,
automatic prerequisites/updates/diffs, complete proof graphs and vertex
elimination remain deferred. The user's earlier report that the Zettelkasten
integration helps remains practical benefit evidence; this import is a functional
reading result, not an independent claim of mathematical usefulness.

## One Obsidian-closed fixture case passed — 2026-10-20

Started clean at `2101421395f1ac43799efbb5f6217f835f85d6d2`. The user
explicitly proposed testing Obsidian, normally closed it and confirmed **Closed**.
This authorized one new condition, not repetition of the earlier paused run.
The operator verified zero Obsidian processes before/after, with Syncthing's
vault folder unpaused and complete configuration unchanged. No API/configuration
write, Pi command, mount/ACL change or user-window action occurred.

One existing core case passed on a fresh disposable Linux→Windows metadata
fixture: move/old-payload cleanup, exact old references and stored note label,
subsequent annotation, logical reference and fresh storage-client UUID. One test
ran in 11.158 s, operator 11.848 s, with no retries. The fresh client is in-process;
there was no normal application restart, installed-command or physical hyperlink
acceptance in this check. Read [the precise result](ARTIFACT_STORAGE_VALIDATION.md#user-requested-obsidian-closed-check--2026-10-20)
and [sanitized evidence](evidence/artifact-storage-20261020/obsidian-closed.json).

The test trees were cleaned; the real store, authoritative work, original fixture
source, temporary note, configuration and prior/current packages stayed unchanged.
Runtime/installed package remains 0.7.0. The user was told the check is finished
and Obsidian can reopen. Do not relaunch or close it automatically. Local helpers
`obsidian-closed-check.ps1` / `.py` in the ignored work directory have a result-file
guard against repetition. No further run is authorized or proposed here.

One pass supports the user's hypothesis but does not prove a blocking process,
causality or a requirement to close Obsidian; earlier attempts sometimes passed
too. Windows-backed real-store use remains **unqualified**. The remaining
transaction suite/normal restart under this condition, complete Windows-backed
desktop return and actual second-host permissions/edit-back are unperformed.
Preserve both this pass and the earlier failures; no real move, permanent setup,
runtime change or broader usefulness claim follows from it.

## Paused transaction qualification failed — 2026-10-20

Started clean at `2b91a51bba761513ba492684182a8565d3bca2b3`. The user's
**Yes** approved the exact prepared paused transaction check. It ran once on
fresh disposable fixtures through the existing Windows metadata mount, with
fail-fast enabled. The first test errored in `artifact_plan`'s filesystem probe
at `save_mutable → os.replace`: `PermissionError`, errno 13. No move committed.
One selected test ran and errored; the other eight and extra mode/source-absent
checks were not reached. The helper deliberately exited 1, not by timeout.
Read [the exact result](ARTIFACT_STORAGE_VALIDATION.md#approved-paused-transaction-check--2026-10-20)
and [sanitized evidence](evidence/artifact-storage-20261020/paused-qualification.json).

The operator's finally block restored `paused=false` and confirmed the complete
folder configuration unchanged. Its elapsed time was 2.29 seconds. An independent
read-only API query confirmed the Windows folder unpaused, scanning, with no
errors/needed files; these are not completed handover evidence. The owned Windows
fixture tree was removed. No Pi command, credential change, new desktop attempt,
application/WSL restart, lasting mount/ACL/configuration change or real-store
move occurred. The navigation fixture's binding and temporary mount remain as
previously recorded; no existing fixture writer was started.

Pausing is **not a qualified remedy**, despite the earlier four passing paused
probes. The exact blocking process/cause remains unknown. The bounded attempt
is over: do not rerun the guarded helpers, add blind retries, weaken checks,
propose a permanent configuration from these results or ask for another generic
pause approval. No concrete further environmental operation is prepared. The
original nonmetadata mount fails private modes; the scoped metadata trial solves
those modes but does not reliably pass atomic replacement in this environment.
Usable synchronized Zettelkasten placement remains **unfinished**, as do actual
second-host creation/edit-back/access and the full Windows-backed desktop return.
Preserve the separate earlier ext4 desktop pass. Runtime/package remains 0.7.0;
this result changes documentation/evidence only and needs no artificial VSIX.
The real store and authoritative study files remain in place.

## Approved pause comparison completed — 2026-10-20

Started clean at `4a286d873e5821f77683dda886f96c3f5d016206`. The user said
**Yes** to the prepared Windows-client comparison. It ran once: 3/4 before,
4/4 paused and 3/4 resumed probes passed; each denial was `PermissionError`,
errno 13. The operator completed normally and an independent local API read
confirmed `paused=false`, no folder errors/needed files and scanning in progress.
The Windows folder is resumed; no Pi command, lasting configuration, mount or
ACL change occurred in this step. Scanning/needed counters do not prove actual
receiving access or completed handover. Read [the exact result](WSL_ARTIFACT_STORAGE_COMPARISON.md)
and its sanitized evidence. Do not rerun the comparison automatically.

The user clarified that a Raspberry Pi 5 is the Syncthing peer and Windows
machines run SyncTrayzor clients. The inspected local engine is Windows
Syncthing v2.1.6; it does not displace that topology. The peer's local account/
filesystem/permissions remain unverified. Do not repeat failed SSH authentication
or alter credentials. No network addresses or keys need publication.

No runtime change: installed/packaged MRW remains 0.7.0. The real store and note/
source bytes remain unchanged. Windows-backed storage is still **unqualified**;
the comparison does not identify a blocking process or establish a remedy.
The prepared further paused transaction check was subsequently separately
approved and failed at its first preflight error, as recorded above. Local
helpers `paused-qualification.ps1` / `.py` remain under the ignored
`.codex-work/artifact-storage-20261020/` directory and refuse a previous result.
They have run once; do not rerun them. The prior twelve-probe approval alone did
not authorize this operation; the subsequent explicit approval did. Neither
approval authorizes permanent configuration changes or moving real work.

No new desktop attempt ran: preserve the earlier separate ext4 pass and partial
Windows result below. Complete Windows-backed return and actual synchronized
creation/edit-back/access remain unconfirmed. No mathematical exercise or broad
acceptance campaign is needed. Documentation-only checks do not require a new
extension release or another complete regression pass.

## Authorized Windows metadata trial — 2026-10-20

User approval after `2cc1590` authorized only the isolated new directory's private
Windows ACL and separate metadata mount. Both are now configured; read
[the setup/result guide](WSL_ARTIFACT_STORAGE_SETUP.md) and
[actual trial evidence](ARTIFACT_STORAGE_VALIDATION.md#authorized-metadata-trial--2026-10-20).
No runtime code changed; installed/package version remains 0.7.0. The real store
and authoritative study files remain unchanged. The later approved temporary
Syncthing pause and restoration are recorded above.

Actual production-command fixture move from ext4 to the scoped Windows mount
committed and removed all five old owned files. A later scripted reader annotation
saved and reopened; the exact old passage remained accessible without its original
source. Full Windows-created byte-only receiving copies pass manifest/dependency,
private-mode and local ownership checks, explicit different-path adoption, note
association preservation, editing and later Windows manifest replacement. Bad
modes, partial copies and conflicts reject. These local copies are not actual
cross-machine synchronization. Second-host access remains unavailable; no SSH
retry or credential change was made.

The Windows-backed setup is **not yet qualified for real work**: nine actual
Windows-destination regression cases produced seven passes/two preflight probe
errors; a targeted two-case repeat produced three errors including subcases.
`os.replace` returned EACCES before authority switched. A nested diagnostic also
denied a single 200 ms delayed replacement after exact-content/inode checks;
other bounded probes passed. No responsible process was established. Keep the
checks and report the failures. Do not assume Syncthing caused them or add blind
retries to make qualification pass.

All independent bounded checks are recorded. The
[controlled Syncthing pause/resume comparison](WSL_ARTIFACT_STORAGE_COMPARISON.md)
was subsequently separately approved and completed as recorded above. Its
approval covered only those twelve probes, not a permanent setting or the
further paused transaction qualification. Notes stayed local/editable while
sync waited; the original false flag was restored and independently verified.

The normal installed restart verified the old link through the clipboard-follow
command, exact selection and saved annotation. A final physical Obsidian click
after explicit command activation produced a fresh `/2` view and exact UTF-8
selection; the initial cold click did not confirm a new view. The return-control
invocation did not confirm foreground within five seconds, so the complete
Windows-backed desktop return remains unconfirmed. Stop desktop retries here.
The earlier physical ext4 round trip passed independently. The isolated fixture
window was normally closed; working windows/drafts and Obsidian were preserved.

The moved fixture is at `.codex-work/artifact-storage-20261020/windows-metadata/store`,
physically inside `C:\Users\fleng\Zettelkasten\MRW-storage-test-20261020`.
Store UUID and links are unchanged. This mount survives ordinary application
restart but has no fstab entry; after WSL restart restore the exact documented
mount before opening it. Do not unmount it while its fixture binding is needed,
initialize a replacement, move the real store, or infer another host's uid/gid.
The original ext4 fixture directory is empty after successful cleanup. The
separate receiving-copy home/project under the same ignored work directory is
test-only; no fixture writer remains running. No broader acceptance campaign or
mathematical exercise was repeated.

## Windows-backed storage diagnosis — 2026-10-20

Started at clean `8ae554394943961248991704f9ef24dd85eddb04`, installed 0.7.0.
Read [the prepared scoped trial](WSL_ARTIFACT_STORAGE_SETUP.md). The real store
remains unchanged. No runtime or permission-policy changes are delivered in this
follow-up; no artificial VSIX release is needed. Zettelkasten artifact placement
is **not complete** pending a verified Windows-backed setup and synchronized
creation/replacement/access checks.

Host inspection confirms read/write NTFS through 9p/DrvFS without metadata,
WSL 2.6.3.0 / Debian / uid/gid 1000. Displayed `0777` is derived from Windows
access, not proof of universal Windows access. The vault has current-user,
SYSTEM and Administrators FullControl plus a CodexSandboxUsers read grant.
Linux metadata alone does not remove Windows grants. Syncthing is Windows
SyncTrayzor 2.2.0 / Syncthing 2.1.6, with ownership/xattr send/sync disabled;
the connected peer reports 1.19.2-ds1. Its OS/ownership/access are unverified.
Do not retry the prior failed SSH authentication or change credentials.

The exact proposed operation creates one new disposable vault directory with
a private Windows ACL and mounts only it at an isolated Linux path with
metadata/private masks. No existing configuration entry changes, no C: remount,
no WSL shutdown or working-window interruption. It is prepared, **not executed**.
AGENTS.md requires separate authorization for that permission/mount operation.
The guide includes rollback and success checks. Do not silently enable metadata
globally, reconfigure Syncthing, repair unrelated permissions, or assume metadata
survives receiving replacements. A scoped receiving-permission operation would
require complete verified content and separate implementation/validation if
mount defaults prove insufficient. Existing rejection stays in force.

Nineteen focused storage regressions passed again. This documentation/setup-plan
follow-up does not change runtime code, so the required 0.7.0 final regression
evidence remains historical: 48 Node cases; **345 Python tests run = 286 passed
and 59 skipped**. No packaging/bridge race or broad acceptance campaign is needed.

The independent physical post-move Obsidian round trip now passed on the existing
ext4 fixture: after normal restart, physical click on the same saved note link
opened a fresh retained source with exactly `α😀 retained` selected; accessibility
invocation of the enabled passage return control visibly foregrounded the correct
temporary note. Seven fixture files stayed byte-identical. The user's working
windows/drafts were preserved. This closes that specific desktop gap, not
Windows-backed or second-host acceptance. Read the new validation sections;
do not repeat the earlier blocked desktop attempts or count protocol dispatch
alone as success. The user warned of slow startup and reported when loading
finished. Practical-benefit reports remain distinct from broader usefulness.

## Explicit artifact placement — 2026-10-19

The authorized storage increment builds on actual clean `9f1c4c7` (implementation
`c1508bc`, installed 0.6.1), with no intervening or unrelated changes. Version
**0.7.0** adds explicit workspace-scoped **Move Artifact Directory…**, **Open
Existing Artifact Directory…**, **Show Artifact Location**, **Refresh Artifact
Location** and **Recover Artifact Move** commands. Read [the storage guide](ARTIFACT_STORAGE.md)
and [validation report](ARTIFACT_STORAGE_VALIDATION.md) before changing its protocol.

Settings only suggest a destination. Migration inventories owned durable sources,
outlines, annotations, evidence, Obsidian associations, ModelCalls, saved
investigation state and required record dependencies. Staged verified publication
precedes one host-local active-binding commit; exact inode/hash cleanup follows.
Before commit the original remains authoritative; afterward only the destination
does. Uncertain binding durability retains both copies and blocks access until
explicit recovery. Journals never override observed binding bytes. Incomplete
uncommitted destinations without a complete deletion inventory are retained for
inspection, with their path reported. Do not recursively delete workspace storage.

Note opening/management resolves both verified legacy and logical references
through the existing Python resolver before matching an association's exact
retained target. Replacing/removing an existing association preserves its stored
reference bytes; a current region's changed range never selects an earlier pin.

Persistent store/project UUIDs and recomputed verified legacy mappings preserve
existing `mrw-outline:v1` IDs, exact source hashes/ranges and stored note links.
Historical source paths/record bytes remain immutable. Explicit aliases resolve
retained dependencies. Another local path needs full manifest verification and
explicit project mapping into an empty/unbound workspace, with no merging.
Use the mapped workspace and **Open Link from Clipboard** for links whose saved
workspace address belongs to the first computer. Wrong-workspace checks remain.

Host-local bindings, journals, locks, reservations, credentials, caches, UI state,
return markers and ordinary editor recovery are outside the selected store.
Updated writers serialize through local exclusion and reject stale epochs/retired
locators. Close older MRW executables before moving; they cannot acquire locks
introduced in 0.7.0. Local exclusion does not coordinate different computers or
VS Code user-data installations. One writing installation at a time and complete
synchronization are required. Missing bytes and conflict copies block access;
a manifest arriving first never proves completeness. New project mappings are
fixed at creation/adoption in this bounded increment. Qt storage is unchanged.

The actual user store remains unmoved. A disposable Development Host fixture
completed a Linux ext4 move and verified its earlier pinned link and note label.
The actual move command targeting Windows Temp on `/mnt/c` rejected before
commit: this 9p/DrvFS mount lacks metadata and reports private modes as `0777`.
File/directory fsync, hard-link publication and atomic replacement returned
success in a disposable probe, but private permissions fail. Keep that rejection;
do not weaken checks or silently change mounts, ACLs or synchronization settings.
No new Obsidian vault or user action is required for development.

All 48 Node tests pass; 345 Python tests ran: 286 passed and 59 optional skips; compilation
and syntax checks pass. Focused tests include real process interruptions at nine
move boundaries, uncertain postreplacement durability, cleanup recovery, stale
panels, required research dependencies, copied-store adoption/conflicts and
unchanged exact links. Managed Send tests are deterministic: durable pending
state precedes transport, and interrupted retained outcomes recover without
retry. Migration/navigation and the actual host fixtures initiated no provider,
compiler, notebook or container. The full Python regression suite exercised its
existing available tool integrations; no separate acceptance campaign or new
Lean build ran. Cross-device ext4→tmpfs protocol testing uses a test-only bypass of the volatile-storage rejection and
makes no persistence/power-loss claim. A bounded second-host SSH check failed
authentication; no second-host synchronization acceptance is claimed.

The package is `vscode/theorem-terminal-0.7.0.vsix`; earlier packages are preserved.
Normal installed-workspace restart followed the same pre-move URI through the
Windows protocol handler and independently confirmed the exact Unicode selection.
After the validated legacy/logical note-target correction, a fresh actual host
also dispatched its existing associated note through the production command.
The physical post-move Obsidian hyperlink click still did not establish a fresh
exact retained selection, so the complete desktop round trip remains unconfirmed.
Direct standard-URI opening of the temporary note was observed.
Do not describe those partial desktop attempts as passing. The validation report
records the precise outstanding check. Preserve the user's working windows, unsaved annotations, authoritative
study files and vault contents. The one new temporary navigation note is clearly
labeled. The user's reported practical benefit from the Zettelkasten bridge
remains separate from broader mathematical usefulness. Do not repeat Pi/R3/SagePod
campaigns, extend the Euclid exercise, or require another study session.

## Reader usability patch — 2026-10-18

The bounded 0.6.1 patch builds on clean `a83cea3` without changing command IDs,
reference formats, project/private-store identity, publication, source retention
or note contents. Reader controls say **Copy link to this outline/passage**,
**Link an Obsidian note…**, **Open linked note in Obsidian** and **Manage linked
notes…**. Whole outline, current passage and earlier pinned range have separate
labeled groups. A single note shows its stored label; multiple notes keep a
chooser; empty states explain how to add the return destination. Tooltips
explain the two directions and that copying creates no reverse association.
Read-only target metadata comes from the existing Python reference parser;
it is never persisted and supplies no new navigation identity. Do not inspect
the vault for display titles.

The user reports the Zettelkasten integration is helpful in practice. Record
that practical-benefit report separately from broader mathematical usefulness,
proof comprehension or quantitative productivity claims. Do not require another
study session or extend the Euclid exercise. Use the existing temporary fixture
for navigation checks, preserving working windows and drafts. The two previously
outstanding checks are now complete; see
[the workflow](OBSIDIAN_WORKFLOW.md) and the 0.6.1 section of
[the validation report](OBSIDIAN_VALIDATION.md) for final checks and limitations.

Final patch checks: 44 Node tests passed; 326 Python tests ran with 59 skips;
syntax/compilation passed. The Development Host reproduced the existing copied
links and associations. Actual installed 0.6.1 controls, stored captions and
tooltips were inspected. The unchanged saved URI opened its retained passage
after isolated VS Code close/reopen through the Windows protocol handler.

The authorized desktop follow-up on clean `c1508bc` completed both outstanding
checks with installed 0.6.1. After normal Obsidian and isolated VS Code restart,
a physical click on the same saved temporary-note passage link opened the intended
WSL retained source with exactly 30 characters selected at 5:0–5:30. The complete
wrong-workspace sequence also passed: the actual recovery button copied the exact
URI, opened the intended workspace by reusing the isolated window, and **MRW:
Open Link from Clipboard** opened a new retained-source view with the exact same
selection. Folder-specific trust was used, with user help for the intended folder;
no global trust change or trust-disable flag was needed. A focus change stopped
further automated input; read-only accessibility then confirmed the final selection.
These are actual agent-operated desktop observations, not independent human use.

All 14 inventoried fixture, note, saved study and VSIX files were unchanged. The
user's working window and drafts were preserved. An unrelated active Copilot
session in the empty test window was cancelled; the user confirmed that was
wanted. No MRW assistance action ran. The delivered package remains
`vscode/theorem-terminal-0.6.1.vsix`; no rebuild was needed for this evidence-only
follow-up. Exact observations, captures and limits are in the validation report.
No requested navigation check remains outstanding. Save reader annotations before
reloading working windows to pick up the installed patch; do not close or rewrite
them automatically.

## Obsidian companion navigation — 2026-10-17

The user-requested bounded bridge is implemented in extension **0.6.0**, over
one extension and the existing Python reader/reference/private-state services.
Read [the command/click guide](OBSIDIAN_WORKFLOW.md) and
[the validation record](OBSIDIAN_VALIDATION.md) for actual desktop outcomes,
package identity, regressions and remaining checks. Keep interoperability
separate from mathematical usefulness, which this increment does not establish.

Obsidian supplies existing notes, mathematical rendering, links and attachments,
including references to handwritten work. No derivation transcription or note
conversion is required. Zettel is the specification/tooling repository for the
private vault; its checkout is not the vault. Its current README and three
supplied templates were inspected at `fdce8d7`. Preserve immutable note IDs,
editable titles, YAML, `[[ID]]`, `SEE ALSO` and `References`.
The user's local Windows vault is copied through Synctrayzor/Syncthing to a
Raspberry Pi 5. Slow Obsidian startup is expected in this environment; allow
time rather than classifying a loading screen as a failed MRW navigation.
This does not change the private-target transfer limitation or authorize a
new synchronization service or Pi acceptance campaign.

Copy supports existing whole outlines and pinned retained regions without an
active Markdown editor. Explicit note association/open/replacement/removal uses
only validated Obsidian open URLs. Each association keeps its exact reference
in a separate private mutable sidecar. Earlier pinned associations remain
accessible after region edits. Existing outlines, annotations, retained sources,
evidence and legacy `mrw-outline:v1` links remain compatible. Workspace/host
routing is separate from target identity; wrong windows offer a recovery action
and never resolve against an unrelated project. No transient window/callback
identity, vault indexing, sync, plugin or background server is added.

The user has added authoritative commentary to
`/home/flengyel/Jupyter/mrw-sagepod-study/overview.md`; preserve the actual saved
bytes, its notebook/source and private outlines. They remained in active use
while this increment was checked, so do not restore an earlier snapshot or
reconstruct them from chat text. The Euclid material serves only as a navigation
fixture. Do not add exposition, exercises or a preliminary study ceremony.
The separate temporary test note is explicitly identified in the validation
record. Do not modify unrelated vault contents or relocate/copy the vault.

The user's first desktop return-link click exposed a VS Code URI serialization
defect: default `Uri.toString()` escapes query delimiters. The handler now uses
minimal serialization for its strictly bounded base64url payload, with regression
coverage. Association prompts now explicitly identify the note open in Obsidian
and explain its URL. Record later checks accurately rather than treating the
initial failed click as acceptance. Existing R3, Pi and SagePod acceptance
campaigns need no repetition. No live provider call or Marketplace publication
is authorized by this handoff.

Final regressions: 42 Node tests passed; 326 Python tests ran with 59 documented
skips. The installed Windows/WSL check observed an actual Obsidian click opening
the exact retained selection and an unrelated foreground workspace refusing
resolution with a recovery message. Final restart restored the same saved URI
in VS Code; Obsidian loaded the correct note after its expected slow startup,
and the final installed reader's note action was exercised again. A repeat
Obsidian pointer click after restart did not establish a new confirmed selection.
Actual invocation of the recovery button sequence also remains unobserved.
Do not describe these remaining desktop checks as passed, and do
not make delivery depend on another mathematical session. The final package
and precise evidence/limitations are in the validation record linked above.

## Completed handoff — SagePod companion study notebook, 2026-10-16

The current request activates a usable standard notebook workflow alongside
MRW 0.5.0, delivered at `2fe6b4e`. Use VS Code/Jupyter for editing, rendering,
save/recovery and explicit kernel interaction; use SagePod's existing container
for Sage computation. MRW's Python backend remains on the workspace host.
Read [the user steps](SAGEPOD_NOTEBOOK_WORKFLOW.md) and
[the current validation report](SAGEPOD_NOTEBOOK_VALIDATION.md).

The existing SagePod checkout is `/home/flengyel/src/sagepod` at `462273c`;
its untracked `txt` is unrelated and preserved. The production `sagepod`
container was already running Sage 10.10 on host 8889, mapped to container 8888.
Its existing six mounts are unchanged. `~/Jupyter` is the host notebook root;
`/home/sage/notebooks` is the container root. The unrelated SageQueue container
on 8888 stays running. Do not rebuild images, rerun setup/permission repair,
change mounts, stop unrelated sessions or repeat Pi/deployment campaigns.

The WSL extension host was upgraded from installed MRW 0.4.1 using the existing
0.5.0 VSIX; all 98 pre-existing private files matched afterward. Jupyter
2025.9.1 and its declared companion extensions are installed there. A concrete
Jupyter interoperability blocker required the existing SageMath Enhanced 2.0.8
extension (`Lov3.sagemath-enhanced`) to register `sage` as a VS Code language.
Before that registration, Run All could not execute Sage cells; after reload
and explicit selection of SagePod's actual `sagemath` kernel, execution passed.
No kernelspec was modified and no Python kernel was substituted. No MRW runtime
code or new VSIX is needed. Keep server credentials in Jupyter's connection
storage and out of repository files/reports.

One durable notebook is `~/Jupyter/mrw-sagepod-study/sagepod-study.ipynb`, with
`overview.md` and the existing validation Euclid IX.20 transcription beside it.
The kernel reported Sage 10.10, Python 3.13.5 and module
`sage.repl.ipython_kernel.kernel`. It factored 1023 as `3 * 11 * 31` with exact
product/factor assertions. Counts 1 and 2 and outputs were saved by VS Code.
This is scripted UI/API evidence, with rendered prose/math captured separately;
mathematical usefulness is unassessed. Normal notebook-editor close/reopen
preserved prose and saved outputs without executing cells. The notebook's
**source overview** link opened ordinary Markdown and its preview; the Euclid
link opened the text and **study notebook** returned to the notebook. A new
outline/reference was prepared and followed through the installed bundled bridge
in this new workspace; no unrelated private outline was changed.

An explicit **Restart Kernel** and confirmed **Restart**, followed by **Run All**
and Save, reproduced the result. The final kernel PID is 1186 (prior run 1014),
with counts reset to 1 and 2 and no prior integer calculation in kernel memory.
Notebook SHA-256:
`738c3bae47f94c09b2354afdec871718518319e064056034b4b8a79e803e5bcf`.
The final saved bytes are readable from host and container and pass notebook
format validation. All 98 inventoried pre-existing MRW private files and all 11
pre-existing notebook-mount files remain unchanged. Both existing containers
retain their identities, images, PIDs and start times. SagePod remains running.

Focus guards stopped keyboard automation when another application took focus.
Stray text in only the new example was preserved locally and corrected while
its editor was closed. Later checks used accessibility/menu controls, a native
restart confirmation and inspected window-render captures, with no development
host or manifest substitution. Direct cell typing/save was observed; corrections
and environment diagnostics were scripted file edits with the editor closed.
This is not independent human workflow acceptance. A draft memory probe was
corrected because Sage already defines `n`; the final probe checks whether its
value is an integer calculation. Do not treat automation corrections as MRW
runtime defects. Jupyter's widget-CDN failure and missing Sage kernel-completion
triggers remain recorded limitations; plain prose and arithmetic passed.

Documentation/evidence changes require document and artifact checks; MRW runtime
and package bytes are unchanged, so no Node/Python regression campaign or VSIX
rebuild is required. The existing 0.5.0/0.4.1 packages are preserved. No broader
implementation is activated by completing this companion workflow. Observe
actual study when chosen, without making it a delivery gate.

Use ordinary relative links to join notebook, source and overview. MRW references
are followed explicitly in the Markdown editor, within their existing private
scope. Copying ordinary files transfers no private outline targets. Opening or
restoring MRW starts no containers and executes no cells; outputs do not restore
live variables. Direct notebook-cell R2/R3 selection/insertion, automatic
execution, synchronization and kernel-memory restoration remain pending.

The broader source-outline requirement remains pending below; this notebook
companion increment supplies no inference graph, elimination or new proof status.

## Completed — first manual overview across sources, 2026-10-16

The user activated one bounded part of the broader outlining requirement:
ordinary Markdown with explicit references to existing saved source outlines
and selected retained regions. It is implemented in extension **0.5.0** using
the existing Python core, reader, storage and navigation services. Read
[the workflow](../vscode/README.md#manual-markdown-overviews-across-sources),
[the reference contract](PROOF_OUTLINES.md#first-manual-overview-across-sources--reference-contract-2026-10-16)
and [the focused validation report](VS_CODE_OVERVIEW_VALIDATION.md).

Delivery: `vscode/theorem-terminal-0.5.0.vsix`, SHA-256
`1580ff1ff022662028a1c302abe190698919663fb1bf40fc74742696baa1ebe8`.
Two UTC/fixed-epoch builds were byte-identical. All 45 archive files were
verified against the production manifest/runtime/license allowlist; test
harnesses are excluded. The 0.4.1 VSIX remains unchanged.

The focused WSL Development Host seed and normal close/reopen checks pass for
two source outlines, insertion, ordinary editing/undo/redo, reader navigation,
changed region association and retained access with a missing original.
All 86 inventoried pre-existing unrelated MRW private files are unchanged.
Final checks: 36 Node tests pass; 319 Python tests (248 passed, 71 skipped:
58 Qt, one unavailable `/mnt/c` parent, 12 compiler/checker integrations excluded
by task scope), plus compilation/syntax, archive, document and evidence checks.
Scripted host use is distinct from manual use; mathematical usefulness remains
unassessed. Installation and Pi validation were not repeated.

Insert chooses an existing outline and either its whole retained source or a
saved region. A readable ordinary Markdown link snapshots known bibliography
and a useful locator. It adds no overview form or private overview store;
VS Code owns editing, undo, save, recovery and preview. Follow works explicitly
at the cursor in the Markdown editor; preview-click handling is pending.

Reference identity binds the current canonical project/private-store scope,
outline UUID and retained source SHA-256, plus region UUID and exact scalar
range when applicable. Annotation edits do not invalidate it. Changed/removed
region associations are reported while the originally pinned retained passage
opens in plain text; no replacement region is selected. Missing originals
still permit retained access. Missing targets/storage, invalid references and
scope mismatches fail clearly without editing Markdown or searching elsewhere.
No reference confers proof status or a verified dependency relation.

The source/outline format and private-state paths are unchanged. Preserve saved
user state and the previous 0.4.1 VSIX. Copying Markdown alone transfers neither
private outlines nor retained sources; there is no automatic cross-host sync.
Ordinary overview prose remains reader synthesis, with no hierarchy, template,
questionnaire or compulsory reading sequence. Automatic generation, discovery,
general overview tooling, inference graphs and elimination witnesses remain
pending. The remaining broader outline requirement stays below and in the roadmap.

The user's validation supplement reuses the completed deployment evidence at
`b776368`: test the new behavior in a WSL Development Host, repeat no installation
validation, and repeat Pi only for an SSH/ARM-specific change or a concrete
regression. This increment changes neither remote transport nor architecture
dependencies; no Pi rerun was needed. The report distinguishes new scripted
host behavior from prior installed-0.4.1 WSL/Pi evidence. Do not turn either into
human usability or mathematical-use acceptance. No compiler/provider call or
Marketplace publication is authorized by this handoff.

Package using the existing bundler/prepublish hook and pinned vsce 4.0.0, with
the recorded tool versions and fixed UTC epoch. Preserve the old VSIX and use
the new versioned filename. The validation report records the delivered digest,
focused checks and limitations. No broader implementation is activated merely
by completion; mathematical usefulness remains unassessed.

## Completed deployment baseline — installed VSIX and Linux workspace hosts, 2026-10-15

The association-editing increment is complete at `db3665a`. The completed delivery
packages that existing extension as an installable VSIX, preserving identity
`flengyel.theorem-terminal` 0.4.1 and all existing private-state conventions.
Use [the reproducible packaging and installation procedure](../vscode/README.md#package-and-install-a-vsix)
and [the installed-package report](VS_CODE_OUTLINE_VALIDATION.md#installed-vsix--2026-10-15)
for the artifact digest, archive contents, ordinary-window workflow and limits.
The committed lockfile pins **@vscode/vsce 4.0.0**. Packaging uses the existing
Python bundler/prepublish hook; it adds no second core implementation.
The documented UTC/fixed-epoch builds produced identical archive bytes. The
final VSIX installed successfully into WSL Debian, and an ordinary Windows
VS Code 1.141.2 window restored saved reader edits and detached evidence after
normal close/reopen. Retained source and artifact access passed. Observed
isolated bridge processes used the installed bundled core; all 82 pre-existing
MRW private files stayed unchanged. These were scripted native-dialog/webview
checks with inspected captures, not independent manual human acceptance.
The report distinguishes remaining VS Code/other-extension diagnostics and
corrected automation errors from MRW runtime defects; none was established.

The architectural direction prioritizes simplicity and interoperability: one
VS Code extension and the existing Python core run in the workspace environment
through standard local Linux, WSL2 and Remote SSH to Linux. Windows VS Code can
supply the UI while the workspace extension and Python run on Linux. Python
3.11+ is an explicit workspace-host requirement; ordinary reading and outlining
require no Lean, SageMath, containers or provider. Preserve source identity,
provenance and publication protections. Do not start a TypeScript rewrite,
remote-access service or native Windows persistence port. Native Windows
backend portability remains a separate deferred task.

The same archive now also passes a scoped **Windows VS Code / Remote SSH /
Raspberry Pi 5, Debian 12 ARM64, Python 3.11.2** check. See the
[Pi report](VS_CODE_OUTLINE_VALIDATION.md#remote-ssh-on-raspberry-pi-5--2026-10-15)
and [committed host evidence](evidence/vsix-pi-20261015/host-checks.json).
Installation used ordinary SCP and `code --install-extension` in the remote
terminal. All 41 installed files match the archive; observed isolated bridge
processes and 19 imported module code origins point to the installed bundle.
Create/edit/save, context-range replacement, evidence attachment/detachment,
normal window close/reopen and explicit restoration passed. The outline and
both retained blobs stayed byte-identical; both retained documents opened after
restart. The old remote extension host exited with code 0; the new one activated
MRW without a logged error. No MRW packaging/runtime defect was established.
User actions supplied SSH authentication, workspace/file trust and an audit-file
save; the reader checks were scripted, not an independent human usability trial.
No private state was reset or migrated, and no Python package installation or
source checkout was needed on the Pi. Existing console diagnostics and corrected
automation errors are recorded separately in the report.

Distinguish these actual arrangements from broader intended support. A non-ARM
Linux SSH host is the next interoperability configuration check when available;
it does not require a new remote service. Other Raspberry Pi OS images, 32-bit
ARM and local Pi/Linux desktop extension hosts remain separately unvalidated.
R2/R3, optional integrations and the pinned x86-64 Lean checker were not tested
on ARM. This completed packaging/host increment activates no further runtime
implementation or broad acceptance campaign. Observe ordinary mathematical use
when chosen; mathematical usefulness remains unassessed.

The delivered VSIX remains the archive recorded with packaging commit
`15ba6cd`; this documentation/evidence follow-on does not rebuild it. Reproduce
its recorded digest from that revision in a separate checkout using the pinned
tools and epoch. Preserve the existing artifact and unrelated working state.

Keep saved user state. Do not reset storage to install or upgrade. Save reader
forms explicitly before normal close/reopen, then use **MRW: Open Saved Source
Outline…**. Retained originals remain separate from editable reader state.
This packaging task authorizes no provider calls or Marketplace publication.
Do not repeat reconnaissance, R3 or the full reader acceptance campaigns.
Mathematical usefulness remains unassessed by scripted installation checks.

## Delivered offline reader with editable associations

The first offline reader is implemented in the existing VS Code extension.
Read [its workflow and persistence boundary](../vscode/README.md#offline-source-region-reader),
[the governing outline requirement](PROOF_OUTLINES.md), and
[the validation report](VS_CODE_OUTLINE_VALIDATION.md). The bounded reconnaissance
at `2c6019f` remains the source of the optional Equation 387 evidence; its original
source/export/server bytes have not been changed and no exporter was rerun.

`source_outlines.py` reuses SourceDocument, bounded reads and existing immutable
and mutable private publication services. Exact source and supplied artifact
blobs are separate from mutable source ranges, visibility, bibliography and
attributed reader annotations. This is private reading state, not a new proof
calculus/schema or a Verification. VS Code owns ordinary documents and undo.
The reader supports informal mathematical books, monographs, articles and
AI-generated/assisted manuscripts without requiring Lean. Orientation, central
concepts/results, governing ideas, argument structure and optional detail are
freely navigable. A cited result may be used while its proof is deferred.

Manual ranges can be added/replaced; exact statements and selected context stay
accessible while argument details are hidden. Explanations, intended inferences,
manual dependency descriptions, questions, gaps and proposed repairs are reader
material. Supplied declaration statements differ from tactic goals. Context lists
available assumptions, not necessary or joint premises; snapshot associations
are explicitly manual. Unknown provenance stays unknown. Saved state is reopened
explicitly after restart. Changed/missing originals never cause remapping;
retained source and evidence remain accessible. Unsaved form drafts have no
restart recovery: save explicitly. Failed/uncertain private publication keeps
live text and blocks project-private writes until reload.

The two acceptance examples are the captured Equation 387 proof and a non-Lean
Euclid IX.20 HTML-to-text validation transcription (CRLF, original HTML retained;
translator/edition unknown). See the report for actual host checks, source/tool
pins, corrected defects, regression results and remaining runtime limits.
Scripted mechanics do not establish mathematical correctness, comprehension or
usefulness. No live provider call was made or authorized. No compiler/provider
call is part of opening, editing, hiding, expanding or restoring this reader.
An installed Lean extension may independently process an original source jump.

Windows VS Code 1.141.1/WSL seed, restart and statement/placement refinement
reports pass. The final regression results are 30 Node tests and 308 Python
tests (249 passed, 59 skipped; PySide6 unavailable), plus compilation/syntax and
document checks. The report distinguishes scripted mechanics from visible
inspection and unobserved mathematical usefulness. A stale retained-tab guard
and restored editor-group reuse were fixed and checked.

Supported sources are bounded saved UTF-8 text; PDF/OCR regions, notebook cells,
rendered formats and non-UTF-8 sources are unsupported. Automatic extraction,
AI outline proposals, automatic gap detection, verified joint-premise graphs,
elimination witnesses and full vertex elimination remain pending. This partial
increment does not replace the full accepted contract. The separately deferred
mathematical-outline capability at multiple scales does not enlarge this task.

The requested bounded follow-on is now delivered in extension 0.4.1. Shared
context labels/roles and exact ranges can be revised, and a context selection
can be removed. Evidence cards allow revision of the manual region/snapshot
choice and detachment to a retained outline-level reference. Original source,
statements, hypotheses and supplied checking evidence remain unchanged and
explicitly readable. No artifact is deleted and no proof edge is inferred.
Live form drafts survive refresh, failed publication and completion of an older
save while newer typing is present. Save explicitly before closing/reloading;
unsaved forms still have no restart recovery.

The scoped Windows VS Code 1.141.2/WSL host checks pass for editing/removal,
retained access, publication failure, pending-save typing and normal close/reopen.
Final regressions: 33 Node tests pass; 313 Python tests (254 passed, 59 skipped;
PySide6 unavailable), plus syntax/compilation and document checks. See the
[follow-on evidence](VS_CODE_OUTLINE_VALIDATION.md#association-editing-follow-on--2026-10-15)
for the commands, reports and limits. No live provider request was made;
mathematical usefulness remains pending.

This completed the association-editing increment. The later manual Markdown
overview increment is documented in the active handoff above. There is no deletion/garbage-collection
or cross-machine state synchronization yet. The full graph increment still
requires a representation that actually supplies scoped joint-premise inferences
and witnesses; declaration maps and tactic context membership do not supply them.
Do not repeat reconnaissance, R3 acceptance or add another extractor merely to
continue. Mathematical usefulness remains pending without gating this delivery.

## Deferred requirement — mathematical outlines at multiple scales

The user clarified on 2026-10-14 that outlining must eventually cover subjects,
bodies of literature, books, monographs, articles, sections, and arguments.
Outlines may cross source boundaries and need not form a strict hierarchy;
Lean formalization is optional. The accepted requirement is recorded in
[the roadmap](../CODEX_PLAN.md#deferred-mathematical-outlines-at-multiple-scales).

Only the first manual Markdown overview/reference increment is now implemented;
the active handoff above defines its bounds. Remaining broader capability is
deferred to future increments. Preserve this roadmap reference when updating
the active handoff.

## Delivered VS Code migration — 2026-10-13–14

The user explicitly requested beginning the VS Code extension and transferring
existing code. The first increment is now in `vscode/`; read its README.
`record_actions.py` supplies the shared projection and attributed-copy functions
used by Qt and the extension. `editor_bridge.py` exposes bounded explicit
record and explicitly previewed assistance actions without owning text
buffers, importing Qt, or invoking Lean. Only Send invokes the model adapter. The host owns documents and undo. Return markers and local Lean/HTTPS
handoffs are present; proof graph extraction and vertex elimination are absent.

PR #2 was merged into main at `f6fcc66ae4d9e9ed27a6ef49d13c8a138d96b43e`.
The follow-on increment implements R2 preview/Send: `assistance_actions.py` supplies
shared preparation, preview, transmission and terminal matching. Qt delegates;
VS Code captures ordinary selections and owns the transient draft. A separate
Send requires the active current preview and consumes it before transmission.
The review repairs additionally pin received records by digest, preserve
virtual-tab record identity, inspect all terminal statuses, and distinguish
known preflight rejection from uncertain transmission. Native Windows Send
is rejected before transport; a known-unsent draft needs a new preview. See
[the review report](VS_CODE_ASSISTANCE_REVIEW.md) for findings and validation.
These repairs were published in PR #3 on `codex/vscode-assistance` at
`d82dfb311db5a020173054e87085c2f2f2de5588`, followed by documentation alignment
at `1fdb6f1a737bc0c82131da62ea786b66b5565495`. PR #3 is merged on `main` at
`f8812ea`; the obsolete branches were removed. Continue from `main`, which
preserves those commits; do not resume from an old review branch.
No live request is authorized by this migration or its tests.

The scoped actual-host validation is now complete on Windows VS Code 1.141.1
connected to WSL Debian. The command suite used deterministic injected responses;
a separate normal-host close/reopen checked persisted Return and stale virtual
tabs. See [results, harness, and limits](VS_CODE_ASSISTANCE_REVIEW.md#actual-extension-development-host-validation)
and `vscode/README.md`. No production defect was found in the covered paths.
The smaller visible check used ordinary host layout adjustments. Manual dialogs,
VSIX installation, external-browser handoff and mathematical usefulness were
not established. Do not repeat this campaign merely to begin the next increment.

The host-validation harness/report is committed as `e4e65ba` and was synced by
the user. The subsequent bounded R3/R3.1 migration is implemented through
shared `investigation_actions.py` and independent `editor_investigation.py`.
Its persistence boundary is in
[vscode/README.md](../vscode/README.md#investigation-persistence-boundary).
The core reserves one pending child before Send, pins terminal identities,
restores explicitly without retry, and publishes only the private pointer and
bounded human text. The host owns documents, saving, undo and recovery. No Qt
workspace or recovery state is imported. Explicit ending uses the latest
matching human fields and retains immutable records; private publication
failure keeps live state and any inserted note text and blocks later private
writes until reload.

Normal WSL Development Hosts exercised restart, changed-record reporting,
ending failure/cancel/success and sequential independent investigations with
deterministic responses. Repeated views now reuse an existing MRW editor group.
See [the R3 results and limits](VS_CODE_ASSISTANCE_REVIEW.md#r3r31-extension-migration).
Usefulness remains unobserved; do not repeat this acceptance campaign merely to
begin another bounded task. The subsequently requested proof-outline
reconnaissance is recorded above. Vertex elimination
remains planned; no complete replacement of the standalone application has been delivered.

The Python/Node checks use synthetic data and make no provider request. The
review environment had no installed VS Code executable or PySide6; command API
doubles and service checks do not establish visible UI acceptance. The user has
now opened Windows VS Code against the WSL2 checkout; the subsequent actual-host
checks are recorded above, separately from that setup and the earlier API doubles.
Keep their limits explicit. The existing Qt study observation below remains independent, and
its instruction to make no code change during observation does not revoke the
new migration request.

VS Code owns text documents, saving, undo, and document recovery. Keep shared
record validation and immutable publication in Python. Port only the bounded
research-state behavior that the host does not supply. Do not reproduce Qt
buffers, checkpoint machinery, widgets, or splitter constraints in the extension.
R3/R3.1 is implemented in VS Code; proof-outline vertex elimination is not.

## Separate Qt study observation and historical evidence

The active roadmap is
[CODEX_PLAN.md](../CODEX_PLAN.md#active-roadmap-mathematical-usefulness-first).
In the standalone Qt application, R1's PDF-plus-note workflow, R2's single
task-local assistance exchange and
R3's one linked, resumable continuation are implemented and technically
verified. R3.1 can explicitly end that sole active investigation without
deleting its records, preserves latest visible handoff edits, rejects stale
restore completion and then permits a new bounded investigation after restart.
Reviewed repair `d91e35bc56d5e66778c115e1c8ffea4d6937cd28` is integrated
in `main` as a historical checkpoint. The focused controller/widget
gate passed 21 deterministic tests; the installed module matches the integrated
source and its GUI entry point launched against a durable study project. A
private ordinary note has been prepared outside this repository. The selected
next source is Daniel Marcus's *Number Fields*; the user has the book and some
exercise answers. The specific passage or exercise remains to be selected. No
new in-application study evidence has been supplied: the system is **ready for
study; the intended benefits of this trial remain unobserved**.
The Marcus study-and-explanation observation remains pending. The explicit
2026-10-12 request separately authorizes the bounded proof-outline requirement
below; its implementation and evaluation must not be reported as completed by
this documentation update.

## Qt observation objective

With a mathematical source and problem chosen by the user, observe whether the
delivered workstation helps produce and later resume worthwhile mathematical
work. Aim first for a useful explanation, reconstructed argument, worked
example or diagnosed error, then preserve it for a genuinely later
continuation. Use an ordinary note or a Jupyter notebook as the durable work
product; the prepared Markdown file is optional. If an actual
interaction blocker appears, diagnose it and make only the smallest authorized
correction needed for that task; otherwise make no code change.

The governing purpose, clarified 2026-09-27, is to help people work with
mathematics whose justification exceeds their present understanding, while
making further understanding possible wherever it can. This study trial tests
a particular function; it does not require every justified result to admit a
complete human explanation. Use the four benefit categories in
[VISION.md](../VISION.md#justification-understanding-and-benefit).

Keep implementation checks, mathematical evidence, and observed benefit
separate. The deterministic R1–R3.1 tests establish mechanics only. Claim
correctness only on identified mathematical grounds within their scope, and
claim each benefit only on the corresponding evidence. A successful check does
not demonstrate comprehension; an unresolved explanation does not negate an
independently observed epistemic, practical, or organizational benefit.

## Requested proof-outline increment

Read [PROOF_OUTLINES.md](PROOF_OUTLINES.md) and the roadmap's
[requested increment](../CODEX_PLAN.md#requested-proof-outlines-and-editor-integration).
For one selected Lean proof, support vertex elimination with visible claims and
explanations, source links, and expansion to the hidden steps. AI may propose
the selection; the reader must be able to revise it.

The bounded inspection of existing exporter/viewer output is now recorded in
[the reconnaissance report](PROOF_OUTLINE_RECONNAISSANCE.md). It distinguishes
declarations, source regions, tactic states and elaborated terms for the pinned
Equation 387 example. Its raw exports and goal responses are actual machine
output; the source-based illustration remains separate from an inference graph.
Consume that output, preserving joint premises, local scope, exact source
revisions and the existing evidence boundaries.

The preferred frontend trial is one VS Code extension over the independent
Python services, reusing the established Lean and mathematical-tool ecosystem.
Let the host own text documents and undo; retain research records in the core.
Choosing an open-source editor distribution is deferred. The extension's record
actions, R2 preview/Send and its manual source-region reader are implemented.
Vertex elimination remains planned. Do not claim planned capabilities or silently replace
the Qt GUI.

The outline service performs no model request or compiler invocation merely to
open or expand an existing outline; separately identify processing initiated by
an installed Lean extension when navigating to source. An AI proposal uses the
bounded exact preview and separate Send;
this handoff does not authorize a live request on its own. Check a newly proposed
formal claim separately. Test reversible graph navigation and retained state,
then observe whether the outline helps reconstruct or continue the proof.
Update status from the actual results. The Marcus observation remains a
separate task and is not a required preliminary ceremony for this increment.

## Existing-literature objective

The primary use is gaining working access to the existing mathematical
literature and progressively approaching the questions of interest. For Marcus,
choose a section, result, or exercise and develop only the orientation needed
for that task: its purpose, relevant definitions and prior results, and a
representative argument or example. An outline is a useful possible work product;
it is not a mandatory preliminary exercise.

Preserve exact source locations and distinguish an author's statement from a
model's suggested connection or the reader's synthesis. Record absent sources
and unresolved prerequisites without inventing a complete dependency map.
Observe whether this work makes the selected material usable and whether the
saved route supports later continuation. A justified application or successful
retrieval may be useful while explanation remains incomplete. Compare effort
only when evidence supports the comparison.

This is a bounded study observation using the delivered workflow. Literature
guidance remains an intended capability; assistance supplied outside the
application does not demonstrate an integrated feature. General ingestion and
automatic literature retrieval remain outside the current increment.

## Establish context once

Read `AGENTS.md` and the documents it names. Inspect the branch and preserve
unrelated tracked and untracked files. The integration and focused gate above
are complete; do not repeat them or the implementation acceptance campaign
merely to begin a study session. Reconfirm installation only if the environment
or integrated commit changes.

Use a durable user project for the note. A disposable copy is appropriate for a
destructive test, not as the only copy of mathematical work. A real integration
corpus may be opened only when the user authorizes it, and its authoritative
files must not be modified during a visual check.

## Notebook option requested September 22

A standard `.ipynb` may replace or accompany the Markdown study note. The
SagePod/VS Code Jupyter companion workflow and its focused evidence are now
tracked in the active handoff above and `CODEX_PLAN.md`. The standalone Qt
application still summarizes an existing project notebook and explicitly
launches its configured Jupyter/JupyterLab tool. Use that older handoff when
suitable; do not present the summary as an embedded notebook editor.

Keep explanation, code, saved outputs and the next question in the notebook
when that serves the task; no duplicate Markdown report is required. Record the
selected kernel and preserve external notebook edits. Saving/reopening notebook
content does not prove restoration of live kernel state. Direct notebook-cell
selection into R2/R3 and response insertion are not delivered; any manual
transfer must remain explicit and accurately described.

Do not repeat the R1–R3.1 acceptance campaign or automatically convert the
prepared note. Keep notebook setup and any bounded implementation separate from
the observation of mathematical benefit.

## Run one natural task

1. Open the relevant local PDF or ordinary source and the chosen study document
   (note or notebook).
   Resume at the actual current question; do not require a questionnaire,
   orientation ceremony, anchor quota, formal artifact or warrant inspection.
2. Do enough mathematics to identify a genuine question or obstruction. Record
   the attempt, useful source location and current assumption in that durable
   study document.
3. If the user chooses model assistance, select only the visible context they
   want sent, ask for an explanation at the actual obstruction, inspect the
   complete R2 preview and let the user perform the explicit Send. No agent,
   test or roadmap authorization may substitute for that per-request user action
   or expose a credential.
4. Assess and, when useful, challenge or correct the returned proposal through
   the mathematics. Returned citations, code and claims remain unverified until
   separately checked. Retain or insert only material the user finds useful;
   dismissal is a valid outcome.
5. If a correction, changed assumption or focused follow-up is useful, select
   the exact prior passages, keep the human correction separate, inspect the
   complete R3 child preview and let the user explicitly Send once. Do not add a
   branch, child-of-child continuation, retry or provider conversation state.
6. Preserve the resulting explanation, worked example, correction or unresolved
   step in the chosen note or notebook. Save the current question, last useful conclusion
   and unresolved issue when useful. Close and reopen later, then continue from
   the durable study document and, when used, bounded investigation state.
7. When that investigation is genuinely over, use **End investigation…** and
   explicitly choose insert-handoff-and-end, end-without-insertion, or cancel.
   Restart before beginning a separate investigation when sequential reuse is
   relevant to the task. Ending clears only the active pointer; it is not record
   deletion or archival.

No live provider request is authorized merely by this handoff. It occurs only
if the user explicitly chooses Send after inspecting that request's preview.

## Record only consequential evidence

Capture the source used, the real question or obstruction, the resulting
mathematical work, any consequential interaction friction and what remains to
do. Note whether the later reopen reduced reconstruction burden and whether
model and human contributions remained distinguishable. Do not ask for a
confidence score or sentence-by-sentence disposition.

Identify which benefit was observed: epistemic (inspectable grounds and limits),
practical (appropriate application), explanatory (a clearer idea or argument),
or organizational (retrieval and resumption). Leave the others unassessed when
evidence is absent. Record explanatory limits without demanding full proof
reconstruction as a prerequisite for using a justified result.

An inconclusive session is not a human failure. If the benefit under evaluation
is absent, identify one concrete obstruction. A confirmed data-loss defect has
priority. For an interaction blocker, make a bounded correction and observe it once; defer
incidental polish and new subsystems.

## Keep the cut line

Do not add automatic follow-ups, branching conversation trees, hidden history,
provider response IDs as conversation state, source retrieval, citation
verification, PDF extraction/OCR/SyncTeX, autonomous requests, another provider,
new warrant machinery, general corpus ingestion or a broad rendering redesign
without a separately authorized, observed requirement.

R1–R3.1 ordinary work remains independent of Lean and justification-logic entry.
A model response, human correction, task summary, projection or link creates no
premise, Verification, acceptance or warrant.

R3.1 currently permits only one active investigation and one child. This is a
bounded implementation cut, not a permanent product requirement. It adds no
archive browser, simultaneous slot, branch, child-of-child request, automatic
summary or retry. If ending cannot checkpoint durably, the old investigation
must remain active and the failure must be reported. Record any actual
obstruction caused by PDF transcription, response notation or insufficient
follow-up depth; do not implement those expansions during the observation.

## Finish the observation

Preserve the actual study document and immutable records. Report the mathematical outcome,
resume outcome, concrete friction and any bounded correction separately from
automated verification. Update the roadmap and handoff only if the observation
changes evidence or authorizes a next increment. Do not infer a broader feature
roadmap from synthetic checks or silently begin later-stage implementation. A
same-session close/reopen can establish restoration, but reduced reconstruction
burden remains pending until a genuinely later continuation occurs.
