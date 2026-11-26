"""Exact revision-pinned reviews, blind readings, and report snapshots."""

from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import re
import stat
from urllib.parse import unquote, urlsplit
from uuid import UUID, uuid4

from .artifact_context import CURRENT, publication_guard, read_location
from .local_files import read_bounded
from .mutable_files import file_lock, private_directory, save_mutable, sync_directory
from .private_persistence import persist_private_new
from .route_records import encode
from .workspace import strict_json

ASPECTS = ('objects', 'hypotheses', 'quantifiers', 'conclusion', 'assumptions')
VERDICTS = {'matches', 'lean_assumes_more', 'lean_proves_less', 'lean_stronger', 'not_comparable'}
RESOLUTIONS = {'first_revised', 'second_revised', 'open'}
STAGES = ('blind', 'saved', 'facts', 'revealed', 'reconciled')
EVENTS = {'review': 'reviews', 'reading': 'readings', 'observation': 'observations'}
LIMIT = 3 * 1024 * 1024
SOURCE_LIMIT = 1024 * 1024
REPORT_LIMIT = 512
TOTAL_LIMIT = 64 * 1024 * 1024
ENTRY_LIMIT = 2048
HEX = re.compile(r'[0-9a-f]{64}')
GIT = re.compile(r'[0-9a-f]{40}|[0-9a-f]{64}')
TEMPORARY = re.compile(r'\.[a-z0-9-]+\.json\.[a-z0-9_]+\.tmp')
COMMON = {'store', 'project_root'}
FIELDS = {
    'correspondence_list': (set(), set()),
    'correspondence_review': ({'revision'}, set()),
    'correspondence_save': ({'source', 'facts', 'aspects', 'reviewer'}, {'prior', 'attribution', 'verification'}),
    'correspondence_refresh': ({'revision', 'facts'}, set()),
    'correspondence_reconstruction_begin': ({'review'}, set()),
    'correspondence_reconstruction_read': ({'id'}, {'revision'}),
    'correspondence_reconstruction_save': ({'id', 'revision', 'reconstruction', 'reviewer'}, set()),
    'correspondence_reconstruction_reveal': ({'id', 'revision'}, set()),
    'correspondence_reconstruction_reconcile': ({'id', 'revision', 'reconciliation'}, set()),
    'correspondence_report_build': ({'scope'}, set()),
    'correspondence_report_save': ({'scope'}, {'expected'}),
    'correspondence_report_read': ({'id'}, set()),
    'correspondence_report_export': ({'id', 'destination'}, set()),
    'correspondence_report_trash': ({'id', 'revision'}, set()),
    'correspondence_report_restore': ({'id', 'revision'}, set()),
    'correspondence_report_delete': ({'id', 'revision'}, set()),
}
FIELDS = {name: (required | COMMON, optional) for name, (required, optional) in FIELDS.items()}
WRITE_METHODS = frozenset(FIELDS) - {
    'correspondence_list', 'correspondence_review', 'correspondence_reconstruction_read',
    'correspondence_report_build', 'correspondence_report_read', 'correspondence_report_export',
}


def digest(raw):
    return sha256(raw).hexdigest()


def now():
    return datetime.now(timezone.utc).isoformat(timespec='microseconds').replace('+00:00', 'Z')


def check_keys(value, required, optional=()):
    if not isinstance(value, dict) or not required <= value.keys() or value.keys() - required - set(optional):
        raise ValueError('Invalid correspondence record fields')


def string(value, name, limit=4096, *, multiline=False):
    if not isinstance(value, str) or not value.strip() or len(value.encode('utf-8')) > limit:
        raise ValueError(f'Invalid or oversized {name}')
    if any(ord(char) < 32 and (not multiline or char not in '\t\n\r') for char in value):
        raise ValueError(f'Invalid control character in {name}')
    return value


def revision(value, pattern=HEX):
    if not isinstance(value, str) or not pattern.fullmatch(value):
        raise ValueError('Invalid correspondence revision')
    return value


def uuid(value):
    if not isinstance(value, str) or str(UUID(value)) != value:
        raise ValueError('Invalid correspondence identity')
    return value


def absolute(value):
    path = Path(string(value, 'local path'))
    if not path.is_absolute() or str(path) != value or '..' in path.parts:
        raise ValueError('Use a canonical absolute path')
    return path


def local_path(value):
    uri = urlsplit(value)
    if uri.scheme == 'file' and not uri.netloc and not uri.query and not uri.fragment:
        return absolute(unquote(uri.path))
    return None


