# Document chooser repair — 0.22.6

The native file dialog displays filenames only. In an explicitly selected notes
folder, Open Document now uses a searchable note list showing the YAML title
and filename. The first real H1 is the fallback. Browse for another document
keeps the ordinary file/PDF dialog. No notes or retained references are rewritten.

Labels are presentation metadata. Opening still checks the selected file and
scope, preserves dirty native buffers, and uses the existing Markdown preview.
Cancellation and superseded choices preserve navigation. WSL enumerates names
and reads at most 64 KiB per header, 32 MiB in total, in one read-only Windows
process. Its filenames, base64 headers and bounds are checked by the host. A
cancelled lookup stops the worker. Native Linux uses the existing bounded note
index. Truncated or unreadable metadata falls back to filenames; Browse remains
available for other documents or incomplete folder listings.

## Checks recorded during implementation

The focused controller/parser checks cover YAML precedence, H1 outside fenced
examples, dirty-title overlays, filename/path disambiguation, cancellation,
malformed or escaping header catalogues, and a file replaced by an outside
symlink after selection. These are API/data checks, separate from native UI.

A read-only production scan of the configured Windows vault returned 2,099
Markdown notes in 6.7 seconds on the first measured run. The three supplied
number-theory note filenames carried their expected YAML titles. This is a
metadata scan measurement, not a timed human picker interaction.

## Delivery checks

- **325/325** extension regression checks passed on disposable ext4 storage,
  exit 0. Syntax and **33/33** focused chooser/document checks passed.
- Native Windows VS Code **1.144.1 / WSL** passed **4/4** checks:
  real title/H1 chooser selection, dirty-buffer/saved-byte preservation,
  cancellation, and the general Browse route. Initial row order was controlled
  in the fixture; the general file-dialog answer was injected. A window capture
  also showed the actual YAML/H1 labels and filenames. This is separate from
  the controller checks and the read-only vault measurement above.
- An earlier harness used an incorrect accept-command ID. A subsequent external
  fixture did not retain an unsaved buffer; the final fixture explicitly checked
  resource autosave was off and passed both text and saved-byte assertions.
  No production document-display code was changed for those fixture repairs.
- The established isolated VSIX verifier passed. Package size:
  **567,893 bytes**. SHA-256:
  `93125a3c3b22c9d49dd63734c22d231bad990122a892501268586cd2f0a734d1`.
  All source/media inputs match this checkout except the isolated generated
  build marker, which records 0436a96 with local changes. Development files are
  excluded. The root's existing build marker was preserved.

[Machine-readable evidence](https://github.com/flengyel/MRW/blob/af623be0a9dc85cb23dbdde610484ad886ea687a/docs/evidence/document-chooser-20261107.json) records the
checks. Installed **flengyel.mrw 0.22.6** in the WSL Debian extension host. All
**102** installed payload files match the verified VSIX, excluding installer-only
manifest metadata. The working window was not reloaded. Its active instance
adopts this build on a later normal window reload.
The separate prior reader-orientation native acceptance limitation remains
recorded in READER_ORIENTATION_VALIDATION.md.
