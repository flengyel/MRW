"""Toolkit-independent editor and explicit local mathematical-file actions."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass, field
import os
from pathlib import Path
import stat
from uuid import uuid4

from .documentary_warrant import DocumentaryProjection, encode_documentary_projection
from .local_files import read_bounded
from .model_projection import extract_lossless_representation, make_model_produced_claim
from .mutable_files import save_mutable
from .private_persistence import persist_private_new
from .record_views import inspect_record, read_call_snapshot
from .response_review import purpose_kind, render_response_review, select_passage
from .source import SourceDocument
from .tool_settings import SettingsStore, expand_arguments, launch_tool
from .workspace import (BufferState, MAX_BUFFERS, MAX_TEXT_BYTES, WorkMarker, Workspace,
                        WorkspaceError, WorkspaceStore, strict_json)


@dataclass
class Buffer:
    state: BufferState
    content: str = ''
    original: str = ''
    sections: tuple[tuple[str, str], ...] = field(default_factory=tuple)
    problem: str = ''
    recovery_warning: str = ''
    dirty: bool = False
    loaded: bool = False
    externally_changed: bool = False
    disk_content: str | None = None
    recovery_raw: bytes | None = None

    @property
    def editable(self):
        return self.loaded and self.state.format == 'text' and not self.state.readonly and (not self.problem or bool(self.recovery_warning))

    @property
    def status(self):
        if self.externally_changed:
            return 'Conflicted' if self.dirty else 'Externally changed'
        if self.problem:
            return 'Unavailable'
        if not self.loaded:
            return 'Not loaded'
        if self.dirty:
            return 'Modified · recovered' if self.recovery_warning else 'Modified'
        return 'Read-only' if not self.editable else ('Saved' if self.state.path else 'New file')

    @property
    def newline(self):
        if '\r\n' in self.original:
            return '\r\n'
        return '\r' if '\r' in self.original and '\n' not in self.original else '\n'


@dataclass(frozen=True)
class DirectoryEntry:
    path: Path
    directory: bool


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
    if schema == 'theorem-terminal.model-call':
        return 'model_call'
    if schema == 'theorem-terminal.documentary-projection':
        return 'projection'
    if (isinstance(schema, str) and schema.startswith('theorem-terminal.')) or {'artifact_identity', 'artifact_digest', 'method', 'subject'} <= value.keys():
        return 'protected'
    return None


def text_snapshot(path):
    source = SourceDocument.from_bytes(path, read_bounded(path, MAX_TEXT_BYTES, 'ordinary text / notebook'))
    if '\0' in source.text:
        raise WorkspaceError('Binary or unsupported file: embedded NUL; use an appropriate external tool')
    return source


def preserve_newlines(previous: str, displayed: str) -> str:
    """Apply a Qt plain-text edit without normalizing unchanged mixed endings."""
    normalized = previous.replace('\r\n', '\n').replace('\r', '\n')
    if displayed == normalized:
        return previous
    if '\r' not in previous:
        return displayed
    prefix = 0
    limit = min(len(normalized), len(displayed))
    while prefix < limit and normalized[prefix] == displayed[prefix]:
        prefix += 1
    suffix = 0
    while suffix < limit - prefix and normalized[-suffix - 1] == displayed[-suffix - 1]:
        suffix += 1
    def raw_position(position):
        raw = logical = 0
        while logical < position:
            raw += 2 if previous[raw:raw + 2] == '\r\n' else 1
            logical += 1
        return raw
    start, end = raw_position(prefix), raw_position(len(normalized) - suffix)
    ending = '\r\n' if '\r\n' in previous else '\r'
    inserted = displayed[prefix:len(displayed) - suffix if suffix else len(displayed)]
    return previous[:start] + inserted.replace('\n', ending) + previous[end:]


class Workstation:
    def __init__(self, *, state_root: Path | None = None):
        self.state_root = state_root
        self.settings_store = SettingsStore(state_root)
        self.workspace: Workspace | None = None
        self.store: WorkspaceStore | None = None
        self.buffers: dict[str, Buffer] = {}
        self.persistence_error = ''
        self.pending_recovery_cleanup = set()

    def current(self) -> Workspace:
        if self.workspace is None:
            raise WorkspaceError('Open a project directory first')
        return self.workspace

    def prepare_project(self, directory: Path):
        root = directory.expanduser().resolve()
        if not root.is_dir():
            raise WorkspaceError('Select an existing project directory')
        return WorkspaceStore.for_project(root, self.state_root)

    def open_project(self, directory: Path):
        if self.workspace is not None:
            raise WorkspaceError('Close the current project first')
        store, workspace = self.prepare_project(directory)
        # No source/record contents are read here. Widgets request bounded
        # snapshots of visible buffers on their worker queue.
        self.workspace, self.store = workspace, store
        self.buffers = {state.id: Buffer(state) for state in workspace.buffers}
        self.pending_recovery_cleanup.clear()
        self.settings_store.remember_project(workspace.root)
        self.checkpoint()

    def checkpoint(self) -> bool:
        if self.workspace is None:
            return True
        try:
            for buffer in self.buffers.values():
                if buffer.loaded and buffer.dirty:
                    self.store.write_recovery(buffer)
            self.store.save(self.workspace)
            for identifier in tuple(self.pending_recovery_cleanup):
                self.store.clear_recovery(identifier)
                self.pending_recovery_cleanup.discard(identifier)
            self.settings_store.save()
        except (ValueError, OSError) as exc:
            self.persistence_error = str(exc)
            return False
        self.persistence_error = ''
        return True

    def close_project(self, *, keep_recovery=False, discard_session=False):
        if self.workspace is None:
            return
        if not discard_session:
            if not keep_recovery and any(b.dirty or b.state.was_dirty for b in self.buffers.values()):
                raise WorkspaceError('Save, keep recovery, or explicitly discard unsaved buffers before closing')
            if not self.checkpoint():
                raise WorkspaceError('Final checkpoint failed; project remains open: ' + self.persistence_error)
        # discard_session is reserved for an informed explicit GUI discard after
        # a checkpoint error. The default path never clears a failed workspace.
        self.workspace, self.store, self.buffers = None, None, {}

    def entries(self, directory: Path) -> list[DirectoryEntry]:
        root = Path(self.current().root)
        directory = directory.resolve()
        if not directory.is_relative_to(root) or '.git' in directory.relative_to(root).parts:
            raise WorkspaceError('Directory is outside the project navigator')
        with os.scandir(directory) as entries:
            result = [DirectoryEntry(Path(e.path), e.is_dir(follow_symlinks=False)) for e in entries if e.name != '.git']
        return sorted(result, key=lambda e: (not e.directory, e.path.name.casefold()))

    def buffer(self, identifier=None) -> Buffer:
        identifier = identifier or self.current().active
        if identifier not in self.buffers:
            raise WorkspaceError('Open or select a buffer first')
        return self.buffers[identifier]

    def _internal(self, path):
        root = Path(self.current().root)
        return path.is_relative_to(root) and '.git' in path.relative_to(root).parts

    @staticmethod
    def _match(expected, actual):
        if expected != actual:
            raise WorkspaceError('File revision changed (SHA-256 mismatch). Refresh ordinary text explicitly; immutable records cannot acquire a replacement revision')

    def _load(self, buffer, *, refresh=False):
        state = buffer.state
        root = Path(self.current().root)
        recovery = None
        if state.format == 'text' and not refresh:
            recovery, buffer.recovery_raw = self.store.recovery_snapshot(state)
        path = Path(state.path) if state.path else None
        try:
            if path and path.resolve() != path:
                raise WorkspaceError('Restored path was redirected by a symlink; open the new target explicitly')
            if path and not path.is_relative_to(root) and not state.external:
                raise WorkspaceError('External file was not explicitly opened by this user')
            if state.format in ('text', 'notebook'):
                source = text_snapshot(path) if path else None
                if source and not refresh and state.revision is not None:
                    self._match(state.revision, source.revision)
                buffer.content = buffer.original = source.text if source else ''
                if source:
                    state.revision = source.revision
                    state.readonly = state.readonly or not path.is_relative_to(root) or self._internal(path) or record_kind(source.text) is not None
                    buffer.sections = (('Source identity · technical details', f'{path}\nSHA-256: {source.revision}'),)
                if state.format == 'notebook':
                    notebook = strict_json(source.text.encode('utf-8'))
                    if not isinstance(notebook, dict) or notebook.get('nbformat') != 4 or not isinstance(notebook.get('cells'), list):
                        raise WorkspaceError('Unsupported or malformed Jupyter notebook')
                    buffer.content = f'Jupyter notebook · {path.name}\n\n{len(notebook["cells"])} cells retained in the original file.\n\nUse Tools → Open in configured Jupyter.\nNotebook JSON is not an editable source buffer; no kernel has been started.'
            else:
                result = inspect_record(path, state.format, Path(state.companion) if state.companion else None)
                self._match(state.revision, result.revision)
                if state.companion_revision:
                    self._match(state.companion_revision, result.companion_revision)
                buffer.content, buffer.sections = result.body, result.sections
                if state.format == 'model_call':
                    buffer.content = self._review(buffer)
            buffer.problem = ''
            buffer.externally_changed = False
            buffer.loaded = True
        except (OSError, ValueError) as exc:
            buffer.problem = str(exc)
            buffer.loaded = True
            buffer.externally_changed = path is not None and path.exists() and state.format == 'text'
            if recovery is None:
                return buffer
        if recovery is not None:
            # A completed save followed by a crash before cleanup is harmless.
            if not buffer.problem and recovery['text'] == buffer.original:
                buffer.state.was_dirty = False
            else:
                buffer.original, buffer.content = recovery['original'], recovery['text']
                state.revision = recovery['revision']
                buffer.dirty = state.was_dirty = buffer.content != buffer.original
                buffer.recovery_warning = 'Unsaved text recovered from the latest completed local checkpoint. Save or explicitly discard it.'
        elif state.was_dirty and not refresh:
            buffer.problem = 'Recovery snapshot is missing. The buffer was modified; no saved text has been substituted for the missing work.'
        return buffer

    def load_snapshot(self, identifier):
        return self._load(deepcopy(self.buffer(identifier)))

    def accept_snapshot(self, snapshot):
        identifier = snapshot.state.id
        current = self.buffer(identifier)
        # Positions may have changed while a worker read the disk.
        for key in ('cursor', 'selection', 'yscroll', 'xscroll'):
            setattr(snapshot.state, key, getattr(current.state, key))
        index = next(i for i, s in enumerate(self.current().buffers) if s.id == identifier)
        self.current().buffers[index] = snapshot.state
        self.buffers[identifier] = snapshot
        if snapshot.state.format == "text":
            self.store.recovery_previous[identifier] = snapshot.recovery_raw
        return snapshot

    def prepare_file(self, path: Path, *, reference=False):
        path = path.expanduser().resolve()
        if self._internal(path):
            raise WorkspaceError('Git metadata is not an editable mathematical file')
        if path.suffix.lower() in ('.pdf', '.png', '.jpg', '.jpeg', '.zip', '.olean'):
            raise WorkspaceError('Unsupported text format; PDF build outputs use the rendered PDF view')
        source = text_snapshot(path)
        kind = record_kind(source.text)
        if kind in ('model_call', 'projection'):
            return self.prepare_record(path, kind)
        external = not path.is_relative_to(Path(self.current().root))
        notebook = path.suffix.lower() == '.ipynb'
        state = BufferState.new(path=str(path), revision=source.revision,
                                format='notebook' if notebook else 'text', external=external,
                                readonly=reference or external or kind == 'protected' or notebook)
        buffer = Buffer(state, source.text, source.text, loaded=True)
        if notebook:
            return self._load(buffer)
        buffer.sections = (('Source identity · technical details', f'{path}\nSHA-256: {source.revision}'),)
        if kind == 'protected':
            buffer.sections += (('Retained record', 'Protected text. Open the compatible Verification/bundle pair or complete documentary package to validate it.'),)
        return buffer

    def _install(self, buffer, pane=None):
        workspace = self.current()
        for existing in self.buffers.values():
            if buffer.state.path and buffer.state.path == existing.state.path:
                if (existing.state.format, existing.state.companion) != (buffer.state.format, buffer.state.companion):
                    raise WorkspaceError('Close the existing view before changing its record reader')
                self.activate(existing.state.id, pane)
                return self.view(existing.state.id)
        if len(workspace.buffers) >= MAX_BUFFERS:
            raise WorkspaceError('Close a buffer before opening more than 128 documents')
        workspace.buffers.append(buffer.state)
        self.buffers[buffer.state.id] = buffer
        self.activate(buffer.state.id, pane)
        return buffer

    def open_file(self, path, *, reference=False, pane=None):
        path = path.expanduser().resolve()
        for buffer in self.buffers.values():
            if buffer.state.path == str(path):
                self.activate(buffer.state.id, pane)
                return self.view(buffer.state.id)
        return self._install(self.prepare_file(path, reference=reference), pane)

    def prepare_record(self, path, format, *, companion=None):
        path = path.expanduser().resolve()
        companion = companion.expanduser().resolve() if companion else None
        result = inspect_record(path, format, companion)
        state = BufferState.new(path=str(path), format=format, revision=result.revision, readonly=True,
                                external=not path.is_relative_to(Path(self.current().root)),
                                companion=str(companion) if companion else None, companion_revision=result.companion_revision)
        return Buffer(state, result.body, sections=result.sections, loaded=True)

    def open_record(self, path, format, *, companion=None, pane=None):
        return self._install(self.prepare_record(path, format, companion=companion), pane)

    def new_buffer(self, pane=None):
        return self._install(Buffer(BufferState.new(), loaded=True), pane)

    def activate(self, identifier, pane=None):
        workspace = self.current()
        pane = workspace.active_pane if pane is None else pane
        if pane not in (0, 1) or (pane == 1 and not workspace.split):
            raise WorkspaceError('The selected editor pane is not open')
        if identifier is not None:
            buffer = self.buffer(identifier)
            # Structured records have their own open descriptors, including
            # companion bindings. They do not enter ordinary recent files.
            if buffer.state.path and buffer.state.format in ('text', 'notebook'):
                path = buffer.state.path
                workspace.recent = [path, *(p for p in workspace.recent if p != path)][:12]
        workspace.visible[pane] = identifier
        workspace.active, workspace.active_pane = identifier, pane
        self.checkpoint()

    def set_split(self, enabled):
        state = self.current()
        state.split = bool(enabled)
        if enabled and state.visible[1] is None:
            state.visible[1] = next((s.id for s in state.buffers if s.id != state.visible[0]), None)
        if not enabled:
            state.active_pane = 0
            state.active = state.visible[0]
        self.checkpoint()

    def view(self, identifier=None):
        buffer = self.buffer(identifier)
        if not buffer.loaded or buffer.state.format not in ('text', 'notebook'):
            buffer = self.accept_snapshot(self.load_snapshot(buffer.state.id))
        if buffer.loaded and buffer.state.format == 'text' and buffer.state.path and not buffer.problem:
            self.check_external(buffer.state.id)
        return buffer

    def edit(self, identifier, text):
        buffer = self.buffer(identifier)
        if not buffer.editable:
            raise WorkspaceError('This buffer is read-only or unavailable')
        if len(text.encode('utf-8')) > MAX_TEXT_BYTES or '\0' in text:
            raise WorkspaceError('Text exceeds the 2 MiB editor limit or contains an unsupported NUL')
        buffer.content = text
        buffer.dirty = buffer.state.was_dirty = text != buffer.original
        # Per-keystroke work changes memory only. The UI coalesces checkpoints;
        # save/close/quit synchronously flush at their durability boundaries.
        if buffer.dirty:
            self.pending_recovery_cleanup.discard(identifier)
        else:
            buffer.recovery_warning = ''
            self.pending_recovery_cleanup.add(identifier)

    def set_position(self, identifier, *, cursor, selection, yscroll, xscroll):
        state = self.buffer(identifier).state
        state.cursor, state.selection = cursor, selection
        state.yscroll, state.xscroll = yscroll, xscroll

    def _destination(self, path, *, current=None):
        path = path.expanduser().absolute()
        resolved = path.resolve()
        if not resolved.is_relative_to(Path(self.current().root)) or self._internal(resolved):
            raise WorkspaceError('Save ordinary work inside the project directory')
        if path.is_symlink():
            raise WorkspaceError('Refusing to replace a source symlink')
        for buffer in self.buffers.values():
            if buffer is current:
                continue
            state = buffer.state
            for protected in (state.path, state.companion):
                if protected and (resolved == Path(protected) or (state.format == 'documentary_package' and resolved.is_relative_to(Path(protected)))):
                    raise WorkspaceError('Destination is already open or belongs to an immutable package')
        return path

    def save(self, identifier=None):
        buffer = self.buffer(identifier)
        if not buffer.editable:
            raise WorkspaceError('This buffer is read-only')
        if buffer.state.path is None:
            raise WorkspaceError('Choose Save As for an untitled buffer')
        if not self.checkpoint():
            raise WorkspaceError('Checkpoint failed before save: ' + self.persistence_error)
        path = self._destination(Path(buffer.state.path), current=buffer)
        source = text_snapshot(path)
        if source.revision != buffer.state.revision:
            buffer.externally_changed = True
            buffer.disk_content = source.text
            self._match(buffer.state.revision, source.revision)
        if record_kind(source.text) or record_kind(buffer.content):
            raise WorkspaceError('Immutable records cannot be saved as editable text')
        if buffer.dirty:
            save_mutable(path, buffer.content.encode('utf-8'), previous=source.text.encode('utf-8'),
                         mode=stat.S_IMODE(path.stat().st_mode), lock_root=self.store.lock_root)
        self._saved(buffer, path)

    def _saved(self, buffer, path):
        buffer.state.path = str(path.resolve())
        buffer.state.revision = SourceDocument.from_bytes(path, buffer.content.encode('utf-8')).revision
        buffer.state.readonly = buffer.state.external = False
        buffer.original = buffer.content
        buffer.dirty = buffer.state.was_dirty = buffer.externally_changed = False
        buffer.problem = buffer.recovery_warning = ''
        buffer.sections = (('Source identity · technical details', f'{path}\nSHA-256: {buffer.state.revision}'),)
        # Retain the recovery snapshot until the saved path/revision checkpoint
        # is durable. A crash in between still has either the old recovery or
        # the new saved-file reference.
        if not self.checkpoint():
            raise WorkspaceError('File saved, but its final checkpoint failed; recovery was retained')
        self.store.clear_recovery(buffer.state.id)

    def save_as(self, identifier, destination):
        buffer = self.buffer(identifier)
        if buffer.state.format != 'text' or not buffer.loaded or (buffer.problem and not buffer.recovery_warning) or record_kind(buffer.content):
            raise WorkspaceError('Only ordinary text can be saved as a work file')
        path = self._destination(destination, current=buffer)
        if buffer.state.path and path.resolve() == Path(buffer.state.path):
            return self.save(identifier)
        if path.suffix.lower() == '.ipynb':
            raise WorkspaceError('Create and edit notebooks through the configured notebook tool')
        if not self.checkpoint():
            raise WorkspaceError('Checkpoint failed before Save As: ' + self.persistence_error)
        save_mutable(path, buffer.content.encode('utf-8'), previous=None, lock_root=self.store.lock_root)
        self._saved(buffer, path)
        self.activate(identifier)

    def refresh(self, identifier=None, *, discard=False):
        buffer = self.buffer(identifier)
        if (buffer.dirty or buffer.state.was_dirty) and not discard:
            raise WorkspaceError('Refresh would discard unsaved edits')
        if buffer.state.path is None:
            raise WorkspaceError('An untitled buffer has no file to refresh')
        snapshot = self._load(deepcopy(buffer), refresh=True)
        if snapshot.problem:
            raise WorkspaceError(snapshot.problem)
        if snapshot.state.format == 'text':
            self.store.clear_recovery(buffer.state.id)
        snapshot.dirty = snapshot.state.was_dirty = False
        snapshot.recovery_warning = ''
        self.accept_snapshot(snapshot)
        self.checkpoint()

    def discard(self, identifier):
        buffer = self.view(identifier)
        self.store.clear_recovery(identifier)
        buffer.content = buffer.original
        buffer.dirty = buffer.state.was_dirty = False
        buffer.recovery_warning = ''
        self.checkpoint()

    def close_buffer(self, identifier=None):
        buffer = self.buffer(identifier)
        if buffer.dirty or buffer.state.was_dirty:
            raise WorkspaceError('Save or explicitly discard this buffer first')
        state = self.current()
        previous = deepcopy(state)
        state.buffers = [s for s in state.buffers if s.id != buffer.state.id]
        state.visible = [None if i == buffer.state.id else i for i in state.visible]
        state.active = state.visible[state.active_pane]
        if not self.checkpoint():
            self.workspace = previous
            self.workspace.buffers = [self.buffers[s.id].state for s in previous.buffers]
            raise WorkspaceError('Final buffer checkpoint failed; buffer remains open')
        del self.buffers[buffer.state.id]

    def mark(self, identifier, start, end):
        buffer = self.buffer(identifier)
        if not buffer.loaded or not buffer.state.path or buffer.state.format != 'text' or buffer.problem:
            raise WorkspaceError('Mark a selection in an ordinary project file')
        revision = SourceDocument.from_bytes(buffer.state.path, buffer.content.encode('utf-8')).revision
        self.current().marker = WorkMarker(buffer.state.path, revision, start, end)
        self.checkpoint()

    def return_to_marker(self):
        marker = self.current().marker
        if marker is None:
            raise WorkspaceError('No selection has been marked')
        buffer = self.open_file(Path(marker.path))
        if buffer.problem:
            raise WorkspaceError(buffer.problem)
        self._match(marker.revision, SourceDocument.from_bytes(marker.path, buffer.content.encode('utf-8')).revision)
        buffer.state.cursor = marker.start
        buffer.state.selection = [marker.start, marker.end] if marker.start != marker.end else None
        self.checkpoint()
        return buffer

    def clear_marker(self):
        self.current().marker = None
        self.checkpoint()
    def _review(self, buffer):
        state = buffer.state
        snapshot, call = read_call_snapshot(Path(state.path))
        self._match(state.revision, snapshot.revision)
        selectors = {"full": True} if state.review_mode == "full" else ({"passage_number": state.review_number} if state.review_mode == "passage" else {"index_start": state.review_number})
        return render_response_review(call, **selectors)

    def review_response(self, identifier: str, mode="index", number=1):
        buffer = self.buffer(identifier)
        if buffer.state.format != "model_call" or mode not in ("index", "passage", "full"):
            raise WorkspaceError("Select a completed ModelCall response")
        previous = buffer.state.review_mode, buffer.state.review_number
        buffer.state.review_mode, buffer.state.review_number = mode, number
        try:
            body = self._review(buffer)
        except (ValueError, OSError):
            buffer.state.review_mode, buffer.state.review_number = previous
            raise
        buffer.content = body
        buffer.state.cursor, buffer.state.selection = "1.0", None
        buffer.state.yscroll = buffer.state.xscroll = 0.0
        self.checkpoint()
        return body

    def project_passage(self, identifier: str, number: int, destination: Path | None):
        if destination is None:
            return None
        buffer = self.buffer(identifier)
        if buffer.state.format != "model_call":
            raise WorkspaceError("Select a completed ModelCall")
        destination = self._destination(destination)
        snapshot, call = read_call_snapshot(Path(buffer.state.path))
        self._match(buffer.state.revision, snapshot.revision)
        selected = select_passage(call.raw_response, number)
        representation = extract_lossless_representation(call,
            representation_id=f"representation-{uuid4()}", version="1", subject=call.document["target"],
            kind=purpose_kind(call), start_byte=selected.start_byte, end_byte=selected.end_byte)
        claim = make_model_produced_claim(call, representation, claim_id=f"claim-{uuid4()}",
            display_name="Model produced selected response span",
            description="Documentary attribution of exact model-response UTF-8 bytes only.")
        persist_private_new(destination, encode_documentary_projection(DocumentaryProjection(call, representation, claim)))
        return self.open_record(destination, "projection")

    def configure_editor(self, command):
        self.settings_store.configure('editor', command)

    def external_editor_arguments(self, identifier=None):
        buffer = self.buffer(identifier)
        if not buffer.editable or not buffer.state.path:
            raise WorkspaceError('The external editor requires a saved, editable project file')
        line, column = map(int, buffer.state.cursor.split('.'))
        return self.settings_store.editor_arguments(buffer.state.path, line, column + 1)

    def open_in_editor(self, identifier=None):
        buffer = self.buffer(identifier)
        if buffer.dirty:
            raise WorkspaceError('Save the buffer before opening its file in another editor')
        return launch_tool(self.external_editor_arguments(identifier), self.current().root)

    def external_request(self, identifier):
        buffer = self.buffer(identifier)
        if not buffer.loaded or not buffer.state.path or buffer.state.format not in ('text', 'notebook'):
            return None
        return identifier, buffer.state.path, buffer.state.revision

    @staticmethod
    def external_snapshot(request):
        """Detached observation: safe on a worker, never mutates live state."""
        if request is None:
            return None
        _, name, revision = request
        try:
            path = Path(name)
            if path.resolve() != path:
                raise WorkspaceError('File path was redirected')
            source = text_snapshot(path)
            changed = source.revision != revision
            return request, changed, source.text if changed else None
        except (OSError, ValueError):
            return request, True, None

    def accept_external(self, snapshot):
        if snapshot is None:
            return 'unchanged'
        request, changed, content = snapshot
        identifier, path, revision = request
        if identifier not in self.buffers or self.external_request(identifier) != request:
            return 'unchanged'  # Closed/saved/replaced while the read was queued.
        buffer = self.buffer(identifier)
        buffer.externally_changed, buffer.disk_content = changed, content
        return ('conflict' if buffer.dirty else 'changed') if changed else 'unchanged'

    def check_external(self, identifier=None):
        return self.accept_external(self.external_snapshot(self.external_request(self.buffer(identifier).state.id)))

    def open_in_jupyter(self, identifier=None):
        buffer = self.buffer(identifier)
        if buffer.state.format != 'notebook' or buffer.state.external or not buffer.state.path:
            raise WorkspaceError('Select a project notebook for the explicit Jupyter handoff')
        template = self.settings_store.settings.jupyter
        if not template:
            raise WorkspaceError('Configure a Jupyter/JupyterLab command in Tools first')
        arguments = expand_arguments(template, file=buffer.state.path, line=1, column=1)
        return launch_tool(arguments, self.current().root)

    def set_tex_root(self, identifier=None):
        buffer = self.buffer(identifier)
        if buffer.state.format != 'text' or not buffer.state.path or not buffer.editable or Path(buffer.state.path).suffix.lower() != '.tex':
            raise WorkspaceError('Select an existing editable project TeX file')
        self.current().tex_root = buffer.state.path
        self.checkpoint()

    @property
    def build_storage(self):
        self.current()
        return self.store.directory / 'builds'

    def build_request(self):
        state = self.current()
        if not state.tex_root:
            raise WorkspaceError('Use Set as TeX root on the root document first')
        if any(b.dirty or b.state.was_dirty for b in self.buffers.values()):
            raise WorkspaceError('Save modified buffers before building their disk sources')
        return dict(project=Path(state.root), tex_root=Path(state.tex_root), build_storage=self.build_storage,
                    configured_engine=self.settings_store.settings.tex_engine)

    def accept_build(self, report):
        state = self.current()
        if report['project'] != state.root:
            raise WorkspaceError('Build belongs to a different project')
        state.last_build = report['id']
        if report['success']:
            state.successful_build = report['id']
            state.pdf_visible = True
        self.checkpoint()

    def build_latex(self, **options):
        from .latex_build import run_latex
        report = run_latex(**self.build_request(), **options)
        self.accept_build(report)
        return report

    def build_report(self, *, successful=False):
        from .latex_build import load_build
        state = self.current()
        identifier = state.successful_build if successful else state.last_build
        return load_build(self.build_storage, identifier, Path(state.root)) if identifier else None

    def pdf_snapshot(self):
        from .latex_build import pdf_bytes, stale_inputs
        report = self.build_report(successful=True)
        if report is None:
            raise WorkspaceError('No successful PDF build is retained')
        stale = stale_inputs(report)
        dirty = [b.state.path for b in self.buffers.values() if b.dirty]
        stale.extend(i['path'] for i in report['inputs'] if i['path'] in dirty and i['path'] not in stale)
        if report['tex_root'] != self.current().tex_root:
            stale.append('Selected TeX root changed')
        return report, pdf_bytes(self.build_storage, report), stale

    def set_pdf_view(self, *, page, zoom, scale, visible=True):
        state = self.current()
        state.pdf_page, state.pdf_zoom, state.pdf_scale = page, zoom, scale
        state.pdf_visible = visible
