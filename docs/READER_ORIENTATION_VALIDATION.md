# Reader orientation repair — 0.22.1

Reviewed baseline: clean `8bd8743`, MRW 0.22.0. Before implementation, fetched
and fast-forwarded main to `1efa68e` to preserve the concurrent README and
recommended-extension work. Both READMEs and that guide remain unchanged.

## Behavior and scope

Document/source opening and Return no longer issue automatic maximize,
hide-sidebar or minimize-other-editor commands. Contents selection visibly
opens/reveals its Markdown and retains a filename/path header and explicit
reveal action. Initial saved-source access and the title toolbar use the
existing store. Essential source location stays in the sticky reading toolbar;
hashes and storage details stay collapsed. Each live citation reader keeps its
own tracked Return occurrence, while independent opening names the selected
Contents document. Help uses hover, keyboard focus and accessible descriptions.
These requirements supersede historical full-width-reading acceptance checks.

The rename, source display/lock repairs, exact v1/v2 references and genuine
Hausdorff source/annotations/diagram are preserved. No preservation copy,
archived-state restoration, re-import or working-window reload is performed.

## Hover diagnosis

The current WSL activation log records `flengyel.mrw` activation at 22:39 UTC on
2026-11-06. The registered installed package at inspection was 0.22.0. Its
reader supplies titles for Return, refresh and some links, but several study,
proof and AI controls have none; the source location is under collapsed tools.
Native `title` help alone also has no visible keyboard-focus explanation.
No hover-disable setting was found in the inspected user/remote/workspace
settings. This source/settings diagnosis does not prove how every native hover
was rendered in that window. The repaired reader supplies visible explanations
on both pointer hover and focus, accessible descriptions and focus outlines.

## Validation layers

Controller/bridge tests exercise an unrelated dirty editor initially active,
explicit Markdown choice, visible reveal in its existing group, a Hausdorff
citation and exact Return. They verify surrounding dirty editors and an Untitled
draft, no layout-changing commands, unchanged source files, cancellation,
independent saved-source discovery and changed-origin refusal. Renderer tests
cover visible Stacks/Kerodon orientation, collapsed technical details,
hover/focus/Escape help without actions, and destination updates preserving
the actual unsaved annotation form. These are API/DOM contracts.

The historical actual-host presentation driver now checks group preservation
instead of minimum full-width reading. Native sidebar visibility is not exposed
by the public editor API and must be recorded through visible observation.
Browser rendering, controller layout assertions and package installation are
reported separately from native-window behavior. Final checks and delivery
evidence are recorded after packaging.

## Native observations and remaining acceptance

An isolated Windows VS Code **1.144.1 / WSL** development host visibly opened
the chosen Markdown, showed its Contents identity, opened Hausdorff with its
qualified location, displayed focus help and returned to the second repeated
citation at its exact occurrence. Its group layout and dirty document contents
survived. Picker answers and offline source acquisition were injected; this was
not an observation of a native picker being cancelled with Escape. A direct
window capture showed MRW in the primary sidebar, the secondary sidebar and
three editor groups. Screenshots and genuine reader data remain outside Git.

Stronger inspection found that the old active-editor preview command/fallback
could displace an unrelated group's visible editor. Return now uses the native
Markdown custom editor in an explicit document group, including before its
commands activate. Navigation also awaits native editor/selection focus
acknowledgement before applying the existing cursor-change guard. These final
repairs have controller coverage. Do not reintroduce the active-editor-only
preview route or remove the exact cursor/revision guards.

**Final native acceptance remains partial.** The strengthened fixture requires
an unrelated editor to be both active initially and visibly retained after
Return. Its final setup still reports the Untitled editor as active after the
host is asked to focus the unrelated file, so it stops before that sequence.
Do not call that final assertion passed, weaken it, or count an earlier
group-count/dirty-text check as visible-editor preservation. The first run was
interrupted when the user reloaded/enabled extensions in the separate test
window; a later test-only probe routing error was corrected. Further work
should resolve fixture focus setup and complete this stronger native check
before another feature. The working Stacks window was not forcibly reloaded.

Separately, actual headless Chrome rendered the Hausdorff reader at **1280×820,
960×680 and 480×680**. Real pointer events and keyboard Tab produced help;
Escape dismissed it without sending an action. Essential source location stayed
visible, hashes stayed collapsed, destination updates retained the existing
unsaved form, and focused passages cleared the wrapping sticky toolbar. No
horizontal overflow or JavaScript errors were observed. This is browser
evidence, distinct from the native sidebar/editor acceptance above.

## Checks and installation

- Broad Node run: **288 cases, 287 passed**, with one `ENOTEMPTY` cleanup-hook
  failure in the unchanged active-study fixture. That file passed **16/16** on
  isolated recheck. This broad run preceded the final focus/preview adjustments.
- Final navigation/Return checks: **23/23**; final explicit-group, cold preview
  activation and delayed-focus checks: **4/4**; renderer/parser/tutorial: **34/34**.
- Python: **413 run, 351 passed, 62 explicit skips**, exit 0. No Python core
  implementation changed. JavaScript syntax and `git diff --check` passed.
- Existing package/verify/install workflow succeeded for `mrw-0.22.1.vsix`:
  **551,408 bytes**, **96 archive entries**. All **94 installed files**,
  including **91 runtime files**, match the archive, excluding installer-only
  manifest metadata. SHA-256:
  `c470f71ef6923880530985bc384ba26fc6b243ca777312de820d9ba292c2a214`.

The installed package's own isolated Python bridge reopened the genuine bound
Hausdorff source read-only: **9 passages and 2 annotations**. All **8** current
Hausdorff source/annotation/diagram files match the initial inventory; all **26**
inventoried Stacks document/source files remain byte-identical. The existing
store also contains a later additional source; its current HEAD was preserved,
not replaced by the initial inventory. Loading changed no store HEAD. No
preservation copy, archived-state restoration, diagram compilation or new
genuine-source acquisition occurred.

Both READMEs and the recommended-extension guide match synchronized main
`1efa68e` byte for byte. No commit, push or forced working-window reload was
performed. Installation establishes the version on disk; a normal later
activation adopts it. The tutorial reports its activation's version and labels
this uncommitted build as based on `1efa68e` with local changes.

[Machine-readable delivery evidence](evidence/reader-orientation-20261106/delivery.json)
records the distinct validation layers and remaining native acceptance.
