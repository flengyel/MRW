from __future__ import annotations

from contextlib import redirect_stderr, redirect_stdout
from hashlib import sha256
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from theorem_terminal.cli import main
from theorem_terminal.model_projection import (
    MAX_MODEL_CALL_BYTES,
    parse_finalized_model_call,
)
from theorem_terminal.private_persistence import (
    PrivatePersistenceError,
    persist_private_new,
)
from theorem_terminal.response_review import (
    INDEX_PAGE_SIZE,
    PREVIEW_SCALARS,
    passages,
    render_response_review,
    safe_terminal_text,
)


def call_document(response: str) -> dict[str, object]:
    return {
        "schema": "theorem-terminal.model-call",
        "schema_version": 1,
        "id": "call\\id\u001b",
        "initiated_by": "person",
        "target": {"kind": "WorkArtifact", "id": "artifact"},
        "purpose": "strategic_hint",
        "request_text": "request\ntext\\value",
        "context_refs": [],
        "effective_input": {"input": "question"},
        "provider": "provider\u0085",
        "requested_model": "requested",
        "resolved_model": "resolved\u202E",
        "adapter_version": "fixture",
        "limits": {},
        "settings": {"store": False},
        "in_reply_to": None,
        "requested_at": "2026-09-01T00:00:00Z",
        "completed_at": "2026-09-01T00:00:01Z",
        "finalized_at": "2026-09-01T00:00:02Z",
        "status": "completed",
        "response_id": "response",
        "raw_response": response,
        "raw_response_digest": sha256(response.encode()).hexdigest(),
    }


def encoded_call(response: str) -> bytes:
    return (json.dumps(call_document(response), ensure_ascii=False, separators=(",", ":")) + "\n").encode()


class PassageGrammarTests(unittest.TestCase):
    def spans(self, response: str) -> list[tuple[int, int, str]]:
        raw = response.encode()
        return [
            (item.start_byte, item.end_byte, raw[item.start_byte:item.end_byte].decode())
            for item in passages(response)
        ]

    def test_exact_lf_crlf_lone_cr_blank_and_terminator_rules(self) -> None:
        response = " \t\nfirst\r\nsecond\rline\n\t\r\nthird\n  \n"
        self.assertEqual(
            self.spans(response),
            [
                (3, 22, "first\r\nsecond\rline\n"),
                (25, 31, "third\n"),
            ],
        )

    def test_unicode_whitespace_is_content_and_blank_only_has_zero(self) -> None:
        self.assertEqual(len(passages("\u00a0\n\n\u2003")), 2)
        self.assertEqual(passages(""), ())
        self.assertEqual(passages(" \t\n\t\r\n  "), ())

    def test_repeated_multibyte_passages_have_distinct_exact_offsets(self) -> None:
        response = "α → β\n\nα → β\n"
        indexed = passages(response)
        self.assertEqual([item.number for item in indexed], [1, 2])
        self.assertEqual(self.spans(response), [(0, 10, "α → β\n"), (11, 21, "α → β\n")])

    def test_no_separator_is_one_passage_and_final_unterminated_line_is_owned(self) -> None:
        self.assertEqual(self.spans("one\ntwo"), [(0, 7, "one\ntwo")])


