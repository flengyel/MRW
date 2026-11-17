import importlib.util
from pathlib import Path
import sys
from types import ModuleType, SimpleNamespace
import unittest
from unittest.mock import patch


class NotebookProducerTests(unittest.TestCase):
    def setUp(self):
        client = ModuleType('nbclient')
        errors = ModuleType('nbclient.exceptions')
        errors.CellExecutionError = type('CellExecutionError', (Exception,), {})
        self.output_calls = []
        def output(kind, **fields):
            self.output_calls.append((kind, fields))
            return dict(output_type=kind, **fields)
        formatting = ModuleType('nbformat')
        formatting.v4 = SimpleNamespace(new_output=output)
        path = Path(__file__).resolve().parents[1] / 'examples/notebook-provenance/record_run.py'
        spec = importlib.util.spec_from_file_location('mrw_example_producer', path)
        self.producer = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, {'nbclient': client, 'nbclient.exceptions': errors, 'nbformat': formatting}):
            spec.loader.exec_module(self.producer)

    def test_stream_only_failure_keeps_the_actual_kernel_reply(self):
        diagnostic = {'output_type': 'stream', 'name': 'stderr', 'text': 'Traceback formatter failed'}
        cell = {'outputs': [diagnostic]}
        reply = {'status': 'error', 'ename': 'ValueError', 'evalue': 'polynomial must be irreducible', 'traceback': ['Actual kernel traceback']}
        self.producer.preserve_kernel_error(cell=cell, cell_index=3, execute_reply={'content': reply})
        self.assertEqual(cell['outputs'], [diagnostic, {'output_type': 'error', **{k: reply[k] for k in ('ename', 'evalue', 'traceback')}}])

    def test_an_existing_error_is_not_duplicated(self):
        error = {'output_type': 'error', 'ename': 'ValueError', 'evalue': 'original', 'traceback': ['Original']}
        cell = {'outputs': [error]}
        self.producer.preserve_kernel_error(cell=cell, cell_index=1, execute_reply={'content': {'status': 'error'}})
        self.assertEqual(cell['outputs'], [error])
        self.assertEqual(self.output_calls, [])

    def test_missing_error_fields_do_not_create_a_reported_failure(self):
        cell = {'outputs': [{'output_type': 'stream', 'name': 'stderr', 'text': 'Only a diagnostic'}]}
        before = list(cell['outputs'])
        with self.assertRaisesRegex(ValueError, 'incomplete'):
            self.producer.preserve_kernel_error(cell=cell, cell_index=1, execute_reply={'content': {'status': 'error'}})
        self.assertEqual(cell['outputs'], before)
        self.assertEqual(self.output_calls, [])


if __name__ == '__main__':
    unittest.main()
