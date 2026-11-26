"""Explicit user registrations for source protocol v1. No workspace discovery.

Adapters are trusted installed Python code. Profiles are validated data. The
core supplies bounded fetching and owns all retained storage and citations.
"""
from copy import deepcopy
from dataclasses import dataclass
import importlib.metadata
import json
import os
from pathlib import Path
import re
from urllib.parse import quote, unquote, urlsplit
from urllib.request import Request, build_opener, ProxyHandler, HTTPRedirectHandler

from .local_files import read_bounded
from .mutable_files import save_mutable
from .source_outlines import encoded, directory
from .workspace import strict_json

API = 1
LIMIT = 2 * 1024 * 1024
NAMESPACE = re.compile(r'[a-z][a-z0-9-]{0,63}')
CAPABILITIES = {'onlineView', 'savedImport', 'sectionSelection', 'revisionLookup'}


def builtin(source, name, parser, origin, authors, license, *, online=True, revisions=False, sections=False):
    return dict(apiVersion=1, pluginId='mrw.'+source, pluginVersion='1.0.0', sourceId=source,
        name=name, parser=parser, origins=[origin], urlRules=dict(itemPath='/tag/{id}', revisionPath=None, identifier='tag'),
        capabilities=dict(onlineView=online, savedImport=True, sectionSelection=sections, revisionLookup=revisions),
        attribution=dict(authors=authors, license=license, url=origin))


BUILTINS = [
    builtin('stacks-project','Stacks Project','stacks-git-v1','https://stacks.math.columbia.edu','The Stacks Project Authors','Upstream GNU Free Documentation License (COPYING retained)',revisions=True),
    builtin('kerodon','Kerodon','gerby-html-v1','https://kerodon.net','Jacob Lurie','No license statement supplied by the retrieved page'),
    builtin('nlab','nLab','nlab-html-v1','https://ncatlab.org','nLab contributors','nLab encourages use with source acknowledgement; no more formal licence has been agreed. Preserve any page-specific attribution.',online=False,revisions=True,sections=True),
]
BUILTINS[0]['origins'] += ['https://api.github.com','https://raw.githubusercontent.com']
BUILTINS[2]['urlRules'] = dict(itemPath='/nlab/show/{id}', revisionPath='/nlab/revision/{id}/{revision}', identifier='page')


def manifest(value, *, profile=False):
    keys={'apiVersion','pluginId','pluginVersion','sourceId','name','parser','origins','urlRules','capabilities','attribution'}
    if not isinstance(value,dict) or set(value)!=keys or type(value['apiVersion']) is not int or value['apiVersion']!=API:
        raise ValueError('Unsupported source manifest or apiVersion; this MRW supports source API 1')
    if not isinstance(value['sourceId'],str) or not NAMESPACE.fullmatch(value['sourceId']) or value['sourceId'] in {'javascript','data','file','mailto','http','https','command','vscode','mrw-outline','obsidian'} or not isinstance(value['pluginId'],str) or not re.fullmatch(r'[a-zA-Z0-9_.-]{1,128}',value['pluginId']):raise ValueError('Invalid source namespace or pluginId')
    for k in ('name','pluginVersion','parser'):
        if not isinstance(value[k],str) or not 1<=len(value[k])<=200 or any(ord(c)<32 for c in value[k]):raise ValueError('Invalid source manifest '+k)
    if profile and value['parser'] not in ('gerby-html-v1','nlab-html-v1'):raise ValueError('A profile must select an installed configurable parser family: gerby-html-v1 or nlab-html-v1')
    if not isinstance(value['origins'],list) or not 1<=len(value['origins'])<=8:raise ValueError('Declare one to eight HTTPS acquisition origins')
    for origin in value['origins']:
        if not isinstance(origin,str) or not re.fullmatch(r'https://[a-z0-9.-]+(?::[0-9]+)?',origin) or urlsplit(origin).netloc!=origin[8:]:raise ValueError('Invalid exact HTTPS source origin')
    c=value['capabilities']
    if not isinstance(c,dict) or set(c)!=CAPABILITIES or any(type(v) is not bool for v in c.values()):raise ValueError('Declare onlineView, savedImport, sectionSelection and revisionLookup independently')
    rules=value['urlRules']
    if not isinstance(rules,dict) or set(rules)!={'itemPath','revisionPath','identifier'} or rules['identifier'] not in ('tag','page'):raise ValueError('Invalid source URL rules')
    for k in ('itemPath','revisionPath'):
        template=rules[k]
        if template is None and k=='revisionPath':continue
        if not isinstance(template,str) or len(template)>500 or not template.startswith('/') or template.count('{id}')!=1 or re.search(r'[?#\\\s]',template):raise ValueError('Invalid source URL template')
        if k=='revisionPath' and template.count('{revision}')!=1:raise ValueError('A revision URL must identify its explicit revision')
        if re.search(r'[{\}]',template.replace('{id}','').replace('{revision}','')):raise ValueError('Unknown source URL template variable')
    a=value['attribution']
    if not isinstance(a,dict) or set(a)!={'authors','license','url'} or any(not isinstance(v,str) or len(v)>4000 for v in a.values()):raise ValueError('Invalid source attribution')
    return deepcopy(value)


