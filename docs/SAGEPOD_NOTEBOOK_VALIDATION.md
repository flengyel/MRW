# SagePod companion notebook validation — 2026-10-16

## User-led reconnection and cell creation — 2026-11-03

The installed MRW baseline is now 0.10.0. At the user's request, Codex stopped
the separate SageQueue `sagemath` container. The user then started SagePod;
read-only Podman output confirmed `sagepod` running with host port 8889 mapped
to container port 8888, using the Sage 10.10 image. No SagePod restart, setup,
permission/mount change or credential retrieval was performed by Codex.

The existing `~/Jupyter/mrw-sagepod-study/sagepod-study.ipynb` was located without
reading or changing its contents. The user reports opening it in VS Code,
entering the SagePod URL, completing kernel selection, and successfully running
the requested `factor(2^10 - 1)` check. They reported that adding a new cell was
not obvious. The tutorial now states how to insert a code cell, focus it, run
it and save the result, with the keyboard alternative and next-cell behavior.

This is user-reported execution through the notebook connection, with separately
observed container status. No new screenshot, independent cell-output inspection,
save/close/reopen observation or fresh-kernel rerun is claimed. It does not
establish mathematical usefulness. The October 16 campaign below remains
historical evidence; it was not repeated.

## Original companion validation

This increment connects existing components: MRW 0.5.0 at `2fe6b4e`, VS Code
Jupyter, and the existing SagePod installation. It changes documentation and
configuration, with no MRW runtime change or new VSIX. The WSL/Pi deployment
evidence remains the completed baseline; Pi installation was not repeated.

## Environment and preservation

The starting MRW checkout was clean `main`, synchronized with `origin/main` at
`2fe6b4e`. SagePod was inspected at `462273c` (`main`, synchronized); its
pre-existing untracked `txt` was preserved. Its README, `podman-compose.yml`,
`Containerfile`, `man-up.sh` and `docs/setup-review.md` govern the reused setup.

Windows VS Code 1.141.2 connects to the WSL Debian workspace host (x86-64,
Python 3.13.5). MRW was installed as 0.4.1 and upgraded using the existing
0.5.0 VSIX, SHA-256
`1580ff1ff022662028a1c302abe190698919663fb1bf40fc74742696baa1ebe8`.
Installation succeeded. All 98 inventoried pre-existing MRW private files
matched their SHA-256 baselines immediately afterward; no reset or migration
was performed. This is an upgrade for the study workflow, without another
installation acceptance campaign.

The existing rootless Podman 5.4.2 container `sagepod` was already running,
using image `localhost/sagepod-sagemath:10.10-pycryptosat`, image ID
`5268b48bd5b27df1c415b5578da10884f588894c3982f0bd7c02873c48ce7caf`.
Host `0.0.0.0:8889` maps to container port 8888. The six existing mounts were:

| Workspace-host path | Container path |
| --- | --- |
| `/home/flengyel/Jupyter` | `/home/sage/notebooks` |
| `/home/flengyel/.jupyter` | `/home/sage/.jupyter` |
| `/home/flengyel/.sagepod-dot_sage` | `/home/sage/.sage` |
| `/home/flengyel/.sagepod-local` | `/home/sage/.local` |
| `/home/flengyel/.sagepod-config` | `/home/sage/.config` |
| `/home/flengyel/.sagepod-cache` | `/home/sage/.cache` |

No image build, setup/start command, mount change or permission repair was
needed. The unrelated SageQueue `sagemath` container on host port 8888 was left
running. Baselines include both container identities/start times and the 11
pre-existing files under the notebook mount. This increment creates a separate
study directory; it does not replace an existing notebook.

Installed in the WSL extension host:

| Extension | Observed version |
| --- | --- |
| MRW (`flengyel.theorem-terminal`) | 0.5.0 |
| Jupyter (`ms-toolsai.jupyter`) | 2025.9.1 |
| Jupyter Notebook Renderers | 1.3.0 |
| Jupyter Keymap | 1.1.2 |
| Jupyter Cell Tags / Slide Show | 0.1.9 / 0.1.6 |
| SageMath Enhanced (`Lov3.sagemath-enhanced`) | 2.0.8 |

Python/Pylance extensions were not installed in WSL for this existing-server
workflow. The MRW Python bridge remains in the workspace host, separate from
SagePod's Python environment.

