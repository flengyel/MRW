"""Actual-host guard: unchanged reader bridge, no network or child tool calls."""
import os
from pathlib import Path
import socket
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'python'))
from mrw import editor_bridge

os.environ.pop('OPENAI_API_KEY', None)

def forbidden(*args, **kwargs):
    raise AssertionError('Offline outline validation forbids network and compiler/provider subprocesses')

socket.create_connection = forbidden
socket.socket.connect = forbidden
socket.socket.connect_ex = forbidden
subprocess.Popen = forbidden
if '--fail-publication' in sys.argv:
    from mrw import source_outlines
    def fail_publication(*args, **kwargs):
        raise OSError('Injected pre-replacement publication failure in actual host check')
    source_outlines.save_mutable = fail_publication
# -I removes the script directory; load only this adjacent test helper.
import importlib.util
spec=importlib.util.spec_from_file_location('mrw_test_fixture',Path(__file__).with_name('bridge_fixture.py'))
fixture=importlib.util.module_from_spec(spec);spec.loader.exec_module(fixture)
dispatch=editor_bridge.dispatch
def scoped(request):
    fixture.validate(request, None)
    return dispatch(request)
editor_bridge.dispatch=scoped
raise SystemExit(editor_bridge.main())
