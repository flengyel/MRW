# TikZ reader-diagram validation — 2026-11-02

## Theme default — 2026-11-04

Patch 0.14.4 adds Theme as the default and keeps Paper/Dark overrides. The
reader uses paired retained images selected through CSS. The native Markdown
preview passes VS Code's color scheme to the theme-aware SVG export. No operating-system theme inference,
compiler, record write or note rerender is required on a theme change.
The two-color preference starts anew in host-local v2 state with Theme; the old
fixed choice is retained separately. Tests cover paired images, explicit
overrides, paper fallback without a dark image, persistence and no core work.
The 08ZH light/dark SVG exports were rasterized and visually inspected. Native
theme switching remains to be confirmed in the user's window.
The focused command run passes 37 checks and the renderer/parser/link run
passes 42. Neither run changes the genuine study annotations.

Started clean at **0.9.4**, `a400589`, preserving later/user work. The user agreed
to explicit rendering of saved diagram code with retained SVGs, then requested a
white-on-dark option and colors while trying the prototype. The implementation
is **0.10.0**. [Workflow and bounds](TIKZ_WORKFLOW.md).

A headless Chrome check verifies light and dark rendering from the VS Code
theme classes. A live light-to-dark switch keeps the same image nodes and
unsaved text while changing diagram visibility; Theme remains selected. The
overview SVG receives the embedding image’s color scheme, following the
[CSS media-query rule](https://drafts.csswg.org/mediaqueries-5/#prefers-color-scheme).
The actual VS Code window still needs user confirmation after activation.


## Implementation and review

The feature uses the existing extension, Python core and Linux artifact store.
Saved annotation fences derive text/code/diagram fragments; exact annotation text
and attribution stay authoritative. Only **Render diagram** invokes pdfLaTeX,
pdfinfo and pdftocairo inside bubblewrap. There is no engine/package discovery on
opening or restoring, no automatic source import, provider, checker, notebook or
container request, and no downloaded WebAssembly engine.

Review covers exact UTF-8 code keys, duplicated fences, Unicode/CRLF, stale note
versions, wrong workspaces, retained output integrity, publication failures,
process/output limits, sandbox mounts/environment, SVG profiles and image CSP.
Native tests verify the real compiler/converter, external PDF-stream file denial,
loop termination, colors and explicit multipage refusal. The normal host can
create the required namespaces; the coding sandbox cannot. Native checks run
outside the coding sandbox under the explicitly authorized tool calls.

The diagram index uses existing mutable publication and its SVG uses existing
immutable blobs. The move inventory for the earlier storage layout now recognizes
the new index. One focused disposable Linux regression initially exposed the omitted index, then
passed after that ownership-list fix. It also verifies exact saved images after
a supported move and refusal of a stale render client. No real artifact store
was moved and Windows storage qualification was not reopened.

Dark appearance derives a display copy, adapting monochrome values while
preserving other colors and the original retained SVG. The UI preference is
host-local. It invokes no compiler or record publication. The color test first
assumed a particular whitespace spelling of SVG RGB values; normalizing that
test comparison fixed the assumption, with no change to the source colors.

## Actual Windows/WSL Development Host

One fresh isolated workflow used Windows VS Code **1.144.0**, WSL Debian and the
Linux extension host, with the current installed TeX/Poppler/bubblewrap tools.
The user clicked through to open its disposable workspace. The staged host uses
unchanged production runtime code, with a test-only entry point and DOM probe;
it scripts form input and commands, not substitute persistence or a fake renderer.

The source and annotation are explicitly synthetic. The earlier genuine Stacks
workspace, its Codex explanation, ordinary overviews and private store were not
modified. No new exercise or study session was required.

The seed workflow saved a fenced `tikz-cd` annotation through the actual form,
confirmed no compiler request on Save, followed the real Render action, and
preserved a newer unsaved form draft entered during the native compile. The
webview decoded the retained SVG at **64 × 58** intrinsic pixels with no CSP
violation. Note/source text stayed exact.

The uniquely identified disposable Development Host closed normally. Its
synthetic unsaved test draft was deliberately not saved; user working windows
were left open. Fresh reopening restored the same outline and SVG through only
artifact status, outline list/load and linked-note reads: no renderer request.
The user then clicked **Render diagram again** and reported **“Nice.”** This is
an ordinary user observation of the prototype diagram, separate from a new
mathematical-use or proof-correctness claim. Preserve the trial workspace now
that the user has interacted with it; do not reset it or rerun seed mutations.

The later Paper/Dark selector has automated DOM/command coverage and real native
SVG color checks; its visible appearance has not yet been observed in that
window. The first diagram/retention workflow is established independently.

## Final automated checks

- All **81 Node tests passed**, including the actual bundled bridge with a
  deterministic renderer fixture for command/publication checks. Actual native
  compilation is checked separately by the Python and host workflows.
- Python ran **376 tests: 317 passed, 59 skipped**, with native diagram tests
  explicitly enabled on the normal WSL host. Skips are the existing opt-in Qt
  widget tests and unavailable Windows-mounted test parent. No Qt or new Lean
  build was required. Shared core regressions for existing callers remain intact.
- Syntax, Python compilation and diff/document checks passed. Packaging follows
  the completed bridge tests sequentially; installed checks run afterward.
- Native tests cover real colored output, unchanged non-monochrome colors in
  Dark display, external PDF-stream access refusal, looping TeX termination and
  explicit refusal to truncate multipage output. Other tests cover corrupt or
  missing cache, stale/wrong targets, no replacement or implicit compilation,
  publication failure, exact-source editing/restoration and supported relocation.

Logs and private generated artifacts stay under `.codex-work/tikz-20261102/`.
[Seed](https://github.com/flengyel/MRW/blob/af623be0a9dc85cb23dbdde610484ad886ea687a/docs/evidence/tikz-20261102/host-seed.json),
[normal reopen](https://github.com/flengyel/MRW/blob/af623be0a9dc85cb23dbdde610484ad886ea687a/docs/evidence/tikz-20261102/host-reopen.json) and
[check summary](https://github.com/flengyel/MRW/blob/af623be0a9dc85cb23dbdde610484ad886ea687a/docs/evidence/tikz-20261102/checks.json) retain their separate scopes.

## Package and installed checks

The final VSIX contains **66 files**, SHA-256
`1ba44124d4755caca7516c26d9339a4fde784058943874c48010082fa1c43792`.
The established WSL code-server installation succeeded. The production manifest,
entry point and all **61 installed runtime files** match the verified archive;
see [installed package](https://github.com/flengyel/MRW/blob/af623be0a9dc85cb23dbdde610484ad886ea687a/docs/evidence/tikz-20261102/installed-package.json).
Earlier VSIX packages, including 0.9.4, remain unchanged.

The [installed workflow](https://github.com/flengyel/MRW/blob/af623be0a9dc85cb23dbdde610484ad886ea687a/docs/evidence/tikz-20261102/installed-workflow.json) created a
fresh synthetic fixture outside the user's reading workspace, saved one colored
TikZ block, explicitly rendered it through the actual installed Python bridge
and tools, obtained both Paper/Dark display images, and reopened it after removal
of the fixture original. The annotation JSON stayed byte-identical during
rendering; reopening sent no renderer request. This is an actual installed
bridge/core check, distinct from an installed-window button observation.

A separate read-only visit to the genuine retained Stacks passage verified its
exact source hash and every outline-store/overview byte before and after.
No annotation, source, note or replacement diagram index was written there.
The staged trial runtime was updated atomically for the user's next reload,
without rewriting its ordinary source or closing any current user window.
The new appearance selector still awaits a visible window observation.

## Scope

Only saved reader annotations have MRW diagram controls. Ordinary Markdown
preview remains owned by VS Code and its installed extensions; neither Markdown
Preview Enhanced nor Obsidian TikZJax was installed by this increment.
The native rendering prerequisites are optional for reading retained SVGs.
Other Linux hosts/native Windows rendering and other diagram backends have not
been qualified. Arbitrary SVG/remote assets and multipage blocks are unsupported.

No inference graph, vertex elimination, AI explanation generation or formal
checking capability follows from the diagrams. Broader usefulness and measured
benefit remain separate from this rendering result. Windows storage, Pi, R3,
SagePod, exporter and whole-corpus campaigns stayed deferred.
