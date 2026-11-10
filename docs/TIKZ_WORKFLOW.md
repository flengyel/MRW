# TikZ diagrams in notes and annotations — 0.23.5

MRW renders `tikz` fenced blocks in ordinary Markdown notes and in saved-source
annotations. Choose **Render diagram** to compile a block; opening, saving or
refreshing a note never starts the compiler. The diagram is a view of its code,
not a check of its mathematical content.

## Render a Markdown note

1. Open a `.md` or `.markdown` file through **MRW: Open Document…**, then view
   its Markdown preview.
2. Add a fenced `tikz` block, or use one already present in the note:

   ````markdown
   ```tikz
   \begin{tikzcd}
   A \arrow[r,"f"] \arrow[d,"g"'] & B \arrow[d,"h"] \\
   C \arrow[r,"k"'] & D
   \end{tikzcd}
   ```
   ````

3. Choose **Render diagram** below the block. The result appears above the
   action; **TikZ source** keeps the code available.
4. After changing the code, render the block again. **Render diagram
   again** recompiles a rendered block.

The action checks that the note and block still match the preview before
compiling. If the note has changed, use the refreshed preview. Ordinary-note
light and dark views follow the VS Code theme and are cached outside the note
by exact code, in extension workspace storage. Rendering does not change the
Markdown file. A failed render leaves the code and earlier cached views intact.

## Write, save and render

Saved-source annotations use the same fenced syntax, with an explicit save:

1. Open a saved source and its annotation editor under **Source details and
   tools**, or the relevant passage. Keep the appropriate author and origin.
2. Add the `tikz` block and choose **Save annotation**.
3. Expand **Reader notes (N)** and choose **Render diagram** beneath the saved
   block. Newer text in an annotation editor is not included until it is saved.
4. The SVG appears beside **Exact TikZ code**. Use **Render diagram again** to
   regenerate it.

Use `tikzpicture` for general drawings and `tikzcd` for commutative-diagram
notation. The renderer supplies `standalone`, TikZ, `tikz-cd`, `amsmath` and
`amssymb`. It also bundles the attributed Quiver 1.7.0 package for exported
curves, with no runtime download.

A bare drawing environment can omit `\begin{document}` and `\end{document}`.
A complete body can include preamble commands such as `\usepackage{pgfplots}`
when the package is installed. Do not add another document class. Use one PDF
page per block; split multipage output into separate fences. Include the closing
fence. Code in fences with other language labels remains uncompiled.

The same fenced syntax is used by Obsidian's TikZJax plugin, but MRW does not
install or invoke that plugin. Ordinary-note mathematical macros are read from
supported balanced command definitions in leading front matter. This does not
evaluate arbitrary YAML or supply a general LaTeX preamble to the note preview.
Packages required by a TikZ block must be available to its compiler.

## Appearance and color

Ordinary-note diagrams follow the VS Code light or dark theme. Saved-source
annotations also offer **Diagram appearance → Theme / Paper / Dark**.
**Theme**, the default, follows light, dark and high-contrast theme changes.
**Paper** shows the retained SVG against white. **Dark** adapts black and white
drawing values for a dark background while preserving other colors.

These are display choices: neither the source nor retained SVG is rewritten,
and no compiler runs when the theme changes. Annotation appearance is remembered
in workspace UI state. Explicit TikZ colors such as `\draw[red,thick]` and
`\node[blue]` remain unchanged; some palettes may be easier to read on Paper.

## Rendering host and bounds

Rendering requires Linux/WSL with trusted system tools under `/usr`:
**pdfLaTeX**, **Poppler** (`pdftocairo` and `pdfinfo`), **bubblewrap** (`bwrap`),
and the TeX packages required by the block. These tools are available on the
checked Debian WSL host. No TikZJax/WebAssembly engine is bundled, and native
Windows backend rendering is unsupported.

Only an explicit render action starts the tools. The job receives an isolated
filesystem containing system runtime/TeX files and a private temporary directory.
Workspace, home and vault files are not mounted. Networking is isolated,
environment credentials are absent, and shell escape and first-line engine
selection are disabled. LuaLaTeX is not used. Failure to create the sandbox
produces an error rather than an unrestricted compile.

Compilation has a 20-second total deadline, resource limits and monitored
output. A timeout terminates its process group. Multipage output fails rather
than displaying a partial diagram. Output uses a restricted, self-contained
SVG profile without scripts, external images, remote fonts or links;
unsupported output is reported.

Ordinary-note blocks are limited to 16 KiB. Annotation storage has a 16 KiB
limit for the whole annotation, a 2 MiB limit per SVG, up to 128 cached code
targets per outline, and up to 8 MiB of base retained SVGs in one reader response.
Oversized or unsupported material keeps its source code and an error message.

## Retention and failures

For ordinary notes, cached SVG views are derived data in extension workspace
storage. The note remains the source, and copying it does not copy the cached
images. Reopening can reuse an available view of identical code without the
compiler. A changed block does not display an earlier image as its own output.

For saved-source annotations, a separate `diagram-renders.json` index records
the annotation ID, exact code digest, render time, SVG digest, renderer identity
and compiler/converter fingerprints. SVGs are retained as immutable blobs.
Those fingerprints do not fully reproduce the tool and package environment.
Reopening validates the retained view without requiring the original source
file, network access or rendering tools. Restoring identical code can reuse
its earlier valid rendering.

A failed rerender preserves the previous valid output. If saving private state
has an uncertain result, further private writes are blocked; preserve unsaved
text before reloading. Supported saved-work moves include annotation diagram
indexes and SVGs. Ordinary-note diagram caches are separate workspace data.
Windows-backed private-store placement remains unqualified.

Rendering does not establish commutativity, proof validity or a dependency.
Source and annotation attribution remain unchanged. See the
[annotation-rendering checks](TIKZ_VALIDATION.md) and
[ordinary-note rendering checks](READING_REPAIRS.md).
