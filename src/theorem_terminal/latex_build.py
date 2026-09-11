"""Explicit local LaTeX typesetting. Build observations are not Verification.

No compiler is discovered or invoked when a project is opened. This module has
no dependency on mathematical checking or corpus-specific application services.
"""

from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
import os
import ctypes
import sys
import shlex
from pathlib import Path
import re
import shutil
import signal
import stat
import subprocess
import time
from uuid import uuid4

from .local_files import read_bounded
from .mutable_files import private_directory, save_mutable
from .tool_settings import local_tool_environment, validated_tex_executable
from .workspace import WorkspaceError, json_bytes, strict_json

MAX_LOG_BYTES = 4 * 1024 * 1024
MAX_REPORT_BYTES = 16 * 1024 * 1024
MAX_PDF_BYTES = 64 * 1024 * 1024
MAX_INPUT_BYTES = 64 * 1024 * 1024
MAX_TOTAL_INPUT_BYTES = 256 * 1024 * 1024
MAX_INPUTS = 4096
MAX_GENERATED_BYTES = 128 * 1024 * 1024
MAX_GENERATED_FILES = 1024
FAILURE_LOG_BYTES = 64 * 1024
MONITOR_INTERVAL = 0.02
STAGED_MONITOR_INTERVAL = 1.0
INPUT_SUFFIXES = {'.tex', '.sty', '.cls', '.bib', '.bst', '.bbl', '.cfg', '.def',
                  '.png', '.jpg', '.jpeg', '.pdf', '.eps', '.svg', '.csv', '.dat', '.txt'}
SKIP_DIRECTORIES = {'.git', '.lake', '.venv', 'venv', 'node_modules', '__pycache__', '.theorem-terminal'}


def utc_now():
    return datetime.now(timezone.utc).isoformat(timespec='microseconds').replace('+00:00', 'Z')


def file_digest(path, limit=MAX_INPUT_BYTES):
    return sha256(read_bounded(path, limit, 'build input')).hexdigest()


def input_snapshot(project, destination):
    """Copy bounded ordinary build inputs only during an explicit build.

    latexmk can run bibtex beside a discovered .bbl, even with -outdir. A local
    input tree keeps all such writes outside the project. Supplied .bbl files are preserved in the staging tree; an unrelated
    bibliography never suppresses them. Unsupported input formats fail through the real tool log.
    """
    candidates = []
    total = count = 0
    for directory, names, files in os.walk(project, followlinks=False):
        names[:] = [n for n in names if n not in SKIP_DIRECTORIES and not (Path(directory) / n).is_symlink()]
        for name in files:
            count += 1
            if count > 50000:
                raise WorkspaceError('Project exceeds the bounded TeX input inventory (50000 paths)')
            path = Path(directory) / name
            if path.suffix.lower() not in INPUT_SUFFIXES or path.is_symlink():
                continue
            total += path.stat().st_size
            if total > MAX_TOTAL_INPUT_BYTES or len(candidates) >= MAX_INPUTS:
                raise WorkspaceError('Project exceeds the bounded TeX input inventory (256 MiB / 4096 inputs)')
            candidates.append(path)
    revisions = {}
    for path in candidates:
        raw = read_bounded(path, MAX_INPUT_BYTES, 'build input')
        target = destination / path.relative_to(project)
        private_directory(target.parent)
        with target.open('xb') as stream:
            if hasattr(os, 'fchmod'):
                os.fchmod(stream.fileno(), 0o600)
            stream.write(raw)
        revisions[str(path)] = sha256(raw).hexdigest()
    return revisions


def build_supported():
    # Descendant reaping below relies on Linux subreapers and /proc, including
    # WSL2. Native Windows/macOS builds are explicitly unavailable in this slice.
    return sys.platform.startswith('linux') and Path('/proc/self/task').is_dir()


