# Install Mathematical Research Workstation

MRW helps you review mathematical sources, keep attributed reader notes and
organize an ordinary Markdown reading outline. This guide covers **Windows
VS Code connected to WSL2**, with Python running in Linux. Other host arrangements
and their recorded checks are listed in the
[workspace-host guide](../vscode/README.md#workspace-hosts-and-dependencies).

Choose a starting path:

| Your work | Installation path |
| --- | --- |
| Read and review mathematics, annotate sources, navigate an outline | [A. MRW for reading](#a-mrw-for-reading) |
| Add SageMath calculations in a notebook beside the reading | Complete A, then [B. Add SagePod](#b-add-sagepod-for-computation) |
| Ask an AI about mathematical text | Complete A, then [AI assistance](#ai-assistance-for-reviewing-mathematics) |
| Link existing Obsidian notes | Optional [Obsidian companion](#obsidian-links-optional-later) |

SagePod is a separate [companion project](https://github.com/flengyel/sagepod).
It supplies containerized SageMath and Jupyter. MRW's Python core stays on the
WSL host, and Microsoft's Jupyter extension owns the notebook connection.

## Prerequisites by path

| Component | A: Reading | B: Add SagePod |
| --- | --- | --- |
| Windows VS Code and its WSL extension | Required | Same installation |
| WSL2 Linux distribution | Required for this Windows path | Same distribution/user |
| Python 3.11+ on WSL | Required by MRW | Still required outside the container |
| MRW VSIX installed in WSL | Required | Same extension |
| Git on WSL | Needed if building MRW from source | Needed to obtain SagePod |
| Linux Node.js 22+ and npm | Needed only to build the VSIX | Same packaging condition |
| Rootless Podman and SagePod's host packages | Optional | Required; follow SagePod's setup |
| Jupyter and SageMath Enhanced in WSL | Optional | Required for this notebook workflow |
| AI account and API credential | Optional; see AI assistance below | Independent of SagePod |
| Obsidian, Lean and TikZ rendering tools | Optional | Optional |

An installed MRW VSIX bundles its Python core. It needs no Node/npm, Qt,
separate MRW Python-package installation or SageMath installation on the host.

## A. MRW for reading

### 1. Prepare Windows and WSL2

On a new machine, follow Microsoft's
[WSL installation instructions](https://learn.microsoft.com/en-us/windows/wsl/install)
to install a Linux distribution. Debian is the distribution used in the recorded
Windows/WSL checks. In **Windows PowerShell**, check an existing installation with:

```powershell
wsl --list --verbose
```

The chosen distribution should show **VERSION 2**. Reuse an existing suitable
distribution and Linux user. Install **VS Code on Windows**, then Microsoft's
**WSL** extension (`ms-vscode-remote.remote-wsl`) locally in Windows. Follow the
[VS Code WSL guide](https://code.visualstudio.com/docs/remote/wsl#_installation).

### 2. Open your study workspace and check Python

In your **WSL terminal**, go to the existing study folder and run `code .`.
For a first workspace, you can create an ordinary folder, for example:

```bash
mkdir -p ~/mrw-study
cd ~/mrw-study
code .
```

The window's bottom-left corner should show **WSL: Debian**, or the distribution
you chose. In **Terminal → New Terminal** in that window, run:

```bash
python3 --version
```

Install Python **3.11 or later** in WSL if needed. On a current Debian installation,
the distribution's `python3` package supplies it; check the version before
continuing. To use another installed interpreter, set `mrw.pythonExecutable`
in VS Code's **Remote** settings to that executable's path.

Keep the workspace and MRW's default private storage on the Linux filesystem.
Windows-backed artifact storage remains unqualified. Existing sources and
annotations belong to their original workspace; reopen it rather than creating
another folder for that work.

### 3. Obtain and install the MRW package

The current delivered package is **`theorem-terminal-0.11.0.vsix`**, extension
identity **`flengyel.theorem-terminal`**. Obtain a trusted maintainer package, or
follow the [source-build instructions](GETTING_STARTED_WSL_SAGEPOD.md#build-the-vsix).
The source-build route needs Git, Linux Node.js 22+ and npm in addition to Python.

In the intended **WSL VS Code window**, press **F1 → Extensions: Install from
VSIX…** and select the package. Or use that window's WSL integrated terminal,
replacing this example with the package's actual Linux path:

```bash
code --install-extension /absolute/path/to/theorem-terminal-0.11.0.vsix
code --list-extensions --show-versions
```

Verify MRW under **WSL — Installed** in the Extensions view. Save ordinary
documents and any annotation forms before a requested window reload. Preserve
the existing extension identity and workspace storage when upgrading.

### 4. Start reading

Click the **MRW book icon** in the Activity Bar. For retained work, run **MRW:
Open Saved Source Outline…**. For a new source, open a saved UTF-8 mathematical
text, select a passage and run **MRW: Create Outline from Saved Source**.

Write an ordinary Markdown overview with your own headings and prose. Use
**MRW: Insert Outline Reference…** to add saved source or passage references,
then **MRW: Open Reading Outline** to navigate them. See the
[reading guide](READING_OUTLINE_WORKFLOW.md) for exact navigation, return and
unsaved-edit behavior. VS Code owns Markdown editing and saving; save reader
annotation forms with **Save annotation**.

This completes the reading installation. Continue with AI assistance if desired,
or add SagePod when your work calls for calculations.

## B. Add SagePod for computation

Start with path A. Add the following components in the **same WSL distribution
and Linux user**:

1. Install **Git**, **rootless Podman** and SagePod's documented host packages,
   including its ACL, user-namespace, networking and Python-venv prerequisites.
   Follow [SagePod's prerequisites](https://github.com/flengyel/sagepod#prerequisites),
   including its WSL/systemd instructions where applicable.
2. Obtain and install [SagePod](https://github.com/flengyel/sagepod#install) using
   its own instructions. Its explicit setup downloads/builds the image, configures
   its persistent directories and starts Jupyter. Reuse an existing usable
   installation without rerunning setup or permission repair.
3. In VS Code's **WSL** Extensions view, install **Jupyter**
   (`ms-toolsai.jupyter`) and **SageMath Enhanced** (`Lov3.sagemath-enhanced`).
   Save work and reload after adding the Sage language registration.
4. Obtain the current login URL privately with `bin/jupyter-url.sh` in the
   SagePod checkout. The default host port is **8889**; **8888** is the internal
   container port. Keep the URL's credential out of notes and configuration.
5. Create or open an ordinary `.ipynb` in the persistent notebook folder, normally
   `~/Jupyter`. Choose **Select Kernel → Select Another Kernel… → Existing
   Jupyter Server…**, enter the URL and select the actual **SageMath** kernel.
6. Use **+ Code** to add a cell, click inside to type and **Ctrl+Enter** to run
   it. **Ctrl+S** saves the notebook and its outputs.

The [complete SagePod tutorial](GETTING_STARTED_WSL_SAGEPOD.md) covers setup
branches, server/kernel selection, cell creation, persistent paths and returning
to the Markdown overview. SagePod manages computation; opening MRW starts no
container and executes no notebook cells. Saved outputs and live kernel
variables are separate.

## AI assistance for reviewing mathematics

The connector uses the **OpenAI Responses API**. In MRW 0.11.0, click **Ask AI
about this passage…** directly in the source reader, or run **MRW: Ask About
Reader Passage…**. **MRW: Ask About Selected Work** remains available for ordinary
editor text. Both prepare an exact request preview; **MRW: Send Exact Preview**
is a separate explicit action. Reading and preparing a preview require no
provider call.

To use that connector, configure an API credential as `OPENAI_API_KEY` in the
environment inherited by the **WSL extension host**, and choose your model
through `mrw.model` in User/Remote settings or the request prompt. OpenAI's
[API quickstart](https://developers.openai.com/api/docs/quickstart) describes
creating and exporting a key. Keep it outside notes, workspace settings and
version control. Setting it in an already-open integrated terminal does not
change the environment of the existing extension host. MRW reads it only at Send.

See the [reader AI workflow](READER_AI_WORKFLOW.md) for source selection, response
review and retention. Copilot appearing in VS Code does not configure this
connector; its models would require a separate MRW integration. No provider
request is needed to install MRW or SagePod.

## Obsidian links: optional, later

Use Obsidian with your existing notes if desired. MRW already supplies explicit
links to retained outlines/passages and separately configured return links to
Obsidian. Follow the [Obsidian companion guide](OBSIDIAN_WORKFLOW.md) when ready.
No vault conversion, indexing, automatic rewriting or new vault is part of
installation. Testing those links in the user's current setup is **pending**;
it is deferred separately from the successful SagePod connection.

## Early-stage distribution and future webpage

MRW's repository is currently **`flengyel/theorem_terminal`** and is private.
This documentation and source cloning require repository access. The generated
VSIX is not committed; there is no project-published Marketplace listing or
GitHub release download. A public package download would let readers install
without the source-build tools.

For now, these repository guides are the installation reference. A public
webpage could later introduce MRW, link a downloadable package and present these
paths. Web hosting, Marketplace publication and repository visibility changes
are future decisions. The [roadmap](../CODEX_PLAN.md#active-roadmap-mathematical-usefulness-first)
keeps current features separate from planned reader assistance and proof analysis.
