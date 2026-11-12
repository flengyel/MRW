import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from uuid import uuid4
from zipfile import ZipFile
from io import BytesIO

from mrw.editor_bridge import dispatch
from mrw import notebook_results as n


class NotebookResultsTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name); self.store = self.root / 'private'
        self.file = self.root / 'work.ipynb'; self.note = self.root / 'why.md'
        self.note.write_text('# Basis choice\nExact mathematical explanation.\n')
        self.nb = {'nbformat': 4, 'metadata': {}, 'cells': [
            {'cell_type': 'markdown', 'source': '# Discriminant'},
            {'cell_type': 'code', 'source': 'print(5)', 'outputs': [{'output_type': 'stream', 'name': 'stdout', 'text': '5\n'}]}]}
        self.write()

    def write(self):
        self.file.write_bytes(n.canonical(self.nb))

    def call(self, method, **kw):
        return dispatch({'protocol': 1, 'method': 'notebook_' + method, 'store': str(self.store), **kw})

    def retain(self):
        return self.call('retain', paths=[str(self.file), str(self.note)])

    def report(self, failed=False):
        if failed:
            self.nb['cells'][1]['outputs'] = [{'output_type': 'error', 'ename': 'ValueError', 'evalue': 'reducible polynomial'}]
        code, outputs = n.execution_parts(self.nb)
        self.nb['metadata']['mrw_execution'] = {'schema': 'mrw-notebook-run:1', 'id': str(uuid4()), 'producer': 'Fixture producer',
            'started': '2026-11-12T12:00:00Z', 'ended': '2026-11-12T12:00:01Z', 'outcome': 'failed' if failed else 'completed',
            'code_sha256': n.digest(n.canonical(code)), 'outputs_sha256': n.digest(n.canonical(outputs)), 'environment': {'kernel': 'fixture'}}
        self.write()

    def test_exact_bytes_independent_reopen_and_no_implicit_execution_claim(self):
        original = self.file.read_bytes(); first = self.retain(); second = self.retain()
        self.assertNotEqual(first['id'], second['id'])
        self.file.write_text('changed'); self.note.unlink()
        result = self.call('read', id=first['id'])
        self.assertIn(n.UNKNOWN, result['body']); self.assertIn('5\n', result['body'])
        self.assertIn('Exact mathematical explanation', self.call('companion', id=first['id'], index=1)['body'])
        record = n.load(self.store, first['id']); self.assertEqual(n.unpack(record['artifacts'][0]), original)
        self.assertEqual(len(self.call('list')['results']), 2)
        raw, manifest = n.export_records([record])
        self.assertEqual(len(manifest['bundles']), 1)
        self.assertNotIn(str(self.root), raw.decode('latin1'))

    def test_reported_runs_and_failed_run_export_separate_named_accounts(self):
        self.report(); a = self.retain(); self.report(True); b = self.retain()
        dest = self.root / 'results.zip'
        response = self.call('export', ids=[a['id'], b['id']], destination=str(dest))
        self.assertEqual(response['sha256'], n.digest(dest.read_bytes()))
        with ZipFile(dest) as z:
            manifest = json.loads(z.read('manifest.json')); self.assertEqual(len(manifest['bundles']), 4)
            for item in manifest['files']:
                self.assertEqual(n.digest(z.read(item['file'])), item['sha256'])
            capture = z.read(a['id'] + '/capture.ttl').decode()
            execution = z.read(a['id'] + '/execution-reported.ttl').decode()
            self.assertIn(':capture> prov:used <urn:mrw:result:', capture)
            self.assertIn('prov:wasGeneratedBy <urn:mrw:run:', execution)
            self.assertNotIn('wasDerivedFrom', execution)
            self.assertNotIn('prov:used', z.read(a['id'] + '/result.txt').decode())
            self.assertIn('producer-reported', json.dumps(manifest))
            self.assertIn('ValueError: reducible polynomial', z.read(b['id'] + '/result.txt').decode())
        with self.assertRaises(ValueError):
            self.call('export', ids=[a['id']], destination=str(dest))

    def test_jupyter_serialized_lines_match_the_execution_receipt(self):
        self.nb['cells'][1]['source'] = ['print(', '5)']
        self.nb['cells'][1]['outputs'][0]['text'] = ['5', '\n']
        self.report(); a = self.retain()
        self.assertIn('producer-reported completed', a['evidence'])
        self.assertIn('print(5)', self.call('read', id=a['id'])['body'])

    def test_stale_report_rejected_without_publication(self):
        self.report(); self.nb['cells'][1]['source'] = 'print(20)'; self.write()
        with self.assertRaisesRegex(ValueError, 'changed after'):
            self.retain()
        self.assertFalse(list(self.store.glob('*.json')))

    def test_error_and_time_validation(self):
        self.report(True); self.nb['metadata']['mrw_execution']['outcome'] = 'completed'; self.write()
        with self.assertRaisesRegex(ValueError, 'outcome'):
            self.retain()
        self.nb['metadata']['mrw_execution']['ended'] = '2026-11-11T00:00:00Z'; self.write()
        with self.assertRaisesRegex(ValueError, 'before'):
            self.retain()

    def test_interrupted_capture_is_absent_or_complete(self):
        with patch.object(n, 'persist_private_new', side_effect=OSError('disk full')):
            with self.assertRaises(OSError):
                self.retain()
        self.assertEqual(self.call('list')['results'], [])
        original = n.persist_private_new
        def fail_after(path, raw):
            original(path, raw); raise OSError('post-publication durability uncertainty')
        with patch.object(n, 'persist_private_new', side_effect=fail_after):
            with self.assertRaises(OSError):
                self.retain()
        results = self.call('list')['results']; self.assertEqual(len(results), 1)
        self.assertIn('print(5)', self.call('read', id=results[0]['id'])['body'])

    def test_delete_restart_recovers_and_never_resurrects_or_removes_sources(self):
        a = self.retain(); b = self.retain(); retained = (self.store / (a['id'] + '.json')).read_bytes()
        with patch.object(n, 'delete_mutable', side_effect=OSError('interrupted unlink')):
            with self.assertRaises(OSError):
                self.call('delete', id=a['id'])
        # A separate bridge invocation recovers the pending deletion.
        self.assertEqual([x['id'] for x in self.call('list')['results']], [b['id']])
        self.assertTrue(self.file.exists()); self.assertTrue(self.note.exists())
        self.assertFalse((self.store / (a['id'] + '.json')).exists())
        with self.assertRaisesRegex(ValueError, 'deleted'):
            self.call('read', id=a['id'])
        # Even a stale copied record cannot override the durable marker.
        (self.store / (a['id'] + '.json')).write_bytes(retained)
        self.assertEqual([x['id'] for x in self.call('list')['results']], [b['id']])
        marker = (self.store / (a['id'] + '.deleted.json')).read_text()
        self.assertNotIn('Discriminant', marker); self.assertNotIn('print', marker)
        with patch.object(n, 'uuid4', return_value=a['id']):
            with self.assertRaisesRegex(ValueError, 'cannot be reused'):
                self.retain()

    def test_failed_marker_write_keeps_record_and_changed_record_stops_recovery(self):
        a = self.retain()
        with patch.object(n, 'persist_private_new', side_effect=OSError('disk full')):
            with self.assertRaises(OSError):
                self.call('delete', id=a['id'])
        self.assertEqual(self.call('read', id=a['id'])['id'], a['id'])
        with patch.object(n, 'delete_mutable', side_effect=OSError('interrupted unlink')):
            with self.assertRaises(OSError):
                self.call('delete', id=a['id'])
        (self.store / (a['id'] + '.json')).write_text('unexpected data')
        with self.assertRaisesRegex(ValueError, 'unexpected bytes'):
            self.call('list')

    def test_file_race_integrity_and_path_rejection(self):
        original = n.read_bounded; count = 0
        def racing(path, limit, description):
            nonlocal count
            if path == self.file:
                count += 1
                if count == 2:
                    return b'changed'
            return original(path, limit, description)
        with patch.object(n, 'read_bounded', side_effect=racing):
            with self.assertRaisesRegex(ValueError, 'changed during'):
                self.retain()
        a = self.retain()
        for key in ['../work', 'not-a-uuid']:
            with self.assertRaises(ValueError):
                self.call('read', id=key)
        path = self.store / (a['id'] + '.json'); data = json.loads(path.read_bytes()); data['artifacts'][0]['data'] = 'YQ=='
        path.write_bytes(n.canonical(data))
        with self.assertRaisesRegex(ValueError, 'digest'):
            self.call('read', id=a['id'])
        link = self.root / 'link.ipynb'; link.symlink_to(self.file)
        with self.assertRaises(ValueError):
            self.call('retain', paths=[str(link)])

    def test_rich_output_preserved_without_rendering_active_content(self):
        self.nb['cells'][1]['outputs'] = [{'output_type': 'display_data', 'data': {'text/html': '<script>evil()</script>', 'image/png': 'YQ=='}}]
        self.write(); a = self.retain(); body = self.call('read', id=a['id'])['body']
        self.assertNotIn('<script>', body); self.assertIn('image/png', body)
        self.assertIn(b'<script>', n.unpack(n.load(self.store, a['id'])['artifacts'][0]))


if __name__ == '__main__':
    unittest.main()
