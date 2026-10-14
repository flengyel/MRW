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
        self.assertEqual(result['revision'], sha256(raw).hexdigest())
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
            result = assistance_action(request, transport=forbidden)
            self.assertEqual(result['status'], 'not_sent')
            self.assertIn('changed after preview', result['body'])
            self.assertFalse(result['retained'])
            self.assertIsNone(result['revision'])
            request['draft'] = self.draft
            request['confirmation'] = 'send'
            result = assistance_action(request, transport=forbidden)
            self.assertEqual(result['status'], 'not_sent')
            self.assertIn('separate Send', result['body'])
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
                self.assertEqual(result['revision'], sha256(Path(result['path']).read_bytes()).hexdigest())

    def test_missing_key_invalid_context_and_unknown_fields_are_rejected(self):
        request = dict(protocol=1, method='send_assistance', draft=self.draft, preview=self.preview(), confirmation='SEND')
        with patch.dict(os.environ, {}, clear=True):
            result = dispatch(request)
            self.assertEqual(result['status'], 'not_sent')
            self.assertIn('OPENAI_API_KEY', result['body'])
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
        self.assertEqual(result['revision'], sha256(Path(result['path']).read_bytes()).hexdigest())

    def test_preflight_preparation_failure_and_unsupported_host_do_not_transmit(self):
        request = dict(method='send_assistance', draft=self.draft,
                       preview=self.preview(), confirmation='SEND')
        def forbidden(*args):
            self.fail('transport must not run')
        with patch.dict(os.environ, {'OPENAI_API_KEY': 'synthetic-key'}):
            with patch('theorem_terminal.editor_assistance.POSIX_PUBLICATION_SUPPORTED', False):
                result = assistance_action(request, transport=forbidden)
            self.assertEqual(result['status'], 'not_sent')
            self.assertIn('Remote WSL', result['body'])
            self.assertFalse(result['retained'])
            self.assertIsNone(result['revision'])
            self.assertFalse(Path(self.draft['output']).exists())
            Path(self.draft['output']).write_bytes(b'existing unrelated bytes')
            result = assistance_action(request, transport=forbidden)
            self.assertEqual(result['status'], 'not_sent')
            self.assertIn('already exists', result['body'])
            self.assertEqual(Path(self.draft['output']).read_bytes(), b'existing unrelated bytes')

    def test_unretained_transport_outcome_is_never_reported_as_not_sent(self):
        from theorem_terminal import assistance_actions
        original = assistance_actions.request_assistance
        def failed_publication(*args):
            raise OSError('synthetic disk failure')
        def send_without_publication(*args, **kwargs):
            return original(*args, **kwargs, installer=failed_publication)
        with patch.object(assistance_actions, 'request_assistance', send_without_publication):
            result = self.send()
        self.assertEqual(len(self.calls), 1)
        self.assertEqual(result['status'], 'unretained')
        self.assertFalse(result['retained'])
        self.assertIsNone(result['revision'])
        self.assertIn('Do not assume the request was unsent', result['body'])

    def test_sent_record_revision_rejects_replacement_before_review(self):
        result = self.send()
        path = Path(result['path'])
        record = json.loads(path.read_bytes())
        record['raw_response'] = 'Unrelated replacement response'
        record['raw_response_digest'] = sha256(record['raw_response'].encode()).hexdigest()
        path.write_text(json.dumps(record))
        with self.assertRaisesRegex(ValueError, 'changed'):
            dispatch(dict(protocol=1, method='review', path=str(path), mode='index',
                          number=1, revision=result['revision']))
