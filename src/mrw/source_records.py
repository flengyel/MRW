"""Core-owned source snapshots. Offline reading never loads a source plugin."""
import base64
from copy import deepcopy
from hashlib import sha256
import importlib.metadata
from pathlib import Path
from uuid import uuid4,uuid5,NAMESPACE_URL
from urllib.parse import urlsplit

from .source_plugins import Registry,Acquisition,manifest,qualified,parse_qualified,LIMIT
from .source_rendering import validate_tokens
from .source import SourceDocument
from .source_outlines import OutlineStore,SCHEMA,BIBLIOGRAPHY,encoded,directory,identity,now,validate_state,span_text
from .local_files import read_bounded
from .private_persistence import persist_private_new
from .workspace import strict_json


def digest(raw):return sha256(raw).hexdigest()


def model_check(value,source):
    if not isinstance(value,dict) or set(value)-{'navigation'}!={'displayVersion','title','format','parts','choices','default'} or type(value['displayVersion']) is not int or value['displayVersion']!=1:raise ValueError('Unsupported normalized source display model')
    if value['format'] not in ('html','tex') or not isinstance(value['title'],str) or not 1<=len(value['title'])<=1024:raise ValueError('Invalid source display title or format')
    if not isinstance(value['parts'],list) or not 1<=len(value['parts'])<=128:raise ValueError('A source display must contain 1–128 exact mapped passages')
    nav=value.get('navigation')
    if nav is not None:
        if not isinstance(nav,dict) or set(nav)!={'chapter','chapter_tag','section_number','previous','next'}:raise ValueError('Invalid source navigation')
        if not isinstance(nav['chapter'],str) or len(nav['chapter'])>1024 or type(nav['section_number']) is not int:raise ValueError('Invalid source chapter')
        for key in ('previous','next'):
            n=nav[key]
            if n is not None and (not isinstance(n,dict) or set(n)!={'title','tag'} or not isinstance(n['title'],str) or len(n['title'])>1024):raise ValueError('Invalid source neighbour')
        for tag in [nav['chapter_tag'],*(n['tag'] for n in (nav['previous'],nav['next']) if n)]:
            if tag is not None:qualified('source',tag)
    keys=set()
    for p in value['parts']:
        if not isinstance(p,dict) or set(p)!={'key','itemId','anchor','role','title','span','tokens','warning'} or not isinstance(p['key'],str) or p['key'] in keys or not 1<=len(p['key'])<=128:raise ValueError('Invalid or duplicate mapped passage')
        keys.add(p['key'])
        if p['role'] not in ('context','statement','proof') or not isinstance(p['title'],str) or len(p['title'])>1024:raise ValueError('Invalid mapped passage role/title')
        qualified('source',p['itemId'])
        if p['anchor'] is not None and (not isinstance(p['anchor'],str) or len(p['anchor'])>512):raise ValueError('Invalid source heading anchor')
        span_text(source,p['span']);validate_tokens(p['tokens'])
        if p['warning'] is not None and (not isinstance(p['warning'],str) or len(p['warning'])>8192):raise ValueError('Invalid source display warning')
    if not isinstance(value['choices'],list) or not 1<=len(value['choices'])<=129:raise ValueError('Invalid section choices')
    ids=set()
    for c in value['choices']:
        if not isinstance(c,dict) or set(c)!={'id','title','first','last'} or not isinstance(c['id'],str) or c['id'] in ids or not isinstance(c['title'],str) or len(c['title'])>2048:raise ValueError('Invalid source section choice')
        ids.add(c['id'])
        if type(c['first']) is not int or type(c['last']) is not int or not 0<=c['first']<c['last']<=len(value['parts']):raise ValueError('Invalid selected heading boundaries')
    if value['default'] not in ids:raise ValueError('Missing default section selection')
    if len(encoded(value))>LIMIT:raise ValueError('Normalized display exceeds the 2 MiB limit')
    return value


def preparation_directory(store):
    from .artifact_context import CURRENT
    access=CURRENT.get();runtime=access.manager.runtime if access else store.base.parent/'artifact-runtime'
    target=runtime/'source-preparations';directory(target);return target


