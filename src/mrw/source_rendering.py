"""Inert display vocabulary v1 and restricted MathML/SVG serialization."""
from hashlib import sha256
from html import escape
import re
import xml.etree.ElementTree as ET

MATH = set('math semantics annotation mrow mi mn mo mtext mspace ms mfrac msqrt mroot mstyle merror mpadded mphantom mfenced menclose msub msup msubsup munder mover munderover mmultiscripts mprescripts none mtable mlabeledtr mtr mtd maligngroup malignmark'.split())
SVG = set('svg g defs symbol path use line polyline polygon rect circle ellipse text tspan title desc clipPath marker'.lower().split())
ATTR = set('id width height viewbox display mathvariant mathsize mathcolor mathbackground stretchy fence separator accent accentunder lspace rspace minsize maxsize scriptlevel displaystyle rowspacing columnspacing rowalign columnalign columnlines rowlines frame framespacing side equalrows equalcolumns rowspan columnspan notation linethickness encoding d fill stroke stroke-width stroke-linecap stroke-linejoin stroke-miterlimit fill-rule clip-rule stroke-dasharray opacity fill-opacity stroke-opacity transform x y x1 y1 x2 y2 cx cy r rx ry points dx dy font-size text-anchor preserveaspectratio overflow href xlink:href refx refy markerwidth markerheight orient marker-start marker-mid marker-end clip-path'.split())


def safe_tree(node,kind,*,prefix=None):
    allowed=MATH if kind=='mathml' else SVG
    prefix=prefix or ('mrw-'+sha256(str(node).encode()).hexdigest()[:12]+'-')
    def local_id(value):
        if not value or len(value)>256 or any(c.isspace() for c in value):raise ValueError('Invalid local display ID')
        return prefix+sha256(value.encode()).hexdigest()[:24]
    def render(n,depth=0):
        if depth>100:raise ValueError('Display XML nesting exceeds its bound')
        if isinstance(n,str):return escape(n)
        tag=n['name'].lower()
        if tag not in allowed:raise ValueError('Unsupported '+kind+' element '+tag)
        attrs=[]
        attributes=dict(n.get('attrs',{}))
        for declaration in attributes.pop('style','').split(';'):
            if not declaration.strip():continue
            if ':' not in declaration:raise ValueError('Unsupported SVG style')
            key,value=map(str.strip,declaration.split(':',1))
            if kind!='svg' or key not in {'stroke','stroke-width','stroke-linecap','stroke-linejoin','stroke-miterlimit','stroke-dasharray','stroke-opacity','fill','fill-opacity','fill-rule','clip-rule','opacity','overflow'}:raise ValueError('Unsupported SVG style '+key)
            attributes[key]=value
        if tag in ('math','svg'):attrs.append('xmlns="'+('http://www.w3.org/1998/Math/MathML' if kind=='mathml' else 'http://www.w3.org/2000/svg')+'"')
        for key,value in attributes.items():
            key=key.lower()
            if key in ('class','xml:lang','lang','version'):continue
            if key.startswith('on') or key=='style' or (key not in ATTR and not key.startswith('xmlns')):raise ValueError('Unsupported display attribute '+key)
            if key.startswith('xmlns'):continue
            if len(value)>65536 or re.search(r'(?:javascript:|data:|https?:|@import)',value,re.I):raise ValueError('External or executable display attribute')
            if key in ('href','xlink:href'):
                if kind!='svg' or not value.startswith('#'):raise ValueError('Only local SVG references are supported')
                value='#'+local_id(value[1:]);key='href'
            elif key=='id':
                value=local_id(value)
            elif 'url(' in value:
                match=re.fullmatch(r'url\(#([a-zA-Z0-9_.:-]+)\)',value)
                if kind!='svg' or not match:raise ValueError('Only local SVG paint references are supported')
                value='url(#'+local_id(match[1])+')'
            if key in ('fill','stroke') and (value.lower() in ('black','#000','#000000') or re.fullmatch(r'rgb\(0%?,\s*0%?,\s*0%?\)',value,re.I)):value='currentColor'
            key={'viewbox':'viewBox','preserveaspectratio':'preserveAspectRatio','refx':'refX','refy':'refY','markerwidth':'markerWidth','markerheight':'markerHeight'}.get(key,key)
            attrs.append(key+'="'+escape(value,quote=True)+'"')
        tag={'clippath':'clipPath'}.get(tag,tag)
        return '<'+tag+(' '+' '.join(attrs) if attrs else '')+'>'+''.join(render(c,depth+1) for c in n['children'])+'</'+tag+'>'
    result=render(node)
    if len(result.encode())>512*1024:raise ValueError('Display XML exceeds its bound')
    return result


def validate_xml(text,kind):
    if not isinstance(text,str) or len(text)>512*1024 or '<!' in text:raise ValueError('Invalid inert display XML')
    try:root=ET.fromstring(text)
    except ET.ParseError as exc:raise ValueError('Malformed display XML') from exc
    allowed=MATH if kind=='mathml' else SVG
    def check(n,depth=0):
        if depth>100:raise ValueError('Display XML nesting exceeds its bound')
        tag=n.tag.rsplit('}',1)[-1].lower()
        if tag not in allowed:raise ValueError('Unsupported inert display element '+tag)
        for k,v in n.attrib.items():
            k=k.rsplit('}',1)[-1].lower()
            if k not in ATTR or k.startswith('on') or k=='style' or re.search(r'javascript:|data:|https?:|@import',v,re.I):raise ValueError('Unsafe inert display attribute')
            if (k=='href' and not re.fullmatch(r'#[\w.:-]+',v)) or ('url(' in v and not re.fullmatch(r'url\(#[\w.:-]+\)',v)):raise ValueError('External display reference')
        for child in n:check(child,depth+1)
    check(root)
    if root.tag.rsplit('}',1)[-1] != ('math' if kind=='mathml' else 'svg'):raise ValueError('Wrong inert display root')


def validate_tokens(tokens,depth=0):
    if depth>40 or not isinstance(tokens,list) or len(tokens)>20000:raise ValueError('Display tokens exceed their bound')
    for token in tokens:
        if not isinstance(token,dict) or not isinstance(token.get('kind'),str):raise ValueError('Malformed display token')
        kind=token['kind']
        if kind in ('mathml','svg'):validate_xml(token.get('text'),kind)
        elif kind in ('text','raw','math'):
            if not isinstance(token.get('text'),str) or len(token['text'])>512*1024:raise ValueError('Invalid display text')
        elif kind in ('em','strong','code','group','slogan'):validate_tokens(token.get('children'),depth+1)
        elif kind=='list':
            if not isinstance(token.get('items'),list) or len(token['items'])>1000:raise ValueError('Invalid display list')
            for item in token['items']:validate_tokens(item,depth+1)
        elif kind=='anchor':
            if not isinstance(token.get('name'),str) or len(token['name'])>512:raise ValueError('Invalid source anchor')
        elif kind in ('reference','link'):
            if not isinstance(token.get('label'),str) or len(token['label'])>4096:raise ValueError('Invalid displayed link label')
            if kind=='link' and (not isinstance(token.get('url'),str) or len(token['url'])>4096 or not (token['url'].startswith(('https://','http://','#')))):raise ValueError('Unsupported displayed link')
        elif kind!='paragraph':raise ValueError('Unsupported display token '+kind)
