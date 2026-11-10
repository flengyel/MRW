"""Explicit, bounded Stacks section acquisition over the existing outline store.

GitHub's official repository ref pins every downloaded file to one commit.
Opening an imported outline, rendering, annotation and retained reference
following are entirely offline. No TeX, remote script or provider is executed.
"""
import base64
from datetime import datetime, timedelta
from hashlib import sha256
from pathlib import Path
import re
from urllib.error import URLError
from urllib.request import build_opener, HTTPRedirectHandler, ProxyHandler, Request
from uuid import uuid4, uuid5, NAMESPACE_URL

from .local_files import read_bounded
from .private_persistence import persist_private_new
from .source import SourceDocument
from .source_api import source_span
from .source_outlines import (OutlineStore, BIBLIOGRAPHY, MAX_SOURCE, SCHEMA,
                              directory, encoded, fields, identity, now,
                              select_span, span_text, validate_state)
from .stacks_tex import comment_mask, display_tokens, group, UnsupportedTex
from .workspace import strict_json

REPOSITORY = 'https://github.com/stacks/stacks-project'
RAW = 'https://raw.githubusercontent.com/stacks/stacks-project/'
REF = 'https://api.github.com/repos/stacks/stacks-project/git/ref/heads/master'
PACKET_LIMIT = 2 * 1024 * 1024
PACKET_SCHEMA = 'mrw.stacks-acquisition'
MANIFEST_SCHEMA = 'mrw.stacks-section'
ITEMS = {'lemma', 'theorem', 'proposition', 'corollary', 'definition',
         'remark', 'example', 'exercise', 'situation'}
PASSIVE_ENVS = {'enumerate', 'itemize', 'slogan', 'reference', 'history',
                'equation', 'equation*', 'align', 'align*', 'gather', 'gather*'}


def digest(raw):
    return sha256(raw).hexdigest()


def section_tag(value):
    from .published_sources import local_tag
    return local_tag('stacks-project', value)


def canonical_url(tag):
    if not isinstance(tag, str) or not re.fullmatch(r'[A-Z0-9]{4}', tag):
        raise ValueError('Invalid retained Stacks tag')
    return 'https://stacks.math.columbia.edu/tag/' + tag


class _NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, response, code, message, headers, url):
        raise ValueError('Stacks acquisition redirect refused; no replacement endpoint was used')


def fetch(url, limit):
    """Fixed official endpoints, verified HTTPS, no credentials or redirects."""
    if url != REF and not re.fullmatch(
            re.escape(RAW) + r'[a-f0-9]{40}/(?:[a-z][a-z0-9-]{0,79}\.tex|tags/tags|COPYING)', url):
        raise ValueError('Unsupported Stacks acquisition endpoint')
    opener = build_opener(ProxyHandler({}), _NoRedirect())
    request = Request(url, headers={'User-Agent': 'MRW-Stacks-Importer/1', 'Accept-Encoding': 'identity'})
    try:
        with opener.open(request, timeout=15) as response:
            if response.status != 200 or response.headers.get('Content-Encoding', 'identity') != 'identity':
                raise ValueError('Unsupported Stacks download response')
            length = response.headers.get('Content-Length')
            if length and (not length.isdecimal() or int(length) > limit):
                raise ValueError('Stacks download exceeds its byte limit')
            raw = response.read(limit + 1)
    except URLError as exc:
        raise ValueError('Stacks download failed; existing work is unchanged: ' + str(exc.reason)) from exc
    if len(raw) > limit:
        raise ValueError('Stacks download exceeds its byte limit')
    return raw


def tag_map(raw):
    mapping, reverse = {}, {}
    for line in raw.decode('utf-8').splitlines():
        if not line or line.startswith('#'):
            continue
        if not re.fullmatch(r'[0-9A-Z]{4},[A-Za-z0-9_.:+-]+', line):
            raise ValueError('Unsupported or malformed pinned Stacks tag-map line')
        tag, name = line.split(',')
        if tag in mapping or name in reverse:
            raise ValueError('Ambiguous pinned Stacks tag map; no target was guessed')
        mapping[tag], reverse[name] = name, tag
    if not mapping:
        raise ValueError('Empty Stacks tag map')
    return mapping, reverse


def chapter_for(mapping, tag):
    match = re.fullmatch(r'([a-z][a-z0-9-]{0,79})-(section-.+)', mapping.get(tag, ''))
    if not match or match[1] == 'preamble':
        raise ValueError('Choose a section tag; an individual result or unknown tag is not a section')
    if match[2] == 'section-phantom':
        raise ValueError('This tag identifies a chapter; choose a section within that chapter')
    return match[1], match[2]



