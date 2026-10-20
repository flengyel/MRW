"""Bounded local reads shared by the CLI and workstation."""

from pathlib import Path
import stat


def read_bounded(path: Path, limit: int, description: str) -> bytes:
    from .artifact_context import read_location
    path = read_location(path)
    metadata = path.lstat()
    if stat.S_ISLNK(metadata.st_mode) or not stat.S_ISREG(metadata.st_mode):
        raise ValueError(f"{description} must be a regular non-symlink file")
    if metadata.st_size > limit:
        raise ValueError(f"{description} exceeds the {limit}-byte limit")
    with path.open("rb") as stream:
        raw = stream.read(limit + 1)
    if len(raw) > limit:
        raise ValueError(f"{description} exceeds the {limit}-byte limit")
    return raw
