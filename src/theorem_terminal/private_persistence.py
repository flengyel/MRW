"""Private exact-byte, atomic no-overwrite persistence for local records."""

from __future__ import annotations

import os
from pathlib import Path
import stat
import tempfile
from typing import Type


class PrivatePersistenceError(ValueError):
    """Raised when a private record cannot be published safely."""


def _identity(metadata: os.stat_result) -> tuple[int, int]:
    return metadata.st_dev, metadata.st_ino


def _parent_matches(path: Path, descriptor: int, expected: tuple[int, int]) -> bool:
    try:
        current = path.stat()
        opened = os.fstat(descriptor)
    except OSError:
        return False
    return _identity(current) == expected == _identity(opened)


def _add_cleanup_note(primary: BaseException, message: str) -> None:
    if hasattr(primary, "add_note"):
        primary.add_note(message)


def persist_private_new(
    destination: Path,
    raw: bytes,
    *,
    error_type: Type[ValueError] = PrivatePersistenceError,
) -> None:
    """Publish exact bytes privately within one stable local directory.

    Descriptor-relative operations and inode checks defend against accidental
    or concurrent pathname replacement. They are not a security boundary
    against an attacker controlling the same Unix account.
    """

    destination = Path(destination)
    parent = destination.parent
    parent_fd = -1
    temporary_fd = -1
    temporary_name: str | None = None
    primary: BaseException | None = None
    published = False
    try:
        parent_fd = os.open(parent, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
        parent_identity = _identity(os.fstat(parent_fd))
        if not _parent_matches(parent, parent_fd, parent_identity):
            raise error_type("output parent directory identity changed")
        try:
            existing = os.stat(
                destination.name, dir_fd=parent_fd, follow_symlinks=False
            )
        except FileNotFoundError:
            pass
        else:
            kind = "symlink" if stat.S_ISLNK(existing.st_mode) else "path"
            raise error_type(
                f"output already exists (File exists; {kind}): {destination}"
            )

        prefix = f".{destination.name}."
        while True:
            candidate = next(tempfile._get_candidate_names())
            temporary_name = f"{prefix}{candidate}.tmp"
            flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
            if hasattr(os, "O_NOFOLLOW"):
                flags |= os.O_NOFOLLOW
            try:
                temporary_fd = os.open(
                    temporary_name, flags, 0o600, dir_fd=parent_fd
                )
                break
            except FileExistsError:
                continue
        os.fchmod(temporary_fd, 0o600)
        view = memoryview(raw)
        while view:
            written = os.write(temporary_fd, view)
            if written <= 0:
                raise OSError("temporary record write made no progress")
            view = view[written:]
        os.fsync(temporary_fd)
        temporary_identity = _identity(os.fstat(temporary_fd))

        if not _parent_matches(parent, parent_fd, parent_identity):
            raise error_type("output parent directory identity changed")
        source = os.stat(
            temporary_name, dir_fd=parent_fd, follow_symlinks=False
        )
        if (
            _identity(source) != temporary_identity
            or not stat.S_ISREG(source.st_mode)
            or stat.S_IMODE(source.st_mode) != 0o600
        ):
            raise error_type("temporary record identity or mode changed")
        try:
            os.link(
                temporary_name,
                destination.name,
                src_dir_fd=parent_fd,
                dst_dir_fd=parent_fd,
                follow_symlinks=False,
            )
        except FileExistsError as exc:
            raise error_type(
                f"output already exists (File exists): {destination}"
            ) from exc
        published = True
        installed = os.stat(
            destination.name, dir_fd=parent_fd, follow_symlinks=False
        )
        if _identity(installed) != temporary_identity:
            raise error_type("published record identity changed unexpectedly")
        try:
            os.fsync(parent_fd)
        except OSError as exc:
            raise error_type(
                "record was published, but directory durability sync failed; "
                "the complete destination was retained"
            ) from exc
    except BaseException as exc:
        primary = exc
        raise
    finally:
        cleanup_failures: list[str] = []
        if temporary_fd >= 0:
            for attempt in range(2):
                try:
                    os.close(temporary_fd)
                    break
                except OSError as exc:
                    if attempt:
                        cleanup_failures.append(
                            f"temporary descriptor close failed: {exc}"
                        )
        if temporary_name is not None and parent_fd >= 0:
            for attempt in range(2):
                try:
                    os.unlink(temporary_name, dir_fd=parent_fd)
                    break
                except FileNotFoundError:
                    break
                except OSError as exc:
                    if attempt:
                        cleanup_failures.append(f"temporary cleanup failed: {exc}")
        if parent_fd >= 0:
            try:
                os.close(parent_fd)
            except OSError as exc:
                cleanup_failures.append(f"directory descriptor close failed: {exc}")
        if cleanup_failures:
            detail = "; ".join(cleanup_failures)
            if primary is not None:
                _add_cleanup_note(primary, detail)
            else:
                state = "published destination retained" if published else "not published"
                raise error_type(f"persistence cleanup failed ({state}): {detail}")
