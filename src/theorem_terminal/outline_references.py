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
    return sha256((str(store.root) + '\0' + str(store.base)).encode('utf-8')).hexdigest()


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


def reference_action(request):
    store = OutlineStore(request['store'], request['project_root'])
    following = request['method'] == 'outline_follow_reference'
    ref = parse_reference(request['reference']) if following else None
    if following and ref['scope'] != scope(store):
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
    uri = f'mrw-outline:v1/{scope(store)}/{store.id}/{source.revision}'
    if region:
        s = region['span']; span_text(source, s)
        uri += f"/{region['id']}/{s['start_line']}.{s['start_col']}-{s['end_line']}.{s['end_col']}"
    bib = store.state['source']['bibliography']
    parts = [bib['title'] or source.path.name]
    parts.extend(f'{key}: {bib[key]}' for key in ('authors', 'edition', 'revision', 'locator', 'reference') if bib[key])
    parts.append('source: ' + str(source.path))
    parts.append(f"{region['title']}; {locator(region['span'])}" if region else 'whole retained source outline')
    parts.append('retained SHA-256 ' + source.revision[:12])
    label = short_label(store, source, region['span'] if region else None)
    return dict(reference=uri, label=label, markdown=f"[{markdown_label(' · '.join(parts))}]({uri})")
