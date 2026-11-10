"""Named-page HTML acquisition projection: headings, MathML and inline SVG."""
from hashlib import sha256
import re
from urllib.parse import unquote, urljoin
from .kerodon_import import Page, plain, compact_paragraphs
from .source_rendering import safe_tree
from .source_plugins import normalize
from .source_api import source_span


def verify_revision(raw,item,spec):
    from .source_plugins import page_url
    from urllib.parse import urlsplit
    page=Page(raw.decode('utf-8'))
    expected=urlsplit(page_url(spec,item['itemId'],item['revision'])).path+'/cite'
    cited=[n for n in page.nodes if n['name']=='a' and n['attrs'].get('href')==expected and plain(n).strip()=='Cite']
    mains=[n for n in page.nodes if n['attrs'].get('id')=='revision']
    if len(cited)!=1 or len(mains)!=1 or cited[0]['start']<mains[0]['end']:
        raise ValueError('The acquired page does not explicitly verify requested nLab revision '+item['revision'])


def parse(source,item,spec):
    text=source.text.removeprefix('\ufeff')
    page=Page(text,coalesce_text=True)
    mains=[n for n in page.nodes if n['attrs'].get('id')=='revision']
    if len(mains)!=1 or mains[0]['end'] is None:raise ValueError('nLab page lacks its unique complete revision body')
    main=mains[0]
    excluded=[]
    for n in page.nodes:
        classes=set(n['attrs'].get('class','').lower().split())
        if n['attrs'].get('id','').startswith(('sidebar_','section_table_of_contents')) or classes & {'righthandside','maruku_toc','navigation','toc'}:excluded.append((n['start'],n['end'] or len(text)))
    def ignored(n):return any(a<=n['start']<b for a,b in excluded)
    headings=[n for n in page.nodes if re.fullmatch(r'h[1-6]',n['name']) and main['start']<=n['start']<main['end'] and not ignored(n)]
    if len(headings)>120:raise ValueError('This page exceeds the supported 120-heading outline bound')
    warnings=set();projection_base=0
    def tokens(n):
        values=project(n)
        if isinstance(n,dict) and n['attrs'].get('id') and values and n['name'] not in ('math','svg'):
            return [dict(kind='anchor',name=n['attrs']['id'])]+values
        return values
    def project(n):
        if isinstance(n,str):return [dict(kind='text',text=n)]
        name=n['name'];attrs=n['attrs'];classes=set(attrs.get('class','').lower().split())
        if name in ('script','style','head','nav','form') or classes & {'righthandside','maruku_toc','navigation','toc'} or attrs.get('id','').startswith(('sidebar_','section_table_of_contents')):return []
        if name in ('math','svg'):
            try:return [dict(kind='mathml' if name=='math' else 'svg',text=safe_tree(n,'mathml' if name=='math' else 'svg',prefix='mrw-'+sha256((source.revision+str(projection_base+n['start'])).encode()).hexdigest()[:16]+'-'))]
            except ValueError as exc:
                warnings.add(str(exc));return [dict(kind='raw',text='[Unsupported '+name+' at this location: '+str(exc)+'. Read exact HTML or open the original page.]')]
        children=lambda:[t for c in n['children'] for t in tokens(c)]
        if name=='a' and attrs.get('href'):
            url=attrs['href'] if attrs['href'].startswith('#') else urljoin(spec['origins'][0],attrs['href'])
            if url.startswith(('https://','http://','#')):return [dict(kind='link',label=plain(n),url=url)]
        if name in ('em','strong','code'):return [dict(kind=name,children=children())]
        if name in ('ul','ol'):return [dict(kind='list',ordered=name=='ol',items=[tokens(c) for c in n['children'] if isinstance(c,dict) and c['name']=='li'])]
        if name in ('img','iframe','object','canvas','video','audio'):
            warning='Unsupported '+name+' at this location; use the original page or exact retained HTML';warnings.add(warning);return [dict(kind='raw',text='['+warning+']')]
        values=children()
        if name in ('p','div','br','li','blockquote') or re.fullmatch(r'h[1-6]',name):values.append(dict(kind='paragraph'))
        return values
    starts=[n['start'] for n in headings];parts=[];choices=[]
    if not headings:raise ValueError('No supported mathematical headings were found in this page')
    for i,h in enumerate(headings):
        end=starts[i+1] if i+1<len(starts) else main['end']
        raw=text[h['start']:end]
        if len(raw.encode())>256*1024:raise ValueError('A page heading exceeds the 256 KiB retained passage bound; choose a smaller source page')
        projection_base=h['start']
        warnings.clear();fragment=Page(raw,coalesce_text=True);display=compact_paragraphs([t for c in fragment.root['children'] for t in tokens(c)])
        anchor=h['attrs'].get('id');key=str(i)
        parts.append(dict(key=key,itemId=item['itemId'],anchor=anchor,role='context',title=plain(h).strip(),span=source_span(source,h['start'],end),tokens=display,warning='; '.join(sorted(warnings)) or None))
        stop=next((j for j in range(i+1,len(headings)) if int(headings[j]['name'][1])<=int(h['name'][1])),len(headings))
        choices.append(dict(id=key,title=plain(h).strip()+' (with subsections)',first=i,last=stop))
    intro_end=starts[0];intro=Page(text[main['start']:intro_end],coalesce_text=True)
    projection_base=main['start']
    leading=compact_paragraphs([t for c in intro.root['children'] for t in tokens(c)])
    if any(t['kind'] not in ('paragraph','anchor') and (t.get('text','').strip() or t['kind'] not in ('text',)) for t in leading):
        parts.insert(0,dict(key='introduction',itemId=item['itemId'],anchor=None,role='context',title='Introduction',span=source_span(source,main['start'],intro_end),tokens=leading,warning=None))
        choices=[dict(c,first=c['first']+1,last=c['last']+1) for c in choices]
    default='whole'
    if item.get('fragment'):
        matching=[p for p in parts if p['anchor']==item['fragment']]
        if len(matching)!=1:raise ValueError('The supplied fragment does not identify a supported unique page heading: '+item['fragment'])
        default=matching[0]['key']
    return dict(displayVersion=1,title=item['itemId'],format='html',parts=parts,choices=[dict(id='whole',title='Whole page',first=0,last=len(parts)),*choices],default=default)
