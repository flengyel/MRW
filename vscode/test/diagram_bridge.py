"""Deterministic renderer only; exercise actual bundled validation/publication."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'python'))
from mrw import reader_diagrams
from mrw.editor_bridge import main

svg = reader_diagrams.checked_svg(b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M0 0L20 20"/></svg>')
reader_diagrams.compile_tikz = lambda code: (svg, dict(pdflatex='1' * 64, pdftocairo='2' * 64))
raise SystemExit(main())
