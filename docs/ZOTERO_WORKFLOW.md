# Zotero references and attachments

Zotero remains the maintaining system for the library. Follow
[the integration contract](INTEGRATION_BOUNDARIES.md): supported lookup and
retained copies do not authorize direct database or attachment-store writes.
Reference synchronization is a design responsibility; the current local API
workflow and its limits are specified below.

Included in MRW 0.23.13. [Delivery checks](ZOTERO_DELIVERY.md) distinguish live API
observations from native desktop acceptance. Zotero manages the library; MRW reads selected references and
retains them for use in ordinary notes. No Study or question form is required.

## Connect and find a reference

1. Start Zotero. In **Settings → Advanced**, enable **Allow other applications
   on this computer to communicate with Zotero**. Set this once in the Zotero
   application that holds your library (on Windows for the Windows/WSL setup).
   Keep Zotero running for searches and new attachment reads; retained material
   can reopen offline.
2. Run **MRW: Connect Zotero…**. For Windows Zotero with Debian WSL, choose
   **Windows Zotero from WSL**, then **My Library** or a listed group library.
   Zotero on a Linux extension host uses **Zotero on this Linux host**.
3. Run **MRW: Find Zotero Reference…** and enter a title, author or phrase.
   Select a reference. Results are paged in groups of 50; the picker identifies
   each reference by title, creators, date and item key.

This first increment uses Zotero's documented read-only local API. It does not
require a cloud-synced library or an API key. MRW checks API version 3 and records
the available server identity, schema version and client version. A disabled
API reports the setting above; it does not fall back to reading SQLite.

If connecting reports **Local API is not enabled** (HTTP 403), enable that
setting in Zotero, then rerun **MRW: Connect Zotero…**. The setting is in Zotero,
not VS Code.

In WSL, requests run through a bounded Windows PowerShell process to Windows
loopback. No port is forwarded, no service is installed, and no script text is
constructed from search terms. Ordinary activation makes no Zotero request and
starts no process. The Windows connection requires WSL interop and the standard
Windows PowerShell installation. Remote SSH does not use a different machine's
loopback; choose the local connection only when Zotero runs on that host.

## Read an attachment and return

Select **Open attachment…** from the reference's actions and choose the file.
MRW retains its exact bytes and SHA-256 before opening that copy through its
existing document reader. Zotero's original stays in place. Supported files are
PDF, Markdown, plain text, TeX, Lean and BibTeX, up to 128 MiB. HTML snapshots
and other formats remain available through **Open in Zotero**.

PDFs use an installed VS Code PDF reader, or the explicit system-reader fallback.
MRW does not supply PDF page restoration or extraction. **MRW: Return to
Document** restores the originating note location when captured from the editor;
the note's unsaved text remains intact. Preview-only invocation uses the existing
Contents location, which may be a heading rather than the clicked citation.

An unavailable file or unsupported Windows path is reported; MRW never chooses
a different attachment. Windows drive-letter file URLs are mapped to `/mnt/…`;
UNC paths and custom mount layouts are not inferred. The API and the actual
file must both be accessible. Metadata availability alone does not establish
attachment availability.

## Cite in a note

Focus a Markdown note and choose **Insert citation in note**. Zotero supplies
the formatted citation using its `chicago-note-bibliography` style. MRW converts
that output to inert text and inserts a Markdown link to the retained reference,
alongside a link to the current Zotero item. This is one Undo operation. It does
not replace selected text or save the note. If the editor or selection changes
during preparation, insertion stops.

**Copy citation** and **Copy reference link** work when no editable note is
focused, including while reading a retained source. Paste the link into an
ordinary note or a reader note with its normal editor. This links the reference
without modifying the source record or creating a registration form.

The citation points to immutable bibliographic metadata, not an MRW exact-passage
citation. A DOI, item key or bibliographic citation is not a content revision or
a mathematical warrant. The separate **Zotero** link opens the library's current
item and may show later metadata.

## Citation rendering in existing notes

Native Markdown preview formats bracketed Pandoc citations such as `[@key]`,
`[see @key, p. 4]` and `[@first; @second]` through Pandoc/CSL. It generates a
bibliography in the view. Note text, YAML, positions, dirty buffers and Return
remain unchanged; no bibliography is appended to the file.

Install a trusted Pandoc executable on the workspace host. An empty **MRW:
Citation Executable** uses `pandoc` on PATH. If that command is missing under
WSL, MRW tries `pandoc.exe` on the host PATH; a Windows installation can therefore
be reused. An explicit executable path remains available in trusted settings.
Executable paths in notes or Obsidian configuration are never run.

**MRW: Citation Source** selects `auto` (the default), `bibliography` or `zotero`:

- A note's `bibliography` or inline `references`, or an explicit **Citation
  Bibliography** setting, takes precedence in every mode. It can select a fixed
  local export. Resources resolve beside the note within its selected
  notes/workspace root. CSL-JSON and BibTeX/BibLaTeX are processor inputs.
- In `auto`, MRW reads the selected vault's Pandoc Reference List configuration.
  If that companion selects live Zotero lookup, MRW uses its selected Better
  BibTeX library IDs. A connected personal Zotero library can also select this
  route. Otherwise MRW uses the companion's scoped local bibliography.
- `zotero` explicitly selects live lookup. **Citation Zotero Libraries** can
  select up to eight Better BibTeX library IDs; these are not Zotero Web API
  group IDs. An empty setting reuses the companion selection, or Better
  BibTeX's My Library default when no companion selection applies. An empty
  companion library selection is reported rather than broadened silently.

