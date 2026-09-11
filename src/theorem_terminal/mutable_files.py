"""Atomic mutable files, independent of immutable mathematical publication.

Locks live in user-local state, not beside source files. OS advisory locks are
released on process death; the lock file's continued existence is harmless.
This coordinates workstation writers, not arbitrary external editors. Revision
checks also detect external edits up to the final atomic replacement.
"""

from contextlib import contextmanager
from hashlib import sha256
import errno
import os
from pathlib import Path
import stat
import tempfile

from .local_files import read_bounded


class MutableFileError(ValueError):
    pass


def private_directory(path: Path):
    path.mkdir(mode=0o700, parents=True, exist_ok=True)
    if path.is_symlink() or not path.is_dir():
        raise MutableFileError("Application storage must be a regular directory")


@contextmanager
def file_lock(path: Path, lock_root: Path, *, wait=False):
    private_directory(lock_root)
    identity = sha256(os.path.normcase(str(path.resolve())).encode('utf-8')).hexdigest()
    lock = lock_root / (identity + '.lock')
    if lock.is_symlink():
        raise MutableFileError("Invalid application lock file")
    descriptor = os.open(lock, os.O_RDWR | os.O_CREAT, 0o600)
    try:
        if os.name == 'nt':
            import msvcrt
            if os.fstat(descriptor).st_size == 0:
                os.write(descriptor, b'\0')
            os.lseek(descriptor, 0, os.SEEK_SET)
            msvcrt.locking(descriptor, msvcrt.LK_LOCK if wait else msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(descriptor, fcntl.LOCK_EX | (0 if wait else fcntl.LOCK_NB))
    except OSError as exc:
        os.close(descriptor)
        raise MutableFileError("Another process is saving this file; retry when it finishes") from exc
    try:
        yield
    finally:
        # Closing releases the kernel lock, including on Windows. Do not unlink
        # the lock pathname: another writer may already hold its descriptor.
        os.close(descriptor)


def sync_directory(path: Path):
    if os.name == 'nt':
        return  # Windows has no portable stdlib directory-fsync operation.
    descriptor = os.open(path, os.O_RDONLY | getattr(os, 'O_DIRECTORY', 0))
    try:
        try:
            os.fsync(descriptor)
        except OSError as exc:
            if exc.errno not in (errno.EINVAL, errno.ENOTSUP, errno.EBADF):
                raise
    finally:
        os.close(descriptor)


def save_mutable(path: Path, raw: bytes, *, previous: bytes | None,
                 lock_root: Path, mode: int = 0o600):
    """Replace a complete file if its bytes still match; None means create only.

    The temporary file shares the destination filesystem. File data is synced
    before replacement. A post-replacement durability failure is reported while
    retaining the complete destination. No immutable record calls this service.
    """
    path = path.absolute()
    with file_lock(path, lock_root):
        _replace_locked(path, raw, previous, mode)


def update_mutable(path, transform, *, limit, lock_root, mode=0o600):
    """Read/merge/replace bounded mutable state under the same kernel lock."""
    with file_lock(path, lock_root, wait=True):
        previous = read_bounded(path, limit, "mutable settings") if path.exists() else None
        raw = transform(previous)
        if len(raw) > limit:
            raise MutableFileError("Mutable settings exceed their size limit")
        if raw != previous:
            _replace_locked(path, raw, previous, mode)
        return raw


def _replace_locked(path, raw, previous, mode):
    def check():
        if path.is_symlink():
            raise MutableFileError("Refusing to replace a symlink")
        if previous is None:
            if path.exists():
                raise FileExistsError("Destination already exists; choose a new file")
        else:
            try:
                observed = read_bounded(path, len(previous), 'save destination')
            except (OSError, ValueError) as exc:
                raise MutableFileError("File changed on disk; refresh or compare before saving") from exc
            if observed != previous:
                raise MutableFileError("File changed on disk; refresh or compare before saving")
    check()
    descriptor, name = tempfile.mkstemp(prefix='.' + path.name + '.', suffix='.tmp', dir=path.parent)
    temporary = Path(name)
    try:
        with os.fdopen(descriptor, 'wb') as stream:
            stream.write(raw)
            stream.flush()
            if hasattr(os, 'fchmod'):
                os.fchmod(stream.fileno(), stat.S_IMODE(mode))
            os.fsync(stream.fileno())
        check()
        os.replace(temporary, path)
        sync_directory(path.parent)
    finally:
        temporary.unlink(missing_ok=True)
