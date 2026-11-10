"""Actual Qt coverage for the bounded R3 linked continuation; no network is used."""

from __future__ import annotations

import json
import os
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

from test_workstation import mathematical_project
from mrw.documentary_warrant import parse_documentary_projection
from mrw.openai_response import TransportResult


def completed_response(identifier, text):
    return json.dumps({
        "id": identifier,
        "object": "response",
        "status": "completed",
        "model": "local-r3-gui-resolved",
        "output": [{
            "type": "message",
            "role": "assistant",
            "status": "completed",
            "content": [{"type": "output_text", "text": text, "annotations": []}],
        }],
    }, ensure_ascii=False).encode("utf-8")


@unittest.skipUnless(
    os.environ.get("MRW_GUI_TESTS") == "1",
    "set MRW_GUI_TESTS=1 to exercise actual Qt widgets",
)
class InvestigationWidgetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from PySide6.QtWidgets import QApplication
        cls.app = QApplication.instance() or QApplication([])

    def setUp(self):
        from mrw.gui import WorkstationWindow
        from mrw.workstation import Workstation

        self.temporary = tempfile.TemporaryDirectory(prefix="mrw-r3-gui-")
        self.home = Path(self.temporary.name)
        self.root = self.home / "project"
        self.root.mkdir()
        self.files = mathematical_project(self.root)
        self.responses = []
        self.transport_calls = []
        self.started = threading.Event()
        self.release = None
        self.tick = 0

        def transport(method, endpoint, body, headers, timeout, limit):
            self.transport_calls.append((method, endpoint, body, timeout, limit))
            self.started.set()
            if self.release is not None:
                self.release.wait(10)
            result = self.responses.pop(0)
            if isinstance(result, Exception):
                raise result
            return TransportResult(200, result)

        def clock():
            self.tick += 1
            return f"2026-09-18T14:00:{self.tick:02d}Z"

        self.controller = Workstation(
            state_root=self.home / "state",
            assistance_transport=transport,
            assistance_clock=clock,
            assistance_id_generator=lambda: f"model-call-r3-gui-{self.tick + 1}",
        )
        self.window = WorkstationWindow(self.controller)
        self.errors = []
        self.error_patch = patch.object(
            self.window, "show_error", side_effect=self.errors.append
        )
        self.error_patch.start()
        self.window.show()
        self.app.processEvents()

    def tearDown(self):
        if self.release is not None:
            self.release.set()
        self.wait_idle()
        for timer in (
            self.window.disk_timer,
            self.window.process_timer,
            self.window.checkpoint_timer,
        ):
            timer.stop()
        if self.controller.workspace:
            self.controller.close_project(keep_recovery=True)
        self.window.close()
        self.app.processEvents()
        self.error_patch.stop()
        self.temporary.cleanup()

    def wait_until(self, predicate, timeout=12):
        deadline = time.monotonic() + timeout
        while not predicate() and time.monotonic() < deadline:
            self.app.processEvents()
            time.sleep(.01)
        self.app.processEvents()
        self.assertTrue(predicate(), "Qt condition did not become true")

    def wait_idle(self, timeout=15):
        self.wait_until(lambda: not self.window.jobs, timeout=timeout)

    def open_project(self):
        self.window.open_project(self.root)
        self.wait_idle()
        self.window.disk_timer.stop()

    def open_file(self, path):
        self.window.open_file(path)
        self.wait_idle()
        return self.window.active_pane()

    def select(self, pane, start, end):
        from PySide6.QtGui import QTextCursor
        from mrw.gui import qt_position

        cursor = pane.text.textCursor()
        cursor.setPosition(qt_position(pane.text, start))
        cursor.setPosition(qt_position(pane.text, end), QTextCursor.MoveMode.KeepAnchor)
        pane.text.setTextCursor(cursor)
        pane.text.setFocus()
        self.app.processEvents()

    def create_parent(self):
        pane = self.open_file(self.files["proof.md"])
        self.select(pane, "3.0", "3.7")
        pane.capture_position()
        context = self.controller.capture_assistance_context(
            pane.shown, "3.0", "3.7", pane=0
        )
        prepared = self.controller.prepare_assistance(
            target=context,
            contexts=(context,),
            question="Which route is useful?",
            model="local-r3-gui",
            output=self.controller.store.directory / "parent-gui.json",
            exchange_id="parent-gui",
        )
        self.responses.append(completed_response(
            "resp-parent-gui",
            "Unselected prior route SECRET.\n\n"
            "Selected α😀 route uses a boundary reduction.\n",
        ))
        self.controller.begin_assistance(prepared, "local-key")
        outcome = self.controller.accept_assistance(
            prepared, self.controller.transmit_assistance(prepared, "local-key")
        )
        self.started.clear()
        return outcome

    def load_parent(self, outcome):
        self.window.load_continuation_parent(outcome.path)
        self.wait_idle()
        panel = self.window.assistance
        panel.parent_passage.setValue(2)
        panel.add_parent_passage_button.click()
        self.app.processEvents()
        return panel

    def fill_draft(self, panel):
        panel.question.setPlainText("Does this survive the corrected hypothesis?")
        panel.correction.setPlainText("Human correction: assume sequential compactness only.")
        panel.last_conclusion.setPlainText("Boundary reduction is the useful part.")
        panel.unresolved_issue.setPlainText("Uniformity of the last estimate is unresolved.")
        panel.model.setText("local-r3-gui")

    def create_retained_investigation(self):
        parent_outcome = self.create_parent()
        panel = self.load_parent(parent_outcome)
        self.fill_draft(panel)
        panel.preview_button.click()
        self.responses.append(completed_response(
            "resp-child-end-gui",
            "Completed child text stays only in its immutable record.\n",
        ))
        with patch.dict(os.environ, {"OPENAI_API_KEY": "local-only"}, clear=False):
            panel.send_button.click()
        self.wait_idle()
        self.assertIsNotNone(self.controller.current().investigation)
        return panel, parent_outcome

    def test_context_removal_preview_missing_key_and_cancel_create_no_child(self):
        from PySide6.QtTest import QTest

        self.open_project()
        parent_outcome = self.create_parent()
        panel = self.load_parent(parent_outcome)
        self.fill_draft(panel)

        note = self.open_file(self.files["questions.txt"])
        self.select(note, "1.0", "1.15")
        QTest.keySequence(note.text, self.window.actions["ask"].shortcut())
        self.app.processEvents()
        self.assertEqual(len(panel.contexts), 1)
        panel.remove_context_button.click()
        panel.preview_button.click()
        self.assertIn("No current source or work-text selection", panel.preview_text.toPlainText())
        self.assertIn("Human correction: assume sequential compactness only.",
                      panel.preview_text.toPlainText())
        self.assertNotIn("SECRET", panel.prepared.operation.body.decode("utf-8"))
        self.assertNotIn("previous_response_id", panel.prepared.operation.body.decode("utf-8"))
        child_path = panel.prepared.operation.output
        with patch.dict(os.environ, {}, clear=True):
            panel.send_button.click()
        self.assertRegex(self.errors[-1], "OPENAI_API_KEY")
        self.assertEqual(len(self.transport_calls), 1)
        self.assertFalse(child_path.exists())
        panel.dismiss_button.click()
        self.assertFalse(child_path.exists())
        self.assertIsNone(self.controller.current().investigation)

    def test_linked_child_concurrent_note_edit_projection_insertion_and_restart(self):
        from PySide6.QtGui import QDesktopServices, QTextCursor

        self.open_project()
        parent_outcome = self.create_parent()
        panel = self.load_parent(parent_outcome)
        self.fill_draft(panel)
        panel.preview_button.click()
        child_body = panel.prepared.operation.body.decode("utf-8")
        self.assertIn(parent_outcome.terminal.id, child_body)
        self.assertIn("Selected α😀 route", child_body)
        self.assertNotIn("SECRET", child_body)

        response = (
            "Child answer with <b>inert</b> markup and "
            "https://example.invalid/citation.\n```python\nprint('inert')\n```\n\n"
            "Second corrected ε passage.\n"
        )
        self.responses.append(completed_response("resp-child-gui", response))
        self.release = threading.Event()
        with patch.dict(os.environ, {"OPENAI_API_KEY": "local-only"}, clear=False):
            panel.send_button.click()
        self.wait_until(self.started.is_set)
        panel.send_button.click()
        self.assertEqual(len(self.transport_calls), 2)

        note = self.open_file(self.files["questions.txt"])
        note_id = note.shown
        note.text.moveCursor(QTextCursor.MoveOperation.End)
        note.text.insertPlainText("Concurrent human correction while child runs.\n")
        concurrent = note.text.toPlainText()
        self.window.assistance_dock.hide()
        self.release.set()
        with patch.object(
            QDesktopServices, "openUrl",
            side_effect=AssertionError("returned URL dispatched"),
        ):
            self.wait_idle()
        panel = self.window.assistance
        self.assertEqual(panel.outcome.terminal.status, "completed")
        self.assertEqual(
            panel.outcome.terminal.document["in_reply_to"],
            parent_outcome.terminal.id,
        )
        self.assertIn("Selected α😀 route", panel.parent_passage_text.toPlainText())
        self.assertIn("Human correction: assume sequential compactness only.",
                      panel.correction.toPlainText())
        self.assertEqual(panel.answer.toPlainText(), response)
        self.assertEqual(self.controller.buffer(note_id).content.replace("\r\n", "\n"),
                         concurrent)
        self.assertIsNotNone(self.controller.current().investigation)

        self.window.assistance_dock.show()
        panel.passage.setValue(2)
        panel.show_passage_button.click()
        retained = self.root / "child-passage.json"
        with patch(
            "mrw.gui.QFileDialog.getSaveFileName",
            return_value=(str(retained), ""),
        ):
            panel.retain_button.click()
        projection = parse_documentary_projection(retained.read_bytes())
        self.assertEqual(projection.representation.content,
                         "Second corrected ε passage.\n")

        self.window.select(note_id, 0)
        note = self.window.active_pane()
        note.text.moveCursor(QTextCursor.MoveOperation.End)
        panel.insert_button.click()
        panel.insert_handoff_button.click()
        panel.unresolved_issue.setPlainText("A sharper uniform bound remains open.")
        panel.save_summary_button.click()
        self.assertIn("Model contribution — unverified editable copy",
                      self.controller.buffer(note_id).content)
        self.assertIn("Investigation handoff — editable human task summary",
                      self.controller.buffer(note_id).content)
        self.window.save(note_id)
        self.window.flush()
        self.assertTrue(self.window.close_project())

        self.window.open_project(self.root)
        self.wait_idle()
        restored = self.window.assistance
        self.assertTrue(self.window.assistance_dock.isVisible())
        self.assertEqual(restored.outcome.terminal.document["in_reply_to"],
                         parent_outcome.terminal.id)
        self.assertIn("Selected α😀 route", restored.parent_passage_text.toPlainText())
        self.assertEqual(restored.correction.toPlainText(),
                         "Human correction: assume sequential compactness only.")
        self.assertEqual(restored.unresolved_issue.toPlainText(),
                         "A sharper uniform bound remains open.")
        self.assertEqual(restored.answer.toPlainText(), response)
        self.assertEqual(len(self.transport_calls), 2)

        parent_path = Path(self.controller.current().investigation.parent_path)
        parent_bytes = parent_path.read_bytes()
        self.assertTrue(self.window.close_project())
        parent_path.write_bytes(parent_bytes + b" ")
        self.window.open_project(self.root)
        self.wait_idle()
        degraded = self.window.assistance
        self.assertIn("Parent record missing or changed", degraded.status.text())
        self.assertEqual(degraded.correction.toPlainText(),
                         "Human correction: assume sequential compactness only.")
        self.assertTrue(degraded.correction.isEnabled())
        self.assertTrue(degraded.save_summary_button.isEnabled())
        self.assertEqual(degraded.answer.toPlainText(), response)
        self.assertEqual(len(self.transport_calls), 2)
        self.assertFalse(self.errors)

    def test_end_cancel_then_without_insertion_leaves_note_bytes_unchanged(self):
        self.open_project()
        panel, _parent_outcome = self.create_retained_investigation()
        pane = self.open_file(self.files["questions.txt"])
        note_id = pane.shown
        memory_before = self.controller.buffer(note_id).content
        disk_before = self.files["questions.txt"].read_bytes()
        panel.question.setPlainText("Unsaved question retained by Cancel?")
        panel.correction.setPlainText("Unsaved correction retained by Cancel.")
        panel.last_conclusion.setPlainText("Unsaved conclusion retained by Cancel.")
        panel.unresolved_issue.setPlainText("Unsaved issue retained by Cancel.")

        with patch.object(
            self.window, "choose_end_investigation", return_value=None
        ):
            panel.end_investigation_button.click()
        self.assertIsNotNone(self.controller.current().investigation)
        self.assertEqual(self.controller.buffer(note_id).content, memory_before)
        self.assertEqual(self.files["questions.txt"].read_bytes(), disk_before)
        self.assertEqual(panel.question.toPlainText(),
                         "Unsaved question retained by Cancel?")
        self.assertEqual(panel.correction.toPlainText(),
                         "Unsaved correction retained by Cancel.")
        self.assertEqual(panel.last_conclusion.toPlainText(),
                         "Unsaved conclusion retained by Cancel.")
        self.assertEqual(panel.unresolved_issue.toPlainText(),
                         "Unsaved issue retained by Cancel.")

        with patch.object(
            self.window, "choose_end_investigation", return_value="without"
        ):
            self.window.actions["end_investigation"].trigger()
        self.assertIsNone(self.controller.current().investigation)
        self.assertEqual(self.controller.buffer(note_id).content, memory_before)
        self.assertEqual(self.files["questions.txt"].read_bytes(), disk_before)
        self.assertIn("Investigation ended", panel.status.text())
        self.assertEqual(panel.question.toPlainText(), "")
        self.assertEqual(panel.correction.toPlainText(), "")
        self.assertFalse(self.window.actions["end_investigation"].isEnabled())
        self.assertFalse(self.errors)

    def test_standalone_handoff_uses_latest_visible_unsaved_summary(self):
        from PySide6.QtGui import QTextCursor

        self.open_project()
        panel, _parent_outcome = self.create_retained_investigation()
        pane = self.open_file(self.files["questions.txt"])
        note_id = pane.shown
        before = self.controller.buffer(note_id).content
        stored = self.controller.current().investigation
        pane.text.moveCursor(QTextCursor.MoveOperation.End)
        panel.question.setPlainText("Standalone newest question?")
        panel.correction.setPlainText("Standalone newest correction.")
        panel.last_conclusion.setPlainText("Standalone newest conclusion.")
        panel.unresolved_issue.setPlainText("Standalone newest issue.")

        panel.insert_handoff_button.click()

        changed = self.controller.buffer(note_id).content
        self.assertIn("Standalone newest question?", changed)
        self.assertIn("Standalone newest correction.", changed)
        self.assertIn("Standalone newest conclusion.", changed)
        self.assertIn("Standalone newest issue.", changed)
        self.assertNotEqual(changed, before)
        self.assertIsNotNone(self.controller.current().investigation)
        self.assertEqual(self.controller.current().investigation.question,
                         stored.question)
        self.assertFalse(self.errors)

    def test_handoff_validation_failure_preserves_widgets_note_and_pointer(self):
        self.open_project()
        panel, _parent_outcome = self.create_retained_investigation()
        pane = self.open_file(self.files["questions.txt"])
        note_id = pane.shown
        note_before = self.controller.buffer(note_id).content
        disk_before = self.files["questions.txt"].read_bytes()
        panel.question.setPlainText("   ")
        panel.correction.setPlainText("Keep this correction after validation fails.")

        with patch.object(
            self.window, "choose_end_investigation", return_value="insert"
        ):
            panel.end_investigation_button.click()

        self.assertIsNotNone(self.controller.current().investigation)
        self.assertEqual(self.controller.buffer(note_id).content, note_before)
        self.assertEqual(self.files["questions.txt"].read_bytes(), disk_before)
        self.assertEqual(panel.question.toPlainText(), "   ")
        self.assertEqual(panel.correction.toPlainText(),
                         "Keep this correction after validation fails.")
        self.assertRegex(self.errors[-1], "nonempty current mathematical question")

    def test_end_with_explicit_handoff_insertion_changes_only_editable_note(self):
        from PySide6.QtGui import QTextCursor

        self.open_project()
        panel, parent_outcome = self.create_retained_investigation()
        pane = self.open_file(self.files["questions.txt"])
        note_id = pane.shown
        memory_before = self.controller.buffer(note_id).content
        disk_before = self.files["questions.txt"].read_bytes()
        parent_hash = parent_outcome.path.read_bytes()
        child_path = Path(self.controller.current().investigation.child_path)
        child_hash = child_path.read_bytes()
        pane.text.moveCursor(QTextCursor.MoveOperation.End)

        panel.question.setPlainText("Newest unsaved question?")
        panel.correction.setPlainText("Newest unsaved human correction.")
        panel.last_conclusion.setPlainText("Newest unsaved useful conclusion.")
        panel.unresolved_issue.setPlainText("Newest unsaved unresolved issue.")

        with patch.object(
            self.window, "choose_end_investigation", return_value="insert"
        ):
            panel.end_investigation_button.click()

        changed = self.controller.buffer(note_id).content
        self.assertIsNone(self.controller.current().investigation)
        self.assertNotEqual(changed, memory_before)
        self.assertIn("Investigation handoff — editable human task summary", changed)
        self.assertIn("Newest unsaved question?", changed)
        self.assertIn("Newest unsaved human correction.", changed)
        self.assertIn("Newest unsaved useful conclusion.", changed)
        self.assertIn("Newest unsaved unresolved issue.", changed)
        self.assertNotIn("Human correction: assume sequential compactness only.", changed)
        self.assertNotIn("Completed child text stays only", changed)
        self.assertEqual(self.files["questions.txt"].read_bytes(), disk_before)
        self.assertEqual(parent_outcome.path.read_bytes(), parent_hash)
        self.assertEqual(child_path.read_bytes(), child_hash)
        self.assertTrue(self.controller.buffer(note_id).dirty)
        self.assertFalse(self.errors)

    def test_end_persistence_failure_reports_and_keeps_investigation_active(self):
        self.open_project()
        panel, _parent_outcome = self.create_retained_investigation()
        pane = self.open_file(self.files["questions.txt"])
        note_id = pane.shown
        note_before = self.controller.buffer(note_id).content

        with patch.object(
            self.window, "choose_end_investigation", return_value="without"
        ), patch.object(
            self.controller, "checkpoint", return_value=True
        ), patch.object(
            self.controller.store, "save", side_effect=OSError("end denied")
        ):
            self.window.actions["end_investigation"].trigger()

        self.assertIsNotNone(self.controller.current().investigation)
        self.assertEqual(self.controller.buffer(note_id).content, note_before)
        self.assertRegex(self.errors[-1], "Investigation checkpoint failed")
        self.assertTrue(panel.end_investigation_button.isEnabled())
        self.controller.close_project(discard_session=True)

    def test_end_initial_checkpoint_failure_preserves_visible_edits(self):
        self.open_project()
        panel, _parent_outcome = self.create_retained_investigation()
        pane = self.open_file(self.files["questions.txt"])
        note_id = pane.shown
        note_before = self.controller.buffer(note_id).content
        panel.question.setPlainText("Visible question after checkpoint failure?")
        panel.correction.setPlainText("Visible correction after checkpoint failure.")

        self.controller.persistence_error = "deterministic recovery checkpoint denial"
        with patch.object(
            self.window, "choose_end_investigation", return_value="without"
        ), patch.object(self.controller, "checkpoint", return_value=False):
            panel.end_investigation_button.click()

        self.assertIsNotNone(self.controller.current().investigation)
        self.assertEqual(self.controller.buffer(note_id).content, note_before)
        self.assertEqual(panel.question.toPlainText(),
                         "Visible question after checkpoint failure?")
        self.assertEqual(panel.correction.toPlainText(),
                         "Visible correction after checkpoint failure.")
        self.assertIn("active pointer", panel.status.text())
        self.assertRegex(self.errors[-1], "deterministic recovery checkpoint denial")
        self.controller.close_project(discard_session=True)

    def test_insert_then_end_failure_keeps_note_edit_and_active_pointer(self):
        from PySide6.QtGui import QTextCursor

        self.open_project()
        panel, _parent_outcome = self.create_retained_investigation()
        pane = self.open_file(self.files["questions.txt"])
        note_id = pane.shown
        disk_before = self.files["questions.txt"].read_bytes()
        pane.text.moveCursor(QTextCursor.MoveOperation.End)
        panel.question.setPlainText("Newest question before failed ending?")
        panel.correction.setPlainText("Newest correction before failed ending.")
        save = self.controller.store.save

        def fail_end_candidate(candidate):
            if candidate.investigation is None:
                raise OSError("deterministic end publication denial")
            return save(candidate)

        with patch.object(
            self.window, "choose_end_investigation", return_value="insert"
        ), patch.object(
            self.controller.store, "save", side_effect=fail_end_candidate
        ):
            panel.end_investigation_button.click()

        changed = self.controller.buffer(note_id).content
        self.assertIn("Newest question before failed ending?", changed)
        self.assertIn("Newest correction before failed ending.", changed)
        self.assertTrue(self.controller.buffer(note_id).dirty)
        self.assertEqual(self.files["questions.txt"].read_bytes(), disk_before)
        self.assertIsNotNone(self.controller.current().investigation)
        self.assertEqual(panel.question.toPlainText(),
                         "Newest question before failed ending?")
        self.assertIn("handoff was inserted", panel.status.text().lower())
        self.assertIn("remains unsaved", panel.status.text().lower())
        self.assertIn("not retried, duplicated, or undone", panel.status.text())
        self.assertRegex(self.errors[-1], "ending the investigation failed")
        self.controller.close_project(discard_session=True)

    def test_end_revalidates_editable_target_after_confirmation(self):
        self.open_project()
        panel, _parent_outcome = self.create_retained_investigation()
        pane = self.open_file(self.files["questions.txt"])
        note_id = pane.shown
        note_before = self.controller.buffer(note_id).content
        external = self.home / "read-only-reference.txt"
        external.write_text("Read-only reference.\n", encoding="utf-8")
        read_only = self.controller.open_file(external, reference=True)
        self.window.render()
        self.window.select(note_id, 0)
        panel.question.setPlainText("Keep this visible after target rejection?")

        def change_target():
            self.window.select(read_only.state.id, 0)
            return "insert"

        with patch.object(
            self.window, "choose_end_investigation", side_effect=change_target
        ):
            panel.end_investigation_button.click()

        self.assertIsNotNone(self.controller.current().investigation)
        self.assertEqual(self.controller.buffer(note_id).content, note_before)
        self.assertEqual(panel.question.toPlainText(),
                         "Keep this visible after target rejection?")
        self.assertRegex(self.errors[-1], "editable ordinary work note")

    def test_delayed_restore_cannot_reinstall_an_ended_investigation(self):
        from mrw.workspace import WorkspaceError

        self.open_project()
        panel, _parent_outcome = self.create_retained_investigation()
        snapshot = self.controller.current().investigation
        panel.dismiss_button.click()
        original_restore = self.controller.restore_investigation
        started = threading.Event()
        self.release = threading.Event()

        def delayed_restore(state=None):
            restored = original_restore(state)
            started.set()
            self.release.wait(10)
            return restored

        with patch.object(
            self.controller, "restore_investigation", side_effect=delayed_restore
        ):
            self.window.resume_investigation()
            self.wait_until(started.is_set)
            self.assertFalse(self.window.actions["end_investigation"].isEnabled())
            self.assertFalse(panel.end_investigation_button.isEnabled())
            with self.assertRaisesRegex(WorkspaceError, "restore to finish"):
                self.window.end_investigation()

            self.assertEqual(self.controller.end_investigation(), snapshot)
            panel.investigation_ended()
            self.release.set()
            self.wait_idle()

        self.assertIsNone(self.controller.current().investigation)
        self.assertIsNone(panel.displayed_investigation_identity)
        self.assertIn("Investigation ended", panel.status.text())
        self.assertFalse(self.window.actions["end_investigation"].isEnabled())
        self.assertFalse(panel.end_investigation_button.isEnabled())


if __name__ == "__main__":
    unittest.main()