def metadata_check(spec,item,plan):
    if not isinstance(item,dict) or set(item)!={'itemId','revision','fragment','canonicalUrl'}:raise ValueError('Invalid normalized source input')
    qualified(spec['sourceId'],item['itemId'])
    for key in ('revision','fragment'):
        if item[key] is not None and (not isinstance(item[key],str) or not 1<=len(item[key])<=512):raise ValueError('Invalid source '+key)
    def url_check(value):
        if not isinstance(value,str) or len(value)>4096:raise ValueError('Invalid source URL')
        u=urlsplit(value)
        if u.scheme!='https' or u.username or u.password or 'https://'+u.netloc not in spec['origins']:raise ValueError('Source URL outside declared origins')
    url_check(item['canonicalUrl'])
    if not isinstance(plan,dict) or not {'primary','revision','canonicalUrl'}<=set(plan) or set(plan)-{'primary','revision','canonicalUrl','identityKey'}:raise ValueError('Invalid source acquisition plan')
    if not isinstance(plan['primary'],str) or len(plan['primary'])>128:raise ValueError('Invalid primary resource name')
    url_check(plan['canonicalUrl'])
    if 'identityKey' in plan and (not isinstance(plan['identityKey'],str) or not 1<=len(plan['identityKey'])<=4096):raise ValueError('Invalid acquisition identity key')
    revision=plan['revision']
    if not isinstance(revision,dict) or set(revision)!={'kind','label','verified'} or revision['kind'] not in ('git','upstream-revision','dated-snapshot') or type(revision['verified']) is not bool:raise ValueError('Invalid source revision evidence')
    if revision['label'] is not None and (not isinstance(revision['label'],str) or not 1<=len(revision['label'])<=512):raise ValueError('Invalid source revision label')
    if revision['kind']!='dated-snapshot' and not revision['label']:raise ValueError('Missing source revision label')


def packet_check(packet):
    if not isinstance(packet,dict) or set(packet)!={'spec','producer','item','plan','resources','model','retrievedAt','derivedFrom'}:raise ValueError('Invalid source preparation')
    spec=manifest(packet['spec']);producer=packet['producer']
    if producer!=dict(pluginId=spec['pluginId'],pluginVersion=spec['pluginVersion'],apiVersion=1):raise ValueError('Invalid source transformation producer')
    metadata_check(spec,packet['item'],packet['plan'])
    resources={}
    if not isinstance(packet['resources'],dict) or not 1<=len(packet['resources'])<=8:raise ValueError('Invalid retained source resources')
    for name,r in packet['resources'].items():
        if not isinstance(r,dict) or set(r)!={'url','sha256','bytes'}:raise ValueError('Invalid acquired resource record')
        if not isinstance(name,str) or not name or len(name)>128 or any(p in ('.','..','') for p in name.split('/')):raise ValueError('Invalid retained resource name')
        u=urlsplit(r['url'])
        if u.scheme!='https' or u.username or u.password or u.fragment or 'https://'+u.netloc not in spec['origins']:raise ValueError('Invalid retained resource URL')
        raw=base64.b64decode(r['bytes'],validate=True)
        if digest(raw)!=r['sha256'] or len(raw)>LIMIT:raise ValueError('Acquired source bytes changed')
        raw.decode('utf-8');resources[name]=raw
    if sum(map(len,resources.values()))>LIMIT:raise ValueError('Acquired source exceeds 2 MiB')
    primary=packet['plan']['primary']
    if primary not in resources:raise ValueError('Primary source bytes are missing')
    source=SourceDocument.from_bytes('/'+primary,resources[primary]);model_check(packet['model'],source)
    return spec,resources,source


def save_preparation(store,packet):
    packet_check(packet)
    from .outline_references import scope
    ticket=str(uuid4());persist_private_new(preparation_directory(store)/(ticket+'.json'),encoded(dict(project=str(store.root),scope=scope(store),packet=packet)))
    model=packet['model']
    return dict(ticket=ticket,preview=dict(title=model['title'],sourceId=packet['spec']['sourceId'],sourceName=packet['spec']['name'],producer=packet['producer'],revision=packet['plan']['revision'],sourceRevision=digest(base64.b64decode(packet['resources'][packet['plan']['primary']]['bytes'])),choices=model['choices'],default=model['default'],capabilities=packet['spec']['capabilities'],attribution=packet['spec']['attribution']))


