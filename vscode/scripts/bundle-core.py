"""Stage the repository's Python sources; never maintain a second core copy."""
from pathlib import Path
import shutil

extension = Path(__file__).resolve().parents[1]
source = extension.parent / 'src' / 'mrw'
destination = extension / 'python' / 'mrw'
# This staging area owns only generated package directories.
for staged in destination.parent.iterdir():
    if staged.is_symlink():
        staged.unlink()
    elif staged.is_dir():
        shutil.rmtree(staged)
shutil.copytree(source, destination, ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
shutil.copyfile(extension.parent / 'LICENSE', extension / 'LICENSE')
print('Bundled repository Python core and license')

# Stage the minimal integral Lean runtime from its authoritative source files.
# Never copy the build cache or an executable into the VSIX.
import json
from hashlib import sha256
registry = json.loads((source/'data/route_runtime.json').read_text())
engine = registry['engines'][registry['current']]
route_assets = extension/'media/route-engine'
if route_assets.exists():
    if route_assets.is_symlink(): raise ValueError('Redirected route asset staging directory')
    shutil.rmtree(route_assets)
route_assets.mkdir()
for name, entry in engine['sources'].items():
    target = route_assets/name
    if target.is_absolute() and not target.is_relative_to(route_assets): raise ValueError('Unsafe runtime asset name')
    data = (extension.parent/entry['source']).read_bytes()
    if sha256(data).hexdigest() != entry['sha256']: raise ValueError('Route runtime pin differs: '+name)
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_bytes(data)
shutil.copyfile(extension.parent/'docs/JUSTIFICATION_EUCLID_EXAMPLE.md', extension/'media/euclid-grounds.md')
print('Bundled pinned route-engine sources and Euclid walkthrough; no compiled checker')
