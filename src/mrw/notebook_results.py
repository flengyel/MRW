"""Bounded notebook retention and PROV profile 1; never executes notebook code."""
from base64 import b64decode, b64encode
from datetime import datetime, timezone
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import re
from uuid import UUID, uuid4
from zipfile import ZipFile, ZIP_DEFLATED

from .local_files import read_bounded
from .mutable_files import private_directory, file_lock, delete_mutable, sync_directory
from .private_persistence import persist_private_new
from .workspace import strict_json

MAX_FILE = 16 * 1024 * 1024
MAX_TOTAL = 32 * 1024 * 1024
MAX_RECORD = 45 * 1024 * 1024
SCHEMA = 'mrw-notebook-result:1'
UNKNOWN = 'Saved outputs; execution context unknown. Current code may differ from the executed code.'


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False).encode('utf-8')


def digest(raw):
    return sha256(raw).hexdigest()


def identifier(value):
    if not isinstance(value, str) or str(UUID(value)) != value:
        raise ValueError('Invalid notebook result ID')
    return value


def timestamp(value):
    if not isinstance(value, str) or not value.endswith('Z'):
        raise ValueError('Expected a UTC timestamp')
    return datetime.fromisoformat(value.replace('Z', '+00:00'))


def text(value):
    if isinstance(value, list) and all(isinstance(x, str) for x in value):
        return ''.join(value)
    if isinstance(value, str):
        return value
    raise ValueError('Invalid notebook text')


def notebook(raw):
    nb = strict_json(raw)
    if not isinstance(nb, dict) or nb.get('nbformat') != 4 or not isinstance(nb.get('cells'), list):
        raise ValueError('Select a version 4 Jupyter notebook')
    if len(nb['cells']) > 10000 or not isinstance(nb.get('metadata'), dict):
        raise ValueError('Invalid notebook cells or metadata')
    for cell in nb['cells']:
        if not isinstance(cell, dict) or cell.get('cell_type') not in ('code', 'markdown', 'raw'):
            raise ValueError('Invalid notebook cell')
        text(cell.get('source'))
        if cell['cell_type'] == 'code':
            if not isinstance(cell.get('outputs'), list):
                raise ValueError('Invalid notebook outputs')
            for output in cell['outputs']:
                if not isinstance(output, dict) or output.get('output_type') not in ('stream', 'display_data', 'execute_result', 'error'):
                    raise ValueError('Invalid notebook output')
                if output['output_type'] == 'stream':
                    text(output.get('text'))
                elif output['output_type'] == 'error':
                    text(output.get('ename')); text(output.get('evalue'))
                elif not isinstance(output.get('data'), dict):
                    raise ValueError('Invalid notebook MIME output')
    return nb


def execution_parts(nb):
    cells = [c for c in nb['cells'] if c['cell_type'] == 'code']
    return [text(c['source']) for c in cells], [c['outputs'] for c in cells]


def receipt(nb):
    report = nb['metadata'].get('mrw_execution')
    if report is None:
        return None
    fields = {'schema', 'id', 'producer', 'started', 'ended', 'outcome', 'code_sha256', 'outputs_sha256', 'environment'}
    if not isinstance(report, dict) or set(report) != fields or report['schema'] != 'mrw-notebook-run:1':
        raise ValueError('Invalid notebook execution receipt')
    identifier(report['id'])
    if not isinstance(report['producer'], str) or not 1 <= len(report['producer']) <= 200:
        raise ValueError('Invalid notebook producer')
    if timestamp(report['ended']) < timestamp(report['started']):
        raise ValueError('Execution ended before it started')
    env = report['environment']
    if not isinstance(env, dict) or len(env) > 30 or any(not isinstance(k, str) or not isinstance(v, str) or len(k) > 100 or len(v) > 500 for k, v in env.items()):
        raise ValueError('Invalid execution environment')
    code, outputs = execution_parts(nb)
    if digest(canonical(code)) != report['code_sha256'] or digest(canonical(outputs)) != report['outputs_sha256']:
        raise ValueError('Notebook code or outputs changed after the reported execution; retain a notebook with a matching receipt or remove its stale receipt explicitly')
    failed = any(o['output_type'] == 'error' for group in outputs for o in group)
    if report['outcome'] not in ('completed', 'failed') or failed != (report['outcome'] == 'failed'):
        raise ValueError('Execution outcome disagrees with saved errors')
    return report