def encode_item(value):
    if not isinstance(value,str) or not value or len(value)>256 or any(ord(c)<32 for c in value):raise ValueError('Invalid source-local identifier')
    return quote(value,safe='-._~')


def qualified(source, item):
    if not isinstance(source,str) or not NAMESPACE.fullmatch(source):raise ValueError('Invalid source namespace')
    return source+':'+encode_item(item)


def parse_qualified(value):
    if not isinstance(value,str) or ':' not in value:raise ValueError('Use a source-qualified identifier')
    source,encoded_item=value.split(':',1)
    if re.search(r'%(?![a-fA-F0-9]{2})',encoded_item):raise ValueError('Malformed source identifier escape')
    item=unquote(encoded_item,errors='strict')
    if qualified(source,item)!=value:raise ValueError('Use canonical source identifier escaping')
    return source,item


def page_url(spec,item,revision=None,fragment=None):
    rules=spec['urlRules'];local=encode_item(item)
    if rules['identifier']=='page':local=local.replace('%20','+')
    template=rules['revisionPath'] if revision is not None else rules['itemPath']
    if template is None:raise ValueError('This source does not support explicit revision URLs')
    result=spec['origins'][0]+template.replace('{id}',local).replace('{revision}',str(revision))
    return result+('#'+quote(fragment,safe='-._~') if fragment else '')


def normalize(spec,value):
    if not isinstance(value,str) or len(value)>4096:raise ValueError('Invalid source input')
    value=value.strip();fragment=None;revision=None
    if value.startswith('https://'):
        uri=urlsplit(value)
        if uri.username or uri.password or uri.query or 'https://'+uri.netloc!=spec['origins'][0]:raise ValueError('Use this source\'s declared canonical URL')
        raw=uri.path;found=None
        for revision_url in (True,False):
            rule=spec['urlRules']['revisionPath' if revision_url else 'itemPath']
            if rule is None:continue
            rx=re.escape(rule).replace(re.escape('{id}'),r'(.+?)').replace(re.escape('{revision}'),r'([1-9][0-9]{0,9})')
            match=re.fullmatch(rx,raw)
            if match:found=match;revision=match[2] if revision_url else None;break
        if found is None:raise ValueError('Unsupported source page or revision URL')
        if re.search(r'%(?![a-fA-F0-9]{2})',found[1]+uri.fragment):raise ValueError('Malformed page URL escape')
        local=found[1].replace('+',' ') if spec['urlRules']['identifier']=='page' else found[1]
        item=unquote(local,errors='strict');fragment=unquote(uri.fragment,errors='strict') if uri.fragment else None
    else:
        if value.startswith(spec['sourceId']+':'):_,item=parse_qualified(value)
        else:item=value
    if spec['urlRules']['identifier']=='tag':
        if not re.fullmatch(r'[a-zA-Z0-9]{4}',item):raise ValueError('Use a four-character tag or canonical section URL')
        item=item.upper()
    if fragment and not spec['capabilities']['sectionSelection']:raise ValueError('This source does not support heading-fragment imports; use its whole section URL')
    encode_item(item)
    return dict(itemId=item,revision=revision,fragment=fragment,canonicalUrl=page_url(spec,item,revision,fragment))


