# Using MRW

A document may be a note, paper, manuscript or notebook. The current **Contents**
view uses Markdown headings and MRW source links. Opening an ordinary file and
retaining a source revision are separate actions.

## Study current material

Run **MRW: Open Study Example** for an attributed offline source and two
questions. It preserves other work and marks practice separately from research.
For your source, select saved text and run **MRW: Study Current Material**, or
choose **Study current material** in a retained reader. A cited graph claim has
**Study this claim**.

An empty study shows its source, **Enter a question** and **Request questions
from Codex**. The latter copies exact source text, references and a question
schema; paste the request into Codex, then **Import questions from clipboard**.
Manual question entry works offline. **Keep for review** explicitly enrolls a
question. A short block is offered once eligible questions exist.

Starting recall conceals source and answer within the study. Type your work or
choose **Worked on paper**, then **Submit answer**. Use **Reveal source context**,
hints or the reference answer when needed. A later reveal leaves the earlier
submission unchanged. Earlier study exposure does not rule out later recall.

For help, use **Copy help request for Codex** and paste the handoff into the
companion. Back in MRW, **Paste companion response… → Review pasted response →
Retain response** keeps prose and equations beside the attempt. Review the author;
manual paste does not authenticate it. **Edit response** retains an attributed
revision alongside the original. Successive replies stay separate.

**Submit revised work** records another immutable submission while the attempt
is unfinished. Once completed, **Continue with revised work** starts a linked
attempt. Report outcome and consultation for the particular submission; pending
choices persist through reveals and pause/reopen. They are never sent automatically.
An occasional effort report is optional and names its attempt.

**Pause / save** and **MRW: Resume Study** restore unfinished work. The **Studies**
sidebar lists recent studies, sources and questions. Its **…** menu and Command
Palette contain source operations and **Inspect Study History / Export Study
History…**. History is local private data; exports can contain mathematics,
work and replies. Source-store moves do not yet move current-study/history data.
Scheduling, source retention and graph validation do not check the mathematics.

## Begin or resume a proof study (0.17.0)

Open a saved source as described below. Choose **Prepare proof study…** in the
reader, or **MRW: Prepare Proof Study…** from the Command Palette. Select the
proof and the prerequisite passages to include, enter the question and save.

In the study tab:

1. **Copy handoff for Codex** includes the selected quotations, references and
   outline instructions together. Paste it into the Codex companion.
2. Copy the proposed JSON response, then **Import outline from clipboard**.
   MRW validates the format and source references and opens the graph.
3. In the graph, select a claim and choose **Edit summary**. Edit the claim and
   explanation in its form, identify the author/origin, then **Save summary**.
4. Return to the study tab to edit and **Save question**.
   **MRW: Resume Proof Study** reopens the saved study. An active study file
   also has an editor-title action.

The question and graph currently occupy separate tabs. The Codex transfer is
manual. Opening or preparing a study makes no model request. Format/source
checks do not check the mathematical argument.

## Read a proof graph

**Open Proof Outline…** opens a saved `.mrw-proof.json` file. Its editor-title
icon opens the same view. Select a vertex to read its Stacks tag beside the
graph. **Saved text** shows the retained statement and proof offline. Drag to
pan; use the wheel or **− / Fit / +** to zoom.

**Delete vertex** omits an intermediate claim; **Expand original steps** shows
its argument and **Restore** brings it back. **Use AI outline** applies the
selection already proposed in the file. **Edit summary** opens the correction
form. **Refresh** reads changes made in the ordinary backing document.
**Ask AI…** uses the separate API request preview and Send workflow.

## Open a source

Click the **MRW** book icon, then **Studies → … → Open Saved Source…**. Select a source to open its retained text and annotations.
**F1 → MRW: Open Saved Source…** does the same thing.

In the reader:

- **Refresh saved source** on the top toolbar reloads saved annotations
  and source status. The same command remains in the Command Palette.

- **Show proof** expands a published proof; **Hide proof** folds it.
- **Reader notes** beneath a passage displays its saved annotations.
  **Source notes** near the source heading displays notes about the whole source.
- **Delete note…** below an annotation removes that note after confirmation.
- **Diagram appearance → Theme** follows VS Code. **Paper** and **Dark** override
  the theme for reader diagrams.
