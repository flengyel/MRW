"""Request-local location adapters. Never change immutable record bytes."""
from contextvars import ContextVar
from pathlib import Path

CURRENT = ContextVar('mrw_artifact_context', default=None)
COORDINATED = ContextVar('mrw_artifact_coordination', default=False)


def read_location(path):
    context = CURRENT.get()
    return context.read_location(Path(path)) if context else Path(path)


def lock_location(root):
    context = CURRENT.get()
    return context.runtime / 'publication-locks' if context else root


def reference_scopes(store):
    context = CURRENT.get()
    if context and context.identity:
        project = context.project(str(store.root))
        from hashlib import sha256
        current = sha256(('mrw-store-v1\0' + context.identity['id'] + '\0' + project['id']).encode()).hexdigest()
        return current, {current, *project['reference_scopes']}
    from hashlib import sha256
    current = sha256((str(store.root) + '\0' + str(store.base)).encode('utf-8')).hexdigest()
    return current, {current}


def stable_paths(value):
    context = CURRENT.get()
    if context is None or context.payload is None:
        return value
    if isinstance(value, dict):
        # Translate explicit operational locators, never source provenance or
        # human prose merely because it happens to begin with a directory name.
        return {k: (v if k == 'outline' else stable_paths(v)
                    if isinstance(v, (dict, list)) or k in ('path', 'store') else v)
                for k, v in value.items()}
    if isinstance(value, list):
        return [stable_paths(v) if isinstance(v, (dict, list)) else v for v in value]
    if isinstance(value, str) and value.startswith(str(context.payload) + '/'):
        return str(Path(context.identity['original_home']) / Path(value).relative_to(context.payload))
    return value


from contextlib import contextmanager
import re


def legacy_home(path):
    for ancestor in (Path(path), *Path(path).parents):
        if re.fullmatch(r'(?:outlines|investigation)-[a-f0-9]{64}', ancestor.name):
            return ancestor.parent
        if ancestor.name == 'model-calls' and (ancestor.parent/'artifact-runtime').is_dir():
            return ancestor.parent
    return None


@contextmanager
def publication_guard(path):
    """Independent updated Python callers share the extension's writer exclusion.

    Pre-0.7 executables cannot acquire a lock added in this release; close their
    windows before moving. This is not protection against arbitrary same-user
    filesystem writes or writers on other computers.
    """
    if CURRENT.get() is not None or COORDINATED.get():
        yield
        return
    # A synchronized store must only be written through its verified binding.
    for parent in Path(path).parents:
        marker=parent/'store.json'
        if marker.is_file():
            import json
            from .local_files import read_bounded
            try: value=json.loads(read_bounded(marker,32*1024*1024,'artifact store marker'))
            except (OSError, ValueError): continue
            if isinstance(value,dict) and value.get('schema')=='mrw-artifact-store':
                raise ValueError('Open this artifact directory through MRW before modifying its saved records')
    home = legacy_home(path)
    if home is not None:
        from .mutable_files import file_lock
        runtime = home/'artifact-runtime'
        with file_lock(runtime/'workspace-store', runtime/'coordination'):
            if (runtime/'active-store.json').exists() or (runtime/'transaction.json').exists():
                raise ValueError('Saved artifact location moved or is moving; use the current MRW artifact binding, not this retired locator')
            yield
        return
    yield
