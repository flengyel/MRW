# Install Mathematical Research Workstation

The recommended installation is **MRW plus MRW Diagnostics** on the same
workspace host. Download both packages from the current release:

- [MRW 0.23.48](https://github.com/flengyel/MRW/releases/download/v0.23.48/mrw-0.23.48.vsix): reading, notes, sources and research tools.
- [MRW Diagnostics 0.1.0](https://github.com/flengyel/MRW/releases/download/v0.23.48/mrw-diagnostics-0.1.0.vsix): feature-use and integrity reports.

[Release notes and SHA256SUMS](https://github.com/flengyel/MRW/releases/tag/v0.23.48)
cover both downloads. Diagnostics can be omitted; MRW's essential storage checks
and recording stay in core. Weekly reports are opt-in even when both are installed.

There is no Marketplace listing. The extension identifiers are `flengyel.mrw`
and `flengyel.mrw-diagnostics`. You can also
[build from source](../vscode/README.md#package-and-install-a-vsix).

## A. MRW for reading

The Windows setup uses **VS Code connected to WSL2**, with MRW and
**Python 3.11+ on the Linux workspace host**. Use VS Code 1.96 or later for the recommended pair; core alone supports 1.95.
The [host table](../vscode/README.md#workspace-hosts-and-dependencies) distinguishes
observed configurations from other intended Linux arrangements.

Ordinary reading needs no Qt, npm, separate MRW Python installation, Lean,
SageMath or AI account. Additional tools are needed only for the corresponding
optional features.

### 1. Connect to the Linux host

Install Microsoft's WSL extension (`ms-vscode-remote.remote-wsl`) in Windows
VS Code if needed. Follow [Microsoft's WSL setup](https://code.visualstudio.com/docs/remote/wsl#_installation)
to connect the window. `wsl --list --verbose` in Windows PowerShell identifies
which distributions use WSL2.

For a fresh installation, use **WSL: Connect to WSL using Distro…** and choose
Debian. An empty connected window is sufficient for installing MRW. For ongoing
work, keep the current window open; install no update until its drafts are safe.
Do not use a Stacks study, a temporary test folder or the MRW source checkout as
the general default. After installation, setup creates the saved workspace
`~/mrw-work/MRW.code-workspace` as described below.

In that window's integrated terminal, check:

```sh
python3 --version
```

Python must be 3.11 or later. Set `mrw.pythonExecutable` in User or Remote settings
only if a different executable path is needed. Keep the workspace and MRW's
private saved-work storage on the Linux filesystem. Ordinary notes can remain
in a Windows folder reached through `/mnt/c/…`; Windows-backed private artifact
storage has not been qualified.

For a Linux SSH host, connect with Microsoft's Remote - SSH extension, open the
workspace there and perform the same Python and extension-host checks.

### 2. Install both VSIX packages in that workspace host

Run **Extensions: Install from VSIX…** and install `mrw-0.23.48.vsix` first,
then `mrw-diagnostics-0.1.0.vsix`. Install both in the same WSL/SSH workspace host.
Alternatively, use that window's Linux terminal and substitute the package paths:

```sh
code --install-extension /absolute/path/to/mrw-0.23.48.vsix
code --install-extension /absolute/path/to/mrw-diagnostics-0.1.0.vsix
code --list-extensions --show-versions
```

Confirm `flengyel.mrw@0.23.48` and `flengyel.mrw-diagnostics@0.1.0` under the
WSL/SSH host's installed extensions. After installing both, save unfinished work
and reload once if VS Code requests it. Keep workspace storage when upgrading.
After activation, hovering over the MRW Activity Bar icon shows **MRW 0.23.48**;
the sidebar heading shows the same version. **MRW: Open Tutorial** reports the
active extension build, including when an installed update still awaits reload.
Installing solely on the Windows interface does not install the workspace
extension.

Diagnostics reports are available from **Tools and Setup** and the Command
Palette. To enable scheduled reports, turn on **MRW Diagnostics: Weekly Enabled**.
They run while VS Code is active; missed weekly runs coalesce into one run.
Reporting does not repair data or invoke Codex. See [the companion guide](../diagnostics/README.md).

<a id="3-open-existing-work"></a>

### 3. Set up MRW and open a document

Run **MRW: Set Up MRW Workspace…**. It creates or reuses
`~/mrw-work/MRW.code-workspace`, checks Python and offers to open that exact
workspace in a new window. It does not close the current window or transfer its
saved records. Subsequent runs preserve your settings and files. Reopen this
saved workspace for later sessions; opening `~/mrw-work` as a folder selects a
different VS Code workspace identity. See [workspace setup](WORKSPACE_SETUP.md)
for the layout, optional tools and existing-work recovery.

1. Open the MRW Activity Bar view and choose **Open Document…**, or run
   **MRW: Open Document…** from the Command Palette (**F1**).
2. Choose an **Original file** to read it in place. Choose a **Saved copy** only
   when reopening a previously retained source revision.
3. For linked notes, select their folder with **Choose Notes Folder…**. It can
   be outside the workspace and need not be an Obsidian vault.
4. Use **Show Contents** for the Markdown document's headings and links. Follow
   a link, then use **Return to Document** to return to its originating location.

**Commands** keeps navigation actions available. **Contents** identifies the
selected document; **Earlier Saved Work** provides access to saved studies and history. Opening or
following a note creates no exercise record. Questions and solutions
can remain in their notes.

Run **MRW: Open Tutorial** for the current build's instructions. The
[document guide](READING_OUTLINE_WORKFLOW.md) covers note links, backlinks,
PDF handoff and return behavior. **Reopen Document** restores the last opened
file and its saved exact Markdown selection; preview scrolling and PDF pages
are not restored.

## AI assistance for reviewing mathematics

### Codex companion

Codex can be used beside MRW with its own setup and account. MRW's optional
source-study and proof-work tools prepare explicit clipboard handoffs containing
the selected passages and task. They do not monitor the clipboard or send these
requests automatically.

The source-study view accepts question proposals through **Import questions
from clipboard**. Help replies use **Paste companion response…**, review, and
**Retain response**. The pasted author label does not authenticate authorship
or mathematical correctness. See [the study workflow](ACTIVE_STUDY_WORKFLOW.md).
Basic reading and manual source study require no companion.

### Separate MRW API connector

**Ask OpenAI API about Selection…** and **Ask OpenAI API About Reader Passage…**
prepare an exact request preview. **Send Exact Preview** sends it through MRW's separate OpenAI
connector. A Codex sign-in does not configure this connector.

The connector reads `OPENAI_API_KEY` at Send from the environment inherited by
the Linux extension host. Exporting a variable in an integrated terminal does
not change an already-running host's environment. Keep credentials outside
files and version control. See [the reader AI guide](READER_AI_WORKFLOW.md).

## B. Add SagePod for computation

[SagePod](https://github.com/flengyel/sagepod) supplies SageMath and Jupyter in a
rootless Podman container. Microsoft's Jupyter extension owns notebook editing
and kernel connection; MRW's Python remains on the workspace host.

Follow [the SagePod guide](GETTING_STARTED_WSL_SAGEPOD.md) for prerequisites,
server connection and SageMath kernel selection. Opening MRW starts no container
and executes no notebook cells.

## Optional reading tools and data

[Recommended extensions](RECOMMENDED_EXTENSIONS.md) lists LaTeX Workshop,
Markdown previews, PDF readers, Jupyter and Lean with installation guidance.
Install the companions needed for the task.

[Obsidian](OBSIDIAN_WORKFLOW.md) can edit the same Markdown files. MRW does not
require vault conversion. [TikZ rendering](TIKZ_WORKFLOW.md) requires separate
Linux tools and an explicit render action; saved diagrams can be read offline.

[Folder-rename preparation](FOLDER_RENAME_WORKFLOW.md) and
[source-store move/reconnect](ARTIFACT_STORAGE.md) transfer supported source
records. They do not transfer current-study checkpoints or interaction history.
Those remain in MRW's private VS Code workspace storage on the Linux host.
**Inspect Study History** opens a report; **Export Study History…**
creates a readable or JSON copy. Exports may contain private source text,
attempts and replies. See [data and transfers](../README.md#data-and-transfers).
