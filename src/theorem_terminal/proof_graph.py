"""Bounded, attributed inference outlines; display projection, never a checker.

An inference's premises are conjunctive. Inferences with the same conclusion
are alternatives. Deletion projects the original DAG, retaining witnesses and
the full joint-premise derivations. No source, file, model, or compiler is run.
"""

from functools import lru_cache
from hashlib import sha256
from itertools import product
import json
import re
from urllib.parse import urlsplit

MAX_NODES = 64
MAX_RULES = 128
MAX_ROUTES = 1024
MAX_BYTES = 512 * 1024


def fields(value, required, optional=()):
    if not isinstance(value, dict) or not set(required) <= value.keys() or value.keys() - set(required) - set(optional):
        raise ValueError('Invalid proof outline fields')


def text(value, limit=8192):
    if not isinstance(value, str) or not value.strip() or len(value) > limit or any(ord(c) < 32 and c not in '\n\t\r' for c in value):
        raise ValueError('Invalid proof outline text')
    value.encode('utf-8', errors='strict')
    return value


def identifier(value):
    if not isinstance(value, str) or not re.fullmatch(r'[a-z][a-z0-9_-]{0,63}', value):
        raise ValueError('Invalid proof outline identifier')
    return value


def items(value, limit, empty=True):
    if not isinstance(value, list) or len(value) > limit or (not empty and not value):
        raise ValueError('Proof outline list exceeds its bound or is empty')
    return value


def ids(value, limit, empty=True):
    values = [identifier(v) for v in items(value, limit, empty)]
    if len(values) != len(set(values)):
        raise ValueError('Duplicate proof outline identifiers')
    return values


def explanation(value):
    fields(value, {'text', 'author', 'origin'})
    text(value['text']); text(value['author'], 160)
    if value['origin'] not in ('ai_proposal', 'human'):
        raise ValueError('Explanation origin must be ai_proposal or human')


def validate(graph):
    fields(graph, {'version', 'title', 'description', 'sources', 'scopes', 'nodes', 'inferences', 'goals', 'suggested_hidden'})
    if type(graph['version']) is not int or graph['version'] != 1:
        raise ValueError('Unsupported proof outline version')
    if len(json.dumps(graph, ensure_ascii=False).encode('utf-8')) > MAX_BYTES:
        raise ValueError('Proof outline exceeds 512 KiB')
    text(graph['title'], 240); explanation(graph['description'])
    sources = {}
    for s in items(graph['sources'], 16):
        fields(s, {'id', 'title', 'file', 'sha256', 'url', 'revision', 'review'}, {'environment'})
        identifier(s['id']); text(s['title'], 240); text(s['revision'], 160)
        if s['id'] in sources:
            raise ValueError('Duplicate source identifier')
        name = text(s['file'], 512)
        if name.startswith(('/', '\\')) or '\\' in name or any(p in ('', '.', '..') for p in name.split('/')) or not name.endswith(('.tex', '.lean', '.txt', '.md', '.json')):
            raise ValueError('Source snapshot must be a relative text file')
        if not isinstance(s['sha256'], str) or not re.fullmatch('[0-9a-f]{64}', s['sha256']):
            raise ValueError('Source snapshot digest required')
        url = urlsplit(text(s['url'], 2048))
        if url.scheme != 'https' or not url.hostname or url.username or url.password:
            raise ValueError('Source URL must be HTTPS')
        if s['review'] not in ('published', 'human_reviewed', 'awaiting_human_review'):
            raise ValueError('Invalid source review tier')
        if 'environment' in s:
            text(s['environment'], 1024)
        sources[s['id']] = s
    scopes = {}
    for s in items(graph['scopes'], 16, False):
        fields(s, {'id', 'parent', 'variables', 'assumptions'})
        identifier(s['id'])
        if s['id'] in scopes:
            raise ValueError('Duplicate scope identifier')
        if s['parent'] is not None:
            identifier(s['parent'])
        for name in ('variables', 'assumptions'):
            for v in items(s[name], 32):
                text(v, 2048)
        scopes[s['id']] = s
    chains = {}
    for sid in scopes:
        chain, current = [], sid
        while current is not None:
            if current not in scopes or current in chain:
                raise ValueError('Missing or cyclic local scope')
            chain.append(current); current = scopes[current]['parent']
        chains[sid] = list(reversed(chain))
    nodes = {}
    for n in items(graph['nodes'], MAX_NODES, False):
        fields(n, {'id', 'title', 'claim', 'explanation', 'scope', 'citations'})
        identifier(n['id']); identifier(n['scope']); text(n['title'], 240); text(n['claim']); explanation(n['explanation'])
        if n['id'] in nodes or n['scope'] not in scopes:
            raise ValueError('Duplicate node or missing scope')
        for c in items(n['citations'], 12):
            fields(c, {'source', 'start_line', 'end_line'}, {'declaration', 'reference'})
            identifier(c['source'])
            if c['source'] not in sources or any(type(c[k]) is not int for k in ('start_line', 'end_line')) or not 1 <= c['start_line'] <= c['end_line'] <= 1000000:
                raise ValueError('Invalid source citation range')
            if 'declaration' in c:
                text(c['declaration'], 240)
            if 'reference' in c:
                from .outline_references import parse_reference
                parse_reference(c['reference'])
        nodes[n['id']] = n
    rules, incoming, successors = {}, {n: [] for n in nodes}, {n: set() for n in nodes}
    pinned = set(ids(graph['goals'], MAX_NODES, False))
    if not pinned <= nodes.keys():
        raise ValueError('Missing proof outline goal')
    for rule in items(graph['inferences'], MAX_RULES):
        fields(rule, {'id', 'premises', 'conclusion', 'explanation', 'discharges'})
        identifier(rule['id']); identifier(rule['conclusion']); explanation(rule['explanation'])
        premises = ids(rule['premises'], 16, False)
        if rule['id'] in rules or not set(premises + [rule['conclusion']]) <= nodes.keys():
            raise ValueError('Duplicate inference or missing premise/conclusion')
        cs = nodes[rule['conclusion']]['scope']
        discharged = ids(rule['discharges'], 16)
        if any(s not in scopes or scopes[s]['parent'] != cs for s in discharged):
            raise ValueError('A discharge must name a direct child of the conclusion scope')
        used = set()
        for premise in premises:
            ps = nodes[premise]['scope']
            if ps not in chains[cs]:
                if ps not in discharged:
                    raise ValueError('Inference crosses a local scope without explicit discharge')
                used.add(ps)
            if ps != cs:
                # Scope boundaries stay visible; projection cannot export an
                # assumption into its parent by suppressing the discharge step.
                pinned.update((premise, rule['conclusion']))
            successors[premise].add(rule['conclusion'])
        if used != set(discharged):
            raise ValueError('Discharge does not match the scoped premises')
        rules[rule['id']] = rule; incoming[rule['conclusion']].append(rule['id'])
    degree = {n: 0 for n in nodes}
    for values in successors.values():
        for n in values:
            degree[n] += 1
    ready = sorted(n for n, d in degree.items() if d == 0); order = []
    while ready:
        n = ready.pop(0); order.append(n)
        for nxt in sorted(successors[n]):
            degree[nxt] -= 1
            if degree[nxt] == 0:
                ready.append(nxt); ready.sort()
    if len(order) != len(nodes):
        raise ValueError('Proof outline must be a directed acyclic graph')
    pinned.update(n for n in nodes if not incoming[n])
    suggested = set(ids(graph['suggested_hidden'], MAX_NODES))
    if not suggested <= nodes.keys() or suggested & pinned:
        raise ValueError('Suggested deletion contains a premise, goal, or scope boundary')
    return nodes, rules, incoming, successors, order, pinned, chains


