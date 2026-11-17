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
