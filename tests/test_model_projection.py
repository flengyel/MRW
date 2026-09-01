from __future__ import annotations

from dataclasses import replace
from hashlib import sha256
import json
from types import MappingProxyType
import unittest

from theorem_terminal.model_projection import (
    MODEL_CALL_SCHEMA,
    MODEL_CALL_SCHEMA_VERSION,
    ModelProjectionError,
    canonical_model_produced_assertion,
    extract_lossless_representation,
    make_model_produced_claim,
    parse_finalized_model_call,
)


def model_call_document(
    *,
    call_id: str = "model-call-mechanical-fixture-v1",
    response: str = "Context.\nHint: choose α → β and test it.\nEnd.\n",
) -> dict[str, object]:
    return {
        "schema": MODEL_CALL_SCHEMA,
        "schema_version": MODEL_CALL_SCHEMA_VERSION,
        "id": call_id,
        "initiated_by": "person-fixture",
        "target": {"kind": "WorkArtifact", "id": "artifact-fixture-v1"},
        "purpose": "strategic_hint",
        "request_text": "Give one possible next step.",
        "context_refs": [
            {
                "kind": "WorkArtifact",
                "id": "artifact-fixture-v1",
                "revision": "artifact-content-v1",
            }
        ],
        "effective_input": {
            "instructions": ["Return proposed material only."],
            "messages": [{"role": "user", "content": "Exact fixture input."}],
        },
        "provider": "fixture-provider",
        "requested_model": "fixture-model",
        "resolved_model": "fixture-model-2026-09-01",
        "adapter_version": "fixture-adapter-v1",
        "limits": {
            "input_tokens": 500,
            "output_tokens": 100,
            "timeout_seconds": 30,
        },
        "settings": {"store": False, "temperature": 0},
        "in_reply_to": None,
        "requested_at": "2026-09-01T00:00:00Z",
        "completed_at": "2026-09-01T00:00:01Z",
        "finalized_at": "2026-09-01T00:00:02Z",
        "status": "completed",
        "response_id": "fixture-response-v1",
        "raw_response": response,
        "raw_response_digest": sha256(response.encode("utf-8")).hexdigest(),
    }