class SafeReviewTests(unittest.TestCase):
    def call(self, response: str):
        return parse_finalized_model_call(encoded_call(response))

    def test_exact_safe_renderer(self) -> None:
        source = "\\\0\t\n\r\x1b\x1f\x7f\x80\x9f\u061c\u200e\u200f\u202a\u202e\u2066\u2069α"
        expected = "\\\\\\u{0000}\\u{0009}\\u{000A}\\u{000D}\\u{001B}\\u{001F}\\u{007F}\\u{0080}\\u{009F}\\u{061C}\\u{200E}\\u{200F}\\u{202A}\\u{202E}\\u{2066}\\u{2069}α"
        rendered = safe_terminal_text(source)
        self.assertEqual(rendered, expected)
        self.assertNotIn("\x1b", rendered)
        self.assertNotIn("\x9d", rendered)

    def test_every_record_metadata_and_response_string_is_safely_rendered(self) -> None:
        rendered = render_response_review(self.call("body\n\u001b]8;;https://bad\a"), full=True)
        self.assertIn("Call: call\\\\id\\u{001B}", rendered)
        self.assertIn("Provider: provider\\u{0085}", rendered)
        self.assertIn("Model: resolved\\u{202E}", rendered)
        self.assertIn("Request: request\\u{000A}text\\\\value", rendered)
        self.assertIn("body\\u{000A}\\u{001B}]8;;https://bad\\u{0007}", rendered)
        self.assertNotIn("\x1b", rendered)

    def test_pagination_preview_bound_and_determinism(self) -> None:
        response = "\n\n".join(
            ("x" * (PREVIEW_SCALARS + 1) if number == 1 else f"passage {number}")
            for number in range(1, 26)
        )
        call = self.call(response)
        first = render_response_review(call)
        self.assertEqual(first, render_response_review(call))
        self.assertEqual(first.count(" UTF-8 bytes | "), INDEX_PAGE_SIZE)
        self.assertIn("[preview truncated]", first)
        self.assertNotIn("Passage 21 |", first)
        second = render_response_review(call, index_start=21)
        self.assertEqual(second.count(" UTF-8 bytes | "), 5)
        self.assertIn("Passage 25 |", second)

    def test_empty_blank_and_selector_ranges(self) -> None:
        empty = self.call("")
        self.assertIn("Passages: 0", render_response_review(empty))
        self.assertIn("Full response:", render_response_review(empty, full=True))
        for number in (0, -1, 1):
            with self.subTest(number=number), self.assertRaises(ValueError):
                render_response_review(empty, passage_number=number)
        with self.assertRaises(ValueError):
            render_response_review(self.call("one"), index_start=2)

    def test_four_mib_call_boundary_and_one_mib_response(self) -> None:
        response = "x" * (1024 * 1024)
        call = self.call(response)
        self.assertEqual(passages(call.raw_response)[0].end_byte, 1024 * 1024)
        raw = encoded_call("x")
        exact = raw + b" " * (MAX_MODEL_CALL_BYTES - len(raw))
        parse_finalized_model_call(exact)
        with self.assertRaisesRegex(ValueError, "exceeds"):
            parse_finalized_model_call(exact + b" ")


