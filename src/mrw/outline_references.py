"""Scoped Markdown navigation to retained sources; no publication or execution."""
from hashlib import sha256
import re
import string

from .source_outlines import OutlineStore, host_point, item_by_id, span_text

HEX = r'[a-f0-9]{64}'
UUID = r'[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}'
LINE = r'[1-9][0-9]{0,6}'
COL = r'(?:0|[1-9][0-9]{0,6})'
REFERENCE = re.compile(rf'mrw-outline:v1/({HEX})/({UUID})/({HEX})'
                       rf'(?:/({UUID})/({LINE})\.({COL})-({LINE})\.({COL}))?')

QUALIFIED = re.compile(r'mrw-outline:v2/([a-z][a-z0-9-]{0,63}:[^/\s]{1,2304})/(.*)')


def published_identity(store, region=None, span=None):
    from .source_records import published_identity as read_identity
    return read_identity(store,region,span)


def parse_reference(value):
    qualified = QUALIFIED.fullmatch(value) if isinstance(value, str) and len(value) <= 4096 else None
    legacy = 'mrw-outline:v1/' + qualified[2] if qualified else value
    match = REFERENCE.fullmatch(legacy) if isinstance(legacy, str) and len(legacy) <= 4096 else None
    if match is None:
        raise ValueError('Malformed MRW source or passage link; no target was opened')
    scope, outline, source, region, *points = match.groups()
    span = None
    if region:
        sl, sc, el, ec = map(int, points)
        if (sl, sc) >= (el, ec):
            raise ValueError('Malformed MRW source or passage link range')
        span = dict(source_revision=source, start_line=sl, start_col=sc, end_line=el, end_col=ec)
    result = dict(scope=scope, outline=outline, source=source, region=region, span=span)
    if qualified:
        from .source_plugins import parse_qualified
        parse_qualified(qualified[1])
        result['qualified_id'] = qualified[1]
    return result


def scope(store):
    from .artifact_context import reference_scopes
    return reference_scopes(store)[0]


def matches_scope(store, value):
    from .artifact_context import reference_scopes
    return value in reference_scopes(store)[1]


def locator(span):
    return f"lines {span['start_line']}:{span['start_col']}–{span['end_line']}:{span['end_col']} (scalar columns)"


def markdown_label(value):
    # Preserve readable Unicode; source metadata cannot introduce links/HTML.
    value = ' '.join(value.split())
    value = ''.join(c if c.isprintable() else f'U+{ord(c):04X}' for c in value)
    return ''.join('\\' + c if c in string.punctuation else c for c in value)


def short_label(store, source, span):
    bib = store.state['source']['bibliography']
    published = published_identity(store, span=span)
    parts = ([published] if published else []) + [(bib['title'] or source.path.name)[:100]]
    if bib['locator']:
        parts.append(bib['locator'][:60])
    parts.append(locator(span) if span else 'source outline')
    return markdown_label(' · '.join(parts))


def pinned_reference(store, source, region=None, span=None):
    """One formatter for manual selections and retained published references."""
    published = published_identity(store, region, span)
    prefix = 'mrw-outline:v2/' + published if published else 'mrw-outline:v1'
    uri = f'{prefix}/{scope(store)}/{store.id}/{source.revision}'
    if region is not None:
        from .source_outlines import identity
        identity(region)
        span_text(source, span)
        uri += f"/{region}/{span['start_line']}.{span['start_col']}-{span['end_line']}.{span['end_col']}"
    parse_reference(uri)
    return uri