Live formatting requires Zotero running with **Better BibTeX** enabled. MRW asks
its documented read-only `item.pandoc_filter` method for only the keys in the
note, within the selected libraries. It neither searches by title nor exports
the whole library. Under WSL the Windows transport uses fixed Windows loopback;
it does not forward the Zotero port. The lookup records when metadata was read.
The snapshot notice includes the read time, selected library names and Better
BibTeX IDs, and whether lookup used Windows or local Zotero. Library names come
from the read-only `user.groups(false)` metadata method; it requests no
collections or item text. Only selected libraries appear. Name lookup has a
shorter timeout; if unavailable, resolved citations still display with their
selected IDs. The default personal-library scope remains labelled My Library.

The supported live API does not expose a library database filename or path.
When a bibliography export is actually read, the notice lists its filename,
relative to the selected notes/workspace folder, including on an offline
fallback. An export configured but unused by live lookup is not labelled as its
source. Inline references identify the note containing them.

A citekey or library ID is not an immutable revision: this preview is a current
metadata snapshot, separate from MRW's retained reference records.

If live lookup is unavailable in `auto`, a configured local export may be used
with an explicit unavailable/stale-snapshot notice. `zotero` reports the failure.
A successful live reply reporting a missing key never substitutes an older
export. Missing and duplicate keys remain visible and labelled unresolved or
ambiguous. Open Zotero, correct the selected library or export, then choose
**MRW: Refresh Citation Preview**. Returning focus to MRW also refreshes open
notes. Lookup and formatting are asynchronous; the raw citation can appear
briefly before the result arrives.

**Citation Style**, or the note's `csl` metadata, can select a local independent
CSL style inside the same scope. Empty style uses Pandoc's default. MRW does not
download remote or dependent styles, execute document filters, rewrite citekeys,
or write to Zotero. Standalone narrative `@key` remains unsupported. Markdown
links, escaped examples, inline code and fenced examples keep their behavior.

Processing is serialized and bounded to 4 MiB notes/resources/output, 128 citation
groups and 128 distinct keys. Pandoc subprocesses time out after 15 seconds;
the Windows lookup has a 12-second outer timeout. Results for an older buffer
version, closed document or disposed extension are discarded. Citation-file and
configuration notifications refresh derived rendering. External selected notes
folders are watched separately from the workspace.

Reader annotations use the same selected source and processor in the saved
source reader. Their text and attribution remain exact. Safe Markdown links
remain links; no automatic source-to-Zettel association is created.

The maintainer's unchanged Number Fields note now displays **(Marcus 2018)** for
`[@marcusNumberFields2018]` through Windows Zotero / Better BibTeX. Its local
export lacks that key; live lookup resolves the selected item. Native WSL preview
and dirty-buffer preservation were observed in an isolated window. See the
[repair and verification account](CITATION_ZOTERO_REPAIR.md).

The adapter reuses Pandoc parsing and CSL formatting in VS Code's existing
preview. API contracts: [Better BibTeX JSON-RPC](https://retorque.re/zotero-better-bibtex/exporting/json-rpc/),
[Pandoc citations](https://pandoc.org/MANUAL.html#citations), and
[VS Code Markdown extensions](https://code.visualstudio.com/api/extension-guides/markdown-extension).

## Resume and inspect

**MRW: Resume Zotero Reference…** lists retained references, with the last one
first. Select one to reopen its metadata or retained attachment offline. It also
discovers completed records if saving the last-selection pointer was interrupted.
Clicking its MRW citation link reopens that exact record. Links name the workspace;
open that workspace before following a link belonging to it.

**Inspect retained reference** shows the complete record as text: library scope,
item and attachment keys, local metadata versions, API instance, acquisition time,
origin and attachment hash. **Return to originating note** restores the recorded
note location if its text still matches. Edited notes are never replaced with a
saved copy to make Return succeed.

**Read current metadata** explicitly creates a new reference. Earlier citations
remain pinned. If metadata changes before an attachment is retained, MRW stops
and asks you to select current metadata. Changed attachment bytes produce a new
hash; a retained copy still reopens the earlier bytes. Open the current item in
Zotero to inspect changes to the original.

## Storage and limits

The workspace's host-local MRW storage contains `zotero-v1/references/` and
`zotero-v1/attachments/`. Records are immutable, digest-named JSON; attachments
are digest-named files. Completed bytes are synchronized and verified before
acknowledgment. Partial staging files are not read as records. The original
Zotero files are never written, moved or deleted. Study archive/deletion does not
own or remove these references or attachments.

Local version counters belong to the recorded Zotero instance and are not Web
API versions. Older local APIs without a server ID are labelled with a missing
identity, not assigned an invented one. Their metadata bytes are still retained;
automatic cross-instance matching is unavailable.

The retained-reference workflow has no Web API transport, library writes,
two-way synchronization, shared reference store or general PROV exporter.
Citation-preview refresh and local CSL selection are separate from retaining
references. Resume displays at most 500 retained references; exact
links remain usable beyond that list. Library selection lists at most 100 groups.
Read operations and records are bounded; narrowing a search is required if a
response exceeds 4 MiB. Attachment tabs currently display digest filenames.

## Provenance mapping

Under the [common model](PROVENANCE_DESIGN.md), retained metadata and attachment
bytes are entities. Acquisition is the read activity, associated with MRW and
the recorded Zotero API instance. `acquiredAt` records observation time;
`derivedFrom` links an attachment-bearing reference to its bibliographic snapshot.
The note location records where the reader invoked the interaction. These fields
record origin and derivation of copies; they do not assert mathematical truth,
comprehension or proof. This mapping adds no general PROV storage/export service.

API references: [Zotero local API](https://www.zotero.org/support/dev/web_api/v3/local_api)
and [API v3 read requests](https://www.zotero.org/support/dev/web_api/v3/basics).
