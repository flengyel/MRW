"""Check a packaged extension against this checkout without importing its code."""
import argparse
from hashlib import sha256
import json
from pathlib import Path, PurePosixPath
from zipfile import ZipFile


def verify(archive):
    extension = Path(__file__).resolve().parents[1]
    repository = extension.parent
    manifest = json.loads((extension / 'package.json').read_text())
    containers = manifest.get('contributes', {}).get('viewsContainers', {}).get('activitybar', [])
    mrw_container = next((item for item in containers if item.get('id') == 'mrw'), {})
    if mrw_container.get('title') != f'MRW {manifest["version"]}':
        raise ValueError('MRW Activity Bar title must match the package version')
    expected = {'extension/package.json', 'extension/readme.md', 'extension/LICENSE.txt',
                'extension.vsixmanifest', '[Content_Types].xml'}
    exact = {'extension/LICENSE.txt': repository / 'LICENSE',
             'extension/python/bridge.py': extension / 'python/bridge.py'}
    for path in (extension / 'src').glob('*.js'):
        exact['extension/' + str(path.relative_to(extension))] = path
    for path in (extension / 'media').rglob('*'):
        if path.is_file():
            exact['extension/' + str(path.relative_to(extension))] = path
    notice = json.loads((extension / 'media/katex/NOTICE.json').read_text())
    if notice['version'] != manifest['devDependencies']['katex']:
        raise ValueError('Bundled math renderer differs from its pinned build dependency')
    for name, expected_digest in notice['files'].items():
        if sha256((extension / 'media/katex' / name).read_bytes()).hexdigest() != expected_digest:
            raise ValueError('Bundled math renderer or license bytes changed')
    markdown = json.loads((extension / 'media/markdown-it/NOTICE.json').read_text())
    if markdown['version'] != manifest['devDependencies']['markdown-it']:
        raise ValueError('Bundled Markdown parser differs from its pinned dependency')
    for name, expected_digest in markdown['files'].items():
        if sha256((extension / 'media/markdown-it' / name).read_bytes()).hexdigest() != expected_digest:
            raise ValueError('Bundled Markdown parser or license bytes changed')
    scheduler = json.loads((extension / 'media/fsrs/NOTICE.json').read_text())
    if scheduler['version'] != manifest['devDependencies']['ts-fsrs']:
        raise ValueError('Bundled scheduler differs from its pinned build dependency')
    for name, expected_digest in scheduler['files'].items():
        if sha256((extension / 'media/fsrs' / name).read_bytes()).hexdigest() != expected_digest:
            raise ValueError('Bundled scheduler or license bytes changed')
    for path in (repository / 'src/mrw').rglob('*'):
        if path.is_file() and path.suffix in ('.py', '.json') and '__pycache__' not in path.parts:
            exact['extension/python/mrw/' + str(path.relative_to(repository / 'src/mrw'))] = path
    quiver = json.loads((repository / 'src/mrw/quiver.json').read_text())
    if sha256(quiver['tex'].encode()).hexdigest() != 'dd729a5bcfbd66d154d643f832f5003f7ff91dbcd1a925d4014ba9d3aec576cc' or 'MIT License' not in quiver['license']:
        raise ValueError('Bundled Quiver package or attribution changed')
    expected.update(exact)
    with ZipFile(archive) as package:
        names = [i.filename for i in package.infolist() if not i.is_dir()]
        if len(names) != len(set(names)) or set(names) != expected:
            raise ValueError(f'Unexpected/missing package files: extra={sorted(set(names) - expected)}, '
                             f'missing={sorted(expected - set(names))}')
        if any(PurePosixPath(n).is_absolute() or '..' in PurePosixPath(n).parts for n in names):
            raise ValueError('Unsafe archive path')
        packed = json.loads(package.read('extension/package.json'))
        if packed != manifest or packed['main'] != './src/extension.js' or packed['extensionKind'] != ['workspace']:
            raise ValueError('Packaged manifest differs from production')
        for name, source in exact.items():
            if package.read(name) != source.read_bytes():
                raise ValueError(f'Packaged runtime bytes differ: {name}')
        return dict(archive=str(archive.resolve()), sha256=sha256(archive.read_bytes()).hexdigest(),
                    extension_id=f'{packed["publisher"]}.{packed["name"]}', version=packed['version'],
                    files={n: sha256(package.read(n)).hexdigest() for n in sorted(names)},
                    production_manifest_matches=True, runtime_bytes_match=True, development_files_excluded=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('vsix', type=Path)
    args = parser.parse_args()
    print(json.dumps(verify(args.vsix), indent=2, sort_keys=True))
