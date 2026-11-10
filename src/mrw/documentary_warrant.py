"""Executable handoff from an exact model-response span to Lean J0.

The transfer records in this module are operational serialization formats.
They do not add domain entities: they carry an existing ``ModelCall``,
``Representation``, and documentary ``ClaimAtomVersion`` to the ordinary
justification checker.  Merely projecting a response never runs Lean or
admits a premise.  The checker is invoked only by the explicitly named
package-creation operation below.
"""

from __future__ import annotations

from dataclasses import dataclass
import ctypes
from datetime import datetime, timezone
import errno
from hashlib import sha256
import json
import os
from pathlib import Path
import platform
import signal
import shutil
import stat
import subprocess
import sys
import tempfile
import threading
from types import MappingProxyType
from typing import Any, Callable, Mapping, Sequence

from .justification import (
    ExactBinding,
    JustificationBundleError,
    ValidatedBundle,
    bundle_expectation_from_verification,
    validate_bundle,
)
from .model_projection import (
    DocumentaryClaimAtom,
    FinalizedModelCall,
    LosslessRepresentation,
    ModelProjectionError,
    extract_lossless_representation,
    make_model_produced_claim,
    parse_finalized_model_call,
)


PROJECTION_SCHEMA = "mrw.documentary-projection"
PROJECTION_SCHEMA_VERSION = 1
REQUEST_SCHEMA = "mrw.documentary-warrant-request"
REQUEST_SCHEMA_VERSION = 1
VERIFICATION_SCHEMA = "mrw.checker-verification"
VERIFICATION_SCHEMA_VERSION = 1
DOCUMENTARY_PROFILE_ID = "mrw-j0-ai-documentary-v1"
CHECKER = "MRW.Justification.checkCertificate"
CHECKER_REVISION = "justification-checker-v1"

_PROJECTION_KEYS = frozenset(
    {"schema", "schema_version", "model_call", "representation", "claim_atom_version"}
)
_REQUEST_KEYS = frozenset(
    {
        "schema",
        "schema_version",
        "fixture_id",
        "profile_id",
        "context_id",
        "admission_id",
        "admitted_by",
        "at",
        "checked_at",
        "basis_refs",
        "claim",
        "reason_variable",
        "rationale",
        "scope",
        "derivation_id",
    }
)
_CLAIM_KEYS = frozenset(
    {
        "id",
        "display_name",
        "assertion",
        "description",
        "representation_refs",
        "content_hash",
    }
)
_REFERENCE_KEYS = frozenset({"kind", "id", "revision"})
_ACTOR_KEYS = frozenset({"kind", "id"})
_VERIFICATION_KEYS = frozenset(
    {
        "id",
        "subject",
        "claim",
        "method",
        "status",
        "checker_revision",
        "environment",
        "profile",
        "context",
        "artifact_identity",
        "artifact_digest",
        "at",
    }
)
_PACKAGE_FILENAMES = (
    "projection.json",
    "request.json",
    "bundle.json",
    "verification.json",
)

JUSTIFICATION_BUNDLE_SCHEMA = "mrw.justification-bundle"
MAX_PROJECTION_BYTES = 4 * 1024 * 1024
MAX_REQUEST_BYTES = 1024 * 1024
MAX_BUNDLE_BYTES = 2 * 1024 * 1024
MAX_VERIFICATION_BYTES = 2 * 1024 * 1024

_PINNED_PLATFORM = {"system": "linux", "machine": "x86_64"}
_PINNED_CHECKER_FILES = (
    ("lean-toolchain", "toolchain_pin", "2bdc48adfa58d0017e538a0ad117c5d73d35deec879978f909406a80c8037273"),
    ("lakefile.toml", "build_configuration", "88335c65f9b47fc22a166cd660c22dd8a0aed0a8f350b6fff55b4cb13da9e0ee"),
    ("lake-manifest.json", "dependency_manifest", "791cfa5839cb7efbfd47e9844b6e65f0ad7108735602255f126ad62c9360bd29"),
    ("MRW/Justification/Syntax.lean", "checker_source", "80fd0c32339aa552086b351358be6115700075a79f9632f82fe2629a51237957"),
    ("MRW/Justification/Axioms.lean", "checker_source", "2d685cd4b31fb1d2677b3a5424de3ca5406086f121c4e4fbea59372929c58353"),
    ("MRW/Justification/ConstantSpecification.lean", "checker_source", "e7dc5d356c1e9520d2ed85373c46ee169d390cdad214b860549587ea62c0d7ac"),
    ("MRW/Justification/Derivation.lean", "checker_source", "d3bd8b5c3621bc4575fe51907f521543a67964c443285a88593972a4970e80d0"),
    ("MRW/Justification/Certificate.lean", "checker_source", "d35aa505d8f7ed51dec6cc66c3e3283aa278b32f9ecbcb7515391b10e23edc9b"),
    ("MRW/Justification/Semantics.lean", "checker_source", "a52b476ad67dbf2dbbe365b0f261722d63dafd51ae46712c9adb7e5e7effaadd"),
    ("MRW/Justification/AIInteraction.lean", "documentary_projection_source", "75850e15594152e3bb76dfece2b50efab1579dabb00bf17067d9a5abce2ed3b9"),
    ("MRW/Justification/AIInteractionBundle.lean", "bundle_serializer_source", "c1a6fe0bc959f25fe1c8e87dd1ee0d578776be5b4a0111c40084101bc05bdc7b"),
    ("Main.lean", "checker_entry_source", "001eacec1250c3564cc6d914c494470aff7526393456dfc620ec4a534b459cd8"),
    (".lake/build/lib/lean/MRW/Justification/Certificate.olean", "certificate_checker", "91cb1ada39495504a09acb1ea8c092c1e693b390133032f60b6af1112598820f"),
    (".lake/build/lib/lean/MRW/Justification/AIInteraction.olean", "documentary_projection_module", "c9f44959f39fc8ae4f613620d5e309bf9ac2387e24a2e66e671999540be92d10"),
    (".lake/build/lib/lean/MRW/Justification/AIInteractionBundle.olean", "bundle_serializer_module", "71b646be3c462547e947249397804330cf6390ec2653f36ce4a39a10feab0a34"),
    (".lake/build/bin/justification_bundle", "checker_executable", "f486cd3d2978e0fa51489c1292895a23b32b8730fa5ea14bf8236de024f1c1b7"),
)
_CHECKER_EXECUTABLE_RELATIVE = ".lake/build/bin/justification_bundle"

