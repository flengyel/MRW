"""Qt Widgets/QtPdf interface. Controllers and record validators are toolkit-free."""

from __future__ import annotations

from contextlib import contextmanager
from hashlib import sha256
import json
from html import escape
import os
from pathlib import Path
import shlex
import shutil
import sys

from PySide6.QtCore import (QBuffer, QByteArray, QDir, QIODevice, QObject, QPoint, QPointF,
                            QRunnable, QSignalBlocker, QSortFilterProxyModel, Qt,
                            QThread, QThreadPool, QTimer, Signal, Slot)
from PySide6.QtGui import (QAction, QColor, QFontDatabase, QKeySequence, QPainter,
                           QTextCursor, QTextDocument, QTextOption)
from PySide6.QtWidgets import (QApplication, QComboBox, QDialog, QDialogButtonBox,
    QDockWidget, QFileDialog, QFileSystemModel, QGridLayout, QHBoxLayout, QInputDialog, QLabel,
    QLineEdit, QListWidget, QListWidgetItem, QMainWindow, QMenu, QMessageBox,
    QPlainTextDocumentLayout, QPlainTextEdit, QPushButton, QScrollArea, QSizePolicy,
    QSpinBox, QSplitter, QToolBar,
    QToolButton, QTreeView, QVBoxLayout, QWidget)
from PySide6.QtPdf import QPdfDocument
from PySide6.QtPdfWidgets import QPdfView

from .response_review import bounded_safe_diagnostic, passage_count
from .workstation import (ASSISTANCE_MODEL_ENV, MAX_ASSISTANCE_CONTEXTS,
                          AssistanceOutcome, Workstation, preserve_newlines,
                          record_kind)
from .workspace import MAX_TEXT_BYTES, WorkspaceError

TITLE = 'Mathematical Research Workstation'
FILE_FILTER = 'Mathematical files (*.pdf *.tex *.lean *.sage *.py *.md *.txt *.ipynb *.json);;PDF documents (*.pdf);;All files (*)'


class JobSignals(QObject):
    finished = Signal(object, object)


class Job(QRunnable):
    def __init__(self, task):
        super().__init__()
        self.task = task
        self.signals = JobSignals()

    def run(self):
        try:
            self.signals.finished.emit(self.task(), None)
        except Exception as exc:
            self.signals.finished.emit(None, str(exc))


class JobCompletion(QObject):
    """A GUI-owned receiver; all completion effects run on its Qt thread."""
    def __init__(self, window, job, done, failed):
        super().__init__(window)
        self.window, self.job, self.done, self.failed = window, job, done, failed
        self.delivered_thread = None

    @Slot(object, object)
    def receive(self, value, error):
        self.delivered_thread = QThread.currentThread()
        assert self.delivered_thread == QApplication.instance().thread()
        window = self.window
        window.jobs.pop(id(self.job), None)
        try:
            if error is not None:
                if self.failed:
                    window.perform(lambda: self.failed(error))
                window.show_error(error)
            else:
                window.perform(lambda: self.done(value))
            window.update_actions()
        finally:
            self.job = None
            self.deleteLater()


class ProjectFilter(QSortFilterProxyModel):
    def filterAcceptsRow(self, row, parent):
        index = self.sourceModel().index(row, 0, parent)
        return self.sourceModel().fileName(index) != '.git'


class LineNumbers(QWidget):
    def __init__(self, editor):
        super().__init__(editor)
        self.editor = editor

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.fillRect(event.rect(), QColor('#f1f3f5'))
        painter.setPen(QColor('#66717d'))
        editor = self.editor
        block = editor.firstVisibleBlock()
        top = int(editor.blockBoundingGeometry(block).translated(editor.contentOffset()).top())
        while block.isValid() and top < event.rect().bottom():
            height = int(editor.blockBoundingRect(block).height())
            if block.isVisible() and top + height >= event.rect().top():
                painter.drawText(0, top, self.width() - 8, editor.fontMetrics().height(),
                                 Qt.AlignmentFlag.AlignRight, str(block.blockNumber() + 1))
            top += height
            block = block.next()


class SourceEdit(QPlainTextEdit):
    focused = Signal()

    def __init__(self, pane):
        super().__init__()
        self.pane = pane
        self.reflow = None
        self.restored_scroll = None
        self.stable_view = None
        self.settling = False
        self.reflow_timer = QTimer(self)
        self.reflow_timer.setSingleShot(True)
        self.reflow_timer.timeout.connect(self.finish_reflow)
        font = QFontDatabase.systemFont(QFontDatabase.SystemFont.FixedFont)
        font.setPointSize(12)
        self.setFont(font)
        self.setLineWrapMode(QPlainTextEdit.LineWrapMode.WidgetWidth)
        self.setTabStopDistance(self.fontMetrics().horizontalAdvance(' ') * 4)
        self.gutter = LineNumbers(self)
        self.blockCountChanged.connect(self.layout_gutter)
        self.updateRequest.connect(self.update_gutter)
        self.layout_gutter()

    def update_gutter(self, rect, dy):
        if dy:
            self.gutter.scroll(0, dy)
        else:
            self.gutter.update(0, rect.y(), self.gutter.width(), rect.height())
        if rect.contains(self.viewport().rect()):
            self.layout_gutter()

    def paintEvent(self, event):
        super().paintEvent(event)
        # QPlainTextEdit lays out wrapped blocks lazily while painting. Refresh
        # numbering after that layout, including when a split changes width.
        self.gutter.update()
        self.remember_view()

    def view_anchor(self):
        cursor = self.textCursor()
        anchor = self.cursorForPosition(QPoint(0, 0))
        return (QTextCursor(cursor), anchor, self.cursorRect(anchor).top(),
                self.viewport().rect().contains(self.cursorRect()), self.horizontalScrollBar().value())

    def remember_view(self):
        if not self.reflow and not self.restored_scroll and not self.settling and not self.pane.window.view_updates and self.pane.genuine_content():
            self.stable_view = self.view_anchor()

    def restore_scroll(self, view):
        if self.reflow is None:
            self.restored_scroll = (QTextCursor(self.textCursor()), view.yscroll, view.xscroll)
            self.reflow_timer.start(0)

    def begin_reflow(self, *, cached=False):
        if self.settling or not self.pane.isVisible() or not self.pane.genuine_content():
            return
        if self.reflow is None:
            self.reflow = self.stable_view if cached and self.stable_view else self.view_anchor()
        self.reflow_timer.start(0)

    def finish_reflow(self):
        self.pane.window.normalize_editor_widths()
        if self.reflow is None and self.restored_scroll is None:
            return
        self.settling = True
        try:
            current = self.textCursor()
            if self.restored_scroll is not None:
                cursor, vertical, horizontal = self.restored_scroll
                if (self.pane.genuine_content() and cursor.document() == self.document()
                        and (current.position(), current.anchor()) == (cursor.position(), cursor.anchor())):
                    # The initial range may precede scrollbar/gutter layout.
                    # Restore against the painted document before capturing it.
                    self.viewport().repaint()
                    self.verticalScrollBar().setValue(round(vertical * self.verticalScrollBar().maximum()))
                    self.horizontalScrollBar().setValue(round(horizontal * self.horizontalScrollBar().maximum()))
                return
            cursor, anchor, offset, visible, horizontal = self.reflow
            if (self.pane.genuine_content() and cursor.document() == self.document()
                    and (current.position(), current.anchor()) == (cursor.position(), cursor.anchor())):
                # Materialize Qt's lazy wrapped layout before using geometry.
                self.viewport().repaint()
                bar = self.verticalScrollBar()
                for _ in range(8):
                    distance = self.cursorRect(anchor).top() - offset
                    step = round(distance / self.fontMetrics().height())
                    value = max(bar.minimum(), min(bar.maximum(), bar.value() + step))
                    if value == bar.value():
                        break
                    bar.setValue(value)
                self.horizontalScrollBar().setValue(horizontal)
                if visible and not self.viewport().rect().contains(self.cursorRect()):
                    self.ensureCursorVisible()
        finally:
            self.reflow = None
            self.restored_scroll = None
            self.settling = False
            self.pane.capture_position()

    def forget_view(self):
        self.reflow_timer.stop()
        self.reflow = self.stable_view = None
        self.restored_scroll = None

    def attach_document(self, document):
        self.forget_view()
        with QSignalBlocker(self):
            # Reset the old viewport before detaching a shared, reflowed
            # document. Qt can otherwise retain a top-line offset that is
            # invalid in the new document while adjusting its scrollbars.
            self.setTextCursor(QTextCursor(self.document()))
            self.verticalScrollBar().setValue(0)
            self.horizontalScrollBar().setValue(0)
            self.setDocument(document)

    def layout_gutter(self, *_):
        width = 16 + self.fontMetrics().horizontalAdvance('9') * len(str(max(1, self.blockCount())))
        self.setViewportMargins(width, 0, 0, 0)
        self.gutter.setGeometry(0, 0, width, self.height())

    def resizeEvent(self, event):
        if hasattr(self, 'gutter'):
            self.pane.window.begin_reflow(cached=True)
        super().resizeEvent(event)
        self.layout_gutter()
        self.pane.window.schedule_editor_widths()

    def focusInEvent(self, event):
        super().focusInEvent(event)
        self.focused.emit()


def cursor_index(edit, position):
    return document_index(edit.document(), position)


def document_index(document, position):
    cursor = QTextCursor(document)
    cursor.setPosition(position)
    block = cursor.block()
    # Persistent columns count Unicode scalars; Qt document positions use UTF-16.
    prefix = block.text().encode('utf-16-le')[:2 * (position - block.position())]
    column = len(prefix.decode('utf-16-le', errors='ignore'))
    return f'{block.blockNumber() + 1}.{column}'


def qt_position(edit, index):
    return document_position(edit.document(), index)


def document_position(document, index):
    line, column = map(int, index.split('.'))
    block = document.findBlockByNumber(min(line - 1, document.blockCount() - 1))
    return block.position() + len(block.text()[:column].encode('utf-16-le')) // 2


def displayed_position(position):
    line, column = map(int, position.split('.'))
    return f'{line}:{column + 1}'


class LiveRange:
    """GUI-only endpoints and scalar undo snapshots, owned by one document.

    Half-open spans exclude insertion at either outside boundary. A deliberate
    point marker advances on insertion. Deleted spans stay invalid until an
    undo restores their range; there is no quotation search or relocation.
    """
    def __init__(self, document, entry):
        self.entry = entry
        self.point = entry.start == entry.end
        self.start, self.end = QTextCursor(document), QTextCursor(document)
        self.start.setPosition(document_position(document, entry.start))
        self.end.setPosition(document_position(document, entry.end))
        self.end.setKeepPositionOnInsert(not self.point)
        self.invalid = False
        self.history = {}
        self.remember(document.availableUndoSteps())

    def remember(self, step):
        self.history[step] = (self.start.position(), self.end.position(), self.invalid)

    def restore(self, step):
        start, end, self.invalid = self.history[step]
        self.start.setPosition(start)
        self.end.setPosition(end)


class BufferDocument(QTextDocument):
    """One GUI-owned document and undo stack for one loaded buffer."""
    def __init__(self, window, identifier, font):
        super().__init__(window)
        self.window, self.identifier = window, identifier
        self.installing = False
        self.pane_cursors = []
        self.anchors = {}
        self.undo_step = 0
        self.new_undo_command = False
        self.revision = ''
        self.setDocumentLayout(QPlainTextDocumentLayout(self))
        self.setDefaultFont(font)
        self.set_wrap(window.controller.current().wrap)
        self.refresh_timer = QTimer(self)
        self.refresh_timer.setSingleShot(True)
        self.refresh_timer.timeout.connect(self.refresh_views)
        self.contentsChanged.connect(self.edited)
        self.undoCommandAdded.connect(self.new_command)

    def new_command(self):
        if self.installing:
            return
        self.new_undo_command = True
        for anchor in self.anchors.values():
            anchor.history = {step: value for step, value in anchor.history.items() if step <= self.undo_step}

    def sync_anchors(self):
        buffer = self.window.controller.buffers.get(self.identifier)
        if buffer is None:
            return
        old = list(self.anchors.values())
        anchors = {}
        for key, entry in self.window.controller.navigation_entries(self.identifier):
            retained = next((anchor for anchor in old if anchor.entry is entry), None)
            if retained is not None:
                anchors[key] = retained
            elif (buffer.editable and not buffer.problem and not buffer.externally_changed
                  and entry.revision == self.revision):
                try:
                    self.window.controller._span_text(buffer.content, entry.start, entry.end, point=key == 'marker')
                except WorkspaceError:
                    continue
                anchors[key] = LiveRange(self, entry)
        self.anchors = anchors

    def set_wrap(self, enabled):
        option = self.defaultTextOption()
        option.setWrapMode(QTextOption.WrapMode.WrapAtWordBoundaryOrAnywhere if enabled else QTextOption.WrapMode.NoWrap)
        self.setDefaultTextOption(option)

    def refresh_views(self):
        self.refresh_timer.stop()
        # appendPlainText optimizes the initiating widget's range. Notify every
        # attached view once the document transaction has finished as well.
        layout = self.documentLayout()
        layout.documentSizeChanged.emit(layout.documentSize())
        for pane in self.window.panes:
            if pane.shown == self.identifier:
                pane.capture_position()

    def install(self, buffer):
        normalized = buffer.content.replace('\r\n', '\n').replace('\r', '\n')
        revision = sha256(buffer.content.encode('utf-8')).hexdigest()
        self.installing = True
        try:
            # Explicit replacement can change exact bytes without changing
            # Qt's normalized display (for example CRLF -> LF on Refresh).
            # Old navigation pins cannot follow that external replacement.
            if revision != self.revision:
                self.anchors = {}
            if self.toPlainText() != normalized:
                self.setPlainText(normalized)
                self.pane_cursors = []
                self.anchors = {}
                self.undo_step = self.availableUndoSteps()
                self.new_undo_command = False
            if not self.pane_cursors:
                for view in buffer.state.pane_views:
                    cursor = QTextCursor(self)
                    anchor = view.selection[1] if view.selection and view.cursor == view.selection[0] else (view.selection[0] if view.selection else view.cursor)
                    cursor.setPosition(document_position(self, anchor))
                    cursor.setPosition(document_position(self, view.cursor), QTextCursor.MoveMode.KeepAnchor)
                    self.pane_cursors.append(cursor)
            self.setModified(buffer.dirty)
            self.revision = revision
            self.sync_anchors()
        finally:
            self.installing = False

    def edited(self):
        if self.installing or self.identifier not in self.window.controller.buffers:
            return
        buffer = self.window.controller.buffer(self.identifier)
        if not buffer.editable:
            return
        try:
            text = preserve_newlines(buffer.content, self.toPlainText())
            if text == buffer.content:
                return
            step = self.availableUndoSteps()
            candidates = []
            collapsed = []
            for key, entry in self.window.controller.navigation_entries(self.identifier):
                anchor = self.anchors.get(key)
                span = None
                file_failure = self.window.anchor_errors.get(self.window.anchor_key(entry), False)
                if anchor and not buffer.problem and not buffer.externally_changed and not file_failure:
                    was_invalid = anchor.invalid
                    if not self.new_undo_command and step != self.undo_step and step in anchor.history:
                        anchor.restore(step)
                    if not anchor.point and anchor.start.position() >= anchor.end.position():
                        anchor.invalid = True
                    if anchor.invalid and not was_invalid:
                        collapsed.append(key)
                    if not anchor.invalid:
                        span = (document_index(self, anchor.start.position()), document_index(self, anchor.end.position()))
                candidates.append((key, entry, span))
            positions = [(document_index(self, cursor.position()),
                          [document_index(self, cursor.selectionStart()), document_index(self, cursor.selectionEnd())]
                          if cursor.hasSelection() else None) for cursor in self.pane_cursors]
            revision = sha256(text.encode('utf-8')).hexdigest()
            self.window.controller.edit(self.identifier, text, pane_positions=positions,
                                        anchor_positions=candidates, revision=revision, collapsed=collapsed)
            self.revision = revision
            self.undo_step = step
            self.new_undo_command = False
            for key, entry in self.window.controller.navigation_entries(self.identifier):
                if key in self.anchors:
                    anchor = self.anchors[key]
                    anchor.entry = entry
                    if entry.revision != revision:
                        anchor.invalid = True
                    anchor.remember(step)
            self.setModified(buffer.dirty)
        except (ValueError, OSError) as exc:
            self.installing = True
            try:
                self.undo()
                for anchor in self.anchors.values():
                    if self.undo_step in anchor.history:
                        anchor.restore(self.undo_step)
                self.new_undo_command = False
            finally:
                self.installing = False
            self.window.show_error(str(exc))
        for pane in self.window.panes:
            if pane.shown == self.identifier:
                pane.capture_position()
        self.window.schedule_checkpoint()
        self.refresh_timer.start(0)
        self.window.update_actions()
        self.window.mark_pdf_dirty()


