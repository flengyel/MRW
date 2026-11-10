"""Source API contracts, exact snapshots and plugin-independent saved work."""
from copy import deepcopy
from hashlib import sha256
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from mrw import source_records as records
from mrw.editor_bridge import dispatch
from mrw.source_plugins import Registry, BUILTINS, Acquisition, manifest, normalize, page_url, qualified
from mrw.source_outlines import OutlineStore, span_text
from mrw.source import SourceDocument
from mrw.source_rendering import validate_xml
from mrw.source_adapters import ProfileAdapter
from mrw.nlab_adapter import parse, verify_revision
from test_kerodon_import import PAGE

NLAB='''<html><body><div id="revision"><html><head><script>bad()</script></head><body>
<div class="rightHandSide"><h2 id="nav">Sidebar</h2></div><div class="maruku_toc"><h2>Contents</h2></div>
<h1 id="Definition">Definition α😀</h1><p>A useful equation <math><mrow><mi>x</mi><mo>=</mo><mn>1</mn></mrow></math>.</p>
<h2 id="Diagram">Diagram</h2><svg viewBox="0 0 10 10"><defs><path id="glyph=1" d="M0 0 L4 4"/></defs><use href="#glyph=1" style="fill:rgb(0%,0%,0%);stroke:none"/></svg>
<p><a href="#Application">Forward</a><img src="/unrendered.png"></p><script>malicious()</script>
<h1 id="Application">Application</h1><p>Second main heading.</p></body></html></div>
<a href="/nlab/revision/adjoint+functor/156/cite">Cite</a></body></html>'''

