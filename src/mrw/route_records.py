"""Immutable retained results for the Lean route-search boundary.

Python validates bindings and publication; it never searches or checks an
inference. The existing artifact coordinator supplies relocation/generations.
"""
from __future__ import annotations
from copy import deepcopy
from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import re
import stat
from uuid import UUID, uuid4

from .artifact_context import read_location, publication_guard
from .local_files import read_bounded
from .mutable_files import private_directory, file_lock, sync_directory
from .private_persistence import persist_private_new
from .workspace import strict_json
from .justification import (_validate_profile, _validate_claims, _validate_admissions,
                            _validate_context, _validate_formula)

MAX_INPUT = 1024 * 1024
MAX_RECORD = 8 * 1024 * 1024
LIMITS = dict(rounds=4, routes=16, pairs=4096, nodes=64)
HEX = re.compile(r"[a-f0-9]{64}")
REQUEST_KEYS = {'schema','version','id','profile','context','claims','sources','admissions','goal','limits','withdrawal'}


def encode(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'), allow_nan=False)+'\n').encode('utf-8')


def digest(raw):
    return sha256(raw).hexdigest()


def text(value, limit=1024):
    if not isinstance(value,str) or not value or len(value.encode('utf-8'))>limit or any(
            ord(c)<32 or 127<=ord(c)<=159 or ord(c) in (0x61c,0x200e,0x200f) or
            0x202a<=ord(c)<=0x202e or 0x2066<=ord(c)<=0x2069 for c in value):
        raise ValueError('Invalid route identifier or display label')
    return value


def identifier(value):
    if not isinstance(value,str) or str(UUID(value))!=value: raise ValueError('Invalid route request ID')
    return value


def exact_keys(value, keys, label):
    if not isinstance(value,dict) or set(value)!=set(keys): raise ValueError('Invalid '+label+' fields')


def bounded_tree(value):
    pending=[(value,0)];count=0
    while pending:
        item,depth=pending.pop();count+=1
        if depth>48 or count>60000: raise ValueError('Route metadata nesting/size limit')
        if isinstance(item,dict): pending.extend((v,depth+1) for v in item.values())
        elif isinstance(item,list): pending.extend((v,depth+1) for v in item)


def parse_request(raw):
    if len(raw)>MAX_INPUT: raise ValueError('Route request exceeds 1 MiB')
    value=strict_json(raw);bounded_tree(value)
    exact_keys(value,REQUEST_KEYS,'route request')
    if value['schema']!='mrw.route-request' or type(value['version']) is not int or value['version']!=1:
        raise ValueError('Unsupported route request')
    identifier(value['id'])
    profile=_validate_profile(value['profile'],1)
    expected=dict(system='J0', syntax_version='justification-syntax-v1', rule_version='j0-hilbert-v1',
                  checker='MRW.Justification.checkCertificate',checker_version='justification-checker-v1',constant_specification=None)
    if any(profile[k]!=v for k,v in expected.items()): raise ValueError('Unsupported route profile')
    context=_validate_context(value['context']);claims=_validate_claims(value['claims'])
    admissions=_validate_admissions(value['admissions']);_validate_formula(value['goal'],'goal')
    if context['profile']!=profile['id'] or len(admissions)>32 or not claims or len(claims)>32:
        raise ValueError('Route profile/context or claim/admission count mismatch')
    active=context['admissions']
    if len(active)!=len(set(active)) or not set(active)<= {a['id'] for a in admissions}:
        raise ValueError('Context selects invalid or duplicate admission IDs')
    claim_by_id={c['id']:c for c in claims}
    for c in claims:
        if c['content_hash']!={'algorithm':'sha256','value':digest(c['assertion'].encode('utf-8'))}:
            raise ValueError('Claim assertion differs from its content hash')
    sources=value['sources']
    if not isinstance(sources,list) or not sources or len(sources)>32: raise ValueError('Choose at most 32 retained sources')
    seen={};total=0
    for s in sources:
        exact_keys(s,{'id','title','reference','source_revision','sha256','text'},'source snapshot')
        for key in ('id','title','reference'):text(s[key])
        if s['id'] in seen: raise ValueError('Duplicate source ID')
        if not isinstance(s['text'],str) or not s['text'].strip(): raise ValueError('Empty retained source')
        source_bytes=s['text'].encode('utf-8');total+=len(source_bytes)
        if len(source_bytes)>128*1024 or total>256*1024: raise ValueError('Retained source text limit')
        if not isinstance(s['source_revision'],str) or not HEX.fullmatch(s['source_revision']) or s['sha256']!=digest(source_bytes):
            raise ValueError('Retained source text or revision hash changed')
        seen[s['id']]=s
    for item in [*claims,*admissions]:
        refs=item.get('basis_refs',item.get('representation_refs'))
        if not refs: raise ValueError('Every claim and admission needs an exact source reference')
        for ref in refs:
            source=seen.get(ref['id'])
            if ref.get('kind')!='SourcePassage' or not source or ref.get('revision')!=source['sha256']:
                raise ValueError('Source reference differs from its retained passage')
    pending=[value['goal'],*(a['formula'] for a in admissions)]
    while pending:
        formula=pending.pop()
        if formula[0]=='atom':
            c=claim_by_id.get(formula[1]['id'])
            if c is None or c['content_hash']!=formula[1]['content_hash']: raise ValueError('Formula atom differs from exact claim version')
        elif formula[0]=='implication':pending.extend(formula[1:])
        elif formula[0]=='reason':pending.append(formula[2])
    limits=value['limits'];exact_keys(limits,LIMITS,'route limits')
    if any(type(limits[k]) is not int or limits[k]< (0 if k=='rounds' else 1) or limits[k]>v for k,v in LIMITS.items()):
        raise ValueError('Unsupported retained-reader route limits')
    w=value['withdrawal']
    if w is not None:
        exact_keys(w,{'predecessor','predecessor_digest','successor_id','removed','at','actor','rationale'},'withdrawal')
        text(w['successor_id']);text(w['at']);text(w['rationale']);text(w['predecessor'])
        if w['predecessor']!=w['predecessor_digest'] or not HEX.fullmatch(w['predecessor_digest']): raise ValueError('Invalid predecessor digest')
        removed=w['removed']
        if not isinstance(removed,list) or not removed or len(removed)!=len(set(removed)) or not set(removed)<=set(active):
            raise ValueError('Withdraw distinct active admission IDs')
        if w['successor_id']==context['id']: raise ValueError('Use a new successor context')
        if w['actor']!={'kind':'person','id':'local-reader'}: raise ValueError('Unsupported withdrawal actor')
    return value


def effective_request(record):
    value=deepcopy(record['request']);w=value['withdrawal']
    if w:
        value['context'].update(id=w['successor_id'],predecessor=value['context']['id'],
            admissions=[x for x in value['context']['admissions'] if x not in w['removed']],
            added=[],removed=w['removed'],change_kind='withdrawal',created_at=w['at'],
            created_by=w['actor'],rationale=w['rationale'])
    value['withdrawal']=None
    return value


def validate_output(value, request):
    exact_keys(value,{'schema','version','request_id','request','context','goal','routes','statistics'},'Lean route response')
    if value['schema']!='mrw.route-response' or value['version']!=1 or value['request_id']!=request['id'] or value['request']!=request or value['goal']!=request['goal']:
        raise ValueError('Lean output does not bind the exact request')
    effective=effective_request({'request':request})
    by_id={a['id']:a for a in request['admissions']};c=effective['context']
    expected={'id':c['id'],'profile_id':c['profile'],'admissions':[{'id':i,'formula':by_id[i]['formula']} for i in c['admissions']]}
    if value['context']!=expected: raise ValueError('Lean context differs from selected admissions')
    if not isinstance(value['routes'],list) or len(value['routes'])>request['limits']['routes']: raise ValueError('Route count limit')
    for route in value['routes']:
        exact_keys(route,{'term','claim','admission_ids','certificate'},'route')
        if route['claim']!=request['goal']: raise ValueError('Route has another goal')
        cert=route['certificate'];exact_keys(cert,{'conclusion','nodes'},'route certificate')
        if cert['conclusion']!=['reason',route['term'],request['goal']]: raise ValueError('Route conclusion binding mismatch')
        if not isinstance(cert['nodes'],list) or not 0<len(cert['nodes'])<=request['limits']['nodes']: raise ValueError('Certificate node limit')
        # This binds retained dependency metadata. Inference checking belongs to Lean.
        ids=[]
        for index,node in enumerate(cert['nodes']):
            exact_keys(node,{'index','formula','rule'},'certificate node')
            if node['index']!=index: raise ValueError('Certificate index changed')
            if node['rule'].get('kind')=='premise':
                name=node['rule'].get('admission_id')
                if name not in c['admissions'] or node['formula']!=by_id[name]['formula']: raise ValueError('Certificate uses an unselected admission')
                if name not in ids:ids.append(name)
        if ids!=route['admission_ids']: raise ValueError('Admission footprint differs from retained leaves')
    stats=value['statistics'];exact_keys(stats,{'known_routes','attempted_pairs','completed_rounds','limits_hit'},'statistics')
    for k,cap in [('known_routes',request['limits']['routes']),('attempted_pairs',request['limits']['pairs']),('completed_rounds',request['limits']['rounds'])]:
        if type(stats[k]) is not int or not 0<=stats[k]<=cap: raise ValueError('Invalid search statistics')
    if not isinstance(stats['limits_hit'],list) or not set(stats['limits_hit'])<= {'rounds','routes','pairs','nodes'}: raise ValueError('Invalid search limit status')
    return value


def base(store):
    p=Path(store)
    if not p.is_absolute() or p.resolve()!=p: raise ValueError('Use canonical private route storage')
    return read_location(p)


def _read_one(store, revision):
    if not isinstance(revision,str) or not HEX.fullmatch(revision): raise ValueError('Invalid retained route revision')
    raw=read_bounded(base(store)/(revision+'.json'),MAX_RECORD,'retained route result')
    if digest(raw)!=revision: raise ValueError('Retained route result changed')
    record=strict_json(raw);bounded_tree(record)
    exact_keys(record,{'schema','version','project_root','request','response','verification'},'retained result')
    if record['schema']!='mrw.route-result' or record['version']!=1: raise ValueError('Unsupported retained route result')
    request=parse_request(encode(record['request']));validate_output(record['response'],request)
    from .route_checker import verify_record_identity
    verify_record_identity(record['verification'],request,record['response'])
    return record



def read_record(store, revision):
    original=_read_one(store,revision);child=original;seen={revision}
    # Iterative validation retains at most the selected and current parent records.
    while child['request']['withdrawal']:
        w=child['request']['withdrawal'];prior=w['predecessor']
        if prior in seen or len(seen)>=16: raise ValueError('Invalid/cyclic or overlong justification lineage')
        seen.add(prior);parent=_read_one(store,prior)
        if parent['project_root']!=original['project_root']: raise ValueError('Predecessor belongs to another workspace')
        effective=effective_request(parent)
        for key in ('profile','context','claims','sources','admissions','goal','limits'):
            if child['request'][key]!=effective[key]: raise ValueError('Successor does not preserve its exact predecessor context')
        child=parent
    return original


def lineage_depth(store,revision):
    depth=0
    while revision:
        depth+=1
        if depth>=16: raise ValueError('Justification lineage reached its 16-context limit; prior work is preserved')
        item=_read_one(store,revision);w=item['request']['withdrawal'];revision=w['predecessor'] if w else None
    return depth

def list_records(store, project_root):
    folder=base(store)
    if not folder.exists():return
    if folder.is_symlink() or not folder.is_dir(): raise ValueError('Invalid route store')
    files=list(folder.iterdir())
    if len(files)>256: raise ValueError('Retained route listing exceeds its entry limit')
    total=0;count=0
    for p in sorted(files):
        # A stopped private publisher may leave an unpublished staging file.
        # Preserve it, but never present partial bytes as a checked result.
        metadata=p.lstat()
        if re.fullmatch(r'\.[a-f0-9]{64}\.json\.[a-z0-9_]{8}\.tmp',p.name):
            if not stat.S_ISREG(metadata.st_mode) or metadata.st_size>MAX_RECORD:
                raise ValueError('Invalid interrupted route staging entry')
            total+=metadata.st_size
            if total>64*1024*1024: raise ValueError('Route listing exceeds 64 MiB')
            continue
        count+=1
        if count>128: raise ValueError('Retained route listing exceeds 128 records')
        if not p.is_file() or p.is_symlink() or not HEX.fullmatch(p.stem) or p.suffix!='.json': raise ValueError('Unrecognized retained route entry')
        total+=p.stat().st_size
        if total>64*1024*1024: raise ValueError('Route listing exceeds 64 MiB')
        record=read_record(folder,p.stem)
        if record['project_root']!=project_root: raise ValueError('Retained result belongs to another project')
        yield p.stem,record


def view(revision, record):
    return dict(revision=revision,record=record,effective=effective_request(record),
                checked=record['verification']['checked_at'])


def run(store, project_root, request, checker):
    request=parse_request(encode(request));folder=base(store)
    from .route_checker import check
    with publication_guard(folder/'result.json'):
        private_directory(folder)
        with file_lock(folder,folder.parent/'route-locks'):
            count=0
            for revision,record in list_records(folder,project_root):
                count+=1
                if record['request']['id']==request['id']:
                    if record['request']!=request: raise ValueError('Request identity was reused for different work')
                    # Retry after an uncertain directory sync must establish durability.
                    sync_directory(folder)
                    return view(revision,record)
            if request['withdrawal']:
                parent=read_record(folder,request['withdrawal']['predecessor'])
                prior=effective_request(parent)
                for key in ('profile','context','claims','sources','admissions','goal','limits'):
                    if request[key]!=prior[key]: raise ValueError('Successor request changed prior context or sources')
            if count>=128: raise ValueError("Retained route store reached its 128-record limit; existing work is preserved")
            if request["withdrawal"]:lineage_depth(folder,request["withdrawal"]["predecessor"])
            response,verification=check(checker,request)
            validate_output(response,request)
            record=dict(schema='mrw.route-result',version=1,project_root=project_root,
                        request=request,response=response,verification=verification)
            raw=encode(record)
            if len(raw)>MAX_RECORD: raise ValueError('Retained route result exceeds 8 MiB')
            if sum(p.stat().st_size for p in folder.glob('*.json'))+len(raw)>64*1024*1024:
                raise ValueError('Retained route store reached its 64-MiB limit; existing work is preserved')
            revision=digest(raw);target=folder/(revision+'.json')
            persist_private_new(target,raw,error_type=ValueError)
            return view(revision,read_record(folder,revision))


def successor(store, project_root, revision, removed, request_id):
    identifier(request_id)
    parent=read_record(store,revision)
    if parent['project_root']!=project_root: raise ValueError('Wrong workspace project')
    lineage_depth(store,revision)
    value=effective_request(parent);value['id']=request_id
    value['withdrawal']=dict(predecessor=revision,predecessor_digest=revision,
        successor_id=str(uuid4()),removed=removed,at=utc_now(),actor={'kind':'person','id':'local-reader'},
        rationale='Explicit withdrawal from this context; prior work is preserved.')
    return parse_request(encode(value))


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z')


def example(source_path):
    raw=read_bounded(Path(source_path),256*1024,'Euclid walkthrough');body=raw.decode('utf-8');revision=digest(raw)
    titles=['Euclid lemma','Bézout argument','Unique factorization argument']
    chunks=[body.split('## Proof using',1)[0],
            '## Proof using'+body.split('## Proof using',1)[1].split('## Proof using',1)[0],
            '## Proof using'+body.split('## Proof using',2)[2].split('## What the engine',1)[0]]
    sources=[dict(id='euclid:'+str(i),title=title,reference='mrw-example:euclid-lemma#'+str(i),source_revision=revision,
                  sha256=digest(chunk.encode()),text=chunk) for i,(title,chunk) in enumerate(zip(titles,chunks))]
    refs=lambda i:[dict(kind='SourcePassage',id=sources[i]['id'],revision=sources[i]['sha256'])]
    assertions=[('euclid-lemma','Euclid lemma','For natural numbers p, a, b, if p is prime and p divides a*b, then p divides a or p divides b.',0),
                ('bezout','Bézout identity','For coprime integers x,y there exist integers u,v with u*x+v*y=1.',1),
                ('factorization','Unique prime factorization','Every positive integer has a prime factorization, unique up to permutation (the factorization of 1 is empty).',2)]
    claims=[dict(id=id,display_name=title,assertion=assertion,description='Supplied Euclid walkthrough assertion; arithmetic not checked in this run.',
                 content_hash={'algorithm':'sha256','value':digest(assertion.encode())},representation_refs=refs(i)) for id,title,assertion,i in assertions]
    atoms=[['atom',{'id':c['id'],'content_hash':c['content_hash']}] for c in claims]
    now=utc_now();actor={'kind':'named_policy','id':'MRW-Euclid-walkthrough-assumptions'}
    grounds=[('bezout-theorem','b',atoms[1],1),('bezout-proof-bridge','c',['implication',atoms[1],atoms[0]],1),
             ('factorization-theorem','u',atoms[2],2),('factorization-proof-bridge','d',['implication',atoms[2],atoms[0]],2)]
    admissions=[dict(id=id,formula=['reason',['variable',t],f],admitted_by=actor,at=now,basis_refs=refs(i),
        rationale='Supplied assumption for the Euclid walkthrough, not a new arithmetic verification.',
        scope='Only conditional composition in this example context.',supersedes=None) for id,t,f,i in grounds]
    profile=dict(id='mrw-j0-routes-v1',system='J0',syntax_version='justification-syntax-v1',rule_version='j0-hilbert-v1',
                 checker='MRW.Justification.checkCertificate',checker_version='justification-checker-v1',constant_specification=None)
    request=dict(schema='mrw.route-request',version=1,id=str(uuid4()),profile=profile,
        context=dict(id=str(uuid4()),profile=profile['id'],admissions=[a['id'] for a in admissions],predecessor=None,
                     added=[a['id'] for a in admissions],removed=[],change_kind='initial',created_at=now,created_by=actor,
                     rationale='Explicit Euclid walkthrough assumptions; arithmetic proof checking is separate.'),
        claims=claims,sources=sources,admissions=admissions,goal=atoms[0],limits=LIMITS.copy(),withdrawal=None)
    return parse_request(encode(request))


def action(request):
    method=request['method']
    if method=='route_example':return dict(request=example(Path(request['path'])))
    if method=='route_setup':
        from .route_checker import setup
        return setup(request['assets'],request['cache'])
    if method=='route_prepare':
        raw=read_bounded(Path(request['path']),MAX_INPUT,'explicit route context')
        if 'revision' in request and digest(raw)!=request['revision']: raise ValueError('The selected context changed; open it again')
        value=parse_request(raw)
        if value['withdrawal'] is not None: raise ValueError('Open a retained predecessor before withdrawing an admission')
        return dict(request=value)
    store=request['store'];project=Path(request['project_root'])
    if not project.is_absolute() or project.resolve()!=project: raise ValueError('Use a canonical workspace project')
    project=str(project)
    if method=='route_run':return run(store,project,request['request'],request['cache'])
    if method=='route_successor':return dict(request=successor(store,project,request['revision'],request['removed'],request['request_id']))
    if method=='route_read':
        record=read_record(store,request['revision'])
        if record['project_root']!=project: raise ValueError('Retained result belongs to another workspace project')
        return view(request['revision'],record)
    if method=='route_list':
        return dict(records=[dict(revision=revision,goal=goal_label(record['request']),
            checked=record['verification']['checked_at'],context=record['response']['context']['id'],
            routes=len(record['response']['routes']),predecessor=record['request']['withdrawal']['predecessor'] if record['request']['withdrawal'] else None)
            for revision,record in list_records(store,project)])
    raise ValueError('Unsupported justification action')


def goal_label(request):
    goal=request['goal']
    if goal[0]=='atom':
        return next(c['display_name'] for c in request['claims'] if c['id']==goal[1]['id'])
    return 'Selected claim'
