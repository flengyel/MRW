"""Private editor investigation pointer, independent of Qt buffers and recovery."""
from hashlib import sha256
from pathlib import Path
import re
from .investigation_actions import (read_parent, select_parent_passages,
    prepare_continuation, restore_investigation, investigation_handoff)
from .local_files import read_bounded
from .model_projection import MAX_MODEL_CALL_BYTES, parse_terminal_model_call
from .mutable_files import private_directory, save_mutable
from .openai_response import ADAPTER_VERSION, PROVIDER, encode_canonical, _plain_json
from .response_review import safe_terminal_text, render_response_review
from .workspace import decode_investigation, strict_json, _bounded_investigation_text

SCHEMA = 'theorem-terminal.editor-investigation'
MAX_STATE_BYTES = 128 * 1024
SUMMARY = {'question', 'correction', 'last_conclusion', 'unresolved_issue'}
REQUEST_KEYS = ('initiated_by', 'target', 'purpose', 'request_text',
                'context_refs', 'effective_input', 'limits', 'in_reply_to')


def exact_fields(value, names, label):
    if not isinstance(value, dict) or set(value) != set(names):
        raise ValueError(f'Invalid {label} fields')


def revision(value, optional=False):
    if value is None and optional:
        return
    if not isinstance(value, str) or re.fullmatch('[a-f0-9]{64}', value) is None:
        raise ValueError('Invalid investigation revision')


def local_path(value):
    if not isinstance(value, str) or not value or '\0' in value or not Path(value).is_absolute():
        raise ValueError('An absolute local investigation path is required')
    if len(value.encode('utf-8')) > 4096:
        raise ValueError('Investigation path exceeds its limit')
    return Path(value)


def summary(value):
    exact_fields(value, SUMMARY, 'human task summary')
    return {key: _bounded_investigation_text(value[key], key.replace('_', ' '),
            nonempty=key == 'question') for key in SUMMARY}


def as_state(active):
    p, c = active['parent'], active['child']
    return decode_investigation(dict(parent_path=p['path'], parent_record_revision=p['revision'],
        parent_id=p['id'], parent_response_digest=p['response_digest'], parent_passages=p['passages'],
        child_path=c['path'], child_record_revision=c['record_revision'], child_id=c['id'],
        child_response_digest=c['response_digest'], **active['summary']))


def validate_active(value):
    if value is None:
        return None
    exact_fields(value, {'id', 'phase', 'parent', 'child', 'summary'}, 'active investigation')
    _bounded_investigation_text(value['id'], 'investigation identity', nonempty=True)
    if value['phase'] not in ('pending', 'terminal'):
        raise ValueError('Invalid investigation phase')
    p, c = value['parent'], value['child']
    exact_fields(p, {'path', 'revision', 'id', 'response_digest', 'passages'}, 'parent')
    exact_fields(c, {'path', 'request_digest', 'record_revision', 'id', 'response_digest'}, 'child')
    local_path(p['path']); local_path(c['path'])
    revision(p['revision']); revision(p['response_digest']); revision(c['request_digest'])
    _bounded_investigation_text(p['id'], 'parent identity', nonempty=True)
    summary(value['summary'])
    if value['phase'] == 'terminal':
        as_state(value)
    else:
        if any(c[key] is not None for key in ('record_revision', 'id', 'response_digest')):
            raise ValueError('Pending transmission cannot claim a terminal identity')
        passages = p['passages']
        if not isinstance(passages, list) or not 1 <= len(passages) <= 8:
            raise ValueError('Select one to eight parent passages')
        seen = set()
        for item in passages:
            exact_fields(item, {'number', 'start_byte', 'end_byte'}, 'parent passage')
            n, a, b = item['number'], item['start_byte'], item['end_byte']
            if (any(type(x) is not int for x in (n, a, b)) or n < 1
                    or not 0 <= a < b <= MAX_MODEL_CALL_BYTES or n in seen):
                raise ValueError('Invalid selected parent passage')
            seen.add(n)
    return value


