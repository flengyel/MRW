"""Explicit local build/run of GOLEM XIV's pinned route engine. No downloads."""
from __future__ import annotations
from datetime import datetime, timezone
from hashlib import sha256
from importlib.resources import files
import json
import os
from pathlib import Path
import platform
import shutil
import signal
import subprocess
import tempfile
import threading

from .local_files import read_bounded
from .mutable_files import private_directory, file_lock, sync_directory
from .documentary_warrant import _read_limited, _terminate_checker, _rename_no_replace

REGISTRY = 'route_runtime.json'


def registry():
    return json.loads(files('mrw.data').joinpath(REGISTRY).read_text('utf-8'))


def current_engine():
    known=registry();return known['engines'][known['current']]


def fingerprint(engine):
    raw=json.dumps(engine,sort_keys=True,separators=(',',':')).encode()
    return sha256(raw).hexdigest()


def root(cache):
    base=Path(cache)
    if not base.is_absolute() or base.resolve()!=base: raise ValueError('Use canonical local checker cache storage')
    return base/('route-'+fingerprint(current_engine()))


def file_hash(path,limit=256*1024*1024):
    path=Path(path)
    if path.resolve()!=path or path.is_symlink() or not path.is_file(): raise ValueError('Checker component is unavailable or redirected: '+path.name)
    before=path.stat()
    if before.st_size>limit: raise ValueError('Checker component exceeds size limit')
    h=sha256()
    with path.open('rb') as f:
        while chunk:=f.read(65536):h.update(chunk)
    if tuple(getattr(path.stat(), k) for k in ('st_dev','st_ino','st_size','st_mtime_ns','st_ctime_ns')) != tuple(getattr(before,k) for k in ('st_dev','st_ino','st_size','st_mtime_ns','st_ctime_ns')): raise ValueError('Checker component changed while hashing')
    return h.hexdigest()


def verify(cache):
    engine=current_engine();folder=root(cache)
    if not folder.exists(): raise ValueError('Build the local justification checker first, under Local checker setup; pending work is preserved')
    if platform.system()!='Linux' or platform.machine() not in ('x86_64','AMD64'):
        raise ValueError('The current checked route runtime supports Linux x86-64 / WSL only; retained results remain readable')
    for name,entry in engine['sources'].items():
        if file_hash(folder/name,1024*1024)!=entry['sha256']: raise ValueError('Checker source identity differs: '+name)
    executable=folder/'.lake/routes-build/bin/route_search'
    if file_hash(executable)!=engine['executable_sha256'] or not os.access(executable,os.X_OK):
        raise ValueError('Checker executable differs from the verified build')
    return executable


def process(argv, *, cwd, env, data=None, timeout=30, limit=8*1024*1024):
    child=subprocess.Popen(argv,cwd=cwd,env=env,stdin=subprocess.PIPE if data is not None else subprocess.DEVNULL,
        stdout=subprocess.PIPE,stderr=subprocess.PIPE,shell=False,start_new_session=True,close_fds=True)
    out,err=bytearray(),bytearray();overflow=threading.Event();failed=[]
    readers=[threading.Thread(target=_read_limited,args=(stream,limit,overflow,child,buffer),daemon=True)
             for stream,buffer in ((child.stdout,out),(child.stderr,err))]
    def write():
        try:child.stdin.write(data);child.stdin.close()
        except (BrokenPipeError,OSError) as exc:failed.append(exc)
    for thread in readers:thread.start()
    writer=threading.Thread(target=write,daemon=True) if data is not None else None
    if writer:writer.start()
    previous={}
    if threading.current_thread() is threading.main_thread():
        def interrupted(signum, _frame):
            _terminate_checker(child)
            raise ValueError('Lean action cancelled; inspect saved results before retrying')
        for sig in (signal.SIGTERM, signal.SIGINT):
            previous[sig]=signal.signal(sig,interrupted)
    try:child.wait(timeout=timeout)
    except subprocess.TimeoutExpired as exc:
        _terminate_checker(child);child.wait();raise ValueError("Lean action timed out; no result was published") from exc
    except BaseException:
        _terminate_checker(child);child.wait();raise
    finally:
        for sig,handler in previous.items():signal.signal(sig,handler)
        for thread in readers:thread.join(timeout=5)
        if writer:writer.join(timeout=5)
    if any(t.is_alive() for t in readers) or writer and writer.is_alive(): raise ValueError('Checker pipe did not settle')
    if overflow.is_set(): raise ValueError('Checker output exceeds its byte limit')
    if child.returncode!=0 or failed: raise ValueError('Lean action failed: '+err.decode('utf-8',errors='replace')[:1500])
    return bytes(out),bytes(err)