class EditorPane(QWidget):
    def __init__(self, window, number):
        super().__init__()
        self.window, self.number = window, number
        self.shown = None
        self.loading = False
        self.center_on_next_show = False
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        self.chooser = QComboBox()
        self.chooser.setMinimumContentsLength(12)
        self.chooser.setSizeAdjustPolicy(QComboBox.SizeAdjustPolicy.AdjustToMinimumContentsLengthWithIcon)
        self.chooser.setAccessibleName(f'Document in pane {number + 1}')
        layout.addWidget(self.chooser)
        self.notice = QLabel('Open a project directory to begin.')
        self.notice.setWordWrap(True)
        self.notice.setTextFormat(Qt.TextFormat.PlainText)
        layout.addWidget(self.notice)
        self.review_bar = QWidget()
        review = QHBoxLayout(self.review_bar)
        review.setContentsMargins(0, 0, 0, 0)
        self.passage = QSpinBox()
        self.passage.setRange(1, 10000000)
        self.passage.setPrefix('# ')
        self.passage.setAccessibleName('Visible passage number')
        review.addWidget(self.passage)
        for label, mode in (('Passage', 'passage'), ('Index', 'index'), ('Full', 'full')):
            button = QPushButton(label)
            button.clicked.connect(lambda _checked=False, mode=mode: self.review(mode))
            review.addWidget(button)
        layout.addWidget(self.review_bar)
        self.retain = QPushButton('Retain displayed exact passage…')
        self.retain.clicked.connect(lambda: window.retain_passage(self))
        layout.addWidget(self.retain)
        self.text = SourceEdit(self)
        self.display_document = QTextDocument(self)
        self.display_document.setDocumentLayout(QPlainTextDocumentLayout(self.display_document))
        self.text.setDocument(self.display_document)
        layout.addWidget(self.text, 1)
        self.chooser.currentIndexChanged.connect(self.choose)
        self.text.cursorPositionChanged.connect(self.capture_position)
        self.text.selectionChanged.connect(self.capture_position)
        self.text.selectionChanged.connect(window.update_context_actions)
        self.text.verticalScrollBar().valueChanged.connect(self.capture_position)
        self.text.horizontalScrollBar().valueChanged.connect(self.capture_position)
        self.text.focused.connect(self.focused)
        self.review_bar.hide()
        self.retain.hide()
        self.text.setReadOnly(True)

    def choices(self):
        with QSignalBlocker(self.chooser):
            self.chooser.clear()
            for identifier in self.window.controller.buffers:
                self.chooser.addItem(self.window.buffer_name(identifier), identifier)
            self.chooser.setCurrentIndex(self.chooser.findData(self.shown))

    def choose(self, index):
        if not self.loading and index >= 0:
            self.window.select(self.chooser.itemData(index), self.number)

    def focused(self):
        if not self.loading and self.shown and self.window.controller.workspace:
            state = self.window.controller.current()
            if (state.active, state.active_pane) != (self.shown, self.number):
                self.window.controller.activate(self.shown, self.number)
            self.window.update_context()
            self.window.update_actions()

    def capture_position(self, *_):
        if not self.genuine_content() or not self.isVisible() or self.window.view_updates or self.text.reflow or self.text.restored_scroll or self.text.settling:
            return
        buffer = self.window.controller.buffer(self.shown)
        state = self.window.controller.current()
        if state.visible[self.number] != self.shown or (self.number == 1 and not state.split):
            return
        cursor = self.text.textCursor()
        self.window.documents[self.shown].pane_cursors[self.number] = QTextCursor(cursor)
        selection = [cursor_index(self.text, cursor.selectionStart()), cursor_index(self.text, cursor.selectionEnd())] if cursor.hasSelection() else None
        vertical, horizontal = self.text.verticalScrollBar(), self.text.horizontalScrollBar()
        self.window.controller.set_position(self.shown, pane=self.number, cursor=cursor_index(self.text, cursor.position()), selection=selection,
            yscroll=vertical.value() / max(1, vertical.maximum()), xscroll=horizontal.value() / max(1, horizontal.maximum()))
        self.window.schedule_checkpoint()
        self.text.remember_view()

    def genuine_content(self):
        buffer = self.window.controller.buffers.get(self.shown)
        return bool(not self.loading and buffer and buffer.has_content
                    and self.text.document() is self.window.documents.get(self.shown))

    def show_buffer(self, identifier, *, force=False):
        if identifier == self.shown and not force:
            self.choices()
            return
        centered = False
        self.loading = True
        self.window.view_updates += 1
        self.shown = identifier
        try:
            buffer = self.window.controller.buffer(identifier) if identifier else None
            response = buffer is not None and buffer.state.format == 'model_call'
            self.review_bar.setVisible(response)
            self.retain.setVisible(response)
            if buffer is None:
                text = 'Open Project Directory, then select an ordinary mathematical file.'
                self.text.setReadOnly(True)
            elif not buffer.loaded:
                text = 'Loading this document…'
                self.text.setReadOnly(True)
                self.window.load_buffer(identifier)
            else:
                text = buffer.content if not buffer.problem or buffer.recovery_warning else 'Document unavailable\n\n' + bounded_safe_diagnostic(buffer.problem)
                self.text.setReadOnly(not buffer.editable)
            with QSignalBlocker(self.text):
                if buffer and buffer.has_content:
                    document = self.window.documents.get(identifier)
                    if document is None:
                        document = self.window.documents[identifier] = BufferDocument(self.window, identifier, self.text.font())
                    document.install(buffer)
                else:
                    document = self.display_document
                    document.setPlainText(text)
                if self.text.document() is not document:
                    self.text.attach_document(document)
                # blockCountChanged is suppressed while installing text. Set
                # the final gutter width before restoring either scrollbar.
                self.text.layout_gutter()
                self.text.document().setModified(bool(buffer and buffer.dirty))
                if buffer and buffer.has_content:
                    view = buffer.state.pane_views[self.number]
                    cursor = self.text.textCursor()
                    if view.selection:
                        start, end = view.selection
                        # Qt keeps the active end at the cursor, including a
                        # backwards selection whose active end is its start.
                        anchor = end if view.cursor == start else start
                        cursor.setPosition(qt_position(self.text, anchor))
                        cursor.setPosition(qt_position(self.text, view.cursor), QTextCursor.MoveMode.KeepAnchor)
                    else:
                        cursor.setPosition(qt_position(self.text, view.cursor))
                    self.text.setTextCursor(cursor)
                    document.pane_cursors[self.number] = QTextCursor(cursor)
                    if self.center_on_next_show:
                        self.text.centerCursor()
                        self.center_on_next_show = False
                        centered = True
                    else:
                        self.text.verticalScrollBar().setValue(round(view.yscroll * self.text.verticalScrollBar().maximum()))
                        self.text.horizontalScrollBar().setValue(round(view.xscroll * self.text.horizontalScrollBar().maximum()))
                        self.text.restore_scroll(view)
                if response:
                    self.passage.setValue(buffer.state.review_number)
                    self.retain.setEnabled(buffer.state.review_mode == 'passage' and not buffer.problem)
            self.notice.setText(buffer.status + (' · ' + buffer.recovery_warning if buffer.recovery_warning else '') if buffer else 'No file selected')
            self.choices()
        finally:
            self.loading = False
            self.window.view_updates -= 1
        self.window.normalize_editor_widths()
        self.text.remember_view()
        if centered:
            self.capture_position()

    def review(self, mode):
        self.window.perform(lambda: self.window.controller.review_response(self.shown, mode, self.passage.value()))
        for pane in self.window.panes:
            if pane.isVisible() and pane.shown == self.shown:
                pane.show_buffer(self.shown, force=True)
        self.window.update_context()


class LocalPdfView(QPdfView):
    """Read-only local pages. Document links do not dispatch external actions."""
    focused = Signal()

    def focusInEvent(self, event):
        super().focusInEvent(event)
        self.focused.emit()

    def mousePressEvent(self, event):
        event.accept()

    def mouseReleaseEvent(self, event):
        event.accept()

    def mouseDoubleClickEvent(self, event):
        event.accept()


class PdfPane(QWidget):
    def __init__(self, window):
        super().__init__()
        self.window = window
        self.loading = False
        self.kind = None
        self.report = None
        self.imported = None
        self.device = None
        self.document = QPdfDocument(self)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        tools = QHBoxLayout()
        for label, operation in (('Previous', lambda: self.goto(self.page.value() - 1)), ('Next', lambda: self.goto(self.page.value() + 1))):
            button = QPushButton(label)
            button.clicked.connect(operation)
            tools.addWidget(button)
            setattr(self, 'previous_button' if label == 'Previous' else 'next_button', button)
        self.page = QSpinBox()
        self.page.setPrefix('Page ')
        self.page.setRange(1, 1)
        self.page.setKeyboardTracking(False)
        self.page.valueChanged.connect(self.goto)
        tools.addWidget(self.page)
        self.total = QLabel('/ 0')
        tools.addWidget(self.total)
        tools.addStretch()
        layout.addLayout(tools)
        zoom_row = QHBoxLayout()
        self.zoom = QComboBox()
        for label, value in (('Fit width', 'width'), ('Fit page', 'page'), ('Custom zoom', 'custom')):
            self.zoom.addItem(label, value)
        self.zoom.currentIndexChanged.connect(self.zoom_changed)
        zoom_row.addWidget(self.zoom, 1)
        for label, factor in (('−', 1 / 1.2), ('+', 1.2)):
            button = QPushButton(label)
            button.setAccessibleName('Zoom out' if factor < 1 else 'Zoom in')
            button.setFixedWidth(36)
            button.clicked.connect(lambda _checked=False, factor=factor: self.scale(factor))
            zoom_row.addWidget(button)
        reload_button = QPushButton('Reload')
        reload_button.setMaximumWidth(70)
        reload_button.clicked.connect(lambda: window.reload_pdf())
        zoom_row.addWidget(reload_button)
        layout.addLayout(zoom_row)
        self.notice = QLabel('No PDF selected. Open an existing PDF or build trusted LaTeX explicitly.')
        self.notice.setWordWrap(True)
        self.notice.setTextFormat(Qt.TextFormat.PlainText)
        layout.addWidget(self.notice)
        self.problem = QLabel('')
        self.problem.setWordWrap(True)
        self.problem.setTextFormat(Qt.TextFormat.PlainText)
        self.problem.setStyleSheet('color: #9c381c;')
        self.problem.hide()
        layout.addWidget(self.problem)
        self.view = LocalPdfView()
        self.view.setAccessibleName('Read-only local PDF')
        self.view.setFocusPolicy(Qt.FocusPolicy.StrongFocus)
        self.view.setDocument(self.document)
        self.view.setPageMode(QPdfView.PageMode.SinglePage)
        self.view.setZoomMode(QPdfView.ZoomMode.FitToWidth)
        self.view.pageNavigator().currentPageChanged.connect(self.page_changed)
        self.view.zoomFactorChanged.connect(lambda *_: self.capture())
        self.view.focused.connect(window.update_actions)
        layout.addWidget(self.view, 1)

    def prepare_document(self, raw):
        """Validate with Qt before replacing either reading state or view."""
        device = QBuffer(self)
        device.setData(QByteArray(raw))
        device.open(QIODevice.OpenModeFlag.ReadOnly)
        document = QPdfDocument(self)
        document.load(device)
        if document.status() == QPdfDocument.Status.Error or document.pageCount() < 1:
            document.close()
            device.close()
            document.deleteLater()
            device.deleteLater()
            raise WorkspaceError('QtPdf could not render this local PDF; the work note and previous reading state were retained')
        return document, device

    @staticmethod
    def _position(reference):
        return reference.page, reference.zoom, reference.scale

    def commit_document(self, prepared, *, kind, position, report=None, imported=None, stale=()):
        document, device = prepared
        self.loading = True
        old_document, old_device = self.document, self.device
        try:
            self.document, self.device = document, device
            self.kind, self.report, self.imported = kind, report, imported
            self.view.setDocument(document)
            count = document.pageCount()
            self.page.setRange(1, max(1, count))
            self.total.setText(f'/ {count}')
            page, zoom, scale = position
            self.zoom.setCurrentIndex(self.zoom.findData(zoom))
            self.view.setZoomFactor(scale)
            self.zoom_changed()
            self.goto(min(page + 1, max(1, count)))
            if kind == 'generated':
                self.set_stale(stale)
            else:
                self.set_imported()
            self.set_failure('')
        finally:
            self.loading = False
        if old_document is not document:
            old_document.close()
            old_document.deleteLater()
        if old_device is not None and old_device is not device:
            old_device.close()
            old_device.deleteLater()
        self.capture()

    def show_snapshot(self, snapshot):
        """Show the retained output of a successful explicit build."""
        report, raw, stale = snapshot
        try:
            prepared = self.prepare_document(raw)
            self.window.controller.accept_generated_pdf(report)
            state = self.window.controller.current()
            self.commit_document(prepared, kind='generated', report=report, stale=stale,
                                 position=(state.pdf_page, state.pdf_zoom, state.pdf_scale))
        except (OSError, ValueError) as exc:
            self.set_failure(str(exc))
            if 'prepared' in locals():
                prepared[0].close()
                prepared[1].close()
            raise

    def show_imported_snapshot(self, snapshot):
        try:
            prepared = self.prepare_document(snapshot.raw)
            reference = self.window.controller.accept_imported_pdf(snapshot)
            self.commit_document(prepared, kind='imported', imported=reference,
                                 position=self._position(reference))
        except (OSError, ValueError) as exc:
            self.set_failure(str(exc))
            if 'prepared' in locals():
                prepared[0].close()
                prepared[1].close()
            raise

    def set_imported(self):
        if self.kind != 'imported' or self.imported is None:
            return
        path = Path(self.imported.path)
        self.notice.setText(path.name + ' · Imported local PDF · read-only · PDF search unavailable in R1.')
        self.notice.setToolTip(str(path) + '\nSHA-256: ' + self.imported.revision)
        self.notice.setStyleSheet('color: #34475a;')

    def set_failure(self, message):
        self.problem.setText(message)
        self.problem.setVisible(bool(message))

    def clear(self):
        self.loading = True
        try:
            old_document = self.document
            self.document = QPdfDocument(self)
            self.view.setDocument(self.document)
            old_document.close()
            old_document.deleteLater()
            if self.device:
                self.device.close()
                self.device.deleteLater()
            self.device = None
            self.kind = self.report = self.imported = None
            self.page.setRange(1, 1)
            self.page.setValue(1)
            self.total.setText('/ 0')
            self.notice.setText('No PDF selected. Open an existing PDF or build trusted LaTeX explicitly.')
            self.notice.setToolTip('')
            self.notice.setStyleSheet('')
            self.set_failure('')
        finally:
            self.loading = False

    def set_stale(self, paths):
        if self.kind != 'generated' or not self.report:
            return
        message = ('STALE · input revisions changed. Last successful output retained.' if paths
                   else 'Recorded project inputs unchanged.')
        message += ' Dependency coverage: ' + self.report.get('dependency_coverage', 'unknown') + '.'
        self.notice.setText(Path(self.report['tex_root']).name + ' · ' + message)
        self.notice.setToolTip('\n'.join(paths))
        self.notice.setStyleSheet('color: #9c381c;' if paths else 'color: #34475a;')

    def goto(self, page):
        page = max(1, min(self.document.pageCount(), page))
        self.view.pageNavigator().jump(page - 1, QPointF(0, 0))
        with QSignalBlocker(self.page):
            self.page.setValue(page)
        self.capture()

    def page_changed(self, page):
        with QSignalBlocker(self.page):
            self.page.setValue(page + 1)
        self.capture()

    def zoom_changed(self, *_):
        mode = {'width': QPdfView.ZoomMode.FitToWidth, 'page': QPdfView.ZoomMode.FitInView, 'custom': QPdfView.ZoomMode.Custom}[self.zoom.currentData()]
        self.view.setZoomMode(mode)
        self.capture()

    def scale(self, factor):
        self.zoom.setCurrentIndex(self.zoom.findData('custom'))
        self.view.setZoomFactor(max(0.1, min(8, self.view.zoomFactor() * factor)))
        self.zoom.setItemText(self.zoom.findData('custom'), f'Zoom {self.view.zoomFactor():.0%}')
        self.capture()

    def capture(self):
        if self.loading or self.kind not in ('generated', 'imported') or not self.window.controller.workspace:
            return
        self.previous_button.setEnabled(self.page.value() > 1)
        self.next_button.setEnabled(self.page.value() < self.document.pageCount())
        self.window.controller.set_pdf_view(page=self.page.value() - 1, zoom=self.zoom.currentData(),
            scale=max(0.1, min(8, self.view.zoomFactor())),
            visible=self.window.controller.current().pdf_visible, source=self.kind)
        if self.kind == 'imported':
            self.imported = self.window.controller.current().imported_pdf
        self.window.schedule_checkpoint()