def utf16_span(text, start, end):
    if type(start) is not int or type(end) is not int or not 0 <= start < end:
        raise ValueError('Choose a nonempty forward manuscript passage')
    units = text.encode('utf-16-le')
    if 2 * end > len(units):
        raise ValueError('Manuscript passage is outside the captured revision')
    try:
        before = units[:2 * start].decode('utf-16-le')
        passage = units[2 * start:2 * end].decode('utf-16-le')
    except UnicodeDecodeError as exc:
        raise ValueError('Manuscript passage divides a Unicode character') from exc
    return before, passage


def source_snapshot(source):
    check_keys(source, {'title', 'uri', 'revision', 'text', 'language', 'start', 'end'}, {'label', 'reference'})
    string(source['title'], 'manuscript title', 512)
    if 'label' in source:
        string(source['label'], 'passage label', 512)
    uri = urlsplit(string(source['uri'], 'manuscript URI'))
    if uri.scheme == 'mrw-outline':
        from .outline_references import parse_reference
        target = parse_reference(source['uri'])
        if target['span'] is not None or target['source'] != source['revision']:
            raise ValueError('Saved manuscript URI must pin this whole source revision')
    elif uri.scheme not in ('file', 'https') or (uri.scheme == 'file' and local_path(source['uri']) is None):
        raise ValueError('Use a local document, retained source, or an HTTPS manuscript reference')
    if uri.scheme == 'https' and (not uri.hostname or uri.username or uri.password):
        raise ValueError('Use an HTTPS manuscript reference without credentials')
    string(source['language'], 'manuscript language', 64)
    raw = string(source['text'], 'manuscript', SOURCE_LIMIT, multiline=True)
    if digest(raw.encode('utf-8')) != revision(source['revision']):
        raise ValueError('Manuscript bytes differ from the captured revision')
    before, passage = utf16_span(raw, source['start'], source['end'])
    string(passage, 'manuscript passage', 256 * 1024, multiline=True)
    if 'reference' in source:
        from .outline_references import parse_reference
        reference = parse_reference(source['reference'])
        def point(prefix):
            lines = re.split(r'\r\n|[\r\n]', prefix.removeprefix('\ufeff'))
            return len(lines), len(lines[-1])
        start_line, start_col = point(before)
        end_line, end_col = point(before + passage)
        span = dict(source_revision=source['revision'], start_line=start_line, start_col=start_col,
                    end_line=end_line, end_col=end_col)
        if reference['source'] != source['revision'] or reference['span'] != span:
            raise ValueError('Retained reference differs from the manuscript revision or its exact passage')
    return passage


def receipt(value):
    check_keys(value, {'uri', 'revision', 'title', 'text'})
    string(value['title'], 'verification receipt title', 512)
    if local_path(string(value['uri'], 'verification receipt URI')) is None:
        raise ValueError('Choose a retained local verification receipt')
    if digest(string(value['text'], 'verification receipt', 256 * 1024, multiline=True).encode()) != revision(value['revision']):
        raise ValueError('Verification receipt differs from its revision')


def validate_facts(value, *, allow_missing=False):
    from .lean_correspondence import validate
    validate(value)
    if value.get('missing') and not allow_missing:
        raise ValueError('Read an available Lean declaration before saving a review')
    return value


def judgments(value):
    check_keys(value, set(ASPECTS))
    for aspect in ASPECTS:
        item = value[aspect]
        check_keys(item, {'verdict', 'reason'})
        if item['verdict'] not in VERDICTS:
            raise ValueError('Choose a verdict for each correspondence aspect')
        string(item['reason'], 'reason for ' + aspect, multiline=True)
    return value


def decision(aspects, facts):
    verdicts = {item['verdict'] for item in aspects.values()}
    found = []
    if 'not_comparable' in verdicts:
        found.append({'kind': 'manuscript_vs_formalization', 'reason': 'Incomparable aspect'})
    elif verdicts & {'lean_assumes_more', 'lean_proves_less'}:
        found.append({'kind': 'manuscript_vs_formalization', 'reason': 'Lean assumes more or proves less'})
    if 'sorryAx' in facts['axiom_dependencies']:
        # An unfinished proof blocks every correspondence verdict, not only formalizes.
        found.append({'kind': 'manuscript_vs_formalization', 'reason': 'Unfinished Lean proof depends on sorryAx'})
        return None, found
    if found:
        return (None if 'not_comparable' in verdicts else 'weakens'), found
    if 'lean_stronger' in verdicts:
        return 'strengthens', []
    return 'formalizes', []


