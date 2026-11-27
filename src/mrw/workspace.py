"""Validation for editor selections, retained investigations and JSON records."""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
import re

MAX_INVESTIGATION_PASSAGES = 8
MAX_INVESTIGATION_TEXT_BYTES = 16 * 1024
INVESTIGATION_FIELDS = frozenset({
    'parent_path', 'parent_record_revision', 'parent_id',
    'parent_response_digest', 'parent_passages', 'child_path',
    'child_record_revision', 'child_id', 'child_response_digest',
    'question', 'correction', 'last_conclusion', 'unresolved_issue',
})
INVESTIGATION_PASSAGE_FIELDS = frozenset({
    'number', 'start_byte', 'end_byte',
})


class WorkspaceError(ValueError):
    """An operation cannot complete without losing work or changing its meaning."""


@dataclass
class InvestigationPassageState:
    number: int
    start_byte: int
    end_byte: int


@dataclass
class InvestigationState:
    """Private resume pointer for one explicit parent/child exchange."""

    parent_path: str
    parent_record_revision: str
    parent_id: str
    parent_response_digest: str
    parent_passages: list[InvestigationPassageState]
    child_path: str
    child_record_revision: str
    child_id: str
    child_response_digest: str | None
    question: str
    correction: str
    last_conclusion: str
    unresolved_issue: str


def _unique(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise WorkspaceError('Duplicate JSON field')
        result[key] = value
    return result


def strict_json(raw: bytes):
    def invalid_number(_value):
        raise WorkspaceError('Nonstandard JSON number')
    try:
        return json.loads(raw.decode('utf-8'), object_pairs_hook=_unique, parse_constant=invalid_number)
    except (UnicodeError, json.JSONDecodeError, RecursionError) as exc:
        raise WorkspaceError('Invalid UTF-8 JSON document') from exc


def _keys(value, names, label):
    if not isinstance(value, dict) or set(value) != set(names):
        raise WorkspaceError(f'Invalid fields in {label}')


def _text(value, label, *, nonempty=False):
    if not isinstance(value, str) or (nonempty and not value.strip()) or '\0' in value:
        raise WorkspaceError(f'Invalid {label}')
    try:
        value.encode('utf-8')
    except UnicodeError as exc:
        raise WorkspaceError(f'Invalid Unicode in {label}') from exc


def _path(value):
    _text(value, 'file path', nonempty=True)
    if not Path(value).is_absolute():
        raise WorkspaceError('Editor references must use absolute local paths')


def _revision(value):
    if not isinstance(value, str) or re.fullmatch(r'[0-9a-f]{64}', value) is None:
        raise WorkspaceError('Invalid SHA-256 revision')


def _position(value):
    if not isinstance(value, str) or re.fullmatch(r'[1-9][0-9]{0,8}\.[0-9]{1,9}', value) is None:
        raise WorkspaceError('Invalid editor position')
    canonical = '.'.join(str(int(part)) for part in value.split('.'))
    if value != canonical:
        raise WorkspaceError('Editor positions must be canonical')
    return canonical


def selection_span(start, end):
    """Validate a forward, nonempty pair of scalar line/column positions."""
    _position(start)
    _position(end)
    first, last = (tuple(map(int, position.split('.'))) for position in (start, end))
    if first >= last:
        raise WorkspaceError('Select a nonempty forward passage')
    return first, last


def _bounded_investigation_text(value, label, *, nonempty=False):
    _text(value, label, nonempty=nonempty)
    if len(value.encode('utf-8')) > MAX_INVESTIGATION_TEXT_BYTES:
        raise WorkspaceError(
            f'{label.capitalize()} exceeds its {MAX_INVESTIGATION_TEXT_BYTES}-byte limit'
        )
    return value


def decode_investigation(value):
    _keys(value, INVESTIGATION_FIELDS, 'investigation state')
    for key in ('parent_path', 'child_path'):
        _path(value[key])
    for key in ('parent_record_revision', 'parent_response_digest',
                'child_record_revision'):
        _revision(value[key])
    if value['child_response_digest'] is not None:
        _revision(value['child_response_digest'])
    for key in ('parent_id', 'child_id'):
        _text(value[key], f'investigation {key}', nonempty=True)
    passages = value['parent_passages']
    if (not isinstance(passages, list) or not passages
            or len(passages) > MAX_INVESTIGATION_PASSAGES):
        raise WorkspaceError('Investigation requires one to eight parent passages')
    decoded_passages = []
    seen = set()
    for item in passages:
        _keys(item, INVESTIGATION_PASSAGE_FIELDS, 'investigation passage')
        number, start, end = item['number'], item['start_byte'], item['end_byte']
        if (type(number) is not int or number <= 0 or type(start) is not int
                or type(end) is not int or not 0 <= start < end <= 4 * 1024 * 1024):
            raise WorkspaceError('Invalid investigation response passage')
        if number in seen:
            raise WorkspaceError('Duplicate investigation response passage')
        seen.add(number)
        decoded_passages.append(InvestigationPassageState(number, start, end))
    text = {
        key: _bounded_investigation_text(
            value[key], 'investigation ' + key.replace('_', ' '),
            nonempty=key == 'question',
        )
        for key in ('question', 'correction', 'last_conclusion', 'unresolved_issue')
    }
    return InvestigationState(**{
        **value,
        **text,
        'parent_passages': decoded_passages,
    })