def prepare(request,downloader=None):
    store=OutlineStore(request['store'],request['project_root']);spec,adapter=Registry().adapter(request['source_id'])
    if not spec['capabilities']['savedImport']:raise ValueError('This source plugin does not support saved import')
    try:
        if not adapter.recognize(request['input']):raise ValueError('The selected source plugin does not recognize this input')
        item=adapter.normalize(request['input']);host=Acquisition(spec,downloader)
        plan=adapter.plan(deepcopy(item),host)
        resources={n:r['bytes'] for n,r in host.resources.items()}
        if not resources or plan['primary'] not in resources:raise ValueError('The plugin acquisition plan did not retain its primary source')
        model=adapter.parse(deepcopy(item),resources,deepcopy(plan));live=adapter.live_url(deepcopy(item))
        url=urlsplit(live)
        if url.scheme!='https' or url.username or url.password or 'https://'+url.netloc not in spec['origins']:raise ValueError('Plugin live-page URL is outside its declared origins')
        plan=dict(plan,canonicalUrl=live)
        packet=dict(spec=spec,producer=dict(pluginId=spec['pluginId'],pluginVersion=spec['pluginVersion'],apiVersion=1),item=item,plan=plan,
            resources={n:dict(url=r['url'],sha256=digest(r['bytes']),bytes=base64.b64encode(r['bytes']).decode()) for n,r in host.resources.items()},model=model,retrievedAt=now(),derivedFrom=None)
        return save_preparation(store,packet)
    except Exception as exc:
        raise ValueError('Source plugin '+spec['pluginId']+' failed: '+str(exc)) from exc


def snapshot(store):
    artifact=next((a for a in store.state['artifacts'] if a['id']==store.state.get('acquisition',{}).get('artifact')),None)
    if artifact is None:raise ValueError('Retained source snapshot metadata is missing')
    value=strict_json(store.artifact(artifact))
    if not isinstance(value,dict) or value.get('schema')!='mrw.source-snapshot' or value.get('version')!=1:raise ValueError('Unsupported retained source snapshot')
    spec=manifest(value['spec']);source=store.source()
    if value['sourceRevision']!=source.revision:raise ValueError('Retained source revision differs from its display model')
    if value['producer']!=dict(pluginId=spec['pluginId'],pluginVersion=spec['pluginVersion'],apiVersion=1):raise ValueError('Retained transformation attribution differs')
    metadata_check(spec,value['item'],value['plan'])
    model_check(value['model'],source)
    for name,r in value['resources'].items():
        if r['artifact'] is None:raw=source.text.encode('utf-8')
        else:
            attached=next((a for a in store.state['artifacts'] if a['id']==r['artifact']),None)
            if attached is None:raise ValueError('A retained acquisition dependency is missing')
            raw=store.artifact(attached)
        if digest(raw)!=r['sha256']:raise ValueError('Retained acquisition bytes changed: '+name)
    if len(value['regions'])!=len(value['model']['parts']):raise ValueError('Retained display/source mapping differs')
    return value


