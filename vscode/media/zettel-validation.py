"""Run the explicitly chosen Zettel validator on one note, never on a vault.

The validator and its index conventions remain in flengyel/Zettel. No template,
filename rule or note mutation is implemented here.
"""
import importlib.util
import json
from pathlib import Path
import sys

spec = importlib.util.spec_from_file_location('mrw_selected_zettel_validator', sys.argv[1])
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
validator = module.ZettelValidator()
note = Path(sys.argv[2])
content = note.read_text(encoding='utf-8')
valid = validator.validate(content, fn=str(note), report=False)
issues = [str(issue) for issue in validator.issues]
section = None
parts = validator._split_front_matter(content)
if parts:
    raw, lines, start = parts
    front = validator._load_front_matter(raw)
    headings = validator._headings(validator._visible_body_lines(lines, start))
    section = 'Research' if any(h.level == 2 and h.text == 'Research' for h in headings) else (front or {}).get('reference-section-title')
    title = next((h.text for h in headings if h.level == 1), '')
    suggestions = [f'[[{key}]] {module.INDEX_NOTE_TITLES[key]}' for key in sorted(validator._expected_index_ids(title))]
else:
    suggestions = []
print(json.dumps(dict(valid=valid, issues=issues, index_suggestions=suggestions, section=section), ensure_ascii=False))
sys.exit(0 if valid else 1)
