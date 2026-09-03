from __future__ import annotations

import json
import io
from hashlib import sha256
import os
from pathlib import Path
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from theorem_terminal.cli import main
from theorem_terminal.model_projection import parse_finalized_model_call
from theorem_terminal.documentary_warrant import encode_documentary_projection
from theorem_terminal.model_projection import (
    extract_lossless_representation,
    make_model_produced_claim,
)
from theorem_terminal.openai_response import (
    OpenAIResponseError,
    RESPONSES_URL,
    TransportResult,
    classify_response,
    http_transport,
    install_atomic_no_overwrite,
    parse_prepared_request,
    prepare_operation,
    render_preview,
    request_assistance,
)
import theorem_terminal.openai_response as openai_response_module


def request_spec() -> dict[str, object]:
    return {
        "initiated_by": "person-test",
        "target": {"kind": "WorkArtifact", "id": "attempt-test-v1"},
        "purpose": "strategic_hint",
        "request_text": "Suggest one next step; do not solve the problem.",
        "context_refs": [
            {"kind": "WorkArtifact", "id": "attempt-test-v1", "revision": "abc"}
        ],
        "effective_input": {
            "instructions": "Return one strategic hint only.",
            "input": [{
                "role": "user",
                "content": [{"type": "input_text", "text": "Exact α-context.\n"}],
            }],
        },
        "limits": {
            "max_request_body_bytes": 4096,
            "max_provider_response_bytes": 4096,
            "max_output_tokens": 200,
            "timeout_seconds": 30,
        },
        "in_reply_to": None,
    }


def encoded_spec() -> bytes:
    return json.dumps(request_spec(), ensure_ascii=False).encode()


def provider_response(text: str = "Try the minimal case.\n") -> bytes:
    return json.dumps({
        "id": "resp_test",
        "object": "response",
        "created_at": 10,
        "completed_at": 11,
        "status": "completed",
        "model": "configured-model-2026-01-01",
        "output": [{
            "type": "message", "role": "assistant", "status": "completed",
            "content": [{"type": "output_text", "text": text, "annotations": []}],
        }],
    }).encode()


