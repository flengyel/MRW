# TikZ diagrams in reader notes

MRW **0.10.0** adds an explicit **Render diagram** action to saved reader
annotations. The existing MRW extension remains the frontend; VS Code still
owns ordinary Markdown overviews and their editing. A diagram is a derived
reading aid, separate from source statements and checking evidence.

## Write, save and render

1. Open a saved source outline and its existing annotation editor under
   **Source details and tools**. Keep the appropriate author and supplied origin.
2. Put a `tikz` fenced block in the annotation. For example:

   ````text
   A diagram for the reader's explanation:

   ```tikz
   \begin{document}
   \begin{tikzcd}
   A \arrow[r,"f"] \arrow[d,"g"'] & B \arrow[d,"h"] \\
   C \arrow[r,"k"'] & D
   \end{tikzcd}
   \end{document}
   ```
   ````

3. Choose **Save annotation**, then open **Reader notes (N)** and choose
   **Render diagram** below that block. Rendering uses the exact saved block;
   newer editor text remains unsaved until its separate Save action.
4. The SVG appears beside **Exact TikZ code**. **Render diagram again** explicitly
   regenerates it. Saving, refreshing or reopening alone never compiles.

Use standard `tikzpicture` for general drawings and `tikzcd` for diagrams with
arrows. The renderer supplies `standalone`, TikZ, `tikz-cd`, `amsmath` and
`amssymb`. Complete bodies can include preamble commands such as
`\usepackage{pgfplots}` when the package is installed. A bare drawing environment
can omit `\begin{document}` / `\end{document}`. Do not add another document class.
Use one PDF page per block; split multiple pages into separate fences. Code
examples in other fences stay inert, and unclosed fences do not expose a render
action. Ordinary annotation prose stays literal except for its existing equations.

The fenced `tikz` syntax also occurs in Obsidian's TikZJax plugin. This increment
does not install that plugin or a VS Code Markdown-preview extension, and does
not render diagrams in ordinary Markdown preview. Copying source text transfers
neither retained MRW sources nor the private rendered SVG.

## Appearance and color

Use **Diagram appearance → Theme / Paper / Dark** beside a rendered figure.
**Theme** is the default in 0.14.4 and follows VS Code's light, dark and high
contrast themes immediately, without rebuilding notes or changing drafts.
Paper shows
the retained SVG against white. Dark adapts black and white drawing values for
the dark background; other colors stay unchanged. This is a derived display:
the stored SVG and exact source are preserved. The workspace remembers the
choice through host-local UI state, with no compiler run or artifact write.

TikZ color options such as `\draw[red,thick]` and `\node[blue]` work through the
installed TeX packages. The appearance control preserves those colored strokes.
Choose Paper when inspecting the original monochrome palette.

## Rendering host and bounds

Rendering requires Linux/WSL with trusted system tools under `/usr`:
**pdfLaTeX**, **Poppler** (`pdftocairo` and `pdfinfo`), and **bubblewrap** (`bwrap`),
plus the TeX packages used by the block. They are available on the checked Debian
WSL host. This first increment uses those native tools; no TikZJax/WebAssembly
engine is bundled. Other host configurations need their own qualification.
Native Windows backend rendering remains unsupported.

Only the explicit action discovers or starts the tools. The job gets an isolated
filesystem containing system runtime/TeX files and its private temporary work
directory. Workspace, home and vault files are not mounted; networking is
isolated, environment credentials are absent, shell escape and first-line engine
selection are disabled. It does not run LuaLaTeX. Failure to create the sandbox
is an error, with no unrestricted fallback.

The job has a 20-second total deadline, CPU/memory/file limits and monitored
output, and kills its process group on timeout. Temporary input/output stays
outside the workspace. Multipage results fail explicitly rather than showing a
partial diagram. Saved output uses a restricted, self-contained SVG drawing
profile: paths, shapes, local definitions and colors, with no scripts, external
images, remote fonts or links. Unsupported SVG output fails visibly. This is
diagram rendering, not a general LaTeX document builder.

Limits are the existing 16 KiB annotation, 2 MiB per SVG, 128 cached code targets
per outline, and 8 MiB of base retained SVGs in one reader response. Larger or
incompatible targets keep their code and a clear error; nothing recompiles
automatically. Source and diagram storage retain the existing artifact-store
permission, integrity, epoch and publication checks.

## Retention and failures

The ordinary annotation remains authoritative for its prose and code. A separate
`diagram-renders.json` index pins the annotation UUID, exact UTF-8 code digest,
renderer identifier, render time, SVG digest and compiler/converter binary
fingerprints. It stores no second prose document. SVGs use immutable
`artifact-HASH.bin` blobs and the existing synchronized mutable-index publication
rules. Tool/package environments are not fully reproduced by those fingerprints.

Reopening reads and validates the retained SVG without requiring rendering tools,
the original source file or networking. Changed code has a different digest and
cannot display an earlier picture as its own. Exact restoration of the code can
reuse its earlier valid rendering. Missing or incompatible retained material
reports an error without initializing replacements or searching another workspace.

A failed rerender preserves the previous valid output. An uncertain publication
blocks further private writes under the existing rules and reports no success;
keep any unsaved editor text before reloading. Normal supported artifact moves
include the diagram index and SVG bytes. Windows-backed storage qualification
remains deferred; no real store move is part of this feature.

Rendering creates no mathematical verification, premise, dependency or claim of
commutativity. Attribution remains with the annotation, and source navigation
keeps its existing exact retained references. See [validation](TIKZ_VALIDATION.md).
