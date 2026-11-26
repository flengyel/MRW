# Rename a study folder without losing saved GOLEM XIV work

Prepare and reconnect an existing single-folder study workspace on a
Linux/WSL/SSH host before renaming its folder. GOLEM XIV preserves its retained
sources, passages, annotations and other saved research records. Your file tools
perform the ordinary directory rename or move; VS Code owns ordinary documents.

## Before renaming

1. Open the **study folder itself** in the connected VS Code window. Opening
   individual Markdown files or the parent development checkout does not open
   that study's private records.
2. Save ordinary documents, notebook changes, reader annotation forms and human
   investigation summaries. Finish or discard unsent GOLEM XIV requests. Close other
   GOLEM XIV windows using this store.
3. Run **Prepare Folder Rename…**. Read the project and saved-work locations,
   then choose **Prepare saved work**.
4. Wait for **Saved GOLEM XIV work prepared**. GOLEM XIV moves this workspace's saved artifacts
   to a private directory in its host-local extension storage, outside the study
   folder. The existing core verifies the complete copy and commits its binding
   before removing exact old owned payloads. Ordinary files stay in place.
5. Keep the displayed saved-work location. Close this workspace normally, rename
   or move the study folder with your file tools, and reopen its new location in
   VS Code connected to the **same host and profile**.

When renaming a parent directory, prepare **each existing GOLEM XIV study workspace
inside it** separately. Preparing the parent development checkout does not
discover nested studies. The chosen host-local saved-work location must stay in
place; this is not a procedure for moving VS Code's storage or the Linux home.

## After reopening the renamed folder

1. Run **Reconnect Saved Work After Folder Rename…**.
2. Choose the prepared study using its previous folder and saved-work location.
   Review the old-to-current folder mapping and select **Reconnect saved work**.
3. Run **Open Saved Source…**. The same retained source, exact ranges
   and attributed notes remain available. Reopen your ordinary Markdown overview
   and run **Show Contents** when wanted.
4. Existing inline GOLEM XIV references keep their exact targets. For an older external
   link whose workspace address names the old folder, copy it and use **Open
   Link from Clipboard** in the reconnected window. The verified store identity
   and explicit local mapping resolve it; its old routing address is not rewritten.

Reconnection verifies the actual store identity, complete manifest and required
record dependencies. The host-local shortcut is only a convenient locator; it
cannot establish identity or select replacement material. An existing binding or
saved records in the receiving workspace prevent replacement or merging.

## Failures and limits

An unsaved reader form, assistance draft, unresolved transmission, incompatible
filesystem or unfinished artifact operation blocks preparation. Cancellation
makes no move. If preparation is incomplete, keep the ordinary folder in place
and use **Recover Artifact Move**. An uncertain publication does not announce
success or retry automatically. Existing [artifact recovery rules](ARTIFACT_STORAGE.md#commit-cancellation-and-recovery)
still govern authority and cleanup.

If saving the convenience shortcut fails after a successful move, GOLEM XIV reports
the committed location. Keep that path: **Open Saved Work Directory…**
in the new empty workspace supplies the existing explicit verification/mapping
route. A missing or changed store fails without creating a replacement.

Preparation is required before this new shortcut workflow. GOLEM XIV does not scan
old workspace storage or infer which study belongs to an already renamed folder.
Multiple-project stores use the existing [artifact move/open commands](ARTIFACT_STORAGE.md),
with all projects explicitly mapped. This feature adds no cross-machine
synchronization, Windows storage qualification or native Windows backend port.

Original source paths and immutable records are unchanged. Jumps to an original
file at its old path may therefore be unavailable after the rename; the exact
retained source remains readable. VS Code recovery, unsent requests, return pins,
reading-outline UI preferences and live webview drafts are not transferred by
this workflow. Save first and reopen the ordinary documents; no similar-text
search, guessed pin or automatic prose rewrite is supplied.

For a new general workspace, use [the GOLEM XIV default](WORKSPACE_SETUP.md), not a
subject-specific study or test directory.
The [complete workspace relocation contract](WORKSPACE_RELOCATION_DESIGN.md)
adds obligations beyond this saved-source preparation workflow.