def build_arguments(engine: str, tex_root: Path, output: Path, *, pdf_engine=None):
    name = Path(engine).name.lower()
    # cwd is the staged root parent. openin_any=p is defense in depth for
    # conventional input operations, not a complete read boundary: pdfTeX
    # can still embed absolute external files through pdfobj stream file.
    root_name = './' + tex_root.name
    flags = ['-recorder', '-interaction=nonstopmode', '-file-line-error',
             '-halt-on-error', '-no-shell-escape', '-no-parse-first-line']
    if name == 'latexmk':
        if pdf_engine is None:
            pdf_engine = validated_tex_executable('pdflatex')
        # -norc disables rc recipes; pin pdfLaTeX independently of PATH and
        # manuscript magic comments. latexmk itself interprets this fixed recipe.
        recipe = shlex.quote(pdf_engine) + ' -no-shell-escape -no-parse-first-line %O %S'
        return [engine, '-norc', '-pdf', '-pdflatex=' + recipe, *flags,
                '-outdir=' + str(output), root_name]
    if name == 'pdflatex':
        return [engine, *flags, '-output-directory=' + str(output), root_name]
    raise WorkspaceError('Only latexmk with pdfLaTeX, or pdfLaTeX, is supported; LuaLaTeX is disabled')


def storage_snapshot(directory, *, prune=None):
    """Inventory signatures, optionally counting a directory but not its descendants."""
    result = {}
    if directory.is_symlink():
        return result
    for root, dirs, files in os.walk(directory, followlinks=False):
        for name in dirs + files:
            path = Path(root) / name
            try:
                item = path.lstat()
            except FileNotFoundError:
                continue
            result[str(path)] = (0 if stat.S_ISDIR(item.st_mode) else item.st_size,
                                 item.st_mtime_ns, item.st_ino)
        if prune is not None:
            dirs[:] = [name for name in dirs if Path(root) / name != prune]
    return result


def generated_usage(directory, baseline, *, prune=None):
    current = storage_snapshot(directory, prune=prune)
    changed = [entry for name, entry in current.items()
               if name not in baseline or entry[0] and entry != baseline[name]]
    return len(changed), sum(entry[0] for entry in changed)


class StorageMonitor:
    """Combine disjoint output and staged-descendant observations between full scans."""

    def __init__(self, directory, baseline, now):
        self.directory = directory
        self.staged = directory / 'inputs'
        self.baseline = baseline
        self.staged_usage = (0, 0)
        self.next_staged_scan = now + STAGED_MONITOR_INTERVAL

    def poll(self, now):
        count, size = generated_usage(self.directory, self.baseline, prune=self.staged)
        if now >= self.next_staged_scan:
            # The staged root itself belongs to the frequent scan, so summing
            # these disjoint inventories counts added/replaced entries once.
            self.staged_usage = generated_usage(self.staged, self.baseline)
            self.next_staged_scan = now + STAGED_MONITOR_INTERVAL
        return count + self.staged_usage[0], size + self.staged_usage[1]


def _children(pid):
    try:
        return [int(p) for p in Path(f'/proc/{pid}/task/{pid}/children').read_text().split()]
    except (FileNotFoundError, ProcessLookupError):
        return []


def _reap_descendants():
    """Linux subreaper owns orphaned descendants, even after setsid/double fork."""
    deadline = time.monotonic() + 5
    while True:
        pending = _children(os.getpid())
        queue = list(pending)
        for pid in queue:
            queue.extend(_children(pid))
        for pid in reversed(queue):
            try:
                os.kill(pid, signal.SIGKILL)
            except ProcessLookupError:
                pass
        try:
            while os.waitpid(-1, os.WNOHANG)[0]:
                pass
        except ChildProcessError:
            return
        if time.monotonic() >= deadline:
            raise RuntimeError('Build descendant termination did not complete')
        time.sleep(0.01)


