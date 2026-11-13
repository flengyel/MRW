# MRW 0.23.22 — startup repair

Published as a normal release and Latest:
[release](https://github.com/flengyel/MRW/releases/tag/v0.23.22) ·
[VSIX](https://github.com/flengyel/MRW/releases/download/v0.23.22/mrw-0.23.22.vsix) ·
[checksums](https://github.com/flengyel/MRW/releases/download/v0.23.22/SHA256SUMS).

- Source A: `b97a0da3ce15eef01e21ba945a40fe00d8281ff1`.
- Marker-only B and tag: `c62a61de15a5c9b88c56a4c08404c8c48812dc4f`.
- VSIX SHA-256: `5583ff1a756c022cf2f7be60b31c532b2eec4056533a265868b507fe2412aff5`.

The native WSL extension log showed a JavaScript Proxy invariant failure when
reading `ExtensionContext.workspaceState`. Activation stopped before registering
later commands, including Study Lean 4, Open Document and Find Zotero Reference.
Host facades now proxy separate objects and preserve the real receiver for
methods and accessors. Workspace move guards and state encoding remain active.
The tutorial describes the startup symptom and where to inspect the host log.

## Verification

All checks used clean B. The extension suite passed 521 tests without skips;
Python ran 442 tests, with 68 optional skips and no failures. Two focused tests
first reproduced the read-only-property failure and then passed with the fix.
The extension harness now uses read-only context properties in all activation
tests. Syntax, tutorial, relocation and Zotero regressions passed.

A separate native Windows VS Code 1.146.0 / WSL Debian development host activated
0.23.22, found all 111 contributed commands registered, completed Show Contents,
and settled Study Lean after chooser cancellation. Its extension host exited 0.
This checked real activation and command entry; it did not run a Lean build or
query the user's Zotero library. The first remote CLI launch ignored development
flags and opened an ordinary disposable fixture window; it was not counted as
an acceptance test. The successful host used separate user data. Its launcher
timed out waiting, but the test report and host exit were subsequently observed.

The clean VSIX passed the inventory/runtime verifier. Its manifest, README,
tutorial and marker were inspected. An extracted-package Node launcher called
the bundled Python bridge in isolation. Tracked paths/text and extracted package
bytes had zero superseded-identity matches. All 404 rendered local Markdown
links and anchors checked resolved; inline code examples were not treated as
links. Both published assets were downloaded anonymously, matched local bytes
and passed the checksum. Tag target, Latest redirect and README link passed.

Dependency pins are unchanged. `npm audit` exited 1 with five existing findings:
three high and two moderate. No dependency upgrade is claimed by this patch.
Evidence, logs and statuses are retained under
`~/.cache/mrw-activation-20261113/` outside the project.

No installation or reload of the working window was performed. Genuine notes,
saved research and settings were not changed. New Zettel and Recent Notes are
separate ongoing work, not features of this repair release.
