#!/usr/bin/env python3
"""Explicitly execute a trusted notebook in a fresh kernel and save its receipt.

Requires nbclient/nbformat in the producer environment. GOLEM XIV never imports
or invokes this script. Refuses to overwrite either input or output files.
"""
import argparse
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import platform
from uuid import uuid4
import nbclient
import nbformat
from nbclient.exceptions import CellExecutionError


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False).encode('utf-8')


def now():
    return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')



def preserve_kernel_error(*, cell, cell_index, execute_reply):
    # The execute reply can report failure even when the kernel's traceback
    # formatter emitted only streams. Preserve that actual reply as notebook data.
    if any(output.get('output_type') == 'error' for output in cell['outputs']):
        return
    content = execute_reply['content']
    name, value, lines = content.get('ename'), content.get('evalue'), content.get('traceback')
    if content.get('status') != 'error' or not isinstance(name, str) or not isinstance(value, str) or not isinstance(lines, list) or not all(isinstance(line, str) for line in lines):
        raise ValueError('Kernel error reply is incomplete; no execution receipt was created')
    cell['outputs'].append(nbformat.v4.new_output('error', ename=name, evalue=value, traceback=lines))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', type=Path)
    parser.add_argument('output', type=Path)
    parser.add_argument('--kernel', default='sagemath')
    args = parser.parse_args()
    if args.output.exists():
        parser.error('Output already exists; choose another filename')
    nb = nbformat.read(args.input, as_version=4)
    nb.metadata.pop('mrw_execution', None)
    for cell in nb.cells:
        if cell.cell_type == 'code':
            cell.outputs = []; cell.execution_count = None
    started = now(); outcome = 'completed'
    try:
        nbclient.NotebookClient(nb, timeout=120, kernel_name=args.kernel,
                               force_raise_errors=True, on_cell_error=preserve_kernel_error,
                               resources={'metadata': {'path': str(args.input.parent.resolve())}}).execute()
    except CellExecutionError:
        outcome = 'failed'
    # Startup, transport and timeout errors are not silently called completed runs.
    # nbformat serializes multiline output strings as arrays. Hash the bytes'
    # JSON representation, not the transient in-memory NotebookNode form.
    saved = json.loads(nbformat.writes(nb))
    cells = [c for c in saved['cells'] if c['cell_type'] == 'code']
    saved['metadata']['mrw_execution'] = {
        'schema': 'mrw-notebook-run:1', 'id': str(uuid4()),
        'producer': 'MRW example runner using nbclient', 'started': started, 'ended': now(),
        'outcome': outcome,
        'code_sha256': sha256(canonical([''.join(c['source']) if isinstance(c['source'], list) else c['source'] for c in cells])).hexdigest(),
        'outputs_sha256': sha256(canonical([c['outputs'] for c in cells])).hexdigest(),
        'environment': {'python': platform.python_version(), 'nbclient': nbclient.__version__,
                        'nbformat': nbformat.__version__, 'kernel': args.kernel,
                        'kernel_language_version': str(nb.metadata.get('language_info', {}).get('version', 'unknown'))}}
    raw = json.dumps(saved, ensure_ascii=False, indent=2, allow_nan=False).encode('utf-8')
    with args.output.open('xb') as output:
        output.write(raw)
    print(json.dumps({'file': args.output.name, 'run': saved['metadata']['mrw_execution']['id'], 'outcome': outcome, 'sha256': sha256(raw).hexdigest()}))
    return 0 if outcome == 'completed' else 1


if __name__ == '__main__':
    raise SystemExit(main())