def _supervise(request_path):
    """Dedicated Linux process, not a Qt worker preexec hook or a security sandbox."""
    import resource
    request = strict_json(Path(request_path).read_bytes())
    directory = Path(request['directory'])
    label = request['label']
    out_path, err_path = (directory / (label + suffix) for suffix in ('.stdout', '.stderr'))
    if ctypes.CDLL(None, use_errno=True).prctl(36, 1, 0, 0, 0) != 0:  # PR_SET_CHILD_SUBREAPER
        raise OSError(ctypes.get_errno(), 'Cannot supervise build descendants')
    # The inherited per-file ceiling complements total-storage polling. This is
    # resource control for trusted tools, not confinement of arbitrary processes.
    ceiling = max(FAILURE_LOG_BYTES * 4, request['max_bytes'])
    resource.setrlimit(resource.RLIMIT_FSIZE, (ceiling, ceiling))
    env = local_tool_environment()
    env.update(openin_any='p', openout_any='p', shell_escape='f')
    started, problem, code = time.monotonic(), '', -1
    terminating = False
    def request_stop(*_):
        nonlocal terminating
        terminating = True
    signal.signal(signal.SIGTERM, request_stop)
    with out_path.open('wb') as out, err_path.open('wb') as err:
        os.fchmod(out.fileno(), 0o600)
        os.fchmod(err.fileno(), 0o600)
        baseline = storage_snapshot(directory)
        monitor = StorageMonitor(directory, baseline, time.monotonic())
        process = subprocess.Popen(request['arguments'], cwd=request['cwd'], shell=False,
            env=env, stdin=subprocess.DEVNULL, stdout=out, stderr=err, start_new_session=True)
        try:
            while True:
                count, size = monitor.poll(time.monotonic())
                if count > request['max_files'] or size >= request['max_bytes']:
                    problem = 'Generated-file count or byte quota exceeded'
                if out_path.stat().st_size > MAX_LOG_BYTES or err_path.stat().st_size > MAX_LOG_BYTES:
                    problem = 'Tool output exceeded its size limit'
                if time.monotonic() - started > request['timeout'] or terminating:
                    problem = problem or 'Build exceeded its time limit or was terminated'
                code = process.poll()
                if problem or code is not None:
                    break
                time.sleep(MONITOR_INTERVAL)
        finally:
            # Always reap descendants, including after a normally exited parent.
            if process.poll() is None:
                try:
                    process.kill()
                except ProcessLookupError:
                    pass
            code = process.wait()
            _reap_descendants()
            # Include writes racing with parent exit and descendant cleanup.
            count, size = generated_usage(directory, baseline)
            if count > request['max_files'] or size >= request['max_bytes']:
                problem = 'Generated-file count or byte quota exceeded'
    if code == -signal.SIGXFSZ:
        problem = problem or 'Generated-file byte quota exceeded (per-file ceiling)'
    values = []
    limit = FAILURE_LOG_BYTES if problem else MAX_LOG_BYTES
    for path in (out_path, err_path):
        with path.open('rb') as stream:
            values.append(stream.read(limit))
    if problem:
        # This UUID directory belongs to this invocation only. Keep bounded
        # diagnostics; do not retain an oversized auxiliary or staged input tree.
        for path in directory.iterdir():
            if path.is_dir() and not path.is_symlink():
                shutil.rmtree(path)
            else:
                path.unlink()
        for path, raw in zip((out_path, err_path), values):
            path.write_bytes(raw)
            path.chmod(0o600)
    result = dict(code=code, stdout=values[0].decode('utf-8', errors='replace'),
                  stderr=values[1].decode('utf-8', errors='replace'), problem=problem)
    result_path = directory / (label + '.result.json')
    result_path.write_bytes(json_bytes(result))
    result_path.chmod(0o600)


def run_capture(arguments, cwd, directory, label, timeout, *,
                max_bytes=MAX_GENERATED_BYTES, max_files=MAX_GENERATED_FILES):
    """Exact shell-free invocation supervised outside Qt, with bounded retention."""
    if not build_supported():
        raise WorkspaceError('TeX building is available only on Linux/WSL2 with process-tree supervision; unavailable on this platform')
    request_path = directory / (label + '.request.json')
    request_path.write_bytes(json_bytes(dict(arguments=arguments, cwd=str(cwd),
        directory=str(directory), label=label, timeout=timeout,
        max_bytes=max_bytes, max_files=max_files)))
    request_path.chmod(0o600)
    # Use this installed application's code, never a module in the project.
    runner = 'import sys; sys.path.insert(0, sys.argv[1]); from theorem_terminal.latex_build import _supervise; _supervise(sys.argv[2])'
    process = subprocess.Popen([sys.executable, '-c', runner, str(Path(__file__).resolve().parents[1]), str(request_path)],
        cwd=directory, shell=False, env=local_tool_environment(),
        stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, start_new_session=True)
    try:
        _, error = process.communicate(timeout=timeout + 15)
    except subprocess.TimeoutExpired:
        process.terminate()
        _, error = process.communicate(timeout=10)
    request_path.unlink(missing_ok=True)
    if process.returncode:
        raise WorkspaceError('Build supervisor failed: ' + error[:FAILURE_LOG_BYTES].decode('utf-8', errors='replace'))
    result_path = directory / (label + '.result.json')
    result = strict_json(read_bounded(result_path, MAX_LOG_BYTES * 12, 'build capture'))
    result_path.unlink()
    return result['code'], result['stdout'], result['stderr'], result['problem']


