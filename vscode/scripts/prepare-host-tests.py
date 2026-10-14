"""Prepare disposable projects and a normal-host persistence test extension."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import tempfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--artifacts', type=Path, required=True)
parser.add_argument('--project', type=Path)
parser.add_argument('--persistence-phase', choices=('seed', 'restart'))
args = parser.parse_args()
extension = Path(__file__).resolve().parents[1]
artifacts = args.artifacts.resolve()
artifacts.mkdir(parents=True, exist_ok=True)
config_path = extension.parent / '.codex-work/vscode-host/config.json'
config_path.parent.mkdir(parents=True, exist_ok=True)
if args.persistence_phase:
    config = json.loads(config_path.read_text())
    if config['artifacts'] != str(artifacts):
        raise SystemExit('Use the artifacts directory from the prepared command run')
    report = json.loads((artifacts / 'initial.json').read_text())
    if not report.get('complete') or report.get('failure'):
        raise SystemExit('The command-host checks must finish successfully first')
    staged_config = artifacts / 'persistence-extension/host-test.json'
    value = json.loads(staged_config.read_text())
    value.update(phase=args.persistence_phase, completed=config['completed'])
    if args.persistence_phase == 'restart' and not value.get('oldReview'):
        raise SystemExit('Run and close the seed development host before restart')
    staged_config.write_text(json.dumps(value, indent=2))
    print(staged_config.parent)
    raise SystemExit(0)
project = args.project.resolve() if args.project else Path(tempfile.mkdtemp(prefix='mrw-vscode-host-'))
project.mkdir(parents=True, exist_ok=True)
for name, text in [('note.md', 'α😀 → β\nNext question.\n'),
                   ('example.lean', '-- Local source handoff only\nexample : True := True.intro\n')]:
    target = project / name
    if not target.exists():
        target.write_text(text, encoding='utf-8')
    elif target.read_bytes() != text.encode():
        raise SystemExit(f'Refusing to replace existing work: {target}')
config = dict(project=str(project), artifacts=str(artifacts), phase='initial')
config_path.write_text(json.dumps(config, indent=2))
# Every production source and bundled Python byte remains unchanged. Only the
# staged manifest's entry point/activation and the test-only config differ.
staged = artifacts / 'persistence-extension'
shutil.copytree(extension, staged, ignore=shutil.ignore_patterns('.vscode', '*.vsix', '__pycache__'), dirs_exist_ok=True)
manifest = json.loads((staged / 'package.json').read_text())
manifest['main'] = './test/host/persistence.js'
manifest['activationEvents'] = ['*']
(staged / 'package.json').write_text(json.dumps(manifest, indent=2))
(staged / 'host-test.json').write_text(json.dumps(dict(config, phase='seed'), indent=2))
hashes = {str(p.relative_to(extension)): hashlib.sha256(p.read_bytes()).hexdigest()
          for directory in ('src', 'python') for p in (extension / directory).rglob('*')
          if p.is_file() and '__pycache__' not in p.parts}
for relative, expected in hashes.items():
    assert hashlib.sha256((staged / relative).read_bytes()).hexdigest() == expected
(artifacts / 'staged-source-digests.json').write_text(json.dumps(hashes, indent=2))
print(json.dumps(dict(config, persistence_extension=str(staged)), indent=2))
