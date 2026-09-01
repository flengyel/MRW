from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum

from theorem_terminal.latex import extract_labeled_statement
from theorem_terminal.source import SourceDocument


class AppendixASourceError(ValueError):
    """Raised when a source is not identifiable as the intended Appendix A."""


class StudyLevel(IntEnum):
    STATEMENT = 1
    IDEA = 2
    SKELETON = 3
    DETAILS = 4


@dataclass(frozen=True)
class StudyGuide:
    label: str
    role: str
    idea: str
    skeleton: tuple[str, ...]


_REVIEWED_SOURCE_REVISION = (
    "51c3669da3b3a850b1cf8f61f10f873f297d6a598f01d3541678137f002b1945"
)

_REQUIRED_MARKERS = (
    r"\label{app:cats}",
    r"\subsection{Restriction categories}",
    r"\label{lem:partial-pairing-projections}",
    r"\label{lem:partial-pairing-reindexing}",
    r"\label{lem:restriction-along-projections}",
    r"\subsection{Ranges and sections}",
    r"\subsection{The category of domains}",
    r"\label{lem:range-lifting-pullback-section}",
    r"\label{prop:dominical-to-P-recursion}",
)

_PURPOSE = (
    "Appendix A fixes the partial-map categorical language used in the paper. "
    "It begins with restriction categories and P-categories, derives the domain "
    "calculus needed for partial pairings, introduces ranges and sections, and "
    "then expresses a total lifting question as a section question in the "
    "category of domains. It ends by comparing the paper's P-categorical "
    "recursion categories with the earlier dominical definition."
)

_ORGANIZATION = (
    "Restriction categories: restriction idempotents record where partial "
    "morphisms are defined.",
    "P-categories: the near product, diagonal, and projections supply the "
    "partial-map product calculus.",
    "Restrictions and total morphisms: total maps form a category in which the "
    "near product is an ordinary categorical product.",
    "Ranges and sections: ranges specify the least target domain needed by a "
    "morphism; sections express a choice principle for partial maps.",
    "The category of domains: restriction idempotents become objects, allowing "
    "lifting questions to be expressed by pullbacks and split epimorphisms.",
    "P-recursion categories: Turing morphisms are stated in the P-categorical "
    "setting and compared with dominical recursion categories.",
)

_CENTRAL_ITEMS = (
    "For a partial pairing, each projection is restricted by the domain of the "
    "other component, and the pairing is defined on the intersection of the "
    "two component domains.",
    "On total morphisms, the near product satisfies the ordinary product "
    "universal property.",
    "In a P-category with ranges, put rho=ran(f). If q is total and rho q=q, "
    "then a total p satisfying fp=q exists exactly when the corresponding "
    "pullback projection in the category of domains has a right inverse "
    "(lem:range-lifting-pullback-section).",
    "Every dominical recursion category satisfies the P-categorical recursion "
    "category definition (prop:dominical-to-P-recursion).",
)

_NAMED_RESULTS = (
    "projections of partial pairings — lem:partial-pairing-projections",
    "reindexing of partial pairings — lem:partial-pairing-reindexing",
    "restriction along projections — lem:restriction-along-projections",
    "lifting as a pullback-section condition — "
    "lem:range-lifting-pullback-section",
    "comparison with dominical recursion categories — "
    "prop:dominical-to-P-recursion",
)

_GUIDES = {
    "lem:range-lifting-pullback-section": StudyGuide(
        label="lem:range-lifting-pullback-section",
        role=(
            "This lemma converts the existence of a total morphism p with fp=q "
            "into a categorical condition on a pullback in Dom(C). It is the "
            "point at which the preceding definitions of restriction, range, "
            "totality, and the category of domains are used together. The "
            "extension-family chapter uses it in def:total-range-lifting and "
            "lem:sections-range-lifting."
        ),
        idea=(
            "View f and q as morphisms into the range domain of f. Their "
            "pullback classifies compatible pairs. A section of its projection "
            "to the q-side determines a total compatible map into the source "
            "domain of f; conversely, a total lift supplies such a compatible "
            "map and hence a section by the pullback property."
        ),
        skeleton=(
            "From a section s, compose s with the other pullback projection. "
            "The resulting morphism has source domain 1_Z, so its underlying "
            "map p is total; the pullback equation gives fp=q.",
            "From a total p with fp=q, use restriction identities to prove that "
            "p lands in the source domain of f.",
            "Regard p as a morphism into that domain and apply the pullback "
            "universal property to obtain s; its projection to 1_Z is the "
            "identity, so it is a right inverse.",
        ),
    )
}


