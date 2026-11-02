"""Offline source-region views: quotations, reader work and supplied evidence.

This private view state uses Source/SourceOccurrence/VersionedSpan semantics.
It is not a proof graph, a FormalFact generator, a checker or a model client.
"""
from copy import deepcopy
from datetime import datetime, timezone
from hashlib import sha256
from functools import lru_cache
import json
import os
from pathlib import Path
import re
from uuid import uuid4

from .local_files import read_bounded
from .mutable_files import private_directory, save_mutable, sync_directory
from .private_persistence import persist_private_new
from .source import SourceDocument
from .workspace import strict_json

SCHEMA = 'theorem-terminal.source-outline'
MAX_SOURCE = 2 * 1024 * 1024
MAX_STATE = 512 * 1024
MAX_REGION = 256 * 1024
TEXT_FORMATS = {'.txt', '.md', '.markdown', '.tex', '.rst', '.org', '.lean'}
LEVELS = ('orientation', 'concepts_results', 'governing_idea', 'argument', 'technical_detail')
NOTE_KINDS = ('explanation', 'orientation', 'governing_idea', 'intermediate_claim',
              'reconstruction', 'intended_inference', 'cited_dependency',
              'reusable_lemma', 'question', 'suspected_gap', 'proposed_repair')
CONTEXT_KINDS = ('hypothesis', 'definition', 'local_assumption', 'cited_result', 'source_reference')
ORIGINS = ('human_work', 'ai_proposal', 'source_quotation', 'unknown')
BIBLIOGRAPHY = ('title', 'authors', 'edition', 'revision', 'locator', 'reference')
SPAN_FIELDS = {'source_revision', 'start_line', 'start_col', 'end_line', 'end_col'}


def encoded(value):
    return json.dumps(value, ensure_ascii=False, allow_nan=False, sort_keys=True,
                      separators=(',', ':')).encode('utf-8')


def fields(value, names, label):
    if not isinstance(value, dict) or set(value) != set(names):
        raise ValueError(f'Invalid {label} fields')


def text(value, label, limit=16384, *, optional=False):
    if value is None and optional:
        return value
    if not isinstance(value, str) or '\0' in value:
        raise ValueError(f'Invalid {label}')
    if len(value.encode('utf-8', errors='strict')) > limit:
        raise ValueError(f'{label} exceeds its {limit}-byte limit')
    return value


def identity(value):
    if not isinstance(value, str) or re.fullmatch(r'[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}', value) is None:
        raise ValueError('Invalid outline item identity')
    return value


def revision(value):
    if not isinstance(value, str) or re.fullmatch(r'[a-f0-9]{64}', value) is None:
        raise ValueError('Invalid exact-byte revision')
    return value


def local_path(value):
    text(value, 'local path', 4096)
    if not value or not Path(value).is_absolute():
        raise ValueError('An absolute local path is required')
    return Path(value)


def now():
    return datetime.now(timezone.utc).isoformat()


def ordinary_source(path, expected):
    path = local_path(path)
    if path.suffix.lower() not in TEXT_FORMATS:
        raise ValueError('Outline sources support saved UTF-8 .txt, .md, .tex, .rst, .org and .lean text. '
                         'PDF regions, OCR, notebooks and binary formats are unsupported.')
    source = SourceDocument.from_bytes(path, read_bounded(path, MAX_SOURCE, 'outline source'))
    if '\0' in source.text:
        raise ValueError('Outline sources require ordinary UTF-8 text without NUL')
    if source.revision != revision(expected):
        raise ValueError('Source changed; save/reload and select it again')
    return source


def logical_text(source):
    # The byte snapshot retains a BOM; VS Code text positions do not include it.
    return source.text.removeprefix('\ufeff')


@lru_cache(maxsize=2)
def line_table(source):
    value = logical_text(source)
    starts = [0] + [m.end() for m in re.finditer(r'\r\n|\r|\n', value)]
    lines = re.split(r'\r\n|\r|\n', value)
    return value, starts, lines


