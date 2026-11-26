"""Built-in adapters implement the same public API as installed adapters."""
import json
from pathlib import Path
import re
from urllib.parse import urljoin, urlsplit
from .source_plugins import normalize, page_url, qualified, LIMIT
from .source import SourceDocument
from .source_api import source_span
from .source_outlines import span_text
from .source_rendering import safe_tree


class ProfileAdapter:
    def __init__(self,manifest):self.manifest=manifest
    def recognize(self,value):
        try:self.normalize(value);return True
        except ValueError:return False
    def normalize(self,value):return normalize(self.manifest,value)
    def live_url(self,item):return page_url(self.manifest,item['itemId'],fragment=item.get('fragment'))
    def plan(self,item,host):
        if self.manifest['parser']=='stacks-git-v1':
            from .stacks_import import REF,RAW,tag_map,chapter_for
            ref=json.loads(host.fetch('reference.json',REF,65536));commit=ref.get('object',{}).get('sha','')
            if not re.fullmatch(r'[a-f0-9]{40}',commit):raise ValueError('The Stacks repository did not supply a verified commit')
            tags=host.fetch('tags/tags',RAW+commit+'/tags/tags');chapter,_=chapter_for(tag_map(tags)[0],item['itemId'])
            for name in (chapter+'.tex','COPYING','preamble.tex'):host.fetch(name,RAW+commit+'/'+name)
            return dict(primary=chapter+'.tex',revision=dict(kind='git',label=commit,verified=True),canonicalUrl=self.live_url(item),identityKey=self.live_url(item)+'@'+commit)
        url=page_url(self.manifest,item['itemId'],item.get('revision'))
        host.fetch('page.html',url)
        # An explicit numbered revision is verified against the acquired page,
        # not guessed from its nearby previous-revision navigation.
        revision=dict(kind='dated-snapshot',label=None,verified=False)
        if item.get('revision'):
            from .nlab_adapter import verify_revision
            verify_revision(host.resources['page.html']['bytes'],item,self.manifest)
            revision=dict(kind='upstream-revision',label=item['revision'],verified=True)
        return dict(primary='page.html',revision=revision,canonicalUrl=self.live_url(item),identityKey=qualified(self.manifest['sourceId'],item['itemId'])+'@'+SourceDocument.from_bytes('/page.html',host.resources['page.html']['bytes']).revision)
    def parse(self,item,resources,plan):
        spec=self.manifest;source=SourceDocument.from_bytes('/'+plan['primary'],resources[plan['primary']])
        if spec['parser']=='stacks-git-v1':
            from .stacks_import import extract
            from .stacks_tex import display_tokens
            section=extract(source,resources['tags/tags'],item['itemId']);parts=[]
            targets={p['tag'] for p in section['parts'] if p['role']=='statement'}
            for i,p in enumerate(section['parts']):
                refs={k:dict(**r,retained=r['tag'] in targets) for k,r in section['references'].items()}
                tokens,warning=display_tokens(source.text.removeprefix('\ufeff')[slice(*p['body'])],refs)
                parts.append(dict(key=str(i),itemId=p['tag'],anchor=None,role=p['role'],title=p['title'],span=p['span'],tokens=tokens,warning=warning))
            if not parts:
                parts=[dict(key='0',itemId=item['itemId'],anchor=None,role='context',title=section['title'],span=section['span'],tokens=[dict(kind='raw',text=span_text(source,section['span']))],warning=section['limitation'])]
            return dict(displayVersion=1,title=section['title'],format='tex',navigation={k:section[k] for k in ('chapter','chapter_tag','section_number','previous','next')},parts=parts,choices=[dict(id='whole',title='Whole section',first=0,last=len(parts))],default='whole')
        if spec['parser']=='gerby-html-v1':
            from .kerodon_import import extract
            section=extract(source,item['itemId'],coalesce_text=True,source_spec=spec)
            parts=[dict(key=str(i),itemId=p['tag'],anchor=None,role=p['role'],title=p['title'],span=p['span'],tokens=p['tokens'],warning=p['warning']) for i,p in enumerate(section['parts'])]
            return dict(displayVersion=1,title=section['title'],format='html',parts=parts,choices=[dict(id='whole',title='Whole section',first=0,last=len(parts))],default='whole')
        if spec['parser']=='nlab-html-v1':
            from .nlab_adapter import parse
            return parse(source,item,spec)
        raise ValueError('Installed parser family unavailable: '+spec['parser'])


def old_reader(kind):
    # Original MRW records keep their schemas and exact citations. These
    # immutable format readers belong to the built-in adapters, not the UI.
    modules={'stacks-section':'stacks_import','kerodon-section':'kerodon_import'}
    name=modules.get(kind)
    if name is None:return None
    from importlib import import_module
    module=import_module('mrw.'+name)
    return module
