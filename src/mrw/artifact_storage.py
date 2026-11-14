"""Explicit workspace artifact relocation. The host-local binding is authority.

Managed stores publish complete copy-on-write generations. HEAD lists every
required byte, so a receiving host never opens a half-synchronized generation.
This is local coordination, not a distributed lock or synchronization service.
"""
from contextlib import contextmanager
from copy import deepcopy
from hashlib import sha256
import os
from pathlib import Path
import re
import stat
import tempfile
from uuid import uuid4

from .artifact_context import CURRENT, COORDINATED, stable_paths
from .local_files import read_bounded
from .mutable_files import file_lock, save_mutable, sync_directory
from .private_persistence import persist_private_new
from .source_outlines import directory, encoded, identity as check_uuid, validate_state
from .workspace import strict_json

LIMIT = 512 * 1024 * 1024
MAX_FILES = 20000
JSON_LIMIT = 32 * 1024 * 1024
FAMILY = re.compile(r'(outlines|investigation)-[a-f0-9]{64}')
HEX = re.compile(r'[a-f0-9]{64}')
WRITE = {'outline_continue_note', 'outline_source_import', 'outline_create', 'outline_import_note', 'outline_mutate', 'outline_attach', 'outline_update_note', 'outline_stacks_import', 'outline_kerodon_import', 'outline_render_diagram',
         'update_investigation', 'end_investigation', 'resume_investigation', 'send_assistance'}


def canonical(value):
    p = Path(value)
    if not p.is_absolute() or p.resolve() != p or '\0' in str(p):
        raise ValueError('Use an absolute directory without symlinks or redirected path components')
    return p


def digest(raw):
    return sha256(raw).hexdigest()


def read_json(path):
    return strict_json(read_bounded(path, JSON_LIMIT, 'MRW storage metadata'))


def regular(path):
    canonical(str(path))
    st = path.lstat()
    if not stat.S_ISREG(st.st_mode) or st.st_nlink != 1:
        raise ValueError('Artifact payloads must be regular non-symlink files without external hard links: ' + str(path))
    return st


def inventory(root, *, legacy=False):
    """Exact bytes and deletion identities; never include enclosing VS Code data."""
    rows = {}
    if not root.exists():
        return rows
    canonical(str(root))
    def visit(folder, prefix=''):
        for p in sorted(folder.iterdir()):
            name = prefix + p.name
            if legacy and not prefix and not (FAMILY.fullmatch(p.name) or p.name == 'model-calls'):
                continue
            if 'sync-conflict' in p.name.lower():
                raise ValueError('Conflicting synchronized artifact copy: ' + str(p))
            if p.is_symlink():
                raise ValueError('Redirected artifact path: ' + str(p))
            if p.is_dir():
                if legacy and p.name == 'locks':
                    continue
                visit(p, name + '/')
            else:
                if legacy:
                    parts=name.split('/')
                    owned=(len(parts)==2 and parts[0]=='model-calls' and parts[1].endswith('.json'))
                    owned=owned or (len(parts)==2 and parts[0].startswith('investigation-') and parts[1]=='active.json')
                    owned=owned or (len(parts)==3 and parts[0].startswith('outlines-') and re.fullmatch(r'[a-f0-9-]{36}',parts[1]) and (parts[2] in ('outline.json','obsidian-links.json','diagram-renders.json') or re.fullmatch(r'(?:source|artifact)-[a-f0-9]{64}\.bin',parts[2])))
                    if not owned: continue
                st = regular(p)
                raw = read_bounded(p, LIMIT, 'artifact payload')
                rows[name] = dict(sha256=digest(raw), size=len(raw), device=st.st_dev, inode=st.st_ino)
                if len(rows) > MAX_FILES or sum(v['size'] for v in rows.values()) > LIMIT:
                    raise ValueError('Artifact store exceeds the 20,000-file / 512 MiB relocation limit')
    visit(root)
    return rows


def content_manifest(rows):
    return {name: {k: row[k] for k in ('sha256', 'size')} for name, row in rows.items()}


def verify(root, files, *, deletion_identity=False, private=False):
    for name, item in files.items():
        p = relative_file(root, name)
        st = regular(p)
        if private and stat.S_IMODE(st.st_mode) != 0o600:
            raise ValueError('Private artifact mode 0600 is not preserved: '+str(p))
        raw = read_bounded(p, LIMIT, 'required artifact')
        if len(raw) != item['size'] or digest(raw) != item['sha256']:
            raise ValueError('Incomplete synchronization or changed artifact: ' + str(p))
        if deletion_identity and (st.st_dev, st.st_ino) != (item['device'], item['inode']):
            raise ValueError('Artifact identity changed during move: ' + str(p))


def relative_file(root, name):
    if (not isinstance(name, str) or not name or '\\' in name or ':' in name
            or any(x in ('', '.', '..') for x in name.split('/'))):
        raise ValueError('Invalid artifact manifest path')
    return canonical(str(root / name))


