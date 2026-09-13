"""Corpus-neutral controller/recovery tests; fixture checks are structural only."""

from contextlib import ExitStack
from copy import deepcopy
from dataclasses import asdict, field
from hashlib import sha256
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from test_model_projection import model_call_document, encode
from theorem_terminal.documentary_warrant import parse_documentary_projection
from theorem_terminal.model_projection import parse_finalized_model_call
from theorem_terminal.response_review import passages, render_response_review
from theorem_terminal.mutable_files import MutableFileError, file_lock, save_mutable
from theorem_terminal.workspace import (BufferState, MAX_TEXT_BYTES, PaneViewState, VERSION,
                                        WorkMarker, Workspace, WorkspaceError, WorkspaceStore,
                                        decode_workspace, encode_workspace)
from theorem_terminal.workstation import Workstation

def mathematical_project(root):
    files = {
        "notes/differences.tex": "\\section{Finite differences}\r\nLet $\\Delta f(n)=f(n+1)-f(n)$.\r\n",
        "formal/Basic.lean": "theorem add_zero (n : Nat) : n + 0 = n := Nat.add_zero n\n",
        "calculations/polynomials.sage": "R.<x> = PolynomialRing(QQ)\nf = x^4\nprint(f(x+1)-f(x))\n",
        "calculations/check.py": "def delta(f, n):\n    return f(n + 1) - f(n)\n",
        "proof.md": "# A proof attempt\n\nExpand the leading term of (n+1)^d.\n",
        "questions.txt": "Does the degree drop by exactly one in characteristic zero?\n",
    }
    result = {}
    for name, content in files.items():
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content.encode("utf-8"))
        result[name] = path
    return result


def historical_workspace(root, version):
    """Literal v3/v4 wire data; never generated from the current dataclasses."""
    path = str(root / 'proof.md')
    identifier = '11111111-1111-1111-1111-111111111111'
    marker = dict(path=path, revision='a' * 64, start='3.00', end='3.07')
    data = dict(schema='theorem-terminal.workspace', schema_version=version, root=str(root),
        buffers=[dict(id=identifier, path=path, format='text', revision='a' * 64,
            readonly=False, external=False, companion=None, companion_revision=None,
            cursor='3.07', selection=['3.00', '3.07'], yscroll=.7, xscroll=.2,
            was_dirty=True, review_mode='index', review_number=1)],
        active=identifier, visible=[identifier, identifier], active_pane=1, split=True,
        recent=[path], marker=marker, tex_root=None, last_build=None, successful_build=None,
        pdf_page=7, pdf_zoom='custom', pdf_scale=1.4, pdf_visible=True, window_size=[960, 680])
    if version in (4, 5):
        data['selection_shelf'] = [dict(path=path, revision='b' * 64, start='1.00', end='1.05'), marker.copy()]
    if version == 5:
        item = data['buffers'][0]
        for key in ('cursor', 'selection', 'yscroll', 'xscroll'):
            del item[key]
        item['pane_views'] = [dict(cursor='3.7', selection=['3.0', '3.7'], yscroll=.7, xscroll=.2),
                              dict(cursor='3.7', selection=['3.0', '3.7'], yscroll=.7, xscroll=.2)]
        for entry in [data['marker'], *data['selection_shelf']]:
            for key in ('start', 'end'):
                entry[key] = '.'.join(str(int(n)) for n in entry[key].split('.'))
    return data


def verification_fixture():
    """Synthetic validator input only; never an attestation of a real check."""
    digest = {"algorithm": "sha256", "value": "0" * 64}
    profile = {"id": "synthetic-profile", "system": "J0", "syntax_version": "synthetic",
               "rule_version": "synthetic", "checker": "synthetic", "checker_version": "synthetic",
               "constant_specification": None}
    context = {"id": "synthetic-context", "profile": profile["id"], "admissions": [],
               "predecessor": None, "change_kind": "initial", "added": [], "removed": [],
               "created_by": {"kind": "system", "id": "test-only"},
               "rationale": "Synthetic structural validation test", "created_at": "2026-09-09T00:00:00Z"}
    environment = {"lean_version": "synthetic", "lean_commit": "synthetic",
                   "toolchain_digest": digest, "lakefile_digest": digest, "lake_manifest_digest": digest,
                   "fixture_source": {"path": "test-only", "digest": digest},
                   "checker_source_closure": [], "checked_artifacts": []}
    embedded = {"id": "test-only-verification", "subject": "test-only-derivation",
                "claim_checked": "Synthetic validator fixture; no check was performed",
                "method": "justification_checker", "result": "passed", "checker": "synthetic",
                "checker_revision": "synthetic", "environment": environment,
                "profile": profile["id"], "context": context["id"], "at": "2026-09-09T00:00:00Z"}
    bundle = {"schema": "theorem-terminal.justification-bundle", "schema_version": 1,
              "fixture_id": "synthetic-test-only", "profile": profile, "claims": [],
              "admissions": [], "external_verifications": [], "related_source_bindings": [],
              "context": context, "justification_verification": embedded,
              "derivation": {"id": "test-only-derivation", "profile": profile["id"],
                             "context": context["id"], "conclusion": ["bottom"], "nodes": [],
                             "constant_specification_footprint": [], "certificate_version": "synthetic",
                             "dependency_refs": []}}
    assertion = "Synthetic test claim: n + 0 = n"
    claim = {"id": "test-claim", "display_name": "Synthetic equality", "assertion": assertion,
             "description": "Test data, not a mathematical attestation", "representation_refs": [],
             "content_hash": {"algorithm": "sha256", "value": sha256(assertion.encode()).hexdigest()}}
    formula = ["reason", ["variable", "test-reason"], ["atom", {"id": claim["id"], "content_hash": claim["content_hash"]}]]
    admission = {"id": "test-admission", "formula": formula, "basis_refs": [],
                 "admitted_by": {"kind": "human", "id": "test-only"}, "rationale": "Synthetic test input",
                 "scope": context["id"], "at": context["created_at"], "supersedes": None}
    bundle["claims"], bundle["admissions"] = [claim], [admission]
    context["admissions"] = [admission["id"]]
    context["added"] = [admission["id"]]
    bundle["derivation"]["conclusion"] = formula
    bundle["derivation"]["nodes"] = [{"index": 0, "formula": formula, "rule": {"kind": "premise", "admission_id": admission["id"]}}]
    raw = encode(bundle)
    verification = {"id": embedded["id"], "subject": embedded["subject"],
                    "claim": embedded["claim_checked"], "method": "justification_checker",
                    "status": "verified", "checker_revision": "synthetic", "environment": environment,
                    "profile": profile, "context": context,
                    "artifact_identity": {key: bundle[key] for key in ("schema", "schema_version", "fixture_id")},
                    "artifact_digest": {"algorithm": "sha256", "value": sha256(raw).hexdigest()},
                    "at": embedded["at"]}
    return encode(verification), raw


class WorkstationTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.home = Path(temporary.name)
        self.root = self.home / 'project'
        self.root.mkdir()
        self.state_root = self.home / 'state'
        self.files = mathematical_project(self.root)
        self.controller = Workstation(state_root=self.state_root)
        self.controller.open_project(self.root)
        self.manifest = self.controller.store.path

    def restored(self):
        controller = Workstation(state_root=self.state_root)
        controller.open_project(self.root)
        return controller

    def snapshot(self):
        return {str(p.relative_to(self.root)): p.read_bytes() if p.is_file() else None for p in self.root.rglob('*')}

    def call(self, response='First α\r\n\r\nSecond β\n\nFirst α\r\n'):
        path = self.root / 'completed.json'
        path.write_bytes(encode(model_call_document(response=response)))
        return self.controller.open_record(path, 'model_call')

    def test_edit_changes_memory_without_serialization_or_recovery_io(self):
        b = self.controller.open_file(self.files['proof.md'])
        with patch('theorem_terminal.workspace.json_bytes', side_effect=AssertionError('per-edit serialization')), patch.object(self.controller.store, 'write_recovery', side_effect=AssertionError('per-edit write')), patch.object(self.controller.store, 'clear_recovery', side_effect=AssertionError('per-edit removal')):
            self.controller.edit(b.state.id, b.original + 'An unfinished calculation.')
            self.controller.edit(b.state.id, b.original)
        self.assertFalse(b.dirty)
        self.assertTrue(self.controller.checkpoint())

    def test_two_process_two_project_interleaving_and_tool_collisions(self):
        second = self.home / 'another-project'
        second.mkdir()
        mathematical_project(second)
        script = """
import sys
from pathlib import Path
from theorem_terminal.workstation import Workstation
c=Workstation(state_root=Path(sys.argv[2]))
print('ready', flush=True)
for command in sys.stdin:
    command=command.strip()
    if command == 'open': c.open_project(Path(sys.argv[1]))
    elif command == 'checkpoint': assert c.checkpoint(), c.persistence_error
    elif command == 'close': c.close_project()
    print('ok', flush=True)
"""
        import queue, threading
        def answer(child):
            messages = queue.Queue()
            threading.Thread(target=lambda: messages.put(child.stdout.readline()), daemon=True).start()
            return messages.get(timeout=15).strip()
        children = [subprocess.Popen([sys.executable, '-c', script, str(root), str(self.state_root)],
            stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            for root in (self.root, second)]
        try:
            for child in children:
                self.assertEqual(answer(child), 'ready')
            for command in ('open', 'checkpoint', 'close', 'open', 'checkpoint', 'close'):
                for child in children:
                    child.stdin.write(command + '\n')
                    child.stdin.flush()
                    self.assertEqual(answer(child), 'ok', command)
            for child in children:
                child.stdin.close()
                child.stdin = None
                out, err = child.communicate(timeout=10)
                self.assertEqual(child.returncode, 0, err)
        finally:
            for child in children:
                if child.poll() is None:
                    child.kill()
                    child.communicate()
        from theorem_terminal.tool_settings import SettingsStore
        a, b = SettingsStore(self.state_root), SettingsStore(self.state_root)
        a.configure('editor', 'vim +{line} {file}')
        with self.assertRaisesRegex(WorkspaceError, 'another process'):
            b.configure('editor', 'nvim +{line} {file}')
        b.save()  # A rejected tool change must not poison later checkpoints.
        self.assertEqual(b.settings.editor, a.settings.editor)
        self.assertEqual(set(b.settings.recent_projects), {str(self.root), str(second)})

    def test_project_open_view_close_leaves_every_byte_and_path_unchanged(self):
        before = self.snapshot()
        self.controller.close_project()
        self.controller.open_project(self.root)
        with patch('theorem_terminal.workstation.os.scandir', wraps=os.scandir) as scan:
            entries = self.controller.entries(self.root)
            scan.assert_called_once_with(self.root)
        self.assertEqual({e.path.name for e in entries if e.directory}, {'notes', 'formal', 'calculations'})
        for path in self.files.values():
            buffer = self.controller.open_file(path)
            self.assertTrue(buffer.editable)
            self.assertEqual(buffer.content.encode(), path.read_bytes())
        self.controller.close_project()
        self.assertEqual(before, self.snapshot())
        self.assertFalse((self.root / '.theorem-terminal').exists())
        self.assertFalse(self.manifest.is_relative_to(self.root))

    def test_project_content_cannot_configure_tools_or_restore_external_files(self):
        path = self.root / '.theorem-terminal' / 'editor-state.json'
        path.parent.mkdir()
        malicious = {'editor_command': 'evil --execute', 'buffers': [{'path': '/etc/passwd'}], 'schema_version': 2}
        path.write_bytes(encode(malicious))
        (self.root / 'settings.json').write_bytes(encode({'editor': ['evil']}))
        before = self.snapshot()
        self.controller.close_project()
        restored = self.restored()
        self.assertEqual(restored.settings_store.settings.editor, [])
        self.assertFalse(restored.buffers)
        restored.close_project()
        self.assertEqual(before, self.snapshot())

    def test_restore_is_deferred_and_bounds_missing_changed_large_unsupported_files(self):
        opened = [self.controller.open_file(path) for path in self.files.values()]
        self.controller.close_project()
        Path(opened[0].state.path).unlink()
        Path(opened[1].state.path).write_text('Changed externally')
        Path(opened[2].state.path).write_bytes(b'x' * (MAX_TEXT_BYTES + 1))
        with patch('theorem_terminal.workstation.text_snapshot', side_effect=AssertionError('eager source read')):
            restored = self.restored()
        self.assertTrue(all(not b.loaded for b in restored.buffers.values()))
        for buffer in opened[:3]:
            loaded = restored.view(buffer.state.id)
            self.assertTrue(loaded.problem)
            self.assertFalse(loaded.editable)
        for name, raw in (('bad.bin', b'\0\xff'), ('bad.txt', b'\xff'), ('bad.pdf', b'%PDF-1.7')):
            path = self.root / name
            path.write_bytes(raw)
            with self.assertRaises(ValueError):
                restored.open_file(path)
            self.assertEqual(path.read_bytes(), raw)

    def test_complete_process_restart_keeps_selection_split_recent_marker_and_pdf_state(self):
        buffers = [self.controller.open_file(path) for path in self.files.values()]
        left, right = buffers[0], buffers[4]
        self.controller.activate(left.state.id, 0)
        self.controller.set_split(True)
        self.controller.activate(right.state.id, 1)
        self.controller.set_position(right.state.id, cursor='3.7', selection=['3.0', '3.7'], yscroll=.25, xscroll=.1)
        self.controller.mark(right.state.id, '3.0', '3.7')
        self.controller.set_pdf_view(page=3, zoom='page', scale=.8)
        self.controller.close_project()
        script = '''
import sys
from pathlib import Path
from theorem_terminal.workstation import Workstation
from theorem_terminal.workspace import encode_workspace
c = Workstation(state_root=Path(sys.argv[2]))
c.open_project(Path(sys.argv[1]))
assert not any(b.loaded for b in c.buffers.values())
assert c.view().content.startswith('# A proof')
print(encode_workspace(c.current()).decode())
'''
        process = subprocess.run([sys.executable, '-c', script, str(self.root), str(self.state_root)], check=True, capture_output=True, text=True)
        state = json.loads(process.stdout)
        self.assertEqual(state['visible'], [left.state.id, right.state.id])
        self.assertEqual(state['active'], right.state.id)
        self.assertEqual(state['marker']['start'], '3.0')
        self.assertEqual((state['pdf_page'], state['pdf_zoom'], state['pdf_scale']), (3, 'page', .8))
        self.assertTrue(state['pdf_visible'])
        self.assertEqual(state['recent'][0], str(self.files['proof.md']))
        current = next(b for b in state['buffers'] if b['id'] == right.state.id)
        self.assertEqual(current['pane_views'][1]['selection'], ['3.0', '3.7'])
        for excluded in ('objective', 'hypotheses', 'relationships', 'editor_command', 'adapter'):
            self.assertNotIn(excluded, state)

    def test_killed_process_recovers_exact_unsaved_text_privately(self):
        self.controller.close_project()
        text = 'Unsaved mathematics α → β\r\n\r\nKeep the exact selection.\n'
        script = '''
import sys, time
from pathlib import Path
from theorem_terminal.workstation import Workstation
c=Workstation(state_root=Path(sys.argv[2]))
c.open_project(Path(sys.argv[1]))
b=c.open_file(Path(sys.argv[1])/'proof.md')
c.edit(b.state.id, sys.argv[3])
assert c.checkpoint()
print('ready', flush=True)
time.sleep(120)
'''
        original = self.files['proof.md'].read_bytes()
        process = subprocess.Popen([sys.executable, '-c', script, str(self.root), str(self.state_root), text], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.addCleanup(lambda: process.kill() if process.poll() is None else None)
        self.assertEqual(process.stdout.readline().strip(), 'ready')
        process.kill()
        process.communicate(timeout=10)
        restored = self.restored()
        buffer = restored.view()
        self.assertEqual(buffer.content, text)
        self.assertTrue(buffer.dirty)
        self.assertIn('recovered', buffer.recovery_warning)
        recovery = restored.store.recovery_path(buffer.state.id)
        self.assertFalse(recovery.is_relative_to(self.root))
        if os.name == 'posix':
            self.assertEqual(recovery.stat().st_mode & 0o777, 0o600)
        self.assertEqual(self.files['proof.md'].read_bytes(), original)
        restored.save()
        self.assertFalse(recovery.exists())
        self.assertEqual(self.files['proof.md'].read_bytes(), text.encode())

    def test_missing_and_externally_changed_dirty_files_recover_without_replacement(self):
        buffer = self.controller.open_file(self.files['proof.md'])
        self.controller.edit(buffer.state.id, 'My unfinished proof α\n')
        self.assertTrue(self.controller.checkpoint())
        self.assertTrue(self.controller.checkpoint())
        self.files['proof.md'].write_text('Other editor revision\n')
        restored = self.restored()
        loaded = restored.view()
        self.assertEqual(loaded.content, 'My unfinished proof α\n')
        self.assertTrue(loaded.editable)
        self.assertEqual(loaded.status, 'Conflicted')
        with self.assertRaisesRegex(WorkspaceError, 'mismatch'):
            restored.save()
        self.assertEqual(self.files['proof.md'].read_text(), 'Other editor revision\n')
        restored.refresh(discard=True)
        self.assertEqual(restored.buffer().content, 'Other editor revision\n')
        self.assertFalse(restored.store.recovery_path(buffer.state.id).exists())

    def test_untitled_recovery_and_explicit_discard(self):
        buffer = self.controller.new_buffer()
        self.controller.edit(buffer.state.id, 'New calculation\n')
        self.controller.close_project(keep_recovery=True)
        restored = self.restored()
        self.assertEqual(restored.view().content, 'New calculation\n')
        self.assertIsNone(restored.buffer().state.path)
        restored.discard(buffer.state.id)
        self.assertFalse(restored.store.recovery_path(buffer.state.id).exists())
        restored.close_project()

    def test_failed_final_checkpoint_blocks_close_and_preserves_memory(self):
        buffer = self.controller.open_file(self.files['proof.md'])
        self.controller.edit(buffer.state.id, 'Irreplaceable unsaved text')
        with patch.object(self.controller.store, 'save', side_effect=OSError('checkpoint denied')):
            self.assertFalse(self.controller.checkpoint())
            with self.assertRaisesRegex(WorkspaceError, 'Final checkpoint failed'):
                self.controller.close_project(keep_recovery=True)
        self.assertIsNotNone(self.controller.workspace)
        self.assertEqual(self.controller.buffer().content, 'Irreplaceable unsaved text')
        self.assertTrue(self.controller.checkpoint())

    def test_kernel_lock_dies_with_process_and_does_not_block_later_saves(self):
        path = self.files['proof.md']
        lock_root = self.state_root / 'locks'
        script = '''
import sys,time
from pathlib import Path
from theorem_terminal.mutable_files import file_lock
with file_lock(Path(sys.argv[1]), Path(sys.argv[2])):
 print('locked', flush=True)
 time.sleep(120)
'''
        process = subprocess.Popen([sys.executable, '-c', script, str(path), str(lock_root)], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.addCleanup(lambda: process.kill() if process.poll() is None else None)
        self.assertEqual(process.stdout.readline().strip(), 'locked')
        original = path.read_bytes()
        with self.assertRaisesRegex(MutableFileError, 'Another process'):
            save_mutable(path, b'new', previous=original, lock_root=lock_root)
        process.kill()
        process.communicate(timeout=10)
        self.assertTrue(list(lock_root.glob('*.lock')))
        save_mutable(path, b'new', previous=original, lock_root=lock_root)
        self.assertEqual(path.read_bytes(), b'new')
        self.assertFalse(list(self.root.rglob('*.lock')))

    def test_atomic_mutable_failures_preserve_complete_destination_and_allow_retry(self):
        path = self.files['proof.md']
        original = path.read_bytes()
        with patch('theorem_terminal.mutable_files.os.replace', side_effect=OSError('replace denied')):
            with self.assertRaises(OSError):
                save_mutable(path, b'new', previous=original, lock_root=self.state_root / 'locks')
        self.assertEqual(path.read_bytes(), original)
        self.assertFalse(list(path.parent.glob('.*.tmp')))
        save_mutable(path, b'new', previous=original, lock_root=self.state_root / 'locks')
        with self.assertRaisesRegex(MutableFileError, 'changed on disk'):
            save_mutable(path, b'stale', previous=original, lock_root=self.state_root / 'locks')
        self.assertEqual(path.read_bytes(), b'new')

    def test_mixed_newline_edit_preserves_unchanged_bytes(self):
        from theorem_terminal.workstation import preserve_newlines
        previous = 'First α\r\nSecond β\nThird γ\rFourth δ'
        self.assertEqual(preserve_newlines(previous, previous.replace('\r\n', '\n').replace('\r', '\n')), previous)
        self.assertEqual(preserve_newlines(previous, 'First α\nChanged β\nThird γ\nFourth δ'),
                         'First α\r\nChanged β\nThird γ\rFourth δ')

    def test_saved_copy_survives_crash_before_recovery_cleanup(self):
        buffer = self.controller.open_file(self.files['proof.md'])
        self.controller.edit(buffer.state.id, 'Saved in a new file α\n')
        destination = self.root / 'new-proof.tex'
        with patch.object(self.controller.store, 'clear_recovery', side_effect=OSError('simulated crash at cleanup')):
            with self.assertRaises(OSError):
                self.controller.save_as(buffer.state.id, destination)
        restored = self.restored()
        recovered = restored.view()
        self.assertEqual(recovered.state.path, str(destination))
        self.assertEqual(recovered.content, 'Saved in a new file α\n')
        self.assertFalse(recovered.problem)
        self.assertFalse(recovered.dirty)

    def test_save_bytes_crlf_permissions_conflict_and_no_overwrite(self):
        path = self.files['notes/differences.tex']
        path.chmod(0o640)
        buffer = self.controller.open_file(path)
        original = path.read_bytes()
        self.controller.save()
        self.assertEqual(path.read_bytes(), original)
        self.controller.edit(buffer.state.id, buffer.content + '% New detail\r\n')
        self.controller.save()
        self.assertEqual(path.read_bytes(), original + b'% New detail\r\n')
        if os.name == 'posix':
            self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o640)
        new = self.controller.new_buffer()
        self.controller.edit(new.state.id, 'do not overwrite')
        with self.assertRaises(FileExistsError):
            self.controller.save_as(new.state.id, self.files['questions.txt'])
        path.write_bytes(b'Competing save\n')
        with self.assertRaisesRegex(WorkspaceError, 'mismatch'):
            self.controller.save(buffer.state.id)

    @unittest.skipUnless(Path('/mnt/c').is_dir(), '/mnt/c is not available')
    def test_disposable_windows_mounted_project(self):
        # This checkout is writable by the authorized test run. Keep the test
        # project outside the repository to avoid changing its worktree.
        parent = Path(__file__).resolve().parents[2]
        if not str(parent).lower().startswith('/mnt/c/'):
            self.skipTest('No authorized /mnt/c project parent in this checkout')
        with tempfile.TemporaryDirectory(prefix='mrw-filesystem-test-', dir=parent) as directory:
            root = Path(directory)
            path = root / 'proof.tex'
            path.write_bytes(b'Original\r\n')
            c = Workstation(state_root=self.state_root / 'mounted')
            c.open_project(root)
            b = c.open_file(path)
            c.edit(b.state.id, 'Modified α\r\n')
            c.save()
            c.close_project()
            self.assertEqual(path.read_bytes(), 'Modified α\r\n'.encode())
            self.assertEqual({p.name for p in root.iterdir()}, {'proof.tex'})

    def test_notebook_is_recognized_and_never_editable_json(self):
        path = self.root / 'calculation.ipynb'
        raw = encode({'nbformat': 4, 'nbformat_minor': 5, 'metadata': {}, 'cells': [{'cell_type': 'code', 'source': ['2+2'], 'outputs': [], 'execution_count': None, 'metadata': {}}]})
        path.write_bytes(raw)
        buffer = self.controller.open_file(path)
        self.assertEqual(buffer.state.format, 'notebook')
        self.assertIn('1 cells', buffer.content)
        self.assertNotIn('"source"', buffer.content)
        with self.assertRaises(WorkspaceError):
            self.controller.edit(buffer.state.id, '{}')
        with patch('theorem_terminal.tool_settings.subprocess.Popen') as launch:
            self.controller.view()
            launch.assert_not_called()
        self.assertEqual(path.read_bytes(), raw)

    @unittest.skipUnless(shutil.which('vim.tiny') or shutil.which('nvim'), 'No real Vim/Neovim available')
    def test_real_editor_receives_file_line_and_detects_disk_conflicts(self):
        vim = shutil.which('vim.tiny') or shutil.which('nvim')
        path = self.files['proof.md']
        b = self.controller.open_file(path)
        b.state.pane_views[0].cursor = '3.4'
        arguments = [vim, '-u', 'NONE', '-i', 'NONE', '-n', '-N', '-es', '+{line}', '-c', 's/.*/Written by actual Vim/', '-c', 'wq', '{file}']
        import shlex
        self.controller.configure_editor(shlex.join(arguments))
        expected = [arg.replace('{line}', '3').replace('{file}', str(path)) for arg in arguments]
        self.assertEqual(self.controller.external_editor_arguments(), expected)
        process = self.controller.open_in_editor()
        self.assertEqual(process.wait(timeout=15), 0)
        self.assertEqual(path.read_text().splitlines()[2], 'Written by actual Vim')
        self.assertEqual(self.controller.check_external(), 'changed')
        self.controller.edit(b.state.id, 'Concurrent in-memory text')
        self.assertEqual(self.controller.check_external(), 'conflict')
        self.assertEqual(b.content, 'Concurrent in-memory text')
        with self.assertRaisesRegex(WorkspaceError, 'mismatch'):
            self.controller.save()
        with self.assertRaisesRegex(WorkspaceError, 'discard'):
            self.controller.refresh()
        self.assertNotIn(vim.encode(), self.manifest.read_bytes())
        self.assertIn(vim.encode(), self.controller.settings_store.path.read_bytes())

    def test_editor_templates_precedence_and_credentials_are_not_persisted(self):
        b = self.controller.open_file(self.files['proof.md'])
        with patch.dict(os.environ, {'VISUAL': 'vim +{line} {file}', 'EDITOR': 'other +{line} {file}', 'OPENAI_API_KEY': 'secret-credential-not-for-settings'}):
            with patch('theorem_terminal.tool_settings.resolve_executable', side_effect=lambda x: x):
                self.assertEqual(self.controller.external_editor_arguments(), ['vim', '+1', b.state.path])
                self.controller.configure_editor('custom --line {line} --column {column} {file}')
                self.assertEqual(self.controller.external_editor_arguments()[0], 'custom')
            with self.assertRaisesRegex(WorkspaceError, 'Credentials'):
                self.controller.configure_editor('custom secret-credential-not-for-settings {line} {file}')
        self.assertNotIn(b'secret-credential', self.controller.settings_store.path.read_bytes())
        self.assertNotIn(b'custom', self.manifest.read_bytes())

    def test_finalized_response_review_exact_projection_and_cancel(self):
        for trial, response in enumerate(('α\r\n\r\nβ\n\nα\r\n', '\t\r\n \n', 'no separator', '\n\n'.join(f'p{i}' for i in range(45)))):
            buffer = self.call(response)
            call = parse_finalized_model_call(Path(buffer.state.path).read_bytes())
            before = self.snapshot()
            self.assertEqual(self.controller.view().content, render_response_review(call))
            self.assertIsNone(self.controller.project_passage(buffer.state.id, 1, None))
            self.assertEqual(self.snapshot(), before)
            for selected in passages(response):
                self.assertEqual(self.controller.review_response(buffer.state.id, 'passage', selected.number), render_response_review(call, passage_number=selected.number))
                destination = self.root / f'projection-{trial}-{selected.number}.json'
                projected = self.controller.project_passage(buffer.state.id, selected.number, destination)
                record = parse_documentary_projection(destination.read_bytes())
                self.assertEqual(record.representation.span.start_byte, selected.start_byte)
                self.assertEqual(record.representation.span.end_byte, selected.end_byte)
                self.assertEqual(record.call.raw_response_digest, call.raw_response_digest)
                self.assertEqual(record.representation.content.encode(), response.encode()[selected.start_byte:selected.end_byte])
                self.controller.close_buffer(projected.state.id)
            self.controller.close_buffer(buffer.state.id)

    def test_record_pairs_not_ordinary_recents_and_integral_facets_survive_restore(self):
        verification, bundle = verification_fixture()
        vp, bp = self.root / 'verification.json', self.root / 'bundle.json'
        vp.write_bytes(verification)
        bp.write_bytes(bundle)
        buffer = self.controller.open_record(vp, 'verification', companion=bp)
        before = self.snapshot()
        sections = dict(self.controller.view().sections)
        for heading, key in (('ClaimAtomVersion records', 'claims'), ('PremiseAdmission records', 'admissions'), ('JustificationContext', 'context'), ('JustificationDerivation', 'derivation')):
            self.assertEqual(json.loads(sections[heading]), json.loads(bundle)[key])
        self.assertIn('Provenance', sections)
        self.assertIn('no check was performed', sections['Verification'])
        self.assertNotIn(str(vp), self.controller.current().recent)
        self.controller.close_project()
        restored = self.restored()
        self.assertEqual(restored.view().state.companion, str(bp))
        self.assertEqual(self.snapshot(), before)
        bp.write_bytes(bundle + b' ')
        self.assertIn('SHA-256', restored.view().problem)
        self.assertFalse(restored.buffer().editable)

    def test_invalid_versions_malformed_records_and_digest_mismatch_are_non_destructive(self):
        original = self.manifest.read_bytes()
        for version in (0, 1, 2, 7, 99, True, False, 3.0, 4.0, 5.0, 6.0, '3', '4', '5', '6', None):
            data = json.loads(original)
            data['schema_version'] = version
            with self.assertRaisesRegex(WorkspaceError, 'Unsupported'):
                decode_workspace(encode(data))
        for mutation in ({'root': 'relative'}, {'active': 'absent'}, {'visible': [None]}, {'recent': [False]}, {'objective': 'obsolete'}, {'split': 1}):
            with self.assertRaises(ValueError):
                decode_workspace(encode({**json.loads(original), **mutation}))
        for raw in (b'{}', b'{', b'"state"'):
            self.manifest.write_bytes(raw)
            with self.assertRaises(WorkspaceError):
                self.restored()
            self.assertEqual(self.manifest.read_bytes(), raw)
        self.manifest.write_bytes(original)
        for raw in (b'{}', b'invalid', encode({**model_call_document(), 'status': 'failed'}), encode({**model_call_document(), 'raw_response_digest': '0' * 64})):
            path = self.root / 'invalid.json'
            path.write_bytes(raw)
            with self.assertRaises(ValueError):
                self.controller.open_record(path, 'model_call')
            self.assertEqual(path.read_bytes(), raw)

    def add_selection(self, buffer, start='1.0', end='1.5'):
        if self.controller.current().active != buffer.state.id:
            self.controller.activate(buffer.state.id)
        self.controller.set_position(buffer.state.id, cursor=end, selection=[start, end], yscroll=.2, xscroll=0)
        return self.controller.add_context_selection(buffer.state.id, start, end)

    def test_version_three_migration_preserves_complete_session_and_recovery(self):
        c = self.controller
        left = c.open_file(self.files['notes/differences.tex'])
        c.set_split(True)
        right = c.open_file(self.files['proof.md'], pane=1)
        c.edit(right.state.id, right.content + 'Unsaved α\r\n')
        c.set_position(right.state.id, cursor='3.7', selection=['3.0', '3.7'], yscroll=.7, xscroll=.1)
        c.mark(right.state.id, '3.0', '3.4')
        c.set_tex_root(left.state.id)
        c.set_pdf_view(page=7, zoom='custom', scale=1.4)
        expected = asdict(c.current())
        recovery = c.store.recovery_path(right.state.id)
        c.close_project(keep_recovery=True)
        recovery_bytes = recovery.read_bytes()
        old = json.loads(self.manifest.read_bytes())
        old['schema_version'] = 3
        del old['selection_shelf']
        del old['wrap']
        for item, wanted in zip(old['buffers'], expected['buffers']):
            position = item.pop('pane_views')[1 if item['id'] == right.state.id else 0]
            item.update(position)
            wanted['pane_views'] = [deepcopy(position), deepcopy(position)]
        raw = encode(old)
        self.manifest.write_bytes(raw)
        with patch('theorem_terminal.workstation.text_snapshot', side_effect=AssertionError('eager source read')):
            store, migrated = WorkspaceStore.for_project(self.root, self.state_root)
            self.assertEqual(asdict(migrated), expected)
            self.assertEqual(self.manifest.read_bytes(), raw)
            restored = self.restored()
        self.assertEqual(VERSION, 6)
        self.assertEqual(json.loads(self.manifest.read_bytes())['schema_version'], 6)
        self.assertEqual(asdict(restored.current()), expected)
        self.assertEqual(recovery.read_bytes(), recovery_bytes)
        self.assertTrue(restored.view().recovery_warning)
        self.assertEqual(restored.buffer().content, right.content)

    def test_migration_and_shelf_schema_reject_malformed_manifests(self):
        original_raw = self.manifest.read_bytes()
        original = json.loads(original_raw)
        for version in (3, 4, 5, 6):
            valid = deepcopy(original)
            valid['schema_version'] = version
            if version < 6:
                del valid['wrap']
            if version == 3:
                del valid['selection_shelf']
            for mutation in ({'split': 1}, {'marker': {}}, {'buffers': [{}]}, {'extra': None}):
                with self.subTest(version=version, mutation=mutation), self.assertRaises(WorkspaceError):
                    decode_workspace(encode({**valid, **mutation}))
            for field in tuple(valid):
                broken = {k: v for k, v in valid.items() if k != field}
                with self.subTest(version=version, missing=field), self.assertRaises(WorkspaceError):
                    decode_workspace(encode(broken))
        with self.assertRaises(WorkspaceError):
            decode_workspace(encode({**original, 'schema_version': 3}))
        entry = dict(path=str(self.files['proof.md']), revision='a' * 64, start='1.0', end='1.5')
        invalid = [None, {}, '', True, [entry] * 2,
                   [{**entry, 'end': f'{n + 2}.0'} for n in range(33)]]
        for mutation in ({'path': 'relative'}, {'path': False}, {'revision': 'x'}, {'revision': True},
                         {'start': '0.0'}, {'start': ''}, {'start': '1.-1'}, {'start': True},
                         {'end': '1.0'}, {'start': '2.0'}, {'end': '1.1000000000'},
                         {'title': 'forbidden'}, {'text': 'not retained'}):
            invalid.append([{**entry, **mutation}])
        invalid.extend([{k: v for k, v in entry.items() if k != field}] for field in entry)
        for shelf in invalid:
            with self.subTest(shelf=shelf), self.assertRaises(WorkspaceError):
                decode_workspace(encode({**original, 'selection_shelf': shelf}))
        self.assertEqual(self.manifest.read_bytes(), original_raw)

    def test_literal_historical_migrations_normalize_and_keep_independent_views(self):
        for version in (3, 4, 5):
            with self.subTest(version=version):
                document = historical_workspace(self.root, version)
                raw = encode(document)
                with patch('theorem_terminal.workspace.read_bounded', side_effect=AssertionError('migration read a file')):
                    state = decode_workspace(raw)
                self.assertEqual(document, json.loads(raw))
                self.assertEqual(state.visible, [state.buffers[0].id] * 2)
                left, right = state.buffers[0].pane_views
                expected = dict(cursor='3.7', selection=['3.0', '3.7'], yscroll=.7, xscroll=.2)
                self.assertEqual(asdict(left), expected)
                self.assertEqual(asdict(right), expected)
                self.assertIsNot(left, right)
                self.assertIsNot(left.selection, right.selection)
                left.selection[0] = '2.0'
                self.assertEqual(right.selection, ['3.0', '3.7'])
                self.assertEqual((state.marker.start, state.marker.end), ('3.0', '3.7'))
                self.assertEqual((state.pdf_page, state.pdf_zoom, state.pdf_scale, state.window_size),
                                 (7, 'custom', 1.4, [960, 680]))
                self.assertEqual([(s.revision, s.start, s.end) for s in state.selection_shelf],
                                 [] if version == 3 else [('b' * 64, '1.0', '1.5'), ('a' * 64, '3.0', '3.7')])
                self.assertTrue(state.wrap)
                self.assertEqual(json.loads(encode_workspace(state))['schema_version'], 6)
                for key, value in (('cursor', '0.1'), ('yscroll', True), ('selection', ['1.0']), ('pane_views', [])):
                    malformed = deepcopy(document)
                    malformed['buffers'][0][key] = value
                    with self.assertRaises(WorkspaceError):
                        decode_workspace(encode(malformed))
        duplicate = historical_workspace(self.root, 4)
        duplicate['selection_shelf'][1] = {**duplicate['selection_shelf'][0], 'start': '1.0', 'end': '1.5'}
        migrated = decode_workspace(encode(duplicate))
        self.assertEqual([(s.start, s.end) for s in migrated.selection_shelf], [('1.0', '1.5')])
        duplicate['selection_shelf'][1] = deepcopy(duplicate['selection_shelf'][0])
        with self.assertRaisesRegex(WorkspaceError, 'Duplicate'):
            decode_workspace(encode(duplicate))

    def test_historical_wire_shapes_do_not_follow_current_dataclass_fields(self):
        for version in (3, 4, 5):
            document = historical_workspace(self.root, version)
            with ExitStack() as stack:
                for cls in (Workspace, BufferState, WorkMarker, PaneViewState):
                    stack.enter_context(patch.dict(cls.__dataclass_fields__, {'future_field': field(default=None)}))
                state = decode_workspace(encode(document))
                self.assertEqual(state.buffers[0].pane_views[0].cursor, '3.7')
                for target in ('workspace', 'buffer', 'marker'):
                    broken = deepcopy(document)
                    destination = broken if target == 'workspace' else (broken['buffers'][0] if target == 'buffer' else broken['marker'])
                    destination['future_field'] = None
                    with self.assertRaises(WorkspaceError):
                        decode_workspace(encode(broken))

    def test_version_six_rejects_malformed_pane_views_and_legacy_fields(self):
        valid = json.loads(encode_workspace(decode_workspace(encode(historical_workspace(self.root, 4)))))
        view = valid['buffers'][0]['pane_views'][0]
        invalid = [None, True, '', {}, [], [view], [view] * 3, [None, view], [[], view], [True, view]]
        mutations = [dict(cursor=value) for value in ('1.00', '01.0', '0.0', '1.-1', '1.1000000000', '', None, True, 1)]
        mutations += [dict(selection=value) for value in ([], ['1.0'], ['1.0'] * 3, '1.0', True, [None, '1.0'], ['1.00', '2.0'])]
        mutations += [dict(selection=value) for value in (['3.7', '3.0'], ['3.7', '3.7'], ['1.0', '2.0'])]
        mutations += [{key: value} for key in ('yscroll', 'xscroll') for value in (True, False, None, '0', -1, 1.01, float('inf'), float('-inf'), float('nan'))]
        mutations += [{'extra': 0}]
        invalid.extend([{**view, **mutation}, view] for mutation in mutations)
        invalid.extend([{k: v for k, v in view.items() if k != key}, view] for key in view)
        for views in invalid:
            broken = deepcopy(valid)
            broken['buffers'][0]['pane_views'] = views
            with self.subTest(views=views), self.assertRaises(WorkspaceError):
                decode_workspace(json.dumps(broken).encode())
        for key in ('cursor', 'selection', 'yscroll', 'xscroll'):
            broken = deepcopy(valid)
            broken['buffers'][0][key] = view[key]
            with self.assertRaises(WorkspaceError):
                decode_workspace(encode(broken))
        broken = deepcopy(valid)
        del broken['buffers'][0]['pane_views']
        with self.assertRaises(WorkspaceError):
            decode_workspace(encode(broken))
        for value in (0, 1, .25):
            valid['buffers'][0]['pane_views'][0]['yscroll'] = value
            decode_workspace(encode(valid))
        for value in (None, 0, 1, 'true', [], {}):
            with self.assertRaises(WorkspaceError):
                decode_workspace(encode({**valid, 'wrap': value}))

    def test_legacy_incoherent_selections_migrate_to_the_historical_rendered_span(self):
        cases = [('2.3', ['3.7', '1.0']), ('3.0', ['3.0', '3.7']),
                 ('4.0', ['3.0', '3.7']), ('1.0', ['3.0', '3.0'])]
        for version in (3, 4, 5):
            for cursor, selection in cases:
                data = historical_workspace(self.root, version)
                old = dict(cursor=cursor, selection=selection, yscroll=.4, xscroll=.2)
                item = data['buffers'][0]
                if version == 5:
                    item['pane_views'] = [deepcopy(old), deepcopy(old)]
                    active = cursor
                    anchor = selection[1] if cursor == selection[0] else selection[0]
                else:
                    item.update(old)
                    anchor, active = selection
                wanted = sorted((anchor, active), key=lambda p: tuple(map(int, p.split('.'))))
                wanted = None if wanted[0] == wanted[1] else wanted
                with self.subTest(version=version, cursor=cursor, selection=selection):
                    state = decode_workspace(encode(data))
                    for view in state.buffers[0].pane_views:
                        self.assertEqual((view.cursor, view.selection), (active, wanted))
                    encode_workspace(state)
                    left, right = state.buffers[0].pane_views
                    self.assertIsNot(left, right)
                    if left.selection:
                        self.assertIsNot(left.selection, right.selection)

    def test_pane_controller_keeps_shared_content_and_independent_navigation(self):
        c = self.controller
        b = c.open_file(self.files['proof.md'])
        c.set_split(True)
        c.activate(b.state.id, 1)
        left = dict(cursor='1.5', selection=['1.0', '1.5'], yscroll=.2, xscroll=.1)
        right = dict(cursor='3.7', selection=['3.0', '3.7'], yscroll=.8, xscroll=.6)
        c.set_position(b.state.id, pane=0, **left)
        c.set_position(b.state.id, **right)
        for pane in (True, -1, 2, '0'):
            with self.assertRaises(WorkspaceError):
                c.set_position(b.state.id, pane=pane, **left)
        self.assertIsNot(b.state.pane_views[0].selection, left['selection'])
        c.add_context_selection(b.state.id, '1.0', '1.5', pane=0)
        c.add_context_selection(b.state.id, '3.0', '3.7', pane=1)
        c.mark(b.state.id, '1.1', '1.4')
        marker = deepcopy(c.current().marker)
        for pane, index in ((0, 1), (1, 0)):
            other = deepcopy(b.state.pane_views[1 - pane])
            c.open_context_selection(index, pane)
            self.assertEqual(b.state.pane_views[1 - pane], other)
            self.assertEqual(c.current().visible, [b.state.id] * 2)
        untouched = deepcopy(b.state.pane_views[0])
        c.return_to_marker()
        self.assertEqual(b.state.pane_views[0], untouched)
        self.assertEqual(b.state.pane_views[1].selection, ['1.1', '1.4'])
        c.set_position(b.state.id, pane=0, **left)
        c.set_position(b.state.id, pane=1, **right)
        with patch('theorem_terminal.tool_settings.resolve_executable', side_effect=lambda x: x):
            c.configure_editor('editor {line} {column} {file}')
            for pane, expected in ((0, ['1', '6']), (1, ['3', '8'])):
                c.activate(b.state.id, pane)
                self.assertEqual(c.external_editor_arguments()[1:3], expected)
        stale = c.load_snapshot(b.state.id)
        c.set_position(b.state.id, pane=0, **right)
        c.set_position(b.state.id, pane=1, **left)
        wanted = deepcopy(b.state.pane_views)
        b = c.accept_snapshot(stale)
        self.assertEqual(b.state.pane_views, wanted)
        self.assertIsNot(b.state.pane_views[0], wanted[0])
        c.set_split(False)
        with self.assertRaises(WorkspaceError):
            c.set_position(b.state.id, pane=1, **right)
        c.set_split(True)
        self.assertEqual(b.state.pane_views, wanted)
        other = c.open_file(self.files['questions.txt'], pane=0)
        with self.assertRaises(WorkspaceError):
            c.set_position(b.state.id, pane=0, **left)
        c.activate(b.state.id, 0)
        c.close_buffer(b.state.id)
        self.assertEqual(c.current().visible, [None, None])
        self.assertNotIn(b.state.id, c.buffers)
        self.assertEqual(c.current().marker, marker)
        self.assertEqual(len(c.current().selection_shelf), 2)

    def test_response_review_resets_both_shared_pane_views(self):
        c = self.controller
        b = self.call()
        c.set_split(True)
        c.activate(b.state.id, 1)
        for pane in (0, 1):
            c.set_position(b.state.id, pane=pane, cursor='3.7', selection=['3.0', '3.7'], yscroll=.5, xscroll=.2)
        c.review_response(b.state.id, 'passage', 2)
        self.assertEqual(b.state.pane_views, [PaneViewState(), PaneViewState()])
        self.assertIsNot(b.state.pane_views[0], b.state.pane_views[1])
        self.assertEqual(c.current().visible, [b.state.id] * 2)

    def test_duplicate_add_checkpoints_recovered_text_before_abrupt_restart(self):
        original = self.files['proof.md'].read_bytes()
        self.controller.close_project()
        script = '''
import os, sys
from pathlib import Path
from unittest.mock import patch
from theorem_terminal.workstation import Workstation
from theorem_terminal.workspace import WorkspaceError
c = Workstation(state_root=Path(sys.argv[2]))
c.open_project(Path(sys.argv[1]))
b = c.open_file(Path(sys.argv[1]) / 'proof.md')
a = b.content + 'Unsaved A α\\n'
def select():
 c.set_position(b.state.id, cursor='1.5', selection=['1.0','1.5'], yscroll=.2, xscroll=0)
c.edit(b.state.id, a)
select()
assert c.add_context_selection(b.state.id, '1.0', '1.5') == 0
c.discard(b.state.id)
assert not c.store.recovery_path(b.state.id).exists()
c.edit(b.state.id, a)
select()
with patch.object(c.store, 'write_recovery', side_effect=OSError('duplicate recovery denied')):
 try: c.add_context_selection(b.state.id, '1.0', '1.5')
 except WorkspaceError as error: assert 'duplicate recovery denied' in str(error)
 else: raise AssertionError('duplicate addition reported false success')
assert len(c.current().selection_shelf) == 1
assert not c.store.recovery_path(b.state.id).exists()
assert c.add_context_selection(b.state.id, '1.0', '1.5') == 0
assert len(c.current().selection_shelf) == 1
assert c.store.read_recovery(b.state)['text'] == a
os._exit(0)
'''
        subprocess.run([sys.executable, '-c', script, str(self.root), str(self.state_root)],
                       check=True, capture_output=True, timeout=30)
        c = self.restored()
        b = c.open_context_selection(0)
        self.assertEqual(b.content, original.decode() + 'Unsaved A α\n')
        self.assertTrue(b.recovery_warning)
        self.assertEqual(len(c.current().selection_shelf), 1)
        self.assertEqual(self.files['proof.md'].read_bytes(), original)

    def test_context_accept_rechecks_filesystem_before_any_navigation(self):
        c = self.controller
        target = c.open_file(self.files['proof.md'])
        self.add_selection(target)
        c.mark(target.state.id, '3.0', '3.7')
        left = c.open_file(self.files['questions.txt'])
        c.set_split(True)
        right = c.open_file(self.files['notes/differences.tex'], pane=1)
        path = Path(target.state.path)
        raw = path.read_bytes()
        for state in ('loaded', 'recovered', 'unloaded', 'closed'):
            if state == 'recovered':
                c.activate(target.state.id, 0)
                c.edit(target.state.id, target.content + 'Unsaved α\n')
                self.add_selection(target)
                c.current().selection_shelf[0] = c.current().selection_shelf.pop()
            elif state == 'unloaded':
                target.loaded = False
            elif state == 'closed':
                target = c.view(target.state.id)
                c.discard(target.state.id)
                c.current().selection_shelf[0].revision = sha256(raw).hexdigest()
                c.close_buffer(target.state.id)
            for mutation in ('replacement', 'deletion', 'symlink'):
                for pane in (0, 1):
                    c.set_split(True)
                    c.activate(left.state.id, 0)
                    c.activate(right.state.id, 1)
                    if pane == 1:
                        c.set_split(False)
                    prepared = c.prepare_context_selection(0)
                    before, buffers = deepcopy(c.current()), deepcopy(c.buffers)
                    try:
                        if mutation == 'replacement':
                            replacement = self.root / 'replacement.txt'
                            replacement.write_bytes(b'Replaced byte content\n')
                            os.replace(replacement, path)
                        else:
                            path.unlink()
                            if mutation == 'symlink':
                                path.symlink_to(self.files['questions.txt'])
                        with self.assertRaises((WorkspaceError, OSError)):
                            c.accept_context_selection(0, prepared, pane)
                        self.assertEqual(c.current(), before)
                        self.assertEqual(c.buffers, buffers)
                    finally:
                        if path.is_symlink():
                            path.unlink()
                        path.write_bytes(raw)

    def test_failed_shelf_rollback_reconciles_cache_and_checkpoint_repairs_disk(self):
        c = self.controller
        b = c.open_file(self.files['proof.md'])
        self.add_selection(b)
        c.set_position(b.state.id, cursor='3.7', selection=['3.0', '3.7'], yscroll=.3, xscroll=.1)
        self.assertTrue(c.checkpoint())
        previous = self.manifest.read_bytes()
        old_shelf = deepcopy(c.current().selection_shelf)
        from theorem_terminal.mutable_files import sync_directory
        def fail_candidate_sync(directory):
            if directory == c.store.directory and len(json.loads(self.manifest.read_bytes())['selection_shelf']) == 2:
                raise OSError('candidate directory sync denied')
            return sync_directory(directory)
        with patch('theorem_terminal.mutable_files.sync_directory', side_effect=fail_candidate_sync), \
             patch('theorem_terminal.workstation.save_mutable', side_effect=OSError('rollback replacement denied')):
            with self.assertRaisesRegex(WorkspaceError, 'rollback replacement denied'):
                c.add_context_selection(b.state.id, '3.0', '3.7')
        candidate = self.manifest.read_bytes()
        self.assertNotEqual(candidate, previous)
        self.assertEqual(len(json.loads(candidate)['selection_shelf']), 2)
        self.assertEqual(c.current().selection_shelf, old_shelf)
        self.assertEqual(c.store.previous, candidate)
        self.assertTrue(c.persistence_error)
        with patch('theorem_terminal.workspace.save_mutable', wraps=save_mutable) as replace_manifest:
            self.assertTrue(c.checkpoint())
            self.assertEqual(replace_manifest.call_args.kwargs['previous'], candidate)
        self.assertEqual(self.manifest.read_bytes(), previous)
        self.assertEqual(c.store.previous, previous)

    def test_unreconcilable_shelf_manifest_blocks_later_checkpoints(self):
        from theorem_terminal.mutable_files import sync_directory
        for failure in ('missing', 'unrelated', 'unreadable'):
            with self.subTest(failure=failure):
                root = self.home / failure
                root.mkdir()
                path = root / 'work.txt'
                path.write_text('First line\nSecond line\n')
                c = Workstation(state_root=self.home / (failure + '-state'))
                c.open_project(root)
                b = c.open_file(path)
                c.set_position(b.state.id, cursor='1.5', selection=['1.0', '1.5'], yscroll=0, xscroll=0)
                manifest = c.store.path
                def fail_sync(directory):
                    if directory == c.store.directory and json.loads(manifest.read_bytes())['selection_shelf']:
                        raise OSError('candidate sync denied')
                    return sync_directory(directory)
                def fail_rollback(*args, **kwargs):
                    if failure == 'missing':
                        manifest.unlink()
                    elif failure == 'unrelated':
                        manifest.write_bytes(b'unrelated writer')
                    raise OSError('rollback denied')
                with ExitStack() as stack:
                    stack.enter_context(patch('theorem_terminal.mutable_files.sync_directory', side_effect=fail_sync))
                    stack.enter_context(patch('theorem_terminal.workstation.save_mutable', side_effect=fail_rollback))
                    if failure == 'unreadable':
                        stack.enter_context(patch('theorem_terminal.workspace.read_bounded', side_effect=OSError('read denied')))
                    with self.assertRaises(WorkspaceError):
                        c.add_context_selection(b.state.id, '1.0', '1.5')
                actual = manifest.read_bytes() if manifest.exists() else None
                self.assertIsNotNone(c.store.previous)
                self.assertNotIsInstance(c.store.previous, bytes)
                self.assertFalse(c.current().selection_shelf)
                self.assertFalse(c.checkpoint())
                self.assertIn('reconciled', c.persistence_error)
                self.assertEqual(manifest.read_bytes() if manifest.exists() else None, actual)

    def test_context_selections_survive_process_restart_in_order_without_external_actions(self):
        external = self.home / 'external-reference.txt'
        external.write_text('Reference passage α\nAnother exact passage.\n', encoding='utf-8')
        before, external_before = self.snapshot(), external.read_bytes()
        c = self.controller
        buffers = [c.open_file(self.files[name]) for name in ('proof.md', 'notes/differences.tex', 'formal/Basic.lean')]
        buffers.append(c.open_file(external, reference=True))
        c.mark(buffers[0].state.id, '3.0', '3.7')
        marker = deepcopy(c.current().marker)
        for index, buffer in enumerate(buffers):
            self.assertEqual(self.add_selection(buffer), index)
        self.assertEqual(self.add_selection(buffers[0], '3.0', '3.7'), 4)
        self.assertEqual(self.add_selection(buffers[0]), 0)
        self.assertEqual(len(c.current().selection_shelf), 5)
        expected = asdict(c.current())['selection_shelf']
        c.close_buffer(buffers[1].state.id)
        self.assertEqual(asdict(c.current())['selection_shelf'], expected)
        c.close_project()
        script = '''
import json, sys
from pathlib import Path
from contextlib import ExitStack
from unittest.mock import patch
from dataclasses import asdict
from theorem_terminal.workstation import Workstation
with ExitStack() as stack:
 for name in ('socket.socket', 'subprocess.Popen', 'os.system', 'urllib.request.urlopen',
              'theorem_terminal.documentary_warrant.run_lean_documentary_checker',
              'theorem_terminal.latex_build.run_latex'):
  stack.enter_context(patch(name, side_effect=AssertionError('unexpected external action')))
 c = Workstation(state_root=Path(sys.argv[2]))
 with patch('theorem_terminal.workstation.text_snapshot', side_effect=AssertionError('eager shelf read')):
  c.open_project(Path(sys.argv[1]))
 assert not any(b.loaded for b in c.buffers.values())
 before = asdict(c.current())
 for index in range(len(c.current().selection_shelf)):
  b = c.open_context_selection(index)
  entry = c.current().selection_shelf[index]
  assert b.state.pane_views[c.current().active_pane].selection == [entry.start, entry.end]
  if b.state.external: assert b.state.readonly
 assert asdict(c.current())['marker'] == before['marker']
 c.close_project()
 print(json.dumps(before))
'''
        result = subprocess.run([sys.executable, '-c', script, str(self.root), str(self.state_root)],
                                check=True, capture_output=True, text=True)
        state = json.loads(result.stdout)
        self.assertEqual(state['selection_shelf'], expected)
        self.assertEqual(state['marker'], asdict(marker))
        self.assertEqual(self.snapshot(), before)
        self.assertEqual(external.read_bytes(), external_before)

    def test_context_selection_requires_supported_current_bounded_span(self):
        c = self.controller
        path = self.root / 'long.txt'
        path.write_text('x' * 100 + '\n')
        b = c.open_file(path)
        with self.assertRaisesRegex(WorkspaceError, 'current'):
            c.add_context_selection(b.state.id, '1.0', '1.3')
        for start, end in (('1.0', '1.0'), ('1.5', '1.2'), ('1.0', '1.101'), ('1.0', '3.0'),
                           ('0.0', '1.1'), ('1.-1', '1.1'), ('1.x', '1.2'), (True, '1.1'),
                           ('1.0', '1.1000000000')):
            with self.subTest(start=start, end=end), self.assertRaises(WorkspaceError):
                self.add_selection(b, start, end)
        self.assertFalse(c.current().selection_shelf)
        for number in range(1, 33):
            self.assertEqual(self.add_selection(b, '1.0', f'1.{number}'), number - 1)
        self.assertEqual(self.add_selection(b, '1.0', '1.1'), 0)
        with self.assertRaisesRegex(WorkspaceError, '32'):
            self.add_selection(b, '1.0', '1.33')
        for index in (-1, 32, True, '0', None):
            for operation in (c.open_context_selection, c.remove_context_selection):
                with self.subTest(index=index), self.assertRaises(WorkspaceError):
                    operation(index)
        b.loaded = False
        self.assertFalse(c.context_selection_supported(b.state.id))
        with self.assertRaises(WorkspaceError):
            c.add_context_selection(b.state.id, '1.0', '1.1')
        b.loaded = True
        for unsupported in (c.new_buffer(), self.call()):
            with self.assertRaises(WorkspaceError):
                self.add_selection(unsupported)
        self.assertEqual(len(c.current().selection_shelf), 32)

    def test_context_selection_resolves_checkpointed_unsaved_unicode_crlf(self):
        c = self.controller
        b = c.open_file(self.files['proof.md'])
        original = self.files['proof.md'].read_bytes()
        c.mark(b.state.id, '3.0', '3.7')
        marker = deepcopy(c.current().marker)
        text = 'First α\r\nSecond β 😀\r\n'
        c.edit(b.state.id, text)
        self.add_selection(b, '1.6', '2.10')
        entry = c.current().selection_shelf[0]
        self.assertEqual(entry.revision, sha256(text.encode('utf-8')).hexdigest())
        self.assertNotEqual(entry.revision, b.state.revision)
        self.assertEqual(c.store.read_recovery(b.state)['text'], text)
        c.close_project(keep_recovery=True)
        restored = self.restored()
        b = restored.open_context_selection(0)
        self.assertEqual(b.content, text)
        self.assertTrue(b.recovery_warning)
        self.assertEqual(b.state.pane_views[0].selection, ['1.6', '2.10'])
        self.assertEqual(b.state.pane_views[0].cursor, '2.10')
        restored.remove_context_selection(0)
        self.assertEqual(restored.current().marker, marker)
        self.assertEqual(self.files['proof.md'].read_bytes(), original)

    def test_context_shelf_add_remove_roll_back_on_checkpoint_failures(self):
        c = self.controller
        b = c.open_file(self.files['proof.md'])
        c.mark(b.state.id, '3.0', '3.7')
        marker = deepcopy(c.current().marker)
        self.add_selection(b)
        c.edit(b.state.id, b.content + 'Unsaved work.\n')
        for service, method in ((c.store, 'write_recovery'), (c.store, 'save'), (c.settings_store, 'save')):
            with patch.object(service, method, side_effect=OSError('checkpoint denied')):
                for operation in (lambda: self.add_selection(b, '3.0', '3.7'), lambda: c.remove_context_selection(0)):
                    with self.assertRaisesRegex(WorkspaceError, 'checkpoint failed'):
                        operation()
                    self.assertEqual(len(c.current().selection_shelf), 1)
                    self.assertEqual(len(json.loads(self.manifest.read_bytes())['selection_shelf']), 1)
        self.assertTrue(c.checkpoint())
        save = c.store.save
        def fail_candidate(state):
            if len(state.selection_shelf) != 1:
                raise OSError('shelf publication denied')
            return save(state)
        with patch.object(c.store, 'save', side_effect=fail_candidate):
            for operation in (lambda: self.add_selection(b, '3.0', '3.7'), lambda: c.remove_context_selection(0)):
                with self.assertRaisesRegex(WorkspaceError, 'publication denied'):
                    operation()
                self.assertEqual(len(c.current().selection_shelf), 1)
                self.assertEqual(len(json.loads(self.manifest.read_bytes())['selection_shelf']), 1)
        # Exercise a real replacement followed by a failed directory sync.
        from theorem_terminal.mutable_files import sync_directory
        failed = []
        def fail_after_replace(directory):
            if directory == c.store.directory and not failed and len(json.loads(self.manifest.read_bytes())['selection_shelf']) == 2:
                failed.append(True)
                raise OSError('post-replace sync denied')
            return sync_directory(directory)
        with patch('theorem_terminal.mutable_files.sync_directory', side_effect=fail_after_replace):
            with self.assertRaisesRegex(WorkspaceError, 'post-replace'):
                self.add_selection(b, '3.0', '3.7')
        self.assertTrue(failed)
        self.assertEqual(len(c.current().selection_shelf), 1)
        self.assertEqual(len(json.loads(self.manifest.read_bytes())['selection_shelf']), 1)
        self.assertTrue(c.checkpoint())
        c.remove_context_selection(0)
        self.assertFalse(c.current().selection_shelf)
        self.assertEqual(c.current().marker, marker)

    def test_context_open_validates_before_moving_either_pane(self):
        c = self.controller
        left = c.open_file(self.files['proof.md'])
        right = c.open_file(self.files['notes/differences.tex'])
        target = c.open_file(self.files['formal/Basic.lean'])
        self.add_selection(target)
        c.mark(left.state.id, '3.0', '3.7')
        c.set_split(True)
        c.activate(left.state.id, 0)
        c.activate(right.state.id, 1)
        for pane, other in ((0, right), (1, left)):
            c.activate(left.state.id, 0)
            c.activate(right.state.id, 1)
            other_before = deepcopy(other.state)
            c.open_context_selection(0, pane)
            self.assertEqual(c.current().visible[1 - pane], other.state.id)
            self.assertEqual(other.state, other_before)
            self.assertEqual(c.current().visible[pane], target.state.id)
        for loaded in (True, False):
            for failure in ('changed', 'missing', 'redirected', 'unavailable', 'digest'):
                with self.subTest(loaded=loaded, failure=failure):
                    path = Path(target.state.path)
                    raw = path.read_bytes()
                    c.activate(left.state.id, 0)
                    c.activate(right.state.id, 1)
                    target.loaded = loaded
                    if failure == 'changed':
                        path.write_bytes(b'Changed source\n' + raw)
                    elif failure == 'missing':
                        path.unlink()
                    elif failure == 'redirected':
                        path.unlink()
                        path.symlink_to(self.files['proof.md'])
                    elif failure == 'unavailable' and loaded:
                        target.problem = 'read failed'
                    elif failure == 'digest':
                        c.current().selection_shelf[0].revision = 'f' * 64
                    else:
                        path.write_bytes(b'\0')
                    before = asdict(c.current())
                    try:
                        with self.assertRaises((WorkspaceError, OSError)):
                            c.open_context_selection(0, 0)
                        self.assertEqual(asdict(c.current()), before)
                    finally:
                        if path.is_symlink():
                            path.unlink()
                        path.write_bytes(raw)
                        target.loaded, target.problem = True, ''
                        c.current().selection_shelf[0].revision = sha256(raw).hexdigest()
        before = asdict(c.current())
        prepared = c.prepare_context_selection(0)
        c.edit(target.state.id, target.content + 'New in-memory work')
        with self.assertRaisesRegex(WorkspaceError, 'mismatch'):
            c.accept_context_selection(0, prepared, 0)
        self.assertEqual(c.current().visible, before['visible'])
        self.assertEqual(asdict(c.current())['marker'], before['marker'])

    def test_no_process_network_provider_lean_or_content_import_on_local_workflow(self):
        self.call()
        self.controller.close_project()
        script = '''
import importlib.abc,os,sys
from pathlib import Path
from contextlib import ExitStack
from unittest.mock import patch
class Deny(importlib.abc.MetaPathFinder):
 def find_spec(self, name, *args):
  if any(part in name.lower() for part in ('appendix', 'integrations')):
   raise AssertionError('content-specific import')
sys.meta_path.insert(0,Deny())
with ExitStack() as stack:
 for name in ('socket.socket','subprocess.Popen','os.system','urllib.request.urlopen'):
  stack.enter_context(patch(name,side_effect=AssertionError('external action')))
 stack.enter_context(patch.dict(os.environ,{'OPENAI_API_KEY':'','PATH':''}))
 from theorem_terminal.workstation import Workstation
 stack.enter_context(patch('theorem_terminal.documentary_warrant.run_lean_documentary_checker',side_effect=AssertionError('Lean')))
 c=Workstation(state_root=Path(sys.argv[2]))
 c.open_project(Path(sys.argv[1]))
 for identifier in list(c.buffers): c.view(identifier)
 for path in Path(sys.argv[1]).rglob('*'):
  if path.suffix in ('.tex','.lean','.sage','.py','.md','.txt'): c.open_file(path)
 c.close_project()
 c.open_project(Path(sys.argv[1]))
 for identifier in list(c.buffers): c.view(identifier)
'''
        subprocess.run([sys.executable, '-c', script, str(self.root), str(self.state_root)], check=True, capture_output=True)


if __name__ == '__main__':
    unittest.main()
