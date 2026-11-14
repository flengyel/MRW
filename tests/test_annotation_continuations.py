"""One selected annotation; fixture notes only. No Obsidian/AI/compiler needed."""
from copy import deepcopy
from hashlib import sha256
from pathlib import Path
import base64
import json
import tempfile
import unittest
from unittest.mock import patch
from mrw.editor_bridge import dispatch
from mrw.outline_references import parse_reference


class AnnotationContinuationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.home = Path(self.temp.name); self.root = self.home/'workspace'; self.root.mkdir()
        self.vault = self.home/'Notes α'; self.vault.mkdir()
        self.file = self.vault/'old.ID.md'
        self.before = '---\nid: old.ID\ntitle: old.ID Algebra α\nreference-section-title: References\n---\n# Algebra α\n\nEarlier prose [@citation].\n\n## SEE ALSO\n\n[[0000.0000.0ABC]] A-B-C\n[[Related]]\n#tag\n\n## Research\n\nEarlier reference.\n'
        self.file.write_text(self.before)
        self.neighbor = self.vault/'Other.md'; self.neighbor.write_text('untouched')
        self.base = dict(store=str(self.home/'private'),project_root=str(self.root))
        source = self.root/'source.txt'; source.write_text('Statement α.\nProof 😀.\n')
        self.model = self.call('outline_create',path=str(source),source_revision=sha256(source.read_bytes()).hexdigest())
        self.oid = self.model['outline']['id']
        self.model = self.mutate(dict(kind='add_region',start=[1,0],end=[1,8]))
        self.rid = self.model['outline']['regions'][0]['id']
        self.original = 'The map $x \\mapsto (x,s(f(x)))$ is continuous.\n\n```tikz\n\\begin{tikzcd} X \\arrow[r] & Y \\end{tikzcd}\n```\n\n[Dependency](relative/note.md) 😀'
        self.model = self.mutate(dict(kind='annotation',region=self.rid,id=None,purpose='explanation',text=self.original,origin='ai_proposal',author='Supplied author'))
        self.note = {k:v for k,v in self.model['outline']['regions'][0]['annotations'][0].items() if k != 'fragments'}
        self.ref = self.call('outline_reference',id=self.oid,revision=self.model['revision'],region=self.rid)['reference']
        target=dict(workspace=self.root.as_uri(),project=str(self.root),reference=self.ref)
        self.link='vscode://flengyel.mrw/outline?v=1&target='+base64.urlsafe_b64encode(json.dumps(target).encode()).decode().rstrip('=')
        self.dest=dict(root=str(self.vault),file=self.file.name,url='obsidian://open?vault=Notes%20%CE%B1&file=old.ID.md',label='Algebra α')

    def call(self, method, **fields):
        return dispatch(dict(protocol=1,method=method,**self.base,**fields))
    def mutate(self, change):
        return self.call('outline_mutate',id=self.oid,revision=self.model['revision'],change=change)
    def notes(self): return self.call('outline_notes',id=self.oid)
    def change(self,operation,data=None,revision=None):
        result=self.call('outline_continue_note',id=self.oid,revision=self.notes()['revision'] if revision is None else revision,
            change=dict(operation=operation,annotation=self.note['id'],outline_revision=self.model['revision'],data=data or {}))
        return result
    def prepare(self,policy='zettel',presentation='verbatim'):
        return self.change('prepare',dict(destination=self.dest,policy=policy,presentation=presentation,return_link=self.link,destination_revision=sha256(self.file.read_bytes()).hexdigest()))['continuations'][0]
    def paste(self,record):
        content=self.before.replace('## SEE ALSO',record['body']+'## SEE ALSO').replace('Earlier reference.',record['research']+'Earlier reference.')
        self.file.write_text(content); return content
    def finish(self):
        return self.change('complete',dict(destination_revision=sha256(self.file.read_bytes()).hexdigest(),validation=dict(tool='/chosen/zettel_validate.py',revision='1'*64,section='Research')))

    def test_exact_original_reference_two_directions_restart_and_current_editor(self):
        record=self.prepare();self.paste(record);completed=self.finish()
        self.assertEqual(record['original'],self.note)
        self.assertEqual(record['original']['text'],self.original)
        self.assertEqual(record['outline_revision'],self.model['revision'])
        self.assertEqual(record['reference'],self.ref)
        links=self.notes()['links'];self.assertEqual(links[0]['reference'],self.ref)
        self.assertEqual(links[0]['url'],self.dest['url'])
        followed=self.call('outline_follow_reference',reference=record['reference'])
        self.assertEqual(followed['document']['start'],[1,0])
        self.assertEqual(self.notes()['continuations'][0]['phase'],'complete')
        self.assertEqual({k:v for k,v in self.call('outline_load',id=self.oid)['outline']['regions'][0]['annotations'][0].items() if k != 'fragments'},self.note)
        self.file.write_text(self.file.read_text()+'\nLater independent writing.\n')
        # Restart/read neither recopies original nor applies its attribution to new writing.
        self.assertEqual(self.notes(),self.notes());self.assertIn('Later independent',self.file.read_text())
        with self.assertRaisesRegex(ValueError,'external continuation'):
            self.mutate(dict(kind='annotation',region=self.rid,id=self.note['id'],purpose='explanation',text='second editor',origin='human_work',author=None))
        self.assertEqual(self.neighbor.read_text(),'untouched')

    def test_repeat_prepare_complete_and_duplicate_insertion_refused(self):
        r=self.prepare(); before=self.file.read_bytes()
        with self.assertRaisesRegex(ValueError,'already'): self.prepare()
        self.assertEqual(self.file.read_bytes(),before)
        self.paste(r);self.file.write_text(self.file.read_text()+r['body'])
        with self.assertRaisesRegex(ValueError,'exactly one'): self.finish()
        self.assertEqual(self.notes()['continuations'][0]['phase'],'pending')
        self.paste(r); self.finish()
        with self.assertRaisesRegex(ValueError,'already'): self.finish()

    def test_cancel_and_failed_link_preserve_saved_text_and_pending_recovers(self):
        r=self.prepare();self.paste(r);saved=self.file.read_bytes()
        with patch('mrw.outline_notes.save_mutable',side_effect=OSError('interrupted link save')):
            result=self.finish()
        self.assertTrue(result['blocked']);self.assertEqual(self.file.read_bytes(),saved)
        self.assertEqual(self.notes()['continuations'][0]['phase'],'pending')
        self.finish();self.assertEqual(self.file.read_bytes(),saved)
        self.assertEqual(len(self.notes()['links']),1)

    def test_unsaved_missing_text_and_concurrent_source_or_destination_edits_stop_completion(self):
        r=self.prepare()
        with self.assertRaisesRegex(ValueError,'Save exactly'): self.finish()
        self.paste(r);self.file.write_text(self.file.read_text().replace('Earlier prose','Changed prose'))
        with self.assertRaisesRegex(ValueError,'beyond'): self.finish()
        self.paste(r)
        self.model=self.mutate(dict(kind='annotation',region=self.rid,id=self.note['id'],purpose='explanation',text='New original',origin='human_work',author=None))
        with self.assertRaisesRegex(ValueError,'annotation changed'): self.finish()
        self.change('cancel');self.assertEqual(self.notes()['continuations'],[])
        self.assertIn(self.original,self.file.read_text())

    def test_stale_revisions_and_redirected_paths_are_rejected(self):
        with self.assertRaisesRegex(ValueError,'changed'):
            self.change('prepare',dict(destination=self.dest,policy='markdown',presentation='verbatim',return_link=self.link,destination_revision='0'*64))
        r=self.prepare(); old=self.notes()['revision'];self.paste(r);self.finish()
        with self.assertRaisesRegex(ValueError,'changed'): self.change('unlink',revision=old)
        self.file.unlink(); self.file.symlink_to(self.neighbor)
        with self.assertRaisesRegex(ValueError,'redirected'): self.change('relink',dict(destination=self.dest,destination_revision=sha256(b'untouched').hexdigest()))

    def test_rename_relink_unlink_delete_preserve_external_note_and_original_history(self):
        r=self.prepare();self.paste(r);self.finish()
        renamed=self.file.with_name('renamed.md');self.file.rename(renamed)
        self.assertEqual(self.notes()['continuations'][0]['phase'],'complete')
        dest={**self.dest,'file':renamed.name,'url':'obsidian://open?vault=Notes%20%CE%B1&file=renamed.md'}
        self.change('relink',dict(destination=dest,destination_revision=sha256(renamed.read_bytes()).hexdigest()))
        self.change('unlink'); self.assertEqual(self.notes()['links'],[])
        self.assertEqual(self.notes()['continuations'][0]['phase'],'unlinked')
        before=renamed.read_bytes()
        self.model=self.mutate(dict(kind='remove_annotation',region=self.rid,id=self.note['id']))
        self.assertEqual(renamed.read_bytes(),before)
        self.assertEqual(self.notes()['continuations'][0]['original'],self.note)

    def test_non_zettel_does_not_require_frontmatter_or_index_and_crlf_preserved(self):
        self.before='Ordinary Markdown.\r\n\r\nKeep this.\r\n'; self.file.write_bytes(self.before.encode())
        self.dest['url']=None
        r=self.prepare(policy='markdown'); self.file.write_bytes((self.before+r['body']+r['research']).encode())
        self.change('complete',dict(destination_revision=sha256(self.file.read_bytes()).hexdigest(),validation=None))
        self.assertEqual(self.notes()['links'],[]);self.assertEqual(self.notes()['continuations'][0]['phase'],'complete')
        self.assertTrue(self.file.read_bytes().startswith(self.before.encode()))

    def test_quote_wrapper_preserves_original_and_research_validation_is_required(self):
        self.model=self.mutate(dict(kind='annotation',region=self.rid,id=self.note['id'],purpose='explanation',text='# Own heading\n\n## SEE ALSO\n\n$x$\n',origin='human_work',author='α'))
        self.note={k:v for k,v in self.model['outline']['regions'][0]['annotations'][0].items() if k != 'fragments'}
        r=self.prepare(presentation='quote');self.assertIn('> # Own heading',r['body']);self.paste(r)
        with self.assertRaisesRegex(ValueError,'Validate'):
            self.change('complete',dict(destination_revision=sha256(self.file.read_bytes()).hexdigest(),validation=None))
        self.finish();self.assertEqual(self.notes()['continuations'][0]['original'],self.note)

    def test_fenced_section_examples_do_not_move_the_insertion_scope(self):
        self.before = self.before.replace('Earlier prose', '```text\n## SEE ALSO\n## Research\n```\n\nEarlier prose')
        self.file.write_text(self.before)
        r = self.prepare()
        self.file.write_text(self.before.replace('Earlier prose', r['body']+'Earlier prose').replace('Earlier reference.', r['research']+'Earlier reference.'))
        self.finish()

    def test_attribution_must_stay_inside_the_selected_manual_section(self):
        self.before += '\n## Unrelated section\nKeep this too.\n'
        self.file.write_text(self.before)
        r = self.prepare()
        self.file.write_text(self.before.replace('Earlier prose', r['body']+'Earlier prose')+r['research'])
        with self.assertRaisesRegex(ValueError, 'Place the annotation'):
            self.finish()
        self.assertEqual(self.notes()['continuations'][0]['phase'], 'pending')

    def test_generic_link_management_cannot_redirect_continuation(self):
        r=self.prepare();self.paste(r);self.finish()
        with self.assertRaisesRegex(ValueError,'beside'):
            self.call('outline_update_note',id=self.oid,revision=self.notes()['revision'],change=dict(id=r['association'],reference=self.ref,url=None,label=None))