def encode(document: dict[str, object]) -> bytes:
    return (
        json.dumps(document, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
        + "\n"
    ).encode("utf-8")


def exact_span(response: str, selected: str) -> tuple[int, int]:
    response_bytes = response.encode("utf-8")
    selected_bytes = selected.encode("utf-8")
    start = response_bytes.index(selected_bytes)
    return start, start + len(selected_bytes)


class ModelProjectionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.source = model_call_document()
        self.call = parse_finalized_model_call(encode(self.source))
        self.selected = "choose α → β and test it"
        self.start, self.end = exact_span(
            str(self.source["raw_response"]),
            self.selected,
        )
        self.representation = extract_lossless_representation(
            self.call,
            representation_id="representation-fixture-v1",
            version="1",
            subject={"kind": "WorkArtifact", "id": "artifact-fixture-v1"},
            kind="strategic_hint",
            start_byte=self.start,
            end_byte=self.end,
        )

    def test_finalized_call_is_strictly_validated_and_deeply_frozen(self) -> None:
        self.assertEqual(self.call.id, self.source["id"])
        self.assertEqual(self.call.raw_response, self.source["raw_response"])
        self.assertEqual(
            self.call.raw_response_digest,
            self.source["raw_response_digest"],
        )
        self.assertIsInstance(self.call.document, MappingProxyType)
        with self.assertRaises(TypeError):
            self.call.document["id"] = "changed"
        effective_input = self.call.document["effective_input"]
        self.assertIsInstance(effective_input, MappingProxyType)
        with self.assertRaises(TypeError):
            effective_input["messages"] = ()

    def test_only_completed_finalized_exact_response_is_accepted(self) -> None:
        mutations = (
            ("status", "incomplete", "status must be completed"),
            ("finalized_at", None, "finalized_at must be"),
            ("raw_response_digest", "0" * 64, "does not match"),
        )
        for key, value, message in mutations:
            with self.subTest(key=key):
                changed = model_call_document()
                changed[key] = value
                with self.assertRaisesRegex(ModelProjectionError, message):
                    parse_finalized_model_call(encode(changed))

        changed = model_call_document()
        changed["requested_at"] = "2026-9-1T0:0:0Z"
        with self.assertRaisesRegex(ModelProjectionError, "canonical UTC"):
            parse_finalized_model_call(encode(changed))

        changed = model_call_document()
        changed["requested_at"] = "2026-09-01T00:00:03Z"
        with self.assertRaisesRegex(ModelProjectionError, "timestamps must satisfy"):
            parse_finalized_model_call(encode(changed))

    def test_wrong_fields_duplicate_keys_and_nonstandard_numbers_are_rejected(self) -> None:
        changed = model_call_document()
        changed["trust"] = "high"
        with self.assertRaisesRegex(ModelProjectionError, "unexpected trust"):
            parse_finalized_model_call(encode(changed))

        duplicate = encode(model_call_document()).replace(
            b'"schema":',
            b'"schema":"duplicate","schema":',
            1,
        )
        with self.assertRaisesRegex(ModelProjectionError, "duplicate JSON key"):
            parse_finalized_model_call(duplicate)

        nonstandard = encode(model_call_document()).replace(
            b'"timeout_seconds":30',
            b'"timeout_seconds":NaN',
            1,
        )
        with self.assertRaisesRegex(ModelProjectionError, "non-standard JSON number"):
            parse_finalized_model_call(nonstandard)

    def test_representation_is_the_exact_multibyte_utf8_span(self) -> None:
        self.assertEqual(self.representation.content, self.selected)
        self.assertEqual(self.representation.span.start_byte, self.start)
        self.assertEqual(self.representation.span.end_byte, self.end)
        self.assertEqual(
            self.representation.content_hash,
            sha256(self.selected.encode("utf-8")).hexdigest(),
        )
        provenance = self.representation.document["provenance"]
        self.assertEqual(provenance["origin"], "ai_proposal")
        self.assertEqual(provenance["model_call"], self.call.id)
        self.assertEqual(
            provenance["response_span"]["response_digest"],
            self.call.raw_response_digest,
        )

    def test_span_must_be_nonempty_in_bounds_and_on_utf8_boundaries(self) -> None:
        cases = (
            (self.start, self.start, "non-empty"),
            (-1, self.end, "within"),
            (self.start, 10_000, "within"),
            (self.start + len("choose ".encode("utf-8")) + 1, self.end, "UTF-8"),
        )
        for start, end, message in cases:
            with self.subTest(start=start, end=end):
                with self.assertRaisesRegex(ModelProjectionError, message):
                    extract_lossless_representation(
                        self.call,
                        representation_id="representation-fixture-v1",
                        version="1",
                        subject={"kind": "WorkArtifact", "id": "artifact-fixture-v1"},
                        kind="strategic_hint",
                        start_byte=start,
                        end_byte=end,
                    )

    def test_canonical_documentary_assertion_and_hash_match_exact_bytes(self) -> None:
        assertion = canonical_model_produced_assertion(
            self.call,
            self.representation,
        )
        expected = json.dumps(
            [
                "model-produced-v1",
                self.call.id,
                self.call.raw_response_digest,
                self.start,
                self.end,
                self.representation.id,
                self.representation.content_hash,
            ],
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode("utf-8")
        self.assertEqual(assertion, expected)
        self.assertNotIn(b" ", assertion)

        claim = make_model_produced_claim(
            self.call,
            self.representation,
            claim_id="claim-model-produced-fixture-v1",
            display_name="Model produced selected fixture span",
            description="Documentary attribution only.",
        )
        self.assertEqual(claim.assertion_bytes, expected)
        self.assertEqual(claim.content_hash, sha256(expected).hexdigest())
        self.assertEqual(claim.document["content_hash"]["value"], claim.content_hash)
        self.assertEqual(
            frozenset(claim.document),
            frozenset(
                {
                    "id",
                    "display_name",
                    "assertion",
                    "description",
                    "representation_refs",
                    "content_hash",
                }
            ),
        )
        for forbidden in ("admission", "bridge", "verification", "status", "trust"):
            self.assertNotIn(forbidden, claim.document)

    def test_projection_relationship_is_rechecked_before_atom_creation(self) -> None:
        tampered = replace(self.representation, content="different")
        with self.assertRaisesRegex(ModelProjectionError, "exact response span"):
            canonical_model_produced_assertion(self.call, tampered)

        renamed = replace(self.representation, id="unrecorded-id")
        with self.assertRaisesRegex(ModelProjectionError, "internally inconsistent"):
            canonical_model_produced_assertion(self.call, renamed)

        other_call = parse_finalized_model_call(
            encode(model_call_document(call_id="different-call"))
        )
        with self.assertRaisesRegex(ModelProjectionError, "provenance"):
            canonical_model_produced_assertion(other_call, self.representation)

    def test_each_identity_component_changes_the_documentary_atom(self) -> None:
        original = canonical_model_produced_assertion(self.call, self.representation)
        second = extract_lossless_representation(
            self.call,
            representation_id="different-representation",
            version="1",
            subject={"kind": "WorkArtifact", "id": "artifact-fixture-v1"},
            kind="strategic_hint",
            start_byte=self.start,
            end_byte=self.end,
        )
        self.assertNotEqual(
            sha256(original).hexdigest(),
            sha256(canonical_model_produced_assertion(self.call, second)).hexdigest(),
        )


if __name__ == "__main__":
    unittest.main()
