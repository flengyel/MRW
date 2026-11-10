# Reading Stacks Project and Kerodon sections in MRW

Use **Import Stacks Project Section…** or **Import Kerodon Section…** to retain
a published section for reading and annotation. Once imported, the section and
its saved annotations remain available offline.

Identifiers include the source: `stacks-project:08ZH` and `kerodon:0004` cannot
be confused even when two collections reuse the same tag. A stable identifier
names an item; each retained citation separately records its content revision
and exact passage. See [source identifiers](SOURCE_IDENTIFIERS.md).

## Stacks Project

For example, import [Topology, Hausdorff spaces (08ZD)](https://stacks.math.columbia.edu/tag/08ZD):

1. Open the intended MRW workspace and run **MRW: Import Stacks Project Section…**.
   Enter `stacks-project:08ZD`, `08ZD` or the canonical URL above.
2. MRW downloads the source at a pinned official Git revision. Review the
   section, revision, saved-work destination and project, then choose **Import
   section**. Cancelling leaves saved work unchanged.
3. Read **Hausdorff spaces** in the source reader. Use the statement/proof
   controls to move within the section, and **Hide proofs** or **Show proofs**
   to change the display. **Exact retained TeX for this passage** and **Open
   retained source** expose the unchanged source behind the rendering.
4. Follow a local citation, such as `stacks-project:08ZE`, to its retained
   statement. **Open original source ↗** opens the current published page.
   Chapter context and other citations are under **Source details and tools**.
5. Use **Add reader explanation / question / repair** to annotate a passage,
   supply its attribution and choose **Save annotation**. Annotations remain
   separate from the authors' text. Save before closing: unsaved reader drafts
   are not ordinary VS Code text documents.
6. Reopen with **Open Document… → Saved copy** or **MRW: Open Saved Source…**.
   Reading, annotations and citations within the saved section require no
   further download.

Reimporting a section at the same Git commit reopens its existing saved source
and annotations. A different commit creates a separate retained source; earlier
references and annotations retain their original revision and range.
**Refresh saved source** only reloads local state and annotations.

To connect a source to an Obsidian note, expand **Source details and tools →
Source links and Obsidian notes** and use **Whole source**. A passage's
**This passage** group provides the corresponding passage actions. See the
[Obsidian guide](OBSIDIAN_WORKFLOW.md) for copying MRW links and setting return
notes. Copying a Markdown link alone does not transfer its retained target.

## Kerodon

Run **MRW: Import Kerodon Section…** with `kerodon:0004` or
`https://kerodon.net/tag/0004` for Section 1.1, Simplicial Sets. Review the page
SHA-256 and saved-work destination, then choose **Import section**.

The importer retains one official section or subsection page, up to 1 MiB and
64 supported passages. It does not follow linked subsections. An individual
result page or unsupported layout produces an error rather than a substitute
outline.

Kerodon is authored by Jacob Lurie. Its retained source records the exact HTML,
SHA-256 and acquisition time. It does not claim a Git revision or apply the
Stacks Project license. Scripts and page comments are excluded from passages;
unsupported embedded media produces a warning with the exact retained HTML
still available. Display and annotation do not change the original response.

Reimporting identical bytes reopens the previous saved source and annotations.
Different bytes create a separate snapshot, while `kerodon:0004` remains the
item's identifier. Earlier citations retain their original hash and passage.
Canonical links open the current website only on request; offline reading and
annotation require no network.

In either reader, **Show backlinks** searches the selected notes folder for the
qualified item. Canonical URLs, qualified IDs and retained links may refer to
that item at different revisions. Backlinks preserve their complete references;
they do not establish that the quotations are identical.

## Stacks Project acquisition, fidelity and limits

MRW uses the official [Stacks Project Git repository](https://github.com/stacks/stacks-project).
It resolves `master` once and retrieves the chapter TeX, `tags/tags`, `COPYING`
and `preamble.tex` at that same commit. Each file is hashed and retained. The
source contains the whole chapter, while generated passages cover the selected
section. The website may show a different revision or numbering; MRW does not
combine its HTML with the retained Git source.

The combined download is limited to 2 MiB and the outline to 64 passages.
Endpoints are fixed HTTPS addresses; acquisition uses no credentials, proxies,
redirects or retries. Failed acquisition or storage leaves existing work intact.
Only an explicit import downloads material, including a reimport requested to
check a newer revision.

The adapter recognizes supported section, result and proof environments,
nested lists, labels and explicit references. It does not expand TeX macros
or included files. Unsupported source organization offers **Retain source
only**, with the limitation stated. Unsupported display constructs show the
raw fragment with a warning; unsupported mathematics shows its exact TeX.
Bundled KaTeX renders supported mathematics with trust disabled and bounded
expansion. Downloaded TeX, HTML and scripts are not executed.

Authorship is retained as **The Stacks Project Authors**. Each import includes
upstream `COPYING` (GNU Free Documentation License), the matching preamble and
tag map. Repository fixtures disclose modifications and retain the upstream
license. Editable bibliographic labels and reader annotations remain separate
from source provenance.

These imports do not provide whole-corpus ingestion, automatic updates or
diffs, annotation relocation across revisions, prerequisite synthesis or a
complete proof graph. Import and display do not check mathematical correctness.
The [saved-work storage limits](ARTIFACT_STORAGE.md) apply independently;
importing does not move the store or change mount or synchronization settings.
