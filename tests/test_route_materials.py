from copy import deepcopy
from hashlib import sha256
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from mrw.route_materials import action, read, records, listing, compile_request
from mrw.route_pending import catalog, resume, stage
from mrw.route_records import digest, encode, run, successor, action as route_action
from mrw.editor_bridge import dispatch
from mrw.artifact_storage import ArtifactStorage

ROOT=Path(__file__).resolve().parents[1]
CACHE=os.environ.get('MRW_ROUTE_CHECKER_CACHE')

class SourceContexts(unittest.TestCase):
    def setUp(self):
        parent=ROOT/'.codex-work/artifact-storage-source-context-tests';parent.mkdir(parents=True,exist_ok=True)
        tmp=tempfile.TemporaryDirectory(dir=parent);self.addCleanup(tmp.cleanup)
        self.home=Path(tmp.name);self.project=self.home/'project';self.project.mkdir();self.store=self.home/'store'
        self.note=self.project/'note.md';self.note.write_text('# Injectivity\nIf f and g are injective, then g composed with f is injective.\n')
        self.original=self.note.read_bytes()
        self.sources=[dict(id='note:injections',title='Injective composition',reference=self.note.as_uri()+'#selection=0-85',source_revision=digest(self.original),sha256=digest(self.original),text=self.original.decode())]
        self.origin=dict(uri=self.note.as_uri(),revision=digest(self.original),start=0,end=10)

    def call(self,method,**fields):return action(self.store,str(self.project),dict(method='route_material_'+method,**fields))
    def create(self):return self.call('create',sources=self.sources,origin=self.origin)
    def proposed(self,material):
        source=self.sources[0]['id']
        return dict(schema='mrw.grounds-proposal',version=1,source_set=material['id'],attribution='Supplied Codex response; identity unverified',
            claims=[dict(id='I',title='Injectivity hypotheses',text='Let f:A→B and g:B→C be injective functions.',sources=[source]),dict(id='G',title='Composite is injective',text='Under those hypotheses, g ∘ f:A→C is injective.',sources=[source])],
            grounds=[dict(id='hypotheses',reason='h',premises=[],conclusion='I',sources=[source],scope='Only these functions.',rationale='The stated hypotheses.'),dict(id='argument',reason='a',premises=['I'],conclusion='G',sources=[source],scope='This composition claim.',rationale='If g(f(x))=g(f(y)), injectivity of g and then f gives x=y.')],goal='G')
    def imported(self):
        m=self.create();return self.call('import',revision=m['material_revision'],proposal=json.dumps(self.proposed(m['material'])))

    def test_capture_import_correction_restart_and_explicit_acceptance(self):
        m=self.imported();raw=m['material']['proposal'];before=deepcopy(m['material'])
        self.assertEqual(list(catalog(self.store,str(self.project))),[])
        corrected=self.call('edit',revision=m['material_revision'],claim='G',field='text',value='For injective f:A→B and g:B→C, the composite g ∘ f is injective.')
        self.assertEqual(corrected['material']['proposal'],raw);self.assertEqual(read(self.store,str(self.project),m['material_revision'])['material'],before)
        self.assertEqual(len(list(listing(self.store,str(self.project)))),1)
        script='import sys,json;from mrw.route_materials import read;print(json.dumps(read(*sys.argv[1:])))'
        child=subprocess.run(['/usr/bin/python3','-c',script,str(self.store),str(self.project),corrected['material_revision']],env=dict(os.environ,PYTHONPATH=str(ROOT/'src'),PATH='/usr/bin:/bin'),text=True,capture_output=True,check=True)
        self.assertEqual(json.loads(child.stdout),corrected)
        accepted=self.call('accept',revision=corrected['material_revision'],selected=['hypotheses','argument'])
        q=accepted['request'];self.assertEqual(q['context']['created_by'],dict(kind='person',id='local-reader'))
        self.assertEqual(q['claims'][1]['content_hash']['value'],digest(corrected['material']['review']['claims'][1]['text'].encode()))
        self.assertEqual(q['admissions'][1]['formula'][2][1][1]['content_hash'],q['claims'][0]['content_hash'])
        self.assertEqual(q['admissions'][1]['formula'][2][2][1]['content_hash'],q['claims'][1]['content_hash'])
        self.assertEqual(list(listing(self.store,str(self.project))),[])
        saved=resume(self.store,str(self.project),accepted['intent']);self.assertEqual(saved['material'],corrected['material_revision'])
        self.assertEqual(saved['request'],q);self.assertEqual(saved['origin'],self.origin);self.assertEqual(self.note.read_bytes(),self.original)

    def test_wrong_set_unknown_sources_and_malformed_proposals_never_replace_captures(self):
        m=self.create();value=self.proposed(m['material'])
        for mutate in [lambda v:v.update(source_set='another'),lambda v:v['claims'][0].update(sources=['outside']),lambda v:v['grounds'][0].update(premises=['unknown']),lambda v:v.update(attribution=''),lambda v:v.update(unknown=True)]:
            bad=deepcopy(value);mutate(bad)
            with self.assertRaises(ValueError):self.call('import',revision=m['material_revision'],proposal=json.dumps(bad))
        with self.assertRaises(ValueError):self.call('import',revision=m['material_revision'],proposal='{"schema":1,"schema":2}')
        self.assertEqual(len(list(records(self.store,str(self.project)))),1)
        self.assertEqual(read(self.store,str(self.project),m['material_revision']),m)

    def test_failed_and_uncertain_writes_preserve_prior_preparation(self):
        m=self.imported();args=dict(revision=m['material_revision'],claim='G',field='title',value='Changed')
        from mrw.route_materials import persist_private_new as real
        with patch('mrw.route_materials.persist_private_new',side_effect=OSError('not published')):
            with self.assertRaises(OSError):self.call('edit',**args)
        self.assertEqual(list(listing(self.store,str(self.project)))[0]['material_revision'],m['material_revision'])
        def uncertain(*a,**kw):real(*a,**kw);raise OSError('uncertain sync')
        with patch('mrw.route_materials.persist_private_new',side_effect=uncertain):
            with self.assertRaises(OSError):self.call('edit',**args)
        again=self.call('edit',**args);self.assertEqual(len(list(listing(self.store,str(self.project)))),1)
        with patch('mrw.route_pending.persist_private_new',side_effect=OSError('intent failed')):
            with self.assertRaises(OSError):self.call('accept',revision=again['material_revision'],selected=['argument'])
        self.assertEqual(list(catalog(self.store,str(self.project))),[]);self.assertEqual(len(list(listing(self.store,str(self.project)))),1)

    def test_uncertain_acceptance_reuses_exact_id_timestamp_and_selected_subset(self):
        m=self.imported()
        from mrw.route_pending import persist_private_new as real
        def uncertain(*a,**kw):real(*a,**kw);raise OSError('sync uncertain')
        with patch('mrw.route_pending.persist_private_new',side_effect=uncertain):
            with self.assertRaises(OSError):self.call('accept',revision=m['material_revision'],selected=['argument'])
        first=list(catalog(self.store,str(self.project)))[0]
        retried=self.call('accept',revision=m['material_revision'],selected=['argument'])
        self.assertEqual(retried['request'],first[1]['request']);self.assertEqual(retried['intent'],first[0])
        self.assertEqual(len(list(catalog(self.store,str(self.project)))),1)

    def test_tampered_sources_references_and_unselected_ground_cannot_be_admitted(self):
        m=self.imported()
        for selected in ([],['missing'],['argument','argument']):
            with self.assertRaises(ValueError):self.call('accept',revision=m['material_revision'],selected=selected)
        accepted=self.call('accept',revision=m['material_revision'],selected=['hypotheses'])
        self.assertEqual([a['id'] for a in accepted['request']['admissions']],['hypotheses'])
        bad=deepcopy(accepted['request']);bad['admissions'][0]['scope']='Different scope'
        with self.assertRaisesRegex(ValueError,'differs'):stage(self.store,str(self.project),bad,self.origin,material=m['material_revision'])
        path=self.store/'preparations'/(m['material_revision']+'.json');path.write_bytes(path.read_bytes()+b' ')
        with self.assertRaisesRegex(ValueError,'changed'):resume(self.store,str(self.project),accepted['intent'])

    def test_managed_rejected_write_recovery_and_move_keep_materials(self):
        project=str(self.project);home=self.home/'managed';home.mkdir();manager=ArtifactStorage(str(home))
        store=home/('justification-'+sha256(project.encode()).hexdigest())
        def call(method,**fields):
            q=dict(protocol=1,method=method,artifact_home=str(home),**fields)
            if not method.startswith('artifact_'):q.update(store=str(store),project_root=project,artifact_epoch=manager.status()['epoch'])
            return dispatch(q)
        destination=self.home/'moved';plan=call('artifact_plan',destination=str(destination),roots=[project]);call('artifact_move',destination=str(destination),roots=[project],manifest=plan['source_manifest'])
        from mrw import artifact_storage as storage
        real=storage.save_mutable
        def fail(path,*a,**kw):
            if Path(path).name=='HEAD.json':raise OSError('HEAD rejected')
            return real(path,*a,**kw)
        with patch('mrw.artifact_storage.save_mutable',side_effect=fail):
            with self.assertRaises(OSError):call('route_material_create',sources=self.sources,origin=self.origin)
        call('artifact_recover');self.assertEqual(call('route_material_list')['materials'],[])
        saved=call('route_material_create',sources=self.sources,origin=self.origin)
        again=self.home/'moved-again';plan=call('artifact_plan',destination=str(again),roots=[]);call('artifact_move',destination=str(again),roots=[],manifest=plan['source_manifest'])
        self.assertEqual(call('route_material_read',revision=saved['material_revision']),saved)
        self.assertEqual(self.note.read_bytes(),self.original)

    @unittest.skipUnless(CACHE,'Needs the installed pinned route checker')
    def test_actual_lean_composition_of_a_second_source_based_argument(self):
        m=self.imported();saved=self.call('accept',revision=m['material_revision'],selected=['hypotheses','argument'])
        checked=run(self.store,str(self.project),saved['request'],CACHE)
        self.assertEqual(len(checked['record']['response']['routes']),1)
        self.assertEqual(set(checked['record']['response']['routes'][0]['admission_ids']),{'hypotheses','argument'})
        self.assertEqual(resume(self.store,str(self.project),saved['intent'])['result']['revision'],checked['revision'])
        self.assertEqual(list(listing(self.store,str(self.project))),[])
        child=successor(self.store,str(self.project),checked['revision'],['argument'],str(__import__('uuid').uuid4()))
        staged=stage(self.store,str(self.project),child,self.origin)
        withdrawn=run(self.store,str(self.project),child,CACHE)
        self.assertEqual(withdrawn['record']['response']['routes'],[])
        reopened=route_action(dict(method='route_read',store=str(self.store),project_root=str(self.project),revision=withdrawn['revision']))
        self.assertEqual(reopened['material'],m['material_revision'])
        self.assertEqual(resume(self.store,str(self.project),staged['intent'])['result']['material'],m['material_revision'])
        self.assertEqual(self.note.read_bytes(),self.original)
