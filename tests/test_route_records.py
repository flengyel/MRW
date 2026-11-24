from __future__ import annotations
from copy import deepcopy
from hashlib import sha256
import json
import os
from pathlib import Path
import platform
import subprocess
import tempfile
import unittest
from unittest.mock import patch
from uuid import uuid4

from mrw.route_records import example,encode,parse_request,run,successor,read_record,list_records,action
from mrw.route_checker import setup,verify,current_engine,verify_record_identity,process
from mrw.artifact_storage import ArtifactStorage
from mrw.editor_bridge import dispatch

ROOT=Path(__file__).resolve().parents[1]
CACHE=os.environ.get('MRW_ROUTE_CHECKER_CACHE')


@unittest.skipUnless(platform.system() == 'Linux' and platform.machine() in ('x86_64', 'AMD64'),
                     'Route checker setup supports Linux x86-64')
class OfflineSetupTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(prefix='mrw-route-setup-')
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name).resolve()
        self.assets = self.root / 'assets'
        for name, entry in current_engine()['sources'].items():
            destination = self.assets / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes((ROOT / entry['source']).read_bytes())
        self.elan = self.root / 'elan'
        self.shims = self.elan / 'bin'
        self.shims.mkdir(parents=True)
        manager = self.shims / 'elan'
        manager.write_text('#!/bin/sh\nexit 98\n')
        manager.chmod(0o700)
        self.cache = self.root / 'cache'
        self.env = {'HOME': str(self.root), 'ELAN_HOME': str(self.elan), 'PATH': str(self.shims)}

    def make_local_tools(self):
        root = self.elan / 'toolchains' / 'leanprover--lean4---v4.32.2'
        tools = root / 'bin'
        tools.mkdir(parents=True)
        library = root / 'lib' / 'lean'
        library.mkdir(parents=True)
        (library / 'Init.olean').touch()
        for name in ('lake', 'lean'):
            binary = tools / name
            binary.write_text('#!/bin/sh\nexit 97\n')
            binary.chmod(0o700)
        return tools

    def test_missing_toolchain_refuses_without_starting_any_process(self):
        with patch.dict(os.environ, self.env, clear=True):
            with patch('mrw.route_checker.process', side_effect=AssertionError('started a process')):
                with self.assertRaisesRegex(ValueError, r'Lean 4\.32\.2 is missing.*elan toolchain install leanprover/lean4:v4\.32\.2'):
                    dispatch(dict(protocol=1, method='route_setup', assets=str(self.assets), cache=str(self.cache)))
        self.assertEqual(list(self.cache.glob('.building-route-*')), [])

    def test_redirected_lake_shim_is_refused(self):
        tools = self.make_local_tools()
        (tools / 'lake').unlink()
        (tools / 'lake').symlink_to(self.shims / 'elan')
        with patch.dict(os.environ, self.env, clear=True):
            with patch('mrw.route_checker.process', side_effect=AssertionError('started a process')):
                with self.assertRaisesRegex(ValueError, 'missing or incomplete'):
                    setup(self.assets, self.cache)

    def test_build_calls_local_lake_with_no_elan_lookup(self):
        tools = self.make_local_tools()
        with patch.dict(os.environ, self.env, clear=True):
            with patch('mrw.route_checker.process', side_effect=ValueError('fixture stopped before build')) as launch:
                with self.assertRaisesRegex(ValueError, 'fixture stopped'):
                    setup(self.assets, self.cache)
        self.assertEqual(launch.call_args.args[0], [str(tools / 'lake'), 'build', 'route_search'])
        environment = launch.call_args.kwargs['env']
        self.assertEqual(environment['ELAN'], '')
        self.assertNotIn('ELAN_HOME', environment)
        self.assertEqual(environment['PATH'].split(os.pathsep)[0], str(tools))
        self.assertEqual(list(self.cache.glob('.building-route-*')), [])


