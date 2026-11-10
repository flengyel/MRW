"""Shared record actions for the Qt and editor-extension frontends.

These functions do not own editor buffers, invoke a model, or run a checker.
"""

from pathlib import Path
from uuid import uuid4

from .documentary_warrant import DocumentaryProjection, encode_documentary_projection
from .model_projection import extract_lossless_representation, make_model_produced_claim
from .private_persistence import persist_private_new
from .record_views import read_call_snapshot
from .response_review import purpose_kind, select_passage
from .workspace import WorkspaceError, strict_json


def record_kind(text: str) -> str | None:
    """Structural dispatch only; each supported record uses its existing parser."""
    if not text.lstrip().startswith('{'):
        return None
    try:
        value = strict_json(text.encode('utf-8'))
    except WorkspaceError:
        return None
    if not isinstance(value, dict):
        return None
    schema = value.get('schema')
    if schema == 'mrw.model-call':
        return 'model_call'
    if schema == 'mrw.documentary-projection':
        return 'projection'
    if (isinstance(schema, str) and schema.startswith('mrw.')) or {'artifact_identity', 'artifact_digest', 'method', 'subject'} <= value.keys():
        return 'protected'
    return None


def call_passage(path, number, *, expected_revision=None):
    snapshot, call = read_call_snapshot(Path(path))
    if expected_revision is not None and snapshot.revision != expected_revision:
        raise WorkspaceError('ModelCall changed since review; open it again')
    selected = select_passage(call.raw_response, number)
    exact = call.raw_response.encode('utf-8')[
        selected.start_byte:selected.end_byte
    ].decode('utf-8')
    return snapshot, call, selected, exact


def persist_call_passage(call, number, destination):
    """Publish an exact documentary projection, without admitting a premise."""
    selected = select_passage(call.raw_response, number)
    representation = extract_lossless_representation(
        call, representation_id=f'representation-{uuid4()}', version='1',
        subject=call.document['target'], kind=purpose_kind(call),
        start_byte=selected.start_byte, end_byte=selected.end_byte,
    )
    claim = make_model_produced_claim(
        call, representation, claim_id=f'claim-{uuid4()}',
        display_name='Model produced selected response span',
        description='Documentary attribution of exact model-response UTF-8 bytes only.',
    )
    persist_private_new(
        Path(destination),
        encode_documentary_projection(DocumentaryProjection(call, representation, claim)),
    )


def attributed_contribution(call, selected, exact):
    """An editable copy retains attribution but acquires no checking status."""
    heading = '\n'.join((
        '', '[Model contribution — unverified editable copy]',
        f'Provider: {call.provider}', f'Model: {call.model}',
        f'ModelCall: {call.id}',
        f'Exact source span: response SHA-256 {call.raw_response_digest}, '
        f'UTF-8 bytes [{selected.start_byte}, {selected.end_byte})',
        'Returned citations, links, code, and mathematical claims are unverified.',
        '[Begin copied response passage]', '',
    ))
    ending = '\n'.join(('[End copied response passage]', ''))
    return heading + exact + ('' if exact.endswith('\n') else '\n') + ending
