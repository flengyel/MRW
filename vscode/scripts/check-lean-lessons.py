"""Explicit, offline verification of shipped Lean lesson projects. No downloads."""
import argparse
from hashlib import sha256
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,required=True)
args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
repo=Path(__file__).resolve().parents[2]
pack=repo/'vscode/media/lean-study';manifest=json.loads((pack/'pack.json').read_text())
name=manifest['testedToolchain'];tool=Path.home()/'.elan/toolchains'/name.replace('/','--').replace(':','---')/'bin'
if not (tool/'lean').is_file() or not (tool/'lake').is_file():raise SystemExit('Install the pinned toolchain explicitly first: '+name)
env=dict(os.environ,PATH=str(tool)+os.pathsep+os.environ.get('PATH',''))
report=dict(toolchain=name,leanVersion=subprocess.check_output([str(tool/'lean'),'--version'],text=True).strip(),projects=[],deliberateErrors=[],exercises=[])
with tempfile.TemporaryDirectory(prefix='mrw-lean-check-') as temp:
    for index,source in enumerate([pack,repo/'examples/lean-lesson-pack']):
        project=Path(temp)/str(index);shutil.copytree(source,project,ignore=shutil.ignore_patterns('.lake','lake-manifest.json'))
        complete=['Study.lean','Study/Examples.lean','Study/Solutions.lean'] if index==0 else ['Example.lean']
        hashes={f:sha256((project/f).read_bytes()).hexdigest() for f in complete}
        for file in complete:
            text=(project/file).read_text()
            if re.search(r'\b(?:sorry|admit)\b|(?m:^\s*axiom\s)',text):raise SystemExit('Unproved declaration in completed lesson: '+file)
        result=subprocess.run([str(tool/'lake'),'build'],cwd=project,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
        (args.output/f'project-{index}.log').write_text(json.dumps(dict(toolchain=name,files=hashes))+'\n'+result.stdout)
        report['projects'].append(dict(pack=json.loads((project/'pack.json').read_text())['packId'],files=hashes,exit=result.returncode))
        if result.returncode:raise SystemExit('Completed Lean lesson failed: '+str(source))
        if index==0:
            if 'does not depend on any axioms' not in result.stdout or ':13:0: 14' not in result.stdout:raise SystemExit('Expected computation and axiom reports missing')
            for kind in ['mistakes','exercises']:
                for row in manifest['lessons'][0][kind]:
                    file=row['file'];result=subprocess.run([str(tool/'lake'),'env','lean',file],cwd=project,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
                    record=dict(file=file,sha256=sha256((project/file).read_bytes()).hexdigest(),exit=result.returncode)
                    (args.output/(Path(file).stem+'.log')).write_text(json.dumps(dict(toolchain=name,**record))+'\n'+result.stdout)
                    if result.returncode==0:raise SystemExit('Intentional incomplete/error file unexpectedly succeeded: '+file)
                    if kind=='mistakes' and not re.search(r'type mismatch',result.stdout,re.I):raise SystemExit('Unexpected deliberate-error diagnostic: '+file)
                    if kind=='exercises' and not re.search(r'placeholder|unsolved goals',result.stdout,re.I):raise SystemExit('Unexpected exercise diagnostic: '+file)
                    report['deliberateErrors' if kind=='mistakes' else 'exercises'].append(record)
(args.output/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
