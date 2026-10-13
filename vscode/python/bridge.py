"""Load only the extension-bundled core, under Python isolated mode (-I)."""
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from theorem_terminal.editor_bridge import main

raise SystemExit(main())
