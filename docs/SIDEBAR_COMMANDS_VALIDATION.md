# Persistent sidebar commands — 0.22.7

The initial interface used native welcome buttons. Once Contents gained a
document message or tree rows, VS Code hid that welcome content. Studies also
inserted separate command TreeItems, whose plain rows had no button borders.
These were two implementations of the same entry points. This follows the
host's [welcome-content rules](https://code.visualstudio.com/api/extension-guides/tree-view#_welcome-content).

Commands now occupy a separate native view whose provider always stays empty.
Its welcome buttons therefore remain while Contents and Studies gain content.
The seven commands retain their command IDs and have hover descriptions. The
list is alphabetical. Contents and Studies retain their existing IDs, document
locations and saved work. No webview or workbench CSS injection is used.

The tutorial and current workflow describe this interface. Existing view
placement remains under VS Code's control; the patch issues no layout or reload
commands. It changes no note bytes, stores, reference formats or study schemas.

## Observed host behavior

The verified VSIX ran in a separate Windows VS Code 1.144.1 / WSL Debian
development window with disposable Markdown and isolated study storage. The
production JavaScript matches the final package exactly. The final tutorial
received a sentence correction after this native check. Only the fixture entry
point, activation event and configuration differed.

Actual window captures showed bordered native buttons before document loading,
after two production Open Document commands, and after an example populated
Studies. The file-dialog answers were injected; the commands and subsequent
editors/views were native. The fixture also checked an unsaved buffer and its
unchanged saved bytes. It saved only that disposable draft before closing its
own window. Genuine notes and the user's working window were not used.

Native view height can require scrolling the Commands list when Studies is
expanded. The borders follow the active VS Code theme. This check used the
high-contrast theme; other themes were not visually checked. It does not
complete the separate historical reader-orientation acceptance sequence.

## Delivery

Syntax checks passed. The broad Node pass completed **324 passes and one
failure**: an assertion still expected the saved-source button in Contents.
After updating that test for Commands, **4/4** focused checks passed, including
the failed case. Production code did not change; the full pass was not repeated.
Shared Python checks passed **2/2** study-question and **11/11** editor-bridge
cases. These navigation and persistence checks do not check mathematics.

The verified package is **567,895 bytes**, SHA-256
`2b236a1deb7c622b552d6d0347e04b31e66cba75c659a97b6385b3181d67f28e`.
Installed **flengyel.mrw 0.22.7**; all **102** payload files match the verified
VSIX, excluding installer-only manifest metadata. The extension registry entry
also names 0.22.7. Package identity and installed-byte verification are recorded
in [the evidence file](evidence/sidebar-commands-20261107.json). The root's
historical build marker is preserved; the isolated package marker records the
base commit and local changes. Installation does not reload the working window;
the active instance adopts the update on its next normal reload.