def registry_path():
    custom=os.environ.get('MRW_SOURCE_PLUGIN_REGISTRY')
    if custom:
        p=Path(custom)
        if not p.is_absolute() or p.resolve()!=p:raise ValueError('MRW_SOURCE_PLUGIN_REGISTRY must be an absolute path without redirection')
        return p
    return Path(os.environ.get('XDG_CONFIG_HOME',str(Path.home()/'.config')))/'mrw'/'source-plugins.json'


class Registry:
    def __init__(self,path=None):
        self.path=path or registry_path();self.raw=None;self.entries=[];self.diagnostics=[]
        self.invalid=False
        if self.path.exists():
            try:
                self.raw=read_bounded(self.path,256*1024,'source plugin registrations');data=strict_json(self.raw)
                if not isinstance(data,dict) or set(data)!={'schema','version','entries'} or data['schema']!='mrw.source-plugins' or data['version']!=1 or not isinstance(data['entries'],list) or len(data['entries'])>64:raise ValueError('Invalid MRW source plugin registry')
                self.entries=data['entries']
            except (OSError,ValueError) as exc:
                self.invalid=True;self.diagnostics.append('Source registration file could not be read; built-ins remain available. Repair '+str(self.path)+': '+str(exc))
        self.sources={s['sourceId']:dict(manifest=manifest(s),kind='builtin',enabled=True) for s in BUILTINS}
        seen=set()
        for entry in self.entries:
            try:
                if set(entry)!={'manifest','kind','entryPoint','distribution','enabled','removed'} or type(entry['enabled']) is not bool or type(entry['removed']) is not bool or entry['kind'] not in ('profile','adapter','builtin'):raise ValueError('Invalid source registration')
                spec=manifest(entry['manifest'],profile=entry['kind']=='profile');source=spec['sourceId']
                if source in seen or (source in self.sources and (entry['kind']!='builtin' or spec!=self.sources[source]['manifest'])):raise ValueError('Conflicting source namespace registration: '+source)
                seen.add(source);self.sources[source]=dict(entry,manifest=spec,enabled=entry['enabled'] and not entry['removed'])
            except (ValueError,TypeError,KeyError) as exc:self.diagnostics.append(str(exc))
    def list(self):
        return dict(sources=[dict(**r['manifest'],enabled=r['enabled'],kind=r['kind'],removed=r.get('removed',False)) for r in self.sources.values()],diagnostics=self.diagnostics)
    def save(self):
        if self.invalid:raise ValueError('Repair the invalid source registration file before changing registrations; original bytes were preserved')
        directory(self.path.parent)
        save_mutable(self.path,encoded(dict(schema='mrw.source-plugins',version=1,entries=self.entries)),previous=self.raw,lock_root=self.path.parent/'locks')
    def add_profile(self,path):
        spec=manifest(strict_json(read_bounded(Path(path),65536,'source profile')),profile=True)
        return self.add(dict(manifest=spec,kind='profile',entryPoint=None,distribution=None,enabled=True,removed=False))
    def add_adapter(self,name,distribution):
        points=[e for e in importlib.metadata.entry_points(group='mrw.sources') if e.name==name and e.dist.name==distribution]
        if len(points)!=1:raise ValueError('Choose one installed mrw.sources entry point and distribution')
        adapter=points[0].load()();spec=manifest(adapter.manifest)
        self.check_adapter(adapter)
        return self.add(dict(manifest=spec,kind='adapter',entryPoint=name,distribution=distribution,enabled=True,removed=False))
    def add(self,entry):
        source=entry['manifest']['sourceId'];prior=self.sources.get(source)
        if prior and (prior['kind']=='builtin' or prior['manifest']['pluginId']!=entry['manifest']['pluginId']):raise ValueError('Conflicting source namespace registration: '+source)
        self.entries=[e for e in self.entries if not isinstance(e,dict) or not isinstance(e.get('manifest'),dict) or e['manifest'].get('sourceId')!=source]+[entry];self.save();return self.list_after()
    def list_after(self):return Registry(self.path).list()
    def change(self,source,enabled,remove=False):
        entry=self.sources.get(source)
        if not entry:raise ValueError('Unknown source plugin')
        entry=dict(entry,entryPoint=entry.get('entryPoint'),distribution=entry.get('distribution'),enabled=enabled,removed=remove)
        self.entries=[e for e in self.entries if not isinstance(e,dict) or not isinstance(e.get('manifest'),dict) or e['manifest'].get('sourceId')!=source]+[entry];self.save();return self.list_after()
    @staticmethod
    def check_adapter(adapter):
        if any(not callable(getattr(adapter,n,None)) for n in ('recognize','normalize','plan','parse','live_url')):raise ValueError('An API 1 adapter must implement recognize, normalize, plan, parse and live_url')
    def adapter(self,source):
        entry=self.sources.get(source)
        if not entry or not entry['enabled']:raise ValueError('Source plugin unavailable or disabled: '+source)
        if entry['kind']=='adapter':
            points=[e for e in importlib.metadata.entry_points(group='mrw.sources') if e.name==entry['entryPoint'] and e.dist.name==entry['distribution']]
            if len(points)!=1:raise ValueError('Registered source adapter is no longer installed')
            adapter=points[0].load()();spec=manifest(adapter.manifest)
            if spec['sourceId']!=source or spec['pluginId']!=entry['manifest']['pluginId']:raise ValueError('Installed adapter changed its source namespace or plugin identity')
        else:
            from .source_adapters import ProfileAdapter
            spec=entry['manifest'];adapter=ProfileAdapter(spec)
        self.check_adapter(adapter);return spec,adapter


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args):raise ValueError('Source acquisition redirects are not followed')