def subject(facts):
    return facts['project'], facts['module'], facts['declaration']


def manuscript_status(source):
    path = local_path(source['uri'])
    if path is None:
        return 'unavailable'
    try:
        if path.resolve() != path:
            return 'unavailable'
        raw = read_bounded(path, SOURCE_LIMIT, 'current manuscript')
    except (OSError, ValueError, RuntimeError):
        return 'unavailable'
    # VS Code text documents remove a leading UTF-8 BOM.
    return 'current' if source['revision'] in (digest(raw), digest(raw.removeprefix(b'\xef\xbb\xbf'))) else 'changed'


def lean_status(facts):
    from .lean_correspondence import status
    return status(facts)['state']


def comparison(prior, facts):
    if facts.get('missing'):
        return 'declaration_missing'
    if prior['declaration_type'] != facts['declaration_type'] or set(prior['axiom_dependencies']) != set(facts['axiom_dependencies']):
        return 'signature_changed'
    return 'same_signature'


def validate_review(record):
    passage = source_snapshot(record['source'])
    validate_facts(record['facts'])
    judgments(record['aspects'])
    string(record['reviewer'], 'reviewer', 512)
    if record['kind'] != decision(record['aspects'], record['facts'])[0]:
        raise ValueError('Saved correspondence verdict differs from the exact aspect judgments')
    if record['prior'] is not None:
        revision(record['prior'])
    if record['attribution'] is not None:
        string(record['attribution'], 'attribution', 512)
    if record['verification'] is not None:
        receipt(record['verification'])
    return passage


def reconstruction_text(value):
    check_keys(value, set(ASPECTS))
    for aspect in ASPECTS:
        string(value[aspect], 'reconstruction of ' + aspect, multiline=True)


def reconciliation_text(value):
    check_keys(value, set(), ASPECTS)
    for aspect, item in value.items():
        check_keys(item, {'resolution', 'reason'})
        if item['resolution'] not in RESOLUTIONS:
            raise ValueError('Choose a reconciliation for ' + aspect)
        string(item['reason'], 'reconciliation of ' + aspect, multiline=True)


