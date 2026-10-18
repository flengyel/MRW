"""Explicit external-note navigation, separate from retained sources and reader work."""
from copy import deepcopy
from hashlib import sha256
import re
from urllib.parse import parse_qsl, urlencode, urlsplit, quote
from uuid import uuid4

from .local_files import read_bounded
from .mutable_files import save_mutable
from .outline_references import parse_reference, reference_action, scope
from .source_outlines import OutlineStore, encoded, fields, identity, revision, text
from .workspace import strict_json

SCHEMA = 'theorem-terminal.outline-note-links'
MAX_BYTES = 128 * 1024


def obsidian_url(value):
    """Accept only opening a named existing note, never a writing/callback action."""
    text(value, 'Obsidian URL', 4096)
    if (not value.startswith('obsidian://open?') or re.search(r'[\s\x00-\x1f\x7f]', value)
            or re.search(r'%(?![0-9a-fA-F]{2})', value)):
        raise ValueError('Use Copy Obsidian URL for current file: obsidian://open?vault=…&file=…')
    parsed = urlsplit(value)
    pairs = parse_qsl(parsed.query, keep_blank_values=True, strict_parsing=True, errors='strict')
    params = dict(pairs)
    if (parsed.fragment or parsed.path or len(params) != len(pairs)
            or set(params) != {'vault', 'file'} or any(not v.strip() for v in params.values())
            or any(any(ord(c) < 32 or ord(c) == 127 for c in v) for v in params.values())):
        raise ValueError('Only Obsidian open with exactly one vault and file is supported; no write or callback parameters')
    file = params['file'].split('#', 1)[0]
    if any(c in params['vault'] for c in '/\\:#?') or any(c in params['file'] for c in '#?'):
        raise ValueError('Link a whole note using its vault name or ID; path-form vaults and heading/block selectors are unsupported')
    if (not file or file.startswith(('/', '\\')) or '\\' in file or ':' in file
            or any(p in ('', '.', '..') for p in file.split('/'))):
        raise ValueError('Obsidian file must name a note relative to its vault')
    return 'obsidian://open?' + urlencode(params, quote_via=quote)


def note_action(request):
    store = OutlineStore(request['store'], request['project_root'], request['id'])
    path = store.directory / 'obsidian-links.json'
    try:
        raw = read_bounded(path, MAX_BYTES, 'private Obsidian associations')
    except FileNotFoundError:
        raw = None
        value = dict(schema=SCHEMA, version=1, project_root=str(store.root), outline=store.id, links=[])
    else:
        value = strict_json(raw)
    fields(value, {'schema', 'version', 'project_root', 'outline', 'links'}, 'Obsidian associations')
    if (value['schema'] != SCHEMA or type(value['version']) is not int or value['version'] != 1
            or value['project_root'] != str(store.root) or value['outline'] != store.id
            or not isinstance(value['links'], list) or len(value['links']) > 64):
        raise ValueError('Private Obsidian association identity, version or limit differs')
    seen = set()
    targets = {}
    for item in value['links']:
        fields(item, {'id', 'reference', 'url', 'label'}, 'Obsidian association')
        identity(item['id'])
        ref = parse_reference(item['reference'])
        if (item['id'] in seen or ref['scope'] != scope(store) or ref['outline'] != store.id
                or ref['source'] != store.state['source']['revision']):
            raise ValueError('Private Obsidian association target differs')
        seen.add(item['id'])
        # Read-only presentation metadata from the existing reference parser.
        # This is not persisted and never supplies a navigation target.
        targets[item['reference']] = dict(region=ref['region'], span=ref['span'])
        obsidian_url(item['url'])
        text(item['label'], 'note label', 640)
        if not item['label'].strip() or len(item['label']) > 160 or any(not c.isprintable() for c in item['label']):
            raise ValueError('Use a readable note label of at most 160 characters')
    result = dict(links=value['links'], revision=sha256(raw).hexdigest() if raw is not None else None)
    if request['method'] == 'outline_notes':
        return dict(**result, targets=targets)
    expected = request['revision']
    if expected is not None:
        revision(expected)
    if expected != result['revision']:
        raise ValueError('Obsidian associations changed; refresh the reader before editing')
    change = request['change']
    fields(change, {'id', 'reference', 'url', 'label'}, 'association change')
    value = deepcopy(value)
    existing = next((i for i in value['links'] if i['id'] == change['id']), None)
    if change['id'] is not None and existing is None:
        raise ValueError('The note association is missing; refresh the reader')
    # Removal requires the same pinned target too; a region edit never redirects it.
    if existing and existing['reference'] != change['reference']:
        raise ValueError('The selected note association belongs to another retained target')
    if change['url'] is None:
        if existing is None or change['label'] is not None:
            raise ValueError('Choose an existing note association to remove')
        value['links'].remove(existing)
    else:
        reference_action(dict(method='outline_follow_reference', store=str(store.base),
                              project_root=str(store.root), reference=change['reference']))
        if parse_reference(change['reference'])['outline'] != store.id:
            raise ValueError('Note association belongs to another outline')
        label = text(change['label'], 'note label', 640)
        if not label.strip() or len(label) > 160 or any(not c.isprintable() for c in label):
            raise ValueError('Use a readable note label of at most 160 characters')
        item = dict(id=existing['id'] if existing else str(uuid4()), reference=change['reference'],
                    url=obsidian_url(change['url']), label=label.strip())
        if existing:
            value['links'][value['links'].index(existing)] = item
        else:
            value['links'].append(item)
        if len(value['links']) > 64:
            raise ValueError('At most 64 note associations per outline are supported')
    candidate = encoded(value)
    if len(candidate) > MAX_BYTES:
        raise ValueError('Obsidian associations exceed the 128 KiB limit')
    try:
        save_mutable(path, candidate, previous=raw, lock_root=store.base / 'locks')
    except (OSError, ValueError) as exc:
        return dict(blocked=True, write_error=str(exc), **result)
    return dict(links=value['links'], revision=sha256(candidate).hexdigest())
