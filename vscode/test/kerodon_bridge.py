"""Deterministic section transport, real bundled persistence and resolver."""
import io
import json
from pathlib import Path
import sys
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'python'));sys.path.insert(0,str(root.parent/'tests'))
from test_kerodon_import import PAGE
from mrw import kerodon_import
from mrw.editor_bridge import main,MAX_REQUEST_BYTES
raw=sys.stdin.buffer.read(MAX_REQUEST_BYTES+1);request=json.loads(raw)
sys.stdin=io.TextIOWrapper(io.BytesIO(raw),encoding='utf-8')
def transport(url,limit):
    if request['method'] not in ('outline_kerodon_prepare','outline_source_prepare') or url!='https://kerodon.net/tag/0004':raise AssertionError('Unexpected acquisition')
    return PAGE.encode()
kerodon_import.fetch=transport
from mrw import source_records
original_prepare=source_records.prepare
source_records.prepare=lambda request:original_prepare(request,downloader=transport)
raise SystemExit(main())