## Authenticated API and configuration checks

Authenticated HTTP checks confirmed server root `/home/sage/notebooks`, initially
empty kernel/session lists, and these actual kernelspecs:

| Name | Display name | Language | Launch module |
| --- | --- | --- | --- |
| `sagemath` | SageMath 10.10 | `sage` | `sage.repl.ipython_kernel` |
| `python3` (server default) | Python 3 (ipykernel) | `python` | `ipykernel_launcher` |

VS Code's **Existing Jupyter Server…** flow received the authenticated URL
privately and the display name `SagePod (WSL, 8889)`. No token is included in
this report, ordinary files or committed evidence. The actual Sage kernel was
selected explicitly; ordinary Python was not substituted.

Initial Run All attempts left cells unexecuted. Inspection of the installed
Jupyter extension found that its controller's supported-language list includes
registered VS Code language IDs. Without a `sage` registration it returned an
empty supported-language list for Sage's kernelspec. The existing SageMath
Enhanced extension registers that language; this is a configuration dependency,
without modifying a kernelspec, MRW or the SagePod image. Its separate script-run
command was not invoked. The workflow documents this dependency and window reload.

## Visible notebook workflow

The durable notebook is
`/home/flengyel/Jupyter/mrw-sagepod-study/sagepod-study.ipynb`, corresponding to
`/home/sage/notebooks/mrw-sagepod-study/sagepod-study.ipynb` inside SagePod.
Companions are `overview.md` and `euclid-ix20.txt` in the same directory.
The transcription is copied exactly from the existing Euclid IX.20 validation
source (SHA-256 `b61e101306a7faec8c9cf7f3626ed9a165c9081bd8cc10af348971e6f0927205`);
translator/edition remain unknown. It is a demonstration, not new corpus ingestion.

An ordinary Windows VS Code / WSL window opened this folder with installed
extensions and no development-host staging. The user trusted this study folder.
Captured notebook rendering shows prose, inline mathematics, a displayed
factorization and a relative overview link. Keyboard automation initially lost
focus and was stopped by foreground guards. Stray text reached only the new
demonstration notebook; a local draft copy was retained for correction. These
automation issues are separate from the Jupyter language-registration blocker.

Explicit **Notebook: Run All** after selecting Sage started a server session
whose kernel name is `sagemath`; the API reported one connection and then idle.
The two saved code cells have execution counts 1 and 2, with these outputs:

```text
SageMath: 10.10
Kernel: sage.repl.ipython_kernel.kernel
Python: 3.13.5
Container working directory: /home/sage/notebooks

2^10 - 1 = 1023
Prime factorization: 3 * 11 * 31
Independent product: 1023
```

The factorization cell asserts the value, reconstructed product and exact prime
factors. Sage's preparser interprets `^` as exponentiation; an ordinary Python
kernel would not satisfy these assertions. Saving used VS Code's ordinary Save
action; the standard notebook file contains the outputs. `nbformat.validate`
inside SagePod passed and confirmed the host-created file is visible through the
existing mount. These file/API checks supplement the UI action; they are not an
independent human study session.

The notebook editor accepted and saved direct prose edits, including unintended
typing when focus moved. That draft was preserved locally. The example's prose
correction and environment-diagnostic additions were scripted ordinary-file
edits while its notebook editor was closed. An attempted accessibility value
replacement did not update Monaco's model and was not counted as an editing
success. No MRW editor/buffer was introduced. These observations demonstrate
the ordinary editor/save path, rather than an independent human study session.

The notebook and its preview were closed using normal editor close controls and
the saved notebook reopened through **File → Open Recent**. Rendered prose,
mathematics, code and saved outputs remained available. The added diagnostic
lines still had their older outputs until execution was explicitly requested;
opening the file did not run cells. VS Code/Jupyter reconnected to the still-live
remote Sage session, which is distinct from restoring variables from the file.

**Restart Kernel**, the separate native **Restart** confirmation, **Run All**
and ordinary Save completed a fresh-kernel reproduction check. The final kernel
PID is **1186**, versus **1014** in the preceding saved run. Counts reset to 1
and 2; the added environment outputs include:

```text
Kernel PID: 1186
Prior calculation in live memory: False
```