class OpenAIResponseTests(unittest.TestCase):
    def setUp(self) -> None:
        self.spec = parse_prepared_request(encoded_spec())

    def run_success(self, destination: Path):
        seen = []
        previews = []

        def transport(method, endpoint, body, headers, timeout, response_limit):
            seen.append((method, endpoint, body, dict(headers), timeout, response_limit))
            return TransportResult(200, provider_response("  α → β\n\n"))

        times = iter(
            (
                "2026-09-03T12:00:00Z",
                "2026-09-03T12:00:01Z",
                "2026-09-03T12:00:02Z",
            )
        )
        raw = request_assistance(
            self.spec,
            "configured-model",
            destination,
            "secret-test-key",
            confirmation=lambda _preview: "SEND",
            preview=previews.append,
            transport=transport,
            clock=lambda: next(times),
            id_generator=lambda: "model-call-test-v1",
        )
        return raw, seen, previews

    def test_exact_preview_transport_and_completed_model_call(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "call.json"
            raw, seen, previews = self.run_success(destination)
            self.assertEqual(raw, destination.read_bytes())
            self.assertEqual(len(seen), 1)
            method, endpoint, body, headers, timeout, response_limit = seen[0]
            self.assertEqual((method, endpoint), ("POST", RESPONSES_URL))
            self.assertEqual(timeout, 30)
            self.assertEqual(response_limit, 4096)
            self.assertEqual(headers["Content-Type"], "application/json")
            self.assertEqual(headers["Authorization"], "Bearer secret-test-key")
            operation = prepare_operation(self.spec, "configured-model", destination)
            self.assertEqual(body, operation.body)
            self.assertIn(operation.body.decode().rstrip("\n"), previews[0])
            outbound = json.loads(body)
            self.assertEqual(
                set(outbound),
                {"model", "instructions", "input", "max_output_tokens", "store"},
            )
            self.assertIs(outbound["store"], False)
            for forbidden in (
                "tools", "stream", "background", "previous_response_id",
                "conversation", "prompt",
            ):
                self.assertNotIn(forbidden, outbound)
            call = parse_finalized_model_call(raw)
            self.assertEqual(call.id, "model-call-test-v1")
            self.assertEqual(call.raw_response, "  α → β\n\n")
            self.assertEqual(
                call.raw_response_digest,
                sha256("  α → β\n\n".encode()).hexdigest(),
            )
            self.assertEqual(call.document["requested_model"], "configured-model")
            self.assertEqual(
                call.document["resolved_model"], "configured-model-2026-01-01"
            )
            self.assertEqual(call.document["requested_at"], "2026-09-03T12:00:00Z")
            self.assertEqual(call.document["completed_at"], "2026-09-03T12:00:01Z")
            self.assertEqual(call.document["finalized_at"], "2026-09-03T12:00:02Z")
            self.assertEqual(call.document["provider"], "openai")
            self.assertEqual(call.document["adapter_version"], "openai-responses-v1")
            self.assertEqual(call.document["initiated_by"], "person-test")
            self.assertEqual(call.document["target"], self.spec["target"])
            self.assertEqual(call.document["purpose"], "strategic_hint")
            self.assertEqual(call.document["request_text"], self.spec["request_text"])
            self.assertEqual(call.document["context_refs"], tuple(self.spec["context_refs"]))
            self.assertEqual(call.document["settings"], {"store": False})
            self.assertEqual(call.document["limits"]["max_output_tokens"], 200)
            self.assertEqual(call.document["limits"]["timeout_seconds"], 30)
            self.assertEqual(call.document["response_id"], "resp_test")
            self.assertNotIn("secret-test-key", previews[0])
            self.assertNotIn("secret-test-key", raw.decode())

    def test_literal_outbound_bytes_and_preview_are_independent_oracles(self) -> None:
        cases = (
            (
                "plain",
                {"input": "Exact string input."},
                b'{"input":"Exact string input.","max_output_tokens":200,"model":"configured-model","store":false}\n',
            ),
            (
                "messages",
                self.spec["effective_input"],
                b'{"input":[{"content":[{"text":"Exact \xce\xb1-context.\\n","type":"input_text"}],"role":"user"}],"instructions":"Return one strategic hint only.","max_output_tokens":200,"model":"configured-model","store":false}\n',
            ),
        )
        for name, effective, expected in cases:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as temporary:
                spec = request_spec()
                spec["effective_input"] = effective
                operation = prepare_operation(
                    parse_prepared_request(json.dumps(spec, ensure_ascii=False).encode()),
                    "configured-model",
                    Path(temporary) / "call.json",
                )
                self.assertEqual(operation.body, expected)
                expected_preview = "\n".join((
                    "OpenAI Responses API request preview", "Method: POST",
                    f"Endpoint: {RESPONSES_URL}", "Requested model: configured-model",
                    "Non-secret headers:", "  Content-Type: application/json",
                    "Complete UTF-8 JSON request body:", expected.decode().removesuffix("\n"),
                    "Selected context references:",
                    json.dumps(spec["context_refs"], ensure_ascii=False, sort_keys=True),
                    "Transmitted instructions and input:",
                    json.dumps(effective, ensure_ascii=False, sort_keys=True),
                    "Enforced limits:",
                    json.dumps(spec["limits"], ensure_ascii=False, sort_keys=True),
                    f"Output destination: {operation.output}",
                    "OpenAI data handling remains governed by its policies; store:false does not claim to disable every form of processing or retention.",
                    "Type SEND to transmit exactly the displayed request-body bytes: ",
                ))
                self.assertEqual(render_preview(operation), expected_preview)

    def test_caller_mutation_after_preview_cannot_change_operation(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            original = request_spec()
            calls = []
            def confirmation(_rendered):
                original["initiated_by"] = "mutated"
                original["limits"]["timeout_seconds"] = 299
                original["effective_input"]["input"][0]["content"][0]["text"] = "mutated"
                return "SEND"
            times = iter(("2026-09-03T12:00:00Z", "2026-09-03T12:00:01Z", "2026-09-03T12:00:02Z"))
            raw = request_assistance(
                original, "configured-model", Path(temporary) / "call.json", "secret",
                confirmation=confirmation, preview=lambda _: None,
                transport=lambda *args: (calls.append(args) or TransportResult(200, provider_response())),
                clock=lambda: next(times), id_generator=lambda: "immutable-call",
            )
            record = json.loads(raw)
            self.assertEqual(calls[0][4], 30)
            self.assertEqual(record["initiated_by"], "person-test")
            self.assertEqual(record["effective_input"]["input"][0]["content"][0]["text"], "Exact α-context.\n")

    def test_invalid_target_and_context_kinds_are_rejected(self) -> None:
        for location in ("target", "context"):
            changed = request_spec()
            if location == "target":
                changed["target"]["kind"] = "Session"
            else:
                changed["context_refs"][0]["kind"] = "ModelCall"
            with self.subTest(location=location), self.assertRaisesRegex(OpenAIResponseError, "kind"):
                parse_prepared_request(json.dumps(changed).encode())

    def test_reasoning_is_allowed_but_not_extracted(self) -> None:
        response = json.loads(provider_response())
        response["output"].insert(0, {"type": "reasoning", "summary": []})
        result = classify_response(json.dumps(response).encode())
        self.assertEqual(result.status, "completed")
        self.assertEqual(result.raw_response, "Try the minimal case.\n")

    def test_response_shapes_are_terminally_classified(self) -> None:
        cases = {}
        refusal = json.loads(provider_response())
        refusal["output"][0]["content"] = [{"type": "refusal", "refusal": "No."}]
        cases["refusal"] = (refusal, "refused")
        incomplete = json.loads(provider_response())
        incomplete["status"] = "incomplete"
        cases["provider incomplete"] = (incomplete, "incomplete")
        for name, mutate in (
            ("empty", lambda r: r["output"][0]["content"][0].update(text="")),
            ("multiple text", lambda r: r["output"][0]["content"].append({"type": "output_text", "text": "two"})),
            ("multiple message", lambda r: r["output"].append(r["output"][0].copy())),
            ("tool call", lambda r: r["output"].append({"type": "function_call"})),
            ("multipart", lambda r: r["output"][0]["content"].append({"type": "output_image"})),
            ("missing response id", lambda r: r.update(id="")),
            ("missing model id", lambda r: r.update(model="")),
        ):
            response = json.loads(provider_response())
            mutate(response)
            cases[name] = (response, "incomplete")
        for name, (response, expected) in cases.items():
            with self.subTest(name=name):
                self.assertEqual(
                    classify_response(json.dumps(response).encode()).status,
                    expected,
                )

    def test_redirect_is_terminal_and_provider_read_is_bounded(self) -> None:
        handler = openai_response_module._RejectRedirect()
        self.assertIsNone(
            handler.redirect_request(None, None, 302, "redirect", {}, "https://example.test")
        )
        class RedirectingOpener:
            def __init__(self):
                self.calls = 0

            def open(self, request, timeout):
                self.calls += 1
                raise HTTPError(request.full_url, 302, "redirect", {}, None)

        opener = RedirectingOpener()
        with patch("theorem_terminal.openai_response.build_opener", return_value=opener) as builder:
            with self.assertRaisesRegex(OpenAIResponseError, "HTTP 302"):
                http_transport(
                    "POST", RESPONSES_URL, b"{}", {"Authorization": "Bearer secret"},
                    30, 100,
                )
        self.assertIsInstance(builder.call_args.args[0], openai_response_module._RejectRedirect)
        self.assertEqual(opener.calls, 1)

        class LargeResponse:
            status = 200

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def read(self, amount):
                self.amount = amount
                return b"x" * amount

        response = LargeResponse()
        class LargeOpener:
            def open(self, request, timeout):
                return response
        with patch("theorem_terminal.openai_response.build_opener", return_value=LargeOpener()):
            with self.assertRaisesRegex(OpenAIResponseError, "exceeds"):
                http_transport("POST", RESPONSES_URL, b"{}", {}, 30, 100)
        self.assertEqual(response.amount, 101)

        class TruncatedResponse(LargeResponse):
            headers = {"Content-Length": "3"}
            def read(self, amount):
                return b"{}"
        truncated = TruncatedResponse()
        class TruncatedOpener:
            def open(self, request, timeout):
                return truncated
        with patch("theorem_terminal.openai_response.build_opener", return_value=TruncatedOpener()):
            with self.assertRaisesRegex(OpenAIResponseError, "truncated"):
                http_transport("POST", RESPONSES_URL, b"{}", {}, 30, 100)

    def test_decline_eof_missing_key_existing_output_make_zero_requests(self) -> None:
        for answer in ("NO", "", EOFError(), KeyboardInterrupt()):
            with self.subTest(answer=repr(answer)), tempfile.TemporaryDirectory() as temporary:
                calls = []
                confirmation = (
                    (lambda _preview, error=answer: (_ for _ in ()).throw(error))
                    if isinstance(answer, BaseException)
                    else (lambda _preview, value=answer: value)
                )
                result = request_assistance(
                    self.spec, "model", Path(temporary) / "call.json", "secret",
                    confirmation=confirmation, preview=lambda _text: None,
                    transport=lambda *args: calls.append(args),
                )
                self.assertIsNone(result)
                self.assertEqual(calls, [])

        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "call.json"
            with self.assertRaisesRegex(OpenAIResponseError, "OPENAI_API_KEY"):
                request_assistance(
                    self.spec, "model", destination, "",
                    confirmation=lambda _: "SEND", preview=lambda _: None,
                    transport=lambda *_: self.fail("transport called"),
                )
            destination.write_text("existing")
            with self.assertRaisesRegex(OpenAIResponseError, "already exists"):
                request_assistance(
                    self.spec, "model", destination, "secret",
                    confirmation=lambda _: "SEND", preview=lambda _: None,
                    transport=lambda *_: self.fail("transport called"),
                )

        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "dangling.json"
            destination.symlink_to(Path(temporary) / "absent")
            with self.assertRaisesRegex(OpenAIResponseError, "already exists"):
                request_assistance(
                    self.spec, "model", destination, "secret",
                    confirmation=lambda _: "SEND", preview=lambda _: None,
                    transport=lambda *_: self.fail("transport called"),
                )

    def test_provider_lone_surrogate_retains_failed_record(self) -> None:
        for field in ("id", "model", "text", "nested-key"):
            with self.subTest(field=field), tempfile.TemporaryDirectory() as temporary:
                response = json.loads(provider_response())
                if field == "text":
                    response["output"][0]["content"][0]["text"] = "\\ud800"
                elif field == "nested-key":
                    response["metadata"] = {"\\ud800": "value"}
                else:
                    response[field] = "\\ud800"
                raw_response = json.dumps(response).replace("\\\\ud800", "\\ud800").encode()
                destination = Path(temporary) / "call.json"
                times = iter(("2026-09-03T12:00:00Z", "2026-09-03T12:00:01Z", "2026-09-03T12:00:02Z"))
                calls = []
                with self.assertRaisesRegex(OpenAIResponseError, "failed ModelCall"):
                    request_assistance(
                        self.spec, "model", destination, "secret",
                        confirmation=lambda _: "SEND", preview=lambda _: None,
                        transport=lambda *args: (calls.append(args) or TransportResult(200, raw_response)),
                        clock=lambda: next(times), id_generator=lambda: "surrogate-failure",
                    )
                self.assertEqual(json.loads(destination.read_bytes())["status"], "failed")
                self.assertEqual(len(calls), 1)

    def test_clock_failure_after_transport_retains_ordered_failed_call(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "call.json"
            calls = []
            clock_calls = 0
            def clock():
                nonlocal clock_calls
                clock_calls += 1
                if clock_calls == 1:
                    return "2026-09-03T12:00:00Z"
                raise RuntimeError("clock failed")
            with self.assertRaisesRegex(OpenAIResponseError, "failed ModelCall"):
                request_assistance(
                    self.spec, "model", destination, "secret",
                    confirmation=lambda _: "SEND", preview=lambda _: None,
                    transport=lambda *args: (calls.append(args) or TransportResult(200, provider_response())),
                    clock=clock, id_generator=lambda: "clock-failed-call",
                )
            record = json.loads(destination.read_bytes())
            self.assertEqual(len(calls), 1)
            self.assertEqual(clock_calls, 2)
            self.assertEqual(record["status"], "failed")
            self.assertEqual(
                (record["requested_at"], record["completed_at"], record["finalized_at"]),
                ("2026-09-03T12:00:00Z",) * 3,
            )

    def test_output_reservation_allows_only_one_concurrent_transport(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            destination = parent / "call.json"
            entered = threading.Event()
            release = threading.Event()
            calls = []
            errors = []
            def transport(*args):
                calls.append(args)
                entered.set()
                release.wait(5)
                return TransportResult(200, provider_response())
            def first():
                times = iter(("2026-09-03T12:00:00Z", "2026-09-03T12:00:01Z", "2026-09-03T12:00:02Z"))
                try:
                    request_assistance(
                        self.spec, "model", destination, "secret",
                        confirmation=lambda _: "SEND", preview=lambda _: None,
                        transport=transport, clock=lambda: next(times),
                        id_generator=lambda: "winning-call",
                    )
                except BaseException as exc:
                    errors.append(exc)
            thread = threading.Thread(target=first)
            thread.start()
            self.assertTrue(entered.wait(5))
            with self.assertRaisesRegex(OpenAIResponseError, "reserved"):
                request_assistance(
                    self.spec, "model", destination, "secret",
                    confirmation=lambda _: "SEND", preview=lambda _: None,
                    transport=transport,
                )
            release.set()
            thread.join(5)
            self.assertFalse(thread.is_alive())
            self.assertEqual(errors, [])
            self.assertEqual(len(calls), 1)
            self.assertEqual(json.loads(destination.read_bytes())["id"], "winning-call")
            self.assertEqual(list(parent.glob("*.request-assistance.reserve")), [])

    def test_preview_confirmation_transport_order_and_strict_send(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "call.json"
            operation = prepare_operation(self.spec, "model", destination)
            expected_preview = render_preview(operation)
            events = []
            times = iter(("2026-09-03T12:00:00Z", "2026-09-03T12:00:01Z", "2026-09-03T12:00:02Z"))
            def confirm(value):
                events.append(("confirm", value))
                return "SEND"
            request_assistance(
                self.spec, "model", destination, "secret",
                preview=lambda value: events.append(("preview", value)),
                confirmation=confirm,
                transport=lambda *args: (events.append(("transport", args[2])) or TransportResult(200, provider_response())),
                clock=lambda: next(times), id_generator=lambda: "ordered-operation",
            )
            self.assertEqual([event[0] for event in events], ["preview", "confirm", "transport"])
            self.assertEqual(events[0][1], expected_preview)
            self.assertEqual(events[1][1], expected_preview)
            self.assertEqual(events[2][1], operation.body)

        for answer in (" SEND", "SEND ", "send", "Send", "SEND\n", ""):
            with self.subTest(answer=repr(answer)), tempfile.TemporaryDirectory() as temporary:
                calls = []
                result = request_assistance(
                    self.spec, "model", Path(temporary) / "call.json", "secret",
                    preview=lambda _: None, confirmation=lambda _: answer,
                    transport=lambda *args: calls.append(args),
                )
                self.assertIsNone(result)
                self.assertEqual(calls, [])

    def test_injected_oversized_response_is_rejected_before_parsing(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            spec = request_spec()
            spec["limits"]["max_provider_response_bytes"] = 10
            destination = Path(temporary) / "call.json"
            with patch("theorem_terminal.openai_response.classify_response") as classify:
                with self.assertRaisesRegex(OpenAIResponseError, "failed ModelCall"):
                    request_assistance(
                        spec, "model", destination, "secret",
                        preview=lambda _: None, confirmation=lambda _: "SEND",
                        transport=lambda *_: TransportResult(200, b"x" * 11),
                        clock=lambda: "2026-09-03T12:00:00Z",
                        id_generator=lambda: "oversized-call",
                    )
                classify.assert_not_called()
            self.assertEqual(json.loads(destination.read_bytes())["status"], "failed")

    def test_post_transmission_failures_are_retained_without_retry_or_secret(self) -> None:
        for name, response in (
            ("transport", OpenAIResponseError("secret-test-key leaked")),
            ("json", TransportResult(200, b"not json")),
            ("utf8", TransportResult(200, b"\xff")),
            ("http", TransportResult(503, b"ignored secret-test-key")),
        ):
            with self.subTest(name=name), tempfile.TemporaryDirectory() as temporary:
                calls = 0
                def transport(*_args, result=response):
                    nonlocal calls
                    calls += 1
                    if isinstance(result, Exception):
                        raise result
                    return result
                destination = Path(temporary) / "call.json"
                times = iter(("2026-09-03T12:00:00Z", "2026-09-03T12:00:01Z", "2026-09-03T12:00:02Z"))
                with self.assertRaisesRegex(OpenAIResponseError, "failed ModelCall") as caught:
                    request_assistance(
                        self.spec, "model", destination, "secret-test-key",
                        confirmation=lambda _: "SEND", preview=lambda _: None,
                        transport=transport, clock=lambda: next(times),
                        id_generator=lambda: "failed-call",
                    )
                self.assertEqual(calls, 1)
                terminal = json.loads(destination.read_bytes())
                self.assertEqual(terminal["status"], "failed")
                self.assertNotIn("secret-test-key", str(caught.exception))
                self.assertNotIn("secret-test-key", destination.read_text())

    def test_refused_and_incomplete_records_are_retained(self) -> None:
        for expected in ("refused", "incomplete"):
            response = json.loads(provider_response())
            if expected == "refused":
                response["output"][0]["content"] = [{"type": "refusal", "refusal": "No."}]
            else:
                response["status"] = "incomplete"
            with self.subTest(expected=expected), tempfile.TemporaryDirectory() as temporary:
                calls = []
                destination = Path(temporary) / "call.json"
                times = iter(("2026-09-03T12:00:00Z", "2026-09-03T12:00:01Z", "2026-09-03T12:00:02Z"))
                request_assistance(
                    self.spec, "model", destination, "secret",
                    confirmation=lambda _: "SEND", preview=lambda _: None,
                    transport=lambda *args: (calls.append(args) or TransportResult(200, json.dumps(response).encode())),
                    clock=lambda: next(times), id_generator=lambda: "terminal-call",
                )
                self.assertEqual(json.loads(destination.read_bytes())["status"], expected)
                self.assertEqual(len(calls), 1)

    def test_complete_terminal_records_for_every_status(self) -> None:
        completed = json.loads(provider_response("Exact result.\n"))
        refused = json.loads(provider_response())
        refused["output"][0]["content"] = [{"type": "refusal", "refusal": "No."}]
        incomplete = json.loads(provider_response())
        incomplete["status"] = "queued"
        failed = json.loads(provider_response())
        failed["status"] = "failed"
        failed["output"][0]["content"] = [{"type": "refusal", "refusal": "ignored"}]
        cancelled = json.loads(provider_response())
        cancelled["status"] = "cancelled"
        cases = (
            ("completed", TransportResult(200, json.dumps(completed).encode()), "completed", "Exact result.\n", False),
            ("refused", TransportResult(200, json.dumps(refused).encode()), "refused", "No.", False),
            ("incomplete", TransportResult(200, json.dumps(incomplete).encode()), "incomplete", None, False),
            ("provider-failed", TransportResult(200, json.dumps(failed).encode()), "failed", None, False),
            ("provider-cancelled", TransportResult(200, json.dumps(cancelled).encode()), "failed", None, False),
            ("local-failure", OpenAIResponseError("local failure"), "failed", None, True),
        )
        for name, outcome, status, text, raises in cases:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as temporary:
                destination = Path(temporary) / "call.json"
                calls = []
                def transport(*args):
                    calls.append(args)
                    if isinstance(outcome, Exception):
                        raise outcome
                    return outcome
                timestamps = iter((
                    "2026-09-03T12:00:00Z",
                    "2026-09-03T12:00:01Z",
                    "2026-09-03T12:00:02Z",
                ))
                kwargs = dict(
                    confirmation=lambda _: "SEND", preview=lambda _: None,
                    transport=transport, clock=lambda: next(timestamps),
                    id_generator=lambda: f"{name}-call",
                )
                if raises:
                    with self.assertRaisesRegex(OpenAIResponseError, "failed ModelCall"):
                        request_assistance(self.spec, "configured-model", destination, "secret", **kwargs)
                else:
                    request_assistance(self.spec, "configured-model", destination, "secret", **kwargs)
                self.assertEqual(len(calls), 1)
                operation = prepare_operation(self.spec, "configured-model", destination)
                expected = {
                    "schema": "theorem-terminal.model-call",
                    "schema_version": 1,
                    "id": f"{name}-call",
                    "initiated_by": "person-test",
                    "target": {"kind": "WorkArtifact", "id": "attempt-test-v1"},
                    "purpose": "strategic_hint",
                    "request_text": "Suggest one next step; do not solve the problem.",
                    "context_refs": [{"kind": "WorkArtifact", "id": "attempt-test-v1", "revision": "abc"}],
                    "effective_input": {
                        "instructions": "Return one strategic hint only.",
                        "input": [{"role": "user", "content": [{"type": "input_text", "text": "Exact α-context.\n"}]}],
                    },
                    "provider": "openai",
                    "requested_model": "configured-model",
                    "resolved_model": None if raises else "configured-model-2026-01-01",
                    "adapter_version": "openai-responses-v1",
                    "limits": {
                        "max_request_body_bytes": 4096,
                        "max_provider_response_bytes": 4096,
                        "max_output_tokens": 200,
                        "timeout_seconds": 30,
                        "request_body_utf8_bytes": len(operation.body),
                    },
                    "settings": {"store": False},
                    "in_reply_to": None,
                    "requested_at": "2026-09-03T12:00:00Z",
                    "completed_at": "2026-09-03T12:00:00Z" if raises else "2026-09-03T12:00:01Z",
                    "finalized_at": "2026-09-03T12:00:00Z" if raises else "2026-09-03T12:00:02Z",
                    "status": status,
                    "response_id": None if raises else "resp_test",
                    "raw_response": text,
                    "raw_response_digest": sha256(text.encode()).hexdigest() if text is not None else None,
                }
                self.assertEqual(json.loads(destination.read_bytes()), expected)

    def test_maximum_metadata_and_large_response_fit_projection_ceiling(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            spec = request_spec()
            spec["request_text"] = "q" * 700_000
            spec["limits"]["max_provider_response_bytes"] = 1_048_576
            response_text = "r" * 900_000
            response = provider_response(response_text)
            self.assertLessEqual(len(response), 1_048_576)
            destination = Path(temporary) / "call.json"
            times = iter(("2026-09-03T12:00:00Z", "2026-09-03T12:00:01Z", "2026-09-03T12:00:02Z"))
            raw = request_assistance(
                spec, "model", destination, "secret",
                confirmation=lambda _: "SEND", preview=lambda _: None,
                transport=lambda *_: TransportResult(200, response),
                clock=lambda: next(times), id_generator=lambda: "bounded-call",
            )
            self.assertLessEqual(len(raw), 4 * 1024 * 1024)
            call = parse_finalized_model_call(raw)
            representation = extract_lossless_representation(
                call, representation_id="large-representation", version="1",
                subject={"kind": "WorkArtifact", "id": "attempt-test-v1"},
                kind="strategic_hint", start_byte=0, end_byte=len(response_text),
            )
            claim = make_model_produced_claim(
                call, representation, claim_id="large-claim",
                display_name="Large bounded projection", description="Boundary regression.",
            )
            from theorem_terminal.documentary_warrant import DocumentaryProjection
            projection = DocumentaryProjection(call, representation, claim)
            self.assertLessEqual(len(encode_documentary_projection(projection)), 4 * 1024 * 1024)

    def test_request_and_response_limits(self) -> None:
        changed = request_spec()
        changed["limits"]["timeout_seconds"] = 301
        with self.assertRaisesRegex(OpenAIResponseError, "1 through 300"):
            parse_prepared_request(json.dumps(changed).encode())
        changed = request_spec()
        changed["limits"]["max_request_body_bytes"] = 1
        parsed = parse_prepared_request(json.dumps(changed).encode())
        with self.assertRaisesRegex(OpenAIResponseError, "request body"):
            prepare_operation(parsed, "model", Path("call.json"))

    def test_all_byte_and_numeric_limits_accept_maximum_and_reject_one_over(self) -> None:
        spec = request_spec()
        spec["limits"] = {
            "max_request_body_bytes": openai_response_module.HARD_MAX_REQUEST_BODY_BYTES,
            "max_provider_response_bytes": openai_response_module.HARD_MAX_PROVIDER_RESPONSE_BYTES,
            "max_output_tokens": openai_response_module.HARD_MAX_OUTPUT_TOKENS,
            "timeout_seconds": openai_response_module.HARD_MAX_TIMEOUT_SECONDS,
        }
        base = json.dumps(spec).encode()
        padded = base + b" " * (openai_response_module.MAX_PREPARED_REQUEST_BYTES - len(base))
        self.assertEqual(len(padded), openai_response_module.MAX_PREPARED_REQUEST_BYTES)
        parse_prepared_request(padded)
        with self.assertRaisesRegex(OpenAIResponseError, "prepared request exceeds"):
            parse_prepared_request(padded + b" ")
        for key, maximum in (
            ("max_request_body_bytes", openai_response_module.HARD_MAX_REQUEST_BODY_BYTES),
            ("max_provider_response_bytes", openai_response_module.HARD_MAX_PROVIDER_RESPONSE_BYTES),
            ("max_output_tokens", openai_response_module.HARD_MAX_OUTPUT_TOKENS),
            ("timeout_seconds", openai_response_module.HARD_MAX_TIMEOUT_SECONDS),
        ):
            changed = json.loads(json.dumps(spec))
            changed["limits"][key] = maximum + 1
            with self.subTest(key=key), self.assertRaisesRegex(OpenAIResponseError, "1 through"):
                parse_prepared_request(json.dumps(changed).encode())

        spec["effective_input"] = {"input": "x"}
        probe = prepare_operation(spec, "model", Path("call.json"))
        overhead = len(probe.body) - 1
        spec["effective_input"] = {"input": "x" * (openai_response_module.HARD_MAX_REQUEST_BODY_BYTES - overhead)}
        exact = prepare_operation(spec, "model", Path("call.json"))
        self.assertEqual(len(exact.body), openai_response_module.HARD_MAX_REQUEST_BODY_BYTES)
        spec["effective_input"]["input"] += "x"
        with self.assertRaisesRegex(OpenAIResponseError, "request body"):
            prepare_operation(spec, "model", Path("call.json"))

        spec = request_spec()
        spec["limits"]["max_provider_response_bytes"] = openai_response_module.HARD_MAX_PROVIDER_RESPONSE_BYTES
        base_response = provider_response()
        maximum_response = base_response + b" " * (
            openai_response_module.HARD_MAX_PROVIDER_RESPONSE_BYTES - len(base_response)
        )
        with tempfile.TemporaryDirectory() as temporary:
            first = Path(temporary) / "maximum.json"
            request_assistance(
                spec, "model", first, "secret", preview=lambda _: None,
                confirmation=lambda _: "SEND",
                transport=lambda *_: TransportResult(200, maximum_response),
                clock=lambda: "2026-09-03T12:00:00Z",
                id_generator=lambda: "maximum-response-call",
            )
            self.assertEqual(json.loads(first.read_bytes())["status"], "completed")
            second = Path(temporary) / "over.json"
            with patch("theorem_terminal.openai_response.classify_response") as classify:
                with self.assertRaisesRegex(OpenAIResponseError, "failed ModelCall"):
                    request_assistance(
                        spec, "model", second, "secret", preview=lambda _: None,
                        confirmation=lambda _: "SEND",
                        transport=lambda *_: TransportResult(200, maximum_response + b" "),
                        clock=lambda: "2026-09-03T12:00:00Z",
                        id_generator=lambda: "over-response-call",
                    )
                classify.assert_not_called()

    def test_timestamps_remain_ordered_if_wall_clock_moves_backward(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "call.json"
            times = iter(
                (
                    "2026-09-03T12:00:02Z",
                    "2026-09-03T12:00:01Z",
                    "2026-09-03T12:00:00Z",
                )
            )
            request_assistance(
                self.spec, "model", destination, "secret",
                confirmation=lambda _: "SEND", preview=lambda _: None,
                transport=lambda *_: TransportResult(200, provider_response()),
                clock=lambda: next(times), id_generator=lambda: "ordered-call",
            )
            call = parse_finalized_model_call(destination.read_bytes())
            self.assertEqual(call.document["requested_at"], "2026-09-03T12:00:02Z")
            self.assertEqual(call.document["completed_at"], "2026-09-03T12:00:02Z")
            self.assertEqual(call.document["finalized_at"], "2026-09-03T12:00:02Z")

    def test_atomic_no_overwrite_and_cleanup(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            destination = parent / "call.json"
            install_atomic_no_overwrite(destination, b"complete")
            self.assertEqual(destination.read_bytes(), b"complete")
            with self.assertRaisesRegex(OpenAIResponseError, "already exists"):
                install_atomic_no_overwrite(destination, b"replacement")
            self.assertEqual(destination.read_bytes(), b"complete")
            self.assertEqual(list(parent.glob(".call.json.*.tmp")), [])

    def test_concurrent_destination_is_not_overwritten(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "call.json"
            real_link = os.link
            def racing_link(source, target):
                Path(target).write_bytes(b"concurrent")
                return real_link(source, target)
            with patch("theorem_terminal.openai_response.os.link", racing_link):
                with self.assertRaisesRegex(OpenAIResponseError, "already exists"):
                    install_atomic_no_overwrite(destination, b"ours")
            self.assertEqual(destination.read_bytes(), b"concurrent")

    def test_atomic_cleanup_after_sync_install_and_interruption_failures(self) -> None:
        class BrokenWriter:
            def __init__(self, descriptor):
                self.descriptor = descriptor

            def __enter__(self):
                return self

            def __exit__(self, *_args):
                os.close(self.descriptor)
                return False

            def write(self, _raw):
                raise OSError("write failed")

        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            destination = parent / "call.json"
            with patch(
                "theorem_terminal.openai_response.os.fdopen",
                side_effect=lambda descriptor, _mode: BrokenWriter(descriptor),
            ):
                with self.assertRaises(OSError):
                    install_atomic_no_overwrite(destination, b"complete")
            self.assertFalse(destination.exists())
            self.assertEqual(list(parent.glob(".call.json.*.tmp")), [])

    def test_directory_sync_failure_retains_published_complete_destination(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            destination = Path(temporary) / "call.json"
            real_fsync = os.fsync
            real_unlink = os.unlink
            calls = 0
            unlink_attempts = []
            def fsync(descriptor):
                nonlocal calls
                calls += 1
                if calls == 2:
                    raise OSError("directory sync failed")
                return real_fsync(descriptor)
            def unlink(path, *args, **kwargs):
                unlink_attempts.append(Path(path))
                return real_unlink(path, *args, **kwargs)
            complete = b'{"complete":"ModelCall"}\n'
            with patch("theorem_terminal.openai_response.os.fsync", side_effect=fsync), \
                 patch("os.unlink", side_effect=unlink):
                with self.assertRaisesRegex(OpenAIResponseError, "published.*durability"):
                    install_atomic_no_overwrite(destination, complete)
            self.assertEqual(destination.read_bytes(), complete)
            self.assertNotIn(destination, unlink_attempts)
            self.assertEqual(list(parent.glob(".call.json.*.tmp")), [])

        for name, patches in (
            ("file sync", {"fsync": OSError("sync failed")}),
            ("install interruption", {"link": KeyboardInterrupt()}),
        ):
            with self.subTest(name=name), tempfile.TemporaryDirectory() as temporary:
                parent = Path(temporary)
                destination = parent / "call.json"
                target = "theorem_terminal.openai_response.os."
                with patch(target + next(iter(patches)), side_effect=next(iter(patches.values()))):
                    with self.assertRaises(BaseException):
                        install_atomic_no_overwrite(destination, b"complete")
                self.assertFalse(destination.exists())
                self.assertEqual(list(parent.glob(".call.json.*.tmp")), [])

    def test_reservations_are_cleaned_after_transport_failure_and_interrupt(self) -> None:
        for failure in (OpenAIResponseError("transport failed"), KeyboardInterrupt()):
            with self.subTest(failure=type(failure).__name__), tempfile.TemporaryDirectory() as temporary:
                parent = Path(temporary)
                destination = parent / "call.json"
                def transport(*_args):
                    raise failure
                with self.assertRaises(type(failure)):
                    request_assistance(
                        self.spec, "model", destination, "secret",
                        preview=lambda _: None, confirmation=lambda _: "SEND",
                        transport=transport,
                        clock=lambda: "2026-09-03T12:00:00Z",
                        id_generator=lambda: "failed-call",
                    )
                self.assertEqual(json.loads(destination.read_bytes())["status"], "failed")
                self.assertEqual(
                    list(parent.glob(".*.request-assistance.reserve")), []
                )

    def test_project_response_accepts_success_without_changing_call(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            call_path = parent / "call.json"
            projection = parent / "projection.json"
            raw, _, _ = self.run_success(call_path)
            before = sha256(call_path.read_bytes()).hexdigest()
            end = len(parse_finalized_model_call(raw).raw_response.encode())
            result = main([
                "project-response", str(call_path), "--start-byte", "0",
                "--end-byte", str(end), "--representation-id", "representation-v1",
                "--kind", "strategic_hint", "--claim-id", "claim-v1",
                "--output", str(projection),
            ])
            self.assertEqual(result, 0)
            self.assertTrue(projection.is_file())
            self.assertEqual(sha256(call_path.read_bytes()).hexdigest(), before)

    def test_cli_success_decline_missing_key_and_terminal_outcomes(self) -> None:
        refused = json.loads(provider_response())
        refused["output"][0]["content"] = [{"type": "refusal", "refusal": "No."}]
        incomplete = json.loads(provider_response())
        incomplete["status"] = "incomplete"
        cases = (
            ("success", "SEND\n", "key", TransportResult(200, provider_response()), 0, "completed"),
            ("refused", "SEND\n", "key", TransportResult(200, json.dumps(refused).encode()), 0, "refused"),
            ("incomplete", "SEND\n", "key", TransportResult(200, json.dumps(incomplete).encode()), 0, "incomplete"),
            ("decline", "send\n", "key", None, 0, None),
            ("missing-key", "SEND\n", None, None, 2, None),
            ("failed", "SEND\n", "key", TransportResult(503, b"secret body"), 2, "failed"),
        )
        for name, entered, key, result, expected_code, expected_status in cases:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as temporary:
                parent = Path(temporary)
                request_path = parent / "request.json"
                request_path.write_bytes(encoded_spec())
                destination = parent / "call.json"
                calls = []
                def transport(*args):
                    calls.append(args)
                    if result is None:
                        self.fail("transport called")
                    return result
                environment = {} if key is None else {"OPENAI_API_KEY": key}
                stdout, stderr = io.StringIO(), io.StringIO()
                with patch.dict(os.environ, environment, clear=True), \
                     patch("sys.stdin", io.StringIO(entered)), \
                     patch("sys.stdout", stdout), patch("sys.stderr", stderr), \
                     patch("theorem_terminal.openai_response.http_transport", transport):
                    code = main([
                        "request-assistance", str(request_path), "--model", "configured-model",
                        "--output", str(destination),
                    ])
                self.assertEqual(code, expected_code)
                self.assertNotIn("key", stdout.getvalue() + stderr.getvalue())
                if expected_status is None:
                    self.assertFalse(destination.exists())
                    self.assertEqual(calls, [])
                else:
                    self.assertEqual(json.loads(destination.read_bytes())["status"], expected_status)
                    self.assertEqual(len(calls), 1)
                if name == "success":
                    self.assertIn("OpenAI Responses API request preview", stdout.getvalue())
                    self.assertIn("Created terminal ModelCall", stdout.getvalue())
                    self.assertEqual(stderr.getvalue(), "")
                elif expected_code == 2:
                    self.assertTrue(stderr.getvalue().startswith("error: "))


if __name__ == "__main__":
    unittest.main()
