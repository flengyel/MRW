"""Host-test launcher only: the production bridge with an injected transport.

Never packaged. No credential is read and any attempted socket connection fails.
"""
import json
import os
from pathlib import Path
import socket
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'python'))
from mrw import editor_bridge, editor_assistance
from mrw.openai_response import TransportResult

artifacts = Path(sys.argv[1])
scenario = sys.argv[2]
os.environ.pop('OPENAI_API_KEY', None)

def forbidden(*args, **kwargs):
    raise AssertionError('Host checks must never connect to a network')

socket.create_connection = forbidden
socket.socket.connect = forbidden
socket.socket.connect_ex = forbidden

def transport(method, endpoint, body, headers, timeout, limit):
    # Deliberate delay lets the host exercise duplicate Send and concurrent edits.
    with (artifacts / 'transport.jsonl').open('a') as log:
        log.write(json.dumps({'scenario': scenario, 'body': body.decode('utf-8')}) + '\n')
    time.sleep(0.4)
    if scenario == 'failed':
        raise OSError('Deterministic transport failure')
    response = {'object': 'response', 'id': 'resp-host-fixture', 'status': 'completed',
                'model': 'host-test-resolved', 'output': []}
    if scenario == 'incomplete':
        response['status'] = 'incomplete'
    else:
        content = ({'type': 'refusal', 'refusal': 'Deterministic refusal'}
                   if scenario == 'refused' else
                   {'type': 'output_text', 'text': 'First α → β.\n\nSecond 😀.\n<script>inert</script> https://example.invalid/\n', 'annotations': []})
        response['output'] = [{'type': 'message', 'role': 'assistant',
                               'status': 'completed', 'content': [content]}]
    return TransportResult(200, json.dumps(response).encode())

original = editor_assistance.assistance_action
def action(request):
    if scenario != 'not_sent':
        os.environ['OPENAI_API_KEY'] = 'synthetic-host-test-key'
    return original(request, transport=transport)

editor_bridge.assistance_action = action
raise SystemExit(editor_bridge.main())
