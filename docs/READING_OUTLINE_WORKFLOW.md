# Documents, Contents and saved sources — 0.19.2

Open a Markdown document in the intended workspace. **MRW: Show Contents**
focuses **Contents**, which lists its headings and MRW source links and updates
as the document is edited, including unsaved text. It uses the active Markdown
document, the last chosen document, or a native Markdown picker. It does not
open arbitrary documents or derive PDF Contents. Other formats remain available
through VS Code's ordinary Open File action and installed host readers.

**New Document…** opens a native **New Markdown document** Save dialog and
creates a new `.md` or `.markdown` file with optional headings. It refuses to
overwrite existing files. **Choose Document…** opens **Choose a Markdown document
for Contents**; cancelling preserves the selected document and drafts. Selection
is scoped to the workspace, including symlink checks. No existing file, heading
or note is renamed. An untitled Markdown document works for the live session;
VS Code owns its text, saving, undo and recovery.

## Follow and return

1. Place the cursor in the Markdown document. **Insert Source or Passage Link…**
   chooses a saved source and either its whole source or an exact passage.
2. In Contents, select a heading to select its editor location. Select a source
   link to open the saved source. A passage link identifies its exact retained
   revision and range. Repeated citations have distinct return locations.
3. **Return to Document** in the reader, Command Palette or view menu restores
   the originating occurrence and rendered Markdown view, including after its
   editor/preview tabs have closed. Without a source-link origin it returns to
   the selected document, or offers a Markdown choice if unavailable.
4. Continue editing and use ordinary Save/Undo. **Refresh Contents** refreshes
   immediately; otherwise a short debounce updates the tree. Save a reader form
   separately with **Save annotation**.

Outside edits move an exact return pin; edits overlapping its captured syntax
block return until exact undo restores it. A mismatching saved revision after
restart never redirects to similar text. Failed follows preserve the preceding
successful return. An unrelated active document or Untitled draft is preserved.
Reopen the same document and Show Contents to restore matching selection and
collapse preferences. MRW does not save ordinary document prose automatically.

## Read retained material

**Retain Document as Source** uses a saved UTF-8 text document, preserving its
selected passage. It does not import a PDF. **Open Saved Source…** reopens a
retained revision independently of later changes to the original. **Refresh
Saved Source** reloads saved reader state/annotations, without reacquiring a
changed original. Add ranges with **Add Selected Passage**; reader controls
use Passage while the existing record fields retain their technical names.

Statements, proof controls, reader notes, supplied evidence, diagrams and linked
Obsidian notes keep their existing behavior. Proof Outline still names a
mathematical argument. Studies remains the study-content view. No layout change,
private-store move, new vault, provider request or compiler is required.

Contents parses CommonMark ATX/Setext headings and MRW destinations expressed
as ordinary Markdown links, reference links, autolinks or bare MRW links. Other
file links are not listed or resolved. Leading YAML front matter can currently
appear as a false heading; correcting this is part of the next document task.
Code, images and comments are excluded. Unicode, escaped labels,
repeated headings and duplicate references retain their locations. Limits are
4 MiB and 10,000 heading/reference entries. WikiLinks and embeds are not resolved.
One document is selected per window. Copying Markdown transfers no private
saved sources; exact references, workspace scope and `mrw-outline:v1` links
remain unchanged. Links establish no checked dependency or mathematical status.

The [tutorial](../vscode/media/first-steps.md) and
[Markdown import/Obsidian guide](OBSIDIAN_WORKFLOW.md) describe current actions.
Dated observations retain their original labels in
[earlier navigation validation](READING_OUTLINE_VALIDATION.md);
[terminology validation](DOCUMENT_TERMINOLOGY_VALIDATION.md) records this patch.
