# Remove document Problems — MRW 0.23.3

The user rejected the document Problems interface introduced in 0.23.0.
Fetched main `3144bb4d825bc6c45046c3352de9fe31d4bae9bb` was integrated without
resetting or overwriting work.

Both creation commands and their sidebar, preview, editor and Contents actions
are removed, including Command Palette contributions and the preview URI action.
Opening or following a note displays the note. It creates no document study.
The document-study creator and section-capture wiring are removed.

Earlier document-linked work reopens read-only in the existing viewer. Statements,
solutions and their attribution, drafts, unresolved text, source references and
history remain available. Return, history/export and pending-work saving remain;
entry, association, attempts, grading and scheduling controls do not. No storage
migration or deletion is performed. Late draft checkpoints and the latest prose
bundled with an obsolete Save are retained, including failed-write retry. The
obsolete action itself is rejected. Other explicitly invoked source-study and
proof tools remain available separately.

Current instructions and the packaged tutorial describe reading directly.
The earlier document-learning account and native fixture are marked historical;
previous validation reports are preserved. Genuine notes and study data were
not used as fixtures or changed.

## Verification and delivery

| Check | Result |
| --- | --- |
| Full serialized Node regression | 353 passed, exit 0 |
| Final controller/view reliability checks, including obsolete Save | 48 passed, exit 0 |
| Shared Python study-question/editor-bridge checks | 13 passed, exit 0 |
| Syntax, tutorial and VSIX verification | Passed |
| Installed payload comparison | 105 files match; registry version 0.23.3 |

The full pass started before the final obsolete-Save draft amendment. The final
48 focused checks and native check cover that amendment. Final JavaScript bytes match both the verified VSIX and the final native
fixture; the tutorial matches the package.

Actual host: Windows VS Code **1.144.1**, WSL Debian, high-contrast theme,
in a disposable workspace. Inspected rendered Open, linked-solution Follow,
Return and saved-work captures. The Commands buttons retain their borders and
have no Problems action. The legacy view has **zero form fields**; its statement,
solution and pending prose survive reopening. An independent dirty editor and
both sidebars remain visible, with the editor layout unchanged. The final native
check also saves the latest prose bundled with an obsolete action without
creating or revising a question.

Package: `vscode/mrw-0.23.3.vsix` (581790 bytes).
SHA-256: `c7314c428f94d2de4b0df821e467fce88fcf6ab79ca42b70ec6a41451fcb22b0`.
The build marker identifies the integrated base plus local changes. Installed
through the established WSL extension-host CLI; installation exited 0.

The working window was not reloaded. It adopts the installed patch on its next
normal reload; its post-upgrade appearance has not been observed in this run.
Earlier document-linked records are deliberately read-only; no automatic
conversion to ordinary notes is supplied.

[Machine-readable evidence](evidence/document-problems-removal-20261108.json)
records tested source digests, native checks, package and installation identity.
Full logs, captures and the disposable native fixture remain in
`.codex-work/vscode-host-problems-removal/evidence/`.
