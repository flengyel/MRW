"""Corpus-neutral controller/recovery tests; fixture checks are structural only."""

from contextlib import ExitStack
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
from theorem_terminal.workspace import MAX_TEXT_BYTES, VERSION, WorkspaceError, decode_workspace
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
        self.assertEqual(current['selection'], ['3.0', '3.7'])
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
        b.state.cursor = '3.4'
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
        for version in (0, 1, 2, 4, True, '3', None):
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
