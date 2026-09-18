"""Deterministic, local review and passage selection for finalized ModelCalls."""

from __future__ import annotations

from dataclasses import dataclass

from theorem_terminal.model_projection import FinalizedModelCall


INDEX_PAGE_SIZE = 20
PREVIEW_SCALARS = 120
METADATA_PREVIEW_SCALARS = 120
DIAGNOSTIC_PREVIEW_SCALARS = 240
MAX_INDEX_OUTPUT_CHARACTERS = 32 * 1024
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
            or 0xD800 <= codepoint <= 0xDFFF
            or codepoint in _BIDI_CONTROLS
        ):
            rendered.append(f"\\u{{{codepoint:04X}}}")
        else:
            rendered.append(character)
    return "".join(rendered)


def bounded_safe_field(
    label: str, value: str, limit: int = METADATA_PREVIEW_SCALARS
) -> str:
    """Put trusted size/framing before a bounded safely rendered value."""

    shown = min(len(value), limit)
    truncated = "yes" if len(value) > limit else "no"
    return (
        f"{label} [scalars={len(value)}, shown={shown}, truncated={truncated}]: "
        f"{safe_terminal_text(value[:limit])}"
    )


def bounded_safe_diagnostic(value: str) -> str:
    return bounded_safe_field("diagnostic", value, DIAGNOSTIC_PREVIEW_SCALARS)


def _iter_passages(raw: bytes):
    """Yield passages in one scan without retaining earlier passage records."""

    position = 0
    number = 0
    passage_start: int | None = None
    passage_end = 0
    while position < len(raw):
        newline = raw.find(b"\n", position)
        line_end = len(raw) if newline < 0 else newline + 1
        content_end = line_end
        if newline >= 0:
            content_end = (
                newline - 1
                if newline > position and raw[newline - 1] == 0x0D
                else newline
            )
        content = raw[position:content_end]
        blank = all(byte in (0x20, 0x09) for byte in content)
        if blank:
            if passage_start is not None:
                number += 1
                yield Passage(number, passage_start, passage_end)
                passage_start = None
        else:
            if passage_start is None:
                passage_start = position
            passage_end = line_end
        position = line_end
    if passage_start is not None:
        yield Passage(number + 1, passage_start, passage_end)


def passages(response: str) -> tuple[Passage, ...]:
    """Compatibility helper returning all exact passages for programmatic callers."""

    return tuple(_iter_passages(response.encode("utf-8")))


def passage_count(response: str) -> int:
    """Count deterministic passages in one scan without retaining their spans."""

    count = 0
    for passage in _iter_passages(response.encode("utf-8")):
        count = passage.number
    return count


def _scan(
    response: str,
    *,
    page_start: int | None = None,
    selected_number: int | None = None,
) -> tuple[bytes, int, tuple[Passage, ...], Passage | None]:
    """Scan once, retaining at most one selected passage or one bounded page."""

    raw = response.encode("utf-8")
    page: list[Passage] = []
    selected = None
    count = 0
    for passage in _iter_passages(raw):
        count = passage.number
        if selected_number == passage.number:
            selected = passage
        if (
            page_start is not None
            and passage.number >= page_start
            and len(page) < INDEX_PAGE_SIZE
        ):
            page.append(passage)
    return raw, count, tuple(page), selected


def select_passage(response: str, number: int) -> Passage:
    if isinstance(number, bool) or number <= 0:
        raise ResponseReviewError("passage number must be positive")
    _, _, _, selected = _scan(response, selected_number=number)
    if selected is None:
        raise ResponseReviewError(f"passage {number} is out of range")
    return selected


def purpose_kind(call: FinalizedModelCall) -> str:
    purpose = call.document["purpose"]
    assert isinstance(purpose, str)
    return PURPOSE_TO_KIND[purpose]


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
        bounded_safe_field(label, str(value)) for label, value in fields
    ]


def render_response_review(
    call: FinalizedModelCall,
    *,
    index_start: int | None = None,
    passage_number: int | None = None,
    full: bool = False,
) -> str:
    if sum((index_start is not None, passage_number is not None, bool(full))) > 1:
        raise ResponseReviewError(
            "index, passage, and full-response selectors are mutually exclusive"
        )
    if passage_number is not None and (
        isinstance(passage_number, bool) or passage_number <= 0
    ):
        raise ResponseReviewError("passage number must be positive")
    start = 1 if index_start is None else index_start
    if isinstance(start, bool) or start <= 0:
        raise ResponseReviewError("index start must be positive")

    if full:
        raw, count, page, selected = _scan(call.raw_response)
    elif passage_number is not None:
        raw, count, page, selected = _scan(
            call.raw_response, selected_number=passage_number
        )
    else:
        raw, count, page, selected = _scan(call.raw_response, page_start=start)

    lines = _header(call)
    lines.append(f"Passages: {count}")
    if full:
        lines.extend(("Full response:", safe_terminal_text(call.raw_response)))
    elif passage_number is not None:
        if selected is None:
            raise ResponseReviewError(f"passage {passage_number} is out of range")
        lines.extend(
            (
                f"Passage {selected.number} "
                f"({selected.end_byte - selected.start_byte} UTF-8 bytes):",
                safe_terminal_text(
                    raw[selected.start_byte:selected.end_byte].decode("utf-8")
                ),
            )
        )
    else:
        if (count == 0 and start != 1) or (count and start > count):
            raise ResponseReviewError(f"index start {start} is out of range")
        lines.append(
            f"Passage index starting at {start} (at most {INDEX_PAGE_SIZE} rows):"
        )
        for passage in page:
            material = raw[passage.start_byte:passage.end_byte].decode("utf-8")
            shown = min(len(material), PREVIEW_SCALARS)
            truncated = "yes" if len(material) > PREVIEW_SCALARS else "no"
            lines.append(
                f"Passage {passage.number} "
                f"[bytes={passage.end_byte - passage.start_byte}, "
                f"preview-scalars={shown}, truncated={truncated}]: "
                f"{safe_terminal_text(material[:PREVIEW_SCALARS])}"
            )
    rendered = "\n".join(lines)
    if not full and passage_number is None and len(rendered) > MAX_INDEX_OUTPUT_CHARACTERS:
        raise ResponseReviewError("bounded response index exceeded its display limit")
    return rendered
