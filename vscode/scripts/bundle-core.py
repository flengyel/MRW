"""Stage the repository's Python sources; never maintain a second core copy."""
from pathlib import Path
import shutil

extension = Path(__file__).resolve().parents[1]
source = extension.parent / 'src' / 'theorem_terminal'
destination = extension / 'python' / 'theorem_terminal'
if destination.exists():
    shutil.rmtree(destination)
shutil.copytree(source, destination, ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
shutil.copyfile(extension.parent / 'LICENSE', extension / 'LICENSE')
print('Bundled repository Python core and license')
