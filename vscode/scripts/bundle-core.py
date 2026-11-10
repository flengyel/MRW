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
