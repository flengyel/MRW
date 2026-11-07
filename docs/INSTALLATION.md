# Install Mathematical Research Workstation

MRW 0.22.0 is installed from a VSIX. There is no published Marketplace listing or
GitHub release. Obtain a maintainer package or [build from source](../vscode/README.md#package-and-install-a-vsix)
with repository access. The extension identity is `flengyel.mrw`.

## A. MRW for reading

The established Windows arrangement uses **VS Code 1.95+ on Windows connected to
WSL2 Debian**, with **Python 3.11+ in Linux**. The extension runs on the workspace
host. Other arrangements and their evidence are listed in the
[host table](../vscode/README.md#workspace-hosts-and-dependencies).

An installed VSIX needs no Qt, npm, separate MRW Python-package installation,
Lean, SageMath or AI account. Build tools are needed only when making the package.

### 1. Open the intended Linux workspace

Install Windows VS Code and Microsoft's WSL extension (`ms-vscode-remote.remote-wsl`)
if needed. [Microsoft's WSL guide](https://code.visualstudio.com/docs/remote/wsl#_installation)
covers connecting the window. Use a WSL2 distribution; `wsl --list --verbose` in
Windows PowerShell reports its version.

Reopen your study's folder or saved workspace. Existing sources and annotations
belong to that workspace. For a new study only, in a WSL terminal:

```sh
mkdir -p ~/mrw-study
cd ~/mrw-study
code .
```

In that window's integrated terminal, check:

```sh
python3 --version
```

Python must be 3.11 or later on the workspace host, normally `python3`. An
alternative executable path can be set in `mrw.pythonExecutable` in User or Remote
settings. Keep the workspace and private storage on the Linux filesystem;
Windows-backed artifact storage is not qualified.

For a Linux SSH host, connect with Microsoft's Remote - SSH extension, open the
study folder there and perform the same Python and extension-host checks.
The earlier scoped SSH reader check used Raspberry Pi 5/Debian 12 ARM64; it does
not establish acceptance of every SSH host or the current study interaction.

### 2. Install the VSIX in that workspace host

Run **Extensions: Install from VSIX…** and select
`mrw-0.22.0.vsix`. Alternatively, in the connected window's Linux
integrated terminal, substitute the actual package path:

```sh
code --install-extension /absolute/path/to/mrw-0.22.0.vsix
code --list-extensions --show-versions
```

Confirm `flengyel.mrw@0.22.0` under the WSL/SSH host's installed
extensions. Installing only in the Windows/local interface is insufficient.
Save ordinary files and checkpoint MRW forms before a requested reload. This release starts fresh under `flengyel.mrw`; it does not copy prior studies
or history automatically. Retain this new workspace storage for later upgrades.

### 3. Open existing work

Open an existing document with VS Code's **File → Open File…**. Run
**MRW: Open Tutorial** for the document, retained-passage and study walkthrough.

For your own source, select saved UTF-8 text/Markdown/TeX and run **MRW: Study
Current Material**, or use **Study current material** in a retained reader.
An empty study offers **Enter a question** or **Request questions from Codex**.
Submit work, retain help when needed, and use **Pause / save** followed by
**MRW: Resume Study**. The [bundled tutorial](../vscode/media/first-steps.md) lists
these controls; the [study workflow](ACTIVE_STUDY_WORKFLOW.md) explains their state.

For an optional offline demonstration, run **MRW: Open Study Example**. Its two
attributed questions record practice separately and preserve other work.

The **MRW** Activity Bar icon opens **Studies** and **Contents**. Other commands
remain in the views' **…** menus and Command Palette. **MRW: Open Saved Source…**
reopens retained reading material. With an ordinary Markdown document active,
run **MRW: Show Contents**.
Contents follows headings and explicit MRW source links; it currently requires
a saved Markdown file to belong to the workspace. It does not generate
mathematical content.

## AI assistance for reviewing mathematics

### Codex companion

The study editor copies a complete, exact question/help handoff to the clipboard.
Paste it into your configured Codex companion. Copy the answer, then use **Paste
companion response…**, review text and author, and **Retain response** in MRW.
Question proposals use **Import questions from clipboard**; ordinary help requires
no JSON. This exchange is manual. MRW makes no provider request or clipboard watch.
The pasted author's identity and mathematical correctness are not authenticated.

Codex setup and sign-in belong to that extension. Its account connection does not
configure MRW's separate API connector. Offline manual questions and attempts need
no companion. See [the active study workflow](ACTIVE_STUDY_WORKFLOW.md).

### Separate MRW API connector

**Ask About Selected Work** and **Ask About Reader Passage…** prepare an exact
request preview. **Send Exact Preview** is a separate action using the existing
OpenAI connector. It requires `OPENAI_API_KEY` in the environment inherited by the
Linux extension host, read only at Send; an integrated terminal export does not
change an already-running host. Keep credentials outside files and version control.
No API key is needed to install or use offline study. See
[the reader AI workflow](READER_AI_WORKFLOW.md) for this separate record lifecycle.

## B. Add SagePod for computation

[SagePod](https://github.com/flengyel/sagepod) is an optional companion supplying
SageMath and Jupyter in a rootless Podman container. MRW's Python remains on the
workspace host; Microsoft's Jupyter extension owns notebook editing/connection.

Follow [the SagePod tutorial](GETTING_STARTED_WSL_SAGEPOD.md) for its prerequisites,
installation, authenticated server URL, actual SageMath kernel and cell controls.
Keep login URLs private. Opening MRW starts no container or notebook execution.

## Optional reading tools and data

[Obsidian](OBSIDIAN_WORKFLOW.md) links or imports notes without converting a vault.
[TikZ](TIKZ_WORKFLOW.md) rendering needs separate Linux tools and is explicit;
reading saved diagrams works offline. [Folder-rename preparation](FOLDER_RENAME_WORKFLOW.md)
and [source-store move/reconnect](ARTIFACT_STORAGE.md) preserve supported source
records. They do not yet transfer current-study checkpoints or event histories.

Current studies/history are private data in the extension's VS Code workspace
storage on the Linux host. **Inspect Study History** reads it; **Export Study
History…** explicitly saves a selected readable/JSON copy, which can contain
source text, attempts, replies and private references. Review before sharing.
[The project README](../README.md#data-and-transfers) describes the boundary.

Legacy Qt/CLI setup and the Lean justification experiment are kept in the
[historical account](../CHANGELOG.md#standalone-qt-installation-and-launch).
They are not prerequisites for a VS Code study.
