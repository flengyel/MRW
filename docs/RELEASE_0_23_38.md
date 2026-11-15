# MRW 0.23.38 — Working with Lean examples

Published 14 November 2026 as a normal release, marked Latest:
[release and checksums](https://github.com/flengyel/MRW/releases/tag/v0.23.38).

## Source and downloads

- A: `fa056681eacec04fd4c3d97118f8b928e9dc40f8` — revised lessons, tutorial, guides and version metadata.
- B/tag `v0.23.38`: `bcb1eaeb3a5888dc70251592807919cdb8b0c4e0` — only the build marker, naming A with `localChanges: false`.
- Clean-B build: Node 22.23.5, UTC, `SOURCE_DATE_EPOCH=1792094267`.
- [Core VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.38/mrw-0.23.38.vsix), SHA-256 `49a1798fa60a7462c243bf27c0b1873511f9c9c64b82c836e7e0a59b5d284a0b`.
- Diagnostics 0.1.0 is unchanged, SHA-256 `4b4c5a3844273a24f635edea2de232bc2460c7599b91ca28f287d31f713d91f6`.

Main and tag were pushed before drafting. Both VSIX assets and `SHA256SUMS`
were checked before publication, then downloaded through public URLs and
compared with local bytes. Both checksums pass; Latest resolves to 0.23.38.
Earlier tags/assets remain intact. This later report does not alter the package.

## Delivered guidance

Lean foundations pack 1.1.3 identifies `Study/Examples.lean` as the editable
file and distinguishes it from the Markdown lesson's displayed code. The first
interaction opens the official InfoView, inspects the `#eval` message `14`,
changes the input from 2 to 3 to observe `16`, and undoes the edit. Lean checks
as the reader edits; there is no extra Run operation for these examples.

The instructions distinguish `#check` type messages, `#eval` computation messages
and remaining proof goals. The implication lesson gives cursor positions around
`intro`, `have` and `exact`. The dependent-application lesson identifies `h`, `a`
and the later `#check` message to inspect. The separate Practice files, underscore
holes, expected diagnostics, solutions and Undo are named explicitly.

The ordinary native Lean command avoids an extra shared-lesson picker when
all three lessons use the same example file. No runtime command, proof panel,
exercise form or storage format was added. The mathematical sequence and
statements remain unchanged. See the separate [writing review](LEAN_EXAMPLE_INTERACTION_REVIEW.md).

## Verification

| Check | Actual result |
| --- | --- |
| Existing Lean lesson and tutorial suites | 13 passed, no skips; exit 0 |
| Complete built-in and external lesson projects | Both build with pinned Lean 4.33.0; exit 0 |
| Three deliberate errors and three unfinished variations | Expected type-mismatch/placeholder diagnostics; each exits 1 |
| Temporary input-3 computation | Outputs 16; exit 0 |
| Temporary variation A with its hole filled | Compiles; exit 0 |
| Source preservation | 9 Lean files, 10 code/goal blocks and 55 mathematical expressions unchanged |
| Programmatic Markdown/KaTeX rendering | All 3 lessons and 55 formulas pass |
| Changed Markdown local files/anchors | 193 checked, none missing |
| Pinned Linux npm installation | Exit 0 |
| Pinned npm audit | Exit 1: 2 moderate, 3 high, none critical; pins unchanged |
| VSIX inventory, runtime, licenses and clean build marker | Exit 0 |
| Tracked paths/text and extracted VSIX searched for superseded names | 0 matches |
| Extracted Python CLI, isolated bridge note restart and exact retained reference | Passed |
| Public package bytes and checksums | Both VSIX assets match local bytes and pass |

All compiler trials used disposable copies and the already installed pinned
toolchain. No personal example, note, copied lesson or vault file was written,
and no global toolchain setting was changed. Tests and private evidence remain
outside maintained source and release assets.

The installed official Lean extension 0.0.242 confirms the documented command
displays the goal and messages at the current position. A new native window,
InfoView cursor/Undo trial and full runtime campaigns were not run for this
content-only change. The rendering checks are programmatic, not native layout
observations. Compiler checks concern the formal statements; informal
correspondence remains a separate judgment.

Archive comparison with 0.23.37 finds changes only in README/tutorial, three
lesson Markdown files, pack content version and manifest/build metadata.
JavaScript, Python, Lean and toolchain/dependency bytes are unchanged.

## Existing copies and installation

The new instructions apply to the current working examples immediately.
Installing the core VSIX updates the bundled tutorial and pack for new working
copies. **MRW: Open Tutorial** displays the current packaged guidance after
activation. Existing copied lessons retain their text and version, preserving
personal edits; an extension update never silently replaces them. The
[current workflow guide](LEAN_STUDY_WORKFLOW.md#files-and-live-goals) also supplies
the steps independently of those copies.

Save unfinished work, install 0.23.38 on the Linux/WSL workspace host and reload
when ready. Diagnostics needs no update. Publication did not install into or
reload the working window. Live feedback requires the official Lean extension
and pinned toolchain on that host; ordinary MRW reading remains independent.
