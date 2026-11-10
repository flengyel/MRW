from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from importlib import resources
import json
from types import MappingProxyType
from typing import Any, Mapping, Sequence


_TOP_LEVEL_KEYS = frozenset(
    {
        "schema",
        "schema_version",
        "fixture_id",
        "profile",
        "claims",
        "external_verifications",
        "admissions",
        "context",
        "derivation",
        "justification_verification",
        "related_source_bindings",
    }
)
_PROFILE_KEYS = frozenset(
    {
        "id",
        "system",
        "syntax_version",
        "rule_version",
        "checker",
        "checker_version",
        "constant_specification",
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
_ADMISSION_KEYS = frozenset(
    {
        "id",
        "formula",
        "basis_refs",
        "admitted_by",
        "rationale",
        "scope",
        "at",
        "supersedes",
    }
)
_CONTEXT_KEYS = frozenset(
    {
        "id",
        "profile",
        "admissions",
        "predecessor",
        "change_kind",
        "added",
        "removed",
        "created_by",
        "rationale",
        "created_at",
    }
)
_DERIVATION_KEYS = frozenset(
    {
        "id",
        "profile",
        "context",
        "nodes",
        "conclusion",
        "constant_specification_footprint",
        "certificate_version",
        "dependency_refs",
    }
)
_DERIVATION_NODE_KEYS = frozenset({"index", "formula", "rule"})
_JUSTIFICATION_VERIFICATION_KEYS = frozenset(
    {
        "id",
        "subject",
        "claim_checked",
        "method",
        "result",
        "checker",
        "checker_revision",
        "environment",
        "profile",
        "context",
        "at",
    }
)
_JUSTIFICATION_ENVIRONMENT_KEYS = frozenset(
    {
        "lean_version",
        "lean_commit",
        "toolchain_digest",
        "lakefile_digest",
        "lake_manifest_digest",
        "fixture_source",
        "checker_source_closure",
        "checked_artifacts",
    }
)
_CHECKER_SOURCE_BINDING_KEYS = frozenset({"path", "digest"})
_CHECKED_ARTIFACT_KEYS = frozenset({"path", "digest", "role"})
_EXTERNAL_VERIFICATION_KEYS = frozenset(
    {
        "id",
        "subject",
        "claim_checked",
        "method",
        "result",
        "checker_revision",
        "command",
        "command_argv",
        "working_directory_role",
        "exit_code",
        "stdout",
        "stdout_byte_length",
        "stdout_digest",
        "stderr",
        "stderr_byte_length",
        "stderr_digest",
        "axiom_report",
        "environment",
        "output_artifact",
        "output_digest",
        "profile",
        "context",
        "started_at",
        "completed_at",
        "at",
    }
)
_EXTERNAL_ENVIRONMENT_KEYS = frozenset(
    {
        "categorical_repository",
        "categorical_revision",
        "lean_version",
        "lean_commit",
        "mathlib_revision",
        "toolchain_digest",
        "lakefile_digest",
        "lake_manifest_digest",
        "attestation_source_digest",
        "imports",
        "import_closure",
        "command_environment",
        "options",
    }
)
_IMPORT_BINDING_KEYS = frozenset({"path", "git_blob"})
_DIGEST_KEYS = frozenset({"algorithm", "value"})
_REFERENCE_KEYS = frozenset({"kind", "id"})
_REVISED_REFERENCE_KEYS = frozenset({"kind", "id", "revision"})
_ACTOR_KEYS = frozenset({"kind", "id"})
_CS_MEMBER_KEYS = frozenset({"id", "formula"})
_RUNTIME_CHECKER_VERIFICATION_KEYS = frozenset(
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
_RUNTIME_ARTIFACT_IDENTITY_KEYS = frozenset(
    {"schema", "schema_version", "fixture_id"}
)
_RUNTIME_ENVIRONMENT_WRAPPER_KEYS = frozenset(
    {
        "reported_checker_environment",
        "reported_verification",
        "runtime_checker",
        "input_artifacts",
    }
)
MAX_BUNDLE_BYTES = 2 * 1024 * 1024

_SOURCE_BINDING_KEYS = {
    "source_occurrence": frozenset(
        {
            "id",
            "kind",
            "checked_in_this_run",
            "repository",
            "repository_revision",
            "path",
            "git_blob",
            "label",
            "normalized_digest",
            "statement_digest",
            "statement_utf8_byte_length",
        }
    ),
    "formal_fact": frozenset(
        {
            "id",
            "kind",
            "checked_in_this_run",
            "repository",
            "repository_revision",
            "path",
            "git_blob",
            "declaration",
            "exact_type_digest",
            "exact_type_utf8_byte_length",
        }
    ),
    "correspondence_basis": frozenset(
        {
            "id",
            "kind",
            "checked_in_this_run",
            "repository",
            "repository_revision",
            "path",
            "git_blob",
            "direction",
            "source_claim",
            "target_claim",
            "reviewed_by",
        }
    ),
    "signature_guard_source": frozenset(
        {
            "id",
            "kind",
            "checked_in_this_run",
            "repository",
            "repository_revision",
            "path",
            "git_blob",
        }
    ),
}


class JustificationBundleError(ValueError):
    """Raised when a checked-bundle artifact cannot be trusted or rendered."""


def _freeze_json(value: Any) -> Any:
    """Return an immutable, detached copy of a JSON-compatible value."""

    if isinstance(value, Mapping):
        return MappingProxyType(
            {key: _freeze_json(item) for key, item in value.items()}
        )
    if isinstance(value, (list, tuple)):
        return tuple(_freeze_json(item) for item in value)
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    raise TypeError("retained values must be JSON-compatible")


@dataclass(frozen=True)
class ExactBinding:
    """One independently retained exact value at a JSON path."""

    path: tuple[str | int, ...]
    value: object

    def __post_init__(self) -> None:
        detached_path = tuple(self.path)
        if not detached_path or any(
            isinstance(component, bool)
            or not isinstance(component, (str, int))
            or (isinstance(component, str) and not component)
            or (isinstance(component, int) and component < 0)
            for component in detached_path
        ):
            raise ValueError(
                "exact-binding paths must contain strings or nonnegative integers"
            )
        object.__setattr__(self, "path", detached_path)
        object.__setattr__(self, "value", _freeze_json(self.value))


@dataclass(frozen=True)
class BundleExpectation:
    """Integrity and identity retained outside the emitted bundle.

    A package fixture supplies a code-pinned digest. A later runtime fixture can
    supply the same values from its immutable checker ``Verification``.
    """

    digest: str
    schema: str
    schema_version: int
    fixture_id: str
    exact_bindings: Sequence[ExactBinding] = ()

    def __post_init__(self) -> None:
        bindings = tuple(self.exact_bindings)
        if any(not isinstance(binding, ExactBinding) for binding in bindings):
            raise TypeError("exact_bindings must contain ExactBinding records")
        object.__setattr__(self, "exact_bindings", bindings)


@dataclass(frozen=True)
class ValidatedBundle:
    """A structurally validated bundle; no logical inference was rechecked."""

    digest: str
    document: Mapping[str, object]


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


def _path(parent: str, child: str | int) -> str:
    if isinstance(child, int):
        return f"{parent}[{child}]"
    return f"{parent}.{child}" if parent else child


def _require_object(value: object, path: str) -> dict[str, object]:
    if not isinstance(value, dict):
        raise JustificationBundleError(f"{path} must be a JSON object")
    return value


def _require_array(value: object, path: str) -> list[object]:
    if not isinstance(value, list):
        raise JustificationBundleError(f"{path} must be a JSON array")
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
        raise JustificationBundleError(f"{path} has wrong fields: {'; '.join(details)}")


def _require_string(
    value: object,
    path: str,
    *,
    allow_empty: bool = False,
    allow_multiline: bool = False,
) -> str:
    if not isinstance(value, str) or (not allow_empty and not value):
        qualifier = "a string" if allow_empty else "a non-empty string"
        raise JustificationBundleError(f"{path} must be {qualifier}")
    unsafe = next(
        (
            character
            for character in value
            if (
                ord(character) < 0x20
                and not (allow_multiline and character in "\n\t")
            )
            or 0x7F <= ord(character) <= 0x9F
            or ord(character) in (0x061C, 0x200E, 0x200F)
            or 0x202A <= ord(character) <= 0x202E
            or 0x2066 <= ord(character) <= 0x2069
        ),
        None,
    )
    if unsafe is not None:
        raise JustificationBundleError(
            f"{path} contains unsafe terminal control U+{ord(unsafe):04X}"
        )
    return value


def _require_integer(value: object, path: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise JustificationBundleError(f"{path} must be an integer")
    return value


def _require_boolean(value: object, path: str) -> bool:
    if not isinstance(value, bool):
        raise JustificationBundleError(f"{path} must be a Boolean")
    return value


def _require_nullable_string(value: object, path: str) -> str | None:
    if value is None:
        return None
    return _require_string(value, path)


def _require_string_array(value: object, path: str) -> list[str]:
    items = _require_array(value, path)
    return [
        _require_string(item, _path(path, index))
        for index, item in enumerate(items)
    ]


def _validate_digest(value: object, path: str) -> dict[str, object]:
    digest = _require_object(value, path)
    _require_exact_keys(digest, _DIGEST_KEYS, path)
    algorithm = _require_string(digest["algorithm"], _path(path, "algorithm"))
    encoded = _require_string(digest["value"], _path(path, "value"))
    lengths = {"sha256": 64, "git-sha1": 40}
    if algorithm not in lengths:
        raise JustificationBundleError(f"{path}.algorithm is not recognized")
    if len(encoded) != lengths[algorithm] or any(
        character not in "0123456789abcdef" for character in encoded
    ):
        raise JustificationBundleError(f"{path}.value is not a lowercase {algorithm}")
    return digest


def _validate_reference(value: object, path: str) -> dict[str, object]:
    reference = _require_object(value, path)
    keys = frozenset(reference)
    if keys not in (_REFERENCE_KEYS, _REVISED_REFERENCE_KEYS):
        _require_exact_keys(reference, _REFERENCE_KEYS, path)
    for key in keys:
        _require_string(reference[key], _path(path, key))
    return reference


def _validate_references(value: object, path: str) -> list[dict[str, object]]:
    return [
        _validate_reference(item, _path(path, index))
        for index, item in enumerate(_require_array(value, path))
    ]


def _validate_actor(value: object, path: str) -> dict[str, object]:
    actor = _require_object(value, path)
    _require_exact_keys(actor, _ACTOR_KEYS, path)
    _require_string(actor["kind"], _path(path, "kind"))
    _require_string(actor["id"], _path(path, "id"))
    return actor


def _validate_term(value: object, path: str) -> list[object]:
    term = _require_array(value, path)
    if not term:
        raise JustificationBundleError(f"{path} must have a constructor tag")
    tag = _require_string(term[0], _path(path, 0))
    arity = {"variable": 2, "constant": 2, "application": 3, "sum": 3}
    if tag not in arity or len(term) != arity[tag]:
        raise JustificationBundleError(f"{path} has an invalid term shape")
    if tag in ("variable", "constant"):
        _require_string(term[1], _path(path, 1))
    else:
        _validate_term(term[1], _path(path, 1))
        _validate_term(term[2], _path(path, 2))
    return term


def _validate_formula(value: object, path: str) -> list[object]:
    formula = _require_array(value, path)
    if not formula:
        raise JustificationBundleError(f"{path} must have a constructor tag")
    tag = _require_string(formula[0], _path(path, 0))
    arity = {"atom": 2, "bottom": 1, "implication": 3, "reason": 3}
    if tag not in arity or len(formula) != arity[tag]:
        raise JustificationBundleError(f"{path} has an invalid formula shape")
    if tag == "atom":
        atom_path = _path(path, 1)
        atom = _require_object(formula[1], atom_path)
        _require_exact_keys(atom, frozenset({"id", "content_hash"}), atom_path)
        _require_string(atom["id"], _path(atom_path, "id"))
        _validate_digest(atom["content_hash"], _path(atom_path, "content_hash"))
    elif tag == "implication":
        _validate_formula(formula[1], _path(path, 1))
        _validate_formula(formula[2], _path(path, 2))
    elif tag == "reason":
        _validate_term(formula[1], _path(path, 1))
        _validate_formula(formula[2], _path(path, 2))
    return formula


def _validate_profile(value: object, schema_version: int) -> dict[str, object]:
    profile = _require_object(value, "profile")
    _require_exact_keys(profile, _PROFILE_KEYS, "profile")
    for key in _PROFILE_KEYS - {"constant_specification"}:
        _require_string(profile[key], _path("profile", key))
    if schema_version != 1:
        raise JustificationBundleError(
            f"schema_version {schema_version} is not supported by this validator"
        )
    if profile["system"] != "J0":
        raise JustificationBundleError("profile.system must be J0 in schema version 1")
    if profile["constant_specification"] is not None:
        raise JustificationBundleError(
            "profile.constant_specification must be null in schema version 1"
        )
    return profile


def _validate_claims(value: object) -> list[dict[str, object]]:
    claims = _require_array(value, "claims")
    result = []
    identifiers: set[str] = set()
    for index, item in enumerate(claims):
        path = _path("claims", index)
        claim = _require_object(item, path)
        _require_exact_keys(claim, _CLAIM_KEYS, path)
        for key in ("id", "display_name", "assertion", "description"):
            _require_string(claim[key], _path(path, key))
        _validate_digest(claim["content_hash"], _path(path, "content_hash"))
        _validate_references(
            claim["representation_refs"],
            _path(path, "representation_refs"),
        )
        identifier = claim["id"]
        assert isinstance(identifier, str)
        if identifier in identifiers:
            raise JustificationBundleError(f"duplicate claim id: {identifier}")
        identifiers.add(identifier)
        result.append(claim)
    return result


def _validate_admissions(value: object) -> list[dict[str, object]]:
    admissions = _require_array(value, "admissions")
    result = []
    identifiers: set[str] = set()
    for index, item in enumerate(admissions):
        path = _path("admissions", index)
        admission = _require_object(item, path)
        _require_exact_keys(admission, _ADMISSION_KEYS, path)
        for key in ("id", "rationale", "scope", "at"):
            _require_string(admission[key], _path(path, key))
        _validate_formula(admission["formula"], _path(path, "formula"))
        _validate_references(admission["basis_refs"], _path(path, "basis_refs"))
        _validate_actor(admission["admitted_by"], _path(path, "admitted_by"))
        _require_nullable_string(admission["supersedes"], _path(path, "supersedes"))
        identifier = admission["id"]
        assert isinstance(identifier, str)
        if identifier in identifiers:
            raise JustificationBundleError(f"duplicate admission id: {identifier}")
        identifiers.add(identifier)
        result.append(admission)
    return result


def _validate_context(value: object) -> dict[str, object]:
    context = _require_object(value, "context")
    _require_exact_keys(context, _CONTEXT_KEYS, "context")
    for key in ("id", "profile", "change_kind", "rationale", "created_at"):
        _require_string(context[key], _path("context", key))
    _require_nullable_string(context["predecessor"], "context.predecessor")
    for key in ("admissions", "added", "removed"):
        _require_string_array(context[key], _path("context", key))
    _validate_actor(context["created_by"], "context.created_by")
    return context


def _validate_rule(value: object, path: str) -> dict[str, object]:
    rule = _require_object(value, path)
    kind = _require_string(rule.get("kind"), _path(path, "kind"))
    key_sets = {
        "premise": frozenset({"kind", "admission_id"}),
        "logical_axiom": frozenset({"kind", "axiom_kind"}),
        "constant_specification": frozenset({"kind", "member_id"}),
        "modus_ponens": frozenset({"kind", "major", "minor"}),
    }
    if kind not in key_sets:
        raise JustificationBundleError(f"{path}.kind is not recognized")
    _require_exact_keys(rule, key_sets[kind], path)
    if kind == "modus_ponens":
        _require_integer(rule["major"], _path(path, "major"))
        _require_integer(rule["minor"], _path(path, "minor"))
    else:
        detail = next(key for key in key_sets[kind] if key != "kind")
        _require_string(rule[detail], _path(path, detail))
    return rule


def _validate_derivation(value: object) -> dict[str, object]:
    derivation = _require_object(value, "derivation")
    _require_exact_keys(derivation, _DERIVATION_KEYS, "derivation")
    for key in ("id", "profile", "context", "certificate_version"):
        _require_string(derivation[key], _path("derivation", key))
    _validate_formula(derivation["conclusion"], "derivation.conclusion")
    _validate_references(derivation["dependency_refs"], "derivation.dependency_refs")
    footprint = _require_array(
        derivation["constant_specification_footprint"],
        "derivation.constant_specification_footprint",
    )
    for index, item in enumerate(footprint):
        path = _path("derivation.constant_specification_footprint", index)
        member = _require_object(item, path)
        _require_exact_keys(member, _CS_MEMBER_KEYS, path)
        _require_string(member["id"], _path(path, "id"))
        _validate_formula(member["formula"], _path(path, "formula"))
    nodes = _require_array(derivation["nodes"], "derivation.nodes")
    for index, item in enumerate(nodes):
        path = _path("derivation.nodes", index)
        node = _require_object(item, path)
        _require_exact_keys(node, _DERIVATION_NODE_KEYS, path)
        _require_integer(node["index"], _path(path, "index"))
        _validate_formula(node["formula"], _path(path, "formula"))
        _validate_rule(node["rule"], _path(path, "rule"))
    return derivation


def _validate_string_mapping(value: object, path: str) -> dict[str, object]:
    mapping = _require_object(value, path)
    for key, item in mapping.items():
        _require_string(key, path)
        _require_string(item, _path(path, key))
    return mapping


def _validate_boolean_mapping(value: object, path: str) -> dict[str, object]:
    mapping = _require_object(value, path)
    for key, item in mapping.items():
        _require_string(key, path)
        _require_boolean(item, _path(path, key))
    return mapping


def _validate_external_environment(value: object, path: str) -> dict[str, object]:
    environment = _require_object(value, path)
    _require_exact_keys(environment, _EXTERNAL_ENVIRONMENT_KEYS, path)
    for key in (
        "categorical_repository",
        "categorical_revision",
        "lean_version",
        "lean_commit",
        "mathlib_revision",
    ):
        _require_string(environment[key], _path(path, key))
    for key in (
        "toolchain_digest",
        "lakefile_digest",
        "lake_manifest_digest",
        "attestation_source_digest",
    ):
        _validate_digest(environment[key], _path(path, key))
    _require_string_array(environment["imports"], _path(path, "imports"))
    closure_path = _path(path, "import_closure")
    closure = _require_array(environment["import_closure"], closure_path)
    for index, item in enumerate(closure):
        item_path = _path(closure_path, index)
        binding = _require_object(item, item_path)
        _require_exact_keys(binding, _IMPORT_BINDING_KEYS, item_path)
        _require_string(binding["path"], _path(item_path, "path"))
        _validate_digest(binding["git_blob"], _path(item_path, "git_blob"))
    _validate_string_mapping(
        environment["command_environment"],
        _path(path, "command_environment"),
    )
    _validate_boolean_mapping(environment["options"], _path(path, "options"))
    return environment


def _validate_external_verifications(value: object) -> list[dict[str, object]]:
    verifications = _require_array(value, "external_verifications")
    result = []
    for index, item in enumerate(verifications):
        path = _path("external_verifications", index)
        verification = _require_object(item, path)
        _require_exact_keys(verification, _EXTERNAL_VERIFICATION_KEYS, path)
        for key in (
            "id",
            "subject",
            "claim_checked",
            "method",
            "result",
            "checker_revision",
            "command",
            "working_directory_role",
            "output_artifact",
            "started_at",
            "completed_at",
            "at",
        ):
            _require_string(verification[key], _path(path, key))
        _require_string(
            verification["stdout"],
            _path(path, "stdout"),
            allow_empty=True,
            allow_multiline=True,
        )
        _require_string(
            verification["stderr"],
            _path(path, "stderr"),
            allow_empty=True,
            allow_multiline=True,
        )
        _require_string_array(verification["command_argv"], _path(path, "command_argv"))
        _require_string_array(verification["axiom_report"], _path(path, "axiom_report"))
        for key in ("exit_code", "stdout_byte_length", "stderr_byte_length"):
            _require_integer(verification[key], _path(path, key))
        for key in ("stdout_digest", "stderr_digest", "output_digest"):
            _validate_digest(verification[key], _path(path, key))
        _require_nullable_string(verification["profile"], _path(path, "profile"))
        _require_nullable_string(verification["context"], _path(path, "context"))
        _validate_external_environment(verification["environment"], _path(path, "environment"))

        for stream in ("stdout", "stderr"):
            stream_value = verification[stream]
            assert isinstance(stream_value, str)
            encoded = stream_value.encode("utf-8")
            if len(encoded) != verification[f"{stream}_byte_length"]:
                raise JustificationBundleError(f"{path}.{stream}_byte_length is inconsistent")
            digest = verification[f"{stream}_digest"]
            assert isinstance(digest, dict)
            if digest["algorithm"] != "sha256" or digest["value"] != sha256(encoded).hexdigest():
                raise JustificationBundleError(f"{path}.{stream}_digest is inconsistent")
        result.append(verification)
    return result


def _validate_justification_verification(value: object) -> dict[str, object]:
    path = "justification_verification"
    verification = _require_object(value, path)
    _require_exact_keys(verification, _JUSTIFICATION_VERIFICATION_KEYS, path)
    for key in _JUSTIFICATION_VERIFICATION_KEYS - {"environment"}:
        _require_string(verification[key], _path(path, key))
    environment_path = _path(path, "environment")
    environment = _require_object(verification["environment"], environment_path)
    _require_exact_keys(environment, _JUSTIFICATION_ENVIRONMENT_KEYS, environment_path)
    _require_string(environment["lean_version"], _path(environment_path, "lean_version"))
    _require_string(environment["lean_commit"], _path(environment_path, "lean_commit"))
    for key in ("toolchain_digest", "lakefile_digest", "lake_manifest_digest"):
        _validate_digest(environment[key], _path(environment_path, key))
    fixture_path = _path(environment_path, "fixture_source")
    fixture = _require_object(environment["fixture_source"], fixture_path)
    _require_exact_keys(fixture, _CHECKER_SOURCE_BINDING_KEYS, fixture_path)
    _require_string(fixture["path"], _path(fixture_path, "path"))
    _validate_digest(fixture["digest"], _path(fixture_path, "digest"))
    closure_path = _path(environment_path, "checker_source_closure")
    closure = _require_array(environment["checker_source_closure"], closure_path)
    for index, item in enumerate(closure):
        item_path = _path(closure_path, index)
        binding = _require_object(item, item_path)
        _require_exact_keys(binding, _CHECKER_SOURCE_BINDING_KEYS, item_path)
        _require_string(binding["path"], _path(item_path, "path"))
        _validate_digest(binding["digest"], _path(item_path, "digest"))
    artifacts_path = _path(environment_path, "checked_artifacts")
    artifacts = _require_array(environment["checked_artifacts"], artifacts_path)
    for index, item in enumerate(artifacts):
        item_path = _path(artifacts_path, index)
        artifact = _require_object(item, item_path)
        _require_exact_keys(artifact, _CHECKED_ARTIFACT_KEYS, item_path)
        _require_string(artifact["path"], _path(item_path, "path"))
        _require_string(artifact["role"], _path(item_path, "role"))
        _validate_digest(artifact["digest"], _path(item_path, "digest"))
    return verification


def _validate_source_bindings(value: object) -> list[dict[str, object]]:
    bindings = _require_array(value, "related_source_bindings")
    result = []
    for index, item in enumerate(bindings):
        path = _path("related_source_bindings", index)
        binding = _require_object(item, path)
        kind = _require_string(binding.get("kind"), _path(path, "kind"))
        if kind not in _SOURCE_BINDING_KEYS:
            raise JustificationBundleError(f"{path}.kind is not recognized")
        _require_exact_keys(binding, _SOURCE_BINDING_KEYS[kind], path)
        for key in (
            "id",
            "kind",
            "repository",
            "repository_revision",
            "path",
        ):
            _require_string(binding[key], _path(path, key))
        _require_boolean(binding["checked_in_this_run"], _path(path, "checked_in_this_run"))
        _validate_digest(binding["git_blob"], _path(path, "git_blob"))
        if kind == "source_occurrence":
            _require_string(binding["label"], _path(path, "label"))
            _validate_digest(binding["normalized_digest"], _path(path, "normalized_digest"))
            _validate_digest(binding["statement_digest"], _path(path, "statement_digest"))
            _require_integer(
                binding["statement_utf8_byte_length"],
                _path(path, "statement_utf8_byte_length"),
            )
        elif kind == "formal_fact":
            _require_string(binding["declaration"], _path(path, "declaration"))
            _validate_digest(binding["exact_type_digest"], _path(path, "exact_type_digest"))
            _require_integer(
                binding["exact_type_utf8_byte_length"],
                _path(path, "exact_type_utf8_byte_length"),
            )
        elif kind == "correspondence_basis":
            for key in ("direction", "source_claim", "target_claim", "reviewed_by"):
                _require_string(binding[key], _path(path, key))
        result.append(binding)
    return result


def _lookup_path(document: object, path: tuple[str | int, ...]) -> object:
    current = document
    rendered = "bundle"
    for component in path:
        if isinstance(component, str):
            if not isinstance(current, Mapping) or component not in current:
                raise JustificationBundleError(
                    f"retained binding path is absent: {rendered}.{component}"
                )
            current = current[component]
        else:
            if not isinstance(current, (list, tuple)) or not 0 <= component < len(current):
                raise JustificationBundleError(
                    f"retained binding path is absent: {rendered}[{component}]"
                )
            current = current[component]
        rendered = _path(rendered, component)
    return current


def _normalize_json(value: object) -> object:
    if isinstance(value, Mapping):
        return {key: _normalize_json(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_normalize_json(item) for item in value]
    return value


def _validate_unicode_tree(value: object, path: str = "bundle", depth: int = 0) -> None:
    if depth > 100:
        raise JustificationBundleError("bundle JSON nesting exceeds 100 levels")
    if isinstance(value, str):
        try:
            value.encode("utf-8", errors="strict")
        except UnicodeEncodeError as exc:
            raise JustificationBundleError(f"{path} is not strict Unicode") from exc
    elif isinstance(value, Mapping):
        for key, item in value.items():
            _validate_unicode_tree(key, f"{path}.<key>", depth + 1)
            _validate_unicode_tree(item, _path(path, key), depth + 1)
    elif isinstance(value, (list, tuple)):
        for index, item in enumerate(value):
            _validate_unicode_tree(item, _path(path, index), depth + 1)


def bundle_expectation_from_verification(
    verification: Mapping[str, object],
    *,
    exact_bindings: Sequence[ExactBinding] = (),
) -> BundleExpectation:
    """Derive a runtime bundle expectation from an immutable checker record.

    The caller is responsible for creating this generic ``Verification`` at
    the trusted checker handoff from the same captured byte stream that was
    persisted.  This function performs no I/O and never invokes the checker.
    It accepts only a successful justification-checker verification and pins
    the exact profile, context, checker attestation, and environment found in
    that record.
    """

    record = _require_object(_normalize_json(verification), "verification")
    _require_exact_keys(
        record,
        _RUNTIME_CHECKER_VERIFICATION_KEYS,
        "verification",
    )
    for key in ("id", "subject", "claim", "checker_revision", "at"):
        _require_string(record[key], _path("verification", key))
    method = _require_string(record["method"], "verification.method")
    status = _require_string(record["status"], "verification.status")
    if method != "justification_checker":
        raise JustificationBundleError(
            "verification.method must be justification_checker"
        )
    if status != "verified":
        raise JustificationBundleError("verification.status must be verified")

    identity = _require_object(
        record["artifact_identity"],
        "verification.artifact_identity",
    )
    _require_exact_keys(
        identity,
        _RUNTIME_ARTIFACT_IDENTITY_KEYS,
        "verification.artifact_identity",
    )
    schema = _require_string(
        identity["schema"],
        "verification.artifact_identity.schema",
    )
    schema_version = _require_integer(
        identity["schema_version"],
        "verification.artifact_identity.schema_version",
    )
    fixture_id = _require_string(
        identity["fixture_id"],
        "verification.artifact_identity.fixture_id",
    )
    artifact_digest = _validate_digest(
        record["artifact_digest"],
        "verification.artifact_digest",
    )
    if artifact_digest["algorithm"] != "sha256":
        raise JustificationBundleError(
            "verification.artifact_digest must use sha256"
        )

    profile = _require_object(record["profile"], "verification.profile")
    context = _require_object(record["context"], "verification.context")
    environment = _require_object(record["environment"], "verification.environment")
    profile_id = _require_string(profile.get("id"), "verification.profile.id")
    checker = _require_string(profile.get("checker"), "verification.profile.checker")
    profile_checker_revision = _require_string(
        profile.get("checker_version"),
        "verification.profile.checker_version",
    )
    context_id = _require_string(context.get("id"), "verification.context.id")
    context_profile = _require_string(
        context.get("profile"),
        "verification.context.profile",
    )
    if context_profile != profile_id:
        raise JustificationBundleError(
            "verification profile and context references are inconsistent"
        )
    if profile_checker_revision != record["checker_revision"]:
        raise JustificationBundleError(
            "verification checker revision and profile are inconsistent"
        )
    if not environment:
        raise JustificationBundleError("verification.environment must not be empty")

    if frozenset(environment) == _RUNTIME_ENVIRONMENT_WRAPPER_KEYS:
        reported_environment = _require_object(
            environment["reported_checker_environment"],
            "verification.environment.reported_checker_environment",
        )
        embedded_verification = _require_object(
            environment["reported_verification"],
            "verification.environment.reported_verification",
        )
        runtime_checker = _require_object(
            environment["runtime_checker"],
            "verification.environment.runtime_checker",
        )
        input_artifacts = _require_array(
            environment["input_artifacts"],
            "verification.environment.input_artifacts",
        )
        if not reported_environment or not runtime_checker or not input_artifacts:
            raise JustificationBundleError(
                "verification runtime environment must not be empty"
            )
        _require_exact_keys(
            embedded_verification,
            _JUSTIFICATION_VERIFICATION_KEYS,
            "verification.environment.reported_verification",
        )
        consistency = {
            "subject": record["subject"],
            "claim_checked": record["claim"],
            "method": method,
            "result": "passed",
            "checker": checker,
            "checker_revision": record["checker_revision"],
            "environment": reported_environment,
            "profile": profile_id,
            "context": context_id,
        }
        for key, expected in consistency.items():
            if embedded_verification.get(key) != expected:
                raise JustificationBundleError(
                    "reported checker verification is inconsistent with its external Verification"
                )
        _require_string(
            embedded_verification.get("id"),
            "verification.environment.reported_verification.id",
        )
        _require_string(
            embedded_verification.get("at"),
            "verification.environment.reported_verification.at",
        )
    else:
        embedded_verification = {
            "id": record["id"],
            "subject": record["subject"],
            "claim_checked": record["claim"],
            "method": method,
            "result": "passed",
            "checker": checker,
            "checker_revision": record["checker_revision"],
            "environment": environment,
            "profile": profile_id,
            "context": context_id,
            "at": record["at"],
        }
    retained = (
        ExactBinding(("profile",), profile),
        ExactBinding(("context",), context),
        ExactBinding(("derivation", "id"), record["subject"]),
        ExactBinding(("justification_verification",), embedded_verification),
        *tuple(exact_bindings),
    )
    digest_value = artifact_digest["value"]
    assert isinstance(digest_value, str)
    return BundleExpectation(
        digest=digest_value,
        schema=schema,
        schema_version=schema_version,
        fixture_id=fixture_id,
        exact_bindings=retained,
    )


def validate_bundle(raw: bytes, expectation: BundleExpectation) -> ValidatedBundle:
    """Validate a Lean-emitted audit bundle without checking its derivation."""

    if not isinstance(raw, bytes):
        raise TypeError("raw bundle must be bytes")
    if len(raw) > MAX_BUNDLE_BYTES:
        raise JustificationBundleError(
            f"bundle exceeds the {MAX_BUNDLE_BYTES}-byte limit"
        )
    if len(expectation.digest) != 64 or any(
        character not in "0123456789abcdef" for character in expectation.digest
    ):
        raise ValueError("expected bundle digest must be lowercase SHA-256")

    actual_digest = sha256(raw).hexdigest()
    if actual_digest != expectation.digest:
        raise JustificationBundleError(
            "bundle SHA-256 does not match its independently retained expectation"
        )
    try:
        text = raw.decode("utf-8", errors="strict")
    except UnicodeDecodeError as exc:
        raise JustificationBundleError("bundle is not strict UTF-8") from exc
    try:
        parsed = json.loads(
            text,
            object_pairs_hook=_reject_duplicate_keys,
            parse_constant=_reject_nonstandard_json_constant,
        )
    except _DuplicateKeyError as exc:
        raise JustificationBundleError(f"bundle contains duplicate JSON key: {exc}") from exc
    except _NonstandardJsonConstantError as exc:
        raise JustificationBundleError(
            f"bundle contains non-standard JSON number: {exc}"
        ) from exc
    except json.JSONDecodeError as exc:
        raise JustificationBundleError(f"bundle is not valid JSON: {exc.msg}") from exc
    except RecursionError as exc:
        raise JustificationBundleError("bundle JSON nesting is excessive") from exc

    document = _require_object(parsed, "bundle")
    _validate_unicode_tree(document)
    _require_exact_keys(document, _TOP_LEVEL_KEYS, "bundle")
    _require_string(document["schema"], "schema")
    schema_version = _require_integer(document["schema_version"], "schema_version")
    _require_string(document["fixture_id"], "fixture_id")
    profile = _validate_profile(document["profile"], schema_version)
    _validate_claims(document["claims"])
    _validate_external_verifications(document["external_verifications"])
    _validate_admissions(document["admissions"])
    context = _validate_context(document["context"])
    derivation = _validate_derivation(document["derivation"])
    verification = _validate_justification_verification(
        document["justification_verification"]
    )
    _validate_source_bindings(document["related_source_bindings"])

    exact_values = {
        "schema": expectation.schema,
        "schema_version": expectation.schema_version,
        "fixture_id": expectation.fixture_id,
    }
    for field, expected in exact_values.items():
        if document[field] != expected:
            raise JustificationBundleError(
                f"{field} does not match its retained expectation"
            )
    for binding in expectation.exact_bindings:
        actual = _lookup_path(document, binding.path)
        if _normalize_json(actual) != _normalize_json(binding.value):
            rendered = ".".join(str(component) for component in binding.path)
            raise JustificationBundleError(
                f"{rendered} does not match its retained expectation"
            )

    if derivation["profile"] != profile["id"] or context["profile"] != profile["id"]:
        raise JustificationBundleError("profile references are inconsistent")
    if derivation["context"] != context["id"]:
        raise JustificationBundleError("derivation context reference is inconsistent")
    if verification["profile"] != profile["id"]:
        raise JustificationBundleError("justification verification profile is inconsistent")
    if verification["context"] != context["id"]:
        raise JustificationBundleError("justification verification context is inconsistent")
    if verification["subject"] != derivation["id"]:
        raise JustificationBundleError("justification verification subject is inconsistent")
    if verification["checker"] != profile["checker"]:
        raise JustificationBundleError("justification checker identity is inconsistent")
    if verification["checker_revision"] != profile["checker_version"]:
        raise JustificationBundleError("justification checker revision is inconsistent")

    return ValidatedBundle(actual_digest, _freeze_json(document))


def load_package_bundle(package: str, resource: str) -> bytes:
    """Read exact package-resource bytes without normalizing them."""

    try:
        return resources.files(package).joinpath(resource).read_bytes()
    except (FileNotFoundError, ModuleNotFoundError, OSError) as exc:
        raise JustificationBundleError(
            f"checked justification bundle is unavailable: {package}/{resource}"
        ) from exc


def _as_mapping(value: object, path: str) -> Mapping[str, object]:
    if not isinstance(value, Mapping):
        raise AssertionError(f"validated {path} is not an object")
    return value


def _as_sequence(value: object, path: str) -> tuple[object, ...]:
    if not isinstance(value, tuple):
        raise AssertionError(f"validated {path} is not an array")
    return value


def _format_term(value: object) -> str:
    term = _as_sequence(value, "term")
    tag = term[0]
    if tag in ("variable", "constant"):
        return str(term[1])
    symbol = "·" if tag == "application" else "+"
    return f"({_format_term(term[1])}{symbol}{_format_term(term[2])})"


def _format_formula(value: object) -> str:
    formula = _as_sequence(value, "formula")
    tag = formula[0]
    if tag == "atom":
        atom = _as_mapping(formula[1], "atom")
        return str(atom["id"])
    if tag == "bottom":
        return "⊥"
    if tag == "implication":
        return f"({_format_formula(formula[1])} → {_format_formula(formula[2])})"
    return f"{_format_term(formula[1])}:{_format_formula(formula[2])}"


def _format_reference(value: object) -> str:
    reference = _as_mapping(value, "reference")
    revision = f" at {reference['revision']}" if "revision" in reference else ""
    return f"{reference['kind']} {reference['id']}{revision}"


def _format_rule(value: object) -> str:
    rule = _as_mapping(value, "rule")
    kind = rule["kind"]
    if kind == "premise":
        return f"contextual premise {rule['admission_id']}"
    if kind == "logical_axiom":
        return f"logical axiom {rule['axiom_kind']}"
    if kind == "constant_specification":
        return f"constant specification {rule['member_id']}"
    return f"modus ponens {rule['major']}, {rule['minor']}"


def render_warrant(bundle: ValidatedBundle) -> str:
    """Render checked records without re-evaluating their inference steps."""

    document = bundle.document
    profile = _as_mapping(document["profile"], "profile")
    claims = _as_sequence(document["claims"], "claims")
    admissions = _as_sequence(document["admissions"], "admissions")
    context = _as_mapping(document["context"], "context")
    derivation = _as_mapping(document["derivation"], "derivation")
    verification = _as_mapping(
        document["justification_verification"],
        "justification_verification",
    )
    external = _as_sequence(
        document["external_verifications"],
        "external_verifications",
    )
    bindings = _as_sequence(
        document["related_source_bindings"],
        "related_source_bindings",
    )

    lines = ["5. Reviewed formal correspondence"]
    for item in bindings:
        binding = _as_mapping(item, "related source binding")
        if binding["kind"] == "correspondence_basis":
            lines.extend(
                [
                    f"   {binding['id']}: {binding['direction']}",
                    f"   {binding['source_claim']} -> {binding['target_claim']}",
                    f"   Reviewed by: {binding['reviewed_by']}",
                    f"   Source: {binding['path']} at {binding['repository_revision']}",
                ]
            )

    lines.extend(["", "6. Exact claim versions"])
    for item in claims:
        claim = _as_mapping(item, "claim")
        digest = _as_mapping(claim["content_hash"], "claim content hash")
        refs = ", ".join(_format_reference(ref) for ref in claim["representation_refs"])
        lines.extend(
            [
                f"   {claim['id']} — {claim['display_name']}",
                f"   Assertion: {claim['assertion']}",
                f"   Content hash ({digest['algorithm']}): {digest['value']}",
                f"   Representations: {refs}",
            ]
        )

    lines.extend(["", "7. Admitted premises and external bases"])
    for item in admissions:
        admission = _as_mapping(item, "admission")
        actor = _as_mapping(admission["admitted_by"], "admission actor")
        bases = ", ".join(_format_reference(ref) for ref in admission["basis_refs"])
        lines.extend(
            [
                f"   {admission['id']}: {_format_formula(admission['formula'])}",
                f"   Basis: {bases}",
                f"   Admitted by: {actor['kind']} {actor['id']}",
                f"   Rationale: {admission['rationale']}",
                f"   Scope: {admission['scope']}",
                f"   At: {admission['at']}",
            ]
        )

    lines.extend(
        [
            "",
            "8. Checked justification derivation",
            f"   Profile: {profile['id']} ({profile['system']})",
            f"   Context: {context['id']}",
            f"   Conclusion: {_format_formula(derivation['conclusion'])}",
            "   Steps:",
        ]
    )
    for item in _as_sequence(derivation["nodes"], "derivation.nodes"):
        node = _as_mapping(item, "derivation node")
        lines.append(
            f"      {node['index']}. {_format_rule(node['rule'])}: "
            f"{_format_formula(node['formula'])}"
        )
    footprint = _as_sequence(
        derivation["constant_specification_footprint"],
        "constant specification footprint",
    )
    lines.append(
        "   Constant-specification footprint: "
        + (", ".join(str(item) for item in footprint) or "empty")
    )

    lines.extend(["", "9. Pinned external verification"])
    for item in external:
        record = _as_mapping(item, "external verification")
        environment = _as_mapping(record["environment"], "external environment")
        stdout_digest = _as_mapping(record["stdout_digest"], "stdout digest")
        lines.extend(
            [
                f"   {record['id']}: {record['method']} — {record['result']}",
                f"   Subject: {record['subject']}",
                f"   Command: {record['command']}",
                f"   Repository: {environment['categorical_repository']}",
                f"   Revision: {environment['categorical_revision']}",
                f"   Lean: {environment['lean_version']} at {environment['lean_commit']}",
                f"   Axioms reported: {', '.join(record['axiom_report'])}",
                f"   Transcript SHA-256: {stdout_digest['value']}",
                "   Exact checker stdout (each line indented for display):",
            ]
        )
        transcript_lines = str(record["stdout"]).split("\n")
        if transcript_lines and transcript_lines[-1] == "":
            transcript_lines.pop()
        lines.extend(
            f"      {line}" for line in (transcript_lines or ["(empty)"])
        )
        lines.append("   End exact checker stdout.")

    lines.extend(["", "10. Provenance and related source bindings"])
    for item in bindings:
        binding = _as_mapping(item, "related source binding")
        lines.append(
            f"   {binding['id']} ({binding['kind']}): {binding['path']} at "
            f"{binding['repository_revision']}; checked in this run: "
            f"{str(binding['checked_in_this_run']).lower()}"
        )
    lines.extend(
        [
            f"   Bundle fixture: {document['fixture_id']}",
            f"   Retained bundle SHA-256: {bundle.digest}",
            "",
            "11. Justification verification",
            "   Derivable relative to these admitted premises and policy.",
            f"   Method: {verification['method']}",
            f"   Checker: {verification['checker']} at {verification['checker_revision']}",
            f"   Check record: {verification['claim_checked']}",
            f"   Result: {verification['result']}",
        ]
    )
    return "\n".join(lines)