def parse_diagnostics(text, cwd: Path, project: Path):
    result = []
    seen = set()
    for line in text.splitlines():
        match = re.match(r'^(.*?\.(?:tex|sty|cls)):(\d+):\s*(.*)$', line)
        if match:
            path = (cwd / match[1].strip('"')).resolve()
            if path.is_relative_to(project):
                item = (str(path), int(match[2]), match[3][:2000])
                if item not in seen:
                    seen.add(item)
                    result.append(dict(path=item[0], line=item[1], message=item[2]))
        elif line.startswith('! ') and len(result) < 1000:
            item = (None, None, line[2:2002])
            if item not in seen:
                seen.add(item)
                result.append(dict(path=None, line=None, message=item[2]))
        if len(result) >= 1000:
            break
    return result


def recorder_observations(raw: str, cwd: Path, project: Path, output: Path, *, source_directory=None):
    paths, outside = set(), set()
    working = cwd
    source_root = source_directory or project
    observed = False
    for line in raw.splitlines():
        if line.startswith('PWD '):
            working = Path(line[4:]).resolve()
        elif line.startswith('INPUT '):
            observed = True
            path = (working / line[6:].strip('"')).resolve()
            if path.is_relative_to(source_root) and (source_directory or not path.is_relative_to(output)):
                paths.add(project / path.relative_to(source_root))
            elif not path.is_relative_to(output):
                outside.add(str(path))
            if len(paths) + len(outside) > MAX_INPUTS:
                raise WorkspaceError('Recorder input list exceeds 4096 files')
    # No package/toolchain revision capture is implemented. Retain outside
    # observations rather than silently treating project-only hashes as complete.
    coverage = 'partial' if observed else 'unknown'
    return sorted(paths), sorted(outside), coverage


def recorder_inputs(raw, cwd, project, output, *, source_directory=None):
    return recorder_observations(raw, cwd, project, output, source_directory=source_directory)[0]


def bibliography_inputs(directory, source_directory, project, *, root_directory):
    """Bounded BibTeX database observations; no general TeX-log interpretation."""
    paths, outside = set(), set()
    for log in directory.rglob('*.blg'):
        text = read_bounded(log, MAX_LOG_BYTES, 'bibliography log').decode('utf-8', errors='replace')
        for line in text.splitlines():
            match = re.match(r'Database file #\d+: (.+)$', line)
            if match:
                path = (log.parent / match[1]).resolve()
                if not Path(match[1]).is_absolute():
                    # A same-named file beside the log does not establish which
                    # file BibTeX used. Retain an existing selected-root staged
                    # candidate conservatively, even if build output now shadows it.
                    candidate = (root_directory / match[1]).resolve()
                    if candidate.is_relative_to(source_directory) and candidate.is_file():
                        paths.add(project / candidate.relative_to(source_directory))
                    if not path.is_file():
                        path = candidate
                if path.is_relative_to(source_directory):
                    paths.add(project / path.relative_to(source_directory))
                elif not path.is_relative_to(directory):
                    outside.add(str(path))
    return paths, outside


