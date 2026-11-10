"""Explicit one-page Kerodon snapshots; no downloaded HTML or scripts execute.

The exact official response is retained with SHA-256 and UTC acquisition time.
It is not described as a Git-pinned TeX source. Only published mathematical page
content is projected into the existing inert source reader; navigation/comments
and scripts are not mathematical content. All later reading is offline.
"""
import base64
from datetime import datetime, timedelta
from hashlib import sha256
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
import re
from urllib.error import URLError
from urllib.request import build_opener, HTTPRedirectHandler, ProxyHandler, Request
from uuid import uuid4, uuid5, NAMESPACE_URL

from .local_files import read_bounded
from .private_persistence import persist_private_new
from .published_sources import local_tag, citation, qualified_tag, qualify_view
from .source import SourceDocument
from .source_outlines import (OutlineStore, BIBLIOGRAPHY, SCHEMA, directory, encoded,
                              fields, identity, now, span_text, validate_state)
from .source_api import source_span
from .stacks_tex import display_tokens
from .workspace import strict_json

SOURCE_ID = 'kerodon'
LIMIT = 1024 * 1024
PACKET = 'mrw.kerodon-acquisition'
MANIFEST = 'mrw.kerodon-section'


def digest(raw):
    return sha256(raw).hexdigest()


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        raise ValueError('Kerodon acquisition redirect refused')


def fetch(url, limit):
    if not re.fullmatch(r'https://kerodon\.net/tag/[A-Z0-9]{4}', url):
        raise ValueError('Unsupported Kerodon acquisition endpoint')
    request = Request(url, headers={'User-Agent': 'MRW-Kerodon-Importer/1', 'Accept-Encoding': 'identity'})
    try:
        with build_opener(ProxyHandler({}), _NoRedirect()).open(request, timeout=20) as response:
            if response.status != 200 or response.headers.get('Content-Encoding', 'identity') != 'identity':
                raise ValueError('Unsupported Kerodon response')
            if response.headers.get_content_type() not in ('text/html', 'application/xhtml+xml'):
                raise ValueError('Kerodon did not return an HTML page')
            size = response.headers.get('Content-Length')
            if size and (not size.isdecimal() or int(size) > limit):
                raise ValueError('Kerodon page exceeds its byte limit')
            raw = response.read(limit + 1)
    except URLError as exc:
        raise ValueError('Kerodon download failed: ' + str(exc.reason)) from exc
    if len(raw) > limit:
        raise ValueError('Kerodon page exceeds its byte limit')
    return raw


class Page(HTMLParser):
    VOID = {'br', 'hr', 'img', 'meta', 'link', 'input', 'wbr', 'source'}

    def __init__(self, text, *, coalesce_text=False):
        self.coalesce_text = coalesce_text
        super().__init__(convert_charrefs=False)
        self.text = text
        self.starts = [0] + [m.end() for m in re.finditer('\n', text)]
        self.nodes = []
        self.root = dict(name='root', attrs={}, start=0, end=len(text), children=[])
        self.stack = [self.root]
        self.feed(text)
        self.close()

    def source_offset(self):
        line, col = self.getpos()
        return self.starts[line - 1] + col

    def handle_starttag(self, name, attrs):
        at = self.source_offset()
        if self.stack[-1]['name'] == 'p' and name in ('p', 'article', 'div', 'ul', 'ol', 'h1', 'h2', 'h3', 'section'):
            self.stack.pop()['end'] = at
        if self.stack[-1]['name'] == 'li' and name == 'li':
            self.stack.pop()['end'] = at
        node = dict(name=name, attrs=dict(attrs), start=at, end=None, children=[])
        self.stack[-1]['children'].append(node)
        self.nodes.append(node)
        if len(self.nodes) > 30000 or len(self.stack) > 100:
            raise ValueError('Kerodon page structure exceeds its limit')
        if name in self.VOID:
            node['end'] = at + len(self.get_starttag_text())
        else:
            self.stack.append(node)

    def handle_startendtag(self, name, attrs):
        self.handle_starttag(name, attrs)
        if name not in self.VOID:
            self.stack.pop()['end'] = self.source_offset() + len(self.get_starttag_text())

    def handle_endtag(self, name):
        for i in range(len(self.stack) - 1, 0, -1):
            if self.stack[i]['name'] == name:
                # Optional HTML li/p endings outside the selected mathematical
                # region need not be inferred as published result boundaries.
                node = self.stack[i]
                node['end'] = self.text.find('>', self.source_offset()) + 1
                self.stack = self.stack[:i]
                return

    def handle_data(self, data):
        children = self.stack[-1]['children']
        # HTMLParser may split one text node at a literal '<' or an entity.
        # Rejoin those callbacks before interpreting mathematical delimiters.
        if self.coalesce_text and children and isinstance(children[-1], str):
            children[-1] += data
        else:
            children.append(data)

    def handle_entityref(self, name):
        self.handle_data(unescape('&' + name + ';'))

    def handle_charref(self, name):
        self.handle_data(unescape('&#' + name + ';'))


