"""Bounded R3 parent/child investigation tests; all provider I/O is local."""

from __future__ import annotations

from copy import deepcopy
from hashlib import sha256
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from test_workstation import mathematical_project
from theorem_terminal.openai_response import TransportResult
from theorem_terminal.workstation import Workstation
from theorem_terminal.workspace import VERSION, WorkspaceError, decode_workspace, encode_workspace


def provider_response(identifier, text, *, status="completed"):
    output = []
    if status == "completed":
        output = [{
            "type": "message",
            "role": "assistant",
            "status": "completed",
            "content": [{"type": "output_text", "text": text, "annotations": []}],
        }]
    return json.dumps({
        "id": identifier,
        "object": "response",
        "status": status,
        "model": "local-r3-resolved",
        "output": output,
    }, ensure_ascii=False).encode("utf-8")


class InvestigationControllerTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="theorem-terminal-r3-")
        self.addCleanup(temporary.cleanup)
        self.home = Path(temporary.name)
        self.root = self.home / "project"
        self.root.mkdir()
        self.files = mathematical_project(self.root)
        self.responses = [
            provider_response(
                "resp-parent",
                "A discarded route uses SECRET-PARENT.\n\n"
                "Useful α😀 route: reduce to the boundary case.\n",
            ),
            provider_response(
                "resp-child",
                "Corrected result with <b>inert markup</b>.\n\n"
                "Check the final ε estimate.\n",
            ),
        ]
        self.calls = []
        self.clock_tick = 0

        def transport(method, endpoint, body, headers, timeout, limit):
            self.calls.append((method, endpoint, body, dict(headers), timeout, limit))
            response = self.responses.pop(0)
            if isinstance(response, Exception):
                raise response
            return TransportResult(200, response)

        def clock():
            self.clock_tick += 1
            return f"2026-09-18T10:00:{self.clock_tick:02d}Z"

        self.controller = Workstation(
            state_root=self.home / "state",
            assistance_transport=transport,
            assistance_clock=clock,
            assistance_id_generator=lambda: f"model-call-r3-{self.clock_tick + 1}",
        )
        self.controller.open_project(self.root)

    def select(self, buffer, start, end):
        self.controller.set_position(
            buffer.state.id, cursor=end, selection=[start, end],
            yscroll=0, xscroll=0, pane=0,
        )
        return self.controller.capture_assistance_context(
            buffer.state.id, start, end, pane=0
        )

    def send(self, prepared):
        self.controller.begin_assistance(prepared, "test-only-key")
        transmission = self.controller.transmit_assistance(
            prepared, "test-only-key"
        )
        return self.controller.accept_assistance(prepared, transmission)

    def test_version_eight_migration_adds_no_investigation_without_record_reads(self):
        current = json.loads(encode_workspace(self.controller.current()))
        current.pop("investigation")
        current["schema_version"] = 8
        raw = (json.dumps(current, ensure_ascii=False) + "\n").encode("utf-8")
        with patch(
            "theorem_terminal.workspace.read_bounded",
            side_effect=AssertionError("migration read a record"),
        ):
            migrated = decode_workspace(raw)
        self.assertEqual(VERSION, 9)
        self.assertIsNone(migrated.investigation)

    def make_parent(self, *, name="parent"):
        source = self.controller.open_file(self.files["proof.md"])
        context = self.select(source, "3.0", "3.7")
        prepared = self.controller.prepare_assistance(
            target=context,
            contexts=(context,),
            question="What route should I try?",
            model="local-r3",
            output=self.controller.store.directory / f"{name}.json",
            exchange_id=name,
        )
        outcome = self.send(prepared)
        return self.controller.investigation_parent(outcome.path), outcome

    def prepare_child(self, parent, *, name="child"):
        note = self.controller.open_file(self.files["questions.txt"])
        note.content += "PRIVATE UNSELECTED NOTE\n"
        note.dirty = note.state.was_dirty = True
        current = self.select(note, "1.0", "1.15")
        prepared = self.controller.prepare_continuation(
            parent=parent,
            passage_numbers=(2,),
            contexts=(current,),
            question="Does the route survive the corrected assumption?",
            correction="Replace compactness by sequential compactness.",
            last_conclusion="The reduction to the boundary case looked useful.",
            unresolved_issue="The final ε estimate is still missing.",
            model="local-r3",
            output=self.controller.store.directory / f"{name}.json",
            exchange_id=name,
        )
        return prepared, note

    def test_exact_multibyte_parent_span_and_only_visible_context_enter_child_body(self):
        parent, parent_outcome = self.make_parent()
        parent_before = parent_outcome.path.read_bytes()
        prepared, _note = self.prepare_child(parent)
        draft = prepared.continuation
        self.assertIsNotNone(draft)
        selected = draft.passages[0]
        response_bytes = parent.call.raw_response.encode("utf-8")
        self.assertEqual(
            response_bytes[selected.start_byte:selected.end_byte].decode("utf-8"),
            "Useful α😀 route: reduce to the boundary case.\n",
        )
        request = prepared.operation.request
        self.assertEqual(request["in_reply_to"], parent.call.id)
        self.assertEqual(request["context_refs"][0], {
            "kind": "VersionedSpan",
            "id": (f"{parent.call.id}#response-utf8-"
                   f"{selected.start_byte}-{selected.end_byte}"),
            "revision": parent.call.raw_response_digest,
        })
        body_text = prepared.operation.body.decode("utf-8")
        self.assertIn("Useful α😀 route", body_text)
        self.assertNotIn("SECRET-PARENT", body_text)
        self.assertNotIn("PRIVATE UNSELECTED NOTE", body_text)
        self.assertNotIn("previous_response_id", body_text)
        self.assertIn("Replace compactness by sequential compactness.", body_text)
        self.assertIn(parent.call.id, prepared.preview)
        self.assertIn(parent.call.raw_response_digest, prepared.preview)
        self.assertIn(f"[{selected.start_byte}, {selected.end_byte})", prepared.preview)

        outcome = self.send(prepared)
        self.assertEqual(outcome.terminal.document["in_reply_to"], parent.call.id)
        self.assertEqual(parent_outcome.path.read_bytes(), parent_before)
        self.controller.retain_investigation(prepared, outcome)
        state = self.controller.current().investigation
        self.assertEqual(state.parent_id, parent.call.id)
        self.assertEqual(state.child_id, outcome.terminal.id)
        self.assertEqual(state.parent_passages[0].start_byte, selected.start_byte)
        with self.assertRaisesRegex(WorkspaceError, "cannot be continued again"):
            self.controller.investigation_parent(outcome.path)
        with self.assertRaisesRegex(WorkspaceError, "already has one saved"):
            self.controller.prepare_continuation(
                parent=parent,
                passage_numbers=(2,),
                contexts=(),
                question="Create a forbidden branch?",
                correction="",
                last_conclusion="",
                unresolved_issue="",
                model="local-r3",
                output=self.controller.store.directory / "forbidden.json",
            )

        manifest = json.loads(encode_workspace(self.controller.current()))
        investigation = manifest["investigation"]
        malformed = (
            {**investigation, "parent_path": "relative.json"},
            {**investigation, "parent_record_revision": "bad"},
            {**investigation, "question": ""},
            {**investigation, "extra": None},
            {**investigation, "parent_passages": investigation["parent_passages"] * 2},
            {**investigation, "parent_passages": [{
                **investigation["parent_passages"][0], "end_byte": 5 * 1024 * 1024,
            }]},
        )
        for value in malformed:
            with self.subTest(value=value), self.assertRaises(WorkspaceError):
                decode_workspace((json.dumps(
                    {**manifest, "investigation": value}, ensure_ascii=False
                ) + "\n").encode("utf-8"))

    def test_terminal_child_and_human_summary_restore_without_hidden_state(self):
        parent, _parent_outcome = self.make_parent()
        prepared, note = self.prepare_child(parent)
        outcome = self.send(prepared)
        child_before = outcome.path.read_bytes()
        self.controller.retain_investigation(prepared, outcome)
        self.controller.update_investigation_summary(
            question="Can the ε estimate be made uniform?",
            correction="The sequence is only eventually bounded.",
            last_conclusion="Boundary reduction survives the correction.",
            unresolved_issue="Uniformity in ε remains open.",
        )
        handoff = self.controller.investigation_handoff()
        self.assertIn("editable human task summary", handoff)
        self.assertIn("Uniformity in ε remains open.", handoff)
        self.assertNotIn("Corrected result with", handoff)
        self.assertEqual(outcome.path.read_bytes(), child_before)

        self.controller.checkpoint()
        self.controller.close_project(keep_recovery=True)
        restored_controller = Workstation(state_root=self.home / "state")
        restored_controller.open_project(self.root)
        restored = restored_controller.restore_investigation()
        self.assertIsNone(restored.error)
        self.assertEqual(restored.parent.call.id, parent.call.id)
        self.assertEqual(restored.passages[0].text,
                         "Useful α😀 route: reduce to the boundary case.\n")
        self.assertEqual(restored.child.id, outcome.terminal.id)
        self.assertEqual(restored.child.document["in_reply_to"], parent.call.id)
        self.assertEqual(restored.state.question,
                         "Can the ε estimate be made uniform?")
        recovered_note = restored_controller.view(note.state.id)
        self.assertIn("PRIVATE UNSELECTED NOTE", recovered_note.content)

        outcome.path.write_bytes(child_before + b" ")
        changed = restored_controller.restore_investigation()
        self.assertIn("Child record missing or changed", changed.error)
        self.assertEqual(changed.state.unresolved_issue,
                         "Uniformity in ε remains open.")
        self.assertIsNone(changed.child)
        self.assertEqual(changed.parent.call.id, parent.call.id)

    def test_end_completed_investigation_preserves_every_other_pointer_and_starts_another_after_restart(self):
        parent, parent_outcome = self.make_parent(name="first-parent")
        prepared, note = self.prepare_child(parent, name="first-child")
        outcome = self.send(prepared)
        self.controller.retain_investigation(prepared, outcome)

        projection = self.root / "retained-child-passage.json"
        self.controller.project_model_call_passage(outcome.path, 1, projection)
        note = self.controller.open_file(self.files["questions.txt"])
        self.controller.set_position(
            note.state.id, cursor="1.15", selection=["1.0", "1.15"],
            yscroll=0, xscroll=0, pane=0,
        )
        self.controller.add_context_selection(
            note.state.id, "1.0", "1.15", pane=0
        )
        self.controller.mark(note.state.id, "1.0", "1.0")

        record_paths = (parent_outcome.path, outcome.path, projection)
        record_hashes = {
            path: sha256(path.read_bytes()).hexdigest() for path in record_paths
        }
        note_disk_before = self.files["questions.txt"].read_bytes()
        note_memory_before = note.content
        before = json.loads(encode_workspace(self.controller.current()))
        ended = deepcopy(self.controller.current().investigation)

        self.assertEqual(self.controller.end_investigation(), ended)
        self.assertIsNone(self.controller.current().investigation)
        after = json.loads(encode_workspace(self.controller.current()))
        self.assertEqual(
            {key: value for key, value in before.items() if key != "investigation"},
            {key: value for key, value in after.items() if key != "investigation"},
        )
        self.assertEqual(after["investigation"], None)
        self.assertEqual(self.controller.buffer(note.state.id).content, note_memory_before)
        self.assertEqual(self.files["questions.txt"].read_bytes(), note_disk_before)
        self.assertEqual(
            {path: sha256(path.read_bytes()).hexdigest() for path in record_paths},
            record_hashes,
        )

        transport = self.controller.assistance_transport
        clock = self.controller.assistance_clock
        id_generator = self.controller.assistance_id_generator
        self.controller.close_project(keep_recovery=True)
        self.controller = Workstation(
            state_root=self.home / "state",
            assistance_transport=transport,
            assistance_clock=clock,
            assistance_id_generator=id_generator,
        )
        self.controller.open_project(self.root)
        self.assertIsNone(self.controller.current().investigation)
        self.assertEqual(len(self.controller.current().selection_shelf), 1)
        self.assertIsNotNone(self.controller.current().marker)

        self.responses.extend([
            provider_response(
                "resp-second-parent",
                "Unused second route.\n\nUseful second parent route.\n",
            ),
            provider_response(
                "resp-second-child",
                "A second bounded investigation completed.\n",
            ),
        ])
        second_parent, _ = self.make_parent(name="second-parent")
        second_prepared, _ = self.prepare_child(
            second_parent, name="second-child"
        )
        second_outcome = self.send(second_prepared)
        self.controller.retain_investigation(second_prepared, second_outcome)
        self.assertIsNotNone(self.controller.current().investigation)
        self.assertEqual(
            self.controller.current().investigation.parent_id,
            second_parent.call.id,
        )
        self.assertEqual(
            {path: sha256(path.read_bytes()).hexdigest() for path in record_paths},
            record_hashes,
        )

    def test_end_persistence_failure_keeps_original_investigation_active(self):
        parent, parent_outcome = self.make_parent()
        prepared, note = self.prepare_child(parent)
        outcome = self.send(prepared)
        self.controller.retain_investigation(prepared, outcome)
        original = deepcopy(self.controller.current().investigation)
        manifest_before = self.controller.store.path.read_bytes()
        parent_hash = sha256(parent_outcome.path.read_bytes()).hexdigest()
        child_hash = sha256(outcome.path.read_bytes()).hexdigest()
        note_before = note.content

        with patch.object(self.controller, "checkpoint", return_value=True), patch.object(
            self.controller.store, "save", side_effect=OSError("end denied")
        ), self.assertRaisesRegex(WorkspaceError, "Investigation checkpoint failed"):
            self.controller.end_investigation()

        self.assertEqual(self.controller.current().investigation, original)
        self.assertEqual(self.controller.store.path.read_bytes(), manifest_before)
        self.assertEqual(sha256(parent_outcome.path.read_bytes()).hexdigest(), parent_hash)
        self.assertEqual(sha256(outcome.path.read_bytes()).hexdigest(), child_hash)
        self.assertEqual(note.content, note_before)

        self.controller.close_project(discard_session=True)
        self.controller = Workstation(state_root=self.home / "state")
        self.controller.open_project(self.root)
        self.assertEqual(self.controller.current().investigation, original)

    def test_end_initial_checkpoint_failure_keeps_original_investigation_active(self):
        parent, _parent_outcome = self.make_parent()
        prepared, note = self.prepare_child(parent)
        outcome = self.send(prepared)
        self.controller.retain_investigation(prepared, outcome)
        original = deepcopy(self.controller.current().investigation)
        manifest_before = self.controller.store.path.read_bytes()
        note_before = note.content
        self.controller.persistence_error = "deterministic recovery denial"

        with patch.object(
            self.controller, "checkpoint", return_value=False
        ), self.assertRaisesRegex(WorkspaceError, "deterministic recovery denial"):
            self.controller.end_investigation()

        self.assertEqual(self.controller.current().investigation, original)
        self.assertEqual(self.controller.store.path.read_bytes(), manifest_before)
        self.assertEqual(note.content, note_before)

    def test_end_post_replacement_sync_failure_keeps_live_pointer_without_rollback(self):
        from theorem_terminal.mutable_files import sync_directory

        parent, parent_outcome = self.make_parent()
        prepared, _note = self.prepare_child(parent)
        outcome = self.send(prepared)
        self.controller.retain_investigation(prepared, outcome)
        original = deepcopy(self.controller.current().investigation)
        previous = self.controller.store.previous
        parent_hash = sha256(parent_outcome.path.read_bytes()).hexdigest()
        child_hash = sha256(outcome.path.read_bytes()).hexdigest()

        def fail_after_null_replacement(directory):
            if (directory == self.controller.store.directory
                    and self.controller.store.path.exists()
                    and decode_workspace(
                        self.controller.store.path.read_bytes()
                    ).investigation is None):
                raise OSError("deterministic post-replacement directory sync denial")
            return sync_directory(directory)

        with patch(
            "theorem_terminal.mutable_files.sync_directory",
            side_effect=fail_after_null_replacement,
        ), patch(
            "theorem_terminal.mutable_files.os.replace", wraps=os.replace
        ) as replacement, self.assertRaisesRegex(
            WorkspaceError, "post-replacement directory sync denial"
        ):
            self.controller.end_investigation()

        self.assertEqual(replacement.call_count, 1)
        self.assertEqual(self.controller.current().investigation, original)
        self.assertEqual(self.controller.store.previous, previous)
        self.assertIsNone(
            decode_workspace(self.controller.store.path.read_bytes()).investigation
        )
        self.assertIn("close and reopen", self.controller.persistence_error)
        self.assertFalse(self.controller.checkpoint())
        self.assertEqual(sha256(parent_outcome.path.read_bytes()).hexdigest(), parent_hash)
        self.assertEqual(sha256(outcome.path.read_bytes()).hexdigest(), child_hash)

        self.controller.close_project(discard_session=True)
        self.controller = Workstation(state_root=self.home / "state")
        self.controller.open_project(self.root)
        self.assertIsNone(self.controller.current().investigation)

    def test_failed_child_is_retained_once_and_prior_work_is_unchanged(self):
        parent, parent_outcome = self.make_parent()
        parent_before = parent_outcome.path.read_bytes()
        prepared, note = self.prepare_child(parent, name="failed-child")
        note_before = note.content
        self.responses[0] = RuntimeError("deterministic child transport failure")
        outcome = self.send(prepared)
        self.assertEqual(len(self.calls), 2)
        self.assertEqual(outcome.terminal.status, "failed")
        self.assertTrue(outcome.path.exists())
        self.controller.retain_investigation(prepared, outcome)
        self.assertIsNone(self.controller.current().investigation.child_response_digest)
        self.assertEqual(parent_outcome.path.read_bytes(), parent_before)
        self.assertEqual(note.content, note_before)
        restored = self.controller.restore_investigation()
        self.assertEqual(restored.child.status, "failed")
        self.assertIsNone(restored.error)
        child_hash = sha256(outcome.path.read_bytes()).hexdigest()
        self.controller.end_investigation()
        self.assertIsNone(self.controller.current().investigation)
        self.assertEqual(sha256(outcome.path.read_bytes()).hexdigest(), child_hash)

    def assert_noncompleted_child_is_retained(self, expected, response):
        parent, parent_outcome = self.make_parent()
        parent_before = parent_outcome.path.read_bytes()
        self.responses = [response]
        prepared, note = self.prepare_child(parent, name=f"child-{expected}")
        note_before = note.content
        before_calls = len(self.calls)
        outcome = self.send(prepared)
        self.assertEqual(len(self.calls), before_calls + 1)
        self.assertEqual(outcome.terminal.status, expected)
        self.controller.retain_investigation(prepared, outcome)
        self.assertEqual(self.controller.restore_investigation().child.status,
                         expected)
        self.assertEqual(note.content, note_before)
        self.assertEqual(parent_outcome.path.read_bytes(), parent_before)
        child_hash = sha256(outcome.path.read_bytes()).hexdigest()
        self.controller.end_investigation()
        self.assertIsNone(self.controller.current().investigation)
        self.assertEqual(sha256(outcome.path.read_bytes()).hexdigest(), child_hash)

    def test_refused_child_is_retained_without_retry(self):
        self.assert_noncompleted_child_is_retained("refused", json.dumps({
            "id": "resp-child-refused",
            "object": "response",
            "status": "completed",
            "model": "local-r3-resolved",
            "output": [{
                "type": "message", "role": "assistant", "status": "completed",
                "content": [{"type": "refusal", "refusal": "No continuation."}],
            }],
        }).encode("utf-8"))

    def test_incomplete_child_is_retained_without_retry(self):
        self.assert_noncompleted_child_is_retained(
            "incomplete",
            provider_response("resp-child-incomplete", "", status="incomplete"),
        )


if __name__ == "__main__":
    unittest.main()