def run_latex(project: Path, tex_root: Path, build_storage: Path, *, configured_engine='', timeout=180):
    """Perform one explicitly requested tool invocation and retain its observations."""
    project, tex_root = project.resolve(), tex_root.resolve()
    if not tex_root.is_relative_to(project) or tex_root.suffix.lower() != '.tex' or not tex_root.is_file():
        raise WorkspaceError('Select an existing project TeX file as the root')
    if build_storage.resolve().is_relative_to(project):
        raise WorkspaceError('Build storage must be outside the project')
    name = configured_engine or shutil.which('latexmk') or shutil.which('pdflatex')
    if not name:
        raise WorkspaceError('No TeX tool is available. Install latexmk and a TeX distribution, or configure an installed engine')
    if not build_supported():
        raise WorkspaceError('TeX building is unavailable on this platform; Linux/WSL2 process supervision is required')
    engine = validated_tex_executable(name, project)
    pdf_engine = validated_tex_executable('pdflatex', project) if Path(engine).name == 'latexmk' else None
    identifier = str(uuid4())
    directory = build_storage / identifier
    private_directory(directory)
    source_directory = directory / 'inputs'
    before = input_snapshot(project, source_directory)
    staged_root = source_directory / tex_root.relative_to(project)
    # latexmk associates a discovered root .bbl with the .aux beside it.
    # Place the supplied copy beside generated auxiliaries, rather than omitting
    # it based on unrelated .bib files or letting latexmk look for a source .aux.
    supplied_bbl = staged_root.with_suffix('.bbl')
    root_bbl = directory / (tex_root.stem + '.bbl')
    if supplied_bbl.exists():
        supplied_bbl.replace(root_bbl)
    arguments = build_arguments(engine, staged_root, directory, pdf_engine=pdf_engine)
    started_at = utc_now()
    version_args = [engine, '-v' if Path(engine).name.lower().removesuffix('.exe') == 'latexmk' else '--version']
    version_code, version_out, version_err, version_problem = run_capture(version_args, directory, directory, 'version', 10)
    if version_problem:
        code, out, err, problem = version_code, '', '', version_problem
    else:
        code, out, err, problem = run_capture(arguments, staged_root.parent, directory, 'build', timeout)
    ended_at = utc_now()
    log_path = directory / (tex_root.stem + '.log')
    log = b''
    log_digest = None
    if log_path.exists():
        try:
            log = read_bounded(log_path, MAX_LOG_BYTES, 'TeX log')
            log_digest = sha256(log).hexdigest()
        except (OSError, ValueError):
            problem = (problem + '; ' if problem else '') + 'TeX log unavailable or exceeds 4 MiB; log digest unavailable'
    fls_path = directory / (tex_root.stem + '.fls')
    fls = b''
    if fls_path.exists():
        try:
            fls = read_bounded(fls_path, MAX_LOG_BYTES, 'TeX recorder')
        except (OSError, ValueError):
            problem = (problem + '; ' if problem else '') + 'Recorder unavailable or exceeds 4 MiB'
    paths, outside_inputs, coverage = recorder_observations(fls.decode('utf-8', errors='replace'), staged_root.parent, project, directory, source_directory=source_directory)
    bib_paths, bib_outside = bibliography_inputs(directory, source_directory, project,
                                                root_directory=staged_root.parent)
    outside_inputs = sorted(set(outside_inputs) | bib_outside)
    paths = set(paths) | bib_paths
    # A still-identical supplied .bbl was an input. A replaced copy is generated
    # bibliography output; its .bib inputs are observed through the BibTeX log.
    original_bbl = tex_root.with_suffix('.bbl')
    if root_bbl.exists() and str(original_bbl) in before and file_digest(root_bbl) == before[str(original_bbl)]:
        paths.add(original_bbl)
    paths.add(tex_root)
    if len(paths) + len(outside_inputs) > MAX_INPUTS:
        raise WorkspaceError(f'Combined build input observations exceed {MAX_INPUTS} files')
    inputs = []
    for path in sorted(paths):
        try:
            after = file_digest(path)
        except (OSError, ValueError):
            after = None
        revision = before.get(str(path))
        try:
            staged_revision = file_digest(root_bbl if path == original_bbl else source_directory / path.relative_to(project))
        except (OSError, ValueError):
            staged_revision = None
        inputs.append(dict(path=str(path), before=revision, revision=revision,
                           stable=revision is not None and revision == after == staged_revision))
    pdf_path = directory / (tex_root.stem + '.pdf')
    pdf_digest = None
    if code == 0 and not problem and pdf_path.exists():
        pdf_raw = read_bounded(pdf_path, MAX_PDF_BYTES, 'PDF output')
        if pdf_raw.startswith(b'%PDF-'):
            pdf_digest = sha256(pdf_raw).hexdigest()
    success = code == 0 and pdf_digest is not None and not problem
    report = dict(schema='theorem-terminal.latex-build', schema_version=1, id=identifier,
                  project=str(project), tex_root=str(tex_root), tool_path=engine,
                  version_arguments=version_args, tool_version=version_out, version_stderr=version_err,
                  version_exit_code=version_code, version_problem=version_problem,
                  arguments=arguments, working_directory=str(staged_root.parent), source_directory=str(source_directory), started_at=started_at,
                  ended_at=ended_at, exit_code=code, stdout=out, stderr=err, problem=problem,
                  log_digest=log_digest, recorder_digest=sha256(fls).hexdigest() if fls else None,
                  recorder_available=bool(fls), inputs=inputs, success=success,
                  dependency_coverage=coverage, outside_inputs=outside_inputs,
                  pdf_file=pdf_path.name if pdf_digest else None, pdf_digest=pdf_digest,
                  diagnostics=parse_diagnostics(out + '\n' + err + '\n' + log.decode('utf-8', errors='replace'), staged_root.parent, source_directory))
    # Diagnostics refer back to ordinary project files, never editable build copies.
    for item in report['diagnostics']:
        if item['path'] and Path(item['path']).is_relative_to(source_directory):
            item['path'] = str(project / Path(item['path']).relative_to(source_directory))
    raw = json_bytes(report)
    if len(raw) > MAX_REPORT_BYTES:
        raise WorkspaceError('Build report exceeds its size limit; output files remain in local build storage')
    save_mutable(directory / 'report.json', raw, previous=None, lock_root=build_storage.parent.parent.parent / 'locks')
    return report


