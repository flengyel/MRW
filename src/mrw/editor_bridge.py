"""One explicit editor action per bounded JSON request on standard input.

Run through the extension's isolated launcher. No daemon, executable project
configuration, Qt controller, or Lean process is involved. Only the explicit
Send action can invoke the existing model adapter.
"""

from dataclasses import asdict
import json
from pathlib import Path
import re
import sys

from .editor_assistance import assistance_action
from .editor_investigation import editor_investigation_action
from .source_outlines import outline_action
from .outline_references import reference_action, parse_reference, assistance_context_action
from .outline_notes import note_action
from .record_actions import call_passage, persist_call_passage, attributed_contribution
from .record_views import inspect_record, read_call_snapshot
from .response_review import render_response_review
from .workspace import strict_json

PROTOCOL = 1
MAX_REQUEST_BYTES = 4 * 1024 * 1024
MAX_REPLY_BYTES = 64 * 1024 * 1024


def _path(value):
    if not isinstance(value, str) or not value or '\0' in value:
        raise ValueError('An absolute local path is required')
    path = Path(value)
    if not path.is_absolute():
        raise ValueError('An absolute local path is required')
    return path


def _revision(value):
    if not isinstance(value, str) or re.fullmatch('[0-9a-f]{64}', value) is None:
        raise ValueError('The reviewed record revision is required')
    return value


def _number(value):
    if type(value) is not int or value < 1:
        raise ValueError('Passage or index number must be a positive integer')
    return value


def dispatch(request):
    if isinstance(request, dict) and 'artifact_home' in request:
        from .artifact_storage import ArtifactStorage, storage_action
        if type(request.get('protocol')) is not int or request.get('protocol') != PROTOCOL:
            raise ValueError('Unsupported editor bridge protocol')
        if str(request.get('method', '')).startswith('artifact_'):
            return storage_action(request)
        request = dict(request)
        manager = ArtifactStorage(str(_path(request.pop('artifact_home'))))
        with manager.exclusive():
            return manager.run(request, _dispatch)
    return _dispatch(request)


