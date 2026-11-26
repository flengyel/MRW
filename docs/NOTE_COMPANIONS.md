# Notes applications and the GOLEM XIV handoff

GOLEM XIV opens ordinary Markdown notes in VS Code. A configured notes application
can create notes using its own templates and filenames. Obsidian is optional.
[Integration boundaries](INTEGRATION_BOUNDARIES.md).

## Develop and link notes

A source note can contain a question, a calculation or part of an argument.
Link it to an exact passage when the source matters. An ordinary note remains
editable after it is linked. The link identifies the retained passage and its
revision.

## Start a note from GOLEM XIV

Choose **New Note…** in the **Commands** view, document menu or Command Palette.

- For a configured Obsidian vault, GOLEM XIV brings Obsidian forward and runs your
  explicitly selected template creation command. An unset command stops with
  configuration instructions; there is no plain-file fallback. Complete its prompts in Obsidian; it supplies the
  template and filename. See [configuration](OBSIDIAN_WORKFLOW.md#new-note).
- For another notes folder, GOLEM XIV opens a blank VS Code Markdown editor beside
  the current document. Use Save to choose its filename and location.

Your current GOLEM XIV document stays open. Use the [Obsidian return template](OBSIDIAN_WORKFLOW.md#open-the-current-note-from-obsidian)
to bring the new note back, or choose it through **Open Document**. For other kinds of
documents, use their authoring application or VS Code extension, then open the
file in GOLEM XIV. For retained passages, you can also [start a capture in Emacs](#capture-a-passage-in-emacs).

For a saved reader annotation, **Link another note…** reuses that creation
command or selects an existing note. Save the file in its native editor, then
choose **Confirm selected saved note and link** to publish the association.
[Continue an annotation](OBSIDIAN_WORKFLOW.md#continue-a-reader-annotation)
describes optional copying, association, selected-format validation and recovery.
Source annotations and linked notes remain independently editable. One source note
can link several notes, and one note can combine several sources. Linking
preserves an attributed source snapshot; it requires no matching prose or
retirement of the source annotation.

## Obsidian handoff

[Configure the handoff](OBSIDIAN_WORKFLOW.md#new-note) with a vault root and the
Obsidian command that already creates your notes. A Templater creation command
uses the template already configured in Obsidian. Obsidian supplies the
prompts, filename and save operation. GOLEM XIV keeps the source open and
records where to return.

Creating a note uses the Obsidian CLI. Opening an existing note uses the desktop
URI handler and does not need the CLI. Returning from Obsidian uses the optional
Templater command or a GOLEM XIV note link. The [handoff details](OBSIDIAN_WORKFLOW.md#what-the-handoff-does)
distinguish these routes. Sending a command does not prove that a note was saved;
GOLEM XIV does not infer its filename or scan for a newly created file.

## Capture a passage in Emacs

Use **Capture passage in Emacs** in a saved source’s passage tools, or choose
**Capture Passage in Emacs…** and select a saved passage. The command opens
an Emacs draft with the retained passage and a link to its exact revision. Add
your own note and finish with `C-c C-c`, or cancel with `C-c C-k`. Emacs owns the
destination and Save. A request sent to `emacsclient` does not indicate a saved
note. If the result is unclear, check Emacs before sending the passage again.

### Set up a capture template

Run Emacs and `emacsclient` on the same Linux host as the GOLEM XIV extension. For
VS Code in WSL, use Emacs in the same distribution. In the Emacs session you
intend to use, load `org-protocol` and run `M-x server-start`. GOLEM XIV calls
`emacsclient` on the extension host’s PATH. Use the default local server.
The examples below use Org 9.7’s per-template capture hook.

Add this shared hook to your Emacs configuration. It inserts the source link
and passage after Org has expanded the template. Org escapes lines that could
otherwise end the example block. The link still identifies the exact text.

```elisp
(require 'org-protocol)

(defun my-mrw-insert-passage ()
  (let ((link (plist-get org-store-link-plist :annotation))
        (text (plist-get org-store-link-plist :initial)))
    (save-excursion
      (goto-char (point-max))
      (when (stringp link) (insert "\n" link "\n"))
      (when (and (stringp text) (not (string-empty-p text)))
        (insert "\n#+begin_example\n" (org-escape-code-in-string text)
                "\n#+end_example\n")))))
```

**Denote.** Install the `denote` Emacs package and set `denote-directory` to
your notes folder. Denote supplies its usual title and keyword prompts.
The following capture entry fits Christian Tietze’s setup with one Org file per
note. Denote generates the identifier and filename. Set **Org Capture
Backend** to **denote** and **Org Capture Template** to `m`, or use your
own capture key in both programs.
[Tietze’s EmacsConf setup](https://emacsconf.org/2025/talks/zettelkasten/) ·
[Denote capture documentation](https://protesilaos.com/emacs/denote)

```elisp
(require 'denote)

(defun my-mrw-denote-template ()
  (let ((denote-org-capture-specifiers "%?\n"))
    (denote-org-capture)))

(add-to-list 'org-capture-templates
             '("m" "GOLEM XIV passage in Denote" plain
               (file denote-last-path) (function my-mrw-denote-template)
               :hook my-mrw-insert-passage))
```

**Org-roam.** Use your `org-roam-directory` and enable
`org-roam-db-autosync-mode` so Org-roam can find a node by its reference. This
example uses a capture key in `org-roam-capture-ref-templates`. If a node
already has that exact passage as a reference, Org-roam can capture into that
node. Set **Org Capture Backend** to **org-roam** and **Org Capture
Template** to `m`. The adapter uses Org-roam 2.3.1’s `roam-ref` protocol.
[Org-roam protocol documentation](https://www.orgroam.com/manual.html)

```elisp
(require 'org-roam-protocol)

(add-to-list 'org-roam-capture-ref-templates
             '("m" "GOLEM XIV passage in Org-roam" plain "%?\n"
               :target (file+head "%<%Y%m%d%H%M%S>--${slug}.org"
                                  "#+title: ${title}\n")
               :hook my-mrw-insert-passage))
```

### Return to the passage

Register the VS Code link type in Org to follow the saved link with `C-c C-o`.
This example uses the system URL handler through `browse-url`. On WSL the
opener must forward `vscode:` links to Windows VS Code. If the handler is
unavailable, copy the URL and use **Open Link from Clipboard** in the
workspace that retained the passage. The link needs that workspace’s retained
source store.

```elisp
(org-link-set-parameters "vscode" :follow
  (lambda (target _) (browse-url (concat "vscode:" target))))
```

Reopen the resulting note in Denote or Org-roam for editing and backlinks.
GOLEM XIV can open an `.org` file in the native text editor through **Open Document**.
Its Contents and backlinks for ordinary notes are Markdown features.

## The Archive

The Archive documents `match`, `search` and `matchOrCreate` URLs. The first two
match notes by query. Use `matchOrCreate` only for explicit creation. A GOLEM XIV
adapter would need verified note-opening and return behavior on macOS.
[The Archive’s help](https://zettelkasten.de/the-archive/help/)