class SourcePluginTests(unittest.TestCase):
    def setUp(self):
        temp=tempfile.TemporaryDirectory();self.addCleanup(temp.cleanup);self.base=Path(temp.name)
        self.root=self.base/'project';self.root.mkdir();self.home=self.base/'private';self.home.mkdir()
        self.store=self.home/('outlines-'+sha256(str(self.root).encode()).hexdigest())
        env=patch.dict(os.environ,MRW_SOURCE_PLUGIN_REGISTRY=str(self.base/'config/registry.json'));env.start();self.addCleanup(env.stop)
        self.raw=PAGE.encode()
    def call(self,method,**kw):
        return dispatch(dict(protocol=1,method=method,artifact_home=str(self.home),artifact_epoch='legacy',store=str(self.store),project_root=str(self.root),**kw))
    def prepared(self,source='kerodon',value='0004'):
        with patch.object(Acquisition,'fetch',autospec=True,side_effect=self.fetch):return self.call('outline_source_prepare',source_id=source,input=value)
    def fetch(self,host,name,url,limit=2*1024*1024):
        host.resources[name]=dict(url=url,bytes=self.raw);return self.raw
    def imported(self,source='kerodon',value='0004',section='whole'):
        prep=self.prepared(source,value);return self.call('outline_source_import',ticket=prep['ticket'],section=section)
    def profile(self,**kw):
        value=deepcopy(BUILTINS[1]);value.update(sourceId='external-example',pluginId='example.profile',**kw)
        file=self.base/'profile.json';file.write_text(json.dumps(value));Registry().add_profile(file);return value
    def test_registry_validation_conflicts_and_isolated_failures(self):
        spec=self.profile();self.assertIn('external-example',Registry().sources)
        bad=deepcopy(spec);bad['apiVersion']=2
        with self.assertRaisesRegex(ValueError,'apiVersion'):manifest(bad)
        other=dict(manifest=dict(spec,pluginId='other.plugin'),kind='profile',enabled=True,removed=False,entryPoint=None,distribution=None)
        with self.assertRaisesRegex(ValueError,'Conflicting'):Registry().add(other)
        self.assertEqual(Registry().adapter('kerodon')[0]['sourceId'],'kerodon')
        file=Registry().path;data=json.loads(file.read_text());data['entries'].append({'broken':'entry'});file.write_text(json.dumps(data))
        reg=Registry();self.assertTrue(reg.diagnostics);self.assertEqual(reg.adapter('stacks-project')[0]['sourceId'],'stacks-project')
        Registry().change('external-example',False,True)
        with self.assertRaisesRegex(ValueError,'disabled'):Registry().adapter('external-example')
    def test_removed_plugin_saved_display_annotations_and_citations_need_no_parser_or_network(self):
        self.profile();loaded=self.imported('external-example');key=loaded['outline']['id'];part=loaded['outline']['regions'][1]
        ref=self.call('outline_reference',id=key,revision=loaded['revision'],region=part['id'])['reference']
        self.assertTrue(ref.startswith('mrw-outline:v2/external-example:000A/'))
        changed=self.call('outline_mutate',id=key,revision=loaded['revision'],change=dict(kind='annotation',region=part['id'],id=None,purpose='question',text='Keep my question',origin='human_work',author='Reader'))
        Registry().change('external-example',False,True)
        with patch.object(Registry,'adapter',side_effect=AssertionError('no plugin')),patch.object(Acquisition,'fetch',side_effect=AssertionError('offline')):
            reopened=self.call('outline_load',id=key);followed=self.call('outline_follow_reference',reference=ref)
            self.assertEqual(reopened['outline']['regions'][1]['annotations'][0]['text'],'Keep my question')
            self.assertEqual(followed['reference']['qualified_id'],'external-example:000A')
            self.assertEqual(reopened['revision'],changed['revision'])
        store=OutlineStore(str(self.store),str(self.root),key);snap=records.snapshot(store)
        self.assertEqual(store.source().text.encode(),self.raw);self.assertEqual(snap['producer']['pluginId'],'example.profile')
        for p in snap['model']['parts']:self.assertTrue(span_text(store.source(),p['span']))
    def test_repeat_changed_failed_imports_and_explicit_reparse_preserve_notes(self):
        self.profile();old=self.imported('external-example');key=old['outline']['id'];region=old['outline']['regions'][1]['id']
        old=self.call('outline_mutate',id=key,revision=old['revision'],change=dict(kind='annotation',region=region,id=None,purpose='question',text='Original note',origin='human_work',author='Reader'))
        self.assertTrue(self.imported('external-example')['reused'])
        self.profile(pluginVersion='2.0.0')
        self.assertEqual(self.call('outline_load',id=key)['outline']['published']['producer']['pluginVersion'],'1.0.0')
        with patch.object(Acquisition,'fetch',side_effect=AssertionError('reparse must use retained bytes')):
            prepared=self.call('outline_source_reparse',id=key,revision=old['revision'])
        derived=self.call('outline_source_import',ticket=prepared['ticket'],section='whole')
        self.assertNotEqual(derived['outline']['id'],key);self.assertEqual(derived['outline']['published']['derived_from'],key)
        self.assertEqual(derived['outline']['published']['producer']['pluginVersion'],'2.0.0')
        self.assertEqual(self.call('outline_load',id=key)['outline']['regions'][1]['annotations'][0]['text'],'Original note')
        self.raw=self.raw.replace(b'For every',b'For any');prep=self.prepared('external-example')
        with patch.object(OutlineStore,'publish',side_effect=OSError('simulated full disk')):
            failed=self.call('outline_source_import',ticket=prep['ticket'],section='whole')
        self.assertTrue(failed['blocked']);self.assertEqual(self.call('outline_load',id=key)['revision'],old['revision'])
        retried=self.call('outline_source_import',ticket=prep['ticket'],section='whole');self.assertNotEqual(retried['outline']['id'],key)
    def test_preparation_scope_and_corrupted_bytes_fail_closed(self):
        prep=self.prepared();paths=list((self.home/'artifact-runtime').rglob(prep['ticket']+'.json'));self.assertEqual(len(paths),1)
        ticket=json.loads(paths[0].read_text());bad=deepcopy(ticket['packet']);bad['resources']['page.html']['bytes']='YmFk'
        with self.assertRaisesRegex(ValueError,'bytes changed'):records.packet_check(bad)
        # Bridge-owned tickets are scoped; a foreign project cannot use one.
        other=self.base/'other';other.mkdir()
        with self.assertRaises((ValueError,OSError)):
            dispatch(dict(protocol=1,method='outline_source_import',artifact_home=str(self.home),artifact_epoch='legacy',store=str(self.home/('outlines-'+sha256(str(other).encode()).hexdigest())),project_root=str(other),ticket=prep['ticket'],section='whole'))
        self.assertEqual(self.call('outline_list')['outlines'],[])
    def test_builtin_import_matches_prior_identity_and_keeps_existing_citations(self):
        from mrw import kerodon_import
        with patch.object(kerodon_import,'fetch',return_value=self.raw):
            p=self.call('outline_kerodon_prepare',input='0004');prior=self.call('outline_kerodon_import',ticket=p['ticket'],packet=p['packet'])
        ref=self.call('outline_reference',id=prior['outline']['id'],revision=prior['revision'],region=prior['outline']['regions'][1]['id'])['reference']
        current=self.imported();self.assertTrue(current['reused']);self.assertEqual(current['outline']['id'],prior['outline']['id'])
        self.assertEqual(self.call('outline_follow_reference',reference=ref)['reference']['qualified_id'],'kerodon:000A')
    def test_invalid_registry_keeps_builtin_readers_and_preserves_registration_bytes(self):
        file=Registry().path;file.parent.mkdir();file.write_text('{broken')
        reg=Registry();self.assertTrue(reg.diagnostics);self.assertEqual(reg.adapter('kerodon')[0]['sourceId'],'kerodon')
        with self.assertRaisesRegex(ValueError,'original bytes'):reg.change('kerodon',False)
        self.assertEqual(file.read_text(),'{broken')
    def test_acquisition_enforces_origin_resource_and_combined_bounds(self):
        host=Acquisition(BUILTINS[1],downloader=lambda url,limit:b'abc')
        with self.assertRaisesRegex(ValueError,'origins'):host.fetch('a','https://evil.invalid/')
        with self.assertRaisesRegex(ValueError,'name'):host.fetch('../a','https://kerodon.net/tag/0004')
        with self.assertRaisesRegex(ValueError,'limit'):host.fetch('a','https://kerodon.net/tag/0004',2)

