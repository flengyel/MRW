# Study lifecycle delivery — 0.23.11

Delivered 10 November 2026. [Release](https://github.com/flengyel/MRW/releases/tag/v0.23.11)
· [VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.11/mrw-0.23.11.vsix)
· [SHA256SUMS](https://github.com/flengyel/MRW/releases/download/v0.23.11/SHA256SUMS).

## Source and package

- Source marker A: `435fa496fc78ce84185250ff848a42b199ff10e4`.
- Release commit B: `d508dffb349d72d2ea974fdeab1073819ddf34aa`.
- A-to-B changes only `vscode/media/build-info.json`; it records version
  `0.23.11`, A and `localChanges: false`.
- VSIX: 644,088 bytes; SHA-256
  `3bc2ea8aba0808934ef6313d2fe7f5905454af63add28e79a4aa0b9cf927417e`.

The final package was built from clean B with the documented fixed epoch and
pinned dependencies. Earlier unused candidate commits were retained, not reset
or tagged. Concurrent main changes through `b44f874` were integrated. B and
`v0.23.11` were pushed without force. The release is public, not a draft or
prerelease, and GitHub's Latest endpoint identifies it. Anonymous downloads of
both assets match the tested local bytes; `sha256sum -c SHA256SUMS` passes.
Published earlier releases were not changed.

## Delivered behavior

[Archive, Restore and deletion](STUDY_LIFECYCLE.md) use the existing private
study/history stores. Archive suspends review selection and retains drafts,
questions, history and scheduling cards. Trash retains the prior active or
archived state, with Undo and later Restore. Permanent deletion shows its scope,
then removes study-owned content while preserving shared question revisions,
shared snapshots, other studies' events, source annotations and ordinary files.

Lifecycle epochs reject stale messages. A durable deletion intent supports
restart recovery; the final opaque tombstone prevents an old reference or
delayed save from recreating the record. Reusing the same source requires an
explicit choice, and new work receives a different study identity. No conversion
of genuine saved studies was required, and no genuine study was deleted.

## Checks and exact scope

| Check | Outcome |
| --- | --- |
| Full extension suite on candidate `aa99ba4` | 395 passed, zero skipped; exit 0 |
| Final active-study, lifecycle and history suites on B | 61 passed, zero skipped; exit 0 |
| Python suite on `aa99ba4` | 430 total; 367 passed, 63 skipped; exit 0 |
| Syntax, compileall and tutorial checks | Passed |
| Clean wheel install, isolated Python import and CLI | Passed for 0.23.11 |
| Bridge from the final extracted VSIX | Parsed the retained 08ZH fixture with isolated Python; exit 0 |
| Final VSIX verifier | Exact manifest, inventory and runtime bytes matched |
| Identity search | 466 tracked files/paths and 136 package entries; zero superseded-name occurrences |
| Changed Markdown links | 424 local targets resolved across 19 changed Markdown files |
| Public downloads | Both assets matched local bytes; checksum, tag, Latest and README links verified |

The final change after the full suite repairs partial mixed-session history
replacement. Its regression injects a partial write, restarts, completes
deletion and verifies the other study's exact retained event. All 61 affected
tests were rerun on B. The full suite was not repeated after this bounded repair.
Python implementation and dependency pins did not change between these states.

The 63 Python skips were 58 opt-in Qt checks, four opt-in TikZ checks and one
check requiring an authorized Windows project directory. An initial Python run
correctly refused volatile temporary storage; the successful run used persistent
disposable storage. Two older extension tests used the recent cache as the
inventory; they now exercise saved records and stale-cache recovery.

Lifecycle checks cover unsent drafts, rejected writes, shared-owner recovery,
restart, more than 30 saved studies, suspended scheduling, Trash cancellation
and Undo, retained Return locations, mixed history batches, shared/transitive
snapshots, partial writes, failure after rename, interrupted final removal and
late-message rejection. These are storage and interaction checks, not checks
of mathematical correctness.

Pinned npm dependencies reported five advisories: two moderate and three high.
Their pins were preserved. Logs and exit statuses, candidate packages, the final
package and public-download evidence are retained outside tracked source in
`~/.cache/mrw-releases/0.23.11-20261110/`.

## Native observation and limits

An isolated VS Code 1.145.3 development window connected to WSL Debian ran the
production JavaScript matching B. Actual registered commands and webview draft
checkpoints completed Archive, Restore, Trash and permanent deletion on
disposable studies. The ordinary fixture note and an unsaved editor draft were
preserved. The final study view was inspected. The harness selected modal
answers; manual context-menu clicks and confirmation-dialog interaction are not
claimed. An initial untrusted workspace refused commands as intended; the
successful run used a separate disposable test profile. A startup history-gap
notice found there was fixed and regression-tested before release.

The working extension was not installed or reloaded. Real notes, source stores
and research records were not used for deletion tests. The existing
single-writing-host restriction remains. Exports, backups and external copies
are outside deletion; an unreadable batch without a complete saved counterpart
stops cleanup rather than risking another study's data. Zotero linking and the
two-calculation PROV trial remain subsequent work.
