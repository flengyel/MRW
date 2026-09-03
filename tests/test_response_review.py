from __future__ import annotations

from contextlib import redirect_stderr, redirect_stdout
from hashlib import sha256
import io
import json
import os
from pathlib import Path
import stat
import tempfile
import tracemalloc
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
from theorem_terminal import private_persistence as persistence_module
from theorem_terminal.response_review import (
    INDEX_PAGE_SIZE,
    PREVIEW_SCALARS,
    METADATA_PREVIEW_SCALARS,
    MAX_INDEX_OUTPUT_CHARACTERS,
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
        source = "\\\0\t\n\r\x1b\x1f\x7f\x80\x9f\ud800\udfff\u061c\u200e\u200f\u202a\u202e\u2066\u2069α"
        expected = "\\\\\\u{0000}\\u{0009}\\u{000A}\\u{000D}\\u{001B}\\u{001F}\\u{007F}\\u{0080}\\u{009F}\\u{D800}\\u{DFFF}\\u{061C}\\u{200E}\\u{200F}\\u{202A}\\u{202E}\\u{2066}\\u{2069}α"
        rendered = safe_terminal_text(source)
        self.assertEqual(rendered, expected)
        self.assertNotIn("\x1b", rendered)
        self.assertNotIn("\x9d", rendered)

    def test_every_record_metadata_and_response_string_is_safely_rendered(self) -> None:
        rendered = render_response_review(self.call("body\n\u001b]8;;https://bad\a"), full=True)
        self.assertIn("Call [scalars=8, shown=8, truncated=no]: call\\\\id\\u{001B}", rendered)
        self.assertIn("Provider [scalars=9, shown=9, truncated=no]: provider\\u{0085}", rendered)
        self.assertIn("Model [scalars=9, shown=9, truncated=no]: resolved\\u{202E}", rendered)
        self.assertIn("Request [scalars=18, shown=18, truncated=no]: request\\u{000A}text\\\\value", rendered)
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
        self.assertEqual(first.count("[bytes="), INDEX_PAGE_SIZE)
        self.assertIn("truncated=yes", first)
        self.assertNotIn("Passage 21 [", first)
        second = render_response_review(call, index_start=21)
        self.assertEqual(second.count("[bytes="), 5)
        self.assertIn("Passage 25 [", second)

    def test_bounded_metadata_and_unambiguous_trusted_prefix(self) -> None:
        first = "x|[preview truncated]" + ("\x1b" * 121)
        response = "\n\n".join([first] + [("\x1b" * 121)] * 19) + "\n"
        document = call_document(response)
        document["id"] = "I" * 500_000
        document["provider"] = "P" * 500_000
        document["resolved_model"] = "M" * 500_000
        document["request_text"] = "R" * 500_000
        raw = (json.dumps(document, separators=(",", ":")) + "\n").encode()
        rendered = render_response_review(parse_finalized_model_call(raw))
        self.assertLessEqual(len(rendered), MAX_INDEX_OUTPUT_CHARACTERS)
        self.assertIn(
            f"Call [scalars=500000, shown={METADATA_PREVIEW_SCALARS}, truncated=yes]:",
            rendered,
        )
        row = next(line for line in rendered.splitlines() if line.startswith("Passage 1 "))
        self.assertTrue(
            row.startswith("Passage 1 [bytes=143, preview-scalars=120, truncated=yes]: ")
        )
        self.assertIn("x|[preview truncated]", row)

    def test_fragmented_near_boundary_response_has_bounded_retained_state(self) -> None:
        response = "x\n\n" * 300_000
        call = self.call(response)
        tracemalloc.start()
        try:
            rendered = render_response_review(call)
            _, peak = tracemalloc.get_traced_memory()
        finally:
            tracemalloc.stop()
        self.assertEqual(rendered.count("[bytes="), INDEX_PAGE_SIZE)
        self.assertLess(peak, 8 * 1024 * 1024)

    def test_programmatic_selector_exclusivity(self) -> None:
        call = self.call("one")
        for keywords in (
            {"index_start": 1, "passage_number": 1},
            {"index_start": 1, "full": True},
            {"passage_number": 1, "full": True},
        ):
            with self.subTest(keywords=keywords), self.assertRaisesRegex(
                ValueError, "mutually exclusive"
            ):
                render_response_review(call, **keywords)

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

    def test_rejected_records_cannot_emit_unbounded_terminal_controls(self) -> None:
        malicious = "\\u001b]8;;bad\\u0007\\r\\n\\u0085\\u007f\\\\\\u202e"
        huge = malicious + ("K" * 2_000_000)
        records = (
            b'{"' + huge.encode() + b'":0,"' + huge.encode() + b'":1}',
            (json.dumps({**call_document("one"), huge: "value"}) + "\n").encode(),
            (
                json.dumps(
                    {
                        **call_document("one"),
                        "target": {"kind": "WorkArtifact", "id": "a", huge: "value"},
                    }
                )
                + "\n"
            ).encode(),
        )
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            for index, raw in enumerate(records):
                source = parent / f"bad-{index}.json"
                source.write_bytes(raw)
                for command in ("review-response", "project-response"):
                    arguments = [command, str(source)]
                    if command == "project-response":
                        arguments += [
                            "--passage", "1", "--representation-id", "r",
                            "--claim-id", "c", "--output", str(parent / "out.json"),
                        ]
                    code, output, error = self.run_main(arguments)
                    self.assertEqual(code, 2)
                    self.assertEqual(output, "")
                    self.assertLess(len(error), 2200)
                    self.assertNotIn("\x1b", error)
                    self.assertNotIn("\r", error)
                    self.assertNotIn("\x85", error)
                    self.assertNotIn("\x7f", error)
                    self.assertNotIn("\u202e", error)
                    self.assertFalse((parent / "out.json").exists())

    def test_surrogate_json_keys_are_safe_on_strict_utf8_streams(self) -> None:
        duplicate = b'{"\\ud800":0,"\\ud800":1}'
        document = call_document("one")
        document["\ud800"] = "unexpected"
        unexpected = (json.dumps(document, ensure_ascii=True) + "\n").encode("ascii")
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            for record_name, raw in (("duplicate", duplicate), ("unexpected", unexpected)):
                source = parent / f"{record_name}.json"
                source.write_bytes(raw)
                for command in ("review-response", "project-response"):
                    stdout_bytes = io.BytesIO()
                    stderr_bytes = io.BytesIO()
                    stdout = io.TextIOWrapper(stdout_bytes, encoding="utf-8", errors="strict")
                    stderr = io.TextIOWrapper(stderr_bytes, encoding="utf-8", errors="strict")
                    arguments = [command, str(source)]
                    if command == "project-response":
                        arguments += [
                            "--passage", "1", "--representation-id", "r",
                            "--claim-id", "c", "--output", str(parent / "out.json"),
                        ]
                    with patch("sys.stdout", stdout), patch("sys.stderr", stderr):
                        code = main(arguments)
                    stdout.flush()
                    stderr.flush()
                    self.assertEqual(code, 2)
                    self.assertEqual(stdout_bytes.getvalue(), b"")
                    self.assertIn(b"\\u{D800}", stderr_bytes.getvalue())
                    self.assertFalse((parent / "out.json").exists())

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
            def link(source, target, **kwargs):
                descriptor = os.open(
                    target,
                    os.O_WRONLY | os.O_CREAT | os.O_EXCL,
                    0o600,
                    dir_fd=kwargs["dst_dir_fd"],
                )
                os.write(descriptor, b"concurrent")
                os.close(descriptor)
                return real_link(source, target, **kwargs)
            with patch("theorem_terminal.private_persistence.os.link", side_effect=link):
                with self.assertRaisesRegex(PrivatePersistenceError, "File exists"):
                    persist_private_new(raced, b"ours")
            self.assertEqual(raced.read_bytes(), b"concurrent")
            self.assertEqual(list(parent.glob(".*.tmp")), [])

    def test_prelink_failures_cleanup_and_postlink_sync_retains_destination(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            for operation in ("fchmod", "write", "fsync", "link"):
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

    def test_source_substitution_and_parent_identity_change_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            destination = parent / "record.json"
            real_stat = os.stat
            substituted = False

            def replacing_stat(path, *args, **kwargs):
                nonlocal substituted
                if (
                    isinstance(path, str)
                    and path.endswith(".tmp")
                    and kwargs.get("dir_fd") is not None
                    and not substituted
                ):
                    substituted = True
                    os.unlink(path, dir_fd=kwargs["dir_fd"])
                    descriptor = os.open(
                        path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600,
                        dir_fd=kwargs["dir_fd"],
                    )
                    os.write(descriptor, b"substituted")
                    os.close(descriptor)
                return real_stat(path, *args, **kwargs)

            with patch(
                "theorem_terminal.private_persistence.os.stat",
                side_effect=replacing_stat,
            ):
                with self.assertRaisesRegex(PrivatePersistenceError, "identity"):
                    persist_private_new(destination, b"complete")
            self.assertFalse(destination.exists())
            self.assertEqual(list(parent.glob(".*.tmp")), [])

    def test_substitution_inside_link_hook_never_publishes_substitute(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            destination = parent / "record.json"
            real_link = os.link

            def substitute_then_link(source, target, **kwargs):
                source_fd = kwargs["src_dir_fd"]
                os.unlink(source, dir_fd=source_fd)
                descriptor = os.open(
                    source, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600,
                    dir_fd=source_fd,
                )
                os.write(descriptor, b"substituted")
                os.close(descriptor)
                return real_link(source, target, **kwargs)

            with patch(
                "theorem_terminal.private_persistence.os.link",
                side_effect=substitute_then_link,
            ):
                with self.assertRaisesRegex(PrivatePersistenceError, "identity"):
                    persist_private_new(destination, b"original")
            self.assertFalse(destination.exists())
            self.assertEqual(list(parent.glob(".*.tmp")), [])

            with patch.object(
                persistence_module, "_parent_matches", side_effect=(True, False)
            ):
                with self.assertRaisesRegex(PrivatePersistenceError, "parent.*identity"):
                    persist_private_new(destination, b"complete")
            self.assertFalse(destination.exists())
            self.assertEqual(list(parent.glob(".*.tmp")), [])

    def test_cleanup_faults_do_not_skip_remaining_cleanup(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            destination = parent / "record.json"
            real_unlink = os.unlink
            calls = 0

            def transient_unlink(*args, **kwargs):
                nonlocal calls
                calls += 1
                if calls == 1:
                    raise OSError("transient unlink failure")
                return real_unlink(*args, **kwargs)

            with patch(
                "theorem_terminal.private_persistence.os.unlink",
                side_effect=transient_unlink,
            ):
                persist_private_new(destination, b"complete")
            self.assertEqual(destination.read_bytes(), b"complete")
            self.assertEqual(list(parent.glob(".*.tmp")), [])

            destination.unlink()
            real_close = os.close
            close_attempts = {}
            reused_descriptor = None

            def close_then_report(descriptor):
                nonlocal reused_descriptor
                close_attempts[descriptor] = close_attempts.get(descriptor, 0) + 1
                metadata = os.fstat(descriptor)
                if stat.S_ISREG(metadata.st_mode):
                    real_close(descriptor)
                    reused_descriptor = os.open("/dev/null", os.O_RDONLY)
                    self.assertEqual(reused_descriptor, descriptor)
                    raise OSError("descriptor close reported failure")
                return real_close(descriptor)

            with patch(
                "theorem_terminal.private_persistence.os.close",
                side_effect=close_then_report,
            ):
                with self.assertRaisesRegex(PrivatePersistenceError, "cleanup failed"):
                    persist_private_new(destination, b"complete")
            self.assertEqual(destination.read_bytes(), b"complete")
            self.assertEqual(list(parent.glob(".*.tmp")), [])
            assert reused_descriptor is not None
            self.assertEqual(close_attempts[reused_descriptor], 1)
            os.fstat(reused_descriptor)
            os.close(reused_descriptor)


if __name__ == "__main__":
    unittest.main()
