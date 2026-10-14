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
        error = str(exc).replace(key, '[redacted]') if key else str(exc)
        draft = request.get('draft')
        output = draft.get('output') if isinstance(draft, dict) else None
        if not isinstance(output, str) or '\0' in output:
            output = None
        body = ('Mathematical assistance: not sent\n'
                'No provider request was made by this action.\n' + safe_terminal_text(error))
        return {'status': 'not_sent', 'path': output, 'body': body,
                'error': error, 'retained': False, 'revision': None}
    kwargs = {} if transport is None else {'transport': transport}
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
    return {'status': status, 'path': str(prepared.operation.output), 'body': body,
            'error': error, 'retained': terminal is not None,
            'revision': sha256(sent.raw_record).hexdigest() if terminal else None}
