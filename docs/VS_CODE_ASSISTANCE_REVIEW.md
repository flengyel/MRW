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