def plain(node):
    if isinstance(node, str):
        return node
    if node['name'] in ('script', 'style', 'template'):
        return ''
    return ''.join(plain(c) for c in node['children'])


def recipe(node, targets, refs, warnings, *, render_math=False, source_spec=None):
    if isinstance(node, str):
        # Gerby emits bare equation environments outside dollar delimiters.
        # This bounded display projection uses an inert three-column array;
        # labels remain in the exact HTML and are not mathematical content.
        equation = re.fullmatch(r'\s*\\begin\{(eqnarray\*?)\}(.*?)\\end\{\1\}\s*', node, re.S) if render_math else None
        if equation and len(node) <= 65536:
            body = re.sub(r'\\label\{[^{}]{1,200}\}', '', equation[2])
            return [dict(kind='math', text=r'\begin{array}{rcl}' + body + r'\end{array}', display=True)]
        result, warning = display_tokens(node, {})
        if warning:
            warnings.add(warning)
        return result
    name, attrs = node['name'], node['attrs']
    if name in ('script', 'style', 'template'):
        return []
    children = lambda: [t for c in node['children'] for t in recipe(c, targets, refs, warnings, render_math=render_math, source_spec=source_spec)]
    if name == 'a':
        base = re.escape(source_spec['origins'][0]) if source_spec else r'https://kerodon\.net'
        route = re.escape(source_spec['urlRules']['itemPath']).replace(re.escape('{id}'), r'([A-Z0-9]{4})') if source_spec else r'/tag/([A-Z0-9]{4})'
        match = re.fullmatch('(?:'+base+')?'+route, attrs.get('href', ''))
        if match:
            tag = match[1]
            if attrs.get('data-tag', tag) != tag:
                raise ValueError('Kerodon citation identity differs from its target')
            refs.add(tag)
            return [dict(kind='reference', label=plain(node), tag=tag, retained=tag in targets)]
    if name in ('ul', 'ol'):
        return [dict(kind='list', ordered=name == 'ol', items=[recipe(c, targets, refs, warnings, render_math=render_math, source_spec=source_spec)
                     for c in node['children'] if isinstance(c, dict) and c['name'] == 'li'])]
    if name in ('em', 'strong', 'code'):
        return [dict(kind=name, children=children())]
    if name in ('img', 'svg', 'iframe', 'object', 'canvas', 'math'):
        warnings.add('Embedded media is not rendered; consult the exact retained HTML or canonical page')
        return [dict(kind='raw', text='[Embedded media: ' + name + ']')]
    result = children()
    if name in ('p', 'div', 'br', 'article', 'li'):
        result.append(dict(kind='paragraph'))
    return result


def compact_paragraphs(tokens):
    """Nested HTML blocks contribute one visual paragraph boundary, not many."""
    result = []
    for token in tokens:
        token = dict(token)
        if 'children' in token:
            token['children'] = compact_paragraphs(token['children'])
        if 'items' in token:
            token['items'] = [compact_paragraphs(item) for item in token['items']]
        if token['kind'] == 'paragraph':
            while result and result[-1]['kind'] == 'text' and not result[-1]['text'].strip():
                result.pop()
            if result and result[-1]['kind'] != 'paragraph':
                result.append(token)
        elif token['kind'] == 'text' and not token['text'].strip():
            if result and result[-1]['kind'] != 'paragraph':
                result.append(dict(kind='text', text=' '))
        else:
            result.append(token)
    while result and (result[-1]['kind'] == 'paragraph' or
                      result[-1]['kind'] == 'text' and not result[-1]['text'].strip()):
        result.pop()
    return result


