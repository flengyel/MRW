# MRW 0.23.45 — Resume linked calculations

Published 17 November 2026 as a normal GitHub release and Latest:
[release](https://github.com/flengyel/MRW/releases/tag/v0.23.45) ·
[core VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.45/mrw-0.23.45.vsix) ·
[checksums](https://github.com/flengyel/MRW/releases/download/v0.23.45/SHA256SUMS).

## Source and package

| Item | Verified value |
| --- | --- |
| Source A | `4a4a8e4f1096d64a7965f5f4d9ad6db07e770dbf` |
| Release B / tag | `260270f2aed3902c21730026a17e6be4c3cca1d1` |
| A-to-B diff | Only vscode/media/build-info.json |
| Core VSIX SHA-256 | `fab0114e6595f4543b091c46c95951c2fc57df6b2b40ea15b708f15bccca0b6b` |
| Archive | 187 files; exact inventory, manifest and runtime match |

Build B was clean. The marker names A, version 0.23.45 and localChanges false.
Packaging used the documented UTC epoch, Linux Node 24.22.1 and pinned
dependencies. The core and unchanged Diagnostics 0.1.0 asset were published
with SHA256SUMS; all three public downloads match the verified local files.
Published tags and earlier assets were preserved. No package is tracked in Git.


## Changes

A retained notebook link copied by MRW could not be followed from Contents:
ordinary navigation rejected its URI scheme. Markdown preview used the external
URI route, which did not bind the exact originating occurrence. The existing
document and notebook controllers now open the saved calculation directly from
preview, Contents or a source-editor link, preserving Return across restart.
Repeated links retain distinct occurrences. Opening runs no cell and creates
no capture, study, question or execution record. The normal retained-result
command still offers evidence, comparison and export.

The actual Sage failure also exposed an example-producer defect. When its
traceback formatter failed, the kernel returned an error reply but saved only
streams; the runner wrote an inconsistent receipt. The helper now preserves the
actual error reply through nbclient's supported callback and reports failed
cells consistently. Original diagnostics remain. MRW's validation was not
weakened, and the original failed run remains in the private evidence.

## Mathematics and native workflow

For the basis (1, beta), with beta = (1 + sqrt(5))/2, two fresh Sage calculations
give discriminant 5. Constructing a number field from (t - 1)^2 fails. The linked
integral-basis argument explains why the basis (1, sqrt(5)) instead has
determinant 20, and why the field discriminant is 5.

The native VS Code 1.146.0 / WSL trial retains the exact three outputs and two
companion notes, follows repeated calculation links with exact Return,
compares the two calculations in native diff, exports three captures and three
separate producer accounts, closes all work, reloads the actual host and
recovers the unfinished note location. It then follows the supporting proof
and the retained failure without rerunning or recapturing. Source notebook
hashes remain unchanged; the trial's working note is deliberately edited and
saved through native editing.

After the user allowed window access, the requested repeat exposed missing
focus acknowledgement in the test. A fresh corrected repeat waits for native
window/editor focus and passes the complete route. The initial launcher timeout
and failed repeat remain recorded. A delayed setup window appeared after the access approval and was closed
normally. The bootstrap and all owned test windows were separately verified closed. The user's working window was neither
reloaded nor closed.

These are real saved Sage outputs and real native editors, preview, diff,
bridge storage and restart; dialog choices and navigation are scripted.
Native navigation uses Contents; preview/editor payloads are also covered by
component regressions. This
does not establish human comprehension, prove an arbitrary mathematical claim,
observe every rich-output renderer or restore a live kernel.

## Verification scope

Focused document, notebook, preview and parsing checks: 104 passed.
Producer and notebook storage checks: 13 passed.
The full Python run: 504 tests, 424 passed and 80 skipped. Skips are 58 optional
Qt, four opt-in TikZ, one authorized Windows-parent trial and 17 unavailable
Lean/checker-cache cases. Lean sources, toolchain and dependency pins are
unchanged; this repair adds no formal proof or checker claim.

The first full extension run identified a tutorial link outside its supported
guide route and a fixture that removed its directory before closing its history
writer. Both are corrected without weakening assertions. All 27 focused
rechecks pass. The full extension repeat has 663 tests: 656 passed, seven
optional checks skipped, zero failures. Production JavaScript syntax checks pass.
Changed-guide checks cover 173 relative links/anchors; all 67 formulas in the
two example notes render through bundled KaTeX. All 666 tracked/new paths and
bytes contain zero previous-identity matches. The 11 route-checker source pins
and dependency lockfile remain unchanged. The extracted VSIX passes isolated imports/CLI and three fresh packaged
bridge captures/reads through exact links without a picker or execution.
Packaged README, tutorial, manifest and marker were inspected; all 187 archive
entries have zero previous-identity matches. Local and downloaded checksums pass.

The complete mathematical writing scope is the example README and new
integral-basis note. Definitions and coefficient domains precede use, displayed
formulas use dollar delimiters and explicit multiplication, and process
commentary stays in this report. Knuth, Larrabee and Roberts's
[Mathematical Writing, Section 1](https://www-cs-faculty.stanford.edu/~knuth/papers/cs1193.pdf)
governs the exposition. Brian Conrad's
[Quadratic integer rings, Theorem 1.1](https://math.stanford.edu/~conrad/210BPage/handouts/quadint.pdf)
was consulted for the integral-basis criterion. Local formula
and link checks are separate from GitHub's client-side math rendering.

The npm audit reports two moderate and three high findings; dependency pins
were preserved. Logs, statuses, actual notebooks, export checksums and native
receipts are retained outside source under
/home/flengyel/.cache/mrw-investigation-continuity-20261116.

## Preserved work and remaining limits

No genuine note, template, saved source, annotation, study or history was
changed. The prior field-trace notes and deferred paper–Lean prototype remain.
There is no new note format, registration form, result store or evaluator.

Manual reconstruction of filenames/IDs after following a saved calculation is
removed: paste the copied link beside the argument and Return to its exact
occurrence. Clipboard insertion and companion exchange remain deliberate;
the authoring application still owns Save and notebook execution. A later note
edit can invalidate an exact pin, and saved output is not a recovered kernel.
D14 remains partial for wider investigations; D12's broader rich-output visual
acceptance and the deferred paper–Lean comparison remain open.

This release is not installed into the working window. Installation and reload
remain the user's choice after package publication.
