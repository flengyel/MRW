"""Stage a normal Windows/WSL Development Host, retaining the prior Stacks example."""
import argparse
import json
from pathlib import Path
import shutil

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--phase', choices=['seed', 'reopen'], required=True)
args = parser.parse_args()
base = Path(__file__).resolve().parents[2]
work = base / '.codex-work/reading-outline-20261101'
ext = work / 'development-extension'
project = base / '.codex-work/stacks-import-20261021/reading-workspace'
if not project.is_dir():
    raise SystemExit('Prior retained Stacks workspace unavailable; no replacement created.')
work.mkdir(exist_ok=True)
for name in ['src', 'media', 'python']:
    shutil.copytree(base / 'vscode' / name, ext / name, dirs_exist_ok=True)
(ext / 'test/host').mkdir(parents=True, exist_ok=True)
shutil.copy2(base / 'vscode/test/host/reading.js', ext / 'test/host/reading.js')
for name in ['package.json', 'LICENSE']:
    shutil.copy2(base / 'vscode' / name, ext / name)
manifest = json.loads((ext / 'package.json').read_text())
manifest['main'] = './test/host/reading.js'
manifest['activationEvents'].append('onStartupFinished')
(ext / 'package.json').write_text(json.dumps(manifest, indent=2) + '\n')
(ext / 'host-test.json').write_text(json.dumps(dict(phase=args.phase, artifacts=str(work), project=str(project))))
code_root = Path('/mnt/c/Users/fleng/AppData/Local/Programs/Microsoft VS Code')
cli = code_root / '2c33b50b16/resources/app/out/cli.js'
if not cli.is_file():
    raise SystemExit('Expected Windows CLI not found; inspect current installation before launching.')
launch = "$ErrorActionPreference='Stop'\n$env:ELECTRON_RUN_AS_NODE='1'\n"
launch += "& 'C:\\Users\\fleng\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe' 'C:\\Users\\fleng\\AppData\\Local\\Programs\\Microsoft VS Code\\2c33b50b16\\resources\\app\\out\\cli.js' --new-window --disable-workspace-trust --remote wsl+Debian "
launch += f'--disable-extensions --extensionDevelopmentPath=vscode-remote://wsl+Debian{ext} --folder-uri=vscode-remote://wsl+Debian{project} --skip-welcome --skip-release-notes\n'
(work / 'launch.ps1').write_text(launch)
(work / 'launch-installed.ps1').write_text(launch.replace(f'--disable-extensions --extensionDevelopmentPath=vscode-remote://wsl+Debian{ext} ', ''))
print(work / 'launch.ps1')
