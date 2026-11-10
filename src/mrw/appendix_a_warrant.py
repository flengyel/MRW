from __future__ import annotations

from collections.abc import Mapping

from mrw.appendix_a import render_complete_study
from mrw.justification import (
    BundleExpectation,
    ExactBinding,
    JustificationBundleError,
    ValidatedBundle,
    load_package_bundle,
    render_warrant,
    validate_bundle,
)
from mrw.source import SourceDocument


APPENDIX_A_BUNDLE_PACKAGE = "mrw.data"
APPENDIX_A_BUNDLE_RESOURCE = "appendix_a_justification.json"


def _digest(value: str, algorithm: str = "sha256") -> dict[str, str]:
    return {"algorithm": algorithm, "value": value}


_PROFILE = {
    "checker": "MRW.Justification.checkCertificate",
    "checker_version": "justification-checker-v1",
    "constant_specification": None,
    "id": "mrw-j0-appendix-a-v1",
    "rule_version": "j0-hilbert-v1",
    "syntax_version": "justification-syntax-v1",
    "system": "J0",
}

_CONTEXT = {
    "added": [
        "admission-kernel-attestation-v1",
        "admission-formal-proof-policy-v1",
        "admission-reviewed-correspondence-v1",
    ],
    "admissions": [
        "admission-kernel-attestation-v1",
        "admission-formal-proof-policy-v1",
        "admission-reviewed-correspondence-v1",
    ],
    "change_kind": "initial",
    "created_at": "2026-09-01T15:10:00Z",
    "created_by": {
        "id": "appendix-a-warrant-fixture-policy-v1",
        "kind": "named_policy",
    },
    "id": "appendix-a-range-lifting-context-v1",
    "predecessor": None,
    "profile": "mrw-j0-appendix-a-v1",
    "rationale": (
        "Initial context for the exact Appendix A kernel-policy-correspondence route."
    ),
    "removed": [],
}

_JUSTIFICATION_ENVIRONMENT = {'checked_artifacts': [{'digest': {'algorithm': 'sha256', 'value': '91cb1ada39495504a09acb1ea8c092c1e693b390133032f60b6af1112598820f'}, 'path': '.lake/build/lib/lean/MRW/Justification/Certificate.olean', 'role': 'certificate_checker'}, {'digest': {'algorithm': 'sha256', 'value': '6b55f484dfac7c3e15642c2ca78ab1cc0c85f61b975de7135bcd3a015ed22ae5'}, 'path': '.lake/build/lib/lean/MRW/Justification/AppendixA.olean', 'role': 'checked_fixture_witness'}], 'checker_source_closure': [{'digest': {'algorithm': 'sha256', 'value': '80fd0c32339aa552086b351358be6115700075a79f9632f82fe2629a51237957'}, 'path': 'MRW/Justification/Syntax.lean'}, {'digest': {'algorithm': 'sha256', 'value': '2d685cd4b31fb1d2677b3a5424de3ca5406086f121c4e4fbea59372929c58353'}, 'path': 'MRW/Justification/Axioms.lean'}, {'digest': {'algorithm': 'sha256', 'value': 'e7dc5d356c1e9520d2ed85373c46ee169d390cdad214b860549587ea62c0d7ac'}, 'path': 'MRW/Justification/ConstantSpecification.lean'}, {'digest': {'algorithm': 'sha256', 'value': 'd3bd8b5c3621bc4575fe51907f521543a67964c443285a88593972a4970e80d0'}, 'path': 'MRW/Justification/Derivation.lean'}, {'digest': {'algorithm': 'sha256', 'value': 'd35aa505d8f7ed51dec6cc66c3e3283aa278b32f9ecbcb7515391b10e23edc9b'}, 'path': 'MRW/Justification/Certificate.lean'}, {'digest': {'algorithm': 'sha256', 'value': 'a52b476ad67dbf2dbbe365b0f261722d63dafd51ae46712c9adb7e5e7effaadd'}, 'path': 'MRW/Justification/Semantics.lean'}], 'fixture_source': {'digest': {'algorithm': 'sha256', 'value': '55f9dd08cab8e31db72ea7ef0da1b9aad93c075f5a000ec07976070d857b1962'}, 'path': 'MRW/Justification/AppendixA.lean'}, 'lake_manifest_digest': {'algorithm': 'sha256', 'value': '791cfa5839cb7efbfd47e9844b6e65f0ad7108735602255f126ad62c9360bd29'}, 'lakefile_digest': {'algorithm': 'sha256', 'value': '88335c65f9b47fc22a166cd660c22dd8a0aed0a8f350b6fff55b4cb13da9e0ee'}, 'lean_commit': 'f3b06c705e6c85f5314019d5d3baab0fec5b580c', 'lean_version': '4.32.2', 'toolchain_digest': {'algorithm': 'sha256', 'value': '2bdc48adfa58d0017e538a0ad117c5d73d35deec879978f909406a80c8037273'}}

