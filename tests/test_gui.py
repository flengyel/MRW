"""Actual PySide6 widgets, with temporary ordinary mathematical projects."""

from contextlib import ExitStack
from copy import deepcopy
import os
from pathlib import Path
import shutil
import tempfile
import time
import unittest
from unittest.mock import patch

from test_latex_build import tex_project
from test_model_projection import model_call_document, encode
from test_workstation import mathematical_project, minimal_pdf, verification_fixture


@unittest.skipUnless(os.environ.get('MRW_GUI_TESTS') == '1', 'set MRW_GUI_TESTS=1 to exercise actual Qt widgets')
class GraphicalEditorTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from PySide6.QtWidgets import QApplication
        cls.app = QApplication.instance() or QApplication([])

    def setUp(self):
        from mrw.gui import WorkstationWindow
        from mrw.workstation import Workstation
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
        with patch('mrw.gui.QFileDialog.getExistingDirectory', return_value=str(self.root)):
            self.window.actions['project'].trigger()
        self.wait_idle()

    def open_file(self, path):
        with patch('mrw.gui.QFileDialog.getOpenFileName', return_value=(str(path), '')):
            self.window.actions['open'].trigger()
        self.wait_idle()
        return self.window.active_pane()

    def select_passage(self, pane, start, end):
        from PySide6.QtGui import QTextCursor
        from mrw.gui import qt_position
        cursor = pane.text.textCursor()
        cursor.setPosition(qt_position(pane.text, start))
        cursor.setPosition(qt_position(pane.text, end), QTextCursor.MoveMode.KeepAnchor)
        pane.text.setTextCursor(cursor)

    def pane_position(self, pane):
        cursor = pane.text.textCursor()
        return (pane.shown, pane.text.toPlainText(), cursor.position(), cursor.anchor(),
                pane.text.verticalScrollBar().value(), pane.text.horizontalScrollBar().value())

    def restart_window(self, *, discard_session=False):
        from mrw.gui import WorkstationWindow
        from mrw.workstation import Workstation
        if not discard_session:
            self.window.flush()
        self.controller.close_project(keep_recovery=True, discard_session=discard_session)
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

    def shared_editors(self, *, wrapped=False):
        self.open_project()
        self.window.disk_timer.stop()
        self.window.resize(1280, 820)
        if self.window.actions['wrap'].isChecked() != wrapped:
            self.window.actions['wrap'].trigger()
        path = self.root / 'shared.txt'
        path.write_text(''.join(f'{n:03d}: ' + ('wrapped text ' * 60 if wrapped and n == 40 else
                                               'A logical passage with α and β. ' * (1 if wrapped else 12)) + '\n'
                                for n in range(1, 241)), encoding='utf-8')
        left = self.open_file(path)
        self.window.actions['split'].trigger()
        self.window.select(left.shown, 1)
        self.app.processEvents()
        right = self.window.panes[1]
        self.select_passage(left, '20.0', '20.22')
        self.select_passage(right, '180.0', '180.22')
        return path, left, right

    def anchor_text(self, entry):
        from PySide6.QtGui import QTextCursor
        document = next(d for i, d in self.window.documents.items()
                        if self.controller.buffer(i).state.path == entry.path)
        cursor = QTextCursor(document)
        from mrw.gui import document_position
        cursor.setPosition(document_position(document, entry.start))
        cursor.setPosition(document_position(document, entry.end), QTextCursor.MoveMode.KeepAnchor)
        return cursor.selectedText()

    def test_live_marker_translates_before_edits_and_ignores_after_edits(self):
        path, left, right = self.shared_editors()
        self.window.select(left.shown, 0)
        self.select_passage(left, '100.5', '100.22')
        self.window.actions['mark'].trigger()
        intended = left.text.textCursor().selectedText()
        self.select_passage(left, '1.0', '1.0')
        left.text.insertPlainText('Inserted above\n')
        marker = self.controller.current().marker
        self.assertEqual((marker.start, marker.end), ('101.5', '101.22'))
        self.assertEqual(self.anchor_text(marker), intended)
        self.select_passage(right, '1.0', '2.0')
        right.text.insertPlainText('')
        self.assertEqual(self.controller.current().marker.start, '100.5')
        self.select_passage(right, '240.0', '240.0')
        right.text.insertPlainText('Inserted below\n')
        self.assertEqual(self.anchor_text(self.controller.current().marker), intended)
        right.text.undo()
        left.text.undo()
        self.assertEqual(self.controller.current().marker.start, '101.5')
        right.text.undo()
        self.assertEqual(self.controller.current().marker.start, '100.5')
        for pane in (left, right, left):
            pane.text.redo()
        self.assertEqual(self.anchor_text(self.controller.current().marker), intended)
        self.assertFalse(self.errors)

    def test_live_shelf_ranges_are_independent_and_update_inside_edits(self):
        path, left, right = self.shared_editors()
        self.window.select(left.shown, 0)
        for start, end in (('40.5', '40.22'), ('180.5', '180.22')):
            self.select_passage(left, start, end)
            self.window.actions['context_add'].trigger()
            for _ in range(5):
                self.app.processEvents()
        self.assertFalse(self.errors)
        self.assertEqual(self.window.selection_list.count(), 2)
        expected = [self.anchor_text(s) for s in self.controller.current().selection_shelf]
        self.select_passage(left, '100.0', '100.0')
        left.text.insertPlainText('Between the retained passages\n')
        self.assertEqual([s.start for s in self.controller.current().selection_shelf], ['40.5', '181.5'])
        self.assertEqual([self.anchor_text(s) for s in self.controller.current().selection_shelf], expected)
        self.select_passage(right, '40.10', '40.10')
        right.text.insertPlainText('😀 refined ')
        entry = self.controller.current().selection_shelf[0]
        self.assertEqual(self.anchor_text(entry), expected[0][:5] + '😀 refined ' + expected[0][5:])
        self.assertEqual(entry.preview, self.anchor_text(entry))
        self.assertEqual(self.controller.current().selection_shelf[1].start, '181.5')
        self.assertIs(left.text.document(), right.text.document())
        self.assertEqual(left.text.toPlainText(), self.controller.buffer(left.shown).content)
        self.assertFalse(self.errors)

    def test_retained_preview_coordinates_and_marker_location_are_source_free(self):
        self.open_project()
        self.window.disk_timer.stop()
        path = self.root / 'preview.tex'
        path.write_bytes('α😀  lemma\r\n\t exact   passage\r\n'.encode('utf-8'))
        pane = self.open_file(path)
        self.select_passage(pane, '1.1', '2.8')
        self.window.actions['context_add'].trigger()
        self.window.actions['mark'].trigger()
        entry = self.controller.current().selection_shelf[0]
        self.assertEqual(getattr(entry, 'preview', None), '😀 lemma exact')
        with patch('mrw.workstation.text_snapshot', side_effect=AssertionError('display read source')):
            self.window.refresh_selection_shelf()
            self.window.update_actions()
        row = self.window.selection_list.item(0)
        self.assertIn('1:2–2:9', row.text())
        self.assertIn('😀 lemma exact', row.text())
        self.assertIn('1.1–2.8', row.toolTip())
        self.assertIn('preview.tex', self.window.actions['return'].toolTip())
        self.assertIn('1:2', self.window.actions['return'].toolTip())
        self.assertEqual((entry.start, entry.end), ('1.1', '2.8'))

    def test_keyboard_navigator_activation_opens_exactly_once(self):
        from PySide6.QtCore import Qt
        from PySide6.QtTest import QTest
        self.open_project()
        path = self.files['proof.md']
        index = self.window.file_filter.mapFromSource(self.window.filesystem.index(str(path)))
        self.assertTrue(index.isValid())
        self.window.navigator.setCurrentIndex(index)
        self.window.navigator.setFocus()
        with patch.object(self.window, 'open_file', wraps=self.window.open_file) as opened:
            QTest.keyClick(self.window.navigator, Qt.Key.Key_Return)
            self.wait_idle()
            self.assertEqual(opened.call_count, 1, 'Normal keyboard activation must open exactly once')
        self.assertEqual(self.controller.buffer().state.path, str(path))
        pdf = self.root / 'navigator-reference.pdf'
        pdf.write_bytes(minimal_pdf())
        index = self.window.file_filter.mapFromSource(self.window.filesystem.index(str(pdf)))
        self.assertTrue(index.isValid())
        self.window.navigator.setCurrentIndex(index)
        self.window.navigator.setFocus()
        QTest.keyClick(self.window.navigator, Qt.Key.Key_Return)
        self.wait_idle()
        self.assertEqual(self.window.pdf.kind, 'imported')
        self.assertEqual(self.controller.buffer().state.path, str(path))
        self.assertFalse(any(buffer.state.path == str(pdf) for buffer in self.controller.buffers.values()))

    def test_live_anchor_boundary_affinity_deletion_and_undo(self):
        from copy import deepcopy
        self.open_project()
        self.window.disk_timer.stop()
        path = self.root / 'affinity.txt'
        path.write_bytes('α😀 before |retained text| after\r\nContinuation\r\n'.encode('utf-8'))
        pane = self.open_file(path)
        self.select_passage(pane, '1.11', '1.24')
        self.window.actions['context_add'].trigger()
        for _ in range(5):
            self.app.processEvents()
        self.select_passage(pane, '2.4', '2.4')
        self.window.actions['mark'].trigger()
        self.assertEqual(self.anchor_text(self.controller.current().selection_shelf[0]), 'retained text')
        for boundary in ('start', 'end'):
            entry = self.controller.current().selection_shelf[0]
            position = getattr(entry, boundary)
            self.select_passage(pane, position, position)
            pane.text.insertPlainText('outside😀')
            self.assertEqual(self.anchor_text(self.controller.current().selection_shelf[0]), 'retained text')
            pane.text.undo()
            self.assertEqual(self.anchor_text(self.controller.current().selection_shelf[0]), 'retained text')
            pane.text.redo()
            self.assertEqual(self.anchor_text(self.controller.current().selection_shelf[0]), 'retained text')
        self.select_passage(pane, '2.4', '2.4')
        pane.text.insertPlainText('😀next')
        self.assertEqual(self.controller.current().marker.start, '2.9')
        self.assertEqual(self.controller.current().marker.end, '2.9')
        pane.text.undo()
        self.assertEqual(self.controller.current().marker.start, '2.4')
        pane.text.redo()
        self.assertEqual(self.controller.current().marker.start, '2.9')
        self.window.flush()
        pinned = deepcopy(self.controller.current().selection_shelf[0])
        self.select_passage(pane, pinned.start, pinned.end)
        pane.text.insertPlainText('')
        self.assertEqual(self.controller.current().selection_shelf, [pinned])
        self.assertIn('Changed', self.window.selection_list.item(0).text())
        before = [self.pane_position(p) for p in self.window.panes]
        self.window.actions['context_other'].trigger()
        self.wait_idle()
        self.assertEqual([self.pane_position(p) for p in self.window.panes], before)
        self.assertFalse(self.controller.current().split)
        self.assertTrue(self.errors)
        self.errors.clear()
        pane.text.undo()
        self.assertEqual(self.anchor_text(self.controller.current().selection_shelf[0]), 'retained text')
        self.assertNotIn('Changed', self.window.selection_list.item(0).text())
        pane.text.redo()
        self.assertEqual(self.controller.current().selection_shelf, [pinned])
        self.restart_window()
        self.assertIn('Changed', self.window.selection_list.item(0).text())
        self.assertEqual(self.controller.current().selection_shelf, [pinned])
        self.assertEqual(path.read_bytes(), 'α😀 before |retained text| after\r\nContinuation\r\n'.encode('utf-8'))

    def test_edited_anchors_ignore_pane_geometry_and_restore_recovery_then_saved_bytes(self):
        from copy import deepcopy
        from hashlib import sha256
        path, left, right = self.shared_editors()
        # Exercise scalar columns and exact CRLF recovery through real Qt edits.
        self.controller.discard(left.shown)
        raw = path.read_bytes().replace(b'\n', b'\r\n')
        path.write_bytes(raw)
        self.controller.refresh(left.shown)
        self.window.render()
        self.window.select(left.shown, 0)
        for start, end in (('40.5', '40.22'), ('180.5', '180.22')):
            self.select_passage(left, start, end)
            self.window.actions['context_add'].trigger()
            for _ in range(5):
                self.app.processEvents()
        self.select_passage(left, '100.5', '100.22')
        self.window.actions['mark'].trigger()
        marker_text = self.anchor_text(self.controller.current().marker)
        self.select_passage(left, '1.0', '1.0')
        left.text.insertPlainText('😀 inserted above\n' * 20)
        self.select_passage(right, '261.0', '261.0')
        right.text.insertPlainText('Added below\n' * 20)
        self.select_passage(right, '60.10', '60.10')
        right.text.insertPlainText('α😀 refinement ')
        self.select_passage(left, '50.5', '50.22')
        self.select_passage(right, '210.5', '210.22')
        for pane, scroll in ((left, 40), (right, 195)):
            pane.text.verticalScrollBar().setValue(scroll)
            pane.capture_position()
        wanted = deepcopy((self.controller.current().marker, self.controller.current().selection_shelf))
        for action in (self.window.render, lambda: right.text.setFocus(),
                       lambda: self.window.actions['wrap'].trigger(), lambda: self.window.actions['wrap'].trigger(),
                       lambda: self.window.actions['split'].trigger(), lambda: self.window.actions['split'].trigger(),
                       lambda: self.window.editors.moveSplitter(180, 1), lambda: self.window.resize(960, 680)):
            action()
            for _ in range(5):
                self.app.processEvents()
            self.assertEqual((self.controller.current().marker, self.controller.current().selection_shelf), wanted)
        self.window.flush()
        expected = self.controller.buffer(left.shown).content
        self.assertIn('\r\n', expected)
        self.assertEqual(wanted[0].revision, sha256(expected.encode('utf-8')).hexdigest())
        # Splitter ratios are not session fields. Compare exact scroll pixels
        # at the same stable viewport dimensions used by a fresh window.
        self.window.editors.setSizes([500, 500])
        for _ in range(5):
            self.app.processEvents()
        self.window.flush()
        positions = [self.pane_position(p) for p in self.window.panes]
        self.restart_window()
        self.assertEqual([self.pane_position(p) for p in self.window.panes], positions)
        self.assertEqual((self.controller.current().marker, self.controller.current().selection_shelf), wanted)
        self.assertEqual(self.controller.buffer().content, expected)
        self.assertEqual(self.anchor_text(self.controller.current().marker), marker_text)
        self.window.actions['return'].trigger()
        self.wait_idle()
        self.assertEqual(self.window.active_pane().text.textCursor().selectedText(), marker_text)
        self.window.actions['save'].trigger()
        self.assertEqual(path.read_bytes(), expected.encode('utf-8'))
        self.restart_window()
        self.assertEqual((self.controller.current().marker, self.controller.current().selection_shelf), wanted)
        self.assertFalse(self.controller.buffer().dirty)
        for index in range(2):
            self.window.selection_list.setCurrentRow(index)
            self.window.actions['context_other'].trigger()
            self.wait_idle()
            self.assertEqual(self.window.active_pane().text.textCursor().selectedText(),
                             self.anchor_text(self.controller.current().selection_shelf[index]))
        self.assertFalse(self.errors)

    def test_live_anchor_history_handles_merged_typing_and_new_undo_branches(self):
        from PySide6.QtTest import QTest
        self.open_project()
        self.window.disk_timer.stop()
        path = self.root / 'undo-note.txt'
        path.write_text('head\nretained passage\nfoot\n', encoding='utf-8')
        pane = self.open_file(path)
        self.select_passage(pane, '2.0', '2.8')
        self.window.actions['context_add'].trigger()
        for _ in range(5):
            self.app.processEvents()
        self.select_passage(pane, '2.3', '2.3')
        QTest.keyClicks(pane.text, 'ABC')
        self.assertEqual(self.anchor_text(self.controller.current().selection_shelf[0]), 'retABCained')
        pane.text.undo()
        self.assertEqual(self.anchor_text(self.controller.current().selection_shelf[0]), 'retained')
        pane.text.redo()
        self.assertEqual(self.anchor_text(self.controller.current().selection_shelf[0]), 'retABCained')
        pane.text.undo()
        self.select_passage(pane, '1.0', '1.0')
        pane.text.insertPlainText('Different branch\n')
        self.assertEqual(self.controller.current().selection_shelf[0].start, '3.0')
        self.assertEqual(self.anchor_text(self.controller.current().selection_shelf[0]), 'retained')
        self.assertFalse(pane.text.document().isRedoAvailable())
        pane.text.undo()
        self.assertEqual(self.controller.current().selection_shelf[0].start, '2.0')
        pane.text.redo()
        self.assertEqual(self.controller.current().selection_shelf[0].start, '3.0')
        self.assertFalse(self.errors)

    def test_converging_live_ranges_keep_rows_and_text_without_duplicate_pins(self):
        from copy import deepcopy
        self.open_project()
        self.window.disk_timer.stop()
        path = self.root / 'overlap.txt'
        path.write_text('---aaKEEPbb---', encoding='utf-8')
        pane = self.open_file(path)
        for start, end in (('1.5', '1.9'), ('1.3', '1.11')):
            self.select_passage(pane, start, end)
            self.window.actions['context_add'].trigger()
            for _ in range(5):
                self.app.processEvents()
        pinned = deepcopy(self.controller.current().selection_shelf[1])
        self.select_passage(pane, '1.3', '1.5')
        pane.text.insertPlainText('')
        self.select_passage(pane, '1.7', '1.9')
        pane.text.insertPlainText('')
        self.assertEqual(pane.text.toPlainText(), '---KEEP---')
        self.assertEqual(self.window.selection_list.count(), 2)
        self.assertEqual(self.anchor_text(self.controller.current().selection_shelf[0]), 'KEEP')
        self.assertEqual(self.controller.current().selection_shelf[1], pinned)
        self.assertIn('Changed', self.window.selection_list.item(1).text())
        pane.text.undo()
        self.assertEqual(self.anchor_text(self.controller.current().selection_shelf[1]), 'KEEPbb')
        pane.text.redo()
        self.assertEqual(self.controller.current().selection_shelf[1], pinned)
        self.assertTrue(self.controller.checkpoint())
        self.assertFalse(self.errors)

    def test_live_anchors_restore_with_missing_base_without_diagnostic_capture(self):
        from copy import deepcopy
        path, left, right = self.shared_editors()
        self.window.select(left.shown, 0)
        self.select_passage(left, '100.5', '100.22')
        self.window.actions['mark'].trigger()
        self.window.actions['context_add'].trigger()
        for _ in range(5):
            self.app.processEvents()
        self.select_passage(left, '1.0', '1.0')
        left.text.insertPlainText('Internal insertion\n')
        self.window.flush()
        wanted = deepcopy((self.controller.current().marker, self.controller.current().selection_shelf))
        path.unlink()
        self.restart_window()
        self.assertTrue(self.controller.buffer().has_content)
        for pane in self.window.panes:
            pane.capture_position()
        self.window.flush()
        self.assertEqual((self.controller.current().marker, self.controller.current().selection_shelf), wanted)

        self.assertEqual(self.anchor_text(wanted[0]), 'A logical passage')
        before = [self.pane_position(p) for p in self.window.panes]
        self.window.actions['return'].trigger()
        self.wait_idle()
        self.assertTrue(self.errors)
        self.assertEqual([self.pane_position(p) for p in self.window.panes], before)
        self.errors.clear()
        b = self.controller.buffer()
        self.controller.discard(b.state.id)
        self.window.render()
        for pane in self.window.panes:
            pane.text.selectAll()
            pane.capture_position()
        self.window.flush()
        self.assertEqual((self.controller.current().marker, self.controller.current().selection_shelf), wanted)

    def test_five_previewed_passages_restart_in_order_without_automatic_actions(self):
        from copy import deepcopy
        self.open_project()
        self.window.disk_timer.stop()
        correspondence = self.root / 'correspondence.md'
        correspondence.write_text('Lemma | formal declaration | proof note\n', encoding='utf-8')
        paths = [self.files['notes/differences.tex'], self.files['formal/Basic.lean'], correspondence,
                 self.files['proof.md'], self.files['proof.md']]
        spans = [('2.0', '2.17'), ('1.0', '1.16'), ('1.0', '1.26'), ('1.0', '1.17'), ('3.0', '3.31')]
        originals = {p: p.read_bytes() for p in paths}
        with ExitStack() as stack:
            for name in ('socket.socket', 'subprocess.Popen', 'os.system', 'urllib.request.urlopen',
                         'mrw.documentary_warrant.run_lean_documentary_checker',
                         'mrw.latex_build.run_latex'):
                stack.enter_context(patch(name, side_effect=AssertionError('automatic external action')))
            for path, span in zip(paths, spans):
                pane = self.open_file(path)
                self.select_passage(pane, *span)
                self.window.actions['context_add'].trigger()
                for _ in range(5):
                    self.app.processEvents()
            wanted = deepcopy(self.controller.current().selection_shelf)
            self.assertEqual(len(wanted), 5)
            self.assertEqual([s.path for s in wanted], [str(p) for p in paths])
            self.assertTrue(all(s.preview for s in wanted))
            rows = [self.window.selection_list.item(i).text() for i in range(5)]
            self.restart_window()
            self.assertEqual(self.controller.current().selection_shelf, wanted)
            self.assertEqual([self.window.selection_list.item(i).text() for i in range(5)], rows)
            with patch('mrw.workstation.text_snapshot', side_effect=AssertionError('preview source read')):
                self.window.refresh_selection_shelf()
                self.window.update_actions()
        self.assertEqual({p: p.read_bytes() for p in originals}, originals)
        self.assertFalse(self.errors)

    def test_failed_return_and_known_external_changes_never_repin_or_navigate(self):
        from copy import deepcopy
        self.open_project()
        self.window.disk_timer.stop()
        path = self.files['proof.md']
        pane = self.open_file(path)
        identifier = pane.shown
        self.select_passage(pane, '3.0', '3.7')
        self.window.actions['mark'].trigger()
        self.window.actions['context_add'].trigger()
        self.open_file(self.files['questions.txt'])
        self.window.flush()
        before, buffers = deepcopy(self.controller.current()), deepcopy(self.controller.buffers)
        positions = [self.pane_position(p) for p in self.window.panes]
        disk = self.controller.store.path.read_bytes()
        path.write_text('Externally changed saved base\n', encoding='utf-8')
        with patch.object(self.controller, 'checkpoint', side_effect=AssertionError('failed Return checkpoint')):
            self.window.actions['return'].trigger()
            self.wait_idle()
        self.assertEqual(self.controller.current(), before)
        self.assertEqual(self.controller.buffers, buffers)
        self.assertEqual([self.pane_position(p) for p in self.window.panes], positions)
        self.assertEqual(self.controller.store.path.read_bytes(), disk)
        self.assertIn('Changed or unavailable', self.window.actions['return'].toolTip())
        self.assertTrue(self.errors)
        self.errors.clear()
        self.controller.check_external(identifier)
        self.window.select(identifier, 0)
        self.select_passage(pane, '1.0', '1.0')
        pane.text.insertPlainText('Internal edit after the conflict became known\n')
        self.assertEqual(self.controller.current().marker, before.marker)
        self.assertEqual(self.controller.current().selection_shelf, before.selection_shelf)
        self.assertIn('Changed', self.window.selection_list.item(0).text())
        self.assertFalse(self.errors)

    def test_external_newline_refresh_cannot_rebind_old_live_ranges(self):
        from copy import deepcopy
        self.open_project()
        self.window.disk_timer.stop()
        path = self.root / 'newlines.md'
        path.write_bytes(b'First line\r\nRetained passage\r\n')
        pane = self.open_file(path)
        self.select_passage(pane, '2.0', '2.8')
        self.window.actions['context_add'].trigger()
        self.window.actions['mark'].trigger()
        wanted = deepcopy((self.controller.current().marker, self.controller.current().selection_shelf))
        path.write_bytes(path.read_bytes().replace(b'\r\n', b'\n'))
        self.window.actions['refresh'].trigger()
        self.select_passage(pane, '1.0', '1.0')
        pane.text.insertPlainText('Internal edit after explicit Refresh\n')
        self.assertEqual((self.controller.current().marker, self.controller.current().selection_shelf), wanted)
        self.assertIn('Changed', self.window.selection_list.item(0).text())
        self.assertFalse(self.errors)

    def test_shared_edits_track_passive_selection_and_one_controller_update(self):
        from PySide6.QtGui import QTextCursor
        path, left, right = self.shared_editors()
        original = path.read_bytes()
        selected = right.text.textCursor().selectedText()
        for pane, passive, start, end, inserted in (
                (left, right, '2.0', '2.0', 'Inserted complete line\n'),
                (left, right, '3.0', '4.0', ''),
                (right, left, '1.0', '1.4', 'Revised heading')):
            retained = passive.text.textCursor().selectedText()
            old_position = passive.text.textCursor().position()
            self.select_passage(pane, start, end)
            removed = pane.text.textCursor().selectionEnd() - pane.text.textCursor().selectionStart()
            with patch.object(self.controller, 'edit', wraps=self.controller.edit) as edit:
                pane.text.insertPlainText(inserted)
                self.assertEqual(edit.call_count, 1)
            self.app.processEvents()
            self.assertEqual(passive.text.textCursor().selectedText(), retained)
            self.assertEqual(passive.text.textCursor().position(), old_position + len(inserted) - removed)
            self.assertEqual(left.text.toPlainText(), right.text.toPlainText())
            self.assertEqual(left.text.toPlainText(), self.controller.buffer(left.shown).content)
        self.assertEqual(selected, '180: A logical passage')
        self.assertEqual(path.read_bytes(), original)
        self.assertFalse(self.errors)

    def test_wrapped_shared_document_keeps_equal_viewports_after_splitter_movement(self):
        path, left, right = self.shared_editors(wrapped=True)
        document = left.text.document()
        for method in ('sizes', 'move'):
            for sizes in ((180, 700), (700, 180)):
                with self.subTest(method=method, sizes=sizes):
                    if method == 'sizes':
                        self.window.editors.setSizes(list(sizes))
                    else:
                        self.window.editors.moveSplitter(sizes[0], 1)
                    for _ in range(8):
                        self.app.processEvents()
                    widths = [p.text.viewport().width() for p in (left, right)]
                    overflow = [p.text.horizontalScrollBar().maximum() for p in (left, right)]
                    geometry = f'viewports={widths}, horizontal overflow={overflow}, document width={document.textWidth()}'
                    self.assertEqual(overflow, [0, 0], geometry)
                    self.assertEqual(widths[0], widths[1], geometry)
                    self.assertIs(left.text.document(), document)
                    self.assertIs(right.text.document(), document)
        self.assertEqual(left.text.toPlainText(), path.read_text(encoding='utf-8'))

    def test_shared_wrap_geometry_preserves_views_document_and_recovery(self):
        from copy import deepcopy
        from PySide6.QtCore import QPoint, Qt
        from PySide6.QtTest import QSignalSpy, QTest
        path, left, right = self.shared_editors(wrapped=True)
        original = path.read_bytes()
        document = left.text.document()
        self.select_passage(left, '240.0', '240.0')
        left.text.insertPlainText('Checkpointed shared work α\n')
        self.select_passage(left, '80.0', '80.22')
        self.window.actions['mark'].trigger()
        marker = deepcopy(self.controller.current().marker)
        self.select_passage(left, '20.0', '20.22')
        self.window.actions['context_add'].trigger()
        self.select_passage(right, '180.0', '180.22')
        right.text.setFocus()
        self.window.actions['context_add'].trigger()
        for _ in range(8):
            self.app.processEvents()
        self.select_passage(left, '40.10', '40.700')
        left.text.ensureCursorVisible()
        right.text.verticalScrollBar().setValue(100)
        for _ in range(5):
            self.app.processEvents()
        active = self.controller.current().active_pane
        text, undo_steps = document.toPlainText(), document.availableUndoSteps()
        handle = self.window.editors.handle(1)
        def drag(delta):
            moved = QSignalSpy(self.window.editors.splitterMoved)
            center = handle.rect().center()
            QTest.mousePress(handle, Qt.MouseButton.LeftButton, pos=center)
            QTest.mouseMove(handle, center + QPoint(delta, 0))
            QTest.mouseRelease(handle, Qt.MouseButton.LeftButton, pos=center + QPoint(delta, 0))
            self.assertGreater(moved.count(), 0)
        for number, change in enumerate((lambda: drag(-300), lambda: drag(300),
                       lambda: self.window.resize(961, 680), lambda: self.window.resize(1281, 820),
                       lambda: self.window.resize(960, 680), lambda: self.window.resize(1280, 820),
                       lambda: self.window.actions['split'].trigger(), lambda: self.window.actions['split'].trigger())):
            anchor = right.text.cursorForPosition(QPoint(0, 0))
            offset = right.text.cursorRect(anchor).top()
            cursors = [(p.text.textCursor().position(), p.text.textCursor().anchor()) for p in (left, right)]
            views = deepcopy(self.controller.buffer(left.shown).state.pane_views)
            change()
            for pane in (left, right):
                if pane.text.reflow:
                    pane.capture_position()
                    self.assertEqual(self.controller.buffer(pane.shown).state.pane_views[pane.number], views[pane.number])
            for _ in range(8):
                self.app.processEvents()
            self.assertEqual([(p.text.textCursor().position(), p.text.textCursor().anchor()) for p in (left, right)], cursors)
            self.assertTrue(left.text.viewport().rect().contains(left.text.cursorRect().center()))
            if right.isVisible():
                self.assertEqual(left.text.viewport().width(), right.text.viewport().width())
                self.assertEqual([p.text.horizontalScrollBar().maximum() for p in (left, right)], [0, 0])
                self.assertFalse(right.text.viewport().rect().intersects(right.text.cursorRect()))
                self.assertAlmostEqual(right.text.cursorRect(anchor).top(), offset, delta=1)
            self.assertIs(left.text.document(), document)
            self.assertIs(right.text.document(), document)
            self.assertEqual(document.toPlainText(), text)
            self.assertEqual(document.availableUndoSteps(), undo_steps)
            self.assertTrue(document.isModified())
            if number < 6:  # Hiding the split deliberately selects pane zero.
                self.assertEqual(self.controller.current().active_pane, active)
        self.window.flush()
        positions = [self.pane_position(p) for p in (left, right)]
        shelf = deepcopy(self.controller.current().selection_shelf)
        self.assertEqual(len(list(self.controller.store.directory.glob('recovery/*.json'))), 1)
        self.restart_window()
        for _ in range(8):
            self.app.processEvents()
        self.assertTrue(self.controller.current().wrap)
        self.assertEqual(self.controller.current().visible, [positions[0][0]] * 2)
        self.assertEqual(len(self.window.documents), 1)
        self.assertEqual(self.controller.current().selection_shelf, shelf)
        self.assertEqual(self.controller.current().marker, marker)
        for pane, expected in zip(self.window.panes, positions):
            self.assertEqual(self.pane_position(pane), expected)
            self.assertIn('recovered unsaved work', pane.notice.text())
        self.assertEqual(path.read_bytes(), original)
        self.assertFalse(self.errors)

    def test_unequal_widths_remain_available_for_distinct_documents_and_no_wrap(self):
        path, left, right = self.shared_editors(wrapped=True)
        identifier, document = left.shown, left.text.document()
        self.open_file(self.files['proof.md'])
        for sizes in ([180, 700], [700, 180]):
            self.window.editors.setSizes(sizes)
            for _ in range(5):
                self.app.processEvents()
            actual = self.window.editors.sizes()
            self.assertGreater(abs(actual[0] - actual[1]), 300)
        self.window.select(identifier, 1)
        for _ in range(5):
            self.app.processEvents()
        self.assertEqual(left.text.viewport().width(), right.text.viewport().width())
        self.window.actions['wrap'].trigger()
        for pane in (left, right):
            self.select_passage(pane, '40.10', '40.30')
            pane.text.ensureCursorVisible()
        for _ in range(5):
            self.app.processEvents()
        # Ending the condition keeps the current split, not an earlier ratio.
        self.assertLessEqual(abs(self.window.editors.sizes()[0] - self.window.editors.sizes()[1]), 1)
        for sizes in ([180, 700], [700, 180]):
            self.window.editors.setSizes(sizes)
            for _ in range(5):
                self.app.processEvents()
            actual = self.window.editors.sizes()
            self.assertGreater(abs(actual[0] - actual[1]), 300)
            left.text.horizontalScrollBar().setValue(70)
            right.text.horizontalScrollBar().setValue(170)
            self.assertEqual([p.text.horizontalScrollBar().value() for p in (left, right)], [70, 170])
            self.assertIs(left.text.document(), document)
            self.assertIs(right.text.document(), document)
        self.window.actions['wrap'].trigger()
        for _ in range(8):
            self.app.processEvents()
        self.assertEqual(left.text.viewport().width(), right.text.viewport().width())
        self.assertEqual([p.text.horizontalScrollBar().maximum() for p in (left, right)], [0, 0])
        self.assertFalse(self.errors)

    def test_shared_undo_redo_is_available_from_either_widget(self):
        path, left, right = self.shared_editors()
        original = left.text.toPlainText()
        self.select_passage(left, '2.0', '2.0')
        left.text.insertPlainText('First complete insertion\n')
        after_first = left.text.toPlainText()
        self.select_passage(right, '4.0', '5.0')
        right.text.insertPlainText('Second replacement\n')
        after_second = right.text.toPlainText()
        for pane, operation, expected in ((left, 'undo', after_first), (right, 'undo', original),
                                           (left, 'redo', after_first), (right, 'redo', after_second)):
            pane.text.setFocus()
            getattr(pane.text, operation)()
            self.app.processEvents()
            self.assertEqual(left.text.toPlainText(), expected)
            self.assertEqual(right.text.toPlainText(), expected)
            self.assertEqual(self.controller.buffer(left.shown).content, expected)
        self.assertEqual(path.read_text(encoding='utf-8'), original)

    def test_shared_qt_document_tracks_edits_inside_selection_and_has_bounded_lifetime(self):
        from PySide6.QtGui import QTextCursor
        path, left, right = self.shared_editors()
        document = left.text.document()
        identifier = left.shown
        self.assertIs(document, right.text.document())
        self.select_passage(right, '180.5', '182.22')
        for start, end, inserted in (('181.0', '181.4', 'Inserted inside α'),
                                      ('179.0', '180.10', ''), ('180.0', '184.0', 'Replacement\n')):
            expected = QTextCursor(right.text.textCursor())
            self.select_passage(left, start, end)
            with patch.object(self.controller, 'edit', wraps=self.controller.edit) as edit, \
                 patch.object(document, 'setPlainText', side_effect=AssertionError('per-edit replacement')):
                left.text.insertPlainText(inserted)
                self.assertEqual(edit.call_count, 1)
            actual = right.text.textCursor()
            self.assertEqual((actual.position(), actual.anchor(), actual.selectedText()),
                             (expected.position(), expected.anchor(), expected.selectedText()))
            self.assertEqual(left.text.toPlainText(), right.text.toPlainText())
        self.select_passage(right, '200.0', '200.22')
        retained = right.text.textCursor().selectedText()
        position = right.text.textCursor().position()
        self.window.actions['split'].trigger()
        self.select_passage(left, '1.0', '1.0')
        left.text.insertPlainText('Hidden-pane edit\n')
        self.window.flush()
        self.window.actions['split'].trigger()
        for _ in range(5):
            self.app.processEvents()
        self.assertEqual(right.text.textCursor().selectedText(), retained)
        self.assertEqual(right.text.textCursor().position(), position + len('Hidden-pane edit\n'))
        other = self.open_file(self.files['proof.md'])
        self.assertIsNot(other.text.document(), document)
        other.text.insertPlainText('Independent edit')
        content = document.toPlainText()
        other.text.undo()
        self.assertEqual(document.toPlainText(), content)
        self.assertTrue(document.isUndoAvailable())
        self.controller.discard(identifier)
        self.controller.close_buffer(identifier)
        self.window.render()
        self.assertNotIn(identifier, self.window.documents)
        self.controller.discard(other.shown)
        self.assertTrue(self.window.close_project())
        self.assertFalse(self.window.documents)

    def test_geometry_changes_do_not_capture_transient_views_or_jump_to_offscreen_cursor(self):
        from PySide6.QtCore import QPoint
        from copy import deepcopy
        path, left, right = self.shared_editors(wrapped=True)
        self.select_passage(left, '40.10', '40.700')
        left.text.ensureCursorVisible()
        self.select_passage(right, '180.5', '180.22')
        right.text.verticalScrollBar().setValue(100)
        for _ in range(5):
            self.app.processEvents()
        for change in (lambda: self.window.navigator_dock.hide(), lambda: self.window.navigator_dock.show(),
                       lambda: self.window.selection_dock.show(), lambda: self.window.selection_dock.hide(),
                       lambda: self.window.toggle_pdf(False), lambda: self.window.pdf.show(),
                       lambda: self.window.pdf.hide(), lambda: self.window.actions['wrap'].trigger(),
                       lambda: self.window.actions['wrap'].trigger()):
            anchor = right.text.cursorForPosition(QPoint(0, 0))
            offset = right.text.cursorRect(anchor).top()
            cursors = [(p.text.textCursor().position(), p.text.textCursor().anchor()) for p in (left, right)]
            views = deepcopy(self.controller.buffer(left.shown).state.pane_views)
            change()
            # Even an explicit capture inside the layout interval is shielded.
            for pane in (left, right):
                if pane.text.reflow:
                    pane.capture_position()
                    self.assertEqual(self.controller.buffer(pane.shown).state.pane_views[pane.number], views[pane.number])
            for _ in range(6):
                self.app.processEvents()
            self.assertEqual([(p.text.textCursor().position(), p.text.textCursor().anchor()) for p in (left, right)], cursors)
            self.assertTrue(left.text.viewport().rect().contains(left.text.cursorRect().center()))
            self.assertFalse(right.text.viewport().rect().intersects(right.text.cursorRect()))
            self.assertAlmostEqual(right.text.cursorRect(anchor).top(), offset, delta=1)
        self.window.actions['wrap'].trigger()
        for _ in range(5):
            self.app.processEvents()
        for pane, scroll in ((left, 125), (right, 310)):
            pane.text.horizontalScrollBar().setValue(scroll)
        self.assertTrue(self.window.close_project())
        self.assertFalse(self.window.documents)

    def test_recovered_error_content_retains_both_views_and_diagnostics_capture_none(self):
        from copy import deepcopy
        path, left, right = self.shared_editors()
        left.text.appendPlainText('Recovered unsaved work α')
        for pane, start, end, scroll in ((left, '30.0', '35.12', 22), (right, '180.0', '185.12', 172)):
            self.select_passage(pane, start, end)
            pane.text.verticalScrollBar().setValue(scroll)
            pane.capture_position()
        recovered = left.text.toPlainText()
        positions = [self.pane_position(p)[2:] for p in (left, right)]
        for mutation in ('changed', 'missing'):
            if mutation == 'changed':
                path.write_text('Replacement disk text\n')
            else:
                path.unlink()
            self.restart_window()
            with self.subTest(base=mutation):
                b = self.controller.buffer()
                self.assertTrue(b.problem and b.recovery_warning and b.editable)
                self.assertEqual([p.text.toPlainText() for p in self.window.panes], [recovered] * 2)
                self.assertEqual([self.pane_position(p)[2:] for p in self.window.panes], positions)
                views = deepcopy(b.state.pane_views)
                self.window.flush()
                self.assertEqual(b.state.pane_views, views)
        # Remove recovery by explicit discard, then the unavailable diagnostic
        # must not acquire a new document position on focus/capture/flush.
        b = self.controller.buffer()
        self.controller.discard(b.state.id)
        b.problem = 'Missing saved base'
        self.window.render()
        views = deepcopy(b.state.pane_views)
        for pane in self.window.panes:
            pane.text.selectAll()
            pane.capture_position()
        self.window.flush()
        self.assertEqual(b.state.pane_views, views)

    def test_wrap_and_horizontal_position_restore_without_copying_widget_settings(self):
        path, left, right = self.shared_editors()
        for pane, value in ((left, 125), (right, 310)):
            pane.text.horizontalScrollBar().setValue(value)
            pane.text.verticalScrollBar().setValue(30 if pane is left else 175)
            pane.capture_position()
        expected = [self.pane_position(p)[2:] for p in (left, right)]
        rendered = [(p.text.firstVisibleBlock().blockNumber(), p.text.cursorRect().getRect()) for p in (left, right)]
        self.restart_window()
        self.assertFalse(self.window.actions['wrap'].isChecked())
        self.assertEqual([self.pane_position(p)[2:] for p in self.window.panes], expected)
        self.assertEqual([(p.text.firstVisibleBlock().blockNumber(), p.text.cursorRect().getRect())
                          for p in self.window.panes], rendered)

    def test_close_captures_geometry_settled_during_the_recovery_dialog(self):
        import json
        path, left, right = self.shared_editors()
        left.text.appendPlainText('Retained recovery')
        self.select_passage(left, '30.0', '35.20')
        self.select_passage(right, '180.0', '185.20')
        def keep_after_resize(*args, **kwargs):
            self.window.resize(960, 680)
            for _ in range(5):
                self.app.processEvents()
            return 'keep'
        manifest = self.controller.store.path
        with patch.object(self.window, 'guard_buffer', side_effect=keep_after_resize):
            self.assertTrue(self.window.close_project())
        saved = json.loads(manifest.read_bytes())
        self.assertEqual(saved['window_size'], [960, 680])
        self.assertEqual([v['selection'] for v in saved['buffers'][0]['pane_views']],
                         [['30.0', '35.20'], ['180.0', '185.20']])

    def test_restoration_does_not_capture_an_intermediate_scrollbar_range(self):
        from copy import deepcopy
        path, left, right = self.shared_editors()
        for pane, value in ((left, 30), (right, 175)):
            pane.text.verticalScrollBar().setValue(value)
            pane.capture_position()
        views = deepcopy(self.controller.buffer().state.pane_views)
        positions = [self.pane_position(p)[2:] for p in (left, right)]
        bar = right.text.verticalScrollBar()
        # Native Qt briefly reports a smaller range before laying out the
        # horizontal scrollbar. Keep real widgets, then expose the final range.
        with patch.object(bar, 'maximum', return_value=bar.maximum() - 1):
            self.window.render()
            self.assertEqual(self.controller.buffer().state.pane_views, views)
        for _ in range(5):
            self.app.processEvents()
        self.assertEqual([self.pane_position(p)[2:] for p in (left, right)], positions)
        self.assertEqual(self.controller.buffer().state.pane_views, views)

    def test_live_wrapped_reflow_keeps_visible_cursor_and_offscreen_passage(self):
        from PySide6.QtCore import QPoint
        path, left, right = self.shared_editors(wrapped=True)
        self.select_passage(left, '40.10', '40.700')
        left.text.ensureCursorVisible()
        self.select_passage(right, '180.5', '180.22')
        right.text.verticalScrollBar().setValue(100)
        self.app.processEvents()
        cursors = [(p.text.textCursor().position(), p.text.textCursor().anchor()) for p in (left, right)]
        anchor = right.text.cursorForPosition(QPoint(0, 0))
        offset = right.text.cursorRect(anchor).top()
        self.assertTrue(left.text.viewport().rect().contains(left.text.cursorRect().center()))
        self.assertFalse(right.text.viewport().rect().intersects(right.text.cursorRect()))
        for size in ((960, 680), (1280, 820)):
            self.window.resize(*size)
            for _ in range(5):
                self.app.processEvents()
            self.assertEqual([(p.text.textCursor().position(), p.text.textCursor().anchor()) for p in (left, right)], cursors)
            with self.subTest(size=size, view='visible'):
                self.assertTrue(left.text.viewport().rect().contains(left.text.cursorRect().center()),
                                (left.text.cursorRect(), left.text.viewport().rect()))
            with self.subTest(size=size, view='offscreen'):
                self.assertFalse(right.text.viewport().rect().intersects(right.text.cursorRect()))
                self.assertAlmostEqual(right.text.cursorRect(anchor).top(), offset, delta=1)

    def test_same_file_pane_views_survive_render_edit_split_and_restart(self):
        from PySide6.QtGui import QTextCursor
        from mrw.gui import qt_position
        self.open_project()
        self.window.disk_timer.stop()
        self.window.resize(1280, 820)
        self.window.actions['wrap'].trigger()
        path = self.root / 'shared-work.txt'
        original = ''.join(f'{line:03d} ' + 'x' * 200 + '\n' for line in range(1, 261))
        path.write_text(original, encoding='utf-8')
        left = self.open_file(path)
        identifier = left.shown
        self.window.actions['split'].trigger()
        self.window.select(identifier, 1)
        self.app.processEvents()
        right = self.window.panes[1]
        for pane, start, end, y, x in ((left, '30.4', '35.12', 20, 40),
                                       (right, '180.9', '185.20', 170, 140)):
            pane.text.setFocus()
            self.select_passage(pane, start, end)
            pane.text.verticalScrollBar().setValue(y)
            pane.text.horizontalScrollBar().setValue(x)
            pane.capture_position()
        expected = [self.pane_position(p)[2:] for p in (left, right)]
        def geometry():
            return [(p.text.width(), p.text.height(), p.text.verticalScrollBar().maximum(),
                     p.text.horizontalScrollBar().maximum()) for p in self.window.panes]
        expected_geometry = geometry()
        self.assertNotEqual(expected[0], expected[1])
        self.assertEqual(self.controller.current().visible, [identifier, identifier])
        self.assertEqual(len(self.controller.buffers), 1)

        def assert_views(stage):
            self.assertEqual([self.pane_position(p)[2:] for p in self.window.panes], expected,
                f'{stage}; geometry {geometry()} vs {expected_geometry}; {self.controller.buffer(identifier).state}')

        self.window.render()
        assert_views('forced render must retain both same-file views')
        for pane in (left, right, left, right):
            pane.text.setFocus()
            pane.capture_position()
            self.window.render()
            assert_views('focus and capture must address only their own pane')
        # Edit after both selected passages without moving either widget cursor.
        edit = QTextCursor(left.text.document())
        edit.setPosition(qt_position(left.text, '250.4'))
        edit.setPosition(qt_position(left.text, '250.5'), QTextCursor.MoveMode.KeepAnchor)
        edit.insertText('α')
        self.app.processEvents()
        recovered = original.replace('250 x', '250 α', 1)
        self.assertEqual(self.controller.buffer(identifier).content, recovered)
        self.assertEqual(left.text.toPlainText(), right.text.toPlainText())
        assert_views('shared-content refresh must preserve the other view')
        self.window.actions['split'].trigger()
        self.window.actions['split'].trigger()
        self.app.processEvents()
        assert_views('hiding the split must retain pane views')
        self.restart_window()
        assert_views('a fresh controller and widgets must restore independent views')
        self.assertEqual(self.controller.current().visible, [identifier, identifier])
        self.assertEqual(len(self.controller.buffers), 1)
        buffer = self.controller.buffer(identifier)
        self.assertEqual(buffer.content, recovered)
        self.assertTrue(buffer.recovery_warning)
        for pane in self.window.panes:
            self.assertEqual(pane.text.toPlainText(), recovered)
        self.assertEqual(len(list((self.controller.store.directory / 'recovery').glob('*.json'))), 1)
        self.assertEqual(path.read_text(encoding='utf-8'), original)
        self.assertFalse(self.errors)

        # Also verify actual Qt widgets in a separate process, after the parent
        # controller has closed the project (never concurrent same-project use).
        import json, subprocess, sys
        self.window.flush()
        self.controller.close_project(keep_recovery=True)
        self.window.close()
        self.app.processEvents()
        script = '''
import json, sys, time
from pathlib import Path
from PySide6.QtWidgets import QApplication
from mrw.gui import WorkstationWindow
from mrw.workstation import Workstation
expected = json.load(sys.stdin)
app = QApplication([])
c = Workstation(state_root=Path(sys.argv[2]))
w = WorkstationWindow(c)
errors = []
w.show_error = errors.append
w.show()
app.processEvents()
w.open_project(Path(sys.argv[1]))
w.disk_timer.stop()
deadline = time.monotonic() + 30
while w.jobs and time.monotonic() < deadline:
 app.processEvents()
 time.sleep(.01)
app.processEvents()
assert not w.jobs and not errors, errors
assert len(c.buffers) == 1
assert c.current().visible == [expected['identifier']] * 2
for pane, position in zip(w.panes, expected['positions']):
 cursor = pane.text.textCursor()
 actual = [cursor.position(), cursor.anchor(), pane.text.verticalScrollBar().value(), pane.text.horizontalScrollBar().value()]
 assert actual == position, (actual, position)
 assert pane.text.toPlainText() == expected['text']
assert c.buffer().content == expected['text'] and c.buffer().recovery_warning
assert len(list((c.store.directory / 'recovery').glob('*.json'))) == 1
c.close_project(keep_recovery=True)
w.close()
'''
        result = subprocess.run([sys.executable, '-c', script, str(self.root), str(self.home / 'state')],
            input=json.dumps(dict(identifier=identifier, positions=expected, text=recovered)),
            text=True, capture_output=True, timeout=40)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_shared_lazy_load_is_deduplicated_and_placeholder_captures_no_views(self):
        import threading
        from copy import deepcopy
        from mrw.gui import WorkstationWindow
        from mrw.workstation import Workstation
        self.open_project()
        self.window.disk_timer.stop()
        self.window.actions['wrap'].trigger()
        path = self.root / 'lazy-shared.txt'
        original = ''.join(f'{n:03d} exact work α\n' for n in range(1, 241))
        path.write_text(original, encoding='utf-8')
        left = self.open_file(path)
        identifier = left.shown
        self.window.actions['split'].trigger()
        self.window.select(identifier, 1)
        self.app.processEvents()
        self.controller.edit(identifier, original + 'Checkpointed unsaved work\n')
        self.window.render()
        for pane, start, end, scroll in ((left, '30.0', '35.7', 20),
                                        (self.window.panes[1], '180.0', '185.7', 170)):
            self.select_passage(pane, start, end)
            pane.text.verticalScrollBar().setValue(scroll)
            pane.capture_position()
        self.window.flush()
        self.controller.mark(identifier, '30.0', '35.7')
        self.controller.add_context_selection(identifier, '180.0', '185.7', pane=1)
        self.window.update_actions()
        self.window.selection_dock.show()
        for _ in range(5):
            self.app.processEvents()
        self.window.flush()
        anchors = deepcopy((self.controller.current().marker, self.controller.current().selection_shelf))
        expected = deepcopy(self.controller.buffer(identifier).state.pane_views)
        self.assertEqual([view.cursor for view in expected], ['35.7', '185.7'])
        widgets = [self.pane_position(p) for p in self.window.panes]
        self.controller.close_project(keep_recovery=True)
        self.window.close()
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
        load = self.controller.load_snapshot
        def delayed(buffer_id):
            snapshot = load(buffer_id)
            ready.set()
            if not release.wait(30):
                raise TimeoutError('shared load was not released')
            return snapshot
        with patch.object(self.controller, 'load_snapshot', side_effect=delayed) as read:
            try:
                self.window.open_project(self.root)
                self.assertTrue(ready.wait(5))
                for pane in self.window.panes:
                    self.assertEqual(pane.text.toPlainText(), 'Loading this document…')
                    self.assertFalse(pane.loading)
                    pane.capture_position()
                self.window.flush()
                self.assertEqual(self.controller.buffer(identifier).state.pane_views, expected)
                self.assertEqual((self.controller.current().marker, self.controller.current().selection_shelf), anchors)
                self.assertEqual(read.call_count, 1)
                self.assertEqual(self.window.loading_buffers, {identifier})
            finally:
                release.set()
                self.wait_idle()
            self.assertEqual(read.call_count, 1)
        self.assertEqual([self.pane_position(p) for p in self.window.panes], widgets)
        self.assertEqual(len(self.controller.buffers), 1)
        self.assertEqual((self.controller.current().marker, self.controller.current().selection_shelf), anchors)
        self.assertTrue(self.controller.buffer(identifier).recovery_warning)
        self.assertEqual(path.read_text(encoding='utf-8'), original)
        self.assertFalse(self.errors)

    def test_duplicate_context_add_reports_recovery_failure_without_adding_a_row(self):
        self.open_project()
        pane = self.open_file(self.files['proof.md'])
        identifier = pane.shown
        pane.text.appendPlainText('Unsaved A')
        text = pane.text.toPlainText()
        self.select_passage(pane, '1.0', '1.5')
        self.window.actions['context_add'].trigger()
        self.controller.discard(identifier)
        self.window.render()
        pane.text.appendPlainText('Unsaved A')
        self.assertEqual(pane.text.toPlainText(), text)
        self.select_passage(pane, '1.0', '1.5')
        with patch.object(self.controller.store, 'write_recovery', side_effect=OSError('duplicate checkpoint denied')):
            self.window.actions['context_add'].trigger()
        self.assertTrue(any('duplicate checkpoint denied' in error for error in self.errors))
        self.assertEqual(self.window.selection_list.count(), 1)
        self.assertFalse(self.controller.store.recovery_path(identifier).exists())
        self.errors.clear()
        self.restart_window(discard_session=True)
        pane = self.window.active_pane()
        pane.text.appendPlainText('Unsaved A')
        self.select_passage(pane, '1.0', '1.5')
        self.window.actions['context_add'].trigger()
        self.assertEqual(self.window.selection_list.count(), 1)
        self.assertEqual(self.controller.store.read_recovery(self.controller.buffer(identifier).state)['text'], text)
        self.assertFalse(self.errors)

    def test_shared_response_review_refreshes_both_widgets_at_reset_views(self):
        self.open_project()
        path = self.root / 'response.json'
        path.write_bytes(encode(model_call_document(response='First α\n\nSecond β\n')))
        left = self.open_file(path)
        self.window.actions['split'].trigger()
        self.window.select(left.shown, 1)
        right = self.window.panes[1]
        self.select_passage(left, '1.0', '1.3')
        self.select_passage(right, '2.0', '2.3')
        left.passage.setValue(2)
        left.review('passage')
        self.assertEqual(left.text.toPlainText(), right.text.toPlainText())
        for pane in (left, right):
            self.assertEqual(pane.text.textCursor().position(), 0)
            self.assertFalse(pane.text.textCursor().hasSelection())
        self.assertFalse(self.errors)

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
            for name in ('socket.socket', 'subprocess.Popen', 'urllib.request.urlopen', 'mrw.documentary_warrant.run_lean_documentary_checker'):
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
            from mrw.gui import qt_position
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
        with patch('mrw.gui.Workstation.external_snapshot', side_effect=lambda *_: (ready.wait(2), None)[1]):
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
        from mrw.gui import WorkstationWindow, cursor_index
        from mrw.workstation import Workstation

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
                state = self.controller.buffer(identifier).state.pane_views[pane.number]
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
        self.assertEqual(buffer.state.pane_views[pane.number].cursor, expected['cursor'])
        self.assertEqual(buffer.state.pane_views[pane.number].selection, expected['selection'])
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
        self.restart_window(discard_session=True)
        self.assertIn('Unsaved exact work α', self.window.active_pane().text.toPlainText())

    def test_find_line_new_file_save_as_refresh_and_configured_editor_menu(self):
        self.open_project()
        pane = self.open_file(self.files['calculations/check.py'])
        with patch('mrw.gui.QInputDialog.getText', return_value=('return', True)):
            self.window.actions['find'].trigger()
        self.assertEqual(pane.text.textCursor().selectedText(), 'return')
        with patch('mrw.gui.QInputDialog.getInt', return_value=(1, True)):
            self.window.actions['line'].trigger()
        self.assertEqual(pane.text.textCursor().blockNumber(), 0)
        self.window.actions['new'].trigger()
        pane = self.window.active_pane()
        pane.text.insertPlainText('Working calculation\n')
        destination = self.root / 'working.txt'
        with patch('mrw.gui.QFileDialog.getSaveFileName', return_value=(str(destination), '')):
            self.window.actions['save_as'].trigger()
        self.assertEqual(destination.read_text(), 'Working calculation\n')
        destination.write_text('External calculation\n')
        self.window.actions['refresh'].trigger()
        self.assertEqual(pane.text.toPlainText(), 'External calculation\n')
        with patch('mrw.gui.QInputDialog.getText', return_value=('editor --line {line} {file}', True)):
            self.window.actions['editor_config'].trigger()
        with patch('mrw.tool_settings.resolve_executable', return_value='/tools/editor'), patch('mrw.tool_settings.subprocess.Popen') as launch:
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
            self.assertGreater(self.controller.buffer().state.pane_views[self.controller.current().active_pane].yscroll, 0)
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
        with patch('mrw.gui.QFileDialog.getSaveFileName', return_value=('', '')):
            pane.retain.click()
        self.assertEqual(before, {p: p.read_bytes() for p in self.root.rglob('*') if p.is_file()})
        pane.passage.setValue(1)
        destination = self.root / 'selected.json'
        with patch('mrw.gui.QFileDialog.getSaveFileName', return_value=(str(destination), '')):
            pane.retain.click()
        from mrw.documentary_warrant import parse_documentary_projection
        self.assertEqual(parse_documentary_projection(destination.read_bytes()).representation.content, 'Second β\n')
        verification, bundle = verification_fixture()
        vp, bp = self.root / 'verification.json', self.root / 'bundle.json'
        vp.write_bytes(verification)
        bp.write_bytes(bundle)
        with patch('mrw.gui.QFileDialog.getOpenFileName', side_effect=[(str(vp), ''), (str(bp), '')]):
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
        from mrw.gui import EditorPane
        tex = self.files['notes/differences.tex']
        tex.write_bytes('% α😀 base\r\nProof line β\r\n'.encode('utf-8'))
        external = self.home / 'external-reference.txt'
        external.write_text('External α reference\n', encoding='utf-8')
        original = {p: p.read_bytes() for p in [*self.files.values(), external]}
        with ExitStack() as stack:
            for name in ('socket.socket', 'subprocess.Popen', 'os.system', 'urllib.request.urlopen',
                         'mrw.documentary_warrant.run_lean_documentary_checker',
                         'mrw.latex_build.run_latex',
                         'mrw.gui.QInputDialog.getText', 'mrw.gui.QInputDialog.getInt'):
                stack.enter_context(patch(name, side_effect=AssertionError('unexpected tool, network or form')))
            self.open_project()
            self.window.disk_timer.stop()
            self.assertFalse(self.window.selection_dock.isVisible())
            paths = [tex, tex, self.files['formal/Basic.lean'], external, self.files['proof.md']]
            spans = [('1.2', '2.5'), ('1.2', '1.4'), ('1.0', '1.7'), ('1.0', '1.8'), ('1.0', '1.5')]
            locations = ['1:3–2:6', '1:3–1:5', '1:1–1:8', '1:1–1:9', '1:1–1:6']
            previews = ['α😀 base Proof', 'α😀', 'theorem', 'External', '# A p']
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
                self.assertEqual(self.window.selection_list.item(index).text(), f'{label} · {locations[index]} · {previews[index]}')
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
        with patch('mrw.workstation.text_snapshot', side_effect=AssertionError('shelf read source content')):
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

    def test_imported_pdf_note_keyboard_focus_marker_and_restart(self):
        from PySide6.QtCore import Qt
        from PySide6.QtGui import QKeySequence, QTextCursor
        from PySide6.QtTest import QTest
        from mrw.gui import qt_position

        self.open_project()
        pdf = self.root / 'reading.pdf'
        pdf_raw = minimal_pdf()
        pdf.write_bytes(pdf_raw)
        pane = self.open_file(self.files['proof.md'])
        pane.text.moveCursor(QTextCursor.MoveOperation.End)
        pane.text.insertPlainText('\nterm one\nterm two\nA durable reading note. α\n')
        note_id = pane.shown
        self.assertFalse(self.window.actions['return'].isEnabled())
        self.assertIn('Return unavailable', self.window.navigation_status.text())

        for key, standard in (('open', QKeySequence.StandardKey.Open),
                              ('save', QKeySequence.StandardKey.Save),
                              ('find', QKeySequence.StandardKey.Find),
                              ('find_next', QKeySequence.StandardKey.FindNext)):
            self.assertIn(self.window.actions[key].shortcut(), QKeySequence.keyBindings(standard))
        with patch('mrw.gui.QFileDialog.getOpenFileName', return_value=(str(pdf), '')), \
             patch.object(self.controller, 'build_latex', side_effect=AssertionError('ordinary PDF open built TeX')), \
             patch('mrw.workstation.launch_tool', side_effect=AssertionError('ordinary PDF open launched a tool')):
            pane.text.setFocus()
            QTest.keySequence(pane.text, self.window.actions['open'].shortcut())
            self.wait_idle()

        self.assertEqual(self.controller.current().active, note_id)
        self.assertEqual(self.window.pdf.kind, 'imported')
        self.assertEqual(self.window.pdf.document.pageCount(), 2)
        self.assertTrue(self.window.pdf.isVisible())
        self.assertEqual(pdf.read_bytes(), pdf_raw)
        self.assertIsNone(self.controller.current().successful_build)
        self.assertFalse(any(buffer.state.path == str(pdf) for buffer in self.controller.buffers.values()))
        self.assertTrue(self.window.pdf_has_focus())
        self.assertFalse(self.window.actions['find'].isEnabled())
        self.assertIn('Find unavailable', self.window.focus_status.text())
        self.assertIn('proof.md', self.window.actions['save'].toolTip())

        QTest.keySequence(self.window.pdf.view, self.window.actions['save'].shortcut())
        self.app.processEvents()
        self.assertIn('A durable reading note. α', self.files['proof.md'].read_text())
        self.assertEqual(pdf.read_bytes(), pdf_raw)

        pane.text.setFocus()
        self.app.processEvents()
        self.assertTrue(self.window.actions['find'].isEnabled())
        cursor = pane.text.textCursor()
        cursor.movePosition(QTextCursor.MoveOperation.Start)
        pane.text.setTextCursor(cursor)
        with patch('mrw.gui.QInputDialog.getText', return_value=('term', True)):
            QTest.keySequence(pane.text, self.window.actions['find'].shortcut())
        first = pane.text.textCursor().selectionStart()
        self.assertEqual(pane.text.textCursor().selectedText(), 'term')
        QTest.keySequence(pane.text, self.window.actions['find_next'].shortcut())
        self.assertEqual(pane.text.textCursor().selectedText(), 'term')
        self.assertGreater(pane.text.textCursor().selectionStart(), first)

        cursor = pane.text.textCursor()
        cursor.setPosition(qt_position(pane.text, '3.0'))
        cursor.setPosition(qt_position(pane.text, '3.7'), QTextCursor.MoveMode.KeepAnchor)
        pane.text.setTextCursor(cursor)
        self.window.actions['mark'].trigger()
        self.assertIn('Unfinished: proof.md · 3:1', self.window.navigation_status.text())
        self.assertIn('proof.md', self.window.actions['return'].toolTip())

        self.window.pdf.goto(2)
        self.window.pdf.zoom.setCurrentIndex(self.window.pdf.zoom.findData('custom'))
        self.window.pdf.view.setZoomFactor(1.4)
        self.window.pdf.capture()
        self.window.flush()
        self.restart_window()
        self.assertEqual(self.window.pdf.kind, 'imported')
        self.assertEqual(self.window.pdf.page.value(), 2)
        self.assertEqual(self.window.pdf.zoom.currentData(), 'custom')
        self.assertAlmostEqual(self.window.pdf.view.zoomFactor(), 1.4, places=2)
        self.assertIn('Imported local PDF', self.window.pdf.notice.text())
        self.assertIn('Unfinished: proof.md · 3:1', self.window.navigation_status.text())
        self.open_file(self.files['questions.txt'])
        self.window.actions['return'].trigger()
        self.wait_idle()
        self.assertEqual(self.controller.buffer().state.path, str(self.files['proof.md']))
        self.assertEqual(self.window.active_pane().text.textCursor().selectedText(), 'Expand ')
        for width, height in ((1280, 820), (960, 680)):
            self.window.resize(width, height)
            self.app.processEvents()
            self.assertGreater(self.window.active_pane().text.width(), 200)
            self.assertGreater(self.window.pdf.view.width(), 200)
        self.assertFalse(self.errors)

    def test_pdf_cancel_invalid_change_and_imported_generated_switching_preserve_work(self):
        from PySide6.QtTest import QTest

        self.open_project()
        valid = self.root / 'valid.pdf'
        invalid = self.root / 'invalid.pdf'
        valid_raw = minimal_pdf()
        valid.write_bytes(valid_raw)
        invalid.write_bytes(b'%PDF-1.4\nnot a valid PDF\n')
        pane = self.open_file(self.files['questions.txt'])
        pane.text.insertPlainText('Durable note before a failed PDF load. ')
        self.window.save(pane.shown)
        with patch('mrw.gui.QFileDialog.getOpenFileName', return_value=(str(valid), '')):
            QTest.keySequence(pane.text, self.window.actions['open'].shortcut())
            self.wait_idle()
        old_document = self.window.pdf.document
        old_identity = deepcopy(self.controller.current().imported_pdf)
        note_text = self.controller.buffer(pane.shown).content

        with patch('mrw.gui.QFileDialog.getOpenFileName', return_value=('', '')):
            QTest.keySequence(self.window.pdf.view, self.window.actions['open'].shortcut())
        self.app.processEvents()
        self.assertIs(self.window.pdf.document, old_document)
        self.assertEqual(self.controller.current().imported_pdf, old_identity)

        with patch('mrw.gui.QFileDialog.getOpenFileName', return_value=(str(invalid), '')):
            QTest.keySequence(self.window.pdf.view, self.window.actions['open'].shortcut())
            self.wait_idle()
        self.assertIs(self.window.pdf.document, old_document)
        self.assertEqual(self.window.pdf.kind, 'imported')
        self.assertEqual(self.controller.current().imported_pdf, old_identity)
        self.assertEqual(self.controller.buffer(pane.shown).content, note_text)
        self.assertTrue(self.window.pdf.problem.isVisible())
        self.assertTrue(self.errors)
        self.errors.clear()

        self.window.pdf.goto(2)
        imported_page = self.controller.current().imported_pdf.page
        report = {'id': '11111111-1111-1111-1111-111111111111', 'project': str(self.root),
                  'success': True, 'tex_root': str(self.root / 'main.tex'),
                  'dependency_coverage': 'test fixture'}
        self.controller.accept_build(report)
        with patch.object(self.controller, 'pdf_snapshot', return_value=(report, b'%PDF-1.4\ninvalid generated output', [])):
            self.window.reload_pdf(source='generated')
            self.wait_idle()
        self.assertEqual(self.controller.current().pdf_source, 'imported')
        self.assertIs(self.window.pdf.document, old_document)
        self.errors.clear()
        with patch.object(self.controller, 'pdf_snapshot', return_value=(report, minimal_pdf(1), [])):
            self.window.reload_pdf(source='generated')
            self.wait_idle()
        self.assertEqual((self.controller.current().pdf_source, self.window.pdf.kind), ('generated', 'generated'))
        self.assertEqual(self.window.pdf.report['id'], report['id'])
        self.window.open_pdf(valid)
        self.wait_idle()
        self.assertEqual((self.controller.current().pdf_source, self.window.pdf.kind), ('imported', 'imported'))
        self.assertEqual(self.window.pdf.page.value(), imported_page + 1)

        self.window.flush()
        self.assertTrue(self.window.close_project())
        valid.write_bytes(valid_raw + b'\n% changed bytes\n')
        self.window.open_project(self.root)
        self.wait_idle()
        self.assertEqual(self.controller.current().imported_pdf, old_identity.__class__(
            old_identity.path, old_identity.revision, imported_page, old_identity.zoom, old_identity.scale))
        self.assertIsNone(self.window.pdf.kind)
        self.assertTrue(self.window.pdf.problem.isVisible())
        self.assertIn('changed', self.window.pdf.problem.text())
        restored = self.controller.view()
        self.assertEqual(restored.content, note_text)
        self.assertFalse(restored.dirty)
        self.assertTrue(self.errors)

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