def commit_import(request):
    store=OutlineStore(request['store'],request['project_root'])
    from .outline_references import scope
    ticket=identity(request['ticket']);saved=strict_json(read_bounded(preparation_directory(store)/(ticket+'.json'),8*1024*1024,'source preparation'))
    if saved.get('project')!=str(store.root) or saved.get('scope')!=scope(store):raise ValueError('Source preparation belongs to another workspace')
    packet=saved['packet'];spec,resources,source=packet_check(packet);model=deepcopy(packet['model'])
    choice=next((c for c in model['choices'] if c['id']==request['section']),None)
    if choice is None:raise ValueError('Choose an available source section')
    if not spec['capabilities']['sectionSelection'] and choice['id']!='whole':raise ValueError('This plugin does not support section selection')
    identifier=qualified(spec['sourceId'],packet['item']['itemId'])
    key=packet['plan'].get('identityKey',identifier+'@'+source.revision)
    if request['section']!='whole':key+=':section:'+request['section']
    if packet['derivedFrom']:key+=':derived:'+packet['derivedFrom']+':'+digest(encoded(model))
    store.id=str(uuid5(NAMESPACE_URL,str(store.root)+'\0'+key));store.directory=store.base/store.id
    if (store.directory/'outline.json').exists():
        existing=OutlineStore(str(store.base),str(store.root),store.id)
        from .outline_references import published_identity
        if existing.source().revision!=source.revision or published_identity(existing)!=identifier:raise ValueError('Existing source identity conflicts; no saved work was overwritten')
        result=existing.view();result['reused']=True;return result
    model['parts']=model['parts'][choice['first']:choice['last']]
    model['choices']=[dict(id=request['section'],title=choice['title'],first=0,last=len(model['parts']))];model['default']=request['section']
    regions=[];mapping=[]
    for i,p in enumerate(model['parts']):
        rid=str(uuid5(NAMESPACE_URL,store.id+':part:'+str(i)));mapping.append(rid)
        regions.append(dict(id=rid,title=p['title'],level='argument' if p['role']=='proof' else 'concepts_results' if p['role']=='statement' else 'orientation',span=p['span'],statement=None,collapsed=False,annotations=[]))
    artifacts=[];records={}
    def retain_artifact(name,raw):
        aid=str(uuid5(NAMESPACE_URL,store.id+':'+name));artifacts.append(dict(id=aid,path=str(store.blob(digest(raw))),revision=digest(raw),kind='supporting_artifact',label=name,region=None,selector=None,captured_at=packet['retrievedAt']));return aid
    for name,raw in resources.items():records[name]=dict(url=packet['resources'][name]['url'],sha256=digest(raw),artifact=None if name==packet['plan']['primary'] else retain_artifact(name,raw))
    saved_model=dict(schema='mrw.source-snapshot',version=1,sourceId=spec['sourceId'],itemId=packet['item']['itemId'],sourceRevision=source.revision,spec=spec,producer=packet['producer'],item=packet['item'],plan=packet['plan'],resources=records,model=model,regions=mapping,selectedScope=request['section'],retrievedAt=packet['retrievedAt'],derivedFrom=packet['derivedFrom'])
    raw_model=encoded(saved_model)
    if len(raw_model)>LIMIT:raise ValueError('Retained normalized source model exceeds 2 MiB')
    acquisition=retain_artifact('Source display and acquisition mappings',raw_model)
    bibliography={k:None for k in BIBLIOGRAPHY};bibliography.update(title=model['title']+((' · '+choice['title']) if request['section']!='whole' else ''),authors=spec['attribution']['authors'],reference=packet['plan']['canonicalUrl'],locator=identifier,revision=packet['plan']['revision'].get('label') or 'Snapshot SHA-256 '+source.revision)
    state=dict(schema=SCHEMA,version=2,id=store.id,project_root=str(store.root),created_at=now(),source=dict(path=str(store.blob(source.revision,source=True)),revision=source.revision,authorship='unknown',bibliography=bibliography),regions=regions,contexts=[],annotations=[],artifacts=artifacts,acquisition=dict(kind='source-plugin',artifact=acquisition))
    validate_state(state,store.root,store.id)
    allowed={store.blob(source.revision,source=True).name,'outline.json',*('artifact-'+a['revision']+'.bin' for a in artifacts)}
    if store.directory.exists() and any(p.name not in allowed for p in store.directory.iterdir()):raise ValueError('Existing source destination contains unrelated work')
    try:
        directory(store.directory);store.retain(source.text.encode('utf-8'),source=True)
        for name,raw in resources.items():
            if name!=packet['plan']['primary']:store.retain(raw)
        store.retain(raw_model);result=store.publish(state)
    except (OSError,ValueError) as exc:return dict(blocked=True,write_error=str(exc))
    result['reused']=False;return result


def enrich(store,value):
    kind=store.state.get('acquisition',{}).get('kind')
    if kind!='source-plugin':
        from .source_adapters import old_reader
        adapter=old_reader(kind)
        if adapter:adapter.enrich(store,value)
        return value
    try:
        saved=snapshot(store);spec=saved['spec'];source=store.source();parts={};refs=set();links=set()
        def tokens(items):
            for t in items:
                if t['kind']=='reference' and t.get('tag'):
                    t['source_id']=spec['sourceId'];t['qualified_tag']=qualified(spec['sourceId'],t['tag']);refs.add(t['tag'])
                if t['kind']=='link':links.add(t['url'])
                tokens(t.get('children',[]))
                for group in t.get('items',[]):tokens(group)
        for part,rid in zip(saved['model']['parts'],saved['regions'],strict=True):
            part=deepcopy(part);tokens(part['tokens'])
            parts[rid]=dict(**part,region=rid,tag=part['itemId'],qualified_tag=qualified(spec['sourceId'],part['itemId']),source_id=spec['sourceId'],exact_text=span_text(source,part['span']),format=saved['model']['format'])
        revision=saved['plan']['revision']
        value['published']=dict(source_id=spec['sourceId'],source_name=spec['name'],tag=saved['itemId'],qualified_tag=qualified(spec['sourceId'],saved['itemId']),title=saved['model']['title'],chapter=spec['name'],section_number=None,previous=None,next=None,chapter_tag=None,parts=parts,citation=saved['plan']['canonicalUrl'],authors=spec['attribution']['authors'],license=spec['attribution']['license'],commit=revision['label'] if revision['kind']=='git' else None,revision_metadata=revision,retrieved_at=saved['retrievedAt'],source_file=saved['plan']['primary'],source_revision=source.revision,reference_tags=sorted(refs),links=sorted(links),producer=saved['producer'],selected_scope=saved['selectedScope'],derived_from=saved['derivedFrom'],format=saved['model']['format'],capabilities=spec['capabilities'],limitation=None,error=None,
            online=dict(sourceId=spec['sourceId'],name=spec['name'],url=saved['plan']['canonicalUrl'],origins=['https://'+urlsplit(saved['plan']['canonicalUrl']).netloc],supported=spec['capabilities']['onlineView'],revision=source.revision,reason='This source does not permit an embedded original page. Use Saved text or Open in browser.'))
        value['published'].update(saved['model'].get('navigation',{}))
        value['source_status']='retained upstream page snapshot'
    except (OSError,ValueError,KeyError,TypeError,StopIteration) as exc:value['published']=dict(error='Retained source snapshot unavailable: '+str(exc))
    return value