class NlabTests(unittest.TestCase):
    def setUp(self):self.spec=deepcopy(BUILTINS[2])
    def test_reversible_named_items_fragments_revision_and_literal_plus(self):
        for name in ('adjoint functor','A+B/α😀','Case.Sensitive','punctuation: a?b#c'):
            url=page_url(self.spec,name,'156','Definition α');item=normalize(self.spec,url)
            self.assertEqual(item['itemId'],name);self.assertEqual(item['revision'],'156');self.assertEqual(item['fragment'],'Definition α')
            self.assertEqual(normalize(self.spec,qualified('nlab',name))['itemId'],name)
    def test_heading_subsections_actual_math_diagrams_links_and_visible_media_fallback(self):
        source=SourceDocument.from_bytes('/nlab.html',('\ufeff'+NLAB).replace('\n','\r\n').encode());item=normalize(self.spec,'https://ncatlab.org/nlab/show/adjoint+functor#Definition')
        model=parse(source,item,self.spec);records.model_check(model,source)
        self.assertEqual([p['title'] for p in model['parts']],['Definition α😀','Diagram','Application'])
        choice=next(c for c in model['choices'] if c['id']==model['default']);self.assertEqual((choice['first'],choice['last']),(0,2))
        tokens=str([p['tokens'] for p in model['parts']]);self.assertIn('mathml',tokens);self.assertIn('svg',tokens);self.assertIn('currentColor',tokens);self.assertIn('Forward',tokens);self.assertIn('Unsupported img',tokens)
        self.assertNotIn('malicious()',tokens);self.assertNotIn('Sidebar',tokens);self.assertNotIn('Contents',tokens)
        self.assertTrue(all(span_text(source,p['span']).startswith('<h') for p in model['parts']))
        with self.assertRaisesRegex(ValueError,'fragment'):parse(source,dict(item,fragment='missing'),self.spec)
    def test_numbered_revision_requires_exact_footer_evidence_and_xml_rejects_active_content(self):
        item=normalize(self.spec,'https://ncatlab.org/nlab/revision/adjoint+functor/156');verify_revision(NLAB.encode(),item,self.spec)
        with self.assertRaisesRegex(ValueError,'verify'):verify_revision(NLAB.replace('/156/cite','/155/cite').encode(),item,self.spec)
        for xml,kind in [('<svg><script>bad()</script></svg>','svg'),('<math><mi onclick="bad()">x</mi></math>','mathml'),('<svg><use href="https://evil.invalid/x"/></svg>','svg')]:
            with self.assertRaises(ValueError):validate_xml(xml,kind)
