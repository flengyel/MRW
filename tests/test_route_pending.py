from copy import deepcopy
from pathlib import Path
import json
import os
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from uuid import uuid4
from hashlib import sha256

from mrw.route_records import example, encode, run, successor, read_record
from mrw.route_pending import stage, resume, catalog, origin
from mrw.editor_bridge import dispatch
from mrw.artifact_storage import ArtifactStorage

ROOT=Path(__file__).resolve().parents[1]
CACHE=os.environ.get('MRW_ROUTE_CHECKER_CACHE')

class PendingTests(unittest.TestCase):
    def setUp(self):
        parent=ROOT/'.codex-work/artifact-storage-pending-tests';parent.mkdir(parents=True,exist_ok=True)
        tmp=tempfile.TemporaryDirectory(dir=parent);self.addCleanup(tmp.cleanup)
        self.home=Path(tmp.name);self.project=self.home/'project';self.project.mkdir();self.store=self.home/'records'
        self.request=example(ROOT/'docs/JUSTIFICATION_EUCLID_EXAMPLE.md')
        self.origin=dict(uri={'$mrwPath':'workspace','relative':'note.md','uri':dict(protocol='file:',host='',search='',hash='')},revision='a'*64,start=4,end=9)

    def save(self):return stage(self.store,str(self.project),self.request,self.origin)

    def test_exact_request_and_origin_reopen_in_a_fresh_process_without_a_checker(self):
        saved=self.save();raw=(self.store/'pending'/(saved['intent']+'.json')).read_bytes()
        script='from mrw.route_pending import resume;import json,sys;print(json.dumps(resume(sys.argv[1],sys.argv[2],sys.argv[3])))'
        env=dict(os.environ,PYTHONPATH=str(ROOT/'src'),PATH='/usr/bin:/bin')
        child=subprocess.run(['/usr/bin/python3','-c',script,str(self.store),str(self.project),saved['intent']],env=env,capture_output=True,text=True,check=True)
        value=json.loads(child.stdout);self.assertEqual(value['request'],self.request);self.assertEqual(value['origin'],self.origin)
        self.assertEqual((self.store/'pending'/(saved['intent']+'.json')).read_bytes(),raw)
        self.assertEqual(len(list(catalog(self.store,str(self.project)))),1)

    def test_idempotent_retry_keeps_first_origin_and_rejects_changed_work(self):
        saved=self.save();again=stage(self.store,str(self.project),self.request,None)
        self.assertEqual(again,saved)
        bad=deepcopy(self.request);bad['context']['rationale']='changed'
        with self.assertRaisesRegex(ValueError,'reused'):stage(self.store,str(self.project),bad,None)

    def test_failed_or_uncertain_publication_preserves_explicit_retry(self):
        from mrw.route_pending import persist_private_new as real
        with patch('mrw.route_pending.persist_private_new',side_effect=OSError('not published')):
            with self.assertRaises(OSError):self.save()
        self.assertEqual(list(catalog(self.store,str(self.project))),[])
        def uncertain(*a,**kw):real(*a,**kw);raise OSError('uncertain sync')
        with patch('mrw.route_pending.persist_private_new',side_effect=uncertain):
            with self.assertRaises(OSError):self.save()
        original=list(catalog(self.store,str(self.project)))[0]
        self.assertEqual(self.save()['intent'],original[0]);self.assertEqual(len(list((self.store/'pending').glob('*.json'))),1)

    def test_tampered_wrong_workspace_redirected_and_interrupted_entries(self):
        saved=self.save();folder=self.store/'pending';p=folder/(saved['intent']+'.json');raw=p.read_bytes()
        p.write_bytes(raw+b' ')
        with self.assertRaisesRegex(ValueError,'changed'):list(catalog(self.store,str(self.project)))
        p.write_bytes(raw)
        with self.assertRaisesRegex(ValueError,'another workspace'):resume(self.store,str(self.home),saved['intent'])
        temp=folder/('.'+'b'*64+'.json.abcdefgh.tmp');temp.write_bytes(b'{partial')
        self.assertEqual(resume(self.store,str(self.project),saved['intent'])['request'],self.request);self.assertEqual(temp.read_bytes(),b'{partial')
        temp.unlink();temp.symlink_to(p)
        with self.assertRaises(ValueError):list(catalog(self.store,str(self.project)))

    def test_origin_is_optional_and_cannot_escape_its_recorded_root(self):
        self.assertIsNone(origin(None));self.assertEqual(origin(self.origin),self.origin)
        for mutate in [lambda x:x['uri'].update(relative='../outside.md'),lambda x:x['uri']['uri'].update(protocol='https:'),lambda x:x.update(uri='https://example.org/'),lambda x:x.update(end=-1),lambda x:x.update(revision='bad')]:
            value=deepcopy(self.origin);mutate(value)
            with self.assertRaises(ValueError):origin(value)
        tracked=deepcopy(self.origin);tracked['initial']=dict(revision='b'*64,start=0,end=1);tracked['invalid']=True
        self.assertEqual(origin(tracked),tracked)
        notes=deepcopy(self.origin);notes['uri'].update({'$mrwPath':'notes','root':'/an/original/notes/root'})
        self.assertEqual(origin(notes)['uri']['root'],'/an/original/notes/root')

    def test_managed_failed_head_recovery_and_pending_only_move(self):
        home=self.home/'private';home.mkdir();manager=ArtifactStorage(str(home));project=str(self.project)
        store=home/('justification-'+sha256(project.encode()).hexdigest())
        def call(method,**fields):
            q=dict(protocol=1,method=method,artifact_home=str(home),**fields)
            if not method.startswith('artifact_'):q.update(store=str(store),project_root=project,artifact_epoch=manager.status()['epoch'])
            return dispatch(q)
        from mrw import artifact_storage as storage
        real=storage.save_mutable
        def fail(path,*args,**kw):
            if Path(path).name=='HEAD.json':raise OSError('HEAD interrupted')
            return real(path,*args,**kw)
        # First use in a managed generation, with failed publication.
        destination=self.home/'moved';plan=call('artifact_plan',destination=str(destination),roots=[project])
        call('artifact_move',destination=str(destination),roots=[project],manifest=plan['source_manifest'])
        with patch('mrw.artifact_storage.save_mutable',side_effect=fail):
            with self.assertRaises(OSError):call('route_stage',request=self.request,origin=self.origin)
        call('artifact_recover');self.assertEqual(call('route_pending')['pending'],[])
        saved=call('route_stage',request=self.request,origin=self.origin)
        self.assertEqual(call('route_resume',intent=saved['intent'])['request'],self.request)
        # The source is now pending-only; discovery and a second move must include it.
        again=self.home/'moved-again';plan=call('artifact_plan',destination=str(again),roots=[])
        call('artifact_move',destination=str(again),roots=[],manifest=plan['source_manifest'])
        self.assertEqual(call('route_resume',intent=saved['intent'])['origin'],self.origin)

    def test_legacy_pending_only_store_is_discovered_and_moved_without_known_roots(self):
        home=self.home/'legacy';project=str(self.project)
        store=home/('justification-'+sha256(project.encode()).hexdigest())
        saved=stage(store,project,self.request,self.origin);before=(store/'pending'/(saved['intent']+'.json')).read_bytes()
        manager=ArtifactStorage(str(home));destination=self.home/'adopted'
        plan=dispatch(dict(protocol=1,method='artifact_plan',artifact_home=str(home),destination=str(destination),roots=[]))
        dispatch(dict(protocol=1,method='artifact_move',artifact_home=str(home),destination=str(destination),roots=[],manifest=plan['source_manifest']))
        value=dispatch(dict(protocol=1,method='route_resume',artifact_home=str(home),store=str(store),project_root=project,intent=saved['intent'],artifact_epoch=manager.status()['epoch']))
        self.assertEqual(value['request'],self.request);self.assertEqual(value['origin'],self.origin)
        _identity,_head,_manifest,payload=manager.load(destination)
        self.assertEqual((payload/store.name/'pending'/(saved['intent']+'.json')).read_bytes(),before)

    def test_nested_publication_keeps_other_processes_excluded_and_releases_scope(self):
        from mrw.artifact_context import publication_guard
        path=self.home/('justification-'+'a'*64)/'pending/request.json'
        code='from mrw.artifact_context import publication_guard;import sys\nwith publication_guard(sys.argv[1]):print("acquired")'
        def child():return subprocess.run(['/usr/bin/python3','-c',code,str(path)],env=dict(os.environ,PYTHONPATH=str(ROOT/'src')),capture_output=True,text=True)
        with publication_guard(path):
            with publication_guard(path.parent/'second.json'):pass
            blocked=child();self.assertNotEqual(blocked.returncode,0);self.assertIn('Another process',blocked.stderr)
        self.assertEqual(child().stdout.strip(),'acquired')

    @unittest.skipUnless(CACHE,'Set MRW_ROUTE_CHECKER_CACHE for completion and successor checks')
    def test_completed_requests_do_not_reappear_and_successors_keep_exact_parent(self):
        saved=self.save();first=run(self.store,str(self.project),self.request,CACHE)
        self.assertTrue(list(catalog(self.store,str(self.project)))[0][2])
        resumed=resume(self.store,str(self.project),saved['intent']);self.assertEqual(resumed['result']['revision'],first['revision'])
        child=successor(self.store,str(self.project),first['revision'],['bezout-proof-bridge'],str(uuid4()))
        pending=stage(self.store,str(self.project),child,self.origin)
        self.assertEqual(resume(self.store,str(self.project),pending['intent'])['request'],child)
        second=run(self.store,str(self.project),child,CACHE)
        self.assertEqual(len(second['record']['response']['routes']),1);self.assertEqual(len(read_record(self.store,first['revision'])['response']['routes']),2)
        self.assertTrue(all(result for _key,_item,result in catalog(self.store,str(self.project))))
