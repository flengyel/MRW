# First manual overview across sources — 2026-10-16

Extension **flengyel.theorem-terminal 0.5.0** adds explicit insertion/following of
saved-outline references in ordinary Markdown. It is the first manual overview
spanning several sources, not automatic outlining or the full broader outline
capability. Baseline: `b776368`; its packaging/WSL/Pi deployment evidence is
complete and reused. Read [the reference contract](PROOF_OUTLINES.md#first-manual-overview-across-sources--reference-contract-2026-10-16)
and [the workflow](../vscode/README.md#manual-markdown-overviews-across-sources).

## Identity and behavior

References are strictly parsed data. Identity includes canonical project/private
store scope, outline UUID, retained source SHA-256 and, for a region, its UUID
and exact half-open scalar range. It excludes the mutable annotation revision.
Insertion snapshots known bibliography and a useful locator in a normal Markdown
link label; no missing metadata is invented. VS Code owns the document and its
editing, save, undo, recovery and preview. Overview prose is reader synthesis.

Follow opens the existing reader and selects the pinned retained passage in a
plain-text view. Changed/removed region associations are reported without
selecting their replacement range. Changed/missing originals do not prevent
retained access. Missing targets/storage, corrupt retained bytes, source revision
mismatches, scope mismatches and malformed references fail without editing the
Markdown, publishing state, searching elsewhere or executing document commands.
References confer no proof-checking status or verified dependency relation.

## Focused actual-host check

The new behavior passed in **Windows VS Code 1.141.2 connected to WSL Debian**,
with Python **3.13.5**, in a Development Host. A test bootstrap scripted chooser
answers while real production commands, editor documents/undo, webview readers,
bridge processes and persistent private storage ran. Staged production JS and
bundled Python bytes matched the checkout; only the development manifest's
entry/activation and test configuration differed. This is not an installed-0.5.0
validation or independent human usability trial. The user supplied workspace
trust; the overview itself and its edits were scripted fixtures.

The [seed report](evidence/overview-20261016/overview-seed.json) and
[normal-restart report](evidence/overview-20261016/overview-restart.json) record:

- Prepared two saved outlines from existing offline fixtures: the non-Lean
  Euclid IX.20 validation transcription (CRLF; edition/translator unknown) and a
  distinct synthetic divisor note (Unicode, LF). No source was fetched or compiled.
- In an [ordinary Markdown overview](evidence/overview-20261016/overview.md),
  inserted an exact Euclid region reference and a whole-outline reference to
  the second source. Euclid's supplied title, author and locator remained
  readable; absent metadata stayed absent. The second source used its filename.
- Insertion left the disk file unchanged until explicit save. Real editor
  undo/redo removed/restored the inserted reference. An ordinary Unicode prose
  edit was undone independently, and the overview was explicitly saved.
- Followed both references into the existing reader. The region opened in an
  MRW read-only plain-text view with the expected exact text selected. Following
  changed neither the Markdown nor its private outline/retained files.
- Added a reader annotation and followed the same reference successfully.
  Replaced that region's reading range, then removed the original file in the
  disposable workspace. The earlier reference reported the changed association,
  selected no replacement reader region, and opened its originally pinned passage.
- Closed only the disposable Development Host normally. The remote extension
  host exited with **code 0**. Reopened the same workspace and followed both
  saved references again. The overview's SHA-256 remained
  `e2bc2409d4802d260b9a317d274e0342c3aa43f7314db74f091368af0e73b4b9`;
  all private outline and retained-file digests remained unchanged.
- All **86 inventoried pre-existing unrelated MRW private files** retained their
  digests. No state reset, migration or synchronization was performed.

The focused remote-host logs record activation and normal exit without an
error. Test setup was corrected separately from production: the initial trust
check stopped before outline creation; an assertion expected the wrong existing
label for a missing original; the initial broad regression runner omitted an
inherited Python import path. Corrected runs passed. A transient development
launch flag disabled workspace-trust checks for that test launch without editing
user settings. After the user's focus caution, no further keyboard automation
was used. A passive capture was skipped because the test window was not
foreground; no successful visible-capture or manual-dialog acceptance is claimed.

Per the user's supplement, **installation validation was not repeated**, and
**no Pi check was repeated**. The changes add no SSH/ARM-specific behavior,
remote transport, architecture dependency or observed regression. Prior ordinary
installed-0.4.1 WSL/Pi results remain in the
[deployment report](VS_CODE_OUTLINE_VALIDATION.md#installed-vsix--2026-10-15).
They do not establish a new installed-0.5.0 or ARM reference-workflow result.

## Regression and archive checks

All **36 Node** checks pass. The broad Python profile ran **319 tests: 248 passed,
71 skipped**. Skips comprise 58 unavailable opt-in Qt widget tests, one unavailable
authorized `/mnt/c` parent and 12 existing compiler/checker integrations excluded
by this task's explicit no-compiler boundary. Focused Python reference checks
cover two sources, bibliography/annotation edits, moved/removed ranges, missing
and changed originals, missing/corrupt retained storage, missing outlines,
malformed URIs, wrong scope/revision, out-of-bounds ranges, Unicode/BOM, mixed
line endings, stale chooser state and offline/no-write navigation. Node checks
also cover caret lookup, escaping, cancellation, concurrent document changes,
workspace/language boundaries and actual bridge calls. Python compilation,
JavaScript syntax, document-link and CRLF-aware diff checks pass (retained
fixture/overview evidence intentionally preserves CRLF). No provider, compiler or
Lean checker was invoked; completed acceptance campaigns were not repeated.

The VSIX is `vscode/theorem-terminal-0.5.0.vsix`, SHA-256:

```text
1580ff1ff022662028a1c302abe190698919663fb1bf40fc74742696baa1ebe8
```

Packaging uses the existing bundler/prepublish hook, locked **@vscode/vsce
4.0.0**, Linux Node **24.21.0**, npm **11.13.0**, Python **3.13.5**, `TZ=UTC`
and `SOURCE_DATE_EPOCH=1792094267` (the `b776368` timestamp). The cached offline
clean dependency installation completed. Two builds produced identical archive
bytes. The [archive verifier](evidence/overview-20261016/package-verification.json)
checked **45 files**, including eight production JS modules, the bridge, all
31 Python-core/data files and the Apache license. Manifest/runtime/license
bytes match the checkout. Development tests, host bootstraps, staging
configuration, scripts, caches and npm dependencies are excluded. The previous
0.4.1 VSIX is preserved with its original SHA-256
`721e9ec6fa011807508947c4fe3a132702ce705b5d30b6c80cf5f2ea4fbc1f29`.
No Marketplace publication occurred.

The [evidence manifest](evidence/overview-20261016/validation-manifest.json)
pins the scoped reports, overview, outline snapshots, fixtures, logs and local
validation artifacts. Use the [reproducible packaging instructions](../vscode/README.md#package-and-install-a-vsix).

## Remaining limits

Copying Markdown alone does not transfer private outlines or retained sources.
Navigation is limited to the current workspace/private-storage scope; there is
no transfer/synchronization mechanism or fallback search. Preview-click
integration, automatic overview generation, source discovery and broader
outline tooling remain pending. Existing bounded UTF-8 reader limits and
explicit saving of reader forms still apply; native text views may normalize
line endings while retained blobs preserve original bytes. Inference graphs,
joint-premise analysis, elimination witnesses and vertex elimination are not
implemented. Other host configurations and optional ARM integrations retain
their prior validation limits. Mathematical usefulness, proof correctness,
human comprehension and independent human usability remain unassessed.
