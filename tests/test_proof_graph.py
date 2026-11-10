"""Projection is a navigation operation over an attributed proposed argument."""
from copy import deepcopy
from pathlib import Path
import itertools
import json
import random
import unittest
from unittest.mock import patch

from mrw.editor_bridge import dispatch
from mrw.proof_graph import project


def explanation(s='Reason'):
    return dict(text=s, author='Test author', origin='ai_proposal')


def graph(names='abcd', rules=()):
    return dict(version=1, title='Outline', description=explanation(), sources=[],
                scopes=[dict(id='global', parent=None, variables=['X : Type'], assumptions=['H'])],
                nodes=[dict(id=n, title=n, claim=n, explanation=explanation(), scope='global', citations=[]) for n in names],
                inferences=[dict(id=f'r{i}', premises=list(ps), conclusion=c,
                                 explanation=explanation(), discharges=[]) for i, (ps, c) in enumerate(rules)],
                goals=[names[-1]], suggested_hidden=[])


class ProofGraphTests(unittest.TestCase):
    def test_08zh_diagonal_and_equalizer_routes_survive_the_ai_selection(self):
        g = json.loads((Path(__file__).parent/'fixtures/proof_graph_08zh.json').read_text())
        p = project(g, g['suggested_hidden'])
        self.assertEqual(len(p['derivations']['closed-fiber']), 2)
        diagonal, equalizer = p['derivations']['closed-fiber']
        self.assertEqual(diagonal['premises'], ['closed-diagonal', 'continuous-f', 'continuous-g', 'fiber-definition', 'preimage-fact', 'projection-fact'])
        self.assertEqual(equalizer['premises'], ['continuous-f', 'continuous-g', 'equalizer-fact', 'fiber-definition', 'hausdorff', 'projection-fact'])
        self.assertIn('inverse-image', diagonal['hidden'])
        self.assertIn('apply-equalizer', equalizer['inferences'])
        self.assertEqual(project(g, [])['hidden'], [])

    def test_parser_rejects_duplicate_keys_and_nonstandard_json(self):
        for raw in ('{"version":1,"version":1}', '{"version":NaN}'):
            with self.assertRaises(ValueError):
                dispatch(dict(protocol=1, method='proof_graph_parse', text=raw))
        g = graph('abcd', [('a', 'b'), ('b', 'c'), ('c', 'd')])
        self.assertEqual(dispatch(dict(protocol=1,method='proof_graph_parse',text=json.dumps(g)))['graph'],g)

    def test_joint_premises_and_alternative_derivations_remain_distinct(self):
        g = graph('abcdef', [('ab', 'c'), ('d', 'c'), ('ce', 'f')])
        p = project(g, ['c'])
        self.assertEqual([r['premises'] for r in p['derivations']['f']], [['a', 'b', 'e'], ['d', 'e']])
        self.assertEqual(p['derivations']['f'][0]['inferences'], ['r0', 'r2'])
        self.assertEqual(p['derivations']['f'][1]['inferences'], ['r1', 'r2'])
        self.assertIn('c', p['derivations']['f'][0]['hidden'])
        self.assertEqual(g['inferences'][0]['premises'], ['a', 'b'])

    def test_all_path_witnesses_survive_a_diamond_and_a_direct_edge(self):
        g = graph('abcd', [('a', 'b'), ('a', 'c'), ('b', 'd'), ('c', 'd'), ('a', 'd')])
        p = project(g, ['b', 'c'])
        self.assertEqual(p['edges'], [dict(**{'from': 'a', 'to': 'd'}, direct=True,
                                        via=['b', 'c'], inferences=['r0', 'r1', 'r2', 'r3', 'r4'])])
        self.assertEqual(len(p['derivations']['d']), 3)

    def test_projection_matches_path_oracle_for_many_dags_and_selections(self):
        rng = random.Random(812)
        for _ in range(35):
            names = 'abcdefg'
            rules = [(a, b) for i, a in enumerate(names) for b in names[i+1:] if rng.random() < .4]
            g = graph(names, rules)
            pinned = set(project(g, [])['pinned'])
            candidates = sorted(set(names) - pinned)
            for size in range(len(candidates)+1):
                for selection in itertools.combinations(candidates, size):
                    hidden = set(selection); kept = set(names) - hidden
                    edges = set()
                    def walk(start, n):
                        for a, b in rules:
                            if a != n:
                                continue
                            if b in kept:
                                edges.add((start, b))
                            else:
                                walk(start, b)
                    for start in kept:
                        walk(start, start)
                    p = project(g, list(selection))
                    self.assertEqual({(e['from'], e['to']) for e in p['edges']}, edges)
                    self.assertEqual(project(g, list(reversed(selection))), p)

    def test_scope_assumptions_and_discharge_boundaries_cannot_disappear(self):
        g = graph('abcd', [('a', 'b'), ('b', 'c'), ('c', 'd')])
        g['scopes'].append(dict(id='local', parent='global', variables=['x : X'], assumptions=['P(x)']))
        g['nodes'][1]['scope'] = g['nodes'][2]['scope'] = 'local'
        g['inferences'][2]['discharges'] = ['local']
        p = project(g, [])
        self.assertEqual(p['scope_chains']['local'], ['global', 'local'])
        self.assertEqual(p['pinned'], ['a', 'b', 'c', 'd'])
        for n in 'bc':
            with self.assertRaisesRegex(ValueError, 'scope boundary'):
                project(g, [n])
        g['inferences'][2]['discharges'] = []
        with self.assertRaisesRegex(ValueError, 'scope'):
            project(g, [])

    def test_cycles_missing_nodes_and_premise_or_goal_deletion_are_rejected(self):
        g = graph('abcd', [('a', 'b'), ('b', 'c'), ('c', 'd')])
        for hidden in (['a'], ['d'], ['missing'], ['b', 'b']):
            with self.assertRaises(ValueError):
                project(g, hidden)
        g['inferences'][0]['premises'] = ['c']
        with self.assertRaisesRegex(ValueError, 'acyclic'):
            project(g, [])
        g['inferences'][0]['premises'] = ['missing']
        with self.assertRaisesRegex(ValueError, 'missing'):
            project(g, [])

    def test_exponential_alternatives_fail_without_truncation_or_mutation(self):
        names = ['base'] + [f'n{i}' for i in range(11)] + ['goal']
        rules = []
        for n in names[1:-1]:
            rules += [(['base'], n), (['base'], n)]
        rules.append((names[1:-1], 'goal'))
        g = graph(names, rules); before = deepcopy(g)
        with self.assertRaisesRegex(ValueError, '1024 derivations'):
            project(g, names[1:-1])
        self.assertEqual(g, before)

    def test_bridge_is_offline_pure_and_rejects_fabricated_status_fields(self):
        g = graph('abcd', [('a', 'b'), ('b', 'c'), ('c', 'd')])
        before = json.dumps(g)
        with patch('socket.socket', side_effect=AssertionError('network')), patch('subprocess.Popen', side_effect=AssertionError('compiler')):
            r = dispatch(dict(protocol=1, method='proof_graph', graph=g, hidden=['b']))
            restored = dispatch(dict(protocol=1, method='proof_graph', graph=g, hidden=[]))
        self.assertEqual(json.dumps(g), before)
        self.assertEqual(r['revision'], restored['revision'])
        g['nodes'][0]['verified'] = True
        with self.assertRaises(ValueError):
            project(g, [])


if __name__ == '__main__':
    unittest.main()