_EXTERNAL_ENVIRONMENT = {
    "attestation_source_digest": _digest(
        "9940f7362a2dfb234461d5d359fa5d2785b8a1a5e21033b6782e48cfb0f1b328"
    ),
    "categorical_repository": "flengyel/Categorical_Rice_Shapiro",
    "categorical_revision": "fdd1a01b893b125a802ea375aee051ab640c3be7",
    "command_environment": {"NO_COLOR": "1"},
    "import_closure": [
        {
            "git_blob": _digest(
                "8be04e263211438f27484d6f83f8dd6865b9b4a2",
                "git-sha1",
            ),
            "path": "Lean/PCats/Restriction.lean",
        },
        {
            "git_blob": _digest(
                "f9e174b3baa0e8661ec42a509f02567fac2e0717",
                "git-sha1",
            ),
            "path": "Lean/PCats/PCat.lean",
        },
        {
            "git_blob": _digest(
                "2968973816c262e877d985c0f775babe0f2d46e8",
                "git-sha1",
            ),
            "path": "Lean/PCats/Ranges.lean",
        },
        {
            "git_blob": _digest(
                "0d38fd4a914326b82b347128c37acc3649e1cdcf",
                "git-sha1",
            ),
            "path": "Lean/PCats/Domains.lean",
        },
        {
            "git_blob": _digest(
                "c21293b42ddb31bc4ae56b924028b6fe5dcb3de8",
                "git-sha1",
            ),
            "path": "Lean/PCats/DomProducts.lean",
        },
        {
            "git_blob": _digest(
                "62cd311de1380fa80e70d60a5bd4913c9414d447",
                "git-sha1",
            ),
            "path": "Lean/PCats/DomSubdomains.lean",
        },
        {
            "git_blob": _digest(
                "a0fe49c0e2da6e202af24a4444671ef6d8daa0b1",
                "git-sha1",
            ),
            "path": "Lean/PCats/DomEqualizers.lean",
        },
        {
            "git_blob": _digest(
                "dc6ea0ec50c29c9006b78adb088d4713508487ed",
                "git-sha1",
            ),
            "path": "Lean/PCats/DomPullbacks.lean",
        },
    ],
    "imports": ["PCats.DomPullbacks"],
    "lake_manifest_digest": _digest(
        "075ed40f0d1dff3c0cbab93f40a3c93a1c0b75fcb94a7a83225de39627854774"
    ),
    "lakefile_digest": _digest(
        "bf7ec4f40366cb887fd57855235df6ef74203deadbb6d1a3fa06644ee0601680"
    ),
    "lean_commit": "f3b06c705e6c85f5314019d5d3baab0fec5b580c",
    "lean_version": "4.32.2",
    "mathlib_revision": "905b95818eb32af7874a58b427f50c1711a5e96c",
    "options": {"autoImplicit": False, "relaxedAutoImplicit": False},
    "toolchain_digest": _digest(
        "6a79a95d58e5ea742eb0cead94a27dc206ddd4aaf7d65419b19b0e4017daa982"
    ),
}

_RELATED_SOURCE_BINDINGS = [
    {
        "checked_in_this_run": False,
        "git_blob": _digest(
            "5e87de9e9e040cec2a0dab3b3b4fed20d9ee955a",
            "git-sha1",
        ),
        "id": "source-occurrence-appendix-a-range-lifting-v1",
        "kind": "source_occurrence",
        "label": "lem:range-lifting-pullback-section",
        "normalized_digest": _digest(
            "51c3669da3b3a850b1cf8f61f10f873f297d6a598f01d3541678137f002b1945"
        ),
        "path": "rs_Appendix_A.tex",
        "repository": "flengyel/Categorical_Rice_Shapiro",
        "repository_revision": "fdd1a01b893b125a802ea375aee051ab640c3be7",
        "statement_digest": _digest(
            "cf70f020ab60e0a7b8b5b337d7f226d57787535f8fe1531bfa9b7f7f51a46849"
        ),
        "statement_utf8_byte_length": 858,
    },
    {
        "checked_in_this_run": True,
        "declaration": (
            "CategoryTheory.Dom.exists_total_lift_iff_rangeLiftPullback_section"
        ),
        "exact_type_digest": _digest(
            "0697f499e820e58fd6a2bddcde2f9eb5b2b2a23b436b9424bb676aa98910b83b"
        ),
        "exact_type_utf8_byte_length": 453,
        "git_blob": _digest(
            "dc6ea0ec50c29c9006b78adb088d4713508487ed",
            "git-sha1",
        ),
        "id": "formal-declaration-range-lifting-v1",
        "kind": "formal_fact",
        "path": "Lean/PCats/DomPullbacks.lean",
        "repository": "flengyel/Categorical_Rice_Shapiro",
        "repository_revision": "fdd1a01b893b125a802ea375aee051ab640c3be7",
    },
    {
        "checked_in_this_run": False,
        "direction": "formal_to_manuscript",
        "git_blob": _digest(
            "9da7f070deedecdaeed9cd082fea37eac459ca74",
            "git-sha1",
        ),
        "id": "correspondence-appendix-a-range-lifting-v1",
        "kind": "correspondence_basis",
        "path": "Lean/docs/AppendixA.md",
        "repository": "flengyel/Categorical_Rice_Shapiro",
        "repository_revision": "fdd1a01b893b125a802ea375aee051ab640c3be7",
        "reviewed_by": "appendix-a-reviewed-correspondence-policy-v1",
        "source_claim": "claim-formal-range-lifting-v1",
        "target_claim": "claim-manuscript-range-lifting-v1",
    },
    {
        "checked_in_this_run": False,
        "git_blob": _digest(
            "9d38767c10c9f0ed4ad1761b3d80d4604902c6f2",
            "git-sha1",
        ),
        "id": "dom-pullbacks-regression-signature-guard-v1",
        "kind": "signature_guard_source",
        "path": "Lean/Tests/DomPullbacksRegression.lean",
        "repository": "flengyel/Categorical_Rice_Shapiro",
        "repository_revision": "fdd1a01b893b125a802ea375aee051ab640c3be7",
    },
]

