"""Toolkit-independent editor and explicit local mathematical-file actions."""

from __future__ import annotations

from copy import deepcopy
from dataclasses import asdict, dataclass, field, replace
from hashlib import sha256
import math
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
from .workspace import (BufferState, MAX_BUFFERS, MAX_CONTEXT_SELECTIONS,
                        MAX_TEXT_BYTES, ImportedPdfState, PaneViewState, WorkMarker, Workspace,
                        WorkspaceError, WorkspaceStore, anchor_preview, decode_imported_pdf,
                        decode_marker, decode_pane_view, selection_span, strict_json)


MAX_PDF_BYTES = 64 * 1024 * 1024


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
    def has_content(self):
        """Loaded document content, including recovery with an unavailable base."""
        return self.loaded and (not self.problem or bool(self.recovery_warning))

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


@dataclass(frozen=True)
class ImportedPdfSnapshot:
    """Detached exact bytes for one explicitly selected or restored local PDF."""
    reference: ImportedPdfState
    raw: bytes
    expected: ImportedPdfState | None = None


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
        self.completed_navigation = (None, [])

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
        self._remember_navigation()
        self.buffers = {state.id: Buffer(state) for state in workspace.buffers}
        self.pending_recovery_cleanup.clear()
        self.settings_store.remember_project(workspace.root)
        self.checkpoint()

    def checkpoint(self) -> bool:
        if self.workspace is None:
            return True
        try:
            # An uncertain publication can only be resolved by reopening. Do
            # this before recovery, manifest, cleanup or settings can write.
            self.store.require_writable()
            for buffer in self.buffers.values():
                if buffer.loaded and buffer.dirty:
                    self.store.write_recovery(buffer)
            self.store.save(self.workspace)
            self._remember_navigation()
            for identifier in tuple(self.pending_recovery_cleanup):
                self.store.clear_recovery(identifier)
                self.pending_recovery_cleanup.discard(identifier)
            self.settings_store.save()
        except (ValueError, OSError) as exc:
            self.store.block_writes(exc)
            self.persistence_error = self.store.blocked
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
        snapshot.state.pane_views = deepcopy(current.state.pane_views)
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
            raise WorkspaceError('Unsupported text format; open PDFs through the read-only rendered PDF view')
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

    def prepare_pdf(self, path: Path | None = None, *, restore=False):
        """Read an existing PDF without creating a text buffer or build record."""
        state = self.current()
        expected = deepcopy(state.imported_pdf) if restore else None
        if restore:
            if expected is None:
                raise WorkspaceError('No imported PDF has been selected')
            path = Path(expected.path)
            try:
                if path.resolve(strict=True) != path:
                    raise WorkspaceError('Imported PDF path was redirected; the saved reading position was not restored')
            except OSError as exc:
                raise WorkspaceError('Imported PDF is missing or unreadable; the work note was retained') from exc
        elif path is None:
            raise WorkspaceError('Select an existing local PDF')
        else:
            try:
                path = path.expanduser().resolve(strict=True)
            except OSError as exc:
                raise WorkspaceError('Selected PDF is missing or unreadable; the work note was retained') from exc
        if path.suffix.lower() != '.pdf':
            raise WorkspaceError('Select a PDF document')
        if self._internal(path):
            raise WorkspaceError('Git metadata is not a readable mathematical document')
        try:
            raw = read_bounded(path, MAX_PDF_BYTES, 'PDF document')
        except (OSError, ValueError) as exc:
            raise WorkspaceError('PDF could not be read; the work note was retained: ' + str(exc)) from exc
        if not raw.startswith(b'%PDF-'):
            raise WorkspaceError('Selected file is not a PDF; the work note was retained')
        revision = sha256(raw).hexdigest()
        if expected is not None and (expected.path != str(path) or expected.revision != revision):
            raise WorkspaceError('Imported PDF changed (SHA-256 mismatch); its saved page and zoom were not restored. The work note was retained')
        current = state.imported_pdf
        if not restore and current is not None and (current.path, current.revision) == (str(path), revision):
            reference = deepcopy(current)
            expected = deepcopy(current)
        else:
            reference = deepcopy(expected) if expected is not None else ImportedPdfState(str(path), revision)
        return ImportedPdfSnapshot(reference, raw, expected)

    def imported_pdf_snapshot(self):
        return self.prepare_pdf(restore=True)

    @staticmethod
    def _validate_imported_pdf_snapshot(snapshot):
        if not isinstance(snapshot, ImportedPdfSnapshot):
            raise WorkspaceError('Invalid imported PDF snapshot')
        decode_imported_pdf(asdict(snapshot.reference))
        if snapshot.expected is not None:
            decode_imported_pdf(asdict(snapshot.expected))
        if not snapshot.raw.startswith(b'%PDF-') or sha256(snapshot.raw).hexdigest() != snapshot.reference.revision:
            raise WorkspaceError('Imported PDF snapshot identity does not match its exact bytes')

    def accept_imported_pdf(self, snapshot):
        """Publish a GUI-validated imported PDF identity without touching text state."""
        self._validate_imported_pdf_snapshot(snapshot)
        state = self.current()
        if snapshot.expected is not None and state.imported_pdf != snapshot.expected:
            raise WorkspaceError('Imported PDF selection changed during the read; open it again')
        previous = deepcopy((state.imported_pdf, state.pdf_source, state.pdf_visible, state.recent))
        state.imported_pdf = deepcopy(snapshot.reference)
        state.pdf_source = 'imported'
        state.pdf_visible = True
        path = snapshot.reference.path
        state.recent = [path, *(item for item in state.recent if item != path)][:12]
        if not self.checkpoint():
            state.imported_pdf, state.pdf_source, state.pdf_visible, state.recent = previous
            raise WorkspaceError('Imported PDF was readable, but its workspace checkpoint failed: ' + self.persistence_error)
        return state.imported_pdf

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
        if type(pane) is not int or pane not in (0, 1) or (pane == 1 and not workspace.split):
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

    def navigation_entries(self, identifier):
        """Ordered scalar anchors for a buffer; no source reads or Qt objects."""
        path = self.buffer(identifier).state.path
        state = self.current()
        entries = [('marker', state.marker)] if state.marker and state.marker.path == path else []
        return entries + [(i, entry) for i, entry in enumerate(state.selection_shelf) if entry.path == path]

    def _remember_navigation(self):
        state = self.current()
        self.completed_navigation = deepcopy((state.marker, state.selection_shelf))

    @staticmethod
    def _span_text(text, start, end, *, point=False):
        from .workspace import _position
        _position(start)
        _position(end)
        if not point or start != end:
            selection_span(start, end)
        lines = text.replace('\r\n', '\n').replace('\r', '\n').split('\n')
        positions = [tuple(map(int, value.split('.'))) for value in (start, end)]
        if any(line > len(lines) or column > len(lines[line - 1]) for line, column in positions):
            raise WorkspaceError('Selection is outside the current document')
        offsets = [sum(len(line) + 1 for line in lines[:row - 1]) + column for row, column in positions]
        return '\n'.join(lines)[offsets[0]:offsets[1]]

    def edit(self, identifier, text, *, pane_positions=None, anchor_positions=None, revision=None, collapsed=()):
        """Apply one document mutation. Live Qt edits supply a complete candidate.

        Calls without anchor_positions are explicit whole-text replacements;
        no correspondence through such a replacement is asserted. All supplied
        pane and navigation positions are validated before any memory changes.
        """
        buffer = self.buffer(identifier)
        if not buffer.editable:
            raise WorkspaceError('This buffer is read-only or unavailable')
        if not isinstance(text, str):
            raise WorkspaceError('Editor text must be Unicode')
        if len(text.encode('utf-8')) > MAX_TEXT_BYTES or '\0' in text:
            raise WorkspaceError('Text exceeds the 2 MiB editor limit or contains an unsupported NUL')
        views = buffer.state.pane_views
        if pane_positions is not None:
            if (not isinstance(pane_positions, (list, tuple)) or len(pane_positions) != 2
                    or any(not isinstance(item, (list, tuple)) or len(item) != 2 for item in pane_positions)):
                raise WorkspaceError('An edit requires two pane positions')
            views = [decode_pane_view(dict(cursor=cursor, selection=selection,
                         yscroll=view.yscroll, xscroll=view.xscroll))
                     for (cursor, selection), view in zip(pane_positions, buffer.state.pane_views)]
        state = self.current()
        marker, shelf = state.marker, list(state.selection_shelf)
        if anchor_positions is not None:
            digest = sha256(text.encode('utf-8')).hexdigest()
            self._match(digest, revision)
            if pane_positions is None:
                raise WorkspaceError('A live edit requires both pane views')
            for view in views:
                self._span_text(text, *(view.selection or [view.cursor, view.cursor]), point=True)
            expected = self.navigation_entries(identifier)
            if (not isinstance(collapsed, (list, tuple)) or len(collapsed) > len(expected)
                    or any(type(key) not in (int, str) for key in collapsed)
                    or len(set(collapsed)) != len(collapsed)
                    or not set(collapsed) <= {key for key, _ in expected}):
                raise WorkspaceError('Invalid collapsed navigation set')
            if (not isinstance(anchor_positions, list) or len(anchor_positions) != len(expected)
                    or any(not isinstance(item, tuple) or len(item) != 3 for item in anchor_positions)):
                raise WorkspaceError('A live edit requires the complete ordered navigation set')
            for (key, entry), (candidate_key, previous, span) in zip(expected, anchor_positions):
                if type(candidate_key) is not type(key) or candidate_key != key or previous != entry:
                    raise WorkspaceError('Navigation changed during the edit')
                decode_marker(asdict(entry), shelf=key != 'marker')
                if span is None:
                    # A deleted passage keeps its last completed pin, not a
                    # point or a newly guessed location in the changed text.
                    changed = entry
                    if key in collapsed:
                        if entry.start == entry.end or buffer.problem or buffer.externally_changed:
                            raise WorkspaceError('Only a live nonempty passage can collapse')
                        pinned = self.completed_navigation[0] if key == 'marker' else self.completed_navigation[1][key]
                        if not pinned or pinned.path != entry.path:
                            raise WorkspaceError('A deleted anchor requires its completed pin')
                        changed = pinned
                else:
                    if key in collapsed:
                        raise WorkspaceError('A collapsed anchor cannot acquire a replacement span')
                    if (not buffer.state.path or buffer.state.external or buffer.externally_changed
                            or buffer.problem or record_kind(text)):
                        raise WorkspaceError('Changed or unavailable sources cannot acquire replacement anchors')
                    if not isinstance(span, tuple) or len(span) != 2:
                        raise WorkspaceError('Invalid live anchor range')
                    selected = self._span_text(text, *span, point=key == 'marker' and entry.start == entry.end)
                    changed = WorkMarker(entry.path, digest, *span, anchor_preview(selected))
                if key == 'marker':
                    marker = changed
                else:
                    shelf[key] = changed
            if len(shelf) > MAX_CONTEXT_SELECTIONS:
                raise WorkspaceError('Working context is limited to 32 selections')
            identities = [(s.path, s.revision, s.start, s.end) for s in shelf]
            if len(set(identities)) != len(identities):
                # Distinct overlapping passages can converge during deletion.
                # Keep their rows independent without publishing duplicate pins
                # or rejecting the text edit: a later collision retains its
                # completed pin and becomes changed until explicitly retained.
                seen = set()
                for index, identity in enumerate(identities):
                    if identity in seen:
                        shelf[index] = deepcopy(self.completed_navigation[1][index])
                        item = shelf[index]
                        identity = item.path, item.revision, item.start, item.end
                    if identity in seen:
                        for key, _ in expected:
                            if key != 'marker':
                                shelf[key] = deepcopy(self.completed_navigation[1][key])
                        break
                    seen.add(identity)
        buffer.state.pane_views = views
        state.marker, state.selection_shelf = marker, shelf
        buffer.content = text
        buffer.dirty = buffer.state.was_dirty = text != buffer.original
        # Per-keystroke work changes memory only. The UI coalesces checkpoints;
        # save/close/quit synchronously flush at their durability boundaries.
        if buffer.dirty:
            self.pending_recovery_cleanup.discard(identifier)
        else:
            buffer.recovery_warning = ''
            self.pending_recovery_cleanup.add(identifier)

    def _displayed_pane(self, identifier, pane=None):
        state = self.current()
        pane = state.active_pane if pane is None else pane
        if (type(pane) is not int or pane not in (0, 1) or (pane == 1 and not state.split)
                or state.visible[pane] != identifier):
            raise WorkspaceError('The selected pane must display this buffer')
        return pane

    def set_position(self, identifier, *, cursor, selection, yscroll, xscroll, pane=None):
        pane = self._displayed_pane(identifier, pane)
        if not self.buffer(identifier).has_content:
            raise WorkspaceError('Loading and diagnostic displays have no document position')
        view = decode_pane_view(dict(cursor=cursor, selection=selection, yscroll=yscroll, xscroll=xscroll))
        self.buffer(identifier).state.pane_views[pane] = view

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

    def context_selection_supported(self, identifier):
        buffer = self.buffers.get(identifier)
        return bool(buffer and buffer.loaded and buffer.state.path and buffer.state.format == 'text'
                    and not buffer.problem and not buffer.externally_changed and not self._internal(Path(buffer.state.path))
                    and (Path(buffer.state.path).is_relative_to(Path(self.current().root))
                         or (buffer.state.external and buffer.state.readonly))
                    and not record_kind(buffer.content))

    @staticmethod
    def _context_span(text, start, end):
        return Workstation._span_text(text, start, end)

    def _context_selection(self, index):
        shelf = self.current().selection_shelf
        if type(index) is not int or not 0 <= index < len(shelf):
            raise WorkspaceError('Select a working-context passage first')
        return shelf[index]

    def _checkpoint_selection_shelf(self, selections):
        # Finish recovery, cleanup and settings before publishing an anchor to
        # unsaved text. The shelf itself is the final atomic manifest write.
        if not self.checkpoint():
            raise WorkspaceError('Working context checkpoint failed: ' + self.persistence_error)
        candidate = replace(self.current(), selection_shelf=selections)
        try:
            self.store.save(candidate)
        except (OSError, ValueError) as exc:
            # Equal bytes cannot identify their writer, and a read cannot
            # prove directory durability. Never compensate with another write.
            self.store.block_writes(exc)
            self.persistence_error = self.store.blocked
            raise WorkspaceError('Working context checkpoint failed: ' + self.persistence_error) from exc
        self.current().selection_shelf = selections
        self._remember_navigation()

    def add_context_selection(self, identifier, start, end, *, pane=None) -> int:
        if not self.context_selection_supported(identifier):
            raise WorkspaceError('Select a passage in a loaded ordinary text file')
        buffer = self.buffer(identifier)
        self._context_span(buffer.content, start, end)
        pane = self._displayed_pane(identifier, pane)
        if buffer.state.pane_views[pane].selection != [start, end]:
            raise WorkspaceError('Use the current nonempty editor selection')
        entry = WorkMarker(buffer.state.path, sha256(buffer.content.encode('utf-8')).hexdigest(), start, end,
                           anchor_preview(self._context_span(buffer.content, start, end)))
        self._validate_context_file(entry, buffer)
        shelf = self.current().selection_shelf
        for index, old in enumerate(shelf):
            if (old.path, old.revision, old.start, old.end) == (entry.path, entry.revision, start, end):
                self._checkpoint_selection_shelf([*shelf[:index], entry, *shelf[index + 1:]])
                return index
        if len(shelf) >= MAX_CONTEXT_SELECTIONS:
            raise WorkspaceError('Working context is limited to 32 selections; remove a passage first')
        self._checkpoint_selection_shelf([*shelf, entry])
        return len(shelf)

    def remove_context_selection(self, index):
        self._context_selection(index)
        shelf = self.current().selection_shelf
        self._checkpoint_selection_shelf(shelf[:index] + shelf[index + 1:])

    def prepare_context_selection(self, index):
        """Explicit bounded read; return detached data without any navigation."""
        return self._prepare_navigation(self._context_selection(index))

    def _prepare_navigation(self, entry, *, marker=False):
        entry = deepcopy(entry)
        decode_marker(asdict(entry), shelf=not marker)
        path = Path(entry.path)
        if path.resolve(strict=True) != path:
            raise WorkspaceError('Working-context path was redirected; the anchor was retained')
        existing = next((b for b in self.buffers.values() if b.state.path == entry.path), None)
        if existing is None:
            buffer = self.prepare_file(path, reference=not path.is_relative_to(Path(self.current().root)))
        elif not existing.loaded:
            buffer = self.load_snapshot(existing.state.id)
        else:
            buffer = deepcopy(existing)
        self._validate_context_content(entry, buffer, marker=marker)
        self._validate_context_file(entry, buffer)
        return entry, buffer

    def _validate_context_file(self, entry, buffer):
        path = Path(entry.path)
        if path.resolve(strict=True) != path:
            raise WorkspaceError('Working-context path was redirected; the anchor was retained')
        self._match(buffer.state.revision, text_snapshot(path).revision)

    def _validate_context_content(self, entry, buffer, *, marker=False):
        if (not buffer.loaded or buffer.state.path != entry.path or buffer.state.format != 'text'
                or not buffer.has_content or record_kind(buffer.content)):
            raise WorkspaceError('Working-context document is unavailable; the anchor was retained')
        if entry.revision != sha256(buffer.content.encode('utf-8')).hexdigest():
            raise WorkspaceError('Retained passage changed (SHA-256 mismatch); the anchor was retained')
        self._span_text(buffer.content, entry.start, entry.end, point=marker)

    def accept_context_selection(self, index, prepared, pane=None):
        """Apply a checked read on the controller's owning (GUI) thread only."""
        entry, snapshot = prepared
        if entry != self._context_selection(index):
            raise WorkspaceError('Working context changed during the read; select the passage again')
        return self._accept_navigation(entry, snapshot, pane, index=index)

    def _accept_navigation(self, entry, snapshot, pane=None, *, index=None):
        state = self.current()
        pane = state.active_pane if pane is None else pane
        if type(pane) is not int or pane not in (0, 1):
            raise WorkspaceError('Select one of the two editor panes')
        existing = next((b for b in self.buffers.values() if b.state.path == entry.path), None)
        buffer = existing if existing and existing.loaded else snapshot
        marker = index is None
        decode_marker(asdict(entry), shelf=not marker)
        self._validate_context_content(entry, buffer, marker=marker)
        # The disk may have changed since the worker prepared this passage.
        # Compare against its base revision, independently of recovered text.
        self._validate_context_file(entry, snapshot)
        buffer.problem = ''
        buffer.externally_changed = False
        if existing is None:
            if len(state.buffers) >= MAX_BUFFERS:
                raise WorkspaceError('Close a buffer before opening more than 128 documents')
            state.buffers.append(buffer.state)
            self.buffers[buffer.state.id] = buffer
        elif not existing.loaded:
            buffer = self.accept_snapshot(snapshot)
        view = buffer.state.pane_views[pane]
        view.cursor = entry.start if marker else entry.end
        view.selection = [entry.start, entry.end] if entry.start != entry.end else None
        # Historical anchors acquire previews only after this explicit,
        # fully validated opening. Rendering itself performs no source read.
        if not entry.preview:
            entry = replace(entry, preview=anchor_preview(self._span_text(buffer.content, entry.start, entry.end, point=marker)))
            if marker:
                state.marker = entry
            else:
                state.selection_shelf[index] = entry
        if pane == 1:
            state.split = True
        self.activate(buffer.state.id, pane)
        return buffer

    def open_context_selection(self, index, pane=None):
        return self.accept_context_selection(index, self.prepare_context_selection(index), pane)

    def mark(self, identifier, start, end):
        buffer = self.buffer(identifier)
        if not self.context_selection_supported(identifier):
            raise WorkspaceError('Mark a selection in an ordinary project file')
        revision = SourceDocument.from_bytes(buffer.state.path, buffer.content.encode('utf-8')).revision
        selected = self._span_text(buffer.content, start, end, point=True)
        marker = WorkMarker(buffer.state.path, revision, start, end, anchor_preview(selected))
        self._validate_context_file(marker, buffer)
        self._checkpoint_marker(marker)

    def _checkpoint_marker(self, marker):
        if not self.checkpoint():
            raise WorkspaceError('Unfinished marker checkpoint failed: ' + self.persistence_error)
        try:
            self.store.save(replace(self.current(), marker=marker))
        except (OSError, ValueError) as exc:
            self.store.block_writes(exc)
            self.persistence_error = self.store.blocked
            raise WorkspaceError('Unfinished marker checkpoint failed: ' + self.persistence_error) from exc
        self.current().marker = marker
        self._remember_navigation()

    def prepare_marker(self):
        marker = self.current().marker
        if marker is None:
            raise WorkspaceError('No selection has been marked')
        return self._prepare_navigation(marker, marker=True)

    def accept_marker(self, prepared, pane=None):
        marker, snapshot = prepared
        if marker != self.current().marker:
            raise WorkspaceError('Unfinished marker changed during the read; return again')
        return self._accept_navigation(marker, snapshot, pane)

    def return_to_marker(self):
        return self.accept_marker(self.prepare_marker())

    def clear_marker(self):
        self._checkpoint_marker(None)
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
        buffer.state.pane_views = [PaneViewState(), PaneViewState()]
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
        pane = self._displayed_pane(buffer.state.id)
        line, column = map(int, buffer.state.pane_views[pane].cursor.split('.'))
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

    def accept_generated_pdf(self, report):
        """Select a successfully rendered retained build after Qt validates it."""
        state = self.current()
        if not isinstance(report, dict) or report.get('id') != state.successful_build or not report.get('success'):
            raise WorkspaceError('Generated PDF no longer matches the last successful build')
        previous = state.pdf_source, state.pdf_visible
        state.pdf_source, state.pdf_visible = 'generated', True
        if not self.checkpoint():
            state.pdf_source, state.pdf_visible = previous
            raise WorkspaceError('Generated PDF was readable, but its workspace checkpoint failed: ' + self.persistence_error)

    def set_pdf_view(self, *, page, zoom, scale, visible=True, source=None):
        state = self.current()
        source = state.pdf_source if source is None else source
        if source not in ('generated', 'imported') or source != state.pdf_source:
            raise WorkspaceError('PDF view changed while its position was being captured')
        if type(page) is not int or not 0 <= page <= 100000 or zoom not in ('width', 'page', 'custom'):
            raise WorkspaceError('Invalid PDF navigation state')
        if type(scale) not in (int, float) or not 0.1 <= scale <= 8 or not math.isfinite(scale):
            raise WorkspaceError('Invalid PDF scale')
        if source == 'imported':
            if state.imported_pdf is None:
                raise WorkspaceError('No imported PDF is selected')
            state.imported_pdf = replace(state.imported_pdf, page=page, zoom=zoom, scale=scale)
        else:
            state.pdf_page, state.pdf_zoom, state.pdf_scale = page, zoom, scale
        state.pdf_visible = visible
