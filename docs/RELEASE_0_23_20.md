# MRW 0.23.20 — retained notebook results

Published as a normal GitHub release and Latest:
[release](https://github.com/flengyel/MRW/releases/tag/v0.23.20) ·
[VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.20/mrw-0.23.20.vsix) ·
[SHA256SUMS](https://github.com/flengyel/MRW/releases/download/v0.23.20/SHA256SUMS).

- Source A: `b307fc54d9594ac3e3fb6571d055f41ca877fcda`.
- Marker-only B and tag target: `ed9cc0d446ab094a71be3474eb7dd09c37b7ca3c`.
- VSIX SHA-256: `f15dd1bf9777dd027e2281550604bd6452a4a91e8f8ccf6b60e5e687aec8163e`.
- Built from clean B. The embedded marker names A, version 0.23.20 and
  `localChanges: false`. Neither published earlier assets nor tags changed.

## Delivered workflow

Retain a saved notebook and selected companion files; reopen its exact text
results; compare alternatives with VS Code's diff view; copy a result link; export
named PROV-O accounts with exact artifacts; delete a selected retained copy.
Existing private publication, file locking and usage history are reused. Dirty
selected documents require saving; no notebook execution or automatic save occurs.
No question, problem or study registration was added. See the
[workflow](NOTEBOOK_RESULTS.md) and [profile](NOTEBOOK_PROVENANCE_PROFILE.md).

MRW-observed capture and producer-reported execution are distinct accounts.
Without a receipt, saved outputs have unknown execution context. Code/output
receipt mismatches are rejected. Integrity and structure do not check mathematics.
Deletion publishes an opaque marker before removing the selected copy. Recovery
finishes interrupted deletion and prevents a stale copied result from reappearing.
Original notes, notebooks, other results, studies and separately exported copies
are preserved.

## Actual trial and checks

Three new notebooks ran in separate fresh kernels in the running SagePod 10.10
container. Existing kernels and container configuration were untouched. The
trace-matrix and resultant methods both returned discriminant 5 for the basis
(1, (1+sqrt(5))/2). The reducible-polynomial construction returned a saved error
and runner exit 1, as intended. Its receipt identifies a failed run.

The final extracted VSIX launcher retained all three notebooks with their
ordinary explanatory note. Every action used a new Python process. Reopening
preserved exact code, outputs, errors and companion text. Export produced six
separate accounts, three captures and three producer reports; all artifact and
manifest digests matched. RDFLib 7.1.4 independently parsed every Turtle file
and checked the declared Entity/Activity relation directions. This is not a
full PROV-CONSTRAINTS validator. Deleting the failed retained copy left both
other results and all original trial files available.

- Full extension regression pass: **514 passed**, no failures or skips.
- Full Python suite on clean B: **442 tests**, **68 optional skips**, no failures.
- The final notebook module differs from the earlier full-suite snapshot only
  in URI serialization and capture software identity. On clean B, all **7**
  notebook host checks, the real-bridge extension command check and **10** core
  notebook checks passed. Other extension runtime bytes match the full pass.
- Syntax, tutorial, exact VSIX inventory/runtime verification, fresh wheel
  installation, isolated import and CLI checks passed.
- Tracked paths/text and extracted VSIX: **zero previous-identity matches**.
- Changed Markdown link check: **375 local targets resolved**.
- Final package checksum passed. Public assets were downloaded anonymously and
  matched the local VSIX and checksum file. Public tag, normal-release status,
  Latest redirect and versioned README link were verified.

The first preparatory run used a temporary filesystem and an unbundled backend;
its failures were retained in the local logs, then the full suite was run from
a persistent isolated checkout with the bundle prepared. The real trial exposed
a mismatch between Jupyter's in-memory strings and serialized output arrays;
the example runner now hashes the saved representation. An archive inspection
also corrected the checker's assumption about VSCE's lowercase `readme.md` name.
No evidence from those attempts was presented as a passing final check.

Dependency pins did not change. `npm audit` returned 1 with the same five
findings: three high and two moderate, covering `@azure/identity`,
`@azure/msal-node`, `@vscode/vsce`, `markdown-it` and `minimatch`.
The bundled runtime includes `markdown-it`; the others are build dependencies.
No automatic dependency upgrade was made in this increment.

## What became easier, and what remains awkward

MRW now performs the retained-copy bookkeeping, exact revision checks, reopening,
comparison selection and provenance export. The reader need not maintain a
separate list of result filenames, write provenance JSON or duplicate an
explanation in a form. The explanation stays in its note or notebook.

A producer receipt still requires the explicit helper invocation; normal notebook
execution followed by retention preserves outputs with unknown context. MRW does
not collect arbitrary external dependencies or kernel memory. Its transcript
shows text and errors; rich plots and widgets require the retained notebook from
an export. Result links belong to their workspace. These are concrete boundaries
for subsequent notebook improvements, not claims of complete reproducibility.

Native desktop interaction was not observed. Interface checks used VS Code API
doubles with the real isolated bridge. Sage execution and packaged backend checks
were actual host operations. No installation, reload, workspace switch, genuine
study deletion or vault edit was performed. The working VS Code window was
preserved. This release must be installed separately to activate its commands.

Logs, exit statuses, package acceptance, trial receipts and public-download
verification are retained under
`~/.cache/mrw-notebook-provenance-20261112/`. Only the VSIX and SHA256SUMS were
uploaded as release assets. The mathematical note's
[writing review](NOTEBOOK_TRIAL_REVIEW.md) is separate from runtime validation.
