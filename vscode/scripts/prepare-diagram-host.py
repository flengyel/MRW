"""One disposable Windows/WSL diagram workflow, never the genuine reading store."""
import argparse
import json
import os
from pathlib import Path
import shutil
import tempfile

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--phase',choices=('seed','reopen'),required=True)
args=parser.parse_args()
repo=Path(__file__).resolve().parents[2]
work=repo/'.codex-work/tikz-20261102';work.mkdir(exist_ok=True)
project=work/'mrw-tikz-validation';project.mkdir(exist_ok=True)
source=project/'diagram-note.md';content='# Disposable diagram validation\n\nSynthetic source; no mathematical-use claim.\n'
if source.exists() and source.read_text()!=content:raise SystemExit('Disposable source changed; refusing replacement')
if not source.exists():source.write_text(content)
extension=work/'development-extension'
def atomic_copy(source, destination):
    destination=Path(destination)
    fd,name=tempfile.mkstemp(prefix='.stage-',dir=destination.parent)
    try:
        with os.fdopen(fd,'wb') as output:output.write(Path(source).read_bytes())
        os.replace(name,destination)
    finally:
        if Path(name).exists():Path(name).unlink()
    return str(destination)
for name in ('src','media','python'):shutil.copytree(repo/'vscode'/name,extension/name,dirs_exist_ok=True,copy_function=atomic_copy)
(extension/'test/host').mkdir(parents=True,exist_ok=True)
shutil.copy2(repo/'vscode/test/host/diagrams.js',extension/'test/host/diagrams.js')
manifest=json.loads((repo/'vscode/package.json').read_text());manifest['main']='./test/host/diagrams.js';manifest['activationEvents'].append('onStartupFinished')
(extension/'package.json').write_text(json.dumps(manifest,indent=2)+'\n')
annotation='Synthetic commutative diagram, not user mathematics.\n\n```tikz\n'+r'''\begin{document}
\begin{tikzcd}
A \arrow[r,"f"] \arrow[d,"g"'] & B \arrow[d,"h"] \\
C \arrow[r,"k"'] & D
\end{tikzcd}
\end{document}
'''+'```\n'
(extension/'host-test.json').write_text(json.dumps(dict(phase=args.phase,artifacts=str(work),project=str(project),annotation=annotation)))
root=Path('/mnt/c/Users/fleng/AppData/Local/Programs/Microsoft VS Code')
cli=root/'2c33b50b16/resources/app/out/cli.js'
if not cli.exists():raise SystemExit('Current Windows CLI changed; inspect it rather than guessing')
launch="$ErrorActionPreference='Stop'\n$env:ELECTRON_RUN_AS_NODE='1'\n"
launch+="& 'C:\\Users\\fleng\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe' 'C:\\Users\\fleng\\AppData\\Local\\Programs\\Microsoft VS Code\\2c33b50b16\\resources\\app\\out\\cli.js' --new-window --disable-workspace-trust --remote wsl+Debian "
launch+=f'--disable-extensions --extensionDevelopmentPath=vscode-remote://wsl+Debian{extension} --folder-uri=vscode-remote://wsl+Debian{project} --skip-welcome --skip-release-notes\n'
(work/'launch.ps1').write_text(launch)
print(work/'launch.ps1')
