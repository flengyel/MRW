"""Actual PySide6 widgets, with temporary ordinary mathematical projects."""

from contextlib import ExitStack
import os
from pathlib import Path
import shutil
import tempfile
import time
import unittest
from unittest.mock import patch

from test_latex_build import tex_project
from test_model_projection import model_call_document, encode
from test_workstation import mathematical_project, verification_fixture


@unittest.skipUnless(os.environ.get('THEOREM_TERMINAL_GUI_TESTS') == '1', 'set THEOREM_TERMINAL_GUI_TESTS=1 to exercise actual Qt widgets')
class GraphicalEditorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from PySide6.QtWidgets import QApplication
        cls.app = QApplication.instance() or QApplication([])

    def setUp(self):
        from theorem_terminal.gui import WorkstationWindow
        from theorem_terminal.workstation import Workstation
        self.temp = tempfile.TemporaryDirectory(prefix='mrw-widget-test-')
        self.home = Path(self.temp.name)
        self.root = self.home / 'project'
        self.root.mkdir()
        self.files = mathematical_project(self.root)
        self.controller = Workstation(state_root=self.home / 'state')
        self.window = WorkstationWindow(self.controller)
        self.errors = []
        self.error_patch = patch.object(self.window, 'show_error', side_effect=self.errors.append)
        self.error_patch.start()
        self.window.show()
        self.app.processEvents()

    def tearDown(self):
        for timer in (self.window.disk_timer, self.window.process_timer, self.window.checkpoint_timer):
            timer.stop()
        self.wait_idle()
        if self.controller.workspace:
            self.controller.close_project(keep_recovery=True)
        self.window.close()
        self.app.processEvents()
        self.error_patch.stop()
        self.temp.cleanup()

    def wait_idle(self, timeout=30):
        deadline = time.monotonic() + timeout
        while self.window.jobs and time.monotonic() < deadline:
            self.app.processEvents()
            time.sleep(.01)
        self.app.processEvents()
        self.assertFalse(self.window.jobs, 'worker action did not complete')

    def open_project(self):
        with patch('theorem_terminal.gui.QFileDialog.getExistingDirectory', return_value=str(self.root)):
            self.window.actions['project'].trigger()
        self.wait_idle()

    def open_file(self, path):
        with patch('theorem_terminal.gui.QFileDialog.getOpenFileName', return_value=(str(path), '')):
            self.window.actions['open'].trigger()
        self.wait_idle()
        return self.window.active_pane()

    def select_passage(self, pane, start, end):
        from PySide6.QtGui import QTextCursor
        from theorem_terminal.gui import qt_position
        cursor = pane.text.textCursor()
        cursor.setPosition(qt_position(pane.text, start))
        cursor.setPosition(qt_position(pane.text, end), QTextCursor.MoveMode.KeepAnchor)
        pane.text.setTextCursor(cursor)

    def pane_position(self, pane):
        cursor = pane.text.textCursor()
        return (pane.shown, pane.text.toPlainText(), cursor.position(), cursor.anchor(),
                pane.text.verticalScrollBar().value(), pane.text.horizontalScrollBar().value())

    def restart_window(self):
        from theorem_terminal.gui import WorkstationWindow
        from theorem_terminal.workstation import Workstation
        self.window.flush()
        self.controller.close_project(keep_recovery=True)
        self.assertTrue(self.window.close())
        self.app.processEvents()
        self.error_patch.stop()
        self.controller = Workstation(state_root=self.home / 'state')
        self.window = WorkstationWindow(self.controller)
        self.error_patch = patch.object(self.window, 'show_error', side_effect=self.errors.append)
        self.error_patch.start()
        self.window.show()
        self.window.disk_timer.stop()
        self.app.processEvents()
        self.window.open_project(self.root)
        self.wait_idle()

    def test_completion_success_has_main_thread_affinity(self):
        from PySide6.QtCore import QThread
        worker, completed = [], []
        receiver = self.window.submit(lambda: (worker.append(QThread.currentThread()), 17)[1],
            lambda value: completed.append((value, QThread.currentThread())))
        self.wait_idle()
        self.assertEqual(receiver.delivered_thread, self.app.thread())
        self.assertEqual(completed, [(17, self.app.thread())])
        self.assertNotEqual(worker[0], self.app.thread())

    def test_completion_failure_has_main_thread_affinity(self):
        from PySide6.QtCore import QThread
        worker, completed = [], []
        def fail():
            worker.append(QThread.currentThread())
            raise ValueError('deliberate worker failure')
        receiver = self.window.submit(fail, lambda _: self.fail('success callback'),
            lambda error: completed.append((error, QThread.currentThread())))
        self.wait_idle()
        self.assertEqual(receiver.delivered_thread, self.app.thread())
        self.assertEqual(completed, [('deliberate worker failure', self.app.thread())])
        self.assertNotEqual(worker[0], self.app.thread())
        self.assertEqual(self.errors, ['deliberate worker failure'])

    def test_large_buffer_edit_burst_debounces_one_recovery_checkpoint(self):
        from PySide6.QtTest import QTest
        from PySide6.QtGui import QTextCursor
        self.open_project()
        path = self.root / 'large-proof.tex'
        path.write_text('% A polynomial calculation with a retained leading term.\\n' * 18000)
        pane = self.open_file(path)
        self.window.disk_timer.stop()
        self.window.flush()
        pane.text.moveCursor(QTextCursor.MoveOperation.End)
        with patch.object(self.controller.store, 'write_recovery', wraps=self.controller.store.write_recovery) as write:
            for number in range(20):
                pane.text.insertPlainText(f'% refinement {number}\\n')
            self.assertGreater(len(self.controller.buffer().content), 1_000_000)
            self.assertEqual(write.call_count, 0)
            QTest.qWait(80)
            self.assertEqual(write.call_count, 0, 'checkpoint ran before the debounce elapsed')
            QTest.qWait(450)
            self.assertEqual(write.call_count, 1)
            recovered = self.controller.store.read_recovery(self.controller.buffer().state)
            self.assertEqual(recovered['text'], self.controller.buffer().content)

    def test_actual_offline_widgets_directory_six_formats_edit_save_split_restart(self):
        with ExitStack() as stack:
            for name in ('socket.socket', 'subprocess.Popen', 'urllib.request.urlopen', 'theorem_terminal.documentary_warrant.run_lean_documentary_checker'):
                stack.enter_context(patch(name, side_effect=AssertionError('external action')))
            self.open_project()
            for path in self.files.values():
                self.open_file(path)
                self.assertFalse(self.window.active_pane().text.isReadOnly())
            left = self.open_file(self.files['notes/differences.tex'])
            original = self.files['notes/differences.tex'].read_bytes()
            from PySide6.QtGui import QTextCursor
            left.text.moveCursor(QTextCursor.MoveOperation.End)
            left.text.insertPlainText('% Mathematical editing through Qt')
            self.window.actions['save'].trigger()
            self.assertEqual(self.files['notes/differences.tex'].read_bytes(), original + b'% Mathematical editing through Qt')
            self.window.actions['split'].trigger()
            self.controller.activate(None, 1)
            self.window.render()
            right = self.open_file(self.files['proof.md'])
            right.text.appendPlainText('The leading term survives in characteristic zero.')
            self.window.actions['save'].trigger()
            from theorem_terminal.gui import qt_position
            from PySide6.QtGui import QTextCursor
            cursor = right.text.textCursor()
            cursor.setPosition(qt_position(right.text, '3.0'))
            cursor.setPosition(qt_position(right.text, '3.7'), QTextCursor.MoveMode.KeepAnchor)
            right.text.setTextCursor(cursor)
            self.window.actions['mark'].trigger()
            self.window.flush()
            visible = list(self.controller.current().visible)
            self.assertTrue(self.window.close_project())
            self.window.open_project(self.root)
            self.wait_idle()
            self.assertEqual(self.controller.current().visible, visible)
            self.assertEqual(self.controller.current().marker.start, '3.0')
            self.assertEqual(self.window.panes[1].text.textCursor().selectedText(), 'Expand ')
            self.assertFalse(self.window.context_dock.isVisible())
        self.assertFalse(self.errors)

    def test_background_revision_read_does_not_disable_editing_or_view_controls(self):
        import threading
        self.open_project()
        pane = self.open_file(self.files['proof.md'])
        ready = threading.Event()
        with patch('theorem_terminal.gui.Workstation.external_snapshot', side_effect=lambda *_: (ready.wait(2), None)[1]):
            self.window.observe_disk()
            try:
                self.assertTrue(self.window.actions['save'].isEnabled())
                self.assertTrue(self.window.actions['split'].isEnabled())
                self.window.actions['split'].trigger()
                self.assertTrue(self.controller.current().split)
                pane.text.insertPlainText('A retained mathematical observation. ')
                self.assertTrue(self.controller.buffer(pane.shown).dirty)
            finally:
                ready.set()
                self.wait_idle()
        self.assertFalse(self.errors)

    def test_loading_placeholder_preserves_recovered_cursor_selection_and_scroll(self):
        import threading
        from theorem_terminal.gui import WorkstationWindow, cursor_index
        from theorem_terminal.workstation import Workstation

        self.open_project()
        path = self.root / 'work-note.md'
        original = ''.join(f'Working observation {line}: a polynomial calculation.\n' for line in range(1, 221))
        path.write_text(original, encoding='utf-8')
        pane = self.open_file(path)
        pane.text.appendPlainText('Unsaved refinement: the leading coefficient is nonzero. α')
        recovered_text = pane.text.toPlainText()
        identifier = pane.shown
        expected = dict(cursor='155.12', selection=['150.0', '155.12'], yscroll=0.70, xscroll=0.0)
        self.controller.set_position(identifier, **expected)
        self.assertTrue(self.controller.checkpoint())
        self.controller.close_project(keep_recovery=True)
        self.assertTrue(self.window.close())
        self.app.processEvents()
        self.error_patch.stop()

        self.controller = Workstation(state_root=self.home / 'state')
        self.window = WorkstationWindow(self.controller)
        self.error_patch = patch.object(self.window, 'show_error', side_effect=self.errors.append)
        self.error_patch.start()
        self.window.show()
        self.window.disk_timer.stop()
        self.app.processEvents()
        ready, release = threading.Event(), threading.Event()
        load_snapshot = self.controller.load_snapshot

        def delayed_snapshot(buffer_id):
            snapshot = load_snapshot(buffer_id)
            ready.set()
            if not release.wait(30):
                raise TimeoutError('Test did not release the recovered snapshot')
            return snapshot

        with patch.object(self.controller, 'load_snapshot', side_effect=delayed_snapshot):
            try:
                self.window.open_project(self.root)
                self.assertTrue(ready.wait(5), 'snapshot worker did not start')
                pane = self.window.active_pane()
                self.assertEqual(pane.shown, identifier)
                self.assertFalse(pane.loading)
                self.assertFalse(self.controller.buffer(identifier).loaded)
                self.assertEqual(pane.text.toPlainText(), 'Loading this document…')
                self.assertTrue(self.window.jobs)
                state = self.controller.buffer(identifier).state
                self.assertEqual({key: getattr(state, key) for key in expected}, expected)
                # Exercise delayed placeholder signals while completion is held;
                # neither Qt event timing nor the synchronous loading guard can mask it.
                pane.capture_position()
                self.assertEqual({key: getattr(state, key) for key in expected}, expected)
            finally:
                release.set()
                self.wait_idle()

        buffer = self.controller.buffer(identifier)
        self.assertTrue(buffer.loaded)
        self.assertTrue(buffer.dirty)
        self.assertEqual(buffer.content, recovered_text)
        self.assertEqual(pane.text.toPlainText(), recovered_text)
        self.assertIn('latest completed local checkpoint', buffer.recovery_warning)
        self.assertIn('recovered', pane.notice.text())
        cursor = pane.text.textCursor()
        self.assertEqual(cursor_index(pane.text, cursor.position()), expected['cursor'])
        self.assertEqual([cursor_index(pane.text, cursor.selectionStart()),
                          cursor_index(pane.text, cursor.selectionEnd())], expected['selection'])
        self.assertEqual(buffer.state.cursor, expected['cursor'])
        self.assertEqual(buffer.state.selection, expected['selection'])
        vertical = pane.text.verticalScrollBar()
        self.assertGreater(vertical.value(), 0)
        self.assertAlmostEqual(vertical.value() / vertical.maximum(), expected['yscroll'], delta=0.03)
        self.assertEqual(path.read_text(encoding='utf-8'), original)
        self.assertFalse(self.errors)

    def test_failed_checkpoint_blocks_quit_and_keeps_visible_text(self):
        from PySide6.QtWidgets import QMessageBox
        self.open_project()
        pane = self.open_file(self.files['proof.md'])
        pane.text.appendPlainText('Unsaved exact work α')
        with patch.object(self.controller.store, 'save', side_effect=OSError('checkpoint denied')), patch.object(QMessageBox, 'exec', return_value=0):
            self.assertFalse(self.window.close())
            self.app.processEvents()
        self.assertTrue(self.window.isVisible())
        self.assertIsNotNone(self.controller.workspace)
        self.assertIn('Unsaved exact work α', pane.text.toPlainText())
        self.assertTrue(self.controller.checkpoint())

    def test_find_line_new_file_save_as_refresh_and_configured_editor_menu(self):
        self.open_project()
        pane = self.open_file(self.files['calculations/check.py'])
        with patch('theorem_terminal.gui.QInputDialog.getText', return_value=('return', True)):
            self.window.actions['find'].trigger()
        self.assertEqual(pane.text.textCursor().selectedText(), 'return')
        with patch('theorem_terminal.gui.QInputDialog.getInt', return_value=(1, True)):
            self.window.actions['line'].trigger()
        self.assertEqual(pane.text.textCursor().blockNumber(), 0)
        self.window.actions['new'].trigger()
        pane = self.window.active_pane()
        pane.text.insertPlainText('Working calculation\n')
        destination = self.root / 'working.txt'
        with patch('theorem_terminal.gui.QFileDialog.getSaveFileName', return_value=(str(destination), '')):
            self.window.actions['save_as'].trigger()
        self.assertEqual(destination.read_text(), 'Working calculation\n')
        destination.write_text('External calculation\n')
        self.window.actions['refresh'].trigger()
        self.assertEqual(pane.text.toPlainText(), 'External calculation\n')
        with patch('theorem_terminal.gui.QInputDialog.getText', return_value=('editor --line {line} {file}', True)):
            self.window.actions['editor_config'].trigger()
        with patch('theorem_terminal.tool_settings.resolve_executable', return_value='/tools/editor'), patch('theorem_terminal.tool_settings.subprocess.Popen') as launch:
            self.window.actions['external'].trigger()
            self.assertEqual(launch.call_args.args, (['/tools/editor', '--line', '2', str(destination)],))
            self.assertIs(launch.call_args.kwargs['shell'], False)
            launch.return_value.poll.return_value = 0
            launch.return_value.returncode = 0
            self.window.reap_editors()
        self.window.actions['close'].trigger()
        self.assertFalse(self.errors)

    def test_diagnostic_centers_the_line_in_long_loaded_and_deferred_buffers(self):
        from PySide6.QtCore import Qt
        from PySide6.QtWidgets import QListWidgetItem
        self.open_project()
        path = self.root / 'long-proof.tex'
        path.write_text(''.join(f'% Mathematical line {n}\n' for n in range(1, 201)))
        self.open_file(path)
        self.assertTrue(self.window.close_project())
        self.controller.open_project(self.root)
        identifier = self.controller.current().active
        self.assertFalse(self.controller.buffer(identifier).loaded)
        self.window.resize(960, 680)
        for line in (160, 30):
            row = QListWidgetItem('Reported TeX location')
            row.setData(Qt.ItemDataRole.UserRole, dict(path=str(path), line=line, message='test location'))
            self.window.activate_diagnostic(row)
            self.wait_idle()
            edit = self.window.active_pane().text
            self.assertEqual(edit.textCursor().blockNumber(), line - 1)
            self.assertTrue(edit.viewport().rect().contains(edit.cursorRect().center()))
            self.assertGreater(self.controller.buffer().state.yscroll, 0)
        self.assertFalse(self.errors)

    def test_model_response_projection_and_integral_record_facets(self):
        self.open_project()
        path = self.root / 'completed.json'
        path.write_bytes(encode(model_call_document(response='First α\r\n\r\nSecond β\n')))
        pane = self.open_file(path)
        self.assertTrue(pane.text.isReadOnly())
        pane.passage.setValue(2)
        pane.review('passage')
        self.assertIn('Second β', pane.text.toPlainText())
        before = {p: p.read_bytes() for p in self.root.rglob('*') if p.is_file()}
        with patch('theorem_terminal.gui.QFileDialog.getSaveFileName', return_value=('', '')):
            pane.retain.click()
        self.assertEqual(before, {p: p.read_bytes() for p in self.root.rglob('*') if p.is_file()})
        pane.passage.setValue(1)
        destination = self.root / 'selected.json'
        with patch('theorem_terminal.gui.QFileDialog.getSaveFileName', return_value=(str(destination), '')):
            pane.retain.click()
        from theorem_terminal.documentary_warrant import parse_documentary_projection
        self.assertEqual(parse_documentary_projection(destination.read_bytes()).representation.content, 'Second β\n')
        verification, bundle = verification_fixture()
        vp, bp = self.root / 'verification.json', self.root / 'bundle.json'
        vp.write_bytes(verification)
        bp.write_bytes(bundle)
        with patch('theorem_terminal.gui.QFileDialog.getOpenFileName', side_effect=[(str(vp), ''), (str(bp), '')]):
            self.window.actions['verification'].trigger()
        self.wait_idle()
        from PySide6.QtWidgets import QToolButton
        labels = [button.text() for button in self.window.facets.findChildren(QToolButton)]
        for prefix in ('ClaimAtomVersion', 'PremiseAdmission', 'JustificationContext', 'JustificationDerivation', 'Verification', 'Provenance'):
            self.assertTrue(any(label.startswith(prefix) for label in labels), labels)
        self.assertTrue(self.window.context_dock.isVisible())
        self.assertFalse(self.errors)

    def test_working_context_widgets_restart_unicode_crlf_and_independent_marker(self):
        from copy import deepcopy
        from PySide6.QtCore import Qt
        from PySide6.QtTest import QTest
        from theorem_terminal.gui import EditorPane
        tex = self.files['notes/differences.tex']
        tex.write_bytes('% α😀 base\r\nProof line β\r\n'.encode('utf-8'))
        external = self.home / 'external-reference.txt'
        external.write_text('External α reference\n', encoding='utf-8')
        original = {p: p.read_bytes() for p in [*self.files.values(), external]}
        with ExitStack() as stack:
            for name in ('socket.socket', 'subprocess.Popen', 'os.system', 'urllib.request.urlopen',
                         'theorem_terminal.documentary_warrant.run_lean_documentary_checker',
                         'theorem_terminal.latex_build.run_latex',
                         'theorem_terminal.gui.QInputDialog.getText', 'theorem_terminal.gui.QInputDialog.getInt'):
                stack.enter_context(patch(name, side_effect=AssertionError('unexpected tool, network or form')))
            self.open_project()
            self.window.disk_timer.stop()
            self.assertFalse(self.window.selection_dock.isVisible())
            paths = [tex, tex, self.files['formal/Basic.lean'], external, self.files['proof.md']]
            spans = [('1.2', '2.5'), ('1.2', '1.4'), ('1.0', '1.7'), ('1.0', '1.8'), ('1.0', '1.5')]
            for index, (path, span) in enumerate(zip(paths, spans)):
                pane = self.open_file(path)
                if path == self.files['proof.md']:
                    pane.text.appendPlainText('Unsaved working observation α')
                pane.text.setFocus()
                self.select_passage(pane, *span)
                focus = self.app.focusWidget()
                before = self.pane_position(pane)[:4]
                self.assertTrue(self.window.actions['context_add'].isEnabled())
                self.window.actions['context_add'].trigger()
                self.assertEqual(self.window.selection_list.count(), index + 1)
                self.assertEqual(self.window.selection_list.currentRow(), index)
                self.assertEqual(self.pane_position(pane)[:4], before)
                self.assertIs(self.app.focusWidget(), focus)
                self.assertTrue(self.window.selection_dock.isVisible())
                label = str(path.relative_to(self.root)) if path.is_relative_to(self.root) else str(path)
                self.assertEqual(self.window.selection_list.item(index).text(), f'{label} · {span[0]}–{span[1]}')
                self.assertIn(str(path), self.window.selection_list.item(index).toolTip())
                self.assertIn(self.controller.current().selection_shelf[index].revision,
                              self.window.selection_list.item(index).toolTip())
            self.window.actions['context_add'].trigger()
            self.assertEqual(self.window.selection_list.count(), 5)
            self.select_passage(pane, '3.0', '3.7')
            self.window.actions['mark'].trigger()
            marker = deepcopy(self.controller.current().marker)
            self.assertEqual(self.window.actions['mark'].text(), 'Mark unfinished work here')
            self.assertEqual(self.window.actions['return'].text(), 'Return to unfinished work')
            self.assertEqual(self.window.actions['clear_marker'].text(), 'Clear unfinished marker')
            self.app.processEvents()
            before = self.pane_position(pane)
            item = self.window.selection_list.item(0)
            row_point = self.window.selection_list.visualItemRect(item).center()
            QTest.mouseClick(self.window.selection_list.viewport(), Qt.MouseButton.LeftButton, pos=row_point)
            self.assertEqual(self.pane_position(pane), before)
            QTest.mouseDClick(self.window.selection_list.viewport(), Qt.MouseButton.LeftButton, pos=row_point)
            self.wait_idle()
            left = self.window.panes[0]
            self.assertEqual(left.text.textCursor().selectedText(), 'α😀 base\u2029Proof')
            self.window.selection_list.setCurrentRow(1)
            before = self.pane_position(left)
            self.window.context_buttons['context_other'].click()
            self.wait_idle()
            self.assertTrue(self.controller.current().split)
            self.assertEqual(self.pane_position(left), before)
            self.assertEqual(self.window.panes[1].text.textCursor().selectedText(), 'α😀')
            self.window.selection_list.setCurrentRow(2)
            before = self.pane_position(self.window.panes[1])
            self.window.actions['context_other'].trigger()
            self.wait_idle()
            self.assertEqual(self.pane_position(self.window.panes[1]), before)
            self.window.selection_list.setCurrentRow(4)
            self.window.context_buttons['context_open'].click()
            self.wait_idle()
            work = self.window.active_pane()
            self.select_passage(work, '3.0', '3.7')
            expected_work = self.pane_position(work)
            rows = [self.window.selection_list.item(i).text() for i in range(5)]
            self.restart_window()
            self.assertTrue(self.window.selection_dock.isVisible())
            self.assertEqual([self.window.selection_list.item(i).text() for i in range(5)], rows)
            self.assertEqual(self.pane_position(self.window.active_pane()), expected_work)
            self.assertTrue(self.controller.buffer().recovery_warning)
            self.assertEqual(self.controller.current().marker, marker)
            self.assertTrue(self.controller.current().split)
            self.window.selection_list.setCurrentRow(0)
            before = self.pane_position(self.window.active_pane())
            self.window.actions['context_other'].trigger()
            self.wait_idle()
            self.assertEqual(self.pane_position(self.window.panes[0]), before)
            self.assertEqual(self.window.panes[1].text.textCursor().selectedText(), 'α😀 base\u2029Proof')
            self.assertEqual(self.controller.buffer().content.encode('utf-8'), original[tex])
            self.window.context_buttons['context_remove'].click()
            self.assertEqual(self.window.selection_list.count(), 4)
            self.assertEqual(self.controller.current().marker, marker)
            self.assertEqual(len(self.window.panes), 2)
            self.assertEqual(len(self.window.findChildren(EditorPane)), 2)
        self.assertEqual({p: p.read_bytes() for p in original}, original)
        self.assertFalse(self.errors)

    def test_working_context_display_is_lazy_and_add_requires_a_current_file_selection(self):
        self.open_project()
        self.window.disk_timer.stop()
        pane = self.open_file(self.files['proof.md'])
        self.assertFalse(self.window.actions['context_add'].isEnabled())
        self.select_passage(pane, '3.0', '3.7')
        self.window.actions['context_add'].trigger()
        self.window.actions['close'].trigger()
        self.assertEqual(self.window.selection_list.count(), 1)
        self.assertFalse(self.controller.buffers)
        self.assertTrue(self.window.close_project())
        with patch('theorem_terminal.workstation.text_snapshot', side_effect=AssertionError('shelf read source content')):
            self.window.open_project(self.root)
            self.wait_idle()
            self.window.render()
            self.window.selection_dock.toggleViewAction().trigger()
            self.window.selection_dock.toggleViewAction().trigger()
            self.assertTrue(self.window.selection_dock.isVisible())
            self.assertEqual(self.window.selection_list.count(), 1)
        self.window.actions['context_open'].trigger()
        self.wait_idle()
        self.assertEqual(self.window.active_pane().text.textCursor().selectedText(), 'Expand ')
        self.window.actions['new'].trigger()
        pane = self.window.active_pane()
        pane.text.insertPlainText('Untitled text')
        self.select_passage(pane, '1.0', '1.5')
        self.assertFalse(self.window.actions['context_add'].isEnabled())
        self.assertFalse(self.errors)

    def test_working_context_failed_open_retains_rows_editors_and_unsplit_layout(self):
        self.open_project()
        self.window.disk_timer.stop()
        path = self.files['proof.md']
        pane = self.open_file(path)
        self.select_passage(pane, '3.0', '3.7')
        self.window.actions['context_add'].trigger()
        self.window.actions['mark'].trigger()
        self.open_file(self.files['notes/differences.tex'])
        from copy import deepcopy
        marker = deepcopy(self.controller.current().marker)
        original = path.read_bytes()
        for missing in (False, True):
            if missing:
                path.unlink()
            else:
                path.write_bytes(b'Changed revision\n' + original)
            before = [self.pane_position(pane) for pane in self.window.panes]
            self.window.actions['context_other'].trigger()
            self.wait_idle()
            self.assertEqual([self.pane_position(pane) for pane in self.window.panes], before)
            self.assertFalse(self.controller.current().split)
            self.assertEqual(self.window.selection_list.count(), 1)
            self.assertEqual(self.controller.current().marker, marker)
            self.assertTrue(self.errors)
            self.errors.clear()
            path.write_bytes(original)

    @unittest.skipUnless(shutil.which('pdflatex'), 'No real TeX tool available')
    def test_actual_qtpdf_build_diagnostic_navigation_sizes_and_resumption(self):
        self.open_project()
        root = tex_project(self.root)
        self.controller.settings_store.configure('tex_engine', shutil.which('pdflatex'))
        self.open_file(root)
        self.window.actions['tex_root'].trigger()
        self.assertTrue(self.window.actions['build'].isEnabled())
        self.window.actions['build'].trigger()
        self.wait_idle(timeout=60)
        self.assertFalse(self.errors)
        self.assertEqual(self.window.pdf.document.pageCount(), 2)
        self.assertTrue(self.window.pdf.isVisible())
        self.window.pdf.goto(2)
        self.window.pdf.zoom.setCurrentIndex(1)
        self.window.pdf.capture()
        self.window.flush()
        self.assertTrue(self.window.close_project())
        self.window.open_project(self.root)
        self.wait_idle()
        self.assertEqual(self.window.pdf.page.value(), 2)
        self.assertEqual(self.window.pdf.zoom.currentData(), 'page')
        original_pdf = self.window.pdf.report['id']
        (self.root / 'argument.tex').write_text('\\undefinedMathematicalCommand\n')
        self.window.actions['build'].trigger()
        self.wait_idle(timeout=60)
        self.assertEqual(self.window.pdf.report['id'], original_pdf)
        self.assertIn('failed', self.window.build_summary.text())
        self.assertGreater(self.window.diagnostics.count(), 0)
        row = self.window.diagnostics.item(0)
        self.window.activate_diagnostic(row)
        self.wait_idle()
        self.assertEqual(self.controller.buffer().state.path, str(self.root / 'argument.tex'))
        self.assertEqual(self.window.active_pane().text.textCursor().blockNumber(), 0)
        for width, height in ((1280, 820), (960, 680)):
            self.window.resize(width, height)
            self.app.processEvents()
            for widget in (self.window.panes[0].text, self.window.pdf.view, self.window.pdf.page, self.window.pdf.zoom):
                self.assertTrue(widget.isVisible())
                self.assertGreater(widget.width(), 35)
                self.assertGreater(widget.height(), 20)
            self.assertGreater(self.window.panes[0].text.width(), 200)
            self.assertGreater(self.window.pdf.view.width(), 200)
        self.window.pdf.page.setValue(1)
        self.assertFalse(self.window.pdf.previous_button.isEnabled())
        self.window.pdf.next_button.click()
        self.assertEqual(self.window.pdf.view.pageNavigator().currentPage(), 1)
        self.assertFalse(self.window.pdf.next_button.isEnabled())
        self.window.pdf.page.setValue(1)
        self.assertEqual(self.window.pdf.view.pageNavigator().currentPage(), 0)
        self.window.actions['pdf'].setChecked(False)
        self.window.toggle_pdf(False)
        self.window.pdf.capture()
        self.window.resize(960, 680)
        self.app.processEvents()
        self.window.render()
        self.assertFalse(self.controller.current().pdf_visible)
        self.assertFalse(self.window.pdf.isVisible())
        self.assertFalse(self.errors)


if __name__ == '__main__':
    unittest.main()