class Acquisition:
    def __init__(self,spec,downloader=None):self.spec=spec;self.resources={};self.downloader=downloader
    def fetch(self,name,url,limit=LIMIT):
        if not isinstance(name,str) or len(name)>128 or not re.fullmatch(r'[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)*',name) or any(x in ('.','..') for x in name.split('/')):raise ValueError('Invalid acquisition resource name')
        u=urlsplit(url)
        if u.scheme!='https' or u.username or u.password or u.fragment or 'https://'+u.netloc not in self.spec['origins']:raise ValueError('Source acquisition URL is outside its declared HTTPS origins')
        if type(limit) is not int or not 1<=limit<=LIMIT:raise ValueError('Invalid source response byte limit')
        if name in self.resources:
            if self.resources[name]['url']!=url:raise ValueError('Conflicting acquisition resource name')
            return self.resources[name]['bytes']
        if len(self.resources)>=8:raise ValueError('At most eight acquired resources per snapshot')
        if self.downloader:raw=self.downloader(url,limit)
        else:
            with build_opener(ProxyHandler({}),NoRedirect()).open(Request(url,headers={'User-Agent':'MRW-Source-Importer/1','Accept-Encoding':'identity'}),timeout=25) as r:
                if r.status!=200 or r.headers.get('Content-Encoding','identity')!='identity':raise ValueError('Unsupported source response')
                raw=r.read(limit+1)
        if not isinstance(raw,bytes) or len(raw)>limit or sum(len(r['bytes']) for r in self.resources.values())+len(raw)>LIMIT:raise ValueError('Source acquisition exceeds the combined 2 MiB limit')
        raw.decode('utf-8');self.resources[name]=dict(url=url,bytes=raw);return raw
