# Using MRW

These instructions describe MRW 0.19.2. Begin with a document already in use.
Open the Command Palette with **F1** to run the commands named below.

## Open existing work

Use VS Code's **File → Open File…** to open a note, paper or manuscript.
An Obsidian note is an ordinary Markdown file and can remain in its vault.
PDFs use an available VS Code reader; MRW does not extract their text or build
PDF Contents. Notebooks use VS Code's notebook editor.

| Name | Meaning |
| --- | --- |
| Document | The file being worked on; its format determines available operations |
| Contents | Headings and MRW source links from one selected Markdown document |
| Saved source | An explicitly retained revision with passages and annotations |

For a new Markdown file, use **MRW: New Document…** and choose a filename in
**New Markdown document**. The initial headings can be edited or removed.
Creating a new document is optional; opening an existing file needs no import.

## Navigate a Markdown document

With the Markdown editor active, run **MRW: Show Contents**. Click a heading
to select its editor location; use the arrows to fold sections. Heading edits
update Contents before saving. **MRW: Choose Document…** selects another file.

Contents currently requires a saved file to belong to the current workspace;
an untitled Markdown document works for the current session. Opening a vault
note outside the workspace does not make it eligible for Contents.
**Show Contents** uses the active Markdown document, the remembered document,
or a picker, then focuses the navigator. It is not the general file-opening
action. Contents currently omits ordinary file links and wiki links; embeds are
not resolved. Leading YAML metadata can appear as a false heading. These limits
do not prevent opening and editing the original file normally.

## Keep a passage and link back to it

1. Open a UTF-8 text, Markdown or TeX source and save any editor changes.
2. Select the passage, then run **MRW: Retain Document as Source**. MRW keeps
   that source revision and selection and opens its reader. Later edits to the
   original file do not replace the retained text.
3. In a working Markdown document, place the cursor where the reference belongs.
   Run **MRW: Insert Source or Passage Link…** and choose the saved target.
4. Select that link in Contents to read the retained material. Use
   **MRW: Return to Document** to return to that occurrence in the rendered
   document. The command can recreate a closed preview tab.

Use **MRW: Open Saved Source…** to reopen retained material independently.
In the reader, **Reader notes** displays passage annotations. To add one,
expand **Source details and tools → Notes and tools:** for the passage, choose
**Add reader explanation / question / repair**, and **Save annotation**.
**Refresh saved source** reloads retained state and annotations; it does not
acquire a new revision of the original file.

## Work through a difficult step

Select saved source text and run **MRW: Study Current Material**, or choose
**Study current material** in its retained reader. A cited graph claim offers
**Study this claim**. The study keeps the selected source fixed while working
in other tabs or in Codex.

1. Choose **Enter a question**. For example: “Which hypothesis justifies this
   equality?” or “Supply the omitted argument.” A reference answer is optional.
   Alternatively, **Request questions from Codex** copies the source and request;
   paste it into Codex, then use **Import questions from clipboard** for its
   returned question object.
2. Choose **Attempt** on a question, or **Begin short block** when offered.
   Starting recall conceals source and answer inside the study. Type the work
   or choose **Worked on paper**, then **Submit answer**.
3. Use **Reveal source context**, hints or the reference answer when needed.
   For an explanation, **Copy help request for Codex** includes the selected
   source, question and work. Paste the request into Codex.
4. Copy the reply, then use **Paste companion response… → Review pasted
   response → Retain response**. Review its attribution. Manual paste does not
   authenticate authorship; **Edit response** retains a separate revision.
5. Use **Submit revised work** while the attempt is unfinished. After recording
   an outcome, **Continue with revised work** starts a linked attempt. Earlier
   submissions and retained replies remain available.

Report the outcome and whether the source was consulted for that submission.
These are reader reports, not mathematical verification. **Keep for review**
opts a question into later review of the selected material; saving a question
alone does not enroll it. Occasional effort reports are optional.

## Save and return later

| Work | Save | Return |
| --- | --- | --- |
| Ordinary document | **Ctrl+S** in its editor | Open the file normally |
| Reader annotation | **Save annotation** | **MRW: Open Saved Source…**, then **Reader notes** |
| Current question and attempt | **Pause / save** | **MRW: Resume Study**, or its row in **Studies** |
| Proof-study question | **Save question** in its study tab | **MRW: Resume Proof Study** |

**Pause / save** preserves unfinished work; it does not record an outcome.
The two Resume commands serve different study workflows. There is no general
research-session restore command. Keep a next-step note in the working document
for work outside these studies.

Ordinary files and MRW saved records have separate storage. Copying a document
does not copy its linked retained sources or annotations. **MRW: Open Saved Work
Directory…** connects this workspace to existing records; **MRW: Move Saved Work
Directory…** transfers saved sources and associated records. Current-study and
history data are not included in that move. See the storage guide below before
moving or reconnecting work.

## Use an existing Obsidian note

Obsidian is optional. Its notes, IDs, YAML and attachments remain in place.

1. In Obsidian, open the note and run **Copy Obsidian URL for current file**
   from its Command Palette.
2. In MRW's reader, choose **Link an Obsidian note…** under **Whole source** or
   the passage's **This passage** group. Paste the URL and enter a label.
   **Open linked note in Obsidian** returns to that note.
3. For a link from the note to MRW, use **MRW: Copy Source or Passage Link…**
   and paste the Markdown link into the note. This separate action does not
   automatically set the return destination.

**MRW: Import Markdown Text…** is optional: retain a source copy, add text to a
passage annotation, or insert text into a Markdown document. It leaves the
original note unchanged. Imported wiki links and embeds remain text; MRW does
not synchronize or index the vault.

## Other tools and detailed guides

- **MRW: Open Study Example** offers an offline source and two questions.
- **MRW: Prepare Proof Study…** selects retained passages for a Codex handoff
  and an optional proof outline. Use the [proof-study guide](https://github.com/flengyel/MRW/blob/main/docs/PROOF_STUDY_WORKFLOW.md).
- **MRW: Inspect Study History** and **MRW: Export Study History…** expose local
  observations. Exports can include submitted work and replies. See the
  [study guide](https://github.com/flengyel/MRW/blob/main/docs/ACTIVE_STUDY_WORKFLOW.md).
- Notebook editing, kernel selection and execution belong to VS Code/Jupyter.
  For optional SageMath computation, use the [SagePod setup guide](https://github.com/flengyel/MRW/blob/main/docs/GETTING_STARTED_WSL_SAGEPOD.md).
- Further help: [documents and Contents](https://github.com/flengyel/MRW/blob/main/docs/READING_OUTLINE_WORKFLOW.md),
  [Obsidian links and routing](https://github.com/flengyel/MRW/blob/main/docs/OBSIDIAN_WORKFLOW.md),
  and [saved-work storage](https://github.com/flengyel/MRW/blob/main/docs/ARTIFACT_STORAGE.md).

Source retention, scheduling and proof-outline validation do not check the
mathematical argument. Reopen this guide with **MRW: Open Tutorial**.
