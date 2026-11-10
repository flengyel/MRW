# Study notebooks with VS Code Jupyter and SagePod

For installation, [choose the reading or computation path](INSTALLATION.md).
SagePod is MRW's optional computation companion. For a first notebook connection,
follow [Install MRW and use SagePod in WSL2](GETTING_STARTED_WSL_SAGEPOD.md).
This companion guide preserves the workflow boundaries and recorded host
evidence. See [the installation guide](INSTALLATION.md) for the current MRW
package and installation commands.

Use an ordinary `.ipynb` for explanations, rendered mathematics, Sage code and
saved outputs. VS Code and Microsoft's Jupyter extension provide the notebook
editor and kernel interaction; SagePod provides SageMath in its existing
container. MRW provides saved sources, exact retained passages, annotations
and Contents for Markdown documents. Its Python backend stays on the workspace
host.
No new MRW runtime, notebook controller or container service is required.

## Open the existing environment

Install **Jupyter** (`ms-toolsai.jupyter`) in the VS Code workspace environment
(for example, **WSL** in the Extensions view). Its renderer/keymap extensions
are installed with it. Also install **SageMath Enhanced**
(`Lov3.sagemath-enhanced`) there to register the `sage` language. With the
observed Jupyter 2025.9.1, an unregistered `sage` language leaves code cells
unexecutable even though the server and kernel appear in the picker. Reload
the window after adding this language extension, before selecting the kernel.
Use Jupyter's notebook execution controls; this workflow does not use the
language extension's separate **Run SageMath File** command or require Sage on
the workspace host. Its [language registration](https://github.com/n-WN/sagemath-vscode-enhanced/blob/main/package.json)
is separate from Jupyter's server/kernel handling.

MRW introduced the overview-reference actions in 0.5.0. Python
3.11+ on the workspace host remains MRW's requirement; the Sage kernel uses the
Python and Sage installed inside SagePod. Python/Pylance extensions are optional
for this existing-server workflow; they do not install SageMath.

In a workspace-host terminal, go to your existing SagePod checkout and inspect
the running container and published port:

```bash
podman ps --format '{{.Names}} {{.Status}} {{.Ports}} {{.Image}}'
podman port sagepod
podman inspect sagepod --format '{{json .Mounts}}'
```

Use your configured container name when it differs. Reuse its current image,
port and mounts. If it is stopped, first confirm the expected image exists and
use the checkout's documented `./man-up.sh --no-follow` with the same overrides.
That helper can build a missing image; do not use it to initiate an unintended
build. Do not rerun setup or permission repair for an already usable notebook
mount. Save other sessions before any separately intended container changes.

Obtain the current authenticated URL privately from the current SagePod checkout's
`bin/jupyter-url.sh`. It reads the running server and published port without
restarting kernels. For an older checkout without this helper, use its startup
output or `podman logs --tail 2000 sagepod`. The output may contain a server token. Do not
paste it into a note, settings file, issue, report or repository. Use the
**host's published port** in the URL, not the container's internal port. The
observed mapping was `http://127.0.0.1:8889` to container port 8888.

Open a study folder inside the existing persistent notebook mount in the same
VS Code workspace host. Trust the folder only when you trust its contents.
Open or create a standard notebook there (**Create: New Jupyter Notebook**,
then Save As `.ipynb`, or Explorer **New File** with that suffix).

## Select SagePod explicitly

With the notebook open:

1. Choose **Select Kernel** at the upper right, or **Notebook: Select Notebook
   Kernel** from the Command Palette. If recent kernels are listed first,
   choose **Select Another Kernel…**.
2. Choose **Existing Jupyter Server…** and enter the running server's
   authenticated URL in the URL prompt. Give it a recognizable display name,
   such as `SagePod (WSL, 8889)`.
3. Select **SageMath 10.10** (the observed display name), kernelspec
   **`sagemath`**. Check the server and actual name on your installation. If the
   Sage kernel is missing, stop and diagnose discovery; do not select ordinary
   Python as a substitute. This server also advertises `python3` as its default.
4. Run only the cells you intend to execute, using the cell's Run control or
   **Run All**. A trusted notebook and remembered kernel selection do not mean
   that its cells have executed.

VS Code/Jupyter owns this server connection. Keep its credentials in the
extension's connection storage; no token-bearing URL belongs in workspace
configuration or notebook metadata. See Microsoft's
[kernel selection instructions](https://code.visualstudio.com/docs/datascience/jupyter-kernel-management#_existing-jupyter-server)
and [notebook operations](https://code.visualstudio.com/docs/datascience/jupyter-notebooks).

## Keep paths and state distinct

| Location | Role |
| --- | --- |
| Workspace host `~/Jupyter` | Existing persistent ordinary files edited and saved by VS Code |
| SagePod `/home/sage/notebooks` | The same bind mount as seen by Sage/Jupyter inside the container |
| Workspace-host MRW private extension storage | Saved sources and annotations; outside the notebook mount |
| Live Sage kernel | Variables and unsaved computation state; separate from `.ipynb` bytes |

For example, host `~/Jupyter/mrw-sagepod-study/sagepod-study.ipynb` corresponds
to container `/home/sage/notebooks/mrw-sagepod-study/sagepod-study.ipynb`.
The host's home path does not become a container path. Inspect `Path.cwd()`
inside the kernel before reading relative data files; use an appropriate
container path for Sage-side file access. A VS Code notebook save writes the
host file. It does not require the server's Contents API to save that file.

Use ordinary relative links in a Markdown cell, for example
`[Working note](overview.md)`. Keep that Markdown document in the study workspace;
it can contain references inserted using **MRW: Insert Source or Passage Link…**.
Open the note in the Markdown editor, put the cursor in an MRW reference,
and run **MRW: Follow Source or Passage Link at Cursor**. This explicit action opens
the reader and retained material. **MRW: Show Contents** offers heading and
MRW-link navigation for a Markdown document in the workspace.
Return to the notebook via an ordinary link in the working note, an open tab,
or Explorer. No notebook-cell bridge is needed for this movement. MRW reference
commands operate on ordinary Markdown editors, not notebook cells or Markdown
preview clicks.

Copying the notebook and its companion ordinary files preserves those files
and relative links. **It does not transfer MRW's private targets.** MRW links
remain bound to their existing canonical workspace/private-storage scope;
moving the workspace or using another host does not relocate retained sources.
References and a successful calculation confer no proof-checking status.

## Save, reopen and reproduce deliberately

Edit Markdown/code cells normally; render Markdown with its completion control
or Shift+Enter. Use **Save** (Ctrl+S), close the editor, and reopen the `.ipynb`
from Explorer. Saved source cells and outputs should remain visible. They do
not demonstrate live kernel memory or a new execution.

For a deliberate reproduction check, use **Restart Kernel and Run All Cells**
for this notebook and confirm the restart. This discards this kernel's variables
and executes cells in document order. Do not restart another notebook's kernel
or shut down the shared SagePod container. Save the new outputs explicitly.
Record the Sage/kernel versions and any external data or packages needed.
Opening/restoring MRW starts no container and runs no notebook cells.

The delivered example and the distinction between visible UI checks and
authenticated API checks are recorded in
[the validation report](SAGEPOD_NOTEBOOK_VALIDATION.md). Mathematical usefulness
requires evidence from actual study; this arithmetic demonstration leaves it
unassessed. Direct notebook-cell assistance, automatic response insertion,
automatic execution and kernel-memory restoration remain outside MRW.
