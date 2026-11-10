# Source readers and plugins: verification, 10 November 2026

Runtime source: `991c4704d9316bff1abb14216c40f97c68662f46`, with the matching
0.23.9 release metadata. The independently deliverable reader repair is
`d90b7cb`; API 1, external examples and nLab are `1356a58`. Follow-up commits
`bb092ed` and `991c470` cover import boundaries, retained citation actions,
managed-write retry, Unicode bounds and isolated SVG IDs. No genuine source
records or notes were rewritten. The working window was not installed into or
reloaded.

## Readers

A separate VS Code 1.145.2 host on WSL Debian visibly displayed the live official
Stacks Project `08ZD` and Kerodon `0004` sections inside the ordinary reader.
Native Commands remained present with a document and populated Contents open.
Captures and DOM probes are outside the repository. Acquisitions in that host
used synthetic Stacks bytes and previously captured official Kerodon/nLab HTML;
the two embedded websites loaded live. This separates native embedding evidence
from acquisition tests.

Shared-reader checks cover explicit network entry, retained iframe identity,
drafts, Return, origin validation and child-frame rejection. Existing reader
checks cover selection, unsaved annotation restoration and proof folding;
proof-graph checks cover its shared Stacks frame and message isolation.

## User installation and saved work

Copied the example JSON profile outside the installation; installed the Python
entry-point example into a separate configured virtual environment. Both used
the bundled isolated bridge to acquire live Kerodon `0004` and retained 27
passages. Registrations were explicitly added, then removed; saved imports still
reopened. Hashes of extension files before and after agreed. No MRW edit, VSIX
rebuild or working-window reload was needed. This example reuses Kerodon under
example namespaces; it is not a Clowder compatibility claim.

Regression checks cover namespace conflicts, API rejection, invalid registration
isolation, plugin removal/upgrade, offline notes/citations, explicit derived
reparse, repeated/changed imports, foreign tickets, altered byte hashes and
managed-store failed-write retry. Existing Stacks/Kerodon identities and retained
links remain supported. Generic import uses API 1; the older immutable MRW
format readers preserve genuine saved records.

## nLab

The inspected official `adjoint functor` page retained all 834,328 acquired bytes
(SHA-256 `62eee32e0df46ed245e69da146a646dbe481ac6ca5beffe948b355ac041d5479`).
Its mathematical projection has 66 headings plus an introduction, 542 MathML
expressions and 19 SVG diagrams, with no unsupported-content warnings in this
sample. The source also contains sidebar mathematics and a logo, excluded from
the reading projection. Native DOM probes confirmed those equation/diagram
counts and the explicit embedding-limit message. nLab sends
`X-Frame-Options: DENY`; its Original page is browser-only.

The official numbered-revision URL for revision 156 was independently acquired
(377,673 bytes); the exact footer Cite URL confirmed the requested revision.
No current revision number was inferred from a previous-revision link or Git
mirror. Synthetic cases cover missing fragments, subsection boundaries,
Unicode/plus/slash encoding, local anchors, unsupported media, executable XML
rejection and repeated SVG IDs in different passages.

## Checks

- Full Python suite: **430 tests, exit 0**, actual Qt widgets and isolated TikZ
  checks enabled. One test skipped because no disposable mounted-Windows-project
  parent was authorized.
- Full extension suite: **371 tests, exit 0**. Final focused source identity,
  ordinary reader and proof-frame batch: **44 tests, exit 0**.
- Syntax check and changed relative Markdown links passed (296 checked before
  this report). Tracked-path/text audit found no superseded project identity.
- Pinned dependency installation passed. npm audit reported **2 moderate and
  3 high** findings in the build dependency tree: `@azure/identity`,
  `@azure/msal-node`, `@vscode/vsce`, `markdown-it`, `minimatch`. Pins were preserved;
  bundled Markdown rendering also uses the pinned markdown-it version.

Logs, initial failed checks, captured pages, screenshots and disposable stores
remain outside maintained source under `/tmp/mrw-plugin-evidence`,
`/tmp/mrw-source-native-20261110`, `/tmp/mrw-plugin-external` and
`/tmp/mrw-nlab-final`. Release packaging uses the clean A/B procedure in
[RELEASING](RELEASING.md); the package digest, A/B SHAs and published-asset checks
belong to the release notes and final delivery record.

## Limits and remaining awkwardness

nLab embedding is unavailable, and its supported HTML/XML vocabulary and import
bounds are finite. Unsupported content has a visible fallback. Executable
adapters are trusted code, not sandboxed. Explicit reparse creates a separate
copy and does not move annotations; earlier-format imports remain readable but
cannot use that new reparse path. Clowder and PreTeXt remain candidates.

Commands may need scrolling in a short sidebar. Configuring a Python environment
is still required for executable adapters. These checks establish retained bytes,
structure, navigation and rendering, not mathematical correctness.
