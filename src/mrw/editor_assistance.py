"""Editor protocol for explicit preview and Send; no persistent draft state."""
from dataclasses import fields
from hashlib import sha256
import os
import re

from .assistance_actions import (AssistanceContext, prepare_assistance,
                                 transmit_assistance, terminal_matches)
from .model_projection import parse_terminal_model_call
from .response_review import safe_terminal_text
from .workspace import selection_span


# The shared immutable publisher requires descriptor-relative POSIX operations.
# Reject unsupported hosts before the irreversible provider request.
POSIX_PUBLICATION_SUPPORTED = os.name == 'posix'


def _not_sent(exc, request, key):
    error = str(exc).replace(key, '[redacted]') if key else str(exc)
    draft = request.get('draft')
    output = draft.get('output') if isinstance(draft, dict) else None
    if not isinstance(output, str) or '\0' in output:
        output = None
    return {'status': 'not_sent', 'path': output,
            'body': 'Mathematical assistance: not sent\nNo provider request was made by this action.\n' + safe_terminal_text(error),
            'error': error, 'retained': False, 'revision': None}


def decode_context(value):
    names = {f.name for f in fields(AssistanceContext)}
    if not isinstance(value, dict) or set(value) != names:
        raise ValueError('Invalid selected context fields')
    for name in names - {'source_path', 'saved_revision'}:
        if not isinstance(value[name], str) or not value[name] or '\0' in value[name]:
            raise ValueError('Invalid selected context')
        value[name].encode('utf-8', errors='strict')
    if value['source_path'] is not None and (not isinstance(value['source_path'], str)
            or not os.path.isabs(value['source_path']) or '\0' in value['source_path']):
        raise ValueError('Invalid source path')
    for name in ('source_revision', 'saved_revision'):
        if value[name] is None and name == 'saved_revision':
            continue
        if not isinstance(value[name], str) or re.fullmatch('[0-9a-f]{64}', value[name]) is None:
            raise ValueError('Invalid context revision')
    selection_span(value['start'], value['end'])
    return AssistanceContext(**value)


def prepare_editor_assistance(value):
    if isinstance(value, dict) and 'parent' in value:
        from .editor_investigation import prepare_editor_continuation
        return prepare_editor_continuation(value)
    if not isinstance(value, dict) or set(value) != {
        'project_root', 'target', 'contexts', 'question', 'model', 'output', 'exchange_id'
    }:
        raise ValueError('Invalid assistance draft')
    for name in ('project_root', 'output'):
        if not isinstance(value[name], str) or not os.path.isabs(value[name]) or '\0' in value[name]:
            raise ValueError('An absolute local path is required')
    if not isinstance(value['contexts'], list) or len(value['contexts']) > 8:
        raise ValueError('At most eight selected contexts can be sent')
    return prepare_assistance(
        value['project_root'], target=decode_context(value['target']),
        contexts=[decode_context(c) for c in value['contexts']], question=value['question'],
        model=value['model'], output=value['output'], exchange_id=value['exchange_id'],
    )


def assistance_action(request, *, transport=None):
    if request['method'] == 'prepare_assistance':
        prepared = prepare_editor_assistance(request['draft'])
        return {'preview': prepared.preview}
    key = os.environ.get('OPENAI_API_KEY', '')
    try:
        prepared = prepare_editor_assistance(request['draft'])
        if request['preview'] != prepared.preview:
            raise ValueError('Frozen request changed after preview; prepare it again')
        if request['confirmation'] != 'SEND':
            raise ValueError('The separate Send exact preview action is required')
        if not key:
            raise ValueError('OPENAI_API_KEY is not configured on the extension host')
        if not POSIX_PUBLICATION_SUPPORTED:
            raise ValueError('Assistance retention requires a POSIX host; use Remote WSL on Windows')
    except (ValueError, OSError, TypeError, KeyError) as exc:
        # Only preflight is inside this block. A transport/publication failure
        # must never be reported as proof that nothing was sent.
        return _not_sent(exc, request, key)
    kwargs = {} if transport is None else {'transport': transport}
    investigation_store = None
    if prepared.continuation is not None:
        from .editor_investigation import reserve_child
        try:
            investigation_store, reservation = reserve_child(prepared, request['draft'])
        except (ValueError, OSError, TypeError, KeyError) as exc:
            return _not_sent(exc, request, key)
        if reservation.get('blocked'):
            return dict(status='not_sent', retained=False, path=str(prepared.operation.output),
                revision=None, body='Request not sent: investigation reservation failed.',
                investigation=reservation)
    from .artifact_context import CURRENT
    context=CURRENT.get()
    if context is not None and context.identity is not None:
        try:
            prepared, investigation_store=context.manager.before_transmission(context,prepared,investigation_store)
        except (ValueError,OSError) as exc:
            result=_not_sent(exc,request,key)
            if investigation_store is not None: result['investigation']=investigation_store.result()
            return result
    sent = transmit_assistance(prepared, key, **kwargs)
    terminal = parse_terminal_model_call(sent.raw_record) if sent.raw_record else None
    if terminal and not terminal_matches(prepared, terminal):
        raise ValueError('Retained ModelCall does not match the sent preview')
    status = terminal.document['status'] if terminal else 'unretained'
    # No raw response or secret is placed in diagnostics. Completed content is
    # opened separately using the existing validated, safe response review.
    error = sent.error.replace(key, '[redacted]') if sent.error else None
    body = f'Mathematical assistance: {status}\nRecord: {prepared.operation.output}'
    if error:
        body += '\n' + safe_terminal_text(error)
    if status == 'unretained':
        body += '\nNo matching terminal record was recovered. Do not assume the request was unsent.'
    result = {'status': status, 'path': str(prepared.operation.output), 'body': body,
            'error': error, 'retained': terminal is not None,
            'revision': sha256(sent.raw_record).hexdigest() if terminal else None}
    if investigation_store is not None:
        from .editor_investigation import bind_terminal
        if terminal is not None:
            result['investigation'] = investigation_store.publish(
                bind_terminal(investigation_store.active, sent.raw_record))
        else:
            result['investigation'] = investigation_store.result()
    return result
