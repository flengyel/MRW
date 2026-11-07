# Work through a proof with the Codex companion

Run **MRW: Work through a proof…** from Research Tools or **Work through a proof…**
in the retained reader. Choose the proof, then select its prerequisite passages.
Enter the question you want to pursue and save the work. The saved question,
selected passages and any imported outline can be reopened with **Continue proof
work**. No passages are added automatically.

In the study view:

1. **Copy handoff for Codex** copies one handoff containing the question, exact
   selected text, MRW references, source revisions, original attribution, snapshot
   digests and the outline schema. Paste it into Codex.
2. Copy Codex’s proposed JSON, or its complete JSON code block. **Import outline
   from clipboard** validates it and saves a new outline beside the study. The
   existing graph viewer opens directly.
3. Select a claim and choose **Edit summary**. Correct its claim and explanation,
   identify the author and choose Reader correction or AI proposal. **Save
   summary** applies an ordinary document edit and save. The editor owns undo.
4. Return to the study tab, write the unresolved question and choose **Save
   question**. **MRW: Continue proof work** reopens the remembered study. An active
   `.mrw-study.json` file takes precedence; its editor title also has a study icon.

The `.mrw-study.json` file contains the selected quotation bytes, references,
question and outline filename. The `.mrw-proof.json` file remains the existing
ordinary graph format. Content-addressed quotation files live in `study-sources`
beside them. Quotation exports preserve exact UTF-8 bytes independently of
ordinary-editor line endings. Imports create new files and refuse overwrites. Existing studies,
source originals, private notes and supplied evidence are preserved.

The handoff contains only the passages explicitly selected. It excludes reader
notes and supplied evidence. Clipboard transfer is explicit; MRW sends no API
request, invokes no compiler and acquires no new source. A graph vertex can still
open its corresponding Stacks page through the existing explicit navigation.

Import uses the Python core’s strict JSON and graph validation, then requires
the handoff’s source entries and exact MRW citation references. It re-resolves the
retained quotation bytes before creating the graph. Source selection, acyclicity,
references, scope and joint-premise structure are checked. Mathematical truth,
sufficiency of premises and validity of an inference are not checked by this
operation. The proposed explanations retain AI attribution; reader corrections
are separate attributed edits.

The study file carries its quoted text when copied, but its private MRW targets
still require the matching retained store. Import does not substitute another
project’s source. Studies for local sources need an HTTPS bibliographic reference
in the retained source description to fit the current graph source format.

## Steps removed and remaining friction

The reader no longer copies each quotation/reference separately, assembles a
schema or source manifest, creates snapshot files, locates the graph-opening
command after import, edits claim summaries as JSON, or recreates a saved question
after restart.

The reader still selects prerequisites, relays the handoff and reply through
Codex, and returns to the study tab to save the question. Codex must return the
bounded graph format; a rejected reply needs correction. Switching to another
study uses its file and the study icon or Resume command. The proof and study
remain separate tabs. Mathematical checking remains a separate task.
