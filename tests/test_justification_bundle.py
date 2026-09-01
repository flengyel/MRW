from __future__ import annotations

from copy import deepcopy
from hashlib import sha256
import json
import unittest

from theorem_terminal.justification import (
    BundleExpectation,
    ExactBinding,
    JustificationBundleError,
    render_warrant,
    validate_bundle,
)
from theorem_terminal.appendix_a_warrant import (
    APPENDIX_A_BUNDLE_EXPECTATION,
    load_appendix_a_bundle,
)


def digest(value: str = "0" * 64, algorithm: str = "sha256") -> dict[str, str]:
    return {"algorithm": algorithm, "value": value}


def reference(kind: str, identifier: str) -> dict[str, str]:
    return {"id": identifier, "kind": kind}


def atom(identifier: str = "claim-F", value: str = "1" * 64) -> list[object]:
    return ["atom", {"content_hash": digest(value), "id": identifier}]


def reason(name: str = "x", formula: list[object] | None = None) -> list[object]:
    return ["reason", ["variable", name], formula or atom()]


def sample_document(
    manuscript_revision: str = "2" * 64,
) -> dict[str, object]:
    stdout = "checked output\n"
    stderr = ""
    profile = {
        "checker": "TheoremTerminal.Justification.checkCertificate",
        "checker_version": "checker-v1",
        "constant_specification": None,
        "id": "j0-v1",
        "rule_version": "j0-rules-v1",
        "syntax_version": "syntax-v1",
        "system": "J0",
    }
    context = {
        "added": ["admission-x"],
        "admissions": ["admission-x"],
        "change_kind": "initial",
        "created_at": "2026-09-01T00:00:00Z",
        "created_by": {"id": "fixture-policy", "kind": "named_policy"},
        "id": "context-v1",
        "predecessor": None,
        "profile": "j0-v1",
        "rationale": "Initial synthetic test context.",
        "removed": [],
    }
    external_environment = {
        "attestation_source_digest": digest("3" * 64),
        "categorical_repository": "flengyel/Categorical_Rice_Shapiro",
        "categorical_revision": "a" * 40,
        "command_environment": {"NO_COLOR": "1"},
        "import_closure": [
            {
                "git_blob": digest("b" * 40, "git-sha1"),
                "path": "Lean/PCats/DomPullbacks.lean",
            }
        ],
        "imports": ["PCats.DomPullbacks"],
        "lake_manifest_digest": digest("4" * 64),
        "lakefile_digest": digest("5" * 64),
        "lean_commit": "c" * 40,
        "lean_version": "4.32.2",
        "mathlib_revision": "d" * 40,
        "options": {"autoImplicit": False, "relaxedAutoImplicit": False},
        "toolchain_digest": digest("6" * 64),
    }
    checker_environment = {
        "checked_artifacts": [
            {
                "digest": digest("a" * 64),
                "path": "Certificate.olean",
                "role": "certificate_checker",
            }
        ],
        "checker_source_closure": [
            {
                "digest": digest("7" * 64),
                "path": "TheoremTerminal/Justification/Certificate.lean",
            }
        ],
        "fixture_source": {
            "digest": digest("b" * 64),
            "path": "TheoremTerminal/Justification/AppendixA.lean",
        },
        "lake_manifest_digest": digest("c" * 64),
        "lakefile_digest": digest("d" * 64),
        "lean_commit": "c" * 40,
        "lean_version": "4.32.2",
        "toolchain_digest": digest("6" * 64),
    }
    related_bindings = [
        {
            "checked_in_this_run": False,
            "git_blob": digest("e" * 40, "git-sha1"),
            "id": "source-occurrence",
            "kind": "source_occurrence",
            "label": "lem:range-lifting-pullback-section",
            "normalized_digest": digest(manuscript_revision),
            "path": "rs_Appendix_A.tex",
            "repository": "flengyel/Categorical_Rice_Shapiro",
            "repository_revision": "a" * 40,
            "statement_digest": digest("8" * 64),
            "statement_utf8_byte_length": 100,
        },
        {
            "checked_in_this_run": True,
            "declaration": "CategoryTheory.Dom.example",
            "exact_type_digest": digest("9" * 64),
            "exact_type_utf8_byte_length": 50,
            "git_blob": digest("b" * 40, "git-sha1"),
            "id": "formal-fact",
            "kind": "formal_fact",
            "path": "Lean/PCats/DomPullbacks.lean",
            "repository": "flengyel/Categorical_Rice_Shapiro",
            "repository_revision": "a" * 40,
        },
        {
            "checked_in_this_run": False,
            "direction": "formal_to_manuscript",
            "git_blob": digest("f" * 40, "git-sha1"),
            "id": "correspondence-v1",
            "kind": "correspondence_basis",
            "path": "Lean/docs/AppendixA.md",
            "repository": "flengyel/Categorical_Rice_Shapiro",
            "repository_revision": "a" * 40,
            "reviewed_by": "review-policy-v1",
            "source_claim": "claim-FL",
            "target_claim": "claim-F",
        },
        {
            "checked_in_this_run": False,
            "git_blob": digest("0" * 40, "git-sha1"),
            "id": "regression-source",
            "kind": "signature_guard_source",
            "path": "Lean/Tests/DomPullbacksRegression.lean",
            "repository": "flengyel/Categorical_Rice_Shapiro",
            "repository_revision": "a" * 40,
        },
    ]
    return {
        "admissions": [
            {
                "admitted_by": {"id": "admission-policy", "kind": "named_policy"},
                "at": "2026-09-01T00:00:00Z",
                "basis_refs": [reference("Verification", "external-check")],
                "formula": reason(),
                "id": "admission-x",
                "rationale": "Admit the exact synthetic premise.",
                "scope": "Synthetic fixture only.",
                "supersedes": None,
            }
        ],
        "claims": [
            {
                "assertion": "Synthetic exact assertion.",
                "content_hash": digest("1" * 64),
                "description": "Synthetic claim for validator tests.",
                "display_name": "Synthetic claim",
                "id": "claim-F",
                "representation_refs": [reference("SourceOccurrence", "source-occurrence")],
            }
        ],
        "context": context,
        "derivation": {
            "certificate_version": "ordered-dag-certificate-v1",
            "conclusion": reason(),
            "constant_specification_footprint": [],
            "context": "context-v1",
            "dependency_refs": [
                {"id": "claim-F", "kind": "ClaimAtomVersion", "revision": "1" * 64}
            ],
            "id": "derivation-v1",
            "nodes": [
                {
                    "formula": reason(),
                    "index": 0,
                    "rule": {"admission_id": "admission-x", "kind": "premise"},
                }
            ],
            "profile": "j0-v1",
        },
        "external_verifications": [
            {
                "at": "2026-09-01T00:00:01Z",
                "axiom_report": ["propext"],
                "checker_revision": "c" * 40,
                "claim_checked": "Synthetic Lean claim.",
                "command": "NO_COLOR=1 lake env lean Attestation.lean",
                "command_argv": ["lake", "env", "lean", "Attestation.lean"],
                "completed_at": "2026-09-01T00:00:01Z",
                "context": None,
                "environment": external_environment,
                "exit_code": 0,
                "id": "external-check",
                "method": "lean_kernel",
                "output_artifact": "Attestation.olean",
                "output_digest": digest("a" * 64),
                "profile": None,
                "result": "passed",
                "started_at": "2026-09-01T00:00:00Z",
                "stderr": stderr,
                "stderr_byte_length": len(stderr.encode("utf-8")),
                "stderr_digest": digest(sha256(stderr.encode("utf-8")).hexdigest()),
                "stdout": stdout,
                "stdout_byte_length": len(stdout.encode("utf-8")),
                "stdout_digest": digest(sha256(stdout.encode("utf-8")).hexdigest()),
                "subject": "formal-fact",
                "working_directory_role": "attestation_lake_root",
            }
        ],
        "fixture_id": "appendix-a-test-fixture-v1",
        "justification_verification": {
            "at": "2026-09-01T00:00:02Z",
            "checker": "TheoremTerminal.Justification.checkCertificate",
            "checker_revision": "checker-v1",
            "claim_checked": "Certificate denotes the recorded derivation.",
            "context": "context-v1",
            "environment": checker_environment,
            "id": "justification-check-v1",
            "method": "justification_checker",
            "profile": "j0-v1",
            "result": "passed",
            "subject": "derivation-v1",
        },
        "profile": profile,
        "related_source_bindings": related_bindings,
        "schema": "theorem-terminal.justification-bundle",
        "schema_version": 1,
    }


