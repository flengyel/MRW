"""Retained source selections and attributed proposals, before premise admission.

These are private captures in the existing artifact store, not ordinary notes.
No inference or model call occurs here. Only explicit acceptance creates an intent.
"""
from copy import deepcopy
from pathlib import Path
from uuid import uuid4

from .route_records import (encode, digest, exact_keys, identifier, text, base,
    parse_request, validate_sources, bounded_tree, HEX, LIMITS, utc_now)
from .route_pending import entries, origin, storage_size, MAX_BYTES
from .local_files import read_bounded
from .workspace import strict_json
from .mutable_files import private_directory, file_lock, sync_directory
from .private_persistence import persist_private_new
from .artifact_context import publication_guard

KEYS={'schema','version','id','parent','project_root','sources','origin','proposal','review'}
PROPOSAL_KEYS={'schema','version','source_set','attribution','claims','grounds','goal'}


def proposal(value, material):
    exact_keys(value,PROPOSAL_KEYS,'grounds proposal')
    if value['schema']!='mrw.grounds-proposal' or type(value['version']) is not int or value['version']!=1:
        raise ValueError('Unsupported grounds proposal')
    if value['source_set']!=material['id']:raise ValueError('Proposal belongs to another source selection')
    text(value['attribution'],240)
    sources={s['id'] for s in material['sources']}
    def refs(ids):
        if not isinstance(ids,list) or not ids or any(not isinstance(i,str) for i in ids) or len(set(ids))!=len(ids) or not set(ids)<=sources:
            raise ValueError('Use distinct selected source IDs for every claim and ground')
    claims=value['claims'];grounds=value['grounds']
    if not isinstance(claims,list) or not 1<=len(claims)<=32 or not isinstance(grounds,list) or not 1<=len(grounds)<=32:
        raise ValueError('Use one to 32 claims and grounds')
    ids=set()
    for c in claims:
        exact_keys(c,{'id','title','text','sources'},'proposed claim')
        text(c['id'],80);text(c['title'],240)
        if not isinstance(c['text'],str) or not c['text'].strip() or len(c['text'].encode())>8192 or '\x00' in c['text']:
            raise ValueError('Claim text must be nonempty and at most 8 KiB')
        refs(c['sources'])
        if c['id'] in ids:raise ValueError('Duplicate proposed claim')
        ids.add(c['id'])
    if not isinstance(value['goal'],str) or value['goal'] not in ids:raise ValueError('Choose a proposed claim as goal')
    seen=set()
    for g in grounds:
        exact_keys(g,{'id','reason','premises','conclusion','sources','scope','rationale'},'proposed ground')
        for key in ('id','reason'):text(g[key],80)
        for key in ('scope','rationale'):text(g[key],2048)
        refs(g['sources'])
        if g['id'] in seen:raise ValueError('Duplicate proposed ground')
        seen.add(g['id'])
        if not isinstance(g['premises'],list) or len(g['premises'])>8 or any(not isinstance(i,str) or i not in ids for i in g['premises']) or not isinstance(g['conclusion'],str) or g['conclusion'] not in ids:
            raise ValueError('Ground refers to an unknown claim or too many premises')
    return value


def validate(item, project):
    exact_keys(item,KEYS,'source preparation')
    if item['schema']!='mrw.route-material' or type(item['version']) is not int or item['version']!=1:
        raise ValueError('Unsupported source preparation')
    identifier(item['id'])
    if item['project_root']!=project:raise ValueError('Source preparation belongs to another workspace')
    validate_sources(item['sources']);origin(item['origin'])
    if item['parent'] is not None and (not isinstance(item['parent'],str) or not HEX.fullmatch(item['parent'])):
        raise ValueError('Invalid earlier preparation revision')
    if item['proposal'] is None:
        if item['review'] is not None:raise ValueError('Review lacks a supplied proposal')
    else:
        if not isinstance(item['proposal'],str) or len(item['proposal'].encode())>256*1024:raise ValueError('Proposal exceeds 256 KiB')
        supplied=strict_json(item['proposal'].encode());bounded_tree(supplied);proposal(supplied,item);proposal(item['review'],item)
        # Editing may change summaries and titles, but never the supplied account.
        if item['review']['attribution']!=supplied['attribution']:raise ValueError('Supplied attribution changed')
        restored=deepcopy(item['review'])
        for c,original in zip(restored['claims'],supplied['claims']):
            c.update(title=original['title'],text=original['text'])
        if restored!=supplied:raise ValueError('Only claim titles and summaries may be corrected in this review')
    return item


