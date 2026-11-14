# Write a reader note

Choose **Add a note** beside a passage. The writing area receives focus.
Write prose, Markdown or LaTeX, then choose **Save** or press Ctrl+Enter
(Command+Enter on macOS). No purpose or authorship choice precedes writing.

**Cancel** closes an unchanged editor. For an unsaved note it offers to discard
changes; keeping the note preserves the draft. Text typed while that choice is
open is retained even if an earlier discard request is accepted. Escape in the
writing area uses the same Cancel action.

**Attribution** and **Help** are optional collapsed details. Editing retains the
existing note kind and known origin/author unless an attribution field is
explicitly changed. New notes have the neutral kind `note`, unknown origin and
no supplied author. Existing schemas, note IDs, passages and timestamp semantics
are retained; there is no conversion of existing notes.

Inline and displayed LaTeX remain editable. For a diagram, save a fenced `tikz`
block and choose **Render diagram** beside the saved code. Saving, reopening and
ordinary editing do not run TeX or a Lean checker and create no premise admission.
See [TikZ setup and limits](TIKZ_WORKFLOW.md).

The composer stays in the passage's tools area. Opening it scrolls the writing
area into view. On narrow readers the navigation toolbar scrolls with the page
so it does not occupy the writing space. Saved notes and independently linked
external notes keep their existing locations and editing routes.

## Verification of 0.23.33

- Reader/annotation/source/tutorial batch: 52 checks passed.
- Focused Python source, note, reference and diagram batch: 59 checks passed,
  including opt-in isolated native TeX rendering.
- Affected extension controllers: 16 checks passed, covering Save, rejection,
  drafts, deletion, diagrams and native discard-message handling.
- Separate Windows VS Code / WSL Debian host exercised real webview focus,
  keyboard Save, Cancel, draft/caret preservation across refresh, inline/display
  math, a real retained TikZ SVG and an injected rerender rejection. The rejected
  rerender preserved exact editable code and the previous valid image.
- Normal and narrow native layouts were inspected. The first observation exposed
  toolbar crowding; the correction scrolls the composer into view and removes
  narrow-reader stickiness. Final native probes check both editor and controls
  are visible, with no horizontal overflow.

Initial fixture setup/focus, probe lookup and old-label assertions were corrected; early screen
captures were obstructed or DPI-cropped. Those attempts remain in local evidence,
separate from the final observations. No full application suite is claimed for
this focused repair. Dependency pins are unchanged; npm reports the existing
two moderate and three high build-dependency findings.

Logs and disposable native fixtures are outside maintained source under
`~/.cache/mrw-plain-reader-notes-20261114/`. No genuine source, annotation, vault
note or template was edited. The working window was neither installed into nor
reloaded. Publication and package identity are recorded separately in the
[release account](RELEASE_0_23_33.md).