def artifact(raw, name, role):
    return {'name': name, 'role': role, 'sha256': digest(raw), 'data': b64encode(raw).decode('ascii')}


def unpack(item):
    if not isinstance(item, dict) or set(item) != {'name', 'role', 'sha256', 'data'}:
        raise ValueError('Invalid retained artifact')
    name = item['name']
    if not isinstance(name, str) or not name or len(name) > 255 or any(ord(c) < 32 for c in name) or '/' in name or '\\' in name or name in ('.', '..'):
        raise ValueError('Invalid artifact filename')
    if item['role'] not in ('notebook', 'companion') or not isinstance(item['data'], str):
        raise ValueError('Invalid artifact role or bytes')
    raw = b64decode(item['data'], validate=True)
    if len(raw) > MAX_FILE or digest(raw) != item['sha256']:
        raise ValueError('Retained artifact digest or size mismatch')
    return raw


def validate(record):
    if not isinstance(record, dict) or set(record) != {'schema', 'id', 'captured', 'software', 'artifacts'} or record['schema'] != SCHEMA:
        raise ValueError('Invalid retained notebook record')
    identifier(record['id']); timestamp(record['captured'])
    software = record['software']
    if not isinstance(software, dict) or set(software) != {'version', 'commit'} or not all(isinstance(v, str) and len(v) <= 100 for v in software.values()):
        raise ValueError('Invalid capture software identity')
    items = record['artifacts']
    if not isinstance(items, list) or not 1 <= len(items) <= 17 or (items[0].get('role') if isinstance(items[0], dict) else None) != 'notebook':
        raise ValueError('Invalid retained notebook artifacts')
    raw = [unpack(item) for item in items]
    if sum(map(len, raw)) > MAX_TOTAL or any(x['role'] != 'companion' for x in items[1:]):
        raise ValueError('Invalid companion artifacts or total size')
    receipt(notebook(raw[0]))
    return record


def summary(record):
    nb = notebook(unpack(record['artifacts'][0])); report = receipt(nb)
    heading = next((text(c['source']).splitlines()[0].lstrip('# ').strip() for c in nb['cells'] if c['cell_type'] == 'markdown' and text(c['source']).startswith('# ')), '')
    return {'id': record['id'], 'title': heading[:200] or record['artifacts'][0]['name'], 'captured': record['captured'],
            'evidence': 'producer-reported ' + report['outcome'] if report else 'saved outputs, execution unknown',
            'artifacts': [{k: x[k] for k in ('name', 'role', 'sha256')} for x in record['artifacts']]}


def transcript(record):
    nb = notebook(unpack(record['artifacts'][0])); report = receipt(nb)
    lines = [summary(record)['title'], f"Retained {record['captured']} · {record['id']}",
             f"Producer-reported {report['outcome']}: {report['producer']} (not independently verified)." if report else UNKNOWN,
             'Structural validation and integrity checks do not check the mathematics.', '']
    if report:
        lines += [json.dumps(report, ensure_ascii=False, indent=2), '']
    for n, cell in enumerate(nb['cells'], 1):
        lines += [f"--- Cell {n}: {cell['cell_type']} ---", text(cell['source'])]
        for output in cell.get('outputs', []):
            kind = output['output_type']
            if kind == 'stream':
                lines += [text(output['text'])]
            elif kind == 'error':
                lines += [f"{output['ename']}: {output['evalue']}"]
            else:
                data = output['data']
                lines += [text(data['text/plain']) if 'text/plain' in data else '[Output without a plain-text representation]']
                other = sorted(set(data) - {'text/plain'})
                if other:
                    lines += ['Additional MIME data retained in the notebook: ' + ', '.join(other)]
        lines += ['']
    lines += ['Retained companion files (not asserted execution inputs):']
    lines += [f"{i}: {x['name']} · SHA-256 {x['sha256']}" for i, x in enumerate(record['artifacts'][1:], 1)]
    return '\n'.join(lines)


def load(store, key):
    key = identifier(key)
    if (store / f'{key}.deleted.json').exists():
        raise ValueError('This retained notebook result was deleted')
    record = validate(strict_json(read_bounded(store / f'{key}.json', MAX_RECORD, 'notebook result')))
    if record['id'] != key:
        raise ValueError('Notebook result identity mismatch')
    return record


