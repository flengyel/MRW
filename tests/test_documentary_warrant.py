from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha256
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

from theorem_terminal.documentary_warrant import (
    DocumentaryProjection,
    DocumentaryWarrantError,
    build_lean_request,
    create_documentary_warrant_package,
    encode_documentary_projection,
    load_documentary_warrant_package,
    parse_documentary_projection,
    parse_lean_request,
    render_documentary_warrant,
)
from theorem_terminal.model_projection import (
    extract_lossless_representation,
    make_model_produced_claim,
    parse_finalized_model_call,
)


ROOT = Path(__file__).resolve().parents[1]
LEAN_ROOT = ROOT / "lean"
MODEL_CALL_FIXTURE = ROOT / "tests" / "fixtures" / "mechanical_model_call.json"
LEAN_REQUEST_FIXTURE = LEAN_ROOT / "mechanical_request.json"
ADMISSION_FIXTURE = ROOT / "tests" / "fixtures" / "mechanical_admission.json"
CHECKER = LEAN_ROOT / ".lake" / "build" / "bin" / "justification_bundle"


class DocumentaryWarrantTests(unittest.TestCase):
    def make_artifacts(self) -> tuple[bytes, bytes]:
        call = parse_finalized_model_call(MODEL_CALL_FIXTURE.read_bytes())
        representation = extract_lossless_representation(
            call,
            representation_id="representation-mechanical-span-v1",
            version="1",
            subject=call.document["target"],
            kind="strategic_hint",
            start_byte=17,
            end_byte=26,
        )
        claim = make_model_produced_claim(
            call,
            representation,
            claim_id="claim-model-produced-mechanical-fixture-v1",
            display_name="Model produced selected response span",
            description=(
                "Documentary attribution of exact model-response UTF-8 bytes only."
            ),
        )
        projection = DocumentaryProjection(call, representation, claim)
        projection_raw = encode_documentary_projection(projection)
        request_raw = build_lean_request(
            projection,
            fixture_id="ai-documentary-mechanical-fixture-v1",
            context_id="ai-documentary-mechanical-context-v1",
            admission_id="admission-ai-documentary-mechanical-v1",
            admitted_by={
                "kind": "named_policy",
                "id": "ai-documentary-mechanical-policy-v1",
            },
            at="2026-09-01T00:00:00Z",
            reason_variable="m",
            rationale=(
                "Admit only that this synthetic finalized-call fixture contains "
                "the exact span."
            ),
            scope=(
                "Mechanical regression only; no substantive mathematical claim "
                "is admitted."
            ),
            derivation_id="derivation-ai-documentary-mechanical-v1",
        )
        return projection_raw, request_raw

    def test_python_request_is_exactly_the_canonical_lean_fixture(self) -> None:
        _, request_raw = self.make_artifacts()

        self.assertEqual(request_raw, ADMISSION_FIXTURE.read_bytes())
        request = parse_lean_request(request_raw)
        self.assertEqual(request["reason_variable"], "m")
        self.assertNotIn("substantive_claim", request)
        self.assertNotIn("bridge", request)

    def test_python_rejects_hash_tamper_and_display_controls(self) -> None:
        _, request_raw = self.make_artifacts()
        request = json.loads(request_raw)
        request["claim"]["content_hash"] = "0" * 64
        tampered = (
            json.dumps(request, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
            + "\n"
        ).encode()
        with self.assertRaisesRegex(DocumentaryWarrantError, "content_hash"):
            parse_lean_request(tampered)

        request = json.loads(request_raw)
        request["context_id"] = "safe\nforged"
        unsafe = (
            json.dumps(request, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
            + "\n"
        ).encode()
        with self.assertRaisesRegex(DocumentaryWarrantError, "unsafe"):
            parse_lean_request(unsafe)

        request = json.loads(request_raw)
        request["context_id"] = "safe\u202eforged"
        bidi = (
            json.dumps(request, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
            + "\n"
        ).encode()
        with self.assertRaisesRegex(DocumentaryWarrantError, "unsafe"):
            parse_lean_request(bidi)

        projection_raw, request_raw = self.make_artifacts()
        projection = parse_documentary_projection(projection_raw)
        request = json.loads(request_raw)
        request["at"] = "2026-08-31T23:59:59Z"
        backdated = (
            json.dumps(request, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
            + "\n"
        ).encode()
        with self.assertRaisesRegex(DocumentaryWarrantError, "finalized ModelCall"):
            parse_lean_request(backdated, projection=projection)

    def test_projection_encoder_refuses_output_over_reload_limit(self) -> None:
        model_call = json.loads(MODEL_CALL_FIXTURE.read_bytes())
        response = "x" * 2_200_000
        model_call["raw_response"] = response
        model_call["raw_response_digest"] = sha256(response.encode()).hexdigest()
        model_call_raw = (
            json.dumps(
                model_call,
                ensure_ascii=False,
                separators=(",", ":"),
                sort_keys=True,
            )
            + "\n"
        ).encode()
        call = parse_finalized_model_call(model_call_raw)
        representation = extract_lossless_representation(
            call,
            representation_id="representation-large-span-v1",
            version="1",
            subject=call.document["target"],
            kind="strategic_hint",
            start_byte=0,
            end_byte=len(response),
        )
        claim = make_model_produced_claim(
            call,
            representation,
            claim_id="claim-model-produced-large-span-v1",
            display_name="Model produced large selected response span",
            description="Documentary attribution of a large exact response span.",
        )

        with self.assertRaisesRegex(
            DocumentaryWarrantError,
            "documentary projection exceeds",
        ):
            encode_documentary_projection(
                DocumentaryProjection(call, representation, claim)
            )

    @unittest.skipUnless(CHECKER.is_file(), "pinned Lean checker has not been built")
    def test_real_cross_language_documentary_round_trip(self) -> None:
        projection_raw, request_raw = self.make_artifacts()
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "package"
            package = create_documentary_warrant_package(
                destination,
                projection_raw,
                request_raw,
                lean_root=LEAN_ROOT,
                clock=lambda: datetime(2026, 9, 1, 0, 0, 1, tzinfo=timezone.utc),
            )
            bundle = package.bundle.document
            self.assertEqual(
                package.bundle.digest,
                "a674dfbf3c9b9e094f4f51048f4eba62c7c6fd1e993be277b6fa1d2fc743ba49",
            )

            self.assertEqual(bundle["schema"], "theorem-terminal.justification-bundle")
            self.assertEqual(len(bundle["claims"]), 1)
            self.assertEqual(len(bundle["admissions"]), 1)
            self.assertEqual(len(bundle["derivation"]["nodes"]), 1)
            self.assertEqual(
                bundle["derivation"]["nodes"][0]["rule"],
                {"admission_id": "admission-ai-documentary-mechanical-v1", "kind": "premise"},
            )
            self.assertEqual(bundle["external_verifications"], ())
            self.assertEqual(bundle["related_source_bindings"], ())
            self.assertEqual(package.verification["at"], "2026-09-01T00:00:01Z")
            self.assertEqual(
                package.verification["environment"]["reported_verification"]["at"],
                "2026-09-01T00:00:01Z",
            )
            self.assertEqual(bundle["context"]["created_at"], "2026-09-01T00:00:00Z")
            self.assertEqual(
                (destination / "request.json").read_bytes(),
                LEAN_REQUEST_FIXTURE.read_bytes(),
            )
            self.assertNotIn("bundle_digest", bundle)

            reloaded = load_documentary_warrant_package(destination)
            self.assertEqual(reloaded.bundle.digest, package.bundle.digest)
            rendered = render_documentary_warrant(reloaded)
            self.assertIn("Documentary premise: m:D", rendered)
            self.assertIn("No substantive claim F or bridge D \u2192 F", rendered)

    @unittest.skipUnless(CHECKER.is_file(), "pinned Lean checker has not been built")
    def test_checker_clock_cannot_precede_admission(self) -> None:
        projection_raw, request_raw = self.make_artifacts()
        with tempfile.TemporaryDirectory() as temporary:
            with self.assertRaisesRegex(DocumentaryWarrantError, "must not precede"):
                create_documentary_warrant_package(
                    Path(temporary) / "package",
                    projection_raw,
                    request_raw,
                    lean_root=LEAN_ROOT,
                    clock=lambda: datetime(
                        2026, 8, 31, 23, 59, 59, tzinfo=timezone.utc
                    ),
                )

    @unittest.skipUnless(CHECKER.is_file(), "pinned Lean checker has not been built")
    def test_package_creation_refuses_verification_over_reload_limit(self) -> None:
        projection_raw, request_raw = self.make_artifacts()
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            destination = parent / "package"
            with patch(
                "theorem_terminal.documentary_warrant.MAX_VERIFICATION_BYTES",
                1,
            ):
                with self.assertRaisesRegex(
                    DocumentaryWarrantError,
                    "runtime verification exceeds the 1-byte limit",
                ):
                    create_documentary_warrant_package(
                        destination,
                        projection_raw,
                        request_raw,
                        lean_root=LEAN_ROOT,
                        clock=lambda: datetime(
                            2026, 9, 1, 0, 0, 1, tzinfo=timezone.utc
                        ),
                    )
            self.assertFalse(destination.exists())
            self.assertEqual(list(parent.iterdir()), [])

    @unittest.skipUnless(CHECKER.is_file(), "pinned Lean checker has not been built")
    def test_coordinated_environment_tamper_is_rejected(self) -> None:
        projection_raw, request_raw = self.make_artifacts()
        with tempfile.TemporaryDirectory() as temporary:
            destination = Path(temporary) / "package"
            create_documentary_warrant_package(
                destination,
                projection_raw,
                request_raw,
                lean_root=LEAN_ROOT,
                clock=lambda: datetime(2026, 9, 1, 0, 0, 1, tzinfo=timezone.utc),
            )
            bundle_path = destination / "bundle.json"
            verification_path = destination / "verification.json"
            bundle = json.loads(bundle_path.read_bytes())
            original_verification_raw = verification_path.read_bytes()
            verification = json.loads(original_verification_raw)
            verification["at"] = "2026-09-01T00:00:02Z"
            verification_path.write_bytes(
                (
                    json.dumps(
                        verification,
                        ensure_ascii=False,
                        separators=(",", ":"),
                        sort_keys=True,
                    )
                    + "\n"
                ).encode()
            )
            with self.assertRaisesRegex(DocumentaryWarrantError, "time does not match"):
                load_documentary_warrant_package(destination)

            verification_path.write_bytes(original_verification_raw)
            verification = json.loads(original_verification_raw)
            changed_commit = "f" * 40
            bundle["justification_verification"]["environment"]["lean_commit"] = changed_commit
            reported = verification["environment"]
            reported["reported_checker_environment"]["lean_commit"] = changed_commit
            reported["reported_verification"]["environment"]["lean_commit"] = changed_commit
            bundle_raw = (
                json.dumps(bundle, ensure_ascii=False, separators=(",", ":")) + "\n"
            ).encode()
            verification["artifact_digest"]["value"] = sha256(bundle_raw).hexdigest()
            verification_raw = (
                json.dumps(
                    verification,
                    ensure_ascii=False,
                    separators=(",", ":"),
                    sort_keys=True,
                )
                + "\n"
            ).encode()
            bundle_path.write_bytes(bundle_raw)
            verification_path.write_bytes(verification_raw)

            with self.assertRaisesRegex(DocumentaryWarrantError, "pinned"):
                load_documentary_warrant_package(destination)

    @unittest.skipUnless(CHECKER.is_file(), "pinned Lean checker has not been built")
    def test_direct_lean_interface_rejects_noncanonical_duplicate_json(self) -> None:
        duplicate = LEAN_REQUEST_FIXTURE.read_bytes().replace(
            b'"schema":',
            b'"schema":"duplicate","schema":',
            1,
        )
        with tempfile.NamedTemporaryFile() as request:
            request.write(duplicate)
            request.flush()
            run = subprocess.run(
                [
                    str(CHECKER),
                    "--documentary-warrant",
                    request.name,
                    "--stdout",
                ],
                cwd=LEAN_ROOT,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                check=False,
            )
        self.assertEqual(run.returncode, 1)
        self.assertEqual(run.stdout, b"")
        self.assertIn(b"canonical compact JSON", run.stderr)


if __name__ == "__main__":
    unittest.main()
