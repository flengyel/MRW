"""Prepare a new owned native fixture; never reuse a reading workspace or profile."""
import argparse
import json
import os
from pathlib import Path
import shutil
import stat
import tempfile
from uuid import uuid4

def prepare(case, parent=None, seed=None, config=None):
    repo=Path(__file__).resolve().parents[2]
    allowed={'isolation','sourceTrash','activation','sourceReturn','warrantInspection'}
    if case not in allowed:raise ValueError('This older case needs fixture/UI migration; supported cases are isolation, sourceTrash, activation, sourceReturn and warrantInspection')
    parent=Path(parent) if parent else Path.home()/'.cache/mrw-native-tests'
    cache=Path.home()/'.cache'
    if not parent.is_absolute() or parent.resolve()!=parent or not parent.is_relative_to(cache):
        raise ValueError('Fixture output must use a canonical directory under ~/.cache, outside working notes')
    if any((ancestor/'.obsidian').is_dir() for ancestor in [parent,*parent.parents]):
        raise ValueError('A real vault cannot be a native fixture output parent')
    parent.mkdir(parents=True,exist_ok=True)
    root=Path(tempfile.mkdtemp(prefix='mrw-fixture-',dir=parent));os.chmod(root,0o700)
    (root/'workspace-storage').mkdir();(root/'global-storage').mkdir()
    identifier=str(uuid4());profile='MRW-Fixture-'+identifier
    names={'sourceTrash':'mrw-source-trash-fixture','activation':'mrw-activation-fixture','isolation':'mrw-isolation-fixture','sourceReturn':'mrw-source-return-fixture','warrantInspection':'mrw-warrant-inspection-fixture'}
    project=root/names.get(case,'project');project.mkdir()
    extension=root/'extension';extension.mkdir()
    for name in ['src','media','python']:
        shutil.copytree(repo/'vscode'/name,extension/name,ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
    shutil.copytree(repo/'vscode/test/host',extension/'test/host',ignore=shutil.ignore_patterns('__pycache__','*.pyc'))
    for name in ['package.json','LICENSE']:shutil.copy2(repo/'vscode'/name,extension/name)
    if seed:
        seed=Path(seed)
        count=0;size=0
        for p in seed.rglob('*'):
            st=p.lstat();count+=1;size+=st.st_size
            if count>4000 or size>64*1024*1024:raise ValueError('Seed exceeds its 4,000-entry/64-MiB preparation budget')
            if p.is_symlink() or not (stat.S_ISDIR(st.st_mode) or stat.S_ISREG(st.st_mode)):
                raise ValueError('Seed must contain ordinary files/directories only')
            if any(name in ('.git','.aws','.codex') for name in p.relative_to(seed).parts):raise ValueError('Seed contains private/repository metadata')
        shutil.copytree(seed,project,dirs_exist_ok=True)
    (project/'.vscode').mkdir(exist_ok=True)
    settings={'mrw.notesFolder':str(project),'mrw.dataDirectory':'','mrw.leanStudyParent':str(project),
              'mrw.usageRecording':False,'files.autoSave':'off','workbench.startupEditor':'none','window.title':profile+' ${folderName}'}
    (project/'.vscode/settings.json').write_text(json.dumps(settings,indent=2)+'\n')
    if not (project/'reading.md').exists():(project/'reading.md').write_text('# Disposable native fixture\n\nA retained passage.\n')
    def expand(value):
        if isinstance(value,dict):return {k:expand(v) for k,v in value.items()}
        if isinstance(value,list):return [expand(v) for v in value]
        if isinstance(value,str):
            for key,target in {'ROOT':root,'PROJECT':project,'EXTENSION':extension,'PROFILE':profile}.items():value=value.replace('${'+key+'}',str(target))
        return value
    cfg=expand(config or {});cfg.update(project=str(project),artifacts=str(root))
    (extension/'host-test.json').write_text(json.dumps(cfg,indent=2)+'\n')
    mode='run' if case in ('activation','index','designContracts') else 'activate'
    manifest=json.loads((extension/'package.json').read_text());manifest['main']='./test/host/bootstrap.js' if mode=='run' else './test/host/'+case+'.js';manifest['activationEvents']=['*']
    (extension/'package.json').write_text(json.dumps(manifest,indent=2)+'\n')
    st=root.stat();marker=dict(schema='mrw.native-fixture',version=1,case=case,id=identifier,root=str(root),profile=profile,
        extension=str(extension),projects=[str(project)],device=str(st.st_dev),inode=str(st.st_ino))
    (root/'.mrw-native-fixture.json').write_text(json.dumps(marker,indent=2)+'\n')
    (extension/'host-fixture.json').write_text(json.dumps(dict(root=str(root),id=identifier))+'\n')
    args=['--new-window','--disable-workspace-trust','--disable-extension','flengyel.mrw-diagnostics','--profile',profile,
        '--remote','wsl+Debian','--extensionDevelopmentPath=vscode-remote://wsl+Debian'+str(extension),
        '--folder-uri=vscode-remote://wsl+Debian'+str(project),'--skip-welcome','--skip-release-notes']
    if mode=='run':args.append('--extensionTestsPath=vscode-remote://wsl+Debian'+str(extension/'test/host'/case))
    result=dict(root=str(root),project=str(project),extension=str(extension),profile=profile,arguments=args)
    (root/'launch.json').write_text(json.dumps(result,indent=2)+'\n')
    return result

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--case',default='isolation')
    parser.add_argument('--parent',type=Path)
    parser.add_argument('--seed',type=Path,help='copy ordinary fixture files into the new project')
    parser.add_argument('--config',type=Path,help='case options, with ${ROOT}, ${PROJECT}, ${PROFILE} placeholders')
    a=parser.parse_args()
    try:result=prepare(a.case,a.parent,a.seed,json.loads(a.config.read_text()) if a.config else None)
    except ValueError as error:raise SystemExit(str(error))
    print(json.dumps(result,indent=2))

if __name__=='__main__':main()
