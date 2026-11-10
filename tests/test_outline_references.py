"""Reference identity survives reader edits, never changing retained targets."""
from hashlib import sha256
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from mrw.editor_bridge import dispatch
from mrw.source_outlines import encoded


class OutlineReferenceTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory(); self.addCleanup(tmp.cleanup)
        self.home = Path(tmp.name); self.root = self.home/'project'; self.root.mkdir()
        self.base = dict(store=str(self.home/'private'), project_root=str(self.root))
        self.path = self.root/'book α.md'; self.raw = '\ufeffα😀 → β\r\nClaim.\rArgument.\n'.encode()
        self.path.write_bytes(self.raw)
        self.saved = self.call('outline_create', path=str(self.path), source_revision=sha256(self.raw).hexdigest())
        self.edit(kind='add_region', start=[0, 1], end=[1, 5])
        self.region = self.saved['outline']['regions'][0]

    def call(self, method, **extra):
        return dispatch(dict(protocol=1, method=method, **self.base, **extra))

    def edit(self, **change):
        self.saved = self.call('outline_mutate', id=self.saved['outline']['id'], revision=self.saved['revision'], change=change)

    def ref(self, region=True):
        return self.call('outline_reference', id=self.saved['outline']['id'], revision=self.saved['revision'],
                         region=self.region['id'] if region else None)

    def follow(self, ref):
        return self.call('outline_follow_reference', reference=ref['reference'])

    def inventory(self):
        return {str(p):sha256(p.read_bytes()).hexdigest() for p in self.home.rglob('*') if p.is_file()}

    def test_assistance_freezes_exact_retained_passage_without_original_or_reader_notes(self):
        ref = self.ref()['reference']
        self.edit(kind='annotation', region=self.region['id'], id=None, purpose='explanation',
                  origin='human_work', author=None, text='PRIVATE READER EXPLANATION')
        self.path.unlink()
        before = self.inventory()
        with patch('urllib.request.urlopen', side_effect=AssertionError('No network')):
            context = self.call('outline_assistance_context', reference=ref)['context']
        self.assertEqual(context['text'], '😀 → β\r\nClaim')
        self.assertEqual(context['source_identity'], ref)
        self.assertEqual(context['source_revision'], sha256(self.raw).hexdigest())
        self.assertIsNone(context['source_path'])
        self.assertEqual((context['start'], context['end']), ('1.1', '2.5'))
        self.assertNotIn('PRIVATE READER EXPLANATION', str(context))
        self.assertEqual(before, self.inventory())
        from mrw.editor_assistance import decode_context
        self.assertEqual(decode_context(context).text, context['text'])

    def test_assistance_keeps_earlier_range_after_reassociation_and_rejects_whole_or_wrong_scope(self):
        ref = self.ref()['reference']
        self.edit(kind='replace_region', region=self.region['id'], start=[2, 0], end=[2, 9])
        before = self.inventory()
        context = self.call('outline_assistance_context', reference=ref)['context']
        self.assertEqual(context['text'], '😀 → β\r\nClaim')
        self.assertIn('changed or removed', context['state'])
        current = self.call('outline_assistance_context', reference=self.ref()['reference'])['context']
        self.assertEqual(current['text'], 'Argument.')
        with self.assertRaisesRegex(ValueError, 'one retained passage'):
            self.call('outline_assistance_context', reference=self.ref(False)['reference'])
        wrong = ref.replace(ref.split('/')[1], '0'*64, 1)
        with self.assertRaisesRegex(ValueError, 'scope'):
            self.call('outline_assistance_context', reference=wrong)
        self.assertEqual(before, self.inventory())

    def test_assistance_refuses_unavailable_retained_material_without_replacements(self):
        ref = self.ref()['reference']
        blob = next((Path(self.base['store'])/self.saved['outline']['id']).glob('source-*.bin'))
        blob.unlink()
        before = self.inventory()
        with self.assertRaisesRegex(ValueError, 'Retained source unavailable'):
            self.call('outline_assistance_context', reference=ref)
        self.assertEqual(before, self.inventory())

    def test_two_sources_and_bibliography_annotation_edits_do_not_change_identity(self):
        bib = dict(title='Book [α] <tag>', authors='Known author', edition='2nd', revision=None,
                   locator='§ 2', reference='Supplied citation')
        self.edit(kind='metadata', bibliography=bib, authorship='human')
        region, whole = self.ref(), self.ref(False)
        self.assertIn(r'Book \[α\] \<tag\>', region['markdown'])
        self.assertIn('Known author', region['markdown']); self.assertIn('§ 2', region['markdown'])
        self.assertNotIn('revision:', region['markdown'])
        self.edit(kind='annotation', region=None, id=None, purpose='question', origin='human_work', author=None, text='A reader question')
        before = self.inventory()
        self.assertEqual(self.follow(region)['reference']['status'], 'unchanged')
        self.assertEqual(self.follow(whole)['reference']['status'], 'whole outline')
        self.assertEqual(self.inventory(), before)
        other = self.root/'other.txt'; other.write_text('A different source.\n')
        second = self.call('outline_create', path=str(other), source_revision=sha256(other.read_bytes()).hexdigest())
        another = self.call('outline_reference', id=second['outline']['id'], revision=second['revision'], region=None)
        self.assertNotEqual(another['reference'], whole['reference'])
        self.assertEqual(self.follow(another)['outline']['source']['path'], str(other))

    def test_changed_and_removed_region_keep_original_pinned_passage_and_never_publish(self):
        ref = self.ref(); self.edit(kind='replace_region', region=self.region['id'], start=[2, 0], end=[2, 9])
        before = self.inventory(); followed = self.follow(ref)
        self.assertEqual(followed['reference']['status'], 'changed or removed')
        self.assertIsNone(followed['reference']['region'])
        self.assertEqual(followed['document']['start'], [0, 1]); self.assertEqual(followed['document']['end'], [1, 5])
        self.assertEqual(followed['document']['text'].encode(), self.raw)
        self.assertEqual(self.inventory(), before)
        state = Path(self.base['store'])/self.saved['outline']['id']/'outline.json'
        data=json.loads(state.read_text()); data['regions']=[]; state.write_bytes(encoded(data))
        before=self.inventory(); self.assertEqual(self.follow(ref)['reference']['status'], 'changed or removed')
        self.assertEqual(self.inventory(), before)

    def test_unicode_scalar_reference_and_host_positions_preserve_bom_and_all_line_endings(self):
        ref=self.ref(); self.assertTrue(ref['reference'].endswith('/1.1-2.5'))
        self.path.write_bytes(b'Replacement.\n')
        result=self.follow(ref); self.assertEqual(result['outline']['source_status'], 'changed or unavailable')
        self.assertEqual(result['document']['text'].encode(), self.raw)
        self.assertEqual(result['document']['start'], [0,1]); self.assertEqual(result['document']['end'], [1,5])
        self.path.unlink(); self.assertEqual(self.follow(ref)['document'], result['document'])
        # A scalar column after the supplementary character maps to UTF-16 col 3.
        self.path.write_bytes(self.raw); self.edit(kind='replace_region', region=self.region['id'], start=[0,3], end=[0,7])
        self.assertTrue(self.ref()['reference'].endswith('/1.2-1.6'))
        self.assertEqual(self.follow(self.ref())['document']['start'], [0,3])

    def test_missing_outline_storage_retained_blob_and_corrupt_blob_fail_without_repair(self):
        ref=self.ref(); state=Path(self.base['store'])/self.saved['outline']['id']
        blob=next(state.glob('source-*.bin')); raw=blob.read_bytes(); blob.unlink()
        before=self.inventory()
        with self.assertRaisesRegex(ValueError,'Retained source unavailable'):self.follow(ref)
        self.assertEqual(self.inventory(),before)
        blob.write_bytes(b'corrupt')
        with self.assertRaisesRegex(ValueError,'Retained source unavailable'):self.follow(ref)
        blob.write_bytes(raw); (state/'outline.json').unlink(); before=self.inventory()
        with self.assertRaisesRegex(ValueError,'Saved source unavailable'):self.follow(ref)
        self.assertEqual(self.inventory(),before)
        (state/'outline.json').mkdir()
        with self.assertRaisesRegex(ValueError,'Saved source unavailable'):self.follow(ref)

    def test_strict_grammar_scope_revision_and_range_reject_without_writes(self):
        ref=self.ref()['reference']; before=self.inventory()
        wrong_scope=ref.replace(ref.split('/')[1], '0'*64, 1)
        wrong_source=ref.replace(sha256(self.raw).hexdigest(), '0'*64)
        for uri in ['command:workbench.action.terminal.new', 'file:///etc/passwd', ref+'?x=y', ref+'#fragment',
                    ref.replace('v1/','v2/'), ref.replace('/1.1-2.5','/01.1-2.5'), ref+'\n', ref.replace('1.1-2.5','2.5-1.1'),
                    ref.replace('1.1-2.5','1.1-9.1'), ref.replace('1.1-2.5','1.1-2.99'), ref.replace('v1/','v1/../'),
                    'x'*513, None, wrong_scope, wrong_source]:
            with self.subTest(uri=uri),self.assertRaises(ValueError):self.call('outline_follow_reference',reference=uri)
        other_store=str(self.home/'absent')
        with self.assertRaisesRegex(ValueError,'scope'):
            dispatch(dict(protocol=1,method='outline_follow_reference',store=other_store,project_root=str(self.root),reference=ref))
        self.assertFalse(Path(other_store).exists()); self.assertEqual(self.inventory(),before)

    def test_stale_chooser_is_rejected_and_navigation_is_offline(self):
        previous=self.saved['revision']; self.edit(kind='replace_region', region=self.region['id'], start=[1,0], end=[1,6])
        with self.assertRaisesRegex(ValueError,'changed'):
            self.call('outline_reference',id=self.saved['outline']['id'],revision=previous,region=self.region['id'])
        with patch('subprocess.Popen',side_effect=AssertionError('process')),patch('socket.socket.connect',side_effect=AssertionError('network')):
            ref=self.ref(); before=self.inventory(); self.follow(ref); self.assertEqual(self.inventory(),before)