def filesystem(path):
    """Read the actual Linux mount, not just Python's operating-system name."""
    try:
        lines=Path('/proc/self/mountinfo').read_text().splitlines()
    except OSError as exc:
        raise ValueError('Cannot identify the artifact filesystem through Linux mount information') from exc
    matches=[]
    for line in lines:
        left,right=line.split(' - ',1);fields=left.split();kind=right.split()[0]
        mount=re.sub(r'\\([0-7]{3})',lambda m:chr(int(m[1],8)),fields[4])
        if path.is_relative_to(Path(mount)):
            matches.append((len(Path(mount).parts),dict(type=kind,mount=mount)))
    if not matches: raise ValueError('Cannot identify the selected artifact mount')
    return max(matches,key=lambda x:x[0])[1]


def probe(parent):
    """Test the actual destination mount, retaining all existing permission checks."""
    parent = canonical(str(parent))
    mounted=filesystem(parent)
    if mounted['type'] in ('tmpfs','ramfs'):
        raise ValueError('Volatile '+mounted['type']+' storage cannot retain saved artifacts across a host restart; choose a persistent filesystem')
    if not parent.is_dir():
        raise ValueError('Choose a destination whose parent directory already exists')
    with tempfile.TemporaryDirectory(prefix='.mrw-filesystem-check-', dir=parent) as name:
        p = Path(name)
        if stat.S_IMODE(p.stat().st_mode) != 0o700:
            raise ValueError('Unsupported destination filesystem: private directories requested as 0700 are reported as '
                             + oct(stat.S_IMODE(p.stat().st_mode)) + '. On WSL/DrvFS without working Unix permission metadata, '
                             'MRW cannot preserve its private-record permission requirements. No move committed.')
        f = p / 'record'
        persist_private_new(f, b'exact MRW filesystem probe\r\n\xce\xb1')
        if stat.S_IMODE(f.stat().st_mode) != 0o600:
            raise ValueError('Unsupported destination filesystem: mode 0600 is not preserved')
        save_mutable(f, b'replaced', previous=f.read_bytes(), lock_root=p/'locks')
        if f.read_bytes() != b'replaced':
            raise ValueError('Destination replacement did not retain exact bytes')
        sync_directory(p)
        return dict(filesystem=mounted,device=p.stat().st_dev, private_modes=True, file_sync=True,
                    directory_sync=True, immutable_link=True, atomic_replace=True)


def safe_cleanup(root, rows):
    """Repeatable, exact-inode/bytes deletion. Preserve changed/unrelated files."""
    pending = []
    for name, item in sorted(rows.items(), reverse=True):
        p = relative_file(root, name)
        if not p.exists():
            parent=p.parent
            while not parent.exists() and parent != root: parent=parent.parent
            try: sync_directory(parent)
            except OSError as exc: pending.append(str(exc))
            continue
        try:
            verify(root, {name: item}, deletion_identity=True)
            p.unlink()
            sync_directory(p.parent)
        except (OSError, ValueError) as exc:
            pending.append(str(exc))
    # Only empty descendants containing inventoried files; never the VS Code home.
    parents = {relative_file(root, n).parent for n in rows}
    for p in sorted(parents, key=lambda x: len(x.parts), reverse=True):
        while p != root and p.is_relative_to(root):
            try:
                p.rmdir(); sync_directory(p.parent)
            except OSError:
                break
            p = p.parent
    return pending


class StoreAccess:
    def __init__(self, manager, identity, payload, aliases=None):
        self.manager, self.identity, self.payload = manager, identity, payload
        self.runtime = manager.runtime
        self.aliases = aliases or {}

    def project(self, root):
        for p in self.identity['projects']:
            if p['root'] == root:
                return p
        raise ValueError('Project is not part of this verified artifact store')

    def read_location(self, path):
        if self.payload is None:
            return path
        key = str(path)
        if key in self.aliases:
            return relative_file(self.payload, self.aliases[key])
        original = Path(self.identity['original_home'])
        if path.is_relative_to(original):
            rel = path.relative_to(original)
            if rel.parts and (FAMILY.fullmatch(rel.parts[0]) or rel.parts[0] == 'model-calls'):
                return self.payload / rel
        return path


