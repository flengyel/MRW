# Zotero references and attachments

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

This increment has no Web API transport, library writes, two-way synchronization,
bibliography refresh, user-selected citation style, shared reference store or
general PROV exporter. Resume displays at most 500 retained references; exact
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
