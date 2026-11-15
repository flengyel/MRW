"""MRW entry points, generated-core staging and preserved MRW citations."""
from pathlib import Path
import json
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
            registry=json.loads((ROOT/'src/mrw/data/route_runtime.json').read_text())
            (core/'data').mkdir();(core/'data/route_runtime.json').write_text(json.dumps(registry))
            engine=registry['engines'][registry['current']]
            for entry in engine['sources'].values():
                target=root/entry['source'];target.parent.mkdir(parents=True,exist_ok=True)
                target.write_bytes((ROOT/entry['source']).read_bytes())
            (root/'docs').mkdir();(root/'docs/JUSTIFICATION_EUCLID_EXAMPLE.md').write_text('Owned Euclid fixture\n')
            assets=root/'vscode/media/route-engine';assets.mkdir(parents=True)
            (assets/'obsolete.asset').write_text('stale source asset')
            debris = root / 'vscode/python/obsolete_core'; debris.mkdir(parents=True)
            (debris / '__init__.py').write_text('raise AssertionError("obsolete staging")\n')
            subprocess.run([sys.executable, str(script)], check=True, capture_output=True)
            self.assertFalse(debris.exists())
            self.assertFalse((assets/'obsolete.asset').exists())
            self.assertEqual({p.relative_to(assets).as_posix() for p in assets.rglob('*') if p.is_file()},set(engine['sources']))
            self.assertEqual((root/'vscode/media/euclid-grounds.md').read_text(),'Owned Euclid fixture\n')
            self.assertEqual((root / 'vscode/python/mrw/__init__.py').read_bytes(), (core / '__init__.py').read_bytes())