The final diagnostic tests `isinstance(globals().get("n"), Integer)` before the
calculation cell. A draft presence-only test was misleading because Sage already
defines `n`; it was corrected and the affected restart/rerun repeated. The exact
factorization and product assertions passed again, with no error output. Final
host/container bytes match SHA-256
`738c3bae47f94c09b2354afdec871718518319e064056034b4b8a79e803e5bcf`.
The container read and `nbformat.validate` passed after the final VS Code save.

The notebook's **source overview** link opened `overview.md` and its Markdown
preview. Its **Euclid IX.20 transcription** link opened the ordinary source
text, and **study notebook** returned to the notebook. A new whole-source
outline/reference was prepared and resolved using the installed 0.5.0 bundled
bridge, in this new workspace's private storage. This setup/follow check is
scripted service use; the existing MRW reference-command acceptance campaign
was not repeated. Follow that reference explicitly from the ordinary Markdown
editor, not by clicking the preview link.

All **98** pre-existing MRW private files and **11** pre-existing notebook-mount
files still match their starting SHA-256 baselines. Both pre-existing containers
retain their IDs, images, PIDs and start times. No other notebook kernel/session
was stopped; SagePod remains running with this demonstration's Sage session.

Native accessibility/menu/dialog controls performed the focused host actions.
Initial foreground screenshots and later window-render captures were inspected;
the latter capture the specific VS Code window without copying another app's
screen or clipboard. They are scripted host/render evidence, not independent
human notebook use. The user supplied folder trust and incidental typing; these
are not human acceptance of the study workflow. See the committed
[checks](evidence/sagepod-notebook-20261016/checks.json),
[saved notebook JSON](evidence/sagepod-notebook-20261016/notebook.json),
[fresh-kernel render](evidence/sagepod-notebook-20261016/fresh-kernel-final.png),
[overview](evidence/sagepod-notebook-20261016/overview-from-notebook.png),
[source](evidence/sagepod-notebook-20261016/source-from-overview.png) and
[return to notebook](evidence/sagepod-notebook-20261016/returned-calculation.png).

No MRW runtime code changed. Documentation links/whitespace, JSON/evidence and
credential-absence checks accompany the actual Sage/format checks. Existing
MRW 0.5.0 regression and WSL/Pi deployment evidence is reused; no full acceptance
campaign, compiler test or package rebuild was repeated.

## Scope of the mathematical explanation

The short demonstration presents the known product `3 * 11 * 31 = 1023` and
checks `factor(2^10 - 1)` against it. It does not establish Euclid's general
theorem. The exposition's order is purpose/source link, finite arithmetic
identity, environment/calculation cells, then continuation instructions.
All numbers are concrete; the code defines `n` before using it.

The mathematical-writing skill consulted Knuth, Larrabee and Roberts,
[*Mathematical Writing*, CS-TR-88-1193](https://www-cs-faculty.stanford.edu/~knuth/papers/cs1193.pdf),
§1, printed pp. 1–6 (PDF pp. 3–8). Its advice on connecting formulas with prose
and introducing variables was applied to this short example. No structural
revision or missing definition was found; the prose explicitly separates a
finite example from the source's general argument. This is an editorial scope
check, not proof certification or usefulness evidence.

## Limits

Notebook UI/editing/save/kernel controls belong to VS Code/Jupyter; computation
belongs to SagePod. No direct notebook-cell R2/R3 bridge, automatic response
insertion, kernel-memory restoration, synchronization or private-target export
is implemented. Copying Markdown or the notebook alone does not transfer MRW
outlines or retained sources. The Qt notebook summary/handoff is unchanged.
Only the existing WSL SagePod arrangement is involved; Pi and other hosts are
outside this check. Interactive widgets, plots, arbitrary package workflows and
long calculations are not covered by the finite arithmetic example.

The inspected [Jupyter log](evidence/sagepod-notebook-20261016/jupyter.log)
is a sanitized copy with trailing whitespace removed. It records an optional
widget-CDN fetch failure at `https://unpkg.com/`, invalid-
password warnings during connection probing despite successful authenticated
API/execution, and missing Sage kernel-completion trigger configuration. These
did not block plain Markdown/math or arithmetic. Interactive widgets and Sage
kernel completions are unvalidated; no repair or image rebuild is claimed.

No live model-provider or Lean/checker call, container rebuild or Marketplace
publication was made. Ordinary reading/outlining still requires neither SagePod
nor Jupyter. Mathematical usefulness remains unassessed.
