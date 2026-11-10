"""Prepare only the focused overview Development Host; never installs an extension."""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import shutil
import tempfile

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--artifacts',type=Path,required=True)
parser.add_argument('--phase',choices=('seed','restart'),default='seed')
a=parser.parse_args(); repo=Path(__file__).resolve().parents[2]
artifacts=a.artifacts.resolve(); artifacts.mkdir(parents=True,exist_ok=True)
stage=artifacts/'development-extension'; config_path=stage/'host-test.json'
if a.phase=='restart':
 config=json.loads(config_path.read_text())
 report=json.loads((artifacts/'overview-seed.json').read_text())
 if not report.get('complete') or report.get('failure'):raise SystemExit('Complete and close the focused seed host first')
 config['phase']='restart'; config_path.write_text(json.dumps(config,indent=2)+'\n')
else:
 if config_path.exists():raise SystemExit('Use a new artifacts directory; existing validation work is preserved')
 project=Path(tempfile.mkdtemp(prefix='mrw-overview-20261016-'))
 shutil.copyfile(repo/'tests/fixtures/reading/euclid-ix20.txt',project/'euclid-ix20.txt')
 shutil.copyfile(repo/'tests/fixtures/reading/divisor-note.txt',project/'divisor-note.txt')
 (project/'overview.md').write_bytes('# Manual overview — validation fixture\r\n\r\nPurpose: compare two retained reading routes. This is scripted reader synthesis.\r\n\r\n'.encode())
 (stage/'test/host').mkdir(parents=True)
 for directory in ('src','python'):
  shutil.copytree(repo/'vscode'/directory,stage/directory,ignore=shutil.ignore_patterns('__pycache__'))
 shutil.copyfile(repo/'vscode/test/host/overview.js',stage/'test/host/overview.js')
 manifest=json.loads((repo/'vscode/package.json').read_text())
 manifest['main']='./test/host/overview.js'; manifest['activationEvents']=['*']
 (stage/'package.json').write_text(json.dumps(manifest,indent=2)+'\n')
 config=dict(project=str(project),artifacts=str(artifacts),phase='seed')
 config_path.write_text(json.dumps(config,indent=2)+'\n')
 hashes={str(p.relative_to(stage)):sha256(p.read_bytes()).hexdigest() for directory in ('src','python') for p in (stage/directory).rglob('*') if p.is_file()}
 for n,h in hashes.items():assert sha256((repo/'vscode'/n).read_bytes()).hexdigest()==h
 (artifacts/'production-source-digests.json').write_text(json.dumps(hashes,indent=2)+'\n')
print(json.dumps(dict(config,development_extension=str(stage)),indent=2))
