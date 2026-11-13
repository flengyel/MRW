# MRW 0.23.23 — Zettels while reading

Published as a normal release and Latest:
[release](https://github.com/flengyel/MRW/releases/tag/v0.23.23) ·
[VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.23/mrw-0.23.23.vsix) ·
[checksums](https://github.com/flengyel/MRW/releases/download/v0.23.23/SHA256SUMS).

- Final source A: `ee76ac89b5addb6f6f53306bd8f794e4f11b6bcd`.
- Marker-only B and tag: `5898b81eac47054a8667e69900948b99b122e607`.
- VSIX SHA-256: `94ca5735115ac6fd693ff939be4865c5218b4bfc7fed406573be1df3138dc789`.
- Built from clean B, with A in the marker and `localChanges: false`.

## Changes

New Zettel opens an ordinary unsaved Markdown buffer beside the document being
read. Ctrl+S saves it to the selected notes folder. Proposed filenames use a
configurable prefix and local timestamp, with collision suffixes. The default
text has a heading and relative source link only. MRW: Zettel Template accepts
literal placeholders for title, quoted YAML title, filename ID, source link and
cursor position. It executes no template code. Existing notes require no
particular format, YAML properties, title/ID relationship or section headings.

Recent Notes keeps up to thirty opened or saved notes by title and filename in
existing workspace state. It preserves each entry's root and canonical path,
uses dirty text for current titles, reports failed history publication and
rechecks selected files before opening. It does not scan the vault or duplicate
note contents. Return to Document preserves the source location where known;
a PDF return reopens the file. The commands appear in the MRW Document menu,
sidebar and Command Palette. The bundled tutorial and current guides describe
the workflow and its bounds.

This release includes the [0.23.22 startup repair](RELEASE_0_23_22.md), which fixed
the activation failure leaving Study Lean 4 and Find Zotero Reference unavailable.

## Verification and source state

- At `0e51694bbe45fb538a8a31aeccafc884fa249604`, the full serialized extension
  suite passed **532 tests**, without skips or failures. Python ran **442 tests**
  with **68 optional skips** and no failures. All Python source is unchanged in B.
- Subsequent changes corrected the native test harness and implemented the
  user's instruction not to impose the maintainer's note format. Among production
  JavaScript files, only `zettelNotes.js` changed after that full pass; the manifest,
  documentation and relevant tests were also updated.
- On final B, **71 focused tests** passed: ten note/template checks, 53 document
  checks, two menu checks, three tutorial checks and three activation/menu command
  checks. Syntax checks passed. Cases include cancelled input, changed origins,
  filename collisions, concurrent draft creation, dirty text, failed publication
  and retry, restart, changed roots, deleted/redirected files and literal template
  substitution without code execution.
- A separate native Windows VS Code 1.146.0 / WSL Debian host activated final B,
  registered all **113** contributed commands, completed Show Contents and
  cancelled Study Lean normally. A Zettel began as an assigned-path untitled
  document and saved successfully through the actual VS Code API; source bytes
  were unchanged. Only the title answer was deterministic. This was not a manual
  click through the document menu or a live Zotero query. The test host exited 0.
- The first native Save harness enumerated a proposed API getter and failed.
  Its report was retained; the corrected harness and final template run passed.
  Earlier successful test reports remain separate from final acceptance.
- Clean package inventory/runtime verification, manifest/build marker inspection,
  the extracted Node-to-isolated-Python bridge and **329** rendered local Markdown
  links/anchors passed. The archive contains the final configurable template and
  tutorial. Tracked paths/text and extracted package bytes had zero superseded
  project-identity matches.
- Both published assets were downloaded anonymously, matched local bytes and
  passed their checksum. Public tag target, normal-release status, Latest redirect
  and versioned README link passed.

Dependency pins are unchanged. `npm audit` exited 1 with five existing findings:
three high and two moderate. Evidence, logs, source hashes and exit statuses are
retained outside the repository under `~/.cache/mrw-zettel-20261113/`.

## Independence and preservation

The standalone `flengyel/Zettel` README was corrected separately in
[`258cb7b3853e59bc32a2c2227bf64f4d3f23b912`](https://github.com/flengyel/Zettel/commit/258cb7b3853e59bc32a2c2227bf64f4d3f23b912).
Its MRW instructions and repair-process commentary were removed; the format
example, templates, scripts and licenses are unchanged. Its format is optional
for MRW and is not a runtime dependency. The user's vault was not modified.

Existing reader annotations, retained references, studies and ordinary files
were preserved. No note conversion, installation or reload of the working window
was performed. VS Code owns editing, Save, conflicts, Undo and draft recovery.
Recent Notes is workspace-local; it does not import Obsidian's activity history.
Relative links need updating if their files move independently. MRW does not
record a PDF page or supply OCR. No mathematical checking is claimed.
