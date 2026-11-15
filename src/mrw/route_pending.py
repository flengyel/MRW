"""Durable, unchecked route requests; completion is derived from exact results."""
from pathlib import Path
import re
import stat
from urllib.parse import urlsplit

from .route_records import (base, encode, digest, parse_request, exact_keys, HEX,
    MAX_RECORD, read_record, list_records, effective_request, lineage_depth, view)
from .local_files import read_bounded
from .workspace import strict_json
from .mutable_files import private_directory, file_lock, sync_directory
from .private_persistence import persist_private_new
from .artifact_context import publication_guard

TEMP=re.compile(r'\.[a-f0-9]{64}\.json\.[a-z0-9_]{8}\.tmp')
MAX_BYTES=64*1024*1024


def origin(value, initial=True):
    if value is None:return None
    required={'uri','revision','start','end'}
    if not isinstance(value,dict) or not required<=set(value) or set(value)-required-{'invalid','initial'}:
        raise ValueError('Invalid originating document location')
    if not isinstance(value['revision'],str) or not HEX.fullmatch(value['revision']):raise ValueError('Invalid origin revision')
    if any(type(value[k]) is not int for k in ('start','end')) or not 0<=value['start']<=value['end']<=2**53-1:
        raise ValueError('Invalid origin range')
    if 'invalid' in value and type(value['invalid']) is not bool:raise ValueError('Invalid origin status')
    if 'initial' in value:
        if not initial or value['initial'] is None:raise ValueError('Invalid initial origin')
        exact_keys(value['initial'],{'revision','start','end'},'initial origin range')
        origin(dict(uri=value['uri'],**value['initial']),False)
    uri=value['uri']
    if isinstance(uri,str):
        if any(c in uri for c in ('\x00','\r','\n')):raise ValueError('Invalid origin URI')
        parsed=urlsplit(uri)
        if parsed.scheme!='file' or parsed.netloc not in ('','localhost') or not parsed.path.startswith('/') or parsed.query or parsed.fragment:
            raise ValueError('Use a local originating document')
    elif isinstance(uri,dict):
        kind=uri.get('$mrwPath');keys={'$mrwPath','relative','uri'} | ({'root'} if kind=='notes' else set())
        exact_keys(uri,keys,'relative origin')
        if kind not in ('workspace','notes'):raise ValueError('Invalid origin root')
        rel=uri['relative']
        if not isinstance(rel,str) or not rel or Path(rel).is_absolute() or any(p in ('','..','.') for p in rel.split('/')) or '\\' in rel:
            raise ValueError('Origin leaves its recorded root')
        if kind=='notes' and (not isinstance(uri['root'],str) or not Path(uri['root']).is_absolute() or str(Path(uri['root']))!=uri['root']):raise ValueError('Invalid recorded notes root')
        exact_keys(uri['uri'],{'protocol','host','search','hash'},'origin URI')
        if uri['uri']!={'protocol':'file:','host':'','search':'','hash':''}:raise ValueError('Invalid local origin URI')
    else:raise ValueError('Invalid origin URI')
    if len(encode(value))>16384:raise ValueError('Origin metadata exceeds its limit')
    return value


def entries(folder):
    if not folder.exists():return
    if folder.is_symlink() or not folder.is_dir():raise ValueError('Invalid unfinished context directory')
    paths=list(folder.iterdir())
    if len(paths)>256:raise ValueError('Unfinished context entry limit')
    count=0;size=0
    for p in sorted(paths):
        st=p.lstat();size+=st.st_size
        if not stat.S_ISREG(st.st_mode) or size>MAX_BYTES or st.st_size>MAX_RECORD:raise ValueError('Invalid or oversized unfinished context entry')
        if TEMP.fullmatch(p.name):continue
        if p.suffix!='.json' or not HEX.fullmatch(p.stem):raise ValueError('Unrecognized unfinished context entry')
        count+=1
        if count>128:raise ValueError('Unfinished context record limit')
        yield p