def records(store, project):
    for p in entries(base(store)/'preparations'):
        raw=read_bounded(p,1024*1024,'source preparation')
        if digest(raw)!=p.stem:raise ValueError('Source preparation bytes changed')
        item=strict_json(raw);bounded_tree(item);validate(item,project)
        yield p.stem,item


def _one(store, project, revision):
    if not isinstance(revision,str) or not HEX.fullmatch(revision):raise ValueError('Invalid preparation revision')
    folder=base(store)/'preparations'
    if folder.is_symlink() or not folder.is_dir():raise ValueError('Invalid source preparation directory')
    path=folder/(revision+'.json')
    raw=read_bounded(path,1024*1024,'source preparation')
    if digest(raw)!=revision:raise ValueError('Source preparation bytes changed')
    item=strict_json(raw);bounded_tree(item)
    return validate(item,project)


def _binding(item):
    return digest(encode({k:item[k] for k in ('id','sources','origin')}))


def read(store, project, revision):
    # Only the selected lineage is read; unrelated source bodies are not pooled.
    item=_one(store,project,revision);binding=_binding(item);seen={revision};current=item
    while current['parent']:
        key=current['parent']
        if key in seen or len(seen)>=32:raise ValueError('Invalid or overlong source preparation lineage')
        seen.add(key);current=_one(store,project,key)
        if _binding(current)!=binding:raise ValueError('A preparation changed its selected sources or Return location')
    return dict(material=item,material_revision=revision)


def listing(store, project):
    from .route_pending import intents
    # Keep bounded metadata only, not every selected document body.
    index={}
    for revision,item in records(store,project):
        title=next(c['title'] for c in item['review']['claims'] if c['id']==item['review']['goal']) if item['review'] else item['sources'][0]['title']
        index[revision]=dict(parent=item['parent'],binding=_binding(item),title=title,proposed=bool(item['proposal']))
    parents={item['parent'] for item in index.values()}
    accepted={item.get('material') for _,item in intents(store,project)}
    for revision,item in index.items():
        key=revision;seen=set()
        while key:
            if key in seen or len(seen)>=32 or key not in index:raise ValueError('Invalid or overlong source preparation lineage')
            seen.add(key);current=index[key]
            if current['binding']!=item['binding']:raise ValueError('A preparation changed its selected sources or Return location')
            key=current['parent']
        if revision not in parents and revision not in accepted:
            yield dict(material_revision=revision,title=item['title'],proposed=item['proposed'])


def save(store, project, item):
    validate(item,project);raw=encode(item)
    if len(raw)>1024*1024:raise ValueError('Source preparation exceeds 1 MiB')
    folder=base(store)
    with publication_guard(folder/'preparations/material.json'):
        private_directory(folder)
        with file_lock(folder,folder.parent/'route-locks'):
            if item['parent']:
                lineage=item['parent'];depth=0
                known={key:value['parent'] for key,value in records(folder,project)}
                while lineage:
                    depth+=1
                    if depth>=32 or lineage not in known:raise ValueError('Preparation lineage limit; existing work is preserved')
                    lineage=known[lineage]
                parent=read(folder,project,item['parent'])['material']
                if any(parent[k]!=item[k] for k in ('id','sources','origin')):raise ValueError('Selected sources or Return location changed')
            revision=digest(raw)
            if any(key==revision for key,_ in records(folder,project)):
                sync_directory(folder/'preparations');return dict(material=item,material_revision=revision)
            if sum(1 for _ in records(folder,project))>=128:raise ValueError('Preparation record limit; existing work is preserved')
            if storage_size(folder)+len(raw)>MAX_BYTES:raise ValueError('Justification storage limit; existing work is preserved')
            private_directory(folder/'preparations')
            persist_private_new(folder/'preparations'/(revision+'.json'),raw,error_type=ValueError)
            return dict(material=item,material_revision=revision)