def extract(source, tag, *, coalesce_text=False, source_spec=None):
    # The original token recipe remains the validation format for retained v1
    # manifests. Display can improve without rewriting that historical payload.
    page = Page(source.text.removeprefix('\ufeff'), coalesce_text=coalesce_text)
    mains = [n for n in page.nodes if n['name'] == 'section' and n['attrs'].get('id') == 'main']
    if len(mains) != 1 or not mains[0]['end']:
        raise ValueError('Kerodon page has no complete unique mathematical body')
    main = mains[0]
    wrappers = [n for n in main['children'] if isinstance(n, dict) and n['attrs'].get('id') == 'tag']
    if len(wrappers) == 1: main = wrappers[0]
    headings = [n for n in main['children'] if isinstance(n, dict) and
                re.search(r'\btex-(?:sub)?section\b', n['attrs'].get('class', ''))]
    if len(headings) != 1:
        raise ValueError('Choose a Kerodon section or subsection tag, rather than an individual result or chapter')
    heading = headings[0]
    heading_tags = [n['attrs'].get('data-tag') for n in page.nodes
                    if heading['start'] < n['start'] < (heading['end'] or 0) and n['attrs'].get('data-tag')]
    if heading_tags != [tag]:
        raise ValueError('Kerodon page identity differs from the requested tag')
    title = ' '.join(plain(heading).split())
    number, _, title = title.partition(' ')
    if not re.fullmatch(r'\d+(?:\.\d+)+', number) or not title:
        raise ValueError('Unsupported Kerodon section heading')
    body = []
    for node in main['children'][main['children'].index(heading) + 1:]:
        if isinstance(node, dict) and (node['name'] in ('h1', 'h2', 'h3', 'section') or node['attrs'].get('id') in ('structure', 'comments')):
            break
        body.append(node)
    articles = [n for n in body if isinstance(n, dict) and n['name'] == 'article']
    targets, last, parts = set(), None, []
    for node in articles:
        env = node['attrs'].get('class', '')
        if not re.fullmatch(r'env-[a-z]+', env) or not node['end']:
            raise ValueError('Unsupported or incomplete Kerodon result boundary')
        if env != 'env-proof':
            key = node['attrs'].get('id')
            if not key or not re.fullmatch(r'[A-Z0-9]{4}', key) or key in targets:
                raise ValueError('Missing or duplicate Kerodon result identity')
            targets.add(key)
        if any(n['name'] == 'article' and node['start'] < n['start'] < node['end'] for n in page.nodes):
            raise ValueError('Nested Kerodon result boundaries are unsupported')
    refs = set()
    for node in body:
        if isinstance(node, str):
            if node.strip(): raise ValueError('Unsupported unwrapped Kerodon mathematical content')
            continue
        media = any(n['name'] in ('img', 'svg', 'iframe', 'object', 'canvas', 'math') and
                    node['start'] <= n['start'] < (node['end'] or 0) for n in page.nodes)
        if not plain(node).strip() and not media:
            continue
        is_article = node['name'] == 'article'
        env = node['attrs'].get('class', '')
        if is_article and env == 'env-proof':
            if last is None:
                raise ValueError('Kerodon proof has no immediately preceding published result')
            key, role, label = last, 'proof', 'Proof'
            last = None
        elif is_article:
            key, role = node['attrs']['id'], 'statement'
            label = env.removeprefix('env-').capitalize()
            last = key
        else:
            key, role, label = tag, 'context', 'Source context'
            last = None
        if not node['end']:
            raise ValueError('Incomplete Kerodon mathematical content')
        own_warnings = set()
        tokens = recipe(node, targets, refs, own_warnings, render_math=coalesce_text, source_spec=source_spec)
        if coalesce_text:
            tokens = compact_paragraphs(tokens)
        parts.append(dict(tag=key, role=role, title=qualified_tag(SOURCE_ID, key) + ' — ' + label,
                          span=source_span(source, node['start'], node['end']), tokens=tokens,
                          warning='; '.join(sorted(own_warnings)) or None))
    if not parts or len(parts) > 64:
        raise ValueError('Kerodon page must contain between 1 and 64 supported passages; choose a smaller subsection')
    return dict(tag=tag, title=title, chapter='Kerodon', chapter_tag=None, section_number=number,
                previous=None, next=None, limitation=None, parts=parts, reference_tags=sorted(refs))