class Store:
    def __init__(self, store, project):
        self.folder = read_location(absolute(str(store)))
        if self.folder.resolve() != self.folder:
            raise ValueError('Correspondence store must be a canonical private directory')
        self.project = str(absolute(project))
        self.events = {kind: {} for kind in EVENTS}
        self.reports = {}
        self.passages = {}
        self._heads = {}
        self.size = 0
        self.count = 0
        if self.folder.exists():
            self._load()

    def _load(self):
        for folder in self.folder.iterdir():
            if folder.name not in (*EVENTS.values(), 'reports') or folder.is_symlink() or not folder.is_dir():
                raise ValueError('Invalid correspondence storage directory')
            kind = next((key for key, name in EVENTS.items() if name == folder.name), 'report')
            for file in folder.iterdir():
                st = file.lstat()
                self._reserve(st.st_size)
                if not stat.S_ISREG(st.st_mode):
                    raise ValueError('Invalid correspondence storage entry')
                if TEMPORARY.fullmatch(file.name):
                    continue
                if file.suffix != '.json':
                    raise ValueError('Unrecognized correspondence storage entry')
                raw = read_bounded(file, LIMIT, 'correspondence record')
                record = strict_json(raw)
                if not isinstance(record, dict) or (
                    record.get('schema') != 'mrw.correspondence-' + kind or
                    type(record.get('version')) is not int or record['version'] != 1 or
                    record.get('project_root') != self.project
                ):
                    raise ValueError('Correspondence record schema or workspace differs')
                uuid(record.get('id'))
                string(record.get('at'), 'record time', 64)
                if kind == 'report':
                    if file.stem != record['id']:
                        raise ValueError('Report identity differs from its storage filename')
                    self._validate_report(record)
                    self.reports[record['id']] = (record, raw)
                else:
                    if digest(raw) != revision(file.stem):
                        raise ValueError('Correspondence record bytes changed')
                    self.events[kind][file.stem] = record
        self._validate_events()

    def _reserve(self, size, count=1):
        if size > LIMIT or self.size + size > TOTAL_LIMIT or self.count + count > ENTRY_LIMIT:
            raise ValueError('Correspondence storage limit reached; earlier reviews are preserved')
        self.size += size
        self.count += count

    def _validate_events(self):
        for key, record in self.events['review'].items():
            check_keys(record, {'schema', 'version', 'project_root', 'id', 'at', 'source', 'facts',
                                'aspects', 'reviewer', 'kind', 'prior', 'attribution', 'verification'})
            self.passages[key] = validate_review(record)
            if record['prior']:
                parent = self.event('review', record['prior'])
                if record['id'] != parent['id'] or subject(record['facts']) != subject(parent['facts']):
                    raise ValueError('Review revision changed its identity')
                old, new = parent['source'], record['source']
                if new['uri'] != old['uri'] or (
                    new['revision'] == old['revision'] and (new['start'], new['end']) != (old['start'], old['end'])
                ):
                    raise ValueError('Revision refers to another manuscript passage')
        for record in self.events['observation'].values():
            check_keys(record, {'schema', 'version', 'project_root', 'id', 'at', 'review', 'facts', 'kind'})
            reviewed = self.event('review', record['review'])
            validate_facts(record['facts'], allow_missing=True)
            if subject(record['facts']) != subject(reviewed['facts']) or record['kind'] != comparison(reviewed['facts'], record['facts']):
                raise ValueError('Observation differs from its exact reviewed declaration')
        for item in self.events['reading'].values():
            self._validate_reading(item)
        for kind in ('review', 'reading'):
            self.heads(kind)

    def _validate_reading(self, item):
        required = {'schema', 'version', 'project_root', 'id', 'at', 'review', 'prior', 'stage'}
        stage = item['stage']
        if stage not in STAGES:
            raise ValueError('Invalid second-reading stage')
        index = STAGES.index(stage)
        if index >= 1:
            required |= {'reviewer', 'reconstruction', 'saved_at'}
            string(item['reviewer'], 'second reader', 512)
            reconstruction_text(item['reconstruction'])
        if index >= 2:
            required.add('facts_revealed_at')
        if index >= 3:
            required.add('revealed_at')
        if index >= 4:
            required.add('reconciliation')
            reconciliation_text(item['reconciliation'])
        check_keys(item, required)
        self.event('review', item['review'])
        if index:
            parent = self.event('reading', item['prior'])
            shared = set(parent) - {'prior', 'stage', 'at'}
            if parent['stage'] != STAGES[index - 1] or any(parent[key] != item[key] for key in shared):
                raise ValueError('Second reading changed evidence or advanced out of order')
        elif item['prior'] is not None:
            raise ValueError('Blind reading must precede every disclosure')

    def _validate_report(self, record):
        check_keys(record, {'schema', 'version', 'project_root', 'id', 'at', 'state', 'snapshot', 'digest', 'transition'})
        uuid(record['transition'])
        if record['state'] not in ('active', 'trash', 'deleted'):
            raise ValueError('Invalid report lifecycle state')
        revision(record['digest'])
        snapshot = record['snapshot']
        if record['state'] == 'deleted':
            if snapshot is not None:
                raise ValueError('Deleted report still has snapshot bytes')
            return
        check_keys(snapshot, {'scope', 'rows'})
        scope_fields(snapshot['scope'])
        if not isinstance(snapshot['rows'], list) or len(snapshot['rows']) > REPORT_LIMIT or digest(encode(snapshot)) != record['digest']:
            raise ValueError('Report snapshot differs from its saved revision')

    def event(self, kind, key):
        value = self.events[kind].get(revision(key))
        if value is None:
            raise ValueError('The exact saved ' + kind + ' revision is unavailable')
        return value

    def heads(self, kind):
        if kind in self._heads:
            return self._heads[kind]
        events = self.events[kind]
        prior = {item['prior'] for item in events.values() if item['prior']}
        heads = {}
        for key, item in events.items():
            if key in prior:
                continue
            if item['id'] in heads:
                raise ValueError('Conflicting correspondence revisions; earlier work is preserved')
            heads[item['id']] = key
        if {item['id'] for item in events.values()} != heads.keys():
            raise ValueError('Cyclic correspondence revisions')
        self._heads[kind] = heads
        return heads

    def publish(self, kind, payload):
        record = dict(schema='mrw.correspondence-' + kind, version=1, project_root=self.project, **payload)
        raw = encode(record)
        self._reserve(len(raw))
        key = digest(raw)
        folder = self.folder / EVENTS[kind]
        private_directory(folder)
        persist_private_new(folder / (key + '.json'), raw)
        if not (folder / (key + '.json')).exists():
            raise ValueError('Saved record did not survive publication')
        self.events[kind][key] = record
        self._heads.pop(kind, None)
        sync_directory(folder.parent)
        return key

    def report(self, identifier):
        result = self.reports.get(uuid(identifier))
        if result is None or result[0]['state'] == 'deleted':
            raise ValueError('The saved report is unavailable')
        return result

    def publish_report(self, record, previous=None):
        raw = encode(record)
        self._reserve(len(raw) - (len(previous) if previous else 0), count=int(previous is None))
        if len(raw) > LIMIT:
            raise ValueError('Report snapshot exceeds the record size limit')
        folder = self.folder / 'reports'
        private_directory(folder)
        target = folder / (record['id'] + '.json')
        if previous is None:
            persist_private_new(target, raw)
            sync_directory(folder.parent)
        else:
            save_mutable(target, raw, previous=previous, lock_root=self.folder.parent / 'correspondence-locks')
        self.reports[record['id']] = (record, raw)
        return report_view(record, raw)