class ReviewCliTests(unittest.TestCase):
    def run_main(self, argv: list[str]) -> tuple[int, str, str]:
        stdout, stderr = io.StringIO(), io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            result = main(argv)
        return result, stdout.getvalue(), stderr.getvalue()

    def test_review_is_local_read_only_and_selectors_are_exclusive(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            source = parent / "call.json"
            source.write_bytes(encoded_call("one\n\ntwo\n"))
            before = set(parent.iterdir())
            with patch("theorem_terminal.openai_response.http_transport", side_effect=AssertionError("network")), \
                 patch("subprocess.run", side_effect=AssertionError("subprocess")):
                code, output, error = self.run_main(["review-response", str(source), "--passage", "2"])
            self.assertEqual((code, error), (0, ""))
            self.assertIn("Passage 2", output)
            self.assertEqual(set(parent.iterdir()), before)

            for args in (
                ["--passage", "0"], ["--passage", "3"], ["--index-start", "0"]
            ):
                code, _, error = self.run_main(["review-response", str(source), *args])
                self.assertEqual(code, 2)
                self.assertTrue(error.startswith("error: "))
                self.assertEqual(set(parent.iterdir()), before)

            with redirect_stderr(io.StringIO()), self.assertRaises(SystemExit):
                main(["review-response", str(source), "--full", "--passage", "1"])

    def test_review_rejects_digest_mismatch_and_noncompleted_call_without_artifacts(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            for name, mutation in (
                ("digest", lambda document: document.update(raw_response_digest="0" * 64)),
                ("status", lambda document: document.update(status="incomplete", raw_response=None, raw_response_digest=None)),
            ):
                with self.subTest(name=name):
                    document = call_document("one")
                    mutation(document)
                    source = parent / f"{name}.json"
                    source.write_bytes((json.dumps(document, separators=(",", ":")) + "\n").encode())
                    before = set(parent.iterdir())
                    code, output, error = self.run_main(["review-response", str(source)])
                    self.assertEqual(code, 2)
                    self.assertEqual(output, "")
                    self.assertTrue(error.startswith("error: "))
                    self.assertEqual(set(parent.iterdir()), before)

    def test_passage_projection_equals_byte_mode_and_maps_every_purpose(self) -> None:
        mapping = {
            "definition_explanation": "informal_explanation",
            "result_explanation": "informal_explanation",
            "source_suggestion": "informal_explanation",
            "critique": "informal_explanation",
            "strategic_hint": "strategic_hint",
            "intermediate_lemma": "statement",
            "proof_outline": "proof_outline",
            "worked_solution": "proposed_solution",
            "computation": "calculation",
        }
        for purpose, kind in mapping.items():
            with self.subTest(purpose=purpose), tempfile.TemporaryDirectory() as temporary:
                parent = Path(temporary)
                document = call_document("α\n\nselected β\n")
                document["purpose"] = purpose
                source = parent / "call.json"
                source.write_bytes((json.dumps(document, ensure_ascii=False, separators=(",", ":")) + "\n").encode())
                passage_output = parent / "passage.json"
                byte_output = parent / "byte.json"
                common = ["--representation-id", "representation", "--claim-id", "claim"]
                self.assertEqual(main(["project-response", str(source), "--passage", "2", *common, "--output", str(passage_output)]), 0)
                selected = passages(str(document["raw_response"]))[1]
                self.assertEqual(main([
                    "project-response", str(source), "--start-byte", str(selected.start_byte),
                    "--end-byte", str(selected.end_byte), "--kind", kind, *common,
                    "--output", str(byte_output),
                ]), 0)
                self.assertEqual(passage_output.read_bytes(), byte_output.read_bytes())
                self.assertEqual(passage_output.stat().st_mode & 0o777, 0o600)

    def test_project_selector_errors_create_no_artifact(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            source = parent / "call.json"
            source.write_bytes(encoded_call("one"))
            base = ["project-response", str(source), "--representation-id", "r", "--claim-id", "c", "--output"]
            cases = (
                (["--passage", "1", "--kind", "strategic_hint"], "passage-kind.json"),
                (["--passage", "1", "--start-byte", "0"], "mixed.json"),
                (["--start-byte", "0", "--kind", "strategic_hint"], "missing-end.json"),
            )
            for arguments, name in cases:
                output = parent / name
                code, _, _ = self.run_main([*base, str(output), *arguments])
                self.assertEqual(code, 2)
                self.assertFalse(output.exists())


class PrivatePersistenceTests(unittest.TestCase):
    def test_mode_no_overwrite_dangling_symlink_and_concurrent_destination(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            destination = parent / "record.json"
            persist_private_new(destination, b"exact")
            self.assertEqual(destination.read_bytes(), b"exact")
            self.assertEqual(destination.stat().st_mode & 0o777, 0o600)
            with self.assertRaisesRegex(PrivatePersistenceError, "File exists"):
                persist_private_new(destination, b"replacement")
            self.assertEqual(destination.read_bytes(), b"exact")

            dangling = parent / "dangling.json"
            dangling.symlink_to(parent / "missing")
            with self.assertRaisesRegex(PrivatePersistenceError, "symlink"):
                persist_private_new(dangling, b"no")

            raced = parent / "raced.json"
            real_link = os.link
            def link(source, target):
                Path(target).write_bytes(b"concurrent")
                return real_link(source, target)
            with patch("theorem_terminal.private_persistence.os.link", side_effect=link):
                with self.assertRaisesRegex(PrivatePersistenceError, "File exists"):
                    persist_private_new(raced, b"ours")
            self.assertEqual(raced.read_bytes(), b"concurrent")
            self.assertEqual(list(parent.glob(".*.tmp")), [])

    def test_prelink_failures_cleanup_and_postlink_sync_retains_destination(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            for operation in ("fchmod", "fdopen", "fsync", "link"):
                destination = parent / f"{operation}.json"
                target = f"theorem_terminal.private_persistence.os.{operation}"
                with self.subTest(operation=operation), patch(target, side_effect=OSError("failed")):
                    with self.assertRaises(OSError):
                        persist_private_new(destination, b"complete")
                self.assertFalse(destination.exists())
                self.assertEqual(list(parent.glob(".*.tmp")), [])

            destination = parent / "durability.json"
            with patch(
                "theorem_terminal.private_persistence.os.fsync",
                side_effect=(None, OSError("directory sync failed")),
            ):
                with self.assertRaisesRegex(PrivatePersistenceError, "published.*durability"):
                    persist_private_new(destination, b"complete")
            self.assertEqual(destination.read_bytes(), b"complete")
            self.assertEqual(list(parent.glob(".*.tmp")), [])


if __name__ == "__main__":
    unittest.main()
