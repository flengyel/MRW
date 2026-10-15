"""Offline reading state: retained quotations never become inferred proof edges."""
from copy import deepcopy
from hashlib import sha256
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from theorem_terminal.editor_bridge import dispatch
from theorem_terminal.source_outlines import OutlineStore


class SourceOutlineTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.home = Path(temporary.name)
        self.project = self.home / 'project'; self.project.mkdir()
        self.private = self.home / 'private'
        self.source = self.project / 'article.md'
        self.raw = 'α😀 → β\r\nClaim one.\rArgument.\n'.encode()
        self.source.write_bytes(self.raw)
        self.base = dict(store=str(self.private), project_root=str(self.project))
        self.saved = self.call('outline_create', path=str(self.source), source_revision=sha256(self.raw).hexdigest())

    def call(self, method, **extra):
        return dispatch(dict(protocol=1, method=method, **self.base, **extra))

    def action(self, method, **extra):
        value = self.call(method, id=self.saved['outline']['id'], revision=self.saved['revision'], **extra)
        if 'outline' in value:
            self.saved = value
        return value

    def edit(self, **change):
        return self.action('outline_mutate', change=change)

    def add(self, start=None, end=None):
        self.edit(kind='add_region', start=start or [0, 1], end=end or [1, 5])
        return self.saved['outline']['regions'][-1]

    def note(self, region=None, content='Reader question: why does this step follow?', origin='human_work'):
        return self.edit(kind='annotation', region=region, id=None, purpose='question', text=content,
                         origin=origin, author=None)

    def context(self, label='Available hypothesis'):
        self.edit(kind='context', context_kind='hypothesis', label=label, start=[0, 0], end=[0, 7])
        return self.saved['outline']['contexts'][-1]

    def evidence(self, region, kind='goal_context'):
        artifact = self.home / 'capture.json'
        raw = json.dumps([dict(label=f'Snapshot {i}', result=dict(goals=[f'h : P {i}\n⊢ Q {i}'])) for i in range(2)]).encode()
        artifact.write_bytes(raw)
        self.action('outline_attach', path=str(artifact), artifact_revision=sha256(raw).hexdigest(), kind=kind,
                    label='Supplied evidence', region=region, selector=0 if kind == 'goal_context' else None)
        return self.saved['outline']['artifacts'][-1], raw

    def test_context_description_range_and_removal_preserve_unrelated_work_and_original(self):
        region = self.add(); self.note(region['id']); context = self.context(); self.context('Unrelated')
        unrelated = deepcopy(self.saved['outline']['contexts'][1])
        regions = deepcopy(self.saved['outline']['regions'])
        self.edit(kind='edit_context', context=context['id'], context_kind='cited_result', label='Reader label')
        self.assertEqual(self.saved['outline']['contexts'][0]['text'], context['text'])
        self.edit(kind='replace_context', context=context['id'], start=[1, 0], end=[1, 10])
        revised = self.saved['outline']['contexts'][0]
        self.assertEqual((revised['id'], revised['label'], revised['kind'], revised['text']),
                         (context['id'], 'Reader label', 'cited_result', 'Claim one.'))
        self.saved = self.call('outline_load', id=self.saved['outline']['id'])
        self.assertEqual(self.saved['outline']['contexts'][0], revised)
        self.edit(kind='remove_context', context=context['id'])
        self.saved = self.call('outline_load', id=self.saved['outline']['id'])
        self.assertEqual(self.saved['outline']['contexts'], [unrelated])
        self.assertEqual(self.saved['outline']['regions'], regions)
        self.assertEqual(self.action('outline_document', artifact=None)['text'].encode(), self.raw)
        self.assertEqual(self.source.read_bytes(), self.raw)

    def test_manual_evidence_reassociation_snapshot_replacement_and_removal_keep_originals(self):
        first = self.add(); second = self.add([1, 0], [1, 10]); self.note(first['id'])
        artifact, raw = self.evidence(first['id'])
        declaration, _ = self.evidence(first['id'], 'declaration_statement')
        unrelated = deepcopy(declaration)
        regions = deepcopy(self.saved['outline']['regions'])
        (self.home / 'capture.json').unlink()  # All revision uses the retained artifact.
        self.edit(kind='evidence_association', artifact=artifact['id'], region=second['id'], selector=1)
        updated = self.saved['outline']['artifacts'][0]
        self.assertEqual(updated['goals'], ['h : P 1\n⊢ Q 1'])
        for key in ('id', 'path', 'revision', 'kind', 'label', 'captured_at'):
            self.assertEqual(updated[key], artifact[key])
        self.assertEqual(updated['region'], second['id'])
        self.saved = self.call('outline_load', id=self.saved['outline']['id'])
        self.assertEqual(self.saved['outline']['artifacts'][0], updated)
        self.edit(kind='remove_evidence_association', artifact=artifact['id'])
        self.saved = self.call('outline_load', id=self.saved['outline']['id'])
        retained = self.saved['outline']['artifacts'][0]
        self.assertIsNone(retained['region']); self.assertEqual(retained['selector'], 1)
        self.assertEqual(retained['goals'], updated['goals'])
        self.assertEqual(self.saved['outline']['artifacts'][1], unrelated)
        self.assertEqual(self.saved['outline']['regions'], regions)
        self.assertEqual(self.action('outline_document', artifact=artifact['id'])['text'].encode(), raw)
        self.edit(kind='remove_evidence_association', artifact=declaration['id'])
        self.assertEqual(self.saved['outline']['artifacts'][1]['kind'], 'declaration_statement')
        self.assertEqual(self.action('outline_document', artifact=declaration['id'])['text'].encode(), raw)
        self.edit(kind='evidence_association', artifact=artifact['id'], region=first['id'], selector=0)
        self.assertEqual(self.saved['outline']['artifacts'][0]['region'], first['id'])

    def test_invalid_association_edits_and_stale_state_never_publish(self):
        region = self.add(); context = self.context(); artifact, _ = self.evidence(region['id'])
        before = deepcopy(self.saved)
        for change in [dict(kind='replace_context', context=context['id'], start=[0, 2], end=[0, 3]),
                       dict(kind='replace_context', context=context['id'], start=[9, 0], end=[9, 1]),
                       dict(kind='replace_context', context=context['id'], start=[1, 1], end=[1, 0]),
                       dict(kind='edit_context', context=context['id'], context_kind='checked', label='Wrong'),
                       dict(kind='remove_context', context=region['id']),
                       dict(kind='evidence_association', artifact=artifact['id'], region=region['id'], selector=2),
                       dict(kind='evidence_association', artifact=artifact['id'], region=region['id'], selector=True),
                       dict(kind='evidence_association', artifact=artifact['id'], region=context['id'], selector=0),
                       dict(kind='remove_evidence_association', artifact=context['id'])]:
            with self.subTest(change=change), self.assertRaises(ValueError):
                self.edit(**change)
        self.assertEqual(self.call('outline_load', id=self.saved['outline']['id']), before)
        self.note()
        for change in [dict(kind='remove_context', context=context['id']),
                       dict(kind='replace_context', context=context['id'], start=[1, 0], end=[1, 5]),
                       dict(kind='remove_evidence_association', artifact=artifact['id'])]:
            with self.subTest(change=change), self.assertRaisesRegex(ValueError, 'changed'):
                self.call('outline_mutate', id=self.saved['outline']['id'], revision=before['revision'], change=change)

    def test_association_publication_failure_preserves_last_saved_state_and_retained_blobs(self):
        region = self.add(); context = self.context(); artifact, raw = self.evidence(region['id'])
        before = deepcopy(self.saved)
        for change in [dict(kind='replace_context', context=context['id'], start=[1, 0], end=[1, 10]),
                       dict(kind='remove_context', context=context['id']),
                       dict(kind='evidence_association', artifact=artifact['id'], region=None, selector=1),
                       dict(kind='remove_evidence_association', artifact=artifact['id'])]:
            with self.subTest(change=change), patch('theorem_terminal.source_outlines.save_mutable', side_effect=OSError('before replacement')):
                result = self.edit(**change)
            self.assertTrue(result['blocked'])
            self.assertEqual(self.call('outline_load', id=before['outline']['id']), before)
        self.assertEqual(self.action('outline_document', artifact=artifact['id'])['text'].encode(), raw)
        with patch('theorem_terminal.mutable_files.sync_directory', side_effect=OSError('uncertain sync')):
            result = self.edit(kind='remove_evidence_association', artifact=artifact['id'])
        self.assertTrue(result['blocked']); self.assertEqual(self.saved, before)
        self.saved = self.call('outline_load', id=before['outline']['id'])
        self.assertIsNone(self.saved['outline']['artifacts'][0]['region'])
        self.assertEqual(self.action('outline_document', artifact=artifact['id'])['text'].encode(), raw)

    def test_context_and_evidence_edits_are_offline_without_lean(self):
        with patch('subprocess.Popen', side_effect=AssertionError('unexpected child process')), \
             patch('socket.socket.connect', side_effect=AssertionError('unexpected network')):
            region = self.add(); context = self.context(); artifact, _ = self.evidence(region['id'])
            self.edit(kind='edit_context', context=context['id'], context_kind='definition', label='Available definition')
            self.edit(kind='replace_context', context=context['id'], start=[1, 0], end=[1, 10])
            self.edit(kind='evidence_association', artifact=artifact['id'], region=None, selector=1)
            self.edit(kind='remove_evidence_association', artifact=artifact['id'])
            self.edit(kind='remove_context', context=context['id'])
            self.action('outline_document', artifact=artifact['id'])

    def test_private_snapshot_unknown_provenance_and_no_project_writes(self):
        self.assertEqual(list(self.project.iterdir()), [self.source])
        self.assertEqual(self.source.read_bytes(), self.raw)
        s = self.saved['outline']['source']
        self.assertEqual(s['authorship'], 'unknown')
        self.assertIsNone(s['bibliography']['authors'])
        self.assertIsNone(s['bibliography']['edition'])
        self.assertIsNone(s['bibliography']['title'])
        document = self.action('outline_document', artifact=None)
        self.assertEqual(document['text'].encode(), self.raw)
        folder = self.private / self.saved['outline']['id']
        self.assertEqual((folder / ('source-' + s['revision'] + '.bin')).stat().st_mode & 0o777, 0o600)
        self.assertEqual((folder / 'outline.json').stat().st_mode & 0o777, 0o600)
        bibliography = deepcopy(s['bibliography'])
        bibliography['title'] = 'Supplied AI-generated article'
        self.edit(kind='metadata', bibliography=bibliography, authorship='ai_generated')
        self.assertEqual(self.saved['outline']['source']['authorship'], 'ai_generated')
        self.assertIsNone(self.saved['outline']['source']['bibliography']['authors'])
        self.assertEqual(self.saved['outline']['artifacts'], [])
        self.assertEqual(self.source.read_bytes(), self.raw)

    def test_unicode_mixed_endings_and_bom_spans_survive_restart_verbatim(self):
        region = self.add()
        exact = '😀 → β\r\nClaim'
        self.assertEqual(region['argument_text'], exact)
        self.assertEqual(region['span']['start_col'], 1)
        loaded = self.call('outline_load', id=self.saved['outline']['id'])
        self.assertEqual(loaded['outline']['regions'][0]['argument_text'], exact)
        self.assertEqual(loaded['revision'], self.saved['revision'])
        original = self.source.read_bytes()
        self.source.write_bytes(b'\xef\xbb\xbf' + original)
        bom = self.call('outline_create', path=str(self.source), source_revision=sha256(self.source.read_bytes()).hexdigest())
        selected = self.call('outline_mutate', id=bom['outline']['id'], revision=bom['revision'],
                             change=dict(kind='add_region', start=[0, 1], end=[1, 5]))
        self.assertEqual(selected['outline']['regions'][0]['argument_text'], exact)
        retained = self.call('outline_document', id=bom['outline']['id'], revision=selected['revision'], artifact=None)
        self.assertEqual(retained['text'].encode(), b'\xef\xbb\xbf' + original)

    def test_invalid_ranges_and_surrogate_splits_never_publish(self):
        before = self.saved['revision']
        for start, end in [([0, 2], [0, 3]), ([0, 0], [0, 2]), ([0, 0], [9, 0]),
                           ([0, 0], [0, 90]), ([1, 0], [0, 0]), ([0, 0], [0, 0]),
                           ([False, 0], [1, 0])]:
            with self.subTest(start=start, end=end), self.assertRaises(ValueError):
                self.edit(kind='add_region', start=start, end=end)
        loaded = self.call('outline_load', id=self.saved['outline']['id'])
        self.assertEqual(loaded['revision'], before)
        self.assertEqual(loaded['outline']['regions'], [])

    def test_reader_can_revise_a_selection_without_rewriting_its_source_or_annotations(self):
        region = self.add(); self.note(region['id'])
        self.edit(kind='replace_region', region=region['id'], start=[1, 0], end=[1, 10])
        revised = self.saved['outline']['regions'][0]
        self.assertEqual(revised['id'], region['id'])
        self.assertEqual(revised['argument_text'], 'Claim one.')
        self.assertEqual(len(revised['annotations']), 1)
        self.assertEqual(self.source.read_bytes(), self.raw)

    def test_collapsed_details_preserve_exact_statements_context_and_attributed_reconstruction(self):
        region = self.add([2, 0], [2, 9])
        self.edit(kind='statement', region=region['id'], statement_kind='declaration_statement', start=[1, 0], end=[1, 10])
        self.edit(kind='context', context_kind='hypothesis', label='Available hypothesis', start=[0, 0], end=[0, 7])
        self.note(region['id'], 'A proposed repair, separate from the source.', 'ai_proposal')
        self.edit(kind='region', region=region['id'], title='Claim and argument', level='concepts_results', collapsed=True)
        current = self.saved['outline']['regions'][0]
        self.assertIsNone(current['argument_text'])
        self.assertEqual(current['statement_text'], 'Claim one.')
        self.assertEqual(self.saved['outline']['contexts'][0]['text'], 'α😀 → β')
        self.assertEqual(current['annotations'][0]['provenance']['origin'], 'ai_proposal')
        self.assertEqual(self.source.read_bytes(), self.raw)
        self.edit(kind='region', region=region['id'], title=current['title'], level=current['level'], collapsed=False)
        self.assertEqual(self.saved['outline']['regions'][0]['argument_text'], 'Argument.')

    def test_changed_and_missing_original_never_remap_retained_regions_or_annotations(self):
        region = self.add(); self.note(region['id'])
        pinned = deepcopy(self.saved['outline']['regions'][0]['span'])
        for missing in (False, True):
            if missing:
                self.source.unlink()
            else:
                self.source.write_text('A replacement passage.\n')
            loaded = self.call('outline_load', id=self.saved['outline']['id'])
            self.assertEqual(loaded['outline']['regions'][0]['span'], pinned)
            self.assertEqual(loaded['outline']['regions'][0]['argument_text'], '😀 → β\r\nClaim')
            self.assertEqual(loaded['outline']['regions'][0]['annotations'][0]['text'], 'Reader question: why does this step follow?')
            self.assertNotEqual(loaded['outline']['source_status'], 'unchanged')
            with self.assertRaises((OSError, ValueError)):
                self.action('outline_navigation', region=region['id'], context=None, statement=False)
            self.assertEqual(self.action('outline_document', artifact=None)['text'].encode(), self.raw)

    def test_recorded_goals_are_optional_manually_selected_and_retained_unchanged(self):
        region = self.add()
        artifact = self.home / 'capture.json'
        raw = json.dumps([dict(label='some recorded state', result=dict(goals=['x : G\nh : P x\n⊢ Q x']))]).encode()
        artifact.write_bytes(raw)
        inspected = dispatch(dict(protocol=1, method='outline_inspect_artifact', path=str(artifact)))
        self.assertEqual(inspected['entries'], [{'index': 0, 'label': 'some recorded state'}])
        self.action('outline_attach', path=str(artifact), artifact_revision=inspected['revision'], kind='goal_context',
                    label='Manual association', region=region['id'], selector=0)
        self.assertEqual(self.saved['outline']['artifacts'][0]['goals'], ['x : G\nh : P x\n⊢ Q x'])
        aid = self.saved['outline']['artifacts'][0]['id']; artifact.unlink()
        self.assertEqual(self.action('outline_document', artifact=aid)['text'].encode(), raw)
        loaded = self.call('outline_load', id=self.saved['outline']['id'])
        self.assertEqual(loaded['outline']['artifacts'][0]['goals'], ['x : G\nh : P x\n⊢ Q x'])
        self.assertEqual(loaded['outline']['regions'][0]['span'], region['span'])

    def test_stale_update_failure_and_uncertain_publication_preserve_records(self):
        stale = self.saved['revision']; self.note()
        with self.assertRaisesRegex(ValueError, 'changed'):
            self.call('outline_mutate', id=self.saved['outline']['id'], revision=stale,
                      change=dict(kind='add_region', start=[0, 0], end=[1, 0]))
        previous = self.saved['revision']
        with patch('theorem_terminal.source_outlines.save_mutable', side_effect=OSError('before replacement')):
            result = self.note(content='This edit was not saved')
        self.assertTrue(result['blocked'])
        self.assertEqual(self.call('outline_load', id=self.saved['outline']['id'])['revision'], previous)
        with patch('theorem_terminal.mutable_files.sync_directory', side_effect=OSError('uncertain sync')):
            result = self.note(content='Complete replacement may be on disk')
        self.assertTrue(result['blocked'])
        loaded = self.call('outline_load', id=self.saved['outline']['id'])
        self.assertEqual(loaded['outline']['annotations'][-1]['text'], 'Complete replacement may be on disk')
        self.saved = loaded
        self.assertEqual(self.action('outline_document', artifact=None)['text'].encode(), self.raw)

    def test_corrupted_retained_source_keeps_annotations_without_fabricating_expansion(self):
        region = self.add(); self.note(region['id'])
        store = OutlineStore(str(self.private), str(self.project), self.saved['outline']['id'])
        store.blob(self.saved['outline']['source']['revision'], source=True).write_bytes(b'different source')
        loaded = self.call('outline_load', id=store.id)
        self.assertIn('changed', loaded['outline']['retained_error'])
        self.assertIsNone(loaded['outline']['regions'][0]['argument_text'])
        self.assertEqual(loaded['outline']['regions'][0]['annotations'][0]['text'], 'Reader question: why does this step follow?')

    def test_offline_actions_never_start_compilers_or_provider_transports(self):
        with patch('subprocess.Popen', side_effect=AssertionError('unexpected child process')), \
             patch('socket.socket.connect', side_effect=AssertionError('unexpected network')):
            region = self.add(); self.note(region['id'])
            self.edit(kind='region', region=region['id'], title='Opaque result usable with hypotheses', level='governing_idea', collapsed=True)
            self.call('outline_load', id=self.saved['outline']['id'])
            self.action('outline_document', artifact=None)

    def test_explicit_format_storage_and_shape_boundaries(self):
        for suffix in ('.pdf', '.ipynb', '.docx'):
            p = self.home / ('unsupported' + suffix); p.write_text('Not a supported text source')
            with self.assertRaisesRegex(ValueError, 'unsupported'):
                self.call('outline_create', path=str(p), source_revision=sha256(p.read_bytes()).hexdigest())
        with self.assertRaisesRegex(ValueError, 'outside'):
            dispatch(dict(protocol=1, method='outline_list', store=str(self.project/'private'), project_root=str(self.project)))
        with self.assertRaisesRegex(ValueError, 'fields'):
            self.edit(kind='add_region', start=[0, 0], end=[1, 0], verified=True)
        with self.assertRaisesRegex(ValueError, 'limit'):
            self.note(content='x' * 16385)
        self.assertEqual(len(self.call('outline_list')['outlines']), 1)


if __name__ == '__main__':
    unittest.main()