class RouteMetadataTests(unittest.TestCase):
    def setUp(self):self.request=example(ROOT/'docs/JUSTIFICATION_EUCLID_EXAMPLE.md')

    @unittest.skipUnless(CACHE,'Set MRW_ROUTE_CHECKER_CACHE for direct Lean transport checks')
    def test_lean_transport_rejects_malformed_and_unbounded_requests(self):
        executable=verify(CACHE);q=self.request;raw=encode(q)
        bad=[]
        for mutate in [lambda x:x.update(unrecognized=True),lambda x:x['profile'].update(system='OTHER'),
                       lambda x:x['limits'].update(rounds=999),lambda x:x.update(goal=['unknown']),
                       lambda x:x['admissions'][0].update(formula=['reason',['unknown'],x['goal']])]:
            changed=deepcopy(q);mutate(changed);bad.append(encode(changed))
        bad.extend([raw.replace(b'{',b'{"schema":"duplicate",',1),b'['*49+b'0'+b']'*49,b'\xff',b' '* (1024*1024+1)])
        for value in bad:
            with self.subTest(size=len(value)):
                child=subprocess.run([str(executable)],input=value,capture_output=True,timeout=5)
                self.assertNotEqual(child.returncode,0);self.assertEqual(child.stdout,b'');self.assertTrue(child.stderr)

    def test_exact_snapshots_and_qualified_references(self):
        q=parse_request(encode(self.request))
        self.assertEqual(len(q['sources']),3)
        self.assertTrue(all(s['reference'].startswith('mrw-example:') for s in q['sources']))
        self.assertTrue(all(s['sha256']==sha256(s['text'].encode()).hexdigest() for s in q['sources']))

    def test_reject_tamper_crosslinks_and_unreviewed_missing_scope(self):
        for mutate in [lambda q:q['sources'][0].update(text='different'),
                       lambda q:q['claims'][0].update(assertion='different'),
                       lambda q:q['admissions'][0]['basis_refs'][0].update(revision='0'*64),
                       lambda q:q['context'].update(admissions=['absent']),
                       lambda q:q['context'].update(admissions=['bezout-theorem']*2),
                       lambda q:q['admissions'][0].pop('scope'),
                       lambda q:q['profile'].update(system='JCS'),
                       lambda q:q['limits'].update(rounds=5),
                       lambda q:q['goal'][1]['content_hash'].update(value='0'*64)]:
            q=deepcopy(self.request);mutate(q)
            with self.subTest(q=q['id']),self.assertRaises(ValueError):parse_request(encode(q))

    def test_duplicate_json_and_large_sources_rejected(self):
        raw=encode(self.request);bad=raw.replace(b'{',b'{"schema":"duplicate",',1)
        with self.assertRaises(ValueError):parse_request(bad)
        q=deepcopy(self.request);q['sources'][0]['text']='x'*(129*1024)
        with self.assertRaises(ValueError):parse_request(encode(q))

    def test_small_read_only_process_is_bounded(self):
        with self.assertRaisesRegex(ValueError,'byte limit'):
            process(['/usr/bin/python3','-c','print("x"*20000)'],cwd='/tmp',env={'PATH':'/usr/bin:/bin'},limit=128)
        with self.assertRaisesRegex(ValueError,'timed out'):
            process(['/usr/bin/python3','-c','import time;time.sleep(5)'],cwd='/tmp',env={'PATH':'/usr/bin:/bin'},timeout=.05)