def source_locator(source):
    return {key: value for key, value in source.items() if key != 'text'}


def review_summary(key, item):
    facts = item['facts']
    return dict(id=item['id'], revision=key, source=source_locator(item['source']),
                declaration=facts['declaration'], module=facts['module'], lean_project=facts['project'],
                lean_commit=facts['derived_from']['commit'], kind=item['kind'], reviewer=item['reviewer'], at=item['at'])


def reading_summaries(store, key):
    items = []
    for identifier, reading in store.heads('reading').items():
        item = store.events['reading'][reading]
        if item['review'] == key:
            items.append(dict(id=identifier, revision=reading, stage=item['stage'],
                              reviewer=item.get('reviewer'), saved_before_reveal='revealed_at' in item,
                              reconciled=item['stage'] == 'reconciled'))
    return items


def discrepancies(store, key, record, status):
    result = list(decision(record['aspects'], record['facts'])[1])
    if 'changed' in status.values():
        result.append(dict(kind='stale_correspondence', reason='A captured source revision has changed'))
    for observation, item in store.events['observation'].items():
        if item['review'] == key and item['kind'] != 'same_signature':
            result.append(dict(kind=item['kind'], at=item['at'], revision=observation))
    for item in reading_summaries(store, key):
        reading = store.events['reading'][item['revision']]
        for aspect, value in reading.get('reconciliation', {}).items():
            if value['resolution'] == 'open':
                result.append(dict(kind='manuscript_vs_formalization', aspect=aspect, reason=value['reason']))
    return result


def review_view(store, key):
    record = store.event('review', key)
    status = dict(manuscript=manuscript_status(record['source']), lean=lean_status(record['facts']))
    source = dict(record['source'], passage=store.passages[key])
    return dict(record, revision=key, source=source, status=status,
                discrepancies=discrepancies(store, key, record, status), readings=reading_summaries(store, key),
                revisions=sorted((other for other, event in store.events['review'].items()
                                  if event['id'] == record['id']), key=lambda other: store.events['review'][other]['at']))


def same_passage(a, b):
    return (a['uri'], a['revision'], a['start'], a['end']) == (b['uri'], b['revision'], b['start'], b['end'])


def save_review(store, request):
    source, facts = request['source'], validate_facts(request['facts'])
    aspects = judgments(request['aspects'])
    attribution, verification = request.get('attribution'), request.get('verification')
    prior = request.get('prior')
    payload = dict(source=source, facts=facts, aspects=aspects, kind=decision(aspects, facts)[0],
                   reviewer=request['reviewer'], prior=prior, attribution=attribution, verification=verification)
    passage = validate_review(payload)
    if prior:
        parent = store.event('review', prior)
        if (subject(parent['facts']) != subject(facts) or parent['source']['uri'] != source['uri'] or
            (parent['source']['revision'] == source['revision'] and not same_passage(parent['source'], source))):
            raise ValueError('A revised judgment must concern the same result and Lean declaration')
        identifier = parent['id']
    else:
        identifier = str(uuid4())
    for key in store.heads('review').values():
        current = store.events['review'][key]
        if all(current[field] == value for field, value in payload.items()):
            return review_view(store, key)
    if prior and store.heads('review')[identifier] != prior:
        raise ValueError('The review changed; reopen its latest revision before saving')
    key = store.publish('review', dict(payload, id=identifier, at=now()))
    store.passages[key] = passage
    return review_view(store, key)