class ArtifactStorage:
    def __init__(self, home, *, checkpoint=None):
        self.home = canonical(home)
        self.runtime = self.home / 'artifact-runtime'
        self.binding_path = self.runtime / 'active-store.json'
        self.journal = self.runtime / 'transaction.json'
        user=next((p for p in self.home.parents if p.name=='User'),None)
        self.coordination=(user/'globalStorage'/'flengyel.mrw'/'artifact-coordination' if user else self.home.parent/'artifact-coordination')
        self.held_store=None
        self.checkpoint = checkpoint or (lambda phase: None)

    @contextmanager
    def store_exclusion(self, identifier):
        check_uuid(identifier)
        if self.held_store==identifier:
            yield
            return
        directory(self.coordination)
        with file_lock(self.coordination/identifier,self.coordination/'locks'):
            previous=self.held_store;self.held_store=identifier
            try: yield
            finally: self.held_store=previous

    @contextmanager
    def exclusive(self):
        directory(self.runtime)
        with file_lock(self.runtime/'workspace-store', self.runtime/'coordination'):
            token=COORDINATED.set(True)
            try:
                binding,_=self.binding()
                if binding:
                    with self.store_exclusion(binding['store_id']): yield
                else: yield
            finally: COORDINATED.reset(token)

    def binding(self):
        try:
            raw = read_bounded(self.binding_path, JSON_LIMIT, 'active artifact location')
        except FileNotFoundError:
            return None, None
        b = strict_json(raw)
        if set(b) != {'version', 'location', 'store_id', 'identity_hash', 'projects', 'epoch'} or b['version'] != 1:
            raise ValueError('Invalid host-local artifact binding; use Recover Artifact Move')
        canonical(b['location']); check_uuid(b['store_id']); check_uuid(b['epoch'])
        if not HEX.fullmatch(b['identity_hash']) or not isinstance(b['projects'], dict):
            raise ValueError('Invalid bound store identity')
        return b, raw

    def status(self):
        b, raw = self.binding()
        return dict(location=b['location'] if b else str(self.home), epoch=digest(raw) if raw else 'legacy',
                    store_id=b['store_id'] if b else None, recovery_required=self.journal.exists(),
                    scope='All MRW saved artifacts in this VS Code workspace; other workspaces are unchanged',
                    projects=b['projects'] if b else {})

    def load(self, location, *, expected=None):
        try:
            return self._load(location,expected=expected)
        except FileNotFoundError as exc:
            raise ValueError('Artifact store unavailable: incomplete synchronization or missing required material. '
                             'Finish synchronization or restore a complete consistent copy before opening it. '
                             'Missing file: '+str(exc.filename)) from exc

    def _load(self, location, *, expected=None):
        location = canonical(str(location))
        if not location.is_dir():
            raise ValueError('Artifact directory unavailable. Restore its mount or use Recover Artifact Move; no empty store was created')
        if stat.S_IMODE(location.stat().st_mode) != 0o700:
            raise ValueError('Artifact directory must preserve private mode 0700')
        raw = read_bounded(location/'store.json', JSON_LIMIT, 'persistent store identity')
        ident = strict_json(raw)
        if set(ident) != {'schema', 'version', 'id', 'original_home', 'projects'} or ident['schema'] != 'mrw-artifact-store' or ident['version'] != 2:
            raise ValueError('Unsupported artifact store identity')
        check_uuid(ident['id']); canonical(ident['original_home'])
        if not isinstance(ident['projects'], list) or not ident['projects']:
            raise ValueError('Store contains no identified projects')
        roots, ids = set(), set()
        for project in ident['projects']:
            if set(project) != {'id', 'root', 'reference_scopes'}:
                raise ValueError('Invalid project identity mapping')
            check_uuid(project['id']); canonical(project['root'])
            scopes = project['reference_scopes']
            valid_scopes = (isinstance(scopes, list) and 1 <= len(scopes) <= 32
                            and all(isinstance(x, str) and HEX.fullmatch(x) for x in scopes)
                            and len(scopes) == len(set(scopes)))
            if project['root'] in roots or project['id'] in ids or not valid_scopes:
                raise ValueError('Invalid MRW citation scope mapping')
            roots.add(project['root']); ids.add(project['id'])
        if expected and (ident['id'] != expected['store_id'] or digest(raw) != expected['identity_hash']):
            raise ValueError('Artifact store identity differs from the locally bound store; path spelling is not identity')
        for metadata in ('store.json','HEAD.json'):
            if stat.S_IMODE(regular(location/metadata).st_mode) != 0o600:
                raise ValueError('Private artifact metadata mode 0600 is not preserved')
        head_raw = read_bounded(location/'HEAD.json', JSON_LIMIT, 'complete artifact manifest')
        head = strict_json(head_raw)
        if set(head) != {'version', 'store_id', 'generation', 'files', 'aliases'} or head['version'] != 1 or head['store_id'] != ident['id']:
            raise ValueError('Incomplete or incompatible artifact manifest')
        check_uuid(head['generation'])
        if not isinstance(head['files'], dict) or len(head['files']) > MAX_FILES or not isinstance(head['aliases'], dict):
            raise ValueError('Invalid complete artifact manifest')
        for n, row in head['files'].items():
            if not isinstance(row, dict) or set(row) != {'sha256', 'size'} or not HEX.fullmatch(row['sha256']) or type(row['size']) is not int or row['size'] < 0:
                raise ValueError('Invalid artifact content hash or size')
        if sum(row['size'] for row in head['files'].values()) > LIMIT:
            raise ValueError('Artifact generation exceeds its size limit')
        payload = relative_file(location, 'versions/'+head['generation']+'/payload')
        found = inventory(location)
        allowed = {'store.json', 'HEAD.json'}
        for name in found:
            if name not in allowed and not re.fullmatch(r'versions/[a-f0-9-]{36}/payload/.+', name):
                raise ValueError('Unrecognized or conflicting file in synchronized store: '+name)
        verify(payload, head['files'],private=True)
        if content_manifest(inventory(payload)) != head['files']:
            raise ValueError('Incomplete synchronization or unexpected files in the active generation')
        for original, name in head['aliases'].items():
            canonical(original)
            if name not in head['files']:
                raise ValueError('Missing required dependent record')
        access = StoreAccess(self, ident, payload, head['aliases'])
        token = CURRENT.set(access)
        try:
            self.validate_payload(payload, ident)
        finally:
            CURRENT.reset(token)
        return ident, head, head_raw, payload

    def validate_payload(self, payload, ident, *, allow_pending=True):
        """Validate required retained bytes and existing investigation identities."""
        from .source_outlines import OutlineStore
        from .outline_notes import note_action
        from .editor_investigation import InvestigationStore, checked_parent, as_state
        from .investigation_actions import restore_investigation
        from .model_projection import parse_terminal_model_call
        calls=payload/'model-calls'
        if calls.exists():
            for record in calls.iterdir():
                parse_terminal_model_call(read_bounded(record,4*1024*1024,'saved ModelCall'))
        for p in ident['projects']:
            root = p['root']; key = digest(root.encode())
            base = payload / ('outlines-'+key)
            if base.exists():
                for folder in base.iterdir():
                    if folder.name == 'locks': continue
                    check_uuid(folder.name)
                    if not (folder/'outline.json').exists():
                        raise ValueError('Incomplete saved outline: '+str(folder))
                    store = OutlineStore(str(base), root, folder.name)
                    store.check_spans(store.state)
                    for artifact in store.state['artifacts']: store.artifact(artifact)
                    note_action(dict(method='outline_notes',store=str(base),project_root=root,id=folder.name))
                    from .reader_diagrams import validate_retained
                    validate_retained(store)
            inv = InvestigationStore(str(payload/('investigation-'+key)), root)
            if inv.active:
                checked_parent(inv.active)
                if inv.active['phase'] != 'terminal':
                    if allow_pending: continue
                    raise ValueError('An unresolved child transmission blocks moving/opening this store; reconcile or end it explicitly first')
                restored = restore_investigation(as_state(inv.active))
                if restored.error:
                    raise ValueError('Required investigation record unavailable: '+restored.error)

    def legacy_identity(self, roots):
        projects = {}
        for p in roots:
            projects[str(canonical(p))] = True
        if self.home.exists():
            for folder in self.home.iterdir():
                if not FAMILY.fullmatch(folder.name): continue
                paths = folder.glob('*/outline.json') if folder.name.startswith('outlines-') else [folder/'active.json']
                for path in paths:
                    if path.exists(): projects[read_json(path)['project_root']] = True
        return dict(schema='mrw-artifact-store',version=2,id=str(uuid4()),original_home=str(self.home),
                    projects=[dict(id=str(uuid4()),root=root,
                        reference_scopes=[digest((root+'\0'+str(self.home/('outlines-'+digest(root.encode())))).encode())]) for root in sorted(projects)])

    def dependent_manifest(self, payload, ident, aliases):
        access=StoreAccess(self,ident,payload,aliases)
        result={}
        for project in ident['projects']:
            state=payload/('investigation-'+digest(project['root'].encode()))/'active.json'
            if not state.exists(): continue
            active=read_json(state)['active']
            if not active: continue
            if active['phase']!='terminal': raise ValueError('Unresolved investigation transmission; reconcile or end it before moving')
            for side,revision in [('parent','revision'),('child','record_revision')]:
                saved=active[side];original=canonical(saved['path']);actual=access.read_location(original)
                if actual.is_relative_to(payload): continue
                st=regular(actual);raw=read_bounded(actual,4*1024*1024,'required dependent record')
                if digest(raw)!=saved[revision]: raise ValueError('Required dependent record changed or is unavailable')
                result[str(actual)]=dict(sha256=digest(raw),size=len(raw),device=st.st_dev,inode=st.st_ino)
        return result

    def source(self, roots):
        b, raw = self.binding()
        if b:
            ident, head, _, payload = self.load(b['location'], expected=b)
            return b, raw, ident, head['aliases'], payload, inventory(Path(b['location'])), self.dependent_manifest(payload,ident,head['aliases'])
        ident = self.legacy_identity(roots)
        return None, None, ident, {}, self.home, inventory(self.home, legacy=True), self.dependent_manifest(self.home,ident,{})

    def destination(self, destination, source):
        dest = canonical(destination)
        if dest == source or dest.is_relative_to(source) or source.is_relative_to(dest):
            raise ValueError('Choose a separate directory; self, ancestor and descendant moves are rejected')
        if dest == self.home or dest.is_relative_to(self.home) or self.home.is_relative_to(dest):
            raise ValueError('Destination must be separate from VS Code host-local storage')
        if dest.exists():
            raise ValueError('Move requires a new directory. To use an existing synchronized store, choose Open Existing Artifact Directory; stores are never merged')
        probe(dest.parent)
        return dest

    def plan(self, destination, roots):
        if self.journal.exists(): raise ValueError('Recover the previous artifact operation before moving')
        b, raw, ident, aliases, payload, rows, dependencies = self.source(roots)
        source = Path(b['location']) if b else self.home
        host_capabilities=probe(self.home)
        source_capabilities=host_capabilities if source==self.home else probe(source)
        dest = self.destination(destination, source)
        return {**self.status(), 'destination':str(dest), 'files':len(rows), 'bytes':sum(x['size'] for x in rows.values()),
                'source_manifest':digest(encoded(dict(files=rows,dependencies=dependencies))), 'projects':[p['root'] for p in ident['projects']],
                'source_filesystem':source_capabilities['filesystem'],'host_filesystem':host_capabilities['filesystem'],
                'destination_filesystem':filesystem(dest.parent)}

    def journal_save(self, value, previous=None):
        save_mutable(self.journal, encoded(value), previous=previous, lock_root=self.runtime/'journals')

    def journal_clear(self):
        # Exact byte deletion with the existing durability boundary.
        from .mutable_files import delete_mutable
        raw = read_bounded(self.journal, JSON_LIMIT, 'storage transaction')
        delete_mutable(self.journal, previous=raw,limit=JSON_LIMIT,lock_root=self.runtime/'journals')

    def copy_payload(self, source, destination, files):
        directory(destination)
        for name, row in files.items():
            src = relative_file(source, name); dst = relative_file(destination, name)
            directory(dst.parent)
            raw = read_bounded(src, LIMIT, 'source artifact')
            if digest(raw) != row['sha256'] or len(raw) != row['size']:
                raise ValueError('Source changed during artifact copying')
            persist_private_new(dst, raw)
            self.checkpoint('copy_file')

    def dependencies(self, payload, ident, aliases):
        """Retain external ModelCall dependencies; never delete their originals."""
        aliases = dict(aliases)
        for project in ident['projects']:
            p = payload/('investigation-'+digest(project['root'].encode()))/'active.json'
            if not p.exists(): continue
            active = read_json(p)['active']
            if not active: continue
            sides=[('parent','revision')] + ([('child','record_revision')] if active['phase']=='terminal' else [])
            for side, rev in sides:
                pointer = active[side]; original = canonical(pointer['path'])
                access = CURRENT.get()
                actual = access.read_location(original) if access else original
                if actual.is_relative_to(payload): continue
                raw = read_bounded(original, 4*1024*1024, 'required dependent ModelCall')
                if digest(raw) != pointer[rev]: raise ValueError('Required dependent record changed')
                name = 'dependencies/'+digest(raw)+'.json'
                target = payload/name; directory(target.parent)
                if not target.exists(): persist_private_new(target,raw)
                aliases[str(original)] = name
        return aliases

    def new_binding(self, dest, ident, projects):
        return dict(version=1,location=str(dest),store_id=ident['id'],identity_hash=digest(encoded(ident)),
                    projects=projects,epoch=str(uuid4()))

    def move(self, destination, roots, expected):
        if self.journal.exists(): raise ValueError('Recover the previous artifact operation before moving')
        state=self.source(roots)
        with self.store_exclusion(state[2]['id']):
            return self._move_prepared(destination,expected,state)

    def _move_prepared(self,destination,expected,state):
        b,old_raw,ident,aliases,payload,rows,dependencies=state
        source = Path(b['location']) if b else self.home
        if digest(encoded(dict(files=rows,dependencies=dependencies))) != expected: raise ValueError('Saved work changed since confirmation; review the move again')
        probe(self.home)
        if source!=self.home: probe(source)
        dest = self.destination(destination, source)
        projects = b['projects'] if b else {p['root']:p['root'] for p in ident['projects']}
        candidate = self.new_binding(dest, ident, projects)
        gen = str(uuid4()); stage = dest/'versions'/gen/'payload'
        journal = dict(version=1,operation='move',source=str(source),source_files=rows,dependencies=dependencies,
                       destination=str(dest),binding_before=old_raw.decode() if old_raw else None,
                       binding_after=encoded(candidate).decode(),destination_files=None)
        self.journal_save(journal)
        self.checkpoint('before_copy')
        # Reserve this previously absent destination exclusively. Two stores
        # must never start staging into the same directory after racing their
        # preflight existence checks.
        dest.mkdir(mode=0o700)
        sync_directory(dest.parent)
        directory(stage)
        self.checkpoint('staging_created')
        try:
            files = content_manifest(inventory(payload,legacy=b is None))
            self.copy_payload(payload,stage,files)
            access = StoreAccess(self,ident,stage,aliases)
            token = CURRENT.set(access)
            try:
                aliases = self.dependencies(stage,ident,aliases)
                self.validate_payload(stage,ident)
            finally: CURRENT.reset(token)
            self.checkpoint('verified_destination')
            verify(source,rows,deletion_identity=True)
            if inventory(source,legacy=b is None) != rows: raise ValueError('Source changed during migration; original store remains active')
            for original,row in dependencies.items():
                path=Path(original);verify(path.parent,{path.name:row},deletion_identity=True)
            head = dict(version=1,store_id=ident['id'],generation=gen,files=content_manifest(inventory(stage)),aliases=aliases)
            persist_private_new(dest/'store.json',encoded(ident))
            persist_private_new(dest/'HEAD.json',encoded(head))
            sync_directory(dest/'versions'/gen); sync_directory(dest/'versions'); sync_directory(dest)
            self.load(dest)
            self.checkpoint('destination_published')
            previous=encoded(journal);journal['destination_files']=inventory(dest)
            self.journal_save(journal,previous)
            self.checkpoint('before_binding')
            verify(source,rows,deletion_identity=True)
            if inventory(source,legacy=b is None) != rows: raise ValueError('Source changed before the authority switch')
            for original,row in dependencies.items():
                path=Path(original);verify(path.parent,{path.name:row},deletion_identity=True)
            canonical(str(self.runtime))
            # Sole authority switch, on the host filesystem, under migration exclusion.
            save_mutable(self.binding_path,encoded(candidate),previous=old_raw,lock_root=self.runtime/'bindings')
            self.checkpoint('binding_replaced')
        except BaseException:
            # Persisted journal + binding settle authority on recovery, never phase flags.
            raise
        return self.finish_move(journal)

    def finish_move(self, journal):
        self.checkpoint('before_cleanup')
        try: pending = safe_cleanup(Path(journal['source']),journal['source_files'])
        except (OSError,ValueError) as exc: pending=[str(exc)]
        self.checkpoint('after_cleanup')
        if pending:
            return dict(**self.status(),committed=True,cleanup_pending=True,
                        message='Move committed; old copies still need cleanup',details=pending)
        self.journal_clear()
        return dict(**self.status(),committed=True,cleanup_pending=False,message='Artifact directory moved; old artifact payloads removed')

    def recover(self):
        if not self.journal.exists(): return self._recover()
        journal=read_json(self.journal);binding,_=self.binding()
        identifier=binding['store_id'] if binding else strict_json(journal['binding_after'].encode())['store_id']
        with self.store_exclusion(identifier): return self._recover()

    def _recover(self):
        if not self.journal.exists(): return dict(**self.status(),message='No artifact operation needs recovery')
        j = read_json(self.journal); b, raw = self.binding()
        if j['operation'] == 'send':
            if not b: raise ValueError('Request recovery binding unavailable; writes remain blocked')
            return self.recover_send(j,b)
        if j['operation'] == 'publish':
            if not b: raise ValueError('Publication binding unavailable; writes remain blocked')
            self.load(b['location'],expected=b)
            head = Path(b['location'])/'HEAD.json'
            observed = read_bounded(head,JSON_LIMIT,'artifact manifest')
            if digest(observed) not in (j['before_hash'],j['after_hash']):
                raise ValueError('Manifest differs from both recorded publication outcomes; writes remain blocked')
            self.sync_file(head); self.journal_clear()
            return dict(**self.status(),message='Complete artifact publication verified and synchronized')
        before = j['binding_before'].encode() if j['binding_before'] is not None else None
        after = j['binding_after'].encode()
        if raw == after:
            self.load(b['location'],expected=b)
            self.sync_file(self.binding_path)
            if j['operation'] == 'adopt':
                self.journal_clear();return dict(**self.status(),message='Existing artifact directory opened')
            return self.finish_move(j)
        if raw != before:
            raise ValueError('Active binding differs from both recorded outcomes; writes remain blocked; no location guessed')
        if raw is not None: self.sync_file(self.binding_path)
        else: sync_directory(self.runtime)
        if j['operation'] == 'move':
            dest=Path(j['destination'])
            if dest.exists():
                owned=j['destination_files']
                if owned is None:
                    self.journal_clear()
                    return dict(**self.status(), committed=False, uncommitted_directory=str(dest),
                                message='Move not committed; original directory remains active. Uncommitted destination retained for inspection: '+str(dest))
                pending=safe_cleanup(dest,owned)
                if pending: raise ValueError('Original remains active; uncommitted copies preserved: '+'; '.join(pending))
                try: dest.rmdir();sync_directory(dest.parent)
                except OSError: pass
        self.journal_clear()
        return dict(**self.status(),message='Original artifact directory remains active; uncommitted move abandoned')

    @staticmethod
    def sync_file(path):
        with path.open('rb') as stream: os.fsync(stream.fileno())
        sync_directory(path.parent)

    def adopt(self, destination, mapping, expected_identity, expected_head):
        with self.store_exclusion(expected_identity):
            return self._adopt(destination,mapping,expected_identity,expected_head)

    def _adopt(self, destination, mapping, expected_identity, expected_head):
        if self.journal.exists(): raise ValueError('Recover the previous operation first')
        b, old_raw = self.binding()
        if b or inventory(self.home,legacy=True):
            raise ValueError('This workspace already has saved artifacts. Move its store separately; existing stores cannot be merged or silently replaced')
        probe(self.home)
        dest = canonical(destination);probe(dest.parent)
        ident,head,head_raw,payload=self.load(dest)
        access=StoreAccess(self,ident,payload,head['aliases'])
        token=CURRENT.set(access)
        try: self.validate_payload(payload,ident,allow_pending=False)
        finally: CURRENT.reset(token)
        if ident['id'] != expected_identity or digest(head_raw) != expected_head: raise ValueError('Store identity or contents changed since confirmation')
        if set(mapping.values()) != {p['root'] for p in ident['projects']} or len(mapping) != len(ident['projects']):
            raise ValueError('Explicitly map every stored project to exactly one local project folder')
        for root in mapping: canonical(root)
        candidate=self.new_binding(dest,ident,mapping)
        self.journal_save(dict(version=1,operation='adopt',binding_before=None,binding_after=encoded(candidate).decode()))
        save_mutable(self.binding_path,encoded(candidate),previous=old_raw,lock_root=self.runtime/'bindings')
        self.journal_clear()
        return dict(**self.status(),message='Verified existing artifact directory opened; no stores merged')

    def publish_generation(self, access):
        access.aliases=self.dependencies(access.payload,access.identity,access.aliases)
        self.validate_payload(access.payload,access.identity)
        candidate=dict(version=1,store_id=access.identity['id'],generation=access.payload.parent.name,
                       files=content_manifest(inventory(access.payload)),aliases=access.aliases)
        raw=encoded(candidate)
        if access.payload==access.parent_payload:
            if raw!=access.head_raw: raise ValueError('Active artifact generation changed without staging; recover before writing')
            return
        if self.journal.exists():
            previous=read_bounded(self.journal,JSON_LIMIT,'storage transaction')
            journal=strict_json(previous)
            if journal['operation']!='send': raise ValueError('Unexpected pending publication; recover it first')
            journal['after_hash']=digest(raw)
            self.journal_save(journal,previous)
        else:
            self.journal_save(dict(version=1,operation='publish',before_hash=digest(access.head_raw),after_hash=digest(raw)))
        save_mutable(Path(self.binding()[0]['location'])/'HEAD.json',raw,previous=access.head_raw,lock_root=self.runtime/'heads')
        self.journal_clear()
        if access.parent_files:
            leftovers=safe_cleanup(access.parent_payload,access.parent_files)
            if not leftovers:
                try:
                    access.parent_payload.rmdir();access.parent_payload.parent.rmdir();sync_directory(access.parent_payload.parent.parent)
                except OSError: pass
        access.head_raw=raw
        access.parent_payload=access.payload
        access.parent_files=inventory(access.payload)

    def before_transmission(self, access, prepared, investigation):
        """Preserve the existing durable pending-reservation / provider cut line."""
        from dataclasses import replace
        from .editor_investigation import InvestigationStore, prepared_fingerprint
        if investigation is not None:
            old_payload=access.payload
            self.publish_generation(access)  # Pending pointer is durable BEFORE transport.
            new_payload=old_payload.parent.parent/str(uuid4())/'payload'
            self.copy_payload(old_payload,new_payload,content_manifest(access.parent_files))
            output=new_payload/prepared.operation.output.relative_to(old_payload)
            directory(output.parent)
            access.payload=new_payload
            prepared=replace(prepared,operation=replace(prepared.operation,output=output))
            investigation=InvestigationStore(str(new_payload/investigation.directory.relative_to(old_payload)),str(investigation.root))
        self.journal_save(dict(version=1,operation='send',store_id=access.identity['id'],
                              before_hash=digest(access.head_raw),after_hash=None,
                              generation=access.payload.parent.name,
                              output=str(prepared.operation.output.relative_to(access.payload)),
                              request_fingerprint=prepared_fingerprint(prepared)))
        return prepared,investigation

    def recover_send(self, journal, binding):
        from .editor_investigation import terminal_fingerprint
        from .model_projection import parse_terminal_model_call
        ident,head,head_raw,payload=self.load(binding['location'],expected=binding)
        if journal['store_id']!=ident['id']: raise ValueError('Pending request belongs to another artifact store')
        observed=digest(head_raw)
        if observed==journal['after_hash']:
            self.sync_file(Path(binding['location'])/'HEAD.json');self.journal_clear()
            return dict(**self.status(),message='Complete retained request outcome verified; no request was retried')
        if observed!=journal['before_hash']:
            raise ValueError('Request recovery manifest differs from both recorded outcomes; writes remain blocked')
        check_uuid(journal['generation'])
        staged=Path(binding['location'])/'versions'/journal['generation']/'payload'
        output=relative_file(staged,journal['output'])
        try: raw=read_bounded(output,4*1024*1024,'interrupted request outcome')
        except FileNotFoundError:
            self.sync_file(Path(binding['location'])/'HEAD.json');self.journal_clear()
            return dict(**self.status(),message='No terminal record was published; saved pending state retained. No request was retried; inspect or end the unresolved investigation explicitly')
        terminal=parse_terminal_model_call(raw)
        if terminal_fingerprint(terminal)!=journal['request_fingerprint']:
            raise ValueError('Request outcome differs from the exact reserved request; preserved without guessing')
        recovered=Path(binding['location'])/'versions'/str(uuid4())/'payload'
        self.copy_payload(payload,recovered,head['files'])
        destination=relative_file(recovered,journal['output']);directory(destination.parent)
        if destination.exists(): raise ValueError('Reserved request outcome collided with existing retained material')
        persist_private_new(destination,raw)
        access=StoreAccess(self,ident,recovered,head['aliases'])
        access.head_raw=head_raw;access.parent_payload=payload;access.parent_files=inventory(payload)
        token=CURRENT.set(access)
        try: self.publish_generation(access)
        finally: CURRENT.reset(token)
        return dict(**self.status(),message='Exact retained request outcome recovered. Resume the saved investigation explicitly; no request was retried')

    def discard_candidate(self, location, payload, identity):
        """Discard only this call's unpublished, unjournaled private generation."""
        try:
            if self.journal.exists() or not payload.exists(): return
            current = strict_json(read_bounded(Path(location)/'HEAD.json', JSON_LIMIT, 'active artifact head'))
            if current['generation'] == payload.parent.name: return
            observed = payload.stat()
            if (observed.st_dev, observed.st_ino) != identity: return
            rows = inventory(payload)
            if safe_cleanup(payload, rows): return
            payload.rmdir(); payload.parent.rmdir(); sync_directory(payload.parent.parent)
        except (OSError, ValueError):
            # An identity change or uncertain cleanup preserves bytes for inspection.
            pass

    def run(self, request, dispatch):
        """Every updated extension writer enters this exclusion and reads binding."""
        if self.journal.exists(): raise ValueError('Artifact operation needs recovery; run MRW: Recover Artifact Move. Writes remain blocked')
        status=self.status(); b,_=self.binding();method=request['method']
        mutating=method in WRITE or method == 'project'
        if mutating and request.pop('artifact_epoch',None) != status['epoch']:
            raise ValueError('Artifact location changed; this stale client cannot write. Refresh Artifact Location and reopen the reader; unsaved text is retained')
        request.pop('artifact_epoch',None)
        if not b:
            access=StoreAccess(self,None,None)
            token=CURRENT.set(access)
            try:
                draft=request.get('draft')
                if draft and method in ('prepare_assistance','send_assistance'):
                    output=canonical(draft['output'])
                    if output.parent != self.home/'model-calls': raise ValueError('Unexpected artifact output directory')
                    directory(output.parent)
                return dispatch(request)
            finally: CURRENT.reset(token)
        ident,head,head_raw,payload=self.load(b['location'],expected=b)
        copying=method in WRITE
        generation=str(uuid4()) if copying else head['generation']
        active_payload=Path(b['location'])/'versions'/generation/'payload'
        old_files=inventory(payload) if copying else None
        candidate_identity = None
        if copying:
            directory(active_payload)
            st = active_payload.stat(); candidate_identity = (st.st_dev, st.st_ino)
        access=StoreAccess(self,ident,active_payload,head['aliases'])
        access.head_raw=head_raw;access.parent_payload=payload;access.parent_files=old_files
        token=CURRENT.set(access)
        preserve_candidate = False
        try:
            if copying: self.copy_payload(payload,active_payload,head['files'])
            req=deepcopy(request)
            def translate(value):
                root=value.get('project_root')
                if root is None:return
                if root not in b['projects']: raise ValueError('Wrong workspace project; explicitly open the synchronized store for this local folder first')
                original=b['projects'][root];value['project_root']=original
                if 'store' in value:
                    family='outlines' if method.startswith('outline_') else 'investigation'
                    expected=self.home/(family+'-'+digest(root.encode()))
                    if Path(value['store']) != expected:
                        raise ValueError('Unexpected or stale private-store locator')
                    value['store']=str(active_payload/(family+'-'+digest(original.encode())))
            translate(req)
            if isinstance(req.get('draft'),dict):
                translate(req['draft'])
                out=canonical(req['draft']['output'])
                if out.parent != self.home/'model-calls': raise ValueError('Unexpected ModelCall output locator')
                req['draft']['output']=str(active_payload/'model-calls'/out.name)
                # Preview/read requests need an existing output parent but write no artifact.
                directory(active_payload/'model-calls')
            result=dispatch(req)
            if method=='send_assistance' and result.get('status')=='not_sent':
                return stable_paths(result)
            if result.get('blocked') or result.get('investigation',{}).get('blocked'):
                preserve_candidate = True
                return result
            if copying:
                self.publish_generation(access)
            return stable_paths(result)
        finally:
            CURRENT.reset(token)
            if copying and not preserve_candidate:
                self.discard_candidate(b['location'], active_payload, candidate_identity)


