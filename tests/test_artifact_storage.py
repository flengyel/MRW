"""Transactional workspace moves and synchronized adoption, using disposable data."""
from copy import deepcopy
from hashlib import sha256
import json
import multiprocessing
import os
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

from theorem_terminal.artifact_storage import ArtifactStorage, inventory, encoded, read_json
from theorem_terminal.editor_bridge import dispatch


def interrupted_move(home, destination, roots, manifest, phase):
    def checkpoint(at):
        if at == phase: os._exit(73)
    manager=ArtifactStorage(home,checkpoint=checkpoint)
    with manager.exclusive(): manager.move(destination,roots,manifest)


class ArtifactStorageTests(unittest.TestCase):
    def test_note_import_uses_managed_publication_epoch_and_preserves_existing_records(self):
        self.move()
        note = self.base/'outside-note.md'; raw = b'# Note\nExternal vault text.'; note.write_bytes(raw)
        before = (self.destination/'HEAD.json').read_bytes()
        with self.assertRaisesRegex(ValueError, 'stale'):
            dispatch(dict(protocol=1, method='outline_import_note', artifact_home=str(self.home),
                          artifact_epoch='legacy', store=str(self.store), project_root=str(self.root),
                          path=str(note), source_revision=sha256(raw).hexdigest()))
        self.assertEqual((self.destination/'HEAD.json').read_bytes(), before)
        imported = self.call('outline_import_note', path=str(note), source_revision=sha256(raw).hexdigest())
        self.assertNotEqual((self.destination/'HEAD.json').read_bytes(), before)
        self.assertEqual(imported['outline']['regions'][0]['argument_text'], raw.decode())
        self.assertEqual(self.call('outline_load', id=imported['outline']['id'])['outline'], imported['outline'])
        self.assertEqual(self.call('outline_follow_reference', reference=self.ref)['document']['text'].encode(), self.raw)
        self.assertEqual(self.call('outline_notes', id=self.id)['links'][0]['label'], 'Existing α note')
        self.assertEqual(note.read_bytes(), raw)

    def setUp(self):
        test_root=Path(__file__).resolve().parents[1]/'.codex-work/artifact-storage-tests'
        test_root.mkdir(parents=True,exist_ok=True)
        temp=tempfile.TemporaryDirectory(dir=test_root);self.addCleanup(temp.cleanup)
        self.base=Path(temp.name);self.root=self.base/'project α';self.root.mkdir()
        self.home=self.base/'host state';self.home.mkdir()
        self.manager=ArtifactStorage(str(self.home))
        self.store=self.home/('outlines-'+sha256(str(self.root).encode()).hexdigest())
        self.source=self.root/'source α.txt';self.raw='α😀 retained\r\nsecond passage\n'.encode();self.source.write_bytes(self.raw)
        self.epoch='legacy'
        self.created=self.call('outline_create',path=str(self.source),source_revision=sha256(self.raw).hexdigest())
        self.id=self.created['outline']['id']
        self.created=self.call('outline_mutate',id=self.id,revision=self.created['revision'],change={'kind':'add_region','start':[0,1],'end':[0,4]})
        self.region=self.created['outline']['regions'][0]['id']
        self.ref=self.call('outline_reference',id=self.id,revision=self.created['revision'],region=self.region)['reference']
        self.whole=self.call('outline_reference',id=self.id,revision=self.created['revision'],region=None)['reference']
        self.call('outline_update_note',id=self.id,revision=None,change=dict(id=None,reference=self.ref,url='obsidian://open?vault=Zettelkasten&file=Note%20%CE%B1',label='Existing α note'))
        self.destination=self.base/'moved artifacts α'
        self.unrelated=self.home/'state.vscdb';self.unrelated.write_bytes(b'unrelated VS Code state')
        self.original=inventory(self.home,legacy=True)

    def call(self, method, **extra):
        return dispatch(dict(protocol=1,method=method,artifact_home=str(self.home),artifact_epoch=self.epoch,
                             store=str(self.store),project_root=str(self.root),**extra))

    def control(self,method,**extra):
        return dispatch(dict(protocol=1,method=method,artifact_home=str(self.home),**extra))

    def move(self):
        plan=self.control('artifact_plan',destination=str(self.destination),roots=[str(self.root)])
        result=self.control('artifact_move',destination=str(self.destination),roots=[str(self.root)],manifest=plan['source_manifest'])
        self.epoch=result['epoch'];return result

    def test_move_pinned_links_notes_mutation_restart_and_old_payload_removal(self):
        moved=self.move();self.assertTrue(moved['committed']);self.assertFalse(moved['cleanup_pending'])
        self.assertEqual(inventory(self.home,legacy=True),{})
        self.assertEqual(self.unrelated.read_bytes(),b'unrelated VS Code state')
        self.assertEqual(self.source.read_bytes(),self.raw)
        followed=self.call('outline_follow_reference',reference=self.ref)
        self.assertEqual(followed['document']['text'].encode(),self.raw)
        self.assertEqual(followed['document']['start'],[0,1]);self.assertEqual(followed['document']['end'],[0,4])
        self.assertEqual(self.call('outline_follow_reference',reference=self.whole)['outline']['id'],self.id)
        notes=self.call('outline_notes',id=self.id);self.assertEqual(notes['links'][0]['reference'],self.ref)
        self.assertEqual(notes['links'][0]['label'],'Existing α note')
        saved=self.call('outline_mutate',id=self.id,revision=followed['revision'],change=dict(kind='annotation',region=None,id=None,purpose='question',text='Reader α prose',origin='human_work',author='reader'))
        self.assertEqual(saved['outline']['annotations'][0]['text'],'Reader α prose')
        latest=self.call('outline_reference',id=self.id,revision=saved['revision'],region=self.region)['reference']
        self.assertNotEqual(latest,self.ref) # New copies use the logical store identity.
        self.assertEqual(self.call('outline_follow_reference',reference=latest)['document'],followed['document'])
        self.assertEqual(self.call('outline_notes',id=self.id,reference=latest)['selected_links'],notes['links'])
        restarted=ArtifactStorage(str(self.home));self.assertEqual(restarted.status()['store_id'],moved['store_id'])
        self.assertFalse(any('/locks/' in p for p in inventory(self.destination)))

    def test_retained_diagram_moves_with_its_annotation_and_stale_render_is_refused(self):
        from theorem_terminal.reader_diagrams import checked_svg
        code = '```tikz\n\\begin{tikzpicture}\\draw (0,0)--(1,1);\\end{tikzpicture}\n```'
        saved = self.call('outline_mutate',id=self.id,revision=self.created['revision'],change=dict(
            kind='annotation',region=None,id=None,purpose='explanation',text=code,origin='human_work',author='Reader'))
        note=saved['outline']['annotations'][0];block=next(b for b in note['fragments'] if b['kind']=='tikz')
        svg=checked_svg(b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M0 0L20 20"/></svg>')
        request=dict(id=self.id,revision=saved['revision'],annotation=note['id'],code=block['key'])
        with patch('theorem_terminal.reader_diagrams.compile_tikz',return_value=(svg,dict(pdflatex='1'*64,pdftocairo='2'*64))):
            rendered=self.call('outline_render_diagram',**request)
        image=next(b for b in rendered['outline']['annotations'][0]['fragments'] if b['kind']=='tikz')['image']
        self.move()
        with patch('theorem_terminal.reader_diagrams.compile_tikz',side_effect=AssertionError('Implicit compiler')):
            reopened=self.call('outline_follow_reference',reference=self.ref)
            self.assertEqual(next(b for b in reopened['outline']['annotations'][0]['fragments'] if b['kind']=='tikz')['image'],image)
            self.epoch='legacy'
            with self.assertRaisesRegex(ValueError,'stale client'):self.call('outline_render_diagram',**request)

    def test_location_aliases_do_not_rewrite_human_prose_or_source_provenance(self):
        from theorem_terminal.artifact_context import CURRENT, stable_paths
        from theorem_terminal.artifact_storage import StoreAccess
        self.move();ident,head,raw,payload=self.manager.load(self.destination)
        literal=str(payload/'a path discussed by the reader α')
        original=dict(summary={'question':literal,'last_conclusion':literal},body=literal,
                      outline={'source':{'path':literal},'annotations':[{'text':literal}]},
                      parent={'path':str(payload/'model-calls/parent.json')},store=str(payload/'investigation-x'))
        token=CURRENT.set(StoreAccess(self.manager,ident,payload))
        try: result=stable_paths(original)
        finally: CURRENT.reset(token)
        self.assertEqual(result['summary'],original['summary']);self.assertEqual(result['body'],literal)
        self.assertEqual(result['outline'],original['outline'])
        self.assertEqual(result['parent']['path'],str(self.home/'model-calls/parent.json'))
        self.assertEqual(result['store'],str(self.home/'investigation-x'))

    def test_stale_client_invalid_settings_and_unavailable_store_do_not_initialize(self):
        self.move();self.epoch='legacy'
        with self.assertRaisesRegex(ValueError,'stale client'):
            self.call('outline_mutate',id=self.id,revision=self.created['revision'],change={'kind':'add_region','start':[0,0],'end':[0,1]})
        self.destination.rename(self.base/'temporarily offline')
        with self.assertRaisesRegex(ValueError,'unavailable'):
            self.call('outline_list')
        self.assertFalse(self.destination.exists());self.assertFalse((self.store/self.id/'outline.json').exists())

    def test_invalid_destinations_and_source_change_after_confirmation(self):
        for dest in [self.home,self.home/'child',self.base,self.source,self.base/'existing']:
            if dest.name=='existing':dest.mkdir();(dest/'keep').write_text('unrelated')
            with self.subTest(dest=dest),self.assertRaises((ValueError,OSError)):
                self.control('artifact_plan',destination=str(dest),roots=[str(self.root)])
        link=self.base/'redirect';link.symlink_to(self.base,target_is_directory=True)
        with self.assertRaisesRegex(ValueError,'redirected'):
            self.control('artifact_plan',destination=str(link/'target'),roots=[str(self.root)])
        plan=self.control('artifact_plan',destination=str(self.destination),roots=[str(self.root)])
        (self.store/self.id/'outline.json').write_bytes((self.store/self.id/'outline.json').read_bytes()+b' ')
        with self.assertRaisesRegex(ValueError,'changed since confirmation'):
            self.control('artifact_move',destination=str(self.destination),roots=[str(self.root)],manifest=plan['source_manifest'])
        self.assertFalse(self.destination.exists())
        plan=self.control('artifact_plan',destination=str(self.destination),roots=[str(self.root)])
        before_collision=inventory(self.home,legacy=True)
        def collision(at):
            if at=='before_copy':
                self.destination.mkdir();(self.destination/'unrelated').write_bytes(b'Preserve raced destination')
        manager=ArtifactStorage(str(self.home),checkpoint=collision)
        with manager.exclusive(),self.assertRaises(FileExistsError):
            manager.move(str(self.destination),[str(self.root)],plan['source_manifest'])
        self.assertEqual(inventory(self.home,legacy=True),before_collision)
        self.control('artifact_recover')
        self.assertEqual((self.destination/'unrelated').read_bytes(),b'Preserve raced destination')
        self.assertEqual(self.manager.status()['location'],str(self.home))

    def test_real_process_interruption_at_each_transaction_boundary(self):
        phases=['before_copy','staging_created','copy_file','verified_destination','destination_published','before_binding','binding_replaced','before_cleanup','after_cleanup']
        for phase in phases:
            with self.subTest(phase=phase):
                # Each phase owns a fresh representative legacy store.
                fixture=ArtifactStorageTests('test_move_pinned_links_notes_mutation_restart_and_old_payload_removal');fixture.setUp()
                try:
                    plan=fixture.control('artifact_plan',destination=str(fixture.destination),roots=[str(fixture.root)])
                    proc=multiprocessing.get_context('fork').Process(target=interrupted_move,args=(str(fixture.home),str(fixture.destination),[str(fixture.root)],plan['source_manifest'],phase));proc.start();proc.join(15)
                    self.assertFalse(proc.is_alive());self.assertEqual(proc.exitcode,73)
                    status=fixture.control('artifact_status');self.assertTrue(status['recovery_required'])
                    recovered=fixture.control('artifact_recover');fixture.epoch=recovered['epoch']
                    committed=phase in ('binding_replaced','before_cleanup','after_cleanup')
                    self.assertEqual(Path(recovered['location']),fixture.destination if committed else fixture.home)
                    self.assertEqual(fixture.call('outline_follow_reference',reference=fixture.ref)['document']['text'].encode(),fixture.raw)
                    self.assertEqual(fixture.unrelated.read_bytes(),b'unrelated VS Code state')
                    if committed:self.assertEqual(inventory(fixture.home,legacy=True),{})
                    else:self.assertEqual(inventory(fixture.home,legacy=True),fixture.original)
                finally:fixture.doCleanups()

    def test_permission_disk_full_and_directory_sync_failures_leave_original_active(self):
        plan=self.control('artifact_plan',destination=str(self.destination),roots=[str(self.root)])
        for failure in [PermissionError('permission denied'),OSError(28,'No space left on device')]:
            with self.subTest(failure=failure):
                def checkpoint(at):
                    if at=='copy_file':raise failure
                manager=ArtifactStorage(str(self.home),checkpoint=checkpoint)
                with manager.exclusive(),self.assertRaises(OSError):manager.move(str(self.destination),[str(self.root)],plan['source_manifest'])
                self.assertEqual(manager.status()['location'],str(self.home));self.assertEqual(inventory(self.home,legacy=True),self.original)
                self.control('artifact_recover');self.destination=self.base/('next-'+str(len(list(self.base.iterdir()))))
                plan=self.control('artifact_plan',destination=str(self.destination),roots=[str(self.root)])

    def test_binding_replaced_but_sync_uncertain_blocks_and_recovers_new_authority(self):
        from theorem_terminal.mutable_files import save_mutable
        plan=self.control('artifact_plan',destination=str(self.destination),roots=[str(self.root)])
        def publication(path,*args,**kwargs):
            if path==self.manager.binding_path:
                with patch('theorem_terminal.mutable_files.sync_directory',side_effect=OSError('binding sync uncertain')):
                    return save_mutable(path,*args,**kwargs)
            return save_mutable(path,*args,**kwargs)
        with patch('theorem_terminal.artifact_storage.save_mutable',side_effect=publication),self.assertRaisesRegex(OSError,'uncertain'):
            self.control('artifact_move',destination=str(self.destination),roots=[str(self.root)],manifest=plan['source_manifest'])
        self.assertTrue(self.manager.binding_path.exists());self.assertEqual(inventory(self.home,legacy=True),self.original)
        with self.assertRaisesRegex(ValueError,'recovery'):self.call('outline_list')
        result=self.control('artifact_recover');self.epoch=result['epoch']
        self.assertEqual(result['location'],str(self.destination));self.assertEqual(inventory(self.home,legacy=True),{})
        self.call('outline_follow_reference',reference=self.ref)

    def test_cleanup_preserves_changed_and_unrelated_files_then_repeats_safely(self):
        plan=self.control('artifact_plan',destination=str(self.destination),roots=[str(self.root)])
        original_path=self.store/self.id/'outline.json';raw=original_path.read_bytes()
        def checkpoint(at):
            if at=='before_cleanup':original_path.write_bytes(b'external changed copy')
        manager=ArtifactStorage(str(self.home),checkpoint=checkpoint)
        with manager.exclusive():result=manager.move(str(self.destination),[str(self.root)],plan['source_manifest'])
        self.assertTrue(result['committed']);self.assertTrue(result['cleanup_pending']);self.assertIn('Move committed',result['message'])
        self.assertEqual(original_path.read_bytes(),b'external changed copy')
        self.assertEqual(self.manager.status()['location'],str(self.destination))
        # Explicit restoration of the inventoried bytes, same inode, permits retry.
        original_path.write_bytes(raw)
        result=self.control('artifact_recover');self.epoch=result['epoch'];self.assertFalse(result['cleanup_pending'])
        self.call('outline_follow_reference',reference=self.ref);self.assertTrue(self.unrelated.exists())

    def test_source_change_during_copy_prevents_binding_commit(self):
        plan=self.control('artifact_plan',destination=str(self.destination),roots=[str(self.root)])
        changed=False
        def checkpoint(at):
            nonlocal changed
            if at=='copy_file' and not changed:
                changed=True;(self.store/self.id/'outline.json').write_bytes((self.store/self.id/'outline.json').read_bytes()+b' ')
        manager=ArtifactStorage(str(self.home),checkpoint=checkpoint)
        with manager.exclusive(),self.assertRaisesRegex(ValueError,'changed'):
            manager.move(str(self.destination),[str(self.root)],plan['source_manifest'])
        self.assertFalse(manager.binding_path.exists());self.assertEqual(manager.status()['location'],str(self.home))
        self.control('artifact_recover')

    def test_adoption_different_path_scope_mapping_incomplete_conflict_and_no_merge(self):
        self.move();copied=self.base/'receiving synchronized copy';shutil.copytree(self.destination,copied)
        receiver=self.base/'receiver host';receiver.mkdir();local=self.base/'different local project';local.mkdir()
        def control(method,**extra):return dispatch(dict(protocol=1,method=method,artifact_home=str(receiver),**extra))
        inspected=control('artifact_inspect',destination=str(copied));self.assertTrue(inspected['store_id'])
        adopted=control('artifact_adopt',destination=str(copied),mapping={str(local):str(self.root)},store_id=inspected['store_id'],head_hash=inspected['head_hash'])
        other_store=receiver/('outlines-'+sha256(str(local).encode()).hexdigest())
        value=dispatch(dict(protocol=1,method='outline_follow_reference',artifact_home=str(receiver),artifact_epoch=adopted['epoch'],store=str(other_store),project_root=str(local),reference=self.ref))
        self.assertEqual(value['document']['text'].encode(),self.raw)
        match=control('artifact_match_reference',reference=self.ref,project=str(self.root),local_root=str(local));self.assertTrue(match['matches'])
        # A copied link from the receiving computer also routes back to the
        # original computer through the same verified project identity.
        self.assertTrue(self.control('artifact_match_reference',reference=self.ref,project=str(local),local_root=str(self.root))['matches'])
        self.assertFalse(control('artifact_match_reference',reference=self.ref.replace(self.ref.split('/')[1],'a'*64),project=str(self.root),local_root=str(local))['matches'])
        with self.assertRaisesRegex(ValueError,'already has saved'):control('artifact_adopt',destination=str(copied),mapping={str(local):str(self.root)},store_id=inspected['store_id'],head_hash=inspected['head_hash'])
        ident,head,raw,payload=ArtifactStorage(str(receiver)).load(copied)
        blob=next(payload.glob('outlines-*/*/source-*.bin'));blob.unlink()
        with self.assertRaisesRegex(ValueError,'incomplete synchronization.*Finish synchronization'):
            control('artifact_inspect',destination=str(copied))
        blob.write_bytes(self.raw);(copied/'HEAD.sync-conflict-test.json').write_text('{}')
        with self.assertRaisesRegex(ValueError,'Conflicting'):control('artifact_inspect',destination=str(copied))

    def test_second_relocation_preserves_legacy_and_logical_links(self):
        self.move();view=self.call('outline_follow_reference',reference=self.ref)
        logical=self.call('outline_reference',id=self.id,revision=view['revision'],region=self.region)['reference']
        old=self.destination;self.destination=self.base/'moved again';self.move()
        self.assertFalse((old/'HEAD.json').exists());self.assertFalse((old/'store.json').exists())
        self.call('outline_follow_reference',reference=self.ref);self.call('outline_follow_reference',reference=logical)

    def test_migration_exclusion_and_wrong_workspace_are_not_disabled(self):
        with self.manager.exclusive(),self.assertRaisesRegex(ValueError,'Another process'):
            self.call('outline_list')
        self.move();wrong=self.base/'wrong';wrong.mkdir()
        with self.assertRaisesRegex(ValueError,'Wrong workspace'):
            dispatch(dict(protocol=1,method='outline_list',artifact_home=str(self.home),store=str(self.store),project_root=str(wrong)))

    def test_two_local_workspace_bindings_share_store_exclusion(self):
        self.move()
        receiver=self.base/'another workspace home';receiver.mkdir()
        inspected=self.control('artifact_inspect',destination=str(self.destination))
        dispatch(dict(protocol=1,method='artifact_adopt',artifact_home=str(receiver),
                      destination=str(self.destination),mapping={str(self.root):str(self.root)},
                      store_id=inspected['store_id'],head_hash=inspected['head_hash']))
        other=ArtifactStorage(str(receiver))
        self.assertEqual(other.coordination,self.manager.coordination)
        with self.manager.exclusive(),self.assertRaisesRegex(ValueError,'Another process'):
            with other.exclusive(): self.fail('Concurrent access to the same local store was accepted')
        with other.exclusive():
            self.assertEqual(other.status()['store_id'],self.manager.status()['store_id'])

    def test_required_external_model_call_dependencies_resume_without_originals(self):
        from theorem_terminal.editor_assistance import assistance_action
        from theorem_terminal.openai_response import TransportResult
        external=self.base/'external parent.json';external.write_bytes((Path(__file__).parent/'fixtures/mechanical_model_call.json').read_bytes())
        child=self.home/'model-calls'/'child.json';child.parent.mkdir()
        inv=self.home/('investigation-'+sha256(str(self.root).encode()).hexdigest())
        draft=dict(project_root=str(self.root),store=str(inv),state_revision=None,parent={'path':str(external),'revision':sha256(external.read_bytes()).hexdigest()},passage_numbers=[1],contexts=[],question='Fixture continuation',correction='',last_conclusion='Saved human conclusion',unresolved_issue='',model='deterministic-only',output=str(child),exchange_id='dependency-fixture')
        preview=dispatch(dict(protocol=1,method='prepare_assistance',draft=draft))['preview']
        response=dict(object='response',id='fixture',model='deterministic',status='completed',output=[dict(type='message',role='assistant',status='completed',content=[dict(type='output_text',text='Fixture response.',annotations=[])])])
        with patch.dict(os.environ,{'OPENAI_API_KEY':'synthetic'}):
            sent=assistance_action(dict(method='send_assistance',draft=draft,preview=preview,confirmation='SEND'),transport=lambda *args:TransportResult(200,json.dumps(response).encode()))
        original=external.read_bytes();self.move();self.assertEqual(external.read_bytes(),original);external.unlink()
        result=dispatch(dict(protocol=1,method='resume_investigation',artifact_home=str(self.home),artifact_epoch=self.epoch,store=str(inv),project_root=str(self.root),revision=sent['investigation']['revision']))
        self.assertIn('Saved human conclusion',result['body']);self.assertIn('Child terminal status: completed',result['body'])
        self.assertNotIn('missing or changed',result['body']);self.assertEqual(result['active']['parent']['path'],str(external))
        # A receiving installation has another workspace path and no original
        # project directory or external parent file. Its retained records must
        # still support explicit resume and saving the human task summary.
        copied=self.base/'received research';shutil.copytree(self.destination,copied)
        receiver=self.base/'receiving host';receiver.mkdir()
        local=self.base/'receiving project';local.mkdir()
        self.root.rename(self.base/'old project unavailable')
        def control(method,**extra):
            return dispatch(dict(protocol=1,method=method,artifact_home=str(receiver),**extra))
        checked=control('artifact_inspect',destination=str(copied))
        opened=control('artifact_adopt',destination=str(copied),mapping={str(local):str(self.root)},
                       store_id=checked['store_id'],head_hash=checked['head_hash'])
        receiver_inv=receiver/('investigation-'+sha256(str(local).encode()).hexdigest())
        request=dict(protocol=1,artifact_home=str(receiver),artifact_epoch=opened['epoch'],
                     store=str(receiver_inv),project_root=str(local),revision=result['revision'])
        resumed=dispatch(dict(request,method='resume_investigation'))
        self.assertIn('Saved human conclusion',resumed['body']);self.assertNotIn('missing or changed',resumed['body'])
        summary={**resumed['active']['summary'],'unresolved_issue':'Continued on this computer'}
        updated=dispatch(dict(request,method='update_investigation',summary=summary))
        self.assertEqual(updated['active']['summary']['unresolved_issue'],'Continued on this computer')

    def test_unrelated_files_inside_old_outline_are_preserved_and_pinned_range_stays_exact(self):
        unrelated=self.store/self.id/'ordinary-user-note.md';unrelated.write_text('Preserve this unrelated file')
        self.move();self.assertEqual(unrelated.read_text(),'Preserve this unrelated file')
        loaded=self.call('outline_follow_reference',reference=self.ref)
        self.call('outline_mutate',id=self.id,revision=loaded['revision'],change=dict(kind='replace_region',region=self.region,start=[1,0],end=[1,6]))
        earlier=self.call('outline_follow_reference',reference=self.ref)
        self.assertEqual(earlier['reference']['status'],'changed or removed')
        self.assertEqual(earlier['document']['start'],[0,1]);self.assertEqual(earlier['document']['end'],[0,4])
        self.assertEqual(self.call('outline_notes',id=self.id)['links'][0]['reference'],self.ref)
        current=self.call('outline_reference',id=self.id,revision=earlier['revision'],region=self.region)['reference']
        self.assertEqual(self.call('outline_notes',id=self.id,reference=current)['selected_links'],[])
        self.assertEqual(len(self.call('outline_notes',id=self.id,reference=self.ref)['selected_links']),1)

    def test_updated_independent_publishers_reject_retired_paths(self):
        self.move()
        from theorem_terminal.private_persistence import persist_private_new
        from theorem_terminal.mutable_files import save_mutable
        with self.assertRaisesRegex(ValueError,'retired locator'):
            persist_private_new(self.home/'model-calls'/'stale.json',b'{}')
        with self.assertRaisesRegex(ValueError,'retired locator'):
            save_mutable(self.store/'stale.json',b'{}',previous=None,lock_root=self.store/'locks')
        self.assertFalse((self.home/'model-calls'/'stale.json').exists())

    def test_retained_evidence_survives_relocation_without_the_original(self):
        evidence=self.base/'supplied evidence.txt';evidence.write_bytes('Unchanged supplied evidence α'.encode())
        attached=self.call('outline_attach',id=self.id,revision=self.created['revision'],path=str(evidence),artifact_revision=sha256(evidence.read_bytes()).hexdigest(),kind='supporting_artifact',label='Supplied fixture',region=self.region,selector=None)
        artifact=attached['outline']['artifacts'][0]['id'];raw=evidence.read_bytes()
        self.move();evidence.unlink();view=self.call('outline_follow_reference',reference=self.ref)
        self.assertEqual(self.call('outline_document',id=self.id,revision=view['revision'],artifact=artifact)['text'].encode(),raw)

    def test_managed_explicit_send_keeps_pending_reservation_durable_before_transport(self):
        from theorem_terminal.editor_assistance import assistance_action
        from theorem_terminal.openai_response import TransportResult
        self.move()
        parent=self.base/'selected parent.json';parent.write_bytes((Path(__file__).parent/'fixtures/mechanical_model_call.json').read_bytes())
        inv=self.home/('investigation-'+sha256(str(self.root).encode()).hexdigest())
        draft=dict(project_root=str(self.root),store=str(inv),state_revision=None,parent={'path':str(parent),'revision':sha256(parent.read_bytes()).hexdigest()},passage_numbers=[1],contexts=[],question='Saved fixture question',correction='',last_conclusion='Saved summary',unresolved_issue='',model='deterministic-only',output=str(self.home/'model-calls'/'after-move.json'),exchange_id='after-move')
        def action(method,**extra):return dispatch(dict(protocol=1,method=method,artifact_home=str(self.home),artifact_epoch=self.epoch,**extra))
        preview=action('prepare_assistance',draft=draft)['preview']
        observed=[]
        def transport(*args):
            ident,head,head_raw,payload=self.manager.load(self.destination)
            pending=read_json(payload/('investigation-'+sha256(str(self.root).encode()).hexdigest())/'active.json')['active']
            self.assertEqual(pending['phase'],'pending');self.assertEqual(pending['child']['path'],draft['output'])
            self.assertEqual(read_json(self.manager.journal)['operation'],'send')
            self.assertFalse(any('.reserve' in n for n in inventory(self.destination)))
            observed.append('durable pending before transport')
            response=dict(object='response',id='fixture',model='deterministic',status='completed',output=[dict(type='message',role='assistant',status='completed',content=[dict(type='output_text',text='Retained fixture result.',annotations=[])])])
            return TransportResult(200,json.dumps(response).encode())
        with patch.dict(os.environ,{'OPENAI_API_KEY':'synthetic'}),patch('theorem_terminal.editor_bridge.assistance_action',side_effect=lambda r:assistance_action(r,transport=transport)):
            result=action('send_assistance',draft=draft,preview=preview,confirmation='SEND')
        self.assertEqual(observed,['durable pending before transport'],result);self.assertEqual(result['status'],'completed')
        self.assertFalse(self.manager.journal.exists())
        resumed=dispatch(dict(protocol=1,method='resume_investigation',artifact_home=str(self.home),artifact_epoch=self.epoch,store=str(inv),project_root=str(self.root),revision=result['investigation']['revision']))
        self.assertIn('Child terminal status: completed',resumed['body']);self.assertNotIn('missing or changed',resumed['body'])

    def test_interrupted_managed_send_recovers_retained_record_without_retry(self):
        from theorem_terminal.editor_assistance import assistance_action
        from theorem_terminal.editor_investigation import InvestigationStore
        from theorem_terminal.openai_response import TransportResult
        self.move()
        parent=self.base/'parent for interruption.json';parent.write_bytes((Path(__file__).parent/'fixtures/mechanical_model_call.json').read_bytes())
        inv=self.home/('investigation-'+sha256(str(self.root).encode()).hexdigest())
        draft=dict(project_root=str(self.root),store=str(inv),state_revision=None,parent={'path':str(parent),'revision':sha256(parent.read_bytes()).hexdigest()},passage_numbers=[1],contexts=[],question='Interrupted fixture',correction='',last_conclusion='Keep summary',unresolved_issue='',model='deterministic',output=str(self.home/'model-calls'/'interrupted.json'),exchange_id='interrupted')
        preview=dispatch(dict(protocol=1,method='prepare_assistance',artifact_home=str(self.home),artifact_epoch=self.epoch,draft=draft))['preview']
        original_publish=InvestigationStore.publish
        def worker():
            def publish(store,active):
                if active and active['phase']=='terminal':os._exit(74)
                return original_publish(store,active)
            response=dict(object='response',id='fixture',model='deterministic',status='completed',output=[dict(type='message',role='assistant',status='completed',content=[dict(type='output_text',text='Exact interrupted result.',annotations=[])])])
            with patch.dict(os.environ,{'OPENAI_API_KEY':'synthetic'}),patch.object(InvestigationStore,'publish',publish),patch('theorem_terminal.editor_bridge.assistance_action',side_effect=lambda r:assistance_action(r,transport=lambda *args:TransportResult(200,json.dumps(response).encode()))):
                dispatch(dict(protocol=1,method='send_assistance',artifact_home=str(self.home),artifact_epoch=self.epoch,draft=draft,preview=preview,confirmation='SEND'))
        process=multiprocessing.get_context('fork').Process(target=worker);process.start();process.join(15)
        self.assertFalse(process.is_alive());self.assertEqual(process.exitcode,74)
        with self.assertRaisesRegex(ValueError,'recovery'):self.call('outline_list')
        result=self.control('artifact_recover');self.assertIn('no request was retried',result['message'])
        state=dispatch(dict(protocol=1,method='investigation_state',artifact_home=str(self.home),artifact_epoch=self.epoch,store=str(inv),project_root=str(self.root)))
        self.assertEqual(state['active']['phase'],'pending')
        resumed=dispatch(dict(protocol=1,method='resume_investigation',artifact_home=str(self.home),artifact_epoch=self.epoch,store=str(inv),project_root=str(self.root),revision=state['revision']))
        self.assertIn('Exact interrupted result.',resumed['body']);self.assertEqual(resumed['active']['phase'],'terminal')

if __name__=='__main__':unittest.main()