def refresh_review(store, request):
    key = request['revision']
    record = store.event('review', key)
    facts = validate_facts(request['facts'], allow_missing=True)
    if subject(facts) != subject(record['facts']):
        raise ValueError('Read the same declaration to compare its new revision')
    payload = dict(review=key, facts=facts, kind=comparison(record['facts'], facts))
    for observation, existing in store.events['observation'].items():
        if all(existing[field] == value for field, value in payload.items()):
            return dict(existing, revision=observation)
    revision_id = store.publish('observation', dict(payload, id=str(uuid4()), at=now()))
    return dict(store.events['observation'][revision_id], revision=revision_id)


def reading_view(store, key):
    item = store.event('reading', key)
    record = store.event('review', item['review'])
    # A blind panel receives only the selected manuscript statement. In
    # particular its webview receives no declaration, verdict or first-review ID.
    source = dict(source_locator(record['source']), passage=store.passages[item['review']])
    result = dict(id=item['id'], revision=key, stage=item['stage'], source=source)
    if item['stage'] != 'blind':
        result.update(reconstruction=item['reconstruction'], reviewer=item['reviewer'], saved_at=item['saved_at'])
    if 'facts_revealed_at' in item:
        result.update(facts=record['facts'], facts_revealed_at=item['facts_revealed_at'])
    if 'revealed_at' in item:
        result.update(review=review_view(store, item['review']), revealed_at=item['revealed_at'])
    if 'reconciliation' in item:
        result['reconciliation'] = item['reconciliation']
    return result


def reading_action(store, method, request):
    if method == 'begin':
        store.event('review', request['review'])
        key = store.publish('reading', dict(id=str(uuid4()), at=now(), stage='blind', prior=None, review=request['review']))
        return reading_view(store, key)
    identifier = uuid(request['id'])
    current = store.heads('reading').get(identifier)
    if current is None:
        raise ValueError('The second reading is unavailable')
    if method == 'read':
        key = request.get('revision', current)
        if store.event('reading', key)['id'] != identifier:
            raise ValueError('Revision belongs to another second reading')
        return reading_view(store, key)
    if revision(request['revision']) != current:
        raise ValueError('The second reading changed; reopen it before continuing')
    record = store.event('reading', current).copy()
    for field in ('schema', 'version', 'project_root'):
        del record[field]
    recorded = now()
    if method == 'save' and record['stage'] == 'blind':
        reconstruction_text(request['reconstruction'])
        reviewer = string(request['reviewer'], 'second reader', 512)
        record.update(stage='saved', reconstruction=request['reconstruction'], reviewer=reviewer, saved_at=recorded)
    elif method == 'reveal' and record['stage'] == 'saved':
        record.update(stage='facts', facts_revealed_at=recorded)
    elif method == 'reveal' and record['stage'] == 'facts':
        record.update(stage='revealed', revealed_at=recorded)
    elif method == 'reconcile' and record['stage'] == 'revealed':
        reconciliation_text(request['reconciliation'])
        record.update(stage='reconciled', reconciliation=request['reconciliation'])
    else:
        raise ValueError('Save the reconstruction before reveal and reveal both readings before reconciliation')
    key = store.publish('reading', dict(record, at=recorded, prior=current))
    return reading_view(store, key)


def scope_fields(scope):
    check_keys(scope, {'source_uri', 'source_revision', 'lean_project', 'lean_commit'}, {'results'})
    string(scope['source_uri'], 'report manuscript URI')
    revision(scope['source_revision'])
    absolute(scope['lean_project'])
    revision(scope['lean_commit'], GIT)
    results = scope.get('results', [])
    if not isinstance(results, list) or len(results) > REPORT_LIMIT:
        raise ValueError('Report result inventory exceeds its limit')
    seen = set()
    for result in results:
        check_keys(result, {'title', 'start', 'end'})
        string(result['title'], 'result title', 512)
        start, end = result['start'], result['end']
        if type(start) is not int or type(end) is not int or not 0 <= start < end:
            raise ValueError('Report result must name an exact manuscript passage')
        if (start, end) in seen:
            raise ValueError('Duplicate result range in report inventory')
        seen.add((start, end))