def reference_action(request):
    store = OutlineStore(request['store'], request['project_root'])
    following = request['method'] == 'outline_follow_reference'
    ref = parse_reference(request['reference']) if following else None
    if following and not matches_scope(store, ref['scope']):
        raise ValueError('This reference belongs to a different workspace or private-storage scope. '
                         'Copying Markdown alone does not transfer its outlines or retained sources')
    try:
        store = OutlineStore(str(store.base), str(store.root), ref['outline'] if following else request['id'])
    except (OSError, ValueError) as exc:
        raise ValueError('Saved source unavailable in this workspace’s private storage; '
                         'no replacement was guessed: ' + str(exc)) from exc
    if not following:
        store.expect(request['revision'])  # The chooser's saved range, not newer private state.
    try:
        source = store.source()  # Exact retained bytes, never a replacement original.
    except (OSError, ValueError) as exc:
        raise ValueError('Retained source unavailable; no replacement was guessed: ' + str(exc)) from exc
    if following:
        if ref.get('qualified_id') and ref['qualified_id'] != published_identity(store, ref['region'], ref['span']):
            raise ValueError('The source-qualified identifier differs from the retained citation')
        if ref['source'] != source.revision:
            raise ValueError('Referenced source revision differs from the saved source; no replacement was guessed')
        region = item_by_id(store.state['regions'], ref['region']) if ref['region'] else None
        status = 'whole outline'
        document = None
        if ref['span']:
            span_text(source, ref['span'])
            status = 'unchanged' if region and region['span'] == ref['span'] else 'changed or removed'
            document = dict(text=source.text, source_revision=source.revision,
                            start=host_point(source, ref['span'], 'start'), end=host_point(source, ref['span'], 'end'))
        result = store.view()
        notice = ('Source link: whole saved source.' if not ref['span'] else
                  f"Passage link: {locator(ref['span'])}. " +
                  ('Passage association unchanged; exact retained passage opened.' if status == 'unchanged' else
                   'Passage association changed or removed; the originally referenced retained passage is opened, not the current passage range.'))
        result['reference'] = dict(uri=request['reference'], label=short_label(store, source, ref['span']), status=status, notice=notice,
                                   region=ref['region'] if status == 'unchanged' else None)
        result['reference'].update(qualified_id=published_identity(store, ref['region'], ref['span']), source_revision=source.revision, passage=ref['span'])
        result['document'] = document
        return result
    region = item_by_id(store.state['regions'], request['region']) if request['region'] is not None else None
    if request['region'] is not None and region is None:
        raise ValueError('The selected passage is unavailable; choose it again')
    uri = pinned_reference(store, source, region['id'] if region else None, region['span'] if region else None)
    bib = store.state['source']['bibliography']
    parts = ([published_identity(store, request['region'])] if published_identity(store, request['region']) else []) + [bib['title'] or source.path.name]
    parts.extend(f'{key}: {bib[key]}' for key in ('authors', 'edition', 'revision', 'locator', 'reference') if bib[key])
    parts.append('source: ' + str(source.path))
    parts.append(f"{region['title']}; {locator(region['span'])}" if region else 'whole saved source')
    parts.append('retained SHA-256 ' + source.revision[:12])
    label = short_label(store, source, region['span'] if region else None)
    return dict(reference=uri, label=label, markdown=f"[{markdown_label(' · '.join(parts))}]({uri})")


def assistance_context_action(request):
    """Freeze one resolved retained passage; no acquisition or transmission."""
    # Use the navigation resolver, including its workspace, store and revision
    # checks. A changed/removed association must keep the originally pinned span.
    followed = reference_action({**request, 'method': 'outline_follow_reference'})
    ref = parse_reference(request['reference'])
    if ref['span'] is None:
        raise ValueError('Choose one retained passage for assistance, rather than the whole source')
    store = OutlineStore(request['store'], request['project_root'], ref['outline'])
    source = store.source()
    if source.revision != ref['source']:
        raise ValueError('Referenced source revision differs; no replacement was guessed')
    span = ref['span']
    selected = span_text(source, span)
    return {'context': {
        'buffer_id': request['reference'], 'source_identity': request['reference'],
        'source_path': None, 'source_revision': source.revision, 'saved_revision': None,
        'start': f"{span['start_line']}.{span['start_col']}",
        'end': f"{span['end_line']}.{span['end_col']}", 'text': selected,
        'state': ('Exact retained source passage; ' + followed['reference']['label'] +
                  '; region association ' + followed['reference']['status'] +
                  '. Reader annotations and supplied evidence are not included.'),
    }}


def reference_identities(request):
    """Resolve bounded legacy links for explicit backlinks; never acquire or rewrite."""
    values = request['references']
    if not isinstance(values, list) or len(values) > 256:
        raise ValueError('Resolve at most 256 retained references per backlink scan')
    base = OutlineStore(request['store'], request['project_root'])
    stores, entries = {}, []
    for value in values:
        try:
            ref = parse_reference(value)
            if not matches_scope(base, ref['scope']):
                raise ValueError('Reference belongs to another workspace or private storage scope')
            if ref['outline'] not in stores:
                stores[ref['outline']] = OutlineStore(str(base.base), str(base.root), ref['outline'])
            store = stores[ref['outline']]
            if ref['source'] != store.source().revision:
                raise ValueError('Retained source revision differs')
            if ref['span']: span_text(store.source(), ref['span'])
            qualified = published_identity(store, ref['region'], ref['span'])
            if ref.get('qualified_id') and ref['qualified_id'] != qualified:
                raise ValueError('Qualified source identity differs')
            entries.append(dict(reference=value, qualified_id=qualified, source_revision=ref['source'], passage=ref['span']))
        except (OSError, ValueError) as exc:
            entries.append(dict(reference=value, error=str(exc)))
    return dict(entries=entries)
