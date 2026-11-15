"""Test bridge scopes, checked before production dispatch or transport logging."""
import json
import os
from pathlib import Path
import re
import stat

def canonical(value):
    p=Path(value)
    if not p.is_absolute() or str(p)!=value or p.resolve()!=p:
        raise ValueError('MRW test bridge requires canonical fixture paths')
    return p

def load(path):
    st=path.lstat()
    if not stat.S_ISREG(st.st_mode) or st.st_nlink!=1 or st.st_size>32768:
        raise ValueError('Invalid bridge fixture metadata')
    with path.open('rb') as stream:raw=stream.read(32769)
    if len(raw)>32768:raise ValueError('Oversized bridge fixture metadata')
    return json.loads(raw)

def validate(request, artifacts=None):
    location=os.environ.get('MRW_TEST_FIXTURE')
    if not location:raise ValueError('MRW test bridge requires an explicit disposable fixture')
    file=canonical(location);marker=load(file);root=canonical(marker['root']);st=root.stat()
    if (marker.get('schema') not in ('mrw.native-fixture','mrw.bridge-fixture') or marker.get('version')!=1
        or not re.fullmatch(r'[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}',marker.get('id',''))
        or marker.get('device')!=str(st.st_dev) or marker.get('inode')!=str(st.st_ino)
        or file.parent!=root or st.st_uid!=os.getuid() or st.st_mode&0o077):
        raise ValueError('Invalid private bridge fixture identity')
    roots=[root]
    if marker['schema']=='mrw.native-fixture':
        pin=load(root/'native-scope.json')
        if pin['id']!=marker['id']:raise ValueError('Native bridge fixture differs')
        for key in ('storage','global'):
            if not canonical(pin[key]).is_relative_to(root):raise ValueError('Native bridge store leaves its disposable fixture')
    def owned(value):
        p=canonical(value)
        if not any(p.is_relative_to(parent) for parent in roots):
            raise ValueError('MRW test bridge refuses a write outside its disposable fixture')
    if artifacts:owned(str(artifacts))
    # Immutable read inputs may be outside the fixture. Every output/store and
    # project scope must be owned, including fields nested in an unsent draft.
    writes={'store','artifact_home','project_root','output','destination'}
    def visit(value):
        if isinstance(value,dict):
            for k,v in value.items():
                if k in writes and v is not None:owned(v)
                elif k=='roots':
                    for item in v:owned(item)
                elif isinstance(v,(dict,list)):visit(v)
        elif isinstance(value,list):
            for item in value:visit(item)
    visit(request)
    def controls(value,key=''):
        if isinstance(value,dict):
            for k,v in value.items():
                if Path(k).is_absolute():owned(k)
                controls(v,k)
        elif isinstance(value,list):
            for item in value:controls(item,key)
        elif isinstance(value,str):
            if key in ('binding_before','binding_after'):controls(json.loads(value))
            elif key in ('location','destination','output','original_home') or Path(value).is_absolute():owned(value)
    home=request.get('artifact_home')
    if home:
        for name in ('active-store.json','transaction.json'):
            p=Path(home)/'artifact-runtime'/name
            try:controls(load(p))
            except FileNotFoundError:pass