def intents(store, project):
    for p in entries(base(store)/'pending'):
        raw=read_bounded(p,2*1024*1024,'unfinished context')
        if digest(raw)!=p.stem:raise ValueError('Unfinished context bytes changed')
        item=strict_json(raw);exact_keys(item,{'schema','version','project_root','request','origin'},'unfinished context')
        if item['schema']!='mrw.route-intent' or type(item['version']) is not int or item['version']!=1:raise ValueError('Unsupported unfinished context')
        if item['project_root']!=project:raise ValueError('Unfinished context belongs to another workspace')
        parse_request(encode(item['request']));origin(item['origin'])
        yield p.stem,item


def validate_parent(store, project, request):
    if not request['withdrawal']:return
    revision=request['withdrawal']['predecessor'];parent=read_record(store,revision)
    if parent['project_root']!=project:raise ValueError('Wrong predecessor workspace')
    prior=effective_request(parent)
    for k in ('profile','context','claims','sources','admissions','goal','limits'):
        if request[k]!=prior[k]:raise ValueError('Unfinished successor changed its exact predecessor')
    lineage_depth(store,revision)


def catalog(store, project):
    completed={}
    for revision,record in list_records(store,project):
        key=record['request']['id']
        if key in completed:raise ValueError('Conflicting completed request identities')
        completed[key]=(revision,digest(encode(record['request'])))
    seen=set()
    for revision,item in intents(store,project):
        key=item['request']['id']
        if key in seen:raise ValueError('Conflicting unfinished request identities')
        seen.add(key);validate_parent(store,project,item['request'])
        result=completed.get(key)
        if result and result[1]!=digest(encode(item['request'])):raise ValueError('Completed result differs from its unfinished context')
        yield revision,item,result[0] if result else None


def storage_size(store):
    folder=base(store)
    if not folder.exists():return 0
    files=[]
    for p in folder.iterdir():
        if p.name=='pending':
            if p.is_symlink() or not p.is_dir():raise ValueError('Invalid unfinished context directory')
            files.extend(p.iterdir())
        else:files.append(p)
    if len(files)>512:raise ValueError('Justification storage entry limit')
    total=0
    for p in files:
        st=p.lstat()
        if not stat.S_ISREG(st.st_mode):raise ValueError('Invalid justification storage entry')
        total+=st.st_size
    return total


def stage(store, project, request, location):
    request=parse_request(encode(request));location=origin(location);folder=base(store)
    with publication_guard(folder/'pending/context.json'):
        private_directory(folder)
        with file_lock(folder,folder.parent/'route-locks'):
            # Reuse the first captured origin, even when retry starts elsewhere.
            count=0
            for revision,item,result in catalog(folder,project):
                count+=1
                if item['request']['id']==request['id']:
                    if item['request']!=request:raise ValueError('Request identity was reused for different unfinished work')
                    sync_directory(folder/'pending')
                    return dict(intent=revision,origin=item['origin'])
            validate_parent(folder,project,request)
            for _revision,record in list_records(folder,project):
                if record['request']['id']==request['id'] and record['request']!=request:raise ValueError('Request identity was reused for different completed work')
            if count>=128:raise ValueError('Unfinished context store reached its 128-record limit; existing work is preserved')
            item=dict(schema='mrw.route-intent',version=1,project_root=project,request=request,origin=location)
            raw=encode(item);size=storage_size(folder)
            if len(raw)>2*1024*1024:raise ValueError('Unfinished context exceeds its size limit')
            if size+len(raw)>MAX_BYTES:raise ValueError('Justification storage reached its 64-MiB limit; existing work is preserved')
            private_directory(folder/'pending');revision=digest(raw)
            persist_private_new(folder/'pending'/(revision+'.json'),raw,error_type=ValueError)
            return dict(intent=revision,origin=location)


def resume(store, project, revision):
    if not isinstance(revision,str) or not HEX.fullmatch(revision):raise ValueError('Invalid unfinished context revision')
    for key,item,result in catalog(store,project):
        if key!=revision:continue
        if result:return dict(result=view(result,read_record(store,result)),origin=item['origin'])
        return dict(request=item['request'],origin=item['origin'],intent=revision)
    raise ValueError('The saved unfinished context is unavailable; no replacement was guessed')


def with_origin(store, project, result):
    found=False
    for _revision,item in intents(store,project):
        if item['request']['id']!=result['record']['request']['id']:continue
        if found or item['request']!=result['record']['request']:raise ValueError('Result differs from its unfinished context')
        result['origin']=item['origin'];found=True
    return result