def report_snapshot(store, scope):
    scope_fields(scope)
    manuscript = None
    matching = {}
    for key, item in sorted(store.events['review'].items(), key=lambda row: row[1]['at']):
        source, facts = item['source'], item['facts']
        if (source['uri'], source['revision']) != (scope['source_uri'], scope['source_revision']):
            continue
        manuscript = source['text']
        if (facts['project'], facts['derived_from']['commit']) != (scope['lean_project'], scope['lean_commit']):
            continue
        # A later revision for another document/project pair does not erase
        # the best available review at the pair selected for this report.
        matching[item['id']] = key
    inventory = {(item['start'], item['end']): item['title'] for item in scope.get('results', [])}
    if inventory and manuscript is None:
        path = local_path(scope['source_uri'])
        if path is None or path.resolve() != path:
            raise ValueError('The result inventory requires the exact saved manuscript')
        raw = read_bounded(path, SOURCE_LIMIT, 'report manuscript')
        if digest(raw) != scope['source_revision']:
            raw = raw.removeprefix(b'\xef\xbb\xbf')
        if digest(raw) != scope['source_revision']:
            raise ValueError('The result inventory does not match the manuscript revision')
        manuscript = raw.decode('utf-8')
    for start, end in inventory:
        utf16_span(manuscript, start, end)
    by_span = {span: [] for span in inventory}
    lean_states = {}
    manuscript_state = manuscript_status(dict(uri=scope['source_uri'], revision=scope['source_revision']))
    for key in matching.values():
        item = store.events['review'][key]
        facts, source = item['facts'], item['source']
        actual_span = source['start'], source['end']
        # A reviewed statement may select just the mathematical prose inside
        # an environment inventoried by the atlas. Preserve its precise range.
        containing = [span for span in inventory if span[0] <= actual_span[0] < actual_span[1] <= span[1]]
        span = min(containing, key=lambda s: s[1] - s[0]) if containing else actual_span
        inventory.setdefault(span, source.get('label', source['title']))
        facts_key = digest(encode(facts['derived_from']))
        if facts_key not in lean_states:
            lean_states[facts_key] = lean_status(facts)
        status = dict(manuscript=manuscript_state, lean=lean_states[facts_key])
        by_span.setdefault(span, []).append(dict(
            id=item['id'], revision=key, declaration=facts['declaration'], module=facts['module'], kind=item['kind'],
            aspects=item['aspects'], axioms=facts['axiom_dependencies'], discrepancies=discrepancies(store, key, item, status),
            status=status, second_readings=reading_summaries(store, key),
            passage=source_locator(source), source_location=facts['source_location'],
        ))
    if len(inventory) > REPORT_LIMIT:
        raise ValueError('Report contains too many results')
    rows = []
    for (start, end), title in sorted(inventory.items()):
        reviews = by_span[(start, end)]
        rows.append(dict(title=title, start=start, end=end, source_revision=scope['source_revision'],
                         lean_commit=scope['lean_commit'], review=reviews[-1] if reviews else None,
                         alternatives=reviews[:-1]))
    value = dict(scope=scope, rows=rows)
    if len(encode(value)) > LIMIT - 4096:
        raise ValueError('The report exceeds the snapshot size limit')
    return value


def report_view(record, raw):
    base = dict(id=record['id'], revision=digest(raw), state=record['state'], at=record['at'])
    return dict(base, **record['snapshot']) if record['snapshot'] else base


def report_markdown(snapshot):
    def cell(value):
        escapes = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '|': '&#124;', '\r': ' ', '\n': ' ',
                   '\x60': '&#96;', '[': '&#91;', ']': '&#93;', '*': '&#42;', '_': '&#95;',
                   '$': '&#36;', '~': '&#126;', '\\': '&#92;'}
        return ''.join(escapes.get(char, char) for char in str(value))
    def literal(value):
        return '<code>' + cell(value) + '</code>'
    def row(*values):
        return '| ' + ' | '.join(values) + ' |'
    scope = snapshot['scope']
    lines = ['# Paper–Lean correspondence review', '',
             'Manuscript ' + literal(scope['source_uri']), '',
             'Lean project ' + literal(scope['lean_project']), '',
             row('Result', 'Exact manuscript revision and range', 'Lean commit and declaration', 'Verdict',
                 'Aspects', 'Axioms', 'Discrepancies', 'Second reading'),
             row(*(['---'] * 8))]
    for item in snapshot['rows']:
        cells = []
        candidates = [item['review'], *item.get('alternatives', [])]
        for review in candidates:
            passage = review['passage'] if review else item
            source = literal(item['source_revision']) + f" {passage['start']}–{passage['end']} (UTF-16 offsets)"
            if review and passage.get('reference'):
                source += ' ' + literal(passage['reference'])
            lean = literal(item['lean_commit'])
            facts, discrepancies, readings = '', '', ''
            if review:
                lean += ' ' + literal(review['module'] + ' · ' + review['declaration'])
                location = review.get('source_location')
                if location:
                    start, end = location['start'], location['end']
                    lean += '<br>' + literal(location['path']) + ' ' + literal(location['revision'])
                    lean += f" {start['line'] + 1}:{start['column']}–{end['line'] + 1}:{end['column']} (scalar columns)"
                aspects = ', '.join(cell(aspect + '=' + review['aspects'][aspect]['verdict']) for aspect in ASPECTS)
                facts = ', '.join(literal(axiom) for axiom in review['axioms'])
                discrepancies = ', '.join(cell(entry['kind']) for entry in review['discrepancies'])
                readings = ', '.join(
                    'reconstruction saved before reveal' + ('; reconciled' if entry['reconciled'] else '')
                    if entry['saved_before_reveal'] else cell(entry['stage'])
                    for entry in review['second_readings']
                )
            else:
                aspects = ''
            cells.append((source, lean, cell(review['kind'] or 'Open') if review else 'Unreviewed',
                          aspects, facts, discrepancies, readings))
        lines.append(row(cell(item['title']), *('<br>'.join(column) for column in zip(*cells))))
    lines.append('')
    return '\n'.join(lines).encode()


