# Work through a proof with the Codex companion

Use this optional tool to request a proposed proof outline from selected
passages and keep it beside a saved question. Ordinary reading and questions
written in notes require none of these steps. For explanatory prose without a
proof graph, see [AI assistance](READER_AI_WORKFLOW.md) or
[source-study help](ACTIVE_STUDY_WORKFLOW.md#retain-companion-help).

Run **MRW: Work through a proof…** from the Command Palette, or choose **Work
through a proof…** in the retained reader. Select the proof and any prerequisite
passages, enter the question, and save the work. Only selected passages are
included. **MRW: Continue proof work** reopens the saved question, passages and
any imported outline.

In the proof-study view:

1. **Copy handoff for Codex** copies the question, selected text, source
   references and revisions, attribution, and the required outline format.
   Paste the handoff into Codex.
2. Copy the proposed JSON object or its complete JSON code block. **Import
   outline from clipboard** checks it and saves a new outline beside the study.
   The graph viewer opens directly.
3. Select a claim and choose **Edit summary** to correct its claim and
   explanation. Identify the author and choose Reader correction or AI proposal.
   **Save summary** edits and saves the ordinary outline file; VS Code owns undo.
4. Return to the study tab to update the unfinished question with **Save
   question**. **MRW: Continue proof work** returns to the remembered study.
   An active `.mrw-study.json` file takes precedence; its editor title also has
   a study icon.

The `.mrw-study.json` file holds the question, exact selected quotations,
references and outline filename. The `.mrw-proof.json` file holds the proposed
graph. Exact UTF-8 quotation files are saved in `study-sources` beside them.
Imports create new files and refuse overwrites.

The handoff excludes unselected reader notes and supplied evidence. Copying and
importing are explicit; MRW sends no API request, runs no compiler and retrieves
no new source in these steps. A graph vertex can open its corresponding Stacks
Project page through an explicit link.

Import checks the graph format, acyclicity, source references, scope and joint
premises. It also checks quotations against the retained source before creating
the graph. It does not establish mathematical correctness or the sufficiency of
the premises. Proposed explanations keep AI attribution; reader corrections are
separate attributed edits.

Copying the study file carries its quotation text, but private MRW destinations
still require the matching saved-source store. A study using local sources needs
an HTTPS bibliographic reference in the retained source description to fit the
current graph format.

## Steps removed and remaining friction

The handoff assembles quotations, references and the outline format. Import
creates the quotation files and opens the graph; claim summaries can be edited
without editing JSON. Saving the question permits later resumption.

Passage selection and transfer to and from Codex remain manual. The returned
outline must match the requested format; rejected replies need correction.
The proof outline and study occupy separate tabs. Mathematical checking remains
a separate task. [Validation and limits](PROOF_STUDY_VALIDATION.md).
