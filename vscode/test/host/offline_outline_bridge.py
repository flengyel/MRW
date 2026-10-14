"""Actual-host guard: unchanged reader bridge, no network or child tool calls."""
import os
from pathlib import Path
import socket
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'python'))
from theorem_terminal import editor_bridge

os.environ.pop('OPENAI_API_KEY', None)

def forbidden(*args, **kwargs):
    raise AssertionError('Offline outline validation forbids network and compiler/provider subprocesses')

socket.create_connection = forbidden
socket.socket.connect = forbidden
socket.socket.connect_ex = forbidden
subprocess.Popen = forbidden
raise SystemExit(editor_bridge.main())