def storage_action(request):
    fields = {
        'artifact_status': set(), 'artifact_recover': set(),
        'artifact_plan': {'destination','roots'},
        'artifact_move': {'destination','roots','manifest'},
        'artifact_inspect': {'destination'},
        'artifact_adopt': {'destination','mapping','store_id','head_hash'},
        'artifact_match_reference': {'reference','project','local_root'},
    }
    method=request.get('method')
    if method not in fields or set(request) != fields[method] | {'protocol','method','artifact_home'}:
        raise ValueError('Invalid artifact storage command fields')
    manager=ArtifactStorage(request['artifact_home'])
    with manager.exclusive():
        method=request['method']
        if method == 'artifact_status': return manager.status()
        if method == 'artifact_plan': return manager.plan(request['destination'],request['roots'])
        if method == 'artifact_move': return manager.move(request['destination'],request['roots'],request['manifest'])
        if method == 'artifact_recover': return manager.recover()
        if method == 'artifact_inspect':
            ident,head,raw,payload=manager.load(request['destination'])
            return dict(store_id=ident['id'],projects=[p['root'] for p in ident['projects']],files=len(head['files']),head_hash=digest(raw))
        if method == 'artifact_match_reference':
            from .outline_references import parse_reference
            b,_=manager.binding()
            if not b or request['local_root'] not in b['projects']:
                return {'matches':False}
            ident,head,raw,payload=manager.load(b['location'],expected=b)
            # The link's project path is routing from its originating computer.
            # Only this verified local mapping and its exact persistent/legacy
            # scope identify a target; neither identical nor different path
            # spelling can override those identity checks.
            original=b['projects'][request['local_root']]
            project=next(p for p in ident['projects'] if p['root']==original)
            scope=digest(('mrw-store-v1\0'+ident['id']+'\0'+project['id']).encode())
            ref=parse_reference(request['reference'])
            return {'matches':ref['scope'] in {scope,*project['reference_scopes']}}
        if method == 'artifact_adopt': return manager.adopt(request['destination'],request['mapping'],request['store_id'],request['head_hash'])
        raise ValueError('Unknown artifact storage action')
