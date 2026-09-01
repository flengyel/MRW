"""Pure projection of one finalized model response into documentary records.

This module preserves attribution.  It does not contact a provider, invoke
Lean, admit a premise, create a substantive mathematical claim, or decide that
the proposal should be used.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha256
import json
from types import MappingProxyType
from typing import Any, Mapping


MODEL_CALL_SCHEMA = "theorem-terminal.model-call"
MODEL_CALL_SCHEMA_VERSION = 1
MAX_MODEL_CALL_BYTES = 4 * 1024 * 1024

_MODEL_CALL_KEYS = frozenset(
    {
        "schema",
        "schema_version",
        "id",
        "initiated_by",
        "target",
        "purpose",
        "request_text",
        "context_refs",
        "effective_input",
        "provider",
        "requested_model",
        "resolved_model",
        "adapter_version",
        "limits",
        "settings",
        "in_reply_to",
        "requested_at",
        "completed_at",
        "finalized_at",
        "status",
        "response_id",
        "raw_response",
        "raw_response_digest",
    }
)
_REFERENCE_KEYS = frozenset({"kind", "id"})
_REVISED_REFERENCE_KEYS = frozenset({"kind", "id", "revision"})
_PURPOSES = frozenset(
    {
        "definition_explanation",
        "result_explanation",
        "source_suggestion",
        "strategic_hint",
        "intermediate_lemma",
        "proof_outline",
        "critique",
        "worked_solution",
        "computation",
    }
)
_REPRESENTATION_KINDS = frozenset(
    {
        "orientation",
        "informal_explanation",
        "statement",
        "problem_statement",
        "proof_outline",
        "proof_skeleton",
        "strategic_hint",
        "proposed_solution",
        "calculation",
        "diagram",
        "formal_statement",
        "formal_proof",
        "worked_example",
    }
)


class ModelProjectionError(ValueError):
    """Raised when response attribution cannot be established exactly."""


class _DuplicateKeyError(ValueError):
    pass


class _NonstandardJsonConstantError(ValueError):
    pass


def _reject_duplicate_keys(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            raise _DuplicateKeyError(key)
        result[key] = value
    return result


def _reject_nonstandard_json_constant(value: str) -> None:
    raise _NonstandardJsonConstantError(value)


def _freeze_json(value: Any) -> Any:
    if isinstance(value, Mapping):
        return MappingProxyType(
            {key: _freeze_json(item) for key, item in value.items()}
        )
    if isinstance(value, (list, tuple)):
        return tuple(_freeze_json(item) for item in value)
    return value


def _require_object(value: object, path: str) -> dict[str, object]:
    if not isinstance(value, dict):
        raise ModelProjectionError(f"{path} must be a JSON object")
    return value


def _require_exact_keys(
    value: Mapping[str, object],
    expected: frozenset[str],
    path: str,
) -> None:
    actual = frozenset(value)
    missing = sorted(expected - actual)
    additional = sorted(actual - expected)
    if missing or additional:
        details = []
        if missing:
            details.append(f"missing {', '.join(missing)}")
        if additional:
            details.append(f"unexpected {', '.join(additional)}")
        raise ModelProjectionError(f"{path} has wrong fields: {'; '.join(details)}")


def _require_string(value: object, path: str, *, allow_empty: bool = False) -> str:
    if not isinstance(value, str) or (not allow_empty and not value):
        qualifier = "a string" if allow_empty else "a non-empty string"
        raise ModelProjectionError(f"{path} must be {qualifier}")
    return value


def _require_nullable_string(value: object, path: str) -> str | None:
    if value is None:
        return None
    return _require_string(value, path)


def _require_integer(value: object, path: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ModelProjectionError(f"{path} must be an integer")
    return value


def _require_digest(value: object, path: str) -> str:
    encoded = _require_string(value, path)
    if len(encoded) != 64 or any(
        character not in "0123456789abcdef" for character in encoded
    ):
        raise ModelProjectionError(f"{path} must be a lowercase SHA-256 digest")
    return encoded


def _require_timestamp(value: object, path: str) -> datetime:
    encoded = _require_string(value, path)
    try:
        parsed = datetime.strptime(encoded, "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=timezone.utc
        )
    except ValueError as exc:
        raise ModelProjectionError(
            f"{path} must be canonical UTC YYYY-MM-DDTHH:MM:SSZ"
        ) from exc
    if parsed.strftime("%Y-%m-%dT%H:%M:%SZ") != encoded:
        raise ModelProjectionError(
            f"{path} must be canonical UTC YYYY-MM-DDTHH:MM:SSZ"
        )
    return parsed


def _require_reference(value: object, path: str) -> dict[str, object]:
    reference = _require_object(value, path)
    if frozenset(reference) not in (_REFERENCE_KEYS, _REVISED_REFERENCE_KEYS):
        _require_exact_keys(reference, _REFERENCE_KEYS, path)
    for key in reference:
        _require_string(reference[key], f"{path}.{key}")
    return reference


def _validate_json_strings(value: object, path: str) -> None:
    """Reject Unicode values that cannot be encoded as exact UTF-8."""

    if isinstance(value, str):
        try:
            value.encode("utf-8", errors="strict")
        except UnicodeEncodeError as exc:
            raise ModelProjectionError(f"{path} is not strict Unicode") from exc
    elif isinstance(value, dict):
        for key, item in value.items():
            _validate_json_strings(key, f"{path}.<key>")
            _validate_json_strings(item, f"{path}.{key}")
    elif isinstance(value, list):
        for index, item in enumerate(value):
            _validate_json_strings(item, f"{path}[{index}]")


@dataclass(frozen=True)
class FinalizedModelCall:
    """A validated immutable terminal snapshot of one completed text call."""

    document: Mapping[str, object]
    id: str
    raw_response: str
    raw_response_digest: str
    provider: str
    model: str
    finalized_at: str


@dataclass(frozen=True)
class ResponseSpan:
    """A half-open UTF-8 byte span anchored to a response digest."""

    response_digest: str
    start_byte: int
    end_byte: int


@dataclass(frozen=True)
class LosslessRepresentation:
    """An immutable Representation whose content is one exact response span."""

    document: Mapping[str, object]
    id: str
    version: str
    content: str
    content_hash: str
    span: ResponseSpan


@dataclass(frozen=True)
class DocumentaryClaimAtom:
    """The ordinary claim atom D for exact model production only."""

    document: Mapping[str, object]
    assertion_bytes: bytes
    content_hash: str


def parse_finalized_model_call(raw: bytes) -> FinalizedModelCall:
    """Parse and freeze one exact finalized completed-call JSON record."""

    if not isinstance(raw, bytes):
        raise TypeError("raw model-call record must be bytes")
    if len(raw) > MAX_MODEL_CALL_BYTES:
        raise ModelProjectionError(
            f"model-call record exceeds the {MAX_MODEL_CALL_BYTES}-byte limit"
        )
    try:
        text = raw.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise ModelProjectionError("model-call record is not strict UTF-8") from exc
    try:
        parsed = json.loads(
            text,
            object_pairs_hook=_reject_duplicate_keys,
            parse_constant=_reject_nonstandard_json_constant,
        )
    except _DuplicateKeyError as exc:
        raise ModelProjectionError(
            f"model-call record contains duplicate JSON key: {exc}"
        ) from exc
    except _NonstandardJsonConstantError as exc:
        raise ModelProjectionError(
            f"model-call record contains non-standard JSON number: {exc}"
        ) from exc
    except json.JSONDecodeError as exc:
        raise ModelProjectionError(
            f"model-call record is not valid JSON: {exc.msg}"
        ) from exc
    except RecursionError as exc:
        raise ModelProjectionError("model-call JSON nesting is excessive") from exc

    record = _require_object(parsed, "model_call")
    _require_exact_keys(record, _MODEL_CALL_KEYS, "model_call")
    _validate_json_strings(record, "model_call")
    if record["schema"] != MODEL_CALL_SCHEMA:
        raise ModelProjectionError("model_call.schema is not supported")
    if _require_integer(record["schema_version"], "model_call.schema_version") != 1:
        raise ModelProjectionError("model_call.schema_version is not supported")

    for key in (
        "id",
        "initiated_by",
        "request_text",
        "provider",
        "requested_model",
        "adapter_version",
    ):
        _require_string(record[key], f"model_call.{key}")
    requested_at = _require_timestamp(record["requested_at"], "model_call.requested_at")
    completed_at = _require_timestamp(record["completed_at"], "model_call.completed_at")
    finalized_at = _require_timestamp(record["finalized_at"], "model_call.finalized_at")
    if not requested_at <= completed_at <= finalized_at:
        raise ModelProjectionError(
            "model_call timestamps must satisfy requested_at <= completed_at <= finalized_at"
        )
    purpose = _require_string(record["purpose"], "model_call.purpose")
    if purpose not in _PURPOSES:
        raise ModelProjectionError("model_call.purpose is not recognized")
    _require_reference(record["target"], "model_call.target")
    context_refs = record["context_refs"]
    if not isinstance(context_refs, list):
        raise ModelProjectionError("model_call.context_refs must be a JSON array")
    for index, reference in enumerate(context_refs):
        _require_reference(reference, f"model_call.context_refs[{index}]")
    for key in ("limits", "settings"):
        _require_object(record[key], f"model_call.{key}")
    _require_nullable_string(record["resolved_model"], "model_call.resolved_model")
    _require_nullable_string(record["in_reply_to"], "model_call.in_reply_to")
    _require_nullable_string(record["response_id"], "model_call.response_id")
    if record["status"] != "completed":
        raise ModelProjectionError("model_call.status must be completed")

    response = _require_string(
        record["raw_response"],
        "model_call.raw_response",
        allow_empty=True,
    )
    response_digest = _require_digest(
        record["raw_response_digest"],
        "model_call.raw_response_digest",
    )
    response_bytes = response.encode("utf-8", errors="strict")
    if sha256(response_bytes).hexdigest() != response_digest:
        raise ModelProjectionError(
            "model_call.raw_response_digest does not match raw_response UTF-8 bytes"
        )
    resolved = record["resolved_model"]
    model = resolved if isinstance(resolved, str) else record["requested_model"]
    assert isinstance(model, str)
    return FinalizedModelCall(
        document=_freeze_json(record),
        id=str(record["id"]),
        raw_response=response,
        raw_response_digest=response_digest,
        provider=str(record["provider"]),
        model=model,
        finalized_at=str(record["finalized_at"]),
    )


def _require_matching_call_record(call: FinalizedModelCall) -> None:
    document = call.document
    resolved = document.get("resolved_model")
    recorded_model = (
        resolved
        if isinstance(resolved, str)
        else document.get("requested_model")
    )
    expected = {
        "id": call.id,
        "raw_response": call.raw_response,
        "raw_response_digest": call.raw_response_digest,
        "provider": call.provider,
        "finalized_at": call.finalized_at,
    }
    if any(document.get(key) != value for key, value in expected.items()):
        raise ModelProjectionError("model-call snapshot is internally inconsistent")
    if recorded_model != call.model or document.get("status") != "completed":
        raise ModelProjectionError("model-call snapshot is internally inconsistent")
    response_bytes = call.raw_response.encode("utf-8", errors="strict")
    if sha256(response_bytes).hexdigest() != call.raw_response_digest:
        raise ModelProjectionError("model call no longer matches its response digest")


def extract_lossless_representation(
    call: FinalizedModelCall,
    *,
    representation_id: str,
    version: str,
    subject: Mapping[str, object],
    kind: str,
    start_byte: int,
    end_byte: int,
) -> LosslessRepresentation:
    """Freeze the exact UTF-8 bytes in ``[start_byte, end_byte)`` as R."""

    _require_string(representation_id, "representation.id")
    _require_string(version, "representation.version")
    subject_record = _require_reference(dict(subject), "representation.subject")
    if kind not in _REPRESENTATION_KINDS:
        raise ModelProjectionError("representation.kind is not recognized")
    start = _require_integer(start_byte, "response_span.start_byte")
    end = _require_integer(end_byte, "response_span.end_byte")
    _require_matching_call_record(call)
    response_bytes = call.raw_response.encode("utf-8", errors="strict")
    if start < 0 or end <= start or end > len(response_bytes):
        raise ModelProjectionError(
            "response span must be non-empty and within the raw-response UTF-8 bytes"
        )
    try:
        content = response_bytes[start:end].decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise ModelProjectionError(
            "response span boundaries must fall on UTF-8 code-point boundaries"
        ) from exc
    content_hash = sha256(response_bytes[start:end]).hexdigest()
    span = ResponseSpan(call.raw_response_digest, start, end)
    provenance = {
        "origin": "ai_proposal",
        "author": {"provider": call.provider, "model": call.model},
        "model_call": call.id,
        "response_span": {
            "response_digest": call.raw_response_digest,
            "start_byte": start,
            "end_byte": end,
        },
        "at": call.finalized_at,
    }
    document = {
        "id": representation_id,
        "version": version,
        "subject": subject_record,
        "kind": kind,
        "content": content,
        "content_hash": content_hash,
        "provenance": provenance,
        "occurrence": None,
        "derived_from": [],
        "supersedes": None,
    }
    return LosslessRepresentation(
        document=_freeze_json(document),
        id=representation_id,
        version=version,
        content=content,
        content_hash=content_hash,
        span=span,
    )


def _require_matching_projection(
    call: FinalizedModelCall,
    representation: LosslessRepresentation,
) -> None:
    _require_matching_call_record(call)
    response_bytes = call.raw_response.encode("utf-8", errors="strict")
    span = representation.span
    if span.response_digest != call.raw_response_digest:
        raise ModelProjectionError("representation span names a different response digest")
    if not (0 <= span.start_byte < span.end_byte <= len(response_bytes)):
        raise ModelProjectionError("representation span is outside the model response")
    exact = response_bytes[span.start_byte : span.end_byte]
    try:
        content = exact.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise ModelProjectionError(
            "representation span is not aligned to UTF-8 code points"
        ) from exc
    if content != representation.content:
        raise ModelProjectionError("representation content is not the exact response span")
    if sha256(exact).hexdigest() != representation.content_hash:
        raise ModelProjectionError("representation content hash is inconsistent")
    expected_record = {
        "id": representation.id,
        "version": representation.version,
        "content": representation.content,
        "content_hash": representation.content_hash,
    }
    if any(
        representation.document.get(key) != value
        for key, value in expected_record.items()
    ):
        raise ModelProjectionError("representation record is internally inconsistent")
    provenance = representation.document.get("provenance")
    if not isinstance(provenance, Mapping):
        raise ModelProjectionError("representation provenance is absent")
    response_span = provenance.get("response_span")
    expected_span = {
        "response_digest": span.response_digest,
        "start_byte": span.start_byte,
        "end_byte": span.end_byte,
    }
    if (
        provenance.get("origin") != "ai_proposal"
        or provenance.get("model_call") != call.id
        or response_span != expected_span
    ):
        raise ModelProjectionError(
            "representation provenance does not match the call and response span"
        )


def canonical_model_produced_assertion(
    call: FinalizedModelCall,
    representation: LosslessRepresentation,
) -> bytes:
    """Return the compact canonical UTF-8 assertion payload for D."""

    _require_matching_projection(call, representation)
    payload = [
        "model-produced-v1",
        call.id,
        call.raw_response_digest,
        representation.span.start_byte,
        representation.span.end_byte,
        representation.id,
        representation.content_hash,
    ]
    return json.dumps(
        payload,
        ensure_ascii=False,
        allow_nan=False,
        separators=(",", ":"),
    ).encode("utf-8")


def make_model_produced_claim(
    call: FinalizedModelCall,
    representation: LosslessRepresentation,
    *,
    claim_id: str,
    display_name: str,
    description: str,
) -> DocumentaryClaimAtom:
    """Create D without creating an admission, bridge, verification, or F."""

    _require_string(claim_id, "claim.id")
    _require_string(display_name, "claim.display_name")
    _require_string(description, "claim.description")
    assertion_bytes = canonical_model_produced_assertion(call, representation)
    content_hash = sha256(assertion_bytes).hexdigest()
    document = {
        "id": claim_id,
        "display_name": display_name,
        "assertion": assertion_bytes.decode("utf-8"),
        "description": description,
        "representation_refs": [
            {
                "kind": "Representation",
                "id": representation.id,
                "revision": representation.content_hash,
            }
        ],
        "content_hash": {"algorithm": "sha256", "value": content_hash},
    }
    return DocumentaryClaimAtom(
        document=_freeze_json(document),
        assertion_bytes=assertion_bytes,
        content_hash=content_hash,
    )