def validate_source(source: SourceDocument) -> None:
    missing = [marker for marker in _REQUIRED_MARKERS if marker not in source.text]
    if missing:
        joined = ", ".join(missing)
        raise AppendixASourceError(
            f"source is not the expected rs_Appendix_A.tex; missing: {joined}"
        )
    if source.normalized_revision != _REVIEWED_SOURCE_REVISION:
        raise AppendixASourceError(
            "the Appendix A guide has not been reviewed for this source "
            f"revision: {source.revision}; reviewed normalized revision: "
            f"{_REVIEWED_SOURCE_REVISION}"
        )


def _orientation_lines(
    source: SourceDocument,
    *,
    include_stop: bool,
) -> list[str]:
    validate_source(source)
    lines = [
        "Appendix A — top-down orientation",
        f"Source: {source.path}",
        f"Source revision (SHA-256): {source.revision}",
        "Guide origin: AI proposal; source text is not reproduced in this view.",
        "",
        "1. Purpose and organization",
        _PURPOSE,
        "",
    ]
    lines.extend(f"   {number}. {item}" for number, item in enumerate(_ORGANIZATION, 1))
    lines.extend(["", "2. Central concepts and results"])
    lines.extend(f"   {number}. {item}" for number, item in enumerate(_CENTRAL_ITEMS, 1))
    lines.extend(["", "Named results in the appendix"])
    lines.extend(f"   - {item}" for item in _NAMED_RESULTS)
    lines.extend(
        [
            "",
            "3. First selected result",
            "   lifting as a pullback-section condition",
            "   Label: lem:range-lifting-pullback-section",
            "   This is the result prepared for guided study in this increment.",
        ]
    )
    if include_stop:
        lines.extend(
            [
                "   This orientation stops before the statement and proof.",
                "",
                "Next action:",
                "   Select lem:range-lifting-pullback-section with the study command.",
            ]
        )
    return lines


def render_orientation(source: SourceDocument) -> str:
    return "\n".join(_orientation_lines(source, include_stop=True))


def _study_lines(
    source: SourceDocument,
    label: str,
    *,
    through: StudyLevel,
    include_header: bool,
) -> list[str]:
    validate_source(source)
    guide = _GUIDES.get(label)
    if guide is None:
        supported = ", ".join(sorted(_GUIDES))
        raise AppendixASourceError(
            f"no top-down study guide for {label}; available: {supported}"
        )
    occurrence = extract_labeled_statement(source.text, label)
    title = occurrence.title or label
    lines = []
    if include_header:
        lines.extend(
            [
                f"Appendix A — {title}",
                f"Source: {source.path}",
                f"Source revision (SHA-256): {source.revision}",
                f"Stable locator: {label}",
                "Guide origin: AI proposal. Statement and detailed proof are source text.",
                "",
            ]
        )
    lines.extend(
        [
            "Role in Appendix A",
            guide.role,
            "",
            "Statement",
            occurrence.statement_tex,
        ]
    )
    if through >= StudyLevel.IDEA:
        lines.extend(["", "Governing idea", guide.idea])
    if through >= StudyLevel.SKELETON:
        lines.extend(["", "Proof skeleton"])
        lines.extend(
            f"   {number}. {step}" for number, step in enumerate(guide.skeleton, 1)
        )
    if through >= StudyLevel.DETAILS:
        lines.extend(["", "Detailed proof from the source"])
        lines.append(
            occurrence.proof_tex
            if occurrence.proof_tex is not None
            else "No proof immediately follows this statement in the source."
        )
    return lines


def render_study(
    source: SourceDocument,
    label: str,
    through: StudyLevel = StudyLevel.STATEMENT,
) -> str:
    return "\n".join(
        _study_lines(source, label, through=through, include_header=True)
    )


def render_complete_study(
    source: SourceDocument,
    label: str = "lem:range-lifting-pullback-section",
) -> str:
    """Render every mathematical level before a later warrant view."""

    lines = _orientation_lines(source, include_stop=False)
    lines.extend(["", "4. Selected result in detail"])
    lines.extend(
        _study_lines(
            source,
            label,
            through=StudyLevel.DETAILS,
            include_header=False,
        )
    )
    return "\n".join(lines)
