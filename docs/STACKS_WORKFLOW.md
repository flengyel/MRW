# Reading a Stacks Project section in MRW

MRW 0.8.0 adds one explicit section importer to the existing source reader.
The initial example is [Topology, Hausdorff spaces (08ZD)](https://stacks.math.columbia.edu/tag/08ZD).
Use Windows VS Code connected to WSL Debian, with Python 3.11+ on the workspace
host. Keep the existing valid local artifact location. This feature changes no
mount, synchronization setting, ordinary note or original source file.

1. Open the intended VS Code workspace. Run **MRW: Import Stacks Section…**
   from the Command Palette. Enter `08ZD` or
   `https://stacks.math.columbia.edu/tag/08ZD`.
2. MRW explicitly downloads a pinned official Git revision. Review the section,
   revision, effective artifact destination and affected project. Click
   **Import section**. Cancel leaves saved work unchanged.
3. The reader opens **Hausdorff spaces**. Its opening-context and statement/proof
   buttons jump directly to the nine source regions. All four lemmas, 08ZE
   through 08ZH, include their hypotheses and complete proofs. Expand
   **Exact retained TeX for this passage** or **Open retained source** to see
   the unchanged source behind the mathematical display.
4. In the last three proofs, click **08ZE** to select the diagonal lemma's exact
   retained statement. MRW also focuses that statement in the reader. This is
   following a published citation, not a claim to have found every dependency.
   **Open canonical Stacks citation ↗** opens the current website explicitly.
   Chapter, preceding/following section and external prerequisite citations are
   available under **Source revision, chapter context and license**.
5. Expand **Add reader explanation / question / repair** on a passage, enter
   your annotation and attribution, and click **Save annotation**. Annotations
   are separate from the authors' text. Save before closing; unsaved reader
   drafts are not ordinary editor documents.
6. Reopen the same workspace, then **MRW: Open Saved Source Outline…** and
   choose **Hausdorff spaces**. Retained reading, mathematical display,
   annotation and the local 08ZE citations need no download. Importing the same
   section at the same Git commit reopens its existing outline and annotations.
   A different upstream commit creates a separate retained outline; earlier
   references and annotations keep their original revision and range.

Under **Outline links and Obsidian note** or a passage's **Passage links and
Obsidian note**, existing copy-link and return-note controls remain available.
See [the Obsidian workflow](OBSIDIAN_WORKFLOW.md). Ordinary overview insertion
and `mrw-outline:v1` links work as before. Copying a Markdown note alone does not
transfer its retained sources/outlines. Handwritten work remains ordinary note
attachments/references; no transcription is required.

## Acquisition, fidelity and limits

The sole online route uses the official
[stacks/stacks-project Git repository](https://github.com/stacks/stacks-project).
MRW resolves `master` once through GitHub's ref endpoint, then retrieves the
chapter TeX, `tags/tags`, `COPYING` and `preamble.tex` at that same 40-character
commit. Each exact file is hashed and retained. The source includes the whole
chapter; generated regions cover the selected section only. Stable tags identify
items; they do not identify immutable text. Git revision, retrieval time,
SHA-256, authors and canonical URLs stay available offline. The website may
publish a different revision or numbering; the reader does not combine its HTML
with Git source. The published unstable website API is not used.

The combined acquisition is limited to 2 MiB, each response to the existing
source limit, and the outline to 64 regions. HTTPS endpoints are fixed; no
credentials, proxies, redirects or retries are used. A failed acquisition or
publication leaves existing work intact. Downloads happen only through the
explicit import action, even when reimporting to check today's revision.

The bounded adapter recognizes section/result/proof environments, nested lists,
labels and explicit references. It does not expand TeX macros or includes.
Unsupported structural constructs offer **Retain source only**, with the precise
limitation and no fabricated complete outline. Unsupported display constructs
show the complete raw fragment with a warning; unsupported mathematical
expressions show exact TeX. KaTeX 0.19.0 is bundled under MIT and emits native
MathML with trust disabled, bounded expansion and fresh macro state. Source
prose is inert text. No downloaded TeX, HTML or scripts execute; no model,
compiler, Lean checker, notebook, container or automatic browser request starts.
This is a source adapter, not a universal TeX parser or new editor.

The authors are **The Stacks Project Authors**. Upstream `COPYING` (GNU Free
Documentation License) is retained with each import, alongside matching preamble
and tag map. Redistribution fixtures disclose their modifications and retain
that license. Source authorship classification remains unknown rather than
inferring an AI-use status. Source provenance and attribution remain separate
from editable bibliographic labels and reader annotations.

Whole-corpus ingestion, automatic updates/diffs, cross-version annotation
relocation, prerequisite synthesis, complete proof graphs and vertex elimination
remain outside this increment. No mathematical verification or benefit claim
follows from import. Existing [artifact storage limits](ARTIFACT_STORAGE.md)
remain separate: Windows-backed synchronized real-store placement is still
unqualified, and no real store is moved by this feature.
