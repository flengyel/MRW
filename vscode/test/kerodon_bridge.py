"""Deterministic section transport, real bundled persistence and resolver."""
import io
import json
from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'python'));sys.path.insert(0,str(root.parent/'tests'))
from test_kerodon_import import PAGE
from theorem_terminal import kerodon_import
from theorem_terminal.editor_bridge import main,MAX_REQUEST_BYTES
raw=sys.stdin.buffer.read(MAX_REQUEST_BYTES+1);request=json.loads(raw)
sys.stdin=io.TextIOWrapper(io.BytesIO(raw),encoding='utf-8')
def transport(url,limit):
    if request['method']!='outline_kerodon_prepare' or url!='https://kerodon.net/tag/0004':raise AssertionError('Unexpected acquisition')
    return PAGE.encode()
kerodon_import.fetch=transport
raise SystemExit(main())
