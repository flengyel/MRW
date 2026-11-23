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

<a id="steps-removed-and-remaining-friction"></a>

## Start an atlas from a passage

Select a theorem and proof or a prose section in Markdown or LaTeX. Run
**MRW: Generate Mathematical Atlas…** from the editor context menu or Command
Palette. A saved Stacks reader offers **Generate atlas…** for the
selected passage. Its handoff keeps the qualified source and passage links.
Lean files can be outlined as source text.

MRW reads the editor revision, including unsaved text. Select a component to
inspect the exact statement, proof and reference occurrences. Choose which
cited statements to include. Include a cited proof only when you want to use it.
A missing or ambiguous reference stays beside its occurrence. **Contents** is
still available for ordinary Markdown heading navigation.

Use **Copy handoff for Codex** to copy only the selected inputs. **Import
companion outline** opens a review. Inspect which premises are used together
and correct the reason or premises before accepting. An inference needs a cited
reason. Keep an unresolved reason visible in the explanation. To supply the
inferences yourself, choose **Write an outline** and cite the relevant passage.
The review and graph check structure. Mathematical judgment remains with the
reader.

**Open exact statement** and **Open exact proof** show the captured text.
**Return to Atlas** takes you back to the component. Save the atlas to keep its
captured text and descriptions. Accepted graphs and their exact text snapshots
are saved beside it. A corrected companion proposal retains a link to the
original. **MRW: Open Mathematical Atlas…** reopens a saved revision even
after the original file changes. **Regenerate from source** keeps the
earlier atlas available and carries descriptions only when their evidence still
matches. Reselect an edited portion before regenerating a partial atlas.

The extractor recognizes supported Markdown headings, local links and named
blocks, and LaTeX labels, statements, proof environments and literal references.
It does not run TeX, follow external bibliography files, extract PDF text, or
elaborate Lean. Open a separate bounded proof graph for a component. The atlas
does not project inference across component boundaries. Reopening and reading
saved passages use local data.

## Limits

Passage selection and transfer to and from Codex are manual. The returned
outline must match the requested format; rejected replies need correction.
The proof outline and study occupy separate tabs. Mathematical checking is a
separate task.
