"""Source-qualified published identities, independent of retained-store routing."""
import re

SOURCES = {
    'stacks-project': dict(name='Stacks Project', base='https://stacks.math.columbia.edu/tag/', kind='stacks-section'),
    'kerodon': dict(name='Kerodon', base='https://kerodon.net/tag/', kind='kerodon-section'),
}


def local_tag(source_id, value):
    if source_id not in SOURCES or not isinstance(value, str) or len(value) > 256:
        raise ValueError('Unknown published source or tag')
    value = value.strip()
    if value.startswith(source_id + ':'):
        value = value[len(source_id) + 1:]
    elif value.startswith(SOURCES[source_id]['base']):
        value = value[len(SOURCES[source_id]['base']):].removesuffix('/')
    if not re.fullmatch(r'[A-Za-z0-9]{4}', value):
        raise ValueError('Use a tag, source-qualified tag or official section URL for ' + SOURCES[source_id]['name'])
    return value.upper()


def qualified_tag(source_id, tag):
    return source_id + ':' + local_tag(source_id, tag)


def citation(source_id, tag):
    return SOURCES[source_id]['base'] + local_tag(source_id, tag)


def qualify_view(value, source_id):
    """Qualify old and new imports on read; never rewrite exact source or notes."""
    value.update(source_id=source_id, source_name=SOURCES[source_id]['name'],
                 qualified_tag=qualified_tag(source_id, value['tag']))
    def tokens(items):
        for item in items:
            if item.get('kind') == 'reference' and item.get('tag'):
                item.update(source_id=source_id, qualified_tag=qualified_tag(source_id, item['tag']))
            tokens(item.get('children', []))
            for children in item.get('items', []):
                tokens(children)
    for part in value.get('parts', {}).values():
        part.update(source_id=source_id, qualified_tag=qualified_tag(source_id, part['tag']))
        tokens(part.get('tokens', []))
    return value
