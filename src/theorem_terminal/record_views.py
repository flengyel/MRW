"""Read-only presentation at the existing record-validation boundaries."""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Mapping

from .documentary_warrant import (
    MAX_PROJECTION_BYTES, MAX_VERIFICATION_BYTES, DocumentaryProjection,
    load_documentary_warrant_package, parse_documentary_projection,
    render_documentary_warrant,
)
from .justification import MAX_BUNDLE_BYTES, bundle_expectation_from_verification, validate_bundle
from .local_files import read_bounded
from .model_projection import (MAX_MODEL_CALL_BYTES, parse_finalized_model_call,
                               parse_terminal_model_call)
from .response_review import bounded_safe_field, render_response_review, safe_terminal_text
from .source import SourceDocument
from .workspace import WorkspaceError, strict_json


@dataclass(frozen=True)
class RecordView:
    body: str
    sections: tuple[tuple[str, str], ...]
    revision: str
    companion_revision: str | None = None


def _plain(value):
    if isinstance(value, Mapping):
        return {key: _plain(item) for key, item in value.items()}
    if isinstance(value, (tuple, list)):
        return [_plain(item) for item in value]
    return value


def display_record(value) -> str:
    # JSON escaping preserves all values and makes control characters visible.
    # No renderer, hyperlink, tool or interpreter consumes this text.
    return json.dumps(_plain(value), ensure_ascii=True, indent=2, allow_nan=False)


def read_call(path: Path):
    return read_call_snapshot(path)[1]


def read_call_snapshot(path: Path):
    raw = read_bounded(path, MAX_MODEL_CALL_BYTES, "ModelCall")
    call = parse_finalized_model_call(raw)
    return SourceDocument.from_bytes(path, raw), call


def warrant_sections(bundle, verification=None):
    """Expose existing immutable records without inferring or admitting facts."""
    document = bundle.document
    sections = (
        ("ClaimAtomVersion records", display_record(document["claims"])),
        ("PremiseAdmission records", display_record(document["admissions"])),
        ("JustificationContext", display_record(document["context"])),
        ("JustificationDerivation", display_record(document["derivation"])),
        ("Checked derivability", "Derivable relative to the recorded profile, context and admissions; no truth or human decision follows."),
        ("Logic profile", display_record(document["profile"])),
        ("Verification", display_record(document["justification_verification"])),
        ("Associated external Verification records", display_record(document["external_verifications"])),
        ("Provenance bindings", display_record(document["related_source_bindings"])),
    )
    if verification is not None:
        sections += (("Retained bundle Verification", display_record(verification)),)
    return sections


def projection_view(projection: DocumentaryProjection, revision: str) -> RecordView:
    call = projection.call
    rep = projection.representation
    header = "\n".join((
        bounded_safe_field("Provider", call.provider),
        bounded_safe_field("Model", call.model),
        bounded_safe_field("Call", call.id),
        f"Response SHA-256: {call.raw_response_digest}",
        f"Exact UTF-8 span: [{rep.span.start_byte}, {rep.span.end_byte})",
        "Origin: AI proposal. Lossless selected text (reversible escapes):",
    ))
    return RecordView(header + "\n\n" + safe_terminal_text(rep.content), (
        ("Provenance", display_record(rep.document["provenance"])),
        ("Identity", display_record({"representation": rep.id, "content_hash": rep.content_hash,
                                    "documentary_claim": projection.claim.document})),
        ("Premise admission", "No premise is created by projection."),
        ("Verification", "Projection establishes exact attribution only."),
    ), revision)


