from __future__ import annotations

from dataclasses import dataclass
import re


class LatexSourceError(ValueError):
    """Raised when the narrow source extractor cannot identify an occurrence."""


_STATEMENT_BEGIN = re.compile(
    r"\\begin\{(?P<kind>lem|prop|thm|theorem|cor|definition|defn)\}"
    r"(?:\[(?P<title>[^\]]*)\])?"
)
_LABEL = re.compile(r"\\label\{(?P<label>[^}]+)\}")


@dataclass(frozen=True)
class LabeledStatement:
    label: str
    kind: str
    title: str | None
    statement_tex: str
    proof_tex: str | None


def extract_labeled_statement(text: str, label: str) -> LabeledStatement:
    """Extract one labeled statement and an immediately following proof.

    This is deliberately a narrow extractor for the first experimental corpus,
    not a general TeX parser.
    """

    matches = []
    for begin in _STATEMENT_BEGIN.finditer(text):
        end_marker = rf"\end{{{begin.group('kind')}}}"
        end_at = text.find(end_marker, begin.end())
        if end_at < 0:
            raise LatexSourceError(
                f"unterminated {begin.group('kind')} environment before {label}"
            )
        body = text[begin.end() : end_at]
        labels = [match.group("label") for match in _LABEL.finditer(body)]
        if label in labels:
            matches.append((begin, end_at, end_marker, body))

    if not matches:
        raise LatexSourceError(f"no labeled statement found for {label}")
    if len(matches) != 1:
        raise LatexSourceError(f"label occurs in more than one statement: {label}")

    begin, end_at, end_marker, body = matches[0]
    statement = _LABEL.sub("", body).strip()
    after_statement = end_at + len(end_marker)
    proof_match = re.match(r"\s*\\begin\{proof\}", text[after_statement:])
    proof = None
    if proof_match:
        proof_start = after_statement + proof_match.end()
        proof_end = text.find(r"\end{proof}", proof_start)
        if proof_end < 0:
            raise LatexSourceError(f"unterminated proof following {label}")
        proof = text[proof_start:proof_end].strip()

    title = begin.group("title")
    return LabeledStatement(
        label=label,
        kind=begin.group("kind"),
        title=title.strip() if title else None,
        statement_tex=statement,
        proof_tex=proof,
    )

