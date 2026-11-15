"""Saved-copy Trash never owns external files or erases retained material."""
from hashlib import sha256
from pathlib import Path
import json
import os
import tempfile
import unittest
from unittest.mock import patch

from mrw.editor_bridge import dispatch
from mrw.artifact_storage import ArtifactStorage, inventory
from mrw.source_outlines import OutlineStore


class SourceLifecycleTests(unittest.TestCase):
    def setUp(self):
        test_root=Path(__file__).resolve().parents[1]/'.codex-work/source-lifecycle-tests'
        test_root.mkdir(parents=True,exist_ok=True)
        temp = tempfile.TemporaryDirectory(dir=test_root); self.addCleanup(temp.cleanup)
        self.base = Path(temp.name)
        self.root = self.base / 'workspace'; self.root.mkdir()
        self.home = self.base / 'private'; self.home.mkdir()
        self.store = self.home / ('outlines-' + sha256(str(self.root).encode()).hexdigest())
        self.path = self.root / 'note.md'; self.raw = b'# Original\nAn exact retained passage.\n'
        self.path.write_bytes(self.raw)
        self.epoch = 'legacy'
        self.saved = self.call('outline_import_note', path=str(self.path), source_revision=sha256(self.raw).hexdigest())
        self.id = self.saved['outline']['id']
        self.saved = self.call('outline_mutate', id=self.id, revision=self.saved['revision'], change=dict(
            kind='annotation', region=None, id=None, purpose='note', text='Keep my mathematical note.', origin='human_work', author='Reader'))
        self.ref = self.call('outline_reference', id=self.id, revision=self.saved['revision'], region=self.saved['outline']['regions'][0]['id'])['reference']
        self.call('outline_update_note', id=self.id, revision=None, change=dict(id=None,reference=self.ref,
            url='obsidian://open?vault=Notes&file=External',label='External vault note'))
        self.folder = self.store / self.id
        self.before = {p.name:p.read_bytes() for p in self.folder.iterdir() if p.is_file()}

    def call(self, method, **extra):
        return dispatch(dict(protocol=1, method=method, artifact_home=str(self.home), artifact_epoch=self.epoch,
            store=str(self.store), project_root=str(self.root), **extra))

    def transition(self, method, status=None):
        return self.call(method, id=self.id, revision=self.saved['revision'], status_revision=status)

    def assert_retained(self):
        self.assertEqual(self.call('outline_follow_reference',reference=self.ref)['document']['text'].encode(),self.raw)
        loaded=self.call('outline_load',id=self.id)
        self.assertEqual(loaded['outline']['annotations'],self.saved['outline']['annotations'])
        self.assertEqual(self.call('outline_notes',id=self.id)['links'][0]['label'],'External vault note')
        self.assertEqual(self.path.read_bytes(),self.raw)
        return loaded

    def test_restart_restore_preserves_every_original_byte_and_exact_link(self):
        trashed=self.transition('outline_trash')
        self.assertEqual(self.call('outline_list')['outlines'],[])
        rows=self.call('outline_trash_list')['outlines']; self.assertEqual([r['id'] for r in rows],[self.id])
        self.assertEqual(rows[0]['annotation_count'],1)
        self.assertEqual(self.assert_retained()['lifecycle'],trashed['lifecycle'])
        self.transition('outline_restore',trashed['lifecycle']['revision'])
        self.assertEqual(self.call('outline_trash_list')['outlines'],[])
        self.assertEqual(self.call('outline_list')['outlines'][0]['id'],self.id)
        self.assert_retained()
        self.assertEqual(self.before,{p.name:p.read_bytes() for p in self.folder.iterdir() if p.name in self.before})

    def test_no_reimport_or_stale_restore_can_resurrect_source(self):
        trashed=self.transition('outline_trash')
        with self.assertRaisesRegex(ValueError,'Trash'):
            self.call('outline_import_note',path=str(self.path),source_revision=sha256(self.raw).hexdigest())
        with self.assertRaisesRegex(ValueError,'status changed'):
            self.transition('outline_restore')
        active=self.transition('outline_restore',trashed['lifecycle']['revision'])
        next_trash=self.transition('outline_trash',active['lifecycle']['revision'])
        with self.assertRaisesRegex(ValueError,'status changed'):
            self.transition('outline_restore',trashed['lifecycle']['revision'])
        self.assertEqual(self.call('outline_load',id=self.id)['lifecycle'],next_trash['lifecycle'])

    def test_trash_blocks_annotation_links_and_compilation_before_side_effects(self):
        self.transition('outline_trash')
        with self.assertRaisesRegex(ValueError,'Trash'):
            self.call('outline_mutate',id=self.id,revision=self.saved['revision'],change=dict(
                kind='annotation',region=None,id=None,purpose='note',text='Must not save',origin='human_work',author=None))
        with self.assertRaisesRegex(ValueError,'Trash'):
            self.call('outline_update_note',id=self.id,revision=None,change={})
        with patch('mrw.reader_diagrams.compile_tikz',side_effect=AssertionError('No compilation')):
            with self.assertRaisesRegex(ValueError,'Trash'):
                self.call('outline_render_diagram',id=self.id,revision=self.saved['revision'],annotation='unused',code='unused')
        self.assert_retained()

    def test_stale_selection_rejected_and_another_source_is_unchanged(self):
        other=self.call('outline_create',path=str(self.path),source_revision=sha256(self.raw).hexdigest())
        self.transition('outline_trash')
        self.assertEqual(self.call('outline_list')['outlines'][0]['id'],other['outline']['id'])
        self.assertEqual(self.call('outline_load',id=other['outline']['id'])['outline'],other['outline'])
        with self.assertRaisesRegex(ValueError,'changed'):
            self.call('outline_restore',id=self.id,revision='0'*64,status_revision=self.call('outline_load',id=self.id)['lifecycle']['revision'])

    def test_status_is_bounded_strict_and_no_symlink_is_followed(self):
        self.transition('outline_trash')
        path=self.folder/'source-status.json'; value=json.loads(path.read_bytes()); value['outline']='12345678-1234-4567-89ab-123456789abc'
        path.write_text(json.dumps(value))
        with self.assertRaisesRegex(ValueError,'identity'):
            self.call('outline_load',id=self.id)
        path.unlink(); path.symlink_to(self.path)
        with self.assertRaises((ValueError,OSError)):
            self.call('outline_list')

    def test_failed_status_replace_keeps_source_active_and_retry_works(self):
        with patch('mrw.source_lifecycle.save_mutable',side_effect=OSError('disk full')):
            self.assertTrue(self.transition('outline_trash')['blocked'])
        self.assertEqual(self.call('outline_load',id=self.id)['lifecycle']['state'],'active')
        self.assertEqual(len(self.call('outline_list')['outlines']),1)
        self.transition('outline_trash')

    def move(self):
        self.destination=self.base/'managed'
        manager=ArtifactStorage(str(self.home))
        with manager.exclusive():
            plan=manager.plan(str(self.destination),[str(self.root)])
            result=manager.move(str(self.destination),[str(self.root)],plan['source_manifest'])
        self.epoch=result['epoch']

    def test_legacy_trash_moves_with_annotations_and_links(self):
        trashed=self.transition('outline_trash'); self.move()
        self.assertEqual(self.call('outline_trash_list')['outlines'][0]['id'],self.id)
        self.assert_retained()
        self.transition('outline_restore',trashed['lifecycle']['revision'])
        self.assert_retained()

    def test_rejected_managed_publication_does_not_change_head_or_leave_candidate(self):
        self.move(); head=(self.destination/'HEAD.json').read_bytes()
        generations=set((self.destination/'versions').iterdir())
        with patch.object(ArtifactStorage,'publish_generation',side_effect=OSError('before publication')):
            with self.assertRaisesRegex(OSError,'before publication'):
                self.transition('outline_trash')
        self.assertEqual((self.destination/'HEAD.json').read_bytes(),head)
        self.assertEqual(set((self.destination/'versions').iterdir()),generations)
        self.assertEqual(self.call('outline_load',id=self.id)['lifecycle']['state'],'active')
        trashed=self.transition('outline_trash'); self.assert_retained()
        self.transition('outline_restore',trashed['lifecycle']['revision'])

    def test_managed_blocked_status_write_never_becomes_active_head(self):
        self.move(); head=(self.destination/'HEAD.json').read_bytes()
        with patch('mrw.source_lifecycle.save_mutable',side_effect=OSError('failed replace')):
            self.assertTrue(self.transition('outline_trash')['blocked'])
        self.assertEqual((self.destination/'HEAD.json').read_bytes(),head)
        self.assertEqual(self.call('outline_trash_list')['outlines'],[])
        self.assert_retained()

    def test_fresh_host_adopts_trash_without_resurrecting_it(self):
        trashed=self.transition('outline_trash'); self.move()
        other=self.base/'other-host'; other.mkdir()
        manager=ArtifactStorage(str(other))
        with manager.exclusive():
            ident,head,raw,payload=manager.load(str(self.destination))
            result=manager.adopt(str(self.destination),{str(self.root):str(self.root)},ident['id'],sha256(raw).hexdigest())
        self.home=other;self.epoch=result['epoch'];self.store=self.home/self.store.name
        self.assertEqual(self.call('outline_list')['outlines'],[])
        self.assert_retained()
        self.transition('outline_restore',trashed['lifecycle']['revision']);self.assert_retained()

    def test_interrupted_head_replace_recovers_only_the_observed_outcome(self):
        from mrw.mutable_files import save_mutable
        for committed in (False,True):
            with self.subTest(committed=committed):
                if not hasattr(self,'destination'):self.move()
                def fail(path,raw,**kw):
                    if path.name=='HEAD.json':
                        if committed:save_mutable(path,raw,**kw)
                        raise OSError('interrupted head replacement')
                    return save_mutable(path,raw,**kw)
                with patch('mrw.artifact_storage.save_mutable',side_effect=fail):
                    with self.assertRaisesRegex(OSError,'interrupted'):
                        self.transition('outline_trash')
                manager=ArtifactStorage(str(self.home))
                self.assertTrue(manager.journal.exists())
                with self.assertRaisesRegex(ValueError,'recovery'):
                    self.call('outline_list')
                with manager.exclusive():manager.recover()
                loaded=self.assert_retained()
                self.assertEqual(loaded['lifecycle']['state'],'trash' if committed else 'active')
                self.assertFalse(manager.journal.exists())
                self.assertEqual(len(self.call('outline_list')['outlines']),0 if committed else 1)
