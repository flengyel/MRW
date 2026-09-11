from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path


class SourceError(ValueError):
    """Raised when a mathematical source cannot be read as requested."""


@dataclass(frozen=True)
class SourceDocument:
    path: Path
    text: str
    revision: str
    normalized_revision: str

    @classmethod
    def read(cls, path: str | Path) -> "SourceDocument":
        source_path = Path(path).expanduser()
        if not source_path.exists():
            raise SourceError(f"source does not exist: {source_path}")
        if not source_path.is_file():
            raise SourceError(f"source is not a file: {source_path}")

        try:
            raw = source_path.read_bytes()
        except OSError as exc:
            raise SourceError(f"cannot read source {source_path}: {exc}") from exc

        return cls.from_bytes(source_path, raw)

    @classmethod
    def from_bytes(cls, path: str | Path, raw: bytes) -> "SourceDocument":
        """Identify one captured read, also usable after a bounded record read."""
        source_path = Path(path).expanduser()
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise SourceError(f"source is not UTF-8: {source_path}") from exc

        return cls(
            path=source_path.resolve(),
            text=text,
            revision=sha256(raw).hexdigest(),
            normalized_revision=sha256(
                text.replace("\r\n", "\n").replace("\r", "\n").encode("utf-8")
            ).hexdigest(),
        )