class ManagedContinuationTests(unittest.TestCase):
    def test_managed_publication_failure_recovers_one_link_without_reinsertion(self):
        import test_artifact_storage as fixtures
        from mrw import artifact_storage
        fixture=fixtures.ArtifactStorageTests();fixture.setUp();self.addCleanup(fixture.doCleanups)
        fixture.move()
        saved=fixture.call('outline_load',id=fixture.id)
        saved=fixture.call('outline_mutate',id=fixture.id,revision=saved['revision'],change=dict(kind='annotation',region=fixture.region,id=None,purpose='explanation',text='Exact reader text α',origin='human_work',author='Reader'))
        annotation=saved['outline']['regions'][0]['annotations'][0]['id']
        ref=fixture.call('outline_reference',id=fixture.id,revision=saved['revision'],region=fixture.region)['reference']
        target=dict(workspace=fixture.root.as_uri(),project=str(fixture.root),reference=ref)
        link='vscode://flengyel.mrw/outline?v=1&target='+base64.urlsafe_b64encode(json.dumps(target).encode()).decode().rstrip('=')
        vault=fixture.base/'notes';vault.mkdir();file=vault/'ordinary.md';file.write_text('Keep this.\n')
        def notes():return fixture.call('outline_notes',id=fixture.id)
        def change(op,data):return fixture.call('outline_continue_note',id=fixture.id,revision=notes()['revision'],change=dict(operation=op,annotation=annotation,outline_revision=saved['revision'],data=data))
        change('prepare',dict(destination=dict(root=str(vault),file=file.name,url='obsidian://open?vault=notes&file=ordinary.md',label='Ordinary'),policy='markdown',presentation='verbatim',return_link=link,destination_revision=sha256(file.read_bytes()).hexdigest()))
        record=notes()['continuations'][0];file.write_text(file.read_text()+record['body']+record['research']);raw=file.read_bytes()
        head=(fixture.destination/'HEAD.json').read_bytes()
        real=artifact_storage.save_mutable
        def fail_head(path,*a,**kw):
            if Path(path).name=='HEAD.json':raise OSError('interrupted before authority publication')
            return real(path,*a,**kw)
        with patch.object(artifact_storage,'save_mutable',side_effect=fail_head),self.assertRaisesRegex(OSError,'interrupted'):
            change('complete',dict(destination_revision=sha256(raw).hexdigest(),validation=None))
        self.assertEqual((fixture.destination/'HEAD.json').read_bytes(),head)
        fixture.control('artifact_recover')
        self.assertEqual(notes()['continuations'][0]['phase'],'pending')
        change('complete',dict(destination_revision=sha256(raw).hexdigest(),validation=None))
        self.assertEqual(notes()['continuations'][0]['phase'],'complete')
        self.assertEqual(sum(i['id']==record['association'] for i in notes()['links']),1)
        self.assertEqual(file.read_bytes(),raw)
        self.assertEqual(fixture.call('outline_load',id=fixture.id)['revision'],saved['revision'])

    def test_qualified_source_identifier_remains_in_both_directions(self):
        import test_source_plugins as fixtures
        fixture=fixtures.SourcePluginTests();fixture.setUp();self.addCleanup(fixture.doCleanups)
        saved=fixture.imported();oid=saved['outline']['id'];rid=saved['outline']['regions'][1]['id']
        saved=fixture.call('outline_mutate',id=oid,revision=saved['revision'],change=dict(kind='annotation',region=rid,id=None,purpose='question',text='Why?',origin='human_work',author='Reader'))
        ref=fixture.call('outline_reference',id=oid,revision=saved['revision'],region=rid)['reference']
        self.assertTrue(ref.startswith('mrw-outline:v2/kerodon:000A/'))
        target=dict(workspace=fixture.root.as_uri(),project=str(fixture.root),reference=ref)
        link='vscode://flengyel.mrw/outline?v=1&target='+base64.urlsafe_b64encode(json.dumps(target).encode()).decode().rstrip('=')
        vault=fixture.base/'notes';vault.mkdir();file=vault/'note.md';file.write_text('Keep.\n')
        annotation=saved['outline']['regions'][1]['annotations'][0]['id']
        result=fixture.call('outline_continue_note',id=oid,revision=None,change=dict(operation='prepare',annotation=annotation,outline_revision=saved['revision'],data=dict(destination=dict(root=str(vault),file=file.name,url=None,label='Note'),policy='markdown',presentation='verbatim',return_link=link,destination_revision=sha256(file.read_bytes()).hexdigest())))
        record=result['continuations'][0];self.assertEqual(record['reference'],ref)
        file.write_text(file.read_text()+record['body']+record['research'])
        fixture.call('outline_continue_note',id=oid,revision=result['revision'],change=dict(operation='complete',annotation=annotation,outline_revision=saved['revision'],data=dict(destination_revision=sha256(file.read_bytes()).hexdigest(),validation=None)))
        self.assertEqual(fixture.call('outline_follow_reference',reference=record['reference'])['reference']['qualified_id'],'kerodon:000A')


if __name__ == '__main__': unittest.main()
