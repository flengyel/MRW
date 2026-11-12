# The MRW workspace

Use **MRW**, at `~/mrw-work/MRW.code-workspace` on the Linux host, as the general
workspace. It is independent of Stacks, Lean, a particular note, and the command
used to begin reading. Do not use a temporary test directory as your workspace.

A workspace is VS Code's session boundary: it selects folders, settings and
workspace-scoped MRW records. A **notes folder** supplies ordinary files and the
scope for note links and backlinks. These locations need not coincide.

| Location | Purpose |
| --- | --- |
| `~/mrw-work/MRW.code-workspace` | The saved workspace to reopen |
| `~/mrw-work/` | General Linux working directory; default parent for new Lean projects |
| A separately selected notes folder | Notes, links and attachments; an Obsidian vault is optional |
| VS Code's private storage on the Linux host | Retained sources, annotations, studies and history, according to their existing stores |
| An MRW source checkout | Extension development; unnecessary for using the VSIX |

For example, `/home/alice/mrw-work/MRW.code-workspace` can read notes at
`/mnt/c/Users/Alice/Zettelkasten`. The latter is a valid WSL path to Windows
files. Linux builds work more efficiently on the Linux filesystem; Windows
notes can stay where Obsidian uses them. See
[Microsoft's filesystem guidance](https://learn.microsoft.com/en-us/windows/wsl/filesystems).

## First installation on Windows and WSL2

1. Install VS Code on Windows and Microsoft's **WSL** extension there. Install
   a WSL2 distribution such as Debian; `wsl --list --verbose` in PowerShell
   confirms its name and WSL version. Follow the
   [official WSL setup](https://code.visualstudio.com/docs/remote/wsl#_installation).
2. Run **WSL: Connect to WSL using Distro…**, select Debian and check that the
   bottom-left indicator says **WSL: Debian**. This can be an empty window.
3. In its terminal, run `python3 --version`. MRW requires Python 3.11 or later
   on this host. If absent, install Debian's `python3` package; if its version
   is too old, upgrade the distribution or configure an installed supported
   interpreter with `mrw.pythonExecutable` in Remote settings.
4. [Install the current MRW VSIX](INSTALLATION.md#2-install-the-vsix-in-that-workspace-host)
   on **WSL: Debian**, rather than only the Windows interface.
5. Run **MRW: Set Up MRW Workspace…** from F1 or MRW's Commands view. It prepares
   `~/mrw-work/MRW.code-workspace` and reports the path and Python check. Choose
   **Open in new window** to open it. The previous window stays open; close it
   yourself when its work is saved. In the default workspace, repeating setup
   offers no second workspace window.
6. Use **Choose Notes Folder…** for your notes and **Open Document…** to read.
   No import, copied vault or study form is required.

Setup is available on Linux, including Linux SSH hosts. On Windows or macOS
it asks you to connect to a Linux host. It does not install WSL, Python or other
software. Ordinary reading needs no Node/npm, Qt, Lean, SageMath or AI account.
Workspace Trust remains VS Code's decision; trust only folders you control.
No setup can promise to suppress every VS Code warning or remote timeout.

## What repeating setup does

Setup creates `mrw-work`, `MRW.code-workspace` and a short README only if missing.
Complete files are published without overwriting a competing or existing file,
then synchronized to disk. If interrupted, rerunning completes missing files.
A reported write/synchronization failure is not reported as successful setup.
Existing settings, comments, README edits and files remain byte-for-byte intact.
A preexisting malformed workspace file is preserved for you to repair in VS Code.

On first creation, setup carries over the configured notes folder, if any, and
sets `mrw.leanStudyParent` to the Linux working directory. Later runs do not
reset either setting. The home and working directory are checked for known
Windows/network filesystems; redirected target paths are rejected. Setup neither
runs on activation nor moves data. It does not close or reload the working window.

Reopen the same file from a Debian terminal:

```sh
code "$HOME/mrw-work/MRW.code-workspace"
```

Opening `~/mrw-work` as a folder instead selects a different workspace identity.
Keep the `.code-workspace` file at its established address. Different dedicated
project workspaces remain possible, but a new topic or document does not require
one. Reopen Document, sources, studies and history belong to the selected session.

## Existing work and relocation

Creating the default workspace does **not** merge other workspaces. Keep the
original sessions available: their notes, annotated sources, study drafts,
history and Lean working copies remain at their existing locations. Do not
replace or edit VS Code's live state databases. Setup does not change Obsidian
links or the companion `.obsidian/mrw.json` routing file.

Use **Show Artifact Location** in the original session to identify retained
source storage. The [saved-work guide](ARTIFACT_STORAGE.md) describes explicit,
verified source-store moves/adoption. It does not move active Studies, recorder
history, editor recovery, Lean resumption state or all navigation state. The
[folder preparation workflow](FOLDER_RENAME_WORKFLOW.md) has the same limits;
it is not an atomic move of the whole workspace.

[Complete workspace relocation](WORKSPACE_RELOCATION_DESIGN.md) is the next setup
requirement. Until it is implemented and verified, retain the original workspace
for earlier saved work rather than rename it and assume all records will follow.

## Optional companions

| Task | Additional setup |
| --- | --- |
| Lean study and proof development | Official Lean 4 extension and elan/Lean on the Linux workspace host. [Lean setup](LEAN_STUDY_WORKFLOW.md). New projects use `mrw.leanStudyParent`; existing copies stay in place. |
| SageMath notebooks | Jupyter and SageMath support on the workspace host, with an explicitly connected SagePod kernel. [SagePod setup](GETTING_STARTED_WSL_SAGEPOD.md). Its notebook mount is separate from the MRW workspace. |
| Obsidian editing | Select the same notes folder both applications use. [Obsidian setup](OBSIDIAN_WORKFLOW.md). No Obsidian installation is required for plain Markdown. |
| TikZ rendering | The tools and explicit render action in [TikZ setup](TIKZ_WORKFLOW.md). |
| Zotero references | Zotero's enabled local API. [Zotero setup](ZOTERO_WORKFLOW.md). |

## Troubleshooting

- **No MRW command:** check MRW under the connected host's installed extensions,
  its active version, and Workspace Trust. Installing locally alone is insufficient.
- **Records appear missing:** reopen their original `.code-workspace` file or
  folder. Do not create replacement records to compensate for a different session.
- **The notes folder is wrong:** choose the intended folder or a recent entry
  with **Choose Notes Folder…**. Opening a document does not change this setting.
- **WSL timed out:** reconnect to Debian, then open the same saved workspace.
  A timeout does not require creating another workspace.
- **Python check failed:** verify the executable in the connected host's terminal
  and its Remote setting. Python inside SagePod does not supply MRW's interpreter.
