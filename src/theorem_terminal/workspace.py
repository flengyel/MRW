"""User-local, mutable session and recovery storage. No project configuration."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import asdict, dataclass, field
from hashlib import sha256
import json
import math
import os
from pathlib import Path
import re
import sys
from uuid import uuid4

from .local_files import read_bounded
from .mutable_files import delete_mutable, private_directory, save_mutable, verify_mutable

SCHEMA = 'theorem-terminal.workspace'
VERSION = 9
MAX_MANIFEST_BYTES = 1024 * 1024
MAX_TEXT_BYTES = 2 * 1024 * 1024
MAX_RECOVERY_BYTES = 6 * MAX_TEXT_BYTES + 4096
MAX_BUFFERS = 128
MAX_CONTEXT_SELECTIONS = 32
MAX_ANCHOR_PREVIEW = 120  # Unicode scalars, after display-whitespace normalization.
MAX_INVESTIGATION_PASSAGES = 8
MAX_INVESTIGATION_TEXT_BYTES = 16 * 1024
FORMATS = {'text', 'notebook', 'model_call', 'projection', 'documentary_package', 'verification'}
# Historical wire shapes are literal contracts, independent of live dataclasses.
V3_WORKSPACE_FIELDS = frozenset({'schema', 'schema_version', 'root', 'buffers', 'active',
    'visible', 'active_pane', 'split', 'recent', 'marker', 'tex_root', 'last_build',
    'successful_build', 'pdf_page', 'pdf_zoom', 'pdf_scale', 'pdf_visible', 'window_size'})
V4_WORKSPACE_FIELDS = frozenset({'schema', 'schema_version', 'root', 'buffers', 'active',
    'visible', 'active_pane', 'split', 'recent', 'marker', 'selection_shelf', 'tex_root',
    'last_build', 'successful_build', 'pdf_page', 'pdf_zoom', 'pdf_scale', 'pdf_visible', 'window_size'})
V5_WORKSPACE_FIELDS = frozenset({'schema', 'schema_version', 'root', 'buffers', 'active',
    'visible', 'active_pane', 'split', 'recent', 'marker', 'selection_shelf', 'tex_root',
    'last_build', 'successful_build', 'pdf_page', 'pdf_zoom', 'pdf_scale', 'pdf_visible', 'window_size'})
LEGACY_BUFFER_FIELDS = frozenset({'id', 'path', 'format', 'revision', 'readonly', 'external',
    'companion', 'companion_revision', 'cursor', 'selection', 'yscroll', 'xscroll',
    'was_dirty', 'review_mode', 'review_number'})
LEGACY_MARKER_FIELDS = frozenset({'path', 'revision', 'start', 'end'})
V6_MARKER_FIELDS = frozenset({'path', 'revision', 'start', 'end'})
V6_PANE_VIEW_FIELDS = frozenset({'cursor', 'selection', 'yscroll', 'xscroll'})
PANE_VIEW_FIELDS = V6_PANE_VIEW_FIELDS
V5_BUFFER_FIELDS = frozenset({'id', 'path', 'format', 'revision', 'readonly', 'external',
    'companion', 'companion_revision', 'pane_views', 'was_dirty', 'review_mode', 'review_number'})
V6_BUFFER_FIELDS = frozenset({'id', 'path', 'format', 'revision', 'readonly', 'external',
    'companion', 'companion_revision', 'pane_views', 'was_dirty', 'review_mode', 'review_number'})
V6_WORKSPACE_FIELDS = frozenset({'schema', 'schema_version', 'root', 'buffers', 'active',
    'visible', 'active_pane', 'split', 'wrap', 'recent', 'marker', 'selection_shelf', 'tex_root',
    'last_build', 'successful_build', 'pdf_page', 'pdf_zoom', 'pdf_scale', 'pdf_visible', 'window_size'})
V7_WORKSPACE_FIELDS = V6_WORKSPACE_FIELDS
BUFFER_FIELDS = V6_BUFFER_FIELDS
V8_WORKSPACE_FIELDS = V7_WORKSPACE_FIELDS | {'pdf_source', 'imported_pdf'}
WORKSPACE_FIELDS = V8_WORKSPACE_FIELDS | {'investigation'}
MARKER_FIELDS = LEGACY_MARKER_FIELDS | {'preview'}
IMPORTED_PDF_FIELDS = frozenset({'path', 'revision', 'page', 'zoom', 'scale'})
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
class PaneViewState:
    cursor: str = '1.0'
    selection: list[str] | None = None
    yscroll: float = 0.0
    xscroll: float = 0.0


@dataclass
class BufferState:
    id: str
    path: str | None = None
    format: str = 'text'
    revision: str | None = None
    readonly: bool = False
    external: bool = False
    companion: str | None = None
    companion_revision: str | None = None
    pane_views: list[PaneViewState] = field(default_factory=lambda: [PaneViewState(), PaneViewState()])
    was_dirty: bool = False
    review_mode: str = 'index'
    review_number: int = 1

    @classmethod
    def new(cls, **values):
        return cls(str(uuid4()), **values)


@dataclass
class WorkMarker:
    path: str
    revision: str
    start: str
    end: str
    preview: str = ''


@dataclass
class ImportedPdfState:
    path: str
    revision: str
    page: int = 0
    zoom: str = 'width'
    scale: float = 1.0


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


@dataclass
class Workspace:
    root: str
    buffers: list[BufferState] = field(default_factory=list)
    active: str | None = None
    visible: list[str | None] = field(default_factory=lambda: [None, None])
    active_pane: int = 0
    split: bool = False
    wrap: bool = True
    recent: list[str] = field(default_factory=list)
    marker: WorkMarker | None = None
    selection_shelf: list[WorkMarker] = field(default_factory=list)
    tex_root: str | None = None
    last_build: str | None = None
    successful_build: str | None = None
    pdf_page: int = 0
    pdf_zoom: str = 'width'
    pdf_scale: float = 1.0
    pdf_visible: bool = False
    pdf_source: str = 'generated'
    imported_pdf: ImportedPdfState | None = None
    investigation: InvestigationState | None = None
    window_size: list[int] = field(default_factory=lambda: [1280, 820])


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


def _position(value, *, legacy=False):
    if not isinstance(value, str) or re.fullmatch(r'[1-9][0-9]{0,8}\.[0-9]{1,9}', value) is None:
        raise WorkspaceError('Invalid editor position')
    canonical = '.'.join(str(int(part)) for part in value.split('.'))
    if not legacy and value != canonical:
        raise WorkspaceError('Editor positions must be canonical')
    return canonical


def decode_pane_view(value, *, legacy_version=None):
    _keys(value, PANE_VIEW_FIELDS, 'pane view')
    legacy = legacy_version in (3, 4)
    cursor = _position(value['cursor'], legacy=legacy)
    selection = value['selection']
    if selection is not None:
        if not isinstance(selection, list) or len(selection) != 2:
            raise WorkspaceError('Invalid selection')
        selection = [_position(position, legacy=legacy) for position in selection]
        if legacy_version is not None:
            # v3/v4 rendered the listed endpoints, ignoring the stored cursor.
            # v5 rendered from the first endpoint to the cursor, except that a
            # cursor at the first endpoint used the second endpoint as anchor.
            anchor = selection[0]
            if legacy_version in (3, 4):
                cursor = selection[1]
            elif cursor == anchor:
                anchor = selection[1]
            selection = sorted((anchor, cursor), key=lambda p: tuple(map(int, p.split('.'))))
            if selection[0] == selection[1]:
                selection = None
        else:
            selection_span(*selection)
            if cursor not in selection:
                raise WorkspaceError('The selection cursor must be one endpoint')
    for key in ('yscroll', 'xscroll'):
        number = value[key]
        if type(number) not in (int, float) or not 0 <= number <= 1 or not math.isfinite(number):
            raise WorkspaceError('Invalid scroll position')
    return PaneViewState(cursor, selection, value['yscroll'], value['xscroll'])


def _migrate_legacy(data):
    version = data['schema_version']
    _keys(data, {3: V3_WORKSPACE_FIELDS, 4: V4_WORKSPACE_FIELDS, 5: V5_WORKSPACE_FIELDS,
                 6: V6_WORKSPACE_FIELDS}[version], f'version-{version} editor state')
    if not isinstance(data['buffers'], list) or len(data['buffers']) > MAX_BUFFERS:
        raise WorkspaceError('Invalid open buffer list')
    buffers = []
    for item in data['buffers']:
        _keys(item, V6_BUFFER_FIELDS if version == 6 else (V5_BUFFER_FIELDS if version == 5 else LEGACY_BUFFER_FIELDS), 'legacy buffer')
        old_views = item.get('pane_views') if version >= 5 else [{key: item[key] for key in V6_PANE_VIEW_FIELDS}] * 2
        if not isinstance(old_views, list) or len(old_views) != 2:
            raise WorkspaceError('A buffer requires exactly two pane views')
        views = [decode_pane_view(view, legacy_version=version if version < 6 else None) for view in old_views]
        buffers.append({**{key: value for key, value in item.items() if key not in PANE_VIEW_FIELDS},
                        'pane_views': [{key: deepcopy(getattr(view, key)) for key in PANE_VIEW_FIELDS} for view in views]})
    def marker(item, *, shelf=False):
        _keys(item, V6_MARKER_FIELDS if version == 6 else LEGACY_MARKER_FIELDS, 'legacy work marker')
        _path(item['path'])
        _revision(item['revision'])
        start, end = (_position(item[key], legacy=version < 5) for key in ('start', 'end'))
        if shelf:
            selection_span(start, end)
        else:
            start, end = sorted((start, end), key=lambda p: tuple(map(int, p.split('.'))))
        return {**item, 'start': start, 'end': end, 'preview': ''}
    shelf = [] if version == 3 else data['selection_shelf']
    if not isinstance(shelf, list) or len(shelf) > MAX_CONTEXT_SELECTIONS:
        raise WorkspaceError('Working context is limited to 32 selections')
    selections, seen = [], []
    for item in shelf:
        if item in seen:
            raise WorkspaceError('Duplicate context selection')
        seen.append(item)
        canonical = marker(item, shelf=True)
        if canonical not in selections:
            selections.append(canonical)
    return {**deepcopy(data), 'schema_version': 8, 'buffers': buffers, 'wrap': data['wrap'] if version == 6 else True,
            'marker': marker(data['marker']) if data['marker'] is not None else None,
            'selection_shelf': selections, 'pdf_source': 'generated', 'imported_pdf': None}


def _migrate_v7(data):
    """Add imported-document state without reading or interpreting a source."""
    _keys(data, V7_WORKSPACE_FIELDS, 'version-7 editor state')
    return {**deepcopy(data), 'schema_version': 8,
            'pdf_source': 'generated', 'imported_pdf': None}


def _migrate_v8(data):
    """Add a blank private investigation pointer without reading any record."""
    _keys(data, V8_WORKSPACE_FIELDS, 'version-8 editor state')
    return {**deepcopy(data), 'schema_version': VERSION, 'investigation': None}


def selection_span(start, end):
    """Validate a forward, nonempty pair of scalar line/column positions."""
    _position(start)
    _position(end)
    first, last = (tuple(map(int, position.split('.'))) for position in (start, end))
    if first >= last:
        raise WorkspaceError('Select a nonempty forward passage')
    return first, last


def anchor_preview(text):
    """Private display aid: plain whitespace-normalized text, at most 120 scalars."""
    _text(text, 'anchor text')
    return ' '.join(text.split())[:MAX_ANCHOR_PREVIEW].rstrip()


def decode_marker(value, *, shelf=False):
    _keys(value, MARKER_FIELDS, 'context selection' if shelf else 'work marker')
    _path(value['path'])
    _revision(value['revision'])
    start, end = value['start'], value['end']
    _position(start)
    _position(end)
    if shelf or start != end:
        selection_span(start, end)
    preview = value['preview']
    _text(preview, 'anchor preview')
    if len(preview) > MAX_ANCHOR_PREVIEW or preview != anchor_preview(preview):
        raise WorkspaceError('Anchor previews require normalized plain text of at most 120 characters')
    return WorkMarker(**value)


def decode_imported_pdf(value):
    _keys(value, IMPORTED_PDF_FIELDS, 'imported PDF state')
    _path(value['path'])
    _revision(value['revision'])
    if Path(value['path']).suffix.lower() != '.pdf':
        raise WorkspaceError('Imported document must be a PDF')
    if type(value['page']) is not int or not 0 <= value['page'] <= 100000:
        raise WorkspaceError('Invalid imported PDF page')
    if value['zoom'] not in ('width', 'page', 'custom'):
        raise WorkspaceError('Invalid imported PDF zoom')
    if type(value['scale']) not in (int, float) or not 0.1 <= value['scale'] <= 8 or not math.isfinite(value['scale']):
        raise WorkspaceError('Invalid imported PDF scale')
    return ImportedPdfState(**value)


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


def decode_workspace(raw: bytes) -> Workspace:
    if len(raw) > MAX_MANIFEST_BYTES:
        raise WorkspaceError('Editor state exceeds 1 MiB')
    data = strict_json(raw)
    if not isinstance(data, dict) or data.get('schema') != SCHEMA or type(data.get('schema_version')) is not int or data['schema_version'] not in (3, 4, 5, 6, 7, 8, VERSION):
        raise WorkspaceError('Unsupported editor-state version')
    if data['schema_version'] in (3, 4, 5, 6):
        data = _migrate_legacy(data)
    elif data['schema_version'] == 7:
        data = _migrate_v7(data)
    if data['schema_version'] == 8:
        data = _migrate_v8(data)
    _keys(data, WORKSPACE_FIELDS, 'editor state')
    _path(data['root'])
    root = Path(data['root'])
    for key in ('split', 'pdf_visible', 'wrap'):
        if type(data[key]) is not bool:
            raise WorkspaceError('Invalid view flag')
    if type(data['active_pane']) is not int or data['active_pane'] not in (0, 1) or (not data['split'] and data['active_pane'] != 0):
        raise WorkspaceError('Invalid active pane')
    if not isinstance(data['buffers'], list) or len(data['buffers']) > MAX_BUFFERS:
        raise WorkspaceError('Invalid open buffer list')
    buffers, identifiers, paths = [], set(), set()
    for item in data['buffers']:
        _keys(item, BUFFER_FIELDS, 'buffer')
        if not isinstance(item['id'], str) or re.fullmatch(r'[0-9a-f-]{36}', item['id']) is None or item['id'] in identifiers:
            raise WorkspaceError('Invalid or duplicate buffer identity')
        identifiers.add(item['id'])
        if not isinstance(item['format'], str) or item['format'] not in FORMATS:
            raise WorkspaceError('Unsupported buffer format')
        for key in ('readonly', 'external', 'was_dirty'):
            if type(item[key]) is not bool:
                raise WorkspaceError('Invalid buffer flag')
        if item['path'] is not None:
            _path(item['path'])
            _revision(item['revision'])
            if item['path'] in paths:
                raise WorkspaceError('Duplicate open file')
            paths.add(item['path'])
            if not Path(item['path']).is_relative_to(root) and not item['external']:
                raise WorkspaceError('External reference lacks explicit user-local authorization')
        elif item['revision'] is not None or item['format'] != 'text':
            raise WorkspaceError('Only an untitled text buffer can lack a file')
        if item['external'] and not item['readonly']:
            raise WorkspaceError('External references are read-only')
        if item['format'] != 'text' and (not item['readonly'] or item['was_dirty']):
            raise WorkspaceError('Structured documents cannot be editable buffers')
        if item['format'] == 'verification':
            _path(item['companion'])
            _revision(item['companion_revision'])
        elif item['companion'] is not None or item['companion_revision'] is not None:
            raise WorkspaceError('Unexpected companion file')
        if not isinstance(item['pane_views'], list) or len(item['pane_views']) != 2:
            raise WorkspaceError('A buffer requires exactly two pane views')
        views = [decode_pane_view(view) for view in item['pane_views']]
        if item['review_mode'] not in ('index', 'passage', 'full') or type(item['review_number']) is not int or item['review_number'] < 1:
            raise WorkspaceError('Invalid response view')
        buffers.append(BufferState(**{**item, 'pane_views': views}))
    if not isinstance(data['visible'], list) or len(data['visible']) != 2:
        raise WorkspaceError('Invalid visible buffer list')
    for identifier in [data['active'], *data['visible']]:
        if identifier is not None and (not isinstance(identifier, str) or identifier not in identifiers):
            raise WorkspaceError('Editor state names an absent buffer')
    if data['active'] != data['visible'][data['active_pane']]:
        raise WorkspaceError('Active buffer and pane disagree')
    if not isinstance(data['recent'], list) or len(data['recent']) > 12:
        raise WorkspaceError('Invalid recent files')
    for path in data['recent']:
        _path(path)
    marker = data['marker']
    if marker is not None:
        marker = decode_marker(marker)
    shelf = data['selection_shelf']
    if not isinstance(shelf, list) or len(shelf) > MAX_CONTEXT_SELECTIONS:
        raise WorkspaceError('Working context is limited to 32 selections')
    selections = []
    for item in shelf:
        entry = decode_marker(item, shelf=True)
        if any((entry.path, entry.revision, entry.start, entry.end) ==
               (s.path, s.revision, s.start, s.end) for s in selections):
            raise WorkspaceError('Duplicate context selection')
        selections.append(entry)
    if data['tex_root'] is not None:
        _path(data['tex_root'])
        if not Path(data['tex_root']).is_relative_to(root) or Path(data['tex_root']).suffix.lower() != '.tex':
            raise WorkspaceError('TeX root must be a project TeX file')
    for key in ('last_build', 'successful_build'):
        if data[key] is not None and (not isinstance(data[key], str) or re.fullmatch(r'[0-9a-f-]{36}', data[key]) is None):
            raise WorkspaceError('Invalid local build reference')
    if type(data['pdf_page']) is not int or not 0 <= data['pdf_page'] <= 100000 or data['pdf_zoom'] not in ('width', 'page', 'custom'):
        raise WorkspaceError('Invalid PDF navigation state')
    if type(data['pdf_scale']) not in (int, float) or not 0.1 <= data['pdf_scale'] <= 8 or not math.isfinite(data['pdf_scale']):
        raise WorkspaceError('Invalid PDF scale')
    if data['pdf_source'] not in ('generated', 'imported'):
        raise WorkspaceError('Invalid PDF source')
    imported_pdf = decode_imported_pdf(data['imported_pdf']) if data['imported_pdf'] is not None else None
    if data['pdf_source'] == 'imported' and imported_pdf is None:
        raise WorkspaceError('Selected imported PDF is missing its identity')
    investigation = (decode_investigation(data['investigation'])
                     if data['investigation'] is not None else None)
    size = data['window_size']
    if not isinstance(size, list) or len(size) != 2 or any(type(n) is not int or not 480 <= n <= 16384 for n in size):
        raise WorkspaceError('Invalid window size')
    values = {key: data[key] for key in WORKSPACE_FIELDS - {'schema', 'schema_version'}}
    values.update(buffers=buffers, marker=marker, selection_shelf=selections,
                  imported_pdf=imported_pdf, investigation=investigation)
    return Workspace(**values)


def json_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n').encode('utf-8')


def encode_workspace(workspace: Workspace) -> bytes:
    raw = json_bytes({'schema': SCHEMA, 'schema_version': VERSION, **asdict(workspace)})
    decode_workspace(raw)
    return raw


def user_state_root() -> Path:
    if os.name == 'nt':
        base = Path(os.environ.get('LOCALAPPDATA') or Path.home() / 'AppData' / 'Local')
    elif sys.platform == 'darwin':
        base = Path.home() / 'Library' / 'Application Support'
    else:
        configured = os.environ.get('XDG_STATE_HOME', '')
        base = Path(configured) if configured and Path(configured).is_absolute() else Path.home() / '.local' / 'state'
    return (base / 'theorem-terminal').resolve()


def project_identity(root: Path) -> str:
    return sha256(os.path.normcase(str(root.resolve())).encode('utf-8')).hexdigest()


class WorkspaceStore:
    def __init__(self, root: Path, state_root: Path, previous: bytes | None = None):
        self.state_root = state_root
        self.directory = state_root / 'projects' / project_identity(root)
        self.path = self.directory / 'session.json'
        self.lock_root = state_root / 'locks'
        self.previous = previous
        self.recovery_previous: dict[str, bytes | None] = {}
        self.blocked = ''

    def block_writes(self, error):
        if not self.blocked:
            self.blocked = 'Workspace persistence failed; close and reopen before further writes: ' + str(error)

    def require_writable(self):
        if self.blocked:
            raise WorkspaceError(self.blocked)

    @classmethod
    def for_project(cls, root: Path, state_root: Path | None = None):
        state_root = (state_root or user_state_root()).expanduser().resolve()
        if state_root.is_relative_to(root):
            raise WorkspaceError('Application state storage must be outside the selected project')
        store = cls(root, state_root)
        if store.path.exists():
            raw = read_bounded(store.path, MAX_MANIFEST_BYTES, 'editor state')
            state = decode_workspace(raw)
            if Path(state.root) != root:
                raise WorkspaceError('Saved state belongs to a different project')
            store.previous = raw
        else:
            state = Workspace(str(root))
        return store, state

    def save(self, workspace: Workspace):
        self.require_writable()
        try:
            raw = encode_workspace(workspace)
            if raw == self.previous:
                verify_mutable(self.path, self.previous, limit=MAX_MANIFEST_BYTES, lock_root=self.lock_root)
            else:
                private_directory(self.directory)
                save_mutable(self.path, raw, previous=self.previous, lock_root=self.lock_root)
                self.previous = raw
        except (OSError, ValueError) as exc:
            self.block_writes(exc)
            raise

    def recovery_path(self, identifier):
        if not isinstance(identifier, str) or re.fullmatch(r'[0-9a-f-]{36}', identifier) is None:
            raise WorkspaceError('Invalid recovery identity')
        return self.directory / 'recovery' / (identifier + '.json')

    def recovery_snapshot(self, state):
        path = self.recovery_path(state.id)
        raw = read_bounded(path, MAX_RECOVERY_BYTES, 'recovery snapshot') if path.exists() else None
        if raw is None:
            return None, raw
        value = strict_json(raw)
        _keys(value, ('buffer', 'path', 'revision', 'text', 'original'), 'recovery snapshot')
        if value['buffer'] != state.id:
            raise WorkspaceError('Recovery snapshot belongs to a different buffer')
        if value['revision'] is not None:
            _revision(value['revision'])
        for key in ('text', 'original'):
            _text(value[key], 'recovery text')
            if len(value[key].encode('utf-8')) > MAX_TEXT_BYTES:
                raise WorkspaceError('Recovery text exceeds the editor size limit')
        if value['path'] != state.path:
            if state.revision == sha256(value['text'].encode('utf-8')).hexdigest():
                return None, raw  # Save As completed before crash interrupted cleanup.
            raise WorkspaceError('Recovery snapshot belongs to a different file')
        if state.path and sha256(value['original'].encode('utf-8')).hexdigest() != value['revision']:
            raise WorkspaceError('Recovery base revision does not match its original text')
        return value, raw

    def read_recovery(self, state):
        value, raw = self.recovery_snapshot(state)
        self.recovery_previous[state.id] = raw
        return value

    def write_recovery(self, buffer):
        self.require_writable()
        try:
            self._write_recovery(buffer)
        except (OSError, ValueError) as exc:
            self.block_writes(exc)
            raise

    def _write_recovery(self, buffer):
        state = buffer.state
        path = self.recovery_path(state.id)
        if state.id not in self.recovery_previous:
            self.read_recovery(state)
        raw = json_bytes(dict(buffer=state.id, path=state.path, revision=state.revision,
                              text=buffer.content, original=buffer.original))
        if len(raw) > MAX_RECOVERY_BYTES:
            raise WorkspaceError('Recovery snapshot exceeds its size limit')
        if raw == self.recovery_previous[state.id]:
            verify_mutable(path, raw, limit=MAX_RECOVERY_BYTES, lock_root=self.lock_root)
        else:
            private_directory(path.parent)
            save_mutable(path, raw, previous=self.recovery_previous[state.id], lock_root=self.lock_root)
            self.recovery_previous[state.id] = raw

    def clear_recovery(self, identifier):
        self.require_writable()
        try:
            path = self.recovery_path(identifier)
            private_directory(path.parent)
            delete_mutable(path, previous=self.recovery_previous.get(identifier),
                           limit=MAX_RECOVERY_BYTES, lock_root=self.lock_root)
            self.recovery_previous[identifier] = None
        except (OSError, ValueError) as exc:
            self.block_writes(exc)
            raise