def load_build(build_storage: Path, identifier: str, project: Path):
    if re.fullmatch(r'[0-9a-f-]{36}', identifier) is None:
        raise WorkspaceError('Invalid build identity')
    report = strict_json(read_bounded(build_storage / identifier / 'report.json', MAX_REPORT_BYTES, 'build report'))
    if not isinstance(report, dict) or report.get('schema') != 'theorem-terminal.latex-build' or report.get('schema_version') != 1 or report.get('id') != identifier or report.get('project') != str(project):
        raise WorkspaceError('Invalid or mismatched local build report')
    expected = {'schema', 'schema_version', 'id', 'project', 'tex_root', 'tool_path',
                'version_arguments', 'tool_version', 'version_stderr', 'version_exit_code',
                'version_problem', 'arguments', 'working_directory', 'started_at', 'ended_at',
                'exit_code', 'stdout', 'stderr', 'problem', 'log_digest', 'recorder_digest',
                'recorder_available', 'inputs', 'success', 'pdf_file', 'pdf_digest', 'diagnostics'}
    if 'dependency_coverage' in report or 'outside_inputs' in report:
        expected.update(('dependency_coverage', 'outside_inputs'))
        if report.get('dependency_coverage') not in ('complete', 'partial', 'unknown'):
            raise WorkspaceError('Invalid dependency coverage')
        outside = report.get('outside_inputs')
        if not isinstance(outside, list) or len(outside) > MAX_INPUTS or any(not isinstance(p, str) or len(p) > 4096 or not Path(p).is_absolute() for p in outside):
            raise WorkspaceError('Invalid external input observations')
        if outside and report['dependency_coverage'] == 'complete':
            raise WorkspaceError('Untracked external inputs cannot have complete coverage')
    if 'source_directory' in report:
        expected.add('source_directory')
        if report['source_directory'] != str(build_storage / identifier / 'inputs'):
            raise WorkspaceError('Invalid local build input directory')
    if set(report) != expected or type(report['schema_version']) is not int:
        raise WorkspaceError('Invalid build report fields')
    for key in ('tex_root', 'tool_path', 'tool_version', 'version_stderr', 'version_problem',
                'working_directory', 'started_at', 'ended_at', 'stdout', 'stderr', 'problem'):
        if not isinstance(report[key], str) or len(report[key].encode('utf-8')) > MAX_LOG_BYTES * 3:
            raise WorkspaceError('Invalid build report text')
    if not Path(report['tex_root']).is_relative_to(project):
        raise WorkspaceError('Build root is outside the project')
    for key in ('arguments', 'version_arguments'):
        if not isinstance(report[key], list) or not 1 <= len(report[key]) <= 64 or any(not isinstance(arg, str) or len(arg) > 4096 for arg in report[key]):
            raise WorkspaceError('Invalid recorded tool arguments')
    for key in ('log_digest', 'recorder_digest', 'pdf_digest'):
        if report[key] is not None and (not isinstance(report[key], str) or re.fullmatch('[0-9a-f]{64}', report[key]) is None):
            raise WorkspaceError('Invalid build artifact digest')
    for key in ('exit_code', 'version_exit_code'):
        if type(report[key]) is not int:
            raise WorkspaceError('Invalid tool exit code')
    if type(report['recorder_available']) is not bool:
        raise WorkspaceError('Invalid recorder flag')
    if not isinstance(report.get('inputs'), list) or len(report['inputs']) > MAX_INPUTS:
        raise WorkspaceError('Invalid build input observations')
    for item in report['inputs']:
        if not isinstance(item, dict) or set(item) != {'path', 'before', 'revision', 'stable'} or not isinstance(item['path'], str) or not Path(item['path']).is_relative_to(project):
            raise WorkspaceError('Invalid build input path')
        for key in ('before', 'revision'):
            if item[key] is not None and (not isinstance(item[key], str) or re.fullmatch('[0-9a-f]{64}', item[key]) is None):
                raise WorkspaceError('Invalid build input revision')
        if type(item['stable']) is not bool:
            raise WorkspaceError('Invalid build input observation')
    if type(report.get('success')) is not bool or not isinstance(report.get('diagnostics'), list):
        raise WorkspaceError('Invalid build result')
    if len(report['diagnostics']) > 1000:
        raise WorkspaceError('Too many build diagnostics')
    for item in report['diagnostics']:
        if not isinstance(item, dict) or set(item) != {'path', 'line', 'message'} or not isinstance(item['message'], str):
            raise WorkspaceError('Invalid build diagnostic')
        if item['path'] is not None:
            if not isinstance(item['path'], str) or not Path(item['path']).is_relative_to(project) or type(item['line']) is not int or not 1 <= item['line'] <= 1000000000:
                raise WorkspaceError('Invalid diagnostic file or line')
        elif item['line'] is not None:
            raise WorkspaceError('Invalid diagnostic location')
    # Earlier local build reports remain readable without rewriting their bytes.
    report.setdefault('dependency_coverage', 'unknown')
    report.setdefault('outside_inputs', [])
    return report


