# Stacks section import validation — 2026-10-21

Started from clean main/origin `d50dfbff8e7b7e58ebcab4f8cd9f203bf6e9dc67`,
installed `flengyel.theorem-terminal@0.7.0`. The saved user prompt explicitly
advances bounded ingestion and puts storage qualification aside. No intervening
commit/unrelated edit was replaced. [Usage and limitations](STACKS_WORKFLOW.md).

## Source inspected and retained

Verified the official [08ZD section](https://stacks.math.columbia.edu/tag/08ZD),
[stable tag documentation](https://stacks.math.columbia.edu/tags) and
[published API documentation](https://stacks.math.columbia.edu/api). The API is
marked unstable and is not used. One production acquisition route resolves the
[official repository](https://github.com/stacks/stacks-project)'s master ref,
then retrieves all source/metadata at that commit. The actual online host import
retained **`a04446e57ec1fbc252a871afcec7752fb2807b14`**:

- Complete `topology.tex`: 237731 bytes, SHA-256
  `c6bac8dcf8ad96dc47416bf34cb45ba4a10b894e40d67d3e1fa68d8ef0d9f872`.
- Matching complete `tags/tags`, `preamble.tex` and `COPYING`, with hashes,
  retrieval UTC time and source structure in an immutable supporting manifest.
- The Stacks Project Authors, canonical section/item URLs, chapter context and
  upstream GNU Free Documentation License retained. KaTeX 0.19.0 MIT renderer
  bytes/license are pinned and checked separately by the VSIX verifier.

Nine generated regions contain opening context and four complete statements
and proofs (08ZE–08ZH). Exact statement/proof environments include labels and
references; the last three proofs retain their explicit 08ZE citations. This
is published structure, not a complete proof graph. All original retained
chapter bytes remain accessible independently of display/annotation.

## Automated evidence

Seventeen focused Python cases pass: complete retained bytes/environment
boundaries, all tags/hypotheses/context/proofs/citations/license; offline reopen
and exact selection; same-revision reuse with annotations and note association;
changed-revision separation; changed range preserving earlier pinned links;
malformed input, item tags and mismatched source/tag map; packet tampering/wrong
workspace; unsupported syntax/source-only retention/full-fragment display;
failed download/publication; size/redirect/tag-map limits; a different section;
Unicode/CRLF; unavailable metadata; nested lists/comments/inert prose; incomplete
proof boundaries. One Linux disposable relocation/adoption case checks imported
dependencies/old references/reimport compatibility; it does not repeat or qualify
the Windows-backed synchronization campaign.

New Node cases cover the command preview/confirmation, cancellations, retained
reference following, annotations/reimport, canonical citation validation,
rendering all fixture expressions with restricted MathML, macro isolation,
CSP/script escaping and inert prose. Command-level tests use API doubles and a
fixture transport for reproducibility; these are not desktop acceptance.
The actual renderer/host evidence below is separate.

The first restricted Python broader run was terminated (exit 143) during
process-control regressions and had no completed summary. It is not counted as
a pass. The completed unsandboxed required run reports **362 tests run: 303
passed, 59 skipped**, in 81.562 seconds. Skips are 58 opt-in Qt checks and one
unavailable authorized Windows-mounted test parent. Qt was not installed or
visually exercised for this extension-only change. Existing tool-integration
checks run by the regression suite are distinct from navigation/import, which
invoked no compiler, provider, notebook or container. Python compilation and
JavaScript syntax checks pass.

The final standard `npm test --prefix vscode` run completed **54 cases, all
passed**, in 139.854 seconds, using the stable bundled core. The earlier
restricted run reported six passing test-file wrappers; the completed external
run reports the individual cases. Packaging and bridge regressions ran
sequentially. The first syntax/test launch lacked Node on PATH and was corrected
using the established Linux Node/npm wrapper; no product defect was involved.

## Actual Windows VS Code / WSL check

Windows VS Code **1.141.2**, standard WSL Debian extension host, Python **3.13.5**,
Linux Node **24.21.0**. One isolated, persistent reading workspace uses the
existing default Linux artifact arrangement:
`.codex-work/stacks-import-20261021/reading-workspace`.
The real user's artifact location was not moved or reconfigured. Earlier
working window handles remained outside all scripted actions.

The test-only [host driver](../vscode/test/host/stacks.js) scripts dialog answers
and DOM input. Its development extension uses production runtime files, verified
byte-for-byte against all 51 checkout runtime files; only its entry point,
startup event and test observer differ. The webview, acquisition transport,
Python bridge and persistence are real, not API doubles. Initial activation
required a bounded test-launch correction; no production failure was hidden.

Observed results, recorded in [import evidence](evidence/stacks-20261021/host-import.json)
and [reopen evidence](evidence/stacks-20261021/host-reopen.json):

1. **MRW: Import Stacks Section…** acquired 08ZD online through production fetch,
   displayed identity/Git revision/effective destination, and committed it after
   the scripted **Import section** confirmation.
2. The actual webview contained all nine source parts, four statements/four
   proofs, **46 native MathML expressions**, and three local citation buttons.
   Every MathML box had nonzero width/height; there were no render warnings,
   JavaScript errors or CSP violations. A captured actual window was inspected
   visually: the diagonal statement's symbols, product and subscript rendered
   readably. The DOM check covers every part; this is not independent human
   mathematical reading of all four proofs.
3. Clicking the actual 08ZE citation in the 08ZF proof selected the exact original
   retained statement, lines **122:0–129:11** (scalar columns), and focused its
   reader card. The document was the read-only `mrw-record` view.
4. The actual annotation form saved **“Synthetic Stacks import validation
   annotation — not a mathematical note or user prose.”**, origin unknown,
   author **Automated host validation**. No test prose was attributed to the user.
5. Only the isolated window was normally closed, then reopened. **Open Saved
   Source Outline…** restored the same outline UUID, source hash, exact 08ZE
   selection and saved annotation. The fresh bridge trace contains list/load,
   note lookup and retained-reference actions, **no acquisition action**. This
   demonstrates retained reading without another download, not a claim that all
   of VS Code was disconnected from the network. Automated tests independently
   reject any attempted fetch on retained paths.

The useful imported source remains saved in that workspace. Open it and choose
**MRW: Open Saved Source Outline… → Hausdorff spaces**. Its synthetic validation
annotation is separate from mathematical work. The chapter/tag-map fixture tests
are modified excerpts with disclosed synthetic transport revisions; the actual
host import above used full upstream files at the real commit.

## Package and installation

Delivered **flengyel.theorem-terminal 0.8.0**, production entry
`./src/extension.js`, workspace extension host. Package:
`vscode/theorem-terminal-0.8.0.vsix` (56 files), SHA-256
`f0ade3a00c8a203136b074347d52b79832dbddcbb8df5165e92a26594e0cdbb4`.
Built through the established `vscode:prepublish` / `bundle-core` / vsce workflow,
then verified against every checkout runtime byte and pinned renderer/license.
Development drivers, tests, caches and node_modules are excluded. A second
packaging pass incorporated final reader documentation; runtime files did not
change after the completed test pass. Earlier packages remain in place;
0.7.0 SHA-256 remains
`58fb0067adf8564325e7703215890e05711253f7be8a12ecd21d3cd8e5ed1975`.

The WSL code-server CLI reported successful installation. The installed
production entry/version/command contribution and all **51 JS/Python/data/media
runtime files** matched the verified package. A fresh ordinary installed window
opened the reading workspace. A guarded Windows UI attempt observed the Command
Palette but did not observe the expected saved-outline choice after command
dispatch; it stopped before further input. **Opening the reader through the
ordinary installed window remains unobserved.** No extended UI retry campaign
or forced restart of working windows followed. The actual production runtime
online-import/normal-close/reopen results above belong to the instrumented
Extension Development Host, not this unfinished ordinary-window observation.
This distinction does not change the byte-verified installed implementation.

## Limits kept separate

No independent human use or mathematical usefulness was evaluated. The existing
report that Zettelkasten navigation helps in practice remains distinct evidence.
No Obsidian/vault scan, new mathematical exposition, live model request, Lean
check, notebook execution, container startup, Pi/R3/SagePod/exporter campaign,
mount/ACL/sync change or real-store move was part of this workflow. Existing
Windows-backed storage failures and incomplete cross-machine qualification
remain unresolved and unchanged. No unsupported configuration is relabeled
supported by this importer. Native Windows backend remains deferred.