def unpack(packet):
    fields(packet, {'schema', 'version', 'source_id', 'tag', 'retrieved_at', 'page'}, 'Kerodon acquisition')
    if packet['schema'] != PACKET or type(packet['version']) is not int or packet['version'] != 1 or packet['source_id'] != SOURCE_ID:
        raise ValueError('Unsupported Kerodon acquisition identity')
    if local_tag(SOURCE_ID, packet['tag']) != packet['tag']:
        raise ValueError('Noncanonical Kerodon tag')
    when = packet['retrieved_at']
    if not isinstance(when, str) or len(when) > 64 or datetime.fromisoformat(when).utcoffset() != timedelta(0):
        raise ValueError('Invalid Kerodon UTC acquisition time')
    if not isinstance(packet['page'], str) or len(packet['page']) > (LIMIT * 4 // 3 + 8):
        raise ValueError('Kerodon page exceeds its byte limit')
    raw = base64.b64decode(packet['page'], validate=True)
    if len(raw) > LIMIT or b'\0' in raw:
        raise ValueError('Unsupported Kerodon exact-byte payload')
    raw.decode('utf-8')
    return raw


def preparation_directory(store):
    from .artifact_context import CURRENT
    access = CURRENT.get()
    runtime = access.manager.runtime if access is not None else store.base.parent / 'artifact-runtime'
    target = runtime / 'kerodon-preparations'
    if target.resolve() != target:
        raise ValueError('Redirected Kerodon preparation directory')
    directory(target)
    return target


def prepare(request, downloader=None):
    tag = local_tag(SOURCE_ID, request['input'])
    raw = (downloader or fetch)(citation(SOURCE_ID, tag), LIMIT)
    packet = dict(schema=PACKET, version=1, source_id=SOURCE_ID, tag=tag, retrieved_at=now(),
                  page=base64.b64encode(raw).decode('ascii'))
    raw = unpack(packet)
    source = SourceDocument.from_bytes('/kerodon-' + tag + '.html', raw)
    section = extract(source, tag)
    store = OutlineStore(request['store'], request['project_root'])
    from .outline_references import scope
    ticket = str(uuid4())
    persist_private_new(preparation_directory(store) / (ticket + '.json'), encoded(dict(
        scope=scope(store), project=str(store.root), packet_hash=digest(encoded(packet)))))
    return dict(ticket=ticket, packet=packet, section=section, source_revision=source.revision)


def _manifest(store):
    acquisition = store.state['acquisition']
    if acquisition['kind'] != 'kerodon-section':
        raise ValueError('This retained source is not Kerodon')
    artifact = next(a for a in store.state['artifacts'] if a['id'] == acquisition['artifact'])
    manifest = strict_json(store.artifact(artifact))
    fields(manifest, {'schema', 'version', 'source_id', 'tag', 'retrieved_at', 'source_revision', 'parts'}, 'Kerodon provenance')
    if manifest['schema'] != MANIFEST or manifest['version'] != 1 or manifest['source_id'] != SOURCE_ID or manifest['source_revision'] != store.source().revision:
        raise ValueError('Retained Kerodon provenance differs from its exact source')
    section = extract(store.source(), manifest['tag'])
    expected = [{k: v for k, v in p.items() if k != 'region'} for p in manifest['parts']]
    if expected != section['parts']:
        raise ValueError('Retained Kerodon structure differs from its exact source')
    return manifest, section


def enrich(store, value):
    try:
        manifest, _ = _manifest(store)
        section = extract(store.source(), manifest['tag'], coalesce_text=True)
        parts = {}
        for retained, displayed in zip(manifest['parts'], section['parts'], strict=True):
            if any(retained[key] != displayed[key] for key in ('tag', 'role', 'title', 'span')):
                raise ValueError('Display projection differs from the exact retained passage')
            parts[retained['region']] = {**retained, 'tokens': displayed['tokens'],
                'warning': displayed['warning'], 'exact_text': span_text(store.source(), retained['span']), 'format': 'html'}
        value['published'] = qualify_view(dict(**{k: v for k, v in section.items() if k != 'parts'},
            parts=parts, source_file='kerodon-' + manifest['tag'] + '.html', source_revision=manifest['source_revision'],
            citation=citation(SOURCE_ID, manifest['tag']), authors='Jacob Lurie', commit=None,
            retrieved_at=manifest['retrieved_at'], format='html', revision_kind='page-snapshot',
            license='No license statement supplied by the retrieved page; not labeled as Stacks Project GFDL',
            acquisition_artifacts=[value['acquisition']['artifact']], error=None), SOURCE_ID)
        value['source_status'] = 'retained upstream page snapshot'
    except (OSError, ValueError, KeyError, TypeError, StopIteration) as exc:
        value['published'] = {'error': 'Retained Kerodon import unavailable: ' + str(exc)}
    return value


def commit_import(request):
    store = OutlineStore(request['store'], request['project_root'])
    ticket, packet = identity(request['ticket']), request['packet']
    from .outline_references import scope
    saved = strict_json(read_bounded(preparation_directory(store) / (ticket + '.json'), 4096, 'Kerodon preparation'))
    if saved != dict(scope=scope(store), project=str(store.root), packet_hash=digest(encoded(packet))):
        raise ValueError('Kerodon preparation changed or belongs to another workspace')
    raw = unpack(packet)
    source = SourceDocument.from_bytes('/kerodon-' + packet['tag'] + '.html', raw)
    section = extract(source, packet['tag'])
    store.id = str(uuid5(NAMESPACE_URL, str(store.root) + '\0' + qualified_tag(SOURCE_ID, packet['tag']) + '@' + source.revision))
    store.directory = store.base / store.id
    if store.directory.resolve() != store.directory:
        raise ValueError('Redirected Kerodon import directory')
    if (store.directory / 'outline.json').exists():
        existing = OutlineStore(str(store.base), str(store.root), store.id)
        _manifest(existing)
        result = existing.view(); result['reused'] = True
        return result
    parts, regions = [], []
    for index, part in enumerate(section['parts']):
        key = str(uuid5(NAMESPACE_URL, store.id + ':part:' + str(index)))
        parts.append(dict(**part, region=key))
        regions.append(dict(id=key, title=part['title'], level='orientation' if part['role'] == 'context' else
                            'argument' if part['role'] == 'proof' else 'concepts_results', span=part['span'],
                            statement=None, collapsed=False, annotations=[]))
    manifest = dict(schema=MANIFEST, version=1, source_id=SOURCE_ID, tag=packet['tag'],
                    retrieved_at=packet['retrieved_at'], source_revision=source.revision, parts=parts)
    retained = encoded(manifest); key = str(uuid5(NAMESPACE_URL, store.id + ':provenance'))
    artifact = dict(id=key, path=str(store.blob(digest(retained))), revision=digest(retained),
                    kind='supporting_artifact', label='Kerodon page provenance', region=None, selector=None,
                    captured_at=packet['retrieved_at'])
    bibliography = {k: None for k in BIBLIOGRAPHY}
    bibliography.update(title=section['title'], authors='Jacob Lurie', reference=citation(SOURCE_ID, packet['tag']),
                        locator=qualified_tag(SOURCE_ID, packet['tag']) + ' · section ' + section['section_number'],
                        revision='Page SHA-256 ' + source.revision)
    state = dict(schema=SCHEMA, version=2, id=store.id, project_root=str(store.root), created_at=now(),
        source=dict(path=str(store.blob(source.revision, source=True)), revision=source.revision,
                    authorship='unknown', bibliography=bibliography), regions=regions, contexts=[], annotations=[],
        artifacts=[artifact], acquisition=dict(kind='kerodon-section', artifact=key))
    validate_state(state, store.root, store.id)
    if len(encoded(state)) > 512 * 1024:
        raise ValueError('Kerodon saved source exceeds the existing state limit')
    for part in parts:
        span_text(source, part['span'])
    allowed = {store.blob(source.revision, source=True).name, 'outline.json', 'artifact-' + artifact['revision'] + '.bin'}
    if store.directory.exists() and any(p.name not in allowed for p in store.directory.iterdir()):
        raise ValueError('Existing import directory contains unrelated material')
    try:
        directory(store.directory); store.retain(raw, source=True); store.retain(retained)
        result = store.publish(state)
    except (OSError, ValueError) as exc:
        return {'blocked': True, 'write_error': str(exc)}
    result['reused'] = False
    return result


def retained_reference(request):
    store = OutlineStore(request['store'], request['project_root'], request['id']); store.expect(request['revision'])
    manifest, _ = _manifest(store)
    tag = local_tag(SOURCE_ID, request['tag'])
    target = next((p for p in manifest['parts'] if p['tag'] == tag and p['role'] == 'statement'), None)
    if target is None:
        raise ValueError('This Kerodon citation is outside the retained page; open its canonical citation explicitly')
    from .outline_references import pinned_reference, reference_action
    reference = pinned_reference(store, store.source(), target['region'], target['span'])
    return reference_action(dict(method='outline_follow_reference', store=str(store.base), project_root=str(store.root), reference=reference))


def kerodon_action(request):
    return {'outline_kerodon_prepare': prepare, 'outline_kerodon_import': commit_import,
            'outline_kerodon_reference': retained_reference}[request['method']](request)