def stale_inputs(report):
    stale = []
    total = 0
    for item in report['inputs']:
        path = Path(item['path'])
        try:
            total += path.stat().st_size
            if total > MAX_TOTAL_INPUT_BYTES:
                raise WorkspaceError('Recorded input revisions exceed the 256 MiB observation limit')
            current = file_digest(path) if path.resolve() == path else None
        except (OSError, ValueError):
            current = None
        if not item['stable'] or current != item['revision']:
            stale.append(item['path'])
    return stale


def pdf_bytes(build_storage, report):
    name = report.get('pdf_file')
    if not report.get('success') or not isinstance(name, str) or Path(name).name != name or '/' in name or '\\' in name:
        raise WorkspaceError('This build has no successful PDF output')
    raw = read_bounded(build_storage / report['id'] / name, MAX_PDF_BYTES, 'PDF output')
    if sha256(raw).hexdigest() != report.get('pdf_digest'):
        raise WorkspaceError('PDF output changed (SHA-256 mismatch)')
    return raw


def build_log(build_storage, report):
    """Read the captured TeX log through its exact recorded digest and bound."""
    if report['log_digest'] is None:
        return 'No bounded TeX log was available for this invocation.'
    path = build_storage / report['id'] / (Path(report['tex_root']).stem + '.log')
    raw = read_bounded(path, MAX_LOG_BYTES, 'TeX log')
    if sha256(raw).hexdigest() != report['log_digest']:
        raise WorkspaceError('TeX log changed (SHA-256 mismatch)')
    return raw.decode('utf-8', errors='replace')
