# Lean study delivery checks

The optional Lean study workflow adds a complete first companion unit, native
Lean editing/InfoView handoff, editable working copies, associated notes,
exact document Return, code resumption and declarative local lesson packs.
Existing source readers, Stacks Project/Kerodon commands, source registrations
and private records are unchanged. No genuine note, annotation or saved study
was used as a writable fixture.

## Compiler and content

The compiler was Lean **4.33.0**, commit
`d8b18978322de05a8f3dba51ef03cf5461676c17`, Linux x86_64 Release. Both core-only
projects built successfully in temporary copies. No global defaults, existing
Lake files or dependency pins changed. Completed source has no `sorry`, admitted
goal or new axiom declaration. Printed axiom-dependency reports are empty.

| Completed file | SHA-256 |
| --- | --- |
| `Study.lean` | `063a93dd73485c0b38297997d8ad08e5ad39c57866a1a08492ece674763ff200` |
| `Study/Examples.lean` | `68ddc19578a362e81930baaf9b52441f5d480fe8883d1eda2d59b2f8a079e9cb` |
| `Study/Solutions.lean` | `421c074aec9c4ed5f5e29d59235dca6dd5043deb9b8a3bcb5d95755b9697fcb5` |
| External `Example.lean` | `fb5705731174536d139d2671b4af312dda92dac4b65d5845fc09e6d2fc28bcb5` |

The concrete composite evaluated to 14. Each of three deliberate errors failed
with a type mismatch; each of three unfinished variations failed with a missing
term/goal diagnostic. They are outside the default successful build. The full
lesson was reviewed separately for types, parameter scopes, dependent result
types and informal correspondence; see the [prose review](LEAN_STUDY_REVIEW.md).
All 53 mathematical expressions rendered with the bundled KaTeX parser; the
Markdown rendered five explanatory tables. This is not a mathematical checker.

## Focused and native observations

Seven new Node checks cover optional activation, copies and resumption,
explicit reset/Undo and concurrent-edit rejection, external registration,
missing Lean/bad packs, path/manifest validation and update preservation.
Ten existing navigation checks passed, as did syntax and the three tutorial
checks. Missing-Lean and malformed-pack feedback were exercised with API
doubles; they are not claimed as native missing-extension observations.

The disposable native host used **VS Code 1.145.2**, **WSL Debian** and
**leanprover.lean4 0.0.240**. Its staged manifest still reported 0.23.9 during
development; the Lean workflow sources were the new implementation. Its own
workspace, notes, source files and unsent test draft were separate from the
working window. The native scenario demonstrated:

- The production command opened the lesson preview and the user-owned Lean file.
- The native InfoView displayed `hP : P`, `hQ : Q` and goal `R` before `exact`.
  Lean's standard definition provider returned a target for `hQR`.
- Actual compiler diagnostics included the evaluation and axiom reports; no
  completion was inferred from waiting or from the absence of errors.
- Saved code edits and the associated note survived closing their editors,
  Return and Resume; the code cursor and original Markdown range were retained.
- An explicitly registered external pack opened its own working project without
  rebuilding the extension. The unrelated unsent test draft stayed dirty.

An earlier isolated attempt timed out waiting for a positive Lean diagnostic;
its failure log is retained. A fresh final native scenario completed with no MRW
errors. Its pre-edit example revision was
`2b5c05ce705ca14b41843c4a5ef098ec1e1ae8d89719032d6ae5c88e94673e2e`
(the completed source plus retained test comments). The working VS Code
window was not reloaded or installed into. The lesson and code use tabs with
native InfoView beside code; MRW does not continually rearrange groups.

## Delivery status

The full extension suite passed **378/378**, with zero skips, on implementation
commit `7c7f78ca7e3e6d35db34ce4927c385368da8b31c`. All 46 production JavaScript
files match the native-tested bytes. The first broad run recorded 14 assistance
failures with bridge timeouts during unusually long host delays. The selected
failure passed independently; the complete rerun then passed in 228.6 seconds.
Both runs and their statuses are retained.

Python/bridge behavior is unchanged from 0.23.9; the new increment uses native
files rather than new backend methods. The earlier Python regression pass was
not repeated. The extension suite includes real isolated Python bridge and
source-store regressions. Release metadata changes only the Python version.
The final extracted-package smoke check is separate from those source checks.

The three tutorial checks passed for the release text; 316 local Markdown link
targets resolved. The pinned Linux npm install succeeded. `npm audit` returned
five findings: two moderate and three high, including bundled `markdown-it`
and build-tool dependencies (`@azure/identity`, `@azure/msal-node`, `@vscode/vsce`,
`minimatch`). Dependency pins were preserved. The release notes and external
release evidence record the clean package, checksum and publication result.

## Limits

Book links use the official external browser pages. MRW has no supported live
goal snapshot API, second language client or bundled book copy. Pack API 1
validates data and paths; trusted Lean/Lake code is still handled by the official
extension. Updates preserve the working snapshot rather than merging it.
Native observation covers Windows/WSL; other desktop/SSH arrangements remain
unobserved for this workflow. Native save/undo/recovery remains VS Code's
responsibility; MRW restores exact locations only while their source pins match.
