"""Explicit real typesetting and operational build observations, never warrants."""

from hashlib import sha256
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from mrw.latex_build import (build_arguments, build_log, load_build, parse_diagnostics,
    pdf_bytes, recorder_inputs, recorder_observations, run_capture, run_latex, stale_inputs, input_snapshot, FAILURE_LOG_BYTES,
    StorageMonitor, STAGED_MONITOR_INTERVAL, bibliography_inputs, generated_usage, storage_snapshot)
from mrw.workstation import Workstation
from mrw.workspace import WorkspaceError


ROOT_TEX = r'''\documentclass{article}
\usepackage{amsmath,amssymb}
\title{Finite differences and polynomial degree}
\author{}
\date{}
\begin{document}
\maketitle
\input{argument.tex}
\newpage
\section{A calculation}
For $p(x)=x^3$, $\Delta p(x)=3x^2+3x+1$.
\end{document}
'''
ARGUMENT_TEX = r'''\section{The governing observation}
Let $K$ have characteristic zero and define $\Delta p(x)=p(x+1)-p(x)$.
If $p$ has degree $d>0$ and leading coefficient $a_d$, the binomial theorem gives
\[\Delta p(x)=d a_d x^{d-1}+\text{terms of smaller degree}.\]
Thus $\deg(\Delta p)=d-1$. The characteristic hypothesis is used exactly when
asserting $d a_d\ne0$.
'''


def tex_project(root):
    root.mkdir(parents=True, exist_ok=True)
    (root / 'main.tex').write_text(ROOT_TEX, encoding='utf-8')
    (root / 'argument.tex').write_text(ARGUMENT_TEX, encoding='utf-8')
    return root / 'main.tex'


class BuildTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix='mrw-tex-test-')
        self.addCleanup(temporary.cleanup)
        self.home = Path(temporary.name)
        self.project = self.home / 'mathematical project'
        self.root = tex_project(self.project)
        self.state = self.home / 'state'
        self.c = Workstation(state_root=self.state)
        self.c.open_project(self.project)
        self.c.open_file(self.root)
        self.c.set_tex_root()

    def test_no_automatic_typesetting(self):
        with patch('mrw.latex_build.run_latex', side_effect=AssertionError('implicit build')), patch('subprocess.Popen', side_effect=AssertionError('implicit process')):
            self.c.view()
            self.c.close_project()
            self.c.open_project(self.project)
            self.c.view()
        self.assertFalse(self.c.build_storage.exists())
        self.assertEqual(self.c.current().tex_root, str(self.root))

    def test_fixed_arguments_ignore_rc_disable_shell_escape_and_keep_outputs_local(self):
        output = self.state / 'build with spaces'
        args = build_arguments('/tools/latexmk', self.root, output, pdf_engine='/tools/pdflatex')
        self.assertEqual(args, [
            '/tools/latexmk', '-norc', '-pdf',
            '-pdflatex=/tools/pdflatex -no-shell-escape -no-parse-first-line %O %S',
            '-recorder', '-interaction=nonstopmode', '-file-line-error',
            '-halt-on-error', '-no-shell-escape', '-no-parse-first-line',
            '-outdir=' + str(output), './main.tex'])
        self.assertIn('-no-shell-escape', build_arguments('/tools/pdflatex', self.root, output))
        with self.assertRaises(WorkspaceError):
            build_arguments('unsupported', self.root, output)

    def test_capture_uses_exact_argument_vector_cwd_and_shell_false(self):
        output = self.home / 'output'
        output.mkdir()
        script = "import sys,os,json; print(json.dumps([sys.argv[1:],os.getcwd(),[os.environ[k] for k in ('openin_any','openout_any','shell_escape')]]))"
        arguments = [sys.executable, '-c', script, 'file with spaces.tex', '--literal=$HOME;do-not-expand']
        code, out, err, problem = run_capture(arguments, self.project, output, 'build', 3)
        self.assertEqual(json.loads(out), [arguments[3:], str(self.project), ['p', 'p', 'f']])
        self.assertEqual((code, err, problem), (0, '', ''))

    def test_file_line_diagnostics_and_recorder_paths_are_scoped(self):
        text = f'{self.root}:17: Undefined control sequence.\n/etc/private.tex:3: outside\n! Emergency stop.\n'
        parsed = parse_diagnostics(text, self.project, self.project)
        self.assertEqual(parsed[0]['path'], str(self.root))
        self.assertEqual(parsed[0]['line'], 17)
        self.assertEqual(len(parsed), 2)
        fls = f'PWD {self.project}\nINPUT ./main.tex\nINPUT ./argument.tex\nINPUT /etc/passwd\nINPUT ./main.tex\n'
        self.assertEqual(set(recorder_inputs(fls, self.project, self.project, self.state)), {self.root, self.project / 'argument.tex'})

    def test_missing_recorder_and_external_dependencies_never_claim_complete(self):
        paths, outside, coverage = recorder_observations('', self.project, self.project, self.state)
        self.assertEqual((paths, outside, coverage), ([], [], 'unknown'))
        _, outside, coverage = recorder_observations(f'INPUT {self.root}\nINPUT /usr/share/texmf/article.cls\n', self.project, self.project, self.state)
        self.assertEqual(outside, ['/usr/share/texmf/article.cls'])
        self.assertEqual(coverage, 'partial')
        # Even project-only recorder data leaves toolchain revisions untracked.
        self.assertEqual(recorder_observations(f'INPUT {self.root}\n', self.project, self.project, self.state)[2], 'partial')

    def test_unrelated_bibliography_does_not_suppress_supplied_bbl(self):
        (self.project / 'other').mkdir()
        (self.project / 'other' / 'unrelated.bib').write_text('@misc{x, title={Unrelated}}')
        supplied = self.project / 'main.bbl'
        supplied.write_text(r'\begin{thebibliography}{1}\bibitem{x}A supplied reference.\end{thebibliography}')
        destination = self.home / 'staged'
        revisions = input_snapshot(self.project, destination)
        self.assertEqual((destination / 'main.bbl').read_bytes(), supplied.read_bytes())
        self.assertIn(str(supplied), revisions)

    def test_lualatex_aliases_wrappers_and_native_windows_rejected_before_launch(self):
        from mrw.tool_settings import SettingsStore
        with patch('subprocess.Popen', side_effect=AssertionError('must not launch')):
            for name in ('lualatex', 'xelatex'):
                with self.assertRaises(WorkspaceError):
                    self.c.settings_store.configure('tex_engine', name)
                with self.assertRaises(WorkspaceError):
                    run_latex(**{**self.c.build_request(), 'configured_engine': name})
            fake = self.home / 'bin'
            fake.mkdir()
            alias = fake / 'pdflatex'
            lua_target = fake / 'luatex'
            lua_target.write_text('#!/bin/sh\nexit 99\n')
            lua_target.chmod(0o700)
            alias.symlink_to(lua_target)
            with self.assertRaisesRegex(WorkspaceError, 'boundary'):
                self.c.settings_store.configure('tex_engine', str(alias))
            with patch.dict(os.environ, {'PATH': str(fake)}):
                with self.assertRaises(WorkspaceError):
                    run_latex(**self.c.build_request())
            alias.unlink()
            alias.write_text('#!/bin/sh\nexec lualatex "$@"\n')
            alias.chmod(0o700)
            with self.assertRaisesRegex(WorkspaceError, 'wrapper'):
                self.c.settings_store.configure('tex_engine', str(alias))
            wrapper = fake / 'latexmk'
            wrapper.write_text('#!/bin/sh\nexec lualatex "$@"\n')
            wrapper.chmod(0o700)
            with self.assertRaisesRegex(WorkspaceError, 'wrapper'):
                self.c.settings_store.configure('tex_engine', str(wrapper))
            pdflatex = shutil.which('pdflatex') or 'pdflatex'
            with patch('mrw.latex_build.sys.platform', 'win32'):
                with self.assertRaisesRegex(WorkspaceError, 'unavailable'):
                    run_latex(**{**self.c.build_request(), 'configured_engine': pdflatex})

    @unittest.skipUnless(shutil.which('pdflatex'), 'No real accepted TeX engine installed')
    def test_conventional_input_and_openout_reject_absolute_paths_with_real_engines(self):
        secret = self.home / 'outside-sentinel.tex'
        secret.write_text('EXTERNALSENTINELMUSTNOTAPPEAR')
        original = secret.read_bytes()
        for engine in filter(None, (shutil.which('pdflatex'), shutil.which('latexmk'))):
            for attack in (r'\input{' + str(secret) + '}',
                           r'\newwrite\probe\immediate\openout\probe=' + str(secret) + r'\immediate\write\probe{changed}'):
                with self.subTest(engine=engine, attack=attack[:20]):
                    self.root.write_text(r'\documentclass{article}\begin{document}' + attack + r'\end{document}')
                    report = run_latex(**{**self.c.build_request(), 'configured_engine': engine})
                    self.assertFalse(report['success'], report['stdout'])
                    self.assertIsNone(report['pdf_digest'])
                    self.assertEqual(secret.read_bytes(), original)
                    self.assertIn('Not', report['stdout'] + report['stderr'])

    @unittest.skipUnless(shutil.which('pdflatex') and shutil.which('pdftotext'), 'Real pdfTeX and PDF text extraction required')
    def test_pdffiledump_and_pdffilesize_restrict_absolute_file_reads(self):
        sentinel = self.home / 'external-primitive.txt'
        sentinel.write_text('EXTERNALSENTINELMUSTNOTAPPEAR')
        raw = sentinel.read_bytes()
        engine = shutil.which('pdflatex')
        extractor = shutil.which('pdftotext')
        request = {**self.c.build_request(), 'configured_engine': engine}
        prefix = r'\documentclass{article}\begin{document}Probe: '
        suffix = r'\end{document}'
        self.root.write_text(prefix + 'Control.' + suffix)
        control = run_latex(**request)
        self.assertTrue(control['success'], control['stdout'] + control['stderr'])
        control_pdf = self.c.build_storage / control['id'] / control['pdf_file']
        self.assertIn(b'Control.', subprocess.run([extractor, str(control_pdf), '-'],
            check=True, capture_output=True).stdout)
        for primitive in (r'\pdffiledump', r'\pdffilesize'):
            with self.subTest(primitive=primitive):
                self.root.write_text(prefix + primitive + '{' + str(sentinel) + '}' + suffix)
                report = run_latex(**request)
                self.assertFalse(report['problem'], report['problem'])
                if report['success']:
                    pdf = self.c.build_storage / report['id'] / report['pdf_file']
                    text = subprocess.run([extractor, str(pdf), '-'], check=True, capture_output=True).stdout
                    self.assertIn(b'Probe:', text)
                    self.assertNotIn(raw, text)
                    self.assertNotIn(raw.hex().upper().encode(), text.replace(b'\n', b''))
                    self.assertNotIn(str(len(raw)).encode(), text)
                else:
                    self.assertNotEqual(report['exit_code'], 0)
                    self.assertRegex(report['stdout'] + report['stderr'],
                        r'Not reading from ' + re.escape(str(sentinel)) + r' \(openin_any\s*=\s*p\)')
                self.assertEqual(sentinel.read_bytes(), raw)

    @unittest.skipUnless(shutil.which('pdflatex'), 'Real pdfTeX required')
    def test_pdfobj_stream_file_can_embed_absolute_external_input_with_partial_coverage(self):
        sentinel = self.home / 'external-stream-sentinel.txt'
        original = b'MRW-PDFOBJ-EXTERNAL-STREAM-SENTINEL\n'
        sentinel.write_bytes(original)
        self.assertFalse(sentinel.is_relative_to(self.project))
        # Leave streams uncompressed so the actual embedded bytes are observable
        # without introducing a PDF parser or mistaking page text for the stream.
        self.root.write_text(
            r'\documentclass{article}\pdfcompresslevel=0\pdfobjcompresslevel=0'
            r'\immediate\pdfobj stream file {' + str(sentinel) + '}'
            r'\begin{document}A typeset page.\end{document}', encoding='utf-8')
        self.c.settings_store.configure('tex_engine', shutil.which('pdflatex'))
        project_before = {p.name: p.read_bytes() for p in self.project.iterdir()}
        records_before = set(self.state.rglob('*.json'))
        with (
            patch('mrw.record_actions.persist_private_new',
                  side_effect=AssertionError('immutable record publication')),
            patch('mrw.documentary_warrant.create_documentary_warrant_package',
                  side_effect=AssertionError('warrant creation')),
            patch('mrw.documentary_warrant.run_lean_documentary_checker',
                  side_effect=AssertionError('Lean invocation')),
            patch('socket.socket', side_effect=AssertionError('network')),
        ):
            report = self.c.build_latex()
        self.assertTrue(report['success'], report['stdout'] + report['stderr'])
        self.assertEqual(report['exit_code'], 0)
        self.assertIn(original, pdf_bytes(self.c.build_storage, report))
        self.assertIn(str(sentinel), report['outside_inputs'])
        self.assertEqual(report['dependency_coverage'], 'partial')
        self.assertEqual(self.c.build_report(), report)
        self.assertEqual(sentinel.read_bytes(), original)
        self.assertEqual(project_before, {p.name: p.read_bytes() for p in self.project.iterdir()})
        # The only new JSON record is the operational build report. No
        # Verification, admission, context or checked derivation is created.
        self.assertEqual(set(self.state.rglob('*.json')) - records_before,
                         {self.c.build_storage / report['id'] / 'report.json'})
        self.assertEqual([b.state.format for b in self.c.buffers.values()], ['text'])
        for key in ('Verification', 'PremiseAdmission', 'JustificationDerivation',
                    'verification', 'admissions', 'context', 'derivation'):
            self.assertNotIn(key, report)

    @unittest.skipUnless(shutil.which('latexmk'), 'No real latexmk installed')
    def test_magic_engine_comments_cannot_select_lualatex(self):
        self.root.write_text('%&lualatex\n% !TEX program = lualatex\n' + ROOT_TEX)
        fake = self.home / 'commands'
        fake.mkdir()
        sentinel = self.home / 'lua-launched'
        command = fake / 'lualatex'
        command.write_text('#!/bin/sh\ntouch "' + str(sentinel) + '"\nexit 9\n')
        command.chmod(0o700)
        with patch.dict(os.environ, {'PATH': str(fake) + os.pathsep + os.environ['PATH']}):
            report = run_latex(**{**self.c.build_request(), 'configured_engine': shutil.which('latexmk')})
        self.assertTrue(report['success'], report['stdout'] + report['stderr'])
        self.assertFalse(sentinel.exists())
        self.assertIn('pdfTeX', report['stdout'])

    def test_frequent_storage_scan_prunes_staged_descendants_and_counts_output(self):
        output = self.home / 'monitored'
        staged = output / 'inputs'
        nested = staged / 'sub'
        nested.mkdir(parents=True)
        for number in range(4):
            (nested / f'{number}.tex').write_bytes(b'unchanged input')
        generated = output / 'generated'
        generated.mkdir()
        baseline = storage_snapshot(output)
        (generated / 'main.aux').write_bytes(b'generated output')
        monitor = StorageMonitor(output, baseline, 0)
        visited = []
        walk = os.walk
        def observed_walk(*args, **kwargs):
            for root, dirs, files in walk(*args, **kwargs):
                visited.append(Path(root))
                yield root, dirs, files
        with patch('mrw.latex_build.os.walk', observed_walk):
            self.assertEqual(monitor.poll(STAGED_MONITOR_INTERVAL / 2),
                             (1, len(b'generated output')))
        self.assertEqual(set(visited), {output, generated})
        self.assertFalse(any(path.is_relative_to(staged) for path in visited))

    def test_slower_storage_scan_counts_replaced_and_added_staged_files_once(self):
        output = self.home / 'monitored'
        staged = output / 'inputs'
        staged.mkdir(parents=True)
        source = staged / 'main.tex'
        source.write_bytes(b'old')
        baseline = storage_snapshot(output)
        monitor = StorageMonitor(output, baseline, 0)
        replacement = self.home / 'replacement'
        replacement.write_bytes(b'new')
        replacement.replace(source)  # Same size, different inode; no clock dependency.
        added = staged / 'added'
        added.mkdir()
        (added / 'extra.tex').write_bytes(b'extra')
        auxiliary = output / 'main.aux'
        auxiliary.write_bytes(b'output')
        self.assertEqual(monitor.poll(STAGED_MONITOR_INTERVAL / 2), (1, 6))
        with patch('mrw.latex_build.storage_snapshot', wraps=storage_snapshot) as scan:
            self.assertEqual(monitor.poll(STAGED_MONITOR_INTERVAL), (4, 14))
            self.assertEqual([call.args[0] for call in scan.call_args_list], [output, staged])
            scan.reset_mock()
            auxiliary.write_bytes(b'new output')
            self.assertEqual(monitor.poll(STAGED_MONITOR_INTERVAL * 1.5), (4, 18))
            self.assertEqual([call.args[0] for call in scan.call_args_list], [output])
            source.write_bytes(b'newer input')
            scan.reset_mock()
            self.assertEqual(monitor.poll(STAGED_MONITOR_INTERVAL * 2), (4, 26))
            self.assertEqual([call.args[0] for call in scan.call_args_list], [output, staged])
        self.assertEqual(generated_usage(output, baseline), (4, 26))

    def test_final_scan_catches_staged_quota_before_any_periodic_staged_scan(self):
        for kind in ('bytes', 'count'):
            with self.subTest(kind=kind):
                output = self.home / ('final-staged-quota-' + kind)
                staged = output / 'inputs'
                staged.mkdir(parents=True)
                (staged / 'existing.tex').write_bytes(b'old')
                engine = "from pathlib import Path; Path('inputs/existing.tex').write_bytes(b'r'*768); Path('inputs/new.tex').write_bytes(b'n'*768)"
                request = output / 'request.json'
                request.write_text(json.dumps(dict(arguments=[sys.executable, '-c', engine],
                    cwd=str(output), directory=str(output), label='build', timeout=5,
                    max_bytes=1024 if kind == 'bytes' else 1024*1024,
                    max_files=10 if kind == 'bytes' else 1)))
                # Freeze only the supervisor's clock: the real child exits before
                # a periodic staged scan is due, independently of scheduling speed.
                runner = """
import json,sys
from unittest.mock import patch
from mrw import latex_build as build
observations = []
usage = build.generated_usage
def observed_usage(directory, baseline, **kwargs):
    prune = kwargs.get('prune')
    observations.append([str(directory), str(prune) if prune else None])
    return usage(directory, baseline, **kwargs)
with patch.object(build.time, 'monotonic', return_value=0), patch.object(build, 'generated_usage', observed_usage):
    build._supervise(sys.argv[1])
print(json.dumps(observations))
"""
                completed = subprocess.run([sys.executable, '-c', runner, str(request)],
                    capture_output=True, text=True, check=True, timeout=15)
                observations = json.loads(completed.stdout)
                self.assertGreaterEqual(len(observations), 2)
                self.assertTrue(all(item == [str(output), str(staged)] for item in observations[:-1]))
                self.assertEqual(observations[-1], [str(output), None])
                result = json.loads((output / 'build.result.json').read_bytes())
                self.assertEqual(result['code'], 0)  # No kill or per-file-limit failure.
                self.assertIn('quota', result['problem'])
                files = list(output.rglob('*'))
                self.assertEqual({p.name for p in files},
                                 {'build.stdout', 'build.stderr', 'build.result.json'})
                self.assertLessEqual(sum(p.stat().st_size for p in files), FAILURE_LOG_BYTES * 2 + 1024)

    def test_output_quotas_bound_auxiliary_files_and_retained_diagnostics(self):
        for kind in ('bytes', 'count'):
            for repeat in range(2):
                with self.subTest(kind=kind, repeat=repeat):
                    output = self.home / f'quota-{kind}-{repeat}'
                    output.mkdir()
                    script = ("from pathlib import Path; Path('oversized.aux').write_bytes(b'x' * (8*1024*1024))"
                        if kind == 'bytes' else
                        "from pathlib import Path; [Path(f'{n}.aux').write_bytes(b'x') for n in range(2000)]")
                    code, out, err, problem = run_capture([sys.executable, '-c', script], output, output,
                        'build', 5, max_bytes=128*1024, max_files=20)
                    self.assertIn('quota', problem)
                    files = list(output.rglob('*'))
                    self.assertLessEqual(len(files), 2)
                    self.assertLessEqual(sum(p.stat().st_size for p in files), FAILURE_LOG_BYTES * 2)
                    self.assertLessEqual(len(out.encode()) + len(err.encode()), FAILURE_LOG_BYTES * 2)

    def test_detached_child_is_reaped_even_after_parent_exits(self):
        for repeat in range(2):
            output = self.home / f'child-{repeat}'
            output.mkdir()
            script = "import subprocess,sys; from pathlib import Path; p=subprocess.Popen([sys.executable,'-c','import time;time.sleep(120)'], start_new_session=True); Path('child.pid').write_text(str(p.pid))"
            code, _, err, problem = run_capture([sys.executable, '-c', script], output, output, 'build', 5)
            pid = int((output / 'child.pid').read_text())
            self.assertEqual((code, problem), (0, ''), err)
            self.assertFalse(Path(f'/proc/{pid}').exists(), 'detached child survived its parent and the supervisor')

    @unittest.skipUnless(shutil.which('pdflatex'), 'No real TeX engine installed')
    def test_real_success_failure_staleness_digests_provenance_and_restart(self):
        self.c.settings_store.configure('tex_engine', shutil.which('pdflatex'))
        before = {p.name: p.read_bytes() for p in self.project.iterdir()}
        with patch('mrw.private_persistence.persist_private_new', side_effect=AssertionError('mathematical record publication')), patch('socket.socket', side_effect=AssertionError('network')):
            report = self.c.build_latex()
        self.assertTrue(report['success'], report['stdout'] + report['stderr'])
        self.assertEqual(report['exit_code'], 0)
        self.assertTrue(report['tool_version'])
        self.assertLessEqual(report['started_at'], report['ended_at'])
        self.assertEqual(report['arguments'], build_arguments(report['tool_path'], Path(report['source_directory']) / 'main.tex', self.c.build_storage / report['id']))
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.project.iterdir()})
        self.assertTrue(report['recorder_available'])
        inputs = {Path(i['path']).name: i for i in report['inputs']}
        self.assertEqual(set(inputs), {'main.tex', 'argument.tex'})
        self.assertTrue(all(i['stable'] for i in inputs.values()))
        raw = pdf_bytes(self.c.build_storage, report)
        self.assertTrue(raw.startswith(b'%PDF-'))
        self.assertEqual(report['pdf_digest'], sha256(raw).hexdigest())
        log = self.c.build_storage / report['id'] / 'main.log'
        self.assertEqual(report['log_digest'], sha256(log.read_bytes()).hexdigest())
        self.assertIn('Output written', build_log(self.c.build_storage, report))
        self.assertEqual(report['working_directory'], report['source_directory'])
        self.assertEqual(stale_inputs(report), [])
        self.c.set_pdf_view(page=1, zoom='custom', scale=1.3)
        self.c.close_project()
        script = '''
import json,sys
from pathlib import Path
from mrw.workstation import Workstation
c=Workstation(state_root=Path(sys.argv[2]))
c.open_project(Path(sys.argv[1]))
r,raw,stale=c.pdf_snapshot()
assert not stale
assert raw.startswith(b'%PDF-')
print(json.dumps([c.current().pdf_page,c.current().pdf_zoom,c.current().pdf_scale,r['id']]))
'''
        restarted = subprocess.run([sys.executable, '-c', script, str(self.project), str(self.state)], check=True, capture_output=True, text=True)
        self.assertEqual(json.loads(restarted.stdout), [1, 'custom', 1.3, report['id']])
        c = Workstation(state_root=self.state)
        c.open_project(self.project)
        argument = self.project / 'argument.tex'
        argument.write_text('\\undefinedMathematicalCommand\n')
        self.assertEqual(stale_inputs(report), [str(argument)])
        failed = c.build_latex()
        self.assertFalse(failed['success'])
        self.assertNotEqual(failed['exit_code'], 0)
        self.assertIsNone(failed['pdf_digest'])
        self.assertTrue(any(d['path'] == str(argument) and d['line'] == 1 for d in failed['diagnostics']), failed['diagnostics'])
        self.assertEqual(c.current().successful_build, report['id'])
        self.assertEqual(c.current().last_build, failed['id'])
        self.assertEqual(c.pdf_snapshot()[1], raw)
        self.assertTrue(c.pdf_snapshot()[2])
        for key in ('Verification', 'PremiseAdmission', 'JustificationDerivation', 'admissions', 'verification'):
            self.assertNotIn(key, report)
            self.assertNotIn(key, failed)
        saved_pdf = c.build_storage / report['id'] / report['pdf_file']
        saved_pdf.write_bytes(raw + b'changed')
        with self.assertRaisesRegex(WorkspaceError, 'SHA-256'):
            c.pdf_snapshot()

    @unittest.skipUnless(shutil.which('latexmk'), 'No real latexmk installed')
    def test_latexmk_bibliography_outputs_never_modify_existing_project_artifacts(self):
        self.root.write_text(r'\documentclass{article}\begin{document}A result \cite{sample}.\bibliographystyle{plain}\bibliography{refs}\end{document}')
        (self.project / 'refs.bib').write_text('@book{sample, author={A. Writer}, title={A book}, year={2020}, publisher={P}}')
        for extension in ('bbl', 'blg', 'aux', 'out', 'toc'):
            (self.project / ('main.' + extension)).write_text('% Existing project artifact; preserve exactly.\n')
        before = {p.name: p.read_bytes() for p in self.project.iterdir()}
        self.c.settings_store.configure('tex_engine', shutil.which('latexmk'))
        report = self.c.build_latex()
        self.assertTrue(report['success'], report['stdout'] + report['stderr'])
        self.assertEqual(before, {p.name: p.read_bytes() for p in self.project.iterdir()})
        self.assertEqual(stale_inputs(report), [])
        self.assertNotEqual(report['working_directory'], str(self.project))
        self.assertTrue(any(Path(i['path']).name == 'refs.bib' for i in report['inputs']))
        self.assertNotIn("Citation `sample' on page 1 undefined", (self.c.build_storage / report['id'] / 'main.log').read_text())

    @unittest.skipUnless(shutil.which('latexmk') and shutil.which('pdflatex'), 'Real latexmk and pdfTeX required')
    def test_nested_tex_root_bibliography_retains_exact_project_path_and_revision(self):
        nested = self.project / 'sub'
        nested.mkdir()
        root = nested / 'main.tex'
        root.write_text(r'\documentclass{article}\begin{document}A result \cite{sample}.'
                        r'\bibliographystyle{plain}\bibliography{refs}\end{document}')
        database = nested / 'refs.bib'
        database.write_text('@book{sample, author={A. Writer}, title={Nested source}, year={2020}, publisher={P}}')
        (self.project / 'refs.bib').write_text('@misc{decoy, title={Unrelated root database}}')
        before = {str(p.relative_to(self.project)): p.read_bytes()
                  for p in self.project.rglob('*') if p.is_file()}
        self.c.open_file(root)
        self.c.set_tex_root()
        self.c.settings_store.configure('tex_engine', shutil.which('latexmk'))
        report = self.c.build_latex()
        self.assertTrue(report['success'], report['stdout'] + report['stderr'])
        databases = [item for item in report['inputs'] if Path(item['path']).suffix == '.bib']
        revision = sha256(database.read_bytes()).hexdigest()
        self.assertEqual(databases, [dict(path=str(database), before=revision,
                                          revision=revision, stable=True)])
        self.assertEqual(self.c.build_report(), report)
        self.assertEqual(before, {str(p.relative_to(self.project)): p.read_bytes()
                                 for p in self.project.rglob('*') if p.is_file()})

    def test_relative_bibliography_retains_staged_candidate_despite_build_local_namesake(self):
        nested = self.project / 'sub'
        nested.mkdir()
        database = nested / 'refs.bib'
        database.write_text('@misc{sample, title={Project database}}')
        output = self.home / 'bibliography-build'
        staged = output / 'inputs'
        input_snapshot(self.project, staged)
        root_directory = staged / 'sub'
        generated = output / 'refs.bib'
        generated.write_text('@misc{other, title={Build-generated database}}')
        outside = self.home / 'outside.bib'
        outside.write_text('@misc{external, title={External database}}')
        log = output / 'main.blg'
        for entry, paths, external in (
            ('refs.bib', {database}, set()),
            (str(root_directory / 'refs.bib'), {database}, set()),
            (str(generated), set(), set()),
            (str(outside), set(), {str(outside)}),
        ):
            with self.subTest(entry=entry):
                log.write_text('Database file #1: ' + entry + '\n')
                self.assertEqual(bibliography_inputs(output, staged, self.project,
                    root_directory=root_directory), (paths, external))

    def test_combined_dependency_limit_includes_every_observation_before_publication(self):
        database = self.project / 'refs.bib'
        database.write_text('@misc{sample, title={A supplied database}}')
        supplied = self.project / 'main.bbl'
        supplied.write_text('% Supplied bibliography\n')
        outside_recorder = self.home / 'outside-recorder.sty'
        outside_bib = self.home / 'outside-bibliography.bib'
        outside_recorder.write_text('% External tool input\n')
        outside_bib.write_text('@misc{external, title={External database}}')
        def capture(arguments, cwd, directory, label, timeout):
            if label == 'version':
                return 0, 'Synthetic dependency-limit tool', '', ''
            # Neither the selected root nor the supplied .bbl is in the recorder
            # or bibliography observations, so their final inclusion is tested.
            (directory / 'main.fls').write_text(
                f'PWD {cwd}\nINPUT {cwd / "argument.tex"}\nINPUT {outside_recorder}\n')
            (directory / 'main.blg').write_text(
                f'Database file #1: refs.bib\nDatabase file #2: {outside_bib}\n')
            return 1, 'Synthetic stopped build for dependency-limit test', '', ''
        request = {**self.c.build_request(), 'configured_engine': 'pdflatex'}
        with (patch('mrw.latex_build.validated_tex_executable', return_value='/tools/pdflatex'),
              patch('mrw.latex_build.run_capture', side_effect=capture)):
            with patch('mrw.latex_build.MAX_INPUTS', 6):
                report = run_latex(**request)
                self.assertEqual({item['path'] for item in report['inputs']},
                                 {str(self.root), str(self.project / 'argument.tex'), str(database), str(supplied)})
                self.assertEqual(set(report['outside_inputs']), {str(outside_recorder), str(outside_bib)})
                self.assertEqual(len(report['inputs']) + len(report['outside_inputs']), 6)
                self.assertEqual(load_build(self.c.build_storage, report['id'], self.project), report)
            reports_before = set(self.c.build_storage.glob('*/report.json'))
            with (patch('mrw.latex_build.MAX_INPUTS', 5),
                  patch('mrw.latex_build.save_mutable',
                        side_effect=AssertionError('Excessive dependency report must not be published'))):
                with self.assertRaisesRegex(WorkspaceError, 'Combined build input observations exceed 5 files'):
                    run_latex(**request)
            self.assertEqual(set(self.c.build_storage.glob('*/report.json')), reports_before)

    def test_build_requires_explicit_root_and_saved_sources(self):
        b = self.c.buffer()
        self.c.edit(b.state.id, b.content + '% unsaved\n')
        with self.assertRaisesRegex(WorkspaceError, 'Save modified'):
            self.c.build_request()
        self.c.current().tex_root = None
        with self.assertRaisesRegex(WorkspaceError, 'Set as TeX root'):
            self.c.build_request()


if __name__ == '__main__':
    unittest.main()