@unittest.skipUnless(CACHE,'Set MRW_ROUTE_CHECKER_CACHE to a verified disposable runtime cache')
class RetainedRouteTests(unittest.TestCase):
    def setUp(self):
        parent=ROOT/'.codex-work/artifact-storage-route-tests';parent.mkdir(parents=True,exist_ok=True)
        self.temp=tempfile.TemporaryDirectory(prefix='mrw-route-records-',dir=parent);self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name);self.project=self.root/'project';self.project.mkdir();self.store=self.root/'results'
        self.q=example(ROOT/'docs/JUSTIFICATION_EUCLID_EXAMPLE.md');self.cache=Path(CACHE)

    def initial(self):return run(self.store,str(self.project),self.q,self.cache)

    def test_real_check_fresh_process_reopen_and_sources_unchanged(self):
        result=self.initial();rev=result['revision'];self.assertEqual(len(result['record']['response']['routes']),2)
        raw=(self.store/(rev+'.json')).read_bytes()
        env=dict(os.environ,PYTHONPATH=str(ROOT/'src'))
        child=subprocess.run(['python3','-c',
            'from mrw.route_records import read_record;import sys;print(len(read_record(sys.argv[1],sys.argv[2])["response"]["routes"]))',str(self.store),rev],capture_output=True,text=True,env=env,check=True)
        self.assertEqual(child.stdout.strip(),'2');self.assertEqual((self.store/(rev+'.json')).read_bytes(),raw)
        with patch('mrw.route_checker.check',side_effect=AssertionError('reopen must not run Lean')):
            self.assertEqual(read_record(self.store,rev),result['record'])
        self.assertEqual(result['record']['request']['sources'],self.q['sources'])

    def test_successor_preserves_old_context_and_no_deleted_ground_reappears(self):
        original=self.initial();q=successor(self.store,str(self.project),original['revision'],['bezout-proof-bridge'],str(uuid4()))
        new=run(self.store,str(self.project),q,self.cache);self.assertEqual(len(new['record']['response']['routes']),1)
        self.assertEqual(new['record']['response']['routes'][0]['admission_ids'],['factorization-proof-bridge','factorization-theorem'])
        self.assertEqual(len(read_record(self.store,original['revision'])['response']['routes']),2)
        self.assertEqual(read_record(self.store,new['revision']),new['record'])
        self.assertNotIn('bezout-proof-bridge',new['effective']['context']['admissions'])
        self.assertEqual(new['record']['request']['sources'],original['record']['request']['sources'])

    def test_unchanged_request_reuses_result_without_rerunning_checker(self):
        original=self.initial()
        with patch('mrw.route_checker.check',side_effect=AssertionError('no duplicate check')):
            self.assertEqual(self.initial()['revision'],original['revision'])
        q=deepcopy(self.q);q['context']['rationale']='changed'
        with self.assertRaisesRegex(ValueError,'identity was reused'):run(self.store,str(self.project),q,self.cache)

    def test_failure_before_and_after_publication_preserves_retry(self):
        from mrw.route_records import persist_private_new as real
        with patch('mrw.route_records.persist_private_new',side_effect=OSError('before publication')):
            with self.assertRaises(OSError):self.initial()
        self.assertEqual(list(list_records(self.store,str(self.project))),[])
        def after(path,raw,**kwargs):real(path,raw,**kwargs);raise OSError('uncertain publication sync')
        with patch('mrw.route_records.persist_private_new',side_effect=after):
            with self.assertRaises(OSError):self.initial()
        self.assertEqual(len(list(list_records(self.store,str(self.project)))),1)
        with patch('mrw.route_checker.check',side_effect=AssertionError('no duplicate after uncertain save')):
            self.assertEqual(len(self.initial()['record']['response']['routes']),2)

    def test_restart_preserves_interrupted_staging_and_reuses_complete_record(self):
        old=self.initial();partial=self.store/('.'+'f'*64+'.json.abcdefgh.tmp')
        partial.write_bytes(b'{"incomplete":');raw=partial.read_bytes()
        linked=self.store/('.'+old['revision']+'.json.1234abcd.tmp')
        os.link(self.store/(old['revision']+'.json'),linked)
        with patch('mrw.route_checker.check',side_effect=AssertionError('no repeated check')):
            self.assertEqual(self.initial()['revision'],old['revision'])
        self.assertEqual([rev for rev,_ in list_records(self.store,str(self.project))],[old['revision']])
        self.assertEqual(partial.read_bytes(),raw)
        self.assertEqual(linked.read_bytes(),(self.store/(old['revision']+'.json')).read_bytes())
        partial.unlink();partial.symlink_to(linked)
        with self.assertRaisesRegex(ValueError,'staging entry'):list(list_records(self.store,str(self.project)))

    def test_tampered_result_and_missing_predecessor_are_rejected(self):
        old=self.initial();q=successor(self.store,str(self.project),old['revision'],['bezout-proof-bridge'],str(uuid4()))
        new=run(self.store,str(self.project),q,self.cache)
        p=self.store/(old['revision']+'.json');raw=p.read_bytes();p.write_bytes(raw+b' ')
        with self.assertRaisesRegex(ValueError,'changed'):read_record(self.store,new['revision'])
        p.write_bytes(raw);p.unlink()
        with self.assertRaises(OSError):read_record(self.store,new['revision'])

    def test_wrong_workspace_and_source_changes_cannot_enter_successor(self):
        old=self.initial()
        with self.assertRaises(ValueError):successor(self.store,str(self.root),old['revision'],['bezout-proof-bridge'],str(uuid4()))
        q=successor(self.store,str(self.project),old['revision'],['bezout-proof-bridge'],str(uuid4()))
        q['context']['rationale']='different base'
        with self.assertRaisesRegex(ValueError,'changed prior'):run(self.store,str(self.project),q,self.cache)

    def test_managed_generation_relocation_recovery_and_failed_head(self):
        home=self.root/'private';home.mkdir();manager=ArtifactStorage(str(home));root=str(self.project)
        store=home/('justification-'+sha256(root.encode()).hexdigest())
        def call(method,**fields):
            req=dict(protocol=1,method=method,artifact_home=str(home),**fields)
            if not method.startswith('artifact_'):
                req.update(store=str(store),project_root=root,artifact_epoch=manager.status()['epoch'])
            return dispatch(req)
        old=call('route_run',request=self.q,cache=str(self.cache))
        destination=self.root/'moved'
        plan=call('artifact_plan',destination=str(destination),roots=[root]);call('artifact_move',destination=str(destination),roots=[root],manifest=plan['source_manifest'])
        self.assertEqual(call('route_read',revision=old['revision'])['revision'],old['revision'])
        prepared=call('route_successor',revision=old['revision'],removed=['bezout-proof-bridge'],request_id=str(uuid4()))['request']
        from mrw import artifact_storage as storage
        real=storage.save_mutable
        def fail_head(path,*args,**kwargs):
            if Path(path).name=='HEAD.json':raise OSError('interrupted HEAD publication')
            return real(path,*args,**kwargs)
        with patch('mrw.artifact_storage.save_mutable',side_effect=fail_head):
            with self.assertRaises(OSError):call('route_run',request=prepared,cache=str(self.cache))
        restarted=ArtifactStorage(str(home));self.assertTrue(restarted.journal.exists());call('artifact_recover')
        rows=call('route_list')['records'];self.assertEqual([r['revision'] for r in rows],[old['revision']])
        new=call('route_run',request=prepared,cache=str(self.cache));self.assertEqual(len(new['record']['response']['routes']),1)
        self.assertEqual(len(call('route_list')['records']),2)