def encode(document: dict[str, object]) -> bytes:
    return (
        json.dumps(document, ensure_ascii=False, separators=(",", ":")) + "\n"
    ).encode("utf-8")


def expectation_for(
    raw: bytes,
    bindings: dict[str, object],
) -> BundleExpectation:
    return BundleExpectation(
        digest=sha256(raw).hexdigest(),
        schema=str(bindings["schema"]),
        schema_version=int(bindings["schema_version"]),
        fixture_id=str(bindings["fixture_id"]),
        exact_bindings=(
            ExactBinding(("profile",), deepcopy(bindings["profile"])),
            ExactBinding(("context",), deepcopy(bindings["context"])),
            ExactBinding(
                ("external_verifications", 0),
                deepcopy(bindings["external_verifications"][0]),
            ),
            ExactBinding(
                ("justification_verification",),
                deepcopy(bindings["justification_verification"]),
            ),
            ExactBinding(
                ("related_source_bindings",),
                deepcopy(bindings["related_source_bindings"]),
            ),
        ),
    )


class JustificationBundleTests(unittest.TestCase):
    def setUp(self) -> None:
        self.document = sample_document()
        self.raw = encode(self.document)
        self.expectation = expectation_for(self.raw, self.document)

    def test_valid_bundle_is_accepted_without_a_logical_check(self) -> None:
        bundle = validate_bundle(self.raw, self.expectation)

        self.assertEqual(bundle.digest, sha256(self.raw).hexdigest())
        self.assertEqual(bundle.document["fixture_id"], self.document["fixture_id"])

    def test_packaged_appendix_bundle_matches_external_code_metadata(self) -> None:
        bundle = load_appendix_a_bundle()

        self.assertEqual(bundle.digest, APPENDIX_A_BUNDLE_EXPECTATION.digest)
        self.assertEqual(
            bundle.document["fixture_id"],
            "appendix-a-range-lifting-warrant-v1",
        )
        self.assertNotIn("bundle_digest", bundle.document)
        self.assertNotIn("expected_digest", bundle.document)
        rendered = render_warrant(bundle)
        self.assertIn(
            "@Dom.exists_total_lift_iff_rangeLiftPullback_section :",
            rendered,
        )
        self.assertIn(
            "depends on axioms: [propext]",
            rendered,
        )

    def test_digest_is_checked_before_decoding_or_json_parsing(self) -> None:
        invalid = b"\xff"
        wrong_digest = expectation_for(b"different", self.document)
        with self.assertRaisesRegex(JustificationBundleError, "SHA-256"):
            validate_bundle(invalid, wrong_digest)

        matching_digest = expectation_for(invalid, self.document)
        with self.assertRaisesRegex(JustificationBundleError, "strict UTF-8"):
            validate_bundle(invalid, matching_digest)

    def test_duplicate_json_key_is_rejected(self) -> None:
        duplicate = self.raw.replace(
            b'"schema":',
            b'"schema":"duplicate","schema":',
            1,
        )
        expectation = expectation_for(duplicate, self.document)
        with self.assertRaisesRegex(JustificationBundleError, "duplicate JSON key"):
            validate_bundle(duplicate, expectation)

    def test_nonstandard_json_numbers_are_rejected(self) -> None:
        for token in (b"NaN", b"Infinity", b"-Infinity"):
            with self.subTest(token=token):
                changed = self.raw.replace(b'"schema_version":1', b'"schema_version":' + token)
                expectation = expectation_for(changed, self.document)
                with self.assertRaisesRegex(
                    JustificationBundleError,
                    "non-standard JSON number",
                ):
                    validate_bundle(changed, expectation)

    def test_schema_v1_accepts_only_j0_without_a_constant_specification(self) -> None:
        for field, value in (
            ("system", "J(CS)"),
            ("constant_specification", {}),
        ):
            with self.subTest(field=field):
                changed = deepcopy(self.document)
                changed["profile"][field] = value
                raw = encode(changed)
                expectation = expectation_for(raw, changed)
                with self.assertRaisesRegex(
                    JustificationBundleError,
                    "schema version 1",
                ):
                    validate_bundle(raw, expectation)

    def test_terminal_control_characters_are_rejected_before_rendering(self) -> None:
        changed = deepcopy(self.document)
        changed["claims"][0]["display_name"] = "unsafe\x1b[31m"
        raw = encode(changed)
        expectation = expectation_for(raw, changed)
        with self.assertRaisesRegex(
            JustificationBundleError,
            "unsafe terminal control U\\+001B",
        ):
            validate_bundle(raw, expectation)

    def test_self_digest_field_is_rejected(self) -> None:
        changed = deepcopy(self.document)
        changed["bundle_digest"] = "0" * 64
        raw = encode(changed)
        expectation = expectation_for(raw, self.document)
        with self.assertRaisesRegex(JustificationBundleError, "unexpected bundle_digest"):
            validate_bundle(raw, expectation)

    def test_exact_profile_context_checker_environment_and_sources_are_required(self) -> None:
        mutations = (
            (("profile", "rule_version"), "changed-rules"),
            (("context", "id"), "changed-context"),
            (
                ("justification_verification", "environment", "lean_commit"),
                "f" * 40,
            ),
            (
                ("external_verifications", 0, "environment", "mathlib_revision"),
                "e" * 40,
            ),
            (
                ("related_source_bindings", 0, "normalized_digest", "value"),
                "f" * 64,
            ),
        )
        for path, value in mutations:
            with self.subTest(path=path):
                changed = deepcopy(self.document)
                target = changed
                for component in path[:-1]:
                    target = target[component]
                target[path[-1]] = value
                if path == ("profile", "rule_version"):
                    pass
                elif path == ("context", "id"):
                    changed["derivation"]["context"] = value
                    changed["justification_verification"]["context"] = value
                raw = encode(changed)
                expectation = expectation_for(raw, self.document)
                with self.assertRaisesRegex(
                    JustificationBundleError,
                    "does not match its retained expectation",
                ):
                    validate_bundle(raw, expectation)

    def test_wrong_nested_schema_is_rejected(self) -> None:
        changed = deepcopy(self.document)
        changed["admissions"][0]["confidence"] = 1.0
        raw = encode(changed)
        expectation = expectation_for(raw, changed)
        with self.assertRaisesRegex(JustificationBundleError, "unexpected confidence"):
            validate_bundle(raw, expectation)

    def test_validator_does_not_recheck_the_derivation(self) -> None:
        changed = deepcopy(self.document)
        changed["derivation"]["nodes"][0]["rule"]["admission_id"] = "not-in-context"
        changed["derivation"]["conclusion"] = reason("z", atom("unrelated", "f" * 64))
        raw = encode(changed)
        expectation = expectation_for(raw, changed)

        bundle = validate_bundle(raw, expectation)

        self.assertEqual(bundle.document["derivation"]["conclusion"][1][1], "z")

    def test_stream_lengths_and_digests_are_checked_structurally(self) -> None:
        changed = deepcopy(self.document)
        changed["external_verifications"][0]["stdout_byte_length"] += 1
        raw = encode(changed)
        expectation = expectation_for(raw, changed)
        with self.assertRaisesRegex(JustificationBundleError, "byte_length is inconsistent"):
            validate_bundle(raw, expectation)

    def test_linked_checker_records_must_agree(self) -> None:
        changed = deepcopy(self.document)
        changed["justification_verification"]["subject"] = "another-derivation"
        raw = encode(changed)
        expectation = expectation_for(raw, changed)
        with self.assertRaisesRegex(JustificationBundleError, "subject is inconsistent"):
            validate_bundle(raw, expectation)


if __name__ == "__main__":
    unittest.main()
