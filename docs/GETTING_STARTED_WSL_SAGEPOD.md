# Install MRW and use SagePod in WSL2

This is **path B: MRW with SagePod**. For reading and mathematical review, start
with [path A in the installation guide](INSTALLATION.md#a-mrw-for-reading).
That path also points to the existing AI connector; SagePod is an optional
computation companion with its own installation.

This tutorial gets you from Windows VS Code to a mathematical reading workspace
with an ordinary notebook running SageMath. It describes **MRW 0.14.4**. The
SagePod helper instructions use revision `4bc1bc3`, reviewed on **2026-11-03**.

MRW is the **Mathematical Research Workstation** VS Code extension, sometimes
called the plugin. Install it from a `.vsix` package. There is currently no
project-published Marketplace installation or GitHub release download; if you
do not already have the package, use [Build the VSIX](#build-the-vsix) below.
This tutorial is hosted in the private project repository: viewing it and
cloning the source require repository access. A public copy of this installation tutorial and a downloadable binary are
still pending.

The connection to SagePod belongs to **Microsoft's Jupyter extension**. There is
no separate SagePod connection setting in MRW.

| Component | Where it runs | What it supplies |
| --- | --- | --- |
| VS Code | Windows | Windows, tabs, editing, saving and undo |
| MRW and Python 3.11+ | Your WSL2 distribution | Retained sources, reader annotations and Markdown reading outlines |
| Jupyter extension | The same WSL workspace host | Notebook editing and connection to the SagePod server |
| SagePod | A rootless Podman container in WSL2 | Jupyter server and the actual SageMath kernel |

Ordinary MRW reading works without SagePod, Lean or an AI account. Saved TikZ
diagrams have [separate optional rendering prerequisites](TIKZ_WORKFLOW.md).

## 1. Open the intended folder in WSL

Install [VS Code on Windows and its WSL extension](https://code.visualstudio.com/docs/remote/wsl#_installation).
Use a WSL2 Linux distribution; the recorded companion workflow used Debian.
In Windows PowerShell, `wsl --list --verbose` shows each distribution's WSL
version.

Open your existing study workspace in WSL. Its identity matters: if it already
has MRW sources and annotations, keep using that folder or saved workspace.
For a new notebook workspace, first use SagePod's existing persistent notebook
directory, normally `~/Jupyter`. After SagePod setup, you can create a study
subdirectory there. All shell commands below run **in WSL**, except the
PowerShell check above. For example, to open the persistent notebook directory:

```bash
cd ~/Jupyter
code .
```

The bottom-left corner must show **WSL: Debian**, or your chosen distribution.
Use **Terminal → New Terminal** in that window and check:

```bash
python3 --version
```

MRW needs Python **3.11 or later on WSL**, independently of the Python inside
SagePod. A different installed interpreter can be selected using
`mrw.pythonExecutable` in VS Code's **Remote** settings.

If SagePod has not been installed yet, use [the setup branch in step 3](#3-obtain-sagepods-current-login-url)
before opening its notebook directory. Keep notebooks and MRW's default private
storage on the Linux filesystem; Windows-backed artifact storage is not qualified.

## 2. Install MRW and the notebook extensions

With the intended WSL folder open, press **Ctrl+Shift+X** for Extensions.
Install these components in the locations shown:

| Extension | Identifier | Installation location |
| --- | --- | --- |
| WSL | `ms-vscode-remote.remote-wsl` | Windows/local |
| Mathematical Research Workstation | `flengyel.theorem-terminal` | WSL, from the VSIX |
| Jupyter | `ms-toolsai.jupyter` | WSL |
| SageMath Enhanced | `Lov3.sagemath-enhanced` | WSL |

For MRW, press **F1**, choose **Extensions: Install from VSIX…**, and select
`theorem-terminal-0.14.4.vsix`. Alternatively, in that window's WSL integrated
terminal, replace the example path with your package's actual Linux path:

```bash
code --install-extension /absolute/path/to/theorem-terminal-0.14.4.vsix
code --list-extensions --show-versions
```

Check that **Mathematical Research Workstation 0.14.4** appears under
**WSL: your-distribution — Installed**, along with Jupyter and SageMath Enhanced.
The CLI identity is `flengyel.theorem-terminal@0.14.4`. If an extension appears
only under **Local — Installed**, use its **Install in WSL** action. Microsoft's
[WSL extension guide](https://code.visualstudio.com/docs/remote/wsl#_managing-extensions)
explains these two installation locations.

Save ordinary documents and any open MRW annotation forms before a requested
window reload. Then reload after installing the Sage language extension. It
registers the `sage` cell language; missing registration prevented execution
with the Jupyter version used in the recorded workflow. Use Jupyter's notebook
Run controls; **Run SageMath File** is a separate command requiring its own
setup. Sage does not need to be installed directly on the WSL host.

**You should now see the MRW book icon in the left Activity Bar.** Click it to
open Reading Outline and Research Tools. MRW's **…** menu and **F1 → MRW:**
commands remain available. An installed VSIX needs no Node/npm, Qt, Lean or
separate Python-package installation. Upgrading it does not require deleting
workspace storage.

## 3. Obtain SagePod's current login URL

Use the SagePod checkout and WSL user that own your existing installation. The
commands below assume the default checkout `~/src/sagepod` and container name
`sagepod`; keep your existing overrides if they differ.

```bash
cd ~/src/sagepod
podman ps -a --format '{{.Names}} {{.Status}} {{.Ports}} {{.Image}}'
```

**If SagePod is running**, obtain its current authenticated URL without
restarting it or its kernels:

```bash
bin/jupyter-url.sh
```

Copy the complete printed URL into the Jupyter connection prompt in step 4.
It normally begins with `http://localhost:8889/` and includes the current login
token. Treat that URL as a credential: keep it out of notes, notebook cells,
workspace settings, screenshots and Git. If password authentication is configured,
the helper reports that instead.

**If an existing installation is stopped**, save work in other notebook sessions
and follow [SagePod's start instructions](https://github.com/flengyel/sagepod#start-and-stop),
using the same configuration. Its explicit `./man-up.sh --no-follow` action can
build a missing image and recreate a container when configuration changes.
Do not rerun setup or permission repair merely to reconnect VS Code.

**For a first installation**, follow [SagePod's prerequisites and WSL2 setup](https://github.com/flengyel/sagepod#prerequisites),
then its [installation instructions](https://github.com/flengyel/sagepod#install).
The explicit `bin/setup.sh` action downloads/builds the image, sets ownership
and ACLs in its six data directories, starts the server and checks it. Read
those steps before running them, especially on a machine with existing notebooks.
Return here when it prints the working Jupyter login URL.

Use the **published host port**, normally **8889**, rather than the internal
container port **8888**. A different Jupyter server on port 8888 needs its own
credentials and is not the same SagePod installation. To inspect the default
container's mapping:

```bash
podman port sagepod
```

## 4. Select the server, then the SageMath kernel

In the WSL VS Code window:

1. Create a notebook with **F1 → Create: New Jupyter Notebook** and save it as
   an `.ipynb` file in your persistent study folder. Or open an existing notebook.
2. Click **Select Kernel** at the notebook's upper right. If recent kernels
   appear, choose **Select Another Kernel…**.
3. Choose **Existing Jupyter Server…**, then the option to enter a server URL.
   Paste the authenticated URL from step 3 and give the connection a recognizable
   name, such as `SagePod (WSL, 8889)`.
4. From that server, select **SageMath**. The recorded display name was
   **SageMath 10.10**, with kernelspec name **`sagemath`**. An ordinary
   **Python 3 (ipykernel)** entry runs a different kernel.

**You should now see SageMath selected in the notebook's upper-right corner.**
These are VS Code/Jupyter's [existing-server and kernel selection controls](https://code.visualstudio.com/docs/datascience/jupyter-kernel-management#_existing-jupyter-server).
Jupyter owns the saved server connection; MRW does not store its token.

### Add a cell and run it

Click **+ Code** in the notebook's top toolbar to insert a code cell below the
selected cell. You can also hover between cells and click **+ Code** there.
Click inside the new cell to type. With a cell selected, **Esc**, then **B**
adds a cell below using the keyboard.

For a small execution check, enter:

```python
from sage.env import SAGE_VERSION
print(SAGE_VERSION)
factor(2^10 - 1)
```

Click the cell's **▶ Run** button on its left, or press **Ctrl+Enter** to execute
it and display the output below. **Shift+Enter** runs the cell and advances to
the next cell, creating one at the end when needed. Press **Ctrl+S** to save
the notebook and output. See Microsoft's
[cell creation instructions](https://code.visualstudio.com/docs/datascience/jupyter-notebooks#_add-additional-code-cells).

With the recorded SagePod image, the version is `10.10` and the factorization
is `3 * 11 * 31`. Run only cells you intend to execute. This example checks the
connection; it is not a required mathematical exercise.

## 5. Read, take notes and calculate together

Keep an ordinary Markdown overview beside the notebook. Give it any headings
and prose useful for your work; there is no required template.

1. In the **same workspace**, open a saved UTF-8 source text and select a passage.
   Use **MRW: Create Outline from Saved Source**. Add other passages with
   **MRW: Add Selected Source Region**. Existing work can instead use
   **MRW: Open Saved Source Outline…**.
2. In your Markdown overview, place the cursor where you want a reference.
   Run **MRW: Insert Outline Reference…** and choose the saved whole source
   outline or an exact passage. Repeat for other retained sources as needed.
3. With that Markdown document active, click the **MRW book icon → Open Reading
   Outline**, or run **MRW: Open Reading Outline**. Expand sections, choose a
   heading to reach its editor location, or choose a source/passage reference
   to open the reader. **MRW: Return to Reading Outline** returns to its
   originating overview location. Editing the overview, including unsaved edits
   and undo/redo, updates the navigator.
4. In a notebook Markdown cell, a relative link such as
   `[Reading overview](overview.md)` opens the companion file. Use an ordinary
   file link in the overview to return to your notebook. MRW reference commands
   operate in the Markdown editor; following a link in a notebook cell or Markdown
   preview does not supply that command bridge.

Use an explicit [Stacks section import](STACKS_WORKFLOW.md) if that is the source
you want. Import is a separate network action. Opening retained sources, the
reading outline and saved annotations does not import or execute anything.
See the [reading-outline guide](READING_OUTLINE_WORKFLOW.md) for exact navigation
and return behavior.

MRW's retained sources and annotations live in private storage scoped to the
workspace. Opening a different folder does not expose another workspace's
outlines. Copying only the notebook and Markdown does not transfer private MRW
targets. Keep the same workspace for existing references; use the documented
[artifact workflow](ARTIFACT_STORAGE.md) for an explicitly intended transfer.

## 6. Save and return later

Press **Ctrl+S** to save your notebook and Markdown. Save MRW annotation forms
using their own **Save annotation** button. On reopening the same workspace,
open the notebook normally and use **MRW: Open Reading Outline** on its saved
overview or **MRW: Open Saved Source Outline…** for the reader.

Saved notebook outputs remain in the file. Live Sage variables belong to the
kernel and may be gone after it stops. Reconnect to the current server/kernel
and rerun deliberately when needed; reopening MRW runs no cells and starts no
container. With the default mount, host `~/Jupyter` appears inside SagePod as
`/home/sage/notebooks`. Use container paths for code executing in Sage, and
host paths for VS Code files.

## Troubleshooting

| What you see | What to check |
| --- | --- |
| No MRW commands or icon | Confirm the bottom-left WSL indicator, MRW under WSL Installed, Python 3.11+, and a trusted workspace. Use F1 if the Activity Bar placement was customized. |
| No SagePod container | Check the configured name and WSL user/distribution. Follow SagePod's own start/setup branch; MRW does not start it. |
| Login rejected | Obtain a fresh URL with `bin/jupyter-url.sh`. Use its published host port and the credentials for that server. |
| No Existing Jupyter Server option | Confirm Microsoft's Jupyter extension is installed in WSL, then choose Select Another Kernel. |
| Notebook uses Python | Choose the SagePod server's actual `sagemath` kernel. Installing a local Python extension does not install Sage. |
| Sage is selected but Run does nothing | Check SageMath Enhanced is installed in WSL to register `sage`; save work and reload after installing it. |
| Sage cannot find a file VS Code can see | Compare the host and container mount paths. Inspect the kernel's working directory before using relative paths. |
| MRW reference reports a different workspace or missing target | Reopen the originating workspace and its valid retained storage. Do not create replacement records to make the link resolve. |

## Build the VSIX

Skip this section if you already have a trusted MRW package. The repository
does not commit its generated VSIX files. To build **0.14.4** yourself, use
**Linux Node.js 22+, npm, Python 3.11+ and Git in WSL**. Node/npm are only
packaging requirements. Check `node --version`, `npm --version` and
`command -v node npm`; Windows npm launchers cannot run the Linux build chain.

Use a **new directory**, leaving existing checkouts and study work alone:

```bash
mkdir -p ~/src
git clone https://github.com/flengyel/MRW.git ~/src/mrw-install
cd ~/src/mrw-install
git rev-parse HEAD
npm ci --prefix vscode --ignore-scripts
TZ=UTC SOURCE_DATE_EPOCH=1792094267 npm run package --prefix vscode
npm run verify-vsix --prefix vscode -- theorem-terminal-0.14.4.vsix
sha256sum vscode/theorem-terminal-0.14.4.vsix
```

This creates `~/src/mrw-install/vscode/theorem-terminal-0.14.4.vsix` and verifies
its runtime bytes against that checkout. Record the commit printed by
`git rev-parse HEAD` and the archive's actual SHA-256. The
[folder-rename delivery record](FOLDER_RENAME_VALIDATION.md) identifies the
maintainer package. Byte-identical reproduction also depends on the recorded
packaging tool versions.
See [packaging details](../vscode/README.md#package-and-install-a-vsix).
Return to your **study workspace's WSL window** and [install the VSIX in step 2](#2-install-mrw-and-the-notebook-extensions).
This builds locally and publishes nothing.

## Roadmap and further help

[CODEX_PLAN.md](../CODEX_PLAN.md#active-roadmap-mathematical-usefulness-first)
is the active project roadmap. MRW 0.11.1 delivers the reading navigator, retained
source reader, attributed annotations, typeset annotation mathematics and explicit
TikZ rendering. The existing [Ask About Selected Work](../vscode/README.md#workflows)
action prepares assistance from selected ordinary editor text and requires a
separate **Send Exact Preview** action. Direct retained-passage assistance is
available from the source reader in 0.11.1; see the
[reader AI workflow](READER_AI_WORKFLOW.md). Direct notebook-cell capture,
AI-proposed outlines, inference graphs and vertex elimination remain pending.

For detailed boundaries, use the [SagePod companion workflow](SAGEPOD_NOTEBOOK_WORKFLOW.md)
and [its October 16 validation report](SAGEPOD_NOTEBOOK_VALIDATION.md). That report
records actual Windows/WSL notebook execution, saving and reopening with MRW
0.5.0. Its November 3 follow-up records the user's successful factorization and
the cell-creation difficulty. This tutorial updates installation guidance for
0.11.1; it does not claim a new end-to-end notebook test or a fresh SagePod installation.
