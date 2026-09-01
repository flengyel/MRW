from __future__ import annotations

from collections.abc import Mapping

from theorem_terminal.appendix_a import render_complete_study
from theorem_terminal.justification import (
    BundleExpectation,
    ExactBinding,
    JustificationBundleError,
    ValidatedBundle,
    load_package_bundle,
    render_warrant,
    validate_bundle,
)
from theorem_terminal.source import SourceDocument


APPENDIX_A_BUNDLE_PACKAGE = "theorem_terminal.data"
APPENDIX_A_BUNDLE_RESOURCE = "appendix_a_justification.json"


def _digest(value: str, algorithm: str = "sha256") -> dict[str, str]:
    return {"algorithm": algorithm, "value": value}


_PROFILE = {
    "checker": "TheoremTerminal.Justification.checkCertificate",
    "checker_version": "justification-checker-v1",
    "constant_specification": None,
    "id": "theorem-terminal-j0-appendix-a-v1",
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
    "profile": "theorem-terminal-j0-appendix-a-v1",
    "rationale": (
        "Initial context for the exact Appendix A kernel-policy-correspondence route."
    ),
    "removed": [],
}

_JUSTIFICATION_ENVIRONMENT = {
    "checked_artifacts": [
        {
            "digest": _digest(
                "1b20186f4e3bdd22bf35fda3613597e9b29189756aba7f86cda7dad6b9f1acc6"
            ),
            "path": (
                ".lake/build/lib/lean/TheoremTerminal/Justification/Certificate.olean"
            ),
            "role": "certificate_checker",
        },
        {
            "digest": _digest(
                "6a12fc7cb150b9b712b56a803e6158a1bbb09c9c02d62d92e72e9b5329217085"
            ),
            "path": ".lake/build/lib/lean/TheoremTerminal/Justification/AppendixA.olean",
            "role": "checked_fixture_witness",
        },
    ],
    "checker_source_closure": [
        {
            "digest": _digest(
                "b75550589988116ac47c94fb4a8cdba112719b34b4d5c826797c7f17f3a9f947"
            ),
            "path": "TheoremTerminal/Justification/Syntax.lean",
        },
        {
            "digest": _digest(
                "aac7ca0b99c2d6670ead7bf9d9e3c2fb3763fdab15c5975f5dae4f1b58ac75e6"
            ),
            "path": "TheoremTerminal/Justification/Axioms.lean",
        },
        {
            "digest": _digest(
                "50cfbcf008757b39f071395866478edd05181408826850e45c5a6bf64c354a18"
            ),
            "path": "TheoremTerminal/Justification/ConstantSpecification.lean",
        },
        {
            "digest": _digest(
                "8557b6e6d345e17783c76c8a89a2d6333cf5096f5909c8b04f97a16c7108e52c"
            ),
            "path": "TheoremTerminal/Justification/Derivation.lean",
        },
        {
            "digest": _digest(
                "9bd4379f4f8cb108e39cebd29a9e828297875e1f7ba21fd486b47461e12ddb93"
            ),
            "path": "TheoremTerminal/Justification/Certificate.lean",
        },
        {
            "digest": _digest(
                "777f180a4640dcf2edbbee875d5c5df2f74e197a87fafd9399332f9edf2ddf58"
            ),
            "path": "TheoremTerminal/Justification/Semantics.lean",
        },
    ],
    "fixture_source": {
        "digest": _digest(
            "38984392f74ba3d8cf40d0039469ad76e48bdc27acebfa0f499f849a9af18a77"
        ),
        "path": "TheoremTerminal/Justification/AppendixA.lean",
    },
    "lake_manifest_digest": _digest(
        "d0c86d76b61b09fb475c8bd48f54e2590755043b71641656c9a967b3a91ee2b5"
    ),
    "lakefile_digest": _digest(
        "51470072fff98e4749623db56d836354f2adf477fe70aca04dd454cb6ae410d3"
    ),
    "lean_commit": "f3b06c705e6c85f5314019d5d3baab0fec5b580c",
    "lean_version": "4.32.2",
    "toolchain_digest": _digest(
        "2bdc48adfa58d0017e538a0ad117c5d73d35deec879978f909406a80c8037273"
    ),
}

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
    digest="3ca6794e8e9f2ec6f7d6bd08662ac19df2a4496287e8559aec556b3febdd81ed",
    schema="theorem-terminal.justification-bundle",
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
            "TheoremTerminal.Justification.checkCertificate",
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