def compile_request(item, selected, request_id, at):
    """Bind the reviewed text to atoms; construct only explicitly proposed arrows."""
    review=item['review']
    if review is None:raise ValueError('Import a proposal before admitting grounds')
    proposal(review,item)
    if not isinstance(selected,list) or not selected or any(not isinstance(i,str) for i in selected) or len(set(selected))!=len(selected) or not set(selected)<={g['id'] for g in review['grounds']}:
        raise ValueError('Explicitly select distinct grounds to admit')
    refs=lambda ids:[dict(kind='SourcePassage',id=i,revision=next(s['sha256'] for s in item['sources'] if s['id']==i)) for i in ids]
    claims=[dict(id=c['id'],display_name=c['title'],assertion=c['text'],description='Reviewed summary of selected source text.',
        content_hash=dict(algorithm='sha256',value=digest(c['text'].encode())),representation_refs=refs(c['sources'])) for c in review['claims']]
    atoms={c['id']:['atom',dict(id=c['id'],content_hash=c['content_hash'])] for c in claims}
    actor=dict(kind='person',id='local-reader');admissions=[]
    for g in review['grounds']:
        if g['id'] not in selected:continue
        formula=atoms[g['conclusion']]
        for premise in reversed(g['premises']):formula=['implication',atoms[premise],formula]
        admissions.append(dict(id=g['id'],formula=['reason',['variable',g['reason']],formula],admitted_by=actor,at=at,
            basis_refs=refs(g['sources']),rationale=g['rationale'],scope=g['scope'],supersedes=None))
    profile=dict(id='mrw-j0-routes-v1',system='J0',syntax_version='justification-syntax-v1',rule_version='j0-hilbert-v1',
        checker='MRW.Justification.checkCertificate',checker_version='justification-checker-v1',constant_specification=None)
    active=[a['id'] for a in admissions]
    return parse_request(encode(dict(schema='mrw.route-request',version=1,id=request_id,profile=profile,
        context=dict(id=request_id,profile=profile['id'],admissions=active,predecessor=None,added=active,removed=[],
            change_kind='initial',created_at=at,created_by=actor,rationale='Reader admitted selected proposed grounds for conditional composition.'),
        claims=claims,sources=item['sources'],admissions=admissions,goal=atoms[review['goal']],limits=LIMITS.copy(),withdrawal=None)))


def bind_intent(store, project, revision, request, location):
    item=read(store,project,revision)['material']
    if location!=item['origin']:raise ValueError('Admission changed the captured Return location')
    expected=compile_request(item,request['context']['admissions'],request['id'],request['context']['created_at'])
    if request!=expected:raise ValueError('Admission differs from its reviewed source proposal')


def action(store, project, request):
    method=request['method']
    if method=='route_material_list':return dict(materials=list(listing(store,project)))
    if method=='route_material_read':return read(store,project,request['revision'])
    if method=='route_material_create':
        return save(store,project,dict(schema='mrw.route-material',version=1,id=str(uuid4()),parent=None,project_root=project,
            sources=request['sources'],origin=request['origin'],proposal=None,review=None))
    prior=read(store,project,request['revision']);item=deepcopy(prior['material']);item['parent']=request['revision']
    if method=='route_material_import':
        supplied=request['proposal']
        if not isinstance(supplied,str) or len(supplied.encode())>256*1024:raise ValueError('Proposal exceeds 256 KiB')
        value=strict_json(supplied.encode());bounded_tree(value);proposal(value,item)
        item.update(proposal=supplied,review=value)
        return save(store,project,item)
    if method=='route_material_edit':
        review=item['review']
        if review is None:raise ValueError('No claim summary to edit')
        claim=next((c for c in review['claims'] if c['id']==request['claim']),None)
        if claim is None or request['field'] not in ('title','text'):raise ValueError('Choose an existing claim summary')
        claim[request['field']]=request['value'];proposal(review,item)
        return save(store,project,item)
    if method=='route_material_accept':
        from .route_pending import stage
        accepted=compile_request(prior['material'],request['selected'],str(uuid4()),utc_now())
        from .route_pending import intents
        for revision,intent in intents(store,project):
            if intent.get('material')==request['revision'] and intent['request']['context']['admissions']==accepted['context']['admissions']:
                sync_directory(base(store)/'pending')
                return dict(request=intent['request'],intent=revision,origin=intent['origin'],material=request['revision'])
        staged=stage(store,project,accepted,item['origin'],material=request['revision'])
        return dict(request=accepted,**staged)
    raise ValueError('Unsupported source preparation action')
