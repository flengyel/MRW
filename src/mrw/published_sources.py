"""Source-qualified published identities, independent of retained-store routing."""
import re

from .source_plugins import BUILTINS, Registry, normalize, page_url, qualified

SOURCES = {s['sourceId']: dict(name=s['name'], base=s['origins'][0]+s['urlRules']['itemPath'].replace('{id}',''), spec=s) for s in BUILTINS}


def source_spec(source_id):
    if source_id in SOURCES:return SOURCES[source_id]['spec']
    entry=Registry().sources.get(source_id)
    if entry is None:raise ValueError('Unknown published source namespace')
    return entry['manifest']



def local_tag(source_id, value):
    spec=source_spec(source_id)
    return normalize(spec,value)['itemId']


def qualified_tag(source_id, tag):
    return qualified(source_id,local_tag(source_id,tag))


def citation(source_id, tag):
    return page_url(source_spec(source_id),local_tag(source_id,tag))


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


def reader_configuration(value):
    """Only verified retained provenance supplies the original-page target."""
    published = value.get('published')
    if not published or published.get('error') or published.get('online'):
        return
    source_id = published.get('source_id')
    if source_id not in SOURCES:
        return
    from urllib.parse import urlsplit
    url = citation(source_id, published['tag'])
    origin = 'https://' + urlsplit(url).netloc
    published['online'] = dict(sourceId=source_id, name=SOURCES[source_id]['name'], url=url,
        origins=[origin], supported=True, revision=published['source_revision'])