def recover_deletions(store):
    for marker in store.glob('*.deleted.json'):
        key = identifier(marker.name.removesuffix('.deleted.json'))
        data = strict_json(read_bounded(marker, 1024, 'notebook deletion marker'))
        if not isinstance(data, dict) or set(data) != {'id', 'sha256'} or data['id'] != key or not re.fullmatch('[a-f0-9]{64}', data['sha256']):
            raise ValueError('Invalid notebook deletion marker')
        target = store / f'{key}.json'
        try:
            raw = read_bounded(target, MAX_RECORD, 'deleted notebook result')
        except FileNotFoundError:
            sync_directory(store)
            continue
        if digest(raw) != data['sha256']:
            raise ValueError('Deleted notebook result has unexpected bytes; recovery stopped')
        delete_mutable(target, previous=raw, limit=MAX_RECORD, lock_root=store / '.locks')


def export_records(records):
    """Independent named accounts; relative ZIP paths, no original filesystem paths."""
    content = {}; bundles = []; entries = []
    prefixes = '@prefix prov: <http://www.w3.org/ns/prov#> .\n@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n@prefix mrw: <urn:mrw:prov:1:> .\n'
    lit = lambda s: json.dumps(s, ensure_ascii=False)
    for record in records:
        key = record['id']; base = f'urn:mrw:result:{key}:'
        uri = lambda suffix: '<' + base + suffix + '>'
        rows = [prefixes, f'{uri("mrw")} a prov:SoftwareAgent; rdfs:label "MRW"; mrw:version {lit(record["software"]["version"])}; mrw:commit {lit(record["software"]["commit"])} .',
                f'{uri("capture")} a prov:Activity; prov:wasAssociatedWith {uri("mrw")}; prov:endedAtTime {lit(record["captured"])}^^xsd:dateTime .']
        for i, item in enumerate(record['artifacts']):
            target = f'{key}/artifacts/{i}-{item["name"]}'
            content[target] = unpack(item)
            rows += [f'{uri(f"original-{i}")} a prov:Entity; mrw:sha256 {lit(item["sha256"])} .',
                     f'{uri("capture")} prov:used {uri(f"original-{i}")} .',
                     f'{uri(f"artifact-{i}")} a prov:Entity; prov:wasGeneratedBy {uri("capture")}; prov:wasDerivedFrom {uri(f"original-{i}")}; mrw:sha256 {lit(item["sha256"])}; mrw:file {lit(target)} .']
            entries.append({'entity': base + f'artifact-{i}', 'file': target, 'sha256': item['sha256'], 'role': item['role']})
        capture_file = f'{key}/capture.ttl'
        content[capture_file] = '\n'.join(rows).encode('utf-8')
        bundles.append({'id': base + 'capture-bundle', 'type': 'http://www.w3.org/ns/prov#Bundle', 'file': capture_file,
                        'attributedTo': base + 'mrw', 'evidence': 'MRW-observed capture', 'software': record['software']})
        nb = notebook(unpack(record['artifacts'][0])); report = receipt(nb)
        if report:
            code, outputs = execution_parts(nb)
            for name, part in (('code', code), ('outputs', outputs)):
                path = f'{key}/{name}.json'; content[path] = canonical(part)
                entries.append({'entity': base + name, 'file': path, 'sha256': digest(content[path]), 'role': name})
            run = '<urn:mrw:run:' + report['id'] + '>'
            rows = [prefixes,
                    f'{uri("producer")} a prov:SoftwareAgent; rdfs:label {lit(report["producer"])} .',
                    f'{uri("code")} a prov:Entity, prov:Plan; mrw:sha256 {lit(report["code_sha256"])} .',
                    f'{run} a prov:Activity; prov:used {uri("code")}; prov:wasAssociatedWith {uri("producer")}; prov:startedAtTime {lit(report["started"])}^^xsd:dateTime; prov:endedAtTime {lit(report["ended"])}^^xsd:dateTime; mrw:outcome {lit(report["outcome"])} .',
                    f'{uri("outputs")} a prov:Entity; prov:wasGeneratedBy {run}; mrw:sha256 {lit(report["outputs_sha256"])} .']
            path = f'{key}/execution-reported.ttl'; content[path] = '\n'.join(rows).encode('utf-8')
            bundles.append({'id': base + 'execution-bundle', 'type': 'http://www.w3.org/ns/prov#Bundle', 'file': path,
                            'attributedTo': base + 'producer', 'evidence': 'producer-reported, not authenticated', 'report': report})
        content[f'{key}/result.txt'] = transcript(record).encode('utf-8')
    manifest = {'profile': 'mrw-notebook-prov:1', 'validation': 'Bounded structure and integrity; not full PROV conformance or mathematical checking',
                'bundles': bundles, 'artifacts': entries,
                'files': [{'file': name, 'sha256': digest(raw)} for name, raw in content.items()]}
    content['manifest.json'] = json.dumps(manifest, ensure_ascii=False, indent=2).encode('utf-8')
    output = BytesIO()
    with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
        for name, raw in content.items():
            archive.writestr(name, raw)
    return output.getvalue(), manifest


