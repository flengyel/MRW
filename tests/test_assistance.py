"""Bounded task-local assistance controller tests; all transports are local fakes."""

from __future__ import annotations

from hashlib import sha256
import json
import os
from pathlib import Path
import stat
import tempfile
import unittest

from test_workstation import mathematical_project
from theorem_terminal.documentary_warrant import parse_documentary_projection
from theorem_terminal.openai_response import TransportResult
from theorem_terminal.workstation import Workstation
from theorem_terminal.workspace import WorkspaceError


def provider_response(text="First idea: use α → β.\n\nSecond 😀 passage.\n"):
    return json.dumps({
        "id": "resp-r2-local",
        "object": "response",
        "status": "completed",
        "model": "local-fake-model-resolved",
        "output": [{
            "type": "message",
            "role": "assistant",
            "status": "completed",
            "content": [{"type": "output_text", "text": text, "annotations": []}],
        }],
    }, ensure_ascii=False).encode("utf-8")


class AssistanceControllerTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="theorem-terminal-r2-")
        self.addCleanup(temporary.cleanup)
        self.home = Path(temporary.name)
        self.root = self.home / "project"
        self.root.mkdir()
        self.files = mathematical_project(self.root)
        self.calls = []
        self.response = provider_response()
        self.counter = 0

        def transport(method, endpoint, body, headers, timeout, limit):
            self.calls.append((method, endpoint, body, dict(headers), timeout, limit))
            response = self.response
            if isinstance(response, Exception):
                raise response
            return TransportResult(200, response)

        def clock():
            self.counter += 1
            return f"2026-09-17T12:00:{self.counter:02d}Z"

        self.controller = Workstation(
            state_root=self.home / "state",
            assistance_transport=transport,
            assistance_clock=clock,
            assistance_id_generator=lambda: f"model-call-r2-{self.counter + 1}",
        )
        self.controller.open_project(self.root)

    def select(self, buffer, start, end, pane=0):
        self.controller.set_position(
            buffer.state.id,
            cursor=end,
            selection=[start, end],
            yscroll=0,
            xscroll=0,
            pane=pane,
        )
        return self.controller.capture_assistance_context(
            buffer.state.id, start, end, pane=pane
        )

    def prepared(self, context, *, contexts=None, question="Why does β follow?",
                 name="exchange", model="local-fake-model"):
        return self.controller.prepare_assistance(
            target=context,
            contexts=(context,) if contexts is None else contexts,
            question=question,
            model=model,
            output=self.controller.store.directory / f"{name}.json",
            exchange_id=name,
        )

    def send(self, prepared):
        self.controller.begin_assistance(prepared, "test-only-key")
        transmission = self.controller.transmit_assistance(
            prepared, "test-only-key"
        )
        return self.controller.accept_assistance(prepared, transmission)

    def test_exact_unicode_unsaved_selection_derives_only_explicit_task_context(self):
        path = self.root / "unsaved.txt"
        path.write_text("Visible α😀 lemma.\nPRIVATE UNSELECTED WORK\n", encoding="utf-8")
        buffer = self.controller.open_file(path)
        changed = "Visible α😀 lemma, revised.\nPRIVATE UNSELECTED WORK\n"
        self.controller.edit(buffer.state.id, changed)
        context = self.select(buffer, "1.8", "1.16")
        self.assertEqual(context.text, "α😀 lemma")
        self.assertEqual(context.state, "unsaved in-memory ordinary text")
        self.assertEqual(
            context.source_revision, sha256(changed.encode("utf-8")).hexdigest()
        )
        self.assertEqual(context.saved_revision, buffer.state.revision)

        prepared = self.prepared(
            context,
            question="Explain α😀 exactly; do not use anything else.",
        )
        body = prepared.operation.body.decode("utf-8")
        self.assertIn("α😀 lemma", body)
        self.assertIn("Scalar location: 1.8–1.16", body)
        self.assertIn(context.source_revision, body)
        self.assertNotIn("PRIVATE UNSELECTED WORK", body)
        self.assertNotIn("questions.txt", body)
        self.assertIn("Exact selected text", prepared.preview)
        self.assertIn("Request-body SHA-256", prepared.preview)
        self.assertEqual(
            prepared.operation.request["target"]["revision"],
            context.source_revision,
        )
        self.assertEqual(prepared.operation.request["in_reply_to"], None)

    def test_context_removal_changes_frozen_body_and_cancel_creates_nothing(self):
        buffer = self.controller.open_file(self.files["proof.md"])
        context = self.select(buffer, "3.0", "3.7")
        included = self.prepared(context, name="included")
        removed = self.prepared(context, contexts=(), name="removed")
        self.assertIn(context.text, included.operation.body.decode("utf-8"))
        self.assertNotIn(context.text, removed.operation.body.decode("utf-8"))
        self.assertIn("No selected source or work text", removed.operation.body.decode("utf-8"))
        self.assertEqual(removed.operation.request["context_refs"], ())
        self.assertIn("No selected text will be transmitted", removed.preview)
        self.assertFalse(included.operation.output.exists())
        self.assertFalse(removed.operation.output.exists())
        self.assertEqual(self.calls, [])

    def test_explicit_readonly_reference_and_untitled_work_are_selectable(self):
        external = self.home / "external-reference.txt"
        external.write_text("External α reference.\n", encoding="utf-8")
        reference = self.controller.open_file(external, reference=True)
        context = self.select(reference, "1.9", "1.10")
        self.assertEqual(context.text, "α")
        self.assertEqual(
            context.state, "explicitly opened read-only ordinary text reference"
        )

        untitled = self.controller.new_buffer()
        self.controller.edit(untitled.state.id, "Unsaved 😀 work")
        context = self.select(untitled, "1.8", "1.9")
        self.assertEqual(context.text, "😀")
        self.assertIsNone(context.source_path)
        self.assertTrue(context.source_identity.startswith("untitled-work-buffer:"))
        self.assertEqual(context.state, "unsaved in-memory ordinary text")

    def test_missing_configuration_duplicate_claim_and_successful_terminal_call(self):
        buffer = self.controller.open_file(self.files["proof.md"])
        context = self.select(buffer, "3.0", "3.7")
        with self.assertRaisesRegex(WorkspaceError, "requested model"):
            self.prepared(context, model="")
        prepared = self.prepared(context, name="successful")
        with self.assertRaisesRegex(WorkspaceError, "OPENAI_API_KEY"):
            self.controller.begin_assistance(prepared, "")
        self.assertFalse(prepared.operation.output.exists())
        self.controller.begin_assistance(prepared, "test-only-key")
        with self.assertRaisesRegex(WorkspaceError, "already in flight"):
            self.controller.begin_assistance(prepared, "test-only-key")
        transmission = self.controller.transmit_assistance(
            prepared, "test-only-key"
        )
        outcome = self.controller.accept_assistance(prepared, transmission)
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(outcome.terminal.status, "completed")
        self.assertEqual(outcome.terminal.provider, "openai")
        self.assertEqual(outcome.terminal.requested_model, "local-fake-model")
        self.assertEqual(outcome.terminal.resolved_model, "local-fake-model-resolved")
        self.assertEqual(outcome.terminal.raw_response, "First idea: use α → β.\n\nSecond 😀 passage.\n")
        self.assertEqual(stat.S_IMODE(outcome.path.stat().st_mode), 0o600)
        self.assertNotIn(b"test-only-key", outcome.raw_record)
        self.assertNotIn("test-only-key", prepared.preview)
        self.assertIsNone(self.controller.assistance_in_flight)

    def test_request_destination_collision_is_not_overwritten_or_transmitted(self):
        buffer = self.controller.open_file(self.files["proof.md"])
        context = self.select(buffer, "3.0", "3.7")
        prepared = self.prepared(context, name="collision")
        prepared.operation.output.write_bytes(b"existing unrelated bytes")
        self.controller.begin_assistance(prepared, "test-only-key")
        transmission = self.controller.transmit_assistance(
            prepared, "test-only-key"
        )
        outcome = self.controller.accept_assistance(prepared, transmission)
        self.assertEqual(self.calls, [])
        self.assertEqual(
            prepared.operation.output.read_bytes(), b"existing unrelated bytes"
        )
        self.assertIsNone(outcome.terminal)
        self.assertRegex(outcome.error, "already exists")

    def test_all_noncompleted_outcomes_are_terminal_without_retry_or_note_loss(self):
        note = self.controller.open_file(self.files["questions.txt"])
        context = self.select(note, "1.0", "1.15")
        original = note.content
        cases = {
            "refused": {
                "id": "resp-refused", "object": "response", "status": "completed",
                "model": "resolved", "output": [{"type": "message", "role": "assistant",
                    "status": "completed", "content": [{"type": "refusal", "refusal": "No."}]}],
            },
            "incomplete": {
                "id": "resp-incomplete", "object": "response", "status": "incomplete",
                "model": "resolved", "output": [],
            },
            "failed": RuntimeError("synthetic local transport failure"),
        }
        for name, response in cases.items():
            with self.subTest(name=name):
                before = len(self.calls)
                self.response = response if isinstance(response, Exception) else json.dumps(response).encode()
                prepared = self.prepared(context, name=name)
                outcome = self.send(prepared)
                self.assertEqual(len(self.calls), before + 1)
                self.assertEqual(outcome.terminal.status, name)
                self.assertEqual(self.controller.buffer(note.state.id).content, original)
                self.assertTrue(outcome.path.exists())
                if name != "refused":
                    self.assertIsNone(outcome.terminal.raw_response)
                else:
                    self.assertEqual(outcome.terminal.raw_response, "No.")

    def test_completion_preserves_concurrent_edits_and_exact_projection_and_contribution(self):
        source = self.controller.open_file(self.files["proof.md"])
        context = self.select(source, "3.0", "3.7")
        prepared = self.prepared(context, name="projection")
        self.controller.begin_assistance(prepared, "test-only-key")
        transmission = self.controller.transmit_assistance(prepared, "test-only-key")

        note = self.controller.open_file(self.files["questions.txt"])
        concurrently_edited = note.content + "Concurrent human note edit.\n"
        self.controller.edit(note.state.id, concurrently_edited)
        outcome = self.controller.accept_assistance(prepared, transmission)
        self.assertEqual(self.controller.buffer(note.state.id).content, concurrently_edited)

        call, selected, exact = self.controller.assistance_passage(outcome.path, 2)
        self.assertEqual(exact, "Second 😀 passage.\n")
        expected_start = call.raw_response.encode("utf-8").index("Second".encode())
        self.assertEqual(selected.start_byte, expected_start)
        self.assertGreater(selected.end_byte - selected.start_byte, len(exact))

        destination = self.root / "retained-passage.json"
        projected = self.controller.project_model_call_passage(
            outcome.path, 2, destination
        )
        projection = parse_documentary_projection(destination.read_bytes())
        self.assertEqual(projection.representation.content, exact)
        self.assertEqual(projection.representation.span.start_byte, selected.start_byte)
        self.assertEqual(stat.S_IMODE(destination.stat().st_mode), 0o600)
        with self.assertRaisesRegex(ValueError, "already open|already exists"):
            self.controller.project_model_call_passage(
                outcome.path, 2, destination
            )
        contribution = self.controller.attributed_assistance_contribution(
            outcome.path, 2
        )
        self.assertIn("Model contribution — unverified editable copy", contribution)
        self.assertIn("ModelCall: " + call.id, contribution)
        self.assertIn("Second 😀 passage.", contribution)
        self.assertIn("citations, links, code", contribution)
        self.assertEqual(projected.state.format, "projection")


if __name__ == "__main__":
    unittest.main()
