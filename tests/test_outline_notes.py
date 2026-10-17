"""External note associations retain exact targets and publish only private links."""
from hashlib import sha256
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from theorem_terminal.editor_bridge import dispatch
from theorem_terminal.outline_notes import obsidian_url


class OutlineNoteTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory(); self.addCleanup(tmp.cleanup)
        self.home = Path(tmp.name); self.root = self.home / 'Math α'; self.root.mkdir()
        self.source = self.root / 'Book 😀.txt'; self.source.write_bytes('α😀\r\nClaim.\nProof.\n'.encode())
        self.base = dict(store=str(self.home / 'private'), project_root=str(self.root))
        self.saved = self.call('outline_create', path=str(self.source), source_revision=sha256(self.source.read_bytes()).hexdigest())
        self.identifier = self.saved['outline']['id']
        self.saved = self.call('outline_mutate', id=self.identifier, revision=self.saved['revision'], change=dict(kind='add_region', start=[0, 0], end=[1, 5]))
        self.region = self.saved['outline']['regions'][0]['id']
        self.ref = self.call('outline_reference', id=self.identifier, revision=self.saved['revision'], region=self.region)['reference']
        self.url = 'obsidian://open?vault=Existing%20α&file=Math202610170001'

    def call(self, method, **extra):
        return dispatch(dict(protocol=1, method=method, **self.base, **extra))

    def notes(self):
        return self.call('outline_notes', id=self.identifier)

    def update(self, previous, identifier=None, url='default', label='Existing note', reference=None):
        return self.call('outline_update_note', id=self.identifier, revision=previous['revision'],
                         change=dict(id=identifier, reference=reference or self.ref,
                                     url=self.url if url == 'default' else url, label=label))

    def inventory(self):
        return {str(p): p.read_bytes() for p in self.home.rglob('*') if p.is_file()}

    def test_empty_view_is_read_only_and_create_replace_remove_preserves_all_source_work(self):
        before = self.inventory(); empty = self.notes()
        self.assertEqual(empty, dict(links=[], revision=None)); self.assertEqual(before, self.inventory())
        one = self.update(empty); link = one['links'][0]
        two = self.update(one, link['id'], url='obsidian://open?vault=Existing%20α&file=Other', label='Other')
        self.assertEqual(two['links'][0]['id'], link['id'])
        self.assertEqual(self.notes(), two)
        removed = self.update(two, link['id'], url=None, label=None)
        self.assertEqual(removed['links'], [])
        for name, raw in before.items(): self.assertEqual(Path(name).read_bytes(), raw)
        path = Path(self.base['store'])/self.identifier/'obsidian-links.json'
        self.assertEqual(path.stat().st_mode & 0o777, 0o600)

    def test_multiple_notes_and_stale_revision_or_missing_association_rejected(self):
        first = self.update(self.notes()); second = self.update(first, label='Second')
        self.assertEqual(len(second['links']), 2)
        before = self.inventory()
        with self.assertRaisesRegex(ValueError, 'changed'): self.update(first)
        with self.assertRaisesRegex(ValueError, 'missing'): self.update(second, '12345678-1234-1234-1234-123456789abc')
        self.assertEqual(before, self.inventory())

    def test_note_remains_on_original_pinned_range_after_region_change_and_missing_original(self):
        linked = self.update(self.notes())
        self.call('outline_mutate', id=self.identifier, revision=self.saved['revision'], change=dict(kind='replace_region', region=self.region, start=[2,0], end=[2,6]))
        self.source.unlink()
        before = self.inventory()
        followed = self.call('outline_follow_reference', reference=self.ref)
        self.assertEqual(followed['reference']['status'], 'changed or removed')
        self.assertEqual(followed['document']['start'], [0,0]); self.assertEqual(followed['document']['end'], [1,5])
        self.assertEqual(self.notes(), linked); self.assertEqual(before, self.inventory())

    def test_wrong_scope_invalid_range_and_other_outline_never_publish(self):
        previous = self.notes(); before = self.inventory()
        for ref in [self.ref.replace(self.ref.split('/')[1], '0'*64), self.ref+'?run=x', self.ref.replace('/1.0-2.5', '/1.0-99.0')]:
            with self.assertRaises(ValueError): self.update(previous, reference=ref)
        self.assertEqual(before, self.inventory())

    def test_publication_failure_blocks_without_touching_retained_or_reader_bytes(self):
        previous = self.notes(); before = self.inventory()
        with patch('theorem_terminal.outline_notes.save_mutable', side_effect=OSError('injected directory sync')):
            failed = self.update(previous)
        self.assertTrue(failed['blocked']); self.assertIn('sync', failed['write_error'])
        self.assertEqual(before, self.inventory())

    def test_uri_allowlist_and_encoding(self):
        self.assertEqual(obsidian_url('obsidian://open?vault=A%20%CE%B1&file=Folder%2FMath%20%25%26'),
                         'obsidian://open?vault=A%20%CE%B1&file=Folder%2FMath%20%25%26')
        for value in ['command:evil', 'obsidian://new?vault=A&file=B', self.url+'&append=x', self.url+'&overwrite=true',
                      self.url+'&content=x', self.url+'&x-success=command:evil', self.url+'&file=Other', self.url+'#fragment',
                      'obsidian://open?path=C%3A%5CNotes%5Cx', 'obsidian://open?vault=A&file=..%2FB',
                      'obsidian://open?vault=A&file=%FF', 'obsidian://open?vault=A&file=%ZZ',
                      'obsidian://open?vault=A&file=%00', 'obsidian://open?vault=A&file=', self.url+'\n']:
            with self.subTest(value=value), self.assertRaises((ValueError, UnicodeError)): obsidian_url(value)
        for value in ['obsidian://open?vault=A&file=Note%23Heading', 'obsidian://open?vault=A&file=Note%3Fquery',
                      'obsidian://open?vault=..%2FA&file=Note']:
            with self.assertRaises(ValueError): obsidian_url(value)

    def test_navigation_and_association_make_no_network_or_tool_call(self):
        with patch('subprocess.Popen', side_effect=AssertionError('process')), patch('socket.socket.connect', side_effect=AssertionError('network')):
            self.update(self.notes())
            self.call('outline_follow_reference', reference=self.ref)
