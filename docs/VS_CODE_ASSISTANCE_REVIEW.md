# VS Code assistance review — 2026-10-13

The review found defects in record selection and failure handling in PR #3,
whose initial head was `f539ba8ed605131e934a5784839534be6141cad6`.
The repairs preserve the existing provider adapter, record schemas, immutable
publication, and completed-only passage extraction.

## Findings and repairs

| Priority | Defect and consequence | Repair |
|---|---|---|
| High | A language change fires document close/open events. Unconditional cleanup removed the response-to-record association; refocusing that response could leave another response selected for insertion. | Retain mappings for a live document during language changes, consume the document returned by the language API, and clean up only actual disposal. |
| High | Virtual-document counters restarted at one. A restored tab could reuse a new response URI and show old text under a new record association. An unrecognized old tab could also leave a different response selected. | Include a random activation identifier in every virtual URI and clear response selection when focusing an unmapped record view. Ordinary note focus still preserves a selected response for insertion. |
| High | Send returned a pathname without the digest of the validated terminal bytes. Automatic review could display a different valid record substituted at that pathname. | Return the exact retained-file SHA-256 and require it when opening the completed answer. Changed records are rejected without discarding the known transmission outcome. |
| High | Native Windows could reach provider transmission even though the immutable publisher requires unsupported POSIX operations. | Reject Send on unsupported non-POSIX hosts before transport. Read-only inspection and request preview remain available; Remote WSL supplies the supported Windows route. |
| Medium | Missing credentials and other known preflight rejections consumed the question and were reported as uncertain transmission. A later display failure could likewise relabel a known completed result. | Return a distinct `not_sent` operation result for preflight rejection; retain the draft, invalidate Send, and require a newly displayed preview. Limit uncertain-transmission handling to bridge failure, separate from later display/review errors. |
| Medium | The advertised record inspector accepted only completed calls, preventing validated inspection of failed, refused, or incomplete outcomes. | Add a terminal-call inspection format for all four statuses, with escaped metadata and complete record JSON. Response review and projection still require completed content. |

