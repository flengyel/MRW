# Ask AI about a retained reader passage

MRW **0.11.0** adds direct AI access for reviewing mathematics in its source
reader. It uses the existing **OpenAI Responses API** connector. A Copilot window
or sign-in is separate; MRW does not use Copilot's models in this increment.

## Setup

Use [installation path A](INSTALLATION.md#a-mrw-for-reading), with Python 3.11+
and MRW on the WSL/Linux workspace host. SagePod is optional computation beside
this workflow; it does not supply the AI connection.

For a provider request, the WSL extension host must inherit `OPENAI_API_KEY`.
Configure the credential privately, outside notes, repository files and workspace
settings. A variable set only in an already-open integrated terminal does not
update the existing extension host. OpenAI's
[API quickstart](https://developers.openai.com/api/docs/quickstart) explains API
credentials and environment variables. Set your intended model through `mrw.model`
in User/Remote settings, or enter it when prompted. Installation and preparing a
question require no key or network call; Send requires working API credentials
and model access. No new SDK or provider adapter is installed.

For the normal WSL server, Microsoft's
[environment setup instructions](https://code.visualstudio.com/docs/remote/wsl#_advanced-environment-setup-script)
identify the host-local `~/.vscode-server/server-env-setup` script, processed
before server startup. Preserve any existing setup, use valid Bourne-shell
syntax, and supply the credential privately from there. Save all documents and
reader forms before restarting the WSL VS Code server to pick up a changed
environment. MRW does not edit this script or store your credential.

## Ask, preview and send

1. Open the intended workspace and its retained source reader with **MRW: Open
   Saved Source Outline…**, or follow an existing reading-outline reference.
2. Beside the passage you want to review, click **Ask AI about this passage…**.
   Alternatively use **Ask AI about a passage…** in the reading toolbar or
   **F1 → MRW: Ask About Reader Passage…**, then choose a saved region. Expand a
   hidden proof to expose its per-passage control.
3. Enter a mathematical question, for example “Explain the governing idea and
   identify any assumptions used in this argument.” Choose your model if no
   model setting exists. Cancelling leaves the source and annotations unchanged.
4. Read the exact request preview. It includes the existing scoped source
   reference, source revision, outline/region identity, scalar endpoints and
   unchanged selected text. The initial context is only that quotation, with
   its bibliographic label. Reader explanations, unsaved notes and supplied
   evidence are excluded. Context removal and question editing use the existing
   Research Tools commands; every change requires a new preview.
5. With the current preview active, run **MRW: Send Exact Preview**. Preparing
   the question does not send it. Send makes one attempt through the existing
   adapter and retains its terminal result when possible. Missing credentials
   report **not sent**. An uncertain result is not retried automatically.
6. Review the attributed response using the existing response index/passage
   commands. Select the still-open source-reader tab to return. Reader drafts
   remain there. Explicitly retain or copy a contribution if useful; keep AI
   attribution with it. There is no automatic annotation or Markdown rewrite.

Finish or discard an existing unsent request before starting another from the
reader. The current request preview is preserved when a second reader request
is refused. Unsent requests remain memory-only and do not survive host restart.
Save ordinary notes and explicitly save reader annotation forms before reloading.

## Exact targets and scope

Changed or missing originals do not prevent asking about valid retained text.
The Python service reuses MRW's existing reference parser and resolver, workspace
checks and retained store. It does not resolve by filename, search another
workspace, create replacement material or normalize the quotation's Unicode or
line endings.

An earlier linked passage whose region association changed has a separate
**Ask AI about the earlier linked passage…** action. It keeps the link's original
range and reports the changed/removed association in the preview. Current passage
buttons use the displayed reader revision; a stale reader fails explicitly
instead of choosing a newer range. Refresh and choose the intended passage
again. Missing/incompatible retained storage and a wrong workspace are clear
errors. Large requests retain the existing limits and fail without truncating.

This connector provides bounded assistance, with exact source context and
response provenance. It does not establish correctness, comprehension, a
necessary premise or a verified dependency. Outline generation, inference graphs,
vertex elimination, direct notebook-cell capture and a Copilot backend remain
separate work.

## Validation and remaining observation

The verified **0.11.0** VSIX is installed in WSL. Its **66 package files** have
SHA-256 `676a057a97cb5b10bb9a0b112e0ba86694bb22eb649ac3095a228c7bd0265296`.
All **61 installed runtime files**, the production manifest and license match
the archive. The installed isolated bridge captured the exact Unicode/CRLF
passage after its disposable original was removed and prepared a request with
no provider action or byte changes. Earlier 0.10.0 and 0.9.4 packages retain
their recorded hashes. This installed-bridge check is separate from the
unobserved actual-window workflow below. See the
[validation metadata](evidence/reader-ai-20261103/validation.json).

Linux/WSL automated checks cover real command/bridge workflows with deterministic
transport: preparing from a reader without an active text editor, exact Unicode
and CRLF quotation, missing original, changed association, unavailable retained
blob, wrong scope, cancellation, separate Send, retained response source identity,
preserved reader draft state and an existing unsent request. Python byte inventories
confirm that capture changes no source, note or retained record. Existing R2
terminal-status and preview validation remain in the final regression suite.

The final Node command/bridge suite passes all **8 test files**. Python runs
**379 tests: 317 passed, 62 skipped**. The skipped checks include opt-in Qt and
native diagram workflows; those were not repeated for this connector. Syntax,
Python compilation and document checks also pass. No live provider request,
SagePod action or new mathematical exercise is part of these tests.

The actual Windows/WSL development-window check is **unobserved**. Windows
refused the unsigned PowerShell launch script. A direct VS Code executable
launch returned, but produced no host report; the user clicked **Reload and
enable extensions**. No further launch/focus retry was made. The staged manifest
now uses the normal extension entry point, avoiding another startup seed. The
trial is private under `.codex-work/reader-ai-20261103`; preserve it now that the
user has interacted with its window. The test driver is
`vscode/test/host/readerAssistance.js`; it uses only a synthetic response and is
excluded from the VSIX.

The exact remaining actual-window observation is: open a retained passage in
the Windows/WSL reader, click its AI action, verify the exact preview, return
with an unsaved reader annotation intact, and exercise response review with an
explicit Send. A live request additionally needs the user's privately configured
API credential and chosen model; none was read or sent here. Mathematical
usefulness remains unassessed.
