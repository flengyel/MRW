# Using MRW

## Study current material

Select a retained passage and choose **Study current material**, or select
ordinary saved text and run **MRW: Study Current Material**. A cited graph claim
has **Study this claim**. No question popup is required.

Use **Add question**, or **Copy question handoff for Codex** and **Import questions
from clipboard**. Graph JSON is optional. **Keep for review** admits a question;
saving/importing alone does not. **Begin short block** selects relevant questions
within the adjustable three-question/five-minute/one-new-question defaults.

Type an attempt or choose **Worked on paper**, then **Submit answer**. Reveal
hints, the reference answer or source when useful. Report the outcome and source
consultation for that submission. Later reveals preserve its earlier snapshot.
The occasional effort item is optional and refers to that specific attempt.
**Pause / save** and **MRW: Resume Study** preserve unfinished work.

The **Studies** sidebar lists recent studies, sources and questions. Its **…**
menu and the Command Palette contain source operations and **Inspect Study
History** / **Export Study History…**. History is private local data; explicit
exports are ordinary saved files. The first instrumented release supplies no
earlier usage baseline. Scheduling and source/format validation do not check
the mathematics.

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

Click the **MRW** book icon, then **Studies → … → Open Saved Source Outline…**. Select a source to open its retained text and annotations.
**F1 → MRW: Open Saved Source Outline…** does the same thing.

In the reader:

- **Refresh saved source outline** on the top toolbar reloads saved annotations
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

## Import an Obsidian note

Run **MRW: Import Obsidian Note…** from the Command Palette. Choose a destination:

- **Open it as a saved source outline** retains a copy for reading and annotations.
- **Add it as a reader annotation on a passage** saves the text on a chosen passage.
- **Insert it into the reading overview** inserts text at the overview cursor.

Select the note’s Markdown file. The original stays in its vault. For an overview
insertion, save with **Ctrl+S**. Imported wiki links and embeds remain text;
linked notes and attachments are not imported.

## Retain a passage from a file

Open a saved UTF-8 text, Markdown or TeX file, select a passage, then run
**MRW: Create Outline from Saved Source**. MRW retains that revision and selection;
later edits to the file do not replace the retained text. PDF text extraction
is not supported.

For a Stacks Project section, use **MRW: Import Stacks Section…**. Importing
acquires the pinned source; subsequent reading uses the retained copy offline.

## Navigate a Markdown document

The names in the interface mean:

| Name | What it is |
| --- | --- |
| Reading overview | A Markdown file you edit in VS Code |
| Reading Outline | The sidebar navigator for that file's headings and MRW links |
| Source outline | A retained source and its selected passages |

**New Reading Overview…** creates a Markdown file with four headings. It does
not add source content. Choose a filename in the Save dialog.

**Open Reading Outline** uses the active Markdown document, reopens the last
chosen overview, or offers a file picker. **… → Choose Reading Overview…**
selects a different document.

Clicking a heading in Reading Outline selects its location in the editor.
The arrows fold sections in the navigator. Editing Markdown headings updates
the navigator, including before saving.

To add a source link:

1. Place the editor cursor where the link belongs.
2. Run **MRW: Insert Outline Reference…** and choose a source or passage.
3. Click the resulting entry in Reading Outline to open the retained text.
4. Use **Return to reading outline** to reopen the rendered overview. It restores
   the link's source location and recreates a closed preview tab.

Save the Markdown file with **Ctrl+S**. Save reader forms with **Save annotation**.

## Open or move saved work

Ordinary Markdown files and MRW records are stored separately. Copying a
Markdown file does not copy its linked retained sources or annotations.

| Command | Effect |
| --- | --- |
| **Show Artifact Location** | Reports this workspace's record directory |
| **Open Saved Work Directory…** | Connects this workspace to records at the specified directory; moves no files |
| **Move Saved Work Directory…** | Transfers this workspace's saved sources, outlines and annotations to a new directory |

Both Open and Move require confirmation. **Esc** cancels a directory prompt.
A completion notification can remain visible while you continue reading.

## Use Codex or notebooks alongside MRW

For a proof study, use the combined **Copy handoff for Codex** action described
above. For a standalone question or note outside that workflow, **MRW: Copy
Outline or Passage Link…** copies only the link: paste the quotation separately.
To save a reply as a reader annotation, select **Supplied origin: ai proposal**,
enter **Author / attribution: Codex**, and use **Save annotation**.

MRW's **Ask AI about this passage…** uses a separate API connection with its own
credentials. It prepares a request preview; **Send Exact Preview** sends it.

VS Code's Jupyter extension owns `.ipynb` editing, kernel selection and cell
execution. MRW does not start kernels or execute cells. SagePod setup is covered
by the separate installation guide.

Reopen this guide with **MRW: Open Tutorial**.
