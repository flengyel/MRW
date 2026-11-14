"""Recoverable reader-note handoff. Never creates, edits or deletes a vault file."""
from copy import deepcopy
from hashlib import sha256
from pathlib import Path
import base64
import json
import re
from urllib.parse import urlsplit, parse_qs
from uuid import uuid4

from .local_files import read_bounded
from .source_outlines import encoded, fields, identity, revision, text, note, now
from .outline_references import parse_reference, reference_action, matches_scope

MAX_NOTE = 4 * 1024 * 1024
EXCLUDED = {'.obsidian', '.trash', '.git', '.lake', 'node_modules', '.venv', '__pycache__'}


def destination(value, *, read=False):
    fields(value, {'root', 'file', 'url', 'label'}, 'continuation destination')
    from .outline_notes import obsidian_url
    root, file = value['root'], value['file']
    text(root, 'notes root', 4096); text(file, 'note path', 4096)
    if (re.search(r'[\x00-\x1f\x7f]', root + file) or not Path(root).is_absolute() or str(Path(root)) != root or '\\' in root
            or not file or '\\' in file or ':' in file or Path(file).is_absolute()
            or any(p in ('', '.', '..') or p in EXCLUDED for p in file.split('/'))
            or Path(file).suffix.lower() not in ('.md', '.markdown')):
        raise ValueError('Choose a Markdown note inside the selected notes folder')
    text(value['label'], 'note label', 640)
    if not value['label'].strip() or len(value['label']) > 160:
        raise ValueError('Use a note label of at most 160 characters')
    if value['url'] is not None:
        url = obsidian_url(value['url'])
        if parse_qs(urlsplit(url).query)['file'][0] not in (file, file.removesuffix('.md')):
            raise ValueError('Obsidian address differs from the selected file')
    path = Path(root) / file
    if read:
        if Path(root).resolve(strict=True) != Path(root) or path.resolve(strict=True) != path:
            raise ValueError('Notes folder or file was redirected; select it again')
        raw = read_bounded(path, MAX_NOTE, 'continuation note')
        return raw, raw.decode('utf-8')
    return path


def find_annotation(store, annotation):
    identity(annotation)
    for region, items in [(None, store.state['annotations'])] + [(r['id'], r['annotations']) for r in store.state['regions']]:
        for item in items:
            if item['id'] == annotation:
                return region, item
    raise ValueError('The selected annotation was deleted; no continuation was attached')


def original_digest(item):
    return sha256(encoded(item)).hexdigest()


def return_link(value, reference):
    text(value, 'passage return link', 16384)
    parsed = urlsplit(value)
    params = parse_qs(parsed.query, strict_parsing=True)
    if (parsed.scheme not in ('vscode', 'vscode-insiders') or parsed.netloc != 'flengyel.mrw'
            or parsed.path != '/outline' or parsed.fragment or set(params) != {'v', 'target'}
            or params['v'] != ['1'] or len(params['target']) != 1):
        raise ValueError('Use the exact MRW passage return link')
    token = params['target'][0]
    try:
        target = json.loads(base64.urlsafe_b64decode(token + '=' * (-len(token) % 4)))
    except (ValueError, UnicodeError) as exc:
        raise ValueError('Invalid passage return link') from exc
    if not isinstance(target, dict) or target.get('reference') != reference:
        raise ValueError('Return link differs from the retained passage')