def reports_action(store, method, request):
    if method in ('build', 'save'):
        snapshot = report_snapshot(store, request['scope'])
        key = digest(encode(snapshot))
        if method == 'build':
            return dict(snapshot, revision=key)
        if request.get('expected') is not None and revision(request['expected']) != key:
            raise ValueError('Report inputs changed; rebuild the preview before saving')
        for record, raw in store.reports.values():
            if record['digest'] == key and record['state'] != 'deleted':
                if record['state'] == 'trash':
                    raise ValueError('This report is in Trash; restore the snapshot to reuse it')
                return report_view(record, raw)
        record = dict(schema='mrw.correspondence-report', version=1, project_root=store.project,
                      id=str(uuid4()), at=now(), state='active', digest=key, snapshot=snapshot, transition=str(uuid4()))
        return store.publish_report(record)
    record, raw = store.report(request['id'])
    if method == 'read':
        return report_view(record, raw)
    if method == 'export':
        destination = absolute(request['destination'])
        if destination.suffix.lower() != '.md' or destination.parent.resolve(strict=True) != destination.parent:
            raise ValueError('Choose a Markdown file in an existing local directory')
        private_roots = [store.folder]
        access = CURRENT.get()
        if access is not None:
            private_roots.append(access.manager.home)
            if access.payload is not None:
                private_roots.append(access.payload.parents[2])
        if any(destination.is_relative_to(root) for root in private_roots):
            raise ValueError('Export to an ordinary file outside private MRW storage')
        persist_private_new(destination, report_markdown(record['snapshot']))
        return dict(path=str(destination))
    if revision(request['revision']) != digest(raw):
        raise ValueError('Report status changed; reopen the snapshot before changing it')
    required, target = {'trash': ('active', 'trash'), 'restore': ('trash', 'active'), 'delete': ('trash', 'deleted')}[method]
    if record['state'] != required:
        raise ValueError('This action is unavailable for the current report state')
    snapshot = None if target == 'deleted' else record['snapshot']
    return store.publish_report(dict(record, state=target, snapshot=snapshot, transition=str(uuid4())), raw)


def validate_store(store, project_root):
    """Verify retained record structure and bindings without touching current sources."""
    return Store(store, project_root)


def _dispatch(store, method, request):
    if method == 'correspondence_list':
        return dict(
            reviews=sorted((review_summary(key, store.events['review'][key]) for key in store.heads('review').values()),
                           key=lambda item: item['at'], reverse=True),
            reports=sorted((dict(report_view(record, raw), rows=[]) for record, raw in store.reports.values()
                            if record['state'] != 'deleted'), key=lambda item: item['at'], reverse=True),
        )
    if method == 'correspondence_review':
        return review_view(store, request['revision'])
    if method == 'correspondence_save':
        return save_review(store, request)
    if method == 'correspondence_refresh':
        return refresh_review(store, request)
    if method.startswith('correspondence_reconstruction_'):
        return reading_action(store, method.removeprefix('correspondence_reconstruction_'), request)
    return reports_action(store, method.removeprefix('correspondence_report_'), request)


def action(request):
    method = request['method']
    required, optional = FIELDS[method]
    check_keys(request, required | {'method'}, optional | {'protocol'})
    folder = read_location(absolute(request['store']))
    if method in WRITE_METHODS:
        with publication_guard(folder / 'record.json'), file_lock(folder, folder.parent / 'correspondence-locks'):
            return _dispatch(Store(folder, request['project_root']), method, request)
    return _dispatch(Store(folder, request['project_root']), method, request)
