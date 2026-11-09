# Reading repairs — 0.23.5

This batch repairs obstacles encountered while reading linked mathematical notes.
It preserves the removal of document Problems, original files, dirty buffers,
retained references, studies and history. It adds no registration form or storage
migration. The working window is not reloaded.

## Delivered behavior

- Contents hides the preceding Markdown tree when another file is active. It
  identifies that file and explains how to select its Markdown or reveal the
  previously selected document. Successful PDF/text opens and native tab changes
  update this indication; Return restores the selected tree.
- WikiLinks support exact headings, paragraph/list block IDs and paths inside
  the selected notes folder, including aliases and same-note targets. Duplicate
  IDs/headings and missing or duplicate block IDs are reported, never guessed.
  Return retains the complete original syntax. Backlinks use the same resolver.
- Note-local macro definitions from leading YAML feed the native math renderer.
  Definitions are scoped to each equation and never modify another note. Native
  front-matter masking and separate parse/render environments are covered.
- An ordinary Markdown `tikz` fence offers an explicit Render diagram action.
  It rechecks scope, exact revision and code before invoking the existing isolated
  compiler. Opening never compiles. Derived light/dark SVG views are cached in
  extension workspace storage by exact code, outside the note. A source change
  requires a new render; a failure preserves source and earlier views.
- The compiler now handles display equations around TikZ and supplies a pinned
  Quiver 1.7.0 package for exported curves. Its complete MIT license and upstream
  blob identity are bundled in `src/theorem_terminal/quiver.json`; package
  verification checks its digest. No package is downloaded at runtime.
- Chooser titles arrive progressively in bounded batches. Query, selection and
  dirty-buffer titles survive updates and cancellation. Windows title lookup
  reuses parent-directory checks within that operation, without persistent title
  or filename caches and without changing final navigation scope checks.
- Reopen Document restores the last exact Markdown selection after restart.
  Source-editor selections, Contents and followed heading/block locations are
  recorded. Missing or revised text is refused rather than approximated.

## Verification

Focused reading, parser, picker, tutorial and renderer checks passed, as did the
Python bridge and opt-in isolated-renderer checks. The final serialized Node
result, source digests and package/install identity are recorded in
[evidence](evidence/reading-repairs-20261109.json).

Actual host acceptance used Windows VS Code 1.144.1, WSL Debian and a disposable
workspace. Its native Markdown pipeline rendered front-matter macros, navigated
a heading WikiLink and Return, hid the old tree for a text file, and rendered a
cached diagram through the explicit native URI action. An independent unsent
text editor and the absence of automatic study creation were checked. These
observations used synthetic notes, not genuine study records.

All three TikZ blocks in the two user-supplied category-theory notes compiled
through the isolated renderer. Before/after comparisons confirmed unchanged note
bytes. Their prose is not copied into this repository or used as a fixture.

## Remaining limits

Native preview scrolling and PDF pages are not recorded. VS Code owns general
window/tab and unsaved-buffer recovery; MRW does not restore calculation sessions.
PDF opening still delegates to a registered reader or explicit system handoff.
Obsidian transclusions/embeds and arbitrary LaTeX preambles/packages remain
unsupported. Macro extraction covers bounded balanced command definitions,
not a general YAML or TeX interpreter. Standalone block IDs for arbitrary tables,
code and complex nested Obsidian blocks are not claimed.

Backlink file/text limits and incomplete-result reporting remain. Progressive
metadata loading removes the wait for all titles before early titles appear;
it does not establish a guaranteed lookup time or eliminate mounted-filesystem
cost. Quiver's package uses the system TikZ libraries; missing tools/libraries
produce a compiler diagnostic rather than a partial or changed diagram.