def _heading(masked, match):
    title, end = group(masked, match.end())
    label = re.match(r'\s*\\label\s*\{([^{}]+)\}', masked[end:])
    if label is None:
        raise ValueError('A source section lacks its immediate published label')
    return dict(title=title, label=label[1], start=match.start(), body=end + label.end())


def extract(source, mapping_raw, tag):
    """Recover complete top-level spans, respecting nested environments/comments."""
    mapping, reverse = tag_map(mapping_raw)
    chapter, label = chapter_for(mapping, tag)
    value = source.text.removeprefix('\ufeff')
    masked = comment_mask(value)
    sections = [_heading(masked, match) for match in re.finditer(r'\\section\b', masked)]
    matches = [i for i, section in enumerate(sections) if section['label'] == label]
    if len(matches) != 1:
        raise ValueError('Source/tag-map revision mismatch: the selected section is not uniquely present')
    index = matches[0]
    selected = sections[index]
    end = sections[index + 1]['start'] if index + 1 < len(sections) else masked.find(r'\end{document}', selected['body'])
    if end < 0:
        raise ValueError('The selected source section has no complete end boundary')
    title_match = re.search(r'\\title\s*\{', masked)
    chapter_title = group(masked, title_match.start() + len(r'\title'))[0] if title_match else chapter
    def neighbour(offset):
        if not 0 <= offset < len(sections):
            return None
        item = sections[offset]
        return dict(title=item['title'], tag=reverse.get(chapter + '-' + item['label']))
    result = dict(tag=tag, title=selected['title'], chapter=chapter_title,
                  chapter_tag=reverse.get(chapter + '-section-phantom'),
                  section_number=index + 1, previous=neighbour(index - 1), next=neighbour(index + 1),
                  span=source_span(source, selected['start'], end), parts=[], references={},
                  limitation=None)
    body = masked[selected['body']:end]
    for match in re.finditer(r'\\ref\s*\{([^{}]+)\}', body):
        ref = match[1]
        result['references'][ref] = dict(tag=reverse.get(ref) or reverse.get(chapter + '-' + ref))
    try:
        if re.search(r'\\(?:input|include|def|edef|newcommand|renewcommand|catcode)\b', body):
            raise UnsupportedTex('Section contains an inclusion or macro definition; source retained without expansion')
        stack, segments = [], []
        for match in re.finditer(r'\\(begin|end)\s*\{([A-Za-z*]+)\}', body):
            command, env = match[1], match[2]
            if command == 'begin':
                if env not in ITEMS | PASSIVE_ENVS | {'proof'}:
                    raise UnsupportedTex('Unsupported source environment ' + env)
                if stack and env in ITEMS | {'proof'}:
                    raise UnsupportedTex('Nested result/proof environments require unsupported source interpretation')
                if not stack:
                    opened = selected['body'] + match.start()
                stack.append(env)
            else:
                if not stack or stack.pop() != env:
                    raise UnsupportedTex('Mismatched source environment ' + env)
                if not stack:
                    segments.append((opened, selected['body'] + match.end(), env))
        if stack:
            raise UnsupportedTex('Unclosed source environment ' + stack[-1])
        cursor, last_tag = selected['body'], None
        def context(a, b):
            if masked[a:b].strip():
                result['parts'].append(dict(role='context', tag=tag, title='Source context',
                                            span=source_span(source, a, b), body=[a, b]))
        for a, b, env in segments:
            context(cursor, a)
            env_open = re.match(r'\\begin\s*\{[^{}]+\}', masked[a:b])
            env_close = re.search(r'\\end\s*\{[^{}]+\}$', masked[a:b])
            content = [a + env_open.end(), a + env_close.start()]
            if env in ITEMS:
                labels = re.findall(r'\\label\s*\{([^{}]+)\}', masked[a:b])
                item_tag = reverse.get(chapter + '-' + labels[0]) if labels else None
                if item_tag is None:
                    raise ValueError('Source/tag-map revision mismatch: a published result has no matching stable tag')
                last_tag = item_tag
                role, title = 'statement', env.capitalize() + ' ' + item_tag + ' — Statement'
            elif env == 'proof':
                if last_tag is None:
                    raise UnsupportedTex('A proof has no preceding tagged statement')
                item_tag, role, title = last_tag, 'proof', last_tag + ' — Proof'
            else:
                item_tag, role, title, content = tag, 'context', 'Source context', [a, b]
            result['parts'].append(dict(role=role, tag=item_tag, title=title,
                                        span=source_span(source, a, b), body=content))
            cursor = b
        context(cursor, end)
        if len(result['parts']) > 64:
            raise UnsupportedTex('Section exceeds the existing 64-region outline limit')
        if not result['parts']:
            raise UnsupportedTex('Section has no supported source content')
    except UnsupportedTex as exc:
        result['limitation'] = str(exc)
        result['parts'] = []
    return result