def project(graph, hidden):
    nodes, rules, incoming, successors, order, pinned, chains = validate(graph)
    hidden = set(ids(hidden, MAX_NODES))
    if not hidden <= nodes.keys() or hidden & pinned:
        raise ValueError('Cannot delete a premise, goal, or local scope boundary')
    retained = set(nodes) - hidden

    # Each alternative is one inference tree compressed as sets of original
    # nodes/rules. Never truncate alternatives or interpret separate edges as
    # independently sufficient reasons.
    @lru_cache(None)
    def alternatives(n):
        if n in retained:
            return ((frozenset([n]), frozenset(), frozenset()),)
        result = []
        for rid in incoming[n]:
            result.extend(compose(rules[rid], frozenset([n])))
            if len(result) > MAX_ROUTES:
                raise ValueError('Deletion exceeds 1024 derivations; retain more intermediate claims')
        return tuple(result)

    def compose(rule, extra=frozenset()):
        groups = [alternatives(n) for n in rule['premises']]
        count = 1
        for group in groups:
            count *= len(group)
            if count > MAX_ROUTES:
                raise ValueError('Deletion exceeds 1024 derivations; retain more intermediate claims')
        result = []
        for choice in product(*groups):
            premises = frozenset().union(*(c[0] for c in choice))
            omitted = extra.union(*(c[1] for c in choice))
            witnesses = frozenset([rule['id']]).union(*(c[2] for c in choice))
            result.append((premises, omitted, witnesses))
        return result

    derivations = {}
    total = 0
    for n in order:
        if n not in retained:
            continue
        routes = []
        for rid in incoming[n]:
            for premises, omitted, witnesses in compose(rules[rid]):
                routes.append({'premises': sorted(premises), 'hidden': sorted(omitted),
                               'inferences': sorted(witnesses), 'root': rid})
                total += 1
                if total > MAX_ROUTES:
                    raise ValueError('Deletion exceeds 1024 derivations; retain more intermediate claims')
        derivations[n] = routes

    # Dynamic programming unions the complete witness subgraph for every
    # projected edge, including several paths and a simultaneous direct edge.
    edges = []
    for start in order:
        if start not in retained:
            continue
        reached = {start: (set(), set())}
        for n in order:
            if n not in reached or (n != start and n in retained):
                continue
            via, witness = reached[n]
            for nxt in successors[n]:
                used = {rid for rid in incoming[nxt] if n in rules[rid]['premises']}
                a, b = reached.setdefault(nxt, (set(), set()))
                a.update(via | ({n} if n in hidden else set())); b.update(witness | used)
        for end in order:
            if end != start and end in retained and end in reached:
                via, witness = reached[end]
                edges.append({'from': start, 'to': end, 'direct': end in successors[start],
                              'via': sorted(via), 'inferences': sorted(witness)})
    return {'order': [n for n in order if n in retained], 'hidden': sorted(hidden),
            'pinned': sorted(pinned), 'edges': edges, 'derivations': derivations,
            'scope_chains': chains}


def graph_action(request):
    graph = request['graph']
    projection = project(graph, request['hidden'])
    revision = sha256(json.dumps(graph, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')).hexdigest()
    return {'graph': graph, 'projection': projection, 'revision': revision}
