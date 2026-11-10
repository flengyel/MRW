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
parser.add_argument('--investigation-phase', choices=('seed', 'resume_end', 'sequential'))
parser.add_argument('--investigation-outcome', choices=('failed', 'refused', 'incomplete'))
parser.add_argument('--outline-phase', choices=('seed', 'restart', 'refine', 'associations', 'associations_restart'))
parser.add_argument('--proof-provenance', type=Path, help='external original proof provenance record for historical outline checks')
args = parser.parse_args()
if args.investigation_outcome and args.investigation_phase != 'sequential':
    parser.error('--investigation-outcome requires --investigation-phase sequential')
extension = Path(__file__).resolve().parents[1]
artifacts = args.artifacts.resolve()
artifacts.mkdir(parents=True, exist_ok=True)
config_path = extension.parent / '.codex-work/vscode-host/config.json'
config_path.parent.mkdir(parents=True, exist_ok=True)
if args.outline_phase in ('restart', 'refine', 'associations_restart'):
    staged_config = artifacts / 'persistence-extension/host-test.json'
    value = json.loads(staged_config.read_text())
    prior = {'restart': 'seed', 'refine': 'restart', 'associations_restart': 'associations'}[args.outline_phase]
    report = json.loads((artifacts / f'outline-{prior}.json').read_text())
    if not report.get('complete') or report.get('failure'):
        raise SystemExit(f'Complete and close the outline {prior} host first')
    value['phase'] = args.outline_phase
    staged_config.write_text(json.dumps(value, indent=2))
    print(staged_config.parent)
    raise SystemExit(0)
if args.investigation_phase and args.investigation_phase != 'seed':
    staged_config = artifacts / 'persistence-extension/host-test.json'
    value = json.loads(staged_config.read_text())
    value['phase'] = args.investigation_phase
    value['outcome'] = args.investigation_outcome
    staged_config.write_text(json.dumps(value, indent=2))
    print(staged_config.parent)
    raise SystemExit(0)
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
if args.outline_phase == 'seed':
    repo = extension.parent
    pinned_source = repo / '.codex-work/proof-outline-recon-20261014/external-tools/equational_theories/equational_theories/Subgraph.lean'
    if hashlib.sha256(pinned_source.read_bytes()).hexdigest() != '63fd9ade107c888ca9b04d57f0a1ee8f0b0fb324fb4646cdac7404f8741301cd':
        raise SystemExit('Pinned reconnaissance source unavailable or changed; do not fetch or compile automatically')
    for source, name in [(pinned_source, 'Subgraph.lean'),
                         (repo / 'tests/fixtures/reading/euclid-ix20.txt', 'euclid-ix20.txt')]:
        target = project / name
        if target.exists() and target.read_bytes() != source.read_bytes():
            raise SystemExit(f'Refusing to replace existing source: {target}')
        target.write_bytes(source.read_bytes())
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
manifest['main'] = './test/host/investigation.js' if args.investigation_phase else './test/host/persistence.js'
if args.outline_phase:
    manifest['main'] = './test/host/outlines.js'
manifest['activationEvents'] = ['*']
(staged / 'package.json').write_text(json.dumps(manifest, indent=2))
host_config = dict(config, phase='seed')
if args.outline_phase:
    if args.proof_provenance is None or not args.proof_provenance.is_file():
        raise SystemExit('Provide the original external --proof-provenance record for these historical checks')
    host_config.update(phase=args.outline_phase,
                       goals=str(extension.parent / 'tests/fixtures/reading/lean-goals.json'),
                       provenance=str(args.proof_provenance.resolve()),
                       sourceCommit='1aec8a7acf223b7c56e4830977b6e90d4ef1924b',
                       euclidUrl='https://www.claymath.org/library/historical/euclid/files/elem.9.20.html')
(staged / 'host-test.json').write_text(json.dumps(host_config, indent=2))
hashes = {str(p.relative_to(extension)): hashlib.sha256(p.read_bytes()).hexdigest()
          for directory in ('src', 'python') for p in (extension / directory).rglob('*')
          if p.is_file() and '__pycache__' not in p.parts}
for relative, expected in hashes.items():
    assert hashlib.sha256((staged / relative).read_bytes()).hexdigest() == expected
(artifacts / 'staged-source-digests.json').write_text(json.dumps(hashes, indent=2))
print(json.dumps(dict(config, persistence_extension=str(staged)), indent=2))