def validate_record(record, store):
    fields(record, {'annotation', 'original', 'outline_revision', 'reference', 'destination', 'policy',
                    'presentation', 'body', 'research', 'return_link', 'baseline', 'phase', 'association',
                    'destination_revision', 'validation', 'at'}, 'annotation continuation')
    identity(record['annotation']); note(record['original'])
    if record['annotation'] != record['original']['id']:
        raise ValueError('Continuation annotation identity differs')
    revision(record['outline_revision']); revision(record['baseline'])
    ref = parse_reference(record['reference'])
    if not matches_scope(store, ref['scope']) or ref['outline'] != store.id or ref['source'] != store.state['source']['revision']:
        raise ValueError('Continuation source target differs')
    destination(record['destination'])
    if record['policy'] not in ('markdown', 'zettel') or record['presentation'] not in ('verbatim', 'quote') or record['phase'] not in ('pending', 'complete', 'unlinked'):
        raise ValueError('Invalid continuation state')
    for key in ('body', 'research'):
        text(record[key], key, 32768)
        if not record[key]: raise ValueError('Empty continuation text')
    expected = body_text(record['original']['text'], record['presentation'])
    if record['body'] != expected: raise ValueError('Transferred annotation text differs')
    return_link(record['return_link'], record['reference'])
    if record['return_link'] not in record['research']: raise ValueError('Missing return link')
    identity(record['association'])
    if record['phase'] != 'pending' and record['destination_revision'] is None:
        raise ValueError('Completed continuation has no verified destination revision')
    if record['destination_revision'] is not None: revision(record['destination_revision'])
    if record['phase'] != 'pending' and record['policy'] == 'zettel' and record['validation'] is None:
        raise ValueError('Completed Zettel has no validation record')
    if record['validation'] is not None:
        fields(record['validation'], {'tool', 'revision', 'section'}, 'destination validation')
        text(record['validation']['tool'], 'validator path', 4096)
        revision(record['validation']['revision'])
        text(record['validation']['section'], 'manual section', 1024)
    text(record['at'], 'continuation time', 128)


def body_text(original, presentation):
    if not original.strip(): raise ValueError('An empty annotation has no text to continue')
    # The original is retained exactly; quotation is an explicitly selected wrapper.
    value = original if presentation == 'verbatim' else '> ' + original.replace('\n', '\n> ')
    return '\n\n' + value + '\n\n'


def section_offsets(content):
    """Locate insertion sections without treating a fenced example as a section.

    The external validator owns Zettel conformance; this only bounds insertion.
    """
    fence = None
    offset = 0
    for line in content.splitlines(keepends=True):
        marker = re.match(r"^ {0,3}(`{3,}|~{3,})", line)
        if fence:
            if marker and marker[1][0] == fence[0] and len(marker[1]) >= len(fence) and not line[marker.end():].strip():
                fence = None
        elif marker:
            fence = marker[1]
        else:
            heading = re.match(r"^## ([^\n]+?)\s*$", line)
            if heading:
                yield heading[1], offset
        offset += len(line)


def verify_text(record, content, validation=None):
    # Native editors can change line endings. Original annotation bytes remain in
    # the private record. No mathematical text, whitespace within lines or links
    # are normalized.
    normalize = lambda s: s.replace('\r\n', '\n')
    content = normalize(content)
    body, research = normalize(record['body']), normalize(record['research'])
    if content.count(body) != 1 or content.count(research) != 1:
        raise ValueError('Save exactly one copy of the prepared body and attribution before verifying; do not paste them again')
    if record['policy'] == 'zettel':
        headings = list(section_offsets(content))
        section = (validation or {}).get('section', 'Research')
        see = next((at for title, at in headings if title == 'SEE ALSO'), None)
        manual = next((at for title, at in headings if title == section), None)
        end = next((at for _, at in headings if manual is not None and at > manual), len(content))
        if see is None or manual is None or not content.index(body) < see < manual < content.index(research) or content.index(research) + len(research) > end:
            raise ValueError('Place the annotation in the body before SEE ALSO, and its attribution in Research (or the accepted older manual section)')
    # Both chunks are inserted without replacing prior text. This is a compact
    # baseline check, not a second copy of the ordinary note in private storage.
    stripped = content.replace(body, '', 1).replace(research, '', 1)
    if sha256(stripped.encode()).hexdigest() != record['baseline']:
        raise ValueError('The destination changed beyond the two selected insertions. Keep both versions; inspect the changes before preparing a new transfer')