_PINNED_REPORTED_ENVIRONMENT = {
    "checked_artifacts": [
        {
            "digest": {
                "algorithm": "sha256",
                "value": "91cb1ada39495504a09acb1ea8c092c1e693b390133032f60b6af1112598820f",
            },
            "path": ".lake/build/lib/lean/MRW/Justification/Certificate.olean",
            "role": "certificate_checker",
        }
    ],
    "checker_source_closure": [
        {
            "digest": {"algorithm": "sha256", "value": digest},
            "path": path,
        }
        for path, digest in (
            ("MRW/Justification/Syntax.lean", "80fd0c32339aa552086b351358be6115700075a79f9632f82fe2629a51237957"),
            ("MRW/Justification/Axioms.lean", "2d685cd4b31fb1d2677b3a5424de3ca5406086f121c4e4fbea59372929c58353"),
            ("MRW/Justification/ConstantSpecification.lean", "e7dc5d356c1e9520d2ed85373c46ee169d390cdad214b860549587ea62c0d7ac"),
            ("MRW/Justification/Derivation.lean", "d3bd8b5c3621bc4575fe51907f521543a67964c443285a88593972a4970e80d0"),
            ("MRW/Justification/Certificate.lean", "d35aa505d8f7ed51dec6cc66c3e3283aa278b32f9ecbcb7515391b10e23edc9b"),
            ("MRW/Justification/Semantics.lean", "a52b476ad67dbf2dbbe365b0f261722d63dafd51ae46712c9adb7e5e7effaadd"),
        )
    ],
    "fixture_source": {
        "digest": {
            "algorithm": "sha256",
            "value": "75850e15594152e3bb76dfece2b50efab1579dabb00bf17067d9a5abce2ed3b9",
        },
        "path": "MRW/Justification/AIInteraction.lean",
    },
    "lake_manifest_digest": {
        "algorithm": "sha256",
        "value": "791cfa5839cb7efbfd47e9844b6e65f0ad7108735602255f126ad62c9360bd29",
    },
    "lakefile_digest": {
        "algorithm": "sha256",
        "value": "88335c65f9b47fc22a166cd660c22dd8a0aed0a8f350b6fff55b4cb13da9e0ee",
    },
    "lean_commit": "f3b06c705e6c85f5314019d5d3baab0fec5b580c",
    "lean_version": "4.32.2",
    "toolchain_digest": {
        "algorithm": "sha256",
        "value": "2bdc48adfa58d0017e538a0ad117c5d73d35deec879978f909406a80c8037273",
    },
}


class DocumentaryWarrantError(ValueError):
    """Raised when the operational handoff cannot be trusted."""


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


