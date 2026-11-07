# Companion software and recommended extensions for MRW

Use VS Code's existing editing and preview tools alongside MRW. None of the
companions below is required for MRW's ordinary Markdown navigation or retained
source reading. Install by task; no extension pack or automatic installation is
needed.

## Start with Markdown already in VS Code

Run **Markdown: Open Preview** or **Markdown: Open Preview to the Side**.
The [built-in preview](https://code.visualstudio.com/docs/languages/markdown#_math-formula-rendering)
renders inline `$...$` and displayed `$$...$$` mathematics with KaTeX.
A separate math extension is unnecessary for this basic workflow.

MRW currently uses native Markdown preview commands for Return to Document.
Its saved-source reader is a separate view with its own bundled renderer.
Installing a Markdown preview extension does not change that reader or repair
MRW's navigation behavior.

## Choose companions by task

| Extension | Use with MRW | What else is needed |
| --- | --- | --- |
| [LaTeX Workshop](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop) — `James-Yu.latex-workshop` | Recommended for manuscript editing, compilation, PDF preview and source/PDF navigation. | A working TeX distribution and build recipe on its execution host. |
| [Markdown Preview Enhanced](https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced) — `shd101wyy.markdown-preview-enhanced` | Optional richer Markdown preview, diagrams and export. Open it with its own named preview command. | Some export and diagram features need external tools. It does not automatically replace MRW's native preview route. |
| [Jupyter](https://marketplace.visualstudio.com/items?itemName=ms-toolsai.jupyter) — `ms-toolsai.jupyter` | Edit notebooks and connect to the existing SagePod Jupyter server. | The SageMath kernel supplied by [SagePod](https://github.com/flengyel/sagepod); the extension is not a kernel. |
| [SageMath Enhanced](https://marketplace.visualstudio.com/items?itemName=Lov3.sagemath-enhanced) — `Lov3.sagemath-enhanced` | SageMath language support used by the documented notebook setup and by `.sage` files. | Follow the [SagePod workflow](GETTING_STARTED_WSL_SAGEPOD.md). **Run SageMath File** is a separate execution route. |
| [Lean 4](https://marketplace.visualstudio.com/items?itemName=leanprover.lean4) — `leanprover.lean4` | Edit formal proofs and inspect goals with Lean. | The project's Lean toolchain. Opening a file from MRW does not itself record a formal check in MRW. |
| [vscode-pdf](https://marketplace.visualstudio.com/items?itemName=tomoki1207.pdf) — `tomoki1207.pdf` | An optional viewer for standalone PDFs when no suitable reader is installed. | MRW's handoff between the WSL workspace host and this local UI extension remains unobserved. Retain an existing working viewer. |

A PDF viewer supplies reading; MRW currently provides file-level PDF opening and
return, without PDF Contents, text extraction or page restoration. See
[Documents and Contents](READING_OUTLINE_WORKFLOW.md).

### LaTeX Workshop and the TeX installation

Keep an existing working LaTeX Workshop configuration. Its
[installation guide](https://github.com/James-Yu/LaTeX-Workshop/wiki/Install)
describes TeX Live, TinyTeX and MiKTeX. The default `latexmk` recipe needs Perl;
MiKTeX does not bundle Perl.

For a WSL-hosted LaTeX Workshop, the configured TeX tools must be accessible to
that host. A Windows MiKTeX installation alone does not configure the WSL
toolchain. MRW's separate [annotation diagram renderer](TIKZ_WORKFLOW.md) has its
own Linux requirements.

## Obsidian

[Obsidian](https://obsidian.md) is a separate application for editing and reading
the same Markdown notes opened in MRW. Select its vault root with **MRW: Choose
Notes Folder…**, or set `mrw.notesFolder` to its absolute path on the extension
host. For Windows Obsidian with WSL, use the Windows vault's `/mnt/c/…` path.
**Open in Obsidian** uses the registered Obsidian URI handler; the CLI is optional.
Set `mrw.obsidianVault` only if the vault name or ID differs from the folder name.
See [Obsidian configuration and the shared-file workflow](OBSIDIAN_WORKFLOW.md#configure-obsidian-with-mrw)
for settings, saved-edit refresh and rendering limits.

[flengyel/Zettel](https://github.com/flengyel/Zettel) documents the maintainer's
Zettelkasten note format, templates and supporting scripts. Its
[wiki](https://github.com/flengyel/Zettel/wiki) documents Obsidian configuration,
software and working conventions. These are companion references; MRW does not
require the Zettel format, its scripts or its Obsidian plugins.

## WSL and remote hosts

Use Microsoft's [WSL](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl)
(`ms-vscode-remote.remote-wsl`) for Windows VS Code connected to WSL2, or
[Remote - SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh)
(`ms-vscode-remote.remote-ssh`) for a Linux SSH host.

Install companions from the intended connected window's Extensions view.
VS Code normally chooses the appropriate Local or WSL/SSH location; inspect
those groups rather than forcing every extension into WSL.
[Microsoft's guidance](https://code.visualstudio.com/docs/remote/wsl#_managing-extensions)
explains placement. Each companion has its own VS Code and external-tool
requirements.

## Identify an existing Markdown previewer

In Extensions (**Ctrl+Shift+X**), search `@enabled markdown` and inspect the name,
publisher, identifier and version in both Local and WSL groups. Search
`@builtin markdown` for native features. Note the command used to open the
preview: an installed extension need not own the visible preview.
[Extension filters](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace#_extensions-view-filters).
