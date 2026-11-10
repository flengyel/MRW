"""Synthetic Gerby pages; no upstream prose or user notes committed as fixtures."""
import base64
from copy import deepcopy
from hashlib import sha256
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from mrw.editor_bridge import dispatch
from mrw import kerodon_import as k
from mrw.outline_references import parse_reference
from mrw.published_sources import qualified_tag, local_tag
from mrw.source import SourceDocument
from mrw.source_outlines import OutlineStore, span_text

PAGE = '''<!doctype html><html><head><script>forbidden()</script></head><body>
<section id="main"><div class="html" id="tag">
<h2 class="tex-section"><span data-tag="0004">1.1</span> Synthetic section α😀</h2>
<p>Complete initial hypotheses: all objects are nonempty.</p>
<p><article class="env-lemma" id="000A"><p><a href="/tag/000A">Lemma 1.1.0.1.</a>
For every $x$, the chosen map satisfies $f(x)=x$.</p></article>
<article class="env-proof"><p>Use the definition and <a data-tag="000B" href="/tag/000B">the next lemma</a>.</p></article>
<article class="env-lemma" id="000B"><p>A second statement cites <a href="/tag/ZZZZ">external context</a>.</p></article>
<script>forbidden_in_body()</script><h2 id="structure">Structure</h2><p>Not a mathematical passage.</p>
</div></section><section id="comments"><p>Private reader comment excluded.</p></section></body></html>'''