def unpack(packet):
    fields(packet, {'schema', 'version', 'commit', 'tag', 'retrieved_at', 'files'}, 'Stacks acquisition')
    if packet['schema'] != PACKET_SCHEMA or type(packet['version']) is not int or packet['version'] != 1:
        raise ValueError('Unsupported Stacks acquisition version')
    if not isinstance(packet['commit'], str) or re.fullmatch(r'[a-f0-9]{40}', packet['commit']) is None:
        raise ValueError('Invalid pinned Stacks Git revision')
    if section_tag(packet['tag']) != packet['tag']:
        raise ValueError('Noncanonical Stacks section tag')
    if not isinstance(packet['retrieved_at'], str) or len(packet['retrieved_at']) > 64:
        raise ValueError('Invalid Stacks retrieval time')
    try:
        if datetime.fromisoformat(packet['retrieved_at']).utcoffset() != timedelta(0):
            raise ValueError('Retrieval time must identify UTC')
    except ValueError as exc:
        raise ValueError('Invalid Stacks UTC retrieval time') from exc
    if not isinstance(packet['files'], dict) or len(packet['files']) != 4 or 'tags/tags' not in packet['files']:
        raise ValueError('Missing matching Stacks tag map')
    files = {}
    for name, value in packet['files'].items():
        if not isinstance(value, str) or len(value) > (PACKET_LIMIT * 4 // 3 + 8):
            raise ValueError('Stacks acquisition exceeds its byte limit')
        try:
            files[name] = base64.b64decode(value, validate=True)
        except (ValueError, TypeError) as exc:
            raise ValueError('Invalid Stacks exact-byte payload') from exc
    if sum(len(raw) for raw in files.values()) > PACKET_LIMIT:
        raise ValueError('Combined Stacks acquisition exceeds 2 MiB; no import committed')
    mapping, _ = tag_map(files['tags/tags'])
    chapter, _ = chapter_for(mapping, packet['tag'])
    filename = chapter + '.tex'
    if set(files) != {filename, 'tags/tags', 'COPYING', 'preamble.tex'}:
        raise ValueError('Source and metadata filenames do not match the pinned section')
    for raw in files.values():
        if b'\0' in raw:
            raise ValueError('NUL is unsupported in a Stacks text source')
        raw.decode('utf-8')
    return files, filename


def preparation_directory(store):
    from .artifact_context import CURRENT
    access = CURRENT.get()
    runtime = access.manager.runtime if access is not None else store.base.parent / 'artifact-runtime'
    target = runtime / 'stacks-preparations'
    if target.resolve() != target:
        raise ValueError('Redirected Stacks preparation directory')
    directory(target)
    return target


def prepare(request, downloader=None):
    downloader = downloader or fetch
    tag = section_tag(request['input'])
    commit_reply = strict_json(downloader(REF, 128 * 1024))
    obj = commit_reply.get('object', {})
    commit = obj.get('sha')
    if obj.get('type') != 'commit' or not isinstance(commit, str) or not re.fullmatch(r'[a-f0-9]{40}', commit):
        raise ValueError('Official Stacks master ref did not identify a Git commit')
    data = {'tags/tags': downloader(RAW + commit + '/tags/tags', MAX_SOURCE)}
    mapping, _ = tag_map(data['tags/tags'])
    chapter, _ = chapter_for(mapping, tag)
    for name in [chapter + '.tex', 'COPYING', 'preamble.tex']:
        data[name] = downloader(RAW + commit + '/' + name, MAX_SOURCE)
    packet = dict(schema=PACKET_SCHEMA, version=1, commit=commit, tag=tag, retrieved_at=now(),
                  files={name: base64.b64encode(raw).decode('ascii') for name, raw in data.items()})
    files, filename = unpack(packet)
    source = SourceDocument.from_bytes('/' + filename, files[filename])
    section = extract(source, files['tags/tags'], tag)
    store = OutlineStore(request['store'], request['project_root'])
    from .outline_references import scope
    ticket = str(uuid4())
    persist_private_new(preparation_directory(store) / (ticket + '.json'),
                        encoded(dict(scope=scope(store), project=str(store.root), packet_hash=digest(encoded(packet)))))
    return dict(ticket=ticket, packet=packet, section=section,
                source_revision=source.revision, files={name: digest(raw) for name, raw in files.items()})


def _manifest(store):
    acquisition = store.state['acquisition']
    item = next((a for a in store.state['artifacts'] if a['id'] == acquisition['artifact']), None)
    if item is None:
        raise ValueError('Retained Stacks provenance is missing')
    manifest = strict_json(store.artifact(item))
    if (manifest.get('schema') != MANIFEST_SCHEMA or manifest.get('version') != 1
            or manifest.get('source_revision') != store.state['source']['revision']):
        raise ValueError('Retained Stacks source/provenance revision mismatch')
    files = {}
    for name, record in manifest['files'].items():
        if record['artifact'] is None:
            raw = store.source().text.encode('utf-8')
        else:
            attached = next((a for a in store.state['artifacts'] if a['id'] == record['artifact']), None)
            if attached is None:
                raise ValueError('Retained Stacks metadata dependency is missing: ' + name)
            raw = store.artifact(attached)
        if digest(raw) != record['sha256']:
            raise ValueError('Retained Stacks metadata revision differs: ' + name)
        files[name] = raw
    source = store.source()
    section = extract(source, files['tags/tags'], manifest['tag'])
    expected = [{key: value for key, value in part.items() if key != 'region'} for part in manifest['parts']]
    if expected != section['parts']:
        raise ValueError('Retained Stacks structure differs from its exact source')
    return manifest, section


def enrich(store, value):
    """Build display data from retained bytes only; never reads a remote URL."""
    try:
        manifest, section = _manifest(store)
        source = store.source()
        text = source.text.removeprefix('\ufeff')
        parts, targets = {}, {}
        for part in manifest['parts']:
            if part['role'] == 'statement':
                targets[part['tag']] = dict(region=part['region'], span=part['span'])
        for part in manifest['parts']:
            raw = text[slice(*part['body'])]
            refs = {key: dict(**entry, retained=entry['tag'] in targets)
                    for key, entry in section['references'].items()}
            tokens, warning = display_tokens(raw, refs)
            parts[part['region']] = dict(**part, tokens=tokens, warning=warning,
                                        exact_text=span_text(source, part['span']))
        value['published'] = dict(**{key: manifest[key] for key in
            ('tag', 'title', 'chapter', 'chapter_tag', 'section_number', 'previous', 'next',
             'commit', 'retrieved_at', 'limitation')}, parts=parts,
            citation=canonical_url(manifest['tag']), authors='The Stacks Project Authors',
            reference_tags=sorted({r['tag'] for r in section['references'].values() if r['tag']}),
            license='Upstream GNU Free Documentation License (COPYING retained)',
            acquisition_artifacts=[a['id'] for a in value['artifacts'] if a['id'] == value['acquisition']['artifact']
                                   or any(r['artifact'] == a['id'] for r in manifest['files'].values())],
            source_file=manifest['source_file'], source_revision=source.revision, error=None)
        from .published_sources import qualify_view
        qualify_view(value['published'], 'stacks-project')
        value['source_status'] = 'retained upstream import'
    except (OSError, ValueError, KeyError, TypeError) as exc:
        value['published'] = {'error': 'Retained Stacks import unavailable: ' + str(exc)}
    return value


def commit_import(request):
    store = OutlineStore(request['store'], request['project_root'])
    ticket = identity(request['ticket'])
    packet = request['packet']
    saved = strict_json(read_bounded(preparation_directory(store) / (ticket + '.json'), 4096, 'Stacks preparation'))
    from .outline_references import scope
    if saved != dict(scope=scope(store), project=str(store.root), packet_hash=digest(encoded(packet))):
        raise ValueError('Stacks preparation changed or belongs to another workspace; import again explicitly')
    files, filename = unpack(packet)
    source = SourceDocument.from_bytes('/' + filename, files[filename])
    section = extract(source, files['tags/tags'], packet['tag'])
    store.id = str(uuid5(NAMESPACE_URL, str(store.root) + '\0' + canonical_url(packet['tag']) + '@' + packet['commit']))
    store.directory = store.base / store.id
    if store.directory.resolve() != store.directory:
        raise ValueError('Redirected Stacks import directory; no source was published')
    if (store.directory / 'outline.json').exists():
        existing = OutlineStore(str(store.base), str(store.root), store.id)
        manifest, _ = _manifest(existing)
        if (manifest['commit'] != packet['commit'] or manifest['tag'] != packet['tag']
                or manifest['files'] != {name: dict(sha256=digest(raw), artifact=manifest['files'][name]['artifact'])
                                         for name, raw in files.items()}):
            raise ValueError('Existing Stacks import differs; no annotations or records were replaced')
        result = existing.view()
        result['reused'] = True
        return result
    artifacts = []
    def artifact(name, raw):
        key = str(uuid5(NAMESPACE_URL, store.id + ':' + name))
        artifacts.append(dict(id=key, path=str(store.blob(digest(raw))), revision=digest(raw),
                              kind='supporting_artifact', label=name, region=None, selector=None,
                              captured_at=packet['retrieved_at']))
        return key
    file_records = {}
    for name, raw in files.items():
        file_records[name] = dict(sha256=digest(raw), artifact=None if name == filename else artifact(name, raw))
    parts, regions = [], []
    for index, part in enumerate(section['parts']):
        key = str(uuid5(NAMESPACE_URL, store.id + ':part:' + str(index)))
        parts.append(dict(**part, region=key))
        regions.append(dict(id=key, title=part['title'],
            level='orientation' if part['role'] == 'context' else 'concepts_results' if part['role'] == 'statement' else 'argument',
            span=part['span'], statement=None, collapsed=False, annotations=[]))
    manifest = dict(schema=MANIFEST_SCHEMA, version=1, commit=packet['commit'],
                    retrieved_at=packet['retrieved_at'], source_file=filename,
                    source_revision=source.revision, files=file_records,
                    **{k: v for k, v in section.items() if k not in ('parts', 'references', 'span')},
                    parts=parts)
    manifest_raw = encoded(manifest)
    acquisition = dict(kind='stacks-section', artifact=artifact('Stacks import provenance', manifest_raw))
    bibliography = {key: None for key in BIBLIOGRAPHY}
    bibliography.update(title=section['title'], authors='The Stacks Project Authors',
                        revision='Git ' + packet['commit'],
                        locator=section['chapter'] + ' · section ' + str(section['section_number']) + ' · ' + section['tag'],
                        reference=canonical_url(section['tag']))
    state = dict(schema=SCHEMA, version=2, id=store.id, project_root=str(store.root), created_at=now(),
        source=dict(path=str(store.blob(source.revision, source=True)), revision=source.revision,
                    authorship='unknown', bibliography=bibliography),
        regions=regions, contexts=[], annotations=[], artifacts=artifacts, acquisition=acquisition)
    validate_state(state, store.root, store.id)
    if len(encoded(state)) > 512 * 1024:
        raise ValueError('Stacks outline exceeds the existing state limit')
    for part in parts:
        span_text(source, part['span'])
    allowed = {store.blob(source.revision, source=True).name, 'outline.json',
               *('artifact-' + a['revision'] + '.bin' for a in artifacts)}
    if store.directory.exists() and any(p.name not in allowed for p in store.directory.iterdir()):
        raise ValueError('Existing import directory contains unrelated material; nothing was replaced')
    try:
        directory(store.directory)
        store.retain(files[filename], source=True)
        for name, raw in files.items():
            if name != filename:
                store.retain(raw)
        store.retain(manifest_raw)
        # This final atomic mutable publication alone exposes the complete outline.
        # All retained dependencies and all structural ranges exist beforehand.
        result = store.publish(state)
    except (OSError, ValueError) as exc:
        return {'blocked': True, 'write_error': str(exc)}
    result['reused'] = False
    return result


def retained_reference(request):
    store = OutlineStore(request['store'], request['project_root'], request['id'])
    store.expect(request['revision'])
    if store.state.get('acquisition', {}).get('kind') != 'stacks-section':
        raise ValueError('This outline is not an imported Stacks section')
    manifest, _ = _manifest(store)
    target = next((p for p in manifest['parts'] if p['tag'] == section_tag(request['tag']) and p['role'] == 'statement'), None)
    if target is None:
        raise ValueError('This reference is outside the retained section; use its canonical Stacks citation explicitly')
    from .outline_references import pinned_reference, reference_action
    reference = pinned_reference(store, store.source(), target['region'], target['span'])
    return reference_action(dict(method='outline_follow_reference', store=str(store.base),
                                 project_root=str(store.root), reference=reference))


def stacks_action(request):
    method = request['method']
    if method == 'outline_stacks_prepare':
        return prepare(request)
    if method == 'outline_stacks_import':
        return commit_import(request)
    if method == 'outline_stacks_reference':
        return retained_reference(request)
    raise ValueError('Unknown Stacks source action')
