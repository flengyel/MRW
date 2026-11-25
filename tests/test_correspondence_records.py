import copy
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch

from mrw import correspondence_records as records


class CorrespondenceTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.home = Path(temporary.name)
        self.project = self.home / 'workspace'
        self.project.mkdir()
        self.manuscript = self.project / 'paper.tex'
        self.text = '😀 Header\n\nTheorem 1. All triangles have three sides.\n\nTheorem 2. Figure.\n'
        self.manuscript.write_text(self.text, encoding='utf-8')
        opening = self.text.index('Theorem 1')
        closing = self.text.index('\n\nTheorem 2')
        self.first_range = (opening + 1, closing + 1)
        self.second_range = (closing + 3, len(self.text) + 1)
        self.source = dict(title='Paper', label='Theorem 1', uri=self.manuscript.as_uri(), language='latex',
                           text=self.text, revision=records.digest(self.text.encode()),
                           start=self.first_range[0], end=self.first_range[1])
        self.lean = self.home / 'Lean'
        self.lean.mkdir()
        self.facts = dict(version=1, project=str(self.lean), module='Formal', declaration='Formal.triangle',
                          declaration_type={'default': 'Triangle → True', 'explicit': 'Triangle → True'},
                          axiom_dependencies=[], signature_hypotheses=[], direct_dependencies=[], source_location=None,
                          derived_from={'commit': 'a' * 40, 'toolchain': 'leanprover/lean4:v4.35.0',
                                        'manifest_digest': 'a' * 64, 'inputs': [
                              {'path': str(self.lean / 'lean-toolchain'), 'digest': 'b' * 64},
                              {'path': str(self.lean / 'lake-manifest.json'), 'digest': 'a' * 64},
                              {'path': str(self.lean / 'lakefile.toml'), 'digest': 'c' * 64},
                              {'path': str(self.lean / 'Formal.lean'), 'digest': 'd' * 64},
                          ]})
        self.scope = dict(source_uri=self.source['uri'], source_revision=self.source['revision'],
                          lean_project=str(self.lean), lean_commit='a' * 40, results=[
                              dict(title='Theorem 1', start=self.first_range[0], end=self.first_range[1]),
                              dict(title='Theorem 2', start=self.second_range[0], end=self.second_range[1])])
        self.store = self.home / 'store'
        # The records use the real facts validator. File and commit checks
        # are controlled here; the separate native tests exercise Lean.
        self.lean_state = 'current'
        patcher = patch('mrw.lean_correspondence.status', side_effect=lambda value: {'state': self.lean_state})
        patcher.start()
        self.addCleanup(patcher.stop)

    def call(self, method, **fields):
        return records.action(dict(method='correspondence_' + method, store=str(self.store),
                                   project_root=str(self.project), **fields))

    def aspects(self, **verdicts):
        return {aspect: dict(verdict=verdicts.get(aspect, 'matches'), reason='Compare printed language with the type.')
                for aspect in records.ASPECTS}

    def save(self, **fields):
        arguments = dict(source=self.source, facts=self.facts, aspects=self.aspects(), reviewer='First')
        arguments.update(fields)
        return self.call('save', **arguments)

    def test_revision_pin_and_authority(self):
        first = self.save()
        self.assertEqual(first['kind'], 'formalizes')
        self.assertEqual(first['status'], {'manuscript': 'current', 'lean': 'current'})
        self.assertEqual(first['source']['passage'], self.text[self.first_range[0] - 1:self.first_range[1] - 1])
        self.assertEqual(self.save()['revision'], first['revision'])
        self.manuscript.write_text('Changed text', encoding='utf-8')
        changed = self.call('review', revision=first['revision'])
        self.assertEqual(changed['status']['manuscript'], 'changed')
        self.assertIn('stale_correspondence', [item['kind'] for item in changed['discrepancies']])
        self.assertEqual(changed['source']['passage'], first['source']['passage'])
        weakened = self.save(prior=first['revision'], aspects=self.aspects(hypotheses='lean_assumes_more'))
        self.assertEqual(weakened['kind'], 'weakens')
        self.assertEqual(weakened['id'], first['id'])
        self.assertEqual(weakened['revisions'], [first['revision'], weakened['revision']])
        self.assertEqual(self.call('review', revision=first['revision'])['kind'], 'formalizes')
        self.assertEqual(len(self.call('list')['reviews']), 1)
        with self.assertRaisesRegex(ValueError, 'latest revision'):
            self.save(prior=first['revision'], aspects=self.aspects(conclusion='lean_stronger'))

    def test_wrong_pin_and_bad_utf16_are_rejected_before_publication(self):
        with self.assertRaisesRegex(ValueError, 'differ'):
            self.save(source=dict(self.source, revision='a' * 64))
        with self.assertRaisesRegex(ValueError, 'Unicode'):
            self.save(source=dict(self.source, start=1))
        self.assertFalse(self.store.exists())

    def test_saved_whole_source_uri_and_bom_passage_pin(self):
        text = '\ufeffTheorem. Note.\n'
        sha = records.digest(text.encode())
        identity = '11111111-1111-1111-1111-111111111111'
        whole = f'mrw-outline:v1/{"0" * 64}/{identity}/{sha}'
        pin = f'{whole}/{identity}/1.0-1.8'
        source = dict(self.source, text=text, revision=sha, uri=whole, start=1, end=9, reference=pin)
        result = self.save(source=source)
        self.assertEqual(result['source']['passage'], 'Theorem.')
        self.assertEqual(result['status']['manuscript'], 'unavailable')
        with self.assertRaisesRegex(ValueError, 'whole source revision'):
            self.save(source=dict(source, uri=pin))
        with self.assertRaisesRegex(ValueError, 'exact passage'):
            self.save(source=dict(source, start=2))

    def test_existing_receipt_is_separate_and_exact(self):
        text = 'Previous proof check for this declaration.'
        checked = dict(title='Retained check', uri=(self.project / 'verification.txt').as_uri(),
                       revision=records.digest(text.encode()), text=text)
        review = self.save(verification=checked)
        self.assertEqual(review['verification'], checked)
        self.assertNotIn('verification', review['facts'])
        with self.assertRaisesRegex(ValueError, 'differs from its revision'):
            self.save(verification=dict(checked, text='Changed receipt'))

    def test_assumptions_and_sorry_guard(self):
        weakened = self.save(aspects=self.aspects(hypotheses='lean_assumes_more', conclusion='lean_stronger'))
        self.assertEqual(weakened['kind'], 'weakens')
        stronger = self.save(aspects=self.aspects(conclusion='lean_stronger'))
        self.assertEqual(stronger['kind'], 'strengthens')
        incomparable = self.save(aspects=self.aspects(objects='not_comparable'))
        self.assertIsNone(incomparable['kind'])
        self.assertEqual(incomparable['discrepancies'][0]['kind'], 'manuscript_vs_formalization')
        sorry = self.save(facts=dict(self.facts, axiom_dependencies=['sorryAx']))
        self.assertIsNone(sorry['kind'])
        self.assertIn('sorryAx', sorry['discrepancies'][0]['reason'])

    def test_explicit_refresh_records_signature_change_without_rewriting(self):
        first = self.save()
        self.lean_state = 'changed'
        self.assertEqual(self.call('review', revision=first['revision'])['status']['lean'], 'changed')
        facts = copy.deepcopy(self.facts)
        facts['derived_from']['commit'] = 'b' * 40
        facts['declaration_type']['default'] = 'Triangle → False'
        response = self.call('refresh', revision=first['revision'], facts=facts)
        self.assertEqual(response['kind'], 'signature_changed')
        missing = dict(version=1, project=str(self.lean), module=self.facts['module'],
                       declaration=self.facts['declaration'], derived_from=facts['derived_from'], missing=True)
        self.assertEqual(self.call('refresh', revision=first['revision'], facts=missing)['kind'], 'declaration_missing')
        reopened = self.call('review', revision=first['revision'])
        self.assertEqual(reopened['facts'], first['facts'])
        self.assertIn('signature_changed', [item['kind'] for item in reopened['discrepancies']])
        self.assertIn('declaration_missing', [item['kind'] for item in reopened['discrepancies']])
        with self.assertRaisesRegex(ValueError, 'same declaration'):
            self.call('refresh', revision=first['revision'], facts=dict(facts, module='Unrelated'))

    def test_blind_view_isolated_across_restart_and_reveal_is_ordered(self):
        review = self.save()
        blind = self.call('reconstruction_begin', review=review['revision'])
        self.assertEqual(set(blind), {'id', 'revision', 'stage', 'source'})
        self.assertNotIn('text', blind['source'])
        self.assertNotIn('Theorem 2', blind['source']['passage'])
        self.assertEqual(self.call('reconstruction_read', id=blind['id']), blind)

        def advance(name, reply, **fields):
            return self.call('reconstruction_' + name, id=reply['id'], revision=reply['revision'], **fields)

        with self.assertRaisesRegex(ValueError, 'Save the reconstruction'):
            advance('reveal', blind)
        reconstruction = {aspect: 'A separately reconstructed statement.' for aspect in records.ASPECTS}
        saved = advance('save', blind, reconstruction=reconstruction, reviewer='Second')
        self.assertNotIn('review', saved)
        self.assertNotIn('facts', saved)
        facts = advance('reveal', saved)
        self.assertEqual(facts['facts'], self.facts)
        self.assertNotIn('review', facts)
        shown = advance('reveal', facts)
        self.assertEqual(shown['review']['revision'], review['revision'])
        self.assertLessEqual(shown['saved_at'], shown['facts_revealed_at'])
        self.assertLessEqual(shown['facts_revealed_at'], shown['revealed_at'])
        with self.assertRaisesRegex(ValueError, 'changed'):
            advance('reveal', saved)
        finished = advance('reconcile', shown, reconciliation={'hypotheses': {'resolution': 'open', 'reason': 'Check the instance.'}})
        self.assertEqual(finished['stage'], 'reconciled')
        self.assertEqual(self.call('reconstruction_read', id=blind['id'], revision=blind['revision']), blind)
        report = self.call('report_build', scope=self.scope)
        row = report['rows'][0]['review']
        self.assertEqual(row['second_readings'][0]['saved_before_reveal'], True)
        self.assertEqual(row['second_readings'][0]['reconciled'], True)
        self.assertTrue(any(item.get('reason') == 'Check the instance.' for item in row['discrepancies']))

    def test_report_lifecycle_preserves_other_records_and_external_export(self):
        review = self.save()
        preview = self.call('report_build', scope=self.scope)
        self.assertEqual([row['title'] for row in preview['rows']], ['Theorem 1', 'Theorem 2'])
        self.assertIsNone(preview['rows'][1]['review'])
        snapshot = self.call('report_save', scope=self.scope, expected=preview['revision'])
        destination = self.project / 'correspondence.md'
        self.call('report_export', id=snapshot['id'], destination=str(destination))
        exported = destination.read_bytes()
        self.assertIn(b'Unreviewed', exported)
        with self.assertRaisesRegex(ValueError, 'already exists'):
            self.call('report_export', id=snapshot['id'], destination=str(destination))
        trash = self.call('report_trash', id=snapshot['id'], revision=snapshot['revision'])
        self.assertEqual(trash['state'], 'trash')
        self.assertEqual(trash['rows'], preview['rows'])
        with self.assertRaisesRegex(ValueError, 'status changed'):
            self.call('report_restore', id=snapshot['id'], revision=snapshot['revision'])
        restored = self.call('report_restore', id=snapshot['id'], revision=trash['revision'])
        self.assertEqual(restored['state'], 'active')
        self.assertEqual(restored['rows'], preview['rows'])
        with self.assertRaisesRegex(ValueError, 'current report state'):
            self.call('report_delete', id=snapshot['id'], revision=restored['revision'])
        re_trashed = self.call('report_trash', id=snapshot['id'], revision=restored['revision'])
        deleted = self.call('report_delete', id=snapshot['id'], revision=re_trashed['revision'])
        self.assertEqual(deleted['state'], 'deleted')
        with self.assertRaisesRegex(ValueError, 'saved report is unavailable'):
            self.call('report_read', id=snapshot['id'])
        self.assertEqual(self.call('list')['reports'], [])
        self.assertEqual(self.call('review', revision=review['revision'])['facts'], self.facts)
        self.assertEqual(destination.read_bytes(), exported)
        records.validate_store(self.store, str(self.project))

    def test_manifest_inventory_stays_bound_to_original_saved_revision(self):
        doc = dict(self.scope, source_revision='c' * 64)
        with self.assertRaisesRegex(ValueError, 'match the manuscript revision'):
            self.call('report_build', scope=doc)
        first = self.save()
        before = self.call('report_build', scope=self.scope)
        self.save(prior=first['revision'], aspects=self.aspects(conclusion='lean_proves_less'))
        with self.assertRaisesRegex(ValueError, 'inputs changed'):
            self.call('report_save', scope=self.scope, expected=before['revision'])
        after = self.call('report_build', scope=self.scope)
        self.assertEqual(after['rows'][0]['review']['kind'], 'weakens')
        self.assertEqual(len(after['rows']), 2)
    def test_managed_move_adoption_restart_and_stale_epoch_preserve_report(self):
        from mrw.artifact_storage import ArtifactStorage, inventory
        from mrw.editor_bridge import dispatch

        fixture_root = Path(__file__).resolve().parents[1] / '.codex-work/correspondence-store-tests'
        fixture_root.mkdir(parents=True, exist_ok=True)

        with tempfile.TemporaryDirectory(dir=fixture_root) as directory:
            fixture = Path(directory)
            host, destination = fixture / 'host', fixture / 'saved'
            host.mkdir()
            epoch = 'legacy'

            def control(name, active_host=host, **fields):
                return dispatch(dict(method='artifact_' + name, protocol=1, artifact_home=str(active_host), **fields))

            def managed(name, *, active_host=host, project=self.project, active_epoch=None, **fields):
                key = records.digest(str(project).encode())
                return dispatch(dict(method='correspondence_' + name, protocol=1, artifact_home=str(active_host),
                                     artifact_epoch=epoch if active_epoch is None else active_epoch,
                                     project_root=str(project), store=str(active_host / ('correspondence-' + key)),
                                     **fields))

            review = managed('save', source=self.source, facts=self.facts,
                             aspects=self.aspects(), reviewer='First')
            snapshot = managed('report_save', scope=self.scope)
            export = fixture / 'report.md'
            managed('report_export', id=snapshot['id'], destination=str(export))
            expected = export.read_bytes()

            plan = control('plan', destination=str(destination), roots=[str(self.project)])
            result = control('move', destination=str(destination), roots=[str(self.project)],
                             manifest=plan['source_manifest'])
            self.assertTrue(result['committed'])
            self.assertFalse(result['cleanup_pending'])
            self.assertFalse(inventory(host, legacy=True))
            self.assertTrue(any('/reports/' in name for name in inventory(destination)))
            epoch = ArtifactStorage(str(host)).status()['epoch']
            self.assertEqual(managed('report_read', id=snapshot['id']), snapshot)
            with self.assertRaisesRegex(ValueError, 'stale client'):
                managed('report_trash', id=snapshot['id'], revision=snapshot['revision'], active_epoch='legacy')
            with self.assertRaisesRegex(ValueError, 'stale client'):
                managed('report_export', id=snapshot['id'], destination=str(fixture / 'stale.md'), active_epoch='legacy')
            first_trash = managed('report_trash', id=snapshot['id'], revision=snapshot['revision'])
            self.assertEqual(first_trash['state'], 'trash')

            adopted_host, mapped_root = fixture / 'other host', fixture / 'mapped workspace'
            adopted_host.mkdir()
            mapped_root.mkdir()
            info = control('inspect', active_host=adopted_host, destination=str(destination))
            adopted = control('adopt', active_host=adopted_host, destination=str(destination),
                              mapping={str(mapped_root): str(self.project)}, store_id=info['store_id'],
                              head_hash=info['head_hash'])
            selection = dict(active_host=adopted_host, project=mapped_root, active_epoch=adopted['epoch'])
            restarted = ArtifactStorage(str(adopted_host))
            self.assertEqual(restarted.status()['store_id'], info['store_id'])
            self.assertEqual(managed('report_read', id=snapshot['id'], **selection), first_trash)
            current = managed('review', revision=review['revision'], **selection)
            self.assertEqual(current['facts'], self.facts)
            self.assertEqual(current['source']['revision'], self.source['revision'])
            restored = managed('report_restore', id=snapshot['id'], revision=first_trash['revision'], **selection)
            self.assertEqual(restored['rows'], snapshot['rows'])
            self.assertEqual(export.read_bytes(), expected)
