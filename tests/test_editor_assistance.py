"""Preview/Send bridge checks use only deterministic injected transports."""
from copy import deepcopy
from hashlib import sha256
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from theorem_terminal.editor_bridge import dispatch
from theorem_terminal.editor_assistance import assistance_action
from theorem_terminal.openai_response import TransportResult
from theorem_terminal.model_projection import parse_terminal_model_call


class EditorAssistanceTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        c = dict(buffer_id='untitled:1', source_identity='untitled:1', source_path=None,
                 source_revision=sha256('α😀\r\n'.encode()).hexdigest(), saved_revision=None,
                 start='1.0', end='2.0', text='α😀\r\n', state='captured unsaved editor text')
        self.draft = dict(project_root=str(self.root), target=c, contexts=[c],
                          question='Explain α.', model='fake-model',
                          output=str(self.root / 'call.json'), exchange_id='editor-test')
        self.calls = []

    def preview(self):
        return dispatch(dict(protocol=1, method='prepare_assistance', draft=self.draft))['preview']

    def send(self, response=None):
        request = dict(method='send_assistance', draft=self.draft, preview=self.preview(), confirmation='SEND')
        if response is None:
            response = {'object':'response', 'id':'resp-local', 'status':'completed', 'model':'fake-resolved',
                        'output':[{'type':'message', 'role':'assistant', 'status':'completed',
                                   'content':[{'type':'output_text', 'text':'First α.\n\nSecond 😀.', 'annotations':[]}]}]}
        def transport(method, endpoint, body, headers, timeout, limit):
            self.calls.append(body)
            if isinstance(response, Exception):
                raise response
            return TransportResult(200, json.dumps(response).encode())
        with patch.dict(os.environ, {'OPENAI_API_KEY':'synthetic-key'}):
            return assistance_action(request, transport=transport)

    def test_preview_is_read_only_and_preserves_exact_unicode(self):
        preview = self.preview()
        self.assertIn('α😀\r\n', preview)
        self.assertIn('store', preview)
        self.assertFalse(Path(self.draft['output']).exists())
        self.assertEqual(list(self.root.iterdir()), [])

    def test_send_matches_preview_and_retains_single_completed_record(self):
        result = self.send()
        self.assertEqual(result['status'], 'completed')
        self.assertEqual(len(self.calls), 1)
        body = json.loads(self.calls[0])
        self.assertFalse(body['store'])
        self.assertIn('α😀\r\n', body['input'][0]['content'][1]['text'])
        raw = Path(result['path']).read_bytes()
        self.assertNotIn(b'synthetic-key', raw)
        terminal = parse_terminal_model_call(raw)
        self.assertEqual(terminal.document['raw_response'], 'First α.\n\nSecond 😀.')
        with self.assertRaises(ValueError):
            self.send()
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(Path(result['path']).read_bytes(), raw)

    def test_modified_preview_or_draft_and_missing_confirmation_never_transmit(self):
        request = dict(method='send_assistance', draft=deepcopy(self.draft), preview=self.preview(), confirmation='SEND')
        def forbidden(*args):
            self.fail('transport must not run')
        with patch.dict(os.environ, {'OPENAI_API_KEY':'synthetic-key'}):
            request['draft']['question'] = 'Changed question'
            with self.assertRaisesRegex(ValueError, 'changed after preview'):
                assistance_action(request, transport=forbidden)
            request['draft'] = self.draft
            request['confirmation'] = 'send'
            with self.assertRaisesRegex(ValueError, 'separate Send'):
                assistance_action(request, transport=forbidden)
        self.assertFalse(Path(self.draft['output']).exists())

    def test_context_removal_excludes_text_but_keeps_task_identity(self):
        self.draft['contexts'] = []
        self.send()
        self.assertNotIn('α😀', self.calls[0].decode())
        terminal = parse_terminal_model_call(Path(self.draft['output']).read_bytes())
        self.assertEqual(terminal.document['context_refs'], ())
        self.assertEqual(terminal.document['target']['id'], 'untitled:1')

    def test_all_terminal_statuses_remain_distinct(self):
        cases = [('failed', OSError('synthetic network failure')),
                 ('refused', {'object':'response', 'id':'r', 'status':'completed', 'output':[{'type':'message','role':'assistant','status':'completed', 'content':[{'type':'refusal','refusal':'No'}]}]}),
                 ('incomplete', {'object':'response','id':'r','status':'incomplete','output':[]})]
        for status, response in cases:
            with self.subTest(status=status):
                self.draft['output'] = str(self.root / f'{status}.json')
                result = self.send(response)
                self.assertEqual(result['status'], status)
                self.assertTrue(result['retained'])

    def test_missing_key_invalid_context_and_unknown_fields_are_rejected(self):
        request = dict(protocol=1, method='send_assistance', draft=self.draft, preview=self.preview(), confirmation='SEND')
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(ValueError, 'OPENAI_API_KEY'):
                dispatch(request)
        request['api_key'] = 'must-not-be-accepted'
        with self.assertRaisesRegex(ValueError, 'fields'):
            dispatch(request)
        self.draft['target']['source_revision'] = 'invalid'
        with self.assertRaisesRegex(ValueError, 'revision'):
            self.preview()

    def test_post_publication_error_recovers_matching_record_and_redacts_key(self):
        from theorem_terminal import assistance_actions
        original = assistance_actions.request_assistance
        def fail_after(*args, **kwargs):
            original(*args, **kwargs)
            raise OSError('sync failure synthetic-key')
        with patch.object(assistance_actions, 'request_assistance', fail_after):
            result = self.send()
        self.assertEqual(result['status'], 'completed')
        self.assertTrue(result['retained'])
        self.assertNotIn('synthetic-key', json.dumps(result))
        self.assertIn('sync failure', result['body'])