def published_identity(store,region=None,span=None):
    kind=store.state.get('acquisition',{}).get('kind')
    if kind=='source-plugin':
        saved=snapshot(store);parts=saved['model']['parts'];source=saved['sourceId'];item=saved['itemId']
        for p,rid in zip(parts,saved['regions'],strict=True):
            bounds=p['span']
            match=(bounds['start_line'],bounds['start_col']) <= (span['start_line'],span['start_col']) and (span['end_line'],span['end_col']) <= (bounds['end_line'],bounds['end_col']) if span else region and rid==region
            if match:item=p['itemId'];break
        return qualified(source,item)
    from .source_adapters import old_reader
    adapter=old_reader(kind)
    if adapter is None:return None
    saved,_=adapter._manifest(store);source=saved.get('source_id','stacks-project')
    part=next((p for p in saved['parts'] if ((p['span']['start_line'],p['span']['start_col']) <= (span['start_line'],span['start_col']) and (span['end_line'],span['end_col']) <= (p['span']['end_line'],p['span']['end_col']) if span else region and p['region']==region)),None)
    return qualified(source,part['tag'] if part else saved['tag'])


def retained_reference(request):
    store=OutlineStore(request['store'],request['project_root'],request['id']);store.expect(request['revision']);view=store.view()['outline']['published']
    tag=request['tag'];identifier=tag if ':' in tag else qualified(view['source_id'],tag)
    target=next((p for p in view['parts'].values() if p['qualified_tag']==identifier and p['role']=='statement'),None)
    if target is None:raise ValueError('The cited passage is not retained in this source')
    from .outline_references import pinned_reference,reference_action
    reference=pinned_reference(store,store.source(),target['region'],target['span'])
    return reference_action(dict(method='outline_follow_reference',store=str(store.base),project_root=str(store.root),reference=reference))


def reparse(request):
    store=OutlineStore(request['store'],request['project_root'],request['id']);store.expect(request['revision']);saved=snapshot(store);spec,adapter=Registry().adapter(saved['sourceId'])
    resources={}
    for name,r in saved['resources'].items():resources[name]=store.source().text.encode() if r['artifact'] is None else store.artifact(next(a for a in store.state['artifacts'] if a['id']==r['artifact']))
    try:model=adapter.parse(deepcopy(saved['item']),resources,deepcopy(saved['plan']))
    except Exception as exc:raise ValueError('Source reparse failed; original snapshot preserved: '+str(exc)) from exc
    choice=next((c for c in model['choices'] if c['id']==saved['selectedScope']),None)
    if choice is None:raise ValueError('The new parser no longer identifies the saved scope; no annotation was moved')
    model['default']=choice['id']
    packet=dict(spec=spec,producer=dict(pluginId=spec['pluginId'],pluginVersion=spec['pluginVersion'],apiVersion=1),item=saved['item'],plan=saved['plan'],resources={n:dict(url=saved['resources'][n]['url'],sha256=digest(raw),bytes=base64.b64encode(raw).decode()) for n,raw in resources.items()},model=model,retrievedAt=now(),derivedFrom=store.id)
    return save_preparation(store,packet)


def action(request):
    method=request['method']
    if method=='outline_source_prepare':return prepare(request)
    if method=='outline_source_import':return commit_import(request)
    if method=='outline_source_reference':return retained_reference(request)
    if method=='outline_source_reparse':return reparse(request)
    registry=Registry()
    if method=='source_plugins_list':return registry.list()
    if method=='source_plugins_installed':return dict(adapters=[dict(entryPoint=e.name,distribution=e.dist.name,version=e.dist.version) for e in importlib.metadata.entry_points(group='mrw.sources')])
    if method=='source_plugins_add_profile':return registry.add_profile(request['path'])
    if method=='source_plugins_add_adapter':return registry.add_adapter(request['entry_point'],request['distribution'])
    if method=='source_plugins_change':
        if type(request['enabled']) is not bool or type(request['remove']) is not bool:raise ValueError('Invalid source plugin activation choice')
        return registry.change(request['source_id'],request['enabled'],request['remove'])
    raise ValueError('Unsupported source plugin action')
