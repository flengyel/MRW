# Companion software and recommended extensions for MRW

Use VS Code's editing and preview tools alongside MRW. Install a
companion for a specific task: writing LaTeX, running a SageMath notebook,
checking Lean proofs or using another PDF reader. Ordinary Markdown navigation
and retained-source reading work without these companions.

This guide distinguishes task recommendations from observed compatibility.
An available extension is not automatically a tested MRW integration. Where
MRW has host observations, the linked workflow records them; keep a working
reader or previewer unless another supplies a needed capability.

## Start with Markdown already in VS Code

Run **Markdown: Open Preview** or **Markdown: Open Preview to the Side**.
The [built-in preview](https://code.visualstudio.com/docs/languages/markdown#_math-formula-rendering)
renders inline `$...$` and displayed `$$...$$` mathematics with KaTeX.
A separate math extension is unnecessary for this basic workflow.

MRW opens ordinary Markdown in the native preview and adds note links,
supported note-local macros and explicit [TikZ rendering](TIKZ_WORKFLOW.md).
Its saved-source reader is a separate view with its own renderer. Installing
another Markdown previewer does not replace either MRW's native navigation route
or its saved-source reader.

## Choose companions by task

| Extension | Use with MRW | What else is needed |
| --- | --- | --- |
| [LaTeX Workshop](https://marketplace.visualstudio.com/items?itemName=James-Yu.latex-workshop) — `James-Yu.latex-workshop` | Recommended for manuscript editing, compilation, PDF preview and source/PDF navigation. | A working TeX distribution and build recipe on its execution host. |
| [Markdown Preview Enhanced](https://marketplace.visualstudio.com/items?itemName=shd101wyy.markdown-preview-enhanced) — `shd101wyy.markdown-preview-enhanced` | Optional richer Markdown preview, diagrams and export. Open it with its own named preview command. | Some export and diagram features need external tools. It does not automatically replace MRW's native preview route. |
| [Jupyter](https://marketplace.visualstudio.com/items?itemName=ms-toolsai.jupyter) — `ms-toolsai.jupyter` | Edit notebooks and connect to the SagePod Jupyter server. | The SageMath kernel supplied by [SagePod](https://github.com/flengyel/sagepod); the extension is not a kernel. |
| [SageMath Enhanced](https://marketplace.visualstudio.com/items?itemName=Lov3.sagemath-enhanced) — `Lov3.sagemath-enhanced` | SageMath language support used by the documented notebook setup and by `.sage` files. | Follow the [SagePod workflow](GETTING_STARTED_WSL_SAGEPOD.md). **Run SageMath File** is a separate execution route. |
| [Lean 4](https://marketplace.visualstudio.com/items?itemName=leanprover.lean4) — `leanprover.lean4` | Edit formal proofs and inspect goals with Lean. | The project's Lean toolchain. Opening a file from MRW does not itself record a formal check in MRW. |
| [vscode-pdf](https://marketplace.visualstudio.com/items?itemName=tomoki1207.pdf) — `tomoki1207.pdf` | An optional viewer for standalone PDFs when no suitable reader is installed. | MRW's handoff between the WSL workspace host and this local UI extension remains unobserved. Keep a working viewer. |

A PDF viewer supplies reading; MRW currently provides file-level PDF opening and
return, without PDF Contents, text extraction or page restoration. See
[Documents and Contents](READING_OUTLINE_WORKFLOW.md).

### LaTeX Workshop and the TeX installation

Keep a working LaTeX Workshop configuration. Its
[installation guide](https://github.com/James-Yu/LaTeX-Workshop/wiki/Install)
describes TeX Live, TinyTeX and MiKTeX. The default `latexmk` recipe needs Perl;
MiKTeX does not bundle Perl.

For a WSL-hosted LaTeX Workshop, the configured TeX tools must be accessible to
that host. A Windows MiKTeX installation alone does not configure the WSL
toolchain. MRW's [diagram renderer](TIKZ_WORKFLOW.md), used for note fences and reader
annotations, has its own Linux requirements.

## OCR for scanned PDFs

A PDF reader can search embedded text; an image-only scan needs OCR first.
These options were checked against their maintainers' documentation on
**2026-11-13**. The two extensions below have not been tested in MRW's WSL window.

| Tool | Function | Status and requirements |
| --- | --- | --- |
| [OCRmyPDF](https://ocrmypdf.readthedocs.io/en/latest/introduction.html) | Add a searchable text layer to a PDF, then open the resulting copy in the current reader. | A command-line tool, not a VS Code extension. Its [installation guide](https://ocrmypdf.readthedocs.io/en/latest/installation.html) supports Debian and WSL. Run it from the integrated terminal; no MRW OCR command is implemented. |
| [Werkbank / PDF Workbench](https://marketplace.visualstudio.com/items?itemName=juurpa.pdf-workbench) — `juurpa.pdf-workbench` | Local OCR with a searchable, selectable text layer, alongside PDF editing and annotation. | Candidate, not an observed MRW integration. Its documentation warns that formulas are not recognized reliably. |
| [PDF Extractor Plus](https://marketplace.visualstudio.com/items?itemName=kathirvel-labs.pdf-extractor-plus) — `kathirvel-labs.pdf-extractor-plus` | **OCR Scanned PDF** uses Tesseract and supplies text preview and export. | Candidate, not an observed MRW integration. Requires VS Code 1.115 or later; language data may download on first use. |

For a scanned mathematical book, start with a few representative pages and write
a separate output file. Keep the original scan and compare copied formulas,
subscripts and superscripts against it. Searchable OCR text is useful for finding
passages; it is not an exact retained quotation of the scan or a mathematical
check. OCRmyPDF does not supply MRW with PDF Contents or page-position recovery.

## SageMath: SagePod, Jupyter and SageQueue

| Component | Role |
| --- | --- |
| [SagePod](https://github.com/flengyel/sagepod) | Run SageMath and Jupyter in a rootless Podman container. It supplies the computation environment. |
| [Jupyter extension](https://marketplace.visualstudio.com/items?itemName=ms-toolsai.jupyter) | Edit notebooks and connect VS Code to SagePod's SageMath kernel. |
| [SageQueue](https://github.com/flengyel/sagequeue) | Queue SageMath batch jobs in a running SagePod instance, with task submission, partitions, workers, resource limits and logs. |
| MRW | Connect reading and retained sources with ordinary working files; [retain, compare and export saved notebook results](NOTEBOOK_RESULTS.md). |

SageQueue has been rewritten to use SagePod's runtime. It is a job queueing
system, not another SageMath image or a VS Code extension. Its current
[README](https://github.com/flengyel/sagequeue/blob/main/README.md), reviewed on
**2026-11-13**, documents Python 3.10+, rootless Podman and Linux/WSL2 ACL tools,
with scripts under the shared notebook directory. Queue commands do not build,
restart or remove SagePod. Use the upstream [command reference](https://github.com/flengyel/sagequeue/blob/main/docs/commands.md)
for submission, cancellation, retries and worker management.

Choose Jupyter for interactive notebook work and SageQueue for batch jobs.
They share SagePod's resources; set worker concurrency accordingly. MRW has no
SageQueue submission or job-monitoring controls. This documentation review did
not run a queue job or change a container. Follow the
[SagePod notebook guide](GETTING_STARTED_WSL_SAGEPOD.md) for interactive setup.

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

[New Note](OBSIDIAN_WORKFLOW.md#new-note) invokes the configured Obsidian command
and its template. Other folders use a blank VS Code Markdown editor. The Archive's
desktop integration has not been tested.

## Zotero

[Zotero](https://www.zotero.org/) manages bibliographic references and attachments.
MRW's [Zotero workflow](ZOTERO_WORKFLOW.md) uses its local API for reference lookup,
citation insertion and retained attachments. It requires the desktop application's
local API setting; no Zotero VS Code extension is required.

## WSL and remote hosts

Use Microsoft's [WSL](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-wsl)
(`ms-vscode-remote.remote-wsl`) for Windows VS Code connected to WSL2, or
[Remote - SSH](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-ssh)
(`ms-vscode-remote.remote-ssh`) for a Linux SSH host.

Install companions from the connected window's Extensions view.
VS Code normally chooses the appropriate Local or WSL/SSH location; inspect
those groups rather than forcing every extension into WSL.
[Microsoft's guidance](https://code.visualstudio.com/docs/remote/wsl#_managing-extensions)
explains placement. Each companion has its own VS Code and external-tool
requirements.

<a id="identify-an-existing-markdown-previewer"></a>

## Identify the active Markdown previewer

In Extensions (**Ctrl+Shift+X**), search `@enabled markdown` and inspect the name,
publisher, identifier and version in the Local and WSL/SSH groups. Search
`@builtin markdown` for native features. The command used to open a preview
identifies which previewer is in use; installation alone does not select it.
[Extension filters](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace#_extensions-view-filters).