def _thaw(value: object) -> object:
    if isinstance(value, Mapping):
        return {str(key): _thaw(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_thaw(item) for item in value]
    return value


def _freeze(value: Any) -> Any:
    if isinstance(value, Mapping):
        return MappingProxyType({str(key): _freeze(item) for key, item in value.items()})
    if isinstance(value, (list, tuple)):
        return tuple(_freeze(item) for item in value)
    return value


def _encode(value: object) -> bytes:
    return (
        json.dumps(
            _thaw(value),
            ensure_ascii=False,
            allow_nan=False,
            separators=(",", ":"),
            sort_keys=True,
        )
        + "\n"
    ).encode("utf-8", errors="strict")


def _validate_json_tree(
    value: object,
    description: str,
    *,
    depth: int = 0,
) -> None:
    if depth > 100:
        raise DocumentaryWarrantError(
            f"{description} JSON nesting exceeds 100 levels"
        )
    if isinstance(value, str):
        try:
            value.encode("utf-8", errors="strict")
        except UnicodeEncodeError as exc:
            raise DocumentaryWarrantError(
                f"{description} contains non-Unicode string data"
            ) from exc
    elif isinstance(value, dict):
        for key, item in value.items():
            _validate_json_tree(key, description, depth=depth + 1)
            _validate_json_tree(item, description, depth=depth + 1)
    elif isinstance(value, list):
        for item in value:
            _validate_json_tree(item, description, depth=depth + 1)


def _parse_json(
    raw: bytes,
    description: str,
    *,
    max_bytes: int,
) -> dict[str, object]:
    if not isinstance(raw, bytes):
        raise TypeError(f"raw {description} must be bytes")
    if len(raw) > max_bytes:
        raise DocumentaryWarrantError(
            f"{description} exceeds the {max_bytes}-byte limit"
        )
    try:
        text = raw.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise DocumentaryWarrantError(f"{description} is not strict UTF-8") from exc
    try:
        parsed = json.loads(
            text,
            object_pairs_hook=_reject_duplicate_keys,
            parse_constant=_reject_nonstandard_json_constant,
        )
    except _DuplicateKeyError as exc:
        raise DocumentaryWarrantError(
            f"{description} contains duplicate JSON key: {exc}"
        ) from exc
    except _NonstandardJsonConstantError as exc:
        raise DocumentaryWarrantError(
            f"{description} contains non-standard JSON number: {exc}"
        ) from exc
    except json.JSONDecodeError as exc:
        raise DocumentaryWarrantError(
            f"{description} is not valid JSON: {exc.msg}"
        ) from exc
    except RecursionError as exc:
        raise DocumentaryWarrantError(
            f"{description} JSON nesting is excessive"
        ) from exc
    if not isinstance(parsed, dict):
        raise DocumentaryWarrantError(f"{description} must be a JSON object")
    _validate_json_tree(parsed, description)
    return parsed


def _exact_keys(value: Mapping[str, object], expected: frozenset[str], path: str) -> None:
    actual = frozenset(value)
    if actual != expected:
        missing = ", ".join(sorted(expected - actual))
        extra = ", ".join(sorted(actual - expected))
        detail = "; ".join(
            part for part in (f"missing {missing}" if missing else "", f"unexpected {extra}" if extra else "") if part
        )
        raise DocumentaryWarrantError(f"{path} has wrong fields: {detail}")


def _string(value: object, path: str) -> str:
    if not isinstance(value, str) or not value:
        raise DocumentaryWarrantError(f"{path} must be a non-empty string")
    unsafe = next(
        (
            character
            for character in value
            if ord(character) < 0x20
            or 0x7F <= ord(character) <= 0x9F
            or ord(character) in (0x061C, 0x200E, 0x200F)
            or 0x202A <= ord(character) <= 0x202E
            or 0x2066 <= ord(character) <= 0x2069
        ),
        None,
    )
    if unsafe is not None:
        raise DocumentaryWarrantError(
            f"{path} contains unsafe terminal control U+{ord(unsafe):04X}"
        )
    return value


def _integer(value: object, path: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise DocumentaryWarrantError(f"{path} must be an integer")
    return value


def _timestamp(value: object, path: str) -> datetime:
    encoded = _string(value, path)
    try:
        parsed = datetime.strptime(encoded, "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=timezone.utc
        )
    except ValueError as exc:
        raise DocumentaryWarrantError(
            f"{path} must be canonical UTC YYYY-MM-DDTHH:MM:SSZ"
        ) from exc
    if parsed.strftime("%Y-%m-%dT%H:%M:%SZ") != encoded:
        raise DocumentaryWarrantError(
            f"{path} must be canonical UTC YYYY-MM-DDTHH:MM:SSZ"
        )
    return parsed


def _utc_timestamp(value: datetime) -> str:
    if value.tzinfo is None or value.utcoffset() is None:
        raise DocumentaryWarrantError("checker clock must return an aware datetime")
    normalized = value.astimezone(timezone.utc).replace(microsecond=0)
    return normalized.strftime("%Y-%m-%dT%H:%M:%SZ")


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _digest(value: object, path: str) -> str:
    encoded = _string(value, path)
    if len(encoded) != 64 or any(character not in "0123456789abcdef" for character in encoded):
        raise DocumentaryWarrantError(f"{path} must be a lowercase SHA-256 digest")
    return encoded


def _object(value: object, path: str) -> dict[str, object]:
    if not isinstance(value, dict):
        raise DocumentaryWarrantError(f"{path} must be a JSON object")
    return value


def _array(value: object, path: str) -> list[object]:
    if not isinstance(value, list):
        raise DocumentaryWarrantError(f"{path} must be a JSON array")
    return value


def _reference(value: object, path: str) -> dict[str, object]:
    reference = _object(value, path)
    _exact_keys(reference, _REFERENCE_KEYS, path)
    _string(reference["kind"], f"{path}.kind")
    _string(reference["id"], f"{path}.id")
    _string(reference["revision"], f"{path}.revision")
    return reference


def _actor(value: object, path: str) -> dict[str, object]:
    actor = _object(value, path)
    _exact_keys(actor, _ACTOR_KEYS, path)
    kind = _string(actor["kind"], f"{path}.kind")
    if kind not in ("person", "named_policy"):
        raise DocumentaryWarrantError(
            f"{path}.kind must be person or named_policy"
        )
    _string(actor["id"], f"{path}.id")
    return actor


@dataclass(frozen=True)
class DocumentaryProjection:
    """The three existing records used by the operational checker handoff."""

    call: FinalizedModelCall
    representation: LosslessRepresentation
    claim: DocumentaryClaimAtom


@dataclass(frozen=True)
class CheckerRun:
    """One explicit checker process result with each stream captured once."""

    stdout: bytes
    stderr: bytes
    argv: tuple[str, ...]
    checker_identity: Mapping[str, object]


@dataclass(frozen=True)
class DocumentaryWarrantPackage:
    """A reloaded and validated runtime package."""

    path: Path
    projection: DocumentaryProjection
    request: Mapping[str, object]
    verification: Mapping[str, object]
    bundle: ValidatedBundle


def make_documentary_projection(
    call: FinalizedModelCall,
    representation: LosslessRepresentation,
    claim: DocumentaryClaimAtom,
) -> DocumentaryProjection:
    """Cross-check the three records without admitting or running anything."""

    expected = make_model_produced_claim(
        call,
        representation,
        claim_id=_string(claim.document.get("id"), "claim_atom_version.id"),
        display_name=_string(
            claim.document.get("display_name"),
            "claim_atom_version.display_name",
        ),
        description=_string(
            claim.document.get("description"),
            "claim_atom_version.description",
        ),
    )
    if _thaw(expected.document) != _thaw(claim.document):
        raise DocumentaryWarrantError(
            "claim_atom_version is not the canonical documentary claim for the response span"
        )
    return DocumentaryProjection(call, representation, claim)


def encode_documentary_projection(projection: DocumentaryProjection) -> bytes:
    """Serialize the operational projection; this performs no checker action."""

    checked = make_documentary_projection(
        projection.call,
        projection.representation,
        projection.claim,
    )
    encoded = _encode(
        {
            "schema": PROJECTION_SCHEMA,
            "schema_version": PROJECTION_SCHEMA_VERSION,
            "model_call": checked.call.document,
            "representation": checked.representation.document,
            "claim_atom_version": checked.claim.document,
        }
    )
    if len(encoded) > MAX_PROJECTION_BYTES:
        raise DocumentaryWarrantError(
            f"documentary projection exceeds the {MAX_PROJECTION_BYTES}-byte limit"
        )
    return encoded


def parse_documentary_projection(raw: bytes) -> DocumentaryProjection:
    """Parse and independently reconstruct the three projected records."""

    record = _parse_json(
        raw,
        "documentary projection",
        max_bytes=MAX_PROJECTION_BYTES,
    )
    _exact_keys(record, _PROJECTION_KEYS, "projection")
    if record["schema"] != PROJECTION_SCHEMA:
        raise DocumentaryWarrantError("projection.schema is not supported")
    if _integer(record["schema_version"], "projection.schema_version") != 1:
        raise DocumentaryWarrantError("projection.schema_version is not supported")

    try:
        call = parse_finalized_model_call(_encode(record["model_call"]))
        representation_record = _object(record["representation"], "projection.representation")
        provenance = _object(
            representation_record.get("provenance"),
            "projection.representation.provenance",
        )
        span = _object(
            provenance.get("response_span"),
            "projection.representation.provenance.response_span",
        )
        representation = extract_lossless_representation(
            call,
            representation_id=_string(
                representation_record.get("id"), "projection.representation.id"
            ),
            version=_string(
                representation_record.get("version"),
                "projection.representation.version",
            ),
            subject=_object(
                representation_record.get("subject"),
                "projection.representation.subject",
            ),
            kind=_string(
                representation_record.get("kind"),
                "projection.representation.kind",
            ),
            start_byte=_integer(
                span.get("start_byte"),
                "projection.representation.provenance.response_span.start_byte",
            ),
            end_byte=_integer(
                span.get("end_byte"),
                "projection.representation.provenance.response_span.end_byte",
            ),
        )
        if _thaw(representation.document) != representation_record:
            raise DocumentaryWarrantError(
                "projection.representation is not the canonical exact-span record"
            )
        claim_record = _object(record["claim_atom_version"], "projection.claim_atom_version")
        claim = make_model_produced_claim(
            call,
            representation,
            claim_id=_string(claim_record.get("id"), "projection.claim_atom_version.id"),
            display_name=_string(
                claim_record.get("display_name"),
                "projection.claim_atom_version.display_name",
            ),
            description=_string(
                claim_record.get("description"),
                "projection.claim_atom_version.description",
            ),
        )
    except ModelProjectionError as exc:
        raise DocumentaryWarrantError(str(exc)) from exc
    if _thaw(claim.document) != claim_record:
        raise DocumentaryWarrantError(
            "projection.claim_atom_version is not the canonical documentary claim"
        )
    return DocumentaryProjection(call, representation, claim)


def build_lean_request(
    projection: DocumentaryProjection,
    *,
    fixture_id: str,
    context_id: str,
    admission_id: str,
    admitted_by: Mapping[str, object],
    at: str,
    reason_variable: str,
    rationale: str,
    scope: str,
    derivation_id: str,
) -> bytes:
    """Create the explicit admission request consumed by the Lean executable."""

    checked = make_documentary_projection(
        projection.call,
        projection.representation,
        projection.claim,
    )
    actor = _actor(dict(admitted_by), "request.admitted_by")
    claim = _thaw(checked.claim.document)
    assert isinstance(claim, dict)
    claim_digest = _object(claim["content_hash"], "claim.content_hash")
    request = {
        "schema": REQUEST_SCHEMA,
        "schema_version": REQUEST_SCHEMA_VERSION,
        "fixture_id": _string(fixture_id, "request.fixture_id"),
        "profile_id": DOCUMENTARY_PROFILE_ID,
        "context_id": _string(context_id, "request.context_id"),
        "admission_id": _string(admission_id, "request.admission_id"),
        "admitted_by": actor,
        "at": _string(at, "request.at"),
        "checked_at": None,
        "basis_refs": [
            {
                "kind": "ModelCall",
                "id": checked.call.id,
                "revision": checked.call.raw_response_digest,
            },
            {
                "kind": "Representation",
                "id": checked.representation.id,
                "revision": checked.representation.content_hash,
            },
        ],
        "claim": {
            "id": claim["id"],
            "display_name": claim["display_name"],
            "assertion": claim["assertion"],
            "description": claim["description"],
            "representation_refs": claim["representation_refs"],
            "content_hash": _digest(
                claim_digest.get("value"), "claim.content_hash.value"
            ),
        },
        "reason_variable": _string(reason_variable, "request.reason_variable"),
        "rationale": _string(rationale, "request.rationale"),
        "scope": _string(scope, "request.scope"),
        "derivation_id": _string(derivation_id, "request.derivation_id"),
    }
    raw = _encode(request)
    parse_lean_request(raw, projection=checked)
    return raw


def parse_lean_request(
    raw: bytes,
    *,
    projection: DocumentaryProjection | None = None,
    require_checked: bool = False,
) -> Mapping[str, object]:
    """Parse the exact narrow transfer object accepted by Lean."""

    request = _parse_json(
        raw,
        "documentary warrant request",
        max_bytes=MAX_REQUEST_BYTES,
    )
    _exact_keys(request, _REQUEST_KEYS, "request")
    if request["schema"] != REQUEST_SCHEMA:
        raise DocumentaryWarrantError("request.schema is not supported")
    if _integer(request["schema_version"], "request.schema_version") != 1:
        raise DocumentaryWarrantError("request.schema_version is not supported")
    if request["profile_id"] != DOCUMENTARY_PROFILE_ID:
        raise DocumentaryWarrantError(
            f"request.profile_id must be {DOCUMENTARY_PROFILE_ID}"
        )
    for key in (
        "fixture_id",
        "context_id",
        "admission_id",
        "reason_variable",
        "rationale",
        "scope",
        "derivation_id",
    ):
        _string(request[key], f"request.{key}")
    admitted_at = _timestamp(request["at"], "request.at")
    checked_value = request["checked_at"]
    if checked_value is None:
        if require_checked:
            raise DocumentaryWarrantError(
                "request.checked_at must be set by check-documentary"
            )
    else:
        checked_at = _timestamp(checked_value, "request.checked_at")
        if checked_at < admitted_at:
            raise DocumentaryWarrantError(
                "request.checked_at must not precede request.at"
            )
    _actor(request["admitted_by"], "request.admitted_by")
    basis = _array(request["basis_refs"], "request.basis_refs")
    if len(basis) != 2:
        raise DocumentaryWarrantError(
            "request.basis_refs must contain exactly ModelCall and Representation"
        )
    call_reference = _reference(basis[0], "request.basis_refs[0]")
    representation_reference = _reference(basis[1], "request.basis_refs[1]")
    if call_reference["kind"] != "ModelCall" or representation_reference["kind"] != "Representation":
        raise DocumentaryWarrantError(
            "request.basis_refs must be ordered ModelCall then Representation"
        )
    _digest(call_reference["revision"], "request.basis_refs[0].revision")
    _digest(
        representation_reference["revision"],
        "request.basis_refs[1].revision",
    )

    claim = _object(request["claim"], "request.claim")
    _exact_keys(claim, _CLAIM_KEYS, "request.claim")
    for key in ("id", "display_name", "assertion", "description"):
        _string(claim[key], f"request.claim.{key}")
    _digest(claim["content_hash"], "request.claim.content_hash")
    claim_refs = _array(claim["representation_refs"], "request.claim.representation_refs")
    if len(claim_refs) != 1:
        raise DocumentaryWarrantError(
            "request.claim.representation_refs must contain exactly one Representation"
        )
    if _reference(claim_refs[0], "request.claim.representation_refs[0]") != representation_reference:
        raise DocumentaryWarrantError(
            "request.claim.representation_refs does not match request.basis_refs"
        )
    try:
        payload = json.loads(str(claim["assertion"]))
    except json.JSONDecodeError as exc:
        raise DocumentaryWarrantError("request.claim.assertion is not JSON") from exc
    if (
        not isinstance(payload, list)
        or len(payload) != 7
        or payload[0] != "model-produced-v1"
        or _encode(payload)[:-1].decode("utf-8") != claim["assertion"]
    ):
        raise DocumentaryWarrantError(
            "request.claim.assertion is not the canonical model-produced payload"
        )
    _string(payload[1], "request.claim.assertion.call_id")
    _digest(payload[2], "request.claim.assertion.response_digest")
    start = _integer(payload[3], "request.claim.assertion.start_byte")
    end = _integer(payload[4], "request.claim.assertion.end_byte")
    if start < 0 or end <= start:
        raise DocumentaryWarrantError(
            "request.claim.assertion span must be non-empty and half-open"
        )
    _string(payload[5], "request.claim.assertion.representation_id")
    _digest(payload[6], "request.claim.assertion.representation_content_hash")
    if sha256(str(claim["assertion"]).encode("utf-8")).hexdigest() != claim["content_hash"]:
        raise DocumentaryWarrantError(
            "request.claim.content_hash does not match the canonical assertion bytes"
        )
    if (
        payload[1] != call_reference["id"]
        or payload[2] != call_reference["revision"]
        or payload[5] != representation_reference["id"]
        or payload[6] != representation_reference["revision"]
    ):
        raise DocumentaryWarrantError(
            "request claim payload does not match its basis references"
        )
    if projection is not None:
        checked = make_documentary_projection(
            projection.call,
            projection.representation,
            projection.claim,
        )
        expected_claim = _thaw(checked.claim.document)
        assert isinstance(expected_claim, dict)
        expected_digest = _object(
            expected_claim["content_hash"],
            "projection.claim_atom_version.content_hash",
        )["value"]
        expected_claim["content_hash"] = expected_digest
        expected_basis = [
            {
                "kind": "ModelCall",
                "id": checked.call.id,
                "revision": checked.call.raw_response_digest,
            },
            {
                "kind": "Representation",
                "id": checked.representation.id,
                "revision": checked.representation.content_hash,
            },
        ]
        if claim != expected_claim or basis != expected_basis:
            raise DocumentaryWarrantError(
                "request does not match its ModelCall, Representation, and documentary claim"
            )
        finalized_at = _timestamp(
            checked.call.finalized_at,
            "projection.model_call.finalized_at",
        )
        if admitted_at < finalized_at:
            raise DocumentaryWarrantError(
                "request.at must not precede the finalized ModelCall"
            )
    return _freeze(request)


def _hash_regular_file(path: Path, description: str) -> str:
    try:
        metadata = path.lstat()
    except OSError as exc:
        raise DocumentaryWarrantError(f"{description} is unavailable: {exc}") from exc
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISREG(metadata.st_mode):
        raise DocumentaryWarrantError(
            f"{description} must be a regular non-symlink file"
        )
    if metadata.st_size > 128 * 1024 * 1024:
        raise DocumentaryWarrantError(f"{description} is unexpectedly large")
    digest = sha256()
    try:
        with path.open("rb") as stream:
            while chunk := stream.read(1024 * 1024):
                digest.update(chunk)
    except OSError as exc:
        raise DocumentaryWarrantError(f"could not read {description}: {exc}") from exc
    return digest.hexdigest()


def _validate_checker_installation(lean_root: Path) -> tuple[Path, Mapping[str, object]]:
    """Anchor the executable handoff to the pinned Linux/WSL Lean build."""

    root = lean_root.resolve(strict=True)
    if not root.is_dir():
        raise DocumentaryWarrantError("Lean root is not a directory")
    machine = platform.machine().lower()
    if machine == "amd64":
        machine = "x86_64"
    actual_platform = {"system": sys.platform, "machine": machine}
    if actual_platform != _PINNED_PLATFORM:
        raise DocumentaryWarrantError(
            "the current documentary checker identity is pinned for Linux x86-64/WSL"
        )

    files: list[dict[str, object]] = []
    for relative, role, expected in _PINNED_CHECKER_FILES:
        path = root / relative
        actual = _hash_regular_file(path, f"pinned checker file {relative}")
        if actual != expected:
            raise DocumentaryWarrantError(
                f"pinned checker file has unexpected SHA-256: {relative}"
            )
        files.append(
            {
                "path": relative,
                "role": role,
                "digest": {"algorithm": "sha256", "value": actual},
            }
        )
    executable = root / _CHECKER_EXECUTABLE_RELATIVE
    if not os.access(executable, os.X_OK):
        raise DocumentaryWarrantError("pinned checker executable is not executable")
    identity = {
        "platform": actual_platform,
        "files": files,
    }
    return executable, _freeze(identity)


def _terminate_checker(process: subprocess.Popen[bytes]) -> None:
    try:
        if os.name == "posix":
            os.killpg(process.pid, signal.SIGKILL)
        else:
            process.kill()
    except ProcessLookupError:
        pass


def _rename_no_replace(source: Path, destination: Path) -> None:
    """Atomically install one Linux runtime package without replacing a path."""

    libc = ctypes.CDLL(None, use_errno=True)
    try:
        renameat2 = libc.renameat2
    except AttributeError as exc:
        raise DocumentaryWarrantError(
            "atomic no-replace package installation is unavailable"
        ) from exc
    renameat2.argtypes = [
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_int,
        ctypes.c_char_p,
        ctypes.c_uint,
    ]
    renameat2.restype = ctypes.c_int
    result = renameat2(
        -100,
        os.fsencode(source),
        -100,
        os.fsencode(destination),
        1,
    )
    if result == 0:
        return
    error = ctypes.get_errno()
    if error == errno.EEXIST:
        raise DocumentaryWarrantError(
            "documentary warrant destination already exists"
        )
    raise DocumentaryWarrantError(
        f"could not atomically install documentary package: {os.strerror(error)}"
    )


def _read_limited(
    stream: Any,
    limit: int,
    overflow: threading.Event,
    process: subprocess.Popen[bytes],
    destination: bytearray,
) -> None:
    try:
        while True:
            chunk = stream.read(65536)
            if not chunk:
                break
            destination.extend(chunk)
            if len(destination) > limit:
                overflow.set()
                _terminate_checker(process)
                break
    finally:
        stream.close()


def run_lean_documentary_checker(
    lean_root: Path,
    request_path: Path,
    *,
    timeout_seconds: float = 30.0,
    output_limit: int = 2 * 1024 * 1024,
) -> CheckerRun:
    """Explicitly invoke the fixed documentary-checker command once.

    The bundle is the single captured stdout byte stream.  Diagnostics are a
    separately bounded stderr stream.  No shell or inherited credential
    environment is involved.
    """

    if timeout_seconds <= 0:
        raise ValueError("timeout_seconds must be positive")
    if output_limit <= 0:
        raise ValueError("output_limit must be positive")
    working_directory = lean_root.resolve(strict=True)
    executable, checker_identity = _validate_checker_installation(
        working_directory
    )
    try:
        request_metadata = request_path.lstat()
    except OSError as exc:
        raise DocumentaryWarrantError(
            f"documentary request is unavailable: {exc}"
        ) from exc
    if stat.S_ISLNK(request_metadata.st_mode) or not stat.S_ISREG(
        request_metadata.st_mode
    ):
        raise DocumentaryWarrantError(
            "request path must be a regular non-symlink file"
        )
    if request_metadata.st_size > MAX_REQUEST_BYTES:
        raise DocumentaryWarrantError(
            f"documentary request exceeds the {MAX_REQUEST_BYTES}-byte limit"
        )
    request = request_path.resolve(strict=True)
    argv = (
        str(executable),
        "--documentary-warrant",
        str(request),
        "--stdout",
    )
    safe_environment = {
        "PATH": "/usr/bin:/bin",
        "LANG": "C.UTF-8",
        "LC_ALL": "C.UTF-8",
        "NO_COLOR": "1",
    }
    try:
        process = subprocess.Popen(
            argv,
            shell=False,
            cwd=working_directory,
            env=safe_environment,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            close_fds=True,
            start_new_session=True,
        )
    except OSError as exc:
        raise DocumentaryWarrantError(f"could not start Lean checker: {exc}") from exc
    assert process.stdout is not None and process.stderr is not None
    stdout = bytearray()
    stderr = bytearray()
    overflow = threading.Event()
    readers = (
        threading.Thread(
            target=_read_limited,
            args=(process.stdout, output_limit, overflow, process, stdout),
            daemon=True,
        ),
        threading.Thread(
            target=_read_limited,
            args=(process.stderr, output_limit, overflow, process, stderr),
            daemon=True,
        ),
    )
    for reader in readers:
        reader.start()
    try:
        exit_code = process.wait(timeout=timeout_seconds)
    except subprocess.TimeoutExpired as exc:
        _terminate_checker(process)
        process.wait()
        for reader in readers:
            reader.join(timeout=2.0)
        raise DocumentaryWarrantError("Lean checker timed out") from exc
    for reader in readers:
        reader.join(timeout=2.0)
    if any(reader.is_alive() for reader in readers):
        _terminate_checker(process)
        raise DocumentaryWarrantError("Lean checker output streams did not close")
    if overflow.is_set():
        raise DocumentaryWarrantError("Lean checker exceeded its output limit")
    if exit_code != 0:
        diagnostic = bytes(stderr[:4096]).decode("utf-8", errors="replace").strip()
        diagnostic = json.dumps(diagnostic, ensure_ascii=True)[1:-1]
        suffix = f": {diagnostic}" if diagnostic else ""
        raise DocumentaryWarrantError(
            f"Lean checker exited with status {exit_code}{suffix}"
        )
    if not stdout:
        raise DocumentaryWarrantError("Lean checker returned an empty bundle")
    return CheckerRun(
        bytes(stdout),
        bytes(stderr),
        argv,
        checker_identity,
    )


def _bundle_components_from_request(request: Mapping[str, object]) -> dict[str, object]:
    claim = _thaw(request["claim"])
    assert isinstance(claim, dict)
    claim_hash = _digest(claim["content_hash"], "request.claim.content_hash")
    atom = [
        "atom",
        {
            "content_hash": {"algorithm": "sha256", "value": claim_hash},
            "id": claim["id"],
        },
    ]
    formula = ["reason", ["variable", request["reason_variable"]], atom]
    actor = _thaw(request["admitted_by"])
    basis = _thaw(request["basis_refs"])
    claim["content_hash"] = {"algorithm": "sha256", "value": claim_hash}
    admission = {
        "admitted_by": actor,
        "at": request["at"],
        "basis_refs": basis,
        "formula": formula,
        "id": request["admission_id"],
        "rationale": request["rationale"],
        "scope": request["scope"],
        "supersedes": None,
    }
    context = {
        "added": [request["admission_id"]],
        "admissions": [request["admission_id"]],
        "change_kind": "initial",
        "created_at": request["at"],
        "created_by": actor,
        "id": request["context_id"],
        "predecessor": None,
        "profile": request["profile_id"],
        "rationale": request["rationale"],
        "removed": [],
    }
    derivation = {
        "certificate_version": "ordered-dag-certificate-v1",
        "conclusion": formula,
        "constant_specification_footprint": [],
        "context": request["context_id"],
        "dependency_refs": [
            {
                "kind": "ClaimAtomVersion",
                "id": claim["id"],
                "revision": claim_hash,
            },
            *basis,
        ],
        "id": request["derivation_id"],
        "nodes": [
            {
                "formula": formula,
                "index": 0,
                "rule": {
                    "admission_id": request["admission_id"],
                    "kind": "premise",
                },
            }
        ],
        "profile": request["profile_id"],
    }
    return {
        "claims": [claim],
        "admissions": [admission],
        "context": context,
        "derivation": derivation,
        "external_verifications": [],
        "related_source_bindings": [],
    }


def _pinned_checker_identity_document() -> dict[str, object]:
    return {
        "platform": dict(_PINNED_PLATFORM),
        "files": [
            {
                "path": path,
                "role": role,
                "digest": {"algorithm": "sha256", "value": digest},
            }
            for path, role, digest in _PINNED_CHECKER_FILES
        ],
    }


def _validate_pinned_verification_environment(
    environment: object,
) -> dict[str, object]:
    record = _object(environment, "verification.environment")
    _exact_keys(
        record,
        frozenset(
            {
                "reported_checker_environment",
                "reported_verification",
                "runtime_checker",
                "input_artifacts",
            }
        ),
        "verification.environment",
    )
    reported = _object(
        record["reported_checker_environment"],
        "verification.environment.reported_checker_environment",
    )
    runtime = _object(
        record["runtime_checker"],
        "verification.environment.runtime_checker",
    )
    inputs = _array(
        record["input_artifacts"],
        "verification.environment.input_artifacts",
    )
    if len(inputs) != 2:
        raise DocumentaryWarrantError(
            "verification.environment.input_artifacts must contain projection and request"
        )
    for index, expected_path in enumerate(("projection.json", "request.json")):
        item = _object(
            inputs[index],
            f"verification.environment.input_artifacts[{index}]",
        )
        _exact_keys(
            item,
            frozenset({"path", "digest"}),
            f"verification.environment.input_artifacts[{index}]",
        )
        if item["path"] != expected_path:
            raise DocumentaryWarrantError(
                "verification input artifacts must be ordered projection then request"
            )
        digest = _object(
            item["digest"],
            f"verification.environment.input_artifacts[{index}].digest",
        )
        _exact_keys(
            digest,
            frozenset({"algorithm", "value"}),
            f"verification.environment.input_artifacts[{index}].digest",
        )
        if digest["algorithm"] != "sha256":
            raise DocumentaryWarrantError(
                "verification input artifacts must use SHA-256"
            )
        _digest(
            digest["value"],
            f"verification.environment.input_artifacts[{index}].digest.value",
        )
    if reported != _PINNED_REPORTED_ENVIRONMENT:
        raise DocumentaryWarrantError(
            "Verification does not name the pinned reported Lean environment"
        )
    if runtime != _pinned_checker_identity_document():
        raise DocumentaryWarrantError(
            "Verification does not name the pinned runtime checker identity"
        )
    return record


def _runtime_verification(
    bundle_raw: bytes,
    request: Mapping[str, object],
    checker_identity: Mapping[str, object],
    projection_raw: bytes,
    request_raw: bytes,
) -> Mapping[str, object]:
    """Create the external verification at the captured-byte trust boundary."""

    document = _parse_json(
        bundle_raw,
        "captured Lean bundle",
        max_bytes=MAX_BUNDLE_BYTES,
    )
    try:
        identity = {
            "schema": _string(document.get("schema"), "bundle.schema"),
            "schema_version": _integer(
                document.get("schema_version"), "bundle.schema_version"
            ),
            "fixture_id": _string(document.get("fixture_id"), "bundle.fixture_id"),
        }
        profile = _object(document.get("profile"), "bundle.profile")
        context = _object(document.get("context"), "bundle.context")
        embedded = _object(
            document.get("justification_verification"),
            "bundle.justification_verification",
        )
        environment = _object(
            embedded.get("environment"),
            "bundle.justification_verification.environment",
        )
    except DocumentaryWarrantError:
        raise
    if identity["schema"] != JUSTIFICATION_BUNDLE_SCHEMA:
        raise DocumentaryWarrantError("captured bundle has the wrong schema")
    if identity["schema_version"] != 1:
        raise DocumentaryWarrantError("captured bundle has the wrong schema version")
    if identity["fixture_id"] != request["fixture_id"]:
        raise DocumentaryWarrantError("captured bundle names a different fixture")
    if profile.get("id") != DOCUMENTARY_PROFILE_ID:
        raise DocumentaryWarrantError("captured bundle names an unexpected profile")
    if profile.get("checker") != CHECKER or profile.get("checker_version") != CHECKER_REVISION:
        raise DocumentaryWarrantError("captured bundle names an unexpected checker")
    expected_embedded = {
        "id": f"verification-{request['fixture_id']}",
        "subject": request["derivation_id"],
        "claim_checked": (
            "The certificate denotes the documentary conclusion under the exact profile and context."
        ),
        "method": "justification_checker",
        "result": "passed",
        "checker": CHECKER,
        "checker_revision": CHECKER_REVISION,
        "environment": environment,
        "profile": DOCUMENTARY_PROFILE_ID,
        "context": request["context_id"],
        "at": request["checked_at"],
    }
    if embedded != expected_embedded:
        raise DocumentaryWarrantError(
            "captured bundle checker metadata does not match the request and trusted checker"
        )
    if context.get("id") != request["context_id"]:
        raise DocumentaryWarrantError("captured bundle names a different context")
    if not environment:
        raise DocumentaryWarrantError("captured bundle has no checker environment")
    if environment != _PINNED_REPORTED_ENVIRONMENT:
        raise DocumentaryWarrantError(
            "captured bundle does not report the pinned checker environment"
        )
    if _thaw(checker_identity) != _pinned_checker_identity_document():
        raise DocumentaryWarrantError(
            "checker process does not match the pinned runtime identity"
        )
    handoff_at = _string(request["checked_at"], "verification.at")
    verification = {
        "id": f"runtime-verification-{request['fixture_id']}",
        "subject": embedded["subject"],
        "claim": embedded["claim_checked"],
        "method": "justification_checker",
        "status": "verified",
        "checker_revision": embedded["checker_revision"],
        "environment": {
            "input_artifacts": [
                {
                    "path": "projection.json",
                    "digest": {
                        "algorithm": "sha256",
                        "value": sha256(projection_raw).hexdigest(),
                    },
                },
                {
                    "path": "request.json",
                    "digest": {
                        "algorithm": "sha256",
                        "value": sha256(request_raw).hexdigest(),
                    },
                },
            ],
            "reported_checker_environment": environment,
            "reported_verification": embedded,
            "runtime_checker": checker_identity,
        },
        "profile": profile,
        "context": context,
        "artifact_identity": identity,
        "artifact_digest": {
            "algorithm": "sha256",
            "value": sha256(bundle_raw).hexdigest(),
        },
        "at": handoff_at,
    }
    return _freeze(verification)


def _validate_runtime_artifacts(
    projection: DocumentaryProjection,
    request: Mapping[str, object],
    verification: Mapping[str, object],
    bundle_raw: bytes,
) -> ValidatedBundle:
    parse_lean_request(
        _encode(request),
        projection=projection,
        require_checked=True,
    )
    environment = _validate_pinned_verification_environment(
        _thaw(verification.get("environment"))
    )
    expected_verification_id = f"runtime-verification-{request['fixture_id']}"
    if verification.get("id") != expected_verification_id:
        raise DocumentaryWarrantError(
            "runtime Verification id does not match the documentary fixture"
        )
    if verification.get("at") != request["checked_at"]:
        raise DocumentaryWarrantError(
            "runtime Verification time does not match the checker request"
        )
    inputs = _array(
        environment["input_artifacts"],
        "verification.environment.input_artifacts",
    )
    expected_input_digests = (
        sha256(encode_documentary_projection(projection)).hexdigest(),
        sha256(_encode(request)).hexdigest(),
    )
    for index, expected in enumerate(expected_input_digests):
        item = _object(
            inputs[index],
            f"verification.environment.input_artifacts[{index}]",
        )
        digest = _object(
            item["digest"],
            f"verification.environment.input_artifacts[{index}].digest",
        )
        if digest.get("value") != expected:
            raise DocumentaryWarrantError(
                "Verification input-artifact digest does not match retained bytes"
            )
    components = _bundle_components_from_request(request)
    exact = tuple(
        ExactBinding((key,), value)
        for key, value in components.items()
    )
    try:
        expectation = bundle_expectation_from_verification(
            verification,
            exact_bindings=exact,
        )
        return validate_bundle(bundle_raw, expectation)
    except JustificationBundleError as exc:
        raise DocumentaryWarrantError(str(exc)) from exc


def _parse_verification(raw: bytes) -> Mapping[str, object]:
    verification = _parse_json(
        raw,
        "runtime verification",
        max_bytes=MAX_VERIFICATION_BYTES,
    )
    _exact_keys(verification, _VERIFICATION_KEYS, "verification")
    if verification.get("method") != "justification_checker":
        raise DocumentaryWarrantError(
            "verification.method must be justification_checker"
        )
    if verification.get("status") != "verified":
        raise DocumentaryWarrantError("verification.status must be verified")
    _string(verification.get("id"), "verification.id")
    _timestamp(verification.get("at"), "verification.at")
    identity = _object(
        verification.get("artifact_identity"),
        "verification.artifact_identity",
    )
    if identity.get("schema") != JUSTIFICATION_BUNDLE_SCHEMA:
        raise DocumentaryWarrantError(
            "verification artifact has the wrong schema"
        )
    if identity.get("schema_version") != 1:
        raise DocumentaryWarrantError(
            "verification artifact has the wrong schema version"
        )
    _validate_pinned_verification_environment(verification.get("environment"))
    try:
        bundle_expectation_from_verification(verification)
    except JustificationBundleError as exc:
        raise DocumentaryWarrantError(str(exc)) from exc
    return _freeze(verification)


def create_documentary_warrant_package(
    destination: Path,
    projection_raw: bytes,
    request_raw: bytes,
    *,
    lean_root: Path,
    timeout_seconds: float = 30.0,
    output_limit: int = 2 * 1024 * 1024,
    clock: Callable[[], datetime] = _now_utc,
) -> DocumentaryWarrantPackage:
    """Explicitly check and atomically persist one new documentary package.

    The destination must not exist.  The request, exact captured bundle bytes,
    and independently retained generic verification appear together only when
    all cross-checks have succeeded.
    """

    target = destination.resolve(strict=False)
    parent = target.parent.resolve(strict=True)
    if target.exists():
        raise DocumentaryWarrantError("documentary warrant destination already exists")
    projection = parse_documentary_projection(projection_raw)
    if projection_raw != encode_documentary_projection(projection):
        raise DocumentaryWarrantError(
            "documentary projection must use canonical JSON bytes"
        )
    admission_request = parse_lean_request(request_raw, projection=projection)
    if request_raw != _encode(admission_request):
        raise DocumentaryWarrantError(
            "documentary admission request must use canonical JSON bytes"
        )
    if admission_request["checked_at"] is not None:
        raise DocumentaryWarrantError(
            "input admission request has already been stamped for checking"
        )
    request_document = _thaw(admission_request)
    assert isinstance(request_document, dict)
    request_document["checked_at"] = _utc_timestamp(clock())
    checked_request_raw = _encode(request_document)
    request = parse_lean_request(
        checked_request_raw,
        projection=projection,
        require_checked=True,
    )
    temporary = Path(tempfile.mkdtemp(prefix=f".{target.name}.", dir=parent))
    try:
        projection_path = temporary / "projection.json"
        request_path = temporary / "request.json"
        projection_path.write_bytes(projection_raw)
        request_path.write_bytes(checked_request_raw)
        run = run_lean_documentary_checker(
            lean_root,
            request_path,
            timeout_seconds=timeout_seconds,
            output_limit=output_limit,
        )
        verification = _runtime_verification(
            run.stdout,
            request,
            run.checker_identity,
            projection_raw,
            checked_request_raw,
        )
        verification_raw = _encode(verification)
        if len(verification_raw) > MAX_VERIFICATION_BYTES:
            raise DocumentaryWarrantError(
                f"runtime verification exceeds the {MAX_VERIFICATION_BYTES}-byte limit"
            )
        bundle = _validate_runtime_artifacts(
            projection,
            request,
            verification,
            run.stdout,
        )
        (temporary / "bundle.json").write_bytes(run.stdout)
        (temporary / "verification.json").write_bytes(verification_raw)
        _rename_no_replace(temporary, target)
    except BaseException:
        if temporary.exists():
            shutil.rmtree(temporary)
        raise
    return DocumentaryWarrantPackage(target, projection, request, verification, bundle)


def load_documentary_warrant_package(path: Path) -> DocumentaryWarrantPackage:
    """Reload all retained bytes and reject a partial or tampered package."""

    try:
        package_metadata = path.lstat()
    except OSError as exc:
        raise DocumentaryWarrantError(
            f"documentary warrant package is unavailable: {exc}"
        ) from exc
    if stat.S_ISLNK(package_metadata.st_mode) or not stat.S_ISDIR(
        package_metadata.st_mode
    ):
        raise DocumentaryWarrantError(
            "documentary warrant package must be a non-symlink directory"
        )
    package_path = path.resolve(strict=True)
    actual = frozenset(item.name for item in package_path.iterdir())
    expected = frozenset(_PACKAGE_FILENAMES)
    if actual != expected:
        raise DocumentaryWarrantError(
            "documentary warrant package has missing or unexpected files"
        )
    limits = {
        "projection.json": MAX_PROJECTION_BYTES,
        "request.json": MAX_REQUEST_BYTES,
        "bundle.json": MAX_BUNDLE_BYTES,
        "verification.json": MAX_VERIFICATION_BYTES,
    }

    def read_retained(filename: str) -> bytes:
        retained = package_path / filename
        try:
            metadata = retained.lstat()
        except OSError as exc:
            raise DocumentaryWarrantError(
                f"retained file is unavailable: {filename}: {exc}"
            ) from exc
        if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISREG(metadata.st_mode):
            raise DocumentaryWarrantError(
                f"retained file must be a regular non-symlink file: {filename}"
            )
        if metadata.st_size > limits[filename]:
            raise DocumentaryWarrantError(
                f"retained file exceeds its byte limit: {filename}"
            )
        try:
            return retained.read_bytes()
        except OSError as exc:
            raise DocumentaryWarrantError(
                f"could not read retained file {filename}: {exc}"
            ) from exc

    projection_raw = read_retained("projection.json")
    projection = parse_documentary_projection(projection_raw)
    if projection_raw != encode_documentary_projection(projection):
        raise DocumentaryWarrantError(
            "retained documentary projection is not canonical"
        )
    request_raw = read_retained("request.json")
    request = parse_lean_request(
        request_raw,
        projection=projection,
        require_checked=True,
    )
    if request_raw != _encode(request):
        raise DocumentaryWarrantError(
            "retained documentary request is not canonical"
        )
    verification = _parse_verification(
        read_retained("verification.json")
    )
    bundle_raw = read_retained("bundle.json")
    bundle = _validate_runtime_artifacts(
        projection,
        request,
        verification,
        bundle_raw,
    )
    return DocumentaryWarrantPackage(
        package_path,
        projection,
        request,
        verification,
        bundle,
    )


def render_documentary_warrant(package: DocumentaryWarrantPackage) -> str:
    """Render the checked documentary boundary without displaying AI prose."""

    request = package.request
    verification = package.verification
    claim = _object(_thaw(request["claim"]), "request.claim")
    payload = json.loads(str(claim["assertion"]))
    digest = _object(
        _thaw(verification["artifact_digest"]),
        "verification.artifact_digest",
    )
    def display(value: object) -> str:
        return json.dumps(str(value), ensure_ascii=True)[1:-1]

    return "\n".join(
        [
            "AI-response documentary warrant",
            f"D: {display(claim['id'])}",
            f"ModelCall: {display(payload[1])} at response SHA-256 {display(payload[2])}",
            f"Exact UTF-8 response span: [{payload[3]}, {payload[4]})",
            f"Representation: {display(payload[5])} at content SHA-256 {display(payload[6])}",
            f"Documentary premise: {display(request['reason_variable'])}:D",
            f"Context: {display(request['context_id'])}",
            f"Check: {display(verification['method'])} — {display(verification['status'])}",
            f"Checker revision: {display(verification['checker_revision'])}",
            f"Retained bundle SHA-256: {display(digest['value'])}",
            "Boundary: this records only that the model produced the exact span.",
            "No substantive claim F or bridge D → F is present or admitted.",
        ]
    )
