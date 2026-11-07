# Obsidian note navigation — 0.22.2

Implementation: `16b815d8c192e4d018fdaf850983f188e8082fb5` and
`41df9f711702d2ac26f13996d9f2ebcace49b8d8`. The installed package preserves the
separate local reader-orientation changes; its build marker states
`localChanges: true`. Those changes remain unstaged.

Contents displays Obsidian `[[ID|label]]` labels while retaining the original
link text and exact occurrence. Navigation resolves the filename ID, preserving
ambiguity, scope, identity and revision checks. A label cannot provide a source
identifier or turn an immutable retained reference into a current web citation.
Filename lookup catalogs the selected folder without reading unrelated notes.
Backlink metadata is cached within one search; later searches recheck it.

Generated dependency directories, application metadata and deleted-note folders
are excluded. Ordinary non-Markdown attachments do not consume the candidate
entry budget. Full-text searches allow 4,096 notes within the unchanged 32 MiB
text budget; filename lookup and full-text completeness remain distinct.

## Supplied note, read only

The supplied Number Fields note has valid front matter and 11 headings. Both
of its alias links resolve to the intended existing notes. The full eligible
index completes: **2,098 notes, 15,173,034 bytes**. One incoming link is found.
There are **863 unresolved local link occurrences** across the vault, so the
backlink result remains explicitly incomplete. This is not evidence of no
additional backlinks. The supplied note and both linked notes remain byte
identical. No mathematical prose, source, annotations, studies or history were
rewritten. Private paths, quotation text and other note contents are not
included in committed tests or this evidence.

## Checks and delivery

- Focused regressions: **43 passed**, including aliases, source prefixes,
  exact Return after restart, scope, ambiguity, cancellation, a synthetic
  2,102-note collection and metadata-cache invalidation between searches.
- JavaScript syntax and the established VSIX verifier passed. All **94 installed
  files** match the verified archive, excluding installer-only manifest metadata.
- Native VS Code remote CLI accepted opening the supplied original file in the
  existing window (exit 0). No sidebar or link-click observation was performed.
  The window was not reloaded; a later activation adopts the new runtime/help.
- Package: `vscode/mrw-0.22.2.vsix`, **552,912 bytes**. SHA-256:
  `a30d0f87f0c385a9ab20aa2c566e8221f0f4d1119e1e5227027a3de3e0031333`.

[Sanitized machine-readable evidence](evidence/obsidian-aliases-20261107.json)
records the source/package identities and separates the complete note index
from the incomplete backlink result.