APPENDIX_A_BUNDLE_EXPECTATION = BundleExpectation(
    digest='4b112e5744e590b88eb019bdd801eea5faf72b5f8432b093b1fe8bdcb255a5c5',
    schema="mrw.justification-bundle",
    schema_version=1,
    fixture_id="appendix-a-range-lifting-warrant-v1",
    exact_bindings=(
        ExactBinding(("profile",), _PROFILE),
        ExactBinding(("context",), _CONTEXT),
        ExactBinding(
            ("justification_verification", "environment"),
            _JUSTIFICATION_ENVIRONMENT,
        ),
        ExactBinding(
            ("justification_verification", "checker"),
            "MRW.Justification.checkCertificate",
        ),
        ExactBinding(
            ("justification_verification", "checker_revision"),
            "justification-checker-v1",
        ),
        ExactBinding(
            ("external_verifications", 0, "environment"),
            _EXTERNAL_ENVIRONMENT,
        ),
        ExactBinding(
            ("external_verifications", 0, "stdout_digest"),
            _digest(
                "97953c4623e4c5815b7c73cfc613f969652a86fe3cf3d52399e178e696336c6a"
            ),
        ),
        ExactBinding(("external_verifications", 0, "stdout_byte_length"), 551),
        ExactBinding(("external_verifications", 0, "axiom_report"), ["propext"]),
        ExactBinding(
            ("external_verifications", 0, "output_digest"),
            _digest(
                "be983511132d199019fe48808011a72bb88c7b317992dd64aee469738c368bdb"
            ),
        ),
        ExactBinding(
            ("related_source_bindings",),
            _RELATED_SOURCE_BINDINGS,
        ),
    ),
)


def _validate_source_binding(
    source: SourceDocument,
    bundle: ValidatedBundle,
) -> None:
    manuscript_bindings = [
        binding
        for binding in bundle.document["related_source_bindings"]
        if binding.get("kind") == "source_occurrence"
    ]
    if len(manuscript_bindings) != 1:
        raise JustificationBundleError(
            "Appendix A bundle must contain exactly one manuscript source binding"
        )
    binding = manuscript_bindings[0]
    digest = binding.get("normalized_digest")
    if not isinstance(digest, Mapping) or digest.get("value") != source.normalized_revision:
        raise JustificationBundleError(
            "Appendix A source revision does not match the checked warrant bundle"
        )
    if binding.get("label") != "lem:range-lifting-pullback-section":
        raise JustificationBundleError(
            "Appendix A manuscript binding does not name the selected result"
        )


def load_appendix_a_bundle(
    *,
    expectation: BundleExpectation | None = None,
    bundle_bytes: bytes | None = None,
) -> ValidatedBundle:
    """Load and validate the static fixture, with injection for isolated tests."""

    selected_expectation = expectation or APPENDIX_A_BUNDLE_EXPECTATION
    if selected_expectation is None:
        raise JustificationBundleError(
            "the checked Appendix A bundle expectation has not been installed"
        )
    raw = bundle_bytes
    if raw is None:
        raw = load_package_bundle(
            APPENDIX_A_BUNDLE_PACKAGE,
            APPENDIX_A_BUNDLE_RESOURCE,
        )
    return validate_bundle(raw, selected_expectation)


def render_why(
    source: SourceDocument,
    *,
    expectation: BundleExpectation | None = None,
    bundle_bytes: bytes | None = None,
) -> str:
    """Render all mathematical levels, correspondence, and checked warrant."""

    mathematical_view = render_complete_study(source)
    selected_expectation = expectation or APPENDIX_A_BUNDLE_EXPECTATION
    if selected_expectation is None:
        raise JustificationBundleError(
            "the checked Appendix A bundle expectation has not been installed"
        )
    bundle = load_appendix_a_bundle(
        expectation=selected_expectation,
        bundle_bytes=bundle_bytes,
    )
    _validate_source_binding(source, bundle)
    return f"{mathematical_view}\n\n{render_warrant(bundle)}"
