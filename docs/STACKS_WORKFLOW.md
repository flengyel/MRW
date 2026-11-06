# Reading Stacks Project and Kerodon sections in MRW

MRW 0.21.0 provides **Import Stacks Project Section…** and **Import Kerodon
Section…** in the existing source reader. Published tags are source-qualified:
`stacks-project:08ZH` and `kerodon:0004` name different sources. A stable ID does
not fix an immutable content revision. Retained citations preserve that revision
and exact passage separately. [Identity contract](SOURCE_IDENTIFIERS.md).

## Stacks Project
The initial example is [Topology, Hausdorff spaces (08ZD)](https://stacks.math.columbia.edu/tag/08ZD).
Use Windows VS Code connected to WSL Debian, with Python 3.11+ on the workspace
host. Keep the existing valid local artifact location. This feature changes no
mount, synchronization setting, ordinary note or original source file.

1. Open the intended VS Code workspace. Run **MRW: Import Stacks Project Section…**
   from the Command Palette. Enter `stacks-project:08ZD`, `08ZD` or
   `https://stacks.math.columbia.edu/tag/08ZD`.
2. MRW explicitly downloads a pinned official Git revision. Review the section,
   revision, effective artifact destination and affected project. Click
   **Import section**. Cancel leaves saved work unchanged.
3. The reader opens **Hausdorff spaces**. Its opening-context and statement/proof
   buttons jump directly to the nine passages. All four lemmas, 08ZE
   through 08ZH, include their hypotheses and complete proofs. Expand
   **Exact retained TeX for this passage** or **Open retained source** to see
   the unchanged source behind the mathematical display.
4. In the last three proofs, click **stacks-project:08ZE** to select the diagonal lemma's exact
   retained statement. MRW also focuses that statement in the reader. This is
   following a published citation, not a claim to have found every dependency.
   **Open canonical source citation ↗** opens the current website explicitly.
   Chapter, preceding/following section and external prerequisite citations are
   available under **Source revision, chapter context and license**.
5. Expand **Add reader explanation / question / repair** on a passage, enter
   your annotation and attribution, and click **Save annotation**. Annotations
   are separate from the authors' text. Save before closing; unsaved reader
   drafts are not ordinary editor documents.
6. Reopen the same workspace, then **MRW: Open Saved Source…** and
   choose **Hausdorff spaces**. Retained reading, mathematical display,
   annotation and the local 08ZE citations need no download. Importing the same
   section at the same Git commit reopens its existing outline and annotations.
   A different upstream commit creates a separate retained outline; earlier
   references and annotations keep their original revision and range.

Under **Outline links and Obsidian note** or a passage's **Passage links and
Obsidian note**, existing copy-link and return-note controls remain available.
See [the Obsidian workflow](OBSIDIAN_WORKFLOW.md). Document insertion creates qualified `mrw-outline:v2` links for published
items; existing `mrw-outline:v1` links still work. Copying a Markdown note alone does not
transfer its retained sources/outlines. Handwritten work remains ordinary note
attachments/references; no transcription is required.

## Kerodon

Run **MRW: Import Kerodon Section…** with `kerodon:0004` or
`https://kerodon.net/tag/0004` (Section 1.1, Simplicial Sets). Review the page
SHA-256 and saved-work destination before **Import section**. The adapter retains
one official section/subsection page up to 1 MiB and 64 supported passages; it
does not follow linked subsections. An individual result or unsupported layout
produces an error without publishing a substitute outline.

Kerodon is authored by Jacob Lurie. This acquisition records the exact HTML,
SHA-256 and UTC time; no upstream Git revision or Stacks Project license is
asserted. Display uses inert text, bundled mathematical rendering and explicit
citations. Scripts and page comments are not reader passages; embedded media
is shown as a warning with the exact retained HTML available. The original
response is kept unchanged. Canonical links open the current website only on
request. Offline reading and notes require no network.

Reimporting identical bytes reopens the prior saved source and notes. Different
bytes create a separate snapshot even though `kerodon:0004` remains the same
item ID. Earlier citations retain the original source hash and passage.

In either reader, **Show backlinks** scans the explicitly chosen notes folder
for the selected qualified item. Canonical, qualified-ID and retained links may
name that item at different revisions. Backlinks keep the complete references;
they do not assert identical quotations or check mathematics.

## Stacks Project acquisition, fidelity and limits

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
