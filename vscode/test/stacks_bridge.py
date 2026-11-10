"""Test-only acquisition transport; all other bridge/core code is bundled code."""
import io
import json
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'python'))
from mrw import stacks_import
from mrw.editor_bridge import main, MAX_REQUEST_BYTES

raw = sys.stdin.buffer.read(MAX_REQUEST_BYTES + 1)
request = json.loads(raw)
sys.stdin = io.TextIOWrapper(io.BytesIO(raw), encoding='utf-8')
fixtures = root.parent / 'tests/fixtures/stacks'
commit = 'a' * 40


def transport(url, limit):
    if request['method'] != 'outline_stacks_prepare':
        raise ValueError('Offline bridge action unexpectedly attempted a download')
    if url == stacks_import.REF:
        return json.dumps({'object': {'type': 'commit', 'sha': commit}}).encode()
    prefix = stacks_import.RAW + commit + '/'
    if not url.startswith(prefix):
        raise ValueError('Unexpected fixture endpoint')
    name = url[len(prefix):]
    if name not in ('topology.tex', 'tags/tags', 'COPYING', 'preamble.tex'):
        raise ValueError('Unexpected fixture file')
    return (fixtures / ('tags' if name == 'tags/tags' else name)).read_bytes()


stacks_import.fetch = transport
raise SystemExit(main())