def _dispatch(request):
    if not isinstance(request, dict) or type(request.get('protocol')) is not int or request['protocol'] != PROTOCOL:
        raise ValueError('Unsupported editor bridge protocol')
    method = request.get('method')
    fields = {
        'prepare_assistance': ({'draft'}, set()),
        'send_assistance': ({'draft', 'preview', 'confirmation'}, set()),
        'inspect': ({'path', 'format'}, {'companion', 'revision'}),
        'review': ({'path', 'mode', 'number'}, {'revision'}),
        'contribution': ({'path', 'number', 'revision'}, set()),
        'project': ({'path', 'number', 'revision', 'destination'}, set()),
        'proof_graph': ({'graph', 'hidden'}, set()),
        'proof_graph_parse': ({'text'}, set()),
        'study_questions_parse': ({'text', 'sources'}, set()),
        'investigation_parent': ({'path'}, {'revision'}),
        'investigation_state': ({'store', 'project_root'}, set()),
        'resume_investigation': ({'store', 'project_root', 'revision'}, set()),
        'update_investigation': ({'store', 'project_root', 'revision', 'summary'}, set()),
        'investigation_view': ({'store', 'project_root', 'revision', 'summary'}, set()),
        'investigation_handoff': ({'store', 'project_root', 'revision', 'summary'}, set()),
        'end_investigation': ({'store', 'project_root', 'revision'}, set()),
        'outline_list': ({'store', 'project_root'}, set()),
        'outline_create': ({'store', 'project_root', 'path', 'source_revision'}, set()),
        'outline_import_note': ({'store', 'project_root', 'path', 'source_revision'}, set()),
        'outline_load': ({'store', 'project_root', 'id'}, set()),
        'outline_reference': ({'store', 'project_root', 'id', 'revision', 'region'}, set()),
        'outline_reference_identities': ({'store', 'project_root', 'references'}, set()),
        'outline_parse_reference': ({'reference'}, set()),
        'outline_follow_reference': ({'store', 'project_root', 'reference'}, set()),
        'outline_assistance_context': ({'store', 'project_root', 'reference'}, set()),
        'outline_notes': ({'store', 'project_root', 'id'}, {'reference'}),
        'outline_update_note': ({'store', 'project_root', 'id', 'revision', 'change'}, set()),
        'outline_mutate': ({'store', 'project_root', 'id', 'revision', 'change'}, set()),
        'outline_inspect_artifact': ({'path'}, set()),
        'outline_attach': ({'store', 'project_root', 'id', 'revision', 'path', 'artifact_revision',
                            'kind', 'label', 'region', 'selector'}, set()),
        'outline_document': ({'store', 'project_root', 'id', 'revision', 'artifact'}, set()),
        'outline_navigation': ({'store', 'project_root', 'id', 'revision', 'region', 'context', 'statement'}, set()),
        'outline_kerodon_prepare': ({'store', 'project_root', 'input'}, set()),
        'outline_kerodon_import': ({'store', 'project_root', 'ticket', 'packet'}, set()),
        'outline_kerodon_reference': ({'store', 'project_root', 'id', 'revision', 'tag'}, set()),
        'outline_stacks_prepare': ({'store', 'project_root', 'input'}, set()),
        'outline_stacks_import': ({'store', 'project_root', 'ticket', 'packet'}, set()),
        'outline_stacks_reference': ({'store', 'project_root', 'id', 'revision', 'tag'}, set()),
        'outline_render_diagram': ({'store', 'project_root', 'id', 'revision', 'annotation', 'code'}, set()),
        'document_render_diagram': ({'code'}, set()),
    }
    if not isinstance(method, str) or method not in fields:
        raise ValueError('Unknown editor action')
    required, optional = fields[method]
    required = required | {'protocol', 'method'}
    if not required <= request.keys() or request.keys() - required - optional:
        raise ValueError('Invalid editor action fields')
    if method in ('prepare_assistance', 'send_assistance'):
        return assistance_action(request)
    if method == 'proof_graph':
        from .proof_graph import graph_action
        return graph_action(request)
    if method == 'proof_graph_parse':
        from .proof_graph import graph_action, MAX_BYTES
        raw = request['text']
        if not isinstance(raw, str) or len(raw.encode('utf-8')) > MAX_BYTES:
            raise ValueError('Proof outline exceeds 512 KiB')
        return graph_action({'graph': strict_json(raw.encode('utf-8')), 'hidden': []})
    if method == 'study_questions_parse':
        from .study_questions import validate_questions
        raw = request['text']
        if not isinstance(raw, str) or len(raw.encode('utf-8')) > 256 * 1024:
            raise ValueError('Questions exceed 256 KiB')
        return validate_questions(strict_json(raw.encode('utf-8')), request['sources'])
    if method == 'outline_reference_identities':
        from .outline_references import reference_identities
        return reference_identities(request)
    if method == 'outline_parse_reference':
        return parse_reference(request['reference'])
    if method in ('outline_reference', 'outline_follow_reference'):
        return reference_action(request)
    if method == 'outline_assistance_context':
        return assistance_context_action(request)
    if method in ('outline_notes', 'outline_update_note'):
        return note_action(request)
    if method.startswith('outline_kerodon_'):
        from .kerodon_import import kerodon_action
        return kerodon_action(request)
    if method.startswith('outline_stacks_'):
        from .stacks_import import stacks_action
        return stacks_action(request)
    if method == 'outline_render_diagram':
        from .reader_diagrams import diagram_action
        return diagram_action(request)
    if method == 'document_render_diagram':
        from .reader_diagrams import compile_tikz, dark_view
        import base64
        svg, _ = compile_tikz(request['code'])
        return {name: 'data:image/svg+xml;base64,' + base64.b64encode(raw).decode('ascii')
                for name, raw in (('light', svg), ('dark', dark_view(svg)))}
    if method.startswith('outline_'):
        return outline_action(request)
    if method in ('investigation_parent', 'investigation_state', 'resume_investigation',
                  'update_investigation', 'investigation_view', 'investigation_handoff',
                  'end_investigation'):
        return editor_investigation_action(request)
    path = _path(request['path'])
    if method == 'inspect':
        format = request['format']
        if format not in ('model_call', 'terminal_call', 'projection', 'verification', 'documentary_package'):
            raise ValueError('Unsupported retained record format')
        companion = _path(request['companion']) if 'companion' in request else None
        result = inspect_record(path, format, companion)
        if 'revision' in request and result.revision != _revision(request['revision']):
            raise ValueError('Retained record changed since inspection; open it again')
        return asdict(result)
    number = _number(request['number'])
    if method == 'review':
        mode = request['mode']
        if mode not in ('index', 'passage', 'full'):
            raise ValueError('Unsupported review mode')
        snapshot, call = read_call_snapshot(path)
        if 'revision' in request and snapshot.revision != _revision(request['revision']):
            raise ValueError('ModelCall changed since review; open it again')
        selectors = {'full': True} if mode == 'full' else {
            'index_start' if mode == 'index' else 'passage_number': number,
        }
        return {'body': render_response_review(call, **selectors), 'revision': snapshot.revision}
    revision = _revision(request['revision'])
    snapshot, call, selected, exact = call_passage(path, number, expected_revision=revision)
    if method == 'contribution':
        return {'body': attributed_contribution(call, selected, exact), 'revision': snapshot.revision}
    destination = _path(request['destination'])
    persist_call_passage(call, number, destination)
    return {'path': str(destination), 'revision': snapshot.revision}


def main():
    try:
        raw = sys.stdin.buffer.read(MAX_REQUEST_BYTES + 1)
        if len(raw) > MAX_REQUEST_BYTES:
            raise ValueError('Editor request exceeds its byte limit')
        result = dispatch(strict_json(raw))
        reply = {'protocol': PROTOCOL, 'ok': True, 'result': result}
        code = 0
    except (ValueError, OSError, TypeError, KeyError) as exc:
        reply = {'protocol': PROTOCOL, 'ok': False, 'error': str(exc)[:2000]}
        code = 1
    encoded = json.dumps(reply, ensure_ascii=True, allow_nan=False).encode('utf-8')
    if len(encoded) > MAX_REPLY_BYTES:
        encoded = b'{"protocol":1,"ok":false,"error":"Editor reply exceeds its byte limit"}'
        code = 1
    sys.stdout.buffer.write(encoded + b'\n')
    return code


if __name__ == '__main__':
    raise SystemExit(main())