def change_continuation(store, value, request):
    """Mutate the in-memory association record; caller publishes it once."""
    fields(request, {'operation', 'annotation', 'outline_revision', 'data'}, 'continuation operation')
    operation, data = request['operation'], request['data']
    store.expect(request['outline_revision'])
    region, original = find_annotation(store, request['annotation'])
    records = value.setdefault('continuations', [])
    record = next((r for r in records if r['annotation'] == original['id']), None)
    if operation == 'prepare':
        if record: raise ValueError('This annotation already has a pending or completed continuation; resume it without copying again')
        fields(data, {'destination', 'policy', 'presentation', 'return_link', 'destination_revision'}, 'continuation preparation')
        raw, content = destination(data['destination'], read=True)
        if sha256(raw).hexdigest() != revision(data['destination_revision']): raise ValueError('Destination changed while preparing the transfer')
        reference = reference_action(dict(method='outline_reference', store=str(store.base), project_root=str(store.root), id=store.id, revision=store.revision, region=region))['reference']
        return_link(data['return_link'], reference)
        p = original['provenance']; b = store.state['source']['bibliography']
        attribution = f"{p['author'] or 'Unknown author'}; {p['origin']}; recorded {p['at']}"
        bibliography = ' · '.join(str(b[k]) for k in ('authors', 'title', 'locator', 'revision') if b[k]) or 'Retained source'
        research = ('\n\nTransferred reader annotation: ' + attribution + '.\n'
            + 'This attribution applies only to the transferred annotation, not to later writing in this note.\n'
            + 'Source: ' + bibliography + '.\n'
            + f'Retained source SHA-256: `{store.state["source"]["revision"]}`.\n'
            + f'[Return to the exact retained passage]({data["return_link"]})\n\n')
        record = dict(annotation=original['id'], original=deepcopy(original), outline_revision=store.revision,
            reference=reference, destination=data['destination'], policy=data['policy'], presentation=data['presentation'],
            body=body_text(original['text'], data['presentation']), research=research, return_link=data['return_link'],
            baseline=sha256(content.replace('\r\n','\n').encode()).hexdigest(), phase='pending',
            association=str(uuid4()), destination_revision=None, validation=None, at=now())
        records.append(record)
    elif record is None:
        raise ValueError('No continuation is pending for this annotation')
    elif operation == 'cancel':
        if record['phase'] != 'pending': raise ValueError('A completed continuation cannot revert to a second current editor')
        fields(data, set(), 'cancel continuation')
        records.remove(record)  # External text is deliberately untouched.
    elif operation == 'complete':
        fields(data, {'destination_revision', 'validation'}, 'continuation verification')
        if record['phase'] != 'pending': raise ValueError('This note is already continued; open its destination')
        if original != record['original']: raise ValueError('The annotation changed during transfer; keep both texts and resolve it before continuing')
        reference_action(dict(method='outline_follow_reference',store=str(store.base),project_root=str(store.root),reference=record['reference']))
        raw, content = destination(record['destination'], read=True)
        if sha256(raw).hexdigest() != revision(data['destination_revision']): raise ValueError('Destination changed during verification; verify again')
        verify_text(record, content, data['validation'])
        if record['policy'] == 'zettel' and data['validation'] is None: raise ValueError('Validate the completed Zettel with its configured validator first')
        record.update(phase='complete', destination_revision=data['destination_revision'], validation=data['validation'])
        if record['destination']['url'] is not None:
            value['links'].append(dict(id=record['association'], reference=record['reference'], url=record['destination']['url'], label=record['destination']['label']))
    elif operation == 'relink':
        fields(data, {'destination', 'destination_revision'}, 'continuation relink')
        raw, _ = destination(data['destination'], read=True)
        if sha256(raw).hexdigest() != revision(data['destination_revision']): raise ValueError('Destination changed during relinking')
        if record['phase'] not in ('complete', 'unlinked'): raise ValueError('Finish or cancel the pending transfer before relinking')
        value['links'] = [i for i in value['links'] if i['id'] != record['association']]
        record['destination'] = data['destination']
        record['phase'] = 'complete'
        if data['destination']['url'] is not None:
            value['links'].append(dict(id=record['association'],reference=record['reference'],url=data['destination']['url'],label=data['destination']['label']))
    elif operation == 'unlink':
        fields(data, set(), 'unlink continuation')
        if record['phase'] != 'complete': raise ValueError('Cancel a pending transfer instead')
        value['links'] = [i for i in value['links'] if i['id'] != record['association']]
        # Keep destination and completed status for explicit recovery, never make
        # the original current just because its association was removed.
        record['phase'] = 'unlinked'
    else:
        raise ValueError('Unknown continuation operation')
    for item in records: validate_record(item, store)
    if len(records) > 256 or len(value['links']) > 64: raise ValueError('Too many note continuations or associations')
    return record