def action(request):
    from .editor_bridge import _path
    store = _path(request['store']); private_directory(store)
    with file_lock(store / 'catalog', store / '.locks'):
        recover_deletions(store)
        method = request['method']
        if method == 'notebook_retain':
            paths = request['paths']
            if not isinstance(paths, list) or not 1 <= len(paths) <= 17 or len(set(paths)) != len(paths):
                raise ValueError('Select one notebook and at most 16 companion files')
            paths = [_path(p) for p in paths]
            if paths[0].suffix.lower() != '.ipynb':
                raise ValueError('Select a saved .ipynb notebook')
            items = []; total = 0
            for i, path in enumerate(paths):
                raw = read_bounded(path, MAX_FILE, 'selected notebook material'); total += len(raw)
                if total > MAX_TOTAL:
                    raise ValueError('Selected material exceeds 32 MiB')
                items.append(artifact(raw, path.name, 'notebook' if i == 0 else 'companion'))
            record = validate({'schema': SCHEMA, 'id': str(uuid4()), 'captured': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'), 'software': request.get('software', {'version': 'unknown', 'commit': 'unknown'}), 'artifacts': items})
            for path, item in zip(paths, items):
                if digest(read_bounded(path, MAX_FILE, 'selected notebook material')) != item['sha256']:
                    raise ValueError('Selected file changed during capture; retry')
            if (store / (record['id'] + '.deleted.json')).exists():
                raise ValueError('Deleted result ID cannot be reused')
            persist_private_new(store / (record['id'] + '.json'), canonical(record))
            return summary(record)
        if method == 'notebook_list':
            paths = sorted(store.glob('*.json'))
            if len(paths) > 10000:
                raise ValueError('Too many notebook records to list')
            results = [summary(load(store, p.stem)) for p in paths if not p.name.endswith('.deleted.json')]
            return {'results': sorted(results, key=lambda r: r['captured'], reverse=True)}
        if method == 'notebook_export':
            ids = request['ids']
            if not isinstance(ids, list) or not 1 <= len(ids) <= 8 or len(set(ids)) != len(ids):
                raise ValueError('Select between one and eight different results')
            records = [load(store, key) for key in ids]
            if sum(sum(len(unpack(a)) for a in r['artifacts']) for r in records) > MAX_TOTAL * 2:
                raise ValueError('Selected export exceeds 64 MiB')
            destination = _path(request['destination'])
            if destination.suffix.lower() != '.zip' or store.resolve() == destination.resolve() or store.resolve() in destination.resolve().parents:
                raise ValueError('Choose a new ZIP file outside private result storage')
            raw, manifest = export_records(records)
            persist_private_new(destination, raw)
            return {'path': str(destination), 'sha256': digest(raw), 'bundles': len(manifest['bundles'])}
        key = identifier(request['id'])
        record = load(store, key)
        if method == 'notebook_read':
            return {**summary(record), 'body': transcript(record)}
        if method == 'notebook_companion':
            index = request['index']
            if type(index) is not int or not 1 <= index < len(record['artifacts']):
                raise ValueError('Select a retained companion file')
            item = record['artifacts'][index]; raw = unpack(item)
            try:
                body = raw.decode('utf-8')
            except UnicodeDecodeError:
                body = 'Binary companion file. Export the result to read its exact bytes with the appropriate application.'
            return {'title': item['name'], 'body': body}
        if method == 'notebook_delete':
            path = store / f'{key}.json'; raw = read_bounded(path, MAX_RECORD, 'notebook result')
            persist_private_new(store / f'{key}.deleted.json', canonical({'id': key, 'sha256': digest(raw)}))
            recover_deletions(store)
            return {'deleted': key}
        raise ValueError('Unknown notebook action')
