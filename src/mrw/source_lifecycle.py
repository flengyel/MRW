"""Reversible saved-copy removal; retained bytes and exact links stay owned in place."""
from hashlib import sha256
from uuid import uuid4

from .local_files import read_bounded
from .mutable_files import save_mutable
from .source_outlines import OutlineStore, encoded, fields, identity, now, revision
from .workspace import strict_json

SCHEMA = 'mrw.source-lifecycle'
NAME = 'source-status.json'


def status(store):
    try:
        raw = read_bounded(store.directory / NAME, 4096, 'saved source status')
    except FileNotFoundError:
        return dict(state='active', revision=None), None
    value = strict_json(raw)
    fields(value, {'schema', 'version', 'outline', 'source', 'state', 'transition', 'at'}, 'saved source status')
    if (value['schema'] != SCHEMA or type(value['version']) is not int or value['version'] != 1
            or value['outline'] != store.id or value['source'] != store.state['source']['revision']
            or value['state'] not in ('active', 'trash')):
        raise ValueError('Saved source status identity or version differs')
    identity(value['transition'])
    if not isinstance(value['at'], str) or len(value['at']) > 64 or not value['at']:
        raise ValueError('Invalid saved source transition date')
    return dict(state=value['state'], revision=sha256(raw).hexdigest()), raw


def require_active(store):
    if store.id and store.state and status(store)[0]['state'] == 'trash':
        raise ValueError('Saved source is in Trash; restore it before editing or importing it again')


def lifecycle_action(request):
    store = OutlineStore(request['store'], request['project_root'], request['id'])
    store.expect(request['revision'])
    current, previous = status(store)
    expected = request['status_revision']
    if expected is not None:
        revision(expected)
    if current['revision'] != expected:
        raise ValueError('Saved source status changed; reopen the list before deleting or restoring')
    target = 'trash' if request['method'] == 'outline_trash' else 'active'
    if current['state'] == target:
        raise ValueError('Saved source is already ' + ('in Trash' if target == 'trash' else 'active'))
    value = dict(schema=SCHEMA, version=1, outline=store.id, source=store.state['source']['revision'],
                 state=target, transition=str(uuid4()), at=now())
    try:
        save_mutable(store.directory / NAME, encoded(value), previous=previous, lock_root=store.base / 'locks')
    except (OSError, ValueError) as exc:
        return dict(blocked=True, write_error=str(exc))
    return dict(id=store.id, lifecycle=status(store)[0])