def select_span(source, start, end):
    """Convert host zero-based UTF-16 positions to revision-pinned scalar spans."""
    _, _, lines = line_table(source)
    converted = []
    for point in (start, end):
        if (not isinstance(point, list) or len(point) != 2
                or any(type(n) is not int or n < 0 for n in point)):
            raise ValueError('Invalid source selection position')
        line, column = point
        if line >= len(lines) or column * 2 > len(lines[line].encode('utf-16-le')):
            raise ValueError('Source selection is outside the retained text')
        try:
            prefix = lines[line].encode('utf-16-le')[:column * 2].decode('utf-16-le')
        except UnicodeDecodeError as exc:
            raise ValueError('Source selection splits a Unicode character') from exc
        converted.append((line + 1, len(prefix)))
    if converted[0] >= converted[1]:
        raise ValueError('Select a nonempty forward source region')
    a, b = converted
    return dict(source_revision=source.revision, start_line=a[0], start_col=a[1], end_line=b[0], end_col=b[1])


def span_text(source, span, limit=MAX_REGION):
    fields(span, SPAN_FIELDS, 'source span')
    if span['source_revision'] != source.revision:
        raise ValueError('Selection revision differs from the retained source')
    value, starts, lines = line_table(source)
    offsets = []
    for side in ('start', 'end'):
        line, column = span[f'{side}_line'], span[f'{side}_col']
        if (type(line) is not int or type(column) is not int or not 1 <= line <= len(lines)
                or not 0 <= column <= len(lines[line - 1])):
            raise ValueError('Saved selection is outside the retained source')
        offsets.append(starts[line - 1] + column)
    if offsets[0] >= offsets[1]:
        raise ValueError('Select a nonempty forward source region')
    selected = value[offsets[0]:offsets[1]]
    if len(selected.encode('utf-8')) > limit:
        raise ValueError(f'Selected source region exceeds its {limit}-byte limit')
    return selected