class InvestigationStore:
    def __init__(self, directory, project_root):
        self.directory, self.root = local_path(directory), local_path(project_root)
        if self.root.resolve() != self.root:
            raise ValueError('Use the canonical project directory')
        if self.directory.resolve() != self.directory or self.directory.is_relative_to(self.root):
            raise ValueError('Investigation state requires private storage outside the project')
        self.path, self.raw = self.directory / 'active.json', None
        try:
            self.raw = read_bounded(self.path, MAX_STATE_BYTES, 'private investigation state')
        except FileNotFoundError:
            self.active = None
        else:
            value = strict_json(self.raw)
            exact_fields(value, {'schema', 'version', 'project_root', 'active'}, 'editor investigation envelope')
            if (value['schema'] != SCHEMA or type(value['version']) is not int
                    or value['version'] != 1 or value['project_root'] != str(self.root)):
                raise ValueError('Private investigation identity or version differs')
            self.active = validate_active(value['active'])

    @property
    def revision(self):
        return sha256(self.raw).hexdigest() if self.raw is not None else None

    def expect(self, expected):
        revision(expected, optional=True)
        if expected != self.revision:
            raise ValueError('Private investigation changed; resume it before making another change')

    def publish(self, active):
        validate_active(active)
        raw = encode_canonical(dict(schema=SCHEMA, version=1, project_root=str(self.root), active=active))
        if len(raw) > MAX_STATE_BYTES:
            raise ValueError('Private investigation state exceeds its limit')
        try:
            private_directory(self.directory)
            save_mutable(self.path, raw, previous=self.raw, lock_root=self.directory / 'locks')
        except (OSError, ValueError) as exc:
            return {'blocked': True, 'write_error': str(exc), **self.result()}
        self.raw, self.active = raw, active
        return {'blocked': False, **self.result()}

    def result(self):
        return {'active': self.active, 'revision': self.revision}


def parent_pointer(parent, passages):
    return dict(path=str(parent.path), revision=parent.record_revision, id=parent.call.id,
        response_digest=parent.call.raw_response_digest,
        passages=[dict(number=p.number, start_byte=p.start_byte, end_byte=p.end_byte) for p in passages])


def prepared_fingerprint(prepared):
    request = _plain_json(prepared.operation.request)
    request['limits'] = {**request['limits'], 'request_body_utf8_bytes': len(prepared.operation.body)}
    return sha256(encode_canonical(dict(request=request, provider=PROVIDER,
        requested_model=prepared.operation.requested_model, adapter_version=ADAPTER_VERSION,
        settings={'store': False}))).hexdigest()


def terminal_fingerprint(terminal):
    doc = _plain_json(terminal.document)
    return sha256(encode_canonical(dict(request={k: doc[k] for k in REQUEST_KEYS},
        **{k: doc[k] for k in ('provider', 'requested_model', 'adapter_version', 'settings')}))).hexdigest()


def prepare_editor_continuation(value):
    from .editor_assistance import decode_context
    exact_fields(value, {'project_root', 'store', 'state_revision', 'parent', 'passage_numbers',
        'contexts', 'question', 'correction', 'last_conclusion', 'unresolved_issue',
        'model', 'output', 'exchange_id'}, 'continuation draft')
    store = InvestigationStore(value['store'], value['project_root'])
    store.expect(value['state_revision'])
    if store.active is not None:
        raise ValueError('This project already has one active investigation; end it explicitly first')
    exact_fields(value['parent'], {'path', 'revision'}, 'selected parent')
    parent = read_parent(local_path(value['parent']['path']))
    revision(value['parent']['revision'])
    if parent.record_revision != value['parent']['revision']:
        raise ValueError('Selected parent record changed; review it again')
    if not isinstance(value['contexts'], list) or len(value['contexts']) > 8:
        raise ValueError('At most eight current contexts can be sent')
    return prepare_continuation(value['project_root'], parent=parent,
        passage_numbers=value['passage_numbers'], contexts=[decode_context(c) for c in value['contexts']],
        question=value['question'], correction=value['correction'], last_conclusion=value['last_conclusion'],
        unresolved_issue=value['unresolved_issue'], model=value['model'],
        output=local_path(value['output']), exchange_id=value['exchange_id'])


def reserve_child(prepared, value):
    store = InvestigationStore(value['store'], value['project_root'])
    store.expect(value['state_revision'])
    if store.active is not None:
        raise ValueError('A child has already been reserved for this investigation')
    draft = prepared.continuation
    active = dict(id=prepared.id, phase='pending', parent=parent_pointer(draft.parent, draft.passages),
        child=dict(path=str(prepared.operation.output.resolve()), request_digest=prepared_fingerprint(prepared),
                   record_revision=None, id=None, response_digest=None),
        summary={k: prepared.question if k == 'question' else getattr(draft, k) for k in SUMMARY})
    return store, store.publish(active)


def bind_terminal(active, raw):
    terminal = parse_terminal_model_call(raw)
    if (terminal.document['in_reply_to'] != active['parent']['id']
            or terminal_fingerprint(terminal) != active['child']['request_digest']):
        raise ValueError('Child record does not match the reserved exact request')
    return {**active, 'phase': 'terminal', 'child': {**active['child'],
        'id': terminal.id, 'record_revision': sha256(raw).hexdigest(), 'response_digest': terminal.raw_response_digest}}


