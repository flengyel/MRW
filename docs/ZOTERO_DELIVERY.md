# Zotero delivery — 2026-11-12

[Issue #11](https://github.com/flengyel/MRW/issues/11) and
[PR #12](https://github.com/flengyel/MRW/pull/12).

Base: `0fb27bd4bb84c7b979a1f69d20d0936900ab3932`, already merged and pushed
shared history. Implementation: `b5b2622ac0561e69b94414b0b714dcbfec097c34`.
Final runtime: `f57c66510891fd68abc2e7344ddd16439073bda6`, correcting progress
cancellation reporting without masking storage errors.

## Delivered interaction

Connect Zotero chooses its host and library. Find Zotero Reference searches the
local API, retains the selected metadata and offers attachment opening, citation
insertion/copying, inspection and a link to Zotero. Resume Zotero Reference and
MRW citation links reopen the exact retained metadata and attachment offline.
The [workflow](ZOTERO_WORKFLOW.md) specifies controls, storage and limits.

Windows/WSL uses bounded read-only Windows loopback requests. No port forwarding,
SQLite reads, library writes, cloud credentials or sync service were added.
Citation insertion preserves drafts and uses one Undo operation. Opening an
attachment reuses the document/PDF reader and Return. Earlier records retain
their metadata versions, API instance and exact attachment bytes/hash. Source
citations and mathematical checking remain separate from bibliographic links.

The tutorial, READMEs and current continuation instructions were updated.
No source-store migration, genuine-note edit, Study creation/deletion, extension
installation or window reload was performed. No VSIX was built or release
published. The installed and published 0.23.12 package predates this increment.

## Checks

All commands ran serially. Host: Debian WSL2 with Windows Zotero 10.0.8.
Memory observations before and during the campaign showed about 7.5–7.6 GiB
available, no swap, and zero memory-pressure averages. Unrelated processes were
left alone.

- Focused Zotero tests initially passed 22 checks; additional interruption,
  lifecycle and changed-attachment cases brought that to 25. Both runs exited 0.
- The document controller run initially passed 38/39. The new test expected
  Reopen to reopen a PDF after Return had correctly made the note current.
  Its assertion was corrected to check restart while the PDF was current.
  The next run passed all 39, exit 0. No existing document behavior was weakened.
- One full campaign at `b5b2622` ran all **34 extension test files, 451 tests**:
  **451 passed, 0 failed, 0 cancelled, 0 skipped**, driver exit 0. It ran from a
  clean detached ext4 checkout so the artifact-store filesystem checks used
  their required filesystem. The unchanged Python bridge was staged with
  `python3 vscode/scripts/bundle-core.py` before caller tests.
- Review found that a progress cancellation would be recorded as an error.
  At final runtime `f57c665`, the focused command below passed **27 tests**:

  ```sh
  /tmp/mrw-prerelease-tools/node --test --test-isolation=none --test-concurrency=1 \
    vscode/test/zotero.test.js
  ```

  The existing activation/trust-boundary check also passed, exit 0:

  ```sh
  /tmp/mrw-prerelease-tools/node --test --test-isolation=none --test-concurrency=1 \
    --test-name-pattern='activation does no file loading' vscode/test/extension.test.js
  ```

  The full campaign was not repeated after this bounded correction. Passing
  coverage across the campaign and final checks is **453 distinct tests**.
- Syntax: `env PATH=/tmp/mrw-prerelease-tools:/usr/bin:/bin npm run check
  --prefix vscode`, exit 0. `git diff --check` passed.
- Tutorial checks passed (3/3), including in the full campaign. Markdown local
  paths, same-repository guide links, anchors and command IDs passed: **333
  targets across 10 changed Markdown files**. External HTTP statuses were not
  exhaustively checked. Zotero API documentation was consulted directly.

The serial driver ran one Node process per test file and retained each file's
log and exit status. Logs, scripts and summarized live observations are retained
under `~/.cache/mrw-zotero-20261112/`. The Python core, Lean and TeX code and
dependency pins did not change; no new full Python, Lean or TeX campaign ran.

## Windows/WSL observation

The WSL loopback probe could not connect. Windows loopback returned Zotero
10.0.8 and HTTP 403, stating that its local API was disabled. After the user
enabled the setting, the implemented Windows transport returned API version 3,
schema 44 and an instance ID. No API setting was changed by MRW.

A live search and metadata request returned Zotero-formatted citations. One PDF
location returned by the API did not exist under WSL, establishing the missing
file case. Its target was not silently changed. A separately selected available
PDF then supplied the success case in a disposable MRW store and note:

- Search selection and citation formatting succeeded.
- The 1,369,915-byte attachment was retained and its SHA-256 verified.
- The original Zotero attachment's digest was unchanged before/after.
- Citation insertion made one editor operation, preserved unsent fixture text,
  and did not save the note on disk.
- A fresh controller reopened the retained attachment with API calls disabled.
  Opening was delegated to the document reader twice.

These were production API/storage/controller observations with a VS Code API
facade. They **do not establish native desktop clicking or PDF display**. Separate
document controller tests cover reader delegation and exact Return. No additional
development-host launch or working-window reload was attempted. Missing files,
changed metadata/content and interrupted saves were also tested with disposable
fixtures; genuine library records were never changed to produce failures.

## Remaining friction and next action

Manual lookup of attachment paths, JSON editing for references and repeated
copying of bibliographic metadata are removed from this workflow. Resume no
longer needs a live Zotero connection for retained material.

The API must be enabled once. Citation insertion requires a focused Markdown
source editor; a preview reader can copy a citation or focus the note and Resume.
Attachment tabs use digest filenames. Native desktop acceptance remains unrun.
Custom Windows mount mappings, UNC attachments, cloud-only files, automatic
bibliography updates and a shared reference store remain unsupported.

The next product priority is the bounded W3C PROV notebook trial: two alternative
calculations and a failed run, retained and reopened for comparison/export.
No general PROV engine or exporter was added in this increment.
