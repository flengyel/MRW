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

    def restart_window(self, *, discard_session=False):
        from theorem_terminal.gui import WorkstationWindow
        from theorem_terminal.workstation import Workstation
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
        from theorem_terminal.gui import qt_position
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
from theorem_terminal.gui import WorkstationWindow
from theorem_terminal.workstation import Workstation
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
        from theorem_terminal.gui import WorkstationWindow
        from theorem_terminal.workstation import Workstation
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
                self.assertEqual(read.call_count, 1)
                self.assertEqual(self.window.loading_buffers, {identifier})
            finally:
                release.set()
                self.wait_idle()
            self.assertEqual(read.call_count, 1)
        self.assertEqual([self.pane_position(p) for p in self.window.panes], widgets)
        self.assertEqual(len(self.controller.buffers), 1)
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