- **Source details and tools** contains source information and passage tools.
- **Save annotation** saves a reader form. **Ctrl+S** saves editor files, not
  reader forms.

To add an annotation, expand **Source details and tools → Notes and tools:**
for the passage, then **Add reader explanation / question / repair**. Complete
the form and click **Save annotation**.

If the source list is empty after moving a study folder, use **MRW: Open Saved
Work Directory…** and enter the directory containing its saved MRW records.
Confirm the mapping to the study folder now open in VS Code. This connects
saved work without moving files or importing another copy of the source.

## Import Markdown text

Run **MRW: Import Markdown Text…** from the Command Palette. Choose a destination:

- **Retain a source copy** retains a copy for reading and annotations.
- **Add text to a passage annotation** saves the text on a chosen passage.
- **Insert text into a Markdown document** inserts text at the document cursor.

Select the note’s Markdown file. The original file stays unchanged. For insertion into a Markdown document,
save with **Ctrl+S**. Imported wiki links and embeds remain text;
linked notes and attachments are not imported.

## Retain a passage from a file

Open a saved UTF-8 text, Markdown or TeX file, select a passage, then run
**MRW: Retain Document as Source**. MRW retains that revision and selection;
later edits to the file do not replace the retained text. PDF text extraction
is not supported.

For a Stacks Project section, use **MRW: Import Stacks Section…**. Importing
acquires the pinned source; subsequent reading uses the retained copy offline.

## Navigate a Markdown document

The names in the interface mean:

| Name | What it is |
| --- | --- |
| Document | Material opened for work; its format determines available operations |
| Contents | Headings and MRW source links from the selected Markdown document |
| Saved source | An explicitly retained source revision with passages and annotations |

**New Document…** opens **New Markdown document** and creates a `.md` or
`.markdown` file with optional headings. Existing files and headings are unchanged.

**Show Contents** uses the active Markdown document, reopens the last
chosen document, or offers a file picker. **… → Choose Document…**
opens **Choose a Markdown document for Contents** to select a different file.
**Show Contents** focuses the navigator; it does not open arbitrary documents.
Use VS Code's ordinary Open File action for other formats, including PDFs with
an available host reader. MRW does not extract PDF text or derive PDF Contents.

Clicking a heading in Contents selects its location in the editor.
The arrows fold sections in the navigator. Editing Markdown headings updates
the navigator, including before saving.

To add a source link:

1. Place the editor cursor where the link belongs.
2. Run **MRW: Insert Source or Passage Link…** and choose a source or passage.
3. Click the resulting entry in Contents to open the retained text.
4. Use **Return to document** to reopen the rendered document. It restores
   the link's source location and recreates a closed preview tab.

Save the Markdown file with **Ctrl+S**. Save reader forms with **Save annotation**.

## Open or move saved work

Ordinary Markdown files and MRW records are stored separately. Copying a
Markdown file does not copy its linked retained sources or annotations.

| Command | Effect |
| --- | --- |
| **Show Artifact Location** | Reports this workspace's record directory |
| **Open Saved Work Directory…** | Connects this workspace to records at the specified directory; moves no files |
| **Move Saved Work Directory…** | Transfers this workspace's saved sources and annotations to a new directory |

Both Open and Move require confirmation. **Esc** cancels a directory prompt.
A completion notification can remain visible while you continue reading.

## Use Codex or notebooks alongside MRW

For a proof study, use the combined **Copy handoff for Codex** action described
above. For a standalone question or note outside that workflow, **MRW: Copy Source or Passage Link…** copies only the link: paste the quotation separately.
To save a reply as a reader annotation, select **Supplied origin: ai proposal**,
enter **Author / attribution: Codex**, and use **Save annotation**.

MRW's **Ask AI about this passage…** uses a separate API connection with its own
credentials. It prepares a request preview; **Send Exact Preview** sends it.

VS Code's Jupyter extension owns `.ipynb` editing, kernel selection and cell
execution. MRW does not start kernels or execute cells. SagePod setup is covered
by the separate installation guide.

Reopen this guide with **MRW: Open Tutorial**.