def _installed_lake(toolchain):
    # Elan and Lake use this encoding for pinned distribution directories.
    # Resolve the local installation without executing a toolchain manager.
    elan_home = os.environ.get('ELAN_HOME')
    home = Path(elan_home).expanduser() if elan_home else Path.home() / '.elan'
    directory = toolchain.replace('/', '--').replace(':', '---')
    version = toolchain.rsplit(':', 1)[-1].removeprefix('v')
    instructions = (
        f'Lean {version} is missing or incomplete on this workspace host. '
        f'Run `elan toolchain install {toolchain}` in its terminal, '
        'then run Build Local Justification Checker again.'
    )
    try:
        install = (home / 'toolchains' / directory).resolve(strict=True)
        bin_dir = install / 'bin'
        binaries = (bin_dir / 'lean', bin_dir / 'lake')
        if not (install / 'lib' / 'lean' / 'Init.olean').is_file():
            raise ValueError(instructions)
        for binary in binaries:
            if binary.resolve(strict=True) != binary or not binary.is_file() or not os.access(binary, os.X_OK):
                raise ValueError(instructions)
    except (OSError, RuntimeError) as error:
        raise ValueError(instructions) from error
    return bin_dir / 'lake'


def setup(assets, cache):
    engine=current_engine();target=root(cache);parent=target.parent
    if platform.system()!='Linux' or platform.machine() not in ('x86_64','AMD64'):
        raise ValueError('Current route-checker setup supports Linux x86-64 / WSL')
    source=Path(assets)
    if source.resolve()!=source: raise ValueError('Checker assets are redirected')
    for name,entry in engine['sources'].items():
        if file_hash(source/name,1024*1024)!=entry['sha256']: raise ValueError('Packaged checker source differs: '+name)
    private_directory(parent)
    with file_lock(target,parent/'locks'):
        if target.exists():verify(cache);return dict(ready=True,path=str(target),built=False)
        lake = _installed_lake(engine['toolchain'])
        temp=Path(tempfile.mkdtemp(prefix='.building-route-',dir=parent))
        try:
            for name in engine['sources']:
                dest=temp/name;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(source/name,dest)
            env = {key: value for key, value in os.environ.items() if key in ('HOME', 'USER', 'TMPDIR')}
            env.update(PATH=str(lake.parent) + ':/usr/bin:/bin', ELAN='', LANG='C.UTF-8',
                       LC_ALL='C.UTF-8', NO_COLOR='1', GIT_TERMINAL_PROMPT='0')
            # The checked runtime manifest has no dependencies. Start the installed Lake directly.
            argv = [str(lake), 'build', 'route_search']
            out,err=process(argv,cwd=temp,env=env,timeout=180,limit=2*1024*1024)
            (temp/'build.log').write_bytes(out+err)
            exe=temp/'.lake/routes-build/bin/route_search'
            if file_hash(exe)!=engine['executable_sha256']: raise ValueError('Built checker differs from the verified runtime identity')
            for p in [*(temp/name for name in engine['sources']),exe,temp/'build.log']:
                with p.open('rb') as f:os.fsync(f.fileno())
            for folder,dirs,_files in os.walk(temp,topdown=False):sync_directory(Path(folder))
            _rename_no_replace(temp,target);sync_directory(parent)
        finally:
            if temp.exists():shutil.rmtree(temp)
        verify(cache)
        return dict(ready=True,path=str(target),built=True)


def check(cache, request):
    from .route_records import encode,validate_output,digest
    exe=verify(cache)
    env={'PATH':'/usr/bin:/bin','LANG':'C.UTF-8','LC_ALL':'C.UTF-8','NO_COLOR':'1'}
    out,err=process([str(exe)],cwd=exe.parent,env=env,data=encode(request),timeout=30)
    verify(cache)
    from .workspace import strict_json
    response=validate_output(strict_json(out),request)
    verification=dict(method='Lean bounded route search / checkCertificate',engine=registry()['current'],
        engine_fingerprint=fingerprint(current_engine()),input_sha256=digest(encode(request)),
        output_sha256=digest(encode(response)),checked_at=datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00','Z'),
        outcome='checked_relative_to_admissions',stderr=err.decode('utf-8'))
    return response,verification


def verify_record_identity(verification, request, response):
    from .route_records import encode,digest,exact_keys,text
    exact_keys(verification,{'method','engine','engine_fingerprint','input_sha256','output_sha256','checked_at','outcome','stderr'},'route verification')
    engine=registry()['engines'].get(verification['engine'])
    if engine is None or verification['engine_fingerprint']!=fingerprint(engine): raise ValueError('Unknown retained checker identity; keep this record and use a version of GOLEM XIV that supports this checker')
    if verification['method']!='Lean bounded route search / checkCertificate' or verification['outcome']!='checked_relative_to_admissions': raise ValueError('Unsupported recorded verification')
    if verification['input_sha256']!=digest(encode(request)) or verification['output_sha256']!=digest(encode(response)):
        raise ValueError('Retained input/output differs from its verification')
    text(verification['checked_at'])
    if verification['stderr']!='': raise ValueError('Recorded checker diagnostics are not empty')