class KerodonImportTests(unittest.TestCase):
    def setUp(self):
        parent = Path(__file__).resolve().parents[1] / '.codex-work/stacks-tests'
        parent.mkdir(parents=True, exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=parent);self.addCleanup(self.temp.cleanup)
        self.base=Path(self.temp.name);self.root=self.base/'project';self.root.mkdir()
        self.home=self.base/'private';self.home.mkdir()
        self.store=self.home/('outlines-'+sha256(str(self.root).encode()).hexdigest())
        self.raw=PAGE.encode();self.downloads=[]
        self.epoch = 'legacy'

    def call(self, method, **kw):
        return dispatch(dict(protocol=1,method=method,artifact_home=str(self.home),artifact_epoch=self.epoch,store=str(self.store),project_root=str(self.root),**kw))

    def prepare(self):
        def download(url, limit):self.downloads.append(url);return self.raw
        with patch.object(k,'fetch',side_effect=download):return self.call('outline_kerodon_prepare',input='kerodon:0004')

    def load(self):
        p=self.prepare();return self.call('outline_kerodon_import',ticket=p['ticket'],packet=p['packet'])

    def test_exact_snapshot_qualified_citations_offline_annotations_and_restart(self):
        loaded=self.load();pub=loaded['outline']['published'];self.assertEqual(self.downloads,['https://kerodon.net/tag/0004'])
        self.assertEqual(pub['qualified_tag'],'kerodon:0004');self.assertIsNone(pub['commit'])
        self.assertEqual(pub['authors'],'Jacob Lurie');self.assertNotIn('GNU Free Documentation License',pub['license'])
        self.assertEqual(len(pub['parts']),4)
        store=OutlineStore(str(self.store),str(self.root),loaded['outline']['id'])
        self.assertEqual(store.source().revision,sha256(self.raw).hexdigest());self.assertEqual(store.source().text,PAGE)
        for part in pub['parts'].values():self.assertEqual(part['exact_text'],span_text(store.source(),part['span']))
        displayed=str([p['tokens'] for p in pub['parts'].values()]);self.assertNotIn('forbidden',displayed);self.assertNotIn('Private reader comment',displayed)
        region=next(p['region'] for p in pub['parts'].values() if p['tag']=='000A' and p['role']=='statement')
        ref=self.call('outline_reference',id=store.id,revision=loaded['revision'],region=region)
        self.assertTrue(ref['reference'].startswith('mrw-outline:v2/kerodon:000A/'))
        parsed=parse_reference(ref['reference']);self.assertEqual(parsed['source'],store.source().revision);self.assertIsNotNone(parsed['span'])
        with patch.object(k,'fetch',side_effect=AssertionError('offline')):
            follow=self.call('outline_follow_reference',reference=ref['reference'])
            self.assertEqual(follow['reference']['qualified_id'],'kerodon:000A')
            self.assertIn('For every',follow['document']['text'])
            annotated=self.call('outline_mutate',id=store.id,revision=loaded['revision'],change=dict(kind='annotation',region=region,id=None,purpose='question',text='Unresolved detail',origin='human_work',author='Fixture'))
            reopened=self.call('outline_load',id=store.id)
            self.assertEqual(reopened['outline']['regions'][1]['annotations'][0]['text'],'Unresolved detail')
        again=self.load();self.assertTrue(again['reused']);self.assertEqual(again['outline']['regions'][1]['annotations'][0]['text'],'Unresolved detail')
        self.assertEqual(self.call('outline_follow_reference',reference=ref['reference'])['reference']['status'],'unchanged')

    def test_source_prefix_revision_and_exact_passage_are_independent_and_checked(self):
        loaded=self.load();pub=loaded['outline']['published'];region=next(p['region'] for p in pub['parts'].values() if p['tag']=='000A')
        ref=self.call('outline_reference',id=loaded['outline']['id'],revision=loaded['revision'],region=region)['reference']
        for altered in [ref.replace('kerodon:','stacks-project:'),ref.replace('kerodon:000A','kerodon:000B'),ref.replace(parse_reference(ref)['source'],'f'*64)]:
            with self.assertRaises(ValueError):self.call('outline_follow_reference',reference=altered)
        other = next(p for p in pub['parts'].values() if p['tag'] == '000B')
        span = other['span']
        wrong_range = ref.rsplit('/', 1)[0] + f"/{span['start_line']}.{span['start_col']}-{span['end_line']}.{span['end_col']}"
        with self.assertRaises(ValueError):
            self.call('outline_follow_reference', reference=wrong_range)
        with self.assertRaises(ValueError):self.call('outline_stacks_reference',id=loaded['outline']['id'],revision=loaded['revision'],tag='000A')
        old='mrw-outline:v1/'+ref.split('/',2)[2]
        result=self.call('outline_reference_identities',references=[old,ref])
        self.assertEqual([e['qualified_id'] for e in result['entries']],['kerodon:000A']*2)
        self.raw=self.raw.replace(b'For every',b'For any')
        newer=self.load();self.assertNotEqual(newer['outline']['id'],loaded['outline']['id'])
        self.assertEqual(newer['outline']['published']['qualified_tag'],'kerodon:0004')
        self.assertEqual(self.call('outline_follow_reference',reference=ref)['reference']['qualified_id'],'kerodon:000A')

    def test_managed_store_failed_publication_retry_keeps_prior_notes_and_citations(self):
        old = self.load()
        key = old['outline']['id']
        reference = self.call('outline_kerodon_reference', id=key, revision=old['revision'], tag='kerodon:000A')['reference']['uri']
        saved = self.call('outline_mutate', id=key, revision=old['revision'], change=dict(
            kind='annotation', region=None, id=None, purpose='question', text='Preserve this question',
            origin='human_work', author='Synthetic fixture'))
        destination = self.base / 'managed store'
        plan = dispatch(dict(protocol=1, method='artifact_plan', artifact_home=str(self.home),
                             destination=str(destination), roots=[str(self.root)]))
        moved = dispatch(dict(protocol=1, method='artifact_move', artifact_home=str(self.home),
                              destination=str(destination), roots=[str(self.root)], manifest=plan['source_manifest']))
        self.epoch = moved['epoch']
        self.raw = self.raw.replace(b'For every', b'For any')
        prepared = self.prepare()
        with patch.object(OutlineStore, 'publish', side_effect=OSError('Synthetic write failure')):
            failed = self.call('outline_kerodon_import', ticket=prepared['ticket'], packet=prepared['packet'])
        self.assertTrue(failed['blocked'])
        self.assertEqual(self.call('outline_load', id=key)['revision'], saved['revision'])
        self.assertEqual(len(self.call('outline_list')['outlines']), 1)
        retried = self.call('outline_kerodon_import', ticket=prepared['ticket'], packet=prepared['packet'])
        self.assertFalse(retried['reused'])
        self.assertEqual(len(self.call('outline_list')['outlines']), 2)
        self.assertEqual(self.call('outline_load', id=key)['outline']['annotations'][0]['text'], 'Preserve this question')
        self.assertEqual(self.call('outline_follow_reference', reference=reference)['reference']['qualified_id'], 'kerodon:000A')

    def test_packet_mutation_cross_workspace_and_wrong_source_never_publish(self):
        prepared=self.prepare();bad=deepcopy(prepared['packet']);bad['source_id']='stacks-project'
        with self.assertRaises(ValueError):self.call('outline_kerodon_import',ticket=prepared['ticket'],packet=bad)
        bad=deepcopy(prepared['packet']);bad['page']=base64.b64encode(PAGE.replace('hypotheses','replaced').encode()).decode()
        with self.assertRaises(ValueError):self.call('outline_kerodon_import',ticket=prepared['ticket'],packet=bad)
        self.assertEqual(self.call('outline_list')['outlines'],[])
        other=self.base/'other';other.mkdir()
        with self.assertRaises((OSError,ValueError)):
            dispatch(dict(protocol=1,method='outline_kerodon_import',artifact_home=str(self.home),artifact_epoch='legacy',store=str(self.home/('outlines-'+sha256(str(other).encode()).hexdigest())),project_root=str(other),ticket=prepared['ticket'],packet=prepared['packet']))

    def test_incomplete_ambiguous_or_nonsection_pages_fail_without_shortening(self):
        for raw in [PAGE.replace('data-tag="0004"','data-tag="0005"'),PAGE.replace('tex-section','tex-chapter'),PAGE.replace('id="000B"','id="000A"'),PAGE.replace('</article>','',1),PAGE.replace('<article class="env-lemma" id="000A">','<article class="env-proof">')]:
            with self.subTest(raw=raw[:40]),self.assertRaises(ValueError):k.extract(SourceDocument.from_bytes('/page.html',raw.encode()),'0004')

    def test_bom_crlf_unicode_and_media_keep_exact_source(self):
        raw=('\ufeff'+PAGE.replace('A second statement','<img src="https://evil.invalid/tracker">A second statement')).replace('\n','\r\n').encode()
        source=SourceDocument.from_bytes('/page.html',raw);section=k.extract(source,'0004')
        self.assertTrue(any(p['warning'] for p in section['parts']))
        self.assertIn('α😀',section['title'])
        self.assertTrue(all(span_text(source,p['span']) for p in section['parts']))
        media_only = PAGE.replace('<p>Complete initial hypotheses: all objects are nonempty.</p>', '<p><img src="https://evil.invalid/diagram"></p>')
        parts = k.extract(SourceDocument.from_bytes('/page.html', media_only.encode()), '0004')['parts']
        self.assertEqual(len(parts), 4)
        self.assertIn('Embedded media', parts[0]['warning'])
        self.assertIn('https://evil.invalid/diagram', span_text(SourceDocument.from_bytes('/page.html', media_only.encode()), parts[0]['span']))

    def test_html_parser_fragments_render_as_whole_formulas_without_rewriting_old_manifests(self):
        formula = r'$\{0 < 1 < 2 < \cdots < n\}$'
        self.raw = PAGE.replace('For every $x$, the chosen map satisfies $f(x)=x$.',
                                'For every $n$, use ' + formula + r' and $a &lt; b &amp; c$.').encode()
        loaded = self.load()
        store = OutlineStore(str(self.store), str(self.root), loaded['outline']['id'])
        manifest, legacy = k._manifest(store)
        legacy_part = next(p for p in legacy['parts'] if p['tag'] == '000A' and p['role'] == 'statement')
        self.assertIn('Unclosed mathematical delimiter', legacy_part['warning'])
        artifact = next(a for a in store.state['artifacts'] if a['id'] == store.state['acquisition']['artifact'])
        before = {p.name: p.read_bytes() for p in store.directory.iterdir() if p.is_file()}
        part = next(p for p in loaded['outline']['published']['parts'].values() if p['tag'] == '000A' and p['role'] == 'statement')
        self.assertIsNone(part['warning'])
        def math_tokens(tokens):
            for token in tokens:
                if token['kind'] == 'math': yield token['text']
                yield from math_tokens(token.get('children', []))
                for item in token.get('items', []): yield from math_tokens(item)
        self.assertIn(formula[1:-1], list(math_tokens(part['tokens'])))
        self.assertIn('a < b & c', list(math_tokens(part['tokens'])))
        self.assertEqual(part['span'], legacy_part['span'])
        self.assertIn(formula, part['exact_text'])
        reference = self.call('outline_reference', id=store.id, revision=loaded['revision'], region=part['region'])['reference']
        with patch.object(k, 'fetch', side_effect=AssertionError('offline')):
            reopened = self.call('outline_load', id=store.id)
            followed = self.call('outline_follow_reference', reference=reference)
        self.assertEqual(reopened['revision'], loaded['revision'])
        self.assertEqual(followed['reference']['status'], 'unchanged')
        self.assertEqual({p.name: p.read_bytes() for p in store.directory.iterdir() if p.is_file()}, before)
        self.assertIn('Unclosed mathematical delimiter', str(store.artifact(artifact)))

    def test_bare_equation_arrays_have_a_math_display_and_keep_the_exact_source(self):
        for environment in ('eqnarray', 'eqnarray*'):
            with self.subTest(environment=environment):
                raw = (r'\begin{' + environment + r'}\label{equation:fixture} a & = & b \\ c & = & d\end{' + environment + '}')
                page = PAGE.replace('<p>Complete initial hypotheses: all objects are nonempty.</p>', '<div class="equation"><div>' + raw + '</div></div>')
                source = SourceDocument.from_bytes('/page.html', page.encode())
                legacy = k.extract(source, '0004')['parts'][0]
                displayed = k.extract(source, '0004', coalesce_text=True)['parts'][0]
                self.assertIn('Unsupported display environment', legacy['warning'])
                self.assertIsNone(displayed['warning'])
                math = next(t for t in displayed['tokens'] if t['kind'] == 'math')
                self.assertTrue(math['display'])
                self.assertIn(r'a & = & b \\ c & = & d', math['text'])
                self.assertNotIn(r'\label', math['text'])
                self.assertEqual(displayed['span'], legacy['span'])
                self.assertIn(raw, span_text(source, displayed['span']))

    def test_html_block_nesting_does_not_create_empty_paragraphs(self):
        raw = PAGE.replace('<p>Complete initial hypotheses: all objects are nonempty.</p>',
                           '<div><p>First paragraph.</p>\n<p>Second paragraph.</p></div>')
        source = SourceDocument.from_bytes('/page.html', raw.encode())
        part = k.extract(source, '0004', coalesce_text=True)['parts'][0]
        self.assertEqual([t['kind'] for t in part['tokens']], ['text', 'paragraph', 'text'])
        self.assertIn('First paragraph.', part['tokens'][0]['text'])
        self.assertIn('Second paragraph.', part['tokens'][-1]['text'])
        self.assertIn('<div><p>', span_text(source, part['span']))

    def test_namespace_and_endpoint_bounds(self):
        self.assertNotEqual(qualified_tag('kerodon','0004'),qualified_tag('stacks-project','0004'))
        self.assertEqual(local_tag('kerodon','https://kerodon.net/tag/0004'),'0004')
        for value in ['stacks-project:0004','https://evil.invalid/tag/0004','kerodon:0004#x']:
            with self.assertRaises(ValueError):local_tag('kerodon',value)
        for url in ['http://kerodon.net/tag/0004','https://kerodon.net/tag/0004?x=1','https://kerodon.net.evil.invalid/tag/0004']:
            with self.assertRaises(ValueError):k.fetch(url,100)
        with self.assertRaises(ValueError):k._NoRedirect().redirect_request(None,None,302,'',{},'https://evil.invalid')


if __name__=='__main__':unittest.main()