class AssistancePanel(QWidget):
    """One non-modal, explicitly previewed mathematical-assistance exchange."""

    def __init__(self, window):
        super().__init__()
        self.window = window
        self.contexts = []
        self.target = None
        self.prepared = None
        self.outcome = None
        self.parent = None
        self.parent_passage_numbers = []
        self.parent_passages = []
        self.in_flight = False
        self.installing = False

        layout = QVBoxLayout(self)
        heading = QLabel(
            'Ask one question about text you explicitly select. Nothing is sent '
            'until you inspect the exact preview and choose Send.'
        )
        heading.setWordWrap(True)
        heading.setTextFormat(Qt.TextFormat.PlainText)
        layout.addWidget(heading)

        provider_row = QHBoxLayout()
        provider_row.addWidget(QLabel('Provider: OpenAI'))
        provider_row.addWidget(QLabel('Requested model:'))
        self.model = QLineEdit(os.environ.get(ASSISTANCE_MODEL_ENV, ''))
        self.model.setPlaceholderText(f'Set here or with {ASSISTANCE_MODEL_ENV}')
        self.model.setAccessibleName('Requested OpenAI model')
        provider_row.addWidget(self.model, 1)
        layout.addLayout(provider_row)

        continuation_actions = QHBoxLayout()
        self.load_parent_button = QPushButton('Continue retained answer…')
        self.load_parent_button.setAccessibleName(
            'Select completed parent ModelCall for one continuation'
        )
        self.load_parent_button.clicked.connect(
            lambda: window.perform(window.load_continuation_parent)
        )
        continuation_actions.addWidget(self.load_parent_button)
        self.resume_button = QPushButton('Resume saved investigation')
        self.resume_button.clicked.connect(
            lambda: window.perform(window.resume_investigation)
        )
        self.resume_button.setEnabled(False)
        continuation_actions.addWidget(self.resume_button)
        layout.addLayout(continuation_actions)

        self.continuation_widget = QWidget()
        continuation_layout = QVBoxLayout(self.continuation_widget)
        continuation_layout.setContentsMargins(0, 0, 0, 0)
        self.parent_attribution = QLabel('')
        self.parent_attribution.setWordWrap(True)
        self.parent_attribution.setTextFormat(Qt.TextFormat.PlainText)
        self.parent_attribution.setSizePolicy(
            QSizePolicy.Policy.Ignored, QSizePolicy.Policy.Preferred
        )
        continuation_layout.addWidget(self.parent_attribution)
        parent_select = QHBoxLayout()
        self.parent_passage = QSpinBox()
        self.parent_passage.setRange(1, 1)
        self.parent_passage.setPrefix('Prior passage ')
        self.parent_passage.setAccessibleName('Prior response passage number')
        parent_select.addWidget(self.parent_passage)
        self.add_parent_passage_button = QPushButton('Add exact prior passage')
        self.add_parent_passage_button.clicked.connect(
            lambda: window.perform(self.add_parent_passage)
        )
        parent_select.addWidget(self.add_parent_passage_button)
        continuation_layout.addLayout(parent_select)
        self.parent_passage_list = QListWidget()
        self.parent_passage_list.setAccessibleName(
            'Selected exact prior response passages'
        )
        self.parent_passage_list.setWordWrap(True)
        self.parent_passage_list.setHorizontalScrollBarPolicy(
            Qt.ScrollBarPolicy.ScrollBarAlwaysOff
        )
        self.parent_passage_list.setMaximumHeight(82)
        self.parent_passage_list.currentRowChanged.connect(
            self.show_parent_passage
        )
        continuation_layout.addWidget(self.parent_passage_list)
        self.remove_parent_passage_button = QPushButton('Remove prior passage')
        self.remove_parent_passage_button.clicked.connect(
            lambda: window.perform(self.remove_parent_passage)
        )
        self.remove_parent_passage_button.setEnabled(False)
        continuation_layout.addWidget(self.remove_parent_passage_button)
        self.parent_passage_text = QPlainTextEdit()
        self.parent_passage_text.setReadOnly(True)
        self.parent_passage_text.setAccessibleName(
            'Exact selected prior response text'
        )
        self.parent_passage_text.setMaximumHeight(120)
        continuation_layout.addWidget(self.parent_passage_text)
        continuation_layout.addWidget(QLabel(
            'Human correction / changed assumption / alternative (ordinary work):'
        ))
        self.correction = QPlainTextEdit()
        self.correction.setAccessibleName(
            'Human correction or changed assumption'
        )
        self.correction.setMaximumHeight(82)
        continuation_layout.addWidget(self.correction)
        continuation_layout.addWidget(QLabel('Last useful conclusion (human-maintained):'))
        self.last_conclusion = QPlainTextEdit()
        self.last_conclusion.setAccessibleName('Last useful conclusion')
        self.last_conclusion.setMaximumHeight(72)
        continuation_layout.addWidget(self.last_conclusion)
        continuation_layout.addWidget(QLabel('Unresolved issue (human-maintained):'))
        self.unresolved_issue = QPlainTextEdit()
        self.unresolved_issue.setAccessibleName('Unresolved issue')
        self.unresolved_issue.setMaximumHeight(72)
        continuation_layout.addWidget(self.unresolved_issue)
        summary_buttons = QHBoxLayout()
        self.save_summary_button = QPushButton('Save task summary')
        self.save_summary_button.clicked.connect(
            lambda: window.perform(self.save_summary)
        )
        self.save_summary_button.setEnabled(False)
        summary_buttons.addWidget(self.save_summary_button)
        self.insert_handoff_button = QPushButton('Insert task handoff into note')
        self.insert_handoff_button.clicked.connect(
            lambda: window.perform(self.insert_handoff)
        )
        self.insert_handoff_button.setEnabled(False)
        summary_buttons.addWidget(self.insert_handoff_button)
        continuation_layout.addLayout(summary_buttons)
        self.continuation_widget.hide()
        layout.addWidget(self.continuation_widget)

        context_label = QLabel(
            'Explicit selected ordinary text (PDF bytes, hidden buffers, history, '
            'and unselected note text are not included):'
        )
        context_label.setWordWrap(True)
        context_label.setTextFormat(Qt.TextFormat.PlainText)
        layout.addWidget(context_label)
        self.context_list = QListWidget()
        self.context_list.setAccessibleName('Assistance selected contexts')
        self.context_list.setWordWrap(True)
        self.context_list.setHorizontalScrollBarPolicy(
            Qt.ScrollBarPolicy.ScrollBarAlwaysOff
        )
        self.context_list.setMaximumHeight(92)
        self.context_list.currentRowChanged.connect(self.show_context)
        layout.addWidget(self.context_list)
        context_buttons = QHBoxLayout()
        self.add_context_button = QPushButton('Add current selection')
        self.add_context_button.clicked.connect(
            lambda: window.perform(window.ask_about_selection)
        )
        context_buttons.addWidget(self.add_context_button)
        self.remove_context_button = QPushButton('Remove context')
        self.remove_context_button.setAccessibleName('Remove selected assistance context')
        self.remove_context_button.clicked.connect(
            lambda: window.perform(self.remove_context)
        )
        self.remove_context_button.setEnabled(False)
        context_buttons.addWidget(self.remove_context_button)
        layout.addLayout(context_buttons)
        self.context_text = QPlainTextEdit()
        self.context_text.setReadOnly(True)
        self.context_text.setAccessibleName('Exact selected context text')
        self.context_text.setMaximumHeight(105)
        layout.addWidget(self.context_text)

        layout.addWidget(QLabel('One natural-language mathematical question:'))
        self.question = QPlainTextEdit()
        self.question.setAccessibleName('Mathematical assistance question')
        self.question.setPlaceholderText(
            'For example: What is the governing idea here, and which step needs justification?'
        )
        self.question.setMaximumHeight(100)
        layout.addWidget(self.question)
        request_buttons = QGridLayout()
        self.preview_button = QPushButton('Preview exact request')
        self.preview_button.clicked.connect(
            lambda: window.perform(self.prepare_request)
        )
        request_buttons.addWidget(self.preview_button, 0, 0)
        self.send_button = QPushButton('Send exact preview')
        self.send_button.setAccessibleName('Send exact assistance preview')
        self.send_button.clicked.connect(
            lambda: window.perform(self.send_request)
        )
        self.send_button.setEnabled(False)
        request_buttons.addWidget(self.send_button, 0, 1)
        self.dismiss_button = QPushButton('Cancel / dismiss')
        self.dismiss_button.clicked.connect(self.dismiss)
        request_buttons.addWidget(self.dismiss_button, 1, 0, 1, 2)
        layout.addLayout(request_buttons)

        self.status = QLabel('No request has been prepared.')
        self.status.setWordWrap(True)
        self.status.setTextFormat(Qt.TextFormat.PlainText)
        layout.addWidget(self.status)
        self.preview_text = QPlainTextEdit()
        self.preview_text.setReadOnly(True)
        self.preview_text.setAccessibleName('Exact assistance request preview')
        self.preview_text.setPlaceholderText(
            'Provider, model, question, context, limits, disclosure, destination, '
            'and exact UTF-8 request body will appear here.'
        )
        self.preview_text.setMinimumHeight(180)
        layout.addWidget(self.preview_text)

        self.answer_attribution = QLabel('')
        self.answer_attribution.setWordWrap(True)
        self.answer_attribution.setTextFormat(Qt.TextFormat.PlainText)
        # ModelCall paths and identities are intentionally exact and can be one
        # long token.  They must wrap inside the dock rather than setting its
        # minimum width and squeezing the mathematical work out of view.
        self.answer_attribution.setSizePolicy(
            QSizePolicy.Policy.Ignored, QSizePolicy.Policy.Preferred
        )
        layout.addWidget(self.answer_attribution)
        self.answer_notice = QLabel(
            'Model prose and any markup, URLs, citations, code, or mathematical '
            'claims are inert plain text and remain unverified.'
        )
        self.answer_notice.setWordWrap(True)
        self.answer_notice.setTextFormat(Qt.TextFormat.PlainText)
        self.answer_notice.hide()
        layout.addWidget(self.answer_notice)
        self.continue_current_button = QPushButton(
            'Continue this answer once…'
        )
        self.continue_current_button.setAccessibleName(
            'Continue this completed answer once'
        )
        self.continue_current_button.clicked.connect(
            lambda: window.perform(self.continue_current_answer)
        )
        self.continue_current_button.hide()
        layout.addWidget(self.continue_current_button)
        self.answer = QPlainTextEdit()
        self.answer.setReadOnly(True)
        self.answer.setAccessibleName('Readable inert model response')
        self.answer.setMinimumHeight(170)
        self.answer.hide()
        layout.addWidget(self.answer)

        passage_row = QHBoxLayout()
        self.passage = QSpinBox()
        self.passage.setRange(1, 1)
        self.passage.setPrefix('Passage ')
        self.passage.setAccessibleName('Assistance response passage number')
        passage_row.addWidget(self.passage)
        self.show_passage_button = QPushButton('Show exact passage')
        self.show_passage_button.clicked.connect(
            lambda: window.perform(self.show_passage)
        )
        passage_row.addWidget(self.show_passage_button)
        layout.addLayout(passage_row)
        self.passage_text = QPlainTextEdit()
        self.passage_text.setReadOnly(True)
        self.passage_text.setAccessibleName('Exact selected response passage')
        self.passage_text.setMaximumHeight(130)
        self.passage_text.hide()
        layout.addWidget(self.passage_text)
        use_row = QGridLayout()
        self.retain_button = QPushButton('Retain exact passage…')
        self.retain_button.clicked.connect(
            lambda: window.perform(self.retain_passage)
        )
        use_row.addWidget(self.retain_button, 0, 0)
        self.copy_button = QPushButton('Copy attributed text')
        self.copy_button.setAccessibleName('Copy attributed assistance contribution')
        self.copy_button.clicked.connect(
            lambda: window.perform(self.copy_contribution)
        )
        use_row.addWidget(self.copy_button, 0, 1)
        self.insert_button = QPushButton('Insert into active note')
        self.insert_button.setAccessibleName(
            'Insert attributed assistance copy into active note'
        )
        self.insert_button.clicked.connect(
            lambda: window.perform(self.insert_contribution)
        )
        use_row.addWidget(self.insert_button, 1, 0, 1, 2)
        layout.addLayout(use_row)

        self.record_toggle = QPushButton('Show exact retained ModelCall record')
        self.record_toggle.setCheckable(True)
        self.record_toggle.toggled.connect(self.toggle_record)
        self.record_toggle.hide()
        layout.addWidget(self.record_toggle)
        self.raw_record = QPlainTextEdit()
        self.raw_record.setReadOnly(True)
        self.raw_record.setAccessibleName('Exact retained ModelCall record')
        self.raw_record.setMinimumHeight(180)
        self.raw_record.hide()
        layout.addWidget(self.raw_record)
        layout.addStretch()

        self.question.textChanged.connect(self.draft_changed)
        self.model.textChanged.connect(self.draft_changed)
        self.correction.textChanged.connect(self.draft_changed)
        self.last_conclusion.textChanged.connect(self.draft_changed)
        self.unresolved_issue.textChanged.connect(self.draft_changed)
        self._set_response_controls(False)

    def _set_response_controls(self, enabled):
        for widget in (self.passage, self.show_passage_button, self.retain_button,
                       self.copy_button, self.insert_button):
            widget.setEnabled(enabled)

    def _set_draft_controls(self, enabled):
        for widget in (self.model, self.context_list, self.add_context_button,
                       self.remove_context_button, self.question,
                       self.preview_button):
            widget.setEnabled(enabled)
        self.load_parent_button.setEnabled(enabled)
        continuation_enabled = enabled and self.parent is not None
        for widget in (self.parent_passage, self.add_parent_passage_button,
                       self.parent_passage_list, self.remove_parent_passage_button,
                       self.correction, self.last_conclusion,
                       self.unresolved_issue):
            widget.setEnabled(continuation_enabled)
        self.dismiss_button.setEnabled(enabled)

    def draft_changed(self, *_):
        if self.installing or self.in_flight:
            return
        if self.outcome is not None:
            if self.parent is not None and self.window.controller.workspace:
                self.save_summary_button.setEnabled(
                    self.window.controller.current().investigation is not None
                )
            return
        self.prepared = None
        self.send_button.setEnabled(False)
        if self.preview_text.toPlainText():
            self.preview_text.clear()
        self.status.setText(
            'Draft changed. Preview the complete exact request before Send.'
        )

    def install_parent(self, parent, *, passages=(), question='', correction='',
                       last_conclusion='', unresolved_issue=''):
        """Enter the one-parent/one-child continuation mode."""
        if self.in_flight:
            raise WorkspaceError('Wait for the in-flight request to finish')
        self.reset()
        self.installing = True
        try:
            self.parent = parent
            self.parent_passages = list(passages)
            self.parent_passage_numbers = [item.number for item in passages]
            self.parent_attribution.setText('\n'.join((
                f'Completed parent ModelCall: {parent.call.id}',
                f'Provider / model: {parent.call.provider} / {parent.call.model}',
                f'Response SHA-256: {parent.call.raw_response_digest}',
                f'Retained record: {parent.path}',
                'Prior text remains an attributed, unverified model proposal.',
            )))
            count = passage_count(parent.call.raw_response)
            self.parent_passage.setRange(1, max(1, count))
            self.continuation_widget.show()
            self.question.setPlainText(question)
            self.correction.setPlainText(correction)
            self.last_conclusion.setPlainText(last_conclusion)
            self.unresolved_issue.setPlainText(unresolved_issue)
            self.refresh_parent_passages()
            self.status.setText(
                'Continuation draft loaded. Add one or more exact prior passages, '
                'write the follow-up and any human correction, then inspect a new '
                'complete preview. No provider conversation state is used.'
            )
        finally:
            self.installing = False
        self._set_draft_controls(True)
        self.remove_parent_passage_button.setEnabled(
            bool(self.parent_passage_numbers)
        )
        self.question.setFocus()

    def refresh_parent_passages(self, selected=0):
        if self.parent is not None and self.parent_passage_numbers:
            self.parent, passages = self.window.controller.select_investigation_passages(
                self.parent, tuple(self.parent_passage_numbers)
            )
            self.parent_passages = list(passages)
        elif not self.parent_passage_numbers:
            self.parent_passages = []
        with QSignalBlocker(self.parent_passage_list):
            self.parent_passage_list.clear()
            for passage in self.parent_passages:
                preview = ' '.join(passage.text.split())[:90]
                self.parent_passage_list.addItem(
                    f'Passage {passage.number} · UTF-8 bytes '
                    f'[{passage.start_byte}, {passage.end_byte}) · {preview}'
                )
            if self.parent_passages:
                self.parent_passage_list.setCurrentRow(
                    min(max(0, selected), len(self.parent_passages) - 1)
                )
        self.show_parent_passage(self.parent_passage_list.currentRow())
        self.remove_parent_passage_button.setEnabled(
            bool(self.parent_passages) and not self.in_flight
        )

    def show_parent_passage(self, row):
        if 0 <= row < len(self.parent_passages):
            passage = self.parent_passages[row]
            self.parent_passage_text.setPlainText(
                f'Exact prior response UTF-8 bytes '
                f'[{passage.start_byte}, {passage.end_byte})\n\n'
                + passage.text
            )
            self.parent_passage_text.moveCursor(QTextCursor.MoveOperation.Start)
        else:
            self.parent_passage_text.setPlainText(
                'No prior response passage selected. At least one exact passage is '
                'required for a linked continuation.'
            )

    def add_parent_passage(self):
        if self.parent is None:
            raise WorkspaceError('Select a completed retained parent ModelCall first')
        number = self.parent_passage.value()
        if number not in self.parent_passage_numbers:
            self.parent_passage_numbers.append(number)
        self.refresh_parent_passages(
            self.parent_passage_numbers.index(number)
        )
        self.draft_changed()

    def remove_parent_passage(self):
        row = self.parent_passage_list.currentRow()
        if not 0 <= row < len(self.parent_passage_numbers):
            raise WorkspaceError('Select a prior passage to remove')
        del self.parent_passage_numbers[row]
        self.refresh_parent_passages(row)
        self.draft_changed()

    def continue_current_answer(self):
        if (self.parent is not None or not self.outcome or not self.outcome.terminal
                or self.outcome.terminal.status != 'completed'):
            raise WorkspaceError('No initial completed answer is available to continue')
        self.window.load_continuation_parent(self.outcome.path)

    @staticmethod
    def context_key(context):
        return (context.source_identity, context.source_revision,
                context.start, context.end)

    def add_context(self, context):
        if self.in_flight:
            raise WorkspaceError('Wait for the in-flight request to finish')
        if self.outcome is not None:
            self.reset()
        if self.target is None:
            self.target = context
        key = self.context_key(context)
        existing = next((index for index, old in enumerate(self.contexts)
                         if self.context_key(old) == key), None)
        if existing is None:
            if len(self.contexts) >= MAX_ASSISTANCE_CONTEXTS:
                raise WorkspaceError(
                    f'At most {MAX_ASSISTANCE_CONTEXTS} selected contexts can be sent'
                )
            self.contexts.append(context)
            self.refresh_contexts(len(self.contexts) - 1)
        else:
            self.refresh_contexts(existing)
        self.draft_changed()
        self.status.setText(
            'Selected context is frozen exactly as displayed. Write one question, '
            'then preview; remove any context you do not want transmitted.'
        )

    def refresh_contexts(self, selected=0):
        with QSignalBlocker(self.context_list):
            self.context_list.clear()
            for number, context in enumerate(self.contexts, 1):
                name = Path(context.source_path).name if context.source_path else 'Untitled work buffer'
                preview = ' '.join(context.text.split())[:80]
                self.context_list.addItem(
                    f'{number}. {name} · {displayed_position(context.start)}–'
                    f'{displayed_position(context.end)} · {context.state} · {preview}'
                )
            if self.contexts:
                self.context_list.setCurrentRow(
                    min(max(0, selected), len(self.contexts) - 1)
                )
        self.show_context(self.context_list.currentRow())
        self.remove_context_button.setEnabled(bool(self.contexts) and not self.in_flight)

    def show_context(self, row):
        if 0 <= row < len(self.contexts):
            context = self.contexts[row]
            saved = context.saved_revision or 'none (untitled)'
            self.context_text.setPlainText('\n'.join((
                f'Source identity: {context.source_identity}',
                f'Captured text SHA-256: {context.source_revision}',
                f'Saved/base SHA-256: {saved}',
                f'Scalar location: {context.start}–{context.end}',
                f'State: {context.state}',
                f'Exact text ({len(context.text)} scalars, '
                f'{len(context.text.encode("utf-8"))} UTF-8 bytes):',
                context.text,
            )))
        else:
            self.context_text.setPlainText(
                'No selected text. If sent, only the question and an explicit '
                'no-context notice will be transmitted.'
            )

    def remove_context(self):
        row = self.context_list.currentRow()
        if not 0 <= row < len(self.contexts):
            raise WorkspaceError('Select a context row to remove')
        del self.contexts[row]
        self.refresh_contexts(row)
        self.draft_changed()
        self.status.setText(
            'Context removed. Preview again to inspect the reduced exact request.'
        )

    def prepare_request(self):
        if self.parent is not None:
            prepared = self.window.controller.prepare_continuation(
                parent=self.parent,
                passage_numbers=tuple(self.parent_passage_numbers),
                contexts=tuple(self.contexts),
                question=self.question.toPlainText(),
                correction=self.correction.toPlainText(),
                last_conclusion=self.last_conclusion.toPlainText(),
                unresolved_issue=self.unresolved_issue.toPlainText(),
                model=self.model.text(),
            )
        else:
            if self.target is None:
                raise WorkspaceError('Add a visible ordinary-text selection first')
            prepared = self.window.controller.prepare_assistance(
                target=self.target,
                contexts=tuple(self.contexts),
                question=self.question.toPlainText(),
                model=self.model.text(),
            )
        self.prepared = prepared
        self.preview_text.setPlainText(prepared.preview)
        self.preview_text.moveCursor(QTextCursor.MoveOperation.Start)
        self.status.setText(
            'Preview frozen. Send is a separate action and authorizes exactly the '
            'displayed UTF-8 body once.'
        )
        self.send_button.setEnabled(True)

    def send_request(self):
        if self.prepared is None:
            raise WorkspaceError('Preview the exact request before Send')
        prepared = self.prepared
        api_key = os.environ.get('OPENAI_API_KEY', '')
        self.window.controller.begin_assistance(prepared, api_key)
        self.in_flight = True
        self._set_draft_controls(False)
        self.send_button.setEnabled(False)
        self.status.setText(
            'Sending one request off the GUI thread… No retry or follow-up will occur.'
        )
        def accepted(transmission):
            try:
                outcome = self.window.controller.accept_assistance(
                    prepared, transmission
                )
            except Exception:
                self.in_flight = False
                self._set_draft_controls(True)
                raise
            self.in_flight = False
            self.outcome = outcome
            if prepared.continuation is not None and outcome.terminal is not None:
                try:
                    self.window.controller.retain_investigation(prepared, outcome)
                except (OSError, ValueError) as exc:
                    self.window.show_error(str(exc))
            self.show_outcome()
            QTimer.singleShot(0, self.scroll_to_outcome)
        def failed(error):
            self.window.controller.abandon_assistance(prepared)
            self.in_flight = False
            self._set_draft_controls(True)
            self.send_button.setEnabled(False)
            self.status.setText('The worker failed before a validated terminal outcome: ' + error)
        try:
            self.window.submit(
                lambda: self.window.controller.transmit_assistance(prepared, api_key),
                accepted,
                failed,
                background=True,
            )
        except Exception:
            self.window.controller.abandon_assistance(prepared)
            self.in_flight = False
            self._set_draft_controls(True)
            raise

    def show_outcome(self):
        outcome = self.outcome
        terminal = outcome.terminal if outcome else None
        self._set_draft_controls(False)
        self.dismiss_button.setEnabled(True)
        self.send_button.setEnabled(False)
        self.continue_current_button.setVisible(bool(
            terminal and terminal.status == 'completed' and self.parent is None
            and self.window.controller.current().investigation is None
        ))
        retained_investigation = bool(
            self.parent is not None and self.window.controller.workspace
            and self.window.controller.current().investigation is not None
        )
        self.save_summary_button.setEnabled(retained_investigation)
        self.insert_handoff_button.setEnabled(retained_investigation)
        if retained_investigation:
            for widget in (self.question, self.correction, self.last_conclusion,
                           self.unresolved_issue):
                widget.setEnabled(True)
        if outcome and outcome.raw_record is not None:
            self.raw_record.setPlainText(outcome.raw_record.decode('utf-8'))
            self.record_toggle.setVisible(True)
        else:
            self.raw_record.clear()
            self.record_toggle.hide()
        if terminal is None:
            self.status.setText(
                'No validated terminal ModelCall is available. No answer was inserted '
                'and the note was not changed.' + (f' {outcome.error}' if outcome and outcome.error else '')
            )
            self.answer_attribution.clear()
            self.answer.hide()
            self.answer_notice.hide()
            self._set_response_controls(False)
            return
        path = str(outcome.path)
        requested = terminal.requested_model
        resolved = terminal.resolved_model or 'not supplied'
        self.answer_attribution.setText('\n'.join((
            f'Terminal status: {terminal.status}',
            f'Provider: {terminal.provider}',
            f'Requested model: {requested}',
            f'Resolved model: {resolved}',
            f'ModelCall: {terminal.id}',
            f'Retained record: {path}',
        )))
        self.answer_notice.show()
        if terminal.status == 'completed':
            response = terminal.raw_response
            assert response is not None
            self.status.setText(
                'Completed attributed answer retained. The box below is a readable '
                'inert plain-text presentation; the exact raw response is available '
                'in the retained ModelCall record. Citations remain unverified.'
            )
            self.answer.setPlainText(response)
            self.answer.moveCursor(QTextCursor.MoveOperation.Start)
            self.answer.show()
            count = passage_count(response)
            self.passage.setRange(1, max(1, count))
            self._set_response_controls(count > 0)
            self.passage_text.setVisible(count > 0)
            if count:
                self.show_passage()
            else:
                self.passage_text.clear()
        else:
            detail = terminal.raw_response or ''
            self.status.setText(
                f'The provider operation ended {terminal.status}. The terminal record '
                'is retained and inspectable; no completed answer or automatic retry '
                'was created.' + (f' {outcome.error}' if outcome.error else '')
            )
            self.answer.setPlainText(detail)
            self.answer.setVisible(bool(detail))
            self._set_response_controls(False)
            self.passage_text.hide()

    def scroll_to_outcome(self):
        """Reveal the attributed terminal result without stealing editor focus."""
        target = self.answer_attribution if self.outcome and self.outcome.terminal else self.status
        self.window.assistance_scroll.verticalScrollBar().setValue(
            max(0, target.y() - 8)
        )

    def show_passage(self):
        if not self.outcome or not self.outcome.terminal or self.outcome.terminal.status != 'completed':
            raise WorkspaceError('No completed response passage is available')
        _call, selected, exact = self.window.controller.assistance_passage(
            self.outcome.path, self.passage.value()
        )
        self.passage_text.setPlainText(
            f'Exact UTF-8 bytes [{selected.start_byte}, {selected.end_byte})\n\n' + exact
        )
        self.passage_text.moveCursor(QTextCursor.MoveOperation.Start)

    def retain_passage(self):
        if not self.outcome:
            raise WorkspaceError('No completed response passage is available')
        path = QFileDialog.getSaveFileName(
            self, 'Retain exact response passage', self.window.controller.current().root,
            'JSON record (*.json)', options=QFileDialog.Option.DontConfirmOverwrite
        )[0]
        if not path:
            return
        self.window.controller.project_model_call_passage(
            self.outcome.path, self.passage.value(), Path(path)
        )
        self.window.render()

    def contribution(self):
        if not self.outcome:
            raise WorkspaceError('No completed response passage is available')
        return self.window.controller.attributed_assistance_contribution(
            self.outcome.path, self.passage.value()
        )

    def copy_contribution(self):
        QApplication.clipboard().setText(self.contribution())
        self.status.setText(
            'Attributed, unverified editable copy placed on the clipboard. The '
            'immutable ModelCall was not changed.'
        )

    def insert_contribution(self):
        state = self.window.controller.current()
        pane = self.window.panes[state.active_pane]
        buffer = self.window.controller.buffer(pane.shown)
        if not pane.genuine_content() or not buffer.editable:
            raise WorkspaceError('Focus an editable ordinary work note before inserting')
        cursor = pane.text.textCursor()
        cursor.clearSelection()
        pane.text.setTextCursor(cursor)
        pane.text.insertPlainText(self.contribution())
        pane.text.setFocus()
        self.status.setText(
            'Inserted a separately attributed, unverified editable copy into the '
            'active note. Later edits do not alter the raw ModelCall.'
        )

    def save_summary(self):
        self.window.controller.update_investigation_summary(
            question=self.question.toPlainText(),
            correction=self.correction.toPlainText(),
            last_conclusion=self.last_conclusion.toPlainText(),
            unresolved_issue=self.unresolved_issue.toPlainText(),
        )
        self.status.setText(
            'Human-maintained investigation summary saved privately. Immutable parent '
            'and child ModelCall records were not changed.'
        )
        self.save_summary_button.setEnabled(True)

    def insert_handoff(self):
        state = self.window.controller.current()
        pane = self.window.panes[state.active_pane]
        buffer = self.window.controller.buffer(pane.shown)
        if not pane.genuine_content() or not buffer.editable:
            raise WorkspaceError('Focus an editable ordinary work note before inserting')
        cursor = pane.text.textCursor()
        cursor.clearSelection()
        pane.text.setTextCursor(cursor)
        pane.text.insertPlainText(self.window.controller.investigation_handoff())
        pane.text.setFocus()
        self.status.setText(
            'Inserted an editable human task handoff with immutable parent/child '
            'identities. Model prose was not copied or reclassified.'
        )

    def install_restored(self, restored):
        """Show saved task text even when an immutable record is unavailable."""
        if restored is None:
            self.resume_button.setEnabled(False)
            return
        state = restored.state
        if restored.parent is not None:
            self.install_parent(
                restored.parent,
                passages=restored.passages,
                question=state.question,
                correction=state.correction,
                last_conclusion=state.last_conclusion,
                unresolved_issue=state.unresolved_issue,
            )
        else:
            self.reset()
            self.installing = True
            try:
                self.continuation_widget.show()
                self.parent_attribution.setText('\n'.join((
                    f'Saved parent ModelCall: {state.parent_id}',
                    f'Saved response SHA-256: {state.parent_response_digest}',
                    f'Retained record unavailable or changed: {state.parent_path}',
                )))
                self.question.setPlainText(state.question)
                self.correction.setPlainText(state.correction)
                self.last_conclusion.setPlainText(state.last_conclusion)
                self.unresolved_issue.setPlainText(state.unresolved_issue)
                self.parent_passage_list.clear()
                for passage in state.parent_passages:
                    self.parent_passage_list.addItem(
                        f'Saved passage {passage.number} · UTF-8 bytes '
                        f'[{passage.start_byte}, {passage.end_byte}) · exact text unavailable'
                    )
                self.parent_passage_text.setPlainText(
                    'Exact prior text is unavailable because the retained parent record '
                    'did not validate. No replacement passage was guessed.'
                )
            finally:
                self.installing = False
        self.prepared = None
        self.outcome = None
        if restored.child is not None:
            self.outcome = AssistanceOutcome(
                'restored-investigation', Path(state.child_path), restored.child,
                restored.child_raw, restored.error,
            )
            self.show_outcome()
        else:
            self._set_draft_controls(False)
            self.status.setText(
                restored.error or 'Saved investigation task summary restored.'
            )
        for widget in (self.question, self.correction, self.last_conclusion,
                       self.unresolved_issue):
            widget.setEnabled(True)
        self.save_summary_button.setEnabled(True)
        self.insert_handoff_button.setEnabled(True)
        if restored.error:
            self.status.setText(restored.error)
        self.continue_current_button.hide()
        self.resume_button.setEnabled(True)
        self.window.assistance_dock.show()
        self.window.update_actions()

    def toggle_record(self, shown):
        self.raw_record.setVisible(bool(shown))
        self.record_toggle.setText(
            'Hide exact retained ModelCall record' if shown
            else 'Show exact retained ModelCall record'
        )

    def reset(self):
        self.installing = True
        try:
            self.contexts = []
            self.target = self.prepared = self.outcome = None
            self.parent = None
            self.parent_passage_numbers = []
            self.parent_passages = []
            self.in_flight = False
            self.context_list.clear()
            self.context_text.clear()
            self.question.clear()
            self.correction.clear()
            self.last_conclusion.clear()
            self.unresolved_issue.clear()
            self.parent_attribution.clear()
            self.parent_passage_list.clear()
            self.parent_passage_text.clear()
            self.continuation_widget.hide()
            if not self.model.text():
                self.model.setText(os.environ.get(ASSISTANCE_MODEL_ENV, ''))
            self.preview_text.clear()
            self.answer_attribution.clear()
            self.answer.clear()
            self.answer.hide()
            self.answer_notice.hide()
            self.passage_text.clear()
            self.passage_text.hide()
            self.raw_record.clear()
            self.raw_record.hide()
            self.record_toggle.setChecked(False)
            self.record_toggle.hide()
            self.continue_current_button.hide()
            self.status.setText('No request has been prepared.')
            self.send_button.setEnabled(False)
            self._set_response_controls(False)
            self._set_draft_controls(True)
            self.remove_context_button.setEnabled(False)
            self.remove_parent_passage_button.setEnabled(False)
            retained = bool(
                self.window.controller.workspace
                and self.window.controller.current().investigation is not None
            )
            self.resume_button.setEnabled(retained)
            self.save_summary_button.setEnabled(False)
            self.insert_handoff_button.setEnabled(False)
        finally:
            self.installing = False

    def dismiss(self):
        if self.in_flight:
            raise WorkspaceError('Wait for the in-flight request to finish')
        self.reset()
        self.window.assistance_dock.hide()
        self.window.update_actions()


