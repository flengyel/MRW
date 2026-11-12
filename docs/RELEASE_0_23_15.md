# MRW 0.23.15 delivery — 12 November 2026

[MRW 0.23.15 — Lean lessons revised](https://github.com/flengyel/MRW/releases/tag/v0.23.15)
is published as the latest normal release.
[VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.15/mrw-0.23.15.vsix) ·
[SHA256SUMS](https://github.com/flengyel/MRW/releases/download/v0.23.15/SHA256SUMS).

The Lean introduction is now three linked lessons: Functions and composition,
Implication as a function on proofs, and Dependent application. Technical terms
are defined before use. Each lesson has its own variation and explained error;
all share the existing editable examples, solutions and note. The pack content
version is 1.1.0. The original first lesson ID and filename remain valid.

The [writing review](LEAN_LESSON_REVISION_20261112.md) records the complete
outline, source consultation, editorial findings, definition audit and checks.
It follows the requested Mathematical Writing plugin, using Knuth, Larrabee and
Roberts's Stanford report. Mathematical exposition and editorial reporting are
separate files. The detailed typing and tactic arguments remain in the lessons.

## Source and package

- Implementation: `39ff792caa89e10b278d5a2458a06c10a0f3a374`.
- Commit A: `be1aa66260336ad018a8cf666fd868644e24e4a5` — release metadata and
  current installation/download examples, with dependency pins preserved.
- Commit B: `b40ede7f285c03d1e139df326b334137a8235a30` — only the build marker,
  version 0.23.15, A's full SHA and `localChanges: false`.
- Clean B was built and tagged `v0.23.15`; these commits are on remote main.
- Package: 672,132 bytes, 146 entries.
- SHA-256: `5a28ee81c5e0121dfc0aa194b0cccc19485aa7128cd54c0a7638ba86c3d43fa0`.

The draft's VSIX and checksum were checked before publication. The public release
page, Latest API, tag target and README links were verified. Anonymous downloads
of both assets matched the tested local bytes; `sha256sum -c SHA256SUMS` passed.
Published tags and assets from preceding releases remain unchanged.

## Actual checks

At the implementation source, Lean 4.33.0 built both shipped projects in isolated
copies. All eight code blocks in the revised lessons compiled in their required
contexts. Three deliberate errors and three unfinished variations failed with
expected diagnostics. Completed Lean files retain their previous bytes, including
their declarations and toolchain. The verifier now checks the exercise/error
entries of all lessons, rather than only the first manifest entry.

Eight focused extension checks and three tutorial checks passed. The added
check selects all three lessons and verifies their prose, individual actions,
restart and preservation of shared code and notes. All 55 mathematical expressions
rendered with bundled KaTeX; all 21 local lesson links resolved. The review covered
the mathematical explanations separately from compiler checks.

Clean B used Linux Node v24.22.1 and Python 3.13.5, with
`TZ=UTC SOURCE_DATE_EPOCH=1792094267`. Dependency installation, tutorial tests,
JavaScript syntax checks, package build, package verifier, documentation links and
`git diff --check` all exited 0. The changed-document check covered 346 local,
repository, anchor and command targets in 13 Markdown files; it did not fetch
49 other external links. Source consultation and public-release checks fetched
their specified URLs separately.

The extracted VSIX passed its exact inventory, runtime-byte, manifest, license
and build-marker checks, isolated Python import and the Unicode bridge fixture.
Its three lessons and manifest matched the source. All 488 tracked paths,
481 tracked UTF-8 files and 146 package entries were searched: zero superseded
project-identity occurrences.

Production JavaScript, Python and Lean source match 0.23.14. This content revision
did not repeat their full runtime suites. The preceding 461-test extension pass
belongs to [0.23.14](RELEASE_0_23_14.md); the focused results above belong to this
revision. Native preview layout and live InfoView were not observed during this
revision. Earlier host observations remain in the original Lean delivery report.

Logs, source hashes, HTML, exit statuses and downloaded-asset checks are retained
under `~/.cache/mrw-lean-writing-20261112/`, outside tracked source. Only the VSIX
and checksum were uploaded. This subsequent report commit does not alter B or
the published package.

## Working copy and installation

The user explicitly requested revision of the open tutorial. Its first lesson
and manifest were updated after comparison with their previous bytes; two linked
lesson files were added. Originals were backed up outside the vault. The other
23 files, including notes, examples, practice files, solutions and reset originals,
matched their preceding hashes. The existing working-copy metadata remains an
accurate record of the original example version. No saved-study state, folder
setting or unrelated document was changed.

The revised local lessons can be read immediately. The VSIX was not installed
and the working window was not reloaded. To obtain the new bundled lesson menu,
install 0.23.15 with **Extensions: Install from VSIX…**, save unfinished work and
reload when requested. Intermediate releases need not be installed first.
Ordinary extension updates continue to preserve other users' working copies;
pack updates do not merge their files.

The dependency audit exited 1 with five vulnerable entries: three high and two
moderate (`markdown-it`, `@azure/identity`, `@azure/msal-node`, `@vscode/vsce`,
`minimatch`). Markdown-it is bundled runtime code; the others belong to the
packaging toolchain and are absent from the VSIX. Pins were preserved and the
findings remain unresolved, as stated in the release notes.
