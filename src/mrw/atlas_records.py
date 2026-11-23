"""Publish explicitly saved atlas revisions and their pinned proof outlines."""
from hashlib import sha256
import json
from pathlib import Path
import re

from .local_files import read_bounded
from .private_persistence import persist_private_new, PrivatePersistenceError
from .proof_graph import MAX_BYTES, validate
from .workspace import strict_json

MAX_ATLAS = 2 * 1024 * 1024
SNAPSHOT = re.compile(r'study-sources/([a-f0-9]{64})\.txt')


def destination(request, suffix):
    root = Path(request['project_root'])
    file = Path(request['path'])
    if (not root.is_absolute() or root.resolve(strict=True) != root or
            not file.is_absolute() or not file.name.endswith(suffix) or
            file.parent.resolve(strict=True) != file.parent or
            not file.parent.is_relative_to(root)):
        raise ValueError('Choose a destination inside the workspace.')
    return file


def raw_json(value):
    return (json.dumps(value, ensure_ascii=False, allow_nan=False, indent=2) + '\n').encode()


def publish_atlas(request):
    file = destination(request, '.mrw-atlas.json')
    content = request['text']
    if not isinstance(content, str) or len(raw := content.encode()) > MAX_ATLAS:
        raise ValueError('Atlas exceeds 2 MiB.')
    record = strict_json(raw)
    source = record.get('source') if isinstance(record, dict) else None
    if (not isinstance(source, dict) or record.get('version') != 1 or
            not isinstance(source.get('text'), str) or
            sha256(source['text'].encode()).hexdigest() != source.get('revision')):
        raise ValueError('Atlas capture differs from its pinned revision.')
    persist_private_new(file, raw)
    return {'path': str(file), 'revision': sha256(raw).hexdigest()}


def publish_graph(request):
    file = destination(request, '.mrw-proof.json')
    graph, snapshots = request['graph'], request['snapshots']
    validate(graph)
    encoded_graph = raw_json(graph)
    if len(encoded_graph) > MAX_BYTES:
        raise ValueError('Proof outline exceeds 512 KiB.')
    if not isinstance(snapshots, dict) or len(snapshots) > 16:
        raise ValueError('Invalid outline snapshots.')
    if file.exists() or file.is_symlink():
        raise ValueError('Proof outline already exists.')
    pinned = {}
    for source in graph['sources']:
        match = SNAPSHOT.fullmatch(source['file'])
        content = snapshots.get(source['id'])
        if not match or match[1] != source['sha256'] or not isinstance(content, str):
            raise ValueError('Outline source differs from its approved snapshot.')
        if len(raw := content.encode()) > 128 * 1024 or sha256(raw).hexdigest() != source['sha256']:
            raise ValueError('Outline source differs from its approved snapshot.')
        pinned[source['id']] = (source['file'], raw, len(re.split(r'\r\n|\r|\n', content)))
    if pinned.keys() != snapshots.keys() or sum(len(raw) for _, raw, _ in pinned.values()) > MAX_ATLAS:
        raise ValueError('Outline snapshots exceed the approved inputs.')
    for item in graph['nodes'] + graph['inferences']:
        for citation in item.get('citations', []):
            if citation['end_line'] > pinned[citation['source']][2]:
                raise ValueError('A citation leaves its approved passage.')
    folder = file.parent / 'study-sources'
    folder.mkdir(mode=0o700, exist_ok=True)
    if folder.resolve(strict=True) != folder:
        raise ValueError('Snapshot directory was redirected.')
    for name, raw, _ in pinned.values():
        target = file.parent / name
        if not target.exists() and not target.is_symlink():
            try:
                persist_private_new(target, raw)
            except PrivatePersistenceError:
                if not target.exists():
                    raise
        if target.is_symlink() or read_bounded(target, 128 * 1024, 'atlas snapshot') != raw:
            raise ValueError('A pinned text snapshot differs.')
    persist_private_new(file, encoded_graph)
    return {'path': str(file)}