def host_point(source, span, side):
    _, _, lines = line_table(source)
    line, column = span[f'{side}_line'] - 1, span[f'{side}_col']
    return [line, len(lines[line][:column].encode('utf-16-le')) // 2]


def directory(path):
    """Create private storage with durable new directory entries, outside sources."""
    if os.name != 'posix':
        raise ValueError('Crash-durable outline writes require Linux/WSL')
    absent = []
    current = path
    while not current.exists():
        absent.append(current)
        current = current.parent
    for item in reversed(absent):
        private_directory(item)
        sync_directory(item.parent)
    private_directory(path)


def note(value):
    fields(value, {'id', 'kind', 'text', 'provenance'}, 'reader annotation')
    identity(value['id'])
    if value['kind'] not in NOTE_KINDS:
        raise ValueError('Unknown annotation purpose')
    text(value['text'], 'annotation')
    p = value['provenance']
    fields(p, {'origin', 'author', 'at'}, 'annotation attribution')
    if p['origin'] not in ORIGINS:
        raise ValueError('Unknown annotation origin')
    text(p['author'], 'annotation author', 1024, optional=True)
    text(p['at'], 'annotation recording time', 128)


def validate_state(value, root, identifier):
    names = {'schema', 'version', 'id', 'project_root', 'created_at', 'source',
             'regions', 'contexts', 'annotations', 'artifacts'}
    imported = isinstance(value, dict) and value.get('version') == 2
    fields(value, names | ({'acquisition'} if imported else set()), 'source outline')
    if (value['schema'] != SCHEMA or type(value['version']) is not int or value['version'] not in (1, 2)
            or value['id'] != identifier or value['project_root'] != str(root)):
        raise ValueError('Outline schema, project or identity differs')
    identity(identifier)
    text(value['created_at'], 'recording time', 128)
    s = value['source']
    fields(s, {'path', 'revision', 'bibliography', 'authorship'}, 'retained source identity')
    local_path(s['path']); revision(s['revision'])
    if s['authorship'] not in ('unknown', 'human', 'ai_generated', 'ai_assisted'):
        raise ValueError('Unknown source authorship description')
    fields(s['bibliography'], BIBLIOGRAPHY, 'bibliographic description')
    for key, val in s['bibliography'].items():
        text(val, key, 4096, optional=True)
    ids = set()
    def unique(item):
        key = identity(item['id'])
        if key in ids:
            raise ValueError('Duplicate outline item identity')
        ids.add(key)
    def notes(items):
        if not isinstance(items, list) or len(items) > 32:
            raise ValueError('At most 32 annotations per region or overview')
        for item in items:
            unique(item); note(item)
    def span(item):
        fields(item, SPAN_FIELDS, 'source span')
        if item['source_revision'] != s['revision']:
            raise ValueError('Selection revision differs from retained source')
        for key in ('start_line', 'start_col', 'end_line', 'end_col'):
            if type(item[key]) is not int or item[key] < (1 if key.endswith('line') else 0):
                raise ValueError('Invalid source range')
        if (item['start_line'], item['start_col']) >= (item['end_line'], item['end_col']):
            raise ValueError('Invalid source range order')
    for key, limit in [('regions', 64), ('contexts', 32), ('artifacts', 16)]:
        if not isinstance(value[key], list) or len(value[key]) > limit:
            raise ValueError(f'At most {limit} {key} per outline')
    for region in value['regions']:
        fields(region, {'id', 'title', 'level', 'span', 'statement', 'collapsed', 'annotations'}, 'source region')
        unique(region); text(region['title'], 'region title', 1024); span(region['span'])
        if region['level'] not in LEVELS or type(region['collapsed']) is not bool:
            raise ValueError('Invalid region reading level or visibility')
        if region['statement'] is not None:
            fields(region['statement'], {'kind', 'span'}, 'selected statement')
            if region['statement']['kind'] not in ('source_statement', 'declaration_statement'):
                raise ValueError('Invalid statement kind')
            span(region['statement']['span'])
        notes(region['annotations'])
    notes(value['annotations'])
    for item in value['contexts']:
        fields(item, {'id', 'kind', 'label', 'span'}, 'context selection')
        unique(item); span(item['span']); text(item['label'], 'context label', 1024)
        if item['kind'] not in CONTEXT_KINDS:
            raise ValueError('Invalid context selection kind')
    region_ids = {r['id'] for r in value['regions']}
    for item in value['artifacts']:
        fields(item, {'id', 'path', 'revision', 'kind', 'label', 'region', 'selector', 'captured_at'}, 'artifact reference')
        unique(item); local_path(item['path']); revision(item['revision'])
        text(item['label'], 'artifact label', 1024); text(item['captured_at'], 'recording time', 128)
        if item['kind'] not in ('goal_context', 'supporting_artifact', 'declaration_statement'):
            raise ValueError('Invalid supplied artifact kind')
        if item['region'] is not None and item['region'] not in region_ids:
            raise ValueError('Artifact refers to an unknown region')
        if item['selector'] is not None and (type(item['selector']) is not int or not 0 <= item['selector'] < 256):
            raise ValueError('Invalid recorded snapshot selector')
    if imported:
        acquisition = value['acquisition']
        fields(acquisition, {'kind', 'artifact'}, 'source acquisition')
        if acquisition['kind'] != 'stacks-section':
            raise ValueError('Unsupported source acquisition')
        identity(acquisition['artifact'])
        if not any(a['id'] == acquisition['artifact'] and a['kind'] == 'supporting_artifact'
                   and a['region'] is None for a in value['artifacts']):
            raise ValueError('Retained source acquisition metadata is missing')
    return value


def goal_entries(raw):
    """Read supplied goal strings, not Lean syntax or inference dependencies."""
    try:
        data = strict_json(raw)
    except ValueError:
        return []
    if not isinstance(data, list) or len(data) > 256:
        return []
    result = []
    for index, item in enumerate(data):
        if not isinstance(item, dict) or not isinstance(item.get('result'), dict):
            continue
        goals = item['result'].get('goals')
        if not isinstance(goals, list) or not goals or len(goals) > 64 or any(not isinstance(g, str) for g in goals):
            continue
        if sum(len(g.encode('utf-8')) for g in goals) > 65536:
            continue
        result.append({'index': index, 'label': text(item.get('label', str(index + 1)), 'snapshot label', 1024), 'goals': goals})
    return result


class OutlineStore:
    def __init__(self, directory_path, project_root, identifier=None):
        self.base, self.root = local_path(directory_path), local_path(project_root)
        from .artifact_context import CURRENT
        managed=CURRENT.get() is not None and CURRENT.get().identity is not None
        if (self.root.resolve() != self.root or self.base.resolve() != self.base
                or (self.base.is_relative_to(self.root) and not managed)):
            raise ValueError('Outline storage requires a canonical private directory outside the project')
        self.id = identity(identifier) if identifier is not None else None
        self.directory = self.base / self.id if self.id else None
        self.raw, self.state = None, None
        if self.id:
            if self.directory.resolve() != self.directory:
                raise ValueError('Private outline directory was redirected')
            self.raw = read_bounded(self.directory / 'outline.json', MAX_STATE, 'private source outline')
            self.state = validate_state(strict_json(self.raw), self.root, self.id)

    @property
    def revision(self):
        return sha256(self.raw).hexdigest() if self.raw is not None else None

    def expect(self, expected):
        if revision(expected) != self.revision:
            raise ValueError('Outline changed; reopen it before editing')

    def blob(self, digest, *, source=False):
        return self.directory / (('source-' if source else 'artifact-') + revision(digest) + '.bin')

    def retain(self, raw, *, source=False):
        destination = self.blob(sha256(raw).hexdigest(), source=source)
        if destination.exists():
            if read_bounded(destination, MAX_SOURCE, 'retained artifact') != raw:
                raise ValueError('Retained artifact identity differs')
            sync_directory(destination.parent)
        else:
            persist_private_new(destination, raw)

    def source(self):
        if hasattr(self, '_source'):
            return self._source
        saved = self.state['source']
        raw = read_bounded(self.blob(saved['revision'], source=True), MAX_SOURCE, 'retained source')
        if sha256(raw).hexdigest() != saved['revision']:
            raise ValueError('Retained source snapshot changed; no replacement was guessed')
        self._source = SourceDocument.from_bytes(saved['path'], raw)
        return self._source

    def artifact(self, item):
        raw = read_bounded(self.blob(item['revision']), MAX_SOURCE, 'retained supporting artifact')
        if sha256(raw).hexdigest() != item['revision']:
            raise ValueError('Retained artifact changed; no replacement was guessed')
        return raw

    def publish(self, value):
        validate_state(value, self.root, self.id)
        raw = encoded(value)
        if len(raw) > MAX_STATE:
            raise ValueError('Outline annotations and selections exceed the 512 KiB state limit')
        try:
            save_mutable(self.directory / 'outline.json', raw, previous=self.raw, lock_root=self.base / 'locks')
        except (OSError, ValueError) as exc:
            return {'blocked': True, 'write_error': str(exc)}
        self.raw, self.state = raw, value
        return self.view()

    def check_spans(self, value):
        source = self.source()
        total = 0
        for r in value['regions']:
            total += len(span_text(source, r['span']).encode('utf-8'))
            if r['statement']:
                total += len(span_text(source, r['statement']['span'], 65536).encode('utf-8'))
        for c in value['contexts']:
            total += len(span_text(source, c['span'], 65536).encode('utf-8'))
        if total > MAX_SOURCE:
            raise ValueError('Combined selections exceed the 2 MiB view limit')

    def view(self):
        value = deepcopy(self.state)
        try:
            source = self.source()
            self.check_spans(value)
            value['retained_error'] = None
        except (OSError, ValueError) as exc:
            source = None
            value['retained_error'] = str(exc)
        try:
            current = ordinary_source(value['source']['path'], value['source']['revision'])
            if str(current.path) != value['source']['path']:
                raise ValueError('Source path was redirected')
            value['source_status'] = 'unchanged'
        except FileNotFoundError:
            value['source_status'] = 'missing'
        except (OSError, ValueError):
            value['source_status'] = 'changed or unavailable'
        for r in value['regions']:
            r['argument_text'] = span_text(source, r['span']) if source and not r['collapsed'] else None
            r['statement_text'] = span_text(source, r['statement']['span'], 65536) if source and r['statement'] else None
        for c in value['contexts']:
            c['text'] = span_text(source, c['span'], 65536) if source else None
        for a in value['artifacts']:
            a['goals'], a['error'], a['entries'] = None, None, []
            try:
                raw = self.artifact(a)
                entries = goal_entries(raw)
                a['entries'] = [{k: e[k] for k in ('index', 'label')} for e in entries]
                if a['kind'] == 'goal_context':
                    entry = next((e for e in entries if e['index'] == a['selector']), None)
                    if entry is None:
                        raise ValueError('Selected recorded goal/context is unavailable')
                    a['goals'] = entry['goals']
            except (OSError, ValueError) as exc:
                a['error'] = str(exc)
        if value.get('acquisition', {}).get('kind') == 'stacks-section':
            from .stacks_import import enrich
            enrich(self, value)
        from .reader_diagrams import enrich as diagram_view
        diagram_view(self, value)
        return {'outline': value, 'revision': self.revision, 'blocked': False}


def item_by_id(items, key):
    return next((item for item in items if item['id'] == key), None)


def mutate(store, change):
    value = deepcopy(store.state)
    kind = change.get('kind') if isinstance(change, dict) else None
    source = store.source()
    def selection():
        span = select_span(source, change['start'], change['end'])
        span_text(source, span)
        return span
    def region():
        item = item_by_id(value['regions'], change['region'])
        if item is None:
            raise ValueError('Select an existing source region')
        return item
    def existing(collection, key):
        item = item_by_id(value[collection], change[key])
        if item is None:
            raise ValueError('Selected association changed; reopen the outline')
        return item
    if kind == 'add_region':
        fields(change, {'kind', 'start', 'end'}, 'region selection')
        span = selection()
        value['regions'].append(dict(id=str(uuid4()), title=f'Region {len(value["regions"]) + 1}',
            level='argument', span=span, statement=None, collapsed=False, annotations=[]))
    elif kind == 'statement':
        fields(change, {'kind', 'region', 'statement_kind', 'start', 'end'}, 'statement selection')
        region()['statement'] = dict(kind=change['statement_kind'], span=selection())
    elif kind == 'replace_region':
        fields(change, {'kind', 'region', 'start', 'end'}, 'region replacement selection')
        region()['span'] = selection()
    elif kind == 'context':
        fields(change, {'kind', 'context_kind', 'label', 'start', 'end'}, 'context selection')
        value['contexts'].append(dict(id=str(uuid4()), kind=change['context_kind'], label=change['label'], span=selection()))
    elif kind == 'replace_context':
        fields(change, {'kind', 'context', 'start', 'end'}, 'context replacement selection')
        existing('contexts', 'context')['span'] = selection()
    elif kind == 'edit_context':
        fields(change, {'kind', 'context', 'context_kind', 'label'}, 'context description')
        existing('contexts', 'context').update(kind=change['context_kind'], label=change['label'])
    elif kind == 'remove_context':
        fields(change, {'kind', 'context'}, 'context removal')
        value['contexts'].remove(existing('contexts', 'context'))
    elif kind == 'evidence_association':
        fields(change, {'kind', 'artifact', 'region', 'selector'}, 'manual evidence association')
        artifact = existing('artifacts', 'artifact')
        # Revise only the manual region/snapshot choice, never the supplied
        # artifact's identity, kind, label, capture time or retained bytes.
        if artifact['kind'] == 'goal_context':
            entries = goal_entries(store.artifact(artifact))
            if type(change['selector']) is not int or not any(e['index'] == change['selector'] for e in entries):
                raise ValueError('Choose an available recorded tactic goal/context')
        elif change['selector'] is not None:
            raise ValueError('Only a recorded tactic goal/context has a snapshot selector')
        artifact.update(region=change['region'], selector=change['selector'])
    elif kind == 'remove_evidence_association':
        fields(change, {'kind', 'artifact'}, 'manual evidence association removal')
        # Keep the artifact and its supplied statement/goal/context explicitly
        # readable as an outline-level reference. This is not artifact deletion.
        existing('artifacts', 'artifact')['region'] = None
    elif kind == 'region':
        fields(change, {'kind', 'region', 'title', 'level', 'collapsed'}, 'region presentation')
        region().update(title=change['title'], level=change['level'], collapsed=change['collapsed'])
    elif kind == 'annotation':
        fields(change, {'kind', 'region', 'id', 'purpose', 'text', 'origin', 'author'}, 'annotation edit')
        target = value['annotations'] if change['region'] is None else region()['annotations']
        updated = dict(id=change['id'] or str(uuid4()), kind=change['purpose'], text=change['text'],
            provenance=dict(origin=change['origin'], author=change['author'] or None, at=now()))
        if change['id'] is None:
            target.append(updated)
        else:
            old = item_by_id(target, change['id'])
            if old is None:
                raise ValueError('Annotation identity changed; reopen it')
            target[target.index(old)] = updated
    elif kind == 'metadata':
        fields(change, {'kind', 'bibliography', 'authorship'}, 'source description')
        value['source']['bibliography'] = change['bibliography']
        value['source']['authorship'] = change['authorship']
    else:
        raise ValueError('Unknown outline edit')
    store.check_spans(value)
    return store.publish(value)


def outline_action(request):
    method = request['method']
    if method == 'outline_inspect_artifact':
        path = local_path(request['path'])
        raw = read_bounded(path, MAX_SOURCE, 'supporting artifact')
        text(raw.decode('utf-8'), 'supporting artifact', MAX_SOURCE)
        return {'path': str(path.resolve()), 'revision': sha256(raw).hexdigest(),
                'entries': [{k: e[k] for k in ('index', 'label')} for e in goal_entries(raw)]}
    store = OutlineStore(request['store'], request['project_root'], request.get('id'))
    if method == 'outline_list':
        if not store.base.exists():
            return {'outlines': []}
        result = []
        for entry in sorted(store.base.iterdir()):
            if re.fullmatch(r'[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}', entry.name) is None:
                continue
            if len(result) >= 100:
                raise ValueError('Outline list exceeds its 100-outline limit')
            try:
                saved = OutlineStore(str(store.base), str(store.root), entry.name)
            except FileNotFoundError:
                # An interrupted create may retain a source without publishing
                # its view pointer. It is not an existing editable outline.
                continue
            result.append(dict(id=entry.name, title=saved.state['source']['bibliography']['title'],
                               path=saved.state['source']['path'], revision=saved.state['source']['revision'],
                               locator=saved.state['source']['bibliography']['locator'],
                               upstream_revision=saved.state['source']['bibliography']['revision']))
        return {'outlines': result}
    if method == 'outline_create':
        source = ordinary_source(request['path'], request['source_revision'])
        store.id = str(uuid4()); store.directory = store.base / store.id
        store.state = dict(schema=SCHEMA, version=1, id=store.id, project_root=str(store.root), created_at=now(),
            source=dict(path=str(source.path), revision=source.revision, authorship='unknown',
                bibliography={k: None for k in BIBLIOGRAPHY}),
            regions=[], contexts=[], annotations=[], artifacts=[])
        try:
            directory(store.directory)
            store.retain(source.text.encode('utf-8'), source=True)
        except (OSError, ValueError) as exc:
            return {'blocked': True, 'write_error': str(exc)}
        return store.publish(store.state)
    if method == 'outline_load':
        return store.view()
    store.expect(request['revision'])
    if method == 'outline_mutate':
        return mutate(store, request['change'])
    if method == 'outline_attach':
        path = local_path(request['path'])
        raw = read_bounded(path, MAX_SOURCE, 'supporting artifact')
        text(raw.decode('utf-8'), 'supporting artifact', MAX_SOURCE)
        if sha256(raw).hexdigest() != revision(request['artifact_revision']):
            raise ValueError('Supplied artifact changed since selection')
        value = deepcopy(store.state)
        artifact = dict(id=str(uuid4()), path=str(path.resolve()), revision=request['artifact_revision'], kind=request['kind'],
            label=request['label'], region=request['region'], selector=request['selector'], captured_at=now())
        if artifact['kind'] == 'goal_context' and not any(e['index'] == artifact['selector'] for e in goal_entries(raw)):
            raise ValueError('Choose an available recorded tactic goal/context')
        value['artifacts'].append(artifact)
        validate_state(value, store.root, store.id)
        try:
            store.retain(raw)
        except (OSError, ValueError) as exc:
            return {'blocked': True, 'write_error': str(exc)}
        return store.publish(value)
    if method == 'outline_document':
        if request['artifact'] is None:
            source = store.source()
            return {'text': source.text, 'source_revision': source.revision}
        artifact = item_by_id(store.state['artifacts'], request['artifact'])
        if artifact is None:
            raise ValueError('Unknown retained artifact')
        return {'text': store.artifact(artifact).decode('utf-8'), 'source_revision': artifact['revision']}
    if method == 'outline_navigation':
        source = store.source()
        if request['context'] is not None:
            selected = item_by_id(store.state['contexts'], request['context'])
            if selected is None:
                raise ValueError('Unknown context selection')
            span = selected['span']
        else:
            region = item_by_id(store.state['regions'], request['region'])
            if region is None:
                raise ValueError('Unknown source region')
            span = region['statement']['span'] if request['statement'] and region['statement'] else region['span']
        span_text(source, span)
        if store.state.get('acquisition', {}).get('kind') == 'stacks-section':
            return {'retained': True, 'text': source.text, 'source_revision': source.revision,
                    'start': host_point(source, span, 'start'), 'end': host_point(source, span, 'end')}
        current = ordinary_source(str(source.path), source.revision)
        if str(current.path) != store.state['source']['path']:
            raise ValueError('Original source path was redirected')
        normalized = logical_text(source).replace('\r\n', '\n').replace('\r', '\n')
        return {'path': str(source.path), 'source_revision': source.revision,
                'text_revision': sha256(normalized.encode('utf-8')).hexdigest(),
                'start': host_point(source, span, 'start'), 'end': host_point(source, span, 'end')}
    raise ValueError('Unknown outline action')
