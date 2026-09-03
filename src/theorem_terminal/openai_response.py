"""One explicit, bounded OpenAI Responses API operation.

The adapter creates only a finalized ``ModelCall``.  It does not project model
output, admit a premise, invoke Lean, or submit a follow-up request.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
import json
import os
from pathlib import Path
import socket
import tempfile
from typing import Callable, Mapping
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request, build_opener
from uuid import uuid4

from theorem_terminal.model_projection import parse_finalized_model_call


ADAPTER_VERSION = "openai-responses-v1"
PROVIDER = "openai"
RESPONSES_URL = "https://api.openai.com/v1/responses"
MAX_PREPARED_REQUEST_BYTES = 1024 * 1024
HARD_MAX_REQUEST_BODY_BYTES = 1024 * 1024
HARD_MAX_PROVIDER_RESPONSE_BYTES = 4 * 1024 * 1024
HARD_MAX_OUTPUT_TOKENS = 16384
HARD_MAX_TIMEOUT_SECONDS = 300
_PURPOSES = {
    "definition_explanation", "result_explanation", "source_suggestion",
    "strategic_hint", "intermediate_lemma", "proof_outline", "critique",
    "worked_solution", "computation",
}
_SPEC_KEYS = {
    "initiated_by", "target", "purpose", "request_text", "context_refs",
    "effective_input", "limits", "in_reply_to",
}
_LIMIT_KEYS = {
    "max_request_body_bytes", "max_provider_response_bytes",
    "max_output_tokens", "timeout_seconds",
}


class OpenAIResponseError(ValueError):
    """Raised before a finalized ModelCall can be created."""


class _RejectRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: ANN001
        return None


@dataclass(frozen=True)
class PreparedOperation:
    request: Mapping[str, object]
    requested_model: str
    body: bytes
    output: Path


@dataclass(frozen=True)
class TransportResult:
    status: int
    body: bytes


@dataclass(frozen=True)
class ResponseClassification:
    status: str
    response_id: str | None
    resolved_model: str | None
    raw_response: str | None


def _unique_object(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise OpenAIResponseError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def _standard_number(value: str) -> None:
    raise OpenAIResponseError(f"non-standard JSON number: {value}")


def _utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _next_timestamp(clock: Callable[[], str], lower_bound: str | None = None) -> str:
    value = clock()
    try:
        parsed = datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ")
    except (TypeError, ValueError) as exc:
        raise OpenAIResponseError("application clock returned a noncanonical UTC time") from exc
    if parsed.strftime("%Y-%m-%dT%H:%M:%SZ") != value:
        raise OpenAIResponseError("application clock returned a noncanonical UTC time")
    return max(value, lower_bound) if lower_bound is not None else value


def _object(value: object, path: str) -> dict[str, object]:
    if not isinstance(value, dict):
        raise OpenAIResponseError(f"{path} must be a JSON object")
    return value


def _string(value: object, path: str) -> str:
    if not isinstance(value, str) or not value:
        raise OpenAIResponseError(f"{path} must be a non-empty string")
    try:
        value.encode("utf-8", errors="strict")
    except UnicodeEncodeError as exc:
        raise OpenAIResponseError(f"{path} is not strict Unicode") from exc
    return value


def _reference(value: object, path: str) -> dict[str, str]:
    result = _object(value, path)
    if set(result) not in ({"kind", "id"}, {"kind", "id", "revision"}):
        raise OpenAIResponseError(f"{path} has wrong fields")
    return {key: _string(item, f"{path}.{key}") for key, item in result.items()}


def _positive_int(value: object, path: str, maximum: int) -> int:
    if (
        isinstance(value, bool)
        or not isinstance(value, int)
        or not 0 < value <= maximum
    ):
        raise OpenAIResponseError(
            f"{path} must be an integer from 1 through {maximum}"
        )
    return value


def _validate_input(value: object) -> None:
    if isinstance(value, str):
        _string(value, "prepared_request.effective_input.input")
        return
    if not isinstance(value, list) or not value:
        raise OpenAIResponseError(
            "prepared_request.effective_input.input must be nonempty text or messages"
        )
    for message_index, message_value in enumerate(value):
        path = f"prepared_request.effective_input.input[{message_index}]"
        message = _object(message_value, path)
        if set(message) != {"role", "content"} or message["role"] != "user":
            raise OpenAIResponseError(f"{path} must contain only role=user and content")
        content = message["content"]
        if not isinstance(content, list) or not content:
            raise OpenAIResponseError(f"{path}.content must be a nonempty array")
        for content_index, part_value in enumerate(content):
            part_path = f"{path}.content[{content_index}]"
            part = _object(part_value, part_path)
            if set(part) != {"type", "text"} or part["type"] != "input_text":
                raise OpenAIResponseError(
                    f"{part_path} must contain only type=input_text and text"
                )
            _string(part["text"], f"{part_path}.text")


def parse_prepared_request(raw: bytes) -> dict[str, object]:
    """Validate transient input made only from ModelCall request-side fields."""

    if len(raw) > MAX_PREPARED_REQUEST_BYTES:
        raise OpenAIResponseError("prepared request exceeds its byte limit")
    try:
        spec = json.loads(
            raw.decode("utf-8", errors="strict"),
            object_pairs_hook=_unique_object,
            parse_constant=_standard_number,
        )
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise OpenAIResponseError("prepared request is not strict JSON") from exc
    spec = _object(spec, "prepared_request")
    if set(spec) != _SPEC_KEYS:
        raise OpenAIResponseError("prepared_request has wrong fields")
    for key in ("initiated_by", "request_text"):
        _string(spec[key], f"prepared_request.{key}")
    if spec["purpose"] not in _PURPOSES:
        raise OpenAIResponseError("prepared_request.purpose is not recognized")
    _reference(spec["target"], "prepared_request.target")
    if spec["in_reply_to"] is not None:
        _string(spec["in_reply_to"], "prepared_request.in_reply_to")
    context_refs = spec["context_refs"]
    if not isinstance(context_refs, list):
        raise OpenAIResponseError("prepared_request.context_refs must be an array")
    for index, reference in enumerate(context_refs):
        _reference(reference, f"prepared_request.context_refs[{index}]")
    effective = _object(spec["effective_input"], "prepared_request.effective_input")
    if not set(effective).issubset({"instructions", "input"}) or "input" not in effective:
        raise OpenAIResponseError("prepared_request.effective_input has wrong fields")
    if "instructions" in effective:
        _string(effective["instructions"], "prepared_request.effective_input.instructions")
    _validate_input(effective["input"])
    limits = _object(spec["limits"], "prepared_request.limits")
    if set(limits) != _LIMIT_KEYS:
        raise OpenAIResponseError("prepared_request.limits has wrong fields")
    _positive_int(limits["max_request_body_bytes"], "prepared_request.limits.max_request_body_bytes", HARD_MAX_REQUEST_BODY_BYTES)
    _positive_int(limits["max_provider_response_bytes"], "prepared_request.limits.max_provider_response_bytes", HARD_MAX_PROVIDER_RESPONSE_BYTES)
    _positive_int(limits["max_output_tokens"], "prepared_request.limits.max_output_tokens", HARD_MAX_OUTPUT_TOKENS)
    _positive_int(limits["timeout_seconds"], "prepared_request.limits.timeout_seconds", HARD_MAX_TIMEOUT_SECONDS)
    return spec


def prepare_operation(
    spec: Mapping[str, object], model: str, output: Path
) -> PreparedOperation:
    requested_model = _string(model, "requested model")
    effective = spec["effective_input"]
    limits = spec["limits"]
    assert isinstance(effective, dict) and isinstance(limits, dict)
    body = {
        "model": requested_model,
        "input": effective["input"],
        "max_output_tokens": limits["max_output_tokens"],
        "store": False,
    }
    if "instructions" in effective:
        body["instructions"] = effective["instructions"]
    body_bytes = encode_canonical(body)
    if len(body_bytes) > limits["max_request_body_bytes"]:
        raise OpenAIResponseError("request body exceeds its configured byte limit")
    return PreparedOperation(spec, requested_model, body_bytes, Path(output))


def encode_canonical(value: object) -> bytes:
    return (
        json.dumps(
            value,
            ensure_ascii=False,
            allow_nan=False,
            sort_keys=True,
            separators=(",", ":"),
        )
        + "\n"
    ).encode("utf-8")


Transport = Callable[
    [str, str, bytes, Mapping[str, str], int, int], TransportResult
]


def http_transport(
    method: str,
    endpoint: str,
    body: bytes,
    headers: Mapping[str, str],
    timeout: int,
    max_response_bytes: int,
) -> TransportResult:
    """Make one bounded request; redirects are terminal HTTP failures."""

    request = Request(endpoint, data=body, headers=dict(headers), method=method)
    opener = build_opener(_RejectRedirect())
    try:
        with opener.open(request, timeout=timeout) as response:
            raw = response.read(max_response_bytes + 1)
            status = response.status
    except HTTPError as exc:
        raise OpenAIResponseError(f"OpenAI Responses API returned HTTP {exc.code}") from None
    except (URLError, socket.timeout, TimeoutError) as exc:
        raise OpenAIResponseError(f"OpenAI Responses API transport failed: {type(exc).__name__}") from None
    if len(raw) > max_response_bytes:
        raise OpenAIResponseError("OpenAI provider response exceeds its byte limit")
    return TransportResult(status, raw)


def classify_response(raw: bytes) -> ResponseClassification:
    try:
        response = _object(
            _decode_provider_json(raw),
            "response",
        )
    except OpenAIResponseError:
        raise
    response_id = response.get("id")
    model = response.get("model")
    response_id = response_id if isinstance(response_id, str) and response_id else None
    model = model if isinstance(model, str) and model else None
    output = response.get("output")
    if not isinstance(output, list):
        return ResponseClassification("incomplete", response_id, model, None)
    messages: list[dict[str, object]] = []
    unexpected = False
    for item in output:
        if not isinstance(item, dict):
            unexpected = True
        elif item.get("type") == "reasoning":
            continue
        elif item.get("type") == "message" and item.get("role") == "assistant":
            messages.append(item)
        else:
            unexpected = True
    texts: list[str] = []
    refusals: list[str] = []
    unsupported = False
    for message in messages:
        contents = message.get("content")
        if not isinstance(contents, list):
            unsupported = True
            continue
        for part in contents:
            if not isinstance(part, dict):
                unsupported = True
            elif part.get("type") == "output_text" and isinstance(part.get("text"), str):
                texts.append(part["text"])
            elif (
                part.get("type") == "refusal"
                and isinstance(part.get("refusal"), str)
                and part["refusal"]
            ):
                refusals.append(part["refusal"])
            else:
                unsupported = True
    unambiguous = (texts + refusals)[0] if len(texts) + len(refusals) == 1 else None
    if refusals:
        return ResponseClassification("refused", response_id, model, unambiguous)
    if response.get("status") in ("failed", "cancelled"):
        return ResponseClassification("failed", response_id, model, unambiguous)
    if response.get("status") != "completed":
        return ResponseClassification("incomplete", response_id, model, unambiguous)
    if (
        response.get("object") != "response"
        or response_id is None
        or model is None
        or unexpected
        or unsupported
        or len(messages) != 1
        or messages[0].get("status") != "completed"
        or len(texts) != 1
        or texts[0] == ""
    ):
        return ResponseClassification("incomplete", response_id, model, unambiguous)
    return ResponseClassification("completed", response_id, model, texts[0])


def _decode_provider_json(raw: bytes) -> object:
    try:
        text = raw.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise OpenAIResponseError("OpenAI provider response is not valid UTF-8") from exc
    try:
        return json.loads(
            text,
            object_pairs_hook=_unique_object,
            parse_constant=_standard_number,
        )
    except (json.JSONDecodeError, RecursionError) as exc:
        raise OpenAIResponseError("OpenAI provider response is not valid JSON") from exc


def render_preview(operation: PreparedOperation) -> str:
    request = operation.request
    return "\n".join(
        (
            "OpenAI Responses API request preview",
            "Method: POST",
            f"Endpoint: {RESPONSES_URL}",
            f"Requested model: {operation.requested_model}",
            "Non-secret headers:",
            "  Content-Type: application/json",
            "Complete UTF-8 JSON request body:",
            operation.body.decode("utf-8").removesuffix("\n"),
            "Selected context references:",
            json.dumps(request["context_refs"], ensure_ascii=False, sort_keys=True),
            "Transmitted instructions and input:",
            json.dumps(request["effective_input"], ensure_ascii=False, sort_keys=True),
            "Enforced limits:",
            json.dumps(request["limits"], ensure_ascii=False, sort_keys=True),
            f"Output destination: {operation.output}",
            "OpenAI data handling remains governed by its policies; store:false does not claim to disable every form of processing or retention.",
            "Type SEND to transmit exactly the displayed request-body bytes: ",
        )
    )


def _terminal_record(
    operation: PreparedOperation,
    call_id: str,
    requested_at: str,
    completed_at: str,
    finalized_at: str,
    classification: ResponseClassification,
) -> dict[str, object]:
    request = operation.request
    text = classification.raw_response
    limits = request["limits"]
    assert isinstance(limits, dict)
    return {
        "schema": "theorem-terminal.model-call",
        "schema_version": 1,
        "id": call_id,
        "initiated_by": request["initiated_by"],
        "target": request["target"],
        "purpose": request["purpose"],
        "request_text": request["request_text"],
        "context_refs": request["context_refs"],
        "effective_input": request["effective_input"],
        "provider": PROVIDER,
        "requested_model": operation.requested_model,
        "resolved_model": classification.resolved_model,
        "adapter_version": ADAPTER_VERSION,
        "limits": {
            **limits,
            "request_body_utf8_bytes": len(operation.body),
        },
        "settings": {"store": False},
        "in_reply_to": request["in_reply_to"],
        "requested_at": requested_at,
        "completed_at": completed_at,
        "finalized_at": finalized_at,
        "status": classification.status,
        "response_id": classification.response_id,
        "raw_response": text,
        "raw_response_digest": (
            sha256(text.encode("utf-8")).hexdigest() if text is not None else None
        ),
    }


def _serialize_terminal(record: Mapping[str, object]) -> bytes:
    raw = (
        json.dumps(
            record,
            ensure_ascii=False,
            allow_nan=False,
            sort_keys=True,
            indent=2,
        )
        + "\n"
    ).encode("utf-8")
    if record["status"] == "completed":
        parse_finalized_model_call(raw)
    elif record["status"] not in ("failed", "refused", "incomplete"):
        raise OpenAIResponseError("terminal ModelCall status is invalid")
    return raw


def install_atomic_no_overwrite(destination: Path, raw: bytes) -> None:
    """Publish complete bytes with fsync and an atomic no-replace hard link."""

    parent = destination.parent
    descriptor, name = tempfile.mkstemp(
        prefix=f".{destination.name}.", suffix=".tmp", dir=parent
    )
    temporary = Path(name)
    installed = False
    try:
        with os.fdopen(descriptor, "wb") as stream:
            descriptor = -1
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        os.link(temporary, destination)
        installed = True
        directory_descriptor = os.open(parent, os.O_RDONLY)
        try:
            os.fsync(directory_descriptor)
        finally:
            os.close(directory_descriptor)
    except FileExistsError as exc:
        raise OpenAIResponseError(f"output already exists: {destination}") from exc
    except BaseException:
        if installed:
            try:
                destination.unlink()
            except OSError:
                pass
        raise
    finally:
        if descriptor >= 0:
            os.close(descriptor)
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass


def execute_confirmed(
    operation: PreparedOperation,
    api_key: str,
    *,
    transport: Transport = http_transport,
    clock: Callable[[], str] = _utc_now,
    id_generator: Callable[[], str] = lambda: f"model-call-{uuid4()}",
    installer: Callable[[Path, bytes], None] = install_atomic_no_overwrite,
) -> bytes:
    """Make at most one POST and retain its terminal ModelCall."""

    call_id = _string(id_generator(), "generated ModelCall id")
    requested_at = _next_timestamp(clock)
    try:
        limits = operation.request["limits"]
        assert isinstance(limits, dict)
        result = transport(
            "POST",
            RESPONSES_URL,
            operation.body,
            {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            limits["timeout_seconds"],
            limits["max_provider_response_bytes"],
        )
        if result.status != 200:
            raise OpenAIResponseError(
                f"OpenAI Responses API returned HTTP {result.status}"
            )
        classification = classify_response(result.body)
    except (Exception, KeyboardInterrupt) as exc:
        classification = ResponseClassification("failed", None, None, None)
        completed_at = _next_timestamp(clock, requested_at)
        finalized_at = _next_timestamp(clock, completed_at)
        raw = _serialize_terminal(
            _terminal_record(
                operation,
                call_id,
                requested_at,
                completed_at,
                finalized_at,
                classification,
            )
        )
        installer(operation.output, raw)
        if isinstance(exc, KeyboardInterrupt):
            raise
        raise OpenAIResponseError(
            "provider request failed; finalized failed ModelCall retained"
        ) from None
    completed_at = _next_timestamp(clock, requested_at)
    finalized_at = _next_timestamp(clock, completed_at)
    raw = _serialize_terminal(
        _terminal_record(
            operation,
            call_id,
            requested_at,
            completed_at,
            finalized_at,
            classification,
        )
    )
    installer(operation.output, raw)
    return raw


def request_assistance(
    request: Mapping[str, object],
    model: str,
    output: Path,
    api_key: str,
    *,
    confirmation: Callable[[str], str],
    preview: Callable[[str], None],
    transport: Transport = http_transport,
    clock: Callable[[], str] = _utc_now,
    id_generator: Callable[[], str] = lambda: f"model-call-{uuid4()}",
    installer: Callable[[Path, bytes], None] = install_atomic_no_overwrite,
) -> bytes | None:
    """Complete every preflight before preview, confirmation, and transport."""

    _string(model, "requested model")
    if not api_key:
        raise OpenAIResponseError("OPENAI_API_KEY is not configured")
    destination = Path(output)
    if destination.exists():
        raise OpenAIResponseError(f"output already exists: {destination}")
    if not destination.parent.is_dir():
        raise OpenAIResponseError("output parent directory does not exist")
    operation = prepare_operation(request, model, destination)
    rendered = render_preview(operation)
    preview(rendered)
    try:
        answer = confirmation(rendered)
    except (EOFError, KeyboardInterrupt):
        return None
    if answer != "SEND":
        return None
    return execute_confirmed(
        operation,
        api_key,
        transport=transport,
        clock=clock,
        id_generator=id_generator,
        installer=installer,
    )
