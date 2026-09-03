"""Deterministic, local review and passage selection for finalized ModelCalls."""

from __future__ import annotations

from dataclasses import dataclass

from theorem_terminal.model_projection import FinalizedModelCall


INDEX_PAGE_SIZE = 20
PREVIEW_SCALARS = 120
PURPOSE_TO_KIND = {
    "definition_explanation": "informal_explanation",
    "result_explanation": "informal_explanation",
    "source_suggestion": "informal_explanation",
    "critique": "informal_explanation",
    "strategic_hint": "strategic_hint",
    "intermediate_lemma": "statement",
    "proof_outline": "proof_outline",
    "worked_solution": "proposed_solution",
    "computation": "calculation",
}
_BIDI_CONTROLS = {
    0x061C, 0x200E, 0x200F, *range(0x202A, 0x202F), *range(0x2066, 0x206A)
}


class ResponseReviewError(ValueError):
    """Raised when a local response cannot be reviewed or selected."""


@dataclass(frozen=True)
class Passage:
    number: int
    start_byte: int
    end_byte: int


def safe_terminal_text(value: str) -> str:
    """Render record text reversibly without record-derived terminal controls."""

    rendered: list[str] = []
    for character in value:
        codepoint = ord(character)
        if character == "\\":
            rendered.append("\\\\")
        elif (
            codepoint <= 0x1F
            or 0x7F <= codepoint <= 0x9F
            or codepoint in _BIDI_CONTROLS
        ):
            rendered.append(f"\\u{{{codepoint:04X}}}")
        else:
            rendered.append(character)
    return "".join(rendered)


def passages(response: str) -> tuple[Passage, ...]:
    """Apply the exact LF/CRLF and ASCII-blank passage grammar."""

    found: list[Passage] = []
    character_start = 0
    byte_start = 0
    passage_start: int | None = None
    passage_end = 0
    while character_start < len(response):
        newline = response.find("\n", character_start)
        character_end = len(response) if newline < 0 else newline + 1
        logical = response[character_start:character_end]
        content = logical
        if newline >= 0:
            content = logical[:-2] if logical.endswith("\r\n") else logical[:-1]
        line_bytes = logical.encode("utf-8")
        line_end_byte = byte_start + len(line_bytes)
        blank = all(character in " \t" for character in content)
        if blank:
            if passage_start is not None:
                found.append(Passage(len(found) + 1, passage_start, passage_end))
                passage_start = None
        else:
            if passage_start is None:
                passage_start = byte_start
            passage_end = line_end_byte
        character_start = character_end
        byte_start = line_end_byte
    if passage_start is not None:
        found.append(Passage(len(found) + 1, passage_start, passage_end))
    return tuple(found)


def select_passage(response: str, number: int) -> Passage:
    if isinstance(number, bool) or number <= 0:
        raise ResponseReviewError("passage number must be positive")
    indexed = passages(response)
    if number > len(indexed):
        raise ResponseReviewError(f"passage {number} is out of range")
    return indexed[number - 1]


def purpose_kind(call: FinalizedModelCall) -> str:
    purpose = call.document["purpose"]
    assert isinstance(purpose, str)
    return PURPOSE_TO_KIND[purpose]


def _material(response: str, passage: Passage) -> str:
    return response.encode("utf-8")[passage.start_byte:passage.end_byte].decode("utf-8")


def _header(call: FinalizedModelCall) -> list[str]:
    document = call.document
    resolved = document["resolved_model"]
    model = resolved if isinstance(resolved, str) else document["requested_model"]
    fields = (
        ("Call", document["id"]),
        ("Provider", document["provider"]),
        ("Model", model),
        ("Purpose", document["purpose"]),
        ("Response digest", document["raw_response_digest"]),
        ("Request", document["request_text"]),
    )
    return ["Response review"] + [
        f"{label}: {safe_terminal_text(str(value))}" for label, value in fields
    ]


def render_response_review(
    call: FinalizedModelCall,
    *,
    index_start: int | None = None,
    passage_number: int | None = None,
    full: bool = False,
) -> str:
    indexed = passages(call.raw_response)
    lines = _header(call)
    lines.append(f"Passages: {len(indexed)}")
    if full:
        lines.extend(("Full response:", safe_terminal_text(call.raw_response)))
    elif passage_number is not None:
        passage = select_passage(call.raw_response, passage_number)
        lines.extend((
            f"Passage {passage.number} ({passage.end_byte - passage.start_byte} UTF-8 bytes):",
            safe_terminal_text(_material(call.raw_response, passage)),
        ))
    else:
        start = 1 if index_start is None else index_start
        if isinstance(start, bool) or start <= 0:
            raise ResponseReviewError("index start must be positive")
        if not indexed:
            if start != 1:
                raise ResponseReviewError(f"index start {start} is out of range")
        elif start > len(indexed):
            raise ResponseReviewError(f"index start {start} is out of range")
        lines.append(f"Passage index starting at {start} (at most {INDEX_PAGE_SIZE} rows):")
        for passage in indexed[start - 1:start - 1 + INDEX_PAGE_SIZE]:
            material = _material(call.raw_response, passage)
            preview = material[:PREVIEW_SCALARS]
            marker = " [preview truncated]" if len(material) > PREVIEW_SCALARS else ""
            lines.append(
                f"Passage {passage.number} | {passage.end_byte - passage.start_byte} UTF-8 bytes | "
                f"{safe_terminal_text(preview)}{marker}"
            )
    return "\n".join(lines)