The virtual-document lifecycle checks follow the minimum supported VS Code
version's implementation:
[language-change events](https://github.com/microsoft/vscode/blob/1.85.0/src/vs/workbench/api/common/extHostDocuments.ts)
and [document disposal and isClosed](https://github.com/microsoft/vscode/blob/1.85.0/src/vs/workbench/api/common/extHostDocumentData.ts).
The command test double now models language-change notifications separately
from actual disposal. These are regression tests of the documented host
interaction, not a claim that a real Extension Development Host was run.

## Validation and limits

Focused regressions cover record replacement after Send, selection of the
correct response after language changes, restored virtual tabs, known-unsent
draft recovery, unsupported-host rejection before transport, inspection of all
terminal statuses, and rejection of incomplete records by projection.

All 20 Node bridge/command tests and all 21 focused Python editor tests pass.
The complete Python suite ran 289 tests: 224 passed, 64 skipped, and the
previously recorded TeX descendant-reaping test errored. Python compilation,
JavaScript syntax checks, diff checks, and an installed-package bridge launch
with a digest-pinned terminal record also pass.

No live provider call, Lean invocation, or mathematical-use trial was performed.
A real VS Code executable and Qt runtime are unavailable in this environment.
Visible host acceptance and VSIX installation remain pending. The existing TeX
descendant-reaping failure is outside these changes and was previously
reproduced on the unchanged baseline.

R3 investigation continuation and restart resumption, and the requested
proof-outline vertex elimination, remain separate implementation increments.

## Actual Extension Development Host validation

On 2026-10-13, the merged `main` baseline `f8812ea` was exercised in Windows
VS Code 1.141.1 (`7baac39ec3ca969dab74ac12c097f6a486e46593`) connected to
WSL Debian. The workspace extension and Python 3.13.5 ran on Linux. This updates
the earlier environment limitation above; no production JS/Python, provider
adapter, publication boundary, or record schema was changed by this validation.

The command runner uses actual host documents, virtual providers, commands,
language changes, undo and workspace state. File/input/choice dialogs are
scripted. Its Python launcher removes any inherited `OPENAI_API_KEY`, supplies
only a synthetic test credential, injects deterministic byte-level responses,
and rejects socket connections. In the final command pass, four attempted transmissions produce completed,
failed, refused and incomplete records; the missing-credential case is known
unsent. These are local adapter exercises, never live provider requests.

| Workflow | Actual host result |
|---|---|
| Activation, note → local Lean source → Return | No bridge work on activation; exact saved selection restored; no Lean extension/compiler used |
| Untitled/unsaved Unicode and CRLF context | Scalar positions and exact captured text checked; unselected text excluded; later edits leave the frozen preview unchanged |
| Remove/add context, edit question, discard | New previews reflect explicit changes; obsolete/discarded previews cannot Send |
| Separate Send and concurrency | One attempt per preview; duplicate rejected; concurrent note edits preserved |
| Terminal handling | All four statuses retained and inspectable; known-unsent draft preserved for a new preview |
| Response review and attribution | Inert plain-text markup/URLs; ordinary typing cannot edit the view; language changes preserve the selected record identity |
| Note insertion | Selected work preserved, attributed editable copy inserted without saving, one real undo restores the note; concurrent changes cancel insertion |
| Exact retention | Private mode `0600`; existing destination rejected without changed bytes |
| Source identity | Dirty or changed saved source blocks Return; test source bytes restored and checked |
| Normal-host close/reopen | Marker survives; Return restores the exact selection; old virtual URI stays unavailable and cannot select a different record |

The command suite completed 11 grouped checks. Its initial restart attempt
correctly exposed a test-method limitation: VS Code's installed
`StorageMainService.getStorageOptions()` sets `useInMemoryStorage` whenever
`extensionTestsLocationURI` is present. There was no persisted marker to restore
under `--extensionTestsPath`. This was not recorded as a production persistence
defect. The corrected check ran a normal development host with a staged
extension whose production JS/Python hashes matched the checkout. Only the
staged manifest entry point/activation and test configuration differed; the
bootstrap prohibited Send. The seed run passed three grouped checks and the
separate reopened host passed four, including exact Return and stale-tab rejection.

Windows captures were inspected at 1280×820 and 960×680. The larger view showed
the MRW sidebar, saved note and attributed passage. At the smaller size, this
display's scaling crowded the sidebar and two editors, so the check hid the
sidebar and used two ordinary VS Code zoom-out steps. Both editors were then
visible. Long safely rendered record lines still use host horizontal scrolling.
This establishes visible rendering with those layout choices, not a study of
reading comfort or complete manual-dialog acceptance.

The host launch also required bypassing the WSL remote CLI, which ignores
development/test flags, and using Windows `Code.exe` with remote URIs and a
separate temporary user-data directory. Test-runner focus synchronization,
cross-filesystem artifact placement, read-only typing checks and concurrent
expected-error accounting were corrected during setup. No production defect
was found in the covered paths.

Validation also passed all 20 existing Node bridge/command tests and Python's
289-test suite: 230 passed, 59 skipped (58 opt-in Qt widget checks and one
unavailable authorized `/mnt/c` project parent). The previously reported TeX
descendant-reaping error did not recur in this WSL environment; no TeX code was
changed. Python compilation and JavaScript syntax checks passed. The host
workflows invoked no Lean; the broader Python suite exercised the existing
pinned checker through its five conditional documentary regressions. Linux
Node 24.21.0 from the VS Code server ran the Node checks directly; WSL's PATH
did not supply a Linux `node`/`npm`. No Lake
build or production checked-bundle update was performed. The host
runner and reproducible preparation instructions are in `vscode/test/host/`,
`vscode/scripts/prepare-host-tests.py`, and `vscode/README.md`.

Local evidence is retained under `.codex-work/vscode-host-20261013/`:
`initial.json`, `persistence-seed.json`, `persistence-restart.json`,
`restart-1280.png`, `host-960.png`, `python-suite.log`, transport-body traces and
`staged-source-digests.json`. `evidence-digests.json` identifies the final captures
and reports. Generated artifacts and temporary profile data are not committed.

No live provider call, external-browser handoff, VSIX installation,
native Windows Send, manual-dialog campaign or mathematical-use trial was
performed. The isolated test hosts were closed normally; the user's main
editor and its extension settings were left alone. R3/R3.1 still needs its
bounded host-state design and port; proof-outline vertex elimination remains
separate. Mathematical usefulness remains pending.
