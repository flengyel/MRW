"""Editor integration uses the existing record boundary; no provider or Lean."""
from hashlib import sha256
import json
from pathlib import Path
import stat
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

from theorem_terminal.documentary_warrant import parse_documentary_projection
from theorem_terminal.editor_bridge import dispatch
from theorem_terminal.record_actions import call_passage, attributed_contribution
from theorem_terminal.workstation import Workstation

FIXTURE = Path(__file__).parent / 'fixtures' / 'mechanical_model_call.json'


class EditorBridgeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.path = self.root / 'call.json'
        self.path.write_bytes(FIXTURE.read_bytes())
        self.revision = sha256(self.path.read_bytes()).hexdigest()

    def request(self, method='review', **kwargs):
        request = dict(protocol=1, method=method, path=str(self.path))
        request.update(kwargs)
        return dispatch(request)

    def test_review_and_inspection_are_read_only_without_network_or_subprocess(self):
        before = self.path.read_bytes()
        with patch('socket.socket', side_effect=AssertionError('network')), patch('subprocess.Popen', side_effect=AssertionError('process')):
            result = self.request(mode='passage', number=1)
            inspected = self.request('inspect', format='model_call')
        self.assertEqual(result['revision'], self.revision)
        self.assertIn('α → β', result['body'])
        self.assertIn('Provenance', str(inspected['sections']))
        self.assertEqual(self.path.read_bytes(), before)
        self.assertEqual(list(self.root.iterdir()), [self.path])

    def test_projection_exact_bytes_private_no_overwrite(self):
        destination = self.root / 'projection.json'
        self.request('project', number=1, revision=self.revision, destination=str(destination))
        raw = destination.read_bytes()
        projection = parse_documentary_projection(raw)
        self.assertEqual(projection.representation.content, 'Fixture only — α → β.\n')
        self.assertEqual(stat.S_IMODE(destination.stat().st_mode), 0o600)
        with self.assertRaises(ValueError):
            self.request('project', number=1, revision=self.revision, destination=str(destination))
        self.assertEqual(destination.read_bytes(), raw)

    def test_changed_record_rejected_for_review_copy_and_projection(self):
        self.path.write_bytes(self.path.read_bytes() + b' ')
        for method, kwargs in [('review', {'mode': 'passage'}), ('contribution', {}), ('project', {'destination': str(self.root / 'new.json')})]:
            with self.subTest(method=method), self.assertRaisesRegex(ValueError, 'changed'):
                self.request(method, number=1, revision=self.revision, **kwargs)
        self.assertFalse((self.root / 'new.json').exists())

    def test_digest_tampering_and_unfinalized_response_rejected(self):
        document = json.loads(self.path.read_bytes())
        for key, value in [('raw_response', 'different'), ('finalized_at', None), ('status', 'failed')]:
            changed = dict(document, **{key: value})
            self.path.write_text(json.dumps(changed))
            with self.subTest(key=key), self.assertRaises(ValueError):
                self.request(mode='index', number=1)

    def test_qt_and_extension_share_the_same_contribution(self):
        result = self.request('contribution', number=1, revision=self.revision)
        self.assertEqual(result['body'], Workstation.attributed_assistance_contribution(self.path, 1))
        _, call, selected, exact = call_passage(self.path, 1)
        self.assertEqual(result['body'], attributed_contribution(call, selected, exact))
        self.assertIn('unverified editable copy', result['body'])
        self.assertIn(call.raw_response_digest, result['body'])

    def test_protocol_rejects_ambiguous_unbounded_or_unknown_inputs(self):
        valid = dict(protocol=1, method='review', path=str(self.path), mode='index', number=1)
        invalid = [dict(valid, protocol=True), dict(valid, method='send'), dict(valid, number=True),
                   dict(valid, number=-1), dict(valid, path='relative.json'),
                   dict(valid, number=1.5), dict(valid, mode='execute'), dict(valid, extra='hidden'),
                   dict(valid, revision='not-a-digest')]
        for request in invalid:
            with self.subTest(request=request), self.assertRaises(ValueError):
                dispatch(request)

    def test_symlink_call_rejected(self):
        link = self.root / 'link.json'
        link.symlink_to(self.path)
        with self.assertRaises(ValueError):
            self.request(path=str(link), mode='index', number=1)

    def test_cli_structured_failure_and_duplicate_keys(self):
        for raw in [b'{"protocol":1,"protocol":1}', b'x' * (64 * 1024 + 1)]:
            result = subprocess.run([sys.executable, '-m', 'theorem_terminal.editor_bridge'], input=raw, capture_output=True)
            reply = json.loads(result.stdout)
            self.assertEqual(result.returncode, 1)
            self.assertFalse(reply['ok'])
            self.assertEqual(result.stderr, b'')

    def test_utf8_crlf_and_repeated_passages_keep_byte_spans(self):
        document = json.loads(self.path.read_bytes())
        text = '𝒳 → α\r\n\r\n𝒳 → α\n'
        document.update(raw_response=text, raw_response_digest=sha256(text.encode()).hexdigest())
        self.path.write_text(json.dumps(document))
        revision = sha256(self.path.read_bytes()).hexdigest()
        destination = self.root / 'second.json'
        self.request('project', number=2, revision=revision, destination=str(destination))
        projection = parse_documentary_projection(destination.read_bytes())
        self.assertEqual(projection.representation.content, '𝒳 → α\n')
        self.assertEqual(projection.representation.span.start_byte, len('𝒳 → α\r\n\r\n'.encode()))


if __name__ == '__main__':
    unittest.main()
