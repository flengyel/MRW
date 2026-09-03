"""Private exact-byte, atomic no-overwrite persistence for local records."""

from __future__ import annotations

import os
from pathlib import Path
import stat
import tempfile
from typing import Type


class PrivatePersistenceError(ValueError):
    """Raised when a private record cannot be published safely."""


def persist_private_new(
    destination: Path,
    raw: bytes,
    *,
    error_type: Type[ValueError] = PrivatePersistenceError,
) -> None:
    """Persist exact bytes as mode 0600; a successful hard link commits publication."""

    destination = Path(destination)
    try:
        metadata = destination.lstat()
    except FileNotFoundError:
        pass
    else:
        kind = "symlink" if stat.S_ISLNK(metadata.st_mode) else "path"
        raise error_type(f"output already exists (File exists; {kind}): {destination}")
    parent = destination.parent
    if not parent.is_dir():
        raise error_type(f"output parent directory does not exist: {parent}")

    descriptor, name = tempfile.mkstemp(
        prefix=f".{destination.name}.", suffix=".tmp", dir=parent
    )
    temporary = Path(name)
    try:
        os.fchmod(descriptor, 0o600)
        with os.fdopen(descriptor, "wb") as stream:
            descriptor = -1
            stream.write(raw)
            stream.flush()
            os.fsync(stream.fileno())
        try:
            os.link(temporary, destination)
        except FileExistsError as exc:
            raise error_type(f"output already exists (File exists): {destination}") from exc

        try:
            directory_descriptor = os.open(parent, os.O_RDONLY)
            try:
                os.fsync(directory_descriptor)
            finally:
                os.close(directory_descriptor)
        except OSError as exc:
            raise error_type(
                "record was published, but directory durability sync failed; "
                "the complete destination was retained"
            ) from exc
    finally:
        if descriptor >= 0:
            os.close(descriptor)
        try:
            temporary.unlink()
        except FileNotFoundError:
            pass