class WorkstationWindow(QMainWindow):
    def __init__(self, controller=None):
        super().__init__()
        self.controller = controller or Workstation()
        self.documents = {}
        self.anchor_errors = {}
        self.view_updates = 0
        self.normalizing_editor_widths = False
        self.editor_width_timer = QTimer(self)
        self.editor_width_timer.setSingleShot(True)
        self.editor_width_timer.timeout.connect(self.normalize_editor_widths)
        self.setWindowTitle(TITLE)
        self.resize(1280, 820)
        self.setMinimumSize(760, 560)
        self.jobs = {}
        self.loading_buffers = set()
        self.children = []
        self.find_text = ''
        self.pool = QThreadPool(self)
        self.pool.setMaxThreadCount(2)
        self.checkpoint_timer = QTimer(self)
        self.checkpoint_timer.setSingleShot(True)
        self.checkpoint_timer.timeout.connect(self.flush)
        self.process_timer = QTimer(self)
        self.process_timer.timeout.connect(self.reap_editors)
        self.process_timer.start(400)
        self.disk_timer = QTimer(self)
        self.disk_timer.timeout.connect(self.observe_disk)
        self.disk_timer.start(2500)
        self.actions = {}
        self.create_menus()
        toolbar = QToolBar('File and mathematical tools')
        toolbar.setMovable(False)
        self.addToolBar(toolbar)
        for key in ('project', 'open', 'save', 'external', 'build', 'pdf'):
            toolbar.addAction(self.actions[key])
        self.navigator_dock = QDockWidget('Project files', self)
        self.navigator = QTreeView()
        self.navigator.setHeaderHidden(True)
        self.navigator.setUniformRowHeights(True)
        self.navigator.setIndentation(24)
        self.filesystem = QFileSystemModel(self)
        self.filesystem.setReadOnly(True)
        self.filesystem.setFilter(QDir.Filter.AllEntries | QDir.Filter.NoDotAndDotDot | QDir.Filter.Hidden)
        self.file_filter = ProjectFilter(self)
        self.file_filter.setSourceModel(self.filesystem)
        self.navigator.setModel(self.file_filter)
        for column in (1, 2, 3):
            self.navigator.hideColumn(column)
        self.navigator.activated.connect(self.open_tree_file)
        self.navigator_dock.setWidget(self.navigator)
        self.addDockWidget(Qt.DockWidgetArea.LeftDockWidgetArea, self.navigator_dock)
        self.view_menu.addAction(self.navigator_dock.toggleViewAction())
        self.editors = QSplitter(Qt.Orientation.Horizontal)
        self.panes = [EditorPane(self, number) for number in (0, 1)]
        for pane in self.panes:
            self.editors.addWidget(pane)
        self.editors.splitterMoved.connect(self.normalize_editor_widths)
        self.pdf = PdfPane(self)
        self.center = QSplitter(Qt.Orientation.Horizontal)
        self.center.addWidget(self.editors)
        self.center.addWidget(self.pdf)
        self.center.setChildrenCollapsible(False)
        self.setCentralWidget(self.center)
        self.pdf.hide()
        self.panes[1].hide()
        self.context_dock = QDockWidget('Contextual records and technical details', self)
        self.facets = QScrollArea()
        self.facets.setWidgetResizable(True)
        self.context_dock.setWidget(self.facets)
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, self.context_dock)
        self.context_dock.hide()
        self.view_menu.addAction(self.context_dock.toggleViewAction())
        self.diagnostics_dock = QDockWidget('Build result and diagnostics', self)
        diagnostics = QWidget()
        diagnostic_layout = QVBoxLayout(diagnostics)
        self.build_summary = QLabel('No build has been requested.')
        self.build_summary.setWordWrap(True)
        self.build_summary.setTextFormat(Qt.TextFormat.PlainText)
        diagnostic_layout.addWidget(self.build_summary)
        self.diagnostics = QListWidget()
        self.diagnostics.itemActivated.connect(self.activate_diagnostic)
        self.diagnostics.itemDoubleClicked.connect(self.activate_diagnostic)
        diagnostic_layout.addWidget(self.diagnostics)
        self.diagnostics_dock.setWidget(diagnostics)
        self.addDockWidget(Qt.DockWidgetArea.BottomDockWidgetArea, self.diagnostics_dock)
        self.diagnostics_dock.hide()
        self.view_menu.addAction(self.diagnostics_dock.toggleViewAction())
        self.selection_dock = QDockWidget('Working context', self)
        self.selection_dock.setAllowedAreas(Qt.DockWidgetArea.BottomDockWidgetArea)
        shelf = QWidget()
        shelf_layout = QVBoxLayout(shelf)
        shelf_layout.setContentsMargins(5, 3, 5, 3)
        self.selection_list = QListWidget()
        self.selection_list.setAccessibleName('Working-context passages')
        self.selection_list.setMinimumHeight(56)
        self.selection_list.currentRowChanged.connect(self.update_context_actions)
        self.selection_list.itemDoubleClicked.connect(lambda *_: self.perform(self.open_context_selection))
        shelf_layout.addWidget(self.selection_list)
        buttons = QHBoxLayout()
        self.context_buttons = {}
        for key, label in (('context_open', 'Open'), ('context_other', 'Other pane'), ('context_remove', 'Remove')):
            button = QPushButton(label)
            button.clicked.connect(lambda _checked=False, key=key: self.actions[key].trigger())
            self.context_buttons[key] = button
            buttons.addWidget(button)
        buttons.addStretch()
        shelf_layout.addLayout(buttons)
        self.selection_dock.setWidget(shelf)
        self.addDockWidget(Qt.DockWidgetArea.BottomDockWidgetArea, self.selection_dock)
        self.selection_dock.hide()
        self.view_menu.addAction(self.selection_dock.toggleViewAction())
        self._selection_rows = None
        self.assistance_dock = QDockWidget(
            'Mathematical assistance · question and one continuation', self
        )
        self.assistance_dock.setAllowedAreas(
            Qt.DockWidgetArea.RightDockWidgetArea
            | Qt.DockWidgetArea.BottomDockWidgetArea
        )
        self.assistance_scroll = QScrollArea()
        self.assistance_scroll.setWidgetResizable(True)
        self.assistance_scroll.setMinimumWidth(360)
        self.assistance_scroll.setHorizontalScrollBarPolicy(
            Qt.ScrollBarPolicy.ScrollBarAlwaysOff
        )
        self.assistance = AssistancePanel(self)
        self.assistance_scroll.setWidget(self.assistance)
        self.assistance_dock.setWidget(self.assistance_scroll)
        self.addDockWidget(Qt.DockWidgetArea.RightDockWidgetArea, self.assistance_dock)
        self.assistance_dock.hide()
        self.view_menu.addAction(self.assistance_dock.toggleViewAction())
        self.persistence = QLabel('')
        self.persistence.setTextFormat(Qt.TextFormat.PlainText)
        self.persistence.setStyleSheet('color: #a42e20;')
        self.focus_status = QLabel('')
        self.focus_status.setTextFormat(Qt.TextFormat.PlainText)
        self.navigation_status = QLabel('')
        self.navigation_status.setTextFormat(Qt.TextFormat.PlainText)
        self.statusBar().addPermanentWidget(self.focus_status)
        self.statusBar().addPermanentWidget(self.navigation_status)
        self.statusBar().addPermanentWidget(self.persistence)
        self.resizeDocks([self.navigator_dock], [210], Qt.Orientation.Horizontal)
        self.resizeDocks([self.context_dock], [300], Qt.Orientation.Horizontal)
        self.resizeDocks([self.assistance_dock], [410], Qt.Orientation.Horizontal)
        self.resizeDocks([self.diagnostics_dock], [170], Qt.Orientation.Vertical)
        self.resizeDocks([self.selection_dock], [150], Qt.Orientation.Vertical)
        self.setStyleSheet('QToolButton, QPushButton, QComboBox, QSpinBox { min-height: 26px; } QTreeView::item, QListView::item { min-height: 26px; } QScrollBar:vertical { width: 16px; } QScrollBar:horizontal { height: 16px; } QMenu::item { padding: 7px 24px; }')
        QApplication.instance().focusChanged.connect(self.focus_changed)
        self.render()

    def add_action(self, menu, key, label, callback, *, checkable=False):
        action = QAction(label, self)
        action.setCheckable(checkable)
        action.triggered.connect(lambda checked=False: self.perform(lambda: callback(checked) if checkable else callback()))
        menu.addAction(action)
        self.actions[key] = action
        return action

    def create_menus(self):
        self.file_menu = self.menuBar().addMenu('File')
        for key, label, callback in (
            ('project', 'Open Project Directory…', self.open_project), ('close_project', 'Close project', self.close_project),
            ('new', 'New file', self.new_file), ('open', 'Open…', self.open_file),
            ('reference', 'Open external reference (read-only)…', lambda: self.open_file(reference=True)),
            ('save', 'Save', self.save), ('save_as', 'Save As…', self.save_as),
            ('refresh', 'Refresh from disk', self.refresh_from_disk), ('compare', 'Compare with disk', self.compare_disk),
            ('close', 'Close buffer', self.close_buffer), ('quit', 'Quit', self.close)):
            self.add_action(self.file_menu, key, label, callback)
        self.recent_projects = self.file_menu.addMenu('Recent projects')
        self.recent_files = self.file_menu.addMenu('Recent files')
        self.edit_menu = self.menuBar().addMenu('Edit')
        for name in ('undo', 'redo', 'cut', 'copy', 'paste', 'selectAll'):
            self.add_action(self.edit_menu, name, 'Select all' if name == 'selectAll' else name.title(), lambda name=name: getattr(self.active_pane().text, name)())
        self.add_action(self.edit_menu, 'find', 'Find…', self.find)
        self.add_action(self.edit_menu, 'find_next', 'Find next', self.find_next)
        self.add_action(self.edit_menu, 'line', 'Go to line…', self.go_to_line)
        self.view_menu = self.menuBar().addMenu('View')
        self.add_action(self.view_menu, 'split', 'Split two documents', self.toggle_split, checkable=True)
        self.add_action(self.view_menu, 'wrap', 'Wrap long lines', self.toggle_wrap, checkable=True)
        self.actions['wrap'].setChecked(True)
        self.add_action(self.view_menu, 'pdf', 'Show / hide PDF', self.toggle_pdf, checkable=True)
        work = self.menuBar().addMenu('Work')
        work.setToolTipsVisible(True)
        self.add_action(work, 'mark', 'Mark unfinished work here', self.mark_selection)
        self.add_action(work, 'return', 'Return to unfinished work', self.return_to_marker)
        self.add_action(work, 'clear_marker', 'Clear unfinished marker', lambda: self.controller.clear_marker())
        work.addSeparator()
        self.add_action(work, 'context_add', 'Add current selection to working context', self.add_context_selection)
        self.add_action(work, 'context_open', 'Open selected context passage', self.open_context_selection)
        self.add_action(work, 'context_other', 'Open selected context passage in other pane', lambda: self.open_context_selection(other=True))
        self.add_action(work, 'context_remove', 'Remove selected context passage', self.remove_context_selection)
        work.addSeparator()
        self.add_action(work, 'ask', 'Ask about current selection…', self.ask_about_selection)
        self.actions['ask'].setShortcut(QKeySequence('Ctrl+Alt+Q'))
        self.actions['ask'].setShortcutContext(Qt.ShortcutContext.WindowShortcut)
        self.add_action(work, 'continue_assistance',
                        'Continue a retained completed answer…',
                        self.load_continuation_parent)
        self.add_action(work, 'resume_investigation',
                        'Resume saved investigation', self.resume_investigation)
        latex = self.menuBar().addMenu('LaTeX')
        self.add_action(latex, 'tex_root', 'Set as TeX root', lambda: self.controller.set_tex_root())
        self.add_action(latex, 'build', 'Build LaTeX', self.build_latex)
        self.add_action(latex, 'reload_pdf', 'Show last successful generated PDF', lambda: self.reload_pdf(source='generated'))
        self.add_action(latex, 'build_details', 'Inspect build provenance and logs', self.show_build_details)
        self.records_menu = self.menuBar().addMenu('Records')
        for kind, label in (('model_call', 'Open completed ModelCall…'), ('projection', 'Open exact projection…'),
                            ('verification', 'Open Verification and checked bundle…'), ('documentary_package', 'Open documentary warrant package…')):
            self.add_action(self.records_menu, kind, label, lambda kind=kind: self.open_record(kind))
        self.tools_menu = self.menuBar().addMenu('Tools')
        self.add_action(self.tools_menu, 'external', 'Open in configured editor', self.open_in_editor)
        self.add_action(self.tools_menu, 'editor_config', 'Configure editor…', lambda: self.configure_tool('editor'))
        self.add_action(self.tools_menu, 'jupyter', 'Open in configured Jupyter', self.open_in_jupyter)
        self.add_action(self.tools_menu, 'jupyter_config', 'Configure Jupyter/JupyterLab…', lambda: self.configure_tool('jupyter'))
        self.add_action(self.tools_menu, 'tex_config', 'Configure TeX executable…', lambda: self.configure_tool('tex_engine'))
        for key, standard in (('open', QKeySequence.StandardKey.Open),
                              ('save', QKeySequence.StandardKey.Save),
                              ('find', QKeySequence.StandardKey.Find),
                              ('find_next', QKeySequence.StandardKey.FindNext)):
            self.actions[key].setShortcuts(QKeySequence.keyBindings(standard))
            self.actions[key].setShortcutContext(Qt.ShortcutContext.WindowShortcut)

    def show_error(self, message):
        box = QMessageBox(QMessageBox.Icon.Warning, TITLE, bounded_safe_diagnostic(message), QMessageBox.StandardButton.Ok, self)
        box.setTextFormat(Qt.TextFormat.PlainText)
        box.exec()

    def perform(self, action):
        try:
            result = action()
            self.update_actions()
            return result
        except (OSError, ValueError) as exc:
            self.show_error(str(exc))
            self.update_actions()
            return None

    def submit(self, task, done, failed=None, *, background=False):
        job = Job(task)
        job.background = background
        self.jobs[id(job)] = job
        receiver = JobCompletion(self, job, done, failed)
        job.receiver = receiver
        job.signals.finished.connect(receiver.receive, Qt.ConnectionType.QueuedConnection)
        self.pool.start(job)
        self.update_actions()
        return receiver

    def buffer_name(self, identifier):
        buffer = self.controller.buffer(identifier)
        path = Path(buffer.state.path) if buffer.state.path else None
        root = Path(self.controller.current().root)
        name = str(path.relative_to(root)) if path and path.is_relative_to(root) else str(path or 'Untitled')
        return name + '  [' + buffer.status + ']'

    def active_pane(self):
        return self.panes[self.controller.current().active_pane]

    def pdf_has_focus(self):
        widget = QApplication.focusWidget()
        return bool(widget and hasattr(self, 'pdf') and (widget is self.pdf or self.pdf.isAncestorOf(widget)))

    def assistance_has_focus(self):
        widget = QApplication.focusWidget()
        return bool(widget and hasattr(self, 'assistance_dock')
                    and self.assistance_dock.isAncestorOf(widget))

    def focus_changed(self, *_):
        if hasattr(self, 'persistence'):
            self.update_actions()

    def schedule_checkpoint(self):
        self.checkpoint_timer.start(250)

    def begin_reflow(self, *, cached=False):
        for pane in getattr(self, 'panes', ()):
            pane.text.begin_reflow(cached=cached)

    def schedule_editor_widths(self):
        if not self.normalizing_editor_widths:
            self.editor_width_timer.start(0)

    def normalize_editor_widths(self, *_):
        if self.normalizing_editor_widths or not hasattr(self, 'panes'):
            return
        self.editor_width_timer.stop()
        state = self.controller.workspace
        shared_wrap = (state and state.split and state.wrap
                       and all(p.isVisible() and p.genuine_content() for p in self.panes)
                       and self.panes[0].text.document() is self.panes[1].text.document())
        self.normalizing_editor_widths = True
        try:
            with self.updating_views():
                if not shared_wrap:
                    if self.editors.contentsMargins().right():
                        self.begin_reflow(cached=True)
                        self.editors.setContentsMargins(0, 0, 0, 0)
                    return
                # QPlainTextDocumentLayout has one width, even with two views.
                # Account for gutters and scrollbars, and reserve a spare pixel
                # when necessary so the *viewports* can be exactly equal.
                sizes = self.editors.sizes()
                chrome = [size - pane.text.viewport().width() for size, pane in zip(sizes, self.panes)]
                available = self.editors.width() - self.editors.handleWidth() - sum(chrome)
                spare = available % 2
                desired = [available // 2 + width for width in chrome]
                if sizes != desired or self.editors.contentsMargins().right() != spare:
                    self.begin_reflow(cached=True)
                    self.editors.setContentsMargins(0, 0, spare, 0)
                    self.editors.setSizes(desired)
                    layout = self.panes[0].text.document().documentLayout()
                    layout.documentSizeChanged.emit(layout.documentSize())
        finally:
            self.normalizing_editor_widths = False

    @contextmanager
    def updating_views(self):
        # Suppress application capture, not Qt's scrollbar signals: Qt needs
        # valueChanged itself to move the rendered viewport to the new value.
        self.view_updates += 1
        try:
            yield
        finally:
            self.view_updates -= 1

    def resizeEvent(self, event):
        self.begin_reflow()
        super().resizeEvent(event)

    def prune_documents(self):
        for identifier in set(self.documents) - self.controller.buffers.keys():
            document = self.documents.pop(identifier)
            for pane in self.panes:
                if pane.text.document() is document:
                    pane.text.attach_document(pane.display_document)
            document.deleteLater()

    def flush(self):
        if self.controller.workspace:
            self.normalize_editor_widths()
            for document in self.documents.values():
                if document.refresh_timer.isActive():
                    document.refresh_views()
            for pane in self.panes:
                if pane.isVisible():
                    pane.text.finish_reflow()
                    pane.capture_position()
            if self.pdf.isVisible():
                self.pdf.capture()
            self.checkpoint_timer.stop()
            self.controller.current().window_size = [self.width(), self.height()]
            self.controller.checkpoint()
        else:
            self.checkpoint_timer.stop()
        self.update_actions()

    def update_actions(self):
        if not hasattr(self, 'panes') or not hasattr(self, 'persistence'):
            return
        state = self.controller.workspace
        for document in self.documents.values():
            document.sync_anchors()
        buffer = self.controller.buffer() if state and state.active else None
        busy = any(not job.background for job in self.jobs.values())
        pdf_focused = self.pdf_has_focus()
        text_focused = not pdf_focused
        for key, action in self.actions.items():
            action.setEnabled(not busy)
        for key in ('open', 'reference', 'new', 'split', 'close_project', 'model_call',
                    'projection', 'verification', 'documentary_package',
                    'continue_assistance'):
            self.actions[key].setEnabled(state is not None and not busy)
        self.actions['resume_investigation'].setEnabled(bool(
            state and state.investigation and not busy
        ))
        for key in ('project', 'quit'):
            self.actions[key].setEnabled(not self.jobs)
        self.actions['close_project'].setEnabled(state is not None and not self.jobs)
        self.actions['save'].setEnabled(bool(buffer and buffer.editable) and not busy)
        for key in ('external', 'undo', 'redo', 'cut', 'paste'):
            self.actions[key].setEnabled(bool(text_focused and buffer and buffer.editable) and not busy)
        for key in ('save_as', 'refresh', 'compare', 'close', 'find', 'find_next', 'line', 'copy', 'selectAll', 'mark'):
            self.actions[key].setEnabled(bool(text_focused and buffer and buffer.loaded) and not busy)
        self.actions['save_as'].setEnabled(bool(text_focused and buffer and buffer.loaded and buffer.state.format == 'text' and not record_kind(buffer.content)) and not busy)
        self.actions['external'].setEnabled(bool(text_focused and buffer and buffer.editable and buffer.state.path) and not busy)
        self.actions['jupyter'].setEnabled(bool(text_focused and buffer and buffer.state.format == 'notebook' and not buffer.state.external) and not busy)
        self.actions['tex_root'].setEnabled(bool(text_focused and buffer and buffer.editable and buffer.state.path and Path(buffer.state.path).suffix.lower() == '.tex') and not busy)
        from .latex_build import build_supported
        self.actions['build'].setEnabled(bool(state and state.tex_root) and not busy and build_supported())
        self.actions['build'].setToolTip('Explicit trusted-TeX build' if build_supported()
            else 'TeX building is unavailable on this platform; Linux/WSL2 process supervision is required')
        self.actions['pdf'].setEnabled(bool(state and (state.successful_build or state.imported_pdf)) and not busy)
        self.actions['reload_pdf'].setEnabled(bool(state and state.successful_build) and not busy)
        self.actions['build_details'].setEnabled(bool(state and state.last_build) and not busy)
        for key in ('return', 'clear_marker'):
            self.actions[key].setEnabled(bool(state and state.marker) and not busy)
        marker = state.marker if state else None
        self.actions['return'].setToolTip(
            f'{marker.path} · {displayed_position(marker.start)}'
            + (' · ' + self.anchor_status(marker) if self.anchor_status(marker) else '') if marker else 'No unfinished work marked')
        self.actions['find'].setToolTip('PDF search is unavailable in R1; focus an editor to search text.' if pdf_focused else 'Find literal text in the focused editor')
        self.actions['find_next'].setToolTip(self.actions['find'].toolTip())
        target = self.buffer_name(buffer.state.id) if buffer and buffer.editable else 'no editable text target'
        self.actions['save'].setToolTip('Save editable target: ' + target)
        self.focus_status.setText(('PDF focus · Find unavailable · ' if pdf_focused else '') + 'Save → ' + target)
        self.focus_status.setToolTip('PDFs are read-only. Save always addresses the named editable text buffer.')
        if self.assistance_has_focus():
            self.actions['find'].setToolTip(
                'Find searches the active ordinary-text editor; the assistance '
                'response is exact selectable plain text.'
            )
            self.actions['find_next'].setToolTip(self.actions['find'].toolTip())
            self.focus_status.setText('Assistance focus · Save → ' + target)
        if marker:
            path = Path(marker.path)
            label = str(path.relative_to(Path(state.root))) if path.is_relative_to(Path(state.root)) else str(path)
            marker_message = 'Unfinished: ' + label + ' · ' + displayed_position(marker.start)
            status = self.anchor_status(marker)
            self.navigation_status.setText(marker_message + (' · ' + status if status else ''))
            self.navigation_status.setToolTip(self.actions['return'].toolTip())
        else:
            self.navigation_status.setText('Return unavailable — no unfinished work marked')
            self.navigation_status.setToolTip('Use Work → Mark unfinished work here in an ordinary text file.')
        with QSignalBlocker(self.actions['split']):
            self.actions['split'].setChecked(bool(state and state.split))
        with QSignalBlocker(self.actions['pdf']):
            self.actions['pdf'].setChecked(bool(state and state.pdf_visible))
        for pane in self.panes:
            pane.choices()
            if pane.shown in self.controller.buffers:
                b = self.controller.buffer(pane.shown)
                active = state and pane.number == state.active_pane
                pane.notice.setText(('Active · ' if active else '') + b.status + (' · recovered unsaved work' if b.recovery_warning else ''))
                pane.notice.setStyleSheet('color: #9c381c;' if b.dirty or b.externally_changed or b.problem else 'color: #34475a;')
        message = 'Working…' if busy else (state.root if state else 'Open Project Directory to begin.')
        if state and state.tex_root:
            message += ' · TeX root: ' + Path(state.tex_root).name
        self.statusBar().showMessage(message)
        self.persistence.setText('Checkpoint failed — close is blocked' if self.controller.persistence_error else '')
        self.persistence.setToolTip(self.controller.persistence_error)
        self.recent_projects.clear()
        for path in self.controller.settings_store.settings.recent_projects:
            self.recent_projects.addAction(path, lambda path=path: self.perform(lambda: self.open_project(Path(path))))
        self.recent_files.clear()
        for path in state.recent if state else []:
            self.recent_files.addAction(path, lambda path=path: self.perform(lambda: self.open_file(Path(path))))
        self.refresh_selection_shelf()
        if hasattr(self, 'assistance') and self.assistance.outcome is not None:
            terminal = self.assistance.outcome.terminal
            completed = bool(terminal and terminal.status == 'completed')
            self.assistance.insert_button.setEnabled(
                completed and bool(buffer and buffer.editable)
            )

    def update_context_actions(self, *_):
        if not hasattr(self, 'selection_list'):
            return
        state = self.controller.workspace
        ready = state is not None and not any(
            not job.background for job in self.jobs.values()
        )
        pane = self.active_pane() if state else None
        self.actions['context_add'].setEnabled(bool(ready and not self.pdf_has_focus() and pane.text.textCursor().hasSelection()
            and self.controller.context_selection_supported(pane.shown)))
        assistance_ready = bool(
            ready and not self.pdf_has_focus() and pane.text.textCursor().hasSelection()
            and self.controller.assistance_selection_supported(pane.shown)
            and self.controller.assistance_in_flight is None
            and (not hasattr(self, 'assistance') or self.assistance.outcome is None)
        )
        self.actions['ask'].setEnabled(assistance_ready)
        if hasattr(self, 'assistance'):
            self.assistance.add_context_button.setEnabled(assistance_ready)
        selected = bool(ready and 0 <= self.selection_list.currentRow() < len(state.selection_shelf))
        for key, button in self.context_buttons.items():
            self.actions[key].setEnabled(selected)
            button.setEnabled(selected)

    def refresh_selection_shelf(self):
        state = self.controller.workspace
        current_keys = {self.anchor_key(s) for s in state.selection_shelf} if state else set()
        if state and state.marker:
            current_keys.add(self.anchor_key(state.marker))
        self.anchor_errors = {key: value for key, value in self.anchor_errors.items() if key in current_keys}
        rows = tuple((s.path, s.revision, s.start, s.end, s.preview, self.anchor_status(s))
                     for s in state.selection_shelf) if state else ()
        if rows != self._selection_rows:
            selected = self.selection_list.currentRow()
            with QSignalBlocker(self.selection_list):
                self.selection_list.clear()
                for path, revision, start, end, preview, status in rows:
                    local = Path(path)
                    label = str(local.relative_to(Path(state.root))) if local.is_relative_to(Path(state.root)) else path
                    item = QListWidgetItem(f'{label} · {displayed_position(start)}–{displayed_position(end)} · '
                                           + (preview or 'Preview unavailable') + (' · ' + status if status else ''))
                    item.setToolTip('<qt>' + escape(path) + '<br>SHA-256: ' + revision
                                    + '<br>Stored span: ' + start + '–' + end + '</qt>')
                    self.selection_list.addItem(item)
                if rows:
                    self.selection_list.setCurrentRow(min(max(0, selected), len(rows) - 1))
            self._selection_rows = rows
        if state is None:
            self.anchor_errors.clear()
            self.selection_dock.hide()
        self.update_context_actions()

    @staticmethod
    def anchor_key(entry):
        return entry.path, entry.revision, entry.start, entry.end

    def anchor_status(self, entry):
        if self.anchor_errors.get(self.anchor_key(entry), False):
            return 'Changed or unavailable'
        buffer = next((b for b in self.controller.buffers.values() if b.state.path == entry.path), None)
        if self.anchor_key(entry) in self.anchor_errors and (not buffer or not buffer.has_content):
            return 'Changed or unavailable'
        if buffer:
            document = self.documents.get(buffer.state.id)
            if document and any(a.entry is entry and a.invalid for a in document.anchors.values()):
                return 'Changed · retained passage unavailable'
            if buffer.problem or buffer.externally_changed:
                return 'Changed or unavailable'
            if buffer.has_content:
                revision = document.revision if document else sha256(buffer.content.encode('utf-8')).hexdigest()
                if entry.revision != revision:
                    return 'Changed · pinned revision differs'
        return ''

    def render(self, *, balance_editors=False):
        state = self.controller.workspace
        self.prune_documents()
        if (balance_editors or self.panes[1].isVisible() != bool(state and state.split)
                or self.pdf.isVisible() != bool(state and state.pdf_visible)):
            self.begin_reflow()
        self.refresh_selection_shelf()
        # Split layout changes can emit position signals before document views
        # are restored. These signals describe geometry, not user navigation.
        with self.updating_views():
            self.panes[1].setVisible(bool(state and state.split))
            self.pdf.setVisible(bool(state and state.pdf_visible))
            if balance_editors:
                self.editors.setSizes([500, 500])
            for index, pane in enumerate(self.panes):
                if index == 0 or state and state.split:
                    pane.show_buffer(state.visible[index] if state else None, force=True)
        for pane in self.panes:
            pane.text.remember_view()
            pane.capture_position()
        self.update_context()
        self.update_actions()

    def select(self, identifier, pane):
        self.controller.activate(identifier, pane)
        self.panes[pane].show_buffer(identifier)
        self.update_context()
        self.update_actions()

    def load_buffer(self, identifier):
        if identifier in self.loading_buffers:
            return
        self.loading_buffers.add(identifier)
        def accept(snapshot):
            self.loading_buffers.discard(identifier)
            self.controller.accept_snapshot(snapshot)
            self.render()
        def failed(error):
            self.loading_buffers.discard(identifier)
            buffer = self.controller.buffer(identifier)
            buffer.loaded, buffer.problem = True, error
            self.render()
        self.submit(lambda: self.controller.load_snapshot(identifier), accept, failed)

    def open_project(self, directory=None):
        if self.jobs:
            raise WorkspaceError('Wait for the current read or build to finish')
        if directory is None:
            directory = QFileDialog.getExistingDirectory(self, 'Open Project Directory')
        if not directory:
            return
        self.controller.prepare_project(Path(directory))
        if not self.close_project():
            return
        self.controller.open_project(Path(directory))
        with QSignalBlocker(self.actions['wrap']):
            self.actions['wrap'].setChecked(self.controller.current().wrap)
        for pane in self.panes:
            pane.text.setLineWrapMode(QPlainTextEdit.LineWrapMode.WidgetWidth if self.controller.current().wrap else QPlainTextEdit.LineWrapMode.NoWrap)
        root = self.controller.current().root
        self.filesystem.setRootPath(root)
        self.navigator.setRootIndex(self.file_filter.mapFromSource(self.filesystem.index(root)))
        self.navigator_dock.setWindowTitle('Project · ' + Path(root).name)
        self.resize(*self.controller.current().window_size)
        self.selection_dock.setVisible(bool(self.controller.current().selection_shelf))
        self.render()
        if self.controller.current().last_build:
            self.submit(self.controller.build_report, self.show_build_result)
        if self.controller.current().pdf_visible:
            state = self.controller.current()
            if state.pdf_source == 'imported' and state.imported_pdf:
                self.reload_pdf(source='imported')
            elif state.pdf_source == 'generated' and state.successful_build:
                self.reload_pdf(source='generated')
        if self.controller.current().investigation:
            self.submit(
                self.controller.restore_investigation,
                self.assistance.install_restored,
            )

    def open_tree_file(self, index):
        original = self.file_filter.mapToSource(index)
        if not self.filesystem.isDir(original):
            self.perform(lambda: self.open_file(Path(self.filesystem.filePath(original))))

    def open_file(self, path=None, *, reference=False, line=None):
        if path is None:
            path = QFileDialog.getOpenFileName(self, 'Open external reference' if reference else 'Open mathematical file', self.controller.current().root, FILE_FILTER)[0]
        if not path:
            return
        path = Path(path)
        if path.suffix.lower() == '.pdf':
            return self.open_pdf(path)
        pane = self.controller.current().active_pane
        def install(buffer):
            installed = self.controller._install(buffer, pane)
            if line:
                installed.state.pane_views[pane].cursor = f'{line}.0'
                installed.state.pane_views[pane].selection = None
                self.panes[pane].center_on_next_show = True
            self.render()
            self.panes[pane].text.setFocus()
        for buffer in self.controller.buffers.values():
            if buffer.state.path == str(path.resolve()):
                if line:
                    view = buffer.state.pane_views[pane]
                    view.cursor, view.selection = f'{line}.0', None
                    self.panes[pane].center_on_next_show = True
                self.controller.activate(buffer.state.id, pane)
                self.render()
                return
        self.submit(lambda: self.controller.prepare_file(path, reference=reference), install)

    def open_pdf(self, path):
        def install(snapshot):
            first = self.pdf.kind is None
            self.pdf.show_imported_snapshot(snapshot)
            self.pdf.show()
            if first:
                self.center.setSizes([650, 550])
            self.pdf.view.setFocus()
            self.update_actions()
        def failed(error):
            self.pdf.set_failure(error)
        self.submit(lambda: self.controller.prepare_pdf(Path(path)), install, failed)

    def new_file(self):
        self.controller.new_buffer()
        self.render()
        self.active_pane().text.setFocus()

    def open_record(self, kind):
        path = QFileDialog.getExistingDirectory(self, 'Open retained documentary package') if kind == 'documentary_package' else QFileDialog.getOpenFileName(self, 'Open ' + kind.replace('_', ' '), '', 'JSON records (*.json);;All files (*)')[0]
        if not path:
            return
        companion = None
        if kind == 'verification':
            companion = QFileDialog.getOpenFileName(self, 'Select the exact checked bundle', '', 'JSON records (*.json)')[0]
            if not companion:
                return
        def install(buffer):
            self.controller._install(buffer)
            self.render()
            self.context_dock.show()
        self.submit(lambda: self.controller.prepare_record(Path(path), kind, companion=Path(companion) if companion else None), install)

    def save(self, identifier=None):
        buffer = self.controller.buffer(identifier)
        if buffer.state.path is None:
            return self.save_as(buffer.state.id)
        self.controller.save(buffer.state.id)
        self.render()
        return True

    def save_as(self, identifier=None):
        buffer = self.controller.buffer(identifier)
        path = QFileDialog.getSaveFileName(self, 'Save As — new project file', self.controller.current().root, FILE_FILTER,
                                         options=QFileDialog.Option.DontConfirmOverwrite)[0]
        if not path:
            return False
        self.controller.save_as(buffer.state.id, Path(path))
        self.render()
        return True

    def refresh_from_disk(self):
        buffer = self.controller.buffer()
        if buffer.dirty and QMessageBox.question(self, TITLE, 'Discard this buffer’s unsaved text and recovery snapshot, and read its current disk contents?') != QMessageBox.StandardButton.Yes:
            return
        self.controller.refresh(discard=buffer.dirty)
        self.render()
        self.mark_pdf_dirty()

    def compare_disk(self):
        buffer = self.controller.buffer()
        self.controller.check_external()
        dialog = QDialog(self)
        dialog.setWindowTitle('Compare buffer and current disk revision')
        dialog.resize(920, 620)
        layout = QVBoxLayout(dialog)
        splitter = QSplitter()
        for label, text in (('In-memory buffer — retained unsaved text', buffer.content), ('Current disk — read-only', buffer.disk_content if buffer.disk_content is not None else 'No different readable disk revision is available.')):
            column = QWidget()
            box = QVBoxLayout(column)
            box.addWidget(QLabel(label))
            edit = QPlainTextEdit()
            edit.setReadOnly(True)
            edit.setPlainText(text)
            box.addWidget(edit)
            splitter.addWidget(column)
        layout.addWidget(splitter)
        buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Close)
        buttons.rejected.connect(dialog.reject)
        layout.addWidget(buttons)
        dialog.exec()

    def guard_buffer(self, identifier, *, recovery_option=False):
        buffer = self.controller.buffer(identifier)
        if not buffer.dirty and not buffer.state.was_dirty:
            return 'clean'
        box = QMessageBox(self)
        box.setWindowTitle(TITLE)
        box.setTextFormat(Qt.TextFormat.PlainText)
        box.setText('Unsaved work in ' + self.buffer_name(identifier))
        save = box.addButton('Save', QMessageBox.ButtonRole.AcceptRole)
        keep = box.addButton('Keep private recovery', QMessageBox.ButtonRole.AcceptRole) if recovery_option else None
        discard = box.addButton('Discard unsaved text', QMessageBox.ButtonRole.DestructiveRole)
        box.addButton(QMessageBox.StandardButton.Cancel)
        box.exec()
        clicked = box.clickedButton()
        if clicked is save:
            if not buffer.loaded:
                self.controller.view(identifier)
            return 'saved' if self.save(identifier) else None
        if keep is not None and clicked is keep:
            return 'keep'
        if clicked is discard:
            self.controller.discard(identifier)
            return 'discarded'
        return None

    def close_buffer(self):
        identifier = self.controller.buffer().state.id
        if self.guard_buffer(identifier):
            self.controller.close_buffer(identifier)
            self.render()

    def close_project(self):
        if self.jobs:
            raise WorkspaceError('Wait for the current read or build to finish before closing')
        if not self.controller.workspace:
            return True
        # Checkpoint failure is dealt with before any discard/save dialog can
        # obscure it. The in-memory project remains available on Cancel.
        self.flush()
        if self.controller.persistence_error:
            return self.failed_close()
        for identifier in list(self.controller.buffers):
            if not self.guard_buffer(identifier, recovery_option=True):
                return False
        # Native resize/focus events may complete inside a modal recovery
        # dialog. Capture the final genuine views before closing the store.
        self.flush()
        if self.controller.persistence_error:
            return self.failed_close()
        try:
            self.controller.close_project(keep_recovery=True)
        except WorkspaceError:
            return self.failed_close()
        self.pdf.clear()
        self.pdf.hide()
        self.diagnostics_dock.hide()
        self.context_dock.hide()
        self.assistance.reset()
        self.assistance_dock.hide()
        self.filesystem.setRootPath('')
        self.navigator.setRootIndex(self.file_filter.mapFromSource(self.filesystem.index('')))
        self.render()
        return True

    def failed_close(self):
        box = QMessageBox(self)
        box.setWindowTitle('Final checkpoint failed')
        box.setTextFormat(Qt.TextFormat.PlainText)
        box.setText('The project is still open. ' + self.controller.persistence_error + '\n\nDiscarding this session can lose unsaved text and the latest recovery state.')
        discard = box.addButton('Discard session and close', QMessageBox.ButtonRole.DestructiveRole)
        box.addButton(QMessageBox.StandardButton.Cancel)
        box.exec()
        if box.clickedButton() is discard:
            self.controller.close_project(discard_session=True)
            self.render()
            return True
        return False

    def closeEvent(self, event):
        if self.jobs:
            self.show_error('Wait for the current read or build to finish before quitting')
            event.ignore()
            return
        try:
            close = self.close_project()
        except (ValueError, OSError) as exc:
            self.show_error(str(exc))
            close = False
        if close:
            for timer in (self.checkpoint_timer, self.process_timer, self.disk_timer):
                timer.stop()
            event.accept()
        else:
            event.ignore()

    def toggle_split(self, enabled):
        self.begin_reflow()
        for pane in self.panes:
            if pane.isVisible():
                pane.capture_position()
        self.controller.set_split(enabled)
        self.render(balance_editors=True)

    def toggle_wrap(self, enabled):
        self.begin_reflow()
        if self.controller.workspace:
            self.controller.current().wrap = bool(enabled)
        for pane in self.panes:
            pane.text.setLineWrapMode(QPlainTextEdit.LineWrapMode.WidgetWidth if enabled else QPlainTextEdit.LineWrapMode.NoWrap)
        for document in self.documents.values():
            document.set_wrap(enabled)
        self.normalize_editor_widths()
        self.schedule_checkpoint()

    def toggle_pdf(self, enabled):
        self.begin_reflow()
        self.controller.current().pdf_visible = enabled
        self.pdf.setVisible(enabled)
        if enabled:
            self.reload_pdf()
        self.schedule_checkpoint()

    def find(self):
        text, okay = QInputDialog.getText(self, 'Find', 'Literal text:', text=self.find_text)
        if okay and text:
            self.find_text = text
            self.find_next()

    def find_next(self):
        if not self.find_text:
            return self.find()
        edit = self.active_pane().text
        if not edit.find(self.find_text):
            cursor = edit.textCursor()
            cursor.movePosition(QTextCursor.MoveOperation.Start)
            edit.setTextCursor(cursor)
            if not edit.find(self.find_text):
                QMessageBox.information(self, 'Find', 'Text was not found in this document.')
        edit.setFocus()

    def go_to_line(self):
        edit = self.active_pane().text
        line, okay = QInputDialog.getInt(self, 'Go to line', 'Line:', 1, 1, edit.blockCount())
        if okay:
            cursor = edit.textCursor()
            cursor.setPosition(qt_position(edit, f'{line}.0'))
            edit.setTextCursor(cursor)
            edit.centerCursor()
            edit.setFocus()

    def ask_about_selection(self):
        """Add exactly the current visible selection to the R2 question."""
        pane = self.active_pane()
        pane.text.finish_reflow()
        pane.capture_position()
        cursor = pane.text.textCursor()
        context = self.controller.capture_assistance_context(
            pane.shown,
            cursor_index(pane.text, cursor.selectionStart()),
            cursor_index(pane.text, cursor.selectionEnd()),
            pane=pane.number,
        )
        self.assistance.add_context(context)
        self.assistance_dock.show()
        self.resizeDocks(
            [self.assistance_dock], [410], Qt.Orientation.Horizontal
        )
        self.assistance.question.setFocus()
        self.update_actions()

    def load_continuation_parent(self, path=None):
        """Explicitly load one completed retained call as the sole R3 parent."""
        if self.controller.assistance_in_flight is not None:
            raise WorkspaceError('Wait for the in-flight request to finish')
        if self.controller.current().investigation is not None:
            raise WorkspaceError(
                'This project already has a saved parent/child investigation. '
                'Resume it; R3 does not create a branch or second follow-up.'
            )
        if path is None:
            path = QFileDialog.getOpenFileName(
                self, 'Select completed parent ModelCall', '',
                'JSON records (*.json);;All files (*)'
            )[0]
        if not path:
            return
        self.submit(
            lambda: self.controller.investigation_parent(Path(path)),
            self.assistance.install_parent,
        )
        self.assistance_dock.show()

    def resume_investigation(self):
        if not self.controller.current().investigation:
            raise WorkspaceError('No saved investigation is available')
        self.submit(
            self.controller.restore_investigation,
            self.assistance.install_restored,
        )
        self.assistance_dock.show()

    def add_context_selection(self):
        pane = self.active_pane()
        pane.text.finish_reflow()
        pane.capture_position()
        cursor = pane.text.textCursor()
        index = self.controller.add_context_selection(pane.shown,
            cursor_index(pane.text, cursor.selectionStart()), cursor_index(pane.text, cursor.selectionEnd()), pane=pane.number)
        self.anchor_errors.pop(self.anchor_key(self.controller.current().selection_shelf[index]), None)
        self.refresh_selection_shelf()
        self.selection_list.setCurrentRow(index)
        self.selection_dock.show()

    def open_context_selection(self, *, other=False):
        self.open_navigation(self.selection_list.currentRow(), other=other)

    def open_navigation(self, index=None, *, other=False):
        if self.jobs:
            raise WorkspaceError('Wait for the current read to finish')
        entry = self.controller.current().marker if index is None else self.controller._context_selection(index)
        if entry is None:
            raise WorkspaceError('No unfinished work has been marked')
        key = self.anchor_key(entry)
        pane = self.controller.current().active_pane
        if other:
            pane = 1 - pane
        def accepted(prepared):
            try:
                buffer = (self.controller.accept_marker(prepared, pane) if index is None
                          else self.controller.accept_context_selection(index, prepared, pane))
            except (OSError, ValueError) as exc:
                self.anchor_errors[key] = not str(exc).startswith('Retained passage changed')
                raise
            self.anchor_errors.pop(key, None)
            self.begin_reflow()
            self.panes[1].setVisible(self.controller.current().split)
            target = self.panes[pane]
            target.center_on_next_show = True
            # Only the requested editor navigates, even if the same file is
            # also visible at another passage in the other editor.
            target.show_buffer(buffer.state.id, force=True)
            target.text.setFocus()
            self.update_context()
        def failed(_error):
            self.anchor_errors[key] = not _error.startswith('Retained passage changed')
        self.submit(self.controller.prepare_marker if index is None else lambda: self.controller.prepare_context_selection(index),
                    accepted, failed)

    def remove_context_selection(self):
        self.controller.remove_context_selection(self.selection_list.currentRow())
        self.refresh_selection_shelf()

    def mark_selection(self):
        pane = self.active_pane()
        cursor = pane.text.textCursor()
        self.controller.mark(pane.shown, cursor_index(pane.text, cursor.selectionStart()), cursor_index(pane.text, cursor.selectionEnd()))
        self.anchor_errors.pop(self.anchor_key(self.controller.current().marker), None)
        self.update_actions()

    def return_to_marker(self):
        self.open_navigation()

    def retain_passage(self, pane):
        buffer = self.controller.buffer(pane.shown)
        if buffer.state.review_mode != 'passage':
            return
        path = QFileDialog.getSaveFileName(self, 'Retain displayed exact passage', self.controller.current().root, 'JSON record (*.json)', options=QFileDialog.Option.DontConfirmOverwrite)[0]
        if path:
            self.perform(lambda: self.controller.project_passage(pane.shown, buffer.state.review_number, Path(path)))
            self.render()

    def configure_tool(self, name):
        value = getattr(self.controller.settings_store.settings, name)
        value = shlex.join(value) if isinstance(value, list) else value
        help_text = {'editor': 'Command template with {file}, {line}, optionally {column}. No shell.\nClear to use VISUAL, then EDITOR.\nUse a foreground/wait option so exit can be observed.\nExample: gvim -f +{line} {file}',
                     'jupyter': 'Explicit Jupyter/JupyterLab command with {file}.\nUse --no-browser to keep browser opening separate. No notebook executes here.',
                     'tex_engine': 'Trusted installed tool: latexmk or pdflatex (Linux/WSL2 only).\nEmpty uses available latexmk, then pdflatex. Build arguments are fixed; LuaLaTeX is disabled. TeX source must be trusted; staging is not a sandbox.'}[name]
        if name == 'editor' and not value and os.name != 'nt':
            vim = shutil.which('vim.tiny') or shutil.which('nvim') or shutil.which('vim')
            terminal = shutil.which('x-terminal-emulator')
            if vim and terminal:
                value = shlex.join([terminal, '-e', vim, '-n', '+{line}', '-c', 'normal! {column}|', '{file}'])
        command, okay = QInputDialog.getText(self, 'Trusted user-local tool settings', help_text, QLineEdit.EchoMode.Normal, value)
        if okay:
            self.controller.settings_store.configure(name, command)

    def open_in_editor(self):
        pane = self.active_pane()
        pane.capture_position()
        identifier = self.controller.buffer().state.id
        if not self.guard_buffer(identifier):
            return
        process = self.controller.open_in_editor(identifier)
        self.children.append((process, identifier))

    def open_in_jupyter(self):
        process = self.controller.open_in_jupyter()
        self.children.append((process, self.controller.buffer().state.id))

    def reap_editors(self):
        remaining = []
        for process, identifier in self.children:
            if process.poll() is None:
                remaining.append((process, identifier))
            elif identifier in self.controller.buffers:
                if process.returncode:
                    self.show_error(f'External tool exited with code {process.returncode}. Check its window or tool configuration.')
                changed = self.controller.check_external(identifier)
                if changed != 'unchanged':
                    self.controller.activate(identifier)
                    self.render()
                    box = QMessageBox(self)
                    box.setWindowTitle('External editor finished')
                    box.setText('The disk revision changed. Your in-memory text has been retained.')
                    compare = box.addButton('Compare', QMessageBox.ButtonRole.ActionRole)
                    refresh = box.addButton('Refresh from disk', QMessageBox.ButtonRole.ActionRole)
                    box.addButton('Keep buffer', QMessageBox.ButtonRole.RejectRole)
                    box.exec()
                    if box.clickedButton() is compare:
                        self.compare_disk()
                    elif box.clickedButton() is refresh:
                        self.perform(self.refresh_from_disk)
        self.children = remaining
        self.update_actions()

    def observe_disk(self):
        if not self.controller.workspace or self.jobs:
            return
        requests = [self.controller.external_request(i) for i in self.controller.current().visible if i]
        report = self.pdf.report
        def observe():
            observations = [Workstation.external_snapshot(request) for request in requests]
            from .latex_build import stale_inputs
            return observations, stale_inputs(report) if report else []
        def accepted(result):
            observations, stale = result
            for observation in observations:
                self.controller.accept_external(observation)
            self.update_actions()
            if self.pdf.report is report:
                if report and report['tex_root'] != self.controller.current().tex_root:
                    stale.append('A different TeX root is selected')
                self.pdf.set_stale(stale)
                self.mark_pdf_dirty()
        # Disk observation must not repeatedly disable editing, saving, PDF
        # controls or comparison while an ordinary project is being used.
        self.submit(observe, accepted, background=True)

    def mark_pdf_dirty(self):
        if self.pdf.report and any(b.dirty and any(i['path'] == b.state.path for i in self.pdf.report['inputs']) for b in self.controller.buffers.values()):
            self.pdf.set_stale(['Unsaved input changes'])

    def build_latex(self):
        request = self.controller.build_request()
        from .latex_build import run_latex
        self.build_summary.setText('Explicit LaTeX build running…')
        self.diagnostics.clear()
        self.diagnostics_dock.show()
        def accepted(report):
            self.controller.accept_build(report)
            self.show_build_result(report)
            if report['success']:
                self.reload_pdf(source='generated')
            elif self.pdf.report:
                from .latex_build import stale_inputs
                self.submit(lambda: stale_inputs(self.pdf.report), self.pdf.set_stale)
        self.submit(lambda: run_latex(**request), accepted)

    def show_build_result(self, report):
        if not report:
            return
        result = 'Typesetting succeeded' if report['success'] else 'Typesetting failed — last successful PDF retained'
        self.build_summary.setText(f'{result} · exit {report["exit_code"]}\nBuild output is separate from mathematical Verification. File/line interpretation is bounded. Bounded captured logs and build details are available in LaTeX → Inspect build provenance and logs.')
        self.diagnostics.clear()
        for item in report['diagnostics']:
            prefix = f'{Path(item["path"]).name}:{item["line"]}: ' if item['path'] else ''
            row = QListWidgetItem(prefix + item['message'])
            row.setData(Qt.ItemDataRole.UserRole, item)
            self.diagnostics.addItem(row)
        if not report['diagnostics']:
            row = QListWidgetItem(report['problem'] or ('No parsed file/line diagnostic.' if not report['success'] else 'PDF produced by the recorded tool invocation.'))
            self.diagnostics.addItem(row)
        self.diagnostics_dock.show()
        self.resizeDocks([self.diagnostics_dock], [160], Qt.Orientation.Vertical)
        self.update_actions()

    def activate_diagnostic(self, row):
        item = row.data(Qt.ItemDataRole.UserRole)
        if item and item['path']:
            path = Path(item['path'])
            if not path.resolve().is_relative_to(Path(self.controller.current().root)):
                self.show_error('Diagnostic file is outside the project')
                return
            self.perform(lambda: self.open_file(path, line=item['line']))

    def reload_pdf(self, *, source=None):
        state = self.controller.current()
        source = source or state.pdf_source
        first = self.pdf.kind is None
        def accepted(snapshot):
            if source == 'imported':
                self.pdf.show_imported_snapshot(snapshot)
            else:
                self.pdf.show_snapshot(snapshot)
            self.pdf.show()
            if first:
                self.center.setSizes([650, 550])
            self.update_actions()
        def failed(error):
            self.pdf.set_failure(error)
            if self.controller.workspace and self.controller.current().pdf_visible:
                self.pdf.show()
                if first:
                    self.center.setSizes([650, 550])
        task = self.controller.imported_pdf_snapshot if source == 'imported' else self.controller.pdf_snapshot
        self.submit(task, accepted, failed)

    def set_facets(self, sections):
        container = QWidget()
        layout = QVBoxLayout(container)
        for heading, content in sections:
            button = QToolButton()
            button.setText(heading)
            button.setToolButtonStyle(Qt.ToolButtonStyle.ToolButtonTextBesideIcon)
            button.setArrowType(Qt.ArrowType.RightArrow)
            button.setCheckable(True)
            details = QPlainTextEdit()
            details.setReadOnly(True)
            details.setPlainText(content)
            details.setMinimumHeight(180)
            details.hide()
            def toggle(checked, details=details, button=button):
                details.setVisible(checked)
                button.setArrowType(Qt.ArrowType.DownArrow if checked else Qt.ArrowType.RightArrow)
            button.toggled.connect(toggle)
            layout.addWidget(button)
            layout.addWidget(details)
        layout.addStretch()
        self.facets.setWidget(container)

    def update_context(self):
        state = self.controller.workspace
        buffer = self.controller.buffer() if state and state.active else None
        self.set_facets(buffer.sections if buffer else ())
        if buffer and buffer.state.format in ('text', 'notebook'):
            self.context_dock.hide()

    def show_build_details(self):
        def read_details():
            from .latex_build import build_log
            report = self.controller.build_report()
            return report, build_log(self.controller.build_storage, report)
        def accepted(result):
            report, log = result
            provenance = {key: value for key, value in report.items() if key not in ('stdout', 'stderr', 'diagnostics')}
            self.set_facets((('Build provenance · technical details', json.dumps(provenance, ensure_ascii=True, indent=2)),
                             ('Standard output', report['stdout']), ('Standard error', report['stderr']), ('TeX log', log)))
            self.context_dock.show()
        self.submit(read_details, accepted)


def launch(directory: Path | None = None) -> int:
    if sys.platform.startswith('linux') and not (os.environ.get('DISPLAY') or os.environ.get('WAYLAND_DISPLAY') or os.environ.get('QT_QPA_PLATFORM') in ('offscreen', 'minimal')):
        raise WorkspaceError('A graphical desktop is required; use WSLg, a native desktop, or an available X display')
    app = QApplication.instance() or QApplication(sys.argv[:1])
    app.setApplicationName(TITLE)
    window = WorkstationWindow()
    window.show()
    if directory is not None:
        window.perform(lambda: window.open_project(directory))
    return app.exec()
