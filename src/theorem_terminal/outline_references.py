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


def parse_reference(value):
    match = REFERENCE.fullmatch(value) if isinstance(value, str) and len(value) <= 512 else None
    if match is None:
        raise ValueError('Malformed MRW outline reference; no target was opened')
    scope, outline, source, region, *points = match.groups()
    span = None
    if region:
        sl, sc, el, ec = map(int, points)
        if (sl, sc) >= (el, ec):
            raise ValueError('Malformed MRW outline reference range')
        span = dict(source_revision=source, start_line=sl, start_col=sc, end_line=el, end_col=ec)
    return dict(scope=scope, outline=outline, source=source, region=region, span=span)


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
    parts = [(bib['title'] or source.path.name)[:100]]
    if bib['locator']:
        parts.append(bib['locator'][:60])
    parts.append(locator(span) if span else 'source outline')
    return markdown_label(' · '.join(parts))


def pinned_reference(store, source, region=None, span=None):
    """One formatter for manual selections and retained published references."""
    uri = f'mrw-outline:v1/{scope(store)}/{store.id}/{source.revision}'
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
        raise ValueError('Saved outline unavailable in this workspace’s private storage; '
                         'no replacement was guessed: ' + str(exc)) from exc
    if not following:
        store.expect(request['revision'])  # The chooser's saved range, not newer private state.
    try:
        source = store.source()  # Exact retained bytes, never a replacement original.
    except (OSError, ValueError) as exc:
        raise ValueError('Retained source unavailable; no replacement was guessed: ' + str(exc)) from exc
    if following:
        if ref['source'] != source.revision:
            raise ValueError('Referenced source revision differs from the retained outline; no replacement was guessed')
        region = item_by_id(store.state['regions'], ref['region']) if ref['region'] else None
        status = 'whole outline'
        document = None
        if ref['span']:
            span_text(source, ref['span'])
            status = 'unchanged' if region and region['span'] == ref['span'] else 'changed or removed'
            document = dict(text=source.text, source_revision=source.revision,
                            start=host_point(source, ref['span'], 'start'), end=host_point(source, ref['span'], 'end'))
        result = store.view()
        notice = ('Overview reference: whole retained source outline.' if not ref['span'] else
                  f"Overview reference: {locator(ref['span'])}. " +
                  ('Region association unchanged; exact retained passage opened.' if status == 'unchanged' else
                   'Region association changed or removed; the originally referenced retained passage is opened, not the current region range.'))
        result['reference'] = dict(uri=request['reference'], label=short_label(store, source, ref['span']), status=status, notice=notice,
                                   region=ref['region'] if status == 'unchanged' else None)
        result['document'] = document
        return result
    region = item_by_id(store.state['regions'], request['region']) if request['region'] is not None else None
    if request['region'] is not None and region is None:
        raise ValueError('The selected source region is unavailable; choose it again')
    uri = pinned_reference(store, source, region['id'] if region else None, region['span'] if region else None)
    bib = store.state['source']['bibliography']
    parts = [bib['title'] or source.path.name]
    parts.extend(f'{key}: {bib[key]}' for key in ('authors', 'edition', 'revision', 'locator', 'reference') if bib[key])
    parts.append('source: ' + str(source.path))
    parts.append(f"{region['title']}; {locator(region['span'])}" if region else 'whole retained source outline')
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
