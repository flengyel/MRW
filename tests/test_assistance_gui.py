"""Actual Qt coverage for the one-exchange R2 workflow; no network is used."""

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


def completed_response(text):
    return json.dumps({
        "id": "resp-r2-gui",
        "object": "response",
        "status": "completed",
        "model": "local-gui-model-resolved",
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
class AssistanceWidgetTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from PySide6.QtWidgets import QApplication
        cls.app = QApplication.instance() or QApplication([])

    def setUp(self):
        from mrw.gui import WorkstationWindow
        from mrw.workstation import Workstation

        self.temporary = tempfile.TemporaryDirectory(prefix="mrw-r2-gui-")
        self.home = Path(self.temporary.name)
        self.root = self.home / "project"
        self.root.mkdir()
        self.files = mathematical_project(self.root)
        self.transport_calls = []
        self.transport_result = completed_response("Synthetic answer.\n")
        self.started = threading.Event()
        self.release = None
        self.clock_tick = 0

        def transport(method, endpoint, body, headers, timeout, limit):
            self.transport_calls.append((method, endpoint, body, timeout, limit))
            self.started.set()
            if self.release is not None:
                self.release.wait(10)
            result = self.transport_result
            if isinstance(result, Exception):
                raise result
            return TransportResult(200, result)

        def clock():
            self.clock_tick += 1
            return f"2026-09-17T13:00:{self.clock_tick:02d}Z"

        self.controller = Workstation(
            state_root=self.home / "state",
            assistance_transport=transport,
            assistance_clock=clock,
            assistance_id_generator=lambda: f"model-call-gui-{self.clock_tick + 1}",
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

    def wait_until(self, predicate, timeout=10):
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
        cursor.setPosition(
            qt_position(pane.text, end), QTextCursor.MoveMode.KeepAnchor
        )
        pane.text.setTextCursor(cursor)
        pane.text.setFocus()
        self.app.processEvents()

    def invoke_ask_shortcut(self, pane):
        from PySide6.QtTest import QTest

        QTest.keySequence(pane.text, self.window.actions["ask"].shortcut())
        self.app.processEvents()

    def test_keyboard_selection_context_removal_preview_cancel_and_missing_configuration(self):
        self.open_project()
        pane = self.open_file(self.files["proof.md"])
        self.select(pane, "3.0", "3.7")
        self.assertTrue(self.window.actions["ask"].isEnabled())
        self.invoke_ask_shortcut(pane)
        panel = self.window.assistance
        self.assertTrue(self.window.assistance_dock.isVisible())
        self.assertEqual(panel.context_list.count(), 1)
        self.assertEqual(panel.contexts[0].text, "Expand ")

        panel.question.setPlainText("What is the governing idea?")
        panel.model.clear()
        panel.preview_button.click()
        self.assertRegex(self.errors[-1], "requested model")
        self.assertEqual(self.transport_calls, [])
        panel.model.setText("local-gui-model")
        panel.preview_button.click()
        first_output = panel.prepared.operation.output
        self.assertIn("Expand ", panel.preview_text.toPlainText())
        self.assertIn("Complete UTF-8 JSON request body", panel.preview_text.toPlainText())
        self.assertTrue(panel.send_button.isEnabled())

        panel.remove_context_button.click()
        self.assertEqual(panel.context_list.count(), 0)
        self.assertFalse(panel.send_button.isEnabled())
        panel.preview_button.click()
        self.assertNotIn("Exact selected text:\nExpand ", panel.preview_text.toPlainText())
        self.assertIn("No selected text will be transmitted", panel.preview_text.toPlainText())
        second_output = panel.prepared.operation.output
        panel.dismiss_button.click()
        self.assertFalse(first_output.exists())
        self.assertFalse(second_output.exists())
        self.assertEqual(self.transport_calls, [])

        self.select(pane, "3.0", "3.7")
        self.invoke_ask_shortcut(pane)
        panel.question.setPlainText("Why is this expansion relevant?")
        panel.model.setText("local-gui-model")
        panel.preview_button.click()
        missing_key_output = panel.prepared.operation.output
        with patch.dict(os.environ, {}, clear=True):
            panel.send_button.click()
        self.assertRegex(self.errors[-1], "OPENAI_API_KEY")
        self.assertEqual(self.transport_calls, [])
        self.assertFalse(missing_key_output.exists())
        self.assertNotIn("Authorization", panel.preview_text.toPlainText())

    def test_inflight_completion_after_note_edit_switch_and_closed_view_is_inert_and_usable(self):
        from PySide6.QtGui import QDesktopServices, QTextCursor

        self.open_project()
        note_pane = self.open_file(self.files["questions.txt"])
        note_id = note_pane.shown
        source_path = self.root / "unicode-source.txt"
        source_path.write_text("Claim α😀.\nA second line.\n", encoding="utf-8")
        source_pane = self.open_file(source_path)
        source_id = source_pane.shown
        self.select(source_pane, "1.6", "1.8")
        self.invoke_ask_shortcut(source_pane)
        panel = self.window.assistance
        panel.question.setPlainText("Can this implication be justified?")
        panel.model.setText("local-gui-model")
        panel.preview_button.click()
        response = (
            "Proposed route with <b>markup</b>, https://example.invalid/source, "
            "and citation [Unverified 1].\n```python\nprint('inert')\n```\n\n"
            "Second α😀 passage.\n"
        )
        self.transport_result = completed_response(response)
        self.release = threading.Event()
        with patch.dict(os.environ, {"OPENAI_API_KEY": "local-test-only"}, clear=False):
            panel.send_button.click()
        self.wait_until(self.started.is_set)
        self.assertTrue(panel.in_flight)
        self.assertFalse(panel.send_button.isEnabled())
        panel.send_button.click()
        self.assertEqual(len(self.transport_calls), 1)

        # A clean source view may close while the request runs. The preloaded
        # note then receives a concurrent human edit through the real widget.
        self.window.actions["close"].trigger()
        self.assertNotIn(source_id, self.controller.buffers)
        self.window.select(note_id, 0)
        note_pane = self.window.panes[0]
        note_pane.text.moveCursor(QTextCursor.MoveOperation.End)
        note_pane.text.insertPlainText("Concurrent human edit while assistance runs.\n")
        concurrent = note_pane.text.toPlainText()
        self.window.assistance_dock.hide()
        self.release.set()
        with patch.object(QDesktopServices, "openUrl", side_effect=AssertionError("returned URL dispatched")):
            self.wait_idle()
            panel = self.window.assistance
            self.assertFalse(panel.in_flight)
            self.assertEqual(panel.outcome.terminal.status, "completed")
            self.assertEqual(panel.answer.toPlainText(), response)
            self.assertIn("Provider: openai", panel.answer_attribution.text())
            self.assertIn("Requested model: local-gui-model", panel.answer_attribution.text())
            self.assertIn("Resolved model: local-gui-model-resolved", panel.answer_attribution.text())
            self.assertIn("inert plain text", panel.answer_notice.text())
            self.assertIn("unverified", panel.answer_notice.text())
            self.assertEqual(self.controller.buffer(note_id).content.replace("\r\n", "\n"), concurrent)

            self.window.assistance_dock.show()
            panel.record_toggle.click()
            self.assertTrue(panel.raw_record.isVisible())
            self.assertIn('"status":"completed"', panel.raw_record.toPlainText())
            self.assertNotIn("local-test-only", panel.raw_record.toPlainText())
            panel.passage.setValue(2)
            panel.show_passage_button.click()
            self.assertIn("Second α😀 passage.", panel.passage_text.toPlainText())

            retained = self.root / "gui-retained-passage.json"
            with patch(
                "mrw.gui.QFileDialog.getSaveFileName",
                return_value=(str(retained), ""),
            ):
                panel.retain_button.click()
            projection = parse_documentary_projection(retained.read_bytes())
            self.assertEqual(projection.representation.content, "Second α😀 passage.\n")

            self.window.select(note_id, 0)
            note_pane = self.window.panes[0]
            note_pane.text.moveCursor(QTextCursor.MoveOperation.End)
            panel.insert_button.click()
            inserted = self.controller.buffer(note_id).content
            self.assertIn("Concurrent human edit while assistance runs.", inserted)
            self.assertIn("Model contribution — unverified editable copy", inserted)
            self.assertIn("Second α😀 passage.", inserted)
            self.assertEqual(panel.answer.toPlainText(), response)
            note_pane.text.insertPlainText("Human revision after copied contribution.\n")
            self.assertIn("Human revision after copied contribution.", self.controller.buffer(note_id).content)
            self.assertEqual(panel.answer.toPlainText(), response)
        self.assertEqual(len(self.transport_calls), 1)
        self.assertFalse(self.errors)

    def test_refused_incomplete_and_failed_outcomes_remain_inspectable_without_answers(self):
        self.open_project()
        pane = self.open_file(self.files["proof.md"])
        original = self.controller.buffer(pane.shown).content
        outcomes = (
            ("refused", json.dumps({
                "id": "resp-refused", "object": "response", "status": "completed",
                "model": "local-resolved", "output": [{
                    "type": "message", "role": "assistant", "status": "completed",
                    "content": [{"type": "refusal", "refusal": "No assistance."}],
                }],
            }).encode(), "No assistance."),
            ("incomplete", json.dumps({
                "id": "resp-incomplete", "object": "response", "status": "incomplete",
                "model": "local-resolved", "output": [],
            }).encode(), ""),
            ("failed", RuntimeError("deterministic transport failure"), ""),
        )
        for expected, transport_result, visible_text in outcomes:
            with self.subTest(status=expected):
                self.transport_result = transport_result
                self.started.clear()
                self.select(pane, "3.0", "3.7")
                self.invoke_ask_shortcut(pane)
                panel = self.window.assistance
                panel.question.setPlainText("What can be said about this step?")
                panel.model.setText("local-gui-model")
                panel.preview_button.click()
                with patch.dict(os.environ, {"OPENAI_API_KEY": "local-test-only"}, clear=False):
                    panel.send_button.click()
                self.wait_idle()
                self.assertEqual(panel.outcome.terminal.status, expected)
                self.assertIn(f"ended {expected}", panel.status.text())
                self.assertFalse(panel.retain_button.isEnabled())
                self.assertFalse(panel.insert_button.isEnabled())
                self.assertTrue(panel.record_toggle.isVisible())
                self.assertEqual(panel.answer.toPlainText(), visible_text)
                self.assertEqual(self.controller.buffer(pane.shown).content, original)
                panel.dismiss_button.click()
        self.assertEqual(len(self.transport_calls), 3)
        self.assertFalse(self.errors)


if __name__ == "__main__":
    unittest.main()