def inspect_record(path: Path, format: str, companion: Path | None = None) -> RecordView:
    if format == "terminal_call":
        raw = read_bounded(path, MAX_MODEL_CALL_BYTES, "terminal ModelCall")
        call = parse_terminal_model_call(raw)
        revision = SourceDocument.from_bytes(path, raw).revision
        metadata = {key: call.document[key] for key in (
            "id", "status", "provider", "requested_model", "resolved_model",
            "requested_at", "completed_at", "finalized_at", "raw_response_digest",
        )}
        sections = (
            ("Terminal status and identity", display_record(metadata)),
            ("Record SHA-256", revision),
            ("Evidence", "A terminal ModelCall records an operation's outcome. "
             "Inspection creates no mathematical verification or premise admission."),
            ("Complete retained record (JSON-escaped)", display_record(call.document)),
        )
        body = "Terminal ModelCall\n\n" + "\n\n".join(
            f"{heading}\n{content}" for heading, content in sections
        )
        return RecordView(body, sections, revision)
    if format == "documentary_package":
        snapshot = SourceDocument.from_bytes(path / "verification.json", read_bounded(path / "verification.json", MAX_VERIFICATION_BYTES, "Verification"))
        package = load_documentary_warrant_package(path)
        if SourceDocument.from_bytes(path / "verification.json", read_bounded(path / "verification.json", MAX_VERIFICATION_BYTES, "Verification")).revision != snapshot.revision:
            raise WorkspaceError("Package changed while being inspected")
        return RecordView(render_documentary_warrant(package), (
            ("Provenance", "Retained finalized ModelCall and lossless projection; no provider request."),
        ) + warrant_sections(package.bundle, package.verification), snapshot.revision)
    if format == "model_call":
        snapshot, call = read_call_snapshot(path)
        return RecordView(render_response_review(call), (
            ("Provenance", "Finalized ModelCall. Returned text is an attributed AI proposal."),
            ("Identity", f"Response SHA-256: {call.raw_response_digest}\nFinalized: {call.finalized_at}"),
            ("Verification", "No mathematical verification follows from this response."),
            ("Premise admission", "None created by viewing or selecting text."),
        ), snapshot.revision)
    if format == "projection":
        raw = read_bounded(path, MAX_PROJECTION_BYTES, "projection")
        projection = parse_documentary_projection(raw)
        return projection_view(projection, SourceDocument.from_bytes(path, raw).revision)
    if format == "verification":
        if companion is None:
            raise WorkspaceError("Select the exact bundle described by this Verification")
        raw = read_bounded(path, MAX_VERIFICATION_BYTES, "Verification")
        record = strict_json(raw)
        bundle_raw = read_bounded(companion, MAX_BUNDLE_BYTES, "checked bundle")
        if not isinstance(record, dict):
            raise WorkspaceError("Verification must be an object")
        environment = record.get("environment")
        if isinstance(environment, dict) and "runtime_checker" in environment:
            # Documentary runtime records require the full public provenance
            # validation, not merely the raw bundle's structural validator.
            if path.name != "verification.json" or companion != path.parent / "bundle.json":
                raise WorkspaceError("Open the complete retained documentary package")
            package = load_documentary_warrant_package(path.parent)
            if read_bounded(path, MAX_VERIFICATION_BYTES, "Verification") != raw or read_bounded(companion, MAX_BUNDLE_BYTES, "checked bundle") != bundle_raw:
                raise WorkspaceError("Package changed while being inspected")
            bundle = package.bundle
        else:
            expectation = bundle_expectation_from_verification(record)
            bundle = validate_bundle(bundle_raw, expectation)
        sections = (
            ("Provenance", "Imported existing attestation; the checker was not re-run.\n"
             "Digest binding is relative to the retained Verification, not a signature."),
        ) + warrant_sections(bundle, record)
        # JSON escapes record-derived controls; the separating lines and headings
        # belong to the application. Preserve readable layout without treating
        # untrusted record strings as application framing.
        body = "Retained warrant records\n\n" + "\n\n".join(f"{heading}\n{content}" for heading, content in sections)
        return RecordView(body, sections, SourceDocument.from_bytes(path, raw).revision, SourceDocument.from_bytes(companion, bundle_raw).revision)
    raise WorkspaceError("No applicable record validator for this format")
