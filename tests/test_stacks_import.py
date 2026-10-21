"""Bounded explicit acquisition, source fidelity, offline use and publication."""
import base64
from copy import deepcopy
from hashlib import sha256
import json
from pathlib import Path
import shutil
import tempfile
import unittest
from unittest.mock import patch

from theorem_terminal.editor_bridge import dispatch
from theorem_terminal.artifact_storage import ArtifactStorage
from theorem_terminal.source_outlines import OutlineStore, span_text
from theorem_terminal.stacks_import import (REF, RAW, _NoRedirect, fetch, section_tag,
                                           extract, unpack)
from theorem_terminal.stacks_tex import comment_mask, display_tokens
from theorem_terminal.source import SourceDocument

FIXTURE = Path(__file__).parent / 'fixtures/stacks'
REVISION = 'a' * 40  # Deliberately synthetic transport-double revision.


class StacksImportTests(unittest.TestCase):
    def setUp(self):
        parent = Path(__file__).resolve().parents[1] / '.codex-work/stacks-tests'
        parent.mkdir(parents=True, exist_ok=True)
        temp = tempfile.TemporaryDirectory(dir=parent)
        self.addCleanup(temp.cleanup)
        self.base = Path(temp.name)
        self.root = self.base / 'project α with spaces'
        self.root.mkdir()
        self.home = self.base / 'private host'
        self.home.mkdir()
        self.store = self.home / ('outlines-' + sha256(str(self.root).encode()).hexdigest())
        self.epoch = 'legacy'
        self.files = {name: (FIXTURE / ('tags' if name == 'tags/tags' else name)).read_bytes()
                      for name in ['topology.tex', 'tags/tags', 'COPYING', 'preamble.tex']}
        self.commit = REVISION
        self.downloads = []

    def downloader(self, url, limit):
        self.downloads.append(url)
        if url == REF:
            return json.dumps({'object': {'type': 'commit', 'sha': self.commit}}).encode()
        prefix = RAW + self.commit + '/'
        self.assertTrue(url.startswith(prefix))
        return self.files[url[len(prefix):]]

    def call(self, method, **extra):
        return dispatch(dict(protocol=1, method=method, artifact_home=str(self.home),
                             artifact_epoch=self.epoch, store=str(self.store), project_root=str(self.root), **extra))

    def control(self, method, **extra):
        return dispatch(dict(protocol=1, method=method, artifact_home=str(self.home), **extra))

    def prepare(self, value='08ZD'):
        with patch('theorem_terminal.stacks_import.fetch', side_effect=self.downloader):
            return self.call('outline_stacks_prepare', input=value)

    def import_section(self, prepared=None):
        prepared = prepared or self.prepare()
        return self.call('outline_stacks_import', ticket=prepared['ticket'], packet=prepared['packet'])

    def test_complete_fidelity_hypotheses_proofs_tags_and_context(self):
        prepared = self.prepare('https://stacks.math.columbia.edu/tag/08ZD')
        self.assertEqual(len(self.downloads), 5)
        self.assertTrue(all(REVISION in url for url in self.downloads[1:]))
        loaded = self.import_section(prepared)
        value = loaded['outline']
        published = value['published']
        self.assertIsNone(published['error'])
        self.assertEqual((published['title'], published['chapter'], published['section_number']),
                         ('Hausdorff spaces', 'Topology', 3))
        self.assertEqual(published['chapter_tag'], '004C')
        self.assertEqual([p['tag'] for p in published['parts'].values() if p['role'] == 'statement'],
                         ['08ZE', '08ZF', '08ZG', '08ZH'])
        self.assertEqual(len(value['regions']), 9)
        retained = self.call('outline_document', id=value['id'], revision=loaded['revision'], artifact=None)
        self.assertEqual(retained['text'].encode(), self.files['topology.tex'])
        store = OutlineStore(str(self.store), str(self.root), value['id'])
        for part in published['parts'].values():
            exact = span_text(store.source(), part['span'])
            self.assertEqual(exact, part['exact_text'])
            self.assertIsNone(part['warning'])
            if part['role'] == 'statement':
                self.assertTrue(exact.startswith(r'\begin{lemma}'))
                self.assertTrue(exact.endswith(r'\end{lemma}'))
            elif part['role'] == 'proof':
                self.assertTrue(exact.startswith(r'\begin{proof}'))
                self.assertTrue(exact.endswith(r'\end{proof}'))
        joined = '\n'.join(p['exact_text'] for p in published['parts'].values())
        self.assertIn('finite products', joined)
        self.assertIn(r'f \circ s = \text{id}_Y', joined)
        self.assertIn('continuous maps of topological spaces', joined)
        self.assertEqual(sum(p['exact_text'].count(r'\ref{lemma-Hausdorff}')
                             for p in published['parts'].values()), 3)
        self.assertEqual(len(value['artifacts']), 4)
        self.assertEqual(store.artifact(next(a for a in value['artifacts'] if a['label'] == 'COPYING')),
                         self.files['COPYING'])

    def test_retained_references_annotation_restart_and_original_absent_are_offline(self):
        loaded = self.import_section()
        key = loaded['outline']['id']
        with patch('theorem_terminal.stacks_import.fetch', side_effect=AssertionError('Reading must be offline')):
            followed = self.call('outline_stacks_reference', id=key, revision=loaded['revision'], tag='08ZE')
            self.assertEqual(followed['document']['text'].encode(), self.files['topology.tex'])
            region = followed['reference']['region']
            saved = self.call('outline_mutate', id=key, revision=loaded['revision'], change=dict(
                kind='annotation', region=region, id=None, purpose='question',
                text='Synthetic importer annotation — not user mathematical work.',
                origin='unknown', author='Automated import fixture'))
            reopened = self.call('outline_load', id=key)
            self.assertEqual(reopened['outline']['regions'][1]['annotations'][0]['text'],
                             saved['outline']['regions'][1]['annotations'][0]['text'])
            old = self.call('outline_follow_reference', reference=followed['reference']['uri'])
            self.assertEqual(old['document'], followed['document'])
            self.assertEqual(old['outline']['source_status'], 'retained upstream import')
            selected = self.call('outline_navigation', id=key, revision=saved['revision'],
                                 region=region, context=None, statement=False)
            self.assertTrue(selected['retained'])
            self.assertEqual(selected['text'].encode(), self.files['topology.tex'])

    def test_same_revision_reimport_preserves_annotation_note_and_identifiers(self):
        loaded = self.import_section()
        key = loaded['outline']['id']
        ref = self.call('outline_stacks_reference', id=key, revision=loaded['revision'], tag='08ZE')['reference']['uri']
        saved = self.call('outline_mutate', id=key, revision=loaded['revision'], change=dict(
            kind='annotation', region=None, id=None, purpose='question', text='Retain test annotation',
            origin='unknown', author='Synthetic fixture'))
        self.call('outline_update_note', id=key, revision=None, change=dict(
            id=None, reference=ref, url='obsidian://open?vault=Fixture&file=Existing%20note',
            label='Existing fixture note'))
        repeated = self.import_section()
        self.assertTrue(repeated['reused'])
        self.assertEqual(repeated['revision'], saved['revision'])
        self.assertEqual(repeated['outline']['id'], key)
        self.assertEqual(len(self.call('outline_list')['outlines']), 1)
        self.assertEqual(self.call('outline_notes', id=key)['links'][0]['reference'], ref)

    def test_changed_revision_keeps_old_outline_exact_links_and_annotations(self):
        old = self.import_section()
        ref = self.call('outline_stacks_reference', id=old['outline']['id'], revision=old['revision'], tag='08ZE')
        before = OutlineStore(str(self.store), str(self.root), old['outline']['id']).raw
        self.commit = 'b' * 40
        self.files['topology.tex'] = self.files['topology.tex'].replace(b'We suppose', b'% changed revision fixture\nWe suppose')
        new = self.import_section()
        self.assertNotEqual(old['outline']['id'], new['outline']['id'])
        self.assertEqual(len(self.call('outline_list')['outlines']), 2)
        self.assertEqual(OutlineStore(str(self.store), str(self.root), old['outline']['id']).raw, before)
        self.assertEqual(self.call('outline_follow_reference', reference=ref['reference']['uri'])['document'],
                         ref['document'])

    def test_edited_region_does_not_redirect_published_pinned_reference(self):
        loaded = self.import_section()
        key = loaded['outline']['id']
        original = self.call('outline_stacks_reference', id=key, revision=loaded['revision'], tag='08ZE')
        region = original['reference']['region']
        other = loaded['outline']['regions'][2]['span']
        changed = self.call('outline_mutate', id=key, revision=loaded['revision'], change=dict(
            kind='replace_region', region=region,
            start=[other['start_line'] - 1, other['start_col']], end=[other['end_line'] - 1, other['end_col']]))
        following = self.call('outline_stacks_reference', id=key, revision=changed['revision'], tag='08ZE')
        self.assertEqual(following['reference']['status'], 'changed or removed')
        self.assertEqual(following['document'], original['document'])

    def test_invalid_inputs_do_not_download_or_publish(self):
        bad = ['http://stacks.math.columbia.edu/tag/08ZD', 'https://example.org/tag/08ZD',
               'https://stacks.math.columbia.edu/tag/08ZD?create=1',
               'https://stacks.math.columbia.edu/tag/08ZD#proof', '../08ZD', '08ZD\n08ZE', '\0']
        for value in bad:
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.prepare(value)
        self.assertEqual(self.downloads, [])
        self.assertEqual(self.call('outline_list')['outlines'], [])
        self.assertEqual(section_tag(' 08zd '), '08ZD')

    def test_item_tag_and_source_tag_map_mismatch_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'section tag'):
            self.prepare('08ZE')
        self.files['topology.tex'] = self.files['topology.tex'].replace(b'section-Hausdorff', b'section-other')
        with self.assertRaisesRegex(ValueError, 'revision mismatch'):
            self.prepare()
        self.assertEqual(self.call('outline_list')['outlines'], [])

    def test_preview_packet_tampering_and_wrong_workspace_are_rejected(self):
        prepared = self.prepare()
        altered = deepcopy(prepared)
        altered['packet']['commit'] = 'c' * 40
        with self.assertRaisesRegex(ValueError, 'preparation changed'):
            self.import_section(altered)
        original = self.root
        self.root = self.base / 'unrelated project'
        self.root.mkdir()
        with self.assertRaisesRegex(ValueError, 'another workspace'):
            self.import_section(prepared)
        self.root = original
        self.assertEqual(self.call('outline_list')['outlines'], [])

    def test_unsupported_source_is_explicitly_retained_without_fake_regions(self):
        self.files['topology.tex'] = self.files['topology.tex'].replace(
            b'The category of topological spaces has finite products.',
            b'\\input{do-not-execute}\nThe category of topological spaces has finite products.')
        prepared = self.prepare()
        self.assertIn('inclusion', prepared['section']['limitation'])
        value = self.import_section(prepared)['outline']
        self.assertEqual(value['regions'], [])
        self.assertIn('inclusion', value['published']['limitation'])
        self.assertEqual(OutlineStore(str(self.store), str(self.root), value['id']).source().text.encode(),
                         self.files['topology.tex'])

    def test_unsupported_display_keeps_the_complete_fragment(self):
        self.files['topology.tex'] = self.files['topology.tex'].replace(
            b'The graph is the inverse image', b'\\unknownmacro{Full source remains}\nThe graph is the inverse image')
        value = self.import_section()['outline']['published']
        proof = next(p for p in value['parts'].values() if p['tag'] == '08ZF' and p['role'] == 'proof')
        self.assertIn('unknownmacro', proof['warning'])
        self.assertEqual(proof['tokens'][0]['kind'], 'raw')
        self.assertIn(r'\ref{lemma-Hausdorff}', proof['tokens'][0]['text'])

    def test_failed_download_and_final_publication_preserve_existing_work(self):
        existing = self.import_section()
        old = OutlineStore(str(self.store), str(self.root), existing['outline']['id']).raw
        self.commit = 'b' * 40
        with patch('theorem_terminal.stacks_import.fetch', side_effect=ValueError('Download unavailable')):
            with self.assertRaisesRegex(ValueError, 'unavailable'):
                self.call('outline_stacks_prepare', input='08ZD')
        prepared = self.prepare()
        with patch('theorem_terminal.source_outlines.save_mutable', side_effect=OSError('disk full')):
            result = self.import_section(prepared)
        self.assertTrue(result['blocked'])
        self.assertEqual(len(self.call('outline_list')['outlines']), 1)
        self.assertEqual(OutlineStore(str(self.store), str(self.root), existing['outline']['id']).raw, old)

    def test_bounded_downloads_redirect_and_untrusted_filenames(self):
        with self.assertRaisesRegex(ValueError, 'redirect'):
            _NoRedirect().redirect_request(None, None, 302, '', {}, 'http://localhost/')
        with self.assertRaisesRegex(ValueError, 'endpoint'):
            fetch('https://example.org/source.tex', 1)
        self.files['topology.tex'] = b'x' * (2 * 1024 * 1024 + 1)
        with self.assertRaisesRegex(ValueError, 'byte limit|2 MiB'):
            self.prepare()
        self.files['tags/tags'] = b'08ZD,../../outside-section-test\n'
        with self.assertRaisesRegex(ValueError, 'tag-map'):
            self.prepare()

    def test_other_section_and_unicode_crlf_preserve_exact_bytes(self):
        # Exercise another supported section; no production branch names 08ZD.
        self.files['topology.tex'] = self.files['topology.tex'].replace(
            b'The category of topological spaces has finite products.',
            'The category of topological spaces has finite products. α😀'.encode()).replace(b'\n', b'\r\n')
        value = self.import_section()['outline']
        self.assertEqual(OutlineStore(str(self.store), str(self.root), value['id']).source().text.encode(),
                         self.files['topology.tex'])
        alternate = self.prepare('004D')  # Introduction in the pinned fixture.
        self.assertEqual(alternate['section']['title'], 'Introduction')

    def test_managed_move_adoption_and_reimport_keep_old_links(self):
        old = self.import_section()
        key = old['outline']['id']
        ref = self.call('outline_stacks_reference', id=key, revision=old['revision'], tag='08ZE')
        destination = self.base / 'moved complete store'
        plan = self.control('artifact_plan', destination=str(destination), roots=[str(self.root)])
        moved = self.control('artifact_move', destination=str(destination), roots=[str(self.root)],
                             manifest=plan['source_manifest'])
        self.epoch = moved['epoch']
        self.assertEqual(self.call('outline_follow_reference', reference=ref['reference']['uri'])['document'], ref['document'])
        self.assertTrue(self.import_section()['reused'])
        receiver, project = self.base / 'receiving host', self.base / 'different local project'
        receiver.mkdir(); project.mkdir()
        inspected = self.control('artifact_inspect', destination=str(destination))
        adopted = dispatch(dict(protocol=1, method='artifact_adopt', artifact_home=str(receiver),
                                destination=str(destination), mapping={str(project): str(self.root)},
                                store_id=inspected['store_id'], head_hash=inspected['head_hash']))
        loaded = dispatch(dict(protocol=1, method='outline_follow_reference', artifact_home=str(receiver),
            artifact_epoch=adopted['epoch'], project_root=str(project),
            store=str(receiver / ('outlines-' + sha256(str(project).encode()).hexdigest())),
            reference=ref['reference']['uri']))
        self.assertEqual(loaded['document'], ref['document'])
        self.assertIsNone(loaded['outline']['published']['error'])

    def test_corrupt_metadata_blocks_derived_view_without_guessing(self):
        loaded = self.import_section()
        store = OutlineStore(str(self.store), str(self.root), loaded['outline']['id'])
        item = next(a for a in store.state['artifacts'] if a['label'] == 'tags/tags')
        store.blob(item['revision']).write_bytes(b'corrupt')
        value = self.call('outline_load', id=store.id)['outline']
        self.assertIn('unavailable', value['published']['error'])
        self.assertNotIn('parts', value['published'])
        self.assertEqual(store.source().text.encode(), self.files['topology.tex'])

    def test_comments_escaped_percent_nested_lists_and_inert_markup(self):
        raw = 'Literal ' + r'\% still visible % \section{fake}' + '\r\nTail'
        masked = comment_mask(raw)
        self.assertEqual(len(masked), len(raw))
        self.assertIn(r'\% still visible', masked)
        self.assertNotIn(r'\section{fake}', masked)
        source = '<img src=x onerror=bad> ' + r'\begin{enumerate}\item A\begin{itemize}\item B\end{itemize}\item C\end{enumerate}'
        tokens, warning = display_tokens(source, {})
        self.assertIsNone(warning)
        self.assertTrue(tokens[0]['text'].startswith('<img'))
        self.assertEqual(len(tokens[1]['items']), 2)
        self.assertEqual(tokens[1]['items'][0][1]['kind'], 'list')

    def test_unclosed_proof_retains_source_without_a_complete_outline_claim(self):
        self.files['topology.tex'] = self.files['topology.tex'].replace(b'\\end{proof}', b'', 1)
        prepared = self.prepare()
        self.assertRegex(prepared['section']['limitation'], 'Mismatched|Nested')
        loaded = self.import_section(prepared)
        self.assertEqual(loaded['outline']['regions'], [])
        self.assertIsNotNone(loaded['outline']['published']['limitation'])


if __name__ == '__main__':
    unittest.main()
