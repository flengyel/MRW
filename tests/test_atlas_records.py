"""Local source captures and graph quotations publish without guessed URLs."""
from copy import deepcopy
from hashlib import sha256
import json
from pathlib import Path
import tempfile
import unittest

from mrw.atlas_records import publish_atlas, publish_graph
from mrw.private_persistence import PrivatePersistenceError
from mrw.proof_graph import project


def graph_fixture():
    raw = 'An exact λ😀 manuscript passage.\r\nIts printed hypotheses.\r\n'
    digest = sha256(raw.encode()).hexdigest()
    explanation = dict(text='Reader-authored source route.', author='Reader', origin='human')
    cite = dict(source='local', start_line=1, end_line=2)
    rules = [(['a', 'b'], 'c'), (['d'], 'c'), (['c', 'e'], 'f')]
    graph = dict(version=1, title='Local outline', description=explanation,
        sources=[dict(id='local', title='Unpublished source', file=f'study-sources/{digest}.txt',
                      sha256=digest, revision=digest, review='awaiting_human_review')],
        scopes=[dict(id='global', parent=None, variables=[], assumptions=[])],
        nodes=[dict(id=name, title=name.upper(), claim=name.upper(), explanation=explanation,
                    scope='global', citations=[cite]) for name in 'abcdef'],
        inferences=[dict(id=f'r{i}', premises=premises, conclusion=conclusion,
                         explanation=explanation, citations=[cite], discharges=[])
                    for i, (premises, conclusion) in enumerate(rules)],
        goals=['f'], suggested_hidden=['c'])
    return graph, {'local': raw}


class AtlasRecordTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(prefix='mrw-atlas-records-')
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name).resolve()
        self.graph, self.snapshots = graph_fixture()

    def request(self, filename, **values):
        return dict(project_root=str(self.root), path=str(self.root / filename), **values)

    def test_url_free_graph_quotes_exact_bytes_and_reopens_both_joint_alternatives(self):
        file = self.root / 'argument.mrw-proof.json'
        publish_graph(self.request(file.name, graph=self.graph, snapshots=self.snapshots))
        reopened = json.loads(file.read_bytes())
        self.assertEqual(reopened, self.graph)
        source = reopened['sources'][0]
        self.assertNotIn('url', source)
        self.assertEqual((self.root / source['file']).read_bytes(), self.snapshots['local'].encode())
        self.assertEqual(file.stat().st_mode & 0o777, 0o600)
        before = deepcopy(reopened)
        projection = project(reopened, ['c'])
        self.assertEqual([route['premises'] for route in projection['derivations']['f']],
                         [['a', 'b', 'e'], ['d', 'e']])
        self.assertEqual([route['inferences'] for route in projection['derivations']['f']],
                         [['r0', 'r2'], ['r1', 'r2']])
        self.assertEqual(reopened, before)

    def test_atlas_capture_digest_is_checked_and_earlier_revision_is_never_overwritten(self):
        text = '# Unpublished λ😀\nExact source.\n'
        record = dict(version=1, source=dict(text=text, revision=sha256(text.encode()).hexdigest(),
                      uri='file:///a/local/manuscript.md', title='Local manuscript', language='markdown'))
        content = json.dumps(record, ensure_ascii=False)
        first = self.request('first.mrw-atlas.json', text=content)
        saved = publish_atlas(first)
        self.assertEqual(saved['revision'], sha256(content.encode()).hexdigest())
        self.assertEqual((self.root / 'first.mrw-atlas.json').read_text(), content)
        changed = deepcopy(record)
        changed['source']['text'] += 'Changed source.\n'
        with self.assertRaisesRegex(ValueError, 'pinned revision'):
            publish_atlas(self.request('wrong.mrw-atlas.json', text=json.dumps(changed)))
        self.assertFalse((self.root / 'wrong.mrw-atlas.json').exists())
        with self.assertRaises((PrivatePersistenceError, FileExistsError)):
            publish_atlas(first)
        self.assertEqual((self.root / 'first.mrw-atlas.json').read_text(), content)
        with self.assertRaises(ValueError):
            publish_atlas(self.request('duplicate.mrw-atlas.json', text='{"version":1,"version":1}'))

    def test_changed_snapshot_or_inference_range_is_rejected_before_any_graph_is_published(self):
        for case in ('snapshot', 'inference', 'unapproved'):
            with self.subTest(case=case):
                graph, snapshots = deepcopy(self.graph), dict(self.snapshots)
                if case == 'snapshot':
                    snapshots['local'] += 'Not in the approved source.'
                elif case == 'inference':
                    graph['inferences'][0]['citations'][0]['end_line'] = 9999
                else:
                    snapshots['unselected'] = 'Never approved.'
                with self.assertRaisesRegex(ValueError, 'snapshot|passage|approved inputs'):
                    publish_graph(self.request(case + '.mrw-proof.json', graph=graph, snapshots=snapshots))
                self.assertFalse((self.root / (case + '.mrw-proof.json')).exists())
        self.assertFalse((self.root / 'study-sources').exists())

    def test_source_path_and_symlink_targets_cannot_redirect_snapshot_publication(self):
        outside = self.root / 'outside'; outside.mkdir()
        protected = outside / 'source.txt'; protected.write_text('Keep unrelated bytes.')
        folder = self.root / 'study-sources'; folder.symlink_to(outside, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, 'redirected'):
            publish_graph(self.request('redirected.mrw-proof.json', graph=self.graph, snapshots=self.snapshots))
        folder.unlink(); folder.mkdir()
        target = self.root / self.graph['sources'][0]['file']; target.symlink_to(protected)
        with self.assertRaisesRegex(ValueError, 'differs'):
            publish_graph(self.request('symlink.mrw-proof.json', graph=self.graph, snapshots=self.snapshots))
        self.assertEqual(protected.read_text(), 'Keep unrelated bytes.')
        graph = deepcopy(self.graph); graph['sources'][0]['file'] = '../source.txt'
        with self.assertRaisesRegex(ValueError, 'snapshot|path|relative'):
            publish_graph(self.request('path.mrw-proof.json', graph=graph, snapshots=self.snapshots))
        self.assertFalse((self.root / 'path.mrw-proof.json').exists())

    def test_existing_graph_and_snapshot_conflicts_preserve_both_originals(self):
        file = self.root / 'argument.mrw-proof.json'; file.write_text('Existing argument to keep.')
        with self.assertRaisesRegex(ValueError, 'exists'):
            publish_graph(self.request(file.name, graph=self.graph, snapshots=self.snapshots))
        self.assertEqual(file.read_text(), 'Existing argument to keep.')
        self.assertFalse((self.root / 'study-sources').exists())
        folder = self.root / 'study-sources'; folder.mkdir()
        source = self.root / self.graph['sources'][0]['file']; source.write_text('Different pinned bytes.')
        with self.assertRaisesRegex(ValueError, 'snapshot differs'):
            publish_graph(self.request('new.mrw-proof.json', graph=self.graph, snapshots=self.snapshots))
        self.assertEqual(source.read_text(), 'Different pinned bytes.')
        self.assertFalse((self.root / 'new.mrw-proof.json').exists())


if __name__ == '__main__':
    unittest.main()
