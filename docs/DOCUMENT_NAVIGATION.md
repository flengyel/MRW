# Document navigation

The editor toolbar has one book icon, **MRW Document**, for Markdown, PDF and
text files. Its menu contains Return to Document and Show Backlinks. Markdown
also offers Show Contents, Edit Document Source, Open Note in Obsidian and Copy
Note Link for Obsidian. Existing command IDs and Command Palette entries remain. Menu conditions cover
local files and VS Code’s remote-file URIs used by WSL and SSH windows.
Study Current Material is an editor overflow action; Lean's secondary InfoView
action is in overflow beside its primary Study Actions button.

Backlinks search ordinary links in the explicitly selected notes folder. They
open the exact occurrence in the referring note. Cancellation preserves the
previous Return destination. Returning from that note to a PDF reopens the PDF
file, including after restart; MRW does not record its page. A dirty note stays
dirty and is never saved by these actions. File scope and current link text are
checked again before opening a backlink.

Editor menus use the tab that supplied the action, even if another pane has
focus. Show Contents and Edit Document Source refuse a PDF or other non-Markdown
file rather than switching to an unrelated Markdown note. The selected Contents
document remains available through Reveal Contents Document.

MRW delegates PDF rendering to the selected installed reader. It supplies no PDF
text extraction, page bookmarks, PDF annotations or PDF Contents. When the PDF
opens in a system application, use MRW's Command Palette in VS Code for Return
and backlinks; there is no MRW toolbar in the system reader. Open Note in
Obsidian still requires a Markdown note inside the selected notes folder.

## Command grouping review

The [VS Code editor-action guidance](https://code.visualstudio.com/api/ux-guidelines/editor-actions)
asks extensions to keep actions contextual, use one toolbar icon and put
secondary actions in overflow. This increment groups document actions in one
native submenu, supported by the [menu contribution API](https://code.visualstudio.com/api/references/contribution-points#contributesmenus).
It removes the three separate Markdown toolbar icons and does not expose note
editing, proof study or AI requests as PDF actions. The wider sidebar grouping
remains a separate review; this patch does not change saved view placement.

The regression checks use disposable files and a VS Code API facade. They cover
PDF backlink selection, focus changes, cancellation, restart Return, scope
rejection and dirty-buffer preservation. These are command-level checks, not an
observation of the native desktop menu. No connected document session was
available for this increment, and the working window was not reloaded.
