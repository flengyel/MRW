# Ask AI about a retained reader passage

MRW supports two separate ways to discuss a passage with AI: copy text and
references to a companion such as Codex, or use MRW's OpenAI Responses API
connector with a separate request preview and Send action. Codex sign-in does not
configure MRW's API connector. Reading and annotating require neither connection.

<a id="temporary-companion-codex-in-vs-code"></a>

## Codex in VS Code

Open the workspace containing the retained source, then open the Codex sidebar.
The source belongs to that workspace's saved store; opening the MRW development
checkout does not expose another workspace's saved sources.

For a question about a passage:

1. Select the passage in MRW. **Show proof** reveals a hidden proof when needed.
2. Run **MRW: Copy Source or Passage Link…**, choose the source and passage, and
   paste the complete Markdown link into the Codex question. It identifies the
   retained source revision and exact range. **Copy link to this passage** in
   the reader's passage tools supplies the same kind of destination.
3. Copy the matching quotation from the reader's exact-source disclosure into
   the question. Keep the source text, question and commentary distinct, then
   send the question from Codex. The link alone does not transfer the text or
   grant access to MRW's private store.
4. Save a useful reply in an ordinary note or notebook with its source reference
   and AI attribution. To keep it as a reader annotation, open **Source details
   and tools → Notes and tools: [passage title] → Add reader explanation /
   question / repair**. Choose **ai proposal** under **Supplied origin**, enter
   **Codex** under **Author / attribution**, paste the text and **Save annotation**.
   Wait for confirmed save feedback; edits typed during a save may remain
   unsaved. Keep later reader corrections separately attributed.

For repeated work with selected sources, the optional
[source-study tool](ACTIVE_STUDY_WORKFLOW.md#retain-companion-help) assembles a
help request and retains pasted replies. For a proposed graph, use
[Work through a proof](PROOF_STUDY_WORKFLOW.md). Both use explicit clipboard
transfers. Neither requires MRW's API credentials.

Manual companion work creates no MRW API `ModelCall` record or proof-checking
status. The reader's **Ask AI about this passage…** button uses the separate API
connector described below, not the Codex sidebar or Copilot.

## Setup

Use [installation path A](INSTALLATION.md#a-mrw-for-reading), with Python 3.11+
and MRW on the WSL/Linux workspace host. SagePod is optional computation beside
this workflow; it does not supply the AI connection.

For an API request, the extension host must inherit `OPENAI_API_KEY`. Keep the
credential outside notes, repository files and workspace settings. Setting it
only in an already-open terminal does not update the running extension host.
Set the intended model through `mrw.model` in User/Remote settings, or enter it
when prompted. Preparation requires no API key or network call; Send requires
working credentials and access to the selected model.

For the normal WSL server, Microsoft's
[environment setup instructions](https://code.visualstudio.com/docs/remote/wsl#_advanced-environment-setup-script)
describe `~/.vscode-server/server-env-setup`, processed before server startup.
Preserve any existing setup and use valid Bourne-shell syntax. Save documents
and reader forms before restarting the WSL VS Code server to load a changed
environment. MRW does not edit this script or store the credential.

## Ask, preview and send

1. Open the intended workspace and retained source with **MRW: Open Saved
   Source…**, or follow an existing source/passage link.
2. Beside the passage, choose **Ask AI about this passage…**. Alternatively use
   **Ask AI about a passage…** in the reading toolbar or **MRW: Ask About Reader
   Passage…** in the Command Palette. Expand a hidden proof to expose its action.
3. Enter the question, for example “Explain the governing idea and identify the
   assumptions used in this argument.” Select a model if prompted. Cancelling
   leaves the source and annotations unchanged.
4. Read the exact request preview. Initially it contains only the selected
   quotation, its bibliographic label and exact reference. Reader annotations,
   unsaved notes and supplied evidence are excluded. Command Palette actions
   can edit the question or remove context; each change requires a new preview.
5. With the current preview active, run **MRW: Send Exact Preview**. Send makes
   one request and retains its completed or failed result when possible. Missing
   credentials produce **not sent**. An uncertain result is not retried
   automatically.
6. Review the attributed response using the response index/passage commands.
   Select the source-reader tab to return to its drafts. Retain or copy a useful
   contribution explicitly, preserving AI attribution; MRW does not rewrite
   annotations or Markdown automatically.

Finish or discard an existing unsent request before starting another. Refusing a
second request preserves the first preview. Unsent requests are memory-only and
do not survive host restart; copy a question into a note if it should be kept.
Save notes and reader annotation forms before reloading.

## Exact targets and scope

A valid retained quotation remains available even if its original file changes
or disappears. MRW resolves the exact reference within the matching workspace
and store. It does not substitute a similarly named file, search another
workspace or normalize quotation bytes.

When a saved link points to a passage whose association has changed, **Ask AI
about the earlier linked passage…** keeps the original range and reports the
change in the preview. Current passage buttons use the displayed reader
revision. A stale reader fails explicitly; refresh it and select the intended
passage again. Missing storage, wrong scope and oversized requests are reported
without substituting or truncating the source.

Source preservation and response attribution do not establish mathematical
correctness, comprehension or a verified dependency. The clipboard proof-outline
tool is separate from this API connector. Direct notebook-cell capture and a
Copilot backend are not implemented here.

## Validation and remaining observation

The connector's November 3 checks used MRW **0.11.0**. They are evidence for that
connector delivery, not an installation report for the current release. The
[validation metadata](evidence/reader-ai-20261103/validation.json) records its
package identity and checks. An installed isolated bridge prepared an exact
Unicode/CRLF passage after removal of its disposable original, without a provider
request or changes to source bytes.

Automated command/bridge checks used deterministic responses. They covered exact
quotations, missing originals, changed associations, wrong scope, unavailable
retained text, cancellation, separate Send, response identity, draft preservation
and refusal of a second unsent request. They made no live provider request.

The November 3 native Windows/WSL development-window check did not produce a
completed host report. In later use that day, the maintainer reported reaching
the model prompt and request preview, then receiving **not sent** because the
extension host lacked `OPENAI_API_KEY`. API setup was deferred. That observation
does not establish a live response or successful return with an unsaved
annotation intact. Those parts of the native connector workflow remain
unobserved in this report; ordinary reading and companion use are independent.
