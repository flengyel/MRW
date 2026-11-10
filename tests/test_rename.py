"""MRW entry points, generated-core staging and preserved MRW citations."""
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]

class RenameTests(unittest.TestCase):
    def test_module_entry_point_and_package_metadata_agree(self):
        run = subprocess.run([sys.executable, '-m', 'mrw', '--help'], capture_output=True, text=True)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertIn('usage: mrw ', run.stdout)
        import mrw
        import tomllib
        metadata = tomllib.loads((ROOT / 'pyproject.toml').read_text())['project']
        self.assertEqual(metadata['name'], 'mrw')
        self.assertEqual(metadata['scripts'], {'mrw': 'mrw.cli:main'})
        self.assertEqual(metadata['version'], mrw.__version__)
        self.assertEqual({p.name for p in (ROOT / 'src').iterdir() if p.is_dir() and (p / '__init__.py').exists()}, {'mrw'})

    def test_bundler_clears_generated_package_debris(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            script = root / 'vscode/scripts/bundle-core.py'; script.parent.mkdir(parents=True)
            script.write_bytes((ROOT / 'vscode/scripts/bundle-core.py').read_bytes())
            core = root / 'src/mrw'; core.mkdir(parents=True)
            (core / '__init__.py').write_text('"""MRW fixture."""\n')
            (root / 'LICENSE').write_text('Fixture license\n')
            debris = root / 'vscode/python/obsolete_core'; debris.mkdir(parents=True)
            (debris / '__init__.py').write_text('raise AssertionError("obsolete staging")\n')
            subprocess.run([sys.executable, str(script)], check=True, capture_output=True)
            self.assertFalse(debris.exists())
            self.assertEqual((root / 'vscode/python/mrw/__init__.py').read_bytes(), (core / '__init__.py').read_bytes())