def checked_parent(active):
    saved = active['parent']; path = Path(saved['path'])
    if path.resolve() != path:
        raise ValueError('Saved parent path was redirected')
    parent = read_parent(path)
    if (parent.record_revision != saved['revision'] or parent.call.id != saved['id']
            or parent.call.raw_response_digest != saved['response_digest']):
        raise ValueError('Saved parent identity or digest changed')
    parent, passages = select_parent_passages(parent, [p['number'] for p in saved['passages']])
    if parent_pointer(parent, passages) != saved:
        raise ValueError('Saved parent passage boundaries changed')
    return parent, passages


def render_active(active):
    lines = ['Bounded investigation — private human task state',
        'Viewing creates no request, premise admission or mathematical verification.',
        'Investigation: ' + safe_terminal_text(active['id'])]
    for key, label in [('question', 'Current question (human)'), ('correction', 'Human correction / changed assumption'),
                       ('last_conclusion', 'Last useful conclusion (human)'), ('unresolved_issue', 'Unresolved issue (human)')]:
        lines.extend([label + ':', safe_terminal_text(active['summary'][key]) or '[none supplied]'])
    try:
        parent, passages = checked_parent(active)
        lines.extend(['Parent ModelCall: ' + safe_terminal_text(parent.call.id),
            'Parent record SHA-256: ' + parent.record_revision,
            'Parent response SHA-256: ' + parent.call.raw_response_digest])
        lines.extend(render_response_review(parent.call, passage_number=p.number) for p in passages)
    except (OSError, ValueError) as exc:
        lines.append('Parent record missing or changed: ' + safe_terminal_text(str(exc)))
    if active['phase'] == 'pending':
        lines.extend(['Child transmission outcome is unresolved. No automatic retry is available.',
            'Reserved record destination: ' + safe_terminal_text(active['child']['path'])])
    else:
        restored = restore_investigation(as_state(active))
        if restored.error:
            lines.append(safe_terminal_text(restored.error))
        if restored.child is not None:
            c = active['child']
            lines.extend(['Child ModelCall: ' + safe_terminal_text(c['id']),
                'Child record SHA-256: ' + c['record_revision'],
                'Child terminal status: ' + restored.child.document['status']])
            if restored.child.document['status'] == 'completed':
                from .model_projection import parse_finalized_model_call
                lines.append(render_response_review(parse_finalized_model_call(restored.child_raw), full=True))
    return '\n\n'.join(lines)


def editor_investigation_action(request):
    method = request['method']
    if method == 'investigation_parent':
        parent = read_parent(local_path(request['path']))
        if request.get('revision') is not None and request['revision'] != parent.record_revision:
            raise ValueError('Selected parent record changed; review it again')
        return {'parent': {'path': str(parent.path), 'revision': parent.record_revision},
                'body': render_response_review(parent.call)}
    store = InvestigationStore(request['store'], request['project_root'])
    if method == 'investigation_state':
        return store.result()
    store.expect(request['revision'])
    if store.active is None:
        raise ValueError('No active investigation is available')
    active = store.active
    if method == 'resume_investigation':
        if active['phase'] == 'pending':
            try:
                path = Path(active['child']['path'])
                if path.resolve() != path:
                    raise ValueError('Pending child path was redirected')
                resolved = bind_terminal(active, read_bounded(path, MAX_MODEL_CALL_BYTES, 'pending child ModelCall'))
            except (OSError, ValueError) as exc:
                return {**store.result(), 'body': render_active(active) + '\n\nPending child not reconciled: ' + safe_terminal_text(str(exc))}
            result = store.publish(resolved)
            return {**result, 'body': render_active(result['active'])}
        return {**store.result(), 'body': render_active(active)}
    if method in ('update_investigation', 'investigation_view', 'investigation_handoff'):
        active = {**active, 'summary': summary(request['summary'])}
        if method == 'investigation_handoff':
            if active['phase'] == 'terminal':
                body = investigation_handoff(as_state(active))
            else:
                body = '\n[Investigation handoff — editable human task summary]\n' + '\n'.join(
                    f'{k}: {active["summary"][k]}' for k in sorted(SUMMARY)) + (
                    '\nChild outcome unresolved; inspect ' + active['child']['path'] + '\n')
            return {**store.result(), 'body': body}
        if method == 'update_investigation':
            result = store.publish(active)
            return {**result, 'body': render_active(result['active'])}
        return {**store.result(), 'body': render_active(active)}
    if method == 'end_investigation':
        return store.publish(None)
    raise ValueError('Unknown investigation action')
